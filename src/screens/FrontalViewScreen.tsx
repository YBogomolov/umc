import * as React from 'react';

import { GenerationScreen } from '@/components/GenerationScreen';
import { useAppStore } from '@/store';

function FrontalViewScreen(): React.ReactElement {
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return (
    <GenerationScreen
      tabId="frontal"
      title="Frontal View"
      promptPlaceholder="Describe your miniature character... (e.g., 'A dwarven warrior with a battleaxe and shield, wearing heavy plate armour')"
      nextButtonLabel="Next Step"
      onNext={() => setActiveTab('back')}
      allowUpload={true}
      allowAttachments={true}
    />
  );
}

export { FrontalViewScreen };
