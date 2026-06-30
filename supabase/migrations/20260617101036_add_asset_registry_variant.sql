-- #174 parity (record-only) — already applied to the remote DB via Supabase MCP
-- apply_migration (version 20260617101036). Recorded so supabase/migrations no
-- longer drifts from schema_migrations. Idempotent / no new DB change.
ALTER TABLE public.asset_registry ADD COLUMN IF NOT EXISTS variant text;
COMMENT ON COLUMN public.asset_registry.variant IS 'Option-variant binding (scent/color/size) for variant_composite coverage (#62). NULL = non-variant asset.';
CREATE INDEX IF NOT EXISTS idx_asset_registry_product_variant ON public.asset_registry (product_id, variant);
