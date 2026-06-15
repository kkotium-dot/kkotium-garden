# KKOTIUM GARDEN — ROADMAP
> 2026-06-12 (세션6-c) **/assets composite=0 P0 DONE — Desktop 3-tier LIVE 검증 + probe 삭제** (Code turn, production 619dbff READY, 비가역 0·네이버 무접촉). 3-tier 전부 통과(/assets composite=9 MISS·SQL 9 1:1·/studio 에셋탭 9썸네일 LIVE naturalWidth>0). 근본원인=§5 2행 no-slash list버그 확정(env키 drift 배제)·§3 자가치유(#67) 영구복구. probe 라우트 삭제. **다음=명화 publish GO 대기(#46) 또는 P1 실사용 E2E.**
> 2026-06-12 (세션6-b) **/assets composite=0 production probe + trailing-slash 자가치유 배포** (Code turn, main 4e4e8b5, 비가역 0·additive·debug-gated·네이버 무접촉). Desktop 5단 격리(#66) 전 계층 무혐의·로컬키 composite9·prod만0=런타임 단일변수. 토큰게이트 probe GET /api/debug/storage-probe/[id](spec /api/_debug/는 private folder 404→/api/debug/ 교정) + collect() trailing-slash 자가치유(#67). 원칙 #66~#69. **다음=Desktop probe 판정→(env키 drift면 운영자 1액션 / list버그면 하드닝 종결)→composite=9 LIVE→probe 삭제. 이후 P1 명화 4컷 하모나이즈·발행→P2 달항아리·아이스트레이.**
> 2026-06-12 (세션6) **이미지 스튜디오+충실도카드+적재v2 production LIVE (fa9ad01)** (Code turn, 비가역 0). feat/image-studio 3커밋 main FF 병합·Vercel production READY. DB LIVE(fidelity 완성·scents 4향·asset_registry). 게이트 fidelity_check/mount_check. ★미해결=/assets composite 미표시(RPC 수정 신형키 권한 차단·대표 결정 대기). **다음=P0 Desktop 실사용검증(#63)→P1 명화 발행→P2 타상품.**
> 2026-06-08 **★ 운영 시스템 레이어 — 개입 대기열(Operator Action Queue) + 적용현황 인디케이터 전상품 착수** (Code turn, main 415358b, 비가역 0). 권위 docs/design/OPERATOR_SYSTEM_BLUEPRINT.md(9단계 파이프라인 + 개입점 4유형 + 휴먼인더루프 오케스트레이션). 1차 완료: control-tower-engine actionQueue 파생(nextAction+게이트→AUTO/INPUT_DECISION/GO_PENDING/AUTH, 신규 컬럼 0) + 관제탑 상단 개입 대기열 위젯(전상품·1클릭 deepLink·레드=GO만) + 적용현황 인디케이터(#54)와 행동축/결과축 한 쌍. 원칙 #54(적용현황 상시)·#55(전상품 범용)·#56(개입 자연스러움). **시스템 레이어 후속: 2차 딥링크 정합(큐 카드→정확 작업 화면/탭) · 3차 외부 인증 Chrome MCP 반자동(#52 Firefly/네이버 CAPTCHA·로그인만 대표) · 스튜디오 헤더 적용현황 미러 · 아틀리에 재설계 2단계(전 /studio 토큰 정렬·공유 Card P4).**
> 2026-06-05 **네이버 상품 수정 라우트 신설(PUT origin-products, dryRun-default-safe) + dryRun 검증** (Code turn, 70b4edc, 비가역 0). register 빌더 재사용 전체 페이로드 PUT, 실 수정은 confirm:true 명시. dryRun GREEN(canRegister true·페이로드 정합). ★ 발견: mainImage가 공급사 원본 → 교정 누끼 반영 전 mainImage 승격 선결. **다음=mainImage 승격→대표 승인→실 PUT(비가역)**.
> 2026-06-05 **이미지 파이프라인 리서치 + 개선 마스터 플랜(5트랙 T1~T5) + 운영 원칙(CLAUDE.md §3-6)** (Code turn, bd28efe, docs only·비가역 0). T1 asset_jobs 범용화+라이선스 티어 / T2 Bria PoC 통합 / T3 3-레인 라우터+도구 자동선택 / T4 발행 검수 대시보드+시안 선택 UI / T5 앱-Desktop-MCP 연결+발행 워크플로우 앱 통합. 권위: docs/plan/IMAGE_PIPELINE_IMPROVEMENT_MASTER_PLAN.md. **다음=T1 착수(대표 승인 게이트)**.
> 2026-06-05 **명화 이미지 배선 결함 교정(Storage 자산 정렬) + 소싱 추적성 복원** (Code turn, 6698fb0, 코드 변경 0·가역). cutout.png 부재(엔진 고정 이름 vs myeonghwa-cutout.png)→fallback 공급사 원본 합성이 근본. myeonghwa-cutout.png→cutout.png 배포 + backdrop 백업 후 큐레이트 업그레이드. assetSource cutout fallback→auto-cache 검증. crawl_logs product_id 링크. ★ 네이버 발행상품 이미지 수정은 별도 turn(대표 승인). **다음=Desktop 육안 검증→네이버 상품 이미지 수정→명화 완성**.
> 2026-06-05 **★ P0 명화 첫 발행 SUCCESS (naverProductId 13564133057, ACTIVE)** (Code turn 기록, 0d8793e, docs only·비가역 0). register HTTP 200·Code 독립 3중 검증(Product ACTIVE·product_events NAVER_REGISTERED·스토어프론트 non-404). 발행 차단 4대 결함 전부 교정 완료. 엑셀 백업경로 옵션 5칸 채워짐. **다음=둘째 상품(달항아리/아이스트레이) 발행 + 명화 재질/색상 발행후 보강(A안)**.
> 2026-06-05 **엑셀 옵션 소스 불일치 교정 → 옵션 5칸 채워짐 실증** (Code turn, 17dd50f, 발행 미접촉·비가역 0). excel/route.ts가 product_options(API 발행 소스)를 우선 읽도록 교정(레거시 fallback). Code openpyxl 재검증: 옵션 5칸 채워짐(향 3종)·88칸 회귀 0(원산지 0200037·이미지·배송 불변). TSC 0/build OK. **다음=Desktop 엑셀 재검증 + API 3차 발행(대표 재승인)**.
> 2026-06-05 **register 400 2차(sellerTags 제한어 + 옵션 중복) 교정 → dryRun 재GREEN** (Code turn, f82e525, 발행 미접촉·비가역 0). buildSeoInfo 제한어 필터(exact) + optionCombinations optionName1~4=값 규격 정합(commerce-api #241)·dedup. dryRun: sellerTags 제한어 0·옵션 3 distinct·canRegister=true·회선 200. TSC 0/build OK. **다음=Desktop 재검증→대표 재승인→재 register(명화, 비가역)**.
> 2026-06-05 **원산지 선행 0 절삭 근본 결함 교정 → 명화 발행 재준비 GREEN** (Code turn, 63c912c, DB 1행 가역·발행 미접촉). xls 권위 재생성(선행 0 보존 518건) + DB originCode 0200037 + builder resolveOriginAreaCode 가드(DEBT-13 차단) + legacy route. dryRun 재검증: originAreaCode=0200037·canRegister=true·회선 200. TSC 0/build OK. **다음=대표 재승인 → 재 register(명화, 비가역)**.
> 2026-06-05 **P0 명화 첫 발행 실패 — 네이버 400 원산지 코드 거부·DB 미변경** (Code turn, 0996ebd, 작업2 register 1회 시도·실패 mutate 0). 발행 GO 수신 → 3축 재실측 GREEN → register POST → HTTP 400 originAreaCode NotValid('200037' 포맷). 근본원인 builder originAreaCode 포맷 불일치(기본값 '0200037' vs product '200037'). DB DRAFT·naverProductId null 불변(상품 미생성·부분발행 0). dryRun 미검출(거짓 초록, DEBT-13 후보). **다음=originAreaCode 교정(200037→0200037 추정)→재실측→대표 재승인→재발행**.
> 2026-06-05 **P0 발행 직전 실측 완료 + 발행 실행 경로 확정** (Code turn, f2ea274, docs only·비가역 0). Desktop 발행 직전 라이브 실측: 명화 DRAFT·naverProductId null, 실마진 50.7%, 이미지 생존 200/200, 옵션 향 3종, 재질/색상 null(근거 부재·추측 금지 #46). 3축+5대 점검 전부 통과·발행 차단 결함 0건. ★ Desktop register 불가(프록시 전용) → 발행=앱 UI/Code 경로. 하드룰 register/POST 승인 없이 0. **다음=대표 발행 GO → 실 register(비가역).**
> 2026-06-05 **Claude Design 슬롯 편입 + AEM 정정 + P0 3축 GREEN 재확인** (Code turn, baseline 2f5d1e0, docs only·비가역 0). #48 보강: 캔버스 시각화(Claude Design 류)/Canva 신규 슬롯=내부 시안·발행 GO 카드·둘째 상품 hero 시안·단발 배너 전용(판매물 아님, 면책 경계 불변). AEM 정정: '사용 안 함'→'연결 유지(대표 재연결)·현재 미해당·향후 멀티채널 확장 시'(Marketing Agent 동일). P0 3축 GREEN 유지(회선 200·L2·dryRun). **다음=Desktop 새 채팅 P0 명화 발행(대표 명시 승인 게이트).**
> 2026-06-04 **작업원칙 #49 등재 + P0 발행 인계** (Code turn, f689625, docs only·비가역 0). #49(Desktop 핸드오프 write_file 직접 / Code git 보존) PRINCIPLES_LEARNED+TASK_BRIDGE 등재. P0 3축 GREEN 유지(회선·L2·dryRun). _DESKTOP_WRITE_TEST 제거. **다음=Desktop 새 채팅 P0 명화 발행(대표 명시 승인 게이트)**.
> 2026-06-04 **imageProbe 모드 + STEP 2 L2 실증 성공** (Code turn, 316f1f2, 비가역 0). register route imageProbe 분기(이미지만 업로드). allShopPhinf=true(Cloudinary main+Supabase detail+공지→shop-phinf). 이미지 도메인 정정(#45): 발행 main=Cloudinary. **다음=대표 명시 승인 → 실 register(명화 우선)**.
> 2026-06-04 **P0 첫 발행 회선/L2 검증** (Code turn, 검증 전용·비가역 0). P-1/P-2/L3 기구현 확정(신규 0). STEP 1 회선 200·STEP 3 dryRun canRegister=true(17필드+옵션3+ETC9, 경고 재질/색상). STEP 2(proxy uploadImages 실증)는 로컬 proxy 시크릿 부재로 Desktop 위임. **다음=Desktop STEP 2 실증 → 대표 명시 승인 → 실 register**.
> 2026-06-04 **발행 관제탑 STEP E — main 머지 + production 반영 완료** (Code turn, production HEAD e915b0a). STEP A·B·C → main(e915b0a) 머지·push·Vercel verify exit 0. production /dashboard 200 + 일괄 API 정답지 일치(명화/달항아리 GREEN·아이스트레이 RED). 발행 관제탑 전 STEP 완료. **다음=P0 첫 상품 발행 트랙(이미지 변환 선결 → 명화 우선)**.
> 2026-06-04 **발행 관제탑 STEP C 완료** (Code turn, feature/publish-control-tower, main 미접촉). 대시보드 SECTION 2 최상단 마운트(가산식) + 마진 표시 가격기반 정합(margin 컬럼 단위 혼재 회피, DB 미교정). 커밋 50ee308. **다음=Desktop STEP D 브라우저 실측 → main 머지 → P0 발행**.
> 2026-06-04 **발행 관제탑 STEP A·B 구현 완료** (Code turn, feature/publish-control-tower, main 미접촉). STEP A 일괄 판정 API+공통함수(515e82f, 단건 route 공유·회귀 0) + STEP B 신호등 카드 위젯(aa31ad4, 용어사전 한글변환). 엔진 미접촉·비가역 0·TSC 0/build OK. **다음=Desktop 머지 검증 → STEP C(대시보드 마운트)·D(브라우저 실측)**.

> 2026-06-04 **★ 발행 관제탑 설계 확정 + 빌더·한글화 두 대수술 production 머지 검증 완료** (Desktop turn, 코드 0, production HEAD 64fe565). 빌더 하이브리드(a6ea482) + UI 한글화(64fe565) 둘 다 main 머지·production 실측 검증 통과(/portfolio 404 직접 확인, 가짜 John 제거). 발행 관제탑 설계도 신설(HANDOFF_publish_control_tower_2026-06-04.md) — 기존 publish-readiness.ts 엔진 위에 신호등 UI만 씌움. **★ 컨텍스트 한계로 관제탑 구현은 새 채팅 위임**(중복작업 방지).
>
> ⭐ **다음 새 채팅 시작 메시지 (SUPERSEDED 2026-06-10)**: "Phase 2 제품교체(B안) 루프 앱 내장 완료(2026-06-06, 코드 d059acd/870fd19/f4ae170/e0090b3 push). B안=실제 제품 누끼 고정+배경만 AI(A안 재생성 폐기). asset_jobs 스키마 확장(concept_combo_id·AssetReference + job_type 6종/status 4종 awaiting_human 등 DB CHECK) + 상태머신 전이 확장(awaiting_human→human_done→in_progress, review→done|rejected, rejected→ready) + 제품교체 워크플로우(/api/products/[id]/swap-pipeline + /products/[id]/swap UI: 컨셉카드·단계 타임라인·awaiting_human 딥링크 CTA·before/after 슬라이더·승인/거부) + 관제탑 awaiting_human 핀 + Sharp naver-normalize(대표 흰배경 1:1 1300px 가드 / 상세 860px). 작업원칙 #51(B안)/#52(브라우저 반자동)/#53(도구 적재적소). P2021 가드로 마이그레이션 전 무중단. tsc 0/build OK/이모지 0/한글 리터럴 0/비가역 0. ★남은 단계(Desktop 선): (1) **Supabase apply_migration 2건**(MIGRATION_phase1_asset_jobs → MIGRATION_phase2_product_swap, 순서 준수) drift 0 (2) Chrome swap UI 실측(타임라인·awaiting_human CTA·전후 슬라이더) (3) 명화 B안 end-to-end(고해상 제품 누끼 확보→Firefly 무드배경→Photoshop 합성+Harmonize→Express 마감→Sharp 규격화→검수). 병행 잔여: 명화 SUSPENSION(대표 의도—결함 아님)/회선 고정IP/`* 2.*` 정리(#34)."

> 2026-06-04 **UI 한글화 STEP5 점검 + STEP1~5 전 완료** (feature/ui-ko-cleanup, main 미접촉). crawl/orders 영어 라벨·이모지 0 실측(actionable 0). UI 한글화 전 단계 완료. **다음=Desktop production 문구 육안 점검 → 머지 → 발행 관제탑 신설**.

> 2026-06-04 **UI 한글화 STEP4 — /upload 한글화 + 이모지 제거** (feature/ui-ko-cleanup, main 미접촉). /upload(엑셀 대량등록)는 워크벤치 dropzone과 별개=중복 아님 → 살림. upload-strings.ko.json i18n + 이모지→Lucide. **다음=STEP5 crawl/orders 잔여 영어 라벨(점진)**.

> 2026-06-04 **UI 한글화 STEP2+3 — root redirect + portfolio 삭제** (feature/ui-ko-cleanup, main 미접촉). page.tsx /portfolio→/dashboard + 로딩문구 i18n. portfolio 가짜 템플릿 삭제(외부 참조 0). build / redirect 검증. **다음=STEP4 /upload 중복 확인 → STEP5 crawl/orders**.

> 2026-06-04 **UI 한글화 STEP1 — 용어 사전 + #47 문구** (feature/ui-ko-cleanup, main 미접촉). studio-strings 23값 치환(키 무변경 회귀 0) + faceFreeNote #47 교체. **다음=STEP2 / redirect → STEP3 portfolio 삭제 → STEP4 upload → STEP5 crawl/orders**.

> 2026-06-04 **빌더 STEP5 — 커넥터 규칙(#48) + 캐시 점검(DEBT-11). ★ STEP1~5 전 완료** (feature/detail-builder-hybrid, main 미접촉). 도구 라우팅·파트너 모델 면책 경계 명문화 + 영구자산 no-cache 실측(Desktop 재업로드 위임). **다음=Desktop 최종 회귀 검증(달항아리 단색 불변) → main 머지 → P0 발행 재개**.

> 2026-06-04 **빌더 STEP4 — Studio UI(이미지/HTML 토글 + 무드배경 입력)** (feature/detail-builder-hybrid, main 미접촉). DetailPageCard 출력 토글 + 무드배경 URL(manualBackdropUrl 재사용). 적응형 스크림 STEP2서 선완료. optional props로 두 번째 소비자 무파손. 회귀 0. **다음=STEP5 커넥터 운영 규칙 + 캐시 점검 → 전 STEP 완료 → Desktop 최종 회귀 → 머지**.

> 2026-06-04 **빌더 STEP3 — HTML 직렬화기 신설** (feature/detail-builder-hybrid, main 미접촉). detail-html-serializer.ts + generate-detail detailHtml 필드(PNG 보존). copy 무변형(#46), 860px 인라인. 회귀 0. **다음=STEP4 가독성+Studio UI → STEP5 커넥터/캐시**.

> 2026-06-04 **빌더 STEP2 마감 — 스크림 0.40 + 다크 적응형** (feature/detail-builder-hybrid, main 미접촉). MOOD_SCRIM_ALPHA 0.40, 적응형(어두운 배경 0.60 자동 상향). 회귀 0. **다음=STEP3 HTML 직렬화기 → STEP4 가독성+Studio UI → STEP5 커넥터/캐시**.

> 2026-06-04 **빌더 STEP2-확산(2) — emotional 6개 무드 전환 + 접지그림자** (Code turn, feature/detail-builder-hybrid, main 미접촉). emotional-bg.ts 공통 헬퍼(무드 cover-fit+가독성 스크림, 접지그림자) + 6개 렌더러 1줄 스왑. informational 19개 무변경. 회귀 0(단색 경로 createCanvas 동일). **다음=Desktop 감성 무드 검증 → STEP3(HTML)~5(커넥터/캐시)**.

> 2026-06-04 **빌더 STEP2-확산 (1)표본 — sectionRole + hero 앵커링 근본해결** (Code turn, feature/detail-builder-hybrid, main 미접촉). SectionRole(emotional/informational) 도입 + 차등 투명화 정책. hero 본품 테이블면(~0.52h) 안착(50px 간격 clamp). spec informational 불투명 유지. 회귀 0. **다음=Desktop 표본 검증 → 28 렌더러 그룹 확산 → STEP3(HTML)~5(커넥터/캐시)**.

> 2026-06-04 **빌더 하이브리드 STEP2 — 연속 캔버스 foundation + hero 1-D** (Code turn, feature/detail-builder-hybrid, main 미접촉). composeContinuous(전역 배경 선합성, stackVertically 보존) + hero 본품 바닥 앵커링 + 패널 페이드. 회귀 0(단색 경로 stackVertically 그대로). **다음=Desktop hero 재검증 → 30 렌더러 확산 → STEP3(HTML)~5(커넥터/캐시)**.

> 2026-06-04 **상세 빌더 하이브리드 STEP1 — hero 무드배경 합성** (Code turn, feature/detail-builder-hybrid, main 미접촉). lifestyleAssetUrl cover-fit 배경 + 누끼 투명 합성 + 가독성 패널. 회귀 가드: 미전달 시 단색 경로 연산 동일. TSC 0/build ✓. **다음=Desktop 시각 검증 → STEP2 연속캔버스~STEP5(커넥터 운영 규칙)**.

> 2026-06-04 **명화 디퓨저 가공자산 3종 Supabase 영구화 완료** (Code turn, baseline 16578d0). Adobe 단축URL 만료 전 product-assets/cmpnooli40001f0gveaxr8iim/ 영구 적재(대표 1000/누끼/배경 860) + public 200 검증. PRODUCT_ID override로 PostgREST 권한 이슈 우회. 비가역 0(Storage only, DRAFT 유지). **다음=영구 URL을 상세페이지 합성/발행 자산으로 연결 + Figma STEP2(한도 리셋 후)**.

> 2026-06-04 **firefly-generate 어댑터 + 인물 정책 코드 정합** (Code turn, baseline 77812ea). firefly-generate.ts 신설(manual 기본/api 토글, 키 부재·파트너 모델 fail-safe 강등). ModelPolicy 'model-allowed' 추가 + classifyPersonShot 게이트 신설(classifyBackdrop 미접촉). TSC 0/build OK/비가역 0. **다음=Adobe 가공자산 Supabase 영구화 + Firefly 인물컷 classifyPersonShot 실측 + Figma STEP2(한도 리셋 후)**.

> 2026-06-04 **Adobe 가공 라인 첫 완주 + AI 인물 허용 정책 + Firefly v2** (Desktop turn, 코드 0, production HEAD 5dad281). 명화 디퓨저 가공 5단계 SOP 입증(누끼→focus 추출→1000x1000 대표→860 배경). AI 인물 정책 갱신: 익명 모델 허용/특정 실존인물 금지(구 "얼굴 없는 인체 일부" 대체, #47). Firefly 컨셉컷 v2 문서 신규. **다음=Adobe 가공자산 3종 Supabase product-assets 업로드 + Figma STEP2 7섹션 컴포넌트(한도 리셋 후)**.

> 2026-06-04 **S4 2단계 Figma 마스터 STEP1 완료 — Variables 69개** (Desktop turn, 코드 0, production HEAD 7a640b6). Figma 파일 8yuNcO8J9Pitt7glfr49Uw + Variables 69개(Brand Core 3/Concept Preset 60/Intensity 6) WEB 코드신택스 주입. starter 모드 제약(컬렉션당 1모드) → 프리셋을 변수 이름 그룹으로 보정. 설계도(docs/design/FIGMA_MASTER_BLUEPRINT_2026-06-04.md)+README Desktop 직접 저장. **다음=Figma 값 최종 눈대조 + STEP2 7섹션 컴포넌트 빌드(호출 한도 리셋 후 새 채팅)**.

> 2026-06-04 **B+C 배포 완료 + Supabase 프리셋 컬럼 적용 + aroma 적용 + 하이브리드 디자인 원칙 확정** (Desktop turn, 코드 0, production HEAD 6f02330). 채팅 B(5ea926e)+C(0f6d3be)+추가 누락분(6f02330) 3커밋 Vercel READY 실측 + runtime 200 회귀 0. apply_migration 20260603 drift 0. 명화 디퓨저 aroma/l3 적용. ★영구 디자인 원칙: 상품 디자인은 하이브리드(여러 컨셉)로 감도 제고. S4 전략: Figma 마스터+concept-presets.ts 토큰↔Figma Variables 동기화(2단계). **다음 = 새 채팅#1(Figma 마스터+토큰 동기화) / 새 채팅#2(상품관리 자동화 화면 UI/UX 설계+브라우저 E2E)**. 아래 ⭐ ACTIVE 대체.

> 2026-06-03 **디자인 프리셋 시스템 코드화 + 빌더 흡수/제거** (Code turn, baseline 4c52141, 미push). HANDOFF_MASTER_design_preset_builder §3 실행. (1) DetailPageBuilder.tsx(구 6블록 빌더) 삭제 + products/new image탭 → '상세페이지 자동화' 안내 카드(visual 탭 점프). Specs는 studio 렌더러에 존재, Q&A는 '상세 설명' HTML 필드로 보존. (2) src/lib/design/{concept-presets,section-variants}.ts(5프리셋×6요소 + 7섹션 무의존 CVA) + i18n/concept-presets.ko.json + globals.css [data-preset] --preset-* 토큰(전역 --color-* 격리 = SEO 직교 §7). (3) Prisma Product concept_preset/preset_intensity/preset_overrides + migration 20260603_add_concept_preset(멱등). TSC 0/build 0/비가역 0/cva 의존성 0. **★ 순서**: Desktop이 migration 20260603 Supabase 적용 선행 후 push 안전(컬럼 부재 시 Product 쿼리 깨짐). **다음 = 채팅 A(명화 디퓨저 aroma L3 첫 레퍼런스)**.
> 2026-06-02 **P0 발행 1단계 완주 — 정보고시 ETC + AS 형식화 + name SEO 우선 + 공통슬롯 4칸** (baseline 1664758 → push 734f25d). RESEARCH §1 정정 (#46): API v2 정보고시 템플릿 ID 참조 미지원, ETC 인라인 유일. product-builder buildProductInfoProvidedNoticeEtc + normalizeNaverPhone + pickProductName + NoticeAssets 4슬롯 + StoreSettings 4컬럼 신설 + Supabase ALTER. dryRun production 단정 4건 전수 PASS. DEBT-07/08 신규. #34 이미지 부재 보고 (assets/ 디렉토리 0건 — 후속 turn 업로드). 다음 = Desktop 대표 명시 승인 → 실 register. 또 400/502 시 invalidInputs[].name/message로 정확 사유 read.

> 2026-06-02 **P0 달항아리 register 400 사유 1순위 확정** (baseline 2fdbd32 → push 57dce53). [product-builder.ts:524] leafCategoryId가 product.category(="uncategorized") 사용 → 400. naverCategoryCode(="50000963") 우선 + 8자리 numeric 정규식 가드 fix. dryRun + NaverApiError.diagnostic 응답 노출 출하. 다음 = Desktop 대표 명시 승인 후 실 register 재호출. 또 400이면 응답 diagnostic.bodyHead로 정확 사유 즉시 read. 비가역 0(DRAFT 유지, register 호출 0건, dryRun은 네이버 호출 0).

> 2026-06-02 **P0 발행 선결 — 위탁배송 주소 기능 신설 + 진단 로깅** (baseline ac13be7). StoreSettings releaseAddressId/returnAddressId/addressbookSyncedAt 정식 컬럼 신설(Supabase ALTER 적용) + addressbooks/products/register/batch-register 정식 컬럼 read 마이그레이션 + api-client.ts NaverApiError·NaverFailKind 7분류 진단 로깅. asGuide JSON cache 폐기. 미커밋 위험 변경(legalApproval 삭제, #39) stash 격리. 다음 = Desktop 대표 환경에서 판매자센터 주소록 등록 → GET /api/naver/addressbooks 호출 → diagnostics 분기 판정 → (IP_NOT_ALLOWED 시 Vercel Static IPs 결정 / success 시 자동수거 예외처리 → 대표 승인 → 발행).

> 2026-06-02 **UI/UX 2-MOBILE-3 [코드 완료]** (baseline 0ebcd56). 모바일 컨트롤 오버플로 4건(M1 헤더·M2 탭·M3 검색·M4 BulkFloatMenu) lg: 분기 격리로 데스크톱 회귀 0. P1~P3 설계 핸드오프 신규. 다음 = P0 달항아리 발행(naver_* 17필드 충진 선결).

> **최종 업데이트**: 2026-06-02 **달항아리 publishReady=true 실측 확정** (Desktop turn, 코드 0, baseline bd286ac). production /api/products/.../publish-readiness 4축(fieldsAllSet/authentic/naverPayloadComplete/publishReady) 전부 true. ★ stale 정정 (#44): 이전 "naver_* 17필드 NULL → publishReady 거짓신호" 무효 — 90% 충진 완료, 게이트 정합 통과 (거짓신호 아님). ★ 카테고리 코드 단정 (Code turn 2026-06-02): DB값 `11_08_22_00_00`은 도매꾹 형식 → 정확한 Naver 코드 `50000963`(가구/인테리어 > 인테리어소품 > 도어벨)로 교정 필수. 발행 동선: Desktop Supabase UPDATE → 대표 명시 승인 → register. 비가역 0(register 호출 0건, DRAFT 유지). 아이스트레이는 crawl_logs 출처 부재 → 도매매 URL 대기.
> **HEAD**: bd286ac (origin/main, Vercel READY) | **TSC**: 0 errors | **빌드**: OK | **배포**: https://kkotium-garden.vercel.app
> **신규 ledger**: `docs/plan/TASK_BRIDGE.md` — Desktop ↔ Code 실시간 hand-off, §3 ACTIVE / §4 STANDING / §6 PENDING 매 세션 정독 의무
> **v3.1 영구 참조**: `docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md` — 다음 세션부터 *반드시 정독 의무*
> **v2.0 이력 참조**: `docs/research/KKOTIUM_V2_ARCHITECTURE_2026_05.md` (Sprint X 폐기 후 일부 원칙은 작업원칙 #37·#38에서 유지)
> **Private API**: 28개 전체 권한 발급 ✅ (Sprint 8 자동발주 = 매출 상승 후 보류 트랙)
> **Vercel Hobby 제한 주의**: inventory-sync (daily) + daily + weekly 3 cron 사용 중. 6-B/6-C는 inventory-sync에 piggy-back, 6-E는 weekly에 piggy-back, P0-B/P0-C는 on-event (widget fetch 시 pure compute) — 모두 추가 cron 0건. Pro plan 시 `vercel.json` 한 줄로 6시간 cron 복귀 가능
>
> **이 파일의 역할**: 진행 중·예정 Sprint 계획 + 영구 참조 (체크리스트, 비용 로드맵, 도구 사용 패턴)
> **누적 인계 메시지 + Phase A/B/C 완료 이력**: `docs/plan/archive/ROADMAP_2026Q2_MAY.md`
> **세션별 자세한 기록**: `docs/plan/SESSION_LOG.md` (직전 5세션) + `archive/SESSION_LOG_*.md`
> **현재 진행 현황 요약**: `docs/plan/PROGRESS.md`
> **소싱 워크플로우 리서치**: `docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md`

---
## 다음 새 채팅 시작 메시지 — 2026-06-12 P0 실사용 검증 (Desktop) ⭐ ACTIVE

권위본 정독: docs/handoff/NEW_CHAT_STARTER_2026-06-12_image_studio_live.md -> PARALLEL_WORK_TRACKER(rev13) -> TASK_BRIDGE §3(82).
전제: feat/image-studio main fa9ad01 production LIVE·READY. DB fidelity 완성(scents 4향). 순서 P0병합완료→P1실사용테스트→P2이미지→P3타상품.

> 2026-06-15 갱신: 세션7-i Desktop 검증 BUG(분류기 누끼 과발화) 수정 완료 — cutout 신호 hasAlpha→실제 투명(isOpaque===false). 3경로 일원화·sharp 7/7 PASS. 다음=[Desktop] /assets/classify 불투명PNG 재검증→레거시 백필 GO / Firefly 4컷. 상세 TASK_BRIDGE §3(88)·SESSION_LOG 세션7-i-fix.

> 2026-06-15 갱신2: 세션7-i-fix1~5 전부 종결·production 검증 클린 — 분류기 누끼신호(#78)·레거시 백필(#79)·/assets STALE 근본수정(#80)·자산 정합 가드(#81, 3상품 ok·depth-2 0·dead 0)·등록 워크플로 rev2 codify. **다음 ACTIVE = item2 Firefly 4컷 생성→누끼합성 / item3 발행(네이버 v2 FULL REPLACE·명시 GO)**. 상세 TASK_BRIDGE §3(92)·PARALLEL_WORK_TRACKER rev23.

```
[꽃틔움 가든 / Desktop / P0 실사용 검증: image-studio production fa9ad01]
production HEAD fa9ad01 READY 확인 후 /studio·/dashboard 실사용:
1) 관제탑 fidelity_check·mount_check 카드 인라인 렌더(강제모달0·#56) — 액션 시드 후 노출.
2) 에셋탭 업로드→자동분류·정규리네임→asset_registry insert(execute_sql 확인).
3) set_main/add_extra 후 헤더·캔버스 대표이미지 즉시 갱신(#62).
4) firefly_drop 페이로드 promptInject+"Avoid:"+마운트 물리정합 주입 확인.
5) ✅ /assets composite 9개 표시 = P0 DONE·LIVE 검증완(세션6-c·3-tier: /assets MISS·SQL 1:1·/studio 썸네일 LIVE). 미해결 해소.
규칙: 비가역0·실측우선·가짜보고0(#63).
```

[병행] Code: asset-hygiene·origin-integrity 별도세션. /assets composite RPC 수정 = 신형키 스키마 usage grant 대표 결정 후.

---

## (SUPERSEDED 2026-06-12) 다음 새 채팅 시작 메시지 — 2026-06-10 C-6 단계폴더 실생성 + 명화 Firefly 무드 (Desktop)

본 메시지를 다음 새 채팅의 첫 입력으로 사용하세요. 이중 트랙 핑퐁 (작업원칙 #41) 정합.
권위본 정독: docs/handoff/NEW_CHAT_STARTER_2026-06-10_C6_studio_run.md -> PARALLEL_WORK_TRACKER(rev6) -> TASK_BRIDGE §3(72).
전제: 병합(C-1+C-7+C-2+FT) production 982f856 READY 확정. C-4 라이브 검증 완료(seo-guard fail->info). 명화 SUSPENSION 선결(재질/색상) 내부 게이트 해소.

```
[꽃틔움 가든 / Desktop / 이어서: C-6 단계폴더 실생성 + 명화 Firefly 무드 + SUSPENSION 해제 준비]
정독: docs/handoff/NEW_CHAT_STARTER_2026-06-10_C6_studio_run.md -> PARALLEL_WORK_TRACKER -> TASK_BRIDGE §3.
1) production HEAD SHA + READY 재확인(드리프트 점검).
2) 대표가 스튜디오에서 명화 누끼/합성 적용 1회(또는 Chrome 반자동) -> storage.objects로 {pid}/cutout/·composite/ 단계폴더 실생성 + 기존 flat URL 유효 확인.
3) Firefly 무드(트랙2): 누끼 B 드롭(대표) -> 키트 프롬프트 구동 -> apply-composite 회수.
4) (대표 GO 시) 명화 SUSPENSION 해제 update PUT — 선결(재질/색상) 해소됨·안전번호 HB 2종 확보. 비가역.
규칙: 비가역0·한글 직접입력·실측우선·전상품 범용. 앱 작업이라 리서치 도구 미사용.
```

[병행 Code 트랙] C-3 ✅ 빌드(feat/finish-image-router·preview READY·병합대기) → C-5(스튜디오 마무리 카드, C-3 병합 후) → C-8(#57). 합성 표준=docs/design/ADAPTIVE_COMPOSITE_ENGINE.md(신규 권위·대표 리뷰). 진입문구=docs/plan/CUTOUT_CROP_FEATURE_BUILD_PLAN.md.
[절대준수] 비가역 0(네이버 PUT/발행·Adobe 폴더삭제는 대표 GO 전 0)·한글 직접입력·실측우선(#45)·Production=Vercel only·전상품 범용(#55).

---


---

> 이전 SUPERSEDED 메시지·직전 인계·Session E 디테일은 `docs/plan/archive/ROADMAP_2026-05_part2.md`로 이관(2026-06-01, Lane 1-D turn). 검색용으로만 참조.

## Sprint 6 — P0 (즉시 ROI, 매출 직접 영향)

**기간 목표**: 2-3 채팅 세션 안에 P0-A·B·C 모두 완료.

### P0-A. 도매꾹 OpenAPI v4.5 옵션 정확도 강화

**근거**: `docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md` 11번 — selectOpt 해시 + 텍스트 동시 비교, seller.vacation 검증, channel 검증으로 마진 오차 + 굿서비스 폭락 차단.

**구현 작업**:
- `src/lib/option-integrity.ts` (신규) — selectOpt 해시 + 텍스트 동시 비교 함수
- `src/lib/crawler/auto-mapper.ts` 강화 — seller.vacation 검증 + channel 도매꾹/도매매 검증
- `src/app/crawl/page.tsx` — 옵션 변경 / 휴가 / 채널 불일치 시 UI 알림

**검증 케이스 (실제 도매꾹 5건)**:
- 옵션 부분 수정 (해시 동일·텍스트 변경)
- 공급사 휴가 중
- 도매꾹/도매매 채널 마진 차이
- 옵션가 0/null (금액비노출)
- 정상 케이스

### P0-B. 등록 7일 골든 윈도우 트래킹 위젯

**근거**: 리서치 10번 — 등록 후 3-7일 신상품 가산점 종료 전 클릭/판매 모멘텀 확보. D+1/3/7 미달 시 알림.

**구현 작업**:
- `src/lib/golden-window-tracker.ts` (신규) — Product.registeredAt 기반 D+1/D+3/D+7 분기, 클릭/판매 상태 평가
- `src/components/dashboard/GoldenWindowWidget.tsx` (신규) — 정원 일지 위젯
- "상품명 토큰 1개 교체 권장" 자동 제안 (가장 약한 키워드)

**검증**: 임의 등록일 5건 mock 주입 → D+1/3/7 분기별 위젯 렌더링 + 알림 트리거 확인.

### P0-C. 효자 상품 자동 식별 (멱법칙 시각화)

**근거**: 리서치 10번 — SKU 30~50개 단계에서 상위 5개 효자 상품이 매출 70~80% 차지. 광고 80% 집중 가이드.

**구현 작업**:
- `src/lib/pareto-analyzer.ts` (신규) — orders 테이블 기반 상위 20% 자동 식별
- `src/components/dashboard/ParetoTopWidget.tsx` (신규) — 정원 일지 위젯

**검증**: orders mock 50건 → Top 20% 분류 + 위젯 렌더링.

---

## Sprint 7 — P1 (SEO 정확도 강화, 노출 직접 영향)

### P1-A. 카테고리 1페이지 일치율 검증

**근거**: 리서치 6번 — 메인 키워드 검색 → 1페이지 상품 카테고리 80%+ 일치 카테고리만 추천.

**구현 작업**:
- `src/lib/category-page-validator.ts` (신규)
- `src/app/api/category/suggest/route.ts` 강화 — 1페이지 분포 분석 추가

### P1-B. 상품명 금기어 페널티 강화

**근거**: 리서치 4번 — 이벤트/할인/배송/적립/쿠폰 키워드 + 중복 단어 3회+ + 허용 외 특수문자.

**구현 작업**:
- `src/lib/honey-score.ts` 강화 — 금기어 명시적 검출 + UI 알림 메시지
- 씨앗심기 / 검색조련사 UI에 빨간 알림 추가

### P1-C. 태그 사전 등재 검증

**근거**: 리서치 7번 — 네이버 태그사전 등재 키워드만 SEO 효과.

**구현 작업**:
- `src/lib/naver/tag-dictionary.ts` (신규) — 네이버 검색광고 API 키워드 도구 활용 (CUSTOMER_ID: 3755315)
- 태그 입력 UI에 "사전 미등재" 경고 표시

---

## Sprint 8 — P2 (운영 도구 강화)

### P2-A. 다크패턴 정가 부풀리기 경고

**근거**: 리서치 8번 — 도매가 대비 판매가 3배 이상 + 즉시할인 30%+ 동시 = 공정위 다크패턴 위험.

**구현 작업**:
- `src/components/products/MarginCalculator.tsx` 강화 — 다크패턴 위험 시 경고 배너

### P2-B. AiTEMS 자연어 키워드 제안기

**근거**: 리서치 13번 — AI 쇼핑 에이전트 자연어 롱테일 쿼리 ("원룸 미니멀", "신혼 첫집", "MZ 자취").

**구현 작업**:
- `src/lib/aitems-natural-keywords.ts` (신규) — 카테고리별 상황·용도·세대 키워드 사전
- 검색조련사 / 씨앗심기 UI에 "자연어 키워드 추천" 섹션

### P2-C. 등급 임계값 2025.12.2 개편 반영

**근거**: 리서치 1번 — 파워 등급 800만원 + 굿서비스 이중 평가.

**구현 작업**:
- `src/components/dashboard/GoodServiceWidget.tsx` 강화 — 등급 임계값 명시 + 이중 평가 UI

---

## Sprint 9+ (P3) — 매출 600만원+ 후

- **P3-A**. Tailscale Funnel + home-proxy 큐 분리 (재시도 3회 + DLQ) — 작업원칙 #28 준수
- **P3-B**. Naver Commerce API 본격 활용 (단건 검토 → API 등록 워크플로우)
- **P3-C**. 광고 ROAS 추적 (네이버 검색광고 API 캠페인 데이터 통합)

---

## 잔여 Z-시리즈 (별도 sub-graph)

### Z-3c' (꽃졔님 개별 Y/N 승인 필요)

**대상**: 사이드바 미등록 고아 라우트 정리 (Q1·Q2·Q3 진단 완료)
- `/products/[id]/edit` (구버전 ProductForm.tsx 582줄, 외부 진입 0건) — 100% dead route 확정
- `/products/upload` (CSV 일괄 업로드, 새싹 단계에서 권장 안 함)
- `/products/sourced` (카드 그리드 뷰, 사이드바 미등록)
- `/products/out-of-stock:158` dead reference 수정

**방법론**: Hard delete + Git 이력 보존 (꽃졔님 명시 승인). `git rm` → 복구는 `git log --all --full-history --diff-filter=D -- <path>` → `git checkout <hash>^ -- <path>` (1줄).

### Z-3e

**대상**: 백업 파일 67개 일괄 정리 — `find src/ -name "*.bak*" -o -name "*.backup*" -o -name "*.v[0-9]*"`

### Z-Sec

**대상**: 14개 Supabase 테이블 RLS 정책 설계 (Supabase advisory).

---

## 비용 로드맵

| 시점 | 비용 |
|------|------|
| **현재 (Phase A+B+C+D+E+ Sprint 1~5)** | **0원** (E-13B 알림톡 UI만 구현, 발송 비활성) |
| 월 주문 50건+ | 솔라피 알림톡 건당 13원 (월 ~650~1,950원) |
| 월 매출 50만+ | Gemini 유료 ~$20/월 (현재 Groq fallback로 충분) |
| 월 매출 100만+ | Supabase Pro $25/월 |
| 월 매출 200만+ | Vercel Pro $20/월 |
| 월 매출 500만+ | 크리마/브이리뷰 전문 리뷰 솔루션 검토 |
| 월 매출 600만+ | Naver Commerce API 본격 활용 + home-proxy 분리 (P3-A·B) |

---

## 미분류 개선 항목

| 항목 | 내용 | 우선순위 |
|------|------|---------|
| detail_image_url 입력 | 기존 8개 상품 씨앗심기 편집에서 직접 입력 | 낮음 |
| API 키 정리 | GROQ_API_KEY_2 (3pEakT, 401 Invalid) Vercel 삭제 | 보안 |
| Gemini 키 3개 정리 | 운영 기여 0 → 새 무료 키 확보 시 정리 | 낮음 |
| 사이드바 배지 실시간화 | 소싱/등록대기/품절 숫자 (옵션 C SWR로 구현됨) | 완료 ✅ |
| 대시보드 파이프라인 배지 | 병목 구간 숫자 표시 | 낮음 |
| 엑셀 다운로드 이미지 경고 | 상세이미지 없는 상품 강화 경고 | 낮음 |

---

## 새 채팅 시작 체크리스트

```
1. git rev-parse HEAD origin/main → 일치 확인 (작업원칙 #21·#23)
2. git status --short → working tree + git stash list → stash 보존 확인
3. wc -l docs/plan/*.md docs/research/*.md → 1500줄 초과 시 자동 분할 (작업원칙 #31)
4. curl http://localhost:3000/dashboard → HTTP 200
5. docs/plan/PROGRESS.md + ROADMAP.md + SESSION_LOG.md 헤더 정독
6. 해당 TASK 관련 코드 파일 read (작업원칙 #26 (a) IA 점검)
7. 꽃졔님 진단/계획 디테일 브리핑 → 개별 Y/N 승인 후 작업 시작
8. 작업 완료 후 PROGRESS.md + ROADMAP.md + SESSION_LOG.md 모두 업데이트
9. commit + push 한 turn 안에 끝내기 (작업원칙 #24)
```

---

## 중요 체크포인트

```
- 코드 수정 후: npx tsc --noEmit → 0 errors 확인 필수
- push 전: 이모지 없는지 확인 (grep -rn "이모지" src/)
- Vercel 환경변수 변경 후: git commit --allow-empty && push
- 브라우저 테스트: API 200만으로 완료 처리 금지, Chrome MCP 시각 확인 필수
- E-13B 알림톡: 2단계 접근 — 1단계 UI만 (키 미입력 시 안내), 2단계 매출 50건+ 시 솔라피 키 입력 → 즉시 활성화
- 반품안심케어 수수료: 2025.8.1 개편 기준 (식품50/생활90/가구160/패션의류650원), 보상금 상한 8,000원
- 리뷰 API: 네이버 커머스 API 미지원 (GitHub #1582) — 수동 입력 + 크롤링만
- 카카오 채널: 꽃틔움 KKOTIUM, _xkfALG (하드코딩 금지, store_settings 단일 소스)
- 네이버 내장 무료 리뷰 알림: 배송완료 D+3 구매확정 + 구매확정 시 리뷰 알림 + 기본 적립금 자동 작동 중
- 톡톡 소식알림: 월 1회 무료, 추가 건당 10원
- 솔라피 무료 플랜: 플랫폼 0원 + 건당 13원 + 가입 시 300포인트 (~23건)
- AiTEMS 추천 ON: 스토어관리 활성화 → 무제한 개인화 노출, 전체 클릭 ~10%
- 2026.1.1부터 알림톡 쿠폰/마일리지 사용유도 메시지 제한 강화
```

---

## 도구 사용 패턴 (반복 학습 누적)

```
- iTerm MCP: list_all_sessions → 세션 확인 후 사용. heredoc 절대 금지 → Python 스크립트 작성 후 실행
- Filesystem MCP edit_file: byte-perfect oldText 필수 — 수정 전 read_text_file 확인
- 대형 TSX (600줄+): write_file 전체 교체 또는 Python 패치 (edit_file byte 매칭 실패 방지)
- Chrome MCP javascript_tool / Control Chrome execute_javascript: 4분 hang 패턴 — 검증 1순위는 tabs_context_mcp + screenshot
- Next.js dev hot-reload: 같은 컴포넌트 한 세션 2회 패치 시 .next 정리 + dev 재시작 의무
- 도매꾹 OpenAPI v4.5: https://domeggook.com/ssl/api/?ver=4.5&mode=getItemView&aid={KEY}&no={no}&om=json
- Supabase 마이그레이션: SQL Editor 또는 Supabase MCP apply_migration (project doxfizicftgtqktmtftf)
- 한글 작업 후: grep -nE "꽃졔|혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두" 검증 (작업원칙 #29 (e))
```

### 도매매/도매꾹 플랫폼 이해

```
- 도매매(DMM) = 플랫폼 (Platform 테이블)
- 도매꾹(DMK) = 플랫폼 (Platform 테이블) — 도매매 계열사
- 플랫폼 안의 개별 판매자 = 공급사 (Supplier 테이블)
- 공급사의 domeggookSellerId = 도매꾹/도매매 판매자 고유 ID
```

### 수수료 구조 (2026 확정)

```
- 카테고리별 차등 없음 (2025-06-02 개편 이후)
- 판매자 등급 기반: 중소3 = 3.003% + 2.73% = 5.733% (NAVER_DEFAULT_FEE_RATE = 0.05733)
- 예외: 디지털/가전 4.8%, 도서 4.5%
```

---

## 코드 작성 원칙 (요약)

자세한 31개 원칙은 `docs/plan/PROGRESS.md` "절대 작업 원칙" 섹션 참조.

핵심 5가지:
1. **JSX 이모지 금지** — Lucide React SVG만
2. **한글 처리** — 작업원칙 #29 (5가지 규칙)
3. **MD 1500줄 초과 자동 분할** — 작업원칙 #31
4. **Vercel 배포 = source of truth** — npm run dev 의존 금지 (작업원칙 #28)
5. **commit + push 한 turn 안에** — 작업원칙 #24
