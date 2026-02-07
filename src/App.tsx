import * as React from 'react';

import { ApiKeyDialog } from '@/components/ApiKeyDialog';
import { Sidebar } from '@/components/Sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackViewScreen } from '@/screens/BackViewScreen';
import { BaseScreen } from '@/screens/BaseScreen';
import { FrontalViewScreen } from '@/screens/FrontalViewScreen';
import { useAppStore } from '@/store';
import type { TabId } from '@/store/types';

function App(): React.ReactElement {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const canGoBack = useAppStore((s) => s.frontal.images.length > 0);
  const canGoBase = useAppStore((s) => s.frontal.images.length > 0 && s.back.images.length > 0);

  const [apiKeyDialogOpen, setApiKeyDialogOpen] = React.useState(false);

  const handleTabChange = (value: string): void => {
    setActiveTab(value as TabId);
  };

  return (
    <div className="flex h-screen bg-background">
      <ApiKeyDialog forceOpen={apiKeyDialogOpen} onClose={() => setApiKeyDialogOpen(false)} />

      <Sidebar onChangeApiKey={() => setApiKeyDialogOpen(true)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-4 py-8">
            <header className="mb-8 text-center">
              <h1 className="text-3xl font-bold">Universal Miniature Creator</h1>
              <p className="mt-2 text-muted-foreground">
                Create flat 2D miniatures for print &amp; play tabletop games
              </p>
            </header>

            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="frontal">Frontal View</TabsTrigger>
                <TabsTrigger value="back" disabled={!canGoBack}>
                  Back View
                </TabsTrigger>
                <TabsTrigger value="base" disabled={!canGoBase}>
                  Base
                </TabsTrigger>
              </TabsList>

              <TabsContent value="frontal" className="mt-6">
                <FrontalViewScreen />
              </TabsContent>
              <TabsContent value="back" className="mt-6">
                <BackViewScreen />
              </TabsContent>
              <TabsContent value="base" className="mt-6">
                <BaseScreen />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
