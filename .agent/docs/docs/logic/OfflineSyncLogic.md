## Offline Sync Logic
### Goal
Maintain an up‑to‑date local asset bundle while allowing full offline operation.
### Process
1. **Initial Bundle Download** – On first launch or when user taps `DataSyncButton`, request `/api/v1/sync`.
2. **Checksum Validation** – Compare server‑provided SHA‑256 with downloaded file.
3. **Extraction** – Unzip JSON bundle; iterate assets:
   - Insert/Update `assets` table.
   - Insert/Update `asset_images` and `asset_3d_models` tables.
4. **Cache Management** – Delete any local files not present in new bundle to stay under storage budget.
5. **Progress Reporting** – Emit Zustand events (`syncProgress`) for UI toast.
### Edge Cases
- **Partial Download** – Abort and keep previous bundle; show error toast.
- **Storage Exhaustion** – Prompt user to free space before proceeding.
- **Version Conflict** – If server bundle version < local, ignore.
### Guarantees
- All DB writes are atomic per asset.
- UI never shows stale data after successful sync.
### Linked Skills
- `offline_sync_expert.md`
- `performance_optimizer.md`