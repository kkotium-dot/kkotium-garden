# KKOTIUM GARDEN — 프로젝트 진행 현황

> **최종 업데이트**: 2026-05-08 (본 세션: Sprint 6-D 1-5단계 완료 + MD 인계 무결성 회복 + 작업원칙 #29 (e++) 신규 강화 + archive 인덱스 정비)
> **TSC**: 0 errors | **빌드**: Compiled successfully (26/26 prerender) | **배포**: https://kkotium-garden.vercel.app (29e80fc READY)
> **HEAD**: 29e80fc = origin/main 일치 / **Working tree**: clean / **Stash**: stash@{0} z3c-misdirected-changes-needs-redo (보존)
> **상품 상태**: 0개 (DRAFT 모두 삭제 완료, 본격 소싱 직전 깨끗한 상태) / **꿀통 꽃수레**: 4개 보존 / **Platform**: DMM 도매매 + OWC 오너클랜 2개
> **단계 진행도**: Phase A·B·C·D ✅ | Phase E (E-7/E-1/E-3/E-8) ✅ | Phase E+ Sprint 1~5 ✅ | 워크플로우 재설계 Sprint A1a~A3-4a ✅ | Z-1·Z-2·Z-3a·Z-3b·Z-3d ✅ | 6-Pre 1·2·3 ✅ | 6.5 SourceAdapter PoC ✅ | **6-D 1-5단계 (4모드 foundation) ✅**
> **Private API 발급 완료**: 28개 전체 권한 발급 ✅ (구매용 6 + 판매용 13 + 공통 3 + 기타 6) — Sprint 8 자동발주는 매출 상승 + 운영 흐름에 따라 진입 (보류 트랙)
> **다음 작업 (계획서 원본 순서)**: 세션 2 = 6-A 재고 폴링 축소 (앱 등록 상품만, 첫 실제 상품 등록 검증 전제) → 세션 3 = 6-B + 6-C (가격 변동 + 다른 셀러 추적 + 공급사 누적 평가) → 세션 4 = 6-E + 6-D 위젯 통합 (카테고리 매핑 + 꼬띠 4모드 정원 일지 발송) → Sprint 7 = AI Studio 4모듈 → Sprint 8 = 매출 상승 후 Private 자동발주 활용 (보류)
> **참고 문서**: `docs/research/OVERSEAS_SOURCING_BASELINE_2026_05.md`, `docs/research/DOMEGGOOK_API_INTEGRATION_STRATEGY_2026_05.md`, `docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md`, `docs/plan/archive/PROGRESS_2026Q2_MAY.md`

---

## 핵심 인덱스

- [작업원칙 #26](#작업원칙-26) — IA 점검 의무화 + 고아 라우트 처리
- [작업원칙 #29](#작업원칙-29) — 한글 처리 절대 규칙 5가지
- [작업원칙 #29 (e++)](#작업원칙-29-e--사용자-닉네임-절대-규칙-2026-05-08-강화) — 사용자 닉네임 절대 규칙 (본 세션 신규)
- [작업원칙 #31](#작업원칙-31) — MD 의미 단위 자동 분할 + 인계 무결성
- [작업원칙 #32](#작업원칙-32) — TSC ≠ Production 빌드 검증 (본 세션 신규)
- [작업원칙 #33](#작업원칙-33) — useSearchParams Suspense 자동 점검 (본 세션 신규)
- [작업원칙 #34](#작업원칙-34) — 명백한 오류 파일 발견 시 사용자 알림 의무
- [작업원칙 #35](#작업원칙-35) — 한글 사전 분리 패턴 (2026-05-08 본 세션 신규)
- [Sprint 6/7/8 계획](#sprint-678-계획-2026-05-08-신규) — 리서치 갭 분석 기반 신규 계획
- [현재 앱 상태](#현재-앱-상태)
- [환경/메뉴/파이프라인](#환경--메뉴--파이프라인)
- [핵심 파일 경로](#핵심-파일-경로)
- [절대 작업 원칙 (코드/UI/세션/보고)](#절대-작업-원칙)

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

## Sprint 6 재구성 (2026-05-07) — Open API ROI Top 5 우선 + Private API 신청 진행

본 세션(2026-05-07) 도매꾹 Private API 리서치 결과로 Sprint 6 우선순위 *완전 재구성*. 직전 인계의 P0-A → P0-B → P0-C → P0-D → S-2 순서를 폐기하고, **Open API ROI Top 5 묶음**으로 변경. 옛 Sprint 6 계획(아래 "Sprint 6/7/8 계획 (2026-05-08 신규)" 섹션)은 *deprecated*, 본 섹션이 우선.

### 우선순위 결정 근거
- 새싹 단계 ROI Top 5 = 모두 Open API만으로 충분 (Private 발급 대기 시간 0)
- 5월 14일 변경 영향 0 (실사용 mode 유지)
- Private API 신청 완료 (전체 28개 + 샘플 D 연동목적)

### Sprint 6 신규 작업 (Open API ROI Top 5)

| # | 작업 | 신규 파일 | 매출 임팩트 |
|---|---|---|---|
| 6-A | 재고 실시간 폴링 | `src/lib/dome-inventory-poller.ts` + `src/app/api/cron/inventory-sync/route.ts` | 직접 (품절 손실 방지) |
| 6-B | 가격 변동 감지 | `src/lib/dome-price-tracker.ts` + PriceHistory 모델 | 직접 (마진 보호) |
| 6-C | 공급사 휴가/응답률 모니터 | `src/lib/dome-seller-monitor.ts` + SellerStatus 캐시 | 직접 (클레임 방지) |
| 6-D | 꼬띠 AI 추천 v1 (Open 기반) | `src/lib/dome-curator.ts` + 정원 일지 위젯 | 운영효율 (소싱시간↓) |
| 6-E | 카테고리 트리 풀 캐시 | `src/lib/dome-category-cache.ts` + DomeCategory + CategoryMapping | 운영효율 (등록시간↓) |

### Private API 신청 (병행 진행)
- 신청 일시: 2026-05-07 본 세션
- 권한 범위: 전체 28개 (구매용 6 + 판매용 13 + 공통 3 + 기타 6)
- 연동 유형: ③ 자사몰/오픈마켓 직접 연동
- 연동 목적: 샘플 D (광범위 권한용, 145자)
- 통과 예측: 도매꾹 1년+ 사업자 회원 + 기존 키 정상 + 정합성
- 결과 대기: 1~3일 영업일

### Sprint 8 (파워셀러 대비 — Private 발급 후)
- 자동 발주 (`setOrder` + `getOrderList` + `getOrderView`)
- 송장 자동 회수
- 재고 일괄 확인 (`getAllSupplyChk` 전환 — Open 폴링 → Private 일괄)
- 반품 자동화 (`getOrderReturn`)

### 참고 문서
- 전략 보고서: `docs/research/DOMEGGOOK_API_INTEGRATION_STRATEGY_2026_05.md` (266줄)
- 본 세션 상세: `docs/plan/SESSION_LOG.md` 2026-05-07 entry

---

## Sprint 6/7/8 계획 (2026-05-08 신규)

본 계획은 `docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md` 리서치(15개 핵심 발견사항) + 현재 앱 코드 grep 갭 분석으로 도출. 각 항목은 *리서치의 1·2·3순위* + *새싹셀러 ROI*로 우선순위 결정.

### 갭 분석 요약 (20개 항목 매핑)

| # | 리서치 항목 | 현재 앱 | 갭 |
|---|---|---|---|
| 1 | 등급 체계 매출+굿서비스 이중 | ✅ GoodServiceWidget | 800만원 상향 반영 확인 |
| 2 | 적합도/인기도/신뢰도 3축 | ✅ honey-score.ts | 인기도(찜·클릭) 추적 부재 |
| 3 | 단건 vs CSV 일괄 | ✅ 메인 흐름 단건 | /products/upload 잔재 |
| 4 | 상품명 25-50자 | ✅ 25-35자 hint + 점수화 | 금기어 검증 미강화 |
| 5 | 황금 키워드 7-10개 | ✅ 검색 조련사 5단계 | 검색량/경쟁률 자동 산정 보강 |
| 6 | 카테고리 1페이지 분석 | ⚠️ category/suggest 있음 | **1페이지 일치율 검증 룰 부재** |
| 7 | 태그 사전 등재 검증 | ❌ | **신규** |
| 8 | 다크패턴 정가 부풀리기 경고 | ❌ | **신규** |
| 9 | AI 카테고리 추천 정확도 | ✅ category/suggest | 사람 검수 단계 명시 부재 |
| 10 | 등록 7일 골든 윈도우 | ❌ | **신규 ★** |
| 11 | 도매꾹 v4.5 옵션 해시+텍스트 | ❌ | **신규 ★** |
| 12 | 도매꾹 vacation/channel 검증 | ❌ | **신규 ★** |
| 13 | Naver Commerce API 등록 | ✅ register/route | 본격 활용 미실행 |
| 14 | AiTEMS 자연어 키워드 | ⚠️ trend-analyzer 있음 | 등록 시 자연어 제안 없음 |
| 15 | D+30 한달사용 알림톡 | ✅ month-review-pending | 50건+ 후 활성화 |
| 16 | D+3~5 구매확정 알림톡 | ✅ confirmation-pending | 동일 |
| 17 | 반품안심케어 매출 +13.6% | ✅ return-care-fees + honey 가산 | 완료 |
| 18 | 효자 상품 식별 (멱법칙) | ❌ | **신규 ★** |
| 19 | 상품명 금기어 페널티 | ⚠️ 부분 | 명시적 알림 부재 |
| 20 | 광고 ROAS 추적 | ⚠️ 시뮬레이터만 | 실제 추적 부재 |

### Sprint 6 — P0 (즉시 ROI, 매출 직접 영향)

**기간 목표**: 2-3 채팅 세션 안에 P0-A·B·C 모두 완료.

**P0-A. 도매꾹 OpenAPI v4.5 옵션 정확도 강화** (리서치 11번)
- `selectOpt` 해시값 + 옵션 텍스트 동시 비교 → 변경 감지 시 알림
- `seller.vacation` 휴가 기간 검증 → 휴가 중 공급사 상품 등록 차단
- `channel` (도매꾹/도매매) 검증 → 마진 오차 차단
- 위치: `src/lib/crawler/auto-mapper.ts`, `src/app/crawl/page.tsx`, `src/lib/option-integrity.ts` (신규)
- 검증: 실제 도매꾹 상품 5건으로 옵션 변경/휴가/채널 케이스 테스트

**P0-B. 등록 7일 골든 윈도우 트래킹 위젯** (리서치 10번)
- DB: `Product.registeredAt` 활용. D+1, D+3, D+7 시점에 클릭/판매 상태 체크
- 미달 상품 → 정원 일지 위젯에 알림
- "상품명 토큰 1개 교체 권장" 자동 제안 (가장 약한 키워드)
- 위치: `src/lib/golden-window-tracker.ts` (신규), `src/components/dashboard/GoldenWindowWidget.tsx` (신규)
- 검증: 임의 등록일 5건 mock 주입 → D+1/3/7 분기별 위젯 렌더링 확인

**P0-C. 효자 상품 자동 식별 (멱법칙 시각화)** (리서치 10번)
- 매출 상위 20% 상품 자동 식별 → 정원 일지 위젯
- "이 상품에 광고 80% 집중하세요" 가이드
- 위치: `src/lib/pareto-analyzer.ts` (신규), `src/components/dashboard/ParetoTopWidget.tsx` (신규)
- 검증: orders 데이터 mock 50건 → Top 20% 분류 + 위젯 렌더링

### Sprint 7 — P1 (SEO 정확도 강화, 노출 직접 영향)

**P1-A. 카테고리 1페이지 일치율 검증** (리서치 6번)
- 메인 키워드로 네이버 쇼핑 검색 → 1페이지 상품 카테고리 분포 → 80% 일치 카테고리만 추천
- 위치: `src/lib/category-page-validator.ts` (신규), `src/app/api/category/suggest/route.ts` 강화

**P1-B. 상품명 금기어 페널티 강화** (리서치 4번)
- 이벤트/할인/배송/적립/쿠폰 키워드 + 중복 단어 3회+ + 허용 외 특수문자 → 명시적 빨간 알림
- 위치: `src/lib/honey-score.ts` 강화, 씨앗심기 UI 추가

**P1-C. 태그 사전 등재 검증** (리서치 7번)
- 입력된 태그가 네이버 태그사전에 있는지 검증 → 없으면 "SEO 효과 미미" 경고
- 활용: 네이버 검색광고 API 키워드 도구 (CUSTOMER_ID: 3755315)
- 위치: `src/lib/naver/tag-dictionary.ts` (신규)

### Sprint 8 — P2 (운영 도구 강화)

**P2-A. 다크패턴 정가 부풀리기 경고** (리서치 8번)
- 도매가 대비 판매가 3배 이상 + 즉시할인 30%+ 동시 → "공정위 다크패턴 위험" 경고
- 위치: `src/components/products/MarginCalculator.tsx` 강화

**P2-B. AiTEMS 자연어 키워드 제안기** (리서치 13번)
- 카테고리별 "상황·용도·세대" 키워드 제안 (예: 가구 → "원룸 미니멀", "신혼 첫집", "MZ 자취")
- 위치: `src/lib/aitems-natural-keywords.ts` (신규)

**P2-C. 등급 임계값 2025.12.2 개편 반영** (리서치 1번)
- 파워 등급 기준 800만원 + 굿서비스 이중 평가 → GoodServiceWidget 명시
- 위치: `src/components/dashboard/GoodServiceWidget.tsx` 강화

### P3 — 후순위 (매출 600만원+ 후)

- **P3-A**. Tailscale Funnel + home-proxy 큐 분리 (재시도 3회 + DLQ)
- **P3-B**. Naver Commerce API 본격 활용
- **P3-C**. 광고 ROAS 추적 (네이버 검색광고 API)

### 잔여 Z-시리즈 (별도 sub-graph)

- **Z-3c'**: `/products/sourced` + `/products/upload` + `/products/[id]/edit` Hard delete (Q1·Q2·Q3 진단 완료, 꽃졔님 개별 Y/N 승인 필요)
- **Z-3e**: 백업 파일 67개 일괄 정리
- **Z-Sec**: 14개 Supabase 테이블 RLS 정책 설계

---

## 현재 앱 상태

| 항목 | 현황 |
|------|------|
| 전체 상품 | 8개 (모두 DRAFT) |
| 네이버 Commerce API | ok=true ✅ |
| 네이버 검색광고 API | ✅ (CUSTOMER_ID: 3755315) |
| 네이버 DataLab API | ✅ ID: F7Hga62gDOYxZ3KRtLTL |
| Discord | 5채널 ✅ |
| TSC | 0 errors ✅ |
| Vercel 배포 | https://kkotium-garden.vercel.app ✅ |
| GitHub | https://github.com/kkotium-dot/kkotium-garden |
| Phase A~D | 전체 완료 ✅ |
| Phase E | 진행 중 (E-7, E-1, E-3, E-8 완료) |
| Phase E+ | Sprint 1·2·3·4·5 완료 |
| 카카오 비즈니스 채널 | 꽃틔움 KKOTIUM (`_xkfALG`) ✅ |
| 도매꾹 Private API | 28개 전체 권한 발급 ✅ (Sprint 8 보류 트랙) |
| Solapi 알림톡 | 키 미입력 (월 50건+ 시 활성화) |

### 카카오 비즈니스 채널 정보

```
채널명: 꽃틔움 KKOTIUM
검색용 ID: 꽃틔움
채널 Public ID: _xkfALG
채널 URL: http://pf.kakao.com/_xkfALG
채팅 URL: http://pf.kakao.com/_xkfALG/chat
카테고리: 쇼핑 > 생활용품
```

### AI API 키 현황 (2026-04-30 기준)

| 서비스 | 환경변수명 | 상태 |
|---|---|---|
| **Groq** (1순위) | GROQ_API_KEY (lrltQb) | 정상 ✅ |
| **Groq** | GROQ_API_KEY_3 (3IGN7i) | 정상 ✅ |
| Groq | GROQ_API_KEY_2 (3pEakT) | 401 Invalid (Vercel 삭제 권장) |
| Gemini | GEMINI_API_KEY/_2/_3 | 429 quota 초과 (운영 기여 0) |
| xAI Grok | XAI_API_KEY | 크레딧 미배정 |
| Perplexity | PERPLEXITY_API_KEY | Pro 만료 (401, 비활성) |

**fallback 순서**: Groq round-robin (3키, 401/403/JSON parse safety) → Gemini round-robin → Anthropic last-resort

---

## 환경 / 메뉴 / 파이프라인

### 환경 정보

```
앱 루트:    /Users/jyekkot/Desktop/kkotium-garden
Dev 서버:   http://localhost:3000
Dev 로그:   /tmp/dev.log
프로덕션:   https://kkotium-garden.vercel.app
DB:         Supabase PostgreSQL (doxfizicftgtqktmtftf)
스토어:     꽃틔움 KKOTIUM (smartstore.naver.com/kkotium)
GitHub:     https://github.com/kkotium-dot/kkotium-garden
Vercel:     vercel.com/kkotjyes-projects/kkotium-garden
카카오채널: 꽃틔움 KKOTIUM (pf.kakao.com/_xkfALG)
```

### 사이드바 메뉴 구조 (9개 섹션, 2026-05-08 확정)

```
GARDEN: 정원 일지 (/dashboard) ✅
HUNT:   꿀통 사냥터 (/crawl) ✅ + 소싱 보관함 (/crawl?tab=history) ✅ [Z-3b]
PLANT:  씨앗 심기 (/products/new) ✅ 신버전 6탭 통합 (수정 모드 ?edit=ID 포함)
TEND:   정원 창고 (/products) ✅
        검색 조련사 (/naver-seo) ✅ v3 인라인 편집
        좀비 부활소 (/products/reactivation) ✅
ORDERS: 주문 관리 (/orders) ✅
OPS:    인서트 카드 (/ops/insert-card) ✅
TOOLS:  거래처 명단 (/settings/suppliers) ✅
        배송 레시피 (/settings/shipping) ✅
        공급사 열쇠방 (/settings/supplier-login) ✅
        카카오 채널 (/settings/kakao) ✅
        네이버 기본값 (/naver-settings) ✅
```

### 사이드바 미등록 라우트 (정리 대상 — Z-3c'/Z-3e)

- `/products/[id]/edit` — 외부 진입 0건 (구버전 ProductForm.tsx 582줄, 메인 흐름은 `/products/new?edit=ID`로 통합됨)
- `/products/upload` — CSV 일괄 업로드 (새싹 단계에서 권장 안 함, 리서치 3번)
- `/products/sourced` — 카드 그리드 뷰 (사이드바 미등록)
- `/products/out-of-stock` — `:158`이 dead route `/products/[id]/edit`를 가리킴 (수정 필요)
- 백업 파일 67개 (`*.bak*`, `*.backup*`, `*.v[0-9]*`)

### 앱 파이프라인

```
꿀통 사냥터 (크롤링) → 소싱 보관함 (SOURCED→PENDING→REGISTERED)
→ 씨앗 심기 (등록/편집, 6탭 통합)
→ 정원 창고 (목록/인라인 편집)
→ 검색 조련사 (SEO 점수 + AI 최적화 + 인라인 편집)
→ 엑셀 다운로드 또는 네이버 직접 등록 (Commerce API)
→ 대시보드 (실적/꼬띠추천/이벤트)
→ 주문 관리 (발주확인/송장등록 + 알림톡)
→ 좀비 부활소 (재등록)
```

---

## 핵심 파일 경로

| 역할 | 경로 |
|------|------|
| Prisma 싱글톤 | `src/lib/prisma.ts` |
| Naver API (bcryptjs) | `src/lib/naver/api-client.ts` |
| 카테고리 (4,993개) | `src/lib/naver/naver-categories-full.ts` |
| 카테고리 속성 | `src/lib/category-attributes.ts` |
| **꿀통지수 (SEO+마진+경쟁+보너스)** | `src/lib/honey-score.ts` |
| SEO 점수 | `src/lib/seo-calculator.ts` |
| 상품명 품질 체커 | `src/lib/product-name-checker.ts` |
| 경쟁 모니터 | `src/lib/competition-monitor.ts` |
| 굿서비스 점수 | `src/lib/good-service.ts` |
| 소싱 추천 엔진 | `src/lib/sourcing-recommender.ts` |
| 트렌드 분석 | `src/lib/trend-analyzer.ts` |
| **꼬띠 4모드 추천 (Sprint 6-D foundation)** | `src/lib/recommendation-modes.ts` + `src/lib/recommendation-runner.ts` |
| 업로드 준비도 | `src/lib/upload-readiness.ts` |
| 반품안심케어 수수료 | `src/lib/return-care-fees.ts` |
| 리뷰 감정분석 (E-11) | `src/lib/review-sentiment-analyzer.ts` |
| 자동 채우기 (E-15) | `src/lib/upload-readiness-filler.ts` |
| 도매꾹 자동 매핑 | `src/lib/crawler/auto-mapper.ts` |
| 네이버 상품 빌더 | `src/lib/naver/product-builder.ts` |
| 마진 계산기 | `src/components/products/MarginCalculator.tsx` |
| 상세페이지 빌더 | `src/components/products/DetailPageBuilder.tsx` |
| SEO 테이블 v3 | `src/components/naver-seo/NaverSeoProductTable.tsx` |
| 자동 채우기 모달 | `src/components/dashboard/AutoFillModal.tsx` |
| 등록 준비 위젯 (E-14) | `src/components/dashboard/UploadReadinessWidget.tsx` |
| 리뷰 성장 위젯 (E-2A) | `src/components/dashboard/ReviewGrowthWidget.tsx` |
| 굿서비스 위젯 | `src/components/dashboard/GoodServiceWidget.tsx` |
| 구매확정 리마인더 위젯 | `src/components/dashboard/ConfirmationReminderWidget.tsx` |
| 한달리뷰 리마인더 API | `src/app/api/orders/month-review-pending/route.ts` |
| 구매확정 리마인더 API | `src/app/api/orders/confirmation-pending/route.ts` |
| 네이버 등록 API | `src/app/api/naver/register/route.ts` |
| 자동 채우기 API (E-15) | `src/app/api/upload-readiness/auto-fill/route.ts` |
| 카카오 설정 API | `src/app/api/kakao-settings/route.ts` |
| 씨앗 심기 (3,476줄) | `src/app/products/new/page.tsx` |
| 정원 창고 (1,357줄) | `src/app/products/page.tsx` |
| 검색 조련사 | `src/app/naver-seo/page.tsx` |
| 주문 관리 | `src/app/orders/page.tsx` |
| 대시보드 | `src/app/dashboard/page.tsx` |
| 카카오 채널 설정 | `src/app/settings/kakao/page.tsx` |
| 인서트 카드 | `src/app/ops/insert-card/page.tsx` |
| 사이드바 | `src/components/layout/Sidebar.tsx` |
| cron daily | `src/app/api/cron/daily/route.ts` |
| cron weekly | `src/app/api/cron/weekly/route.ts` |

---

## 네이버 API 현황

| API | 상태 |
|-----|------|
| 토큰 발급 (bcryptjs) | ✅ |
| 채널 정보 | ✅ 꽃틔움 KKOTIUM |
| 주문 조회 / 발주 확인 / 송장 등록 | ✅ |
| 상품 실시간 동기화 | ✅ |
| 주소록 조회 | ✅ |
| DataLab 트렌드 | ✅ |
| 검색광고 키워드 검색량 | ✅ (CUSTOMER_ID: 3755315) |
| 리뷰 API | ❌ 미지원 (GitHub #1582) |

## Vercel 환경변수

```
DB:         DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
Naver:      NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, NAVER_PROXY_URL
Naver SEO:  NAVER_SEARCHAD_API_KEY, NAVER_SEARCHAD_SECRET_KEY, NAVER_SEARCHAD_CUSTOMER_ID
DataLab:    NAVER_DATALAB_CLIENT_ID, NAVER_DATALAB_CLIENT_SECRET
Discord:    DISCORD_WEBHOOK_ORDERS, _STOCK, _DAILY, _WEEKLY, _KKOTTI
AI:         GROQ_API_KEY, GROQ_API_KEY_3 (실사용 2개), GEMINI_API_KEY/_2/_3 (quota 초과)
Cloudinary: CLOUDINARY_CLOUD_NAME, _API_KEY, _API_SECRET
Etc:        CRON_SECRET, NEXT_PUBLIC_APP_URL
향후 (E-13B): SOLAPI_API_KEY, SOLAPI_API_SECRET, KAKAO_PF_ID, SENDER_PHONE_NUMBER
향후 (E-12): DISCORD_WEBHOOK_REVIEW
```

---

## 절대 작업 원칙

### 코드 작성 규칙

```
1.  JSX 이모지 완전 금지 → Lucide React SVG 아이콘만
2.  주석 영어만 작성, 한글 리터럴 타입 금지
3.  new PrismaClient() 금지 → src/lib/prisma.ts 싱글톤
4.  카테고리 → NAVER_CATEGORIES_FULL 로컬 상수만 (API 호출 금지)
5.  수정 후 npx tsc --noEmit → 0 errors 확인
6.  600줄+ TSX는 write_file 전체 교체 (edit_file 소규모만)
7.  Python 패치: write_file → execute → rm (heredoc 금지)
8.  prisma migrate dev 금지 → Supabase SQL Editor 사용
9.  framer-motion 사용 금지 → CSS animations
10. bcrypt 금지 → bcryptjs (Vercel Linux 호환)
11. API route에 export const dynamic = 'force-dynamic' 필수
12. useSearchParams() 사용 페이지 → Suspense로 감싸기
13. Next.js route 파일: GET/POST/PUT/DELETE/dynamic 외 export 금지
14. PROGRESS.md + ROADMAP.md 항상 함께 업데이트
15. 카카오 채널 정보 하드코딩 금지 → store_settings에서 읽기
16. \uXXXX 유니코드 이스케이프 JSX에서 사용 금지
17. git commit 여러 줄 메시지 금지 → -F 옵션 또는 한 줄 압축
18. Python -c 안 multi-line string 금지 → write_file 사용
19. AI 자동 채우기 결과는 DB 직접 적용 절대 금지 → POST(미리보기) + PATCH(셀러 승인 적용) 2단계
20. AI 추천 카테고리는 NAVER_CATEGORIES_FULL 로컬 검색만
21. 새 채팅 시작 시 git rev-parse HEAD origin/main 교차 확인 의무
22. AI 라이브러리 검증과 PATCH 검증 일치시키기
23. 새 채팅 메시지의 "현재 HEAD/commits 가정"을 의심하라
24. Block 단위 작업 시 commit + push를 한 묶음으로 한 turn 안에 끝내기
25. 한글 NFC/NFD 정규화 트랩 — Python 수동 정규화 절대 금지, raw 검증 우선
26. (위 작업원칙 #26 섹션 참조 — IA 점검 의무화 + 고아 라우트 처리)
27. 근본 원인 분석 — 한 케이스가 아닌 동일 패턴 일반화
28. 배포 운영 — npm run dev 의존 절대 금지, Vercel 배포가 source of truth.
    Naver IP 화이트리스트 등 home-proxy 필요 시 별도 standalone 스크립트
    (Cloudflare Tunnel + tiny Node.js relay 또는 Naver Cloud Compact)
29. (위 작업원칙 #29 섹션 참조 — 한글 처리 절대 규칙 5가지)
30. 환경 확인 — MCP 미연결 시 즉시 정직 보고 후 종료
31. (위 작업원칙 #31 섹션 참조 — MD 의미 단위 자동 분할 + 인계 무결성)
```

### UI 작성 원칙 (2026-04-13 확정)

```
- 이모지 금지: Lucide React SVG 아이콘 100% 교체
- 전문 용어: 한글 + (영문) 병기  예) 상품코드 (SKU)
- 기능 버튼: 순한글  예) 한 번에 임시등록, 건너뜀
- 상태 라벨 통일:
    DRAFT = 임시저장
    ACTIVE (naverProductId 있음) = 네이버 판매중
    ACTIVE (naverProductId 없음) = 네이버 등록 대기
    OUT_OF_STOCK = 품절
    INACTIVE/HIDDEN = 재활성화 필요
```

### 세션 관리

```
- iterm-mcp list_all_sessions 후 사용 (primary tty: /dev/ttys000)
- Chrome MCP: tabs_context_mcp → navigate (JS 도구는 hang 패턴 주의)
- heredoc 절대 금지 (터미널 hang 유발)
- dev 서버 재시작 필요 시 꽃졔님에게 요청 (또는 fresh build 명령 한 줄로 전달)
- 브라우저 테스트 필수: API 200 ≠ 브라우저 완료
```

### 보고 원칙

```
- 직접 실행 불가 시 거짓말 금지, 즉시 상황 설명
- Filesystem:edit_file 실패 후 Python 패치로 대체
- API 테스트 성공 후 반드시 브라우저 테스트로 재확인
- Vercel 환경변수 변경 후 재배포 트리거 (git commit --allow-empty + push)
- "진행해줘요" = end-to-end 완료 후 통합 브리핑 (중간 보고 없이)
- 꽃졔님 결정 필요한 사항은 *개별 Y/N 승인* — Claude 단독 판단 금지
```

---

## 알려진 이슈 및 주의사항

| 이슈 | 원인 | 대응 |
|------|------|------|
| prisma migrate dev 실패 | shadow DB 없음 | Supabase SQL Editor 사용 |
| framer-motion 미설치 | 설치 안 함 | CSS animations 대체 |
| bcrypt 금지 | Vercel Linux 호환 안 됨 | bcryptjs 사용 |
| Gemini quota 소진 | 하루 1,500회/계정 | Groq fallback 자동 작동 |
| NAVER_CLIENT_SECRET $ 이스케이프 | dotenv-expand | 로컬: `\$2a\$04\$...`, Vercel: `$` 그대로 |
| Vercel 환경변수 변경 후 미반영 | 자동 재배포 안 됨 | `git commit --allow-empty && push` |
| 네이버 리뷰 API 미지원 | 커머스 API 범위 밖 | 수동 입력 + 크롤링만 |
| 알림톡 완전 무료 불가 | 카카오 딜러사 건당 과금 | 솔라피 13원, 가입 시 300포인트(23건분) |
| AI 자동 채우기 90점 도달 한계 | 11개 중 4개는 AI 영역 외 (이미지 2개/배송/마진) | 자동 max 72점 + 셀러 수동 28점 = 100점 |
| 새 채팅에서 HEAD ≠ origin/main 가능성 | 직전 채팅이 push 못하고 끝난 경우 | `git rev-parse HEAD origin/main` 교차 확인 의무 |
| 도매꾹 v4.5 옵션 해시 미스매치 | 공급사 부분 수정 시 해시 동일·텍스트 변경 | 해시 + 텍스트 동시 비교 (Sprint 6 P0-A) |
| 도매꾹 vacation 무시 | 휴가 공급사 등록 시 굿서비스 폭락 | seller.vacation 검증 (Sprint 6 P0-A) |

---

## 2026 네이버 쇼핑 SEO + 리뷰 전략 인사이트

### 핵심 변화 (리서치 통합)

```
1. 키워드 매칭 → 검색 의도 일치로 전환
   - 상품명 25~35자 최적, 속성+태그 상세 입력 → 상품명 외 키워드 노출
2. AI 추천이 검색 트래픽 20%+ 차지
   - AiTEMS ON 설정 필수 (전체 클릭 약 10%)
   - 2026.2 쇼핑 AI 에이전트: 리뷰 실시간 분석 → 상품 추천
3. 신뢰도(Trust) 지표 급부상
   - 굿서비스 점수 → 검색 랭킹 직접 반영
   - 톡톡 응답 기준 24h → 12h 강화
4. 반품안심케어 = 즉시 스위치 (건당 50~650원 → 매출 +13.6%)
5. 리뷰 = 장기 엔진 (0→10 무료, 50+ 시 알림톡 도입 검토)
6. 수수료 개편: 유입수수료 2% 폐지 → 판매수수료 2.73%
```

### 등급 체계 개편 (2025/12 시행, 2025.12.2 기준)

```
- 평가 기간: 3개월 → 1개월
- 빅파워: 4,000만 → 1,000만원/월
- 파워:   800만 → 300만원/월 (실무 보고: 800만으로 상향)
- 새싹:   200만 → 80만원/월
- 굿서비스 점수가 등급 산정에 정식 반영 (이중 평가)
```

### 단계별 운영 전략 (리서치 D항목)

```
씨앗 (월 0~200만원):
  SKU 30개 이하, 100% 단건 등록, 마진 50%+ 카테고리 집중
  전체 시간 70%를 등록 정밀도에 투자

새싹 (월 200~600만원):
  SKU 50~100개, 효자 상품 5개 식별 후 광고 집중
  반품안심케어 가입 필수 (매출 +13.6%)
  굿서비스 점수 일 단위 모니터링

파워 진입 (월 600~3,000만원):
  SKU 100~300개, 매출 상위 20% 상품에 광고 80% 집중
  Commerce API 자동 등록 일부 전환
  단골 커머스 도구 활용
  굿서비스 100건 중 2건 이내 실수 유지
```

---

## 기술 패턴 레퍼런스

```typescript
// Prisma 싱글톤
import { prisma } from '@/lib/prisma';

// Naver API (bcryptjs! Supabase proxy 경유)
import { naverRequest } from '@/lib/naver/api-client';

// 카테고리 (로컬 상수만, API 호출 금지)
import { NAVER_CATEGORIES_FULL } from '@/lib/naver/naver-categories-full';

// API route 필수 헤더
export const dynamic = 'force-dynamic';

// 로컬 .env.local: NAVER_CLIENT_SECRET=\$2a\$04\$...
// Vercel 환경변수:  NAVER_CLIENT_SECRET=$2a$04$...

// Groq round-robin (3keys + 401/403/JSON parse safety fallback)
// callGroq() → callGemini() → callAnthropic()

// 이모지 금지 예시
// Bad:  <span>🚚</span>
// Good: <Truck size={14} style={{ color: '#e62310' }} />

// 카카오 채널 QR URL (인서트 카드용)
// https://pf.kakao.com/_xkfALG

// 솔라피 알림톡 (E-13B 활성화 시)
// POST https://api.solapi.com/messages/v4/send
// 인증: HMAC-SHA256 (apiKey, date, salt, signature)
// npm: solapi 패키지

// 도매꾹 OpenAPI v4.5 (Sprint 6 P0-A 활용)
// https://domeggook.com/ssl/api/?ver=4.5&mode=getItemView&aid={KEY}&no={no}&om=json
// 응답: { domeggook: { basis, price, qty, deli, seller, thumb, selectOpt, category } }
// seller.vacation 휴가 검증 + channel 검증 필수
```

---

## 참고 문서 인덱스

### docs/research/
- `SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md` — 본 세션 신규 (15개 핵심 + 단계별 체크리스트)
- `COMMERCE_API_403_ROOT_CAUSE.md`
- `COMMERCE_API_ORDER_DIAGNOSIS.md`

### docs/plan/archive/
- `README.md` — archive 폴더 인덱스 (분할 정책 + 검색 패턴 + 파일명 규칙)
- `PROGRESS_2026Q2_MAY.md` — 5월 누적 PROGRESS 헤더 이력 (작업원칙 #31 분할, 동결)
- `ROADMAP_2026Q2_MAY.md` — deprecated 인계 메시지 9개 + Phase A/B/C 완료 이력 (동결)
- `SESSION_LOG_2026Q2_MAY.md` — 2026-05-01 ~ 2026-05-06 세션 24+ 건 (동결)

### 프로젝트 파일 (외부 리서치)
- `260413-꽃틔움 가든 개선안 검증과 2026년 전략 로드맵`
- `스마트스토어 리뷰 관리와 반품안심케어, 무엇을 먼저 할 것인가`
- `네이버 스마트스토어 파워셀러의 2025-2026 실전 무기 총정리`
- `카카오 비즈니스 채널 2025-2026 완전 가이드`
- `Smartstore_Sprout_to_Power_Seller_Workflow_Optimization_Guide__May_2026.md`
