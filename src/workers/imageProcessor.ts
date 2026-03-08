/// <reference lib="webworker" />
import { MiniData } from '@/services/pdfExport';

import * as proc from './process';

declare const self: DedicatedWorkerGlobalScope;

interface ProcessImageMessage {
  readonly type: 'process';
  readonly minis: MiniData[];
}

interface ErrorMessage {
  readonly type: 'error';
  readonly message: string;
}

self.onmessage = async (event: MessageEvent<ProcessImageMessage>): Promise<void> => {
  const { type } = event.data;

  if (type === 'process') {
    try {
      const pdfBytes = await proc.generatePdf(event.data.minis);
      self.postMessage({ type: 'processed', pdfBytes: pdfBytes.buffer });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      self.postMessage({ type: 'error', message } as ErrorMessage);
    }
  }
};

export {};
