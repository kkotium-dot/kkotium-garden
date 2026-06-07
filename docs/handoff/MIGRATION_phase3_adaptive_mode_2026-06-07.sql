-- MIGRATION — Phase 3 적응형 3모드 시스템: Product 모드 컬럼 + asset_jobs job_type 확장
-- Authority: docs/research/KKOTIUM_ADAPTIVE_SEO_IMAGE_SYSTEM_2026-06-06.md §5
-- ★ ORDER: apply AFTER MIGRATION_phase1_asset_jobs + MIGRATION_phase2_product_swap.
--   Desktop: Supabase apply_migration (name: phase3_adaptive_mode).
-- Additive only — new nullable Product columns + widened asset_jobs CHECK.
--   Existing rows/queries unaffected (String-enum precedent). No Naver touch.
-- ★ 역순배포 가드(#50): the code that READS these columns guards column-missing
--   errors (P2021/P2022) → degrades gracefully until this migration lands.
--
-- ★ TABLE-NAME CONVENTION (2026-06-07 corrected — was "products" in v1, rolled
--   back with relation does-not-exist; Desktop re-applied as "Product"):
--     - The Product model has NO @@map → its table is "Product" (PascalCase).
--     - asset_jobs / published_assets / asset_references use @@map → snake_case.
--   Always baseline the real table name before writing migration DDL.

-- ── Product: adaptive 3-mode columns (classifier output + operator override) ──
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "brand_line"       VARCHAR(20);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "quality_score"    INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "recommended_mode" VARCHAR(20);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "quality_reasons"  JSONB;

-- brand_line: SEED (씨앗심기, low-involvement) | GREENHOUSE (온실아틀리에, high-involvement)
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_brand_line_check";
ALTER TABLE "Product" ADD CONSTRAINT "Product_brand_line_check"
  CHECK ("brand_line" IS NULL OR "brand_line" IN ('SEED','GREENHOUSE'));

-- recommended_mode: SIMPLE (간편, 크롭+최소SEO) | ENHANCE (보강) | NEW (주력신규, B안)
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_recommended_mode_check";
ALTER TABLE "Product" ADD CONSTRAINT "Product_recommended_mode_check"
  CHECK ("recommended_mode" IS NULL OR "recommended_mode" IN ('SIMPLE','ENHANCE','NEW'));

-- ── asset_jobs: widen job_type CHECK with the 5 adaptive-mode chain types ─────
-- Lowercase to match the existing 16 values (Phase 1/2). These map to the
-- handoff's QUALITY_ASSESS / THUMB_CROP / SEO_TEXT / SEO_IMAGE / BG_SWAP.
--   quality_assess : sharp/OpenCV quantitative score + recommended_mode
--   thumb_crop     : detail-page 1:1 crop (SIMPLE/ENHANCE) — no cutout
--   seo_text       : category/attribute/name/tag auto-fill (all modes)
--   seo_image      : additional-image / banner enrichment (ENHANCE/NEW)
--   bg_swap        : B-plan cutout+AI-bg composite umbrella (NEW mode)
ALTER TABLE "asset_jobs" DROP CONSTRAINT IF EXISTS "asset_jobs_job_type_check";
ALTER TABLE "asset_jobs" ADD CONSTRAINT "asset_jobs_job_type_check" CHECK ("job_type" IN
  ('firefly_generate','remove_bg','color_correct','resize','vectorize',
   'figma_compose','sharp_composite','mockup','naver_image_upload','naver_publish',
   'product_cutout','mood_bg_generate','product_composite','harmonize',
   'express_finalize','naver_normalize',
   'quality_assess','thumb_crop','seo_text','seo_image','bg_swap'));
