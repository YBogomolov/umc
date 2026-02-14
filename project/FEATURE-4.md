# Feature 4: Collections Revamp

## Overview

Enhance the Collections system to support rich descriptions that are embedded into system prompts for image generation. Users can now add optional but encouraged visual descriptions to collections that guide all miniatures within that collection.

## Acceptance Criteria

- [ ] When creating a new collection, users see a dialog with title input and rich description textarea
- [ ] Collection description (if not empty) is embedded in system prompts for frontal and back view generation
- [ ] Users can edit both title and description via pencil icon (same dialog, pre-filled)
- [ ] Generation screen displays collection title and description above tabs
- [ ] Empty description doesn't cause empty row (save screen real estate)
- [ ] Existing DB entries load without issues and are converted on-the-fly to new format

---

## Database Schema Changes

### Version 2 → 3 Migration

**New Collection Interface:**

```typescript
interface Collection {
  readonly id: CollectionId;
  readonly name: string;
  readonly description: string; // NEW: optional rich description
  readonly createdAt: number;
  readonly updatedAt: number;
}
```

**Migration Strategy:**

- Add `description` field to Collection interface in `db.ts`
- Update IndexedDB version to 3
- Migration runs automatically on app load
- Existing collections get empty string for description (backward compatible)

---

## Implementation Steps

### Step 1: Database Layer Updates

**File: `src/services/db.ts`**

1. Update `Collection` interface to include `description: string`
2. Increment DB_VERSION from 2 to 3
3. Add migration logic for version 2→3:
   - Iterate all collections
   - Add `description: ''` to each
4. Update `saveCollection` to handle description field
5. Update `listCollections` and `getCollection` return types

**Migration Code Pattern:**

```typescript
// In upgrade callback
if (oldVersion < 3) {
  // Add description field to existing collections
  const collectionStore = transaction.objectStore('collections');
  const collections = await collectionStore.getAll();
  for (const collection of collections) {
    if (!('description' in collection)) {
      await collectionStore.put({ ...collection, description: '' });
    }
  }
}
```

---

### Step 2: Store Updates

**File: `src/store/types.ts`**

1. Update `Collection` interface:

   ```typescript
   export interface Collection {
     readonly id: CollectionId;
     readonly name: string;
     readonly description: string; // NEW
     readonly createdAt: number;
     readonly updatedAt: number;
   }
   ```

2. Update collection action signatures:
   - `createCollection: (name: string, description: string) => Promise<void>`
   - `updateCollection: (collectionId: CollectionId, updates: { name?: string; description?: string }) => Promise<void>` // Replaces renameCollection

**File: `src/store/index.ts`**

1. Update `dbCollectionToCollection` mapper
2. Update `createCollection` action to accept description
3. Replace `renameCollection` with `updateCollection` that handles partial updates
4. Update all places that call collection actions

---

### Step 3: Collection Dialog Component

**File: `src/components/CollectionDialog.tsx`** (NEW)

Create a reusable dialog component for creating and editing collections:

```typescript
interface CollectionDialogProps {
  mode: 'create' | 'edit';
  initialName?: string;
  initialDescription?: string;
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
  open: boolean;
}
```

**UI Elements:**

- Title input with default "New Collection" (create) or current name (edit)
- Description textarea with placeholder about visual details
- Optional helper text explaining that descriptions guide image generation
- Save and Cancel buttons
- Form validation (name required, description optional)

**Design Notes:**

- Use shadcn/ui Dialog component
- Description textarea should be at least 4 rows
- Helper text: "Optional: Add visual details shared across all minis in this collection (e.g., art style, color palette, setting). These will be included in generation prompts."

---

### Step 4: Sidebar Updates

**File: `src/components/Sidebar.tsx`**

1. Add state for dialog management:

   ```typescript
   const [dialogState, setDialogState] = React.useState<
     { mode: 'create' } | { mode: 'edit'; collectionId: CollectionId; name: string; description: string } | null
   >(null);
   ```

2. Add "New Collection" button at top of sidebar (above collections list)

3. Update pencil icon behavior:
   - Opens edit dialog with current name and description pre-filled
   - Remove inline rename input field

4. Update collection deletion confirmation to work with dialog state

5. Integrate `CollectionDialog` component

---

### Step 5: Prompt Integration

**File: `src/services/gemini.ts`**

1. Update `GenerateImageOptions` interface:

   ```typescript
   interface GenerateImageOptions {
     apiKey: string;
     type: GenerationType;
     userPrompt: string;
     referenceImageDataUrl?: string;
     modelName?: string;
     attachments?: readonly Attachment[];
     collectionDescription?: string; // NEW
   }
   ```

2. Update `buildPrompt` function to include collection description for frontal and back views:
   ```typescript
   const buildPrompt = (type: GenerationType, userPrompt: string, collectionDescription?: string): string => {
     const basePrompt = /* existing logic */;

     if ((type === 'frontal' || type === 'back') && collectionDescription && collectionDescription.trim()) {
       return `${basePrompt}
   ```

The character whose image you will be generating belongs to a collection with the following description:

<description>
${collectionDescription.trim()}
</description>

If this information contains any hints about visual representation of the character (e.g., clothes, posture and physical complexion, belonging to a certain social group that implies very specific visual attributes, armour, weapons, hair style, etc.) — you absolutely MUST take this into account when creating the image.`;
}

     return basePrompt;

};

```

3. Pass `collectionDescription` through to `generateContent` call

---

### Step 6: GenerationScreen Updates

**File: `src/components/GenerationScreen.tsx`**

1. Add collection info display above tabs:
- Query current collection via `currentMiniId` → mini → `collectionId`
- Display collection name (small, muted text)
- Display collection description if present (italic, smaller text)
- Use conditional rendering to avoid empty rows

2. Pass collection description to `generateImage` call:
- Get current mini's collection
- Pass `collectionDescription` to generate options

**UI Layout:**
```

[Collection Name] - [Mini Name]
[Collection Description - if not empty, italic]
[Tabs: Frontal | Back | Base]
[Generation content...]

```

---

### Step 7: Screen Component Updates

**Files: `src/screens/FrontalViewScreen.tsx`, `src/screens/BackViewScreen.tsx`**

1. Ensure they pass collection context to GenerationScreen (may be automatic via store)
2. No major changes needed if GenerationScreen handles collection lookup internally

---

## Migration Details

### Lazy Migration Approach

Following the pattern from Feature 1 (Collections), we'll use lazy migration:

1. Migration runs on app initialization
2. Detects if collections have `description` field
3. Adds empty string to collections without it
4. Non-blocking - app loads immediately

### Backward Compatibility

- Old collections load with empty description
- New code treats empty description as "no description"
- No breaking changes to existing functionality

---

## Testing Checklist

### Database & Migration
- [ ] Existing collections load without errors
- [ ] Collections from v2 get empty description
- [ ] New collections save with description
- [ ] Collection edits persist correctly

### UI/UX
- [ ] "New Collection" button opens dialog
- [ ] Dialog has title input and description textarea
- [ ] Pencil icon opens edit dialog with pre-filled values
- [ ] Cancel button closes dialog without changes
- [ ] Save button persists changes
- [ ] Empty description doesn't show in GenerationScreen
- [ ] Non-empty description displays correctly above tabs

### Prompt Integration
- [ ] Frontal view generation includes collection description in prompt
- [ ] Back view generation includes collection description in prompt
- [ ] Base view generation does NOT include collection description
- [ ] Empty collection description doesn't add extra text to prompt
- [ ] Description is properly formatted in prompt

### Edge Cases
- [ ] Mini without collection (shouldn't happen, but handle gracefully)
- [ ] Collection with only whitespace in description (treat as empty)
- [ ] Very long descriptions (should wrap/display properly)
- [ ] Special characters in description (escape properly if needed)

---

## File Changes Summary

### Modified Files
1. `src/services/db.ts` - Add description field, migration v2→3
2. `src/store/types.ts` - Update Collection interface and actions
3. `src/store/index.ts` - Update store actions and mappers
4. `src/services/gemini.ts` - Add collectionDescription to prompts
5. `src/components/Sidebar.tsx` - Add dialog integration, remove inline rename
6. `src/components/GenerationScreen.tsx` - Display collection info, pass to generator

### New Files
1. `src/components/CollectionDialog.tsx` - Reusable create/edit dialog

### Potentially Modified (if needed)
1. `src/screens/FrontalViewScreen.tsx` - Verify collection context flow
2. `src/screens/BackViewScreen.tsx` - Verify collection context flow

---

## Notes

- Keep description optional but encourage users to provide visual details
- Description should influence generation but not override user prompt
- Use existing shadcn/ui components (Dialog, Input, Textarea, Button)
- Follow existing code style: functional programming, readonly types, explicit return types
- Maintain immutability - never mutate function arguments
```
