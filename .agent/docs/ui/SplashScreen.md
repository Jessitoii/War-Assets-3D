## SplashScreen
- **Purpose:** First visual impression; decides navigation path.
- **Visual Hierarchy:**
  1. Full‑screen background (solid `secondary`).
  2. Centered `AnimatedLogo` component (fills 60 % of height).
- **Component Details:**
  - **AnimatedLogo** – SVG animation: fade‑in (0‑0.5 s), scale (0.5‑1 s), rotate (1‑2 s). Uses `react-native-reanimated` for GPU‑accelerated timing.
- **State Logic:**
  - On animation end, read `DS_APP_STATE.firstLaunch`.
  - `true` → `navigate('Onboarding')`.
  - `false` → `navigate('Home')`.
- **Empty State:** If `firstLaunch` flag missing (corrupt DB), default to onboarding.
- **User Psychology:** Quick brand recall; minimal cognitive load; smooth transition to next flow.
- **Accessibility:** `accessibilityLabel="Loading"`, `accessible={true}`.
- **Performance:** Animation runs on UI thread; no network calls.

**Linked Skills:** `skills/performance_optimizer.md`.