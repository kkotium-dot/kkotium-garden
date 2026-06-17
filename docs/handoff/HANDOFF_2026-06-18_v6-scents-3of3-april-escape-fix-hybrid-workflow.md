# HANDOFF — v6 Scent Composites 3/3, April Escape Bug Fix, Korean-First Research, Hybrid Workflow

- Date: 2026-06-18 (KST)
- Lane: Desktop (MCP / verify / browser / docs)
- Branch: none
- Production HEAD: `ef44fe2` (prompt defects A+B fix, READY)
- Validation product: 명화 차량용 송풍구 디퓨저 (`cmpnooli40001f0gveaxr8iim`, naverProductId 13564133057), status = SUSPENSION (intentional — held at first publish for incomplete sales info)

---

## 1. v6 Scent Composites — 3/3 ACHIEVED & VERIFIED (card auto-dismissed)

Operator generated three v6 scent BACKGROUND cuts in Firefly (Nano Banana Pro, Portrait 3:4, 2K, grounding ON, no reference). All three are Path-C clean: clean empty upper third reserved for product compositing, NO bottle / container / product in frame. This is real-world proof that Code's defect-B fix works in actual generated output.

- 레몬유칼립 — ripe sun-yellow lemons + eucalyptus on travertine, warm golden morning light (fixes the prior "unripe + cold" critique). Path `composite/lemon-eucalyptus-morning-v6-*.png`.
- 에이프릴 후레쉬 — white linen + white/blue spring florals by a rainy window, airy high-key.
- 블랙체리 — deep-crimson cherries on dark walnut wood, golden-hour dusk, moody low-key.

All ingested via production `POST /api/products/{id}/ingest-firefly` (stage=composite, normalize ON → 0.747→0.8, output 1792x2240). Server-to-server bash urllib path (bypasses CORS / cross-tab).

### CRITICAL BUG CAUGHT BY VERIFICATION — April variant escape (now FIXED)
- Symptom: matrix `variant_composite` stuck at ratio 0.667 (2/3); `covered=[레몬유칼립, 에이프릴 후레쉰, 블랙체리]`, `missing=[에이프릴 후레쉬]`.
- Root cause: April was ingested under the WRONG variant string "에이프릴 후레쉰" (final char 쉰 = U+C270) instead of the DB option value "에이프릴 후레쉬" (쉬 = U+C26C). The Desktop unicode escape used `\uc270` (쉰) instead of `\uc26c` (쉬). This same wrong escape was used in the PRIOR session too, so April never matched — the "registered=True" response masked a silent coverage failure.
- Fix: re-ingested April with correct variant bytes `\xec\x97\x90\xec\x9d\xb4\xed\x94\x84\xeb\xa6\xb4 \xed\x9b\x84\xeb\xa0\x88\xec\x89\xac` (에이프릴 후레쉬). Matrix `variant_composite` entry count then dropped to 0 → coverage complete (3/3) → card removed from action queue.
- Lesson reinforced: #45 / #88 — never trust "registered=True"; verify coverage at the matrix (the same data the dashboard renders). Verification is what caught this; without it we would have falsely reported 3/3.

### Correct in-stock variant strings (DB-measured, #96)
`레몬유칼립` (\ub808\ubaac\uc720\uce7c\ub9bd) / `에이프릴 후레쉬` (\uc5d0\uc774\ud504\ub9b4 \ud6c4\ub808\uc26c) / `블랙체리` (\ube14\ub799\uccb4\ub9ac). 코튼 어라운드 = stock 0, excluded. Denominator = 3.

---

## 2. SYSTEM FINDING (#62 — fix project-wide, not single-product) — Ingest variant validation guard

The ingest endpoint accepts ANY `variant` string and registers it successfully even when it does NOT match any of the product's option values. A typo → silent registration → never counts toward coverage → "looks done but is 2/3." This is a class of silent error across ALL products, not a one-off.

PROPOSED GUARD (Code backlog, additive): in `ingest-firefly` route, when `stage='composite'` and `variant` is provided, validate `variant` against the product's in-stock `optionValues`. On mismatch: reject with a clear error (or accept but flag `variantUnmatched:true` in the response + surface a dashboard warning). Prevents the entire "registered but never counts" failure mode. Product-agnostic.

---

## 3. Code lane — Defects A + B DONE (commit ef44fe2), Desktop verification status

Code completed and prod-smoked both defects (paste-back received):
- Defect A (palette default): `MoodAxisData.palette` (6 English mood palettes) added; assembler fallback now `axis.palette` (never emits 'in natural'); empty `referenceAesthetic` clause dropped. Code prod smoke: 명화 9 slots, 'in natural' 0 occurrences; M6 = "deep muted tones with refined contrast".
- Defect B (bottle ambiguity, #86): playbook §4 four-scent prompts + composition line replaced "for a small bottle" with "clean empty negative space ... reserved for later product compositing, no bottle, no container, no product, no diffuser in frame"; `spec-data.ts` PRODUCT_MARGIN_BLOCK added (canonical). No negativePrompt field. repo "for a small bottle" residual = 0.

Desktop verification status:
- Defect B: VERIFIED via real-world output — all three v6 scent cuts have clean empty upper space, no drawn bottle. Confirms the no-bottle phrasing produces bottle-free backgrounds.
- Defect A: PENDING Desktop micro-check (#45) — confirm `/studio` image-tab slot prompts show NO 'in natural' and a real mood palette. The v6 backgrounds are operator-generated via Firefly (not engine-generated), so they do not exercise the engine palette path; defect A still needs a strategy-API / studio render check. Code's prod smoke says PASS; Desktop confirm outstanding.

---

## 4. Korean-First Reference Research — STRATEGY (validated with live Naver data)

Operator insight (correct): since we sell on Naver Smart Store (overwhelmingly Korean users), reference research must prioritize the Korean popular/trendy market, not global (Pinterest/Google = foreign-user-leaning). Validated with NaverSearch MCP:
- `search_shop "차량용 디퓨저"` (232,164 results): Korean commerce conventions — "명품/고급" framing pervasive (even at 11,600원), 무광블랙/다크메탈/가죽/실버/리본포장 premium-dark-objet + 선물 framing; scents include 블랙체리 (validated, 2 listings), 히노끼/피톤치드/포레스트가든/White Cotton/호텔향; price band 8,900~75,000 (명화 14,300 = value-premium).
- `datalab_search`: **차량용 방향제 (index 60~100, dominant) >> 차량용 디퓨저 (5~9) >> 송풍구 방향제 (1~5)**. Caveat: relative search interest, not sales.

KEY DESIGN PRINCIPLE — two distinct axes:
1. Commerce convention (click + conversion) → main thumbnail composition, 명품/고급 framing, gift framing, golden keywords → KOREAN-FIRST is mandatory.
2. Mood / aesthetic quality bar → scent backgrounds / detail mood → global (Pinterest) acceptable as a supplement.

Source priority tiers (product-agnostic):
- T1 Korean commerce truth: Naver Shopping top-ranked (the ranking we compete in), 쿠팡, 올리브영 (fragrance/beauty trendy visuals), 오늘의집 (home/diffuser lifestyle — core for this category), 29CM/W컨셉 (premium aesthetic).
- T2 Korean trend/discovery: Naver DataLab (volume/season/trendiness + SEO), Naver blog/influencer, Instagram Korean hashtags.
- T3 Global mood supplement: Pinterest, Google Images (quality bar only, NOT commerce convention).

NaverSearch MCP (PlayMCP) = ready-made Tier-1 engine: `search_shop`, `search_image`, `datalab_search` / `datalab_shopping_*`, `find_category`. No new infra needed.

PROACTIVE FINDING (SEO golden-keyword): 명화 product name "선물 본품리필 가벼운 명화 송풍구 방향제" is MISSING the #1 search keyword "차량용" and uses the niche "송풍구 방향제". This is the cause of the "상품명 67 (B)" score. → New product-agnostic guard: validate every product name/tags against datalab search volume; surface a "상품명 키워드 검증" intervention card when the category's #1 keyword is absent.

---

## 5. Hybrid Sourcing <-> Design Workflow — PROPOSAL (Info-Dependency Design Gate + Pre-gen Asset Pool)

Operator question: design in 온실아틀리에 is most useful AFTER sourcing (product info available), but sometimes image generation must happen first. How to run a hybrid naturally?

Answer — split design artifacts by their dependency on product info; gate non-blockingly:
- Info-free (can run anytime, even pre-sourcing): scent/mood backgrounds (what we just made), generic lifestyle, brand-aesthetic exploration. Concept-driven, not data-driven. Batch-generate early and PARK them in a pre-gen asset pool.
- Info-bound (gated on sourcing): main thumbnail (needs category convention + SEO #1 keyword + price/gift framing), detail hero/spec (needs options/material/cert/origin), variant representative cut binding (needs confirmed option values — exactly why we could not ingest variant cuts until options were confirmed).

Mechanism (natural, #56 — no forced order, no modal):
- Add a "Design Readiness" lane to 온실아틀리에: per design artifact, show required info -> satisfied / waiting.
- Info-free artifacts: always "generatable" -> stored in the pre-gen pool.
- Info-bound artifacts: auto-activate as the required sourcing fields fill in (surface naturally, never block).
- Bidirectional binding: a pre-generated mood background can later be BOUND to a sourced product's variant/thumbnail — this is exactly the variant binding our ingest endpoint already does, generalized.
- Recommended default flow: sourcing -> (info-bound auto-activates) -> design; but info-free runs in parallel ahead of time = the hybrid.

Code backlog hints: add `infoDependency` metadata to engine slot/strategy (required product fields per artifact); 온실아틀리에 readiness display + pre-gen pool (unbound assets) + bind action. Generalize the ingest `variant` binding as the binding primitive.

---

## 6. Cleanup backlog (non-blocking)
- Archive 2 orphan April composites bound to wrong variant "에이프릴 후레쉰" (from prior session + this session's first attempt).
- Archive old unripe v5 lemon composite (superseded by v6 ripe-warm).
- Orphaned `lifestyle/` assets (2, May 2026) + obsolete AI-redrawn composites.
- Duplicate `route 2.ts` (needs operator GO for deletion).

---

## 7. Next actions (priority schedule)
1. [Code] Continue E5 (per-scent concept injection + wire PRODUCT_MARGIN_BLOCK into scent slots) -> E6 (assetization closed loop) -> P2 (firefly_auto subchecks + option 3-representation consistency). Operator delivers Code results sequentially.
2. [Code, new from this session] Ingest variant validation guard (#62, section 2 above) — small, high-value, prevents silent coverage failures across all products.
3. [Code, backlog] E8 v2 benchmark vision research (Korean-first source tiers + NaverSearch Tier-1 adapter + benchmarkDna expansion) + SEO golden-keyword guard + infoDependency meta + 온실아틀리에 design-readiness lane + pre-gen asset pool. After E5/E6.
4. [Code, GATE] E7 engine consolidation (retire System1 prompt route). Needs explicit operator/Desktop GO. After E5/E6.
5. [Desktop, micro] Verify defect A on /studio (slot prompts no 'in natural' + real palette) — strategy API or studio render.
6. [Desktop, cleanup] Archive orphan April (후레쉰) + old unripe v5 lemon composites.
7. [Operator, irreversible #46] 명화 publish resume — gate: images 3/3 (DONE) + thumbnail (Korean 명품 convention) + product name "차량용" added + Cotton (stock 0) option decision + sales-info completion -> GO.

---

## 8. FOR CODE CLI — Korean tracker updates (Code domain: Python full-file overwrite, NOT edit_file)
Update these LIVE trackers to reflect this session (Korean-heavy -> Code Python overwrite per #41):
- PARALLEL_WORK_TRACKER.md: v6 scents 3/3 DONE (with april escape fix note); add ingest variant validation guard (#62) + E8 v2 + SEO guard + infoDependency/design-readiness + pre-gen pool to backlog.
- PROGRESS.md: 명화 variant_composite 3/3 LIVE; defect A/B LIVE (ef44fe2).
- PRINCIPLES_LEARNED.md: add — (a) ingest variant must exactly match DB option value or coverage silently stalls; verify at matrix, never trust registered=True; (b) ingest endpoint should validate variant (project-wide guard); (c) Korean-first source priority (commerce convention vs mood quality); (d) SEO golden-keyword guard; (e) info-dependency design gate + pre-gen asset pool.

---

## 9. Principles reinforced this session
- #45 / #88: verification (matrix coverage) caught a silent escape bug that "registered=True" hid. Done = Verified, at the layer the UI renders.
- #62: a single typo exposed a project-wide gap (no variant validation) -> guard applies to all products.
- #26: bash-only turn (no MCP connector) made same-turn FS-write safe -> docs persisted without hang risk.
- Honesty: corrected a wrong prior claim ("후레쉰 = terminal artifact") rather than letting it stand.
