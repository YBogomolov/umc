import * as React from 'react';

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { HelpCircle, Plus, Settings } from 'lucide-react';

import { CollectionDialog } from '@/components/CollectionDialog';
import { CollectionGroup } from '@/components/CollectionGroup';
import { SettingsDialog } from '@/components/SettingsDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CollectionId, MiniId, loadImagesByMini } from '@/services/db';
import { downloadCollection } from '@/services/download';
import { useAppStore } from '@/store';
import type { Collection, MiniatureMeta } from '@/store/types';

interface SidebarProps {
  onHelp: () => void;
  onSelectMini?: () => void;
}

function Sidebar({ onHelp, onSelectMini }: SidebarProps): React.ReactElement {
  const apiKey = useAppStore((s) => s.apiKey);
  const collections = useAppStore((s) => s.collections);
  const minis = useAppStore((s) => s.miniatures);
  const currentMiniId = useAppStore((s) => s.currentMiniId);
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
  const [settingsOpen, setSettingsOpen] = React.useState(false);

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
    onSelectMini?.();
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

  return (
    <div className="flex h-full w-72 flex-shrink-0 flex-col border-r bg-muted/20">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">Collections</span>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setDialogState({ mode: 'create' })}
            title="New collection"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Collections list */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
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
      <div className="shrink-0 border-t px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-full justify-start gap-2 text-muted-foreground"
          onClick={onHelp}
        >
          <HelpCircle className="h-4 w-4" />
          Help
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-10 w-full justify-start gap-2 text-muted-foreground',
            !isApiKeySet && 'font-semibold text-destructive',
          )}
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="h-4 w-4" />
          Settings
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

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export { Sidebar };
