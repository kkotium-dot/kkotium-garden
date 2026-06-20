# HANDOFF 2026-06-20 — publishReady = first-publish gate + D5 re-resolved (dryRun statusType=SALE)

From: Desktop lane. Target: next Desktop + Code sessions.
Supersedes the D4 section of HANDOFF_2026-06-20_c6-verified-d4-reconcile-plan.md.
Authoritative source for the 명화 resume plan (the prior "d5-resume" file was never persisted to disk — confirmed via list_directory).

---

## 1. DONE this turn (Desktop, verified)

- C19 migration `c19_thumbnail_assess` APPLIED via Supabase apply_migration (`success:true`); columns `thumbnail_assessed_at` / `thumbnail_assessed_by` confirmed present; 명화 values null (correct, unassessed).
- C19 e2e VALIDATED in prod: POST /api/products/{id}/thumbnail-assess -> thumbnailAssessed flips true; DELETE -> reverts false. Reversible, no Naver touch. 명화 left UNASSESSED (operator attestation preserved).
- Regression hotfix VERIFIED across all 3 products: strategy gate present (not null), thumbnailAssessed=false consistent. Code's gate=null hotfix held.
- publish-readiness.ts READ — the real publishReady formula confirmed (section 2).
- D5 RE-RESOLVED via fresh prod dryRun (section 3) after Code self-contradicted across two commits.

## 2. KEY DISCOVERY — publishReady is a FIRST-PUBLISH-ONLY gate

Exact formula (src/lib/automation/publish-readiness.ts, evaluatePublishReadiness):

    publishReady = fieldsAllSet && authentic && naverPayloadComplete && thumbnailPass
                && status === 'DRAFT' && naverProductId === null

Implications (product-agnostic, #55):
- 명화 (status=ACTIVE, naverProductId=13564133057) can NEVER reach publishReady via this gate — both `status==='DRAFT'` and `naverProductId===null` fail. This is STRUCTURALLY CORRECT, not a bug.
- thumbnailAssessed is NOT in the formula. Only `thumbnailPass` gates publishReady, and thumbnailPass DEFAULTS true when no signals are supplied. So C19's thumbnailAssessed flag is DIAGNOSTIC; the gating input is thumbnailPass.
- This gate is the FIRST-PUBLISH path for new DRAFT products (아이스트레이, 달항아리 — both DRAFT, naverProductId null, but seoComplete=false so not yet ready).
- Already-listed products (명화) use a SEPARATE resume/update path (section 3), NOT publishReady.

## 3. D5 RE-RESOLVED (#45) — resume = update route, D6 NOT needed

Code contradicted itself across two commits:
- `f9eaa8f`: builder product-builder.ts:937 emits `statusType:'SALE'`; dryRun shows payloadPreview.statusType=SALE; resume covered by update route; D6 NOT needed. (CORRECT — matches established #110.)
- `2619832` (later): "판매재개 없음, statusType read-only, D6 candidate." (WRONG — re-derived from grep + api-client comment, the exact unreliable sources Code already flagged in #44.)

Desktop decisive re-verification — fresh prod dryRun of POST /api/naver/products/update {productId: 명화} WITHOUT confirm (read-only, dryRun:true confirmed, no Naver PUT):
- payloadPreview.statusType = **'SALE'** -> the update route's full-replace PUT carries SALE -> resumes the SUSPENDED listing.
- Therefore: resume = existing `POST /api/naver/products/update {confirm:true}`. **D6 NOT needed.** `f9eaa8f` + #110 are correct; `2619832` D5 report is a REGRESSION and any doc it stamped ("D6 candidate / 판매재개 없음") must be reconciled by Code.

Layer honesty (#88):
- Layer 1 (route emits statusType:'SALE') = EMPIRICALLY VERIFIED now (dryRun).
- Layer 2 (Naver honors statusType:'SALE' to lift SUSPENSION) = supported by doc MYEONGHWA_PUBLISH_READINESS_2026-06-07 ("statusType SALE (PUT 시 판매중지 해제)") + Naver Commerce API domain knowledge (originProduct PUT statusType is seller-settable for SALE/SUSPENSION/CLOSE; OUTOFSTOCK is the stock-derived read-only value the api-client comment referred to). Fully confirmed only by the actual PUT (operator GO).

## 4. Content-reconcile ground truth (dryRun) + operator decision set (#46, #111)

The full-replace PUT overwrites the Naver listing entirely (omitted fields are removed). Current payloadPreview:

| field | value | reconcile |
|---|---|---|
| statusType | SALE | OK (resumes sale) |
| salePrice | 29000 | confirm intended price (prior memory 14300 was stale) |
| representativeImage / imagesToUpload.mainImage | thumbnail/thumb-cropmain-1780913225888.png | STALE crop-main; Firefly composite NOT wired to main_image_url. Decide keep vs wire Firefly. |
| optionCombinationValues | 4: 레몬유칼립, 에이프릴 후레쉬, 블랙체리, 코튼어라운드 | 코튼어라운드 present. dryRun entries are name-only (stock not visible here). Decide restock 코튼 -> publish 4, or exclude -> publish 3. Verify 코튼 stock (Code/Supabase). |
| originAreaInfo | originAreaCode 0200037 = 중국 (content '중국') | CONTRADICTS doc 국산/00. 원산지표시법 LEGAL-SENSITIVE. 도매매 dropship goods are commonly imported (중국 plausibly correct), but operator MUST confirm true origin from supplier before PUT. |
| productInfoProvidedNotice | present (HB household-chemical) | OK |
| validation | readinessGrade S, attributeGrade A, canRegister true, errors/warnings/missingRequired all [] | clean |

OPERATOR DECISIONS (gate the irreversible PUT):
1. 원산지 — true value: 중국(0200037, current payload) vs 국산(00, old doc). LEGAL. Highest priority.
2. 코튼어라운드 — restock (publish 4) or exclude (publish 3).
3. 대표이미지 — keep current crop-main, or wire Firefly composite to main_image_url first.
4. 판매가 — confirm 29000.
THEN O3 GO -> Desktop executes update {confirm:true} (IRREVERSIBLE Naver PUT; Code never auto-runs) -> post-PUT 3-tier verify (statusType SALE / origin / options / thumbnail / HB).

## 5. NEW principles (Code: record in PRINCIPLES_LEARNED + tracker)

- #113 — An empirically-verified fact (dryRun / live test) recorded as a principle must NOT be silently overturned by a weaker re-derivation (grep, source-comment). Re-investigation RE-RUNS the same empirical test; the verified principle wins unless the test itself flips. (D5 flip-flop: f9eaa8f dryRun-verified -> 2619832 grep-regressed.)
- #114 — publishReady is the FIRST-PUBLISH gate (status==='DRAFT' && naverProductId===null). Already-listed products (ACTIVE/SUSPENSION, naverProductId set) resume via the update route, not publishReady. Route each product to its correct flow by state. (Supersedes/clarifies #109/#110.)
- #115 — thumbnailAssessed is NOT a publishReady input; only thumbnailPass is (defaults true without signals). e2e testing the flip revealed the structural gate that reading sub-flags alone missed (#45).

## 6. C19b status (honest)

- Route logic (POST/DELETE thumbnail-assess) = API-verified by Desktop (works, reversible, no Naver).
- UI card (PrePublishGatePanel + ThumbAssessControl, prod f8bfa6a) = NOT browser-verified yet. Render + click on /studio publish tab still needs a browser pass (prod /studio auth state uncertain for Desktop). Flag for operator click-test or a dedicated browser turn.

## 7. Board pointers + next actions

- 명화 resume mechanism = CONFIRMED (update route). Blocker is now the 4 operator decisions (section 4) + GO, NOT a missing endpoint. D6 = CLOSED (not needed).
- Code: fix the 2619832 D5 docs regression (reconcile to "resume = update route, D6 not needed"); record #113/#114/#115; proceed C19b verify-assist / C15 (Storage API delete, MCP single turn) / C16 / C5.
- Desktop next: after operator decisions, apply reversible DB content fixes (origin/options/main_image as decided), re-dryRun confirm, then on O3 GO execute update {confirm:true}, post-PUT 3-tier verify. Optionally browser-verify C19b. D3 달항/아이스 composite extension (C6 standard landed) is independent.
- Korean trackers (PARALLEL_WORK_TRACKER §4, PRINCIPLES_LEARNED, PROGRESS) = Code Python full-overwrite (#41).
