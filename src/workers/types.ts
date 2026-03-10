export interface ExportConfig {
  readonly miniHeightMm: number;
  readonly blurSizePx: number;
  readonly outlineSizePx: number;
  readonly backgroundColor: 'black' | 'white';
}

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  miniHeightMm: 32,
  blurSizePx: 25,
  outlineSizePx: 7,
  backgroundColor: 'black',
};

export interface MiniData {
  readonly name: string;
  readonly frontDataUrl: string;
  readonly backDataUrl: string;
  readonly miniHeightMm?: number;
}

export interface ProcessImageMessage {
  readonly type: 'process';
  readonly minis: MiniData[];
  readonly config: ExportConfig;
}

export interface ProcessedPdfMessage {
  readonly type: 'processed';
  readonly pdfBytes: Uint8Array;
}

export interface ErrorMessage {
  readonly type: 'error';
  readonly message: string;
}
