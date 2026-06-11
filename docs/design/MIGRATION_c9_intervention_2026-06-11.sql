-- MIGRATION c9_intervention_fields (2026-06-11)
-- Applied via Supabase MCP apply_migration by Desktop. Additive + reversible.
-- Verified: information_schema shows both columns nullable, no default.
--
-- Purpose: drive C-9 operator intervention cards from the asset_jobs lifecycle,
-- so the existing Operator Action Queue (control-tower-engine.actionQueue) can
-- render a PRECISE card (which intervention, with payload) instead of a generic
-- AUTH card on awaiting_human.
--
--   intervention_type:    'source_request' | 'hero_crop_request' | 'firefly_drop'  (null = none)
--   intervention_payload: jsonb — dropkit path, prompt text, crop guidance, source url, etc.
--
-- Invisible to running code (48e6926 references neither column). Reversible:
--   ALTER TABLE asset_jobs DROP COLUMN IF EXISTS intervention_type, DROP COLUMN IF EXISTS intervention_payload;

ALTER TABLE asset_jobs
  ADD COLUMN IF NOT EXISTS intervention_type text,
  ADD COLUMN IF NOT EXISTS intervention_payload jsonb;
