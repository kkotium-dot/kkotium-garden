-- MIGRATION product_review_gate (2026-07-29)
-- Applied to Supabase project doxfizicftgtqktmtftf via Desktop apply_migration
-- (CLAUDE.md HOW · 작업원칙 #41 — Claude Code does NOT mutate production).
--
-- ADR-0003 (docs/decisions/ADR-0003-publish-review-gate-decisions.md) · design
-- docs/design/PUBLISH_REVIEW_GATE_2026-07-23.md.
--
-- review_checklist    : JSONB — { approved: boolean, approvedAt: ISO,
--   gateSnapshot: {readiness:number, imageWarnings:number}, note?: string }.
--   NULL = never reviewed.
-- review_last_updated : timestamp of the last approval action. Compared
--   against a review-relevant field whitelist (name/category/mainImage/
--   images/salePrice/options) — NOT Product.updatedAt as a whole — to decide
--   REVIEW_STALE (#316-A): a bare inventory-poller touch must not silently
--   expire an operator's approval.
--
-- Deliberately separate from public."store_settings".review_checklist
-- (E-2A manual customer-review counter) — that is a store-wide singleton row
-- and cannot represent a per-product approval.
--
-- Additive, reversible, idempotent (ADD COLUMN IF NOT EXISTS). Nullable + no
-- default: NULL reads as "not yet reviewed", matching decidePublishGate's
-- fail-closed default in src/lib/products/publish-review-gate.ts. Production-
-- safe — consumers guard P2021/P2022 so routes are safe before this lands.

ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS review_checklist JSONB,
  ADD COLUMN IF NOT EXISTS review_last_updated TIMESTAMP(3);
