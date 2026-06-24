# DESIGN BRIEF 2026-06-24 (rev5) - Plant/Crawl refine VERIFIED + Studio S2-B LOCKED

Authoring: DESKTOP (design authority) -> CODE-CLI implements. SD-01 untouched. #132 (UI/structure only). #135 (create+edit shared). #147 (anti-over-build).
Baseline: main / prod 80c355c. 

================================================================
## STATUS (all P1 axes DONE)
================================================================
- P1-a 4-tab IA (fb7fd8d) PASS.
- P1-c CRAWL grid (baa8a3c) PASS.
- P1-e PLANT Tower simplify + top save-bar (3474d3d) -> Desktop e2e PASS (E1-E7 + binding live).
- P1-d CRAWL refine + D4 OverflowMenu portal (1e65c20) -> Desktop e2e PASS (D1-D5; D4 portal z9999/document.body; D5 bottom bar).
- P1-a REFINE ③ 통일형 (a9f917a P1-a.1 + fc8d206 P1-a.2) -> Desktop e2e PASS w/ ONE honest gap (see below).

================================================================
## P1-a REFINE - VERIFIED on prod 80c355c (Desktop live DOM)
================================================================
PASS:
- USection unify: 카테고리 (folder-tree icon) / 상품명 (type icon) headers = icon+title, NO number badge (digitBadge null), neutral border rgb(228,223,212)=#E4DFD4, radius 16. Delegation applies to all sections across 4 tabs.
- No legacy form number badges. (The two brand-red "2" pills found = LEFT NAV count badges - 꿀통 꽃나들이 / 정원 창고 - not form chrome. Benign.)
- 기본정보 ORDER exact: 가격 -> 플랫폼·공급사 -> 상품코드 -> 브랜드·원산지·수입사 -> 대체상품 -> 옵션 (OptionManager LAST). Verified by top-coordinate sort.
- #135 edit parity: /products/new?edit=cmpnooli40001f0gveaxr8iim prefills 명화 name. 500/overflow 0.

HONEST GAP - #137 platform/supplier ITEM kebab NOT click-exercised:
- In create mode nothing is selected (no item row -> no kebab, expected). In edit (명화) platform/supplier render as "플랫폼 선택 / 공급사 선택" placeholders (no selected item row). Driving the platform dropdown ("도매매 DMM / 오너클랜 OWC" overlay opened, z9999) to click an option and materialize the selected-item row did NOT succeed via DOM probes (option click target resisted selectors). 
- Indirect confidence HIGH: #137 reuses the SAME shared portal OverflowMenu verified click-working in /crawl (D4: portal/fixed/z9999/not-clipped); Code converted edit/delete -> that component verbatim, tsc0/build0.
- ACTION: operator 10-sec spot-check (기본정보 -> 플랫폼 선택 -> 도매매 -> click the added row's kebab -> confirm 수정/삭제 popup, not clipped) OR Desktop retries next turn with deliberate selection drive. NOT claimed as verified.

================================================================
## ★ NEXT - Studio S2-B center cleansing : LOCKED scope (parallel, independent route)
================================================================
Route /studio (AtelierShell dual-sidebar). Independent of products/new. #124-safe. #132 (relocate/skin only - NO new generation features, NO logic change). #147-safe (bounded to relocation; no new score/hero/wrapper layers).

STAGE SPLIT (#138):
S2-B.1 (relocation skeleton):
- MOVE the heavy input forms OUT of the center canvas INTO the LEFT 배양실 panel: Firefly prompt composer, mood->camera spec, AI diagnosis, detail-template picker, background select.
- CENTER canvas becomes: live preview area + assembly slot placeholders (static stubs for now) + 꼬띠 guide bubble (microcopy).
- Keep all existing handlers/state wiring intact - only relocate the JSX + reparent (#132). No slot-filling logic yet (that is S2-D/Phase 3).
- Apply #144 (truncate/min-w-0/flex-fill) down to relocated form-field level.
S2-B.2 (behavior polish):
- 배양실 step-sync reveal (each step surfaces its relevant relocated form), traffic-light StatusCards, 꼬띠 microcopy pass, brand display font decision (operator: Cafe24 Ssurround vs Gmarket Sans - pending, non-blocking for .1).

GUARDRAILS: SD-01 footer never touched. If center preview needs a data source, stub it - do not wire new backend. Verifiable stage commits.

================================================================
## VERIFICATION PLAN (Desktop)
================================================================
- S2-B.1: heavy forms relocated center->left 배양실; center = preview + stub slots + 꼬띠 bubble; existing form bindings still live; #144 field-level; 500/overflow 0. (Desktop will baseline-probe current /studio at deploy.)
- #137 retry: drive platform/supplier selection to materialize item-row kebab; confirm portal 수정/삭제 not clipped.
- Narrow 1024/375: only when a resize-capable tool is available (do NOT fabricate).

================================================================
## BACKLOG / LATER (unchanged)
================================================================
- CR-1: 예상마진율 ~13% cluster -> market-price basis (operator approval).
- #146: ProductLifecycle/LowStockAlert inline #e5e7eb borders -> tokenize.
- Myeonghwa seed-planting backfill (operator) -> unblocks publish #124.
- Myeonghwa publish PUT <- backfill + status-reconcile + operator GO (irreversible #46/#124).

================================================================
## PRINCIPLES
================================================================
- #147 (enshrined): inventory existing functions before adding hero/score/collapse layers; reorder+light polish first; broad change only after operator confirm.
- NEW (propose #148): Desktop verification must distinguish GLOBAL chrome (nav count badges, persistent header) from the FEATURE under test - classify by ancestor (aside/nav) before flagging a regression, to avoid false alarms. And when a UI sub-state cannot be driven via DOM probes, report the gap honestly + route to operator spot-check; never infer a pass.
- SD-01 Arabic footer: never touch.
