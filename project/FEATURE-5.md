# Feature 5: Backup and Restore

## Status: 📋 PLANNED

## Overview

Expand the settings functionality to allow users to backup and restore their entire database. The "Change API Key" button in the sidebar is renamed to "Settings" and now provides access to API key management, backup, and restore functionality.

---

## User Requirements (Final)

1. ✅ Rename "Change API Key" button to "Settings"
2. ✅ Backup: Export entire database to a ZIP file
3. ✅ Backup file naming: `{db-name}_{iso-datetime}.zip`
4. ✅ Backup contains: all database data + metadata JSON file
5. ✅ Restore: Upload backup ZIP file
6. ✅ Restore confirmation dialog shows comparison (current vs backup stats)
7. ✅ Restore is destructive - replaces entire database
8. ✅ Metadata includes: DB name, version, collections count, minis count, images count

---

## Data Model

### BackupMetadata

```typescript
interface BackupMetadata {
  readonly version: number; // App/database version (DB_VERSION)
  readonly dbName: string; // Database name (e.g., "umc-db")
  readonly createdAt: string; // ISO timestamp
  readonly collections: readonly Collection[];
  readonly minis: readonly MiniRecord[];
  readonly stats: {
    readonly collectionsCount: number;
    readonly minisCount: number;
    readonly imagesCount: number;
  };
}
```

### BackupFile Structure

```
backup.zip
├── metadata.json          // BackupMetadata
├── collections.json       // All collections
├── minis.json            // All mini records
└── images/               // Folder with all images
    ├── {miniId}_{tab}_{timestamp}.png
    └── ...
```

---

## Implementation Steps

### Step 1: Rename Sidebar Button

**File:** `src/components/Sidebar.tsx`

1. Change button text from "Change API Key" to "Settings"
2. Update icon from `Key` to `Settings` (Lucide)

**TODO:**

- [ ] Update button label and icon

---

### Step 2: Expand Settings Dialog

**File:** `src/components/SettingsDialog.tsx`

Current dialog only has API key input. Expand to have tabs or sections:

```
Settings Dialog
├── API Key Section
│   └── [API Key input] [Save]
├── Backup Section
│   └── [Backup Database] button
└── Restore Section
    ├── [Restore Database] button (opens file picker)
    └── (Hidden until file selected)
```

**TODO:**

- [ ] Restructure dialog layout with sections
- [ ] Keep existing API key functionality
- [ ] Add Backup button
- [ ] Add Restore button with file input
- [ ] Update dialog title to "Settings"

---

### Step 3: Backup Service

**File:** `src/services/backup.ts` (NEW)

Create service to handle backup creation:

```typescript
export interface BackupData {
  readonly metadata: BackupMetadata;
  readonly imageBlobs: ReadonlyArray<{
    readonly fileName: string;
    readonly blob: Blob;
  }>;
}

export async function createBackup(): Promise<BackupData>;
export function generateBackupFileName(dbName: string): string;
export async function downloadBackup(backupData: BackupData): Promise<void>;
```

**Implementation details:**

1. Fetch all collections from `listCollections()`
2. Fetch all minis from `listMinis()`
3. Fetch all images from `listAllImages()` (need to add this function to db.ts)
4. Create metadata JSON
5. Create ZIP using JSZip (already in dependencies)
6. Trigger download

**TODO:**

- [ ] Create `backup.ts` service file
- [ ] Implement `createBackup()`
- [ ] Implement `generateBackupFileName()`
- [ ] Implement `downloadBackup()`

---

### Step 4: Database Updates for Backup

**File:** `src/services/db.ts`

Add function to list all images:

```typescript
export async function listAllImages(): Promise<ImageRecord[]>;
```

**TODO:**

- [ ] Add `listAllImages()` function to db.ts

---

### Step 5: Restore Service

**File:** `src/services/restore.ts` (NEW)

Create service to handle restore:

```typescript
export interface RestorePreview {
  readonly metadata: BackupMetadata;
  readonly currentStats: {
    readonly collectionsCount: number;
    readonly minisCount: number;
    readonly imagesCount: number;
  };
}

export async function loadBackupPreview(file: File): Promise<RestorePreview>;
export async function restoreFromBackup(file: File): Promise<void>;
```

**Implementation details:**

1. Parse ZIP file
2. Extract and validate metadata.json
3. Return preview data for confirmation dialog
4. On restore:
   - Clear all existing data from stores
   - Restore collections
   - Restore minis
   - Restore images (convert files back to blobs)
   - Reload app state

**TODO:**

- [ ] Create `restore.ts` service file
- [ ] Implement `loadBackupPreview()`
- [ ] Implement `restoreFromBackup()`
- [ ] Add ZIP parsing logic

---

### Step 6: Restore Confirmation Dialog

**File:** `src/components/RestoreConfirmDialog.tsx` (NEW)

Dialog shown before destructive restore:

```typescript
interface RestoreConfirmDialogProps {
  readonly preview: RestorePreview;
  readonly open: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}
```

**UI Layout:**

```
⚠️ Restore Database

This action will replace all current data with the backup.

Current Database:
  Version: 5
  Collections: 5
  Minis: 23
  Images: 67

Backup File:
  Created: 2026-02-16T10:30:00Z
  Database: umc-db
  Version: 4
  Collections: 3
  Minis: 12
  Images: 36

[Cancel] [Restore - I understand this will delete current data]
```

**TODO:**

- [ ] Create RestoreConfirmDialog component
- [ ] Display current vs backup comparison
- [ ] Require explicit confirmation

---

### Step 7: Settings Dialog Integration

**File:** `src/components/SettingsDialog.tsx`

Integrate backup/restore functionality:

1. **Backup flow:**
   - User clicks "Backup Database" button
   - Show loading state while creating backup
   - Trigger file download
   - Show success toast

2. **Restore flow:**
   - User clicks "Restore Database" button → opens file picker
   - User selects ZIP file
   - Load preview using `loadBackupPreview()`
   - Show RestoreConfirmDialog with preview data
   - On confirm: run `restoreFromBackup()`
   - Show loading state
   - On success: reload page or refresh store
   - On error: show error message

**TODO:**

- [ ] Add backup button handler
- [ ] Add restore file picker
- [ ] Integrate RestoreConfirmDialog
- [ ] Handle loading states
- [ ] Add success/error toasts

---

## UI/UX Specifications

### Settings Button (Sidebar)

- **Text:** "Settings" (was "Change API Key")
- **Icon:** `Settings` from Lucide
- **Position:** Same as current button (bottom of sidebar)

### Settings Dialog

**Layout:**

- Title: "Settings"
- Sections separated by dividers:
  1. API Key
  2. Backup
  3. Restore

**API Key Section:**

- Label: "Google AI Studio API Key"
- Input: Password type with show/hide toggle
- Helper text: "Your API key is stored locally in your browser"
- Button: "Save API Key"

**Backup Section:**

- Label: "Backup Database"
- Helper text: "Download a complete backup of all your collections and miniatures"
- Button: "Download Backup" (primary variant)

**Restore Section:**

- Label: "Restore Database"
- Helper text: "Restore from a previous backup. This will replace all current data."
- Button: "Upload Backup File" (outline variant)
- Hidden file input accepts `.zip` files only

### Restore Confirmation Dialog

**Warning styling:**

- Use destructive/alert colors
- Warning icon at top
- Clear statement that this is destructive

**Comparison table:**

```
| Metric        | Current | Backup |
|---------------|---------|--------|
| Collections   | 5       | 3      |
| Minis         | 23      | 12     |
| Images        | 67      | 36     |
```

**Buttons:**

- Cancel: secondary variant
- Restore: destructive variant with confirmation text

---

## File Changes Summary

### Modified Files

1. `src/components/Sidebar.tsx` - Rename button, update icon
2. `src/components/SettingsDialog.tsx` - Expand with backup/restore sections
3. `src/services/db.ts` - Add `listAllImages()` function

### New Files

1. `src/services/backup.ts` - Backup creation logic
2. `src/services/restore.ts` - Restore logic
3. `src/components/RestoreConfirmDialog.tsx` - Restore confirmation UI

---

## Testing Checklist

### Backup

- [ ] Clicking "Settings" opens the dialog
- [ ] API key section works as before
- [ ] Backup button creates ZIP file
- [ ] ZIP file has correct naming format
- [ ] ZIP contains metadata.json
- [ ] ZIP contains all collections data
- [ ] ZIP contains all minis data
- [ ] ZIP contains all images
- [ ] Success feedback shown after download

### Restore

- [ ] Restore button opens file picker
- [ ] Only ZIP files can be selected
- [ ] Confirmation dialog shows after selecting file
- [ ] Dialog displays current DB stats correctly
- [ ] Dialog displays backup stats correctly
- [ ] Comparison table is accurate
- [ ] Cancel button closes dialog without changes
- [ ] Restore button replaces database
- [ ] After restore, all collections are restored
- [ ] After restore, all minis are restored
- [ ] After restore, all images are restored
- [ ] App state refreshes after restore
- [ ] Error handling for invalid/corrupted backup files

### Edge Cases

- [ ] Empty database backup works
- [ ] Large database backup doesn't timeout
- [ ] Restore after page reload works
- [ ] Restore with corrupted ZIP shows error
- [ ] Restore with missing metadata shows error
- [ ] Restore with newer version backup shows warning

---

## Dependencies

**No new packages required.** Uses existing:

- `jszip` (already in dependencies for collection downloads)
- Native FileReader API
- `file-saver` or native download (already available)

---

## Notes

- Backup is a complete snapshot - no partial backup/restore
- Image files in backup are named to be human-readable but machine-parseable
- Consider adding progress indicator for large backups
- Restore requires page reload or full store reset to ensure clean state
- Follow existing code patterns: functional style, readonly types, no mutations
- Use existing shadcn/ui components (Dialog, Button, Table for comparison)
