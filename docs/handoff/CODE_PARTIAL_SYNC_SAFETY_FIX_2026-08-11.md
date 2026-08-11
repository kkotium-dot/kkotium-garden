# 결과 — 부분재연동 안전장치 긴급 보강: 앱 DB 공백 필드가 네이버 값을 덮어쓸 위험

> **담당**: Code, 2026-08-12
> **인계 원본**: `docs/handoff/CODE_PARTIAL_SYNC_SAFETY_HANDOFF_2026-08-11.md`
> **상태**: 옵션 A(즉시 방어) 구현·검증 완료. 옵션 B(DB 백필)는 dry-run 완료, `--apply`는 미실행(#41 핑퐁 — Desktop 검토 후 실행).

---

## 1. 근본원인 재확인 (코드 실측)

- `src/lib/naver/product-builder.ts`의 `validateForRegistration`은 `naverCategoryCode`가 8자리 숫자 형식이 아니면 이미 `errors`에 담고 있었다.
- 하지만 **`register`/`batch-register` 라우트는 `validation.canRegister`를 체크해 막는 반면, `/api/naver/products/update` 라우트는 이 체크를 전혀 하지 않았다.** `validation` 객체를 응답에 그대로 실어 보낼 뿐, PUT 실행 여부 결정에는 쓰이지 않았음 — 이게 실제 구멍.
- 기존 §4-C null 방어(GET-merge)는 `detailContent`/`sellerTags`/`metaDescription`만 커버했고, **`leafCategoryId`(카테고리)와 `originAreaInfo.content`(원산지 라벨)는 커버 대상이 아니었다.**
- 게다가 이 GET-merge는 **`confirm:true` 실 PUT 경로에서만 실행**되고 **dryRun 경로에는 없었다** — 그래서 미리보기가 "카테고리코드: -"로 보였던 것 (실제로 confirm:true를 실행했다면 §4-C가 있었어도 카테고리는 못 지켰을 것).

## 2. 구현한 방어 (옵션 A, `src/app/api/naver/products/update/route.ts`)

1. **GET-merge 방어 확장**: `applyNaverStateDefense()` 공용 함수로 리팩터 — 기존 3필드(`detailContent`/`sellerTags`/`metaDescription`)에 **`leafCategoryId`**와 **`originAreaInfo.content`**를 추가. DB-built 값이 빈 값/무효 형식이고 네이버 GET에 유효한 값이 있으면 그 값으로 payload를 교체.
2. **dryRun에도 동일 적용**: 이전엔 GET-merge가 실 PUT 경로에만 있었음. 이제 dryRun도 같은 함수를 호출해 미리보기가 실제 전송될 값과 100% 일치.
3. **하드 블록 신설**: GET-merge 이후에도 `leafCategoryId`가 여전히 8자리 숫자 형식이 아니면(DB도 비고 네이버 GET도 실패/비었을 때) **confirm:true 실 PUT을 409로 거부** — 카테고리를 지운 채 PUT하는 시나리오는 이제 코드 경로상 원천 차단. `originAreaCode`는 DB 기본값("0001")이 있어 이 문제 대상 아님(항상 유효한 코드가 존재) — 원산지는 라벨(`content`)만 GET-merge 대상.
4. dryRun 응답에 `nullDefense`(무엇을 보존했는지)와 `wouldBlockRealPut`(막힐 예정이면 그 사유) 필드 추가 — 운영자가 미리보기만 보고도 실 PUT이 통과/차단될지 알 수 있음.

`register`/`batch-register` 라우트는 신규 발행이라 "네이버의 기존 값을 지울 위험" 자체가 없어(아직 아무 것도 없음) 손대지 않음 — 이미 `canRegister` 게이트가 있어 위험과 무관.

## 3. 검증 (실제 개발서버 + 실 네이버 GET, PUT은 미실행)

`npx tsc --noEmit` 0 errors, `npm run build` 0 errors 확인 후, 로컬 dev 서버에서 발행된 6개 상품 중 2개로 `dryRun:true` 실제 호출:

**"듀얼 무선 가습기"(`cmsk2387l0001vzjevn46oxa4`)** — 운영자가 실제 위험을 발견했던 그 상품:
```
nullDefense: ["leafCategoryId=preserved(50002540)", "originAreaInfo.content=preserved"]
wouldBlockRealPut: null
leafCategoryId: "50002540"   (이전: "" 로 노출됐던 값)
originAreaInfo.content: "중국산(꽃틔움(협력사))"   (이전: 없음)
```

**"플라티코 국내산 대형 화분 커버"(`cmrgskk2x0001mu0h0eqkhud2`)**:
```
nullDefense: ["sellerTags=preserved(10)", "leafCategoryId=preserved(50001801)", "originAreaInfo.content=preserved"]
leafCategoryId: "50001801"
originAreaInfo.content: "국산"
```

인계 문서 §4의 검증 방법 1번(카테고리코드가 빈 값이 아니라 실제 네이버 값으로 나오는지) 충족 확인.

## 4. 옵션 B — DB 백필 (dry-run 완료, 미적용)

`scripts/backfill-naver-category-origin.ts` 작성 — 발행된 상품(`naverProductId` 있음) 전체를 스캔, 네이버 GET으로 실제 카테고리/원산지 라벨을 조회해 앱 DB가 비어 있으면 채운다. **GET만 사용(네이버 쪽 mutation 없음)**, `--apply` 없이는 앱 DB도 쓰지 않음(순수 dry-run 기본값).

실행 결과 (dry-run, 앱 DB 6건 전수):
```
scanned: 6, categoryFixed: 5, originFixed: 6, unchanged: 0, getFailed: 0
```
인계 문서 §2의 실측치(카테고리 5/6·원산지 6/6)와 정확히 일치 — 근본원인 진단이 맞았음을 재확인.

**`--apply`는 실행하지 않음** — 두 환경 핑퐁 프로토콜(작업원칙 #41: production mutation은 Desktop이 dry-run 검토 후 실행)에 따라 Desktop 검토 후 아래 명령으로 실행:
```bash
npx tsx scripts/backfill-naver-category-origin.ts --apply
```

## 5. 남은 스코프 (참고, 이번 라운드 미포함)

옵션 A의 GET-merge/하드블록은 카테고리·원산지 라벨 2필드만 확장했다. 인계 문서가 언급한 "product-builder.ts 18개 화이트리스트 전체" 관점에서, `brand`/`asPhone`/`unitPrice` 등 나머지 필드도 같은 "DB 기본값이 사실상 빈 값"인 패턴이 있는지는 이번 라운드에서 개별 점검하지 않음. 옵션 A의 카테고리 하드블록이 가장 위험한 케이스(FULL REPLACE로 상품 자체가 분류에서 이탈)를 원천 차단하므로 즉시 위험은 해소됐다고 판단하나, 나머지 필드의 공백률 실측은 후속 과제로 남긴다.

## 완료 체크리스트

- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run build` 0 errors
- [x] 실 dryRun 호출로 6개 상품 중 2개 검증(카테고리·원산지 라벨 정상 복구, wouldBlockRealPut: null)
- [x] `--apply` 미실행 확인 (앱 DB, 네이버 양쪽 모두 무변경)
- [ ] 커밋·push (다음 단계)
- [ ] Desktop dryRun 재검증 → 안전 확인되면 실전 투입 재개
