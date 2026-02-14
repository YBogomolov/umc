# Feature 1: Collections

## Overview
Implement a Collections system to group miniatures into collapsible, manageable collections with drag-and-drop support, individual miniature naming, and collection-based downloads.

---

## User Requirements (Final)

1. ✅ Keep existing `name` field as miniature name (no `miniName`)
2. ✅ Generate random 2-word names for new miniatures (e.g., "Iron Guardian")
3. ✅ Collection deletion: Only empty collections can be deleted
4. ✅ Drag & drop: Use @dnd-kit/core + @dnd-kit/sortable
5. ✅ Empty collections: Kept until user manually deletes
6. ✅ Timestamps: Display "Created X days ago" under each miniature
7. ✅ Download individual images (not ZIP)
8. ✅ Download entire collection as ZIP

---

## Data Model

### Collection
```typescript
interface Collection {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}
```

### Updated MiniRecord
```typescript
interface MiniRecord {
  id: string;
  collectionId: CollectionId;     // NEW - links to collection
  name: string;             // EXISTING - now used as miniature name (editable)
  createdAt: number;
  updatedAt: number;
  frontalThumbDataUrl: string | null;
  selectedImages: Record<TabId, string | null>;
  geminiModel: GeminiModel;
}
```

---

## Database Migration (v1 → v2)

**File:** `src/services/db.ts`

```typescript
const DB_VERSION = 2;

// Migration logic in upgrade callback:
if (oldVersion < 2) {
  // 1. Create collections store
  db.createObjectStore("collections", { keyPath: "id" });
  
  // 2. Create default "Example collection"
  const defaultCollectionId = generateId();
  await collectionStore.add({
    id: defaultCollectionId,
    name: "Example collection",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  
  // 3. Migrate all minis - add collectionId
  const miniStore = transaction.objectStore("minis");
  let cursor = await miniStore.openCursor();
  while (cursor) {
    const mini = cursor.value;
    mini.collectionId = defaultCollectionId;
    // Rename "Untitled" to random name
    if (mini.name === "Untitled") {
      mini.name = generateMiniName();
    }
    await cursor.update(mini);
    cursor = await cursor.continue();
  }
}
```

---

## Implementation Phases

### Phase 1: Database & Types
**Files:**
- `src/services/db.ts` - Add collections store, migration v1→v2
- `src/store/types.ts` - Add Collection type, update MiniRecord

**TODO:**
- [ ] Update DB_VERSION to 2
- [ ] Add Collection interface
- [ ] Update MiniRecord with collectionId
- [ ] Create migration logic
- [ ] Add collections to DBSchema

---

### Phase 2: Name Generator Utility
**File:** `src/lib/nameGenerator.ts`

**TODO:**
- [ ] Create word lists (adjectives + nouns)
- [ ] Implement `generateMiniName(): string`
- [ ] Export function

**Word list ideas:**
- Adjectives: Iron, Mystic, Ancient, Crimson, Shadow, Golden, Frozen, Storm
- Nouns: Guardian, Wolf, Knight, Drake, Spirit, Titan, Seeker, Blade

---

### Phase 3: Time Ago Utility
**File:** `src/lib/timeAgo.ts`

**TODO:**
- [ ] Implement `timeAgo(timestamp: number): string`
- [ ] Format: "2 minutes ago", "3 hours ago", "5 days ago", "Jan 15"

---

### Phase 4: Store Updates
**File:** `src/store/index.ts`

**New State:**
- `collections: Collection[]`
- `currentcollectionId: CollectionId | null`

**New Actions:**
- `createCollection(name: string): Promise<void>`
- `renameCollection(id: string, name: string): Promise<void>`
- `deleteCollection(id: string): Promise<void>`
- `moveMiniToCollection(miniId: string, collectionId: CollectionId): Promise<void>`
- `updateMiniName(miniId: string, name: string): Promise<void>` (debounced, 500ms)
- `createNewMiniature(collectionId: CollectionId): void`

**Refactor:**
- `newMini()` → requires `collectionId` parameter
- Mini creation uses `generateMiniName()` for default name

**TODO:**
- [ ] Add collections state
- [ ] Add currentCollectionId state
- [ ] Implement createCollection
- [ ] Implement renameCollection
- [ ] Implement deleteCollection (check if empty)
- [ ] Implement moveMiniToCollection
- [ ] Implement updateMiniName with debounce
- [ ] Refactor newMini to accept collectionId
- [ ] Update newMini to generate random name

---

### Phase 5: Install Dependencies
**New packages:**
- `@dnd-kit/core`
- `@dnd-kit/sortable`

**TODO:**
- [ ] `npm install @dnd-kit/core @dnd-kit/sortable`

---

### Phase 6: Sidebar Refactor
**File:** `src/components/Sidebar.tsx`

**New Structure:**
```
Sidebar
├── CollectionGroup (collapsible)
│   ├── Header: [name] [pencil] [trash - disabled if not empty]
│   ├── MiniatureItem[]
│   │   └── [thumbnail] [name] [Created X ago] [hover: delete]
│   └── [+ Add miniature]
├── Footer: [Download collection] (when expanded)
└── Footer: [Change API Key]
```

**Features:**
- Collapsible collection groups (default: expanded)
- Rename collection: inline input with check/x buttons
- Delete collection: disabled if not empty, or confirmation dialog
- Add miniature: creates new mini with random name in collection
- Drag & drop: move miniatures between collections
- Timestamp: "Created X days ago" under miniature name
- Download collection: ZIP with all miniatures

**TODO:**
- [ ] Create CollectionGroup component
- [ ] Add collapse/expand functionality
- [ ] Add collection rename UI (pencil icon, inline edit)
- [ ] Add collection delete (disabled if has miniatures)
- [ ] Update MiniatureItem with timestamp
- [ ] Add "Add miniature" button
- [ ] Implement drag & drop with @dnd-kit
- [ ] Add "Download collection" button
- [ ] Update layout and styling

---

### Phase 7: Generation Screen Updates
**File:** `src/components/GenerationScreen.tsx`

**Changes:**
- Add name input at top (above model selector)
- Debounced auto-save on name change (500ms)
- Remove "Download ZIP" button
- Add per-image download button (hover-triggered in lower right of image)

**TODO:**
- [ ] Add name input field
- [ ] Implement debounced name update
- [ ] Remove Download ZIP button
- [ ] Add per-image download on hover
- [ ] Update download naming: "{miniName} - {view}.{ext}"

---

### Phase 8: Download Service Updates
**File:** `src/services/download.ts`

**New functions:**
```typescript
downloadSingleImage(
  dataUrl: string, 
  miniName: string, 
  view: 'frontal' | 'back' | 'base'
): void

downloadCollection(
  collectionId: CollectionId,
  minis: MiniWithImages[]
): Promise<void>
```

**TODO:**
- [ ] Implement downloadSingleImage
- [ ] Implement downloadCollection
- [ ] Update naming conventions

---

## UI/UX Specifications

### Collection Group
- Collapsible (default: expanded)
- Header shows collection name
- Hover shows pencil (rename) and trash (delete) icons
- Trash disabled if collection has miniatures
- Delete confirmation required

### Miniature Item
- Thumbnail (64x64) on left
- Name in middle (truncate if long)
- Timestamp "Created X ago" below name
- Delete icon on hover (top right)
- Click to load mini

### Add Miniature Button
- Plus icon + "Add miniature" text
- Creates new mini with random name
- Auto-selects new mini

### Name Input (Generation Screen)
- Position: Top of screen, above model selector
- Placeholder: "Miniature name"
- Default: Random 2-word name
- Debounced save: 500ms
- No save button needed

### Per-Image Download
- Trigger: Hover over main image
- Icon: Download icon in lower right corner
- Naming: "{miniName} - {view}.{ext}"

### Collection Download
- Button below miniature list when collection expanded
- Creates ZIP with folder per miniature
- Each folder contains: frontal.png, back.png, base.png (if exists)

---

## Testing Checklist

- [ ] Migration works: existing minis moved to "Example collection"
- [ ] "Untitled" minis renamed to random names
- [ ] New minis get random names
- [ ] Name changes debounced and saved
- [ ] Collection create/rename/delete works
- [ ] Cannot delete non-empty collection
- [ ] Drag & drop moves miniatures between collections
- [ ] Timestamps display correctly
- [ ] Individual image download works
- [ ] Collection download creates correct ZIP structure
- [ ] Empty collections persist until deleted

---

## Dependencies

**New packages to install:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

---

## Notes

- Use shadcn/ui components exclusively
- Follow existing code patterns (functional style, TypeScript strict)
- Avoid `any` types
- Keep MEMORY.md updated with architectural decisions
- Update this TODO list as phases complete
