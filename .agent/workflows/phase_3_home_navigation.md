## Phase 3 – Home Navigation
1. **HeaderBar** – Implements theme toggle (updates `app_state.theme`) and Search icon (opens `SearchFilterScreen` modal). See `ui/HeaderBar.md`.
2. **QuickAccessCard** – Pulls `DS_FEATURED_ASSETS`; on press dispatches navigation to `AssetDetailScreen` with `assetId`.
3. **CategoryGrid** – Renders four‑column grid from `DS_CATEGORIES`; each tile navigates to `CategoryScreen` passing `categoryId`.
4. **SearchBar** – Focus triggers modal; uses `skills/gesture_handling_expert.md` for tap‑to‑focus animation.
5. **State Updates** – Theme toggle uses `state_management_expert` to persist via AsyncStorage.

### Success Criteria
- Theme toggles instantly across the app.
- Quick‑access cards navigate correctly.
- Category tiles open the correct CategoryScreen.
- Search bar opens filter modal without flicker.

**Linked UI Docs:** `ui/HomeScreen.md`, `ui/HeaderBar.md`, `ui/QuickAccessCard.md`, `ui/CategoryGrid.md`.
**Linked Skills:** `skills/state_management_expert.md`, `skills/gesture_handling_expert.md`.

## Verification Hooks (Success Criteria)
- [ ] Theme change reflects in UI within 100 ms.
- [ ] Navigation to AssetDetailScreen passes correct assetId.
- [ ] CategoryScreen receives matching categoryId.
