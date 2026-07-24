# HANDOFF 2026-06-21 — Unified Effort-Lane (단순/디테일 ⊇ 공급사 A/B) + Seed-Planting Gate + 명화 resume (option a)

Lane: Desktop (English; Code formalizes into Korean authority docs per #41)
Rev: rev2 2026-06-21 (corrects rev1's "distinct axis" framing -> SUBSUMES; locks 명화 = option a)
Status: Operator workflow-alignment confirmed. One UNIFIED lane axis to formalize.

---

## 0. Why this doc
Operator (대표님) delivered a foundational workflow alignment (2026-06-21), corrected the axis model, and chose the 명화 path. This doc = the confirmed understanding + the gap + corrections + Code formalization tasks. Recorded to memory #17 (origin) + #18 (workflow essence, corrected).

---

## 1. Operator essence (confirmed understanding)

### 1.1 UNIFIED EFFORT-LANE — 단순 (Simple) / 디테일 (Detail), which SUBSUMES supplier A/B  [CORRECTED MODEL]
- **단순 과정 (Simple lane)** = the fast path the ACTUAL publish/upload uses. Quick crop-based thumbnail/detail. 명화 went through this -> stale-crop representative image is EXPECTED simple-lane output, not a bug.
- **디테일 과정 (Detail lane)** = full premium pipeline: Firefly 3-plane natural composite (Nano Banana Pro). Currently TESTED/developed.
- **Actual publish = Simple lane.** Detail lane feeds publish only once validated.
- **CORRECTION (operator):** the 단순/디테일 axis is NOT a separate axis from supplier A/B. It is the EXTENDED, TOP-LEVEL unifying axis that **SUBSUMES** the supplier-asset-quality A/B routing. A/B (`IMAGE_DETAIL_TWO_BRANCH_SYSTEM.md`: A=supplier assets good->reuse / B=poor->crop·generate) becomes the **asset-quality SUB-ROUTING that operates inside each lane**. One unified hierarchy:
  ```
  EFFORT LANE (단순 | 디테일)            <- top axis: how much premium effort / which is published
    └─ ASSET-QUALITY ROUTING (A | B)     <- inner: reuse supplier assets vs crop/generate (existing A/B doc, absorbed)
        └─ SEED-PLANTING GATE (씨앗심기) <- front gate before design in either lane (see 1.2)
  ```

### 1.2 SEED-PLANTING FIRST (씨앗심기 -> 온실 아틀리에)  [ORDER GATE]
- Price/margin verification REQUIRES sourcing info filled by 씨앗심기 (SEO/ROI sourcing seed via crawl).
- Correct order: 크롤링 -> 씨앗심기 (fills sourcing) -> (wholesale-provided info + 씨앗심기 sourcing) -> 온실 아틀리에 (design).
- 명화 VIOLATED this: jumped straight to design before sourcing filled -> sourcing incomplete -> **price/margin NOT verifiable**. Price BLOCKED on a seed-planting backfill (NOT an operator yes/no).
- Maps to canonical 7-step: 씨앗심기 = STEP1 인제스트(크롤링) + SEO/ROI sourcing seed feeding STEP2-5; design = STEP6. 명화 skipped to STEP6.

### 1.3 CANONICAL DETAIL-LANE PIPELINE (operator's 11-step "essence")
1. SEO/ROI 씨앗심기  2. 썸네일 컨셉 + 상세(아티팩트) 틀  3. 썸네일·상세 이미지 생성  4. 누끼컷  5. Firefly 3-plane 자연합성(Nano Banana Pro)  6. 폴더 적재  7. MD 일괄 + 병렬  8. 썸네일·상세 활용  9. 상세 추가이미지 제작  10. 디자인 커넥터(Figma/Canva/Adobe/Claude Design) 품질개선  11. 발행(최후, 비가역 #46)
> Maps onto existing 7-step but adds NEW STEP10 (design-connector quality pass). 단순 lane = compressed subset (skip 4-5 Firefly composite + 10 connector; quick crop -> publish).

### 1.4 System mandate (re-affirmed #55/#56/#62)
ALL of the above = 전상품 공통 시스템, 앱 개입점 자연 녹임(#56), 오류 프로젝트 전체 확장(#62). 명화 = validation case only.

---

## 2. GAP found (the actionable insight)
| Concept | Where it lives | Status |
|---|---|---|
| Unified effort-lane (단순/디테일) SUBSUMING A/B | nowhere as a unified model | **NOT formalized** — must absorb the standalone A/B doc as a sub-layer |
| Supplier-asset quality A/B | `IMAGE_DETAIL_TWO_BRANCH_SYSTEM.md` (standalone) | Exists, but isolated -> re-home as the lane's asset-quality sub-routing |
| 씨앗심기-before-아틀리에 + STEP10 connector | `PRODUCT_REGISTRATION_WORKFLOW.md` 7-step (partial) | Order exists; sourcing-gate->price dependency + STEP10 not explicit |

**Proposal (Code -> Korean authority docs):**
1. Formalize the UNIFIED effort-lane: 단순/디테일 as the top axis; fold the existing A/B asset-quality routing in as the inner sub-routing (reference/absorb IMAGE_DETAIL_TWO_BRANCH). Each product carries lane state; publish reads simple-lane assets; detail-lane = premium test track. Surface lane + A/B sub-state in applyStatus / 개입 대기열.
2. 씨앗심기 explicit FRONT GATE: design not publish-complete until sourcing exists; price/margin card depends on it. New/extended intervention card `sourcing_incomplete` (flags design-ran-before-sourcing).
3. Add STEP10 design-connector quality pass to the canonical pipeline (detail lane).

---

## 3. Corrections to in-flight 명화 decisions
| Item | PRIOR (Desktop, WRONG) | CORRECTED (operator) |
|---|---|---|
| Axis model | "단순/디테일 = distinct axis from A/B" | **단순/디테일 SUBSUMES A/B** (A/B = inner asset-quality sub-routing) |
| 명화 path | "(a) backfill->resume OR (b) immediate resume" | **(a) 씨앗심기 백필 -> 정식 재개** (LOCKED; no immediate resume) |
| 코튼어라운드 | exclude | **KEEP as 품절** (stock 0, visible in options + 상세). Remove only on explicit instruction |
| 판매가 29000 | operator yes/no | **BLOCKED on 씨앗심기 sourcing backfill** (margin unverifiable until filled) |
| 대표이미지 | swap to Firefly | publish = simple lane -> stale crop expected; in-scope improvement = simple-lane REP white-bg finishing; Firefly = detail-lane test, NOT this publish |
| 원산지 | (re-questioned) | **중국산 SETTLED** (0200037). memory #17. Old doc 국산 = Code corrects |

---

## 4. 명화 resume — LOCKED PATH = (a)
Sequence (no immediate resume):
1. 씨앗심기 sourcing backfill (crawl 도매매 -> fill sourcing info: cost, margin inputs) — Code crawl/ingest + Desktop verify.
2. Confirm 판매가/마진 from sourcing.
3. Reversible DB: 코튼 품절(stock 0), 대표이미지 = simple-lane (optional REP white-bg finishing), price confirmed.
4. re-dryRun (`POST /api/naver/products/update` no confirm) -> verify payloadPreview.
5. Operator explicit GO (#46).
6. `POST /api/naver/products/update {confirm:true}` full-replace PUT (emits statusType='SALE' -> lifts SUSPENSION; verified #110/#113; D6 NOT needed).
7. Post-PUT 3-tier verify.

---

## 5. New principles (Code -> PRINCIPLES_LEARNED.md)
- **#116** — Unified EFFORT-LANE: 단순(=publish path) / 디테일(=Firefly 3-plane premium test) is the TOP axis and SUBSUMES the supplier-asset-quality A/B routing (A/B = inner sub-routing, not a separate axis). Actual publish uses the simple lane; a simple/stale representative image on a live product is the simple lane working as intended.
- **#117** — 씨앗심기 (SEO/ROI sourcing seed) MUST precede 온실 아틀리에 design. Price/margin verification is gated on sourcing info; design-before-sourcing leaves price unverifiable. App flags design-ran-before-sourcing (`sourcing_incomplete` card).
- **#118** — Restock-unknown / temporarily-OOS options stay as 품절 (stock 0, visible in options + detail), never silently excluded. Remove only on explicit operator instruction. (명화 코튼어라운드.)

---

## 6. Code formalization tasks (queue; mirror to Korean PARALLEL_WORK_TRACKER §4)
- (P0, carried) D5 docs regression fix (resume = update route, statusType SALE, D6 CLOSED) + correct MYEONGHWA_PUBLISH_READINESS_2026-06-07.md 국산 -> 중국산(0200037). Record #113/#114/#115.
- (P1, NEW) Formalize §2 into PRODUCT_REGISTRATION_WORKFLOW.md: unified 단순/디테일 lane SUBSUMING A/B + 씨앗심기 front gate (`sourcing_incomplete`) + STEP10 design-connector. Record #116/#117/#118. Update PARALLEL_WORK_TRACKER §4. (Reference this handoff.)
- (carried) C15 (Storage API delete) -> C16 (archive/integrity util) -> C5 (E8 v2) -> C9 -> C4.

---

## 7. Board re-frame (authoritative; Code mirrors Korean PARALLEL_WORK_TRACKER §4)
- 명화 resume: path LOCKED = (a) 씨앗심기 backfill -> resume. Decisions settled (origin 중국, 코튼 품절, 대표이미지 simple-lane). GATED on sourcing backfill + GO. Not "ready to PUT."
- NEW system work (P1): formalize unified lane (⊇ A/B) + 씨앗심기 gate (Code docs + app surfacing).
- Parallel INDEPENDENT: Code (D5 docs fix, C15, C16, C5) / Desktop (D3 composite extension for 달항/아이스 = detail-lane test).
- CROSS: 명화 resume <- 씨앗심기 backfill + GO; lane-axis app surfacing <- §2 formalized; C9 <- C5.
