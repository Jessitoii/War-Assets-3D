## HomeScreen
- **Purpose:** Central hub for exploration.
- **Visual Hierarchy:**
  1. **HeaderBar** (top) – app title, theme toggle, search icon.
  2. **SearchBar** (inline) – opens filter modal.
  3. **QuickAccessCard** (horizontal scroll) – featured assets.
  4. **CategoryGrid** (4‑column) – categories.
- **State Sources:**
  - `DS_FEATURED_ASSETS` → QuickAccessCard.
  - `DS_CATEGORIES` → CategoryGrid.
  - `DS_APP_STATE` → HeaderBar theme.
- **Interactions:**
  - Tap a card → `navigate('AssetDetail', {assetId})`.
  - Tap a category → `navigate('Category', {categoryId})`.
  - SearchBar focus → open `SearchFilterScreen` modal.
- **Empty States:**
  - No featured assets → show placeholder “No featured assets yet”.
  - No categories (unlikely) → show “Categories loading…”.
- **Psychology:** Immediate access to popular content; clear pathways to deeper browsing.
- **Accessibility:** All touch targets ≥ 44 dp; proper `accessibilityLabel`s.

**Linked Skills:** `skills/state_management_expert.md`, `skills/gesture_handling_expert.md`.