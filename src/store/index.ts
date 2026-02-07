import { create } from "zustand";
import type {
  AppState,
  TabId,
  GeneratedImage,
  TabState,
  SessionMeta,
  GeminiModel,
} from "./types";
import {
  saveSession as dbSaveSession,
  saveImage as dbSaveImage,
  loadImagesBySession,
  deleteSession as dbDeleteSession,
  getSession,
  listSessions,
  generateThumbnail,
  dataUrlToBlob,
  blobToDataUrl,
  type SessionRecord,
} from "@/services/db";
import { generateId } from "@/services/gemini";

const API_KEY_STORAGE_KEY = "umc_api_key";

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
  name: r.name,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  frontalThumbDataUrl: r.frontalThumbDataUrl,
});

const persistSessionToDB = async (state: AppState): Promise<void> => {
  if (!state.currentSessionId) return;

  const frontalSelected = state.frontal.selectedImageId;
  const firstFrontalImage =
    state.frontal.images.length > 0
      ? (state.frontal.images.find((img) => img.id === frontalSelected) ??
        state.frontal.images[0])
      : null;

  let thumbDataUrl: string | null = null;
  if (firstFrontalImage) {
    try {
      thumbDataUrl = await generateThumbnail(firstFrontalImage.dataUrl);
    } catch {
      // thumbnail generation failed, leave null
    }
  }

  const name = firstFrontalImage
    ? firstFrontalImage.prompt.substring(0, 40) +
      (firstFrontalImage.prompt.length > 40 ? "..." : "")
    : "Untitled";

  // Check if session already exists to preserve user-set name
  const existing = await getSession(state.currentSessionId);

  const record: SessionRecord = {
    id: state.currentSessionId,
    name: existing?.name ?? name,
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
  activeTab: "frontal",
  frontal: createEmptyTabState(),
  back: createEmptyTabState(),
  base: createEmptyTabState(),

  currentSessionId: null,
  sessions: [],
  sidebarOpen: true,
  geminiModel: "gemini-2.5-flash-image",

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
      persistSessionToDB(state).catch(() => {});
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
    return (
      tabState.images.find((img) => img.id === tabState.selectedImageId) ?? null
    );
  },

  canNavigateToTab: (tab: TabId): boolean => {
    const state = get();
    switch (tab) {
      case "frontal":
        return true;
      case "back":
        return state.frontal.images.length > 0;
      case "base":
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
      persistSessionToDB({ ...state, geminiModel: model }).catch(() => {});
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
        case "frontal":
          frontalImages.push(img);
          break;
        case "back":
          backImages.push(img);
          break;
        case "base":
          baseImages.push(img);
          break;
      }
    }

    set({
      currentSessionId: sessionId,
      activeTab: "frontal",
      geminiModel: session.geminiModel,
      frontal: {
        images: frontalImages,
        selectedImageId:
          session.selectedImages.frontal ?? frontalImages[0]?.id ?? null,
        isGenerating: false,
      },
      back: {
        images: backImages,
        selectedImageId:
          session.selectedImages.back ?? backImages[0]?.id ?? null,
        isGenerating: false,
      },
      base: {
        images: baseImages,
        selectedImageId:
          session.selectedImages.base ?? baseImages[0]?.id ?? null,
        isGenerating: false,
      },
    });
  },

  newSession: (): void => {
    set({
      currentSessionId: null,
      activeTab: "frontal",
      geminiModel: "gemini-2.5-flash-image",
      frontal: createEmptyTabState(),
      back: createEmptyTabState(),
      base: createEmptyTabState(),
    });
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
        activeTab: "frontal",
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

// Initialise sessions list on load
listSessions()
  .then((allSessions) => {
    useAppStore.setState({ sessions: allSessions.map(sessionRecordToMeta) });
  })
  .catch(() => {});
