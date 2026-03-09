## Phase 5 – Model Viewer
1. **ThreeDModelViewer** – Loads GLB from `DS_ASSET_3D_MODEL`.
   - If model not cached, fetch from CDN, store in `asset_3d_models` table, then render.
   - Gestures (rotate, zoom, pan) delegated to `gesture_handling_expert`.
2. **ControlsOverlay** – Buttons for Reset, AR toggle, Close.
   - AR toggle checks `device_capabilities.supports_ar` (via `ar_integration_expert`).
   - Reset restores default camera position.
3. **Performance** – Use `useFrame` throttling to keep FPS ≥ 60; dispose of geometry on unmount.
4. **Error Cases** – If model fails to load, show placeholder with retry button.

### Success Criteria
- Model loads ≤ 2 s on first view (cached) and ≤ 5 s when downloading.
- Gestures feel fluid (no jitter) on iPhone 12.
- AR toggle either launches ARViewerScreen or shows disabled toast.

**Linked UI Docs:** `ui/ModelViewerScreen.md`.
**Linked Skills:** `skills/gesture_handling_expert.md`, `skills/ar_integration_expert.md`, `skills/performance_optimizer.md`.

## Verification Hooks (Success Criteria)
- [ ] GLB model renders without texture flicker.
- [ ] AR toggle respects device capability.
- [ ] Reset button returns to initial orientation.
