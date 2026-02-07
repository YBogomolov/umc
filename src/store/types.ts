export type TabId = "frontal" | "back" | "base";

export type GeminiModel =
  | "gemini-2.5-flash-image"
  | "gemini-3-pro-image-preview";

export const GEMINI_MODELS: { value: GeminiModel; label: string }[] = [
  { value: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash (Nano Banana)" },
  { value: "gemini-3-pro-image-preview", label: "Gemini 3 Image Preview" },
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

export interface SessionMeta {
  id: string;
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
  sessions: SessionMeta[];
  sidebarOpen: boolean;
  geminiModel: GeminiModel;

  // Actions
  setApiKey: (key: string) => void;
  setActiveTab: (tab: TabId) => void;
  addImage: (tab: TabId, image: GeneratedImage) => void;
  selectImage: (tab: TabId, imageId: string) => void;
  setGenerating: (tab: TabId, isGenerating: boolean) => void;
  getSelectedImage: (tab: TabId) => GeneratedImage | null;
  canNavigateToTab: (tab: TabId) => boolean;

  // Model actions
  setGeminiModel: (model: GeminiModel) => void;

  // Session actions
  setSessions: (sessions: SessionMeta[]) => void;
  loadSession: (sessionId: string) => Promise<void>;
  newSession: () => void;
  deleteSessionById: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, name: string) => Promise<void>;
  toggleSidebar: () => void;
}
