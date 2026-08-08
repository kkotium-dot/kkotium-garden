# 결과 — 아침 소싱 알림(E-7) 미발송 원인 조사

> **담당**: Claude Code
> **작성**: 2026-08-08
> **인계 원문**: `docs/handoff/CODE_DAILY_CRON_FIX_HANDOFF_2026-08-08.md`
> **범위**: 조사만 수행(운영자 채팅 지시가 "조사"에 한정). 코드 수정은 미실행 — 아래 "권고 수정안" 참조, 실행은 운영자 승인 후.

---

## 요약 — 가장 유력한 원인이 인계문서의 가설과 다르다

Desktop 인계문서는 "①앞 섹션 예외로 인한 조기 종료" 또는 "②10초 타임아웃"을 원인 후보로 지목했다. 코드 조사 결과 **둘 다 실재하는 구조적 결함**으로 확인됐지만(§2, §3), Vercel Runtime Logs를 직접 조회한 결과 그보다 더 근본적인 정황이 나왔다:

> **지난 7일간 등록된 크론잡 5개(daily/weekly/inventory-sync/order-sync/asset-integrity-sweep) 중 어느 것도 예정된 스케줄 시각에 실행된 로그가 없다.** 유일하게 잡힌 `/api/cron/daily` 요청 1건(01:59:40 UTC, 200)조차 크론 예정 시각(23:00 UTC)이 아니다 — 수동 테스트 호출로 보인다.

즉 "크론이 불려서 route.ts 내부 로직이 실패"가 아니라 **"크론 자체가 함수까지 도달하지 못하고 있을 가능성"**이 가장 유력하다. 대시보드에 크론이 "Enabled/등록됨"으로 보이는 것과 "실제로 매일 실행되는 것"은 별개다.

---

## 1. `cron/daily/route.ts` 섹션별 try-catch 구조 — **확인: 4개 섹션이 공통 try-catch에만 의존**

`route.ts:41` 하나의 공통 `try { ... } catch(e) { return 500 }` 안에 11개 섹션이 순차 실행된다. 섹션별 격리 여부:

| 섹션 | 라인 | 자체 try-catch | 비고 |
|---|---|---|---|
| 0. B-4 자동품절 | 52-136 | ✅ 있음 (134) | |
| 1. OOS 감지 | 143-208 | ⚠️ **부분적** | `loadDispositionVerdicts` 호출만 145-154에서 격리, 이후 prisma 쓰기·`sendDiscord`(200)는 **무보호** |
| 2. 점수 하락 감지 | 210-266 | ❌ **없음** | prisma 쓰기·`sendDiscord`(258) 전부 무보호 |
| 2.5 opsDigest | 272-306 | ✅ 있음 (304) | |
| 3. 추천 데이터 산출 | 308-322 | ❌ **없음** | `computeRecommendation`(320) 무보호 |
| 4. DB 영속화 | 324-347 | ❌ **없음** | prisma 쓰기 무보호 |
| A3 naverSync | 349-373 | ✅ 있음 (371) | |
| C-10 자동발주확인 | 375-421 | ✅ 있음 (419, 내부 389도 이중) | |
| D-3 경쟁사 모니터링 | 423-432 | ✅ 있음 (430) | |
| **E-7 소싱 추천** | 434-458 | ✅ 있음 (456) | E-7 자체는 격리돼 있어 자기 실패로 하단 섹션을 막지는 않음 |
| trendCache | 460-467 | ✅ 있음 (465) | |

**결론**: 인계문서 가설대로, 섹션 1(후반부)·2·3·4에서 예외가 나면 공통 catch(474)로 튀어 500을 반환하고 **E-7(434) 자체가 실행되지 않는다**. 이 4곳 중 하나라도 실패하면 그 아침엔 소싱 알림뿐 아니라 자동발주확인·경쟁사 모니터링까지 전부 안 돈다. 다만 이번 미발송이 실제로 이 경로였는지는 로그로 직접 증명은 못함(§4 참조 — Runtime Errors 조회 결과 최근 7일 `/api/cron/daily` 에러 0건).

## 2. `SOURCING_RECOMMEND_LIVE` 실제 프로덕션 값 — **미확인(도구 한계)**

- 코드 로직(`route.ts:442`)은 명확: `'false'`로 명시 설정하지 않는 한 기본값은 **실발송**(`sourcingPaused = false`).
- 사용 가능한 MCP 도구(Vercel `get_project`, `get_project_deployment_protection` 등)로는 프로젝트 환경변수 **값 조회 기능이 없음** — Vercel CLI(`vercel env ls`)도 로컬에 미설치. 대시보드 Settings → Environment Variables에서 직접 확인 필요(운영자/Desktop).
- 단, §요약의 발견대로 **크론 자체가 함수까지 도달하지 않는다면 이 값은 현재 미발송의 원인이 아닐 가능성이 큼** — 확인 우선순위는 낮춰도 됨.

## 3. 함수 타임아웃(maxDuration) + 순차 실행 소요시간 — **확인: maxDuration 미설정 → Hobby 기본 10초**

- `cron/daily/route.ts`에 `export const maxDuration`이 **없음**. 동일 저장소의 다른 크론(`inventory-sync`: 60초, `asset-integrity-sweep`: 300초)은 명시 설정돼 있는데 `daily`만 누락 — Hobby 플랜 기본값 10초로 동작.
- `daily`가 순차 호출하는 무거운 지점들도 각각 `maxDuration` 미설정(`/api/sourcing-recommend`, `/api/naver/orders`, `/api/competition` 전부 미설정):
  - **0. B-4**: `naverProducts` 개수만큼 순차 `naverRequest` GET(상품마다 1회, 루프 내부 await) — 상품 수가 늘수록 선형 증가.
  - **A3 naverSync**: 자기 자신 서버로 self-fetch(`/api/naver/orders?hours=24`) — Vercel 함수 간 HTTP 왕복 자체가 추가 지연.
  - **D-3 경쟁사**: self-fetch(`/api/competition`).
  - **E-7**: self-fetch(`/api/sourcing-recommend`) — 내부(`src/lib/sourcing-recommender.ts`)에 **명시적 `setTimeout` 딜레이**가 두 군데 하드코딩돼 있음: 키워드 통계 배치마다 300ms(329-340행), 도매처 매칭마다 500ms(438-465행, top5 반복). 여기에 Groq AI 호출(253행)·네이버 트렌드 조회(298행)까지 더해지면 **이 서브루틴 하나만으로 수 초~10초 이상 소요 가능**.
- E-7은 11개 섹션 중 **뒤에서 2번째**(마지막은 trendCache)로 배치돼 있어, 앞 단계(특히 B-4 반복 호출·A3/D-3 self-fetch)가 조금만 늘어져도 **10초 예산을 이미 다 쓴 뒤에 도달** → Vercel이 함수를 강제 종료하면 E-7의 try-catch(456)조차 실행될 기회가 없다(catch는 타임아웃엔 무력함 — 타임아웃은 예외가 아니라 프로세스 강제 종료).
- **결론**: 인계문서의 타임아웃 가설은 구조적으로 매우 설득력 있음. 다만 §요약의 발견(크론이 애초에 함수까지 도달했다는 로그가 없음)과 겹쳐 보면, "타임아웃으로 늦게 죽었다"와 "애초에 시작도 못 했다"를 로그만으로는 구분 못 함 — Vercel 대시보드 Functions 탭의 개별 invocation 상세(실행시간)를 봐야 확정 가능(아래 §5 권고).

## 4. Runtime Logs/Errors 직접 조회 결과 (Vercel MCP, 계획서에 없던 추가 조사)

- `get_runtime_errors`(최근 7일, route=`/api/cron/daily`): **에러 0건**.
- `get_runtime_logs` group_by=statusCode, query="/api/cron/": **`/api/cron/daily` 200 1건**뿐, weekly·inventory-sync·order-sync·asset-integrity-sweep **전부 0건**. 등록된 스케줄(각각 23:00/00:00(월)/00:00/11:00/15:00 UTC)과 일치하는 시각의 로그가 하나도 없음.
- 프로젝트 전체 statusCode 분포(7일): 200 192건, 304 3건 — **4xx/5xx가 단 한 건도 없음**. 크론이 막혔다면 보통 401/403이 찍혀야 하는데 그마저 없다 — **Function 레벨(runtime logs)에 도달하기 전, Vercel 엣지 단계에서 조용히 차단됐을 가능성**과 부합.
- `get_project_deployment_protection` 조회 결과: **`ssoProtection.enabled: true`, `deploymentType: "all_except_custom_domains"`**. `kkotium-garden.vercel.app`이 커스텀 도메인이 아니라면 이 보호가 적용되는 대상에 포함될 수 있음. Vercel Cron이 이 보호를 자동 우회하는지 여부는 공식 문서에서 명시적으로 확인 못 했음(MCP 문서 검색 결과 불충분) — **이 부분은 추정이며 단정 아님**.
- `verify-vercel-deploy.sh`(세션 시작 STEP 0)에서도 별개로 `HEAD=cd6c327`(문서 커밋) vs `production=1738ab8` MISMATCH(state=REGISTERED)가 잡힘 — 코드 영향 없는 문서 전용 커밋이라 이번 미발송과는 무관해 보이나, "github-deployments 기록이 실제 배포 상태를 못 따라가고 있다"는 별도 신호라 참고차 기록.

## 5. 권고 — 다음 단계 (실행은 운영자 승인 후)

**즉시 확인 가능(대시보드, 코드 변경 불필요)**
1. Vercel 대시보드 → Project → **Cron Jobs 탭의 "Recent Invocations"/실행 이력**을 직접 확인 — 이게 이번 조사에서 유일하게 MCP로 못 본 데이터. 여기서 "시도했지만 실패(401 등)"인지 "아예 시도 자체가 없음"인지 바로 구분됨.
2. Vercel 대시보드 → Settings → **Deployment Protection**에서 SSO Protection이 프로덕션 도메인(`kkotium-garden.vercel.app`)에 실제로 걸리는지, 걸린다면 Cron 요청이 예외 처리되는지 확인. 걸린다면 커스텀 도메인 연결 또는 SSO Protection 예외 설정으로 해결 가능.
3. Settings → Environment Variables에서 `SOURCING_RECOMMEND_LIVE` 실제 값 확인(우선순위는 낮음, §2 참조).

**원인 확정 후 코드 수정(운영자 승인 시 Code가 진행)**
4. `cron/daily/route.ts`에 `export const maxDuration = 60;`(최소, 도매꾹 등 확장 여지 감안해 조정) 추가 — 다른 크론 라우트와 동일 패턴.
5. 섹션 1(후반부)·2·3·4에 개별 try-catch 추가해 `results.xxxError` 패턴으로 통일(이미 §2.5/A3/C-10/D-3/E-7에 적용된 패턴을 그대로 적용) — 앞 섹션 실패가 E-7을 막지 못하게.
6. (근본 개선, 인계문서 §4와 동일 방향) 무거운 크론을 쪼개거나 E-7을 앞순서로 재배치 — Hobby 크론 슬롯 5개 이미 사용 중이라 신중히 설계.

## 6. 체크리스트 결과

- [x] `git pull` 최신 확인 (HEAD==origin/main, cd6c327)
- [x] `cron/daily/route.ts` 섹션별 try-catch 구조 점검 → §1
- [x] `SOURCING_RECOMMEND_LIVE` 환경변수 값 확인 시도 → 도구 한계로 미확인, §2
- [x] 함수 타임아웃(maxDuration) 설정 확인 → 미설정 확인, §3
- [x] 순차 실행 시간 추정 → §3
- [ ] 원인 확정 → 근본 수정 — **조사 단계에서 멈춤(운영자 지시 범위 = 조사). §5 권고안 승인 대기.**
- [x] tsc 0 · build 0 — 코드 변경 없어 해당 없음
- [x] 결과 문서 작성 + 커밋·push + 채팅 인계
- [x] 실제 Discord 발송 테스트 없음(미실행)
