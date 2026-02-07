import JSZip from 'jszip';

interface DownloadImages {
  readonly frontal: string;
  readonly back: string;
  readonly base?: string;
}

const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
};

const getExtension = (dataUrl: string): string => {
  if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) {
    return 'jpg';
  }
  if (dataUrl.includes('image/webp')) {
    return 'webp';
  }
  return 'png';
};

export const downloadAsZip = async (images: DownloadImages): Promise<void> => {
  const zip = new JSZip();

  const frontalExt = getExtension(images.frontal);
  const backExt = getExtension(images.back);

  zip.file(`01-front.${frontalExt}`, dataUrlToBlob(images.frontal));
  zip.file(`02-back.${backExt}`, dataUrlToBlob(images.back));

  if (images.base) {
    const baseExt = getExtension(images.base);
    zip.file(`03-base.${baseExt}`, dataUrlToBlob(images.base));
  }

  const content = await zip.generateAsync({ type: 'blob' });

  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `miniature-${Date.now()}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
