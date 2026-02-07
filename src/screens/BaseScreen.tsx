import * as React from 'react';
import { GenerationScreen } from '@/components/GenerationScreen';
import { downloadAsZip } from '@/services/download';
import { useAppStore } from '@/store';

function BaseScreen(): React.ReactElement {
  const getSelectedImage = useAppStore((s) => s.getSelectedImage);

  const handleDownload = async (): Promise<void> => {
    const frontal = getSelectedImage('frontal');
    const back = getSelectedImage('back');
    const base = getSelectedImage('base');

    if (!frontal || !back) return;

    await downloadAsZip({
      frontal: frontal.dataUrl,
      back: back.dataUrl,
      base: base?.dataUrl,
    });
  };

  return (
    <GenerationScreen
      tabId="base"
      title="Base"
      promptPlaceholder="Describe the base texture... (e.g., 'Forest floor with moss, fallen leaves, and small mushrooms')"
      showDownload={true}
      onDownload={handleDownload}
    />
  );
}

export { BaseScreen };
