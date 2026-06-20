# HANDOFF 2026-06-20 — C6 LIVE-verified + D4 publish reconcile plan

Author: Desktop lane. Prod HEAD at write time: `281569d`. Verification method: bash-only (#26-safe curl of prod strategy API).

---

## 1. C6 — LIVE verified (prod `281569d`)

Independently verified (not trusting Code smoke, #45) via prod strategy API for 명화 (`cmpnooli40001f0gveaxr8iim`):

- **Composite descriptor on ALL slots**: `{ method: "firefly_reference", referenceRequired: true, recommendedModel: <nano_banana_2 | firefly_native | nano_banana_pro>, fallback: "local_paste" }`. Model recommendation varies per slot. PASS.
- **REALISM_CAMERA_BLOCK present**: `true-to-life color, high microcontrast, captured on a real camera with natural light, photorealistic editorial product photography, no CGI, no 3D-render look, no AI artifacts`. PASS.
- **Reference-composite protective clause = STRONG** (the core of #107): the live variant prompt reads —
  `place the attached product exactly as provided, preserving its form, label, glass and caps without redrawing or altering them; match the scene light to the product and add a natural contact shadow and soft reflection.`
  Product fidelity (label/glass/caps preservation) + light matching + contact shadow/reflection all explicit. PASS.
  - NOTE for verifiers: grep with `exactly as provided` / `without redrawing or altering`, NOT `do not redraw/alter` (different phrasing).
- **Empty-margin removed**: old `reserveProductMargin` ("no product in frame / reserve empty space") absent from variant scenes — correctly switched to reference-composite mode. PASS.
- **Gate regression: NONE** — publishReady=false, thumbnailAssessed=false, status=ACTIVE, seoComplete=true, goldenKeywordComplete=true, thumbnailPass=true, originTruth=pass(0200037). Unchanged from pre-C6.

### C6 minor finding (cosmetic, non-blocking)
- Prompt string-assembly artifact: duplicate word `"...soft wood tones tones,"` (double "tones"). Does not break generation; sloppy output. → Code polish item (P3).
- Camera defaults to full-frame 50mm f/2.0 for still-life scenes; per deferred C17 (concept-camera) premium still-life would prefer medium-format 100mm f/4. Acceptable for C6 core; refined in C17.

---

## 2. D4 — 명화 publish reconcile plan (2 residuals → O3 GO)

Gate (prod, live): `publishReady=false`. The ONLY false sub-flag = `thumbnailAssessed`. Everything else green; `originTruth=pass(0200037)`; `naverProductId=13564133057`; `status=ACTIVE`.

### Residual 1 — 대표이미지 평가 (thumbnailAssessed: false → true)
- Thumbnail is LIVE (Firefly reference-composite, stored variant=null, 1600², `thumbnailPass=true`, 0 violations) — objectively ready.
- `thumbnailAssessed` is a HUMAN-approval flag, distinct from the automated `thumbnailPass`. It flips when the operator approves the 대표이미지 in the app (natural intervention point, #56).
- **OPEN (needs Code confirm)**: the exact flip mechanism — is there an operator-facing assess action/card already, or must Code expose one? → Code item **C19** (confirm; build the 대표이미지 평가 카드 if missing).

### Residual 2 — status drift (gate.status=ACTIVE vs Naver 판매중지)
- Not a local data bug — an INTENT gap. gate.status=ACTIVE = engine view (has naverProductId / treated as published). Naver reality = intentionally 판매중지.
- Reconcile = operator decides to RESUME sale → the publish/resume action issues a Naver PUT (un-suspend + sync). Irreversible → **O3 GO required (#46)**.

### Operator D4 session (one pass → O3 GO)
1. Review live thumbnail (Firefly composite) → approve → `thumbnailAssessed=true` (mechanism per C19).
2. Confirm resume intent + #46 pre-PUT checklist:
   - 원산지: pass (0200037) ✓
   - 옵션 수: 3 향 = 레몬유칼립 · 에이프릴 후레쉬 · 블랙체리 (confirm count/values)
   - 대표이미지: final Firefly composite (approved in step 1)
   - 가격/카테고리/필수속성: salePrice 14300 / category 50014980 / naverPayloadComplete=true
3. → O3 GO → Naver resume PUT (irreversible). publishReady flips true once thumbnailAssessed=true.

---

## 3. Code queue update (this checkpoint)

- **C19 (NEW · P1 · revenue-adjacent)**: confirm/expose `thumbnailAssessed` operator-assess card (unblocks D4 residual 1). Confirm-first; build only if missing.
- **C15 (P2)**: physical-delete the C14 test asset `cmqmbemz600002fp2tiraeu6w` (detail/hero-1781957364462.png) via Storage API + re-confirm detail/ clean.
- **C16 (P2)**: extend archive/integrity utility to all stages (general remove/archive, not composite-only).
- **C5 (P2 · large)**: E8 v2 build (benchmark→asset→graft + #105/#106/#107 + Design Readiness). Surface forks before committing (as done for C6).
- **C6 polish (P3)**: fix `"tones tones"` duplicate-word prompt artifact.
- Deferred: C17 (concept-camera mapping), C18 (composite model real reroute), #103 (datalab search-volume guard).

Code sequence: **C19 → C15 → C16 → C5 → C9 → C4 → P3** (C19 first = revenue unblock).

---

## 4. 작업 유의사항 (this session additions)

- Reference-composite protective clause verified strong; verify with `exactly as provided` / `without redrawing or altering` (phrasing varies — do not assume "do not redraw").
- Live test-ingest creates a cleanup burden that Desktop tools cannot fully resolve (Supabase blocks storage.objects DELETE; archive route composite-only). Prefer non-persisting validation; minimize asset creation (C14 lesson).
- `thumbnailAssessed` (human) ≠ `thumbnailPass` (automated). Publish requires the human approval flag — surface it as an operator card (#56).
