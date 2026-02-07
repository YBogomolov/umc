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

The app uses "bring your own key" philosophy. Upon launching the app for the first time, the user is presented with a fullscreen dialog window that has an input for Google AI studio API key. When the user enters the key, it is stored securely in the localStorage and reused between sessions.

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