-- #174 parity (record-only) — already applied to the remote DB via Supabase MCP
-- apply_migration (version 20260612103020). Recorded so supabase/migrations no
-- longer drifts from schema_migrations. Idempotent / no new DB change.
-- Asset Registry v2 (additive, idempotent). Queryable index of stored assets
-- populated by the semi-automatic intake. Supplementary to Supabase Storage.
CREATE TABLE IF NOT EXISTS "asset_registry" (
  "id"          text PRIMARY KEY,
  "product_id"  text NOT NULL,
  "stage"       text NOT NULL,
  "angle"       text,
  "mood"        text,
  "slot"        text,
  "context"     text,
  "file_name"   text NOT NULL,
  "path"        text NOT NULL,
  "width"       integer,
  "height"      integer,
  "source_tag"  text,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "asset_registry_path_key" ON "asset_registry" ("path");
CREATE INDEX IF NOT EXISTS "asset_registry_product_stage_idx" ON "asset_registry" ("product_id","stage");
