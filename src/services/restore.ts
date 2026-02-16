import JSZip from 'jszip';

import type { BackupImageMetadata, BackupMetadata } from '@/services/backup';
import {
  type Collection,
  type ImageRecord,
  type MiniRecord,
  clearAllData,
  saveCollection,
  saveImage,
  saveMini,
} from '@/services/db';

export interface RestorePreview {
  readonly metadata: BackupMetadata;
  readonly currentStats: {
    readonly collectionsCount: number;
    readonly minisCount: number;
    readonly imagesCount: number;
  };
}

interface ParsedBackup {
  readonly metadata: BackupMetadata;
  readonly collections: readonly Collection[];
  readonly minis: readonly MiniRecord[];
  readonly images: readonly ImageRecord[];
}

const parseBackupFile = async (file: File): Promise<ParsedBackup> => {
  const zip = await JSZip.loadAsync(file);

  // Parse metadata
  const metadataFile = zip.file('metadata.json');
  if (!metadataFile) {
    throw new Error('Invalid backup: metadata.json not found');
  }
  const metadataContent = await metadataFile.async('string');
  const metadata = JSON.parse(metadataContent) as BackupMetadata;

  // Parse collections
  const collectionsFile = zip.file('collections.json');
  if (!collectionsFile) {
    throw new Error('Invalid backup: collections.json not found');
  }
  const collectionsContent = await collectionsFile.async('string');
  const collections = JSON.parse(collectionsContent) as Collection[];

  // Parse minis
  const minisFile = zip.file('minis.json');
  if (!minisFile) {
    throw new Error('Invalid backup: minis.json not found');
  }
  const minisContent = await minisFile.async('string');
  const minis = JSON.parse(minisContent) as MiniRecord[];

  // Parse image metadata
  const imagesMetadataFile = zip.file('images.json');
  let imageMetadataList: BackupImageMetadata[] = [];
  if (imagesMetadataFile) {
    const imagesMetadataContent = await imagesMetadataFile.async('string');
    imageMetadataList = JSON.parse(imagesMetadataContent) as BackupImageMetadata[];
  }

  // Parse image blobs and match with metadata
  const imagesFolder = zip.folder('images');
  const imageBlobs = new Map<string, Blob>();

  if (imagesFolder) {
    for (const [filePath, fileObj] of Object.entries(imagesFolder.files)) {
      if (!fileObj.dir && filePath.startsWith('images/')) {
        const blob = await fileObj.async('blob');
        const fileName = filePath.replace('images/', '');
        imageBlobs.set(fileName, blob);
      }
    }
  }

  // Reconstruct image records with original metadata and blobs
  const images: ImageRecord[] = imageMetadataList
    .map((metadata) => {
      const blob = imageBlobs.get(metadata.fileName);
      if (!blob) {
        console.warn(`Image blob not found for ${metadata.fileName}`);
        return null;
      }
      return {
        id: metadata.id as ImageRecord['id'],
        sessionId: metadata.sessionId as ImageRecord['sessionId'],
        tab: metadata.tab as ImageRecord['tab'],
        blob,
        prompt: metadata.prompt,
        timestamp: metadata.timestamp,
      };
    })
    .filter((img): img is ImageRecord => img !== null);

  return {
    metadata,
    collections,
    minis,
    images,
  };
};

const getCurrentStats = async (): Promise<RestorePreview['currentStats']> => {
  const { listAllImages, listCollections, listMinis } = await import('@/services/db');
  const [collections, minis, images] = await Promise.all([listCollections(), listMinis(), listAllImages()]);

  return {
    collectionsCount: collections.length,
    minisCount: minis.length,
    imagesCount: images.length,
  };
};

export const loadBackupPreview = async (file: File): Promise<RestorePreview> => {
  const backup = await parseBackupFile(file);
  const currentStats = await getCurrentStats();

  return {
    metadata: backup.metadata,
    currentStats,
  };
};

export const restoreFromBackup = async (file: File): Promise<void> => {
  const backup = await parseBackupFile(file);

  // Clear all existing data
  await clearAllData();

  // Restore collections
  for (const collection of backup.collections) {
    await saveCollection(collection);
  }

  // Restore minis
  for (const mini of backup.minis) {
    await saveMini(mini);
  }

  // Restore images with original metadata
  for (const image of backup.images) {
    await saveImage(image);
  }
};
