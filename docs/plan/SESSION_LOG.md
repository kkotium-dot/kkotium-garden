## 2026-06-10 (세션3) 병합 production READY 확정 + C-4 라이브 검증 + SUSPENSION 선결 해소 (Code/Desktop turn)

production 982f856 READY(병합 C-1+C-7+C-2+FT 반영). 비가역 0(네이버·Adobe 무접촉·main_image_policy 가역 DB set). 권위: NEW_CHAT_STARTER_2026-06-10_C6_studio_run + PARALLEL_WORK_TRACKER rev6 + TASK_BRIDGE §3(72).

**[병합 production READY 확정]** 세션2 종료 시 BUILDING이던 병합 빌드가 READY 확정 — Vercel list_deployments 실측 dpl_FXyEE7V56gjJEjQXsE3kT5LmLnXQ = state READY·target production·SHA 982f856(ref main "merge: C-1+C-7+C-2+FT 폴더자동분류"). C-1(누끼)/C-7(합성)/C-2(어도비 누끼 적용)/FT(폴더 자동분류) 라우트가 production 동작. "production 미반영" 블로커 해소.

**[C-4 대표이미지 정책 라이브 검증]** 스키마 실측: main_image_policy(varchar·nullable)·extra_images(jsonb·기본 []·NOT NULL) 둘 다 production DB 반영. 명화 main_image_policy=lifestyle_intended 설정(가역 DB write, POST /main-image-policy 컬럼-only 효과 라우트 직독 확인, 대표 영구결정 6h 가죽 대표라 유지·해제 아님). GET /api/products/[id]/seo-guard production before/after: 정책 전 main_image_white_bg=fail·seoGuard.ok=false → 정책 후 main_image_white_bg=info("operator가 의도적으로 유지한 라이프스타일 대표")·seoGuard.ok=true. C-4 강등 정상 동작.

**[매트릭스 인과 엔진 직독 확정]** 명화 nextAction=resolve_suspension(apply_curated_main 아님) — computeNextAction Step6에서 publishDrift=true(SUSPENSION)가 curatedGate보다 먼저 매치 + 명화 mainImageApplied=curated·lifestyleRep=true로 apply_curated_main 삼중 소거. 정책의 apply_curated_main 소거 로직(!lifestyleRep && main!=='curated')은 엔진에 정상 존재하나 명화는 SUSPENSION+curated에 가려 직접 관찰 안 됨. 대조군 달항아리 mainImageApplied=default → nextAction=apply_curated_main 노출(정상).

**[SUSPENSION 선결조건 해소 확인]** 명화 실측: naver_material=유리·naver_color=투명 이미 채워짐·missingRequired=[]·readinessGrade S/score 94·attributeGrade A/78. SUSPENSION 근본원인(필수속성 재질/색상 누락)은 내부 게이트에서 해소 완료. 남은 것=네이버 측 실제 해제(update PUT·statusType→SALE). 안전번호 2종(HB19-12-1462 / HB21-12-2572) 입력값 확보. 대표 GO 후 비가역(#46).

**[자산 폴더 단계생성 baseline 재확인]** storage.objects 실측: 명화13·달항아리9·아이스트레이1 전부 root_flat·단계 하위폴더 0. FT 코드 production 반영됐으나 배포 후 신규 업로드 0건이라 단계폴더 미생성(정상·예상대로). 기존 flat URL 무손상. C-6=스튜디오 적용 1회로 단계폴더 실생성 검증(대표 실행 or Chrome 반자동, Claude 앱 POST 불가).

**[인계]** NEW_CHAT_STARTER_2026-06-10_C6_studio_run.md 권위본 작성 + PARALLEL_WORK_TRACKER rev6 + TASK_BRIDGE §3(72) 갱신(Desktop). 본 turn=Code가 PROGRESS/SESSION_LOG 세션3 기록 + docs git 보존(#41 핑퐁).

**[발행 비행전 점검 + 업로드 확장자 교정]** 발행 비행전 점검(publish-preview): canPublish=true·payload statusType=SALE·HB 안전번호 2종 포함(GREEN). 단 라이브 inspect 대조로 ★대표 확인 필수 2건 발견(전체교체 PUT이라 발행 전 필수) — (1)원산지 라이브 네이버=중국산(0200037) vs payload=국산(00): 미검증 국산발행은 허위표시 리스크(대외무역법/관세법) (2)옵션 라이브 3종 vs payload 4종(코튼어라운드 실판매 확인). SUSPENSION 유력원인=안전기준 신고 부재 → payload HB로 해소. C-6 코드 오류체크: 단계폴더 경로 정합·블로커 없음. + uploadAutomationAsset 확장자 .png 하드코딩 latent finding(C등급) → 본 turn 교정: path 확장자를 contentType에서 파생(image/jpeg→jpg·image/png→png·그외 png). apply-composite/white-bg/apply-cutout/thumb-crop이 image/jpeg를 .png 경로로 저장하던 mismatch 해소. 기존 URL 무영향(신규 업로드만).

**[ENGINE §9 표준 박제 + 파이프라인 배선 검증 + 코튼어라운드 결정]** Desktop 편집 git 보존: ADAPTIVE_IMAGE_SEO_ENGINE.md §9 신규(통합 자산 파이프라인+저장경로 전상품 표준 — product-assets/{pid}/{cutout|composite|thumb|detail|archive}, 단계->폴더->개입점 매핑, §9-D 상품 단건 설계 금지·컨셉조합만 상품별 결정) + DETAIL_PAGE_PLAYBOOK §1 저장경로 교차참조. 검증(오류체크·직독): detail/ 적재 어댑터 end-to-end 배선 확정 — useStudioActions.runDetail->generate-detail(렌더+detailBase64 반환, 저장 안 함)->runSave->POST save-assets->uploadAutomationAsset({kind:'detail', variant:skeletonId})->{pid}/detail/{skeletonId}-{ts}.png. 즉 실제 writer는 save-assets(generate-detail은 렌더러·헤더 주석 명시). detail/ 현재 0건은 FT 폴더택소노미 배포 후 save-assets 호출 0회 때문(세션3 storage 실측과 정합) -> §9-A '정의·배선 완료, 가동은 랜딩 시' 문구 정확·미배선 아님. C-5/C-8 배선 추가 불요(물리적 detail/ 생성은 C-5 스튜디오 저장흐름·C-6 검증서 자연 발생). 코튼어라운드 옵션=품절처리(재고0)·상세페이지 포함 결정(세션3) -> 명화 발행 payload 옵션 4종 vs 라이브 3종 정합(4번째=코튼어라운드=품절).

**[다음]** Desktop+대표: C-6 단계폴더 실생성 + 명화 Firefly 무드(트랙2, 누끼 B 드롭→키트 구동→apply-composite 회수). Code: C-3→C-5→C-8(#57, finish-image 단일 라우터·스튜디오 통합 카드·추가이미지 멀티슬롯). 후속 대표 GO: 명화 SUSPENSION 해제 update PUT(선결 해소됨·안전번호 HB 2종·비가역).

---

## 2026-06-09 (세션2) 누끼/크롭/합성 마무리 시스템 C-1·C-7·C-2·FT·C-4 (Code turn)

feat/composite-pipeline 누적 HEAD 0b7d291(프리뷰 브랜치, production main e0c7f19 미접촉). 비가역 0(네이버 0·DB 가역·기존 자산 미이동). 권위: CUTOUT_CROP_FEATURE_BUILD_PLAN + REPRESENTATIVE_IMAGE_FINISHING_SYSTEM + ASSET_FOLDER_TAXONOMY_BUILD + 작업원칙 #57.

**[C-1 인앱 SIMPLE 누끼]** (2ff4a77) bg-difficulty.ts(가장자리 ring 통계→SIMPLE/COMPLEX 0~100) + white-bg.ts(flatten-white+contain 1:1 1000px·OCR/흰배경 가드 공유) + POST /white-bg(dry-run→confirm 대표 적용·가역). 정직: sharp white-flatten=ML 세그멘테이션 아님, 비흰배경=COMPLEX→Adobe.

**[C-7 합성 파이프라인]** (65275b9) composite.ts(누끼+무드 sharp 단순합성·contact shadow·warm grade harmonize 근사 + Firefly 회수 normalize) + POST /apply-composite(extra_images 슬롯 append·가역·P2022 가드) + job-type-routing product_composite/harmonize(CHECK 기존값·마이그레이션 불요). 정직: 진짜 relight=Firefly 경로.

**[C-2 어도비 누끼 적용 + #57]** (cdbb423) POST /apply-cutout(cutoutUrl→whiteBgFinish 재사용→흰배경 대표·bg_clean job done 전이·원본 누끼 cutout/ 추적성) + finishing-guidance.ts(#57 실촬영 히어로컷 우선·한글 라벨 JSON) + asset-edit-job 회수 안내(recoverVia).

**[FT 폴더 자동분류]** (b73f526) AssetKind 2→5(cutout/composite/thumb/detail/archive) + 경로 {pid}/{kind}/{variant}-{ts} + listProductAssets/findCachedAsset 하위폴더 재귀(stage 필드·flat 우선) + asset-taxonomy.ts(STAGE_FOLDER Adobe 미러·kindForSource·safeVariant). 기존 flat 자산 미이동(URL 보존). 생산자 8곳 정합.

**[C-4 seo-guard override]** (0b7d291) main_image_policy=lifestyle_intended → seo-guard white_bg fail을 info로 강등 + control-tower curatedGate가 대표 마무리 항목 억제 + POST /main-image-policy(설정/해제 가역). 매트릭스 별도 가드 쿼리(#50). 개입대기열 연결=비흰배경 대표 apply_curated_main 항목을 override로 일관 강등.

**[마이그레이션 박제(Desktop apply)]** MIGRATION_c7_extra_images + MIGRATION_c4_main_image_policy(둘 다 ADD COLUMN IF NOT EXISTS·멱등·C-3 공유). job_type CHECK 불요(composite/harmonize 기존 25값).

**[검증]** 전 commit tsc 0/build OK/이모지 0/코드 한글 0/비가역 0. feature 브랜치=프리뷰(production SHA 불일치 정상 #36).

**[다음]** Desktop: 마이그레이션 2종 apply → 프리뷰 실측(C-1~C-4 dry-run/confirm·seo-guard override·폴더 생성·flat URL 유효) → C-3(finish-image·extra_images 슬롯)·C-5(스튜디오 카드)·C-6(브라우저). Adobe CC 폴더생성=승인 게이트.

---

## 2026-06-09 프리셋 엔진 Phase A/B 검증 + 누끼/크롭 마무리 시스템 설계·인계 (Desktop turn)

production runtime aa7e5b9 / HEAD c55248d. 비가역 0(네이버 0·DB read-only·문서만 작성). 권위: PARALLEL_WORK_TRACKER 6e/6h + 대표 지시(누끼+크롭 전상품 기능화).

**[검증 — 프리셋 엔진 #45]**
- Vercel: runtime aa7e5b9 / HEAD c55248d 전부 READY(#36).
- B-2 seo-guard(명화): orthogonalToPreset true / product_name_50 warn(22/50 grade S) / main_image_white_bg **fail**(가죽 크롭 비흰배경 정직 검출) / category_accuracy pass(50003356).
- B-3 generate(명화 presetOnly): preset aroma/l3 · recommendedPreset aroma · matchesRecommendation true · 7섹션 content(scents3·specRows5·values3) · slots null · locked[logo,signature_color,price_cta,seo_fields] · groundedFacts true.
- title: reload 후 "꽃틔움 가든" 정상(이전 "꽃티움가든"은 배포 전 stale 탭, #44 오탐 회피).

**[설계·인계 — 누끼/크롭 마무리]**
- 코드 실측: thumb-crop=완성(크롭) / asset-edit-job bg_clean=seed만·executor 없음(누끼 갭) / seo-guard fail 개입대기열 미연결.
- 신규 문서: docs/design/REPRESENTATIVE_IMAGE_FINISHING_SYSTEM.md(적응형 라우터·seo-guard 연동·추가이미지·override) + docs/plan/CUTOUT_CROP_FEATURE_BUILD_PLAN.md(C-1~C-6 청크·각 새 채팅·진입문구).
- 대표 결정 반영: 명화 대표=가죽 유지(override 1호). seo-guard white_bg=차단 아닌 권고.
- 트래커/TASK_BRIDGE(67) 갱신. 이스케이프 글자깨짐 자가교정(직접 입력 원칙 재확인).

**[정직 메모 #46]**
- 이번 세션 Adobe 이미지 도구 deferred + bash/스토리지 업로드 없음 → 누끼 생성물 영구호스팅·DB 적용 불가 → 적용부는 앱(Code)이 올바른 구조로 설계. "첨부했던 썸네일 크롭 후보"는 요약 유실로 본 컨텍스트에 없음 → 구현 채팅에서 재첨부 요청 예정.

**[다음]**
- Code C-1 ∥ C-2 ∥ C-4 병렬(각 새 채팅) → Desktop 검증 → C-3 → C-5 → C-6(브라우저 테스트=Desktop).

---

## 2026-06-08 아틀리에 job 생명주기 컨트롤 (취소/재시도/되돌아가 수정) (Code turn)

main 직접 d08341e. 비가역 0(네이버 0·asset_jobs DB만). tsc 0/build OK/이모지 0/한글 코드 0. 권위: PARALLEL_WORK_TRACKER #8 + STUDIO_ATELIER_UX_REDESIGN.

**[한 것]**
- 선결: JobLifecyclePanel(워크벤치 우측 asset_jobs 표시)을 controls 슬롯 상단 마운트. SWR 8s 폴링. jobs 0이면 미표시(방해 0). AiQueueStepper(로컬 HITL)와 별개로 실제 asset_jobs 노출.
- 상태머신: asset-job-state ALLOWED_TRANSITIONS 확장 — in_progress->cancelled(운영자 중단/abort), done/cancelled->ready(운영자 step-back/reopen, terminal 해제는 human reopen만). 전이 가드·낙관적잠금·전이로그 계승.
- 엔드포인트: NEW /api/products/[id]/jobs. GET=상품 asset_jobs 목록(P2021/P2022 가드→빈목록 degrade). POST {jobId,action:cancel|retry|reopen}→transitionJob(cancel→cancelled / retry→ready[failed/rejected/blocked] / reopen→ready[done/cancelled]). 소유 가드(job.productId===productId). JobTransitionError→409(NOT_ALLOWED/RETRY_EXHAUSTED/VERSION_CONFLICT).
- UI: JobLifecyclePanel 상태칩(그린/앰버/보라/뉴트럴·레드 0) + 컨트롤. 취소=뉴트럴(회색 fill)·재시도/되돌아가=아웃라인. 레드는 발행GO·메인지정만(75/15/10). CANCELLABLE/RETRYABLE/REOPENABLE 세트가 ALLOWED_TRANSITIONS와 정합.

**[production 실측 — control loop]**
- 명화(cmpnooli4) asset_jobs 10개(전부 cancelled, 과거 stale B안) GET 확인 → reopen(aj_mh_b_cut: cancelled->ready) success → cancel(ready->cancelled) success로 복원. transitionJob 상태머신+append 전이로그 end-to-end 동작 확인. 비가역 0(asset_jobs만, 복원 완료, audit 전이 2행 잔존).

**[다음]**
- Desktop Control Chrome: 워크벤치 우측 진행 작업 패널 노출·취소/재시도/되돌아가 버튼 동작·레드 스코프(취소 뉴트럴) 실측. PARALLEL_WORK_TRACKER #8 완료.

---

## 2026-06-08 아틀리에 2단계 — 우측 독립 스크롤 교정 + 워크벤치 임시저장 (Code turn)

main 직접 b665440. 비가역 0. tsc 0/build OK/이모지 0/한글 코드 0. 권위: STUDIO_ATELIER_UX_REDESIGN + PARALLEL_WORK_TRACKER #7.

**[한 것]**
- (1) 우측 패널 독립 스크롤: 근본원인=WorkbenchTabs(컨트롤 슬롯) ScallopCard overflow:hidden+flex:1이 탭 패널 클리핑→aside overflow-y-auto 무력화. 교정: overflow:visible+flex 제거(카드 성장→aside max-h 초과→스크롤). aside max-h calc(100vh-2rem)+overscrollBehavior:contain+paddingBottom 24. 전상품.
- (3) 임시저장: useStudioActions productId별 localStorage(kkotium:studio:draft:{id}). 경량 입력만(생성 자산 미저장). reset 효과 동기 복원(restoredForId 가드)+600ms 디바운스 저장+clearDraft. 헤더 임시저장됨 HH:MM(Check). 새로고침 유지·가역.

**[SCOPED]**
- (2) job 생명주기(취소/재시도/step-back): 워크벤치 asset_jobs 미표시 → 표시 통합+transitionJob 래핑 엔드포인트 선결. 별도 turn.

**[다음]**
- Desktop Control Chrome: 우측 펼침 시 마지막 버튼 도달·새로고침 복원. 후속: job 생명주기 전용 turn.

---

## 2026-06-08 인제스트 재발방지 + 2갈래 실품질 + 명화 상세 Branch A (명화 큐레이션 完) (Code turn)

main 직접 f3c3784. 비가역 0(네이버 0). tsc 0/build OK/이모지 0/한글 코드 0. 권위: PARALLEL_WORK_TRACKER #3·4·5 + IMAGE_DETAIL_TWO_BRANCH_SYSTEM.md.

**[한 것]**
- (1) 인제스트 재발방지: NEW src/lib/sources/parse-dome-no.ts(도매 url 번호 파서 /s/·?uid=·?no=·bare digit, sharp-free 분리해 products route가 sharp 미적재). products POST create가 supplier_product_code를 explicit→data.productNo→parseDomeProductNo(sourceUrl/url/productUrl) 폴백 → 누락 0(전상품 재발방지).
- (2) 2갈래 실품질 평가: capture-source-detail가 캡처 버퍼 assessImageQuality→quality_reasons.sourceDetailGood(score>=50)+sourceDetailScore 저장. engine deriveSourceStrategy(hasSourceDetail·detailGood·thumbGood[main curated] → A/A_EXTRACT/MIXED/B/unknown). matrix sourceDetailGoodById read. 관제탑 칩 4값. ★production 실측: 명화=A(상세양호+대표curated)·달항아리=B(Desktop 백필 캡처 860x2294 저점→poor)·아이스트레이=unknown(crawl_log 없어 미캡처). 가용성 노출→실품질 라우팅 전환.
- (3) 명화 상세 Branch A 채택: NEW POST adopt-source-detail(detail_image_url=source_detail_url + 1000x18291 mostly_blank 확인 후 detailCurated=true·detailBranch=A 스탬프, 가역·생성 안 함). DetailPageCard "공급사 상세 그대로 적용" 버튼(sourceDetailUrl 존재 시, 생성 대안 경로). 스튜디오 page sourceDetailUrl 배선. ★명화 실행: re-capture(sourceDetailGood 채움)→adopt→detail=curated(production 매트릭스 실측).

**[명화 큐레이션 完]**
- main=curated(v2 크롭, 풀해상 상세서 추출)·detail=curated(Branch A 공급사 1000x18291 그대로)·sourceStrategy=A. 잔여=SUSPENSION 해제(대표 GO 비가역만).

**[다음]**
- Desktop: (a) 명화 main+detail=curated·sourceStrategy=A 매트릭스/Chrome 실측 + 상세 미리보기(공급사 채택본) 육안 → 대표 컨펌 (b) 아이스트레이 도매번호 operator 제공→capture (c) 명화 SUSPENSION 해제 발행 GO(비가역, 대표 "GO"). 후속: Branch A SEO/ROI 보강 자동화·Branch B 27렌더러(별 turn).

---

## 2026-06-08 풀해상 상세 캡처(P16 해소) + 명화 main=curated 실행 + 2갈래 sourceStrategy (Code turn)

main 직접 a4ffb43(캡처)·555466c(sourceStrategy). 비가역 0(네이버 0). tsc 0/build OK/이모지 0/한글 코드 0. 권위: docs/design/IMAGE_DETAIL_TWO_BRANCH_SYSTEM.md. ★지난 turn item1 BLOCKED(1000x18291 소스 부재) 완전 해소.

**[한 것 — EXECUTED]**
- (1) 풀해상 공급사 상세 캡처(P16 근본 해소): 실측으로 근본원인 확정 — Domeggook getItemView desc.contents는 객체(item/deli/event/otherItem)이고 풀해상 상세는 공급사 자체 호스팅(hm5989.godohosting.com)에 hotlink 보호. 기존 크롤은 thumb.largePng(_stt_330=330x330)만 저장(P16). NEW src/lib/sources/capture-supplier-detail.ts(desc.contents stringify→이미지 URL 추출·_stt 썸네일 제외·Referer 헤더 fetch·sharp 최대면적 선택) + POST /api/products/[id]/capture-source-detail(getItemView→캡처→product-assets 업로드→source_detail_url 컬럼 set). 마이그레이션 add_source_detail_url(박제 MIGRATION_source_detail_url). ★명화 실행(productNo 65322245): this_is_air_freshener_detail.jpg=1000x18291 캡처→Supabase product-assets 저장.
- (4) 명화 대표 v2 curated 실행: 캡처 Supabase 소스(referer 불요)에 thumb-crop box{x147,y9407,w696,h696}→1000²(업스케일 1.44x+extractSquare 언샤프 sigma1.0)·confirm:true. dry-run 검증: source 1000x18291·region 정확·cropSidePx 696·ocrText None(텍스트0)·LOW_RESOLUTION caution만(비차단). 적용 성공→mainImage=product-assets/thumb-cropmain-...png. ★production 매트릭스 실측: 명화 mainImageApplied=curated(default→전이 완료), sourceStrategy=A.
- (2) sourceStrategy 부분: applyStatus.sourceStrategy(A=source_detail_url 확보→그대로활용 Branch A 후보 / unknown=미캡처). matrix hasSourceDetail read + 관제탑 ApplyStatusIndicator 칩(공급사상세 A). 명화=A 실측. ★good/poor 품질 분리 평가(A vs B 확정)는 후속.

**[후속 (정직 #46)]**
- (2) full: quality-classifier 공급사 상세품질·썸네일품질 분리 평가(가용성→실품질). (3) Branch A SEO/ROI 보강(상세 그대로+미달요소만 추가) 본격 구현. Track2(27렌더러 생성)=Branch B 전용(명화 불필요·별도 turn).

**[다음]**
- Desktop: (a) 명화 main=curated 매트릭스/Chrome 실측 + 새 대표컷 육안(상세 9407px 부근 단품 제품) (b) 전상품 capture-source-detail 실행(풀해상 확보·Branch A 토대) (c) 명화 상세=Branch A 그대로 활용 결정 시 source_detail_url 적용. 명화 SUSPENSION 해제는 대표 GO(비가역).

---

## 2026-06-08 명화 큐레이션 마무리 — 정합·상세 curated·언샤프 (item1 실행 BLOCKED) (Code turn)

main 직접 6bf8ddf. 비가역 0(네이버 0). tsc 0/build OK/이모지 0/한글 코드 0. 권위: Desktop TASK_BRIDGE 4항목. Track1 라이브 통과 확인.

**[한 것]**
- (4)✅ nextAction-queue 정합 통일: curated 게이트(default 대표/상세→apply_curated_main/build_detail)·SUSPENSION drift(resolve_suspension)를 computeNextAction(SoT 사다리)에 흡수, computeActionQueueItem은 key→category 매퍼로 축소. verify_publish 잔존 제거. NextActionKey 3종 추가. production 실측: 3상품 nextAction.key==queue.stage 전부 일치. tsx 7케이스(legacy applyStatus 없을 시 verify_publish 안전).
- (3)✅ 상세 curated 실콘텐츠 한정: classifyDetail = /product-assets/ AND quality_reasons.detailCurated. apply-detail가 assessImageQuality occupancy<0.15(mostly_blank) 검사 후 비-blank일 때만 detailCurated 스탬프(merge). 빈 스켈레톤=default. matrix detailCuratedById read. production 실측: 명화·달항아리 detail=default(스켈레톤, 전 curated 오표기 해소).
- (1)✅ 언샤프: simple-crop extractSquare가 업스케일(region<1000) 시 sharpen({sigma:1.0,m1:0.6,m2:2.0}) 적용(1.44x 업스케일 선명도 회복)·배포.

**[BLOCKED / 미착수 (#46 정직)]**
- (1) 실행 ❌: 핸드오프 좌표(crop x147-843,y9407-10103 on 1000x18291)의 공급사 상세 원본이 reachable 데이터에 부재. product.images·crawl_logs.images 모두 domeggook `_stt_330`만(sharp 실측 330x330 썸네일·기타 변형 _stt_960/_org/base 전부 404). 330² 썸네일에 좌표 적용 시 region 1x1 garbage(production dry-run 확인). 잘못된 크롭 적용 금지(#46) → 미실행. 언샤프 capability+endpoint는 준비 완료.
- (2) ⏸SCOPED: generate-detail은 layout-skeletons + 27 section-renderers 시스템. 실콘텐츠 7섹션(디자인토큰 75/15/10+공급사이미지+정보고시/속성 주입+아트갤러리 무드)은 renderer 실콘텐츠 authoring=대형 기능. 본 turn 미착수, 전용 turn 권고. apply 게이트(Track2)+mostly_blank 연계는 준비됨.

**[다음]**
- (a) item1: Desktop이 1000x18291 공급사 상세 원본 URL 제공/직접 크롭 실행/696² crop 본 전달 → thumb-crop endpoint(언샤프 적용)로 1클릭 mainImage=curated.
- (b) item2: detail 7섹션 실콘텐츠 엔진 전용 turn.
- (c) 통과 시 명화 main=curated → 상세 실콘텐츠 적용(curated) → 대표 컨펌 → update PUT(비가역).

---

## 2026-06-08 applyStatus 정확성 교정 + 전상품 상세페이지 적용 게이트 (Code turn)

main 직접 1e5f3a1(트랙1)·74765e7(트랙2). 비가역 0(네이버 0). tsc 0/build OK/이모지 0/한글 코드 0. 권위: Desktop TASK_BRIDGE 2건 + always-state-status 결정문 + DETAIL_PAGE_PLAYBOOK.md.

**[트랙1 — applyStatus 정확성]**
- 근거: 라이브 매트릭스에서 명화 applyStatus 전부 LIVE 오표기(publishState=등록만으로 LIVE·main/detail=공급사원본도 LIVE).
- publishState: 캐시된 네이버 statusType 기반(앱 status 아님). SALE만 LIVE / registered 非SALE(SUSPENSION)=publishDrift+미발행(none) / registered 미동기=DB / unregistered=canRegister?DB:none. naver_status_type VARCHAR 컬럼 추가(apply_migration add_naver_status_type, additive·박제 MIGRATION_naver_status_type) + inspect 라우트가 op.statusType 실측을 로컬 DB 캐시(Naver mutate 0·best-effort).
- main/detail: ImageApplyState 3상태 — curated(앱 automation product-assets 버킷)/default(공급사 원본 passthrough)/none. classifyImage=/product-assets/ 정규식. mainImage(빌더 필드=PUT 송출값) 기준.
- actionQueue: GO 이전 default 대표/상세를 apply_curated_main(→/preview)/build_detail(→/studio) INPUT_DECISION 선행 노출 + SUSPENSION drift=resolve_suspension. 위젯 ApplyStatusIndicator curated 초록·default/drift 앰버·none 점선(레드 0). tsx 7케이스 실증.
- production 실측: 명화 main=default(Cloudinary 4set)·detail=curated(product-assets skeleton)·publish=DB(statusType 미동기)·queue=apply_curated_main. 아이스트레이 main=default·detail=none·fill_attributes. 달항아리 main=default·detail=curated·apply_curated_main. → 전 LIVE 오표기 해소.

**[트랙2 — 전상품 상세페이지 적용 게이트]**
- 기존 빌더 인프라(section-builder+detail-html-serializer+generate-detail API+DetailPageCard 미리보기 image/HTML 토글) 위에 적용 단계 추가(빌더 자체는 계승).
- NEW POST /api/products/[id]/apply-detail: 미리보기한 detail PNG(base64)를 uploadAutomationAsset(kind:'detail')로 product-assets 업로드→detail_image_url set(가역 DB·네이버 0). base64/data-URL 디코드 가드, variant 경로 sanitize.
- DetailPageCard "이 상세로 적용" 2단계 컨펌 게이트(productId·onApplied optional→PLANT 7th-tab 경로 무파손). 적용 시 detail_image_url=product-assets→applyStatus.detail=curated 자동 전이. 스튜디오 page에서 productId=selectedProduct.id 배선.

**[caveat #46]**
- 명화 detail-S6 skeleton이 product-assets라 provenance상 curated로 읽힘 — 빈 스켈레톤 품질은 publish-preview mostly_blank 게이트가 별도 포착, Track2 적용이 실 curated 상세로 교체. 정확 skeleton 판별은 후속. naver_status_type는 inspect 실행 전까지 null→publish=DB.

**[다음]**
- Desktop: (1) inspect 명화 실행→naver_status_type=SUSPENSION 캐시→매트릭스 publish=주의(drift) 재실측 (2) 명화 상세 generate→미리보기→"이 상세로 적용"→detail curated 전이 라이브 실측 + 대표 컨펌. 후속: detail 엔진 7섹션 플레이북 정합 강화·skeleton 정확 판별·스튜디오 헤더 applyStatus 미러.

---

## 2026-06-08 개입 대기열(Operator Action Queue) 전상품 시스템 레이어 (Code turn)

main 직접 415358b. 비가역 0. tsc 0/build OK/렌더 이모지 0(Lucide)/한글 코드 0. 권위: docs/design/OPERATOR_SYSTEM_BLUEPRINT.md §3·§4.

**[한 것]**
- 1) control-tower-engine computeActionQueueItem: nextAction + image 게이트에서 4분류 파생(AUTH=awaiting_human creative/login / AUTO=in_progress·done monitor / GO_PENDING=publish·verify_publish 비가역 GO / INPUT_DECISION=그 외 결정·입력). ActionQueueItem={productId,productName,category,stage,deepLink,detail}. 신규 컬럼 0·가드 불요·product-agnostic. ControlTowerRow.actionQueue + matrix route 노출. tsx 8케이스 실증(4분류·deepLink passthrough).
- 2) 관제탑 OperatorActionQueue 위젯(테이블 위 마운트): 전상품 카드(카테고리 칩+상품명 truncate+행동 1줄+ArrowRight 1클릭 deepLink). 정렬 GO>AUTH>입력결정>자동(우선 표시일 뿐 순서 강제 0). 적용현황 인디케이터(결과축)와 행동축 한 쌍. CATEGORY_STYLE 레드=GO_PENDING 1곳만(75/15/10), AUTH 보라·INPUT 앰버·AUTO 초록.
- 3) PRINCIPLES_LEARNED #56(개입 자연스러움) 등재: 개입점 항상 surface·순서 강제 0·#54/#55 통합·자동반자동 경계·레드 스코프(GO+메인지정만).
- 4) P3 폴리시: FireflyPromptBuilder "프롬프트 복사" PopButton primary(레드)→secondary(뉴트럴). 라이브 잔존 레드 2곳 중 보조 1곳 정리(메인지정 CTA만 레드 유지).

**[다음]**
- push+verify → Desktop Control Chrome 라이브 실측: 개입 대기열 4분류·카테고리 칩 색(GO 레드 1곳)·deepLink 1클릭 정확 화면·레드 스코프(복사 뉴트럴). 후속 로드맵: 2차 딥링크 정합 세부·3차 Firefly/네이버 Chrome MCP 반자동(#52 detect→deliver→resume).

---

## 2026-06-08 아틀리에 워크벤치 UI 재설계 1단계 + 적용현황 인디케이터 (Code turn)

main 직접(SD-04 복귀). 2 커밋(d91ad9b 트랙A 스튜디오 / 6516c4b 트랙B 인디케이터+#54/#55). 비가역 0. tsc 0/build OK/렌더 이모지 0(Lucide)/한글 코드 0. 권위: STUDIO_ATELIER_UX_REDESIGN.md + KKOTIUM_DESIGN_SYSTEM.md + 2026-06-08-always-state-status-and-universal.md.

**[트랙A — 워크벤치 P1·P2·P3·P5·P6]**
- P1 AiQueueStepper: 가로 4열 그리드(카드 54px 짓눌림·제목잘림·.gp-sticker 배지겹침·overflow=true) → 세로 스텝 리스트(Lucide CheckCircle/Loader2/Circle 상태아이콘·제목 wordBreak keep-all 잘림0·1줄 힌트·상태칩 별도 컬럼 겹침0·좌측 4px 액센트 바). 레드 0(complete 그린/active 핑크/pending 뉴트럴).
- P3 레드 제거: FireflyPromptBuilder(헤더 라벨·Sparkles·6 번호원·faceFreeNote·copyError·modelFirefly → 핑크/뉴트럴)·WorkbenchCanvas(헤더 라벨·레드틴트 그림자 → 뉴트럴)·WorkbenchShell(시트 그림자 레드틴트 → 뉴트럴). 레드=ThumbnailCard 변형 "메인 지정" select CTA 1곳만 유지.
- P5 FireflyPromptBuilder: 라벨/값 분리(promptValueLabel)·프롬프트 14px·영문 모노 유지·복사 버튼(기존).
- P6/P2 ThumbnailCard: 1차(4변형 pick-main)를 상단 강조로 이동 + 2차(디자이너 소스 오버라이드=스텝퍼+프롬프트+드롭존)를 details Disclosure 기본접힘으로 + 중첩 #FFF7FB 박스 제거(단일 섹션 + borderTop divider) + 핑크 STEP 2 배지.
- ★ 후속: P4 공유 StudioCardShell Card 스텝 배지(전 카드 영향=2단계)·2단계 전 /studio(ProductListPane·ActionsCard·DetailPageCard·DiagnosisCard) 토큰 정렬.

**[트랙B — 적용현황 인디케이터 + #54/#55]**
- control-tower-engine: ApplyStatus(attributesApplied/mainImageApplied/detailApplied/publishState) tri-state(LIVE=등록 라이브/DB=가역반영/none=미적용). 기존 신호(registered·hasMain·hasDetail·missingRequired·canRegister) 파생 → 신규 컬럼 0·마이그레이션 가드 불요·product-agnostic(#55). matrix row applyStatus 노출.
- 관제탑 ApplyStatusIndicator: 4 칩(속성/대표/상세/발행) LIVE 초록·DB 뉴트럴·미적용 점선·레드 0(75/15/10)·title 툴팁·텍스트 잘림 0.
- PRINCIPLES_LEARNED #54(적용현황 항상 명시)·#55(전상품 범용) Python 등재.
- ★ 후속: 스튜디오 헤더 적용현황 미러(관제탑=시스템 기록 뷰 우선).

**[다음]**
- push + verify-vercel-deploy → Desktop Control Chrome 실측: studio 카드 scrollWidth<=clientWidth(overflow=false)·큐 제목잘림0·배지겹침0 / 레드 사용처=메인지정 CTA 1곳 / 1차 강조·2차 접힘 / 관제탑 applyStatus 인디케이터 라이브(LIVE/DB/미적용).

---

## 2026-06-07 (Merge) 크롭 스튜디오 main 병합 + production 배포 (Code turn)

대표 승인: feature/crop-studio(크롭 스튜디오 완성본 T1~T6) → main **fast-forward** 병합 + origin/main push → production 배포. 비가역 0.

**[한 것]**
- 표준 §1 outpaint 적용 범위 보강(Desktop 지시): outpaint=고해상 소스 비율 전환용. 저해상 prominence는 타이트 크롭 + 통제된 업스케일(<=1.8x) 1순위, outpaint 후순위(저해상 확장 시 제품 축소·이음새 리스크).
- feature/crop-studio → main FF 병합(main 1d00be8 이후 무분기) + push. T1~T6 + 권위문서 + 표준 보강 전부 production 반영.
- push 후 verify-vercel-deploy.sh --wait → production HEAD == main 병합 SHA 확인(main 배포라 production-SHA 검사 정상 작동).

**[다음]**
- Desktop production 3중 검증: /products/[id]/preview 라이브 크롭 스튜디오(bbox 오버레이·완전포함 자동후보·수동 침범 스냅·confirm 차단·라인 인지 게이트) + 관제탑 라인 배지/override + thumb-crop contain dry-run 명화. 통과 시 명화 라인A 대표 크롭 확정 → 발행 GO(비가역, 대표 명시 승인).

---

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
