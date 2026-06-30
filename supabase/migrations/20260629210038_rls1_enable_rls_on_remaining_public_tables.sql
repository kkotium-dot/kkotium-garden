-- #174 parity — repo record of an already-applied remote migration (idempotent;
-- NO new DB change). Applied via Supabase MCP apply_migration (version
-- 20260629210038). Recorded here so the repo no longer drifts from the live
-- database. Body below is the verbatim recorded statement.
-- RLS-1 (#164): enable Row Level Security on the remaining public tables that
-- still had it disabled. Safe by parity — the core tables (Product/Order/User/
-- Supplier/store_settings/crawl_logs/...) already have RLS enabled and prod is
-- healthy, proving Prisma (postgres role) and the service-role client both bypass
-- RLS. No policies are added: these tables are server-only (audit found zero
-- client/anon supabase.from usage; the single edge function naver-proxy touches
-- no tables), so bare RLS = deny-all to anon/authenticated = the intended lockdown.
-- Reversible (ALTER ... DISABLE), no data change.
ALTER TABLE public."Diagnosis"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LifestyleAsset"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_job_transitions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_jobs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_library           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_references        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_registry          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backdrop_jobs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_dna           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_blocks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_spec             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_dna            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_mappings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_metadata_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_trend_cache    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_snapshots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_recommendations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dark_pattern_lint_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designer_jam_queue      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dome_categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_snapshots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.low_stock_alerts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_axis               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.naver_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.origin_codes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metric      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platforms               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_movement_alerts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_block            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_library_entry    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_version          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_assets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_overrides        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_penetration_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skeleton_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_generation         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_plan               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_stock_profiles ENABLE ROW LEVEL SECURITY;
