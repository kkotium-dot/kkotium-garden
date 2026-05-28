# HANDOFF — G2 prefill 카테고리 자동매핑 silent skip (얕은 catDepth 회귀)

> **작성**: 2026-05-28 Desktop turn (Track B G2~G8 정주행 검증 중 발견)
> **상태**: [CLOSED 2026-05-28 Desktop] — silent skip(자동호출 미발화)은 9415169로 해소, d3 불정합(유령 triple)은 e1c6fd6로 해소. e1c6fd6 production 재검증에서 G2 전체 통과(d1/d2 자동 + 소분류 수동선택 -> 카테고리코드 50005257). 후속 HANDOFF_g2_suggest_d3_mismatch_2026-05-28.md 도 [CLOSED].
> **베이스라인**: HEAD `9415169` (origin/main, Vercel READY) — 원 silent skip fix 반영본
> **발견 경로**: Track B G2 게이트 — 도매매 36904429(아이스트레이) 등록 시작 -> prefill -> 카테고리 3칸 empty

---

## 1. 증상

`/crawl` 소싱 보관함에서 36904429 "등록 시작" 클릭 -> `/products/new?prefill=base64` 정상 이동 + prefill 페이로드 완전 운반. 그러나:

- 카테고리 대/중/소 3칸 모두 empty (카테고리코드 미표시)
- 카테고리 자동매핑 배너(mismatch/autofilling/autofilled/failed) **하나도 안 뜸** = 분기 자체 미진입
- 수동 "카테고리 자동 추천" 버튼 클릭 시 -> 생활/건강 > 주방용품 정상 입력 (수동 경로는 정상)

## 2. 근본 원인 (production 실측 + API 직접 호출로 단정)

`/api/category/suggest` 직접 호출 결과 (domeCategoryCode=12_08_04_12_00 동봉):

```json
{ "success": true, "usedAI": true,
  "suggestions": [
    { "d1": "생활/건강", "d2": "주방용품", "d3": "그릇장/컵보드", "d4": "" },
    { "d1": "가구/인테리어", "d2": "주방가구", "d3": "그릇장/컵보드", "d4": "" }
  ],
  "pageValidation": { "applied": "override", "dominantD1": "생활/건강", "dominantD2": "주방용품", "dominantShare": 1 } }
```

-> suggest API는 아이스트레이를 주방용품으로 **정확히 매핑** (의류 둔갑 0 = B-12 효과 API 레벨 통과).

범인은 `src/app/products/new/page.tsx` prefill useEffect의 진입 가드:

```ts
// 첫 prefill useEffect 내부
if (data.catD1 && data.catD2 && data.catD3) {     // <- 3개 모두 있어야 진입
  const probeCode = getCategoryId(data.catD1, data.catD2, data.catD3, data.catD4 ?? '');
  if (probeCode) { setD1/D2/D3 ... setCrawlCatStatus('matched') }
  else           { setCrawlCatStatus('mismatch') }  // <- mismatch도 이 블록 안에서만 set
}
// catD1만 있거나 0개면 -> 위 블록 통째로 skip -> mismatch 상태가 안 됨
//                       -> 2차 useEffect(mismatch -> suggest 자동호출)도 트리거 안 됨
```

도매꾹 `getItemView`가 카테고리 최하위 레이블만 보내면(36904429는 `catD1="아이스트레이"`만, catD2/catD3 없음) 가드를 통과 못 하고 자동매핑 전체가 **silent skip**된다. 명화송풍구(65322245)는 화보가 풍부해 catD1~D3가 다 채워졌기에 우연히 발현 안 됨.

## 3. 영향 범위 (P1)

- 도매꾹 저가 생활용품/위탁 상품은 카테고리 depth가 얕은 경우 흔함 -> 크롤 -> 등록 시작 -> 카테고리 텅 빔 -> 셀러가 4,993개 분류를 매번 수동 검색.
- 자동화 앱의 핵심 가치(크롤 -> 자동 카테고리)가 얕은 depth 상품에서 깨짐. 단 수동 버튼은 살아있어 "완전 불능"은 아님(자동 -> 수동 격하).
- 카테고리 정확도 = 네이버 검색 적합도(Relevance) 1순위 구성요소이므로 SEO 직접 타격.

## 4. 근본 수정 명세 (Code, 1 파일)

파일: `src/app/products/new/page.tsx` (첫 prefill useEffect)

### Fix A (근본) — 얕은 depth도 suggest fallback으로 유도

```ts
// BEFORE
if (data.catD1 && data.catD2 && data.catD3) {
  const probeCode = getCategoryId(data.catD1, data.catD2, data.catD3, data.catD4 ?? '');
  if (probeCode) { setD1(data.catD1); setD2(data.catD2); setD3(data.catD3); if (data.catD4) setD4(data.catD4); setCatTab('drill'); setCrawlCatStatus({ kind:'matched', ... }); }
  else { setCatTab('drill'); setCrawlCatStatus({ kind:'mismatch', rawD1:data.catD1, rawD2:data.catD2, rawD3:data.catD3 }); }
}

// AFTER — full triple면 기존대로, 아니면(얕은 depth/0개) productName 기반 suggest로 보냄
if (data.catD1 && data.catD2 && data.catD3) {
  const probeCode = getCategoryId(data.catD1, data.catD2, data.catD3, data.catD4 ?? '');
  if (probeCode) { setD1(data.catD1); setD2(data.catD2); setD3(data.catD3); if (data.catD4) setD4(data.catD4); setCatTab('drill'); setCrawlCatStatus({ kind:'matched', d1:data.catD1, d2:data.catD2, d3:data.catD3, d4:data.catD4 || undefined }); }
  else { setCatTab('drill'); setCrawlCatStatus({ kind:'mismatch', rawD1:data.catD1, rawD2:data.catD2, rawD3:data.catD3 }); }
} else if (data.productName) {
  // Shallow or missing dome category depth -> route to productName-based suggest.
  // 2nd useEffect listens on crawlCatStatus.kind === 'mismatch'. Use a synthetic
  // mismatch marker so the existing suggest path fires (it depends on productName + crawlCatCode).
  setCatTab('drill');
  setCrawlCatStatus({ kind:'mismatch', rawD1: data.catD1 ?? '', rawD2: data.catD2 ?? '', rawD3: data.catD3 ?? '' });
}
```

> 2차 useEffect는 `crawlCatStatus.kind === 'mismatch'` + `productName.trim()` 조건으로 `/api/category/suggest`를 호출하므로, 위 synthetic mismatch만 set하면 기존 매핑 경로가 그대로 재사용된다. crawlCatCode(도매꾹 코드)도 이미 별도 state로 set되어 dome_code 캐시 우선 적용됨.

### Fix B (권장) — 소분류(d3) 완주 보장

수동 "카테고리 자동 추천" 버튼 onClick과 2차 useEffect 모두 suggest 1순위의 d3까지 set하는데, production 실측상 d3가 비는 케이스 관찰됨(생활/건강 > 주방용품 까지만). suggest 결과 `d3="그릇장/컵보드"`가 `getCategoryId` validation을 통과하는지 점검 후, validated 우선 적용 로직이 d3를 누락하지 않게 확인. (이미 validated.find 로직이 있으나, 첫 suggestion의 d4="" 케이스에서 set 직후 d4 미설정으로 categoryId가 안 잡힐 수 있음 -> getCategoryId 3-depth fallback 동작 재확인.)

## 5. 검증 (Code)

- `npx tsc --noEmit` 0 / `npm run build` exit 0 / 한글 sentinel grep 0 (혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두)
- push 후 `scripts/verify-vercel-deploy.sh --wait` exit 0

## 6. 검증 후 재개 동선 (Desktop, 작업원칙 #41 + #45)

Code fix + Vercel READY 시 Desktop이 동일 36904429로:

1. `/crawl` -> 36904429 "등록 시작" -> `/products/new?prefill=...`
2. 카테고리 3칸 자동 입력 단정 (생활/건강 > 주방용품 > 그릇장/컵보드 또는 suggest 1순위)
3. 카테고리코드 chip 표시 단정 (의류 둔갑 0)
4. 통과 시 본 핸드오프 헤더 -> `[CLOSED]` + TASK_BRIDGE §7 ARCHIVED, G7~G8 + E1~E3 정주행 계속

## 7. 회귀 재현 케이스 영구 보존

36904429(아이스트레이) = 도매꾹 카테고리 depth 얕음(catD1만) 재현 표본. fix 후 회귀 테스트 케이스로 보존 권장.
