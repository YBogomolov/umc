import * as React from 'react';

import { GenerationScreen } from '@/components/GenerationScreen';
import { generateId } from '@/services/gemini';
import { useAppStore } from '@/store';

function FrontalViewScreen(): React.ReactElement {
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const addImage = useAppStore((s) => s.addImage);

  const handleUpload = (dataUrl: string): void => {
    // Add uploaded image directly as the frontal view
    const uploadedImage = {
      id: generateId(),
      dataUrl,
      prompt: 'Uploaded image',
      timestamp: Date.now(),
    };
    addImage('frontal', uploadedImage);
  };

  return (
    <GenerationScreen
      tabId="frontal"
      title="Frontal View"
      promptPlaceholder="Describe your miniature character... (e.g., 'A dwarven warrior with a battleaxe and shield, wearing heavy plate armour')"
      nextButtonLabel="Next Step"
      onNext={() => setActiveTab('back')}
      allowUpload={true}
      onUpload={handleUpload}
    />
  );
}

export { FrontalViewScreen };
