-- #174 parity (record-only) — already applied to the remote DB via Supabase MCP
-- apply_migration (version 20260616024025). Recorded so supabase/migrations no
-- longer drifts from schema_migrations. Idempotent / no new DB change.
-- Mood-Camera Spec System (2026-06-16, session8). Additive, reverse-deploy-safe.
-- 1:1 with prisma/schema.prisma models MoodAxis/CameraSpec/PromptBlock/
-- PromptLibraryEntry/Generation. Authority: docs/design/MOOD_CAMERA_SPEC_SYSTEM.md.

CREATE TABLE "mood_axis" (
  "id" text NOT NULL,
  "code" text NOT NULL,
  "name_ko" text NOT NULL,
  "conversion_job" text NOT NULL,
  "benchmark_dna" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "created_at" timestamp(3) NOT NULL DEFAULT now(),
  CONSTRAINT "mood_axis_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mood_axis_code_key" ON "mood_axis"("code");

CREATE TABLE "camera_spec" (
  "id" text NOT NULL,
  "mood_axis_id" text NOT NULL,
  "camera_archetype" text NOT NULL,
  "lens" text NOT NULL,
  "aperture" text NOT NULL,
  "lighting" text NOT NULL,
  "color_grade" text NOT NULL,
  "realism_cues" text NOT NULL,
  "resolution" text NOT NULL,
  "aspect_ratio" text NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT now(),
  CONSTRAINT "camera_spec_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "camera_spec_mood_axis_id_idx" ON "camera_spec"("mood_axis_id");

CREATE TABLE "prompt_block" (
  "id" text NOT NULL,
  "type" text NOT NULL,
  "mood_axis_id" text,
  "body_en" text NOT NULL,
  "is_fixed" boolean NOT NULL DEFAULT false,
  "created_at" timestamp(3) NOT NULL DEFAULT now(),
  CONSTRAINT "prompt_block_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "prompt_block_mood_axis_id_idx" ON "prompt_block"("mood_axis_id");
CREATE INDEX "prompt_block_type_idx" ON "prompt_block"("type");

CREATE TABLE "prompt_library_entry" (
  "id" text NOT NULL,
  "mood_axis_id" text NOT NULL,
  "benchmark_dna" text,
  "assembled_prompt" text NOT NULL,
  "camera_spec_id" text NOT NULL,
  "product_category_tags" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "example_output_url" text,
  "rating" integer,
  "is_favorite" boolean NOT NULL DEFAULT false,
  "version" integer NOT NULL DEFAULT 1,
  "parent_id" text,
  "created_at" timestamp(3) NOT NULL DEFAULT now(),
  "updated_at" timestamp(3) NOT NULL DEFAULT now(),
  CONSTRAINT "prompt_library_entry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prompt_library_entry_rating_check" CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5))
);
CREATE INDEX "prompt_library_entry_mood_axis_id_idx" ON "prompt_library_entry"("mood_axis_id");
CREATE INDEX "prompt_library_entry_camera_spec_id_idx" ON "prompt_library_entry"("camera_spec_id");
CREATE INDEX "prompt_library_entry_parent_id_idx" ON "prompt_library_entry"("parent_id");

CREATE TABLE "generation" (
  "id" text NOT NULL,
  "entry_id" text NOT NULL,
  "product_name" text NOT NULL,
  "output_url" text,
  "model" text NOT NULL,
  "rating" integer,
  "naver_ctr" double precision,
  "created_at" timestamp(3) NOT NULL DEFAULT now(),
  CONSTRAINT "generation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "generation_entry_id_idx" ON "generation"("entry_id");

ALTER TABLE "camera_spec" ADD CONSTRAINT "camera_spec_mood_axis_id_fkey" FOREIGN KEY ("mood_axis_id") REFERENCES "mood_axis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prompt_block" ADD CONSTRAINT "prompt_block_mood_axis_id_fkey" FOREIGN KEY ("mood_axis_id") REFERENCES "mood_axis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "prompt_library_entry" ADD CONSTRAINT "prompt_library_entry_mood_axis_id_fkey" FOREIGN KEY ("mood_axis_id") REFERENCES "mood_axis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prompt_library_entry" ADD CONSTRAINT "prompt_library_entry_camera_spec_id_fkey" FOREIGN KEY ("camera_spec_id") REFERENCES "camera_spec"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prompt_library_entry" ADD CONSTRAINT "prompt_library_entry_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "prompt_library_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "generation" ADD CONSTRAINT "generation_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "prompt_library_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
