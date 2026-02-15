import * as React from 'react';

import { GenerationScreen } from '@/components/GenerationScreen';

function FrontalViewScreen(): React.ReactElement {
  return (
    <GenerationScreen
      tabId="frontal"
      title="Frontal View"
      promptPlaceholder="Describe your miniature character... (e.g., 'A dwarven warrior with a battleaxe and shield, wearing heavy plate armour')"
      allowUpload={true}
      allowAttachments={true}
    />
  );
}

export { FrontalViewScreen };
