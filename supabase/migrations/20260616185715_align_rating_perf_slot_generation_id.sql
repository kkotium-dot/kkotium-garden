-- #174 parity (record-only) — already applied to the remote DB via Supabase MCP
-- apply_migration (version 20260616185715). Recorded so supabase/migrations no
-- longer drifts from schema_migrations. Idempotent / no new DB change.
-- #62 naming alignment: rating / performance_metric reference slot_generation,
-- so generation_id -> slot_generation_id (additive rename, data preserved).
ALTER TABLE public.rating RENAME COLUMN generation_id TO slot_generation_id;
ALTER TABLE public.performance_metric RENAME COLUMN generation_id TO slot_generation_id;
ALTER INDEX public.rating_generation_id_idx RENAME TO rating_slot_generation_id_idx;
ALTER INDEX public.performance_metric_generation_id_idx RENAME TO performance_metric_slot_generation_id_idx;
