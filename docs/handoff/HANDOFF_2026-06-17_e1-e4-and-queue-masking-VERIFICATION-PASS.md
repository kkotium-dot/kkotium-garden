# HANDOFF — Engine last-mile E1-E4 + Queue-masking: Desktop verification PASS

Date: 2026-06-17 (session 9, Desktop lane)
Baseline: production HEAD d811ad0 (docs) / 8c1e9ae (code), Vercel READY
Prior context: HANDOFF_2026-06-17_engine-prompt-gap-verdict-and-consolidation-plan.md (E1-E9 plan, same dir)

## TL;DR
Two completed Code-lane items were independently verified by Desktop to the strictest bar
(#45 never-trust-reports + #88 done=browser-verified). Both PASS at every layer. Safe to advance.

## 1. Queue-masking fix — 4-layer PASS (#56 / #100 / #62)
Bug: control tower showed only 1 intervention card per product, so variant_composite masked
registry_drift for 명화 (a hidden intervention point = #56 violation).
- Deploy: Vercel production HEAD 07088a1 READY; fix commits 389fecb (engine extraQueue) +
  a91156d (response-mapping extraQueue) deployed.
- Data (Supabase ground truth): 명화 asset_jobs awaiting_human = exactly 2
  (registry_drift 08:27 + variant_composite 10:18); all others cancelled/done.
- Runtime (live /api/products/asset-jobs-matrix): 명화 actionQueue=variant_composite +
  extraQueue=[registry_drift]; 아이스 fill_attributes / 달항 apply_curated_main both
  extraQueue=[] (no regression).
- Pixel (dashboard DOM): 개입 대기열 renders 4 stacked cards — [명화 변형별 대표 컷 0/3] +
  [명화 자산 정합 등록/정리 결정] + [아이스 재질] + [달항 대표 컷]. The previously masked 명화
  card is now painted with its own CTA. Header text "순서 강제 없음" confirms #56 non-forced order.
VERDICT: masking resolved end-to-end; single-intervention products unchanged.

## 2. Engine last-mile E1-E4 — 3-layer PASS (#62, all-products #55)
- E1 resolution-to-prompt: prompt-assembler cameraClause ends ", {resolution} resolution".
  Live: every slot carries 2K/4K, varies per mood (hero 4K / solution 2K). Pixel: slot card "해상도 4K" row.
- E2 English subject: route uses englishSubjectFor(categoryCode); category-subject.ts map
  {50014980 car air-vent fragrance diffuser, 50000963 decorative doorbell, 50005257 ice cube tray}
  + FALLBACK 'product' (product-agnostic safe-degrade). Live: every prompt starts
  "A car air-vent fragrance diffuser ..." ASCII-100%, no Korean SEO-title leak. Pixel: English subject rendered.
- E3 full prompt + copy + settings: route returns full resolvedPrompt + resolution (plus 280 preview).
  SlotFunnelBoard renders full resolvedPrompt (pre-wrap mono), PromptCopyButton (navigator.clipboard,
  Copy/Check), settings card (model/grounding/aspect/resolution chips) + Meta row. Pixel: /studio image
  tab shows "9슬롯 퍼널 보드", expanded hero slot with full prompt (tail "unified collection grade"
  beyond the 280-cut), "프롬프트 복사" button, 해상도 4K.
- E4 reference-aesthetic: prompt-assembler splices `in {referenceAesthetic}`; types.ts
  referenceAesthetic:string English field; benchmarkDna stays Korean display-only (no leak);
  #86 negativePrompt absent (positive exclusion block). Live: per-mood English aesthetic clause
  ("refined, luxurious, premium-boutique craft" etc.).
Guards intact: #84 camera variety per mood; #71 photoreal lane ("realistic photograph only");
#86 no negativePrompt field.

## 3. Finding (proactive, all-products) — palette default
Every slot prompt reads "...diffuser in natural..." because the palette knob is empty -> defaults
to 'natural'. Not broken, but the mood's intended palette (premium-dark / clean-white) never reaches
the prompt = weaker "selling tone".
ACTION (fold into E5): inject an English palette descriptor per mood/scent + drop the [palette]
token when empty. All-products, additive.

## 4. E1-E9 status
- DONE (P0): E1, E2, E3, E4 (verified above).
- QUEUED (P1, additive, independent): E5 per-scent concept + palette fix; E6 assetization closed loop.
- GATE (E7, irreversible): engine consolidation (System1 retire -> single prompt authority).
  Direction approved; structural PR requires explicit operator/Desktop GO. Recommend AFTER E5/E6.
- BACKLOG (P2): E8 competitor-thumbnail teardown; E9 prompt CTR/CVR learning.

## 5. Scheduling
1. Lemon hero regen -> ingest (Desktop/Firefly, INDEPENDENT of all Code work). variant_composite 0/3 -> 1/3.
   Path C: no bottles / empty upper third / cool tone; Nano Banana Pro edit + grounding ON + 3:4 + 2K + reference 0.
2. Code: E5 (+palette fix) -> E6 -> E7 (GO-gated). 옵션 3표현 reconcile parallel/independent.
3. Operator (irreversible #46): PUBLISH-명화 — gate thumbnailAssessed=false blocks publish;
   needs thumbnail assessment + Cotton option (stock 0) decision + GO.

## 6. Independent vs cross-lane
- INDEPENDENT (parallel, no cross-dep): Code E5/E6/옵션-reconcile ; Desktop Lemon regen->ingest.
- CROSS (ping-pong): Lemon ingest -> variant_composite card 0/3->1/3 auto-resync ;
  any E3-style UI change -> Desktop browser render verify (#88).
- GATE: E7 structural PR -> operator/Desktop GO before merge.

## 7. Principles touched
#26 (connector + Filesystem-write never same turn), #45 (verify, never trust Code reports),
#55 (all-products), #56 (natural non-masked intervention), #62 (project-wide fix),
#71 (realism lane), #84 (camera variety), #86 (no negativePrompt), #88 (done=browser-verified),
#100 (multi-card non-masking).
