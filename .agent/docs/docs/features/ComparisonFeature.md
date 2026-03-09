## Comparison Feature Blueprint
### Definition of Done
- ✅ Queue holds up to three assets; attempts to add fourth show toast.
- ✅ Side‑by‑side cards display thumbnail, key specs, and mini 3‑D preview.
- ✅ Remove icon per column works instantly.
- ✅ Clear All empties queue with confirmation.
- ✅ Queue persists across app restarts.
### Performance Metrics
- **Render Time:** ≤ 200 ms for three cards.
- **Interaction Latency:** ≤ 100 ms for add/remove actions.
- **Memory:** ≤ 20 MB for mini‑preview models.
### Edge Cases
- **Duplicate Asset:** Prevent adding same asset twice.
- **Missing Data:** If an asset lacks 3‑D model, hide mini preview.
- **Offline:** Queue operations work offline; sync on next network availability.
### Linked Skills
- `state_management_expert.md`
- `performance_optimizer.md`