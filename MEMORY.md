img.onload = (): void => {
img
.decode()
.then(() => {
// Now safe to draw to canvas
ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
resolve(canvas.toDataURL('image/jpeg', 0.7));
})
.catch(reject);
};

````

**Files Modified:**

- `src/services/db.ts` - Updated `generateThumbnail` to use `img.decode()` for proper image decoding

---

## Feature 6: Cloud Storage (2026-02-17)

### Overview

Added Google Drive integration for cloud backup and synchronization. Users can now push their database to Google Drive and pull it back from any device. The feature uses OAuth 2.0 for authentication and stores backups in the app-specific `appDataFolder` for security.

### Architecture

**Manual Sync Only:**

- No automatic or background sync
- User-initiated push/pull operations only
- Preserves local-first architecture
- Cloud acts as dumb storage container

**Security:**

- Uses `drive.appdata` scope only (no access to user's personal files)
- App-specific hidden folder in Google Drive
- No server-side storage or processing
- Access token kept in memory only

### Implementation Details

**Files Created:**

1. `src/services/cloudStorage.ts` - Google Drive API integration
   - OAuth 2.0 authentication with GIS SDK
   - File operations (upload, download, search)
   - Error handling with typed errors
   - Helper functions for formatting

2. `src/services/cloudSync.ts` - High-level sync operations
   - `initializeCloudStorage()` - Setup with Client ID
   - `connectCloudStorage()` - OAuth sign-in
   - `disconnectCloudStorage()` - Sign-out
   - `pushToCloud()` - Create backup and upload
   - `pullFromCloud()` - Download and restore
   - `getCloudBackupInfo()` - Preview before pull

3. `.env.example` - Environment variable documentation

**Files Modified:**

1. `index.html` - Added Google Identity Services script
2. `src/store/types.ts` - Added `CloudStorageState` interface and actions
3. `src/store/index.ts` - Implemented cloud storage state and actions
4. `src/components/SettingsDialog.tsx` - Added Cloud Storage section
5. `src/services/restore.ts` - Added `restoreFromBackupBlob()` function

### UI/UX

**Settings Dialog - Cloud Storage Section:**

**Not Connected State:**

- Shows "Connect Google Drive" button
- Warning if Client ID not configured
- Description of cloud storage benefits

**Connected State:**

- Status panel showing:
  - Connected email address
  - Last sync time (e.g., "2 hours ago")
  - Disconnect button
- "Push to Cloud" button with upload icon
- "Pull from Cloud" button (destructive styling)

**Error Handling:**

- User-friendly error messages
- Loading states for all operations
- Connection status checks

### Store State

```typescript
interface CloudStorageState {
  readonly isAuthenticated: boolean;
  readonly userEmail: string | null;
  readonly lastSyncAt: string | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}
````

### Actions

- `setCloudAuth(isAuthenticated, userEmail)` - Set auth state
- `setCloudLastSync(timestamp)` - Update last sync time
- `setCloudLoading(isLoading)` - Set loading state
- `setCloudError(error)` - Set error message
- `disconnectCloud()` - Clear all cloud state

### Configuration

Environment variable required:

```
VITE_GOOGLE_CLIENT_ID=your-client-id-here
```

Setup instructions in `.env.example`.

### Error Types

```typescript
interface CloudStorageError {
  type: 'auth' | 'network' | 'not_found' | 'quota' | 'unknown';
  message: string;
}
```

All errors are thrown as Error objects with `type` property attached.

### Technical Notes

**OAuth Flow:**

- Uses Google Identity Services SDK
- Popup-based authentication
- Automatic token refresh
- Scope: `https://www.googleapis.com/auth/drive.appdata`

**Backup Format:**

- Same ZIP format as Feature 5
- Single file versioning (replaces previous backup)
- Stored in `appDataFolder`
- File name: `umc-backup.zip`

**Sync Process:**

**Push:**

1. Create backup using existing backup service
2. Generate ZIP blob
3. Upload to Google Drive
4. Update last sync timestamp

**Pull:**

1. Download backup from Google Drive
2. Show confirmation dialog with stats
3. On confirm: restore backup (destructive)
4. Reload page to refresh state

### Build & Lint

- ✓ Build passes successfully
- ✓ All ESLint errors resolved
- ✓ TypeScript compiles without errors
- ✓ Strict typing maintained throughout

### Future Enhancements (Not Implemented)

- Automatic background sync (opt-in)
- Multiple backup versions in cloud
- Sync conflict resolution UI
- Other cloud providers (Dropbox, OneDrive)
- Selective sync (specific collections only)

---

## Future Enhancements (Not Implemented)

- Collection reordering (currently sorted by updatedAt desc)
- Mini reordering within collections
- Bulk operations (move multiple miniatures at once)
- Collection-level metadata (tags)
- Miniature-level metadata (tags, notes)
- Upload to back/base views
- Multiple reference images
- Image cropping/editing before upload

---

### Authentication Persistence Fix (2026-02-17)

**Problem:**
Users had to reconnect Google Drive on every page refresh because auth state was only stored in memory.

**Solution:**
Added localStorage persistence for authentication state with automatic silent re-authentication:

1. **localStorage Storage:**
   - Store `email` and `timestamp` when user connects
   - Key: `umc-google-auth`
   - Cleared on explicit sign-out or auth failure

2. **Silent Re-authentication:**
   - Added `signIn(silent)` parameter (empty prompt = no popup)
   - Added `restoreAuth()` function that attempts silent auth
   - Called automatically when Settings dialog opens
   - User sees "Connecting..." briefly, then "Connected" if successful

3. **Functions Added/Modified:**

```typescript
// cloudStorage.ts
saveAuthState(email) - Save to localStorage
loadAuthState() - Load from localStorage
clearAuthState() - Remove from localStorage
signIn(silent?: boolean) - Support for silent auth
restoreAuth() - Attempt silent re-authentication
```

**User Experience:**
- First connect: Shows Google OAuth popup
- Page refresh: Automatically reconnects silently (no popup)
- Sign out: Clears localStorage, requires full re-auth next time
- Failed silent auth: Shows as disconnected, user must reconnect manually

---
