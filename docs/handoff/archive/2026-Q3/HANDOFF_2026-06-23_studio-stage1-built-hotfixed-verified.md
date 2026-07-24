# HANDOFF 2026-06-23 - Studio Stage 1 Built + Hotfixed + Re-verified

Target Session: DESKTOP (authored) -> next CODE-CLI (commit) + DESKTOP (prod re-verify)
Branch: main (Stage 1 + lg:hidden hotfix UNCOMMITTED at time of writing; commit option 1 approved)
Scope: docs/handoff record. SD-01 untouched. No Naver PUT.

---

## 1. Studio refactor Stage 1 (structure) - status

Build (Code, 5 files, tsc --noEmit exit 0, build skipped per #136 dev-up):
- AtelierShell.tsx + studio/page.tsx: page header moved INTO the shell fixed-height container (so columns no longer overflow the viewport); AssetBrowser inner nested scroll cap removed (single column scroll).
- AssetBrowser.tsx + AssetBrowser.strings.ko.json: AssetTile rewrite - 0 actions at rest, hover overlay (star set-as-main + kebab: add-image/archive/delete), selection checkbox, multi-select sticky bulk bar, bulk-delete confirm modal (reuses /crawl v2.5 OverflowMenu + existing performAction; reversible; no Naver).
- ControlTower.tsx: now step-gated (thumbnail -> thumbnail-visibility, SEO -> SEO match-rate, publish -> ROI/hook auto-expand).

Desktop live e2e (localhost dev, real DOM):
- #3 ControlTower step-gating: PASS (clicked SEO -> SEO match-rate expands; clicked thumbnail -> thumbnail-visibility expands; others collapse). Verified by interaction.
- #1 page no-scroll: a PRE-EXISTING defect surfaced (NOT a Stage 1 regression; present on prod too) - see section 2.
- #2 asset tile (hover/kebab/checkbox/bulk bar): NOT runtime-verifiable - Myeonghwa's stages are all "not-applied" (미적용), so no real AssetTile grid renders (shell-wide scan: 0 group-hover elements, 0 AssetTile candidates). Component is built + tsc-clean but cannot be exercised without a product that has applied asset tiles. Honest gap; not claimed as PASS.
- #4 kebab clipping at column bottom: deferred (needs real tiles).

---

## 2. Pre-existing duplicate-render defect (FOUND + HOTFIXED)

Symptom: on desktop (lg, width 1440-1600), the studio page scrolled as a whole (~1500px+ extra), undermining the column-independent-scroll goal.
Root cause: AtelierShell.tsx mobile block had class="lg:hidden" BUT an inline style display:flex. Inline style beats the lg:hidden utility (display:none), so at lg the mobile block never hid -> duplicate content (desktop shell + mobile stack both rendered).
Classification: PRE-EXISTING (also on prod build a2d70b2, measured docOverflow 2709px) -> project-wide concern (#62), not a Stage 1 regression.

Hotfix (Code, AtelierShell.tsx, 1 line):
  - <div className="lg:hidden" style={{padding..., display:"flex", flexDirection:"column", gap:12}}>
  + <div className="flex flex-col gap-3 lg:hidden" style={{padding...}}>
Inline display/flexDirection/gap moved to className; padding (non-conflicting) stays inline.
Global sweep (#62): AST-style scan of src/**/*.tsx for "responsive display toggle className + inline display:" conflicts -> 0 remaining after fix. crawl/plant have no responsive display toggles. AtelierShell was the only occurrence.

Desktop re-verify (localhost dev, 1600x865, scrolled to top):
- mobile block display:none, height 0 -> double-render ELIMINATED. PASS.
- Residual vertical docOverflow ~400px remains (see section 3).

---

## 3. Residual overflow (~400px) - defer to Stage 2 (proper flex-fill)

Measured: global header = 76px, chrome above shell = 98px, shell = 806px (inline height calc(100vh - 60px)), content below shell + footer accounts for the rest.
Cause: the shell's calc(100vh - 60px) magic number (60) does not match real chrome (header 76 + top padding + footer/bottom padding). Fixed CSS px mismatch (76 vs 60), NOT a zoom artifact.
Decision: do NOT band-aid the magic number (60 -> 76 is just another brittle magic number). Proper fix = flex-fill (parent flex flex-col + shell flex-1 min-h-0), which is robust to header/footer height. BUT that touches the GLOBAL app-shell (main) layout -> affects all pages -> safer to do as part of the Stage 2 2-column layout rework with full regression check, not a rushed Stage 1 global change.
Status: residual is minor (does not block workspace use; columns scroll internally). Scheduled into Stage 2.

NOTE (environment honesty): the MCP/headless browser renders zoomed-out (dpr ~1.8, viewport larger than physical screen), so absolute px are not fully trustworthy for a real monitor; the header(76)-vs-calc(60) mismatch is a fixed CSS-px relationship and is reliable regardless of zoom. Operator real-viewport confirmation welcome.

---

## 4. Commit decision (operator approved = OPTION 1)

Option 1: commit Stage 1 now (locks the verified double-render prod-bugfix + #3 gating + AssetTile component + ControlTower gating); residual overflow + #2 runtime verification + #4 kebab clipping folded into Stage 2.
Rationale: double-render fix is a verified net improvement AND a prod bug fix (#62); residual proper fix (flex-fill) is global-layout work best done in Stage 2; #2 asset rail is reworked in Stage 2 anyway (natural verification with real data).
#2 verification path: operator visual check during use, OR a product/stage with applied assets, OR Stage 2 asset-rail rework.

---

## 5. Principles added this session (Code to persist)

- #140 Inline style defeats Tailwind responsive utilities (lg:hidden etc.). Responsive show/hide toggles must be class-only; never put inline display on an element that relies on a responsive display class. Sweep all components (#62). (Backed by this session's root-cause find.)
- #141 Fixed-viewport workspace height must NOT use calc(100vh - magicNumber). Use flex-fill (parent flex flex-col + child flex-1 min-h-0). Magic numbers break when header/padding heights change.

---

## 6. Next actions + dependency map

INDEPENDENT (no cross-lane dependency, now):
- [Code] persist #140 + #141, PARALLEL_WORK_TRACKER rev26 (Stage1=structure-done [double-render fix + #3 PASS]; residual overflow + #2 + #4 -> Stage 2). 
- [Desktop] this handoff: DONE.

COMMIT-FIRST (option 1, [Code block 5 option 1]):
- [Operator] stop dev -> [Code] rm -rf .next && npm run build -> commit + push (studio Stage1 structure + lg:hidden hotfix) -> Vercel deploy.
- [Desktop] prod re-verify after deploy (double-render gone on prod, 5 tabs/studio intact).

REVIEW LOOP (#138):
- [Operator] visually review studio Stage 1; report any improvement points -> [Desktop] route fixes (Code or direct), iterate. This also covers #2 visual confirmation.

STAGE 2 (next major):
- 2-column core + collapsible contextual right inspector; relocate SEO tower (inspector, step3 peak) / funnel board (step2) / market DNA (step2-3) / AI diagnosis (inline step1 + pre-flight step4); per-step empty states.
- Fold in: residual-overflow flex-fill fix (#141), asset-rail rework (natural #2/#4 verification).

GATED / LOCKED (unchanged):
- Myeonghwa publish PUT <- seed-planting backfill + operator GO (#46/#124).
- C5 / D3 / registry-storage reconcile <- after Myeonghwa publish (#124).

---

## 7. Key files

- Studio (Stage 1 changed): src/components/studio/atelier/AtelierShell.tsx (header slot + mobile-block hotfix line ~94), src/app/studio/page.tsx (header into shell + step->ControlTower wiring), src/components/studio/atelier/ControlTower.tsx (step prop + gated accordions), src/components/studio/AssetBrowser.tsx (+ .strings.ko.json) (AssetTile rewrite + multi-select + bulk modal).
- Reused: src/components/common/OverflowMenu.tsx (kebab, shared with /crawl).
- Trackers: docs/plan/PARALLEL_WORK_TRACKER.md (-> rev26), PRINCIPLES_LEARNED.md (-> #140, #141), PROGRESS.md (~1474, split near #31), SESSION_LOG.md.
- Prior handoff: docs/handoff/HANDOFF_2026-06-23_studio-refactor-spec-and-dryrun-reconfirm.md.

---

## 8. Gate summary

Stage 1 critical defect (double-render) FIXED + verified. #3 PASS. #2/#4 verification pending real asset tiles (-> Stage 2 / operator visual). Residual ~400px overflow -> Stage 2 flex-fill (#141). Commit option 1 approved. No Naver PUT. SD-01 untouched. Hotfix = 1 line + global sweep (0 other occurrences).
