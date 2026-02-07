import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

import type { GeminiModel, TabId } from '@/store/types';

// --- Schema ---

export interface Collection {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface SessionRecord {
  id: string;
  collectionId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  frontalThumbDataUrl: string | null;
  selectedImages: Record<TabId, string | null>;
  geminiModel: GeminiModel;
}

export interface ImageRecord {
  id: string;
  sessionId: string;
  tab: TabId;
  blob: Blob;
  prompt: string;
  timestamp: number;
}

interface UmcDB extends DBSchema {
  collections: {
    key: string;
    value: Collection;
  };
  sessions: {
    key: string;
    value: SessionRecord;
    indexes: { 'by-collection': string };
  };
  images: {
    key: string;
    value: ImageRecord;
    indexes: { 'by-session': string };
  };
}

const DB_NAME = 'umc-db';
const DB_VERSION = 2;

// Simple ID generator for migration
const generateId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;

// Word lists for random name generation
const adjectives = [
  'Iron',
  'Mystic',
  'Ancient',
  'Crimson',
  'Shadow',
  'Golden',
  'Frozen',
  'Storm',
  'Silver',
  'Dark',
  'Light',
  'Crystal',
  'Burning',
  'Eternal',
  'Phantom',
  'Royal',
  'Savage',
  'Silent',
  'Thunder',
  'Venom',
  'Wild',
  'Arcane',
  'Blessed',
  'Cursed',
  'Dread',
  'Emerald',
  'Fierce',
  'Ghost',
  'Hollow',
  'Immortal',
  'Jade',
  'Keen',
];

const nouns = [
  'Guardian',
  'Wolf',
  'Knight',
  'Drake',
  'Spirit',
  'Titan',
  'Seeker',
  'Blade',
  'Warrior',
  'Mage',
  'Ranger',
  'Paladin',
  'Rogue',
  'Cleric',
  'Bard',
  'Monk',
  'Sorcerer',
  'Warlock',
  'Druid',
  'Barbarian',
  'Fighter',
  'Wizard',
  'Ranger',
  'Assassin',
  'Champion',
  'Defender',
  'Enchanter',
  'Hunter',
  'Invoker',
  'Juggernaut',
  'Keeper',
  'Lord',
  'Master',
  'Nomad',
  'Oracle',
  'Protector',
  'Queen',
  'Reaper',
];

const generateMiniName = (): string => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
};

// Export for use in other modules
export { generateId, generateMiniName };

// --- Migration ---

let migrationCompleted = false;

export const runMigration = async (): Promise<void> => {
  if (migrationCompleted) return;

  const db = await getDB();

  // Check if we have any collections
  const collections = await db.getAll('collections');
  if (collections.length === 0) {
    // Create default collection
    const defaultCollectionId = generateId();
    const defaultCollection: Collection = {
      id: defaultCollectionId,
      name: 'Example collection',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.put('collections', defaultCollection);

    // Migrate all existing sessions
    const allSessions = await db.getAll('sessions');
    for (const session of allSessions) {
      session.collectionId = defaultCollectionId;
      // Rename "Untitled" sessions to random names
      if (session.name === 'Untitled') {
        session.name = generateMiniName();
      }
      await db.put('sessions', session);
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
        imageStore.createIndex('by-session', 'sessionId');
      }

      // Version 1->2: Collections schema setup
      if (oldVersion < 2) {
        // Create collections store
        db.createObjectStore('collections', { keyPath: 'id' });
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

export const getSessionsByCollection = async (collectionId: string): Promise<SessionRecord[]> => {
  const db = await getDB();
  const index = db.transaction('sessions').store.index('by-collection');
  const all = await index.getAll(collectionId);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
};

// --- Session CRUD ---

export const listSessions = async (): Promise<SessionRecord[]> => {
  const db = await getDB();
  const all = await db.getAll('sessions');
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const getSession = async (id: string): Promise<SessionRecord | undefined> => {
  const db = await getDB();
  return db.get('sessions', id);
};

export const saveSession = async (session: SessionRecord): Promise<void> => {
  const db = await getDB();
  await db.put('sessions', session);
};

export const deleteSession = async (id: string): Promise<void> => {
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

export const loadImagesBySession = async (sessionId: string): Promise<ImageRecord[]> => {
  const db = await getDB();
  return db.getAllFromIndex('images', 'by-session', sessionId);
};
