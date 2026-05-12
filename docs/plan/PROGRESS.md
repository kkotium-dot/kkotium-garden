# KKOTIUM GARDEN — 프로젝트 진행 현황
> 최종 업데이트: 2026-05-13 (Sprint 7-M2 Phase 2-b-3-b — B2B + S3 cleanup 3 렌더러 완료, **dedicated 27/27 ✅ 100% 달성**, 12 골격 모두 완전 dedicated)
> 활성 계획: Smart Asset Workflow v3.1 FINAL (CTI + 12 골격 + Claude 디자인 통합)
> 폐기 계획: Sprint X (Gemini 제거 + 5섹션 일괄 템플릿, 2026-05-11 채택 후 익일 폐기)
> TSC: 0 errors | npm run build 28/28 OK | Production: https://kkotium-garden.vercel.app
> 다음 작업: Sprint 7-M2 Phase 2-c (lifestyle-picker: LifestyleAsset 30일 cooldown + 태그 매칭) → Phase 3 (`/api/products/[id]/generate-detail` route + Diagnosis 연동 + Supabase Storage 업로드)

> **시각 검증 (Production smoke + Functional + 브라우저 E2E — Sprint 7 P1 단계)**: production smoke 모든 endpoint 200 ✅ / P1-A `/api/category/suggest`: 레깅스→`applied:"agreed"` dominantShare=1.0, 인테리어 소품→`applied:"synthesized"` dominantShare=0.8 ✅ / P1-C `/api/tags/verify`: 레깅스/요가복/면팬티 verified, garbage→weak (threshold fix 후) ✅ / **브라우저 E2E (Claude Preview)**: P1-B NameRulesPanel 3 시나리오 모두 정확 발화 (금기어 5개+중복 가을×3 critical red / 특수문자 4종 warning yellow / 정상 → 패널 미노출) ✅ + P1-A 카테고리 자동 추천 버튼 → 패션의류>여성언더웨어/잠옷>잠옷/홈웨어 자동 입력 ✅ + P1-C TagVerificationPanel 3개 태그 입력 → "SEO 유효 2 / 약함 1 / 미등재 0" 정확 분류 ✅
> **상품 상태**: 0개 (DRAFT 모두 삭제 완료, 본격 소싱 직전 깨끗한 상태) / **꿀통 꽃수레**: 0개 (사용자 첫 실 상품 등록 대기) / **Platform**: DMM 도매매 + OWC 오너클랜 2개
> **단계 진행도**: Phase A·B·C·D ✅ | Phase E (E-7/E-1/E-3/E-8) ✅ | Phase E+ Sprint 1~5 ✅ | 워크플로우 재설계 Sprint A1a~A3-4a ✅ | Z-1·Z-2·Z-3a·Z-3b·Z-3d ✅ | 6-Pre 1·2·3 ✅ | 6.5 SourceAdapter PoC ✅ | 6-D 1-5단계 + production active ✅ | 6-A/6-B/6-C/6-E ✅ | Session E-2 Phase 1~5 ✅ | Sprint 7 P0 (P0-A 옵션 정확도 + P0-B 골든윈도우 + P0-C 효자상품 + DataLab market context) ✅ | **Sprint 7 P1 (P1-A 카테고리 1페이지 + P1-B 금기어 + P1-C 태그사전) ✅ + 브라우저 E2E 시각 검증 완료 ✅**
> **Private API 발급 완료**: 28개 전체 권한 발급 ✅ (구매용 6 + 판매용 13 + 공통 3 + 기타 6) — Sprint 8 자동발주는 매출 상승 + 운영 흐름에 따라 진입 (보류 트랙)
> **다음 작업**: **Sprint 7-M2 Phase 2-c** (lifestyle-picker — LifestyleAsset 30일 cooldown + 태그 매칭 알고리즘) → Phase 3 (`/api/products/[id]/generate-detail` route). Phase 2 렌더러 단계는 본 phase로 안정 종료 — **dedicated 27/27 ✅ 100%, 12 골격 모두 완전 dedicated** (이전 docs의 "26"은 off-by-one 정정)
> **참고 문서**: `docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md` (v3.1 영구 참조), `docs/research/KKOTIUM_V2_ARCHITECTURE_2026_05.md` (v2.0 이력 참조), `docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md`

---

## 2026-05-13 Sprint 7-M2 Phase 2-b-3-b — B2B + S3 cleanup 3 렌더러 (dedicated 27/27 ✅ 100%)

3 신규 렌더러 + section-copy.ts 3 신규 Groq 헬퍼 + strings.ko.json 3 슬롯 → **12 골격 모두 완전 dedicated**.

- `specTable.ts` (141 LOC, S12) — 3-column 기술 사양 테이블 (parameter / value / unit), KFTC: value 컬럼 invariant placeholder
- `specifications.ts` (134 LOC, S12) — 2x2 규제·인증 grid (KC/KS/안전기준/제조번호) + invariant caveat strip
- `package.ts` (158 LOC, S3) — 3-step horizontal unboxing sequence (numbered badge + arrow + gift-handover tone)

section-copy.ts 확장 (3 신규 Groq 헬퍼):
- `generateSpecTableCopy` — `{headline, columnHeaders, rows: [{parameter, value, unit}]}` (value invariant)
- `generateSpecificationsCopy` — `{headline, items: [{label, value}] × 4, caveat (invariant)}`
- `generatePackageCopy` — `{headline, steps: [{label, caption}] × 3}`

**매트릭스 카운트 정정 발견**: grading.SKELETON_SECTIONS 12 골격의 unique section ids를 Python set으로 정확 카운트한 결과 **27개** (이전 docs의 "26"은 off-by-one). 본 phase로 **27/27 = 100% dedicated coverage** 달성. 이전 docs entries에서 "26"으로 기록된 항목을 모두 향후 정정 권고.

**완전 dedicated 골격 12/12 ✅**: S1 · S2 · S3 · S4 · S5 · S6 · S7 · S8 · S9 · S10 · S11 · S12

골격 변경분:
- S3: 5/6 → **6/6 ✅ 완전** (package 추가)
- S12: 3/5 → **5/5 ✅ 완전** (specTable + specifications 추가)

KFTC discipline 강화 (B2B 트랙 가장 엄격):
- specTable: value 컬럼 *항상* dict placeholder, Groq schema에서 제외 강제
- specifications: 4 카드 value 모두 invariant, 하단 invariant caveat strip Groq override 불가
- package: scarcity 패턴 금지 prompt, gift-handover tone 강제

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 정상 빌드 ✅
- python3 scripts/verify-korean-dict.py (178 strings, 0 typo) ✅
- registry 27 entries == SKELETON_SECTIONS unique ids 27 (Python set verification) ✅
- 신규 3 renderer 한글 inline: specTable.ts JSDoc 예시 1건만 잔존, 사용자 노출 외

다음 = Sprint 7-M2 Phase 2-c (lifestyle-picker 30일 cooldown + 태그 매칭) → Phase 3 (`/api/products/[id]/generate-detail` route + Diagnosis 연동 + Supabase Storage 업로드).

Commit: 본 phase에서 별도 commit + push 직후 `verify-vercel-deploy.sh --wait`로 production 검증.

---

## 2026-05-13 Sprint 7-M2 Phase 2-b-3-a — 감각 트랙 5 렌더러 (S6·S9·S10 완전 dedicated)

5 신규 렌더러 + section-copy.ts 5 신규 Groq 헬퍼 + strings.ko.json 5 슬롯:

- `material.ts` (122 LOC, S9) — macro shot + 원산지/인증 2 카드 placeholder (KFTC)
- `styledShot.ts` (111 LOC, S6) — 3 stacked lifestyle shots + mood 캡션 ×3
- `philosophy.ts` (100 LOC, S10) — editorial paragraph + signature + brand stripe
- `detail.ts` (142 LOC, S10) — 2x2 macro detail grid (tactile description)
- `reviews.ts` (121 LOC, S10) — **KFTC critical** — 3 동일 placeholder card + 사용자 1/2/3 attribution + neutral 5-dot icon (별점 fabricate 0)

section-copy.ts 확장 (5 신규 Groq 헬퍼, +320 LOC):
- `generateMaterialCopy` — `{headline, originLabel, macroCaption, certLine}`
- `generateStyledShotCopy` — `{headline, captions: [3]}`
- `generatePhilosophyCopy` — `{headline, paragraph, signature}`
- `generateDetailGridCopy` — `{headline, cells: [{title, body}] × 4}`
- `generateReviewsCopy` — `{headline, placeholderQuote, placeholderAttribution}` (KFTC critical: 헤드라인만 Groq, 본문 invariant)

전체 dedicated 커버리지 (Phase 1 + 2-a + 2-b-1/2/3-a 합산):
- **dedicated 24 / 26 섹션 ids (92%)**
- **placeholder 2 / 26 잔여**: specTable · specifications · package (Phase 2-b-3-b 대상, 1 sub-phase로 100% 도달 가능)

**완전 dedicated 골격 누적 9개**: S1 · S2 · S4 · **S6** · S7 · S8 · **S9** · **S10** · S11

골격 변경분:
- S6: 4/5 → **5/5 ✅ 완전** (styledShot 추가)
- S9: 3/4 → **4/4 ✅ 완전** (material 추가)
- S10: 4/6 → **6/6 ✅ 완전** (philosophy + detail + reviews 추가)

STEP A 효과 검증 — *fallback inline 0 패턴 정착*:
- 본 phase 도입 신규 fallback ~28건이 모두 *dict 키 추가만으로 작성*, inline 0건
- generateReviewsCopy의 placeholderQuote/placeholderAttribution는 invariant fallback으로 *Groq override 불가* — STRINGS 패턴이 KFTC-strict 케이스 안전 지원

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 정상 빌드 ✅
- 한글 sentinel grep 0건 (신규 5 renderer) ✅
- 신규 renderer 일반 한글 inline 0건 (STRINGS / copy.value 참조만) ✅

Commit: 본 phase에서 별도 commit + push 직후 `verify-vercel-deploy.sh --wait`로 production 검증.

다음 = Sprint 7-M2 Phase 2-b-3-b (specTable + specifications + S3 package, 3 렌더러로 100% 완성).

---

## 2026-05-13 Sprint 7-M2 STEP A — ko.json dict migration (작업원칙 #35)

8 파일 변경 (신규 2 + 확장 6):

- `strings.ko.json` (160 LOC, 신규) — 116 strings, 슬롯별 계층 (common 11 + 16 section slots + 4 Renderer SVG slots)
- `strings.ts` (49 LOC, 신규) — typed loader, `fill()` 보간 헬퍼, `buildSpecRows()` 컨텍스트 헬퍼
- `section-copy.ts` (-159 +123) — 18 fallback 객체 STRINGS 키 참조 교체
- `clinical.ts` / `comparison.ts` / `options.ts` / `spec.ts` — SVG hardcoded Korean 헤더 → `STRINGS.*Renderer` 슬롯
- `scripts/verify-korean-dict.py` — argv 지원, 두 dict 기본 검증, main() exit code

dict 구조 (slot 계층):

- `common.*` (11) — 공유 placeholder (detailsReference / theProduct / brandDefault / categoryFallback 등)
- 16 section slots (problem · solution · usage · cta · spec · story · productGrid · comparison · warranty · coreMetrics · technology · clinical · optionIntro · seasonalHook · options · eventDetails · benefits)
- 4 *Renderer 전용* slots (specRenderer · comparisonRenderer · optionsRenderer · clinicalRenderer) — SVG hardcoded header 보존

검증:

- `python3 scripts/verify-korean-dict.py`: 두 dict 검증 통과 (115+99 strings, 0 replace/not_nfc/typo) ✅
- `npx tsc --noEmit` 0 errors ✅
- `npm run build` 정상 빌드 ✅
- 신규 파일 sentinel grep 0건 (verify-korean-dict.py의 typo prevention list만 매치 = 의도) ✅
- section-copy.ts 남은 한글: Groq prompt instruction *예시* 문자열만, 사용자 노출 외

작업원칙 #35 효과:

- migration *전* 누적 ~45건 (Phase 1 + 2-a + 2-b-1 + 2-b-2 합산, 임계 30건 초과)
- migration *후* 사용자 노출 fallback dict 격리, inline 한글 0건 (Groq prompt 예시 제외)
- 신규 fallback은 *dict 키 추가만으로* 작성 가능 — Phase 2-b-3 진입 시 re-introduction 0 위험

Commit: 본 STEP에서 별도 commit + push 직후 `verify-vercel-deploy.sh --wait`로 production 검증.

다음 = Sprint 7-M2 Phase 2-b-3-a (감각 트랙 5 렌더러: material/styledShot/philosophy/detail/reviews).

---

## 2026-05-13 Sprint 7-M2 Phase 2-b-2 — 이벤트/세트 트랙 5 렌더러 완료 (S8·S11 완전 dedicated)

5개 신규 렌더러 + section-copy.ts 5 신규 Groq 헬퍼:

- `optionIntro.ts` (108 LOC) — S5. 2-column grid + 색상 chip + 옵션 이름/sub
- `seasonalHook.ts` (113 LOC) — S8. 시즌 banner + hook line + **START/END 날짜 카드 의무 렌더링** (KFTC date window 노출)
- `options.ts` (99 LOC) — S8. 옵션 테이블 (이름/구성, zebra striping)
- `eventDetails.ts` (102 LOC) — S11. **EDITION / DROP DATE / QUANTITY 3 카드 의무 렌더링** (KFTC limited drop 의무 disclosure)
- `benefits.ts` (144 LOC) — S11. 3 perk cards (inline SVG glyphs: gift/star/shield/tag/sparkle/truck) + 하단 disclosure strip 의무

section-copy.ts 확장 (5 신규 Groq 헬퍼):
- `generateOptionIntroCopy` — `{headline, items: [{name, sub}] 4-6, helperLine}`
- `generateSeasonalHookCopy` — `{banner, hookLine, startLabel, endLabel}`
- `generateOptionsTableCopy` — `{headline, rows: [{name, spec}] 4-6}`
- `generateEventDetailsCopy` — `{headline, editionLabel, dropDateLabel, quantityLabel, story}`
- `generateBenefitsCopy` — `{headline, perks: [{title, body, iconHint}] × 3, disclosure}`

전체 dedicated 커버리지 (Phase 1 + 2-a + 2-b-1 + 2-b-2 합산):
- **dedicated 19 / 26 섹션 ids**
- **placeholder 7 / 26 잔여**: material · styledShot · philosophy · detail · reviews · specTable · specifications · package (Phase 2-b-3 대상)

**완전 dedicated 골격 누적 6개**: S1 · S2 · S4 · S7 · **S8** · **S11**

골격 변경분:
- S5: 1/4 → **2/4** (optionIntro 추가)
- S8: 3/5 → **5/5 ✅ 완전** (seasonalHook + options 추가)
- S11: 2/4 → **4/4 ✅ 완전** (eventDetails + benefits 추가)

KFTC discipline 강화 (이벤트/세트 트랙 특히 중요):
- `seasonalHook` — START/END 날짜 카드 *항상 렌더링*, 미상 시 「상세 페이지 참조」 placeholder
- `eventDetails` — EDITION/DROP DATE/QUANTITY 3 카드 *항상 렌더링*, 미상 시 placeholder
- `benefits` — 하단 disclosure strip *항상 렌더링* (「혜택 적용 조건: 상세 페이지 참조」)
- Groq prompt 명시: "마감 임박" / "선착순" / "지금만" 사용 금지 (dark pattern filter scarcity rule 외 추가 layer)

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 28/28 routes ✅
- 한글 sentinel grep 0건 ✅

Commit: `5fe44d5` feat(automation): add 5 event/set section renderers (Sprint 7-M2 Phase 2-b-2)

**다음 = Sprint 7-M2 Phase 2-b-3 (감각/B2B 트랙) 진입 *전* ko.json dict migration 우선 권고** — 한글 fallback 누적 ~45건으로 작업원칙 #35 30건 임계 초과. Phase 2-b-3 + 2-b-4가 추가 ~25건 도입 예상이라 *지금 분리*가 효율적.

---

## 2026-05-13 Sprint 7-M2 Phase 2-b-1 — 신뢰 트랙 3 렌더러 완료 (S4·S7 완전 dedicated)

3개 신규 렌더러 + section-copy.ts 3 신규 Groq 헬퍼:

- `corePerformance.ts` (122 LOC) — S4. 2x2 metric card grid (label / value / unit / caption). **Groq는 라벨·단위·캡션만 생성, 수치는 fabricate 0건** (KFTC strict).
- `technology.ts` (134 LOC) — S7. 3-step pipeline diagram (브랜드 primary chips + arrows + step labels) + caption.
- `clinical.ts` (183 LOC) — S7. **KFTC critical** — 임상 데이터는 *항상* 「상세 페이지 참조」 placeholder (점선 outline bars), invariant caveat strip 「임상 데이터 출처: 상세 페이지 참조」 하드코딩. Groq 응답 override 불가.

section-copy.ts 확장 (3 신규 Groq 헬퍼):
- `generateCoreMetrics` — `{headline, cards: [{label, unit, caption}] × 4}` (numeric value 의도적 omit)
- `generateTechnologyCopy` — `{headline, mechanismLabel, steps: [3], caption}`
- `generateClinicalCopy` — `{headline, studyMeta, outcomeLabel, caveat (invariant)}`

전체 dedicated 커버리지 (Phase 1 + 2-a + 2-b-1 합산):
- **dedicated 14 / 26 섹션 ids**: hero · problem · solution · usage · cta · spec · story · product · comparison · warranty · shipping · **corePerformance** · **technology** · **clinical**
- **placeholder 12 / 26**: optionIntro · styledShot · seasonalHook · options · material · philosophy · detail · reviews · eventDetails · benefits · specTable · specifications · package

골격별 dedicated 커버리지 (변경분):
- S4: 4/5 → **5/5 ✅ 완전**
- S7: 4/6 → **6/6 ✅ 완전**

**완전 dedicated 골격 누적 4개**: S1 · S2 · S4 · S7

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 28/28 routes ✅
- 한글 sentinel grep 0건 ✅
- section-builder가 모든 SkeletonId 정상 dispatch ✅

Commit: `fff2867` feat(automation): add 3 trust-track section renderers (Sprint 7-M2 Phase 2-b-1)

다음 = Sprint 7-M2 Phase 2-b-2 (이벤트/세트 트랙 — S5/S8/S11 전용 5 렌더러: optionIntro · seasonalHook · options · eventDetails · benefits).

---

## 2026-05-13 Sprint 7-M2 Phase 2-a — 6 공유 렌더러 완료

6개 신규 렌더러 + section-copy.ts 5 신규 Groq 헬퍼:

- `spec.ts` (87 LOC) — S1/S3/S6. 2-column spec table + zebra row striping + accent header bar
- `story.ts` (117 LOC) — S3/S6/S10. Editorial paragraph (한국어 wrap @30char/line) + signature image strip + brand attribution
- `product.ts` (139 LOC) — S3/S8. 2x2 product detail grid, 공유 product image
- `comparison.ts` (120 LOC) — S4/S7. 3-column comparison table (feature / ours / baseline), KFTC-safe filter
- `warranty.ts` (79 LOC) — S4/S7. Headline + 3 line cards, circle-check icons
- `shipping.ts` (93 LOC) — S1/S9/S12. CTA copy 재사용 + S9 recyclable badge

section-copy.ts 확장 (5 신규 Groq 헬퍼):
- `generateSpecRows` — {rows: [{label, value}]} (5-6 rows)
- `generateStoryParagraph` — {paragraph, attribution}
- `generateProductGrid` — {cells: [{title, caption} × 4]}
- `generateComparisonCopy` — {headline, baselineLabel, rows[]}
- `generateWarrantyCopy` — {headline, lines[3]}

전체 dedicated 커버리지 (Phase 1 + 2-a 합산):
- **dedicated 11 / 26 섹션 ids**: hero · problem · solution · usage · cta · spec · story · product · comparison · warranty · shipping
- **placeholder 15 / 26**: corePerformance · technology · clinical · optionIntro · styledShot · seasonalHook · options · material · philosophy · detail · reviews · eventDetails · benefits · specTable · specifications · package

골격별 dedicated 커버리지:
- S1: 3/3 ✅ (완전)
- S2: 5/5 ✅ (완전, Phase 1)
- S3: 5/6 (package만 placeholder)
- S4: 4/5 (corePerformance만 placeholder)
- S6: 4/5 (styledShot만 placeholder)
- S7: 4/6 (technology, clinical placeholder)
- S9: 3/4 (material만 placeholder)
- S12: 3/5 (specTable, specifications placeholder)
- S5/S8/S10/S11: 1~3/n (Phase 2-b에서 보완)

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 28/28 routes ✅
- 한글 sentinel grep 0건 ✅
- section-builder가 모든 SkeletonId 정상 dispatch ✅

Commit: `449719b` feat(automation): add 6 shared section renderers (Sprint 7-M2 Phase 2-a)

다음 = Sprint 7-M2 Phase 2-b (15 골격 전용 렌더러) + Phase 2-c (lifestyle-picker).

---

## 2026-05-13 Sprint 7-M2 Phase 1 — 5섹션 빌더 + S2 5 렌더러 완료

10개 신규 파일 1,306 LOC (`src/lib/automation/section-renderers/` + `section-builder.ts`):

- `types.ts` (91 LOC) — SectionRenderer signature + SectionRenderContext + `resolveBgColor` (skeleton colorTokens 매핑, 미지 토큰 → white fallback, throw 0건)
- `section-copy.ts` (390 LOC) — 4 Groq 헬퍼 (hero / problem / solution / usage / cta), JSON-array 출력 파싱 + filterDarkPatterns + 결정형 fallback. copy-writer.ts와 분리해서 thumbnail/section copy 추상화 분리 유지
- `_placeholder.ts` (62 LOC) — 미구현 섹션 id 안전망. 점선 테두리 + 섹션 id 라벨 + 레이아웃 힌트. section-builder가 어떤 SkeletonId든 throw 없이 빌드
- `hero.ts` / `problem.ts` / `solution.ts` / `usage.ts` / `cta.ts` (498 LOC) — S2 주력 골격의 5 섹션 end-to-end 렌더링
- `index.ts` (51 LOC) — 섹션 id → renderer 매핑. `getSectionRenderer` / `hasDedicatedRenderer` / `listDedicatedSections` 노출
- `section-builder.ts` (209 LOC) — top-level orchestrator. matchSkeleton (또는 overrideSkeletonId) → sections[] 순회 → 각 renderer 호출 → 수직 stacking (Sharp). 섹션별 error isolation (실패 시 placeholder fallback, 높이 유지)

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 28/28 routes ✅
- 한글 sentinel grep 0건 ✅
- 12 SkeletonId 모두 placeholder safety net으로 end-to-end 가능 ✅

Phase 2/3 scope (Out of scope for this commit):
- 21 잔여 section renderer (material / philosophy / clinical / seasonalHook / story / package / technology / comparison / warranty / optionIntro / styledShot / eventDetails / benefits / specTable / specifications / shipping / product / options / detail / reviews / spec)
- `lifestyle-picker.ts` (LifestyleAsset 30일 cooldown + 태그 매칭)
- `/api/products/[id]/generate-detail` route + Diagnosis 연동 + Supabase Storage 업로드

Commit: `993098f` feat(automation): add 5-section detail page builder Phase 1 (Sprint 7-M2)

다음 = Sprint 7-M2 Phase 2 (21 잔여 렌더러 + lifestyle-picker).

---

## 2026-05-13 Sprint 7-M1 썸네일 자동화 4변형 완료

6개 신규 파일 1,424 LOC (`src/lib/automation/` + `src/app/api/thumbnail/[sku]/`):

- `skeleton-matcher.ts` (166 LOC) — SKELETONS 컬렉션 consuming 8축 점수화 (wildcard 0.5 / match 1.0 / mismatch 0.0). 12 골격 ranked + ambiguous flag (top 2 within 5pp). 동점 시 S2 디폴트.
- `sharp-composite.ts` (233 LOC) — Buffer 빌딩블록 8개 (canvas / fetch / fit / SVG text overlay / badge / vignette / jpeg export). SVG xmlEscape로 상품명 injection 차단.
- `cloudinary-pipeline.ts` (180 LOC) — Cloudinary *fetch-mode* URL builder. **업로드 없음**, 작업원칙 #38 strict 준수. Named preset 4개 (urlCleanWhite / WithBgRemoval / Brand / GalleryThumb).
- `copy-writer.ts` (270 LOC) — Groq Llama 3.1 8B + 다크패턴 정규식 필터 6 규칙 (scarcity / anchor-discount / superlative / authenticity / coupon-stack / emoji). 필터 hit 시 1회 retry (하드닝 프롬프트) → 결정형 fallback.
- `thumbnail-generator.ts` (395 LOC) — 4변형 orchestrate (clean / price / badge / lifestyle). 각 renderer 독립 (1 실패가 나머지에 영향 0). VARIANT_HINTS 매핑으로 골격별 권장 변형 노출.
- `/api/thumbnail/[sku]/route.ts` (180 LOC) — POST endpoint. Product 조회 (id OR sku) + 최근 Diagnosis row 의 conceptTone (또는 body override) → 4 변형 base64 JPEG 응답.

검증:
- npx tsc --noEmit 0 errors
- npm run build 28/28 routes + `/api/thumbnail/[sku]` ƒ Dynamic 등록 ✅
- 코드 내 한글 0건 (작업원칙 #29 c)
- 작업원칙 #38 — 이미지 생성 API 호출 0건, 변환(Cloudinary fetch) + 로컬 합성(Sharp)만

Commit: `9bedaaf` feat(automation): add thumbnail generator + skeleton matcher (Sprint 7-M1)

다음 = Sprint 7-M2 5섹션 상세페이지 빌더.

---

## 2026-05-13 Sprint 7-Skel 12 골격 spec 완료

13개 신규 파일 (`src/lib/automation/layout-skeletons/`):
- `index.ts` — SkeletonSpec 타입 + SKELETONS 컬렉션 + module-load 시점 invariant (section id 정합성 → grading.SKELETON_SECTIONS 1:1)
- `s1`~`s12-*.ts` — 각 SkeletonSpec 객체 export (matchSignature concept+tone 8축, sections[] id/height/layout/copyTone, totalHeight/width 860px, colorTokens, fonts, copyGlobalTone)

검증:
- npx tsc --noEmit 0 errors
- npm run build 28/28 routes 통과, index.ts invariant module-load 시 무사고
- 12개 골격 모두 grading.SKELETON_SECTIONS 매트릭스와 section id 1:1 정합
- 코드 내 한글 0건 (작업원칙 #29 c — 디자이너 노출 한글 라벨은 후속 dict 파일에서)

Commit: `a29e8c5` feat(automation): add 12 layout skeletons (Sprint 7-Skel)

다음 = Sprint 7-M1 썸네일 자동화 4변형 (clean / price / badge / lifestyle).

---

## 2026-05-12 v3.1 FINAL 채택

본 세션(docs-only commit)에서 다음 5개 MD 일괄 갱신:
- SESSION_LOG.md: v3.1 FINAL 기획 점검 entry 추가
- ROADMAP.md: Sprint X 인계 메시지 deprecated, Sprint 7-Diag 진입 메시지 활성화
- SPRINT_PLAN.md: Sprint 7 v3.1 FINAL 매트릭스 추가
- PRINCIPLES_LEARNED.md: 작업원칙 #38·#39·#40 추가
- PROGRESS.md: 본 entry 추가
- docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md: 신규 문서 보존

다음 세션 = Sprint 7-Diag MVP 코드 작업 진입.

---

---

## 핵심 인덱스

> **분할 이후 새 인덱스 (작업원칙 #31 (b), 2026-05-12)**
>
> - **작업원칙 #1~#25 (코드/UI/세션/보고)** → `docs/plan/PRINCIPLES_CODE.md`
> - **작업원칙 #26~#36 (학습된 패턴)** → `docs/plan/PRINCIPLES_LEARNED.md`
> - **Sprint 6/6.5/6-D/7/8/9+ 계획** → `docs/plan/SPRINT_PLAN.md`
> - **핵심 파일 경로 / 알려진 이슈 / SEO 인사이트 / 기술 패턴** → `docs/plan/REFERENCES.md`
>
> 본 파일 (PROGRESS.md)은 *현재 상태 스냅샷 + 진입점*만 유지합니다.

### 자주 참조하는 작업원칙 단축 인덱스

- [작업원칙 #26](PRINCIPLES_LEARNED.md) — IA 점검 + 고아 라우트 처리
- [작업원칙 #29](PRINCIPLES_LEARNED.md) — 한글 처리 절대 규칙 5가지
- [작업원칙 #29 (e++)](PRINCIPLES_LEARNED.md) — 사용자 닉네임 절대 규칙
- [작업원칙 #31](PRINCIPLES_LEARNED.md) — MD 의미 단위 자동 분할 + 인계 무결성
- [작업원칙 #32](PRINCIPLES_LEARNED.md) — TSC ≠ Production 빌드 검증
- [작업원칙 #33](PRINCIPLES_LEARNED.md) — useSearchParams Suspense 자동 점검
- [작업원칙 #34](PRINCIPLES_LEARNED.md) — 명백한 오류 파일 사용자 알림
- [작업원칙 #35](PRINCIPLES_LEARNED.md) — 한글 사전 분리 패턴
- [작업원칙 #36](PRINCIPLES_LEARNED.md) — Vercel deploy 검증 의무화
- [현재 앱 상태](#현재-앱-상태)
- [환경/메뉴/파이프라인](#환경--메뉴--파이프라인)

---

## 현재 앱 상태

| 항목 | 현황 |
|------|------|
| 전체 상품 | 8개 (모두 DRAFT) |
| 네이버 Commerce API | ok=true ✅ |
| 네이버 검색광고 API | ✅ (CUSTOMER_ID: 3755315) |
| 네이버 DataLab API | ✅ ID: F7Hga62gDOYxZ3KRtLTL |
| Discord | 5채널 ✅ |
| TSC | 0 errors ✅ |
| Vercel 배포 | https://kkotium-garden.vercel.app ✅ |
| GitHub | https://github.com/kkotium-dot/kkotium-garden |
| Phase A~D | 전체 완료 ✅ |
| Phase E | 진행 중 (E-7, E-1, E-3, E-8 완료) |
| Phase E+ | Sprint 1·2·3·4·5 완료 |
| 카카오 비즈니스 채널 | 꽃틔움 KKOTIUM (`_xkfALG`) ✅ |
| 도매꾹 Private API | 28개 전체 권한 발급 ✅ (Sprint 8 보류 트랙) |
| Solapi 알림톡 | 키 미입력 (월 50건+ 시 활성화) |

### 카카오 비즈니스 채널 정보

```
채널명: 꽃틔움 KKOTIUM
검색용 ID: 꽃틔움
채널 Public ID: _xkfALG
채널 URL: http://pf.kakao.com/_xkfALG
채팅 URL: http://pf.kakao.com/_xkfALG/chat
카테고리: 쇼핑 > 생활용품
```

### AI API 키 현황 (2026-04-30 기준)

| 서비스 | 환경변수명 | 상태 |
|---|---|---|
| **Groq** (1순위) | GROQ_API_KEY (lrltQb) | 정상 ✅ |
| **Groq** | GROQ_API_KEY_3 (3IGN7i) | 정상 ✅ |
| Groq | GROQ_API_KEY_2 (3pEakT) | 401 Invalid (Vercel 삭제 권장) |
| Gemini | GEMINI_API_KEY/_2/_3 | 429 quota 초과 (운영 기여 0) |
| xAI Grok | XAI_API_KEY | 크레딧 미배정 |
| Perplexity | PERPLEXITY_API_KEY | Pro 만료 (401, 비활성) |

**fallback 순서**: Groq round-robin (3키, 401/403/JSON parse safety) → Gemini round-robin → Anthropic last-resort

---

---

## 환경 / 메뉴 / 파이프라인

### 환경 정보

```
앱 루트:    /Users/jyekkot/Desktop/kkotium-garden
Dev 서버:   http://localhost:3000
Dev 로그:   /tmp/dev.log
프로덕션:   https://kkotium-garden.vercel.app
DB:         Supabase PostgreSQL (doxfizicftgtqktmtftf)
스토어:     꽃틔움 KKOTIUM (smartstore.naver.com/kkotium)
GitHub:     https://github.com/kkotium-dot/kkotium-garden
Vercel:     vercel.com/kkotjyes-projects/kkotium-garden
카카오채널: 꽃틔움 KKOTIUM (pf.kakao.com/_xkfALG)
```

### 사이드바 메뉴 구조 (9개 섹션, 2026-05-08 확정)

```
GARDEN: 정원 일지 (/dashboard) ✅
HUNT:   꿀통 사냥터 (/crawl) ✅ + 소싱 보관함 (/crawl?tab=history) ✅ [Z-3b]
PLANT:  씨앗 심기 (/products/new) ✅ 신버전 6탭 통합 (수정 모드 ?edit=ID 포함)
TEND:   정원 창고 (/products) ✅
        검색 조련사 (/naver-seo) ✅ v3 인라인 편집
        좀비 부활소 (/products/reactivation) ✅
ORDERS: 주문 관리 (/orders) ✅
OPS:    인서트 카드 (/ops/insert-card) ✅
TOOLS:  거래처 명단 (/settings/suppliers) ✅
        배송 레시피 (/settings/shipping) ✅
        공급사 열쇠방 (/settings/supplier-login) ✅
        카카오 채널 (/settings/kakao) ✅
        네이버 기본값 (/naver-settings) ✅
```

### 사이드바 미등록 라우트 (정리 대상 — Z-3c'/Z-3e)

- `/products/[id]/edit` — 외부 진입 0건 (구버전 ProductForm.tsx 582줄, 메인 흐름은 `/products/new?edit=ID`로 통합됨)
- `/products/upload` — CSV 일괄 업로드 (새싹 단계에서 권장 안 함, 리서치 3번)
- `/products/sourced` — 카드 그리드 뷰 (사이드바 미등록)
- `/products/out-of-stock` — `:158`이 dead route `/products/[id]/edit`를 가리킴 (수정 필요)
- 백업 파일 67개 (`*.bak*`, `*.backup*`, `*.v[0-9]*`)

### 앱 파이프라인

```
꿀통 사냥터 (크롤링) → 소싱 보관함 (SOURCED→PENDING→REGISTERED)
→ 씨앗 심기 (등록/편집, 6탭 통합)
→ 정원 창고 (목록/인라인 편집)
→ 검색 조련사 (SEO 점수 + AI 최적화 + 인라인 편집)
→ 엑셀 다운로드 또는 네이버 직접 등록 (Commerce API)
→ 대시보드 (실적/꼬띠추천/이벤트)
→ 주문 관리 (발주확인/송장등록 + 알림톡)
→ 좀비 부활소 (재등록)
```

---

---

## 네이버 API 현황

| API | 상태 |
|-----|------|
| 토큰 발급 (bcryptjs) | ✅ |
| 채널 정보 | ✅ 꽃틔움 KKOTIUM |
| 주문 조회 / 발주 확인 / 송장 등록 | ✅ |
| 상품 실시간 동기화 | ✅ |
| 주소록 조회 | ✅ |
| DataLab 트렌드 | ✅ |
| 검색광고 키워드 검색량 | ✅ (CUSTOMER_ID: 3755315) |
| 리뷰 API | ❌ 미지원 (GitHub #1582) |

---

## Vercel 환경변수

```
DB:         DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
Naver:      NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, NAVER_PROXY_URL
Naver SEO:  NAVER_SEARCHAD_API_KEY, NAVER_SEARCHAD_SECRET_KEY, NAVER_SEARCHAD_CUSTOMER_ID
DataLab:    NAVER_DATALAB_CLIENT_ID, NAVER_DATALAB_CLIENT_SECRET
Discord:    DISCORD_WEBHOOK_ORDERS, _STOCK, _DAILY, _WEEKLY, _KKOTTI
AI:         GROQ_API_KEY, GROQ_API_KEY_3 (실사용 2개), GEMINI_API_KEY/_2/_3 (quota 초과)
Cloudinary: CLOUDINARY_CLOUD_NAME, _API_KEY, _API_SECRET
Etc:        CRON_SECRET, NEXT_PUBLIC_APP_URL
향후 (E-13B): SOLAPI_API_KEY, SOLAPI_API_SECRET, KAKAO_PF_ID, SENDER_PHONE_NUMBER
향후 (E-12): DISCORD_WEBHOOK_REVIEW
```

---

---

## 참고 문서 인덱스

### docs/research/
- `SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md` — 본 세션 신규 (15개 핵심 + 단계별 체크리스트)
- `COMMERCE_API_403_ROOT_CAUSE.md`
- `COMMERCE_API_ORDER_DIAGNOSIS.md`

### docs/plan/archive/
- `README.md` — archive 폴더 인덱스 (분할 정책 + 검색 패턴 + 파일명 규칙)
- `PROGRESS_2026Q2_MAY.md` — 5월 누적 PROGRESS 헤더 이력 (작업원칙 #31 분할, 동결)
- `ROADMAP_2026Q2_MAY.md` — deprecated 인계 메시지 9개 + Phase A/B/C 완료 이력 (동결)
- `ROADMAP_2026-05.md` — Session B 작업 + deprecated 인계 메시지 (2026-05-12 분할, 동결)
- `SESSION_LOG_2026Q2_MAY.md` — 2026-05-01 ~ 2026-05-06 세션 24+ 건 (동결)
- `SESSION_LOG_2026-05.md` — 2026-05-06 ~ 2026-05-08 세션 9건 (두 번째 분할 2026-05-11, 동결)
- `SESSION_LOG_2026-05-12.md` — Session B 외 8 entries (세 번째 분할 2026-05-12, 동결)
- `SESSION_LOG_2026-05-12-PM.md` — Session E-2 Phase 1~5 + 7개 (네 번째 분할 2026-05-12 PM, 동결)
- `SESSION_LOG_2026-05-13.md` — 2026-05-12 5 entries (v3.1 FINAL + v2.0 + Sprint 7 P0/P0-B/P1) (다섯 번째 분할 2026-05-13, 동결)
- `SESSION_LOG_2026-05-13-PM.md` — 2026-05-13 5 entries (Phase 2-a · Phase 1 · Sprint 7-M1 · Sprint 7-Skel · Sprint 7-Diag MVP) (여섯 번째 분할 2026-05-13 PM, Phase 3 진입 직전, 동결)

### 프로젝트 파일 (외부 리서치)
- `260413-꽃틔움 가든 개선안 검증과 2026년 전략 로드맵`
- `스마트스토어 리뷰 관리와 반품안심케어, 무엇을 먼저 할 것인가`
- `네이버 스마트스토어 파워셀러의 2025-2026 실전 무기 총정리`
- `카카오 비즈니스 채널 2025-2026 완전 가이드`
- `Smartstore_Sprout_to_Power_Seller_Workflow_Optimization_Guide__May_2026.md`
