## 2026-05-08 세션 (Sprint 6-A 축소 백엔드 — Option C 하이브리드 동적 임계값) ✅

### 본 세션 성격
- 직전 commit `dc6fadc` (archive 인덱스 정비) 직후, 인계 메시지에 명시된 다음 작업 = Sprint 6-A 축소 (재고 폴링) 진행.
- 사용자 추가 요청으로 *이전 대화 (`7d388a55-...`, 2026-05-07 STEP 0 재검토)* 디테일 검토 후 누락 사항 3가지 발견 → 본 세션 계획에 통합.
- *임계값 100 vs 10 토론* 끝에 사용자 통찰 ("게으른 공급사 패턴")로 **Option C 하이브리드 동적 임계값** 채택. 시장 도구 (샵플링/플레이오토)는 고정 임계값만 — 우리 앱은 자동 학습 → 차별화 무기.

### 시작 직전 상태 (작업원칙 #21 사전 점검 통과)
- HEAD `dc6fadc` = origin/main 일치 ✅
- working tree clean ✅
- stash@{0} "z3c-misdirected-changes-needs-redo" 보존 ✅
- MD 줄 수: PROGRESS 802 / ROADMAP 980 / SESSION_LOG 1489 (1500 임계 근접) ✅
- production HTTP 200 ✅

### 사용자 핵심 인사이트 (영구 기록)

**임계값 토론**:
- 사용자: "100은 너무 높고 10은 너무 낮다"
- 사용자 통찰: *"부지런하지 않게 재고를 업데이트 안 하는 업체를 여럿 봤다"* — 공급사마다 재고 변동 패턴이 완전히 다름
- 시니어 분석: 시장 도구 (샵플링/플레이오토 등) 모두 *고정 임계값 + 셀러 수동 설정*. 동적 학습은 어디에도 없음.
- 결론: 동적 임계값 + 다단계 색상 + 게으른 공급사 자동 감지 = **Option C 하이브리드** 채택

### 본 세션 작업

#### 작업 1: 꿀통 꽃수레 7개 모두 삭제 ✅
- 사용자 결정: 6 SOURCED + 1 PENDING 모두 테스트 데이터 → 일괄 삭제
- Supabase MCP: `DELETE FROM crawl_logs WHERE sourcing_status IN ('SOURCED', 'PENDING')`
- 결과: crawl_logs 0개 (완전 깨끗한 상태)

#### 작업 2: Prisma 스키마 + DB 마이그레이션 ✅
- Supabase migration: `sprint_6_a_inventory_polling_with_dynamic_threshold`
- 신규 테이블 3개:
  - `inventory_snapshots` — 시계열 재고 일기장 (productId, productNo, qty, status, minq, isDraft, polledAt)
  - `low_stock_alerts` — 3단계 비상 호출 노트 (level: yellow/orange/red, threshold, currentQty, statusReason, resolvedAt)
  - `supplier_stock_profiles` — 7일 rolling 평균 학습 (productNo, avgDailyDepletion, sampleCount, isTrustworthy, lastNoChangeDays)
- Prisma schema 갱신 + Product/Supplier 역관계 추가
- `npx prisma generate` 정상 (Prisma Client v5.22.0)

#### 작업 3: domemae-adapter.ts getInventory() 활성화 ✅
- 기존 `notImplemented()` stub → 실제 구현
- 도매꾹 OpenAPI v4.5 `getItemView` `multiple=true` 100건 묶음
- 100건 초과 시 caller 책임으로 chunking (어댑터는 throw)
- multipleResult.item / 단일 fallback 모두 처리
- API 에러 시 placeholder snapshot (qty=-1, status='unknown') 반환 (poller가 결정)

#### 작업 4: dome-inventory-poller.ts 신규 작성 (580줄) ✅

**공개 API**: `pollAppRegisteredInventory()` (cron 진입점)

**Option C 하이브리드 로직**:
- 7일 rolling 평균 일일 변동량 학습 (`SupplierStockProfile`)
- 동적 3단계 임계값:
  - yellow = D × 7 (1주일 안전재고, 위젯만)
  - orange = D × 3 (Discord 알림)
  - red = D × 1 또는 status != "판매중" (Discord 즉시)
- 콜드 스타트 fallback (sample_count < 7):
  - yellow=100, orange=30, red=10
- 게으른 공급사 자동 감지:
  - 7일+ 연속 무변동 (qty>0) → `is_trustworthy=false`
  - 30일에 한 번 강제 알림 ("이 공급사 직접 확인 권장")
- DRAFT 처리:
  - snapshot 기록 (시세/재고 추적)
  - LowStockAlert 발생 X (Discord 알림 폭격 방지)
- ACTIVE 처리:
  - snapshot 기록 + LowStockAlert 트리거
  - 같은 레벨 중복 방지 (escalation 시에만 새 row)
  - orange/red만 Discord 발송 (yellow는 위젯만)
- minq 컬럼: 본 세션 1로 고정 (multiple=true 응답에 minq 미포함)
  - 다음 세션 UI 작업 시 별도 getItemDetail 호출로 보강

#### 작업 5: cron/inventory-sync route + vercel.json ✅
- `src/app/api/cron/inventory-sync/route.ts` 신규
- `CRON_SECRET` Bearer 인증
- `maxDuration: 60` (전체 폴링 사이클 안전 여유)
- vercel.json `crons` 배열에 6시간 주기 추가 (`0 */6 * * *`)

#### 작업 6: 검증 + commit + push (한 turn) ✅
- TSC: 0 errors
- npm run build: Compiled successfully + 27 routes prerendered (inventory-sync 포함)
- 한글 sentinel grep: 0건 (꽃졤/꽃제/꽃젤/혁섭/쿠드)
- commit hash: `66c3bdb`
- push: `dc6fadc..66c3bdb main -> main`
- 5 files changed, +719/-4

#### 작업 7: MD 갱신 (idempotent) ✅
- PROGRESS.md 헤더 swap + 단계 진행도 갱신
- ROADMAP.md 헤더 swap + 신규 인계 메시지 prepend (이전 deprecated)
- SESSION_LOG.md 본 entry prepend

### 적용된 작업원칙

- **#17** commit msg .commit-msg.tmp + git commit -F ✅
- **#21** 사전 점검 8항목 통과 ✅
- **#22** 시각 검증 — Vercel HTTP 200 + git rev-parse 검증 ✅
- **#24** commit + push 한 turn 안에 ✅
- **#26** 단독 판단 0 — 모든 결정 사용자 Y/N 승인
- **#27** 외부 컨트랙트 보존 — getInventory 활성화로 다른 코드 영향 0
- **#28** Vercel 배포 = source of truth ✅
- **#29 (a~e++)** 한글 처리 5+1+1 규칙:
  - (a) edit_file 한글 다량 newText 0건 (모두 \uXXXX escape)
  - (b) MD 갱신 = Filesystem:write_file Python 안전 삽입 패턴
  - (c) 코드 edit 영문 식별자만
  - (d) 셸 명령 한글 0건 (commit msg 영문)
  - (e) 한글 작업 후 grep 검증 ✅
  - (e+) 사용자 닉네임 답변 본문 호명 0건 ✅
  - (e++) sentinel 변종 3개 매칭 0건 ✅
- **#31 (e)** idempotent 가드 — 모든 patch에 marker 체크
- **#32** TSC ≠ Production 빌드 — npm run build 27/27 통과 ✅
- **#33** useSearchParams Suspense — 본 세션 추가 0건
- **#34** 명백한 오류 파일 발견 — 본 세션 추가 0건
- **#35** 한글 사전 분리 패턴 — 본 세션은 \uXXXX escape로 작성 (한글 사용 영역 매우 적음)

### 본 세션 학습

1. **사용자 통찰의 가치** — "임계값 100 vs 10" 토론에서 사용자가 *"게으른 공급사 패턴"*을 직접 본 경험을 공유. 이 통찰이 없었다면 단순 고정 임계값으로 끝났을 것. **시장 도구 어디에도 없는 차별화 기능 (Option C)** 도출.

2. **Option C의 차별화 가치** — 샵플링/플레이오토 등 유료 솔루션은 *고정 임계값 + 셀러 수동 설정*만 제공. 우리 앱은 *자동 학습 + 다단계 색상 + 게으른 공급사 감지*까지. 1인 셀러 시간 절감 효과가 압도적.

3. **DRAFT 폴링의 가치** — DRAFT도 snapshot은 기록 (시세 추적용). 알림은 X (소음 방지). *추적 데이터 분리 + 알림 분리* 패턴 정착.

4. **컨텍스트 안전 분할 효과** — 백엔드 (본 세션) + UI (다음 세션) + 첫 실제 상품 등록 검증 (다음 세션) 3분할로 각 작업 모두 깨끗한 컨텍스트에서 진행.

### 보류된 항목 (다음 세션 작업)

1. **정원 창고 재고 뱃지 UI** — 각 상품 row에 최신 snapshot 표시
2. **LowStockAlertWidget** — 정원 일지에 미해결 알림 위젯
3. **씨앗 심기 minq>1 경고** — DRAFT 상품 등록 시 위탁판매 불가 경고
4. **첫 실제 상품 등록 + 폴링 실측 검증** — 사용자 액션 필요
5. **minq 보강** — getItemDetail 별도 호출로 정확한 minq 값 수집

### 본 세션 commit
- 신규: `src/lib/dome-inventory-poller.ts`, `src/app/api/cron/inventory-sync/route.ts`
- 수정: `prisma/schema.prisma`, `src/lib/sources/domemae-adapter.ts`, `vercel.json`
- DB: `crawl_logs` 7개 삭제 + 3개 신규 테이블 생성
- commit hash: `66c3bdb` / Vercel deployment READY


---

# KKOTIUM GARDEN — 세션별 작업 로그

> **이 파일의 역할**: 세션별 자세한 작업 이력을 누적 기록합니다.
> - **docs/plan/PROGRESS.md** (구 KKOTIUM_PROGRESS.md): 핵심 현재 상태 + 작업 원칙 + 환경/도구 정보 (헤더만 갱신, 짧은 요약)
> - **docs/plan/ROADMAP.md** (구 KKOTIUM_ROADMAP.md): 미래 작업 계획 + Phase별 상태 표 + 다음 새 채팅 시작 메시지

> **본 파일은 작업원칙 #31에 따라 2026-05-08에 분할되었습니다.**
> **6번째 이전 세션 누적 기록**: docs/plan/archive/SESSION_LOG_2026Q2_MAY.md
> **현재 본 파일에는 직전 5세션만 유지** (분할 시점 기준 2026-05-06 ~ 2026-05-08).
---

## 2026-05-08 세션 (Sprint 6-D 1-5단계 완료 + MD 인계 무결성 회복) ✅

### 본 세션 성격
- 직전 commit `29e80fc` (Sprint 6-D 1-5단계: 4모드 foundation) 직후, 인계 메시지에 명시된 *MD 갱신 + Sprint 6-A 축소 + Private API 활용 검토* 3가지 중 안전 분할로 **MD 갱신 + 작업원칙 #29 (e++) 영구 등록** 진행.
- 시니어 추천 옵션 A 채택 — 직전 세션이 commit + push만 완료하고 MD를 미반영한 상태였기에, 본 세션이 *인계 무결성 회복*에 집중.
- 사용자 명시 결정사항 통합:
  - Private API 28개 전체 권한 발급 완료 ✅ (스크린샷 검증 — 구매용 6 / 판매용 13 / 공통 3 / 기타 6 모두 발급)
  - Sprint 8 자동발주 = 보류 트랙 (매출 상승 + 운영 흐름에 따라 진입, 현 시점 급하지 않음)
  - Sprint 6-A 축소 = 앱 등록 상품만 폴링 (기존 100개+ 일괄 동기화는 별도 사용자 요청 시)

### 시작 직전 상태 (작업원칙 #21 사전 점검 통과)
- HEAD `29e80fc` = origin/main 일치 ✅
- working tree clean ✅
- stash@{0} "z3c-misdirected-changes-needs-redo" 보존 ✅
- MD 줄 수: PROGRESS 752 / ROADMAP 884 / SESSION_LOG 1363 (1500 임계 근접) ✅
- production HTTP 200 ✅

### 직전 세션(commit 29e80fc) 4모드 foundation 산출물 (인계 무결성 회복용 기록)

**신규 파일 (2)**:
- `src/lib/recommendation-modes.ts` (188줄) — 4모드 타입 정의:
  - `KkottiRecommendMode` 타입 (currentHot / seasonalAhead / nicheBlue / storeFit)
  - `MODE_META` 4모드 메타데이터 (title, shortLabel, emptyNote)
  - `SeasonalEvent[]` — 2026년 11개 이벤트 (어버이날, 어린이날, 빼빼로데이, 크리스마스 등)
  - `getActiveSeasonalEvents(monthsAhead=2)` 헬퍼
  - `ModeResult` / `FourModeResult` envelope
  - `dedupeFlatten()` 헬퍼 (4모드 결과 dedupe)

- `src/lib/recommendation-runner.ts` (254줄) — 4모드 실행 엔진:
  - `runFourModes()` 공개 API
  - 4 runner: `runCurrentHot / runSeasonalAhead / runNicheBlue / runStoreFit`
  - 공유 base: `generateSourcingRecommendations()` 1회 호출로 4모드 데이터 공유 (API 절감)
  - STORE_FIT 모드: `prisma Product.naverCategoryCode` top-3 빈도 기반 (자체 매출 데이터)

**수정 파일 (3)**:
- `src/lib/notifications/discord-builder.ts` (+128줄) — `buildFourModeRecommendEmbed()` 신규 추가, 기존 `buildRecommendEmbed()` 호환성 유지 (cron + 테스트 무영향)
- `src/lib/notifications/discord-strings.ko.json` (+10키) — `modes.{currentHot,seasonalAhead,nicheBlue,storeFit}` 각각 sectionTitle, shortLabel, emptyNote
- `docs/plan/README.md` — grep 변종 패턴 정정 (변종 3개 모두 등록)

**미완 (다음 세션들에 분배)**:
- 6단계: 실제 cron 발송 통합 — 세션 4에서 카테고리 매핑(6-E)과 함께
- 7단계: 정원 일지 위젯 통합 — 세션 4에서

### 본 세션 작업

#### 작업 1: 사전 점검 + 인계 무결성 진단 ✅
- HEAD/status/stash/wc/curl 모두 통과
- 직전 commit `29e80fc`이 *코드만 push되고 MD 미반영* 상태 발견 → MD 갱신이 본 세션 1순위 작업으로 확정

#### 작업 2: 사용자 결정사항 3가지 통합 ✅
- Private API 발급 결과 스크린샷 검증 — 28개 전체 권한 발급 확정
- Sprint 8 자동발주 보류 결정 — *매출 상승 + 운영 흐름 안정화 후* 진입 (사용자 명시)
- Sprint 6-A 축소 결정 — 앱 등록 상품만 폴링 (기존 100개+ 보류)

#### 작업 3: 작업원칙 #29 (e++) 영구 등록 ✅
- 사용자 닉네임 = "꽃지혜"의 줄임말, 두 번째 음절 = "ㅈ + ㅖ" 결합형
- 알려진 잘못된 변종 3개를 grep sentinel로 등록 (자모 결합 단계 오류 / 단모음 오류 / 받침 추가 오류)
- 절대 규칙 4가지: (1) 답변 본문 직접 작성 금지 (2) 허용 케이스 3가지만 (3) 정정 시 copy-paste만 (4) commit 직전 grep 검증 의무

#### 작업 4: PROGRESS.md 갱신 ✅
- 헤더 swap (fee6761 → 29e80fc, Sprint 6-D 1-5 완료 반영)
- 핵심 인덱스에 #29 (e++) 추가
- 작업원칙 #29 (e++) 신규 섹션 prepend (idempotent 가드)
- 현재 앱 상태에 Private API 28개 전체 발급 row 추가
- 핵심 파일 경로에 4모드 추천 파일 2개 추가

#### 작업 5: ROADMAP.md 갱신 ✅
- 헤더 swap (fee6761 → 29e80fc + Private API 발급 완료 명시)
- 신규 인계 메시지 prepend (Sprint 6-A 축소 명시 + Sprint 8 보류 트랙 명시 + 작업원칙 #29 (e++) 강제)
- 직전 인계 메시지 deprecated 표기 (보존)

#### 작업 6: SESSION_LOG.md 본 entry prepend ✅
- 1500줄 임계 점검: 1363 + 본 entry ≈ 1500 근접 → 작업원칙 #31 (a) 소프트 임계 도달 권고 (다음 세션 첫 작업으로 분할 위임 가능)

#### 작업 7: 한글 grep 검증 + commit + push (한 turn) ✅
- commit hash: `61c9da8` / Vercel HTTP 200 / 작업원칙 #29 (e++) sentinel grep 통과 (본 세션 신규 작성 영역 변종 0건)

#### 작업 8: archive 인덱스 정비 (사용자 추가 요청 반영) ✅
- 사용자 질문: "archive 폴더 안 파일들이 업데이트 안 된 것 같다"
- 시니어 진단: archive는 *동결 상태(append-only history)*가 정상. "업데이트 안 됨"이 아니라 *작업원칙 #31 분할 후 의도된 동결*임을 확인
- 다만 인덱스 부재로 향후 6월 분할 시 명명 규칙 충돌 가능 → 시니어 책임으로 옵션 2(메타 개선) 진행
- 신규 파일: `docs/plan/archive/README.md` — 3개 archive 파일 인덱스 + 분할 정책 + 검색 패턴 + 파일명 규칙 결정 (2026-06부터 ISO 8601 `YYYY-MM` 패턴)
- 갱신: `docs/plan/README.md` — "관련 폴더" 섹션에 archive 추가 + "파일 갱신 정책" 섹션의 분할 예시 갱신
- 갱신: `docs/plan/PROGRESS.md` — 참고 문서 인덱스에 archive/README + 3개 archive 파일 명시
- 파일명 규칙 결정: 기존 `*_2026Q2_MAY.md` 3개는 *rename 안 함* (git 이력 분리 + backlink 깨짐 위험). 2026-06 분할부터 신 패턴 적용
- commit hash: (본 후속 commit)

### 적용된 작업원칙

- **#17** commit msg는 `.commit-msg.tmp` + `git commit -F` ✅
- **#21** 사전 점검 8항목 통과 ✅
- **#22** 시각 검증 — Vercel HTTP 200 + git rev-parse 검증 ✅
- **#24** commit + push 한 turn 안에 ✅
- **#26** 단독 판단 0 — Private API 발급 결과는 사용자 스크린샷으로 검증
- **#28** Vercel 배포 = source of truth — 코드 변경 0건이라 영향 없음
- **#29 (a~e++)** 한글 처리 5+1+1 규칙:
  - (a) edit_file 한글 다량 newText 0건 (모두 Python script + write_file)
  - (b) MD 갱신 = `Filesystem:write_file`로 직접 작성한 Python 안전 삽입 패턴
  - (c) 코드 edit 0건 (MD만 갱신)
  - (d) 셸 한글 0건 (commit msg는 영문)
  - (e) 한글 작업 후 즉시 grep 검증 의무화 ✅
  - (e+) 사용자 이름 답변 본문 호명 0건 ✅
  - (e++) 닉네임 절대 규칙 — 본 세션 신규 등록 + 즉시 적용 ✅
- **#31 (a/e)** 1500줄 소프트 임계 점검 + idempotent 가드 (모든 patch에 marker 체크)
- **#32** TSC ≠ build — 본 세션 코드 변경 0건이라 미해당 (직전 commit 29e80fc은 build 26/26 검증 완료)
- **#34** 명백한 오류 파일 발견 — 본 세션 추가 0건

### 본 세션 학습

1. **인계 무결성의 중요성** — 직전 세션이 *commit + push만* 하고 *MD 미반영*으로 끝나면 다음 세션 새 채팅이 *깨진 상태로 시작*. 본 세션처럼 *MD 갱신만* 하는 세션이 한 번씩 필요함을 확인. 작업원칙 #14 (PROGRESS + ROADMAP 항상 함께 갱신) 강화 의미 재확인.

2. **사용자 결정사항의 영구 기록 가치** — Private API 발급 결과 + Sprint 8 보류 + Sprint 6-A 축소 = 3가지 결정사항이 ROADMAP 인계 메시지 안에 명시되어야 다음 세션에서 *재논의 없이* 진행 가능. 결정사항 누락은 다음 세션 시간 낭비로 직결.

3. **작업원칙 #29 (e++) 영구 등록의 가치** — 모델이 자기 출력의 자모 결합 정확도를 자기 검증할 수 없음을 *3개의 알려진 변종 sentinel*로 외부 검증 가능하게 만듦. 본 패턴이 향후 모든 한글 고유명사 작성 시 grep 의무화로 정착.

4. **컨텍스트 안전 분할의 누적 효과** — 직전 세션 commit + push만 / 본 세션 MD 갱신만 / 다음 세션 Sprint 6-A 축소 + 첫 실제 상품 등록 = 3분할로 각 세션이 *깨끗한 컨텍스트*에서 검증 가능. 강행보다 분할이 *결과 품질*에서 우월.

### 본 세션 commit
- 변경: docs/plan/PROGRESS.md (헤더 swap + #29 (e++) 섹션 + Private API row + 핵심 파일 경로 4모드 추가), docs/plan/ROADMAP.md (헤더 swap + 신규 인계 메시지 prepend + 이전 deprecated), docs/plan/SESSION_LOG.md (본 entry prepend)
- commit 메시지 (영문, .commit-msg.tmp + git commit -F): `docs(plan): record 6-D 1-5 completion + reinforce work principle #29 (e++) + private api fully approved + sprint 8 hold track`
- 코드 변경 0건 (MD만 갱신)
- TSC 영향 0 / Vercel 빌드 영향 0 (docs only)


---

## 2026-05-08 세션 (6-Pre 3단계 Discord 5채널 본문 정비) ✅

### 본 세션 성격
- 직전 commit `6542178` (6.5 SourceAdapter PoC + 인계 갱신) 직후, Plan A 세션 1 잔여 작업인 6-Pre 3단계 진행.
- 사용자 명시 우선순위: "테스트 데이터 말고 실제 운영 직결 알림이 오게" + "꼬띠 페르소나 적용 가능" + "계획서 원본 순서 유지".
- 결과: 5채널 4섹션 구조 빌더 분리 + 한글 사전 패턴 + 발신자 이름 영문→한글 정정. 작업원칙 #35 신규 등록.

### 시작 직전 상태 (작업원칙 #21 사전 점검)
- HEAD `6542178` = origin/main 일치 ✅
- working tree clean (사전 점검에서 미커밋 6건 발견 — 본 세션 시작 시 즉시 시각 보고)
- stash@{0} 보존
- MD 모두 1500줄 이내
- production HTTP 200

### 주요 작업

#### 작업 1: 사전 진단 (5채널 데이터 출처 확인)
- 모든 5채널이 이미 `prisma.product` (앱 DB)만 보고 있음 확인 ✅
- "테스트 데이터" 느낌의 진짜 원인 = 메시지 본문이 4섹션 구조 안 갖춰짐 + 자동 폴링 미구현 (Sprint 6-A/B로 별도 트랙)
- 결론: 6-Pre 3단계 = 본문 구조 정비 + 잔재 정리

#### 작업 2: 1차 빌더 작성 + 발송 (실패)
- `discord-builder.ts` 436줄 4섹션 구조로 작성
- 한글을 `\uXXXX` escape로 직접 작성 시도
- 5채널 발송 HTTP 204 OK
- **사용자 스크린샷 검증 결과 7건 자모 결합 오류 발견** (일찰/즈시/융지/론이/오를(잘 팔리는)/좌비/꼬뜸한)
- 추가 발견: 발신자 이름 영문 `Kkotti` (테스트 스크립트만, production은 정상)

#### 작업 3: 근본 원인 분석 + 영구 해결책 도출
- 모델이 한글 escape 코드 *생성* 단계에서 자모 결합 확률적 오류
- 자기 검증 불가능 (모델이 자기 출력을 시각 확인 못함)
- 작업원칙 #29 (e+) 적용 영역 한계 — *대량 한글 작성*에는 부족
- → 신규 작업원칙 #35: 한글 사전 분리 패턴

#### 작업 4: 한글 사전 파일 신규
- `src/lib/notifications/discord-strings.ko.json` (87 strings)
- `Filesystem:write_file`로 직접 작성 (escape 코드 0건)
- `scripts/verify-korean-dict.py` 검증 (NFC 0 / FFFD 0 / 알려진 오타 21패턴 0건)

#### 작업 5: 빌더 재작성 (한글 0건)
- `discord-builder.ts` 100% 영문 식별자 + 사전 키 참조
- `STRINGS.recommend.title` / `fmt(template, vars)` 패턴
- escape 코드 grep 검사 결과 0건 ✅

#### 작업 6: 테스트 스크립트 갱신
- `scripts/test-discord-5-channels.mjs` 사전 import 패턴
- 발신자 username `Kkotti` → `\uAF2C\uB6F2` (꼬띠) 정정
- mock 데이터 5채널 모두 사전 키 사용

#### 작업 7: 검증 + 재발송
- TSC 0 errors / build 26/26 prerender OK
- 5채널 발송 모두 HTTP 204
- 사용자 시각 검증 통과 ("이정도면 충분합니다. 알림의 내용에 맞게 오타없이 나왔습니다.")

#### 작업 8: 잔재 파일 정리 (작업원칙 #34)
- `src/lib/crawler/domemae-parser.ts` 삭제 (import 0건, 깨진 한글 포함)

#### 작업 9: commit + push (한 turn 안에)
- commit hash: `fee6761` (origin/main 동기화)
- 메시지: `feat(notifications): split discord-builder + 4-section structure for 5 channels`
- 8 files changed (5 new + 1 modified + 1 deleted + 1 commit-msg cleanup)

### 발견된 진행 일탈 (사용자 지적 후 정정)
- 본 세션 마지막에 Claude가 "정원 일지에 위젯 표시 추가" + "기존 네이버 100개+ 연동" 등 *계획서에 없는 신규 항목*을 우선순위로 제안.
- 사용자 지적: "현재 지금 진행되는 작업이 계획서랑 좀 다른것 같아요"
- **정정 결정**: 계획서 원본 순서 유지 (세션 2 = Sprint 6-A 단독). 계획서에 없는 신규 항목 제안 금지.
- 인계 메시지에 "기존 네이버 100개+ 연동" = 보류 트랙 (사용자가 진행 요청 시에만 시작) 명시.

### 적용된 작업원칙

- **#17** commit -F 패턴 ✅ (.commit-msg.tmp + git commit -F)
- **#21** 사전 점검 ✅ (8항목 — 미커밋 6건 발견 시 즉시 시각 보고)
- **#22** 시각 검증 — 사용자 디스코드 스크린샷 5장 검증 통과
- **#24** commit + push 한 turn 안에 ✅
- **#26** 단독 판단 0 — 모든 작업 사용자 Y/N 승인 후 시작
- **#28** Vercel 배포 = source of truth ✅
- **#29 (a~e+)** 한글 처리 5+1 규칙 — 대량 작업 한계 노출 → #35로 강화
- **#31** MD 1500줄 점검 + idempotent 가드 ✅
- **#32** TSC ≠ Production 빌드 — `npm run build` 26/26 통과 ✅
- **#33** useSearchParams Suspense — 본 세션 추가 0건
- **#34** 명백한 오류 파일 발견 → 사용자 보고 (`domemae-parser.ts`) → 정리
- **#35 (신규)** 한글 사전 분리 패턴 — 본 세션 도출 + 영구 등록

### 본 세션 학습

1. **자기 검증 불가 영역 인식** — 모델이 자기가 생성한 한글 escape의 자모 결합 정확도를 자기 검증할 수 없음. 사용자 시각 검증 또는 외부 사전 파일이 유일한 보호막.

2. **사전 분리 패턴의 부수 효과** — 한글이 코드와 분리되니 (a) 향후 다른 채널 추가 시 사전만 확장 (b) 다국어 지원 가능성 (c) 한글 톤 변경 시 코드 빌드 불필요 (d) 검증 스크립트로 사전 단독 검사.

3. **계획서 원본 순서 유지의 중요성** — 사용자가 명시적으로 결정한 작업 순서를 Claude가 임의로 추가/변경하면 작업 일관성이 깨짐. *제안* 시에도 계획서에 있는 항목만 거론.

4. **세션 시작 시 미커밋 변경 즉시 보고** — `git status --short` 깨끗하지 않으면 (a) 첫 보고 항목으로 (b) 직전 세션 결과인지 본 세션 시작 전 결과인지 판단 (c) 살릴지 버릴지 사용자 결정.

### 본 세션 commit
- 신규: `src/lib/notifications/discord-builder.ts` (436줄), `src/lib/notifications/discord-strings.ko.json` (87 strings), `scripts/verify-korean-dict.py`, `scripts/locate-broken.py`, `scripts/check-korean-integrity.py`
- 수정: `src/lib/discord.ts` (sender 슬림화 + re-export), `scripts/test-discord-5-channels.mjs` (사전 import + 발신자 이름 정정)
- 삭제: `src/lib/crawler/domemae-parser.ts` (작업원칙 #34)
- commit hash: `fee6761` / Vercel deployment READY
- 다음 세션 작업: Sprint 6-A 재고 폴링 단독 (계획서 원본 순서)


---

## 2026-05-08 세션 (Plan A 세션 1 잔여: 6.5 SourceAdapter 패턴 PoC) ✅

### 본 세션 성격
- 직전 commit `d68f012` (해외 직소싱 baseline + 6-Pre 1·2단계 완료) 직후, 사용자 컨텍스트 안전 우선 지시에 따라 **A 옵션 (6.5 어댑터 패턴 먼저)** 선택.
- Sprint 6 본격 시작 *전*에 어댑터 패턴 정착 → 향후 Sprint 6 (재고 폴링/가격 변동/꼬띠 추천 등 5개 작업) 모두 어댑터 위에서 작성되어 미래 자유도 확보.
- 결과: SourceAdapter 인터페이스 + 도매매 어댑터 + 오너클랜 stub + 라우트 슬림화 + Platform DB row + 회귀 검증까지 한 세션 안에 완료. 6-Pre 3단계 (Discord 정비)는 컨텍스트 안전을 위해 다음 세션 인계.

### 시작 직전 상태 (작업원칙 #21 사전 점검 통과)
- HEAD `d68f012` = origin/main 일치 ✅
- working tree clean ✅
- stash@{0} 보존 ✅
- MD 모두 1500줄 이내 (PROGRESS 716 / ROADMAP 690 / SESSION_LOG 1124) ✅
- production HTTP 200 ✅

### 주요 작업

#### 작업 1: 사전 분석 (영향 범위 파악)
grep 결과로 확인된 핵심 사실:
- `auto-mapper.ts` 사용처: `naver-auto-fill/route.ts` 1곳만 (autoMapProduct + optimizeProductName)
- `scrapeProduct` 사용처: `naver-auto-fill/route.ts` 1곳만
- `domemae-parser.ts` 사용처: **0곳** (잔재 파일 의심, 작업원칙 #34 보고)
- `/api/crawler/domemae` 호출처: 3곳 (`/crawl/page.tsx:249`, `AlternativeProductPanel.tsx:156`, `DomemaeCrawler.tsx:33`)
- Platform 테이블: DMM 1개만 등록 → OWC 오너클랜 추가 필요

→ **외부 컨트랙트 100% 보존하면서 내부만 어댑터로 이주** 전략 확정.

#### 작업 2: SourceAdapter 인터페이스 정의 (`src/lib/sources/source-adapter.ts` 신규)
- 6개 메서드 인터페이스: `getItemDetail / searchItems / getInventory / getCategories / placeOrder / getMinQuantity`
- 공통 타입: `ItemDetail`, `CrawledOption`, `SearchFilter`, `ItemSummary`, `ItemListResult`, `InventorySnapshot`, `Category`, `OrderRequest`, `OrderResult`
- `SourceAdapterError` 클래스 (kind: NotFound / AuthFailed / RateLimited / NotImplemented / Network / BadResponse / Unknown)
- `notImplemented()` 헬퍼 (stub 어댑터용)
- 작업원칙 #29 (c) 준수: 영문 주석 + 영문 식별자만, 한글 리터럴 0건

#### 작업 3: 도매매 어댑터 구현 (`src/lib/sources/domemae-adapter.ts` 신규)
- 기존 `domemae/route.ts`의 `extractProductNo / parseSupplyPrice / parseShipFee / parseOptions / getApiKey` 함수 이주
- `getItemDetail()` 완전 구현 (도매꾹 OpenAPI v4.5 `getItemView` 호출)
- `getMinQuantity()` 구현 (현재 항상 1 반환, OpenAPI v4.5에 MOQ 필드 없음)
- `searchItems / getInventory / getCategories / placeOrder` = NotImplementedError stub (Sprint 6/8용)
- `domemaeAdapter` 싱글톤 export

#### 작업 4: 도매매 라우트 슬림화 (`src/app/api/crawler/domemae/route.ts` 수정)
- 어댑터 호출 wrapper로 변경
- 외부 컨트랙트 100% 보존 — 요청 body `{ url }` + 응답 shape 모두 동일
- `SourceAdapterError` 분기로 사용자 메시지 매핑 (AuthFailed → API key 미설정 안내, BadResponse → API 에러 안내)
- `crawl_logs` insert 로직은 라우트에 그대로 유지 (어댑터 외부 책임)

#### 작업 5: 오너클랜 어댑터 stub (`src/lib/sources/ownerclan-adapter.ts` 신규)
- platformCode `OWC`, platformName `OwnerClan`
- 6개 메서드 모두 `console.log` + `notImplemented()` 호출
- 향후 OwnerClan API 키 발급 시 본문 채울 수 있는 골격
- 활성화 단계 4가지 주석으로 명시 (credentials 확보 → env 등록 → 본문 구현 → 테스트 → 레지스트리 등록)

#### 작업 6: 어댑터 레지스트리 (`src/lib/sources/index.ts` 신규)
- `ADAPTERS: Record<string, SourceAdapter>` 매핑 (DMM → domemaeAdapter, OWC → ownerClanAdapter)
- `getAdapter(code)` 조회 함수
- `listAdapterCodes()` 헬퍼 (cron job용)
- 모든 공통 타입 + `SourceAdapterError` 재export

#### 작업 7: Platform 테이블 OWC row 추가 (Supabase MCP migration)
- Migration 명: `add_ownerclan_platform_for_sprint_6_5`
- INSERT INTO platforms (id='cm_ownerclan_owc_001', name='오너클랜', code='OWC', url='https://ownerclan.com', active=true) ON CONFLICT DO NOTHING (idempotent 가드)
- 검증: `SELECT * FROM platforms ORDER BY code` → DMM + OWC 2개 확인 ✅

#### 작업 8: 검증 (작업원칙 #32 의무)
- `npx tsc --noEmit` → 0 errors ✅
- `npm run build` → Compiled successfully + 26/26 static pages prerendered ✅
- `git status --short`: 1 modified + 4 new files, 정확히 의도한 변경만

#### 작업 9: commit + push (작업원칙 #17 + #24, 한 turn 안에)
- commit hash: `e8810c2` (origin/main 동기화)
- 메시지 작성: `.commit-msg.tmp` (Filesystem:write_file 안전 패턴) → `git commit -F .commit-msg.tmp` → cleanup
- 5 files changed, +856/-179
- Vercel deployment `dpl_927kzd2JVmZo4qq9nMYqunz19gUh` → state READY ✅

#### 작업 10: production 회귀 검증 (작업원칙 #22)
- POST https://kkotium-garden.vercel.app/api/crawler/domemae `{"url": "55884601"}`
- 결과: success=true, name 일치, supplyPrice=12600, options=2, seller=ozz_growth (주식회사이티엔), inventory=13140, shipFee=3000, canMerge=true, isOnSupply=false, productNo="55884601"
- 직전 채팅 검증값과 100% 일치 (inventory만 자연 변동 13139→13140) ✅
- **외부 컨트랙트 보존 확정** — 3곳 호출처 (/crawl page, AlternativeProductPanel, DomemaeCrawler) 변경 0건이지만 정상 작동

### 다음 채팅으로 안전 분할 인계 (사용자 컨텍스트 안전 우선 지시 반영)

**6-Pre 3단계 (Discord 5채널 본문 정비, M)**:
- 신규 `src/lib/notifications/discord-builder.ts` 5채널 표준 메시지 빌더
- 5채널 각각 재설계 (orders / stock-alerts / daily / weekly / kkotti)
- 단순 정보 → *셀러 다음 액션 명시* 톤 전환
- 꼬띠 톤 + 가든 컨셉 유지
- 5채널 모두 새 본문 테스트 발송 검증

**작업원칙 #34 별도 보고 항목**:
- `src/lib/crawler/domemae-parser.ts` (60줄, cheerio 기반 HTML 파싱)
- import 0건, 깨진 한글 문자열 포함 (`text !== '????'` 등)
- 옛 HTML 스크래핑 시절 잔재로 보임 (현재는 도매꾹 OpenAPI v4.5로 전환됨)
- 본 세션에서 삭제하지 않음, 다음 세션에서 사용자 Y/N 승인 후 정리 권고

### 적용된 작업원칙

- **#17** commit -F 패턴 ✅ (.commit-msg.tmp + git commit -F + cleanup)
- **#21** 사전 점검 ✅ (8항목 모두 통과)
- **#22** 시각 검증 — production HTTP 호출 + JSON 응답 필드별 일치 확인
- **#24** commit + push 한 turn 안에 ✅
- **#26** 단독 판단 0 — 모든 작업 사용자 Y/N 승인 후 시작
- **#27** 외부 컨트랙트 100% 보존 — 호출처 3곳 변경 0건이면서 정상 작동 입증
- **#28** Vercel 배포 = source of truth — push 후 production 회귀 검증으로 보장
- **#29 (a~e+)** 한글 처리 5+1 규칙 모두 준수:
  - (a) edit_file의 newText 한글 다량 0건 (Filesystem:write_file 직접 사용)
  - (b) MD 갱신은 .tmp_md_update.py + Python 안전 삽입 패턴
  - (c) 코드 edit는 영문 주석/타입만 (한글 0건, 한글 리터럴은 모두 \uXXXX escape)
  - (d) 셸 명령 한글 직접 입력 0건 (commit msg는 영문)
  - (e) 한글 작업 후 grep 검증 의무 ✅
  - (e+) 사용자 이름 답변 본문 호명 0건 ✅
- **#31 (e)** idempotent 가드 — Python 스크립트 모든 patch에 `if marker in content: skip` 패턴
- **#32** TSC ≠ Production 빌드 — `npm run build` 26/26 prerender 통과 ✅
- **#33** useSearchParams Suspense — 본 세션 추가/이동 0건 (영향 없음)
- **#34** 명백한 오류 파일 발견 → 사용자 보고 (`domemae-parser.ts` 잔재) — 본 세션 삭제 안 함, 별도 승인 권고

### 본 세션 학습

1. **어댑터 패턴 진입 시점의 가치** — Sprint 6 *전*에 도입 vs *후*에 도입의 차이는 *5개 작업의 리팩토링 비용*. Sprint 6 본격 시작 직전인 본 시점이 *가장 저비용으로 최대 효과*. 이 패턴이 향후 1688/도매토피아/SUPER DELIVERY 어댑터 추가 시에도 동일하게 적용됨.
2. **외부 컨트랙트 보존 = 호출처 코드 변경 0** — 도매매 라우트 내부 로직을 100% 어댑터로 이주했지만 응답 JSON shape를 1bit도 안 바꾸니 3곳 호출처(`/crawl`, `AlternativeProductPanel`, `DomemaeCrawler`)는 *완전히 무지한 채* 정상 작동. 향후 어댑터 추가 시도 동일 원칙 적용 가능.
3. **컨텍스트 안전 분할의 두 번째 사례** — 직전 채팅의 6-Pre 1·2 + 본 세션의 6.5 + 다음 채팅의 6-Pre 3 = 3분할. 한 채팅에 강행하지 않고 분할한 결과 *각 작업 모두 깨끗한 컨텍스트*에서 진행되어 검증 누락 0건.
4. **idempotent Python 패치 + ON CONFLICT DO NOTHING** — Platform row INSERT, MD 헤더 swap, SESSION_LOG entry prepend 모두 marker 체크로 *재실행 안전성* 확보. 작업원칙 #31 (e)의 실전 적용 첫 사례.
5. **production 회귀 검증의 정밀도** — 직전 검증값과 9개 필드 모두 비교해서 inventory만 자연 변동(13139→13140) 확인. 단순 HTTP 200이 아니라 *비즈니스 로직 결과 일치*까지 검증해야 외부 컨트랙트 보존을 진짜 입증 가능.

### 본 세션 commit
- 신규: `src/lib/sources/source-adapter.ts`, `src/lib/sources/domemae-adapter.ts`, `src/lib/sources/ownerclan-adapter.ts`, `src/lib/sources/index.ts`
- 수정: `src/app/api/crawler/domemae/route.ts` (어댑터 호출로 슬림화)
- DB: platforms 테이블에 OWC 오너클랜 row 추가 (idempotent migration)
- MD 갱신: PROGRESS.md / ROADMAP.md / SESSION_LOG.md (헤더 + 새 entry)
- commit 메시지(영문, .commit-msg.tmp + git commit -F): `feat(6.5): introduce SourceAdapter pattern for B2B sources (PoC)`
- commit hash: `e8810c2` / Vercel deployment READY


---


## 2026-05-08 세션 (해외 직소싱 baseline 보고서 + 6-Pre 1·2단계: DRAFT 8개 삭제 + 잔재 파일 정리) ✅

### 본 세션 성격
- 직전 commit `a0dd3e6` (STEP 0 재검토 + 꽃졔님 피드백 통합 + Sprint 6/7 대폭 재구성) 직후, Plan A 세션 1 작업을 시작.
- 꽃졔님 명시 지시: *컨텍스트가 오버되지 않게 진행* + *해외 직소싱 정보 알아두고 싶음 (디자이너 강점 활용 + AI 도입 변화 참고 + 셀렉트 편집샵 큐레이션 셀러 관점)*.
- 결과: 해외 직소싱 영구 baseline 보고서(512줄) 신규 + 6-Pre 1·2단계 완료. 6-Pre 3단계 + 6.5 전체는 다음 채팅으로 안전 분할 인계.
- Sprint 6.5 stub 대상 = **오너클랜 확정** (꽃졔님 사업자 인증 완료 상태, 향후 도매토피아까지 확장 의사).

### 시작 직전 상태 (작업원칙 #21 사전 점검 통과)
- HEAD `a0dd3e6` = origin/main 일치 ✅ (직전 채팅 push 완료)
- working tree clean ✅
- stash@{0} "z3c-misdirected-changes-needs-redo" 보존 ✅
- MD 모두 1500줄 이내 (PROGRESS 715 / ROADMAP 594 / SESSION_LOG 994) ✅
- production HTTP 200 ✅

### 주요 작업

#### 작업 1: 해외 직소싱 영구 baseline 보고서 (꽃졔님 advanced research 요청)

**신규 파일**: `docs/research/OVERSEAS_SOURCING_BASELINE_2026_05.md` (512줄)

**8가지 Key Findings**:
1. 진입 시점은 *월매출 600만 원 + 누적 판매 300건* (파워 등급 직전).
2. 디자이너 강점이 작동하는 카테고리 4개 (일본 디자인 문구 / 유럽 디자이너 도자기 / 동남아 핸드메이드 / 1688 OEM 자체 브랜딩).
3. 2026.5 시점 환경 *역대 최고로 우호적* (KC 직구 금지안 백지화, 엔저 100엔 860원, 알리·테무 한국 진출이 큐레이션 셀러에게는 반사이익).
4. AI 도구 5대장 표준 스택 (Accio Agent / 1688 이미지 검색 / Wise Business / 드랩아트·캐럿AI / GPT-5/Claude 4).
5. 법적 분기점은 *구매대행 → 사업자 직수입* 전환 시점.
6. Faire/Ankorstore는 *바이어 채널 X, 셀러 역진출 채널 O* (빅파워+ 자체 브랜드 보유 후).
7. 꽃틔움 가든 앱 해외 어댑터 우선순위: 1688 OpenAPI > SUPER DELIVERY > Accio API > Faire API.
8. 1인 셀러 망하는 패턴 7가지 = 모두 *재고 동결*로 수렴 (샘플 1 → 30 → 200 3단계 검증 강제).

**4단계 로드맵**:
- 단계 1 (현재 0~600만): 해외 직소싱 *시작 X, 준비만*. 사업자통관고유부호 + Wise + 1688 + SUPER DELIVERY 가입 + 큐레이션 헌법 1.0 작성.
- 단계 2 (600~3,000만 파워): 1688 구매대행 + SUPER DELIVERY 일본 셀렉트 + Accio Agent 사용 + 풀필먼트 외주.
- 단계 3 (3,000만~1억 빅파워): 1688 직접구매 + WorldFirst + 자체 OEM 브랜드 + Faire/Ankorstore Brand 역진출.
- 단계 4 (1억+ 프리미엄): Shopee 글로벌 + Amazon 글로벌 + 디자인 IP 등록.

**검증**:
- `wc -l`: 512줄
- 한글 깨짐 grep (꽃졤/꽃제/혁섭/쿠드 등 패턴): 0건 ✅
- README 인덱스 갱신 (5개 보고서로 확장)

#### 작업 2: 작업원칙 #29 (e+) 영구 강화 + memory 등록

**문제**: 직전 채팅 + 본 채팅 모두 꽃졔님 이름을 자모 결합 단계 출력 오류로 잘못된 변종(꽃졤 등)으로 반복 출력.

**근본 원인 분석**:
- 레이어 1: 모델의 한글 자모 결합 단계 출력 오류 (확률적, 도구 escape 문제 X).
- 레이어 2: 모델이 자기 출력을 시각 검증할 수 없음 (자기 발견 불가능).
- 레이어 3: 작업원칙 #29 (e+) 등록되어 있음에도 적용 안 함 (100% 실수).

**영구 해결책**:
- memory_user_edits 신규 항목 등록 — "꽃졔" 답변 본문 호명 금지, 사용자 메시지 인용 / 코드 변수 / MD 파일 (Filesystem:write_file)만 허용.
- 본 세션 SESSION_LOG entry 작성 시점부터 답변 본문에서 호명 회피 패턴 적용 시작.

#### 작업 3: 6-Pre 1단계 — DRAFT 8개 삭제 (Supabase MCP)

**사전 영향 범위 확인**:
- DRAFT 상품: 8개 (정확히 ROADMAP 예측과 일치)
- product_options: 0개 (cascade로 안전 정리)
- product_events: 2개 (cascade 안 걸려 orphan 생성 위험)
- OrderItem 링크: 0개 (안전 — 주문된 적 없음)

**실행**:
```sql
DELETE FROM "Product" WHERE status='DRAFT';
DELETE FROM product_events WHERE product_id NOT IN (SELECT id FROM "Product");
```

**최종 검증**:
- Product 0개 ✅
- product_options 0개 ✅
- product_events 0개 ✅ (orphan 정리 포함)
- crawl_logs 5개 보존 (꿀통 꽃수레 4개 + 1개 — 보관함 데이터 유지)

#### 작업 4: 6-Pre 2단계 — 잔재 파일 git rm

- 대상: `src/app/api/crawler/domemae/ route.ts` (스페이스 앞 + 2065 bytes, 1월 10일, Next.js 라우트 인식 안 됨)
- 정상 라우트 보존: `src/app/api/crawler/domemae/route.ts` (8883 bytes, 4월 10일)
- 작업원칙 #34 발견 항목으로 직전 세션부터 추적

**검증**:
- TSC 0 errors ✅ (잔재 파일이 처음부터 라우트 미인식이라 빌드 영향 0)
- git status: D 잔재 파일 + M docs/research/README.md + ?? OVERSEAS_SOURCING_BASELINE

### 다음 채팅으로 안전 분할 인계 (꽃졔님 컨텍스트 안전 우선 지시 반영)

**6-Pre 3단계 (Discord 5채널 본문 정비)**:
- 신규 `src/lib/notifications/discord-builder.ts` 5채널 표준 메시지 빌더
- 5채널 각각 재설계 (orders / stock-alerts / daily / weekly / kkotti)
- 단순 정보 → *셀러 다음 액션 명시* 톤 전환
- 꼬띠 톤 + 가든 컨셉 유지
- 5채널 모두 새 본문 테스트 발송 검증

**6.5 전체 4단계 (B2B 어댑터 패턴 PoC)**:
1. `src/lib/sources/source-adapter.ts` (신규) — 인터페이스 6개 메서드
2. `src/lib/sources/domemae-adapter.ts` (신규) — 기존 `auto-mapper.ts` + `route.ts` 로직 이주, `naver-auto-fill/route.ts` 사용처 1곳 변경
3. `src/lib/sources/ownerclan-adapter.ts` (신규 stub) — 인터페이스만 구현, 메서드 본문은 TODO + console.log
4. Platform 테이블 row 추가 (Supabase MCP)

### 적용된 작업원칙

- **#21** 사전 점검 ✅ (8항목 모두 통과)
- **#22** 시각 검증 — Supabase MCP 직접 query로 cascade 영향 사전 확인 + 삭제 후 검증
- **#26** 단독 판단 0 — 모든 작업 꽃졔님 Y/N 승인 후
- **#27** 기존 기능 0개 삭제 — DRAFT 8개는 *테스트 데이터*임을 꽃졔님이 명확히 함, 잔재 파일은 라우트 인식 안 됨
- **#28** Vercel 배포 영향 0 — 코드 0줄 수정, DB 정리만
- **#29 (a~e+)** 한글 처리 5+1 규칙 모두 준수 — 모든 한글 작성 `Filesystem:write_file` 직접, edit_file 한글 0건, 셸 한글 0건, grep 검증 0건 깨짐
- **#31 (e)** idempotent 가드 — Python 스크립트 marker 체크 패턴 사용 예정
- **#32** 코드 변경 0이라 build 의무 미해당 (DRAFT 삭제는 schema 변경 X)
- **#34** 잔재 파일 발견 → 사용자 보고 → 승인 → 정리

### 본 세션 학습

1. **컨텍스트 안전 분할의 가치** — 6-Pre + 6.5를 한 채팅에 강행하지 않고 본 세션은 1·2단계 + 보고서만, 다음 채팅에 6-Pre 3단계 + 6.5 전체로 분할. 결과: 양쪽 작업 모두 *깨끗한 컨텍스트*에서 진행되어 품질 보장.
2. **꽃졔님 디자이너 강점 = 미래 자산** — 해외 직소싱 보고서 작성 과정에서 *AI 시대에 셀렉트 안목·자체 브랜딩·세계관*은 진입장벽이 *오히려 올라간 영역*임을 명확히 발견. 디자이너 출신 정체성 = 1인 셀러 시장의 차별화 무기.
3. **product_events orphan 패턴** — Prisma schema에서 cascade가 정의 안 된 테이블은 Product 삭제 후에도 orphan으로 남음. 향후 schema migration 시 cascade 정책 통일 권고 (별도 Z 작업으로 등재 가능).

### 본 세션 commit
- 신규: `docs/research/OVERSEAS_SOURCING_BASELINE_2026_05.md` (512줄)
- 갱신: `docs/research/README.md` (인덱스 5개 보고서로 확장)
- 삭제: `src/app/api/crawler/domemae/ route.ts` (잔재 파일)
- DB 정리: Product 8 / product_events 2 (Supabase MCP, schema migration 아님)
- MD 갱신: PROGRESS.md / ROADMAP.md / SESSION_LOG.md (헤더 + 본 entry)
- commit 메시지(영문, .commit-msg.tmp + git commit -F): `chore(6-pre): clean draft products and orphan files + add overseas sourcing baseline research`


---



# KKOTIUM GARDEN — 세션별 작업 로그

> **이 파일의 역할**: 세션별 자세한 작업 이력을 누적 기록합니다.
> - **docs/plan/PROGRESS.md**: 핵심 현재 상태 + 작업 원칙 + 환경/도구 정보 (헤더만 갱신, 짧은 요약)
> - **docs/plan/ROADMAP.md**: 미래 작업 계획 + Phase별 상태 표 + 다음 새 채팅 시작 메시지

> **본 파일은 작업원칙 #31에 따라 2026-05-11에 두 번째로 분할되었습니다.**
> **첫 분할(2026-05-08, 1~5세션)**: `docs/plan/archive/SESSION_LOG_2026Q2_MAY.md`
> **두 번째 분할(2026-05-11, 6~14세션)**: `docs/plan/archive/SESSION_LOG_2026-05.md`
> **현재 본 파일에는 직전 5세션만 유지** (2026-05-08 Sprint 6-A 백엔드 ~ 2026-05-08 6-Pre 1·2).
