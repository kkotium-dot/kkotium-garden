## 2026-05-13 Sprint 7-M2 Phase 2-b-3-b — B2B + S3 cleanup 3 렌더러 (dedicated 27/27 ✅ 100%) ✅

### 본 세션 성격

직전 Sprint 7-M2 Phase 2-b-3-a (e64e00c, main FF merge + production deploy 검증) 직후 동일 turn 연속 진입. 잔여 3 placeholder ids (specTable / specifications / package)를 dedicated 렌더러로 격상해 **12 골격 전체 완전 dedicated 100%** 도달.

### 본 세션의 중요한 발견 — 매트릭스 카운트 정정

`grading.SKELETON_SECTIONS` 12 골격 정의의 unique section ids를 Python set으로 정확 카운트한 결과 **27개** (이전 docs의 "26"은 off-by-one error). 본 phase 완료로 **27/27 = 100% dedicated coverage** 달성. 이전 docs (PROGRESS.md, ROADMAP.md, SESSION_LOG.md entries)에서 "26"으로 기록된 모든 곳을 향후 정정 권고.

### 본 세션 산출물 (6 파일 변경, 신규 3 + 확장 3)

| 파일 | LOC | 골격 | 역할 |
|---|---|---|---|
| `specTable.ts` | 141 | S12 | 3-column 기술 사양 테이블 (parameter / value / unit), 6 zebra rows, value 컬럼 invariant placeholder |
| `specifications.ts` | 134 | S12 | 2x2 규제·인증 grid (KC/KS/안전기준/제조번호 카드) + 좌측 accent stripe + 하단 invariant caveat strip |
| `package.ts` | 158 | S3 | 3-step horizontal unboxing sequence (numbered badge + arrow connector + label + caption) |
| `section-copy.ts` | +320 LOC | (확장) | 3 신규 Groq 헬퍼 |
| `strings.ko.json` | +3 슬롯, 178 strings | (확장) | specTable (rows + columnHeaders) / specifications (4 items + caveat) / package (3 steps) |
| `index.ts` | +8 LOC | (확장) | Phase 2-b-3-b registry block, 27 entries 도달 |

### 3 신규 Groq 헬퍼 (section-copy.ts)

각 helper는 동일 패턴 유지 (JSON output + filterDarkPatterns + STRINGS dict fallback). KFTC critical 패턴 강화:

- `generateSpecTableCopy` — `{headline, columnHeaders, rows: [{parameter, value, unit}] × 5-6}` (Groq는 parameter + unit만, **value는 invariant placeholder** STRINGS.common.detailsReference)
- `generateSpecificationsCopy` — `{headline, items: [{label, value}] × 4, caveat (invariant)}` (Groq는 label만, **value는 dict invariant**)
- `generatePackageCopy` — `{headline, steps: [{label, caption}] × 3}` (gift-handover tone, scarcity 금지 prompt)

### KFTC Discipline — B2B 트랙 안전 장치

specTable / specifications 두 렌더러는 *법적 노출 위험이 가장 높은* B2B 영역 (인증번호 / 표준코드 / 측정값 fabricate 시 매출 정지 가능):

**specTable.ts**:
- value 컬럼 *항상* dict placeholder, Groq 응답 schema에서 value 필드 제외
- 6 rows 기본 (크기/무게/정격 전압/정격 전류/재질/마감), Groq가 카테고리 적합 parameter labels 선택
- unit 컬럼은 SI/표준 (mm/kg/V/A/W/dB) — 단위 자체는 universal이라 fabricate 위험 0

**specifications.ts**:
- 4 카드 모두 value invariant ("인증 번호: 상세 페이지 참조" 등)
- 하단 invariant caveat strip "정확한 인증 정보는 상세 페이지에서 확인해 주세요" — Groq override 불가
- 좌측 accent stripe (6px brand primary)로 카드 시각적 분리

**package.ts**:
- scarcity 패턴 금지 prompt ("마감 임박" / "선착순"), gift-handover tone 강제
- 3 numbered badges + arrow connectors로 unboxing 순서 명시
- 동봉물 / 사은품 fabricate 금지 (caption 28자 제한, 일반화 phrasing)

### 골격 dedicated 커버리지 변화 (실제 27/27 기준)

| 골격 | 변경 전 | 변경 후 |
|---|---|---|
| S3 | 5/6 | **6/6 ✅ 완전** (package 추가) |
| S12 | 3/5 | **5/5 ✅ 완전** (specTable + specifications 추가) |
| 기타 9 골격 | 이미 완전 | 변화 없음 |

**완전 dedicated 골격 12/12 ✅ 100%**: S1 · S2 · S3 · S4 · S5(*) · S6 · S7 · S8 · S9 · S10 · S11 · S12
`(*) S5는 optionIntro 1 + S2 graceful fallback usage/cta 사용 — 직접 등록 entries 기준 완전`

**dedicated 섹션 ids 27/27 ✅ 100%** (Phase 1 + 2-a + 2-b-1/2/3-a/3-b 합산)

### Phase 2-b 전체 완료 = Sprint 7-M2 Phase 2 (렌더러 단계) 종료

본 phase로 *모든 v3.1 SkeletonSpec section id*에 dedicated 렌더러 매핑. _placeholder safety net은 이제 *unknown future section ids* (Sprint 7-Skel에서 S13+ 추가 시) 대비용으로만 의의.

### 검증

- `npx tsc --noEmit` 0 errors ✅
- `npm run build` 정상 빌드 ✅
- `python3 scripts/verify-korean-dict.py` ✅ (178 strings, 0 typo)
- 신규 3 renderer 일반 한글 inline: specTable.ts L6의 JSDoc comment 1건 (`"상세 페이지 참조"` 예시) — 사용자 노출 외, dict 대상 외
- registry 27 entries == SKELETON_SECTIONS unique ids 27 (Python set verification)
- 작업원칙 #38 strict 준수 — 이미지 *생성* 0건 ✅

### Phase 2-b-3-b의 STEP A 효과 검증 (2회 연속)

본 phase 도입 신규 fallback ~22건이 *모두 dict 키 추가만으로 작성*. STEP A의 STRINGS 패턴이 KFTC-strict 케이스 (invariant placeholder × 2 + invariant caveat × 1)를 완벽 지원:
- specifications.caveat: Groq override 불가, dict invariant
- specifications.items[N].value: Groq응답 ignore, dict 직접 사용
- specTable.rows[N].value: Groq schema에서 제외, STRINGS.common.detailsReference 강제

### 본 세션 commit (1건 예정)

1. `<sha>` feat(automation): add 3 B2B/cleanup section renderers — Sprint 7-M2 complete at 27/27 (Phase 2-b-3-b)

### 적용된 작업원칙

- #17 commit msg `.commit-msg.tmp` + `git commit -F` ✅
- #21 사전 점검 통과 (HEAD e64e00c = production)
- #24 sprint 단위 commit + push 한 turn 안에 종료
- #26 IA 점검 — lib only, 라우트 0
- #27 외부 컨트랙트 보존 ✅ (registry entry 추가만, 기존 entry 변경 0)
- #28 Vercel = source of truth ✅
- #29 (a~e++) 한글 처리 — *코드 inline 0건 (specTable.ts JSDoc 예시 1건만 잔존)*
- #29 (b) MD 갱신 — temp file Write + Python prepend
- #31 SESSION_LOG ~832 + 본 entry ~100 = ~932 (T1 1000 근접, 다음 세션 분할 권고)
- #32 push 전 TSC + npm run build 의무 통과 ✅
- #34 worktree 절대 경로 혼동 0회 ✅
- #35 STEP A 패턴 *2회 연속 검증* — 신규 fallback inline 0건 ✅
- #36 main push 후 verify-vercel-deploy.sh --wait — 사용자 승인 후
- #38 Production runtime static assets only ✅
- #39 CTI inference entry point ✅
- #40 Designer Sense 보존 — KFTC invariant 패턴이 designer 검수 의무화 + 자동 표면화 동시 확보

### 다음 = Sprint 7-M2 Phase 2-c (lifestyle-picker) → Phase 3 (API route)

Phase 2 렌더러 단계는 본 phase로 완전 종료. 다음 단계:

- **Phase 2-c — lifestyle-picker**: LifestyleAsset DB 테이블 consume 패턴 + 30일 cooldown + 태그 매칭 알고리즘. 현재 모든 lifestyle/usage 렌더러는 `ctx.lifestyleAssetUrl ?? ctx.sourceImageUrl` fallback만 사용 → lifestyle 풀에서 적합 자산 선택 로직 도입.
- **Phase 3 — API route**: `/api/products/[id]/generate-detail` POST endpoint + Diagnosis 연동 (skeleton-matcher 8축) + Supabase Storage 업로드 (PNG → CDN URL → Naver Commerce API 등록 ready).

본 phase 완료로 Sprint 7-M2의 *foundation* 단계는 안정 완성 — Phase 2-c + 3는 production 통합 단계.

---

## 2026-05-13 Sprint 7-M2 Phase 2-b-3-a — 감각 트랙 5 렌더러 (S6·S9·S10 완전 dedicated) ✅

### 본 세션 성격

직전 Sprint 7-M2 STEP A (ko.json dict migration, b8d4938) 완료 직후 동일 turn 연속 진입. v3.1 매트릭스 26 섹션 ids 중 S6/S9/S10 감각·프리미엄 트랙 5개를 dedicated 렌더러로 격상. STEP A로 fallback inline 0 패턴이 정착해 본 phase 신규 fallback은 *dict 키 추가 + STRINGS 참조*만으로 작성.

### 본 세션 산출물 (8 파일 변경, 신규 5 + 확장 3)

| 파일 | LOC | 골격 | 역할 |
|---|---|---|---|
| `material.ts` | 122 | S9 | 헤드라인 + macro shot + caption + 원산지/인증 2 카드 (KFTC: 모두 placeholder-safe) |
| `styledShot.ts` | 111 | S6 | 헤드라인 + 3 stacked lifestyle shots + mood-led 캡션 ×3 |
| `philosophy.ts` | 100 | S10 | 헤드라인 + editorial paragraph (wrap) + signature + brand accent stripe |
| `detail.ts` | 142 | S10 | 헤드라인 + 2x2 macro detail grid (white cards, shared image per cell) |
| `reviews.ts` | 121 | S10 | 헤드라인 + 3 placeholder review cards (KFTC: 동일 placeholder × 3, 5-dot neutral icon strip) |
| `section-copy.ts` | +320 (확장) | (확장) | 5 신규 Groq 헬퍼 |
| `strings.ko.json` | +43 (확장) | (확장) | material/styledShot/philosophy/detail/reviews 슬롯 |
| `index.ts` | +10 (확장) | (확장) | 5 신규 registry 등록 |

### 5 신규 Groq 헬퍼 (section-copy.ts)

각 helper는 동일 패턴 유지 (JSON output + filterDarkPatterns + STRINGS dict fallback):

- `generateMaterialCopy` — `{headline, originLabel, macroCaption, certLine}` (KFTC strict: origin/cert fabricate 금지 prompt)
- `generateStyledShotCopy` — `{headline, captions: [3]}` (mood-led, no claims)
- `generatePhilosophyCopy` — `{headline, paragraph, signature}` (3 sentences, 의학·과학 효능 차단)
- `generateDetailGridCopy` — `{headline, cells: [{title, body}] × 4}` (tactile detail)
- `generateReviewsCopy` — `{headline, placeholderQuote, placeholderAttribution}` (KFTC critical: 헤드라인만 Groq, quote/attribution는 invariant dict)

### KFTC Discipline — 감각/프리미엄 트랙 핵심 안전 장치

본 phase 5 렌더러 중 3개가 *법적 노출 위험 영역*. KFTC 규정에 따라:

**reviews.ts** (가장 엄격):
- Groq 응답으로부터 *quote 0건 수신* — JSON schema에서 placeholder fields 제외
- 3 카드 모두 동일 placeholder quote 「후기 영역은 등록 후 실제 데이터로 채워집니다.」
- Attribution은 「사용자 1 / 2 / 3」 numeric index로 placeholder 본질 명시
- 5-dot star strip은 *neutral grey* (별점 fabricate 0)

**material.ts**:
- originLabel · certLine 둘 다 dict placeholder 「원산지: 상세 페이지 참조」 / 「인증 정보: 상세 페이지 참조」
- Groq prompt 명시: "DO NOT fabricate countries or regions / cert numbers"

**philosophy.ts**:
- prompt 명시: "DO NOT make medical, scientific, or efficacy claims"
- restrained editorial tone, value-led (craft/longevity 위주)

### 골격 dedicated 커버리지 변화

| 골격 | 변경 전 | 변경 후 |
|---|---|---|
| S6 | 4/5 | **5/5 ✅ 완전** (styledShot 추가) |
| S9 | 3/4 | **4/4 ✅ 완전** (material 추가) |
| S10 | 4/6 | **6/6 ✅ 완전** (philosophy + detail + reviews 추가) |

**완전 dedicated 골격 누적 9개**: S1 · S2 · S4 · S6 · S7 · S8 · S9 · S10 · S11
**dedicated 24 / 26 섹션 ids** (Phase 1 + 2-a + 2-b-1 + 2-b-2 + 2-b-3-a 합산, 92%)
**placeholder 2 / 26 잔여**: specTable · specifications · package (Phase 2-b-3-b 대상, 1 sub-phase로 종료 가능)

### Phase 2-b-3-a + STEP A 의 시너지 — fallback inline 0 패턴 정착

STEP A 효과 검증:
- 본 phase 도입 신규 fallback ~28건 — *모두 dict 키 추가만으로 작성, inline 0건*
- generateReviewsCopy의 placeholderQuote/placeholderAttribution는 invariant fallback으로 *Groq override 불가* — STEP A의 STRINGS export 패턴이 이런 KFTC-strict 케이스를 안전하게 지원

### 검증

- `npx tsc --noEmit` 0 errors ✅
- `npm run build` 정상 빌드 ✅
- `python3 scripts/verify-korean-dict.py` ✅ (strings.ko.json: 139 strings, 0 typo)
- 신규 5 renderer 파일 inline 한글 sentinel 0건 ✅
- 신규 5 renderer 파일 일반 한글 inline 0건 ✅ (전부 STRINGS / copy.value 참조)
- section-builder가 모든 SkeletonId 정상 dispatch ✅
- 작업원칙 #38 strict 준수 — 이미지 *생성* 0건, *변환* (Cloudinary fetch) + *합성* (Sharp Buffer) ✅

### 본 세션 commit (1건 예정)

1. `<sha>` feat(automation): add 5 sensory section renderers (Sprint 7-M2 Phase 2-b-3-a)

### 적용된 작업원칙

- #17 commit msg `.commit-msg.tmp` + `git commit -F` ✅
- #21 사전 점검 통과 (HEAD b8d4938 = STEP A push)
- #24 sprint 단위 commit + push 한 turn 안에 종료 + sub-phase 분할로 #24 보호
- #26 IA 점검 — lib only, 라우트 0
- #27 외부 컨트랙트 보존 ✅ (registry에 entry 추가만, 기존 entry 변경 0)
- #28 Vercel = source of truth ✅
- #29 (a~e++) 한글 처리 — *코드 inline 0건* (STEP A 패턴 효과)
- #29 (b) MD 갱신 — temp file Write + Python prepend 패턴
- #31 SESSION_LOG ~728 + 본 entry ~85 = ~813 (T1 1000 미달, 안전)
- #32 push 전 TSC + npm run build 의무 통과 ✅
- #34 worktree 절대 경로 혼동 0회 ✅
- #35 본 phase는 STEP A의 *효과 검증* turn — 신규 fallback inline 0건 도달 ✅
- #36 main push 후 verify-vercel-deploy.sh --wait — 사용자 승인 후
- #38 Production runtime static assets only ✅
- #39 CTI inference entry point ✅
- #40 Designer Sense 보존 — reviews placeholder 패턴이 KFTC 강제력 + designer override 가능성 동시 확보

### 다음 = Sprint 7-M2 Phase 2-b-3-b (B2B + S3 cleanup, 3 렌더러로 100% 완성)

3 잔여 placeholder: specTable / specifications / package. 본 sub-phase 완료 시 dedicated **26/26 ✅ 100%** — 12 골격 모두 완전 dedicated.

---

## 2026-05-13 Sprint 7-M2 STEP A — ko.json dict migration (작업원칙 #35 강제 적용) ✅

### 본 세션 성격

직전 Sprint 7-M2 Phase 2-b-2 완료 (5fe44d5 + 374ae18, main FF merge + production deploy 검증) 직후 동일 turn 연속 진입. Phase 1 + 2-a + 2-b-1 + 2-b-2 누적 한글 fallback inline ~45건 도달 → 작업원칙 #35 *대량 한글 작성 임계 30건 초과*. Phase 2-b-3 진입 *전* dict migration 의무 발동.

### 본 세션 산출물 (8 파일, 신규 2 + 확장 6)

| 파일 | 변경 | 역할 |
|---|---|---|
| `strings.ko.json` | +160 LOC (신규) | 116 strings, 슬롯별 계층 (common · 16 section slots · 4 Renderer SVG slots) |
| `strings.ts` | +49 LOC (신규) | typed loader (`STRINGS`), `fill()` 보간 헬퍼, `buildSpecRows()` 컨텍스트 헬퍼 |
| `section-copy.ts` | -159 +123 | 18 fallback 객체 전부 STRINGS 키 참조 교체, ctx 보간은 TS template literal 유지 |
| `clinical.ts` | +1 import, 6 replace | SVG 본 상품/비교 기준/상세 참조 ×4 → STRINGS |
| `comparison.ts` | +1 import, 2 replace | SVG 항목/본 상품 헤더 → STRINGS.comparisonRenderer |
| `options.ts` | +1 import, 2 replace | SVG 옵션/구성 헤더 → STRINGS.optionsRenderer |
| `spec.ts` | +1 import, 1 replace | SVG 상품 정보 헤더 → STRINGS.specRenderer |
| `scripts/verify-korean-dict.py` | -28 +82 | argv 지원 (인자 0개면 두 dict 기본 검증), main() exit code, FileNotFoundError handling |

### dict 구조 (slot 계층, 116 strings)

- `common.*` (11) — 공유 placeholder (detailsReference / detailsReferenceShort / theProduct / thisProduct / brandDefault / singleItem / categoryFallback / sellerInfoReference / itemPlaceholder / detailPlaceholder / thisSituation)
- 16 슬롯별 fallback 객체 (problem · solution · usage · cta · spec · story · productGrid · comparison · warranty · coreMetrics · technology · clinical · optionIntro · seasonalHook · options · eventDetails · benefits)
- 4 *Renderer 전용* 슬롯 (specRenderer · comparisonRenderer · optionsRenderer · clinicalRenderer) — SVG hardcoded header 보존

### 검증

- `python3 scripts/verify-korean-dict.py` ✅
  - discord-strings.ko.json: 99 strings, 0 replace, 0 not_nfc, 0 typos
  - strings.ko.json: 116 strings, 0 replace, 0 not_nfc, 0 typos
- `npx tsc --noEmit` 0 errors ✅
- `npm run build` 전체 routes 정상 빌드 ✅
- 신규 파일 sentinel grep: typo prevention list (verify-korean-dict.py)만 매치 = 의도된 prevention 자체. 실제 typo 도입 0건 ✅
- section-copy.ts 남은 한글: 모두 Groq prompt instruction 안의 *예시* 문자열 (e.g. `(e.g. 작동 원리, 핵심 기술)`) — 사용자 노출 0건, dict 대상 외

### 작업원칙 #35 적용 효과

migration *전* (인벤토리):
- section-copy.ts inline 한글 fallback ~38건 + renderer 4 파일 SVG inline ~7건 = 누적 ~45건
- Phase 2-b-3 진입 시 추가 ~25건 도입 예상 → 70건 임박

migration *후*:
- 사용자 노출 fallback 전수 dict 격리, inline 한글 0건 (Groq prompt 예시 제외)
- 신규 fallback은 *dict 키 추가만으로* 작성 가능 — Phase 2-b-3-a/b 진입 시 inline Korean re-introduction 0 위험

### Phase 2-b-3 진입 준비 완료

7 신규 렌더러 (감각 5 + B2B 2) + 1 cleanup (S3 package) 의 신규 fallback이 모두 *dict 신규 키 추가 + 렌더러 ts에서 키 참조*만으로 작성 가능. STRINGS.material, STRINGS.styledShot 등 미리 정의된 슬롯 패턴 자연스럽게 확장됨. 본 STEP A의 *유일한* 외부 인터페이스 변경은 STRINGS export 신설로, 기존 import 변경 0.

### 본 세션 commit (1건 예정)

1. `<sha>` chore(automation): migrate Korean fallback strings to strings.ko.json dict (Sprint 7-M2 STEP A, 작업원칙 #35)

### 적용된 작업원칙

- #17 commit msg `.commit-msg.tmp` + `git commit -F` ✅
- #21 사전 점검 통과 (HEAD 374ae18 == origin/main = production)
- #24 STEP A 단일 commit + push 한 turn 안에 종료
- #26 IA 점검 — lib only, 라우트 0
- #27 외부 컨트랙트 보존 (STRINGS export 신설, 기존 import 변경 0) ✅
- #28 Vercel = source of truth ✅
- #29 (a~e++) 한글 처리 — 코드 inline fallback 한글 0건 (Groq prompt 예시 잔존, 사용자 노출 외)
- #29 (b) MD 갱신 — temp file Write + Python prepend 패턴 (escape 변환 layer 0)
- #31 SESSION_LOG 651 + 본 entry ~75 = ~726 (T1 1000 미달, 안전)
- #32 push 전 TSC + npm run build 의무 통과 ✅
- #34 worktree 절대 경로 혼동 0회 ✅
- #35 **본 STEP의 핵심 발동 원칙** — *대량 한글 작성 임계 30건 초과* 시 dict 분리, 본 sprint에서 ko.json migration 완료 ✅
- #36 main push 후 verify-vercel-deploy.sh --wait — 사용자 승인 후

### 다음 = Sprint 7-M2 Phase 2-b-3 (감각 5 + B2B 2 + S3 cleanup)

dict migration 완료로 신규 7 렌더러는 fallback inline 0 패턴으로 작성. sub-phase 분할 권고:
- Phase 2-b-3-a: 감각 5 (material/styledShot/philosophy/detail/reviews)
- Phase 2-b-3-b: B2B 2 + S3 cleanup 1 (specTable/specifications/package)

---

## 2026-05-13 Sprint 7-M2 Phase 2-b-2 — 이벤트/세트 트랙 5 렌더러 (S8·S11 완전 dedicated) ✅

### 본 세션 성격

직전 Sprint 7-M2 Phase 2-b-1 + SESSION_LOG 분할 완료 (e6df007 + c942b8e, main FF merge + production deploy 검증) 직후 동일 turn 연속 진입. v3.1 매트릭스 26 섹션 ids 중 S5/S8/S11 이벤트/세트 트랙 5개를 dedicated 렌더러로 격상.

### 본 세션 산출물 (7 파일 변경, 신규 5 + 확장 2)

| 파일 | LOC | 골격 | 역할 |
|---|---|---|---|
| `optionIntro.ts` | 108 | S5 | 2-col grid + 색상 chip + 옵션 이름/sub |
| `seasonalHook.ts` | 113 | S8 | banner + hook + **START/END 카드 의무** (KFTC) |
| `options.ts` | 99 | S8 | 옵션 테이블 (zebra striping) |
| `eventDetails.ts` | 102 | S11 | **EDITION/DROP DATE/QUANTITY 카드 의무** (KFTC) |
| `benefits.ts` | 144 | S11 | 3 perk cards + inline SVG glyphs + disclosure strip 의무 |
| `section-copy.ts` | +424 | (확장) | 5 신규 Groq 헬퍼 |
| `index.ts` | +15 | (확장) | Phase 2-b-2 registry block |

### KFTC Discipline — 이벤트/세트 트랙 핵심 안전 장치

본 phase 5 렌더러 중 3개 (seasonalHook · eventDetails · benefits)가 *시간/수량 한정 영역*. KFTC fair-trade 규정에 따라:

**seasonalHook.ts**:
- START / END 두 카드 *항상* 렌더링 (date 미상 시 「상세 페이지 참조」 placeholder)
- Banner + hookLine + date cards 3-block 레이아웃으로 *date window 숨김 불가능* 구조 보장

**eventDetails.ts**:
- EDITION / DROP DATE / QUANTITY 3 카드 *항상* 렌더링
- KFTC limited drop 의무 disclosure 3 element 모두 표면화

**benefits.ts**:
- 하단 brand-accent disclosure strip 「혜택 적용 조건: 상세 페이지 참조」 *항상* 렌더링
- Groq 응답으로 override 불가 (fallback 값으로 강제)

**3 렌더러 모두**:
- Groq prompt 명시: "마감 임박" / "선착순" / "지금만" 사용 금지
- copy-writer dark pattern filter scarcity rule이 1차 필터 → prompt 자체에서 2차 차단

### 5 신규 Groq 헬퍼 (section-copy.ts +424 LOC)

각각 JSON output + filterDarkPatterns + 결정형 fallback 패턴 유지:

- `generateOptionIntroCopy` — `{headline, items: [{name, sub}] 4-6, helperLine}` (chipColor는 NEUTRAL_CHIPS palette에서 순차)
- `generateSeasonalHookCopy` — `{banner, hookLine, startLabel, endLabel}` (KFTC 의무 fields)
- `generateOptionsTableCopy` — `{headline, rows: [{name, spec}] 4-6}`
- `generateEventDetailsCopy` — `{headline, editionLabel, dropDateLabel, quantityLabel, story}` (KFTC 의무 fields × 3)
- `generateBenefitsCopy` — `{headline, perks: [{title, body, iconHint}] × 3, disclosure}` (iconHint = 'gift'|'star'|'shield'|'tag'|'sparkle'|'truck')

### 골격 dedicated 커버리지 변화

| 골격 | 변경 전 | 변경 후 |
|---|---|---|
| S5 | 1/4 | **2/4** (optionIntro 추가, usage는 graceful fallback) |
| S8 | 3/5 | **5/5 ✅ 완전** (seasonalHook + options 추가) |
| S11 | 2/4 | **4/4 ✅ 완전** (eventDetails + benefits 추가) |

**완전 dedicated 골격 누적 6 개**: S1 · S2 · S4 · S7 · **S8** · **S11**
**dedicated 19 / 26 섹션 ids** (Phase 1 + 2-a + 2-b-1 + 2-b-2 합산)
**placeholder 7 / 26 잔여**: material · styledShot · philosophy · detail · reviews · specTable · specifications · package (Phase 2-b-3/4 대상)

### Phase 2-b 진행 상태

- Phase 2-b-1 (S4/S7 신뢰 트랙) ✅
- Phase 2-b-2 (S5/S8/S11 이벤트/세트 트랙) ✅ 본 세션
- Phase 2-b-3 (S9/S10/S12 감각/B2B 트랙) — 다음 세션 (ko.json migration 후)
- Phase 2-b-4 (S3 package) — Phase 2-b-3 합산 가능

### 검증

- `npx tsc --noEmit` 0 errors ✅
- `npm run build` 28/28 routes ✅
- 한글 sentinel grep 0건 ✅
- section-builder가 모든 SkeletonId 정상 dispatch ✅
- 작업원칙 #38 strict 준수 — 이미지 *생성* 0건 ✅

### 한글 fallback 누적 — **ko.json migration 우선 권고 발동**

본 phase 도입 fallback ~15건 (5 helpers × 3+ fields). Phase 1 + 2-a + 2-b-1 + 2-b-2 합산 **약 45건** 도달 — 작업원칙 #35 의 *대량 한글 작성 작업 임계 30건을 명확히 초과*.

다음 세션 진입 시:
1. **STEP A: ko.json migration** — Phase 2-b-3 진입 *전* `strings.ko.json` 분리 의무
2. **STEP B: Phase 2-b-3** — dict 키 참조 패턴으로 신규 fallback 작성

migration 후 inline 한글 0건 도달이 목표. 본 sprint의 fallback 패턴이 이미 일관성 있어 자동화 추출 가능.

### 본 세션 commit (1건)

1. `5fe44d5` feat(automation): add 5 event/set section renderers (Sprint 7-M2 Phase 2-b-2)

### Push 정책 — main 직접 push 차단 6회 연속 패턴 (worktree 한정 확정)

이번 turn 누적 6 sub-phase 동일 패턴. 사용자 fast-forward merge 6회 연속 — *worktree 한정 정책*으로 확정.

### 적용된 작업원칙

- #17 commit msg `.commit-msg.tmp` + `git commit -F` ✅
- #21 사전 점검 통과 (HEAD c942b8e == origin/main = production)
- #24 sprint 단위 commit + push 한 turn 안에 종료 + *sub-phase 분할로 #24 보호*
- #26 IA 점검 — 신규 *lib only*, 라우트 0
- #27 외부 컨트랙트 보존 ✅
- #28 Vercel = source of truth ✅
- #29 (a~e++) 한글 처리 — 코드 0 / fallback inline 신규 ~15건 grep 통과
- #31 SESSION_LOG 534 + 본 entry ~110 = ~644 (분할 직후 슬림 상태, T1 1000 미달 안전)
- #32 push 전 TSC + npm run build 의무 통과 ✅
- #34 worktree 절대 경로 혼동 0회 ✅
- #35 **ko.json 분리 임계 초과 — 다음 세션 STEP A 우선 적용 의무** (본 세션 patch 안 함, *별도 phase 분리*가 안전)
- #36 main push 후 verify-vercel-deploy.sh --wait — 사용자 승인 후
- #38 Production runtime static assets only ✅
- #39 CTI inference entry point ✅
- #40 Designer Sense 보존 — KFTC disclosure 카드 *자동 표면화*로 designer 검수 부담 감소 + 누락 위험 0

### 다음 세션 = ko.json migration (STEP A) → Sprint 7-M2 Phase 2-b-3 (STEP B)

ROADMAP.md ACTIVE 메시지 (본 commit에서 prepend) 그대로 적용.

---

## 2026-05-13 Sprint 7-M2 Phase 2-b-1 — 신뢰 트랙 3 렌더러 (S4·S7 완전 dedicated) ✅

### 본 세션 성격

직전 Sprint 7-M2 Phase 2-a 완료 (449719b + d6a12c3, main FF merge + production deploy 검증) 직후 동일 turn 연속 진입. v3.1 매트릭스 26 섹션 ids 중 S4(전문 신뢰) / S7(임상·전문) 골격 전용 3개를 dedicated 렌더러로 격상 — KFTC strict 모드로 작성.

### 본 세션 산출물 (5 파일 변경, 신규 3 + 확장 2)

| 파일 | LOC | 골격 | 역할 |
|---|---|---|---|
| `corePerformance.ts` | 122 | S4 | 2x2 metric card grid (label / value placeholder / unit / caption) |
| `technology.ts` | 134 | S7 | 3-step pipeline diagram (chips + arrows + step labels + caption) |
| `clinical.ts` | 183 | S7 | KFTC strict — placeholder bar chart + invariant caveat strip |
| `section-copy.ts` | +280 | (확장) | 3 신규 Groq 헬퍼 (`generateCoreMetrics` / `generateTechnologyCopy` / `generateClinicalCopy`) |
| `index.ts` | +9 | (확장) | Phase 2-b-1 registry block 추가 |

### KFTC Discipline — Phase 2-b-1 핵심 안전 장치

신뢰 트랙은 *법적 노출 위험이 가장 높은* 섹션 영역. 본 phase의 3 렌더러는 다음 규칙으로 KFTC-safe 보장:

**clinical.ts** (가장 엄격):
- Groq 응답으로부터 *숫자 0건 수신* — JSON schema에서 numeric value 필드 자체 제거
- Bar chart는 *항상* 「상세 페이지 참조」 placeholder + 점선 outline (대시 8/6)
- Invariant caveat strip 「임상 데이터 출처: 상세 페이지 참조」 *하드코딩*, Groq override 불가, body API 통한 override 불가
- 디자이너가 product data로부터 numeric을 publish 전 *수동 검증 의무*

**corePerformance.ts**:
- Groq prompt에 명시: "DO NOT invent specific numeric values — leave the numeric value out entirely"
- 응답 schema에서 `value` 필드 자체 제거 — Groq는 label / unit / caption 만 생성
- 코드에서 강제: `value: '상세 참조'` (Sprint 7-Lib에서 ctx.metrics 도입 시 replace 예정)

**technology.ts**:
- Groq prompt에 명시: "no fabricated mechanism names", "no medical efficacy claims"
- pipeline step labels (입력/처리/출력 같은 일반어)만 허용
- 의학·과학적 효능 주장 단어는 filterDarkPatterns에서 별도 차단 안 됨 — Groq prompt 자체에서 제거

### 골격 dedicated 커버리지 변화

| 골격 | 변경 전 | 변경 후 |
|---|---|---|
| S4 | 4/5 | **5/5 ✅** |
| S7 | 4/6 | **6/6 ✅** |
| 기타 | 변화 없음 | — |

**완전 dedicated 골격 누적**: S1 / S2 / S4 / S7 (총 4 골격)
**dedicated 14 / 26 섹션 ids** (Phase 1 + 2-a + 2-b-1 합산)
**placeholder 12 / 26 잔여**: optionIntro · styledShot · seasonalHook · options · material · philosophy · detail · reviews · eventDetails · benefits · specTable · specifications · package

### Phase 2-b 분할 진행 상태

- Phase 2-b-1 (S4/S7 신뢰 트랙, 3 렌더러) — ✅ 본 세션
- Phase 2-b-2 (S5/S8/S11 이벤트/세트 트랙, 5 렌더러) — 다음 세션
- Phase 2-b-3 (S9/S10/S12 감각/B2B 트랙, 6 렌더러) — 다다음 세션
- Phase 2-b-4 (S3 잔여 package, 1 렌더러) — Phase 2-b-3 합산 가능

### 검증

- `npx tsc --noEmit` 0 errors ✅
- `npm run build` 28/28 routes ✅
- 한글 sentinel grep 0건 ✅
- section-builder가 모든 SkeletonId 정상 dispatch ✅
- 작업원칙 #38 strict 준수 — 이미지 *생성* 0건, *합성* 만 ✅
- worktree 절대 경로 혼동 0회 (본 turn 누적 0건) ✅

### 본 세션 commit (1건)

1. `fff2867` feat(automation): add 3 trust-track section renderers (Sprint 7-M2 Phase 2-b-1)

### Push 정책 — main 직접 push 차단 5회 연속 패턴 (worktree 한정 확정)

이번 turn 5회 sprint 모두 동일 패턴. 사용자 fast-forward merge로 main 도달 — 안정적인 작업 흐름으로 정착.

### 한글 fallback 누적 — 작업원칙 #35 ko.json 분리 임계 임박

본 phase 도입 fallback 4건 (corePerformance 4 cards × 4 fields의 fallback / technology 5 fields / clinical 4 fields의 일부)을 합산 — Phase 1 + 2-a + 2-b-1 누적 약 30~32건 도달. 작업원칙 #35 의 *대량 한글 작성 작업* 임계 30건에 정확히 임박. **다음 Phase 2-b-2 진입 시 ko.json 분리 migration 권고** — 단, 작업원칙 #24 (한 turn 분할)에 따라 *별도 phase로 migration*하는 게 안전.

### 적용된 작업원칙

- #17 commit msg `.commit-msg.tmp` + `git commit -F` ✅
- #21 사전 점검 통과 (HEAD d6a12c3 == origin/main = production)
- #24 sprint 단위 commit + push 한 turn 안에 종료 + *sub-phase 분할로 #24 보호*
- #26 IA 점검 — 신규 *lib only*, 라우트 0
- #27 외부 컨트랙트 보존 ✅
- #28 Vercel = source of truth ✅
- #29 (a~e++) 한글 처리 — 코드 0 / fallback inline 신규 4건 grep 통과
- #31 SESSION_LOG ~1170 + 본 entry ~150 = ~1320 (T2 1500 미달, T1 권고만)
- #32 push 전 TSC + npm run build 의무 통과 ✅
- #34 worktree 절대 경로 혼동 0회 ✅
- #36 main push 후 verify-vercel-deploy.sh --wait — 사용자 승인 후
- #38 Production runtime static assets only ✅
- #39 CTI inference entry point ✅ (skeleton-matcher consume)
- #40 Designer Sense 보존 — clinical placeholder 디자이너 verify 의무화로 *자동화 ≠ 무검수* 원칙 강조

### 다음 세션 = Sprint 7-M2 Phase 2-b-2 (이벤트/세트 트랙, S5/S8/S11)

ROADMAP.md ACTIVE 메시지 (본 commit에서 prepend) 그대로 적용.
