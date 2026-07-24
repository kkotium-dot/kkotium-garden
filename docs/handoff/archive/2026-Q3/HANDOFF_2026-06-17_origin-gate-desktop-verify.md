# HANDOFF — ORIGIN-TRUTH-GATE Desktop Independent Verification

- Date: 2026-06-17
- Session: 9 (Desktop lane, in-chat continuation)
- Baseline: c7cdf16 (= origin/main = Vercel production READY)
- Purpose: Independently verify Code session-9 P1 (ORIGIN-TRUTH-GATE) per #45 (distrust Code reports) / #88 (Done=Verified). This IS the "Desktop pinpoint" Code awaited before P2.
- Principle refs: #45, #88, #95 (origin truth), #62 (project-wide), #56 (natural intervention)

## 1. Verification result — Code's ORIGIN-TRUTH-GATE CONFIRMED (all paths)

Desktop read the 3 touched files via Filesystem MCP. All checkpoints PASS. Matches Code's root-cause (silent China fallback that defeats the empty-throw guard).

| # | Checkpoint | File / location | Finding | Verdict |
|---|---|---|---|---|
| 1 | silent China default removed | product-builder.ts buildNaverProductPayload | `resolveOriginAreaCode(product.originCode)` — no `?? '0200037'`; comment "NO default (#95)" | PASS |
| 2 | origin HARD GATE | product-builder.ts validateForRegistration | empty rawOrigin -> errors.push (BLOCK) / resolve throws -> catch errors.push (BLOCK) / healed -> warnings.push; comment cites #95 + #62 | PASS |
| 3 | option integrity guard | product-builder.ts validateForRegistration | optRows>0 && builtCount != optRows -> warnings.push (drift warn) | PASS |
| 4 | secondary path aligned | naver/register/route.ts | `resolveOriginAreaCode((product.originCode ?? '').trim())` — no `|| '0200037'`; comment cites #95 | PASS |
| 5 | last-line defense | product-builder.ts resolveOriginAreaCode | empty -> throw; invalid -> throw; leading-zero heal (0v / padStart) | PASS |

Conclusion: gate is product-agnostic (shared validateForRegistration across all publish paths), English error strings, additive / non-destructive. CODE CLEARED for P2 reconcile.

Verified myeonghwa payload origin path: originAreaCode=0200037, content="중국", importer="꽃틔움" (isImport true since Number(0200037)>=200000, importer_name null -> store fallback; consignment seller is the import-responsible party). No domestic-origin (국산) mislabel. Correct.

## 2. NEW FINDING — origin gate not surfaced in publish UI (Stage 2 Code)

The gate lives in validateForRegistration.errors (backend). PrePublishGatePanel currently shows rows: thumbnail-policy / fidelity / 9-slot / publish-readiness — but NO dedicated origin-truth row. An origin BLOCK surfaces only indirectly via a generic publish-readiness block, not as an explicit named intervention.

Recommendation (#56 natural intervention, product-agnostic): add an explicit "원산지 진실성 (origin truth)" row to PrePublishGatePanel (PASS / BLOCK / HEAL-WARN) and render the validateForRegistration errors/warnings list inline.

Note: BLOCK behavior is NOT browser-demonstrable with the current 3 products (all have originCode) -> code-read is the authoritative verification of the block path. Browser test can only confirm no-regression for valid-origin products.

## 3. Data-drift items (operator / data decisions, NOT code bugs)

- myeonghwa: option_rows DB = 4 ALL ON_SALE, but intended live = 3 (Cotton sold-out not reflected in DB). At PUBLISH: set Cotton SOLD_OUT or remove the row = operator decision (#46).
- ice-tray: originCode "200037" (leading zero stripped). Heals to 0200037 at build, but the stored DB value is dirty -> persist canonical "0200037".
- moon-jar: originCode 0200037 valid.

## 4. myeonghwa asset state (Supabase ground-truth, this session)

storage stages: archive 10 / composite 20 / cutout 3 / detail 3 / plate 3 / thumbnail 4.
composite 20 breakdown: current 2 (fresh-*.jpg, dark_luxury-*.jpg @ 06-17 00:43) + stale 18 (06-11 x9 small JPG lifestyle, 06-13 x9 large PNG). Lemon composite ABSENT. botanical-*.png = registry-only orphan (drift).
options DB = 3 (레몬유칼립 / 에이프릴 후레쉬 / 블랙체리); Cotton dropped from optionValues.

## 5. Next lanes

- Code: P2 reconcile (composite stale 18 + botanical registry-only -> register/archive intervention card, product-agnostic, reversible, #56) -> P3 Phase 3 slot-fill. Plus Stage 2: §2 UX surfacing + ice-tray originCode normalize to 0200037.
- Desktop: browser-verify PrePublishGatePanel origin surfacing (confirm §2 gap) -> Lemon 6-axis regeneration (Firefly, realism lane, 4 generation flags, sunset mood) + Cotton drop confirm -> scent_note ingest + per-scent tagging.
- Operator decision: PUBLISH-myeonghwa (origin gate PASS / thumbnailAssessed resolved / Cotton option decided) -> GO (#46, irreversible).
