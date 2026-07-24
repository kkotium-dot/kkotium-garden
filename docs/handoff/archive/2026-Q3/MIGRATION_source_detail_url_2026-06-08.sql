-- MIGRATION — two-branch system: full-res supplier detail capture (2026-06-08)
-- Authority: docs/design/IMAGE_DETAIL_TWO_BRANCH_SYSTEM.md §4 (P16 crawl-gap fix).
-- Code applied via Supabase apply_migration (name: add_source_detail_url).
--   Desktop: information_schema 검증 (#41) — confirm column present.
-- Additive only — nullable TEXT. Populated by the capture-source-detail route
-- (Domeggook getItemView → full-res detail → product-assets). Existing rows
-- unaffected. No Naver touch.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "source_detail_url" TEXT;
