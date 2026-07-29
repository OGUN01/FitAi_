# Decisions — phase2-barcode-database

## [2026-02-28] Session Init

- Use `FileSystem.createDownloadResumable()` (NOT `downloadAsync`) for large SQLite download
- Use `better-sqlite3` for Node.js build scripts (NOT expo-sqlite which is mobile-only)
- WAL mode during SQLite build, DELETE mode before shipping
- SQLite stored at `FileSystem.documentDirectory + 'fitai-foods.sqlite'`
- SQLite confidence level: 92 (same data as Supabase tier, but local = faster)
- Task 1 migration: expand off_source CHECK to 5 values total
- Task 2 default: --with-nutrition flag ON (1.2-1.8M rows, 300-500 MB CSV)
- India ETL scripts kept unchanged (do not modify)
- No Edamam API (confirmed: poor Indian barcode coverage)
- No GS1 DataKart (confirmed: too expensive for startup, ₹2-4L/year)
- Admin moderation UI: out of scope (is_approved stays false until manual approval)
