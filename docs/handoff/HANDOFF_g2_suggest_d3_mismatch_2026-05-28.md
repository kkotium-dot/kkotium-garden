# HANDOFF — G2 suggest API가 d1/d2와 정합하지 않는 d3 추천 (유령 카테고리 조합 / 소분류 자동완주 불가)

> **작성**: 2026-05-28 Desktop turn (Track B G2/G5 재검증 중 발견 — fix 9415169 production 실측)
> **상태**: [CLOSED 2026-05-28 Desktop] — e1c6fd6 production 재검증 통과: suggest 유령 triple(그릇장/컵보드) 소멸 (d3="" 정규화, usedAI:true 재계산) + 화면 d1/d2 자동입력 (생활/건강>주방용품) + partial 배너 + invalid_triple 소멸 + 소분류 수동선택 -> 카테고리코드 50005257 chip + 준비도 38->52%.
> **베이스라인**: HEAD `9415169` (origin/main, Vercel READY)
> **발견 경로**: Track B G2 재검증 — 도매매 36904429(아이스트레이) 등록 시작 -> 카테고리 자동추천 -> d1/d2 정확, d3 미완주
> **관계**: `HANDOFF_g2_category_prefill_skip_2026-05-28.md`의 후속. 그 핸드오프의 silent skip(자동호출 미발화)은 9415169로 **해소 확인됨**. 본 핸드오프는 그 너머에서 새로 격리된 *별개 층위*의 데이터 결함이다.

---

## 1. 증상 (production 실측, 9415169)

`/crawl` 소싱 보관함 36904429 "등록 시작" -> `/products/new?prefill=...` 이동 후:

- 상단 배너: `자동 매핑 실패: invalid_triple:생활/건강>주방용품>그릇장/컵보드. 카테고리를 직접 선택해주세요.` (배너가 *뜸* = silent skip 회귀는 해소됨)
- "카테고리 자동 추천" 버튼 클릭 시:
  - 대분류 = **생활/건강** (정확)
  - 중분류 = **주방용품** (정확, 의류 둔갑 0)
  - 소분류 = **선택(빈 값)** -- 자동완주 실패
- 즉 fix(synthetic mismatch -> suggest 자동호출)는 정상 발화하나, suggest가 돌려준 d3가 트리에 실재하지 않아 `getCategoryId`가 정당하게 거부 -> d3만 누락.

## 2. 근본 원인 (production API 직접 호출 + 로컬 트리 대조로 단정)

`POST /api/category/suggest` (productName=아이스트레이, domeCategoryCode=12_08_04_12_00):

```json
{ "success": true,
  "suggestions": [ { "d1": "생활/건강", "d2": "주방용품", "d3": "그릇장/컵보드", "d4": "" } ],
  "usedAI": false, "cacheHit": "name_hash" }
```

로컬 4,993 트리에서 "그릇장/컵보드" 조회 (`GET /api/naver/categories?q=그릇장`):

```json
{ "success": true, "count": 1,
  "categories": [ { "code": "50001317",
    "d1": "가구/인테리어", "d2": "주방가구", "d3": "그릇장/컵보드",
    "fullPath": "가구/인테리어 > 주방가구 > 그릇장/컵보드" } ] }
```

**단정**: "그릇장/컵보드" 소분류는 네이버 트리에서 오직 `가구/인테리어 > 주방가구` 하위에만 존재(code 50001317). 그러나 suggest는 d1/d2를 `생활/건강 > 주방용품`으로 선택해놓고 d3에 `그릇장/컵보드`를 붙임 -> **세 칸 조합이 네이버에 실재하지 않는 유령 카테고리**. `getCategoryId(생활/건강, 주방용품, 그릇장/컵보드)`는 NULL 반환이 정상(올바른 방어). 화면이 d3를 비운 것도 올바른 동작.

추가 단정: `usedAI:false, cacheHit:name_hash`. 이 오답은 AI 실시간 생성이 아니라 **name_hash 캐시에 박제된 invalid triple**. 한 번 오염된 캐시가 동일 오답을 반복 반환 중. 즉 (a) suggest 결과 self-validation 부재 + (b) 오염 캐시 정합 게이트 부재, 두 결함의 결합.

## 3. 영향 범위 (P1)

- 소분류는 네이버 검색 적합도(Relevance)에서 대/중분류보다 더 정밀한 노출을 좌우. d3 누락 = 검색 노출 손실.
- name_hash 캐시 오염이라 동일 상품명/유사 상품 반복 발생 가능. 36904429만의 문제가 아니라 **유사 생활용품 전반에 잠복**.
- 자동화 가치: d1/d2까지는 자동, d3만 수동 -> "거의 자동"이나 셀러가 매번 마지막 1칸을 손봐야 함. Track A 실발행 전 닫아야 SEO 온전.

## 4. 근본 수정 명세 (Code)

### Fix A (핵심) — suggest 결과를 로컬 트리로 self-validate 후 반환

파일: `src/app/api/category/suggest/route.ts` (응답 빌드 직전)

각 suggestion에 대해 반환 전 `getCategoryId(d1,d2,d3,d4)` 검증:

```
for each suggestion s:
  if getCategoryId(s.d1, s.d2, s.d3, s.d4) 가 유효(코드 반환):
     그대로 유지
  else if getCategoryId(s.d1, s.d2) 가 유효(2-depth):
     // d3가 트리와 불일치 -> d3/d4 비우고 d1/d2만 신뢰 (부분 자동입력 보장)
     s.d3 = ""; s.d4 = ""
  else:
     // d1/d2도 불일치 -> 해당 suggestion drop 또는 다음 후보로
```

-> 효과: 화면이 최소한 d1/d2(생활/건강>주방용품)는 *자동으로* 채우고, d3만 사용자가 1칸 선택. invalid_triple 배너 대신 "대/중분류 자동 입력됨, 소분류만 선택" 톤으로 격하.

> 선택 고도화: 같은 d2 하위의 유효한 d3 목록을 로컬 트리에서 끌어와 첫 항목을 fallback으로 제안하면 d3까지 자동완주 가능. 단 정확도 검증 필요(임의 d3 자동선택은 오분류 위험) -> **1차는 d1/d2만 신뢰하는 보수안 권장**, d3 자동선택은 대표 승인 후 별도 결정.

### Fix B — 오염 캐시 write 게이트 + 기존 오염 무효화

파일: suggest 캐시 write 지점 (name_hash/dome_code 캐시 INSERT/UPSERT)

- 캐시에 *쓰기 전* Fix A의 동일 validation 통과한 triple만 저장 (애초에 유령 조합이 캐시에 못 들어가게).
- 기존 오염 행 처리: 36904429(name_hash 기준) 캐시 1건 무효화/재계산. 광범위 정리는 별도 마이그레이션으로 분리 가능(우선 신규 오염 차단 + 본 픽스처만 우선).

### Fix C (확인) — prefill 자동경로에서도 d1/d2 부분 적용

`src/app/products/new/page.tsx` 2차 useEffect(suggest 자동호출 수신부): suggest가 d3="" (Fix A로 비워진) 케이스에서 d1/d2는 자동 set + status를 'matched(부분)' 톤으로. 현재는 수동 버튼 클릭 후에야 d1/d2가 들어감 -> 자동경로에서도 동일 보장 점검.

## 5. 검증 (Code)

- `npx tsc --noEmit` 0 / `npm run build` exit 0 / 한글 sentinel grep 0 (혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두)
- suggest API 재호출 시 d3가 트리 정합(또는 빈 값) 단정: `getCategoryId(응답 triple)` 이 항상 non-null 또는 d3="" 보장
- push 후 `scripts/verify-vercel-deploy.sh --wait` exit 0

## 6. 검증 후 재개 동선 (Desktop)

Code fix + Vercel READY 시 Desktop이 동일 36904429로:

1. `/crawl` -> 36904429 "등록 시작" -> `/products/new?prefill=...`
2. 카테고리 자동 입력 단정: d1/d2 자동 채움(생활/건강>주방용품) + d3는 유효 값 또는 명시적 빈 칸(invalid_triple 배너 소멸)
3. (Fix A 보수안이면) 소분류 1칸만 수동 선택 -> 카테고리코드 chip 표시
4. 통과 시 본 핸드오프 헤더 -> `[CLOSED]` + `HANDOFF_g2_category_prefill_skip` 헤더 -> `[CLOSED]`(silent skip은 이미 해소) + TASK_BRIDGE §7 ARCHIVED
5. G7(DRAFT 88필드 3중검증) -> G8(이미지) -> E1~E3(엑셀 88칸) 정주행 계속

## 7. 골든 픽스처 영구 보존

- 36904429(아이스트레이) = name_hash 캐시 오염 + 유령 triple 재현 표본. fix 후 회귀 테스트 케이스 보존.
- 검증 쿼리 세트(영구):
  - `POST /api/category/suggest` (아이스트레이) -> d3 트리 정합 단정
  - `GET /api/naver/categories?q=그릇장` -> 50001317 (가구/인테리어>주방가구) 유일 단정
