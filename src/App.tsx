import * as React from 'react';

import { Check, Clock, FileDown, Menu } from 'lucide-react';

import { ApiKeyDialog } from '@/components/ApiKeyDialog';
import { HelpDialog } from '@/components/HelpDialog';
import { PdfExportDialog } from '@/components/PdfExportDialog';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackViewScreen } from '@/screens/BackViewScreen';
import { BaseScreen } from '@/screens/BaseScreen';
import { FrontalViewScreen } from '@/screens/FrontalViewScreen';
import { useAppStore } from '@/store';
import type { TabId } from '@/store/types';

function App(): React.ReactElement {
  const apiKey = useAppStore((s) => s.apiKey);
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const canGoBack = useAppStore((s) => s.frontal.images.length > 0);
  const canGoBase = useAppStore((s) => s.frontal.images.length > 0);
  const hasFront = useAppStore((s) => s.frontal.images.length > 0);
  const hasBack = useAppStore((s) => s.back.images.length > 0);
  const hasBase = useAppStore((s) => s.base.images.length > 0);

  const [apiKeyDialogOpen, setApiKeyDialogOpen] = React.useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [pdfExportOpen, setPdfExportOpen] = React.useState(false);

  React.useEffect(() => {
    if (!apiKey) {
      setApiKeyDialogOpen(true);
    }
  }, [apiKey, setApiKeyDialogOpen]);

  const handleTabChange = (value: string): void => {
    setActiveTab(value as TabId);
  };

  const handleHelp = (): void => {
    setHelpDialogOpen(true);
    setSidebarOpen(false);
  };

  const handleSelectMini = (): void => {
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <ApiKeyDialog forceOpen={apiKeyDialogOpen} onClose={() => setApiKeyDialogOpen(false)} />
      <HelpDialog isOpen={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} />
      <PdfExportDialog isOpen={pdfExportOpen} onClose={() => setPdfExportOpen(false)} />

      <header className="relative flex h-10 shrink-0 items-center justify-center border-b border-border bg-card px-4">
        {/* Mobile menu button - positioned absolutely */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <button
              className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" showCloseButton={false} className="w-72 overflow-y-auto p-0">
            <Sidebar onHelp={handleHelp} onSelectMini={handleSelectMini} />
          </SheetContent>
        </Sheet>

        <p className="text-sm font-medium">Universal Miniature Creator</p>
        <Button variant="ghost" className="absolute right-4" onClick={() => setPdfExportOpen(true)}>
          <FileDown className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden h-full md:block">
          <Sidebar onHelp={() => setHelpDialogOpen(true)} />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-4xl px-4 py-4 md:py-8">
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="frontal" className="flex items-center justify-center gap-1 text-xs sm:text-sm">
                    {hasFront ? (
                      <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                    <span className="hidden sm:inline">Frontal View</span>
                    <span className="sm:hidden">Front</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="back"
                    disabled={!canGoBack}
                    className="flex items-center justify-center gap-1 text-xs sm:text-sm"
                  >
                    {hasBack ? (
                      <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                    <span className="hidden sm:inline">Back View</span>
                    <span className="sm:hidden">Back</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="base"
                    disabled={!canGoBase}
                    className="flex items-center justify-center gap-1 text-xs sm:text-sm"
                  >
                    {hasBase ? (
                      <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                    <span>Base</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="frontal" className="mt-4 md:mt-6">
                  <FrontalViewScreen />
                </TabsContent>
                <TabsContent value="back" className="mt-4 md:mt-6">
                  <BackViewScreen />
                </TabsContent>
                <TabsContent value="base" className="mt-4 md:mt-6">
                  <BaseScreen />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
