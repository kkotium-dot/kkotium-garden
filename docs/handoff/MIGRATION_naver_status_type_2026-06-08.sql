-- MIGRATION — applyStatus accuracy: cache Naver statusType (2026-06-08)
-- Authority: docs/decisions/2026-06-08-always-state-status-and-universal.md
--   + Desktop TASK_BRIDGE: applyStatus.publishState must reflect the real Naver
--     listing state (SALE/SUSPENSION), not merely "registered".
-- Code applied via Supabase apply_migration (name: add_naver_status_type).
--   Desktop: information_schema 검증 (#41) — confirm column present.
-- Additive only — nullable column. Populated by the inspect route (live Naver
-- read; local DB cache write, Naver mutate 0). Existing rows/queries unaffected.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "naver_status_type" VARCHAR(30);
