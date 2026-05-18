# TASK_BRIDGE.md — Desktop ↔ Code 공동 기억 장치

> **이 파일의 역할**: 🖥 Desktop (planning + verify) 와 💻 Code (build + ship) 가 *실시간*으로 작업을 인수인계하는 ledger. SESSION_LOG가 세션 종료 후 회고라면, TASK_BRIDGE는 세션 진행 중 살아있는 hand-off 장부.
>
> **새 세션 첫 turn 의무 정독 순서**: PROGRESS.md → ROADMAP.md → SESSION_LOG.md → **TASK_BRIDGE.md** (현재 진행 상태 1분 파악).
>
> **갱신 정책**: 매 hand-off 시 §3 ACTIVE 섹션 갱신 의무. 완료 hand-off는 §7 ARCHIVED로 이동. T1 1000 / T2 1500 줄 임계 도달 시 작업원칙 #31 분할.

---

## §0 본 파일의 7-step 시스템 (작업원칙 #41)

| Step | 행동 | 책임 |
|---|---|---|
| 1 | 세션 시작 시 §3 ACTIVE 정독 | 양 환경 |
| 2 | §4 STANDING + §6 PENDING 확인 | 양 환경 |
| 3 | 작업 진행 (단일 commit 단위) | 작업 측 (Desktop or Code) |
| 4 | 완료 시 §3 ACTIVE 갱신 (FROM/TO/BASELINE/SCOPE/NEXT) | 작업 측 |
| 5 | hand-off 메시지 보고 (5-step 형식) | 작업 측 |
| 6 | 검증 측 cross-track 확인 (git + Vercel + DB + Chrome 가능 한 만큼) | 검증 측 |
| 7 | 통과 시 다음 ACTIVE로 갱신 → §3 이전 entry는 §7로 archive | 검증 측 |

---

## §1 두 환경 역할 표 (영구 참조)

| 측면 | 🖥 **Desktop** | 💻 **Code** |
|---|---|---|
| **MCP 강점** | Supabase / Vercel / Chrome / Filesystem(read) / image-search / web | Filesystem(write) / Bash / Git / TSC / Playwright |
| **주특기** | 리서치 · 아키텍처 · 오류 진단 · 외부 자료 대조 · 검증 smoke · paste-ready 본문 작성 | 코드 작성 · 테스트 · 패키지 · git · 로컬 서버 · MD 실 적용 |
| **할 수 있는 것** | Supabase `execute_sql`/`apply_migration` · Vercel deploy 조회 · Chrome E2E · 코드 read · *제안 본문* 작성 | 모든 파일 *생성/편집* · `tsc --noEmit` · `npm run build` · `git push` · MD 파일 *실제 적용* |
| **할 수 없는 것** | MD/코드 파일 *생성/편집* · git commit · 패키지 설치 | Supabase/Vercel/Chrome/image-search MCP 직접 호출 |
| **세션 시작 트리거** | "꽃틔움 가든 Desktop 진입 + TASK_BRIDGE §3 정독" | CLAUDE.md 자동 + 4 MD 정독 |
| **세션 종료 의무** | §3 ACTIVE 갱신 + 사용자에게 paste-ready 메시지 전달 | 동일 + git push + `verify-vercel-deploy.sh --wait` |

---

## §2 핑퐁 프로토콜 — 5-step 표준 hand-off 형식

```
┌─── [TASK BRIDGE] hand-off ──────────────────────────
│ FROM: 🖥 Desktop  ↔  TO: 💻 Code  (또는 역방향)
│ BASELINE: <SHA> (Vercel production READY)
│ SCOPE: <Sprint 이름 + sub-phase>
│
│ ▼ STEP 0 (점검) — Code 측이 자동 실행
│   cd /Users/jyekkot/Desktop/kkotium-garden && \
│   git rev-parse HEAD origin/main && \
│   git status --short && \
│   curl -s -o /dev/null -w "production_http=%{http_code}\n" \
│     https://kkotium-garden.vercel.app/
│
│ ▼ SCOPE (작업 범위) — 단일 commit 단위
│   <상세 변경 명세>
│
│ ▼ VERIFICATION TRIGGER (검증 신호)
│   push 직후 hash 보고 → Desktop이 자동:
│   (1) git HEAD + Vercel deploy cross-check
│   (2) Supabase 사전 단정 (필요 시)
│   (3) Chrome MCP smoke
│   (4) 결과 보고 + 다음 hand-off 또는 PENDING
│
│ ▼ FALLBACK (실패 시)
│   <회귀 시 즉시 대응 path>
└─────────────────────────────────────────────────────
```

역방향 (💻 Code → 🖥 Desktop) 도 동일 5-step.

---

## §3 ACTIVE HAND-OFF ⭐ (항상 최상단 한 섹션, 매 hand-off 시 갱신)

**Last update**: 2026-05-19 PM dome_code seed 진입

| 항목 | 값 |
|---|---|
| **FROM** | 💻 Code (직전 docs commit `61d88f6`) |
| **TO** | 💻 Code (본 commit, self hand-off) |
| **BASELINE** | `61d88f6` (TASK_BRIDGE.md 도입 commit) |
| **NEXT SCOPE** | dome_code seed (디퓨저) + P21·P22 등재 + §3·§5·§6 stale 갱신 (본 hand-off 자체) |
| **PENDING BLOCKER** | 없음 (Desktop Chrome MCP evidence 완료, NAVER grep 본 commit에서) |

### 본 hand-off 진행 흐름 (2026-05-19 PM)

```
사용자: dome_code seed 진행 의사 확인 + 옵션 3 권고 채택
↓
Desktop: Chrome MCP로 도매꾹 4-depth 카테고리 evidence 채집
↓ (P21·P22 발견)
Desktop: paste-ready 메시지 작성 (4-task) → Code 전달
↓
Code: 본 commit (NAVER grep + seed script + P21·P22 등재 + §3·§5·§6 갱신)
↓
Code: push + hash 보고
↓
Desktop: 4-source cross-track 검증 (git + Vercel + Supabase + Chrome)
→ 통과 시 §7 ARCHIVED에 본 commit 등재
```

---

## §4 STANDING DECISIONS (사용자가 영구 위임한 결정 — 변경 금지 사항)

| ID | 결정 | 근거 / 날짜 |
|---|---|---|
| SD-01 | Studio (/studio) footer 아랍어 텍스트 **영구 보존** — paper-cut 인벤토리 영구 제외, 수정/삭제/조사/문서화/source 추적 금지 | 사용자 의도적 개인 감사 메시지, 2026-05-18 |
| SD-02 | bornscent supplier DB INSERT 완료 (id `cm62770f54a42a46a4ae4c53d`, code `DMM-BRNSC`) — P2 자동 매칭 OK | Desktop이 Supabase MCP 직접 INSERT, 2026-05-18 |
| SD-03 | AI fallback chain = Groq (primary, 2 working keys) → Gemini 2.0-flash (3 keys round-robin) → Anthropic Sonnet (last-resort). Perplexity + xAI DEPRECATED | PROGRESS.md 2026-05-15 v3.1 FINAL 정합 |
| SD-04 | main 직접 push (1인 개발, 브랜치 없음) | 작업원칙 #4 |
| SD-05 | Vercel production = source of truth (dev 가정 production 아키텍처 금지) | 작업원칙 #28 |
| SD-06 | 사용자 닉네임 답변 본문 직접 입력 금지 (사용자 메시지 인용 / 코드 변수 / write_file MD만 허용) | 작업원칙 #29 e++ |

---

## §5 OPEN PAPER-CUTS (Sprint 7-PC 22-PC 인벤토리)

### 진행 완료 (5건)

| ID | 영역 | Commit | 상태 |
|---|---|---|---|
| P1 | 카테고리 prefill autofill | `742ce91` (PC-A hotfix) | ✅ silent fail 사라짐 — 디퓨저는 P13-D scope에서 d3 정확도 완성 |
| P2 | 공급사 매핑 (bornscent) | 비-commit (Supabase INSERT) | ✅ 70% 해소, 자동 매칭 작동 |
| P14 | 옵션 14종 silent truncation | `5a3b8c2` (PC-B-1 defensive) | ✅ 회귀 0 확정 — 14종 모두 input.value로 정상 렌더링 |
| P15 | 옵션 그룹명 매핑 | `29b7c49` (PC-B-2) | ✅ 디퓨저 → '향' 자동 적용 |
| P18 | dome_code passthrough infra | `5a3b8c2` (PC-B-1) + seed (본 commit) | ✅ infra + seed 완료 (dome_code 디퓨저 INSERT) — cache hit 활성화 |

### 진행 중 / 대기

| ID | 영역 | 권고 commit |
|---|---|---|
| P17 | supplier-notfound 시 배송 fallback | `29b7c49` (PC-B-2, infra 완료) — notfound 케이스 prefill URL로 실 검증 대기 |
| P19 | 혜택 prefill | PC-B-3 (P16 결정 후) |
| P16 | additionalImages 0건 (crawler 측) | PC-B-3 또는 PC-D 분리 (사용자 결정) |
| P20 | 기존 supplier 2건 (이현마켓, gseller2022) `domeggook_seller_id` NULL backfill | 사용자가 도매꾹 마이페이지에서 실제 seller ID 확인 후 Desktop이 Supabase MCP UPDATE |
| P13-A | seo-workflow Groq migration | PC-C |
| P13-B | description + perplexity Groq migration | PC-C |
| P13-C | keywords Groq migration | PC-C |
| P13-D | **category/suggest** Groq migration + FALLBACK_RULES 정정 + dome_code 자동 seed flow | PC-C (디퓨저 본질 fix) |
| P13-E | aeo-generate Groq migration | PC-C |
| P21 | crawler catD2 정규화 — 도매꾹 실제 "인테리어소품" → prefill "홈인테리어소품" 오염 (MEDIUM) | PC-D |
| P22 | crawler productNo 만료 갱신 — 도매꾹이 새 ID로 재등록 시 우리 DB stale 404 (LOW-MEDIUM) | PC-D 또는 Sprint 6-A 회귀 |

---

## §6 PENDING USER ACTIONS (사용자 직접 작업 대기)

| 항목 | 내용 | 트리거 |
|---|---|---|
| P20 supplier seller ID 확인 | 도매꾹 마이페이지에서 이현마켓 / gseller2022 실제 seller ID 확인 | 사용자 시간 |
| P16 scope 결정 | additionalImages crawler 수정을 PC-B-3 포함 or PC-D 분리 | 사용자 판단 |
| 첫 실 상품 NAVER 등록 | dome_code seed 완료 ✅ → 디퓨저 prefill → autoRunVisual end-to-end 검증 | Desktop Chrome 검증 통과 직후 |
| P21·P22 fix scope 결정 | crawler 정규화 + productNo 만료 갱신 fix 진입 시점 결정 | 사용자 판단 |

---

## §7 ARCHIVED HAND-OFFS (완료된 hand-off 누적)

> 30개 도달 시 `docs/plan/archive/TASK_BRIDGE_YYYY-MM.md` 분할.

### 2026-05-19

- ✅ PC-A 742ce91 (3-fix 통과) ← Desktop 검증
- ✅ PC-B-1 5a3b8c2 (P18 passthrough + P14 defensive) ← Desktop 검증
- ✅ PC-B-2 29b7c49 (P15 옵션 그룹명 + P17 배송 fallback) ← Desktop 검증

---

## §8 작업원칙 #41 본문

본 원칙은 PRINCIPLES_LEARNED.md에도 동일 등재.

### 작업원칙 #41 — 두 환경 핑퐁 프로토콜 (2026-05-19 명문화)

**배경**: Sprint 7-PC paper-cut batch에서 두 환경 (🖥 Desktop ↔ 💻 Code) 핑퐁 운영 패턴이 자연 발생. 본 패턴을 영구 작업원칙으로 등재.

**규칙 7가지**:

(a) **역할 상호 배타** — Desktop은 planning + verify, Code는 build + ship. 두 환경 overlap 0. §1 표 참조.

(b) **5-step 표준 hand-off** — 모든 hand-off는 §2 형식 (FROM / TO / BASELINE / SCOPE / VERIFICATION / FALLBACK).

(c) **TASK_BRIDGE §3 ACTIVE 갱신 의무** — 매 hand-off 직후 갱신. SESSION_LOG와 *역할 분리* (TASK_BRIDGE = 실시간, SESSION_LOG = 회고).

(d) **단일 commit 단위** — 변경 50 LOC 이하 권고. 단일 sub-phase 단일 commit.

(e) **push 직후 검증 의무** — `scripts/verify-vercel-deploy.sh --wait` exit 0 + Vercel `list_deployments` HEAD 일치 확인.

(f) **Cross-track 검증 4-source** — 가능한 한 git + Vercel + Supabase + Chrome 4 source 모두 cross-check. 단일 source 단정 금지.

(g) **한계 정직 보고** — Desktop은 MD edit 불가 / Code는 Chrome MCP 불가. 각자의 한계는 §1 표 그대로. *못 하는 작업 우회 시도 금지*, 다른 환경에게 hand-off.

---

## §9 컨텍스트 끊김 방지 (Recovery Drill)

세션 끊김 / 새 세션 진입 시 다음 4-step:

```
1. PROGRESS.md 헤더 정독 (직전 commit + 다음 작업)
2. ROADMAP.md "다음 새 채팅 시작 메시지" ⭐ ACTIVE 정독
3. SESSION_LOG.md 최근 entry 정독
4. TASK_BRIDGE.md §3 ACTIVE + §4 STANDING + §6 PENDING 정독 ★
   ↑ 본 layer가 새로 추가됨 — 4-step 모두 통과해야 정확한 상태 단정 가능
```

§3 ACTIVE 섹션이 *짧게 한 줄 인계 메시지*로 작동하도록 매 hand-off 시 갱신 의무. 사용자가 매번 paste하지 않아도 두 환경이 자동 sync.
