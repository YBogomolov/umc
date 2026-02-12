# Feature 3: User Attachments to Prompts

## Status: ✅ COMPLETED (2026-02-12)

## Overview

Allow users to attach image files to their prompts for both frontal and back views. These attachments are sent to the LLM as inline data as part of the user message, providing additional visual context for generation. Attachments are one-shot only and not persisted.

---

## User Requirements (Final)

1. ✅ Attach files to frontal view prompts
2. ✅ Attach files to back view prompts
3. ✅ Plus icon button on the left side of the prompt textarea
4. ✅ Attachments are NOT stored - one-shot only
5. ✅ Display attached files as chips below the prompt area
6. ✅ User can remove attached files individually
7. ✅ Attachments sent to Gemini as inline data parts

---

## Implementation Summary

### Files Modified

- `src/services/gemini.ts` - Added `Attachment` interface and updated `generateImage` to include attachment parts
- `src/components/GenerationScreen.tsx` - Added attachment UI, handlers, and integration
- `src/screens/FrontalViewScreen.tsx` - Enabled `allowAttachments={true}`
- `src/screens/BackViewScreen.tsx` - Enabled `allowAttachments={true}`

### Files Created

- `src/components/AttachmentChip.tsx` - Reusable chip component for displaying attachments
- `src/components/ui/badge.tsx` - shadcn/ui Badge component (installed via CLI)

### Key Implementation Details

**Attachment Interface:**

```typescript
interface Attachment {
  readonly id: string;
  readonly fileName: string;
  readonly dataUrl: string;
  readonly mimeType: string;
}
```

**Attachment Flow:**

1. User clicks plus (+) button to the left of the prompt textarea
2. File picker opens with multi-select support
3. Selected images are converted to data URLs via FileReader
4. Attachments displayed as removable chips below the textarea
5. On generation, attachments sent as `inlineData` parts before the text prompt
6. Attachments cleared automatically after successful generation

**UI Elements:**

- Plus button positioned to the left of the prompt textarea (outline variant)
- Attachment chips displayed below textarea in horizontal flex wrap
- Uses shadcn/ui Badge component with `secondary` variant
- File icon + truncated filename (max 20 chars) on chips
- Remove button with hover state (red background)

**Validation:**

- File type: Only image files accepted (`image/*`)
- File size: 5MB maximum per file
- Error messages shown for invalid files

**State Management:**

- Attachments stored in component state only (not global Zustand store)
- Cleared after successful generation
- Preserved on generation error (allows retry)

---

## Technical Design

### Gemini Service Changes

**Attachment Interface:**

```typescript
export interface Attachment {
  readonly id: string;
  readonly fileName: string;
  readonly dataUrl: string;
  readonly mimeType: string;
}
```

**Updated GenerateImageOptions:**

```typescript
interface GenerateImageOptions {
  apiKey: string;
  type: GenerationType;
  userPrompt: string;
  referenceImageDataUrl?: string;
  modelName?: string;
  attachments?: readonly Attachment[]; // NEW
}
```

**Attachment Processing:**

```typescript
// Add user attachments as inline data parts first
if (attachments && attachments.length > 0) {
  for (const attachment of attachments) {
    const { mimeType, data } = dataUrlToBase64(attachment.dataUrl);
    parts.push({
      inlineData: { mimeType, data },
    });
  }
}
```

### GenerationScreen Changes

**New Props:**

- `allowAttachments?: boolean` - Enables attachment UI for frontal/back views

**New State:**

- `attachments: Attachment[]` - Component-level state for attachments
- `attachmentInputRef` - Ref for hidden file input

**New Handlers:**

- `handleAttachmentClick()` - Opens file picker
- `handleAttachmentAdd()` - Processes selected files, validates, converts to data URLs
- `handleAttachmentRemove(id)` - Removes specific attachment by ID

**Integration:**

- Passes attachments to `generateImage()` call
- Clears attachments array after successful generation

### AttachmentChip Component

**Props:**

```typescript
interface AttachmentChipProps {
  fileName: string;
  onRemove: () => void;
}
```

**Features:**

- File icon (FileImage from Lucide)
- Truncated filename display
- Remove button with hover effect
- Built on shadcn/ui Badge component

---

## UI/UX Specifications

### Attachment Button

- **Position:** Left side of prompt textarea
- **Icon:** Plus (`+`) sign using Lucide `Plus` icon
- **Size:** Icon button (40x40px)
- **Variant:** Outline for subtle appearance
- **Disabled state:** When generation is in progress
- **Tooltip:** "Attach reference images"
- **Behavior:** Opens native file picker with multi-select enabled

### Attachment Chips

- **Position:** Below the textarea, above the error message (if any)
- **Layout:** Horizontal flex wrap, gap of 2 (0.5rem)
- **Chip style:** shadcn/ui Badge component with `secondary` variant
- **Content:** File icon + truncated filename (max 20 chars)
- **Remove button:** X icon on right side of chip with red hover state
- **Empty state:** No chips rendered when no attachments

### File Selection

- **Trigger:** Clicking the plus button
- **File types:** `image/*` (JPG, PNG, WebP, GIF)
- **Multiple files:** Allow multiple selection
- **Validation:** Check file type and size, show error if invalid
- **Size limit:** 5MB per file

### Generation Flow

- Attachments are included in the API call as inline data parts
- Attachments appear BEFORE the text prompt in the parts array
- After successful generation: Clear all attachments from state
- On generation error: Keep attachments so user can retry

---

## Testing Checklist

- [x] Plus button visible only for frontal and back views
- [x] Plus button hidden for base view
- [x] Clicking plus opens file picker
- [x] Can select multiple image files
- [x] Invalid file type shows error
- [x] File too large shows error
- [x] Selected files appear as chips
- [x] Chips show truncated filename with file icon
- [x] Clicking X on chip removes it
- [x] Attachments sent to Gemini as inline data
- [x] Attachments appear before text prompt in API call
- [x] Attachments cleared after successful generation
- [x] Attachments preserved on generation error
- [x] Generation works without attachments (backward compatible)

---

## Dependencies

**No new packages required.** Uses existing:

- Native FileReader API
- Existing Gemini SDK
- Lucide React icons (Plus, X, FileImage)
- shadcn/ui Badge component (installed via CLI)

---

## Notes

- **One-shot design:** Attachments exist only in component state, not persisted to store or database
- **Memory considerations:** Large images as attachments may increase memory usage temporarily
- **API limits:** Be aware of Gemini's context window limits with multiple large images
- **Backward compatibility:** Existing generation flow works without any attachments
- **No storage:** Unlike uploaded images in Feature 2, these attachments are NOT saved anywhere

---

## Future Enhancements (Not in Scope)

- Drag-and-drop attachments onto textarea
- Paste image from clipboard
- Preview attachment on hover
- Reorder attachments
- Attach to base view (if requested)
- Persistent attachments across sessions
