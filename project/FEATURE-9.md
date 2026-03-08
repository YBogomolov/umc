# Feature 9: Export Configuration

## Overview

Add configuration options to the PDF export dialog (Feature 8) to allow users to customize:

- Mini height (slider: 16mm-55mm, default: 32mm)
- Blur size (input: default 25px)
- Outline size (input: default 7px)
- Background color (radio: Black/White)

If background is white, skip the outline tracing & blur processing.

## Implementation Plan

### 1. Update Worker Types (`src/workers/types.ts`)

- Add `ExportConfig` interface with:
  - `miniHeightMm: number` (16-55, default 32)
  - `blurSizePx: number` (default 25)
  - `outlineSizePx: number` (default 7)
  - `backgroundColor: 'black' | 'white'` (default 'black')
- Update `ProcessImageMessage` to include config

### 2. Update PDF Export Service (`src/services/pdfExport.ts`)

- Update `generatePdf` to accept config parameter
- Update `downloadPdf` to accept config parameter and pass to worker

### 3. Update Worker Process (`src/workers/process.ts`)

- Make constants configurable via parameters
- Add logic to skip processing when background is white
- Accept config in `generatePdf` function

### 4. Update PDF Export Dialog (`src/components/PdfExportDialog.tsx`)

- Add configuration UI section with:
  - Slider for mini height (16-55mm)
  - Number input for blur size
  - Number input for outline size
  - Radio group for background color
- Pass config to `downloadPdf`
- Add whitespace optimization when background is white (no need for backdrops)

## Files to Modify

1. `src/workers/types.ts` - Add ExportConfig interface
2. `src/services/pdfExport.ts` - Accept config in functions
3. `src/workers/process.ts` - Use configurable values
4. `src/components/PdfExportDialog.tsx` - Add configuration UI
