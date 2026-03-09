## TechnicalSpecsScreen
- **Purpose:** Detailed spec tables and visual charts.
- **Components:**
  - **SpecsTable** – sortable columns; default sort by `range`.
  - **ChartsPanel** – dropdown to select metric, renders bar/line chart via `react-native-svg`.
- **State Sources:**
  - `DS_ASSET_SPECS` → table data.
  - `DS_ASSET_CHART_DATA` → chart data.
- **Interactions:**
  - Column header tap toggles asc/desc.
  - Metric dropdown triggers API call `/api/v1/assets/{assetId}/charts`.
- **Empty State:** No chart data → hide ChartsPanel.
- **Psychology:** Data‑driven decision making; visual cues aid comprehension.
- **Accessibility:** Table rows announced with spec name and value.

**Linked Skills:** `skills/state_management_expert.md`, `skills/performance_optimizer.md`.