## Phase 4 – Asset Detail
1. **AssetHeader** – Shows name, back arrow, favorite toggle.
   - Favorite action writes to `favorites` SQLite table via `skills/security_hardener.md` (SQL injection safe).
2. **ImageCarousel** – Loads `DS_ASSET_IMAGES`; pinch‑zoom handled by `gesture_handling_expert`.
3. **SpecsSummary** – Cards link to `TechnicalSpecsScreen` (see `ui/TechnicalSpecsScreen.md`).
4. **View3DButton** – Navigates to `ModelViewerScreen` with `assetId`.
5. **CompareButton** – Calls `/api/v1/comparison/add`; on success updates `comparison_queue` slice; shows toast if queue full.
6. **Error Handling** – All API calls wrapped with `performance_optimizer` retry logic (max 2 retries, exponential back‑off).

### Success Criteria
- Asset data loads within 300 ms.
- Favorite toggle persists across app restarts.
- 3‑D button opens ModelViewerScreen.
- Comparison queue respects max‑3 limit.

**Linked UI Docs:** `ui/AssetDetailScreen.md`, `ui/TechnicalSpecsScreen.md`, `ui/ModelViewerScreen.md`.
**Linked Skills:** `skills/state_management_expert.md`, `skills/gesture_handling_expert.md`, `skills/security_hardener.md`.

## Verification Hooks (Success Criteria)
- [ ] All asset sections render without layout shift.
- [ ] Favorites are stored in SQLite and reflected in UI.
- [ ] Comparison toast appears when adding fourth asset.
