import { describe, expect, it } from 'vitest';

import type { ErrorMessage, ProcessImageMessage, ProcessedPdfMessage } from '@/workers/types';

describe('imageProcessor types', () => {
  describe('ProcessImageMessage', () => {
    it('accepts valid process message', () => {
      const message: ProcessImageMessage = {
        type: 'process',
        minis: [
          {
            name: 'Test Mini',
            frontDataUrl: 'data:image/png;base64,abc',
            backDataUrl: 'data:image/png;base64,def',
            miniHeightMm: 32,
          },
        ],
        config: {
          miniHeightMm: 32,
          blurSizePx: 25,
          outlineSizePx: 7,
          backgroundColor: 'black',
        },
      };

      expect(message.type).toBe('process');
      expect(message.minis.length).toBe(1);
      expect(message.config.backgroundColor).toBe('black');
    });
  });

  describe('ProcessedPdfMessage', () => {
    it('accepts valid processed message', () => {
      const message: ProcessedPdfMessage = {
        type: 'processed',
        pdfBytes: new Uint8Array([80, 75, 3, 4]),
      };

      expect(message.type).toBe('processed');
      expect(message.pdfBytes.length).toBe(4);
    });
  });

  describe('ErrorMessage', () => {
    it('accepts valid error message', () => {
      const message: ErrorMessage = {
        type: 'error',
        message: 'Test error message',
      };

      expect(message.type).toBe('error');
      expect(message.message).toBe('Test error message');
    });
  });
});
