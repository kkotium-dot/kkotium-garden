-- SEC-1 (#174) — repo↔DB parity for an already-applied remote migration.
--
-- The SECURITY DEFINER function public.product_asset_objects(text) was callable
-- by the anon and authenticated PostgREST roles via /rest/v1/rpc/, exposing it to
-- anyone with the public anon key (security advisor finding). Desktop hardened the
-- remote DB directly via Supabase MCP apply_migration (version 20260629232910).
--
-- This file records the SAME SQL in the repo so the migration history is
-- reproducible and the repo no longer drifts from the live database. It applies
-- NO new change to the already-hardened DB (REVOKE/GRANT are idempotent).
REVOKE EXECUTE ON FUNCTION public.product_asset_objects(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.product_asset_objects(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.product_asset_objects(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.product_asset_objects(text) TO service_role;
