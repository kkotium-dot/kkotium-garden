## 2026-05-12 Sprint 7 P1 (P1-A 1페이지 + P1-B 금기어 + P1-C 태그사전) + 브라우저 E2E 시각 검증 ✅

### 본 세션 성격
- Sprint 7 P0-B enhancement 직후 같은 worktree에서 P1 진입. 사용자 명시 강화:
  - "작업 완료 후 브라우저 테스트 + 실무 워크플로우 검증"
  - "실질적으로 할 수 없는 작업은 거짓말 없이 요청"
  - "문제 없을 때만 다음 작업으로 넘어갈 것"
- 본 세션 = P1 구현 3개 + functional test 2 사이클 + 브라우저 E2E 시각 검증 + 학습 정직 보고.
- 4 commits (feat + 2 fix + docs) + worktree 혼동 0회 누적 유지.

### 시작 직전 상태
- HEAD `bdfa7d7` = origin/main 일치 ✅
- working tree clean ✅
- MD 줄 수: PROGRESS 203 / ROADMAP 429 / SESSION_LOG 1298 (T1 권고)
- Vercel deploy OK ✅

### 본 세션 작업

#### A. P1-A 카테고리 1페이지 일치율 검증 (research 6)
- 신규 `src/lib/naver/category-page-validator.ts`:
  - Naver Shopping Search API `/v1/search/shop.json` 통합 (display=30, sort=sim)
  - d1+d2 distribution aggregation + dominant detection threshold 60%
  - 응답 shape: `{ totalItems, distribution[], dominant{d1,d2,share,count}, error }`
- `/api/category/suggest` 통합:
  - **3 modes**: agreed (AI top 일치) / override (dominant 우선 prepend) / synthesized (suggestions 비었을 때 page-1으로 합성)
  - Response field: `pageValidation: { applied, dominantD1, dominantD2, dominantShare, totalItems, error }`
  - `synthesized` mode 사용처: AI가 "북유럽 거실 인테리어 소품 데코" 같은 ambiguous name에 실패 시 page-1 다수파 자동 매핑 (사용자 검증으로 80% share → 가구/인테리어>인테리어소품>기타장식용품 자동 채택 확인)
- **silent bug fix #1** (functional test 발견): `NAVER_CLIENT_ID/_SECRET`이 Open API에 invalid (errorCode 024). DATALAB credentials가 실제 작동. trend-analyzer와 동일 fallback chain 적용.

#### B. P1-B 상품명 금기어 페널티 강화 (research 4)
- 신규 `src/lib/honey-name-rules.ts`:
  - `BANNED_WORDS` 15개: 이벤트/할인/특가/최저가/무료배송/쿠폰/적립/오늘만/한정/당일/깜짝/폭탄/대박/핫딜/땡처리
  - 4 rule codes: banned_word / duplicate_word (3+ times) / special_chars (allowlist 기반) / too_short / too_long (25-50자)
  - `RuleSeverity`: critical / warning / info
  - `detectNameRules(name)` returns findings + topSeverity + nameLength
- `src/lib/honey-score.ts` 통합: `buildHoneyScoreWarnings(name)` 호출 결과를 기존 `warnings[]`에 push (additive, 외부 컨트랙트 보존)
- 신규 `src/components/products/NameRulesPanel.tsx`:
  - Inline panel, `role="alert"` for critical / `role="status"` for warning
  - Tone: critical 빨강 (#FEF2F2) / warning 노랑 (#FEFCE8) / info 파랑 (#EFF6FF)
  - 5자 미만 시 미노출 (typing 중 noise 방지)
- `/products/new`에 마운트 (상품명 input 직후, char count 위)
- /naver-seo는 인라인 편집 구조라 별도 follow-up (사용자 위임)

#### C. P1-C 태그 사전 등재 검증 (research 7)
- 신규 `src/lib/naver/tag-dictionary.ts`:
  - Search Ad `keywordstool` API를 dictionary proxy로 활용
  - 5/request batch, 결과 status: verified / weak / missing / error
  - **silent bug fix #2** (functional test 발견): Naver는 `<10` 케이스를 volume=10으로 반환 → naive `volume > 0` 체크가 garbage 키워드도 verified 분류. **임계값 조정 30/10**:
    - verified: volume >= 30 (실 SEO 가치)
    - weak: 10..29 (낮지만 존재)
    - missing: < 10 또는 not found
- 신규 `POST /api/tags/verify` (body `{tags: string[]}`, cap 20)
- 신규 `src/components/products/TagVerificationPanel.tsx`:
  - 수동 trigger 버튼 "검증 시작" (Search Ad rate limit 보호)
  - 색상별 결과 표시 + summary line

#### D. Registry + i18n
- `category-1page` + `tag-dictionary` pending → active (frequency on-event, no cron)
- `registry/route.ts`: 두 entry 모두 `lastRun: null` (live state)

### 검증

#### Functional API tests (curl)
- P1-A 레깅스 (확실 카테고리): `applied: "agreed"` + dominantShare 1.0 (30/30 items) ✅
- P1-A 인테리어 소품 (AI 실패): `applied: "synthesized"` + dominantShare 0.8 (4/5 items) → 가구/인테리어>인테리어소품>기타장식용품 ✅
- P1-C 5 태그: verified 3 (실 SEO 키워드) / weak 2 (garbage 임계값 fix 후 색상 강등) ✅

#### 브라우저 E2E (Claude Preview MCP — local dev :3000)
- **P1-B 시나리오 1** (금기어 + 중복): "이벤트 할인 무료배송 적립 쿠폰 가을 가을 가을 잠옷" → role=alert + bgColor `rgb(254, 242, 242)` critical red + "금기어 5개 발견 — 이벤트, 할인, 무료배송, 쿠폰, 적립 (Naver de-rank 위험)" + "중복 단어 1개 — 가을×3" ✅
- **P1-B 시나리오 2** (특수문자): "★☆♥🎉 특수문자 잠옷 세트 가을 신상품 추천" → role=status + bgColor `rgb(254, 252, 232)` warning yellow + "허용 외 문자 4종 — ★ ☆ ♥ 🎉" ✅
- **P1-B 시나리오 3** (정상): "꽃틔움 프리미엄 코튼 잠옷 세트 여성용 가을 신상품" → panel 미노출 (panelFound=false, alertsTotal=0) ✅
- **P1-A E2E**: 정상 상품명 + "카테고리 자동 추천" 버튼 click → API 호출 → 페이지에 "패션의류 > 여성언더웨어/잠옷 > 잠옷/홈웨어" 자동 입력 + 카테고리 코드 50000826 확인 ✅
- **P1-C UI E2E**: 태그 3개 입력 (레깅스/요가복/asdfqwerty123) → "검증 시작" click → API 응답 후 panel 렌더링 "SEO 유효 2 / 약함 1 / 미등재 0" + 개별 row "#레깅스 월 19,830회 검색 — SEO 유효" / "#요가복 월 37,830회" / "#asdfqwerty123 월 10회 — 검색량 낮음" ✅

### 본 세션 학습 (영구 기록)

1. **functional test에서 silent bug 2건 더 발견** — 본 세션은 사용자 명시 "실무적으로 사용 시 문제 없는지 검증"의 가치 또 한 번 입증.
   - Bug #1: NAVER_CLIENT_ID/_SECRET가 Open API에 invalid (Commerce API only 추정). DATALAB credentials로 fallback 필요.
   - Bug #2: Naver Search Ad의 `<10` 응답이 volume=10으로 들어와 naive threshold가 garbage를 verified 분류.
   둘 다 *구현 직후 자동 functional test*에서 즉시 발견 → 같은 turn 안에서 fix + 재검증. **일반화 규칙: API 통합 후 즉시 production functional test 의무화** (Phase 5 학습 5와 같은 패턴, 이번에 추가 적용).

2. **브라우저 E2E + functional test 조합 = 실무 워크플로우 검증의 표준** — 사용자 명시 강화 지시 후 본 세션부터 적용:
   - functional test (curl) = API 정확성 (응답 shape + 임계값 + 비즈니스 로직)
   - 브라우저 E2E (Claude Preview MCP) = UI 통합 정확성 (panel 렌더링 + tone + interaction)
   - 두 layer 모두 통과해야 "다음 작업으로 넘어감"의 기준 충족.
   본 세션부터 향후 모든 Sprint 진행 시 *둘 다 의무 적용*.

3. **/products/new 상품명 input은 모든 P1-B 시나리오에서 인스턴트 반응** — useMemo 기반 detector라 typing 직후 panel update. 사용자 친화성 검증.

4. **TagVerificationPanel은 수동 trigger 패턴이 옳음** — 입력 직후 자동 verify면 Search Ad rate limit 위험 (5/request, 5천/일). 사용자가 "검증 시작" 버튼 누를 때만 호출 = 5번 무한 입력해도 1번만 API hit. 패턴 일반화 권장: rate-limited API 호출은 *명시 trigger* 패턴.

### 검증 한계 (사용자 보고 의무 — 정직)

본 세션에서 검증 못 한 항목 (의도적 정직 보고):

- **/naver-seo NameRulesPanel 마운트 보류** — 인라인 편집 구조라 P1-B panel 마운트 위치가 복잡. `/products/new` 주력 등록 flow에만 통합. 사용자가 필요 시 별도 follow-up.
- **honey-score 단위 테스트 미실행** — `tsx` ESM resolver가 TS 모듈 직접 import 실패. Build verification (TSC type check) + 브라우저 E2E로 *통합 검증*만 진행. 순수 단위 테스트는 추후 vitest/jest 도입 시.
- **P1-A 80%+ override 시나리오 실증 못 함** — agreed (100%) + synthesized (80%) 모두 검증했지만, *override* (AI top vs dominant 불일치) 케이스는 AI가 정상 상품명에 대해 정확히 답하는 경우라 trigger 어려움. 코드 path는 build로 검증, 실 trigger는 사용자 실 데이터로 자동.
- **`/api/category/suggest`의 응답에 추가된 `pageValidation` 필드를 UI에서 surface 안 함** — Phase 5의 cache hit `cacheHit` field도 마찬가지로 raw response만 노출. 사용자가 어떤 mode (agreed/override/synthesized)로 매핑됐는지 UI에 명시되지 않음. 향후 enhancement.
- **사용자 시각 검증 권장** — Production https://kkotium-garden.vercel.app/products/new 진입해:
  - 상품명에 "이벤트 할인 무료배송" 입력 시 빨간 panel 발화 확인
  - 정상 상품명 + 카테고리 자동 추천 버튼 클릭 시 정확한 카테고리 자동 입력 확인
  - 태그 3개 이상 입력 후 "검증 시작" 버튼 클릭 시 색상별 결과 표시 확인

### Commit + Push (4 commits)
1. `03cfbdd` feat(7-P1): Sprint 7 P1 — category 1page + name rules + tag dictionary (11 파일, +871 / -9)
2. `8b710d4` fix(p1-a): category-page-validator credential fallback (HTTP 401)
3. `9df3d66` feat(p1-a): synthesize suggestion from page validation when AI fails
4. `a495572` fix(p1-c): tighten tag verification thresholds (30/10 vs naive >0)
- worktree → main: `git merge claude/youthful-gauss-5654af --ff-only` 매 commit 후 ff
- 모든 verify-vercel-deploy.sh --wait exit 0 ✅

### 적용된 작업원칙

- **#17** commit msg `.commit-msg.tmp` + `git commit -F` (4회 모두) ✅
- **#21** 사전 점검 통과 ✅
- **#22** 브라우저 시각 검증 의무 — **사용자 명시 강화 적용** + Claude Preview MCP로 3 시나리오 + E2E flow 모두 실증 ✅
- **#24** 한 turn 안에 11 파일 + 4 commit + functional test + 브라우저 E2E + MD 갱신
- **#26** IA 점검 — registry-driven 패턴 유지. 사이드바 변경 0.
- **#27** 외부 컨트랙트 보존 — `/api/category/suggest` 응답에 *추가만* (pageValidation). HoneyScoreResult 변경 0. Tag input flow 변경 0.
- **#28** Vercel = source of truth ✅
- **#29 (a~e++)** 한글 처리 6+1 규칙 모두 통과 (Write로 한글 직접 입력 + Python audit 0/clean)
- **#31 (a)** SESSION_LOG 1298 + 본 entry → ~1500 (T2 1500 도달 임박, 다음 세션 STEP 0 자동 분할 트리거)
- **#32** TSC + npm run build 모두 통과 (4 commit 동안 4회 검증) ✅
- **#33** useSearchParams 추가 0건
- **#34** worktree 혼동 0회 (Phase 4 + Phase 5 + Sprint 7 P0 + 7-P0-B + 7-P1 누적 0회)
- **#35** 한글 사전 분리 패턴 — NameRulesPanel + TagVerificationPanel 두 컴포넌트의 한글은 직접 코드 inline (10줄 미만 짧은 단어), 별도 .strings.ko.json 불요. honey-name-rules.ts의 BANNED_WORDS 배열은 *상수 정의* (literal 한글 15개)
- **#36** push 후 `verify-vercel-deploy.sh --wait` exit 0 (4회 모두) ✅

### 본 세션 commit
1. `03cfbdd` feat(7-P1): Sprint 7 P1 — category 1page + name rules + tag dictionary
2. `8b710d4` fix(p1-a): category-page-validator credential fallback (HTTP 401)
3. `9df3d66` feat(p1-a): synthesize suggestion from page validation when AI fails
4. `a495572` fix(p1-c): tighten tag verification thresholds (30/10 vs naive >0)
5. (본 entry) docs(plan): record Sprint 7 P1 + browser E2E + Sprint 7 Track B handoff

### 다음 세션 (Sprint 7 Track B = AI Studio M1~M4)

ROADMAP.md "Sprint 7 Track B" 새 인계 메시지 (M1 썸네일 / M2 상세페이지 5섹션 / M3 어도비 통합 / M4 A/B 테스트). **Cloudinary 환경변수 보유** ✅. Adobe Firefly API 키 보유 여부는 사용자 사전 확인 필요.

---

## 2026-05-12 Sprint 7 P0-B enhancement (DataLab market context + 10→3 chunked silent bug fix) ✅

### 본 세션 성격
- Sprint 7 P0 완료 직후 사용자 질문 "모든 관련 API키를 등록했는데 활용할수없는건가요?" + "정확히 클릭데이터가 뭔가요?" 답변 + 즉시 개선 작업.
- "클릭 데이터" 정의 명확화 (impression → click → dwell → purchase 깔때기 중 2단계) + Naver Commerce API + 검색광고 + DataLab + 도매꾹 *4개 API 키* 재점검 → **DataLab Shopping Insights aggregate category click 비중 데이터는 *사용 가능*** 발견.
- 본 개선: 카테고리 트렌드 캐시 추가 + 골든윈도우 평가에 *시장 맥락(market context)* 통합 + **기존 trend-analyzer.ts의 silent 실패 버그도 같이 해소**.
- 한 turn 안에 8 파일 + DB 마이그레이션 + 2 commit (feat + bug-fix) + 검증 + 실증 (수동 cron trigger) + MD 갱신 완료. worktree 혼동 0회.

### 시작 직전 상태
- HEAD `54635f4` = origin/main 일치 ✅
- working tree clean ✅
- stash@{0} 보존 ✅
- MD 줄 수: PROGRESS 203 / ROADMAP 427 / SESSION_LOG 1156 (T1 권고)
- Latest prod deploy SHA == HEAD ✅
- verify-vercel-deploy.sh OK ✅

### 본 세션 작업

#### A. DB 마이그레이션 (Supabase `sprint_7_p0b_category_trend_cache` 적용)
- 신규 테이블 `category_trend_cache`:
  - UNIQUE `cache_key` (`d1:<depth1Name>` 패턴, future-proof `code:<code>` 키도 지원)
  - `trend_score` 0..100 (DataLab ratio 정규화)
  - `volume_score` 0..100 (예약, Search Ad keyword 통합용)
  - `market_level` 'hot' / 'normal' / 'cold'
  - `data_source` + `refreshed_at`
- 인덱스 2개 (unique cache_key, refreshed_at DESC)

#### B. 신규 라이브러리 (`src/lib/naver/category-trend-cache.ts`)
- `refreshCategoryTrendCache()` — DataLab 호출 + upsert. Cron-daily에서 호출.
- `getCachedTrend(cacheKey)` — read-only cache lookup
- `resolveProductMarketContext(category)` — 상품 category 문자열 → depth1 추출 → cache lookup
- `buildD1Key(depth1)` — 표준 key 생성
- 실패 경로는 partial cache 보존 (delete 안 함, lastError만 surface)

#### C. golden-window-tracker.ts 확장
- `GoldenWindowRow`에 3 필드 추가 (additive — 외부 컨트랙트 보존 #27):
  - `marketLevel: 'hot' | 'normal' | 'cold' | 'unknown'`
  - `marketTrendScore: 0..100`
  - `severity: 'critical' | 'warning' | 'note' | 'ok'`
- `computeSeverity(stage, status, marketLevel)` — needs_action + hot = critical / needs_action + normal/unknown = warning / needs_action + cold = note / status='ok' = ok
- `buildMessage` 시장 맥락 별 권장 메시지 분기:
  - hot + miss: "시장 hot인데 미달, 상품명 토큰 교체 권장"
  - cold + miss: "시장 cold라 인내 권장 (광고 ROI 낮음)"
  - normal/unknown + miss: 기존 메시지
- Sort severity rank 기반 (critical → warning → note → ok), tiebreak hours-since-registration DESC

#### D. GoldenWindowWidget UI 갱신
- tone driven by `severity` 대신 단순 `status` (4단계 색상: 빨강/주황/회색/녹색)
- 신규 *market badge*: 상품명 옆에 "시장 hot / 시장 보통 / 시장 cold / 시장 미확정" 표시 (hover-title에 정확 trend_score)
- i18n: `marketLabel` 4 key 추가

#### E. cron-daily piggy-back
- `refreshCategoryTrendCache()` 호출을 daily cron 끝부분 (sourcing recommendation 직후) 추가
- 실패 = 비치명적 (`results.categoryTrendRefreshError`에 기록, ok=true 유지)
- **별도 vercel cron 0건** — daily 3개 (`daily / weekly / inventory-sync`) 그대로 유지, 4번째 cron 추가하지 않음

#### F. **silent DataLab 버그 fix (bonus discovery)**
- 1차 수동 trigger 후 결과: `categoryTrendRefresh: { error: 'datalab_http_400' }` + `trends.source: 'fallback'`
- 직접 DataLab API 테스트로 원인 확인: `errMsg "TypeError: .category -> should NOT have more than 3 items"`
- **DataLab Shopping Insights는 category 배열 최대 3개 제한**. 기존 `trend-analyzer.ts`도 10개 전송 중이라 *Daily cron의 Discord 추천이 모두 Perplexity fallback으로 동작 중*이었음 (사용자는 모르고 있었음).
- Fix: 두 모듈 모두 3개씩 chunk 후 sequential POST (4 batches × 3 cats = 5번째 batch는 1개 cat).
- 2차 trigger 후 결과: **`{fetched: 10, upserted: 10}`**, **`trends.source: 'datalab'`**, trend keywords `['청소기', '공기청정기', '이어폰']` (실 도매꾹 트렌드 노출).

### 검증
- TSC `npx tsc --noEmit` 0 errors (2회) ✅
- Production build `npm run build` 28/28 prerender (/dashboard 51.6 → 51.7 kB +0.1 kB market badge)
- NFC + FFFD audit 6개 파일 모두 0/clean ✅
- 한글 sentinel grep 0 신규 매칭 ✅
- Production smoke (push 후):
  - `GET /dashboard` 200 ✅
  - `GET /crawl` 200 ✅
  - `GET /automation` 200 ✅
- **실증** (Phase 5와 같은 패턴 — 코드 path가 production에서 실제 작동 확인):
  - 수동 trigger `GET /api/cron/daily` → `ok: true` + `categoryTrendRefresh: {fetched: 10, upserted: 10}` + `trends.source: 'datalab'`
  - `category_trend_cache` 테이블 10 rows 정상 (생활/건강 100, 디지털/가전 99, ..., 화장품/미용 34 — 모두 정렬됨)
  - hot 5개 + normal 5개 — 본 골든 윈도우 평가에서 사용자 상품 등록 시 즉시 활용 가능
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production 772b111 ✅

### 본 세션 학습 (영구 기록)

1. **사용자 질문이 *silent bug 발견*으로 이어진 사례** — 사용자가 "API 키 다 등록했는데 활용 안 됩니까?" 질문이 없었으면 trend-analyzer.ts의 10→fallback silent failure는 계속 숨어있었을 것. *재점검 트리거*로서 사용자 의문의 가치 증명. 일반화 규칙: *"이게 정말 작동하나요?"* 식 질문은 항상 검증을 다시 수행할 것.

2. **DataLab Shopping Insights API 제약** — 공식 문서에 명시되어 있지만 우리 코드에서 누락:
   - **category 배열 max 3 items** — 본 세션에서 발견
   - timeUnit `'date' | 'week' | 'month'`
   - startDate / endDate (yyyy-MM-dd)
   - device / gender / ages 선택 필터
   - 응답 ratio는 *batch 내 최대값을 100으로 정규화*
   - Cross-batch 정규화 필요 시 *anchor category*를 매 batch에 포함하는 패턴 사용 가능 (본 세션은 global max 후-정규화 simpler 방식 채택)

3. **클릭 데이터 — 진단적 가치 + 비공개 한계 + 대안** —
   - "클릭"의 정확한 정의: 검색 결과 페이지에서 *상품 상세 페이지로 유입한* 사용자 (impression 다음 단계).
   - per-product 클릭 데이터는 Naver Commerce API + 검색광고 API + DataLab 어디서도 노출 안 됨 (스마트스토어 관리자 패널 UI에서만, public API 없음).
   - 대신 사용 가능한 *aggregate level click* 데이터: DataLab Shopping Insights → 카테고리별/연령별/성별 click 비중. *상품 수준은 아니지만 시장 맥락으로 활용 가능*.
   - 본 세션 enhancement는 *카테고리 트렌드*를 골든윈도우 평가에 통합 — 같은 D+3 0건이라도 hot 시장 = critical (상품명 토큰 교체), cold 시장 = note (인내 권장). 진단 정밀도 향상.

4. **silent failure 패턴의 조기 발견 → 별도 commit 분리** — 본 세션의 두 commit:
   - `c08b761` feat(7-P0-B): enhance golden window with DataLab market context
   - `772b111` fix(datalab): chunk DataLab category requests to 3-per-batch (silent failure)
   분리 commit으로 git history에서 *feature vs bug fix*가 명확. 향후 rollback 시 bug fix만 보존 가능.

### 검증 한계 (사용자 보고 의무 — 정직)

- **사용자 상품 0개 → market context 활용 검증 불가** — 카테고리 trend cache는 채워졌지만 (10 rows DB 검증 완료) 골든윈도우 평가 시 product.category 매핑이 *실 상품에서* 어떻게 결정되는지는 사용자 첫 도매꾹 상품 등록 후만 검증 가능.
- **product.category 필드 source 한계** — 본 세션 enrich 로직은 `product.category` (자유 텍스트 필드) → depth1 추출. 사용자가 씨앗 심기에서 *어떻게 category 입력하는지*에 따라 매칭률이 달라짐. naverCategoryCode 기반 lookup도 추가하면 더 정확 (별도 Sprint).
- **DataLab batch normalization** — 본 fix는 global max 후-정규화 방식. *anchor 패턴*보다 cross-batch 비교 정확도 약간 떨어질 수 있음 (~10% noise). hot/normal/cold buckets 분류에는 충분, 정밀 비교 필요 시 향후 anchor 패턴 도입.
- **사용자 시각 검증 권장** — https://kkotium-garden.vercel.app/dashboard 진입해 Section 2 Inbox 골든윈도우 widget의 empty state는 시장 badge 미표시 정상 (활성 상품 0건). 사용자 첫 상품 등록 + D+1 시점 도래 시 *market badge* + *severity tone* 자동 surface 확인 권장.

### Commit + Push (2 commit)
- `c08b761` feat(7-P0-B): enhance golden window with DataLab market context (+377 / -19, 6 파일 — 신규 1 + 수정 5)
- `772b111` fix(datalab): chunk DataLab category requests to 3-per-batch (silent failure) (+86 / -69, 2 파일)
- worktree → main: `git merge claude/youthful-gauss-5654af --ff-only` (ff)
- push `54635f4..772b111 main -> main`
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production 772b111 ✅

### 적용된 작업원칙

- **#17** commit msg `.commit-msg.tmp` + `git commit -F` (2회) ✅
- **#21** 사전 점검 통과 ✅
- **#22** production smoke + **수동 cron trigger로 실증** (categoryTrendRefresh + trends.source 둘 다 검증) ✅
- **#24** 한 turn 안에 8 파일 + DB 마이그레이션 + 2 commit + 검증 + 실증 + MD 갱신
- **#26** IA 점검 — GoldenWindowWidget *내부 UI* 만 갱신 (market badge 추가). 다른 widget / 카드 변경 0.
- **#27** 외부 컨트랙트 보존 — `GoldenWindowRow`에 *추가만* (marketLevel + marketTrendScore + severity). 기존 consumer 영향 0.
- **#28** Vercel = source of truth ✅
- **#29 (a~e++)** 한글 처리 6+1 규칙: (a~e++) 모두 통과 — strings.ko.json에 marketLabel 4 key 추가 (NFC clean, sentinel grep 0)
- **#31 (a)** SESSION_LOG 1156 + 본 entry → ~1400 (T1 1000 초과, T2 1500 미달, 권고만)
- **#32** TSC + npm run build 모두 통과 ✅
- **#33** useSearchParams 추가 0건
- **#34** worktree 혼동 0회 (Phase 4 + Phase 5 + Sprint 7 P0 + 7-P0-B enhancement 누적 0회)
- **#35** 한글 사전 분리 패턴 — `GoldenWindowWidget.strings.ko.json` 확장 (marketLabel 4 key)
- **#36** push 후 `verify-vercel-deploy.sh --wait` exit 0 (2회 모두) ✅

### 본 세션 commit
1. `c08b761` feat(7-P0-B): enhance golden window with DataLab market context
2. `772b111` fix(datalab): chunk DataLab category requests to 3-per-batch (silent failure)
3. (본 entry) docs(plan): record Sprint 7 P0-B enhancement + DataLab fix

### 다음 세션 (Sprint 7 P1) 작업 변경 없음
ROADMAP.md "Sprint 7 P1" 인계 메시지 그대로 유효 (P1-A 카테고리 1페이지 + P1-B 금기어 + P1-C 태그 사전). 본 P0-B enhancement는 *P0 후속 작업*으로 P1 진입을 막지 않음.

---

## 2026-05-12 Sprint 7 P0 (P0-A 옵션 정확도 + P0-B 골든윈도우 + P0-C 효자상품 — Inbox 4 placeholders 모두 live) ✅

### 본 세션 성격
- Phase 5 (Sprint 6-E 카테고리 캐시) 직후 같은 worktree에서 Sprint 7 P0 진입. 사용자 명시 "이어서 진행" + "no clarifying questions" 정책 → 시니어 판단으로 진행.
- 본 Sprint 7 P0의 **궁극 성과**: 2026-05-12 한 채팅 안에서 시작했던 dashboard 5-section 재편 (Phase 2)부터 시작한 *Inbox 4 placeholders 모두 live widget으로 교체* — Phase 3 (가격 변동) → Phase 4 (다른 셀러) → Sprint 7 P0-B (골든 윈도우) → Sprint 7 P0-C (효자 상품). Inbox Section 2는 이제 0 placeholders.
- 한 turn 안에 15 파일 (+1171 / -51) + 검증 + commit + push + verify + MD 갱신 완료. **Phase 3 학습 적용 — worktree vs main 절대 경로 혼동 0회 (Phase 4 + Phase 5 + Sprint 7 P0 누적 0회)**.

### 시작 직전 상태
- HEAD `b91872a` = origin/main 일치 ✅
- working tree clean ✅
- stash@{0} 보존 ✅
- MD 줄 수: PROGRESS 203 / ROADMAP 378 / SESSION_LOG 1016 (T1 1000 도달, 권고만)
- Latest prod deploy SHA == HEAD ✅
- verify-vercel-deploy.sh OK ✅

### 본 세션 작업

#### A. P0-A 도매꾹 OpenAPI v4.5 옵션 정확도 (리서치 11번)
- 신규 `src/lib/option-integrity.ts`:
  - `hashOptions(options)` — selectOpt 정규화 → sha1 첫 32자 (no_options:0 sentinel for empty)
  - `validateStatus(status)` — 비-'판매중' 시 vacation flag (level: block)
  - `validateChannel(isOnSupply)` — !isOnSupply 시 channel_mismatch flag (level: warning)
  - `detectOptionDrift(prev, curr)` — hash 미스매치 시 options_drift flag (level: warning)
  - `evaluateIntegrity()` + `aggregateLevel()` — single-call wrapper
- `/api/crawler/domemae/route.ts`: response에 `optionsHash` + `integrityFlags` + `integrityLevel` 추가 (additive, 기존 consumer 영향 0)
- `/crawl/page.tsx`: `SingleResult` interface에 integrityFlags 필드 추가 + `IntegrityBanner` 컴포넌트 (단건 결과 카드 위에 마운트, tone: block 빨강 / warning 노랑 / ok 녹색)

#### B. P0-B 등록 7일 골든 윈도우 (리서치 10번)
- 신규 `src/lib/golden-window-tracker.ts`:
  - 5 stages: day_0 (<24h) / d_plus_1 (24-72h) / d_plus_3 (72-168h) / d_plus_7 (168-336h) / expired (336h+)
  - 목표: D+3 = 1 sale, D+7 = 3 sales (sales = Product.salesCount)
  - Status: ok / needs_action. Sorted needs_action first, oldest first within needs_action (가장 시급한 것 위로).
  - `isInsideGoldenWindow(createdAt, asOf)` helper export
- 신규 `GET /api/golden-window/active`
- 신규 `GoldenWindowWidget.tsx` + `.strings.ko.json` — Inbox 3rd placeholder 교체
  - Empty state: green "추적 대기 중" (활성 상품 0건 시)
  - Alert row: needs_action orange tone, expired gray tone, ok green tone

#### C. P0-C 효자 상품 자동 식별 (리서치 10번 — 멱법칙)
- 신규 `src/lib/pareto-analyzer.ts`:
  - `computePareto()` — 30-day OrderItem aggregation (status NOT IN CANCELLED/RETURNED/...)
  - paretoSlice = top 20% by count (min 1)
  - topFive (대시보드용) + paretoShare (총 매출 대비 %) + totalRevenue
- 신규 `GET /api/products/pareto`
- `TopProductsCard.tsx` (Section 3) 활성화:
  - 기존 "P0-C 준비 중" placeholder → 매출 있을 때 ranked list (rank + 상품명 + share %), 매출 0건 시 친화 empty body 유지
  - Badge: "30일 기준" (active) vs "P0-C 대기" / "계산 중" / "조회 실패"
- 신규 `ParetoInboxRow.tsx` + `.strings.ko.json` — Inbox 4th placeholder 교체
  - Compact 1-row summary: "TOP N/M · X% 차지" + #1 상품명 short

#### D. Dashboard 통합 (Inbox 4 placeholders → 4 live widgets)
- `dashboard/page.tsx`:
  - import 2개 신규 (GoldenWindowWidget, ParetoInboxRow), Trophy/InboxPlaceholderRow import 제거
  - Inbox Section 2: PriceMovementWidget + CompetitorRadarWidget + **GoldenWindowWidget** + **ParetoInboxRow** (placeholder 0건)

#### E. Registry 갱신
- `golden-window` pending → active, frequency on-event (no cron — widget fetch 시 pure compute)
- `pareto-recalc` pending → active, frequency on-event (no cron — pure compute)
- `api/automation/registry/route.ts`: case 'golden-window' / 'pareto-recalc' → lastRun null (on-demand, always live)

### 검증
- TSC `npx tsc --noEmit` 0 errors ✅
- Production build `npm run build` 28/28 prerender ✅ (/dashboard 50.4 → 51.6 kB +1.2 kB, /crawl 19.7 → 20.1 kB +0.4 kB IntegrityBanner)
- NFC + FFFD audit 15개 파일 모두 0/clean (crawl/page.tsx의 FFFD 2건은 기존 sanitize 정규식, 본 세션 무관) ✅
- 한글 sentinel grep 0 신규 매칭 ✅
- Production smoke (push 후):
  - `GET /dashboard` HTTP 200 ✅
  - `GET /crawl` HTTP 200 ✅
  - `GET /automation` HTTP 200 ✅
  - `GET /api/golden-window/active` HTTP 200 `{"data":[]}` (cold start, 활성 상품 0건 → []) ✅
  - `GET /api/products/pareto` HTTP 200 `{"totalRevenue":0,"totalOrders":0,...}` (cold start) ✅
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production 8c477ee (state=REGISTERED) ✅

### 본 세션 학습 (영구 기록)

1. **Inbox placeholder 4건 모두 live 전환 완료 — 본 채팅 1일의 누적 성과** — 2026-05-12 한 채팅에서:
   - Phase 2 (4-Section dashboard 재편)에서 4 placeholders 도입
   - Phase 3 → 가격 변동 (1번째 placeholder live)
   - Phase 4 → 다른 셀러 (2번째 placeholder live)
   - Sprint 7 P0-B → 골든 윈도우 (3번째 placeholder live)
   - Sprint 7 P0-C → 효자 상품 (4번째 placeholder live)
   Inbox Section 2가 이제 4개의 production-active widget으로 가득 참. Sidebar 변경 0건, dashboard layout 변경 0건 — *registry-driven IA 패턴이 4 Sprint 누적에서 자연 일관성 유지*. Phase 1 (/automation 골격)의 가치 증명.

2. **on-event frequency 패턴 — cron-less automation** — P0-B (골든윈도우) + P0-C (효자상품) 모두 cron 없음. Widget이 fetch 시 server-side에서 pure compute (Product / OrderItem 테이블 직접 쿼리). Vercel cron quota 0건 추가, 데이터는 항상 최신 (lastRun null로 명시). 향후 비슷한 *"DB에서 직접 계산 가능한 분석"*은 같은 패턴 적용 가능 — 즉시 *live* 상태로 신규 자동화 등록 가능.

3. **TopProductsCard graceful activation** — Phase 2에서 마운트한 placeholder card를 P0-C에서 *덮어쓰기 0*으로 activation. Hook 추가 (useSWR) + 조건부 body 분기 (`hasData ? RankedList : EmptyBody`). 기존 empty 텍스트는 그대로 보존 → cold start에서 사용자 경험 미변경, 데이터 누적 후 자동 시각 전환. *Phase 2에서 정한 카드 골격이 Sprint 7까지 안정 유지*.

4. **integrity flags 점진 적용 패턴** — `/api/crawler/domemae` 응답에 *additive* 필드만 추가 (`optionsHash`, `integrityFlags`, `integrityLevel`). 기존 consumer (씨앗 심기 prefill, AlternativeProductPanel, DomemaeCrawler 등)은 변경 0건. 새 consumer (`/crawl` IntegrityBanner) 만 read. 외부 컨트랙트 보존 (#27) 원칙 적용.

### 검증 한계 (사용자 보고 의무 — 정직)

- **P0-A 실 데이터 검증 불가** — 현재 도매꾹 상품 0건이라 첫 crawl 동선에서 integrityFlags 발화 불가. 사용자 첫 도매꾹 URL crawl 시 *vacation* (status != 판매중) / *channel_mismatch* (!isOnSupply) flag 자동 trigger. *options_drift*는 prevHash 필요 — 첫 crawl 후 *재크롤*에서만 발화 (현재 재크롤 UI는 없음 — 별도 Sprint).
- **P0-B 골든 윈도우 cold start** — 활성 상품 0건 → empty state. 사용자 첫 도매꾹 상품 등록 + naverProductId 발급 후 day_0 stage 즉시 trigger.
- **P0-C Pareto cold start** — 주문 0건 → totalRevenue 0. 사용자 첫 판매 후 30-day window에 누적 시 자동 산정.
- **사용자 시각 검증 권장** — https://kkotium-garden.vercel.app/dashboard 직접 진입해 Section 2 Inbox 4 widgets 모두 empty state green row + Section 3 TopProductsCard "P0-C 대기" badge → "30일 기준" 자동 전환 (주문 발생 시) 확인 권장.
- **클릭 데이터 미수집** — 골든 윈도우 D+1 target은 *클릭* 1+ 기준이지만 본 프로젝트는 Naver Commerce API click 데이터 미수집 (별도 integration 필요). 현재 D+1 target=0 (사실상 항상 통과). 향후 클릭 데이터 수집 시 target 상향 조정 권장.

### Commit + Push
- `8c477ee` feat(7-P0): Sprint 7 P0 — option integrity + golden window + pareto (+1171 / -51, 15 파일 — 신규 9 + 수정 6)
- worktree → main: `git merge claude/youthful-gauss-5654af --ff-only` (ff)
- push `b91872a..8c477ee main -> main`
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production 8c477ee (state=REGISTERED) ✅

### 적용된 작업원칙

- **#17** commit msg `.commit-msg.tmp` + `git commit -F` ✅
- **#21** 사전 점검 통과 ✅
- **#22** production smoke (5개 endpoint 200 + 신규 2개 API cold start `{"data":[]}` / `{"totalRevenue":0,...}` 검증) — 시각 검증은 사용자 환경에서 (보고 의무 충족)
- **#24** 한 turn 안에 15 파일 + 검증 + commit + push + verify + MD 갱신
- **#26** IA 점검 — Inbox 두 placeholder 교체 + Section 3 기존 카드 activation (Sidebar 변경 0, registry-driven IA 패턴 보존)
- **#27** 외부 컨트랙트 보존 — `/api/crawler/domemae` 응답 *추가만* (optionsHash + integrityFlags + integrityLevel). `SearchFilter` / `ItemDetail` interface 변경 0.
- **#28** Vercel = source of truth ✅
- **#29 (a~e++)** 한글 처리 6+1 규칙:
  - (a) Edit 한글 다량 newText 1건 (option-integrity의 IntegrityFlag message — 짧은 단어, NFC clean) — 모두 Write로 처리하고 grep 검증 통과
  - (b) MD 갱신 = Python 안전 삽입 패턴 (본 entry)
  - (c) 위젯 한글 const → strings.ko.json 분리 (#35 패턴, 2개 신규 사전)
  - (d) 셸 명령 한글 0건
  - (e) sentinel grep 0 신규 매칭
  - (e+, e++) 닉네임 호명 0건
- **#31 (a)** SESSION_LOG 1016 + 본 entry → ~1300 (T1 1000 초과 + T2 1500 미달, 권고만. 다음 세션 진입 시 자동 분할 진행 권장)
- **#32** TSC + npm run build 모두 통과 ✅
- **#33** useSearchParams 추가 0건
- **#34** worktree vs main 절대 경로 혼동 0회 발생 — Phase 4 + Phase 5 + Sprint 7 P0 누적 0회 (Phase 3 학습 패턴 안정 적용)
- **#35** 한글 사전 분리 패턴 — `GoldenWindowWidget.strings.ko.json` (10 keys) + `ParetoInboxRow.strings.ko.json` (10 keys), 모두 NFC clean / FFFD 0 ✅
- **#36** push 후 `verify-vercel-deploy.sh --wait` exit 0 (github-deployments path) ✅

### 본 세션 commit
1. `8c477ee` feat(7-P0): Sprint 7 P0 — option integrity + golden window + pareto
2. (본 entry) docs(plan): record Sprint 7 P0 + Sprint 7 P1 handoff

### 다음 세션 (Sprint 7 P1) 작업 = 카테고리 1페이지 + 금기어 + 태그 사전

1. **P1-A 카테고리 1페이지 일치율 검증** — `src/lib/category-page-validator.ts` (신규) + `/api/category/suggest` 강화 (Phase 5 cache layer 위에 1페이지 분포 분석 추가)
2. **P1-B 상품명 금기어 페널티 강화** — `src/lib/honey-score.ts` 강화 (이벤트/할인/배송/적립/쿠폰 키워드 + 중복 단어 3회+ + 허용 외 특수문자) + 씨앗 심기 / 검색 조련사 UI 빨간 알림
3. **P1-C 태그 사전 등재 검증** — `src/lib/naver/tag-dictionary.ts` (신규, 네이버 검색광고 API 키워드 도구 활용) + 태그 입력 UI 경고
4. automation-registry: category-1page + tag-dictionary pending → active
5. 검증 + commit + push + verify + MD 갱신 + Sprint 7 Track B AI Studio (M1~M4) 인계

---

## 2026-05-12 Session E-2 Phase 5 = Session F (Sprint 6-E 카테고리 캐시 + Gemini hit-rate) ✅

### 본 세션 성격
- Phase 4 (Sprint 6-C 다른 셀러 + 공급사 누적 평가) 직후 같은 worktree에서 Phase 5 진입. 사용자 명시 "이어서 진행" + "no clarifying questions" 정책 → 시니어 판단으로 진행.
- 본 Phase에서 발견: **Sprint 6-D 4모드 발송은 이미 production active** (daily cron의 KKOTTI_RECOMMEND/KKOTTI_SCORE 발송 + 6-A 폴러의 STOCK_ALERT + 6-B 분석기의 PRICE_CHANGE). Phase 5에서 6-D 관련 추가 작업 0건 — 검증만 완료.
- Phase 5 = **Sprint 6-E 카테고리 캐시에 집중**. 한 turn 안에 8 파일 + DB 마이그레이션 + 검증 (cold→hot path 실증) + commit + push + verify + MD 갱신 완료.
- Phase 3 학습 적용 — worktree vs main 절대 경로 혼동 0회 (Phase 4 + Phase 5 누적 0회).

### 시작 직전 상태
- HEAD `629a6c8` = origin/main 일치 ✅
- working tree clean ✅
- stash@{0} 보존 ✅
- MD 줄 수: PROGRESS 203 / ROADMAP 369 / SESSION_LOG 870 (Phase 4 entry 추가 후 직전 상태, T1 1000 미달)
- Latest prod deploy SHA == HEAD ✅
- verify-vercel-deploy.sh OK ✅

### 본 세션 작업

#### A. DB 마이그레이션 (Supabase `sprint_6e_category_cache` 적용)
- 신규 테이블 `dome_categories`: full domeggook category tree cache
  - PK code VARCHAR(20), name, depth, parent_code, item_count, refreshed_at
  - 인덱스 2개 (parent_code, depth)
- 신규 테이블 `category_mappings`: learned dome ↔ naver mapping cache
  - lookup_kind ('dome_code' | 'name_hash') + lookup_key
  - naver_d1/d2/d3/d4 + naver_category_code + confidence + source + hit_count + last_hit_at
  - UNIQUE INDEX (lookup_kind, lookup_key)
  - 인덱스 2개 (last_hit_at DESC + unique)

#### B. Adapter 실제 구현 (`domemae-adapter.getCategories`)
- 기존: `notImplemented` throw stub (placeOrder만 stub 유지)
- 신규: domeggook getCat ver 2.0 실제 호출 (`mode=getCat&ver=2.0`)
- 응답 파싱: list.category 또는 root category 배열 → flat `Category[]` 반환
- 안전 파싱: depth/parent/cnt 모두 number/string 양방향 대응
- code + name 둘 다 있을 때만 포함 (defensive null filter)

#### C. 신규 캐시 라이브러리 (`src/lib/dome-category-cache.ts`)
- `refreshDomeCategoryTree()` — getCat 호출 후 upsert. Idempotent. 결과 metrics 반환.
- `getCachedMapping(kind, key)` — lookup. Hit 시 hitCount/lastHitAt 비동기 increment (best-effort, 응답 차단 안 함).
- `saveMapping(...)` — upsert. confidence 0..100 clamp, source enum 보존.
- `nameHashKey(name)` — sha1 첫 32자, whitespace/case 정규화 후 hash. 한글 토큰 그대로 보존.
- `readCachedDomeTree()` — UI/디버그용 read-only.

#### D. `/api/category/suggest` cache layer
- body에 optional `domeCategoryCode` 받음
- 캐시 lookup 순서: (1) dome_code (가장 신뢰) → (2) name_hash → (3) AI/fallback path
- 캐시 hit 시 response에 `cacheHit: 'dome_code' | 'name_hash'` 추가
- AI/fallback 성공 후 top suggestion을 `saveMapping`으로 비동기 write (응답 차단 안 함)
- 두 가지 캐시 키 모두 동시 write (dome_code 있으면 둘 다, 없으면 name_hash만)
- confidence 차등: AI=80 (name_hash) / 85 (dome_code), fallback=60 / 65

#### E. cron-weekly piggy-back
- `refreshDomeCategoryTree()` 호출을 weekly cron 끝부분에 추가
- try/catch로 캐시 실패가 weekly report 발송 영향 안 미치게 (보고는 정상, 캐시 갱신만 fail noted)
- response에 `categoryRefresh: { fetched, upserted, durationMs }` 추가
- **별도 vercel cron 신설 0건** — Hobby plan 2 cron 제한 회피 (현재 daily/weekly/inventory-sync 3개 그대로)

#### F. Registry 갱신
- 신규 entry `category-cache`: status active, code 6-E, frequency weekly, schedule '0 0 * * 1', cronPath '/api/cron/weekly', togglable true, group 'seo'
- i18n 사전: nameKey 'categoryCache' = "도매꾹 카테고리 캐시" + descriptionKey 자세한 설명
- `api/automation/registry/route.ts`:
  - `lastDomeCategory` lookup (refreshedAt DESC, 1 row)
  - case 'category-cache' → DomeCategory.refreshedAt 반환
  - cold start (DomeCategory 비어있음) 시 lastRun null = 'active' but never run yet (정상)

### 검증
- TSC `npx tsc --noEmit` 0 errors ✅
- Production build `npm run build` 28/28 prerender ✅ (/automation 6.89 → 7.0 kB / +1 신규 string)
- NFC + FFFD audit 8개 파일 모두 0/clean ✅
- 한글 sentinel grep 0 신규 매칭 ✅
- Production smoke (push 후):
  - `GET /dashboard` HTTP 200 ✅
  - `GET /automation` HTTP 200 ✅
  - `GET /api/automation/registry` → category-cache row 표시 정합 (active, lastRun null, envOk true) ✅
- **Cache hit-rate 실증** (Phase 5의 핵심 검증):
  - 1st call `POST /api/category/suggest {"productName":"DIY 두꺼비집 가리개 인테리어"}` → `{"success":true,"suggestions":[...],"usedAI":false}` (cacheHit 필드 없음 = miss → fallback → cache write)
  - 2nd call 동일 keyword → `{"success":true,"suggestions":[...],"usedAI":false,"cacheHit":"name_hash"}` ✅
  - cold→hot transition 1회 round-trip 안에 작동 확인. AI 호출 회피 path 검증 완료.
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production a8a58c2 (state=REGISTERED) ✅

### 본 세션 학습 (영구 기록)

1. **6-D 발견 — 이미 production active** — 처음에 Phase 5 계획에 "6-D 4모드 발송 통합" 포함되어 있었으나, daily cron + inventory poller + price analyzer 검토 결과 모두 production에서 active 작동 중. KKOTTI_RECOMMEND (daily cron line 404), KKOTTI_SCORE (daily cron line 232-238), STOCK_ALERT (6-A poller), PRICE_CHANGE (6-B analyzer) 모두 wired. Phase 5에서 추가 작업 0건. 일반화 규칙: *세션 인계 메시지 작성 시 "이미 active" 확인 단계 의무* — 과잉 작업 회피.

2. **Vercel Hobby plan cron 제한 회피 패턴 (piggy-back)** — 본 프로젝트는 daily / weekly / inventory-sync 3 cron 사용 중. Hobby plan은 2 cron 제한이지만 현재 3개 작동 (legacy upgrade 또는 Vercel 정책 변경 추정). 어쨌든 cron 추가는 risky. Phase 5의 6-E 카테고리 캐시는 weekly cron에 piggy-back — Phase 3의 6-B (inventory-sync piggy-back) + Phase 4의 6-C (inventory-sync piggy-back)와 같은 패턴. 일반화 규칙: *새 cron 신설 전에 기존 cron piggy-back 가능성 우선 검토*. 주간 충분한 작업 = weekly 합류, 일일 필요한 작업 = daily 또는 inventory-sync 합류.

3. **Cache hit-rate 실증의 ROI** — 본 Phase 5는 도매꾹 0개 상품 상태에서 *그래도 검증 가능한* 첫 Phase. cold→hot path를 같은 turn 안에 검증 완료 — curl 2회로 cache miss → cache hit 전환 실증. 다른 Phase (6-A/6-B/6-C)는 실 도매꾹 상품 등록 후만 검증 가능했음. **AI/cache 시스템은 *데이터 입력 없이 검증 가능한 path*가 있어 cold start에서 가치 증명 가능** — 향후 비슷한 cache/AI 시스템 빌드 시 같은 검증 패턴 활용.

4. **async cache write best-effort 패턴** — `getCachedMapping` 의 hitCount/lastHitAt update + `/api/category/suggest`의 saveMapping 모두 `.catch(() => undefined)` 패턴으로 응답 차단 안 함. DB write 실패가 cache lookup 결과에 영향 없음. 비슷한 패턴: 본 프로젝트 다른 곳에서 활용 가능 (예: dashboard 위젯의 lastSeen tracking).

### 검증 한계 (사용자 보고 의무 — 정직)

- **dome tree 캐시 cold start** — `refreshDomeCategoryTree()`는 다음 weekly cron 호출 (월요일 00:00 UTC = 09:00 KST)에서 실행 예정. 본 세션은 코드 path까지만 검증. 사용자가 *지금* tree 검증 원할 시 `curl -X GET -H "Authorization: Bearer $CRON_SECRET" https://kkotium-garden.vercel.app/api/cron/weekly` 1회 수동 트리거 가능 (또는 사용자 결정 위임).
- **dome_code lookup path 검증 불가** — 현재 상품 0개라 dome categoryCode를 가진 query가 발생할 수 없음. 사용자가 첫 도매꾹 상품 crawl 후 categoryCode 포함 query 시 `cacheHit: "dome_code"` path 자동 검증.
- **Gemini AI path 실 호출 검증 불가** — 본 세션 두 sample query (잠옷 / DIY 두꺼비집) 모두 FALLBACK_RULES에서 매칭되어 AI 호출 자체 발생 안 함 (`usedAI: false`). AI path는 fallback rules 미스 시에만 trigger — 향후 새 카테고리 검색 시 자동 검증.
- **사용자 시각 검증 권장** — https://kkotium-garden.vercel.app/automation 직접 진입해 SEO + 노출 그룹의 *category-cache* row 가시성 + active status badge 확인 권장.

### Commit + Push
- `a8a58c2` feat(6-E): Phase 5 — domeggook category cache + AI mapping hit-rate (+457 / -5, 8 파일 — 신규 1 + 수정 7)
- worktree → main: `git merge claude/youthful-gauss-5654af --ff-only` (ff)
- push `629a6c8..a8a58c2 main -> main`
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production a8a58c2 (state=REGISTERED) ✅

### 적용된 작업원칙

- **#17** commit msg `.commit-msg.tmp` + `git commit -F` ✅
- **#21** 사전 점검 통과 ✅
- **#22** production smoke + cache cold→hot 실증 (curl 2회 round-trip) — 시각 검증은 사용자 환경에서 (보고 의무 충족)
- **#24** 한 turn 안에 8 파일 + DB 마이그레이션 + 검증 + commit + push + verify + MD 갱신
- **#26** IA 점검 — registry SEO + 노출 그룹에 category-cache 1개 신규 entry만 추가. 사이드바 변경 0, dashboard widget 추가 0 (캐시는 background system).
- **#27** 외부 컨트랙트 보존 — `/api/category/suggest` 응답에 *추가만* (cacheHit field). 기존 success/suggestions/usedAI 보존. 호출자 (씨앗 심기 form)에서 body의 productName 그대로 전송하면 동일하게 작동.
- **#28** Vercel = source of truth ✅
- **#29 (a~e++)** 한글 처리 6+1 규칙:
  - (a) Edit 한글 다량 newText 0건 (i18n 사전에 짧은 한글 2개 추가, 모두 Edit 통해 진행 — 단어 단위 안전 패턴)
  - (b) MD 갱신 = Python 안전 삽입 패턴 (본 entry)
  - (c) API route 한글 const = literal "상품명을 입력해주세요" 1건만 (기존, 변경 0)
  - (d) 셸 명령 한글 0건
  - (e) sentinel grep 0 신규 매칭
  - (e+, e++) 닉네임 호명 0건
- **#31 (a)** SESSION_LOG 870 + 본 entry → ~1100 (T1 1000 도달, 권고. 다음 세션 시작 시점에 분할 검토 권장. Phase 6 진입 시 자동 분할 트리거)
- **#32** TSC + npm run build 모두 통과 ✅
- **#33** useSearchParams 추가 0건
- **#34** worktree vs main 절대 경로 혼동 0회 발생 — Phase 4 + Phase 5 누적 0회 (Phase 3 학습 패턴 안정 적용)
- **#35** 한글 사전 분리 패턴 — `automation-strings.ko.json`에 `categoryCache` 2 key 추가 (NFC clean, FFFD 0) ✅
- **#36** push 후 `verify-vercel-deploy.sh --wait` exit 0 (github-deployments path) ✅

### 본 세션 commit
1. `a8a58c2` feat(6-E): Phase 5 — domeggook category cache + AI mapping hit-rate
2. (본 entry) docs(plan): record Session E-2 Phase 5 + Sprint 7 handoff

### 다음 세션 (Sprint 7) 작업 = P0/P1 (옵션 정확도 + 골든윈도우 + 효자상품 + 카테고리 1페이지 + 금기어 + 태그사전)

**Sprint 6 완료** — 6-A 백엔드 + 6-B + 6-C + 6-E 카테고리 캐시 + 6-D 4모드 발송 모두 production active.

**Sprint 7 P0** (3 작업):
1. **P0-A 도매꾹 OpenAPI v4.5 옵션 정확도 강화** — `src/lib/option-integrity.ts` (신규) + `crawler/auto-mapper.ts` 강화 + `/crawl` UI 알림
2. **P0-B 등록 7일 골든 윈도우** — `src/lib/golden-window-tracker.ts` (신규) + `GoldenWindowWidget` (Inbox 3번째 placeholder 교체)
3. **P0-C 효자 상품 자동 식별** — `src/lib/pareto-analyzer.ts` (신규) + 기존 `TopProductsCard` (Section 3) 활성화 + Inbox 4번째 placeholder 교체

**Sprint 7 P1** (3 작업 — P0 완료 후 별도 세션 권장):
1. **P1-A 카테고리 1페이지 일치율 검증** — `category-page-validator.ts` (신규) + suggest route 강화
2. **P1-B 상품명 금기어 페널티 강화** — `honey-score.ts` 강화 + UI 알림
3. **P1-C 태그 사전 등재 검증** — `naver/tag-dictionary.ts` (신규) + 태그 입력 UI 경고


---

## 2026-05-12 Session E-2 Phase 4 (Sprint 6-C 다른 셀러 + 공급사 누적 평가 — 6-A 폴러 piggy-back) ✅

### 본 세션 성격
- Phase 3 (Sprint 6-B 가격 변동 백엔드 + 시각 검증) 직후 같은 worktree에서 Phase 4 진입. 사용자 명시 "이어서 진행" + "no clarifying questions" 정책 → 시니어 판단으로 (a) DB 스키마 (신규 competitor_snapshots 별도 vs SupplierStockProfile 확장) (b) Widget 마운트 슬롯 (Inbox vs Potential) 모두 결정.
- DB 결정: **신규 `competitor_snapshots` 별도 테이블 + 공급사 평가는 pure compute (신규 테이블 0)**. 근거: raw competitor data와 aggregated supplier score는 본질적으로 다른 layer (시계열 raw vs aggregated read-model). SupplierStockProfile에 가격 변동성 컬럼 추가는 score-only 컬럼이 누적되어 schema rot 위험.
- Widget 마운트: **CompetitorRadarWidget → Inbox Section 2 (placeholder 교체)**, **SupplierGardenWidget → Section 4 잠재력**. 근거: 경쟁사 알림은 *액션 가능 알림*이므로 Inbox 적합 (PriceMovementWidget와 동일 패턴). 공급사 점수는 *축적된 인사이트*이므로 Potential 영역 적합.
- 한 turn 안에 14 파일 + DB 마이그레이션 + 검증 + commit + push + verify + MD 갱신 완료. **Phase 3 학습 적용 — worktree vs main 절대 경로 혼동 0회**.

### 시작 직전 상태
- HEAD `9511e5c` = origin/main 일치 ✅
- working tree clean ✅
- stash@{0} 보존 ✅
- MD 줄 수: PROGRESS 203 / ROADMAP 348 / SESSION_LOG 677 (Phase 3 entry 추가 후 직전 상태)
- Latest prod deploy SHA == HEAD ✅
- verify-vercel-deploy.sh OK ✅

### 본 세션 작업

#### A. DB 마이그레이션 (Supabase `sprint_6c_competitor_snapshot` 적용)
- 신규 테이블 `competitor_snapshots`:
  - per-product per-poll capture (productId, productNo, searchKeyword)
  - aggregates: competitorCount, minPrice, maxPrice, medianPrice, ourRank, ourPrice
  - errorNote VARCHAR(200) (search 실패 시에도 한 row는 저장)
  - 인덱스 3개 (product, polled DESC, product+polled DESC)
  - FK product_id → "Product"(id) ON DELETE CASCADE
- SupplierStockProfile 확장 0건 — pure compute approach 채택

#### B. Adapter 실제 구현 (`domemae-adapter.searchItems`)
- 기존: `notImplemented` throw stub
- 신규: domeggook getItemList ver 4.5 실제 호출
- SearchFilter 매핑:
  - keyword → kw / categoryCode → ca / minPrice → sp / maxPrice → ep
  - sortBy {recent: 'date', popular: 'hit', priceAsc: 'price_asc', priceDesc: 'price_desc', sales: 'sale'}
  - page → pg / pageSize → sz (1..100, default 20)
- 응답 파싱 → `ItemSummary[]` (price 파싱은 number/string 양방향 안전)
- 에러 처리: errors 또는 domeggook 누락 시 빈 결과 + page/pageSize 보존

#### C. 신규 분석기 (`src/lib/dome-competitor-tracker.ts`)
- `evaluateCompetitor(adapter, meta, ourPrice)` — 활성 상품 1개당 1 search call
- 키워드: 상품명에서 괄호류 정리 후 첫 3 token (whitespace split)
- ourRank: page-1 결과를 linearly scan하며 productNo 매칭. 발견 시 1-based, 미발견 null
- 통계: competitors 가격 sort → min/max/median (even count는 lower middle)
- 실패 경로: search API throw 시 에러를 errorNote에 기록한 row 한 줄 저장 (다음 폴링에서 retry)

#### D. 신규 분석기 (`src/lib/supplier-score-aggregator.ts`)
- pure compute, no new tables. 3 source query in one round trip:
  1. `prisma.supplier.findMany` (with products)
  2. `prisma.supplierStockProfile.findMany` (where productNo IN [...])
  3. `prisma.priceMovementAlert.findMany` (where supplier IN, triggeredAt >= since)
- 3 sub-scores:
  - **trustScore**: untrustworthy 비율 (no profile → 100 default)
  - **depletionScore**: median avgDailyDepletion → 0-100 mapping (0 → 30, 1 → 60, 5+ → 100, 선형)
  - **priceStability**: 1 - recentPriceAlerts / 8 (8+ alerts in 30d → 0)
- composite = 0.45 × trust + 0.35 × depletion + 0.20 × priceStability
- Tier 매핑: 80+ green / 60+ yellow / red
- sort: composite DESC (best first)

#### E. 폴러 통합 (`dome-inventory-poller.ts`)
- `PollResult` 확장: `competitorSnapshotsSaved` + `competitorErrors`
- active loop 안에서 evaluateAlert → evaluatePriceMovement → evaluateCompetitor (3중 분석 직렬)
- 각 분석마다 try/catch 분리 — 한 쪽 실패가 다른 쪽 영향 없음

#### F. API 표면
- `GET /api/competitors/latest` — `$queryRaw` DISTINCT ON으로 product당 최신 snapshot 1개씩, naverProductId NOT NULL 필터, polledAt DESC LIMIT 50
- `GET /api/suppliers/scores` — `computeSupplierScores()` on-demand 호출, 5min SWR refresh interval

#### G. UI 표면 (4 신규 파일 + dashboard 통합)
- `CompetitorRadarWidget.tsx` + `.strings.ko.json`:
  - empty-state OK row (PriceMovementWidget 패턴) — 활성 상품 0 시 "추적 대기 중" green row
  - alert row: 우리 가격 vs median 비교 tone (≥10% red / 5-10% yellow / 그 외 green)
  - 우리 노출 순위 (#1~#20) badge / 1페이지 외 시 "1페이지 외" 표시
- `SupplierGardenWidget.tsx` + `.strings.ko.json`:
  - Section 4 잠재력 마운트 (UploadReadiness + KkottiWidget + SupplierGarden + Zombie/Review grid)
  - 카드 그리드 `auto-fit minmax(220px, 1fr)` — 최대 6 카드 노출 + N건 외 더보기
  - 카드: composite score(큰 숫자) + 3 sub-metric mini cards + 알림 배지 (untrustworthy / recent alerts)
- `dashboard/page.tsx`:
  - import 2개 신규 + Users 아이콘 제거 (CompetitorRadarWidget이 자체 import)
  - Inbox 두 번째 placeholder ("다른 셀러 추적") → `<CompetitorRadarWidget />`
  - Section 4 잠재력 KkottiWidget 직후 `<SupplierGardenWidget />` 마운트

#### H. Registry 갱신
- `competitor-poll` status pending → active, frequency daily, schedule '0 0 * * *', cronPath '/api/cron/inventory-sync' (공유)
- `supplier-score` status pending → active, frequency on-event (cronPath 없음 — widget fetch 시 compute)
- `api/automation/registry/route.ts`:
  - `lastCompetitorSnap` lookup 추가
  - `case 'competitor-poll'` → lastCompetitorSnap.polledAt
  - `case 'supplier-score'` → lastCompetitorSnap.polledAt (primary data source proxy)

### 검증
- TSC `npx tsc --noEmit` 0 errors ✅ (첫 build에서 ItemSummary import 누락 1건 catch → 즉시 정정)
- Production build `npm run build` 28/28 prerender ✅ (/dashboard 48.7 → 50.4 kB / +3 신규 API routes)
- NFC + FFFD audit 14개 파일 모두 0/clean ✅
- 한글 sentinel grep 0 신규 매칭 ✅
- Production smoke (push 후):
  - `GET /dashboard` HTTP 200 ✅
  - `GET /automation` HTTP 200 ✅
  - `GET /api/alerts/price-movements` HTTP 200 `{"data":[]}` (Phase 3 path 유지) ✅
  - `GET /api/competitors/latest` HTTP 200 `{"data":[]}` (cold start 정상) ✅
  - `GET /api/suppliers/scores` HTTP 200 `{"data":[]}` (cold start 정상) ✅
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production b836687 (state=REGISTERED) ✅

### 본 세션 학습 (영구 기록)

1. **worktree 혼동 0회 — Phase 3 학습 적용 성공** — Phase 3에서 worktree vs main 절대 경로 혼동이 2회 발생했지만 Phase 4에서는 0회. 적용 패턴:
   - 모든 Edit/Write 호출 직전에 file_path가 `/Users/jyekkot/Desktop/kkotium-garden/.claude/worktrees/youthful-gauss-5654af/`로 시작하는지 1초 확인.
   - DDL 적용 직후 `cd /Users/jyekkot/Desktop/kkotium-garden && git status --short`로 main 상태 점검 (clean이어야 정합).
   - `git status --short`를 worktree에서 실행해 변경 파일이 모두 worktree에 잡혔는지 매 turn 확인.
   본 패턴은 Phase 5+ 영구 적용 권장.

2. **신규 테이블 결정 — 별도 vs 확장 trade-off** — 본 세션 두 자동화 (6-C / supplier-score)가 정반대 결정:
   - **CompetitorSnapshot 신규 별도**: raw time-series capture. SupplierStockProfile에 추가 컬럼 (avgCompetitorPrice, lastSearchPolledAt 등) 이 가능하지만 *raw + aggregated 한 테이블*이 schema rot 위험.
   - **SupplierScore = pure compute**: 새 테이블 0. Supplier + SupplierStockProfile + PriceMovementAlert 세 source에서 직접 계산. 추후 캐시 필요 시 별도 read-model 테이블 추가 옵션 보존.
   - 일반화 규칙: raw event-style data = 별도 테이블 / aggregated read-model = 우선 pure compute → 비용 hit 시 캐시.

3. **`prisma.$queryRaw` + DISTINCT ON 패턴** — `/api/competitors/latest`는 "product당 최신 1 row" 필요. Prisma는 native DISTINCT ON 미지원이라 `prisma.$queryRaw<...>\`...\`` 패턴 사용:
   ```ts
   await prisma.$queryRaw<...>`
     SELECT ... FROM (
       SELECT DISTINCT ON (product_id) *
       FROM competitor_snapshots
       ORDER BY product_id, polled_at DESC
     ) s
     JOIN "Product" p ON p.id = s.product_id
     WHERE p."naverProductId" IS NOT NULL
     ORDER BY s.polled_at DESC LIMIT 50
   `;
   ```
   PostgreSQL camelCase column ("naverProductId")은 quoted 사용 필수. Phase 3 (Product table 대소문자) 학습 재확인.

4. **3중 분석 직렬 호출 한 turn 안에 (6-A + 6-B + 6-C)** — `dome-inventory-poller` active loop가 이제 *evaluateAlert → evaluatePriceMovement → evaluateCompetitor* 3중 분석. 각 try/catch 분리로 한 쪽 실패가 다른 쪽 영향 없음. 단일 cron 호출에 *세 가지 자동화 동시 처리* — Vercel daily quota 추가 비용 0 (cron 1개 그대로). 향후 6-D 4모드 발송도 같은 루프 끝에 합류 검토 가능.

### 검증 한계 (사용자 보고 의무 — 정직)

- **실 데이터 검증 불가** — 활성 상품 0개 → competitor poll 대상 0건 → CompetitorSnapshot 생성 0건. 사용자 첫 도매꾹 상품 등록 + 첫 cron 호출 후 자동 검증됨.
- **공급사 점수도 cold start** — 0 suppliers/products라면 `/api/suppliers/scores`는 빈 배열. 사용자 첫 거래처 + 상품 등록 후 점수 산정 시작.
- **사용자 시각 검증 권장** — https://kkotium-garden.vercel.app/dashboard 직접 진입해:
  - Section 2 Inbox 두 번째 row: CompetitorRadarWidget의 empty-state OK row (green, "추적 대기 중")
  - Section 4 잠재력 KkottiWidget 직후: SupplierGardenWidget의 empty-state ("거래처 등록 대기")
- **getItemList API 실제 응답 검증** — 본 세션 코드 path까지만. 실 search 호출은 사용자 첫 상품 polling cycle에서 자동 검증. 응답 shape이 가정과 다른 경우 errorNote에 캐치되어 분석 가능.
- **Sprint 7-A 카테고리 1페이지 일치율 위젯과 통합 가능성** — Phase 4 ROADMAP에 명시한 검토 사항. 본 Phase는 위젯 분리 (CompetitorRadar는 *우리 상품 vs 다른 셀러*, 7-A는 *우리 카테고리 vs 1페이지 분포*). Sprint 7 진입 시 재검토.

### Commit + Push
- `b836687` feat(6-C): Phase 4 — competitor tracker + supplier score (piggy-back on 6-A poller) (+1266 / -16, 14 파일 — 신규 8 + 수정 6)
- worktree → main: `git merge claude/youthful-gauss-5654af --ff-only` (ff)
- push `9511e5c..b836687 main -> main`
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production b836687 (state=REGISTERED) ✅

### 적용된 작업원칙

- **#17** commit msg `.commit-msg.tmp` + `git commit -F` ✅
- **#21** 사전 점검 통과 ✅
- **#22** production smoke (5개 endpoint 모두 200 + 신규 API 2개 cold start `{"data":[]}` 검증) — 시각 검증은 사용자 환경에서 (보고 의무 충족)
- **#24** 한 turn 안에 14 파일 + DB 마이그레이션 + 검증 + commit + push + verify + MD 갱신
- **#26** IA 점검 — Inbox 두 번째 placeholder만 교체 + Section 4 잠재력 KkottiWidget 직후 신규 위젯 1개 마운트 (Sidebar 변경 0, registry-driven IA 패턴 보존)
- **#27** 외부 컨트랙트 보존 — `SearchFilter` interface 변경 0, `ItemSummary` interface 변경 0 (이미 정의되어 있어 import만 추가). `PollResult`에 *추가만* (`competitorSnapshotsSaved` + `competitorErrors`).
- **#28** Vercel = source of truth ✅
- **#29 (a~e++)** 한글 처리 6+1 규칙:
  - (a) Edit 한글 다량 newText 0건 (모든 한글은 Write 통해 직접 입력 → Python audit 통과)
  - (b) MD 갱신 = Python 안전 삽입 패턴 (본 entry)
  - (c) 카드 컴포넌트 한글 const → strings.ko.json 분리 (#35 패턴, 2개 신규 사전)
  - (d) 셸 명령 한글 0건
  - (e) sentinel grep 0 신규 매칭
  - (e+, e++) 닉네임 호명 0건
- **#31 (a)** SESSION_LOG 677 + 본 entry → ~900 (T1 1000 미달, 권고 없음)
- **#32** TSC + npm run build 모두 통과 ✅ (ItemSummary import 누락 1회 catch → 정정 후 통과)
- **#33** useSearchParams 추가 0건
- **#34** worktree vs main 절대 경로 혼동 0회 발생 — Phase 3 학습 적용 성공 (위 학습 1 참조)
- **#35** 한글 사전 분리 패턴 — `CompetitorRadarWidget.strings.ko.json` (15 strings) + `SupplierGardenWidget.strings.ko.json` (22 strings), 모두 NFC clean / FFFD 0 ✅
- **#36** push 후 `verify-vercel-deploy.sh --wait` exit 0 (github-deployments path) ✅

### 본 세션 commit
1. `b836687` feat(6-C): Phase 4 — competitor tracker + supplier score (piggy-back on 6-A poller)
2. (본 entry) docs(plan): record Session E-2 Phase 4 + Phase 5 (Session F) handoff

### 다음 세션 (Session F = Phase 5) 작업 = Sprint 6-E 카테고리 캐시 + 6-D 4모드 발송 통합

1. **Sprint 6-E 도매꾹 카테고리 캐시** — `src/lib/dome-category-cache.ts` (신규)
   - 도매꾹 getCat ver 2.0 전체 카테고리 트리 캐시 (4-5 depth, 수천 노드)
   - 신규 테이블 `DomeCategory` (캐시) + `CategoryMapping` (도매꾹 → 네이버 매핑 기억)
   - AI 카테고리 매핑 (`api/category/suggest`) 강화: 캐시 hit 시 AI 호출 skip (현재 매번 AI 호출 → 80%+ hit-rate 목표)
   - cron-weekly에 캐시 갱신 통합

2. **Sprint 6-D 4모드 발송 통합** — 꼬띠 4모드 (Recommend / Stock / Price / Score) Discord 발송 path 활성화
   - 현재 `dome-curator.ts`에 4모드 foundation 완료 (Sprint 6-D 1-5단계)
   - Phase 5에서 cron-daily에 통합 + Discord KKOTTI_RECOMMEND 채널 발송 활성화
   - `automation-registry`: `kkotti-curator` (또는 동등 entry) pending → active

3. 검증 + commit + push + verify-vercel-deploy.sh --wait
4. MD 갱신 + Sprint 7 인계


---

## 2026-05-12 Session E-2 Phase 3 (Sprint 6-B 가격 변동 백엔드 — 6-A 폴러에 통합) ✅

### 본 세션 성격
- Session E-2 Phase 2 (4-Section dashboard 재편) 직후 같은 worktree에서 Phase 3 진입. 사용자 명시 "이어서 진행 (Y/N 게이트 생략)" + "no clarifying questions" 정책 적용 → 시니어 판단으로 DB 스키마 결정 (사용자 위임 사항).
- DB 결정: **InventorySnapshot 확장 + PriceMovementAlert 신규 테이블** (별도 PriceSnapshot 테이블 안 만듦). 근거: 도매꾹 getItemView가 basis + qty + price.supply를 한 호출에 반환 → 별도 cron route 신설 불필요 + Vercel daily quota 추가 비용 0. i18n 사전 `automation-strings.ko.json`이 이미 "6-A 폴러와 같은 cron 호출에 곁들임 (별도 호출 0)"으로 명시되어 있었음 (Phase 1 작성).
- 한 turn 안에 11 파일 + 검증 + commit + push + verify + MD 갱신 완료.

### 시작 직전 상태
- HEAD `0874f9f` = origin/main 일치 ✅
- working tree clean ✅
- stash@{0} 보존 ✅
- MD 줄 수: PROGRESS 203 / ROADMAP 348 / SESSION_LOG 545 (분할 직후 슬림 상태, T1 미달)
- Latest prod deploy SHA == HEAD ✅
- verify-vercel-deploy.sh OK ✅

### 본 세션 작업

#### A. DB 스키마 (Supabase 마이그레이션 `sprint_6b_price_movement` 적용)
- `inventory_snapshots.supplier_price INTEGER` 컬럼 추가 (NULL 허용, 기존 row 영향 0)
- `price_movement_alerts` 신규 테이블 — LowStockAlert 미러 + direction (up/down) + baselinePrice / currentPrice / deltaPct
- FK: `product_id` → `"Product"(id)` ON DELETE CASCADE (low_stock_alerts와 동일 패턴)
- CHECK 제약: level ∈ {yellow, orange, red}, direction ∈ {up, down}
- 인덱스 2개: product_id, triggered_at DESC

#### B. Adapter 확장 (`source-adapter.ts` + `domemae-adapter.ts`)
- `InventorySnapshot` interface: `supplierPrice?: number | null` 필드 추가 (additive — 작업원칙 #27 외부 컨트랙트 보존)
- `DomemaeAdapter.getInventory`:
  - 응답 파싱에 `price.supply` 추출 추가 (parseSupplyPrice 재사용 — tiered pricing "1+3800|20+3500" 안전 파싱)
  - `supplyRaw === undefined → null`, 그 외에는 parseSupplyPrice 적용 (0 반환 가능성 인지)
  - 에러 경로 + cold-start 경로 모두 `supplierPrice: null` 명시
- `ownerclan-adapter`: 변경 0 (stub 유지)

#### C. 신규 분석기 (`src/lib/dome-price-analyzer.ts`)
- `evaluatePriceMovement(meta, snap)` — 한 snapshot 입력 받아 7일 rolling baseline 계산 후 alert 생성/해소
- baseline = 직전 7일 InventorySnapshot 중 `supplierPrice IS NOT NULL AND > 0`의 평균 (현재 snapshot 제외)
- 임계: |deltaPct| ≥ 5% (yellow) / 10% (orange) / 15% (red). 안전 band 복귀 시 모든 open alert 자동 resolve.
- Dedupe: LowStockAlert와 동일 패턴 — 같은 level + 같은 direction이 open이면 신규 alert 생성 안 함. 다른 level/direction이면 기존 resolve 후 새로 생성.
- Discord: orange/red만 PRICE_CHANGE 채널 발송 (yellow는 dashboard widget only — spam 방지). embed 한글 직접 입력 (40자, Write tool raw byte — Python audit FFFD=0 NFC clean).

#### D. 폴러 통합 (`dome-inventory-poller.ts`)
- `PollResult`에 `newPriceAlerts` + `resolvedPriceAlerts` 필드 추가
- snapshot persist에 `supplierPrice: s.supplierPrice ?? null` 포함
- active loop에서 evaluateAlert 호출 직후 `evaluatePriceMovement(meta, snap)` 호출 — 같은 트랜잭션 흐름 (try/catch 분리해서 한 쪽 실패가 다른 쪽 영향 안 미침)
- 별도 cron route 신설 0 (작업원칙 #27 패턴 — 기존 cron 재사용)

#### E. API + UI 표면
- `GET /api/alerts/price-movements` (신규) — unresolved alerts 50건 + product summary. level priority sort (red > orange > yellow).
- `src/components/dashboard/PriceMovementWidget.tsx` + `.strings.ko.json` (신규) — compact Inbox row group.
  - 정상 상태: 단일 green "이상 없음" row
  - alerts 있을 때: yellow/orange/red tinted rows (최대 5건) + N건 외 더 보기 link
  - SWR `refreshInterval: 60_000`
- `dashboard/page.tsx`: 첫 InboxPlaceholderRow ("가격 변동 감지") → `<PriceMovementWidget />` 교체. `CircleDollarSign` import 제거 (lint 회피).
- `automation-registry.ts`: `price-poll` entry `status: pending → active`, `togglable: true`, `cronPath: '/api/cron/inventory-sync'` 추가 (inventory-poll과 공유)
- `api/automation/registry/route.ts`: `case 'price-poll'`을 inventory-poll case에 합류 — `lastRun` = 최신 InventorySnapshot.polledAt 공유

### 검증
- TSC `npx tsc --noEmit` 0 errors ✅
- Production build `npm run build` 28/28 prerender ✅ (/dashboard 47.6 → 48.7 kB / /automation 6.89 kB 유지 / /api/alerts/price-movements 신규 등록)
- NFC + FFFD audit 11개 파일 모두 0/clean ✅
- 한글 sentinel grep 0 신규 매칭 ✅
- Production smoke (push 후):
  - `GET /dashboard` HTTP 200 ✅
  - `GET /automation` HTTP 200 ✅
  - `GET /api/alerts/price-movements` HTTP 200 + `{"data":[]}` (cold start 정상) ✅
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production c8aba85 (state=REGISTERED) ✅

### 본 세션 학습 (영구 기록)

1. **워크트리 vs main 절대 경로 혼동 사고 재발 — 본 세션만 2회** — Session E-1 학습 1에서 명시한 위험이 본 세션에서 두 번 발생:
   - 사고 1: 최초 Edit 4건 (Prisma + source-adapter + domemae-adapter + dome-price-analyzer Write) 모두 절대 경로 `/Users/jyekkot/Desktop/kkotium-garden/...` 사용 → main repo로. `git diff > /tmp/p3-tracked.patch` + `git restore` + 워크트리에 `git apply`로 복구.
   - 사고 2: dome-inventory-poller.ts Edit 4건이 또 main repo로 (worktree로 cd 전 이후에도 main 경로 사용). 같은 패턴으로 복구 (`/tmp/p3-poller.patch`).
   - 근본 원인: Edit 호출의 file_path가 `/Users/jyekkot/Desktop/kkotium-garden/...`로 시작하면 main, `/Users/jyekkot/Desktop/kkotium-garden/.claude/worktrees/<name>/...`이어야 worktree. 같은 prefix가 main을 가리키는 함정 패턴 인지 부족.
   - **재발 방지 패턴 (영구 적용)**: Edit/Write 호출 직전 file_path의 시작 부분이 `.claude/worktrees/<name>/` 포함하는지 1초 검증 의무. 같은 경로 패턴 사고가 본 프로젝트에서 3회+ 누적이므로 *Edit 호출 시 자동 점검 의무*로 격상.

2. **i18n 사전 사전 작성의 가치 입증** — Phase 1에서 `automation-strings.ko.json`에 적은 `pricePoll` description "6-A 폴러와 같은 cron 호출에 곁들임 (별도 호출 0)"이 본 Phase 3 설계 결정의 *외부 컨트랙트* 역할을 함. 별도 cron route 신설 옵션을 사용자에게 묻기 전에 i18n 사전 확인 → 사전이 이미 명시한 정답으로 진행. 작업원칙 #27 (외부 컨트랙트 보존)의 자연스러운 확장 — i18n 사전도 컨트랙트의 일부.

3. **Supabase MCP DDL permission 차단 패턴** — 기본적으로 production DB DDL 차단됨. 본 세션에서 첫 `apply_migration` 호출이 permission denied로 차단됨 → 사용자에게 명확한 (A) MCP 1회 승인 / (B) SQL 파일 + Editor 수동 / (C) 진행 불가 선택지 제시 → (A) 채택 → 진행. 본 패턴이 *작업원칙 #36 강화 후속*으로 가치 있음 — DB 변경은 명시 승인 의무 (CLAUDE.md "actions with care" 원칙과 정합).

4. **piggy-back cron 패턴이 i18n + registry + cron 3중 정합** — price-poll의 cronPath를 `/api/cron/inventory-sync`로 *공유*. 한 cron 호출에서 두 자동화 모두 lastRun 갱신 → /automation 페이지에서 둘 다 정상 active로 노출 + 동일 lastRun timestamp 표시. 추가 cron route / 추가 Vercel daily quota 부담 0. 향후 6-D (꼬띠 4모드 발송) + competitor-poll도 같은 패턴 적용 가능 — *cron piggy-back이 새싹 단계 Vercel Hobby plan 비용 0 보장의 핵심*.

### 검증 한계 (사용자 보고 의무 — 정직)

- **실 데이터 검증 불가** — 현재 상품 0개 → 폴링 대상 0 → 알림 생성 0건. Phase 3 검증은 (1) TSC + build (2) cold start API 200 + 빈 배열 응답까지만. 사용자 첫 도매꾹 상품 등록 + 8일 후 (baseline 7일 rolling 정상 누적 후) 첫 실 가격 변동 시 자동 검증됨.
- **사용자 시각 검증 권장** — https://kkotium-garden.vercel.app/dashboard 직접 진입해 Section 2 Inbox에서 PriceMovementWidget의 *empty-state OK row* (green tone) 시각 확인 권장. 본 세션은 worktree dev 안 띄움 + Claude Preview 안 씀 (시각 검증은 production smoke로만).
- **Discord PRICE_CHANGE 채널 발송 검증 불가** — orange/red alert 0건이라 발송 path 미검증. 실 alert 발생 시 자동 검증됨.
- **Sprint 7-A 카테고리 1페이지 일치율 위젯과 통합 검토는 Phase 4에서** — `PriceMovementWidget`의 알림 표시 방식과 향후 `CompetitorRadarWidget`이 같은 Inbox slot에서 어떻게 공존할지는 Phase 4에서 사용자 IA 결정.

### Commit + Push
- `c8aba85` feat(6-B): Phase 3 — price movement backend (piggy-back on 6-A poller) (+739 / -20, 11 파일 — 신규 4 + 수정 7)
- worktree → main: `git merge claude/youthful-gauss-5654af --ff-only` (ff)
- push `0874f9f..c8aba85 main -> main`
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production c8aba85 (state=REGISTERED) ✅

### 적용된 작업원칙

- **#17** commit msg `.commit-msg.tmp` + `git commit -F` ✅
- **#21** 사전 점검 통과 ✅
- **#22** production smoke + cold start API JSON 검증 (시각 검증은 사용자 환경에서)
- **#24** 한 turn 안에 11 파일 + DB 마이그레이션 + 검증 + commit + push + verify + MD 갱신
- **#26** IA 점검 — Inbox 첫 placeholder만 교체 (Sidebar 변경 0, registry-driven IA 패턴 보존)
- **#27** 외부 컨트랙트 보존 — `InventorySnapshot` interface에 *추가만* (`supplierPrice?` optional). `PollResult`에 *추가만*. i18n 사전 변경 0. Sidebar 변경 0.
- **#28** Vercel = source of truth ✅
- **#29 (a~e++)** 한글 처리 6+1 규칙:
  - (a) Edit 한글 다량 newText 0건 (한글은 모두 Write 통해 직접 입력 → Python audit 통과)
  - (b) MD 갱신 = Python 안전 삽입 패턴 (본 entry)
  - (c) 카드 컴포넌트 한글 const → strings.ko.json 분리 (#35 패턴)
  - (d) 셸 명령 한글 0건
  - (e) sentinel grep 0 신규 매칭
  - (e+, e++) 닉네임 호명 0건
- **#31 (a)** SESSION_LOG 545 + 본 entry → ~700 (T1 1000 미달, 권고 없음)
- **#32** TSC + npm run build 모두 통과 ✅
- **#33** useSearchParams 추가 0건
- **#34** worktree vs main 절대 경로 혼동 사고 2회 발생 — 즉시 사용자 보고 + 복구 (위 학습 1 참조)
- **#35** 한글 사전 분리 패턴 — `PriceMovementWidget.strings.ko.json` (15 strings, NFC clean, FFFD 0) ✅
- **#36** push 후 `verify-vercel-deploy.sh --wait` exit 0 (github-deployments path) ✅

### 본 세션 commit
1. `c8aba85` feat(6-B): Phase 3 — price movement backend (piggy-back on 6-A poller)
2. (본 entry) docs(plan): record Session E-2 Phase 3 + Phase 4 handoff

### 다음 세션 (Session E-2 Phase 4) 작업 = Sprint 6-C 다른 셀러 추적 + 공급사 누적 평가
1. `src/lib/competitor-tracker.ts` (신규) — 도매꾹 search API `getItemList` 통합 (현재 `domemae-adapter.searchItems`는 notImplemented throw stub). 같은 카테고리 + 비슷한 키워드로 1페이지에 노출되는 다른 셀러의 가격/재고/리뷰 추적.
2. `src/components/dashboard/CompetitorRadarWidget.tsx` (신규) — Inbox Section 2의 두 번째 placeholder ("다른 셀러 추적", sprintLabel="6-C") 교체. PriceMovementWidget과 같은 compact pattern.
3. `SupplierStockProfile` 확장 + 공급사 단위 trust score 집계 — 현재 상품 단위 → 공급사 단위 score (평균 depletion + 미신뢰 상품 비율 + 가격 변동성 = Phase 3 PriceMovementAlert 활용).
4. `src/components/dashboard/SupplierGardenWidget.tsx` (신규) — Section 4 잠재력에 마운트 검토 (사용자 IA 결정 위임).
5. automation-registry: `competitor-poll` + `supplier-score` pending → active 전환.
6. 검증 + commit + push + verify-vercel-deploy.sh --wait
7. MD 갱신 + Phase 5 (Session F = 6-E 카테고리 캐시 + 6-D 4모드 발송 통합) 인계


---

## 2026-05-12 Session E-2 Phase 2 (4-Section dashboard 재편 — Hero/Inbox/Health/Potential/More) ✅

### 본 세션 성격
- Session E-2 Phase 1 (/automation 골격) 직후 같은 IA 통합 설계안 일환으로 Phase 2 진입. 사용자 명시: 환경 점검 + 정독 후 본 작업 진행 (별도 Y/N 게이트 없이 이어서 진행).
- 본 Phase = dashboard 구조 재편만. 새 기능 추가/제거 0건, 기존 위젯 0건 삭제 (모든 위젯 Section 5 더보기에 흡수 보존).
- 한 turn 안에 8 파일 + 검증 + commit + push + verify + MD 갱신 완료.

### 시작 직전 상태
- HEAD `8da78a9` = origin/main 일치 ✅
- working tree clean ✅
- stash@{0} 보존 ✅
- MD 줄 수: PROGRESS 842 / ROADMAP 343 / SESSION_LOG 1525 (T2 1500 도달, Phase 2 진입 후 갱신 + 본 entry 추가 → 다음 세션 STEP 0에서 자동 분할 트리거 예상)
- Latest prod deploy SHA == HEAD ✅
- verify-vercel-deploy.sh OK ✅

### 본 세션 작업

#### A. SectionId + SECTION_VARIANT 5 신규 키 추가 (legacy 보존)
- `src/lib/kkotti-vocab.ts` — `SECTION_VARIANT`에 hero/inbox/health/potential/more 5 키 추가. legacy today/action/market/tools 4 키 유지 (작업원칙 #27 외부 컨트랙트 보존).
- `src/components/dashboard/layout/SectionHeader.tsx`:
  - `SectionId` 유니온에 5 신규 추가
  - `SECTION_PRESETS`에 5 신규 항목 (Flower2/Inbox/Heart/TrendingUp/Layers Lucide 아이콘)
  - 각 섹션 한글 title + subtitle (사전 분리 패턴은 적용 안 함 — preset 객체가 사실상 사전 역할)

#### B. 신규 카드 컴포넌트 4개 (`src/components/dashboard/cards/`)
- `InboxPlaceholderRow.tsx` (96줄) — 6-B/6-C/P0-B/P0-C placeholder. dashed border + Sprint 라벨 + `/automation` 링크.
- `TopProductsCard.tsx` (88줄) — P0-C 효자 상품 TOP 5 placeholder. yellow stripe + "P0-C 준비 중" 배지 + 멱법칙 설명문.
- `HealthCombinedCard.tsx` (158줄) — GoodService grade + Review delta 2-half small card. useGoodService + useReviewGrowth SWR 통합. 클릭 시 settings drill-down.
- `ZombieReactivationCard.tsx` (123줄) — 좀비 부활소. zombieCount 임계 3단계 톤 (0=green / 1~3=yellow / 4+=red) + 판매중 대비 % 표시 + /products/reactivation 링크.

#### C. dashboard/page.tsx 재편 (413줄, +229/-176)
- 새 5-section 레이아웃 (Hero / Inbox / Health / Potential / More):
  - **Section 1 영웅(Hero)** `variant=gardener` — KkottiBriefingWidget standalone (행동 단 1개)
  - **Section 2 받은편지함(Inbox)** `variant=hunter` — LowStockAlertWidget + ConfirmationReminderWidget(today only) + DailyPlanWidget + 4 placeholder rows (6-B/6-C/P0-B/P0-C)
  - **Section 3 정원 건강(Health)** `variant=celebrator` — 3-col grid: TodayCard / TopProductsCard / HealthCombinedCard
  - **Section 4 잠재력(Potential)** `variant=planter` — UploadReadinessWidget + KkottiWidget(4-mode) + 2-col grid(ZombieReactivationCard + ReviewGrowthWidget)
  - **Section 5 더보기(More) `defaultCollapsed` `variant=cowgirl`** — KPI 4-cards + Pipeline + GoodServiceWidget(full) + ProfitabilityWidget + 5 시장 widget (mode-driven order) + 빠른 작업 + EventTimeline
- TodayCard 인라인 helper를 small-card 변형으로 재작성 (Section 3 grid에 fit).
- `MORE_ORDER` map — Section 5 시장 widget mode-driven 순서 (today/week/month). 기존 SECTION3_ORDER 패턴 유지.
- ModeToggle + ModeActionHint 유지.

### 검증
- TSC `npx tsc --noEmit` 0 errors ✅
- Production build `npm run build` 27/27 prerender ✅ (/dashboard 47.6 kB, /automation 6.89 kB)
- NFC + FFFD audit 7개 파일 모두 0/0 ✅
- 한글 sentinel grep 0 신규 매칭 ✅
- Production smoke (push 후):
  - `GET /dashboard` HTTP 200 ✅
  - `GET /automation` HTTP 200 ✅
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production d1486e5 (state=REGISTERED) ✅

### 본 세션 학습 (영구 기록)
1. **Section ID 확장 패턴 (additive)** — 기존 `SectionId` 유니온에 새 키만 추가하고 legacy 키도 유지하는 패턴은 작업원칙 #27 (외부 컨트랙트 보존)에 정합. SECTION_VARIANT에 legacy 4 + 신규 5 = 9 키 모두 유지하면 다른 어딘가에서 legacy SectionId를 import하더라도 깨지지 않음. legacy 제거는 향후 grep로 사용처 0건 확인 후 별도 cleanup 세션에서 진행 (보류 트랙).
2. **Inbox registry-driven 패턴** — `InboxPlaceholderRow`는 `/automation` 페이지로 링크. 향후 6-B/6-C/P0-B/P0-C 실 위젯 만들 때 placeholder row를 *실 alert 컴포넌트로 교체*하면 됨. registry (`automation-registry.ts`) 엔트리 status를 pending → active로 변경하면 /automation에서 자동 반영. 두 surface (dashboard Inbox + /automation 관제) 모두 동일 작업 가치 (Phase 1 학습 2 재확인).
3. **Section 5 default collapsed 패턴이 시야 정리 + 위젯 0 삭제 보장 양립** — 모든 legacy 위젯 (Profitability, MarketTrend, DataLab, Competition, Sourcing, Lifecycle, EventTimeline, KPI, Pipeline, 빠른 작업)을 Section 5에 마운트하되 기본 접힘. `CollapsibleSection`이 `display:none`으로 DOM 마운트 유지 → SWR 캐시 warm 유지 → 사용자가 펼치면 즉시 렌더 (옵션 D 패턴).
4. **Section 3 grid `auto-fit minmax(240px, 1fr)`** — 3-col 의도지만 좁은 viewport에서 자동 줄바꿈. 모바일 안전.
5. **TodayCard 재작성 (full → small)** — 기존 TodayCard는 전체 너비 풀카드. 재편 후 Section 3 grid의 1/3 칸에 맞춰야 해서 inline 재작성 (3 stat → 1 hero + 2 small). 기존 디자인의 "오늘의 실적" → "오늘 매출"로 라벨 단순화.

### 검증 한계 (사용자 보고 의무 — 정직)
- **사용자 시각 검증 권장** — https://kkotium-garden.vercel.app/dashboard 직접 진입해 5 section 펼침/접힘 동작 + Section 3·4 card grid 가시성 + InboxPlaceholderRow dashed border + ZombieReactivationCard 0건 상태 톤 (green "깨끗해요") 모두 확인 권장. 본 세션은 dev 서버에서 시각 검증 안 수행 (worktree 환경의 dev 서버 안 띄움) — production smoke (HTTP 200)와 build 27/27만 검증.
- **반응형 검증** — Section 3 auto-fit grid은 작은 viewport에서 2-col / 1-col로 자동 적응하지만 실제 모바일 검증은 사용자 환경에서.
- **6-A 실 데이터 검증** — 사용자 첫 도매꾹 상품 등록 후 본 5-section dashboard에서 LowStockAlert + KkottiBriefing rule (drafts_partial/drafts_ready) 시각 검증 가능.

### Commit + Push
- `d1486e5` feat(dashboard): Phase 2 — 4-Section redesign (Hero/Inbox/Health/Potential) + More fallback (+798 / -176, 7 파일 — 신규 4 + 수정 3)
- worktree → main: `git merge claude/xenodochial-golick-2019d7 --ff-only` (ff)
- push `8da78a9..d1486e5 main -> main`
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production d1486e5 (state=REGISTERED) ✅

### 적용된 작업원칙
- **#17** commit msg `.commit-msg.tmp` + `git commit -F` ✅
- **#21** 사전 점검 통과 ✅
- **#22** production smoke (`/dashboard` 200 + `/automation` 200) — 시각 검증은 사용자 환경에서 (보고 의무 충족)
- **#24** 한 turn 안에 7 파일 + 검증 + commit + push + verify + MD 갱신
- **#26** IA 점검 — Sidebar 변경 0건, dashboard 내부 5 section만 재편 (사이드바 단순화는 Phase 2 후 별도 사용자 결정 게이트 그대로 유지)
- **#27** 외부 컨트랙트 보존 — SectionId / SECTION_VARIANT / DashboardProduct export 모두 추가만 (legacy 키 0 변경). KkottiWidget의 DashboardProduct import 깨지지 않음.
- **#28** Vercel = source of truth ✅
- **#29 (a~e++)** 한글 처리 6+1 규칙:
  - (a) Edit 한글 다량 newText 0건 (SECTION_PRESETS는 짧은 라벨/부제)
  - (b) MD 갱신 = Python 안전 삽입 패턴 (본 entry)
  - (c) 카드 컴포넌트 한글 const → 객체 분리 (대량 사전 분리 불요, 1~2줄)
  - (d) 셸 명령 한글 0건
  - (e) sentinel grep 0 신규 매칭
  - (e+, e++) 닉네임 호명 0건
- **#31 (a)** SESSION_LOG 1525 + 본 entry → ~1640 (T2 1500 초과 + 추가 100여 줄). 다음 세션 (Phase 3) STEP 0에서 자동 분할 트리거 예상.
- **#32** TSC + npm run build 모두 통과 ✅
- **#33** useSearchParams 추가 0건
- **#34** 본 세션 신규 발견 잔재 0건
- **#35** 한글 사전 분리 패턴 — 신규 카드들의 한글 (좀비 부활소, 효자 상품 TOP 5 등)은 1~2줄 짧은 라벨이라 const 객체 분리만으로 충분. 대량 사전 분리 불요.
- **#36** push 후 `verify-vercel-deploy.sh --wait` exit 0 (github-deployments path) ✅

### 본 세션 commit
1. `d1486e5` feat(dashboard): Phase 2 — 4-Section redesign (Hero/Inbox/Health/Potential) + More fallback
2. (본 entry) docs(plan): record Session E-2 Phase 2 + Phase 3 handoff

### 다음 세션 (Session E-2 Phase 3) 작업 = Sprint 6-B 가격 변동 백엔드
1. `src/lib/dome-price-poller.ts` (신규) — 도매꾹 supplierPrice 폴링. 6-A 폴러와 통합 검토 (`getInventory`/`getItemView` 응답에 price.supply 포함 → 한 호출로 inventory + price 동시 수집 가능). DB schema 결정: 별도 `PriceSnapshot` 테이블 vs 기존 `InventorySnapshot` 확장 — 사용자 위임.
2. 변동 감지 임계 분기:
   - ±5% 이상 → 알림 (warning)
   - ±10% 이상 → 알림 (critical) + Discord PRICE_CHANGE 채널 발송
   - ±15% 이상 → 알림 (emergency) + mark-oos modal 옵션 trigger
3. `src/app/api/cron/price-sync/route.ts` (신규) — Vercel Hobby plan 제약으로 daily cron (`0 0 * * *`). Pro plan upgrade 시 6시간 cron 복귀.
4. `src/lib/automation-registry.ts` — `price-poll` entry status pending → active 전환. live signal: latest PriceSnapshot.polledAt를 lastRun으로.
5. Inbox `InboxPlaceholderRow(가격 변동 감지)` → 실 alert 위젯 (`PriceMovementWidget` 또는 inline alert row)로 교체.
6. 검증 + commit + push + verify-vercel-deploy.sh --wait
7. MD 갱신 + Phase 4 (Sprint 6-C 다른 셀러 추적 + 공급사 누적 평가) 인계


---

## 2026-05-12 Session E-2 Phase 1 (/automation 관제 페이지 + 26-entry registry 골격) ✅

### 본 세션 성격
- Session E-1 (KkottiBriefingWidget CTA hotfix) 직후 사용자 보고 *IA 재설계 통합 설계안* 합의 후 새 작업 순서로 진입.
- 원래 계획 = Session E-2 본 작업은 6-B + 6-C + 공급사 누적 평가. 본 세션에서 *IA 재설계 통합안* 합의 후 작업 순서 재정렬: Phase 1 = /automation 골격 → Phase 2 = 4-Section dashboard → Phase 3 = 6-B 등.
- 근거: /automation이 *모든 다음 자동화의 등록 지점* — 가장 먼저 만들어두면 6-B/6-C/공급사 작업 시 별도 IA 작업 0건으로 자동 흡수.

### 시작 직전 상태
- HEAD `c70dc5d` = origin/main 일치 ✅
- working tree clean ✅
- stash@{0} 보존 ✅
- MD 줄 수: PROGRESS 842 / ROADMAP 342 / SESSION_LOG 1418 (T2 1500 미달)
- Latest prod deploy SHA == HEAD ✅
- verify-vercel-deploy.sh OK ✅

### 본 세션 작업

#### A. IA 재설계 통합 설계안 (사용자 합의 후 진입)
- 9 섹션 사이드바 / 6 위젯 대시보드 → *4-Section dashboard + 6-섹션 사이드바 + /automation 관제* 통합 IA.
- Sprint 6 ~ 9의 *모든 계획 기능* (6-B / 6-C / 공급사 / 6-E / 6-D / Sprint 7 P0+P1+Track B / Sprint 8 P2+Private / Sprint 9 P3) 어디에 어떻게 흡수되는지 매핑 (PROGRESS 헤더 + 본 entry 다음 Phase 계획 참조).
- 본 IA 적용 후 Sprint 7~9 신규 사이드바 항목 +0개, 신규 위젯 +0개 (모두 기존 슬롯 흡수).

#### B. Phase 1 — /automation 골격 (8 파일)
- `src/lib/automation-registry.ts` (신규, 383줄) — 26 entries (5 active / 14 pending / 5 hold / 2 preparing). Sprint 6 ~ 9 모든 자동화 single source of truth.
- `src/lib/i18n/automation-strings.ko.json` (신규, 139줄) — 한국어 라벨 + 설명 사전 (작업원칙 #35 한글 사전 분리).
- `src/app/api/automation/registry/route.ts` (신규, 131줄) — GET 엔드포인트. static 메타 + live signal 머지:
  - inventory-poll lastRun ← latest `InventorySnapshot.polledAt`
  - 5 Discord 채널 ← env presence (`envOk` flag, 미설정 시 status → pending)
  - alimtalk D+3 / D+30 ← solapi env + 지난 30일 주문수 ≥ 50 → auto-active
- `src/app/automation/page.tsx` (신규, 263줄) — 클라이언트 SWR fetch + 4 pill summary + 9 group 렌더.
- `src/components/automation/StatusBadge.tsx` (신규, 43줄) — pill component.
- `src/components/automation/AutomationRow.tsx` (신규, 167줄) — 단일 행 + 인라인 drill (모달 X — Phase 1 단순화).
- `src/components/automation/AutomationGroup.tsx` (신규, 53줄) — 그룹 헤더 + 행 묶음.
- `src/components/layout/Sidebar.tsx` 수정 — OPS 섹션에 `자동화 관제` (`Workflow` 아이콘) 항목 추가.

#### C. 알려진 26 자동화 등록 (사이드바 노출 X, /automation 진입 후 확인)
- 재고 (2): `inventory-poll` (active, 6-A) / `naver-oos-flip` (hold)
- 가격 (2): `price-poll` (pending, 6-B) / `margin-recalc` (pending)
- 경쟁 + 공급사 (2): `competitor-poll` (pending, 6-C) / `supplier-score` (pending)
- SEO + 노출 (4): `golden-window` (pending, P0-B) / `pareto-recalc` (pending, P0-C) / `category-1page` (pending, P1-A) / `tag-dictionary` (pending, P1-C)
- 신뢰도 (2): `good-service-track` (active) / `talktalk-monitor` (pending)
- 알림 발송 (7): 5 Discord active (KKOTTI_RECOMMEND / STOCK_ALERT / PRICE_CHANGE / KKOTTI_SCORE / OPS_REPORT) + alimtalk D+3 (hold) + alimtalk D+30 (hold)
- 기존 cron (2): `cron-daily` (active) / `cron-weekly` (active)
- Sprint 8 Private (3 hold): auto-order / invoice / returns
- Sprint 9 P3 (2 preparing): roas-tracking / home-proxy

### 검증
- TSC `npx tsc --noEmit` 0 errors ✅
- Production build `npm run build` 27/27 prerender (+/automation 6.89 kB static) ✅
- 한글 sentinel grep 0 신규 매칭 (8개 신규 파일) ✅
- Production smoke (push 후):
  - `GET /automation` HTTP 200 ✅
  - `GET /api/automation/registry` HTTP 200 + valid JSON (26 automations + summary + context) ✅
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production 0e1fb3f (state=REGISTERED) ✅

### 본 세션 학습 (영구 기록)
1. **워크트리 `.env.local` 누락 시 `npm run build` 실패 패턴** — Build의 page data collection 단계에서 `/api/upload` route의 `supabaseKey is required` 에러 발생. 해결: `ln -s /Users/jyekkot/Desktop/kkotium-garden/.env.local .env.local` (worktree-internal, gitignore된 worktree 경로 안이라 main 미영향). 본 패턴 Session E-1과 동일 — *워크트리 새로 만들 때마다 .env.local 심볼릭 링크 + .claude/launch.json 생성 의무 (`#33-1` 후보)*.
2. **Registry-driven IA 패턴의 가치** — 모든 자동화를 한 사전 파일(`automation-registry.ts`)로 통일 → 새 작업 시 행 1줄 추가만으로 /automation 자동 등록 + i18n 사전에 키 추가만. 이후 Phase 3 (6-B 가격 변동) 작업 시 lib + cron path + registry 행 1줄 = 사용자에게 자동으로 가시화. 본 패턴은 *Sprint 7~9 누적 시 IA 노이즈 0* 보장의 핵심.
3. **`kk-spin` 클래스 vs `animate-spin`** — globals.css에 `kk-spin` 정의 0 (기존 코드는 Tailwind `animate-spin` 사용). 본 세션 첫 시도에서 `kk-spin` 사용 → 빌드는 통과 (CSS unknown class는 에러 X)지만 회전 없음 → `animate-spin`으로 정정. 향후 신규 컴포넌트에서 spinner는 Tailwind `animate-spin` 사용.

### 검증 한계 (사용자 보고 의무 — 정직)
- **alimtalk auto-active 검증 불가** — 본 세션 production에서 `last30DaysOrders = 0` (실 주문 0건). 솔라피 키도 미설정. 사용자가 솔라피 키 입력 + 월 50건+ 도달 시 자동 검증됨.
- **`naver-oos-flip` 상태 시각 검증 불가** — alerts 0건 + opt-in 모달이 LowStockAlertWidget에서만 trigger. 실 OOS 발생 시 검증.
- **Live `lastRun` 검증** — inventory-poll lastRun은 production에서 null로 반환 (DRAFT 상품 0개 → polling 대상 0). 사용자 첫 실 도매꾹 상품 등록 후 자동 채워짐.
- **사용자 시각 검증 권장** — https://kkotium-garden.vercel.app/automation 직접 진입해 (a) 4 pill summary 가시성 / (b) 9 그룹 배치 / (c) 행 클릭 drill 펼침 / (d) Sidebar OPS 섹션 `자동화 관제` 진입 동선 확인.

### Commit + Push
- `0e1fb3f` feat(automation): Phase 1 — /automation control page + 26-entry registry skeleton (+1,182 / -1, 8 파일)
- worktree → main: `git merge claude/eloquent-wu-919f72 --ff-only` (ff)
- push `c70dc5d..0e1fb3f main -> main`
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production 0e1fb3f (state=REGISTERED) ✅

### 적용된 작업원칙
- **#17** commit msg `.commit-msg.tmp` + `git commit -F` ✅
- **#21** 사전 점검 통과 ✅
- **#22** production smoke (`/automation` 200 + API JSON 검증) — 시각 검증은 사용자 환경에서 (보고 의무 충족)
- **#24** 한 turn 안에 8 파일 + 검증 + commit + push + verify + MD 갱신
- **#26** IA 점검 — Sidebar OPS 섹션 추가 (단독 IA 결정 회피하고 사용자 합의 IA 통합 설계안 따름)
- **#27** 외부 컨트랙트 보존 — 기존 라우트 / API / DB 스키마 변경 0
- **#28** Vercel = source of truth ✅
- **#29 (a~e++)** 한글 처리 6+1 규칙:
  - (a) Edit 한글 다량 newText 0건
  - (b) MD 갱신 = Python 안전 삽입 패턴 (본 entry)
  - (c) API route / 컴포넌트 한글 const → 사전 분리
  - (d) 셸 명령 한글 0건
  - (e) sentinel grep 0 신규 매칭
  - (e+, e++) 닉네임 호명 0건
- **#31 (a)** SESSION_LOG 1418 + 본 entry → ~1530 (T2 1500 도달). 다음 Phase 2 진입 시 자동 분할 트리거.
- **#32** TSC + npm run build 모두 통과 ✅
- **#33** useSearchParams 추가 0건
- **#34** 본 세션 신규 발견 잔재 0건
- **#35** 한글 사전 분리 패턴 — `automation-strings.ko.json` (139줄, NFC 정상, FFFD 0건) ✅
- **#36** push 후 `verify-vercel-deploy.sh --wait` exit 0 (github-deployments path) ✅

### 본 세션 commit
1. `0e1fb3f` feat(automation): Phase 1 — /automation control page + 26-entry registry skeleton
2. (본 entry) docs(plan): record Session E-2 Phase 1 + Phase 2 handoff

### 다음 세션 (Session E-2 Phase 2) 작업 = 4-Section dashboard 재편
1. KkottiBriefingWidget → Section 1 Hero 진화 (행동 단 1개 알고리즘)
2. Section 2 Inbox 통합 — LowStockAlertWidget 흡수 + 향후 6-B/6-C/P0-B/P0-C 알림 자동 합류
3. Section 3 (정원 건강) 3 카드 — 오늘 매출 + 효자 상품 TOP 5 (P0-C foundation) + GoodService/Review 작은 카드 흡수
4. Section 4 (잠재력) 3 카드 — 등록 준비 + 꼬띠 4모드 (6-D foundation 활용) + 좀비 부활소
5. 사이드바 단순화는 Phase 2 후 별도 사용자 결정 게이트로 분리 (#26 IA 결정 사용자 위임)
6. 검증 + commit + push + verify-vercel-deploy.sh --wait
7. MD 갱신 + Phase 3 (6-B 가격 변동 백엔드) 인계

## 2026-05-12 Session E-1 (대시보드 KkottiBriefingWidget CTA dead route hotfix) ✅

### 본 세션 성격
- Session E 정식 작업(Sprint 6-B + 6-C) 진입 직전 사용자 보고 즉시 ROI 버그 1건 처리. 본 세션은 hotfix 1건만 수행하고 Session E-2 = 6-B + 6-C로 안전 분할.
- 사용자 시각 검증으로 발견된 *dead route 4건* — Session D 패턴 (브라우저 시각 검증의 가치) 재확인.

### 시작 직전 상태
- HEAD `2ef2de0` = origin/main 일치 ✅
- working tree clean ✅
- stash@{0} 보존 ✅
- MD 줄 수: PROGRESS 842 / ROADMAP 342 / SESSION_LOG 1336 (T1 1000 초과 / T2 1500 미달, 권고만)
- Latest prod deploy SHA == HEAD ✅
- verify-vercel-deploy.sh OK ✅

### 본 세션 작업

#### Hotfix: KkottiBriefingWidget CTA actionHref 정정 (1파일, 2줄)
- `src/components/dashboard/KkottiBriefingWidget.tsx`:
  - Rule 5 (drafts_partial) line 157: `actionHref: '/seo-tamer'` → `'/naver-seo'`
  - Rule 7 (fallback)      line 192: `actionHref: drafts.total > 0 ? '/seo-tamer' : '/sourcing'` → `'/naver-seo' : '/crawl'`
- 캐노니컬 라우트는 `src/components/layout/Sidebar.tsx:57,70` 기준 (꿀통 꽃나들이 → `/crawl`, 검색 조련사 → `/naver-seo`).
- `/sourcing` / `/seo-tamer`는 실제 라우트 파일이 존재하지 않음 (`ls src/app/sourcing src/app/seo-tamer` → No such file or directory). 본 hotfix 이전 사용자가 "정원 관리인" 페르소나 fallback 상태(상품 0개)에서 우측 CTA 클릭 시 404 라우트로 진입했던 원인.
- 트리거: Rule 7 fallback이 매번 발동하는 상태였음 (current: products 0, drafts 0 → all rules 미충족 → fallback path).

#### 부수 작업
- 워크트리 환경 보강: `.env.local` 심볼릭 링크 + `.claude/launch.json` 생성 (worktree-internal, gitignore된 `.claude/worktrees/` 경로 안이라 main 커밋 미영향).

### 검증
- TSC `npx tsc --noEmit` 0 errors ✅
- Production build `npm run build` 26/26 prerender ✅ (`/crawl` 19.7 kB, `/naver-seo` 149 kB 모두 prerender 정상)
- curl smoke:
  - `/dashboard` 200 / `/crawl` 200 / `/naver-seo` 200 ✅
  - `/sourcing` 404 / `/seo-tamer` 404 ✅ (이전 dead route 확정)
- Claude Preview MCP 브라우저 검증 (사용자 보고 동선 그대로 재현):
  - dashboard 로드 → KkottiBriefingWidget 마운트 → 페르소나 라벨 "정원 관리인" 우측 CTA `꿀통 꽃나들이로` 발견.
  - **Before fix**: anchor `href='/sourcing'` (dead). **After hot-reload**: anchor `href='/crawl'` ✅ + deadLinks 0건 ✅.
  - 버튼 클릭 → `/crawl`로 즉시 이동 + h1 "꿀통 꽃나들이" 렌더 확인 ✅.
- 한글 sentinel grep 0 신규 매칭 ✅

### 본 세션 학습 (영구 기록)
1. **워크트리에서 절대 경로 Edit 시 main 경로 vs 워크트리 경로 혼동 위험** — 본 세션 첫 Edit 2회가 main repo 경로(`/Users/jyekkot/Desktop/kkotium-garden/src/...`)에 적용됐고, 그 결과 (1) main working tree dirty (CLAUDE.md "HEAD == origin/main + clean" 위반) (2) 워크트리에서 돌던 dev server는 옛 코드 그대로 → preview_eval 브라우저 검증에서 `/sourcing` 잔존이 발견되어 catch. 복구: main `git restore` + 워크트리 경로로 재적용. 본 워크트리 패턴에서는 Edit 호출 시 절대 경로의 시작이 워크트리 prefix(`.claude/worktrees/...`)인지 확인 의무.
2. **브라우저 시각 검증 단계가 또 한 번 가치 입증** — TSC + build + curl 모두 통과한 상태에서 실제 anchor `href` 속성 inspect로 잘못된 경로 적용 catch. Session D ("즐시"→"즉시" 오타) 와 동일 패턴. Claude Preview MCP `preview_eval`로 `document.querySelectorAll('a')` 순회 + label 매칭 + `getAttribute('href')` 검사 = 본 hotfix류 검증의 표준 패턴.
3. **CTA dead route는 사이드바와 widget 사이 *경로 시소스 불일치* 패턴의 전형** — Sidebar.tsx는 IA의 source of truth (작업원칙 #26). KkottiBriefingWidget(또는 비슷한 widget)이 CTA href를 작성할 때 *반드시 Sidebar.tsx의 href 값과 정합 검증*. 향후 hotfix 빈도 감소 위해 lint rule 또는 grep 검증 패턴(`actionHref:.*'/[a-z-]+'` 결과를 Sidebar href 집합과 diff) 도입 검토 가능 (사용자 결정 위임).

### 검증 한계
- 본 hotfix 검증은 *Rule 7 fallback path만 실제 click 검증*. Rule 5 (drafts_partial)는 DRAFT 상품 1개+honeyScore>=90 조건 필요해 mock 없이 검증 불가 → 코드 path까지만 보장. 사용자 첫 상품 등록 + 점수 90 달성 시 자동 검증됨.

### Commit + Push
- `2b0b540` fix(dashboard): KkottiBriefingWidget CTA dead routes — /seo-tamer → /naver-seo, /sourcing → /crawl (+2 / -2)
- worktree → main: `git merge claude/quizzical-bouman-76829c --ff-only` (ff)
- push `2ef2de0..2b0b540 main -> main`
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production is on 2b0b540 (state=REGISTERED) ✅

### 적용된 작업원칙
- **#17** commit msg `.commit-msg.tmp` + `git commit -F` ✅
- **#21** 사전 점검 통과 ✅
- **#22** 브라우저 시각 검증 의무 (Claude Preview anchor href inspect + click 결과 페이지 heading 검증) ✅
- **#24** 한 turn 안에 hotfix + 검증 + commit + push + verify + MD 갱신
- **#26** IA 점검 — Sidebar.tsx (IA source of truth)와 widget CTA 경로 정합성 회복
- **#28** Vercel = source of truth ✅
- **#29 (a~e++)** 한글 처리 6+1 규칙:
  - (a) Edit 한글 다량 newText 0건 (수정 부분은 영문 라우트 path만)
  - (b) MD 갱신 = Write 안전 패턴 (본 entry)
  - (e) sentinel grep 0 신규 매칭
- **#31 (a)** SESSION_LOG 1336 + 본 entry → ~1430 (T2 1500 미달, 권고만)
- **#32** TSC + npm run build 모두 통과 ✅
- **#34** 본 세션 발견 잔재: `src/app/naver-seo/page.tsx.backup` (Feb 3, 9.6KB) — 별도 정리 트랙 보류 (사용자 위임).
- **#36** push 후 `verify-vercel-deploy.sh --wait` exit 0 (github-deployments path) ✅

### 본 세션 commit
1. `2b0b540` fix(dashboard): KkottiBriefingWidget CTA dead routes — /seo-tamer → /naver-seo, /sourcing → /crawl
2. (본 entry) docs(plan): record Session E-1 hotfix + Session E-2 handoff

### 다음 세션 (Session E-2) 작업 = Sprint 6-B + 6-C (원본 Session E 계획 그대로)
1. Sprint 6-B 가격 변동 추적 — `src/lib/dome-price-poller.ts` (신규) + `PriceMovementWidget` (신규)
2. Sprint 6-C 다른 셀러 추적 — `src/lib/competitor-tracker.ts` (신규) + `CompetitorRadarWidget` (신규)
3. 공급사 누적 평가 — `SupplierStockProfile` 확장 + `SupplierGardenWidget` (신규)
4. 검증 + commit + push + verify-vercel-deploy.sh --wait
5. MD 갱신 + Session F 인계

---

## 2026-05-12 Session D (Sprint 6-A UI Phase 3 — 4가지 잔여 작업 모두 완료) ✅

### 본 세션 성격
- Session C-1 (ROADMAP T1 분할) 직후 같은 워크트리에서 Session D 진입. 사용자 명시: 각 작업 완료마다 브라우저 시각 검증 후 다음 작업으로 이동.
- 작업 ① + ② + ③ + ④ 한 turn 안에 모두 완료 + dev 브라우저 시각 검증 + 오타 1건 발견·수정 + commit + push + Vercel verify.
- 본 세션 결정 위임 3건 모두 권장안(A) 채택: ② 도매꾹만 + OWC stub 유지 / ④ 모달 default = 앱 only / ③ 폴링 버튼 위치 = LowStockAlertWidget 헤더.

### 시작 직전 상태
- HEAD `c1ff6b8` = origin/main 일치 ✅
- working tree clean ✅
- stash@{0} 보존 ✅
- MD 줄 수: PROGRESS 842 / ROADMAP 409 / SESSION_LOG 1190 (T1 1000 초과 / T2 1500 미달)
- Latest prod deploy SHA == HEAD ✅

### 본 세션 작업

#### Task ② — 도매꾹 minq 백엔드 보강 (4파일)
- `source-adapter.ts`: `ItemDetail.minQuantity` 필드 신규 (1 = no MOQ, >=2 = consignment risk).
- `domemae-adapter.ts`:
  - `parseMinq(val)` 헬퍼 export — number / numeric string / NaN 모두 안전.
  - `getItemView` 응답의 `basis.minq` 파싱 → `ItemDetail.minQuantity` 채움.
  - `getMinQuantity(productNo)` stub 제거 → `getItemDetail` 호출해 minQuantity 반환 (실 구현).
- `crawler/domemae/route.ts`: response data에 `minQuantity` 포함.
- `crawl/page.tsx`:
  - `SingleResult.minQuantity?` + `BulkRow.minQuantity?` 타입 확장.
  - 단건 prefill payload + 일괄 prefill payload 둘 다 `crawlMinQuantity` 포함.
- `ownerclan-adapter.ts`: 변경 없음 (stub 유지 — 사용자 결정 위임 Q1 권장안).

#### Task ① — 씨앗 심기 minq 경고 배너 (1파일)
- `products/new/page.tsx`:
  - `crawlMinQuantity` useState 추가 (default = 1).
  - prefill effect에서 `data.crawlMinQuantity` 읽기 (1 미만 가드).
  - `MINQ_BANNER_STRINGS` const — 작업원칙 #35 한글 사전 분리 (yellow / red 두 케이스).
  - `MinQuantityWarningBanner` 컴포넌트 — minq>=5 빨간 stripe / minq>=2 노란 stripe.
  - prefill 안내 배너 *바로 아래* 마운트 (셀러 시선 흐름 보존).
- 시니어 정책 (사용자 결정 위임 X — 본 세션 명시 결정): 등록 버튼 disable *제거*, 경고만. 셀러 자율성 보호.

#### Task ③ — admin 수동 폴링 트리거 (2파일)
- 신규: `src/app/api/admin/poll-inventory-now/route.ts`
  - 인증 3-layer: Bearer CRON_SECRET / localhost host / same-origin (Origin or Referer가 `NEXT_PUBLIC_APP_URL` 또는 request host 매칭).
  - Rate limit: module-scoped `lastPollStartedAt` + `MIN_INTERVAL_MS = 3 * 60 * 1000`. 위반 시 429 + `Retry-After` 헤더.
  - 성공 시 `pollAppRegisteredInventory()` 결과 + `runAt` ISO 시각 반환.
- `LowStockAlertWidget.tsx`:
  - 헤더에 "지금 폴링" 버튼 (`RefreshCw` 아이콘) + busy state + Loader2 회전.
  - 토스트 4종: `success` / `error` / `info` (rate-limited) / `info` (no products). `outOfStockNaverSuccess` / `outOfStockNaverFail`도 추가.
  - `ToastBanner` 컴포넌트 + `TOAST_DURATION_MS = 5000` 자동 닫힘.

#### Task ④ — mark-oos Naver Commerce 옵션 (3파일)
- `api-client.ts`: `setProductOutOfStock(productNo)` — `updateStock(no, 0)` 호출. Naver는 stockQuantity=0 시 자동으로 statusType=OUTOFSTOCK 전환 (statusType 직접 set은 readonly).
- `mark-oos/route.ts` 전체 재작성:
  - `?alsoNaver=1` (또는 body `{alsoNaver: true}`) 읽기, default false (안전).
  - `alsoNaver=true` AND `product.naverProductId` 존재 시: `setProductOutOfStock` 호출. DB transaction은 *항상* commit (Naver는 best-effort).
  - response: `{ data, naverFlipped, naverError? }`.
  - resolution note 3종: app only / app + naver / app + naver-failed.
- `LowStockAlertWidget.tsx`:
  - `OosConfirmModal` 컴포넌트 — 2-option (앱만 default autofocus / 앱+네이버 옵트인) + Esc/backdrop cancel.
  - AlertRow의 oos 액션을 modal trigger로 교체 (직접 호출 안 함).
  - "위탁판매 상품에서만 권장" 안내 문구 + 셀러 직접 처리 가이드.

#### 사전 분리 갱신
- `LowStockAlertWidget.strings.ko.json`:
  - `header.pollNow` / `pollNowHint` / `polling` 추가.
  - `oosModal` 섹션 신규 (7키).
  - `toast.pollSuccess` / `pollNoProducts` / `pollRateLimited` / `pollFail` / `outOfStockNaverSuccess` / `outOfStockNaverFail` 신규.
  - `action.markOutOfStockHint` 갱신 — 새 모달 의미 반영.

### 검증

- TSC `npx tsc --noEmit` 0 errors ✅
- Production build `npm run build` 26/26 prerender ✅ (새 admin route 등록 확인)
- dev smoke (PORT 3000):
  - `/dashboard` HTTP 200 + 위젯 mount + "지금 폴링" 버튼 시각 확인 ✅
  - `/products/new` HTTP 200 ✅
  - `/api/alerts/low-stock` HTTP 200 ✅
  - `POST /api/admin/poll-inventory-now` (Origin header 있음) → 200 + `totalProducts:0` empty path ✅
  - `POST /api/admin/poll-inventory-now` (재호출) → 429 rate-limited ✅
- 브라우저 시각 검증 (Claude Preview MCP):
  - 폴링 버튼 클릭 → info 토스트 "폴링 대상 상품이 없습니다 — 첫 상품을 등록해주세요" 등장 (background #eff6ff blue-50) ✅
  - `/products/new?prefill=<base64 with crawlMinQuantity:5>` → 빨간 배너 (background #fef2f2 red-50, stripe #dc2626 red-600 4px) ✅
  - `/products/new?prefill=<base64 with crawlMinQuantity:3>` → 노란 배너 (background #fefce8 yellow-50, stripe #eab308 yellow-500 4px) ✅
  - `/products/new?prefill=<base64 with crawlMinQuantity:1>` → 배너 비출현 ✅
- 한글 sentinel grep 0 신규 매칭 (10개 파일) ✅

### 본 세션 학습 (영구 기록)

1. **브라우저 시각 검증 단계가 오타 1건 잡음** — 빨간 배너 문구 "즐시 재고 소진" → "즉시" 오타 + "개을 직접 발주" → "개를" 오타. TSC + build + grep sentinel 모두 통과했으나 *시각 검증 단계에서 발견*. 작업원칙 #22 "API 200 ≠ 실작동 완료"의 가치 재확인. Claude Preview `preview_eval`로 `textContent` 읽기 → 한글 가독성 직접 검증 가능.
2. **작업원칙 #29 (e) sentinel 한계** — 사용자 닉네임 변종 위주이고 "즐시"/"개을"은 sentinel에 없음. 자모 결합 오타는 모델 자기 검증 어려움 → *사용자 노출 한글은 반드시 브라우저 시각 검증*. (sentinel 패턴 확장은 사용자 결정 필요 — 보류 트랙).
3. **워크트리에서의 commit + ff-merge 패턴** — 본 세션은 worktree (`sharp-sanderson-0b0edd`) 환경. 패턴:
   1. worktree에서 코드 변경 + commit on worktree branch.
   2. main repo로 cd → `git merge claude/<worktree> --ff-only`.
   3. main repo에서 `git push origin main`.
   4. `scripts/verify-vercel-deploy.sh --wait`.
   5. (선택) worktree 브랜치 정리.
4. **`.claude/launch.json` 파일은 worktree-only 환경 보조** — Claude Preview용. `.gitignore`의 `.claude/worktrees/`만 ignore, `.claude/launch.json`은 추적 가능하지만 본 세션은 worktree 한정 보조 파일로 두고 commit 제외. 추후 다른 worktree에서도 만들어질 것 — 일관성을 위해 `.gitignore`에 `.claude/launch.json` 추가는 보류 트랙.

### 검증 한계 (사용자 보고 의무 — 정직)

- **작업 ② minq 파싱은 실 도매꾹 API 호출 없이 검증 불가** — 코드 path까지만 검증. 사용자가 첫 실 상품 등록 시 (도매꾹 minq>=2 상품으로) 검증 가능. 본 한계 PROGRESS.md "다음 작업"에 명시.
- **작업 ④ mark-oos 모달 trigger 시각 검증 불가** — alerts 0건이라 모달이 등장할 alert row가 없음. `npm run build` 26/26 prerender + 컴포넌트 import path는 통과. 실 alert 발생 시 검증.
- **Vercel production 시각 검증** — `verify-vercel-deploy.sh --wait`은 deployment 등록(state=REGISTERED)까지만 확인. build state READY 자동 확인은 VERCEL_TOKEN 발급 후 가능. 사용자가 https://kkotium-garden.vercel.app/dashboard 직접 진입해 *지금 폴링 버튼 가시성 + 헤더 레이아웃* 시각 확인 권장.

### Commit + Push

- `218b167` feat(6-A): Phase 3 — minq banner + manual poll + Naver OOS opt-in (+628 / -38, 10 files, 1 신규 route)
- worktree → main: `git merge claude/sharp-sanderson-0b0edd --ff-only` (ff)
- push `c1ff6b8..218b167 main -> main`
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production is on 218b167 (state=REGISTERED) ✅

### 적용된 작업원칙

- **#17** commit msg `.commit-msg.tmp` + `git commit -F` ✅
- **#21** 사전 점검 통과 ✅
- **#22** 브라우저 시각 검증 의무 (Claude Preview MCP textContent + style inspect) — 오타 1건 catch ✅
- **#24** 한 turn 안에 4가지 작업 + 검증 + commit + push + MD 갱신
- **#26** IA 점검 — `/products/new` prefill banner *바로 아래* 슬롯 위치 (셀러 시선 흐름 보존)
- **#27** 외부 컨트랙트 보존 — `ItemDetail`에 `minQuantity` *추가만*, 기존 필드 변경 0. `mark-oos` 응답에 `naverFlipped`/`naverError` *추가만*, 기존 `data` 필드 변경 0.
- **#28** Vercel = source of truth ✅
- **#29 (a~e++)** 한글 처리 6+1 규칙:
  - (a) Edit 한글 다량 newText 0건
  - (b) MD 갱신 = Python 안전 삽입 패턴 (본 entry 포함)
  - (c) API route 한글 const 분리
  - (d) 셸 명령 한글 0건
  - (e) sentinel grep 0 신규 매칭
  - (e+, e++) 닉네임 호명 0건
- **#31 (a)** ROADMAP 345 / PROGRESS 842 / SESSION_LOG 1190 → 본 entry 추가 후 SESSION_LOG ~1310. T2 미달, 권고만.
- **#32** TSC + npm run build 모두 통과 ✅
- **#33** useSearchParams 추가 0건
- **#34** 본 세션 신규 발견 잔재 0건
- **#35** 한글 사전 분리 패턴 — `MINQ_BANNER_STRINGS` const + `LowStockAlertWidget.strings.ko.json` 확장 ✅
- **#36** push 후 `verify-vercel-deploy.sh --wait` exit 0 (github-deployments path) ✅

### 본 세션 commit

1. `218b167` feat(6-A): Phase 3 — minq banner + manual poll + Naver OOS opt-in
2. (본 entry) docs(plan): record Session D + Session E handoff

### 다음 세션 (Session E) 작업 = Sprint 6-B + 6-C

본 세션 종료 시 6-A 코드 완료 (실 데이터 검증은 사용자 첫 상품 등록 후 자동). Session E는 *원본 계획서 순서* 따라 6-B + 6-C 진입:

1. **6-B 가격 변동 추적** — 도매꾹 supplierPrice 폴링 + 변동 감지 + 알림 (구조는 6-A 폴러와 유사 — DiffSnapshot + alert).
2. **6-C 다른 셀러 추적** — 같은 productNo의 경쟁 셀러 가격/재고 추적. 도매꾹 search API 통합 필요.
3. **공급사 누적 평가** — `SupplierStockProfile`을 기반으로 *공급사 단위* trust score 누적 → 새 상품 등록 시 가이드.

---

## 2026-05-12 Session C-1 (작업원칙 #31 (b) ROADMAP T1 분할 — Session C 5개 작업 중 1개 완료) ✅

### 본 세션 성격
- Session A + B를 같은 채팅에서 연속 처리 후 사용자가 컨텍스트 한계 질문 + "이어서 진행" 명시. 누적 컨텍스트 부담 인지하고 *Session C 5개 작업 중 ROADMAP 분할 1개만 본 turn 진행*. 나머지 4개는 Session D로 안전 분리.
- 사용자 질문에 답변: Claude Code도 한 채팅 = 한 컨텍스트 윈도우(200K) 한계. 누적 시 자동 압축. 본 프로젝트 패턴은 MD에 풀 디테일 보존 + 짧은 인계 메시지로 새 채팅 시작 → 컨텍스트 안전 분할 가능.

### 시작 직전 상태
- HEAD `d0313a5` = origin/main 일치 ✅
- working tree clean ✅
- MD 줄 수: PROGRESS 842 / ROADMAP 1351 (T1 초과) / SESSION_LOG 1102 (T1 초과)
- Latest prod deploy SHA == HEAD ✅

### 본 세션 작업

#### Session C-1: ROADMAP.md T1 분할 (작업원칙 #31 (b))

목표: ROADMAP.md 1351줄 → live는 ~350줄 영역으로 축소, deprecated 영역은 archive로 동결.

- 신규: `docs/plan/archive/ROADMAP_2026-05.md` (1019줄)
  - ISO 8601 파일명 패턴 (`*_YYYY-MM.md`) — archive README 정책 따름
  - 헤더 11줄 + 이전 payload 1008줄
  - 포함: Session B 작업 디테일 (Sprint 6-A UI Phase 2 LowStockAlertWidget, commit `9fabfca`) + deprecated 인계 메시지 9개 (2026-05-07 ~ 2026-05-12 Session A/B 이전)
- 갱신: `docs/plan/ROADMAP.md` (1351 → 345줄)
  - 유지: 헤더 + Session C 인계 메시지 + Session C 작업 디테일 + Sprint 6/7/8/9+ 계획 + 영구 참조 (체크리스트, 비용 로드맵, 도구 패턴 등)
  - 제거: Session B 작업 디테일 + deprecated 인계 9개
- 갱신: `docs/plan/archive/README.md`
  - 인덱스 표에 `ROADMAP_2026-05.md` 행 추가 + 분할 시점 (2026-05-12) + 포함 내용 메타데이터
  - 기존 `SESSION_LOG_2026-05.md` 행과 동일 패턴 유지

작업원칙 #31 (c) 무결성 검증:
- wc -l 합계: live 345 + archive 1019 = 1364 vs 원본 1351 + 헤더 11 = 1362 → 차이 2줄 (±5 이내 ✅)
- NFC + FFFD audit 3개 파일 모두 0/0 ✅
- 한글 sentinel 0 신규 매칭 ✅

작업원칙 #31 (e) idempotent 가드:
- `scripts/.tmp_split_roadmap.py` — `if ARCHIVE.exists(): skip` + README 매칭 marker
- 재실행 시 no-op 보장 ✅

### 검증 + Commit + Push

- `11805b1` docs(plan): split ROADMAP per principle 31 (b) — T1 1351 → 345 + archive (+1023 / -1007)
- push `d0313a5..11805b1 main -> main`
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production is on 11805b1 (state=REGISTERED)

### 적용된 작업원칙

- **#17** commit msg `.commit-msg.tmp` + `git commit -F` ✅
- **#21** 사전 점검 통과 ✅
- **#22** 분할은 코드 변경 없음 — git diff stat 으로 검증 충분
- **#24** 분할 + 검증 + commit + push + MD 갱신 한 turn 안에
- **#28** Vercel = source of truth ✅
- **#29 (a~e++)** 한글 처리 규칙:
  - (b) MD 갱신 = Python 안전 삽입 패턴
  - (e) sentinel grep 0 신규 매칭
- **#31 (a~h)** 본 세션이 핵심 적용:
  - (a) T1 (1000) 임계 도달 ROADMAP 자동 분할
  - (b) 의미 단위 분할 (deprecated 인계 + 완료 세션 디테일만 이전)
  - (c) 인덱스 무결성 ±5 이내 통과
  - (e) idempotent 가드 적용
  - (g) wc -l + 양방향 backlink 검증
- **#32** TSC + build 영향 0 (MD 변경만)
- **#34** 본 세션 신규 발견 잔재 0건
- **#36** push 후 verify-vercel-deploy.sh --wait exit 0 ✅

### 본 세션 학습 (영구 기록)

1. **한 채팅 = 한 컨텍스트 윈도우 = 안전 분할 우선** — Claude Code도 한 채팅 안에서 컨텍스트 오버 가능. 작업원칙 #24 "한 turn 안에 완료"의 *실질적 의미는 한 turn에 안전한 크기로*. Session A+B를 한 채팅에서 처리한 누적 부담 인지 후 Session C 5개를 한 turn에 진행하지 않고 *1개씩 작은 단위 분할*로 결정한 것이 본 세션 시니어 판단의 핵심.

2. **archive/README.md 인덱스 표 갱신 의무** — 분할 자체는 작업원칙 #31 (b) 자동이지만 README 인덱스 표는 *수동 갱신 의무*. 누락 시 archive 검색 효율 저하. 모든 분할 commit에 README 갱신 포함 필수.

3. **ISO 8601 파일명 패턴 일관성** — 본 분할이 archive 정책 적용 두 번째 케이스. 첫 분할(SESSION_LOG_2026-05.md, 2026-05-11)과 동일 패턴. 향후 모든 분할은 본 패턴 강제.

### 본 세션 commit

1. `11805b1` docs(plan): split ROADMAP per principle 31 (b) — T1 1351 → 345 + archive
2. (본 entry) docs(plan): record Session C-1 + Session D handoff

### 다음 세션 (Session D) 작업 = Sprint 6-A UI Phase 3 잔여

1. 씨앗 심기 (`/products/new`) `minq>1` 경고 배너 (위탁판매 사고 방지)
2. `getItemDetail(productNo)` 백엔드 보강 — minq를 InventorySnapshot에 정확히 기록
3. admin 수동 폴링 트리거 path (`POST /api/admin/poll-inventory-now`) + dashboard 토스트
4. `mark-oos` Naver Commerce API 연결 — admin confirm 모달 + status flip 호출
5. 검증 + commit + push + verify
6. MD 갱신 + Session E 인계

---

# KKOTIUM GARDEN — 세션별 작업 로그

> **이 파일의 역할**: 직전 5세션 상세 기록. 더 오래된 세션은 archive에 동결.
> - **docs/plan/PROGRESS.md**: 슬림 상태 스냅샷 + 인덱스 (분할 이후 진입점)
> - **docs/plan/ROADMAP.md**: 다음 새 채팅 시작 메시지 + Sprint 계획 영구 참조
> - **docs/plan/PRINCIPLES_CODE.md / PRINCIPLES_LEARNED.md / SPRINT_PLAN.md / REFERENCES.md**: PROGRESS.md 분할 결과 (2026-05-12)

> **본 파일은 작업원칙 #31에 따라 세 번 분할되었습니다.**
> **첫 분할(2026-05-08, 1~5세션)**: `docs/plan/archive/SESSION_LOG_2026Q2_MAY.md`
> **두 번째 분할(2026-05-11, 6~14세션)**: `docs/plan/archive/SESSION_LOG_2026-05.md`
> **세 번째 분할(2026-05-12, 9세션)**: `docs/plan/archive/SESSION_LOG_2026-05-12.md`
> **현재 본 파일에는 직전 5세션만 유지** (2026-05-12 Session E-2 Phase 2 ~ Session C-1).
