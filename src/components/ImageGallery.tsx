import * as React from 'react';
import { cn } from '@/lib/utils';
import type { GeneratedImage } from '@/store/types';

interface ImageGalleryProps {
  images: GeneratedImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function ImageGallery({ images, selectedId, onSelect }: ImageGalleryProps): React.ReactElement | null {
  if (images.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto py-2">
      {images.map((img, index) => (
        <button
          key={img.id}
          type="button"
          onClick={() => onSelect(img.id)}
          className={cn(
            'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded border-2 transition-all',
            selectedId === img.id
              ? 'border-primary ring-2 ring-primary ring-offset-2'
              : 'border-muted hover:border-primary/50'
          )}
        >
          <img
            src={img.dataUrl}
            alt={`Generation ${index + 1}`}
            className="h-full w-full object-cover"
          />
          <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-center text-xs text-white">
            #{index + 1}
          </span>
        </button>
      ))}
    </div>
  );
}

export { ImageGallery };
