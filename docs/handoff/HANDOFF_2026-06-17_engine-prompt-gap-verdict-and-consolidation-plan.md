# HANDOFF 2026-06-17 — Engine Prompt Gap: Verdict + Consolidation Plan

Lane: Desktop (diagnose/verify) -> Code (build). Prod HEAD at audit: ed96ab0.
Method: re-read actual source 2026-06-17 (NOT memory), per #45.

## 0. The operator challenge (repeated, session 9)
Were these two features actually applied to the live image pipeline?
- (A) Reference top-selling similar products' thumbnails / detail pages / trendy SEO-ROI-branding imagery -> generate scroll-stopping "concept-cut" image prompts + assetize (version + reuse) them.
- (B) Per-target-image (thumbnail / detail) BEST realism + tone/mood/resolution/camera tailored to the image we want.

Verdict: operator is substantively right. Architecture exists; the last mile is disconnected. Evidence below.

## 1. Evidence (files read 2026-06-17)

### 1a. TWO parallel, disconnected prompt engines
- System 1 (LIVE, older): `POST /api/art-director/prompt`
  product -> inferConceptTone (8-axis CTI) -> collectStrategySignals -> classifyRole -> translatePrompt (rule + Groq polish) -> classifyAssetStatus -> persist `art_director_prompts`.
  Prompt derived from the product's OWN name/category + palette of its OWN mainImage. Returns a `negativePrompt` (violates #86 -> predates the mood engine). NO competitor input. NO 6-axis camera engine.
- System 2 (NEW, Stage 1): `GET /api/engine/strategy?productId=`
  assembleStrategy -> per-slot `resolvedPrompt` (6-axis mood/camera) + benchmarkDna + cameraKey.
  Returns ONLY `promptPreview = resolvedPrompt.slice(0,280)` for a READ-ONLY SlotFunnelBoard display. Does NOT call persistStrategy. Pure read.

### 1b. assemblePrompt (src/lib/mood/prompt-assembler.ts)
- prompt = subject + cameraClause + FIXED_GRADE_BLOCK + EXCLUSION_BLOCK.
- `benchmarkDna` is RETURNED as a field but NEVER concatenated into the prompt string -> reference aesthetic never reaches the image.
- cameraClause = "shot on {archetype} with {lens} at {aperture}, {realismCues}". `resolution` (2K/4K) lives in the camera spec but is NOT concatenated -> resolution knob never reaches the image.

### 1c. spec-data.ts MOOD_AXES
- benchmarkDna = STATIC per-mood Korean brand tags (무인양품/이솝/오늘의집/29CM/컬리/쿠팡). Hardcoded, not derived from competitor pixels.
- mood is fixed per slot (scent_note = M2 for ALL products) -> not per-scent / per-product bespoke.

### 1d. seeds/category-dna-50014980.json
- thumbnailConventions source = "경쟁 픽셀 미분석" (competitor pixels NOT analyzed). No live teardown pipeline exists.

### 1e. productSubject leak (engine/strategy/route.ts)
- assembleStrategy is called with `productSubject = product.name` (the Korean SEO title). The Korean title is injected into the English image prompt as the subject noun. The asciiPalette guard drops the Korean palette but the subject leak remains.

## 2. Verdict
- (A) Reference-driven concept-cut prompt: NOT applied. Neither engine reads competitor thumbnails/detail. benchmarkDna is static AND never injected. No teardown pipeline. Assetization tables exist (art_director_prompts + PromptVersion) but store generic prompts, and PromptVersion is not written in the live read flow.
- (B) Per-image realism/tone/resolution/camera: PARTIALLY built, NOT delivered. The 6-axis engine encodes camera/realism/grade per slot and DOES weave camera+grade into the prompt (good). But resolution is not wired into the prompt; mood is per-slot-fixed not per-scent; and the live generation does not consume resolvedPrompt at all (operator uses System 1 or hand-writes from playbook).

## 3. Root cause (the "tangling/누락" the operator senses)
Two prompt engines were built across sessions and never merged. The studio's actual image generation does not consume System 2's resolvedPrompt; System 2 only powers a truncated display preview. Feature A's live competitor pipeline was deferred to "Stage 2" and never elevated to a blocking task. Net: engine value never reaches the images; it feels unapplied because at the last mile it is.

## 4. Corrective plan (product-agnostic #55, project-wide #62)

DECISION NEEDED (single, operator): consolidate onto the 6-axis engine (System 2) as the ONE prompt authority; demote art-director/prompt's unique value (ConceptTone 8-axis, role, asset-status) to INPUT SIGNALS feeding the engine, not a competing prompt string. This is the call that stops the two-engine drift.

Tasks (lane = Code unless noted). Each is all-products/all-categories, never 명화-only.

P0 — close the last mile (cheap, highest ROI)
- E1 resolution -> prompt: append `resolution` to cameraClause in assemblePrompt. ~1 line.
- E2 productSubject leak: derive a short English subject noun (new productSubject field, or LLM-normalize from name/category); stop passing the Korean name.
- E3 SlotFunnelBoard: surface the FULL resolvedPrompt (not 280-char) + a one-click "copy prompt" + a recommended-Firefly-settings card (model / grounding / ratio / resolution). NATURAL INTERVENTION (#56): operator copies the engine prompt instead of hand-writing. Desktop browser-verifies (#88).
- E4 concept enrichment Layer-1: inject benchmarkDna + DNA toneManner into the prompt string (a reference-aesthetic clause). Delivers "팔리는 톤" with no crawl.

P1 — consolidation
- E5 per-scent/product concept input: scent_note (and other variant-bearing slots) differ per variant (Lemon cool morning vs Black Cherry sunset warm). Product-agnostic concept/variant field feeds the subject template.
- E6 assetization closed loop: live flow calls persistStrategy (write immutable PromptVersion); link SlotGeneration -> ingested asset (which prompt produced which image) -> enables prompt learning.
- E7 engine consolidation impl: fold ConceptTone/role/asset-status into engine signals; one prompt authority; retire System 1's competing prompt string (keep its signals).

P2 — full feature A
- E8 live competitor-thumbnail teardown -> DNA thumbnailConventions refresh (reuse competitor routes + Naver shopping). Replaces "경쟁 픽셀 미분석" with real per-category visual conventions.
- E9 prompt performance learning: CTR/CVR per PromptVersion -> auto-promote winning prompts.

## 5. Cross-lane / parallel status (no drops)
- IN PROGRESS (Code): queue-masking fix — stack all active interventions per product / "+N". Verify = 명화 shows BOTH variant_composite + registry_drift cards.
- PENDING (Desktop, Firefly P0): Lemon hero REGEN (Path C: no bottles / empty upper third / cool tone) -> evaluate -> ingest variant "레몬유칼립" -> card 0/3 -> 1/3 (#88). CAVEAT: Control Chrome MCP hung (#26) -> needs server restart OR Claude-in-Chrome OR operator manual-fire. April/Cherry batch after; Cotton excluded (stock 0).
- This doc supersedes the prior "engine-gap pending" note. E1-E9 is the canonical schedule.

## 6. Code paste block (Korean trackers — Python full-file overwrite, #41; NOT edit_file)
Code: add the E1-E9 block above to docs/plan/PARALLEL_WORK_TRACKER.md (LIVE BOARD) and TASK_BRIDGE.md §3, with priority (P0/P1/P2) + lane + product-agnostic note, via Python full-file overwrite. Then add a SESSION_LOG entry, run tsc --noEmit + build + tests, commit, push. After deploy, ping Desktop to browser-verify E3 (full prompt + copy + settings card render).
