import * as React from 'react';

import { Cloud, Download, Key, RotateCcw, Upload, User, X } from 'lucide-react';

import { RestoreConfirmDialog } from '@/components/RestoreConfirmDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { timeAgo } from '@/lib/timeAgo';
import { createBackup, downloadBackup } from '@/services/backup';
import { findBackupFile, getCurrentUser, initAuthFromStorage } from '@/services/cloudStorage';
import {
  type CloudBackupInfo,
  connectCloudStorage,
  disconnectCloudStorage,
  getCloudBackupInfo,
  initializeCloudStorage,
  isCloudStorageConnected,
  pullFromCloud,
  pushToCloud,
} from '@/services/cloudSync';
import { type RestorePreview, loadBackupPreview, restoreFromBackup } from '@/services/restore';
import { useAppStore } from '@/store';

const GOOGLE_CLIENT_ID =
  // (import.meta.env as { readonly VITE_GOOGLE_CLIENT_ID?: string }).VITE_GOOGLE_CLIENT_ID ??
  '232524148493-94qf0eqrrqkfleqnqj4hndcfhvr3uk92.apps.googleusercontent.com';

interface SettingsDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

function SettingsDialog({ open, onClose }: SettingsDialogProps): React.ReactElement {
  const apiKey = useAppStore((s) => s.apiKey);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const cloudStorage = useAppStore((s) => s.cloudStorage);
  const setCloudAuth = useAppStore((s) => s.setCloudAuth);
  const setCloudLastSync = useAppStore((s) => s.setCloudLastSync);
  const setCloudLoading = useAppStore((s) => s.setCloudLoading);
  const setCloudError = useAppStore((s) => s.setCloudError);
  const disconnectCloud = useAppStore((s) => s.disconnectCloud);

  const [inputValue, setInputValue] = React.useState('');
  const [error, setError] = React.useState('');
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);
  const [restorePreview, setRestorePreview] = React.useState<RestorePreview | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = React.useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Cloud storage state
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isPushing, setIsPushing] = React.useState(false);
  const [isPulling, setIsPulling] = React.useState(false);
  const [cloudBackupInfo, setCloudBackupInfo] = React.useState<CloudBackupInfo | null>(null);
  const [cloudPullDialogOpen, setCloudPullDialogOpen] = React.useState(false);

  const user = React.useMemo(() => getCurrentUser(), []);

  // Initialize Google Auth and restore session when app loads (not just when dialog opens)
  React.useEffect(() => {
    if (GOOGLE_CLIENT_ID) {
      initializeCloudStorage(GOOGLE_CLIENT_ID);

      // Try to restore auth from localStorage immediately
      const restoredFromStorage = initAuthFromStorage();
      if (restoredFromStorage) {
        setCloudAuth(true, null);
      }
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When dialog opens, check auth state and fetch backup info from Google Drive
  React.useEffect(() => {
    if (open) {
      const isConnected = isCloudStorageConnected();
      // If service says we're connected but store doesn't know, update store
      if (isConnected && !cloudStorage.isAuthenticated) {
        setCloudAuth(true, null);
      }

      // Fetch actual backup info from Google Drive to get up-to-date sync timestamp
      if (isConnected) {
        const fetchBackupInfo = async (): Promise<void> => {
          try {
            const backupFile = await findBackupFile();
            if (backupFile) {
              // Update lastSyncAt with the actual modified time from Google Drive
              setCloudLastSync(backupFile.modifiedTime);
            }
          } catch {
            // Silently fail - backup might not exist yet or token expired
            // User will see empty/"Never synced" state
          }
        };
        void fetchBackupInfo();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (open && apiKey) {
      setInputValue(apiKey);
    } else if (open && !apiKey) {
      setInputValue('');
    }
    setError('');
  }, [open, apiKey]);

  const handleSaveApiKey = (e: React.FormEvent): void => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setError('API key is required');
      return;
    }
    if (!trimmed.startsWith('AIza')) {
      setError('Invalid API key format');
      return;
    }
    setApiKey(trimmed);
    setError('');
  };

  const handleBackup = async (): Promise<void> => {
    setIsBackingUp(true);
    try {
      const backupData = await createBackup();
      await downloadBackup(backupData);
    } catch (err) {
      console.error('Backup failed:', err);
      setError('Backup failed. Please try again.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const preview = await loadBackupPreview(file);
      setSelectedBackupFile(file);
      setRestorePreview(preview);
      setRestoreDialogOpen(true);
    } catch (err) {
      console.error('Failed to load backup preview:', err);
      setError('Invalid backup file. Please select a valid backup ZIP.');
    } finally {
      setIsRestoring(false);
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRestoreConfirm = async (): Promise<void> => {
    if (!selectedBackupFile) return;

    setIsRestoring(true);
    setRestoreDialogOpen(false);

    try {
      await restoreFromBackup(selectedBackupFile);
      // Reload the page to refresh all state
      window.location.reload();
    } catch (err) {
      console.error('Restore failed:', err);
      setError('Restore failed. Please try again.');
      setIsRestoring(false);
      setSelectedBackupFile(null);
    }
  };

  const handleRestoreCancel = (): void => {
    setRestoreDialogOpen(false);
    setRestorePreview(null);
    setSelectedBackupFile(null);
  };

  // Cloud Storage Handlers
  const handleConnectCloud = async (): Promise<void> => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Client ID not configured');
      return;
    }

    setIsConnecting(true);
    setCloudLoading(true);
    setCloudError(null);

    try {
      const result = await connectCloudStorage();
      if (result.success) {
        setCloudAuth(true, null); // Email will be fetched by service
      } else {
        setCloudError(result.error ?? 'Failed to connect');
      }
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
      setCloudLoading(false);
    }
  };

  const handleDisconnectCloud = async (): Promise<void> => {
    setCloudLoading(true);
    try {
      await disconnectCloudStorage();
      disconnectCloud();
    } catch (err) {
      console.error('Disconnect failed:', err);
    } finally {
      setCloudLoading(false);
    }
  };

  const handlePushToCloud = async (): Promise<void> => {
    setIsPushing(true);
    setCloudLoading(true);
    setCloudError(null);

    try {
      const result = await pushToCloud();
      if (result.success) {
        if (result.timestamp) {
          setCloudLastSync(result.timestamp);
        }
      } else {
        setCloudError(result.error ?? 'Push failed');
      }
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Push failed');
    } finally {
      setIsPushing(false);
      setCloudLoading(false);
    }
  };

  const handlePullFromCloud = async (): Promise<void> => {
    setIsPulling(true);
    setCloudError(null);

    try {
      const info = await getCloudBackupInfo();
      if ('error' in info) {
        setCloudError(info.error);
      } else {
        setCloudBackupInfo(info);
        setCloudPullDialogOpen(true);
      }
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Failed to get backup info');
    } finally {
      setIsPulling(false);
    }
  };

  const handleCloudPullConfirm = async (): Promise<void> => {
    setCloudPullDialogOpen(false);
    setCloudLoading(true);

    try {
      const result = await pullFromCloud();
      if (result.success) {
        // Reload the page to refresh all state
        window.location.reload();
      } else {
        setCloudError(result.error ?? 'Pull failed');
        setCloudLoading(false);
      }
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Pull failed');
      setCloudLoading(false);
    }
  };

  const handleCloudPullCancel = (): void => {
    setCloudPullDialogOpen(false);
    setCloudBackupInfo(null);
  };

  // Format last sync time
  const getLastSyncText = (): string => {
    if (!cloudStorage.lastSyncAt) return 'Never synced';
    try {
      const date = new Date(cloudStorage.lastSyncAt);
      return timeAgo(date.getTime());
    } catch {
      return 'Unknown';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Manage your API key, backup, restore, and cloud storage.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* API Key Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Key className="h-4 w-4" />
                <h3>Google AI Studio API Key</h3>
              </div>
              <form onSubmit={handleSaveApiKey} className="space-y-3">
                <div>
                  <Input
                    type="password"
                    placeholder="AIza..."
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setError('');
                    }}
                  />
                  {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
                </div>
                <p className="text-xs text-muted-foreground">Your API key is stored locally in your browser.</p>
                <Button type="submit" className="w-full">
                  Save API Key
                </Button>
              </form>
            </div>

            <div className="border-t" />

            {/* Cloud Storage Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Cloud className="h-4 w-4" />
                <h3>Cloud Storage</h3>
              </div>

              {!cloudStorage.isAuthenticated ? (
                // Not Connected State
                <>
                  <p className="text-xs text-muted-foreground">
                    Backup and sync your data to Google Drive. Your data is stored in an app-specific folder and cannot
                    be accessed by other apps.
                  </p>
                  {!GOOGLE_CLIENT_ID && (
                    <p className="text-xs text-amber-600">Warning: Google Client ID not configured.</p>
                  )}
                  <Button
                    onClick={() => void handleConnectCloud()}
                    disabled={isConnecting || !GOOGLE_CLIENT_ID}
                    variant="outline"
                    className="w-full"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Google Drive'}
                  </Button>
                </>
              ) : (
                // Connected State
                <>
                  <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{cloudStorage.userEmail ?? user?.email ?? 'Connected'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Last synced: {getLastSyncText()}</div>
                    <Button
                      onClick={() => void handleDisconnectCloud()}
                      disabled={cloudStorage.isLoading}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Disconnect
                    </Button>
                  </div>

                  <div className="space-y-2 pt-2 flex flex-row gap-2">
                    <Button
                      onClick={() => void handlePushToCloud()}
                      disabled={isPushing || cloudStorage.isLoading}
                      variant="outline"
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isPushing ? 'Uploading...' : 'Push to Cloud'}
                    </Button>
                    <Button
                      onClick={() => void handlePullFromCloud()}
                      disabled={isPulling || cloudStorage.isLoading}
                      variant="outline"
                      className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isPulling ? 'Checking...' : 'Pull from Cloud'}
                    </Button>
                  </div>
                </>
              )}

              {cloudStorage.error && <p className="text-sm text-destructive">{cloudStorage.error}</p>}
            </div>

            <div className="border-t" />

            {/* Backup Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Download className="h-4 w-4" />
                <h3>Backup Database</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Download a complete backup of all your collections and miniatures.
              </p>
              <Button onClick={() => void handleBackup()} disabled={isBackingUp} variant="outline" className="w-full">
                {isBackingUp ? 'Creating Backup...' : 'Download Backup'}
              </Button>
            </div>

            {/* Restore Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <RotateCcw className="h-4 w-4" />
                <h3>Restore Database</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Restore from a previous backup. This will replace all current data.
              </p>
              <Button onClick={handleRestoreClick} disabled={isRestoring} variant="outline" className="w-full">
                {isRestoring ? 'Loading...' : 'Upload Backup File'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={(e) => void handleFileSelect(e)}
                className="hidden"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <RestoreConfirmDialog
        preview={restorePreview}
        open={restoreDialogOpen}
        onConfirm={() => void handleRestoreConfirm()}
        onCancel={handleRestoreCancel}
      />

      {/* Cloud Pull Confirmation Dialog */}
      {cloudBackupInfo && (
        <RestoreConfirmDialog
          preview={
            cloudBackupInfo.exists && cloudBackupInfo.file
              ? {
                  metadata: {
                    version: 4,
                    dbName: 'umc-db',
                    createdAt: cloudBackupInfo.file.modifiedTime,
                    collections: [],
                    minis: [],
                    stats: {
                      collectionsCount: cloudBackupInfo.currentStats.collectionsCount,
                      minisCount: cloudBackupInfo.currentStats.minisCount,
                      imagesCount: cloudBackupInfo.currentStats.imagesCount,
                    },
                  },
                  currentStats: cloudBackupInfo.currentStats,
                }
              : null
          }
          open={cloudPullDialogOpen}
          onConfirm={() => void handleCloudPullConfirm()}
          onCancel={handleCloudPullCancel}
        />
      )}
    </>
  );
}

export { SettingsDialog };
