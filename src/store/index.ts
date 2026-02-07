import { create } from 'zustand';

import { generateMiniName } from '@/lib/nameGenerator';
import {
  type Collection as DBCollection,
  type SessionRecord,
  blobToDataUrl,
  dataUrlToBlob,
  deleteSession as dbDeleteSession,
  saveImage as dbSaveImage,
  saveSession as dbSaveSession,
  deleteCollection,
  generateId,
  generateThumbnail,
  getCollection,
  getSession,
  getSessionsByCollection,
  listCollections,
  listSessions,
  loadImagesBySession,
  saveCollection,
} from '@/services/db';

import type { AppState, Collection, GeminiModel, GeneratedImage, SessionMeta, TabId, TabState } from './types';

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

const sessionRecordToMeta = (r: SessionRecord): SessionMeta => ({
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
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

const persistSessionToDB = async (state: AppState): Promise<void> => {
  if (!state.currentSessionId) return;

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

  // Check if session already exists to preserve user-set name
  const existing = await getSession(state.currentSessionId);

  const record: SessionRecord = {
    id: state.currentSessionId,
    collectionId: state.currentCollectionId ?? existing?.collectionId ?? '',
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

  await dbSaveSession(record);
};

export const useAppStore = create<AppState>((set, get) => ({
  apiKey: loadApiKey(),
  activeTab: 'frontal',
  frontal: createEmptyTabState(),
  back: createEmptyTabState(),
  base: createEmptyTabState(),

  currentSessionId: null,
  currentCollectionId: null,
  sessions: [],
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
    // Ensure we have a session
    let { currentSessionId } = get();
    if (!currentSessionId) {
      currentSessionId = generateId();
      set({ currentSessionId });
    }

    const sessionId = currentSessionId;

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
      sessionId,
      tab,
      blob,
      prompt: image.prompt,
      timestamp: image.timestamp,
    })
      .then(() => {
        // Persist session metadata + update sidebar
        const currentState = get();
        return persistSessionToDB(currentState);
      })
      .then(() => {
        return listSessions();
      })
      .then((allSessions) => {
        set({ sessions: allSessions.map(sessionRecordToMeta) });
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
    if (state.currentSessionId) {
      void persistSessionToDB(state).catch((e: unknown) => console.error(e));
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
    // Persist to current session if exists
    const state = get();
    if (state.currentSessionId) {
      void persistSessionToDB({ ...state, geminiModel: model }).catch((e: unknown) => console.error(e));
    }
  },

  // --- Session actions ---

  setSessions: (sessions: SessionMeta[]): void => {
    set({ sessions });
  },

  loadSession: async (sessionId: string): Promise<void> => {
    const session = await getSession(sessionId);
    if (!session) return;

    const imageRecords = await loadImagesBySession(sessionId);

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
      currentSessionId: sessionId,
      activeTab: 'frontal',
      geminiModel: session.geminiModel,
      frontal: {
        images: frontalImages,
        selectedImageId: session.selectedImages.frontal ?? frontalImages[0]?.id ?? null,
        isGenerating: false,
      },
      back: {
        images: backImages,
        selectedImageId: session.selectedImages.back ?? backImages[0]?.id ?? null,
        isGenerating: false,
      },
      base: {
        images: baseImages,
        selectedImageId: session.selectedImages.base ?? baseImages[0]?.id ?? null,
        isGenerating: false,
      },
    });
  },

  newSession: (collectionId?: string): void => {
    const sessionId = generateId();
    set({
      currentSessionId: sessionId,
      currentCollectionId: collectionId ?? null,
      activeTab: 'frontal',
      geminiModel: 'gemini-2.5-flash-image',
      frontal: createEmptyTabState(),
      back: createEmptyTabState(),
      base: createEmptyTabState(),
    });

    // Create initial session record in DB
    if (collectionId != null) {
      const record: SessionRecord = {
        id: sessionId,
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
      void dbSaveSession(record)
        .then(() => {
          return listSessions();
        })
        .then((allSessions) => {
          set({ sessions: allSessions.map(sessionRecordToMeta) });
        })
        .catch((e: unknown) => console.error(e));
    }
  },

  updateSessionName: async (sessionId: string, name: string): Promise<void> => {
    const session = await getSession(sessionId);
    if (!session) return;

    session.name = name;
    session.updatedAt = Date.now();
    await dbSaveSession(session);

    const allSessions = await listSessions();
    set({ sessions: allSessions.map(sessionRecordToMeta) });
  },

  // --- Collection actions ---

  setCollections: (collections: Collection[]): void => {
    set({ collections });
  },

  createCollection: async (name: string): Promise<void> => {
    const collection: DBCollection = {
      id: generateId(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveCollection(collection);

    const allCollections = await listCollections();
    set({ collections: allCollections.map(dbCollectionToCollection) });
  },

  renameCollection: async (collectionId: string, name: string): Promise<void> => {
    const collection = await getCollection(collectionId);
    if (!collection) return;

    collection.name = name;
    collection.updatedAt = Date.now();
    await saveCollection(collection);

    const allCollections = await listCollections();
    set({ collections: allCollections.map(dbCollectionToCollection) });
  },

  deleteCollection: async (collectionId: string): Promise<void> => {
    // Check if collection is empty
    const sessions = await getSessionsByCollection(collectionId);
    console.log({ sessions });
    if (sessions.length > 0) {
      // Cannot delete non-empty collection
      return;
    }

    await deleteCollection(collectionId);

    const allCollections = await listCollections();
    set({ collections: allCollections.map(dbCollectionToCollection) });
  },

  moveSessionToCollection: async (sessionId: string, collectionId: string): Promise<void> => {
    const session = await getSession(sessionId);
    if (!session) return;

    session.collectionId = collectionId;
    session.updatedAt = Date.now();
    await dbSaveSession(session);

    const allSessions = await listSessions();
    set({ sessions: allSessions.map(sessionRecordToMeta) });
  },

  createNewMiniature: (collectionId: string): void => {
    get().newSession(collectionId);
  },

  deleteSessionById: async (sessionId: string): Promise<void> => {
    await dbDeleteSession(sessionId);
    const allSessions = await listSessions();
    const newSessions = allSessions.map(sessionRecordToMeta);

    const state = get();
    if (state.currentSessionId === sessionId) {
      set({
        sessions: newSessions,
        currentSessionId: null,
        activeTab: 'frontal',
        frontal: createEmptyTabState(),
        back: createEmptyTabState(),
        base: createEmptyTabState(),
      });
    } else {
      set({ sessions: newSessions });
    }
  },

  renameSession: async (sessionId: string, name: string): Promise<void> => {
    const session = await getSession(sessionId);
    if (!session) return;

    session.name = name;
    session.updatedAt = Date.now();
    await dbSaveSession(session);

    const allSessions = await listSessions();
    set({ sessions: allSessions.map(sessionRecordToMeta) });
  },

  toggleSidebar: (): void => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },
}));

// Initialise sessions and collections list on load
void import('@/services/db').then(({ runMigration, listSessions, listCollections }) => {
  void runMigration().then(() => {
    void listSessions().then((allSessions) => {
      useAppStore.setState({ sessions: allSessions.map(sessionRecordToMeta) });
    });
    void listCollections().then((allCollections) => {
      useAppStore.setState({
        collections: allCollections.map(dbCollectionToCollection),
      });
    });
  });
});
