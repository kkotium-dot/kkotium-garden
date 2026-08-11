# 현재 인계 (CURRENT) — 2026-08-12 세션 (부분재연동 안전장치 긴급 보강 완료)

> 다음 세션은 이 파일 → 해당 트랙 설계문서 → `PRINCIPLES_LEARNED.md` 순으로 읽고 시작.

- **status**: ✅ 부분재연동(#2) 안전장치 긴급 보강 완료 — 카테고리코드 wipe 위험(운영자 발견) 근본수정 + 실 dryRun 검증(발행 6건 중 2건) + DB 백필 스크립트 dry-run 완료(--apply는 미실행, Desktop 검토 대기). **confirm:true 실행은 여전히 하지 않음.**
- **branch**: `main` (커밋 예정 — 아래 참조)
- **배포 상태**: `9d4a13e`까지 배포·프로덕션 검증 완료 (이번 세션 변경분은 push 후 Vercel 배포·verify-deploy 확인 필요)

---

## ★★★★★★★★★ 부분재연동 안전장치 긴급 보강 — 완료 (2026-08-12, Code)

원본 지시: `docs/handoff/CODE_PARTIAL_SYNC_SAFETY_HANDOFF_2026-08-11.md`
결과 상세: `docs/handoff/CODE_PARTIAL_SYNC_SAFETY_FIX_2026-08-11.md`

**발견된 위험**: "듀얼 무선 가습기" dryRun 미리보기에 "카테고리코드: -"(빈 값)로 나왔는데 실제 네이버는 정확한 카테고리가 설정돼 있었음 — confirm:true 실행 시 v2 PUT(FULL REPLACE)이 실제 네이버 카테고리를 지웠을 위험(운영자가 실행 전 발견, Desktop이 중단).

**근본원인(코드 실측 확정)**: `/api/naver/products/update` 라우트가 `validateForRegistration()`이 이미 계산해 반환하던 `validation.canRegister`(카테고리 빈값이면 false)를 응답에만 실어 보낼 뿐 **PUT 실행 여부 결정에 전혀 쓰지 않았음**(register 라우트는 이 체크로 막는데 update 라우트만 빠져 있었음). 게다가 기존 §4-C GET-merge 방어(detailContent/sellerTags/metaDescription)는 카테고리·원산지 라벨을 커버하지 않았고, **dryRun 경로에는 GET-merge 자체가 없어서** 미리보기가 실제 전송값과 달랐음.

**수정(`src/app/api/naver/products/update/route.ts`)**:
1. GET-merge 방어를 `leafCategoryId`·`originAreaInfo.content`까지 확장(`applyNaverStateDefense()` 공용 함수로 리팩터).
2. 이 GET-merge를 dryRun 경로에도 동일 적용 — 미리보기 = 실제 전송값.
3. GET-merge 이후에도 `leafCategoryId`가 무효(8자리 숫자 아님)면 confirm:true 실 PUT을 409로 하드 블록 — "이 정도면 됐다" 없이 전 상품 공통 원천 차단.

**검증**: tsc 0 · build 0. 로컬 dev 서버에서 발행된 6개 상품 중 2개로 실제 dryRun 호출(Naver GET 포함, PUT은 미실행) — "듀얼 무선 가습기"가 `leafCategoryId: "50002540"`(이전 "-")·원산지 라벨 "중국산(꽃틔움(협력사))"(이전 없음)으로 정확히 복구됨을 확인, `wouldBlockRealPut: null`.

**옵션 B(DB 백필)**: `scripts/backfill-naver-category-origin.ts` 작성, dry-run 실행 결과 카테고리 5/6·원산지 6/6 fix 대상 — 인계문서의 실측치와 정확히 일치. **`--apply`는 실행하지 않음**(작업원칙 #41 두 환경 핑퐁 — production mutation은 Desktop이 dry-run 검토 후 실행). Desktop 검토 후 `npx tsx scripts/backfill-naver-category-origin.ts --apply`.

**남은 스코프**: 카테고리·원산지 라벨 2필드만 확장. `product-builder.ts` 18필드 화이트리스트 나머지(brand/asPhone/unitPrice 등)의 공백률 실측은 후속 과제로 남김(가장 위험한 카테고리 wipe는 하드블록으로 원천 차단됐다고 판단).

## 다음 세션 시작 순서
```
1. [필수, 순서대로] 이번 세션 변경분 커밋·push → verify-vercel-deploy.sh --wait 확인
2. [Desktop] docs/handoff/CODE_PARTIAL_SYNC_SAFETY_FIX_2026-08-11.md 재검증 —
   "듀얼 무선 가습기" dryRun을 프로덕션 UI로 직접 열어 카테고리코드가 실제 값으로
   보이는지 확인 (안전 확인되면 confirm:true 실전 투입 GO)
3. [Desktop 검토 후] scripts/backfill-naver-category-origin.ts --apply 실행 여부 결정
4. [운영자 판단] taxType vs naver_tax_type 컬럼 분리 이슈 근본수정 착수 여부
5. [운영자 방향 결정] 로드맵1b(8렌즈 쿼터 배분 시스템, sourcing-lenses.ts) 전체 연결 여부
6. [운영자 결정 필요] 미merge 브랜치 3개 처리(BRANCH_AUDIT_2026-08-11.md)
7. [기회 있을 때] 기존 6개 상품 썸네일 미표시 — "네이버에서 이미지 재동기화" 신규 기능 설계 검토
8. git stash `z3c-misdirected-changes-needs-redo` 처리 방향 — 여전히 운영자 결정 대기
```

---

## ★★★★★★★★★ 직전 세션 — 신규버그3건+브랜치3개조사 (2026-08-11, Desktop/Code)

1. **"온실 아틀리에" 오표시(#341, 커밋 `9de885a`)**: `/studio` 헤더 문구 정정, 프로덕션 확인.
2. **썸네일(추가이미지) "안 보임" — 코드 버그 아님으로 확인**: 신규 임포트 실측으로 정상 동작 확인. 기존 6개 상품만 구버전 import로 이미지 배열 빈 상태.
3. **즉시할인 단위 버튼 UX(커밋 `9d4a13e`)**: 칩 스타일로 클릭 가능함을 시각 강조.

**미merge 브랜치 3개 조사**(`docs/handoff/BRANCH_AUDIT_2026-08-11.md`): `feat/finish-image-router`(폐기 후보) · `feature/prompt-asset-engine`(재검토 후보) · `feature/sprint-7-m2-smart-asset-workflow`(병합 절대 금지 확정, 회귀 위험).

## ★★★★★★★★★ "네이버에도 반영" 부분재연동 실구현 (2026-08-11, Code)

원본 지시: `docs/handoff/CODE_NAVER_PARTIAL_SYNC_HANDOFF_2026-08-11.md`
결과 상세: `docs/handoff/CODE_NAVER_PARTIAL_SYNC_RESULT_2026-08-11.md`
설계(그대로 따름): `docs/design/NAVER_PARTIAL_SYNC_2026-08-11.md`

**3-A 변경 감지**: `products/new/page.tsx`에 `product-builder.ts`를 직접 읽어 확정한
18필드 화이트리스트(`NAVER_FIELD_LABELS`) + 순수 diff 함수.

**3-B UI**: "네이버에도 반영" 버튼(LINKED 상품에만, 변경 0건이면 비활성) → dryRun 모달
→ confirm 클릭 시 같은 라우트를 confirm:true로 재호출(#46 기존 GO 게이트 재사용).

**3-C 백엔드**: 백엔드 변경 0(당시 설계 예측). **→ 이번 세션(위 참조)에서 이 백엔드
경로의 카테고리 wipe 위험이 실제로 발견돼 안전장치를 긴급 보강함.**

**★부수 발견(수정 안 함)**: `Product.taxType`(폼이 저장하는 컬럼)과
`buildNaverProductPayload`가 실제로 읽는 `Product.naver_tax_type`이 **서로 다른
컬럼**임을 발견 — 화이트리스트에서 `taxType`을 제외해 오표시만 막고, 근본수정은
범위 밖이라 다음 라운드 후보로 기록만.

---

## ★★★★ 아침 소싱 알림 실발송·DB저장 검증 완료 (2026-08-11, Desktop+운영자)

**"남은 미확인 사실" 완전 해소.** DB 저장(8/11 신규 5건)·카테고리 다양성·Discord 실제 도착 전부 실측 확인. self-fetch 제거(maxDuration 문제 근본 해소)가 진짜 원인이었음이 실전 데이터로 확정됨.

## 아침 소싱 크론 통합 근본수정 (2026-08-11, Code)

원본 지시: `docs/handoff/CODE_SOURCING_ROOT_CAUSE_HANDOFF_2026-08-11.md`
결과 상세: `docs/handoff/CODE_SOURCING_ROOT_CAUSE_2026-08-11.md`

**증상 A(미발송)**: self-fetch 제거, `runSourcingScan()` in-process 통합.
**증상 B(카테고리 편중)**: 정렬 기준을 절대 ratio → risingRate로 교체.

## ★★★★★ 카테고리 센티널(50003307) — Desktop 프로덕션 최종 검증 완료 (2026-08-11)

Code 보고(커밋 `af6b95b`)를 전부 독립 재검증 — 오염 데이터 0건, 프로덕션 UI 정상 확인.

## ★★★★★★ 꽃밭 돌보기 원 요청 5건 — 전체 재검증 완료 (2026-08-11, Desktop)

5건 전부 실제로 작동 확인. #3(할인가)만 실증 데이터 부재로 검증 기회 대기.

## ★★★★★★★ 씨앗심기 정보완전성 4건 — Desktop 프로덕션 검증 완료 (2026-08-11)

#1 원산지 매핑, #4 즉시할인 인라인 배치 실측 검증 완료. #3은 코드 변경 없어 재검증 불필요.

---

## 절대 금지 + 교훈 (누적)
- 네이버 PUT/POST → 운영자 GO 없이 금지 · 자동발행 영구금지(#307)
- 디스코드 실발송 → 승인 없이 금지
- 신규 파일은 Desktop Commander:write_file만(#330) · 대용량MD 추가는 edit_block 앵커
- 테스트 데이터 방치 금지
- **UI 설정 화면 문구보다 curl/실측이 항상 우선**(#310)
- DB 캐시 정리는 규모 파악 후 id 지정 삭제만(전체 삭제 금지, #334)
- **낡은 인계문서의 "진행 중"·"대기 중" 표기를 실측 없이 믿지 말 것**(#318)
- **인계문서의 "확인됨" 서술도 재검증 대상**(#310 연장)
- 매일 자동 실행되며 실제 외부 발송을 일으키는 CI 워크플로(GitHub Actions 등) 추가·활성화 = 디스코드 실발송과 동급 승인 대상
- git stash `z3c-misdirected-changes-needs-redo` 처리 방향 — 여전히 운영자 결정 대기(손대지 않음)
- **self-fetch(자기 자신의 다른 API 라우트를 HTTP로 호출)는 별개 서버리스 함수 홉을 만든다**(#338) — 호출자의 maxDuration은 피호출 라우트에 적용되지 않는다.
- **인계문서가 "코드체계가 다를 수 있다"고 경고한 것도 실제로 코드를 추적해 확인하기 전엔 사실로 단정하지 말 것**(#339)
- **네이버에 실제로 PUT되는 필드와 씨앗심기 폼이 저장하는 DB 컬럼이 이름은 비슷해도 다른 컬럼일 수 있다**(#340) — `Product.taxType`(폼)과 `Product.naver_tax_type`(payload가 실제로 읽는 컬럼)이 서로 다른 사례.
- **DB 필드가 빈 값이라고 해서 "원래 비어있었다"고 가정하면 안 된다**(#341, 2026-08-12) — 초기버전 import route가 카테고리·원산지를 아예 채우지 않은 채 발행된 상품이 존재. v2 PUT은 FULL REPLACE라 빈 값을 그대로 보내면 네이버의 실제 값을 지운다. 부분 재연동/수정 계열 라우트를 새로 만들 때마다 "DB가 비어있는 게 곧 네이버도 비어있다는 뜻인가?"를 반드시 의심하고, GET-merge 방어 대상 필드에 포함시킬 것.
