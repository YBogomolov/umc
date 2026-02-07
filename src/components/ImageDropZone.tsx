import * as React from 'react';

import { AlertCircle, Image, Upload } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ImageDropZoneProps {
  onUpload: (file: File) => void;
  accept?: string;
  maxSize?: number; // in bytes
}

function ImageDropZone({
  onUpload,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB default
}: ImageDropZoneProps): React.ReactElement {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Please upload a valid image file (JPG, PNG, WebP)';
    }
    if (file.size > maxSize) {
      return `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`;
    }
    return null;
  };

  const handleFile = (file: File): void => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setTimeout(() => setError(null), 3000);
      return;
    }
    setError(null);
    onUpload(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 transition-all',
        isDragOver
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/30',
      )}
    >
      <input ref={fileInputRef} type="file" accept={accept} onChange={handleFileInputChange} className="hidden" />

      {error ? (
        <>
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-center text-sm text-destructive">{error}</p>
        </>
      ) : (
        <>
          <div className="flex gap-4">
            <Upload
              className={cn('h-10 w-10 transition-colors', isDragOver ? 'text-primary' : 'text-muted-foreground')}
            />
            <Image
              className={cn('h-10 w-10 transition-colors', isDragOver ? 'text-primary' : 'text-muted-foreground')}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Drop an image here or click to upload</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports JPG, PNG, WebP (max {Math.round(maxSize / 1024 / 1024)}MB)
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export { ImageDropZone };
