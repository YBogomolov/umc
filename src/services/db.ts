import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { TabId, GeminiModel } from "@/store/types";

// --- Schema ---

export interface SessionRecord {
  id: string;
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
  sessions: {
    key: string;
    value: SessionRecord;
  };
  images: {
    key: string;
    value: ImageRecord;
    indexes: { "by-session": string };
  };
}

const DB_NAME = "umc-db";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<UmcDB> | null = null;

const getDB = async (): Promise<IDBPDatabase<UmcDB>> => {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<UmcDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore("sessions", { keyPath: "id" });
      const imageStore = db.createObjectStore("images", { keyPath: "id" });
      imageStore.createIndex("by-session", "sessionId");
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
      const canvas = document.createElement("canvas");
      const ratio = Math.min(
        THUMB_MAX_SIZE / img.width,
        THUMB_MAX_SIZE / img.height,
      );
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = (): void =>
      reject(new Error("Failed to load image for thumbnail"));
    img.src = dataUrl;
  });
};

// --- Blob <-> DataUrl ---

export const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, data] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
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
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("FileReader did not return a string"));
      }
    };
    reader.onerror = (): void => reject(new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
};

// --- Session CRUD ---

export const listSessions = async (): Promise<SessionRecord[]> => {
  const db = await getDB();
  const all = await db.getAll("sessions");
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const getSession = async (
  id: string,
): Promise<SessionRecord | undefined> => {
  const db = await getDB();
  return db.get("sessions", id);
};

export const saveSession = async (session: SessionRecord): Promise<void> => {
  const db = await getDB();
  await db.put("sessions", session);
};

export const deleteSession = async (id: string): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction(["sessions", "images"], "readwrite");
  await tx.objectStore("sessions").delete(id);

  const imageStore = tx.objectStore("images");
  const index = imageStore.index("by-session");
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
  await db.put("images", record);
};

export const loadImagesBySession = async (
  sessionId: string,
): Promise<ImageRecord[]> => {
  const db = await getDB();
  return db.getAllFromIndex("images", "by-session", sessionId);
};
