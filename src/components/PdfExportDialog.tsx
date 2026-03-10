import * as React from 'react';

import { ChevronLeft, FileDown, Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DEFAULT_MINI_HEIGHT_MM } from '@/lib/constants';
import { CollectionId, type ImageId, MiniId, generateId, listCollectionsWithImages } from '@/services/db';
import { downloadPdf } from '@/services/pdfExport';
import { useAppStore } from '@/store';
import type { Collection, GeneratedImage } from '@/store/types';
import { DEFAULT_EXPORT_CONFIG, ExportConfig } from '@/workers/types';

interface PdfExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CollectionWithMinis {
  readonly collection: Collection;
  readonly minis: CollectionMini[];
}

interface CollectionMini {
  readonly id: MiniId;
  readonly name: string;
  readonly frontImage: GeneratedImage | null;
  readonly backImage: GeneratedImage | null;
}

interface ExportMiniConfig {
  readonly id: MiniId;
  readonly name: string;
  readonly included: boolean;
  readonly miniHeightMm: number;
  readonly frontDataUrl: string;
  readonly backDataUrl: string;
  readonly thumbnailUrl: string | null;
}

type WizardStep = 'collections' | 'minis';

const CollectionCard: React.FC<{
  readonly collection: CollectionWithMinis;
  readonly isSelected: boolean;
  readonly onToggle: () => void;
}> = ({ collection, isSelected, onToggle }) => {
  const handleToggle = (e: React.MouseEvent | React.ChangeEvent): void => {
    e.stopPropagation();
    e.preventDefault();
    onToggle();
  };
  return (
    <div
      className={`relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
      onClick={handleToggle}
    >
      <div className="absolute right-2 top-2 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleToggle}
          className="h-5 w-5 rounded border-gray-300"
        />
      </div>

      <div className="p-4">
        <h3 className="font-medium">{collection.collection.name}</h3>
        {collection.collection.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{collection.collection.description}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {collection.minis.length} mini{collection.minis.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};

const MiniConfigCard: React.FC<{
  readonly mini: ExportMiniConfig;
  readonly onToggleInclude: () => void;
  readonly onHeightChange: (height: number) => void;
}> = ({ mini, onToggleInclude, onHeightChange }) => {
  return (
    <div className="flex items-center gap-4 rounded-lg border p-3">
      <input
        type="checkbox"
        checked={mini.included}
        onChange={onToggleInclude}
        className="h-5 w-5 rounded border-gray-300"
      />
      {mini.thumbnailUrl && <img src={mini.thumbnailUrl} alt={mini.name} className="h-12 w-12 rounded object-cover" />}
      <span className="flex-1 font-medium">{mini.name}</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={16}
          max={55}
          value={mini.miniHeightMm}
          onChange={(e) => onHeightChange(Number(e.target.value))}
          className="w-24"
          disabled={!mini.included}
        />
        <Input
          type="number"
          min={16}
          max={55}
          value={mini.miniHeightMm}
          onChange={(e) => onHeightChange(Number(e.target.value))}
          className="w-16"
          disabled={!mini.included}
        />
        <span className="text-sm text-muted-foreground">mm</span>
      </div>
    </div>
  );
};

function PdfExportDialog({ isOpen, onClose }: PdfExportDialogProps): React.ReactElement {
  const collections = useAppStore((s) => s.collections);
  const miniatures = useAppStore((s) => s.miniatures);

  const [step, setStep] = React.useState<WizardStep>('collections');
  const [selectedCollections, setSelectedCollections] = React.useState<Set<CollectionId>>(new Set());
  const [isExporting, setIsExporting] = React.useState(false);
  const [showConfig, setShowConfig] = React.useState(false);
  const [config, setConfig] = React.useState<ExportConfig>(DEFAULT_EXPORT_CONFIG);
  const [miniConfigs, setMiniConfigs] = React.useState<ExportMiniConfig[]>([]);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedCollections(new Set());
      setStep('collections');
      setShowConfig(false);
      setConfig(DEFAULT_EXPORT_CONFIG);
      setMiniConfigs([]);
    }
  }, [isOpen]);

  const collectionsWithMinis = React.useMemo((): CollectionWithMinis[] => {
    return collections.map((collection) => {
      const collectionMinis = miniatures
        .filter((m) => m.collectionId === collection.id)
        .map((mini): CollectionMini => {
          return {
            id: mini.id,
            name: mini.name,
            frontImage: mini.frontalThumbDataUrl
              ? {
                  id: generateId<ImageId>(),
                  dataUrl: mini.frontalThumbDataUrl,
                  prompt: '',
                  timestamp: mini.createdAt,
                }
              : null,
            backImage: null,
          };
        });

      return {
        collection,
        minis: collectionMinis,
      };
    });
  }, [collections, miniatures]);

  const selectedCount = selectedCollections.size;

  const handleToggleCollection = (collectionId: CollectionId): void => {
    setSelectedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return next;
    });
  };

  const handleNextToMinis = async (): Promise<void> => {
    const allCollections = await listCollectionsWithImages([...selectedCollections]);
    const configs: ExportMiniConfig[] = [];

    for (const coll of allCollections) {
      for (const mini of coll.minis) {
        configs.push({
          id: mini.id,
          name: mini.name,
          included: true,
          miniHeightMm: DEFAULT_MINI_HEIGHT_MM,
          frontDataUrl: mini.frontImageDataUrl,
          backDataUrl: mini.backImageDataUrl,
          thumbnailUrl: mini.frontImageDataUrl,
        });
      }
    }

    setMiniConfigs(configs);
    setStep('minis');
  };

  const handleToggleMiniInclude = (miniId: MiniId): void => {
    setMiniConfigs((prev) => prev.map((m) => (m.id === miniId ? { ...m, included: !m.included } : m)));
  };

  const handleMiniHeightChange = (miniId: MiniId, height: number): void => {
    setMiniConfigs((prev) => prev.map((m) => (m.id === miniId ? { ...m, miniHeightMm: height } : m)));
  };

  const selectedMinisCount = miniConfigs.filter((m) => m.included).length;

  const handleExport = async (): Promise<void> => {
    if (selectedMinisCount === 0) return;

    setIsExporting(true);

    try {
      const minisData = miniConfigs.filter((m) => m.included);

      if (minisData.length === 0) {
        setIsExporting(false);
        return;
      }

      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const selectedNames = collectionsWithMinis
        .filter((c) => selectedCollections.has(c.collection.id))
        .map((c) => c.collection.name)
        .join(', ');
      const fileName = `${selectedNames} - ${timestamp}.pdf`;

      await downloadPdf(minisData, fileName, config);
      onClose();
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = (): void => {
    setSelectedCollections(new Set());
    setShowConfig(false);
    setConfig(DEFAULT_EXPORT_CONFIG);
    setStep('collections');
    setMiniConfigs([]);
    onClose();
  };

  const handleBack = (): void => {
    setStep('collections');
  };

  const groupedMinis = React.useMemo(() => {
    const groups: Record<string, ExportMiniConfig[]> = {};
    for (const mini of miniConfigs) {
      const collection = collections.find((c) => miniatures.some((m) => m.id === mini.id && m.collectionId === c.id));
      const groupKey = collection?.name ?? 'Unknown';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(mini);
    }
    return groups;
  }, [miniConfigs, collections, miniatures]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="flex h-[85vh] max-w-6xl flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {step === 'collections' ? 'Export to PDF - Select Collections' : 'Export to PDF - Configure Minis'}
          </DialogTitle>
        </DialogHeader>

        {step === 'collections' && (
          <>
            <div className="flex-1 overflow-y-auto">
              {collectionsWithMinis.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No collections to export
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {collectionsWithMinis.map((collection) => (
                    <CollectionCard
                      key={collection.collection.id}
                      collection={collection}
                      isSelected={selectedCollections.has(collection.collection.id)}
                      onToggle={() => handleToggleCollection(collection.collection.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 mt-4 space-y-4 border-t pt-4">
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Export Settings
              </button>

              {showConfig && (
                <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Background Color</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="backgroundColor"
                          checked={config.backgroundColor === 'black'}
                          onChange={() => setConfig({ ...config, backgroundColor: 'black' })}
                        />
                        <span className="text-sm">Black</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="backgroundColor"
                          checked={config.backgroundColor === 'white'}
                          onChange={() => setConfig({ ...config, backgroundColor: 'white' })}
                        />
                        <span className="text-sm">White</span>
                      </label>
                    </div>
                  </div>

                  {config.backgroundColor === 'black' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Blur Size (px)</label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={config.blurSizePx}
                          onChange={(e) => setConfig({ ...config, blurSizePx: Number(e.target.value) })}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Outline Size (px)</label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={config.outlineSizePx}
                          onChange={(e) => setConfig({ ...config, outlineSizePx: Number(e.target.value) })}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 mt-4">
              <Button onClick={() => void handleNextToMinis()} disabled={selectedCount === 0} className="w-full">
                Next: Configure {miniatures.filter((m) => selectedCollections.has(m.collectionId)).length} miniatures
              </Button>
            </div>
          </>
        )}

        {step === 'minis' && (
          <>
            <div className="flex-1 overflow-y-auto">
              {miniConfigs.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground">No minis to export</div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedMinis).map(([collectionName, minis]) => (
                    <div key={collectionName}>
                      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{collectionName}</h3>
                      <div className="space-y-2">
                        {minis.map((mini) => (
                          <MiniConfigCard
                            key={mini.id}
                            mini={mini}
                            onToggleInclude={() => handleToggleMiniInclude(mini.id)}
                            onHeightChange={(height) => handleMiniHeightChange(mini.id, height)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 mt-4 flex gap-2">
              <Button variant="outline" onClick={handleBack} disabled={isExporting}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => void handleExport()}
                disabled={selectedMinisCount === 0 || isExporting}
                className="flex-1"
              >
                <FileDown className="mr-2 h-4 w-4" />
                {isExporting ? 'Exporting...' : `Export ${selectedMinisCount} miniatures`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { PdfExportDialog };
