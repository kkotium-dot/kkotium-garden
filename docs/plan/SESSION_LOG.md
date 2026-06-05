## 2026-06-05 (32) ★ P0 명화 첫 발행 SUCCESS 기록 + Code 독립 3중 재검증 (Code turn)

baseline production 0d8793e(HEAD==origin==prod, Vercel 200). docs only·본 turn 비가역 0(발행은 직전 Desktop turn에 완료, 본 turn은 기록·검증만). 권위: Desktop register 실측 + Code Supabase 직독 독립 재검증.

**(0) 발행 SUCCESS(Desktop register, 3차 시도)**: POST /api/naver/products/register(경로 2, production curl, dryRun 없음) → HTTP 200·success=true·naverProductId 13564133057. 1차(원산지 400)·2차(태그 제한어+옵션 중복 400) 교정 후 3차 성공.

**(1) Code 독립 3중 재검증(#45 가짜 라벨 0 #46)**: (a) Product 행 직독 — status ACTIVE(DRAFT→ACTIVE 전이)·naverProductId 13564133057·originCode 0200037·updatedAt 2026-06-05 09:54:37. (b) product_events 직독 — type NAVER_REGISTERED·old_value DRAFT·new_value 13564133057·created_at 09:54:37.265 → register route 성공 경로(prisma.update + event create) 실행 확정. (c) 스토어프론트 smartstore.naver.com/kkotium/products/13564133057 — Desktop 발행 시점 403/24B, Code 재확인 429/23585B(bot/rate-block, 둘 다 404 아님 = 상품 실재 방증, 정직: 봇차단으로 본문 미파싱이라 노출은 간접 확인).

**(2) 발행 차단 4대 결함 교정 완료(누적)**: (1) 원산지 코드 선행 0 절삭 → 0200037 재생성+가드(turn 29) (2) sellerTags 제한어 필터(turn 30) (3) optionCombinations 규격 정합 optionName1~4=값·dedup(turn 30) (4) 엑셀 옵션 소스 정합 product_options 우선(turn 31). 4축 모두 production 실증 후 발행 성공.

**(3) 엑셀 일괄등록 백업경로 검증(Desktop 독립)**: /api/naver/excel 명화 옵션 5칸 — 옵션형태 조합형·옵션명 향·옵션값 '레몬유칼립,에이프릴 후레쉬,블랙체리'·옵션가 '0,0,0'·옵션 재고수량 '999,999,999' 채워짐, 88칸 회귀 0(turn 31 Code openpyxl 실측과 일치). API 발행 실패 시 백업경로 가용 확인.

검증: git diff = docs only(src/·prisma/ 0). 본 turn 비가역 0(발행은 직전 완료, 기록만·register/POST 0). 이모지 0(★ 허용)/사용자노출 한글 sentinel 0/가짜 라벨 0(#46, DB 직독으로 SUCCESS 단정). **다음**: (A) 둘째 상품(달항아리/아이스트레이) 발행 — 동일 엔진(4대 결함 교정 완료)이라 막힘 적을 것. (B) 명화 재질/색상 발행후 수정 API 보강(A안, 신상품 가점 24~48h 내). (C) imageCount 0 → additionalImages 집계 후속.

---

## 2026-06-05 (31) 엑셀 옵션 소스 불일치 근본 결함 교정 + 옵션 5칸 채워짐 실증 (Code turn)

baseline production 1c87fc0 → 코드 교정 push 17dd50f(verify exit 0). 발행 미접촉·비가역 0(register POST 0, DB mutate 0). 권위: Desktop 엑셀 실물 파싱 + Code openpyxl 직접 재실측.

**(0) 근본원인**: 명화 실물 엑셀(/api/naver/excel, 93칸) 파싱 — 원산지 0200037·상품명·카테고리 50003356·판매가 29000·재고 999·대표이미지(Cloudinary)·상세설명(Supabase)·브랜드/제조사/A/S/배송 전부 정상, ★ 옵션 5칸(옵션형태·옵션명·옵션값·옵션가·옵션재고) 전부 빈값. excel/route.ts buildOptionFields(p.optionType,p.optionName,p.options)가 Product 레거시 컬럼을 읽으나 명화 옵션(향 3종)은 product_options 테이블(API 발행 product-builder buildOptionInfo가 읽는 곳)에 저장됨 → 엑셀 엔진이 product_options 미독으로 옵션 누락. 엑셀↔API 발행 옵션 소스 불일치(crawl-option-mapper가 product_options엔 넣고 Product 컬럼 매핑 누락한 계열).

**(1) 작업1 — 엑셀 옵션 소스 정합(excel/route.ts)**: Prisma include에 product_options 추가(기존 supplier/shipping_templates만). buildOptionFields를 product_options 우선 소스로 교정 — buildFromProductOptions(po) 신설, 레거시 Product.options는 buildFromLegacy fallback. ★ API 발행과 동일 데이터 소스(product_options)를 읽게 해 두 경로 정합.

**(2) 작업2 — 엑셀 옵션 형식 변환(naverExcelJS 88칸 명세)**: product_options → 네이버 5칸. 단일축 조합형(향): optionType '조합형'·optionNames '향'·optionValues '레몬유칼립,에이프릴 후레쉬,블랙체리'(콤마)·optionPrices '0,0,0'·optionStocks '999,999,999'. 다축(>=2): 각 축 distinct 값 newline 그룹 구분, 가격/재고 first-group-only(excel-generator.ts:61~69 검증 명세). dedup + 빈 값 제거(API buildOptionInfo와 동일 방어).

**(3) 작업3 — 재검증(Code openpyxl 직접, #45 출력 단정)**: production 17dd50f /api/naver/excel 명화 실물 재생성(HTTP 200, 9838B, 93칸) → openpyxl 파싱: 옵션형태 '조합형'·옵션명 '향'·옵션값 '레몬유칼립,에이프릴 후레쉬,블랙체리'·옵션가 '0,0,0'·옵션 재고수량 '999,999,999'(전부 채워짐). 회귀 0: 상품명·카테고리 50003356·판매가 29000·재고 999·원산지 0200037(선행0)·대표이미지 Cloudinary·상세설명 Supabase img 불변.

검증: TSC 0/build OK. 엑셀 생성만(register POST 0·DB mutate 0). 비가역 0. 이모지 0(★ 허용)/한글 데이터 상수 허용/가짜 라벨 0(#46). 회귀 가드: 옵션 없는 단일상품은 5칸 빈값 유지(레거시 fallback {} 반환). **다음**: Desktop 엑셀 재검증(옵션 채워짐 교차확인) + API 3차 발행 — ★대표 재승인 후 실 register(비가역) → 3중 검증. 승인 전 register/POST 0.

---

## 2026-06-05 (30) register 400 2차 원인(sellerTags 제한어 + 옵션 조합 중복) 근본 교정 + dryRun 재GREEN (Code turn)

baseline production 0f604ed → 코드 교정 push f82e525(verify exit 0). 발행 미접촉·비가역 0(register POST 0, DB mutate 0). 권위: Desktop 라이브 실측(production register 400 응답 invalidInputs verbatim).

**(0) 근본원인(2차 register 400, 1차 원산지 교정은 통과)**: invalidInputs 2건 — (1) detailAttribute.seoInfo.sellerTags Restricted '태그 항목에 등록불가 단어(차량용방향제,디퓨저,차량방향제,자동차방향제) 포함' (2) detailAttribute.optionInfo.optionCombinations Duplicated '중복된 조합형 옵션이 있습니다 (향)'. DB 직독 결백: product_options 향 3종 값 distinct(레몬유칼립/에이프릴 후레쉬/블랙체리)·중복 0, keywords에 제한어 4개 포함. 결함은 빌더. dryRun 둘 다 미검출(거짓 초록, DEBT-13 계열 — 네이버 실 POST에서만 노출).

**(1) 작업1 — sellerTags 제한어 필터(buildSeoInfo)**: RESTRICTED_SELLER_TAGS 상수(관측된 4단어: 차량용방향제·디퓨저·차량방향제·자동차방향제) 신설. ★ exact match(trim 동등) — substring 금지(네이버가 '차량용디퓨저'는 허용했으므로 '디퓨저' substring 필터 시 정상 태그 오제거). 필터 후 0개면 sellerTags 필드 생략(seoInfo는 pageTitle/meta 유지, 빈 태그 배열 자체가 검증 실패 유발 방지). name/keywords 미접촉(동일 단어 허용). 정직 한계(#46): 제한어 전체 목록 네이버 비공개 → 주석에 'invalidInputs 누적 구조' 명문화.

**(2) 작업2 — optionCombinations 규격 교정(buildOptionInfo + NaverOptionItem)**: 공식 스키마 권위 확인(commerce-api #241 + WebSearch): optionCombinations[n].optionName1~4 = 각 축의 '값', 축 이름은 optionCombinationGroupNames.optionGroupName1~4에만. 기존 결함 — optionName1에 축이름('향')을 3행 동일 주입 + 존재하지 않는 optionValue1에 값 주입 → 네이버가 optionName1='향' 3행을 중복 판정. 교정: NaverOptionItem에서 optionValue1/2 제거·optionName2~4 추가, optionName1=값1·optionName2=값2. dedup 가드(optionName1+2 tuple Set, 빈 값 행 제거) 추가. optionCombinationGroupNames(축명)는 기존대로 정상.

**(3) 작업3 — dryRun 가시화(DEBT-13 완화)**: register route dryRun payloadPreview에 sellerTags(최종)·optionCombinationGroupNames·optionCombinationValues 노출. dryRun이 네이버 미POST라 못 잡는 한계는 남으나, 빌드 결과를 operator가 fact-check 가능(거짓 초록 축소).

**(4) 작업4 — dryRun 재검증(비가역 0)**: production f82e525 — 회선 200, dryRun canRegister=true, ★ sellerTags ['에어컨냄새제거','차량용디퓨저','명화'](제한어 4개 전부 제거·'차량용디퓨저' 정상 보존), optionGroupName1='향', optionValues ['레몬유칼립','에이프릴 후레쉬','블랙체리'](3 distinct·중복 0), originAreaCode 0200037 유지. ★ 여기서 중단 — 실 register는 대표 재승인 후.

검증: TSC 0/build OK. dryRun만(register POST 0·DB mutate 0). 비가역 0. 이모지 0(★ 허용)/제한어 상수=영어 변수명+한글 값 데이터/가짜 라벨 0(#46). ★ 정직: dryRun GREEN ≠ 발행 성공 — 네이버 미POST라 3차 숨은 invalidInput 가능성 잔존, 실 register가 최종 진실. **다음**: Desktop 재검증(dryRun + 실 register 위임) → ★대표 재승인 → 발행 → 3중 검증. 승인 전 register/POST 0.

---

## 2026-06-05 (29) 원산지 코드 선행 0 절삭 근본 결함 교정 — 해외 발행 차단 해제 + 명화 dryRun 재GREEN (Code turn)

baseline 시작 production 8f212fd → 작업1~3 코드 + 작업2 DB → push 63c912c(verify exit 0). ★ 비가역 경계: 작업2 DB UPDATE 1행만 가역(발행 미접촉, register POST 0). 작업1·3 코드 가역.

**(0) 근본원인 확정(Desktop 공식 xls 직독)**: 네이버 원산지코드.xls 519행 — 중국 0200037·미국 0204000·일본 0200036·국산 00. 해외 7자리 497개 전부 선행 0. naver-origin-codes.ts 'Auto-generated from XLS'가 코드를 숫자처리해 선행 0 절삭(00→0·0001→1·0200037→200037·키 충돌). 명화 DB originCode=200037(오염) 직송 → register 400 'originAreaCode NotValid'. = 모든 해외 소싱 상품 발행 차단 시스템 결함. 과거 turn 28 '200037 정상'은 로컬 손상 테이블끼리 대조한 오진 → 정정.

**(1) 작업1 — 로컬 원산지 테이블 근본 재생성(코드 가역)**: 원산지코드.xls(프로젝트 루트 존재, xlrd 설치 후 dtype=str 파싱) 권위로 naver-origin-codes.ts 전체 재생성 — 518건, 선행 0 보존(특수 2자리 4·시도 4자리 17·해외 7자리 497). cross-check: xls codes == origin-codes-full.ts codes(차집합 양방향 0), 중복 0. 헤더에 '선행 0 보존·숫자 변환 절대 금지' 경고(재발 방지). 추가 오염원 제거: codes.ts KKOTIUM_DEFAULTS.originCode '200037'→'0200037'(products/new·api/products 신규 상품 재오염 차단), products/new:1762 stale 주석 정정(#44, '200037 정상'→'0200037 정규'). codes.ts importer 로직 Number(code)>=200000 회귀 0(Number('0200037')=200037 유효).

**(2) 작업2 — 명화 DB originCode 교정(DB 가역)**: Product cmpnooli40001f0gveaxr8iim originCode 200037→0200037 UPDATE(가드 WHERE: originCode='200037' AND DRAFT AND naverProductId null → 1행). RETURNING 확인: originCode 0200037·status DRAFT·naverProductId null·naver_origin '중국' 불변(발행 미접촉).

**(3) 작업3 — 빌더 방어 가드(코드 가역)**: product-builder.ts resolveOriginAreaCode 신설 — 공식표(NAVER_ORIGIN_CODES 518) Set 대조, 존재 시 통과 / 선행 0 절삭 추정 시 복원(0+v·padStart 7/4/2) / 미해결 시 throw(빌드 거부). originAreaInfo.originAreaCode에 적용. dryRun도 buildNaverProductPayload 경유라 동일 검증 → 'dryRun 통과인데 register 400' 거짓 초록(DEBT-13) 차단. legacy /api/naver/register route(호출자 0)도 동일 가드.

**(4) 작업4 — dryRun 재검증(비가역 0)**: production 63c912c 대상 — 회선 GET /api/naver/addressbooks 200, dryRun POST success·canRegister=true·grade C·readiness 74, ★ payloadPreview.originAreaInfo.originAreaCode='0200037'(선행 0 복원 확인)·importer '상세페이지 참조'·content '중국'. name=naver_title·cat 50003356·salePrice 29000·옵션 3종. ★ 여기서 중단 — 실 register는 대표 재승인 후.

검증: 작업1·3 코드 TSC 0·build OK. 작업4 dryRun만(register POST 0). 비가역=작업2 DB 1행. 이모지 0(★ 허용)/한글 코드 리터럴=지역명 데이터 상수만/가짜 라벨 0(#46). **다음**: dryRun GREEN 보고 → ★대표 재승인 → 재 register(명화, 비가역) → 3중 검증. 승인 전 register/POST 0.

---

## 2026-06-05 (28) P0 명화 첫 발행 시도 → 네이버 400 원산지 코드 거부(발행 실패·DB 미변경) (Code turn)

baseline 시작 production f2ea274 → 작업1 docs 커밋·push 후 production 0996ebd(verify-vercel-deploy.sh --wait exit 0). 대표 명시 발행 GO 수신. ★ 작업2만 비가역 시도(register POST 1회) — 네이버 거부로 DB mutate 0.

**(1) 작업1 docs 커밋·push(발행과 분리)**: HANDOFF_publish_precheck_2026-06-05.md + 4종 추적 MD(PROGRESS/ROADMAP/SESSION_LOG27/TASK_BRIDGE §3-27) → 커밋 0996ebd(.commit-msg.tmp #17, docs only·src/·prisma/ 0) push. verify exit 0(production 0996ebd 반영).

**(2) 발행 직전 3축 재실측 GREEN**: 회선 GET /api/naver/addressbooks HTTP 200(release/return 주소록 존재) / dryRun POST success·canRegister=true(name=naver_title 35자·cat 50003356·salePrice 29000·statusType SALE·옵션 3종·missingFields 0, 경고 재질/색상 비차단 grade C readiness 74) / Supabase 직독 status DRAFT·naverProductId null. register 직전 1회 더 DRAFT·null 재확인.

**(3) ★ 실 register POST 1회(경로 2, production endpoint) → 발행 실패**: HTTP 400 BAD_REQUEST. 네이버 invalidInputs verbatim: originProduct.detailAttribute.originAreaInfo.originAreaCode type 'NotValid' message '원산지 상세코드 항목이 유효하지 않습니다'. payloadPreview representativeImage=shop-phinf(register 전 이미지 업로드는 성공, L2 변환 정상). naverProductId 미수신.

**(4) DB 미변경 검증(부분발행 0)**: register 실패 직후 Supabase 직독 — status DRAFT·naverProductId null·updatedAt 2026-06-03 09:18 불변. register 실패 경로(NaverApiError→502, prisma.update 미실행) 안전 설계 작동 확인. 상품 미생성. 이미지만 네이버 업로드(상품 미연결=발행 아님). 가짜 naverProductId/가짜 '등록 완료' 0(#46).

**(5) 근본원인 + 신규 DEBT-13 후보**: product-builder.ts:725 originCode 기본값 '0200037'(선행0·7자리)인데 명화 product.originCode='200037'(naver-origin-codes.ts:332 '중국' 동일, 선행0 없음)을 :770 originAreaInfo.originAreaCode로 그대로 전달 → 네이버 포맷 거부. 교정 가설: originAreaCode는 '0200037'(선행0) 포맷 필요. dryRun은 네이버 미POST라 이 불일치 미검출(거짓 초록, DEBT-12 동류) → DEBT-13(발행 게이트 원산지 코드 포맷 사각지대) 등재 후보. 본 turn은 즉시 중단 — 코드 교정/재발행은 대표 결정 후 별도 turn.

검증: 작업1 docs only(비가역 0). 작업2 register 1회 시도(비가역 경계=이 호출만), 네이버 거부로 DB mutate 0·상품 미생성. 이모지 0(★ 허용)/한글 sentinel 0/가짜 라벨 0(#46). **다음**: (A) originAreaCode 포맷 교정(200037→0200037 검증) → dryRun+회선 재실측 → ★대표 재승인 → 재 register. (B) 동시 재질/색상 보강 검토(현 비차단이나 가점). 승인 전 register/POST 0.

---

## 2026-06-05 (27) P0 발행 직전 실측 완료 + 발행 실행 경로 확정 (Code turn)

baseline production f2ea274(HEAD==origin/main, Vercel READY). 권위: docs/handoff/HANDOFF_publish_precheck_2026-06-05.md(#49 Desktop 산출 → Code 저장 위임, Filesystem MCP 행으로 Desktop write 불가). 점검 전용·비가역 0(발행 미접촉, 코드/DB mutate 0, register/POST 호출 0건).

**(1) 발행 직전 라이브 실측(Desktop 직독 = 최신 권위)**: 명화 cmpnooli40001f0gveaxr8iim status DRAFT·naverProductId null(미발행 확정·비가역 안전). name '선물 본품리필 가벼운 명화 송풍구 방향제'(원본) ≠ naver_title 35자(덮어쓰기 버그 없음). salePrice 29000/supplierPrice 14300(가격기반 실마진 50.7%). naverCategoryCode 50003356/originCode 200037(중국, 컬럼명 camelCase 주의). mainImage=Cloudinary(발행 대표 실사용)/detail_image_url=Supabase detail-S6. 이미지 생존 curl: 대표 HTTP 200 99224B·상세 HTTP 200 185670B(Adobe 만료 리스크 영구적재로 차단 확인). 옵션(product_options): COMBINATION ['향'] 3종 레몬유칼립/에이프릴 후레쉬/블랙체리 각 stock 999 ON_SALE. naver_material/color/size=null(dryRun 경고 2건 정체)·naver_as_info 완비·keywords 7종. crawl_logs 소스 0건 → 재질/색상 신뢰 근거 부재 → 추측 금지(#46), '상세참조' 유지. Vercel production f2ea274 READY(발행 로직 미접촉, 회선/dryRun f689625 실측값 유효).

**(2) 발행 준비 종합 — 3축+5대 점검 전부 통과·발행 차단 결함 0건**: 1축 DB/비가역 DRAFT·null / 2축 회선 200·L2 allShopPhinf=true / 3축 dryRun canRegister=true. 이미지 생존 200·200 / 옵션 향 3종 정상 / 상품명 정합 / margin 함정 재발 없음 / 재질·색상 null(근거 없어 비움이 정답).

**(3) ★ 발행 실행 경로(Desktop register 호출 불가 — 정직 #46)**: register는 NAVER_PROXY_URL/PROXY_SECRET 사용 = Vercel env + 대표 home 프록시 전용, Desktop MCP 부재. → 발행 실행 = (1) 앱 UI 발행 버튼, 또는 (2) Code 발행(권장: 발행 후 naverProductId+DB+노출 3중 검증). 하드룰: register/POST는 대표 명시 승인 없이 호출 0건. 실패=중단+정직 보고. 가짜 ID/완료 금지(#46). 발행 후 보강(A안): 재질/색상은 발행 후 실제 상품 확인 → 수정 API 보강(신상품 가점 24~48h 내), imageCount 0 → additionalImages 집계 후속 점검.

**(4) 4종 추적 MD 갱신 + 핸드오프 보존**: PROGRESS 헤더 + ROADMAP 헤더 + SESSION_LOG(27) + TASK_BRIDGE §3(27). 보존: HANDOFF_publish_precheck_2026-06-05.md git add(#49, Desktop 산출분 Code 저장 위임).

검증: git diff = docs only(src/·prisma/ 변경 0). 코드/DB mutate 0. 비가역 0(발행 미접촉, register/POST 0건). 이모지 0(MD 관례 ★ 허용)/사용자노출 한글 sentinel 0. **다음**: 대표 발행 GO 시 → 경로(앱 UI/Code) 택 → ★대표 명시 승인 → 실 register(POST, dryRun 없이, 비가역) → 응답+DB naverProductId+스마트스토어 노출 3중 검증 → 정직 보고. 승인 전 register/POST 호출 0.

---

## 2026-06-05 (26) Claude Design 슬롯 편입 + AEM 재연결 정정 + P0 발행 3축 GREEN 재확인 (Code turn)

baseline production 2f5d1e0(HEAD==origin/main, Vercel READY). 권위: docs/handoff/HANDOFF_claude_design_slot_aem_2026-06-05.md(#49 Desktop write_file 작성분). docs only·비가역 0(발행 미접촉, 코드/DB mutate 0).

**(1) #48 보강 — Claude Design 슬롯 편입(§1)**: PRINCIPLES_LEARNED.md #48 도구 라우팅에 신규 슬롯 추가 — 시안·의사결정·배너(내부용)=캔버스 시각화(Claude Design 류)/Canva. 발행 GO/NO-GO 의사결정 카드·둘째 상품 hero 시안 탐색·단발 이벤트 배너 전용. 판매 발행물 아님 → IP 면책 불요. 판매 자산은 여전히 Firefly-native 생성 + Figma 양산만(면책 경계 불변). 정직 범위(#46): 'Claude Design' 제품 자체는 세션 직접 구동 불가이나 같은 역할(캔버스 시각화/Canva MCP/Adobe MCP)이 세션에 생존 → 캔버스 기반 시각 산출을 파이프라인 정식 슬롯으로 승격.

**(2) #48 보강 — AEM 재연결 정정(§2, #44 stale-fact)**: 기존 'AEM MCP / Adobe Marketing Agent MCP: 엔터프라이즈 마케팅 운영용 — 1인 솔로 셀러 무관 → 사용 안 함' → 'AEM MCP: 연결 유지(2026-06-05 대표 재연결), 단 현재 1인 셀러 워크플로우 미해당 — 향후 멀티채널 확장(자사몰 등) 시 활용. Adobe Marketing Agent MCP: 동일(연결 유지·현재 미해당)'. 대표가 만료 연결 재연결 → 코드 상태와 문구 정합. 억지 편입 금지(정직 평가 #46): AEM은 엔터프라이즈 CMS 운영 도구로 현재 1인 셀러 호출 표면 없음.

**(3) P0 발행 3축 GREEN 재확인(라이브, Desktop 직독)**: 직전 turn(316f1f2/f689625) 확정 3축 그대로 유효 — 1축 회선 GET 200(/api/naver/addressbooks 토큰 생존) / 2축 L2 imageProbe allShopPhinf=true(대표 Cloudinary·상세 Supabase·공지 전부 shop-phinf) / 3축 dryRun canRegister=true(17필드+옵션 향3종 COMBINATION+ETC 9키, 경고 2 재질·색상 비차단). 명화 페이로드: salePrice 29000/supplierPrice 14300(실마진 50.7%)/naverCategoryCode 50003356/naver_title 35자/originCode 200037(중국)/status DRAFT·naverProductId null. 하드룰 불변: 네이버 register/POST는 대표 명시 승인 없이 호출 0.

**(4) 5종 MD 갱신**: PRINCIPLES_LEARNED(#48 보강) + PROGRESS 헤더 + ROADMAP 헤더 + SESSION_LOG(26) + TASK_BRIDGE §3(26). **보존**: HANDOFF_claude_design_slot_aem_2026-06-05.md git add(#49 Desktop write_file 작성분).

검증: git diff = docs only(src/·prisma/ 변경 0). 코드/DB mutate 0. 비가역 0(발행 미접촉). 이모지 0(MD 관례 ★ 허용)/사용자노출 한글 sentinel 0. **다음**: Desktop 새 채팅 — (A) P0 명화 첫 발행(발행 직전 실측 DRAFT·dryRun·회선 → ★대표 명시 승인 → 실 register, 비가역) / (B) 둘째 상품 hero 시안 캔버스 슬롯 첫 본격 활용(발행 후).

---

## 2026-06-04 (25) 작업원칙 #49 등재 + P0 발행 트랙 인계 반영 (Code turn)

baseline production f689625(HEAD==origin/main). 권위: docs/handoff/HANDOFF_principle49_publish_handoff_2026-06-04.md §3. docs only·비가역 0(발행 미접촉).

**작업원칙 #49 등재(§3-1)**: PRINCIPLES_LEARNED.md에 #49 본문 추가 — Desktop → Code 인계 시 핸드오프 MD를 docs/handoff/에 Filesystem:write_file로 직접 작성(대표 다운/업로드 0), Code가 git add/commit 보존. 제약(불변): 큰 추적 MD 5종 + PRINCIPLES 등 누적형 부분편집은 여전히 Code Python full-overwrite(#29b). 실증 근거: Desktop이 한글 핸드오프 write_file 후 read 재검증 — 한글·특수문자(·★→)·따옴표 깨짐 0.

**TASK_BRIDGE 반영(§3-2)**: §1 역할표 '할 수 없는 것' Desktop 셀 정정(핸드오프 MD는 #49 예외로 write 허용) + '핸드오프 인계 (#49)' 행 신설. §8에 #49 참조 블록(§9 앞) 추가. 큰 추적 MD/코드 부분편집은 Code 전담 유지 — #49와 #29b 모순 0(핸드오프=일회성 overwrite만 Desktop 허용).

**5종 MD 헤더/§3 갱신(§3-3)**: PROGRESS 헤더 + ROADMAP 헤더 + SESSION_LOG(25) + TASK_BRIDGE §3(25) + PRINCIPLES_LEARNED(#49). Desktop 세션 내용 기록: imageProbe production f689625 Vercel MCP 교차검증 READY(Code 보고 #45 일치), P0 3축 GREEN(회선 200·L2 allShopPhinf=true·dryRun canRegister=true) 발행 준비 완료, 디자인 파이프라인 현황(빌더·명화 풀세트·#48 라우팅 완성 / Figma 양산 STEP2는 발행 후 둘째 상품 / Claude Design 미활용). ★ CLAUDE.md quick-index는 미접촉 — 기존 인덱스가 #45까지만(#46~#48 누락 기존 상태)이라 #49 단독 추가는 부정합, 인덱스 backfill은 별도 소작업으로 분리(사용자 보고).

**정리(§3-4)**: docs/handoff/_DESKTOP_WRITE_TEST_2026-06-04.md(실증용 임시, 159B, 미추적) rm 제거. **보존(§3-5)**: HANDOFF_principle49_publish_handoff_2026-06-04.md는 Desktop이 write_file로 직접 작성한 상태(#49 첫 적용) → Code가 git add 보존.

검증: git diff = docs/plan 5개 + handoff 1개(신규 추적). 코드/DB mutate 0. 이모지(MD 관례 ⭐★ 허용) / 사용자노출 오타·sentinel 0. **다음**: Desktop 새 채팅 P0 명화 첫 발행 — 발행 직전 실측(DRAFT·dryRun·회선 재확인) + ★대표 명시 승인 후에만 실 register(비가역). register/POST 호출 0 유지.

---

## 2026-06-04 (24) imageProbe 검증 모드 추가 + STEP 2 L2 이미지 변환 실증 (Code turn)

baseline production e2353d4 → 316f1f2. 권위: HANDOFF_imageProbe_mode_2026-06-04.md. 비가역 0(register POST 0, DB mutate 0).

**패치(register/route.ts 단일, 가산식)**: (1) body 구조분해 imageProbe?: boolean 추가. (2) payload 빌드 직후·register(8단계) 직전 imageProbe 분기 삽입 — 7-img/7-img-notice 이미지 업로드(gallery/detail/notice → shop-phinf 치환)는 실행하되 상품 register(naverRequest POST)는 호출 안 함. allShopPhinf(rep+detail+optional 전부 shop-phinf 여부) + sourceUrls/convertedUrls 반환. 회귀 가드: imageProbe 미전달 시 분기 건너뜀 → 발행/dryRun 흐름 100% 불변. TSC 0 / build OK / 이모지 0 / git diff 단일 파일 / 엔진(publish-readiness.ts)·관제탑 위젯 diff 0.

**STEP 2 실증(production curl, 배포 316f1f2 success 확인 후)**: imageProbe=true → success=true, **allShopPhinf=true**, 에러 0. sourceUrls: main=Cloudinary(res.cloudinary.com/.../main-hwabo-4set.jpg) / detail=Supabase(detail-S6) / additionalCount 0. convertedUrls: representativeImage=shop-phinf / detailImageNaver=shop-phinf / 공지 상단·하단=shop-phinf. → Cloudinary main 생존(401 차단 이력에도 fetch 성공)+업로드 + Supabase detail 업로드 + 회선 + L2 코드 = 전 경로 동시 실증. 발행 시 이미지 400 불가 확정.

**★ 이미지 도메인 진실 정정(#45 — Desktop DB 직독)**: 명화 이미지 3컬럼 — mainImage=Cloudinary(★발행 대표이미지 실사용, register의 supaMain=product.mainImage) / main_image_url=Supabase thumb-clean(미사용 레거시) / detail_image_url=Supabase detail-S6(상세 소스) / additionalImages=null. 직전 SESSION_LOG(23) 'main=Cloudinary'는 옳았고, 그 이전 HANDOFF_publish_track §1 'main=Supabase'는 틀린 컬럼(main_image_url) 본 것 — 본 turn에서 컬럼 3종 진실 확정.

**분기 판정(핸드오프 §4)**: allShopPhinf=true → **발행 준비 완료**. 회선(STEP 1 200)·dryRun(STEP 3 canRegister=true)·L2(STEP 2 allShopPhinf=true) 3축 전부 통과. 남은 단계 = 대표 명시 승인 후 실 register(비가역). register/POST 호출 0 유지. 핸드오프 docs/handoff/ 보존(133줄). 배포 메모: verify-vercel-deploy.sh --wait가 180초 윈도우 내 미완(빌드 지연)으로 exit 1 했으나 gh api 직조회 결과 316f1f2 state=success 확인 — webhook 정상(오탐).

---

## 2026-06-04 (23) P0 첫 발행 회선 + L2 이미지 변환 검증 (Code turn, 검증 전용)

baseline production 17e0ee2, main(HEAD==origin/main). 권위: HANDOFF_p0_publish_line_verify_2026-06-04.md. 전부 비가역 0(register/POST 호출 0).

**기구현 확정(중복금지)**: 코드 직독으로 P-1/P-2/L3 완성 확인 — uploadImagesToNaver() (src/lib/naver/api-client.ts:498, proxy action 'uploadImages' :519, 실패 throw), register route(src/app/api/naver/products/register/route.ts) L2 배선(import :8, 갤러리 :302 / 상세 :305 / 공지 :346 uploadImagesToNaver 호출 → shop-phinf 치환), L3 안전핀(업로드 실패 catch → 502 + '발행 중단 (DRAFT 유지)' :312~363, #46), dryRun은 Supabase URL 빌드·업로드 0(:213~279). → 직전 HANDOFF_publish_track의 P-1/P-2 '구현 필요' 지시는 중복(이미 완성) — 신규 구현 0.

**STEP 1 회선(production GET, 읽기전용)**: /api/naver/addressbooks HTTP 200 — keys success/releaseAddresses/returnAddresses/defaults/synced/diagnostics, diagnostics release·return None(에러 0). production→proxy→네이버 GET 회선 + 토큰 생존 실증.

**STEP 2 L2 실증 — ★ Code 실행 불가(정직 보고 #46)**: NAVER_PROXY_URL / PROXY_SECRET가 로컬 .env / .env.local 어디에도 부재(grep 0). 코드는 process.env.NAVER_PROXY_URL/PROXY_SECRET 사용 = Vercel production env + 대표 home Tailscale proxy 전용. 따라서 proxy action:uploadImages end-to-end(명화 main→shop-phinf URL) 실증은 **Desktop/대표 환경 위임**(#41 역할 분리). STEP 1이 GET 회선은 입증했으나 이미지 업로드 POST 경로는 미검증.

**STEP 3 dryRun(네이버 호출 0, DB mutate 0)**: success=true, validation.canRegister=true, attributeGrade C(31)/readinessGrade B(74), errors 0, warnings 2(필수속성 재질·색상 누락 — 차단 아님). payloadPreview: leafCategoryId 50003356 / name(naver_title) / salePrice 29000 / optionCombinationCount 3 / originAreaInfo(200037·중국·importer '상세페이지 참조') / afterServiceInfo(010-3227-4805) / taxType TAX / minorPurchasable / productInfoProvidedNotice type ETC + etcKeys 9(returnCostReason·noRefundReason·qualityAssuranceStandard·compensationProcedure·troubleShootingContents·itemName·modelName·manufacturer·customerServicePhoneNumber) / claimDeliveryInfo(shippingAddressId 106914714 / returnAddressId 106914715). ★ 이미지 도메인 실측 정정(#45 — 라이브 우선): representativeImage(main)=Cloudinary(res.cloudinary.com/.../main-hwabo-4set.jpg), imagesToUpload.detailImage + detailContent 3장=Supabase, shop-phinf 0건(dryRun 미업로드 정상, 실 register 시 L2 치환). 핸드오프 §1의 'main=Supabase' 전제는 일부 정정(main은 Cloudinary). 둘 다 비-shop-phinf라 L2 변환 필요 = DEBT-12 라이브 재확인.

**분기 판정(핸드오프 §3)**: STEP 1 200 / STEP 2 미검증(Desktop 위임) / STEP 3 정상 → **발행 준비 단정 불가**. STEP 2(Desktop proxy uploadImages 실증) 통과가 GO 선결. 비가역 0(register/POST 0, DB mutate 0). 핸드오프 docs/handoff/ 보존. **다음**: Desktop STEP 2 실증 → 통과 시 대표 명시 승인 → 실 register(명화 우선).

---

## 2026-06-04 (22) 발행 관제탑 STEP D·E 검증 완결 + DEBT-12 등재 (Code turn)

baseline cb5151d (HEAD==origin/main, production READY). docs only — 코드/DB mutate 0. 권위: wrapup 지시 + HANDOFF_publish_track_2026-06-04.md.

**STEP D 검증(Desktop 실측)**: preview(34edf7) /dashboard 6/6 전수 통과 — 관제탑 SECTION 2 최상단 노출 / 신호등 발행가능 2·보완 0·불가 1 정답지 일치 / 명화 마진칩 없음·달항아리 마진 23% 경고칩 / 체크리스트 14항목 전부 한글(코드값 노출 0) / 색대비+Lucide 아이콘 병기 / 모바일 390px 오버플로 0 / SD-01 아랍어 푸터 보존.

**STEP E 머지 교차검증**: Vercel e915b0a(머지)·cb5151d(docs) 둘 다 verify-vercel-deploy.sh --wait exit 0 READY. production 라이브 API #45 실측: /api/products/publish-readiness 3건 — 명화(29000/14300=50.7%) GREEN 무경고 / 달항아리(27200/20900=23.2%) GREEN+마진칩 / 아이스트레이(13900/7980=42.6%) RED. computeMarginPct 가격기반 정합 실증. 엔진 publish-readiness.ts 미접촉 재확인. **발행 관제탑 STEP A~E 완전 종료.**

**DEBT-12 등재(게이트 사각지대)**: publish-readiness.ts 이미지 검사가 isNonEmptyString + https:// 시작 여부까지만 봐서 Supabase 공개 URL을 GREEN 통과 → 네이버 커머스 API는 shop-phinf.pstatic.net URL만 수용(POST /external/v1/product-images/upload 선행 필수) → 거짓 초록. 명화 main/detail_image_url 둘 다 supabase.co. 해결책=HANDOFF_publish_track §1 하이브리드(L1 위젯 배지 GREEN 유지+자동변환 안내 / L2 발행 route Supabase→shop-phinf 자동 업로드+DB 멱등 되쓰기 / L3 변환 실패 시 하드 스톱+정직 에러 #46). DB UPDATE 아님, 발행 route 수술.

**산출물**: TECH_DEBT.md DEBT-12 + docs/handoff/HANDOFF_publish_track_2026-06-04.md(Desktop 산출 verbatim cp, 113줄). 비가역 0(발행 API 호출 0, DB mutate 0). **다음**: P0 첫 발행 트랙 분리 — STEP P-1(네이버 이미지 업로드 어댑터)~P-4(발행 직전 실측+대표 승인), 명화 우선.

---

## 2026-06-04 (21) 발행 관제탑 STEP E — main 머지 + production 반영 (Code turn)

baseline: feature/publish-control-tower 69640bc(STEP C), main 64fe565. 권위: STEP E 지시 + Desktop STEP D 실측 보고.

**Desktop STEP D 실측 통과(머지 근거)**: preview(34edf7) /dashboard 6/6 전수 — (1)관제탑 SECTION 2 최상단 노출 (2)신호등 발행가능 2·보완 0·불가 1 정답지 일치 (3)명화 마진칩 없음·달항아리 마진 23% 경고칩 (4)체크리스트 14항목 전부 한글(코드값 노출 0) (5)색대비+Lucide 아이콘 병기 (6)모바일 390px 오버플로 0. SD-01 아랍어 푸터 보존.

**머지**: git checkout main → git merge --no-ff feature/publish-control-tower(e915b0a, repo 컨벤션=merge commit) → git push origin main. 11 files(코드 6: 2 routes·page.tsx·widget·load-publish-readiness·i18n json + docs 5). 엔진 publish-readiness.ts 변경파일 목록 부재 = 미접촉 재확인.

**Vercel 검증(#36)**: verify-vercel-deploy.sh --wait exit 0 — production e915b0a 갱신 확인(github-deployments path). **production fact-check(#45)**: /dashboard HTTP 200 + 일괄 API(/api/products/publish-readiness?status=DRAFT) 3건 — 명화(sale 29000/sup 14300=50.7%) ready=true GREEN 무경고 / 달항아리(27200/20900=23.2%) ready=true GREEN+마진칩 / 아이스트레이(13900/7980=42.6%) ready=false RED. 가격기반 computeMarginPct 정합 실증.

비가역 0: 발행 API 호출 0(이미지 변환 미완=별건), DB mutate 0. 5 MD §3 갱신. **다음**: P0 첫 상품 발행 트랙 분리(이미지 변환 선결 → 명화 우선, 대표 명시 승인). 발행 관제탑 전 STEP(A~E) 완료.

---

## 2026-06-04 (20) 발행 관제탑 STEP C 대시보드 마운트 + 마진 정합 (Code turn)

baseline af38158, feature/publish-control-tower. 권위: HANDOFF §2 STEP C + STEP_C(v2) Desktop 문서.

**C-1 마운트**: src/app/dashboard/page.tsx — PublishControlTowerWidget import 1줄 + SECTION 2(받은편지함, CollapsibleSection inbox) 최상단 LowStockAlertWidget 위에 마운트(가산식). 기존 위젯(LowStock/ConfirmationReminder/DailyPlan 등) 전부 보존 grep 확인.

**C-2 마진 표시 정합**: PublishControlTowerWidget.tsx — computeMarginPct(salePrice, supplierPrice) 헬퍼 추가. margin DB 컬럼이 상품별 단위 혼재(명화 배수 2.03 / 달항아리·아이스트레이 퍼센트 23.16·42.59)라 신뢰 불가 → 가격으로 직접 마진율 계산. ProductCard의 marginPct 산출부를 컬럼값 Math.round(item.margin) → computeMarginPct(item.salePrice, item.supplierPrice)로 교체. 결과: 명화 51%(무경고)/달항아리 23%(경고칩)/아이스트레이 43%(무경고). publishReady 로직 무관(엔진 margin>0만 요구) → 발행 판정 불변, 표시칩만 정합.

★ margin DB 교정 금지 준수: 명화 2.03은 오염 아님 — 진단 등급 엔진(grading.ts margin>=5→L4)이 배수를 요구해 2026-05-27 의도적으로 맞춘 값. 되돌리면 가짜 L4 재파손. Supabase mutate 0.

검증: git diff 정확히 2개 파일(dashboard/page.tsx +3줄, PublishControlTowerWidget.tsx 헬퍼+교체). 엔진 git diff 0. TSC 0 / npm run build exit 0 / 이모지 0 / 비가역 0(DB mutate 0, 발행 미접촉). 커밋 50ee308 + push. main 머지 금지(Desktop이 preview STEP D 실측 통과 후 결정).

---

## 2026-06-04 (19) 발행 관제탑 STEP A·B 구현 (Code turn)

baseline 64fe565, feature/publish-control-tower(신규, main 미접촉 — 대표 승인). 권위: HANDOFF_publish_control_tower_2026-06-04.md + STEP_A/STEP_B Desktop 완성코드.

**STEP A — 일괄 판정 API + 공통함수 추출 (515e82f)**: src/lib/automation/load-publish-readiness.ts 신설. loadAndEvaluateProducts(ids[]) = Product findMany 1회 + Diagnosis findMany(productId IN) 1회→Map(N+1 가드) → buildInput→evaluatePublishReadiness 단일 소스. listDraftProductIds(limit)=DRAFT·naverProductId null 최신순. 단건 route(/api/products/[id]/publish-readiness) 를 공통함수 호출로 리팩터 — 응답 {ok,...result} 형태 불변. 회귀 리스크 점검: 구 route는 diagnosis row 존재 시 conceptTone=null 전달, 신 route는 undefined 전달 → mapCategoryToTone(conceptTone: ...|null|undefined) 가 ?.·?? 로 null/undefined 동일 처리 확인 → tone 경로 회귀 0. 신규 일괄 route /api/products/publish-readiness(GET ?status=DRAFT&limit=50, MAX 100): 신호등 필드 + 마진/판매가/매입가 display extras. PRODUCT_SELECT main_image_url 중복 키 1개로 정리 + Prisma.ProductGetPayload 타입으로 교체(satisfies Prisma.ProductSelect). schema 확인: margin Float / salePrice Int / supplierPrice Int 실재.

**STEP B — PublishControlTowerWidget 신호등 카드 + 용어사전 (aa31ad4)**: src/lib/i18n/control-tower-strings.ko.json 신설 (발행 필드 23종 + 진정성 위반 6종 한글 전수 매핑, 코드값 노출 0). PublishControlTowerWidget.tsx 신설: useSWR(swr ^2.4.1 확인) 일괄 API 소비, resolveSignal green(publishReady)/yellow(hardComplete·!publishReady)/red(!hardComplete). 카드=썸네일+상품명+신호등 칩+한글 체크리스트(missing 배열→용어사전 dedup), 마진<25% 경고칩(UI 경고만, 차단 아님). 이모지 0(Lucide CheckCircle2/AlertTriangle/XCircle) / 한글 하드코딩 0(전부 strings.*). 마운트는 STEP C(이번 세션 미포함).

검증: 각 STEP tsc 0 / npm run build OK(exit 0) / 엔진 git diff 0 / 이모지·코드 Korean 0 / 비가역 0(register/POST/DB mutate 0, 발행 미접촉). 두 독립 커밋 + push(origin/feature/publish-control-tower). STEP C·D는 Desktop 머지 후 새 채팅(중복작업 방지). production(64fe565) 미갱신 — feature 브랜치라 production 매칭 검증 N/A(의도된 상태, Desktop 머지 시 교체).

---

## 2026-06-04 (18) ★ 발행 관제탑 설계 확정 + 두 대수술 production 머지 검증 (Desktop turn)

코드 0, production HEAD 64fe565. 이번 Desktop 세션 3대 성과.

**(1) 빌더 하이브리드 대수술 main 머지 검증(a6ea482)**: emotional-bg 적응형 스크림 코드 정독 + bash+PIL 실측(명화 배경 luma 0.779 → 0.40 선택 / 가상 야간 0.30 → 0.60 선택, 분기 양쪽 정상). HTML 직렬화기 #46 copy 무변형 + htmlEscape 인젝션 방어 확인. 단색 경로 회귀 0(buildDetailPage else 분기 = stackVertically 동일 호출, 달항아리 바이트 동등) 코드 레벨 증명.

**(2) UI 한글화 main 머지 검증(64fe565)**: /portfolio production 직접 호출 → **404 실측**(가짜 John 포트폴리오 완전 제거 확인, 대표 제보 해결). page.tsx redirect /dashboard(router.replace, push→replace 개선) + 용어사전 23값 의미훼손 0 + #47 인물정책 문구 교체(코드-문구 일치) 정독 확인. 잔여: workbench.firefly 영어 모델명=고유명사 유지 정상, _meta 개발용어=화면밖 무관, 로딩화면 bg-gray-900 다크 잔재=발행무관 메모.

**(3) ★ 발행 관제탑 설계도 신설**: docs/handoff/HANDOFF_publish_control_tower_2026-06-04.md. 기존 엔진(src/lib/automation/publish-readiness.ts + /api/products/[id]/publish-readiness) 정독 — 단순 필드 검사가 아니라 HARD+SEO 2계층 + #46 진정성(과장·가짜 인증·향기불일치) + 상품정보고시 4축 완성. 관제탑=엔진 결과를 대표가 보는 신호등 화면(GREEN publishReady / YELLOW hardComplete만 / RED hard 미충족). 대시보드 카드 배치(대표 승인). STEP A(일괄 판정 API, 단건 route와 공통함수 공유) → B(PublishControlTowerWidget) → C(대시보드 통합) → D(Chrome MCP 브라우저 실측).

**(4) 발행준비 게이트 두 상품 실측**(Supabase execute_sql): 명화 디퓨저(cmpnooli40001f0gveaxr8iim) publishReady 양호·마진 50.7% / 달항아리 도어벨(cmp3afb450001gng5468w0qpc) 마진 23% 가격재검토 권고. 둘 다 DRAFT 미발행. 첫 발행은 명화 우선 권장.

**★ 컨텍스트 한계 판단**: 이번 세션이 빌더+한글화 2대 작업으로 포화 → 관제탑 구현은 새 채팅 위임(대표 요청: 중복작업 방지). 설계도+5 MD 핑퐁 정리까지 이번 세션에서 완결.

비가역 0(코드/DB mutate 0, 발행 미접촉). SD-01 미접촉. **다음 (새 채팅 Desktop→Code)**: HANDOFF_publish_control_tower 정독 → STEP A~D 구현 → 브라우저 실측 통과 → P0 발행(명화 우선, 대표 명시 승인).

---

## 2026-06-04 (17) UI 한글화 STEP5 점검 + UI 한글화 전 완료 (Code turn)

baseline 69ccbf7, feature/ui-ko-cleanup. 권위: HANDOFF_ui_ko_cleanup §3 순서 5 + §B.

**(1) STEP5 crawl/orders 실측 점검**: src/app/crawl/page.tsx, orders/page.tsx, orders/[id]/page.tsx 전수 grep — 사용자 노출 영어 JSX 라벨 0, 이모지(유니코드 emoji 블록) 0. 유일한 영어 매치는 crawl/page.tsx:695 placeholder="https://domeme.domeggook.com/..."(도매꾹 입력 예시 URL=정상, 번역 대상 아님). → **actionable 항목 0, 코드 변경 없음**. 없는 작업을 만들어내지 않음(#46 정직). 핸드오프 §B "crawl/orders 점진 한글화"는 이미 한글 완료 상태로 확인.

**(2) ★ UI 한글화 STEP1~5 전 완료(브랜치 feature/ui-ko-cleanup)**:
- STEP1(c724693): studio-strings 용어 사전 23값 치환 + faceFreeNote #47 교체.
- STEP2+3(3ceef0b): root redirect /portfolio→/dashboard + 로딩문구 i18n + portfolio 가짜 템플릿 삭제.
- STEP4(69ccbf7): /upload 중복 아님 확정 → 한글화 + 이모지 4종 Lucide 교체 + upload-strings.ko.json.
- STEP5(본 커밋): crawl/orders 점검 — actionable 0.
전 STEP 공통: 한글 하드코딩 0(전부 i18n, #35) / 이모지 0(Lucide) / sentinel 0 / tsc 0 / build ✓ / 비가역 0(발행·DB mutate 0). main a6ea482 내내 불변.

**다음 (Desktop)**: (1) production(머지 후 SHA)에서 온실 아틀리에·첫 진입(/→/dashboard)·/upload 노출 문구 육안 점검 (2) 브랜치 main 머지 결정 (3) 이후 발행 관제탑(publish-readiness 신호등 대시보드)을 본 용어 사전 위에 신설.

---

## 2026-06-04 (16) UI 한글화 STEP4 — /upload 한글화 + 이모지 제거 (Code turn)

baseline 3ceef0b, feature/ui-ko-cleanup. 권위: HANDOFF_ui_ko_cleanup §A(/upload) + 작업4.

**(1) 중복 여부 확인(핸드오프 선결 조건)**: /upload는 fetch('/api/upload/excel') = 엑셀 파일로 상품 대량 등록. studio 워크벤치 dropzone은 /api/upload 재활용 디자이너 이미지 소스(누끼/배경)를 Supabase에 업로드. → 기능 성격 완전 별개(상품 데이터 일괄 등록 vs 이미지 자산 업로드). **중복 아님 → 통합/삭제 아니라 살림 + 한글화** 결정.

**(2) 이모지 제거(코드원칙)**: 📋(양식)→ClipboardList, 📁(파일)→FolderOpen, ⏳(진행)→Loader2(animate-spin), 🚀(시작)→UploadCloud. 전부 lucide-react. JSX 이모지 0.

**(3) i18n 분리(#35)**: 기존 하드코딩 한글(제목·양식 안내·라벨·alert 4종)을 신규 upload-strings.ko.json으로 분리. page.tsx 한글 하드코딩 0(전부 strings 경유). 제목 "Excel 대량 업로드"→"엑셀 대량 업로드". alertSuccess는 {n} placeholder + replace. 기능/엔드포인트(/api/upload/excel) 무변경.

**(4) 검증**: emoji grep 0 / page.tsx 한글 0 / tsc 0 / build ✓ Compiled successfully / sentinel 0. 비가역 0(발행·DB mutate 0, 엑셀 라우트 로직 무변경). main a6ea482 불변.

**다음**: STEP5(crawl/orders 등 잔여 사용자 노출 영어 라벨 점진 한글화 — 핸드오프상 "별도 커밋 가능", 범위 산정 후 진행).

---

## 2026-06-04 (15) UI 한글화 STEP2+3 — root redirect 교정 + portfolio 템플릿 삭제 (Code turn)

baseline c724693, feature/ui-ko-cleanup. 권위: HANDOFF_ui_ko_cleanup §A(템플릿 잔재) + §3 순서 2·3.

**(1) STEP2 root redirect 교정(src/app/page.tsx)**: 첫 진입점이 /portfolio로 redirect + "Loading Portfolio..." 영어였음. → router.replace('/dashboard')로 교정(push 대신 replace=히스토리 미오염). 로딩문구는 신규 home-strings.ko.json("loading":"대시보드로 이동 중…") 경유(#35 한글 하드코딩 금지 준수 — 단일 splash 문구도 i18n 패턴 유지).

**(2) STEP3 portfolio 삭제**: src/app/portfolio/page.tsx = "John의 파이썬 포트폴리오" 가짜 템플릿(19.5KB, 앱과 무관). 삭제 전 grep "portfolio" 전수(src .ts/.tsx) → 외부 link/import 참조 0 확인(유일 참조였던 page.tsx redirect는 (1)서 제거됨). git rm 실행.

**(3) 원자 커밋 판단**: STEP2(redirect)와 STEP3(삭제)를 분리 커밋하면 중간 상태에서 / 라우트가 깨질(혹은 orphan) 위험 → 하나의 원자 "portfolio 제거" 커밋으로 통합. 안전 우선.

**(4) 검증**: git rm 직후 tsc가 .next/types/app/portfolio/page.ts 잔재(생성 타입 스텁)로 TS2307 발생 → npm run build로 .next/types 재생성 시 portfolio 타입 제거됨 → 재실행 tsc 0 확인(스테일 캐시 아티팩트, 실 오류 아님). build ✓ Compiled successfully(/ redirect 라우트 정상). sentinel 0 / page.tsx 한글 하드코딩 0(i18n) / 이모지 0. 비가역 0(발행·DB mutate 0). main a6ea482 불변.

**다음**: STEP4(/upload — studio 워크벤치 dropzone과 기능 중복 여부 확인 → 중복이면 통합/삭제, 살릴 거면 한글화) → STEP5(crawl/orders 잔여 영어 라벨 점진 한글화).

---

## 2026-06-04 (14) UI 한글화 STEP1 — studio-strings 용어 사전 + #47 인물정책 문구 교체 (Code turn)

baseline a6ea482(빌더 머지 후), feature/ui-ko-cleanup 신규 브랜치. 권위: HANDOFF_ui_ko_cleanup §1 용어 사전 + §2 #47 교체.

**(1) 용어 사전 치환(§1, 23개 값)**: studio-strings.ko.json 값만 교체(JSON 키 전부 불변 → 컴포넌트 소비자 무영향=회귀 0). 골격/skeleton→페이지 구성(detail.subtitle/skeletonOverride), 에셋 저장·Supabase Storage→이미지 저장(actions.title/saveButton/filters.saved), public URL→공유 링크(actions.saved/publishHintNeedSave), Clean/Price/Badge/Lifestyle→깔끔형/가격강조형/뱃지형/감성형(thumbnail.subtitle/variants), 누끼 PNG→배경 제거 이미지(thumbnail.manualCutoutLabel/canvas.cutoutSlot), 폴백·fallback→기본(source.fallback/manualHint/kftc.fallbackNote), matchScore→적합도 점수, "ms 소요"→처리 시간, dropzone Supabase 노출문구 3건→이미지 저장소.

**(2) #47 인물정책 문구 교체(§2)**: workbench.firefly.faceFreeNote 구값 "★얼굴 없는 인체 일부 전략 — 손/부분 토르소만"(폐기된 #47 이전 정책)을 "★인물 정책 — 익명 일반 모델 허용, 특정 실존인물·유명인 생성 금지(IP·초상권 안전). 프롬프트 자동 가드 포함"으로 교체. 코드(category-tone-mapper/backdrop-vlm-gate)는 이미 #47 정합 완료, UI 문자열만 잔존했던 stale fact 해소(#44 동형).

**(3) 검증**: 렌더 값 잔재 grep(에셋/골격/public URL/폴백/fallback 사용/얼굴 없는 인체)=0(_meta 내부 주석 제외). JSON valid. tsc 0 / build ✓ Compiled successfully / sentinel 0 / 코드 한글 하드코딩 0(전부 i18n 경유, #35) / 이모지 0. 비가역 0(문구만, 발행·DB mutate 0). main a6ea482 불변.

**다음**: STEP2(src/app/page.tsx redirect /portfolio→/dashboard + 로딩문구 한글) → STEP3(portfolio 참조 grep 0 확인 후 삭제 + build redirect 검증) → STEP4(/upload 중복 확인→한글화/통합) → STEP5(crawl/orders 잔여 영어 라벨).

---

## 2026-06-04 (13) 빌더 STEP5 — 커넥터 운영 규칙 + 캐시 점검 / 하이브리드 대수술 완료 (Code turn)

baseline 0e619f8, feature/detail-builder-hybrid. 권위: HANDOFF STEP5(독립) + TOOL_ECOSYSTEM_MANUAL.

**(1) 작업원칙 #48 명문화(PRINCIPLES_LEARNED)**: 도구 생태계 라우팅 고정 — 이미지 생성=Adobe Firefly 웹 1-click(대표 수동, api 모드는 #38 예외), 가공=Adobe MCP, 합성·연속성=section-builder/composeContinuous + Figma(sharp 단순 적층 약함). AEM MCP / Adobe Marketing Agent MCP=1인 셀러 무관 미사용 명문. 파트너 모델(FLUX/Nano Banana/gemini/imagen/gpt-image)=IP 면책 없음 → 최종 판매물 금지, Firefly-native(유료 면책)만 판매물 허용. firefly-generate.ts 주석 보강(파트너 모델 api 자동 강등=발행 경로 배제 명문).

**(2) 캐시 no-cache 점검(DEBT-11 등재)**: 영구 적재 3종(main/cutout/backdrop) curl -sI 실측 → preserve 스크립트가 cacheControl '31536000' 지정했으나 공개 URL 응답이 cache-control: no-cache. cacheControl 옵션 미실효(CDN/버킷 메타 미적용 의심). 매 요청 재페치 → 상세페이지 체감 속도·전환율 손해(기능 영향 0). 재업로드(객체 삭제 후 신규 업로드로 메타 재적용) 또는 Supabase 버킷 기본 cache 정책 설정 권고 — 프로덕션 스토리지 mutation이라 Code 미실행, Desktop 위임(#41). 발행 차단 아님.

**(3) 검증**: tsc 0 / build ✓ Compiled successfully / sentinel 0 / 코드 Korean 0(firefly-generate 주석 영어). 비가역 0(코드 변경=주석 1곳, 로직 무변경). main a585635 불변.

**★ 빌더 하이브리드 대수술 STEP1~5 전 완료(브랜치 feature/detail-builder-hybrid)**:
- STEP1(bf09837): hero 무드배경 합성.
- STEP2-foundation(4ef6102): composeContinuous + sectionRole 인프라.
- STEP2-확산 표본(9c31052): hero 테이블 앵커링 근본수정 + spec 불투명.
- STEP2-확산 emotional(60c5408): emotional-bg 헬퍼 + 6개 전환 + 접지그림자.
- STEP2-마감(09e5ff1): 스크림 0.40 + 다크 배경 적응형.
- STEP3(a539fea): detail-html-serializer + detailHtml 필드.
- STEP4(0e619f8): Studio UI 이미지/HTML 토글 + 무드배경 입력.
- STEP5(본 커밋): 커넥터 규칙 #48 + 캐시 DEBT-11.
전 STEP 회귀 가드: no-lifestyle 단색 경로 = 전 렌더러 createCanvas(size,bg) 동일(구조적 바이트 동등). 비가역 0(발행 미접촉 DRAFT). main 내내 불변.

**다음 (Desktop)**: (1) 명화 디퓨저 재합성 최종 확인(스크림 0.40 + 접지그림자 + HTML 토글) (2) ★ main 머지 전 최종 회귀 검증 — 달항아리(무드 없는) 단색 경로 출력 불변 확인 (3) 브랜치 main 머지 → P0(달항아리·명화) 발행 재개. (4) Figma STEP2 7섹션 컴포넌트는 본 빌더 연속캔버스 구조와 정합.

---

## 2026-06-04 (12) 빌더 STEP4 — 가독성 정교화 + Studio UI 배선 (Code turn)

baseline a539fea, feature/detail-builder-hybrid. 권위: HANDOFF STEP4(가산식).

**(1) 렌더 측 가독성 정교화**: 적응형 스크림(다크 배경 자동 상향)은 STEP2 마감(10)서 이미 완료 → STEP4 "미룬 적응형 스크림" 없음. informational 19개는 이미 불투명(대비 확보)이라 추가 작업 불요. 패널 페이드(hero)도 STEP2-foundation서 적용됨.

**(2) Studio UI(DetailPageCard.tsx)**: (a) 이미지(PNG)/HTML 출력 토글 — FileImage/Code2 버튼, viewMode useState, HTML은 detail.detailHtml 있을 때만 활성(없으면 비활성+htmlUnavailable 툴팁). showHtml이면 dangerouslySetInnerHTML로 직렬화기 출력 미리보기(자체 escape된 마크업), 아니면 기존 PNG img. (b) 무드 배경 URL 입력 — 신규 state 추가 없이 기존 manualBackdropUrl/setManualBackdropUrl 재사용(썸네일·상세 공용 backdrop). (c) 미리보기 컨테이너 maxHeight 520→640(연속 페이지 인지 개선). 라벨 5종(moodBackdropLabel/Placeholder/outputImage/outputHtml/htmlUnavailable)을 studio-strings.ko.json에 분리(#35, JSX 한글 0).

**(3) 배선**: useStudioActions.runDetail이 manualBackdropUrl.trim()을 body.lifestyleAssetUrl로 전달. studio/page.tsx가 DetailPageCard에 lifestyleAssetUrl=manualBackdropUrl + onLifestyleChange=setManualBackdropUrl 전달. types.ts DetailResult에 detailHtml?+sections role? 추가.

**(4) 회귀 가드(중요)**: DetailPageCard 신규 props를 optional로 선언 → src/app/products/new/page.tsx의 두 번째 DetailPageCard 소비자(무드 입력 미전달)가 깨지지 않음(tsc 오류로 발견 후 즉시 optional 전환). 무드 입력은 onLifestyleChange 있을 때만 렌더. HTML 토글은 독립 동작.

**(5) 검증**: tsc 0 / build ✓ Compiled successfully / sentinel 0 / 코드 Korean 0(라벨 i18n 분리, useStudioActions:253 기존 한글 에러문은 본 turn 무관). 비가역 0(generate-detail PNG/HTML 생성만, 발행 미접촉 DRAFT). main a585635 불변.

**다음**: STEP5(커넥터 운영 규칙 PRINCIPLES_LEARNED 명문화 + 영구 적재 자산 cache-control: no-cache 점검).

---

## 2026-06-04 (11) 빌더 STEP3 — HTML 출력 경로 신설 (Code turn)

baseline 09e5ff1, feature/detail-builder-hybrid. 권위: HANDOFF STEP3(하이브리드 절반, 가산식·저위험).

**(1) detail-html-serializer.ts 신설**: serializeDetailHtml(input) — buildDetailPage 결과의 섹션 메타(sectionId+copy+role)를 의미적 HTML 블록으로 직렬화. heading-like 키(headline/title/question/hook, subtitle 제외)는 <h2>, 나머지는 <p>. 섹션 wrapper 배경은 role 기반(emotional=#FAF7F2 웜 틴트 / informational=#FFFFFF). 선두에 lifestyleAssetUrl + heroImageUrl 이미지 블록(Supabase 영구 URL을 img src, max-width 100%). 외곽 컨테이너 860px + Pretendard + word-break:keep-all + 큰 본문 폰트(모바일 가독). htmlEscape 자체 구현(& < > " ').

**(2) #46 grounding**: 직렬화기는 copy를 변형하지 않고 escape+마크업만. role은 배경 톤에만 영향, 콘텐츠 무관.

**(3) generate-detail 배선**: 응답에 detailHtml 필드 추가(serializeDetailHtml(result.sections+product.mainImage+body.lifestyleAssetUrl)). detailBase64(PNG)는 그대로 보존 = 병렬 출력(대체 아님). 응답 sections에 role도 노출. 기존 PNG 소비자(저장/발행) 회귀 0.

**(4) 하이브리드 분담(주석 명문화)**: image(PNG) 모드 = 감성 비주얼 자체가 상품일 때 / html 모드 = 스마트에디터 호환·편집 필요 시. 출력 선택은 호출 측(Studio UI STEP4 / 대량등록 파이프).

**(5) 검증**: tsc 0 / build ✓ Compiled successfully / sentinel 0 / Korean 0. 비가역 0(PNG/HTML 생성만, register/POST/DB mutate 0, 발행 미접촉 DRAFT). main a585635 불변.

**다음**: STEP4(sectionRole 가독성 정교화 — 적응형 스크림은 STEP2 마감서 완료 / DetailPageCard UI: 이미지·HTML 토글 + 무드배경 입력) → STEP5(커넥터 규칙 + 캐시 점검).

---

## 2026-06-04 (10) 빌더 STEP2 마감 — 스크림 0.40 + 다크 배경 적응형 안전장치 (Code turn)

baseline 60c5408, feature/detail-builder-hybrid. 권위: HANDOFF STEP2-확산 마감(2-1 스크림 하향 + 2-2 다크 안전장치).

**(1) 스크림 0.62→0.40**: emotional-bg.ts MOOD_SCRIM_ALPHA. Desktop 실물 비교 검증 — 0.62는 명화(밝은 햇살) 배경서 무드 거의 소실(연한 베이지화), 0.40에서 세이지 헤드라인·흰 카드 본문 가독 유지하며 무드 회복. 대표 확정.

**(2) 다크 배경 적응형 안전장치(2-2 (a) 채택)**: 0.40은 밝은 배경 기준 — 어두운 무드 배경(야간/딥톤)에선 흰 스크림 0.40으로 dark-on-light 텍스트 대비 깨질 위험. 해결: cover 버퍼를 sharp.stats()로 채널 평균 측정 → luma=(0.299R+0.587G+0.114B)/255, luma<0.5(DARK_BACKDROP_LUMA)면 MOOD_SCRIM_ALPHA_DARK=0.60으로 자동 상향, 아니면 0.40. stats 예외 시 0.40 폴백. 무드 모드에서만(단색 경로 불변). ★ 일정 판단: 간단·견고하여 STEP4로 미루지 않고 지금 처리(STEP4 "미룬 적응형 스크림"은 본 turn에서 완료).

**(3) 검증**: tsc 0 / build ✓ Compiled successfully / sentinel 0 / Korean 0. 회귀 0(no-lifestyle createCanvas 분기 불변). 비가역 0(PNG만, 발행 미접촉 DRAFT). main a585635 불변.

**다음**: STEP3(detail-html-serializer 신설 + generate-detail detailHtml 필드) → STEP4(가독성 정교화 + DetailPageCard UI) → STEP5(커넥터 규칙 + 캐시 점검). Desktop은 전 STEP 완료 후 명화 0.40 재확인 + 머지 전 최종 회귀.

---

## 2026-06-04 (9) 빌더 STEP2-확산(2) — emotional 그룹 6개 무드배경 전환 + 접지그림자 (Code turn)

baseline 9c31052, feature/detail-builder-hybrid. 권위: HANDOFF STEP2-확산(2) "나머지 렌더러 차등 전환" 분류표.

**(1) emotional-bg.ts 공통 헬퍼 신설**: (a) resolveEmotionalBackdrop(ctx,size,bg) — 무드 모드(ctx.lifestyleAssetUrl 존재)면 cover-fit 사진 위에 흰 가독성 스크림(MOOD_SCRIM_ALPHA=0.62) 합성한 "무드 틴트 wash" base 반환, 아니면 createCanvas(size,bg) 그대로(=회귀 0). ★ 설계 의도: 텍스트 대비 반드시 확보(HANDOFF 하드 요구) — text-heavy 섹션의 기존 dark-on-light 텍스트/카드를 그대로 두고 base만 밝은 무드 wash로 바꿔 대비 보존. usage.ts식 흰 텍스트-온-포토 bespoke 재작업의 대비 붕괴 위험 회피. (b) groundShadowLayer(size,{centerX,baseY,width}) — 작은 타원 SVG를 sharp.blur(12)로 부드럽게 → 전체 size 투명 레이어에 누끼 base 위치 배치(rgba 0,0,0,0.18). SVG filter 의존 없이 안정.

**(2) emotional 6개 전환(1줄 스왑)**: seasonalHook/story/styledShot/problem/solution/philosophy — `const canvas = await createCanvas(size,bg)` → `const { canvas } = await resolveEmotionalBackdrop(ctx,size,bg)`. 미사용된 createCanvas import 제거. 전경 레이어(카드/텍스트/색)는 전부 무변경 → 스크림 wash 위에서 가독성 보존. hero(완료)는 무드 모드에 접지그림자만 추가(본품 base=tableLineY에 그림자). usage(이미 무드+applyBottomVignette 처리됨)는 미접촉.

**(3) informational 19개 무변경(verify-only)**: spec/specTable/specifications/cta/shipping/warranty/comparison/clinical/corePerformance/technology/benefits/options/optionIntro/eventDetails/reviews/package/product/detail/material — 손대지 않음 = 불투명 createCanvas(size,bg) 유지 = 가독성 사수 + 무드 비침 0. (detail.ts가 lifestyleAssetUrl을 grid 전경 이미지로 쓰는 건 기존 동작, 배경 bleed 아님 → 무변경.)

**(4) 검증**: tsc 0(미사용 import 제거 후 undefined 참조 0) / build ✓ Compiled successfully / sentinel 0 / 코드 Korean 0. 회귀 가드(구조적): 6개 렌더러 no-lifestyle = resolveEmotionalBackdrop else 분기 = createCanvas(size,bg) 동일 호출 + 전경 무변경 → 단색 경로 바이트 동등. hero 단색 접지그림자 미적용. 비가역 0(generate-detail PNG만, register/POST/DB mutate 0, 발행 미접촉 DRAFT). main a585635 불변.

**(5) 범위/게이트**: STEP2-확산(2) emotional 그룹만. STEP3(HTML 직렬화기)/4(가독성 정교화+Studio UI)/5(커넥터 규칙+캐시 점검)는 Desktop 감성 그룹 시각 검증 회신 후.

**다음 (Desktop)**: 명화 디퓨저 재합성 시각 검증 — (a) 감성 섹션 무드 노출(스크림 톤) (b) hero 접지그림자(스티커 느낌 해소) (c) spec 등 정보 섹션 가독성 (d) 달항아리 단색 회귀 0. 무드 강도 조정 원하면 MOOD_SCRIM_ALPHA(현 0.62) 하향. 승인 시 STEP3~5.

---

## 2026-06-04 (8) 빌더 STEP2-확산 (1)표본 — sectionRole 도입 + hero 본품 앵커링 근본해결 (Code turn)

baseline 4ef6102, feature/detail-builder-hybrid. 권위: HANDOFF STEP2-확산 "섹션 역할별 차등 투명화". ★ 단순 전체 투명화 금지(표본 검수 결과: spec zebra 행/cta 흰 카드를 통째 투명화하면 정보 텍스트가 무드 사진과 겹쳐 가독성 붕괴).

**(1) sectionRole 분류 도입(section-builder.ts)**: SectionRole = emotional | informational 타입 + EMOTIONAL_SECTION_IDS Set(hero/seasonalHook/story/philosophy/styledShot/problem/solution) + getSectionRole(id) — 미등록·모호 id는 informational(안전측, 가독성 우선)로 폴백. DetailPageResult.sections에 role 필드 추가(가산식 메타, PNG 픽셀 무관 → 회귀 0). HTML 직렬화기(STEP3)·Studio UI(STEP4)가 이 role을 읽어 분기 예정.

**(2) 차등 투명화 정책(표본)**: emotional=무드 모드서 전역 무드bg 노출 / informational=불투명 배경 유지(가독성 사수, 무드bg 비침 금지). 표본 spec(informational)는 기존 createCanvas(size,bg) 불투명 그대로 — 렌더링 코드 무변경이 곧 informational 처리(가독성 보존). hero는 emotional이며 STEP1/2에서 이미 무드 표시. informational 톤 통일(연한 톤/반투명 카드)은 가독성 위험이라 STEP4 정교화로 이관.

**(3) hero 본품 앵커링 근본해결(hero.ts)**: STEP2-foundation의 position:'bottom'은 명화 누끼(253×776 세로형)가 fit박스를 꽉 채워 이동 여백 0 → 무효였음(Desktop 표본 검수 확인). 근본 수정 = 무드 모드서 본품 배치를 캔버스 상단(y=40)이 아니라 배경 테이블면(tableLineY=round(size.height*0.52))에 base를 안착. productBoxH = max(120, tableLineY-60)로 상단 여백~테이블선 사이에 fit, offsetLayer y=tableLineY-productBoxH. ★ 패널 겹침 방지: tableLineY=min(0.52h, panelTop-50)로 clamp → hero 높이와 무관하게 텍스트 패널과 50px 안전간격 보장. 단색 경로는 기존 y=40 중앙 fitImage 그대로(회귀 0).

**(4) 검증**: tsc 0 / build ✓ Compiled successfully(consumer 무파손 — role 신규 필드) / sentinel 0 / 코드 Korean 0. 비가역 0(generate-detail PNG 생성만, register/POST/DB mutate 0, 발행 미접촉 DRAFT). main a585635 불변. 회귀 가드(구조적): no-lifestyle hero=fitImage+y40+패널null 동일, no-lifestyle 빌더=stackVertically(role은 메타라 픽셀 무관).

**(5) 범위/게이트**: STEP2-확산 (1)표본 = sectionRole 인프라 + hero 앵커링 + spec informational만. 나머지 28개 렌더러 그룹 확산 + STEP3(HTML 직렬화기)/4(가독성 정교화+Studio UI)/5(커넥터+캐시)는 Desktop 표본 시각 검증 회신 후.

**다음 (Desktop)**: 명화 디퓨저 재합성 시각 검증 — (a) 본품이 배경 테이블면에 "놓인" 느낌(공중부양 해소) (b) spec 등 정보 섹션 가독성 유지 (c) 달항아리 단색 경로 회귀 0. 승인 시 Code 28 렌더러 그룹 확산 + STEP3~5.

---

## 2026-06-04 (7) 빌더 하이브리드 STEP2 — 연속 캔버스 foundation + hero 1-D 미세개선 (Code turn)

baseline bf09837, feature/detail-builder-hybrid. 권위: HANDOFF_detail_builder_hybrid 작업1(연속 캔버스화) + 1-D(STEP1 실물검증 도출 미세개선 2건).

**(1) composeContinuous 신설(section-builder.ts)**: 전체 캔버스(860 x totalHeight)에 전역 배경을 먼저 깔고(backgroundBuffer 있으면 무드 photo, 없으면 기존 흰색) 섹션을 그 위에 적층하는 연속 페이지 어셈블러. stackVertically 보존(기존 함수 유지). buildDetailPage 배선: lifestyleAssetUrl 있으면 fetch→coverFitCanvas(width,totalHeight)→composeContinuous, fetch 실패 시 bg undefined로 폴백(=흰색 base=stackVertically 동등). lifestyleAssetUrl 없으면 stackVertically 그대로 호출.

**(2) ★ 회귀 가드 + 확산 보류**: 섹션 렌더러는 현재 각자 불투명 전체배경을 칠하고 캔버스를 빈틈없이 타일링 → 불투명 섹션이면 전역 배경과 무관하게 합성 픽셀이 stackVertically와 동일. 따라서 composeContinuous 배선은 지금 안전(무드 photo는 hero 자체 합성 외엔 가려짐). 30개 렌더러를 투명 배경으로 전환하는 "확산"은 최고 위험이라 hero 시각 검증 후로 보류(handoff 진행규칙 §128).

**(3) hero 1-D 미세개선 2건(usedLifestyle 게이트)**: (개선1 바닥 앵커링) 무드 모드에서 본품 누끼 fit을 position:'bottom'으로 — 박스 하단에 안착시켜 배경 테이블면(~0.62h)에 "놓인" 사실감. 단색 경로는 기존 중앙 fitImage 유지. (개선2 패널 페이드) 가독성 패널 fill을 단색 rgba에서 세로 linearGradient(상단 offset 0 alpha 0 → 0.22 에서 0.72 도달)로 — 상단 가장자리가 본품 쪽으로 자연 연결. 패널 top(textBlockTop+10)·50px 안전간격 불변. 단색 경로 패널 null 유지.

**(4) 검증**: tsc 0 / build ✓ Compiled successfully / sentinel 0 / 코드 Korean 0(작성 중 코드 주석 "작업1/개선1/개선2" 3건 검출→영어 교정). 비가역 0(generate-detail PNG 생성만, register/POST/DB mutate 0, 발행 미접촉 DRAFT). main a585635 불변.

**(5) 범위/게이트**: STEP2 = composeContinuous foundation + hero 1-D만. 30 렌더러 확산 + STEP3(HTML 직렬화기)/4(sectionRole+UI)/5(커넥터+캐시)는 Desktop hero 시각 검증 회신 후 진행(handoff 진행규칙 준수).

**다음 (Desktop)**: 명화 디퓨저 재합성 시각 검증 — 본품 바닥 앵커링(테이블면 안착) + 패널 상단 페이드 연결 확인. 단색 경로(달항아리) 회귀 0 확인. 승인 시 Code 확산+STEP3~5 진행.

---

## 2026-06-04 (6) 상세페이지 빌더 하이브리드 대수술 STEP1 — hero.ts 무드배경 합성 (Code turn)

baseline a585635, feature/detail-builder-hybrid 브랜치(대수술이라 main 직접 수정 회피). 권위: docs/handoff/HANDOFF_detail_builder_hybrid_2026-06-04.md 작업2(단계별 순서상 첫 작업).

**(1) hero.ts 무드배경 합성 3단계**: (a) 배경 — ctx.lifestyleAssetUrl 있으면 fetchImageBuffer → cover-fit(fit:'cover', position:'centre')으로 캔버스(860 x height) 전체 채움(letterbox 없음), 없으면 기존 createCanvas(size,bg) 단색. (b) 본품 — sourceImageUrl(누끼 PNG) 중앙, 무드배경일 때만 투명 letterbox(alpha 0)로 fit해 사진 비침, 단색일 때 기존 fitImage(...,bg) 동일. (c) 가독성 가드 — 무드배경일 때만 텍스트 블록 뒤 반투명 흰 라운드 패널(rgba(255,255,255,0.72)) 1겹.

**(2) ★ 회귀 가드(P0 발행물 안전)**: 모든 추가는 usedLifestyle 게이트. lifestyleAssetUrl 미전달 시 — canvas=createCanvas(size,bg), 본품 fit=fitImage(buf,{560,imageBlockHeight-40},bg), readabilityPanel=null, layers=[titleLayer,(subtitle),stripe] — 연산·인자·순서 모두 기존과 동일 → 단색 경로 출력 불변. full-render 바이트 비교는 generateHeroCopy가 비결정적 AI라 불가하므로 구조적 동등으로 보장(정직 기록).

**(3) 검증**: npx tsc --noEmit 0 / npm run build ✓ Compiled successfully / sentinel grep 0 / hero.ts Korean 0(주석 영어, 1차 작성 "작업2" 1건 검출→task 2 교정). 비가역 0(PNG 생성만, register/POST/DB mutate 0, 발행 미접촉 DRAFT 유지). main HEAD a585635 불변(브랜치 작업).

**(4) 단계 범위**: STEP1=작업2(hero 무드배경)만. STEP2(연속 캔버스화)~STEP5(커넥터 운영 규칙)는 Desktop 시각 검증·승인 후 순차 진행.

**다음 (Desktop)**: Studio에서 명화 디퓨저로 generate-detail 실행 — lifestyleAssetUrl=product-assets/cmpnooli40001f0gveaxr8iim/myeonghwa-backdrop-860.jpg, sourceImageUrl=.../myeonghwa-cutout.png → hero 무드배경 합성 결과 시각 검증(Desktop MCP). 승인 시 Code STEP2 진행.

---

## 2026-06-04 (5) 명화 디퓨저 Adobe 가공자산 3종 Supabase 영구 적재 (Code turn)

baseline 16578d0. scripts/preserve-myeonghwa-assets.mjs(Desktop 작성·검증) 로컬 실행. Adobe 단축URL 만료 전 영구화.

**(1) 실행 보정**: 첫 실행이 resolveProductId(PostgREST `.from('Product')`)에서 "permission denied for schema public"로 ABORT — Prisma 관리 테이블이 REST API에 미노출(RLS/grant). 기존 turn에서 확정된 명화 디퓨저 id(cmpnooli40001f0gveaxr8iim, TASK_BRIDGE/PROGRESS aroma entry 기록)를 PRODUCT_ID env override로 전달해 DB 조회 건너뜀. Storage API(업로드/공개URL)는 PostgREST와 다른 경로라 정상 동작. 스크립트에 신뢰 경로 주석 보강(#44).

**(2) 적재 결과(원자 보호)**: Phase1 = 3종 URL 전수 생존 재확인 후에만 업로드(죽은 URL 1개라도 전체 ABORT). 바이트 실측 = 대표 65787B(image/jpeg) / 누끼 195918B(image/png) / 배경 73822B(image/jpeg) — Desktop 검증치(65.8/195.9/73.8KB) 정합. Phase2 = product-assets/cmpnooli40001f0gveaxr8iim/ upsert(cacheControl 1년). Phase3 = public URL 3종 전부 http 200.

**(3) 영구 URL**:
- 대표이미지(1000x1000): https://doxfizicftgtqktmtftf.supabase.co/storage/v1/object/public/product-assets/cmpnooli40001f0gveaxr8iim/myeonghwa-main-1000.jpg
- 본품 누끼(RGBA png): https://doxfizicftgtqktmtftf.supabase.co/storage/v1/object/public/product-assets/cmpnooli40001f0gveaxr8iim/myeonghwa-cutout.png
- 배경 무대(860x860): https://doxfizicftgtqktmtftf.supabase.co/storage/v1/object/public/product-assets/cmpnooli40001f0gveaxr8iim/myeonghwa-backdrop-860.jpg

**(4) 보안/비가역**: 마스터(서비스롤) 키는 로컬 `--env-file=.env.local`에서만 로드, 대화/로그 미노출(Gemini 키 노출 사고 재발 방지). Storage upsert만 — DB row mutate 0, Product 발행 필드 미접촉, DRAFT 유지. 완전 가역.

**다음 (Desktop)**: 영구 URL 3종을 상세페이지 합성/발행 자산으로 연결(Figma STEP2 배경A+본품C 합성).

---

## 2026-06-04 (4) firefly-generate 어댑터 + 인물 정책 코드 정합 (Code turn)

baseline 77812ea (Vercel READY). 권위: docs/handoff/HANDOFF_firefly_generate_adapter_2026-06-04.md.

**(1) firefly-generate.ts 어댑터 신설**: enqueue가 만든 FireflyRequest를 받아 이미지 1장을 생성하고 {imageUrl}을 반환하는 단일 진입점. FIREFLY_MODE=api 토글, 미설정/기타 → manual 기본. manual 모드는 네트워크 생성 호출 0(대표 1-click용 스펙 그대로 반환). api 모드는 Adobe IMS OAuth Server-to-Server 토큰(모듈 스코프 캐시, 만료 60초 전 갱신) → Firefly Services v3 /images/generate. 키 부재·파트너 모델(gemini/imagen/gpt-image-2)·토큰/생성 에러 시 manual로 fail-safe 강등(note 명시, #46 허위 성공 0). DB/Storage 미접촉(생성만, 적재는 기존 ingest).

**(2) 인물 정책 코드 정합(#44 stale-fact, #47 준수)**: 문서(#47/PLAYBOOK §5)에는 반영됐으나 실행 코드에 구 하드룰 잔존 → 정합. category-tone-mapper.ts ModelPolicy 타입에 'model-allowed' 멤버 추가 + "human faces hard-prohibited system-wide" 주석을 #47 준수 문구로 supersede. ★ 기존 GROUP_ROWS modelPolicy 값은 변경 0(배경 무대는 무인이 정답, 'model-allowed'는 인물 컨셉컷 전용 신규 옵션).

**(3) classifyPersonShot 게이트 신설**: backdrop-vlm-gate.ts에 별도 게이트 함수 추가(같은 Groq Llama 4 Scout 재사용). 통과=!has_identifiable_person && !has_text && is_appropriate(익명 인물 OK = #47, 특정 실존인물/유명인·로고·미성년 부적절만 reject). fail-closed(에러/파싱불가 → reject) 유지. ★ 기존 classifyBackdrop 미접촉(배경 게이트는 그대로).

**(4) 범위 명시(폭주 방지)**: 인물컷 인입 라우트 연결(2-C)은 다음 스프린트로 분리 — 본 turn은 게이트 함수 준비까지.

**검증**: npx tsc --noEmit 0 errors(ModelPolicy union 확장 후 exhaustiveness 통과) / npm run build ✓ Compiled successfully / sentinel grep 0건 / 코드 Korean 0(주석 전부 영어). 비가역 0(firefly-generate 기본 manual → 생성 네트워크 호출 0, register/POST mutate 0). 새 의존성 0(fetch만, OAuth 토큰 수동 관리).

**다음 (Desktop)**: (1) Adobe 가공자산 3종 Supabase product-assets 업로드(만료 전) (2) 대표 Firefly 인물 컨셉컷 1-click 생성 → classifyPersonShot 게이트 실측 검증 (3) Figma 한도 리셋 후 값 눈대조 + STEP2 7섹션 컴포넌트.

---

## 2026-06-04 (3) Adobe 가공 라인 첫 완주 + AI 인물 정책 갱신 + Firefly v2 (Desktop turn)

production HEAD 5dad281 (Vercel READY, 코드 0).

**(1) Adobe 가공 5단계 SOP 입증**: 명화 디퓨저 정물컷으로 실측 완주. image_remove_background(본품 누끼) → image_crop_and_resize fit:extract+focus:{prompt}(본품만 정밀 추출) → fit:pad 1000x1000(네이버 대표이미지 흰배경, 홍보문구 0) → fit:reframe 860x860(상세 배경 무대). 합성(A+C 겹치기)은 Adobe 미지원 → Figma/Photoshop.

**(2) 팜파스 동시인식 이슈 해결**: remove_background가 피사체 2개 이상 시 부피사체(팜파스)까지 딸려옴 → crop_and_resize fit:extract + focus 프롬프트로 본품만 추출하는 우회로 해결.

**(3) ★ AI 인물 등장 허용 정책(대표 확정)**: 컨셉상 필요 시 익명 일반 모델 등장 허용. 특정 실존인물·유명인 식별 금지(익명/비식별만), 미성년자 부적절 묘사 금지. 구 하드룰 "얼굴 없는 인체 일부"는 대체. 작업원칙 #47 신설 + DETAIL_PAGE_PLAYBOOK §5 라이브 SOP 동시 갱신(#44).

**(4) Firefly 컨셉컷 v2 문서**: docs/handoff/FIREFLY_CONCEPT_PROMPTS_v2_human_allowed_2026-06-04.md — 인물 포함 프롬프트 3종 + 가공 SOP. Adobe 가공 한계 정직 기록(생성 불가/합성 불가/배경교체 불가 → Firefly·Photoshop).

**(5) 자산 영구화 TODO**: Adobe 가공 3종은 단축URL(세션 한정·만료) → Supabase product-assets 업로드 필요.

**다음 (Desktop)**: (1) 가공자산 3종 Supabase product-assets 업로드(만료 전 영구화) (2) 대표 Firefly 인물 컨셉컷 1-click 생성 → Adobe 가공 (3) Figma 한도 리셋 후 값 눈대조 + STEP2 7섹션 컴포넌트(배경A+본품C 합성 포함).

---

## 2026-06-04 (2) S4 2단계 Figma 마스터 STEP1 완료 — Variables 69개 + 설계도 저장 (Desktop turn)

production HEAD 7a640b6 (Vercel READY, 코드 0). 직전 S4-2단계 설계 turn 후속 = Figma 실제 빌드.

**(1) Figma 마스터 파일 생성**: 8yuNcO8J9Pitt7glfr49Uw(꽃틔움 KKOTIUM — Concept Preset Master). Variables 69개 빌드 — Brand Core 3 + Concept Preset 60 + Intensity 6. 전 변수에 WEB 코드신택스 주입해 코드 [data-preset] 토큰과 1:1 대응.

**(2) starter 모드 제약 보정**: Figma starter 플랜은 컬렉션당 모드 1개 제한 → 원안의 "프리셋=모드 5개" 방식 불가. 프리셋을 모드가 아니라 변수 이름 그룹(preset/aroma/surface 등)으로 표현하는 보정안 채택. 코드 정합·단일 소스 추적 유지.

**(3) Code 블로커 Desktop 직접 해소**: 직전 turn Code가 "설계도 MD 본문 부재"로 task1 블로킹 보고 → Desktop이 Filesystem write_file로 docs/design/FIGMA_MASTER_BLUEPRINT_2026-06-04.md(신규) + README 보관표(신규 + 기존 누락 3건) 직접 저장. Code는 본 turn에서 sentinel grep 0건 검증 + 5 MD 핑퐁 + 커밋만 담당.

**(4) 호출 한도 이월**: Figma 값 최종 눈대조 + STEP2 7섹션 컴포넌트 빌드는 이번 turn 호출 한도로 다음 세션 이월.

**다음 (Desktop, 한도 리셋 후)**: 새 채팅 (1) Figma 값 최종 눈대조(aroma/surface=#F3EFE7, aroma/accent=#76864C 등) (2) STEP2 7섹션 컴포넌트 빌드(호출 묶음 처리).

---

## 2026-06-04 B+C 배포 검증 + Supabase 적용 + aroma 프리셋 + 하이브리드 디자인 원칙 확정 (Desktop turn, 코드 0)

production HEAD 6f02330. 이번 turn = 이전 두 Code 세션(채팅 B 프리셋 + 채팅 C 크롤옵션) 산출물 검증 + 배포 완결 + 디자인 하이브리드 진행 + MD 핑퍼 정리. 코드 변경 0건, Supabase UPDATE 2건(컬럼 적용 + aroma 적용).

**(1) 배포 검증 (Vercel MCP 실측)**: Code가 push한 3커밋 모두 production READY 단정 — 채팅 C(0f6d3be, 크롤옵션 매퍼+배선+backfill) + 채팅 B(5ea926e, 프리셋+빌더제거+schema 3컬럼) + 추가 누락분(6f02330, 단건 prefill 경로 POST /api/products 옵션 유실 수정 — 지난 turn 제가 '범위 밖'으로 남긴 부분을 Code가 마저 수정). production runtime logs 전수 200(notifications/dashboard/stats) → 신규 3컬럼 추가에 따른 Product 쿼리 회귀 0 실측 확정.

**(2) 코드 직독 검증 (로직 버그 0)**: batch-register/route.ts — 옵션 매핑이 $transaction으로 product.create + product_options.create + crawlLog.update 원자화, 옵션 없으면 hasOptions=false 자연 유지. backfill-options-from-crawl.ts — hasOptions===true OR product_options 존재 시 skip(명화 디퓨저 중복 INSERT 이중차단) + dry-run 기본 + upsert 멱등. 관찰: batch-register category:'uncategorized' 하드코딩 잔존(게이트는 naverCategoryCode 별도 컬럼 읽어 현재 무해, 정리 후보).

**(3) Supabase 프리셋 컬럼 적용**: execute_sql로 적용 전 빈 결과 확인 → apply_migration 20260603_add_concept_preset → information_schema 재조회로 concept_preset(VARCHAR20 def 'kitchen')/preset_intensity(VARCHAR10 def 'l1')/preset_overrides(jsonb) drift 0 단정. ADD COLUMN IF NOT EXISTS + default = backward-compatible(비가역 아님). 역순 배포 사고(컬럼 부재 시 Product 전 쿼리 500) 원천 차단.

**(4) 명화 디퓨저 aroma 적용**: cmpnooli40001f0gveaxr8iim 현재 상태 kitchen/l1 확인 → concept_preset='aroma'/preset_intensity='l3' UPDATE RETURNING 검증. DRAFT 상태 + 디자인 표현 컬럼(발행 데이터·가격·옵션 무관)라 비가역 아님.

**(5) ★ 영구 디자인 원칙(대표 확정)**: 상품 디자인은 한 방향이 아니라 여러 컨셉을 어우러지게 하이브리드로 진행해 감도 제고. 명화 디퓨저 상세페이지 = A(모네 수련 무드 배경) + C(정물 꽃 오브제 전경) 3겹 레이어링 v2 확정(myeonghwa_aroma_detail_v2_hybrid.html). 토큰 세이지 #76864C / 웜크림 #F3EFE7 / 테라코타 #B5694C가 concept-presets.ts aroma 정합.

**(6) 디자인 도구 파이프라인 확정**: S2 이미지(Adobe Firefly 1-click 생성=대표 수동, 소비자 플랜 API 부재+브라우저 자동화는 ToS 위반, 생성 이후 누끼·리사이즈·합성·DB 적재는 Adobe MCP 자동) → S3 기획(Claude 아티팩트, 완료) → S4 양산(Figma 마스터 우선, Canva 보조). Firefly 핸드오프 카드 HANDOFF_S2_firefly_myeonghwa_aroma_2026-06-03.md 작성(Met CC0 모네 다운로드 + 정물 오브제·향 3종 EN 프롬프트, 공통 네거티브 no human face/text/logo, Firefly Image 5 10크레딛 indemnified).

**(7) S4 전략 확정(대표 승인)**: Figma 마스터 템플릿 + concept-presets.ts 토큰↔Figma Variables 동기화로 양산 체계화. 핵심 = 코드와 디자인이 같은 토큰을 공유해 단일 소스화. 1단계(명화 디퓨저)=v2 HTML 기반 빠른 런칭, 2단계=Figma 마스터 구축(새 채팅). Canva는 시즌 이벤트·단발성 배너용.

검증: 배포 3커밋 READY 실측 / runtime 200 / Supabase drift 0 / aroma UPDATE RETURNING 확인. 비가역 0(register·POST mutate 실행 0건). SD-01 미접촉. 정직 보고: web_fetch로 production API 직접 호출 불가 → Vercel runtime logs로 대체(더 신뢰도 높은 실측). backfill dry-run은 Desktop 로컬 터미널 미가용으로 Code 위임(정직 한계 고지).

자동 typo 메모(다음 Code 정정 대상): TASK_BRIDGE 신규 entry의 '3커봇'→'3커밋' / '바꽈 점'→'바뀐 점' / '매경'→'배경' (edit_file 한글 변환 중 발생, 의미 전달에는 지장 없으나 sentinel 정리 권장).

다음 = 새 채팅#1(Figma 마스터+토큰 동기화) / 새 채팅#2(상품관리 자동화 화면 UI/UX 설계+브라우저 E2E). 이번 채팅 잔여 backfill dry-run은 아래 Code 붙여넣기 블록.

## 2026-06-03 크롤 옵션 변환 누락 수정 (crawl_logs → Product/product_options) [코드 완료] (Code turn)

권위: docs/handoff/HANDOFF_crawl_option_mapping_fix_2026-06-03.md. baseline 4c52141. 작업 전 grep으로 변환 라우트 특정 선행.

근본 원인 (Desktop DB 실측 확정 — 추측 아님): 명화 디퓨저(65322245) crawl_logs.options = 향 3종 [{레몬유칼립,9999,0},{에이프릴 후레쉬,9999,0},{블랙체리,9999,0}] 정상 저장. 그러나 Product.hasOptions=false / options=null / product_options 행 부재. 동적로딩·크롤실패 아님 — **승격(crawl_logs→Product) 변환 단계 options 매핑 누락**. 모든 옵션이 crawl_logs에 살아있어 재크롤 없이 복구 가능.

변환 라우트 grep 특정: crawl/batch-register/route.ts(crawlLog.findMany → product.create, 옵션 0 처리). product_options는 코드 어디서도 write 안 됨(register/route.ts·product-builder.ts는 read만, 명화는 Desktop 수동 INSERT). 단건 prefill 경로(crawl/page.tsx→products/new)는 client에서 옵션값 이름만 전달 + POST /api/products 옵션 미저장.

본 Code turn:
- **Fix1 공유 매퍼** src/lib/sources/crawl-option-mapper.ts(신규): mapCrawlOptions(raw, axisName?) → {productFields, productOptions} | null. productFields=Product 컬럼(hasOptions=true/optionName=축/optionType='COMBINATION'/optionValues=[names]/options=[{optionName1,optionValue1,stockQuantity,price}]). productOptions=product_options 행(option_type='COMBINATION'/option_names=[축]/option_rows=[{values:[name],stock,price,status:'ON_SALE'}]). 기본 축이름 DEFAULT_OPTION_AXIS='옵션'(도매매 selectOpt는 옵션값만, 그룹명 미제공 → 날조 금지 #46). normalizeCrawlOptions(raw jsonb 가드, name 없는 행 drop, qty 결측 999/addPrice 결측 0). 두 소비처 실측 대조: publish-readiness.ts(hasOptions→optionName non-empty + options non-empty array) + product-builder.ts buildOptionInfo(option_rows {values,stock,price}, status!=='SOLD_OUT'→usable) — 형식 정합 확인.
- **Fix2 변환 배선** crawl/batch-register/route.ts: mapCrawlOptions(item.options) → product.create에 ...mapped.productFields 스프레드 + mapped 있으면 product_options.create. product.create + product_options.create + crawlLog.update를 prisma.$transaction(interactive)으로 원자화(생성 id 참조 + 게이트/발행 페이로드 불일치 방지). 옵션 없으면 hasOptions=false 유지(단일 상품 §2-C).
- **Fix3 backfill** scripts/backfill-options-from-crawl.ts(신규, tsx 실행): crawl_logs(productId 링크) 스캔 → mapCrawlOptions 결과 있고 Product.hasOptions=false & product_options 없음 → Product.update + product_options.upsert(트랜잭션). dry-run 기본 + --apply 필요 + --limit. dedup: product_options 존재 OR hasOptions=true면 skip(+upsert 병행) = 명화 디퓨저 중복 INSERT 이중 차단. .env.local 수동 파싱 + new PrismaClient(기존 seed.js 패턴, 일회성 CLI). **prod mutate라 #41상 Desktop이 --apply 실행, Code는 dry-run도 미실행(register/mutate 금지)**.
- 스코프 명시(silent cap 방지): 단건 prefill 경로는 이미 client에서 qty/addPrice 소실 + POST /api/products 옵션 미저장이라 이번 변환 매핑 범위 밖(별도 turn 후보). 단 그 경로 상품도 crawl_logs.productId 링크 시 backfill로 복구됨.

검증: TSC 0 / npm run build 0(전 라우트 통과). 비가역 0(네이버 register·POST mutate·backfill 실행 0건). 새 npm 의존성 0. Prisma: src/ 매퍼는 순수함수(클라이언트 미사용), 스크립트만 CLI new PrismaClient. 한글 코드 리터럴: 데이터 기본값 '옵션' 1건(brand '꽃틔움'/manufacturer '도매매 공급사'와 동일 패턴 = 타입리터럴 아님, §3-1 무위반). SD-01 미접촉.

다음 = (Desktop) 신규 옵션 상품 크롤 → batch-register 승격 → Product.hasOptions=true + product_options 행 생성 + dryRun payloadPreview.optionCombinationCount>0 3-tier 재검증 → backfill dry-run 검토 후 --apply(명화 중복 0 확인).

## 2026-06-03 디자인 프리셋 시스템 코드화 + 빌더 흡수/제거 [코드 완료] (Code turn)

권위: docs/handoff/HANDOFF_MASTER_design_preset_builder_2026-06-03.md §3 + docs/design/{KKOTIUM_DESIGN_SYSTEM, CONCEPT_PRESET_SYSTEM, DETAIL_PAGE_PLAYBOOK}.md. baseline 4c52141. 작업 전 grep 현 상태 직독 선행(#41).

본 Code turn:
- **(1) DetailPageBuilder 흡수/제거**: src/components/products/DetailPageBuilder.tsx(구 6블록 빌더 E-1, 4월) 삭제. products/new/page.tsx: import(line 93) + detailBlocks state(line 505) + image탭 빌더 JSX(2916-2929) 제거. description 페이로드 체인 2곳(저장 POST + 발행 데이터) `detailBlocks.length>0 ? blocksToHtml(...) : detailImageUrl ? <img> : description` → `detailImageUrl ? <img> : (description||undefined)`로 단순화. detailBlocks 기본값이 빈 배열이라 실 데이터 흐름 손실 0.
- **흡수 확인(손실 방지 직독)**: Specs(사양 테이블)는 studio section-renderers(specTable.ts/spec.ts/specifications.ts)에 완전 존재 → 이전 불필요, 그대로 제거. Q&A는 빌더에 aeoContent={null}로 전달되던 dead-wire(자동 import 미배선) + 수동 HTML Q&A는 '상세 설명(텍스트)' 필드(HTML 허용, line 2944)로 작성 가능 → 하드 손실 0. SEO 훅문구(seoHook)는 빌더 외부 독립 필드라 무영향.
- image 탭 빌더 자리 → '상세페이지 자동화' 안내 카드(Palette/Layers Lucide 아이콘, setActiveTab('visual') 점프, 점선 핑크 박스)로 교체. 잔존 참조 grep 0건.
- **(2) 프리셋 시스템 코드화** (CONCEPT_PRESET_SYSTEM.md 구현, Phase A + B 착수):
  - src/lib/design/concept-presets.ts: ConceptPreset(aroma/gift/tradition/kitchen/pet) + PresetIntensity(l1/l2/l3) 타입 + PRESET_DEFINITIONS 5종(6요소: defaultIntensity/fontPairing/density/imageStyle/copyTone/layoutVariation + 참조 팔레트 hex) + 타입가드/normalize + recommendPreset(CategoryFamily → preset+intensity stub, 전체 4993 트리 매핑은 후속). 영어 상수만(#29 한글 리터럴 금지).
  - src/lib/design/section-variants.ts: 7섹션 DETAIL_SECTION_IDS(hook/value/spec/usage/trust/cta/notice, DETAIL_PAGE_PLAYBOOK §2 고정 순서) + 무의존 cva 스타일 defineVariants 팩토리(class-variance-authority 미설치 → 점진전략 §6-D 따라 자체 구현, 추후 cva 교체 무손실) + detailRootVariants/detailSectionVariants(intensity×emphasis 2축, Tailwind 임의값 클래스가 --preset-* 토큰 참조) + resolveDetailLayout(preset, intensity) → data-attrs + 섹션별 className(순서 불변, emphasis만 가변).
  - src/lib/i18n/concept-presets.ko.json: 프리셋/강도/섹션 한글 표시 라벨(렌더 레이어 전용).
  - src/app/globals.css: [data-preset="aroma|gift|tradition|kitchen|pet"] --preset-* 토큰 레이어 추가. ★ 전역 --color-* 셸 테마와 **격리**(SEO 직교 원칙 §7 — 프리셋은 상세 body만 제어, 앱 셸 미변경). :root 기본값=kitchen. 팔레트 hex는 PRESET_DEFINITIONS와 동기(상호 cross-reference 주석).
- **(3) Prisma**: Product 모델에 concept_preset(VARCHAR20 @default 'kitchen')/preset_intensity(VARCHAR10 @default 'l1')/preset_overrides(Json?) 추가(snake_case @map, return_care_enabled 패턴 동일). prisma/migrations/20260603_add_concept_preset/migration.sql 신규(멱등 ADD COLUMN IF NOT EXISTS, public."Product" 정확 테이블명). npx prisma generate 로컬 통과(DB 미접촉).
- SEO 가드: product-name-checker.ts 등 기존 검증기와 자연 분리 유지(프리셋 모듈은 SEO 미터치 = 직교). 신규 린터 미생성(과잉엔지니어링 금지 §6-D).

검증: TSC 0 / npm run build 0(/products/new 53kB 정상 빌드, 전 라우트 통과). 비가역 0(네이버 register/POST mutate 호출 0건). 새 npm 의존성 0(cva 자체 구현). SD-01 footer 미접촉. 한글 코드 리터럴 0(영어 상수 + i18n 분리). Prisma 싱글톤 무영향.

★ 순서 제약(Desktop 인계): schema.prisma의 신규 3컬럼이 Vercel 배포되면 production Supabase에 컬럼 부재 시 Product 전 쿼리(findMany 등)가 'column does not exist'로 깨짐. 따라서 **Desktop이 migration 20260603_add_concept_preset를 Supabase apply_migration으로 선행 적용**한 뒤에 push/배포해야 안전(작업원칙 #41 + schema line 75 기존 'Desktop ALTER 선행' 패턴). 본 turn은 commit/push 보류 — 대표/Desktop 결정 대기.

다음 = (Desktop) Supabase ALTER 적용 → push 안전 확인 → 채팅 A(명화 디퓨저 aroma L3 상세페이지 첫 레퍼런스, aroma 프리셋 실증) 진행 → 패턴 확정 후 7섹션 DOM 컴포넌트/이미지 렌더러 프리셋 배선(Phase B 잔여).

## 2026-06-02 UI/UX 2-MOBILE-3 [코드 완료] 모바일 폴리시 4건 + P1~P3 설계 (Code turn)

Desktop 검증 turn(2026-06-02) — UI/UX 출하 코드검증(WorkbenchShell) + 2-NAMING 툴팁 코드 확정 + 모바일 회귀 4건 진단(대표 휴대폰 스크린샷 + products/page.tsx 전문 + WorkbenchShell 교차) + P1~P3 설계. 코드 0 → Code 2-MOBILE-3 인계.

본 Code turn (baseline 0ebcd56):
- M1 src/components/layout/Header.tsx: 메인 행 px-5 gap-4 → px-3 lg:px-5 gap-2 lg:gap-4 + overflow-x-clip / 검색 div mx-5 → mx-2 lg:mx-5 + min-w-0 / 꽃티움 라벨 span에 hidden sm:inline. 데스크톱 sm+ 라벨 보존.
- M2 src/app/products/page.tsx 탭 컨테이너: overflow-hidden shrink-0 → overflow-x-auto w-full lg:w-auto lg:overflow-hidden shrink-0. 탭 button whitespace-nowrap 기존 유지.
- M3 src/app/products/page.tsx Toolbar 부모: flex items-center gap-3 flex-wrap → flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3 lg:flex-wrap / 검색 div: min-w-[180px] max-w-xs → w-full lg:min-w-[180px] lg:max-w-xs.
- M4 src/app/products/page.tsx BulkFloatMenu: fixed bottom-6 → fixed bottom-[84px] lg:bottom-6 (MobileTabBar 60px + safe-area 위) / inline minWidth:520 제거 → className lg:min-w-[520px] + style maxWidth:'calc(100vw - 24px)' / 내부 버튼 행 overflow-x-auto 추가. JSX 코멘트가 return( 직후 위치하여 TS1005 발생 → JS 주석으로 이동 (return 위) 단발 hotfix.
- 문서: docs/handoff/HANDOFF_mobile_polish_p1p3_2026-06-02.md 신규(P1 골든윈도우 가드 / P2 발행 관제탑 신호등 / P3 SEO 4중컬럼 수술, 실행순서 P0발행→P1→M병행→P2→P3). TASK_BRIDGE §3 ACTIVE NEXT 갱신(P0 달항아리 발행). PROGRESS/ROADMAP 헤더 동기화(stale 650c477 → 본 commit).

검증: TSC 0 / npm run build 0 / Vercel verify exit 0 / production /products HTTP 200 / 출하 chunk 단정 (flex-col gap-2 lg:flex-row · overflow-x-auto w-full lg:w-auto · bottom-[84px] lg:bottom-6 · lg:min-w-[520px] · calc(100vw - 24px)) / 한글 sentinel 0. 비가역 0 / 외부이미지 0(#38) / SD-01 footer 미접촉.

> **분할 메모 (2026-05-28, #31 여덟 번째 분할)**: 2026-05-15 ~ 2026-05-19 PM 이전 entry 9건은 `docs/plan/archive/SESSION_LOG_2026-05-19.md`로 동결. 본 파일은 직전 5세션(2026-05-20 ~ 2026-05-28) 라이브 유지.

## 2026-06-01 Lane 1 자동 SEO 파이프라인 [CLOSED] (B+C+D, Desktop 5소스 검증)

- 1-B (commit 4297486): SearchAd /keywordstool 검색량 신호 주입 + 의도가중(선물/집들이/이사/개업/결혼/신혼 ×2.0, 인테리어/디자인/장식 ×0.3) + n-gram 복합어(intent-suffix 집들이선물·이사선물·결혼선물·신혼선물 + 인접 2-gram 달항아리도어벨). VolumeSignal 시맨틱 분리 (sortApplied/keywordsChanged/titlePrefixInjected/topIntentKeyword).
- 1-C (commit 6446853): naver_title length-fill — finalScored 측정 풀에서 35-45자(TARGET_MIN/MAX)까지 충진, deboosted generic skip, titleAlreadyHas 토큰 anti-stuffing, 50자 HARD_CAP. 3-style 실측: orthodox 18→36자 / emotional 21→40자 / niche 23→37자(이미 임계 이상, fill 미발동 정상). titleLengthFilled + finalTitleLength 시그널.
- 1-D (commits 6535e0c + 0712b9a): Product.name overwrite 제거(POST line 658 / PUT line 715) — 원본 정체성 보존, 재실행 오염 차단. seoTitle dual-column 발견(schema에 seo_title snake + seoTitle camel 동시 존재, publish-readiness는 seoTitle 검사) → 라우트 양쪽 동시 갱신. seo_title 최종 일관성(volumesAvailable 무관 mirror).
- Desktop 5소스 검증(production 6535e0c→0712b9a 2회 ai-generate 실 productId 호출): Product.name 41자 원본 불변 ✓ / naver_title 36자 갱신 ✓ / seo_title=seoTitle 36자 일관 ✓ / DRAFT·naverProductId=null ✓ / publish-readiness 4축 true 유지 ✓. Code 보고 100% 정합.
- ROADMAP 분할 (commit 8e60a0a, #31 임계 해소): 2119줄 → 288줄. archive/ROADMAP_2026-05_part2.md 1842줄 신규 (SUPERSEDED 24+건 + 직전 인계 + Session E 디테일). 한글 sentinel grep 실제 오타 0.
- 신규 기술부채 등록 (TECH_DEBT.md): DEBT-01 SEO 필드 이중계열(title 4중 / keywords 4중 / desc 2중, 현재 라우트 mirror 동작 정상, 발행 후 수술 권고). DEBT-02 prisma name 필드 다모델 중복.
- 비가역 0(DRAFT 유지, 네이버 미발행). SD-01 무접촉. 런타임 외부 이미지 0(#38). 거짓 라벨 0(#46). Prisma 싱글톤. heredoc 0(#26). 한글 코드 리터럴 0(영어 코멘트만).
- 다음 = Lane 2(Adobe 이미지 생성 파이프라인) 설계 OR 달항아리 발행(대표 승인). 달항아리 전축 GREEN: 디자인3종+상세진위+네이버고시+badge SSOT+SEO자동값+정체성보존.

## 2026-05-31 Track B — 상세 환각제거+진위게이트 [CLOSED] + 네이버정보 NULL 발견 (Desktop 6소스 검증)

- 환각제거(66f742a/650c477): groundedFacts 구조로 generateSpecRows/Story 결정론화. spec 허위 5건
  (유리/금속·크기·무게·세계인증·세계적브랜드) 행 삭제, story 향어휘 제거. publish-readiness 진위게이트 신규.
- Desktop 6소스 교차검증: Vercel(650c477 READY) + 새 detail PNG 픽셀(spec 결정론 중국/형태/꽃틔움, 향0)
  + GET publish-readiness(authentic=true) + DB + Storage + 비가역0. Code 보고 100% 정합.
- ★ 신규 발견(발행 차단): naver_* 페이로드 17필드 전부 NULL(material/origin/manufacturer/as_info/tax_type 등).
  authentic 게이트는 PNG만 검사, 네이버 전송정보 미검사 → publishReady=true 또 거짓신호.
  대표 지시 "정보까지 제대로 적용돼야 발행" → 상품정보제공고시 충진이 발행 선결로 확정.
- 다음: 네이버 정보 충진(groundedFacts 재사용, 허위0) + 게이트 naverPayloadComplete 축 추가.

## 2026-05-30 Track B — 달항아리 단품 복구 [CLOSED] (Code 적재 + Desktop 4소스 교차검증)

- M1~M4: getItemDetail(63860451) 재크롤(화보 0, thumb 760×760) → 1000 패딩(원본 픽셀 보존 #46) → Storage 적재 + Product UPDATE → 3-pass 진단.
- 실측: grade L4→L2(qualityScore 37.3→55.7 +18.4), pFilterGrade null→L1, skeletonId S6 안정, legalGate passed, DRAFT 보존.
- Desktop 교차검증: Product/storage.objects/Diagnosis 3소스 + 비가역 0 = Code 보고 100% 정합. 거짓라벨 0(#46).
- 정정: crawl_logs stt_330=썸네일 변형, 실제 thumb 760×760(직전 "330px 저해상" 부분 오류 정정).
- baseline c0d7b12 유지(데이터+Storage만, prisma db pull diff 390+/296-는 순수 reformat=의미변경 0 → 별도 chore commit 위임).

## 2026-05-30 Track B Phase 3 운영 경화(B 분기) 교차검증 [CLOSED] (Desktop turn, 코드 0)

- 목적: Code Phase 3 운영 경화(게이트 비동기 분리 + review 큐 Discord 알림)를 Desktop 검증 트랙(#41/#45) raw 교차검증. 보고 헤더 불신, 실측 우선(#46).
- **A/B 분기 결정 = B**: .env.local에 ADOBE_CLIENT_ID/SECRET 부재 → item 3(firefly-generate.ts) **정직 보류(#46)**, 운영 경화(item 1·2)만 진행. A 분기(완전 무인 생성)는 Vercel ENV에 ADOBE 키 추가 + 영업 견적 후 별도 sprint.
- **Phase 3 운영 경화 (Code push c0d7b12) — 교차검증 통과**:
  1. backdrop-job-state.ts(신규) raw read: **markReview SSOT** — status=review DB write + OPS_REPORT Discord 알림 원자적. ReviewStage 라벨(fetch/decode/upload/vlm-reject/vlm-error/classify-missing-stage/auto-cache-miss). **fire-and-forget**(webhook 실패가 요청 절대 차단 안 함), DB·alert 독립 try/catch.
  2. classify 라우트(신규) raw read: **409 가드**(classifying 아니면 거부) → staged 다운로드 → VLM → pass:고정경로 적재+staged 삭제+auto-cache probe→done / fail:staged 삭제+review.
  3. ingest async 분기 raw read: asyncGate=true→스테이지 적재(_staging/{jobId}.png = resolver 스캔 경로 외 → backdrop 오염 0)+status=classifying / default false→**기존 sync 100% 호환**. markReview 일원화(양 라우트 5+호출 공통 helper+stage 라벨).
  4. DB backdrop_jobs Supabase 실조회: classifying/review/done 전부 0 — Code 테스트 완전 원상복구(비가역 0).
  5. production POST /api/backdrop/classify → 400 'jobId is required'(라우트 등록 확인).
  - Code 통합검증 재확인: Discord OPS_REPORT 도달성(sendDiscord 204) + ASYNC NEGATIVE(asyncGate→classifying→classify→review/거부) + ASYNC POSITIVE(→done/autoCacheHit) + 409 guard + CLEANUP.
- 해소된 설계 경계 2건(이전 turn 지적): [1] 게이트 비동기 분리 → classify 라우트로 60초 타임아웃 회피 ✅ [2] fail-closed 무음 정지 → OPS_REPORT 알림으로 가시화 ✅.
- 비가역 0(네이버 미발행, DRAFT). SD-01 무접촉. #38 유지(생성 없음, 분류만). service-role 서버전용. Prisma 싱글톤. MCP 행 0회.
- **다음 = Phase 3 분기 A 게이트 = Adobe 영업 견적**: 견적 확보 시 firefly-generate.ts(OAuth S2S 23h 캐시 + generate-async + statusUrl 폴링) → 워커가 status=pending→generating 픽업→generate→presigned→classify 재사용. 즉시 잔무: 아이스트레이 backdrop(S1) real-win 1건(Code 실파일 enqueue→ingest).

## 2026-05-30 Track B Phase 1+2 무인 적재 spine + VLM 게이트 교차검증 [CLOSED] (Desktop turn, 코드 0)

- 목적: Firefly 마지막 수작업(배경 생성) 무인화 요구에 대한 심층 리서치 후, Code가 구축한 Phase 1 spine + Phase 2 VLM 게이트를 Desktop 검증 트랙(#41/#45)으로 raw 교차검증. 보고 헤더 불신, 실측 우선(#46).
- **아키텍처 결정 (리서치 docs/research/FIREFLY_AUTOMATION_RESEARCH_2026-05-30.md)**: "Firefly 생성까지 브라우저 무인 자동화" = Adobe 약관상 스크립트 자동화 금지 + 단일 계정 정지 리스크로 **반려**. 소비자 구독은 API 권한 없음(Firefly Services API=엔터프라이즈 50석/3년/월$1,000+). 채택=생성은 사람 1클릭, 그 이후 다운로드·VLM 판별·service-role 적재·auto-cache 검증 전구간 무인.
- **Phase 1 무인 적재 spine (Code push 5346635) — 6/6 교차검증 통과**:
  1. 신규 코드 4파일 raw read: backdrop-prompt-builder.ts(순수함수 IO 0, negativePrompt 'people,humans,product,text,watermark', stableSeed FNV 결정론), upload-backdrop-server.ts(service-role 서버전용 + skeletonId 새니타이즈 경로탈출 차단 + upsert 멱등), enqueue/ingest route(Prisma 싱글톤, #38 생성API 0).
  2. DB backdrop_jobs Supabase 실조회: 11컴럼(id/product_id/skeleton_id/base_tone/firefly_request jsonb/status/output_url/storage_path/error/created_at/updated_at).
  3. 인덱스 2(product_id/status) + status CHECK 6-state(pending|generating|classifying|uploaded|done|review).
  4. production POST /api/backdrop/enqueue -> 400 'productId is required'(라우트 등록 확인), /api/backdrop/ingest -> 400 'jobId is required'.
  5. Code 통합테스트 재확인(샘플 PNG -> enqueue -> ingest -> thumbnail auto-cache 전환 -> Storage/DB 정리).
  6. 불변식: service-role 클라이언트 import 0, findCachedAsset resolver 동일 함수.
  - 발견(설계 경계): enqueue는 conceptTone(diagnose 선행) 없으면 400 — 숨은 사람 개입 지점. Phase 2 체이닝으로 해소.
- **Phase 2 VLM 게이트 + diagnose 체이닝 (Code push 0d188f0) — 5/5 교차검증 통과**:
  1. backdrop-vlm-gate.ts raw read: Groq Llama 4 Scout(meta-llama/llama-4-scout-17b-16e-instruct) 멀티모달 + response_format json_object + temperature 0 + 4-axis AND(is_empty && !person && !product && !text). **fail-closed**(키없음/네트워크/파싱실패 전부 review). 1KB 미만 cheap 프리필터. pickGroqKey 라운드로빈 재사용(Gemini/Perplexity 0, AI chain 정합).
  2. ingest 수정 raw read: sharp 정규화 직후 classifyBackdrop 게이트 삽입 -> !passed면 적재 스킵 + status=review + uploaded:false(Storage 무오염).
  3. diagnose 체이닝 raw read: autoEnqueueBackdrop 옵트인 + persist 성공 후 backdrop_jobs 자동 생성, **non-fatal**(실패해도 diagnose 200, backdropJobId/backdropEnqueueError 분리). 갓 추론한 conceptTone 재사용으로 400 경계 해소.
  4. DB backdrop_jobs Supabase 실조회: live/review/done 전부 0 — Code 테스트 완전 원상복구(비가역 0 입증).
  - Code 통합검증 재확인: NEGATIVE(아이스트레이 합성사진 손+제품 -> passed:false 정확 거부) + POSITIVE(명화송풍구 sunlit backdrop -> passed:true/done) + CHAINING(diagnose -> backdropJobId) + CLEANUP.
- 짚은 설계 경계 2건(Phase 3 필수): [1] 게이트 비동기 분리(classifying status 실사용 — 현 ingest는 동기 done 직행, 60초 타임아웃 리스크) [2] review 큐 모니터링(fail-closed 무음 정지 방지 — Discord 알림).
- 비가역 0(네이버 미발행, DRAFT). SD-01 무접촉. #38 유지(생성=spine 외부). MCP 행 0회.
- 즉시 운영 잔무: 아이스트레이 backdrop(S1, icetray_backdrop_S1.png 1024x1024 대표 생성 완료, 채팅 업로드됨) real-win 1건 — Code 세션에서 실파일 enqueue->ingest.
- 다음: Phase 3 분기 결정(Adobe Firefly Services API 영업 견적) — A(확보)=generate-async 워커 무인생성 승급 / B(미확보)=운영 경화만(게이트 비동기+review 알림).

## 2026-05-30 Track B G8 명화송풍구 backdrop 적재 + 라우터 모델 격상 교차검증 [CLOSED] (Desktop turn, 코드 0)

- 목적: Code가 보고한 [1] 라우터 격상(commit 4e3c543) + [2] backdrop 적재를 Desktop 검증 트랙(#41/#45)으로 raw 교차검증. API 200 보고 불신, 실측 우선(#46).
- 브라우저 MCP 자동화 실증(이번 세션 Desktop): Firefly 웹 직접 조작 -> 파트너 모델 드롭다운에서 Firefly Image 5 -> Gemini 3 Nano Banana Pro 격상 -> sunlit oak desk 배경 생성(동일 프롬프트 3회 A/B, Pro 모델 최종 채택) -> ~/Downloads 다운로드. art_director_prompts adp_myeonghwa_lifestyle_s6_001 model=gemini/gemini-3-nano-banana-pro/seed 760042026 lineage 기록.
- 검증 6/6 전수 실측 통과:
  1. 라우터 코드(adobe-tool-router.ts) raw read: foreign-cinematic-sunlit -> gemini-3-nano-banana-pro/creator-liable, foreign-cinematic/modern-minimal firefly-image-5 회귀 0, clean/badge/price 면책 불변.
  2. production POST /api/thumbnail/cmpnooli4: adobeWorkflow.lifestyle.model=gemini-3-nano-banana-pro/creator-liable, clean/badge=firefly-image-5/adobe-indemnified.
  3. assetSource.backdrop fallback -> auto-cache 전환.
  4. skeletonId=S6 / baseTone=foreign-cinematic-sunlit / legalGate.passed=true(master_pd 우회).
  5. Storage 객체 DB 실재: product-assets/cmpnooli40001f0gveaxr8iim/backdrop-S6.png 1,137,425 bytes(1.08MB)/image／png/1024², 적재 시각 2026-05-30 03:26 UTC.
  6. lifestyle 픽셀 육안(Chrome): 4변형 중 lifestyle만 따뜻한 우드 책상+창가 햇살 보케(Nano Banana Pro 씬) + 명화송풍구 4세트 합성 + 한글 캐션 Pretendard 정상. 나머지 3변형 흰배경(브랜드색 cyclorama 폐기).
- 정정 기록(#46): Code 보고 matchScore 75 vs Desktop production 실측 62.5 — 결론(S6) 동일, 실측값이 진실.
- 아키텍처 원칙: 앱은 이미지 생성 안 함(추천 spec만) — 런타임 외부 이미지 API 호출 0(#38) 유지, GEMINI 키 추가 없음. 생성은 오프라인 브라우저/MCP, 결과물만 Storage 적재->엔진 소비.
- 비가역 0(DRAFT, 네이버 미발행). SD-01 무접촉. 명화송풍구 cutout은 아직 fallback(누끼 미적재, 선택).
- iterm/Chrome MCP 4분 행 1회 발생(#26 패턴, 세션 후반) -> 재시도 없이 경량 probe 후 재개, 정상 복구.
- 다음: 아이스트레이/달항아리도 동일 파이프라인(production 실호출로 skeletonId 실측 -> Firefly／Nano Banana 배경 -> 적재) 확장. 또는 명화송풍구 cutout 적재로 차별화 극대화.

## 2026-05-28 Track B G8-ENGINE-Q1 썸네일 아트디렉션 품질 격상 (Code turn, push 597f3ee)

- baseline eb72b9e. SCOPE 5개 중 4개 코드 완료(item4 Pretendard 별도 위임). docs 2건 + 코드 commit 3건.
- item1 (1ea8dab 동봉) thumbnail-art-direction.ts: pickArtDirection(conceptTone) -> {palette(topRgb/floorRgb/accent/spotlight), productScale, typeScale, spotlightStrength, vignette, horizon}. 팔레트는 실제 ColorMood enum(warm/calm/vivid/mono)에 키잉, 기본 warm. 보조축은 실제 enum으로 정정: pricePosition budget(스포트+0.08)/premium(저채도 desaturate+여백+vignette), emotionalTone friendly(소프트 cap)/professional·trust(vignette+집중)/sensory, persona senior(typeScale x1.15), genre minimal(productScale x0.9). 핸드오프의 luxury/pastel/elegant는 실제 타입에 없어 미사용(#46 정정).
- item2+5 (1ea8dab) sharp-composite: renderSweep/renderRadialGlow/renderEllipseShadow/makeReflection/applyEdgeVignette 신규. thumbnail-generator buildProductScene: 스윕(or lifestyle backdrop)+스포트(스윕만)+접지 2겹(캐스트 blur22+컨택트 blur8)+바닥 반사(flip+alpha fade)+제품. clean=텍스트/워터마크 0. price/badge=accent pill/chip(typeScale). lifestyle=backdrop 우선+헤드라인. 미사용 PRODUCT_SLOT/OFFSET 제거.
- item3 (597f3ee) route: 이미 Diagnosis.conceptTone 조회->req 전달, generator가 pickArtDirection 파생. 응답에 artDirection echo(colorMood/palette/scale/spot/vignette) 추가.
- production smoke 실측: POST /api/thumbnail/cmpp62yje00015xup5h8pgwx0 {} -> 200, 4변형(clean 114300/price 117996/badge 116984/lifestyle 106072 base64) errors:[]. clean copy={} (텍스트0 정책 준수). artDirection.colorMood=warm, palette accent #D6965A(warm 정합), productScale 0.9(minimal), typeScale 1.15(senior), spotlight 0.42(friendly cap), vignette false. assetSource{cutout:fallback,backdrop:fallback} + lowResolution{760,760,760} 회귀 0.
- item4 Pretendard 폰트 번들 미완료(정직 플래그): 폰트 바이너리 에셋이 repo/네트워크에 없고, Vercel Sharp(librsvg) fontconfig 설치는 별도 인프라 작업이며, curl로 글리프 폰트 육안 검증 불가 -> #46상 "완료" 단정 불가. 현 SVG font-family는 Pretendard 우선 스택 유지(환경 미설치 시 시스템 폴백). 별도 검증 단계로 위임.
- 비가역 0(Supabase 미적재, 네이버 미발행). SD-01 무접촉.
- 다음: Desktop E2E 육안 재검증(프리미엄 크래프트 + warm 팔레트 + clean 텍스트0) + 누끼 Storage 적재로 차별화 극대화 -> Real Win(Firefly 씬 backdrop 적재).

## 2026-05-28 Track B G8-ENGINE 이미지 엔진 구축 (Code turn, push 5a169c7)

- baseline 08795bb. 5개 SCOPE 전부 코드 완료 + production smoke 통과.
- item1 (9f5b6a4) asset-source-resolver.ts 신규: resolveAssetSources -> {cutoutUrl, backdropUrl, cutoutSource, backdropSource}, 우선순위 manual>auto-cache(Storage)>fallback. automation-storage.ts findCachedAsset(productId, fileName) graceful(오류/미존재->null).
- item2+4 (b6eed29) thumbnail-generator: ThumbnailRequest.cutoutUrl 추가, loadProductFitted 공유 로더(cutout 투명패딩 합성/없으면 fitImage fallback) 4 renderer 적용. route: matchSkeleton로 skeletonId 결정(생성기와 동일 순수로직) -> resolveAssetSources 배선 -> req.cutoutUrl 주입, backdrop 우선순위 manual>Storage캐시>lifestyle-picker>브랜드색, 응답 assetSource{cutout,backdrop}.
- item3 (4063a0f) studio/PLANT 공용 useStudioActions에 manualCutoutUrl/manualBackdropUrl 상태+setter(productId 변경 시 리셋), runThumbnail이 비어있지 않을 때만 body 전달. ThumbnailCard 누끼/배경 URL 입력 2칸(옵셔널 props->PLANT 비파손) + assetSource 소스 뱃지. types.ts AssetSourceLiteral. studio + products/new 양 페이지 props 전달.
- item5 (5a169c7) 저화질 가드: 생성 전 제품 소스 1회 probe, 긴 변 <=760px이면 lowResolution 플래그(non-fatal). route 응답 + ThumbnailCard 경고 배너.
- production smoke 실측: /studio /products/new 200. POST /api/thumbnail/cmpp62yje00015xup5h8pgwx0 {} -> 200, skeletonId S1, 4변형(clean 136984 / price 132012 / badge 135568 / lifestyle 89692 base64) errors:[]. assetSource{cutout:fallback,backdrop:fallback}(Storage 누끼 미적재라 정확히 fallback, fitImage 폴백 동작 = 회귀 0). lowResolution{760,760,760} 가드 발동.
- 비가역 0(Supabase 미적재, 네이버 미발행). SD-01 무접촉.
- 다음: Desktop이 Adobe 누끼 PNG를 Storage product-assets/{id}/cutout.png 적재 -> production E2E(4변형 차별화 육안 + save-assets DB) 재검증.

## 2026-05-28 Track B G8-ENGINE 디자인 라인 실증 (Desktop turn, 코드 0)

- baseline 08795bb. 확정 동선 6단계 실 MCP 호출 전수 검증. 표본 아이스트레이(cmpp62yje00015xup5h8pgwx0).
- 1단계 다운로드: 도매꾹 CDN760 원본 Referer=domeggook.com 헤더로 hotlink 우회 -> /home/claude 다운로드 760x760 http 200.
- 2단계 Adobe CC 업로드: asset_initialize_file_upload(path 상대경로) -> 청크 PUT 200(106196 bytes) -> asset_finalize_file_upload -> presignedAssetUrl 획득. egress enabled 환경 정합.
- 3단계 누끼: image_remove_background(presignedAssetUrl) success:true 투명 PNG 760x760. 투명 플라스틱 경계 깔끔 + 초록 뚜껑 + 손 보존 + 주변 소품 제거. rembg 대비 품질 우위 육안 확인.
- 4단계 GenAIAsset: asset_search(GenAIAsset) totalHits:0 (경로 정상, 대표 Firefly 웹 생성물 현재 0건).
- 5/6단계 합성: 컨테이너 Pillow + Noto Sans CJK로 4변형(clean 무텍스트=대표이미지 후보 / price 가격pill / badge 카테고리리본 / lifestyle 웜그라데이션+그림자+한글헤더). 브랜드 프리셋(Red #E62310 / Pink #FFCCEA). 배경/구성/소구점 명백히 차별화 -> G8 진단의 "4변형 거의 동일" 결함 해소 증명.
- 아키텍처 발견: (1) Adobe Express MCP는 외부 누끼 PNG 템플릿 합성 불가 -> production 합성엔진은 서버 Sharp 유지가 정답. (2) image_remove_background는 Adobe CC presignedAssetUrl만 허용(도매꾹 CDN/Supabase public URL 거부). -> Phase G8-ENGINE = nukki-adapter(Adobe 누끼->Storage 캐시) + backdrop-source + Sharp 합성기 통합 확정.
- 실측 정정: /mnt/user-data/uploads 읽기전용 -> /home/claude 스크래치 사용(다음 세션 기본).
- 비가역 0(Supabase 미저장, 네이버 미발행, 데모는 컨테이너에만). SD-01 무접촉.
- 다음: Code Phase G8-ENGINE.

## 2026-05-28 Track B G8-FIX 회귀 3건 수리 (Code turn, push 2c7da13)

- baseline fef5c84. 작은 commit 3건 + docs 2건.
- Fix 1 (9aea547) 진단 CDN 500: 신규 src/lib/image-fetch-headers.ts (host 조건부 Referer/UA, domeggook만, Supabase/Cloudinary엔 빈 객체) -> p-filter/image-quality/sharp-composite 동일 헬퍼 사용. production POST /api/diagnose {persist:false} 200 + CDN760 실분석(resolution 760x760, blur 205.8, WB cool 0.132 산출) 실증.
- 실측 정정: 핸드오프의 "diagnose를 fetchImageBuffer Referer 경로와 정렬" 전제는 부정확. 셋 다 bare fetch였고 Referer/UA가 어디에도 없었음 -> 공유 헬퍼로 진짜 정렬.
- Fix 2 (4d18170) [object Object]: useStudioActions responseError(json,status) + toMessage(err) 헬퍼 -> throw 5곳/catch 6곳 정규화. 카드 3종은 훅 error 문자열 표면화이므로 동시 해소.
- Fix 3 (2c7da13) ?product= prefill skip: studio/page.tsx setSelectedId 함수형 갱신(prev ?? list[0].id) -> URL prefill을 stale closure가 클로버하지 않음.
- 검증: 각 단계 TSC 0 / build 0. push 후 verify-vercel-deploy.sh --wait exit 0 (production 2c7da13). /studio /dashboard 200.
- 비가역 0(persist:false로 Diagnosis row 미기록, 네이버 미발행). SD-01 무접촉.
- 다음: Desktop 새 채팅 production UI 재검증(prefill 보존/진단 정상/에러 명확) -> 통과 시 Phase G8-ENGINE.

## 2026-05-28 Track B G8 이미지 엔진 근본 진단 (Desktop turn, 코드 0)

- 표본 아이스트레이(cmpp62yje00015xup5h8pgwx0) /studio 정주행 검증.
- before 단정: main_image_url=null, detail_image_url=null, status=DRAFT, mainImage=도매꾹 CDN760.
- 발견 1: 진단 500 — 도매꾹 CDN 직접 fetch 차단(P-Filter). 같은 원본으로 썸네일 생성은 성공(fetch 경로 차이).
- 발견 2: 썸네일 4변형 거의 동일 — thumbnail-generator.ts 누끼/배경 부재(Cloudinary 401 우회 고착). 차이가 텍스트 오버레이뿐.
- 발견 3: studio ?product= URL prefill skip — 목록 최신순 첫항목(달항아리) 덮어씀. 수동 클릭(ref)은 정상.
- 발견 4: [object Object] 에러 직렬화 결함(#46 인접).
- save-assets 라우트 해부: base64->Storage->DB UPDATE, 무거운 합성 없음(#26 무관) 확인.
- 확정 방향: Source Priority Resolver(A 자동 엔진 + B 수동 오버라이드 통합).
- 비가역 0(더미 저장 안 함). SD-01 아랍어 footer 보존 확인(studio 하단 노출 유지).
- 다음: Code Phase G8-FIX -> Phase G8-ENGINE.

## 2026-05-28 Track B G7 [CLOSED] + E1~E3 [CLOSED] (userId FK fix 재검증 통과, Desktop turn, 코드 변경 0)

### 본 turn 성격

Desktop이 baseline 17143f0 production에서 G7(userId FK fix) + E1~E3(엑셀 88칸)을 실측 재검증하여 통과 단정. Code는 docs only 반영(코드 변경 0). 비가역 0.

### G7 재검증 (production 실측, 17143f0)

- 36904429(아이스트레이) 등록시작 -> 네이버 엑셀 다운로드 -> POST /api/products **200** (이전 500에서 해소)
- 새 DRAFT row cmpp62yje00015xup5h8pgwx0 88필드 정합: sku=KKT-1779953038280(자동생성) / status=DRAFT(ACTIVE 교정) / userId=cmmklnrcs0000im0q5trp9qkr(실제값, 'default' 교정) / supplierId 실제 / naverCategoryCode=50005257 / salePrice=13900 / margin=42.59 / originCode=200037
- userId/supplierId FK 검증 fix(17143f0) + SKU 자동발급(1aa5969) 실효 확정

### E1~E3 재검증 (다운로드 엑셀)

- naver_KKT-1779953038280_2026-05-28.xlsx = 93컬럼 양식, 41 핵심칸 정확: 판매자코드 / 카테고리코드(50005257) / 상품명 / 판매가(13900) / 옵션값 4종 / 원산지(200037) / 배송 CJGLS 조건부무료 / 고시템플릿(2976841) / 리뷰포인트 / 구매평노출
- 빈 칸은 선택항목(단위가격/추가상품/상세설명/제조일자 등) = 정상

### originCode 오진 최종 정정

- DB 3 row 대조: 정상 row(아이스트레이/명화송풍구) = 200037(6자리), 오염 row(달항아리 category=uncategorized) = 0200037(7자리)
- 단정: 200037(6자리)이 정상값(naver-origin-codes.ts 정합), 0200037(7자리)이 오염값. Code 무변경 판단 확정. 별도 핸드오프 불필요.

### 핸드오프 CLOSED

- HANDOFF_g7_userid_fk_violation_2026-05-28.md -> [CLOSED 2026-05-28 Desktop]
- HANDOFF_g7_sku_empty_unique_2026-05-28.md -> [CLOSED] (Code 이전 turn 확인)
- 동 turn 누적 CLOSED 마킹 반영: crawler_desc_contents_type / crawl_logs_insert_await / g5_prefill_deficit_price / plant_header_duplicate_buttons

### stale fact 정정 (#44)

- PROGRESS "8개 DRAFT" -> 실제 3건(명화송풍구 / 달항아리 / 아이스트레이 신규). D-1 헤더에 반영

### 다음

- G8 이미지 파이프라인(/studio 또는 PLANT 비주얼탭, 아이스트레이 DRAFT 표본, Sharp 5000~7000px #26 주의) 새 채팅
- 통과 시 Track A 명화송풍구 B-12 발행(대표 승인 후 별도 채팅)

### 적용 작업원칙

#29 · #31 · #41 · #44 · #45 · #46

---

## 2026-05-28 G7 userId 'default' Foreign Key 위반 fix (Code turn, SKU fix 후속, P0)

### 본 turn 성격

Desktop이 SKU fix(1aa5969)를 production 검증(probe 자동 SKU KKT-260528-E0XLYA 확인)한 뒤, 엑셀 다운로드 DRAFT 저장이 여전히 500인 잔존 P0(userId FK 위반)를 Code가 1-commit 수정. SKU 핸드오프는 [CLOSED].

### 근본 원인

UI(`products/new/page.tsx` handleGenerate)가 userId에 리터럴 'default'(DB에 없는 가짜 ID)를 전송. `route.ts` POST의 userId resolve가 빈 값일 때만 findFirst fallback하고 'default' 같은 truthy 무효 문자열은 그대로 통과 -> `prisma.product.create` Product_userId_fkey 위반 -> 엑셀 다운로드 저장 100% 500. probe(userId 미전송)는 200이라 fallback이 빈 값만 처리함을 대조 단정.

### 코드 변경 (2 파일 +30/-7, commit 17143f0)

- Fix A (`route.ts` POST): userId/supplierId를 findUnique로 실재 검증 후 미존재('default' 포함)면 findFirst fallback. supplierId도 동일 패턴(Fix C 점검 통합).
- Fix B (`page.tsx` handleGenerate): userId='default' 하드코딩 제거(미전송 -> route가 실제 유저 매핑) + status ACTIVE->DRAFT(엑셀 다운로드는 임시저장 동선).
- originCode: 핸드오프 §2-2(b)의 '0200037 7자리 정상' 전제는 프로젝트 데이터셋(`naver-origin-codes.ts` line 332 중국=200037 6자리)과 모순되는 오진. 0200037로 바꾸면 `ORIGIN_CODES.find` 매칭이 깨져 UI 원산지 라벨 손실 -> 무변경(현 200037이 정상). 거짓 주석 미도입(#44/#46).

### 검증

- npx tsc --noEmit 0 errors
- npm run build exit 0
- 구조적 보장: userId='default' -> findUnique null -> findFirst 실제 user id -> FK 위반 불가(supplierId 동일). 라이브 200 재현은 원격 공유 DB 오염 회피 위해 Desktop G7 재검증에 위임(#46)
- 한글 typo sentinel grep 0 hits (코드 파일)
- git push 17143f0 -> verify-vercel-deploy.sh exit 0 (production on 17143f0)
- SD-01 영구 보존

### 적용 작업원칙

#17 · #21 · #24 · #28 · #29 · #32 · #36 · #41 · #44 · #45 · #46

### 다음

g7_userid_fk 핸드오프 OPEN 유지. Desktop이 36904429로 G7 재검증(POST /api/products 200 + DRAFT row + userId 실제값 + status=DRAFT + Supabase 88필드 매핑) -> 통과 시 [CLOSED] -> G8(이미지) -> E1~E3(엑셀 88칸).

---

## 2026-05-28 Track B G2 d3 [CLOSED] + G7 빈 SKU unique fix (Code turn, P0)

### 본 turn 성격

Desktop이 e1c6fd6 production 실측으로 G2 d3 재검증을 통과시켜 G2 핸드오프 2건을 [CLOSED]한 뒤, G7 88필드 DRAFT 정주행에서 격리한 P0 회귀(빈 SKU unique 충돌)를 Code가 1-commit 수정.

### G2 d3 재검증 결과 (Desktop, [CLOSED])

e1c6fd6 실측: suggest API 유령 triple(그릇장/컵보드) 소멸 (d3="" 정규화, usedAI:true 재계산), 화면 d1/d2 자동입력 (생활/건강>주방용품) + partial 배너 + invalid_triple 소멸, 소분류 수동선택 -> 카테고리코드 50005257 chip, 준비도 38->52%. HANDOFF_g2_suggest_d3_mismatch + HANDOFF_g2_category_prefill_skip 2건 [CLOSED].

### G7 회귀 근본 원인

`src/app/api/products/route.ts` POST가 `sku: String(data.sku || '')`로 빈 SKU를 빈 문자열 '' 저장. sku 컬럼은 unique이고 ''도 단일 값이라 2번째 SKU 미입력 상품 INSERT가 'Unique constraint failed on (sku)' 500. 기존 명화송풍구(cmpnooli40001f0gveaxr8iim) sku='' 1건이 '' slot 점유. SKU 미입력 상품 2번째부터 저장 100% 실패(P0). POST /api/naver/excel는 200(엑셀 엔진 정상). 비가역 0(probe 저장도 500 = DB 무변경).

### 코드 변경 (3 파일 +87/-31, commit 1aa5969)

- Fix A: `src/lib/sku-engine.ts` 신설 — 공통 collision-safe SKU 엔진(buildFallbackSku + generateUniqueSku). 빈 productNo면 KKT-YYMMDD-RAND fallback, 충돌 시 suffix 증분 -> 반환값 항상 non-empty + unique. `generate-sku/route.ts`는 이 엔진에 위임(DRY).
- Fix A: `products/route.ts` POST가 빈 SKU 시 generateUniqueSku로 자동발급(supplier_product_code/productNo 기반).
- Fix C: create payload에 taxType/description/keywords/tags/shipping_template_id 추가(폼이 보내나 누락되던 DRAFT 88필드 gap). options/sellerCode/hasOptions 등은 이 POST body가 아닌 excel productData로 흐르므로 이 경로의 gap 아님.
- Fix B(위임): 명화송풍구 빈 SKU backfill은 1-row UPDATE SQL을 Desktop이 Supabase MCP로 실행(report 제공).

### 검증

- npx tsc --noEmit 0 errors
- npm run build exit 0
- 구조적 보장: generateUniqueSku 반환값 항상 non-empty + DB unique -> SKU 미입력 상품 N건도 충돌 0 (라이브 2건 테스트는 원격 공유 DB 오염 회피 위해 Desktop G7 재검증에 위임, #46)
- 한글 typo sentinel grep 0 hits (코드 파일)
- git push 1aa5969 -> verify-vercel-deploy.sh exit 0 (production on 1aa5969)
- SD-01 영구 보존

### 적용 작업원칙

#17 · #21 · #24 · #28 · #29 · #32 · #36 · #41 · #45 · #46

### 다음

G7 핸드오프 OPEN 유지. Desktop이 36904429로 G7 재검증(DRAFT 저장 200 + sku 자동생성 + Supabase 88필드 매핑) + Fix B backfill SQL 실행 -> G8(이미지) -> E1~E3(엑셀 88칸).

---

## 2026-05-28 G2 suggest d3 유령 triple 자체검증 수정 (Code turn, Track B 재검증 후속, P1)

### 본 turn 성격

Desktop이 prefill fix(9415169)를 production 재검증하던 중 격리한 별개 층위의 데이터 결함 1-commit 수정. G2 silent skip(자동호출 미발화)은 9415169로 해소 확인됐고, 그 너머에서 suggest API가 트리에 실재하지 않는 카테고리 조합(유령 triple)을 반환하는 결함이 새로 드러남.

### 근본 원인

`src/app/api/category/suggest/route.ts`의 pageValidation override 경로(Case A)가 page-1 dominant d1/d2(생활/건강>주방용품)에 `suggestions[0].d3`를 그대로 붙임. matchingD3(같은 d1/d2 하위 suggestion)가 없으면 fallback `suggestions[0].d3`가 전혀 다른 분류의 d3(그릇장/컵보드 = 가구/인테리어>주방가구 하위, code 50001317)를 가져와 네이버에 실재하지 않는 세 칸 조합 생성. 클라이언트 `getCategoryId`가 정당히 NULL 반환 -> d3 누락. 그 유령 triple이 `top`으로 name_hash 캐시에 박제되어 동일 오답 반복(usedAI:false, cacheHit:name_hash).

### 코드 변경 (2 파일 +122/-23)

Fix A (`suggest/route.ts`): `resolveCategoryId`(클라이언트 getCategoryId 미러, fuzzy 없음) + `isValidD1D2` + `selfValidateSuggestions` 헬퍼 추가. 최종 suggestions를 트리로 strict 검증 — 유효 full triple은 유지, 무효 d3+유효 d1/d2는 d3 blank(d1/d2 신뢰), d1/d2도 무효면 drop. 대체 d3 자동선택 없음(보수안 1차).

Fix B (`suggest/route.ts`): 캐시 read 시 동일 검증으로 sanitize(박제된 유령 triple을 즉석 복구, d1/d2도 무효면 miss로 재계산). 캐시 write는 full-valid triple만 저장 (d1/d2-only는 미저장 -> 향후 개선 run이 올바른 d3 해결 여지 보존).

Fix C (`products/new/page.tsx`): 2차 useEffect가 d3=""(서버 blank) 케이스에서 d1/d2를 자동 set + 신규 `partial` status. 배너 "대분류/중분류 자동 입력됨 — 소분류만 선택해주세요" 노출. all-empty 'failed' 대신 부분 자동입력 보장.

### 검증

- npx tsc --noEmit 0 errors
- npm run build exit 0
- selfValidateSuggestions로 응답 triple은 항상 getCategoryId non-null 또는 d3="" 보장(구조적 불변식)
- 한글 typo sentinel grep 0 hits (코드 파일)
- git push e1c6fd6 -> verify-vercel-deploy.sh exit 0 (production on e1c6fd6)
- SD-01 영구 보존

### 적용 작업원칙

#17 · #21 · #24 · #28 · #29 · #32 · #36 · #41 · #45 · #46

### 다음

G2 핸드오프 2건(suggest_d3_mismatch + category_prefill_skip) OPEN 유지. Desktop이 동일 36904429로 d3 재검증(카테고리 d1/d2 자동 + d3 유효값/빈칸, suggest triple 정합, 그릇장 50001317 유일 단정) -> 통과 시 [CLOSED] + G7(DRAFT 88필드)~G8~E1~E3 정주행.

---

## 2026-05-28 Track B prefill 회귀 2건 수정 (Code turn, G2 카테고리 silent skip + G5 적자가격, P1)

### 본 turn 성격

Track B G2~G8 정주행 검증 중 Desktop이 발견한 prefill 파이프라인(크롤 -> 등록 시작 -> 폼 자동입력) 회귀 2건을 1-commit으로 묶어 수정. 둘 다 36904429(아이스트레이) 재현.

### 회귀 #1 — G2 카테고리 자동매핑 silent skip

근본 원인: `src/app/products/new/page.tsx` 첫 prefill useEffect의 진입 가드 `if (catD1 && catD2 && catD3)`가 도매꾹 얕은 depth(36904429는 catD1만) 상품에서 미충족 -> mismatch 상태 자체가 안 됨 -> 2차 useEffect(mismatch -> /api/category/suggest 자동호출)도 미트리거 -> 카테고리 3칸 텅 빔. suggest API 자체는 정상(주방용품 정확매핑, 의류 둔갑 0).

수정: full-triple 블록 뒤에 `else if (data.productName)` 추가. 얕은 depth/0개여도 productName 있으면 synthetic mismatch를 set해 기존 2차 useEffect의 suggest 자동호출 경로를 재사용. crawlCatCode(도매꾹 코드)는 위에서 이미 set되어 dome_code 캐시 우선 적용. Fix B(d3 완주 보장)는 `getCategoryId`가 이미 RC1 3-depth fallback을 보유(d4 없으면 d1/d2/d3 loose 매칭)하여 재확인만 — 추가 변경 불필요.

### 회귀 #2 — G5 prefill 적자가격

근본 원인: `src/app/crawl/page.tsx` 등록 시작 핸들러 2곳(line 1671/1841)이 `salePrice = Math.ceil(supplier_price * 1.3)` 단순 마크업 사용. 7,980*1.3 ≈ 10,374원, 네이버 수수료 5.5% + 배송비 3,000 미반영 -> 순마진 -11.3% 적자상품 자동 생성. 꼬띠 D등급 경고는 정상(=발견 경로).

수정 Fix A-core: `src/lib/naver-margin-advisor.ts`에 `calcPrefillSalePrice(supplierPrice, shipFee)` 헬퍼 추가 (NAVER_FEE_RATE 0.055 + TARGET_NET_MARGIN 0.15 + shipBurden 기본 3000, 100원 단위 올림). 예: (7980+3000)/0.795 ≈ 13,811 -> 13,900원(순마진 ~15.5%). crawl/page.tsx 등록 시작 2곳을 이 헬퍼로 교체. 사용자 조정 마진율 기반 bulkSalePrice(대량탭)는 별개라 미변경.

수정 Fix B-transparency: `src/app/products/new/page.tsx` 기본정보 탭 판매가 Field 하단에 "꼬띠 추천가 (순마진 15%): N원" 라벨 + 안내 문구 추가. 한글 문구는 `src/lib/i18n/products-new-strings.ko.json` 분리(#35), JSX 인라인 금지. crawlShipFee state(기본 3000) 신설 + prefill 시 set. 기존 MarketPriceHint 칩 그대로 유지.

### 코드 변경 (4 파일 +73/-2)

- `src/app/products/new/page.tsx`: G2 else-if 분기 + crawlShipFee state + 추천가 라벨 렌더 + import 2건.
- `src/app/crawl/page.tsx`: calcPrefillSalePrice import + 등록 시작 2곳 교체.
- `src/lib/naver-margin-advisor.ts`: calcPrefillSalePrice export 추가.
- `src/lib/i18n/products-new-strings.ko.json`: 신규 (추천가 라벨 + 안내).

### 검증

- npx tsc --noEmit 0 errors
- npm run build exit 0
- 한글 typo sentinel grep 0 hits (코드 파일)
- git push 9415169 -> verify-vercel-deploy.sh exit 0 (production on 9415169)
- SD-01 영구 보존

### 적용 작업원칙

#17 · #21 · #24 · #28 · #29 · #32 · #35 · #36 · #41 · #45 · #46

### 다음

G2/G5 핸드오프 OPEN 유지. Desktop이 동일 36904429로 (1) /crawl 등록시작 -> 카테고리 3칸 자동입력(주방용품, 의류 둔갑 0) (2) 판매가 흑자가 자동입력 + 순마진 양수 + 추천가 라벨 노출 단정 -> 통과 시 [CLOSED] + G7(DRAFT 88필드)~G8~E1~E3 정주행.

---

## 2026-05-28 crawl_logs INSERT await 누락 dangling promise 수정 (Code turn, G1 Tier-2 회귀 P1)

### 본 turn 성격

desc.contents {} fix(d2f5d6e) 직후 Track B G1 재개 DB 3중 검증 Tier-2에서 Desktop이 발견한 P1 회귀 1-commit 근본 수정. 36904429 크롤 응답은 200 정상이나 crawl_logs에 row 0건.

### 근본 원인

`src/app/api/crawler/domemae/route.ts`의 crawl_logs INSERT가 `prisma.$executeRaw...catch(...)` fire-and-forget(await 없음). 직후 `NextResponse.json` 즉시 반환 -> Vercel serverless 인스턴스 freeze -> await 되지 않은 INSERT promise가 완료 전 폐기(dangling). `[crawl-log-insert]` 에러 로그 0건이 증거(에러가 아니라 미실행). 기존 3건 INSERT는 race 우연 성공. 로컬 dev는 프로세스 생존으로 항상 완료되어 미발현 — production serverless 특유 회귀.

### 코드 변경 (2 파일 +8/-5)

`grep -rn 'prisma.$executeRaw' src/app/api/crawler/`로 동일 패턴 일괄 점검 후:
- `domemae/route.ts`: 단건 소싱 스냅샷 INSERT에 `await` 추가.
- `stream/route.ts`: bulk 성공 INSERT + 에러 INSERT 2개 (둘 다 `Promise.allSettled` 내부, 마지막 배치가 `controller.close()` 전 미완료 위험) `await` 추가.
- stock-check/route.ts:220 + logs/route.ts는 이미 await 처리 — 변경 없음.
- 세 곳 모두 `.catch` 유지 -> INSERT 실패해도 응답 블로킹 0, await는 promise 완료만 보장.

### 검증

- npx tsc --noEmit 0 errors
- npm run build exit 0
- 한글 typo sentinel grep 0 hits (코드 파일)
- git push 6f8e9f8 -> verify-vercel-deploy.sh exit 0 (production on 6f8e9f8)
- SD-01 영구 보존

### 영향 범위

단건 크롤(/crawl, AlternativeProductPanel, DomemaeCrawler) + bulk 크롤의 소싱 보관함 기록 간헐/완전 누락 -> 해소. 크롤 -> 소싱 보관함 -> 씨앗심기(PLANT) 파이프라인 신뢰성 복구.

### 적용 작업원칙

#17 · #21 · #24 · #28 · #29 · #32 · #36 · #41 · #45 · #46

### 다음

핸드오프 OPEN 유지. Desktop이 동일 36904429로 G1 Tier-2(crawl_logs row 1건 생성 단정) -> Tier-3(응답 <-> DB row 필드 일치) -> G2~G8 정주행.

---

## 2026-05-28 크롤러 desc.contents 빈 객체 TypeError 근본 수정 (Code turn, G1 회귀 P0)

### 본 turn 성격

Track B G1 게이트 정주행 중 Desktop이 발견한 P0 광범위 회귀 1-commit 근본 수정. 신규 도매매 상품 36904429(아이스트레이) 크롤링 시 `e.replace is not a function` HTTP 500. 도매꾹 raw 직접 검증으로 근본 원인 단정.

### 근본 원인

도매꾹 getItemView om=json은 상세 HTML 본문이 비어 있을 때 `desc.contents`를 빈 문자열이 아닌 빈 객체 `{}`로 직렬화 (XML->JSON 빈 노드). `const descContents = item.desc?.contents ?? ''`에서 `{}`는 nullish가 아니라 통과 -> `stripHtmlToText({})` -> `({}).replace(...)` -> TypeError. 명화송풍구(65322245)는 화보 HTML이 풍부해 string이었기에 미발현.

### 코드 변경 (1 파일 +7/-4)

`src/lib/sources/domemae-adapter.ts`:
- Fix A (근본): `descContents` 추출을 `typeof item.desc?.contents === 'string' ? ... : ''`로 타입 가드. `{}`/number/null 모두 `''`로 정규화.
- Fix B (방어 심층): `extractGalleryImages` + `stripHtmlToText` 두 헬퍼에 `typeof html !== 'string'` 가드 추가.
- Fix C (예방): `name` 추출을 `String(item.basis?.title ?? '').replace(...)`로 강제.

### 검증

- npx tsc --noEmit 0 errors
- npm run build exit 0
- 한글 typo sentinel grep 0 hits (코드 파일)
- git push d2f5d6e -> verify-vercel-deploy.sh exit 0 (production on d2f5d6e)
- SD-01 영구 보존

### 영향 범위

상세 HTML 없는 모든 도매꾹 상품(저가 생활용품·위탁판매 흔함) 크롤링 100% 실패 -> 해소. 36904429 = `desc.contents == {}` 회귀 골든 픽스처로 보존.

### 적용 작업원칙

#17 · #21 · #24 · #29 · #32 · #36 · #41 · #45 · #46

### 다음

핸드오프 OPEN 유지. Desktop이 동일 36904429로 G1부터 재개 (200 + name/supplierPrice/images/options 단정 -> G2~G8 정주행).

---

## 2026-05-27 PM B-13a PLANT 헤더 중복 등록 버튼 제거 (Code turn, B-13 직속 후속)

### 본 turn 성격

직전 commit b6ce4bb(B-13 visual 탭 액션블록 스코프 정합) production 재검증 중 Desktop Chrome MCP가 발견한 잔존 회귀 1건 1-commit 해소. 5-19 진단이 하단 액션블록만 식별하고 페이지 상단 헤더의 동일 버튼 인스턴스를 놓친 cascade miss.

### 코드 변경 (1 파일 -14줄)

`src/app/products/new/page.tsx` line 1792-1805 `<div style={{ display: 'flex', gap: 8 }}>...</div>` 14줄 단순 삭제. handleNaverDirect 버튼 + handleGenerate 버튼(헤더 인스턴스) 제거. 부모 `flex items-center gap-2` div + 진행률 dots + 완료 배지 보존.

### 회귀 차단

- handleNaverDirect grep count: 3 -> 2 (def + visual)
- handleGenerate grep count: 4 -> 3 (def + visual + line 817 비-functional 주석)
- functional call site: 양쪽 visual 탭 1곳만

### Desktop 실측 evidence

pre-state: totalRegisterButtons=2 (HEADER zone top=115px), [기본]/[옵션] 양쪽 노출 확인. post-state 목표: visual 탭 외 0, visual 탭 진입 시 1.

### 검증

- npx tsc --noEmit 0 errors
- npm run build exit 0 (/products/new 64.2 -> 63.9 kB)
- 한글 typo sentinel grep 0 hits
- SD-01 영구 보존

### 적용 작업원칙

#17 · #21 · #24 · #29 · #32 · #36 · #41 · #45 · #46

### 다음 = Desktop 재검증 turn

7탭 순회로 헤더 등록 버튼 미노출 + visual 탭 하단 인스턴스 보존 확인. 통과 시 핸드오프 §7 ARCHIVED.

Commit: 본 commit hash로 갱신 예정

---

## 2026-05-27 PM B-13 PLANT 비주얼탭 액션블록 스코프 정합 (Code turn, 1 파일)

### 본 turn 성격

직전 commit f244a48(B-12 register + B-11 save-assets) 직후 Desktop이 Chrome+Filesystem 실측으로 5-19 진단 정정 결과 hand-off (`docs/handoff/HANDOFF_atelier_routing_plant_checkbox_2026-05-27.md`). 단일 결함 1-commit 처리. 작업1(/atelier 404)·작업2(7번째 탭)는 코드 이미 반영 완료로 폐기 단정.

### 코드 변경 (1 파일 +3/-3)

`src/app/products/new/page.tsx` 2 edit. visual 탭 종료 `</>)}` 위치를 line 3401 -> 하단 버튼 `</div>` 직후(line 3447 다음)로 이동. autoRunVisual 체크박스 + 네이버 직접 등록 버튼 + 엑셀 다운로드 버튼 블록 전체가 `activeTab === 'visual'` 조건 안으로 흡수. 들여쓰기 정합 + 하단 버튼 시작 주석은 영어로 격상(`{/* Action block — registration step (visual tab only) */}`).

### Desktop 실측 진단 정정 핵심

- 작업1(/atelier 404): Sidebar.tsx line 159 이미 '/studio' 연결. /atelier 링크는 코드에 *존재하지 않음*. production 404는 URL 직접입력 시에만 발생. → **수정 불필요(폐기)**
- 작업2-a(7번째 탭): activeTab 'visual' + savedProductId 잠금 이미 완료
- **작업2-b(체크박스 visual 탭 노출 정합)**: 본 commit으로 해소

### 작업원칙 #44 stale fact 직접 사례

PROGRESS.md 2026-05-15 Phase 3-C-3 entry가 "체크박스 위치: 페이지 하단(공통) -> 네이버 직접 등록 버튼 바로 위에만"으로 기록돼 있었으나 *실제 코드는 전 탭 공통 하단*. 본 commit으로 코드를 문서 의도에 맞게 정렬 -> stale fact 해소.

### 검증

- `npx tsc --noEmit` 0 errors
- `npm run build` exit 0, `/products/new` 64.2 kB (변경 0)
- 한글 typo sentinel grep 0 hits
- SD-01 아랍어 footer 조사/수정 0건 (영구 보존)

### 적용 작업원칙

#17 · #21 · #24 · #29 · #32 · #36 · #41 · **#44 (직접 해소 사례)** · #46

### 다음 = Desktop 재검증 turn

production `/products/new` 6탭 체크박스 미노출 + visual 탭만 노출 재검증 후 핸드오프 §7 ARCHIVED.

Commit: 본 commit hash로 갱신 예정

---

## 2026-05-27 PM B-12 네이버 등록 라우트 근본 재작성 + B-11 저장배관 DB UPDATE (Code turn)

### 본 turn 성격

직전 Desktop turn(이미지 보강 + margin 교정 + B-11 우회 완주, 본 SESSION_LOG 직전 entry)에서 명화송풍구 등록 직전 발견된 B-12(register 라우트 구조결함)를 Code 환경에서 근본 수정. B-11 저장배관의 진짜 누락분(Product URL 컬럼 DB UPDATE)도 동시 처리. 코드 2 파일, TSC 0 + build OK. 실 네이버 발행은 비가역이므로 본 turn 범위 외 — 대표 승인 후 별도 turn.

### 코드 변경 (2 파일 +186/-50)

| 파일 | 변경 |
|---|---|
| `src/app/api/naver/register/route.ts` | **전면 재작성** — categoryMap 폐기 / `product.naverCategoryCode` 직접 사용 / `naverRequest` OAuth2 위임 / detailContent에 `<img src="${detail_image_url}">` 포함 / API 실패 시 status mutation + 가짜 ID 주입 0(`PENDING_`/`ERROR_`/`MOCK_` 3건 제거) / prisma singleton / 422 게이트 3종(categoryCode/mainImage/salePrice) |
| `src/app/api/products/[id]/save-assets/route.ts` | Storage 업로드 성공 후 `prisma.product.update`로 `main_image_url` / `detail_image_url` 자동 기록. 한쪽만 성공해도 해당 컬럼만 update(spread guard). DB update 실패는 errors 배열 누적되되 응답 200 보존 |

### B-12 4-함정 동시 해소

1. **카테고리 폐기 fallback**: `categoryMap[product.category]`에 없으면 의류(`50000006`) silent fallback -> 방향제→의류 오등록 발생 가능. 본 fix: `product.naverCategoryCode` 직접 사용, 빈 값이면 422 차단.
2. **거짓 라벨(#46)**: API 실패해도 `status='registered'` + 가짜 `PENDING_${ts}` ID 주입 3곳. 본 fix: 실패는 실패로 502 + status/naverProductId 미변경. 가짜 ID 패턴 grep 0건.
3. **상세 본문 미포함**: `detailContent = product.description`만 사용 -> Desktop이 살려둔 186KB 상세 PNG가 네이버에 안 보임. 본 fix: `buildDetailContent`가 `<img src="${detail_image_url}">` 삽입.
4. **인증 방식 의심**: 구 검색 API 헤더(`X-Naver-Client-Id`) 직접 사용 -> Commerce API는 OAuth2 + bcrypt 전자서명 필요. 본 fix: `naverRequest` 위임 (proxy/direct 양쪽 자동 분기).

### B-11 §3-2 단정 (코드 변경 0)

`useStudioActions.runSave`(line 268-271)는 `detail` state 존재 시 `detailBase64 + skeletonId`를 페이로드에 이미 동봉함. 실제 누락은 (a) `runFullSequence` autorun이 detail 카드를 *opt-in*으로 skip(Phase 3-C-3 의도적 결정), (b) manual 흐름에서 사용자가 detail 카드 실행 전에 save를 누른 경우. 본 turn은 autorun 의미 변경 보류, 라우트 측 DB UPDATE(§3-1)만 적용.

### 검증

- `npx tsc --noEmit` 0 errors
- `npm run build` exit 0 (`/api/naver/register` + `/api/products/[id]/save-assets` 모두 ƒ Dynamic 유지)
- sentinel grep 0 hits
- `categoryMap` / `PENDING_` / `ERROR_` / `MOCK_` references 0 (수정 후)
- 코드 inline 한글 주석 0건 (영어 주석만)

### 적용 작업원칙

#17 · #21 · #24 · #29 · #32 · #36 · #41 · #45 · #46

### 다음 = Desktop 등록 완주 turn (대표 승인 후)

ROADMAP.md "다음 새 채팅 시작 메시지" ⭐ ACTIVE 정독 -> 명화송풍구(cmpnooli40001f0gveaxr8iim) 본 commit 라우트로 등록 -> production 응답 + DB row + 스마트스토어 노출 3중 검증.

Commit: 본 commit hash로 갱신 예정

---

## 2026-05-27 Desktop 명화송풍구 이미지 보강 + margin 교정 (Desktop turn, 코드 변경 0)

### 본 turn 성격

2026-05-27 Code turn(B-4 진단 504 복구) 직후 Desktop 재검증 + 첫 프리미엄 상품(명화송풍구 cmpnooli40001f0gveaxr8iim) 등록 완주 turn. B-4 수정이 production에서 정상 작동함을 3회 재진단으로 확인하면서, 동시에 등록을 막던 두 개의 진짜 원인(이미지 저해상도 + margin 깨진값)을 근본 해결. 코드 변경 0건, Supabase 직접 UPDATE 2건(mainImage + margin)으로 우회 처리.

### 핵심 성과 3건

1. **이미지 보강 (L4 -> L2)**: 330px -> 화보 4종 진열컷 1000x1000. 도매꾹 getItemView(no=65322245)의 desc.contents 화보(1000x18291)에서 4종 향 진열컷을 정사각 크롭 + 흰배경 패딩 -> Cloudinary signed upload. 선명도(Laplacian variance) 99.6(severe) -> 351.8(ok), 4.6배 개선.
2. **진단 엔진 신뢰도 검증 (좋은/나쁜 이미지 정확 구분)**: 3회 재진단으로 P-Filter가 이미지 품질에 정직하게 반응함을 입증. 330px(L4) -> 760px 업스케일(L3) -> 화보컷(L2). 6신호 중 5개(해상도/블러/화이트밸런스/배경/객체비율)가 정상으로 전환됨을 정확 감지.
3. **margin 근본 오류 해결 (B-7 발현)**: 최종 L4의 진짜 범인은 이미지가 아니라 margin 50.69(깨진값). grading.ts의 `if (margin >= 5) return 'L4'` 규칙에 걸려 이미지가 아무리 좋아도 L4 강제됐음. margin = salePrice/supplierPrice = 29000/14300 = 2.03 교정 -> 최종 L2 도달.

### 재진단 추적 (production, 검증된 데이터)

| 신호 | 330px | 760px 업스케일 | 화보 4종컷 |
|---|---|---|---|
| 해상도 | 330 부족 | 760 충분 | 1000 충분 |
| 블러 | 212 | 99.6 severe | 351.8 ok |
| 화이트밸런스 | warm cast | warm cast | 정상 0.008 |
| 배경 | 복잡 | 복잡 | 균일 |
| 객체비율 | 1.0 잘림 | 1.0 잘림 | 0.3 적절 |
| P-Filter | L4 | L3 | L2 |
| 최종 등급 | L4 | L4 | **L2** |

### 더블체크 (시뮬레이션-실측 일치)

margin 교정 전, grading.ts 로직을 Python으로 재현해 사전 시뮬레이션: margin 2.03 -> 최종 L2 예측. production 실측 결과 L2 일치 + ROI breakdown(margin 2.03 / adCostEstimate 0.5 / roiScore -0.5) 모두 예측대로. persist=true로 Diagnosis row 영속화 확인(grade=L2, p_filter_grade=L2, skeletonId=S6).

### 신규 발견 버그 (Code 후속)

- **B-9**: 진단 응답 rationale 필드가 문자열이 글자단위로 쪼개져 배열로 반환(표시 버그, 진단 로직 자체는 정상).
- **B-10**: qualityScore(47.6)와 P-Filter 등급(L2) 미세 불일치. quality<60이라 L2 정식조건 미달, 디폴트 안전망으로 L2. 등록 차단 사유 아님.

### 검증

- production /api/diagnose 3회 호출 모두 200 (B-4 수정으로 504 없음, 각 ~11초)
- Supabase 직접 UPDATE 2건 RETURNING으로 반영 확인
- Cloudinary 업로드 후 공개 URL fetch 검증(1000x1000)
- DB JOIN으로 Product.mainImage(Cloudinary) + margin(2.03) + Diagnosis(L2/S6) 영속화 최종 확인

### 환경 이슈 (정직 보고)

- Supabase Storage REST 직접 업로드는 새 Secret 키(sb_secret_ 형식)가 JWT가 아니라 curl Bearer 헤더로 거부됨(403 Invalid Compact JWS). -> Cloudinary signed upload로 우회(이미지 CDN이라 대표이미지 호스팅에 더 적합).

### 다음 작업

Desktop 새 채팅: /studio 썸네일 4변형 -> 상세 5섹션(S6) -> 저장 -> 네이버 등록(카테고리 50003356/원산지 200037) 완주 -> 하트클립(65322570) 동일 흐름. 썸네일/상세는 Sharp 합성으로 무거워 세션 분할 의무(#26). 상세 근거: docs/handoff/HANDOFF_premium_image_boost.md. Code 측 B-5~B-10 별도 커밋.

---

## 2026-05-27 B-4 진단 API 504 근본 복구 (Code turn, 5 파일 + docs 4건)

### 본 turn 성격

2026-05-27 Desktop turn에서 첫 실상품(명화송풍구 cmpnooli40001f0gveaxr8iim) 등록 시도 중 발견된 최우선 blocker B-4를 Code 측에서 근본 수정. Desktop 핸드오프(`docs/handoff/HANDOFF_diagnose_timeout.md`)의 가설 #1(외부 AI 호출 timeout 부재)을 코드 정독으로 정정 — `inferConceptTone`은 외부 호출 없는 순수 규칙 기반 함수임을 확인. 실 범인은 (a) `/api/diagnose` route의 `maxDuration` 미설정, (b) `resolveBuffer`의 bare `fetch()` (timeout 없음), (c) tesseract `getWorker()` 무한 대기 가능성, (d) CTI/grading 호출이 try/catch 미보호.

### 가드 4종 적용

| # | 변경 | 파일 |
|---|---|---|
| 1 | `export const maxDuration = 60` 추가 | `src/app/api/diagnose/route.ts` |
| 2 | resolveBuffer에 AbortController 15s timeout (양쪽) | `src/lib/diagnosis/image-quality.ts`, `src/lib/diagnosis/p-filter.ts` |
| 3 | `getWorker()` 8s init timeout + 실패 시 promise reset + `detectWatermark` graceful fail | `src/lib/diagnosis/p-filter-watermark.ts` |
| 4 | `gradeProduct`에 safeClamp + NaN/Infinity 가드 + skeletonId S2 fallback + `confidenceLevel` 안전 처리 | `src/lib/diagnosis/grading.ts` |
| 5 | route.ts에서 `inferConceptTone` / `gradeProduct` 호출을 try/catch로 감싸 422 반환 | `src/app/api/diagnose/route.ts` |

### 환경 이슈 (본 세션)

- 로컬 node 25.4.0이 homebrew simdjson ABI mismatch (`libsimdjson.29` 미발견, 실제는 `.33`만 존재)로 tsc/build/dev 모두 실행 불가 → 사용자가 직접 `brew reinstall node` 실행 → 복구 후 검증 진행

### 부수버그 (B-4 푸시 후 별도 커밋 대기)

- B-5: PUT /api/products stock 필드 → Prisma 500
- B-6: /api/naver/categories count:0 (4,993 데이터 연결 끊김)
- B-7: 상품 생성 POST 기본값 오류 (originCode `'0200037'` 앞 0 오타, naverCategoryCode `'50003307'` 임의값)
- B-8: 소싱 시 330px만 저장 (760 original 미사용)

### 다음 작업

Desktop이 Chrome MCP로 `/studio?product=cmpnooli40001f0gveaxr8iim` 진단 재검증 → 504 없이 결과 카드 정상 표시 확인 → 등록 흐름 완주(명화송풍구 + ③ 하트클립) → Code 측이 B-5~B-8 별도 커밋.

---

## 2026-05-26 DB P1000 복구 + Studio 클릭 버그(B-1) 수정 (Code turn, 6 컴포넌트 + 1 hook + docs 4건)

### 본 세션 성격

Desktop 측 전수 검증(Chrome MCP + Supabase MCP + Vercel MCP)으로 두 건의 production 장애 근본원인 확정 후 Code 측 build + ship turn. `docs/handoff/HANDOFF_studio_click_bug.md` paste-ready 인계 수신 → 즉시 수정 → tsc/build 검증 → docs 4건 갱신 → 단일 commit + push.

### 두 건의 production 복구

| # | 항목 | 근본원인 | 복구 주체 | 검증 |
|---|---|---|---|---|
| DB | P1000 Authentication failed (전 API 500) | 이전 Supabase DB 비번 리셋이 실제 미저장 (Vercel ENV 값/스코프/형식/재배포 모두 정상이었음) | Desktop (Supabase MCP 직접 쿼리 + 빈 커밋 재배포 검증으로 캐싱 아님 확정 → 동일값 재리셋) | /api/products 200 + 상품 1개 노출 (달항아리 도어벨) |
| B-1 | /studio 모든 버튼 클릭 무반응 (썸네일/진단/저장 등 onClick/onChange 미바인딩) | Phase 3-C-1 리팩토링(/studio/page.tsx → 6 카드 컴포넌트 분리) 시 `'use client'` 지시자 미이전. page.tsx에는 있으나 하위 카드엔 없어 React hydration 안 됨 | Desktop 진단 + Code 수정 | 본 turn 적용, Desktop Chrome MCP 실클릭 재검증 대기 |

### Code 변경 (1 commit)

| 파일 | 변경 | LOC |
|---|---|---|
| `src/components/studio/StudioCardShell.tsx` | `'use client';` 추가 (PrimaryButton/SecondaryButton 본체) | +2 |
| `src/components/studio/DiagnosisCard.tsx` | `'use client';` 추가 (onClick) | +2 |
| `src/components/studio/ThumbnailCard.tsx` | `'use client';` 추가 (onClick × 2, onSelectMain) | +2 |
| `src/components/studio/DetailPageCard.tsx` | `'use client';` 추가 (onClick, select onChange) | +2 |
| `src/components/studio/ActionsCard.tsx` | `'use client';` 추가 (onSave/onPublish onClick) | +2 |
| `src/components/studio/ProductListPane.tsx` | `'use client';` 추가 (onSelect onClick) | +2 |
| `src/components/studio/useStudioActions.ts` | runThumbnail: outputs 비거나 전 variant base64 부재 시 `thumbError` 발화 (B-2 #46 silent fail 가드) | +7 |

### 진단 증거 (Desktop turn)

- 실 마우스 클릭: API 호출 0건 + busy 미표시 (핸들러 미바인딩)
- JS `element.click()`: POST /api/thumbnail 200 + outputs[].base64 + copy.hook (S6/75) → 핸들러 자체는 정상
- elementFromPoint(버튼중심) === 버튼 자신 → 오버레이 아님
- 진단 STEP1 표시 정상 (서버 렌더) → 정적 markup은 OK, 클라이언트 이벤트만 죽음 → 'use client' 누락 정확히 일치

### 검증

| 항목 | 결과 |
|---|---|
| tsc --noEmit | ✅ 0 errors |
| npm run build | ✅ 0 errors (next 14 정적 빌드 통과, /studio 3.74 kB) |
| 6 파일 첫 줄 grep | ✅ 전 파일 `'use client';` 확정 |
| 한글 sentinel grep (혁섭\|쿠드\|식타\|릴고\|헌서\|위젝\|스칵\|쿠두) | ✅ 0건 |
| Production smoke | Desktop Chrome MCP 재검증 의무 (TASK_BRIDGE §3 ACTIVE 신호) |

### Docs 갱신 (4건)

- `docs/handoff/HANDOFF_studio_click_bug.md`: 상태 🔴 OPEN → 🟡 IN-VERIFY. 검증 타임라인 + 변경 이력에 본 turn entry 추가. git 추적 신규 등록 (folder previously untracked)
- `docs/plan/TASK_BRIDGE.md`: §3 ACTIVE 이전 entry (대시보드 런타임 ERROR) 종결 → 신규 ACTIVE (B-1 수정 → Desktop 재검증). §5 OPEN PAPER-CUTS에 B-1/B-2/B-3 등재. §7 ARCHIVED 2026-05-26 섹션 신설.
- `docs/plan/PROGRESS.md`: 헤더 4줄 갱신 (최종 업데이트 / TSC/Production / 상품 상태 / 다음 작업)
- `docs/plan/SESSION_LOG.md`: 본 entry prepend

### 작업원칙 준수

#17 (commit msg HEREDOC) / #21 (사전 점검) / #22 (TSC ≠ runtime, build ≠ click) / #28 (Vercel source of truth) / #29 (한글 처리) / #31 (MD 임계 모니터링) / #32 (TSC + build 양립) / #36 (push 직후 verify-vercel-deploy.sh --wait) / #41 (5-step hand-off) / #46 (a)~(e) (거짓 라벨 금지 — B-2 빈 outputs guard로 적용)

### 다음 turn (Desktop)

1. STEP 0 점검 (HEAD = 본 commit / Vercel READY)
2. Chrome MCP로 `/studio?product=cmp3afb450001gng5468w0qpc` 진입
3. 진단/썸네일/상세 버튼 실 마우스 클릭 → busy 표시 + 렌더 확인
4. 통과 시 HANDOFF doc 헤더 `[CLOSED 2026-05-26]` + §7 ARCHIVED 이전
5. B-3 (달항아리 도어벨 데이터 보정) 또는 Sprint 7-M2 Phase 3-C-2 진입

---

## 2026-05-20 Sprint 8-IA Phase 1 완료 (Code turn, 코드 2 신규 + 1 수정 + docs)

### 본 세션 성격

새 채팅 1 진입. Sprint 8-IA Phase 1 (Task 1-5) Code 측 build + ship 본 turn. baseline `db72408` (Task 1-3 sidebar demote + admin move + registry 31→8 적용 완료 상태) 에서 Task 4 (SystemHealthCard + /api/system-health) 작성 + Task 5 (production smoke 검증) + docs 갱신.

세션 진입 시 working tree 가 `feature/sprint-7-m2-smart-asset-workflow` 브랜치 (Sprint 7-M2 Step 1+2 2 commits ahead) 에 있었음. handoff 명시 (`Branch: main`) 따라 `git checkout main` 후 db72408 baseline 기준 작업 진행. Sprint 7-M2 feature branch 는 origin 에 보존됨 (별도 trace, 후속 작업).

### Code 변경 (1 commit, +517 LOC)

- **`src/app/api/system-health/route.ts`** (신규, +189 LOC)
  - 8 registry × 4 신호 (InventorySnapshot.polledAt / CategoryTrendCache.refreshedAt / DomeCategory.refreshedAt / Discord webhook env) → HealthItem[] 변환
  - status 4종: success / warning / failed / pending
  - stale factor 1.5 (interval × 1.5 초과 시 success → warning 자동 강등)
  - DISPLAY_MAP 으로 한글 displayName + Lucide iconKey 매핑
  - 한글 type literal 0건 (#3-3 정합), 영어 주석 (#3-1 정합), prisma singleton 사용 (#3-2 정합)

- **`src/components/dashboard/SystemHealthCard.tsx`** (신규, +293 LOC)
  - 'use client' / 60s setInterval polling + window focus revalidate
  - 8 mini cards 반응형 grid (`minmax(180px, 1fr)`)
  - status 별 좌측 3px border 색상 + status pill + lastRunAt 상대시간 + nextRunAt 표시
  - Lucide React 아이콘만 사용 (Activity / Package / Sparkles / Bell / Flame / Tag / Clock / ArrowRight / Loader2 / AlertCircle)
  - 이모지 0건, 한글 사용자 노출 텍스트 (정상 / 지연 / 실패 / 대기 / 미실행 / 분 전 / 시간 후 등) 본 컴포넌트 inline 유지

- **`src/app/dashboard/page.tsx`** (수정, +20 / -15)
  - import 추가: `SystemHealthCard`
  - Section 3 가든 헬스 grid 위로 SystemHealthCard 마운트 (기존 3-카드 grid 보존)
  - CollapsibleSection 변경 0 — 기존 변형 (celebrator) 유지

**Commit hash**: `12495cf`

### Hand-off 정합 보정 단정

| 항목 | handoff 가정 | 실 단정 |
|---|---|---|
| DB 테이블 | `AutomationLog (type / status / message / createdAt)` | 부재 — InventorySnapshot / CategoryTrendCache / DomeCategory / discord env 만 사용 |
| Registry 8 ID | inventory-poll / price-watch / supplier-status / honey-pot-discovery / kkotti-ai-recommend / auto-order / image-pipeline / discord-notify | inventory-poll / good-service-track / discord-kkotti-recommend / discord-stock-alert / discord-kkotti-score / discord-ops-report / cron-daily / cron-weekly |
| Branch | main HEAD = db72408 | 진입 시 feature/sprint-7-m2-smart-asset-workflow (HEAD=84bdfdf). `git checkout main` 후 db72408 baseline 보존 |
| Section | "Section 5 알림 배너 직후" | 실 dashboard Section 1-5 이미 존재 (Section 5 = collapsed 더보기) — Section 3 가든 헬스 상단으로 의미 정합 best fit |

handoff STEP A 명시 "registry 가 source of truth" 정합 — 실제 registry 8 entry 그대로 사용.

### 검증 (V1~V6)

| 항목 | 결과 |
|---|---|
| TSC | 0 errors ✅ |
| build | exit 0 ✅ |
| V1 사이드바 demote | ✅ Task 1-3 (db72408) 에 적용됨 |
| V2 `/admin/automation` 200 | ✅ |
| V3 registry 8 카드 | ✅ `/api/automation/registry` total=8, 모두 active |
| V4 Section 3 SystemHealthCard | ✅ `/dashboard` 200 + 컴포넌트 마운트 |
| V5 `/api/system-health` 200 + 8 items | ✅ summary={healthy:4, total:8}, items.length=8, 한글 displayName 정합 |
| V6 console 0 errors / 0 깨짐 | ⚠️ Code 환경 브라우저 미가용 — Desktop Chrome MCP 검증 의무 |

**Production evidence** (`/api/system-health`):
- inventory-poll: pending (첫 폴 대기)
- cron-daily: warning (lastRunAt 42시간 전, stale factor 적용)
- 4 discord-*: success (webhook env 모두 설정됨)
- good-service-track / cron-weekly: pending (DomeCategory 미수확)
→ 4/8 정상 = 실 가동 상태 정확 반영 (#46 (d) 통과)

### Vercel 검증

- `git push origin main` → 12495cf push 성공
- `scripts/verify-vercel-deploy.sh --wait` → exit 0, production = 12495cf READY (state=REGISTERED) ✅
- `curl -sI https://kkotium-garden.vercel.app/dashboard` → 200 ✅
- `curl -sI https://kkotium-garden.vercel.app/admin/automation` → 200 ✅
- `curl -sI https://kkotium-garden.vercel.app/api/system-health` → 200 ✅

### MD 갱신

- `docs/plan/PROGRESS.md` 헤더 갱신 + 본 entry prepend
- `docs/plan/TASK_BRIDGE.md` §3 ACTIVE 갱신 (Phase 1 완료 → Phase 2 진입 대기) + §7 ARCHIVED 등재 (db72408 + 12495cf)
- `docs/plan/SESSION_LOG.md` 본 entry prepend
- SESSION_LOG 현재 1085줄 (1500 임계 미달) → #31 분할 불필요

### 적용 작업원칙

#17 (commit-msg.tmp) · #21 (사전 점검) · #24 (한 turn 분할 완료) · #29 (한글 처리) · #31 (1500 임계 점검) · #32 (TSC ≠ build) · #36 (verify-vercel-deploy.sh --wait) · #41 (두 환경 핑퐁 ledger 갱신) · #46 (거짓 라벨 금지 — pending/warning/success 실 신호 기반, hardcoded 정상 0건)

### 다음

새 채팅 2 진입 = Sprint 8-IA Phase 2 (Task 6-12, 4.5일). 단 본 turn 의 V6 미단정 → Desktop Chrome MCP 통합 검증 통과 후 진입.
