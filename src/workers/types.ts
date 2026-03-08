import { MiniData } from '@/services/pdfExport';

export interface ProcessImageMessage {
  readonly type: 'process';
  readonly minis: MiniData[];
}

export interface ProcessedPdfMessage {
  readonly type: 'processed';
  readonly pdfBytes: Uint8Array;
}

export interface ErrorMessage {
  readonly type: 'error';
  readonly message: string;
}
