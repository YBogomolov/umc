import * as React from 'react';

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  CheckIcon,
  ChevronDown,
  ChevronRight,
  Download,
  PanelLeft,
  PanelLeftClose,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';

import { CollectionDialog } from '@/components/CollectionDialog';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/timeAgo';
import { cn } from '@/lib/utils';
import { CollectionId, MiniId, loadImagesByMini } from '@/services/db';
import { downloadCollection } from '@/services/download';
import { useAppStore } from '@/store';
import type { Collection, MiniatureMeta } from '@/store/types';

interface MiniatureItemProps {
  readonly mini: MiniatureMeta;
  readonly isActive: boolean;
  onSelect: (id: MiniId) => void;
  onDelete: (id: MiniId) => void;
}

function MiniatureItem({ mini, isActive, onSelect, onDelete }: MiniatureItemProps): React.ReactElement {
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
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

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex cursor-pointer gap-2 rounded-md border p-2 transition-colors',
        isActive
          ? 'border-primary bg-primary/5'
          : 'border-transparent hover:border-muted-foreground/20 hover:bg-muted/50',
        isDragging && 'opacity-50',
      )}
      onClick={() => onSelect(mini.id)}
    >
      {/* Thumbnail - Drag handle */}
      <div
        className="flex h-12 w-12 flex-shrink-0 cursor-grab items-center justify-center overflow-hidden rounded bg-muted active:cursor-grabbing"
        {...listeners}
        {...attributes}
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
        <span className="text-xs text-muted-foreground">Created {timeAgo(mini.createdAt)}</span>
      </div>

      {/* Delete action */}
      <div className="flex flex-shrink-0 flex-col justify-center opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          className={cn('h-5 w-5', confirmDelete && 'text-destructive')}
          onClick={handleDeleteClick}
          title={confirmDelete ? 'Click again to confirm' : 'Delete'}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

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

function CollectionGroup({
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
          <span className="flex-1 truncate text-sm font-semibold">{collection.name}</span>
        </div>

        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleEditClick} title="Edit">
            <Pencil className="h-3 w-3" />
          </Button>
          {confirmDelete ? (
            <Button
              size="icon"
              variant="destructive"
              className="h-6 w-6"
              onClick={handleDeleteClick}
              title={
                minis.length > 0
                  ? 'Cannot delete: collection not empty'
                  : confirmDelete
                    ? 'Click again to confirm'
                    : 'Delete'
              }
            >
              <CheckIcon className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className={cn('h-6 w-6', minis.length > 0 && 'opacity-50')}
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
              <Trash2 className="h-3 w-3" />
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

interface SidebarProps {
  onChangeApiKey: () => void;
}

function Sidebar({ onChangeApiKey }: SidebarProps): React.ReactElement {
  const apiKey = useAppStore((s) => s.apiKey);
  const collections = useAppStore((s) => s.collections);
  const minis = useAppStore((s) => s.miniatures);
  const currentMiniId = useAppStore((s) => s.currentMiniId);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const loadMini = useAppStore((s) => s.loadMini);
  const deleteMiniById = useAppStore((s) => s.deleteMiniById);
  const updateCollection = useAppStore((s) => s.updateCollection);
  const deleteCollection = useAppStore((s) => s.deleteCollection);
  const createCollection = useAppStore((s) => s.createCollection);
  const createNewMiniature = useAppStore((s) => s.createNewMiniature);
  const moveMiniToCollection = useAppStore((s) => s.moveMiniToCollection);

  const isApiKeySet = Boolean(apiKey);
  const [activeDragMini, setActiveDragMini] = React.useState<MiniatureMeta | null>(null);
  const [dialogState, setDialogState] = React.useState<
    { mode: 'create' } | { mode: 'edit'; collectionId: CollectionId; name: string; description: string } | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleSelect = (id: MiniId): void => {
    if (id !== currentMiniId) {
      void loadMini(id);
    }
  };

  const handleDragStart = (event: DragStartEvent): void => {
    const mini = event.active.data.current?.mini as MiniatureMeta;
    if (mini) {
      setActiveDragMini(mini);
    }
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    setActiveDragMini(null);

    if (!over) return;

    const miniId = active.id as MiniId;
    const targetCollectionId = over.id as CollectionId;

    const mini = minis.find((s) => s.id === miniId);
    if (mini && mini.collectionId !== targetCollectionId) {
      void moveMiniToCollection(miniId, targetCollectionId);
    }
  };

  const handleDownloadCollection = async (collectionId: CollectionId): Promise<void> => {
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const collectionMinis = minisByCollection.get(collectionId) ?? [];
    if (collectionMinis.length === 0) return;

    // Load images for each mini
    const minisWithImages = await Promise.all(
      collectionMinis.map(async (mini) => {
        const imageRecords = await loadImagesByMini(mini.id);
        const images: { frontal: string[]; back: string[]; base: string[] } = {
          frontal: [],
          back: [],
          base: [],
        };

        for (const record of imageRecords) {
          const blob = record.blob;
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          images[record.tab].push(dataUrl);
        }

        return {
          ...mini,
          images,
        };
      }),
    );

    await downloadCollection(collection.name, minisWithImages);
  };

  const handleDeleteCollection = (id: CollectionId): void => {
    void deleteCollection(id);
  };

  const handleCreateCollection = (name: string, description: string): void => {
    void createCollection(name, description);
    setDialogState(null);
  };

  const handleUpdateCollection = (name: string, description: string): void => {
    if (dialogState?.mode === 'edit') {
      void updateCollection(dialogState.collectionId, { name, description });
    }
    setDialogState(null);
  };

  const handleEditCollection = (collection: Collection): void => {
    setDialogState({
      mode: 'edit',
      collectionId: collection.id,
      name: collection.name,
      description: collection.description,
    });
  };

  // Group minis by collection
  const minisByCollection = React.useMemo(() => {
    const grouped = new Map<string, MiniatureMeta[]>();
    collections.forEach((c) => grouped.set(c.id, []));
    minis.forEach((s) => {
      const list = grouped.get(s.collectionId) ?? [];
      list.push(s);
      grouped.set(s.collectionId, list);
    });
    return grouped;
  }, [collections, minis]);

  if (!sidebarOpen) {
    return (
      <div className="flex flex-shrink-0 flex-col border-r bg-muted/20 p-2">
        <Button size="icon" variant="ghost" onClick={toggleSidebar} title="Open sidebar">
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-72 flex-shrink-0 flex-col border-r bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">Collections</span>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setDialogState({ mode: 'create' })}
            title="New collection"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={toggleSidebar} title="Close sidebar">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Collections list */}
      <div className="flex-1 overflow-y-auto p-2">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {collections.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No collections yet. Create one to get started.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {collections.map((collection) => (
                <CollectionGroup
                  key={collection.id}
                  collection={collection}
                  minis={minisByCollection.get(collection.id) ?? []}
                  currentMiniId={currentMiniId}
                  onSelectMini={handleSelect}
                  onDeleteMini={(id: MiniId) => void deleteMiniById(id)}
                  onEditCollection={handleEditCollection}
                  onDeleteCollection={handleDeleteCollection}
                  onAddMiniature={(id: CollectionId) => createNewMiniature(id)}
                  onDownloadCollection={(collectionId: CollectionId) => void handleDownloadCollection(collectionId)}
                />
              ))}
            </div>
          )}

          <DragOverlay>
            {activeDragMini ? (
              <div className="rounded-md border bg-background p-2 opacity-80 shadow-lg">
                <span className="text-sm font-medium">{activeDragMini.name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-start gap-2 text-muted-foreground',
            !isApiKeySet && 'font-semibold text-destructive',
          )}
          onClick={onChangeApiKey}
        >
          <Settings className="h-4 w-4" />
          Change API Key
        </Button>
      </div>

      {/* Collection Dialog */}
      <CollectionDialog
        mode={dialogState?.mode ?? 'create'}
        open={dialogState !== null}
        initialName={dialogState?.mode === 'edit' ? dialogState.name : ''}
        initialDescription={dialogState?.mode === 'edit' ? dialogState.description : ''}
        onSave={dialogState?.mode === 'edit' ? handleUpdateCollection : handleCreateCollection}
        onCancel={() => setDialogState(null)}
      />
    </div>
  );
}

export { Sidebar };
