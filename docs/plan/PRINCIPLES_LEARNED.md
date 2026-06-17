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

**예외(2026-06-04 명문화)**: `src/lib/automation/firefly-generate.ts`의 **api 모드**는 #38의 예외 — 대표가 의도한 명시적 자동화 트랙이다. 단 기본값이 manual이라 키 부재 환경(현재)에서는 네트워크 생성 호출 0으로 #38과 충돌 0이며, api 모드는 엔터프라이즈 Firefly Services 키가 주입된 의도된 운영 환경에서만 활성. 키 부재/파트너 모델 시 manual로 fail-safe 강등(#46 허위 성공 0).

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

## 작업원칙 #41 — 두 환경 핑퐁 프로토콜 (2026-05-19 명문화)

**배경**: Sprint 7-PC paper-cut batch에서 두 환경 (🖥 Desktop ↔ 💻 Code) 핑퐁 운영 패턴이 자연 발생. 본 패턴을 영구 작업원칙으로 등재. 본문 + ledger는 `docs/plan/TASK_BRIDGE.md`에 보관.

**규칙 7가지**:

(a) **역할 상호 배타** — Desktop은 planning + verify, Code는 build + ship. 두 환경 overlap 0. TASK_BRIDGE.md §1 표 참조.

(b) **5-step 표준 hand-off** — 모든 hand-off는 TASK_BRIDGE.md §2 형식 (FROM / TO / BASELINE / SCOPE / VERIFICATION / FALLBACK).

(c) **TASK_BRIDGE §3 ACTIVE 갱신 의무** — 매 hand-off 직후 갱신. SESSION_LOG와 *역할 분리* (TASK_BRIDGE = 실시간, SESSION_LOG = 회고).

(d) **단일 commit 단위** — 변경 50 LOC 이하 권고. 단일 sub-phase 단일 commit.

(e) **push 직후 검증 의무** — `scripts/verify-vercel-deploy.sh --wait` exit 0 + Vercel `list_deployments` HEAD 일치 확인.

(f) **Cross-track 검증 4-source** — 가능한 한 git + Vercel + Supabase + Chrome 4 source 모두 cross-check. 단일 source 단정 금지.

(g) **한계 정직 보고** — Desktop은 MD edit 불가 / Code는 Chrome MCP 불가. 각자의 한계는 §1 표 그대로. *못 하는 작업 우회 시도 금지*, 다른 환경에게 hand-off.

근거: Sprint 7-PC 5 commits (48b50fa → 91a1eef → 9ae0673 → 742ce91 → 5a3b8c2 → 29b7c49) 모두 본 패턴으로 진행. 인간 paste-mediator 없이 두 Claude 환경이 자동 sync 가능 (사용자가 사용자 메시지로 hash만 전달하면 됨).

---

## 작업원칙 #42 — AI policy 변경 시 코드 마이그레이션 동시 commit 의무 (2026-05-19 명문화)

**배경**:
2026-05-15 v3.1 FINAL에서 "Groq primary" 결정 후 memory + PROGRESS.md는
갱신됐으나 코드의 5개 endpoint가 Perplexity 호출 잔존 상태로 약 5일 운영.
사용자가 황금 키워드 사냥 위젯 빨간 에러 박스 발견 후에야 단정.

**규칙**:
- AI provider/모델 정책 변경 결정 시 *동일 commit 안에 모든 endpoint 마이그레이션 포함*
- PROGRESS.md + memory 단정 직후 → 코드 grep으로 사용처 모두 확인 → 동일 commit
- "다음 sprint로 미룬다"는 결정은 *반드시 paper-cut 인벤토리에 명시 등재*
- 미등재 + 미마이그레이션 상태 0건 정합 의무

**검증 패턴**:
- AI policy 변경 commit 직후:
  ```bash
  grep -rn "Perplexity\|Gemini\|Groq\|Anthropic\|openai" src/ --include="*.ts"
  ```
- 잔존 사용처 모두 단일 commit으로 정합화 또는 paper-cut 등재

**메타-단정 사례 (2026-05-19 PM 후속, Sprint 7-PC-D)**:
- PC-C `2276ed7`에서 5 endpoint Groq 정합 완료 후에도 잔존 6 endpoint *4일간 코드 0건 변경* 상태로 운영
- 사용자가 "PERPLEXITY 만료 → 사용 안 함" 명시한 후 일괄 제거 (Sprint 7-PC-D)
- 학습: "DEPRECATED 상태" + paper-cut 등재만으로는 부족 — *4일 갭 사이 사용자 노출 위험 잔존*
- 강화: 사용자 직접 결정으로 DEPRECATED → REMOVED 격상 시 *24h 내 전면 제거 의무*

---

## 작업원칙 #43 — 시크릿/API 키 포함 코드의 backup 패턴 절대 금지 (2026-05-19 명문화)

**배경**:
src/lib/gemini.ts.bak 파일 잔존이 GEMINI_API_KEY 노출 → revoke 사고 원인.
`.bak` 패턴은 git tracking + 원격 push로 영구 공개 위험.
PC-C-hotfix 시점 git-tracked .bak/.old 파일 17개 일괄 삭제.

**규칙**:
- 시크릿/키 호출 코드의 `.bak`, `.old`, `.tmp` 파일 *코드베이스 0건 정합*
- 코드 변경 시 backup 필요 시 git stash 또는 별도 브랜치 사용 (commit 0건)
- .gitignore에 `*.bak`, `*.old`, `*.tmp.[a-z]*` 패턴 추가 의무
- 신규 키 발급 *전*에 backup 파일 0건 검증 의무

**검증 패턴**:
- 매 commit 전:
  ```bash
  find . -name "*.bak" -not -path "./node_modules/*" \
    -not -path "./.next/*" -not -path "./.git/*" \
    -not -path "./.claude/worktrees/*"
  ```
- 0건 정합 시에만 push 허용
- git ls-files | grep -E "\.bak$|\.old$" 결과 0건 의무

**검증 패턴 (2026-05-19 PM 강화 — 메타-단정 사례)**:

단일 패턴 grep은 *다른 패턴 누락을 보장하지 않는다*. 직전 `.bak` 일괄 삭제 후에도 `.backup` 60건이 추가 잔존 (Desktop search_files 단정). 따라서 멀티 패턴 union grep 의무:

```bash
find . \( -name "*.bak" -o -name "*.backup*" -o -name "*.BROKEN*" \
          -o -name "*.old" -o -name "*.v[0-9]*" \) -type f \
  -not -path "./node_modules/*" \
  -not -path "./.next/*" \
  -not -path "./.git/*" \
  -not -path "./.claude/worktrees/*"
```

- 0건 정합 시에만 push 허용
- `.gitignore`의 backup section 정기 검토 권고 (월 1회)
- 메타-단정 사례 (2026-05-19 PM): 룰 등재만으로는 부족 → 등재된 룰이 *그 자체로 검증되어야* 권위 정합. PC-C-hotfix `f9119a0`에서 `.bak` 17개 삭제 후 PC-C-archive에서 `.backup` 60건 추가 발견 — 단일 패턴 grep 한계 노출

---

## 작업원칙 #44 — 에러 메시지는 코드 상태 변경 시 동시 갱신 의무 (2026-05-19 명문화)

**배경**:
/api/ai/seo-workflow line 423의 "Perplexity API 크레딧이 부족합니다.
GEMINI_API_KEY를 .env.local에 추가하면 무료로 사용 가능합니다." 메시지가
AI chain 변경 후에도 stale하게 남아 사용자에게 fact 오류 안내.

**규칙**:
- AI provider/모델/키 정책 변경 시 *모든 에러 메시지 grep + 정합 갱신 의무*
- 에러 메시지에 *환경변수명 직접 노출 금지* (예: "GEMINI_API_KEY 추가")
  → 일반화된 안내로 교체
- 권고 메시지 패턴:
  "AI 서비스 일시 응답 없음 (제공자 모두 실패). 잠시 후 재시도해주세요."
- 사용자 노출 메시지는 fact-check 후에만 production 배포 허용

**검증 패턴**:
- AI 관련 commit 시:
  ```bash
  grep -rn "API_KEY\|.env.local" src/ --include="*.ts"
  ```
  → 사용자 노출 메시지 0건 정합
- 에러 메시지 변경 시 동일 commit에 사용자 노출 단정 (Chrome MCP smoke 권고)

---

## 작업원칙 #45 — Production smoke는 출력 품질까지 단정 의무 (2026-05-19 명문화)

**배경**:
2276ed7 commit에서 HTTP 200 + provider 정합 + qualityScore 75 통과했으나
실제 productNames 텍스트 "촛소시우에 촛소시우에 촛소시우에" 반복 출력.
구조 검증만으로 user-facing 결함 단정 불가. llama-3.1-8b-instant 한국어
한계 → llama-3.3-70b-versatile hotfix 진행 (P24).

**규칙**:
- AI/생성 API endpoint 변경 commit 직후 Desktop이 *실제 응답 텍스트 시각 단정*
- HTTP 200 + 응답 JSON 구조 정합 + *내용 fact-check* 3-tier 검증
- 텍스트 응답 검증 항목:
  - (a) degenerate 출력 (동일 토큰 3회+ 반복) 0건
  - (b) 다양성 (3개 variant 모두 동일) 0건
  - (c) 언어 정합 (한국어 요청 → 한국어 응답) 100%
- 결함 발견 시 hotfix paper-cut 즉시 등재 + 24h 내 fix

**검증 패턴**:
- Desktop이 curl로 production 응답 fetch
- 응답 JSON의 자연어 필드 (name, text, description) 시각 단정
- 결함 패턴 발견 시 작업원칙 #21 정합 (근본 원인 추적)

---

---

## 작업원칙 #46 — 거짓 라벨 금지: registry/UI는 실 가동 단정 후 등재 (2026-05-19 명문화)

**배경**:
2026-05-19 Sprint 8-IA 진입 결정 시 발견. 직전 세션에서 만들어진 `/automation` 페이지의 `automation-registry` 26-entry 중 14개가 *미구현 작업의 사전 라벨*. 사용자가 "정상 17"으로 표시된 화면을 보고 *실제로는 cron 3건만 가동*임을 직접 시각 점검으로 발견. 파워셀러 시각: 작동하지 않는 기능이 작동한다고 표시되는 게 가장 큰 운영 리스크 (사용자 신뢰 깨짐).

**원인 진단**:
- "향후 작업의 *등록 지점*을 미리 깔아둔다"는 의도 → 실제로는 *미구현을 정상으로 위장*
- registry는 모니터링 도구가 아니라 *사용자에게 시스템 상태를 보고하는 화면*
- 미가동 작업을 미리 등재하면 *그 행이 정상으로 표시되는 순간 거짓 보고*

**규칙 5가지 (강제 적용)**:

(a) **registry 등재 = 실 가동 단정 후만** — 다음 3 조건 모두 통과해야 entry 추가:
  1. 코드 구현 완료 (production deploy 통과)
  2. 최소 1회 실 실행 확인 (cron 발화 또는 on-event trigger 성공)
  3. 로그/메트릭 endpoint 존재 (상태 fetch 가능)

(b) **미가동 작업은 *Sprint 인벤토리*에 등재** — `SPRINT_PLAN.md` 또는 `ROADMAP.md`에만 명시. registry/UI에는 진입 금지.

(c) **사용자 노출 UI에서 "준비"/"대기"/"보류" 상태 금지** — 사용자가 보는 화면은 "정상" 또는 "오류" 2가지만. "준비/대기/보류"는 *관리자 영역* (`/admin/*`)에서만 허용.

(d) **상태 라벨은 *fetch 결과 기반*만 허용** — hardcoded "정상" 라벨 금지. 매 페이지 로드 시 endpoint fetch → 실 상태 표시. fetch 실패 → "오류" 표시 (가짜 정상 금지).

(e) **신규 자동화 작업 commit 시 registry entry 동시 추가 의무** — 코드 commit + registry entry는 *같은 commit*. 분리 시 *commit gap 동안 가짜 라벨 발생 위험*.

**검증 패턴**:

```bash
# registry entry 수 == 실 가동 작업 수 검증
grep -c "id: '" src/lib/automation-registry.ts
# == 실 cron 작업 + Discord 채널 + 알림톡 등 가동 단정된 것의 합
```

신규 자동화 sprint 진입 시:
1. 코드 구현 → production deploy → 실 실행 확인 (검증 통과)
2. 같은 commit에 registry entry 추가
3. 사용자 노출 UI에서 자동으로 "정상" 표시 (hardcoded 아님)

**적용 사례 (2026-05-19 Sprint 8-IA Phase 1)**:

- BEFORE: registry 26 entry (정상 17 / 대기 2 / 보른 6 / 준비 2)
  - 정상 17 중 *실제 가동*: 3건 (재고폴링 + 일배치 + 주배치)
  - 14개 가짜 정상 라벨 = 본 원칙 *직접 발화 사례*
- AFTER (Phase 1 적용): registry 8 entry (정상 8 / 대기 0 / 보류 0 / 준비 0)
  - 모두 실 가동 단정된 작업만 (Discord 5채널 + 재고폴링 + 일/주 배치)
  - 사용자가 본 화면 = 실 상태 100% 정합

**파생 학습**: "registry는 *미래 작업의 등록 지점*이 아니라 *현재 가동의 보고 화면*". 등록 지점 역할은 `SPRINT_PLAN.md`가 담당. 두 역할을 한 파일에 합치면 *시점 충돌* 발생 → 본 사고가 그 직접 사례.

---

## 작업원칙 — publishReady 라벨의 검사축 명시 의무 (#46 확장, 2026-05-31 학습)

**사고**: 달항아리 상세 환각제거 cycle 후 `publishReady=true`로 라벨이 떴으나, 네이버로 실제 전송되는 naver_* 페이로드 17필드가 전부 NULL이었음. authentic 게이트는 detail PNG 콘텐츠만 검사하고 네이버 전송정보는 미검사 → 발행 불가 상태에서 "발행가능" 거짓신호.

**교훈**: **publishReady 라벨은 검사 축을 명시해야 한다. authentic(PNG) ≠ naverPayloadComplete(전송정보).** 발행 게이트는 네이버로 실제 가는 페이로드를 검증해야 하며, 자산 미리보기 검증만으로 "발행가능" 라벨을 붙이는 것은 #46(거짓 라벨 금지)의 확장 위반.

**시스템 강제**:
- `evaluatePublishReadiness`의 publishReady는 다축 AND: `fieldsAllSet && authentic && naverPayloadComplete && status=DRAFT && naverProductId=null`.
- 각 축은 응답에 독립 노출 (publishReady만 보지 말고 어느 축이 false인지 확인).
- 신규 게이트 축 추가 시 라벨 라이브 의미가 변함 — 회귀 0 + 전 상품 영향 신경.

**파생 학습**: 단일 boolean 신호는 *축의 합성*이지 단일 진실이 아니다. 라벨이 true일 때 어느 축 통과로 true인지 추적 가능해야 한다. 단축 추가 시 기존 true가 false로 강등되는 것은 *의도된 강등*(거짓신호 차단).

---

## 작업원칙 #47 — AI 생성 인물 정책: 익명 모델 허용 / 특정 실존인물 금지 (2026-06-04 대표 확정)

**정책 변경(대표 확정)**: 상품·컨셉상 사람이 들어가야 감도가 사는 경우 AI 생성 인물 등장을 허용한다. 단 (a) 특정 실존 모델(연예인·식별 가능 개인·유명인 얼굴) 생성 금지 = 익명 일반 모델/비식별만, (b) 미성년자 부적절 묘사 금지(상업 제품컷 맥락 유지).

**대체 관계**: 구 하드룰 "얼굴 없는 인체 일부 전략"(KKOTIUM_ART_DIRECTION_RESEARCH_2026-05-29 §3-D, DETAIL_PAGE_PLAYBOOK §5)은 본 정책으로 대체된다. 법적 근거: 익명·비식별 모델은 퍼블리시티권(부정경쟁방지법 (타)목)·표시광고법(AI 가상인물 광고 표시) 리스크를 회피하므로 "식별 불가" 조건만 지키면 허용 가능.

**Firefly 공통 네거티브(인물 포함 시)**: `no recognizable celebrity, no specific real person likeness, no text, no logo, no watermark, no brand marks`.

**적용 의무(#44 stale fact 연동)**: 본 정책 변경 시 구 하드룰을 명시한 라이브 SOP(DETAIL_PAGE_PLAYBOOK §5)를 동시 갱신한다(본 turn 이행). 동결된 과거 리서치/핸드오프(KKOTIUM_ART_DIRECTION_RESEARCH, HANDOFF_S2 등)는 시점 기록이므로 보존하되, 본 #47이 최신 권위임을 본 ledger로 단정.

**권위 문서**: docs/handoff/FIREFLY_CONCEPT_PROMPTS_v2_human_allowed_2026-06-04.md §0.

## 작업원칙 #48 — 도구 생태계 라우팅 규칙 (2026-06-04 명문화, TOOL_ECOSYSTEM_MANUAL 근거)

**도구 라우팅(고정)**:
- **이미지 생성** = Adobe Firefly 웹 1-click(대표 수동) — Firefly Services api 모드는 엔터프라이즈 키 장착 시에만(작업원칙 #38 예외).
- **가공**(누끼/리사이즈/리프레임/합성준비) = Adobe MCP 자동.
- **합성·연속성**(상세페이지 레이아웃) = 빌더(section-builder/composeContinuous) + 디자인 도구(Figma). sharp 단순 적층은 약함 — 빌더 연속 캔버스가 담당.
- **시안·의사결정·배너**(내부용, 2026-06-05 추가) = 캔버스 시각화(Claude Design 류) / Canva — 발행 GO/NO-GO 의사결정 카드·둘째 상품 hero 시안 탐색·단발 이벤트 배너. **판매 발행물 아님** → IP 면책 불요. 판매 자산은 여전히 Firefly-native 생성 + Figma 양산만(면책 경계 불변).

**연결 상태 명문화(2026-06-05 갱신, #44 stale-fact)**:
- **AEM MCP**: 연결 유지(2026-06-05 대표 재연결), 단 현재 1인 셀러 워크플로우 미해당 — 향후 멀티채널 확장(자사몰 등) 시 활용. **Adobe Marketing Agent MCP**: 동일(연결 유지·현재 미해당). 억지 편입 금지(정직 평가 #46) — 엔터프라이즈 CMS/마케팅 운영 도구로 현재 1인 셀러 호출 표면 없음.

**파트너 모델 면책 경계(중요)**:
- FLUX / Nano Banana / gemini-image / imagen / gpt-image 등 **파트너(비 Firefly-native) 모델은 IP 면책 없음** → **최종 판매물(발행 자산)로 사용 금지**. Firefly-native(firefly-image-4/4-ultra/5, 유료 플랜 면책)만 판매물 허용. firefly-generate.ts는 api 모드에서 파트너 모델을 manual로 강등해 자동 발행 경로에서 배제(주석 반영).

**근거**: docs/research/TOOL_ECOSYSTEM_MANUAL_2026-06-04.md + 빌더 하이브리드 대수술 STEP5. 2026-06-05 보강(Claude Design 슬롯 편입·AEM 재연결 정정): docs/handoff/HANDOFF_claude_design_slot_aem_2026-06-05.md.

---

## 작업원칙 #49 — Desktop 핸드오프 직접 write 인계 (2026-06-04 명문화, 손품 제거)

**배경**: 기존 핑퐁은 Desktop이 핸드오프 작성 → 대표가 다운로드 → Claude Code에 업로드(첨부)하는 사이클로, 매 핑퐁마다 대표 수작업 발생.

**실증(2026-06-04 Desktop)**: Filesystem:write_file로 docs/handoff/에 한글 핸드오프 직접 작성 → read 재검증 결과 한글·특수문자(·, ★, →)·따옴표 깨짐 0 확인. 다운/업로드 사이클 불필요 입증.

**규칙**: Desktop → Code 인계 시, Desktop은 핸드오프 MD를 docs/handoff/에 Filesystem:write_file로 직접 작성한다. 대표는 Code에 "docs/handoff/{파일명} 정독" 한 줄만 전달(다운/업로드 0).
- **적용 범위**: 핸드오프/인계 문서(일회성). Desktop write_file = 전체 작성(overwrite)이라 안전.
- **제약(불변)**: 큰 추적 MD 5종(PROGRESS/ROADMAP/SESSION_LOG/TASK_BRIDGE/CLAUDE) 및 PRINCIPLES_LEARNED 등 누적형 한글 MD의 부분 편집은 여전히 Code의 Python full-overwrite(#29b 불변 — Desktop이 큰 파일 전체 덮어쓰면 기존 내용 유실 위험).
- **git**: Desktop write 파일은 git 미추적 → Code가 작업 turn에 git add/commit으로 보존.
- **역할 분담**: Desktop=핸드오프 직접 쓰기 / Code=큰 추적 MD 반영 + git 보존.

**근거**: docs/handoff/HANDOFF_principle49_publish_handoff_2026-06-04.md §0.


## 작업원칙 #50 — 신규 테이블 의존 코드는 migrationPending 가드로 역순배포 안전화 (2026-06-06 학습, Phase 1 asset_jobs)

**문제**: 새 DB 테이블(asset_jobs 등)을 읽는 코드를 마이그레이션 적용 전 push하면, production에서 테이블 부재(Prisma P2021)로 런타임 에러. 그러나 마이그레이션 선행(commit 보류) → push 순서는 두 환경 핑퐁(#41)에서 직렬 대기를 강제해 느림.

**규칙**: 신규 테이블을 읽는 라우트는 P2021/relation-does-not-exist를 catch해 `{migrationPending:true}` 등 안전 응답으로 degrade한다. 그러면 (a) 코드 push가 마이그레이션보다 먼저여도 production 무중단(위젯은 '준비 중' 표시), (b) Desktop이 Supabase apply_migration 적용 시 자동으로 정상 표시 전환. 마이그레이션 SQL은 docs/handoff/에 박제(단일 소스, prisma/migrations는 gitignore).
- **적용 범위**: 신규 테이블 read 경로(집계/조회 API). 신규 테이블 write 경로는 마이그레이션 선행 필수(쓰기는 degrade 불가).
- **검증**: 가짜 초록 금지(#46) — migrationPending은 '데이터 없음'이 아니라 '준비 중'으로 명시 표시.

**근거**: 본 세션 /api/products/asset-jobs-matrix가 P2021 가드로 a55976b/e9a6c95 push를 Supabase 마이그레이션보다 먼저 안전 배포.


## 작업원칙 #51 — 제품교체 B안: 실제 제품 누끼 고정 + 배경만 AI (2026-06-06 대표 확정)

**규칙**: AI 생성 이미지의 "상상 제품"을 실제 제품으로 교체(재생성/채우기 swap)하지 않는다. 실제 제품 누끼를 고정하고 배경/무드만 AI로 생성해 레이어 합성 + 빛 정합한다. 라벨·텍스트·형태 왜곡 0.
- **근거**: Adobe/Google 공식 문서가 재생성 시 라벨·텍스트 보존 미보장 + 소비자 71% '실물 불일치' 반품(Salsify). 라벨 유리병(명화 등)은 재생성 시 라벨 왜곡 = 전환↑ 노리다 반품↑ 자충수.
- **대표이미지 = 흰배경 누끼만**(네이버 2024-10-28): 라이프스타일 합성컷은 상세/추가 전용. 코드 가드 = naver-normalize.ts assertWhiteBackground(4모서리 luma/chroma) + assertRepresentativeAssetKind.
- **방향전환 트리거**: 라벨 왜곡 클레임/네이버 제재 1건 → 흰배경 누끼 회귀.

## 작업원칙 #52 — 브라우저 반자동 핸드오프: detect→deliver→resume (2026-06-06)

**규칙**: 대표가 로그인 Chrome 환경을 열어두면 AI(Claude in Chrome)가 이어받되, 비가역·고위험·봇차단 단계는 사람이 한다.
- **사람**: 로그인/MFA, CAPTCHA, 로컬 파일 업로드, 다운로드 확인, 결제·발행 비가역 클릭, 최종 품질 승인.
- **AI**: 프롬프트 입력, 생성 클릭, 변형 선택, 내비게이션, 상태 폴링, 로그 읽기.
- **패턴**: AI가 인증벽/업로드 지점 감지→일시정지(awaiting_human) → 앱이 '지금 이 작업 하세요' 알림(딥링크) → 사람 해결 → AI가 폴링으로 완료 감지→재개(human_done→in_progress). 높은 핸드오프 비율 = 실패가 아니라 자기 한계를 아는 견고함. (잔여 프롬프트 인젝션 11.2% → 비가역은 사람.)

## 작업원칙 #53 — 도구 적재적소 (각 프로그램 장점 최대 활용, 2026-06-06 대표 확정)

**규칙**: 단계별 최적 도구로 분담한다. Firefly=생성(면책 경로) / Photoshop=정밀 누끼·레이어 합성·빛 정합(Harmonize) / Adobe Express=브랜드 마감·Bulk Create 대량변형·리사이즈 / Sharp=네이버 규격화(서버 자동) / Claude Design=시안·관제탑. 이미지 생성은 면책/크레딧 불문 최고 품질 모델(단 판매물 상업 사용권은 발행 전 확인 — 파트너 모델은 참조 외부 전송 주의, Firefly 네이티브가 명확).


## 작업원칙 #54 — 적용 현황 항상 명시 (application status visibility, 2026-06-08 대표 상시 요구)

**규칙**: 무엇이 실제 라이브인지 추정 금지(#45 실측우선). 모든 세션 보고에 "앱 적용 현황" 블록을 항상 포함하고, 상품별로 3구분 명시한다: **LIVE(production 실측) / DB-only(가역 반영) / 미적용(pending)**.
- **시스템화(채팅 의존 탈피)**: 관제탑/스튜디오에 상품별 "적용 현황 인디케이터"(필드 4종 = attributesApplied / mainImageApplied / detailApplied / publishState)를 내장해 앱에서 상시 가시화. 컬럼 부재 가드(#50), 전상품 동작, 텍스트 잘림 0, 레드 금지(75/15/10 — LIVE 초록/DB-only 뉴트럴/미적용 점선).
- **근거**: 과잉/누락 작업 방지(ROI). 권위: docs/decisions/2026-06-08-always-state-status-and-universal.md.

## 작업원칙 #55 — 전상품 범용 (product-agnostic, 2026-06-08 대표 상시 요구)

**규칙**: 신규 작업은 출시 전 범용화(상품 불문 동작) 선행. 명화 = 검증 케이스일 뿐 특수 경로 아님. 명화 전용 일회성 금지.
- **전상품 공통 대상**: 크롭 표준(주제 완전포함+프레이밍) · 아틀리에/스튜디오 UI · 발행 파이프라인 · 이미지 전략 · 라인 엔진 · 적용 현황 인디케이터.
- **이미 범용 확인**: T5 파이프라인 수렴 · THUMBNAIL_CROP_EDIT_STANDARD · 2026-06-07 crop-full-subject-containment · KKOTIUM_DESIGN_SYSTEM · 라인 엔진(quality_reasons.line). 권위: docs/decisions/2026-06-08-always-state-status-and-universal.md.


## 작업원칙 #56 — 개입 자연스러움 (smooth human-in-the-loop, 2026-06-08 대표 지시)

**규칙**: 대표 개입이 필요한 모든 지점은 앱이 자연스럽게 surface한다(숨김·추측 강요 금지). 권위: docs/design/OPERATOR_SYSTEM_BLUEPRINT.md §3·§4.
- **개입 대기열(Operator Action Queue)**: 전상품을 가로지르는 단일 surface. "지금 무엇이·어느 상품에·왜 필요한가"를 카드로 노출. 4분류 = AUTO(자동 진행·초록) / INPUT_DECISION(입력·결정·앰버) / GO_PENDING(비가역 발행 GO 대기·레드) / AUTH(외부 인증·일시정지). 데이터 원천 = control-tower-engine의 nextAction+applyStatus+게이트 파생(신규 컬럼 0).
- **순서 강제 0**: 기능은 상황에 따라 융통적으로 사용. #54(적용현황 상시=결과축)·#55(전상품 범용)와 한 쌍(개입 대기열=행동축).
- **자동/반자동 경계**: 비가역·인증·창작 판단은 대표; 그 외 의존성 없는 기술작업은 앱/Code가 완결 후 보고.
- **레드 스코프**: GO_PENDING(비가역 GO) + 1차 액션(메인 지정)만 레드. 보조 CTA(프롬프트 복사 등)는 뉴트럴(75/15/10).


## 작업원칙 #57 — 누끼 소스 = 실촬영 히어로컷 + 투-트랙 합성 (2026-06-09 대표 확정)

**규칙**: 상품 누끼·합성컷의 소스는 항상 공급사 실촬영 단품 히어로컷(상세페이지의 크고 선명한 실사진)에서 따다. 작은 변형 카드컷·텍스트 섞인 컷·저해상 썸네일 금지(평면·그래픽·잘림 원인). 명화 = 검증 케이스(전상품 적용 #55).
- **완전 포함**: 캡·병·라벨 잘림 0(완전포함 원칙·T6 가드). 합성 = 빛·그림자·재질 살아있는 입체감 유지(평면 금지).
- **투-트랙 추가이미지 전략**: (1) 정보형 = 흰배경/린넷 새배경 합성(라벨 또렷이, 추가이미지 상단 2~3번) / (2) 감성형 = Firefly 포토리얼 무드(차량·골든 홈, 전환 유도 히어로). 정보·감성 역할 분담 → SEO+전환 동시.
- **배경 톤 = 라벨과 호응**: 인상주의 자연·풍경 라벨 → 따뜻한 우드+린넷+은은한 식물그림자. 차갑거나 화려한 배경 금지(라벨 충돌).
- **도구**: 누끼=Adobe MCP image_remove_background(복구됨) / 새배경=앱 sharp 즉시 / 포토리얼 무드=Firefly 웹UI 브라우저(#52, 파일드롭·생성클릭=대표). compositing/gen-bg는 Adobe MCP 영구 미지원.
- **앱 적용**: C-7 apply-composite(extra_images 슬롯)·C-8 멀티슬롯 매니저에 본 표준 반영. 합성 소스 선택 UI에 '실촬영 히어로컷' 우선 표기. 권위: HANDOFF_myeonghwa_composite_recipe §4.


## 작업원칙 #58 — 제품 정체 우선 검증 (2026-06-11 학습, 명화 리드목업 사고)

**규칙**: 이미지 작업(누끼·합성·상세) 전 **공급사 실상세(detail-source)로 진짜 제품을 먼저 육안 확정**하고 MD에 제품정체 1줄 박제. Supabase/생성폴더의 기존 이미지를 제품으로 가정 금지(AI목업 혼입 함정 — 명화 리드목업 사고). 전상품 영구구조(#55). 권위 = docs/playbook/CUTOUT_HERO_STANDARD.md·HANDOFF_2026-06-10_PRODUCT-IDENTITY-RECOVERY.md.

## 작업원칙 #59 — 산출물 영구화 (2026-06-11 학습, 끊김 방지)

**규칙**: 누끼/합성/실소스 산출 즉시 ①프로젝트 `assets/generated/{pid}/cutout|composite/` ②Supabase `{pid}/cutout|composite/` **양쪽 적재**. Claude 환경/다운로드만으로 두면 유실(세션 끊김 원인). MCP는 Storage 업로드 불가 → Supabase 적재는 Code 1스텝. 전상품(#55).

## 작업원칙 #60 — 세션 진입 시 HEAD 대조 후 pull (2026-06-11 제안, EOD 드리프트 방지)

**규칙**: 새 세션 진입 시 **Vercel production HEAD vs 로컬 HEAD를 먼저 대조** — 다르면 편집 전 `git pull`. (EOD 핸드오프가 production보다 뒤처진 사례를 #45가 적발 → 본 원칙으로 사전 차단.) STEP 0 환경 점검(verify-vercel-deploy)과 정합.

## 작업원칙 #61 — 합성 표준: 상품진실 앵커 + 3-Plane 리얼리즘 + ≥2무드 (2026-06-11 대표 확정)

**규칙**: 본품 무드 합성은 상품의 **실측 비율·형태에 충실**하게(과대·왜곡·잘림 금지 = "상품진실 앵커"), 스튜디오 촬영처럼 **현실감 있게**(3-plane 후경/중경/전경·접지그림자·키라이트), **상품마다 ≥2 무드**(사용맥락 + 스튜디오 정물). 전상품 합성 표준(#55). 권위 = docs/design/ADAPTIVE_COMPOSITE_ENGINE.md.
- **상품현실시트**: 합성 전 상품별 실측 비율/용량/형태/소재/핵심셀링 시트 작성(과대 차단 앵커).
- **누끼 진실성**: 레퍼런스 누끼가 실제 본체 형태·비율과 일치(불일치 시 재누끼). 명화 #2(9T0) 폐기 = 형태오류(클립)·과대 → 본 원칙으로 차단.
- **생성=Firefly·결정적변환=코드**: 자연 합성은 Firefly Nano Banana Pro(3-plane), harmonize/normalize/접지는 sharp. Pillow 기계겹침 폐기. (#52·#53·#57 재확인)
- **앱 적용**: finish-image(C-3)·apply-composite(C-7)·개입카드(C-9)·스튜디오 마무리 카드(C-5)가 본 표준 소비.
- 번호 정합: #58(제품정체 우선)·#59(산출물 영구화)·#60(세션 HEAD 대조) 정식 등재 완료(갭 해소).

## 작업원칙 #62 — 교차뷰 리페치 브로드캐스트 (2026-06-12, SWR/plain-fetch 환경)

**규칙**: 한 뷰가 상품 이미지 상태(대표/추가/아카이브)를 바꾸면 같은 상품을 띄운 타 뷰(스튜디오 헤더·캔버스·상세)가 즉시 리페치해야 한다. 앱은 React Query 부재(SWR/plain-fetch) → 라이브러리 무관 window CustomEvent(`kkotium:product-mutated`) 브로드캐스트로 구현(src/lib/events/product-mutated.ts). 액션 측 broadcast → 구독 측 refetch. SSR 안전(window 가드).

## 작업원칙 #63 — 실사용 브라우저 테스트 통과 후 다음 작업·가짜보고 절대 금지 (2026-06-12 대표 확정)

**규칙**: 기능 "완료"는 실사용 브라우저 테스트 통과가 조건. Desktop이 preview 인증벽(Vercel Deployment Protection)으로 검증 불가 시 → (a) 병합 후 production에서 테스트 또는 (b) 대표 점검 요청. **절대 가짜보고 금지** — 미검증을 "검증완"으로, 미표시를 "표시"로 기록 금지. 발견된 미해결(예: /assets composite 미표시)은 그대로 노출. #44(stale fact 갱신)·#45(출력 fact-check) 강화.

## 작업원칙 #64 — 등록 시 공급사 권위원본에서 fidelity card 자동생성 (2026-06-12 대표 확정)

**규칙**: 모든 상품은 등록 시 공급사 권위 원본(실상세·#58)에서 충실도 카드(Product.fidelity)를 자동생성한다 — 향(scents)·부속(components)·마운트(mountType/mountMechanic)·금지데코(decorForbidden)·promptInject. 카드는 이미지 프롬프트 주입 + 발행 게이트(fidelity_check/mount_check)의 권위. 권위 PRODUCT_REGISTRATION_WORKFLOW.md·ADAPTIVE_COMPOSITE_ENGINE.md §11. 전상품(#55).

## 작업원칙 #65 — Firefly 수동 드롭은 임시·Firefly Bridge 수렴 (2026-06-12 방향)

**규칙**: 현행 Firefly 참조 슬롯 수동 드롭(#52)은 과도기. 목표 = Firefly Bridge가 reference/ 스테이지 자동로드 + 생성 자동구동, 운영자 개입은 "당선작 픽(최종 선별)"으로 수렴. 전자동화 전까지 수동 드롭 유지하되 reference/ 적재·STAGE_NAMING로 자동화 준비.

## 작업원칙 #66 — 스토리지 list 진단 5단 격리 (2026-06-12 학습, /assets composite=0 근본원인)

**규칙**: `/assets` 등 스토리지 표시 이상 시 추측으로 production env/키를 먼저 건드리지 않고 5단 격리한다 — (a) storage.objects 데이터 SQL 전컬럼 비교, (b) storage.search/search_v2/list_objects_with_delimiter를 service_role로 직접, (c) storage-api REST를 실제 키·body 변형으로, (d) 배포소스 GitHub raw diff, (e) 배포 클라이언트(storage-js) 정확버전 설치 후 collect() 복제. 각 계층을 무혐의/혐의로 분리한 뒤 단일 미통제 변수(런타임)를 계측(probe)으로 확정. #45(출력 fact-check)·#63(가짜보고 금지) 연속.

## 작업원칙 #67 — storage list trailing-slash 자가치유 (2026-06-12, 전상품 방어)

**규칙**: nested prefix `.list()`가 비-빈 폴더에 0행을 반환할 수 있음(클라이언트/키/런타임 조합 특이). no-slash 0행 → trailing-slash 1회 재시도 = 전상품 표준 방어(자산 무음 누락 0). 0행일 때만 동작하므로 정상결과 불변(automation-storage.ts listProductAssets.collect). 권위 HANDOFF_2026-06-12_composite-rootcause-probe. 라이브 검증완 2026-06-12(세션6-c) — composite 0→9 3-tier(/assets x-vercel-cache MISS·SQL storage.objects 1:1·/studio 에셋탭 9썸네일 naturalWidth>0). 근본원인=no-slash list버그 확정·자가치유 영구복구.

## 작업원칙 #68 — production env 정합 게이트 (2026-06-12)

**규칙**: 로컬 .env와 Vercel env의 키 drift가 "코드·DB는 정상인데 production만 이상"의 원인이 될 수 있음. 신형 sb_secret_ 키 마이그레이션 시 Vercel env 동기화 필수. 진단 시 probe로 env.keyPrefix/keyLen을 노출해 drift를 직접 판정(추측 금지).

## 작업원칙 #69 — 인계 in-chat 박제 · 누락0 연속성 (2026-06-12 대표 확정)

**규칙**: 모든 작업 종료 시 인계 메시지를 채팅 응답 본문에 누락 없이 정리한다(파일에만 두지 않음). 포함: Target Session·Branch·다음 1액션·검증절차·코드패치 위치·세션요약. 운영자=paste-mediator → 채팅에서 바로 복사·착수 가능해야 함. CLAUDE.md 작업원칙 섹션 + PRINCIPLES_LEARNED 양쪽 박제.

## 작업원칙 #71 — 진짜 예술은 진짜로 (Authenticity Realism Lane) (2026-06-13 세션7-g, 전상품)

**규칙**: 모든 자산 슬롯은 사실성 레인으로 태깅한다. **AUTHENTIC-ART**(제품 라벨·브랜드 스토리 S5) = 퍼블릭도메인 실제 작품만(실제 명화 reproduction·진짜 모네). **PHOTOREAL**(히어로·라이프스타일·향 씬·합성·썸네일·추가이미지) = 실사 카메라 촬영 품질, AI 유화/회화/페인터리 마감 전면 금지. 명화 컨셉은 라벨(실제)+S5 스토리(실제 모네)가 짊어지고, 향 씬·히어로·합성을 AI 유화로 칠하면 컨셉이 사는 게 아니라 AI 이질감만 생겨 신뢰가 깎인다. 비명화 상품은 AUTHENTIC-ART 레인이 비어도 PHOTOREAL 룰(회화 마감 금지)을 보편 적용(#55). 앱 개입점 = 사실성 레인 가드(asset 슬롯 realism_lane('authentic_art'|'photoreal') 파생 + PHOTOREAL 슬롯 회화마감 경고, 기존 fidelity_check/main_image_white_bg 가드 동형·강제모달 0 #56). 전거 docs/playbook/SCENT_MOOD_4SCENE_GRADE_2026-06-13.md §0·§7, docs/design/SCENT_MOOD_BACKGROUND_SYSTEM.md, 스펙 docs/design/REALISM_LANE_GUARD_SPEC_2026-06-13.md.

## 작업원칙 #74 — Firefly programmatic 프롬프트 주입 유지 가능 (SUPERSEDE, 2026-06-13 실측)

**규칙**: Firefly programmatic 프롬프트 주입은 shadow-walk 노드 포착 + native 프로토타입 setter+InputEvent면 유지됨(stuck 실측). 구#74의 '폐기'는 단순 el.value= 방식 한정. blob 결과는 fetch->arrayBuffer로 추출 가능(image/png 검증). 구체: Firefly SPA는 353 Shadow DOM 호스트로 캡슐화되어 top-level querySelector는 0이지만 shadow root 재귀 관통으로 textarea·생성·다운로드 버튼·결과 이미지(4컷 1376x768) 전부 포착. native setter+InputEvent 주입은 React/Spectrum 내부 상태에 반영되어 값 유지(stuck:true). 결과 blob은 fetch->arrayBuffer->base64로 바이트 추출(2.45MB·시그니처 89504e47 유효). 적재 catch-basin = POST /api/products/[id]/ingest-firefly(base64->uploadAutomationAsset->{pid}/{stage}/ + asset_registry 인테이크, 비가역 0·네이버 무접촉, 전상품). 개입카드 firefly_drop->firefly_auto 확장(탭 열림 감지 시 '자동 생성 가능' 표시·강제모달 0 #56). 생성 트리거·폴링은 Desktop 1컷 실측서 확정(크레딧 소비). 근거 docs/playbook/FIREFLY_AUTOMATION_PLAYBOOK_2026-06-13.md. 보완 #75(Scene-first 3-Layer 합성 표준).

## 작업원칙 #77 (정정판) — Firefly 모드 가드: view=edit 워크스페이스는 안전, ACTIVE 마스크/선택영역/참조잠금만 ABORT (2026-06-13 정정, 전상품)

**규칙(정정)**: `view=edit` 편집 워크스페이스 자체는 위험이 아니다. 마스크가 없고 전체 캔버스가 생성 타겟이면 `생성` 클릭은 새 풀생성으로 작동(허용). 진짜 위험 = **ACTIVE MASK / 선택영역 / 참조 잠금(부분 인페인)** 활성일 때만. 따라서 가드는 `edit-locked-ABORT`(maskActive || refLoaded>0)만 중단하고, `generate`·`generate-in-edit-OK`(편집 워크스페이스 진입했으나 마스크 없음=풀생성 안전)는 진행한다. ※ 1차판(세션7-c, '편집도구 버튼 존재=편집모드') 오탐 정정 — 편집도구 버튼(새로 편집·마크업·디테일 조절·업스케일)·대형 단일 표시이미지는 편집 워크스페이스 신호일 뿐 ABORT 사유 아님(상시노출 오탐). 실측 근거: 5컷 배치 maskActive=false + perceptual hash minHamming 19/64(전부 distinct)=정상 풀생성, 시각 확인도 5컷 전부 프롬프트 일치 별개 씬. 통합 규칙: 단건·5컷 루프 매 iteration `kkSetPrompt` 직전 `kkAssertGenerateMode()` 호출 → `edit-locked-ABORT`(마스크/선택영역/참조잠금)만 중단+개입알림, `generate`·`generate-in-edit-OK`는 진행. 사후 perceptual hash(minHamming<10=오염) 보강 유지. 앱 연동(기박제, 중복 금지): firefly_auto 개입카드 payload.generateModeConfirmed 게이트(미확인=검증대기·강제모달 0 #56·전상품 #55). 전거 docs/playbook/FIREFLY_GROUNDING_AND_QUALITY_UPGRADE_2026-06-13.md §1.2~1.4 (PLAYBOOK §8.3 supersede).

**검증판 kkAssertGenerateMode (§1.3 그대로 인용)**:
```js
function kkAssertGenerateMode(){
  const seen=new Set();
  let genBtn=false, newEditBtn=false, markupTools=0, refLoaded=0, maskActive=false, dom=null;
  (function w(root,d){ if(!root||d>14)return; let ns; try{ns=root.querySelectorAll('*');}catch(e){return;}
    ns.forEach(el=>{ if(seen.has(el))return; seen.add(el);
      const tag=el.tagName?el.tagName.toLowerCase():'';
      const lab=((el.innerText||'')+' '+((el.getAttribute&&el.getAttribute('aria-label'))||'')).trim();
      const cls=(typeof el.className==='string'?el.className:'')||'';
      if((tag==='button'||(el.getAttribute&&el.getAttribute('role')==='button'))&&(el.offsetWidth||el.offsetHeight)){
        if(/생성|generate/i.test(lab)) genBtn=true;                          // FIX: no ^$ anchor
        if(/새로 편집|new edit/i.test(lab)) newEditBtn=true;
        if(/마크업|markup|디테일 조절|detail adjust|업스케일|upscale/i.test(lab)) markupTools++;
      }
      if(tag==='img'&&el.naturalWidth>200&&(el.offsetWidth||el.offsetHeight)){
        const r=el.getBoundingClientRect();
        if(!dom||r.width*r.height>dom.dw*dom.dh) dom={dw:Math.round(r.width),dh:Math.round(r.height)};
        if(/reference|참조|composition|구도|base/i.test(cls+lab)) refLoaded++;
      }
      if(/mask|마스크|선택 영역|brush|브러시|selection/i.test(cls+lab)&&(el.offsetWidth||el.offsetHeight)) maskActive=true;
      if(el.shadowRoot) w(el.shadowRoot,d+1);
    });
  })(document,0);
  const dominantOpen = !!(dom && dom.dw>=500);
  // SAFE to generate even in edit workspace IF no mask/region/reference lock:
  const partialEditLock = maskActive || refLoaded>0;
  const editSession = newEditBtn || (dominantOpen && markupTools>=2);
  const mode = partialEditLock ? 'edit-locked-ABORT'
             : genBtn ? (editSession ? 'generate-in-edit-OK' : 'generate')
             : 'ambiguous';
  return { mode, genBtn, newEditBtn, markupTools, dominantOpen, refLoaded, maskActive };
}
```
- 실측 검증: 라이브 편집상태에서 newEditBtn=true·markupTools=3·dominantOpen=true·maskActive=false → generate-in-edit-OK(풀생성 안전). 마스크 활성 시 edit-locked-ABORT.

## 작업원칙 #72 — 자동재시도 타이머 절대 금지 (2026-06-14 세션7-h 학습)

- setTimeout/setInterval로 생성을 자동발사하지 않는다. 크레딧 소모 + 레이트리밋 쿨다운 무한 리셋 = Firefly 차단의 실제 원인.
- 생성은 항상 단발 수동 트리거. 레이트리밋("사용 문제/나중에 다시 시도")은 요청 0 + 실제 시간 경과만이 해제(두드리면 쿨다운 리셋되어 악화). 크레딧 정상이어도 발생(횟수 기반 단기 throttle).
- 전거: docs/playbook/ADAPTIVE_IMAGE_ENGINE_AND_FOLDER_SYSTEM_2026-06-14.md §6.

## 작업원칙 (이미지 엔진 보강 3종) — 2026-06-14 세션7-h

- **(a) 편집모드 비율컨트롤 부재 → 파이프라인 정규화로 해결**: Gemini/Nano Banana 편집모드엔 종횡비 UI가 없다(DOM 실측 ratioControls=[]). 생성단계 통제는 약함 → Sharp 슬롯비율 정규화(conformToSlotRatio, 향씬 4:5·대표 1:1)가 본질적 2층 방어. 적재/사용 전 강제, 적재 경로 둘 다(/assets/upload·/ingest-firefly) 보강. 2% 허용오차 게이트(순응 자산은 무재인코딩 통과).
- **(b) 레거시 백필 = 시스템 개선(단건 버그 수습 아님)**: 발견 오류는 단건 수습이 아니라 전상품 확장. 평면 레거시 자산은 kindForSource로 분류 후 {pid}/{kind}/ 이동(COPY→DB갱신→검증→retire). move-then-update 절대 금지(라이브 URL 중간 404 방지)·멱등(서브폴더 소속 스킵)·이중게이트(--go --confirm).
- **(c) 비상품 네임스페이스 제외**: common/·lifestyle/ = 안정 URL·비상품 → 백필·재분류 영구 제외. 스코프 게이트 = Product 테이블 멤버십.

## 작업원칙 #73 — UI 작업 기본전제 3종 (2026-06-14 세션7-i 학습)

모든 UI 작업의 기본 전제. 위반 = 재작업.

- **(a) 직관 우선·과밀 금지**: 화면은 한눈에 이해되어야 한다. 탭/카드/컨트롤 과밀 금지 — 정보는 작업 단계로 묶고 한 화면의 결정 수를 줄인다. 추론 결과는 확신도·품질경고로 투명하게(블랙박스 금지).
- **(b) 한글 우선 라벨**: UI 표면 문구는 한글 우선. 음차(스테이지·플레이트·레퍼런스·레거시 등) 금지 — 자연스러운 한국어로(단계·배경판·참고 이미지·이전 방식). 코드 내부=영어 식별자 유지(§3-1), 표면=한글. 유지 가능 외래어=정착 용어(누끼·합성·SEO·AI·ZIP·Firefly). ko.json 음차 sweep 의무.
- **(c) 작업 여정 정합**: 정보구조(IA)는 사용자의 실제 작업 여정 순서를 따른다. 워크벤치 = 상품 분석 → 이미지 → 발행. 기능 나열이 아니라 여정 단계로 그룹핑. 기존 동작 폴백 유지(회귀0).

## 작업원칙 #78 — 콘텐츠 신호는 채널 존재가 아닌 실제 상태로 판정 (2026-06-14 세션7-i 검증 BUG)

메타데이터 플래그의 '존재'를 의미로 단정하지 않는다 — 실제 픽셀 '상태'로 확증한다.

- **알파 채널 존재 ≠ 투명**: canvas/Firefly/디자인툴 PNG는 불투명이어도 RGBA(4채널). `hasAlpha`를 cutout(누끼) 신호로 쓰면 전 PNG 오분류. 실제 투명 = `hasAlpha && sharp(buf).stats().isOpaque === false`(투명 픽셀 존재). 불투명 RGBA → 신호 무시·비율 폴백.
- **사각지대 교훈**: 스모크가 '알파有·불투명 PNG' 케이스를 누락(PNG=JPEG 동일 치수 대조로 적발). 신호 교정 시 실이미지(sharp 생성)로 PNG/JPEG 양쪽 재검증 의무. #73(직관우선) 검증완료 — 투명 사유 칩 표시로 분류 근거 투명화. #45(출력 fact-check)·#63(가짜보고 금지) 연속.

## 작업원칙 #79 — DB ref 일괄 치환/감사는 하드코딩 컬럼리스트 금지 (2026-06-15 백필 dangling 적발)

스토리지 URL/키를 DB에서 일괄 치환하거나 dangling을 감사할 때, **하드코딩한 컬럼 목록을 쓰지 않는다** — jsonb·중첩 필드를 반드시 누락한다(사례: quality_reasons).

- **EXHAUSTIVE 판정**: 전체 row를 fetch해 모든 컬럼의 JSON 표현(또는 `to_jsonb(row)::text`)을 전수스캔. 변경된 컬럼만 write-back. 자가검증(잔존 ref=0)도 동일한 전수스캔으로. 대상은 Product 전컬럼 + 연관 테이블(asset_references·published_assets·asset_registry) 전부.
- **치환 안전규칙(dangling-only)**: depth-2 원본이 storage서 사라졌고 정규 키가 존재할 때만 치환(정규 미존재=orphan은 날조 금지·보고). 캡처 후 교정·dry-by-default·멱등. #45(출력 fact-check)·#46(비가역) 연속. 'dangling 0' 같은 단정은 전수스캔으로 입증된 뒤에만.

## 작업원칙 #80 — force-dynamic ≠ Data Cache 무효화; server SDK fetch는 no-store 주입 (2026-06-15 /assets STALE)

라우트 `dynamic='force-dynamic'`는 렌더를 동적화할 뿐, 서버 SDK(supabase-js 등) 내부 `fetch`가 Next Data Cache에 잔류하는 것을 막지 못한다(배포로도 미소거 — Data Cache는 deploy 비종속).

- **근본 차단**: out-of-band로 바뀌는 자원(스토리지 리스팅 등)을 읽는 운영자용 SDK 클라이언트에는 `global.fetch`로 `cache:'no-store'`를 주입한다. 라우트엔 `fetchCache='force-no-store'`+`revalidate=0`을 방어층으로. 'force-dynamic 걸었으니 라이브'라는 가정 금지 — 실앱서 stale 입증되면 SDK fetch 층을 의심(#45 출력 fact-check·#28 production source-of-truth 연속).

## 작업원칙 #81 — 드리프트는 상시감지·개입점화한다 (2026-06-15 #80 후속 시스템 가드)

무결성 격차가 '사람이 화면을 봐야' 드러나면 이미 늦다(stale-listing 사고 #80). 라이브 소스 기준 자동 점검 → 이상 시 개입점으로 자연 노출한다.

- **패턴**: (1) 라이브 소스(no-store 리스팅)로 상품별 무결성 점검 → (2) 이상 시 control-tower 개입 대기열 카드 시드(멱등·best-effort·강제모달0 #56), 정합 OK면 카드 클리어 → (3) 1클릭 교정(비가역은 confirm 게이트 #46·원본 archive 백업) → (4) cron 상시 스윕으로 out-of-band 변동까지 포착. 점검은 read-only/다운로드0 우선(외부 image API 0·#37). #80(stale 근본수정)의 시스템 확장.

## 작업원칙 #82 — 최대 직접 자동화 (Maximize Direct Automation) (2026-06-16 세션8)

진정으로 불가능하지 않은 한 Claude가 직접 실행한다 — 설정 포함. 운영자 핸드오프는 정말 불가능할 때만.

- **직접 실행 우선**: 비율/해상도/토글/클릭 등 설정 표면도 실제 클릭 커넥터로 직접 처리. 운영자에게 토스 = 진짜 불가능 입증 후 최후수단. 완료 후 사후보고(허락 요청 0).
- **날조 금지**: 직접 못 하면 거짓/추정 라벨 금지 — 솔직히 "불가능, 운영자 클릭 필요"라고 물어본다(#46 가짜라벨 금지 연속). 폴링(상태 확인)은 OK, 재생성 자동 재시도는 금지(#72 크레딧 보호).

## 작업원칙 #83 — 편집모드 참조 오염은 매 컷 클리어로 차단 (2026-06-16 세션8 근본원인)

Firefly 편집모드는 생성물이 자동으로 참조(0/N→1/N)에 붙어 다음 생성을 오염시킨다 — "April·Cotton이 비슷"했던 근본원인.

- **가드 `referenceCleared`**: 매 컷 생성 직전 참조 0/N 확인. 직전 생성물이 참조로 잔류하면 '새 이미지(+)' 버튼으로 클리어 후 생성. 첫 생성은 자연히 0/N.
- **전상품 시스템**: 4컷 이상 연속 생성하는 모든 상품에 적용. firefly_auto 카드 subcheck로 노출(#56 자연 개입). 상세: `docs/design/MOOD_CAMERA_SPEC_SYSTEM.md` §7.

## 작업원칙 #84 — 단일 디폴트 카메라 영구 금지; 무드 6축 시스템 (2026-06-16 세션8 근본원인+리서치)

v5 템플릿이 4향 전부에 Sony 1종을 하드코딩 → "전부 소니" 근본원인. 상품 무한·무드 유한(6축)으로 분류, 무드별 카메라 다르게·그레이드는 통일.

- **가드 `cameraVarietyApplied`**: 배치 내 카메라 스펙이 무드별로 달라야 통과(단일 디폴트면 RED). 무드=전환 기능 기준 6축(M1 신뢰/M2 욕망/M3 명료/M4 코지/M5 발랄/M6 프리미엄), 각 축에 카메라/렌즈/조명/벤치마크DNA 매핑.
- **전상품 시스템**: 처음 보는 상품도 무드 채점→스펙 조회→조립→생성(상품별 코딩 0). 권위 문서 `docs/design/MOOD_CAMERA_SPEC_SYSTEM.md`, 근거 `docs/research/MOOD_TO_CAMERA_SPEC_RESEARCH_2026-06-16.md`.

## 작업원칙 #85 — 트러스티드 클릭 vs 합성 이벤트 구분 (2026-06-16 세션8 확증)

Spectrum 컴포넌트별로 합성 JS 이벤트 수용 여부가 다르다. 잘못 가정하면 클릭이 무시된다.

- **수용/거부 맵**: `SP-BUTTON`(생성)=합성 클릭 존중(JS 생성 가능). `SP-ACTION-BUTTON`(새 이미지)·`sp-picker`(비율)·`sp-switch`(grounding)=합성 무시, 실제 트러스티드 클릭만 인정 → Claude-in-Chrome `find`→ref → `computer` ref 클릭.
- **좌표 금지**: 스크린샷은 가변 윈도우서 스케일 캡처(0.457 비균일) → DOM좌표≠스크린샷좌표. JS getBoundingClientRect 또는 ref 클릭만. 셀렉터 카탈로그: `docs/playbook/FIREFLY_AUTOMATION_PLAYBOOK_2026-06-13.md`.

## 작업원칙 #86 — 제외는 긍정형 표현; Gemini 네거티브 필드 전송 금지 (2026-06-16 세션8 리서치)

Nano Banana/Gemini는 네거티브 프롬프트 필드가 없다(HTTP 400) — "제외가 안 먹혔던" 근본원인.

- **긍정형 작성**: "no cars"가 아니라 "empty street". 제외 = `clean composition containing only the product..., realistic photograph only` + 선언형 `no on-image text, no logos, no human figures, no illustration`. 가드 `exclusionsPresent`.
- **모델별**: Gemini류엔 `negativePrompt` 필드 절대 전송 금지. 디퓨전/Flux 폴백에서만 네거티브 필드 사용. 전상품 프롬프트 조립기 고정 규칙.

## 작업원칙 #87~#89 — 작업 관제탑 체계 (2026-06-16 세션8)

### #87 단일 관제탑 (Single Control Tower)
모든 병행 트랙은 PARALLEL_WORK_TRACKER 상단 라이브 보드 한 곳에만 산다. 보드에 없으면 존재하지 않는 작업(누락 방지). 세션 시작 = 보드 필독 → 지금 큐 top 실행. 세션 종료 = 보드 갱신(상태·다음 1액션) + 변경로그 1줄 + 핸드오프. 우선순위/스케줄 변경은 변경로그에 기록. 파생 큐(지금/결정대기/검증대기)는 보드에서 자동 도출.

### #88 완료=검증 (Done Means Verified)
코드/기능 작업은 실제 브라우저/실측 검증을 통과하기 전 "검증 대기" 상태로 둔다. 검증 없이 "완료" 라벨 금지, 검증 없이 다음 본작업 진행 금지. Code 보고만으로 완료 처리 금지(#45 결합). 실측 불가 시 거짓 보고 대신 대표에게 요청.

### #89 변경 흡수 (Change Absorption)
세션 도중 추가 요청·개선·변경은 즉시 관제탑 보드에 등재 + 우선순위 재산정 후 진행한다. 흐름 보존이 목적 — 대표가 같은 사항을 재언급하지 않아도 누락 없이 이어지게.

## 작업원칙 #90 — 폴백 기본값은 카테고리 중립 + 신호 오발화 가드 (2026-06-17 세션8 #62 배치)
미시드 카테고리의 안전 폴백(emptyCard)은 절대 특정 카테고리 편향을 담지 않는다. 향수 baseline(scent_note/use_install/size_duration)이 기본 슬롯열에 박혀 있어 비향수 전 카테고리(아이스트레이 등)가 향 슬롯을 오상속한 사고 재발 방지. 폴백 = 구조 슬롯만(hero·problem·solution_usp·trust·gift·cta), 카테고리 전용 슬롯은 실 DNA 시드로만 추가. 미시드는 control-tower 'category_dna_unseeded' 개입카드(INPUT_DECISION·idle priority·강제모달0·#56)로 가시화하되, 실작업을 마스킹하지 않게 idle(다음액션 없음)에서만 점화. 신호 휴리스틱(deriveProductSignals)도 오발화 가드: '리필'이 본품동반(bundleAnchor) 또는 giftBiased면 lowInvolvement 미발화 — 본품+리필 번들/선물은 충동소모품이 아니므로 펀들 단축(problem/size_duration 드롭) 금지. 단, 순수 소모품(commodityHard)은 가드 예외(여전히 단축). 매칭 키워드는 JSON(product-signal-keywords.json), 코드 한글 리터럴 0.

## 작업원칙 #91 — Vercel 서버리스 본문 한계 < full-res base64; 적재 기본 = web-JPEG (2026-06-17 IMG-INGEST 실측)
Vercel 서버리스 함수 본문 한계(~4.5MB) < full-res Firefly base64(~7MB) → ingest-firefly의 15MB 가드는 도달 불가(그 전에 HTTP 413). 상세페이지 용도는 web-JPEG(1456px·~330KB)로 충분 — full-res 2K 마스터가 꼭 필요할 때만 Supabase signed-URL 직업로드(서버 본문 우회) 검토. 즉 적재 기본 포맷 = web-JPEG, 2K 마스터 = 예외적 signed-URL. 전상품 #55. 실측: April(composite/fresh-1781657005726.jpg)·Black Cherry(composite/dark_luxury-1781657008705.jpg) web-JPEG 1456×1807 ingest 성공·registered·publicUrl 200.

