# 현재 인계 (CURRENT) — 2026-08-12 세션 (부분재연동 안전장치 + import 필드완전성 갭 10건 완료)
<!-- 2026-08-19 Cowork 문서정정: 아침 소싱 알림 "완료" 오기 → "미해결·계측 중"으로 정정, 재조사 금지 목록 추가, branch 실제 상태 반영 -->
<!-- 2026-08-27 Cowork 문서정정: cron_invocation_log 실측(6개 크론 전부 매일 정상, sourcing-daily 8/20~25 ok) → "미발송" 표기를 "정상 발화·적재 확인, 잔여=추천 품질"로 정정 -->


> 다음 세션은 이 파일 → 해당 트랙 설계문서 → `PRINCIPLES_LEARNED.md` 순으로 읽고 시작.

- **status**: ✅ 부분재연동(#2) 안전장치 긴급 보강 완료(카테고리코드 wipe 위험 근본수정) → ✅ import route 필드 완전성 갭 10건 판정 완료(5건 매핑 구현, 5건 "네이버 API에 대응 없음/내부개념"으로 확정). 백필 스크립트 하나로 통합, dry-run만 실행(--apply는 미실행, Desktop 검토 대기). **confirm:true 실행은 여전히 하지 않음.** ✅ **아침 소싱 알림은 실측(cron_invocation_log, 8/20~25) 결과 6개 크론 전부 매일 정상 발화·적재 확인됨 — 아래 정정 섹션 참조. 잔여 과제는 발송 여부가 아니라 추천 품질.**
- **branch**: `main` — 이번 세션(import 필드완전성) 변경분 **아직 미커밋·미push** (커밋 해시 미발급). 배포 반영 안 됨. 다음 세션 최우선 = 커밋·push·verify-deploy(아래 "다음 세션 시작 순서" 1번).
- **배포 상태**: `627960f`(부분재연동 안전장치)까지 배포·프로덕션 검증 완료. 이번 세션(import 필드완전성) 변경분은 push 후 Vercel 배포·verify-deploy 확인 필요.

---

## ★★★★★★★★★ import route 필드 완전성 갭 10건 — 완료 (2026-08-12, Code)

원본 지시: `docs/handoff/CODE_IMPORT_FIELD_COMPLETENESS_HANDOFF_2026-08-11.md`
결과 상세: `docs/handoff/CODE_IMPORT_FIELD_COMPLETENESS_2026-08-11.md`

**전수 판정(실제 `getProduct()` 6개 상품 GET으로 확인, 추측 금지 #82)**: 화이트리스트 10건 중 **5건은 실제로 네이버가 구조화된 필드로 돌려줘 매핑 완료** — asPhone/asGuide(`afterServiceInfo`) · brand(`naverShoppingSearchInfo.brandName` → `naver_brand`) · sellerCode(`sellerCodeInfo.sellerManagementCode` → `sellerProductCode`) · unitPrice(`unitPriceInfo`, 실측 예시 없지만 대칭 구조 확인 후 구현). **나머지 5건은 "매핑 불가"로 확정**: detailImages/detailImageUrl/hookPhrase는 네이버가 `detailContent` 하나의 HTML로 이미 합쳐 돌려줘 구조적으로 복원 불가(파싱 추측 하지 않음), keywords는 `sellerTags`로 이미 병합돼 돌아와 분리 불가(다만 `tags`는 이미 임포트됨), shippingTemplateId는 우리 로컬 `ShippingTemplate` 테이블 FK라 애초에 네이버 응답에 없음.

**★부수 발견(수정 안 함, #340과 같은 패턴, 원칙 #342 등재)**: `sellerCode` 화이트리스트가 실제로 추적하는 폼 컬럼(`Product.sku`)과 `buildNaverProductPayload`가 실제 PUT에 쓰는 컬럼(`Product.sellerProductCode`)이 서로 다름 — 폼에서 판매자 상품코드를 바꿔도 네이버 payload는 안 바뀔 수 있음. `brand`/`naver_brand`는 한술 더 떠 outgoing PUT 페이로드 어디에도 안 들어감(내부 완결성 점수용으로만 쓰임). 둘 다 부분재연동 dirty-field 감지기가 추적은 하지만 실제 네이버 반영 효과가 없는 필드 — 이번 스코프(import route) 밖이라 기록만.

**구현**: `src/app/api/products/import/route.ts`에 `pickAfterService`/`pickBrand`/`pickSellerCode`/`pickUnitPrice` 4개 헬퍼 추가, `prisma.product.create()`에 8개 컬럼 연결.

**검증**: tsc 0 · build 0. 실제 미연동 네이버 상품(`11431754381`)을 로컬 dev로 신규 임포트해 5개 필드 전부 정확히 채워짐을 DB로 확인, 테스트 상품 즉시 DELETE로 정리(잔존 0).

**백필 통합**: `scripts/backfill-naver-category-origin.ts`(부분재연동 안전장치 세션에서 만든 스크립트)를 하나로 확장 — 카테고리·원산지에 더해 asPhone/asInfo/naver_brand/sellerProductCode/단위가격까지 "앱 DB 빈 값만 채움" 원칙으로 통합. dry-run 재실행: `fieldsFixed: 23`(카테고리5+원산지6+브랜드6+판매자코드6). asPhone/asInfo는 6건 전부 스키마 기본값(플레이스홀더)이 이미 채워져 있어 "빈 값"으로 판정되지 않아 대상 제외(안전 원칙 그대로 지킴, 수동 확인 필요 항목으로 별도 기록). **`--apply`는 미실행**(#41).

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
1. [필수, 순서대로] 이번 세션(import 필드완전성) 변경분 커밋·push → verify-vercel-deploy.sh --wait 확인
2. [Desktop] docs/handoff/CODE_PARTIAL_SYNC_SAFETY_FIX_2026-08-11.md +
   CODE_IMPORT_FIELD_COMPLETENESS_2026-08-11.md 재검증 — "듀얼 무선 가습기" dryRun을
   프로덕션 UI로 직접 열어 카테고리코드가 실제 값으로 보이는지 확인
   (안전 확인되면 confirm:true 실전 투입 GO)
3. [Desktop 검토 후] scripts/backfill-naver-category-origin.ts --apply 실행 여부 결정
   (카테고리·원산지·브랜드·판매자코드 23건 백필 대상)
4. [운영자 판단] sellerCode(sku vs sellerProductCode)·brand(payload 미포함) 컬럼
   불일치 근본수정 착수 여부 — taxType vs naver_tax_type(#340)과 같은 계열
5. [운영자 판단] taxType vs naver_tax_type 컬럼 분리 이슈 근본수정 착수 여부
6. [해결됨 — 2026-08-27] 아침 소싱 알림 실발송: `cron_invocation_log` 실측으로 정상 발화·적재 확인(위 정정 섹션 참조). 재조사 불필요, 잔여는 추천 품질
7. [운영자 방향 결정] 로드맵1b(8렌즈 쿼터 배분 시스템, sourcing-lenses.ts) 전체 연결 여부
8. [운영자 결정 필요] 미merge 브랜치 처리 — 유효 2건만 남음: prompt-asset-engine(재검토)·
   sprint-7-m2(병합 금지 확정). ahead=0 4건은 이미 반영됨(BRANCH_AUDIT / WORK_SCHEDULE_BOARD 참조)
9. [기회 있을 때] 기존 6개 상품 썸네일 미표시 — "네이버에서 이미지 재동기화" 신규 기능 설계 검토
10. git stash `z3c-misdirected-changes-needs-redo` 처리 방향 — 여전히 운영자 결정 대기
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

## ✅ 아침 소싱 알림 실발송 — 정상 발화·적재 확인 (2026-08-27 정정)

> **정정 사유(2026-08-27)**: 직전에 이 섹션은 8/12 시점 재확인을 근거로 "미해결 — 계측 중"으로 기록돼 있었다. `cron_invocation_log` 실측 결과 6개 크론(sourcing-daily 포함) 전부 8/20~8/25 기간 매일 정상 발화·적재됨이 확인됐다. 8/12 시점의 미발송 관측이 그 이후에도 계속됐다는 근거는 없다 — 상태를 **정상 발화·적재 확인**으로 정정한다. (원칙 #310 연장 — "미해결" 서술도 최신 실측으로 재검증 대상이라는 원칙을 동일하게 적용.)

- **현재 상태**: `cron_invocation_log` 조회 결과 6개 크론 전부 8/20~8/25 매일 정상 실행·적재 확인(sourcing-daily 포함). 미발송 문제는 재현되지 않음.
- **잔여 과제**: 발송 여부가 아니라 **추천 품질**(카테고리 편중 등)로 초점 이동. 발송 자체를 다시 의심할 근거가 새로 나오기 전까지 이 항목의 "재조사"는 불필요.
- **금지 사항 준수**: 실 Discord 발송 테스트(크론 수동 실행)는 실제 알림이 나가므로 운영자 승인 없이 금지.

### 🚫 재조사 금지 목록 — 이미 기각된 가설 5건 (같은 가설로 시간 쓰지 말 것)

| # | 기각된 가설 | 기각 근거 |
|---|---|---|
| 1 | **force-dynamic 누락** | 라우트 렌더 모드 문제 아님 — 크론 라우트는 동적 실행이며 실측상 원인 아님으로 배제 |
| 2 | **middleware 차단** | 미들웨어가 크론 경로를 가로챈다는 가설 — 경로 실측으로 기각 |
| 3 | **redirects 개입** | 리디렉트로 크론 요청이 유실된다는 가설 — 실측으로 기각 |
| 4 | **Hobby 크론 개수 상한** | Vercel 공식문서 재확인 결과 Hobby 크론 상한 100개(5개 아님) — 우려 기각(rev119) |
| 5 | **미배포 커밋(수정이 프로덕션 미반영)** | 수정 커밋이 실제 프로덕션에 배포됐음을 verify-deploy로 확인 — 배포 누락 아님 |

> 참고(별도 기각): SSO Deployment Protection 가설도 Desktop curl 실측(`/` 200, `/api/cron/daily` 401=앱 JSON)으로 기각됨(rev115). maxDuration 미설정 + self-fetch 홉은 실제 결함으로 확인돼 수정됨(rev115/rev120) — 다만 그 수정만으로 실발송이 정상화됐다는 확증은 아직 없음.

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
- **self-fetch(자기 자신의 다른 API 라우트를 HTTP로 호출)는 별개 서버리스 함수 홉을 만든다**(#338) — 호출자의 maxDuration은 피호출 라우트에 적용되지 않는다. self-fetch 제거(rev120) 이후 실발송은 `cron_invocation_log` 실측(8/20~25)으로 정상 확인됨(위 정정 섹션, 2026-08-27).
- **인계문서가 "코드체계가 다를 수 있다"고 경고한 것도 실제로 코드를 추적해 확인하기 전엔 사실로 단정하지 말 것**(#339)
- **네이버에 실제로 PUT되는 필드와 씨앗심기 폼이 저장하는 DB 컬럼이 이름은 비슷해도 다른 컬럼일 수 있다**(#340) — `Product.taxType`(폼)과 `Product.naver_tax_type`(payload가 실제로 읽는 컬럼)이 서로 다른 사례.
- **DB 필드가 빈 값이라고 해서 "원래 비어있었다"고 가정하면 안 된다**(#341, 2026-08-12) — 초기버전 import route가 카테고리·원산지를 아예 채우지 않은 채 발행된 상품이 존재. v2 PUT은 FULL REPLACE라 빈 값을 그대로 보내면 네이버의 실제 값을 지운다. 부분 재연동/수정 계열 라우트를 새로 만들 때마다 "DB가 비어있는 게 곧 네이버도 비어있다는 뜻인가?"를 반드시 의심하고, GET-merge 방어 대상 필드에 포함시킬 것.
