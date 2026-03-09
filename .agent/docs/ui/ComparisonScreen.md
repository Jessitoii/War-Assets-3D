## ComparisonScreen
- **Purpose:** Side‑by‑side comparison of up to three assets.
- **Header:** `ComparisonHeader` – Add Asset button, Clear All action.
- **Body:** Horizontal scroll of `AssetComparisonCard` (three columns).
- **Component Details:**
  - **AssetComparisonCard** – thumbnail, key specs, mini 3‑D preview (low‑poly).
  - Remove icon per column.
- **State Sources:**
  - `DS_COMPARISON_QUEUE` → list of assets.
- **Interactions:**
  - Add Asset → opens `AssetPicker` modal (filters out already‑queued assets).
  - Mini preview tap → navigate to full `ModelViewerScreen`.
  - Clear All → confirmation dialog, then empties queue.
- **Empty State:** No assets → show “Add assets to compare using the button above.”
- **Psychology:** Direct visual comparison reduces cognitive load.
- **Accessibility:** Each column labeled with asset name and spec summary.

**Linked Skills:** `skills/state_management_expert.md`, `skills/performance_optimizer.md`.