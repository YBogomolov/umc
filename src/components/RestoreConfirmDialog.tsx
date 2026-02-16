import * as React from 'react';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { RestorePreview } from '@/services/restore';

interface RestoreConfirmDialogProps {
  readonly preview: RestorePreview | null;
  readonly open: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

function RestoreConfirmDialog({ preview, open, onConfirm, onCancel }: RestoreConfirmDialogProps): React.ReactElement {
  if (!preview) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Database</DialogTitle>
          </DialogHeader>
          <p>Loading preview...</p>
        </DialogContent>
      </Dialog>
    );
  }

  const { metadata, currentStats } = preview;

  const stats = [
    { label: 'Collections', current: currentStats.collectionsCount, backup: metadata.stats.collectionsCount },
    { label: 'Minis', current: currentStats.minisCount, backup: metadata.stats.minisCount },
    { label: 'Images', current: currentStats.imagesCount, backup: metadata.stats.imagesCount },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Restore Database</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            This action will replace all current data with the backup. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Current Database</h4>
            <div className="rounded-md bg-muted p-3 text-sm">
              <p>Collections: {currentStats.collectionsCount}</p>
              <p>Minis: {currentStats.minisCount}</p>
              <p>Images: {currentStats.imagesCount}</p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Backup File</h4>
            <div className="rounded-md bg-muted p-3 text-sm">
              <p>Created: {new Date(metadata.createdAt).toLocaleString()}</p>
              <p>Database: {metadata.dbName}</p>
              <p>Version: {metadata.version}</p>
            </div>
          </div>

          <div className="rounded-md border">
            <div className="grid grid-cols-3 gap-4 border-b bg-muted/50 p-2 text-sm font-medium">
              <div>Metric</div>
              <div className="text-right">Current</div>
              <div className="text-right">Backup</div>
            </div>
            {stats.map((stat) => (
              <div key={stat.label} className="grid grid-cols-3 gap-4 border-b p-2 text-sm last:border-0">
                <div>{stat.label}</div>
                <div className="text-right">{stat.current}</div>
                <div className="text-right">{stat.backup}</div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Restore - I understand this will delete current data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { RestoreConfirmDialog };
