## SettingsScreen
- **Purpose:** Global app configuration.
- **Components:**
  - **ThemeToggle** – switch light/dark; persists via AsyncStorage.
  - **DataSyncButton** – manual sync; shows progress toast.
  - **ARToggle** – enable/disable AR globally; respects device capability.
  - **OfflineStatusIndicator** – shows offline‑ready flag, DB size, last sync timestamp.
- **State Sources:**
  - `DS_APP_STATE` → theme, AR flag.
  - `DS_OFFLINE_STATUS` → indicator.
- **Interactions:**
  - Toggles update both local store and remote API.
  - Sync button triggers `/api/v1/sync` and updates `offline_status` table.
- **Empty State:** If sync fails, toast with retry option.
- **Psychology:** Gives user control; transparent status builds trust.
- **Accessibility:** Each toggle has `accessibilityHint` describing effect.

**Linked Skills:** `skills/state_management_expert.md`, `skills/offline_sync_expert.md`, `skills/ar_integration_expert.md`.