-- MIGRATION — Phase 1 누락 방지 골격 (asset_jobs 상태머신 + 전이 로그 + 발행 자산)
-- Authority: docs/research/KKOTIUM_HYBRID_PIPELINE_SYSTEM_DESIGN_2026-06-06.md §4
-- Apply BEFORE pushing/deploying the code that reads these tables.
--   Desktop: Supabase MCP apply_migration (name: phase1_asset_jobs_tracking).
-- New tables only — Product / product_options / existing tables untouched.
-- String enums enforced by CHECK constraints (Prisma models keep them as String,
-- same pattern as backdrop_jobs.status). Prisma ignores CHECK on drift → no drift.
-- Identifiers quoted for Prisma parity (snake_case columns; no folding surprises).

-- ── asset_jobs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "asset_jobs" (
  "id"                TEXT NOT NULL,
  "product_id"        TEXT NOT NULL,
  "concept_plan_id"   TEXT,
  "lane"              TEXT NOT NULL,
  "job_type"          TEXT NOT NULL,
  "tool"              TEXT NOT NULL,
  "ip_safe"           BOOLEAN NOT NULL DEFAULT false,
  "status"            TEXT NOT NULL DEFAULT 'pending',
  "priority"          INTEGER NOT NULL DEFAULT 0,
  "version"           INTEGER NOT NULL DEFAULT 0,
  "retry_count"       INTEGER NOT NULL DEFAULT 0,
  "max_retries"       INTEGER NOT NULL DEFAULT 3,
  "input_refs"        JSONB,
  "output_refs"       JSONB,
  "blocked_reason"    TEXT,
  "assigned_session"  TEXT,
  "heartbeat_at"      TIMESTAMP(3),
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_attempted_at" TIMESTAMP(3),
  CONSTRAINT "asset_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_jobs_lane_check" CHECK ("lane" IN
    ('generate','process','compose','review','publish')),
  CONSTRAINT "asset_jobs_job_type_check" CHECK ("job_type" IN
    ('firefly_generate','remove_bg','color_correct','resize','vectorize',
     'figma_compose','sharp_composite','mockup','naver_image_upload','naver_publish')),
  CONSTRAINT "asset_jobs_tool_check" CHECK ("tool" IN
    ('firefly','adobe_express','figma','canva','claude_design','sharp','naver_api')),
  CONSTRAINT "asset_jobs_status_check" CHECK ("status" IN
    ('pending','ready','in_progress','blocked','awaiting_approval','done','failed','cancelled'))
);
CREATE INDEX IF NOT EXISTS "asset_jobs_product_id_idx" ON "asset_jobs"("product_id");
CREATE INDEX IF NOT EXISTS "asset_jobs_status_idx"     ON "asset_jobs"("status");
CREATE INDEX IF NOT EXISTS "asset_jobs_lane_idx"       ON "asset_jobs"("lane");

-- ── asset_job_transitions (append-only) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "asset_job_transitions" (
  "id"          TEXT NOT NULL,
  "job_id"      TEXT NOT NULL,
  "from_status" TEXT,
  "to_status"   TEXT NOT NULL,
  "event"       TEXT,
  "actor"       TEXT NOT NULL DEFAULT 'system',
  "note"        TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_job_transitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_job_transitions_actor_check" CHECK ("actor" IN
    ('system','ai_agent','human'))
);
CREATE INDEX IF NOT EXISTS "asset_job_transitions_job_id_idx" ON "asset_job_transitions"("job_id");
ALTER TABLE "asset_job_transitions"
  ADD CONSTRAINT "asset_job_transitions_job_id_fkey"
  FOREIGN KEY ("job_id") REFERENCES "asset_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── published_assets ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "published_assets" (
  "id"              TEXT NOT NULL,
  "product_id"      TEXT NOT NULL,
  "asset_urn"       TEXT NOT NULL,
  "role"            TEXT NOT NULL,
  "ip_provenance"   JSONB,
  "naver_image_url" TEXT,
  "published_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "published_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "published_assets_role_check" CHECK ("role" IN ('main','sub','detail'))
);
CREATE INDEX IF NOT EXISTS "published_assets_product_id_idx" ON "published_assets"("product_id");
