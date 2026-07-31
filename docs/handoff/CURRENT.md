# 현재 인계 (CURRENT)

> 이 파일 1개만 활성 인계. 매 세션 종료 시 덮어쓴다.
> **작업 우선순위는 `docs/plan/WORK_SCHEDULE_BOARD.md`가 단일 권위.**

- **status**: P1 구현 완료(미커밋) + P2 문서 완료(미커밋). **★소싱 추천 무력화 근본원인 확정 — 추가 수정 필요(P1-E)**
- **branch**: `feature/preview-copy-then-redesign` (HEAD `12b99df`, 워킹트리에 P1·P2 산출물)
- **next-action**: P1-E(시드 키워드 사전) 구현 → dry-run 재검증 → 커밋 → 운영자 승인 → 실발송

---

## 1. ★★ 최우선 — 소싱 추천이 3.5개월간 무력화된 근본원인 (2026-07-31 Desktop 실측 확정)

### 1-1. 확정된 사실 (전부 실측 근거 있음)

| # | 사실 | 근거 |
|---|---|---|
| 1 | E-7 소싱 블록은 **2026-04-15부터 크론에 연결돼 있었다** | `git log -S "E-7: Kkotti sourcing"` → `ca993ee` 2026-04-15 |
| 2 | 원본은 `{ discord: true }` **무조건 실발송** (안전장치 없음) | `git show HEAD:...cron/daily/route.ts` 실측 |
| 3 | 프로덕션 웹훅 **연결 완료 상태** | `/api/system-health` → `discord-kkotti-recommend: "디스코드 채널 연결 완료"` |
| 4 | 그런데 소싱 결과가 DB에 저장된 날은 **2026-07-09 단 하루(5건)** | `SELECT season_tag, COUNT(*) FROM daily_recommendations GROUP BY season_tag` → `sourcing: 5건, 2026-07-09만` |
| 5 | **근본원인**: `expandCategoryToKeywords()`의 `KW` 맵이 **완전히 비어 있음** | `src/lib/sourcing-recommender.ts` 실측 — 주석만 있고 항목 0개 |
| 6 | 그래서 DataLab 카테고리명을 **그대로 검색어로 사용** | 코드: `return KW[categoryName] ?? [categoryName]` |
| 7 | 카테고리명은 검색량이 없어 `>= 300` 필터에서 전량 탈락 | 프로덕션 API 실측: 생활/건강 **10건**, 여가/생활편의 **10건**, 패션잡화 **280건** — 전부 300 미만 |

**결론**: 소싱 엔진은 **구조적으로 후보를 만들 수 없는 상태**였다. 매일 크론이 돌면서 "후보 0건" 영어 메시지(`No clear opportunities today. Check again tomorrow.`)를 3.5개월간 디스코드로 실발송해 왔다. 이것이 운영자가 말한 **"꼬띠 추천이 제대로 발송되지 않는다"의 정확한 실체**다.

### 1-2. ★ Desktop 분석 오류 정정 (재발 방지)

이전 세션에서 Desktop(나)이 `docs/handoff/CURRENT.md`에 **"소싱 엔진은 어떤 크론에도 연결 안 됨"**이라고 기록했으나 **사실과 다르다.**

- **원인**: `grep ... | head -20`으로 결과를 잘라 읽고 파일 전체(484줄)를 확인하지 않았다. E-7 블록은 440행에 있었는데 head가 407행에서 잘렸다.
- **교훈**: `head`/`tail`로 자른 출력만 보고 "존재하지 않는다"고 단정하지 말 것. **부재 증명은 반드시 전수 검색으로** (원칙 #323 신설).
- Code 레인이 이 오류를 발견해 보고했다. **레인 간 교차검증이 실제로 작동한 사례**.

---

## 2. P1 구현 검증 결과 (Desktop 실측)

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| dry-run 게이트(크론) | ✅ `SOURCING_RECOMMEND_LIVE !== 'true'` → 항상 dryRun. **fail-safe 기본값 미발송** |
| dry-run 게이트(API) | ✅ 디스코드 발송·DB 저장 **이전에 early return** — 우회 불가 |
| dry-run 실호출 | ✅ `dryRun:true, discordSent:false` 확인 |
| embed 한글화 | ✅ "🌷 꼬띠의 오늘 소싱 추천 — 2026년 7월 31일 금" / "요즘 뜨는 카테고리" / 꼬띠 페르소나 정상 |
| 취급제외 엔진 | ✅ 공유 `judgeExclusion()` 사용, 소싱 필터에 정상 배선 |

**로컬 테스트가 0건인 것은 로컬 `.env.local`에 `NAVER_AD_API_KEY`·`NAVER_AD_SECRET_KEY`·`NAVER_AD_CUSTOMER_ID`가 없어서다**(프로덕션엔 있고 정상 작동 — `/api/naver/keyword-stats` 실측으로 확인: 아이스트레이 월 1,250건 반환). 로컬 한정 이슈이며 코드 문제 아님.

---

## 3. ★ 추가로 발견한 버그 2건 (전 상품 공통 관점, 단건 수습 금지)

### 3-1. 무음 실패(silent catch) — 원칙 #270 위반 패턴
`sourcing-recommender.ts` 검색량 배치 루프의 `catch { /* Skip batch on error */ }`가 **API 실패를 통째로 삼킨다**. 로그도 카운터도 없어서 "0건"과 "전부 실패"를 구분할 수 없다. 이번 3.5개월 무력화를 아무도 눈치채지 못한 구조적 이유.
→ **수정 방향**: 실패 건수를 집계해 결과에 포함하고, 전량 실패 시 결과 메시지에 명시("검색량 조회 실패 N건").

### 3-2. 테이블 삭제 범위 충돌
`cron/daily`(338행) `deleteMany({ where: { date: todayDate } })` — **`season_tag` 필터가 없어** 같은 날짜의 `sourcing` 태그 레코드까지 지운다. 반면 `sourcing-recommend`(140행)는 `season_tag: 'sourcing'`으로 범위를 제한한다.
→ 현재 실행 순서(일간 먼저 → 소싱 나중) 덕에 사고가 안 났을 뿐, **순서가 바뀌면 소싱 결과가 소실**된다.
→ **수정 방향**: `cron/daily`의 deleteMany에 `season_tag: null`(또는 not 'sourcing') 조건 추가.

---

## 4. 다음 작업 — P1-E (신규, 최우선)

**시드 키워드 사전 구축**: `expandCategoryToKeywords()`의 빈 `KW` 맵을 실제 상품 키워드로 채운다. 이게 없으면 P1의 나머지가 전부 무의미하다.

- DataLab이 반환하는 **한글 d1 카테고리명**(생활/건강, 여가/생활편의, 패션잡화, 디지털/가전, 가구/인테리어, 스포츠/레저, 출산/육아 등)을 키로 사용
- 각 카테고리마다 **실제 검색되는 상품 키워드 10~20개**
- 취급 제외 정책 준수: **식품·화장품·브랜드 키워드 금지**
- **P2 시즌 캘린더 데이터와 연결**: 시즌 이벤트의 `keywords` 필드를 시드에 합류시키면 시즌 상품이 자동 반영된다 ← 두 작업의 시너지 지점

---

## 5. 절대 금지 (매 세션 확인)

- 네이버 스토어 PUT/POST → 운영자 "GO" 없이 금지
- **디스코드 실발송 → 운영자 승인 없이 금지.** 현재 `SOURCING_RECOMMEND_LIVE` 미설정 = 안전
- 자동 발행 → 영구 금지(#307)
- 테스트 데이터 방치 → 같은 세션에 원복
- 허위 완료 보고 → 미실측은 "미검증" 명시(#310)
- **부재 증명은 전수 검색으로**(#323) — head/tail 잘린 출력으로 "없다" 단정 금지
- 무음 실패 금지 — 삼킨 오류는 반드시 카운트·표시(#270)
- 병렬 작업 시 담당 write set 밖 파일 되돌리기 금지(#322)
