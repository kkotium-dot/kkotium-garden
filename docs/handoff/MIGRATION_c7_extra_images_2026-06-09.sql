-- MIGRATION — C-7 composite pipeline: Product.extra_images (additional-image slots)
-- Authority: docs/design/REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md §3.3 (shared with C-3).
--   Code applied via Supabase apply_migration (name: c7_extra_images).
--
-- extra_images = jsonb array of additional-image URLs (composite/mood/lifestyle
-- subcuts; slots 2..9). NOT the representative (slot 1 = white-bg, §9). Default
-- '[]'. apply-composite (POST /api/products/[id]/apply-composite) appends to it.
--
-- IDEMPOTENT (ADD COLUMN IF NOT EXISTS) — safe to re-run and SHARED with C-3's
-- finishing schema migration; whichever runs first wins, the other is a no-op.
-- main_image_policy (C-4 override) is intentionally NOT added here — it belongs
-- to the C-3/C-4 scope.
--
-- ★ NOTE: the asset_jobs job_type CHECK already contains 'product_composite' and
-- 'harmonize' (Phase 2 swap-loop), so the C-7 job pipeline needs NO job_type
-- migration — only src/lib/jobs/job-type-routing.ts adds their tool routing.

ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS extra_images JSONB DEFAULT '[]'::jsonb;
