// Google Drive Cloud Storage Service
// Uses Google Identity Services SDK and Drive API v3
import { listAllImages, listCollections, listMinis } from './db';

declare global {
  interface Window {
    readonly google?: {
      readonly accounts: {
        readonly oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient;
        };
      };
    };
  }
}

interface TokenClientConfig {
  readonly client_id: string;
  readonly scope: string;
  readonly callback: (response: TokenResponse) => void;
  readonly error_callback?: (error: TokenError) => void;
}

interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

interface TokenResponse {
  readonly access_token: string;
  readonly expires_in: number;
  readonly scope: string;
  readonly token_type: string;
}

interface TokenError {
  readonly type: string;
  readonly message: string;
}

export interface GoogleDriveBackupFile {
  readonly id: string;
  readonly name: string;
  readonly modifiedTime: string;
  readonly size: number;
}

export interface CloudStorageError {
  type: 'auth' | 'network' | 'not_found' | 'quota' | 'unknown';
  message: string;
}

interface AuthSession {
  access_token: string;
  expires_at: number;
  email: string;
}

const GOOGLE_SCOPE = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/drive.appdata',
].join(' ');
const BACKUP_FILE_NAME = 'umc-backup.zip';
const BACKUP_MIME_TYPE = 'application/zip';
const AUTH_STORAGE_KEY = 'umc_auth_session';

let tokenClient: TokenClient | null = null;
let accessToken: string | null = null;
let currentUserEmail: string | null = null;

// Save auth session to localStorage
const saveAuthSession = (token: string, expiresIn: number, email: string): void => {
  try {
    const expiresAt = Date.now() + expiresIn * 1000;
    const session: AuthSession = {
      access_token: token,
      expires_at: expiresAt,
      email,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // localStorage might be unavailable
  }
};

// Load auth session from localStorage
const loadAuthSession = (): AuthSession | null => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as AuthSession;
    }
  } catch {
    // localStorage might be unavailable or data corrupted
  }
  return null;
};

// Clear auth session from localStorage
const clearAuthSession = (): void => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // localStorage might be unavailable
  }
};

// Check if stored session is valid (not expired)
const isSessionValid = (session: AuthSession): boolean => {
  return Date.now() < session.expires_at;
};

export function initializeGoogleAuth(newClientId: string): void {
  if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
    return;
  }

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: newClientId,
    scope: GOOGLE_SCOPE,
    callback: (response: TokenResponse): void => {
      if (response.access_token) {
        accessToken = response.access_token;
        void fetchUserInfoAndSave(response.expires_in);
      }
    },
    error_callback: (error: TokenError): void => {
      console.error('Google Auth Error:', error);
      accessToken = null;
      currentUserEmail = null;
    },
  });
}

async function fetchUserInfoAndSave(expiresIn: number): Promise<void> {
  if (!accessToken) return;

  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = (await response.json()) as { email: string };
      currentUserEmail = data.email;
      // Save complete session to localStorage
      saveAuthSession(accessToken, expiresIn, currentUserEmail);
    }
  } catch (error) {
    console.error('Failed to fetch user info:', error);
  }
}

export async function signIn(prompt = 'consent'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google Auth not initialized'));
      return;
    }

    // Create a new token client with our promise handlers
    const tempClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: (tokenClient as unknown as { u: { client_id: string } }).u.client_id,
      scope: GOOGLE_SCOPE,
      callback: (response: TokenResponse): void => {
        if (response.access_token) {
          accessToken = response.access_token;
          void fetchUserInfoAndSave(response.expires_in).then(() => resolve());
        } else {
          reject(new Error('No access token received'));
        }
      },
      error_callback: (error: TokenError): void => {
        reject(new Error(error.message));
      },
    });

    if (tempClient) {
      // 'none' = silent (no popup if already authorized)
      // 'consent' = show popup
      tempClient.requestAccessToken({ prompt });
    } else {
      reject(new Error('Failed to create token client'));
    }
  });
}

export async function signOut(): Promise<void> {
  if (accessToken) {
    try {
      // Revoke token
      await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (error) {
      console.error('Error revoking token:', error);
    }
  }

  accessToken = null;
  currentUserEmail = null;
  clearAuthSession();
}

export function getCurrentUser(): { email: string } | null {
  if (currentUserEmail) {
    return { email: currentUserEmail };
  }
  // Fall back to localStorage if memory is cleared (e.g., page refresh)
  const session = loadAuthSession();
  if (session) {
    return { email: session.email };
  }
  return null;
}

export function isAuthenticated(): boolean {
  if (accessToken) {
    return true;
  }
  // Check localStorage for valid session
  const session = loadAuthSession();
  return session !== null && isSessionValid(session);
}

/**
 * Initialize auth from localStorage on app boot
 * Returns true if valid session was restored
 */
export function initAuthFromStorage(): boolean {
  const session = loadAuthSession();
  if (session && isSessionValid(session)) {
    accessToken = session.access_token;
    currentUserEmail = session.email;
    return true;
  }
  return false;
}

/**
 * Attempt silent re-authentication using stored session
 * If token is expired, attempts to refresh
 * Returns true if successful
 */
export async function restoreAuth(): Promise<boolean> {
  // First try to restore from storage
  const restored = initAuthFromStorage();
  if (restored) {
    return true;
  }

  // If we have a session but it's expired, try silent auth
  const session = loadAuthSession();
  if (session) {
    try {
      // Attempt silent token refresh
      await signIn('none');
      return true;
    } catch {
      // Silent auth failed, clear session
      clearAuthSession();
      return false;
    }
  }

  return false;
}

function ensureAuthenticated(): void {
  // First check memory
  if (accessToken) {
    return;
  }

  // Then check localStorage
  const session = loadAuthSession();
  if (session && isSessionValid(session)) {
    accessToken = session.access_token;
    currentUserEmail = session.email;
    return;
  }

  // Not authenticated
  const error = new Error('Not authenticated') as Error & CloudStorageError;
  error.type = 'auth';
  throw error;
}

async function makeDriveRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  ensureAuthenticated();

  const url = `https://www.googleapis.com/drive/v3${endpoint}`;
  const requestHeaders: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (options.headers instanceof Headers) {
    options.headers.forEach((value, key) => {
      requestHeaders[key] = value;
    });
  } else if (Array.isArray(options.headers)) {
    options.headers.forEach(([key, value]) => {
      requestHeaders[key] = value;
    });
  } else if (typeof options.headers === 'object' && options.headers !== null) {
    for (const [key, value] of Object.entries(options.headers)) {
      if (typeof value === 'string') {
        requestHeaders[key] = value;
      }
    }
  }
  const response = await fetch(url, {
    ...options,
    headers: requestHeaders,
  });

  if (response.status === 401) {
    accessToken = null;
    clearAuthSession();
    const authError = new Error('Authentication expired') as Error & CloudStorageError;
    authError.type = 'auth';
    throw authError;
  }

  if (response.status === 403) {
    const quotaError = new Error('Quota exceeded or permission denied') as Error & CloudStorageError;
    quotaError.type = 'quota';
    throw quotaError;
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    const unknownError = new Error(`Drive API error: ${response.status} ${errorText}`) as Error & CloudStorageError;
    unknownError.type = 'unknown';
    throw unknownError;
  }

  return response;
}

export async function findBackupFile(): Promise<GoogleDriveBackupFile | null> {
  try {
    const response = await makeDriveRequest(
      `/files?q=${encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false and 'appDataFolder' in parents`)}&spaces=appDataFolder&fields=files(id,name,modifiedTime,size)`,
    );

    const data = (await response.json()) as {
      files: { id: string; name: string; modifiedTime: string; size: string }[];
    };

    if (data.files.length > 0) {
      const file = data.files[0];
      return {
        id: file.id,
        name: file.name,
        modifiedTime: file.modifiedTime,
        size: Number(file.size),
      };
    }

    return null;
  } catch (error) {
    if ((error as CloudStorageError).type) {
      throw error;
    }
    const networkError = new Error('Failed to search for backup file') as Error & CloudStorageError;
    networkError.type = 'network';
    throw networkError;
  }
}

export async function uploadBackup(zipBlob: Blob): Promise<void> {
  try {
    // Check if backup file already exists
    const existingFile = await findBackupFile();

    ensureAuthenticated();

    if (existingFile) {
      // Update existing file using media upload endpoint
      const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': BACKUP_MIME_TYPE,
          },
          body: zipBlob,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update backup: ${errorText}`);
      }
    } else {
      // Create new file in appDataFolder
      const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: BACKUP_MIME_TYPE,
        parents: ['appDataFolder'],
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', zipBlob);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload backup: ${errorText}`);
      }
    }
  } catch (error) {
    if ((error as CloudStorageError).type) {
      throw error;
    }
    const networkError = new Error('Failed to upload backup') as Error & CloudStorageError;
    networkError.type = 'network';
    throw networkError;
  }
}

export async function downloadBackup(): Promise<Blob> {
  try {
    const backupFile = await findBackupFile();

    if (!backupFile) {
      const notFoundError = new Error('No backup found in cloud') as Error & CloudStorageError;
      notFoundError.type = 'not_found';
      throw notFoundError;
    }

    const response = await makeDriveRequest(`/files/${backupFile.id}?alt=media`);

    if (!response.ok) {
      throw new Error('Failed to download backup');
    }

    return await response.blob();
  } catch (error) {
    if ((error as CloudStorageError).type) {
      throw error;
    }
    const networkError = new Error('Failed to download backup') as Error & CloudStorageError;
    networkError.type = 'network';
    throw networkError;
  }
}

export async function deleteBackupFile(fileId: string): Promise<void> {
  try {
    const response = await makeDriveRequest(`/files/${fileId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete backup file');
    }
  } catch (error) {
    if ((error as CloudStorageError).type) {
      throw error;
    }
    const networkError = new Error('Failed to delete backup file') as Error & CloudStorageError;
    networkError.type = 'network';
    throw networkError;
  }
}

// Helper to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

// Helper to format date
export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString();
  } catch {
    return isoString;
  }
}

// Get current database stats for confirmation dialog
export async function getCurrentDbStats(): Promise<{
  collectionsCount: number;
  minisCount: number;
  imagesCount: number;
}> {
  const [collections, minis, images] = await Promise.all([listCollections(), listMinis(), listAllImages()]);

  return {
    collectionsCount: collections.length,
    minisCount: minis.length,
    imagesCount: images.length,
  };
}
