## 2026-06-07 (T6) 크롭 주제 완전포함 가드 (Code turn)

feature/crop-studio 11f6287(크롭 스튜디오 완성본 → main 병합 GO 대기). 비가역 0. tsc 0/build OK/이모지 0/한글 코드 0. 권위: docs/decisions/2026-06-07-crop-full-subject-containment.md(명화 대표 B 유리병 하단 잘림 지적).

**[한 것]**
- quality-classifier.detectSubjectBBox — 기존 subject occupancy의 bg-ring+SUBJECT_DELTA 검출을 재사용해 제품 bbox(source px) 산출(256px 분석·행/열 projection noise floor 3%·미검출 null).
- NEW src/lib/images/subject-containment.ts(순수·sharp 0): containmentSquare(bbox+>=8% 패딩 완전포함 최소 정사각·중앙·클램프·소스 부족 시 contained=false+expandPx) / boxClipsSubject(침범 변) / snapBoxToSubject.
- simple-crop: contain(자동 완전포함 정사각)·enforceSubject(수동 박스 침범 차단)·allowSubjectClip(연출소품 예외) + SUBJECT_CLIPPED 경고(자동 소스부족=warn+canvas_expand / 수동 침범=block else warn). result subjectBBox/contained. thumb-crop route 옵션 전달+노출.
- CropStudioPanel: onLoad 완전포함 자동후보+bbox 로드, 제품 bbox 주황 점선 오버레이, 수동 박스 침범 시 빨강+경고+"주제 완전포함으로 맞춤" 1클릭 스냅+연출소품 예외 체크, preview/apply enforceSubject(수동 박스만)·allowSubjectClip 전달.
- 표준 §1 "부분 잘림 반려" 정량 규칙(>=8% 패딩·바닥/상단 잘림 0·제품 정의·소품 예외·확장 우선순위) 명문화.

**[검증]**
- tsc 0·build OK(Compiled successfully·/preview 8.85kB·sharp 클라이언트 누출 0)·이모지 0·한글 코드 0·비가역 0. tsx geometry 9케이스 PASS(완전포함·소스부족 expand·침범 변·스냅 무침범).

**[다음]**
- push → Desktop /preview Chrome 실측(bbox 오버레이·완전포함 자동후보·수동 침범 스냅·confirm 차단·소품 예외) + thumb-crop contain dry-run 명화(subjectBBox/contained) → **feature/crop-studio → main 병합 GO**(production 배포).

---

## 2026-06-07 (Crop Studio) 크롭 스튜디오 T1~T5 (Code turn)

feature/crop-studio (신규 브랜치, SD-04 일시 예외·대표 승인) baseline 1d00be8 → 6 커밋(fa6efc3 docs / bc65a7a T3 / 90c4f4c T2 / cf175ac T1a / 2ee5c3e T1b / 3b6e3fc T4a / de89715 T4b / df9b6ac T5). 비가역 0(네이버 미접촉). tsc 0/build OK/이모지 0(Lucide)/한글 코드 0(주석 영어·문구 JSON).

권위: docs/design/THUMBNAIL_CROP_EDIT_STANDARD.md + HANDOFF_session_2026-06-07_5_crop_edit_workflow_apply.md + MASTER_HANDOFF §6·§9. 핵심: 감지가 아니라 "올바른 컷 추출+편집"을 앱에서 실제 수행, 운영자 개입점은 발행전 검수 화면 1곳.

**[한 것]**
- T3 (bc65a7a) — asset_jobs job_type CHECK 21→25 확장(region_crop/text_remove/canvas_expand/bg_clean, additive). apply_migration phase4_crop_edit_job_types 적용·live 25값 재검증·Desktop information_schema 무회귀 확정. NEW src/lib/jobs/job-type-routing.ts(region_crop→sharp / 편집3종→firefly|adobe_express, requiresOperator 플래그=창작 MCP 개입점). MIGRATION_phase4 박제 + prisma 주석.
- T2 (90c4f4c) — simple-crop CropWarning에 severity(block|warn)+remediation 추가(SoT). 해상도 경고(SOURCE_TOO_SMALL/LOW_RESOLUTION)=warn(canvas_expand 안내·적용 허용), TEXT_DETECTED=block(Naver 2024-10-28 대표 텍스트 규정·운영자 override 불가). thumb-crop confirm 가드를 severity===block 필터로 교체 → 라인A <1000px 하드차단 해소·cautions 노출.
- T1a (cf175ac) — NEW POST /api/products/[id]/asset-edit-job. 운영자 박스 좌표·편집 파라미터를 asset_jobs.input_refs(jsonb) 저장, 도구는 job-type-routing 해결, region_crop=ready / 편집3종=awaiting_human(개입점). 동일타입 active job 멱등.
- T1b (2ee5c3e) — NEW CropStudioPanel을 /products/[id]/preview 대표 이미지 섹션 직후 마운트. 소스선택(상세/대표)+영역 드래그(자연px 매핑·1:1 정사각 가이드)+자동 후보 갤러리(thumb-crop dry-run attention/entropy 택1)+지정영역 미리보기+대표로 적용(thumb-crop confirm·가역)+편집3종 버튼(글씨제거/1:1확장/배경정리→asset-edit-job 시드). i18n cropStudio 섹션.
- T4a (3b6e3fc) — control-tower-engine: ProductLine A/B + deriveLine(NEW or score<40 or no-detail→B, else A) + resolveLine(★운영자 override 우선 — 자동판정이 덮어쓰지 않음, 명화 ENHANCE/62→A). nextAction 라인별(A=crop_pick→/preview, B=build_image→/swap). ControlTowerRow.line + matrix가 quality_reasons.line/lineSource 로드→engine 전달. publish-preview 라인 인지 게이트(text_overlay/representative_missing/detail_missing 항상 차단·라인A는 해상도/배경/단품/상세품질 caution화·라인B 엄격). tsx 9케이스 실증.
- T4b (de89715) — NEW POST /api/products/[id]/line(quality_reasons.line+lineSource=operator 스탬프·recommended_mode 미접촉·migration-safe 503). 관제탑 라인 컬럼을 LineCell로 교체(A크롭/B빌드 배지+1클릭 A/B 토글+source 표기). nextAction crop_pick/build_image 문구. track.line 라벨 "회선"→"라인" 의미 교정.
- T5 (df9b6ac) — 등록된 전상품의 verify_publish nextAction을 /preview로 라우팅 → 라인 인지 게이트+크롭 스튜디오+update PUT이 모두 한 화면에 모여 명화·달항아리·아이스트레이가 동일 파이프라인 수렴. 파이프라인은 이미 product-agnostic. tsx 7케이스 ladder 일관.

**[결정]**
- severity SoT는 simple-crop(경고 생성 지점)에 둠 — 라우트는 필터만. T4가 라인 인지 게이트에서 같은 모델 재사용.
- 라인 개념을 mode와 분리(quality_reasons.line, recommended_mode 미접촉) — 라인=워크플로우 분기, mode=이미지 작업 강도.
- 운영자 override는 resolveLine에서 auto보다 먼저 평가 — 분류기 재실행이 운영자 결정을 절대 덮어쓰지 않음(대표 명시 요구).

**[검증]**
- tsc 0(매 commit)·최종 build OK(Compiled successfully, /preview 4.5→7.81kB)·이모지 0·한글 코드 0·비가역 0.
- tsx 16케이스: deriveLine 4 + resolveLine override 양방향 3 + nextAction 라인 라우팅·전상품 ladder 9.

**[다음]**
- push(feature/crop-studio) → Desktop: /preview 크롭 스튜디오 Chrome 실측(드래그·후보·적용·편집 시드 input_refs 좌표) + 관제탑 라인 배지/override + 라인A 명화 publish 게이트(텍스트만 차단) + feature→main 병합/PR 결정(production은 main 머지 후 배포).

---

## 2026-06-06 (40) Phase 2 제품교체(B안) 루프 앱 내장 (Code turn)

production 20e137f → 4 코드커밋(d059acd 스키마/상태머신, 870fd19 Sharp, f4ae170 매트릭스, e0090b3 swap UI). 비가역 0(네이버 미접촉, DB만). tsc 0/build OK.

권위: KKOTIUM_PRODUCT_SWAP_LOOP_DESIGN_2026-06-06.md §1/§6/§7/§8 + HANDOFF_phase2_product_swap_app_2026-06-06.md. 방향: A안(제품 AI 재생성) 폐기 → B안(실제 제품 누끼 고정 + 배경만 AI + 합성 + 빛정합) 확정.

**[한 것]**
- 작업1 — 스키마 확장(prisma/schema.prisma, 추가 전용·회귀 0): AssetJob에 concept_combo_id(nullable) + references 관계. AssetReference 신규(job_id FK cascade, asset_kind: product_cutout/mood_bg/brand_kit/generated_candidate, asset_urn). job_type 6종·status 4종은 String이라 값은 DB CHECK에서만 확장(마이그레이션 박제 docs/handoff/MIGRATION_phase2_product_swap_2026-06-06.sql, Phase1 이후 incremental ALTER).
- 작업2 — 상태머신(asset-job-state.ts): JobStatus에 awaiting_human/human_done/review/rejected 추가. 전이표 확장(in_progress→awaiting_human→human_done→in_progress / in_progress→review→done|rejected / rejected→ready 사람 재시도 루프, retry 예산 비적용). 낙관적잠금·전이로그 패턴 계승.
- 작업3 — 워크플로우: /api/products/[id]/swap-pipeline(GET 6단계 상태+references, POST 단계 전이·상품 소유 검증·P2021 가드, DB만). UI /products/[id]/swap + ProductSwapPipeline(컨셉카드 우드/화이트/차량 + 대표=흰배경 정책 칩 + 6단계 타임라인 + awaiting_human CTA·Firefly/Express 딥링크·체크리스트·완료표시 + review before/after 슬라이더·승인/거부). SWR 8초 폴링(Realtime 후속).
- 작업4 — 관제탑 매트릭스: trackStatus에 awaiting_human, overall에 attention(막힘 다음 핀). human_done/review→in_progress, rejected→pending. 위젯 Hand 아이콘+보라 스타일+strings.
- 작업5 — Sharp naver-normalize.ts: normalizeRepresentative(흰배경 1:1 1300px sRGB q80 mozjpeg) / normalizeDetail(860px ≤5000 분할). ★ 대표 흰배경 가드 2중(assertRepresentativeAssetKind 메타 + assertWhiteBackground 4모서리 luma≥232/chroma≤26) → 라이프스타일 합성컷 대표 라우팅 throw.
- 작업6 — 5종 MD + 작업원칙 #51(B안)/#52(브라우저 반자동 detect→deliver→resume)/#53(도구 적재적소) 신설.

**[결정]**
- status 확장 방식: 기존 awaiting_approval 재사용+sub-state 대신 신규 1급 status(awaiting_human 등) 추가 — swap UI가 상태별 CTA를 직접 분기하므로 1급이 명확.
- 코드 주석 영어화·에러문구 영어화로 한글 리터럴 0(사용자 문구는 swap-strings.ko.json/control-tower JSON). naver-normalize 정책 에러도 영어.
- before/after 슬라이더는 outputRefs/references에서 URL 방어적 추출, 없으면 'noImage' 표시(#46 가짜 0).

**[현재 상태]**
- 코드 4커밋(push 대기). Phase 1/2 DB는 Supabase 미생성 → swap-pipeline·matrix 모두 migrationPending degrade. tsc 0/build OK/이모지 0/한글 리터럴 0/비가역 0.

**[다음 할 일]**
- push hash → Desktop: (1) Supabase apply_migration(Phase1 SQL 먼저 → Phase2 SQL) drift 0 (2) Chrome swap UI 실측(타임라인·awaiting_human CTA·전후 슬라이더·승인/거부) (3) 명화 B안 end-to-end(고해상 제품 누끼 확보→Firefly 무드배경→Photoshop 합성+Harmonize→Express 마감→Sharp 규격화→검수). 기존 cutout 253x776 저해상=테스트용만.
- 유의: 명화 SUSPENSION은 대표 의도(미완성 노출 방지)—결함 아님, AUTOSUSPEND off. `* 2.*` 중복본 미접촉(#34).

---

## 2026-06-06 (39) Phase 1 누락 방지 골격 — asset_jobs 상태머신 + 관제탑 매트릭스 (Code turn)

production ed1c826 → 2 코드커밋(a55976b 스키마/lib, e9a6c95 UI). 비가역 0(네이버 미접촉, 신규 테이블만). tsc 0/build OK.

권위: docs/research/KKOTIUM_HYBRID_PIPELINE_SYSTEM_DESIGN_2026-06-06.md §4/§7 + HANDOFF_phase1_asset_jobs_tracking_2026-06-06.md.

**[한 것]**
- 작업1 — Prisma 3종(AssetJob/AssetJobTransition/PublishedAsset). BackdropJob 선례 100% 준수: cuid id, product_id는 인덱스 컬럼(Prisma 관계 0 → Product/product_options 미접촉, 회귀 0), String enum은 DB CHECK 제약. AssetJob에 ip_safe·version(낙관적잠금)·retry_count/max_retries·input/output_refs jsonb·heartbeat_at·assigned_session. prisma generate 성공. 마이그레이션 SQL을 docs/handoff/MIGRATION_phase1_asset_jobs_2026-06-06.sql에 박제(Prisma 패리티 DDL + CHECK + 인덱스 + transitions FK cascade).
- 작업2 — src/lib/jobs/asset-job-state.ts(순수 DB·네이버 미접촉). transitionJob(허용전이표 가드 + version 낙관적잠금 updateMany WHERE version + asset_job_transitions 자동 insert, failed→ready는 retry 예산 가드). claimNextJob(SELECT FOR UPDATE SKIP LOCKED로 레인별 1건 선점 + heartbeat). detectZombies(heartbeat 10분 임계 초과 in_progress→blocked). heartbeat 헬퍼.
- 작업3 — /api/products/asset-jobs-matrix(읽기전용): asset_jobs를 상품+레인별 집계 → 4트랙(이미지=generate/process/compose, 발행=review/publish, 회선/운영정합=Phase1 미연결 none). 트랙상태(done/in_progress/pending/blocked/none) + overall(risk/caution/ok/none) + 막힘행 최상단 정렬 + WIP 카운터 + 누락감지(이미지 done인데 발행 미시작→nextAction 칩). ControlTowerMatrixWidget(SWR+Lucide, 한글 strings JSON matrix 섹션, 이모지 0, 막힘 핀 배너·WIP 칩·다음액션 칩). 대시보드 받은편지함 PublishControlTowerWidget 직하 마운트(기존 위젯 보존).
- 작업4 — 5종 추적 MD 갱신 + 작업원칙 #50 등재 + 본 PROGRESS 세션핸드오프 섹션 표준화.

**[결정]**
- 역순배포 안전화(#50): 매트릭스 API에 P2021(table 부재) 가드 → migrationPending degrade. 덕분에 Supabase 마이그레이션 전 push해도 production 무중단(위젯 '준비 중'). 핸드오프의 'commit 보류' 직렬대기 대신 세션 [다음]의 push-first 채택(가드로 안전).
- enum=Prisma enum 타입 대신 String+DB CHECK(BackdropJob 선례·기존 스키마에 Prisma enum 0). 코드 주석 영어화·에러문구 영어화로 한글 리터럴 0(사용자 문구는 JSON).

**[현재 상태]**
- 코드 a55976b/e9a6c95 커밋(push 대기). DB 테이블은 Supabase 미생성 → 매트릭스 위젯은 migrationPending 표시 예정. tsc 0/build OK/이모지 0/한글 리터럴 0/비가역 0.

**[다음 할 일]**
- push hash 보고 → Desktop: (1) git HEAD+Vercel cross-check (2) Supabase apply_migration(MIGRATION_phase1 SQL) → drift 0 (3) Chrome 관제탑 매트릭스 실측(막힘핀·WIP·누락칩) (4) Phase 2 핸드오프(ip_safe 발행 게이트 + 2단계 발행 WAIT→SALE).
- 유의: 명화 SUSPENSION은 대표 의도적(미완성 노출 방지) — 시스템 drift 오인 금지, NAVER_AUTOSUSPEND off 유지. `* 2.*` 중복본 미접촉(대표 결정 대기).

---

## 2026-06-06 (38) GET-merge updateStock 배포 + inspect statusType 거짓초록 교정 + sync/cron 엔드포인트 오용 교정 (Code turn)

production e6ffc5f → 3 커밋 push e3ab753. 실 PUT/OOS 0(코드 배포만, 자동중지 기본 off). tsc 0/build OK.

**(0) 게이트**: 직전 inspect 실측(13564133057=originProductNo·GET originProduct shape=PUT body 호환 VALID)으로 GET-merge updateStock 배포 게이트 해제됨.

**(1) 작업1 — GET-merge 배포**: uncommitted 번들(api-client.ts GET-merge + CLAUDE.md §3-7) 커밋 5f68d47. updateStock/setProductOutOfStock/bulkUpdateStock 전부 getProduct로 현재 전체 originProduct read→stockQuantity만 override→전체 payload PUT(부분 PUT 위험 제거). dryRun 옵션+diffNaverProduct 포함. 실 PUT/OOS 0 — 코드만 배포, 유일 라이브 호출처 mark-oos(alsoNaver 옵트인)는 best-effort catch라 GET-merge 실패해도 안전 degrade.

**(2) 작업2 — inspect statusType 거짓초록 교정**: inspect 라우트 인라인 drift가 name·salePrice만 비교 → 명화처럼 네이버 statusType=SUSPENSION인 상품을 inSync:true로 오판(거짓초록). App Product.status→네이버 statusType 매핑(ACTIVE→SALE, OUT_OF_STOCK→OUTOFSTOCK, INACTIVE→SUSPENSION) 추가, statusType drift 시 diffs 포함(DRAFT/미매핑 스킵). 커밋 c6d00de. ★ 정직(#46): diffNaverProduct 헬퍼는 이미 statusType를 비교함(line 941) — 실제 누락은 inspect 인라인 drift였으므로 그쪽 교정. production 실증(DB-mode inspect 명화): localStatus=ACTIVE·naver statusType=SUSPENSION·drift inSync:false·diffs=[{statusType naver:SUSPENSION app:SALE}]. 거짓초록 제거 확인.

**(3) 작업3 — sync/cron 엔드포인트 오용 교정**: sync/route.ts:40 + cron/daily/route.ts:87이 origin 번호(naverProductId)에 `/v1/products/channel-products/{id}` 호출 → origin 번호면 404(sync는 API_ERROR, cron 자동중지는 dead path). 양쪽 GET을 `/v2/products/origin-products/{id}`로 교정, statusType/stock을 originProduct에서 직접 read. ★ cron 자동중지는 LIVE PUT(statusType=SUSPENSION)을 수행 → endpoint 교정으로 재활성 위험 → NAVER_AUTOSUSPEND_ENABLED env 게이트 신설(기본 off): off면 cron이 stock 정상 read하되 mutate 0·중지후보를 results.wouldSuspend로만 노출(비가역 0), on이면 §3-7 full-replace v2 PUT 수행. 자동중지 실가동은 대표 명시 opt-in. 커밋 e3ab753.

**(4) 검증**: tsc 0·build exit 0·이모지 0(★ 주석 마커만)·실 PUT/OOS 0·가짜 라벨 0(#46). push e6ffc5f→e3ab753(3 커밋). verify-vercel-deploy 180s timeout — 그러나 gh api로 production deployment e3ab753 state=success 확인(3 라우트+lib 변경 풀빌드 슬로우, webhook 정상 #36). prod /dashboard 200·명화 DB-mode inspect GREEN.

**(5) 미해결/위임**: (a) 명화 statusType=SUSPENSION·앱 ACTIVE 실 drift 확정 → SUSPENSION 해제 트랙(대표 승인, 비가역). (b) NAVER_AUTOSUSPEND_ENABLED 활성 여부 대표 결정. (c) Desktop GET-merge dryRun 교차검증. (d) 명화 이미지 반영(update confirm:true, 비가역). (e) `* 2.*` macOS 중복본 untracked(#34) 정리 결정.

---

## 2026-06-06 (37) 읽기전용 inspect 라우트 신설 + 명화 상품번호 종류 실측 확정 (Code turn)

production 1b69cd3 → inspect 라우트 push cb15dfb(verify exit 0, github-deployments). 비가역 0(GET only, mutate 0). tsc 0/build OK.

**(0) 배경**: GET-merge updateStock 배포 전 Desktop 검증서가 미확정 2건 제기 — (1) 저장된 naverProductId(명화=13564133057)가 originProductNo인지 channelProductNo인지 불명(register가 result.productNo??originProductNo로 저장 + smartstore URL이 13564133057로 작동 → 채널번호 정황, #611). 채널번호면 update/updateStock의 PUT /origin-products/{id} 오발 위험. (2) 네이버 GET origin-products 응답이 PUT origin-products body와 호환 shape인지(GET-merge 전제). 둘 다 읽기전용 GET 실측 필요.

**(1) 작업1 — 읽기전용 inspect 라우트**: `GET /api/naver/products/[productId]/inspect` 신설, mutate 절대 0(GET only). 동작: origin-products/{no} + channel-products/{no} 양 엔드포인트 동시 probe(naverRequest 캡처, NaverApiError.diagnostic.status로 404 vs 기타 구분) → numberKind(ORIGIN/CHANNEL/BOTH/UNKNOWN) 분류 + resolvedOriginProductNo 역추적 + storedIsCorrectPutTarget/putTargetWarning(PUT 오발 가시화) + originProductSummary/originProductRaw(Desktop PUT body 육안 비교) + app-네이버 drift(name/salePrice) 인라인 계산. `?probe=<rawNo>`로 DB 없이 raw 번호 직접 검증. 배포 결합 분리: naverRequest/NaverApiError(HEAD 기존)만 import → 단독 커밋/배포 가능. diffNaverProduct 재사용은 의도적 제외(그 헬퍼는 uncommitted GET-merge 동반 파일이라 import하면 미검증 GET-merge가 함께 배포됨 → 더 강한 제약 우선, drift는 fetched body에서 인라인 계산으로 대체·추가 GET 0).

**(2) 실측 (production read-only probe 13564133057)**: numberKind=ORIGIN 확정. origin-products GET=200·channel-products GET=404 → 13564133057=originProductNo. storedIsCorrectPutTarget=true·putTargetWarning=null. Desktop '채널번호 정황' 가설 반증 — register의 productNo??originProductNo가 결과적으로 origin 번호를 저장했고 PUT /origin-products/13564133057이 정타. → 작업2(번호 정합 가드) 불필요(스킵, #46 실측 기반).

**(3) shape 호환 확정**: GET originProduct top-level keys = name·salePrice·stockQuantity(2997)·statusType·leafCategoryId·images·detailContent·detailAttribute·deliveryInfo·customerBenefit·saleType — PUT origin-products body와 동일 구조, stockQuantity 존재 → GET-merge 전제 VALID. updateStock GET-merge가 이 상품에 안전+정타.

**(4) 부수 발견**: (a) 명화 statusType=SUSPENSION(판매중지)인데 앱 status=ACTIVE = drift(대표 확인 요). (b) 기존 sync/route.ts:40·cron/daily/route.ts:87이 origin 번호(naverProductId)에 `/v1/products/channel-products/{id}` 엔드포인트 사용 → 명화처럼 channel 404나면 API_ERROR 경로(상태 동기화 오작동 가능). 별도 점검 대상.

**(5) 검증**: tsc 0·build exit 0(Compiled successfully·inspect 라우트 ƒ 등록)·이모지 0·비가역 0(GET only)·가짜 라벨 0(#46). 커밋 cb15dfb 단일 파일(201 insertions) push·verify-vercel-deploy --wait exit 0(production cb15dfb). 스모크: bogus id→404 JSON(라우트 live)·probe 13564133057→numberKind ORIGIN.

**(6) 미해결/위임**: (a) 정합 확정 → GET-merge api-client.ts 배포 승인 대기(현 uncommitted, mark-oos 라이브경로 안전화 — 대표 go 후 별도 commit/push). (b) 명화 SUSPENSION→SALE 전환 여부 대표 결정. (c) sync/cron channel-products 오용 점검. (d) `* 2.*` macOS 중복본 untracked(#34) 정리 결정.

---

## 2026-06-06 (36) updateStock 부분 PUT 위험 안전화 — GET-merge 전체 페이로드 교체 + 양방향 동기화 T2.5 트랙 (Code turn)

baseline production 1b69cd3 → updateStock 안전화. 비가역 0(실 PUT 0, 대표 승인 전 재고 변경 금지). TSC 0/build OK.

**(0) 배경**: Desktop 코드 직독으로 확정 — `api-client.ts updateStock`이 `{originProduct:{stockQuantity}}` 부분 PUT 사용. 네이버 v2 PUT은 전체 페이로드 교체(누락 필드 제거, commerce-api #1650)이므로 재고만 보내면 상품명/가격/이미지/옵션/원산지/상세가 통째로 제거될 위험. setProductOutOfStock·bulkUpdateStock도 동일 updateStock 의존 → 재고 기능 전체 동일 위험. (직전 세션 35의 ★다음 (D) 항목이 이 점검을 예약.)

**(1) 작업1 — 호출처 전수조사(긴급도 판정)**: 전 repo grep. 라이브 호출처 단 1개 = `src/app/api/alerts/[id]/mark-oos/route.ts:95` setProductOutOfStock(UI 품절버튼, `alsoNaver=true` 옵트인 경로, 기본 false). → 라이브 사용(긴급). bulkUpdateStock=호출처 0(미사용). 폴러 `dome-inventory-poller.ts updateStockProfile`은 이름만 유사한 로컬 DB 함수(SupplierStockProfile upsert)일 뿐 api-client updateStock 미import — 네이버 push 안 함(재고 cron은 안전). 정직 보고(#46).

**(2) 작업2 — GET-merge 안전화**: updateStock을 GET-merge로 교체 — `getProduct(productNo)`로 현재 네이버 전체 originProduct read → stockQuantity만 override → 전체 payload PUT(필드 보존). DB 재구성 방식 대비 채택 이유: 이미지 재업로드 불필요·DB 관계 의존 0·네이버 측 수동 변경분 보존. trade-off: GET이 PUT-호환 shape를 echo한다는 가정 — 읽기전용 필드 거부 시 update가 에러로 끝남(데이터 손상 아닌 안전 실패). `{dryRun:true}` 옵션 = GET-merge 결과만 반환(PUT 미실행, 비가역 검증용). productNo 빈 값/음수 stock = throw. setProductOutOfStock·bulkUpdateStock 동일 경로 통일, bulkUpdateStock은 productNo 없는 항목 skip 버킷 분리. mark-oos는 best-effort catch 구조라 GET-merge 실패해도 안전 degrade(naverFlipped=false).

**(3) 작업3 — 양방향 동기화 정합성(T2.5 씨앗)**: 역방향 풀(네이버→앱 GET) 부재로 DB-네이버 drift 위험. `diffNaverProduct(productNo, appExpected)` 읽기전용 헬퍼 추가 — name/salePrice/stockQuantity/statusType/representativeImageUrl 필드 비교. 마스터 플랜에 T2.5 "네이버 양방향 동기화 정합성" 트랙 신설(1차 GET-merge 교정 완료 기록 + 후속 drift 게이트/역방향 잡/대시보드). CLAUDE.md §3-7 "네이버 v2 상품 수정 = 전체 페이로드 교체 필수(재고 포함)" 원칙 등재.

**(4) 검증**: 오프라인 merge 시뮬레이션 — 구 부분PUT은 8필드(name/price/images/options/origin/detail/status/category) 소실, 신 merge는 9필드 전체 보존 + stock 50→0만 변경 실증. TSC 0·build exit 0(Compiled successfully)·이모지 0(★=형제 update/route.ts·CLAUDE.md 선례 주석 마커)·Korean type-literal 0·가짜 라벨 0(#46)·실 PUT 0.

**(5) 미해결/위임**: (a) working tree에 macOS 중복본 다수 untracked(`* 2.ts`/`* 2.md`/`* 2.json` + docs/handoff·research 신규 MD) — #34로 대표 결정 위임, 본 turn 미접촉. (b) 실 OOS/재고 변경은 대표 승인 후. (c) Desktop 교차검증(GET-merge 로직 + diffNaverProduct) 후 명화 이미지 반영 트랙 재개.

---

## 2026-06-05 (35) 네이버 상품 수정 API 라우트 신설(PUT origin-products) + update dryRun 검증 (Code turn)

baseline production b6b5b19 → 라우트 신설 push 70b4edc(verify exit 0). 비가역 0(dryRun까지만, confirm 미전달 = PUT 0, DB mutate 0). 권위: 공식 commerce-api 스키마(#1650) + production dryRun 실측.

**(0) 배경**: 명화(13564133057 ACTIVE) 발행 성공했으나 대표이미지가 공급사 원본(디자인 미적용). 이미지 배선 교정 완료(SESSION_LOG 33, cutout auto-cache). 교정 이미지를 네이버 발행 상품에 반영할 상품 수정 라우트가 앱에 없음(register는 신규 전용) = 모든 상품 공통 기능 필요.

**(1) 작업1 — 상품 수정 라우트 신설**: src/app/api/naver/products/update/route.ts. POST {productId, dryRun?, confirm?, fields?}. 엔드포인트 PUT /v2/products/origin-products/{originProductNo}(api-client updateProduct와 동일). ★ 공식 확인(commerce-api #1650 + WebSearch): Naver v2 수정은 전체 페이로드 교체 — 요청에 없는 필드는 제거됨 → 부분 PUT 금지. 따라서 buildNaverProductPayload로 DB 전체 재구성 후 PUT(register 빌더 100% 재사용, 원산지 가드/태그 필터/옵션 규격 교정 전부 상속). 안전장치: 실 PUT은 confirm===true && dryRun!==true 일 때만 — bare 호출/dryRun:true는 절대 mutate 안 함. 이미지 변경 시 register 7-img와 동일하게 uploadImagesToNaver(외부 URL→shop-phinf) 선행 후 재빌드. naverProductId 없으면 409(NOT_REGISTERED). 성공 시 product_events NAVER_UPDATED 로깅.

**(2) 작업2 — 대표이미지 소스 점검(mutate 0)**: DB 직독 — mainImage=Cloudinary 공급사 원본(main-hwabo-4set.jpg, 빌더가 representativeUrl로 사용), main_image_url=Supabase product-assets(save-assets 썸네일 출력, ★ 빌더 미독), detail_image_url=Supabase. 즉 buildNaverProductPayload는 product.mainImage만 읽으므로 교정 clean 썸네일 반영하려면 mainImage 승격 필요. 경로: clean 썸네일 재생성(cutout auto-cache 반영) → save-assets/Storage → Product.mainImage 셋. 본 turn은 점검만(비가역 보류).

**(3) 작업3 — production update dryRun 검증**: POST /api/naver/products/update {productId, fields:[image]} (confirm 미전달) → HTTP 200 success·dryRun:true·mode UPDATE·endpoint PUT origin-products/13564133057·canRegister true·grade C. 페이로드 정합: name=naver_title·originAreaCode 0200037·sellerTags ['에어컨냄새제거','차량용디퓨저','명화'](제한어 0)·옵션 3 distinct. ★ representativeImage=Cloudinary 공급사 원본(mainImage 미승격 노출) → 작업2 선결조건 실증. dryRun:true 명시 호출도 200(PUT 0). 안전장치 작동 확인.

검증: TSC 0/build OK(라우트 /api/naver/products/update 매니페스트 등록). 비가역 0(confirm 미전달, PUT 0·DB mutate 0). 이모지 0(★ 허용)/가짜 라벨 0(#46 — dryRun GREEN ≠ 이미지 반영 완료, mainImage 승격 선결 명시). **다음**: (A) Desktop update dryRun 교차검증. (B) 명화 mainImage 승격(clean 썸네일 재생성→저장→셋) — 비가역 아님(가역 DB). (C) 대표 승인 → update confirm:true 실 PUT(비가역) → 3중 검증. (D) updateStock 부분 PUT 잠재 위험(전체 페이로드 원칙 위배 — 누락 필드 제거 가능) 별도 점검.

---

## 2026-06-05 (34) 이미지 파이프라인 리서치 저장 + 개선 마스터 플랜(5트랙) 생성 + 운영 원칙 갱신 (Code turn)

baseline production bd28efe(HEAD==origin==prod, Vercel 200, tracked tree clean). docs only·비가역 0(코드/DB/발행 미접촉). 권위: Desktop 산출 리서치 전문 + 명화 발행/배선 교정 실측(SESSION_LOG 32·33).

**(1) 리서치 저장(작업1)**: docs/research/KKOTIUM_IMAGE_PIPELINE_RESEARCH_2026-06-05.md 전문 저장(#29b Python full-overwrite, 한글 깨짐 0). 4영역(도구 라이선스/네이버 SEO/HITL UX/MCP 오케스트레이션) + 도구 매핑표 + Recommendations + Caveats. 표의 체크마크는 이모지 0 규칙 위해 'O'로 표기.

**(2) 마스터 플랜 생성(작업2)**: docs/plan/IMAGE_PIPELINE_IMPROVEMENT_MASTER_PLAN.md 신설 — 배경(명화 배선 결함+교정), 리서치 3결론, 도구 매핑표, 5트랙(T1 asset_jobs 범용화+라이선스 티어 / T2 Bria PoC / T3 3-레인 라우터 / T4 발행 검수 대시보드+시안 UI / T5 앱-Desktop-MCP 연결). 각 트랙 목표/산출물/대표개입/의존성/완료기준. 대표 개입 2지점(메인컷 선택·발행 직전 승인)만 수동.

**(3) 추적 MD 동기화(작업3)**: PROGRESS 헤더 + ROADMAP 헤더(5트랙) + SESSION_LOG(34) + TASK_BRIDGE §3(34). 명화 첫 발행 SUCCESS + 배선 교정 완료 현황 반영.

**(4) CLAUDE.md 운영 원칙 추가(작업4)**: §3-6 '이미지/발행 자산 규칙' 신설 — (a) 라이선스 안전(메인컷=Firefly 수동/Bria 무배상만, SD류 무배상 미제공 금지) (b) 브라우저 자동화 금지(Adobe/Canva/Figma 웹UI 스크립트 우회 금지=계정정지 리스크) (c) 네이버 대표이미지 규정(2024-10-28: 가격/홍보문구/옵션 라인업컷/소품 금지, 대표=단일 본품 누끼) (d) 디자인 가공본 필수(공급사 원본 직송 금지) (e) 자산 이름 규약(cutout.png/backdrop-{skeletonId}.png 고정, myeonghwa-* 접두어 금지, upload-cutout.js 사용).

검증: git diff = docs only(src/·prisma/ 0). 비가역 0. 이모지 0(★ 허용)/한글 sentinel 0/가짜 라벨 0(#46). **다음**: T1 asset_jobs 범용화(backdrop_jobs→asset_jobs 일반화+라이선스 티어 스키마) — 대표 승인 게이트. + 잔여: 명화 네이버 이미지 수정(비가역, 대표 승인) / 수동 소싱 product_id 배선 갭 / 명화 재질·색상 보강.

---

## 2026-06-05 (33) 명화 이미지 배선 결함 교정(Storage 자산 정렬) + 소싱 추적성 복원 (Code turn)

baseline production 6698fb0(HEAD==origin==prod, Vercel 200). 코드 변경 0(git status clean·TSC 0). 가역: Storage 자산 정렬(backdrop 덮어쓰기는 prev 백업) + DB crawl_logs 1행. 네이버 발행상품 미접촉. 권위: Desktop 라이브 view + Code Storage(storage.objects) 직독.

**(0) 근본원인(Storage 직독 정정)**: 명화 발행 이미지가 디자인 미적용 — 대표=공급사 원본 4세트 진열컷, 상세=빈 미완성본. asset-source-resolver는 고정 이름 cutout.png/backdrop-{skeletonId}.png을 findCachedAsset(exact name)로 조회. Storage 실측: cutout.png 부재(myeonghwa-cutout.png 196KB만 존재, Desktop 임시 업로드) → cutout fallback=fitImage(공급사 원본). ★ 핸드오프 부분 정정: backdrop-S6.png 1.14MB는 이미 존재·auto-cache 작동(2026-05-30) → 배경은 정상, cutout만 결함. 재료 품질 우수(Desktop view).

**(1) 작업1 — 자산 파일명 규칙 정렬(scripts/upload-cutout.js)**: (a) myeonghwa-cutout.png→cutout.png 배포(PNG, upload 200). (b) 기존 backdrop-S6.png→backdrop-S6-prev-firefly.png 백업(가역 보존). (c) 큐레이트 myeonghwa-backdrop-860.jpg(JPG)→sharp png 변환(660KB)→backdrop-S6.png 업그레이드(핸드오프 명시, 백업으로 가역). upload-cutout.js의 non-PNG 거부 가드 때문에 jpg는 선변환 필요.

**(2) 작업2 정정(#46 오조준 보고)**: 핸드오프는 save-assets가 Adobe cutout/backdrop을 저장한다 가정했으나 실측 — save-assets/route.ts는 thumb-{variant}/detail-{skeletonId} 출력물만 저장(cutout/backdrop 입력 미관여). cutout/backdrop 정식 배포 도구는 scripts/upload-cutout.js(이미 엔진 고정 이름 cutout.png/backdrop-{skeletonId}.png 사용). myeonghwa-* 파일은 이 스크립트를 우회한 Desktop 임시 업로드가 원인 → 코드 결함 0, 근본 교정=배포 시 upload-cutout.js 사용(프로세스 규율). save-assets 코드 변경 불필요(억지 수정 금지 #46).

**(3) 작업3 — 재검증**: production POST /api/thumbnail/{id} {overrideSkeletonId:S6} → assetSource {cutout:'auto-cache', backdrop:'auto-cache'}. cutout이 fallback→auto-cache 전환 확정 = 엔진이 깔끔한 누끼를 합성(공급사 원본 아님). ★ 결과 이미지 육안 교차검증은 Desktop view 위임(Code는 이미지 시각 판정 불가, assetSource 플립이 배선 정상화 신호).

**(4) 작업4 — 소싱 추적성 배선**: crawl_logs(id 0b21ac95, url domeme.domeggook.com/s/65322245, product_id null)→명화 Product.id UPDATE(1행, RETURNING 확인). 근본 점검: batch-register/route.ts:117이 productId=created.id 자동 배선(배치 경로). 명화 null은 수동 경로(단건 crawl→products/new)가 crawl_log id 미전달한 갭 → 후속 turn 대상.

검증: 코드 변경 0(TSC 0). 비가역 경계 — Storage 자산(가역: prev 백업)·crawl_logs 1행(가역). 네이버 register/상품수정 API 호출 0(비가역 보류). 이모지 0(★ 허용)/가짜 라벨 0(#46). ★ 정직: 네이버 발행상품(13564133057) 대표/상세 이미지는 아직 공급사 원본 — 본 turn은 Storage/썸네일 엔진 교정까지, 네이버 반영은 별도. **다음**: (A) Desktop 썸네일/상세 재생성 육안 검증. (B) 네이버 상품 이미지 수정 API(대표 승인 후, 비가역) → 명화 '제대로 등록' 완성. (C) 수동 소싱 경로 crawl_logs.product_id 자동 배선 갭 교정.

---

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


---

> 더 오래된 세션(26 이하, 2026-06-05~05-20)은 `docs/plan/archive/SESSION_LOG_2026-06-early.md`로 이관(2026-06-07 #31 분할). 검색용으로만 참조.
