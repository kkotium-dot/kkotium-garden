# 작업 인계 — 아침 소싱 알림 최종 근본원인 + 카테고리 편중 통합 조사 (긴급, 통합)

> **담당 레인**: Claude Code (최우선)
> **작성**: Desktop, 2026-08-11
> **BASELINE**: main 최신(`git pull`, 현재 `23e05a5`)
> **의존성**: 없음. write set은 `sourcing-recommender.ts`+`trend-analyzer.ts` 단일 클러스터 — 다른 진행 중 작업과 무관
> **긴급도**: 최우선 — 운영자가 3일 연속(8/9·8/10·8/11) 알림 미수신 확인, 오늘도 재확인 요청

---

## 배경 — 두 증상이 같은 파일에서 만난다

**증상 A(알림 미발송)**: `/api/cron/sourcing-daily`를 curl로 직접 호출하면 매번 `{sent:true, opportunities:5}`를 반환하는데, ① DB(`sourcing_opportunity_records`)는 8/7 이후 갱신이 전혀 없고 ② 실제 Discord에도 아무것도 안 온다(운영자 3일 연속 확인). `srcOk:true`(POST가 정상 `ok:true` 경로로 완주), `skipped:null`(#337 당일 스킵 가드는 안 걸림) — 즉 **가드도 예외도 아닌, "정상 흐름을 탔다고 보고하는데 결과물이 없는" 모순**.

**증상 B(카테고리 편중, 운영자 신고)**: "성장·소싱"의 소싱 추천이 매번 "생활/건강"(가습기·청소기·공기청정기 등)에만 몰려 있다. `KW` 사전(`sourcing-recommender.ts`)엔 9개 카테고리가 있는데 실질적으로 1개만 쓰이는 것처럼 보인다.

**Desktop이 코드 리딩+로컬 실측으로 확인한 것**:
1. `generateSourcingRecommendations()`가 `fetchNaverTrends()`로 트렌드를 얻고, 실패 시 `['가구/인테리어']`로 폴백한다(`sourcing-recommender.ts` 약 250행 부근).
2. `fetchNaverTrends()`(`trend-analyzer.ts`)는 DataLab 10개 카테고리 중 "최신일자 ratio" 상위 **3개만** `trendCategories`로 반환한다. 나머지 7개(가구/인테리어 포함 대부분)는 그날 후보에 아예 안 들어간다.
3. **로컬에는 `NAVER_DATALAB_CLIENT_ID`/`NAVER_OPEN_API_CLIENT_ID`/`NAVER_CLIENT_ID` 전부 없음** → 로컬에서 호출하면 항상 `source:'fallback'`, `trendCategories:[]`(가구/인테리어 폴백).
4. **그런데 실제 화면엔 "생활/건강"이 계속 나온다** — 폴백값(가구/인테리어)과 다르다. 이건 **프로덕션에는 DataLab 키가 있고 실제로 API가 응답하고 있으며, 그 순위 계산이 매일 "생활/건강"에 쏠린다**는 뜻이다(#310 — 로컬 부재만으로 프로덕션도 없다고 단정 못 함, Code가 프로덕션 env 확인 필요).

## 조사 방향 (순서대로)

### 1단계 — 프로덕션에서 실제로 무엇이 일어나는지 확정 (최우선)
`sourcing-recommender.ts`의 `generateSourcingRecommendations()`에 **임시 진단 로그/필드**를 추가해, dryRun 호출 시 다음을 응답에 노출:
- `trends.source`(datalab/fallback), `trends.trendCategories`(실제 반환된 3개), `trends.trendKeywords`
- `uniqueKeywords`(2단계에서 만든 후보 키워드 배열 전체)
- `keywordStats.length`, `promising.length`(3~4단계 필터링 전후 개수)
- 각 단계에서 예외가 났다면 그 메시지(현재 `catch {}`로 조용히 삼키는 지점들 — `fetchKeywordStats` 배치 실패·`fetchNaverTrends` 자체 예외 등)

`dryRun:true`로 호출하면 발송 없이 이 진단 정보만 받을 수 있다(`/api/sourcing-recommend?dryRun=true` 또는 body `{dryRun:true}`) — **실발송 없이 안전하게 조사 가능**.

**핵심 질문에 답할 것**:
- 프로덕션은 `trends.source`가 `'datalab'`인가 `'fallback'`인가?
- `datalab`이면 `trendCategories`가 정말 매번 `['생활/건강', ...]`로 고정되는가, 아니면 날마다 바뀌는데 우연히 겹쳤나?
- **DB 저장·Discord 발송이 실제 실행되는데 결과가 안 남는 지점**을 정확히 좁힐 것 — `.catch(() => null)`로 삼켜지는 두 `createMany` 호출(`daily_recommendations`·`sourcingOpportunityRecord`)에 임시로 에러를 캡처해 원인 확정. Prisma 스키마 drift(컬럼 불일치)·유니크 제약 충돌 등이 유력 후보.

### 2단계 — 카테고리 편중 근본 수정
1단계로 "DataLab이 매번 같은 카테고리를 1~3위로 준다"가 확정되면:
- **상위 3개 고정 방식을 교체**. 후보안(운영자 지시 없이 Code 판단으로 가장 합리적인 것 선택, 근거를 결과문서에 남길 것):
  - (a) 매일 카테고리를 순환(round-robin)시켜 9개 사전이 골고루 노출되게(예: 오늘 순위 상위 N + 날짜 기반으로 순환 선택되는 나머지)
  - (b) 절대 순위(ratio) 대신 **`fetchCategoryTrendSignals()`의 `risingRate`(상승률)** 기준으로 재정렬 — 이미 로드맵1b(`trend-analyzer.ts`, `sourcing-lenses.ts`)에 구현돼 있다. "생활/건강"이 그냥 base ratio가 높은 카테고리라면 상승률 기준으로는 다른 카테고리가 뜰 수 있다.
  - (c) (a)+(b) 조합 — 이미 만들어둔 로드맵1b 인프라(`sourcing-lenses.ts`)를 실제 파이프라인에 연결하는 게 근본적으로 가장 바람직하다(운영자가 신고한 "생활/건강만"이 정확히 로드맵1b가 풀려던 문제이므로).

**설계 문서 참조**: `docs/design/KKOTTI_DAILY_SOURCING_V2_2026-08-07.md` §3-0(다중 렌즈), Code가 이미 만든 `docs/handoff/CODE_SOURCING_V2_LENSES_RESULT_2026-08-10.md`.

**★ 중요**: 로드맵1b(`sourcing-lenses.ts`)가 실제 `sourcing-recommender.ts` 파이프라인에 연결됐는지 먼저 확인. 아직 연결 안 됐다면(파일만 있고 미사용), 이번 기회에 실제로 배선하는 것을 권장 — 두 증상을 한 번에 해결하는 가장 효율적인 경로다.

### 3단계 — 근본 수정 + 검증
- 1·2단계로 원인이 확정되면 근본 수정.
- **임시 진단 코드는 반드시 제거**(Desktop이 이전 세션에 이미 겪은 실수 — 진단 필드를 남긴 채 커밋했다가 다시 지우는 왕복이 있었음, 한 번에 깔끔히).
- `dryRun:true` 호출로 여러 번 반복 검증(트렌드 카테고리가 날마다/호출마다 다양해지는지, 실패 지점이 사라졌는지).
- **DB 저장 성공 여부는 dryRun이 아닌 실제 호출로만 확인 가능** — 이건 운영자 승인 필요(실제 Discord 발송 수반). Code는 원인 확정·수정까지만 하고, 최종 실발송 검증은 운영자 승인 하에 Desktop과 함께 진행.

## write set
`src/lib/sourcing-recommender.ts` + `src/lib/trend-analyzer.ts` (+ 필요시 `src/lib/sourcing-lenses.ts` 연결) — 크론 라우트 자체(`cron/sourcing-daily/route.ts`)는 최소 변경(진단 필드 원복 정도만).

## 절대 금지
- 실제 Discord 발송 테스트 임의 실행 금지(dryRun만 사용)
- 원인 미확정 상태에서 "고쳤다"고 보고 금지 — 이번 사안은 이미 두 번 성급한 결론(Desktop 8/8, Code §3)이 있었던 만큼 **1단계 진단으로 확정 사실을 얻은 뒤에만** 수정 착수

## 완료 후
- 결과 문서: `docs/handoff/CODE_SOURCING_ROOT_CAUSE_2026-08-11.md`
- tsc 0 · build 0
- 커밋·push → 채팅 인계 → Desktop이 dryRun으로 우선 검증, 이후 운영자 승인 하 실발송 최종 검증

## 체크리스트
- [ ] 1단계: dryRun 진단으로 trends.source/trendCategories, DB 저장 실패 지점 확정
- [ ] 2단계: 편중 원인 확정 후 근본 수정안 선택(a/b/c) + 근거 기록
- [ ] 로드맵1b(sourcing-lenses.ts) 파이프라인 연결 여부 확인, 미연결이면 연결 검토
- [ ] 3단계: 근본 수정, 진단 코드 완전 제거
- [ ] tsc 0 · build 0
- [ ] dryRun 반복 검증(카테고리 다양성 확인)
- [ ] 결과 문서 + 커밋·push + 채팅 인계
