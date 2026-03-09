## Onboarding Logic Whitepaper
### Overview
The onboarding flow is the first user‑experience gate. It must be **idempotent**, **fast**, and **recoverable**.
### Data Flow
1. App launch → `GET /api/v1/onboarding/content` → store in `onboarding_content` table.
2. UI reads from `DS_ONBOARDING_CONTENT` via Zustand selector.
3. Page navigation updates `onboarding_state.current_page`.
4. Completion (`Skip` or `GetStarted`) writes `firstLaunch = false` to `app_state` table and clears `onboarding_state`.
### Edge Cases
- **Network Failure:** Fallback to bundled static JSON (included in assets folder). Show retry button.
- **Corrupt DB:** Detect missing `firstLaunch` flag → treat as first launch.
- **Interrupted Flow:** Persist `current_page` after each swipe; resume on next launch.
### Guarantees
- No duplicate API calls (cached after first fetch).
- All writes are wrapped in SQLite transactions for atomicity.
- UI updates are debounced (200 ms) to avoid rapid state churn.
### Linked Skills
- `state_management_expert.md`
- `performance_optimizer.md`