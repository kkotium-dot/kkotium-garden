# DESIGN BRIEF 2026-06-24 (rev3) - Plant + Crawl REFINEMENT round (operator annotated screenshots)

Authoring: DESKTOP (design authority) -> CODE-CLI implements. Operator-confirmed via 2 annotated screenshots (reference vibe, not pixel targets).
Baseline: main / prod baa8a3c (P1-a/b/c live). SD-01 untouched. #132 (UI/structure; backend logic unchanged). #135 (create+edit shared - products/new). Screenshots = explanation aids only.

================================================================
## STATUS OF 3 P1 AXES (all live + Desktop-verified PASS)
================================================================
- P1-a PLANT 4-tab IA (fb7fd8d) PASS.
- P1-b TOWER hero+chips+TowerSection (f887a0e) PASS technically, but operator REJECTS the added layer as redundant -> see P1-e below (partial revert).
- P1-c CRAWL grid (baa8a3c) PASS -> refinements below (P1-d).

================================================================
## P1-e  PLANT right Tower SIMPLIFY + save-bar  (Image 2)  [priority - removes a disliked current state]
================================================================
Operator feedback: the P1-b additions DUPLICATE existing functions and made the panel messier. Correct the over-build.

E1. REMOVE hero 2-metric block (SEO top-exposure + real-margin). Reason: 꿀통지수(honey index = margin/ROI) and SEO 검색최적화 점수 already deliver these. Redundant.
E2. REMOVE the TowerSection collapsible wrapper (P1-b). It created a SECOND collapsible frame with the SAME title on top of panels that already had their own structure -> double-collapse mess. Render panels FLAT with their native structure.
E3. REMOVE the 5 SEO signal chips (name 20-50, brand, tags n/10, category, keyword density). Reason: duplicate the SEO 점수 상세 checklist (상품명 10자/20-50자/브랜드 포함/SEO 키워드/키워드 포함). Consolidate into the existing 점수 상세. (Desktop recommendation - operator may keep if wanted.)
E4. REORDER: place SEO 검색최적화 점수 DIRECTLY BELOW 꿀통지수, both at the TOP of the panel as the primary at-a-glance metrics (each card already shows its score prominently -> preserves "at a glance" WITHOUT the redundant hero).
E5. KEEP all real functions, flat: 꿀통지수 / SEO 검색최적화 점수 / 실전 마진 계산 / AI SEO 분석 / 엑셀 매핑 체크리스트. Keep neutral borders + tabular-nums polish (non-duplicative). NO feature removal beyond the redundant hero/chips/wrapper.
   Net effect: Tower returns close to pre-P1-b functional layout, reordered (SEO score under 꿀통지수) + light neutral polish, minus the redundant layer.

SAVE-BAR (Image 2 top):
E6. Pin the save line to TOP (sticky, always visible). Keep ONLY necessary saves: 임시저장 / DB 저장 / 네이버 엑셀 저장·직접등록.
E7. Move "저장 후 온실 아틀리에" OUT of the global bar -> show ONLY on the 이미지 tab (contextual). 
   Desktop proposal: on the 이미지 tab make "저장 후 온실 아틀리에" the PRIMARY contextual CTA (image work hands off to the studio), keeping the global top bar minimal elsewhere. (Operator invited better proposals.)

================================================================
## P1-d  CRAWL grid REFINE  (Image 1)  [independent route, parallel-safe]
================================================================
D1. FILTER/SEARCH ROW LAYOUT: align 공급사 전체 dropdown (currently top-right) + 상품명 검색 + 초기화(refresh) into ONE clean row; the two rows (filter badges row / search row) edge-aligned left&right (consistent gutters). Tidy two-row header.
D2. REMOVE density toggle (조밀/여유). Operator questions its necessity. Desktop call: a focused pipeline reads cleaner with ONE well-tuned density (compact-comfortable rows). Remove the control; re-add only if a real need appears.
D3. COLUMN ALIGNMENT: align table text to consistent gridlines - 상품정보 left; 도매가 / 예상마진율 right-aligned tabular-nums; status + action consistent column anchors. Header labels aligned to their column data.
D4. OVERFLOW MENU (kebab) POPOVER FIX [#62 SYSTEM - shared OverflowMenu]: in 스토어 보기(등록완료) rows the popover is hidden BEHIND the gray row bg (z-index) and is CLIPPED by the table container (overflow) so content is cut off. Fix: render the menu in a PORTAL above everything (high z-index) and not clipped by table/row overflow. Applies project-wide wherever OverflowMenu is used (products/new etc.).
D5. STICKY BOTTOM REGISTRATION BAR on selection: when >=1 product selected, a sticky bottom bar appears with the registration actions (등록 대기로 / 한 번에 임시등록 / 등록 시작). Ensure it floats at page bottom on selection and clears on deselect.

Carry from P1-c verification:
CR-1 (backlog): 예상마진율 estimate clusters ~13% (calcPrefillSalePrice conservative) -> 40%+ highlight never fires + weak sort discrimination. Suggest basing estimate on market price / realistic markup. (Separate from D1-D5; operator to approve.)

================================================================
## STAGING + PRIORITY
================================================================
- P1-e PLANT Tower simplify + save-bar (Code) -> removes the currently-disliked redundant layer. FIRST.
- P1-d CRAWL refine (Code) -> independent route, parallel-safe. Next/parallel.
- P1-a refine (block-unify RSection/DSection single card pattern, tab-internal order brand-before-option, #137 kebab) -> MERGE into P1-e (same page) or follow.
- Studio S2-B center cleansing -> P2 (different route, interleave).
- Myeonghwa seed-planting backfill (operator) -> after UX (unblocks publish #124).
- #124 publish lock unaffected.

Dependencies:
- P1-e + P1-a refine touch /products/new -> shared component -> auto-propagate to edit route (#135).
- P1-d independent of P1-e.
- D4 OverflowMenu fix is a shared-component change -> regression-check products/new + any other OverflowMenu users (#62).

================================================================
## VERIFICATION PLAN (Desktop, after each deploy)
================================================================
- P1-e: hero gone, chips gone, no double-collapse frames, SEO 점수 directly under 꿀통지수, all real panels present + flat, neutral borders; save bar pinned top with 임시/DB/네이버 only; 온실 아틀리에 ONLY on 이미지 tab; bindings still live (판매가->실마진/꿀통지수, SEO 점수 live); edit parity (#135); 500/overflow 0.
- P1-d: single aligned filter/search row + edge-aligned two rows; density toggle gone; column gridline alignment; OverflowMenu popover renders above+outside (not clipped/hidden) in 등록완료 rows AND on products/new; sticky bottom bar on selection; 500/overflow 0.
- Narrow 1024/375: only when a resize-capable tool is available (iframe blocked; current controller cannot resize - do NOT fabricate).

================================================================
## PRINCIPLES NOTE
================================================================
- New learning (propose #147): when "elevating" a panel, first inventory EXISTING functions - do not add a hero/score/collapse layer that duplicates existing scores/checklists/collapses. Over-building a data panel on top of working components creates duplicate-title clutter. Prefer reorder + light polish over new wrapper layers.
- SD-01 Arabic footer: never touch.
