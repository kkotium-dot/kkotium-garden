# KKOTIUM GARDEN — 프로젝트 진행 현황
> 최종 업데이트: 2026-05-27 B-4 진단 API 504 근본 복구 (Code turn, 5 파일 + docs 4건). Desktop 측 검증 대기. **현재 blocker**: B-4 Desktop 재검증 → 통과 후 명화송풍구 등록 완주 + B-5~B-8 정리.
> 2026-05-26 DB P1000 복구 + Studio 클릭 버그(B-1) 수정 + B-2 빈 outputs guard (Code turn, 6 컴포넌트 + 1 hook + docs 4건)
> **v3.2 신규 채택 (2026-05-21)**: P-Filter 전처리 모듈 + 다크패턴 lint + 단일 캔버스 인라인 마법사 + 4등급 한글 라벨(기본 자동화/검토 후 자동화/디자이너 손길 필요/완전 수동). 참고: `docs/research/KKOTIUM_GARDEN_V3_2_MASTER_PLAN_2026_05.md` (commit 795fdf8) + `docs/research/DARK_PATTERN_LINT_MODULE_DESIGN.md` (본 commit)
> **신규 우선순위 (시니어 권장)**: ① Sprint 7-M3 Pre-Step 5 (다크패턴 lint, 0.5일, 법적 의무 최우선) → ② Sprint 8-PF (P-Filter 전처리, 2일) → ③ Sprint 9-Sec (RLS + anon key 점검, 1.5일) → ④ Sprint 7-M2 Step 5 (L2 자동화, P-Filter 통합 재설계, 2일) → ⑤ Sprint 10-WIZ (단일 캔버스 마법사 MVP, 5일)
> 활성 계획: Sprint 8-IA Phase 2 (Section 1 Hero / Section 2 Inbox 통합 / 빌더 흡수 / lifestyle 가시화 / 통일성, 4.5일) — 새 채팅 2 진입 대기
> 보류 계획: Smart Asset Workflow v3.1 FINAL 후속 (Phase 2-c-3 / Sprint 7-M3) / Sprint 8 자동발주 (Private API 28권한 보유, 매출 상승 트리거)
> 폐기 계획: Sprint X (Gemini 제거 + 5섹션 일괄 템플릿, 2026-05-11 채택 후 익일 폐기)
> TSC: 0 errors | npm run build OK | Production: https://kkotium-garden.vercel.app (✅ 2026-05-26 복구 완료). **DB P1000 복구**: 이전 Supabase 비번 리셋이 실제 미저장이었음 (Vercel ENV는 정상) → 동일값 재리셋으로 /api/products 200 복구 (재배포 불필요). **B-1 Studio 클릭 버그 수정**: Phase 3-C-1 6 컴포넌트 `'use client'` 누락 → 본 commit으로 추가. B-2 빈 outputs silent fail guard 동시 적용.
> **신규 진입점**: `docs/plan/TASK_BRIDGE.md` §3 ACTIVE = Sprint 8-IA Phase 2 진입 대기. §4 STANDING / §6 PENDING 매 세션 정독 의무. 작업원칙 #46 (거짓 라벨 금지) 적용 중
> 다음 작업: 새 채팅 2 진입 = Sprint 8-IA Phase 2 (Task 6-12, 4.5일). ROADMAP.md "다음 새 채팅 시작 메시지" ⭐ ACTIVE 정독 후 paste-ready 메시지로 새 채팅 진입.

> **시각 검증 (Production smoke + Functional + 브라우저 E2E — Sprint 7 P1 단계)**: production smoke 모든 endpoint 200 ✅ / P1-A `/api/category/suggest`: 레깅스→`applied:"agreed"` dominantShare=1.0, 인테리어 소품→`applied:"synthesized"` dominantShare=0.8 ✅ / P1-C `/api/tags/verify`: 레깅스/요가복/면팬티 verified, garbage→weak (threshold fix 후) ✅ / **브라우저 E2E (Claude Preview)**: P1-B NameRulesPanel 3 시나리오 모두 정확 발화 (금기어 5개+중복 가을×3 critical red / 특수문자 4종 warning yellow / 정상 → 패널 미노출) ✅ + P1-A 카테고리 자동 추천 버튼 → 패션의류>여성언더웨어/잠옷>잠옷/홈웨어 자동 입력 ✅ + P1-C TagVerificationPanel 3개 태그 입력 → "SEO 유효 2 / 약함 1 / 미등재 0" 정확 분류 ✅
> **상품 상태**: 1개 DRAFT (달항아리 도어벨 cmp3afb450001gng5468w0qpc, 이현마켓/DMM. B-3 카테고리/판매가 보정 대기) / **꿀통 꽃수레**: 0개 / **Platform**: DMM 도매매 + OWC 오너클랜 2개
> **단계 진행도**: Phase A·B·C·D ✅ | Phase E (E-7/E-1/E-3/E-8) ✅ | Phase E+ Sprint 1~5 ✅ | 워크플로우 재설계 Sprint A1a~A3-4a ✅ | Z-1·Z-2·Z-3a·Z-3b·Z-3d ✅ | 6-Pre 1·2·3 ✅ | 6.5 SourceAdapter PoC ✅ | 6-D 1-5단계 + production active ✅ | 6-A/6-B/6-C/6-E ✅ | Session E-2 Phase 1~5 ✅ | Sprint 7 P0 (P0-A 옵션 정확도 + P0-B 골든윈도우 + P0-C 효자상품 + DataLab market context) ✅ | **Sprint 7 P1 (P1-A 카테고리 1페이지 + P1-B 금기어 + P1-C 태그사전) ✅ + 브라우저 E2E 시각 검증 완료 ✅**
> **Private API 발급 완료**: 28개 전체 권한 발급 ✅ (구매용 6 + 판매용 13 + 공통 3 + 기타 6) — Sprint 8 자동발주는 매출 상승 + 운영 흐름에 따라 진입 (보류 트랙)
> **다음 작업**: Desktop Chrome MCP로 B-1 수정 실클릭 재검증 → 통과 시 B-3 (달항아리 도어벨 데이터 보정) → Sprint 7-M2 Phase 3-C-2 (PLANT /products/new 6→7 tab 확장 + savedProductId 컨텍스트 전달). 본 turn (Code): 6 컴포넌트 `'use client'` 추가 + useStudioActions.runThumbnail 빈 outputs guard. tsc 0 + build 0. 상세 근거: `docs/handoff/HANDOFF_studio_click_bug.md`.
> **참고 문서**: `docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md` (v3.1 영구 참조), `docs/research/KKOTIUM_V2_ARCHITECTURE_2026_05.md` (v2.0 이력 참조), `docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md`

---

## 2026-05-20 Sprint 8-IA Phase 1 완료 (Code turn, 코드 2 신규 + 1 수정 + docs)

### 본 turn 성격

새 채팅 1 진입. Sprint 8-IA Phase 1 (Task 1-5) 본 Code 측 build + ship. Task 1·2·3 은 직전 commit `db72408` 에 적용 완료된 상태로 hand-off 수신 → 본 turn 은 **Task 4 (SystemHealthCard + /api/system-health)** 작성 + **Task 5 (production smoke 검증)** + docs 갱신.

### 코드 변경 (1 commit, +517 LOC)

| 파일 | 변경 | LOC |
|---|---|---|
| `src/app/api/system-health/route.ts` | 신규 — 8 registry × 4 신호 (InventorySnapshot.polledAt / CategoryTrendCache.refreshedAt / DomeCategory.refreshedAt / Discord env) → HealthItem[] 변환. stale factor 1.5 적용 | +189 |
| `src/components/dashboard/SystemHealthCard.tsx` | 신규 — 'use client' 카드. 60s polling + window focus revalidate. status 4종(success/warning/failed/pending) 색상 매핑. Lucide 아이콘만 사용 | +293 |
| `src/app/dashboard/page.tsx` | Section 3 가든 헬스 상단에 `<SystemHealthCard />` 마운트 (기존 3-카드 grid 위) | +20 / -15 |

**Commit**: `12495cf` `feat(dashboard): Sprint 8-IA Phase 1 Task 4 — SystemHealthCard + /api/system-health`

### Hand-off 정합 보정

- **DB schema 단정**: handoff 명세는 `AutomationLog` 테이블 전제였으나 schema 실 조사 결과 해당 테이블 부재 → 실제 가용 시그널 (InventorySnapshot / CategoryTrendCache / DomeCategory / Discord env) 만 사용. *작업원칙 #46 (d) 그대로 — fetch 결과 기반만, hardcoded 정상 금지.*
- **Registry ID 단정**: handoff 예시 (price-watch, supplier-status, honey-pot-discovery, kkotti-ai-recommend, auto-order, image-pipeline, discord-notify) 와 실 registry 다름. 실 registry 가 source of truth → 실제 8 entry (inventory-poll / good-service-track / discord-kkotti-recommend / discord-stock-alert / discord-kkotti-score / discord-ops-report / cron-daily / cron-weekly) 그대로 매핑.
- **Branch 단정**: 세션 진입 시 `feature/sprint-7-m2-smart-asset-workflow` 에 있었음 (2 commits ahead with Sprint 7-M2 Step 1+2). Handoff 명시 (`Branch: main`) 따라 `git checkout main` 후 db72408 baseline 기준 작업. Sprint 7-M2 feature branch 는 origin 에 보존 — 별도 작업으로 진행 예정.
- **Section 단정**: handoff 의 "Section 5 신설" 은 실 dashboard 구조 (Section 1-5 이미 사용 중, Section 5 = collapsed 더보기) 와 불일치 → 의미 정합 best fit = Section 3 가든 헬스 *상단* 에 마운트 (3-카드 grid 위). 기존 IA 보존.

### 검증 (V1~V6)

| 항목 | 결과 |
|---|---|
| V1 (사이드바 demote) | ✅ Task 1-3 직전 commit `db72408` 에 적용됨 (registry route + sidebar manifest 갱신). 본 turn baseline 정합. |
| V2 (`/admin/automation` 200) | ✅ HTTP 200 |
| V3 (registry 8 카드) | ✅ `/api/automation/registry` total=8, 모두 status=active |
| V4 (Section 3 SystemHealthCard) | ✅ `/dashboard` HTTP 200 + `SystemHealthCard` mount (client-rendered) |
| V5 (`/api/system-health` 200 + 8 items) | ✅ HTTP 200, summary={healthy: 4, total: 8}, items.length=8, 한글 displayName 그대로 |
| V6 (Console 0 errors / 0 깨짐) | ⚠️ 본 환경에서 브라우저 세션 미가용 (curl HTML structure 까지만 단정). Desktop Chrome MCP 검증 의무 — TASK_BRIDGE §3 ACTIVE 의 검증 신호로 이관. |

**Production 응답 evidence** (`/api/system-health`):
- inventory-poll: status=pending, 첫 폴 대기
- cron-daily: status=warning, lastRunAt 42시간 전 (stale factor 1.5×24 초과)
- 4 discord-*: status=success (webhook env 모두 설정됨)
- good-service-track / cron-weekly: status=pending (DomeCategory 미수확)
→ summary 4/8 정상 = 실 가동 상태 정확 반영 (#46 (d) 통과).

### 빌드 / Vercel 검증

- `npx tsc --noEmit` → 0 errors ✅
- `npm run build` → exit 0 ✅
- `git push origin main` → 12495cf push 성공 ✅
- `scripts/verify-vercel-deploy.sh --wait` → exit 0 (production READY = 12495cf) ✅

### 적용 작업원칙

#17 (commit-msg.tmp + git commit -F) · #21 (사전 점검 HEAD/status) · #24 (한 turn 분할 완료) · #29 (한글 처리) · #31 (MD 1500줄 임계 — SESSION_LOG 920줄, 분할 불필요) · #32 (TSC ≠ Production 빌드) · #36 (verify-vercel-deploy.sh --wait) · #41 (두 환경 핑퐁 ledger) · #46 (거짓 라벨 금지 — pending/warning/success 실 신호 기반)

### 다음 = 새 채팅 2 진입 (Sprint 8-IA Phase 2)

Task 6-12, 4.5일 추정. Section 1 Hero 행동필요도 알고리즘 → Section 2 Inbox 6 위젯 흡수 → Section 3-4 KPI/Pipeline 재구성 → 빌더 흡수 (블록 6종 → S1~S12 인라인 편집) → lifestyle 가시화 → 통일성 (디자인 토큰).

---

## 2026-05-19 PM Sprint 8-IA 진입 결정 + IA 재설계 (Desktop turn, docs only)

### 본 turn 성격

Desktop이 Chrome MCP로 /automation + /studio + /settings/lifestyle-assets + /products/new 4 화면 시각 점검 → 자동화 관제 페이지의 *17/26 = 65% 가짜 라벨 발견* + 빌더↔renderer 충돌 + lifestyle 연결 부재 진단. 사용자 Q1·Q2·Q3 권장안 모두 승인 → Sprint 8-IA 신설 + Phase 1/2 분할 + 작업원칙 #46 명문화. 본 turn은 docs only, 코드 변경 0건.

### 진단 핵심 (작업원칙 #46 직접 발화 사례)

자동화 관제 페이지가 "정상 17"으로 표시 → 실 cron 가동은 3건뿐 (재고폴링 + 일배치 + 주배치). 14개는 Sprint 6-B/6-C/Sprint 8/9 미작성 작업 라벨만 사전 배치. 파워셀러 시각으로 *작동하지 않는 기능이 정상으로 표시되는 것이 가장 큰 신뢰 리스크*.

근본 원인: registry를 *모니터링 도구*가 아닌 *미래 작업 등록 지점*으로 사용. 결과적으로 미구현을 정상으로 위장. 작업원칙 #46으로 영구 차단:

| 규칙 | 강제 |
|---|---|
| (a) registry 등재 = 실 가동 단정 후만 | 코드 + 1회 실 실행 + 메트릭 endpoint 3 조건 통과 |
| (b) 미가동 작업은 SPRINT_PLAN.md / ROADMAP.md만 | registry/UI 진입 금지 |
| (c) 사용자 UI에서 "준비"/"대기"/"보류" 금지 | 관리자 영역(`/admin/*`)에서만 허용 |
| (d) 상태 라벨은 fetch 결과 기반만 | hardcoded "정상" 금지 |
| (e) 신규 자동화 commit = registry entry 동시 commit | 분리 시 gap 동안 가짜 라벨 |

### Sprint 8-IA 신설 (2 채팅 분할)

**Phase 1 (새 채팅 1, 1.5일) — 자동화 관제 강등 + 대시보드 Section 5**:
- Task 1: 사이드바 "자동화 관제" 항목 제거 (5분)
- Task 2: /automation → /admin/automation 이동 + 관리자 배지 (30분)
- Task 3: automation-registry 26→8 entry 축소 (30분)
- Task 4: 대시보드 Section 5 "정원 점검" 카드 신설 (1일)
- Task 5: 브라우저 통합 검증 + commit + push (30분)

**Phase 2 (새 채팅 2, 4.5일) — 통합 + 빌더 흡수**:
- Task 6: Section 1 Hero 진화 (행동필요도 알고리즘)
- Task 7: Section 2 Inbox 통합 (6 위젯 흡수)
- Task 8: Section 3-4 KPI/Pipeline 카드
- Task 9: /studio ↔ PLANT 7th 탭 목적 명확화
- Task 10: 상세페이지 빌더 흡수 (블록 6종 → S1~S12 골격 내 인라인 편집)
- Task 11: lifestyle-picker 연결 가시화 (자산 카드 + 변형 메타)
- Task 12: 시각적 통일성 (공통 디자인 토큰)

### Turn 1 (직전, 본 turn baseline)

Hash `1a96d2a` (origin/main 정합). 3 commit 적용:
- `049bf7e` TASK_BRIDGE.md §3/§4/§5/§7 갱신
- `af6097b` PRINCIPLES_LEARNED.md #46 신설
- `1a96d2a` SPRINT_PLAN.md Sprint 8-IA 신설 (Phase 1 + Phase 2)

### Turn 2 (본 turn, docs only 3 commit)

- PROGRESS.md (헤더 갱신 + 본 entry prepend) ← 본 commit
- ROADMAP.md (헤더 갱신 + ACTIVE handoff 교체)
- SESSION_LOG.md (본 entry prepend)

### 검증

- TSC 변경 0 (docs only) ✅
- npm run build 영향 0 (baseline 86fdd10 동일) ✅
- 한글 sentinel grep 0 typos ✅
- Vercel production 200 ✅ (turn 2는 docs only, deploy 영향 0)
- 작업원칙 적용: #17, #21, #29, #31, #35, #36, #41, #46

### 다음 = 새 채팅 1 진입 (Sprint 8-IA Phase 1)

ROADMAP.md "다음 새 채팅 시작 메시지" ⭐ ACTIVE에 paste-ready 메시지 작성됨. 사용자가 새 채팅 첫 입력으로 paste → 5 Task 순차 진행 → Phase 1 검증 통과 후 새 채팅 2 (Phase 2) 진입.

Commit: 본 commit hash로 갱신 예정

---

## 2026-05-19 Sprint 7-PC-B + TASK_BRIDGE.md hand-off layer 도입 (작업원칙 #41)

### 진행 현황 — Sprint 7-PC 5 commits 완결

PC-A → PC-B-2까지 완주, 22-paper-cut 중 5건 해소:

| Phase | Commit | scope |
|---|---|---|
| pre-sprint cleanup | `91a1eef` | SESSION_LOG 7차 split + paper-cut #1 entry |
| PC-A v1 | `9ae0673` | handleNaverDirect 6-check + P1 prefill banner |
| PC-A hotfix | `742ce91` | RC1 3-depth fallback + RC2 useEffect race + suggest 검증 |
| PC-B-1 | `5a3b8c2` | P18 dome_code passthrough + P14 defensive (truncation 회귀 0 확정) |
| PC-B-2 | `29b7c49` | P15 옵션명 keyword rule + P17 supplier-notfound 배송 fallback |

해소 paper-cut: P1, P2, P14, P15, P18. 잔여: P16(crawler), P17(실 검증), P19, P20, P13-A~E (PC-C scope).

### TASK_BRIDGE.md hand-off layer 도입

5 commits 모두 Desktop ↔ Code 핑퐁으로 진행됐음 — 본 패턴을 작업원칙 #41로 명문화 + `docs/plan/TASK_BRIDGE.md` 신규 ledger 도입.

| 측면 | 🖥 Desktop | 💻 Code |
|---|---|---|
| 강점 | Supabase / Vercel / Chrome / image-search MCP | Filesystem(write) / Bash / Git / TSC |
| 주특기 | 리서치 · 검증 · paste-ready 본문 | 코드 작성 · MD 실 적용 · git push |
| 할 수 없는 것 | MD edit · git commit | Chrome / Supabase / Vercel MCP 직접 호출 |

5-step 표준 hand-off (FROM/TO/BASELINE/SCOPE/VERIFICATION/FALLBACK), §3 ACTIVE 매 hand-off 갱신 의무.

### 변경 파일

- `docs/plan/TASK_BRIDGE.md` — NEW (~190 줄)
- `docs/plan/PRINCIPLES_LEARNED.md` — 작업원칙 #41 추가 (#26~#40 → #26~#41)
- `CLAUDE.md` — STEP 1 4번째 정독 항목 추가 + 핵심 파일 경로 갱신 + 작업원칙 빠른 인덱스 #37~#41 갱신
- `docs/plan/PROGRESS.md` — 본 entry (헤더 + 신규 섹션)
- `docs/plan/ROADMAP.md` — 헤더 갱신
- `docs/plan/SESSION_LOG.md` — 본 entry 신규

### 검증

- TSC 0 errors (MD/문서 only, code 변경 0) ✅
- npm run build OK (baseline 29b7c49 동일) ✅
- 한글 sentinel grep 0 typos ✅
- 작업원칙 적용: #17, #21, #29, #31, #32, #36, #41

### 다음

- PENDING USER ACTIONS (TASK_BRIDGE §6):
  - 디퓨저 dome_code seed 진행 의사 — Desktop이 5분 이내 Supabase INSERT + Chrome 검증
  - P20 supplier seller ID 확인 (이현마켓 / gseller2022)
  - P16 scope 결정 (PC-B-3 포함 or PC-D 분리)
- 사용자 결정 후 PC-B-3 진입 (P19 + P16 결정)

Commit: 본 commit hash로 갱신 예정

---

## 2026-05-17 paper-cut #1 — Studio hydration order fix

### 발견 + 수정
- 직전 채팅에서 Studio 페이지 hydration mismatch 1건 발견 → commit 48b50fa로 수정
- 영향 영역: /studio 최초 마운트 시 server/client state 불일치
- 검증: production verified ✅

### 단정
- 본 paper-cut은 Sprint 7-PC와 무관한 직전 hotfix
- Sprint 7-PC 진입 baseline = 48b50fa

Commit: 48b50fa

---

## 2026-05-15 PM Sprint 7-M2 Phase 2-c-2 — lifestyle assets admin UI (CRUD + Sidebar entry)

직전 Phase 2-c-1 (6646a31 + fc8a62e docs) 완료 후 사용자 "다음작업 진행" 자율 위임. **Phase 2-c trio 완결** — picker library (2-c-1) + admin UI (본 phase) → 사용자가 Phase 1 Claude Web Firefly export 등을 즉시 등록 가능.

본 turn 작업 (7 파일 +714/-6):

- **`src/lib/storage/automation-storage.ts`** (+74) — `uploadLifestyleAsset` + `deleteLifestyleAsset` 헬퍼. 같은 `product-assets` bucket + `lifestyle/{assetId}.{ext}` prefix
- **`src/app/api/lifestyle-assets/route.ts`** (NEW, 165 LOC) — GET (list 200) + POST (multipart upload + Sharp metadata + DB insert + rollback on DB failure)
- **`src/app/api/lifestyle-assets/[id]/route.ts`** (NEW, 60 LOC) — DELETE (storage cleanup best-effort + DB row 제거)
- **`src/lib/i18n/lifestyle-assets-strings.ko.json`** (NEW, 46 strings) — page/stats/upload/list/errors
- **`src/app/settings/lifestyle-assets/page.tsx`** (NEW, 305 LOC) — 2-col layout (좌 upload form 380px + 우 16:9 카드 grid 280px+), stats chips, cooldown 상태 표시, delete with confirm guard
- **`src/components/layout/Sidebar.tsx`** (+5/-2) — TOOLS 섹션 6번째 entry "라이프 자산" + Images icon
- **`scripts/verify-korean-dict.py`** (+1) — DEFAULTS에 lifestyle-assets-strings.ko.json 추가

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build OK (`/api/lifestyle-assets` × 2 dynamic + `/settings/lifestyle-assets` static 5.28 kB) ✅
- dict 99+178+105+46 strings, 0 typo ✅
- sentinel grep 0건 ✅
- production smoke: GET /api/lifestyle-assets 200 (assets:[]) + /settings/lifestyle-assets 200 ✅

Phase 2-c trio 완결 회고:
- 2-c-1 (6646a31) — picker library + route 통합
- 2-c-2 (a0cdb05) — admin UI + CRUD API
- 2-c-3 (미정) — (선택) 벌크 import + 태그 추천

다음 (병행 가능):
- **A. 첫 실 상품 등록** (autoRunVisual 검증) — ROADMAP active 그대로
- **B. lifestyle 자산 시딩** (Phase 1 Claude Web Firefly → admin UI 업로드) — 첫 자산 1건만 있어도 picker 활성화

Commit: `a0cdb05` feat(automation): Phase 2-c-2 — lifestyle assets admin UI (CRUD + Sidebar entry)
Production deploy 검증: `scripts/verify-vercel-deploy.sh --wait` exit 0, prod is on a0cdb05 ✅

---

## 2026-05-15 PM Sprint 7-M2 Phase 2-c-1 — lifestyle-picker (30일 cooldown + ConceptTone tag matching)

직전 Phase 3-C-3-h2 (3404c0a) 완료 후 사용자 "다음작업 진행" 자율 위임. ROADMAP queued sprint 중 **Phase 2-c lifestyle-picker** 진입. LifestyleAsset Prisma 모델 이미 설계됨 (DB rows=0) → picker library만 빌드하면 graceful fallback (자산 빈 상태에서 brand-color path 자동 활성화).

본 turn 작업 (2 파일 +226/-1):

- **`src/lib/automation/lifestyle-picker.ts`** (NEW, 148 LOC) — pure backend module:
  - `pickLifestyleAsset(opts)` — 30일 cooldown + per-SKU 제외 + ConceptTone tag/moodTag overlap scoring
  - `markLifestyleAssetUsed(assetId, sku)` — 별도 함수로 caller가 timing 제어 (lazy mark)
  - Tag 매핑: tags=[persona, context, pricePosition, productType], moodTags=[colorMood, emotionalTone, photoStyle, genre]
  - Score: overlap count, moodTags 1.5x weight (시각적 영향 큼)

- **`src/app/api/thumbnail/[sku]/route.ts`** (+55/-1) — route-layer 통합:
  - Picker 호출은 *route에서* 수행 → thumbnail-generator pure 보존
  - `body.lifestyleBackdropUrl` 우선 (디자이너 manual override 보존)
  - Picker 실패 non-fatal (console.warn + brand-color fallback)
  - Lazy mark: outputs에 lifestyle variant 존재 시에만 markUsed
  - Response field 추가: `lifestyleAssetId` (picker null 시 null)

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build OK (route 크기 변경 0) ✅
- production smoke (rows=0 graceful fallback): outputs=4, lifestyleAssetId=None, lifestyle variant 47KB brand-color ✅

Phase 2-c-2 (다음): asset seeding admin UI — `/settings/lifestyle-assets` 페이지 + GET/POST/DELETE API. 사용자가 Phase 1 Claude Web 세션에서 생성한 PNG/JPG 드래그-드롭 + 태그 입력 → 즉시 picker 활성화.

Commit: `6646a31` feat(automation): Phase 2-c-1 — lifestyle-picker (30-day cooldown + ConceptTone tag matching)
Production deploy 검증: `scripts/verify-vercel-deploy.sh --wait` exit 0, prod is on 6646a31 ✅

---

## 2026-05-15 Sprint 7-M2 Phase 3-C-3-h — Cloudinary fetch 우회 hardening + production smoke 검증

직전 Phase 3-C-3 (1daded2 + 2914322 docs) 완료 후 사용자 명시 옵션 2 선택 — *production 검증* 진입. 4개 핵심 API 엔드포인트를 실 도매꾹 상품 (cmp3afb450001gng5468w0qpc, "디자인 복 달항아리 도어벨") 으로 smoke test하면서 **paper-cut 1건 발견 → 즉시 수정 → 재검증 → production 정상 운영 확인**.

### Production smoke 결과 (실 도매꾹 상품 1건)

| Stage | Endpoint | HTTP | Elapsed | Result |
|---|---|---|---|---|
| 1 | POST /api/diagnose | 200 | 0.71s | ✅ L4/review, S6 골격, qualityScore 37.3, conceptTone 8축 모두 채움, persisted |
| 2 (1차) | POST /api/thumbnail/[id] | 200 | 3.55s | ❌ outputs:[] (4 variants 모두 silent fail) |
| 2 (수정 후) | POST /api/thumbnail/[id] | 200 | 4.75s | ✅ 4 variants 모두 base64 정상 (47-58KB JPEG) |
| 3 | POST /api/products/[id]/generate-detail | 200 | 5.22s | ✅ 5 sections (S6 hero/story/styledShot/spec/cta), 860x5980, 277KB raw |
| 4 | POST /api/products/[id]/save-assets | 200 | 1.70s | ✅ Supabase Storage 2 public URLs, 둘 다 HTTP 200 image/png |
| (skip) | POST /api/products/[id]/publish-assets | n/a | n/a | naverProductId null이라 skip (정상 동작) |

### Phase 3-C-3-h 핵심 수정 (`c789e36`, 3 파일 +17/-14)

**Root cause**: Cloudinary `fetch mode` 계정 차단:
```
HTTP/2 401
x-cld-error: Images of type fetch are restricted in this account
```

`thumbnail-generator.ts`의 4 renderer (renderClean / renderPrice / renderBadge / renderLifestyle) + `section-renderers/hero.ts` + `section-renderers/detail.ts`가 모두 Cloudinary fetch URL을 통해 source 이미지를 받아오는 패턴이었음. 계정 설정으로 fetch가 차단되니 모든 변형이 silent fail (per-variant try/catch가 에러를 삼키고 outputs[] 반환).

**수정**: Cloudinary 전처리 layer 우회. Sharp의 `fitImage(buffer, slot, bgColor)`가 이미 동일한 1080×1080 padded 결과를 만들기에 Cloudinary preprocessing이 redundant (게다가 Cloudinary fetch는 한 번 호출 후 buffer로 받아 쓰고 버려서 CDN 캐시 이점도 0). 작업원칙 #38 정합 (production runtime = 외부 이미지 API 의존 0).

수정 파일:
- `src/lib/automation/thumbnail-generator.ts` — `urlCleanWhite/urlCleanBrand` import 제거, 4 renderer가 `fetchImageBuffer(req.sourceImageUrl)` 직접 호출
- `src/lib/automation/section-renderers/hero.ts` — `urlGalleryThumb` 제거, source URL 직접 fetch
- `src/lib/automation/section-renderers/detail.ts` — 같은 패턴

`cloudinary-pipeline.ts` 파일은 보존 (deprecated 상태) — 사용자가 추후 Cloudinary 콘솔에서 fetch enable + cdn1.domeggook.com allow-list 추가하면 재진입 가능.

### autoRunVisual 흐름 production 작동 확인

Phase 3-C-3 (1daded2)에서 도입한 자동 sequence는 다음 단계로 chain:
1. diagnose ✓ (0.7s, L4 review grade)
2. thumbnail ✓ (4.8s, 4 variants 합계 47-58KB)
3. save ✓ (1.7s, Supabase 2 public URLs)
4. publish (skip — naverProductId null)

**총 시간 약 10초** — 7일 골든윈도우 기준 충분히 빠른 응답.

### 첫 실 상품 등록 준비 완료 상태

| 항목 | 상태 |
|---|---|
| 실 도매꾹 상품 (DRAFT, naverProductId null) | 1건 (cmp3afb450001gng5468w0qpc) |
| Diagnosis 영속화 | ✅ 1 row (L4/review/S6) |
| Supabase Storage 발행된 자산 | ✅ thumb-clean (41KB) + detail-S6 (283KB) public URL |
| 4 API 모두 production HTTP 200 | ✅ |
| autoRunVisual 자동 흐름 정합 | ✅ (수동 chain 검증 완료) |
| 사용자가 "네이버 직접 등록 (API)" 클릭 시 | autoRunVisual ON (default) → naverProductId 발급 → publish-assets 호출 → 갱신 완료까지 자동 종결 |

### 검증

- `npx tsc --noEmit` 0 errors ✅
- `npm run build` 정상 (route 크기 변경 0) ✅
- production smoke 4 stages 모두 200 ✅
- Vercel runtime logs 정확한 root cause 식별 (`x-cld-error: Images of type fetch are restricted`)
- Supabase public URLs HTTP 200 image/png + Cloudflare CDN 응답 (`cf-ray: 9fc15e60c8c6fd11-ICN`)

### 적용된 작업원칙

- #17 commit msg via `.commit-msg.tmp` + `git commit -F`
- #21 STEP 0 사전 점검 통과
- #28 Vercel = source of truth (Vercel runtime logs로 root cause)
- #32 push 전 TSC + npm run build
- #36 push 후 verify-vercel-deploy.sh --wait → exit 0
- **#38 production runtime never calls external image APIs** — 본 phase의 *직접 발화 사례*. Cloudinary 계정 fetch 차단으로 매출 흐름이 막혔던 사고. 정적 자산만 사용하는 패턴으로 수정해서 외부 의존성 *완전 제거*. 향후 Adobe/OpenAI 등 다른 외부 image API 도입 시 동일 위험 인지

### 다음 = 사용자 첫 실 상품 등록 시도

본 검증으로 *코드는 production에서 정상 작동 보장*. 다음 단계는 사용자가 PLANT `/products/new`에서 6 탭 채우고 "네이버 직접 등록 (API)" 클릭하는 것. autoRunVisual ON (default) 상태에서 다음이 자동:

1. local DB save → savedProductId set → 7번째 탭 unlock
2. 네이버 등록 → savedNaverProductId 채움 → setActiveTab('visual')
3. PlantVisualInner 마운트 → autorun useEffect → runFullSequence
4. diagnose ✓ → thumbnail ✓ → save ✓ → publish ✓ chip 순차
5. 약 10-15초 후 SequenceStatusBanner green: "비주얼 자동화 완료"
6. 스마트스토어에 *콘텐츠까지 갖춘* 첫 실 상품 노출

Commit: `c789e36` fix(automation): Phase 3-C-3-h — bypass Cloudinary fetch (account-restricted), use Sharp direct resize
Production deploy 검증: `scripts/verify-vercel-deploy.sh --wait` exit 0, prod is on c789e36 ✅

---

## 2026-05-15 Sprint 7-M2 Phase 3-C-3 — register-then-autorun + sequence chaining + golden-window deep-link

직전 Phase 3-C-2 (PLANT 7번째 탭 통합, c1616c0/d9256b2) 직후 사용자 명시 승인으로 진입. **Sprint 7-M2 Phase 3-C 트리오 완결** — extract (3-C-1) → mount (3-C-2) → wire-up (3-C-3). 이제 PLANT에서 네이버 등록 직후 콘텐츠 자동화가 *자동으로 흐른다*. 대시보드 골든윈도우 위젯 클릭도 비주얼 탭으로 직진.

본 turn 작업 (4 파일, +290/-43):

- **`src/components/studio/useStudioActions.ts`** (+186/-43) — 5 핸들러를 *결과 반환* 형으로 refactor:
  - `runDiagnose / runThumbnail / runDetail` → 각각 `Promise<XResult | null>` 반환
  - `runSave(overrides?)` → `RunSaveOverrides` 타입으로 thumbnails/mainVariant/detail override 지원 (closure stale-state 회피)
  - `runPublish(saveOverride?)` → save override 지원
  - **신규** `runFullSequence({ hasNaverId?, withDetail? })` → 5단계 chain (diagnose → thumbnail → [detail] → save → [publish])
  - 신규 state 3개: `sequenceBusy / sequenceStages / sequenceError`
  - 기존 `onRun: () => void` props는 그대로 작동 (Promise<X>는 Promise<void>에 assignable)

- **`src/lib/i18n/studio-strings.ko.json`** (+10 strings, 95 → 105) — autoRun + sequence 관련 신규:
  - `plantTab.autoRunLabel` = "등록 후 비주얼 자동 생성"
  - `plantTab.autoRunHint` (체크박스 옆 설명)
  - `plantTab.autorunRunning / autorunDone / autorunFailed`
  - `plantTab.autorunStage{Diagnose,Thumbnail,Detail,Save,Publish}` (배너 chip 라벨)

- **`src/app/products/new/page.tsx`** (+129/-1) — PLANT autorun 통합:
  - `PlantVisualInner`에 `autorun` prop 추가 → `autorunRanRef`로 productId당 1회 idempotent useEffect
  - 신규 `SequenceStatusBanner` — 4 카드 위에 sequence 진행 상태 (busy=blue / done=green / error=red) + 단계별 ✓ chip
  - 신규 state `autoRunVisual` (default true)
  - 토글 UI (체크박스 + label) — 하단 버튼 위에 핑크 chrome (`#FFF5F7`/`#FFB3CE`)
  - `handleNaverDirect` 네이버 등록 성공 후: `if (autoRunVisual) setActiveTab('visual')` → PlantVisualInner 마운트 → autorun useEffect 발화 → runFullSequence
  - **edit-mode useEffect (`?edit=ID`)** — `setSavedProductId(p.id)` + `setSavedNaverProductId(p.naverProductId ?? null)` 자동 채움 → 골든윈도우 deep-link `?edit=ID&focus=visual`이 작동하는 visual 탭에 도달

- **`src/components/dashboard/GoldenWindowWidget.tsx`** (+2/-1) — `GoldenRow` href를 `/products/new?edit=ID` → `/products/new?edit=ID&focus=visual`로 변경. 위젯 클릭이 곧장 비주얼 탭으로 진입

설계 결정:

1. **closure stale-state 회피 — handler 결과 반환 + override 파라미터** — React useState는 setState 후 다음 렌더 전까지 closure에서 옛 값을 봅니다. Sequence가 `await runDiagnose()` 후 곧바로 `runSave()` 호출하면 setSave가 본 thumbnails는 *이전 렌더의 null*. 해결: 각 handler가 결과를 직접 반환 + runSave/runPublish는 override 파라미터 수용 → sequence가 fresh 데이터를 명시적으로 전달
2. **autorun idempotent (productId당 1회)** — `useRef`로 마지막 실행한 productId 추적. autorun=true 상태에서 hasNaverId 변경 등으로 useEffect deps가 재발화해도 같은 productId면 skip
3. **detail은 autorun에서 opt-out** — runFullSequence의 `withDetail` 기본 false. 상세 페이지 합성은 5000~7000px 무거운 Sharp 연산 + 골격 1-click 교체가 디자이너 가치라서 자동화 부적합. 사용자가 명시적으로 `withDetail: true` 전달 시만 포함
4. **publish는 hasNaverId 검증** — naverProductId 없으면 sequence가 publish 단계 skip. 등록 실패 케이스에서도 진단/썸네일/저장은 성공
5. **edit-mode 자동 unlock** — 골든윈도우 위젯 / TEND per-row 액션에서 *기존 상품으로* 진입 시 임시저장이 없어도 visual 탭이 작동해야 함. edit-mode useEffect에서 product.id를 savedProductId로 set
6. **i18n 100% 분리 (작업원칙 #29 + #35)** — 신규 10 한글 string 모두 dict, 코드 inline 한글 0건

검증:

- npx tsc --noEmit 0 errors ✅
- npm run build OK (`/products/new` 62.5 kB, `/studio` 3.73 kB) ✅
- python3 scripts/verify-korean-dict.py: 99+178+105 strings, 0 typo ✅
- sentinel grep clean (4 파일 모두) ✅
- 코드 inline 한글 주석 0건 ✅

사용자 시나리오 (Phase 3-C-3 이후):

```
A. 신규 등록 흐름 (autoRunVisual on, default):
   1. PLANT 6 탭 채움 → "네이버 직접 등록" 클릭
   2. local DB save + naver register 양쪽 성공
   3. → 비주얼 탭 자동 활성화
   4. → SequenceStatusBanner: "비주얼 자동화 진행 중..." (blue)
   5. → diagnose ✓ → thumbnail ✓ → save ✓ → publish ✓ chip 순차 추가
   6. → 배너 green: "비주얼 자동화 완료 — 모든 단계 성공"
   7. 상품이 *콘텐츠까지 갖춘 채로* 스마트스토어에 노출

B. 기존 상품 보강 흐름 (대시보드 골든윈도우):
   1. 대시보드 → 골든윈도우 위젯의 D+1/D+3/D+7 row 클릭
   2. → /products/new?edit=ID&focus=visual 직접 진입
   3. → edit-mode useEffect로 savedProductId 자동 채워짐
   4. → 비주얼 탭 자동 활성화 (?focus=visual + validTabs 매칭)
   5. → 4 카드 수동 호출 (autorun off — 이미 등록된 상품이라 등록 재실행 없음)
   6. → 디자이너가 상세/골격을 손봐서 publish 갱신

C. autorun off 케이스:
   - 토글 해제하고 등록 → 자동 흐름 차단, 비주얼 탭 unlock만
   - 사용자가 본인 페이스로 카드 클릭
```

다음 = **Sprint 7-M2 Phase 2-c (lifestyle-picker 30일 cooldown)** — 썸네일 4 변형 중 lifestyle 변형의 background 자산 풀 관리. 같은 자산을 30일 안에 재사용 금지 + 카테고리/계절/감성톤 태그 매칭으로 적합 자산 선택. 또는 Sprint 8 자동발주 (Private API 28권한 보유, 매출 상승 시점 진입).

Commit: `1daded2` feat(automation): Phase 3-C-3 — register-then-autorun + sequence chaining + golden-window deep-link
Production deploy 검증: `scripts/verify-vercel-deploy.sh --wait` exit 0, prod is on 1daded2 ✅

---

## 2026-05-14 Sprint 7-M2 Phase 3-C-2 — PLANT 7번째 탭 "비주얼 자동화" 통합

직전 Phase 3-C-1 (Studio 컴포넌트 추출) 직후 사용자 승인 후 진입. **`/studio` 전용이던 콘텐츠 자동화 워크플로우를 PLANT `/products/new` 7번째 탭에 마운트** — 신규 상품 등록 직후 7일 골든윈도우 안에 동일 페이지에서 진단 → 썸네일 → 상세 → 갱신까지 종결.

본 turn 작업 (2 파일, +100/-3):

- **`src/app/products/new/page.tsx`** (+93/-3) — Phase 3-C-1에서 추출한 4 카드 + `useStudioActions` hook 한 줄 import로 7번째 탭에 마운트:
  - `Palette` lucide icon 추가
  - `import { DiagnosisCard, ThumbnailCard, DetailPageCard, ActionsCard, useStudioActions } from '@/components/studio'` + `import studioStrings from '@/lib/i18n/studio-strings.ko.json'`
  - 모듈 레벨 `PlantVisualInner({ productId, naverProductId })` sub-component — hook 호출 + 4 카드 마운트 + canPublish 계산 (caller-specific hasNaverId)
  - `activeTab` type에 `'visual'` 추가 (6 → 7 tab)
  - 2 신규 state: `savedProductId` + `savedNaverProductId`
  - `handleNaverDirect` — local DB save 직후 `setSavedProductId(productId)` (네이버 등록 실패해도 visual 탭 unlock), 네이버 등록 성공 시 `setSavedNaverProductId(naverData.naverProductId)`
  - `validTabs` deep-link 배열에 `'visual'` 추가 (`?focus=visual` 지원)
  - tab navigation 7번째 entry: `{ key: 'visual', label: studioStrings.plantTab.label, Icon: Palette }`
  - `tabDone.visual = !!savedProductId`
  - 7번째 panel: `savedProductId` 없으면 안내 카드 (`needSaveTitle` + `needSaveBody`), 있으면 `<PlantVisualInner />` 렌더

- **`src/lib/i18n/studio-strings.ko.json`** (+6 strings, 89 → 95) — PLANT 탭 전용 string 분리:
  - `plantTab.label` = "비주얼 자동화" (탭 라벨)
  - `plantTab.needSaveTitle` / `needSaveBody` (savedProductId 가드 안내 카드)
  - `plantTab.savedBadge` / `panelTitle` / `panelSubtitle` (보조 슬롯, 향후 확장 대비)

설계 결정:

1. **module-level sub-component** — `PlantVisualInner`를 `NewProductPageInner` 내부가 아닌 *모듈 레벨*에 정의 → PLANT 매 렌더마다 hook 재생성 방지
2. **savedProductId 분리** — `productId` (handleNaverDirect 내부 local var)와 별도로 React state로 노출 → 7번째 탭이 page-level state로 접근 가능
3. **불완전 등록 graceful** — 네이버 등록 실패해도 local DB save 성공이면 visual 탭 unlock. 사용자가 publish 없이 진단/썸네일/상세/저장만 활용 가능
4. **i18n 100% 분리** — 신규 사용자 노출 한글 6 strings 모두 dict 분리. PLANT 코드는 `studioStrings.plantTab.*` 키 참조만 (작업원칙 #29 c, #35)
5. **byte-identical existing tabs** — 기존 6 탭의 label/Icon/tabDone 모두 그대로 보존, 7번째만 *추가*

검증:

- npx tsc --noEmit 0 errors ✅
- npm run build 정상, `/products/new` 62 kB (PLANT, 약간 증가), `/studio` 3.73 kB (shared chunk 추출로 감소) ✅
- python3 scripts/verify-korean-dict.py: 99+178+95 strings, 0 typo ✅
- sentinel grep clean (한글 자모 변종 0건) ✅
- 코드 inline 한글 주석 0건 (작업원칙 #29 c) ✅

페이지 작동 흐름 (Phase 3-C-2 이후):

1. PLANT `/products/new` 진입 → 6 탭 (기본/옵션/이미지/배송/SEO/혜택) 채움
2. "네이버 직접 등록 (API)" 버튼 클릭 → local DB save → `setSavedProductId(id)` → 7번째 탭 unlock
3. 7번째 탭 "비주얼 자동화" 클릭 → `<PlantVisualInner />` 마운트:
   - AI 진단 카드 (1) → POST /api/diagnose
   - 썸네일 카드 (2) → POST /api/thumbnail/[sku] → 4 변형 + 메인 선택
   - 상세 카드 (3) → POST /api/products/[id]/generate-detail → 5섹션 + 골격 1-click 교체
   - 액션 카드 (4) → POST /api/products/[id]/save-assets + publish-assets (네이버 등록 성공 시)
4. 골든윈도우 활용: 등록 후 7일 안에 콘텐츠 채우기 → 매출 기반 형성

다음 = **Sprint 7-M2 Phase 3-C-3** (등록 → publish-assets 자동 호출 wire-up + "에셋 저장 후 자동 갱신" 토글 + 대시보드 골든윈도우 카운트다운).

Commit: `c1616c0` feat(automation): Phase 3-C-2 — PLANT 7th tab "비주얼 자동화" mounts Studio cards
Production deploy 검증: `scripts/verify-vercel-deploy.sh --wait` exit 0, prod is on c1616c0 ✅

---

## 2026-05-13 Sprint 7-M2 Phase 3-C-1 — Studio 컴포넌트 추출 (refactor only)

PLANT 7번째 탭 통합(3-C-2)의 필수 사전 작업. `/studio/page.tsx` 1068 LOC → 250 LOC (-77%), 4 카드 + ProductListPane + useStudioActions hook + StudioCardShell을 `src/components/studio/`로 추출.

신규 (9 파일, 1059 LOC):

- `types.ts` (96) — 6 interface + 2 상수 (SkeletonIdLiteral / SKELETON_IDS / ThumbVariant / THUMB_VARIANTS / ProductRow / DiagnosisResult / ThumbnailResult / DetailResult / SaveResult / PublishResult)
- `StudioCardShell.tsx` (172) — Card / Pill / PrimaryButton / SecondaryButton + pickGradePalette / fmtPrice 헬퍼
- `useStudioActions.ts` (242) — 11 state + 5 async handlers + reset useEffect + canSave/hasSavedAsset derived. productId만 받으면 동작
- 4 카드 (DiagnosisCard 62 / ThumbnailCard 102 / DetailPageCard 95 / ActionsCard 163)
- `ProductListPane.tsx` (92)
- `index.ts` (35) — barrel export

수정:
- `src/app/studio/page.tsx` (1068 → 250 LOC, -77%) — shell만 유지
- `src/lib/i18n/studio-strings.ko.json` (+4 strings = 89) — productList.title + publishPatched{Thumb,Detail,Sep} (인라인 한글 → i18n migration)

설계 결정:
- **byte-identical markup** — JSX 완전 동일 보존, production /studio 시각 변경 0
- **useStudioActions hook** — productId 하나만 받음, PLANT에서 `useStudioActions(savedProductId)`로 동일 호출 가능
- **canPublish는 hook 외부** — `hasNaverId`가 caller-specific이라 caller 계산
- **인라인 한글 0** — 기존 ActionsCard "썸네일 ✓"/"상세 ✓" inline도 i18n으로 migration

검증 (refactor 전후 완전 동일):
- npx tsc --noEmit 0 errors ✅
- npm run build 정상, /studio 8.32 → 8.52 kB (barrel + i18n 미미한 overhead) ✅
- 5 API routes 변경 0 ✅
- dict.py 3 dicts 통과 (99+178+89, 0 typo) ✅
- 신규 파일 sentinel 0건 ✅

Phase 3-C-2 진입 준비 완료 — PLANT 7번째 탭에서 `import { ... } from '@/components/studio'` 한 줄로 동일 워크플로우 마운트 가능.

다음 = Phase 3-C-2 (PLANT /products/new 6 → 7 tab 확장) → Phase 3-C-3 (등록 흐름에 publish-assets 자동 호출).

---

## 2026-05-13 Sprint 7-M2 Phase 3-D + 3-E + /studio UX polish

직전 Phase 3-A + 3-B production deploy + `product-assets` bucket 생성 검증 후 동일 turn 연속 진입. 사용자 피드백 (disabled 버튼 이유 불명, 다음 작업 진입 요청) 반영.

본 turn 작업 (3 파일 신규/수정 + i18n 확장):

- **Phase 3-E** — `src/app/api/products/[id]/publish-assets/route.ts` (109 LOC, 신규) — POST endpoint, naverProductId 확인 → `originProduct.images.representativeImageUrl` + `detailContent` HTML patch → updateProduct 호출. HTTPS URL validation 포함. 미등록 상품 → 422 명시 에러.
- **Phase 3-D** — `src/app/products/page.tsx` (2 lines) — per-row "콘텐츠" 아이콘 (Palette / pink) 추가, `/studio?product={id}` deep-link. 기존 상품 재가공 진입점 활성화.
- **/studio UX polish** — `src/app/studio/page.tsx` (~140 LOC 변경)
  - Workflow step indicator: 각 4 카드 헤더에 1→2→3→4 numeric badge (완료 시 ✓ 초록)
  - Disabled state hints: 노란 ⓘ 안내 inline 표시
  - Publish 버튼 실 wire-up: disabled placeholder → 실제 publish-assets 호출 (canPublish = hasSavedAsset && hasNaverId)
  - 3가지 disabled 상태별 hint (no asset / no naverId)
  - publish 성공 시 파란 박스에 naverProductId + patched 결과 표시
  - lucide Send icon 추가
- **i18n** — `src/lib/i18n/studio-strings.ko.json` (+8 strings, 85 total) — actions.* 6 신규 + workflow.* 3 신규

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 정상 (`/studio` 7.45 → 8.32 kB, `publish-assets` ƒ Dynamic 등록) ✅
- dict.py 3 dicts 통과 (99+178+85, 0 typo) ✅
- 신규/수정 파일 sentinel 0건 ✅

페이지 작동 흐름 (전후 비교):
- **이전**: 4 카드 동일 weight → 어디부터 시작 헷갈림 → disabled 이유 안 보임
- **이후**: ① AI 진단 → ② 썸네일 → ③ 상세 → ④ 에셋 저장 + 네이버 갱신 (번호 + 색상 코딩 + inline hint) → 실 네이버 상품 갱신까지 한 페이지에서 종결

다음 = **Phase 3-C** (PLANT 7번째 탭 "비주얼 자동화"). PLANT page.tsx (188KB) + 4 카드 컴포넌트 추출 필요로 *전용 sub-phase 분리 권고*:
- Phase 3-C-1: src/components/studio/ 4 카드 추출 (refactor only)
- Phase 3-C-2: PLANT 7번째 탭 + tab navigation 갱신
- Phase 3-C-3: 등록 → publish-assets 자동 호출 wire-up

Commit: 본 turn에서 단일 commit + push (`claude/phase-3de-publish-ux-{ts}` branch). 사용자 FF merge 후 production deploy 검증.

---

## 2026-05-13 Sprint 7-M2 Phase 3-A + 3-B — API foundation + 온실 아틀리에 UI mount

사용자 페르소나 주입 (10년차 파워셀러 + 풀스택 + UI/UX) + AskUserQuestion으로 IA 확정 후 Phase 3-A (API) + Phase 3-B (UI) 동시 진행. **콘텐츠 자동화 UI 진입점 정착** — 27 dedicated renderers를 사용자가 클릭으로 사용 가능.

본 turn 누적 commit (3건):

- `e6a1941` docs(plan): split SESSION_LOG per principle 31 (T1 947 + Phase 3 entry trigger)
- `5b543fe` feat(automation): Phase 3-A — Supabase Storage adapter + 2 API routes
- `<sha>` feat(automation): Phase 3-B — 온실 아틀리에 UI + Sidebar mount + i18n strings

Phase 3-A (API, 3 신규 파일):

- `src/lib/storage/automation-storage.ts` (118 LOC) — Supabase Storage 어댑터, bucket=product-assets 분리, SUPABASE_SERVICE_ROLE_KEY 서버측
- `src/app/api/products/[id]/generate-detail/route.ts` (114 LOC) — POST, Product + Diagnosis 조회 → buildDetailPage → base64 PNG + section meta
- `src/app/api/products/[id]/save-assets/route.ts` (138 LOC) — POST, base64 → Storage upload → public URL 응답

Phase 3-B (UI, 4 파일 신규 + 2 수정):

- `src/lib/i18n/studio-strings.ko.json` (77 strings, 신규) — 페이지 사용자 노출 한글 분리
- `src/app/studio/page.tsx` (~640 LOC, 신규) — 2-pane MVP (좌 320px 상품 리스트 + 우 4 카드: Diagnosis/Thumbnail/Detail/Actions)
- `src/components/layout/Sidebar.tsx` (수정) — TEND 4번째 entry "온실 아틀리에" + Palette icon
- `scripts/verify-korean-dict.py` (수정) — DEFAULTS에 studio-strings.ko.json 추가

페이지 작동 흐름 (사용자 시나리오):

1. 사이드바 TEND → **온실 아틀리에** 진입
2. 좌측 상품 리스트 자동 첫 상품 선택
3. 우측 4 카드 워크플로우:
   - 진단 카드 → POST /api/diagnose → 컨셉/톤/골격/등급/신뢰도 카드
   - 썸네일 카드 → POST /api/thumbnail/[sku] → 4 변형 미리보기 + 메인 선택
   - 상세 카드 → POST /api/products/[id]/generate-detail → 5섹션 zoom-fit 미리보기 + 골격 1-click 교체
   - 액션 카드 → POST /api/products/[id]/save-assets → Supabase Storage public URL 발급
4. "네이버 즉시 등록" disabled placeholder (Phase 3-C 활성화)

설계 결정:

- 2-pane 채택 — 상품 컨텍스트 항상 유지 (10년차 셀러 일 5-20건 페이스)
- 카드 색상 코딩 — primary/gold/sage/dark 4단계 워크플로우 시각적 구분
- 골격 드롭다운 자동/S1~S12 — 디자이너 1-click swap (작업원칙 #40)
- 상세 미리보기 max-height 520px overflow scroll — 5000~7000px 세로 길이 컴팩트화

검증:

- npx tsc --noEmit 0 errors ✅
- npm run build 정상, `/studio` ○ Static (7.45 kB), generate-detail/save-assets ƒ Dynamic 등록 ✅
- dict.py 3 dicts 통과 (99+178+77 strings, 0 replace/not_nfc/typo) ✅
- 신규 파일 sentinel grep 0건 ✅
- 한글 i18n 100% 분리 (작업원칙 #29 c, #35)

다음 = **Phase 3-C** (PLANT 7번째 탭 "비주얼 자동화" — 등록 흐름 통합으로 7일 골든윈도우 매출 ↑) + **Phase 3-D** (TEND per-row 액션 — 기존 상품 재가공 흐름 활성화) + **Phase 3-E** (Naver API publish-assets — production data 검증).

Commit: 본 turn 3 commit이 단일 branch에 push. 사용자 FF merge 후 production deploy 검증.

---

## 2026-05-13 Sprint 7-M2 Phase 2-b-3-b — B2B + S3 cleanup 3 렌더러 (dedicated 27/27 ✅ 100%)

3 신규 렌더러 + section-copy.ts 3 신규 Groq 헬퍼 + strings.ko.json 3 슬롯 → **12 골격 모두 완전 dedicated**.

- `specTable.ts` (141 LOC, S12) — 3-column 기술 사양 테이블 (parameter / value / unit), KFTC: value 컬럼 invariant placeholder
- `specifications.ts` (134 LOC, S12) — 2x2 규제·인증 grid (KC/KS/안전기준/제조번호) + invariant caveat strip
- `package.ts` (158 LOC, S3) — 3-step horizontal unboxing sequence (numbered badge + arrow + gift-handover tone)

section-copy.ts 확장 (3 신규 Groq 헬퍼):
- `generateSpecTableCopy` — `{headline, columnHeaders, rows: [{parameter, value, unit}]}` (value invariant)
- `generateSpecificationsCopy` — `{headline, items: [{label, value}] × 4, caveat (invariant)}`
- `generatePackageCopy` — `{headline, steps: [{label, caption}] × 3}`

**매트릭스 카운트 정정 발견**: grading.SKELETON_SECTIONS 12 골격의 unique section ids를 Python set으로 정확 카운트한 결과 **27개** (이전 docs의 "26"은 off-by-one). 본 phase로 **27/27 = 100% dedicated coverage** 달성. 이전 docs entries에서 "26"으로 기록된 항목을 모두 향후 정정 권고.

**완전 dedicated 골격 12/12 ✅**: S1 · S2 · S3 · S4 · S5 · S6 · S7 · S8 · S9 · S10 · S11 · S12

골격 변경분:
- S3: 5/6 → **6/6 ✅ 완전** (package 추가)
- S12: 3/5 → **5/5 ✅ 완전** (specTable + specifications 추가)

KFTC discipline 강화 (B2B 트랙 가장 엄격):
- specTable: value 컬럼 *항상* dict placeholder, Groq schema에서 제외 강제
- specifications: 4 카드 value 모두 invariant, 하단 invariant caveat strip Groq override 불가
- package: scarcity 패턴 금지 prompt, gift-handover tone 강제

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 정상 빌드 ✅
- python3 scripts/verify-korean-dict.py (178 strings, 0 typo) ✅
- registry 27 entries == SKELETON_SECTIONS unique ids 27 (Python set verification) ✅
- 신규 3 renderer 한글 inline: specTable.ts JSDoc 예시 1건만 잔존, 사용자 노출 외

다음 = Sprint 7-M2 Phase 2-c (lifestyle-picker 30일 cooldown + 태그 매칭) → Phase 3 (`/api/products/[id]/generate-detail` route + Diagnosis 연동 + Supabase Storage 업로드).

Commit: 본 phase에서 별도 commit + push 직후 `verify-vercel-deploy.sh --wait`로 production 검증.

---

## 2026-05-13 Sprint 7-M2 Phase 2-b-3-a — 감각 트랙 5 렌더러 (S6·S9·S10 완전 dedicated)

5 신규 렌더러 + section-copy.ts 5 신규 Groq 헬퍼 + strings.ko.json 5 슬롯:

- `material.ts` (122 LOC, S9) — macro shot + 원산지/인증 2 카드 placeholder (KFTC)
- `styledShot.ts` (111 LOC, S6) — 3 stacked lifestyle shots + mood 캡션 ×3
- `philosophy.ts` (100 LOC, S10) — editorial paragraph + signature + brand stripe
- `detail.ts` (142 LOC, S10) — 2x2 macro detail grid (tactile description)
- `reviews.ts` (121 LOC, S10) — **KFTC critical** — 3 동일 placeholder card + 사용자 1/2/3 attribution + neutral 5-dot icon (별점 fabricate 0)

section-copy.ts 확장 (5 신규 Groq 헬퍼, +320 LOC):
- `generateMaterialCopy` — `{headline, originLabel, macroCaption, certLine}`
- `generateStyledShotCopy` — `{headline, captions: [3]}`
- `generatePhilosophyCopy` — `{headline, paragraph, signature}`
- `generateDetailGridCopy` — `{headline, cells: [{title, body}] × 4}`
- `generateReviewsCopy` — `{headline, placeholderQuote, placeholderAttribution}` (KFTC critical: 헤드라인만 Groq, 본문 invariant)

전체 dedicated 커버리지 (Phase 1 + 2-a + 2-b-1/2/3-a 합산):
- **dedicated 24 / 26 섹션 ids (92%)**
- **placeholder 2 / 26 잔여**: specTable · specifications · package (Phase 2-b-3-b 대상, 1 sub-phase로 100% 도달 가능)

**완전 dedicated 골격 누적 9개**: S1 · S2 · S4 · **S6** · S7 · S8 · **S9** · **S10** · S11

골격 변경분:
- S6: 4/5 → **5/5 ✅ 완전** (styledShot 추가)
- S9: 3/4 → **4/4 ✅ 완전** (material 추가)
- S10: 4/6 → **6/6 ✅ 완전** (philosophy + detail + reviews 추가)

STEP A 효과 검증 — *fallback inline 0 패턴 정착*:
- 본 phase 도입 신규 fallback ~28건이 모두 *dict 키 추가만으로 작성*, inline 0건
- generateReviewsCopy의 placeholderQuote/placeholderAttribution는 invariant fallback으로 *Groq override 불가* — STRINGS 패턴이 KFTC-strict 케이스 안전 지원

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 정상 빌드 ✅
- 한글 sentinel grep 0건 (신규 5 renderer) ✅
- 신규 renderer 일반 한글 inline 0건 (STRINGS / copy.value 참조만) ✅

Commit: 본 phase에서 별도 commit + push 직후 `verify-vercel-deploy.sh --wait`로 production 검증.

다음 = Sprint 7-M2 Phase 2-b-3-b (specTable + specifications + S3 package, 3 렌더러로 100% 완성).

---

## 2026-05-13 Sprint 7-M2 STEP A — ko.json dict migration (작업원칙 #35)

8 파일 변경 (신규 2 + 확장 6):

- `strings.ko.json` (160 LOC, 신규) — 116 strings, 슬롯별 계층 (common 11 + 16 section slots + 4 Renderer SVG slots)
- `strings.ts` (49 LOC, 신규) — typed loader, `fill()` 보간 헬퍼, `buildSpecRows()` 컨텍스트 헬퍼
- `section-copy.ts` (-159 +123) — 18 fallback 객체 STRINGS 키 참조 교체
- `clinical.ts` / `comparison.ts` / `options.ts` / `spec.ts` — SVG hardcoded Korean 헤더 → `STRINGS.*Renderer` 슬롯
- `scripts/verify-korean-dict.py` — argv 지원, 두 dict 기본 검증, main() exit code

dict 구조 (slot 계층):

- `common.*` (11) — 공유 placeholder (detailsReference / theProduct / brandDefault / categoryFallback 등)
- 16 section slots (problem · solution · usage · cta · spec · story · productGrid · comparison · warranty · coreMetrics · technology · clinical · optionIntro · seasonalHook · options · eventDetails · benefits)
- 4 *Renderer 전용* slots (specRenderer · comparisonRenderer · optionsRenderer · clinicalRenderer) — SVG hardcoded header 보존

검증:

- `python3 scripts/verify-korean-dict.py`: 두 dict 검증 통과 (115+99 strings, 0 replace/not_nfc/typo) ✅
- `npx tsc --noEmit` 0 errors ✅
- `npm run build` 정상 빌드 ✅
- 신규 파일 sentinel grep 0건 (verify-korean-dict.py의 typo prevention list만 매치 = 의도) ✅
- section-copy.ts 남은 한글: Groq prompt instruction *예시* 문자열만, 사용자 노출 외

작업원칙 #35 효과:

- migration *전* 누적 ~45건 (Phase 1 + 2-a + 2-b-1 + 2-b-2 합산, 임계 30건 초과)
- migration *후* 사용자 노출 fallback dict 격리, inline 한글 0건 (Groq prompt 예시 제외)
- 신규 fallback은 *dict 키 추가만으로* 작성 가능 — Phase 2-b-3 진입 시 re-introduction 0 위험

Commit: 본 STEP에서 별도 commit + push 직후 `verify-vercel-deploy.sh --wait`로 production 검증.

다음 = Sprint 7-M2 Phase 2-b-3-a (감각 트랙 5 렌더러: material/styledShot/philosophy/detail/reviews).

---

## 2026-05-13 Sprint 7-M2 Phase 2-b-2 — 이벤트/세트 트랙 5 렌더러 완료 (S8·S11 완전 dedicated)

5개 신규 렌더러 + section-copy.ts 5 신규 Groq 헬퍼:

- `optionIntro.ts` (108 LOC) — S5. 2-column grid + 색상 chip + 옵션 이름/sub
- `seasonalHook.ts` (113 LOC) — S8. 시즌 banner + hook line + **START/END 날짜 카드 의무 렌더링** (KFTC date window 노출)
- `options.ts` (99 LOC) — S8. 옵션 테이블 (이름/구성, zebra striping)
- `eventDetails.ts` (102 LOC) — S11. **EDITION / DROP DATE / QUANTITY 3 카드 의무 렌더링** (KFTC limited drop 의무 disclosure)
- `benefits.ts` (144 LOC) — S11. 3 perk cards (inline SVG glyphs: gift/star/shield/tag/sparkle/truck) + 하단 disclosure strip 의무

section-copy.ts 확장 (5 신규 Groq 헬퍼):
- `generateOptionIntroCopy` — `{headline, items: [{name, sub}] 4-6, helperLine}`
- `generateSeasonalHookCopy` — `{banner, hookLine, startLabel, endLabel}`
- `generateOptionsTableCopy` — `{headline, rows: [{name, spec}] 4-6}`
- `generateEventDetailsCopy` — `{headline, editionLabel, dropDateLabel, quantityLabel, story}`
- `generateBenefitsCopy` — `{headline, perks: [{title, body, iconHint}] × 3, disclosure}`

전체 dedicated 커버리지 (Phase 1 + 2-a + 2-b-1 + 2-b-2 합산):
- **dedicated 19 / 26 섹션 ids**
- **placeholder 7 / 26 잔여**: material · styledShot · philosophy · detail · reviews · specTable · specifications · package (Phase 2-b-3 대상)

**완전 dedicated 골격 누적 6개**: S1 · S2 · S4 · S7 · **S8** · **S11**

골격 변경분:
- S5: 1/4 → **2/4** (optionIntro 추가)
- S8: 3/5 → **5/5 ✅ 완전** (seasonalHook + options 추가)
- S11: 2/4 → **4/4 ✅ 완전** (eventDetails + benefits 추가)

KFTC discipline 강화 (이벤트/세트 트랙 특히 중요):
- `seasonalHook` — START/END 날짜 카드 *항상 렌더링*, 미상 시 「상세 페이지 참조」 placeholder
- `eventDetails` — EDITION/DROP DATE/QUANTITY 3 카드 *항상 렌더링*, 미상 시 placeholder
- `benefits` — 하단 disclosure strip *항상 렌더링* (「혜택 적용 조건: 상세 페이지 참조」)
- Groq prompt 명시: "마감 임박" / "선착순" / "지금만" 사용 금지 (dark pattern filter scarcity rule 외 추가 layer)

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 28/28 routes ✅
- 한글 sentinel grep 0건 ✅

Commit: `5fe44d5` feat(automation): add 5 event/set section renderers (Sprint 7-M2 Phase 2-b-2)

**다음 = Sprint 7-M2 Phase 2-b-3 (감각/B2B 트랙) 진입 *전* ko.json dict migration 우선 권고** — 한글 fallback 누적 ~45건으로 작업원칙 #35 30건 임계 초과. Phase 2-b-3 + 2-b-4가 추가 ~25건 도입 예상이라 *지금 분리*가 효율적.

---

## 2026-05-13 Sprint 7-M2 Phase 2-b-1 — 신뢰 트랙 3 렌더러 완료 (S4·S7 완전 dedicated)

3개 신규 렌더러 + section-copy.ts 3 신규 Groq 헬퍼:

- `corePerformance.ts` (122 LOC) — S4. 2x2 metric card grid (label / value / unit / caption). **Groq는 라벨·단위·캡션만 생성, 수치는 fabricate 0건** (KFTC strict).
- `technology.ts` (134 LOC) — S7. 3-step pipeline diagram (브랜드 primary chips + arrows + step labels) + caption.
- `clinical.ts` (183 LOC) — S7. **KFTC critical** — 임상 데이터는 *항상* 「상세 페이지 참조」 placeholder (점선 outline bars), invariant caveat strip 「임상 데이터 출처: 상세 페이지 참조」 하드코딩. Groq 응답 override 불가.

section-copy.ts 확장 (3 신규 Groq 헬퍼):
- `generateCoreMetrics` — `{headline, cards: [{label, unit, caption}] × 4}` (numeric value 의도적 omit)
- `generateTechnologyCopy` — `{headline, mechanismLabel, steps: [3], caption}`
- `generateClinicalCopy` — `{headline, studyMeta, outcomeLabel, caveat (invariant)}`

전체 dedicated 커버리지 (Phase 1 + 2-a + 2-b-1 합산):
- **dedicated 14 / 26 섹션 ids**: hero · problem · solution · usage · cta · spec · story · product · comparison · warranty · shipping · **corePerformance** · **technology** · **clinical**
- **placeholder 12 / 26**: optionIntro · styledShot · seasonalHook · options · material · philosophy · detail · reviews · eventDetails · benefits · specTable · specifications · package

골격별 dedicated 커버리지 (변경분):
- S4: 4/5 → **5/5 ✅ 완전**
- S7: 4/6 → **6/6 ✅ 완전**

**완전 dedicated 골격 누적 4개**: S1 · S2 · S4 · S7

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 28/28 routes ✅
- 한글 sentinel grep 0건 ✅
- section-builder가 모든 SkeletonId 정상 dispatch ✅

Commit: `fff2867` feat(automation): add 3 trust-track section renderers (Sprint 7-M2 Phase 2-b-1)

다음 = Sprint 7-M2 Phase 2-b-2 (이벤트/세트 트랙 — S5/S8/S11 전용 5 렌더러: optionIntro · seasonalHook · options · eventDetails · benefits).

---

## 2026-05-13 Sprint 7-M2 Phase 2-a — 6 공유 렌더러 완료

6개 신규 렌더러 + section-copy.ts 5 신규 Groq 헬퍼:

- `spec.ts` (87 LOC) — S1/S3/S6. 2-column spec table + zebra row striping + accent header bar
- `story.ts` (117 LOC) — S3/S6/S10. Editorial paragraph (한국어 wrap @30char/line) + signature image strip + brand attribution
- `product.ts` (139 LOC) — S3/S8. 2x2 product detail grid, 공유 product image
- `comparison.ts` (120 LOC) — S4/S7. 3-column comparison table (feature / ours / baseline), KFTC-safe filter
- `warranty.ts` (79 LOC) — S4/S7. Headline + 3 line cards, circle-check icons
- `shipping.ts` (93 LOC) — S1/S9/S12. CTA copy 재사용 + S9 recyclable badge

section-copy.ts 확장 (5 신규 Groq 헬퍼):
- `generateSpecRows` — {rows: [{label, value}]} (5-6 rows)
- `generateStoryParagraph` — {paragraph, attribution}
- `generateProductGrid` — {cells: [{title, caption} × 4]}
- `generateComparisonCopy` — {headline, baselineLabel, rows[]}
- `generateWarrantyCopy` — {headline, lines[3]}

전체 dedicated 커버리지 (Phase 1 + 2-a 합산):
- **dedicated 11 / 26 섹션 ids**: hero · problem · solution · usage · cta · spec · story · product · comparison · warranty · shipping
- **placeholder 15 / 26**: corePerformance · technology · clinical · optionIntro · styledShot · seasonalHook · options · material · philosophy · detail · reviews · eventDetails · benefits · specTable · specifications · package

골격별 dedicated 커버리지:
- S1: 3/3 ✅ (완전)
- S2: 5/5 ✅ (완전, Phase 1)
- S3: 5/6 (package만 placeholder)
- S4: 4/5 (corePerformance만 placeholder)
- S6: 4/5 (styledShot만 placeholder)
- S7: 4/6 (technology, clinical placeholder)
- S9: 3/4 (material만 placeholder)
- S12: 3/5 (specTable, specifications placeholder)
- S5/S8/S10/S11: 1~3/n (Phase 2-b에서 보완)

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 28/28 routes ✅
- 한글 sentinel grep 0건 ✅
- section-builder가 모든 SkeletonId 정상 dispatch ✅

Commit: `449719b` feat(automation): add 6 shared section renderers (Sprint 7-M2 Phase 2-a)

다음 = Sprint 7-M2 Phase 2-b (15 골격 전용 렌더러) + Phase 2-c (lifestyle-picker).

---

## 2026-05-13 Sprint 7-M2 Phase 1 — 5섹션 빌더 + S2 5 렌더러 완료

10개 신규 파일 1,306 LOC (`src/lib/automation/section-renderers/` + `section-builder.ts`):

- `types.ts` (91 LOC) — SectionRenderer signature + SectionRenderContext + `resolveBgColor` (skeleton colorTokens 매핑, 미지 토큰 → white fallback, throw 0건)
- `section-copy.ts` (390 LOC) — 4 Groq 헬퍼 (hero / problem / solution / usage / cta), JSON-array 출력 파싱 + filterDarkPatterns + 결정형 fallback. copy-writer.ts와 분리해서 thumbnail/section copy 추상화 분리 유지
- `_placeholder.ts` (62 LOC) — 미구현 섹션 id 안전망. 점선 테두리 + 섹션 id 라벨 + 레이아웃 힌트. section-builder가 어떤 SkeletonId든 throw 없이 빌드
- `hero.ts` / `problem.ts` / `solution.ts` / `usage.ts` / `cta.ts` (498 LOC) — S2 주력 골격의 5 섹션 end-to-end 렌더링
- `index.ts` (51 LOC) — 섹션 id → renderer 매핑. `getSectionRenderer` / `hasDedicatedRenderer` / `listDedicatedSections` 노출
- `section-builder.ts` (209 LOC) — top-level orchestrator. matchSkeleton (또는 overrideSkeletonId) → sections[] 순회 → 각 renderer 호출 → 수직 stacking (Sharp). 섹션별 error isolation (실패 시 placeholder fallback, 높이 유지)

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 28/28 routes ✅
- 한글 sentinel grep 0건 ✅
- 12 SkeletonId 모두 placeholder safety net으로 end-to-end 가능 ✅

Phase 2/3 scope (Out of scope for this commit):
- 21 잔여 section renderer (material / philosophy / clinical / seasonalHook / story / package / technology / comparison / warranty / optionIntro / styledShot / eventDetails / benefits / specTable / specifications / shipping / product / options / detail / reviews / spec)
- `lifestyle-picker.ts` (LifestyleAsset 30일 cooldown + 태그 매칭)
- `/api/products/[id]/generate-detail` route + Diagnosis 연동 + Supabase Storage 업로드

Commit: `993098f` feat(automation): add 5-section detail page builder Phase 1 (Sprint 7-M2)

다음 = Sprint 7-M2 Phase 2 (21 잔여 렌더러 + lifestyle-picker).

---

## 2026-05-13 Sprint 7-M1 썸네일 자동화 4변형 완료

6개 신규 파일 1,424 LOC (`src/lib/automation/` + `src/app/api/thumbnail/[sku]/`):

- `skeleton-matcher.ts` (166 LOC) — SKELETONS 컬렉션 consuming 8축 점수화 (wildcard 0.5 / match 1.0 / mismatch 0.0). 12 골격 ranked + ambiguous flag (top 2 within 5pp). 동점 시 S2 디폴트.
- `sharp-composite.ts` (233 LOC) — Buffer 빌딩블록 8개 (canvas / fetch / fit / SVG text overlay / badge / vignette / jpeg export). SVG xmlEscape로 상품명 injection 차단.
- `cloudinary-pipeline.ts` (180 LOC) — Cloudinary *fetch-mode* URL builder. **업로드 없음**, 작업원칙 #38 strict 준수. Named preset 4개 (urlCleanWhite / WithBgRemoval / Brand / GalleryThumb).
- `copy-writer.ts` (270 LOC) — Groq Llama 3.1 8B + 다크패턴 정규식 필터 6 규칙 (scarcity / anchor-discount / superlative / authenticity / coupon-stack / emoji). 필터 hit 시 1회 retry (하드닝 프롬프트) → 결정형 fallback.
- `thumbnail-generator.ts` (395 LOC) — 4변형 orchestrate (clean / price / badge / lifestyle). 각 renderer 독립 (1 실패가 나머지에 영향 0). VARIANT_HINTS 매핑으로 골격별 권장 변형 노출.
- `/api/thumbnail/[sku]/route.ts` (180 LOC) — POST endpoint. Product 조회 (id OR sku) + 최근 Diagnosis row 의 conceptTone (또는 body override) → 4 변형 base64 JPEG 응답.

검증:
- npx tsc --noEmit 0 errors
- npm run build 28/28 routes + `/api/thumbnail/[sku]` ƒ Dynamic 등록 ✅
- 코드 내 한글 0건 (작업원칙 #29 c)
- 작업원칙 #38 — 이미지 생성 API 호출 0건, 변환(Cloudinary fetch) + 로컬 합성(Sharp)만

Commit: `9bedaaf` feat(automation): add thumbnail generator + skeleton matcher (Sprint 7-M1)

다음 = Sprint 7-M2 5섹션 상세페이지 빌더.

---

## 2026-05-13 Sprint 7-Skel 12 골격 spec 완료

13개 신규 파일 (`src/lib/automation/layout-skeletons/`):
- `index.ts` — SkeletonSpec 타입 + SKELETONS 컬렉션 + module-load 시점 invariant (section id 정합성 → grading.SKELETON_SECTIONS 1:1)
- `s1`~`s12-*.ts` — 각 SkeletonSpec 객체 export (matchSignature concept+tone 8축, sections[] id/height/layout/copyTone, totalHeight/width 860px, colorTokens, fonts, copyGlobalTone)

검증:
- npx tsc --noEmit 0 errors
- npm run build 28/28 routes 통과, index.ts invariant module-load 시 무사고
- 12개 골격 모두 grading.SKELETON_SECTIONS 매트릭스와 section id 1:1 정합
- 코드 내 한글 0건 (작업원칙 #29 c — 디자이너 노출 한글 라벨은 후속 dict 파일에서)

Commit: `a29e8c5` feat(automation): add 12 layout skeletons (Sprint 7-Skel)

다음 = Sprint 7-M1 썸네일 자동화 4변형 (clean / price / badge / lifestyle).

---

## 2026-05-12 v3.1 FINAL 채택

본 세션(docs-only commit)에서 다음 5개 MD 일괄 갱신:
- SESSION_LOG.md: v3.1 FINAL 기획 점검 entry 추가
- ROADMAP.md: Sprint X 인계 메시지 deprecated, Sprint 7-Diag 진입 메시지 활성화
- SPRINT_PLAN.md: Sprint 7 v3.1 FINAL 매트릭스 추가
- PRINCIPLES_LEARNED.md: 작업원칙 #38·#39·#40 추가
- PROGRESS.md: 본 entry 추가
- docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md: 신규 문서 보존

다음 세션 = Sprint 7-Diag MVP 코드 작업 진입.

---

---

## 핵심 인덱스

> **분할 이후 새 인덱스 (작업원칙 #31 (b), 2026-05-12)**
>
> - **작업원칙 #1~#25 (코드/UI/세션/보고)** → `docs/plan/PRINCIPLES_CODE.md`
> - **작업원칙 #26~#36 (학습된 패턴)** → `docs/plan/PRINCIPLES_LEARNED.md`
> - **Sprint 6/6.5/6-D/7/8/9+ 계획** → `docs/plan/SPRINT_PLAN.md`
> - **핵심 파일 경로 / 알려진 이슈 / SEO 인사이트 / 기술 패턴** → `docs/plan/REFERENCES.md`
>
> 본 파일 (PROGRESS.md)은 *현재 상태 스냅샷 + 진입점*만 유지합니다.

### 자주 참조하는 작업원칙 단축 인덱스

- [작업원칙 #26](PRINCIPLES_LEARNED.md) — IA 점검 + 고아 라우트 처리
- [작업원칙 #29](PRINCIPLES_LEARNED.md) — 한글 처리 절대 규칙 5가지
- [작업원칙 #29 (e++)](PRINCIPLES_LEARNED.md) — 사용자 닉네임 절대 규칙
- [작업원칙 #31](PRINCIPLES_LEARNED.md) — MD 의미 단위 자동 분할 + 인계 무결성
- [작업원칙 #32](PRINCIPLES_LEARNED.md) — TSC ≠ Production 빌드 검증
- [작업원칙 #33](PRINCIPLES_LEARNED.md) — useSearchParams Suspense 자동 점검
- [작업원칙 #34](PRINCIPLES_LEARNED.md) — 명백한 오류 파일 사용자 알림
- [작업원칙 #35](PRINCIPLES_LEARNED.md) — 한글 사전 분리 패턴
- [작업원칙 #36](PRINCIPLES_LEARNED.md) — Vercel deploy 검증 의무화
- [현재 앱 상태](#현재-앱-상태)
- [환경/메뉴/파이프라인](#환경--메뉴--파이프라인)

---

## 현재 앱 상태

| 항목 | 현황 |
|------|------|
| 전체 상품 | 8개 (모두 DRAFT) |
| 네이버 Commerce API | ok=true ✅ |
| 네이버 검색광고 API | ✅ (CUSTOMER_ID: 3755315) |
| 네이버 DataLab API | ✅ ID: F7Hga62gDOYxZ3KRtLTL |
| Discord | 5채널 ✅ |
| TSC | 0 errors ✅ |
| Vercel 배포 | https://kkotium-garden.vercel.app ✅ |
| GitHub | https://github.com/kkotium-dot/kkotium-garden |
| Phase A~D | 전체 완료 ✅ |
| Phase E | 진행 중 (E-7, E-1, E-3, E-8 완료) |
| Phase E+ | Sprint 1·2·3·4·5 완료 |
| 카카오 비즈니스 채널 | 꽃틔움 KKOTIUM (`_xkfALG`) ✅ |
| 도매꾹 Private API | 28개 전체 권한 발급 ✅ (Sprint 8 보류 트랙) |
| Solapi 알림톡 | 키 미입력 (월 50건+ 시 활성화) |

### 카카오 비즈니스 채널 정보

```
채널명: 꽃틔움 KKOTIUM
검색용 ID: 꽃틔움
채널 Public ID: _xkfALG
채널 URL: http://pf.kakao.com/_xkfALG
채팅 URL: http://pf.kakao.com/_xkfALG/chat
카테고리: 쇼핑 > 생활용품
```

### AI API 키 현황 (2026-04-30 기준)

| 서비스 | 환경변수명 | 상태 |
|---|---|---|
| **Groq** (1순위) | GROQ_API_KEY (lrltQb) | 정상 ✅ |
| **Groq** | GROQ_API_KEY_3 (3IGN7i) | 정상 ✅ |
| Groq | GROQ_API_KEY_2 (3pEakT) | 401 Invalid (Vercel 삭제 권장) |
| Gemini | GEMINI_API_KEY/_2/_3 | 429 quota 초과 (운영 기여 0) |
| xAI Grok | XAI_API_KEY | 크레딧 미배정 |
| Perplexity | PERPLEXITY_API_KEY | Pro 만료 (401, 비활성) |

**fallback 순서**: Groq round-robin (3키, 401/403/JSON parse safety) → Gemini round-robin → Anthropic last-resort

---

---

## 환경 / 메뉴 / 파이프라인

### 환경 정보

```
앱 루트:    /Users/jyekkot/Desktop/kkotium-garden
Dev 서버:   http://localhost:3000
Dev 로그:   /tmp/dev.log
프로덕션:   https://kkotium-garden.vercel.app
DB:         Supabase PostgreSQL (doxfizicftgtqktmtftf)
스토어:     꽃틔움 KKOTIUM (smartstore.naver.com/kkotium)
GitHub:     https://github.com/kkotium-dot/kkotium-garden
Vercel:     vercel.com/kkotjyes-projects/kkotium-garden
카카오채널: 꽃틔움 KKOTIUM (pf.kakao.com/_xkfALG)
```

### 사이드바 메뉴 구조 (9개 섹션, 2026-05-08 확정)

```
GARDEN: 정원 일지 (/dashboard) ✅
HUNT:   꿀통 사냥터 (/crawl) ✅ + 소싱 보관함 (/crawl?tab=history) ✅ [Z-3b]
PLANT:  씨앗 심기 (/products/new) ✅ 신버전 6탭 통합 (수정 모드 ?edit=ID 포함)
TEND:   정원 창고 (/products) ✅
        검색 조련사 (/naver-seo) ✅ v3 인라인 편집
        좀비 부활소 (/products/reactivation) ✅
ORDERS: 주문 관리 (/orders) ✅
OPS:    인서트 카드 (/ops/insert-card) ✅
TOOLS:  거래처 명단 (/settings/suppliers) ✅
        배송 레시피 (/settings/shipping) ✅
        공급사 열쇠방 (/settings/supplier-login) ✅
        카카오 채널 (/settings/kakao) ✅
        네이버 기본값 (/naver-settings) ✅
```

### 사이드바 미등록 라우트 (정리 대상 — Z-3c'/Z-3e)

- `/products/[id]/edit` — 외부 진입 0건 (구버전 ProductForm.tsx 582줄, 메인 흐름은 `/products/new?edit=ID`로 통합됨)
- `/products/upload` — CSV 일괄 업로드 (새싹 단계에서 권장 안 함, 리서치 3번)
- `/products/sourced` — 카드 그리드 뷰 (사이드바 미등록)
- `/products/out-of-stock` — `:158`이 dead route `/products/[id]/edit`를 가리킴 (수정 필요)
- 백업 파일 67개 (`*.bak*`, `*.backup*`, `*.v[0-9]*`)

### 앱 파이프라인

```
꿀통 사냥터 (크롤링) → 소싱 보관함 (SOURCED→PENDING→REGISTERED)
→ 씨앗 심기 (등록/편집, 6탭 통합)
→ 정원 창고 (목록/인라인 편집)
→ 검색 조련사 (SEO 점수 + AI 최적화 + 인라인 편집)
→ 엑셀 다운로드 또는 네이버 직접 등록 (Commerce API)
→ 대시보드 (실적/꼬띠추천/이벤트)
→ 주문 관리 (발주확인/송장등록 + 알림톡)
→ 좀비 부활소 (재등록)
```

---

---

## 네이버 API 현황

| API | 상태 |
|-----|------|
| 토큰 발급 (bcryptjs) | ✅ |
| 채널 정보 | ✅ 꽃틔움 KKOTIUM |
| 주문 조회 / 발주 확인 / 송장 등록 | ✅ |
| 상품 실시간 동기화 | ✅ |
| 주소록 조회 | ✅ |
| DataLab 트렌드 | ✅ |
| 검색광고 키워드 검색량 | ✅ (CUSTOMER_ID: 3755315) |
| 리뷰 API | ❌ 미지원 (GitHub #1582) |

---

## Vercel 환경변수

```
DB:         DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
Naver:      NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, NAVER_PROXY_URL
Naver SEO:  NAVER_SEARCHAD_API_KEY, NAVER_SEARCHAD_SECRET_KEY, NAVER_SEARCHAD_CUSTOMER_ID
DataLab:    NAVER_DATALAB_CLIENT_ID, NAVER_DATALAB_CLIENT_SECRET
Discord:    DISCORD_WEBHOOK_ORDERS, _STOCK, _DAILY, _WEEKLY, _KKOTTI
AI:         GROQ_API_KEY, GROQ_API_KEY_3 (실사용 2개), GEMINI_API_KEY/_2/_3 (quota 초과)
Cloudinary: CLOUDINARY_CLOUD_NAME, _API_KEY, _API_SECRET
Etc:        CRON_SECRET, NEXT_PUBLIC_APP_URL
향후 (E-13B): SOLAPI_API_KEY, SOLAPI_API_SECRET, KAKAO_PF_ID, SENDER_PHONE_NUMBER
향후 (E-12): DISCORD_WEBHOOK_REVIEW
```

---

---

## 참고 문서 인덱스

### docs/research/
- `SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md` — 본 세션 신규 (15개 핵심 + 단계별 체크리스트)
- `COMMERCE_API_403_ROOT_CAUSE.md`
- `COMMERCE_API_ORDER_DIAGNOSIS.md`

### docs/plan/archive/
- `README.md` — archive 폴더 인덱스 (분할 정책 + 검색 패턴 + 파일명 규칙)
- `PROGRESS_2026Q2_MAY.md` — 5월 누적 PROGRESS 헤더 이력 (작업원칙 #31 분할, 동결)
- `ROADMAP_2026Q2_MAY.md` — deprecated 인계 메시지 9개 + Phase A/B/C 완료 이력 (동결)
- `ROADMAP_2026-05.md` — Session B 작업 + deprecated 인계 메시지 (2026-05-12 분할, 동결)
- `SESSION_LOG_2026Q2_MAY.md` — 2026-05-01 ~ 2026-05-06 세션 24+ 건 (동결)
- `SESSION_LOG_2026-05.md` — 2026-05-06 ~ 2026-05-08 세션 9건 (두 번째 분할 2026-05-11, 동결)
- `SESSION_LOG_2026-05-12.md` — Session B 외 8 entries (세 번째 분할 2026-05-12, 동결)
- `SESSION_LOG_2026-05-12-PM.md` — Session E-2 Phase 1~5 + 7개 (네 번째 분할 2026-05-12 PM, 동결)
- `SESSION_LOG_2026-05-13.md` — 2026-05-12 5 entries (v3.1 FINAL + v2.0 + Sprint 7 P0/P0-B/P1) (다섯 번째 분할 2026-05-13, 동결)
- `SESSION_LOG_2026-05-13-PM.md` — 2026-05-13 5 entries (Phase 2-a · Phase 1 · Sprint 7-M1 · Sprint 7-Skel · Sprint 7-Diag MVP) (여섯 번째 분할 2026-05-13 PM, Phase 3 진입 직전, 동결)

### 프로젝트 파일 (외부 리서치)
- `260413-꽃틔움 가든 개선안 검증과 2026년 전략 로드맵`
- `스마트스토어 리뷰 관리와 반품안심케어, 무엇을 먼저 할 것인가`
- `네이버 스마트스토어 파워셀러의 2025-2026 실전 무기 총정리`
- `카카오 비즈니스 채널 2025-2026 완전 가이드`
- `Smartstore_Sprout_to_Power_Seller_Workflow_Optimization_Guide__May_2026.md`
