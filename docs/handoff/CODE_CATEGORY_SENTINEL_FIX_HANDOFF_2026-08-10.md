# 작업 인계 — "가구다리(50003307)" 미분류 센티널 충돌 근본수정 (긴급)

> **담당 레인**: Claude Code
> **작성**: Desktop, 2026-08-10
> **BASELINE**: main 최신(`git pull`, 현재 `03ac638`)
> **의존성**: 없음(다른 레인과 write set 안 겹침 — 크론 조사는 `.github/`·`cron/`, 이 작업은 카테고리 상수+씨앗심기 폼)
> **긴급도**: 최우선 — 운영자가 실제 상품 편집 화면에서 재현·스크린샷으로 확정한 심각 버그

---

## 1. 증상 (운영자 재현, Desktop 실측 확정)

씨앗심기(`/products/new?edit={id}`)에서 상품을 열면 카테고리가 **"가구/인테리어 > DIY자재/용품 > 가구부속품 > 가구다리(코드 50003307)"로 이미 채워진 채** 나온다. AI 추천을 누른 게 아니라, **편집 화면 진입 시 자동으로 이렇게 표시됨**. 완전히 무관한 상품(LED 차량용가습기 등)에서도 재현.

## 2. 근본 원인 확정 (Desktop 실측)

**`50003307`이 시스템 전체에서 "카테고리 미분류/기본값" 센티널로 15곳에 하드코딩돼 있는데, 동시에 이 코드가 카테고리 사전(`naver-categories-full.ts`)에 실제 카테고리 "가구/인테리어 > DIY자재/용품 > 가구부속품 > 가구다리"로도 등록돼 있다.**

DB 확인: `Product.naverCategoryCode = '50003307'`인 상품이 **5건** 존재(원래는 "미분류"였어야 할 상품들). 씨앗심기 폼이 이 값을 "이미 선택된 정상 카테고리"로 읽어 그대로 화면에 채워버려서, 운영자 눈엔 "AI가 가구다리로 잘못 추천했다"처럼 보인다 — 실제로는 **AI 추천이 실행된 게 아니라 DB에 저장된 미분류 센티널 값을 폼이 그대로 렌더링**하는 것.

### 15곳 전수 목록 (grep 결과, Desktop 확인)
```
src/app/products/page.tsx:169   — p.naverCategoryCode === '50003307' (미분류 판정)
src/app/products/page.tsx:1299  — p.category === '50003307' (미분류 판정)
src/app/products/page.tsx:1411  — 위와 동일 조건 반복
src/app/api/products/clone/route.ts:43           — source.naverCategoryCode ?? '50003307' (복제 시 기본값)
src/app/api/crawl/batch-register/route.ts:86      — sanitize(...) || '50003307' (크롤 등록 시 기본값)
src/app/api/upload-readiness/auto-fill/route.ts:286 — code === '50003307' (미분류 판정)
src/app/api/seo/name-diagnosis/route.ts:43        — code !== '50003307' (SEO 진단 조건)
src/components/naver-seo/NaverSeoProductTable.tsx:70 — const DEFAULT_CATEGORY = '50003307'
src/components/dashboard/DailyPlanWidget.tsx:66   — p.naverCategoryCode !== '50003307' (미분류 판정)
src/lib/daily-slots.ts:230                        — 동일 패턴, 슬롯 스코어링에 사용
src/lib/naverCategories.ts:100                    — 카테고리 사전 정의 자체(가구다리)
src/lib/naver/codes.ts:34                         — 별도 사전(FLOWER_CATEGORY_CODES)에 같은 코드가 "식물>관엽식물"로 다르게 정의(레거시, naver-settings 화면 전용, 이 버그와 직접 무관하나 데이터 불일치 존재)
src/lib/naver/naver-categories-full.ts:17         — 메인 카테고리 사전(활성) — 여기가 "가구다리"로 정의된 원천
src/lib/kkotti-naver/evaluate.ts:209               — code: '50003307' (기본값)
src/lib/seo.ts:6                                  — const DEFAULT_CATEGORY_CODE = '50003307'
src/lib/upload-readiness.ts:92,95                 — naverCategoryCode !== '50003307' (완성도 판정)
```

## 3. 근본 수정 방향 (전 상품 공통, #55 — 단건 수습 금지)

**핵심 아이디어**: 미분류 센티널을 **카테고리 사전에 존재하지 않는 값**으로 바꾼다. 두 가지 선택지:

**옵션 A(권장) — 센티널을 빈 문자열 `''`로 통일**
- 위 15곳의 `'50003307'` 리터럴을 전부 `''`(빈 문자열) 또는 `null`로 교체.
- DB 마이그레이션: 현재 `naverCategoryCode = '50003307'`인 5건을 `''`(또는 스키마가 nullable이면 `null`)로 UPDATE.
- 장점: 사전과 완전히 분리, 재발 불가능. `naver-categories-full.ts:17`의 "가구다리" 항목은 실제 카테고리로 그대로 유지(진짜 가구다리 상품을 위해 필요).
- 리스크: 15곳 전부 빠짐없이 바꿔야 함(하나라도 놓치면 그 지점만 재발). **`naverCategoryCode` 컬럼이 not-null 제약이 있는지 먼저 확인**(prisma/schema.prisma) — nullable이 아니면 빈 문자열로, nullable이면 null이 더 깔끔.

**옵션 B — 사전에서 50003307 항목을 아예 제거**
- "가구다리"라는 실제 카테고리 자체가 매우 드물게 쓰이는 세부 카테고리라면, 사전에서 완전히 빼고 다른 코드로 대체 검토. 단 이러면 실제 "가구다리" 상품을 등록할 방법이 없어지므로 비권장 — 네이버 실제 카테고리 체계와 어긋남.

**Desktop 권장: 옵션 A.** 이유: 실제 카테고리 데이터(네이버 공식 코드 체계)는 그대로 두고, "우리 시스템의 미분류 표현 방식"만 바꾸는 게 데이터 무결성 원칙에 맞다.

## 4. 검증 방법 (필수)
1. 옵션 A 적용 후 `grep -rn "50003307" src/` 실행 — **카테고리 사전 정의(`naverCategories.ts`·`naver-categories-full.ts`) 2곳만 남아야 함**(진짜 카테고리 데이터이므로 유지). 나머지 13곳은 전부 빈 문자열/null로 교체됐는지 확인.
2. DB 마이그레이션 후 `SELECT COUNT(*) FROM "Product" WHERE "naverCategoryCode" = '50003307'` → 0건 확인.
3. **브라우저 실측 필수**: 미분류 상품(`?edit=cmsk23ahi0007vzjezafjys06` 등 이번에 재현된 상품)을 열어서 카테고리 필드가 이제 **빈 상태("선택" 플레이스홀더)로 나오는지** 확인 — 더 이상 "가구다리"가 자동으로 안 채워져야 함.
4. **회귀 확인**: 실제로 "가구다리" 카테고리를 의도적으로 선택한 정상 상품이 있다면(현재는 없어 보이지만), 그 상품이 여전히 "가구다리"로 정확히 표시되는지 확인 — 옵션 A는 사전을 안 건드리므로 정상이어야 함.
5. tsc 0 · build 0.

## 5. write set
15개 파일 — 위 목록 그대로. **DB 마이그레이션 SQL도 필요**(Supabase MCP로 실행 가능, 신중하게 — 5건뿐이라 안전).

## 6. 완료 후
- 결과 문서: `docs/handoff/CODE_CATEGORY_SENTINEL_FIX_RESULT_2026-08-10.md`
- 커밋·push → 채팅 인계
- Desktop이 프로덕션 브라우저로 재검증(스크린샷 재현했던 그 상품으로)

## 체크리스트
- [ ] `git pull` 후 baseline 확인
- [ ] prisma schema에서 `naverCategoryCode` nullable 여부 확인
- [ ] 15곳 중 13곳(센티널 용도) → `''` 또는 `null`로 교체, 2곳(사전 정의)은 유지
- [ ] DB의 기존 오염 5건 UPDATE
- [ ] `grep -rn "50003307" src/` 재확인 — 사전 2곳만 남았는지
- [ ] tsc 0 · build 0
- [ ] 브라우저로 재현했던 상품 재검증(빈 카테고리로 나오는지)
- [ ] 결과 문서 + 커밋·push + 채팅 인계

---

## 부록 A — 추가 발견 이슈 2건 (같은 세션, Desktop 조사)

### A-1. "동기화 아이콘" 정체 불명 (UX 개선, 별도 커밋 권장)

**증상**: 운영자가 꽃밭 돌보기 목록에서 "네이버 동기화 버튼 옆 아이콘이 뭔지 모르겠다"고 신고.

**조사 결과**: `src/app/products/page.tsx`의 각 상품 행 우측 액션(호버 시 노출)에 있는 화살표 커브 SVG 버튼:
```jsx
<button onClick={e => toggleStatus(e, p)} title="상태 변경" ...>
  <svg ...><path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/></svg>
</button>
```
정체는 **"상태 변경"**(`toggleStatus` — DRAFT→READY→ACTIVE→OUT_OF_STOCK→INACTIVE→ACTIVE 순환). "동기화"가 아니다.

**문제 2가지**:
1. 아이콘 모양(위아래 화살표 순환)이 "동기화"로 오인되기 쉽다. 텍스트 라벨이 없고 `title` 툴팁(호버해야만 보임)만 있다.
2. **확인창(confirm) 없이 클릭 즉시 상태가 바뀐다** — 실수로 누르면 바로 상태 전환. 다른 상태 변경 액션들(SidePanel의 `changeStatus`)은 전부 `window.confirm()` 게이트가 있는데 이 버튼만 없음(#46 원칙 불일치).

**권장 수정(전 상품 공통 관점)**:
- 아이콘을 명확한 것(예: 상태를 나타내는 배지/화살표가 아닌 "재생/순환" 느낌이 덜한 아이콘)으로 교체하거나, 호버 시 다음 상태를 명시하는 텍스트 추가.
- `window.confirm()` 게이트 추가해 다른 상태 변경 경로(SidePanel)와 일관성 확보 — 실수 클릭으로 상태가 바뀌는 사고 방지.
- write set: `src/app/products/page.tsx`의 `toggleStatus` 호출부(목록 행 버튼) — SidePanel의 `changeStatus`와 다른 함수이니 주의.

### A-2. 네이버 가져오기 시 순마진 계산이 왜곡됨 (설계 한계, UX 안내 필요)

**증상**: 운영자가 "가져온 상품의 순마진 등 정보가 제대로 가져와지는지" 확인 요청.

**조사 결과(코드 자체 주석으로 확인)**: `src/app/api/products/import/route.ts:155` — `supplierPrice: 0, // unknown for an imported listing (no cost basis)`. **네이버 API 응답에는 매입원가(공급가) 정보가 원천적으로 없다** — 네이버는 판매가만 알고 셀러의 원가는 모른다. 이건 버그가 아니라 데이터 소스의 근본적 한계.

**결과**: 가져온 직후 상품은 `supplierPrice=0, margin=0`으로 저장되어, 순마진 계산(판매가-공급가-배송비 등)이 왜곡된 값(사실상 0 또는 100%에 가까운 값)을 보여줄 수 있다. 운영자가 공급사 원가를 수동으로 입력하기 전까지는 마진 수치가 신뢰할 수 없다.

**권장 수정(UX 안내 강화, 전 상품 공통)**:
- 씨앗심기·꽃밭돌보기 목록에서 `supplierPrice === 0 && source === 'IMPORTED'`인 상품에 **"공급가 미입력 — 마진 계산 불가"** 같은 명시적 배지/경고 표시. 조용히 잘못된 0%나 왜곡값을 보여주는 대신, 정직하게 "아직 모른다"고 알린다(#325 정직한 미달성 표시 원칙과 동일 사상).
- `MarginCell`, `SidePanel`의 마진 표시 부분에 이 조건 추가 검토.
- write set: `src/app/products/page.tsx`의 `MarginCell` 컴포넌트 + `SidePanel`의 "가격" 섹션.

## 부록 A 체크리스트
- [ ] A-1: `toggleStatus` 버튼에 confirm 게이트 추가 (SidePanel과 일관성)
- [ ] A-1: 아이콘/라벨 개선(선택, UX 판단)
- [ ] A-2: `supplierPrice===0 && IMPORTED` 조건에 마진 미확정 배지 추가
- [ ] tsc 0 · build 0
- [ ] 브라우저 검증

