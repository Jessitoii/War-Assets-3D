## ModelViewerScreen
- **Purpose:** Interactive 3‑D visualization with optional AR.
- **Canvas:** `ThreeDModelViewer` occupies full screen; background dark with subtle vignette.
- **Overlay Controls:** `ControlsOverlay` – Reset, AR toggle, Close.
- **State Sources:**
  - `DS_ASSET_3D_MODEL` – GLB URL (cached locally).
  - `DS_DEVICE_CAPABILITIES` – AR support flag.
- **Gestures:**
  - Single‑finger drag → rotate.
  - Pinch → zoom (0.5‑3×).
  - Two‑finger drag → pan.
- **Performance:** Lazy‑load textures; dispose geometry on unmount.
- **Empty State:** If model fails, show “Model unavailable” with retry.
- **Psychology:** Immersive, tactile interaction; clear exit path.
- **Accessibility:** Provide “Enter AR mode” button with voice‑over description.

**Linked Skills:** `skills/gesture_handling_expert.md`, `skills/ar_integration_expert.md`, `skills/performance_optimizer.md`.