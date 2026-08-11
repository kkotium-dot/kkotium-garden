# 결과 — "네이버에도 반영" 부분 재연동 실구현 (2026-08-11, Code)

> 원본 지시: `docs/handoff/CODE_NAVER_PARTIAL_SYNC_HANDOFF_2026-08-11.md`
> 설계: `docs/design/NAVER_PARTIAL_SYNC_2026-08-11.md`(그대로 따름, 재설계 없음)
> tsc 0 · build 0 · dryRun까지 브라우저 실측 완료. **confirm:true 실행은 지시대로 하지 않음.**

---

## 구현 요약 (설계 §3 그대로)

### 3-A. 변경 감지 (dirty-field tracking)

`src/app/products/new/page.tsx`:
- 모듈 스코프에 `NAVER_FIELD_LABELS`(18개 필드 화이트리스트 → 사람이 읽는 라벨)와
  순수 함수 `computeNaverDirtyFields(baseline, current)` 신설.
- **화이트리스트는 `product-builder.ts`를 직접 읽고 확정**: `buildNaverProductPayload`가
  실제로 소비하는 DB 컬럼만 포함 — 상품명(`naver_title>seoTitle>name`), 카테고리
  (`naverCategoryCode`), 판매가, 대표/추가/상세 이미지, 상세설명+훅문구(`seoInfo`/
  `detailContent`), 셀러태그+키워드(`seoInfo.sellerTags`), 원산지(`originCode`),
  브랜드, AS 전화번호/안내, 판매자상품코드, 배송템플릿, 단위가격 4필드.
  **의도적으로 제외**: `supplierPrice`/`supplierId`(원가 정보, payload 미소비),
  `returnCareEnabled`(payload 미소비), `taxType`(⚠️ 아래 "부수 발견" 참조 — payload가
  실제로 읽는 컬럼은 `naver_tax_type`이라 이 폼의 `taxType` 상태와 다른 컬럼임을
  발견, 오표시 방지 위해 화이트리스트에서 제외).
- `naverRelevantFields` useMemo — 현재 폼 상태에서 화이트리스트 값만 추출.
- `naverHydrateSnapshotRef`(useRef) — 기준선(baseline). 두 시점에 정확히 1회만 설정:
  1. `?edit=` hydrate 로드가 정착되는 순간(`editLoadDone` false→true 전환, 그 순간
     폼 상태 = 마지막으로 확인된 네이버 상태와 일치).
  2. 같은 세션에서 "네이버 직접 등록"으로 신규 발행이 성공하는 순간(등록 직후
     payload = 방금 만든 폼 상태와 100% 일치하므로 새 기준선으로 정당).
- `naverDirtyFields` useMemo — 기준선과 현재 값을 필드별로 `JSON.stringify` 비교.

### 3-B. UI — 진입점 + 미리보기 + 확인

- "네이버에도 반영" 버튼을 저장 버튼 줄(발행 준비완료 검사 옆)에 배치.
  `savedNaverProductId`(LINKED)가 있을 때만 렌더 — 로컬 저장(자동)과 완전히 분리된
  명시적 액션(요청 원문 그대로).
  변경 필드 0건이면 비활성 + 툴팁 "변경된 내용이 없어요", N건이면 버튼에 개수 표시.
- 클릭 → `openNaverSyncModal()`이 기존 `/api/naver/products/update`를
  `dryRun:true`로 호출(백엔드 변경 없음, §3-C 참조) → 모달에 결과 렌더:
  - "이 필드가 바뀝니다 (N개)" — 변경 필드 라벨 배지(빨강 강조)
  - "그 외 M개 필드는 기존 값 그대로 유지됩니다" 안내
  - dryRun `payloadPreview`(상품명/판매가/카테고리코드/원산지코드) 사실확인 패널
  - "이 작업은 네이버 상품 정보를 전체 재전송해요(비가역)" 경고
  - "취소"(모달만 닫음) / "네이버에 반영"(2단계, `confirmNaverSync`)
- `confirmNaverSync()` — `window.confirm` 재확인 후 같은 라우트를
  `dryRun:false, confirm:true`로 재호출(#46 기존 GO 게이트 그대로, 새 게이트 없음).
  성공 시 `naverHydrateSnapshotRef.current`를 현재 값으로 갱신(새 기준선 — 반영 직후
  dirty 0으로 정상 복귀).

### 3-C. 백엔드 — 실측 결과: **변경 불필요 확정**

로컬 dev에서 실제 LINKED 상품(`cmsk2387l0001vzjevn46oxa4`, naverProductId
`11431754371`)으로 `/api/naver/products/update`를 `dryRun:true`로 직접 curl 호출한
결과, **기존 코드 그대로 정상 동작**함을 확인:
```
POST /api/naver/products/update {"productId":"...","dryRun":true,"fields":["name","salePrice"]}
→ success:true, payloadPreview{name, leafCategoryId, salePrice, originAreaInfo, sellerTags, ...}
```
설계 문서의 예측("백엔드 코드 변경이 아예 불필요할 가능성 높음")이 실측으로 확정됨 —
**`src/app/api/naver/products/update/route.ts` 변경 0**. `fields` 파라미터는 여전히
advisory(응답 에코만)이고, 모달의 강조 라벨은 클라이언트 측 `naverDirtyFields`(화이트
리스트 diff의 실제 소스)로 렌더 — 설계 §3-C의 "필요하면 fields를 응답 필터링용으로만"
옵션은 이번엔 불필요해 적용하지 않음(과잉 구현 방지).

---

## 부수 발견 (수정하지 않음, 다음 라운드 후보로 기록)

`Product.taxType`(씨앗심기 폼의 "과세/면세/영세율" 선택값, `productFormSerialize`가
저장하는 컬럼)과 `buildNaverProductPayload`가 실제로 읽는 `Product.naver_tax_type`이
**서로 다른 컬럼**이다(`product-builder.ts:1091`). 즉 씨앗심기에서 과세유형을 바꿔도
네이버 payload의 taxType은 안 바뀔 수 있다 — 별개의 기존 갭으로, 이번 라운드
지시(§3-A 화이트리스트 확정)를 수행하다 발견했다. 요청 범위 밖이라 손대지 않았고,
화이트리스트에서 `taxType`을 제외해 "네이버 반영 대상"으로 오표시하는 것만 막았다.
근본수정은 별도 라운드 판단 필요(어느 컬럼이 SoR인지 운영자 확인 후 착수 권장).

---

## 검증

- `npx tsc --noEmit` → 0 errors
- `npm run build` → 0 errors (`/products/new` 번들 65.8kB → 67.8kB, 신규 UI만큼 증가)
- **백엔드 실측**: 실 LINKED 상품으로 dryRun curl 호출 → `success:true`, 전체 payload
  프리뷰 정상 반환(위 §3-C).
- **브라우저 실측**(로컬 dev, `/products/new?edit=cmsk2387l0001vzjevn46oxa4`):
  1. 최초 진입 시 버튼 비활성 + "변경된 내용이 없어요" 확인.
  2. 상품명에 "(테스트수정)" 추가 → 버튼이 "네이버에도 반영 (1)"로 즉시 활성화 확인.
  3. 클릭 → 모달에 "이 필드가 바뀝니다 (1개) — 상품명" 배지, "그 외 17개 필드는
     기존 값 그대로 유지됩니다" 문구, dryRun 프리뷰(상품명/판매가 27,600원/카테고리
     코드 -/원산지코드 0001), 비가역 경고문 전부 정상 렌더 확인.
  4. **"네이버에 반영"(confirm) 버튼은 클릭하지 않음** — 지시 §3 그대로 준수.
  5. 상품명을 원래 값으로 되돌리고 자동저장 확인 → 버튼이 다시 비활성으로 복귀
     (dirty 재계산이 실시간으로 정확함을 추가 확인) → DB 직접 조회로 원상태 확인
     (`name` 원문 그대로, 테스트 데이터 잔존 없음).
  6. 콘솔 신규 에러 0(기존 SVG hydration 경고 1건은 무관한 기존 이슈).

## write set

- `src/app/products/new/page.tsx` — 3-A(스냅샷/diff) + 3-B(버튼/모달) 전체
- `src/app/api/naver/products/update/route.ts` — **변경 없음**(3-C 실측 결과)
- 본 결과 문서

## 다음 세션 시작 순서

1. **[운영자 재승인 대기]** 실전 투입 — Desktop이 이 dryRun 흐름을 재검증한 뒤,
   운영자가 실제 상품 1건을 골라 "confirm:true 실행 GO"를 명시적으로 낸 뒤에만
   실제 PUT 테스트 진행(#46 비가역, 이번 라운드는 코드 준비까지).
2. **[운영자 판단]** `taxType` vs `naver_tax_type` 컬럼 분리 이슈(위 "부수 발견")
   근본수정 착수 여부 — 어느 컬럼이 SoR인지 먼저 확인 필요.
3. 기존 대기 항목(로드맵1b, git stash `z3c-misdirected-changes-needs-redo`, 미merge
   브랜치 재확인)은 이번 라운드와 무관 — 그대로 대기.
