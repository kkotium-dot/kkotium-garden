# 현재 인계 (CURRENT) — 2026-08-08 세션 (아침 소싱 알림 미발송 이슈 — Code 조사 완료, 원인 확정 대기)

> 다음 세션은 이 파일 → 해당 트랙 설계문서 → `PRINCIPLES_LEARNED.md` 순으로 읽고 시작.

- **status**: **🚨 긴급 — 매일 아침 8시 꼬띠 소싱 추천 디스코드 알림 미발송. Code 조사 완료, 원인 후보 2개(코드 결함 확정 + 크론 미호출 의심) 확인. 코드 수정은 운영자 승인 대기 중(미실행).** 트랙③은 이전 세션에 전 과정 완료.
- **branch**: `main` (HEAD `cd6c327`, 전부 push, 동기화 0/0)
- **배포 상태**: 문서 커밋만, 프로덕션 영향 없음(코드 미변경). 단 **STEP0 verify-vercel-deploy.sh가 MISMATCH 보고 중** — production 배포 SHA(`1738ab8`)가 HEAD(`cd6c327`)보다 1커밋 뒤(github-deployments 기록 지연, 문서 전용 커밋이라 코드 영향은 없어 보이나 다음 세션 STEP0에서 재확인 필요).

**★★ 긴급 이슈: 아침 소싱 알림 미발송 — Code 조사 결과 (2026-08-08, 상세는 `docs/handoff/CODE_DAILY_CRON_FIX_RESULT_2026-08-08.md`)**

- **확정 사실 1 — route.ts 구조 결함**: `cron/daily/route.ts`의 11개 섹션 중 **섹션 1(후반부)·2·3·4가 개별 try-catch 없이 공통 try-catch에만 의존**. 이 중 하나라도 예외 발생 시 하단의 E-7(소싱 추천, 434행)까지 아예 도달 못 하고 500 반환.
- **확정 사실 2 — maxDuration 미설정**: `cron/daily/route.ts`에 `export const maxDuration`이 없어 Hobby 기본 10초로 동작. 내부에서 self-fetch하는 `/api/sourcing-recommend`도 동일하게 미설정이며, 그 내부(`sourcing-recommender.ts`)에 300ms·500ms 하드코딩 딜레이가 있어 이 서브루틴만으로 수 초 이상 소요 가능. E-7은 11개 섹션 중 뒤에서 2번째라 타임아웃에 가장 취약.
- **신규 발견(계획서에 없던 추가 조사, Vercel Runtime Logs 직접 조회)**: **지난 7일간 등록된 크론잡 5개 전부(daily/weekly/inventory-sync/order-sync/asset-integrity-sweep) 예정 스케줄 시각에 실행된 로그가 하나도 없음.** 유일한 `/api/cron/daily` 로그 1건(200)도 크론 예정 시각이 아닌 것으로 보아 수동 테스트로 추정. 프로젝트 전체 7일 로그에 4xx/5xx도 0건 — Function 레벨(runtime logs)에 도달하기 전 엣지 단에서 조용히 막혔을 가능성. 프로젝트의 **SSO Protection(Vercel Authentication)이 `all_except_custom_domains`로 활성화**돼 있음을 확인 — `kkotium-garden.vercel.app`이 이 보호 대상에 포함되는지, Vercel Cron이 이를 자동 우회하는지는 **미확정(대시보드 직접 확인 필요, MCP로 확인 불가)**.
- **미확인**: `SOURCING_RECOMMEND_LIVE` 실제 프로덕션 값 — MCP 도구에 환경변수 값 조회 기능이 없어 확인 못함(우선순위 낮음 — 크론이 함수까지 도달 안 하면 이 값은 무관).
- **다음 액션(운영자/Desktop)**: ① Vercel 대시보드 → Cron Jobs 탭 "Recent Invocations" 직접 확인(MCP로 못 본 유일한 데이터 — "시도했지만 실패" vs "시도 자체 없음" 구분 가능). ② Settings → Deployment Protection에서 SSO Protection이 프로덕션 도메인에 실제 적용되는지 확인. ③ 원인 확정 후 Code가 §5 권고 수정(maxDuration 추가 + 섹션별 try-catch 격리) 진행.
- **실제 Discord 발송 테스트는 이번 세션 미실행**(운영자/Desktop 승인 필요, Code가 임의로 안 함).

**★ 방침 변경(2026-08-08, 운영자 지시)**: 별도 지시 전까지 **Claude Code·Desktop 병렬 위주**, Cowork는 가능한 경우에만 추가 활용.

**★ 트랙③ 완결 요약**:
| 단계 | 작업 | 커밋 | 검증 |
|---|---|---|---|
| 설계 | 리서치+설계(6개 축, 3단계 신뢰도 등급) | `6532d2f`·`5aa6b1c` | — |
| 1단계 | `detectCategoryMismatch` 판별 로직 | `6b8b585`(Code) | 단위테스트 9케이스 + 실DB 오탐 발견·수정 |
| 2단계 | 카드·드로어 표시부 | `f9570ab`(Desktop) | **프로덕션 브라우저 스크린샷 검증 완료** |

프로덕션 실측: "청소기" 검색 시 "진동 흡입 귀클리너/귀청소기" 상품에만 "⚠️ 카테고리 확인?" 배지 정확 표시(다른 4개 정상 상품은 배지 없음, 오탐 0). 드로어에서 "신체용품(귀) 의심" 전체 문구 확인.

**★ 신규 설계 확정(구현 대기)**: `docs/design/KKOTTI_DAILY_SOURCING_V2_2026-08-07.md` — 꼬띠 데일리 소싱 추천을 다중 발굴 렌즈(급상승·시즌선점·니치·블루오션·꿀통·황금·스테디+레드오션경고) × 공급사 매칭으로 개편. 도매매 API `id` 파라미터로 공급사별 상품 조회 실측 확인. 품절 대체상품 연계 포함.

**★ 운영자 승인 대기**:
- 아침 소싱 알림 미발송 — 원인 확정 + 수정 실행 승인(위 긴급 이슈 섹션)
- Code② 주간리포트 실제 Discord 채널 육안 확인 (실발송 필요)
- git stash `z3c-misdirected-changes-needs-redo` 처리 방향
- 꼬띠 소싱 v2 구현 착수 우선순위(로드맵 1·1b~6, 문서 §7)

---

## 1. ★ 완료 — 소싱 레코드 누적정리 (커밋 `164a222`, Desktop, 검증 완료)

트랙C-2 검증 중 발견한 근본 이슈(#331 후속) 해소. GET을 "최신 date 하나"로 고쳐 화면 중복은 막았으나(#331), POST가 오늘 것만 deleteMany하고 과거는 안 지워 소싱 레코드가 DB에 무한 누적되던 문제(실측 8/3~8/6, 두 테이블 모두)를 근본 정리.

**수정(sourcing-recommend/route.ts POST)**:
- `SOURCING_RETENTION_DAYS=7` 상수(하드코딩 금지·근거 주석). 7일 = 최근 한 주 이력 보존 + 무한증가 방지 균형점.
- POST 저장 직전 두 테이블(daily_recommendations sourcing + sourcingOpportunityRecord)에서 `date < 오늘-7일` 정리. best-effort(#82).
- 전 소싱 레코드 일괄 적용(#55).

**검증(로컬 브라우저 + DB 실측)**: 7/25 테스트 레코드 주입 → POST 스캔 → 7일 이전이라 자동삭제 확인. 8/6·8/5(7일 이내) 보존 확인(경계 정확). daily_recommendations 옛 누적분(8/3~8/5)도 함께 청소됨 확인. GET 최신 date만 반환 유지(#331). 테스트 데이터 원복(두 테이블 8/6 5건만). tsc 0·build 0.

## 2. ★ 병렬 배분 인계 (write set 겹침 0, #322)

이번 세션부터 **토큰 절감 위해 3레인 병렬 배분**(운영자 지시). write set 완전 분리 확인:

| 레인 | 작업 | write set | 인계 문서 | 상태 |
|---|---|---|---|---|
| 🖥️ Desktop | ① 소싱 레코드 누적정리 | `sourcing-recommend/route.ts` | (이 문서 §1) | ✅ 완료·push |
| 💻 Claude Code | ② 트랙C-3 주간 소싱 요약 | `cron/weekly/route.ts` + `notifications/discord-builder.ts` | `docs/handoff/CODE_TRACK_C3_HANDOFF_2026-08-06.md` | 🟢 착수 대기 |
| 🌸 Cowork | ③ 키워드 카테고리 정밀화 리서치 | `wholesale-matcher.ts`(설계만) + 리서치 문서 | `docs/handoff/COWORK_KEYWORD_CATEGORY_RESEARCH_2026-08-05.md` | 🟢 착수 대기 |

**의존성**:
- ①②③ 파일 겹침 0 → 완전 병렬 안전.
- ②(cron/weekly)는 `sourcingOpportunityRecord`를 **읽기만** → ①의 쓰기와 데이터 충돌 없음.
- ③(wholesale-matcher)는 `sourcing-recommender.ts`가 import하나, 함수 시그니처 유지 시 무해(리서치 단계라 코드 미수정).
- ②는 #331 후속(7일 보관)에 의존 — "최근 한 주 소싱 이력"이 데이터 소스. ① 완료로 이 전제 충족됨.

**검증 주의(②)**: cron/weekly GET은 호출 시 **실제 Discord 발송**됨. Code는 실발송 없이 소싱 카운트만 검증하고, embed 실발송은 운영자 승인 필요(#절대금지 — 임의 발송 금지). DB 주입 필요 시 Desktop에 요청(Code는 Supabase 권한 없음).

---

## 4. ★ 완료 — 도매처 코드(DMM/DMK) 화면 한글화 (커밋 `befcb72`+`0168591`, Desktop, 프로덕션 검증)

소싱 위젯 UX 종합점검(운영자 승인 B작업) 중 프로덕션 실측으로 발견·해소. 전 상품 공통 개선.

**UX 점검 결과(참고)**: 위젯 높이는 4개 전부 776px 동일(#275 DOM 실측 — 그리드 정렬 정상, 스크린샷 착시). 하단 251px 여백은 정상(breathing room, 데이터 가변적이라 억지로 안 채움). **진짜 결함 = DMM/DMK 개발자 코드 노출.**

**수정(SourcingRecommendWidget.tsx, 카드+드로어 4곳)**:
- `getPlatformLabel(platform)` 단일 헬퍼(#62): DMK→도매꾹(초록), DMM→도매매(빨강). 카드·드로어 공유.
- 배지 `{w.platform}` → 한글 라벨(#317 개발자 은어 금지).
- 헤더 "도매 매칭 ()" 빈 괄호 근본수정(#325): 죽은 `wholesalePlatforms` 필드(API 미채움) 대신 실제 `wholesaleMatches[].platform`에서 유도. 없으면 괄호 생략.

**프로덕션 검증(브라우저 실측)**: 카드 확장·드로어 양쪽 DMM/DMK 잔존 0, 한글 배지(도매매·도매꾹) 정상, 헤더 "도매 매칭 (도매매·도매꾹)", 빈 괄호 없음. tsc0·build0. 테스트 낙점데이터 원복(8/6 5건 전부 status NULL).

## 5. 다음 세션 시작 순서
```
1. [확인] 아침 소싱 알림 미발송 — 위 긴급 이슈 §의 "다음 액션" 3가지(Cron Jobs Recent Invocations · Deployment Protection · SOURCING_RECOMMEND_LIVE) 운영자/Desktop 확인 결과 수신 → 원인 확정 → Code에 수정 지시
2. [수신] Code②·Cowork③ 결과 인계 확인(각 핸드오프 파일 + 채팅 인계)
   - Code②: cron/weekly 소싱 섹션 커밋 SHA·검증 결과 확인 → 필요시 Desktop이 테스트 데이터 주입해 실발송 검증(운영자 승인 하)
   - Cowork③: KEYWORD_CATEGORY_PRECISION 설계 문서 검토 → 구현 착수 여부 결정
3. [병합] 각 레인 결과를 CURRENT.md·TRACKER에 통합(Desktop이 병합 관리)
```

## 6. 이번 세션+누적 (전부 push)

| 작업 | 커밋 | 상태 |
|---|---|---|
| 트랙C-2 세그먼트 필터 + GET 근본수정 | e2009e6 | ✅ 프로덕션 검증 |
| 문서 rev106 (#331) | b57399e | ✅ |
| 소싱 레코드 누적정리 (#331 후속) | 164a222 | ✅ 로컬+DB 검증·push |
| 문서 rev107 (누적정리+3레인 배분) | 83db0a1 | ✅ |
| **도매처 코드 한글화 (#317)** | befcb72 | ✅ 프로덕션 검증 |
| **빈 괄호 근본수정 (#325)** | 0168591 | ✅ 프로덕션 검증 |
| 아침 소싱 알림 미발송 — 진단+Code 인계 | 1738ab8 | ✅ 인계 완료 |
| 아침 소싱 알림 미발송 — CURRENT.md 긴급 기록 | cd6c327 | ✅ |
| **아침 소싱 알림 미발송 — Code 조사 완료(원인 후보 확정, 크론 미호출 의심 신규 발견)** | (이번 세션, 아래 참조) | ✅ 조사·문서화, 수정은 승인 대기 |

## 7. 절대 금지 + 교훈
- 네이버 PUT/POST → 운영자 GO 없이 금지 · 자동발행 영구금지(#307)
- 디스코드 실발송 → 승인 없이 금지(크론 자동발송은 소싱봇/주간리포트 정상). ②검증 시 실발송 주의.
- 신규 파일은 Desktop Commander:write_file만(#330) · 대용량MD 추가는 edit_block 앵커
- 테스트 데이터 방치 금지 → 이번 세션 전부 정리(두 테이블 8/6 5건만 잔존)
- GET 목록 조회는 "최신 1회분"(#331) · 누적은 N일 보관 정리(#331 후속)
- 병렬 배분은 write set 겹침 0 확인 후(#322) · 범위 밖 파일 수정 금지(#97)
- dev 서버: 이번 세션 kill 완료(포트 3000 비어있음)
- **크론잡 진단 시 Vercel MCP `get_runtime_logs`/`get_runtime_errors`로 실제 invocation 유무를 직접 조회 가능**(로그 보관이 대시보드 UI 표기(1시간)보다 API는 더 길게(최소 7일) 조회됨) — "대시보드에 Enabled로 보임"과 "실제로 매일 실행됨"은 별개이므로 다음부터 크론 미실행 의심 시 이 방법을 1순위로 사용.
