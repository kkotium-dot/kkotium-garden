# 꽃틔움 가든 — 병행작업 트래커 (누락 0 원칙) · 최종 업데이트 2026-06-13 (rev19 · Scent→Mood 컨셉 재설계 + 생성설정 가드 + april/cotton v3·세션7-e)

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
