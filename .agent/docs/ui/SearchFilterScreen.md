## SearchFilterScreen
- **Purpose:** Advanced filtering of assets.
- **Layout:** Modal with collapsible `FilterPanel` sections (Range, Speed, Generation, Country, Category).
- **Components:**
  - **FilterPanel** – sliders for numeric ranges, dropdowns for enums, toggles for boolean flags.
  - **ApplyFiltersButton** – primary, triggers filter dispatch.
  - **ResetFiltersButton** – secondary, clears all selections.
- **State Sources:**
  - `DS_FILTER_DEFINITIONS` → build UI controls.
  - `DS_FILTER_STATE` → current selections.
- **Logic:**
  - Adjust controls → update local Zustand filter slice.
  - Apply → persist to `DS_FILTER_STATE`, close modal, refresh `AssetList` in current screen.
  - Reset → clear slice, close modal.
- **Empty State:** No filters selected → Apply behaves as “clear all”.
- **Psychology:** Empower user with precise control; progressive disclosure keeps UI clean.
- **Accessibility:** Each control has a descriptive label; sliders announce current value.

**Linked Skills:** `skills/state_management_expert.md`, `skills/gesture_handling_expert.md`.