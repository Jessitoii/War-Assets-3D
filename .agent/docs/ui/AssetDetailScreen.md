## AssetDetailScreen
- **Purpose:** Deep dive into a single asset.
- **Header:** `AssetHeader` – name, back arrow, favorite toggle.
- **Body Sections (top‑down):**
  1. **ImageCarousel** – high‑res photos, pinch‑zoom.
  2. **SpecsSummary** – cards for range, speed, generation, country.
  3. **Action Buttons** – `View3DButton`, `CompareButton`.
- **State Sources:**
  - `DS_ASSET_DETAIL` → header & specs.
  - `DS_ASSET_IMAGES` → carousel.
  - `DS_ASSET_3D_MODEL` → 3‑D button.
- **Interactions:**
  - Favorite toggle writes to `favorites` table.
  - Specs cards navigate to `TechnicalSpecsScreen`.
  - Compare button adds to queue via `/api/v1/comparison/add`.
- **Empty States:**
  - No images → show placeholder silhouette.
  - No 3‑D model → disable View3DButton with tooltip.
- **Psychology:** Layered information; primary CTA (3‑D) is prominent.
- **Accessibility:** All buttons have `accessibilityHint`s describing outcome.

**Linked Skills:** `skills/state_management_expert.md`, `skills/security_hardener.md`, `skills/gesture_handling_expert.md`.