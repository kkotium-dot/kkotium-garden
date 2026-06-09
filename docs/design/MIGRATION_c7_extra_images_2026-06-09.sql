-- MIGRATION c7 extra_images (2026-06-09)
-- Applied to Supabase project doxfizicftgtqktmtftf via Desktop apply_migration.
-- Additive, reversible, idempotent. Production-safe (no existing code references
-- this column until C-5 UI / C-7 apply-composite is merged). Verified:
--   information_schema -> jsonb, default '[]'::jsonb, NOT NULL.
-- Used by /api/products/[id]/apply-composite (C-7) to append additional-image
-- slots (slots 2..9). Shared with C-3 (finish-image schema). main_image_policy
-- (C-4 override) is a separate, later migration.

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS extra_images jsonb NOT NULL DEFAULT '[]'::jsonb;
