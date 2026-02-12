# MEMORY.md

## Architecture Decisions

### Tech Stack

- **Build tool**: Vite (fast, modern, excellent TS support)
- **Framework**: React 18+ with TypeScript
- **UI Library**: shadcn/ui (LLM-friendly, minimal, composable)
- **State Management**: Zustand (functional, minimal boilerplate)
- **ZIP Generation**: JSZip
- **API Client**: @google/generative-ai SDK

### Gemini Integration

- Using Google's Generative AI SDK for image generation
- Model: `gemini-2.5-flash-image` (Nano Banana) for native image generation via `generateContent`
- Older model names like `gemini-2.0-flash-exp-image-generation` are defunct
- API key stored in localStorage for BYOK approach

### Prompts Strategy

- System prompts stored in separate constants file
- User prompt appended to system prompt for each generation
- Separate prompts for side views (frontal/back) and base view

### Tailwind CSS v4 Migration

- Installed `tailwindcss` resolved to v4, which is breaking vs v3 syntax
- v4 uses `@import "tailwindcss"` instead of `@tailwind base/components/utilities`
- v4 requires `@tailwindcss/postcss` plugin instead of raw `tailwindcss` in PostCSS config
- v4 uses `@theme` blocks for custom design tokens instead of `tailwind.config.js` `extend`
- `tailwind.config.js` is no longer needed in v4 — all config is CSS-first
- Updated `postcss.config.js` and `src/index.css` accordingly
- Root-level `tailwindcss` must be v4 — having v3 alongside `@tailwindcss/postcss` causes import parse errors
- `autoprefixer` is unnecessary with v4 (Lightning CSS handles it)
- Removed `tailwind.config.js` entirely — v4 uses CSS-first config via `@theme`

### Back View Reference Image

- Back view generation now sends the frontal image as `inlineData` part before the text prompt
- The `generateImage` service accepts an optional `referenceImageDataUrl` parameter
- Back view prompt is extremely strict: penalises silhouette divergence, style changes, added/removed elements
- Prompts were split into three separate system prompts (frontal, back, base) instead of shared side view prompt

### Gemini Model Selector

- Per-session `geminiModel` field, persisted in `SessionRecord.geminiModel`
- Dropdown in `GenerationScreen` above prompt area, shared across all tabs within a session
- Available models: `gemini-2.5-flash-image` (default), `gemini-2.5-pro-preview-06-05`, `gemini-2.0-flash-exp`
- Resets to default on new session, restored on session load

### Testing

- Onboarding dialog renders correctly with dark overlay
- API key input validates format (`AIza` prefix)
- After key entry, dialog dismisses and main screen shows
- Tab navigation disabled correctly for Back View and Base until images exist
- Generate button disabled until prompt text entered
- "Next Step" button disabled until image generated

---

## Feature 1: Collections (2026-02-07)

### Overview

Added Collections system to organize miniatures into collapsible groups with drag-and-drop support, individual naming, and collection-based downloads.

### Database Schema Changes

**Version 1 → 2 Migration:**

- Added `collections` object store with Collection interface
- Added `collectionId` field to SessionRecord
- Created default "Example collection" for existing sessions
- Renamed "Untitled" sessions to random two-word names during migration

**New Types:**

- `Collection`: id, name, createdAt, updatedAt
- Updated `SessionRecord`: added collectionId field

### Name Generation Strategy

- Random two-word names using adjective + noun pattern (e.g., "Iron Guardian", "Mystic Wolf")
- 50 adjectives × 50 nouns = 2500 possible combinations
- Words curated for fantasy/Sci-Fi tabletop gaming themes
- Function: `generateMiniName()` in `@/lib/nameGenerator.ts`

### Drag and Drop Implementation

- Used `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop functionality
- Headless library that integrates well with shadcn/ui components
- Miniatures are draggable between collections
- Collections use `useDroppable` to accept dropped miniatures
- Visual feedback with opacity changes and border highlights during drag

### UI/UX Decisions

**Collection Group:**

- Collapsible (default: expanded)
- Inline rename with pencil icon
- Delete disabled if collection has miniatures (user must move/delete miniatures first)
- Delete confirmation with double-click within 3 seconds

**Miniature Item:**

- Thumbnail + name + timestamp display
- "Created X ago" time formatting using `timeAgo()` utility
- Drag handle via entire item (not separate handle)
- Delete confirmation on hover

**Generation Screen:**

- Name input at top (above model selector)
- Debounced auto-save (500ms) - no explicit save button
- Removed "Download ZIP" button from individual views
- Per-image download button appears on hover in lower-right corner

**Download Strategy:**

- Individual images: "{MiniName} - {View}.{ext}" (e.g., "Iron Guardian - Frontal.png")
- Collection ZIP: Each miniature gets a folder with its views
- File name sanitization to remove invalid characters

### State Management Updates

**New Store State:**

- `collections: Collection[]`
- `currentCollectionId: string | null`

**New Actions:**

- `createCollection(name)` - Creates new empty collection
- `renameCollection(id, name)` - Updates collection name
- `deleteCollection(id)` - Only if empty
- `moveSessionToCollection(sessionId, collectionId)` - Drag-and-drop handler
- `createNewMiniature(collectionId)` - Creates session in specific collection
- `updateSessionName(sessionId, name)` - Debounced name update

**Refactored:**

- `newSession(collectionId?)` - Now accepts optional collectionId parameter
- Session initialization includes random name generation

### Migration Strategy

**Lazy Migration Approach:**

- Migration runs on app initialization via `runMigration()`
- Only runs if no collections exist (first launch after update)
- Creates default "Example collection"
- Migrates all existing sessions to default collection
- Renames "Untitled" to random names

**Why lazy migration:**

- Non-blocking - app loads immediately
- Handles edge cases gracefully
- Can be re-run safely if needed

### Performance Considerations

- Image blobs remain in separate `images` store (not duplicated)
- Session metadata is lightweight (just IDs and timestamps)
- Collection operations are O(n) where n = number of items
- Debounced name updates prevent excessive DB writes
- Drag-and-drop uses optimistic UI updates for responsiveness

### Debouncing Strategy

- Used `use-debounce` library instead of custom implementation
- Local state for immediate UI feedback while typing
- `useDebouncedCallback` with 500ms delay for database saves
- Prevents excessive IndexedDB writes while maintaining responsive UX

### Drag and Drop Fix

**Issue:** Delete button clicks were intercepted by @dnd-kit drag system

**Solution:** Moved draggable listeners from entire item to thumbnail only

- Thumbnail serves as drag handle (cursor: grab/grabbing)
- Rest of item (delete button, text) freely handles click events
- Better UX: users can click to select and delete without triggering drag

---

## Feature 2: User Uploads (2026-02-07)

### Overview

Added support for users to upload their own front images as an alternative to AI generation. The uploaded image is stored as the frontal view and used as reference for back view generation.

### Implementation Details

**GenerationScreen Updates:**

- Added `allowUpload?: boolean` prop to enable upload zone
- Added `onUpload?: (dataUrl: string) => void` callback for parent component
- Drag-and-drop zone on empty image area
- Click-to-upload functionality
- Visual feedback during drag (border highlight)

**Upload Flow:**

1. User drags image or clicks empty area to upload
2. GenerationScreen calls `onUpload` callback with data URL
3. FrontalViewScreen creates a `GeneratedImage` object and adds it to store via `addImage('frontal', image)`
4. Uploaded image now appears as the frontal view (same as generated images)
5. User can proceed to back view generation which uses uploaded image as reference
6. Multiple uploads create image gallery (like generations)

**Supported Formats:**

- JPG, PNG, WebP
- File type validation via `file.type.startsWith('image/')`
- FileReader API converts to data URL
- Max file size: 5MB (configurable)

**UI/UX:**

- Upload zone visible only when:
  - `allowUpload=true` (passed from FrontalViewScreen)
  - No generated/uploaded images exist yet
- Clear visual feedback: "Upload your front image" + upload icon
- Drag-over state: border highlight + "Drop image here" text
- Error handling for invalid file types

**Integration with Workflow:**

- Uploaded images treated same as generated images in store
- Appear in image gallery alongside generated images
- Can be selected, deleted, downloaded like any other image
- Back view auto-generation uses uploaded image as reference
- Download works with uploaded images (named properly)

### FrontalViewScreen Changes

- Passes `allowUpload={true}` to GenerationScreen
- Implements `handleUpload` callback that:
  - Creates `GeneratedImage` object with uploaded data
  - Uses `generateId()` for unique ID
  - Sets prompt as "Uploaded image"
  - Adds to store via `addImage('frontal', image)`

### Technical Notes

- Upload handling in component, storage in global store
- Uploaded images persist in IndexedDB like generated images
- Uses existing `addImage` infrastructure
- No special handling needed - uploaded images are first-class citizens
- Non-breaking - other views work without uploads

### Components Added

- `ImageDropZone` - Reusable drag-and-drop upload component
  - Validates file type and size
  - Shows error messages for invalid files
  - Visual states: default, drag-over, error

### Bug Fix: Uploaded Image Duplication (2026-02-07)

**Issue:** Uploaded images were being duplicated in the gallery (appearing twice as thumbnails #1 and #2).

**Root Cause:** The duplicate check was using `images` from the React closure (captured at render time), but the FileReader `onload` callback executes asynchronously. By the time the callback ran, the closure's `images` value was stale - it didn't include images that had been added to the store since the last render. This caused the duplicate detection to fail because it was checking against an outdated array.

**Solution:** Modified `handleFileUpload` to:

1. Use `useAppStore.getState()` inside the FileReader callback to always get the CURRENT state from Zustand
2. Check `currentState[tabId].images` for duplicates using the fresh state
3. Call store actions (`addImage`, `createNewMiniature`) via `currentState` to ensure they work with the latest data
4. Keep `isUploadingRef` to prevent concurrent upload operations

**Key Insight:** React closures capture values at render time. When dealing with async operations (like FileReader), always use `store.getState()` to access current values rather than relying on closure-captured state.

### Bug Fix: Uploaded Image Persistence (2026-02-07)

**Issue:** Uploaded images were stored in local component state only, not persisted to IndexedDB. Reloading the page would lose the uploaded image.

**Solution:** Modified `handleFileUpload` in `GenerationScreen` to:

1. Check if a session exists (currentSessionId)
2. If not, create a new miniature in the latest collection:
   - Uses `currentCollectionId` if set
   - Falls back to the most recently updated collection (`latestCollection`)
   - Calls `createNewMiniature(collectionId)` to create session
3. Persist uploaded image via `addImage()`:
   - Creates `GeneratedImage` object with uploaded data URL
   - Sets prompt as "Uploaded: {filename}"
   - Saves to IndexedDB via existing persistence chain
4. Shows error if no collections exist

**Key Changes:**

- Upload now requires a collection context
- Latest collection (by updatedAt) used as default
- Uploaded images appear in sidebar immediately
- Full persistence across page reloads
- Works with drag-and-drop and click-to-upload

---

## ESLint and Prettier Configuration (2026-02-07)

### Overview

Set up super-strict ESLint and Prettier configuration to maintain code quality and consistency.

### Tools Installed

- **ESLint 9.x** - Linting with flat config (eslint.config.mjs)
- **Prettier 3.x** - Code formatting
- **typescript-eslint** - TypeScript-specific rules
- **eslint-plugin-react** - React-specific rules
- **eslint-plugin-react-hooks** - React Hooks rules
- **eslint-plugin-import** - Import ordering and validation
- **@trivago/prettier-plugin-sort-imports** - Automatic import sorting

### Key Configuration Decisions

**ESLint Rules (Strict):**

- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/no-unsafe-*`: error (all unsafe operations)
- `@typescript-eslint/strict-boolean-expressions`: warn
- `@typescript-eslint/no-misused-promises`: error
- `react-hooks/rules-of-hooks`: error
- `react-hooks/exhaustive-deps`: error
- `import/no-cycle`: error
- `no-console`: warn (allows warn/error)

**Prettier Configuration:**

- Single quotes
- Trailing commas (all)
- 100 character print width
- 2 space tab width
- Import sorting enabled

**Scripts Added:**

- `npm run lint` - Check for lint errors
- `npm run lint:fix` - Auto-fix lint errors
- `npm run format` - Format all files
- `npm run format:check` - Check formatting
- `npm run check` - Run typecheck + lint + format check

### Notable Lint Fixes Applied

1. **Promise-returning functions in event handlers** - Wrapped with `void` operator
2. **Nullish coalescing** - Changed `||` to `??` where appropriate
3. **Config files exclusion** - Excluded `eslint.config.mjs` and `postcss.config.js` from TypeScript parsing
4. **Import ordering** - All imports now sorted automatically

### Current Status

- **0 errors** (all critical issues fixed)
- **33 warnings** (mostly strict-boolean-expressions, acceptable)
- Build passes successfully
- All features working correctly

### Future Enhancements (Not Implemented)

---

## Feature 3: User Attachments to Prompts (2026-02-12)

### Overview

Added support for attaching image files to prompts for both frontal and back views. These attachments are sent to Gemini as inline data parts, providing additional visual context for generation.

### Implementation Details

**Attachment Flow:**

1. User clicks plus (+) button to the left of the prompt textarea
2. File picker opens with multi-select support
3. Selected images are converted to data URLs via FileReader
4. Attachments displayed as removable chips below the textarea
5. On generation, attachments sent as `inlineData` parts before the text prompt
6. Attachments cleared automatically after successful generation

**Key Features:**

- Plus button appears only on frontal and back views (not base)
- Multiple image selection supported
- File validation (image type, 5MB max size)
- Chips show truncated filename with file icon
- Individual chip removal via X button
- One-shot only - not persisted to store or database

**Files Modified:**

- `src/services/gemini.ts` - Added `Attachment` interface and updated `generateImage` to include attachment parts
- `src/components/GenerationScreen.tsx` - Added attachment UI, handlers, and integration
- `src/screens/FrontalViewScreen.tsx` - Enabled `allowAttachments`
- `src/screens/BackViewScreen.tsx` - Enabled `allowAttachments`

**Files Created:**

- `src/components/AttachmentChip.tsx` - Reusable chip component for displaying attachments
- `src/components/ui/badge.tsx` - shadcn/ui Badge component (installed via CLI)

**API Changes:**

- `GenerateImageOptions.attachments?: readonly Attachment[]` - optional array of attachments
- Attachments are converted to `inlineData` parts and sent before text prompt
- Backward compatible - works without attachments

### UI/UX Decisions

**Plus Button:**

- Positioned to the left of the prompt textarea
- Uses Lucide `Plus` icon
- Variant: outline for subtle appearance
- Disabled during generation
- Tooltip: "Attach reference images"

**Attachment Chips:**

- Displayed below the textarea in a horizontal flex wrap
- Uses shadcn/ui Badge component with `secondary` variant
- Shows file icon + truncated filename (max 20 chars)
- Remove button with hover state (red background)

**Error Handling:**

- Invalid file type: Shows error message
- File too large (>5MB): Shows error message
- File read failure: Shows error message

### Technical Notes

**State Management:**

- Attachments stored in component state only (not global store)
- Cleared after successful generation
- Preserved on generation error (allows retry)

**Memory Considerations:**

- Large images temporarily stored as data URLs
- Released when attachments are cleared
- Be mindful of Gemini's context window limits

### Implementation Findings

**Exporting Helper Functions:**

- Exported `dataUrlToBase64` from `gemini.ts` to reuse in `GenerationScreen` for attachment processing
- This avoids code duplication when converting file uploads to base64 format

**Component-Level State for One-Shot Data:**

- Attachments use React's `useState` instead of Zustand global store
- Rationale: Data is temporary and shouldn't persist or be shared across components
- Pattern: `const [attachments, setAttachments] = React.useState<Attachment[]>([])`

**shadcn/ui CLI Usage:**

- Badge component installed via: `npx shadcn@latest add badge`
- CLI automatically handles dependencies and creates properly formatted component
- Required manual addition of return type to satisfy ESLint `explicit-function-return-type` rule

**File Upload Handling:**

- Used `multiple` attribute on file input to allow multi-select
- FileReader processes each file asynchronously via `readAsDataURL()`
- Reset input value after selection to allow re-selecting same file

---

## Future Enhancements (Not Implemented)

- Collection reordering (currently sorted by updatedAt desc)
- Session reordering within collections
- Bulk operations (move multiple miniatures at once)
- Collection-level metadata (description, tags)
- Miniature-level metadata (tags, notes)
- Upload to back/base views
- Multiple reference images
- Image cropping/editing before upload
