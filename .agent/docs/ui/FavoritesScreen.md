## FavoritesScreen
- **Purpose:** View and manage saved assets.
- **Header:** `FavoritesHeader` – back button, Clear All action.
- **List:** `FavoritesList` – similar to `AssetList` but sourced from `favorites` table.
- **Interactions:**
  - Tap item → navigate to `AssetDetailScreen`.
  - Swipe left → reveal “Remove” action (deletes from SQLite).
  - Clear All → confirmation dialog, then bulk delete.
- **Empty State:** No favorites → show “You haven’t saved any assets yet.” with a link to Home.
- **Psychology:** Encourages curation; quick access to frequently viewed assets.
- **Accessibility:** List items announce “Favorite asset, {name}”.

**Linked Skills:** `skills/state_management_expert.md`, `skills/security_hardener.md`.