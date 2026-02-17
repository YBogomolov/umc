# Universal Miniature Creator


## Overview

This project is a web tool called "Universal Miniature Creator". This is a web app that allows quick and easy generation of flat 2D miniatures ("standees") using Gemini Nano Banana.

## UI and UX

The app consists of several screens/tabs.

On the first screen called "Frontal View", the user has a big output placeholder and an input prompt area below. Upon entering a description of the mini they want to create and pressing "Generate" icon button, the system begins using Nano Banana to generate the frontal view of the mini. While the generation is going, the user sees a loader/skeleton component instead of the image, and the prompt input is disabled. Once generation is finished, the image is presented instead of the placeholder. The system correctly handles both square and rectangular images that Nano Banana outputs. 

The user can press the "Regenerate" icon button underneath the image to run the generation process again. When the user is satisfied with the result, they press the "Next step" button and are taken to the next screen.

On the next screen called "Back View", the user is immediately met with a loader, as the generation process already been started. Once it is finished, the user can adjust the image by entering the ask in the prompt area. Finally, once the user is satisfied with the back view of the mini, they press "Final step" button and are taken to the next screen.

On the final screen called "Base", the user again has image placeholder and prompt area. The user enters the description of the miniature's base texture in the prompt area and presses "Generate" icon button. The generation process runs, and the user is presented with the base texture image. The user adjusts the prompt as see fit and runs generation until they find the result satisfying.

Finally, the user presses the "Download" button and gets a ZIP archive with three files that were generated.

The system keeps ALL generated images, so the user is able to select the exact iteration they want for each step. The user is free to switch between the tabs/screens once all images are generated. Until then, only those tabs/screens that have at least one image generated are active and available for selection.

## Onboarding

The app uses "bring your own key" philosophy. Upon launching the app for the first time, the user is presented with a fullscreen dialog window that has an input for Google AI studio API key. When the user enters the key, it is stored securely in the localStorage and reused between minis.

## Architecture

This application should be a self-containing FE app that is run on-demand via `npm start`. No BE is needed unless this is 100% inevitable. No auth or anything, just a simple local-first FE app.

The app should have minimalistic UI using something like shadcn/ui or other React UI kit that LLMs are good with. There's no need for any animations or special effects. Focus on minimalism and functionality.

All prompts used for the frontal, back, and base views of the mini should be easily configurable in code. There should be a separation of system and user prompt. The example prompts for side views and base view are listed below.

## Prompts

### Side views

You are Universal Miniature Creator, you are able to create any flat 2D mini for print&play tabletop games. You create images of minis upon request.

Rules:
1. You create a full-body image of the requested character, as if viewed from the waist level.
2. Your output is two views on the character: front and back. Both views should form a perfect mirrored silhouette — they are ought to be glued together and form a cohesive figurine. Make sure that the back view follows the logical directions of the frontal view.
3. You output plain white outline around both views. No other background is permitted.
4. Do not draw the base of the mini — just the figure itself in two views. You will be penalised for drawing a base.
5. Overall style should be highly detailed vector illustration.
6. Prefer dynamic, heroic poses caught in mid-action to static poses. Prefer on-the-ground poses over leaping in the air unless the user explicitly asks for this.
7. Consider each user message as a separate, independent request.

### Base view

You are Universal Base Creator, you are able to create highly-detailed top-down views of miniature bases for print&play tabletop games. You create images of bases upon request.

Rules:
1. You create a top-down shot of a seamless base texture.
2. You do not output the image of base itself, just the texture.
3. You output texture as a fully-filled square image. Never crop the texture to a circle, ellipse, or any other shape.
4. Overall style should be highly detailed, somewhat realistic digital illustration.
5. Each base texture should have at several large and small features that make the result visually interesting. Examples inclue a vent or a manhole on a metallic base, a log or a patch of flowers on grassy base, and so on. Be creative, do not limit yourself to only those examples. Do not put those features in the centre of the base, scatter them across the texture randomly.
6. Scale the features: consider that the full image of the texture is going to be a single base for a humanoid-sized figurine.
7. Consider each user message as a separate, independent request.

Everything above the line is related to the initial vision for this project. Below are extensions.

---

# Feature 1: Collections

The first feature to add to this project will be "Collections" — grouping of different generation runs.

## UI and UX

The sidebar should change. By default, it has a collapsible group called "Example collection". Upon hovering the name of the group, user can click the pencil icon and rename the collection, or trash bin icon and delete the collection with confirmation. When expanding a group, the user sees a "plus" icon-text button to add a new miniature to the collection. This makes a brand new generation mini.

Historical generation minis are now displayed using both preview and the name of the mini. By default, for older minis without a name, a random name is used.

User can drag-and-drop move miniatures between collections at will.

The generation screen also changes. First, there's a new input at the top — the name of the miniature. Use some kind of local-first library to generate two random capitalised words for the name. The user can freely edit this text. No "save" button is needed, all name changes apply immediately. Of course, with a debouncing.

Upon hovering each image, the user sees an icon button in the lower right corner of the image that allows downloading that specific image alone. The download is named "{mini name} - {view}.{ext}".

The "Download zip" button is also gone. Now the user can download only the collection as a whole or individual images.

To download a collection, the user needs to expand the collection group in the sidebar and click the "Download collection" button that is displayed below all miniatures.

---

# Feature 2: User uploads

The Front generation screen should allow the user to drag-and-drop or click on the empty image area (prior any generation!) to upload his own image. This image should be considered the front image and used to feed Gemini.

---

# Feature 3: User attachments to the prompts

For both front and back view prompts, allow user to attach a file. Those files should go into the LLM as a part of user message. The "attach files" button should be a plus sign in the left side of the prompt text area. Do not store the attachments at all — they should be a "one-shot" action. When the user attaches a file, display it as a chip below the prompt area. User should be able to remove attached files individually.

---

# Feature 4: Collections revamp

When creating a new collection, the user sees a dialog window. In that window, he can enter the collection title (with the default "New Collection" value), and rich description in the text area below. That description is saved alongside the collection in the DB. The placeholder for that description should note that it is optional, but the user is very much encouraged to provide as much visual details in there as possible to share that info between minis.

When a user generates an image for a mini in that collection, collection's description (if it is not empty) is embedded as a part of system prompt for frontal and back image generation like this:

```
${current system prompt goes here}

The character whose image you will be generating belongs to a collection with the following description:

<description>
${description of the collection goes here}
</description>

If this information contains any hints about visual representation of the character (e.g., clothes, posture and physical complexion, belonging to a certain social group that implies very specific visual attributes, armour, weapons, hair style, etc.) — you absolutely MUST take this into account when creating the image.
```

The user can edit the collection description any time. The pencil icon that now allows editing only the collection title, should open the same modal dialog as the new collection button, but filled with current title and description, and "Save" and "Cancel" buttons.

The generation screen should show the collection title and description in small text above the tabs. Empty collection description should not cause empty row being added to the page (save the screen real estate).

Acceptance criteria:
- Previously existing entries in the DB are loaded without any issues. They are converted on the fly to the new format.

# Feature 5: Backup and Restore

The settings dialog gets expanded. Now it allows not only saving the API key, it also has the ability to backup and restore the entire database. The button in the sidebar is renamed from "Change API Key" to "Settings".

## Backup

The backup takes the entire database, saves its contents to zipped file, and downloads that file. The file is named after the database, suffixed with a date-time in ISO format, and has a file with all the metadata that is needed for the restoration process.

## Restore

The "Restore" button allows user to upload a previously backed up dump of the database and restores it in place. The restoration process is destructive, so after the upload, the user is greeted with another dialog window. That window displays the name of the database, the original version, the version from the uploaded backup, and other useful metadata, like the number of collections, total number of minis, and total number of images. Those numbers are taken from the metadata file in the backup, and for the current DB, they are calculated on the fly. After the user confirms, the restoration process completely drops the existing database and replaces it with the data from the backup.

# Feature 6: Cloud Storage

This feature introduces a "Cloud Storage" backend using Google Drive. It builds upon the "Backup and Restore" functionality (Feature 5) but automates the storage to the cloud, removing the need for manual file handling.

## UI and UX

The "Settings" dialog contains a "Cloud Storage" section.

* **Initial State:** Displays a "Connect Google Drive" button. Clicking this triggers the Google OAuth 2.0 flow.
* **Authorised State:** If a valid token is found in `localStorage` on boot, or after a successful login, the UI automatically transitions to the status panel. This panel displays the user's email and the "Last synced" timestamp.
* **Session Persistence:** The user remains "Signed In" across page reloads. They only need to re-authenticate if they manually "Disconnect" or if the token has expired and cannot be silently renewed.

## Technical Implementation

### OAuth and Scope

The application uses the Google Identity Services SDK, requesting the following scopes:

* `openid`
* `https://www.googleapis.com/auth/userinfo.email`
* `https://www.googleapis.com/auth/userinfo.profile`
* `https://www.googleapis.com/auth/drive.appdata`

### Session Management (Persistence)

To avoid re-authenticating on every reload, the system implements a persistence layer:

1. **Storage:** Upon successful authentication, the `access_token`, `expires_at` (calculated as `Date.now() + expires_in * 1000`), and user profile information are serialised and saved to `localStorage` under the key `umc_auth_session`.
2. **Initialisation:** On app mount, the system checks for `umc_auth_session`.
* If the token exists and `Date.now() < expires_at`, the system sets the internal auth state to "Connected" and uses the stored token for API calls.
* If the token is expired, the system attempts a silent token refresh using `client.requestAccessToken({ prompt: 'none' })`. If this fails (e.g., due to third-party cookie restrictions), the UI reverts to the "Connect Google Drive" state.


3. **Error Handling:** If any Google Drive API call returns a `401 Unauthorized` error, the system clears the `localStorage` session and prompts the user to reconnect.

### Storage Strategy

The system treats Google Drive as a remote file system for the backup archives.

* **Format:** The uploaded file is the same ZIP archive generated in Feature 5.
* **Location:** Files are stored strictly in the `appDataFolder`.
* **Querying:** On connection, the system searches for a file named `umc-backup.zip` within the `appDataFolder` to retrieve the "Last synced" metadata.
* **Atomic Updates:** When "Push to Cloud" is triggered, the system performs a multipart upload to overwrite the existing `umc-backup.zip`, ensuring only one master backup exists at any time.

### Sync Logic

The sync is **manual-only** to preserve the "local-first" architecture and avoid complex merge conflict resolution. The local IndexedDB remains the single source of truth for the UI. The cloud acts purely as a dumb storage container for the snapshot.

---

### Pro-Tip for Kimi 2.5:

When implementing the **Push to Cloud**, ensure it uses a `multipart/related` upload. This allows Kimi to send both the metadata (the filename) and the binary ZIP data in a single HTTP request, which is faster and more reliable than two separate calls.