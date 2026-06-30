-- #174 parity (record-only) — already applied to the remote DB via Supabase MCP
-- apply_migration (version 20260612113400). Recorded so supabase/migrations no
-- longer drifts from schema_migrations. Idempotent / no new DB change.
-- Server-side only (listProductAssets uses the service-role key). Grant EXECUTE
-- to service_role ONLY — never anon/authenticated, since the function is
-- security definer and reads storage.objects bypassing RLS.
grant execute on function public.product_asset_objects(text) to service_role;
