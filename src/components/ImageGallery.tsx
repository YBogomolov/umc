import * as React from 'react';

import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { GeneratedImage } from '@/store/types';

interface ImageGalleryProps {
  images: readonly GeneratedImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}

function ImageGallery({ images, selectedId, onSelect, onDelete }: ImageGalleryProps): React.ReactElement | null {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  if (images.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-1 py-2">
      {images.map((img, index) => (
        <div
          key={img.id}
          className={cn(
            'group relative h-16 w-16 flex-shrink-0 overflow-hidden rounded border-2 transition-all',
            selectedId === img.id
              ? 'border-primary ring-2 ring-primary ring-offset-1'
              : 'border-muted hover:border-primary/50',
          )}
          onMouseEnter={() => setHoveredId(img.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <button type="button" onClick={() => onSelect(img.id)} className="h-full w-full">
            <img src={img.dataUrl} alt={`Generation ${index + 1}`} className="h-full w-full object-cover" />
          </button>
          <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-center text-xs text-white">
            #{index + 1}
          </span>
          {onDelete && hoveredId === img.id && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(img.id);
              }}
              className="absolute right-0.5 top-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-destructive text-[8px] text-white hover:bg-destructive/90"
              title="Remove image"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export { ImageGallery };
