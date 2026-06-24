# DESIGN BRIEF 2026-06-24 (rev4) - Plant + Crawl REFINEMENT round (operator annotated screenshots)

Authoring: DESKTOP (design authority) -> CODE-CLI implements. Operator-confirmed via 2 annotated screenshots + greenlight.
Baseline: main / prod 04ca748 (P1-a/b/c/d/e live). SD-01 untouched. #132 (UI/structure; backend logic unchanged). #135 (create+edit shared - products/new). #147 (anti-over-build). Screenshots = explanation aids only.

================================================================
## STATUS
================================================================
- P1-a PLANT 4-tab IA (fb7fd8d) PASS.
- P1-b TOWER hero+chips+TowerSection (f887a0e) -> REVERTED by P1-e (operator: redundant over-build).
- P1-c CRAWL grid (baa8a3c) PASS.
- P1-e PLANT Tower simplify + top save-bar (3474d3d) -> Desktop e2e PASS (E1-E7 + binding live + 500/overflow 0).
- P1-d CRAWL refine + D4 OverflowMenu portal (1e65c20) -> Desktop e2e PASS (D1-D5; D4 portal fixed z9999/document.body/in-viewport; D5 bottom bar on selection).
- P1-a REFINE -> LOCKED ③ 통일형 (below). Operator greenlit 2026-06-24.

================================================================
## P1-e  (verified PASS - reference)
================================================================
E1 hero removed. E2 TowerSection wrapper removed (flat, no double-collapse). E3 5 SEO chips removed (dup of SEO 점수 상세). E4 SEO 검색최적화 점수 directly under 꿀통지수, both top. E5 all real functions flat (꿀통지수/SEO점수/실전마진/마진어드바이저/AI SEO/업로드준비도/엑셀매핑) + tabular-nums. E6 top sticky save bar (임시저장/DB저장/네이버엑셀·직접등록 in overflow); bottom bar removed. E7 "저장 후 온실 아틀리에" = 이미지 tab primary CTA only.

================================================================
## P1-d  (verified PASS - reference)
================================================================
D1 two-row header (title+badges / 공급사+검색+초기화 edge-aligned). D2 density toggle removed (single density rowPadY 9). D3 도매가/예상마진율 right-aligned (justifySelf:end + tabular). D4/#62 shared OverflowMenu -> createPortal(document.body) position:fixed z9999, rect-synced on scroll/resize (fixes clip+hide). D5 bulk registration bar -> fixed bottom-centered, on selection only.

================================================================
## ★ P1-a REFINE - LOCKED: canonical card = ③ "통일형" (USection)  [/products/new + edit via #135]
================================================================
Operator greenlit ③ 통일형. Unify ALL ~15 section blocks across the 4 tabs into ONE calm SaaS card pattern. Replaces the two legacy styles (RSection numbered-pink / DSection icon-accordion).

CANONICAL CARD SPEC (USection):
1. HEADER: one row = [small Lucide icon] + [title, font-semibold]. 
   - NO number badge (drop the 1/2/3 pink badges).
   - NO forced accordion/chevron. Body always visible by default.
   - Optional right-aligned minimal meta allowed (e.g. a small count or StatusBadge), kept subtle.
2. BODY: always visible. (A genuinely long/optional panel MAY collapse, but only ONE collapse mechanism and default-expanded - never a wrapper-on-wrapper double frame, per #147.)
3. BORDER: --border-neutral (#E4DFD4), rounded (match existing card radius), 1px. NO pink card borders.
4. SURFACE: white/cream card on the page bg. Consistent padding (align to existing card padding, ~p-4/p-5) and consistent inter-card gap.
5. BRAND PINK (#E62310): reserved for ACTIVE states, PRIMARY CTAs, required-field asterisks (*), active tab underline/fill - NOT card chrome/headers.
6. TYPO/NUMERICS: tabular-nums on any numeric display; titles consistent size/weight across all cards.
7. APPLY TO ALL section blocks across the 4 tabs:
   - [1 검색최적화]: 카테고리, 상품명, 셀러태그(SEO), SEO 훅문구
   - [2 기본정보]: 가격(판매가·도매가·즉시할인) , 플랫폼/공급사, 상품코드, 브랜드·원산지·수입사, 대체상품, 옵션
   - [3 이미지]: image sections
   - [4 배송 정책]: shipping/policy sections
   Result: every block reads as the same card; the page looks like one coherent system, not two mixed styles.

REORDER (브랜드 BEFORE 옵션) - within [2 기본정보]:
- Order identity-first: 가격 -> 플랫폼/공급사 -> 상품코드 -> 브랜드·원산지·수입사 -> 대체상품 -> 옵션 (OptionManager LAST).
- Rationale: brand/origin/importer are core product identity (and SEO/compliance critical); option matrix is bulky and belongs after identity is set.

#137 KEBAB (per-item action density -> overflow):
- Where a row/sub-item carries multiple secondary actions (e.g. 대체상품 rows, 옵션 rows, asset rows), collapse secondary actions into the shared OverflowMenu kebab (now portal-fixed from D4 - reuse it, do NOT build a new menu).
- Keep ONE primary action inline; everything secondary in the kebab. Consistent across the page.

GUARDRAILS:
- #132: structure/skin/reorder only - NO handler/logic/validation rewiring. All existing bindings (가격->마진, SEO 점수, category select, option CRUD) must remain live.
- #135: single shared component -> edit route (?edit=ID) inherits automatically. Verify parity.
- #147: this is the operator-confirmed broad unification - proceed; but do not ADD new score/hero/collapse layers, only unify the SHELL of existing blocks.
- #136: tsc --noEmit + build gate before commit. #138: if large, split into verifiable stages (e.g. P1-a.1 USection component + apply to tab1-2; P1-a.2 tab3-4 + reorder + #137).
- SD-01 footer: never touch.

================================================================
## PARALLEL - Studio S2-B center cleansing  [independent route - can run NOW alongside P1-a refine]
================================================================
Different route (/studio), no operator decision pending, #124-safe, #132. Move heavy forms (Firefly prompt / mood camera / AI diagnosis / detail template / bg select) from center -> left 배양실 step-sync; center = preview + assembly slots + 꼬띠 bubble; apply #144 down to form-field level. -> then S2-C (step-sync forms + traffic-light StatusCards + brand display font + 꼬띠 microcopy) -> S2-D (center hover Firefly 누끼/합성 existing-actions-only #132 + assembly slots).

================================================================
## VERIFICATION PLAN (Desktop, after each deploy)
================================================================
- P1-a refine: every section block uses USection (icon+title, no number badge, no forced accordion, neutral border); brand pink only on active/CTA/asterisk; 기본정보 order 브랜드 before 옵션 (OptionManager last); #137 secondary actions in kebab (reusing portal OverflowMenu); all bindings live; edit-route parity (#135); 500/overflow 0.
- S2-B: heavy forms relocated center->left step-sync; center = preview+slots+꼬띠; #144 field-level; 500/overflow 0.
- Narrow 1024/375: only when a resize-capable tool is available (iframe blocked; current controller cannot resize - do NOT fabricate).

================================================================
## BACKLOG / LATER
================================================================
- CR-1: 예상마진율 estimate clusters ~13% -> base on market price / realistic markup (operator approval).
- #146: ProductLifecycle/LowStockAlert inline #e5e7eb borders -> tokenize.
- Myeonghwa seed-planting backfill (operator) -> unblocks publish #124.
- Myeonghwa publish PUT <- backfill + status-reconcile + operator GO (irreversible #46/#124).

================================================================
## PRINCIPLES NOTE
================================================================
- #147 (enshrined): inventory existing functions before adding hero/score/collapse layers; prefer reorder + light polish; broad unification only after operator confirmation (now given for P1-a refine).
- SD-01 Arabic footer: never touch.
