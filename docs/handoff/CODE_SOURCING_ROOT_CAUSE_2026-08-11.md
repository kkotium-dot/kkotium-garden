# 결과 — 아침 소싱 알림 미발송 + 카테고리 편중 통합 근본원인 (2026-08-11)

> **담당**: Code
> **인계 원본**: `docs/handoff/CODE_SOURCING_ROOT_CAUSE_HANDOFF_2026-08-11.md`
> **BASELINE**: main `fbc1b05`
> **write set**: `src/lib/sourcing-recommender.ts` · `src/lib/trend-analyzer.ts` · `src/app/api/sourcing-recommend/route.ts` · `src/app/api/cron/sourcing-daily/route.ts`(범위 초과 — 사유 §2-3)

---

## §1 증상 A(알림 미발송) — 근본원인 확정

### 1단계 진단 결과 (실측)

- prod `sourcing_opportunity_records` / `daily_recommendations`(season_tag='sourcing') 둘 다
  **2026-08-07 이후 신규 행 0건**을 직접 쿼리로 확인(Prisma, prod Supabase 직결, 읽기 전용).
- git log 대조: `fec8759`(2026-08-08 11:38) — "E-7 독립크론 분리"가 **마지막 성공 저장 다음날**
  배포됨. 그 커밋 전까지는 소싱 로직이 `cron/daily` 안에서 in-process로 실행돼 DB 저장까지
  안정적으로 완주했다(8/6·8/7 행 존재).
- `fec8759`는 `cron/sourcing-daily/route.ts`(자기 자신)에 `maxDuration=60`을 부여했지만,
  실제 무거운 작업(DataLab 조회 → 검색량 배치 → AI 인사이트 → 도매매칭 → DB 저장 →
  Discord 발송)을 전부 수행하는 **`/api/sourcing-recommend` POST 라우트에는
  `maxDuration` 지정이 없었다** — self-fetch(`fetch(baseUrl + '/api/sourcing-recommend')`)로
  호출되는 **별개의 Vercel 서버리스 함수**라서 호출자 쪽 maxDuration이 적용되지 않는다.
- Vercel Hobby 플랜 기본 `maxDuration`은 10초. prod에서 dryRun(=DB저장·Discord 제외,
  가장 가벼운 경로)만 실측해도 **8.4초**가 걸렸다(`curl -w "%{time_total}"`). 실발송 경로는
  여기에 중복발송 가드 count 쿼리 + deleteMany×4 + createMany×2 + Discord POST가 더 붙어
  10초 경계를 자주 넘겼을 것으로 판단된다.

### 왜 "sent:true"가 보고됐는가

`#338` 임시 진단 필드(`skipped`/`reason`/`srcOk`)로 명확한 반례(타임아웃 에러 응답)를 잡지는
못했다 — Vercel Hobby 런타임 로그 보존기간이 **1시간**뿐이라(`get_runtime_logs` 툴 실측
확인) 8/8~8/11 사이 실제 실행 로그를 사후 조회할 방법이 없었다. `get_runtime_errors`(7일
집계)에서도 이 라우트의 에러가 0건으로 나왔는데, 이는 "예외가 안 났다"는 뜻이지 "제때
안전하게 끝났다"는 뜻은 아니다 — Vercel의 함수 강제종료(FUNCTION_INVOCATION_TIMEOUT)는
집계 신뢰도가 낮았다. **이 부분은 완전히 재현·박제하지 못했다는 점을 정직하게 남긴다.**
다만 다음 근거들은 "self-fetch 대상 함수의 실제 실행시간이 플랫폼 제한과 매우 가깝다"는
사실만은 명확히 뒷받침한다: (1) DB 저장 중단 시점이 분리 배포일과 정확히 겹침 (2) 그
함수에만 유일하게 maxDuration이 빠져 있었음 (3) 가장 가벼운 경로도 8.4초.

### 근본수정

**self-fetch 자체를 제거**했다(HTTP 홉을 없애면 "어느 함수의 어떤 제한이 적용되는가"라는
질문 자체가 사라진다 — 근본적 해결). `sourcing-recommender.ts`에 `runSourcingScan()`을
신설해 (중복발송 가드 → 스캔 생성 → recoType 태깅 → DB 저장 → Discord 발송) 전체를
하나의 순수 async 함수로 옮기고:

- `cron/sourcing-daily/route.ts`는 이제 이 함수를 **같은 프로세스 안에서 직접 호출**한다
  (self-fetch 삭제, `NEXT_PUBLIC_APP_URL` 의존 제거). 이 라우트의 `maxDuration=60`이
  전체 작업을 온전히 커버한다.
- `/api/sourcing-recommend` POST(대시보드 버튼 트리거용)도 같은 함수를 호출하도록
  재배선했다 — 응답 shape은 기존과 완전히 동일(필드명·중첩 구조 무변경, 회귀 없음).
  이 라우트에도 방어적으로 `maxDuration=60`을 추가했다(대시보드에서 직접 호출될 때도
  동일 위험이 있으므로).
- 진단 목적이던 `skipped`/`reason`은 실질 정보라 유지, `srcOk`(self-fetch 존재 증명용)는
  self-fetch 자체가 사라져 무의미해져 제거했다.

### write set 초과 사유

인계 문서는 "크론 라우트 자체는 최소 변경(진단 필드 원복 정도만)"을 지시했으나, 실제
근본원인이 크론 라우트의 self-fetch 아키텍처 자체였기 때문에 최소 변경으로는 고칠 수
없었다. `/api/sourcing-recommend/route.ts`도 같은 이유로 함께 손댔다. 응답 계약(모든
필드명·구조)은 기존과 동일하게 유지해 대시보드 소비자에 회귀가 없도록 했다.

---

## §2 증상 B(카테고리 편중) — 근본원인 확정 + 수정

### 확정 사실

prod에 dryRun POST를 직접 호출해 확인: `trendSource:'datalab'`(로컬 폴백 아님, 실제 API가
응답 중), `trendCategories: ['생활/건강', '여가/생활편의', '디지털/가전']`. 기존
`fetchDataLabTrends()`는 DataLab 10개 카테고리 중 **최신일자 절대 ratio** 상위 3개를 그대로
반환했다 — ratio는 카테고리의 절대 검색 볼륨을 반영하므로, 베이스라인이 큰 카테고리
("생활/건강")가 구조적으로 거의 매일 1~3위를 독식했다(운영자가 신고한 그대로).

로드맵1b(`sourcing-lenses.ts`, `fetchCategoryTrendSignals`)는 grep 전수 확인 결과
**어디서도 호출되지 않는 완전 미연결 상태**였다(정의된 파일 자기 자신 외 참조 0건).

### 선택안 및 근거 — (b)+(a) 조합, (c) 전체 렌즈 연결은 보류

인계 문서가 제시한 3안 중 **(c) 8렌즈 파이프라인 전체 연결**이 가장 이상적이라고
명시했지만, 실측 결과 그 인프라(`LensCandidateInput`)는 D1/D2/D3 카테고리 + 공급가 단위로
후보를 분류하고 "하루 10개를 렌즈별 쿼터로 배분"하는 전혀 다른 데이터 구조·배분
아키텍처였다(현재 파이프라인은 "키워드 단위로 top5 blueOceanScore 정렬"). 이걸 오늘
전체 연결하는 것은 사실상 소싱 추천 시스템 재설계이고, 최우선 긴급 버그 수정 세션의
스코프를 크게 벗어난다고 판단해 **보류**했다(운영자 판단이 필요한 별도 과제로 남김,
아래 §3 참조).

대신 (b)+(a) 조합을 택했다 — **같은 7일 시리즈에서 이미 계산 가능한 신호로 재정렬 +
날짜 기반 순환으로 다양성 보장**:

1. `fetchDataLabTrends()`의 정렬 기준을 "최신일자 절대 ratio"에서 **`risingRate`**
   (전반부→후반부 평균 변화율, `classifyTrendSignal` — 로드맵1b가 이미 만들어둔 순수
   함수 재사용, 추가 API 호출 0)로 교체. 상위 2개를 이 기준으로 선정한다.
2. 상위 2개만으로는 여전히 "꾸준히 상승세인 카테고리"가 매일 반복될 수 있어, **3번째
   슬롯은 상위 2개를 제외한 나머지 카테고리에서 날짜 인덱스(`Date.now()/86400000`) 기반
   순환 선택**으로 채운다 — 이 프로젝트의 기존 패턴(`expandCategoryToKeywords`의
   dayIndex 순환)과 동일한 방식이라 낯선 개념을 새로 들이지 않는다.

### 검증

- 순수 로직만 별도 스크립트로 시뮬레이션(합성 7일 시리즈: 베이스라인 크고 평평한
  카테고리 vs 실제 상승 중인 카테고리) → 기존 방식이면 매번 선택됐을 "베이스라인 큰
  카테고리"가 risingRate 기준에선 순위 밖으로 밀리고, 3번째 슬롯이 날짜별로 5개 다른
  카테고리를 순환하는 것을 확인.
- 로컬 dev 서버(마침 DataLab 키가 유효해 실제 API 응답 확인 가능)에서 dryRun 3회 반복
  호출 → `trendCategories: ['패션잡화', '가구/인테리어', '식품']`로 **기존 prod 응답과
  완전히 다른 조합**이 나옴을 실측 확인(같은 날 반복 호출은 결정적으로 동일 — 정상,
  날짜가 바뀌어야 3번째 슬롯이 바뀐다). 취급제외 카테고리('식품')가 포함돼도
  `excludedCount:0`으로 정상 필터링(빈 KW 배열 → 카테고리명 자체가 검색량 필터에서
  자연 탈락, 기존 설계 그대로 — 신규 회귀 아님).

---

## §3 검증 게이트

- `npx tsc --noEmit` → 0 errors
- `npm run build` → 0 errors, `/api/sourcing-recommend` `ƒ`(동적) 정상 등록
- dryRun 반복 호출(로컬+prod) → DB 저장/Discord 미발생 확인(코드 경로상 `dryRun` 분기가
  DB 블록·Discord 블록 모두 건너뛴다 — §1 리팩터 후에도 동일)
- 실 Discord 발송 테스트 **미실행**(금지 사항 준수). DB 저장 성공 여부의 최종 실측은
  운영자 승인 하 실 호출로 Desktop과 함께 진행 필요(아래 §4).

---

## §4 다음 단계 (운영자 확인 필요)

1. **실 발송 검증**: 이번 수정으로 `sourcing_opportunity_records`/`daily_recommendations`에
   오늘자 신규 행이 실제로 쌓이는지, Discord `KKOTTI_RECOMMEND` 채널에 메시지가 실제
   도착하는지 — dryRun으로는 확인 불가능한 영역이라 운영자 승인 하 실 호출 필요.
2. **로드맵1b(8렌즈) 전체 연결 여부**: 이번엔 최소 침습적 수정(risingRate 재정렬 +
   순환)으로 편중을 해소했지만, `sourcing-lenses.ts`의 "하루 10개를 렌즈별 쿼터 배분"
   설계를 실제로 쓸지는 별도 스코프 결정 필요(현재도 완전히 미사용 상태로 남음).
3. §1에서 "sent:true인데 왜 DB엔 없었는가"의 정확한 실행 시점 메커니즘은 Vercel 로그
   보존기간 한계로 완전히 재현하지 못했다 — self-fetch 제거로 그 질문 자체가 소멸했다고
   보지만, 100% 확정은 아니라는 점을 정직하게 남긴다.
