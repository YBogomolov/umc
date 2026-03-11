import { describe, expect, it } from 'vitest';

import { DEFAULT_EXPORT_CONFIG, type ExportConfig, type MiniData } from '@/workers/types';

describe('pdfExport types', () => {
  describe('ExportConfig', () => {
    it('has correct default values', () => {
      expect(DEFAULT_EXPORT_CONFIG.miniHeightMm).toBe(32);
      expect(DEFAULT_EXPORT_CONFIG.blurSizePx).toBe(25);
      expect(DEFAULT_EXPORT_CONFIG.outlineSizePx).toBe(7);
      expect(DEFAULT_EXPORT_CONFIG.backgroundColor).toBe('black');
    });

    it('accepts custom configuration', () => {
      const customConfig: ExportConfig = {
        miniHeightMm: 50,
        blurSizePx: 15,
        outlineSizePx: 10,
        backgroundColor: 'white',
      };

      expect(customConfig.miniHeightMm).toBe(50);
      expect(customConfig.blurSizePx).toBe(15);
      expect(customConfig.outlineSizePx).toBe(10);
      expect(customConfig.backgroundColor).toBe('white');
    });

    it('allows both background color options', () => {
      const blackConfig: ExportConfig = { ...DEFAULT_EXPORT_CONFIG, backgroundColor: 'black' };
      const whiteConfig: ExportConfig = { ...DEFAULT_EXPORT_CONFIG, backgroundColor: 'white' };

      expect(blackConfig.backgroundColor).toBe('black');
      expect(whiteConfig.backgroundColor).toBe('white');
    });
  });

  describe('MiniData', () => {
    it('accepts valid mini data', () => {
      const miniData: MiniData = {
        name: 'Test Mini',
        frontDataUrl: 'data:image/png;base64,abc123',
        backDataUrl: 'data:image/png;base64,def456',
        miniHeightMm: 40,
      };

      expect(miniData.name).toBe('Test Mini');
      expect(miniData.frontDataUrl).toContain('data:image');
      expect(miniData.backDataUrl).toContain('data:image');
      expect(miniData.miniHeightMm).toBe(40);
    });

    it('allows optional miniHeightMm', () => {
      const miniData: MiniData = {
        name: 'Test Mini',
        frontDataUrl: 'data:image/png;base64,abc123',
        backDataUrl: 'data:image/png;base64,def456',
      };

      expect(miniData.miniHeightMm).toBeUndefined();
    });
  });
});
