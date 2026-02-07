import * as React from 'react';

import { GenerationScreen } from '@/components/GenerationScreen';

function BaseScreen(): React.ReactElement {
  return (
    <GenerationScreen
      tabId="base"
      title="Base"
      promptPlaceholder="Describe the base texture... (e.g., 'Forest floor with moss, fallen leaves, and small mushrooms')"
    />
  );
}

export { BaseScreen };
