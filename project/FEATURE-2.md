# Feature 2: User Uploads

## Status: ✅ COMPLETED

## Overview
Allow users to upload their own image as a reference for the frontal view generation. This enables users to provide existing artwork as a base for AI generation.

## Implementation Summary

### What Was Built

**Frontal View Upload Support:**
- Drag-and-drop zone on empty image area
- Click-to-upload functionality
- Visual feedback during drag (border highlight)
- Preview uploaded image with remove button
- Uploaded image used as reference for Gemini generation

### Key Features

1. **Upload Zone** - Visible only on frontal view when no images exist
2. **Drag & Drop** - Users can drag image files onto the upload area
3. **Click to Upload** - Click opens native file picker
4. **Image Preview** - Shows uploaded image with "X" button to clear
5. **Reference Integration** - Uploaded image used as reference for generation
6. **Auto-cleanup** - Uploaded image cleared after successful generation

### Technical Details

**GenerationScreen Changes:**
- Added `allowUpload?: boolean` prop
- Added `onUpload?: (dataUrl: string) => void` callback
- Upload state managed locally in component
- Uses existing `referenceImageDataUrl` infrastructure

**File Handling:**
- Validates file type (`image/*`)
- Uses FileReader API to convert to data URL
- Supports: JPG, PNG, WebP

**UI States:**
- Default: "Upload your front image" with upload icon
- Dragging: Border highlight with dashed border
- Uploaded: Image preview with remove button
- Error: Shows error message for invalid files

### User Flow

1. User opens Frontal View (empty state)
2. User drags or clicks to upload an image
3. Image displayed in preview area
4. User enters prompt and clicks Generate
5. Gemini uses uploaded image as reference
6. Generated image(s) appear in gallery
7. Uploaded image automatically cleared

### Files Modified

- `src/components/GenerationScreen.tsx` - Added upload support
- `src/screens/FrontalViewScreen.tsx` - Enabled uploads

### Dependencies Used

- Native FileReader API (no new dependencies)
- React drag events (onDragEnter, onDragLeave, onDragOver, onDrop)

## Testing Checklist

- [x] Can drag and drop image file onto empty area
- [x] Can click empty area to open file picker
- [x] Invalid file type shows error
- [x] Valid image uploads and displays
- [x] Remove button clears uploaded image
- [x] Uploaded image used as reference for generation
- [x] Upload area hidden after images generated

## Notes

- Upload feature only available for frontal view
- Uploaded image is temporary (cleared after generation)
- Generated images saved normally to gallery
- Works alongside existing prompt-based generation
