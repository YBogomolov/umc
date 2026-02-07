import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store';

interface ApiKeyDialogProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

function ApiKeyDialog({ forceOpen, onClose }: ApiKeyDialogProps): React.ReactElement | null {
  const apiKey = useAppStore((s) => s.apiKey);
  const setApiKey = useAppStore((s) => s.setApiKey);

  const isOpen = forceOpen ?? !apiKey;
  const canDismiss = Boolean(apiKey);

  const [inputValue, setInputValue] = React.useState('');
  const [error, setError] = React.useState('');

  // Pre-fill masked hint when opening to change existing key
  React.useEffect(() => {
    if (isOpen && apiKey) {
      setInputValue(apiKey);
    } else if (isOpen && !apiKey) {
      setInputValue('');
    }
    setError('');
  }, [isOpen, apiKey]);

  const handleSubmit = (e: React.FormEvent): void => {
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
    onClose?.();
  };

  const handleCancel = (): void => {
    onClose?.();
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{canDismiss ? 'Change API Key' : 'Welcome to Universal Miniature Creator'}</DialogTitle>
          <DialogDescription>
            {canDismiss
              ? 'Update your Google AI Studio API key below.'
              : 'Enter your Google AI Studio API key to get started. Your key is stored locally and never sent to any server except Google\u2019s API.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <Input
              type="password"
              placeholder="AIza..."
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError('');
              }}
              autoFocus
            />
            {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
          </div>
          <div className="flex gap-2">
            {canDismiss && (
              <Button type="button" variant="outline" className="flex-1" onClick={handleCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" className="flex-1">
              Save API Key
            </Button>
          </div>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          Get your API key from{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Google AI Studio
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}

export { ApiKeyDialog };
