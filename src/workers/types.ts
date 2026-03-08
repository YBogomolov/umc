export interface MiniData {
  readonly name: string;
  readonly frontDataUrl: string;
  readonly backDataUrl: string;
}

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
