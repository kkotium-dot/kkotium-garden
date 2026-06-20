# HANDOFF 2026-06-20 — D5 RESOLVED (resume mechanism) + PRE-PUT content reconcile (#46)

Author: Desktop lane. Verification: bash-only dryRun (read-only, no Naver PUT) + Filesystem read. Supersedes the D4 section of HANDOFF_2026-06-20_c6-verified-d4-reconcile-plan.md.

---

## 1. D5 RESOLVED — 명화 resume mechanism EXISTS (D6 not needed)

Code self-corrected (#44) across two turns (first "no resume route / D6 needed", then "update route covers it"). The two reports contradicted, so Desktop independently verified (#45):

- **Mechanism**: `POST /api/naver/products/update {confirm:true}` → full-replace `PUT origin-products/13564133057`, builder emits `statusType: 'SALE'` → resumes 판매중지(SUSPENSION) + refreshes all content. (Code: product-builder.ts:937.)
- **Layer 1 (code fact) — VERIFIED** via independent prod dryRun: `payloadPreview.statusType = 'SALE'`, dryRun=true, mode=UPDATE, no Naver touch.
- **Layer 2 (Naver honors statusType:SALE for SUSPENSION→SALE)** — supported by: project doc MYEONGHWA_PUBLISH_READINESS_2026-06-07 ("statusType SALE (PUT 시 판매중지 해제)") + Naver Commerce API domain knowledge (originProduct PUT statusType is seller-settable for SALE/SUSPENSION/CLOSE; only OUTOFSTOCK is stock-derived/read-only — the api-client "read-only" note was OUTOFSTOCK-scoped, which misled Code's first report).
- **publishReady is irrelevant for 명화** (it is the first-publish gate: status==='DRAFT' && naverProductId===null). 명화 = already-listed → resume via the UPDATE route. (Prior handoff's "thumbnailAssessed gates publish" framing was wrong; corrected.)
- validation on the dryRun: **readinessGrade=S/94, attributeGrade=A/80, errors=[], warnings=[], missingRequired=[].**

## 2. SUSPENSION root cause — RESOLVED in current payload

The 2026-06-07 doc flagged the LIKELY suspension cause = 생활화학제품 (household-chemical) labeling, and worried the dryRun preview omitted the 안전확인 신고번호 (HB). Desktop re-checked the full payloadPreview:
- `productInfoProvidedNotice` PRESENT; **HB21-12-2572 + HB19-12-1462 both present**; qualityAssurance present, 신고번호 present.
- So the current payload carries the household-chemical compliance data → a resume PUT would include it (addresses the likely suspension cause). 

## 3. ★ PRE-PUT CONTENT RECONCILE (#46) — must resolve BEFORE the irreversible full-replace PUT

The full-replace PUT overwrites Naver entirely (`note`: omitted fields are removed). The dryRun payload currently carries:

| Field | Payload value | Concern | Operator/Desktop action |
|---|---|---|---|
| optionCombinationValues | **4** = [레몬유칼립, 에이프릴 후레쉬, 블랙체리, **코튼어라운드**] | 코튼 was stock=0/excluded in prior context → would list an out-of-stock scent | Operator: restock 코튼 (publish 4) OR exclude (publish 3) |
| originAreaInfo | **originAreaCode 0200037 = 중국**, importer "상세페이지 참조" | 2026-06-07 doc said 국산(00) — DISCREPANCY, 원산지표시법 legal-sensitive | Operator: confirm TRUE origin (China-imported dropship vs domestic); fix DB if wrong |
| representativeImage | `thumbnail/thumb-cropmain-1780913225888.png` | NOT the recent Firefly composite (`thumbnail-firefly-composite-...jpg`) — the ingested composite was never wired to main_image_url | Desktop/Code: decide intended 대표이미지; update main_image_url to the Firefly composite if that is the intent |
| salePrice | 29000 | prior memory had 14300 (stale) — 29000 likely current | Operator: confirm price |
| HB safety / 정보고시 | present (HB21, HB19) | OK | (verified) |

## 4. Resume sequence (corrected)

1. Operator decides the §3 content items (origin truth, 코튼 in/out, price, 대표이미지).
2. Desktop/Code apply DB fixes (all reversible) → re-run dryRun to confirm payload reflects decisions.
3. **Operator GO (#46)** — origin labeling + option count explicitly confirmed (irreversible).
4. Desktop executes `update {confirm:true}` → PUT (irreversible, Naver contact). **Code never auto-runs this.**
5. Desktop post-PUT 3-tier verify: statusType=SALE (판매중 live), HB in 정보고시, origin correct, options correct, 대표이미지 correct.

## 5. NEW PRINCIPLES (record in PRINCIPLES_LEARNED)

- **#110** — Resuming an ALREADY-LISTED product (naverProductId set, SUSPENSION) = the UPDATE-route full-replace PUT with `statusType:'SALE'`, NOT the publishReady first-publish gate. No new endpoint (D6) needed. The two publish paths (first-publish vs update/resume) are distinct; route each product by state.
- **#111** — Before any irreversible full-replace PUT, DEEP-INSPECT the dryRun payloadPreview (options, originAreaInfo, representativeImage, salePrice, productInfoProvidedNotice/HB). The preview is the source of truth for what OVERWRITES Naver. Never trust "just run update {confirm:true}" without a payload reconcile — full-replace removes omitted fields and can publish wrong origin/OOS-options/stale-image irreversibly.
- **#112** — Ingesting a new asset (e.g. Firefly composite thumbnail) does NOT auto-wire it as the product's main_image_url; the publish payload may still carry the old image. Asset ingest and main_image_url wiring are SEPARATE steps — verify the publish payload's representativeImage matches the intended asset.
- **#44 reinforced** — A grep false-negative misled Code into a wrong D5 report; direct file read (sed/awk) + prod dryRun corrected it. Trust direct reads + empirical dryRun over grep; and Desktop must independently re-verify when Code reports contradict across turns.

## 6. 작업 유의사항
- update dryRun = read-only/#26-safe (POST without confirm:true). NEVER send confirm:true without operator GO (#46, irreversible Naver PUT).
- This turn used bash + Filesystem only (no Supabase/browser) → FS-write allowed.
