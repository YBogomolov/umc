import * as React from 'react';

import { Download, Key, RotateCcw } from 'lucide-react';

import { RestoreConfirmDialog } from '@/components/RestoreConfirmDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createBackup, downloadBackup } from '@/services/backup';
import { type RestorePreview, loadBackupPreview, restoreFromBackup } from '@/services/restore';
import { useAppStore } from '@/store';

interface SettingsDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

function SettingsDialog({ open, onClose }: SettingsDialogProps): React.ReactElement {
  const apiKey = useAppStore((s) => s.apiKey);
  const setApiKey = useAppStore((s) => s.setApiKey);

  const [inputValue, setInputValue] = React.useState('');
  const [error, setError] = React.useState('');
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);
  const [restorePreview, setRestorePreview] = React.useState<RestorePreview | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = React.useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Manage your API key, backup, and restore your database.</DialogDescription>
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
    </>
  );
}

export { SettingsDialog };
