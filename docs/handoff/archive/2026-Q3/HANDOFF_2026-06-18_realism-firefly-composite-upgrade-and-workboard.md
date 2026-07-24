# HANDOFF — Realism + Firefly-Composite Strategy Upgrade & LIVE WORK BOARD (2026-06-18, S9 Desktop)

Lane: Desktop. Code prod HEAD = `7d54eb6`. This is the authoritative scheduling board for the current multi-parallel phase. Code mirrors the Korean PARALLEL_WORK_TRACKER from §4 (Code domain, #41).

---

## 0. WHY THIS DOC
Operator directive (strategy upgrade, not a patch):
1. COMPOSITE METHOD CHANGE: stop making background + cutout separately and pasting locally (PIL/sharp). Standard = **cutout → Firefly reference-composite via prompt**, selecting the best model per target. Native lighting/shadow/reflection/glass-transmission coherence; AI dissonance removed.
2. REALISM LANE HARDENED: hero / lifestyle / scene / composite ALL go at **real-camera photographic quality**. Amateur AI forgery reads as lowest-grade and backfires. Keep concept, AI-dissonance = 0, premium trust up. Camera spec + resolution + realism cues in every prompt, tailored to the product concept.
3. SYSTEM, NOT SINGLE CASE: fold into the adaptive Image+SEO Strategy Engine, product-agnostic, with natural app intervention points; errors fixed project-wide; situational-flexible scheduling.
4. MD MANAGEMENT: thorough priority-scheduled, dependency-mapped board so parallel work never tangles/drops and the operator never has to re-ask whether to proceed.

---

## 1. COMPOSITE METHOD — NEW STANDARD (product-agnostic)
OLD (retired as stopgap): generate empty background plate -> paste cutout with PIL -> manual shadow. Looks pasted; AI/composite tells.
NEW STANDARD: **cutout(누끼) -> Firefly reference-composite -> prompt builds the scene around the real product.**
- Attach the product cutout as the reference image; prompt instructs Firefly to place the EXACT attached product into the described scene (do not redraw the product/label/glass/caps).
- Model selection per target: **Nano Banana Pro** = strongest for compositing/editing (recommended for composite/hero-in-scene). Firefly Image 5 = Adobe-indemnified alternative. Pick best per artifact.
- Local PIL/sharp = FALLBACK only (last resort), never the primary composite.

## 1a. 명화 thumbnail — execute now (operator runs Firefly)
- Attach cutout: `https://doxfizicftgtqktmtftf.supabase.co/storage/v1/object/public/product-assets/cmpnooli40001f0gveaxr8iim/cutout/cutout_C_single_frontal_371x460.png`
- Model: Nano Banana Pro. Ratio 1:1. 2K. (Optional: also drop the approved warm-natural bg as a scene reference.)
- Prompt (realism-hardened, product-concept camera):
```
Using the attached product exactly as provided (do not redraw or alter the bottle, the
painting on its label, the clear glass, or the wooden diffuser caps), place it standing
naturally on a warm cream travertine tabletop with a light natural-wood edge, in soft
morning window light from the left. A few soft sage-green olive leaves and small yellow
wildflowers rest on the surface in the upper-right background, gently out of focus. The
product casts a realistic soft contact shadow and a faint reflection on the polished
stone; the window light wraps the glass and wooden caps consistently with the scene.
Warm cohesive palette of sage-olive green, warm cream, sunlit yellow and light natural
wood, harmonizing with the impressionist painting on the bottle.
Shot on a Hasselblad medium-format camera, 100mm lens at f/4, soft diffused natural
light, shallow depth of field, true-to-life color, fine natural film grain, high
microcontrast, photorealistic editorial product photography. Square 1:1. No text, no
logos, no extra products, no illustration, no CGI or 3D-render look.
```
- The PIL v1 (`/mnt/user-data/outputs/myeonghwa_thumbnail_v1.png`) validated COMPOSITION (product center-left, foliage right) + PALETTE HARMONY only; it is NOT the deliverable. Firefly-composite output is the deliverable -> Desktop ingest(stage=thumbnail, 1:1) on operator approval.

## 2. REALISM SYSTEM — product-agnostic (Code folds into engine, item C6)
- **REALISM-CAMERA-BLOCK** appended to EVERY image slot prompt (hero/lifestyle/scene/composite): real camera body + lens + aperture + natural light + fine film grain + true-to-life color + high microcontrast + "photorealistic editorial photography" + exclusions "no CGI, no 3D-render look, no AI artifacts, no illustration."
- **Per-product-concept camera selection** (extends MoodCode->camera): premium still-life art -> medium-format 100mm f/4; lifestyle -> full-frame 35-50mm; macro detail -> 100mm macro; etc. Concept drives the body/lens/aperture.
- **Composite slot standard** = cutout->Firefly reference-composite instruction (use attached exactly + scene + realism block + model recommendation), NOT separate-bg+paste.
- This is the Realism Lane (#71) hardened with camera-realism + anti-AI-tell. Project-wide (#62): the AI-dissonance failure -> standard for ALL products, not a 명화 fix.

## 3. PRINCIPLES TO REGISTER (Code 박제, PRINCIPLES_LEARNED)
- #105 컨벤션은 상품 정체성에 복무한다 (충돌 컨벤션은 정체성이 오버라이드).
- #106 어우러짐 = 배경이 상품 자신의 작품 세계(productAestheticDna 팔레트/무드)를 에코; 카테고리 컨벤션=포맷, 상품 정체성=팔레트/무드.
- #107 (NEW) 합성/이미지 표준 = 누끼컷 -> Firefly 레퍼런스 합성(최적 모델), 전 이미지 실사 카메라 품질(REALISM-CAMERA-BLOCK + 상품 컨셉별 카메라). 로컬 PIL=폴백. AI 이질감 0 = 프리미엄 신뢰.

---

## 4. LIVE WORK BOARD (priority-scheduled, dependency-mapped)
Priority P0 (now) > P1 > P2 > P3. Status: DONE / WIP / QUEUED / GATED. Lane: D=Desktop, C=Code, O=Operator.

### Desktop lane
| id | task | P | status | depends on | next |
|----|------|---|--------|-----------|------|
| D1 | 명화 thumbnail via Firefly ref-composite -> ingest(thumbnail 1:1) | P0 | WIP | O1 | ingest on approval |
| D2 | persist strategy upgrade + work board (this doc) | P0 | DONE | - | - |
| D4 | 명화 publish prep verify (payload, certs, title) | P1 | GATED | D1 + C3 | after thumbnail + "차량용" title |
| D3 | extend composite/realism pipeline to 달항아리 + 아이스트레이 | P2 | QUEUED | D1 validates | per-product cutout -> Firefly ref-composite |

### Code lane
| id | task | P | status | depends on | notes |
|----|------|---|--------|-----------|-------|
| C0 | current increment (operator delivers output) | - | WIP | - | await output |
| C3 | SEO 골든키워드 가드 (명화 "차량용" missing) | P1 | QUEUED | - | independent; immediate 명화 sales effect |
| C6 | REALISM-CAMERA-BLOCK + Firefly-ref-composite standard into engine | P1 | QUEUED | - | NEW from directive; all slots; composite slot = cutout->Firefly instruction |
| C1 | 향 §4 v6 prose replace (v6 authoritative) | P2 | QUEUED | - | engine per-scent mood already live |
| C2 | (C) archive utility -> clears 자산정합 card | P2 | QUEUED | - | targets in §6 |
| C5 | E8 v2 build (benchmark->asset->graft) | P2 | QUEUED | C6 (realism block) | spec: convention SPECTRUM + identity-override(#105) + productAestheticDna palette-echo(#106) + realism(#107) + prompt-asset library + 벤치마크 리서치 검토 card + Design Readiness lane |
| C9 | INFO-DEP-DESIGN-GATE (Design Readiness lane + pre-gen pool) | P2 | QUEUED | C5 partial | - |
| C4 | E6 assetization closed loop (persistStrategy + SlotGeneration<->asset) | P2 | QUEUED | - | independent |
| C10 | principle 박제 #105/#106/#107 | P2 | QUEUED | - | with C5/C6 |
| C7 | firefly_auto settingsVerified subcheck | P3 | QUEUED | - | - |
| C8 | 옵션 3표현 정합 | P3 | QUEUED | - | - |
| C11 | guard refinement: variantUnmatched -> skip auto-register / review stage | P3 | QUEUED | - | optional |
| C13 | duplicate `route 2.ts` deletion | P3 | GATED | operator GO | - |
| C12 | E7 engine integration | - | GATED | explicit GO | 🔒 do not start without GO |

### Operator lane
| id | task | P | status |
|----|------|---|--------|
| O1 | run Firefly ref-composite for 명화 thumbnail (cutout_C + §1a prompt + Nano Banana Pro) | P0 | pending |
| O2 | deliver current Code increment output | - | WIP |
| O3 | 명화 publish GO (irreversible) | P1 | GATED (after D1 + C3) |
| O4 | cotton 어라운드 restock/exclude decision | P3 | pending |

### Dependency map
- D1 <- O1 ;  D4/O3 <- D1 + C3 ;  C5 <- C6 ;  D3 <- D1 ;  자산정합 card cleared <- C2 ;  C12(E7) <- explicit GO.

### Schedule (decisive; proceed without re-asking except GATED)
- PARALLEL NOW: O1 (operator Firefly) ‖ C0 (Code current) ‖ D2 (done this turn).
- Code order after C0: **C3 (P1) -> C6 (P1) -> C2/C1 (P2) -> C5 (P2) -> C9 -> C4 -> C10 -> C7/C8/C11 (P3)**. C12(E7) only on GO.
- Desktop: D1 (ingest after O1) -> D4 (publish prep) -> D3 (extend to other products).
- GATES (wait for explicit operator action only): O3 publish, C12 E7, C13 route2 delete, O4 cotton.

---

## 5. CODE 7d54eb6 — VERIFIED LIVE (carry-forward, this segment)
- defect A/B = 0/0 (strategy API). E5 scent_note 3 per-scent concept backdrops + per-scent mood M4(lemon warm)/M5(april high-key)/M6(cherry low-key), product-as-margin, no 'in natural', reserve-margin. ingest variant guard: typo `에이프릴 후레쉰` -> variantUnmatched:true + validVariants + optionVariant:null (binding rejected). 3/3 variant card -> 자산정합 card auto-surfaced (DOM).

## 6. (C) ARCHIVE TARGETS (for C2 utility)
- ARCHIVE: `cmqiii7hh` (후레쉰 orphan), `cmqibvanp` (lemon v5), `composite/guard-test-delete-1781731490193.png` (unbound test artifact).
- REVIEW-THEN-ARCHIVE: ~11 stale 06-13~17 non-variant composites (7x lifestyle, hero_lifestyle, fresh_lifestyle, botanical `cmqd9pwpl`, fresh-1781657005726.jpg `cmqhckwok`).
- PRESERVE: `cmqhckycz` dark_luxury (NOT main thumbnail; dark-context option only).
- Note storage-registry drift: 3 cutouts exist only in storage.objects (cutout_A/B/C), not asset_registry. C2 should optionally backfill registry for cutouts.

## 7. FOR CODE — paste block (sync)
Reconcile Korean PARALLEL_WORK_TRACKER to §4 board. Queue order C3 -> C6 -> C2/C1 -> C5 -> C9 -> C4 -> C10 -> P3s. Register #105/#106/#107. Build C6 (realism-camera-block all slots + composite=cutout->Firefly-ref standard) before C5 (E8 v2). E8 v2 spec = §2 + §3 principles. E7 = GO gate.

## 8. APP STATUS (prod 7d54eb6)
- 명화: 판매중지(intended) S/94; E5+mood+guard LIVE+VERIFIED; variant 3/3; queue=자산정합; title missing "차량용". Thumbnail: Firefly-ref-composite pending (O1).
- 아이스: 발행불가 A/84; queue=필수속성(재질).
- 달항: 발행준비 A/84; queue=대표컷(크롭); margin 23%.
