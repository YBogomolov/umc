/// <reference lib="webworker" />
import * as proc from './process';
import { ProcessImageMessage } from './types';

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (event: MessageEvent<ProcessImageMessage>): Promise<void> => {
  const { type, minis, config } = event.data;

  if (type === 'process') {
    try {
      const pdfBytes = await proc.generatePdf(minis, config);
      self.postMessage({ type: 'processed', pdfBytes: pdfBytes.buffer });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      self.postMessage({ type: 'error', message });
    }
  }
};

export {};
