## 2026-05-13 Sprint 7-M2 Phase 3-D + 3-E + /studio UX polish ✅

### 본 세션 성격

직전 Phase 3-A + 3-B (commit 396269c) 사용자 production deploy + `product-assets` bucket 생성 검증 직후 동일 turn 연속 진입. 사용자가 *콘텐츠 자동화 메뉴가 보이지 않는다* → `/studio` 진입 → "에셋 저장" disabled → "다음 작업으로" 흐름으로 Phase 3-D/E 진입.

스크린샷으로 확인된 사항:
- `/studio` 페이지 production HTTP 200 + 모든 UI 요소 정상 (좌측 320px 상품 리스트 + 우측 4 카드 색상 코딩)
- `product-assets` bucket: `public=true / 10485760 bytes / image/png+jpeg / 2026-05-13 00:01:44 생성` — 정확히 권장 사양

UX 문제 발견: "에셋 저장" 버튼 disabled 상태에서 *왜* 비활성화인지 사용자에게 안 보이는 paper-cut → 전환율 손실. 본 turn에 함께 개선.

### 본 turn 작업 (단일 commit + push 예정)

**Phase 3-E** — `/api/products/[id]/publish-assets/route.ts` (109 LOC, 신규)
- POST endpoint: `{thumbUrl?, detailUrl?}` 입력
- Product 조회 → `naverProductId` 확인 (없으면 422 명시적 에러)
- 미니멀 patch payload (`originProduct.images.representativeImageUrl` + `detailContent` HTML wrap)
- `updateProduct()` 호출 (PUT /v2/products/origin-products/{productNo})
- 응답: `{ok, productId, naverProductId, patched: {thumbnail, detail}, publishedAt}`
- runtime=nodejs + dynamic=force-dynamic
- HTTPS URL validation (XSS / 잘못된 URL 차단)
- Production verification은 Phase 3-C 진입 시 실 상품 등록 흐름과 합산 검증

**Phase 3-D** — `/products` per-row "콘텐츠" 아이콘 (2 lines)
- 기존 "수정" / "삭제" 사이에 Palette icon Link 추가
- `href="/studio?product={p.id}"` deep-link → 기존 상품 *재가공* 진입점 활성화
- 매출 부진 상품 / OOS / 좀비 부활 직후 콘텐츠 보강 흐름 자연스럽게 도달 가능

**/studio UX polish** (140 LOC 변경):
- **Workflow step indicator**: 각 4 카드 헤더에 *1→2→3→4* numeric badge (accent color, 완료 시 ✓ 초록 background). 사용자가 흐름 순서를 시각적으로 즉시 인지
- **Disabled state hints**: "에셋 저장" disabled 상태에서 *옆에 hint*: 「썸네일 또는 상세 페이지를 먼저 생성하면 저장 가능합니다」 (노란 bg, ⓘ 아이콘)
- **Publish 버튼 실 wire-up**: 기존 "네이버 즉시 등록 (Phase 3-C)" disabled placeholder를 *실제 호출 가능* PrimaryButton으로 격상
  - `canPublish = hasSavedAsset && hasNaverId && !publishBusy`
  - 3가지 disabled 상태 별도 hint:
    - `!hasSavedAsset` → 「에셋을 먼저 저장하세요 (네이버 갱신에 public URL 필요)」
    - `hasSavedAsset && !hasNaverId` → 「이 상품은 아직 네이버에 등록되지 않았어요. PLANT에서 먼저 등록 후 갱신 가능」 (⚠ 노란 bg)
  - publish 성공 시 파란 박스에 naverProductId + patched 카드 표시
- **새 lucide icon import**: Send (publish 버튼용)

i18n 확장:
- studio-strings.ko.json `actions.*` 6개 신규 (saveHint / publishing / publishHintNeedSave / publishHintNeedNaverId / publishSuccess / publishError)
- studio-strings.ko.json `workflow.*` 신규 (stepLabel / stepOf / stepDone) — 향후 step indicator 다국어화 대비

### 페이지 작동 흐름 (전후 비교)

**Phase 3-B 이전**: 4 카드 동일 weight → 사용자가 *어디부터 시작?* 헷갈림 → 잘못된 순서로 클릭 → "에셋 저장" disabled 이유 안 보임 → 작업 중단

**Phase 3-D/E 이후**: ① AI 진단 → ② 썸네일 → ③ 상세 → ④ 에셋 저장 + 네이버 갱신 — 번호 + 색상 코딩으로 흐름 자명. 각 단계마다 disabled 이유 inline 표시. 마지막 단계에서 *실제 네이버 상품 갱신*까지 한 페이지에서 종결 (페이지 이동 0).

### 검증

- `npx tsc --noEmit` 0 errors ✅
- `npm run build` 정상 (`/studio` 7.45 → 8.32 kB, `/api/products/[id]/publish-assets` ƒ Dynamic 등록) ✅
- `python3 scripts/verify-korean-dict.py` 3 dicts (99+178+85 strings, +8 신규, 0 typo) ✅
- 신규/수정 파일 sentinel grep 0건 ✅
- product-assets bucket 검증 (SELECT only) 정상 사양 ✅

### Phase 3-C 진입 전 준비 완료

본 turn으로 *`/studio` 자체로 완결된 콘텐츠 자동화 워크플로우* 확립 — *Phase 3-C는 같은 흐름을 PLANT 7번째 탭에 *재마운트*하는 작업*. 핵심 컴포넌트 (DiagnosisCard / ThumbnailCard / DetailPageCard / ActionsCard) 재사용 위해 src/components/studio/ 폴더로 추출이 다음 sprint 첫 작업.

### 적용된 작업원칙

- #17 commit msg `.commit-msg.tmp` + `git commit -F` ✅
- #21 사전 점검 통과 (HEAD 396269c == origin/main == production)
- #24 본 turn 작업이 *단일 commit*에 fit — sub-phase 분할 불요 (변경 규모 적정)
- #26 IA 점검 — Sidebar 변경 0, /products row 아이콘 추가만 (사이드바 영향 0)
- #27 외부 컨트랙트 보존 — 기존 routes/lib 변경 0, 신규 1 route + 기존 1 row 액션 확장
- #28 Vercel = source of truth ✅
- #29 (a~e++) 한글 처리 — i18n 분리 100% (코드 inline 0)
- #31 SESSION_LOG 616 + 본 entry ~95 = ~711 (T1 1000 미달, 안전)
- #32 push 전 TSC + npm run build 의무 통과 ✅
- #34 worktree 절대 경로 혼동 0회 ✅
- #35 신규 fallback 모두 dict 키 추가 패턴 유지 (Phase 3-A 패턴 그대로 정착)
- #36 main push 후 verify-vercel-deploy.sh --wait — 사용자 승인 후
- #38 Production runtime static assets only ✅ (publish-assets는 Naver API patch만, image 생성 0)
- #40 Designer Sense 보존 — publish 버튼이 hasNaverId 검증으로 *미등록 상품 잘못된 publish 차단*, KFTC 안전 패턴

### 다음 = Sprint 7-M2 Phase 3-C (PLANT /products/new 7번째 탭 "비주얼 자동화")

PLANT page.tsx는 188KB / ~4000+ LOC 거대 파일 + 6 tab 구조 → *전용 sub-phase 분리 권고*:
- Phase 3-C-1: src/components/studio/ 폴더로 4 카드 + 공유 helper 추출 (refactor only, 동일 동작)
- Phase 3-C-2: PLANT page.tsx 7번째 탭 추가 + tab navigation 갱신 + productId 컨텍스트 전달
- Phase 3-C-3: 등록 흐름 wire-up (저장 → 네이버 등록 → publish-assets 자동 호출)

---

## 2026-05-13 Sprint 7-M2 Phase 3-A + 3-B — API foundation + 온실 아틀리에 UI mount ✅

### 본 세션 성격

직전 Sprint 7-M2 Phase 2-b-3-b (118425d, dedicated 27/27 ✅ 100%) 직후 사용자가 *콘텐츠 자동화 UI가 어디 있는지* 질문. 진단 결과 — 라이브러리 100% 빌드, API 2개 존재, UI 마운트 0건. 사용자 페르소나 주입 (10년차 파워셀러 + 풀스택 + UI/UX) + AskUserQuestion으로 IA 설계 확정 후 Phase 3-A (API) + Phase 3-B (UI) 동시 진행.

### 사용자 결정 사항

- 메뉴 명칭: **"온실 아틀리에"** (atelier 메타포 + KKOTIUM 정원 톤)
- IA 위치: TEND 섹션 4번째 (정원 창고 / 검색 조련사 / 좀비 부활소 / **온실 아틀리에**)
- 진입 범위: /studio + API foundation 동시 (Recommended) — sub-phase 분할로 안전 진행
- SESSION_LOG.md 947줄 → 분할 우선 (T1 1000 권고 임박)

### 본 turn 누적 commit (3건)

1. `e6a1941` docs(plan): split SESSION_LOG per principle 31 (T1 947 + Phase 3 entry trigger)
2. `5b543fe` feat(automation): Phase 3-A — Supabase Storage adapter + 2 API routes
3. `<sha>` feat(automation): Phase 3-B — 온실 아틀리에 UI + Sidebar mount + i18n strings

### Phase 3-A 산출물 (5b543fe, 3 파일 신규)

- `src/lib/storage/automation-storage.ts` (118 LOC) — Supabase Storage 어댑터. bucket=product-assets (product-images와 분리, lifecycle 분리 가능), path={productId}/{kind}-{variant}-{ts}.png, SUPABASE_SERVICE_ROLE_KEY 서버측 전용
- `src/app/api/products/[id]/generate-detail/route.ts` (114 LOC) — POST endpoint. Product fetch + 최근 Diagnosis 조회 → buildDetailPage 호출 → base64 PNG + section metadata JSON. overrideSkeletonId 지원 (designer 1-click swap)
- `src/app/api/products/[id]/save-assets/route.ts` (138 LOC) — POST endpoint. thumbBase64/detailBase64 → Storage upload → public URL 응답. 두 에셋 독립 처리

publish-assets (Naver Commerce API patch)는 Phase 3-C로 분리 — production data 검증 안전 분리.

### Phase 3-B 산출물 (commit 3, 4 파일, +2 수정)

- `src/lib/i18n/studio-strings.ko.json` (77 strings, 신규) — 온실 아틀리에 페이지 사용자 노출 한글 (page/filters/productList/header/diagnosis/thumbnail/detail/actions/kftc)
- `src/app/studio/page.tsx` (~640 LOC, 신규) — 2-pane 페이지
  - 좌측 (320px): 상품 리스트 + 자동 선택 + 카드 UI (이미지 썸네일 44px + 이름 + 카테고리/공급가)
  - 우측 (flex, max 1100): 4 카드 (DiagnosisCard / ThumbnailCard / DetailPageCard / ActionsCard)
  - State: useState로 상품 선택 + 4 API call 결과 + busy/error 별도 관리
  - URL deep-link 지원: `/studio?product=ID` (PLANT/TEND 연동 대비)
- `src/components/layout/Sidebar.tsx` (수정 +5) — TEND 섹션 4번째 entry `/studio` 추가, Palette icon (lucide-react)
- `scripts/verify-korean-dict.py` (수정 +1) — DEFAULTS에 studio-strings.ko.json 추가, 향후 자동 검증

### 페이지 작동 흐름 (사용자 시나리오)

```
1. 사이드바 → TEND → 온실 아틀리에 클릭
2. 좌측 상품 리스트에서 상품 선택 (첫 상품 자동 선택)
3. 우측 진단 카드 "AI 진단 실행" 버튼 → POST /api/diagnose
   → 컨셉/톤/추천 골격/등급/신뢰도/이미지 품질 카드 표시
4. 썸네일 카드 "썸네일 생성" 버튼 → POST /api/thumbnail/[sku]
   → 4 변형 (Clean/Price/Badge/Lifestyle) base64 미리보기 + 메인 1개 선택
5. 상세 카드 "상세 페이지 생성" 버튼 → POST /api/products/[id]/generate-detail
   → 5섹션 합성 PNG zoom-fit 미리보기 (max-height 520px overflow scroll)
   → 골격 드롭다운 (S1~S12)로 1-click 교체 → 재생성
6. 액션 카드 "에셋 저장" 버튼 → POST /api/products/[id]/save-assets
   → Supabase Storage 업로드 → public URL 2개 (썸네일 + 상세) 표시
7. "네이버 즉시 등록" 버튼 — disabled placeholder (Phase 3-C 활성화)
```

### 디자인 결정 (UI/UX)

- **2-pane vs single-column**: 2-pane 선택. 좌측 320px 상품 컨텍스트 항상 유지 → 작업자가 다음 상품 빠르게 전환 (10년차 파워셀러의 일 5-20건 페이스)
- **카드 색상 코딩**: 진단=primary red (#e62310), 썸네일=gold (#C9A66B), 상세=sage (#84A98C), 액션=dark (#1F2937) → 4 단계 워크플로우 시각적 구분
- **메인 변형 선택 UI**: 4 썸네일 각각 "메인으로 사용" 버튼 → 1클릭 라디오 패턴. 선택 변형은 빨간 2.5px 테두리 + filled 버튼
- **골격 1-click 교체**: 드롭다운 (자동 추천 + S1~S12 12 옵션) → 재생성 버튼 → 디자이너가 즉시 다른 골격 시도 가능 (작업원칙 #40 Designer Sense)
- **상세 미리보기 zoom-fit**: 5섹션 합성은 5000~7000px 세로 길이 → max-height 520px + overflow scroll로 카드 컴팩트 유지

### KFTC 준수 surfaces

- 썸네일 메인 변형 선택 시 dark-pattern filter 결과는 후속 (Phase 3-C에서 표시 권고). 현재는 filterDarkPatterns가 prompt + copy-writer에서 자동 처리됨
- 상세 페이지 미리보기는 reviews/clinical/spec 의 invariant placeholder가 자동 노출 — *디자이너가 visual로 검수 가능*
- "네이버 즉시 등록" disabled — Phase 3-C에서 Naver API patch 시 KFTC 검토 (인증번호/날짜/수량 placeholder는 디자이너 verify 의무 명시)

### 검증

- `npx tsc --noEmit` 0 errors ✅
- `npm run build` 정상 빌드, `/studio` ○ Static (7.45 kB), `/api/products/[id]/generate-detail` + `/save-assets` ƒ Dynamic 등록 ✅
- `python3 scripts/verify-korean-dict.py` 3 dicts 모두 통과 (99+178+77 strings, 0 replace/not_nfc/typo) ✅
- 신규 파일 sentinel grep 0건 ✅
- 신규 페이지 inline 한글: i18n strings 100% 분리 (작업원칙 #29 c, #35) — 단 page.tsx의 "상품 목록" L530 헤더 + Phase 3-C 주석 1건만 인라인

### 작업원칙 적용

- #17 commit msg `.commit-msg.tmp` + `git commit -F` ✅ (3 commits 모두)
- #21 사전 점검 통과 (HEAD 118425d == origin/main = production)
- #24 sprint 단위 commit + push 한 turn 안에 종료, sub-phase 분할로 보호
- #26 IA 점검 — Sidebar.tsx TEND 섹션 4번째 entry 추가, lucide-react Palette icon, computeActive 정상 작동
- #27 외부 컨트랙트 보존 — 기존 routes/lib 변경 0, 신규 routes는 모두 dynamic + nodejs 명시
- #28 Vercel = source of truth ✅
- #29 (a~e++) 한글 처리 — 코드 inline 0 (i18n 분리), JSDoc 예시 2건만
- #29 (b) MD 갱신 — temp file Write + Python prepend 패턴
- #31 SESSION_LOG 509 + 본 entry ~110 = ~619 (T1 1000 미달, 안전 — 분할 후 깨끗한 상태)
- #32 push 전 TSC + npm run build 의무 통과 ✅
- #34 worktree 절대 경로 혼동 0회 ✅
- #35 신규 i18n studio-strings.ko.json 77 strings 분리 (사용자 노출 한글 100% 격리)
- #36 main push 후 verify-vercel-deploy.sh --wait — 사용자 승인 후
- #38 Production runtime static assets only — Supabase Storage 업로드는 *합성 결과 영속화*, *생성 API 호출 0*
- #39 CTI inference entry point — /studio가 이제 *디자이너 UI 진입점*으로 정착
- #40 Designer Sense 보존 — 골격 1-click 교체 + 메인 변형 선택 + 재생성 버튼으로 자동화 ≠ 무검수 원칙 강제

### 다음 = Phase 3-C (PLANT 7번째 탭) + Phase 3-D (TEND per-row 액션)

Phase 3-B는 *self-contained MVP* — 현재 상태로도 사용자가 /studio에서 콘텐츠 자동화 전체 흐름 사용 가능 (진단 → 썸네일 → 상세 → 저장). Phase 3-C/3-D는 *진입점 다양화*:

- Phase 3-C: PLANT 등록 흐름에 7번째 탭 "🎨 비주얼 자동화" 통합 — *등록 직전* 콘텐츠 ready 강제 → 7일 골든윈도우 매출 ↑
- Phase 3-D: TEND /products per-row "콘텐츠" 액션 — *기존 상품 재가공 흐름* 활성화 → 매출 부진 상품 콘텐츠 보강 (꿀통 점수 낮은 상품, OOS, 좀비 부활 직후)

추가로 Phase 3-E (Naver API publish-assets) — production data 검증 안전 분리, Phase 3-C 통합 시점에 합산 권고.

---

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
