# HANDOFF 2026-06-23 - Studio Refactor Spec Confirmed + Myeonghwa dryRun Re-confirm

Target Session: DESKTOP (authored) -> next CODE-CLI + DESKTOP
Branch: main (working tree had verified redesign + C-IA-5TAB uncommitted at time of writing; commit-first in progress)
Scope: docs/handoff record only. No code change in this session. No Naver PUT. SD-01 untouched.

---

## 1. What happened this session (chronological)

1. Studio (Onsil Atelier) full-refactor RESEARCH completed (extended web research) and localized to Korean:
   - File: `docs/research/STUDIO_REFACTOR_RESEARCH_KO_2026-06-23.md` (operator saved it; read-confirmed present, Korean intact).
   - English source content is the same research; KO file is the working reference.
2. Operator GO received on the studio refactor design spec + commit-first ordering (#139).
3. Operator confirmed scope decisions:
   - Mobile = responsive single-column, bottom-tab step switching, view/approve only (editing stays desktop). (1-A)
   - Reference = Canva step-guidance x Figma canvas-focus hybrid, plus evaluate better tools. (3-C, expanded)
   - Refactor scope = layout/IA + reasonable feature re-organization (hybrid). (2-hybrid)
4. Code CLI executed [Code block 1] (docs-only): PARALLEL_WORK_TRACKER rev25, PRINCIPLES_LEARNED #137-#139, SESSION_LOG + PROGRESS prepend. Anchors landed, sentinel clean, zero code change.
   - Note: a first Python pass aborted on an invalid-UTF-8 byte (fancy glyph mangled on write); rewritten with encoding cookie + ASCII-safe substitutes. Lesson reinforced for future Korean+glyph writes.
   - PROGRESS.md at 1474 lines (1500 split threshold near; #31 split likely on next prepend).
5. Desktop ran Myeonghwa production dryRun re-confirm (this handoff's key verification - see section 3).

---

## 2. CONFIRMED studio refactor spec (foundation = research KO doc)

Layout model: 3-column always-on (1087px) -> 2-column core + collapsible contextual right inspector.
- Left rail ~240-280px collapsible: merged Toolbox + Asset Browser, step-filtered, OWN internal scroll, collapsible to icon rail.
- Center canvas: fluid hero, current-step sections only, generous whitespace.
- Right inspector ~300-340px contextual + collapsible: SEO tower peaks at step 3, policy gate at step 4, light/collapsed at steps 1-2.

4-step feature map:
- Step 1 Thumbnail Lab: representative + 4 variants, mood-camera, Firefly prompt (default-collapsed advanced), AI diagnosis (inline result, not an always-on section). Inspector = light.
- Step 2 Detail Canvas: 5-section detail assembly, 9-slot funnel board RELOCATED here, market DNA as collapsed reference. Inspector = section/layout properties.
- Step 3 SEO Booster: SEO control tower becomes full right inspector - keyword match, category-match status, product-name SEO penalty check, structured options/tags, field-relevance hints.
- Step 4 Publish Review: policy gate checklist + publish CTA + AI pre-flight. Inspector = policy gate.
- Asset browser = persistent left, step-filtered. SEO tower = no longer a permanent column.

Asset-action density fix (the col0 main defect): at rest 0 icons (clean thumbnails) -> hover/focus compact toolbar = 1 primary (set-as-main, star) + kebab menu (add-image / archive / delete) -> multi-select = bulk action toolbar. Reuse the verified /crawl v2.5 OverflowMenu (src/components/common/OverflowMenu.tsx) for app-wide consistency (#55/#62/#137).

Mobile single-column (1-A): 1 col + bottom tab bar = 4 steps (44-48px targets, thumb zone). Each step = read-only preview + approve actions. Toolbox/asset/SEO tower as swipe-in drawers. Fixed bottom CTA. Editing disabled with "edit on desktop" affordance.

Visual system: neutral base + 1-2 accents (brand red + semantic green/red), retire rainbow chrome, 8pt grid, type scale, subtle borders (Linear/Stripe), Cmd+K palette, 150-250ms transitions, NO layout-shift-on-select (Adobe Express caution). Per-step empty state with one dominant CTA.

3-stage roadmap (priority):
- STUDIO-RF-S1 (structure, first): per-panel internal scroll (fix 2220px col0); asset clean-thumbnail + hover toolbar + kebab + multi-select (remove 100-160 resting icons); stepper gates right panel + asset filter (not just canvas). Pass: locate next action in <5s without scrolling.
- STUDIO-RF-S2 (layout): 2-col + contextual inspector; relocate SEO tower (inspector, step3 peak), funnel board (step2), market DNA (step2/3), AI diagnosis (inline step1 + pre-flight step4); per-step empty states. Pass: no step shows >5-9 primary elements.
- STUDIO-RF-S3 (mobile + polish): grid-template-areas responsive collapse -> 1 col + bottom 4-tab read-only/approve, drawers, fixed CTA; neutral+accent visual system + Cmd+K. Pass: mobile review+approve a full product with zero editing controls visible.

Build constraint: #132 (UI redesign = surface existing backend; verify/publish/dryRun logic unchanged, shell/relocate only, verbatim JSX move). Product-agnostic #55. tsc --noEmit during dev; build only when dev stopped (#136). Stage-split per #138 (build structure first -> live verify -> operator review -> derive detail).

---

## 3. Myeonghwa dryRun RE-CONFIRM (production, real measurement #45)

Endpoint (read-only, never mutates): GET /api/products/{id}/publish-readiness
Verdict logic shared single+batch via src/lib/automation/load-publish-readiness.ts -> publish-readiness.ts (no drift).
Run context: kkotium-garden.vercel.app authenticated session (NOT localhost), HTTP 200.
Product: cmpnooli40001f0gveaxr8iim (Myeonghwa car-vent diffuser), naverProductId 13564133057, status ACTIVE.

Result (all green except the already-published flag):
- fieldsAllSet: true (20 fields, none missing)
- hardComplete: true, hardFieldsMissing: []
- seoComplete: true, seoFieldsMissing: []
- goldenKeywordComplete: true (chayongbangjehyae / diffuser / aircon-smell-removal, in title)
- authentic: true, authenticityViolations: []
- naverPayloadComplete: true (origin/manufacturer/AS/tax/delivery/exchange/refund all set), naverPayloadMissing: []
- thumbnailAssessed: true, thumbnailPass: true, thumbnailViolations: []
- publishReady: FALSE

Interpretation (honest, no fabrication):
- publishReady=false is NOT a data gap. The engine sets publishReady=true only for a fresh register (status===DRAFT && naverProductId===null), per the route comment. Myeonghwa is already ACTIVE with a naverProductId, so the fresh-register flag is correctly off.
- Every content/policy readiness dimension is green. Data readiness is fully complete (prior S-grade state re-confirmed in production).
- Remaining (unchanged): the pending Myeonghwa action is a full-replace PUT (update), gated by #46 (operator GO, irreversible Naver write) + seed-planting (씨앗심기) backfill for net-margin validation (#124). dryRun confirms data completeness; it does NOT release that gate.

What this proves: all DB-backed readiness fields complete on prod + dryRun endpoint 200 + verdict green.
What it does NOT prove: actual Naver full-replace PUT success (live API, gated), and seed-planting margin validation (separate, still pending).

---

## 4. Principles added this session (Code persisted #137-#139)

- #137 Per-item action density -> overflow kebab standard (crawl row and studio asset tile share OverflowMenu; basis NN/G + PatternFly).
- #138 Large refactors split into verifiable stages (build structure first -> live verify -> operator review -> derive detail).
- #139 When verified-but-uncommitted assets pile up, commit/deploy BEFORE starting a large work item (shrink blast radius = commit-first).

---

## 5. Next actions + dependency map

INDEPENDENT (no cross-lane dependency):
- [Code] docs updates rev25 + #137-139: DONE.
- [Desktop] Myeonghwa prod dryRun: DONE (this doc). English handoff: DONE (this file).
- [Operator] seed-planting backfill for Myeonghwa: parallel, independent.

COMMIT-FIRST (in progress, [Code block 2]):
- [Operator] stop dev (Ctrl+C on next dev) -> [Code] rm -rf .next && npm run build (build0) -> commit + push verified redesign + C-IA-5TAB + docs -> Vercel deploy (~2min) -> [Operator] restart dev -> [Desktop] prod re-verify redesign+IA.

STUDIO REFACTOR (after commit-first deploy):
- [Code] STUDIO-RF-S1 build (shell/relocate only, #132, product-agnostic #55): panel internal scroll; asset clean-thumbnail + hover toolbar + kebab + multi-select (reuse OverflowMenu); stepper gates inspector + asset filter; tsc --noEmit 0 (dev up, no build #136).
- [Desktop] STUDIO-RF-S1 e2e desktop + mobile (real browser DOM, #45/#88) -> operator live review -> derive S2 detail (#138).
- [Operator] stop dev -> [Code] build0 -> commit + push -> deploy -> [Desktop] prod re-verify. Then S2 -> S3 same cycle.

GATED / LOCKED:
- Myeonghwa publish PUT <- seed-planting backfill + operator GO (#46/#124).
- C5 (adaptive) / D3 (other products) / registry-storage reconcile <- AFTER Myeonghwa publish (#124 lock). product-agnostic refactor does not conflict with this lock.

---

## 6. Key files

- Research KO: docs/research/STUDIO_REFACTOR_RESEARCH_KO_2026-06-23.md
- dryRun endpoint: src/app/api/products/[id]/publish-readiness/route.ts (single) + src/app/api/products/publish-readiness/route.ts (batch, DRAFT-only)
- dryRun verdict logic: src/lib/automation/load-publish-readiness.ts + src/lib/automation/publish-readiness.ts
- Naver real register (POST, do not auto-trigger #46): src/app/api/naver/register/route.ts
- Studio refactor targets (NOT yet changed): src/components/studio/atelier/AtelierShell.tsx (grid 1087px), src/components/studio/AssetBrowser.tsx (per-asset 4-icon density = main defect), src/app/studio/page.tsx (STEP_STAGES 4-step), src/components/common/OverflowMenu.tsx (reuse for asset tiles).
- Verified prior (this day): src/app/products/new/page.tsx (C-IA-5TAB 5 tabs, sticky save bar, SEO consolidation) + src/app/products/[id]/edit/page.tsx (redirect ?edit=, #135).
- Trackers: docs/plan/PARALLEL_WORK_TRACKER.md (rev25), docs/plan/PRINCIPLES_LEARNED.md (#137-139), PROGRESS.md (~1474 lines, split soon), SESSION_LOG.md, ROADMAP.md, TASK_BRIDGE.md.

---

## 7. Gate summary (this session)

docs only - code change 0 - tsc N/A - Naver PUT 0 - SD-01 untouched - dryRun read-only (no mutation) - all measurements on production (real, not reconstructed).
