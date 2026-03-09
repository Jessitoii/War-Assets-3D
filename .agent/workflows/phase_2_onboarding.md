## Phase 2 – Onboarding
1. **Fetch Content** – Call `/api/v1/onboarding/content` → store in `onboarding_content` table (see `docs/logic/OnboardingLogic.md`).
2. **Render Carousel** – Use `ui/OnboardingScreen.md` spec; each page pulls from `DS_ONBOARDING_CONTENT`.
3. **Navigation Logic** – When animation ends on SplashScreen, read `DS_APP_STATE.firstLaunch`.
   - `true` → navigate to `OnboardingScreen`.
   - `false` → navigate to `HomeScreen`.
4. **Buttons** – `NextButton`, `SkipButton`, `GetStartedButton` update `DS_ONBOARDING_STATE` and `DS_APP_STATE.firstLaunch` via `skills/state_management_expert.md`.
5. **Persist First‑Launch Flag** – Write to SQLite `app_state` table.

### Success Criteria
- On first install, onboarding appears after splash.
- Swiping updates page index and enables GetStarted on last page.
- Skipping or completing sets `firstLaunch = false` and redirects to Home.
- Subsequent launches bypass onboarding.

**Linked UI Docs:** `ui/OnboardingScreen.md`.
**Linked Skills:** `skills/state_management_expert.md`, `skills/gesture_handling_expert.md`.

## Verification Hooks (Success Criteria)
- [ ] Onboarding content loads from remote API.
- [ ] Page index persists across app restarts.
- [ ] HomeScreen is the default after first launch.
