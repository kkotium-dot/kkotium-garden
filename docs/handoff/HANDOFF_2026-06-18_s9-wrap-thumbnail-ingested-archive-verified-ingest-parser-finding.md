# HANDOFF — S9 WRAP: Thumbnail Ingested + Archive Verified + Ingest-Parser Finding (2026-06-18, Desktop)

Lane: Desktop. Verified bash-only (no MCP connectors, #26-safe). Code prod HEAD reported `17a522f`.
Supersedes board status in HANDOFF_2026-06-18_realism-firefly-composite-upgrade-and-workboard.md (that doc remains the strategy/board authority; deltas below).

---

## 0. VERIFIED THIS TURN (bash 실측 — #45/#88 satisfied without trusting Code report)
| check | method | result |
|---|---|---|
| 명화 thumbnail ingest | bash POST prod /ingest-firefly stage=thumbnail | registered:true, 1600x1600, path=`.../thumbnail/thumbnail-firefly-composite-178177130878-1781771312176.jpg` |
| thumbnail publicUrl live | curl | **HTTP 200, 382,323 bytes** |
| Code archive — 후레쉰 phantom removed | strategy API payload scan | `"후레쉰"(U+C26C) in payload = False` ; `후레쉬(correct) = True` |
| scent_note variant coverage | strategy API slot scan | **3/3 = [레몬유칼립, 에이프릴 후레쉬, 블랙체리]** (no typo, in-stock only) |
| publish gate | strategy API gate | hardComplete T, seoComplete T, authentic T, naverPayloadComplete T, thumbnailPass T |
=> Code archive (C2) and §4/coverage state VERIFIED functionally live. Thumbnail live + clean coverage.

## 1. THUMBNAIL — DONE (D1 complete)
- Source: operator Firefly reference-composite (cutout_C attached -> Nano Banana/Gemini Flash), 2048x2048 0.49MB.
- Evaluation: real-camera photographic quality, AI dissonance ~0; product (painting/glass/wood caps) preserved exactly; native contact shadow + glass reflection; palette one-world (sage-olive / cream / sunlit-yellow / light wood echoing the impressionist label). Method VALIDATED (#107).
- Ingested as stage=thumbnail (1:1, 1600px web-JPEG 0.36MB, #91). LIVE 200.
- Composition note (not blocking): product sits corner/left (lifestyle-leaning). Strong as primary 감성 hero. For a tighter catalog 대표이미지, a centered 1:1 crop can be derived later from the same source — optional, current is publish-grade.

## 2. NEW SYSTEM FINDING (project-wide #62) -> Code item C14 + Principle #108
INGEST FILENAME-PARSER CONFLICT. The ingest response returned `conflict:true, nameStage:"composite", variant:"thumbnail-firefly-composite-178177130878"` because the filename contained stage tokens ("thumbnail"/"composite"). The parser inferred stage AND a variant FROM THE FILENAME, conflicting with the explicit `stage:'thumbnail'` param.
- Impact: file landed correctly in thumbnail/ (functional), and it did NOT pollute scent_note composite coverage (verified 3/3 clean). But the asset_registry record carries a junk `variant` string instead of null, and a false `conflict` flag.
- Root cause (system, not single-case): explicit `stage`/`variant` params do not authoritatively override filename-token inference; product-level ingests (thumbnail/hero) can be assigned a manufactured variant.
- Fix (C14, additive, project-wide): (a) explicit `stage` param wins over filename-inferred stage -> suppress false `conflict`; (b) `variant` only set when it matches a real option variant (getActiveVariants) OR is explicitly passed; product-level thumbnail/hero -> `variant: null`; (c) optionally normalize the one existing thumbnail record's variant -> null. Extends the existing INGEST-GUARD (variantUnmatched) family / C11.
- NOTE: do NOT re-ingest to "fix" — that adds clutter. The current thumbnail file is correct and live; C14 normalizes the record.

## 3. 명화 PUBLISH GATE — residual conditions (for D4/O3)
publishReady=false. Residuals:
1. `thumbnailAssessed=false` -> app thumbnail-assessment step pending. Operator has visually approved the image; the gate flag is a separate app step. Setting it moves toward publish = consequential -> hold for explicit publish flow (O3 GO). This is a natural intervention point (#56): a "대표이미지 평가/승인" card should surface now that a thumbnail exists.
2. SEO golden keyword "차량용": gate.seoComplete currently true ONLY because the golden-keyword guard is not built yet. C3 ADDS this check -> will surface "차량용" omission. Required before publish.
3. gate.status DRIFT: gate.status=ACTIVE + naverProductId=13564133057, but actual Naver state = 판매중지(SUSPENSION, intended). Engine status not reconciled with real Naver state. Reconcile in publish track before any resume.
=> 명화 publish (O3) gated on: thumbnail-assessment + C3 "차량용" + status-drift reconcile. Irreversible -> explicit operator GO (#46).

## 4. BOARD DELTAS (Code: sync into Korean PARALLEL_WORK_TRACKER §4)
- D1 thumbnail ingest+verify = **DONE** (live 200, coverage clean).
- D2 persist strategy+board = DONE. C1/C2/C10 = DONE (Code, verified C2 live).
- NEW **C14** ingest stage/variant parser guard (explicit param wins + product-level variant=null + suppress false conflict) — P1, independent, additive. Slots in Code queue near C3/C6 (guard family). 
- D4 명화 publish prep = GATED (thumbnail-assessment + C3 + status-drift). 
- NEW Desktop intervention-point note for C5/C9: "대표이미지 평가/승인" card surfaces when a thumbnail asset exists + gate.thumbnailAssessed=false.
- Schedule unchanged otherwise: Code C3 -> C6 -> C14 (guard family, can pair with C3) -> C5 -> C9 -> C4 -> P3; Desktop D1(done) -> D4(gated) -> D3.

## 5. 작업 유의사항 (running) — add to docs
- INGEST FILENAMES: never embed stage tokens ("thumbnail"/"composite"/"hero") or scent tokens in ingest filenames until C14 lands; use neutral names (e.g. `rep-<ts>.jpg`) to avoid manufactured variants/false conflict. After C14, explicit params are authoritative.
- VERIFY-BY-BASH pattern works for the full loop: curl public Supabase URLs (200/404) + prod APIs (strategy/matrix/ingest) — no MCP connector needed -> #26-safe. Reserve Supabase/Vercel/Chrome MCP for things bash cannot reach, and never mix MCP + FS-write in one turn.
- Gate reads are the source of truth for "done" (publishReady, coverage, authentic) — not Code prose.

## 6. 중요 원칙 (propose to Code 박제)
- #108 (NEW) INGEST 추론 종속성: 명시 stage/variant 파라미터가 파일명 토큰 추론을 오버라이드한다. 서술형 파일명이 가짜 변형을 만들지 않는다. 제품레벨(thumbnail/hero) ingest는 variant=null. (single-case 수습 금지·전상품 가드, #62)
- (#105/#106/#107 already registered by Code.)

---

## 7. PING-PONG — paste blocks

### -> CODE (independent of Desktop; proceed without re-ask)
```
[Desktop->Code · S9 wrap · thumbnail ingested+verified · archive verified · NEW finding C14/#108]
VERIFIED LIVE (bash): 명화 thumbnail ingested (stage=thumbnail, 1600^2, publicUrl 200).
  Code archive(C2) confirmed: 후레쉰(U+C26C) phantom ABSENT from strategy payload;
  scent_note coverage clean 3/3 [레몬유칼립·에이프릴 후레쉬·블랙체리]. gate authentic/payloadComplete=true.
NEW SYSTEM FINDING -> add C14 (P1, independent, additive, project-wide #62):
  ingest filename-parser conflict — filename stage tokens override explicit stage param,
  and descriptive filenames manufacture a junk variant. FIX:
   (a) explicit stage param wins over filename inference -> suppress false conflict
   (b) variant set only on real option-variant match or explicit param; product-level
       thumbnail/hero -> variant:null
   (c) optionally normalize existing thumbnail record variant -> null (no re-ingest)
  Register Principle #108. Sync board §4: D1=DONE, add C14, D4=GATED(thumbnail-assessment+C3+status-drift).
QUEUE (unchanged, GATED 외 재질문 없이 진행): C3(SEO 골든키워드 가드) -> C6(REALISM-CAMERA-BLOCK
  + Firefly-ref-composite 표준, E8v2 선행) -> C14(guard family, C3와 묶음 가능) -> C5(E8v2) -> C9 -> C4 -> P3.
  C12(E7)=🔒GO only.
GATES: tsc0·build0·이모지0·신규한글리터럴0·additive·비가역0·네이버 무접촉.
```

### -> DESKTOP (next session)
```
[Desktop self-handoff · next]
DONE: 명화 thumbnail live+verified; Code C1/C2/C10 verified; finding C14/#108 logged.
NEXT (gated/parallel):
  - D4 명화 publish prep verify: after C3("차량용") lands -> re-read strategy gate
    (seoComplete should reflect golden-keyword); confirm thumbnailAssessed path; reconcile
    gate.status ACTIVE vs Naver SUSPENSION. Then await O3 GO (irreversible #46).
  - After C14 lands: re-ingest is NOT needed; verify the thumbnail record variant normalized to null.
  - D3 extend cutout->Firefly-ref-composite + REALISM-CAMERA-BLOCK to 달항아리/아이스 (after C6 engine standard).
VERIFY METHOD: bash-only (curl public URLs + prod APIs). Keep MCP connectors out of FS-write turns (#26).
```

### INDEPENDENT vs CROSS
- INDEPENDENT (no cross-dependency): Code C3, C6, C14, C4 ; Desktop D3 (after C6). Run in parallel freely.
- CROSS (sequenced): D4/O3 publish <- C3 + thumbnail-assessment + status-drift ; C5(E8v2) <- C6 ; C9 <- C5.

---

## 8. APP STATUS (prod 17a522f, verified)
| 상품 | 상태 | 엔진/이미지 | 개입큐 | 발행 |
|---|---|---|---|---|
| 명화 | 판매중지(의도)·gate.status=ACTIVE(드리프트) | E5+per-scent mood+ingest guard LIVE; 향 3/3 clean(후레쉰 제거 검증); **thumbnail LIVE(Firefly 합성·실사)** | 대표이미지 평가 대기·"차량용" 누락(C3) | GATED: 평가+C3+드리프트 reconcile -> O3 GO |
| 아이스 | 발행불가 A/84 | fallback | 필수속성(재질) | BLOCK |
| 달항 | 발행준비 A/84 | 동일 | 대표컷(크롭) | 명화 후 |
| ENGINE | C3/C6/C14/E8v2(C5)/C9/E6/E7 backlog; archive util·per-scent mood·ingest guard LIVE | - | - | - |
