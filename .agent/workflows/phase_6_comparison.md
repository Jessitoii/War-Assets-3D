## Phase 6 – Comparison
1. **ComparisonHeader** – Add Asset button opens `AssetPicker` modal (filters out already‑queued assets).
2. **AssetComparisonCard** – For each queued asset, display thumbnail, key specs, and mini 3‑D preview (uses same `ThreeDModelViewer` but with low‑poly placeholder).
3. **Remove Icon** – Deletes asset from `comparison_queue` slice; updates UI instantly.
4. **Clear All** – Empties queue with confirmation dialog.
5. **Data Sync** – When assets are added/removed, `comparison_queue` table updates via `state_management_expert`.

### Success Criteria
- Max three assets displayed side‑by‑side.
- Adding a fourth asset shows toast and prevents addition.
- Mini‑preview opens full ModelViewerScreen on tap.
- Clear All empties UI and SQLite queue.

**Linked UI Docs:** `ui/ComparisonScreen.md`.
**Linked Skills:** `skills/state_management_expert.md`, `skills/performance_optimizer.md`.

## Verification Hooks (Success Criteria)
- [ ] Comparison layout remains responsive on portrait and landscape.
- [ ] Queue state persists after app restart.
