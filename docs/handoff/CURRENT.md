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
