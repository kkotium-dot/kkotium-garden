-- #174 parity (record-only) — already applied to the remote DB via Supabase MCP
-- apply_migration (version 20260612081226). Recorded so supabase/migrations no
-- longer drifts from schema_migrations. Idempotent / no new DB change.
-- Product Fidelity Card (additive, idempotent). Per-product reality anchor
-- consumed by the image-prompt builder and the pre-publish fidelity-check gate.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "fidelity" jsonb;
