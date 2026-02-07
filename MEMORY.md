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

### Future Enhancements (Not Implemented)

- Collection reordering (currently sorted by updatedAt desc)
- Session reordering within collections
- Bulk operations (move multiple miniatures at once)
- Collection-level metadata (description, tags)
- Miniature-level metadata (tags, notes)
