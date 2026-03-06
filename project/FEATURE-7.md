# Feature 7: Horizontal Image Flip

## Overview

Add ability to flip images horizontally (mirror) for both frontal, back, and base views. The flipped image is persisted to the database.

## Implementation Plan

### 1. Add `flipImage` function to `db.ts`

- Takes imageId and new flipped dataUrl
- Updates the blob in IndexedDB

### 2. Add `flipImage` action to store (`store/index.ts`)

- Updates image dataUrl in state
- Calls db.flipImage to persist

### 3. Add flip button to `GenerationScreen.tsx`

- Add FlipHorizontal icon from lucide-react
- Add flip button next to download button
- Handle flip logic with canvas transformation
- Persist and update selection

### 4. Update backup/restore to include flip metadata

- Update backup/restore services

## Acceptance Criteria

- [x] Flip button appears on hover above download button
- [x] Clicking flip horizontally mirrors the image on vertical axis
- [x] Flipped image is persisted to IndexedDB
- [x] Flipped state is preserved when switching between tabs
- [x] Backup/restore works with flipped images
