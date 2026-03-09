## CategoryScreen
- **Purpose:** Browse assets filtered by a specific category.
- **Header:** `CategoryHeader` with back arrow and category name.
- **Main Area:** `AssetList` (paginated vertical list) + optional `LoadMoreButton`.
- **State Sources:**
  - `DS_CATEGORY_META` → header title.
  - `DS_ASSET_LIST` (with `categoryId` param) → list items.
- **Pagination Logic:**
  - Infinite scroll triggers `fetchNextPage()` when reaching 80 % of list height.
  - `LoadMoreButton` provides manual fallback.
- **Empty State:** If no assets, show “No assets in this category.” with a “Refresh” button.
- **Psychology:** Clear categorization reduces decision fatigue.
- **Accessibility:** Each list item labeled with asset name and category.

**Linked Skills:** `skills/state_management_expert.md`, `skills/performance_optimizer.md`.