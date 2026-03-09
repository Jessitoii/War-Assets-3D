## Phase 1 – Setup
1. **Initialize Repo** – `expo init NewProject --template blank (TypeScript)`.
2. **Add Core Packages** – `expo install react-native-reanimated zustand expo-sqlite expo-asset @react-navigation/native @react-navigation/stack @react-three/fiber three`.
3. **Create Base Files** – `App.tsx` imports `ui/NavigationRoot.md` spec.
4. **Configure Zustand Store** – Follow `skills/state_management_expert.md` for slice scaffolding.
5. **Set Up SQLite** – Run `scripts/init-db.ts` per `docs/logic/DatabaseInitLogic.md`.
6. **Add Design Tokens** – Populate `styles/theme.ts` using colors from `design_system.md`.
7. **Run Linter & Prettier** – Enforce `code_quality` rule.

### Success Criteria
- Repo builds without errors on iOS simulator.
- Initial navigation graph contains `SplashScreen` and `HomeScreen`.
- SQLite tables exist and are empty.
- Lint passes with 0 warnings.

**Linked UI Docs:** `ui/SplashScreen.md`, `ui/HomeScreen.md`.
**Linked Skills:** `skills/state_management_expert.md`, `skills/performance_optimizer.md`.

## Verification Hooks (Success Criteria)
- [ ] Expo project launches to SplashScreen.
- [ ] Zustand store initializes with default slices.
- [ ] SQLite schema matches `database_schema`.
