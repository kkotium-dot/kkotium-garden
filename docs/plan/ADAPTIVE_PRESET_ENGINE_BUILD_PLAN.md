# 적응형 프리셋 엔진 앱 — 구현 설계 (Build Plan, Phase A/B)

> 저장: 2026-06-09 | 상태: **설계 확정 (코드 대기)** | 작성: Code turn
> 권위 스펙(상위): `docs/design/CONCEPT_PRESET_SYSTEM.md` + `docs/design/ADAPTIVE_IMAGE_SEO_ENGINE.md`(§5·§7.2) + `docs/design/DETAIL_PAGE_PLAYBOOK.md`
> 1:1 포팅 레퍼런스: `docs/design/aroma_L3_detail_reference.html` (aroma · L3 검증본)
> 베이스라인: HEAD == origin/main == `b257e49` (Vercel production READY, prod SHA 일치)
> 트리거: TASK_BRIDGE Desktop → Code 핸드오프 (적응형 프리셋 엔진 Phase A/B)
> 사용자 승인 사항: (1) **설계만 확정·코드 대기** (2) item 4/6 = **레퍼런스 1:1 React 렌더러 신설**

---

## 0. 한 문장
프리셋(aroma/gift/tradition/kitchen/pet)이 무드를 정하면, 고정 코어(brand-red/pink·Pretendard·8배수)는 불변인 채 `[data-preset]`/`data-intensity` 토큰 레이어가 색·타이포·여백을 갈아끼우고, 7섹션 React 렌더러가 레퍼런스 마크업을 1:1로 조립하며, SEO 가드 린터는 프리셋과 직교로 항상 실행한다.

---

## 1. 현황 대조 (이미 구현됨 vs 신규 필요)

2026-06-03 프리셋 1차 코드화가 존재. task 6항목을 실제 코드와 대조한 결과:

| # | task 항목 | 현재 상태 | 신규/갱신 필요 |
|---|---|---|---|
| **3** | Supabase `concept_preset`/`preset_intensity`/`preset_overrides` | **DONE** — `prisma/migrations/20260603_add_concept_preset/migration.sql` 적용됨(ROADMAP "drift 0"), `schema.prisma:198-200` 반영. `preset_overrides` JSONB 가역 | **신규 SQL 불필요.** Desktop 확인만(아래 §6) |
| **1** | globals.css `:root` 코어 + `[data-preset]` 5종 | 부분 — `--preset-*` 접두 **6토큰**(구 값, gift/pet 색 상이) | §7.2 무접두 semantic **11+토큰** + `:root` 코어 재이식 (§3-A) |
| **2** | `data-intensity=l1\|l2\|l3` 레이아웃 훅 | 부분 — `section-variants.ts`에 밀도+L3 emphasis 존재 | 토큰 리네임 동반 갱신 (§3-C) |
| **4** | 7섹션 CVA (preset × intensity) | **골격만** — className 문자열만, 레퍼런스 리치 마크업 없음 | 레퍼런스 1:1 React 렌더러 신설 (§4-A) |
| **5** | SEO 가드 린터 (상품명50·대표화이트·카테고리) | 산재 — `product-name-checker.ts`/`naver-normalize.ts`(white-bg)/`resolveCategoryLeaf` 개별 존재 | 프리셋 독립 통합 린터 신설 (§4-B) |
| **6** | generate-detail 엔진 소비 | 미연결 — 현재 `ConceptTone`/skeleton(27렌더러 PNG) 경로 | 프리셋 엔진 additive 연결 (§4-C) |

### 1-A. 핵심: 토큰 리네임 blast radius = 0
`grep` 실측: 프리셋 엔진(`concept-presets.ts`/`section-variants.ts`)은 **아직 어떤 라우트/컴포넌트에서도 import되지 않음** (서로만 참조). 따라서 `--preset-*` → §7.2 무접두 네이밍 변경은 외부 회귀 0 — **globals.css + section-variants.ts + concept-presets.ts 3파일 self-contained**. 코어 토큰(`--brand-red`/`--font-body`/`--sp-*`/`--r-card`/`--shadow`/`--font-display`) globals.css 충돌 0 확인.

---

## 2. 결정 사항 (Decisions)

- **D1 — 토큰 네이밍**: §7.2/레퍼런스 무접두 semantic(`--surface`/`--ink`/`--accent`/`--card`/`--line`…) 채택. **단 `[data-preset]` 셀렉터 스코프에만 정의** (앱 셸이 `:root{--surface:#FFFFFF}`를 이미 사용 → 프리셋 토큰을 bare `:root`에 두면 셸 파괴). 프리셋 토큰은 detail `<article data-preset>` 서브트리에서만 해석 → 셸 비파괴. 코어 토큰(`--brand-red` 등 신규 네임스페이스)만 `:root`.
- **D2 — 7섹션 = React 렌더러 1:1 포팅** (승인). `src/components/detail/preset/`에 preset×intensity CVA React 컴포넌트 신설. 출력 2갈래: (a) /studio·/preview **라이브 React 미리보기**, (b) 발행용 **HTML 문자열**(`renderToStaticMarkup`). 기존 PNG(27렌더러 `buildDetailPage`) 경로는 **additive 보존**(삭제·치환 0).
- **D3 — item 3 = 이미 완료**. migration 20260603 적용·Prisma 반영. 신규 SQL 없음. (재실행 필요 시 idempotent `IF NOT EXISTS`라 안전하나 불필요.)
- **D4 — 섹션 순서 고정**. PLAYBOOK §2(전환검증 순서: hook→value→spec→usage→trust→cta→notice). 레퍼런스 HTML도 순서 고정. L3 = **hero 변형(A/C 합성 히어로) + emphasis(value/trust card화)** 만, 순서 재배열 아님. (§7.2 "섹션순"은 emphasis 강도로 해석 — PLAYBOOK 우선.)
- **D5 — SEO 직교·비가역 0**. 린터는 `concept_preset`을 읽지 않음(프리셋 독립). 본 작업 전 범위에서 네이버 PUT/발행 0, DB는 가역 컬럼만, 외부 이미지 API 런타임 호출 0(#38).

---

## 3. Phase A 설계 (commit 1 — 토큰 정합)

대상 3파일. 외부 소비자 0 → 안전.

### 3-A. `src/app/globals.css` — `:root` 코어 (레퍼런스 lines 27-35 그대로)
```css
:root {
  --brand-red:#E62310;            /* CTA 전용 ~10% (기존 --kk-red와 별개 네임스페이스) */
  --brand-pink:#FFCCEA;           /* 포인트/배지 ~15% */
  --font-body:"Pretendard",-apple-system,sans-serif;
  --font-display:"Noto Serif KR",serif;
  --sp-1:8px; --sp-2:16px; --sp-3:24px; --sp-4:40px; --sp-5:64px; --sp-6:96px;  /* 8배수 */
  --r-card:16px; --r-btn:12px; --r-img:14px;
  --shadow:0 4px 20px rgba(58,53,46,.07);
}
```
※ Noto Serif KR webfont `<link>`는 `src/app/layout.tsx` `<head>` 또는 globals `@import`로 추가(레퍼런스 line 24). 기존 Pretendard 로드 경로 확인 후 정합.

### 3-B. `[data-preset]` 5종 (§7.2 값 그대로 — bare :root 금지)
```css
[data-preset="aroma"]    { --surface:#F3EFE7; --surface-subtle:#FAF7F0; --surface-deep:#E9E2D4; --accent:#76864C; --accent-soft:#A4A879; --terracotta:#B5694C; --rose-dust:#C98AA2; --ink:#3A352E; --ink-soft:#7A7468; --line:#DAD2C2; --card:#FBF9F4; }
[data-preset="tradition"]{ --surface:#F4ECE0; --surface-subtle:#FAF4EA; --surface-deep:#E7D9C4; --accent:#9B2D30; --accent-soft:#C28A5E; --ink:#1C1C1C; --ink-soft:#5A5247; --line:#D8C9B2; --card:#FBF6EC; }
[data-preset="kitchen"]  { --surface:#FFFFFF; --surface-subtle:#F6F9FC; --surface-deep:#EEF3F8; --accent:#2F6FB0; --accent-soft:#7FA8D0; --ink:#1A1A1A; --ink-soft:#5B6470; --line:#E2E8EF; --card:#FFFFFF; }
[data-preset="gift"]     { --surface:#FBF3EE; --surface-subtle:#FFFBF7; --surface-deep:#F3E2D6; --accent:#C98A3E; --accent-soft:#E3B98C; --ink:#3A2E28; --ink-soft:#7A6A60; --line:#EAD9CC; --card:#FFFBF7; }
[data-preset="pet"]      { --surface:#FBF6EF; --surface-subtle:#FFFCF7; --surface-deep:#F0E6D8; --accent:#C77A4A; --accent-soft:#E0A877; --ink:#34302A; --ink-soft:#6E665C; --line:#E4D8C8; --card:#FEFBF6; }
```
- **terracotta/rose-dust는 aroma만 정의** → 타 프리셋에서 렌더러는 `var(--terracotta, var(--accent))` / `var(--rose-dust, var(--accent-soft))` fallback 사용(토큰 부재 = accent로 강등, 깨짐 0).
- 구 `--preset-*` 블록(globals.css 274-334) **삭제·교체**.

### 3-C. `data-intensity` 훅 (`section-variants.ts` 토큰 리네임 + 밀도)
- `var(--preset-surface)`→`var(--surface)`, `var(--preset-surface-subtle)`→`var(--surface-subtle)`, `var(--preset-text)`→`var(--ink)`, heading→`var(--font-display)`.
- intensity 밀도 유지: l1=compact / l2=cozy / l3=airy (section gap·padding). L3 hero emphasis 유지(§4-A에서 hero 컴포넌트가 실제 A/C 레이어 렌더).

### 3-D. `concept-presets.ts` palette §7.2 정합
- `palette` 인터페이스를 §7.2 리치셋으로 확장: `{surface, surfaceSubtle, surfaceDeep, accent, accentSoft, ink, inkSoft, line, card, terracotta?, roseDust?}` (text→ink, textMuted→inkSoft 명칭 통일). gift/pet 값을 §7.2로 교정(현재 구 값). non-CSS 컨텍스트(프리뷰 스와치·서버 렌더러)용 미러 — globals.css와 3-way 정합.

### 3-E. Phase A 검증 게이트
tsc 0 / `npm run build` OK / 이모지 0 / 한글 코드 리터럴 0 / 비가역 0 / **토큰 정합**(globals.css `[data-preset]` ↔ concept-presets `palette` ↔ 레퍼런스 HTML hex 3-way 일치 grep).

---

## 4. Phase B 설계 (item 4·5·6 — commit 2·3·4)

### 4-A. commit 2 — 7섹션 React 렌더러 (item 4, D2)
신규 파일군:
```
src/components/detail/preset/
  DetailPresetArticle.tsx   // <article data-preset data-intensity>, overrides 인라인 주입, 7섹션 매핑
  variants.ts               // preset×intensity CVA 클래스맵 (section-variants 확장/흡수)
  types.ts                  // DetailContent (섹션 카피 + 이미지 슬롯 + 커스터마이징 슬롯)
  sections/
    HeroSection.tsx         // S1 hook — A 배경(모네 무드)+C 정물+제품컷 합성, hero-copy/trust chip
    ValueSection.tsx        // S2 value — 3 value-card (Lucide 아이콘)
    SpecSection.tsx         // S3 spec — (aroma) scents 3종 그리드 + spec-card / 타프리셋 spec-card 단독
    UsageSection.tsx        // S4 usage — 3 step
    TrustSection.tsx        // S5 trust — art story + 작품캡션 + trust-badges + 포토리뷰 슬롯
    CtaSection.tsx          // S6 cta — 대형 레드버튼(--brand-red)+안심요소
    NoticeSection.tsx       // S7 notice — 배송/교환/고객 + 공통슬롯 + brandbar + 모바일 sticky-buy
```
- **CVA 2축**: `preset`(5) × `intensity`(3). 레퍼런스 클래스(.hero/.values/.scents/.spec-card/.step/.story/.cta/.notice…) 1:1 이식, 색은 semantic 토큰만 참조(hex 직접 사용 0).
- **이모지 0**: 레퍼런스 inline `<svg>` 아이콘 → Lucide React로 치환(CLAUDE.md §3-1). 본문 SVG 장식(hero-art 그라데이션)은 CSS 유지.
- **한글 리터럴 0**: 모든 노출 문구는 `DetailContent` props로 주입 또는 `src/lib/i18n/detail-preset.ko.json` 분리(eyebrow 등 구조 라벨). 컴포넌트 코드에 한글 0.
- **커스터마이징 슬롯(개입점, CONCEPT §5)**: `preset_overrides {accent, hero_copy, mood_image}` 소비 — `DetailPresetArticle`이 `style={{ '--accent': overrides.accent }}` 인라인 주입 / hero h1 = `overrides.hero_copy ?? content.hero.headline` / hero-art bg = `overrides.mood_image ?? gradient`. 잠금(로고·시그니처색·가격/CTA·SEO)은 슬롯 제외.
- **모바일 가독성**(§7.1): 본문 16px+ 보정 + sticky-buy(모바일 전용) 포함.
- **데스크톱 검증 마운트**: `/preview` 또는 신규 `/studio/preset-preview`에 명화(aroma L3) 마운트 + `data-preset` 토글(tradition/kitchen 재스킨 실측용). preset 토글 = 같은 DetailContent에 article data-preset만 교체 → 재스킨 즉시 확인.

### 4-B. commit 3 — SEO 가드 린터 (item 5, 프리셋 독립)
신규 `src/lib/seo/seo-guard-linter.ts`:
```
lintSeoGuards(product): { ok, orthogonalToPreset: true, checks: SeoCheck[] }
SeoCheck = { id, label, status: 'pass'|'warn'|'fail'|'manual', detail }
```
3체크(기존 모듈 조합, 신규 로직 최소):
1. `product_name_50` — `checkProductName()`(product-name-checker.ts) 재사용: 50자·금기어·중복. grade→status 매핑.
2. `main_image_white_bg` — naver-normalize white-bg 가드 재사용. 이미지 버퍼 가용 시 4모서리 luma/chroma 판정, 미가용 시 `manual`(degrade, 날조 0 #46).
3. `category_accuracy` — `naverCategoryCode` 존재·8자리 정규식·`resolveCategoryLeaf` 해결 여부. (1페이지 일치율 P1-A는 후속.)
- **항상 실행**: generate-detail·publish-preview 양 경로에서 호출, `concept_preset` 입력 0(직교 증명). 결과는 발행 게이트 신호로만(비가역 0).

### 4-C. commit 4 — generate-detail 엔진 소비 (item 6, additive)
`src/app/api/products/[id]/generate-detail/route.ts` additive 확장:
1. **프리셋 해석**: `product.concept_preset`/`preset_intensity` 우선, 미설정 시 `recommendPreset(categoryFamily)`. 신규 thin `categoryToFamily(naverCategoryCode|leaf)` 헬퍼(coarse 매핑, 과잉엔지니어링 금지 CONCEPT §6-D).
2. **DetailContent 조립**: grounded facts(#46) + ROI 카피(ADAPTIVE §3 톤×섹션) → 7섹션 content. aroma scents = product_options 있을 때만(조건부).
3. **발행 HTML**: `renderToStaticMarkup(<DetailPresetArticle …/>)` → 응답 `presetHtml`. 기존 `detailBase64`(PNG)·`detailHtml`(구 serializer)는 **보존**(병행).
4. **슬롯 노출**: 응답 `customization: { accent, heroCopy, moodImage, locked: [...] }`.
5. **SEO 린터**: `lintSeoGuards(product)` → 응답 `seoGuard`. 항상.
- 기존 ConceptTone/skeleton 경로·`buildDetailPage` 미접촉(회귀 0). 신규 필드 additive.

---

## 5. 전 commit 공통 검증 게이트
- `npx tsc --noEmit` 0 errors
- `npm run build` OK (TSC≠빌드 #32)
- 렌더 이모지 0 (Lucide만, JSX 이모지 금지 §3-1)
- 한글 코드 리터럴 0 (i18n 분리 §3-1·#35) — `grep -nE "혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두"` 0건
- 비가역 0 (네이버 PUT 0·발행 0·외부 이미지 API 런타임 0 #38)
- 토큰 정합 3-way (globals ↔ concept-presets ↔ 레퍼런스)
- push 후 `scripts/verify-vercel-deploy.sh --wait` exit 0 (#36)

---

## 6. Desktop 확인/병행 필요 (open)
- **item 3 확인**: Supabase `Product` 테이블에 `concept_preset`/`preset_intensity`/`preset_overrides` 3컬럼 존재·drift 0 재단정(이미 적용 추정 — ROADMAP 2026-06-04 "apply_migration 20260603 drift 0").
- **검증 트리거(완료 후)**: 명화(aroma L3) `/preview` React 렌더 실측 + `data-preset` 토글로 tradition/kitchen 재스킨 차별화 육안.
- **preset_overrides 실데이터**: 명화 accent/hero_copy 주입 여부(개입점 검증).
- **S2 빌드업(자산 트랙)**: hero-art/scent/story-art Firefly 배경 + Met CC0 모네 원작 → Canva/Figma 860px 양산. 코드는 슬롯(`mood_image`)만 제공, 실자산은 Desktop.

---

## 7. 커밋 시퀀스 요약
| commit | 범위 | 파일 | 비가역 |
|---|---|---|---|
| **A** | 토큰 정합 | globals.css + section-variants.ts + concept-presets.ts (+layout 폰트) | 0 |
| **B-1** | 7섹션 React 렌더러 (item 4) | `src/components/detail/preset/*` + detail-preset.ko.json + 미리보기 마운트 | 0 |
| **B-2** | SEO 가드 린터 (item 5) | `src/lib/seo/seo-guard-linter.ts` + 라우트 배선 | 0 |
| **B-3** | generate-detail 소비 (item 6) | generate-detail route + categoryToFamily 헬퍼 | 0 |

> item 3(Supabase)은 이미 완료 — 커밋 대상 아님.

---

## 8. 다음
설계 확정. 사용자 승인 시 **commit A(Phase A 토큰 정합)** 부터 turn 단위로 착수. 각 commit 완료 후 push + verify + TASK_BRIDGE/PROGRESS 갱신 → Desktop 교차검증 핑퐁(#41).
