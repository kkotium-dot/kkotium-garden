-- #174 parity (record-only) — already applied to the remote DB via Supabase MCP
-- apply_migration (version 20260622153041). Recorded so supabase/migrations no
-- longer drifts from schema_migrations. Idempotent / no new DB change.
-- C5-1 (E8 v2 data model): additive, reversible via DROP. 0-row.
CREATE TABLE IF NOT EXISTS public.benchmark_dna (
  id                  text PRIMARY KEY,
  category_code       text NOT NULL,
  source_priority     jsonb NOT NULL,
  commerce_convention jsonb NOT NULL,
  trend_keywords      jsonb NOT NULL,
  source_refs         jsonb,
  status              text NOT NULL DEFAULT 'draft',
  reviewed_by         text,
  reviewed_at         timestamptz,
  collected_by        text NOT NULL,
  notes               text,
  version             integer NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS benchmark_dna_category_code_status_idx
  ON public.benchmark_dna (category_code, status);

ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS aesthetic_dna jsonb;
