-- MIGRATION — Phase 2 제품교체(B안) 루프: job_type/status 확장 + asset_references
-- Authority: docs/research/KKOTIUM_PRODUCT_SWAP_LOOP_DESIGN_2026-06-06.md §6
-- ★ ORDER: apply AFTER MIGRATION_phase1_asset_jobs_2026-06-06.sql (incremental ALTERs
--   on the Phase 1 asset_jobs table). Desktop: Supabase apply_migration
--   (name: phase2_product_swap_loop).
-- Additive only — new column / widened CHECK values / new table. Existing rows
-- and queries unaffected (BackdropJob/String-enum precedent). No Naver touch.

-- ── asset_jobs: new nullable column (concept combo) ────────────────────────
ALTER TABLE "asset_jobs" ADD COLUMN IF NOT EXISTS "concept_combo_id" TEXT;

-- ── asset_jobs: widen job_type CHECK with the 6 product-swap (B-plan) types ─
ALTER TABLE "asset_jobs" DROP CONSTRAINT IF EXISTS "asset_jobs_job_type_check";
ALTER TABLE "asset_jobs" ADD CONSTRAINT "asset_jobs_job_type_check" CHECK ("job_type" IN
  ('firefly_generate','remove_bg','color_correct','resize','vectorize',
   'figma_compose','sharp_composite','mockup','naver_image_upload','naver_publish',
   'product_cutout','mood_bg_generate','product_composite','harmonize',
   'express_finalize','naver_normalize'));

-- ── asset_jobs: widen status CHECK with the 4 swap-loop states ──────────────
ALTER TABLE "asset_jobs" DROP CONSTRAINT IF EXISTS "asset_jobs_status_check";
ALTER TABLE "asset_jobs" ADD CONSTRAINT "asset_jobs_status_check" CHECK ("status" IN
  ('pending','ready','in_progress','blocked','awaiting_approval','done','failed','cancelled',
   'awaiting_human','human_done','review','rejected'));

-- ── asset_references (join) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "asset_references" (
  "id"         TEXT NOT NULL,
  "job_id"     TEXT NOT NULL,
  "asset_kind" TEXT NOT NULL,
  "asset_urn"  TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_references_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_references_asset_kind_check" CHECK ("asset_kind" IN
    ('product_cutout','mood_bg','brand_kit','generated_candidate'))
);
CREATE INDEX IF NOT EXISTS "asset_references_job_id_idx" ON "asset_references"("job_id");
ALTER TABLE "asset_references"
  ADD CONSTRAINT "asset_references_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "asset_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
