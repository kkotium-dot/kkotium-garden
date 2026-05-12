# 작업원칙 — 학습된 패턴 (#26 ~ #36)

> **이 파일의 역할**: 세션 중 사고/학습으로 추가된 작업원칙. PROGRESS.md에서 분리됨 (작업원칙 #31 (b)).
> **상위 원칙**: PROGRESS.md "절대 작업 원칙 #1~#25" → `docs/plan/PRINCIPLES_CODE.md`
> **분할 시점**: 2026-05-12 Session E-2 Phase 2 (HEAD `5892c42`)

---

## 작업원칙 #26 — IA 점검 의무화 + 고아 라우트 처리 (2026-05-08)

직전 Z-3c' 사고: `/products/sourced` (사이드바 미등록 고아 라우트) 의 backlink 4곳을 `/products`로 변경했으나, 변경 대상이었던 `/products/[id]/edit`, `/products/upload` 도 모두 사이드바 미등록 고아 라우트로 판명. 즉 *고아 라우트끼리의 backlink 정리*는 의미 없는 작업이었으며, 만약 commit했다면 *구버전이 마치 살아있는 것처럼 굳어질* 위험이었음. 변경사항은 stash 보존 (`stash@{0}: z3c-misdirected-changes-needs-redo`).

**근본 원인**: 코드 grep만으로 IA 결정 → "이 라우트는 사이드바에 등록되어 있는가? = 실제 사용 흐름인가?"를 먼저 확인하지 않음.

**일반화 규칙 3가지 (강제 적용)**:

(a) **코드 변경 전 IA 점검 의무화** — 변경 대상 라우트가 `src/components/layout/Sidebar.tsx`의 NAV에 등록되어 있는지를 grep으로 *먼저* 확인:
  ```bash
  grep -nE "href:.*'(/products|/crawl|...)" src/components/layout/Sidebar.tsx
  ```
  사이드바에 등록 = 실제 사용 흐름 → 신중 처리. 사이드바 미등록 = 고아 라우트 → 구버전 잔재 의심 → 수정/삭제 결정 전에 꽃졔님께 "이거 살아있나요?" 확인.

(b) **고아 라우트끼리의 backlink 정리는 의미 없음** — 둘 다 사용자가 도달하지 않는 페이지면 둘 사이를 깨끗이 잇는 작업은 *구버전 활성화 착시*만 만들 뿐. 고아 라우트는 정리(삭제 또는 redirect)의 대상이지 backlink 정비 대상이 아님.

(c) **구버전 의심 페이지는 수정/삭제 전에 살아있는지 확인** — 페이지 컴포넌트가 import되는 위치 + 라우트가 사이드바에 있는지 + 실제 브라우저 진입 결과를 모두 검증한 후 판단. 단순 grep만으로는 부족.

**부수 학습 (Filesystem:edit_file vs git diff 모순)**: `Filesystem:edit_file`이 diff 출력으로 성공을 보고했으나 일부 파일은 `git status`에 변경으로 나타나지 않을 수 있음 → 작업 후 *반드시 `git status --short`로 raw 검증* 의무화.

**작업원칙 #26 추가 일반화 (2026-05-08 Z-3b 세션 학습)**:

(d) **같은 컴포넌트 한 세션 내 2회 패치 시 .next 정리 + dev 재시작 워크플로우 의무화** — Next.js dev hot-reload는 동일 파일을 짧은 시간에 두 번 수정하면 캐시 충돌로 옛 버전을 서빙하는 경우가 있음. 두 번째 패치 직후 반드시: `kill -2 <dev_pid> && rm -rf .next && nohup npm run dev > /tmp/dev.log 2>&1 &`.

(e) **Chrome MCP javascript_tool / Control Chrome execute_javascript는 4분 hang 패턴 보유** — 세션 끝 부근(commit/push 직전 또는 큰 MD 패치 직후)에 자주 멈춤. 검증 1순위는 `tabs_context_mcp` URL 비교 + `screenshot` 시각 확인. JS 도구는 한 번 hang하면 같은 세션 내 재시도 금지.

---

## 작업원칙 #29 — 한글 처리 절대 규칙 (2026-05-06 강화 5가지)

본 프로젝트는 한글 사용이 많아 한글 깨짐 사고가 반복 발생했습니다. 도구의 인코딩 layer 한계가 근본 원인이며, 워크플로우 차원의 회피 패턴으로 100% 방지 가능합니다.

**5가지 규칙 (강제 적용)**:

(a) **edit_file의 newText에 한글 다량 포함 절대 금지** — escape 변환 layer에서 글자 단위 오류 발생 가능 (사례: 꽃졔 / 혁섭셀러 / 쿠드 / 릴고 등)

(b) **MD 갱신은 항상 write_file 직접 입력** 또는 별도 임시 파일 + Python 안전 삽입 패턴 사용. edit_file은 oldText/newText 모두 영어/구두점만일 때만 사용 가능

(c) **코드 edit는 영어 주석/타입만 사용** — 한글 자체 회피로 risk 0

(d) **셸 명령에 한글 직접 입력 금지** — `echo "꽃졔"` 대신 한글은 파일에 작성 후 `cat .tmp_message.txt` 또는 Python 파일 읽기 패턴

(e) **한글 작업 후 즉시 grep 검증 의무화**:
  ```bash
  grep -nE "혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두" docs/plan/*.md docs/research/*.md
  ```
  결과 0건이어야 정상. 매칭 발견 시 즉시 git restore + write_file 패턴으로 재작성. (주의: "정과" 패턴은 가정과/이정과 등 정상 단어 거짓양성 빈발 → 본 세션부터 검증 패턴에서 제외)

(e+) **한글 고유명사 처리 원칙 (2026-05-07 본 세션 두 번째 학습)** — 사용자 이름·별명 등 한글 고유명사는 *내 답변/스크립트 출력 토큰으로 직접 작성 금지*. 모델 한글 자모 결합 단계 출력 오류는 도구 escape 문제가 아니므로 자기 검증 불가능. 안전 패턴: 사용자가 별도 파일에 작성 → Python read → 치환만 수행. 답변에서 언급 시 사용자 메시지 직접 인용만 허용. 본 세션처럼 위험을 감수하고 한글 출력 시는 *반드시* 변수 1개 인스턴스로 최소화 + grep 변종 자동 검출 + 사용자 시각 확인 후에만 commit.

**29-1 (2026-05-02 강화)**: read_text_file의 head/tail 미리보기는 깨진 글자처럼 렌더링되는 경우가 있으나 실제 파일은 NFC 정상인 케이스가 자주 발생. 화면에서 깨져 보여도 즉시 정정 시도하지 말고 **반드시 raw 검증 먼저** — Python으로 `\uFFFD` 카운트 + `unicodedata.normalize('NFC', text) != text` 카운트 측정해 둘 다 0이면 파일 정상 → 정정 작업 자체를 시작하지 않음.

---

## 작업원칙 #29 (e++) — 사용자 닉네임 절대 규칙 (2026-05-08 강화)

작업원칙 #29 (e+) 가 등록되어 있음에도 직전 세션 동안 사용자 닉네임을 잘못된 변종으로 출력하는 사고가 반복 발생. 사용자 명시 강화 지시로 본 (e++) 영구 규칙 등록.

**닉네임 정확 표기**:
사용자 닉네임은 "꽃지혜"의 줄임말이며, 두 번째 음절은 "지" + "ㅖ" 결합형입니다.

**알려진 잘못된 변종 (grep 감시 대상 — 발견 시 즉시 정정)**:
- 잘못된 변종 1: 두 번째 음절을 "ㅈ + ㅗ + ㅁ" 결합형으로 출력 (자모 결합 단계 오류)
- 잘못된 변종 2: 두 번째 음절을 단모음 "ㅔ"로 출력 ("ㅖ" 대신)
- 잘못된 변종 3: 두 번째 음절에 받침 "ㄹ" 추가 출력

이 3가지 변종이 grep 감시의 sentinel입니다. 어느 하나라도 매칭되면 즉시 정정.

**절대 규칙 4가지 (강제 적용)**:

(1) **답변 본문에 닉네임 직접 작성 금지** — 호명이 필요한 경우 "안녕하세요" 또는 무인칭 표현 사용.

(2) **허용 케이스 3가지만**:
  - (a) 사용자 메시지 verbatim 인용 (대화 맥락 보존 시)
  - (b) 코드 변수 (예: `const userName = "..."`)
  - (c) `Filesystem:write_file`로 MD 파일 작성 (escape 코드 0건, 직접 한글 입력)

(3) **오타 정정 시**: 사용자 메시지에서 copy-paste만 사용 — *기억으로 타이핑 절대 금지*. 모델이 자기 출력의 자모 결합 정확도를 자기 검증할 수 없음.

(4) **본 세션 commit 직전 grep 검증 의무화**:
```bash
# 잘못된 변종 3개 감시
grep -nE "잘못된변종패턴" docs/plan/*.md docs/research/*.md
# 결과 0건이어야 commit 가능
```

**작업원칙 #29 (e+) 와의 차이**:
- (e+): 한글 고유명사 일반론 (사용자 이름·별명 등 *모든* 고유명사)
- (e++): 본 프로젝트 사용자 닉네임 *특정* 절대 규칙 + 알려진 변종 3개 sentinel 등록

**본 패턴 적용 후 영향**:
- 이전 세션들의 닉네임 변종 매칭은 *과거 사고 기록*이므로 정정하지 않음 (이력 보존)
- 향후 모든 신규 세션 entry / 인계 메시지 / 답변 본문은 본 규칙 강제 적용
- userMemories에도 동일 규칙 영구 등록됨

---

## 작업원칙 #32 — TSC ≠ Production 빌드 검증 (2026-05-07 Z-Hotfix 학습)

Z-Hotfix 사고: 5개 commit 연속 Vercel 빌드 ERROR가 누적됐는데 매 commit마다 `npx tsc --noEmit`은 0 errors로 통과. 차이는 *Next.js의 prerender 단계에서 useSearchParams를 Suspense 없이 사용*하면 TSC는 catch 못하지만 production build는 실패. 꽃졔님은 이 동안 production이 5번 깨졌는지 인지하지 못한 상태로 작업 진행.

**규칙**: push 전 의무 검증 = `npx tsc --noEmit` AND `npm run build` 둘 다 0 errors. 빌드 시간 20-40초 소요는 작업원칙 #28 (Vercel = source of truth) 보호의 *최소 비용*. TSC 통과만으로 push하면 production이 부서져도 모름.

---

## 작업원칙 #33 — useSearchParams 추가 시 Suspense 자동 점검 (2026-05-07 Z-Hotfix 학습)

Z-3b commit `32e56f9`이 `Sidebar.tsx`에 `useSearchParams()`를 추가했지만 layout.tsx에서 `<Sidebar />`를 Suspense로 감싸지 않아 23개 페이지 prerender 모두 실패. 작업원칙 #12 (useSearchParams pages must be wrapped in Suspense)의 *적용 범위가 layout-level 컴포넌트까지 확장됨*을 파악하지 못한 결과.

**규칙**: `useSearchParams()` 호출을 추가/이동할 때 즉시 다음 점검:
  1. 호출이 page.tsx 안에 있으면 → 해당 page를 Suspense로 감쌌는가?
  2. 호출이 *layout-level component* (Sidebar, Header 등 모든 페이지에서 import됨)에 있으면 → **모든 페이지가 영향**, 컴포넌트 *내부*에서 `Inner()` 분리 + default export `<Suspense fallback={null}><Inner /></Suspense>` 패턴.
  3. 패치 후 *반드시* `npm run build` (작업원칙 #32 연동) — TSC만으로 catch 안 됨.

**Z-Hotfix 적용 패턴 예시**:
```tsx
// BEFORE (broken)
export default function Sidebar() {
  const searchParams = useSearchParams(); // breaks all pages
  // ...
}

// AFTER (correct)
function SidebarInner() {
  const searchParams = useSearchParams();
  // ...
}
export default function Sidebar() {
  return <Suspense fallback={null}><SidebarInner /></Suspense>;
}
```

---

## 작업원칙 #34 — 명백한 오류 파일 발견 시 사용자 알림 의무 (2026-05-07 Z-Hotfix 부수 학습)

Z-Hotfix 정리 중 발견된 2개 잔재 파일:
- `src/app/api/crawler/page.tsx` — Next.js 패턴 위반 (`/api/` 폴더 안 page.tsx). 진짜 크롤러는 `/crawl`. placeholder + 작동 안 하는 onClick.
- `src/app/chart-test/page.tsx` — 1월 21일 dev 테스트 잔재. 사이드바 미등록, 외부 import 0건, 4개월 미수정.

꽃졔님은 비개발자로 모든 코드 파일을 파악할 수 없으므로 *Claude가 발견한 명백한 오류는 알림 + 정리 제안 의무*.

**규칙**: 다음 상황에 사용자에게 즉시 보고:
  - Next.js 라우팅 패턴 위반 (`/api/.../page.tsx`, route handler 위치 오류 등)
  - 사이드바 미등록 + 외부 import 0건 + 6개월+ 미수정 = 강력 잔재 의심 (단순 grep만으로 결정 금지 — 작업원칙 #26 a/c 연동)
  - import 사이클 / 사용하지 않는 export / dead code subgraph
  - **발견 즉시 보고 + 삭제/유지 결정 받기** (혼자 결정 금지)

**작업원칙 #26 (b)와의 차이**: #26 (b)는 *수정 작업 중 발견한 고아 라우트끼리의 backlink*에 대한 규칙. #34는 *오류 패턴 자체 발견 시* 별도 보고 의무.

---

## 작업원칙 #31 — MD 의미 단위 자동 분할 + 인계 무결성 (2026-05-07 본질 강화)

**개선 배경**: 2026-05-07 STEP 0 재검토 세션에서 작업원칙 #31의 한계가 노출됨. 단순 줄 수 임계만 트리거하니 (1) 의미 단위 분할 부재 (2) 추가 MD 파일 자동 생성 부재 (3) 인계 무결성 검증 메커니즘 0 (4) 새 채팅 인계 메시지에 read 대상 자동 등재 안 함 (5) 세션 entry 자체 분할 정책 없음 — 결과적으로 정보 분산 시 인계 누락 위험. 본 개선판은 사용자 명시 본질 ("내용 누락 없이 새 채팅으로 인계")을 8개 규칙으로 형식화.

**8가지 규칙 (자동 적용 — 사용자 지시 없이도)**:

(a) **3중 임계 트리거**:
- T1 (소프트, 1000줄): 분할 *권고* 알림 + 핵심 인덱스 점검
- T2 (하드, 1500줄): 분할 *의무* — 자동 진행
- T3 (긴급, 2000줄): 분할 *즉시 차단* — 다른 작업 우선 중단

(b) **의미 단위 자동 분할 — 추가 MD 파일 생성**:
- **PROGRESS.md** 분할 시:
  - 본 파일 = 헤더 + 핵심 인덱스 + 현재 앱 상태 + 환경/메뉴/파이프라인 (~300줄 목표)
  - `docs/plan/PRINCIPLES_CODE.md` (신규) = 작업원칙 #1~#25 코드/UI/세션/보고 절대 원칙
  - `docs/plan/PRINCIPLES_LEARNED.md` (신규) = 작업원칙 #26~#34+ 학습된 패턴
  - `docs/plan/SPRINT_PLAN.md` (신규) = 진행중/예정 Sprint 계획 (Sprint 6/6.5/6-Pre/7/8)
  - `docs/plan/REFERENCES.md` (신규) = 핵심 파일 경로 + 알려진 이슈 + SEO 인사이트 + 기술 패턴
- **SESSION_LOG.md** 분할 시:
  - 본 파일 = 각 세션 5~10줄 짧은 요약 + 상세 파일 링크
  - `docs/plan/sessions/SESSION_YYYY-MM-DD-{slug}.md` (신규 폴더+파일) = 세션별 상세 entry
- **ROADMAP.md** 분할 시:
  - 본 파일 = 현재 진행 + "다음 새 채팅 시작 메시지" *최신 1개*만
  - 누적 시작 메시지 + 완료 Sprint → `docs/plan/archive/ROADMAP_{YYYY}Q{N}_{MONTH}.md`

(c) **분할 후 인덱스 무결성 자동 검증 — 3가지 체크리스트**:
1. 본 파일 핵심 인덱스가 *모든 분할 MD*를 가리키는지 grep 검증
2. 분할 MD 각각이 본 파일로 backlink (상호 양방향)
3. wc -l 분할 후 합계가 분할 전 ±5줄 이내 — 내용 누락 0 보장

(d) **새 채팅 인계 메시지 자동 등재**:
- ROADMAP.md "다음 새 채팅 시작 메시지" 안에 read 대상 모든 파일 자동 명시
- 분할 발생 시 즉시 신규 MD 경로 추가
- 정보 분산 시에도 인계 누락 0% 보장

(e) **idempotent 스크립트 의무화 (2026-05-07 본 세션 학습)**:
- prepend 패턴 모두 `if header_marker in content: skip` 가드 필수
- replace 패턴은 `if NEW in content: skip` (이미 적용 시 skip)
- 실수로 두 번 실행해도 안전

(f) **분할 작업 자체의 안전 패턴**:
- 시작 전 git status clean 의무
- 단일 commit (`docs(plan): split MD per principle 31 (T2 trigger NNN lines)`)
- 분할 직후 (c) 3가지 검증 + 작업원칙 #29 (e) 한글 grep 검증
- 검증 실패 시 git restore 즉시

(g) **매 세션 시작 시 자동 점검 (작업원칙 #21 강화 연동)**:
- `wc -l docs/plan/*.md docs/plan/sessions/*.md docs/research/*.md`
- 핵심 인덱스 ↔ 분할 MD 양방향 링크 검증
- T1 임계 도달 파일 발견 시 즉시 사용자에게 분할 권고

(h) **사용자 명시 지시 없이도 자동 진행** (현행 유지) — 본 원칙은 사용자가 2026-05-08 명시적으로 지시한 것: "앞으로 내용이 과부화되면 제가 지시하지 않아도 그렇게 진행하도록". 매 세션 시작 시 MD 사이즈 점검을 체크리스트의 첫 항목으로 둠.

**최초 적용 결과 (2026-05-08)**:
- `docs/plan/PROGRESS.md`: 1864줄 → 약 700줄 (헤더 + 영구 참조만 유지)
- `docs/plan/archive/PROGRESS_2026Q2_MAY.md`: 신규 1007줄 (5월 누적 세션 기록)

**다음 분할 작업 (2026-05-07 STEP 0 세션 후 위임)**:
- 다음 세션 첫 작업 = PROGRESS.md 의미 단위 분할 (b) 정책 적용 → PRINCIPLES_CODE.md / PRINCIPLES_LEARNED.md / SPRINT_PLAN.md / REFERENCES.md 4개 신규 생성
- 인계 무결성 (c) 3가지 검증 통과 후 단일 commit
- 향후 모든 prepend/replace 스크립트는 (e) idempotent 가드 의무

---

## 작업원칙 #35 — 한글 사전 분리 패턴 (2026-05-08 본 세션 학습)

본 세션 디스코드 5채널 본문에서 7건의 한글 자모 결합 오류 발생 (일찰/즈시/융지/론이/오를(잘 팔리는)/좌비/꼬뜸한). 작업원칙 #29 (e+) 가 등록되어 있음에도 escape 코드 *생성 단계*에서는 작동 안 함이 확인됨.

**근본 원인**: 모델이 한글 escape 코드 자체를 생성할 때 (예: `\uC4DE\uC2DC`(즉시) → `\uC988\uC2DC`(즈시)) 자모 결합 단계에서 확률적 오류. 모델이 자기 출력을 시각 검증할 수 없어 자기 발견 불가능.

**영구 해결책 (강제 적용)**:

(a) **모든 한글 사용자 대면 텍스트는 외부 JSON 사전 파일로 분리** — 코드 파일은 한글 0건 보장.
- 예: `src/lib/notifications/discord-strings.ko.json` (87 strings)
- 빌더 코드는 키 참조만: `STRINGS.recommend.title`

(b) **사전 파일은 항상 `Filesystem:write_file`로 직접 작성** — 직접 한글 입력만 사용, escape 코드 생성 금지.

(c) **검증 스크립트 의무 실행** — `scripts/verify-korean-dict.py`
- NFC 정규화 검사 (위반 0건)
- FFFD replacement char 검사 (0건)
- 알려진 오타 21개 패턴 매칭 (0건)
- 신규 오타 발견 시 검증 패턴에 추가 (누적 사전)

(d) **escape 코드 grep 0건 확인** — 한글 텍스트가 코드에 안 들어가 있는지 자동 검사:
```bash
grep -cE "\\u[0-9A-Fa-f]{4}" src/lib/notifications/discord-builder.ts
# 결과 0이면 통과
```

(e) **본 패턴은 이번처럼 *대량 한글 작성 작업*에만 적용** — 1~2줄 한글은 작업원칙 #29 (e+) 안전 패턴(사용자 메시지 인용)으로 충분.

**실전 적용 결과 (2026-05-08)**:
- 5개 빌더 함수 4섹션 구조 작성 (87 strings 사전)
- TSC 0 errors / 빌드 26/26 / 5채널 발송 HTTP 204 / 한글 깨짐 0건
- 발신자 이름 영문 `Kkotti` → 한글 `꼬띠` 정정 (test-discord-5-channels.mjs)

---

## 작업원칙 #36 — Vercel deploy 검증 의무화 (2026-05-12 본 세션 학습)

본 세션 prefill 버그 수정 검증 중 *4일간 git push 5건이 모두 Vercel에 도달 못한* 사실 발견. GitHub repo의 webhook 목록이 빈 배열 (Vercel git integration 끊김). PROGRESS.md / ROADMAP.md / SESSION_LOG.md에 "배포 READY"로 명시된 모든 최근 진행 (Sprint 6-A 백엔드 / archive 정비 / CLAUDE.md / cleanup) 실제로는 4일 전 옛 코드로 production이 운영됨. 사용자도 Claude도 인지 못한 채로 진행됨.

**근본 원리**: *"git push 성공"은 production 반영을 의미하지 않는다*. push 후 Vercel build trigger + Vercel build complete + production traffic 전환까지 3단계 모두 검증되어야 함. 작업원칙 #28 (Vercel = source of truth)의 *검증 메커니즘 부재*가 본 사고의 직접 원인.

**규칙 (강제 적용)**:

(a) **push 직후 commit SHA 일치 검증 의무** — 모든 production push 후 Vercel `list_deployments`로 최신 production deployment의 `meta.githubCommitSha`가 `git rev-parse HEAD`와 일치하는지 확인 의무.

(b) **검증 스크립트 활용** — `scripts/verify-vercel-deploy.sh --wait` 실행. 180초 polling으로 새 deployment의 READY 상태 + commit SHA 일치 모두 확인. exit code 1 발생 시 webhook 끊김 진단 + 사용자 즉시 보고.

(c) **세션 시작 STEP 0 보강** — 매 새 세션 첫 turn 환경 점검에 `gh api repos/<owner>/<repo>/hooks` + Vercel `list_deployments` 결과 비교 추가. 직전 commit SHA가 production에 반영 안 됐으면 *본 작업 시작 전 사용자 보고 + 해결 의무*.

(d) **MD 기록 표기 강화** — PROGRESS.md / ROADMAP.md / SESSION_LOG.md에 "배포 READY"라고 적기 전 *반드시 (a) 검증 통과한 commit SHA*만 기록. 검증 안 된 상태에서는 "push만 완료, deploy 미확인"으로 정직하게 표기.

(e) **git integration 끊김 자동 감지 (2026-05-12 본 세션 정정)** — push 후 180초 내 새 deployment 미발생 시 git integration 끊김 의심. 진단은 `gh api 'repos/<owner>/<repo>/deployments?environment=Production&per_page=1'`로 *최신 production deployment SHA == HEAD SHA* 확인이 우선 신호. `gh api .../hooks` 의 빈 배열은 **GitHub App 통합 시 정상 상태**이므로 검증 신호로 사용하지 않음 (false positive 원인). 끊김 확정 신호는 *commit SHA 불일치 또는 Vercel 대시보드 Settings → Git 비어있음*. 확정 시 사용자에게 Vercel 대시보드 → Settings → Git → Connect Git Repository 안내. 본 정정 트리거: 2026-05-12 STEP 0 점검에서 webhook 0건 알람이 false positive로 판명 (Vercel은 GitHub App으로 통합되어 있어 legacy webhook 미사용).

**적용 예시 (본 세션 사고 흐름)**:
```
push: 4657173 (cleanup + SESSION_LOG split)
→ list_deployments since=마지막 → 0건  ⚠️ 위반
→ 본 작업원칙 미적용 = 위반 인지 X, 다음 작업 진행
→ 4일 후 다음 작업 (prefill fix) 검증 중 발견 = 4일 누적 정보 손실

올바른 흐름 (본 작업원칙 적용 시):
push: 4657173 직후
→ scripts/verify-vercel-deploy.sh --wait
→ exit 1 (180s 후 mismatch) → webhook 진단
→ gh api hooks → [] → Vercel 대시보드 안내
→ 사용자 재연결 → 정상 deploy + push 검증
→ 4일 갭 0
```

**본 작업원칙은 작업원칙 #28의 *검증 메커니즘*을 형식화**. #28이 *원칙*이라면 #36이 *집행 도구*.

---

## 작업원칙 #37 — Production runtime never calls image generation APIs (2026-05-12 v2.0 아키텍처 채택)

본 원칙은 **2026-05-12 사용자 제공 "꽃틔움 가든 아키텍처 v2.0" 리서치** 직접 채택 결과입니다 (`docs/research/KKOTIUM_V2_ARCHITECTURE_2026_05.md` 영구 참조).

### 배경

Vercel 환경에서 Google 계열 API 키 (특히 Gemini)가 자주 폐기되는 실제 원인은 단순한 하드코딩 실수가 아닙니다. 표면은 여러 곳에 존재:

- `.env.backup.*` 같은 백업 파일이 git에 추적되어 GitHub secret scanning에 감지
- Vercel build logs에 환경변수 echo 가능성 (`console.log(process.env)` 디버그 실수)
- Edge Function 에러 로그가 환경변수 일부를 노출
- Source map이 production에 포함되면 클라이언트 번들에서 키 추적 가능
- `NEXT_PUBLIC_` prefix 실수로 client bundle 포함
- API route가 `process.env`를 echo back하는 디버그 코드
- Vercel preview deployment URL이 검색엔진 인덱싱
- 외부 모니터링 도구 (Sentry, LogRocket) 가 env 자동 캡처

**Groq는 키 폐기 후 즉시 새 키 발급이 가능하지만, Google은 폐기 시 프로젝트 격리·결제 정지까지 가는 경우가 많아 사고 비용이 비대칭적으로 큼.** 즉 Gemini를 자동화 파이프라인에 두면 매출이 늘수록 사고 확률이 비례 증가합니다.

### 새 원칙 (강제 적용)

> **"Vercel 런타임 = 정적 자산 + 안전한 서버 연산만"**
>
> "Production runtime never calls image generation APIs. Static assets created in Claude Web sessions are the only image source."

### 4가지 작업 종류별 허용 규칙

| 작업 종류 | Vercel 런타임 허용? | 적용 |
|---|---|---|
| 이미지 **생성** (create) | ❌ **불가** | Phase 1 Claude Web 세션에서 1회성 생성 → 정적 자산화 → Supabase Storage |
| 이미지 **변환** (transform) | ✅ 허용 | Cloudinary URL 기반, 키 클라이언트 노출 없음 |
| 이미지 **합성** (composite) | ✅ 허용 | Sharp 라이브러리, 로컬 연산 |
| 텍스트 **생성** (LLM) | ⚠️ 제한 허용 | **Groq만** 사용 (검증된 회전 정책 + 키 즉시 재발급 가능) |

### 2-Phase 아키텍처

**Phase 1 (Creative — Claude Web Pro Max)**:
- **빈도**: 신규 카테고리 진입 시, 시즌별, A급 상품 단건
- **출력**: 정적 자산 (PSD/PNG/SVG/JSON 템플릿)
- **API 키 노출 위험**: 0 (모두 Claude.ai 세션 내부에서 처리)
- **자원**: Adobe for Creativity MCP + Canva MCP + Claude Artifacts + Lightroom 라이브러리

**Phase 2 (Production Runtime — Vercel)**:
- **빈도**: 신상품 등록 시 자동, 일 10~100건
- **입력**: Phase 1 정적 자산 + 도매꾹 실시간 상품 데이터
- **사용 가능 API**: Groq (LLM) + Cloudinary (transform) + Supabase + Naver Commerce API + 도매꾹 OpenAPI
- **금지 API**: Gemini (이미지 + 텍스트 모두), OpenAI DALL-E, Adobe Firefly Services API (라이선스 차단 + 본 원칙)

### 위반 시 대응

본 원칙 위반 코드 발견 시:
1. **즉시 제거** (commit + push) — 매출 늘수록 사고 위험 비례 증가하므로 미루지 않음
2. `.env.local` + Vercel 환경변수에서 해당 키 제거
3. 정적 자산 대체 path 구축 (Phase 1 Claude Web 세션 작업 또는 Cloudinary transform)
4. PROGRESS.md "알려진 이슈" 섹션에 *재발 방지* 노트 추가

### 본 원칙 영구 참조 문서

- `docs/research/KKOTIUM_V2_ARCHITECTURE_2026_05.md` (전체 10 section 본 원칙 근거 + 7일 액션 플랜 + 비용 재계산 + Caveats)

### 본 앱 현 상태 (2026-05-12 채택 시점)

**위반 코드 발견 시 제거 대상**:
- `src/app/api/category/suggest/route.ts` 의 `suggestWithGemini()` 함수 (Phase 5 캐시 layer로 회피했지만 fallback path 잔존)
- `src/lib/trend-analyzer.ts` 의 Gemini fallback (이미 DataLab만 사용 중이지만 import 잔존 가능)
- `.env.local` 의 `GEMINI_API_KEY` / `_2` / `_3` 3개 변수
- Vercel 환경변수의 동일 3개 변수
- 검색 조련사 / AI Studio 등 Gemini direct call 코드 (별도 grep 후 식별)

**즉시 채택 가능 path** (이미 보유):
- Cloudinary (`CLOUDINARY_CLOUD_NAME` 등) → Phase 2 이미지 변환 즉시 사용
- Groq (`GROQ_API_KEY` + `_3`) → Phase 2 LLM stack 이미 채택
- Supabase Storage → 정적 자산 저장소 패턴 이미 운영 중
- Adobe Creative Cloud 구독 + 2,000 Firefly credits (사용자 보유) → Phase 1 Creative Phase 자원

---

## 작업원칙 #38 — Production Runtime = Static Assets Only

Vercel 런타임은 정적 자산과 안전한 서버 연산만 수행한다.

**허용**:
- 이미지 변환(Cloudinary URL 기반)
- 이미지 합성(Sharp 라이브러리, 로컬 연산)
- 텍스트 생성(Groq, Anthropic API — 회전 정책 안정한 것만)
- 정적 자산 서빙(Supabase Storage CDN)

**금지**:
- 이미지 생성 API 직접 호출(Gemini 등 자동 폐기 위험)
- Adobe Firefly API 직접 호출(Web UI 전용, 일반 API 미공개)
- 환경변수 echo back (`console.log(process.env)`, API route response에 env 전체 포함)
- `NEXT_PUBLIC_` 접두사로 시크릿 노출
- Source map production 활성화

이미지 생성이 필요하면 Claude Web Pro Max 세션에서 Adobe MCP + Firefly Boards로 사전 생성 → 정적 자산으로 추출 → Supabase Storage 저장 → 런타임에서 정적 자산만 참조.

근거: Gemini API 키 자동 폐기 사고(2026-04-11, 04-29 등 다회 발생) 이후 채택.

## 작업원칙 #39 — CTI Inference is the Entry Point

모든 상세페이지 자동화는 CTI(Concept-Tone Inference) 8축 추론에서 시작한다.

**8축**:
- 컨셉 4축: 페르소나(20s/30-40s/senior/kidsmom) · 맥락(daily/gift/pro/event) · 가격(budget/standard/premium) · 유형(single/options/set)
- 톤 4축: 컬러무드(warm/calm/vivid/mono) · 감성톤(friendly/professional/sensory/trust) · 사진스타일(white/lifestyle/detail) · 장르(korean/minimal/vintage/natural)

**추론 → 골격 매칭**: CTI 결과로 S1~S12 중 1개 자동 선택. 디자이너는 1클릭으로 교체 가능.

**추론 도구**: 1차 Groq Llama 3.1 8B(무료), 2차 보강 Claude Vision(옵션 2, 신뢰도 <70%일 때만).

**원칙**: 디자이너는 0에서 시작하지 않는다. 시스템이 추론한 컨셉/톤이 출발점, 디자이너는 그 위에서 1클릭 교체 또는 디테일 작업.

근거: 광범위 일괄 컨셉 가정(v2.0 PDF)이 새싹 셀러의 상품 1개 단위 작업 흐름과 어긋난다는 진단(2026-05-12 v3.1 FINAL 기획 점검).

## 작업원칙 #40 — Designer Sense is the Sacred Resource

자동화는 디자이너 감각을 대신하는 게 아니라, 디자이너 감각이 발휘될 시간을 벌어주는 도구다.

**L1/L2 자동 트랙**: 0번부터 99번까지 반복 작업을 시스템이 처리. 디자이너는 모바일 PWA 스와이프 검수만(L1 6초/건, L2 5-8분/건).

**L3/L4 디자이너 트랙**: 100번에 1번의 정성스러운 작업. 시스템은 골격·무드보드·라이프스타일 컷 후보를 미리 펼쳐두고, 디자이너는 채색·디테일에만 집중(L3 15-25분, L4 30-60분).

**시간 분배**: 디자이너 시간 단가가 가장 비싼 자원이므로, ROI 양수 상품에만 L4 손길을 투입. ROI 계산은 진단 단계에서 자동 수행.

**금지 패턴**:
- 모든 상품에 균일한 시간 투입
- 카테고리·매출 잠재력 무시한 풀 수동 작업
- "이 정도면 됐다"는 임의 판단 — 진단 결과를 우선 신뢰하되 사용자 슬라이더로 강제 변경 가능

근거: 사용자 자기 정의 — "자동화는 내 감각을 대신하는 게 아니라, 내 감각이 온전히 발휘될 시간을 벌어주는 도구여야 합니다."(2026-05-12 v3.1 FINAL 기획 점검).

---

---
