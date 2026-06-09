-- MIGRATION — C-4 representative-image policy override: Product.main_image_policy
-- Authority: docs/design/REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md §4 (shared with C-3 §3.3).
--   Code applied via Supabase apply_migration (name: c4_main_image_policy).
--
-- main_image_policy = an operator override for the white-bg representative guard.
--   'lifestyle_intended' = keep a non-white-bg representative on purpose (e.g. the
--   myeonghwa leather hero). seo-guard downgrades main_image_white_bg fail -> info
--   and the control-tower action queue stops surfacing the finish-representative
--   step. NULL = no override (default white-bg rule applies).
--
-- IDEMPOTENT (ADD COLUMN IF NOT EXISTS) — safe to re-run, SHARED with C-3's
-- finishing schema migration (whichever runs first wins, the other is a no-op).
-- Both the seo-guard route and the matrix route read this column behind a
-- P2022 guard, so the app is safe before AND after this migration.

ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS main_image_policy VARCHAR(30);
