import { describe, expect, it } from 'vitest';

import { blobToDataUrl, dataUrlToBlob } from '@/services/db';

describe('db utilities', () => {
  describe('dataUrlToBlob', () => {
    it('converts PNG data URL to Blob', () => {
      const dataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const blob = dataUrlToBlob(dataUrl);

      expect(blob.type).toBe('image/png');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('converts JPEG data URL to Blob', () => {
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const blob = dataUrlToBlob(dataUrl);

      expect(blob.type).toBe('image/jpeg');
    });

    it('preserves unknown mime types', () => {
      const dataUrl = 'data:image/unknown;base64,abc123';
      const blob = dataUrlToBlob(dataUrl);

      expect(blob.type).toBe('image/unknown');
    });
  });

  describe('blobToDataUrl', () => {
    it('converts Blob to data URL', async () => {
      const blob = new Blob(['mock-image-data'], { type: 'image/png' });
      const dataUrl = await blobToDataUrl(blob);

      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
      expect(dataUrl.length).toBeGreaterThan('data:image/png;base64,'.length);
    });

    it('roundtrips data correctly', async () => {
      const originalDataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const blob = dataUrlToBlob(originalDataUrl);
      const resultDataUrl = await blobToDataUrl(blob);

      expect(resultDataUrl).toBe(originalDataUrl);
    });
  });
});
