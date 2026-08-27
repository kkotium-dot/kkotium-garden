# 꽃틔움 가든 — 병행작업 트래커 (누락 0 원칙) · 최종 업데이트 2026-08-12 (rev122 — import route 필드 완전성 갭 10건 판정·매핑 · Code) / 직전 rev121 — 부분재연동 안전장치 긴급 보강 · Code

> **⚠️ 2026-06-24(rev50)부터 2026-07-13까지 약 3주간 이 파일이 갱신되지 않았습니다.** 그 사이 실제로는 상품 IA 재설계(P1~P4), 꼬띠 페르소나 전면 적용, 재고 가시화, 좀비 튜닝 엔진 등 대형 작업이 진행·배포됐습니다(git log 기준 e7a3581~ea4e26d 다수 커밋).
>
> **원칙 #149~#253 전문은 `docs/plan/PRINCIPLES_LEARNED.md`를 참조하세요** (2026-07-14 정식 이관 완료 — #165/#217~#220/#225/#231은 원문에 개별 정의가 없는 결번으로 확정). rev50 이하 원문(rev40~rev50 상세 커밋 로그)은 이 트래커의 커밋 `5c9e9f5^`(`git show 5c9e9f5^:docs/plan/PARALLEL_WORK_TRACKER.md`)에서 조회 가능합니다 — 현재 HEAD 파일 본문에서는 제거되어 있습니다(직전 커밋 5c9e9f5가 "원문 보존"이라 주장했으나 실제로는 528줄을 삭제했던 것을 2026-07-14 발견, 아래 참조).


> **📦 rev80 이전은 archive로 분할됨(#31, 2026-07-28)**: `docs/plan/archive/PARALLEL_WORK_TRACKER_~rev80.md` 참조(rev51~rev80, 삭제 0).

## rev122 — import route 필드 완전성 갭 10건 판정·매핑 (2026-08-12 Code)

원본 지시: `docs/handoff/CODE_IMPORT_FIELD_COMPLETENESS_HANDOFF_2026-08-11.md` · 결과 상세: `docs/handoff/CODE_IMPORT_FIELD_COMPLETENESS_2026-08-11.md`

**전수 판정(실 GET 6건 실측, 추측 금지 #82)**: 화이트리스트 10건 중 5건(asPhone/asGuide/brand/sellerCode/unitPrice)은 네이버가 실제로 구조화된 필드로 돌려줘 매핑 완료. 나머지 5건(detailImages/detailImageUrl/hookPhrase/keywords/shippingTemplateId)은 네이버 API에 대응 없음(HTML로 이미 합쳐짐/병합됨) 또는 내부 FK 개념이라 매핑 불가로 확정.

**구현(`src/app/api/products/import/route.ts`)**: `pickAfterService`/`pickBrand`/`pickSellerCode`/`pickUnitPrice` 4개 헬퍼 + `prisma.product.create()` 8개 컬럼 연결.

**★부수 발견(수정 안 함, #340 계열, 원칙 #342 등재)**: `sellerCode` 화이트리스트가 추적하는 폼 컬럼(`sku`)과 실제 PUT 컬럼(`sellerProductCode`)이 다름. `brand`/`naver_brand`는 outgoing PUT 페이로드 어디에도 안 들어감(내부 완결성 점수용 전용).

**검증**: tsc 0 · build 0. 실 미연동 상품(`11431754381`) 신규 임포트로 5개 필드 end-to-end 확인, 테스트 데이터 즉시 정리(잔존 0).

**백필 통합**: `scripts/backfill-naver-category-origin.ts`를 확장(카테고리·원산지 + asPhone/asInfo/naver_brand/sellerProductCode/단위가격). dry-run 재실행 `fieldsFixed: 23`. asPhone/asInfo는 스키마 기본값이 이미 채워져 있어 "빈 값" 판정 제외(수동 확인 필요 항목으로 별도 기록). `--apply` 미실행(#41).

---

## rev121 — 부분재연동 안전장치 긴급 보강 (2026-08-12 Code)

원본 지시: `docs/handoff/CODE_PARTIAL_SYNC_SAFETY_HANDOFF_2026-08-11.md` · 결과 상세: `docs/handoff/CODE_PARTIAL_SYNC_SAFETY_FIX_2026-08-11.md`

**발견된 위험(운영자 실제 발견)**: "듀얼 무선 가습기" dryRun 미리보기에 "카테고리코드: -"(앱 DB 공백)로 나왔는데 실제 네이버는 정확한 카테고리가 설정돼 있었다 — confirm:true 실행 시 v2 PUT(FULL REPLACE)이 네이버의 실제 카테고리를 지웠을 위험. Desktop이 실행 전 중단.

**근본원인 확정**: `/api/naver/products/update` 라우트가 `validateForRegistration()`이 이미 계산해 반환하던 `validation.canRegister`(카테고리 빈값이면 false)를 응답에만 실어 보낼 뿐 PUT 실행 여부 결정에 전혀 쓰지 않았음(register 라우트는 이 체크로 막는데 update 라우트만 빠져 있었음). 기존 §4-C GET-merge 방어(detailContent/sellerTags/metaDescription)도 카테고리·원산지 라벨은 커버하지 않았고, dryRun 경로에는 GET-merge 자체가 없어 미리보기가 실제 전송값과 달랐음.

**수정(`src/app/api/naver/products/update/route.ts`)**: GET-merge 방어를 `leafCategoryId`·`originAreaInfo.content`까지 확장(`applyNaverStateDefense()` 공용 함수로 리팩터) + dryRun 경로에도 동일 적용 + GET-merge 이후에도 `leafCategoryId`가 무효면 confirm:true 실 PUT을 409로 하드 블록.

**검증**: tsc 0 · build 0. 로컬 dev 서버에서 발행된 6개 상품 중 2개로 실제 dryRun 호출(Naver GET 포함, PUT은 미실행) — "듀얼 무선 가습기"가 `leafCategoryId: "50002540"`(이전 "-")·원산지 라벨 정확히 복구됨을 확인, `wouldBlockRealPut: null`.

**옵션 B(DB 백필)**: `scripts/backfill-naver-category-origin.ts` 작성, dry-run 결과 카테고리 5/6·원산지 6/6 fix 대상 — 인계문서 실측치와 정확히 일치. `--apply`는 미실행(#41 두 환경 핑퐁 — Desktop 검토 후 실행).

**신규 원칙**: `docs/plan/PRINCIPLES_LEARNED.md` #341 등재(DB 필드 공백을 네이버 공백으로 가정 금지 + GET-merge/하드블록 패턴).

---

## rev120 — 아침 소싱 알림 미발송 + 카테고리 편중 통합 근본수정 (2026-08-11 Code)

원본 지시: `docs/handoff/CODE_SOURCING_ROOT_CAUSE_HANDOFF_2026-08-11.md` · 결과 상세: `docs/handoff/CODE_SOURCING_ROOT_CAUSE_2026-08-11.md`

**증상 A(미발송) 근본원인 확정**: `cron/sourcing-daily`가 실작업(DataLab+검색량+AI+도매매칭+DB저장+Discord)을 전부 하는 `/api/sourcing-recommend`를 HTTP self-fetch로 호출했는데, 그 라우트에 `maxDuration` 지정이 빠져 있어 Vercel Hobby 기본 10초 제한에 걸렸다(prod 실측: dryRun만으로도 8.4~10.2초). DB 저장 중단 시점(8/7 이후 0건, 직접 쿼리로 확인)이 self-fetch 분리 배포일(8/8, `fec8759`)과 정확히 겹침을 확인.

**수정**: self-fetch 자체 제거. `sourcing-recommender.ts`에 `runSourcingScan()` 신설(중복발송 가드→스캔→recoType 태깅→DB저장→Discord발송 전체를 하나의 함수로 통합), cron이 같은 프로세스에서 직접 호출(`maxDuration=60`이 전체 커버). `/api/sourcing-recommend` POST(대시보드 버튼용)도 같은 함수로 재배선 + 방어적으로 `maxDuration=60` 추가. 응답 shape 무변경(회귀 없음).

**증상 B(카테고리 편중) 근본원인 확정**: `fetchDataLabTrends()`가 "최신일자 절대 ratio" 상위 3개를 그대로 반환 — 베이스라인 큰 카테고리("생활/건강")가 매일 1~3위 독식(prod dryRun 실측으로 매번 동일 조합 확인). 로드맵1b(`sourcing-lenses.ts`)는 grep 전수 확인 결과 완전 미연결.

**수정**: 정렬 기준을 절대 ratio → `risingRate`(로드맵1b `classifyTrendSignal` 재사용, 추가 API 호출 0)로 교체해 상위 2개 선정 + 날짜 기반 순환으로 3번째 슬롯 채움. 로드맵1b 전체(8렌즈 쿼터 배분)는 데이터 구조가 완전히 달라 오늘 전체 연결은 스코프 아웃 — 운영자 판단 필요 항목으로 남김.

**검증**: `npx tsc --noEmit` 0 · `npm run build` 0. prod dryRun 배포 전/후 비교로 `trendCategories`가 실제로 바뀜을 확인, 배포 후 재호출(10.2초)이 새 `maxDuration=60` 안에서 정상 완주함을 확인. 실 Discord 발송 테스트는 미실행(금지 사항 준수).

**★ 남은 미확인**: "sent:true인데 DB엔 없었다"는 관측을 100% 재현하지는 못했다(Vercel Hobby 런타임 로그 보존 1시간 한계로 8/8~8/11 실제 실행 로그 조회 불가). self-fetch 제거로 그 질문 자체가 소멸했다고 판단하지만 완전 확정은 아니다 — 다음 단계는 운영자 승인 하 실 발송 검증(docs/handoff/CURRENT.md 참조).

---

## rev119 — 아침 소싱 크론 조사 재착수 + 중복발송 방지 가드 추가 (2026-08-10 Code)

**배경**: `docs/handoff/CODE_DAILY_CRON_FIX_HANDOFF_2026-08-08.md` "2026-08-10 최신 상태"의 "다음 조사 방향" 3건 착수. 결과 상세: `docs/handoff/CODE_DAILY_CRON_FIX_RESULT_2026-08-10.md`.

**신규 확인(원인은 여전히 미확정)**:
1. Vercel 공식문서 재확인 — Hobby 크론 개수 상한 100개(5개 아님, 우려 기각), 스케줄 정밀도 시간단위(±59분). 스킵 조건 별도 공식문서 없음.
2. Vercel Runtime Logs/Errors API 재조회 — 로그 1시간 보관 한계 재확인(사후조회 불가). 단 최근 7일 두 크론 라우트 에러 0건 확인.
3. **DB 재검증에서 신규 불일치 발견**: `sourcing_opportunity_records`·`daily_recommendations` 둘 다 8/8 이후 레코드 전무(최신 8/7 13:14). 인계문서의 "8/8 수동 curl 테스트 DB 레코드 확인" 서술과 배치 — Desktop 재확인 요청(#310 연장, 인계문서 "확인됨" 서술도 재검증 대상).
4. Code 브라우저 세션은 Vercel 미로그인이라 크론 상세페이지(Recent Invocations)는 여전히 Code가 직접 확인 불가 — Desktop/운영자 전용.

**코드 변경(완료)**: `sourcing-recommend/route.ts` POST에 당일 중복발송 방지 가드 추가(같은 날 레코드 있으면 스킵) — 향후 외부 안전망 도입 시 정규 크론과 겹쳐도 이중발송 안 되게 하는 선행조치. tsc 0.

**미구현(운영자 승인 대기, #337)**: GitHub Actions 외부 안전망(`.github/workflows/`, 00:10 UTC=09:10 KST). 매일 자동 실발송을 일으키는 CI 스케줄이라 디스코드 실발송과 동급 승인 필요 판단 — 설계만 하고 코드/시크릿 미추가.

---

## rev118 — 꼬띠 소싱 v2 로드맵 1b 다중 발굴 렌즈 완료 (2026-08-10 Code)

**배경**: `docs/design/KKOTTI_DAILY_SOURCING_V2_2026-08-07.md` §3-0 설계를 구현. 기존 소싱 추천이 "DataLab 뜨는 키워드" 렌즈 하나뿐이던 것을 급상승📈·시즌선점🗓️·니치💎·블루오션🌊·꿀통🍯·황금🏆·스테디📚 7개 발굴 렌즈 + 레드오션⚠️ 경고 렌즈로 확장. `naver/recommendation-type.ts`(황금/니치/시즌 3렌즈)를 신규 대발명 없이 재사용·확장하는 순수 분류 계층.

**신규 `src/lib/sourcing-lenses.ts`**: `classifySourcingLenses()`가 한 후보를 여러 렌즈에 동시 매칭(다중 배지, 설계 요구사항). 레드오션은 `SourcingLens` 타입에 넣지 않고 별도 `RedOceanWarning` 타입으로 분리(발굴 렌즈가 아니라 경고라는 걸 타입 레벨에서도 강제). `LENS_DAILY_QUOTA`(급상승2·시즌선점2·니치2·블루오션2·꿀통1·스테디1=10, 설계 예시 그대로) 상수화 + `allocateByLens()`(중복 배정 없음, 미달 시 `unfilledLenses`로 정직 표시 #325).

**`src/lib/trend-analyzer.ts` 확장**: `fetchDataLabTrends()`가 이미 매번 가져오던 7일 시계열을 재해석해 `computeRisingRate`/`computeVolatility`/`fetchCategoryTrendSignals` 추가 — **API 재호출 0건 추가**(배치 fetch 로직을 `fetchRawCategorySeries()`로 분리해 공유). 기존 `fetchNaverTrends()`/`matchProductsToTrends()` 시그니처 무변경 확인(소비처 `sourcing-recommender.ts`/`daily-signals.ts` 무영향).

**시즌선점 vs 급상승 구분**: 기존 `seasonalNow()`(이번달 또는 다음달)는 "지금 뜨는 것"과 "곧 올 시즌"을 구분 못 해 신규 `seasonalLeadWindow()`(1~2개월 뒤만)로 분리 — 설계가 "시즌 선점이 핵심 차별점"이라 명시한 부분을 살림.

**검증**: `npx tsc --noEmit` 0 · `npm run build` 0. 로컬 tsx 스크립트(검증 후 삭제)로 순수함수 단위 검증 — 상승/평탄/하락 시계열 방향성 정확, 얇은 데이터(1포인트)는 근거 없이 판정 안 함(#231), 다중 렌즈 동시 매칭·시즌 리드윈도우·레드오션 경고·배분기 무중복 전부 확인.

**수정 금지 확인**: `wholesale-matcher.ts`(로드맵1)·`cron/*`·`.github/workflows/*` 전부 미변경(git diff 확인). `naver/recommendation-type.ts`는 "필요시" 옵션이었으나 `sourcing-lenses.ts`가 자체 메타데이터를 갖고 있어 미수정 판단.

**다음 단계(범위 밖)**: 실제 `sourcing-recommender.ts`(cron 소비)에 렌즈 분류기 배선(설계 §3-1·§3-4)은 cron 수정 금지 지시로 이번 범위 제외 — 별도 로드맵 단계.

---

## rev117 — UX 8건 Desktop 교차검증 후속 A/B/C 완료 (2026-08-10 Code)

**배경**: Desktop이 rev116(UX 8건)을 독립 재검증한 결과 대부분 정확했으나 후속 3건 발견(`docs/handoff/CODE_UX_FIXES_FOLLOWUP_2026-08-10.md`).

**A — 카테고리 잔여 오분류("반려동물 자동급식기"→가구/인테리어)**: 임시 디버그 로그로 재현해 진단한 결과, Desktop이 의심한 `validateSuggestion()` fuzzy 매칭 단계는 무죄 — AI가 문자 그대로 실제 존재하는 카테고리("가구/인테리어>주방가구>그릇장/컵보드")를 답해 exact-match로 바로 통과한 것. 진짜 원인은 **`FALLBACK_RULES`의 반려동물 규칙이 존재하지 않는 카테고리 축(`d1:'반려동물'`)을 가리키고 있어 안전망 자체가 무력화**돼 있던 것(실제 DB 축은 `생활/건강>반려동물`). 규칙을 실제 축으로 정정 + AI 프롬프트에 하드코딩 아닌 참고용 힌트 1줄 추가. curl 재현으로 "가구/인테리어" 탈피, 정확한 대/중분류 이동 확인.

**B — dome_category_cache 오염 정리**: Supabase 프로덕션 DB 직접 조회로 규모 파악(`category_mappings` 전체 32행 중 `naver_d1='가구/인테리어' AND source='ai'` 9건) — 생성 시각을 프롬프트 수정 커밋(`8541d04`, 02:33:16 UTC)과 대조해 7건은 옛 강제폴백 오염, 2건은 A 조사 중 Code가 직접 만든 테스트 부산물로 확정. 정상 fallback 규칙 매칭 결과인 무관 3건은 보존. 9건만 id 지정 삭제(전체 삭제 아님) — followup의 "명백히 소수면 진행" 기준 충족.

**C — 씨앗심기 프리필 end-to-end 미검증 해소**: 실제 네이버 상품(원상품번호 13564133057)을 실제 import → DB 직접 조회(naverCategoryCode·description 609자·tags 3개 확인) → `?edit=`로 브라우저 열어 카테고리 4단계·판매가·대표이미지·태그 프리필 확인 → 테스트 상품 `/api/products/{id}` DELETE로 정리. instant_discount는 이 상품이 할인 0원이라 여전히 실측 미검증(코드 로직은 검증됨, 다음 기회에 재확인 권장).

**검증**: `npx tsc --noEmit` 0 · `npm run build` 0. 결과는 `CODE_UX_FIXES_RESULT_2026-08-10.md`에 이어서 기록.

---

## rev116 — 운영자 실사용 발견 오류 8건 수정 완료 (2026-08-10 Code)

**배경**: 아침 소싱 알림 크론 조사 착수 직후 운영자가 실사용 중 발견한 오류 8건(`docs/handoff/CODE_UX_FIXES_HANDOFF_2026-08-10.md`)으로 작업 전환. 크론 조사는 브리핑만 하고 미착수(`docs/handoff/CURRENT.md`에 별도 기록).

**수정 내용**(상세는 `docs/handoff/CODE_UX_FIXES_RESULT_2026-08-10.md`):
1. **#1 카테고리 오분류(최우선)**: `api/category/suggest/route.ts` AI 프롬프트의 강제 폴백 지시(`For unknown items: use 가구/인테리어...`) 삭제 → 모르면 빈 배열 반환하도록 변경, `suggestFallback()`으로 자연 이관.
2. **#2 네이버 가져오기 작동 안 함**: `products/page.tsx`의 `NaverImportModal.doImport()`가 응답을 안 읽고 무조건 성공 취급하던 것을 수정 — imported/skipped/failed 파싱 후 실패 시 사유 표시, 완전 성공 시에만 모달 닫음.
3. **#3 페이지네이션 숫자버튼**: 동일 모달에 축약 표기 페이지 버튼(`1 … 5 6 [7] 8 9 … 20`) 추가.
4. **#4 마진 계산 할인가 미반영**: `api/products/import/route.ts`가 `instant_discount`(profitability API가 실판매가 계산에 쓰는 필드)를 전혀 안 채우던 것을 네이버 `customerBenefit.immediateDiscountPolicy`에서 읽어 채우도록 수정.
5. **#5+#6 씨앗심기 리셋 방지**: hydrate 로직은 정상이었음 — import가 name/salePrice/mainImage 4개만 저장하던 것에 naverCategoryCode/description/images(추가썸네일)/tags 추가(형식이 앱 스키마와 100% 동일한 필드만, 원산지·AS정보는 코드 체계 불일치 위험으로 제외).
6. **#7 목표마진율 "0" 접두 버그**: `MarginCalculator.tsx`의 targetMargin input만 `value={x || ''}` 패턴이 누락돼 있던 것 수정.

**검증**: `npx tsc --noEmit` 0 · `npm run build` 0. 브라우저 실사용 시나리오 — #2(404 상품번호로 에러 메시지 정확히 표시), #3(페이지 3 클릭 시 직접 이동), #5+#6(edit 화면 하이드레이션), #7(DOM 레벨로 필드를 비운 뒤 "30" 타이핑 → "30" 정확, 수정 전이면 "030") 전부 확인. #1은 curl로 신규(캐시 없는) 상품명 재현 — 강제 쏠림 해소 확인.

**⚠️ 다음 세션 확인 필요**: ① `dome_category_cache`에 남은 "가구/인테리어" 오답 캐시 정리 방침(운영자 결정), ② #4는 실제 즉시할인 걸린 네이버 상품으로 재현 테스트 권장(로컬 테스트 데이터 없어 코드 레벨만 검증).

**커밋 상태**: 이번 rev 작성 시점 아직 미커밋 — 항목별 커밋 예정.

---

## rev115 — 아침 소싱 알림(E-7) 미발송 — 원인 확정 + 수정 실행 완료 (2026-08-08 Code)

**배경**: rev114(Code 조사)에서 제기한 SSO Deployment Protection 가설을 Desktop이 curl 직접 실측(`/` 200, `/api/cron/daily` 401=앱 JSON)으로 기각. 원인은 최초 가설(Hobby maxDuration 미설정 + 8단계 순차 실행 지연으로 E-7이 타임아웃 전 도달 못함)로 최종 확정. 운영자 실행 지시 확정 후 Code가 5단계 수정 진행.

**수정 내용**(`docs/handoff/CODE_DAILY_CRON_FIX_HANDOFF_2026-08-08.md` 실행 지시 그대로):
1. `cron/daily/route.ts`에 `export const maxDuration = 60;` 추가.
2. **E-7(소싱 추천)을 독립 크론으로 분리**: 신규 `src/app/api/cron/sourcing-daily/route.ts`(로직 이전 + `isAuthorized` 가드 동일 적용) + `vercel.json`에 `/api/cron/sourcing-daily` 엔트리 추가(`0 23 * * *`, 기존 daily와 동일 시각 — path가 다르면 Vercel이 독립 함수로 실행). 기존 `cron/daily`에서 E-7 블록 완전 삭제(중복 발송 방지).
3. 무보호였던 4개 섹션(OOS 후반부·점수하락·추천산출·DB영속화)에 개별 try-catch 추가(`results.xxxError` 패턴 통일) — `computeRecommendation` 실패 시 `top5`를 빈 배열로 안전하게 degrade해 하단 DB영속화 섹션이 계속 진행되도록 처리.
4. 검증: `npx tsc --noEmit` 0 errors, `npm run build` exit 0(두 크론 함수 모두 정상 포함 확인).
5. 결과 문서 갱신(`CODE_DAILY_CRON_FIX_RESULT_2026-08-08.md` §7) + `docs/handoff/CURRENT.md` 갱신 + 커밋·push.

**미실행(지시대로)**: 실제 Discord 발송 테스트는 이번 세션에 하지 않음 — 운영자/Desktop 승인 후 정규 스케줄 또는 수동 Run으로 검증 필요. Vercel 대시보드에서 `sourcing-daily` 크론 등록 최종 확인(Hobby 슬롯 5개→6개 증가, 배포 실패 여부)도 운영자/Desktop 몫으로 남김.

**교훈**: ① UI 설정 문구보다 curl 실측이 항상 우선(#310 재확인) — 인증/권한 관련 원인 추정은 실제 요청 결과로 재검증. ② 무거운 순차 크론은 try-catch로 예외만 막아서는 타임아웃 자체를 못 막는다(catch는 예외 전용, 강제종료엔 무력) — 무거운 하위 작업을 독립 크론(동일 스케줄, 다른 path)으로 분리하는 게 근본 해법.

---

## rev114 — 아침 소싱 알림(E-7) 미발송 — 원인 조사 완료, 신규 발견(크론 미호출 의심) (2026-08-08 Code)

**배경**: 매일 아침 8시(KST) 오는 꼬띠 소싱 추천 디스코드 알림 미발송(운영자 신고). Desktop 인계문서(`docs/handoff/CODE_DAILY_CRON_FIX_HANDOFF_2026-08-08.md`) — 원인 후보: 앞 섹션 예외로 조기종료, 또는 Hobby 10초 타임아웃.

**확정 사실 1 — route.ts 구조 결함**: `cron/daily/route.ts`(11개 섹션, 공통 try-catch 1개)에서 섹션 1(후반부)·2·3·4가 개별 try-catch 없이 무보호. 이 중 하나라도 예외 시 하단 E-7(434행)까지 도달 못하고 500 반환.

**확정 사실 2 — maxDuration 미설정**: `cron/daily/route.ts`에 `maxDuration` 없음(Hobby 기본 10초). 동일 저장소 타 크론(inventory-sync 60초·asset-integrity-sweep 300초)은 명시 설정돼 있는데 daily만 누락. 내부 self-fetch하는 `/api/sourcing-recommend`도 미설정, 그 내부(`sourcing-recommender.ts`)에 300ms·500ms 하드코딩 딜레이 다수 — E-7은 뒤에서 2번째 섹션이라 타임아웃에 가장 취약.

**★★ 신규 발견(계획서 범위 밖, Vercel Runtime Logs MCP 직접 조회)**: 등록된 크론잡 5개(daily/weekly/inventory-sync/order-sync/asset-integrity-sweep) 전부 **지난 7일간 예정 스케줄 시각에 실행된 로그가 0건**. 유일한 `/api/cron/daily` 로그 1건(200)도 예정 시각이 아니라 수동 테스트로 추정. 프로젝트 전체 7일 로그에 4xx/5xx도 0건 — Function 레벨(runtime logs) 도달 전 엣지 단 차단 가능성. `get_project_deployment_protection` 조회 결과 **SSO Protection이 `all_except_custom_domains`로 활성화** 확인 — `kkotium-garden.vercel.app`이 대상 포함되는지, Vercel Cron이 이를 자동우회하는지는 미확정(대시보드 직접 확인 필요, MCP 도구 한계).

**미확인**: `SOURCING_RECOMMEND_LIVE` 실제 프로덕션 값(MCP에 env 값 조회 도구 없음, 우선순위 낮음).

**교훈**: 크론 미실행 의심 시 Vercel MCP `get_runtime_logs`/`get_runtime_errors`로 실제 invocation 유무를 직접 조회하면 대시보드 UI가 표기하는 1시간 제한보다 긴 기간(최소 7일) 조회 가능. "대시보드 Enabled 표기"와 "실제 매일 실행"은 별개 — 다음부터 이 방법을 1순위 진단 도구로 사용.

**범위**: 운영자 채팅 지시가 "조사"에 한정돼 코드 수정 미실행. 결과 문서: `docs/handoff/CODE_DAILY_CRON_FIX_RESULT_2026-08-08.md`. `docs/handoff/CURRENT.md` 갱신 완료. 다음 액션은 운영자/Desktop이 대시보드에서 Cron Jobs Recent Invocations + Deployment Protection 직접 확인 → 원인 확정 → Code에 수정 지시.

---

## rev90 — 작업1 F3 사전조사(검수 판정 근거) + 작업2 surfaceRules 실배선 2건 (2026-07-24 Code)

**작업1 (F3 사전조사 — 구현 없음, 조사·보고만)**:
- `/products/[id]/preview` + `GET /api/products/[id]/publish-preview`는 **완전 읽기전용**(prisma read만, DB write 0). 매 GET마다 OCR·이미지품질을 재계산해 반환 — **검수 이력이 남는 구조가 아니다**. Product 스키마에도 발행-검수용 필드는 없음(`reviewedBy/reviewedAt`은 다른 모델=전략 콘텐츠 draft/approved 게이트 소관, `StoreSettings.manualReviewCount`는 고객리뷰 수동추적용 — 둘 다 무관).
- **경고 0건 판정은 이미 계산돼 있음**: `imageWarnings`/`blockingImageWarnings` 배열 + `canPublish`(readinessOk && canRegister && blockingImageWarnings.length===0) 반환. F3 판정 근거로 그대로 쓸 수 있는 형태.
- ★**구조적 발견(설계에 중요)**: 이 검수 화면의 "발행하기" 버튼은 `POST /api/naver/products/update`(이미 등록된 상품의 재발행/수정 전용, `naverProductId` 없으면 409)로 연결돼 있다. 반면 실제 **최초 발행 경로**(정원창고 "준비된 것 일괄 발행" → `NaverRegisterModal` → `POST /api/naver/products/register`)는 이 검수 화면·`publish-preview`의 이미지품질/OCR 경고 계산을 **전혀 거치지 않는다** — 자체적으로 `validateForRegistration`(readiness/attribute grade)만 체크. 즉 오늘 기준 "경고 0건"과 "실제 최초발행 가능"은 **서로 다른 경로**라 즉시 연결 불가. Cowork 설계 시 결정 필요: (a) 최초발행도 이 검수화면을 강제로 거치게 라우팅을 바꾸거나, (b) `publish-preview`의 경고계산을 register 경로에도 이식하거나, (c) 별도의 경량 게이트를 register 직전에 추가.

**작업2 (surfaceRules 실배선, T-05/T-18 제외)**: 코드를 더 훑어 실제 T-19 위반 2건을 발견·수정.
- `products/out-of-stock/page.tsx`(처분 결정 대기함) — "재입고 검토" 그룹 편입 조건이 `p.status === 'OUT_OF_STOCK'`만 보고 `naverProductId`를 확인하지 않아 미발행 상품이 새어들어올 수 있었음(T-19 위반 가능 지점). `isQueueEligible(deriveLifecycleState(...))` 가드 추가.
- `KkottiWidget.tsx`(대시보드 할일 — 품절임박 위젯) — 동일 패턴(`p.status === 'OUT_OF_STOCK'` fallback, naverProductId 미확인). 동일하게 가드 추가.
- 두 곳 모두 `decideDisposition`의 action이 이미 'NONE'인 케이스에서 status만으로 다시 주워담는 fallback 분기였음 — action 기반 1차 필터는 원래도 안전했으나(disposition.ts:129 내장 게이트), fallback 분기가 그 안전판을 우회하고 있었다.
- T-05/T-18(삭제버튼 숨김)은 지시대로 미적용.

검증: tsc 0 · `npm run build` 0(out-of-stock 8.9→9.07kB로 실제 포함 확인) · surfaceRules.test.ts 10/10 · 로컬 브라우저 실측(두 화면 모두 정상 렌더, 콘솔 에러 0).

---

## rev89 — 작업1 양성검증 보강 + 작업2 prisma분리(1단계) 완료 + 2단계 재검토 결과 (2026-07-24 Code · #310 미검증 해소)

**작업1 (배너 양성 검증 보강)**: `NewVersionBanner.tsx`에 `?forceVersionCheck=1` 쿼리 처리 추가 — 가짜 SHA 조작 없이 (1) 스로틀 전면 우회(마운트 즉시 + 매 탭포커스 복귀마다), (2) 화면 우하단에 `초기 SHA / 현재 SHA / 일치여부` 디버그 텍스트 노출. 파라미터 없으면 완전히 기존과 동일. **버그 1건을 구현 중 발견·수정**: 최초 작성 시 `if (!initialSha.current) return`이 디버그 표시보다 먼저 실행돼 dev(sha=null)에서는 디버그 텍스트 자체가 절대 안 뜨는 결함이 있었음 — early return을 디버그 세팅 뒤로 옮겨 해결. 로컬 브라우저 실측: `?forceVersionCheck=1` → "forceVersionCheck — 초기: null / 현재: null / 비교불가(dev sha=null)" 정상 노출, 파라미터 없으면 미노출 확인.

- **미검증으로 남는 것(#310 원칙 그대로 적용)**: 실제 SHA 불일치 시 배너가 뜨는지(양성 경로) — dev에서는 SHA가 항상 null이라 재현 불가, fetch 가로채기로도 React ref(initialSha)를 외부에서 주입할 방법이 없어 인위적 검증이 불가능함을 재확인(Desktop #310 진단과 동일 결론). **다음 실제 프로덕션 배포 때 이 디버그 도구(`?forceVersionCheck=1`)로 즉시(스로틀 대기 없이) 확인** — 이번 보강의 목적은 "당장 검증"이 아니라 "다음 자연검증을 빠르게 만드는 것".

**작업2 1단계 (prisma 분리, 완료)**: `source-gone.ts`의 순수 계산 4종(`SOURCE_GONE_MIN_CONSECUTIVE`·`countLeadingNegatives`·`countLeadingOutOfStockDays`·`isSourceGoneFromCount`)을 신규 `source-gone-pure.ts`로 추출, `source-gone.ts`는 재수출만(기존 서버측 import 3곳 무변경 동작). `lifecycle.ts`가 이제 순수 모듈만 import — prisma 체인 완전 제거. **실제로 검증**: `/workflow`(client 컴포넌트)에 `surfaceRules.ts` import를 임시로 추가해 `npm run build` — 에러 0·번들 4.42kB→5.08kB(실제 포함됨 확인) → 되돌림(diff 0 확인). 이걸로 "client 컴포넌트에서 안전하게 import 가능"이 추측이 아니라 실측이 됨.

**작업2 2단계 (배지·카운트 전환) — 재검토 결과: 추가 변경 불필요로 판단**: 승인받은 방향대로 착수 전 실제 코드를 다시 훑어보니, "배지·카운트가 raw status를 직접 비교"하는 잔여 지점이 없었다. `InventoryBadge.tsx`·`/products/out-of-stock`는 이미 `decideDisposition`(disposition.ts 단일 권위)을 직접 소비 중이었고, 두 작업 큐 화면(부활소·처분대기함) 모두 `naverProductId` 필터가 이미 있어 T-19(작업큐 발행전용)는 `decideDisposition` 자체의 내장 게이트(`if (!p.naverProductId) return NONE`)로 이미 실질 충족돼 있었다. 남은 후보는 `StageBadge.tsx`(대시보드·꿀통·창고 3화면 공유)였으나 이건 lifecycle.ts의 7상태와 **다른 모델**(수집됨/씨앗/발행대기/등록대기/발행됨/품절/재활성화 — 자산·단절 축이 없는 저작 단계 배지)이라, 억지로 갈아끼우면 3개 화면에 회귀 위험만 키우고 실질 개선은 없다고 판단해 손대지 않았다. **결론**: surfaceRules.ts는 SURFACE_RULES.md v2를 코드화한 테스트/문서 권위로 존재하고, 실제 런타임은 이미 (다른 이름의) 동일 단일권위 함수를 올바르게 소비하고 있어 "전환"이라 부를 실질 변경점이 없었다 — 없는 일을 만들지 않음(#56/#303).

검증: tsc 0 · `npm run build` 0(clean cache) · surfaceRules.test.ts 10/10 · client-safety 실측(위) · 로컬 브라우저 배너 디버그모드 실측.

---

## rev88 — 작업1 완료 (새 버전 감지 배너, #308) (2026-07-24 Code · 운영자 승인: SHA API·탭포커스 트리거·전역배너 전부 권장안 채택)

`GET /api/version`(신규) — Vercel이 배포마다 자동 주입하는 `VERCEL_GIT_COMMIT_SHA`를 그대로 반환(force-dynamic, 별도 빌드스크립트 불요). `NewVersionBanner`(신규, `src/components/layout/NewVersionBanner.tsx`) — 최초 로드 시 캡처한 SHA와 재조회 SHA를 비교해 다르면 상단 전역 배너("새 버전이 준비됐어요 — 새로고침") 노출. `layout.tsx`에 배선해 전 페이지 공통.

- **트리거**: setInterval 폴링 아님 — `visibilitychange`(탭 포커스 복귀) 시에만 체크, 최소 60초 스로틀. 자동발사 타이머 금지(#72) 정신 준수.
- **오탐 방지**: 로컬 dev는 `VERCEL_GIT_COMMIT_SHA` 자체가 없어 sha=null → null끼리는 비교하지 않아 배너가 절대 뜨지 않음(운영 prod에서만 동작). fetch 실패도 best-effort로 무시(네트워크 문제로 오탐 배너 금지).
- **검증**: tsc 0 · build 0(라우트 `ƒ /api/version` 등록 확인) · 로컬 `/api/version` → `{"sha":null}` 확인 · 대시보드에서 배너 미노출(오탐 없음) 확인 · 콘솔 에러 0. mismatch 발생 경로(SHA 실제 변경 시 배너 노출)는 로직 리뷰로 확인 — 다음 실제 프로덕션 배포 때 자연 검증됨(기능 목적상 자기증명적).

---

## rev87 — 작업2/작업3 완료 (SubstituteEditor 단일권위 전환 + surfaceRules 매트릭스) (2026-07-24 Code · SURFACE_RULES.md v2 기준)

**작업2**: `products/page.tsx`(현재 888번 줄) `SubstituteEditor isOutOfStock={product.status === 'OUT_OF_STOCK'}` → `dispositionVerdict.action !== 'NONE'`로 교체(#295). 이미 같은 컴포넌트 scope에 계산돼 있던 `dispositionVerdict`(disposition.ts 단일 권위)를 재사용 — 신규 계산 없음. 로컬 브라우저 실측: 품절대체 탭 정상 렌더, 콘솔 에러 0.

**작업3**: `src/lib/products/surfaceRules.ts`(신규) + `surfaceRules.test.ts`(신규) — SURFACE_RULES.md v2 §2(surface 5종 registry: 보관함 2·작업큐 3) + §5(액션 권한 매트릭스)를 코드화. 순수함수(`isQueueEligible`·`isDeleteAllowed`·`isDeleteVisible`·`allowedActionsFor`·`isPrimaryLabelAllowed`·`hasFullStateCoverage`)로 lifecycle.ts(7상태)·disposition.ts(5액션)를 감싼다. 테스트는 v2 문서에 **구체적으로 정의된** ID만 구현(T-05 수정판·T-08·T-11·T-12·T-13·T-16~T-20 = 10건) — T-01~04/06/07/09/10/14/15는 v2 문서 어디에도 개별 정의가 없어(T-04/06/07/10은 명시 폐기) 지어내지 않고 스킵(#303 원칙). `npx tsx src/lib/products/surfaceRules.test.ts` 10/10 PASS. T-20은 이번 F1 모순(배지=단절인데 주액션=등록완료/되살리기) 재발 방지 회귀 테스트로 직결.

**주의(향후 배선 시 확인 필요)**: `lifecycle.ts`가 `source-gone.ts`(prisma 의존)를 import하므로, `surfaceRules.ts`를 client 컴포넌트에서 직접 import하면 #32/#37 빌드 경계를 건드릴 수 있다. 현재는 어디서도 import하지 않아(독립 신규 모듈) 문제 없음 — SURFACE_RULES.md §7 5단계("전 화면 배지/버튼을 판정함수 소비로 전환")를 실제 착수할 때 prisma 분리(sales-assets.ts처럼 pure 서브모듈 분리)부터 먼저 확인할 것.

검증: tsc 0 errors · `npm run build` 0 errors · surfaceRules.test.ts 10/10 · 로컬 브라우저 실측(작업2).

---

## rev86 — F1/F2 근본수정 완료 + F3 조사·제안 (2026-07-23 Code · #295/#307 연장)

★운영자 확정 #307("준비도≠발행승인") 적용 하에 진행. F3는 지시대로 조사·제안까지만(구현 안함).

**F1 (재활성화 필요 ↔ 부활소 모순) — 단일 판정 소스로 통일**: 근본원인=꽃밭돌보기 배지(raw `status==='INACTIVE'/'HIDDEN'`)와 부활소 후보(`getReactivationReason` 3사유: 품절/장기미판매/점수급락)가 서로 다른 로직 소비 → 판매중지이지만 장기미판매·점수급락 조건을 우연히 만족 못하면 부활소에서 완전 누락(플라티코 실측 재현). 조치: `daily-slots.ts:getReactivationReason`에 4번째 사유(`suspended`, INACTIVE/HIDDEN 직접 체크) 추가 + `products/page.tsx`(STATUS_SEGMENTS·TAB_CONFIG.reactivation)가 동일 함수(`needsReactivation` 헬퍼)를 소비하도록 통일 + `reactivation/page.tsx`(REASON_META·counts·필터탭·정렬순서·새생명부여 CTA)에 `suspended` 배선. 로컬 브라우저 실측: 플라티코가 이제 부활소에 "판매중지 — 재활성화 검토 필요"로 노출(이전 0건) · 꽃밭돌보기 판매중지 카운트=1과 일치.

**F2 (정원창고 배지 재정의)**: 조건축 `notReady`(입력정보 부족) → `gardenCounts.unpublished`(naverProductId null, 미발행 전체)로 교체. 문구 "등록 미완료 N건 — 이어서 작성" → "**검수 대기 N건 — 씨앗심기에서 확인**". 클릭 시 인페이지 필터 토글 → `/products/new`(씨앗심기) 이동 Link로 교체. `notReady`/`ready`/`all` 서브필터 탭(별개 UX)은 무변경 유지. 로컬 실측: 아이스틀·달항아리 2건 → "검수 대기 2건 — 씨앗심기에서 확인" 정상 노출, href=/products/new 확인.

**F3 (일괄 발행 게이트 — 조사만)**: 현재 게이트=순수 필드완성도(`getPublishReadiness`), 검수/승인 개념 없음. schema의 `reviewedBy/reviewedAt`(prisma:1198)은 다른 모델(전략 콘텐츠 draft/approved) 소관, Product엔 검수완료 플래그 없음. 제안(미구현): Product에 `reviewApproved`/`reviewedAt` 필드 신설 → 씨앗심기 검수 완료 시 세팅 → `gardenCounts.readyProducts` 계산에 AND 조건 추가. 스키마 마이그레이션 필요 사안이라 운영자 결정 대기.

**검증**: tsc 0 errors · `npm run build` 0 errors · 로컬 dev 브라우저 실측(F1/F2 위 서술) · 한글 sentinel grep 0건. 오타 정정: tracker rev85 "좁비 부활소"→"좀비 부활소".

---

## rev91 — F3 구조적 발견 확증 · T-19 전체확장 검증 · 문서기준 수립 (2026-07-23 Desktop · 배포 `7858694`)

### ★ F3 전제가 바뀌었다 — 검수 화면은 최초발행 경로에 없다 (#311 신설)
Desktop 실측으로 Code 보고를 교차 확인:
| 항목 | 실측 |
|---|---|
| `batch-register` 게이트 | `productIds`만 받음 — readiness/canPublish 검사 **0** |
| 최초발행 모달(`NaverRegisterModal`) | `publish-preview` 참조 **0건** — 검수 화면 안 거침 |
| 검수 화면 발행 버튼 | **재발행(`/update`) 전용**, 미등록 상품에는 409 |

→ 기존 제안("있는 검수 화면을 일괄발행에 연결")만으로는 불충분. **최초발행 경로 자체에 게이트가 없다.**
→ 원칙 **#311**: 게이트는 화면이 아니라 **경로(서버 진입점)**에 건다. 우회 경로 0건 확인이 완료 조건.

### T-19 전체확장 검증 PASS
Code가 기존 7채널 외 **신규 위반 2건 자발 색출·수정**: `out-of-stock/page.tsx`(재입고 검토 그룹) · `KkottiWidget.tsx`(대시보드 품절임박) — 둘 다 `status==='OUT_OF_STOCK'`만 보고 발행여부 미확인 → `isQueueEligible` 배선.
Desktop 프로덕션 실측: 처분 결정 대기함 정상(0건·빈상태 문구 정상). **단건 수습이 아닌 전체 확장 이행 사례.**

### Cowork 설계 접수 — 대안 D 권장
`docs/design/PUBLISH_REVIEW_GATE_2026-07-23.md`. 결정적 발견: 스키마에 **`reviewChecklist Json` · `reviewLastUpdated` · `manualReviewCount` 이미 존재**(schema.prisma:442-444) → **DB 신설 0**으로 검수 상태 저장 가능. PLAYBOOK #1(기존 것 고쳐 쓰기) 정합.

### 문서 관리 기준 수립
`docs/DOCS_STANDARD.md` 신설 — docs 299개 MD 누적 대응. 수명별 4분류(영구/누적/시점/만료) · 폴더 단일책임 · 날짜접미사 규약 · 필수헤더 3줄 · 진입경로 4문서 · archive 규칙.

---

## rev87 — 작업1/2/3 배포 검증 (2026-07-23 Desktop · 배포 `bbc1a97`)

### 검증 결과
| 항목 | 실측 | 판정 |
|---|---|---|
| `/api/version` 원본(curl) | `{"sha":"bbc1a976..."}` · `cache-control: max-age=0, must-revalidate` | ✅ 정상 |
| 배포 SHA | `bbc1a97` == HEAD | ✅ |
| 배너 미노출(동일 버전) | 오탐 없음 | ✅ |
| `surfaceRules.test.ts` 독립 재실행 | **10/10 PASS**(T-05·T-08·T-11·T-12·T-13·T-16~T-20) | ✅ |
| SubstituteEditor | `isOutOfStock={dispositionVerdict.action !== 'NONE'}` (page.tsx:890) | ✅ 단일권위 소비 |
| F1 수치 유지 | 꽃밭돌보기 재활성화 1 ↔ 부활소 1 | ✅ 회귀 없음 |

**T-20 통과 = F1 모순(배지↔버튼 불일치)의 회귀 방지가 코드에 고정됨.**

### ★ 검증 방법론 교훈 (#309 신설)
 Desktop이 브라우저로 `/api/version`을 읽었더니 `{"샤":"..."}` — **Chrome 자동번역이 JSON 키까지 번역**해 "버그"로 오판할 뻔함. curl 원본 확인으로 정상 판명. **API 검증은 브라우저 렌더 텍스트가 아니라 curl 원본으로** 한다.

### 미결 — 배너 양성 동작 미검증
"다른 버전일 때 실제로 뜨는가"는 미확인. fetch 가로채기로 가짜 SHA 주입 + focus/visibilitychange 발생시켰으나 60초 스로틀로 즉시 확인 불가. **다음 배포 시 자연 검증됨**(그때 배너가 뜨면 양성 동작 확증). 뜨지 않으면 즉시 조사 필요.

---

## rev86 — F1/F2 프로덕션 검증 PASS · 캐시 함정 발견(#308) (2026-07-23 Desktop · 배포 `543f38b`)

### 검증 결과 — 전수 PASS (강제 새로고침 후)
| 항목 | 실측 | 판정 |
|---|---|---|
| 부활소 판매중지 | **1건** · 플라티코 "판매중지 — 재활성화 검토 필요" | ✅ F1 해소 |
| 꽃밭돌보기 "재활성화 필요" | **1** | ✅ **두 화면 수치 일치** |
| 정원창고 배지 | **"검수 대기 2건 — 씨앗심기에서 확인"** | ✅ F2 해소(#307 준수) |

Code의 F1(getReactivationReason에 INACTIVE/HIDDEN 분기 추가 + 꽃밭돌보기 카운트를 동일 함수 소비로 전환)·F2(조건축 notReady→미발행 · 문구·이동경로 교체) 모두 정확했음.

### ★ 신규 발견 — 브라우저 캐시 함정 (#308 신설)
배포 SHA 3중 일치에도 프로덕션 화면이 **구버전을 렌더** → Desktop이 "수정 실패"로 오판할 뻔했음. DB(status=INACTIVE·pid 존재)·API 응답·코드 경로를 전부 실측해 조건 충족을 확인한 뒤 **reload** 하자 즉시 정상. 
→ **운영자도 같은 함정에 빠진다.** 배포 알림 시 "Cmd+Shift+R 후 확인" 안내 필수. 개선 후보: 앱이 새 버전 감지 시 "새로고침" 배너 노출.

### F3 — 조사 완료, 운영자 결정 대기
일괄 발행 게이트는 필드완성도(`getPublishReadiness`)만 체크 — **검수/승인 개념 없음**. Product에 검수완료 플래그 부재(schema의 reviewedBy/reviewedAt은 다른 모델용). 제안: `reviewApproved`(boolean) 신설 → 씨앗심기 검수 완료 시 세팅 → 일괄발행 카운트에 AND 조건 추가. **스키마 마이그레이션 필요 → 운영자 결정 대기.**

---

## rev85 — 프로덕션 실측 검증 3화면 PASS + 신규 모순 2건 발견 (2026-07-23 Desktop · 배포 `1d50ed1`)

### 배포 확인
`73046a2..1d50ed1` push 완료(6커밋). production SHA = HEAD 일치 3중 확인(verify-vercel-deploy exit 0 · gh api · Desktop Chrome 실측). **#305/#306 적용 후 첫 정상 배포 검증.**

### 검증 3화면 — 전수 PASS
| 화면 | 이전 | 현재 | 판정 |
|---|---|---|---|
| 좀비 부활소 | 미발행 2건 노출(위반) | **전체 0건** · "모두 양호합니다" | ✅ T-19 해소 |
| 정원 창고 | — | 전체 3 · **표시 2**(아이스틀·달항아리) · 발행가능 2 | ✅ 착지 확인(#301/#56) |
| 꽃밭 돌보기 | — | 전체 3 · **표시 1**(플라티코) | ✅ 발행여부 경계 정상 |

### ★ 신규 모순 2건 (다음 최우선)
**F1. 꽃밭돌보기 "재활성화 필요 1" ↔ 부활소 0건** — 플라티코 행이 "재활성화" 버튼을 띄우는데 이동하면 빈 화면. 부활소에만 발행필터를 넣고 꽃밭돌보기 카운트는 자체기준 유지 → **#295 위반이 해소된 게 아니라 이동함**. 두 화면이 같은 판정 소스를 소비해야 해소. 부수: 플라티코는 발행상품인데 부활소 4사유 어디에도 안 잡힐 → 사유 판정 누락 조사 필요.

**F2. 정원창고 "이어서 작성" 배지 미노출** — `notReady`(입력정보 부족) 기반이라 실측 준비미흡 0 → 배지 안 뜰. 부활소가 쓰던 `draft_incomplete`(미발행 상태)와 **다른 축**. 제안: "발행 가능 N건 — 발행하러 가기"로 재정의 또는 기존 "준비된 것 일괄 발행 N" 버튼과 중복이므로 제거. 현상태는 "준비미흡 0"과 "이어서 작성"이 모순(T-20 계열).

---

## rev84 — 미push 5커밋 발견 · 브리지 "9종" 잔존 정정 · Cowork v2 저장 확인 (2026-07-23 Desktop)

- **미push 5커밋 발견** → 원칙 #305(localhost ≠ 프로덕션)·#306(종료 전 push 확인) 신설. Code가 보고한 "브라우저 실측"은 localhost였음.
- **브리지 "9종" 잔존 2곳**(§4 표 · §9 1항) 정정 → **7종 확정**. Cowork 지적이 정확했음(§3 수정만으로 부족했음).
- **Cowork v2 3종 저장 성공 확인** — LIFECYCLE_STATE_MACHINE(6,530B)·COPY_SYSTEM(5,898B)·SURFACE_RULES(6,391B). 폴더 연결 조치(#304)가 실제로 효과 입증.
- **#303 정상 작동 2회** — Code("9종 문서와 7종 표 불일치") · Cowork("브리지도 정정할지 결정 필요") 둘 다 지어내지 않고 멈추어 확인 요청.

---

## rev83 — lifecycle.ts 착지 · 문서오류 정정 · 경계위반 프로덕션 확증 (2026-07-23 Desktop)

### 확정 사실
- **Code 커밋 2건**: `7bdbc0f`(Desktop 저장분 4파일) + `e2048ba`(CLAUDE.md 포인터 · TASK_BRIDGE stale 정정 · **`src/lib/products/lifecycle.ts` 신설**). TSC 0 errors.
- **문서 오류 정정**: 브리지 §3 제목 "7 → 9"는 **오기**. PERIOD_ENDED·ARCHIVED 2종 폐기 + SOURCE_GONE_* 2종 신설 = **총 7종**. 구현(7종)이 정답. Code가 지어내지 않고 확인 요청 → **#303 정상 작동 첫 사례**.
- **경계위반 프로덕션 실측**(Chrome 커넥터): 꽃밭돌보기 = 전체 3개 중 **표시 1개**(플라티코·발행분만) → 발행여부 필터 **정상**. 반면 부활소는 미발행 2건 노출 → **같은 계열 두 화면이 다른 기준** = 위반 확증(추정 아님).
- **Cowork 3종 문서 미저장 발견**: `docs/design/`에 LIFECYCLE_STATE_MACHINE·COPY_SYSTEM·SURFACE_RULES **0건**. 당시 Cowork가 폴더 미연결이라 저장소에 쓸 수 없었음. 채팅 첨부본이 유일본 → **Cowork가 연결된 지금 v2로 직접 저장**해야 함.
- **신규 문서**: `docs/plan/COLLABORATION_PLAYBOOK.md` — 문제해결 방식 지침(기존것 우선·지침 2계층·환경으로 먼저 막기·커넥터 전수시도·증거기반 검증·문서↔구현 불일치 처리).

### 다음 선행
`lifecycle.ts`가 생겼으나 **아직 어느 화면도 소비하지 않는다**(UI 변경 0). 다음은 소비자 연결: 부활소 경계 수정 + 꿀통창고 '이어서 작성' 큐 이식(세트).

---

## rev82 — Cowork 생애주기 설계 검증 + 브리지 v2 확정 (2026-07-23 Desktop)

### ★ Cowork 3종 설계 검증 — 골격 채택 / 도메인 축 이식
Cowork가 **코드 접근 없이 독립 설계**("첨부된 지식 폴더가 비어 있어")한 결과, 실제 스키마·코드와 갭 6건 확정(Supabase information_schema + disposition.ts/source-gone.ts/daily-slots.ts 실독).

| 갭 | 내용 |
|---|---|
| G1 | Cowork 원자 7필드 중 **실재 0개**(isPublished/isArchived/isSuspended/saleStartAt/saleEndAt/requiredFieldsComplete/stock 전부 부재) |
| G2 | **sourceGone(공급처 단절) 상태 소실** — OUT_OF_STOCK로 뭉개짐. 이번 작업의 존재 이유가 빠짐 |
| G3 | 처분 5액션(NONE/MARK_OUT_OF_STOCK/SUSPEND/RESOURCE/DELETE_SAFE) 미반영 |
| G4 | 자산 축 소실 — T-05 "발행 트랙 삭제 전면금지"는 과잉(실제는 자산 유무 분기) |
| G5 | 도메인 오인("화훼 이커머스") → 실제 도매매 드롭십. 기간판매 미사용 |
| G6 | "status 컬럼 제거" 실현 불가(write 3경로+필터탭 사용 중) |

**판정**: 폐기 아님. **골격 채택**(파생 단일함수·발행여부 1급 축·권한 매트릭스·금지조합 테스트·3초룰·T-11 주액션 유일성) + **도메인 축 이식** → `docs/design/LIFECYCLE_BRIDGE_V2_2026-07-23.md` 신설(브리지가 Cowork 문서의 원자·상태·액션을 override).

### 확정 사항
- 파생 상태 **7 → 9**: `SOURCE_GONE_RESOURCE`/`SOURCE_GONE_DELETABLE` 이식. 우선순위 **단절 > 중지 > 품절**(명화 케이스: 중지만 보이면 대체소싱이 숨음).
- **상태 축 ↔ 권고 축 분리**(#300): 배지=진단(9상태) / 버튼=처방(5액션). disposition.ts:139가 이미 SUSPENSION→NONE인 것과 정합.
- **화면 성격 2종**(#301): 보관함(위치·발행여부 분리) vs 작업 큐(조건·발행 전용). disposition.ts:129 `!naverProductId→NONE`이 이미 발행 게이트 내장.
- **부활소 `draft_incomplete` = 경계 위반 확정** → 분기 제거 + `!!p.naverProductId` 필터. 누락 방지로 꿀통창고에 '이어서 작성' 큐 이식(#56).
- 테스트: T-04/T-06/T-07/T-10 폐기(미구현 개념), T-05 수정(자산 축), **T-16~T-20 신규**.

### Code 카테고리 회귀 검증 결과 (읽기전용 · 접수)
| 항목 | 결과 |
|---|---|
| /products 기본뷰 미발행 제외 | ✅ 반영됨(`ccf8e2c` · `all: filter p => !!p.naverProductId`). TASK_BRIDGE:364-367 "미착수" 메모는 **stale → 정정 필요** |
| 부활소 미발행 포함 | 코드 확인(daily-slots.ts:161-163). **정책 판정 = 위반 → 제거**(위 확정) |
| 꿀통창고 2탭 | ✅ 구현됨(garden-nav.ko.json:47-70 · 꿀통 꽃나들이/정원 창고) |

### 커밋 상태
`c5f5290` — Desktop rev81+원칙#295~299+인계 / Code 판정감사·강건성티켓·스모크스크립트 7파일 한 커밋 완료. **코드 변경 0(docs only) → 브라우저 테스트 대상 없음**.

---

## rev81 — DESKTOP-1 처분 7채널 정합 실측 종결 + 생애주기 일원화 착수 (2026-07-23 Desktop)

### ★ DESKTOP-1 실측 종결 — 정합 6/7, 부활소 이탈 확정, 원복 완결
실 DB 주입(inventory_snapshots qty=-1 3행 · now/-1h/-2h 끼임회피) → **sourceGone=TRUE**(선두 연속음수 3) 실측 → 채널1(처분 대기함) 육안 PASS(삭제안전 1건) → 부활소 육안+grep 이탈 확정 → 원복 완결(TESTDISP-* 0 · pid/type NULL).
- 안전조치: 주입 전 pid/status NULL 확인(무손실 원복) · id text타입 확인 · 끼임 교정(실 07-22 양수 위에 3행 안착).
- Cowork 스텁이 못 잡은 "실 DB 행" 정합을 실측으로 증명(이번 사이클 마지막 구멍 종결).

### 채널별 판정
| 채널 | 판정 | 근거 |
|---|---|---|
| 1 처분 대기함 | 정상 | 육안(삭제안전 1건) |
| 2 목록배지 · 3·4 대시보드 · 5 알림 · 7 발행게이트 | 정상(추정) | grep — 육안 미확인 |
| 6 부활소 | **이탈 확정** | 육안+grep (getReactivationReason 자체 status 판정 · daily-slots.ts:143) |

### 신규 발견 (단건 아님 · 전체 확장 대상)
1. 부활소 = 화면간 모순 지시("삭제 권장" 배지 + "등록 완료" 버튼 동시). 근본 = 화면별 자체 분류(#295).
2. products/page.tsx:878 SubstituteEditor 재고0 넛지 = `status==='OUT_OF_STOCK'` 직접 비교(부분 이탈). sourceGone+ACTIVE 케이스 강조 누락. 1줄 수정 후보(일원화 배치).
3. sourceGone 스냅샷 타이밍 취약(#297 · SOURCE_GONE_ROBUSTNESS_TICKET_2026-07-23.md).
4. 카테고리 회귀 의심: 부활소에 미발행("등록 미완료") 노출 = 발행여부 분리(스펙 §1) 미전파(#296) → Code 검증.
5. 상품셋 변화: 명화(검증 baseline #55) → Product 테이블 제거, 플라티코 추가. 교체 경위 확인 필요.

### 작업 큐 (우선순위 · 상태 · 다음 액션)
| P | 작업 | 레인 | 상태 | 다음 액션 |
|---|---|---|---|---|
| 1 | 생애주기 state machine 설계(deriveLifecycleState · 발행여부 축) | Cowork | 착수 | docs/design 3종(LIFECYCLE/COPY/SURFACE) |
| 1 | 판정 일원화 전면 감사(부활소 외 이탈 색출) | Code | 감사분 완료 | 카테고리 회귀 검증 추가 |
| 2 | 처분 스모크 스크립트 커밋 | Code | 대기 | git 커밋(실행은 보류) |
| 2 | sourceGone 강건성 정책확정(연속N vs 최근M중N) | Code | 설계완 | 운영자 확정 후 구현 |
| 3 | 일원화 구현(부활소·SubstituteEditor:878·발행여부 필터) | Code | 대기 | Cowork 설계 확정 후 |
| 3 | 처분 스모크 실행 | Desktop | 대기 | 대상 선정(naverPid有+스냅샷0) |
| — | 명화 판매중지 PUT | 운영자 | 보류 | GO(#46) |
| — | 명화→플라티코 교체 경위 | Desktop | 확인필요 | 다음 세션 |

### 커넥터 노트
Filesystem MCP 다운(#26) → **Desktop Commander로 우회 저장 성공**(#298). 이 rev81도 Desktop Commander로 기입. Code 미커밋 3파일(DISPOSITION_SURFACE_AUDIT·SOURCE_GONE_ROBUSTNESS_TICKET·smoke script)은 Code 커밋 대기.

---

---

## rev93 — 발행전검수 화면 개선 + 꼬띠 페르소나 표면축 신설 완료 (2026-07-30 Desktop 검증)

**배경**: 대표님 스크린샷 기반 "발행 전 검수" 화면 UI/UX 개선 요청(문구 오류·레이아웃 밋밋함) + 이어서 발견된 잔여 사투리 8곳 정리.

**작업1~2 (Desktop 설계, Code 구현, 2026-07-30 오전 세션)**:
- `3532d78` 문구 근본수정 — `simple-crop.ts`의 개발자용 영어 경고 메시지가 화면에 그대로 노출되던 버그의 근본원인(`CropStudioPanel.tsx`가 `warning.message`를 raw 렌더) 확정·해소. `code`→한글 매핑 + 자동후보 2종(주목도·디테일) 중복 dedup. 페이로드 사람표기(가격 콤마, 원산지 라벨, 카테고리 풀네임).
- `994fb91` 레이아웃 재설계 — 1단 세로 스택 → 마스터-디테일 2단 그리드(좌: 이미지 작업 / 우: sticky 결정 패널 — 준비도 게이트·페이로드·검수승인). 상단 고정바(상품명+상태+발행버튼).
- Desktop 브라우저 실측: 아이스틀·달항아리 2개 상품 정상 렌더, 영어원문 0건, 중복 0건, 콘솔 에러 0.

**작업3 (페르소나 표면축, 2026-07-30 오후 세션)**: 검증 중 판단표면(검수·발행 게이트)에 사투리 감탄사("이랴", "~어유")가 남아있는 게 오히려 판단력을 흐린다는 문제를 발견. 조사 결과 `persona-audit.py`가 "사투리 존재=페르소나 적용 완료"로만 판정하는 얕은 기준이 원인(판단표면에도 기계적으로 사투리 삽입을 유도).
- **원칙 #318 신설**: 정원사🌷/카우걸🤠 모드축과 별개로 "친밀 표면"(사투리 허용) vs "판단 표면"(사투리 감탄사 제거, 정확한 톤) 축 추가.
- `e16dcde` `KKOTTI_PERSONA_VOICE_GUIDE.md` §6 신설(§1~5 원문 무변경, 순수 추가).
- `bf72731` 판단표면 8곳(`publish-preview-strings.ko.json`의 error.title·publish.disabledHint·publish.fail·publish.notRegisteredHint·cropStudio.drawHint·editHint·clipWarn·error) 사투리 제거.
- `373cca9` `persona-audit.py`에 `JUDGMENT_SURFACE_KEYS` 반전판정 추가(#283 `CUSTOMER_FACING` 패턴 재사용, #62 준수) — 판단표면은 "사투리 부재"가 정상으로 판정되도록 로직 수정.

**Desktop 실측(직접 git diff 대조 + 재실행 + 브라우저)**:
- git diff로 8곳 값이 지정 스펙과 글자 단위까지 정확히 일치 확인
- JSON 유효성·sentinel 0건·사투리 잔존 0건 확인
- `persona-audit.py` 직접 실행 → "판단 표면 위반 0건 (8개 키 확인)" 재현
- 로컬 dev 서버(전경 프로세스 방식) + 브라우저로 `disabledHint`·`drawHint`·`editHint` 3곳 실제 렌더 확인, `notRegisteredHint`도 코드 기준 확인
- 미검증(정직 표기, #310): `publish.fail`·`cropStudio.clipWarn`·`cropStudio.error`·`error.title` — 인위적 오류 유발 없이는 재현 불가, git diff로만 확인

**★ 부수 발견 — 문서 정합성 사고 (재발방지 기록)**: 이번 세션에서 "CLAUDE.md 축소 2단계"와 "`#311` 게이트 배선"을 낡은 인계 문서를 근거로 "미완료"로 오판, 재작업을 준비하다가 실측(git log, grep)으로 **둘 다 이미 완료돼 있음**을 발견했다. 원인은 `TASK_BRIDGE.md` §3-A 작업큐 보드가 2026-07-22 이후 갱신되지 않고 방치된 것. `docs/handoff/CURRENT.md`에 상세 기록, 향후 세션은 인계 문서의 "미완료" 표시를 그대로 믿지 말고 먼저 실측할 것.

**검증**: tsc 0 errors · 로컬 브라우저 실측(6곳 중 4곳 직접 확인, 2곳 코드리뷰) · sentinel 0건 · JSON 유효성 확인. 브랜치 `feature/preview-copy-then-redesign`(6커밋) 미push — 운영자 결정 대기.

---

## rev94 — 팀 구조 정정 + PRINCIPLES_LEARNED 분할 완료 (2026-07-30 Desktop)

**배경**: 대표님 확정 — "이건 1인 개발이 아니다. 대표님+Claude가 함께 진행하며, 에이전트가 늘어나면 역할이 더 나뉠 것". "1인 개발이라는 단어 이외에 문제되는 내용이 없다면 그렇게 처리"로 범위 한정.

**작업1 (팀 구조 정정)**: 전 활성 문서(archive 제외) 전수 스캔 — `CLAUDE.md`(팀 구조 각주 신설 + 3곳 정정, 이전 세션), `TASK_BRIDGE.md` §4 SD-04(STANDING DECISIONS, 정확히 1건 매치 확인 후 치환), `PRINCIPLES_LEARNED.md` #320(정확히 2건 매치 확인 후 치환). 전부 "1인 개발" 단어만 제거, 문장 나머지 의미 보존. "1인 셀러"·"1인 운영자"(스토어 운영 형태를 가리키는 정당한 표현)와 과거 archive 문서(시점 기록)는 의도적으로 유지.

**작업2 (PRINCIPLES_LEARNED.md 분할, #31)**: 1483줄로 1500줄 임계 근접 → 원칙 #46~#227 구간(131건, 718줄)을 `docs/plan/archive/PRINCIPLES_LEARNED_archived-2026-07-30.md`로 이동. 현재 파일은 #254부터 시작, 763줄(임계까지 여유 737줄 확보).

**손실 0 검증(코드로 증명)**: `git show HEAD:...`로 원본 1483줄을 복원한 뒤, "헤더 + archive본문 + 현재파일본문"을 파이썬으로 재조합해 원본과 라인 단위로 완전 일치(`Match: True`) 확인. 상단 인덱스 표(2026-07-22 분할 시 만든 것, 이제 실태와 어긋난 상태였음)도 함께 정정.

**검증**: tsc 0 errors · sentinel grep 0건(현재파일·archive파일 양쪽) · 손상문자 0건 · 재조합 완전일치 확인.

---

## rev95 — 꼬띠 소싱 에이전트 PRD + 작업 스케줄 보드 신설 (2026-07-30 Desktop)

**배경**: 운영자 요구 — "디스코드 꼬띠 추천이 기존 크롤링 상품 내에서만 나온다. 웹데이터로 시즌·니치 상품을 발굴해 제안하고, 내가 할 일을 자동화해 컨펌만 하게 해달라. 에이전트로 폴더구조를 확장해야 하나?"

**실측 진단(근본원인 확정)**:
- `/api/cron/daily`(08:00 KST)가 `computeRecommendation(products)` 호출 — products = 자사 DB 상품뿐. **이것이 "추천이 부실하다"의 직접 원인.**
- **신규 발굴 엔진은 이미 존재**: `src/lib/sourcing-recommender.ts`(496줄)가 DataLab 트렌드→검색량→경쟁분석→도매꾹/도매매 OpenAPI 실시간 검색→마진계산→황금/니치/시즌 태그까지 수행. **그러나 `vercel.json` crons에 없어 어떤 크론에도 연결 안 됨** → 수동 POST 아니면 절대 실행되지 않음.
- 좀비·품절·마진위기·발행준비 알림은 이미 정상 작동(`computeOpsDigestSignals`).
- `getSeasonContext()`는 6개 이벤트만 하드코딩(발렌타인/화이트/어린이/어버이/빼빼로/크리스마스) — 설·추석·신학기·장마·김장·블프·이사철 전부 누락. "시즌 전략상품"이 안 나오는 직접 원인.

**wikidocs 「Claude 기초부터 고급까지 100」 검토**(034·036·092·097·098 전문 정독, 093~096은 092 템플릿 따르는 역할별 예시):
- 092 Subagents: `.claude/agents/*.md`, 별도 context window, **세션 중에만 동작** → 프로덕션 크론 대체 불가 확인
- 097 구현에이전트: "동시 작업자의 변경을 되돌리지 말라" 지시문 — 다중 레인 환경에 직접 적용 가치 있음
- 098 Agent Teams: **write set 기준 병렬 분리 + 공유 계약 + 통합 담당자** — 운영자의 "작업 흐름 꼬임" 우려에 대한 정확한 해법
- 036 PRD: 범위/비범위 분리로 "알아서 만들어줘" 위험 차단
- 034 디렉터리별 CLAUDE.md: 위험 폴더(naver·discord·prisma)에 경고 배치 — 향후 검토 후보

**산출물**:
| 파일 | 역할 |
|---|---|
| `docs/design/KKOTTI_AGENT_SYSTEM_PRD.md` (신규) | 에이전트 시스템 PRD — 3계층 구분·4역할 파이프라인(정찰병/전략가/검수관/전령)·범위/비범위·수용기준·P1~P5 의존성 그래프·열린질문 4건 |
| `docs/plan/WORK_SCHEDULE_BOARD.md` (신규) | **작업 우선순위·의존성 단일 권위 보드** — READY/PARALLEL-OK/BLOCKED 상태 + write set 표기 + 레인 배분 원칙 |

**신규 원칙**: #321(에이전트 3계층 A/B/C 구분 — 운영자가 원하는 건 항상 C, MCP는 시드 데이터 구축용) · #322(병렬 판단은 write set 겹침 여부로, 주제 유사성 아님)

**구현 계획**: P1 소싱추천 크론 연결+dry-run(🟢READY) → P3 검수관 → P4 앱 브리핑 화면 → P5 피드백 루프. **P2 시즌 캘린더 확장은 P1과 write set 안 겹쳐 병렬 안전**.

**미착수**: 코드 구현 전량(설계만 확정). 디스코드 실발송은 dry-run 검증 후 운영자 승인 필요.

---

## rev113 — 트랙③ 2단계 표시부 프로덕션 검증 완료 (2026-08-07 Desktop, 커밋 `f9570ab`)

**배경**: Code③ 1단계(6b8b585)가 만든 `detectCategoryMismatch` 판별 로직을 화면에 연결(설계 §9 4단계). 운영자 지시대로 "완료 작업은 브라우저 테스트 완벽히 거친 후 다음"을 지켰다.

**구현**(write set: `SourcingRecommendWidget.tsx` + `useDashboardData.ts` 2파일):
- `useDashboardData.ts`: `SourcingWholesaleProduct`에 `categoryMismatch`/`Axis`/`Modifier` 3필드 추가. ★이게 없으면 API 응답에 필드가 있어도 프론트가 못 읽는 **연결 고리**였음(실제로 이 발견이 이번 세션의 핵심).
- `SourcingRecommendWidget.tsx`: `getCategoryMismatchLabel()` — 내부 축 코드(bodyPart 등)를 셀러 언어로 변환(#317). 카드·드로어에 기존 priceOutlier/accessoryRisk와 같은 톤으로 3중 우선순위 경고 추가.

**★ 단위 검증(임시 스크립트, 삭제 완료)**: detectCategoryMismatch + getCategoryMismatchLabel 조합 5케이스 전부 통과(귀청소기→"신체용품(귀) 의심", 어항청소기→"반려동물용품(어항) 의심" 등).

**★ 프로덕션 브라우저 완전 검증(스크린샷 확인)**:
1. 프로덕션 재스캔 실행 → "청소기" 키워드에서 실제로 "진동 흡입 귀클리너/귀청소기/귀이개/귀이게" 상품이 `categoryMismatch:"suspect", axis:"bodyPart", modifier:"귀"`로 API 레벨 판별 확인.
2. **카드 확장**: 도매 매칭 목록에서 해당 상품에만 "⚠️ 카테고리 확인?" 노란 배지 정확히 렌더, 다른 4개 정상 상품(휴대용 귀청 세트·하수구막힘·뭉알뭉알)은 배지 없음(오탐 0) — 스크린샷 확인.
3. **드로어**: "⚠️ 신체용품(귀) 의심" 전체 문구 정확히 렌더 — 스크린샷 확인.
4. 검증 중 낙점 상태 전부 null 유지(테스트 데이터 방치 없음, 별도 원복 불필요).

**작은 시행착오**: 위젯이 `/dashboard`가 아니라 `/growth`에 있다는 걸 처음에 착각(#310 정신 — 정직하게 보고 후 다음 턴에 바로 수정), 카드 버튼 텍스트 매칭도 `/월` 조건이 다른 버튼과 겹쳐 재시도 필요했음. 최종적으로 정확한 요소를 찾아 완전 검증.

**결론**: 트랙③(카테고리 정밀화 1단계+2단계)이 설계→구현→표시→프로덕션 검증까지 전 과정 완료. `wholesale-matcher.ts`(Code)와 `SourcingRecommendWidget.tsx`(Desktop) write set 분리로 병렬 무충돌 진행됨(#322 모범 사례).

---

## rev112 — 트랙③ 1단계 카테고리 정밀화 구현 완료 (2026-08-07 Code, 커밋 `6b8b585`)

**배경**: rev111 리서치·설계 확정 후 배분된 구현 작업. 명세: `docs/handoff/TRACK3_IMPL_HANDOFF_2026-08-07.md`.

**★ 구현**: `src/lib/category-mismatch-dict.ts`(신규) — 설계 §4-4 그대로 6개 축(신체부위·동물·장소이동수단·대상기기·연령사용자·소재형태축소어) 블랙리스트 + 화이트리스트 + head noun별 확장 맵. `wholesale-matcher.ts`에 `detectCategoryMismatch()` 추가(export, 순수함수), `WholesaleProduct`에 `categoryMismatch`/`categoryMismatchAxis`/`categoryMismatchModifier` 3필드. 정렬·표시는 손대지 않음(명세대로 write set 분리 — Desktop 2단계 몫).

**★★ 실측으로 발견·수정한 오탐(설계 §5가 예견한 위험의 실제 사례)**: 최초 구현(공백 전부 제거 후 substring 매칭)을 실 DB 데이터(`sourcingOpportunityRecord.wholesaleMatches`)로 교차검증하던 중, 키워드 "멀티탭" 상품명 "...와이파이 멀티탭..."에서 공백 제거 시 "...파이멀티탭..."이 되어 축A 한정어 "이"(치아/이)가 "이"+"멀티탭"으로 **우연히** 매칭되는 오탐을 발견. "이"는 "와이파이"의 말음절일 뿐 신체부위 의미가 아님. → `hasTokenBoundedPrefixMatch()`로 토큰(띄어쓰기) 단위 판정으로 재설계: (1)같은 토큰 안 수식어+키워드 접두(예: "귀청소기") (2)수식어가 독립 토큰이고 바로 다음 토큰이 키워드로 시작(예: "차량용 청소기", 설계 §4-4 경계사례 실존 확인 패턴) — 이 두 형태만 매칭, 서로 다른 단어에 우연히 걸치는 결합은 차단. 수정 후 실DB 재검증: suspect 3건→2건(오탐 1건 제거), 남은 2건 전부 실제 카테고리 전환 확인(차량용 공기청정기·귀청소기류).

**검증(단위 테스트, 순수함수 직접 호출)**: 명세 지정 5케이스 + 경계 4케이스(총 9건) 전부 기대대로 판정 — 청소기/귀청소기/어항청소기/차량용청소기(suspect) · 무선청소기/로봇청소기(정상) · 미니청소기(정상, 크기) vs 미니어처청소기(suspect, 완구 — 형태소 경계 정확 구분) · 강아지청소기(suspect) · 키워드 자체가 한정어 포함 시 스킵("귀청소기" 키워드로 "귀청소기" 검색 시 정상 통과).

**검증**: tsc 0 · build 0 · sentinel grep 0건.

**write set 준수**: `category-mismatch-dict.ts`(신규)+`wholesale-matcher.ts` 2파일만. `sourcing-recommend/route.ts`·`SourcingRecommendWidget.tsx` 미접촉.

**커밋·push·배포**: `6b8b585` main 직접 push(#36 — 순수함수 추가, route/위젯 미변경으로 저위험) → `verify-vercel-deploy.sh --wait` OK(production=6b8b585). 결과 문서: `docs/handoff/CODE_TRACK3_IMPL_RESULT_2026-08-07.md`.

**다음 단계(Desktop 2단계)**: 표시부 배지+정렬 반영(`SourcingRecommendWidget.tsx`) · 프로덕션 브라우저 실사용 검증(청소기/가습기 등 동음이의 키워드) · 효과 관찰 후 2단계(대분류 대조) 착수 여부 판단.

---

## rev111 — 카테고리 정밀화 Deep Research 완료·구현 착수 가능 확정 (2026-08-07 Desktop)

**배경**: 운영자가 Desktop이 제안한 한정어 사전 초안(직관 기반)에 대해 "저보다 전문가인 당신이 업계 기준을 제대로 확인하고 진행하라" 지시. Deep Research 실행.

**★ 리서치 산출물**: `docs/design/KOREAN_ECOMMERCE_CATEGORY_SIGNAL_RESEARCH_2026-08-07.md`(신규, 133줄). 핵심 발견 3가지:
1. 아이템스카우트·셀러픽·셀러라이프 등 한국 소싱 툴은 "동음이의 카테고리 오염" 전용 필터가 **없음**(대표 카테고리 표시만, 실무는 엑셀 수동삭제) → 시장 미해결 공백, 차별화 포인트.
2. 네이버쇼핑(~85%)·버즈니(1차 카테고리 near-100%, 컴퓨터월드 기고 확인) 사례가 "대분류 판별은 규칙+계층 매핑으로 고신뢰"임을 뒷받침 → §7-A 실측(categoryCode 5단계 계층) 대분류 2자리 비교가 정확도 높은 신호로 검증.
3. UX는 하드 배제가 아니라 신뢰도 등급 기반 강등이 업계 표준(아마존 browse node·검색 벤더 공통, Baymard 이탈률 통계로 뒷받침).

**★ KEYWORD_CATEGORY_PRECISION 설계 전면 갱신**(`6532d2f`): 
- §4 권장안을 리서치 기반 **3단계 신뢰도 등급**(suspect/confirmed/cleared)으로 업그레이드. cleared 단계 신규 — 사전 매칭돼도 실제 카테고리 같으면 정상 노출 복원.
- §4-4 한정어 사전을 리서치 근거 **6개 축**(신체부위·동물반려동물·장소이동수단·대상기기·연령사용자·소재축소어)으로 확정. 실제 네이버 카테고리 분기 사례(청소기→디지털/가전, 차량용/어항/애견청소기→생활/건강)로 검증.
- §7 선결 확인 3건 전부 [x] 해소 — **구현 착수 가능** 확정.
- §9(신규) 다음 단계: 1단계(사전만, API호출0) 우선 구현 → 관찰 → 필요시 2단계(대분류 대조) 후속. 병렬 배분 후보 제시(Cowork/Code=사전+로직, Desktop=표시부+검증).

**핵심 판단(경계 사례로 원칙 강화)**: "차량용 청소기"가 판매자 재량으로 가전/자동차용품 양쪽에 실제 등록됨(리서치 확인) → 완전 자동 배제 절대 금지 근거 강화. confirmed도 삭제 아닌 접힘+토글까지만(#327 정신 강화, 운영자 원칙 #46·#307과 정합 — 자동 판단이 판매 기회를 임의로 차단하지 않음).

**다음 세션 최우선**: 운영자 확인 후 ③ 구현 착수. write set은 `wholesale-matcher.ts`+신규 사전 파일 — route.ts·위젯 무간섭이라 병렬 안전. 1단계(사전) 먼저, API 호출 0이라 즉시 배포 가능.

---

## rev110 — 거래처 설정 코드 한글화 + 3레인 병렬 검증·통합 (2026-08-07 Desktop)

**3레인 병렬 작업 전부 완료·커밋·프로덕션 배포**:
| 레인 | 작업 | 커밋 | 상태 |
|---|---|---|---|
| 💻 Code | ② 트랙C-3 주간 소싱 요약 | `230f1c5`·`f288854` | ✅ Desktop 교차검증 완료 |
| 🌸 Cowork | ③ 키워드 카테고리 정밀화 설계 | `40d76f2` | ✅ Desktop이 락대기분 대신 커밋 |
| 🖥️ Desktop | ⑤ 거래처 설정 코드 한글화 | `9a07f87` | ✅ 프로덕션 검증 완료 |

**★ ⑤ 거래처 설정 코드 한글화(#332 전상품 확장, 커밋 `9a07f87`)**: 소싱 위젯 밖에서도 DMM/DMK 노출 전수조사. settings/platforms "도매꽉" 오타→"도매꾹"(화면 노출 1곳), settings/suppliers 플랫폼 코드 3곳(통계칩·테이블배지·모달버튼) 한글화 + PLATFORM_LABELS 영문→한글. **SKU 코드값(DMM-38488)은 셀러 실무 값이라 의도적 보존** — 표시 라벨만 한글화(#332 정확 적용). 프로덕션 검증: 드롭다운 "도매매 (DMM)"·통계칩 "도매매 4"·테이블 배지 한글·오타 제거 전부 확인.

**★ ② Code 트랙C-3 Desktop 교차검증(#45)**: Code 보고를 그대로 안 믿고 Desktop이 실측 재검증. DB 카운트 실측(발굴5·관심0·소싱중0) Code 보고와 일치. 추가로 낙점 세팅(관심1·소싱중1) 상태에서 buildWeeklyReportEmbed 직접 호출 → `🌱 이번 주 소싱: 발굴 5건 · ⭐관심 1 · 🔎소싱중 1 · 블루오션 TOP: 가습기, 멀티탭, 청소기` 정확 렌더 확인(임시 스크립트, 검증 후 삭제·발송 없음). Code가 인계 예시(새 embed field) 대신 기존 4섹션+한글JSON 규칙 지켜 구현 — 옳은 판단. **유일 미검증=실제 Discord 채널 육안(실발송 필요, 운영자 승인 대기).**

**★ ③ Cowork 커밋 대행**: Cowork가 index.lock 충돌로 커밋 못 한 `KEYWORD_CATEGORY_PRECISION_2026-08-05.md`(157줄)를 Desktop이 Cowork 파일만 add해 커밋(`40d76f2`). 설계 품질 우수 — 제3의 축(동음 다른 카테고리 본품) 정의, 방안 D(수식어 사전 1차+상세 카테고리 2차) 권장, 실측 근거(getItemList ca 파라미터는 받지만 응답에 카테고리 코드 없음).

**신규 원칙 #332 확장 적용**: 화면 노출 코드→한글 라벨 원칙을 소싱 위젯에서 거래처 설정까지 확장(단건 수습 금지·전 화면 공통). 단 SKU 코드처럼 셀러가 실제 쓰는 코드값은 보존(개발자 은어 vs 실무 값 구분).

**git 이슈 처리**: index.lock 고아 파일 발생(TTY 전환 중 중단 흔적) → 실행 프로세스 없음 확인 후 안전 제거. Code가 남긴 stash `z3c-misdirected-changes-needs-redo` 존재 — 운영자 판단 대기(건드리지 않음).

**미결(운영자 승인 대기)**: Code② 주간리포트 실제 Discord 발송 육안 확인 · stash 처리 방향 · Cowork③ 설계 → 구현 착수 여부(선결 3건: getItemView 카테고리 필드 실측·한정어 사전 승인·A-3 호출 상한).

---

## rev109 — 트랙C-3 주간 소싱 요약 완결 (2026-08-07 Code, 커밋 `230f1c5`)

**배경**: rev107에서 배분된 레인② — 주간 운영 리포트(cron/weekly, 매주 월 08:00 KST Discord)에 "이번 주 소싱 발굴·낙점 현황" 섹션 추가. 명세: `docs/handoff/CODE_TRACK_C3_HANDOFF_2026-08-06.md`.

**★ 구현**: `cron/weekly/route.ts`에서 `sourcingOpportunityRecord` 최근 7일 조회 → 발굴(고유 키워드)·관심·소싱중·제외 카운트 + 블루오션 TOP3 집계(best-effort try/catch, #82). `buildWeeklyReportEmbed`에 `sourcingWeekly?` 옵셔널 파라미터 추가. **설계 판단**: 코드베이스가 이미 "4섹션 구조(situation/impact/action/kkotti) + 한글은 discord-strings.ko.json에만" 원칙을 엄격히 지키고 있어, 인계문서의 "새 embed field" 예시 대신 기존 `situation` 섹션에 한 줄 추가하는 방식으로 구현(기존 아키텍처 규칙 2개 동시 준수). 발굴 0건이면 섹션 자체 생략(#325 — 정적 라벨 하드코딩 금지 원칙 적용).

**검증(실DB 실측, Discord 실발송 없이)**: Prisma 직접조회 스크립트(스크래치패드, 검증 후 삭제)로 실데이터 확인 — 총 5행, 발굴 5건(가습기·멀티탭·공기청정기 등), 관심/소싱중/제외 전부 0(운영자 미결정 상태). `buildWeeklyReportEmbed`를 이 실측값으로 직접 호출해 embed JSON 렌더 확인 — situation 필드에 "🌱 이번 주 소싱: 발굴 5건 · ⭐관심 0 · 🔎소싱중 0 · 블루오션 TOP: 가습기, 멀티탭, 공기청정기" 정상 노출. **Discord 실채널 발송은 하지 않음**(sendDiscord 경로 미실행) — 다음 정규 크론 또는 운영자 승인 하 수동 트리거 시 실채널 렌더 확인 필요.

**write set 준수**: `cron/weekly/route.ts`+`discord-builder.ts`(명세대로) + `discord-strings.ko.json`(한글 리터럴 금지 규칙 준수 위해 추가, 명세엔 미기재였으나 필수). 금지 파일(`sourcing-recommend/route.ts`·`wholesale-matcher.ts`·`SourcingRecommendWidget.tsx`) 미접촉. 범위 밖 미커밋 변경(`settings/platforms/page.tsx`·`settings/suppliers/page.tsx`, 타 레인 추정) 발견 — 손대지 않고 커밋에서 제외.

**검증**: tsc 0 · build 0 · sentinel grep 0건.

**커밋·push·배포**: `230f1c5` main 직접 push(#36, 저위험) → `verify-vercel-deploy.sh --wait` OK(production=230f1c5). 결과 문서: `docs/handoff/CODE_TRACK_C3_RESULT_2026-08-06.md`.

**다음 세션**: Desktop이 이 결과를 CURRENT.md에 병합 → 다음 정규 월요일 크론 또는 운영자 승인 시 Discord 실채널 렌더 확인.

---

## rev108 — 도매처 코드(DMM/DMK) 화면 한글화 + 빈괄호 근본수정 (2026-08-06 Desktop)

**착수 배경**: 운영자 승인 하 소싱 위젯 UX 종합점검(B작업). ②③은 Code·Cowork 병렬 대기 상태라 Desktop이 write set 안 겹치는 위젯 파일(`SourcingRecommendWidget.tsx`)을 단독 점검.

**UX 점검 실측(#275 DOM 실측)**: 4개 위젯 높이 776px 전부 동일 → 그리드 정렬 정상(스크린샷 착시 확인). 소싱 위젯 하단 251px 여백은 breathing room으로 정상(데이터 가변적 — 억지로 안 채움, 무리한 개선 배제). **진짜 결함 = 도매 매칭의 DMM/DMK 개발자 코드 노출.**

**★ ④ 도매처 코드 한글화(전 상품 공통 #62·#317, 커밋 `befcb72`)**:
- `getPlatformLabel(platform)` 단일 헬퍼 신설. DMK→도매꾹(초록), DMM→도매매(빨강). 카드·드로어 공유(단일 권위).
- 배지 4곳 `{w.platform}` → 한글 라벨 교체. 내부 코드값(DB 'DMM'|'DMK')은 유지, 표시 계층만 변환.

**★ 빈 괄호 근본수정(#325, 커밋 `0168591`)**: 배포 후 프로덕션 검증 중 "도매 매칭 ()" 빈 괄호 발견. 헤더가 참조하던 `wholesalePlatforms` 필드를 API가 안 채움(항상 undefined) → 실제 `wholesaleMatches[].platform`에서 고유 플랫폼 유도하도록 수정(카드·드로어 헤더 2곳). 없으면 괄호 생략.

**프로덕션 검증(브라우저 실측)**: 카드 확장·드로어 양쪽 DMM/DMK 잔존 0, 한글 배지(도매매·도매꾹) 정상, 헤더 "도매 매칭 (도매매·도매꾹)", 빈 괄호 없음. tsc0·build0. 테스트 낙점데이터 원복(8/6 5건 status NULL).

**신규 원칙 #332**: 화면에 노출되는 값이 내부 코드(플랫폼 코드·enum·상태값)라면 표시 계층에 한글 라벨 매핑 함수를 두고 코드값은 데이터로만 유지한다(#317 실사례). 요약 필드(wholesalePlatforms)가 죽어 있으면 실제 목록 데이터(wholesaleMatches)에서 유도한다(#325 연장).

**커밋·push**: `befcb72`(한글화) + `0168591`(빈괄호) 전부 push·프로덕션 검증. write set = `SourcingRecommendWidget.tsx` 단일(②③과 무겹침 #322).

---

## rev107 — 소싱 레코드 누적정리 + 3레인 병렬 배분 (2026-08-06 Desktop)

**운영자 방향(신규)**: 토큰 비용 절감 위해 Cowork·Claude Code·Desktop 3레인 병렬 배분. 병렬작업 검증·오류 누락 없이 체크, 완료작업은 브라우저 실사용 검증 후 다음. 오류는 전 상품 공통 시스템 관점. 문서 지속 갱신 + 채팅 핵심 인계 메시지 + 진행/미진행/계획 리스트 브리핑.

**★ 레인 배분(#322 write set 겹침 0 확인)**:
| 레인 | 작업 | write set | 인계 문서 | 상태 |
|---|---|---|---|---|
| 🖥️ Desktop | ① 소싱 레코드 누적정리 | `sourcing-recommend/route.ts` | (CURRENT §1) | ✅ 완료·push |
| 💻 Code | ② 트랙C-3 주간 소싱 요약 | `cron/weekly/route.ts`+`notifications/discord-builder.ts` | `docs/handoff/CODE_TRACK_C3_HANDOFF_2026-08-06.md` | 🟢 대기 |
| 🌸 Cowork | ③ 키워드 카테고리 정밀화 | `wholesale-matcher.ts`(설계만)+리서치문서 | `docs/handoff/COWORK_KEYWORD_CATEGORY_RESEARCH_2026-08-05.md` | 🟢 대기 |

**의존성**: ①②③ 파일 겹침 0. ②는 sourcingOpportunityRecord 읽기만(①쓰기와 충돌X). ②는 #331 후속 7일보관에 의존(①완료로 충족). ③은 sourcing-recommender import되나 시그니처 유지 시 무해(리서치 단계).

**★ ① 소싱 레코드 누적정리(sourcing-recommend/route.ts, 전 상품 공통)**: #331 후속. GET을 최신date로 고쳐 화면 중복은 막았으나 POST가 오늘만 deleteMany해 과거 무한 누적(실측 8/3~8/6 두 테이블). → SOURCING_RETENTION_DAYS=7 상수 + POST 저장 직전 두 테이블 `date<오늘-7일` 정리(best-effort #82, #55 전상품). 

**검증(로컬 브라우저 + DB 실측)**: 7/25 테스트레코드 주입→POST스캔→7일이전 자동삭제 확인(cutoff 7/30). 8/6·8/5 보존(경계 정확). daily_recommendations 옛 누적분(8/3~8/5)도 함께 청소. GET 최신date 유지(#331). 테스트데이터 원복(두 테이블 8/6 5건). tsc0·build0.

**커밋·push**: `164a222`(1파일 22줄) push 완료. Vercel 배포 진행중.

**다음 세션 최우선**: ① 배포 READY 확인 → Code②·Cowork③ 결과 수신·검증(②실발송은 운영자 승인 하) → 각 결과 CURRENT/TRACKER 병합.

---

## rev106 — 트랙C-2 세그먼트 필터 + GET 날짜중복 근본수정 (2026-08-06 Desktop)

**운영자 방향 재확인**: 우선사항대로 최선안. 완료작업은 브라우저 실사용+DB 실측 검증 후 다음. 오류는 단건 수습 금지 — 전 상품 공통 시스템 관점. 좋은 개선안 능동 제안.

**레인 배분(#322 write set 기준)** — Desktop 순차(트랙C-1과 같은 위젯 파일):
| 단계 | write set | 의존성 | 처리 |
|---|---|---|---|
| C-2 설계 | SEGMENT_FILTER md(신규) | 없음 | Desktop 완료 |
| C-2 필터 | SourcingRecommendWidget.tsx | C-1(같은 파일) | Desktop 완료 |
| GET 근본수정 | route.ts | C-2 검증 중 발견 | Desktop 완료 |

**★ 트랙C-2 설계 — 요소 안 늘리고 기존 배지 강화(#274)**: 상단 요약 배지(⭐관심·🌱소싱중)에 "클릭=필터"를 얹어 표시+필터 겸용. 별도 필터 줄 안 만듦. 세그먼트: [전체][관심][소싱중], 단일선택, 카운트 0이면 칩 자동 숨김. 제외 접기는 필터와 독립(숨김 축). 필터 빈 목록 안내(무음 폴백 금지 #270).

**★★ GET 날짜 중복 근본수정(route.ts, 전 상품 공통)**: GET `date: { gte: todayStart }` + `take: 5`가 날짜 경계·타임존 차이로 어제/오늘 레코드 공존 시 두 날짜 rank=0끼리 섞여 같은 키워드 중복 반환(실측 "가습기" 8/5·8/6). 원인=POST가 오늘만 deleteMany, 과거(8/3~8/6) 누적. → "최신 date 하나"만 조회(findFirst date desc → 그 date로 findMany). 하루 1회 배치라 "최신 date=오늘 스캔". 타임존 경계 원천 차단. 신규 원칙 #331.

**검증(로컬 브라우저 실사용 + DB 실측)**:
- GET 중복 해소(가습기 1건, recordId 5개 정상, db-full).
- 세그먼트 필터 3종(전체5/관심2/소싱중1) 전환 정확 + 활성 칩 배경 강조.
- 빈목록 엣지(관심 전부 해제→안내+전체보기+칩 자동숨김).
- 필터-제외 독립(소싱중 필터에도 "제외 1건 보기" 하단 유지).
- 테스트데이터 원복(8/6 낙점 NULL + 과거누적 8/3~8/5 정리).

**검증**: tsc 0 · build 0(sourcing-recommend·status 라우트 빌드 포함).

**커밋·push**: `e2009e6`(3파일 177줄) push 완료. Vercel 배포 진행중.

**🌱 개선안(다음)**: POST가 과거 소싱 레코드를 안 지워 누적됨. "N일 이전 deleteMany" 자동정리 추가 제안(route.ts 또는 주간 크론).

**다음 세션 최우선**: ① e2009e6 배포 READY ② 프로덕션 세그먼트 필터 재확인 ③ 트랙C-3(주간 요약) 또는 레코드 누적 정리.

---

## rev105 — 트랙C-1 소싱 낙점 파이프라인 완결 (2026-08-05 Desktop)

**운영자 방향 재확인**: 기능은 잃지 않되 유료 SaaS처럼 직관적·간소화된 자동화. 완료 작업은 브라우저 실사용+DB 실측 검증 후 다음으로. 핑퐁/병렬 시 채팅 본문에 핵심 인계 메시지 정리.

**레인 배분(#322 write set 기준)** — 전부 Desktop 순차(같은 도메인 write set 물림):
| 단계 | write set | 의존성 | 처리 |
|---|---|---|---|
| C-1a 설계 | SOURCING_NAKJEOM_PIPELINE md(신규) | 없음 | Desktop 완료 |
| C-1b API | status/route.ts(신규)+route.ts GET+sourcing-recommender.ts | 스키마(존재) | Desktop 완료 |
| C-1c 훅 | useDashboardData.ts | C-1b | Desktop 완료 |
| C-1d 위젯 | SourcingRecommendWidget.tsx | C-1c | Desktop 완료 |

**★★ 설계 — "칸반형 낙점 파이프라인"**(운영자 확정): 스키마 3상태(interested/sourcing_started/skipped, null=미검토)를 버튼 나열이 아니라 단일 파이프라인으로. 발견→⭐관심→🌱소싱중, 별도로 ✕제외(접힘). **행동이 곧 상태**: 드로어 "소싱 시작" 클릭 시 자동 sourcing_started. 관심은 카드 1탭 토글. 유료 셀러툴(셀러오션·아이템스카우트) 패턴.

**★ 구현**:
- C-1b: `PATCH /api/sourcing-recommend/status`(스캔 POST와 분리 #316, recordId 우선·keyword+date 폴백, P2021/P2022 가드). GET db-full에 recordId·operatorStatus 추가. 타입 확장(sourcing-recommender.ts).
- C-1c: `setStatus` 액션(PATCH+낙관적 업데이트, GET 5분 캐시 stale 우회 revalidate:false, best-effort #82). 타입 확장(useDashboardData.ts).
- C-1d: 상단 요약배지(⭐관심 N·🌱소싱중 M, 0이면 숨김)·카드 ⭐관심 토글칩(stopPropagation)·관심 노란/소싱중 초록 강조·제외 버튼·드로어 자동낙점·제외 접기(되돌리기).

**★★ 근본원인 발견·수정 (신규 원칙 #330)**: 신규 route를 `create_file`로 만들었으나 그 도구는 별도 샌드박스에 써서 로컬 맥에 파일이 안 생김(PATCH 404). tsc·build는 런타임 fetch 문자열이라 파일 부재를 못 잡음. `Desktop Commander:write_file`로 로컬 맥 재생성해 해결. **신규 파일은 반드시 write_file 사용(create_file 금지)**. 기존 파일 edit_block은 로컬 맥에 정상 반영됨.

**검증(로컬 브라우저 실사용 + Supabase DB 실측)**:
- PATCH 낙점 ok:true. GET recordId·operatorStatus 정상 반환.
- ⭐관심 토글 → 요약배지 즉시 "관심 2" 낙관적 업데이트 + DB 저장 확인.
- 드로어 "소싱 시작" → DB에 청소기 sourcing_started 자동 저장 확인(핵심 자동화).
- 제외 → 메인목록서 사라짐 + 접기 토글 + 취소선/되돌리기.
- 테스트 데이터 원복: 2026-08-05 낙점상태 전부 NULL 복구(Supabase UPDATE, 방치 0).

**검증**: tsc 0 · build 0(/api/sourcing-recommend/status 라우트 빌드 포함).

**커밋·push**: `4a8f56d`(6파일 449줄) push 완료. Vercel 배포 BUILDING(다음 세션 READY 확인).

**다음 세션 최우선**: ① 4a8f56d 배포 READY 확인 ② 프로덕션 낙점 파이프라인 재확인 ③ 트랙C-2(상태별 필터/뱃지) 착수.

---

## rev104 — 웹 스캔/발송 분리 + 트랙B 소싱 상세 드로어 완결 + Cowork 리서치 인계 (2026-08-05 Desktop)

**운영자 방향 재확인**: 우선순위·의존성을 지켜 Desktop·Code·Cowork를 최대한 병렬로. 완료 작업은 브라우저 실사용 검증 후 다음으로. 오류는 전 상품 공통 시스템 관점으로.

**레인 배분(#322 write set 기준)**:
| 작업 | write set | 의존성 | 처리 |
|---|---|---|---|
| 웹 스캔/발송 분리 | SourcingRecommendWidget.tsx | 없음 | Desktop 완료 |
| 트랙B 드로어 | SourcingRecommendWidget.tsx | 트랙A(완료) | Desktop 완료(스캔분리와 같은 파일→순차) |
| Cowork 키워드 리서치 | 문서만 | 없음 | 문서 인계 준비(독립 병렬) |

**★ 웹 스캔/발송 분리**(커밋 `4489739`): 웹 "스캔 시작" 버튼이 `discord:true`로 POST해 누를 때마다 실제 Discord 발송되던 부수효과 → `discord:false`로 수정(화면 갱신만). route POST는 discord:false여도 DB 저장·데이터 반환 정상(sendToDiscord 분기만 스킵). 전수조사(#293): POST 호출처 2곳뿐(크론=정상, 위젯=수정). 브라우저 실증 `discordSent:false` 확인.

**★★ 트랙B 소싱 상세 드로어**(커밋 `a4efb79`): 카드=요약, 드로어=심화. 프리미엄 SaaS 우측 슬라이드(min(460px,92vw)). 구성 — 헤더(키워드+블루오션+경쟁+X), 핵심지표 그리드(검색량·카테고리·실측공급가), AI인사이트 전문, 도매매칭 전체목록(경고 이유 자세히 명시), 도매매/도매꾹 검색, 푸터 "이 키워드로 소싱 시작".
- **소싱 시작 배선 = 기존 경로 재사용(#62)**: 새 파라미터 안 만들고 `/products/new`가 이미 받는 `?prefillName=`(setProductName)으로 연결. 발굴→등록 재입력 0.
- **구현 중 JSX 구조 오류 즉시 발견·수정**: 드로어 버튼을 도매매칭 map 내부에 잘못 삽입 → 닫는 태그 5개 누락을 tsc로 발견, 확장 상세 블록 끝으로 재배치.
- **브라우저 실사용 엔드투엔드 검증(로컬)**: db-full 스캔(가습기 등)에서 드로어 열림(도매매칭 5건 전부 본품, 부속품 필터 화면 확증) → backdrop 닫힘 → "소싱 시작" → `/products/new?prefillName=가습기` → 상품명 "가습기" 자동 프리필 확인(input value 실측).

**★ Cowork 리서치 인계**(문서 `docs/handoff/COWORK_KEYWORD_CATEGORY_RESEARCH_2026-08-05.md`): "청소기→귀청소기" 동음 카테고리 혼입(부속품 필터로 못 잡는 별도 축) 리서치 스펙. 4개 방안 조사·SE05 제약 명시. 독립 병렬 안전.

**검증**: tsc 0 · build 0 · 로컬 브라우저 실사용 전 구간 · 프로덕션 스캔으로 부속품/초레드오션 필터 화면 확증(가습기 본품 3,500원, 청소기/공기청정기 48점).

**커밋·push**: `4489739`(스캔분리)·`a4efb79`(트랙B+Cowork문서) 모두 push 완료. Vercel 배포는 rate-limit로 최종 READY 미확인(다음 세션).

**다음 세션 최우선**: ① a4efb79 배포 READY 확인 ② 프로덕션 드로어 재확인 ③ 트랙C(operatorStatus 낙점 상태관리) 착수.

---

## rev103 — 아침 소싱봇 교체 확정 + 도매매칭 부속품·소모품 오염 근본수정 + 초레드오션 필터 (2026-08-05 Desktop)

**배경**: 대표님이 8/4 아침 Discord 알림 스크린샷 제공 — "이모지·배치는 마음에 드는데 문구 변경이 반영 안 됐다". 규명 결과 그 스크린샷은 **옛날 자사상품 추천**(`buildRecommendEmbed`)이었고, 대표님 의도는 "오늘의 추천 = 꼬띠 소싱 발굴봇"이어야 함.

**★ 규명 1 — 왜 8/4 아침엔 옛 알림이 왔나**: `0df6951`(아침 소싱봇 교체) 배포가 8/4 낮(아침 크론 08:00 이후)에 됐기 때문. 오늘 아침 크론은 옛 코드로 돌았고 교체는 그 뒤 배포됨. Vercel `list_deployments`로 `0df6951` state=READY 확정 → **내일(8/5) 아침부터 교체된 소싱봇 발송**. 지난 세션 커밋(`0df6951`)이 git 히스토리·프로덕션에 정상 반영돼 있음을 재확인(iterm 버퍼 stale로 잠깐 오판했으나 Vercel MCP로 확증).

**★★★ 규명 2 + 근본수정 — 도매매칭 부속품·소모품 오염**(커밋 `975565f`, 전 상품 공통): 교체된 소싱봇 dry-run 실측 중 발견. "가습기"→"가습기 청소솔" 170원, "제습기"→"습기제거제" 870원, "청소기"→"차량유리 걸레" 1,000원이 최저가로 대표 노출. 근본원인 = `wholesale-matcher` 필터가 "키워드 글자가 상품명에 포함되는가"만 봐서 부속품·소모품·호환용품이 전부 통과. #326(캐리어 90원)의 다른 얼굴 — priceOutlier(가격 이탈)로는 못 잡는 "상품 종류가 본품이 아닌" 케이스.

수정 3종(전 채널 정합 #293 — 디스코드+웹앱+DB 동시 반영):
1. 본품 판별기(`wholesale-matcher.ts`): `WholesaleProduct.accessoryRisk` 필드 신설. `ACCESSORY_SIGNAL_WORDS`(필터·브러쉬·커버·거치대·제거제·방향제·리필·호환·전용 등 범용 신호어, 특정 상품 하드코딩 아님). 키워드 자체가 부속품류면 스킵. 본품 우선 정렬(accessoryRisk=false 먼저→공급가 오름차순). 완전 배제 아님(부속품밖에 없으면 그거라도 노출 — 정보 손실 방지). searchDomeggookMarket top3 + matchWholesaleProducts 최종 정렬 양쪽 적용.
2. 초레드오션 감점(`sourcing-recommender.ts calcBlueOceanScore`): 월 10만건 초과 = 대기업 각축장 -20점(기존 3만+ +5 → 3만~10만 +3, 10만 초과 -20). 실측 효과 — 청소기(89,900)·공기청정기(67,400) 70점대→48점, 가습기·발마사지기(적정) 70점 유지.
3. 웹앱 반영(`useDashboardData.ts` SourcingWholesaleProduct + `SourcingRecommendWidget.tsx`): accessoryRisk 필드 추가, 도매매칭에 "⚠️ 다른상품?"(priceOutlier)/"⚠️ 부속품?"(accessoryRisk) 경고 배지.

**실증 검증(로컬 dry-run, 수정 전후 실측 대조)**:
- 수정 전: 가습기→청소솔 170원, 청소기→차량유리 걸레(문제 재현)
- 수정 후: 가습기→"우드패턴 가습기 미니가습기" 3,500원(본품!), 청소기→귀청소기 2,600원, 체중계→디지털 체중계 5,250원, 공기청정기→차량용 공기청정기 11,880원. accessoryRisk가 청소솔·필터를 정확히 후순위화.

**미해결(다음 개선 — 문서 기록)**: "청소기"→"귀청소기"처럼 키워드는 맞으나 카테고리가 다른 동음 케이스는 본품 필터로 못 잡음(키워드 확장 정밀화 과제).

**검증**: tsc 0 · build 0(grep error|failed 0건) · 로컬 dry-run 수정 전후 실측 대조 · Vercel 배포 상태 MCP 확인. dry-run만 사용(테스트 데이터 방치 없음).

**커밋 상태**: `975565f` 커밋 완료, **push 대기**(다음 세션 최우선). `0df6951`(아침 교체)·`9f1363c`(트랙A)는 이미 배포 READY.

**다음 세션 최우선**: ① `975565f` push → 배포 READY 확인 ② 운영자 승인 하 소싱봇 실발송(모바일 4섹션 + 부속품 필터 효과 최종 확인) ③ 트랙B(상세 드로어 UI) 착수.

---

## rev102 — 웹앱 소싱위젯 긴급버그 수정 + 시스템레벨 전수조사 + 심화화면 설계 (2026-08-04 Desktop)

**배경**: 대표님이 "Discord=간단, 웹앱=심화" 요청을 하며 `/growth` 페이지를 직접 열어봄 → 전 상품이 빨간 "0%" 마진 배지로 표시되는 것을 실측 발견.

**★★ 긴급 근본수정**(커밋 `05fa9ca`): 근본원인 = 이번 세션 Discord 쪽에서 폐기한 필드(avgPrice·estimatedMargin 등)를 웹 위젯(SourcingRecommendWidget.tsx)이 여전히 참조 — "전 채널 정합"(#293) 위반 사례. useDashboardData.ts·SourcingRecommendWidget.tsx에서 죽은 필드 전량 제거, supplyPriceRange·priceOutlier로 교체. tsc0·build0·로컬+프로덕션 브라우저 확인(빨간 0% 완전 소거, 콘솔에러 0).

**★ 시스템레벨 전수조사**: grep으로 동일 패턴(avgPrice·totalResults 등) 사용처 3개 더 발견(MarketAnalysisCard.tsx·CompetitionMonitorWidget.tsx·MarketTrendWidget.tsx) → 코드+프로덕션 브라우저(`/market`) 실측 결과 **전부 방어적 조건부 렌더링이 이미 있어 안전**(거짓값 노출 0, "0/2" 정직 표시 확인). 스캔 버튼은 죽은 API라 무의미하나 버그는 아님, 급하지 않음.

**★ 심화화면 설계 완료**(`docs/design/SOURCING_DEEP_DIVE_WEBAPP_2026-08-04.md`, 구현 대기): 3트랙 — A(daily_recommendations DB 스키마 확장, 선행필수) → B(상세 드로어 UI, 안1 권장) → C(실무자동화: 원클릭 소싱시작·낙점상태관리·주간요약, 대표님이 가장 강조). 부수발견: "스캔 시작" 버튼이 discord:true 고정이라 웹에서 눌러도 실제 Discord 발송됨 — 분리 필요.

**다음 세션 최우선**: 트랙A(DB스키마 확장)부터 착수 → daily 크론 저장로직 갱신 → 트랙B안1(드로어) 구현.

---

## rev101 — 소싱봇 모바일 레이아웃 재설계 옵션1(필드 압축) 구현 완료 (2026-08-04 Desktop, 커밋 `7907901`)

**사전 실측**: Discord 공식 문서·커뮤니티 가이드 웹서치로 확인 — embed는 클라이언트 렌더(desktop/mobile)에 따라 폭이 다르고, inline 필드도 화면폭에 따라 자동 세로 재배치됨. 설계문서(rev100에서 저장한 `docs/design/SOURCING_DISCORD_MOBILE_LAYOUT_2026-08-04.md`) §3-2의 "옵션2(inline 3분할)는 리스크 있음" 가정이 사실로 확인 → 옵션1(필드 압축)로 확정.

**구현**: AI 코멘트를 상품별 필드에서 제거해 description(aiSummary)에만 1회 노출. 상품별 필드를 "경쟁+검색량" 1줄 + "도매처+가격" 1줄, 총 2줄로 압축(이전 5~6줄). 도매처 표시 2건→1건이되, 최저가가 이종상품 의심(priceOutlier)이면 그 다음 정상가로 자동 폴백(정상품 정보 손실 방지 — 전부 outlier면 최저가로 재폴백). outlier 경고는 완전 생략하지 않고 축약형(":warning:다른상품일수있음")으로 유지.

**실증 검증(로컬 dry-run)**: 상품별 필드 5~6줄→2줄 축소 확인. 캐리어(최저가 90원=outlier)는 정상가 990원 폴백, 캠핑테이블(최저가 1,090원=outlier)도 정상가 8,290원 폴백 확인. AI코멘트 필드 완전 제거·description 단일 노출 확인.

**검증**: tsc 0 · build 0(grep error|failed 0건) · 로컬 dry-run 실증.

**다음 세션 최우선**: 프로덕션 배포 확인 → 프로덕션 curl 재검증 → (운영자 결정) 압축 레이아웃 실제 재발송으로 모바일 최종 확인 → `SOURCING_RECOMMEND_LIVE` 설정 여부 확인.

---

## rev100 — 소싱 추천 실발송 완료 + 이종상품 오염 방지 + 모바일 UX 1차 개선 (2026-08-04 Desktop)

**★★★ 소싱 추천 시스템 첫 실제 Discord 발송 완료(19:47 KST)**. 발송 직전 최종점검(embed 전문 curl 확인)에서 "캐리어" 검색결과에 90원짜리 이종상품("바퀴 커버 실리콘")이 최저가로 걸려 그대로 노출될 뻔한 것을 발견 → 운영자 승인 하에 즉시 하이브리드 수정(커밋 `0470e47`).

**이종상품 오염 방지(A+B 하이브리드)**:
- A. 상품명 키워드 필터: 도매처 상품명에 검색 키워드가 전혀 없는 완전 무관 상품 배제. 1차 구현에서 "캠핑테이블"↔도매처표기"캠핑 테이블" 띄어쓰기 차이로 정상 매칭 전량 소실되는 부작용을 실측 발견해 즉시 정규화(공백제거 비교) 로직으로 재수정.
- B. 가격 이상치 경고(`priceOutlier`): 필터 통과 후에도 남는 연관상품(중앙값 대비 5배 이상)은 배제 대신 경고 표시만 — 최종 판단은 운영자가 링크 확인 후 결정.
- 검증: 로컬 dry-run 2회(재현→1차수정 부작용 발견→2차수정 검증) + 프로덕션 curl 재검증(캐리어 90원·캠핑테이블 1,090원 둘 다 outlier 정확 플래그, 5/5 매칭 정상) + **실제 Discord 발송으로 최종 확인**.

**실발송**: `POST /api/sourcing-recommend {dryRun:false}` → `discordSent:true` 확인. 운영자가 실제 모바일 Discord로 확인(스크린샷 2건 제공) — 5건 정상 표시, 경고 정상 표시.

**★ 모바일 UX 개선(운영자 스크린샷 피드백, 커밋 `9734338`)**: AI 인사이트가 "캐리어는 경쟁이 높으니 여행가방·배낭을 대안으로 찾으라"고 조언하는데 바로 아래 필드에 정작 캐리어 도매처 링크가 나와 모순돼 보이는 문제 발견. 근본원인은 `generateAiInsight()` 프롬프트에 "도매처 링크가 이미 붙는다"는 컨텍스트가 없어 AI가 일반적 "다른 곳을 찾으라"류 조언을 생성한 것 — 프롬프트에 IMPORTANT CONTEXT 블록 추가해 도매처 링크 존재를 명시하고 "대안 찾기" 조언을 금지, 키워드별 구체적 실무팁(최소주문량·품질확인·가격협상)을 요청하도록 근본수정. 가격경고에도 이유("다른 상품일 수 있어요") 추가. 로컬 dry-run으로 5개 후보 전부 AI코멘트가 구체적 실무조언으로 전환됨을 확인, 모순 문구 0건.

**설계만 완료(구현 대기)**: 전체 레이아웃 재설계(순위·가격·경고 한눈에 보이도록 구조 변경) — `docs/design/SOURCING_DISCORD_MOBILE_LAYOUT_2026-08-04.md`에 옵션 1(필드압축)/2(inline 3분할)/3(요약+앱링크) 3안 및 권장 착수순서 저장. write set은 `buildSourcingRecommendEmbed()` 단일 함수라 병렬 안전.

**남은 절차**: `SOURCING_RECOMMEND_LIVE=true` Vercel 환경변수 설정 필요(daily 크론 자동발송 활성화용) — Claude 도구로 직접 설정 불가, 운영자 Vercel 대시보드 액션 필요.

**신규 발견 패턴(#325/#326 연장 후보)**: 전문검색 기반 매칭(도매처 API)은 이종상품 혼입이 구조적으로 발생 — 배제(필터)+경고(표시) 하이브리드가 안전한 기본 패턴. AI 생성 문구는 같은 메시지 내 다른 필드(도매처 링크 등)의 존재를 프롬프트에 명시하지 않으면 모순되는 조언을 만들 수 있음.

**다음 세션 최우선**: ①`9734338` 프로덕션 배포 확인 ②`SOURCING_RECOMMEND_LIVE` 설정 여부 확인 ③소싱봇 레이아웃 재설계 옵션1 착수.

---

## rev99 — main merge + 프로덕션 배포 + 브라우저 검증 완결, 신규 버그 발견·근본수정·재배포·재검증 (2026-08-04 Desktop)

**★★★ main merge + 프로덕션 배포 + 브라우저 실사용 검증 엔드투엔드 완결** (커밋 `bb57de6`, 이후 `e6accc1`).

**사전 안전검증**(merge 전): `main`에서 `git merge --no-commit --no-ff` dry-run → 충돌 0건 → tsc 0 → build 0(`/products/[id]/preview` 포함 전체 라우트 정상 빌드) → 커밋·push. Vercel 배포 로그 직접 확인(`Compiled successfully`→`36/36 static pages`→`Build Completed`) → `state: READY` 확정.

**프로덕션 브라우저 검증**(Chrome MCP, 실제 상품 2건 — 아이스틀·달항아리): 마스터-디테일 2단 레이아웃 정상, 영어 원문 0건, 판단표면 사투리 0건(97개 텍스트 노드 확인), API=DOM=fetch 3중 대조 정합.

**★★ 신규 발견 + 근본수정 — 검수화면 "이미지 경고" 배지 오표시** (커밋 `e6accc1`): 실제 경고가 3건인데 배지 텍스트는 항상 "이미지 경고 0"이라는 **정적 문자열 상수**를 표시하던 결함. 아이콘(불리언)은 정확한데 텍스트(카운트)만 고정값이었음. curl 원본·브라우저 fetch·DOM 3중 대조로 확정. `publish-preview-strings.ko.json`에 `imageCleanPrefix` 신설 + 조건부 렌더링으로 수정. grep 전수 확인 — 동일 패턴 이 화면 1곳에만 국한(확산 없음). tsc 0·build 0 → 재배포 → **프로덕션 재검증**: 아이스틀 "이미지 경고 3", 달항아리 "이미지 경고 1" 둘 다 API와 정확히 일치 확인.

**콘솔 에러 조사**: "message channel closed" 에러 6건 확인 → 웹서치로 원인 규명(Chrome 확장 프로그램 자체 통신 잡음, 앱과 무관) → network_requests로 앱 API 전부 200 확인해 재확정.

**신규 원칙 #325~#326 등재**: #325(정적 라벨 상수에 기본값 하드코딩 시 실제값 미반영 패턴) · #326(Chrome 확장 통신 잡음과 앱 결함 구분 기준).

**병렬작업 최종 상태**: 도매꾹API·음수마진·검수UI재설계·페르소나표면축·이미지경고배지 **5건 전부 push→merge→배포→프로덕션브라우저검증까지 엔드투엔드 완결**. 유일한 이월 항목은 4-Mode 추천시스템(SEASONAL_AHEAD) SE05 미정리 여부 확인.

**다음 세션 최우선**: `recommendation-runner.ts`의 `runFourModes()` 크론 연결 여부 확인(vercel.json) → 연결 안 돼있으면 방치 여부 운영자 확인, 연결돼있으면 SEASONAL_AHEAD 재설계 필요.

---

## rev98 — 음수마진 근본수정(C안) + 4-Mode 시스템 이슈 발견 + push 완료 (2026-08-04 Desktop)

**★ 음수마진 근본원인 규명·수정·검증 완결**(운영자 결정: C안 — 마진% 완전 폐기, 공급가 범위만 표시). 근본원인: 도매매칭은 키워드 전문검색이라 이종상품이 섞이는데(예: "텐트" 검색→캠핑 소품), `sourcing-recommender.ts`가 그중 최저가 1건으로 avgPrice를 역산해 전체 마진을 계산하던 게 이종상품 오염으로 마이너스 수백% 노출의 원인이었다. 문서: `docs/research/SOURCING_NEGATIVE_MARGIN_ROOT_CAUSE_2026-08-04.md`.

**수정 3파일**(커밋 `b39f2d7`): `wholesale-matcher.ts`(estimatedMargin·avgNaverPrice 전량 제거, 공급가 오름차순 정렬) · `sourcing-recommender.ts`(avgPrice 역산 블록→supplyPriceRange로 교체, Discord 문구 정직화) · `recommendation-runner.ts`(옛 시그니처 호출부 수정 + estimatedMargin 기반 정렬을 blueOceanScore로 안전 전환).

**Desktop 재검증**: tsc 0 · build 0(BUILD_EXIT:0, grep error/failed 0건) · dry-run 재실행 → **5/5 후보 전부 음수마진 완전 소멸**, 공급가 범위(예: 텐트 440원~6,000원) 정직 노출 확인. dev서버 kill·임시파일 삭제·git status clean 확인.

**★ 신규 발견(미착수)**: `recommendation-runner.ts`의 4-Mode 추천 시스템(SEASONAL_AHEAD 모드)이 SE05로 영구종료된 `analyzeCompetition()`을 여전히 호출 중 — 사실상 죽어있을 가능성. 크론 연결 여부부터 다음 세션에서 확인 필요(CURRENT.md §3).

**push 완료**: `62a5dcf..3365f8c..b39f2d7` feature 브랜치로 fast-forward push(main 영향 없음, Vercel 프리뷰 배포만 트리거). main merge는 운영자 결정 대기.

**다음 세션 최우선**: Vercel 프리뷰 READY 확인 → 운영자 main merge 결정 → merge 후 프로덕션 브라우저 검증 일괄 진행(검수재설계·페르소나·도매꾹수정·음수마진수정 4건 전부 대상) → 4-Mode 시스템 범위 확인.

---

## rev97 — 도매꾹 API 404 규명·수정·라이브검증 완결 + 신규 버그 3건 발견 (2026-08-04 Desktop)

**★ 도매꾹 API 404 — #324 원칙대로 공식문서 실측 후 완전 규명**: 도매꾹은 폐기 아님. `ver=4.5`가 `getItemList`엔 없는 버전(v4.0 구조전면개편, 현재 권장 4.1)이라 404였음. 실제 DB 키로 라이브 차등검증(구버전 재현 404 / 신버전 200+실상품 2172건·1657건). 근본원인 문서 저장: `docs/research/DOMEGGOOK_API_404_ROOT_CAUSE_2026-08-04.md`.

**Code 수정 완료**(`3365f8c`): `wholesale-matcher.ts` 전면 재작성 — ver=4.1+market파라미터화+평면스키마. `searchDomemae`(HTML스크래핑) 폐기 → 동일API `market=supply`로 대체. supply(도매매)1차→dome(도매꾹)2차 순서로 DOMAIN_FACTS 정합. tsc 0·build 0(Code).

**Desktop 재검증(git log·파일 실측 + dry-run 재실행)**: `git log`로 커밋 실재 확인, 파일 diff 직접 대조(스펙 일치). 로컬 dev 기동 → `POST /api/sourcing-recommend?dryRun=true` → **5/5 후보 전부 도매매칭 성공**(`wholesaleMatchFailures:0`, 캠핑테이블4·보조배터리5·텐트3·캐리어1·아이스박스3). rev96의 "5/5 전부 0건"에서 완전 반전. dev서버 kill·임시파일 삭제·git status clean 확인(원복 완결).

**★★ 신규 발견 — 별개 버그 3건**(도매꾹 이슈와 무관, 다음 세션 조사 대상):
1. 음수 마진 노출(텐트 -367%, 아이스박스 -61% 등) — `avgPrice`가 비정상적으로 낮은 게 원인 추정(텐트 평균가 3,143원). 마이너스 마진은 15% 필터 조건(`>=0 && <15`)을 안 거쳐 그대로 통과.
2. `totalResults:0`인데 `competitionLevel:MEDIUM/HIGH` 값이 채워짐 — 계산 근거 없는 값 의심.
3. `imageUrl`에 `?hash=...` 쿼리스트링 — 다운스트림(이미지저장) 영향 미확인.

**의미**: 도매매칭(공급처 발굴)은 완전 회생. 단 마진 계산 입력값 신뢰성 문제로 **디스코드 실발송은 2-1 해결 전까지 비권장**.

**다음 세션 최우선**: avgPrice 출처 추적(`sourcing-recommender.ts`/`keyword-competition/route.ts`) → 음수마진 근본수정 → 재검증. 이후 운영자 push 결정.

---

## rev96 — 3-A 소싱 회생 검증 완료 + 도매꾹 API 별개 이슈 발견 (2026-08-03 Desktop)

**★ 소싱 추천 3.5개월 만에 회생 확인(dry-run 실측)**: Code가 3-A(경쟁분석을 검색광고 경쟁지수로 대체)를 구현. Desktop 검증 결과 dry-run에서 **후보 5건 생성**(무선충전기 검색량22100 경쟁mid 블루오션70 / 모자 52200 mid 65 / 파우치 29770 high 55 / 선글라스 76200 high 50 / 크로스백 61680 high 50). competitionAnalysisFailures 0 · keywordStatFailures 0 · discordSent false. 이전(SE05로 즉시 실패 1.7초·후보 0건)과 대비해 9.4초 소요하며 정상 파이프라인 완주. tsc 0.

**미커밋 3파일(Code 3-A 작업분)**: `sourcing-recommender.ts`(analyzeCompetition 의존 제거, competition만으로 블루오션 산출) · `keyword-competition/route.ts`(silent catch 정리) · `wholesale-matcher.ts`(가격대 보완). 대응 설계 `NAVER_SHOPPING_API_SUNSET_RESPONSE.md`의 3-A와 일치.

**★★ 새 발견 — 도매꾹 API도 죽어있음(SE05와 별개)**: dry-run 후보 5건 전부 도매매칭 0건. DB 확인 결과 2026-07-09 소싱 기록도 supplier_id 전부 null → **도매매칭은 원래부터 0건이었음**(SE05와 무관한 기존 이슈). 도매꾹 키는 DB store_settings에 SET(32자). 직접 curl 테스트(node --env-file로 DB 키 추출 후 호출): `https://domeggook.com/ssl/api/?ver=4.5&mode=getItemList` → **HTTP 404 `UNKNOWN_SERVICE`("해당 오픈 API 서비스가 없습니다")**. 즉 도매꾹 getItemList OpenAPI도 죽어있다. SE05(네이버 쇼핑검색)와 유사한 별개의 외부 API 폐기/변경 이슈로 추정. #324 원칙대로 단정하지 않고 사실만 기록 — 도매꾹 공식 공지·API 문서 실측 필요(다음 세션).

**의미**: 소싱 후보 자체는 회생했으나, 후보에 붙는 "실제 도매 공급처·공급가·마진" 정보가 도매꾹 API death로 채워지지 않는다. 후보 발굴(검색량+경쟁도 기반)은 정상, 도매 실물 매칭은 별도 복구 필요.

**미커밋 Cowork P2**: `SEASON_CALENDAR_DATA_2026.md`(24이벤트, 키워드 실상품어 교체 완료) + `SEASON_CALENDAR_DESIGN.md` + `SEASON_KEYWORD_AUDIT.md`. 카테고리명·추상어 잔존 0건 재확인.

**다음 세션 최우선**: (1)도매꾹 API 404 원인 규명(공식 공지 실측) (2)3-A 코드 + P2 문서 전체 커밋 push (3)운영자 승인 후 실발송.



---

## rev — 씨앗심기 정보완전성 4건 (2026-08-11 Code)

**#1 원산지 미연동 근본수정**: `api/products/import/route.ts`가 naver_origin/originCode/
importer_name을 전혀 안 채우던 버그. 인계 문서의 "코드체계가 다를 수 있다" 우려를 코드
추적으로 검증한 결과 `Product.originCode`와 네이버 originAreaCode는 완전히 같은 코드표
(naver-origin-codes.ts, 518건)임을 확인 — 변환 없이 직접 매핑. 표에 없는 값은 저장 안 함.

**#3 권장 판매가 좌측 반영**: 이미 정상 작동(적용 버튼+배선 기존 존재) — 브라우저 실측으로
확인만, 코드 변경 없음.

**#4 즉시할인 인라인 배치**: MarginCalculator.tsx 판매가 컬럼에 즉시할인 토글+입력 인라인
배치(기존 별도 줄 → 관계 안 보이던 문제 해소).

**#2 부분 재연동**: 설계 문서만(NAVER_PARTIAL_SYNC_2026-08-11.md). 네이버 v2 PUT은 FULL
REPLACE 확정이라 부분 PUT 불가 — "변경 필드 감지+전체 재구성+PUT"으로 설계, 쓰기
파이프라인(`/api/naver/products/update`)은 이미 존재해 신규 인프라 거의 불요. 구현은
승인 후 별도 라운드.

**검증**: tsc 0 · build 0 · 브라우저 실측(로컬 dev, /products/new) — 마진계산·추천가 적용·
인라인 할인 레이아웃 전부 정상 확인.

결과 문서: `docs/handoff/CODE_SEED_PLANTING_IMPROVEMENTS_2026-08-11.md`


---

## rev — "네이버에도 반영" 부분재연동 실구현 (2026-08-11 Code)

설계(NAVER_PARTIAL_SYNC_2026-08-11.md) 승인 후 실구현. products/new/page.tsx에
18필드 화이트리스트(product-builder.ts 직독 확정) + dirty-field diff + "네이버에도
반영" 버튼 + dryRun 프리뷰 모달(변경 필드 강조/그대로 유지 안내/비가역 경고) +
confirm 실행 흐름(#46 기존 GO 게이트 재사용). 백엔드(/api/naver/products/update)는
실측 결과 변경 불필요 확정(curl dryRun 직접 호출로 정상 동작 확인).

부수 발견: Product.taxType(폼 저장 컬럼)과 buildNaverProductPayload가 실제로 읽는
naver_tax_type이 다른 컬럼 — 화이트리스트에서 taxType 제외해 오표시만 방지, 근본수정은
범위 밖(#340).

검증: tsc 0 · build 0 · 실 LINKED 상품(cmsk2387l...)으로 브라우저 dryRun 흐름 전체
실측(버튼 활성화→모달 diff 정확→취소). 지시대로 confirm:true 실행은 하지 않음.
테스트 데이터 원복 확인.

결과 문서: `docs/handoff/CODE_NAVER_PARTIAL_SYNC_RESULT_2026-08-11.md`

## rev124 — B1 배포갭 수동복구 + B4 크론상한/미배포 가설 기각 + B4-A 크론 수신계측 + db push 파괴사고 봉인가드 (2026-08-19~20, Code)

B1: Git 연동이 627960f 이후 조용히 끊겨 8일 미배포 확정(`vercel deploy --prod --yes`로 수동 복구, SHA 대조 완료). B4: `vercel cron ls`로 6개 크론 전부 등록 확인(개수상한 가설 기각) · `git log -S`로 sourcing-daily가 이미 여러 배포에 포함됐음 확인(미배포 가설 기각), 원인 미확정 상태로 정지. B4-A: CronInvocationLog + withCronLogging으로 6개 라우트 전부 수신 계측(#337 우회, 커밋 `105a95f`) — DB 테이블 생성은 승인 대기. 부수 발견(Desktop): schema.prisma가 프로덕션 DB보다 9테이블·21컬럼 뒤처져 있어 맨손 `db push`가 파괴적 DROP을 실행할 뻔함 — `scripts/db-push-guard.sh`(migrate diff 선검증) + `npm run db:push` 봉인 가드 추가.

## rev125 — 8렌즈 assignSourcingSlots 실배선(F3해소) + D-fix trend주입(황금·급상승 부활) + 명칭통일 (2026-08-27, Code)

**실배선(e4959a8)**: `sourcing-lenses.ts`(rev118에서 구현됐으나 어떤 cron/route도 호출하지 않던 죽은 코드, 로드맵1b 8렌즈 쿼터 배분 시스템)를 `assignSourcingSlots`에 처음 실배선. `classifySourcingLenses`·`allocateByLens`·`LENS_DAILY_QUOTA`로 판정·배분을 위임하고, 옛 `SlotType`(seasonal/trending/blue_ocean/niche/honeypot 5종)을 `SourcingLens` 7종(급상승/시즌선점/니치/블루오션/꿀통/황금/스테디)+레드오션 경고로 단일 권위 통일. `fetchCategoryTrendSignals()`도 이번에 처음 실제 호출(D1별 급상승/스테디 신호). 위젯(`SourcingRecommendWidget.tsx`)·훅(`useDashboardData.ts`)에 `lensMatches`/`redOceanWarning` 필드 배선해 🏆황금·📚스테디 배지를 그대로 렌더(판정 로직 재작성 없음).

**D-fix(9cf7f73)**: 실배선 직후 교차검증에서 결함 발견 — `assignSourcingSlots`가 `classifySourcingLenses`에 `trend: null`을 고정 주입하고 있었다. `computeCategoryScore`는 `trend`가 없으면 `seoScore`를 중립값(50)으로 고정 계산하므로, `HOT_SEO=60` 문턱을 요구하는 🏆황금·📈급상승(SEO 경로)이 절대 발화할 수 없는 죽은 렌즈였다. 수정: `category-trend-cache`의 `getCachedTrend`/`buildD1Key`로 후보군의 고유 D1 카테고리만 한 번에 프리페치(`Promise.all`, N+1 금지)해 실제 trend 값을 주입.

**검증**: tsc 0. 합성 입력 — trend:null(수정 전 재현) → seoScore=50·golden 미발화, 동일 입력에 실제 hot trend 주입 → seoScore=85·golden 발화. 프로덕션 `/growth` 소싱 추천 위젯에서 "스캔 시작" 실행 → `/api/sourcing-recommend` fresh scan(opportunityCount:10, trendSource:DataLab) → 실후보 "인테리어"가 🏆황금키워드+📚스테디셀러 배지로 실제 화면에 렌더됨을 스크린샷으로 확인(나머지 9건은 📚스테디셀러만 매칭, 정직한 결과 — 조작 아님).

**병합**: `feature/lens-unify`(9cf7f73) push → `origin/main` fast-forward 병합 → 로컬 main도 fast-forward. `scripts/verify-vercel-deploy.sh --wait`로 프로덕션이 `9cf7f73` 반영됨을 확인. 병합 완료된 `code-cli-docs-correction-f4105f` 워크트리·브랜치 정리(uncommitted 없음 확인 후 제거).

결과 문서: 세션 내 커밋 메시지(`e4959a8`, `9cf7f73`) 참조.

## rev126 — UCE-1~6 결정론적 카테고리 매칭 + Groq 모델 폐기 발견·교체 (2026-08-27, Code)

**배경**: `category/suggest`가 AI(Groq) 우선 → 실패 시 하드코딩 57건 FALLBACK_RULES라는
구조라 카탈로그 밖 상품(달항아리·수세미·우산꽂이 등)에서 자주 빈 결과. 마스터
`NAVER_CATEGORIES_FULL`(5,021건)은 정상인데 "제안 다리"가 병목이라는 실측 전제로 착수.

**UCE-1** (`src/lib/naver/category-deterministic-matcher.ts` 신규): 상품명을 마스터
5,021개 리프 전체와 직접 substring/synonym-split("A/B" 라벨 분리) 매칭 — AI 호출 0,
DB 조회 0, 순수함수. 형태소 토크나이저(`morpheme-tokenizer.ts`) 재사용해 d2 정합성
보너스만 추가. `category/suggest` 흐름을 캐시→**결정론적(신규,1순위)**→AI(실패시만)
순으로 재배선 — AI가 완전히 강등됨.

**UCE-2**: Groq 원문 응답 항상 로깅 + 실패사유 세분화(empty_response/
no_json_brackets/json_parse_error) + 마스터에서 뽑은 실제 카테고리 5건 few-shot
삽입(환각 방지). **조사 중 진짜 근본원인 발견**: `llama-3.3-70b-versatile`(및
sourcing-recommender.ts의 `llama-3.1-8b-instant`)이 Groq 카탈로그에서 완전히
제거됨(`GET /v1/models` 실측 확인, 404) — `usedAI:false`의 실제 원인은 코드가
아니라 죽은 모델명이었음. `groq.ts` GROQ_MODEL을 `openai/gpt-oss-120b`로 교체 +
`reasoning_effort:'low'` 추가(추론모델이라 이거 없으면 max_tokens를 내부 사고에
다 쓰고 빈 응답 반환 — 실측으로 확인). sourcing-recommender.ts의 중복 fetch도
공용 `callGroq()`로 통합. 실측: 한국어 설명 생성·카테고리 JSON 분류 둘 다 정상,
확신 없으면 정직하게 빈 배열 반환.

**UCE-3**: `FALLBACK_RULES`(57건 하드코딩) + `suggestFallback()` 완전 삭제 —
결정론적 매처가 마스터 전체(5,021건)를 커버하며 마스터 재생성 시 자동 최신화.

**UCE-4**: 3단계(결정론적+AI+Naver 페이지검증) 전부 실패한 상품만 `internalTags`
(기존 미사용 JSON 컬럼, 마이그레이션 불요)에 `category_confirm_needed` 마킹 →
`UploadReadinessWidget`에서 "카테고리 확인 필요"로 "카테고리 미선택"과 구분 노출,
성공 시 자가치유(플래그 제거). `/api/category/suggest`에 `productId` 선택 인자
추가, `products/new` 두 호출부에서 `edit` 쿼리파라미터로 threading.

**UCE-5**: `gen-naver-categories.py`가 XLS 파일명에서 날짜를 파싱해
`CATEGORY_MASTER_GENERATED_AT`/`CATEGORY_MASTER_SOURCE_FILE` 상수를 생성 파일에
자동 삽입(+ `categoryFullPath`가 재생성 시 유실되던 버그도 같이 수정 — 기존
"DO NOT EDIT MANUALLY" 파일에 손으로 추가돼 있던 함수였음). 신규 월간 크론
`/api/cron/category-master-check`(`vercel.json` `0 0 1 * *`)가 35일 경과 시
OPS_REPORT로 갱신 알림. **자동 다운로드는 구현하지 않음** — Naver 카테고리 XLS의
안전하게 검증된 fetch 가능 엔드포인트가 존재하지 않아(#82 추측 금지), 실측 없이
가정하지 않기로 결정.

**UCE-6**: `naver_categories` 테이블 실측 — 프로덕션 0행(never seeded) 확인.
유일한 앱 소비자 `auto-mapper.ts`(matchCategory)는 도달 불가능한 죽은코드 체인
(`NaverAutoFillForm.tsx`가 어떤 페이지에도 미마운트, 실측 grep 확인)이었고, 테이블이
비어있는 채 그 체인이 호출되면 `scores[0]` undefined로 크래시하는 잠재 결함도
발견. DDL(DROP TABLE)은 운영자 승인 필요 사안이라 실행하지 않고 `schema.prisma`에
실측 결과 문서화만. 죽은코드 체인 제거는 별도 세션으로 분리(`spawn_task`).

**배포 사고 1건**: `feature/universal-category-engine`→main 병합 직후
`verify-vercel-deploy.sh`가 "SHA 일치" OK를 보고했으나, 실제 프로덕션 런타임
로그(`vercel logs`)는 옛 코드의 경고 문구를 그대로 출력 — 재조사 결과
`vercel ls --json` 응답이 34KB 근처에서 파이프 버퍼 절단돼 첫 배포 항목의
`meta.githubCommitSha`를 못 읽었던 **조사 도구 쪽 오탐**으로 판명(git 연동
자체는 정상 — 재실측 시 SHA 정확히 일치). 결론적으로 배포는 정상 작동했고,
30분 내 두 번째 커밋(Groq 모델 수정)도 정상 자동배포됨.

**검증**: tsc 0 · `npm run build` 0. 프로덕션 실호출 20종(카탈로그10 + 카탈로그밖10:
달항아리·수세미·우산꽂이·도어스토퍼·빨래건조대 등) **전부 비어있지 않은 유효
leaf 카테고리 연결 확인**(`suggestions.length>0`, 20/20). `usedAI:false` 전건 —
결정론적 매처가 20건 전부를 AI 호출 없이 해결(비용 0 목표 달성).

결과 문서: 세션 내 커밋 메시지(`958dff6`, `33db7d3`) 참조.

## rev127 — 도달불가 크롤러 자동매핑 죽은코드 제거 + Groq 모델명 주석 정정 (2026-08-27, Code)

rev126 UCE-6 조사(naver_categories 0행) 중 발견한 도달 불가능 체인을 fresh grep
재확인 후 제거: `NaverAutoFillForm.tsx`(어떤 페이지에도 미마운트) →
`api/crawler/naver-auto-fill/route.ts`(유일 호출자가 위 컴포넌트) →
`auto-mapper.ts`(matchCategory가 naver_categories 0행 상태에서 호출되면
`scores[0]` undefined로 크래시하는 랜드마인). `types/crawler.ts`에서 이 체인
전용 타입(AutoMappingResult·NaverAutoFillRequest/Response·BatchAutoFillRequest/
Response) 제거, `CrawlResult`·`CrawledData`는 DomemaeCrawler.tsx·scraper.ts가
계속 사용해 유지. 같은 커밋에서 Groq 모델 교체(33db7d3) 이후 방치됐던 낡은 주석
5곳(naver-seo·aeo·category·kkotti·env-checker — 실제 코드는 `callGroq()`/
`GROQ_MODEL` 동적 참조라 기능 영향 없었음, 주석만 오기) 정정. `naver_categories`
Prisma 테이블/모델은 손대지 않음(운영자 승인 별건 유지). 검증: `.next` 스테일
타입 캐시 삭제 후 tsc 0 · `npm run build` 0 · 빌드 산출물에서 naver-auto-fill
라우트 소멸 확인. main fast-forward 병합, verify-vercel-deploy.sh --wait로
프로덕션 `f5cd72e` 반영 확인.

## rev128 — UCE-7 카테고리 결정론 매칭 명사중심 재설계 + 저신뢰 AI 교차확인 + rankByScore 정답오염 수정 (2026-08-27, Code)

설계: `docs/design/UCE7_MATCH_QUALITY_2026-08-27.md`(Desktop 실측 — 카탈로그
밖 12종 중 오분류5·빈손1, 정답률 58%). 구현 3단계, 전부 main fast-forward
병합 + `verify-vercel-deploy.sh --wait`로 프로덕션 반영 확인:

1. **`category-deterministic-matcher.ts` 명사중심 재설계**: `extractNouns`의
   말단(핵심)명사 ×3 가중 / 앞선 수식어 ×0.5 감가중으로 `termMatchScore`
   재설계("실리콘 주걱"에서 "실리콘"(수식어)이 아닌 "주걱"(핵심명사) 승리).
   공백으로 쪼개진 상품명이 압축형 리프명("칫솔살균기" 등)과도 매칭되도록
   `nounsCompact` 해시택 추가, 헤드노운이 리프 안에 포함되는 역방향 폴백
   (Tier3) 신설, 서비스/레슨성 d2(원데이클래스·예체능레슨 등, 여가/생활편의
   9종 전량) 물리상품 매칭 제외목록 신설. `MatchTier`(1=리프 정확매칭
   2=d3-only 3=역포함폴백 4=d2-only) 노출.
2. **`category/suggest/route.ts` 저신뢰 게이트**: 결정론 top이 Tier2/3만
   이거나 점수 임계 미달, 또는 2위 후보가 다른 d1에서 근소 차로 붙어있으면
   Groq 교차확인 호출 후 `usedAI:true` 승격. 고신뢰(Tier1+임계 이상)는 AI
   미호출 유지(비용0).
3. **★rankByScore 정답오염 수정(main 병합 직후 프로덕션 12/12 재검증 중
   발견)**: 결정론 매처가 정확히 고른 1순위를, 이후 `rankByScore()`가 SEO×ROI
   `totalScore`로 **전체 후보를 재정렬**하면서 트렌드 점수가 더 높은 엉뚱한
   카테고리로 뒤엎고 있었다 — "요가 매트"가 정확히 스포츠/레저>요가/필라테스
   >요가매트로 매칭됐는데도, 반려동물 카테고리 트렌드가 더 뜨겁다는 이유로
   응답·프론트(씨앗 심기) 최종 답이 생활/건강>반려동물>리빙용품>매트로
   뒤바뀜(#249 의도치 않은 부작용 — 캐시에는 정답이 저장되는데 사용자가 보는
   응답만 오염). 수정: 정확성 파이프라인이 고른 1순위(index 0)는 고정하고
   대안(index 1+)만 SEO×ROI로 재정렬.

**★캐시 오염 함정(재발 방지용 기록)**: `category_mappings`(name_hash 캐시)에
구코드 시절 저장된 오답 3건(칫솔 살균기·차량용 방향제·전동 칫솔)이 새 코드
배포 후에도 캐시 히트로 그대로 서빙됨 — 코드는 고쳤는데 캐시가 안 고쳐지면
반영 안 된 것과 동일. 프로덕션 DB에서 해당 name_hash 로우 직접 삭제 후
재계산시켜 해소(운영자 승인 하 Prisma 스크립트 실행). **일반화**: 학습형
캐시가 낀 로직을 고칠 때는 코드 재검증만으로 부족하고 **캐시를 실측**해야
한다(`cacheHit` 필드 확인 없이 응답만 보면 "고쳤는데 안 고쳐진 것"을
"고쳐졌다"로 오판한다).

**검증**: `npm run test:category-match` 14/14(오분류5 정확화·정상7
회귀0·서비스d2 제외 유닛) · tsc0 · 프로덕션 12종 전수 2라운드(캐시미스→캐시히트)
모두 12/12 정확 · Vercel MCP 런타임 로그 실측으로 `[category/suggest][groq-raw]`
호출이 스텐 빨대(저신뢰) + 빈손 테스트 2건에만 발생, 나머지 10건은 Groq
미호출 확인(비용통제 검증) · 프로덕션 씨앗 심기(`/products/new`) 브라우저
실렌더로 "실리콘 주걱"→조리기구>주걭(카테고리코드 50004780) 확인.

**정리**: 잔존 워크트리 3개 중 미커밋 없는 2개(`fervent-aryabhata-1f394a`·
`relaxed-panini-e4e3a9`, 둘 다 97778d2 — main의 조상이라 안전) 제거 + 로컬
브랜치 `-d` 삭제. `uce7-match-quality-572b90`은 현재 세션이 그 위에서
실행 중이라 자기 자신을 삭제할 수 없음 — fully merged 확인(HEAD가
origin/main의 조상)만 하고 다음 세션 정리로 인계.
