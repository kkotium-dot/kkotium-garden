# 꽃틔움 가든 — 병행작업 트래커 (누락 0 원칙) · 최종 업데이트 2026-06-13 (rev19 · Scent→Mood 컨셉 재설계 + 생성설정 가드 + april/cotton v3·세션7-e)
---

## ★ 작업 관제탑 (LIVE BOARD · 단일 권위 · 세션 시작 필독·종료 필수 갱신)

| ID | 우선순위 | 레인 | 상태 | 의존성 | 다음 1액션 | 검증기준 |
|---|---|---|---|---|---|---|
| 6AXIS-MERGE | P1 | Code | 완료 | — | feat/mood-camera-system → main 머지·push(349b9db)·prod LIVE | production 테이블 활성·UI 정상 ✅ |
| ENG-0 | P1 | Code | 검증완료 | — | Stage 0 Desktop 독립검증 PASS(테이블6·6축 무손상·smoke 200) | tsc0·build0·테이블6 ✅ |
| ENG-L0-PROOF | P1 | Desktop | 완료 | — | DataLab 3종+search_shop 라이브 실증(50014980) | 데이터 형태 엔진가정 일치 ✅ |
| DNA-SEED-50014980 | P1 | Code | 완료 | — | category_dna 시드 적재(active·9슬롯·필수3·conf 0.7) | DB 행 LIVE ✅ |
| ENG-1-FIX-NAMING | P1 | Code | 완료 | — | Rating/PerformanceMetric generationId→slotGenerationId(#62) | schema+마이그레이션·0행보존 ✅ |
| ENG-1 | P1 | Code | 완료·검증완 | ENG-0 | Stage 1 백엔드(3a~3g)+UI(3i)·push(8964ce7)·prod LIVE·Desktop 3탭 브라우저 검증 PASS | 데이터+배포+API+브라우저 3탭(분석DNA·9슬롯보드·발행게이트·개입) PASS ✅ |
| CAPTURE-METHOD | P2 | 결정 | 결정대기 | — | 경쟁 캡처 방식 확정(권고 B 하이브리드·3h) | 대표 확정 |
| IMG-INGEST | P2 | Desktop | ✅ 검증완료 | — | April·BlackCherry web-JPEG ingested(composite·registered·publicUrl200)·AssetBrowser 3단 검증 PASS(#45·#92) / Lemon 재생성 예정·Cotton 품절후보 / 슬롯조립=Phase3 | /assets 200·composite 그룹 신규 2건·이미지탭 DOM 최신순 맨앞 ✅ |
| PUBLISH-명화 | P1 | 결정 | 결정대기 | 옵션 Cotton 상태 결정 | DB origin=중국0200037(라이브 정합·세션9 '국산' 경보=stale·#96)·ORIGIN-GATE 가드완. 옵션 DB 4 전부 ON_SALE↔의도 3(Cotton 품절 미반영=데이터 드리프트, Desktop 결정) → 안전기준 payload·대표 GO | dryRun·readiness S/94·대표 GO(비가역#46) |
| CAT-CODE-명화 | P2 | Code | 완료·검증완 | — | naverCategoryCode 50003356→50014980 정정(경로A·DB only·네이버무접촉) | dnaSource db·scent_note 등장·7슬롯('리필' lowInvolvement로 problem/size_duration 드롭, 9 아님) ✅ |
| ICE-TRAY-DNA | P2 | Code | 완료·검증완 | — | 경로B 배치(#62·#90)·push c35d64c·prod LIVE·Desktop UI 검증 PASS | item1/3/4 PASS(명화 9복원·아이스 6중립·라벨동기화·명화 준비도 S/94)·item2 zero-masking PASS(positive 렌더=idle+미시드 상품 부재로 미관측→UNSEEDED-BACKLOG-BADGE 후속) ✅ |
| UNSEEDED-BACKLOG-BADGE | P3 | Code | Stage2 백로그(후속·비긴급) | #62 | 별도 저긴급 '백로그 배지'(미시드 카테고리 N개·DNA 시드 권고) 신설 — 긴급큐 비마스킹+상시가시. branch feat/unseeded-backlog-badge | 미시드 N 집계·관제탑 상시 배지(idle 한정 아님)·전상품 #55·개입점 #56 |
| INGEST-BODY-LIMIT (B) | P4 | Code | 백로그(해결됨·저우선) | — | web-JPEG로 해결(#91). 마스터 보존 요구 발생 시에만 Supabase signed-URL 직업로드 | 현재 불필요 |
| DETAIL-PAGE-DESIGN-FEATURE (C) | P3 | Code | Phase3 계획(미착수) | Phase2 | 슬롯 조립·배치 = composite funnelSlot 태그 + SlotFunnelBoard 슬롯별 fill상태·배정 UI(펀널 plan↔asset 연결). ★Phase3 선결: /api/products/{id}/assets가 AssetRegistry 메타(variant·sourceTag·funnelSlot) 미join→슬롯배정 파일명 의존, 착수 시 join 노출 포함. branch feat/funnel-slot-fill | 계획된 다운스트림(신규 갭 아님)·전상품 #55·개입점 #56 |
| COMPOSITE-CLEANUP | P3 | Code | 백로그(권장·가역) | — | composite 20건 중 구 lifestyle/폐기 AI합성 archive 이관(잔존 선별=operator 확인·가역). Phase3 슬롯픽 UX 전 권장 | 이관 후 composite=현행 자산만 |
| REGISTRY-STORAGE-DRIFT | P3 | Code | 완료·검증완(전상품 시스템 완결) | — | 탐지(#93)+reconcile 백엔드+개입카드+per-orphan 결정 UI(카드 인라인 등록/아카이브/정리·벌크)·push f2f97ce | 데이터레인 prod 검증완(라운드트립·GET shape·matrix INPUT_DECISION)·UI 인터랙션=Desktop / 전상품 #62 완결 ✅ |
| VARIANT-COMPOSITE | P3 | Code | 완료·검증완(UI 렌더=Desktop) | — | asset_registry.variant 컬럼(마이그)+computeVariantCoverage(분모=options stock>0·#96)+variant_composite 카드(INPUT_DECISION·cron 상시)+ingest-firefly variant 바인딩·push 0b6db66 | prod 통합 PASS: 명화 active3·covered0·missing[3향]·matrix INPUT_DECISION·라운드트립(seed/바인딩 0→1→복원) ✅ |
| ORIGIN-TRUTH-GATE | P1 | Code | 완료·검증완(UI 표면화) | — | origin HARD GATE+옵션 가드+silent 폴백 제거(440ef92)+발행패널 원산지 행(evaluateOriginTruth·9d2e7f4·#56)+아이스 200037→0200037 정규화 | prod smoke 명화/아이스 gate.originTruth=pass·0200037·canRegister S/94 무회귀 ✅ |
| SEO-GOLDEN-KEYWORD-GUARD | P1 | Code | ✅ | 신규 — 상품명/태그를 datalab 검색량으로 검증 → 카테고리 1위 검색어 누락 시 '상품명 키워드 검증' 개입카드. 명화 즉시해당(차량용=검색1위어 누락·송풍구=니치 사용중). additive·비가역0·네이버 무접촉 | 미착수(백로그·E5/E6/E8과 병행 가능) |
| CUT34-EVAL | — | Desktop | 검증대기 | — | cut-3/4 = scent_note 슬롯 재배치(썸네일 아님) | 슬롯 매핑 확정 |

### 파생 큐
- 지금 큐: [Code 진행] P3 Phase3 슬롯조립 / 옵션 3표현 드리프트 reconcile(optionValues3·options jsonb4·product_options4·동근원). [Desktop] reconcile UI+variant_composite 카드 브라우저 렌더 검증(#88)·3향 컷 생성→바인딩. [결정 대기] PUBLISH-명화 Cotton 옵션. (REGISTRY-STORAGE-DRIFT·VARIANT-COMPOSITE 완결)
- 결정 대기(대표): CAPTURE-METHOD(3h) · PUBLISH-명화 2건 확인 (ICE-TRAY-DNA=검증완·종결 / UNSEEDED-BACKLOG-BADGE=Stage2 백로그)
- 검증 대기: ENG-1(브라우저 3탭) · CUT34-EVAL(슬롯 재배치)

### 엔진 프롬프트 last-mile (E1-E9 · 전상품 #62 · 권위 docs/handoff/HANDOFF_2026-06-17_engine-prompt-gap-verdict-and-consolidation-plan.md)
> 진단(Desktop #45): 6축 엔진이 resolvedPrompt 조립하나 마지막 1마일 끊김 — 두 프롬프트 엔진(System1 art-director / System2 6축) 미병합·엔진 값이 이미지에 미도달.

| ID | 우선 | 레인 | 전상품 | 작업 | 상태 |
|---|---|---|---|---|---|
| E1 | P0 | Code | ✅ | resolution→prompt(cameraClause 2K/4K 도달) | 완료·검증완(prod 4K) |
| E2 | P0 | Code | ✅ | productSubject 한글누수 제거(category-subject 영어맵) | 완료·검증완(prod ASCII100%) |
| E3 | P0 | Code | ✅ | SlotFunnelBoard full prompt+복사+추천설정카드 | 완료(데이터 검증완)·UI렌더=Desktop#88 |
| E4 | P0 | Code | ✅ | reference-aesthetic 영어절 주입(benchmarkDna는 display 유지) | 완료·검증완(prod aesthetic절) |
| E5 | P1 | Code | ✅ | per-scent/product concept input(변형별 subject) + 프롬프트 결함 A(팔레트 디폴트)·B(병 모호성) | 결함 A·B 완료·검증완 / 향별 concept 주입=다음 |
| E6 | P1 | Code | ✅ | assetization 폐루프(persistStrategy·PromptVersion·SlotGeneration↔asset 링크) | 미착수 |
| E7 | P1 | Code | ✅ | 엔진 통합(ConceptTone/role→signals·단일 프롬프트 권위·System1 retire) ★비가역=구조PR 전 Desktop/대표 확인 | 미착수(확인 게이트) |
| E8 v2 | P2 | Code | ✅ | 벤치마크 비전 리서치(한국 우선) — 소스 티어 T1 NaverSearch(search_shop/image)→T2 datalab→T3 Pinterest/Google(무드만). NaverSearch MCP=Tier1 수집 어댑터 래핑. benchmarkDna 확장(sourcePriority+commerceConvention[명품/다크오브제/선물/가격밴드]+trendKeywords). 반영 3군데(썸네일 컨벤션/상세·향배경 무드/상품명·태그 SEO). 개입=큐 '벤치마크 리서치 검토' 카드 | 미착수(E5/E6 후) |
| E9 | P2 | Code | ✅ | 프롬프트 성능학습(CTR/CVR per PromptVersion→auto-promote) | 미착수 |

> E8 v2 상세(2026-06-17 백로그·한국 우선): 소스 우선순위 티어 = T1 NaverSearch(search_shop/image, 한국 커머스 실측) → T2 datalab(트렌드/검색량) → T3 Pinterest/Google(무드 보조만). NaverSearch MCP을 Tier-1 수집 어댑터로 래핑. benchmarkDna 확장 필드 = sourcePriority + commerceConvention(명품/다크오브제/선물/가격밴드) + trendKeywords(현 한글 브랜드태그 display → 추출 디스크립터+컨벤션으로 승격). 반영 3군데: 썸네일(컨벤션)·상세/향배경(무드+오늘의집류)·상품명/태그(SEO). 개입점=대시보드 큐 '벤치마크 리서치 검토' 카드(선택·비강제 #56). E7과 별개 트랙·6축 단일권위 정합.
> ⚠️ 향 서사 v5↔v6 충돌(2026-06-17 미해결): 현 플레이북 §4(병수정 완료본)=v5(레몬 이른아침·쿨 / 코튼 한낮 하이키 / 에이프릴 비갠오후 디퓨즈 / 체리 골든아워 웜). v6 노트=레몬 완숙·웜 / 에이프릴 하이키 / 블랙체리 로우키. 3단어 요약만으론 4프롬프트 충실 재작성 불가(#46) → v6 전체 프롬프트 텍스트 확보 후 §4 갱신. "for a small bottle" 전면 제거는 확인 완료(주석 1건만 잔존).


### 변경로그
- 2026-06-17 (세션9·백로그/E8 v2+SEO 가드): E8→E8 v2(한국 우선 소스티어 T1 NaverSearch→T2 datalab→T3 Pinterest/Google·NaverSearch MCP Tier1 어댑터·benchmarkDna 확장 sourcePriority/commerceConvention/trendKeywords·반영 3군데 썸네일/상세향배경/상품명태그). 신규 SEO-GOLDEN-KEYWORD-GUARD(P1·전상품·datalab 검색량 검증→1위어 누락 시 '상품명 키워드 검증' 카드·명화 즉시해당 차량용누락/송풍구니치·additive·비가역0·네이버무접촉). 둘 다 미착수 백로그. 향 서사 v5/v6 충돌은 미해결 유지(v6 전체텍스트 대기).
- 2026-06-17 (세션9·Code/프롬프트 결함 A·B·#62): E5 선행 2결함. A=palette 빈값 'in natural' 폴백 제거(MoodAxisData.palette 영문 6무드+assembler axis.palette 폴백+referenceAesthetic 빈값 절 drop). B=병 모호성('for a small bottle'→'no bottle, no container... reserved for later product compositing' positive·#86)·플레이북 §4 4향+구도+spec-data PRODUCT_MARGIN_BLOCK 신설. push ef44fe2. prod 검증 명화 9슬롯 'in natural' 0건·mood palette 정상. repo 'for a small bottle' 잔존0. test 갱신. 향별 concept 주입(E5 본체)·E6·P2=다음.
- 2026-06-17 (세션9·Code/ENGINE-PROMPT E1-E4·#62): Desktop engine-prompt-gap 감사 반영. E1 resolution→prompt·E2 한글 subject 누수제거(category-subject 영어맵)·E3 슬롯보드 full prompt+복사+추천설정카드(engine/strategy 응답 full resolvedPrompt+resolution)·E4 reference-aesthetic 영어절 주입(benchmarkDna display 유지). push 8eadbbb. prod 검증: 명화 슬롯 full prompt 695자·4K·ASCII100%(영어 subject 'car air-vent fragrance diffuser')·aesthetic절. E5-E9 로드맵 등재(E7 비가역=구조PR 전 확인). E3 UI 렌더=Desktop #88.
- 2026-06-17 (세션9·Code/QUEUE-MASKING-FIX·P0·#56): Desktop 적발 — 명화 registry_drift+variant_composite 2개 awaiting_human인데 대기열 variant 1개만 렌더(자산 정합 마스킹). 근본=상품당 1카드(route interventionById 첫잡만·ControlTowerRow.actionQueue 단수·widget map). 수정=route 전체수집(타입dedup·primary+extra)·ControlTowerRow.extraQueue·widget flatMap·key=pid+type·응답매핑 extraQueue 추가(2커밋 a91156d). prod 검증 PASS: 명화 2카드[variant_composite+registry_drift]·아이스/달항 단일 무변경. 원칙 #100 박제(#90 동형 비마스킹).
- 2026-06-17 (세션9·Code/VARIANT-COMPOSITE·#62 P2): Desktop 감사(명화 3향 커버리지 0/3·바인딩 계층 전무) 스펙 구현. asset_registry.variant 컬럼(Supabase 마이그 add_asset_registry_variant·additive)+Prisma. computeVariantCoverage(분모=Product.options jsonb stockQuantity>0=진실원천·#96, product_options 테이블 stale 4 아님·코튼 stock0 제외=active3)+syncVariantCompositeCard. INTERVENTION_VARIANT_COMPOSITE 카드(control-tower INPUT_DECISION·이미지탭 딥링크·label N/M·cron 전상품 상시). ingest-firefly variant param(생성물→향 바인딩)+적재 후 재동기화. widget 라벨+상세. push 0b6db66. prod 통합 PASS(명화 active3·covered0·missing[3향]·matrix·라운드트립 바인딩 0→1→복원). 옵션 3표현 드리프트 reconcile=별도 과제(동근원).
- 2026-06-17 (세션9·Code/per-orphan reconcile UI): registry_drift 카드 actionable 완성(#56 루프). RegistryDriftReconcile(카드 인라인) — '고아 검토·정리'→GET drift→storage-only(등록/아카이브 per-row+벌크)·registry-only(정리 per-row+벌크)→POST reconcile(confirm)→reconciled 시 카드 자동 clear. ko.json 13키. push f2f97ce. prod GET shape 검증(storageOnly 22·{path,stage}·registryOnly botanical·컴포넌트 소비가능). 데이터레인 검증완·UI 인터랙션=Desktop. REGISTRY-STORAGE-DRIFT 전상품 시스템(탐지·reconcile·카드·결정UI) 완결.
- 2026-06-17 (세션9·Code/registry_drift 개입카드): reconcile 백엔드에 운영자 결정 카드 표면화. INTERVENTION_REGISTRY_DRIFT 타입+payload·control-tower INPUT_DECISION(이미지탭 딥링크)·asset-integrity route+cron 2카드 독립 시드(asset_integrity ok게이트 / registry_drift reconciled게이트·ok 상품도 평가)·matrix widget 라벨+상세칩. push 78f8a90. prod 통합 PASS(명화 seed→matrix actionQueue registry_drift INPUT_DECISION·딥링크 확인·카드 라운드트립 seed/멱등/clear). per-orphan 등록vs아카이브 결정 UI(자산탭)=후속. 위젯 렌더=Desktop 브라우저 검증 대상.
- 2026-06-17 (세션9·Code/origin-UI+reconcile): (a) 발행패널 원산지 진실성 행 — evaluateOriginTruth 헬퍼 추출(validateForRegistration+strategy 게이트 단일 진실원천)·EngineGateView.originTruth·PrePublishGatePanel 행(통과/치유경고/차단)·9d2e7f4·#56 갭 해소. prod smoke 명화/아이스 gate.originTruth=pass. (b) 아이스 originCode 200037→0200037 정규 저장+naver_origin 중국(가역·heal→pass 확인). (P2) reconcileRegistryDrift 백엔드(register/archive/clearRegistry·confirm게이트·라이브 고아만)·route 'reconcile'·952ed61. prod 라운드트립 PASS(register 22→21·멱등0·복원22·파일무접촉)·route smoke no-op LIVE. 개입카드 UI=다음(브라우저). Desktop origin-gate 검증 핸드오프 보존.
- 2026-06-17 (세션9·Code/ORIGIN-TRUTH-GATE·#95): 원산지 진실 게이트(전상품) — validateForRegistration에 origin HARD BLOCK(미상/무효·추측금지) + 치유 WARNING + 옵션 정합 가드. buildNaverProductPayload/register route의 silent 중국폴백 '0200037' 제거(빈 origin loud throw). push 440ef92·verify OK·prod smoke 명화 canRegister=true·S/94 무회귀. Desktop #45 반영: DB origin=중국0200037 라이브 정합 → '국산/4' 경보=stale(#96 코드 의심 전 DB 실측). 옵션 DB 4 전부 ON_SALE(Cotton 품절 미반영=데이터 드리프트). product_options=relation·발행경로 include 확인(소실 버그 없음). 원칙 #95·#96·#97 박제.
- 2026-06-17 (세션9·Code/REGISTRY-STORAGE-DRIFT): 핸드오프 2건 git 보존(ba09a28·#49). checkProductIntegrity에 registry 교차 차원 확장(#93·#94)+listProductStageFolders. push b40a711·verify-deploy OK·prod API smoke registryDrift LIVE. 검증 3-tier(로컬 데이터레인·tsc0/build0/test PASS·prod API): 명화 registryOnly=1(botanical 파일부재 정확)·storageOnly composite9(핸드오프 ground-truth 정밀일치)·undefinedStages0(plate=STAGE_DIRS v2 내, #94 우려 코드레벨 기해소 교차검증) / 달항아리9 / 아이스1 = 전상품 드리프트 thesis 확인. ok=true 전건(advisory·스턱카드0). ENG-1 검증완 반영(핸드오프 §5). 원칙 #93·#94 박제.
- 2026-06-16: 엔진 codify. IMG-앱→완료(preview), IMG-컷34→cut-3/4 생성·평가완(향노트 슬롯 판정). 관제탑 체계 신설(#87~#89).
- 2026-06-16 (Code/ENG-0): Stage 0 build done — Prisma 6 models applied (category_dna / slot_plan / prompt_version / slot_generation / rating / performance_metric), DataLab 8 endpoints, thumbnail policy gate + unit test 6/6 PASS. Engine 'Generation' -> slot_generation (collision avoid). tsc0 / build0. ENG-0 TODO -> verified-pending (#88).
- 2026-06-17 (Code/ENG-1): 6AXIS-MERGE GO — feat/mood-camera-system → main fast-forward·push(349b9db)·prod LIVE. Stage 1 빌드 완료(2 commits): 26f8560 백엔드 + 8964ce7 UI, push(8964ce7)·prod 검증 OK·/studio 200·engine route 200.
- 2026-06-17 (Code/ENG-1 상세): 3a 명명정렬(slotGenerationId·마이그레이션 0행보존) · 3b CategoryDna 로더+50014980 시드(active) · 3c 9슬롯 결정테이블 · 3d 전략조립기(6축 assemblePrompt 재사용·신설0) · 3e 모델라우팅 · 3f 개입 dna_confirm/variant_select(additive) · 3g 썸네일정책→publish-readiness 배선(옵셔널·회귀0) · 3i UI(DNA카드·9슬롯 퍼널보드·발행 게이트패널·1 fetch). 테스트 11 PASS. tsc0/build0/이모지0/한글리터럴0/비가역0/네이버무접촉.
- 2026-06-17 (발견·CAT-CODE-명화): 명화 product naverCategoryCode=50003356 ≠ DNA 시드 50014980 → 명화는 현재 DNA fallback(none·범용 9슬롯). 정합 필요(재분류 또는 50003356 DNA 시드).
- 2026-06-17 (Code/CAT-CODE-명화 종결·경로A): Product.naverCategoryCode 50003356(실내 아로마방향제/디퓨저·오분류)→50014980(차량용방향제·정답) 정정. cmpnooli40001f0gveaxr8iim·DB only·네이버무접촉. 검증: strategy 재호출 dnaSource none→db·mandatory[scent_note,use_install,trust]·scent_note 등장. 슬롯 4→7(9 아님: 상품명 '본품리필'→lowInvolvement로 problem·size_duration 드롭). 영향: 발행 payload leafCategoryId=50014980(register/route.ts:128)·category 속성셋은 앱이 payload 미주입(이 변경과 무관)·product.category 텍스트필드 '아로마방향제/디퓨저' 잔존(deriveProductSignals/표시용·payload 무관, 별도 정합 대상).
- 2026-06-17 (조사·ICE-TRAY-DNA #62): 아이스트레이 50005257 향수슬롯 렌더 = 50014980 오상속 아님. 근본원인 = emptyCard() 기본 slotSequence(category-dna.ts:228-238)가 scent_note 포함 향수편향 → 50005257 등 미시드 전 카테고리가 scent_note 상속. dnaSource none 실측(category_dna 행=50014980 1건뿐·seed 0). 수정안: (A)50005257 전용 DNA 재시드 (B)emptyCard 기본열 중립화(scent_note 제거=전상품 #62 근본). 코드변경=승인게이트 대기.
- 2026-06-17 (Code/#62 배치·경로B·전부 가역·additive·네이버무접촉): (1)emptyCard 중립화 — 기본열에서 scent_note/use_install/size_duration 제거→[hero,problem,solution_usp,trust,gift,cta] 6슬롯 중립폴백. (2)미시드 개입카드 — category_dna_unseeded(intervention.ts 타입+payload·control-tower idle priority 점화·strings·matrix label·matrix route dnaUnseeded 배치). (3)signal 가드 — deriveProductSignals: 리필+본품/선물이면 lowInvolvement 미발화(키워드 JSON refillTerms/commodityHard/bundleAnchor). (4)category 동기화 — src/lib/naver/category-sync.ts 헬퍼(전상품·naverCategoryCode→leaf)+명화 category DB '차량용방향제' 동기화. 검증 tsc0·build0·이모지0·신규한글리터럴0·prisma싱글톤·테스트 11 PASS·로컬실증(명화 9복원 scent_note 포함·아이스 6중립 향0·순수소모품 가드예외). PRINCIPLES_LEARNED #90 박제.
- 2026-06-17 (Code/#62 prod 검증 PASS): push c35d64c·verify-vercel-deploy OK(production=c35d64c). /api/engine/strategy 3상품 prod 재호출 — 명화(50014980) dnaSource db·9슬롯·scent_note O / 아이스트레이(50005257) none·6중립·scent_note X / 달항아리(50000963) none·6중립·scent_note X. 데이터레인 검증완(#88), 관제탑 개입카드 UI = Desktop 브라우저 실측 잔여.
- 2026-06-17 (Desktop/#62 UI 검증 PASS): item1/3/4 PASS(명화 9슬롯 복원·아이스트레이 6중립·라벨 동기화·명화 준비도 S/94). item2 미시드 카드 zero-masking PASS, positive 렌더는 idle+미시드 상품 부재로 미관측. ICE-TRAY-DNA 종결(#88). 후속 UNSEEDED-BACKLOG-BADGE(저긴급 상시 배지·긴급큐 비마스킹·상시가시) Stage 2 등재(branch feat/unseeded-backlog-badge·#55·#56).
- 2026-06-17 (정정·docs only): IMG cut 라벨 뒤바뀜 교정 — 6축 full-res 평가완 2건 = cut-3 April Fresh(0fc97780)·cut-4 Black Cherry(062339cc)(Adobe GenAIAsset 2026-06-16 최신 2건=전부). cut-1 Lemon·cut-2 Cotton은 2026-06-13 구버전(6축 이전)만 존재·6축 미생성. IMG-컷34 행이 정확(불변). 향노트 ingest 대상=April·Black Cherry, Lemon 재생성 예정, Cotton 품절후보. PROGRESS 세션8-Desktop·트래커 IMG-INGEST/IMG-앱 블록 반영.
- 2026-06-17 (IMG-INGEST 진행·docs): April(composite/fresh-1781657005726.jpg)·Black Cherry(composite/dark_luxury-1781657008705.jpg) web-JPEG 1456×1807 ingest 성공·registered·publicUrl 200(독립검증). full-res Vercel 413→web-JPEG 폴백(원칙 #91). 검증=AssetBrowser 다음 턴. 단계 명문화(ROADMAP): 이미지=Phase2·슬롯조립=Phase3(계획·다운스트림·신규 갭 아님). 백로그 (A)UNSEEDED-BACKLOG-BADGE·(B)INGEST-BODY-LIMIT(web로 해결·저우선)·(C)DETAIL-PAGE-DESIGN-FEATURE(Phase3·branch feat/funnel-slot-fill) 등재.
- 2026-06-17 (IMG-INGEST 검증완료·#45·#92): AssetBrowser 3단 PASS — /assets 200·composite 그룹 신규 2건(April·Black Cherry)·이미지 탭 DOM 최신순 맨앞. 검증경로=상품선택→이미지탭(전상품 레시피·신규 #92). IMG-INGEST 종결. 백로그 (C) 스펙 보강(AssetRegistry 메타 variant/sourceTag/funnelSlot join=Phase3 선결)·신규 COMPOSITE-CLEANUP(P3·구 lifestyle/폐기합성 archive 이관 권장·가역).

---

## rev22 세션7-i-Code (2026-06-14 Code) — 내용인식 분류 + IA 3탭 + 한글화 + 인앱삭제
## rev23 세션7-i-fix1~5-Code (2026-06-15 Code) — 누끼신호 교정·백필 종결·STALE 근본수정·정합 가드·워크플로 rev2
- ✅ **fix1 분류기 누끼 신호(#78)**: cutout=hasAlpha→실제 투명(stats().isOpaque===false). 3경로 일원화·sharp 7/7 PASS. 삭제 모달 UX.
- ✅ **item1 레거시 백필 종결(#79)**: 20파일/3상품 root→정규 stage 이동·원본 archive 백업·DB ref EXHAUSTIVE 전수스캔(중첩jsonb 포함, 하드코딩 컬럼리스트 폐기)·잔존 depth-2 ref=0. quality_reasons dangling 1건 적발·교정.
- ✅ **#80 /assets STALE 근본수정**: getServerClient global.fetch no-store(전 Storage read 라이브)+route fetchCache. production 검증 명화 41·depth-2 0(stale 22 소거).
- ✅ **#81 자산 정합 가드(시스템 신규)**: checkProductIntegrity(라이브 depth-2·dead ref·선택 비율) → control-tower asset_integrity 카드 시드/clear(멱등·best-effort·강제모달0)·1클릭 교정(confirm #46)·cron 상시 스윕. **production 검증: 3상품 전부 ok(depth-2 0·dead 0) 클린**. 드리프트 round-trip PASS.
- ✅ **워크플로 rev2(docs)**: docs/design/PRODUCT_REGISTRATION_WORKFLOW.md — 자산폴더v2·분류/비율·realism lane·Firefly자동화·상시가드(#79/#80/#81)·작업원칙·체크리스트 codify.
- ✅ **검증**: tsc0·build0·이모지0·prisma 싱글톤·sentinel clean·외부 image API 0(Sharp만)·네이버 무접촉·additive·비가역0(교정만 confirm). 박제 §8.7~8.11 + #78~#81.
- ⏳ **다음(ACTIVE)**: [Desktop] item2 Firefly 4컷 생성→누끼합성 / item3 발행(네이버 v2 FULL REPLACE·#57). 관제탑 정합 카드 부재 확인 + (선택)드리프트 주입 검증.

- ✅ **task1 내용인식 분류**: classifyAsset(asset-classify.ts) 파일명 힌트 + Sharp 메타(alpha/비율/해상도). /assets/upload·/ingest-firefly confidence+qualityFlags+conflict. preflight /assets/classify. 칩 표시.
- ✅ **task2 IA 5→3탭**: WorkbenchTabs grouped(상품분석/이미지/발행). opt-in·폴백·회귀0.
- ✅ **task3 한글화**: 단계/배경판/참고 이미지/자동 분류/이 단계로 올리기/폴더 경로 복사/원본/이전 방식. ko.json 음차 0.
- ✅ **task4 인앱 삭제**: /assets/action delete·2단계 게이트·비가역#46·registry 제거·대표 차단·추가 de-ref.
- ✅ **task5 #73 박제** + Desktop 브라우저 검증(task2/4/5) 결과 반영.
- ✅ **검증**: tsc0·build0·이모지0·UI한글/코드영어·비가역0·네이버 무접촉.
- ⏳ **다음**: [Desktop] 3탭·내용인식 칩·인앱삭제 브라우저 검증.

## rev21 세션7-h-Code (2026-06-14 Code) — 적응형 이미지 엔진 + 폴더 백필 시스템
- ✅ **분류기 결함 A·B 수정**: kindForSource backdrop→plate(GO결정#2)·archive 선행(GO결정#3). 전상품·미래파일.
- ✅ **task2 비율 2층방어**: config/image-slot-matrix.ts + images/slot-ratio.ts(conformToSlotRatio). /assets/upload·/ingest-firefly 양경로 — composite4:5·thumbnail1:1·2%게이트·옵트아웃.
- ✅ **task3·4·5**: 설정 config화 / AssetBrowser 추론칩+오버라이드 / download-naming + ZIP 내보내기(/assets/export·zip-store STORE).
- ✅ **task1 백필 dry-run**: backfill-legacy-assets.ts 20건/3상품(Desktop 스펙 일치). 이중게이트·멱등·COPY→DB→검증→retire. **운영자 GO 대기·미실행**.
- ✅ **검증**: tsc0·build0·이모지0·한글리터럴0·비가역0·네이버 무접촉. #72 박제.
- ⏳ **다음**: [운영자] dry-run 검토→GO→`--go --confirm`. [Code] 실행·검증.

## rev20 세션7-g-Code (2026-06-13 Code) — #71 사실성 레인 박제 + 향씬 실사정정 + realism_lane 스펙
- ✅ **#71 박제**: '진짜 예술은 진짜로(Authenticity Realism Lane)' — PRINCIPLES_LEARNED.md(#69↔#74 사이) + CLAUDE.md §7. AUTHENTIC-ART(라벨·S5)=퍼블릭도메인 실제 작품만, PHOTOREAL(히어로·향씬·합성·썸네일·추가)=실사 카메라·AI 회화 금지, 비명화 보편(#55).
- ✅ **HTML 실사정정**: myeonghwa_detail_v2.html .scent-visual 4향 → '실사 정물 — [장면]', 히어로 tag-a → '실사 프리미엄 환경(벽면 실제 모네 액자·퍼블릭도메인)'. Python 경유.
- ✅ **realism_lane 가드 스펙**: docs/design/REALISM_LANE_GUARD_SPEC_2026-06-13.md(코드 별도 턴) — 슬롯 realism_lane 파생 + PHOTOREAL 회화마감 경고(#56 동형·강제모달 0)·AUTHENTIC-ART 퍼블릭도메인 게이트.
- ✅ **검증**: tsc0·build0·이모지0·한글리터럴0·sentinel clean·네이버 무접촉·외부 image API 0.
- ⏳ **다음**: [Code] realism_lane 가드 구현 턴. [Desktop] 4컷 실사 생성→팔레트 정합→누끼합성.

## rev19 세션7-e (2026-06-13 Desktop) — 그라운딩 ON 시도 + 생성설정 진단 + Scent→Mood 재설계 + april/cotton v3
- ✅ **캡처 진단**: Firefly 생성바 미설정(비율 자동·해상도 1K·그라운딩 OFF·참조 잠금) — 운영자 지적 정확.
- ✅ **근본진단**: cotton 린넨같음 = 프롬프트가 사물(linen stack) 묘사 탓·april=잡초밭. 컨셉이 향 무드가 아니라 사물이었음.
- ✅ **전상품 시스템화**: docs/design/SCENT_MOOD_BACKGROUND_SYSTEM.md — 규칙A(배경=가치/감각 무드)·규칙B(생성설정 체크리스트)·앱 개입점(firefly_auto settingsVerified).
- ✅ **april_v3/cotton_v3 Scent→Mood 재생성**: composite/lifestyle-1781357077702(2.88MB)·1781357121767(3.10MB) 적재·SQL 3-tier. 그라운딩 sp-switch checked set.
- ⏳ **다음**: [운영자] v3 시각확인 / [Desktop] 통과 시 누끼합성·미흡 시 16:9+2K+그라운딩 확정 재생성 / [Code] firefly_auto settingsVerified 서브체크 박제.

## rev18 세션7-d (2026-06-13 Desktop) — 5컷 시각확인 + 모드가드 정정 + 그라운딩 채택 + april/cotton v2
- ✅ **5컷 시각판정**(운영자): hero/lemon/blackcherry 양호, april/cotton AI 이질감 → 재작업.
- ✅ **모드가드 갭 발견·정정(#77)**: 원본 가드가 라이브 편집상태서 ambiguous 반환(genBtn ^생성$ 앵커 불일치+편집신호 미포착). 철학 정정: view=edit 자체는 안전, 마스크/선택영역/참조잠금 활성만 ABORT. 검증판 kkAssertGenerateMode 박제.
- ✅ **Gemini 구글검색 그라운딩 채택**: 구조 사실감(차량 통풍구) 향상·경계 #75(제품=실사누끼). 토글 DOM 미노출(플라이아웃 추정).
- ✅ **april/cotton v2 재생성**: 업그레이드 프롬프트(3-layer·물리적무게·네거티브·광학) → composite/lifestyle-1781353115792(2.79MB)·1781353155107(2.83MB) 적재·SQL 3-tier. 교훈: 클린컴포저 자동화미작동·view=edit가 검증환경.
- ⏳ **다음**: [운영자] april/cotton v2 시각확인 / [Desktop] 통과 시 누끼합성+하모나이즈·미흡 시 그라운딩 ON 재생성 / [Code] #77 정정 가드철학(마스크만 ABORT) 반영.
- ⏳ **병렬**: 명화 상세 v3 + 참고링크→상세 자동개선 프레임워크(일반화 보류). 신규문서 docs/playbook/FIREFLY_GROUNDING_AND_QUALITY_UPGRADE_2026-06-13.md.

## rev17 세션7-c (2026-06-13 Desktop) — Firefly 5컷 end-to-end 완주 + 모드 가드 #77
- ✅ **5컷 적재 완주**: hero+4향(lemon/april/cotton/blackcherry) 전부 POST 200 → Supabase {pid}/composite/ 적재. SQL storage.objects 3-tier 검증(바이트 일치: 1755276/2136970/2054605/1835270/2302151).
- ✅ **CORS 게이트 해소**: Code 63fbcb6(OPTIONS+ACAO) production 확인 → cross-origin POST 통과.
- ✅ **모드 가드 #77 박제**(운영자 편집모드 우려 근본대응): editTools 버튼 존재≠편집모드(view=edit 상시노출), 진짜 신호=referenceLoaded/마스크/버튼라벨. perceptual hash minHamming 19/64 → 5컷 정상 생성 확정(손상0). playbook §8(kkAssertGenerateMode·사전 ABORT·사후 hash·firefly_auto generateModeConfirmed 게이트). 전상품 공통.
- ⏳ **다음**: [Code] #77 PRINCIPLES_LEARNED+CLAUDE.md 박제 + firefly_auto generateModeConfirmed 게이트(additive) / [Desktop] Sharp 누끼합성(Layer C)→Nano Banana 하모나이즈→썸네일·상세 활용.
- ⏳ **병렬**: 명화 상세 v3 재설계(docs/design/myeonghwa_detail_v3.html — a-scent 17섹션 매핑·4향 노트카드).

## rev16 세션7 (2026-06-13 Desktop) — 리서치 박제 + Firefly 근사완전자동 실측
- ✅ **리서치 박제**: docs/research/REFERENCE_DETAIL_TEARDOWN_ascent_2026-06-13.md (a-scent 17장 시각해부 + 경쟁사 교차 + 네이버 SEO/CRO + 명화 17섹션 재설계 + 4향 노트·페어링 + 샷리스트9). 한글 무결성 검증완(sentinel 0).
- ✅ **Firefly 자동화 돌파구(#74 SUPERSEDE)**: 브라우저 실측으로 (a)shadow-walk 353호스트 관통 textarea·생성·다운로드 포착 (b)native setter+InputEvent 프롬프트 주입 유지(stuck:true) (c)blob 결과→fetch arrayBuffer 추출(2.45MB PNG 유효) 전부 확인. 구#74(programmatic 주입 폐기)는 단순 .value= 방식 한정 → 정정방식이면 자동화 성립. 권위문서 docs/playbook/FIREFLY_AUTOMATION_PLAYBOOK_2026-06-13.md.
- ⏳ **다음 1액션**: [Code] POST /api/products/[id]/ingest-firefly (base64→uploadAutomationAsset→{pid}/{stage}/) 빌드 = Firefly 적재 catch-basin. 이게 생성 루프보다 먼저(두 번 측정 한 번 자른다). 완성 후 [Desktop] 1컷 end-to-end 실측(생성 트리거·폴링 확정) → 5컷 일괄 루프.
- 미실행(정직#46): 생성 버튼 click·폴링은 크레딧 소비 회피로 이번 세션 미실행 → ingest 엔드포인트 완성 후 1컷서 확정.

# 꽃틔움 가든 — 병행작업 트래커 (누락 0 원칙) · 이전 헤더 (rev15 · composite=0 P0 종결·3-tier LIVE 검증·세션6-c)

> 대표 상시 지시: 요청 개선사항·병행작업 항상 누락 없이 추적. 매 세션 갱신. Desktop 상시 유지. #54·#55·#56 준수.

## 앱 적용 현황 (2026-06-12 세션6 · image-studio 병합·production LIVE)
3계층 상태:
- **DB LIVE** (production Supabase 반영완): Product.fidelity 컬럼 + 명화 카드 완성(scents 4향·mountMechanic 포함) / asset_registry 테이블 / product_asset_objects 함수(service_role).
- **production code LIVE** (main fa9ad01·Vercel READY): C-5 자산브라우저·적재 taxonomy v2(8스테이지)·STAGE_NAMING·AssetRegistry 인테이크·fidelity_check/mount_check 게이트·충실도 프롬프트 주입·refetch #62. **단 Desktop 실사용 검증 대기(#63)** — 병합완료지만 브라우저 통과 전.
- **별도 세션 미착수**: asset-hygiene/main(desktop-filer·기존파일 reorg·고아탐지) · origin-integrity.
- ✅ composite=0 P0 종결·검증완(LIVE): production 619dbff에서 /assets composite=9(x-vercel-cache MISS)·SQL storage.objects composite 9 1:1·/studio 에셋탭 고유 composite 9썸네일 LIVE 렌더(naturalWidth>0) = 3-tier 전부 통과(Desktop 세션6-c). 근본원인=§5 2행 no-slash list버그 확정(env키 drift 배제·cutout=3 상시정상)·§3 trailing-slash 자가치유(#67)로 영구복구. probe 라우트 삭제완. 앱적용 4계층 전부 LIVE: DB 9건 / code / 실사용검증 / 표시.

## 상태 (실측 기준)
| # | 항목 | 상태 | 다음 |
|---|---|---|---|
| 1 | 명화 대표 v2 → curated | ✅ DONE·검증완 | — |
| 2 | 풀해상 상세 캡처(전상품) | ✅ DONE — 명화·달항아리(860x2294)·아이스트레이(860x2480) 전부 확보 | — |
| 3 | 인제스트 supplier_product_code 항상 캡처 | ✅ DONE(parse-dome-no 폴백) | — |
| 4 | 2갈래 실품질 라우팅(A/A_EXTRACT/MIXED/B) | ✅ DONE·검증완 | — |
| 5 | 명화 상세 Branch A(공급사 그대로 채택) | ✅ DONE·검증완(detail=curated) | — |
| 6 | **상세 생성 엔진 Track 2 (Branch B)** | ☐ Code 착수(경로 A) | **상품정체성 기준** 7섹션 생성. 레퍼런스=docs/design/aroma_L3_detail_reference.html + ADAPTIVE_IMAGE_SEO_ENGINE.md |
| 6b | **상세 1차 틀 (aroma L3 정식 레퍼런스)** | ✅ 개선완 (주석버그·모바일16px·리뷰슬롯·sticky CTA + §7.2 전프리셋 토큰) | 대표 컨펌 → S2/S4 빌드업(Firefly/Met CC0 → Canva/Figma 860px) |
| 6i | **명화 상세 S3 v2 인스턴스 (시안)** | 🟢 빌드 완료(시안) — docs/design/myeonghwa_detail_v2.html | v2 4향·하루의시간 아크(아침->낮->해질녘->밤) 7섹션, aroma L3 프리셋 기반 명화 전용 인스턴스. title=명화 디퓨저 상세·aroma L3·v2. 대표 컨펌 → 860px 양산(Canva/Figma) 빌드업. 코튼어라운드=품절이나 상세 라인업 포함(세션3 결정 정합) |
| 6c | (폐기) 브랜드-프론트 시안들(TEST_branchB / 1차틀_productID) | 폐기 | aroma_L3_detail_reference가 정식 대체 |
| 6d | **적응형 이미지·SEO·ROI 카피 엔진 문서화** | ✅ DONE(docs/design/ADAPTIVE_IMAGE_SEO_ENGINE.md) | — |
| 6e | **프리셋 시스템 앱 구현 (Phase A/B)** | ✅ DONE·실측완 (A·B-1·B-2·B-3) | 전부 배포·라이브검증. B-2 seo-guard(orthogonal true·이름 warn/S·카테고리 pass·대표 white-bg fail)·B-3 generate(aroma/l3·추천일치·7섹션 scents3/specRows5/values3·grounded·슬롯/잠금 정확) |
| 6g | **앱 전역 title + 브랜드 오타 교정** | ✅ DONE·검증완 | title="꽃틔움 가든" 정상(reload 후 실측). 브랜드 오타 8곳/7파일 교정(eef3ce1·9f90faf·aa7e5b9) + layout.rtf 제거 |
| 6h | **명화 대표이미지 정책 결정(가죽 유지)** | 결정완 — override 1호 사례 | 대표님 결정: 가죽 라이프스타일컷 대표 유지(전환율 우선). seo-guard white_bg fail은 차단 아닌 권고 → main_image_policy=lifestyle_intended로 info 강등 예정(C-4). 누끼는 명화 단건이 아니라 전상품 기능으로 분리(아래 누끼/크롭 시스템) |
| 6f | **전상품 프리셋 배정 정합** | ✅ DONE·실측 | 명화=aroma/L3 · 달항아리=tradition/L3(기본값에서 교정) · 아이스트레이=kitchen/L1. item3 컬럼 존재 교차검증 완 |
| 7 | 아틀리에 2단계 — 우측 스크롤 교정 | ✅ DONE·검증완(max-h 1005·overscroll contain·클립0·바닥도달) | — |
| 8 | 아틀리에 2단계 — job 생명주기(취소/재시도/되돌아가) | ✅ DONE·검증완(reopen→cancel 루프 200) | — |
| 9 | 아틀리에 2단계 — P4 공유카드 배지·전 /studio 토큰정렬·헤더 applyStatus 미러 | ☐ 후속 | Code |
| 10 | 개입대기열 2차(deepLink 정합)·3차(외부인증 Chrome MCP 반자동 #52) | ☐ 후속 | Code |
| 11 | applyStatus 정확성 · nextAction↔큐 정합 | ✅ DONE·검증완 | — |
| 12 | 명화 발행(SUSPENSION→큐레이션 완료, 발행 GO) | ⏸ GO 대기(비가역 #46)·발행 비행전 점검완(세션3) | publish-preview canPublish=true·payload statusType=SALE·HB 안전번호 2종 포함. ★대표 확인 필수 2건(전체교체 PUT·inspect 실측): (1)원산지 라이브 네이버=중국산(0200037) vs payload=국산(00) → 미검증 국산발행=허위표시 리스크(대외무역법/관세법) (2)옵션 라이브 3종 vs payload 4종 → 코튼어라운드(4번째)=품절처리(재고0)·상세페이지 포함 결정(세션3). SUSPENSION 유력원인=안전기준 신고 부재→payload HB로 해소. HB19-12-1462 / HB21-12-2572 |
| 13 | Branch A SEO/ROI 보강 자동화 | ☐ 후속 | Code(공급사 상세 + 미달요소 보강) |

## 누끼 + 크롭 마무리 시스템 (신규, 2026-06-09)
권한 = docs/design/REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md · 빌드 = docs/plan/CUTOUT_CROP_FEATURE_BUILD_PLAN.md. 각 청크 = 새 채팅 1개.
| ID | 작업 | 상태 | 비고 |
|---|---|---|---|
| F-진단 | 코드 실측(크롭 완성·누끼 갭) | ✅ DONE(데스크톱) | thumb-crop=완성 / bg_clean=seed만·executor 없음 / seo-guard fail 미연결 |
| C-1 | 인앱 SIMPLE 누끼(sharp 흰배경 평탄화) + /white-bg 라우트 | ✅ DONE (feat/white-bg-simple 2ff4a77) · Desktop 코드검증완 · ⏸ production 미반영(병합대기) | bg-difficulty/white-bg/route 3파일+CropWarning 확장 read — 로직 정합·공유가드·BACKGROUND_NOT_WHITE 정직플래그(#46)·가역. composite-pipeline에 흡수됨. 라이브 smoke=머지 후 C-6 |
| C-2 | 어도비 누끼 적용 executor /apply-cutout | ✅ DONE (feat/composite-pipeline cdbb423, tsc0/build) | cutoutUrl→흰배경 합성·가드·적용, bg_clean done 전이. 병렬 가능 |
| C-3 | finish-image 단일 라우터 + 스키마(extra_images·main_image_policy) | ✅ DONE·병합완·production 라이브 (main a089b12 READY) | 난이도 분기 dispatch(SIMPLE→인앱 white-bg·COMPLEX→bg_clean seed+apply-cutout 안내)·main_image_policy lifestyle_intended 소비(COMPLEX+lifestyle+자기대표=dispatch:none·policyHeld·허위 seed 차단 #46)·keepAsExtra 이전대표 보관. 스키마=C-4/C-7 마이그레이션 소비만. 회귀0. Desktop dry-run 재검증 기대: 명화(가죽)=dispatch:none·policyHeld:true |
| C-4 | seo-guard→개입대기열 연결 + override 강등 | ✅ DONE·라이브검증완(세션3) | lifestyle_intended info 강등 production 엔드포인트 before/after 실측(fail->info·ok false->true). 매트릭스 인과 직독 확정 |
| C-5 | 스튜디오 '대표이미지 마무리' 통합 카드 + 컨트롤타워 배치 | ☐ Code — C-3 병합완·착수 가능 | finish-image(대표 SIMPLE/COMPLEX)+apply-composite(무드/추가)+C-9 카드 착지점 통합. dry-run before→after·재가드. 권위=ADAPTIVE_COMPOSITE_ENGINE.md |
| C-6 | 브라우저 실무 테스트(3상품 전 흐름) | ☐ 데스크톱(C-5 후, 병합 후) | 무오류 확인 후 다음 본작업 |
| F-규격 | 대표이미지 규격 표준(§9) 박제 | ✅ DONE(데스크톱) | 첨부 레퍼런스(흰배경 본품샷)→ 1:1 1000·순백·본품 70~85%·텍스트0·OCR0. 전상품 적용. REPRESENTATIVE_IMAGE_FINISHING §9 |
| F-합성 | 명화 무드 합성(추가이미지/상세 히어로) | 🟡 #2(9T0) 합성본 폐기(형태오류·클립·과대) → 정정프롬프트 발행 + 엔진화(ADAPTIVE_COMPOSITE_ENGINE.md) · Firefly 트랙2 실비율 누끼 대기(#52) | 폐기 사유=소형 본품(걸이형 15ml)을 대형 렌더 → 라벨 뭉갬·비율 깨짐. 정정=상품진실 앵커(#61)·실측 비율·≥2무드(걸이형 사용맥락+스튜디오 정물). ★누끼진실성: 2026-06-10 reed 육안기록과 정정(걸이형) 불일치 → 실비율 누끼 재확인 후 합성. 명화 정정 2무드 프롬프트=ADAPTIVE_COMPOSITE_ENGINE §6 |
| C-7 | 합성 파이프라인(누끼→무드) = Branch B 앱 기능 | ✅ DONE (feat/composite-pipeline a28946e) · Desktop 검증완+마이그레이션 적용 · ⏸ production 미반영(병합대기) | apply-composite executor(harmonize·추가이미지 적용, 가역). 검증: 라우팅·CHECK제약(product_composite/harmonize 존재)·P2022 가드 정합. extra_images jsonb(기본 []·NOT NULL) Desktop 적용완 → confirm 끝까지 동작. Vercel preview READY(빌드 정상) |
| C-8 | 추가이미지 멀티슬롯 매니저 | ☐ Code(C-3 후) | 대표(1)+추가(2~9) 순서·교체·소스라벨·네이버 매핑. 첨부 레퍼런스 비율 적용 |
| C-9 | 개입카드 3종(source_request·hero_crop_request·firefly_drop) — Operator Action Queue 정밀화 | ✅ DONE·라이브검증완 (2026-06-11) | feat(c9) 7ed81a6 → main 6bbc2a4 READY. control-tower-engine intervention 분기(firefly_drop=AUTH·hero_crop/source=INPUT_DECISION)·없으면 기존 AUTH 폴백(no regression). src/lib/jobs/intervention.ts 헬퍼·apply-cutout/apply-composite 잡 세팅·큐 카드 인라인 렌더(강제모달 0 #56). asset_jobs.intervention_type(text)·intervention_payload(jsonb) 스키마 검증완. 전상품 하드코딩 0(#55). Desktop 3중 교차검증 통과 |
| F-엔진 | 적응형 3-Plane 합성 엔진 권위문서 | 🟢 신규 docs/design/ADAPTIVE_COMPOSITE_ENGINE.md (Code 합성·대표 리뷰 대기) | 6원칙·3-plane 모델·앱통합(C-3/C-7/C-9/C-5)·워크플로7·상품현실시트 템플릿·명화 정정 2무드. 전상품 합성 표준 단일화(#61·#55). REP_FINISHING §2/§9 + #52/#53/#57 + 2026-06-10 3-plane grounded |
| 병합 | feat/composite-pipeline → main (C-1+C-7+C-2+FT production 반영) | ✅ DONE — production 982f856 READY(세션3 실측) | 대표 병합 실행 완료. /white-bg·/apply-cutout·/apply-composite 라이브. Vercel list_deployments로 READY+SHA 교차검증 |

## 이미지 자산 폴더 자동분류 시스템 (신규, 2026-06-09 세션2)
대표 지시: 생성물(누끼/합성/썬네일/상세) 단계별 자동분류·반자동업로드 · 전상품 영구구조. 권한/빌드 = docs/plan/ASSET_FOLDER_TAXONOMY_BUILD.md.
| ID | 작업 | 상태 | 비고 |
|---|---|---|---|
| FT-설계 | 폴더 택소노미 설계 + 스펙 작성 | ✅ DONE(데스크톱) | 단계우선 추천 확정: cutout/composite/thumb/detail/archive. 현 automation-storage 실측(thumb|detail 2종, 단계=variant에만) → 개선 설계 문서화 |
| FT-코드 | AssetKind 단계확장 + 경로 {pid}/{kind}/{variant} + list 재귀(하위호환) + asset-taxonomy.ts + 생산자 정합 | ✅ DONE (feat/composite-pipeline b73f526, tsc0/build/§5) | 하위호환 필수(기존 flat URL 보존). grep 전수. §5 체크리스트 |
| FT-검증 | 신규업로드 단계폴더 생성·기존 URL 유효·전상품 동작 | 🟡 부분(하위호환 확인완) · 단계폴더 실생성=병합후 C-6 | storage.objects 조회: 명화13·달항아리9·아이스트레이1 전부 root_flat(기존 23 무손상). 단계폴더는 신규업로드 발생 시 생성(병합→스튜디오 적용 1회→실측). Claude service key 미보유로 직접 트리거 불가(정직) → 대표 실행 or 브라우저 구동 |
| FT-Adobe | Adobe CC 입구 정리(KKOTIUM_GARDEN 루트 + 중복 kkotium 6개 통합) | ✅ 루트·6폴더 생성완(승인받음) · 중복삭제=대표 | KKOTIUM_GARDEN/00_inbox·01_cutout·02_composite·03_thumbnail·04_detail·99_archive 생성완(STAGE_FOLDER 1:1 미러). 중복 kkotium~(5) 6개=내용 Supabase/산출물 백업됨 → 삭제는 비가역이라 대표 Adobe 웹 직접 권장. 앞으로 업로드=00_inbox 고정→재발 0 |

| FT-표준 | 통합 자산 파이프라인+저장경로 전상품 표준 박제 (ENGINE §9) + detail/ 배선 검증 | ✅ DONE (Desktop §9 신규·Code 직독검증·git 보존) | ENGINE §9-A 저장경로 불변(통자저장 금지)·9-B 단계->폴더->개입점·9-D 상품 단건설계 금지. 검증: detail/ 어댑터 end-to-end 배선 확정(runDetail->generate-detail 렌더+base64->runSave->save-assets uploadAutomationAsset kind='detail'->{pid}/detail/). writer=save-assets(generate-detail은 렌더러). detail/ 0건=FT 배포후 save 0회(§9-A '가동은 랜딩 시' 정합·미배선 아님). PLAYBOOK §1 교차참조 |

## 앱 적용 현황 (명화 · 실측 2026-06-11 세션4)
- production(target=production) = `6bbc2a4`(main) **READY 확정** — 병합(C-1+C-7+C-2+FT) + P1 /assets 수정(d594d85) + C-9 개입카드(7ed81a6) 누적 반영. /white-bg·/apply-cutout·/apply-composite 라이브.
- C-9 개입카드 3종 라이브 ✅(2026-06-11): firefly_drop=AUTH·hero_crop/source=INPUT_DECISION·없으면 기존 AUTH 폴백(no regression). 명화 firefly_drop awaiting_human 잡 1건 시드·/asset-jobs-matrix actionQueue 노출 PASS·아이스트레이/달항아리 interventionType=None 무회귀.
- 대표 = curated(가죽 v2)·main_image_policy=lifestyle_intended ✅ / 상세 = curated(Branch A 공급사 그대로) ✅ / 2갈래 = A / 발행 = SUSPENSION(drift 정확) / extra_images = [] (합성 슬롯 비어있음)
- C-4 라이브 검증 ✅: seo-guard main_image_white_bg = fail->info(정책 후)·seoGuard.ok false->true. 매트릭스 nextAction=resolve_suspension(apply_curated_main 정상 소거).
- 필수속성 ✅: naver_material=유리·naver_color=투명 채워짐·missingRequired=[]. SUSPENSION 내부 게이트 해소(남은 것=네이버 update PUT, 대표 GO 비가역).
- 단계폴더 실생성 = 아직 0(명화13·달항아리9·아이스트레이1 전부 root_flat). 배포 후 신규 업로드 0건이라 미생성(정상) -> C-6에서 적용 1회로 검증.
- 명화 본품 누끼 = 산출완(투명 PNG, Firefly 합성 입력 대기) / 무드 합성본 = 미생성(Firefly 대표 파일드롭 대기)
- 전상품 시스템 + 아틀리에 2단계(스크롤·임시저장·job 생명주기) = LIVE
- 안전번호 2종 = 실측 확보(HB19-12-1462 / HB21-12-2572) — SUSPENSION 해제 입력값(대표 GO 후 비가역)
- /assets 라이브 = 명화 cutout=3·total13 / 달항아리9 / 아이스트레이1 — API=Storage 완벽일치(P1 수정 후 무회귀 실측)

## 운영 메모
- P1 /assets 중첩prefix cutout=0 -> ✅ DONE 라이브검증완(Desktop 3중+전상품). sortBy created_at->name+에러로깅. d594d85·48e6926. 명화 cutout=3·무회귀
- 비가역(네이버 PUT) = 대표 "GO" 전 절대 미실행(#46). 현재까지 전부 가역.
- DB 백필/캡처/적용/생명주기 전이 = 가역 → Desktop 직접 실행(#41).
- 명화 대표 = 가죽 라이프스타일 확정(대표님, 재변경 없음). 누끼·합성은 추가이미지·전상품 기능으로.
- ✅ Adobe 이미지 백엔드 **2026-06-09 세션2에서 복구 확인**(image_remove_background 200·누끼 정상). 단 photo compositing / generative fill / prompt 배경교체는 **Adobe MCP 영구 미지원**(라우팅 문서) → 무드 합성 자체는 Firefly 웹 UI(브라우저 #52). 누끼만 MCP 가능.
- extra_images jsonb 마이그레이션 2026-06-09 Desktop 적용완(additive·가역·production 무해). C-7 confirm 경로 unblocked.
- Firefly 탭 준비됨(Chrome id 1396049947, 로그인·생성홈 확인) + Adobe Express(1396049445) — 명화 합성 브라우저 구동 대기. 업로드/다운로드/credit 클릭 = 대표 담당(#52).

## 이미지 생성 시스템 개선 — 무드-카메라 6축 (신규, 2026-06-16 세션8)
근거 = docs/research/MOOD_TO_CAMERA_SPEC_RESEARCH_2026-06-16.md · 권위 = docs/design/MOOD_CAMERA_SPEC_SYSTEM.md · 편집모드 = FIREFLY_AUTOMATION_PLAYBOOK §9 · 원칙 = #82~#86.
| ID | 작업 | 상태 | 비고 |
|---|---|---|---|
| IMG-리서치 | 무드-카메라 6축 시스템 심층리서치 | ✅ DONE | 6축(M1~M6)·카메라맵·벤치마크DNA·프롬프트 조립기·학습라이브러리·3계층 아키텍처. 근본원인 3건 규명(소니하드코딩·참조오염·네거티브필드없음) |
| IMG-박제 | 연구결과 docs/ 박제 + 등록워크플로/플레이북/원칙 codify | ✅ DONE(2026-06-16) | RESEARCH+SYSTEM 신규 2건, PLAYBOOK §9, REGISTRATION §11+rev3, PRINCIPLES #82~#86 |
| IMG-컷34 | 명화 cut-3(April/Canon)·cut-4(Black Cherry/Leica) 생성 | ✅ DONE(생성·평가완) | cut-3(April/Canon)·cut-4(Black Cherry/Leica) 생성·운영자 평가완. 판정=기술적 우수하나 무드플레이트 → 향노트 섹션 배경 슬롯 적합·썸네일/히어로 부적합(cut-4 200px 묻힘). 전략엔진으로 재배치. |
| IMG-앱 | 6축 시스템 앱 빌드(MoodAxis/CameraSpec/PromptBlock/PromptLibraryEntry/Generation 테이블·3단계 UI·Layer3 가드·firefly_auto subcheck) | ✅ DONE(preview) | feat/mood-camera-system c1e2bd3 preview READY·Desktop 검증완(테이블5·시드 1:1)·prod DB 마이그레이션 적용완. main 머지 대기(=엔진 L2 토대). |
| IMG-인제스트 | April·Black Cherry web-JPEG ingested(composite·registered·publicUrl200)·full-res Vercel차단→web폴백(#91)·Lemon 재생성/Cotton 품절후보 | 🟢 LIVE(검증완료·AssetBrowser 3단 PASS·#92) | server conformToSlotRatio 4:5 no-op·#80 /assets·#81 정합 |

## 앱 적용 현황 (동기화 · 2026-06-16 세션8)
- 명화 이미지(정정 2026-06-17·라벨 뒤바뀜 교정): cut-3 April Fresh(0fc97780)·cut-4 Black Cherry(062339cc) = 6축·full-res 2K·평가완·향노트 배경 적합(Adobe GenAIAsset 2026-06-16 최신 2건=전부) ✅ / cut-1(Lemon)·cut-2(Cotton)=2026-06-13 구버전(6축 이전)만·6축 미생성 ⏸. 향노트 ingest 대상=April·Black Cherry, Lemon 재생성 예정, Cotton 품절후보. 4:5(1856×2304)·2K.
- 문서 시스템: 연구+코드화 전상품 검증·관제탑 LIVE 유지(세션4 이후 무회귀). 발행 SUSPENSION/대표·상세 현황 = 상단 세션4 블록 유지(변동없음).
