import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CollectionDialogProps {
  readonly mode: 'create' | 'edit';
  readonly initialName?: string;
  readonly initialDescription?: string;
  readonly initialStylePrompt?: string;
  readonly onSave: (name: string, description: string, stylePrompt: string) => void;
  readonly onCancel: () => void;
  readonly open: boolean;
}

function CollectionDialog({
  mode,
  initialName = '',
  initialDescription = '',
  initialStylePrompt = '',
  onSave,
  onCancel,
  open,
}: CollectionDialogProps): React.ReactElement {
  const [name, setName] = React.useState(initialName);
  const [description, setDescription] = React.useState(initialDescription);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [stylePrompt, setStylePrompt] = React.useState(initialStylePrompt);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setName(initialName || (mode === 'create' ? 'New Collection' : ''));
      setDescription(initialDescription || '');
      setNameError(null);
      setStylePrompt(initialStylePrompt || '');
    }
  }, [open, initialName, initialDescription, initialStylePrompt, mode]);

  const handleSave = (): void => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Collection name is required');
      return;
    }
    onSave(trimmedName, description.trim(), stylePrompt?.trim());
  };

  const handleCancel = (): void => {
    onCancel();
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Collection' : 'Edit Collection'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new collection to organize your miniatures.'
              : 'Update the collection name and description.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="Collection name"
              className={nameError ? 'border-red-500' : ''}
            />
            {nameError && <p className="text-xs text-red-500">{nameError}</p>}
          </div>
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Optional: Add visual details shared across all minis in this collection (e.g., art style, color palette, setting). These will be included in generation prompts."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Optional but encouraged: visual details here will guide image generation for all miniatures in this
              collection.
            </p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="stylePrompt" className="text-sm font-medium">
              Style override
            </label>
            <Textarea
              id="stylePrompt"
              value={stylePrompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStylePrompt(e.target.value)}
              placeholder="Optional: override the system style prompt (highly detailed vector illustration by default)."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Optional: prompt to replace system guidance for visual style.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{mode === 'create' ? 'Create' : 'Save'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { CollectionDialog };
export type { CollectionDialogProps };
