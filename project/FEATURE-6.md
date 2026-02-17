# Feature 6: Cloud Storage

## Status: 📋 PLANNED

## Overview

This feature introduces a "Cloud Storage" backend using Google Drive. It builds upon the "Backup and Restore" functionality (Feature 5) but automates the storage to the cloud, removing the need for manual file handling.

The sync is **manual-only** to preserve the "local-first" architecture and avoid complex merge conflict resolution. The local IndexedDB remains the single source of truth for the UI. The cloud acts purely as a dumb storage container for the snapshot.

---

## User Requirements (Final)

1. ✅ Expand "Settings" dialog with "Cloud Storage" section
2. ✅ Initial state shows "Connect Google Drive" button
3. ✅ OAuth 2.0 flow in popup for authentication
4. ✅ After auth, show status panel with:
   - Connected user's email address
   - "Disconnect" button (logout)
   - Last successful cloud sync timestamp (or "Never synced")
5. ✅ "Push to Cloud" button: Uploads backup directly to Google Drive
6. ✅ "Pull from Cloud" button: Downloads and restores from cloud backup
7. ✅ Destructive confirmation dialog for Pull (reuse Feature 5 dialog)
8. ✅ Only maintain most recent backup in cloud (single file, update or replace)

---

## Technical Implementation

### OAuth and Scope

- **SDK**: Google Identity Services SDK
- **Scope**: `https://www.googleapis.com/auth/drive.appdata`
- **Critical**: This scope ensures the app only accesses its own hidden `appDataFolder` and **cannot** see user's personal files

### Storage Strategy

- **Format**: Same ZIP archive as Feature 5 backup
- **Location**: Strictly in `appDataFolder` (Google Drive app-specific hidden folder)
- **Versioning**: Single file only - most recent backup overwrites previous
- **File identification**: Custom properties or filename pattern to identify backup file

### Sync Logic

- **Manual only**: No automatic sync, no background sync
- **Local-first**: IndexedDB remains source of truth
- **Cloud as snapshot**: Dumb storage container for backup archives

---

## Data Model

### CloudStorageState

```typescript
interface CloudStorageState {
  readonly isAuthenticated: boolean;
  readonly userEmail: string | null;
  readonly lastSyncAt: string | null; // ISO timestamp
  readonly isLoading: boolean;
}
```

### GoogleDriveFile (for backup file)

```typescript
interface GoogleDriveBackupFile {
  readonly id: string; // Google Drive file ID
  readonly name: string; // e.g., "umc-backup.zip"
  readonly modifiedTime: string; // ISO timestamp from Drive
  readonly size: number; // File size in bytes
}
```

---

## Implementation Steps

### Step 1: Add Google Identity Services SDK

**Action:** Add script tag to index.html or install via npm

**Options:**

- Option A: Add `<script src="https://accounts.google.com/gsi/client" async defer></script>` to index.html
- Option B: Install `@google-cloud/google-oauth2` or similar package if available

**TODO:**

- [ ] Add Google Identity Services SDK to the project
- [ ] Configure OAuth 2.0 Client ID (will need to be provided or configured)

---

### Step 2: Create Cloud Storage Service

**File:** `src/services/cloudStorage.ts` (NEW)

Create service to handle Google Drive operations:

```typescript
// Authentication
export function initializeGoogleAuth(clientId: string): void;
export function signIn(): Promise<void>;
export function signOut(): Promise<void>;
export function getCurrentUser(): { email: string } | null;

// File operations
export async function findBackupFile(): Promise<GoogleDriveBackupFile | null>;
export async function uploadBackup(zipBlob: Blob): Promise<void>;
export async function downloadBackup(): Promise<Blob>;
export async function deleteBackupFile(fileId: string): Promise<void>;

// State
export function getLastSyncTime(): string | null;
export function setLastSyncTime(timestamp: string): void;
```

**Implementation details:**

1. **Authentication:**
   - Use GIS `google.accounts.oauth2.initTokenClient` for OAuth
   - Request `drive.appdata` scope only
   - Store access token in memory (not localStorage for security)
   - Handle token refresh automatically

2. **File Operations:**
   - Use Google Drive API v3
   - Search for existing backup file in appDataFolder using `q` parameter
   - Upload using `multipart` upload for metadata + content
   - Download using `alt=media` parameter
   - Delete old file before uploading new one (or use update)

3. **Error Handling:**
   - Handle network errors
   - Handle auth expiration (401)
   - Handle quota exceeded errors
   - Handle file not found errors

**TODO:**

- [ ] Create `cloudStorage.ts` service file
- [ ] Implement `initializeGoogleAuth()`
- [ ] Implement `signIn()` and `signOut()`
- [ ] Implement `findBackupFile()`
- [ ] Implement `uploadBackup()`
- [ ] Implement `downloadBackup()`
- [ ] Implement token refresh logic

---

### Step 3: Create Cloud Storage Store Slice

**File:** `src/store/types.ts` (MODIFY)

Add to AppState:

```typescript
interface AppState {
  // ... existing state

  // Cloud Storage
  readonly cloudStorage: CloudStorageState;
}

interface AppActions {
  // ... existing actions

  // Cloud Storage Actions
  readonly setCloudAuth: (isAuthenticated: boolean, userEmail: string | null) => void;
  readonly setLastCloudSync: (timestamp: string) => void;
  readonly setCloudLoading: (isLoading: boolean) => void;
  readonly disconnectCloud: () => void;
}
```

**File:** `src/store/index.ts` (MODIFY)

Implement cloud storage actions:

```typescript
// Initial state
cloudStorage: {
  isAuthenticated: false,
  userEmail: null,
  lastSyncAt: localStorage.getItem('umc-last-cloud-sync'),
  isLoading: false,
}

// Actions
setCloudAuth: (isAuthenticated, userEmail) => set((state) => ({
  cloudStorage: { ...state.cloudStorage, isAuthenticated, userEmail }
})),

setLastCloudSync: (timestamp) => {
  localStorage.setItem('umc-last-cloud-sync', timestamp);
  set((state) => ({
    cloudStorage: { ...state.cloudStorage, lastSyncAt: timestamp }
  }));
},

// ... etc
```

**TODO:**

- [ ] Add CloudStorageState to types.ts
- [ ] Add cloud storage actions to AppActions
- [ ] Implement cloud storage slice in store/index.ts

---

### Step 4: Expand Settings Dialog with Cloud Storage Section

**File:** `src/components/SettingsDialog.tsx` (MODIFY)

Add new "Cloud Storage" section to Settings dialog:

```
Settings Dialog
├── API Key Section
│   └── [Existing content]
├── Backup Section
│   └── [Existing content]
├── Restore Section
│   └── [Existing content]
└── Cloud Storage Section (NEW)
    ├── Not Connected State:
    │   └── [Connect Google Drive] button
    └── Connected State:
        ├── Status: Connected as {email}
        ├── Last synced: {timestamp} or "Never synced"
        ├── [Disconnect] button
        ├── Divider
        ├── [Push to Cloud] button (with spinner)
        └── [Pull from Cloud] button (destructive style)
```

**Implementation details:**

1. **Not Connected State:**
   - Show "Connect Google Drive" button
   - On click: trigger `signIn()` from cloudStorage service
   - Show loading spinner during auth
   - Handle success: update store with auth state
   - Handle error: show error message

2. **Connected State:**
   - Show user email
   - Show last sync time (formatted nicely, "2 hours ago" or ISO)
   - "Disconnect" button calls `signOut()` and clears state
   - "Push to Cloud" button:
     - Creates backup using Feature 5 `createBackup()`
     - Uploads to Google Drive using `uploadBackup()`
     - Updates last sync timestamp
     - Shows progress/loading state
   - "Pull from Cloud" button:
     - Downloads backup using `downloadBackup()`
     - Shows confirmation dialog (reuse RestoreConfirmDialog from Feature 5)
     - On confirm: restore using Feature 5 `restoreFromBackup()` logic
     - Reloads page after restore

**TODO:**

- [ ] Add Cloud Storage section to SettingsDialog
- [ ] Implement Not Connected UI
- [ ] Implement Connected UI with status panel
- [ ] Implement Connect button handler
- [ ] Implement Disconnect button handler
- [ ] Implement Push to Cloud handler
- [ ] Implement Pull from Cloud handler
- [ ] Add loading states for all operations
- [ ] Add error handling and user feedback

---

### Step 5: Create Cloud Sync Utility

**File:** `src/services/cloudSync.ts` (NEW)

Combine backup creation with cloud upload:

```typescript
export async function pushToCloud(): Promise<void> {
  // 1. Create backup using existing backup service
  // 2. Upload to Google Drive
  // 3. Update last sync timestamp
  // 4. Handle errors
}

export async function pullFromCloud(): Promise<Blob> {
  // 1. Download from Google Drive
  // 2. Return blob for restoration
  // 3. Handle errors
}
```

**TODO:**

- [ ] Create `cloudSync.ts` utility
- [ ] Implement `pushToCloud()` function
- [ ] Implement `pullFromCloud()` function

---

### Step 6: Add OAuth Configuration

**File:** `.env.example` or documentation (NEW)

Document the need for Google OAuth 2.0 Client ID:

```
# Google OAuth 2.0 Configuration
# Create credentials at: https://console.cloud.google.com/apis/credentials
VITE_GOOGLE_CLIENT_ID=your-client-id-here
```

**File:** `src/config.ts` or similar (MODIFY/NEW)

Add configuration for Google Client ID:

```typescript
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
```

**TODO:**

- [ ] Add environment variable configuration
- [ ] Update README with setup instructions
- [ ] Add config constants

---

### Step 7: Handle Edge Cases

**Error Scenarios:**

1. **Network errors during sync:**
   - Show retry button
   - Don't update last sync timestamp
   - Preserve local state

2. **Auth token expiration:**
   - Auto-refresh token before API calls
   - If refresh fails, show "Session expired" message
   - Prompt user to reconnect

3. **File not found in cloud:**
   - Show "No backup found in cloud" message
   - Suggest pushing first

4. **Quota exceeded:**
   - Show user-friendly error
   - Suggest trying again later

5. **Large file uploads:**
   - Show progress indicator
   - Handle timeouts gracefully

**TODO:**

- [ ] Implement network error handling
- [ ] Implement token refresh logic
- [ ] Implement "no backup found" handling
- [ ] Implement quota exceeded handling
- [ ] Add progress indicators for large uploads

---

## UI/UX Specifications

### Cloud Storage Section (Settings Dialog)

**Not Connected State:**

```
┌─────────────────────────────────────┐
│ Cloud Storage                       │
├─────────────────────────────────────┤
│                                     │
│  Backup and sync your data to       │
│  Google Drive.                      │
│                                     │
│  [Connect Google Drive]             │
│                                     │
└─────────────────────────────────────┘
```

**Connected State:**

```
┌─────────────────────────────────────┐
│ Cloud Storage                       │
├─────────────────────────────────────┤
│                                     │
│  Status: Connected                  │
│  Account: user@example.com          │
│  Last synced: 2 hours ago           │
│                                     │
│  [Disconnect]                       │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  [Push to Cloud]                    │
│  Upload current database to cloud   │
│                                     │
│  [Pull from Cloud]                  │
│  ⚠️ Replace local data with cloud   │
│                                     │
└─────────────────────────────────────┘
```

**Button States:**

- Push to Cloud:
  - Default: Enabled
  - During upload: Loading spinner + "Uploading..."
  - Success: Checkmark briefly, then back to default
  - Error: Red text with error message

- Pull from Cloud:
  - Default: Enabled, outline/destructive variant
  - During download: Loading spinner + "Downloading..."
  - Always shows confirmation dialog before restore

---

## File Changes Summary

### Modified Files

1. `src/components/SettingsDialog.tsx` - Add Cloud Storage section
2. `src/store/types.ts` - Add CloudStorageState and actions
3. `src/store/index.ts` - Implement cloud storage slice
4. `index.html` - Add Google Identity Services script (if using script tag approach)
5. `.env.example` - Add Google Client ID configuration

### New Files

1. `src/services/cloudStorage.ts` - Google Drive API integration
2. `src/services/cloudSync.ts` - High-level push/pull operations
3. `src/config.ts` - Configuration constants for OAuth

### Dependencies

**New package required:**

```bash
npm install @google-cloud/google-oauth2
# OR use script tag approach (no package needed)
```

**Note:** Research if there's a better Google Identity Services npm package, or use the script tag approach which is officially documented.

---

## Testing Checklist

### Authentication

- [ ] Clicking "Connect Google Drive" opens OAuth popup
- [ ] OAuth popup requests `drive.appdata` scope only
- [ ] After successful auth, status panel shows user email
- [ ] "Disconnect" button signs out and resets state
- [ ] Token refresh happens automatically when needed
- [ ] Auth state persists across page reloads (via token client)

### Push to Cloud

- [ ] Clicking "Push" creates backup and uploads
- [ ] Progress indicator shown during upload
- [ ] Success updates "Last synced" timestamp
- [ ] Uploaded file appears in Google Drive appDataFolder
- [ ] Previous backup is replaced (not duplicated)
- [ ] Error handling for network failures
- [ ] Error handling for auth failures

### Pull from Cloud

- [ ] Clicking "Pull" downloads backup
- [ ] Confirmation dialog shows before restore
- [ ] Dialog displays backup metadata (date, size)
- [ ] Cancel button cancels operation
- [ ] Confirm button restores database
- [ ] Page reloads after successful restore
- [ ] All data is restored correctly
- [ ] Error handling for "no backup found"

### Edge Cases

- [ ] Pull when no backup exists in cloud shows appropriate message
- [ ] Push with very large database works
- [ ] Network interruption during sync handled gracefully
- [ ] Auth token expiration during operation handled
- [ ] Quota exceeded error handled
- [ ] Multiple devices: each can push/pull independently
- [ ] Corrupted backup file in cloud handled

### Security

- [ ] App only accesses appDataFolder, not user's personal files
- [ ] No sensitive data exposed in localStorage
- [ ] Auth token not logged or exposed
- [ ] Sign out clears all auth state

---

## Security Considerations

1. **Scope Isolation:**
   - Use ONLY `drive.appdata` scope
   - Never request broader Drive access
   - Verify this in OAuth consent screen

2. **Token Storage:**
   - Store access token in memory only
   - Don't persist to localStorage
   - Rely on GIS token client for management

3. **Data Privacy:**
   - All data stays in user's own Google Drive
   - No server-side storage
   - No analytics or tracking

4. **Backup Integrity:**
   - Validate backup before upload
   - Validate backup after download (before restore)

---

## Notes

- Follow existing code patterns: functional style, readonly types, no mutations
- Use existing shadcn/ui components for UI consistency
- Reuse Feature 5 backup/restore logic as much as possible
- Keep error messages user-friendly but informative
- Consider adding retry logic for transient failures
- Manual sync preserves local-first architecture
- Single file versioning keeps implementation simple
