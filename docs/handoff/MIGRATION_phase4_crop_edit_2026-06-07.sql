-- MIGRATION — Phase 4 crop/edit workflow: asset_jobs job_type 확장 (4종)
-- Authority: docs/design/THUMBNAIL_CROP_EDIT_STANDARD.md §3/§5
--            + docs/handoff/HANDOFF_session_2026-06-07_5_crop_edit_workflow_apply.md (T3)
-- ★ ORDER: apply AFTER MIGRATION_phase1 + phase2 + phase3.
--   Code applied via Supabase apply_migration (name: phase4_crop_edit_job_types).
--   Desktop: information_schema 검증 (#41) — confirm 25 values present.
-- Additive only — the existing 21 values are preserved (String-enum precedent).
--   Existing rows/queries unaffected. No Naver touch.
--
-- ★ TABLE-NAME CONVENTION: asset_jobs uses @@map → snake_case (Product is PascalCase).
--
-- ── asset_jobs: widen job_type CHECK with the 4 crop/edit types ───────────────
--   region_crop   : operator-specified bounding-box crop (Sharp).
--   text_remove   : inpaint junk text on a cut (Firefly / Adobe Express).
--   canvas_expand : outpaint a non-square cut to 1:1 (Firefly / Adobe Express).
--   bg_clean      : background tidy / neutralize (Firefly / Adobe Express).
-- Tool routing (see src/lib/jobs/job-type-routing.ts):
--   region_crop → sharp ; text_remove|canvas_expand|bg_clean → firefly|adobe_express.
ALTER TABLE "asset_jobs" DROP CONSTRAINT IF EXISTS "asset_jobs_job_type_check";
ALTER TABLE "asset_jobs" ADD CONSTRAINT "asset_jobs_job_type_check" CHECK ("job_type" IN
  ('firefly_generate','remove_bg','color_correct','resize','vectorize',
   'figma_compose','sharp_composite','mockup','naver_image_upload','naver_publish',
   'product_cutout','mood_bg_generate','product_composite','harmonize',
   'express_finalize','naver_normalize',
   'quality_assess','thumb_crop','seo_text','seo_image','bg_swap',
   'region_crop','text_remove','canvas_expand','bg_clean'));
