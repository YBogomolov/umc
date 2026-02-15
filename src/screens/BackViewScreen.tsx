import * as React from 'react';

import { GenerationScreen } from '@/components/GenerationScreen';
import { useAppStore } from '@/store';

function BackViewScreen(): React.ReactElement {
  const frontalImage = useAppStore((s) => s.getSelectedImage('frontal'));

  const referencePrompt = frontalImage?.prompt ?? '';
  const referenceImageDataUrl = frontalImage?.dataUrl;

  return (
    <GenerationScreen
      tabId="back"
      title="Back View"
      promptPlaceholder="Adjust the back view description if needed..."
      autoGenerate={true}
      referencePrompt={referencePrompt}
      referenceImageDataUrl={referenceImageDataUrl}
      allowAttachments={true}
    />
  );
}

export { BackViewScreen };
