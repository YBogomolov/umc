import * as React from 'react';

import { Check, Clock } from 'lucide-react';

import { ApiKeyDialog } from '@/components/ApiKeyDialog';
import { HelpDialog } from '@/components/HelpDialog';
import { Sidebar } from '@/components/Sidebar';
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

  React.useEffect(() => {
    if (!apiKey) {
      setApiKeyDialogOpen(true);
    }
  }, [apiKey, setApiKeyDialogOpen]);

  const handleTabChange = (value: string): void => {
    setActiveTab(value as TabId);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <ApiKeyDialog forceOpen={apiKeyDialogOpen} onClose={() => setApiKeyDialogOpen(false)} />
      <HelpDialog isOpen={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} />

      <header className="flex h-9 shrink-0 items-center justify-center border-b border-border bg-card px-4">
        <p className="flex text-sm">Universal Miniature Creator</p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onHelp={() => setHelpDialogOpen(true)} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-4xl px-4 py-8">
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="frontal">
                    {hasFront ? <Check /> : <Clock />}
                    &nbsp;Frontal View
                  </TabsTrigger>
                  <TabsTrigger value="back" disabled={!canGoBack}>
                    {hasBack ? <Check /> : <Clock />}
                    &nbsp;Back View
                  </TabsTrigger>
                  <TabsTrigger value="base" disabled={!canGoBase}>
                    {hasBase ? <Check /> : <Clock />}
                    &nbsp;Base
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
    </div>
  );
}

export default App;
