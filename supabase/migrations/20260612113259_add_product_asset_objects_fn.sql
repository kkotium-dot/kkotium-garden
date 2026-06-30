-- #174 parity (record-only) — already applied to the remote DB via Supabase MCP
-- apply_migration (version 20260612113259). Recorded so supabase/migrations no
-- longer drifts from schema_migrations. Idempotent / no new DB change.
-- Deterministic asset listing for a product (replaces the flaky per-prefix
-- Supabase Storage list() which intermittently returns empty for nested
-- prefixes on the serverless runtime). READ-ONLY. security definer so the
-- service-role RPC reads storage.objects directly; returns every object
-- under {pid}/. Authorized by operator (전상품 fix, item 3).
create or replace function public.product_asset_objects(p_product_id text)
returns table(name text, size bigint, created_at timestamptz)
language sql
stable
security definer
set search_path = storage, public
as $$
  select o.name,
         coalesce((o.metadata->>'size')::bigint, 0) as size,
         o.created_at
  from storage.objects o
  where o.bucket_id = 'product-assets'
    and o.name like p_product_id || '/%'
    and o.id is not null
$$;
