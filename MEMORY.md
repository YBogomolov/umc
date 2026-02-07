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
