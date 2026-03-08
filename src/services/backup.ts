import JSZip from 'jszip';

import { type Collection, type MiniRecord, listAllImages, listCollections, listMinis } from '@/services/db';

const DB_NAME = 'umc-db';

export interface BackupMetadata {
  readonly version: number;
  readonly dbName: string;
  readonly createdAt: string;
  readonly collections: readonly Collection[];
  readonly minis: readonly MiniRecord[];
  readonly stats: {
    readonly collectionsCount: number;
    readonly minisCount: number;
    readonly imagesCount: number;
  };
}

export interface BackupImageMetadata {
  readonly id: string;
  readonly sessionId: string;
  readonly tab: 'frontal' | 'back' | 'base';
  readonly prompt: string;
  readonly timestamp: number;
  readonly fileName: string;
}

export interface BackupData {
  readonly metadata: BackupMetadata;
  readonly images: readonly BackupImageMetadata[];
  readonly imageBlobs: ReadonlyArray<{
    readonly fileName: string;
    readonly blob: Blob;
  }>;
}

export const generateBackupFileName = (dbName: string): string => {
  const now = new Date();
  const isoDate = now.toISOString().replace(/[:.]/g, '-');
  return `${dbName}_${isoDate}.zip`;
};

export const createBackup = async (): Promise<BackupData> => {
  const [collections, minis, images] = await Promise.all([listCollections(), listMinis(), listAllImages()]);

  const metadata: BackupMetadata = {
    version: 4, // Current DB_VERSION
    dbName: DB_NAME,
    createdAt: new Date().toISOString(),
    collections,
    minis,
    stats: {
      collectionsCount: collections.length,
      minisCount: minis.length,
      imagesCount: images.length,
    },
  };

  // Convert image blobs to named files with metadata
  const imageBlobs = images.map((image) => {
    const fileName = `${image.sessionId}_${image.tab}_${image.timestamp}.png`;
    return {
      fileName,
      blob: image.blob,
    };
  });

  // Store full image metadata for restoration
  const imageMetadata: BackupImageMetadata[] = images.map((image) => ({
    id: image.id,
    sessionId: image.sessionId,
    tab: image.tab,
    prompt: image.prompt,
    timestamp: image.timestamp,
    fileName: `${image.sessionId}_${image.tab}_${image.timestamp}.png`,
  }));

  return {
    metadata,
    images: imageMetadata,
    imageBlobs,
  };
};

export const downloadBackup = async (backupData: BackupData): Promise<void> => {
  const zip = new JSZip();

  // Add metadata
  zip.file('metadata.json', JSON.stringify(backupData.metadata, null, 2));

  // Add collections
  zip.file('collections.json', JSON.stringify(backupData.metadata.collections, null, 2));

  // Add minis
  zip.file('minis.json', JSON.stringify(backupData.metadata.minis, null, 2));

  // Add image metadata
  zip.file('images.json', JSON.stringify(backupData.images, null, 2));

  // Add images folder
  const imagesFolder = zip.folder('images');
  if (imagesFolder) {
    for (const image of backupData.imageBlobs) {
      imagesFolder.file(image.fileName, image.blob);
    }
  }

  // Generate and download
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = generateBackupFileName(backupData.metadata.dbName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
