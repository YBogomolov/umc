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

- **Initial State:** Displays a "Connect Google Drive" button. Clicking this triggers the Google OAuth 2.0 flow.
- **Authorised State:** If a valid token is found in `localStorage` on boot, or after a successful login, the UI automatically transitions to the status panel. This panel displays the user's email and the "Last synced" timestamp.
- **Session Persistence:** The user remains "Signed In" across page reloads. They only need to re-authenticate if they manually "Disconnect" or if the token has expired and cannot be silently renewed.

## Technical Implementation

### OAuth and Scope

The application uses the Google Identity Services SDK, requesting the following scopes:

- `openid`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/drive.appdata`

### Session Management (Persistence)

To avoid re-authenticating on every reload, the system implements a persistence layer:

1. **Storage:** Upon successful authentication, the `access_token`, `expires_at` (calculated as `Date.now() + expires_in * 1000`), and user profile information are serialised and saved to `localStorage` under the key `umc_auth_session`.
2. **Initialisation:** On app mount, the system checks for `umc_auth_session`.

- If the token exists and `Date.now() < expires_at`, the system sets the internal auth state to "Connected" and uses the stored token for API calls.
- If the token is expired, the system attempts a silent token refresh using `client.requestAccessToken({ prompt: 'none' })`. If this fails (e.g., due to third-party cookie restrictions), the UI reverts to the "Connect Google Drive" state.

3. **Error Handling:** If any Google Drive API call returns a `401 Unauthorized` error, the system clears the `localStorage` session and prompts the user to reconnect.

### Storage Strategy

The system treats Google Drive as a remote file system for the backup archives.

- **Format:** The uploaded file is the same ZIP archive generated in Feature 5.
- **Location:** Files are stored strictly in the `appDataFolder`.
- **Querying:** On connection, the system searches for a file named `umc-backup.zip` within the `appDataFolder` to retrieve the "Last synced" metadata.
- **Atomic Updates:** When "Push to Cloud" is triggered, the system performs a multipart upload to overwrite the existing `umc-backup.zip`, ensuring only one master backup exists at any time.

### Sync Logic

The sync is **manual-only** to preserve the "local-first" architecture and avoid complex merge conflict resolution. The local IndexedDB remains the single source of truth for the UI. The cloud acts purely as a dumb storage container for the snapshot.

---

### Pro-Tip for Kimi 2.5:

When implementing the **Push to Cloud**, ensure it uses a `multipart/related` upload. This allows Kimi to send both the metadata (the filename) and the binary ZIP data in a single HTTP request, which is faster and more reliable than two separate calls.

# Feature 7: Horizontal image flip

Upon hovering any image (frontal, back, or base) the user sees a "Flip horizontally" icon button above the download icon button. When the user clicks the "Flip horizontally" button, the image is reflected on the vertical axis (aka mirrored horizontally). The image is immediately persisted.

# Feature 8: PDF export

The application gains a toolbar. In that toolbar, a single button "Export to PDF" is present.
Upon clicking that button, the user is greeted with a large dialog window taking most of the view. In that dialog, the user sees a grid with collections. Each collection is rendered as a card: it shows collection title, excerpt from the collection description, and a number of minis in the collection.
After each collection title, a checkbox is rendered. The user can check on and off those checkboxes at will. This influences the counter that is described below.
At the bottom of the dialog, a big full-width button is rendered with text "Export ${num} collections as PDF" (or "Export 1 collection as PDF" if only one collection is selected). The button is disabled if nothing is selected, and has text "Select at least one collection to export".
Upon clicking the button, the selected collections are exported as printable minis to PDF. The PDF is automatically downloaded. It is named "<collection 1>, <collection 2>, <collection 3 and so on> - <current timestamp>.pdf".

### 1. Architecture: The Worker-Main Thread Handshake

Because OpenCV operations (dilation and blurring) are CPU-intensive, they must run in a **Web Worker**. This prevents the browser from freezing during the "Magic Wand" calculations.

- **Main Thread:** Manages the file queue and handles the final PDF generation.
- **Web Worker:** Receives raw pixel data, performs the computer vision tasks, and returns processed pixel data.

### 2. Module A: The Image Processing Worker (OpenCV.js)

**Key Logic Steps:**

1. **Initialisation:** Load OpenCV within the worker. Be sure to use `@techstark/opencv-js` for all interactions with OpenCV API.
2. **Data Ingestion:** Receive an `ImageData` object from the main thread and convert it to a `cv.Mat`.
3. **The Multi-Seed Flood Fill:**

- Create a `cv.Mat` mask (2 pixels larger than the source).
- Iterate through the border pixels. If a pixel's RGB values are $>245$, call `cv.floodFill`.
- Use `cv.Scalar(15, 15, 15)` for the tolerance (`loDiff`/`upDiff`).

4. **Mask Refinement:**

- Convert the flood-fill output into a binary mask (0 for background, 255 for foreground).
- **Dilation:** Use a $3 \times 3$ kernel with 7 iterations to create the white "halo" boundary.
- **Blurring:** Apply a `cv.GaussianBlur` (5x5 kernel) to the alpha mask for edge softening.

5. **Alpha Composition:** \* Split the original image into RGBA channels.

- Replace the Alpha channel with the processed mask.

6. **Bounding Box Crop:** \* Use `cv.findNonZero` on the mask to identify the content limits.

- Crop all channels to this `Rect`.

7. **Output:** Return the cropped `Uint8ClampedArray` back to the main thread.

### 3. Module B: The PDF Assembly Engine (pdf-lib)

This module handles the coordinate-perfect layout. JavaScript uses "Points" ($1/72$ inch), so we must apply a constant conversion: **$1 \text{ mm} = 2.83465 \text{ pts}$**.

**Scaling Logic:**

- Collect the pixel heights of all processed "Front" images.
- Identify the `maxPixelHeight`.
- Calculate the global scaling factor: `scaleFactor = (28.0 * mmToPoints) / maxPixelHeight`.

**Drawing the Miniature Stack:**
For each pair, the engine must draw four distinct zones on the A4 page ($595 \times 841$ pts):

1. **Bottom Flap:** A grey rectangle ($3 \text{ mm}$ height).
2. **Front Backdrop:** A black rectangle ($38 \text{ mm}$ height).

- Place the "Front" image here, anchored to the bottom edge (the flap line).

3. **Back Backdrop:** A black rectangle ($38 \text{ mm}$ height).

- **The Mirror Flip:** This is the most critical part. To ensure the mini folds correctly, the back image must be rotated 180 degrees.
- **Coordinate Math:** Translate the context to the top-middle of the back backdrop, apply `rotate(degrees(180))`, and draw the image.

4. **Top Flap:** A grey rectangle ($3 \text{ mm}$ height).

### 4. Implementation Task List

1. **Coordinate Mapping:** Create a helper function `mmToPts(val)` to ensure all `pdf-lib` calls remain consistent with the metric system.
2. **Memory Management:** In the OpenCV worker, ensure `mat.delete()` is called for every intermediate `cv.Mat` (Source, Mask, Channels, Kernel) to prevent browser tab crashes during bulk processing.
3. **Transparency Handling:** Use `pdfDoc.embedPng()` for the processed images. `pdf-lib` automatically respects the alpha channel we generated in the worker.
4. **Parallel Processing:** Use `Promise.all` with a concurrency limit (e.g., processing 3 images at a time) to maximize performance without exhausting system memory.
5. **Blob Generation:** Use `pdfDoc.save()` to generate a `Uint8Array`, convert it to a `Blob` with MIME type `application/pdf`, and create a temporary URL for the download.

# Feature 9: Export configuration

In the export dialog (see Feature 8), the user is able to set the following parameters:

- Mini height: a slider from 16mm to 55mm, with the default value of 32mm;
- Blur size: numerical input, default value 25px;
- Outline size: numerical input, default value 7px;
- Background color: inline radio group, either `Black` or `White`;

If background is white, no outline tracing & blur is needed (won't be visible).

# Feature 10: In-place image editing with prompt

Each image (frontal, back, base) gets a new hover button: edit with a prompt. The button has a magic wand icon.
Upon clicking the button, a dialog window opens. The user can write a text there in a text area and attach an image. Everything together with the original image is sent to Gemini for edits. The user is able to select the Gemini model from a drop-down. No extra prompts are sent in this scenario — the user controls every letter of the prompt.
After hitting the "Send" button, the dialog window is closed and the standard generation flow is displayed (animated Gemini logo). The result is added to the image list for the selected view (front/back/base).

# Feature 11: Set Miniature Height

TODO: describe in details: set character height (either mini height in mm, or char height in metres), then use this info to scale each mini image individually during export. The height info is persisted to the database. If it is not set, the default scale is used (mini height = 32mm).

The export dialog transforms into step-by-step wizard. In step 1, the user selects the collections to export, just as it is now.
After selecting collections to export, the user clicks "Next" and is taked to the step 2. Step 2 is a vertical layout of all minis from each collection (grouped by collection) that are presented like this:

- Checkbox to include or exclude the mini from export
- Mini name
- Slider with numeric input to set the mini height in mm

The "Next" button in this step is replaced with the "Export" button that has a number of selected minis written on it ("Export 15 miniatures").
Only the selected miniatures are passed down to the export process.
