-- #174 parity — repo record of an already-applied remote migration (idempotent;
-- NO new DB change). Desktop/Code applied this via Supabase MCP apply_migration
-- (version 20260629190924). Recorded here so the repo no longer drifts from the
-- live database. IMAGE-SPLIT (#163) — operator-uploaded 상세페이지 images column.
ALTER TABLE public."Product" ADD COLUMN IF NOT EXISTS detail_images jsonb;
