import * as React from 'react';

import { useDraggable } from '@dnd-kit/react';
import { CheckIcon, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/timeAgo';
import { cn } from '@/lib/utils';
import { MiniId } from '@/services/db';
import type { MiniatureMeta } from '@/store/types';

export interface MiniatureItemProps {
  readonly mini: MiniatureMeta;
  readonly isActive: boolean;
  onSelect: (id: MiniId) => void;
  onDelete: (id: MiniId) => void;
}

export function MiniatureItem({ mini, isActive, onSelect, onDelete }: MiniatureItemProps): React.ReactElement {
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const draggable = useDraggable({
    id: mini.id,
    data: { mini },
  });

  const handleDeleteClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete(mini.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const style = draggable.isDragging
    ? {
        transform: `translate3d(${draggable.draggable.alignment?.x}px, ${draggable.draggable.alignment?.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={draggable.ref}
      style={style}
      className={cn(
        'group flex cursor-pointer gap-2 rounded-md border p-2 transition-colors',
        isActive
          ? 'border-primary bg-primary/5'
          : 'border-transparent hover:border-muted-foreground/20 hover:bg-muted/50',
        draggable.isDragging && 'opacity-50',
      )}
      onClick={() => onSelect(mini.id)}
    >
      {/* Thumbnail - Drag handle */}
      <div
        className="flex h-12 w-12 flex-shrink-0 cursor-grab items-center justify-center overflow-hidden rounded bg-muted active:cursor-grabbing"
        title="Drag to move mini between collections"
      >
        {mini.frontalThumbDataUrl ? (
          <img src={mini.frontalThumbDataUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-muted-foreground">?</span>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="truncate text-sm font-medium">{mini.name}</span>
        <span className="text-xs text-muted-foreground">Created {timeAgo(mini.createdAt).toLowerCase()}</span>
        <span className="text-xs text-muted-foreground">Last updated {timeAgo(mini.updatedAt).toLowerCase()}</span>
      </div>

      {/* Delete action - always visible on mobile, hover on desktop */}
      <div className="flex flex-shrink-0 flex-col justify-center md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
        {confirmDelete ? (
          <Button size="icon" variant="destructive" className="h-8 w-8" onClick={handleDeleteClick} title="Confirm">
            <CheckIcon className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleDeleteClick} title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
