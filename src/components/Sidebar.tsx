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
  Check,
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
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { timeAgo } from '@/lib/timeAgo';
import { cn } from '@/lib/utils';
import { loadImagesBySession } from '@/services/db';
import { downloadCollection } from '@/services/download';
import { useAppStore } from '@/store';
import type { Collection, SessionMeta } from '@/store/types';

interface MiniatureItemProps {
  session: SessionMeta;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function MiniatureItem({ session, isActive, onSelect, onDelete }: MiniatureItemProps): React.ReactElement {
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: session.id,
    data: { session },
  });

  const handleDeleteClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete(session.id);
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
      onClick={() => onSelect(session.id)}
    >
      {/* Thumbnail - Drag handle */}
      <div
        className="flex h-12 w-12 flex-shrink-0 cursor-grab items-center justify-center overflow-hidden rounded bg-muted active:cursor-grabbing"
        {...listeners}
        {...attributes}
        title="Drag to move"
      >
        {session.frontalThumbDataUrl ? (
          <img src={session.frontalThumbDataUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-muted-foreground">?</span>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="truncate text-sm font-medium">{session.name}</span>
        <span className="text-xs text-muted-foreground">Created {timeAgo(session.createdAt)}</span>
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
  collection: Collection;
  sessions: SessionMeta[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameCollection: (id: string, name: string) => void;
  onDeleteCollection: (id: string) => void;
  onAddMiniature: (collectionId: string) => void;
  onDownloadCollection: (collectionId: string) => void;
}

function CollectionGroup({
  collection,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameCollection,
  onDeleteCollection,
  onAddMiniature,
  onDownloadCollection,
}: CollectionGroupProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(collection.name);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: collection.id,
    data: { collection },
  });

  const handleStartEdit = (e: React.MouseEvent): void => {
    e.stopPropagation();
    setEditName(collection.name);
    setIsEditing(true);
  };

  const handleConfirmEdit = (): void => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== collection.name) {
      onRenameCollection(collection.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = (): void => {
    setIsEditing(false);
    setEditName(collection.name);
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
          {isEditing ? (
            <div className="flex flex-1 items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="h-6 px-1 text-xs"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleConfirmEdit}>
                <Check className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleCancelEdit}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <span className="flex-1 truncate text-sm font-semibold">{collection.name}</span>
          )}
        </div>

        {!isEditing && (
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleStartEdit} title="Rename">
              <Pencil className="h-3 w-3" />
            </Button>
            {confirmDelete ? (
              <Button
                size="icon"
                variant="destructive"
                className="h-6 w-6"
                onClick={handleDeleteClick}
                title={
                  sessions.length > 0
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
                className={cn('h-6 w-6', sessions.length > 0 && 'opacity-50')}
                onClick={handleDeleteClick}
                disabled={sessions.length > 0}
                title={
                  sessions.length > 0
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
        )}
      </div>

      {/* Miniatures List */}
      {isExpanded && (
        <div className="p-2">
          {sessions.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">No miniatures in this collection</p>
          ) : (
            <div className="flex flex-col gap-1">
              {sessions.map((session) => (
                <MiniatureItem
                  key={session.id}
                  session={session}
                  isActive={session.id === currentSessionId}
                  onSelect={onSelectSession}
                  onDelete={onDeleteSession}
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
          {sessions.length > 0 && (
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
  const sessions = useAppStore((s) => s.sessions);
  const currentSessionId = useAppStore((s) => s.currentSessionId);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const loadSession = useAppStore((s) => s.loadSession);
  const deleteSessionById = useAppStore((s) => s.deleteSessionById);
  const renameCollection = useAppStore((s) => s.renameCollection);
  const deleteCollection = useAppStore((s) => s.deleteCollection);
  const createCollection = useAppStore((s) => s.createCollection);
  const createNewMiniature = useAppStore((s) => s.createNewMiniature);
  const moveSessionToCollection = useAppStore((s) => s.moveSessionToCollection);

  const isApiKeySet = Boolean(apiKey);
  const [activeDragSession, setActiveDragSession] = React.useState<SessionMeta | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleSelect = (id: string): void => {
    if (id !== currentSessionId) {
      void loadSession(id);
    }
  };

  const handleDragStart = (event: DragStartEvent): void => {
    const session = event.active.data.current?.session as SessionMeta;
    if (session) {
      setActiveDragSession(session);
    }
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    setActiveDragSession(null);

    if (!over) return;

    const sessionId = active.id as string;
    const targetCollectionId = over.id as string;

    const session = sessions.find((s) => s.id === sessionId);
    if (session && session.collectionId !== targetCollectionId) {
      void moveSessionToCollection(sessionId, targetCollectionId);
    }
  };

  const handleDownloadCollection = async (collectionId: string): Promise<void> => {
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const collectionSessions = sessionsByCollection.get(collectionId) ?? [];
    if (collectionSessions.length === 0) return;

    // Load images for each session
    const sessionsWithImages = await Promise.all(
      collectionSessions.map(async (session) => {
        const imageRecords = await loadImagesBySession(session.id);
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
          ...session,
          images,
        };
      }),
    );

    await downloadCollection(collection.name, sessionsWithImages);
  };

  const handleDeleteCollection = (id: string): void => {
    void deleteCollection(id);
  };

  // Group sessions by collection
  const sessionsByCollection = React.useMemo(() => {
    const grouped = new Map<string, SessionMeta[]>();
    collections.forEach((c) => grouped.set(c.id, []));
    sessions.forEach((s) => {
      const list = grouped.get(s.collectionId) ?? [];
      list.push(s);
      grouped.set(s.collectionId, list);
    });
    return grouped;
  }, [collections, sessions]);

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
            onClick={() => void createCollection('New Collection')}
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
                  sessions={sessionsByCollection.get(collection.id) ?? []}
                  currentSessionId={currentSessionId}
                  onSelectSession={handleSelect}
                  onDeleteSession={(id) => void deleteSessionById(id)}
                  onRenameCollection={(id, name) => void renameCollection(id, name)}
                  onDeleteCollection={handleDeleteCollection}
                  onAddMiniature={(id) => createNewMiniature(id)}
                  onDownloadCollection={(collectionId) => void handleDownloadCollection(collectionId)}
                />
              ))}
            </div>
          )}

          <DragOverlay>
            {activeDragSession ? (
              <div className="rounded-md border bg-background p-2 opacity-80 shadow-lg">
                <span className="text-sm font-medium">{activeDragSession.name}</span>
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
    </div>
  );
}

export { Sidebar };
