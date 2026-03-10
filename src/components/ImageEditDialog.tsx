import * as React from 'react';

import { Plus, Send, X } from 'lucide-react';

import { GeminiIcon } from '@/components/GeminiIcon';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { dataUrlToBase64, editImage, generateImageId } from '@/services/gemini';
import type { GeminiModel, GeneratedImage } from '@/store/types';
import { GEMINI_MODELS } from '@/store/types';

interface ImageEditDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly originalImage: GeneratedImage;
  readonly onEditComplete: (newImage: GeneratedImage) => void;
  readonly apiKey: string;
}

function ImageEditDialog({
  open,
  onOpenChange,
  originalImage,
  onEditComplete,
  apiKey,
}: ImageEditDialogProps): React.ReactElement {
  const [prompt, setPrompt] = React.useState('');
  const [attachments, setAttachments] = React.useState<
    Array<{ id: string; fileName: string; dataUrl: string; mimeType: string }>
  >([]);
  const [model, setModel] = React.useState<GeminiModel>('gemini-2.5-flash-image');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState('');
  const attachmentInputRef = React.useRef<HTMLInputElement>(null);

  const handleAttachmentClick = (): void => {
    attachmentInputRef.current?.click();
  };

  const handleAttachmentAdd = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setError(`Invalid file type: ${file.name}. Only images are allowed.`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError(`File too large: ${file.name}. Maximum size is 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const { mimeType } = dataUrlToBase64(dataUrl);
          const newAttachment = {
            id: generateImageId(),
            fileName: file.name,
            dataUrl,
            mimeType,
          };
          setAttachments((prev) => [...prev, newAttachment]);
        }
      };
      reader.onerror = () => {
        setError(`Failed to read file: ${file.name}`);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleAttachmentRemove = (id: string): void => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = async (): Promise<void> => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setError('');
    setIsGenerating(true);

    try {
      const parts: Array<{ inlineData: { mimeType: string; data: string } }> = [];

      // Add original image as the first reference
      const { mimeType: originalMimeType, data: originalData } = dataUrlToBase64(originalImage.dataUrl);
      parts.push({ inlineData: { mimeType: originalMimeType, data: originalData } });

      // Add user attachments
      for (const attachment of attachments) {
        const { mimeType, data } = dataUrlToBase64(attachment.dataUrl);
        parts.push({ inlineData: { mimeType, data } });
      }

      const result = await editImage({
        apiKey,
        userPrompt: prompt.trim(),
        model,
        imageParts: parts,
      });

      if (result.success && result.dataUrl) {
        const newImage: GeneratedImage = {
          id: generateImageId(),
          dataUrl: result.dataUrl,
          prompt: prompt.trim(),
          timestamp: Date.now(),
        };
        onEditComplete(newImage);
        onOpenChange(false);
      } else {
        setError(result.error ?? 'Generation failed');
        setIsGenerating(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsGenerating(false);
    }
  };

  const handleCancel = (): void => {
    setPrompt('');
    setAttachments([]);
    setError('');
    onOpenChange(false);
  };

  return (
    <>
      <input
        ref={attachmentInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAttachmentAdd}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
            <DialogDescription>
              Describe what changes you want to make to the image. You can also attach additional reference images.
            </DialogDescription>
          </DialogHeader>

          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <GeminiIcon className="h-16 w-16 gemini-pulsing md:h-24 md:w-24" />
              <p className="mt-4 text-sm text-muted-foreground animate-pulse">Editing image...</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 py-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <img
                      src={originalImage.dataUrl}
                      alt="Original"
                      className="max-h-32 rounded border object-contain"
                    />
                  </div>
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="relative">
                      <img
                        src={attachment.dataUrl}
                        alt={attachment.fileName}
                        className="max-h-32 rounded border object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => handleAttachmentRemove(attachment.id)}
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAttachmentClick}
                    title="Attach reference image"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Select value={model} onValueChange={(m) => setModel(m as GeminiModel)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {GEMINI_MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <Textarea
                  placeholder="Describe the changes you want to make..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  disabled={isGenerating}
                />

                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancel} disabled={isGenerating}>
                  Cancel
                </Button>
                <Button onClick={() => void handleSend()} disabled={isGenerating || !prompt.trim()}>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export { ImageEditDialog };
export type { ImageEditDialogProps };
