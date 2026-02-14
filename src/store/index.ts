import { create } from 'zustand';

import { generateMiniName } from '@/lib/nameGenerator';
import {
  CollectionId,
  type Collection as DBCollection,
  MiniId,
  type MiniRecord,
  blobToDataUrl,
  dataUrlToBlob,
  deleteImage as dbDeleteImage,
  deleteMini as dbDeleteMini,
  saveImage as dbSaveImage,
  saveMini as dbSaveMini,
  deleteCollection,
  generateId,
  generateThumbnail,
  getCollection,
  getMini,
  getMinisByCollection,
  listCollections,
  listMinis,
  loadImagesByMini,
  saveCollection,
} from '@/services/db';

import type { AppState, Collection, GeminiModel, GeneratedImage, MiniatureMeta, TabId, TabState } from './types';

const API_KEY_STORAGE_KEY = 'umc_api_key';

const createEmptyTabState = (): TabState => ({
  images: [],
  selectedImageId: null,
  isGenerating: false,
});

const loadApiKey = (): string | null => {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch {
    return null;
  }
};

const miniRecordToMeta = (r: MiniRecord): MiniatureMeta => ({
  id: r.id,
  collectionId: r.collectionId,
  name: r.name,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  frontalThumbDataUrl: r.frontalThumbDataUrl,
});

const dbCollectionToCollection = (c: DBCollection): Collection => ({
  id: c.id,
  name: c.name,
  description: c.description,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

const persistMiniToDB = async (state: AppState): Promise<void> => {
  if (!state.currentMiniId) return;

  const frontalSelected = state.frontal.selectedImageId;
  const firstFrontalImage =
    state.frontal.images.length > 0
      ? (state.frontal.images.find((img) => img.id === frontalSelected) ?? state.frontal.images[0])
      : null;

  let thumbDataUrl: string | null = null;
  if (firstFrontalImage) {
    try {
      thumbDataUrl = await generateThumbnail(firstFrontalImage.dataUrl);
    } catch {
      // thumbnail generation failed, leave null
    }
  }

  // Check if mini already exists to preserve user-set name
  const existing = await getMini(state.currentMiniId);

  const record: MiniRecord = {
    id: state.currentMiniId,
    collectionId: state.currentCollectionId ?? existing?.collectionId ?? generateId<CollectionId>(),
    name: existing?.name ?? generateMiniName(),
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    frontalThumbDataUrl: thumbDataUrl,
    selectedImages: {
      frontal: state.frontal.selectedImageId,
      back: state.back.selectedImageId,
      base: state.base.selectedImageId,
    },
    geminiModel: state.geminiModel,
  };

  await dbSaveMini(record);
};

export const useAppStore = create<AppState>((set, get) => ({
  apiKey: loadApiKey(),
  activeTab: 'frontal',
  frontal: createEmptyTabState(),
  back: createEmptyTabState(),
  base: createEmptyTabState(),

  currentMiniId: null,
  currentCollectionId: null,
  miniatures: [],
  collections: [],
  sidebarOpen: true,
  geminiModel: 'gemini-2.5-flash-image',

  setApiKey: (key: string): void => {
    try {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
    } catch {
      // localStorage might be unavailable
    }
    set({ apiKey: key });
  },

  setActiveTab: (tab: TabId): void => {
    const state = get();
    if (state.canNavigateToTab(tab)) {
      set({ activeTab: tab });
    }
  },

  addImage: (tab: TabId, image: GeneratedImage): void => {
    // Ensure we have a mini
    let { currentMiniId: currentMiniId } = get();
    if (!currentMiniId) {
      currentMiniId = generateId<MiniId>();
      set({ currentMiniId: currentMiniId });
    }

    set((state) => ({
      [tab]: {
        ...state[tab],
        images: [...state[tab].images, image],
        selectedImageId: image.id,
      },
    }));

    // Persist image blob to IndexedDB (fire-and-forget)
    const blob = dataUrlToBlob(image.dataUrl);
    dbSaveImage({
      id: image.id,
      sessionId: currentMiniId,
      tab,
      blob,
      prompt: image.prompt,
      timestamp: image.timestamp,
    })
      .then(() => {
        // Persist mini metadata + update sidebar
        const currentState = get();
        return persistMiniToDB(currentState);
      })
      .then(() => {
        return listMinis();
      })
      .then((allMinis) => {
        set({ miniatures: allMinis.map(miniRecordToMeta) });
      })
      .catch(() => {
        // IndexedDB persistence failed silently
      });
  },

  selectImage: (tab: TabId, imageId: string): void => {
    set((state) => ({
      [tab]: {
        ...state[tab],
        selectedImageId: imageId,
      },
    }));

    // Update selected images in DB
    const state = get();
    if (state.currentMiniId) {
      void persistMiniToDB(state).catch((e: unknown) => console.error(e));
    }
  },

  deleteImage: async (tab: TabId, imageId: string): Promise<void> => {
    const state = get();
    const tabState = state[tab];
    const remainingImages = tabState.images.filter((img) => img.id !== imageId);

    // Determine new selected image
    let newSelectedId: string | null = tabState.selectedImageId;
    if (tabState.selectedImageId === imageId) {
      // If we're deleting the selected image, select another one
      newSelectedId = remainingImages.length > 0 ? remainingImages[remainingImages.length - 1].id : null;
    }

    set((prevState) => ({
      [tab]: {
        ...prevState[tab],
        images: remainingImages,
        selectedImageId: newSelectedId,
      },
    }));

    // Delete from IndexedDB
    await dbDeleteImage(imageId);

    // Persist mini to update thumbnail if needed
    if (state.currentMiniId) {
      await persistMiniToDB(get());
      const allMinis = await listMinis();
      set({ miniatures: allMinis.map(miniRecordToMeta) });
    }
  },

  setGenerating: (tab: TabId, isGenerating: boolean): void => {
    set((state) => ({
      [tab]: {
        ...state[tab],
        isGenerating,
      },
    }));
  },

  getSelectedImage: (tab: TabId): GeneratedImage | null => {
    const state = get();
    const tabState = state[tab];
    if (!tabState.selectedImageId) return null;
    return tabState.images.find((img) => img.id === tabState.selectedImageId) ?? null;
  },

  canNavigateToTab: (tab: TabId): boolean => {
    const state = get();
    switch (tab) {
      case 'frontal':
        return true;
      case 'back':
        return state.frontal.images.length > 0;
      case 'base':
        return state.frontal.images.length > 0 && state.back.images.length > 0;
      default:
        return false;
    }
  },

  setGeminiModel: (model: GeminiModel): void => {
    set({ geminiModel: model });
    // Persist to current mini if exists
    const state = get();
    if (state.currentMiniId) {
      void persistMiniToDB({ ...state, geminiModel: model }).catch((e: unknown) => console.error(e));
    }
  },

  // --- Mini actions ---

  setMinis: (minis: MiniatureMeta[]): void => {
    set({ miniatures: minis });
  },

  loadMini: async (miniId: MiniId): Promise<void> => {
    const mini = await getMini(miniId);
    if (!mini) return;

    const imageRecords = await loadImagesByMini(miniId);

    const frontalImages: GeneratedImage[] = [];
    const backImages: GeneratedImage[] = [];
    const baseImages: GeneratedImage[] = [];

    for (const record of imageRecords) {
      const dataUrl = await blobToDataUrl(record.blob);
      const img: GeneratedImage = {
        id: record.id,
        dataUrl,
        prompt: record.prompt,
        timestamp: record.timestamp,
      };
      switch (record.tab) {
        case 'frontal':
          frontalImages.push(img);
          break;
        case 'back':
          backImages.push(img);
          break;
        case 'base':
          baseImages.push(img);
          break;
      }
    }

    set({
      currentMiniId: miniId,
      activeTab: 'frontal',
      geminiModel: mini.geminiModel,
      frontal: {
        images: frontalImages,
        selectedImageId: mini.selectedImages.frontal ?? frontalImages[0]?.id ?? null,
        isGenerating: false,
      },
      back: {
        images: backImages,
        selectedImageId: mini.selectedImages.back ?? backImages[0]?.id ?? null,
        isGenerating: false,
      },
      base: {
        images: baseImages,
        selectedImageId: mini.selectedImages.base ?? baseImages[0]?.id ?? null,
        isGenerating: false,
      },
    });
  },

  newMini: (collectionId?: CollectionId): void => {
    const miniId = generateId<MiniId>();
    set({
      currentMiniId: miniId,
      currentCollectionId: collectionId ?? null,
      activeTab: 'frontal',
      geminiModel: 'gemini-2.5-flash-image',
      frontal: createEmptyTabState(),
      back: createEmptyTabState(),
      base: createEmptyTabState(),
    });

    // Create initial mini record in DB
    if (collectionId != null) {
      const record: MiniRecord = {
        id: miniId,
        collectionId,
        name: generateMiniName(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        frontalThumbDataUrl: null,
        selectedImages: {
          frontal: null,
          back: null,
          base: null,
        },
        geminiModel: 'gemini-2.5-flash-image',
      };
      void dbSaveMini(record)
        .then(() => {
          return listMinis();
        })
        .then((allMinis) => {
          set({ miniatures: allMinis.map(miniRecordToMeta) });
        })
        .catch((e: unknown) => console.error(e));
    }
  },

  updateMiniName: async (miniId: string, name: string): Promise<void> => {
    const mini = await getMini(miniId);
    if (!mini) return;

    await dbSaveMini({ ...mini, name, updatedAt: Date.now() });

    const allMinis = await listMinis();
    set({ miniatures: allMinis.map(miniRecordToMeta) });
  },

  // --- Collection actions ---

  setCollections: (collections: Collection[]): void => {
    set({ collections });
  },

  createCollection: async (name: string, description: string): Promise<void> => {
    const collection: DBCollection = {
      id: generateId(),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveCollection(collection);

    const allCollections = await listCollections();
    set({ collections: allCollections.map(dbCollectionToCollection) });
  },

  updateCollection: async (
    collectionId: CollectionId,
    updates: { name?: string; description?: string },
  ): Promise<void> => {
    const collection = await getCollection(collectionId);
    if (!collection) return;

    await saveCollection({
      ...collection,
      ...updates,
      updatedAt: Date.now(),
    });

    const allCollections = await listCollections();
    set({ collections: allCollections.map(dbCollectionToCollection) });
  },

  deleteCollection: async (collectionId: CollectionId): Promise<void> => {
    // Check if collection is empty
    const minis = await getMinisByCollection(collectionId);
    if (minis.length > 0) {
      // Cannot delete non-empty collection
      return;
    }

    await deleteCollection(collectionId);

    const allCollections = await listCollections();
    set({ collections: allCollections.map(dbCollectionToCollection) });
  },

  moveMiniToCollection: async (miniId: string, collectionId: CollectionId): Promise<void> => {
    const mini = await getMini(miniId);
    if (!mini) return;

    await dbSaveMini({ ...mini, collectionId, updatedAt: Date.now() });

    const allMinis = await listMinis();
    set({ miniatures: allMinis.map(miniRecordToMeta) });
  },

  createNewMiniature: (collectionId: CollectionId): void => {
    get().newMini(collectionId);
  },

  deleteMiniById: async (miniId: string): Promise<void> => {
    await dbDeleteMini(miniId);
    const allMinis = await listMinis();
    const newMinis = allMinis.map(miniRecordToMeta);

    const state = get();
    if (state.currentMiniId === miniId) {
      set({
        miniatures: newMinis,
        currentMiniId: null,
        activeTab: 'frontal',
        frontal: createEmptyTabState(),
        back: createEmptyTabState(),
        base: createEmptyTabState(),
      });
    } else {
      set({ miniatures: newMinis });
    }
  },

  renameMini: async (miniId: string, name: string): Promise<void> => {
    const mini = await getMini(miniId);
    if (!mini) return;

    await dbSaveMini({ ...mini, name, updatedAt: Date.now() });

    const allMinis = await listMinis();
    set({ miniatures: allMinis.map(miniRecordToMeta) });
  },

  toggleSidebar: (): void => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },
}));

// Initialise minis and collections list on load
void import('@/services/db').then(({ runMigration, listMinis, listCollections }) => {
  void runMigration().then(() => {
    void listMinis().then((allMinis) => {
      useAppStore.setState({ miniatures: allMinis.map(miniRecordToMeta) });
    });
    void listCollections().then((allCollections) => {
      useAppStore.setState({
        collections: allCollections.map(dbCollectionToCollection),
      });
    });
  });
});
