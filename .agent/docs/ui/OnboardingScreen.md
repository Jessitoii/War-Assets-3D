## OnboardingScreen
- **Purpose:** Educate first‑time users about core capabilities.
- **Layout:** Full‑screen carousel with page indicator at bottom, navigation buttons overlay.
- **Components:**
  - **OnboardingCarousel** – Pulls pages from `DS_ONBOARDING_CONTENT`; each page shows illustration, title, subtitle.
  - **NextButton** – Right‑aligned, disabled on last page.
  - **SkipButton** – Top‑right, always enabled.
  - **GetStartedButton** – Centered on final page, primary style.
- **Logic:**
  - Swiping updates `DS_ONBOARDING_STATE.current_page`.
  - `NextButton` increments page index.
  - `SkipButton` & `GetStartedButton` set `firstLaunch = false` in `app_state` and navigate to Home.
- **Empty State:** If content fetch fails, show static fallback text with retry.
- **Psychology:** Progressive disclosure; sense of achievement on final page.
- **Accessibility:** Each page announced via `accessibilityLiveRegion="polite"`.

**Linked Skills:** `skills/state_management_expert.md`, `skills/gesture_handling_expert.md`.