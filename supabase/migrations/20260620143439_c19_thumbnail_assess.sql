-- #174 parity (record-only) — already applied to the remote DB via Supabase MCP
-- apply_migration (version 20260620143439). Recorded so supabase/migrations no
-- longer drifts from schema_migrations. Idempotent / no new DB change.
ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS thumbnail_assessed_at TIMESTAMPTZ;

ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS thumbnail_assessed_by TEXT;
