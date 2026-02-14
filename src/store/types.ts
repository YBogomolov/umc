import { CollectionId, ImageId, MiniId } from '@/services/db';

export type TabId = 'frontal' | 'back' | 'base';

export type GeminiModel = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';

export interface ModelSelectOption {
  readonly value: GeminiModel;
  readonly label: string;
}

export const GEMINI_MODELS: ModelSelectOption[] = [
  { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash (Nano Banana)' },
  { value: 'gemini-3-pro-image-preview', label: 'Gemini 3 Image Preview' },
];

export interface GeneratedImage {
  readonly id: ImageId;
  readonly dataUrl: string;
  readonly prompt: string;
  readonly timestamp: number;
}

export interface TabState {
  readonly images: GeneratedImage[];
  readonly selectedImageId: ImageId | null;
  readonly isGenerating: boolean;
}

export interface Collection {
  readonly id: CollectionId;
  readonly name: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface MiniatureMeta {
  readonly id: MiniId;
  readonly collectionId: CollectionId;
  readonly name: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly frontalThumbDataUrl: string | null;
}

export interface AppState {
  readonly apiKey: string | null;
  readonly activeTab: TabId;
  readonly frontal: TabState;
  readonly back: TabState;
  readonly base: TabState;

  // Mini state
  readonly currentMiniId: MiniId | null;
  readonly currentCollectionId: CollectionId | null;
  readonly miniatures: MiniatureMeta[];
  readonly collections: Collection[];
  readonly sidebarOpen: boolean;
  readonly geminiModel: GeminiModel;

  // Actions
  setApiKey: (key: string) => void;
  setActiveTab: (tab: TabId) => void;
  addImage: (tab: TabId, image: GeneratedImage) => void;
  selectImage: (tab: TabId, imageId: ImageId) => void;
  deleteImage: (tab: TabId, imageId: ImageId) => Promise<void>;
  setGenerating: (tab: TabId, isGenerating: boolean) => void;
  getSelectedImage: (tab: TabId) => GeneratedImage | null;
  canNavigateToTab: (tab: TabId) => boolean;

  // Model actions
  setGeminiModel: (model: GeminiModel) => void;

  // Mini actions
  setMinis: (minis: MiniatureMeta[]) => void;
  loadMini: (miniId: MiniId) => Promise<void>;
  newMini: (collectionId?: CollectionId) => void;
  deleteMiniById: (miniId: MiniId) => Promise<void>;
  renameMini: (miniId: MiniId, name: string) => Promise<void>;
  updateMiniName: (miniId: MiniId, name: string) => Promise<void>;
  toggleSidebar: () => void;

  // Collection actions
  setCollections: (collections: Collection[]) => void;
  createCollection: (name: string) => Promise<void>;
  renameCollection: (collectionId: CollectionId, name: string) => Promise<void>;
  deleteCollection: (collectionId: CollectionId) => Promise<void>;
  moveMiniToCollection: (miniId: MiniId, collectionId: CollectionId) => Promise<void>;
  createNewMiniature: (collectionId: CollectionId) => void;
}
