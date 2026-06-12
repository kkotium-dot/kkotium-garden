# 꽃틔움 가든 (Kkotium Garden) — Claude Code Context

> 이 파일은 Claude Code가 세션 시작 시 자동으로 읽는 영구 컨텍스트입니다.
> 실시간 진행 상태는 항상 `docs/plan/PROGRESS.md` / `ROADMAP.md` / `SESSION_LOG.md` / **`TASK_BRIDGE.md`** (2026-05-19 도입)를 정독해서 확인하세요.

---

## 1. 세션 시작 시 필수 절차 (순서 준수)

매 새 세션 첫 turn에 반드시 아래 4단계를 수행하세요. 사용자가 별도 요청을 하기 전까지 본 작업을 시작하지 마세요.

### STEP 0 — 환경 점검 (bash)

```bash
cd /Users/jyekkot/Desktop/kkotium-garden && \
  git rev-parse HEAD origin/main && \
  git status --short && \
  git stash list && \
  git --no-pager log --oneline -5 && \
  wc -l docs/plan/*.md && \
  curl -sIo /dev/null -w "Vercel HTTP: %{http_code}\n" https://kkotium-garden.vercel.app/dashboard && \
  echo "Latest prod deploy SHA: $(gh api 'repos/kkotium-dot/kkotium-garden/deployments?environment=Production&per_page=1' --jq '.[0].sha[0:7] // "NONE"' 2>/dev/null || echo '?')" && \
  scripts/verify-vercel-deploy.sh 2>&1 || true
```

확인 포인트:
- HEAD == origin/main (불일치 시 사용자에게 보고)
- working tree clean (변경 있으면 보고)
- `docs/plan/SESSION_LOG.md`가 1500줄 초과 시 → 작업원칙 #31 분할 자동 진행
- Vercel HTTP 200 (5xx면 사용자에게 보고)
- **Latest prod deploy SHA == HEAD** (불일치 시 git integration 끊김 의심 → 작업원칙 #36 발동, 사용자 즉시 보고). Vercel은 GitHub App 통합 방식이므로 `gh api .../hooks` length는 0이 정상일 수 있음 — webhook 개수는 더 이상 검증 신호로 사용하지 않음 (2026-05-12 #36 (e) 정정).
- **verify-vercel-deploy.sh exit 0** (mismatch면 production이 옛 commit → 작업원칙 #36 발동). `VERCEL_TOKEN` 미설정 시 자동으로 `gh` CLI 기반 GitHub Deployments path로 fallback (token 발급 권장이지만 의무 아님).

### STEP 1 — 핵심 MD 정독

순서대로 정독:

1. `docs/plan/PROGRESS.md` — 슬림 상태 스냅샷 + 인덱스 (202줄, 2026-05-12 분할 후 진입점)
2. `docs/plan/ROADMAP.md` — Sprint 계획 + 다음 새 채팅 시작 메시지 영역
3. `docs/plan/SESSION_LOG.md` — 직전 5세션 상세 기록
4. `docs/plan/TASK_BRIDGE.md` — Desktop ↔ Code 실시간 hand-off ledger (2026-05-19 도입, 작업원칙 #41). §3 ACTIVE + §4 STANDING + §6 PENDING 의무 정독
5. (필요시 spot-read) — 작업 성격에 따라:
   - `docs/plan/PRINCIPLES_LEARNED.md` — 작업원칙 #26~#41 학습된 패턴
   - `docs/plan/PRINCIPLES_CODE.md` — 작업원칙 #1~#25 절대 작업 원칙
   - `docs/plan/SPRINT_PLAN.md` — Sprint 6/6.5/6-D/7/8/9+ 계획
   - `docs/plan/REFERENCES.md` — 핵심 파일 경로 / 알려진 이슈 / SEO / 기술 패턴
6. (선택) `docs/research/` 하위 — 진행 중 Sprint에 관련된 리서치 보고서

**Archive는 정독 대상 아님**: `docs/plan/archive/` 폴더는 분기/월별로 동결된 누적 기록입니다. `grep`으로 검색이 필요할 때만 참조하세요.

### STEP 2 — 사용자에게 현재 상태 브리핑

다음을 포함:
- 현재 HEAD 커밋 + 직전 세션 산출물 요약
- 다음 본 작업 (ROADMAP.md의 "다음 새 채팅 시작 메시지" 영역 기준)
- working tree에 미커밋 변경 또는 untracked 파일이 있다면 정확히 보고
- SESSION_LOG.md 분할 필요 여부

### STEP 3 — 사용자 승인 대기

작업원칙 강제: **명시적 승인 없이는 본 작업 시작 금지**. 브리핑 후 사용자 응답을 기다리세요.

---

## 2. 프로젝트 개요

### 본질

1인 네이버 스마트스토어 셀러(스토어명: 꽃틔움 KKOTIUM)를 위한 운영 자동화 SaaS. 도매꾹/오너클랜 크롤링 → 마진 계산 → AI SEO 최적화 → 네이버 Commerce API 등록 / 엑셀 일괄 등록까지 풀 파이프라인.

### 스택

- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- ORM: Prisma
- DB: Supabase PostgreSQL (project id: `doxfizicftgtqktmtftf`)
- AI: Gemini (3 키 round-robin, 주력) → Groq llama-3.1-8b-instant (무료 fallback, 14,400 req/day)
- 배포: Vercel production = `https://kkotium-garden.vercel.app` (source of truth)
- 알림: Discord 5채널 webhook + Solapi 알림톡 (월 50건 초과 시 활성화)

### 주요 외부 연동

- 도매꾹 OpenAPI (key: `a6ff7578051627fce0fa502046c470bb`)
- 네이버 Commerce API (Private API 28개 권한 전체 발급 완료)
- 네이버 검색광고 API (Customer ID: `3755315`)
- Supabase MCP 마이그레이션 (project id로 직접 SQL DDL 가능)

### 현재 단계 (스냅샷 — 항상 PROGRESS.md로 재확인)

- Phase A·B·C·D ✅
- Phase E ✅ (E-1/E-3/E-7/E-8)
- Phase E+ Sprint 1~5 ✅
- 워크플로우 재설계 Sprint A1a~A3-4a ✅
- Sprint 6-Pre 1·2·3 ✅, 6.5 SourceAdapter PoC ✅
- Sprint 6-D 1-5단계 (꼬띠 4모드 foundation) ✅
- Sprint 6-A 백엔드 (Option C 하이브리드 동적 임계값 재고 폴링) ✅
- **다음**: Sprint 6-A UI (재고 뱃지 + LowStockAlertWidget) + 첫 실제 도매꾹 상품 등록으로 폴링 검증

---

## 3. 코드 작성 절대 규칙

위반 시 즉시 롤백 + 사용자 보고. 예외 없음.

### 3-1. 한글 처리

- JSX에 이모지 절대 금지 — Lucide React 아이콘만 사용
- 모든 코드 주석은 영어로 작성
- 타입 리터럴(`'조합형'` 등)에 한글 문자열 금지 → 영어 상수로 분리
- 한글 사전 분리 패턴: 사용자 노출 한글 문구는 `src/lib/i18n/` 또는 별도 상수 파일에 격리

### 3-2. Prisma

- `new PrismaClient()` 절대 금지 → `src/lib/prisma.ts`의 싱글톤 import
- `keywords` 같은 JsonValue 필드는 항상 `Array.isArray()` 가드 후 사용
- 스키마 변경 후 `npx prisma generate` + dev 서버 재시작 필수

### 3-3. 네이버 카테고리

- 로컬 데이터(`src/lib/naver/naver-categories-full.ts` 4,993건) 사용
- API 호출 금지
- AI 프롬프트에 전체 데이터셋 전달 금지 (토큰 초과)

### 3-4. 환경 변수

- `.env.local`의 `$` 포함 값(bcrypt salt 등)은 `\$`로 이스케이프 필수
- dotenv-expand가 bare `$`를 변수 확장으로 처리하므로 깨짐

### 3-5. 검증

- 모든 수정 후 `npx tsc --noEmit` 0 errors 필수
- 작업 완료 마킹 전 **브라우저 테스트 의무** (API 200 응답만으로 불충분)
- 작업원칙 #32: TSC 통과 ≠ Production 빌드 통과 → 의심 시 `npm run build` 추가 실행

### 3-6. 이미지/발행 자산 규칙 (2026-06-05 명화 발행 후 명문화)

- **라이선스 안전**: 상업 무배상이 필요한 메인 대표컷은 Firefly(웹 UI 수동) 또는 Bria(무배상 API)만 사용. Stable Diffusion 등 상업 무배상을 제공하지 않는 모델은 메인컷 생성 금지.
- **브라우저 자동화 금지**: Adobe/Canva/Figma 웹 UI를 스크립트로 우회 금지(약관 위반·계정 정지 리스크). 공식 API 또는 사람 수동 작업만 허용.
- **네이버 대표이미지 규정(2024-10-28 강화)**: 대표이미지에 가격/할인/홍보 문구, 배송·원산지·A/S·인증 텍스트, 옵션 라인업컷, 본품과 구별 안 되는 소품 혼입 금지. 대표컷 = 단일 본품 누끼. 라인업/비교 컷은 추가이미지(2~10번)·상세페이지에 배치.
- **발행 이미지는 반드시 디자인 가공본**(누끼 + 자체 배경 합성). 공급사 원본 직송 금지(중복이미지·타사 브랜드 노출·가격비교 묶임·저품질 패널티).
- **자산 저장 이름 규약**: 엔진(asset-source-resolver)은 고정 이름 `cutout.png` / `backdrop-{skeletonId}.png`으로 자산을 조회. 저장 시 반드시 이 규약 준수(`myeonghwa-*` 같은 임의 접두어 금지). 정식 배포는 `scripts/upload-cutout.js` 스크립트 사용. 배선 결함(이름 불일치) 시 cutout이 fallback=공급사 원본으로 degrade되어 디자인 미적용 발행이 됨.
- **합성 표준 권위문서 (v8 참조 드롭)**: 본품 무드 합성(추가이미지/상세 히어로)은 `docs/design/ADAPTIVE_COMPOSITE_ENGINE.md`(v8 — 참조 드롭 하모나이즈·형태 가드·결정론 폴백·≥2무드·과대금지, 작업원칙 #61)를 권위로 따른다. 등록 전체 파이프라인(원산지·옵션재고·고시규격·이미지)은 `docs/design/PRODUCT_REGISTRATION_WORKFLOW.md` 권위. 상품현실시트 작성 후 finish-image(C-3)·apply-composite(C-7)·개입카드(C-9)·이미지 스튜디오(C-5) 경로.
- **매 상품 v8 (절대조건)**: 제품 합성 = 참조 드롭 하모나이즈(Firefly 참조 슬롯 -> Nano Banana 2) + 형태 가드, 실패 시 결정론 폴백(sharp). 생성 = 피사체 보존. 가독·참값 비례·사실성 = 절대조건.
- **충실도 카드 + 실물대조 = 발행 전 절대 게이트 (전상품)**: 상품별 충실도 카드(Product.fidelity — 형태·구성요소·금지데코·promptInject)를 이미지 프롬프트가 자동 prepend + 금지데코 네거티브 주입. 대표/추가 이미지 확정 시 충실도 카드 대조 개입카드(#56·fidelity_check)가 Operator Action Queue에 노출 → 운영자 실물대조 통과 후에만 발행(비가역 #46). 권위 docs/design/ADAPTIVE_COMPOSITE_ENGINE.md §11·§15.


### 3-7. 네이버 v2 상품 수정 = 전체 페이로드 교체 필수 (2026-06-06 명문화)

- **PUT `/v2/products/origin-products/{no}`는 FULL REPLACE** — 요청 body에서 누락된 필드는 네이버 상품에서 **제거**됨 (commerce-api discussion #1650). 따라서 부분 PUT(`{originProduct:{stockQuantity}}` 등) 절대 금지 → 상품명/가격/이미지/옵션/원산지/상세가 통째로 소실.
- **재고 수정도 예외 아님**: `updateStock`/`setProductOutOfStock`/`bulkUpdateStock`은 GET-merge 경로 사용 — `GET origin-products/{no}`로 현재 전체 상태 read → stockQuantity만 덮어쓰기 → 전체 payload PUT. (2026-06-06 `api-client.ts` 교정 완료. 이전엔 재고만 보내는 부분 PUT이라 listing 전파괴 위험이었음.)
- **신규 발행 외 모든 수정 경로는** DB 재구성(`buildNaverProductPayload`, register/update 라우트) 또는 GET-merge(재고 전용) 중 하나로 **반드시 전체 payload**를 구성할 것. 부분 PUT 코드를 추가하지 말 것.
- **비가역 가드**: 실 PUT은 `confirm:true && !dryRun`에서만. 라이브러리 함수(`updateStock` 등)는 `{dryRun:true}` 옵션으로 GET-merge 결과만 미리보기 가능(PUT 미실행).

---

## 4. 작업 흐름 절대 규칙

### 4-1. 승인 게이트

- 본 작업 시작은 사용자 명시 승인 후
- 한 turn 안에서 완료 가능한 단위로 분할 (컨텍스트 한계 대비)
- 중간 보고 금지 — 완료 후 한 번에 보고
- 못 하는 작업은 즉시 정직하게 알리고 사용자에게 위임

### 4-2. 닉네임 규칙 (작업원칙 #29 e++)

- 응답 본문 prose에 사용자 닉네임 "꽃졔" 사용 절대 금지
- 허용 예외: 사용자 메시지 직접 인용, 코드 변수명, `Filesystem:write_file`로 MD 파일에 기록
- 호칭이 필요할 때는 "안녕하세요" 또는 호칭 생략
- 알려진 오타 변종(grep 검출 sentinel): 꽃졤 / 꽃제 / 꽃젤 — 절대 출력 금지
- 닉네임 오타 수정 시 사용자 verbatim 메시지에서 복사-붙여넣기, 절대 기억에서 타이핑 금지

### 4-3. MD 파일 갱신 (작업원칙 #29 b + #31)

- 한글 다량 포함 MD 갱신은 `Read` + `Write`(전체 덮어쓰기) 또는 Python 안전 삽입 패턴
- `Edit`는 oldText/newText가 영어/구두점만일 때만 허용
- 1500줄 초과 시 `docs/plan/archive/`로 분할 (작업원칙 #31)
- 분할 후 한글 grep 검증 의무: 매 작업 후 아래 패턴 0건 확인

```bash
grep -nE "혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두" docs/plan/*.md docs/research/*.md
```

### 4-4. Git

- 모든 commit/push 전 TSC 0 errors + working tree 정합성 확인
- 커밋 메시지 prefix: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- 커밋 메시지에 한글 다량 포함 시 `.commit-msg.tmp` 파일 작성 → `git commit -F .commit-msg.tmp` (작업원칙 #17)
- main에 직접 push (1인 개발, 브랜치 없음)
- 작업원칙 #28: Vercel production이 source of truth. `npm run dev` 가정 production 아키텍처 절대 제안 금지
- **작업원칙 #36** — push 직후 `scripts/verify-vercel-deploy.sh --wait` 실행 의무. 180초 polling으로 production이 push한 commit으로 갱신됐는지 검증. exit code 1 발생 시 webhook 끊김 즉시 진단 (`gh api repos/<owner>/<repo>/hooks`)

### 4-5. 의심 파일 발견 시 (작업원칙 #34)

명백히 잘못된 파일명/구조 발견 시 (예: 공백 포함 파일명, deprecated 폴더 잔존) 자동 처리 금지 → 사용자에게 즉시 알리고 결정 위임.

---

## 5. 핵심 파일 경로

### 데이터 / 상수

- `src/lib/naver/naver-categories-full.ts` — 4,993 카테고리 (로컬)
- `src/lib/naver/naver-origin-codes.ts` — 518 원산지 코드 (로컬)
- `src/lib/prisma.ts` — Prisma 싱글톤
- `src/lib/sources/` — SourceAdapter 패턴 (DMM 도매매 + OWC 오너클랜)

### 핵심 비즈니스 로직

- `src/lib/naver/api-client.ts` — `naverRequest` (Commerce API)
- `src/lib/dome-inventory-poller.ts` — Sprint 6-A 재고 폴링 (Option C 하이브리드)
- `src/app/api/cron/inventory-sync/route.ts` — 6시간 주기 cron

### 컴포넌트

- `src/components/layout/Sidebar.tsx` — IA 결정의 source of truth (작업원칙 #26)
- `src/components/dashboard/` — 대시보드 위젯들

### 계획 / 진행 (이 폴더는 매 세션 정독 대상)

- `docs/plan/PROGRESS.md` — 슬림 상태 + 인덱스 (분할 이후 진입점)
- `docs/plan/ROADMAP.md` — Sprint 계획 + 새 채팅 시작 메시지
- `docs/plan/SESSION_LOG.md` — 직전 5세션 상세 기록
- `docs/plan/TASK_BRIDGE.md` — **Desktop ↔ Code 실시간 hand-off ledger** (2026-05-19 도입, 작업원칙 #41)
- `docs/plan/PRINCIPLES_CODE.md` — 작업원칙 #1~#25 (코드/UI/세션/보고)
- `docs/plan/PRINCIPLES_LEARNED.md` — 작업원칙 #26~#41 (학습된 패턴 + 두 환경 핑퐁)
- `docs/plan/SPRINT_PLAN.md` — Sprint 6/6.5/6-D/7/8/9+
- `docs/plan/REFERENCES.md` — 파일 경로 / 알려진 이슈 / SEO / 기술 패턴
- `docs/plan/archive/` (동결, 검색용)

---

## 6. Claude Code 환경 특이사항

### 6-1. 도구 매핑

웹 채팅과 비교:

| 작업 | 웹 채팅 | Claude Code |
|---|---|---|
| 파일 읽기 | Filesystem MCP | `Read` |
| 파일 쓰기 | `Filesystem:write_file` | `Write` |
| 파일 부분 수정 | `Filesystem:edit_file` | `Edit` |
| bash 실행 | `iterm-mcp:execute_command_in_terminal` | `Bash` |
| 코드베이스 검색 | 없음 | `Grep`, `Glob` |

### 6-2. 권장 MCP 추가

```bash
# 브라우저 테스트 (Chrome MCP 대체)
claude mcp add playwright -- npx -y @playwright/mcp@latest

# Supabase (마이그레이션 직접 실행)
claude mcp add supabase -- npx -y @supabase/mcp-server-supabase \
  --access-token=YOUR_SUPABASE_TOKEN
```

설정 후 `/mcp` 명령으로 연결 확인.

### 6-3. 슬래시 커맨드

- `/clear` — 컨텍스트 초기화
- `/compact` — 누적 대화 압축
- `/cost` — 토큰 사용량
- `/model` — Opus/Sonnet 전환
- `/mcp` — MCP 연결 상태
- `#` 접두사 — 메시지 앞에 `#`을 붙이면 본 CLAUDE.md에 자동 추가됨

### 6-4. Auto-accept 주의

`Shift+Tab`으로 켜면 파일 수정/bash가 자동 승인됩니다. `git push --force`, `rm -rf` 등 위험 명령 직전엔 반드시 꺼주세요. 평소엔 개별 승인 권장.

---

## 7. 작업원칙 빠른 인덱스 (#1~#25 → PRINCIPLES_CODE.md / #26~#45 → PRINCIPLES_LEARNED.md)

> ★ **AI 인프라 변경 시 #42~#45 반드시 정독** — 2026-05-19 명문화, Sprint 7-PC-C 사고 재발 방지.

- **#17** — commit message는 `.commit-msg.tmp` + `git commit -F`
- **#21** — 사전 점검 의무 (HEAD/status/stash/wc)
- **#24** — 한 turn 안에 분할된 작업 완료
- **#26** — IA 점검 의무화 + 고아 라우트 처리 (Sidebar.tsx 기준)
- **#28** — Vercel production이 source of truth (dev 서버 가정 금지)
- **#29 (a~e++)** — 한글 처리 절대 규칙 6가지
- **#31** — MD 의미 단위 자동 분할 (1500줄 임계, 2026-05-12 본 3번째 분할 완료)
- **#32** — TSC ≠ Production 빌드 검증
- **#33** — useSearchParams Suspense 자동 점검
- **#34** — 명백한 오류 파일 발견 시 사용자 알림 의무
- **#35** — 한글 사전 분리 패턴
- **#36** — Vercel deploy 검증 의무화 (push 후 `scripts/verify-vercel-deploy.sh --wait` 실행, webhook 끊김 자동 감지)
- **#37·#38** — Production runtime 외부 image API 호출 0 (정적 자산 + Sharp only)
- **#39·#40** — CTI Inference entry point + Designer Sense sacred resource
- **#41** — 두 환경 핑퐁 프로토콜 (Desktop ↔ Code hand-off, 2026-05-19 도입, TASK_BRIDGE.md ledger)
- **#42** ★ — AI policy 변경 시 코드 마이그레이션 동시 commit 의무 (PC-C 사고 재발 방지)
- **#43** ★ — 시크릿/API 키 포함 코드의 backup 패턴 절대 금지 (.bak/.old/.tmp 0건 정합, GEMINI revoke 사고 재발 방지)
- **#44** ★ — 에러 메시지는 코드 상태 변경 시 동시 갱신 의무 (stale fact 노출 방지)
- **#45** ★ — Production smoke는 출력 품질까지 단정 의무 (HTTP 200 + 구조 + 내용 fact-check 3-tier)

---

## 8. 새 세션 첫 메시지 권장 템플릿

사용자가 새 세션을 시작할 때 본 CLAUDE.md를 자동으로 읽지만, 명시적 트리거가 필요할 수 있습니다. 권장 첫 메시지:

```
docs/plan/PROGRESS.md, ROADMAP.md, SESSION_LOG.md를 모두 읽고
환경 점검(git status, wc -l, Vercel HTTP)을 수행한 후 현재 상태를
브리핑해주세요. 본 작업 시작은 제 승인 후에 진행해주세요.
```

ROADMAP.md의 "다음 새 채팅 시작 메시지" 영역에 더 구체적인 컨텍스트가 명시되어 있을 수 있으니, 정독 후 그 메시지를 우선 적용하세요.
