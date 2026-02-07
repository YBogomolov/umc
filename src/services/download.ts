import JSZip from 'jszip';

import type { SessionMeta } from '@/store/types';

interface DownloadImages {
  readonly frontal: string;
  readonly back: string;
  readonly base?: string;
}

interface SessionWithImages extends SessionMeta {
  images: {
    frontal?: string;
    back?: string;
    base?: string;
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

export const downloadCollection = async (collectionName: string, sessions: SessionWithImages[]): Promise<void> => {
  const zip = new JSZip();
  const safeCollectionName = sanitizeFileName(collectionName);

  for (const session of sessions) {
    const safeSessionName = sanitizeFileName(session.name);
    const folder = zip.folder(safeSessionName);
    if (!folder) continue;

    if (session.images.frontal) {
      const ext = getExtension(session.images.frontal);
      folder.file(`frontal.${ext}`, dataUrlToBlob(session.images.frontal));
    }
    if (session.images.back) {
      const ext = getExtension(session.images.back);
      folder.file(`back.${ext}`, dataUrlToBlob(session.images.back));
    }
    if (session.images.base) {
      const ext = getExtension(session.images.base);
      folder.file(`base.${ext}`, dataUrlToBlob(session.images.base));
    }
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
