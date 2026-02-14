import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

import { generateMiniName } from '@/lib/nameGenerator';
import type { Opaque } from '@/lib/types';
import type { GeminiModel, TabId } from '@/store/types';

// --- Schema ---

export type CollectionId = Opaque<string, 'CollectionId'>;

export type MiniId = Opaque<string, 'MiniId'>;

export type ImageId = Opaque<string, 'ImageId'>;

export interface Collection {
  readonly id: CollectionId;
  readonly name: string;
  readonly description: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface MiniRecord {
  readonly id: MiniId;
  readonly collectionId: CollectionId;
  readonly name: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly frontalThumbDataUrl: string | null;
  readonly selectedImages: Record<TabId, ImageId | null>;
  readonly geminiModel: GeminiModel;
}

export interface ImageRecord {
  readonly id: ImageId;
  // TODO: should be renamed to 'miniId'
  readonly sessionId: MiniId;
  readonly tab: TabId;
  readonly blob: Blob;
  readonly prompt: string;
  readonly timestamp: number;
}

interface UmcDB extends DBSchema {
  readonly collections: {
    readonly key: string;
    readonly value: Collection;
  };
  // TODO: should be renamed to 'minis'
  readonly sessions: {
    readonly key: string;
    readonly value: MiniRecord;
    readonly indexes: { 'by-collection': string };
  };
  readonly images: {
    readonly key: string;
    readonly value: ImageRecord;
    // TODO: should be renamed to 'by-mini'
    readonly indexes: { 'by-session': string };
  };
}

const DB_NAME = 'umc-db';
const DB_VERSION = 4;

// Simple ID generator for migration
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
const generateId = <S extends CollectionId | MiniId | ImageId>(): S =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}` as S;

// Export for use in other modules
export { generateId };

// --- Migration ---

let migrationCompleted = false;

export const runMigration = async (): Promise<void> => {
  if (migrationCompleted) return;

  const db = await getDB();

  // Check if we have any collections
  const collections = await db.getAll('collections');

  // Migrate existing collections to v3 (add description field)
  for (const collection of collections) {
    const coll = collection as Collection & { description?: string };
    if (coll.description === undefined) {
      await db.put('collections', { ...coll, description: '' });
    }
  }

  if (collections.length === 0) {
    // Create default collection
    const defaultCollectionId = generateId<CollectionId>();
    const defaultCollection: Collection = {
      id: defaultCollectionId,
      name: 'Example collection',
      description: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.put('collections', defaultCollection);

    // Migrate all existing minis
    const allMinis = await db.getAll('sessions');
    for (const mini of allMinis) {
      await db.put('sessions', {
        ...mini,
        collectionId: defaultCollectionId,
        name: mini.name === 'Untitled' ? generateMiniName() : mini.name,
      });
    }
  }

  migrationCompleted = true;
};

let dbInstance: IDBPDatabase<UmcDB> | null = null;

const getDB = async (): Promise<IDBPDatabase<UmcDB>> => {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<UmcDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Version 0->1: Initial setup
      if (oldVersion < 1) {
        db.createObjectStore('sessions', { keyPath: 'id' });
        const imageStore = db.createObjectStore('images', { keyPath: 'id' });
        imageStore.createIndex('by-session', 'miniId');
      }

      // Version 1->2: Collections schema setup
      if (oldVersion < 2) {
        // Create collections store
        db.createObjectStore('collections', { keyPath: 'id' });
      }

      // Version 2->3: Add description field to collections
      if (oldVersion < 3) {
        // Migration handled in runMigration after DB is ready
      }
    },
  });

  return dbInstance;
};

// --- Thumbnail ---

const THUMB_MAX_SIZE = 64;

export const generateThumbnail = (dataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = (): void => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(THUMB_MAX_SIZE / img.width, THUMB_MAX_SIZE / img.height);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = (): void => {
      reject(new Error('Failed to load image for thumbnail'));
    };
    img.src = dataUrl;
  });
};

// --- Blob <-> DataUrl ---

export const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = /:(.*?);/.exec(header);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
};

export const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = (): void => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader did not return a string'));
      }
    };
    reader.onerror = (): void => {
      reject(new Error('FileReader error'));
    };
    reader.readAsDataURL(blob);
  });
};

// --- Collection CRUD ---

export const listCollections = async (): Promise<Collection[]> => {
  const db = await getDB();
  const all = await db.getAll('collections');
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const getCollection = async (id: string): Promise<Collection | undefined> => {
  const db = await getDB();
  return db.get('collections', id);
};

export const saveCollection = async (collection: Collection): Promise<void> => {
  const db = await getDB();
  await db.put('collections', collection);
};

export const deleteCollection = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete('collections', id);
};

export const getMinisByCollection = async (collectionId: CollectionId): Promise<MiniRecord[]> => {
  const db = await getDB();
  const all = await db.transaction('sessions').store.getAll('sessions');
  return all.filter((mini) => mini.collectionId === collectionId).sort((a, b) => b.createdAt - a.createdAt);
};

// --- Mini CRUD ---

export const listMinis = async (): Promise<MiniRecord[]> => {
  const db = await getDB();
  const all = await db.getAll('sessions');
  return all.sort((a, b) => a.createdAt - b.createdAt);
};

export const getMini = async (id: string): Promise<MiniRecord | undefined> => {
  const db = await getDB();
  return db.get('sessions', id);
};

export const saveMini = async (mini: MiniRecord): Promise<void> => {
  const db = await getDB();
  await db.put('sessions', mini);
};

export const deleteMini = async (id: string): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(['sessions', 'images'], 'readwrite');
  await tx.objectStore('sessions').delete(id);

  const imageStore = tx.objectStore('images');
  const index = imageStore.index('by-session');
  let cursor = await index.openCursor(id);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
};

// --- Image CRUD ---

export const saveImage = async (record: ImageRecord): Promise<void> => {
  const db = await getDB();
  await db.put('images', record);
};

export const loadImagesByMini = async (miniId: string): Promise<ImageRecord[]> => {
  const db = await getDB();
  return db.getAllFromIndex('images', 'by-session', miniId);
};

export const deleteImage = async (imageId: string): Promise<void> => {
  const db = await getDB();
  await db.delete('images', imageId);
};
