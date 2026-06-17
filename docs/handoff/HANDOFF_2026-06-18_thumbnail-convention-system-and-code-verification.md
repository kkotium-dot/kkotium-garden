# HANDOFF — Thumbnail Convention System + Code Verification (2026-06-18, Session 9 Desktop)

Lane: Desktop (MCP/verify/browser/docs). Code prod HEAD at handoff = `7d54eb6`.
Supersedes nothing; complements HANDOFF_2026-06-18_v6-scents-3of3-april-escape-fix-hybrid-workflow.md.

---

## 1. CODE 7d54eb6 — VERIFIED LIVE (all PASS, #45/#88)

E5 본체 + per-scent v6 mood + ingest variant guard, verified independently via prod APIs (not trusting Code report).

### 1a. Defect A + B (strategy API, 21 prompt fields, 명화)
- `in natural` occurrences = **0** (palette fallback works).
- `for a small bottle` occurrences = **0** (defect B removed from engine too).
- Sample slot prompt carries a real mood palette ("deep muted tones with refined contrast ... premium-boutique craft aesthetic, Phase One camera").

### 1b. E5 본체 + per-scent mood (strategy API, slot[3] slotType=scent_note, variants[3])
Each variant = concept-based backdrop, product-as-margin (not subject), `in natural`=no, negative-space reserved=yes. Per-scent mood differentiation confirmed and matches v6 grade:

| variant | concept signals | grade signals | mood |
|---|---|---|---|
| lemon | lemon + eucalyptus, travertine | warm amber/caramel, "warm cozy homely" | M4 (warm) |
| april | white linen + spring florals, rainy window | "bright cheerful pastels", "vibrant gift-ready" | M5 (high-key) |
| cherry | deep-crimson cherries, dark walnut | "deep muted tones, refined contrast", "premium-boutique" | M6 (low-key) |

Note: the API payload does NOT expose a per-variant `variant`/`name` label key (content identifies the scent; UI SlotFunnelBoard carries the label). Minor; content is correct + differentiated.

### 1c. ingest variant guard (behavior test, POST typo variant)
POST `에이프릴 후레쉰` (U+C270 typo) + 1x1 PNG → response:
- `variantUnmatched: true` ✓
- `validVariants: ["레몬유칼립","에이프릴 후레쉬","블랙체리"]` ✓
- `optionVariant: null` (binding rejected) ✓
Exactly blocks the april-escape silent-stall class (#62).

OBSERVATION (optional Code refinement, low priority): the guard rejects the BINDING but still `registered:true` (file ingested unbound). Prevents the dangerous false-binding stall, but leaves a benign unbound file. Consider: when `variantUnmatched`, either skip auto-register or route to a `review`/`quarantine` stage. Test artifact created: `composite/guard-test-delete-1781731490193.png` → added to (C) cleanup batch.

---

## 2. 3/3 + 자산 정합 card (DOM-confirmed, dashboard, prior turn)
- 명화 "변형별 대표 컷" card = GONE (variant_composite 3/3 complete) — DOM-confirmed in 개입 대기열.
- Replaced by "자산 정합 — 등록/정리 결정" card = system auto-surfaced the composite clutter I created (#56 working).

---

## 3. (C) CLEANUP — precise targets (asset_registry, 명화 composites = 18)
Variant-bound coverage set (3/3 OK): lemon v6 `cmqiii5a8`, cherry v6 `cmqiii9yz`, april correct `cmqiiq7q5`.

| grade | target | id |
|---|---|---|
| ARCHIVE (orphan, wrong variant 후레쉰) | fresh-1781727424336.png | `cmqiii7hh` |
| ARCHIVE (superseded v5 unripe lemon) | lemon-eucalyptus-morning-1781716276669.png | `cmqibvanp` |
| ARCHIVE (guard behavior-test artifact, unbound) | guard-test-delete-1781731490193.png | (variant=null) |
| REVIEW-THEN-ARCHIVE (stale 06-13~17 non-variant) | 7x lifestyle, hero_lifestyle, fresh_lifestyle, botanical, fresh-1781657005726.jpg | various |
| PRESERVE | dark_luxury-1781657008705.jpg | `cmqhckycz` (NOT for main thumbnail per §5; keep only as a dark-context option) |

Clean archive = Code utility (storage `composite/`→`archive/` move + registry stage='archive', atomic + idempotent). Desktop Supabase is SQL-only; registry-only would worsen drift. → Code domain.

---

## 4. SCENT v6 NARRATIVE — RESOLVED (v6 authoritative)
v5 §4 ↔ v6 conflict resolved by Desktop: **v6 is authoritative** (the v6 prompts produced the approved 3/3 images; filenames match; v5 lemon-cool was the rejected version). Code already applied per-scent mood (M4/M5/M6) to the engine (verified §1b). For the playbook §4 prose, replace the 3 in-stock scent narratives with v6; cotton (stock 0) stays as-is / excluded until restock.

v6 heads (image-validated): lemon = ripe/warm/early-morning golden; april = high-key/airy/diffused daylight; cherry = low-key/dusk/warm-amber. (Full prompt text in prior handoff + chat Code block.)

---

## 5. ★ THUMBNAIL CONVENTION CORRECTION (operator rebuke — central)

### What was wrong (my first proposal)
- AESTHETIC error: I forced 고급=dark/black objet (generic Korean luxury car-diffuser subset). This CLASHES with the product's 명화(masterpiece-painting) art identity. Premium != dark.
- METHODOLOGY error: I benchmarked ONE good seller. Operator wants: survey the Korean category's TRENDY / high-traffic conventions across MANY sellers → extract recurring patterns → ADAPT/graft to OUR product → make it ours. And ASSET-IZE everything (prompts + research) into a project-wide system with natural app intervention points (already requested earlier in chat).

### New principle (registered)
**컨벤션은 상품 정체성에 복무한다 — 정체성과 충돌하는 컨벤션 요소는 상품 정체성이 오버라이드한다.**
(Convention serves product identity; identity overrides clashing convention elements. e.g. 명화 art identity overrides generic dark-luxury → bright art-gallery direction.)

### Market survey (image_search, multi-seller spectrum — NOT one winner)
- Our exact product (디스이즈 "명화" line): art-print clip vent diffuser, 본품 15ml + 리필 30ml 세트 / 선물세트, sold on SSG / 오늘의집.
- 명화 aesthetic association: exhibition posters / art interior frames (그림액자) → bright, refined gallery/exhibition mood, artwork color is the hero. Opposite of dark/black.
- Category trendy/high-traffic spectrum: premium + clean/감성 (다비, 에이디스, 아이디어스) + scent-variety (lemon/mint/cypress) + gift/답례품 + 세트 (1+1, 본품+리필). Dark/black is only ONE narrow subset.

### Corrected 명화 thumbnail direction — "미술관 전시 / 밝고 정제된 아트 갤러리" (NOT dark)
- HERO: the product's masterpiece-painting face (the differentiator) is the subject.
- BACKGROUND: bright gallery/exhibition context — clean cream/white wall, soft natural museum daylight, palette echoing the artwork's own colors. Premium via art refinement + curation, not darkness.
- FRAMING: 본품+리필 세트 / gift cue (satisfies both product reality + category gift convention). 4 scents = 4-artwork feel for 추가이미지.
- NAVER POLICY: 대표이미지 = product (artwork face) hero, clean, minimal/no text (catalog matching). "차량용·명화·선물·세트" keywords go in TITLE (SEO) + 추가이미지.

### Firefly background prompt (bright gallery, Nano Banana Pro, 1:1 Square, 2K, grounding ON, no ref)
```
A photorealistic premium product-photography background in a bright, refined fine-art
gallery / exhibition mood. A clean cream-white gallery wall with soft natural museum
daylight from a large side window, gentle warm highlights and very soft long shadows.
A faint hint of a light wooden gallery floor or a softly blurred empty light-toned
picture frame at the edge, evoking a curated art-exhibition atmosphere - bright, airy,
elegant, calm, gift-worthy. Soft pastel and warm-cream palette with subtle natural color
accents. Clean empty center space reserved for later product compositing, no bottle, no
jar, no container, no diffuser, no product of any kind in frame. Square 1:1 composition.
Shot on medium-format, soft diffused studio lighting, shallow depth of field, fine film
grain, soft matte finish. Photorealistic. No people, no text, no logos, no painting
reproduction, no illustration.
```
Composite: bright gallery bg -> real product cutout (artwork face, frontal) center + soft contact shadow; artwork colors harmonize with bg accents. Existing dark_luxury asset (`cmqhckycz`) is OFF the main-thumbnail path (kept only as a niche dark-context option).

---

## 6. ★ ASSET-IZATION SYSTEM (operator core demand) — feeds E8 v2 + INFO-DEP-DESIGN-GATE
Product-agnostic pipeline: **벤치마크 컨벤션 → 자산 → 상품 접목 (Benchmark → Asset → Graft).**

1. **벤치마크 컨벤션 추출 (per category)**: NaverSearch Tier-1 (search_shop/image), MULTIPLE trendy/high-traffic sellers → CONVENTION PROFILE: {layout, background-type, palette, lighting, framing, gift-cue, channel, scent/variety-cue}. Pattern across winners, NOT one image.
2. **자산화**: CONVENTION PROFILE -> category `benchmarkDna` (reusable across all products in that category). Derived prompts -> PROMPT-ASSET LIBRARY tagged {category, artifact-type[thumbnail/detail/scent], convention-element}. Research images/evidence stored as assets too.
3. **상품 접목 (Graft / Adapt)**: engine adapts category convention to the SPECIFIC product identity. Identity OVERRIDES clashing convention (명화 art overrides dark-luxury). This is the "make it ours" step.
4. **앱 개입점 (#56)**: "벤치마크 리서치 검토" card (review extracted convention + graft result, approve/adjust) + Design Readiness lane (per-artifact convention-applied preview). Natural, non-forced.
5. **product-agnostic**: all categories/products; 명화 = first application.

CRITICAL design rule to bake into E8 v2: benchmark adaptation must capture the convention SPECTRUM (not one subset) AND include a product-identity-fit step (override clashing convention). My dark-thumbnail mistake -> this project-wide design principle (#62-style).

---

## 7. FOR CODE — Korean tracker deltas + queue (Code owns Korean trackers, #41)
Add to PROGRESS/SESSION_LOG/PRINCIPLES_LEARNED/board:
- Principle: "컨벤션은 상품 정체성에 복무한다 (정체성이 충돌 컨벤션 오버라이드)" — benchmark adaptation core; reflect in E8 v2 spec.
- E8 v2 spec refinement: convention SPECTRUM extraction (multi-seller, not one winner) + product-identity-fit/override step + prompt-asset library (tagged) + "벤치마크 리서치 검토" card + Design Readiness lane.
- VERIFIED LIVE: defect A/B (0/0), E5 scent_note 3 per-scent concept backdrops, per-scent mood M4/M5/M6, ingest variant guard (variantUnmatched + validVariants + optionVariant:null).
- Optional guard refinement (low): on variantUnmatched, skip auto-register or route to review stage (avoid benign unbound clutter).

Code queue (operator delivers sequentially): SEO-GOLDEN-KEYWORD-GUARD (P1, 명화 "차량용" missing) OR E6 (assetization closed loop); + (C) archive utility (precise ids in §3); + scent §4 v6 prose replace; + E8 v2 build (with §6 + identity-override rule). E7 = explicit GO gate.

---

## 8. NEXT ACTIONS
1. [operator+Desktop] generate the bright-gallery thumbnail bg in Firefly (§5 prompt) -> Desktop ingest stage=thumbnail (1:1) -> composite with real product cutout.
2. [Desktop] optionally evaluate whether any existing bright/lifestyle asset can serve as a quick base.
3. [Code] per §7 queue.
4. 명화 publish gate (irreversible, explicit GO): bright-gallery thumbnail + "차량용" in title (SEO guard) + cotton decision.

## 9. APP STATUS (prod 7d54eb6)
- 명화: 판매중지(intended) S/94; variant_composite 3/3 LIVE; queue card = 자산 정합(cleanup); engine E5+mood+guard LIVE+VERIFIED; defect A/B 0/0 LIVE; title missing "차량용".
- 아이스: 발행불가 A/84; queue = 필수속성(재질).
- 달항: 발행준비 A/84; queue = 대표컷(크롭); margin 23%.
