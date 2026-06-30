-- #174 parity (record-only) — already applied to the remote DB via Supabase MCP
-- apply_migration (version 20260616142438). Recorded so supabase/migrations no
-- longer drifts from schema_migrations. Idempotent / no new DB change.
CREATE TABLE "category_dna" (
  "id" text NOT NULL,
  "category_code" text NOT NULL,
  "category_name" text NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "parent_dna_id" text,
  "thumbnail_conventions" jsonb NOT NULL,
  "slot_sequence" jsonb NOT NULL,
  "mandatory_slots" jsonb NOT NULL,
  "tone_manner" jsonb NOT NULL,
  "composition_norms" jsonb NOT NULL,
  "trust_signals" jsonb NOT NULL,
  "demographics" jsonb NOT NULL,
  "palette" jsonb NOT NULL,
  "provenance" jsonb NOT NULL,
  "confidence" double precision NOT NULL DEFAULT 0.5,
  "status" text NOT NULL DEFAULT 'draft',
  "created_at" timestamp(3) NOT NULL DEFAULT now(),
  "updated_at" timestamp(3) NOT NULL,
  CONSTRAINT "category_dna_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "category_dna_category_code_idx" ON "category_dna"("category_code");
CREATE INDEX "category_dna_parent_dna_id_idx" ON "category_dna"("parent_dna_id");

CREATE TABLE "slot_plan" (
  "id" text NOT NULL,
  "product_id" text NOT NULL,
  "category_dna_id" text,
  "slots" jsonb NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp(3) NOT NULL DEFAULT now(),
  CONSTRAINT "slot_plan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "slot_plan_product_id_idx" ON "slot_plan"("product_id");

CREATE TABLE "prompt_version" (
  "id" text NOT NULL,
  "scope" text NOT NULL,
  "category_code" text,
  "slot_type" text,
  "template_text" text NOT NULL,
  "variables" jsonb NOT NULL,
  "model" text NOT NULL,
  "grounding_default" boolean NOT NULL DEFAULT false,
  "seed_policy" text NOT NULL DEFAULT 'free',
  "refs" jsonb,
  "version" integer NOT NULL,
  "parent_version_id" text,
  "status" text NOT NULL DEFAULT 'draft',
  "authored_by" text NOT NULL,
  "rationale" text,
  "created_at" timestamp(3) NOT NULL DEFAULT now(),
  CONSTRAINT "prompt_version_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "prompt_version_scope_idx" ON "prompt_version"("scope");
CREATE INDEX "prompt_version_category_code_slot_type_idx" ON "prompt_version"("category_code", "slot_type");
CREATE INDEX "prompt_version_parent_version_id_idx" ON "prompt_version"("parent_version_id");

CREATE TABLE "slot_generation" (
  "id" text NOT NULL,
  "product_id" text NOT NULL,
  "slot_type" text NOT NULL,
  "prompt_version_id" text NOT NULL,
  "resolved_prompt" text NOT NULL,
  "model" text NOT NULL,
  "model_version" text,
  "grounding" boolean NOT NULL DEFAULT false,
  "seed" text,
  "aspect" text,
  "refs" jsonb,
  "settings" jsonb,
  "output_url" text,
  "created_at" timestamp(3) NOT NULL DEFAULT now(),
  CONSTRAINT "slot_generation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "slot_generation_product_id_idx" ON "slot_generation"("product_id");
CREATE INDEX "slot_generation_prompt_version_id_idx" ON "slot_generation"("prompt_version_id");

CREATE TABLE "rating" (
  "id" text NOT NULL,
  "generation_id" text NOT NULL,
  "score" integer NOT NULL,
  "rated_by" text NOT NULL,
  "note" text,
  "created_at" timestamp(3) NOT NULL DEFAULT now(),
  CONSTRAINT "rating_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "rating_generation_id_idx" ON "rating"("generation_id");

CREATE TABLE "performance_metric" (
  "id" text NOT NULL,
  "generation_id" text,
  "product_id" text,
  "slot_type" text,
  "metric_type" text NOT NULL,
  "value" double precision NOT NULL,
  "window_start" timestamp(3) NOT NULL,
  "window_end" timestamp(3) NOT NULL,
  "source" text NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT now(),
  CONSTRAINT "performance_metric_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "performance_metric_generation_id_idx" ON "performance_metric"("generation_id");
CREATE INDEX "performance_metric_product_id_idx" ON "performance_metric"("product_id");
