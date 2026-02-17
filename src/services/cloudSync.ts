// Cloud Sync Utility
// High-level operations for pushing/pulling backups to/from Google Drive
import { createBackup } from './backup';
import {
  type CloudStorageError,
  type GoogleDriveBackupFile,
  downloadBackup as downloadFromDrive,
  findBackupFile,
  getCurrentDbStats,
  initializeGoogleAuth,
  isAuthenticated,
  signIn,
  signOut,
  uploadBackup as uploadToDrive,
} from './cloudStorage';
import { restoreFromBackupBlob } from './restore';

export interface CloudSyncResult {
  readonly success: boolean;
  readonly error?: string;
  readonly timestamp?: string;
}

export interface CloudBackupInfo {
  readonly exists: boolean;
  readonly file?: GoogleDriveBackupFile;
  readonly currentStats: {
    readonly collectionsCount: number;
    readonly minisCount: number;
    readonly imagesCount: number;
  };
}

/**
 * Initialize cloud storage with Google OAuth
 * Must be called with the Google Client ID before using other functions
 */
export function initializeCloudStorage(clientId: string): void {
  initializeGoogleAuth(clientId);
}

/**
 * Connect to Google Drive
 * Triggers OAuth flow
 */
export async function connectCloudStorage(): Promise<CloudSyncResult> {
  try {
    await signIn();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sign in',
    };
  }
}

/**
 * Disconnect from Google Drive
 */
export async function disconnectCloudStorage(): Promise<CloudSyncResult> {
  try {
    await signOut();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sign out',
    };
  }
}

/**
 * Check if user is authenticated with Google Drive
 */
export function isCloudStorageConnected(): boolean {
  return isAuthenticated();
}

/**
 * Push current database to cloud
 * Creates a backup and uploads it to Google Drive
 */
export async function pushToCloud(): Promise<CloudSyncResult> {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      return {
        success: false,
        error: 'Not authenticated with Google Drive',
      };
    }

    // Create backup
    const backupData = await createBackup();

    // Create ZIP blob
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    zip.file('metadata.json', JSON.stringify(backupData.metadata, null, 2));
    zip.file('collections.json', JSON.stringify(backupData.metadata.collections, null, 2));
    zip.file('minis.json', JSON.stringify(backupData.metadata.minis, null, 2));
    zip.file('images.json', JSON.stringify(backupData.images, null, 2));

    const imagesFolder = zip.folder('images');
    if (imagesFolder) {
      for (const image of backupData.imageBlobs) {
        imagesFolder.file(image.fileName, image.blob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Upload to Google Drive
    await uploadToDrive(zipBlob);

    const timestamp = new Date().toISOString();
    return {
      success: true,
      timestamp,
    };
  } catch (error) {
    if ((error as CloudStorageError).type) {
      const cloudError = error as CloudStorageError;
      return {
        success: false,
        error: cloudError.message,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to push to cloud',
    };
  }
}

/**
 * Get information about cloud backup and current database
 * Used for confirmation dialog before pull
 */
export async function getCloudBackupInfo(): Promise<CloudBackupInfo | { error: string }> {
  try {
    if (!isAuthenticated()) {
      return { error: 'Not authenticated with Google Drive' };
    }

    const [backupFile, currentStats] = await Promise.all([findBackupFile(), getCurrentDbStats()]);

    return {
      exists: backupFile !== null,
      file: backupFile ?? undefined,
      currentStats,
    };
  } catch (error) {
    if ((error as CloudStorageError).type) {
      return { error: (error as CloudStorageError).message };
    }
    return { error: 'Failed to get backup info' };
  }
}

/**
 * Pull backup from cloud and restore it
 * This is a destructive operation - it replaces the local database
 */
export async function pullFromCloud(): Promise<CloudSyncResult> {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      return {
        success: false,
        error: 'Not authenticated with Google Drive',
      };
    }

    // Download backup from Google Drive
    const backupBlob = await downloadFromDrive();

    // Restore the backup (this wipes local DB and restores from backup)
    await restoreFromBackupBlob(backupBlob);

    return {
      success: true,
    };
  } catch (error) {
    if ((error as CloudStorageError).type) {
      const cloudError = error as CloudStorageError;
      return {
        success: false,
        error: cloudError.message,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to pull from cloud',
    };
  }
}
