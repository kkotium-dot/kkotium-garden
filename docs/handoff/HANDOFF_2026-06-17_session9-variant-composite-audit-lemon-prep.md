# HANDOFF — Session 9 Desktop: variant-composite audit + per-orphan reconcile verify + Lemon prep

- **Date**: 2026-06-17
- **Lane**: Desktop (MCP / verify / browser / docs)
- **Conversation**: "중단된 작업 이어서 진행" (sessions 7-g … 9, 2026-06-14 → 06-17)
- **Production HEAD at write time**: `dbbca92` (working tree clean)
- **Target next sessions**: Code CLI (variant_composite card build) + next Desktop (Lemon proof-gen)
- **Branch**: main only (no feature branch active)

---

## 0. Why this doc exists (#49, #69/#70)

Desktop persists its own English handoff after each session segment. This doc closes the **session-9 Desktop segment** that ran AFTER the origin-gate verification (already captured in `HANDOFF_2026-06-17_origin-gate-desktop-verify.md` and `_prod-verify-registry-storage-drift.md`). It records: 3 browser/DB verifications, 3 corrected memory errors, the new `variant_composite` intervention-card spec for Code, and the finalized Lemon Firefly prompt + settings. The chat body carried the 2 lean paste blocks; this is the durable on-disk record.

---

## 1. Full conversation arc (17-session lineage, for continuity)

The dominant theme of this entire conversation = **thumbnail + detail-page image generation improvement → systemic-defect discovery → strategic pivot to a product-agnostic Image+SEO/ROI Strategy Engine → research codify → engine build/verify → origin/drift/variant systematization.** Lineage (from transcript journal):

| # | Date | Milestone |
|---|---|---|
| 7-g | 06-14 | 4-scent mood backgrounds redesign (#71 photoreal-only / #72 edit-mode); Firefly DOM RE; 4-scent gen start |
| 7-g/h | 06-14 | Adaptive image engine + folder system; aspect-ratio root-cause + adaptive settings matrix; folder auto-classify + legacy backfill dry-run |
| 7-h/i | 06-14 | UI redesign 5-tab→3-tab workbench IA; Korean-first labels; in-app delete; content-aware classifier honesty |
| 7-i | 06-15 | backfill verify; PNG classifier alpha-overfire bug fix; 2 dangling-DB-ref defects Code audits missed |
| 7-i/j | 06-15 | #80 stale-listing cache bug (assets API served stale Next Data Cache for ALL products) → Code fix `0f85014` → prod re-verified |
| 8 | 06-15 | #81 asset-integrity guard verified; v5 Firefly prompts; Firefly 4-cut gen (Control-Chrome JS wall → real-click → edit-mode Nano Banana); #82 max-automation; cut-1 Lemon + cut-2 Cotton; reference-contamination bug+fix; Sony-camera-hardcoding root-cause → diversified camera-mood map |
| 8 | 06-15~16 | 6-axis mood-to-camera-spec system (deep research + artifact) codified into docs/research + authority doc + 5 trackers |
| 8 | 06-16 | cut-3 (April/Canon R5) + cut-4 (Cherry/Leica SL2) generated (new reliable reference-clear path); operator STRATEGIC PIVOT → build product-agnostic Image+SEO/ROI Strategy Engine (not prompt tweaks); deep research → Korean research doc |
| 8 | 06-16 | research scope corrected fully product-agnostic; engine blueprint briefing; parallel-work orchestration + session-continuity demanded; engine authority doc + "작업 관제탑" board + 3 new principles; LIVE Naver DataLab/search (PlayMCP) proved engine L0 + first Category DNA seed |
| 8 | 06-16 | engine Stage 0 build (Code `349b9db`, Generation→SlotGeneration rename, 6 Supabase tables); INDEPENDENT 3-tier verify PASS; Stage 1 UI/UX design (9-slot funnel board) + existing-code reuse map |
| 8 | 06-16 | Stage 1 build + 6-axis merge; ENG-1 verify; CAT-CODE-명화 found (4 fallback slots — category mismatch) |
| 8→9 | 06-17 | CAT-CODE-명화 RESOLVED (engine code correct; category normalized 50003356→50014980, 0 change); COMPREHENSIVE ENG-1 browser verify (3 tabs + 6-axis + asset browser + gate PASS); product-agnostic #62 live-proven (아이스트레이=6 slots, scent_note not inherited); Code session-9 REGISTRY↔STORAGE drift system; PUBLISH legal-risk verified (origin China/0200037, options 3, Cotton dropped) |
| 9 | 06-17 | ORIGIN-TRUTH-GATE (#95); publish-panel origin row UI; registry_drift card; per-orphan reconcile UI; **Lemon per-variant audit; Lemon prompt + memory corrections (this doc)** |

Research library to always consult is in `docs/research/`. The three produced in this conversation: `IMAGE_SEO_STRATEGY_ENGINE_RESEARCH_2026-06-16.md`, `MOOD_TO_CAMERA_SPEC_RESEARCH_2026-06-16.md`, `CATEGORY_DNA_SEED_50014980_2026-06-16.md`. Foundational: `KKOTIUM_ADAPTIVE_SEO_IMAGE_SYSTEM_2026-06-06.md`, `KKOTIUM_HYBRID_PIPELINE_SYSTEM_DESIGN_2026-06-06.md`, `KKOTIUM_IMAGE_PIPELINE_RESEARCH_2026-06-05.md`, `REFERENCE_DETAIL_TEARDOWN_ascent_2026-06-13.md`, `FIREFLY_AUTOMATION_RESEARCH_2026-05-30.md`.

---

## 2. This segment — verifications (all real, no fake reports — #45/#82/#88)

### 2.1 registry_drift intervention card RENDER — PASS (#88)
- Surface: `/dashboard` control tower → 개입 대기열 (Operator Action Queue).
- Confirmed **3 products × 3 intervention types coexisting, product-agnostic**:
  - 명화 → "자산 정합 — 등록/정리 결정" (`registry_drift`)
  - 아이스트레이 → "필수 속성(재질)" (attribute)
  - 달항아리 → "대표 컷(크롭)" (crop)
- Detail chips measured: 미등록 파일 22 (storageOnly) · 인덱스 고아 1 (registryOnly = `botanical`) · sample paths (`cutout_A_set_refill_clip`, `backdrop-S6`, `myeonghwa-backdrop-860`) · hint · deeplink `tab=image`.
- This queue is the live proof of the operator's "전상품 공통 개입점, 순서 강제 없음" principle (#56).

### 2.2 per-orphan reconcile UI — PASS (#88, build `dbbca92`)
- Reloaded `/dashboard` (fresh bundle) → 명화 card "고아 검토·정리" → panel loaded.
- Confirmed: 22 storageOnly orphans (등록/아카이브 per-row), 1 registryOnly (`botanical`, 정리), path rendering (cutout_A/B/C, backdrop-S6, botanical).
- Button map: 45 total = 22×2 (register/archive per-row) + 1 정리 (all per-row + bulk).
- **confirm gate verification**: `element.click()` did NOT fire the React handler (looked like a no-op — no confirm, no POST, no mutation). Re-tested with a full dispatched `MouseEvent` sequence (pointerdown/mousedown/pointerup/mouseup/click, bubbles:true) → the REAL native confirm "선택 파일을 아카이브로 이동합니다. 계속할까요?" fired on the operator's screen → **operator cancelled → mutation 0 (drift 22/1 unchanged)**. Gate (#46) PASS.
- LEARNING: `element.click()` is unreliable for React; the window.confirm override was inactive at that moment so the real dialog surfaced; operator cancel kept it safe. Actual orphan register/archive decision is left to operator curation (#56) — especially `cutout_A/B/C` are PRESERVE (register) targets, never auto-archived.

### 2.3 Lemon per-variant composite AUDIT (Supabase, data lane) — gap confirmed
Four queries (all `execute_sql`, project `doxfizicftgtqktmtftf`):
1. 명화 composite storage = **20 files, ALL mood/lifestyle-named** (dark_luxury/fresh @06-17 · lifestyle ×9 @06-13 · lifestyle-golden/fresh ×9 @06-11), **ZERO scent-explicit filenames**.
2. `asset_registry` columns = `id, product_id, stage, angle, mood, slot, context, file_name, path, width, height, source_tag, created_at` — **NO variant / scent / option_value column**.
3. 명화 `asset_registry` composite rows = 12; `mood` (dark_luxury/fresh/botanical/null), `slot` (hero only 1 row), `context` (lifestyle), **0 scent identifier**. `botanical` (manual_upload) = registry-only = the 1 orphan. 06-11 ×9 = storage-only unregistered (part of the 22).
4. `Product`: hasOptions, COMBINATION, `optionValues` = ["레몬유칼립","에이프릴 후레쉬","블랙체리"], `options` jsonb = 4 (레몬/에이프릴/체리 stock 999, **코튼 어라운드 stock 0**).

**ROOT CAUSE**: images are tagged only by mood·slot; the **variant (scent/color/size) binding dimension is absent at all 3 layers** (filename / schema / data). Result = **scent coverage 0/3**. This is a project-wide defect for ANY product with options (#62), not a 명화 one-off.

---

## 3. Memory corrections (#96 truth = measured value)

Located finalized prompt in `docs/playbook/SCENT_MOOD_4SCENE_GRADE_2026-06-13.md` (disk-persistence concern resolved). Three prior-memory errors corrected against the on-disk authority:

| Item | WRONG (prior memory) | CORRECT (measured) |
|---|---|---|
| Lemon time-of-day | sunset | **early morning / cool first light** (sunset = Black Cherry) |
| Camera | Canon R5 / RF85 | **Sony A7 / 50mm f/1.8** (fixed across all 4 cuts) |
| Generation surface | standard / 16:9 / grounding OFF | **edit mode + Nano Banana Pro + Google-search grounding ON · 3:4 portrait (→ in-app Sharp crop 4:5) · 2K+** |

Scent narrative "하루의 빛 시퀀스": Lemon-Eucalyptus = early morning/cool · Cotton = midday high-key (SOLD OUT) · April = rain-cleared afternoon diffuse · Black Cherry = sunset golden hour. Unifying axis: Sony A7 50/1.8 + filmic + upper-center breathing room (bottle composite slot). Active 3 scents only (Cotton excluded, stock 0). Version: disk authority = v5 (session 7-g rev3); the "v6" in prior memory does NOT exist on disk.

**Finalized Lemon prompt (paste-ready, v5 photoreal §4):**
> A photorealistic still-life photograph of fresh lemons and eucalyptus sprigs on a pale stone ledge in an early-morning garden, dewdrops catching the first cool sunlight, soft natural mist, palette of light yellow-green and olive, crisp clean morning air, natural light, shallow depth of field with gentle bokeh, fine photographic grain, clean neutral-cool color grade, matte finish, clean breathing room in the upper-center for a small bottle, vertical composition, shot on Sony A7 50mm f/1.8, bright cool morning light. No people, no text, no logos, no painting, no illustration, no painterly effect.

Critical: **reference 0 enforced** (prior failure = reference residue → April flowers leaked into Cotton). #71 painterly-finish 0. April / Cherry prompts also in §4 of the same playbook file.

---

## 4. variant_composite intervention card — SPEC (Code-ready)

Hand to Code as the next cross-lane build. Pairs with realism_lane guard (§5).

- **Data model**: add `variant text NULL` to `asset_registry` (additive, non-reversible 0, non-variant rows = null). Optionally a normalized `variant_key` later.
- **Coverage metric**: denominator = product options where `stockQuantity > 0` (명화 = 3); numerator = distinct `variant` bound to a composite (orphans excluded); missing = set difference.
- **Card**: `INTERVENTION_VARIANT_COMPOSITE`; category = image-generation (same family as 달항 대표컷); label "변형별 대표 컷 (N/M)"; payload `{active, covered, missing, ratio}`; deeplink `tab=image`; seed when `coverage < 100% && hasOptions`; clear at 100%; cron evaluates ALL products always (전상품 상시).
- **Ingest**: add a `variant` param to `ingest-firefly` so generated scent backgrounds bind to the variant on upload.

---

## 5. Realism-lane guard pairing (complementary, bundle with §4)

`docs/playbook/SCENT_MOOD_…` §7 realism_lane guard (#71) and the variant_composite card are complementary: one enforces **coverage** (every active variant has a representative cut), the other enforces **quality/authenticity** (photoreal only, no AI painterly). Hand both to Code together so the variant cut pipeline is gated on realism at ingest.

---

## 6. Side finding — option representation inconsistency (전상품 일관성 과제)
명화 expresses "3 active options" inconsistently across layers: `optionValues` = 3, `options` jsonb = 4 (incl. Cotton stock 0), `product_options` relation = 4 ALL ON_SALE. The Cotton "품절 not reflected in relation" = DATA DRIFT (operator decision: SOLD_OUT flag or row removal). Reconcile task for Code maintenance lane.

---

## 7. App state — per product (at dbbca92)

| Product | Engine | Origin gate | Action Queue | Publish |
|---|---|---|---|---|
| 명화 (디퓨저) | 9-slot (7/9) + scent_note | PASS · 0200037 | 자산 정합 (registry_drift) · per-orphan UI | BLOCK (thumbnail unassessed + Cotton data drift) |
| 아이스트레이 | fallback 6-slot (4/6) | PASS · 0200037 (normalized) | 필수 속성 (재질) | BLOCK (image/SEO) |
| 달항아리 | uncategorized | PASS · 0200037 | 대표 컷 (crop) | after 명화 |
| ENGINE | Stage 0+1 LIVE | ORIGIN-GATE + origin-row UI + reconcile 4-stage + queue (전상품) | — |

---

## 8. Pending / next steps (priority)

1. ☐ [Desktop · Firefly] Lemon proof-gen: v5 morning prompt (§3), Sony A7, edit mode Nano Banana Pro, grounding ON, 3:4, 2K, reference 0. HONEST CAVEAT: selectors verified on standard-generate surface; edit-mode surface less verified → if unstable, report and hand the paste-ready prompt to operator to fire (Firefly tab) → Desktop ingests (POST `/api/products/cmpnooli40001f0gveaxr8iim/ingest-firefly`, stage=composite, scent tag). Then April / Cherry. Cotton excluded.
2. ☐ [Code · cross · this spec] variant_composite coverage card (§4) bundled with realism_lane guard (§5).
3. ☐ [Code · independent] Phase 3 slot assembly (on clean assets, after drift cleanup).
4. ☐ [Code · Stage 2 · independent] prompt subject refinement (`productSubject = product.name` leaks SEO-title gift/refill wording) + dna_coverage intervention (unseeded fallback → Queue) + CTR/CVR tuple logging/promote + per-slot 1-click rating.
5. ☐ [Operator · irreversible · #46] PUBLISH-명화: origin PASS (0200037) + thumbnail assessment (`thumbnailAssessed` false = current main blocker) + Cotton option decision + image/SEO completion → GO. HONEST: live Naver origin = per Code report (Desktop has not directly read Naver); DB = China confirmed.
6. ☐ [Code · maintenance] option 3-representation reconcile; TASK_BRIDGE 1037-line → T2 1500-series split.
7. ☐ 달항 + 아이스 full expansion (after 명화, #55); orphaned `lifestyle/` + obsolete composites + duplicate `route 2.ts` → reconcile card / curation. Stash `stash@{0} z3c-misdirected-changes-needs-redo` residual.

---

## 9. Dependency map (independent vs cross)

- **Code independent (no Desktop dep)**: per-orphan UI (DONE, Desktop-verified) / Phase 3 / Stage 2 / TASK_BRIDGE split.
- **Desktop independent (no Code dep)**: Lemon audit (DONE) · Lemon proof-gen (ingest route already exists).
- **Cross (ping-pong)**: variant_composite card (Desktop spec → Code build → Desktop verify) + any Code UI render verification (Code ships → Desktop #88).
- Current state: Code and Desktop can run fully in parallel.

---

## 10. New principles to codify (Korean trackers, via Code Python overwrite — #41)

- **#98** — Variant binding dimension: any product with options must bind representative cuts to each active variant; coverage is a first-class, queue-surfaced metric (transient mood/slot tags are insufficient).
- **#99** — `element.click()` is unreliable for React handlers in browser verification; always dispatch a full MouseEvent sequence (bubbles:true). Native window.confirm blocks JS — override before click OR have operator cancel.
- (Reaffirm #96 truth-by-measurement: prompt/camera/surface facts must be read from the on-disk authority, not recalled.)

---

## 11. Verification integrity note
Every PASS in this segment = real browser DOM probe or Supabase `execute_sql`. The element.click() no-op was caught and corrected (avoided a false "no bug" / "bug" call). The 3 memory errors were caught before generating a wrong image. No fabricated success (#82). The only thing NOT independently verified by Desktop = live Naver-side product state (Desktop has not read Naver directly; relies on Code report + DB = China).
