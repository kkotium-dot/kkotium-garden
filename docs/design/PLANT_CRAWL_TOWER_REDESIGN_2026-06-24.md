# DESIGN BRIEF 2026-06-24 (rev2) - Plant (products/new) IA v2 + Tower panel refine + Crawl grid v2

Authoring lane: DESKTOP (design authority) -> CODE-CLI implements. Operator-confirmed direction (rev2 = operator correction).
Branch baseline: main / prod eab6f65 (S2-A.1 live; S2-A.2 push-pending). SD-01 untouched. #132 (relocate/restructure UI; backend logic unchanged). #135 (propagate to BOTH /products/new create AND edit route via shared components).
NOTE: operator reference screenshots are ILLUSTRATIVE ONLY (vibe), NOT pixel targets.

================================================================
## 0. LOCKED DECISIONS
================================================================
- D-BORDER: default/structural borders = NEUTRAL warm-gray (cream-derived), NOT soft-pink. Brand pink for accents/cards only. (Operator decided "neutral"; resolves S2-A.2 item (4).)
- D-ATTR-MOVE: brand, origin/origin-country, importer, alternative-product management MOVE from Policy tab INTO Basic-Info (they are product attributes, not shipping).
- D-NAME-DEDUP: product-name exists ONCE (in the SEO tab).
- D-CATEGORY-IN-SEO: category lives in the SEO/Search tab (it drives keyword/SEO recommendations), NOT Basic-Info.
- D-PRICE-IN-BASIC: sale price lives in Basic-Info. The separate Price/Margin tab is DISSOLVED. Margin calculation stays in the right Tower panel (precision margin calculator already there).
- D-4TAB: Plant is now 4 tabs (was 5).
- D-TOWER-PRESERVE: Tower keeps ALL existing functions - do NOT remove features. Only refine UI/UX structure (hierarchy, grouping, spacing, sleekness).

================================================================
## 1. PLANT (products/new) - 4-TAB IA v2 (operator-confirmed)
================================================================
1. SEO SEARCH OPTIMIZATION  [FRONT]
   - category, product-name (single source), seller tags, keywords, SEO hook
   - drives the Tower SEO score live
2. BASIC INFO
   - sale price, platform, supplier(domae), product code
   - + brand, origin/origin-country, importer, alternative-product management  (moved in from Policy)
   - + OPTIONS block (folded in)
   - (note: wholesale/supply price sits here too as the price pair with sale price; margin calc is in Tower)
3. IMAGE
   - representative/detail images (or link to Onsil Atelier studio)
4. SHIPPING POLICY (pure shipping)
   - delivery fee, return/exchange, shipping template, return-care
   - rendered EXPANDED with the same section-card structure as other tabs (no all-collapsed)

### Cross-cutting Plant fixes (operator said "the rest is fine")
- BLOCK UNIFY: every tab uses ONE consistent section-card pattern (header + body + helper), same padding/radius/neutral border.
- SAVE BAR: remove per-section scattered save buttons -> ONE clean persistent action bar (primary [DB save + Excel convert]; secondary [temp save / Ctrl+S]; Naver-Excel / direct-register in overflow kebab #137).
- POLICY UNCOLLAPSE: shipping fields expanded.
- #135: all land in SHARED components so create AND edit (?edit=) change together.
- #144 at field level: long inputs/tags truncate/break/min-w-0.

================================================================
## 2. TOWER (right panel of products/new) - REFINE (keep all functions)
================================================================
KEEP every existing function: Kkotti realtime diagnosis, SEO top-exposure score, expected real-margin (ROI), golden-keyword & tag diagnosis, precision margin calculator, Excel-mapping checklist. DO NOT delete features.
REFINE structure only:
- HERO METRICS at top (always visible): SEO top-exposure probability (0-100 + gauge + weakest-lever one-liner) and real-margin rate (% + gauge). These two are the anchor; everything else sits below.
- Group the diagnostic functions into a clean, consistent collapsible card system (keyword/tag diagnosis, precision margin calculator, Excel-mapping checklist) - each card sleek, one clear CTA, tight spacing, tabular numerals.
- Naver-first SEO signal chips (name length 20-50, brand inclusion, seller tags target 10, category match, keyword density) update live as fields fill.
- Data-panel aesthetic; semantic green/amber/red for status only; neutral borders. No feature removed - this is a visual/structure elevation, not a teardown.

================================================================
## 3. CRAWL (Honey-pot flower-outing /crawl) - HIGH-DENSITY GRID v2  (unchanged from rev1; operator OK)
================================================================
1. HIGH-DENSITY DATA GRID (SaaS table): remove large red/green per-card buttons -> ONE right-aligned smart action per row. Columns L->R: [checkbox][product info + tags][wholesale price][margin rate + mini gauge][action].
2. ROI-CENTRIC: expected margin-rate % + mini gauge next to wholesale price; 40%+ highlighted.
3. CONTEXT-AWARE SMART ACTION: sourcing-done -> black [> seed-plant]; pending-register -> red [continue work]; register-done -> faint gray [view store].
4. REMOVE LARGE STATUS BOX: absorb counts into tab badges (All / Sourcing-done / Pending / Register-done). Reclaimed vertical space = more rows.
Desktop proactive adds: default sort margin-rate DESC; sortable columns; sticky bulk seed-plant bar on selection; density toggle (compact/comfortable); row hover quick-preview; keyboard nav (j/k/Enter); stock+supplier as muted secondary text under name.

================================================================
## 4. STAGING + PRIORITY (parallel board)
================================================================
Operator priority: improve Plant + Crawl BEFORE Myeonghwa seed-planting backfill.
- P0 S2-A.2 (Code, DONE-local, PUSH-PENDING): StatusBadge neutral semantic token (inactive "not-applied" no longer pink); SourcingRecommendWidget inline border -> token; asset-card header #144. PLUS now D-BORDER neutral default border (item 4, operator decided neutral) - bundle into the same commit before push.
  Backlog #146: ProductLifecycle / LowStockAlert still have inline #e5e7eb gray borders (same inline blind spot) -> next sweep.
- P1 PLANT-IA-v2 (sec 1, 4 tabs) + TOWER-refine (sec 2) - Code, shared components (#135).
- P1 CRAWL-GRID-v2 (sec 3) - Code (independent route, parallel).
- P2 Studio S2-B center cleansing (different route; interleave).
- LATER Myeonghwa seed-planting backfill (operator; unblocks publish #124) - after UX.
- #124 Myeonghwa publish lock unaffected (parallel).

### Dependencies
- S2-A.2 push -> deploy -> Desktop live e2e (CANNOT verify before deploy; do not fabricate).
- PLANT-IA-v2 + TOWER touch /products/new -> propagate to edit route (#135).
- All redesigns consume S2-A.2 neutral/brand tokens (no legacy pink/gray reintroduction).
- CRAWL-GRID-v2 independent of Plant/Tower.

================================================================
## 5. VERIFICATION PLAN (Desktop, after each Code deploy)
================================================================
- S2-A.2: inactive badge neutral (not pink), asset-card header overflow 0, SourcingRecommend brand border, neutral default border app-wide, 4-page overflow 0 / no 500.
- PLANT-IA-v2: 4 tabs in order (SEO / Basic / Image / Shipping), single product-name (dedup), category in SEO tab, sale price + platform + supplier + product-code + brand/origin/importer/alt-product + options in Basic, shipping expanded, single save bar, edit-route parity (#135), neutral borders.
- TOWER: all functions present (none removed), hero metrics live-update, CTA wiring, sleek structure.
- CRAWL: grid columns, margin gauge, context-aware action per state, tab badge counts, density.
- Narrow (1024/375): only once a resize-capable tool is available (iframe blocked; current controller cannot resize OS window - do NOT fabricate).

================================================================
## 6. CARRIED CONTEXT
================================================================
- S2-A.1 (prod eab6f65) Desktop e2e: gray borders eliminated (studio + products/new 0); brand sweep; semantic retained; 4-page no 500 / overflow 0. CORE PASS.
- Principles: #145 (color override must cover border + enumerate inner components); #146 (global color override is class-only; inline/arbitrary styles are blind spots; semantic-neutral colors excluded from brand sweep).
- SD-01 Arabic footer: never touch.
