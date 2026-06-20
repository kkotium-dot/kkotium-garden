-- MIGRATION — C19 representative-image assessment: Product.thumbnail_assessed_at / _by
-- Authority: PARALLEL_WORK_TRACKER §4 C19 (#56 operator intervention, P1 revenue).
--   Apply via Supabase apply_migration (name: c19_thumbnail_assess).
--
-- The publish-readiness gate's thumbnailAssessed flag (publish-readiness.ts) was
-- structurally always-false: nothing ever supplied thumbnailSignals, so the
-- representative-image policy gate never ran (defaulted to pass). C19 lets an
-- operator ATTEST the representative meets Naver's 대표이미지 policy (single
-- product, no on-image text, no promo/price/border overlays). On approval these
-- columns are stamped and the gate injects the attested-pass signals, flipping
-- thumbnailAssessed -> true (and thumbnailPass -> true) for that product.
--   thumbnail_assessed_at — when the operator approved (NULL = not assessed).
--   thumbnail_assessed_by — who approved (operator id / 'operator', NULL ok).
--
-- IDEMPOTENT (ADD COLUMN IF NOT EXISTS) — safe to re-run. The app reads/writes
-- these columns via GUARDED raw SQL (src/lib/automation/thumbnail-assessment.ts):
-- a missing column is caught and treated as "not assessed", so the app is safe
-- BEFORE and AFTER this migration and there is no schema-prisma / bare-select
-- coupling (no Prisma client field added) — deploy order is unconstrained.

ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS thumbnail_assessed_at TIMESTAMPTZ;

ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS thumbnail_assessed_by TEXT;
