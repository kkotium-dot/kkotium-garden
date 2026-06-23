# HANDOFF 2026-06-24 - Studio Stage2 S2-A verified (prod) + S2-A.1 brand-reskin in progress

Target Session: DESKTOP (authored) -> CODE-CLI (S2-A.1 build) + DESKTOP (S2-A.1 e2e)
Branch: main · prod baseline = 68cb6e1 (S2-A live, verified)
Scope: docs/handoff continuity record. SD-01 untouched. No Naver PUT. #132 (relocate/skin only, logic unchanged).

---

## 1. Where we are

Studio refactor is staged (#138): Stage1 (structure, prod a2d70b2/f0493f1) -> Stage2 (operator's PDF/ui.tsx vision).
Stage2 sub-stages: S2-A shell+dual-sidebar+tokens+responsive (DONE, prod 68cb6e1) -> S2-A.1 brand reskin (IN PROGRESS) -> S2-B center cleansing -> S2-C step-sync forms + traffic-light + font + Kkotti copy -> S2-D hover Firefly + assembly slots.

Operator design constraints (locked):
- Colors: --brand-red #E62310 (action/active, ~10%), --pink-soft #FFCCEA (tint/badge/decorative), --cream #FAF8F3 (canvas). Defined in globals.css.
- Font: Pretendard body (kept). App ALSO already loads Poppins + Noto Serif KR (--font-display). So non-Pretendard fonts work; a brand display font (e.g. Cafe24 Ssurround / Gmarket Sans) can be added in S2-C. Operator pick pending; does NOT block layout work.
- Responsive: window-shrink must NOT let text escape boxes (operator-reported bug). Root cause measured = no truncate/break anywhere + bare 1fr grids. Fixed via #144.

---

## 2. S2-A — DESKTOP prod e2e (68cb6e1) = PASS (independent, #45)

Verified live on production via DOM probes (Control Chrome) + Vercel deploy confirm:
- Deploy 68cb6e1 READY (Vercel independent confirm).
- Dual-sidebar: icon rail 64px + panel 384px; tabs 창고/배양실/일지.
- Tab switch (live click): 창고 -> 배양실 active flip + panel content swap (배양실 placeholder with Kkotti-tone copy).
- Collapse (live click): re-click active icon folds the panel; workspace expands to ~896px.
- Brand tokens resolve + apply: --brand-red #e62310, --pink-soft #ffccea, --cream #faf8f3.
- #144 hardening ACTIVE on prod: document overflow-x:hidden + max-width:100vw guard, word-break:keep-all (2503 els), text-overflow:ellipsis (67 els), min-width:0 (2032 els), sidebar labels truncate.
- 4-page regression (global main bounded): /studio, /dashboard, /products/new, /crawl all horizontalOverflow=0, no 500, main vertical scroll OK (dashboard scrollH 5516 > clientH 2615).

Static code verify (read source, matched report 100%): AtelierShell.tsx (flex-fill, dual-sidebar, collapse, tokens, inline truncation, #140 class-only mobile block, footer/SD-01 untouched); layout.tsx (height:100vh overflow:hidden + main flex-1 minHeight:0 overflowY:auto + minWidth:0); globals.css tokens; PRINCIPLES_LEARNED #142/#143/#144; tracker rev27.

### Honest gap (NOT faked)
Live NARROW-WIDTH visual reproduction (1024/375) was NOT done by Desktop:
- iframe technique blocked by prod X-Frame-Options/CSP (SecurityError on same-origin frame access).
- Control Chrome controller cannot resize the OS window.
So the responsive FIX is proven DEPLOYED & ACTIVE (truncation/guards live in rendered bundle) but not visually rendered at 375px by Desktop. Resolution options: operator 30s visual check (drag window narrow), OR Desktop uses a resize-capable controller (Claude in Chrome resize_window) on the next pass.

---

## 3. Brand-color half-application finding (DOM-measured) -> S2-A.1

Operator observed colors looked applied only on the new left sidebar. Confirmed by region-level DOM color probe on prod 68cb6e1:
- Left rail: bg #FFCCEA, text #E62310 -> branded OK.
- Asset browser panel: card borders = gray-200 (rgb 229,231,235, 8 occurrences) + legacy kk-pink-50 -> NOT branded.
- Center workspace: brand-red present (10) but dominant borders = gp-pink-100 / kk-pink-200 (rgb 255,179,206, 22) -> mixed legacy (old layout).
- Right tower: gp-pink + semantic traffic-light (amber/red) -> tints legacy, signal colors correct to keep.

Root: S2-A defined the canonical tokens + applied them in the NEW shell only; existing inner components (AssetBrowser cards, center step cards, ControlTower) were not retrofit. The S2-A spec said "replace generic pink everywhere" but that was not split into a sub-stage, so it landed shell-only. Owned by Desktop (spec ambiguity).
Extra systemic find (#62): asset-card gray borders survive because globals.css gray override only covers background + text, NOT border-gray-* classes -> needs a global border override rule.

### S2-A.1 scope (Code, IN PROGRESS)
1. AssetBrowser cards: border gray-200 -> var(--color-border); plus GLOBAL globals.css rule border-gray-*/stone-* -> brand border (#62 root fix).
2. Center step cards + tower surfaces: legacy kk-pink-50/200 -> --pink-soft / --gp-pink-*; keep traffic-light semantic colors literal (#142).
3. Generic pink badges/labels -> tokens. Verify: studio shows no legacy pink / gray border outside brand tokens.
4. tsc 0 (no build while dev up, #136).
Proposed principle #145: app-wide color overrides must cover border (not just bg/text); a single-source token reskin must enumerate all inner components, not just the new shell.

---

## 4. Stage 2 remaining (after S2-A.1)

- S2-B center cleansing (#142): move heavy forms (Firefly prompt, mood camera, AI diagnosis, detail template/copy, background select, 9-slot) OUT of center -> left 배양실 (Generator) tab, step-synced. Center keeps preview + detail assembly slots (up/down/delete) + Kkotti bubble only. Enforce #144 down to form-field level (long prompt text truncate/break/min-w-0).
- S2-C: 배양실 step-synced forms (Step1 thumbnail/mood, Step2 detail+copy, Step3 SEO, Step4 publish) + traffic-light StatusCards (emerald/amber/red + 개화도) + brand display font + Kkotti microcopy.
- S2-D: center image hover glassmorphism (Kkotti AI 누끼/합성 — trigger EXISTING Adobe/Firefly actions only, #132) + detail assembly slots; natural verification of asset-tile hover/kebab (#2) + kebab clipping (#4).

---

## 5. Dependency / independent

- S2-A.1 build = Code (in progress). S2-A.1 e2e = Desktop (after deploy).
- This handoff + (Korean) tracker rev28/#145 = independent docs (tracker/principles are Code Python-overwrite per #29b).
- narrow visual repro = Desktop (resize controller) or operator 30s check — independent of S2-A.1.
- Font pick = operator, parallel (applied S2-C).
- Myeonghwa seed-planting backfill = operator, independent/parallel (unblocks publish -> D3/C5/reconcile per #124).
- LOCKED: Myeonghwa publish PUT <- backfill + status-reconcile + operator GO (#46/#124); C26(a) reconcile <- GO; D3/C5-expand <- after publish (#124).
- Stage2 is product-agnostic + #132 -> no conflict with the #124 publish lock (parallel OK).

---

## 6. Key files

- Studio: src/components/studio/atelier/AtelierShell.tsx (shell, dual-sidebar, collapse), src/app/studio/page.tsx (sidebarTabs wiring), src/components/studio/atelier/ControlTower.tsx (#3 step-gated tower), src/components/studio/AssetBrowser.tsx (+ .strings.ko.json) (S2-A.1 reskin target), src/components/common/OverflowMenu.tsx (shared kebab).
- Global: src/app/layout.tsx (flex-fill main), src/app/globals.css (tokens + gray/border overrides — S2-A.1 border rule target).
- Docs: docs/design/STUDIO_UI_UX_GUIDELINES.md (authority), docs/plan/PARALLEL_WORK_TRACKER.md (rev27 -> rev28), docs/plan/PRINCIPLES_LEARNED.md (#142/#143/#144 -> #145), docs/plan/PROGRESS.md (~1474, split near #31).
- Prior handoffs: docs/handoff/HANDOFF_2026-06-23_studio-refactor-spec-and-dryrun-reconfirm.md, HANDOFF_2026-06-23_studio-stage1-built-hotfixed-verified.md.

---

## 7. Gate summary

S2-A prod-verified PASS (dual-sidebar, tab/collapse, tokens, #144 active, 4-page regression). Narrow visual = honest gap (controller limit), fix proven deployed. Brand color was shell-only -> S2-A.1 reskin in progress (asset cards gray border + legacy pinks -> tokens; global border override #62). Then S2-B center cleansing -> S2-C forms/traffic-light/font/copy -> S2-D hover Firefly. No Naver PUT. SD-01 untouched. #124 publish lock unaffected (parallel).
