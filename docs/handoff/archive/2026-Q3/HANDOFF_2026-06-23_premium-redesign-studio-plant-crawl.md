# HANDOFF 2026-06-23 — Premium B2B SaaS Redesign (Studio / Plant / Crawl)

> **Target Session:** kkotium-code (Claude Code CLI)
> **Branch:** main
> **Lane:** Code (build + Korean tracker persistence). Desktop did the live verification below.
> **Gate:** Operator GO granted. Build authorized.
> **Author:** Desktop Claude (live browser verification 2026-06-23, production kkotium-garden.vercel.app)

---

## 0. ONE-PARAGRAPH SUMMARY

Three operator-reported UX defects were root-caused via LIVE production verification (not inference).
The fix is a **premium B2B SaaS redesign** of three screens. KEY FINDING: this is **NOT greenfield** —
the heavy lifting (Plant 6-tab Panel Split + right panel; Studio section set; Crawl status filters) is
ALREADY built. The work is **shell restructure + surfacing existing verified backend logic + restoring a
regressed button**. Preserve all validation/publish-gate logic. Do not touch the publish-gate footer
(SD-01). Product-agnostic for ALL products (not 명화-only). No Naver PUT/POST in any of this work.

---

## 1. LIVE-VERIFIED GROUND TRUTH (Desktop, 2026-06-23, production)

Read this so you do NOT re-discover. All confirmed in the live DOM on production.

### Crawl (`/crawl` = 꿀통 꽃나들이) — ISSUE 1
- Status filter tabs exist: 전체 / 소싱완료(5) / 등록대기(4) / 등록완료(4). One-directional (no reverse/reclassify).
- Checkboxes: 6 total, **2 disabled** — 등록완료 items are unselectable (the lock).
- 수정/편집 buttons: **0**. 삭제 buttons: **0**. Per-item edit/delete affordance is ENTIRELY ABSENT.
- Item actions present: 꽃 한 송이 담기 / 꽃 한아름 담기 / 등록 시작 / 완료 표시 only.
- ROOT CAUSE: 등록완료 checkbox `disabled` + no edit/delete affordance + one-directional filter.

### Plant (`/products/new` = 씨앗 심기) — ISSUE 2 + ISSUE 3
- **6 tabs ALREADY built**: 기본 정보 / 옵션 / 이미지 / 배송·A/S / SEO·원산지 / 혜택 (matches the approved 2026-02 Panel Split design).
- **Right panel ALREADY built**: 실전 마진 계산기 / SEO 검색최적화 점수 / 엑셀 매핑 미리보기.
- 임시저장 button: **ABSENT** (verified false). Current primary action = "비주얼 자동화" (+ "비주얼 자동화로 이동"). → ISSUE 2.
- 이미지 tab content: 상세페이지(x3) / 상세설명(x2) / 상세자동화(x2) / SEO훅(x3) / 대표이미지(x2) / 추가이미지(x2). 에셋브라우저=0 (correctly absent here). → ISSUE 3 (detail duplication with Studio).
- NOT verifiable in blank form: 엑셀 / 직접등록 buttons did NOT appear in the empty-form DOM. They likely render conditionally once product data exists (operator confirmed they exist). **Code must read the full file to map the complete action bar before changing it.**

### Studio (`/studio` = 온실 아틀리에) — REDESIGN TARGET P1
- 3 sub-tabs exist: 상품 분석 / 이미지 / 발행.
- Layout: **vertical stack** (`hasGridCols` false — no grid/flex split). scrollRatio ~1.2 @1426px viewport (≈2.1 on a normal laptop).
- ~15 unique sections, dual-rendered (kept mounted, display-toggled): 상품목록 / 시장DNA / AI진단 / 9슬롯 퍼널보드 / 무드카메라 / 대표·썸네일 / 썸네일4변형 / Firefly합성프롬프트 / 상세페이지 / 5섹션상세페이지 / 자산정리 / 에셋브라우저 / 발행전정책게이트 / 이미지저장+발행.
- 이미지 tab is dense (7 sections). NO stepper, NO fixed right panel, NO split-view.
- Detail production (상세페이지 + 5섹션상세페이지) ALREADY lives here → this is the correct single home for detail (Issue 3 resolves by REMOVING detail from Plant, not adding it here).

---

## 2. PRE-BUILD STEP (MANDATORY) — full-file root-cause read

Desktop's Filesystem MCP reads head/tail only; monoliths (200KB+) are mid-file-unreachable. Code MUST
read the FULL files to find exact lines before editing:

- `src/app/crawl/page.tsx` (~125KB) — find: the checkbox `disabled={...}` condition (which status disables it); the item action region; the status filter logic.
- `src/app/products/new/page.tsx` (~215KB) — find: the complete action bar (incl. conditional 엑셀/직접등록 buttons); where "비주얼 자동화" is wired; the 이미지 tab's detail sections (상세페이지/상세설명/상세자동화).
- `src/app/studio/**` (WorkbenchTabs.tsx, AssetBrowser.tsx, page.tsx) — map the 3-tab structure and the ~15 sections to relocate into the new shell.
- `prisma/schema.prisma` — Product.status / naver_status_type / any crawl-status model (for the Crawl state machine).
- `src/app/products/[id]/edit/page.tsx` — confirm the edit route for the Crawl 수정 action.

---

## 3. BUILD SPECS

### C-STUDIO-UX (P1) — 온실 아틀리에 shell restructure
Scope: medium. Restructure the shell; PRESERVE every existing section; relocate only.

- 3-column fixed grid **20 : 55 : 25**, `h-screen overflow-hidden`, each panel independently scrollable (`overflow-y-auto`).
- **Top Stepper** (replaces the loose 3-tab feel): 썸네일랩 → 상세캔버스 → SEO부스터 → 발행검토.
  - NOTE (#131): sourcing is OUT of Studio scope (sourcing belongs to Crawl/Plant). Assets are already sourced and loaded here.
- **Left 20% — 도구함**: = the existing AssetBrowser (live-verified working). Adobe Express templates / fonts / 정원 창고 (image store) list. Keep stage groups + 미적용 badges.
- **Center 55% — 개화 작업대**: mobile/PC toggle + live preview. This is the SINGLE home for detail-page assembly (상세페이지 + 5섹션상세페이지 stay here). Glassmorphism [꼬띠 누끼(Firefly)] slot card on hover.
- **Right 25% — 검색 생장 관제탑**: 3 accordion sections, seller-language + traffic-light (green/yellow/red). This is **SURFACING of existing backend** (시장DNA / AI진단 / dryRun readiness S94 / asset-integrity), NOT a new scoring engine (#132, extends #129):
  - 섹션1 썸네일 가시성 진단: 1000x1000 match feedback + competitor-thumbnail overlay toggle.
  - 섹션2 네이버 쇼핑 SEO 매칭율: Alt-tag status + keyword-density score bar (0-100).
  - 섹션3 예상 ROI·후킹 검수: top-3-second selling-point checklist (review/benefit/differentiation).
  - 개화도 점수 게이지 (0-100) at the top = a VISUALIZATION of the existing dryRun readinessGrade (currently S/94 for 명화). DO NOT build a new score engine.
- Terminology cleanup table (dev jargon -> premium e-commerce term): Image Resolution->썸네일 가시성; Alt String->검색봇 인식 태그; Text-to-Image->상세 가독성; Competitor Keyword->상위노출 매칭율; Expected CTR->구매전환 유도점수(ROI).
- 꼬띠 one-line guide speech-bubble component placed per step.
- Firefly 배경 프리셋 buttons + Alt-AI [꼬띠 추천] button = wire to the EXISTING Firefly composite / SEO pipelines, not new pipelines.
- Side benefit: decompose the monolith into section components while restructuring (pay down code-health debt).

### C-PLANT-UX (P2) — 씨앗 심기 surgical fixes
Scope: small. Structure already exists (6 tabs + right panel). Three targeted changes:

1. **ADD 임시저장 button** (ISSUE 2 — this is a REGRESSION recovery; the 2026-02 approved design had `[임시저장][DB저장]`). DRAFT upsert; partial data OK; stays on the page after save (does NOT trigger the visual-automation flow).
2. **Button taxonomy**: rename "비주얼 자동화" -> "저장 후 온실 아틀리에"; assemble a clean bottom action bar:
   `[임시저장] [DB 저장] [저장 후 온실 아틀리에] [네이버 엑셀 다운로드] [네이버 직접 등록]`.
   First read the full file to locate the conditional 엑셀/직접등록 buttons and integrate, do not duplicate.
3. **Remove detail from 이미지 tab** (ISSUE 3): delete 상세페이지 / 상세설명 / 상세자동화 from Plant's 이미지 tab. Keep 대표이미지 / 추가이미지 + the AI SEO 훅 (text, copyable) only. Detail production lives in Studio.

### C-CRAWL-STATE (P1) — 꿀통 status state machine
Scope: medium.

- Unlock the 등록완료 checkbox (remove the `disabled` for 등록완료).
- Reversible state machine: 신규소싱 -> 소싱완료 -> 등록대기 -> 등록완료 -> 보류 (allow reverse transitions / reclassify).
- New per-item affordances: 수정 (route to `/products/[id]/edit`), 삭제 (crawl record only — NEVER touches Naver, confirm modal #73 with target preview), 재분류.

---

## 4. HARD CONSTRAINTS (do not violate)

- **Product-agnostic (#55):** all three fixes apply to ALL products. No 명화-only path.
- **Preserve validation/publish logic:** do NOT alter dryRun, asset-integrity, publish-gate, margin/SEO calc logic. Shell/relocation only. Surface, do not rebuild (#132).
- **SD-01:** the publish-gate footer (Arabic dedication text) is permanent and personal. Do NOT touch, investigate, quote, or document it.
- **No Naver mutation:** none of this work issues Naver PUT/POST. Crawl 삭제 deletes the crawl record only.
- **Code style:** NO emoji in JSX strings/comments (Lucide React icons only). Comments in ENGLISH. No Korean type literals (use English constants). Read file with read_file before editing; run `tsc --noEmit` after.
- **Korean LIVE MD = Python full-overwrite ONLY (#29b):** never edit_file the Korean trackers directly (corruption). Use a Python script via Filesystem write + python3.

---

## 5. TRACKER DELTA (Code, Python full-overwrite — #29b)

- `docs/plan/PARALLEL_WORK_TRACKER.md` — add three items with status/next-action:
  - C-STUDIO-UX (P1, build authorized) — Studio 3-col split + stepper + 관제탑 surfacing.
  - C-PLANT-UX (P2, build authorized) — Plant 임시저장 + button taxonomy + detail removal.
  - C-CRAWL-STATE (P1, build authorized) — Crawl state machine + edit/delete affordance + checkbox unlock.
  - Append the live-verification memo: "Plant Panel Split already built (6 tabs + right panel); only 임시저장 missing. Crawl checkbox disabled + edit/delete affordance absent. Studio = vertical stack, needs split+stepper+control-tower."
- `docs/plan/PRINCIPLES_LEARNED.md` — persist two new principles:
  - **#131 Stage single-responsibility:** sourcing (Crawl/intake) / draft input (Plant) / detail+visual production (Studio/온실 아틀리에) / publish. On duplication, consolidate to the production stage.
  - **#132 UI redesign surfaces existing verified backend first; minimize new engines (extends #129):** control-tower / 개화도 = visualization of dryRun + asset-integrity. New scoring engines forbidden.

---

## 6. VERIFICATION (Code) + HANDBACK (Desktop)

- Code: `tsc --noEmit` clean; principles sentinel intact; all changes reversible; no Naver calls.
- Code: report which files/lines changed back to the operator (paste to Desktop) so DESKTOP can do the LIVE production verification (#45/#88) after merge — Desktop tests the real rendered bundle, not Code's report.
- Do NOT push/commit unless the operator instructs (there are already 3 unpushed docs commits + uncommitted working-tree files awaiting operator GO).

---

## 7. SEQUENCING NOTE

- Recommended order: C-STUDIO-UX (P1, biggest) -> C-PLANT-UX (P2, fast) + C-CRAWL-STATE (P1) in parallel.
- This redesign is SYSTEM/UX (product-agnostic) and does NOT conflict with the 명화 publish sequencing lock (#124, which is product-level). 명화 publish (operator backfill + GO) can proceed in parallel.
