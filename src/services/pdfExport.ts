import ImageProcessorWorker from '@/workers/imageProcessor?worker';
import { ErrorMessage, ProcessedPdfMessage } from '@/workers/types';

export interface MiniData {
  readonly name: string;
  readonly frontDataUrl: string;
  readonly backDataUrl: string;
}

type WorkerResponseMessage = ProcessedPdfMessage | ErrorMessage;

export const generatePdf = async (minis: MiniData[]): Promise<Uint8Array> => {
  const worker = new ImageProcessorWorker();

  try {
    return await new Promise<Uint8Array>((resolve, reject) => {
      const handleMessage = (event: MessageEvent<WorkerResponseMessage>): void => {
        if (event.data.type === 'processed') {
          const { pdfBytes } = event.data;
          resolve(pdfBytes);
        } else if (event.data.type === 'error') {
          reject(new Error(event.data.message));
        }
      };

      worker.addEventListener('message', handleMessage, { once: true });
      worker.postMessage({ type: 'process', minis });
    });
  } catch (e) {
    console.error(e);
    throw e;
  } finally {
    worker.terminate();
  }
};

export const downloadPdf = async (minis: MiniData[], fileName: string): Promise<void> => {
  const pdfBytes = await generatePdf(minis);
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
