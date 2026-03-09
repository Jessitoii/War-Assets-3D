## 3‑D Model Viewer Feature Blueprint
### Definition of Done (DoD)
- ✅ GLB model loads from local cache; fallback to CDN if missing.
- ✅ Gestures (rotate, zoom, pan) are smooth at 60 fps on iPhone 12.
- ✅ AR toggle correctly detects device capability and either launches ARViewerScreen or shows disabled toast.
- ✅ Reset button restores default camera position.
- ✅ Memory cleanup on unmount (dispose geometries, textures).
- ✅ Error UI for failed model load with retry.
### Performance Metrics
- **Load Time:** ≤ 2 s (cached) / ≤ 5 s (download).
- **Memory Footprint:** ≤ 30 MB per model.
- **CPU Usage:** ≤ 15 % on idle, ≤ 30 % during interaction.
### Pitfalls & Mitigations
- **Large Textures:** Use Draco compression; fallback to lower‑res textures on low‑memory devices.
- **AR Lag:** Limit AR frame rate to 30 fps; disable heavy post‑processing.
- **Network Flakiness:** Cache‑first strategy; show placeholder until download completes.
### Linked Skills
- `gesture_handling_expert.md`
- `ar_integration_expert.md`
- `performance_optimizer.md`