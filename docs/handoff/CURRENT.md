# 현재 인계 (CURRENT)

> 이 파일 1개만 활성 인계. 과거 116건은 `archive/2026-Q3/`로 격리(전부 이동, 삭제 0건).
> 갱신 규칙: 매 세션 종료 시 이 파일을 덮어쓴다(누적 아님) — 실시간 상태는 `docs/plan/TASK_BRIDGE.md` §3 ACTIVE가 정본.

- **status**: 진행 중 — 문서 정리(AI_DOCS_MANAGEMENT_STANDARD 도입) + ADR-0002(source-gone 스파이크 내성) 구현 완료·검증 완료(smoke exit0·tsc0·T-16/T-17 PASS). handoff 아카이브 격리 완료(작업2). CLAUDE.md 축소는 1단계(삭제후보 보고)만 진행, 실 삭제는 운영자 승인 대기(작업3·#314).
- **branch**: `main` (baseline `d282523`, 1인 개발 direct-push 체계 — 별도 브랜치 없음)
- **goal**: docs/DOCS_STANDARD.md v2 기준으로 handoff 산더미·CLAUDE.md 비대(346줄)를 정리해 다음 세션 온보딩 비용을 낮춘다. 동시에 ADR-0002(공급처 단절 판정 고립 스파이크 1회 허용)를 코드에 반영해 폴러 오독 1건으로 처분 대상이 누락되는 사고를 막는다.
- **next-action**: 운영자가 CLAUDE.md 삭제후보 표를 검토 후 승인하면 2단계(실제 삭제 + grep 검증)를 진행. 그 전까지 Code 측 추가 착수 항목 없음 — 승인 대기.

---

# 2026-07-28 세션 마무리 (Desktop · rev92 시점)

BASELINE: main `6b0d82a` (== origin/main == prod, Vercel SHA 일치 확인)

## ✅ 이번 사이클 완료 요약

### 코드 기능
- lifecycle.ts 신설 (7상태 파생 단일함수)
- 부활소 발행 게이트(T-19) + draft_incomplete 제거 + 정원창고 "검수 대기" 배지
- sourceGone 옵션 C (고립 스파이크 1회 허용, 테스트 6/6)
- surfaceRules.ts 권한 매트릭스 + T-01~T-20, T-19 전체확장 (out-of-stock·KkottiWidget 포함)
- 새 버전 감지 배너 (음성: 오탐 없음 확인 / 양성: 다음 배포 시 자연 검증)

### 문서·시스템
- CORE_PRINCIPLES.md 신설 (115줄, 44→46항목, 전 레인 관문)
- DOCS_STANDARD v3 (린터위임·파일:라인·audit모드·행동가이드라인 블록)
- ADR-0001(ARCHIVE 미도입) · ADR-0002(sourceGone 옵션 C)
- CLAUDE.md 346→88줄 (WHAT/WHY/HOW 구조, 행동가이드라인 내장, 참조 4종)
- PARALLEL_WORK_TRACKER 1938→258줄 (rev80 이전 archive 분할)
- handoff 116개 격리 → CURRENT.md 단일 활성
- .claude/rules/ 3종 (naver-api·korean-md·image-assets, paths 범위)
- claudeMdExcludes 설정 (archive 폴더 자동 로드 제외)
- PRODUCT_LIFECYCLE_FLOW.md 신설 (상품 생애 흐름 정본)
- DOMAIN_FACTS.md 갱신 + 발행 워크플로우(#307) 명문화
- COLLABORATION_PLAYBOOK.md (문제해결 방식 지침)
- 원칙 #295~#314 등재

### 프로덕션 검증 완료 (Chrome 실측)
- 부활소: 미발행 0건(T-19 해소) ✅
- 정원창고: "검수 대기 2건" 배지 ✅
- 꽃밭돌보기: 발행분 1건만(경계 정상) ✅
- 재활성화 카운트: 꽃밭돌보기↔부활소 수치 일치 ✅
- surfaceRules 10/10 독립 재실행 ✅

## 🔴 다음 Desktop READY (우선순위 순)

### P1 ★최우선 — 검수 게이트 구현
**현황**: 최초 발행 4경로(P0~P3) 전부 게이트 없음. 지금도 검수 없이 발행 가능.
**설계 확정**: PUBLISH_REVIEW_GATE_2026-07-23.md 최종판 (4경로 registerProduct 직전 assertPublishable, UI=안내·서버=강제, reviewChecklist 기존 컬럼 재사용, DB 신설 0)
**Code 인계**: 착수 계획 보고 → 승인 → 구현 (비가역 발행경로 변경이므로 계획 선보고 필수)

### P2 — 새 버전 배너 양성 검증
**현황**: 음성(오탐 없음) 확인됨. 양성("다른 버전 감지 시 뜨는가")은 미검증(#310).
**방법**: 다음 배포 후 Desktop이 Chrome으로 직접 확인.

### P3 — 처분 스모크 재실행
scripts/smoke-disposition-channels.ts. 대상: naverProductId 有 + 스냅샷 0건인 상품.

### P4 — 명화→플라티코 상품셋 교체 경위 확인
명화는 검증 baseline(#55)이었는데 Product 테이블에서 제거됨.

### P5 — CORE_PRINCIPLES audit 추가 권장 2건 CORE 반영 확인
#296(분류축 파생)·#88(레인간 완료검증)을 본문 표에 삽입 — 현재는 말미 추가 블록 상태.

## 능력 경계

- ✅ Supabase SQL 읽기/쓰기 · Chrome 프로덕션 실측 · Vercel 조회
- ✅ Desktop Commander / Filesystem MCP (교차 백업)
- ❌ 코드 파일 쓰기 · git commit/push → Code 레인으로
- ⚠️ 화면 스크린샷 전송 불가 → 페이지 텍스트로 검증

## 절대 금지 (매 세션 확인)

- 네이버 스토어 PUT/POST → 운영자 "GO" 없이 절대 금지
- 디스코드 실발송(크론 수동 실행) → 실제 알림 발송됨
- 테스트 데이터 방치 → 주입했으면 같은 세션에 원복
- 문서 무단 삭제 → 전문 보존 + 후보 목록 승인 후에만
- 허위 완료 보고 → 실측 못 한 것은 "미검증"으로 명시

## 다음 링크 자료 (대표님 추가 예정)

- 대표님이 추가 링크를 주실 예정. 도착 시 `docs/research/`에 한국어 정리 후 DOCS_STANDARD v3+에 채택분 반영.

---

# 2026-07-29 검수 게이트 프로덕션 실측 (Desktop · 배포 6dd64fe)

## ★ 마이그레이션 전 fail-closed 작동 확인 (예상대로)

배포 `6dd64fe`에서 검수 게이트가 **DB 컬럼 없이도** 정확히 동작:

| 항목 | rev86 | 현재 | 판정 |
|---|---|---|---|
| 정원창고 준비미흡 | 0 | **2** | 검수 미승인=미흡 |
| 발행 가능 | 2 | **0** | ✅ 검수 안 한 상품 발행 불가 |
| "준비된 것 일괄 발행" | 2 | **0** | ✅ 일괄발행 경로 차단(#307 실효) |
| 검수 대기 배지 | 2건 | 2건 | 유지 |

→ 컬럼 NULL = "검수 안 함" = fail-closed = 발행 차단. **ADR-0003 결정2·결정4가 프로덕션에서 실증됨.** 앱 정상(화면 렌더·콘솔 무이상).

## DB 스키마 실측 — Code 발견 확증

`information_schema.columns` (review 관련):
- `store_settings.review_checklist` (jsonb) — **싱글턴 스토어 1행**. 상품별 불가 (Code 정확)
- `store_settings.review_last_updated`, `manual_review_count` — 스토어 단위 E-2A 카운터
- `Product.review_checklist` — **없음** → 마이그레이션 필요
- `benchmark_dna.reviewed_at/by` — 무관

→ ADR-0003 "기존 컬럼 재사용" 전제는 **부정확했음**. Code가 멈춰 확인 요청한 것이 옳음(#303).

## 대기: DB 마이그레이션 (운영자 GO 필요)

```sql
ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS review_checklist JSONB,
  ADD COLUMN IF NOT EXISTS review_last_updated TIMESTAMP(3);
```
- 안전: 추가만 · idempotent · reversible · NULL 기본(=미검수) · 코드 이미 fail-closed 방어
- 적용 주체: **Desktop만**(Code는 프로덕션 변경 불가 · #41). 운영자 GO 후 apply_migration.
- 적용 후 검증: information_schema 재확인 → 씨앗심기 검수 승인 1건 테스트 → 해당 상품만 발행가능 전환 확인 → 원복.

## 다음 Desktop READY
1. (GO 시) 마이그레이션 apply_migration → 컬럼 2개 확인
2. 검수 승인 플로우 E2E: 씨앗심기에서 1건 승인 → 정원창고 "발행 가능 1"로 전환되는지
3. 우회 경로 0건 최종 확인(P0~P3 · #311)
4. P2 배너 양성 · P3 스모크 · P4 명화→플라티코

---

# 2026-07-29 마이그레이션 적용 + 검증 (Desktop · GO 승인)

## ✅ 마이그레이션 성공
운영자 GO 후 `apply_migration` (product_review_gate) 적용:
- `Product.review_checklist` (jsonb, nullable) 생성 확인
- `Product.review_last_updated` (timestamp, nullable) 생성 확인
- 상품 3개·발행 1개 불변(데이터 손실 0), 미검수(NULL) 3개 = 정확한 초기화

## ⚠️ 그러나 게이트 미작동 — Prisma 스키마 갭 발견 (E2E 막힘)

프로덕션 실측(reload 후):
| 시점 | 준비미흡 | 발행가능 | 일괄발행 |
|---|---|---|---|
| 마이그레이션 전 | 2 | 0 | **0**(차단) |
| 마이그레이션 후 | 0 | 2 | **2**(열림) ⚠️ |

**역설**: 컬럼 부재 시엔 fail-closed로 우연히 차단됐으나, 컬럼 생성 후 게이트가 오히려 열림.

**근본 원인**(API 실측): `/api/products` 응답에 `review_checklist` 필드가 **FIELD_ABSENT**.
→ DB엔 컬럼 있으나 **Prisma가 모름**. `schema.prisma`에 필드 미추가 → `prisma generate` 미실행 → API가 컬럼을 read하지 않음 → 게이트가 undefined로 판정해 통과.

## 🔴 Code 인계 필수 (Desktop 불가 영역)
1. `prisma/schema.prisma` Product 모델에 필드 추가:
   ```
   review_checklist    Json?     @map("review_checklist")
   review_last_updated DateTime? @map("review_last_updated")
   ```
2. `npx prisma generate` → 빌드 → push → 배포
3. publish-review-gate.ts가 **NULL(미검수)=발행 차단**으로 판정하는지 재확인
   (현재 undefined 통과 로직이 NULL도 통과시키면 안 됨)
4. 배포 후 Desktop 재검증: 정원창고 "발행 가능 0" 복귀 확인

## 다음 Desktop READY (Code 배포 후)
1. reload 후 정원창고 "발행 가능 0 / 준비미흡 2" 확인(NULL=차단)
2. 검수 승인 E2E: 씨앗심기 승인 1건 → 해당 상품만 "발행 가능 1" → 원복
3. 우회 경로 0건(P0~P3 · #311)
4. P2 배너 양성 · P3 스모크 · P4 명화→플라티코

## 롤백 정보 (문제 시)
```sql
ALTER TABLE public."Product"
  DROP COLUMN IF EXISTS review_checklist,
  DROP COLUMN IF EXISTS review_last_updated;
```
단, 컬럼 추가는 무해(NULL)하므로 롤백 불필요. Prisma 스키마 동기화가 정답.

---

# 2026-07-29 검수 게이트 코드 경로 검증 (Desktop · 배포 2b5812c)

## ★ 직전 관측 정정 (#310 · Code 지적 수용)
Desktop이 관측한 "정원창고 준비미흡/발행가능/일괄발행 배지 숫자 변화(2↔0)"를 **검수 게이트 효과로 단정한 것은 근거 부족**이었다. 실측으로 정정:

- 정원창고 배지 소스(`publish-readiness.ts`·`load-update-context.ts`·`product-builder.ts`·`control-tower-engine.ts`)는 **reviewChecklist 참조 0건**(grep 확인). 배지는 구 8항목 구조 게이트(이름/카테고리/이미지/가격/주소/단위가격/원산지)이며 검수와 무관.
- 즉 배지 숫자 변화는 검수 게이트 때문이 아니다. 우연한 동시 데이터 변화 가능성. **관측표 무효화, 미검증 처리.**

## 코드 경로 검증 (소스 확인 — PASS)
| 항목 | 결과 | 근거 |
|---|---|---|
| build 스크립트 근본수정 | ✅ | `"build": "prisma generate && next build"` (Prisma+Vercel 캐시 함정 방지) |
| assertPublishable 연결 | ✅ 4경로 | batch-register·naver/products/register·naver/products·naver/register |
| batch-register skip 로직 | ✅ | route.ts:141 assertPublishable → 실패 시 :147 status='skipped' :150 continue |
| NULL=차단(fail-closed) | ✅ | publish-review-gate.ts:108 `if(!cl?.approved)` → null·undefined·false 전부 NOT_REVIEWED |
| REVIEW_STALE 화이트리스트 | ✅ | :84-85 스냅샷 없으면 stale, 화이트리스트 필드 변경만 비교(#316-A) |
| DB 컬럼 | ✅ | review_checklist·review_last_updated 존재, 미발행 2건 다 NULL |

## ⚠️ 미검증 (정직 · #310)
1. **실제 발행 차단 동작**: batch-register 실 실행은 **네이버 발행 유발 → 테스트 금지(#46)**. 코드 경로는 확인했으나 런타임 skip 실증은 불가. 운영자 GO 하에 dryRun 경로가 있으면 그때 검증.
2. **API 목록의 reviewChecklist ABSENT**: `/api/products` 응답에 필드 없음. 단, 게이트는 `assertPublishable`이 product.id로 **별도 조회**하므로 목록 API select와 무관 — 게이트 동작에는 영향 없음. 목록에 노출하려면 별도 select 추가 필요(후속).

## 🔴 후속 과제 (Code 인계)
1. **검수 승인 UI/엔드포인트 부재** — reviewChecklist에 {approved:true} 쓰는 경로 0건.
   설계안(기보고): PATCH /api/products/[id]/review-approve + 씨앗심기 승인 버튼. 계획 선보고 후 착수.
   ※ 이게 없으면 어떤 상품도 검수 통과 불가 → 게이트가 "전부 차단" 상태로만 존재.
2. **정원창고 배지에 검수 상태 미반영** — 실무 갭. 배지는 구조 준비도만, 검수 승인 여부는 안 보임.
   → 셀러가 "왜 발행이 안 되지?"를 배지로 알 수 없음. 후속 통합 과제로 결정 필요.
3. 정원창고 "준비된 것 일괄 발행"이 batch-register(검수 게이트 O)를 타는지, 별도 경로인지 확인 필요.

## 다음 Desktop READY
1. 검수 승인 UI 구현·배포 후 → E2E(승인 1건 → 그 상품만 발행가능 → 원복)
2. 우회 경로 0건 최종(P0~P3)
3. P2 배너 양성 · P3 스모크 · P4 명화→플라티코

---

# 2026-07-29 (2) 세션 상태 정정 + P4 경위 규명 (Desktop)

## ⚠️ 검수 승인 UI — 아직 미구현 (실측 정정)
이번 세션 첨부가 비어 있었고, 실측 결과:
- 배포 SHA = `2b5812c` (직전 세션과 동일, 신규 커밋 없음)
- 미push: `0 0` / `review-approve` 엔드포인트 **부재**
- 검수 승인 UI는 **아직 구현되지 않음**. Code 착수 대기 상태 유지.
→ 지어내지 않고 사실 보고. E2E는 승인 UI 배포 후로 유지.

## ✅ P4 규명 — 명화→플라티코 경위 (product_events 실측)
현재 Product 3개(달항아리·아이스트레이·플라티코)에 명화 없음. 삭제 상품 추적:

**삭제된 상품 `cmpnooli40001f0gveaxr8iim`** (명화 디퓨저로 추정):
| 필드 | 값 |
|---|---|
| 이벤트 | `NAVER_REGISTERED` (2026-06-05 09:54) |
| 전이 | DRAFT → naverProductId `13564133057` |
| note | **`API direct (attr:C readiness:74%)`** |

**핵심 발견**: 이 상품은 **준비도 74%·검수 없이 API로 직접 발행**됐다. 정확히 검수 게이트가 없던 시절의 무검수 발행(#307 위반)이며, 현재 우리가 막으려는 P0~P3 경로의 과거 실제 사례다. **P4가 검수 게이트의 존재 이유를 실증한다.**

- 삭제 이벤트는 product_events에 없음(하드 삭제로 추정 — 이벤트 미기록).
- 명화는 baseline(#55)에서 빠지고 플라티코로 대체된 것으로 확인. 별도 조치 불요.
- ⚠️ 후속: 상품 하드 삭제가 이벤트를 남기지 않는 갭 발견 → 삭제도 product_events에 기록하면 추적성 향상(후속 과제 후보, #315 판단 필요).

## 현재 세션에서 가능/불가 경계
- ✅ 가능: DB 실측(P4 완료), 프로덕션 브라우저 읽기, 게이트 코드 경로 확인
- ⛔ 불가: 검수 E2E(승인 UI 부재), 실제 발행 차단 런타임(#46), P3 스모크(코드 실행은 Code 레인)

---

# 2026-07-29 (3) 검수 승인 프로덕션 검증 PASS + UX 개선 요청 2건 접수

## ✅ 검수 게이트 E2E 확인 완료 (Code f79c563 배포분)

3중 확증(코드경로·API·프로덕션 화면) 전부 PASS:
- 정원창고 배지: 준비미흡0/**검수승인대기2**/발행가능0/일괄발행버튼 비활성
- `/preview` 검수카드: "검수 승인" 버튼 실제 비활성(대표이미지 해상도·배경·상세이미지 사유 명시)
- `GET /review-approve`: `reasons:[READINESS_INCOMPLETE,IMAGE_WARNING,NOT_REVIEWED]` 분리 반환(ADR-0003 결정2 정합)

**★검수 게이트 P1 완료 선언.** 승인 성공 경로(readiness100·경고0 상품에서 실제 승인 클릭)만 조건상 아직 미보유 — 향후 그런 상품 발생 시 확인.

## 운영자 요청 2건 접수 (2026-07-29)

### ① 삭제 상품 보관함(열람 목록) — 신규 요청, ADR-0001과 무관
ADR-0001은 "발행 전 ARCHIVE 상태 도입"을 미채택한 것. 이번 요청은 **다른 것** — 이미 삭제(DELETE_SAFE 처리)된 상품을 **나중에 열람할 수 있는 목록 화면**.

실측: 삭제 이력 전용 화면 **없음**. `product_events`에 `NAVER_REGISTERED` 등은 기록되나 삭제 이벤트 자체는 미기록(2026-07-29(2) 발견과 연결).

**설계 방향(제안)**:
1. 삭제 시 `product_events`에 `PRODUCT_DELETED` 기록(스냅샷: name·category·salesCount·삭제사유) — 이게 선행돼야 목록이 의미 있음
2. 신규 읽기전용 화면 `/products/deleted` — 삭제된 상품 스냅샷 목록(검색·기간필터)
3. **복원 기능은 포함 안 함**(ADR-0001 유지 — 재검토 조건 미충족). 열람·감사 목적만.

### ② 워크플로우 UX 개선점 전수 점검 — 요청, 아래 §3에서 진행

## 워크플로우 UX 개선점 전수 점검 (Desktop, 2026-07-29 실측 기반)

지금까지 프로덕션에서 직접 확인한 화면들을 종합해 발견한 개선점. 코드 변경 아님, 제안만.

### UX-1. ★ 정원창고 "일괄 발행" 버튼이 왜 0인지 배지만으론 모른다
현재: "검수 승인 대기 2" 배지는 있으나, **일괄 발행 버튼 자체에는 왜 비활성인지 이유가 안 붙어있다**(실측: 버튼 텍스트 "준비된 것 일괄 발행 0"뿐).
**제안**: 버튼에 마우스 올리면(또는 비활성 상태 옆에) "검수 승인 후 이용 가능"처럼 원인→행동 툴팁 추가. 3초룰 §0 "빈상태=원인+행동" 원칙을 버튼 비활성 상태에도 적용.

### UX-2. ★ 검수 승인 실패 사유가 preview 화면 밖에서 안 보인다
목록(정원창고)에서는 "검수 승인 대기"라고만 뜨고, **왜 승인이 안 되는지(이미지 문제·정보 누락)는 preview에 들어가야 보인다**. 상품이 많아지면 하나씩 열어봐야 해서 비효율적.
**제안**: 목록 행에 커서를 올리면 "이미지 경고 3건" 같은 요약을 툴팁이나 배지 옆 작은 아이콘으로. 지금(3개)은 괜찮지만 카탈로그가 커지면 필수.

### UX-3. 대표이미지 경고와 크롭 스튜디오가 같은 화면에 있어 좋음 — 유지
실측: `/preview`에서 "해상도 미달" 경고와 "크롭 스튜디오"가 바로 옆에 붙어있어 **원인을 보자마자 고칠 수 있는 동선**이 이미 잘 돼 있다. 이 패턴(문제+해결도구 인접 배치)을 다른 경고에도 확장 권장 — 예: "상세 이미지 없음" 경고 옆에도 바로 업로드 버튼.

### UX-4. 검수 승인 취소(재검수) 흐름의 가시성
Code 설계(2026-07-29)에 "승인 취소" 텍스트버튼이 있음. **제안**: 취소 시 "왜 취소하는지" 사유를 남기지 않아도 되지만, 승인 이력(누가 언제 승인→취소했는지)이 나중에 "왜 이 상품이 재검수 대상이 됐지"를 알려주므로 최소한 취소 시각은 배지에 노출.

### UX-5. 발행 실패의 조기 발견 (Code 작업3 발견과 연결)
Code가 발견: 모달의 클라이언트 사전 필터가 검수 승인을 안 봐서 "N개 등록 가능"이라 보여준 뒤 서버에서 409로 실패하는 문제. **이미 배지 3분류(UX 개선 완료분)로 해소되는 방향이나, 모달 자체의 사전 필터도 검수 승인을 함께 걸러야 완전 해소**(Code 작업2에 이미 포함 확인 필요).

### UX-6. 좀비 부활소 "새 생명 부여" 후 씨앗심기 재검수 안내
부활소에서 "새 생명 부여"(복제→재등록)하면 새 상품이 만들어지는데, **이 새 상품도 처음부터 검수를 다시 받아야 한다는 것**이 사용자에게 명시적으로 안 보일 수 있음(실측 필요 — 다음 세션 확인 항목).

### UX-7. 삭제 전 확인 단계 (①과 연결)
삭제 상품 보관함이 생기면, **삭제 실행 시점에 "이 작업은 목록에서만 사라지고 기록은 보관함에 남습니다" 안내**를 넣는 것을 함께 제안. 지금은 disposition.ts가 DELETE_SAFE 판정만 하고 실제 삭제 확인 UX는 별도 확인 필요.

## 우선순위 제안
| 순위 | 항목 | 이유 |
|---|---|---|
| 1 | UX-1 비활성 버튼 사유 툴팁 | 3초룰 위반 직접 사례, 구현 가볍다 |
| 2 | ① 삭제 이벤트 기록(선행) | 보관함의 전제조건, 없으면 목록이 빈 껍데기 |
| 3 | ① 삭제 보관함 화면 | 이벤트 기록 이후 |
| 4 | UX-5 모달 사전필터 검수반영 확인 | Code 작업2 범위 내 포함 여부만 확인하면 됨(빠를 수 있음) |
| 5 | UX-2·UX-6 | 카탈로그 커질 때 중요해짐, 지금은 낮음 |

---

# 2026-07-30 ★긴급 회귀 발견 — /preview 화면 무한 로딩 (Desktop 실측)

## 증상
배포 `5f8fc04` 프로덕션에서 `/products/[id]/preview` 화면 2개 상품(아이스틀·달항아리) 전부:
- reload 3회+ 재시도해도 **"검수 정보 불러오는 중"에서 멈춤**
- HTML은 83,927자 렌더됨(레이아웃 자체는 로드됨) — 콘텐츠 영역만 미표시

## API는 정상 (원인 격리)
`fetch('/api/products/{id}/publish-preview')` 직접 호출 시 **둘 다 200 정상 응답**:
```
{"success":true,"productId":"...","readiness":{"readinessGrade":"A","readinessScore":84,...},...}
```
→ **서버는 정상. 프론트엔드가 응답을 받고도 로딩 상태를 못 벗어남.**

## Code 보고와의 불일치 (정직 명시)
Code는 "prod에서 reload 후 '발행 차단 사유: 업로드 준비도가 낮아요...' 완전 한글 렌더 확인"이라 보고했으나, Desktop이 지금 프로덕션에서 재현한 결과는 **콘텐츠 자체가 안 뜨고 로딩에 고착**됨. 둘 다 같은 URL·같은 배포 SHA를 봤어야 하는데 결과가 다름.

가능한 원인(추측 배제, 확인 필요 항목으로만 제시):
1. 배포 직후 순간과 지금 사이 캐시/CDN 전파 차이
2. 이 세션의 브라우저 컨텍스트(쿠키/세션 상태) 이상
3. 실제 프론트엔드 회귀(예: 새 필드 파싱 중 미처리 예외로 로딩 상태 고착) — try/catch 없이 setState가 걸려있으면 재현 가능한 패턴

## 다음 조치 (Code 확인 필요)
1. **재확인 요청**: `/products/cmpp62yje00015xup5h8pgwx0/preview` 를 지금 다시 열어 콘솔 에러(특히 uncaught exception) 확인
2. `publish-preview` 응답을 소비하는 컴포넌트의 로딩 상태 해제 로직에 이번 커밋(gate-message-i18n 배선)이 영향을 줬는지 diff 재검토
3. 재현되면 **회귀로 처리**하고 원인 수정 후 재배포. 재현 안 되면 Desktop 쪽 캐시 이슈로 결론

이 항목이 해소되기 전까지 #317 한글화 검증(prod)은 **미검증**으로 유지(#310).

---

# 2026-07-30 (2) 회귀 재확인 — 아직 재현됨, 지연시간 단서 확보

Code 미재현 보고(5035dff) 후 Desktop이 같은 화면을 다시 열어 재확인.

## 재현됨 (Code 결과와 또 불일치)
`cmpp62yje00015xup5h8pgwx0/preview`: reload 후 10초+ 경과해도 "검수 정보 불러오는 중" 고착.

## 신규 단서 — API 응답 지연 실측
같은 페이지 컨텍스트에서 `fetch('/api/.../publish-preview')`를 직접 실행:
- 첫 poll: pending
- 재확인(수 초 후): pending
- 재확인(추가 수 초 후): **STATUS:200**
→ API가 실패하는 게 아니라 **느리다**(정확한 초 단위 미측정 — 폴링 간격상 대략 5~15초 구간으로 추정, 정밀 측정 아님).

## 판단
Code의 "OCR+원격이미지 fetch로 무거운 서버리스 함수" 진단은 방향이 맞아 보임. 다만 **API가 최종적으로 200을 주는데도 화면이 로딩에서 안 풀리는 것**이 문제 — 즉 코드 결함이 아니라 인프라 지연일 가능성과, 프론트가 그 지연을 못 견디고 있을 가능성 둘 다 남아있음. 정밀 원인(SWR 타임아웃/재시도 설정, 함수 콜드스타트 실제 소요시간)은 Desktop 권한 밖(프론트 코드·Vercel 함수 로그는 Code 영역).

## 다음 조치 제안
1. Code: `publish-preview` 라우트에 응답시간 로그 추가(또는 Vercel 함수 로그 직접 확인) → 실제 몇 초 걸리는지 수치 확보
2. 수 초~10여 초가 정상이라면, 화면에 "이미지 분석 중이에요(최대 X초)" 같은 안내로 체감 개선(#317 방향과도 일치 — 원인을 사용자에게 정직하게 보여줌)
3. 만약 SWR/fetch에 타임아웃이 걸려있어 응답을 받기 전에 포기하는 코드라면 그게 진짜 회귀 — 해당 설정 확인 필요

이 항목은 Desktop 실측 권한 범위 내에서 더 파고들 방법이 없어 여기서 Code에게 넘김. #310 유지 — 미검증(원인 미확정) 상태.
