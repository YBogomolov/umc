# Feature 11: Set Miniature Height

## Summary

Add ability to set individual mini height per export, using a default constant. Height is NOT persisted to database - user decides each time during export.

## Changes Required

### 1. Constants Module

- Created `src/lib/constants.ts` with:
  - `DEFAULT_MINI_HEIGHT_MM = 32`
  - `MIN_MINI_HEIGHT_MM = 16`
  - `MAX_MINI_HEIGHT_MM = 55`

### 2. Worker Types Update

- Updated `MiniData` interface to include optional `miniHeightMm` for per-mini scaling during export

### 3. PDF Export Dialog - Transform to Wizard

**Step 1: Collection Selection**

- Current behavior - select collections to export

**Step 2: Mini Configuration**

- Vertical list of all minis from selected collections (grouped by collection)
- For each mini:
  - Checkbox to include/exclude from export
  - Mini name
  - Slider + numeric input to set mini height (16-55mm, default 32mm from constant)
- "Export" button showing count of selected minis

### 4. PDF Export Service

- Pass per-mini height configuration to the worker
- Worker uses individual mini heights instead of global config for scaling

## Implementation Notes

- Height is NOT persisted to database
- Default height is read from constants module
- User sets height each time during export
