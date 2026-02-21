import * as React from 'react';

import { useDroppable } from '@dnd-kit/core';
import { CheckIcon, ChevronDown, ChevronRight, Download, Pencil, Plus, Trash2 } from 'lucide-react';

import { MiniatureItem } from '@/components/MiniatureItem';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CollectionId, MiniId } from '@/services/db';
import type { Collection, MiniatureMeta } from '@/store/types';

interface CollectionGroupProps {
  readonly collection: Collection;
  readonly minis: MiniatureMeta[];
  readonly currentMiniId: MiniId | null;
  onSelectMini: (id: MiniId) => void;
  onDeleteMini: (id: MiniId) => void;
  onEditCollection: (collection: Collection) => void;
  onDeleteCollection: (id: CollectionId) => void;
  onAddMiniature: (collectionId: CollectionId) => void;
  onDownloadCollection: (collectionId: CollectionId) => void;
}

export function CollectionGroup({
  collection,
  minis,
  currentMiniId,
  onSelectMini,
  onDeleteMini,
  onEditCollection,
  onDeleteCollection,
  onAddMiniature,
  onDownloadCollection,
}: CollectionGroupProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: collection.id,
    data: { collection },
  });

  const handleEditClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onEditCollection(collection);
  };

  const handleDeleteClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (confirmDelete) {
      onDeleteCollection(collection.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 5000);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn('rounded-lg border transition-colors', isOver && 'border-primary bg-primary/5')}
    >
      {/* Collection Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex flex-1 cursor-pointer items-center gap-2" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="flex-1 max-w-[230px] truncate text-sm font-semibold" title={collection.name}>
            {collection.name}
          </span>
        </div>

        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleEditClick} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          {confirmDelete ? (
            <Button
              size="icon"
              variant="destructive"
              className="h-8 w-8"
              onClick={handleDeleteClick}
              title={
                minis.length > 0
                  ? 'Cannot delete: collection not empty'
                  : confirmDelete
                    ? 'Click again to confirm'
                    : 'Delete'
              }
            >
              <CheckIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className={cn('h-8 w-8', minis.length > 0 && 'opacity-50')}
              onClick={handleDeleteClick}
              disabled={minis.length > 0}
              title={
                minis.length > 0
                  ? 'Cannot delete: collection not empty'
                  : confirmDelete
                    ? 'Click again to confirm'
                    : 'Delete'
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Miniatures List */}
      {isExpanded && (
        <div className="p-2">
          {minis.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">No miniatures in this collection</p>
          ) : (
            <div className="flex flex-col gap-1">
              {minis.map((mini) => (
                <MiniatureItem
                  key={mini.id}
                  mini={mini}
                  isActive={mini.id === currentMiniId}
                  onSelect={onSelectMini}
                  onDelete={onDeleteMini}
                />
              ))}
            </div>
          )}

          {/* Add miniature button */}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start gap-2 text-muted-foreground"
            onClick={() => onAddMiniature(collection.id)}
          >
            <Plus className="h-4 w-4" />
            Add miniature
          </Button>

          {/* Download collection button */}
          {minis.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 w-full justify-start gap-2 text-muted-foreground"
              onClick={() => onDownloadCollection(collection.id)}
            >
              <Download className="h-4 w-4" />
              Download collection
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
