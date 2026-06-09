# KKOTIUM GARDEN — 프로젝트 진행 현황
> 2026-06-09 **프리셋 엔진 Phase A/B 검증 + 누끼/크롭 마무리 시스템 설계·인계** (Desktop turn, runtime aa7e5b9/HEAD c55248d, 비가역 0). #45 실측: B-2 seo-guard(명화) orthogonal true·상품명 warn(22/50 S)·대표 white_bg **fail**(가죽 크롭 정직 검출)·카테고리 pass / B-3 generate aroma/l3·추천 aroma·matches true·7섹션(scents3·specRows5·values3)·grounded·슬롯/잠금 정확 / title reload 후 "꽃틔움 가든" 정상(#44 stale 오탐 회피). 코드 실측: thumb-crop=완성(크롭)·bg_clean=seed만(누끼 executor 갭)·seo-guard fail 개입대기열 미연결. 신규 문서 docs/design/REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md + docs/plan/CUTOUT_CROP_FEATURE_BUILD_PLAN.md(C-1~C-6 청크·각 새 채팅). 명화 대표=가죽 유지(override 1호, 대표 결정). 정직(#46): Adobe 도구 deferred·bash/스토리지 없음→누끼 적용부는 앱(Code) 담당이 올바른 구조. **다음=Code C-1∥C-2∥C-4 병렬(각 새 채팅)→Desktop 검증→C-3→C-5→C-6(브라우저 테스트=Desktop).**
> 2026-06-09 **6g 잔존 브랜드 오타 flag 3곳 처리** (Code turn, main aa7e5b9, 비가역 0). export/naver(CSV 브랜드 칼럼)·naver-defaults(brand/manufacturer/importer + 카카오 5곳) 오타 교정(구조 보존) + layout.rtf(.rtf 잔존본) git rm(#34). 정답=신뢰소스 추출+코드포인트 토큰 치환(수기 0)·1차 정규식 오훼손 커밋 전 복원 차단·전역 변종 0. 제조사/수입사 '(협력사)' vs MEMORY 정책은 별건. tsc 0/build OK/비가역 0. production aa7e5b9. **다음=Desktop 프리셋 엔진 실측(/studio/preset-preview Live·/seo-guard)·헤더/탭 브랜드 표기.**
> 2026-06-09 **프리셋 엔진 B-2 SEO 린터 + B-3 generate-detail 소비 + site title/brand 오타 교정** (Code turn, main 9f90faf, 비가역 0). BUILD_PLAN commit B-2(86aa160)·B-3(73d4111) + title(eef3ce1)·brand(9f90faf). B-2: seo-guard-linter(순수·프리셋 독립 3체크 상품명50/대표화이트/카테고리8자리) + GET /seo-guard(대표 픽셀 검사 주입). B-3: generate-detail presetLayout(자동추천 categoryToFamily·content buildPresetDetailContent[데이터=groundedFacts·내러티브=중립템플릿 JSON]·slots·linter 항상) + presetOnly 분기(전상품) + 기존 PNG 보존, /studio/preset-preview Live 로드. site title 오타 교정. 6g 잔존 브랜드 오타 안전군 5곳(Header·Discord) 교정(신뢰소스 추출·코드포인트 검증·변종 0). flag 3곳(export/naver·naver-defaults·layout.rtf #34) 사용자 결정. tsc 0/build OK/이모지 0/한글 리터럴 0/sentinel 0/변종 0/비가역 0. **다음=Desktop /studio/preset-preview Live + /seo-guard 실측 + flag 3곳 결정. ★프리셋 엔진 Phase A/B 전 commit 완료.**
> 2026-06-09 **적응형 프리셋 엔진 Phase B-1 — 7섹션 React 렌더러** (Code turn, main 6e6aad1, 비가역 0). BUILD_PLAN commit B-1. aroma_L3_detail_reference.html 7섹션 1:1 React 포팅 — DetailPresetArticle(순수 presentational·hooks 0→renderToStaticMarkup+클라 공용) + preset-detail.module.css(.root 스코프·semantic 토큰만→data-preset 교체 전섹션 재스킨·hero/story 장식 color-mix 토큰화·terracotta/rose-dust fallback·intensity 패딩 밀도·모바일16px·sticky-buy). 100% props-driven(컴포넌트 한글 0)·인라인 SVG→Lucide(이모지 0). types DetailContent+PresetOverrides(accent/heroCopy/moodImage 슬롯). samples.ko.json 3종(명화 aroma/L3·달항아리 tradition/L3·아이스트레이 kitchen/L1, 한글 데이터 분리). /studio/preset-preview 검증 페이지(상품+preset/intensity 토글 재스킨). 기존 27렌더러 PNG 경로 미접촉. tsc 0/build OK/이모지 0/코드 한글 리터럴 0/sentinel 0/비가역 0. **다음=Desktop /studio/preset-preview 3종 렌더+preset 재스킨 실측. 후속=B-2(SEO 린터)→B-3(generate-detail 소비).**
> 2026-06-09 **적응형 프리셋 엔진 Phase A — 토큰 정합** (Code turn, main 0b969f3, 비가역 0·production 검증). 권위 docs/plan/ADAPTIVE_PRESET_ENGINE_BUILD_PLAN.md commit A. 선행 docs 5df7ba6. 구 --preset-* 6토큰 → :root 고정 코어(--brand-red/pink·Pretendard·Noto Serif KR·8배수 --sp·--r-*·--shadow, 충돌 0) + [data-preset] 5종 semantic(§7.2 verbatim, aroma만 terracotta/rose-dust; bare :root 금지=셸 --surface 비파괴). layout.tsx Noto Serif KR webfont. section-variants --preset-surface→--surface·--preset-text→--ink. concept-presets palette §7.2 리치셋(gift/pet 색 교정). blast radius 0(엔진 미연결). tsc 0/build OK/잔여 --preset- 0/accent 3-way 일치/한글 리터럴 0(신규)/비가역 0. verify-vercel-deploy 0b969f3 OK. **다음=B-1(7섹션 React 렌더러 1:1)→B-2(SEO 린터)→B-3(generate-detail 소비). Desktop B-1서 3종 재스킨 실측.**
> 2026-06-08 **아틀리에 job 생명주기 컨트롤 (취소/재시도/되돌아가 수정)** (Code turn, main d08341e, 비가역 0). 워크벤치 우측 JobLifecyclePanel(asset_jobs 표시·SWR 폴링) 마운트. asset-job-state 전이 확장(in_progress->cancelled·done/cancelled->ready). NEW /api/products/[id]/jobs(GET 목록 / POST control→transitionJob, 소유가드·409). 레드 스코프: 취소=뉴트럴·재시도/되돌아가=아웃라인·레드 0. ★production control loop 실측(명화 10 cancelled→reopen→ready→cancel 복원). tsc 0/build OK/이모지 0/한글 0. **다음=Desktop Control Chrome 패널·컨트롤 동작 실측.**
> 2026-06-08 **아틀리에 2단계 — 우측 독립 스크롤 교정 + 워크벤치 임시저장** (Code turn, main b665440, 비가역 0). (1) 스크롤: 근본원인 WorkbenchTabs overflow:hidden+flex:1 클리핑→overflow:visible·flex 제거+aside max-h calc(100vh-2rem)·overscroll-contain·paddingBottom(바닥 도달). (3) 임시저장: useStudioActions localStorage 디바운스 저장+복원(경량입력·restoredForId 가드)·헤더 표시·가역. (2) job 생명주기는 워크벤치 asset_jobs 표시 통합 별도 turn. tsc 0/build OK/이모지 0/한글 0. **다음=Desktop Control Chrome 스크롤 바닥·복원 실측. 후속=job 생명주기.**
> 2026-06-08 **인제스트 재발방지 + 2갈래 실품질 + 명화 상세 Branch A (명화 큐레이션 完)** (Code turn, main f3c3784, 비가역 0). (1)✅재발방지: parse-dome-no(도매 url 번호 파서)+products create supplier_product_code 폴백(explicit→productNo→url)→누락 0. (2)✅2갈래 실품질: capture가 상세 assess→sourceDetailGood, engine deriveSourceStrategy(A/A_EXTRACT/MIXED/B). production: 명화=A·달항아리=B·아이스트레이=unknown. (3)✅명화 Branch A: adopt-source-detail(detail_image_url=source_detail_url·detailCurated, 가역·생성안함)+DetailPageCard 버튼. 명화 detail=curated 실측. ★명화 큐레이션 完(main+detail curated·A). tsc 0/build OK/이모지 0/한글 0. **다음=Desktop 명화 상세 미리보기 육안+대표 컨펌→SUSPENSION 해제 발행 GO(비가역). 아이스트레이 도매번호 대기.**
> 2026-06-08 **풀해상 상세 캡처(P16 해소) + 명화 main=curated 실행 + 2갈래 sourceStrategy** (Code turn, main 555466c, 비가역 0·네이버 0). ★지난 turn BLOCKED 해소. (1)✅실행: getItemView desc.contents(객체)→공급사 godohosting 풀해상을 Referer fetch→product-assets 저장(source_detail_url 컬럼+capture-source-detail 라우트). 명화 1000x18291 캡처. (4)✅실행: 캡처 소스 thumb-crop box{147,9407,696,696}→1000²(언샤프)·confirm→mainImage=curated(production 실측 default→curated 전이). (2)✅부분: applyStatus.sourceStrategy(A=상세확보 후보) 관제탑 칩. (3)⏸ Branch A SEO보강 후속. tsc 0/build OK/이모지 0/한글 0. **다음=Desktop 명화 main=curated Chrome/육안 실측 + 전상품 capture 실행. 후속=품질 분리 평가·Branch A 보강. 명화 SUSPENSION 해제 대표 GO.**
> 2026-06-08 **명화 큐레이션 마무리 — 정합 통일·상세 curated 한정·크롭 언샤프 (item1 실행 BLOCKED)** (Code turn, main 6bf8ddf, 비가역 0). (4)✅ nextAction SoT 단일 사다리 통일(curated 게이트·drift를 흡수, computeActionQueueItem=매퍼, verify_publish 잔존 제거; 3상품 nextAction==queue 일치 실측). (3)✅ classifyDetail=product-assets AND quality_reasons.detailCurated, apply-detail mostly_blank 검사 후 스탬프(빈 스켈레톤=default; 명화·달항아리 detail=default 교정). (1)✅언샤프(extractSquare 업스케일 시 sigma 1.0) ❌실행: 핸드오프 좌표 1000x18291 공급사 원본이 DB/crawl 부재(domeggook _stt_330=실측 330²만, 타 변형 404)→330²에 좌표=1x1 garbage→#46 미실행. (2)⏸ detail 7섹션 실콘텐츠=skeleton+27 renderer authoring 대형 기능 전용 turn 권고. tsx 7케이스. tsc 0/build OK/이모지 0/한글 0. **다음=Desktop이 1000x18291 상세원본 URL 제공/직접 크롭→endpoint(언샤프) 1클릭 main=curated. detail 실콘텐츠 엔진 전용 turn.**
> 2026-06-08 **applyStatus 정확성 교정 + 전상품 상세페이지 적용 게이트** (Code turn, main 74765e7, 비가역 0·네이버 0). 트랙1(1e5f3a1): publishState=네이버 statusType 캐시 기반(naver_status_type 컬럼+inspect 실측 캐시·SALE만 LIVE·SUSPENSION=drift·미동기=DB) + main/detail 3상태(curated=product-assets/default=공급사원본/none) + actionQueue GO 이전 default→apply_curated_main/build_detail 선행. 명화 전 LIVE 오표기 해소(main=default·publish=DB). 트랙2(74765e7): NEW /api/products/[id]/apply-detail(미리보기 PNG→product-assets→detail_image_url set 가역)+DetailPageCard 2단계 컨펌 게이트→applyStatus.detail=curated. tsx 7케이스. tsc 0/build OK/이모지 0/한글 코드 0. **다음=Desktop inspect 명화→statusType 캐시 재실측 + 상세 generate→미리보기→적용→curated 라이브 실측+대표 컨펌. 후속=detail 7섹션 정합·skeleton 판별.**
> 2026-06-08 **개입 대기열(Operator Action Queue) 전상품 시스템 레이어 + #56** (Code turn, main 415358b, 비가역 0). 권위: OPERATOR_SYSTEM_BLUEPRINT §3·§4. control-tower-engine computeActionQueueItem 파생(nextAction+image 게이트→4분류 AUTO/INPUT_DECISION/GO_PENDING/AUTH, 신규 컬럼 0·전상품)+matrix row actionQueue+관제탑 상단 OperatorActionQueue 위젯(카테고리 칩·상품·행동 1줄·1클릭 deepLink·순서 강제 0·레드=GO_PENDING만). 적용현황(결과축)↔개입대기열(행동축) 한 쌍. P3 폴리시: 프롬프트 복사 CTA→뉴트럴. PRINCIPLES #56(개입 자연스러움). tsx 8케이스. tsc 0/build OK/이모지 0/한글 코드 0. **다음=push+verify → Desktop Control Chrome 실측(4분류·deepLink·레드 스코프). 후속=딥링크 정합 2차·Chrome MCP 반자동 3차.**
> 2026-06-08 **아틀리에 워크벤치 UI 재설계 1단계 + 적용현황 인디케이터 + #54/#55** (Code turn, main 직접, 비가역 0). 권위: STUDIO_ATELIER_UX_REDESIGN + always-state-status 결정문. 트랙A(d91ad9b): P1 AiQueueStepper 4열→세로 스텝 리스트(overflow 해소·제목잘림/배지겹침 0)·P3 워크벤치 레드 제거(메인지정 CTA만 유지)·P5 프롬프트 라벨/값 분리·P6/P2 ThumbnailCard 1차 상단강조+2차 Disclosure 접힘+중첩박스 제거. 트랙B(6516c4b): control-tower-engine ApplyStatus 4필드 tri-state(LIVE/DB/미적용·기존신호 파생·전상품)+관제탑 ApplyStatusIndicator(레드 0)+PRINCIPLES #54(적용현황 항상명시)·#55(전상품 범용). tsc 0/build OK/이모지 0/한글 코드 0. ★후속: P4 공유 Card 배지·2단계 전 /studio·스튜디오 헤더 미러. **다음=push+verify → Desktop Control Chrome 실측(카드 overflow=false·레드 1곳·1차강조/2차접힘·applyStatus 라이브).**
> 2026-06-07 **크롭 스튜디오 main 병합 + production 배포** (Code turn, main FF merge, 비가역 0). 대표 승인: feature/crop-studio(T1~T6 완성본) → main fast-forward 병합 + push. 표준 §1 outpaint 보강(고해상 비율전환용·저해상 prominence는 타이트크롭+업스케일<=1.8x 1순위). verify-vercel-deploy --wait로 production HEAD == 병합 SHA 확인(이제 main 배포라 검사 정상). **다음=Desktop production 3중 검증(/preview 크롭 스튜디오·라인 배지·contain dry-run) → 명화 라인A 대표 확정 → 발행 GO(비가역, 대표 승인).**
> 2026-06-07 **T6 크롭 주제 완전포함 가드 (크롭 스튜디오 완성본)** (Code turn, feature/crop-studio 11f6287 push, 비가역 0·네이버 미접촉). 권위: crop-full-subject-containment 결정문. quality-classifier.detectSubjectBBox(기존 bg-ring+SUBJECT_DELTA 재사용→제품 bbox source px). NEW subject-containment.ts(순수): containmentSquare(bbox+>=8% 패딩 완전포함 최소 정사각·소스 부족 시 contained=false+expandPx)/boxClipsSubject/snapBoxToSubject. simple-crop: contain(자동 완전포함)·enforceSubject(수동 침범 차단)·allowSubjectClip(소품 예외)+SUBJECT_CLIPPED 경고(자동 warn+canvas_expand/수동 침범 block). 크롭 스튜디오: bbox 오버레이+완전포함 자동후보(onLoad)+침범 빨강 경고+"주제 완전포함으로 맞춤" 스냅+소품 예외. 표준 §1 정량 규칙(>=8% 패딩·확장 우선) 명문화. tsc 0/build OK/이모지 0/한글 코드 0/tsx 9케이스. **다음=push → Desktop /preview Chrome 실측(bbox·완전포함·스냅·침범 차단) + feature/crop-studio → main 병합 GO.**
> 2026-06-07 **크롭 스튜디오 T1~T5 시공** (Code turn, feature/crop-studio df9b6ac push, 비가역 0·네이버 미접촉). 권위: THUMBNAIL_CROP_EDIT_STANDARD + HANDOFF_5_crop_edit. T3=asset_jobs job_type 21→25(region_crop/text_remove/canvas_expand/bg_clean, apply_migration phase4·Desktop 25값 검증 통과) + job-type-routing(region_crop→sharp / 편집3종→firefly|adobe_express). T2=simple-crop CropWarning severity(block/warn)+remediation — 해상도 경고화(라인A <1000px 적용 허용)·TEXT_DETECTED만 차단(Naver 2024-10-28). T1=발행전 검수화면(/preview)에 CropStudioPanel(소스선택+영역 드래그 1:1+자동 후보 갤러리+대표 적용 가역+편집3종→asset-edit-job 시드 input_refs 좌표). T4=control-tower-engine 라인 A/B 자동판정(deriveLine)+★운영자 override 우선(resolveLine, 명화 ENHANCE/62→A 미덮어씀)+nextAction 라인별(crop_pick/build_image)+publish-preview 라인 인지 게이트+관제탑 LineCell 배지/토글(POST /line). T5=등록 전상품 verify_publish→/preview 수렴(파이프라인 product-agnostic). tsc 0/build OK/이모지 0/한글 코드 0/tsx 16케이스 실증. **다음=push → Desktop /preview 크롭 스튜디오 Chrome 실측 + 라인 배지/override + 라인A 명화 게이트 + feature→main 병합 결정.**
> 2026-06-07 **P3 4중컬럼 동기 + 재질/색상 필수속성 enum** (Code turn, push 대기, 비가역 0·네이버 미접촉·DB 가역만). 항목1 재질/색상: src/lib/naver/category-attribute-enums.{ts,ko.json} — 재질/색상 큐레이트 enum + normalizeAttributeValue(exact/synonym/substring/기타 fallback, 자유입력 금지). POST /api/products/[id]/attributes(dry-run 기본·완성도 before/after·confirm 시 naver_material/color enum 기록). getD1CategoryName export. 실증: 50003356=가구/인테리어 required[브랜드·재질·색상], BEFORE missingRequired[재질·색상]C/31(핸드오프 dryRun 일치)→AFTER(유리/투명)[]A/78. ★빌더는 구조화 카테고리 속성 미전송이라 missingRequired=내부 완성도 게이트(naver_material/color); 구조화 Naver attributeId/valueId 제출은 라이브 스키마 조회=별건(#46 정직). 항목2 P3 SoT: seo-text confirm 시 seoTitle←naver_title·keywords←tags·brand_line←분류 line 동기(발행 빌더 name=naver_title/sellerTags=tags 현행 유지, 내부 비동기만 제거). 항목3 naver_certification: 대표 HB 4향 입력 대기. tsc 0/build OK(attributes ƒ)/이모지 0/한글 코드 0(FALLBACK='기타' 데이터 리터럴만). **다음=push → Desktop: attributes dry-run(유리/투명) missingRequired 0 재단정 + confirm 반영 → update dryRun missingRequired 0 확인 → SUSPENSION 해제(안전번호 확정 후 대표 GO).**
> 2026-06-07 **작업7 seo-text 재수정 (2회째 결함 교정·#45 정직)** (Code turn, push 대기, 비가역 0). ★ 직전 over-claim 원인: smoke가 top-level tags(10)를 읽었으나 Desktop은 draft.tags(null)를 읽음 — draft 객체에 tags 필드 부재. 수정: (1)SeoTextDraft.tags 필드 추가 + 라우트가 verifyTags 선별 결과를 draft.tags에 연결(verified>weak 10, 제한어 제외) (2)composeName situational append 제거 — 상품명 스터핑 0(신차선물/운전자선물/차량인테리어는 tags로만, 상품명=핵심+롱테일 자연 50자 내) (3)scents는 body(정보고시 4종) 우선·DB 전체 읽기(옵션 동기화 별건) (4)attributes.origin=DB SoT(body 오버라이드 제거; Desktop 교정 후 국산). 명화 생성기 실증: name 32자·스터핑 0·차량용 1회·tagCandidates 24·draft.tags 라우트 연결. tsc 0/build OK/이모지 0/한글 코드 0. **다음=push → Desktop dry-run 재검증(draft.tags 10 non-null·상품명 스터핑0·origin 국산). 안전번호 에이프릴/레몬 확정→SUSPENSION 해제 대표 결정.**
> 2026-06-07 **작업5 간편 크롭 + 작업6 BG_SWAP 연결** (Code turn, push 대기, 비가역 0·네이버 미접촉). 작업5: src/lib/images/simple-crop.ts — 상세페이지 입력→1:1 크롭(사람 box 또는 sharp 네이티브 strategy.attention/entropy, smartcrop-sharp 의존성 회피 #38)→1000px Sharp 규격화→OCR 정책가드(p-filter-watermark ocrFullFrame 재사용·전체프레임). 누끼/합성 없음. 소스/크롭<1000px LOW_RESOLUTION 경고(437px 화보)·SOURCE_TOO_SMALL·TEXT_DETECTED(2024.10.28). 라우트 /thumb-crop(dry-run·base64 미리보기·경고). 합성 검증: 2000→1000x1000 무경고/437→LOW_RESOLUTION/box. 작업6: src/lib/jobs/enqueue-mode-chain.ts — recommended_mode 체인을 asset_jobs로 시드(멱등·quality_assess=done·첫 작업 ready·나머지 blocked). NEW=기존 B안 swap 6단계(STAGE_ORDER 정합, express_finalize 추가) 시드 → 기존 /swap UI가 그대로 구동(bg_swap 재사용). 라우트 /enqueue-pipeline(P2021 가드). tsc 0/build OK(thumb-crop·enqueue-pipeline ƒ)/이모지 0/한글 코드 0/비가역 0. **다음=push → Desktop: thumb-crop 명화 화보 실측(경고·OCR) + enqueue-pipeline 실상품 시드 검증. MD분할(#31) 별도 commit. 작업5~7 전 완료.**
> 2026-06-07 **작업7 SEO 생성기 재수정 — 실제 태그 확장 엔진** (Code turn, push 대기, 비가역 0·DB 가역만). 근본: 직전 생성기가 입력 재배열만(빈 body=공허 tags[]/attributes{}/형태소 중복). 재구현: (1)라우트가 product의 keywords/targetKeywords/naver_keywords/tags/product_options를 실제 read해 roots/attrs 소싱 (2)expandTagCandidates 풀(roots→scents→modifier×nounRoot 복합어→synonyms→situational, RESTRICTED_SELLER_TAGS exact 필터, 24캡) (3)verifyTags 태그사전으로 풀 검증→verified>weak>missing 선별 10(error 제외, weak 대체) (4)composeName 형태소 collapse(≥3자 선행 형태소 1회 — 차량용방향제+차량용디퓨저→차량용 1회). 확장사전 tag-expansion.ko.json(데이터). RESTRICTED_SELLER_TAGS export. 명화 실데이터 검증: name 50자·차량용 1회·풀 24·제한어 0·attributes(향4·제형·용량·제조국·용도) 채움·findings 0. tsc 0/build OK/이모지 0/한글 코드 0. **다음=push → Desktop seo-text 명화 dry-run 재검증(태그사전 status·10태그·attributes). 작업5(간편 크롭)·6(BG_SWAP)·MD분할(#31) 다음 turn.**
> 2026-06-07 **Track B 결함2 + 안전기준ETC + 작업7 SEO 텍스트** (Code turn, push 대기, 비가역 0·네이버 미접촉·DB 가역 UPDATE만). 결함1: MIGRATION_phase3 테이블명 products→Product 교정(Product=PascalCase 무 @@map / asset_jobs=snake @@map 규약 주석). 결함2: assess-quality quality_reasons JSON 평탄화 영속 + read-back 자기검증(persisted/storedReasonsCount 응답, #46). 안전기준: product-builder ETC 빌더에 생활화학제품 안전확인 신고번호(HB) surfacing — naver_certification SoT, qualityAssuranceStandard 병기(값 있을 때만·회귀 0·방향제 SUSPENSION 해소 선결). 작업7: src/lib/seo/seo-text-generator.ts(brand_line 템플릿 SEED/GREENHOUSE·토큰 dedup·50자 캡·detectNameRules 재사용) + POST /api/products/[id]/seo-text(dry-run 기본·verifyTags 태그사전·confirm 시 naver_title/tags DB 반영). 명화 초안 실증(48자·중복제거·findings 0·태그 10). tsc 0/build OK(seo-text·assess ƒ)/이모지 0/한글 코드 0(주석 영어·데이터 리터럴만)/비가역 0. **다음=push → Desktop: assess-quality persisted=true 재검증 + seo-text dry-run 명화 + 제조국 확정→originCode 교정→안전번호 입력→update dryRun→대표 승인 SUSPENSION 해제. 작업5(크롭)·6(BG_SWAP)·MD분할(#31) 다음 turn.**
> 2026-06-07 **적응형 3모드 시스템 앱 내장 (Track B) — 작업 1~4** (Code turn, push 대기, 비가역 0·네이버 미접촉·DB 신규 컬럼/CHECK만). 권위: KKOTIUM_ADAPTIVE_SEO_IMAGE_SYSTEM_2026-06-06 §1/§5. 작업1: Product에 brand_line(SEED|GREENHOUSE)·quality_score(0-100)·recommended_mode(SIMPLE|ENHANCE|NEW)·quality_reasons(Json) 추가(인덱스 컬럼만·관계 0·DB CHECK) + 마이그레이션 박제 MIGRATION_phase3_adaptive_mode_2026-06-07.sql(Phase1/2 이후 ALTER, Desktop apply 선행). 작업2: src/lib/images/quality-classifier.ts 정량 1차 분류기(해상도·라플라시안 선명도·가장자리 단색도·1:1·피사체비중·텍스트밴드 휴리스틱 → 0~100 + recommendedMode + needsVlm 40~70). VLM 2차 assessWithVlm 시그니처만(null). 합성 3샘플 판별 실증(간편75/보강54경계/신규31). 작업3: 관제탑 매트릭스 모드 배지(간편/보강/신규+점수+출처) + 1클릭 변경 ModeCell + POST /api/products/[id]/mode(오버라이드) + POST /api/products/[id]/assess-quality(QUALITY_ASSESS 실행, node runtime) + matrix API mode 필드(컬럼-부재 P2021/P2022 가드 #50). 작업4: asset_jobs job_type CHECK +5(quality_assess/thumb_crop/seo_text/seo_image/bg_swap) + src/lib/jobs/mode-chains.ts 모드별 체인(SIMPLE=크롭+SEO / ENHANCE=+이미지 / NEW=B안 풀+SEO). tsc 0/build OK(신규 3라우트 ƒ 등록)/이모지 0/한글 리터럴 0(주석 영어·문구 JSON)/비가역 0. **다음=push → Desktop Supabase apply_migration(Phase1→2→3) + Chrome 관제탑 모드 배지·1클릭 실측 + assess-quality 실상품 점수 검증. 작업 5~7(크롭도구·BG_SWAP재사용·SEO텍스트)은 다음 turn.**
> 2026-06-06 **Phase 2 제품교체(B안) 루프 앱 내장 — 스키마 확장 + 상태머신 + 워크플로우 UI + Sharp 규격화** (Code turn, 코드 d059acd/870fd19/f4ae170/e0090b3 push 대기, 비가역 0·네이버 미접촉). 권위: KKOTIUM_PRODUCT_SWAP_LOOP_DESIGN §1/§6/§7/§8. B안=실제 제품 누끼 고정+배경만 AI(A안 재생성 폐기). 작업1: AssetJob+concept_combo_id·AssetReference(조인) + job_type 6종/status 4종(awaiting_human 등) DB CHECK 확장(마이그레이션 박제 MIGRATION_phase2, Phase1 이후 ALTER). 작업2: 상태머신 전이 확장(awaiting_human/human_done/review/rejected, 사람 재시도 루프). 작업3: /api/products/[id]/swap-pipeline(DB만·P2021 가드) + /products/[id]/swap UI(컨셉카드+단계 타임라인+awaiting_human 딥링크 CTA+before/after 슬라이더+승인/거부). 작업4: 관제탑 매트릭스 awaiting_human(attention) 핀. 작업5: naver-normalize.ts(대표 1:1 1300px 흰배경 / 상세 860px) + ★대표 흰배경 가드(assetKind+4모서리 luma/chroma). 작업6: 5종 MD + 작업원칙 #51(B안)/#52(브라우저 반자동)/#53(도구 적재적소). tsc 0/build OK/이모지 0/한글 리터럴 0. **다음=push → Desktop Supabase apply_migration(Phase1→Phase2) + Chrome swap UI 실측 + 명화 B안 end-to-end(고해상 누끼 확보 선결). 명화 SUSPENSION 대표 의도(결함 아님).**
> 2026-06-06 **Phase 1 누락 방지 골격 — asset_jobs 상태머신 + 관제탑 매트릭스** (Code turn, 코드 a55976b/e9a6c95 push 대기, 비가역 0·네이버 미접촉). 권위: KKOTIUM_HYBRID_PIPELINE_SYSTEM_DESIGN §4/§7. 작업1: Prisma 3종(AssetJob/AssetJobTransition/PublishedAsset, BackdropJob 선례—cuid·product_id 인덱스컬럼으로 Product 미접촉·String enum DB CHECK·version 낙관적잠금·ip_safe·heartbeat) + 마이그레이션 SQL 박제(docs/handoff/MIGRATION_phase1_asset_jobs_2026-06-06.sql, Desktop apply_migration 선행). 작업2: src/lib/jobs/asset-job-state.ts(transitionJob 허용전이+낙관적잠금+전이로그 / claimNextJob FOR UPDATE SKIP LOCKED / detectZombies heartbeat 10분, 순수 DB). 작업3: /api/products/asset-jobs-matrix(읽기전용 집계) + ControlTowerMatrixWidget(상품x트랙 이미지/발행/회선/운영정합, 막힘행 핀·WIP 카운터·누락칩, 한글 JSON·이모지 0) 대시보드 마운트. ★ 역순배포 안전(#50): P2021 가드로 마이그레이션 전 push해도 무중단(migrationPending degrade). 작업4: 5종 MD + #50 등재. tsc 0/build OK/한글 리터럴 0. **다음=push → Desktop Supabase apply_migration + Chrome 관제탑 실측 → Phase 2(ip_safe 발행게이트+2단계발행). 명화 SUSPENSION은 대표 의도(결함 아님).**
> 2026-06-06 **GET-merge updateStock 배포 + inspect statusType 거짓초록 교정 + sync/cron 엔드포인트 오용 교정** (Code turn, production HEAD e3ab753, 실 PUT/OOS 0). 직전 inspect 실측(13564133057=originProductNo·shape 호환 VALID)으로 게이트 해제 → 작업1: GET-merge 번들(api-client.ts updateStock/setProductOutOfStock/bulkUpdateStock 전부 getProduct→stockQuantity override→전체 PUT + CLAUDE.md §3-7) 커밋 5f68d47. 작업2: inspect 인라인 drift가 name·salePrice만 비교해 SUSPENSION을 inSync:true 오판하던 거짓초록 교정 — App status→네이버 statusType 매핑 추가(c6d00de). diffNaverProduct는 이미 statusType 보유, 실누락은 inspect였음(#46). production 실증: 명화 drift inSync:false·diffs=[statusType SUSPENSION≠SALE]. 작업3: sync/route.ts:40+cron/daily:87이 origin 번호에 channel-products(404 위험) → 양쪽 /v2/origin-products로 교정, cron 자동중지(LIVE PUT)는 NAVER_AUTOSUSPEND_ENABLED 게이트(기본 off, off면 wouldSuspend 후보만·비가역 0)로 감쌈(e3ab753). tsc 0/build OK/이모지 0. verify 180s timeout이나 gh api로 e3ab753 state=success 확인. **다음=Desktop GET-merge dryRun 교차검증 / 명화 SUSPENSION 해제(대표 승인,비가역) / 명화 이미지 반영 / AUTOSUSPEND 활성 결정 / `* 2.*` 정리(#34).**
> 2026-06-06 **읽기전용 inspect 라우트 신설 + 명화 상품번호 종류 실측 확정 — 13564133057=originProductNo** (Code turn, production HEAD cb15dfb, 비가역 0·GET only). 배경: GET-merge updateStock 배포 전 Desktop 검증서 미확정 2건 — (1)naverProductId가 origin/channel 번호 불명(채널 정황) (2)GET origin-products가 PUT body 호환 shape인지. 작업1: `GET /api/naver/products/[productId]/inspect` 신설(mutate 0). origin-products+channel-products 양 probe→numberKind 분류·resolvedOriginProductNo 역추적·putTargetWarning·originProductRaw·drift 인라인. `?probe=<no>` raw 검증. naverRequest/NaverApiError(HEAD)만 import→단독 배포(GET-merge 미동반). ★실측(production probe 13564133057): **numberKind=ORIGIN** — origin GET 200·channel GET 404 → 13564133057=originProductNo, storedIsCorrectPutTarget=true. Desktop '채널번호' 가설 반증, PUT /origin-products/13564133057 정타 → 작업2(번호교정) 불필요. ★shape: GET originProduct top-keys(name/salePrice/stockQuantity 2997/statusType/leafCategoryId/images/detailContent/detailAttribute/deliveryInfo/customerBenefit/saleType)=PUT body 동일 → GET-merge 전제 VALID. 부수: 명화 statusType=SUSPENSION(앱 ACTIVE drift)·기존 sync/cron이 origin 번호에 channel-products 엔드포인트 오용(404 가능). tsc 0/build OK/이모지 0. **다음=정합 확정 → GET-merge 배포 승인 요청(uncommitted api-client.ts) / 명화 SUSPENSION 확인 / sync·cron 점검 / 명화 이미지 반영(비가역).**
> 2026-06-06 **updateStock 부분 PUT 위험 안전화 — GET-merge 전체 페이로드 교체 + 양방향 동기화 T2.5 트랙 신설** (Code turn, production HEAD 1b69cd3 기준 작업, 비가역 0·실 PUT 0). 배경(Desktop 코드 직독 확정): api-client.ts updateStock이 `{originProduct:{stockQuantity}}` 부분 PUT 사용 — 네이버 v2 PUT은 전체 페이로드 교체(누락 필드 제거, #1650)이므로 재고만 보내면 상품명/가격/이미지/옵션/원산지/상세 전소실 위험. setProductOutOfStock·bulkUpdateStock도 동일 의존. **작업1 전수조사**: 라이브 호출처 단 1개 = mark-oos route:95 setProductOutOfStock(UI 품절버튼 alsoNaver=true 옵트인, 기본 false) → 라이브(긴급). bulkUpdateStock 미사용. 폴러 updateStockProfile은 무관 로컬 DB함수(api-client 미import, 재고 cron은 네이버 push 안 함). **작업2 안전화**: updateStock을 GET-merge로 교체(getProduct로 현재 전체 originProduct read→stockQuantity만 override→전체 PUT). 이미지 재업로드 0·DB의존 0·네이버 측 변경분 보존. `{dryRun:true}` 옵션(GET-merge 미리보기, PUT 미실행). setProductOutOfStock/bulkUpdateStock 동일 경로 통일, bulkUpdateStock은 productNo 없으면 skip. **작업3 T2.5**: diffNaverProduct(읽기전용 drift diff) 헬퍼 추가 + 마스터 플랜 T2.5 '네이버 양방향 동기화 정합성' 트랙 신설 + CLAUDE.md §3-7 '재고 수정도 전체 페이로드 교체 필수' 등재. 검증: 오프라인 merge 증명(구PUT 8필드 소실 vs 신merge 9필드 보존+stock 50→0)·TSC 0·build OK·이모지 0(★ 주석 마커)·가짜 라벨 0(#46). **다음=Desktop 교차검증(GET-merge+diffNaverProduct) → 대표 승인 시 실 OOS 1건 검증 → 명화 이미지 반영 트랙(update confirm:true, 비가역) 재개. 의심파일(#34): `* 2.*` macOS 중복본 untracked 다수, 대표 정리 결정 위임.**
> 2026-06-05 **네이버 상품 수정 API 라우트 신설(PUT origin-products) + update dryRun 검증** (Code turn, production HEAD 70b4edc, 비가역 0·dryRun까지만). 배경: 명화(13564133057 ACTIVE) 발행 성공했으나 대표이미지가 공급사 원본 — 교정된 누끼를 반영할 상품 수정 라우트가 앱에 없었음(register는 신규 전용). 작업1: src/app/api/naver/products/update/route.ts 신설 — POST {productId, dryRun?, confirm?, fields?}, 엔드포인트 PUT /v2/products/origin-products/{originProductNo}. ★ Naver v2 수정은 전체 페이로드 교체(누락 필드 제거, 공식 commerce-api #1650) → buildNaverProductPayload 전체 재구성 후 PUT(register 빌더 재사용). 안전장치: 실 PUT은 confirm===true && dryRun!==true 일 때만, 기본은 dryRun preview(비가역 0). 이미지 수정 시 uploadImagesToNaver(shop-phinf) 선행. naverProductId 없으면 409. 작업3 dryRun GREEN: mode UPDATE·canRegister true·originAreaCode 0200037·sellerTags 제한어 0·옵션 3 distinct·PUT 0. ★ 작업2 발견: representativeImage가 여전히 Cloudinary 공급사 원본 — buildNaverProductPayload는 product.mainImage를 읽는데 이 값이 공급사 원본을 가리킴. 교정된 clean 썸네일은 main_image_url(Supabase)에 저장되나 빌더가 미독 → 실적용 전 mainImage 승격이 선결조건(정직: 현 상태로 PUT하면 공급사 원본 재전송). TSC 0/build OK. **다음=Desktop update dryRun 교차검증 → mainImage 승격(clean 썸네일 재생성→저장→셋) → 대표 승인 → update confirm:true 실 PUT(비가역).** 잔여: updateStock 부분 PUT 잠재 위험(전체 페이로드 원칙 위배) 별도 점검.
> 2026-06-05 **이미지 파이프라인 리서치 저장 + 개선 마스터 플랜(5트랙) 생성 + 운영 원칙 갱신** (Code turn, production HEAD bd28efe, docs only·비가역 0). 리서치(docs/research/KKOTIUM_IMAGE_PIPELINE_RESEARCH_2026-06-05.md) 핵심 3결론: (1) Firefly Services API 1인셀러 비현실적($1,000/월 엔터프라이즈) → 메인컷만 수동, 누끼/합성/상세/카피는 Bria AI(무배상)+자체 Sharp 자동화 (2) 네이버 2024-10-28 대표이미지 기준 강화 → 단일 본품 누끼+자체 배경 방향 정합, 공급사 원본 직송 금지 (3) backdrop_jobs→asset_jobs 범용화 + 라이선스 3-레인 라우터(green/amber/red) + 발행 검수 대시보드, 대표 개입은 메인컷 선택·발행 직전 승인 2지점만. 마스터 플랜(docs/plan/IMAGE_PIPELINE_IMPROVEMENT_MASTER_PLAN.md) 5트랙: T1 asset_jobs 범용화+라이선스 티어 / T2 Bria PoC / T3 3-레인 라우터 / T4 발행 검수 대시보드+시안 선택 UI / T5 앱-Desktop-MCP 연결+워크플로우 통합. CLAUDE.md §3-6 신설(라이선스 안전·브라우저 자동화 금지·네이버 대표이미지 규정·디자인 가공본 필수·자산 이름 규약). 현황: 명화 첫 발행 SUCCESS(13564133057 ACTIVE) + 이미지 배선 교정 완료(cutout auto-cache, Desktop 육안 GREEN). **다음=T1 asset_jobs 범용화(대표 승인 게이트).**
> 2026-06-05 **명화 이미지 배선 결함 교정(Storage 자산 정렬) + 소싱 추적성 복원** (Code turn, production HEAD 6698fb0, 코드 변경 0·Storage/DB 가역·네이버 상품 미접촉). 근본원인(Storage 직독 확정): 엔진(asset-source-resolver)은 고정 이름 cutout.png/backdrop-{skeletonId}.png을 findCachedAsset로 조회하나, Storage엔 myeonghwa-cutout.png(Desktop 임시 업로드)만 존재 → cutout 미발견 fallback=공급사 원본 4세트 진열컷 합성. ★ 핸드오프 부분 정정: backdrop-S6.png는 이미 존재·auto-cache 작동(배경은 정상이었고 cutout만 결함). 작업1(자산 정렬, scripts/upload-cutout.js): myeonghwa-cutout.png→cutout.png 배포 + 기존 backdrop-S6.png→backdrop-S6-prev-firefly.png 백업 후 큐레이트 myeonghwa-backdrop-860.jpg(jpg→png 변환)→backdrop-S6.png 업그레이드(가역). 작업2 정정(#46): save-assets는 thumb/detail 출력만 저장(cutout/backdrop 입력 미관여) — 핸드오프 전제 오조준. 정식 배포 도구 scripts/upload-cutout.js는 이미 엔진 이름 사용 → 코드 결함 0, 근본 교정=배포 시 스크립트 사용(프로세스). 작업3 검증: production 썸네일 재생성 assetSource cutout fallback→auto-cache·backdrop auto-cache(육안 교차검증 Desktop 위임). 작업4: crawl_logs(0b21ac95, domeggook 65322245) product_id→명화 링크(1행). 근본 점검: batch-register는 productId 자동 배선, 수동 경로(crawl→products/new) 미배선 갭=후속. ★ 정직: 네이버 발행상품(13564133057) 대표/상세는 아직 공급사 원본 그대로 — 본 turn은 Storage/썸네일 엔진만 교정, 네이버 상품 이미지 수정은 비가역이라 별도 turn(대표 승인). **다음=Desktop 썸네일/상세 육안 검증 → 네이버 상품 이미지 수정(대표 승인) → 명화 '제대로 등록' 완성.**
> 2026-06-05 **★ P0 명화 첫 발행 SUCCESS — naverProductId 13564133057, ACTIVE** (Code turn 기록, production HEAD 0d8793e, docs only·본 turn 비가역 0·발행은 직전 완료). Desktop register(3차 시도, production curl) HTTP 200·success=true·naverProductId 13564133057. Code 독립 3중 재검증(#45): (1) Product 행 status DRAFT→ACTIVE·naverProductId 13564133057·updatedAt 2026-06-05 09:54:37 (2) product_events NAVER_REGISTERED DRAFT→13564133057 09:54:37.265 (register 성공 경로 실행·로깅 확정) (3) 스토어프론트 smartstore.naver.com/kkotium/products/13564133057 non-404(Desktop 403/24B·Code 재확인 429/23585B, bot/rate-block=상품 실재 방증). 발행 차단 4대 결함 전부 교정 완료: (1) 원산지 0200037 선행0 (2) sellerTags 제한어 필터 (3) 옵션 조합 중복(optionName1~4 규격) (4) 엑셀 옵션 소스 정합(product_options). 엑셀 일괄등록 백업경로 Desktop 독립 재검증: 옵션 5칸(조합형/향/레몬유칼립,에이프릴 후레쉬,블랙체리/0,0,0/999,999,999) 채워짐·회귀 0. **다음=둘째 상품(달항아리/아이스트레이) 발행(동일 엔진, 막힘 적을 것) + 명화 재질/색상 발행후 보강(A안, 신상품 가점 24~48h).**
> 2026-06-05 **엑셀 옵션 소스 불일치 근본 결함 교정 → 옵션 5칸 채워짐 실증** (Code turn, production HEAD 17dd50f, 발행 미접촉·비가역 0). 근본원인(Desktop 엑셀 실물 파싱 + Code openpyxl 재실측): /api/naver/excel buildOptionFields가 레거시 Product.optionType/optionName/options만 읽음. 명화 옵션(향 3종 레몬유칼립/에이프릴 후레쉬/블랙체리 stock 999)은 product_options 테이블(API 발행이 읽는 곳)에 저장 → 엑셀 옵션 5칸 전부 빈값 = 엑셀과 API 발행이 서로 다른 옵션 소스(불일치, crawl-option-mapper 계열 이력). 교정: excel/route.ts Prisma include에 product_options 추가 + buildFromProductOptions 신설(option_type/option_names/option_rows → 네이버 5칸, 단일축 조합형 콤마·dedup·빈값 제거, 다축 newline 그룹 구분 명세) + 레거시 fallback 유지(옵션 없는 상품 빈값 보존 회귀 0). API buildOptionInfo와 동일 소스(product_options) 정합. 재검증(Code openpyxl 직접): 옵션형태 조합형·옵션명 향·옵션값 '레몬유칼립,에이프릴 후레쉬,블랙체리'·옵션가 '0,0,0'·옵션 재고수량 '999,999,999'. 회귀 0: 원산지 0200037·카테고리 50003356·판매가 29000·재고 999·대표이미지 Cloudinary·상세설명 Supabase 불변. TSC 0/build OK. **★ 실 register는 대표 재승인 후(비가역).** 다음=Desktop 엑셀 재검증 + API 3차 발행(대표 재승인).
> 2026-06-05 **register 400 2차 원인(sellerTags 제한어 + 옵션 조합 중복) 근본 교정 → dryRun 재GREEN** (Code turn, production HEAD f82e525, 발행 미접촉·비가역 0). 1차 원산지 0200037 교정 통과 후 2차 register 400 invalidInputs 2건(Desktop 라이브 실측 verbatim): (1) Restricted.sellerTags '등록불가 단어(차량용방향제,디퓨저,차량방향제,자동차방향제) 포함' (2) Duplicated optionCombinations '(향)'. 근본원인: DB 결백(옵션 값 distinct·keywords에 제한어). 빌더 결함 — buildSeoInfo가 keywords를 sellerTags로 그대로 송출 + buildOptionInfo가 optionName1에 축이름('향')을 3행 동일 주입하고 비규격 optionValue1 사용(네이버 v2는 optionName1~4=각 축의 값, 축이름은 optionCombinationGroupNames에만, 출처 commerce-api #241) → 3행 중복 판정. 교정: buildSeoInfo RESTRICTED_SELLER_TAGS(관측 4단어 exact match, '차량용디퓨저'는 정상 보존) 필터·0개면 sellerTags 생략(name/keywords 미접촉) + NaverOptionItem/buildOptionInfo optionName1~4=값 규격 정합·optionValue 제거·dedup 가드 + dryRun preview에 sellerTags/optionValues 노출(DEBT-13 가시화). dryRun 재검증 GREEN: sellerTags [에어컨냄새제거·차량용디퓨저·명화](제한어 0)·옵션 값 3 distinct(레몬유칼립/에이프릴 후레쉬/블랙체리)·originAreaCode 0200037·canRegister=true·회선 200. TSC 0/build OK. **★ 실 register는 대표 재승인 후(비가역).** 다음=Desktop 재검증 → 대표 재승인 → 재 register.
> 2026-06-05 **원산지 코드 선행 0 절삭 근본 결함 교정 → 명화 발행 재준비 GREEN** (Code turn, production HEAD 63c912c, 작업2 DB 1행 가역·발행 미접촉). 근본원인(Desktop 공식 xls 직독 확정): 원산지코드.xls(519행) 권위 — 중국 0200037·미국 0204000·국산 00·해외 7자리 497개 전부 선행 0. naver-origin-codes.ts auto-gen이 코드를 number 처리해 선행 0 절삭(0200037→200037, 00→0, 0001→1, 키 충돌) → 명화 DB originCode=200037 오염 → 네이버 register 400 'originAreaCode NotValid' = 모든 해외 소싱 상품 발행 차단 시스템 결함(과거 '200037 정상'은 로컬끼리 대조한 오진, 정정). 교정 4축: (1) naver-origin-codes.ts xls 권위 재생성(dtype=str 선행 0 보존, 518건, cross-check origin-codes-full 차집합 0, 헤더 '숫자 변환 금지' 경고) + codes.ts KKOTIUM_DEFAULTS '200037'→'0200037'(신규 상품 재오염 차단) + products/new stale 주석 정정(#44). (2) 명화 DB originCode 200037→0200037 UPDATE(status DRAFT·naverProductId null·naver_origin '중국' 불변, 가드 WHERE). (3) product-builder resolveOriginAreaCode 가드(공식표 대조·선행0 복원·미해결 빌드 거부, dryRun도 검증 경유 → DEBT-13 거짓 초록 차단) + legacy register route 동일 가드. (4) dryRun 재검증 GREEN: originAreaCode=0200037·canRegister=true·회선 200. TSC 0/build OK. **★ 실 register는 대표 재승인 후(비가역).** 다음=대표 재승인 → 재 register(명화).
> 2026-06-05 **P0 명화 첫 발행 시도 → 네이버 400 거부(원산지 코드), 발행 실패·DB 미변경** (Code turn, production HEAD 0996ebd, ★작업2만 비가역 시도·실패로 mutate 0). 대표 명시 발행 GO 수신 → 발행 직전 3축 재실측 GREEN(회선 200·dryRun canRegister=true·DRAFT·naverProductId null) → 실 register POST 1회(경로 2, production endpoint). 결과 **HTTP 400 BAD_REQUEST**: originProduct.detailAttribute.originAreaInfo.originAreaCode 'NotValid'("원산지 상세코드 항목이 유효하지 않습니다"). 근본원인: product-builder.ts:725 기본값 '0200037'(선행0·7자리)인데 명화 originCode='200037'(naver-origin-codes.ts:332 동일)을 :770 originAreaCode로 그대로 전달 → 네이버 거부. dryRun은 네이버 미POST로 못 잡음(거짓 초록, DEBT-12류 → 신규 DEBT-13 등재 후보). **DB 미변경 확정**: status DRAFT·naverProductId null·updatedAt 2026-06-03 불변 = 상품 미생성·부분발행 0(register 실패 경로 mutate 0 설계 작동). 이미지는 register 전 네이버 업로드됨(shop-phinf 대표 치환 확인)=상품 미연결 이미지(발행 아님). 가짜 ID/완료 0(#46). **다음=originAreaCode 포맷 교정(200037→0200037 추정) → 재실측 → 대표 재승인 후 재발행**.
> 2026-06-05 **P0 발행 직전 실측 완료 + 발행 실행 경로 확정** (Code turn, production HEAD f2ea274, docs only·비가역 0). 권위: HANDOFF_publish_precheck_2026-06-05.md(#49 Desktop 산출→Code 저장 위임). Desktop 발행 직전 라이브 실측(Supabase 직독+Vercel MCP+curl 이미지 생존): 명화 cmpnooli40001f0gveaxr8iim **DRAFT·naverProductId null**(미발행·비가역 안전), name 원본 ≠ naver_title 35자(덮어쓰기 버그 없음), salePrice 29000/supplierPrice 14300(실마진 50.7%), cat 50003356·origin 200037(중국), 이미지 생존 대표 HTTP 200 99224B·상세 HTTP 200 185670B(Adobe 만료 리스크 영구적재 차단), 옵션 향 3종 각 stock 999 ON_SALE, 재질/색상 null(crawl_logs 소스 0건 → 근거 부재 → 추측 금지 #46, '상세참조' 유지). **3축+5대 점검 전부 통과·발행 차단 결함 0건**. ★ **Desktop register 호출 불가**(NAVER_PROXY_URL/PROXY_SECRET=Vercel env+대표 home 프록시 전용) → 발행 실행=앱 UI 발행 버튼 또는 Code 발행(권장: 발행 후 naverProductId+DB+노출 3중 검증). 하드룰: register/POST는 대표 명시 승인 없이 호출 0. 보존: HANDOFF_publish_precheck_2026-06-05.md git add(#49). **다음=대표 발행 GO → 경로 택 → 실 register(비가역).**
> 2026-06-05 **Claude Design 슬롯 편입 + AEM 재연결 정정 + P0 발행 3축 GREEN 재확인** (Code turn, production HEAD 2f5d1e0, docs only·비가역 0). 권위: HANDOFF_claude_design_slot_aem_2026-06-05.md(#49 Desktop write_file 작성분). **#48 보강**: 신규 슬롯=캔버스 시각화(Claude Design 류)/Canva → 내부 시안·발행 GO 카드·둘째 상품 hero 시안·단발 배너 전용(판매 발행물 아님, IP 면책 불요). 판매 자산은 Firefly-native 생성+Figma 양산만(면책 경계 불변). **AEM 정정(#44 stale-fact)**: '사용 안 함'→'연결 유지(2026-06-05 대표 재연결), 현재 1인 셀러 워크플로우 미해당, 향후 멀티채널 확장 시 활용'(Adobe Marketing Agent MCP 동일). **P0 3축 GREEN 유지**(Desktop 직독 재확인): 회선 200·L2 allShopPhinf=true·dryRun canRegister=true — 발행 준비 완료, 대표 명시 승인만 남음(비가역 하드룰). **다음=Desktop 새 채팅 P0 명화 첫 발행(발행 직전 실측+대표 명시 승인 후 실 register).**
> 2026-06-04 **작업원칙 #49 등재 + P0 발행 트랙 인계 반영** (Code turn, production HEAD f689625, 비가역 0·docs only). #49=Desktop 핸드오프 write_file 직접 작성(대표 다운/업로드 0) / Code git 보존·큰 추적 MD Python full-overwrite 반영(#29b 불변) — PRINCIPLES_LEARNED + TASK_BRIDGE §1 표·§8 등재. Desktop 세션 교차검증(#45): imageProbe production f689625 READY 재확인(Code 보고 일치), 명화 DRAFT·naverProductId null. P0 3축 GREEN(회선 200·L2 allShopPhinf=true·dryRun canRegister=true)=발행 준비 완료. 디자인 파이프라인: 빌더·명화 풀세트·도구 라우팅(#48) 완성, Figma 양산 STEP2는 둘째 상품. _DESKTOP_WRITE_TEST 임시 제거. **다음=Desktop 새 채팅 P0 명화 첫 발행(HANDOFF_principle49 §4), 발행 직전 실측 + 대표 명시 승인 후 실 register(비가역).**
> 2026-06-04 **imageProbe 검증 모드 추가 + STEP 2 L2 이미지 변환 실증 성공** (Code turn, production HEAD 316f1f2, 비가역 0). register/route.ts 가산식 패치(body imageProbe?: boolean + payload 빌드 직후 분기): imageProbe=true 시 이미지 업로드만 실행(register POST 0, DB mutate 0). 회귀 가드 = 미전달 시 발행/dryRun 흐름 100% 불변. STEP 2 실증(production curl): **allShopPhinf=true** — main(Cloudinary)→shop-phinf / detail(Supabase)→shop-phinf / 공지 상하단→shop-phinf, 에러 0. ★ 이미지 도메인 진실 정정(#45, Desktop DB 직독): 발행 대표이미지=mainImage(Cloudinary, res.cloudinary.com), main_image_url(Supabase)은 미사용 레거시, detail_image_url=Supabase. 직전 'main=Supabase'는 틀린 컬럼(main_image_url) 본 것. Cloudinary 401 차단 이력에도 fetch 생존 확인 = L2 전 경로(생존+회선+코드) 실증. **발행 준비 완료** → Desktop 새 채팅 대표 명시 승인 후에만 실 register(비가역). register/POST 호출 0.
> 2026-06-04 **P0 첫 발행 회선 + L2 이미지 변환 검증** (Code turn, production HEAD 17e0ee2, 검증 전용·비가역 0). ★ P-1(uploadImagesToNaver)/P-2(register route L2 7-img 배선)/L3(업로드 실패 시 502+DRAFT 유지+정직 에러)/proxy uploadImages 액션 = 코드 직독으로 기구현 확정 → 직전 HANDOFF_publish_track의 '구현 필요' 지시 중복 무효화(신규 구현 0). STEP 1 회선: production GET /api/naver/addressbooks HTTP 200(releaseAddresses/returnAddresses 노출, diagnostics 에러 0) — production→proxy→네이버 GET 회선+토큰 생존. STEP 2 L2 실증: ★ NAVER_PROXY_URL/PROXY_SECRET가 로컬 .env*에 부재(Vercel production env + 대표 home proxy 전용) → Code 직접 실행 불가, **Desktop/대표 환경 위임**(uploadImages 액션 end-to-end 미검증). STEP 3 dryRun: success/canRegister=true, 페이로드 17필드+옵션 3종 COMBINATION+ETC 9키(returnCostReason 등) 정상. 경고 2건(필수속성 재질·색상 누락, attributeGrade C, 차단 아님). 이미지 실측 정정(#45): main=Cloudinary(res.cloudinary.com), detail+detailContent(3장)=Supabase — shop-phinf 0건(dryRun은 미업로드, 실 register 시 L2가 치환). DEBT-12(비-shop-phinf URL GREEN 통과) 라이브 재확인. **발행 GO 아님** — STEP 2(Desktop) 실증 통과 + 대표 명시 승인 후에만 실 register(비가역). 네이버 register/POST 호출 0건.
> 2026-06-04 **발행 관제탑 STEP D·E 검증 완결 + 게이트 사각지대 DEBT-12 등재** (Code turn, production HEAD cb5151d, docs only). Desktop STEP D preview 6/6 실측 통과(신호등 2/0/1·마진칩·체크리스트 14 한글·색대비·모바일 390px·SD-01 보존) + STEP E 머지 교차검증(Vercel e915b0a/cb5151d READY + production 라이브 API #45 실측: 명화 GREEN·달항아리 GREEN+마진칩·아이스트레이 RED, 엔진 미접촉). 발행 관제탑 STEP A~E 완전 종료. 신규 DEBT-12(발행 게이트 이미지 형식 사각지대 — publish-readiness가 Supabase URL을 https 문자열로 GREEN 통과시키나 네이버는 shop-phinf만 수용 = 거짓 초록) 등재 + HANDOFF_publish_track_2026-06-04.md(하이브리드 L1 배지/L2 자동변환/L3 안전핀) 저장. 코드/DB mutate 0. **다음=P0 첫 발행 트랙(명화 우선, 이미지 L2 변환 선결, 대표 명시 승인).**
> 2026-06-04 **발행 관제탑 STEP E — main 머지 + production 반영 완료** (Code turn, production HEAD e915b0a). feature/publish-control-tower(STEP A·B·C) → main --no-ff 머지(e915b0a) + push. Vercel verify-vercel-deploy.sh --wait exit 0(production e915b0a 갱신 확인). production fact-check(#45): /dashboard 200 + 일괄 API 3건 정답지 일치 — 명화 50.7% GREEN(마진칩 없음)/달항아리 23.2% GREEN+마진칩/아이스트레이 42.6% RED(발행가능 2·보완 0·불가 1). Desktop STEP D preview 6/6 실측 통과(관제탑 노출·신호등·마진칩·체크리스트 14항목 한글·색대비·모바일 390px·SD-01 보존). 엔진 미접촉·비가역 0(발행 미접촉, DB mutate 0). **다음=P0 첫 상품 발행 트랙 분리(이미지 변환 선결 → 명화 우선, 대표 명시 승인).**
> 2026-06-04 **발행 관제탑 STEP C 완료** (Code turn, feature/publish-control-tower, baseline af38158, main 미접촉). dashboard/page.tsx에 PublishControlTowerWidget SECTION 2(받은편지함) 최상단 마운트(가산식, 기존 위젯 전부 보존) + 위젯 computeMarginPct 헬퍼로 margin 컬럼(상품별 단위 혼재: 명화 배수 2.03·달항아리 퍼센트 23.16) 대신 salePrice/supplierPrice로 마진율 직접 계산(명화 51% 무경고/달항아리 23% 경고칩/아이스트레이 43% 무경고). publishReady 로직 불변. ★ margin DB 미교정(명화 2.03은 진단등급용 배수=의도값). 엔진 미접촉·TSC 0/build OK·이모지 0·비가역 0(DB mutate 0). 커밋 50ee308. **다음=Desktop STEP D 브라우저 실측(preview) → 통과 → main 머지 → P0 발행(명화 우선).**
> 2026-06-04 **발행 관제탑 STEP A·B 구현 완료** (Code turn, feature/publish-control-tower, baseline 64fe565, main 미접촉). STEP A=일괄 판정 API + 공통함수 추출(515e82f): load-publish-readiness.ts 신설(loadAndEvaluateProducts+listDraftProductIds, Product+Diagnosis→tone→evaluate 단일 소스, N+1 가드 Diagnosis productId IN 단일쿼리), 단건 route 리팩터(응답 {ok,...result} 불변·회귀 0, mapCategoryToTone null/undefined 동일처리 확인), 신규 일괄 route /api/products/publish-readiness(DRAFT N개). STEP B=PublishControlTowerWidget 신호등 카드(aa31ad4): control-tower-strings.ko.json 용어사전(필드23+위반6) + green(publishReady)/yellow(hardComplete만)/red(hard 미충족) 3색, 마진<25% 경고칩(차단 아님), CTA 검색조련·온실아틀리에 동선. 엔진(publish-readiness.ts) 미접촉(git diff 0). TSC 0/build OK/이모지 0/코드 Korean 0/비가역 0. **다음(Desktop 머지 후)**: STEP C(대시보드 마운트) + STEP D(Chrome 브라우저 실측).
> 2026-06-04 **★ 발행 관제탑 설계도 확정 + 두 대수술 production 머지 검증 완료 (Desktop turn, 코드 0, production HEAD 64fe565)**. 이번 세션 3대 성과: (1) 빌더 하이브리드 대수술 main 머지 검증(a6ea482) — emotional-bg 적응형 스크림(명화 luma 0.779→0.40 / 가상야간 0.30→0.60 분기 bash+PIL 실측) + HTML 직렬화기(#46 copy 무변형+htmlEscape 인젝션 방어) + 단색 경로 회귀 0(buildDetailPage else 분기=stackVertically 동일, 달항아리 바이트 동등) 코드 정독 증명. (2) UI 한글화 main 머지 검증(64fe565) — /portfolio production 직접 호출 404 실측(가짜 John 포트폴리오 완전 제거 확인) + page.tsx redirect /dashboard(push→replace 개선) + 용어사전 23값 의미훼손 0 + #47 인물정책 문구 교체(코드-문구 일치) 정독. (3) ★ 발행 관제탑 설계도 신설: docs/handoff/HANDOFF_publish_control_tower_2026-06-04.md — 기존 엔진(publish-readiness.ts, 수정금지) 정독 완료(HARD+SEO 2계층 + #46 진정성 + 상품정보고시 4축). 관제탑=엔진 결과를 대표가 보는 신호등 화면(GREEN publishReady / YELLOW hardComplete만 / RED hard 미충족). 대시보드 카드 배치(대표 승인). STEP A(일괄 판정 API, 단건 route와 공통함수 공유=중복금지) → B(PublishControlTowerWidget, missing 배열 용어사전 한글변환) → C(대시보드 통합) → D(★Chrome MCP 브라우저 실측, 안되면 대표 스크린샷 요청). ★ 컨텍스트 한계로 구현은 새 채팅 위임(이번 세션 빌더+한글화 2대 작업으로 포화 — 중복작업 방지). 발행준비 게이트 두 상품 실측(명화 cmpnooli4 publishReady 양호 마진50.7% / 달항아리 cmp3afb45 마진23% 가격재검토 권고). 비가역 0(발행 미접촉, 두 상품 DRAFT). 다음(새 채팅 Desktop→Code 핑퐁): HANDOFF_publish_control_tower 정독 → STEP A~D 구현 → 브라우저 실측 통과 → P0 발행(명화 우선, 대표 명시 승인).
> 2026-06-04 **UI 한글화 STEP5 점검 + ★ UI 한글화 STEP1~5 전 완료** (Code turn, feature/ui-ko-cleanup, baseline 69ccbf7, main 미접촉). STEP5(crawl/orders 잔여 영어 라벨 점진 한글화) 실측 점검: crawl/orders/orders[id] 3개 page.tsx에 사용자 노출 영어 라벨 0 + 이모지 0(유일 매치는 도매꾹 URL 예시 placeholder=정상) → **actionable 0, 코드 변경 없음**(날조 금지 #46, 없는 작업 만들지 않음). **UI 한글화 STEP1~5 전 완료**: STEP1(용어사전+#47 문구)/STEP2+3(root redirect+portfolio 삭제)/STEP4(/upload 한글화+이모지)/STEP5(crawl·orders 점검). 비가역 0. **다음(Desktop)**: production에서 온실 아틀리에/첫 화면 노출 문구 육안 점검 → 브랜치 머지 결정 → 이후 발행 관제탑 신설.
> 2026-06-04 **UI 한글화 STEP4 — /upload 한글화(중복 아님 확정) + 이모지 제거** (Code turn, feature/ui-ko-cleanup, baseline 3ceef0b, main 미접촉). 기능 중복 확인: /upload=엑셀 대량 상품 등록(/api/upload/excel), studio 워크벤치 dropzone=디자이너 이미지 소스 업로드(Supabase) → **별개 기능, 중복 아님 → 살림+한글화**. upload-strings.ko.json 신설로 사용자 문구 i18n 분리(#35), 이모지 4종(클립보드/폴더/모래시계/로켓)→Lucide(ClipboardList/FolderOpen/UploadCloud/Loader2). 제목 "Excel 대량 업로드"→"엑셀 대량 업로드". emoji 0 / page.tsx 한글 하드코딩 0. TSC 0/build ✓/sentinel 0. 비가역 0. **다음**: STEP5 crawl/orders 잔여 영어 라벨(점진).
> 2026-06-04 **UI 한글화 STEP2+3 — root redirect 교정 + portfolio 템플릿 삭제** (Code turn, feature/ui-ko-cleanup, baseline c724693, main 미접촉). src/app/page.tsx: 첫 진입 redirect /portfolio→/dashboard(router.replace) + 로딩문구 영어 "Loading Portfolio..."→i18n(home-strings.ko.json "대시보드로 이동 중…", #35 준수). portfolio 외부 참조 grep 0 확인 후 src/app/portfolio/page.tsx(가짜 "포트폴리오" 템플릿 19.5KB, 우리 앱 무관) 삭제. STEP2+3 원자 커밋(redirect만/삭제만 분리 시 / 라우트 깨짐 위험 → 통합). build로 / redirect 검증(.next/types portfolio 잔재는 build 재생성으로 해소, tsc 0). TSC 0/build ✓/sentinel 0/한글 하드코딩 0(i18n)/이모지 0. 비가역 0. **다음**: STEP4 /upload 중복 확인.
> 2026-06-04 **UI 한글화 STEP1 — studio-strings 용어 사전 치환 + #47 인물정책 문구 교체** (Code turn, feature/ui-ko-cleanup, baseline a6ea482, main 미접촉). 권위: HANDOFF_ui_ko_cleanup §1+§2. studio-strings.ko.json 23개 값 치환(키 무변경=소비자 무영향, 회귀 0): 골격→페이지 구성 / 에셋 저장·Supabase Storage→이미지 저장 / public URL→공유 링크 / Clean·Price·Badge·Lifestyle→깔끔·가격강조·뱃지·감성형 / 누끼 PNG→배경 제거 이미지 / 폴백·fallback→기본 / matchScore→적합도 점수 / "ms 소요"→처리 시간 / dropzone Supabase 노출 숨김. ★ faceFreeNote 구 "얼굴 없는 인체 일부 전략"(폐기 #47 이전)→"인물 정책: 익명 모델 허용/특정 실존인물·유명인 금지"로 교체(코드는 이미 #47 정합, 문자열만 잔존했음). 렌더 값 잔재 grep 0. TSC 0/build ✓/sentinel 0/한글 하드코딩 0(전부 i18n). 비가역 0(발행·DB mutate 0). **다음**: STEP2 page.tsx redirect 교정.
> 2026-06-04 **빌더 STEP5 — 커넥터 운영 규칙(#48) + 캐시 no-cache 점검(DEBT-11). ★ 하이브리드 대수술 STEP1~5 전 완료** (Code turn, feature/detail-builder-hybrid, baseline 0e619f8, main 미접촉). **(1) 작업원칙 #48**: 도구 라우팅(생성=Firefly 웹 수동/가공=Adobe MCP/합성·연속성=빌더+Figma) + AEM·Marketing Agent MCP 미사용 + 파트너 모델(FLUX/Nano Banana/gemini/imagen/gpt-image) IP 면책 없음 → 최종 판매물 금지(Firefly-native만). firefly-generate.ts 주석 보강. **(2) 캐시 점검(DEBT-11)**: 영구 자산 3종 curl -I 실측 → cacheControl '31536000' 지정에도 cache-control: no-cache 응답 확인(로딩 속도/전환율 손해, 기능 영향 0). 재업로드/버킷 정책=프로덕션 mutation이라 Desktop 위임(#41), DEBT-11 등재. TSC 0/build ✓/sentinel 0/Korean 0. 비가역 0. **STEP 요약**: 1(hero 무드)·2-foundation(composeContinuous+sectionRole)·2-확산(앵커링+emotional 6개+접지그림자)·2-마감(스크림 0.40+다크 적응형)·3(HTML 직렬화기)·4(Studio UI 토글+무드입력)·5(커넥터/캐시) 전부 완료. **다음=Desktop 최종 회귀 검증(달항아리 단색 불변) → main 머지 → P0 발행 재개**.
> 2026-06-04 **빌더 STEP4 — 가독성 정교화 + Studio UI(이미지/HTML 토글 + 무드배경 입력)** (Code turn, feature/detail-builder-hybrid, baseline a539fea, main 미접촉). **(1) 가독성 정교화**: 적응형 스크림은 STEP2 마감서 완료 / informational 불투명 유지(추가 작업 불요). **(2) DetailPageCard UI**: (a) 이미지(PNG)/HTML 출력 토글(FileImage/Code2, HTML은 detailHtml 있을 때만 활성, dangerouslySetInnerHTML 미리보기) (b) 무드배경 URL 입력(기존 manualBackdropUrl 재사용 — 썸네일·상세 공용, 신규 state 0) (c) 미리보기 maxHeight 520→640. runDetail이 manualBackdropUrl→lifestyleAssetUrl 전달. 라벨은 studio-strings.ko.json에 분리(#35). **(3) 회귀 가드**: 신규 props(lifestyleAssetUrl/onLifestyleChange) optional → products/new의 두 번째 DetailPageCard 소비자 무파손(무드 입력은 핸들러 있을 때만 렌더). TSC 0/build ✓/sentinel 0/코드 Korean 0(라벨 i18n). 비가역 0(발행 미접촉 DRAFT). **다음**: STEP5 커넥터 규칙+캐시.
> 2026-06-04 **빌더 STEP3 — HTML 출력 경로 신설(하이브리드 절반)** (Code turn, feature/detail-builder-hybrid, baseline 09e5ff1, main 미접촉). detail-html-serializer.ts 신설 — buildDetailPage 섹션 메타(copy+role)를 네이버 스마트에디터 호환 HTML(860px 컨테이너, 인라인 스타일, h2/p 의미 블록)로 직렬화. emotional=웜 틴트/informational=흰 배경, 이미지 블록은 Supabase 영구 URL을 img src(이미지 주소 업로드/대량등록 호환). generate-detail 응답에 detailHtml 필드 추가(detailBase64 PNG 보존 = 병렬, 회귀 0). 응답 sections에 role 추가. ★ #46 grounding: 직렬화기는 copy 무변형, HTML escape + 마크업만. 하이브리드 분담: 감성 비주얼=PNG / 호환=HTML(호출 측 선택). TSC 0/build ✓/sentinel 0/Korean 0. 비가역 0(PNG/HTML 생성만, 발행 미접촉 DRAFT). **다음**: STEP4 가독성 정교화+Studio UI.
> 2026-06-04 **빌더 STEP2 마감 — 스크림 0.40 하향 + 다크 배경 적응형 안전장치** (Code turn, feature/detail-builder-hybrid, baseline 60c5408, main 미접촉). emotional-bg.ts MOOD_SCRIM_ALPHA 0.62→0.40(Desktop 실물 검증: 0.40이 가독성 유지+무드 회복). **다크 배경 안전장치(2-2 적응형)**: cover 버퍼 평균 휘도를 sharp stats로 측정 → 밝으면 0.40, 어두우면(luma<0.5) MOOD_SCRIM_ALPHA_DARK=0.60 자동 상향 → 어두운 무드 배경서도 dark-on-light 텍스트 대비 사수. stats 실패 시 0.40 폴백. 무드 모드만(단색 경로 불변). STEP4로 안 미루고 지금 처리(간단·견고). TSC 0/build ✓/sentinel 0/Korean 0. 비가역 0(PNG만, 발행 미접촉 DRAFT). **다음**: STEP3 HTML 직렬화기.
> 2026-06-04 **빌더 STEP2-확산(2) — emotional 그룹 6개 무드배경 전환 + 접지그림자** (Code turn, feature/detail-builder-hybrid, baseline 9c31052, main 미접촉). 권위: HANDOFF STEP2-확산(2) 분류표. **(1) emotional-bg.ts 공통 헬퍼 신설**: resolveEmotionalBackdrop(무드 모드=cover-fit 사진+흰 가독성 스크림 MOOD_SCRIM_ALPHA=0.62, 단색 모드=createCanvas 그대로) + groundShadowLayer(누끼 base 아래 옅은 블러 타원 0.18). **(2) emotional 6개 전환**: seasonalHook/story/styledShot/problem/solution/philosophy의 createCanvas → resolveEmotionalBackdrop 1줄 스왑(기존 텍스트/카드 색 무변경 — 스크림이 밝은 base 유지해 대비 보존). hero는 접지그림자 추가(usedLifestyle만). usage는 이미 무드+비네팅 처리됨(미접촉). **(3) informational 19개 무변경**: 불투명 유지=가독성 사수, 무드 비침 0(미접촉 확인). 회귀 0: 단색 경로=전 렌더러 createCanvas(size,bg) 동일(헬퍼 else 분기). hero 단색 접지그림자 미적용. TSC 0/build ✓/sentinel 0/Korean 0. 비가역 0(PNG만, 발행 미접촉 DRAFT). **다음**: Desktop 명화 재합성 검증(감성 무드 노출+접지그림자+정보 가독성+달항아리 단색 회귀 0) → STEP3(HTML)~5. ★ 무드 강도(스크림 0.62)는 MOOD_SCRIM_ALPHA로 튜닝 가능.
> 2026-06-04 **빌더 STEP2-확산 (1)표본 — sectionRole 도입 + hero 본품 앵커링 근본해결** (Code turn, feature/detail-builder-hybrid, baseline 4ef6102, main 미접촉). 권위: HANDOFF STEP2-확산 차등 투명화. **(1) sectionRole 분류 도입**: section-builder에 SectionRole(emotional/informational) + getSectionRole 신설 — emotional=hero/seasonalHook/story/philosophy/styledShot/problem/solution, 그 외·모호 시 informational(안전측). DetailPageResult.sections에 role 필드 추가(가산식, 픽셀 무관). **(2) 차등 투명화 정책**: emotional=무드bg 노출, informational=불투명 유지(가독성 사수, 무드bg 비침 금지). 표본 spec는 informational이라 기존 불투명 그대로(렌더링 무변경=가독성 보존). hero는 emotional(이미 무드 표시). ★ 단순 전체 투명화 금지(spec zebra/cta 카드 가독성 붕괴 방지). **(3) hero 본품 앵커링 근본해결**: 세로 누끼(253×776)가 fit박스 꽉 채워 bottom-gravity 무효 → 본품 base를 배경 테이블면(~0.52h)에 안착(상단 여백~테이블선 박스). 패널 50px 안전간격은 clamp(min(0.52h, panelTop-50))로 모든 높이에서 보장. 단색 경로 무변경. TSC 0/build ✓/sentinel 0/Korean 0. 비가역 0(PNG 생성만, 발행 미접촉 DRAFT). **다음**: Desktop 명화 재합성 검증(테이블 앵커링+spec 가독성+달항아리 단색 회귀 0) → 나머지 28 렌더러 그룹 확산 → STEP3(HTML)~5.
> 2026-06-04 **빌더 하이브리드 STEP2 — 연속 캔버스화 foundation + hero 1-D 미세개선 2건** (Code turn, feature/detail-builder-hybrid, baseline bf09837, main 미접촉). 권위: HANDOFF_detail_builder_hybrid 작업1+1-D. **(1) composeContinuous 신설**: section-builder에 전역 배경(단색 또는 lifestyle 무드 cover-fit) 선합성 후 섹션 적층 — 연속 페이지 foundation. stackVertically 보존. buildDetailPage 배선: lifestyleAssetUrl 있으면 composeContinuous(무드bg), 없으면 stackVertically 그대로(회귀 0 바이트 동등). 현재 섹션 불투명이라 무드bg는 hero 외엔 가려짐 — 30개 렌더러 투명 전환(확산)은 Desktop 검증 후. **(2) hero 1-D**: (개선1) 무드 모드 본품 누끼 바닥 앵커링(position:'bottom' → 테이블면 ~0.62h 안착, 단색 경로 중앙 유지). (개선2) 가독성 패널 상단 transparent→white 그라데이션 페이드(본품 연결감, 50px 안전간격 보존). 둘 다 usedLifestyle 게이트(단색 불변). TSC 0/build ✓/sentinel 0/코드 Korean 0. 비가역 0(PNG 생성만, 발행 미접촉 DRAFT). **다음**: Desktop 명화 디퓨저 재합성 시각 검증(바닥 앵커링+패널 페이드) + 달항아리 단색 회귀 0 → 확산 승인 → STEP3(HTML 직렬화기)~5.
> 2026-06-04 **상세페이지 빌더 하이브리드 대수술 STEP1 — hero.ts 무드배경 합성 연결** (Code turn, feature/detail-builder-hybrid 브랜치, baseline a585635, main 미접촉). 권위: docs/handoff/HANDOFF_detail_builder_hybrid_2026-06-04.md 작업2. hero.ts에 lifestyleAssetUrl 무드배경(A) cover-fit 전체 배경 + 본품 누끼(C) 투명 letterbox 중앙 합성 + 텍스트 뒤 반투명 흰 패널(rgba 255,255,255,0.72) 가독성 가드 추가. ★ 회귀 가드(P0): lifestyleAssetUrl 미전달 시 createCanvas(size,bg)/fitImage(...,bg)/패널 없음/레이어 순서 모두 기존과 연산 동일 = 단색 경로 바이트 동등(구조적 보장 — generateHeroCopy 비결정 AI라 full-render 바이트 비교 불가). TSC 0 / build ✓ / sentinel 0 / 코드 Korean 0. 비가역 0(generate-detail PNG 생성만, register/POST/DB mutate 0, 발행 미접촉 DRAFT 유지). **다음**: Desktop이 명화 디퓨저로 generate-detail 실행(lifestyleAssetUrl=myeonghwa-backdrop-860.jpg, sourceImageUrl=myeonghwa-cutout.png) → 무드배경 합성 시각 검증 → 승인 후 STEP2(연속 캔버스)~STEP5 진행.
> 2026-06-04 **명화 디퓨저 Adobe 가공자산 3종 Supabase 영구 적재 완료** (Code turn, baseline 16578d0). scripts/preserve-myeonghwa-assets.mjs 실행(Desktop 작성, Code 로컬 실행). Adobe 단축URL 3종 생존 재확인(http 200 + mime + 바이트 일치: main 65787B / cutout 195918B / backdrop 73822B) → product-assets/cmpnooli40001f0gveaxr8iim/ 에 upsert → public URL 3종 전부 200 검증. 영구 URL: 대표이미지=https://doxfizicftgtqktmtftf.supabase.co/storage/v1/object/public/product-assets/cmpnooli40001f0gveaxr8iim/myeonghwa-main-1000.jpg / 누끼=https://doxfizicftgtqktmtftf.supabase.co/storage/v1/object/public/product-assets/cmpnooli40001f0gveaxr8iim/myeonghwa-cutout.png / 배경무대=https://doxfizicftgtqktmtftf.supabase.co/storage/v1/object/public/product-assets/cmpnooli40001f0gveaxr8iim/myeonghwa-backdrop-860.jpg. **실행 보정**: 스크립트 resolveProductId(PostgREST)가 "permission denied for schema public"(Prisma 테이블 REST 미노출)로 실패 → PRODUCT_ID 명시 override로 우회(Storage API는 정상). 스크립트에 신뢰 경로 주석 보강. 마스터 키는 로컬 --env-file에서만 로드(대화 미노출, 보안 원칙). 비가역 0(Storage upsert만, DB row/발행 필드 미접촉, DRAFT 유지). **다음(Desktop)**: 영구 URL 3종을 상세페이지 합성/발행 자산으로 연결(Figma STEP2).
> 2026-06-04 **firefly-generate 어댑터 신설 + 인물 정책 코드 정합** (Code turn, baseline 77812ea). 권위: docs/handoff/HANDOFF_firefly_generate_adapter_2026-06-04.md. **(1) firefly-generate.ts 어댑터**: FireflyRequest → {imageUrl} 단일 진입점. FIREFLY_MODE=api 토글, 미설정 시 manual 기본(네트워크 생성 호출 0). api 모드는 OAuth Server-to-Server 토큰(모듈 캐시, 만료 60초 전 갱신) → Firefly Services v3 generate. 키 부재/파트너 모델(gemini/imagen/gpt-image-2)·에러 시 manual fail-safe 강등(#46 허위 성공 0). 부수효과 격리(DB/Storage 미접촉). **(2) 인물 정책 코드 정합(#44 stale-fact, #47 준수)**: category-tone-mapper ModelPolicy에 'model-allowed' 멤버 추가 + 구 "human faces hard-prohibited" 주석 supersede(기존 GROUP_ROWS modelPolicy 값 불변 = 배경 무대는 무인 정답). backdrop-vlm-gate에 classifyPersonShot 신설(Groq Llama 4 Scout 재사용, 통과=!has_identifiable_person && !has_text && is_appropriate, fail-closed) — classifyBackdrop 미접촉. **(3) 범위 명시**: 인물컷 인입 라우트 연결은 다음 스프린트로 분리(게이트 함수 준비까지). TSC 0 / build OK / sentinel 0 / 코드 Korean 0(주석 영어). 비가역 0(생성 네트워크 호출 0, register/POST mutate 0). 새 의존성 0(fetch만). **다음(Desktop)**: (1) Adobe 가공자산 Supabase 영구화 (2) Firefly 인물컷 1-click→classifyPersonShot 실측 (3) Figma STEP2.
> 2026-06-04 **Adobe 가공 라인 첫 완주 + AI 인물 등장 허용 정책 확정 + Firefly 컨셉컷 v2** (Desktop turn, 코드 0, production HEAD 5dad281). **(1) Adobe 가공 라인 입증**: 명화 디퓨저 정물컷으로 5단계 SOP 실측 완주 — remove_background(본품 누끼) → crop_and_resize fit:extract+focus(팜파스 등 부피사체 제거, 동시인식 이슈를 프롬프트 추출로 해결) → fit:pad 1000x1000(네이버 대표이미지 흰배경) → fit:reframe 860x860(상세 배경 무대). 합성(A+C)은 Adobe 미지원 → Figma/Photoshop. **(2) ★ AI 인물 정책 갱신(대표 확정)**: 컨셉상 필요 시 익명 일반 모델 등장 허용, 특정 실존인물·유명인 식별 금지, 미성년자 부적절 묘사 금지. 구 하드룰 "얼굴 없는 인체 일부"는 대체(작업원칙 #47 신설 + DETAIL_PAGE_PLAYBOOK §5 갱신). **(3) Firefly 컨셉컷 v2**: docs/handoff/FIREFLY_CONCEPT_PROMPTS_v2_human_allowed_2026-06-04.md 신규 — 인물 포함 라이프스타일 프롬프트 3종(손모델/공간인물/향 실루엣) + 인물 네거티브 + 가공 SOP. **(4) 자산 영구화 TODO**: Adobe 가공 3종(누끼/1000x1000/860x860)은 단축URL(세션 한정) → Supabase product-assets 업로드 후속 과제. **다음(Desktop)**: (1) 가공자산 3종 Supabase 업로드(만료 전) (2) Firefly 인물 컨셉컷 1-click 생성→가공 (3) Figma 한도 리셋 후 값 눈대조+STEP2 7섹션(배경A+본품C 합성 포함).
> 2026-06-04 **S4 2단계 Figma 마스터 STEP1 완료 — Variables 69개 빌드 + 토큰 동기화 설계도 확정** (Desktop turn, 코드 0, production HEAD 7a640b6). **(1) Figma 마스터 생성**: 파일 8yuNcO8J9Pitt7glfr49Uw(꽃틔움 KKOTIUM — Concept Preset Master) + Variables 69개(Brand Core 3 / Concept Preset 60 / Intensity 6), 전 변수 WEB 코드신택스 주입으로 코드 [data-preset] 토큰과 1:1 대응. **(2) starter 모드 제약 보정**: Figma starter는 컬렉션당 모드 1개 → 원안 "프리셋=모드 5개" 불가 → 프리셋을 변수 이름 그룹(preset/aroma/* 등)으로 표현해 단일 소스 추적 유지. **(3) 설계도+README Desktop 직접 저장**: docs/design/FIGMA_MASTER_BLUEPRINT_2026-06-04.md(신규, 15KB) + docs/design/README.md 보관표 갱신(신규 + 기존 누락 3건 CONCEPT_PRESET_SYSTEM/DETAIL_PAGE_PLAYBOOK/KKOTIUM_DESIGN_SYSTEM 인덱싱). 한글 sentinel grep 0건(인코딩 정상). **(4) 일반화 금지 명문화**: 'A(모네 배경)+C(정물 오브제)'는 명화 디퓨저 1건 전용 시안일 뿐 고정 템플릿 아님 — 마스터는 컨셉 조합 가변 구조. **다음(Desktop, 호출 한도 리셋 후)**: 새 채팅 (1) Figma 값 최종 눈대조(aroma/surface=#F3EFE7, aroma/accent=#76864C 등) (2) STEP2 7섹션 컴포넌트 빌드(호출 묶음 처리). 최종값 대조+STEP2는 이번 turn 호출 한도로 다음 세션 이월.
> 2026-06-04 **B+C 배포 검증 완료 + Supabase 프리셋 컬럼 적용 + 명화 디퓨저 aroma 프리셋 적용 + 하이브리드 디자인 원칙 확정** (Desktop turn, 코드 0, production HEAD 6f02330). **(1) 배포 검증**: 채팅 B(프리셋, 5ea926e) + 채팅 C(크롤옵션, 0f6d3be) + 추가 누락분(단건 prefill 옵션 유실 수정, 6f02330) 3커밋 모두 Vercel production READY 실측 단정. production runtime logs 전수 200(notifications/dashboard/stats) → 신규 3컬럼 추가에 따른 Product 쿼리 회귀 0 확정. batch-register/route.ts + backfill-options-from-crawl.ts 라인 단위 직독 = $transaction 원자성·중복 INSERT 이중차단 버그 0. **관찰**: batch-register category:'uncategorized' 하드코딩 잔존(게이트는 naverCategoryCode 별도 컬럼 읽어 현재 무해, 정리 후보). **(2) Supabase 적용**: Desktop이 apply_migration 20260603_add_concept_preset 직접 실행 → information_schema 실측으로 concept_preset(VARCHAR20 def 'kitchen')/preset_intensity(VARCHAR10 def 'l1')/preset_overrides(jsonb) drift 0 확정. 역순 배포 사고(컬럼 부재 시 Product 쿼리 깨짐) 원천 해소 후 Code가 push. **(3) 명화 디퓨저 aroma 적용**: cmpnooli40001f0gveaxr8iim를 concept_preset='aroma'/preset_intensity='l3' UPDATE(DRAFT 상태, 디자인 표현 컬럼이라 발행 데이터 무관·비가역 아님). 이전 kitchen/l1 → aroma/l3 어스톤 프리셋 연결. **(4) ★ 신규 영구 디자인 원칙(대표 확정)**: 상품 디자인은 한 방향이 아니라 여러 컨셉을 어우러지게 하이브리드로 진행해 감도를 높인다. **★ 일반화 금지(중요)**: 아래 'A(모네 배경)+C(정물 오브제)' 특정 조합은 **명화 디퓨저 한 상품 전용 시안 기록**일 뿐이며, 전체 상세페이지의 고정 템플릿으로 일반화하지 않는다. 살아있는 원칙은 '여러 컨셉 하이브리드'뿐이고, 상품마다 어울리는 컨셉 조합은 다르게 잡는다. 명화 디퓨저 상세페이지 시안 = A(모네 수련 무드 배경) + C(정물 꽃 오브제 전경) 3겹 레이어링 v2 확정(/mnt/user-data/outputs/myeonghwa_aroma_detail_v2_hybrid.html, 토큰 세이지 #76864C/웜크림 #F3EFE7/테라코타 #B5694C가 concept-presets.ts aroma 정합). **(5) 디자인 파이프라인 도구 확정**: S2 이미지(Adobe Firefly 1-click 생성=대표 수동, 누끼·리사이즈·합성=Adobe MCP 자동) → S3 기획(Claude 아티팩트, 완료) → S4 양산(Figma 마스터 우선, Canva 보조). Firefly 핸드오프 카드 작성(docs/handoff/HANDOFF_S2_firefly_myeonghwa_aroma_2026-06-03.md). **(6) S4 전략 확정(대표 승인)**: Figma 마스터 템플릿 + concept-presets.ts 토큰↔Figma Variables 동기화로 양산 체계화(2단계). 1단계=명화 디퓨저 v2 HTML 기반 빠른 런칭, 2단계=Figma 마스터 구축(별도 새 채팅). 비가역 0(register/POST mutate 0건). **다음**: 새 채팅#1(Figma 마스터+토큰 동기화) / 새 채팅#2(상품관리 자동화 화면 UI/UX 설계+브라우저 E2E). 이번 채팅 잔여: backfill dry-run은 Desktop 로컬 터미널 미가용으로 Code 위임(아래 Code 붙여넣기 블록).
> 2026-06-03 **크롤 옵션 변환 누락 수정 — crawl_logs → Product/product_options 양쪽 정합** (Code turn, baseline 4c52141, 미push). 권위: docs/handoff/HANDOFF_crawl_option_mapping_fix_2026-06-03.md. 근본 원인(Desktop DB 실측 확정, 추측 아님): crawl_logs.options는 정상 저장(명화 디퓨저 향 3종 {name,qty,addPrice})되나 **승격(crawl_logs→Product) 변환 단계에서 options 매핑 누락** → Product.hasOptions=false + product_options 행 부재. 재크롤 불필요. **Fix1 공유 매퍼**: src/lib/sources/crawl-option-mapper.ts 신규 — crawl_logs.options[{name,qty,addPrice}] → ① Product 컬럼(hasOptions/optionName/optionType=COMBINATION/optionValues/options jsonb, 발행 게이트 publish-readiness가 읽음) + ② product_options 행(option_type/option_names/option_rows {values,stock,price,status:'ON_SALE'}, 네이버 발행 buildOptionInfo가 읽음). 두 소비처(게이트 isNonEmptyArray + buildOptionInfo optionCombinations) 실측 대조로 형식 정합. 옵션축 그룹명은 도매매 selectOpt가 미제공 → 기본값 '옵션'(날조 금지 #46, 추후 에디터 변경). normalizeCrawlOptions로 raw jsonb 가드. **Fix2 변환 배선**: crawl/batch-register/route.ts — mapCrawlOptions 결과를 product.create 옵션 필드에 스프레드 + product_options.create를 **$transaction으로 원자화**(게이트 GREEN인데 발행 시 옵션 누락 사고 방지). 옵션 없으면 hasOptions=false 유지(단일 상품 분기). **Fix3 backfill**: scripts/backfill-options-from-crawl.ts 신규(tsx 실행) — crawl_logs(options 존재 + productId 링크) 중 Product.hasOptions=false & product_options 행 없음을 찾아 동일 매퍼로 복구. **dry-run 기본 + --apply 필요**. product_options 존재 OR hasOptions=true면 skip(upsert 병행) = **명화 디퓨저(cmpnooli40001f0gveaxr8iim) 중복 INSERT 이중 차단**(HANDOFF §3). prod mutate라 #41상 **Desktop이 실행**(Code 미실행). **스코프 명시(silent cap 방지)**: 단건 prefill 경로(crawl/page.tsx→products/new)는 client에서 이미 qty/addPrice 소실 + POST /api/products가 옵션 미저장 → 이번 변환 매핑 범위 밖. 단 그 경로 상품도 crawl_logs.productId 링크가 있으면 backfill이 복구. TSC 0 / build 0. 비가역 0(register·POST mutate·backfill 실행 0건). 새 의존성 0. Prisma 싱글톤(src/는 매퍼만, 스크립트는 일회성 CLI new PrismaClient 기존 seed.js 패턴). **다음 (Desktop)**: (1) 신규 옵션 상품 크롤 → batch-register 승격 → Product.hasOptions=true + product_options 행 + dryRun optionCombinationCount>0 3-tier 재검증. (2) backfill dry-run 검토 → --apply → 명화 중복 0 확인.
> 2026-06-03 **디자인 프리셋 시스템 코드화 + DetailPageBuilder 흡수/제거** (Code turn, baseline 4c52141). 권위: docs/handoff/HANDOFF_MASTER_design_preset_builder_2026-06-03.md §3 + docs/design/CONCEPT_PRESET_SYSTEM.md. **(1) 빌더 흡수/제거**: 구 6블록 빌더(E-1, hook/image/text/qna/specs/divider)가 studio 골격 시스템과 중복 → src/components/products/DetailPageBuilder.tsx 삭제 + products/new/page.tsx import/state(detailBlocks)/image탭 JSX 제거 + description 페이로드 체인 2곳 단순화(detailBlocks 분기 제거 → detailImageUrl ? <img> : description, 빈 배열 기본값이라 실 데이터 흐름 손실 0). 흡수 확인: Specs(사양표)는 studio section-renderers(specTable/spec/specifications)에 완전 존재 → 이전 불필요. Q&A는 빌더 aeoContent={null} dead-wire였고 HTML 직접입력은 '상세 설명(텍스트)' 필드(HTML 허용)로 보존. image 탭 빌더 자리 → '상세페이지 자동화' 안내 카드(Palette/Layers Lucide, visual 탭 점프)로 교체. **(2) 프리셋 코드화**: src/lib/design/concept-presets.ts(5프리셋 aroma/gift/tradition/kitchen/pet x 6요소, 타입 안전 영어 상수, recommendPreset 카테고리 추천 stub) + section-variants.ts(7섹션 hook/value/spec/usage/trust/cta/notice 경량 CVA 변형 — class-variance-authority 무의존 자체 구현, 점진전략 §6-D) + src/lib/i18n/concept-presets.ko.json(한글 라벨) + globals.css [data-preset] --preset-* 토큰 레이어(전역 --color-* 셸 테마와 격리 = SEO 직교 §7, 상세 body만 제어). **(3) Prisma**: Product에 concept_preset(VARCHAR20 default 'kitchen')/preset_intensity(VARCHAR10 default 'l1')/preset_overrides(jsonb) 추가 + prisma/migrations/20260603_add_concept_preset/migration.sql(멱등 ADD COLUMN IF NOT EXISTS, public."Product"). prisma generate 로컬 통과. TSC 0 / build 0(/products/new 53kB 정상). 비가역 0(register/POST mutate 0, 새 의존성 0). **★ 순서 제약(중요)**: schema.prisma 변경이 Vercel 배포되면 production DB 컬럼 부재 시 Product 쿼리가 깨짐 → **Desktop이 migration 20260603_add_concept_preset Supabase ALTER 적용 선행** 후에 push 안전(schema line 75 기존 패턴 동일). **다음 (Desktop)**: (1) Supabase ALTER 적용 → (2) push/배포 안전 확인 → (3) 채팅 A(명화 디퓨저 aroma L3 상세페이지 첫 레퍼런스)로 프리셋 패턴 실증.
> 2026-06-02 **발행 데이터 스토어명 정정 — 앱 이름 → 스토어명 SoT 연동** (Code turn, baseline 71f8695 → push 803a69a). 결정적 정정(대표 확정): '꽃틔움 가든'=앱 이름(내부용), '꽃틔움'=스토어명(고객/네이버 노출용). 발행 payload 고객 노출 필드의 앱 이름을 스토어명으로 정정. Desktop이 store_settings.store_name='꽃틔움' DB 교정 완료(SoT). **작업1 importer fallback**: '꽃틔움 가든' → 스토어명. **작업2 정보고시 manufacturer fallback**: '꽃틔움 가든 협력업체' → 스토어명. **작업3 SoT 연동**: DEFAULT_STORE_NAME='꽃틔움' 상수 + buildNaverProductPayload/buildProductInfoProvidedNoticeEtc에 storeName 인자 + register route가 store_settings.store_name 읽어 전달(dryRun+실 path). DB 빈 값이면 코드 기본값. 향후 스토어명 변경 시 DB 한 곳만. **작업4 잔존 점검**: grep 전수 — 앱 UI 라벨/주석/마스코트 프롬프트의 '꽃틔움 가든'(앱 이름)은 정당 유지. 정정 1건: ops/insert-card storeName useState 기본값 '꽃틔움 가든' → '꽃틔움'(고객 동봉 카드 인쇄용, settings 미연동 하드코딩). **dryRun production 단정 PASS**: 명화 방향제 → originAreaInfo.importer='꽃틔움' + 정보고시 etc.manufacturer='꽃틔움' + payload 전체에서 앱 이름 '꽃틔움 가든' 잔존 0건. TSC 0 / build 0 / verify-vercel exit 0. 비가역 0(register 0건). legalApproval 보호 #39(stash@{0} 유지) / SD-01 footer 미접촉. **다음 (Desktop)**: 명화 방향제 dryRun 재단정(importer/manufacturer='꽃틔움') → 회선 확인 → 대표 승인 → register 첫 발행. 달항아리 ORDER_MADE 파킹 유지.
> 2026-06-02 **수입품 importer 자동 충진 — originAreaInfo NotEmpty 400 영구 차단** (Code turn, baseline dceda9f → push 3137914). 단정(#46): 중국산(originCode 200037, isImport=true)인데 importer_name=null → 기존 코드 `isImport && product.importer_name` 조건 false → importer 누락 → 네이버 400 "수입사 항목을 입력해 주세요"(originAreaInfo.importer NotEmpty). 달항아리 21:53 + 명화 방향제 동일 사유. **Fix (product-builder.ts)**: 수입품이면 importer 항상 충진, 폴백 체인 importer_name > naver_manufacturer > '꽃틔움 가든' (100자 slice). 국산(isImport=false)은 importer 미포함 유지(네이버 국산 수입사 금지). 위탁 셀러 본인이 수입 책임 주체 → 자사명 충진 정당(허위 0). **dryRun production 단정 PASS**: 명화 방향제(cmpnooli40001f0gveaxr8iim, 중국산, importer_name·naver_manufacturer 둘 다 null) → originAreaInfo.importer='꽃틔움 가든' 충진 + originAreaCode=200037. 국산 회귀는 isImport=false 결정론적 미포함(코드 단정). TSC 0 / build 0 / verify-vercel exit 0. 비가역 0(register 0건). legalApproval 보호 #39(stash@{0} 유지). **다음 (Desktop)**: 명화 방향제(NORMAL, 표준 위탁)로 dryRun 재단정 → 회선 확인 → 대표 승인 → register 첫 발행. 달항아리 ORDER_MADE 파킹 유지.
> 2026-06-02 **배송 분기 — 공급사 합배송 속성 자동 분기 + ORDER_MADE 가드** (Code turn, baseline 1286176 → push 799dea7). 권위: docs/research/RESEARCH_naver_delivery_bundle_margin_2026-06-02.md. 설계 원칙(대표 확정): 묶음배송 가능 여부 = 공급사·상품별 속성. 네이버 제약: deliveryBundleGroupId 와 deliveryFeeByArea 양립 불가(§1). **작업1 schema 동기화** (Desktop Supabase ALTER 선행, Code는 동기화만): Supplier bundleCapable/naverBundleGroupId/islandExtraFee/jejuExtraFee + Product shippingAttribute('NORMAL' default). prisma generate. Supabase information_schema 대조 drift 0 확인(DB push 0). **작업2 product-builder buildDeliveryInfo 분기**(§B): SupplierBundleInfo 인터페이스 + bundleCapable=true & naverBundleGroupId 유효 숫자 → deliveryBundleGroupUsable=true + deliveryBundleGroupId 전송 + deliveryFeeByArea 제거 / 그 외 → feeByArea 전송 + groupId 제거. 공급사 추가비(jeju/island) 우선, 없으면 template fallback. buildDeliveryInfoFromProduct도 패스스루. **작업3 register route**: 2-b Supplier 조회 → bundleInfo → buildDeliveryInfo 전달. dryRun preview에 deliveryBranch 노출. **작업4 ORDER_MADE 가드**: shippingAttribute='ORDER_MADE' + !dryRun + !forceRegister → 409 차단(달항아리 파킹). dryRun은 통과. **dryRun production 단정 PASS**: 달항아리(이현마켓 bundleCapable=true, **단 naver_bundle_group_id=null**) → useBundle=false → deliveryFeeByArea{AREA_3,5000,5000} 경로 + deliveryBundleGroupId=null + mutuallyExclusiveOk=true. 그룹 ID 없으면 합배송 안전 차단(의도대로). TSC 0 / build 0 / verify-vercel exit 0. 비가역 0(register 0건). legalApproval 보호 #39(stash@{0} 유지, schema legalApproval 정상). **다음 (Desktop)**: 표준 위탁 상품(NORMAL, bundleCapable=false 공급사)으로 첫 발행 검증. 달항아리는 ORDER_MADE 파킹(전용 배송설계 후속). 이현마켓 합배송 실사용하려면 판매자센터에서 묶음그룹 생성 → naver_bundle_group_id 입력 필요(§2, 그룹 생성 전용 API 미확인 — 수동).
> 2026-06-02 **P0 발행 — 네이버 이미지 업로드 파이프라인 (외부 URL 직접 전송 제거)** (Code turn, baseline 5f40e14 → push a062bfb). 권위: docs/research/RESEARCH_naver_image_upload_api_2026-06-02.md. **확정 진단(#46)**: register 18:34 KST → 400 "올바른 이미지 파일이 아닙니다"(PhotoInfraUpload.unavailable). 다른 필드(정보고시/카테고리/주소/배송/minorPurchasable/PRIMARY) 전부 통과. 원인: representativeImage.url에 Supabase public URL 직접 전송 — 네이버는 외부 URL 불가, 이미지 다건 등록 API(POST /external/v1/product-images/upload)로 바이트 업로드 → shop-phinf URL만 허용(RESEARCH §1). **★proxy 멀티파트 진단 (요보고)**: scripts/home-proxy.mjs 정독 — 기존 relay는 body JSON.parse + JSON.stringify + Content-Type application/json 하드코딩 → **멀티파트 패스스루 불가**. 전용 경로 action 'uploadImages' 신설 (proxy가 등록 IP 219.248.15.46에서 직접 Supabase fetch + 네이버 멀티파트 업로드, 바이트 Vercel↔proxy 이중경유 회피). **작업1 (api-client.ts)**: sniffImageMime(매직바이트 JPEG/PNG/GIF/BMP 판정, 확장자 불신 §3) + uploadImagesToNaver (proxy 모드=action 위임 / direct 모드=FormData 'imageFiles' per-part MIME + Authorization만, boundary 자동). **home-proxy.mjs**: action 'uploadImages' — imageUrls fetch → MIME sniff → Blob → FormData → 네이버 업로드 패스스루. **작업2 (register route)**: 7-img 단계 — dryRun 아닐 때 gallery[main,...additional]+detail 업로드 → 네이버 URL → buildNaverProductPayload 3번째 인자 주입 + detail_image_url 네이버 URL 치환 후 buildDetailContent(§4 InvalidImageUrl 방지) + 잘못된 7번 주석 삭제 + 업로드 실패 시 stage:IMAGE_UPLOAD 502(DRAFT 유지). **작업3**: dryRun payloadPreview.imagesToUpload에 업로드 예정 목록 표시(실 업로드는 발행 시). **dryRun production 단정 PASS**: imagesToUpload.mainImage(JPEG)+detailImage(PNG, detail-S6)+note 노출. success true. TSC 0 / build 0 / node --check home-proxy OK / verify-vercel exit 0. **비가역 0**(register 호출 0건, DRAFT 유지). legalApproval 보호 #39(stash@{0} 유지). **★다음 (운영 2건 선행 필수)**: (1) 대표가 home computer에서 git pull + home-proxy 재시작(action 'uploadImages' 적용 — 안 하면 proxy가 모름→400) (2) Desktop register 직전 GET /api/naver/addressbooks 회선 생존 확인 → 대표 명시 승인 → 실 register → 이미지 업로드 → naverProductId 발급 → 발행 완주. 또 400 시 diagnostic.bodyHead(PhotoInfraUpload.extension/InvalidImageUrl)로 추가 fix.
> 2026-06-02 **P0 발행 — register 400 invalidInputs 2건 정확 fix** (Code turn, baseline 3ce46d2 → push e384447). Desktop 발행 시도(18:15 KST, 회선 복구 직후 대표 승인): POST register → HTTP 400 + 네이버가 정확히 invalidInputs 2건 반환 (이전과 달리 회선 정상이라 본문 도착). **사유 단정(추정 0)**: (1) originProduct.deliveryInfo.claimDeliveryInfo.returnDeliveryCompanyPriorityType — NotValidEnum (현 코드 'CHARGE' 전송이 v2 enum 아님), (2) originProduct.detailAttribute.minorPurchasable — NotNull (필드 자체 부재). 정보고시 ETC / 카테고리 / 주소 / 상품명 / 이미지 전부 PASS — 딱 2건만 남음. **Fix 1**: GitHub Discussion #241 코드 샘플 단정으로 'PRIMARY' (대표/1순위) 사용. NaverClaimDeliveryInfo 타입을 'PRIMARY'|'SECONDARY'로 교정 + buildDeliveryInfo 'CHARGE'→'PRIMARY' 변경. **Fix 2**: NaverProductPayloadV2 detailAttribute에 minorPurchasable?: boolean 추가 + buildNaverProductPayload에 minorPurchasable: true 상수 (미성년자 구매 가능 default, 성인전용 흐름 별도 도입까지 전 상품 허용). dryRun preview 보강(2필드 노출). **dryRun production 단정 PASS**: claimDeliveryInfo.returnDeliveryCompanyPriorityType=PRIMARY + shippingAddressId=106914714 + returnAddressId=106914715 + returnDeliveryFee=7500 + minorPurchasable=true. TSC 0 / build 0 / verify-vercel exit 0. **비가역 0** (Code register 0건, DRAFT 유지). legalApproval 보호 #39 (stash@{0} 유지). **다음 (Desktop, #41)**: register 직전 GET /api/naver/addressbooks로 회선 생존 단정(★사용자 지시) → 대표 명시 승인 → POST register. 통과 시 naverProductId 발급 → 발행 완주. 또 invalidInputs 시 그 사유로 추가 fix.
> 2026-06-02 **P0 회선 수정 출하 + 진단 결과 정정** (Code turn, baseline f9023a3 → push 22c43bb). Desktop register 2회 ECONNRESET 보고 받음. 처방 출하: api-client.ts fetchNoKeepAlive 헬퍼 (Connection: close + keepalive:false + ECONNRESET 자동 백오프 재시도 200/400ms 최대 3회) + cause 진단 보강 (syscall/address/port/errno/attempts). 4개 fetch path 전수 적용. TSC 0 / build 0 / verify-vercel exit 0. **그러나 사후 검증에서 stale fact 정정 (#46)**: GET /api/naver/addressbooks 본 turn 호출 시 GET도 동일 ECONNRESET 발생 (durationMs ~1000ms, attempts=3 모두 실패). Vercel runtime logs 08:28~08:37 grep: dashboard/stats(GET)까지 NETWORK_RESET. **모든 네이버 호출이 실패 중** — 일시적 keep-alive 재사용 사고 아님. 이전 가정("GET 정상, POST만 끊김")은 그 순간의 snapshot이었고 본 turn에선 무효. **Code가 단정 가능한 사실만**: (a) 클라이언트 회선 수정 코드는 정상 작동(retry-backoff/retry-success [NAVER_DIAG] 발화 확인) (b) 자동 재시도 3회 모두 실패 = client-side fix만으로 해결 불가 = server-side(proxy 또는 그 너머) 차단/장애. **진짜 원인 후보 (단정 못 함, 추정 명시)**: ① Tailscale Funnel proxy 자체 다운(home computer 측) / ② proxy → naver 회선 차단(proxy 측에서 RST) / ③ NAVER_PROXY_URL 환경변수 변경/잘못 설정. **다음 단계 (Code 권한 밖)**: 대표가 home computer Tailscale Funnel proxy 상태 점검 + 재가동 → 그 후 GET /api/naver/addressbooks 단정 → 정상 회복 시 register 재시도. 비가역 0 (register 호출 0건, DRAFT 유지). legalApproval 보호 #39 (stash@{0} 유지). TECH_DEBT: DEBT-09(Tailscale Funnel proxy 헬스체크 동선 부재) 신규 등재.
> 2026-06-02 **P0 발행 1단계 완주 — 정보고시 ETC + AS 형식화 + name SEO 우선 + 공통슬롯 4칸** (Code turn, baseline 1664758 → push 734f25d). 권위: docs/research/RESEARCH_naver_productinfo_notice_api_2026-06-02.md + docs/handoff/HANDOFF_common_image_slot_publish_payload_2026-06-02.md. **결정적 정정 #46**: API v2는 정보고시 템플릿 ID(2976841 등) 참조 미지원 — payload에 절대 삽입 금지. ETC 인라인 유일. **작업1 productInfoProvidedNotice ETC**: product-builder에 NaverProductInfoEtc 타입 + buildProductInfoProvidedNoticeEtc(product) 헬퍼 + payload.detailAttribute.productInfoProvidedNotice 통합 — type=ETC + 자식 etc만 (type-자식 일치 필수 RESEARCH §1) + 8필드 위탁표준문구 "상품상세참조" + itemName/modelName/manufacturer는 실제값(productInfo* > naver_title > name 우선순위) + customerServicePhoneNumber = normalizeNaverPhone(asPhone). **작업2 AS 전화 형식화**: normalizeNaverPhone 헬퍼 (정규식 + 자동 dash 포맷팅 + fallback 010-3227-4805 주소록 번호). DB Product.asPhone="고객센터 문의" UPDATE 0 (가드만). **작업3 name SEO 우선**: pickProductName naver_title > seoTitle > name 100자 slice. **작업4 공통슬롯 4칸**: StoreSettings에 noticeTopImageUrl/noticeTopText/noticeBottomImageUrl/noticeBottomText nullable 4컬럼 신설 + Supabase ALTER 적용 + NoticeAssets 타입 + buildDetailContent 슬롯 통합 (조립순서: [topImage][topText] → hookPhrase → detail_image_url → description → AEO → [bottomText][bottomImage]) + register route가 store_settings 4슬롯 read → builder 인자 전달. **#34 보고**: docs/research/assets/ 디렉토리 부재 — b2b_notice_top/bottom 2이미지 working tree 0건. supabase product-assets/common/ 업로드는 후속 turn (사용자 이미지 제공 후) 진행. schema + buildDetailContent 슬롯 구조는 본 turn 완비 — URL 채워지면 즉시 동작. **dryRun production 단정 통과**: leafCategoryId=50000963 + name="집들이선물 달항아리 도어벨..."(naver_title) + AS phone=010-3227-4805 + productInfoProvidedNotice.type=ETC + etc 9키(8필수+상담전화) 충진 + noticeSlots 전부 미설정. validation A/A 85/84 통과. TSC 0 / build 0 / verify-vercel exit 0. **비가역 0** (register 0건, DRAFT 유지). TECH_DEBT: DEBT-07(공통슬롯 2단계 = 앱 셀프편집 UI) + DEBT-08(카테고리별 정보고시 유형 자동검증 "상품군 단건 조회" API) 신규 등재. **다음 단계 (#41 Desktop 권한)**: Desktop이 본 turn dryRun 단정 정독 → 대표 명시 승인 후 실 register 호출. 통과 시 발행 완료. 또 400/502 시 응답 diagnostic.bodyHead 또는 invalidInputs[].name/message로 정확 사유 read.
> 2026-06-02 **P0 달항아리 register 400 사유 1순위 확정 + dryRun/diagnostic 출하** (Code turn, baseline 2fdbd32 → push 57dce53). Desktop 발행 시도(2026-06-02 06:10:22 KST, 대표 명시 승인) → POST /v2/products HTTP 400 + [NAVER_DIAG] kind=HTTP_ERROR. Vercel MCP 로그 truncate로 전문 추출 실패 → Code가 DB 정독 + payload 단정으로 1순위 사유 확정(#46). **1순위 사유 (확정)**: [product-builder.ts:524] `leafCategoryId: product.category ?? '50003307'` → Supabase Product.category = "uncategorized"(legacy free-text label) → 네이버가 unknown category로 400 거부. naverCategoryCode 컬럼은 "50000963"으로 정상이나 builder가 잘못된 컬럼 읽음. **Fix**: LocalProduct에 naverCategoryCode 추가 + leafCategoryId resolution naverCategoryCode 우선 + 8자리 numeric 정규식 가드 (11_08_22_00_00 / uncategorized / 빈 문자열 거부) + validateForRegistration 가드도 동일 패턴. **dryRun 출하**: POST /api/naver/products/register {dryRun:true} → payload echo (네이버 호출 0, DB 쓰기 0). 비가역 0. 본 turn에 호출 후 단정: leafCategoryId=50000963(정상) / claimDeliveryInfo shippingAddressId=106914714(RELEASE) / returnAddressId=106914715(REFUND_OR_EXCHANGE) / validation A/A 통과. **diagnostic 노출 출하**: NaverApiError catch → 응답 JSON에 kind/status/bodyHead/gwTraceId 그대로 노출 (HTTP 502). 다음 실 호출 시 사유 즉시 read (Vercel logs grep 불필요). **2순위 의심 (단정 보존)**: productInfoProvidedNotice 필드가 product-builder에 미구현 → 가구/인테리어 카테고리 정보고시 필수 가능성 (Product.productInfoName/Manufacturer/Model 3건 NULL). **3순위 의심 (단정 보존)**: afterServiceTelephoneNumber="고객센터 문의"(텍스트) — 네이버 v2는 전화번호 형식 요구 가능. asPhone DB 값이 텍스트라 네이버가 reject 가능. **다음 단계** (#41 — register는 Desktop 권한): Desktop이 대표 명시 승인 후 실 register 재호출 → (a) 통과 시 발행 완료 (b) 또 400이면 응답 JSON.diagnostic.bodyHead로 정확 사유 즉시 read → 2/3순위 정정 후 재시도. TSC 0/build 0/verify-vercel exit 0. legalApproval 보호 #39 (stash@{0} 유지).
> 2026-06-02 **P0 발행 선결 — 위탁배송 주소 기능 신설 + 네이버 호출 진단 로깅 보강** (Code turn, baseline ac13be7). 사용자 지시문 stale 정전 (#46): addressbooks 라우트 / claimDeliveryInfo 매핑 / product-builder shippingAddressId·returnAddressId / register 사전 400 가드는 **이미 존재** — 다만 StoreSettings.asGuide String field에 JSON 임시 캐싱(코멘트 'until schema migration adds dedicated columns' 명시) → 정식 컬럼화 turn. 작업1 진단(api-client.ts): NaverApiError + NaverFailKind 7종 분류 helper(IP_NOT_ALLOWED / RATE_LIMIT / NETWORK_RESET / NETWORK_TIMEOUT / DNS_FAIL / HTTP_ERROR / AUTH_FAIL) + error.cause(code) 추출 + GNCP-GW-Trace-ID + GNCP-GW-RateLimit-Replenish/Burst-Capacity 헤더 + 응답본문 300자 + 호출 timing 단정 로깅 ([NAVER_DIAG] grep). 작업2 schema: StoreSettings에 releaseAddressId(VARCHAR40) / returnAddressId(VARCHAR40) / addressbookSyncedAt(Timestamp) 3컬럼 신설 + Supabase ALTER TABLE 적용(IF NOT EXISTS, nullable backward-compatible) + Prisma generate 통과. 작업2 route: addressbooks GET이 RELEASE / REFUND_OR_EXCHANGE addressBookNo를 정식 컬럼에 저장(부분 성공도 wipe 0 — 한쪽만 성공 시 다른쪽 보존), Promise.allSettled로 NaverApiError.diagnostic을 응답에 그대로 노출(IP 분기 production에서 즉시 판정 가능). products/register + products/batch-register: asGuide JSON 폐기 → 정식 컬럼 read + 사전 400 가드 메시지 명확화 (RESEARCH §3 위탁 단일 대표주소 모델 명시). batch-register DEBT-06 해소: 존재하지 않던 key/value 테이블 raw SQL → prisma.storeSettings.findFirst로 정정 (이전엔 항상 0 반환 → shippingAddressId=0 깨짐). 위험 격리(#34): 미커밋 schema diff에 **legalApproval 삭제(#39 보호자원)** + 단순 포맷팅 잔재 발견 → stash@{0} 'z3c-misdirected-prisma-format-legalApproval-DELETE-DO-NOT-APPLY'로 격리 (working tree 정합). TECH_DEBT: DEBT-05(주소 정식 컬럼 부재) + DEBT-06(batch-register raw SQL schema mismatch) 신규 등재 + 이번 turn 양쪽 RESOLVED. TSC 0 / build 0 / 비가역 0 (네이버 register 호출 0건, DRAFT 유지). 다음(분기 진단): Desktop 대표 환경에서 (1) 판매자센터 → 판매자정보 → 배송정보 → 주소록에 RELEASE / REFUND_OR_EXCHANGE 등록 → (2) GET https://kkotium-garden.vercel.app/api/naver/addressbooks 호출 → diagnostics 필드 확인 → (2-a) IP_NOT_ALLOWED 분기 시 Vercel Static IPs 또는 QuotaGuard 결정 → (2-b) success 시 자동수거지시 예외처리 1:1 문의 → (3) 달항아리 register 대표 명시 승인 후 발행.
> 2026-06-02 **P0 엑셀 5건 검증 완료 + F4 오진단 정정** (Code turn, docs only, baseline 0873b6a). Desktop 독립검증(HANDOFF_excel_5fix_verify_f4_correction) 셀 단위 단정: F1 옵션 [12~16]·F2 제조사 [26]·F3 상품명 [2]·F5 정보고시 [51][54] **4건 [CLOSED] 통과**. ★F4 [46][47] 공란은 버그 아님 — Code 보고("DB 미입력")가 틀림. Desktop 실측 진실: shipping_templates(cmmlalkq60007121qth9i8xtz) return_fee/exchange_fee=7500 처음부터 존재. 공란 원인 = naverExcelJS.ts buildDataRow 데이터 렌더 루프의 `isDisabled = !!deliveryTemplateCode && isShippingField` 가드 — 네이버 정책 정합(템플릿=SoT, 개별칸 비움이 정석). 추가 데이터 입력 불필요(입력해도 isDisabled가 또 지움). F4 빌더 가드 수술(line 134-135 명시 fee 출력)은 템플릿 미연결 상품엔 유효 — 보존. 코드 변경 0. 비가역 0. TECH_DEBT DEBT-04 CLOSED 4건 + RESOLVED-NOT-A-BUG 1건으로 정정. **기술적 발행 차단 요소 0**. 다음: (선택) productInfoModel 충진 → 대표 명시 승인 → register.
> 2026-06-02 **P0 발행 선결 — 네이버 엑셀 88칸 매핑 누락 5건 수술** (Code turn, baseline 5e72798). 권위: docs/handoff/HANDOFF_naver_excel_mapping_gaps_2026-06-02.md. route.ts 수정 4건 + builder fee guard 수정 1건: (F1 치명) DB optionName/options[] → optionType/optionNames/optionValues/optionPrices/optionStocks 변환 헬퍼 신규(buildOptionFields, default 조합형). (F2) manufacturer naver_manufacturer 우선. (F3) productName naver_title 1순위(Lane 1 SoT, DEBT-01 4중컬럼 P3 발행 후). (F4) returnFee/exchangeFee shipping_template NULL일 때 naver_refund_info/naver_exchange_info 텍스트 정규식 파싱 fallback(extractFeeKrw). naverExcelJS.ts buildDataRow line 134-135: hasTemplate=true에서도 명시값 출력하도록 가드 수정 — 'p.returnFee ?? (hasTemplate ? "" : d.returnFee)'. (F5) noticeBrandName/noticeModelName/noticeManufacturer 매핑 추가. tsx unit-test 단정 통과: 달항아리 fixture → xlsx row 3 col 13~17/27/47~48/55 전부 충진(조합형/형태/정사각,직사각/0,0/9999,9999/유통 꽃틔움/7500/7500/유통 꽃틔움). TSC 0/build 0/비가역 0(DRAFT 유지, register 0건). 신규 부채 DEBT-04 등록(엑셀 buildDataRow 매핑 가드 패턴, 신규 NaverProductData 필드 추가 시 route.ts 동시 갱신 의무). 다음: Desktop production POST /api/naver/excel 재호출로 5건 충진 육안 + 정보고시 productInfo* 충진 → 대표 명시 승인 → register.
> 2026-06-02 **P0 달항아리 발행준비 실측 + 카테고리 코드 단정** (Code turn, docs only, baseline bd286ac). Desktop 실측: publishReady=true (fieldsAllSet/authentic/naverPayloadComplete 4축 GREEN), DRAFT 유지. ★카테고리 코드 정합 단정: DB값 `11_08_22_00_00`은 도매꾹 underscore 형식(Naver 8자리 숫자 아님) → 발행 시 Naver Commerce API 거부 확실. 정확한 Naver 코드 = **`50000963`** (가구/인테리어 > 인테리어소품 > 도어벨, 완벽 매칭). 비가역 0(register 호출 0건, DRAFT 유지). 다음: Desktop Supabase UPDATE로 naverCategoryCode `11_08_22_00_00` → `50000963` 교정 → 대표 명시 승인 후 발행. stale 정정: B-3 "category=uncategorized·순마진 6.4%" 무효(코드 충진 완료·마진 27200/20900 정상). 정보고시 placeholder 3필드 + naver_color/size/weight "상세페이지 참조"는 ADVISORY(게이트 비대상).
> 2026-06-02 **UI/UX 2-MOBILE-3 [코드 완료] 모바일 컨트롤 오버플로 4건 + P1~P3 설계 문서** (Code turn, baseline 0ebcd56). M1 글로벌 헤더(꽃티움 버튼 가로 잘림 → 모바일 라벨 hidden + px/gap 축소 + min-w-0 + overflow-x-clip) / M2 products Toolbar 탭(6탭 가로 고정 → overflow-x-auto w-full lg:w-auto) / M3 Toolbar 컨테이너(flex-wrap 들쭉날쭉 → 모바일 flex-col + 검색 w-full) / M4 BulkFloatMenu(minWidth 520 하드 → lg:min-w-[520px] + maxWidth calc(100vw-24px) + 버튼행 overflow-x-auto + bottom-[84px] MobileTabBar 위 도킹). 데스크톱 lg+ 분기 격리로 회귀 0. 신규: docs/handoff/HANDOFF_mobile_polish_p1p3_2026-06-02.md (P1 골든윈도우 가드 / P2 발행 관제탑 / P3 SEO 4중컬럼 수술 — 발행 후). TSC0/build0. 다음: Desktop P0 달항아리 발행(naver_* 17필드 충진 선결, publishReady 진위게이트).
> 2026-05-29 **Track B G8-ENGINE-Q4 [코드 완료] Adobe Workflow SOP 시스템화 + 누끼·합성 파이프라인** (Code turn, push f6ce373, baseline 4cd524f). 리서치 ADOBE_WORKFLOW §1/§3/§6 정합 11 item: DB Product.legalApproval(멱등 raw ALTER) + 명화송풍구 master_pd_verified seed + category-tone-mapper foreign-cinematic-sunlit(fragrance 다크->햇살) + adobe-tool-router(변형x톤->도구·모델, clean/badge=Firefly 면책) + cutout-strategy(stt_330->manual-upload) + composition-reference(결정론 seed) + brand-kit-spec + asset-legal-gate 확장(partner-model block/domeggook advisory/master_pd 우회) + art_director_prompts(dark deprecated+sunlit 5종) + cutout-quality-check.js + route 노출. 독립 4모듈 Workflow 서브에이전트 병렬 작성. production 검증: 명화송풍구 master_pd_verified->명화 block 우회 passed=true + foreign-cinematic-sunlit, 아이스트레이 manual-upload(760px)+domeggook advisory. TSC0/build0/verify-vercel exit0. 외부 이미지 API 런타임 0. 비가역 0. 다음: Desktop Firefly 적재 10건 + 누끼 합성 + 3종 검증.
> 2026-05-29 **Track B G8-ENGINE-Q3 [코드 완료] 한국 시장 정합 아트디렉션 시스템** (Code turn, push df2aec6, baseline b33b286). 리서치 §8/§9/§5-C 정합 6 item: (1) category-tone-mapper.ts(conceptTone+category -> ToneDirective 9종 매핑, 얼굴 하드 금지 타입) (2) asset-legal-gate.ts(명화/실존인물 키워드 block + AI 고지 자체사용 면제, 얼굴 픽셀검출 정밀화 별도) (3) thumbnail-art-direction 2-step + senior 강화(typeScale 1.30/contrastMin 7.0/INK/고대비 accent) (4) route toneDirective/legalGate 노출 (5) scripts/upload-backdrop.js (6) art_director_prompts 12종 seed. production 아이스트레이 실측: toneDirective(kitchen/hygiene/modern-minimal) + legalGate.passed=true + senior 필드 노출. 단위 3종 §11 정합(명화송풍구 passed=false 명화 block / 달항아리 korean-traditional). TSC0/build0/verify-vercel exit0. 비가역 0. 다음: Desktop Firefly backdrop 적재 + 3종 before/after.
> 2026-05-28 **Track B G8-ENGINE-Q2 [코드 완료] 카피/폰트 품질** (Code turn, push 7b0b3ab, baseline 400b726). item1 categoryBadge 오염 필터: generateCopy가 categoryBadge에서 Groq 자유 합성 폐기 -> category leaf 결정론적 추출(deriveCategoryBadge), "생활/건강 > 주방용품 > 보관/밀폐용기" -> "밀폐용기"(이전 비문 "일용보관함"/"보관함용기" 제거). item2 Pretendard 번들: Vercel Linux Sharp/librsvg 한글 폰트 부재로 SVG 텍스트가 두부(box)/미표시였던 결함을 fonts/Pretendard-{Regular,Bold}.otf + font-setup.ts(FONTCONFIG_FILE) + next.config outputFileTracingIncludes(thumbnail+generate-detail)로 수정. production POST /api/thumbnail/<아이스트레이> 픽셀 재확인: badge "밀폐용기" 흰 글리프 + lifestyle 캡션 실 한글(이전 두부 대비) -> #46 픽셀 검증. TSC0/build0/verify-vercel exit0. 비가역 0. P0 누끼 미적재(Storage 빈 폴더 -> assetSource.cutout=fallback) — cutout PNG 바이트 미확정(mainImage가 라이프스타일 합성 사진이라 자동 누끼 부적합), scripts/upload-cutout.js 준비. 다음: Desktop 4변형 before/after 육안 + 누끼 적재.
> 2026-05-28 **Track B G8-ENGINE-Q1 [코드 완료] 썸네일 아트디렉션 품질 격상** (Code turn, push 597f3ee, baseline eb72b9e). 5개 SCOPE 중 4개 완료(item4 Pretendard 별도): (1)thumbnail-art-direction.ts 신규 pickArtDirection(conceptTone) -> 팔레트(WARM/COOL/VIVID/MONO, 실제 ColorMood enum warm/calm/vivid/mono 트리거, 기본 warm)+보조축 모듈레이션(pricePosition/emotionalTone/persona/genre, 실제 enum) (2)sharp-composite 프리미엄 프리미티브(사이클로라마 스윕/소프트 스포트/접지 2겹/바닥 반사/엣지 비네팅) + thumbnail-generator buildProductScene 4 renderer 공통화(단색fill 폐기) (3)route가 응답에 artDirection echo (5)clean 변형 텍스트/워터마크 0(네이버 대표이미지 정책). production smoke: POST /api/thumbnail/<아이스트레이> 200 + 4변형 + clean copy {} + artDirection.colorMood=warm(팔레트 #D6965A 정합) + 모듈레이션(productScale 0.9 minimal, typeScale 1.15 senior) + assetSource/lowResolution 회귀 0. 외부 이미지 API 런타임 0(#38, Sharp 로컬). TSC0/build0/verify-vercel exit0. 비가역 0. **item4 Pretendard 폰트 번들 미완료**: 폰트 바이너리 에셋 부재 + Vercel fontconfig 설정 + 글리프 육안검증 불가로 #46상 별도 검증 단계 위임(현 SVG font-family는 Pretendard 우선 스택 유지, 환경 미설치 시 폴백). 다음: Desktop E2E 육안 재검증 + 누끼 Storage 적재로 차별화 극대화 -> Real Win(Firefly 씬).
> 2026-05-28 **Track B G8-ENGINE [코드 완료] 이미지 엔진 구축** (Code turn, push 5a169c7, baseline 08795bb). 5개 SCOPE 전부 완료: (1)asset-source-resolver.ts 신규 — 소스 우선순위 manual>auto-cache(Storage product-assets/{id}/cutout.png + backdrop-{skeletonId}.png)>fallback, findCachedAsset graceful(오류->null) (2)thumbnail-generator 4 renderer가 cutout 투명패딩 합성, 없으면 fitImage fallback (3)studio/PLANT 공용 useStudioActions에 B 수동 누끼/배경 URL 입력 + 소스 뱃지 (4)thumbnail route가 matchSkeleton로 skeletonId 결정 후 resolver 배선 + backdrop 우선순위(manual>Storage캐시>lifestyle-picker>브랜드색) + 응답 assetSource (5)저화질 가드 760px 경고(진단 L4 정합). production smoke: POST /api/thumbnail/<아이스트레이> 200 + 4변형 생성 + assetSource{cutout:fallback,backdrop:fallback}(캐시 미적재 정상) + lowResolution 760 플래그. 외부 이미지 API 런타임 호출 0(#38), 합성=서버 Sharp 유지. TSC0/build0/verify-vercel exit0. 비가역 0. 다음: Desktop이 Adobe 누끼 PNG -> Storage product-assets/{id}/cutout.png 적재 -> production E2E(4변형 차별화 육안 + save-assets DB main/detail_image_url) 재검증.
> 2026-05-28 **Track B G8-ENGINE 디자인 라인 실증 완료** (Desktop turn, 코드 변경 0, baseline 08795bb). 확정 동선 6단계 실 MCP 호출 전수 통과: (1)도매꾹 원본 Referer 우회 다운로드 760x760 200 (2)Adobe CC 청크 업로드 init/PUT/finalize 200 -> presignedAssetUrl (3)image_remove_background 투명 누끼 성공(투명체 경계+손 보존, rembg 대비 우위) (4)asset_search GenAIAsset 경로 정상(자산 0건) (5)Pillow+Noto CJK 한글 헤더 합성 (6)4변형 clean/price/badge/lifestyle 차별화 육안 증명. 아키텍처 확정 2건: Adobe Express MCP는 외부 누끼 PNG 합성 불가->합성엔진은 서버 Sharp 유지 / image_remove_background는 Adobe CC presignedAssetUrl만 허용(공개 URL 거부). 실측 정정: /mnt/user-data/uploads 읽기전용->/home/claude 스크래치 사용. 비가역 0(Supabase 미저장, 네이버 미발행). 상세: docs/handoff/HANDOFF_g8_engine_design_line_proven_2026-05-28.md. 다음: Code Phase G8-ENGINE(asset-source-resolver + thumbnail-generator 리팩터 + B 수동 오버라이드 UI).
> 2026-05-28 **Track B G8-FIX [코드 완료] 회귀 3건 수리** (Code turn, push 2c7da13, baseline fef5c84). (1) 진단 도매꾹 CDN 500: image-fetch-headers.ts host조건부 Referer/UA 공유헬퍼 신규 -> p-filter/image-quality/sharp-composite fetch 정렬. production POST /api/diagnose 200 + CDN760(760x760) 실분석 실증(persist:false). 핸드오프의 "fetchImageBuffer가 이미 Referer 경로" 전제는 부정확 실측 정정(셋 다 bare fetch였음). (2) [object Object] 에러: useStudioActions responseError(객체 error 필드 JSON.stringify)/toMessage 정규화 -> throw 5 + catch 6 사이트 -> DiagnosisCard/Thumbnail/Detail 동시 해소. (3) ?product= URL prefill skip: studio/page.tsx 함수형 setSelectedId(prev => prev ?? list[0].id)로 stale closure 클로버 방지. TSC0/build0/verify-vercel exit0. 비가역 0(persist:false, 네이버 미발행). 다음: Desktop 새 채팅 production UI 재검증 -> 통과 시 Phase G8-ENGINE(누끼/배경 resolver 별도 sprint).
> 2026-05-28 **Track B G8 [진행중] 온실 아틀리에 이미지 엔진 근본 재설계 착수** (Desktop turn, 코드 변경 0, baseline fef5c84). G8 production 실측 중 썸네일 4변형(clean/price/badge/lifestyle)이 거의 동일 출력 발견. 근본: 누끼/배경 생성이 thumbnail-generator.ts에서 부재(2026-05-15 Cloudinary 401 차단 후 fitImage 우회 고착) -> 4변형 차이가 텍스트 오버레이뿐. 동반 회귀 3건: 진단 도매꾹 CDN 직접 fetch 500(표본 mainImage=CDN760, main_image_url=null) / studio ?product= URL prefill skip(목록 최신순 첫항목 덮어씀) / [object Object] 에러 직렬화. 확정 방향: Source Priority Resolver = A(Adobe Express 누끼 + Nano Banana 배경 자동) 기본 엔진 + B(디자이너 수동 누끼/배경 URL) 최우선 오버라이드 통합. 썸네일 4변형 생성 배관 자체는 #26 행 없이 정상(생성 성공). save-assets 라우트는 base64 수신->Storage 업로드->DB UPDATE로 무거운 합성 없음(#26 무관) 확인. 비가역 0(더미 저장 안 함, 네이버 미발행). 상세: docs/handoff/HANDOFF_g8_studio_asset_engine_2026-05-28.md. 다음: Code Phase G8-FIX(P0 진단 CDN + 에러직렬화 + URL prefill) -> Phase G8-ENGINE(resolver + 누끼/배경 어댑터).
> 2026-05-28 **Track B G7 [CLOSED] + E1~E3 [CLOSED] (userId FK fix 재검증 통과)** (Desktop turn, 코드 변경 0, baseline 17143f0). G7: Code userId/supplierId FK 검증 fix(17143f0) production 재검증 -> 36904429 등록시작 -> 엑셀 다운로드 -> POST /api/products **200**. DRAFT row(cmpp62yje00015xup5h8pgwx0) 88필드 정합: sku=KKT-1779953038280(자동생성) / status=DRAFT(ACTIVE 교정) / userId=실제값(default 교정) / naverCategoryCode=50005257 / salePrice=13900 / margin=42.59 / originCode=200037. E1~E3: 다운로드 엑셀 93컬럼 양식 41 핵심칸 정확(판매자코드/카테고리코드/판매가/옵션값 4종/원산지/배송 CJGLS 조건부무료/고시템플릿 2976841/리뷰포인트). G7 핸드오프 2건 [CLOSED]. originCode 오진 정정: 200037(6자리)이 정상, 0200037(7자리)이 오염(달항아리) — Code 무변경 판단 확정. 비가역 0. 다음: G8 이미지 파이프라인(Sharp 무거운 합성 #26 주의) 새 채팅.
> 2026-05-28 **G7 userId 'default' Foreign Key 위반 fix** (Code turn, 2 파일 +30/-7, commit 17143f0). SKU fix(1aa5969) 검증 통과 후 잔존: UI가 userId='default'(DB에 없는 가짜 ID) 전송 -> truthy라 기존 '!userId' 가드 통과 -> Product_userId_fkey 위반 -> 엑셀 다운로드 DRAFT 저장 100% 500(P0). Fix A: route.ts POST가 userId/supplierId를 findUnique로 실재 검증 후 미존재면 findFirst fallback('default' 거부). Fix B: page.tsx handleGenerate userId='default' 미전송 + status ACTIVE->DRAFT. originCode는 핸드오프의 '0200037 7자리' 전제가 데이터셋(naver-origin-codes.ts 중국=200037)과 모순되는 오진이라 무변경(0200037은 ORIGIN_CODES 매칭 깨짐). TSC 0 / build 0 / verify-vercel exit 0. g7_sku_empty_unique [CLOSED], g7_userid_fk OPEN (Desktop 재검증 대기).
> 2026-05-28 **Track B G2 d3 재검증 통과 + G7 SKU unique 회귀 fix** (G2 = Desktop 검증 [CLOSED] / G7 = Code fix commit 1aa5969). G2: e1c6fd6 production 실측 — suggest API 유령 triple(그릇장/컵보드) 소멸(d3="" 정규화, usedAI:true 재계산) + 화면 d1/d2 자동입력(생활/건강>주방용품) + partial 배너 + 소분류 수동선택 -> 카테고리코드 50005257 chip + 준비도 38->52%. G2 핸드오프 2건 [CLOSED]. G7: POST /api/products 500 = Unique constraint (sku) — 빈 문자열 sku 충돌(명화송풍구 sku="" 1건 점유) -> SKU 미입력 상품 2번째부터 저장 100% 실패(P0). Code fix(1aa5969): 공통 SKU 엔진(src/lib/sku-engine.ts) 빈 SKU 자동발급 + create payload 5필드(taxType/description/keywords/tags/shipping_template_id) 영속화 확장 + Fix B 명화송풍구 빈 SKU backfill SQL은 Desktop MCP 위임. POST /api/naver/excel는 200(엑셀 엔진 정상). 비가역 0. stale 정정: PROGRESS "8개 DRAFT" -> 실제 production 2건(명화송풍구 + 달항아리, 달항아리는 naverCategoryCode 11_08_22_00_00 도매꾹 형식 = G2 fix 이전 오염, B-3 보정 대기). TSC 0 / build 0 / verify-vercel exit 0.
> 2026-05-28 **G2 suggest d3 유령 triple 자체검증 수정 (Track B 재검증 후속)** (Code turn, 2 파일 +122/-23, commit e1c6fd6). Desktop 재검증: G5 [CLOSED] 자동 판매가 13,900원/순마진 +15.5%, G2 silent skip 해소 확인. 그러나 suggest의 pageValidation override 경로가 dominant d1/d2(생활/건강>주방용품)에 타 분류 d3(그릇장/컵보드 = 가구/인테리어>주방가구 하위)를 붙여 유령 triple 생성 -> getCategoryId NULL -> d3 누락 + name_hash 캐시 박제. Fix A selfValidateSuggestions(트리 strict 검증, 무효 d3는 blank하고 d1/d2 신뢰) + Fix B 캐시 read sanitize/write gate(full-valid triple만 저장) + Fix C 클라이언트 partial status로 d1/d2 자동입력. TSC 0 / build 0 / verify-vercel exit 0. G2 핸드오프 2건 OPEN 유지 — Desktop d3 재검증 대기.
> 2026-05-28 **Track B prefill 회귀 2건 수정 (G2 카테고리 silent skip + G5 적자가격)** (Code turn, 4 파일 +73/-2, commit 9415169). G2: 도매꾹 얕은 카테고리 depth(catD1만/0개) 상품이 prefill useEffect의 full-triple 가드를 통과 못해 카테고리 3칸 텅 빔 + suggest 미트리거 -> productName 있으면 synthetic mismatch set으로 기존 suggest 경로 재사용(getCategoryId는 RC1 3-depth fallback 보유). G5: prefill 자동 판매가 supplierPrice*1.3 단순 마크업이 네이버 수수료/배송비 미반영해 순마진 음수(적자) -> calcPrefillSalePrice(수수료 5.5% + 목표 순마진 15% + 배송부담) 교체(crawl/page.tsx 등록시작 2곳) + 판매가 칸 아래 꼬띠 추천가 라벨 추가(i18n 분리 #35). TSC 0 / build 0 / verify-vercel exit 0. G2/G5 핸드오프 OPEN 유지 — Desktop 36904429 재검증 대기.
> 2026-05-28 **crawl_logs INSERT await 누락 dangling promise 수정 (G1 Tier-2 회귀)** (Code turn, 2 파일 +8/-5, commit 6f8e9f8). desc.contents fix(d2f5d6e) 후 36904429 크롤은 200이나 crawl_logs row 0건. INSERT가 await 없는 fire-and-forget(`prisma.$executeRaw...catch`) -> 응답 반환 직후 serverless freeze로 promise 미완료 폐기 = 소싱 보관함 동선 단절 P1. domemae/route.ts 단건 + stream/route.ts bulk(성공/에러) 3개 INSERT 모두 await 추가(.catch 유지 -> 블로킹 0). TSC 0 / build 0 / verify-vercel exit 0. 핸드오프 OPEN 유지 — Desktop 동일 36904429로 G1 Tier-2(DB row) 재검증 대기.
> 2026-05-28 **크롤러 desc.contents 빈 객체 TypeError 근본 수정 (G1 회귀)** (Code turn, 1 파일 +7/-4, commit d2f5d6e). 도매꾹이 상세 본문 없을 때 desc.contents를 '' 아닌 빈 객체 {}로 직렬화 -> nullish 가드 통과 -> stripHtmlToText({}).replace TypeError. 재현: 36904429(아이스트레이). 상세 HTML 없는 모든 도매꾹 상품 크롤링 100% 실패 = P0. Fix A(추출 타입가드) + Fix B(extractGalleryImages/stripHtmlToText 헬퍼 가드 강화) + Fix C(title String() 강제). TSC 0 / build 0 / verify-vercel exit 0. 핸드오프 OPEN 유지 — Desktop 동일 36904429로 G1 재검증 대기.
> 최종 업데이트: 2026-05-27 PM **B-13a PLANT 페이지 상단 헤더 중복 등록 버튼 제거** (Code turn, 1 파일 -14줄, B-13 직속 후속). page.tsx line 1792-1805에 "네이버 직접 등록" + "네이버 엑셀 다운로드" 버튼이 페이지 상단 헤더(진행률 옆)에 *별도 인스턴스*로 존재해 7개 탭 전부에서 노출되던 회귀 해소. visual 탭 안 인스턴스(line 3431+3442)만 유지 -> 등록 액션은 비주얼 자동화 탭(마지막 단계)에서만 노출 보장. Chrome MCP 실측 evidence: pre-state totalRegisterButtons=2 (header+bottom), post-state 목표=1 (visual 탭에서만). 핸들러 grep 카운트: handleNaverDirect 3->2, handleGenerate 4->3(line 817 주석 1건 비-functional 포함). 5-19 진단이 하단 블록만 식별하고 헤더 dup을 놓친 *cascade miss*를 b6ce4bb 재검증 중 발견.
> 2026-05-27 PM **B-13 PLANT 비주얼탭 액션블록 스코프 정합** (Code turn, 1 파일 +3/-3, commit b6ce4bb). visual 탭 종료 `</>)}` 위치를 line 3401 -> 하단 버튼 `</div>` 직후로 이동. autoRunVisual 체크박스 + 등록/엑셀 버튼이 7탭 전부 노출되던 회귀 해소.
> 2026-05-27 PM **B-12 네이버 등록 라우트 근본 재작성 + B-11 저장배관 DB UPDATE** (Code turn, 2 파일 +186/-50, commit f244a48). categoryMap 폐기 + naverRequest OAuth2 위임 + 거짓 라벨 0 + detail_image_url 본문 포함 + save-assets DB UPDATE 추가.
> 2026-05-27 명화송풍구 **B-11 저장배관 우회 완주** (상세 PNG 186KB Storage 업로드 + Product main/detail_image_url DB 기록, DB 3중 검증 통과 — Desktop turn, 코드변경 0). **B-12 (치명) 발견 -> 본 commit으로 근본 해소**.
> 2026-05-27 명화송풍구 이미지 보강(330px->화보 4종컷 1000px) + margin 교정(B-7 50.69->2.03) -> 진단 L4->L2 도달 (Desktop turn, 코드 변경 0 / Supabase 직접 UPDATE 2건).
> 2026-05-27 B-4 진단 API 504 근본 복구 (Code turn, 5 파일 + docs 4건). Desktop 검증 완료 — production 진단 200/정상.
> 2026-05-26 DB P1000 복구 + Studio 클릭 버그(B-1) 수정 + B-2 빈 outputs guard (Code turn, 6 컴포넌트 + 1 hook + docs 4건)
> **v3.2 신규 채택 (2026-05-21)**: P-Filter 전처리 모듈 + 다크패턴 lint + 단일 캔버스 인라인 마법사 + 4등급 한글 라벨(기본 자동화/검토 후 자동화/디자이너 손길 필요/완전 수동). 참고: `docs/research/KKOTIUM_GARDEN_V3_2_MASTER_PLAN_2026_05.md` (commit 795fdf8) + `docs/research/DARK_PATTERN_LINT_MODULE_DESIGN.md` (본 commit)
> **신규 우선순위 (시니어 권장)**: ① Sprint 7-M3 Pre-Step 5 (다크패턴 lint, 0.5일, 법적 의무 최우선) → ② Sprint 8-PF (P-Filter 전처리, 2일) → ③ Sprint 9-Sec (RLS + anon key 점검, 1.5일) → ④ Sprint 7-M2 Step 5 (L2 자동화, P-Filter 통합 재설계, 2일) → ⑤ Sprint 10-WIZ (단일 캔버스 마법사 MVP, 5일)
> 활성 계획: Sprint 8-IA Phase 2 (Section 1 Hero / Section 2 Inbox 통합 / 빌더 흡수 / lifestyle 가시화 / 통일성, 4.5일) — 새 채팅 2 진입 대기
> 보류 계획: Smart Asset Workflow v3.1 FINAL 후속 (Phase 2-c-3 / Sprint 7-M3) / Sprint 8 자동발주 (Private API 28권한 보유, 매출 상승 트리거)
> 폐기 계획: Sprint X (Gemini 제거 + 5섹션 일괄 템플릿, 2026-05-11 채택 후 익일 폐기)
> TSC: 0 errors | npm run build OK | Production: https://kkotium-garden.vercel.app (✅ 2026-05-26 복구 완료). **DB P1000 복구**: 이전 Supabase 비번 리셋이 실제 미저장이었음 (Vercel ENV는 정상) → 동일값 재리셋으로 /api/products 200 복구 (재배포 불필요). **B-1 Studio 클릭 버그 수정**: Phase 3-C-1 6 컴포넌트 `'use client'` 누락 → 본 commit으로 추가. B-2 빈 outputs silent fail guard 동시 적용.
> **신규 진입점**: `docs/plan/TASK_BRIDGE.md` §3 ACTIVE = Sprint 8-IA Phase 2 진입 대기. §4 STANDING / §6 PENDING 매 세션 정독 의무. 작업원칙 #46 (거짓 라벨 금지) 적용 중
> 다음 작업: 새 채팅 2 진입 = Sprint 8-IA Phase 2 (Task 6-12, 4.5일). ROADMAP.md "다음 새 채팅 시작 메시지" ⭐ ACTIVE 정독 후 paste-ready 메시지로 새 채팅 진입.

> **시각 검증 (Production smoke + Functional + 브라우저 E2E — Sprint 7 P1 단계)**: production smoke 모든 endpoint 200 ✅ / P1-A `/api/category/suggest`: 레깅스→`applied:"agreed"` dominantShare=1.0, 인테리어 소품→`applied:"synthesized"` dominantShare=0.8 ✅ / P1-C `/api/tags/verify`: 레깅스/요가복/면팬티 verified, garbage→weak (threshold fix 후) ✅ / **브라우저 E2E (Claude Preview)**: P1-B NameRulesPanel 3 시나리오 모두 정확 발화 (금기어 5개+중복 가을×3 critical red / 특수문자 4종 warning yellow / 정상 → 패널 미노출) ✅ + P1-A 카테고리 자동 추천 버튼 → 패션의류>여성언더웨어/잠옷>잠옷/홈웨어 자동 입력 ✅ + P1-C TagVerificationPanel 3개 태그 입력 → "SEO 유효 2 / 약함 1 / 미등재 0" 정확 분류 ✅
> **상품 상태**: 1개 DRAFT (달항아리 도어벨 cmp3afb450001gng5468w0qpc, 이현마켓/DMM. B-3 카테고리/판매가 보정 대기) / **꿀통 꽃수레**: 0개 / **Platform**: DMM 도매매 + OWC 오너클랜 2개
> **단계 진행도**: Phase A·B·C·D ✅ | Phase E (E-7/E-1/E-3/E-8) ✅ | Phase E+ Sprint 1~5 ✅ | 워크플로우 재설계 Sprint A1a~A3-4a ✅ | Z-1·Z-2·Z-3a·Z-3b·Z-3d ✅ | 6-Pre 1·2·3 ✅ | 6.5 SourceAdapter PoC ✅ | 6-D 1-5단계 + production active ✅ | 6-A/6-B/6-C/6-E ✅ | Session E-2 Phase 1~5 ✅ | Sprint 7 P0 (P0-A 옵션 정확도 + P0-B 골든윈도우 + P0-C 효자상품 + DataLab market context) ✅ | **Sprint 7 P1 (P1-A 카테고리 1페이지 + P1-B 금기어 + P1-C 태그사전) ✅ + 브라우저 E2E 시각 검증 완료 ✅**
> **Private API 발급 완료**: 28개 전체 권한 발급 ✅ (구매용 6 + 판매용 13 + 공통 3 + 기타 6) — Sprint 8 자동발주는 매출 상승 + 운영 흐름에 따라 진입 (보류 트랙)
> **다음 작업**: Desktop Chrome MCP로 B-1 수정 실클릭 재검증 → 통과 시 B-3 (달항아리 도어벨 데이터 보정) → Sprint 7-M2 Phase 3-C-2 (PLANT /products/new 6→7 tab 확장 + savedProductId 컨텍스트 전달). 본 turn (Code): 6 컴포넌트 `'use client'` 추가 + useStudioActions.runThumbnail 빈 outputs guard. tsc 0 + build 0. 상세 근거: `docs/handoff/HANDOFF_studio_click_bug.md`.
> **참고 문서**: `docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md` (v3.1 영구 참조), `docs/research/KKOTIUM_V2_ARCHITECTURE_2026_05.md` (v2.0 이력 참조), `docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md`

---

## 2026-05-27 PM B-13a PLANT 페이지 상단 헤더 중복 등록 버튼 제거 (Code turn, B-13 직속 후속)

### 본 turn 성격

B-13 commit b6ce4bb production 재검증 중 Desktop Chrome MCP가 발견한 *잔존 회귀 1건* 1-commit 해소. 5-19 진단이 하단 액션블록만 식별하고 페이지 상단 헤더의 동일 버튼 인스턴스(line 1793-1804)를 놓친 cascade miss. b6ce4bb 하단 정합 직후 production 실측에서 식별 -> 본 commit으로 영구 차단.

### 코드 변경 (1 파일 -14줄)

`src/app/products/new/page.tsx` line 1792-1805 14줄 `<div style={{ display: 'flex', gap: 8 }}>...</div>` 블록 단순 삭제. 내부에 `handleNaverDirect` 버튼 + `handleGenerate` 버튼 2개(헤더 인스턴스). 부모 `flex items-center gap-2` div(line 1771)는 유지 — 진행률 dots + "N/M 완료" 배지는 그대로 보존.

### 핸들러 카운트 검증 (회귀 차단)

| 핸들러 | pre-state | post-state | 위치 |
|---|---|---|---|
| `handleNaverDirect` | 3 (def + header + visual) | **2** (def + visual) | line 1418 (def) + line 3417 (visual onClick) |
| `handleGenerate` | 4 (def + header + visual + comment) | **3** (def + visual + comment) | line 1508 (def) + line 3428 (visual onClick) + line 817 (주석) |

핸들러 functional call site: 양쪽 모두 visual 탭 1곳만 잔존. 헤더 인스턴스 완전 제거.

### Desktop Chrome MCP 실측 evidence (pre-state)

```json
{
  "totalRegisterButtons": 2,
  "instances": [
    { "text": "네이버 직접 등록", "top": 115, "zone": "HEADER (top)" },
    { "text": "네이버 엑셀 다운로드", "top": 115, "zone": "HEADER (top)" }
  ],
  "verdict": "DUPLICATE confirmed: header + bottom"
}
```

[기본] 탭 / [옵션] 탭 양쪽에서 동일 top=115px 위치 노출 확인. post-state 목표: production에서 totalRegisterButtons=0 (visual 탭 외) / =1 (visual 탭 진입 시 하단만).

### 라벨 차이 단정

| 위치 | 직접 등록 라벨 | 엑셀 라벨 |
|---|---|---|
| Header (제거) | `네이버 직접 등록` | `네이버 엑셀 다운로드` |
| Visual tab (잔존) | `네이버 직접 등록 (API)` | `네이버 엑셀 다운로드` |

핸들러는 양쪽 동일(`handleNaverDirect` / `handleGenerate`). 두 인스턴스가 동일 동작을 트리거했으므로 헤더 인스턴스 제거는 *동작 손실 0*.

### 검증

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | 0 errors ✅ |
| `npm run build` | exit 0, `/products/new` 64.2 -> 63.9 kB (-0.3 kB, 14줄 제거 반영) ✅ |
| 한글 typo sentinel grep | 0 hits ✅ |
| SD-01 아랍어 footer 정합 | 조사/수정 0건 (영구 보존) ✅ |

### 적용 작업원칙

#17 · #21 · #24 · #29 (삭제 only, 신규 한글 0) · #32 · #36 · #41 · #45 (실측 evidence 기반) · #46

### 다음 = Desktop 재검증 turn

production `/products/new` 7탭 순회 -> 상단 헤더에 등록/엑셀 버튼 미노출 확인. [비주얼 자동화] 탭(저장 후)에서만 하단 체크박스 + 2개 버튼 노출 유지(B-13 정합 보존) 확인. 통과 시 HANDOFF_plant_header_duplicate_buttons §7 ARCHIVED.

Commit: 본 commit hash로 갱신 예정

---

## 2026-05-27 PM B-13 PLANT 비주얼탭 액션블록 스코프 정합 (Code turn, 1 파일 +3/-3)

### 본 turn 성격

Desktop이 Chrome MCP + Filesystem read로 실측한 정정 진단(`docs/handoff/HANDOFF_atelier_routing_plant_checkbox_2026-05-27.md`) 수신 후 단일 결함 해소. 5-19 진단의 작업1(`/atelier` 404)·작업2(7번째 탭)는 *실 코드에 이미 반영 완료*로 폐기 단정 — 남은 결함은 단 1건(체크박스+하단 버튼 블록이 visual 탭 조건문 *밖*에 위치 -> 7탭 전부 노출).

### 코드 변경 (1 파일 +3/-3)

`src/app/products/new/page.tsx` — 2 edit:

| Edit | 위치 | 변경 |
|---|---|---|
| 1 | line 3401 | visual 탭 종료 `</>)}` *제거* + 하단 버튼 시작 주석을 영어로 (`{/* Action block — registration step (visual tab only) */}`) 격상. 들여쓰기 0 -> 12-space 정합 |
| 2 | line 3447 (하단 버튼 `</div>` 직후) | visual 탭 종료 `</>)}` *삽입*. tab content end (`</div>{/* tab content end */}`) + 좌측 끝 div 정합 유지 |

결과: 액션블록(autoRunVisual 체크박스 + 네이버 직접 등록 버튼 + 엑셀 다운로드 버튼) 전체가 `activeTab === 'visual'` 조건 안으로 흡수. 등록 액션은 *마지막 단계(비주얼 자동화 탭)에서만* 노출.

### Desktop 실측 진단 정정 (작업원칙 #44 stale fact 직접 사례)

| 원래 5-19 지시 | 실측 결과 | 본 turn 판정 |
|---|---|---|
| 작업1 `/atelier` 404 -> Sidebar link 교체 | Sidebar.tsx line 159 이미 `'/studio'` 연결. `/atelier` 링크는 코드에 *존재하지 않음*. production 404는 URL 직접입력 시에만 발생, 메뉴 클릭은 정상 | **폐기 — 수정 불필요** |
| 작업2-a 7번째 "비주얼 자동화" 탭 정합 | activeTab 타입에 'visual' 포함(line 454), 7번째 패널 존재(line 3386), savedProductId 가드 작동 | **이미 완료** |
| 작업2-b 체크박스 visual 탭만 노출 | 블록이 조건문 *밖*(line 3403~3447), 7탭 전부 노출 (production 실측 확인) | **본 commit으로 해소** |

PROGRESS.md 2026-05-15 Phase 3-C-3 entry의 "체크박스 위치: 페이지 하단(공통) -> 네이버 직접 등록 버튼 바로 위에만" 기록이 코드 실제와 불일치였던 상태(작업원칙 #44 stale fact). 본 commit으로 코드를 문서 의도에 맞게 정렬.

### 작업2 (선택, 대표 결정 보류)

`/atelier -> /studio` 방어적 redirect 추가는 대표 결정 사항이라 본 turn 범위 외. 메뉴 동선 정상이므로 필수 아님 (북마크/외부 링크 대비 시 next.config.js redirects() 권장).

### 검증

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | 0 errors ✅ |
| `npm run build` | exit 0, `/products/new` 64.2 kB (변경 0, JSX 블록 이동) ✅ |
| 한글 typo sentinel grep | 0 hits ✅ |
| SD-01 아랍어 footer 정합 | 조사/수정 0건 (영구 보존) ✅ |

### Desktop 재검증 신호 (push 후)

1. production `/products/new` 진입 -> [기본]/[옵션]/[이미지]/[배송]/[SEO]/[혜택] 6탭에서 **체크박스 미노출** 확인
2. [비주얼 자동화] 탭(임시저장 후 unlock)에서만 **체크박스 + 2개 버튼 노출** 확인
3. (선택) /atelier 직접입력 -> 사용자 결정에 따라 redirect 추가 시 301 확인

### 적용 작업원칙

#17 (commit-msg.tmp via git commit -F) · #21 (사전 점검) · #24 (한 turn 분할 완료) · #29 (한글 처리, JSX 블록 이동이라 신규 한글 0) · #32 (TSC + build 양쪽) · #36 (push 후 verify-vercel-deploy.sh --wait) · #41 (TASK_BRIDGE §3 ACTIVE 갱신) · **#44 (stale fact 직접 해소 사례)** · #46 (거짓 진행 보고 금지)

### 다음 = Desktop 재검증 turn

본 commit production 반영 후 Desktop이 Chrome MCP로 6탭 체크박스 미노출 + visual 탭만 노출 재검증. 통과 시 핸드오프 §7 ARCHIVED 이전.

Commit: 본 commit hash로 갱신 예정

---

## 2026-05-27 PM B-12 네이버 등록 라우트 근본 재작성 + B-11 저장배관 DB UPDATE (Code turn)

### 본 turn 성격

2026-05-27 Desktop turn(이미지 보강 + margin 교정 + B-11 우회 완주)에서 명화송풍구 등록 직전 발견된 B-12(register 라우트 구조결함)를 Code 환경에서 근본 수정. B-11 저장배관의 진짜 누락분(Product URL 컬럼 DB UPDATE)도 동시 처리. 코드 2 파일 +186/-50, TSC 0 + build OK. 실 네이버 발행은 비가역이므로 본 turn 범위 외 — 대표 승인 후 별도 turn에서 Desktop이 등록 완주.

### B-12 4-함정 동시 해소 (`src/app/api/naver/register/route.ts` 전면 재작성)

| # | 함정 | 이전 | 수정 후 |
|---|---|---|---|
| 1 | 카테고리 | `categoryMap` 하드코딩 7종(의류 위주). 매칭 실패 시 `50000006`(의류) silent fallback | `product.naverCategoryCode` 직접 사용. 빈 값/공백이면 422 차단(의류 fallback 폐기) |
| 2 | 거짓 라벨(#46) | API 실패해도 `status='registered'` + `PENDING_`/`ERROR_`/`MOCK_` 가짜 naverProductId 3곳 주입 | 실패는 실패: 502 반환 + status/naverProductId 미변경. 성공 시에만 mutate |
| 3 | 상세 본문 | `detailContent = product.description \|\| product.name` (텍스트만) | `buildDetailContent`로 `hookPhrase + <img src="${detail_image_url}"> + description` 조합 — Desktop이 B-11로 살려둔 186KB 상세 PNG가 본문에 포함됨 |
| 4 | 인증 | `X-Naver-Client-Id`/`X-Naver-Client-Secret` 직접 헤더 (구 검색 API 방식) | `naverRequest('POST', '/v2/products', payload)` 위임 — Commerce API용 OAuth2 client_credentials + bcrypt 전자서명 + Bearer 토큰. proxy mode/direct mode 양쪽 자동 분기. 다른 가동 라우트(`/api/naver/sync`, `/api/cron/inventory-sync` 등) 동일 경로 |

### B-12 추가 단정 (스코프 외 함정 차단)

- Supabase client 의존성 제거 -> `prisma` singleton 통일 (#3-2)
- `salePrice <= 0` 게이트 추가 (Gate 3)
- `mainImage` 게이트 추가 (Gate 2)
- `originCode` 빈 값 fallback `0200037`(중국 7자리) 유지. `naver_origin` 텍스트는 있으면 `content` 동봉
- Commerce API v2 정합: `leafCategoryId` + `images.representativeImage` + `deliveryFee.deliveryFeeType: 'PAID' | 'FREE'`(`'CHARGE'` 폐기) + `originAreaInfo` shape

### B-11 저장배관 진짜 누락분 (`src/app/api/products/[id]/save-assets/route.ts`)

Desktop turn에서 "B-11 우회 완주"는 *Storage 업로드는 됐지만 Product 테이블 URL 컬럼은 페이지내 fetch + Supabase 직접 UPDATE로 우회 기록*한 상태. 본 commit으로 라우트 자체가 Storage 업로드 200 직후 `prisma.product.update({ main_image_url, detail_image_url })`를 자동 수행하도록 추가. 한쪽만 성공해도 해당 컬럼만 갱신(spread guard). DB update 실패는 errors 배열에 누적되되 응답 status 200 보존(부분 성공 정합).

§3-2(studio 프론트 detailBase64 전송) 단정: 코드 정독 결과 `useStudioActions.runSave`는 이미 `detail` state 존재 시 `detailBase64 + skeletonId`를 페이로드에 동봉함(line 268-271). 실제 누락은 `runFullSequence` autorun 경로에서 detail 카드를 *opt-in으로 skip*하는 설계(Phase 3-C-3 의도적 결정, heavy Sharp 5000~7000px 합성)와 manual 흐름에서 사용자가 detail 카드를 클릭하기 전에 save를 누를 때 발생. **본 turn은 autorun 의미 변경을 별도 결정 사항으로 보류**하고, B-11 §3-1(라우트 측 DB UPDATE)만 적용 -> 사용자가 detail 카드를 명시적으로 실행한 후 save를 누르면 DB URL이 자동 기록됨.

### 검증

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | 0 errors ✅ |
| `npm run build` | exit 0 / `/api/naver/register` ƒ Dynamic 유지 / `/api/products/[id]/save-assets` ƒ Dynamic 유지 ✅ |
| 한글 typo sentinel grep | 0 hits ✅ |
| 한글 inline 주석 | 0건 (영어 주석만, #3-1 정합) ✅ |
| Prisma singleton | `import { prisma } from '@/lib/prisma'` 양쪽 사용 (`new PrismaClient()` 0건) ✅ |
| `categoryMap` 잔존 | 0 references (grep 0) ✅ |
| `PENDING_`/`ERROR_`/`MOCK_` 가짜 ID 주입 | 0 references ✅ |

### 보류(의도적) — 실 네이버 발행

본 turn은 **코드 수정 + 빌드 + Vercel 배포까지만**. 실제 명화송풍구를 네이버 스마트스토어에 발행하는 호출(`POST /api/naver/register`)은 비가역(스토어에 노출 + 광고비 발생)이므로 대표 승인 후 별도 Desktop turn에서:
1. /products?id=cmpnooli40001f0gveaxr8iim 진입
2. (선택) 썸네일/상세 보강 — main_image_url + detail_image_url 모두 살아있음으로 skip 가능
3. "네이버 직접 등록" 클릭 -> 본 commit의 새 라우트 호출
4. 응답 `success: true` + `naverProductId` 실제 값 검증 (PENDING_/ERROR_/MOCK_ 패턴 0)
5. 스마트스토어 실 노출 + DB row `naverProductId IS NOT NULL` cross-check

### 적용 작업원칙

#17 (commit-msg.tmp via `git commit -F`) · #21 (사전 점검 HEAD/status/stash) · #24 (한 turn 분할 완료) · #29 (한글 처리 — 코드 inline 한글 0) · #32 (TSC + npm build 양쪽 검증) · #36 (push 후 verify-vercel-deploy.sh --wait) · #41 (TASK_BRIDGE §3 ACTIVE 갱신) · #45 (3-tier 검증: 빌드 + 라우트 등록 + sentinel) · #46 (거짓 라벨 금지 — 본 turn 직접 해소 사례)

### 다음 = Desktop 등록 완주 turn

대표 승인 후 새 Desktop 채팅 진입 -> ROADMAP.md "다음 새 채팅 시작 메시지" ⭐ ACTIVE 정독 -> 명화송풍구 + 하트클립 순차 발행.

Commit: 본 commit hash로 갱신 예정

---

## 2026-05-20 Sprint 8-IA Phase 1 완료 (Code turn, 코드 2 신규 + 1 수정 + docs)

### 본 turn 성격

새 채팅 1 진입. Sprint 8-IA Phase 1 (Task 1-5) 본 Code 측 build + ship. Task 1·2·3 은 직전 commit `db72408` 에 적용 완료된 상태로 hand-off 수신 → 본 turn 은 **Task 4 (SystemHealthCard + /api/system-health)** 작성 + **Task 5 (production smoke 검증)** + docs 갱신.

### 코드 변경 (1 commit, +517 LOC)

| 파일 | 변경 | LOC |
|---|---|---|
| `src/app/api/system-health/route.ts` | 신규 — 8 registry × 4 신호 (InventorySnapshot.polledAt / CategoryTrendCache.refreshedAt / DomeCategory.refreshedAt / Discord env) → HealthItem[] 변환. stale factor 1.5 적용 | +189 |
| `src/components/dashboard/SystemHealthCard.tsx` | 신규 — 'use client' 카드. 60s polling + window focus revalidate. status 4종(success/warning/failed/pending) 색상 매핑. Lucide 아이콘만 사용 | +293 |
| `src/app/dashboard/page.tsx` | Section 3 가든 헬스 상단에 `<SystemHealthCard />` 마운트 (기존 3-카드 grid 위) | +20 / -15 |

**Commit**: `12495cf` `feat(dashboard): Sprint 8-IA Phase 1 Task 4 — SystemHealthCard + /api/system-health`

### Hand-off 정합 보정

- **DB schema 단정**: handoff 명세는 `AutomationLog` 테이블 전제였으나 schema 실 조사 결과 해당 테이블 부재 → 실제 가용 시그널 (InventorySnapshot / CategoryTrendCache / DomeCategory / Discord env) 만 사용. *작업원칙 #46 (d) 그대로 — fetch 결과 기반만, hardcoded 정상 금지.*
- **Registry ID 단정**: handoff 예시 (price-watch, supplier-status, honey-pot-discovery, kkotti-ai-recommend, auto-order, image-pipeline, discord-notify) 와 실 registry 다름. 실 registry 가 source of truth → 실제 8 entry (inventory-poll / good-service-track / discord-kkotti-recommend / discord-stock-alert / discord-kkotti-score / discord-ops-report / cron-daily / cron-weekly) 그대로 매핑.
- **Branch 단정**: 세션 진입 시 `feature/sprint-7-m2-smart-asset-workflow` 에 있었음 (2 commits ahead with Sprint 7-M2 Step 1+2). Handoff 명시 (`Branch: main`) 따라 `git checkout main` 후 db72408 baseline 기준 작업. Sprint 7-M2 feature branch 는 origin 에 보존 — 별도 작업으로 진행 예정.
- **Section 단정**: handoff 의 "Section 5 신설" 은 실 dashboard 구조 (Section 1-5 이미 사용 중, Section 5 = collapsed 더보기) 와 불일치 → 의미 정합 best fit = Section 3 가든 헬스 *상단* 에 마운트 (3-카드 grid 위). 기존 IA 보존.

### 검증 (V1~V6)

| 항목 | 결과 |
|---|---|
| V1 (사이드바 demote) | ✅ Task 1-3 직전 commit `db72408` 에 적용됨 (registry route + sidebar manifest 갱신). 본 turn baseline 정합. |
| V2 (`/admin/automation` 200) | ✅ HTTP 200 |
| V3 (registry 8 카드) | ✅ `/api/automation/registry` total=8, 모두 status=active |
| V4 (Section 3 SystemHealthCard) | ✅ `/dashboard` HTTP 200 + `SystemHealthCard` mount (client-rendered) |
| V5 (`/api/system-health` 200 + 8 items) | ✅ HTTP 200, summary={healthy: 4, total: 8}, items.length=8, 한글 displayName 그대로 |
| V6 (Console 0 errors / 0 깨짐) | ⚠️ 본 환경에서 브라우저 세션 미가용 (curl HTML structure 까지만 단정). Desktop Chrome MCP 검증 의무 — TASK_BRIDGE §3 ACTIVE 의 검증 신호로 이관. |

**Production 응답 evidence** (`/api/system-health`):
- inventory-poll: status=pending, 첫 폴 대기
- cron-daily: status=warning, lastRunAt 42시간 전 (stale factor 1.5×24 초과)
- 4 discord-*: status=success (webhook env 모두 설정됨)
- good-service-track / cron-weekly: status=pending (DomeCategory 미수확)
→ summary 4/8 정상 = 실 가동 상태 정확 반영 (#46 (d) 통과).

### 빌드 / Vercel 검증

- `npx tsc --noEmit` → 0 errors ✅
- `npm run build` → exit 0 ✅
- `git push origin main` → 12495cf push 성공 ✅
- `scripts/verify-vercel-deploy.sh --wait` → exit 0 (production READY = 12495cf) ✅

### 적용 작업원칙

#17 (commit-msg.tmp + git commit -F) · #21 (사전 점검 HEAD/status) · #24 (한 turn 분할 완료) · #29 (한글 처리) · #31 (MD 1500줄 임계 — SESSION_LOG 920줄, 분할 불필요) · #32 (TSC ≠ Production 빌드) · #36 (verify-vercel-deploy.sh --wait) · #41 (두 환경 핑퐁 ledger) · #46 (거짓 라벨 금지 — pending/warning/success 실 신호 기반)

### 다음 = 새 채팅 2 진입 (Sprint 8-IA Phase 2)

Task 6-12, 4.5일 추정. Section 1 Hero 행동필요도 알고리즘 → Section 2 Inbox 6 위젯 흡수 → Section 3-4 KPI/Pipeline 재구성 → 빌더 흡수 (블록 6종 → S1~S12 인라인 편집) → lifestyle 가시화 → 통일성 (디자인 토큰).

---

## 2026-05-19 PM Sprint 8-IA 진입 결정 + IA 재설계 (Desktop turn, docs only)

### 본 turn 성격

Desktop이 Chrome MCP로 /automation + /studio + /settings/lifestyle-assets + /products/new 4 화면 시각 점검 → 자동화 관제 페이지의 *17/26 = 65% 가짜 라벨 발견* + 빌더↔renderer 충돌 + lifestyle 연결 부재 진단. 사용자 Q1·Q2·Q3 권장안 모두 승인 → Sprint 8-IA 신설 + Phase 1/2 분할 + 작업원칙 #46 명문화. 본 turn은 docs only, 코드 변경 0건.

### 진단 핵심 (작업원칙 #46 직접 발화 사례)

자동화 관제 페이지가 "정상 17"으로 표시 → 실 cron 가동은 3건뿐 (재고폴링 + 일배치 + 주배치). 14개는 Sprint 6-B/6-C/Sprint 8/9 미작성 작업 라벨만 사전 배치. 파워셀러 시각으로 *작동하지 않는 기능이 정상으로 표시되는 것이 가장 큰 신뢰 리스크*.

근본 원인: registry를 *모니터링 도구*가 아닌 *미래 작업 등록 지점*으로 사용. 결과적으로 미구현을 정상으로 위장. 작업원칙 #46으로 영구 차단:

| 규칙 | 강제 |
|---|---|
| (a) registry 등재 = 실 가동 단정 후만 | 코드 + 1회 실 실행 + 메트릭 endpoint 3 조건 통과 |
| (b) 미가동 작업은 SPRINT_PLAN.md / ROADMAP.md만 | registry/UI 진입 금지 |
| (c) 사용자 UI에서 "준비"/"대기"/"보류" 금지 | 관리자 영역(`/admin/*`)에서만 허용 |
| (d) 상태 라벨은 fetch 결과 기반만 | hardcoded "정상" 금지 |
| (e) 신규 자동화 commit = registry entry 동시 commit | 분리 시 gap 동안 가짜 라벨 |

### Sprint 8-IA 신설 (2 채팅 분할)

**Phase 1 (새 채팅 1, 1.5일) — 자동화 관제 강등 + 대시보드 Section 5**:
- Task 1: 사이드바 "자동화 관제" 항목 제거 (5분)
- Task 2: /automation → /admin/automation 이동 + 관리자 배지 (30분)
- Task 3: automation-registry 26→8 entry 축소 (30분)
- Task 4: 대시보드 Section 5 "정원 점검" 카드 신설 (1일)
- Task 5: 브라우저 통합 검증 + commit + push (30분)

**Phase 2 (새 채팅 2, 4.5일) — 통합 + 빌더 흡수**:
- Task 6: Section 1 Hero 진화 (행동필요도 알고리즘)
- Task 7: Section 2 Inbox 통합 (6 위젯 흡수)
- Task 8: Section 3-4 KPI/Pipeline 카드
- Task 9: /studio ↔ PLANT 7th 탭 목적 명확화
- Task 10: 상세페이지 빌더 흡수 (블록 6종 → S1~S12 골격 내 인라인 편집)
- Task 11: lifestyle-picker 연결 가시화 (자산 카드 + 변형 메타)
- Task 12: 시각적 통일성 (공통 디자인 토큰)

### Turn 1 (직전, 본 turn baseline)

Hash `1a96d2a` (origin/main 정합). 3 commit 적용:
- `049bf7e` TASK_BRIDGE.md §3/§4/§5/§7 갱신
- `af6097b` PRINCIPLES_LEARNED.md #46 신설
- `1a96d2a` SPRINT_PLAN.md Sprint 8-IA 신설 (Phase 1 + Phase 2)

### Turn 2 (본 turn, docs only 3 commit)

- PROGRESS.md (헤더 갱신 + 본 entry prepend) ← 본 commit
- ROADMAP.md (헤더 갱신 + ACTIVE handoff 교체)
- SESSION_LOG.md (본 entry prepend)

### 검증

- TSC 변경 0 (docs only) ✅
- npm run build 영향 0 (baseline 86fdd10 동일) ✅
- 한글 sentinel grep 0 typos ✅
- Vercel production 200 ✅ (turn 2는 docs only, deploy 영향 0)
- 작업원칙 적용: #17, #21, #29, #31, #35, #36, #41, #46

### 다음 = 새 채팅 1 진입 (Sprint 8-IA Phase 1)

ROADMAP.md "다음 새 채팅 시작 메시지" ⭐ ACTIVE에 paste-ready 메시지 작성됨. 사용자가 새 채팅 첫 입력으로 paste → 5 Task 순차 진행 → Phase 1 검증 통과 후 새 채팅 2 (Phase 2) 진입.

Commit: 본 commit hash로 갱신 예정

---

## 2026-05-19 Sprint 7-PC-B + TASK_BRIDGE.md hand-off layer 도입 (작업원칙 #41)

### 진행 현황 — Sprint 7-PC 5 commits 완결

PC-A → PC-B-2까지 완주, 22-paper-cut 중 5건 해소:

| Phase | Commit | scope |
|---|---|---|
| pre-sprint cleanup | `91a1eef` | SESSION_LOG 7차 split + paper-cut #1 entry |
| PC-A v1 | `9ae0673` | handleNaverDirect 6-check + P1 prefill banner |
| PC-A hotfix | `742ce91` | RC1 3-depth fallback + RC2 useEffect race + suggest 검증 |
| PC-B-1 | `5a3b8c2` | P18 dome_code passthrough + P14 defensive (truncation 회귀 0 확정) |
| PC-B-2 | `29b7c49` | P15 옵션명 keyword rule + P17 supplier-notfound 배송 fallback |

해소 paper-cut: P1, P2, P14, P15, P18. 잔여: P16(crawler), P17(실 검증), P19, P20, P13-A~E (PC-C scope).

### TASK_BRIDGE.md hand-off layer 도입

5 commits 모두 Desktop ↔ Code 핑퐁으로 진행됐음 — 본 패턴을 작업원칙 #41로 명문화 + `docs/plan/TASK_BRIDGE.md` 신규 ledger 도입.

| 측면 | 🖥 Desktop | 💻 Code |
|---|---|---|
| 강점 | Supabase / Vercel / Chrome / image-search MCP | Filesystem(write) / Bash / Git / TSC |
| 주특기 | 리서치 · 검증 · paste-ready 본문 | 코드 작성 · MD 실 적용 · git push |
| 할 수 없는 것 | MD edit · git commit | Chrome / Supabase / Vercel MCP 직접 호출 |

5-step 표준 hand-off (FROM/TO/BASELINE/SCOPE/VERIFICATION/FALLBACK), §3 ACTIVE 매 hand-off 갱신 의무.

### 변경 파일

- `docs/plan/TASK_BRIDGE.md` — NEW (~190 줄)
- `docs/plan/PRINCIPLES_LEARNED.md` — 작업원칙 #41 추가 (#26~#40 → #26~#41)
- `CLAUDE.md` — STEP 1 4번째 정독 항목 추가 + 핵심 파일 경로 갱신 + 작업원칙 빠른 인덱스 #37~#41 갱신
- `docs/plan/PROGRESS.md` — 본 entry (헤더 + 신규 섹션)
- `docs/plan/ROADMAP.md` — 헤더 갱신
- `docs/plan/SESSION_LOG.md` — 본 entry 신규

### 검증

- TSC 0 errors (MD/문서 only, code 변경 0) ✅
- npm run build OK (baseline 29b7c49 동일) ✅
- 한글 sentinel grep 0 typos ✅
- 작업원칙 적용: #17, #21, #29, #31, #32, #36, #41

### 다음

- PENDING USER ACTIONS (TASK_BRIDGE §6):
  - 디퓨저 dome_code seed 진행 의사 — Desktop이 5분 이내 Supabase INSERT + Chrome 검증
  - P20 supplier seller ID 확인 (이현마켓 / gseller2022)
  - P16 scope 결정 (PC-B-3 포함 or PC-D 분리)
- 사용자 결정 후 PC-B-3 진입 (P19 + P16 결정)

Commit: 본 commit hash로 갱신 예정

---

## 2026-05-17 paper-cut #1 — Studio hydration order fix

### 발견 + 수정
- 직전 채팅에서 Studio 페이지 hydration mismatch 1건 발견 → commit 48b50fa로 수정
- 영향 영역: /studio 최초 마운트 시 server/client state 불일치
- 검증: production verified ✅

### 단정
- 본 paper-cut은 Sprint 7-PC와 무관한 직전 hotfix
- Sprint 7-PC 진입 baseline = 48b50fa

Commit: 48b50fa

---

## 2026-05-15 PM Sprint 7-M2 Phase 2-c-2 — lifestyle assets admin UI (CRUD + Sidebar entry)

직전 Phase 2-c-1 (6646a31 + fc8a62e docs) 완료 후 사용자 "다음작업 진행" 자율 위임. **Phase 2-c trio 완결** — picker library (2-c-1) + admin UI (본 phase) → 사용자가 Phase 1 Claude Web Firefly export 등을 즉시 등록 가능.

본 turn 작업 (7 파일 +714/-6):

- **`src/lib/storage/automation-storage.ts`** (+74) — `uploadLifestyleAsset` + `deleteLifestyleAsset` 헬퍼. 같은 `product-assets` bucket + `lifestyle/{assetId}.{ext}` prefix
- **`src/app/api/lifestyle-assets/route.ts`** (NEW, 165 LOC) — GET (list 200) + POST (multipart upload + Sharp metadata + DB insert + rollback on DB failure)
- **`src/app/api/lifestyle-assets/[id]/route.ts`** (NEW, 60 LOC) — DELETE (storage cleanup best-effort + DB row 제거)
- **`src/lib/i18n/lifestyle-assets-strings.ko.json`** (NEW, 46 strings) — page/stats/upload/list/errors
- **`src/app/settings/lifestyle-assets/page.tsx`** (NEW, 305 LOC) — 2-col layout (좌 upload form 380px + 우 16:9 카드 grid 280px+), stats chips, cooldown 상태 표시, delete with confirm guard
- **`src/components/layout/Sidebar.tsx`** (+5/-2) — TOOLS 섹션 6번째 entry "라이프 자산" + Images icon
- **`scripts/verify-korean-dict.py`** (+1) — DEFAULTS에 lifestyle-assets-strings.ko.json 추가

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build OK (`/api/lifestyle-assets` × 2 dynamic + `/settings/lifestyle-assets` static 5.28 kB) ✅
- dict 99+178+105+46 strings, 0 typo ✅
- sentinel grep 0건 ✅
- production smoke: GET /api/lifestyle-assets 200 (assets:[]) + /settings/lifestyle-assets 200 ✅

Phase 2-c trio 완결 회고:
- 2-c-1 (6646a31) — picker library + route 통합
- 2-c-2 (a0cdb05) — admin UI + CRUD API
- 2-c-3 (미정) — (선택) 벌크 import + 태그 추천

다음 (병행 가능):
- **A. 첫 실 상품 등록** (autoRunVisual 검증) — ROADMAP active 그대로
- **B. lifestyle 자산 시딩** (Phase 1 Claude Web Firefly → admin UI 업로드) — 첫 자산 1건만 있어도 picker 활성화

Commit: `a0cdb05` feat(automation): Phase 2-c-2 — lifestyle assets admin UI (CRUD + Sidebar entry)
Production deploy 검증: `scripts/verify-vercel-deploy.sh --wait` exit 0, prod is on a0cdb05 ✅

---

## 2026-05-15 PM Sprint 7-M2 Phase 2-c-1 — lifestyle-picker (30일 cooldown + ConceptTone tag matching)

직전 Phase 3-C-3-h2 (3404c0a) 완료 후 사용자 "다음작업 진행" 자율 위임. ROADMAP queued sprint 중 **Phase 2-c lifestyle-picker** 진입. LifestyleAsset Prisma 모델 이미 설계됨 (DB rows=0) → picker library만 빌드하면 graceful fallback (자산 빈 상태에서 brand-color path 자동 활성화).

본 turn 작업 (2 파일 +226/-1):

- **`src/lib/automation/lifestyle-picker.ts`** (NEW, 148 LOC) — pure backend module:
  - `pickLifestyleAsset(opts)` — 30일 cooldown + per-SKU 제외 + ConceptTone tag/moodTag overlap scoring
  - `markLifestyleAssetUsed(assetId, sku)` — 별도 함수로 caller가 timing 제어 (lazy mark)
  - Tag 매핑: tags=[persona, context, pricePosition, productType], moodTags=[colorMood, emotionalTone, photoStyle, genre]
  - Score: overlap count, moodTags 1.5x weight (시각적 영향 큼)

- **`src/app/api/thumbnail/[sku]/route.ts`** (+55/-1) — route-layer 통합:
  - Picker 호출은 *route에서* 수행 → thumbnail-generator pure 보존
  - `body.lifestyleBackdropUrl` 우선 (디자이너 manual override 보존)
  - Picker 실패 non-fatal (console.warn + brand-color fallback)
  - Lazy mark: outputs에 lifestyle variant 존재 시에만 markUsed
  - Response field 추가: `lifestyleAssetId` (picker null 시 null)

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build OK (route 크기 변경 0) ✅
- production smoke (rows=0 graceful fallback): outputs=4, lifestyleAssetId=None, lifestyle variant 47KB brand-color ✅

Phase 2-c-2 (다음): asset seeding admin UI — `/settings/lifestyle-assets` 페이지 + GET/POST/DELETE API. 사용자가 Phase 1 Claude Web 세션에서 생성한 PNG/JPG 드래그-드롭 + 태그 입력 → 즉시 picker 활성화.

Commit: `6646a31` feat(automation): Phase 2-c-1 — lifestyle-picker (30-day cooldown + ConceptTone tag matching)
Production deploy 검증: `scripts/verify-vercel-deploy.sh --wait` exit 0, prod is on 6646a31 ✅

---

## 2026-05-15 Sprint 7-M2 Phase 3-C-3-h — Cloudinary fetch 우회 hardening + production smoke 검증

직전 Phase 3-C-3 (1daded2 + 2914322 docs) 완료 후 사용자 명시 옵션 2 선택 — *production 검증* 진입. 4개 핵심 API 엔드포인트를 실 도매꾹 상품 (cmp3afb450001gng5468w0qpc, "디자인 복 달항아리 도어벨") 으로 smoke test하면서 **paper-cut 1건 발견 → 즉시 수정 → 재검증 → production 정상 운영 확인**.

### Production smoke 결과 (실 도매꾹 상품 1건)

| Stage | Endpoint | HTTP | Elapsed | Result |
|---|---|---|---|---|
| 1 | POST /api/diagnose | 200 | 0.71s | ✅ L4/review, S6 골격, qualityScore 37.3, conceptTone 8축 모두 채움, persisted |
| 2 (1차) | POST /api/thumbnail/[id] | 200 | 3.55s | ❌ outputs:[] (4 variants 모두 silent fail) |
| 2 (수정 후) | POST /api/thumbnail/[id] | 200 | 4.75s | ✅ 4 variants 모두 base64 정상 (47-58KB JPEG) |
| 3 | POST /api/products/[id]/generate-detail | 200 | 5.22s | ✅ 5 sections (S6 hero/story/styledShot/spec/cta), 860x5980, 277KB raw |
| 4 | POST /api/products/[id]/save-assets | 200 | 1.70s | ✅ Supabase Storage 2 public URLs, 둘 다 HTTP 200 image/png |
| (skip) | POST /api/products/[id]/publish-assets | n/a | n/a | naverProductId null이라 skip (정상 동작) |

### Phase 3-C-3-h 핵심 수정 (`c789e36`, 3 파일 +17/-14)

**Root cause**: Cloudinary `fetch mode` 계정 차단:
```
HTTP/2 401
x-cld-error: Images of type fetch are restricted in this account
```

`thumbnail-generator.ts`의 4 renderer (renderClean / renderPrice / renderBadge / renderLifestyle) + `section-renderers/hero.ts` + `section-renderers/detail.ts`가 모두 Cloudinary fetch URL을 통해 source 이미지를 받아오는 패턴이었음. 계정 설정으로 fetch가 차단되니 모든 변형이 silent fail (per-variant try/catch가 에러를 삼키고 outputs[] 반환).

**수정**: Cloudinary 전처리 layer 우회. Sharp의 `fitImage(buffer, slot, bgColor)`가 이미 동일한 1080×1080 padded 결과를 만들기에 Cloudinary preprocessing이 redundant (게다가 Cloudinary fetch는 한 번 호출 후 buffer로 받아 쓰고 버려서 CDN 캐시 이점도 0). 작업원칙 #38 정합 (production runtime = 외부 이미지 API 의존 0).

수정 파일:
- `src/lib/automation/thumbnail-generator.ts` — `urlCleanWhite/urlCleanBrand` import 제거, 4 renderer가 `fetchImageBuffer(req.sourceImageUrl)` 직접 호출
- `src/lib/automation/section-renderers/hero.ts` — `urlGalleryThumb` 제거, source URL 직접 fetch
- `src/lib/automation/section-renderers/detail.ts` — 같은 패턴

`cloudinary-pipeline.ts` 파일은 보존 (deprecated 상태) — 사용자가 추후 Cloudinary 콘솔에서 fetch enable + cdn1.domeggook.com allow-list 추가하면 재진입 가능.

### autoRunVisual 흐름 production 작동 확인

Phase 3-C-3 (1daded2)에서 도입한 자동 sequence는 다음 단계로 chain:
1. diagnose ✓ (0.7s, L4 review grade)
2. thumbnail ✓ (4.8s, 4 variants 합계 47-58KB)
3. save ✓ (1.7s, Supabase 2 public URLs)
4. publish (skip — naverProductId null)

**총 시간 약 10초** — 7일 골든윈도우 기준 충분히 빠른 응답.

### 첫 실 상품 등록 준비 완료 상태

| 항목 | 상태 |
|---|---|
| 실 도매꾹 상품 (DRAFT, naverProductId null) | 1건 (cmp3afb450001gng5468w0qpc) |
| Diagnosis 영속화 | ✅ 1 row (L4/review/S6) |
| Supabase Storage 발행된 자산 | ✅ thumb-clean (41KB) + detail-S6 (283KB) public URL |
| 4 API 모두 production HTTP 200 | ✅ |
| autoRunVisual 자동 흐름 정합 | ✅ (수동 chain 검증 완료) |
| 사용자가 "네이버 직접 등록 (API)" 클릭 시 | autoRunVisual ON (default) → naverProductId 발급 → publish-assets 호출 → 갱신 완료까지 자동 종결 |

### 검증

- `npx tsc --noEmit` 0 errors ✅
- `npm run build` 정상 (route 크기 변경 0) ✅
- production smoke 4 stages 모두 200 ✅
- Vercel runtime logs 정확한 root cause 식별 (`x-cld-error: Images of type fetch are restricted`)
- Supabase public URLs HTTP 200 image/png + Cloudflare CDN 응답 (`cf-ray: 9fc15e60c8c6fd11-ICN`)

### 적용된 작업원칙

- #17 commit msg via `.commit-msg.tmp` + `git commit -F`
- #21 STEP 0 사전 점검 통과
- #28 Vercel = source of truth (Vercel runtime logs로 root cause)
- #32 push 전 TSC + npm run build
- #36 push 후 verify-vercel-deploy.sh --wait → exit 0
- **#38 production runtime never calls external image APIs** — 본 phase의 *직접 발화 사례*. Cloudinary 계정 fetch 차단으로 매출 흐름이 막혔던 사고. 정적 자산만 사용하는 패턴으로 수정해서 외부 의존성 *완전 제거*. 향후 Adobe/OpenAI 등 다른 외부 image API 도입 시 동일 위험 인지

### 다음 = 사용자 첫 실 상품 등록 시도

본 검증으로 *코드는 production에서 정상 작동 보장*. 다음 단계는 사용자가 PLANT `/products/new`에서 6 탭 채우고 "네이버 직접 등록 (API)" 클릭하는 것. autoRunVisual ON (default) 상태에서 다음이 자동:

1. local DB save → savedProductId set → 7번째 탭 unlock
2. 네이버 등록 → savedNaverProductId 채움 → setActiveTab('visual')
3. PlantVisualInner 마운트 → autorun useEffect → runFullSequence
4. diagnose ✓ → thumbnail ✓ → save ✓ → publish ✓ chip 순차
5. 약 10-15초 후 SequenceStatusBanner green: "비주얼 자동화 완료"
6. 스마트스토어에 *콘텐츠까지 갖춘* 첫 실 상품 노출

Commit: `c789e36` fix(automation): Phase 3-C-3-h — bypass Cloudinary fetch (account-restricted), use Sharp direct resize
Production deploy 검증: `scripts/verify-vercel-deploy.sh --wait` exit 0, prod is on c789e36 ✅

---

## 2026-05-15 Sprint 7-M2 Phase 3-C-3 — register-then-autorun + sequence chaining + golden-window deep-link

직전 Phase 3-C-2 (PLANT 7번째 탭 통합, c1616c0/d9256b2) 직후 사용자 명시 승인으로 진입. **Sprint 7-M2 Phase 3-C 트리오 완결** — extract (3-C-1) → mount (3-C-2) → wire-up (3-C-3). 이제 PLANT에서 네이버 등록 직후 콘텐츠 자동화가 *자동으로 흐른다*. 대시보드 골든윈도우 위젯 클릭도 비주얼 탭으로 직진.

본 turn 작업 (4 파일, +290/-43):

- **`src/components/studio/useStudioActions.ts`** (+186/-43) — 5 핸들러를 *결과 반환* 형으로 refactor:
  - `runDiagnose / runThumbnail / runDetail` → 각각 `Promise<XResult | null>` 반환
  - `runSave(overrides?)` → `RunSaveOverrides` 타입으로 thumbnails/mainVariant/detail override 지원 (closure stale-state 회피)
  - `runPublish(saveOverride?)` → save override 지원
  - **신규** `runFullSequence({ hasNaverId?, withDetail? })` → 5단계 chain (diagnose → thumbnail → [detail] → save → [publish])
  - 신규 state 3개: `sequenceBusy / sequenceStages / sequenceError`
  - 기존 `onRun: () => void` props는 그대로 작동 (Promise<X>는 Promise<void>에 assignable)

- **`src/lib/i18n/studio-strings.ko.json`** (+10 strings, 95 → 105) — autoRun + sequence 관련 신규:
  - `plantTab.autoRunLabel` = "등록 후 비주얼 자동 생성"
  - `plantTab.autoRunHint` (체크박스 옆 설명)
  - `plantTab.autorunRunning / autorunDone / autorunFailed`
  - `plantTab.autorunStage{Diagnose,Thumbnail,Detail,Save,Publish}` (배너 chip 라벨)

- **`src/app/products/new/page.tsx`** (+129/-1) — PLANT autorun 통합:
  - `PlantVisualInner`에 `autorun` prop 추가 → `autorunRanRef`로 productId당 1회 idempotent useEffect
  - 신규 `SequenceStatusBanner` — 4 카드 위에 sequence 진행 상태 (busy=blue / done=green / error=red) + 단계별 ✓ chip
  - 신규 state `autoRunVisual` (default true)
  - 토글 UI (체크박스 + label) — 하단 버튼 위에 핑크 chrome (`#FFF5F7`/`#FFB3CE`)
  - `handleNaverDirect` 네이버 등록 성공 후: `if (autoRunVisual) setActiveTab('visual')` → PlantVisualInner 마운트 → autorun useEffect 발화 → runFullSequence
  - **edit-mode useEffect (`?edit=ID`)** — `setSavedProductId(p.id)` + `setSavedNaverProductId(p.naverProductId ?? null)` 자동 채움 → 골든윈도우 deep-link `?edit=ID&focus=visual`이 작동하는 visual 탭에 도달

- **`src/components/dashboard/GoldenWindowWidget.tsx`** (+2/-1) — `GoldenRow` href를 `/products/new?edit=ID` → `/products/new?edit=ID&focus=visual`로 변경. 위젯 클릭이 곧장 비주얼 탭으로 진입

설계 결정:

1. **closure stale-state 회피 — handler 결과 반환 + override 파라미터** — React useState는 setState 후 다음 렌더 전까지 closure에서 옛 값을 봅니다. Sequence가 `await runDiagnose()` 후 곧바로 `runSave()` 호출하면 setSave가 본 thumbnails는 *이전 렌더의 null*. 해결: 각 handler가 결과를 직접 반환 + runSave/runPublish는 override 파라미터 수용 → sequence가 fresh 데이터를 명시적으로 전달
2. **autorun idempotent (productId당 1회)** — `useRef`로 마지막 실행한 productId 추적. autorun=true 상태에서 hasNaverId 변경 등으로 useEffect deps가 재발화해도 같은 productId면 skip
3. **detail은 autorun에서 opt-out** — runFullSequence의 `withDetail` 기본 false. 상세 페이지 합성은 5000~7000px 무거운 Sharp 연산 + 골격 1-click 교체가 디자이너 가치라서 자동화 부적합. 사용자가 명시적으로 `withDetail: true` 전달 시만 포함
4. **publish는 hasNaverId 검증** — naverProductId 없으면 sequence가 publish 단계 skip. 등록 실패 케이스에서도 진단/썸네일/저장은 성공
5. **edit-mode 자동 unlock** — 골든윈도우 위젯 / TEND per-row 액션에서 *기존 상품으로* 진입 시 임시저장이 없어도 visual 탭이 작동해야 함. edit-mode useEffect에서 product.id를 savedProductId로 set
6. **i18n 100% 분리 (작업원칙 #29 + #35)** — 신규 10 한글 string 모두 dict, 코드 inline 한글 0건

검증:

- npx tsc --noEmit 0 errors ✅
- npm run build OK (`/products/new` 62.5 kB, `/studio` 3.73 kB) ✅
- python3 scripts/verify-korean-dict.py: 99+178+105 strings, 0 typo ✅
- sentinel grep clean (4 파일 모두) ✅
- 코드 inline 한글 주석 0건 ✅

사용자 시나리오 (Phase 3-C-3 이후):

```
A. 신규 등록 흐름 (autoRunVisual on, default):
   1. PLANT 6 탭 채움 → "네이버 직접 등록" 클릭
   2. local DB save + naver register 양쪽 성공
   3. → 비주얼 탭 자동 활성화
   4. → SequenceStatusBanner: "비주얼 자동화 진행 중..." (blue)
   5. → diagnose ✓ → thumbnail ✓ → save ✓ → publish ✓ chip 순차 추가
   6. → 배너 green: "비주얼 자동화 완료 — 모든 단계 성공"
   7. 상품이 *콘텐츠까지 갖춘 채로* 스마트스토어에 노출

B. 기존 상품 보강 흐름 (대시보드 골든윈도우):
   1. 대시보드 → 골든윈도우 위젯의 D+1/D+3/D+7 row 클릭
   2. → /products/new?edit=ID&focus=visual 직접 진입
   3. → edit-mode useEffect로 savedProductId 자동 채워짐
   4. → 비주얼 탭 자동 활성화 (?focus=visual + validTabs 매칭)
   5. → 4 카드 수동 호출 (autorun off — 이미 등록된 상품이라 등록 재실행 없음)
   6. → 디자이너가 상세/골격을 손봐서 publish 갱신

C. autorun off 케이스:
   - 토글 해제하고 등록 → 자동 흐름 차단, 비주얼 탭 unlock만
   - 사용자가 본인 페이스로 카드 클릭
```

다음 = **Sprint 7-M2 Phase 2-c (lifestyle-picker 30일 cooldown)** — 썸네일 4 변형 중 lifestyle 변형의 background 자산 풀 관리. 같은 자산을 30일 안에 재사용 금지 + 카테고리/계절/감성톤 태그 매칭으로 적합 자산 선택. 또는 Sprint 8 자동발주 (Private API 28권한 보유, 매출 상승 시점 진입).

Commit: `1daded2` feat(automation): Phase 3-C-3 — register-then-autorun + sequence chaining + golden-window deep-link
Production deploy 검증: `scripts/verify-vercel-deploy.sh --wait` exit 0, prod is on 1daded2 ✅

---

## 2026-05-14 Sprint 7-M2 Phase 3-C-2 — PLANT 7번째 탭 "비주얼 자동화" 통합

직전 Phase 3-C-1 (Studio 컴포넌트 추출) 직후 사용자 승인 후 진입. **`/studio` 전용이던 콘텐츠 자동화 워크플로우를 PLANT `/products/new` 7번째 탭에 마운트** — 신규 상품 등록 직후 7일 골든윈도우 안에 동일 페이지에서 진단 → 썸네일 → 상세 → 갱신까지 종결.

본 turn 작업 (2 파일, +100/-3):

- **`src/app/products/new/page.tsx`** (+93/-3) — Phase 3-C-1에서 추출한 4 카드 + `useStudioActions` hook 한 줄 import로 7번째 탭에 마운트:
  - `Palette` lucide icon 추가
  - `import { DiagnosisCard, ThumbnailCard, DetailPageCard, ActionsCard, useStudioActions } from '@/components/studio'` + `import studioStrings from '@/lib/i18n/studio-strings.ko.json'`
  - 모듈 레벨 `PlantVisualInner({ productId, naverProductId })` sub-component — hook 호출 + 4 카드 마운트 + canPublish 계산 (caller-specific hasNaverId)
  - `activeTab` type에 `'visual'` 추가 (6 → 7 tab)
  - 2 신규 state: `savedProductId` + `savedNaverProductId`
  - `handleNaverDirect` — local DB save 직후 `setSavedProductId(productId)` (네이버 등록 실패해도 visual 탭 unlock), 네이버 등록 성공 시 `setSavedNaverProductId(naverData.naverProductId)`
  - `validTabs` deep-link 배열에 `'visual'` 추가 (`?focus=visual` 지원)
  - tab navigation 7번째 entry: `{ key: 'visual', label: studioStrings.plantTab.label, Icon: Palette }`
  - `tabDone.visual = !!savedProductId`
  - 7번째 panel: `savedProductId` 없으면 안내 카드 (`needSaveTitle` + `needSaveBody`), 있으면 `<PlantVisualInner />` 렌더

- **`src/lib/i18n/studio-strings.ko.json`** (+6 strings, 89 → 95) — PLANT 탭 전용 string 분리:
  - `plantTab.label` = "비주얼 자동화" (탭 라벨)
  - `plantTab.needSaveTitle` / `needSaveBody` (savedProductId 가드 안내 카드)
  - `plantTab.savedBadge` / `panelTitle` / `panelSubtitle` (보조 슬롯, 향후 확장 대비)

설계 결정:

1. **module-level sub-component** — `PlantVisualInner`를 `NewProductPageInner` 내부가 아닌 *모듈 레벨*에 정의 → PLANT 매 렌더마다 hook 재생성 방지
2. **savedProductId 분리** — `productId` (handleNaverDirect 내부 local var)와 별도로 React state로 노출 → 7번째 탭이 page-level state로 접근 가능
3. **불완전 등록 graceful** — 네이버 등록 실패해도 local DB save 성공이면 visual 탭 unlock. 사용자가 publish 없이 진단/썸네일/상세/저장만 활용 가능
4. **i18n 100% 분리** — 신규 사용자 노출 한글 6 strings 모두 dict 분리. PLANT 코드는 `studioStrings.plantTab.*` 키 참조만 (작업원칙 #29 c, #35)
5. **byte-identical existing tabs** — 기존 6 탭의 label/Icon/tabDone 모두 그대로 보존, 7번째만 *추가*

검증:

- npx tsc --noEmit 0 errors ✅
- npm run build 정상, `/products/new` 62 kB (PLANT, 약간 증가), `/studio` 3.73 kB (shared chunk 추출로 감소) ✅
- python3 scripts/verify-korean-dict.py: 99+178+95 strings, 0 typo ✅
- sentinel grep clean (한글 자모 변종 0건) ✅
- 코드 inline 한글 주석 0건 (작업원칙 #29 c) ✅

페이지 작동 흐름 (Phase 3-C-2 이후):

1. PLANT `/products/new` 진입 → 6 탭 (기본/옵션/이미지/배송/SEO/혜택) 채움
2. "네이버 직접 등록 (API)" 버튼 클릭 → local DB save → `setSavedProductId(id)` → 7번째 탭 unlock
3. 7번째 탭 "비주얼 자동화" 클릭 → `<PlantVisualInner />` 마운트:
   - AI 진단 카드 (1) → POST /api/diagnose
   - 썸네일 카드 (2) → POST /api/thumbnail/[sku] → 4 변형 + 메인 선택
   - 상세 카드 (3) → POST /api/products/[id]/generate-detail → 5섹션 + 골격 1-click 교체
   - 액션 카드 (4) → POST /api/products/[id]/save-assets + publish-assets (네이버 등록 성공 시)
4. 골든윈도우 활용: 등록 후 7일 안에 콘텐츠 채우기 → 매출 기반 형성

다음 = **Sprint 7-M2 Phase 3-C-3** (등록 → publish-assets 자동 호출 wire-up + "에셋 저장 후 자동 갱신" 토글 + 대시보드 골든윈도우 카운트다운).

Commit: `c1616c0` feat(automation): Phase 3-C-2 — PLANT 7th tab "비주얼 자동화" mounts Studio cards
Production deploy 검증: `scripts/verify-vercel-deploy.sh --wait` exit 0, prod is on c1616c0 ✅

---

## 2026-05-13 Sprint 7-M2 Phase 3-C-1 — Studio 컴포넌트 추출 (refactor only)

PLANT 7번째 탭 통합(3-C-2)의 필수 사전 작업. `/studio/page.tsx` 1068 LOC → 250 LOC (-77%), 4 카드 + ProductListPane + useStudioActions hook + StudioCardShell을 `src/components/studio/`로 추출.

신규 (9 파일, 1059 LOC):

- `types.ts` (96) — 6 interface + 2 상수 (SkeletonIdLiteral / SKELETON_IDS / ThumbVariant / THUMB_VARIANTS / ProductRow / DiagnosisResult / ThumbnailResult / DetailResult / SaveResult / PublishResult)
- `StudioCardShell.tsx` (172) — Card / Pill / PrimaryButton / SecondaryButton + pickGradePalette / fmtPrice 헬퍼
- `useStudioActions.ts` (242) — 11 state + 5 async handlers + reset useEffect + canSave/hasSavedAsset derived. productId만 받으면 동작
- 4 카드 (DiagnosisCard 62 / ThumbnailCard 102 / DetailPageCard 95 / ActionsCard 163)
- `ProductListPane.tsx` (92)
- `index.ts` (35) — barrel export

수정:
- `src/app/studio/page.tsx` (1068 → 250 LOC, -77%) — shell만 유지
- `src/lib/i18n/studio-strings.ko.json` (+4 strings = 89) — productList.title + publishPatched{Thumb,Detail,Sep} (인라인 한글 → i18n migration)

설계 결정:
- **byte-identical markup** — JSX 완전 동일 보존, production /studio 시각 변경 0
- **useStudioActions hook** — productId 하나만 받음, PLANT에서 `useStudioActions(savedProductId)`로 동일 호출 가능
- **canPublish는 hook 외부** — `hasNaverId`가 caller-specific이라 caller 계산
- **인라인 한글 0** — 기존 ActionsCard "썸네일 ✓"/"상세 ✓" inline도 i18n으로 migration

검증 (refactor 전후 완전 동일):
- npx tsc --noEmit 0 errors ✅
- npm run build 정상, /studio 8.32 → 8.52 kB (barrel + i18n 미미한 overhead) ✅
- 5 API routes 변경 0 ✅
- dict.py 3 dicts 통과 (99+178+89, 0 typo) ✅
- 신규 파일 sentinel 0건 ✅

Phase 3-C-2 진입 준비 완료 — PLANT 7번째 탭에서 `import { ... } from '@/components/studio'` 한 줄로 동일 워크플로우 마운트 가능.

다음 = Phase 3-C-2 (PLANT /products/new 6 → 7 tab 확장) → Phase 3-C-3 (등록 흐름에 publish-assets 자동 호출).

---

## 2026-05-13 Sprint 7-M2 Phase 3-D + 3-E + /studio UX polish

직전 Phase 3-A + 3-B production deploy + `product-assets` bucket 생성 검증 후 동일 turn 연속 진입. 사용자 피드백 (disabled 버튼 이유 불명, 다음 작업 진입 요청) 반영.

본 turn 작업 (3 파일 신규/수정 + i18n 확장):

- **Phase 3-E** — `src/app/api/products/[id]/publish-assets/route.ts` (109 LOC, 신규) — POST endpoint, naverProductId 확인 → `originProduct.images.representativeImageUrl` + `detailContent` HTML patch → updateProduct 호출. HTTPS URL validation 포함. 미등록 상품 → 422 명시 에러.
- **Phase 3-D** — `src/app/products/page.tsx` (2 lines) — per-row "콘텐츠" 아이콘 (Palette / pink) 추가, `/studio?product={id}` deep-link. 기존 상품 재가공 진입점 활성화.
- **/studio UX polish** — `src/app/studio/page.tsx` (~140 LOC 변경)
  - Workflow step indicator: 각 4 카드 헤더에 1→2→3→4 numeric badge (완료 시 ✓ 초록)
  - Disabled state hints: 노란 ⓘ 안내 inline 표시
  - Publish 버튼 실 wire-up: disabled placeholder → 실제 publish-assets 호출 (canPublish = hasSavedAsset && hasNaverId)
  - 3가지 disabled 상태별 hint (no asset / no naverId)
  - publish 성공 시 파란 박스에 naverProductId + patched 결과 표시
  - lucide Send icon 추가
- **i18n** — `src/lib/i18n/studio-strings.ko.json` (+8 strings, 85 total) — actions.* 6 신규 + workflow.* 3 신규

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 정상 (`/studio` 7.45 → 8.32 kB, `publish-assets` ƒ Dynamic 등록) ✅
- dict.py 3 dicts 통과 (99+178+85, 0 typo) ✅
- 신규/수정 파일 sentinel 0건 ✅

페이지 작동 흐름 (전후 비교):
- **이전**: 4 카드 동일 weight → 어디부터 시작 헷갈림 → disabled 이유 안 보임
- **이후**: ① AI 진단 → ② 썸네일 → ③ 상세 → ④ 에셋 저장 + 네이버 갱신 (번호 + 색상 코딩 + inline hint) → 실 네이버 상품 갱신까지 한 페이지에서 종결

다음 = **Phase 3-C** (PLANT 7번째 탭 "비주얼 자동화"). PLANT page.tsx (188KB) + 4 카드 컴포넌트 추출 필요로 *전용 sub-phase 분리 권고*:
- Phase 3-C-1: src/components/studio/ 4 카드 추출 (refactor only)
- Phase 3-C-2: PLANT 7번째 탭 + tab navigation 갱신
- Phase 3-C-3: 등록 → publish-assets 자동 호출 wire-up

Commit: 본 turn에서 단일 commit + push (`claude/phase-3de-publish-ux-{ts}` branch). 사용자 FF merge 후 production deploy 검증.

---

## 2026-05-13 Sprint 7-M2 Phase 3-A + 3-B — API foundation + 온실 아틀리에 UI mount

사용자 페르소나 주입 (10년차 파워셀러 + 풀스택 + UI/UX) + AskUserQuestion으로 IA 확정 후 Phase 3-A (API) + Phase 3-B (UI) 동시 진행. **콘텐츠 자동화 UI 진입점 정착** — 27 dedicated renderers를 사용자가 클릭으로 사용 가능.

본 turn 누적 commit (3건):

- `e6a1941` docs(plan): split SESSION_LOG per principle 31 (T1 947 + Phase 3 entry trigger)
- `5b543fe` feat(automation): Phase 3-A — Supabase Storage adapter + 2 API routes
- `<sha>` feat(automation): Phase 3-B — 온실 아틀리에 UI + Sidebar mount + i18n strings

Phase 3-A (API, 3 신규 파일):

- `src/lib/storage/automation-storage.ts` (118 LOC) — Supabase Storage 어댑터, bucket=product-assets 분리, SUPABASE_SERVICE_ROLE_KEY 서버측
- `src/app/api/products/[id]/generate-detail/route.ts` (114 LOC) — POST, Product + Diagnosis 조회 → buildDetailPage → base64 PNG + section meta
- `src/app/api/products/[id]/save-assets/route.ts` (138 LOC) — POST, base64 → Storage upload → public URL 응답

Phase 3-B (UI, 4 파일 신규 + 2 수정):

- `src/lib/i18n/studio-strings.ko.json` (77 strings, 신규) — 페이지 사용자 노출 한글 분리
- `src/app/studio/page.tsx` (~640 LOC, 신규) — 2-pane MVP (좌 320px 상품 리스트 + 우 4 카드: Diagnosis/Thumbnail/Detail/Actions)
- `src/components/layout/Sidebar.tsx` (수정) — TEND 4번째 entry "온실 아틀리에" + Palette icon
- `scripts/verify-korean-dict.py` (수정) — DEFAULTS에 studio-strings.ko.json 추가

페이지 작동 흐름 (사용자 시나리오):

1. 사이드바 TEND → **온실 아틀리에** 진입
2. 좌측 상품 리스트 자동 첫 상품 선택
3. 우측 4 카드 워크플로우:
   - 진단 카드 → POST /api/diagnose → 컨셉/톤/골격/등급/신뢰도 카드
   - 썸네일 카드 → POST /api/thumbnail/[sku] → 4 변형 미리보기 + 메인 선택
   - 상세 카드 → POST /api/products/[id]/generate-detail → 5섹션 zoom-fit 미리보기 + 골격 1-click 교체
   - 액션 카드 → POST /api/products/[id]/save-assets → Supabase Storage public URL 발급
4. "네이버 즉시 등록" disabled placeholder (Phase 3-C 활성화)

설계 결정:

- 2-pane 채택 — 상품 컨텍스트 항상 유지 (10년차 셀러 일 5-20건 페이스)
- 카드 색상 코딩 — primary/gold/sage/dark 4단계 워크플로우 시각적 구분
- 골격 드롭다운 자동/S1~S12 — 디자이너 1-click swap (작업원칙 #40)
- 상세 미리보기 max-height 520px overflow scroll — 5000~7000px 세로 길이 컴팩트화

검증:

- npx tsc --noEmit 0 errors ✅
- npm run build 정상, `/studio` ○ Static (7.45 kB), generate-detail/save-assets ƒ Dynamic 등록 ✅
- dict.py 3 dicts 통과 (99+178+77 strings, 0 replace/not_nfc/typo) ✅
- 신규 파일 sentinel grep 0건 ✅
- 한글 i18n 100% 분리 (작업원칙 #29 c, #35)

다음 = **Phase 3-C** (PLANT 7번째 탭 "비주얼 자동화" — 등록 흐름 통합으로 7일 골든윈도우 매출 ↑) + **Phase 3-D** (TEND per-row 액션 — 기존 상품 재가공 흐름 활성화) + **Phase 3-E** (Naver API publish-assets — production data 검증).

Commit: 본 turn 3 commit이 단일 branch에 push. 사용자 FF merge 후 production deploy 검증.

---

## 2026-05-13 Sprint 7-M2 Phase 2-b-3-b — B2B + S3 cleanup 3 렌더러 (dedicated 27/27 ✅ 100%)

3 신규 렌더러 + section-copy.ts 3 신규 Groq 헬퍼 + strings.ko.json 3 슬롯 → **12 골격 모두 완전 dedicated**.

- `specTable.ts` (141 LOC, S12) — 3-column 기술 사양 테이블 (parameter / value / unit), KFTC: value 컬럼 invariant placeholder
- `specifications.ts` (134 LOC, S12) — 2x2 규제·인증 grid (KC/KS/안전기준/제조번호) + invariant caveat strip
- `package.ts` (158 LOC, S3) — 3-step horizontal unboxing sequence (numbered badge + arrow + gift-handover tone)

section-copy.ts 확장 (3 신규 Groq 헬퍼):
- `generateSpecTableCopy` — `{headline, columnHeaders, rows: [{parameter, value, unit}]}` (value invariant)
- `generateSpecificationsCopy` — `{headline, items: [{label, value}] × 4, caveat (invariant)}`
- `generatePackageCopy` — `{headline, steps: [{label, caption}] × 3}`

**매트릭스 카운트 정정 발견**: grading.SKELETON_SECTIONS 12 골격의 unique section ids를 Python set으로 정확 카운트한 결과 **27개** (이전 docs의 "26"은 off-by-one). 본 phase로 **27/27 = 100% dedicated coverage** 달성. 이전 docs entries에서 "26"으로 기록된 항목을 모두 향후 정정 권고.

**완전 dedicated 골격 12/12 ✅**: S1 · S2 · S3 · S4 · S5 · S6 · S7 · S8 · S9 · S10 · S11 · S12

골격 변경분:
- S3: 5/6 → **6/6 ✅ 완전** (package 추가)
- S12: 3/5 → **5/5 ✅ 완전** (specTable + specifications 추가)

KFTC discipline 강화 (B2B 트랙 가장 엄격):
- specTable: value 컬럼 *항상* dict placeholder, Groq schema에서 제외 강제
- specifications: 4 카드 value 모두 invariant, 하단 invariant caveat strip Groq override 불가
- package: scarcity 패턴 금지 prompt, gift-handover tone 강제

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 정상 빌드 ✅
- python3 scripts/verify-korean-dict.py (178 strings, 0 typo) ✅
- registry 27 entries == SKELETON_SECTIONS unique ids 27 (Python set verification) ✅
- 신규 3 renderer 한글 inline: specTable.ts JSDoc 예시 1건만 잔존, 사용자 노출 외

다음 = Sprint 7-M2 Phase 2-c (lifestyle-picker 30일 cooldown + 태그 매칭) → Phase 3 (`/api/products/[id]/generate-detail` route + Diagnosis 연동 + Supabase Storage 업로드).

Commit: 본 phase에서 별도 commit + push 직후 `verify-vercel-deploy.sh --wait`로 production 검증.

---

## 2026-05-13 Sprint 7-M2 Phase 2-b-3-a — 감각 트랙 5 렌더러 (S6·S9·S10 완전 dedicated)

5 신규 렌더러 + section-copy.ts 5 신규 Groq 헬퍼 + strings.ko.json 5 슬롯:

- `material.ts` (122 LOC, S9) — macro shot + 원산지/인증 2 카드 placeholder (KFTC)
- `styledShot.ts` (111 LOC, S6) — 3 stacked lifestyle shots + mood 캡션 ×3
- `philosophy.ts` (100 LOC, S10) — editorial paragraph + signature + brand stripe
- `detail.ts` (142 LOC, S10) — 2x2 macro detail grid (tactile description)
- `reviews.ts` (121 LOC, S10) — **KFTC critical** — 3 동일 placeholder card + 사용자 1/2/3 attribution + neutral 5-dot icon (별점 fabricate 0)

section-copy.ts 확장 (5 신규 Groq 헬퍼, +320 LOC):
- `generateMaterialCopy` — `{headline, originLabel, macroCaption, certLine}`
- `generateStyledShotCopy` — `{headline, captions: [3]}`
- `generatePhilosophyCopy` — `{headline, paragraph, signature}`
- `generateDetailGridCopy` — `{headline, cells: [{title, body}] × 4}`
- `generateReviewsCopy` — `{headline, placeholderQuote, placeholderAttribution}` (KFTC critical: 헤드라인만 Groq, 본문 invariant)

전체 dedicated 커버리지 (Phase 1 + 2-a + 2-b-1/2/3-a 합산):
- **dedicated 24 / 26 섹션 ids (92%)**
- **placeholder 2 / 26 잔여**: specTable · specifications · package (Phase 2-b-3-b 대상, 1 sub-phase로 100% 도달 가능)

**완전 dedicated 골격 누적 9개**: S1 · S2 · S4 · **S6** · S7 · S8 · **S9** · **S10** · S11

골격 변경분:
- S6: 4/5 → **5/5 ✅ 완전** (styledShot 추가)
- S9: 3/4 → **4/4 ✅ 완전** (material 추가)
- S10: 4/6 → **6/6 ✅ 완전** (philosophy + detail + reviews 추가)

STEP A 효과 검증 — *fallback inline 0 패턴 정착*:
- 본 phase 도입 신규 fallback ~28건이 모두 *dict 키 추가만으로 작성*, inline 0건
- generateReviewsCopy의 placeholderQuote/placeholderAttribution는 invariant fallback으로 *Groq override 불가* — STRINGS 패턴이 KFTC-strict 케이스 안전 지원

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 정상 빌드 ✅
- 한글 sentinel grep 0건 (신규 5 renderer) ✅
- 신규 renderer 일반 한글 inline 0건 (STRINGS / copy.value 참조만) ✅

Commit: 본 phase에서 별도 commit + push 직후 `verify-vercel-deploy.sh --wait`로 production 검증.

다음 = Sprint 7-M2 Phase 2-b-3-b (specTable + specifications + S3 package, 3 렌더러로 100% 완성).

---

## 2026-05-13 Sprint 7-M2 STEP A — ko.json dict migration (작업원칙 #35)

8 파일 변경 (신규 2 + 확장 6):

- `strings.ko.json` (160 LOC, 신규) — 116 strings, 슬롯별 계층 (common 11 + 16 section slots + 4 Renderer SVG slots)
- `strings.ts` (49 LOC, 신규) — typed loader, `fill()` 보간 헬퍼, `buildSpecRows()` 컨텍스트 헬퍼
- `section-copy.ts` (-159 +123) — 18 fallback 객체 STRINGS 키 참조 교체
- `clinical.ts` / `comparison.ts` / `options.ts` / `spec.ts` — SVG hardcoded Korean 헤더 → `STRINGS.*Renderer` 슬롯
- `scripts/verify-korean-dict.py` — argv 지원, 두 dict 기본 검증, main() exit code

dict 구조 (slot 계층):

- `common.*` (11) — 공유 placeholder (detailsReference / theProduct / brandDefault / categoryFallback 등)
- 16 section slots (problem · solution · usage · cta · spec · story · productGrid · comparison · warranty · coreMetrics · technology · clinical · optionIntro · seasonalHook · options · eventDetails · benefits)
- 4 *Renderer 전용* slots (specRenderer · comparisonRenderer · optionsRenderer · clinicalRenderer) — SVG hardcoded header 보존

검증:

- `python3 scripts/verify-korean-dict.py`: 두 dict 검증 통과 (115+99 strings, 0 replace/not_nfc/typo) ✅
- `npx tsc --noEmit` 0 errors ✅
- `npm run build` 정상 빌드 ✅
- 신규 파일 sentinel grep 0건 (verify-korean-dict.py의 typo prevention list만 매치 = 의도) ✅
- section-copy.ts 남은 한글: Groq prompt instruction *예시* 문자열만, 사용자 노출 외

작업원칙 #35 효과:

- migration *전* 누적 ~45건 (Phase 1 + 2-a + 2-b-1 + 2-b-2 합산, 임계 30건 초과)
- migration *후* 사용자 노출 fallback dict 격리, inline 한글 0건 (Groq prompt 예시 제외)
- 신규 fallback은 *dict 키 추가만으로* 작성 가능 — Phase 2-b-3 진입 시 re-introduction 0 위험

Commit: 본 STEP에서 별도 commit + push 직후 `verify-vercel-deploy.sh --wait`로 production 검증.

다음 = Sprint 7-M2 Phase 2-b-3-a (감각 트랙 5 렌더러: material/styledShot/philosophy/detail/reviews).

---

## 2026-05-13 Sprint 7-M2 Phase 2-b-2 — 이벤트/세트 트랙 5 렌더러 완료 (S8·S11 완전 dedicated)

5개 신규 렌더러 + section-copy.ts 5 신규 Groq 헬퍼:

- `optionIntro.ts` (108 LOC) — S5. 2-column grid + 색상 chip + 옵션 이름/sub
- `seasonalHook.ts` (113 LOC) — S8. 시즌 banner + hook line + **START/END 날짜 카드 의무 렌더링** (KFTC date window 노출)
- `options.ts` (99 LOC) — S8. 옵션 테이블 (이름/구성, zebra striping)
- `eventDetails.ts` (102 LOC) — S11. **EDITION / DROP DATE / QUANTITY 3 카드 의무 렌더링** (KFTC limited drop 의무 disclosure)
- `benefits.ts` (144 LOC) — S11. 3 perk cards (inline SVG glyphs: gift/star/shield/tag/sparkle/truck) + 하단 disclosure strip 의무

section-copy.ts 확장 (5 신규 Groq 헬퍼):
- `generateOptionIntroCopy` — `{headline, items: [{name, sub}] 4-6, helperLine}`
- `generateSeasonalHookCopy` — `{banner, hookLine, startLabel, endLabel}`
- `generateOptionsTableCopy` — `{headline, rows: [{name, spec}] 4-6}`
- `generateEventDetailsCopy` — `{headline, editionLabel, dropDateLabel, quantityLabel, story}`
- `generateBenefitsCopy` — `{headline, perks: [{title, body, iconHint}] × 3, disclosure}`

전체 dedicated 커버리지 (Phase 1 + 2-a + 2-b-1 + 2-b-2 합산):
- **dedicated 19 / 26 섹션 ids**
- **placeholder 7 / 26 잔여**: material · styledShot · philosophy · detail · reviews · specTable · specifications · package (Phase 2-b-3 대상)

**완전 dedicated 골격 누적 6개**: S1 · S2 · S4 · S7 · **S8** · **S11**

골격 변경분:
- S5: 1/4 → **2/4** (optionIntro 추가)
- S8: 3/5 → **5/5 ✅ 완전** (seasonalHook + options 추가)
- S11: 2/4 → **4/4 ✅ 완전** (eventDetails + benefits 추가)

KFTC discipline 강화 (이벤트/세트 트랙 특히 중요):
- `seasonalHook` — START/END 날짜 카드 *항상 렌더링*, 미상 시 「상세 페이지 참조」 placeholder
- `eventDetails` — EDITION/DROP DATE/QUANTITY 3 카드 *항상 렌더링*, 미상 시 placeholder
- `benefits` — 하단 disclosure strip *항상 렌더링* (「혜택 적용 조건: 상세 페이지 참조」)
- Groq prompt 명시: "마감 임박" / "선착순" / "지금만" 사용 금지 (dark pattern filter scarcity rule 외 추가 layer)

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 28/28 routes ✅
- 한글 sentinel grep 0건 ✅

Commit: `5fe44d5` feat(automation): add 5 event/set section renderers (Sprint 7-M2 Phase 2-b-2)

**다음 = Sprint 7-M2 Phase 2-b-3 (감각/B2B 트랙) 진입 *전* ko.json dict migration 우선 권고** — 한글 fallback 누적 ~45건으로 작업원칙 #35 30건 임계 초과. Phase 2-b-3 + 2-b-4가 추가 ~25건 도입 예상이라 *지금 분리*가 효율적.

---

## 2026-05-13 Sprint 7-M2 Phase 2-b-1 — 신뢰 트랙 3 렌더러 완료 (S4·S7 완전 dedicated)

3개 신규 렌더러 + section-copy.ts 3 신규 Groq 헬퍼:

- `corePerformance.ts` (122 LOC) — S4. 2x2 metric card grid (label / value / unit / caption). **Groq는 라벨·단위·캡션만 생성, 수치는 fabricate 0건** (KFTC strict).
- `technology.ts` (134 LOC) — S7. 3-step pipeline diagram (브랜드 primary chips + arrows + step labels) + caption.
- `clinical.ts` (183 LOC) — S7. **KFTC critical** — 임상 데이터는 *항상* 「상세 페이지 참조」 placeholder (점선 outline bars), invariant caveat strip 「임상 데이터 출처: 상세 페이지 참조」 하드코딩. Groq 응답 override 불가.

section-copy.ts 확장 (3 신규 Groq 헬퍼):
- `generateCoreMetrics` — `{headline, cards: [{label, unit, caption}] × 4}` (numeric value 의도적 omit)
- `generateTechnologyCopy` — `{headline, mechanismLabel, steps: [3], caption}`
- `generateClinicalCopy` — `{headline, studyMeta, outcomeLabel, caveat (invariant)}`

전체 dedicated 커버리지 (Phase 1 + 2-a + 2-b-1 합산):
- **dedicated 14 / 26 섹션 ids**: hero · problem · solution · usage · cta · spec · story · product · comparison · warranty · shipping · **corePerformance** · **technology** · **clinical**
- **placeholder 12 / 26**: optionIntro · styledShot · seasonalHook · options · material · philosophy · detail · reviews · eventDetails · benefits · specTable · specifications · package

골격별 dedicated 커버리지 (변경분):
- S4: 4/5 → **5/5 ✅ 완전**
- S7: 4/6 → **6/6 ✅ 완전**

**완전 dedicated 골격 누적 4개**: S1 · S2 · S4 · S7

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 28/28 routes ✅
- 한글 sentinel grep 0건 ✅
- section-builder가 모든 SkeletonId 정상 dispatch ✅

Commit: `fff2867` feat(automation): add 3 trust-track section renderers (Sprint 7-M2 Phase 2-b-1)

다음 = Sprint 7-M2 Phase 2-b-2 (이벤트/세트 트랙 — S5/S8/S11 전용 5 렌더러: optionIntro · seasonalHook · options · eventDetails · benefits).

---

## 2026-05-13 Sprint 7-M2 Phase 2-a — 6 공유 렌더러 완료

6개 신규 렌더러 + section-copy.ts 5 신규 Groq 헬퍼:

- `spec.ts` (87 LOC) — S1/S3/S6. 2-column spec table + zebra row striping + accent header bar
- `story.ts` (117 LOC) — S3/S6/S10. Editorial paragraph (한국어 wrap @30char/line) + signature image strip + brand attribution
- `product.ts` (139 LOC) — S3/S8. 2x2 product detail grid, 공유 product image
- `comparison.ts` (120 LOC) — S4/S7. 3-column comparison table (feature / ours / baseline), KFTC-safe filter
- `warranty.ts` (79 LOC) — S4/S7. Headline + 3 line cards, circle-check icons
- `shipping.ts` (93 LOC) — S1/S9/S12. CTA copy 재사용 + S9 recyclable badge

section-copy.ts 확장 (5 신규 Groq 헬퍼):
- `generateSpecRows` — {rows: [{label, value}]} (5-6 rows)
- `generateStoryParagraph` — {paragraph, attribution}
- `generateProductGrid` — {cells: [{title, caption} × 4]}
- `generateComparisonCopy` — {headline, baselineLabel, rows[]}
- `generateWarrantyCopy` — {headline, lines[3]}

전체 dedicated 커버리지 (Phase 1 + 2-a 합산):
- **dedicated 11 / 26 섹션 ids**: hero · problem · solution · usage · cta · spec · story · product · comparison · warranty · shipping
- **placeholder 15 / 26**: corePerformance · technology · clinical · optionIntro · styledShot · seasonalHook · options · material · philosophy · detail · reviews · eventDetails · benefits · specTable · specifications · package

골격별 dedicated 커버리지:
- S1: 3/3 ✅ (완전)
- S2: 5/5 ✅ (완전, Phase 1)
- S3: 5/6 (package만 placeholder)
- S4: 4/5 (corePerformance만 placeholder)
- S6: 4/5 (styledShot만 placeholder)
- S7: 4/6 (technology, clinical placeholder)
- S9: 3/4 (material만 placeholder)
- S12: 3/5 (specTable, specifications placeholder)
- S5/S8/S10/S11: 1~3/n (Phase 2-b에서 보완)

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 28/28 routes ✅
- 한글 sentinel grep 0건 ✅
- section-builder가 모든 SkeletonId 정상 dispatch ✅

Commit: `449719b` feat(automation): add 6 shared section renderers (Sprint 7-M2 Phase 2-a)

다음 = Sprint 7-M2 Phase 2-b (15 골격 전용 렌더러) + Phase 2-c (lifestyle-picker).

---

## 2026-05-13 Sprint 7-M2 Phase 1 — 5섹션 빌더 + S2 5 렌더러 완료

10개 신규 파일 1,306 LOC (`src/lib/automation/section-renderers/` + `section-builder.ts`):

- `types.ts` (91 LOC) — SectionRenderer signature + SectionRenderContext + `resolveBgColor` (skeleton colorTokens 매핑, 미지 토큰 → white fallback, throw 0건)
- `section-copy.ts` (390 LOC) — 4 Groq 헬퍼 (hero / problem / solution / usage / cta), JSON-array 출력 파싱 + filterDarkPatterns + 결정형 fallback. copy-writer.ts와 분리해서 thumbnail/section copy 추상화 분리 유지
- `_placeholder.ts` (62 LOC) — 미구현 섹션 id 안전망. 점선 테두리 + 섹션 id 라벨 + 레이아웃 힌트. section-builder가 어떤 SkeletonId든 throw 없이 빌드
- `hero.ts` / `problem.ts` / `solution.ts` / `usage.ts` / `cta.ts` (498 LOC) — S2 주력 골격의 5 섹션 end-to-end 렌더링
- `index.ts` (51 LOC) — 섹션 id → renderer 매핑. `getSectionRenderer` / `hasDedicatedRenderer` / `listDedicatedSections` 노출
- `section-builder.ts` (209 LOC) — top-level orchestrator. matchSkeleton (또는 overrideSkeletonId) → sections[] 순회 → 각 renderer 호출 → 수직 stacking (Sharp). 섹션별 error isolation (실패 시 placeholder fallback, 높이 유지)

검증:
- npx tsc --noEmit 0 errors ✅
- npm run build 28/28 routes ✅
- 한글 sentinel grep 0건 ✅
- 12 SkeletonId 모두 placeholder safety net으로 end-to-end 가능 ✅

Phase 2/3 scope (Out of scope for this commit):
- 21 잔여 section renderer (material / philosophy / clinical / seasonalHook / story / package / technology / comparison / warranty / optionIntro / styledShot / eventDetails / benefits / specTable / specifications / shipping / product / options / detail / reviews / spec)
- `lifestyle-picker.ts` (LifestyleAsset 30일 cooldown + 태그 매칭)
- `/api/products/[id]/generate-detail` route + Diagnosis 연동 + Supabase Storage 업로드

Commit: `993098f` feat(automation): add 5-section detail page builder Phase 1 (Sprint 7-M2)

다음 = Sprint 7-M2 Phase 2 (21 잔여 렌더러 + lifestyle-picker).

---

## 2026-05-13 Sprint 7-M1 썸네일 자동화 4변형 완료

6개 신규 파일 1,424 LOC (`src/lib/automation/` + `src/app/api/thumbnail/[sku]/`):

- `skeleton-matcher.ts` (166 LOC) — SKELETONS 컬렉션 consuming 8축 점수화 (wildcard 0.5 / match 1.0 / mismatch 0.0). 12 골격 ranked + ambiguous flag (top 2 within 5pp). 동점 시 S2 디폴트.
- `sharp-composite.ts` (233 LOC) — Buffer 빌딩블록 8개 (canvas / fetch / fit / SVG text overlay / badge / vignette / jpeg export). SVG xmlEscape로 상품명 injection 차단.
- `cloudinary-pipeline.ts` (180 LOC) — Cloudinary *fetch-mode* URL builder. **업로드 없음**, 작업원칙 #38 strict 준수. Named preset 4개 (urlCleanWhite / WithBgRemoval / Brand / GalleryThumb).
- `copy-writer.ts` (270 LOC) — Groq Llama 3.1 8B + 다크패턴 정규식 필터 6 규칙 (scarcity / anchor-discount / superlative / authenticity / coupon-stack / emoji). 필터 hit 시 1회 retry (하드닝 프롬프트) → 결정형 fallback.
- `thumbnail-generator.ts` (395 LOC) — 4변형 orchestrate (clean / price / badge / lifestyle). 각 renderer 독립 (1 실패가 나머지에 영향 0). VARIANT_HINTS 매핑으로 골격별 권장 변형 노출.
- `/api/thumbnail/[sku]/route.ts` (180 LOC) — POST endpoint. Product 조회 (id OR sku) + 최근 Diagnosis row 의 conceptTone (또는 body override) → 4 변형 base64 JPEG 응답.

검증:
- npx tsc --noEmit 0 errors
- npm run build 28/28 routes + `/api/thumbnail/[sku]` ƒ Dynamic 등록 ✅
- 코드 내 한글 0건 (작업원칙 #29 c)
- 작업원칙 #38 — 이미지 생성 API 호출 0건, 변환(Cloudinary fetch) + 로컬 합성(Sharp)만

Commit: `9bedaaf` feat(automation): add thumbnail generator + skeleton matcher (Sprint 7-M1)

다음 = Sprint 7-M2 5섹션 상세페이지 빌더.

---

## 2026-05-13 Sprint 7-Skel 12 골격 spec 완료

13개 신규 파일 (`src/lib/automation/layout-skeletons/`):
- `index.ts` — SkeletonSpec 타입 + SKELETONS 컬렉션 + module-load 시점 invariant (section id 정합성 → grading.SKELETON_SECTIONS 1:1)
- `s1`~`s12-*.ts` — 각 SkeletonSpec 객체 export (matchSignature concept+tone 8축, sections[] id/height/layout/copyTone, totalHeight/width 860px, colorTokens, fonts, copyGlobalTone)

검증:
- npx tsc --noEmit 0 errors
- npm run build 28/28 routes 통과, index.ts invariant module-load 시 무사고
- 12개 골격 모두 grading.SKELETON_SECTIONS 매트릭스와 section id 1:1 정합
- 코드 내 한글 0건 (작업원칙 #29 c — 디자이너 노출 한글 라벨은 후속 dict 파일에서)

Commit: `a29e8c5` feat(automation): add 12 layout skeletons (Sprint 7-Skel)

다음 = Sprint 7-M1 썸네일 자동화 4변형 (clean / price / badge / lifestyle).

---

## 2026-05-12 v3.1 FINAL 채택

본 세션(docs-only commit)에서 다음 5개 MD 일괄 갱신:
- SESSION_LOG.md: v3.1 FINAL 기획 점검 entry 추가
- ROADMAP.md: Sprint X 인계 메시지 deprecated, Sprint 7-Diag 진입 메시지 활성화
- SPRINT_PLAN.md: Sprint 7 v3.1 FINAL 매트릭스 추가
- PRINCIPLES_LEARNED.md: 작업원칙 #38·#39·#40 추가
- PROGRESS.md: 본 entry 추가
- docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md: 신규 문서 보존

다음 세션 = Sprint 7-Diag MVP 코드 작업 진입.

---

---

## 핵심 인덱스

> **분할 이후 새 인덱스 (작업원칙 #31 (b), 2026-05-12)**
>
> - **작업원칙 #1~#25 (코드/UI/세션/보고)** → `docs/plan/PRINCIPLES_CODE.md`
> - **작업원칙 #26~#36 (학습된 패턴)** → `docs/plan/PRINCIPLES_LEARNED.md`
> - **Sprint 6/6.5/6-D/7/8/9+ 계획** → `docs/plan/SPRINT_PLAN.md`
> - **핵심 파일 경로 / 알려진 이슈 / SEO 인사이트 / 기술 패턴** → `docs/plan/REFERENCES.md`
>
> 본 파일 (PROGRESS.md)은 *현재 상태 스냅샷 + 진입점*만 유지합니다.

### 자주 참조하는 작업원칙 단축 인덱스

- [작업원칙 #26](PRINCIPLES_LEARNED.md) — IA 점검 + 고아 라우트 처리
- [작업원칙 #29](PRINCIPLES_LEARNED.md) — 한글 처리 절대 규칙 5가지
- [작업원칙 #29 (e++)](PRINCIPLES_LEARNED.md) — 사용자 닉네임 절대 규칙
- [작업원칙 #31](PRINCIPLES_LEARNED.md) — MD 의미 단위 자동 분할 + 인계 무결성
- [작업원칙 #32](PRINCIPLES_LEARNED.md) — TSC ≠ Production 빌드 검증
- [작업원칙 #33](PRINCIPLES_LEARNED.md) — useSearchParams Suspense 자동 점검
- [작업원칙 #34](PRINCIPLES_LEARNED.md) — 명백한 오류 파일 사용자 알림
- [작업원칙 #35](PRINCIPLES_LEARNED.md) — 한글 사전 분리 패턴
- [작업원칙 #36](PRINCIPLES_LEARNED.md) — Vercel deploy 검증 의무화
- [현재 앱 상태](#현재-앱-상태)
- [환경/메뉴/파이프라인](#환경--메뉴--파이프라인)

---

## 현재 앱 상태

| 항목 | 현황 |
|------|------|
| 전체 상품 | 2개 (모두 DRAFT — 명화송풍구 + 달항아리) |
| 네이버 Commerce API | ok=true ✅ |
| 네이버 검색광고 API | ✅ (CUSTOMER_ID: 3755315) |
| 네이버 DataLab API | ✅ ID: F7Hga62gDOYxZ3KRtLTL |
| Discord | 5채널 ✅ |
| TSC | 0 errors ✅ |
| Vercel 배포 | https://kkotium-garden.vercel.app ✅ |
| GitHub | https://github.com/kkotium-dot/kkotium-garden |
| Phase A~D | 전체 완료 ✅ |
| Phase E | 진행 중 (E-7, E-1, E-3, E-8 완료) |
| Phase E+ | Sprint 1·2·3·4·5 완료 |
| 카카오 비즈니스 채널 | 꽃틔움 KKOTIUM (`_xkfALG`) ✅ |
| 도매꾹 Private API | 28개 전체 권한 발급 ✅ (Sprint 8 보류 트랙) |
| Solapi 알림톡 | 키 미입력 (월 50건+ 시 활성화) |

### 카카오 비즈니스 채널 정보

```
채널명: 꽃틔움 KKOTIUM
검색용 ID: 꽃틔움
채널 Public ID: _xkfALG
채널 URL: http://pf.kakao.com/_xkfALG
채팅 URL: http://pf.kakao.com/_xkfALG/chat
카테고리: 쇼핑 > 생활용품
```

### AI API 키 현황 (2026-04-30 기준)

| 서비스 | 환경변수명 | 상태 |
|---|---|---|
| **Groq** (1순위) | GROQ_API_KEY (lrltQb) | 정상 ✅ |
| **Groq** | GROQ_API_KEY_3 (3IGN7i) | 정상 ✅ |
| Groq | GROQ_API_KEY_2 (3pEakT) | 401 Invalid (Vercel 삭제 권장) |
| Gemini | GEMINI_API_KEY/_2/_3 | 429 quota 초과 (운영 기여 0) |
| xAI Grok | XAI_API_KEY | 크레딧 미배정 |
| Perplexity | PERPLEXITY_API_KEY | Pro 만료 (401, 비활성) |

**fallback 순서**: Groq round-robin (3키, 401/403/JSON parse safety) → Gemini round-robin → Anthropic last-resort

---

---

## 환경 / 메뉴 / 파이프라인

### 환경 정보

```
앱 루트:    /Users/jyekkot/Desktop/kkotium-garden
Dev 서버:   http://localhost:3000
Dev 로그:   /tmp/dev.log
프로덕션:   https://kkotium-garden.vercel.app
DB:         Supabase PostgreSQL (doxfizicftgtqktmtftf)
스토어:     꽃틔움 KKOTIUM (smartstore.naver.com/kkotium)
GitHub:     https://github.com/kkotium-dot/kkotium-garden
Vercel:     vercel.com/kkotjyes-projects/kkotium-garden
카카오채널: 꽃틔움 KKOTIUM (pf.kakao.com/_xkfALG)
```

### 사이드바 메뉴 구조 (9개 섹션, 2026-05-08 확정)

```
GARDEN: 정원 일지 (/dashboard) ✅
HUNT:   꿀통 사냥터 (/crawl) ✅ + 소싱 보관함 (/crawl?tab=history) ✅ [Z-3b]
PLANT:  씨앗 심기 (/products/new) ✅ 신버전 6탭 통합 (수정 모드 ?edit=ID 포함)
TEND:   정원 창고 (/products) ✅
        검색 조련사 (/naver-seo) ✅ v3 인라인 편집
        좀비 부활소 (/products/reactivation) ✅
ORDERS: 주문 관리 (/orders) ✅
OPS:    인서트 카드 (/ops/insert-card) ✅
TOOLS:  거래처 명단 (/settings/suppliers) ✅
        배송 레시피 (/settings/shipping) ✅
        공급사 열쇠방 (/settings/supplier-login) ✅
        카카오 채널 (/settings/kakao) ✅
        네이버 기본값 (/naver-settings) ✅
```

### 사이드바 미등록 라우트 (정리 대상 — Z-3c'/Z-3e)

- `/products/[id]/edit` — 외부 진입 0건 (구버전 ProductForm.tsx 582줄, 메인 흐름은 `/products/new?edit=ID`로 통합됨)
- `/products/upload` — CSV 일괄 업로드 (새싹 단계에서 권장 안 함, 리서치 3번)
- `/products/sourced` — 카드 그리드 뷰 (사이드바 미등록)
- `/products/out-of-stock` — `:158`이 dead route `/products/[id]/edit`를 가리킴 (수정 필요)
- 백업 파일 67개 (`*.bak*`, `*.backup*`, `*.v[0-9]*`)

### 앱 파이프라인

```
꿀통 사냥터 (크롤링) → 소싱 보관함 (SOURCED→PENDING→REGISTERED)
→ 씨앗 심기 (등록/편집, 6탭 통합)
→ 정원 창고 (목록/인라인 편집)
→ 검색 조련사 (SEO 점수 + AI 최적화 + 인라인 편집)
→ 엑셀 다운로드 또는 네이버 직접 등록 (Commerce API)
→ 대시보드 (실적/꼬띠추천/이벤트)
→ 주문 관리 (발주확인/송장등록 + 알림톡)
→ 좀비 부활소 (재등록)
```

---

---

## 네이버 API 현황

| API | 상태 |
|-----|------|
| 토큰 발급 (bcryptjs) | ✅ |
| 채널 정보 | ✅ 꽃틔움 KKOTIUM |
| 주문 조회 / 발주 확인 / 송장 등록 | ✅ |
| 상품 실시간 동기화 | ✅ |
| 주소록 조회 | ✅ |
| DataLab 트렌드 | ✅ |
| 검색광고 키워드 검색량 | ✅ (CUSTOMER_ID: 3755315) |
| 리뷰 API | ❌ 미지원 (GitHub #1582) |

---

## Vercel 환경변수

```
DB:         DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
Naver:      NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, NAVER_PROXY_URL
Naver SEO:  NAVER_SEARCHAD_API_KEY, NAVER_SEARCHAD_SECRET_KEY, NAVER_SEARCHAD_CUSTOMER_ID
DataLab:    NAVER_DATALAB_CLIENT_ID, NAVER_DATALAB_CLIENT_SECRET
Discord:    DISCORD_WEBHOOK_ORDERS, _STOCK, _DAILY, _WEEKLY, _KKOTTI
AI:         GROQ_API_KEY, GROQ_API_KEY_3 (실사용 2개), GEMINI_API_KEY/_2/_3 (quota 초과)
Cloudinary: CLOUDINARY_CLOUD_NAME, _API_KEY, _API_SECRET
Etc:        CRON_SECRET, NEXT_PUBLIC_APP_URL
향후 (E-13B): SOLAPI_API_KEY, SOLAPI_API_SECRET, KAKAO_PF_ID, SENDER_PHONE_NUMBER
향후 (E-12): DISCORD_WEBHOOK_REVIEW
```

---

---

## 참고 문서 인덱스

### docs/research/
- `SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md` — 본 세션 신규 (15개 핵심 + 단계별 체크리스트)
- `COMMERCE_API_403_ROOT_CAUSE.md`
- `COMMERCE_API_ORDER_DIAGNOSIS.md`

### docs/plan/archive/
- `README.md` — archive 폴더 인덱스 (분할 정책 + 검색 패턴 + 파일명 규칙)
- `PROGRESS_2026Q2_MAY.md` — 5월 누적 PROGRESS 헤더 이력 (작업원칙 #31 분할, 동결)
- `ROADMAP_2026Q2_MAY.md` — deprecated 인계 메시지 9개 + Phase A/B/C 완료 이력 (동결)
- `ROADMAP_2026-05.md` — Session B 작업 + deprecated 인계 메시지 (2026-05-12 분할, 동결)
- `SESSION_LOG_2026Q2_MAY.md` — 2026-05-01 ~ 2026-05-06 세션 24+ 건 (동결)
- `SESSION_LOG_2026-05.md` — 2026-05-06 ~ 2026-05-08 세션 9건 (두 번째 분할 2026-05-11, 동결)
- `SESSION_LOG_2026-05-12.md` — Session B 외 8 entries (세 번째 분할 2026-05-12, 동결)
- `SESSION_LOG_2026-05-12-PM.md` — Session E-2 Phase 1~5 + 7개 (네 번째 분할 2026-05-12 PM, 동결)
- `SESSION_LOG_2026-05-13.md` — 2026-05-12 5 entries (v3.1 FINAL + v2.0 + Sprint 7 P0/P0-B/P1) (다섯 번째 분할 2026-05-13, 동결)
- `SESSION_LOG_2026-05-13-PM.md` — 2026-05-13 5 entries (Phase 2-a · Phase 1 · Sprint 7-M1 · Sprint 7-Skel · Sprint 7-Diag MVP) (여섯 번째 분할 2026-05-13 PM, Phase 3 진입 직전, 동결)

### 프로젝트 파일 (외부 리서치)
- `260413-꽃틔움 가든 개선안 검증과 2026년 전략 로드맵`
- `스마트스토어 리뷰 관리와 반품안심케어, 무엇을 먼저 할 것인가`
- `네이버 스마트스토어 파워셀러의 2025-2026 실전 무기 총정리`
- `카카오 비즈니스 채널 2025-2026 완전 가이드`
- `Smartstore_Sprout_to_Power_Seller_Workflow_Optimization_Guide__May_2026.md`
