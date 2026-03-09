## Database Initialization Logic
### Purpose
Create a reliable SQLite schema that matches the `database_schema` definition and supports migrations.
### Steps
1. Open DB (`expo-sqlite`).
2. Execute `CREATE TABLE IF NOT EXISTS` statements for each table in order respecting foreign keys.
3. Run PRAGMA `foreign_keys = ON`.
4. Insert default rows for `app_state` (firstLaunch = true, theme = 'light', arEnabled = false).
5. Verify schema version via `PRAGMA user_version`; if mismatched, run migration scripts.
### Migration Strategy
- Increment `user_version` on each schema change.
- Provide `up` and `down` SQL scripts.
- Wrap migrations in a transaction; rollback on error.
### Edge Cases
- **Corrupt DB File:** Delete and recreate with a warning toast.
- **Concurrent Access:** Use a single shared connection; queue writes.
### Linked Skills
- `security_hardener.md` (SQL injection prevention)
- `performance_optimizer.md` (index creation for fast queries)