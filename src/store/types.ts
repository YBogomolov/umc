export type TabId = 'frontal' | 'back' | 'base';

export type GeminiModel = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';

export const GEMINI_MODELS: { value: GeminiModel; label: string }[] = [
  { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash (Nano Banana)' },
  { value: 'gemini-3-pro-image-preview', label: 'Gemini 3 Image Preview' },
];

export interface GeneratedImage {
  id: string;
  dataUrl: string;
  prompt: string;
  timestamp: number;
}

export interface TabState {
  images: GeneratedImage[];
  selectedImageId: string | null;
  isGenerating: boolean;
}

export interface Collection {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface SessionMeta {
  id: string;
  collectionId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  frontalThumbDataUrl: string | null;
}

export interface AppState {
  apiKey: string | null;
  activeTab: TabId;
  frontal: TabState;
  back: TabState;
  base: TabState;

  // Session state
  currentSessionId: string | null;
  currentCollectionId: string | null;
  sessions: SessionMeta[];
  collections: Collection[];
  sidebarOpen: boolean;
  geminiModel: GeminiModel;

  // Actions
  setApiKey: (key: string) => void;
  setActiveTab: (tab: TabId) => void;
  addImage: (tab: TabId, image: GeneratedImage) => void;
  selectImage: (tab: TabId, imageId: string) => void;
  deleteImage: (tab: TabId, imageId: string) => Promise<void>;
  setGenerating: (tab: TabId, isGenerating: boolean) => void;
  getSelectedImage: (tab: TabId) => GeneratedImage | null;
  canNavigateToTab: (tab: TabId) => boolean;

  // Model actions
  setGeminiModel: (model: GeminiModel) => void;

  // Session actions
  setSessions: (sessions: SessionMeta[]) => void;
  loadSession: (sessionId: string) => Promise<void>;
  newSession: (collectionId?: string) => void;
  deleteSessionById: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, name: string) => Promise<void>;
  updateSessionName: (sessionId: string, name: string) => Promise<void>;
  toggleSidebar: () => void;

  // Collection actions
  setCollections: (collections: Collection[]) => void;
  createCollection: (name: string) => Promise<void>;
  renameCollection: (collectionId: string, name: string) => Promise<void>;
  deleteCollection: (collectionId: string) => Promise<void>;
  moveSessionToCollection: (sessionId: string, collectionId: string) => Promise<void>;
  createNewMiniature: (collectionId: string) => void;
}
