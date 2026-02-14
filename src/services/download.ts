import JSZip from 'jszip';

import type { MiniatureMeta } from '@/store/types';

interface MiniWithImages extends MiniatureMeta {
  readonly images: {
    readonly frontal: readonly string[];
    readonly back: readonly string[];
    readonly base: readonly string[];
  };
}

const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = /:(.*?);/.exec(header);
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

const sanitizeFileName = (name: string): string => {
  // Remove characters that are invalid in file names
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
};

export const downloadSingleImage = (dataUrl: string, miniName: string, view: 'frontal' | 'back' | 'base'): void => {
  const ext = getExtension(dataUrl);
  const safeName = sanitizeFileName(miniName);
  const viewLabel = view.charAt(0).toUpperCase() + view.slice(1);
  const fileName = `${safeName} - ${viewLabel}.${ext}`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadCollection = async (collectionName: string, minis: MiniWithImages[]): Promise<void> => {
  const zip = new JSZip();
  const safeCollectionName = sanitizeFileName(collectionName);

  for (const mini of minis) {
    const safeMiniName = sanitizeFileName(mini.name);
    const folder = zip.folder(safeMiniName);
    if (!folder) continue;

    // Download all frontal images
    mini.images.frontal.forEach((dataUrl, index) => {
      const ext = getExtension(dataUrl);
      const suffix = mini.images.frontal.length > 1 ? `-${String(index + 1).padStart(2, '0')}` : '';
      folder.file(`${safeMiniName}-01-Front${suffix}.${ext}`, dataUrlToBlob(dataUrl));
    });

    // Download all back images
    mini.images.back.forEach((dataUrl, index) => {
      const ext = getExtension(dataUrl);
      const suffix = mini.images.back.length > 1 ? `-${String(index + 1).padStart(2, '0')}` : '';
      folder.file(`${safeMiniName}-02-Back${suffix}.${ext}`, dataUrlToBlob(dataUrl));
    });

    // Download all base images
    mini.images.base.forEach((dataUrl, index) => {
      const ext = getExtension(dataUrl);
      const suffix = mini.images.base.length > 1 ? `-${String(index + 1).padStart(2, '0')}` : '';
      folder.file(`${safeMiniName}-03-Base${suffix}.${ext}`, dataUrlToBlob(dataUrl));
    });
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeCollectionName}-${Date.now()}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
