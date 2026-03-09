## Phase 7 – Settings & Sync
1. **ThemeToggle** – Calls `/api/v1/settings/theme` (POST) and updates `app_state.theme`.
2. **DataSyncButton** – Triggers `/api/v1/sync` (POST). Shows progress toast; on success updates `offline_status` table.
3. **ARToggle** – Calls `/api/v1/settings/ar` (POST) after capability check.
4. **OfflineStatusIndicator** – Reads from `offline_status` table; displays DB size and last sync timestamp.
5. **Persistence** – All settings persisted via AsyncStorage (theme) or SQLite (AR flag, sync timestamp).

### Success Criteria
- Theme change reflects instantly across all screens.
- Data sync completes with a success toast and updates offline indicator.
- AR toggle disables on unsupported devices.
- Offline indicator updates in real time after sync.

**Linked UI Docs:** `ui/SettingsScreen.md`.
**Linked Skills:** `skills/state_management_expert.md`, `skills/offline_sync_expert.md`, `skills/ar_integration_expert.md`.

## Verification Hooks (Success Criteria)
- [ ] Theme persists after app restart.
- [ ] Sync button shows progress bar and final success message.
- [ ] Offline indicator shows correct DB size.
