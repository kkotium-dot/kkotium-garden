# DESIGN BRIEF 2026-06-24 (rev44) - ★ 보안 라인 종결: RLS-1·SEC-1 완료·검증 + SEC-1 repo 패리티 커밋(33a19c8) 검증. 잔여=드리프트 2건 백필(Code, SQL 확보) + SEC-2(운영자) + 명화 backfill(운영자).

Authoring: DESKTOP -> CODE-CLI. SD-01 untouched. prod = cb23606 (dpl_6g65). HEAD = 33a19c8.
원칙: #45/#55/#62/#82/#156/#164/#166/#170~#174.

================================================================
## ★ 보안 라인 (RLS-1 + SEC-1) - 전부 완료·검증
================================================================
**RLS-1:** 익명/publishable 키 전테이블 401 차단(Product/Order/asset_registry/crawl_logs) + prod 3페이지(dashboard/products/studio) 무파손 실측. public 55/55 RLS ON. anon supabase import 0건.
**SEC-1:** product_asset_objects(text) = 유일 SECURITY DEFINER+PUBLIC EXECUTE(생성 시 20260612113259에서 기본 PUBLIC EXECUTE가 회수 없이 딸려온 게 근원). 앱 참조 0건. → REVOKE PUBLIC/anon/authenticated(service_role 유지) 적용. ACL `postgres=X·service_role=X` 확정 + 익명 RPC 재호출 401 이중차단 검증.
**SEC-1 repo 패리티(33a19c8):** supabase/migrations/20260629232910_*.sql 1파일, 본문=적용 SQL 정확 일치(멱등), version 원격 1:1 정합, origin/main 푸시. Desktop 실측 검증 완료.

================================================================
## ★ #174 드리프트 백필 - 2건 GO (실 기록 SQL 확보)
================================================================
supabase/migrations/ 디렉터리가 SEC-1로 처음 생성됨. 이전 MCP 적용분이 원격에만 존재. 같은 작업흐름 2건을 동일 패턴(record-only·DB변경0·멱등)으로 repo 백필:

**(1) 20260629190924_add_detail_images_column.sql** — 원격 기록 SQL:
```
ALTER TABLE public."Product" ADD COLUMN IF NOT EXISTS detail_images jsonb;
```

**(2) 20260629210038_rls1_enable_rls_on_remaining_public_tables.sql** — 원격 기록 SQL(주석 포함, 45개 테이블 ENABLE ROW LEVEL SECURITY): Diagnosis/LifestyleAsset/_prisma_migrations/asset_job_transitions/asset_jobs/asset_library/asset_references/asset_registry/backdrop_jobs/benchmark_dna/building_blocks/camera_spec/category_dna/category_mappings/category_metadata_cache/category_trend_cache/competitor_snapshots/daily_recommendations/dark_pattern_lint_logs/designer_jam_queue/diagnosis_results/dome_categories/generation/inventory_snapshots/low_stock_alerts/mood_axis/naver_categories/origin_codes/performance_metric/platforms/price_movement_alerts/product_events/product_options/prompt_block/prompt_library_entry/prompt_version/published_assets/rating/seller_overrides/seo_penetration_logs/shipping_templates/skeleton_templates/slot_generation/slot_plan/supplier_stock_profiles. (Code는 원격 statements[1] 그대로 복사 — Desktop이 SELECT statements[1]로 추출해 인계.)

**★별도 BACKLOG(선택, 운영자 결정):** 더 오래된 원격 전용 마이그레이션 9건(20260612~20260622)도 repo 부재 — 동일 #174 드리프트나 폴더 컨벤션 이전 것. 완전 정합 원하면 `supabase db pull`/migration list로 일괄 백필(역시 DB변경0). 비차단·사전존재라 별도 처리.

================================================================
## SEC-2 (leaked-password protection) - 운영자(대시보드)
================================================================
auth.users=1명(운영자 로그인 추정). 활성화=향후 PW 변경 시 HaveIBeenPwned 대조(무해·BP). 대시보드 토글이라 MCP 불가 → 운영자. 낮음.

================================================================
## 완료 누적 (이번 세션 라인)
================================================================
NAVER-APP-2 RESOLVED · IMAGE-DROPZONE-MAIN(cfa244f) · NAVER분류GAP(475f63f) · 거짓ok A·B(b22aaf4) · orders정직화(cb23606=prod) · RLS-1 · SEC-1 · SEC-1패리티(33a19c8).

================================================================
## 잔여 (전부 독립·병행 가능)
================================================================
1. 드리프트 2건 백필(Code) — 위 SQL. 비차단.
2. (선택) older-9 백필(Code) — 운영자 결정.
3. SEC-2 토글(운영자, 대시보드) — 낮음.
4. 명화 backfill(운영자 진행 중) → 발행 게이트(backfill+GO #46/#124). 인증 차단 없음.

================================================================
## BACKLOG SPECS (영구 #157)
================================================================
- ★프록시 단일 장애점 → 고정IP VM(발행 안정화 후). ★시크릿 핫리로드(현재 교체=재시작 #173). apicenter 잔재 IP 2개 정리(슬롯 3/3, 지금 삭제 금지). Supabase naver-proxy 함수·Vercel NAVER_CLIENT_SECRET 미사용 정리(선택). older-9 마이그레이션 백필. 추가/상세 라운드트립 검증. HOOK-3.

================================================================
## PRINCIPLES
================================================================
- #174 MCP apply_migration=원격만 반영→repo 드리프트. 적용 후 Code 패리티 커밋(원격 statements[1] 실 기록을 SELECT로 추출해 인계, 기억 재구성 금지). 보안 진단은 REST 표면(404/401)만 보지 말고 pg_proc.proacl/prosecdef 직접 조회로 잠재 권한 확인. 함수 생성 시 PUBLIC EXECUTE 기본값 → DEFINER 함수는 생성과 동시에 REVOKE 습관화.
- #173 .env 교체≠적용(시작1회 로드→재시작). #172/#171/#170 활성경로=실 구성+수신로그. #166 프록시서명=프록시머신. #165 표면응답 신뢰금지. #164 RLS=lock-add·AUDIT 후 ENABLE. #156 키값 미취급(publishable 공개키 테스트는 수행). #82 정직. #62 전역. #55 범용. #45 Done=실측. #46/#124 발행 GO. SD-01.
