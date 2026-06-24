# 꽃틔움 가든 — 병행작업 트래커 (누락 0 원칙) · 최종 업데이트 2026-06-24 (rev31 · P1-a PLANT-IA-v2 4탭 재구성 완료[5탭→4탭(검색최적화 FRONT·기본정보·이미지·배송정책)·옵션탭=기본정보로 폴드·카테고리+상품명 검색최적화 탭 이동·상품명 단일화(readOnly 미러 제거, 1개 편집필드)·브랜드/원산지/수입사+대체상품 배송→기본정보(D-ATTR-MOVE)·배송 DSection 펼침(POLICY UNCOLLAPSE)·단일 고정 액션바·#135 create/edit 공유(edit route=redirect→?edit)·Tower 무접촉·tsc0·preview 4탭 멤버십 e2e검증(누수0)] + S2-A.2 Desktop e2e PASS(①②③④) · prev rev30 · S2-A.2 ④ D-BORDER 완료[구조/폼 기본보더=크림파생 웜그레이 중립토큰 --border-neutral(#E4DFD4)/-strong(#D2CBBC)·전역 .border-gray/.border-stone sweep(globals 85-87) + 폼등록 .border-stone-200 !important(161)을 --color-border(핑크)→중립 재지정·브랜드핑크는 accent/card(.kk-card·--card-border·badge·SourcingRecommend카드=--color-border)만 유지·tsc0·배포후 Desktop e2e] · prev rev29 · S2-A.1 Desktop e2e PASS + S2-A.2 브랜드 폴리시[StatusBadge 의미중립 토큰(미적용/비활성 핑크화 방지)·SourcingRecommend 인라인보더→토큰·에셋카드 헤더 #144 하드닝] · 발견 3건(중립뱃지·인라인보더 사각지대·헤더 미세갭) · 원칙 #146 박제 · prev rev28 · S2-A Desktop prod e2e PASS[68cb6e1·이중사이드바 탭/접힘·토큰·#144 active·4페이지 회귀0·#45] + S2-A.1 브랜드 리스킨[Tailwind pink팔레트→브랜드토큰 config 재정의·preflight borderColor.DEFAULT→브랜드·회색보더 전역0·바hex핑크0·#145] · 원칙 #145 박제 · prev rev27 · 스튜디오 Stage2 S2-A 완료[AtelierShell flex-fill·calc매직넘버제거(#141)·이중사이드바 골격(창고/배양실/일지·접힘)·색토큰 중앙클렌징(--brand-red/--pink-soft/--cream·#142)·반응형4종 하드닝(#144)·STUDIO_UI_UX_GUIDELINES 신설] · 글로벌 main bounded(전4페이지 가로overflow0 셀프검증) · tsc0 · 원칙 #142/#143/#144 박제 · prev rev26 · 스튜디오 Stage1 구조완료[독립패널스크롤·에셋타일 컴포넌트·스테퍼 우측게이팅·#3 PASS] + lg:hidden 인라인 display 핫픽스[이중렌더 제거·prod결함·#62] · dev정지 후 build0·tsc0·커밋우선 #139 · 잔존 세로오버플로·#2·#4 → Stage2 편입 · 원칙 #140/#141 박제)
---

## ★★ LIVE WORK BOARD (2026-06-18 S9 · 현 다중병행 단계 권위 · 전거 docs/handoff/HANDOFF_2026-06-18_realism-firefly-composite-upgrade-and-workboard.md §4)

> 우선순위 P0>P1>P2>P3. 상태 DONE/WIP/QUEUED/GATED. 레인 D=Desktop·C=Code·O=Operator. **Code 순서: (C3+C14 ✅)→(C6 ✅)→(C19 ✅)→(C19b ✅ prod-verified)→C15→(C16 CLOSED)→C5(GO·스코핑중)→C9→C4→(C10 완료)→C17/C18/C21/C7/C8/C11/C23(P3/P2). C12(E7)=GO만.**

### Code 레인
| id | 작업 | P | 상태 | 의존성 | 비고 |
|----|------|---|------|--------|------|
| C3 | SEO 골든키워드 가드(targetKeywords 상품명 포함) | P1 | ✅ DONE·LIVE 검증 | - | targetKeywords 상품명 포함 가드→fields.golden_keyword_in_title→seoComplete/fieldsAllSet·gate goldenKeywordsMissing 노출·없으면 fail-open(#55). LIVE(fdcad92): 명화 골든키워드 3종[차량용방향제·디퓨저·에어컨냄새제거] 모두 상품명 포함→missing=[]·'차량용 누락' 전제=stale 해소. 검색량 검증 가드(#103)=별도 C-아이템 백로그 |
| C14 | ingest stage/variant 파서 가드(명시 stage 우선·제품레벨 variant=null·거짓 conflict 억제) | P1 | ✅ DONE(본 커밋) | - | 신규 #108·전상품 #62·additive·C3와 묶음·explicitStage/contentMismatch/variantIgnoredForStage 노출·기존 thumbnail 레코드 variant 정규화=Desktop bash 확인 |
| C6 | REALISM-CAMERA-BLOCK 전 슬롯 + Firefly-ref-composite 표준 엔진 편입 | P1 | ✅ DONE(본 커밋·코어) | - | REALISM_CAMERA_BLOCK 전 슬롯 prompt 주입+realismBlockPresent 가드·REFERENCE_COMPOSITE_BLOCK(변형 씬 reserveProductMargin→referenceComposite 전환·빈공간/PIL=폴백)·slots.composite{firefly_reference·recommendedModel·local_paste} strategy API 노출·테스트 mood10/engine12. concept별 카메라=C17·모델 실제 재라우팅=C18(후속) |
| C19 | 명화 발행 게이트 thumbnailAssessed 플립(대표이미지 평가·#56) | P1 | ✅ DONE(e2e·Desktop 검증) | - | 백엔드+마이그(c19) 적용·e2e POST플립/DELETE원복 PASS·핫픽스 회귀복구 전상품 PASS·네이버 무접촉. UI=C19b. ★구조발견: publishReady=첫발행 전용(#109) |
| D5 | 기등록 상품(naverProductId·판매중지) 재개/업데이트 메커니즘 보고 | P1 | ✅ 보고완료(정정 #44) | - | update route(`/api/naver/products/update`·PUT 전체교체·confirm)가 콘텐츠 수정 **+ 판매재개**까지 커버: 빌더 statusType='SALE' emit(product-builder.ts:937)·prod dryRun 실증(payloadPreview.statusType=SALE). 'statusType read-only'=OUTOFSTOCK 전용. **D6 불필요**. 명화 재개=update confirm:true(운영자 GO·#46·네이버 접촉) |
| C19b | 대표이미지 평가 UI 카드(PrePublishGatePanel 승인 버튼·#56) | P1 | ✅ DONE·prod 라이브 e2e 검증(하드리프레시) | - | PrePublishGatePanel ThumbAssessControl(승인 POST/재평가 DELETE)+useEngineStrategy refetch+studio 배선+i18n 5키. **Desktop prod 라이브 e2e(하드리프레시): 평가됨(재평가)→DELETE→미평가+「대표이미지 평가·승인」(enabled) 플립·양 상태 정상 렌더.** f8bfa6a 정합(254-255)·코드변경0·근본원인 D 2회 반증·premise 불성립. 인터럽트 변이(잔여 POST→DELETE) 복원완 |
| C1 | 향 §4 v6 prose 교체(권위 v6) | P2 | ✅ DONE(84dfe88) | - | 엔진 per-scent mood 기반영 |
| C2 | archive 유틸 → 자산정합 카드 해소 | P2 | ✅ DONE(5fe06fa) | - | 확정3건 정리·커버리지 3/3·§6 타깃 |
| C5 | E8 v2 빌드(벤치마크→자산→graft) | P2 | WIP(C5-1 DONE·데이터모델) | C6 | 컨벤션 스펙트럼+정체성 오버라이드(#105)+productAestheticDna 팔레트에코(#106)+실사(#107)+프롬프트 라이브러리+검토카드+Design Readiness. **C5-1 DONE**: benchmark_dna 테이블(14컬럼·status draft/approved/retired·#102 sourcePriority·commerceConvention·trendKeywords·#103) + Product.aestheticDna(#106) additive 마이그(c5_1·0행·prisma generate·tsc0/build0). 다음=C5-2 수집어댑터 |
| C9 | INFO-DEP-DESIGN-GATE(Design Readiness 레인+사전생성 풀) | P2 | QUEUED | C5 부분 | 후보 등재: 아이스(cutout 부재)=info-bound 누끼-선행 readiness 카드(#104·#56). D3 준비도 분기와 연결 |
| C4 | E6 자산화 폐루프(persistStrategy+SlotGeneration↔asset) | P2 | QUEUED | - | 독립 |
| C10 | 원칙 박제 #105/#106/#107 | P2 | ✅ DONE | - | #105(84dfe88)·#106/#107(본 커밋) |
| C15 | 테스트 자산 정리(stray hero@detail) + Desktop 역량 확정 | P2 | ✅ DONE(가역 아카이브) | - | **Desktop 역량 확정: MCP는 물리 Storage 변이(업로드/삭제/이동/복사) 불가(#59 일반화)→물리 변이=Code service-role SDK 전담.** stray(cmqmbemz…·명화 detail/hero-1781957364462.png·640²·firefly_auto·slot=hero@stage=detail 불일치) #79 전수스캔 0참조(12테이블 ::text+레포 grep) 확인 후 **C23 정신대로 가역 아카이브**(move→archive/ + registry stage detail→archive·하드삭제 아님). 검증 stage=archive·detail stray=0. 비네이버 로컬(#46 불요). 원칙 #120 |
| C16 | archive 유틸 stage 확장(composite 전용→전 stage 범용) | P2 | ✅ CLOSED(premise 무효·코드0) | - | 실측: archive 유틸 **이미 stage-범용**(archiveAssets·reconcileRegistryDrift·assets/action archive·fixProductIntegrity 전부 stage-범용·composite 한정은 ratio가드/variant-coverage 도메인뿐). premise(composite 전용) 불성립→코드변경0(#46). 후보 enhancement은 C23으로 분리. **C16↔C26 교차참조**: C16이 확인한 reconcileRegistryDrift 기구축 = C26 정합엔진 → C26은 빌드 아닌 실행+능동화로 재정의(중복 0) |
| C17 | concept별 카메라 매핑(premium 정물 100mm f/4·라이프스타일 35mm·매크로 100mm) | P3 | QUEUED | C6 | C6 후속·MoodCode→camera concept 오버라이드 |
| C18 | composite 모델 실제 재라우팅(NB Pro 우선)+테스트 갱신 | P3 | QUEUED | C6 | C6 후속·scent_note=firefly 테스트 의도적 갱신 동반 |
| C20 | C6 폴리시: 프롬프트 'tones tones' 중복어 제거 | P3 | ✅ DONE(본 커밋) | C6 | paletteToneClause 가드(palette가 tones로 끝나면 미중복)·테스트 +1 |
| C21 | SEO 검색량 검증 골든키워드 가드(#103·C3 심화) | P3 | QUEUED | - | searchad/datalab 볼륨 기반 고볼륨 헤드텀 발굴·C3 커버리지 가드 심화 |
| C22 | 통합 레인(단순/디테일 ⊇ A/B) 상태 + sourcing_incomplete 카드 앱 노출(#116/#117) | P2 | QUEUED | - | 워크플로 docs 형식화 완료(§1-A)·앱 surfacing 후속 |
| C23 | supersede→archive 개입카드(슈퍼시드 자산 자동아카이브 surfacing) | P2 | QUEUED | - | C16에서 분리. product-level(thumbnail/hero/detail) 신버전 확정 시 구버전 자동 아카이브 후보를 개입카드로 표면화(#56·운영자 결정·가역). registry_drift/variant_composite 카드 패턴 동형 |
| C24 | 디테일 5섹션 상세 엔진(전상품 공통·발행후) | P2 | QUEUED | - | 명화 O2 실증: 단순 상세=detail-source READY(공급사 상세·인증·변형·사용법·푸터) / 디테일 상세=detail-S6 부분골격(5섹션 합성 필요). 적응형 이미지엔진 구조화 실증·product-agnostic. 발행후 트랙(#116 디테일 레인·#125 검증후 공급)·ROADMAP Sprint8 P2-D |
| C25 | studio 발행경로 기존 DB자산 인식(크롤 임포트 mainImage/detail 재생성 강제 해소) | P2 | QUEUED | **C26** | 판정: studio 「이미지 저장」 canSave=인앱 생성 state(thumbnails/detail)만 인식·product.mainImage/detail_image_url(DB) 미인식(useStudioActions.ts:476). (B)설계이나 발행 워크플로 (A)갭. **하드 차단 아님**(update API가 DB자산으로 발행·update/route.ts:107-119·158). 전상품 공통(#62). **C26 의존**(기존자산 채택은 레지스트리-스토리지 정합 위에서). 후속: studio Save에 '기존 DB자산 채택' 분기 or 발행탭 DB자산 인식 |
| C26 | 레지스트리-스토리지 정합(정합엔진=기구축) — (a)reconcile 실행 (b)write-path 등록 감사 | P2 | (b)✅DONE · (a)🔒GATED | - | **정정(#129)**: 정합 엔진 신규구축 아님 — reconcileRegistryDrift(asset-integrity)+registry_drift 개입카드(#56) 기구축(C16 CLOSED에 기확인). 재범위: **(a)** **기존 reconcileRegistryDrift 호출 경로**로 드리프트 20/71 해소(신규 스크립트 아님·운영자 GO·#46) · **(b)✅** #62 능동화=생성 write-path registry-insert(registerUploadedAsset 멱등·best-effort·additive — apply-composite/apply-cutout×2/finish-image/thumb-crop/save-assets×2, ingest-firefly·assets/upload 기등록). 드리프트 재발 차단 근본책. **관찰 백로그(비차단)**: positive 등록검증은 non-delete 경로 필요(등록후삭제 사이클은 등록/미등록 구분 불가·reconcile 흡수). ROADMAP P2-F·#129·C16↔C26 |
| C7 | firefly_auto settingsVerified 서브체크 | P3 | QUEUED | - | - |
| C8 | 옵션 3표현 정합 | P3 | QUEUED | - | - |
| C11 | 가드 개선: variantUnmatched→자동등록 스킵/review 스테이지 | P3 | QUEUED | - | 선택 |
| C13 | 중복 route 2.ts 삭제 | P3 | 🔒GATED | 운영자 GO | - |
| C12 | E7 엔진 통합(System1 폐기) | - | 🔒GATED | 명시 GO | GO 전 미착수 |
| C-STUDIO-UX | 온실 아틀리에 3분할(20:55:25)+스테퍼+검색생장관제탑 | P1 | ✅ DONE(본 세션·tsc0/build0)·Desktop LIVE 검증 대기 | - | shell 재구조(AtelierShell h-screen 독립스크롤)+StudioStepper(썸네일랩→상세캔버스→SEO부스터→발행검토)+ControlTower(개화도 게이지=발행게이트 시각화·새 점수엔진 아님·#132)+Kkotti가이드. 좌=AssetBrowser 도구함+상품피커, 중앙=device토글+캔버스+상세조립(상세 단일홈·#131), 우=관제탑 3아코디언(썸네일가시성/SEO매칭율/ROI후킹). 전 카드·훅 보존·relocate only. 신규 src/components/studio/atelier/* (AtelierShell·StudioStepper·ControlTower·KkottiGuide). 다음=Desktop 실렌더 검증(#45/#88) |
| C-PLANT-UX | 씨앗심기 임시저장+버튼분류+상세 이미지탭 제거 | P2 | ✅ DONE(본 세션·tsc0/build0)·Desktop LIVE 검증 대기 | - | (1)임시저장 버튼(DRAFT upsert·부분데이터OK·페이지잔류·2026-02 승인안 회귀복구) (2)하단 통합 액션바 [임시저장][DB 저장][저장 후 온실 아틀리에][네이버 엑셀 다운로드][네이버 직접 등록]·'비주얼 자동화'→'저장 후 온실 아틀리에'(저장 후 /studio 라우팅) (3)이미지탭 상세페이지/상세설명/상세자동화 제거(상세=Studio 단일홈·#131)·대표/추가+복사가능 SEO훅 유지. saveDraft idempotent(savedProductId시 PUT·아니면 POST)·네이버 무접촉. 다음=Desktop 실렌더 검증 |
| C-CRAWL-STATE | 꿀통 상태 스테이트머신+수정/삭제/재분류+체크박스 언락 | P1 | ✅ DONE(본 세션·tsc0/build0)·Desktop LIVE 검증 대기 | - | 등록완료 체크박스 disabled 제거·액션행 전상태 노출·수정(product_id시 →/products/[id]/edit)·재분류 셀렉트(소싱완료/등록대기/등록완료/보류 역방향 허용)·삭제 확인모달(#73 타깃프리뷰·크롤기록만·네이버 무접촉)·보류(HOLD) 상태 추가(sourcing_status free string·마이그 불요·PATCH 재사용). 다음=Desktop 실렌더 검증 |

> **C-redesign LIVE-검증 메모(2026-06-23 Desktop, production)**: Plant Panel Split 기구축(6탭+우패널)·임시저장만 부재. Crawl 등록완료 체크박스 disabled+수정/삭제 어포던스 부재·일방향 필터. Studio=수직스택, split+stepper+control-tower 필요. → 본 세션 Code 3건 빌드 완료(C-STUDIO-UX/C-PLANT-UX/C-CRAWL-STATE·tsc0/build0)·Desktop 실렌더 검증 대기(#45/#88·#131/#132).

### UX-v2 레인 — studio 정돈(시선흐름 통제 + 작업 분절) · 2026-06-23
> 공유 컴포넌트 우선: `src/components/common/*`(Collapsible·OverflowMenu). 제약=#132 셸·표면화만·검증/발행 로직 무변경·Naver PUT 0·SD-01 무접촉·product-agnostic. 검증=localhost dev, Desktop 라이브 e2e.

| id | 작업 | 우선순위 | 의존성 | 스케줄 | 상태 |
|----|------|---------|--------|--------|------|
| UX-v2.1 | 도구함 컨텍스트 동기화(AssetBrowser←activeStep STEP_STAGES + 전체보기 토글) | P0 | C-STUDIO-UX | 본 세션 빌드완 | ✅ DONE·Desktop PASS(2026-06-23) |
| UX-v2.2 | 도구함 압축(스테이지 그리드 높이상한 min(52vh,460px) 독립스크롤·헤더 1줄·업로드 Collapsible 접힘) | P1 | UX-v2.1 | 본 세션 빌드완 | ✅ DONE·Desktop PASS(2026-06-23) |
| UX-v2.3 | 워크스페이스 점진적 공개(주카드 펼침 / 진단·무드·9슬롯 접힘) | P1 | common/Collapsible | 본 세션 빌드완 | ✅ DONE·Desktop PASS(2026-06-23) |
| UX-v2.4 | 시각위계(중앙 강조·레일 조용히·보조CTA overflow: AssetBrowser export/refresh) | P1 | common/OverflowMenu | 본 세션 빌드완 | ✅ DONE·Desktop PASS(2026-06-23) |
| UX-v2.5 | 공통화(/crawl 행 수정·원본·삭제 → overflow / /products/new 네이버 발행 → overflow) | P1 | UX-v2.3·v2.4 | 본 세션 빌드완 | ✅ DONE·Desktop PASS(하단바+행) — /products/new 하단바 overflow + /crawl 행 overflow 모두 라이브 PASS(꽃수레 0=콜드스타트 artifact·데이터정상·행 컴포넌트=하단바 동일) |

> **UX-v2 메모**: 도구함이 스텝과 동기화돼 단계별 자산만 기본 노출(전체보기로 전량 접근 유지)·헤더 1줄+업로드 접힘으로 좌레일 컴팩트·보조카드(진단/무드/퍼널) 접힘 기본으로 중앙 주작업 강조·보조CTA는 kebab(•••)로 강등. 공유 Collapsible/OverflowMenu를 /studio·/crawl·/products/new 3면에 적용(중복 제거). 검증/발행/dryRun 무변경(#132). 원칙 #133(하드리프레시 연타금지)·#134(점진적 공개·컨텍스트 동기화).

### (A)(B) 후속 레인 — 그리드 수정 + edit 패리티 + a11y · 2026-06-23
> Desktop e2e 발견(도구함 238버튼/11506px 폭발) 대응 + 전상품 공통(B) 검증서 발견 반영. 제약=#132 셸·표면화만·검증/발행 로직 무변경·Naver PUT 0·SD-01 무접촉.

| id | 작업 | 우선순위 | 의존성 | 스케줄 | 상태 |
|----|------|---------|--------|--------|------|
| A-GRID | Studio 도구함 가로 폭발(11506px) 수정 | P0 | C-STUDIO-UX | 본 세션 빌드완 | ✅ DONE·Desktop PASS(2026-06-23) — 근본원인: `fr` 트랙 min-width:auto=min-content → `minmax(0,Nfr)` + 패널 minWidth:0 + overflowX:hidden로 하드캡 |
| B5-EDIT | /products/[id]/edit 재설계 패리티(premium 폼 공유) | P1 | C-PLANT-UX | 본 세션 빌드완 | ✅ DONE·Desktop PASS(2026-06-23) — edit→`/products/new?edit=` 서버 리다이렉트로 단일 편집기화. 구형 이모지탭 ProductForm retire(edit 16.8kB→141B). Lucide 6탭(기본/옵션/이미지/배송·A/S/SEO·원산지/혜택)·임시저장·상세제거(#131)·저장 후 온실 아틀리에 자동 상속. 저장 멱등(savedProductId시 PUT — handleNaverDirect/handleGenerate 중복생성 차단). GAP(비차단): 옵션 prefill-on-edit 미구현(/api/products GET include에 옵션 없음) — 데이터 안전(부분 PUT가 옵션필드 생략→product_options 보존, 구형 폼도 옵션탭 부재였음). 후속=GET include 확장 or 옵션 별도 fetch→optionRows 역매핑 |
| B6-A11Y | 아이콘전용 버튼 title+aria-label | P1 | - | 본 세션 빌드완 | ✅ DONE·Desktop PASS(행단위 포함) — 꽃수레 새로고침·X 닫기 + 행단위(crawl 행 overflow·AssetBrowser 4타일) 라이브 PASS(꽃수레 0=콜드스타트 artifact·데이터정상) — crawl(오류/결과 X 닫기·꽃수레 새로고침·목록제외 X)·AssetBrowser(대표/추가/보관/삭제 4타일). 텍스트 보유 버튼=가시텍스트가 접근명(추가 불요). overflow/Collapsible/스테퍼=기 aria 보유 |

> (B) 결과 메모: edit 경로가 premium 폼으로 통합되며 전상품 공통 편집 패리티 확보(#135). 저장 멱등화로 edit 재저장·재등록 시 중복 product 행 차단. 옵션 prefill GAP만 잔존(데이터 손실 없음·트래킹). 원칙 #133(reload 연타금지)·#134(점진적 공개·컨텍스트 동기화)·#135(재설계=new+edit 동시·공유 컴포넌트).


### Studio Stage2 레인 — S2-A~D · 2026-06-24
> Stage1 잔존(세로 오버플로·이중사이드바 부재)을 S2-A로 흡수. 제약=#132 셸·재배치만·로직불변·Naver PUT 0·SD-01 무접촉·product-agnostic(#55). 검증=localhost dev 셀프(가로 overflow 0·전4페이지)·Desktop 라이브 e2e(#45/#88).

| id | 작업 | 우선순위 | 의존성 | 상태 |
|----|------|---------|--------|------|
| S2-A | flex-fill 셸 + 이중사이드바 골격 + 색토큰 + 반응형4종 하드닝 | P1 | Stage1 | ✅ DONE·**Desktop prod e2e PASS(68cb6e1·#45)** — 이중사이드바 탭/접힘·토큰 resolve·#144 active(min-w-0 2032·ellipsis 67·keep-all 2503)·4페이지 가로overflow0. 잔여 honest gap: 좁은폭(1024/375) 육안 repro는 Desktop 컨트롤러 한계로 미수행(수정은 배포·active 입증) — layout.tsx bounded(height:100vh/overflow:hidden·main flex-1 min-h-0)·AtelierShell height:100%(매직넘버 제거#141)+이중사이드바(w-16 레일 창고/배양실/일지+w-96 동적패널·활성아이콘 재클릭=접힘)·창고=도구함 재배치(로직불변)·배양실/일지=i18n 골격 placeholder(S2-B 채움)·globals --brand-red/--pink-soft/--cream + studio 사용·인라인 grid 전부 minmax(0,1fr)(crawl/dashboard/products·new#144(b))·신호등 의미색 유지. dev 셀프: /studio 이중사이드바+접힘 동작·/dashboard·/products·new·/crawl 가로 overflow 0·console error 0 |
| S2-A.1 | 브랜드 리스킨 패스(회색보더 전역 retrofit + 레거시 핑크→토큰) | P1 | S2-A | ✅ DONE·**Desktop e2e PASS** — (1)Tailwind `pink` 팔레트를 config에서 브랜드 토큰으로 재정의(pink-* 유틸 전부 브랜드·hover/ring/group 네이티브) (2)preflight `borderColor.DEFAULT`→`var(--color-border)` + globals `.border-gray-*/.border-stone-*` 오버라이드(#62 근본·bare border 회색 0) (3)바 hex 핑크(#FFB3CE/#FFF0F5/#FFCCEA)→var 토큰(DetailPageCard·StudioCardShell·ThumbnailCard·ProductListPane) (4)신호등 의미색 리터럴 유지. 실측: /studio·/products·new 회색보더 0건·바hex핑크 0·pink-* computed=브랜드. 원칙 #145 |
| S2-A.2 | 브랜드 폴리시(의미중립 뱃지 + 인라인보더 사각지대 + 헤더 미세갭) | P1 | S2-A.1 | ✅ DONE·**Desktop e2e PASS(①②③④)** — 잔여 1건: ③ 작업할상품 라벨 #144 후속(차기 sweep). Desktop S2-A.1 e2e서 발견 3건 대응: ①공용 `StatusBadge`(tone neutral/brand/success/warning/danger)+`--status-neutral-bg/-fg` 토큰 → '미적용/비활성' 뱃지를 회색→핑크 sweep에서 제외(의미 복원·AssetBrowser+GeneratedAssetLocations 적용·신호등 리터럴 유지) ②SourcingRecommendWidget 인라인 `#e5e7eb`→`var(--color-border)`(전역 class override 인라인 미적용=사각지대·컴포넌트 단위) ③에셋카드 제목+뱃지 행 `min-w-0`+제목 truncate+뱃지 shrink-0(좁은폭 박스탈출 박멸). 실측: 미적용 뱃지 bg=#ECE8E0(중립)·헤더 12행 overflow 0·SourcingRecommend 보더 brand. 원칙 #146 |
| S2-A.2-bl | dashboard 위젯 인라인 보더 #e5e7eb 잔존 sweep(ProductLifecycle/LowStockAlert) | P2 | - | QUEUED(#146 백로그) — 동일 인라인 사각지대·차기 컴포넌트 단위 #e5e7eb→토큰(bar-track 배경 등 의미 중립 bg는 제외) |
| ④ 폼 기본보더 톤 | 구조/폼 기본보더 = 중립 웜그레이(크림파생) vs 소프트핑크 | P1 | 대표 결정 | ✅ DONE(tsc0·dev 셀프검증)·검증요청 — D-BORDER(LOCKED·operator 중립): 구조/기본보더를 크림파생 웜그레이 중립토큰(`--border-neutral` #E4DFD4 / `--border-neutral-strong` #D2CBBC)으로 전환. 전역 `.border-gray-*`/`.border-stone-*` sweep(globals 85-87) + 폼등록 `.border-stone-200 !important`(161)를 `--color-border`(핑크)→중립 재지정. 브랜드핑크는 accent/card 전용 유지(`.kk-card`·`--card-border`·badge·SourcingRecommend 카드=`--color-border`). 실측: tsc0. **Desktop e2e PASS(①②③④ 묶음)**. 원칙 #146 |
| P1-a PLANT-IA-v2 | /products/new 5탭→4탭 IA 재구성(create/edit 공유) | P1 | S2-A.2·794930f | ✅ DONE(tsc0·preview e2e)·검증요청 — 권위 docs/design/PLANT_CRAWL_TOWER_REDESIGN_2026-06-24.md §1. 5탭(기본/옵션/이미지/검색최적화/배송)→**4탭 [검색최적화 FRONT·기본정보·이미지·배송정책]**. 변경: ①탭바 4개+기본탭=검색최적화(default) ②카테고리 RSection + 상품명(편집)을 검색최적화 탭으로 이동 ③상품명 단일화=readOnly 미러 삭제(편집필드 1개) ④옵션 RSection을 기본정보 탭에 폴드 ⑤브랜드/원산지/수입사 DSection + 대체상품 패널을 배송→기본정보 이동(D-ATTR-MOVE) ⑥배송 DSection 기본 펼침(useState(true)·POLICY UNCOLLAPSE) ⑦단일 고정 액션바(임시저장·DB저장·저장후 온실아틀리에·케밥) 유지 ⑧tabDone 재정의(옵션완성도→기본, 카테고리+상품명+키워드→검색최적화). #135: edit route는 `?edit` redirect=동일 컴포넌트 공유(구조 자동 전파). Tower(마진/SEO워크플로 우패널) 무접촉. preview 검증: 4탭 순서·기본탭·탭별 멤버십(검색=카테고리+상품명+SEO / 기본=기본정보+옵션+브랜드원산지+대체 / 배송=6 DSection 펼침)·누수0·콘솔 blocking 0(SVG ellipse hydration warn은 기존 무해). 후속(P1-a refine): 블록통일(RSection/DSection 단일 카드패턴)·탭내 순서(브랜드를 옵션 앞)·#137 케밥 정리 |
| S2-B | 중앙 클렌징(#142): 무거운 폼(Firefly/무드/진단/상세/배경/9슬롯)→좌 배양실 step-sync · 중앙=미리보기+조립슬롯+꼬띠버블 · 폼필드까지 #144 | P1 | S2-A.1 | QUEUED |
| S2-C | 폰트 체계(S2-A 미적용분) | P2 | S2-A | QUEUED |
| S2-D | 마이크로 인터랙션 + a11y 마감 | P2 | S2-A | QUEUED |

> **S2-A 메모**: 글로벌 `<main>`을 단일 스크롤 컨테이너로 바운드 → 아틀리에는 flex-fill(height:100%)로 매직넘버 없이 뷰포트 채움, 일반 페이지는 main 내부 세로 스크롤 유지. 회귀 셀프검증: dashboard/products·new/crawl 모두 `scrollWidth===clientWidth`(가로 overflow 0)·콘텐츠 전폭(wrapper 228→1435@1440). 푸터(SD-01) 무접촉. 원칙 #142(중앙클렌징)·#143(시안=참조·브랜드/로직 우리기준)·#144(반응형 하드닝 4종). 전거 docs/design/STUDIO_UI_UX_GUIDELINES.md.

### Desktop 레인
| id | 작업 | P | 상태 | 의존성 |
|----|------|---|------|--------|
| D1 | 명화 thumbnail Firefly ref-composite→ingest(thumbnail 1:1) | P0 | ✅ DONE | O1 |
| D4 | 명화 발행 사전검증(payload·인증·타이틀) | P1 | 🔒GATED | 대표이미지평가(thumbnailAssessed)+상태정합(ACTIVE↔판매중지) ※차량용=stale 해소(이미 상품명 포함·C3 LIVE) |
| D3 | composite/realism 파이프라인 달항아리·아이스 확장 | P2 | 🔒PARKED(명화 양라인검증 후 재개·#125) | D1 검증 | 달항=composite-ready(cutout✓plate✓·#58 육안 확증 대기) / 아이스=누끼-선행(cutout 부재). 아이스 cutout 부재=C9 Design Readiness 카드 후보 |
| D7 | AssetBrowser 라이브 전수검증(프로덕션·명화·read-only+classify+upload+delete 4모드+그라운드트루스·Naver무접촉) | P1 | ✅ DONE | - |

### Desktop 우선순위표 (2026-06-23 세션9 · 양라인 결정)
> 동시 3트랙(독립 진행): (1) Desktop=명화 양라인검증(O1→O2→단순) (2) Code=C5 E8 v2(GO 대기·스코핑) (3) Operator=O1/O2 생성·평가.

| 순위 | 작업 | 상태 | 비고 |
|---|---|---|---|
| P0 | 명화 양라인검증 O1→O2→단순(순차) | WIP | 플래그십 실테스트 — 통과 후에만 D3 확장(#125) |
| P1 | D4 명화 발행 사전검증 | 🔒GATED | 대표이미지평가+상태정합. O3=정보고시 자동조립 확인됨(productInfo* 입력 불요·HB는 qualityAssuranceStandard) |
| P2 | D3 composite/realism 확장(달항·아이스) | 🔒PARKED | 명화 양라인검증 후 재개(#125) |

### Operator 레인
| id | 작업 | P | 상태 |
|----|------|---|------|
| O1 | 명화 thumbnail Firefly ref-composite 실행(cutout_C+§1a 프롬프트+Nano Banana Pro) | P0 | pending |
| O3 | 명화 발행 GO(비가역) | P1 | 🔒GATED(대표이미지평가+상태정합 후·C3 LIVE·D1 DONE) |
| O4 | 코튼 재입고/제외 결정 | P3 | pending |

### 의존성 맵
- D1(✅)←O1 · D4/O3←대표이미지평가+상태정합(C3 ✅LIVE·차량용 stale 해소) · C5←C6 · D3←D1 · C14(✅)=독립 guard family · 자산정합 카드 해소←C2(완료) · C12(E7)←명시 GO.

### 게이트 의미 (중요·#109)
- **publishReady = 첫발행 게이트**(status DRAFT + naverProductId null). 기등록 상품(명화 등)은 구조적으로 publishReady=false가 **정상** → 재개/업데이트 별도 경로(update route=full-replace PUT — 콘텐츠 최신화 + statusType='SALE'로 판매중지 해제까지 커버·confirm:true·비가역 #46·D6 불필요). **thumbnailAssessed는 publishReady 입력 아님**(thumbnailPass만·기본 true). e2e가 sub-flag 독해보다 구조를 드러냄(#45).

### 합성/사실성 표준 (신규·전상품 #62·권위 §1~2)
- **합성 표준 전환(#107)**: 빈 배경판+PIL 로컬 페이스트 **폐기** → 누끼컷 첨부→Firefly 레퍼런스 합성(제품 재생성 금지·타깃별 최적 모델 Nano Banana Pro/Firefly Image 5). 로컬 PIL=폴백.
- **REALISM-CAMERA-BLOCK(C6)**: 전 슬롯(hero/lifestyle/scene/composite)에 카메라바디+렌즈+조리개+자연광+필름그레인+true색+고마이크로콘트라스트+'photorealistic editorial'+'no CGI/3D/AI artifacts' 부착 + 상품 컨셉별 카메라.
- **어우러짐(#106)**: 배경=productAestheticDna(상품 팔레트/무드) 에코. 컨벤션=포맷·정체성=팔레트/무드.

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
| INFO-DEP-DESIGN-GATE | P2 | Code | ✅ | 신규 — info-dependency 디자인 게이트(#104): engine slot/strategy infoDependency 메타 + 온실아틀리에 Design Readiness 레인(info-free 항상생성→사전생성 자산풀 / info-bound 소싱 충진 시 자동활성·#56) + 양방향 바인딩(무드배경↔변형/썸네일·ingest variant 일반화) | 미착수(백로그) |
| INGEST-GUARD-REVIEW (선택) | P3 | Code | ✅ | (저우선) variantUnmatched 시 unbound 자동등록 스킵 or review 스테이지 적재 — 현재는 variant=null로 적재(가드 기본). 운영자 검토 흐름 강화 | 미착수(선택·저우선) |
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
| E5 | P1 | Code | ✅ | per-scent concept input(변형별 backdrop) + 결함 A·B + ingest variant 가드 | 완료·검증완(prod scent_note variants 3향·backdrop concept+margin·UI=Desktop#88) |
| E6 | P2 | Code | ✅ | assetization 폐루프(persistStrategy 라이브화·PromptVersion·SlotGeneration↔asset_registry 링크) | 미착수(다음) |
| E7 | P1 | Code | ✅ | 엔진 통합(ConceptTone/role→signals·단일 프롬프트 권위·System1 retire) ★비가역=구조PR 전 Desktop/대표 확인 | 미착수(확인 게이트) |
| E8 v2 | P2 | Code | ✅ | 벤치마크 비전 리서치(한국 우선) — 소스 티어 T1 NaverSearch(search_shop/image)→T2 datalab→T3 Pinterest/Google(무드만). NaverSearch MCP=Tier1 수집 어댑터 래핑. benchmarkDna 확장(sourcePriority+commerceConvention[명품/다크오브제/선물/가격밴드]+trendKeywords). 반영 3군데(썸네일 컨벤션/상세·향배경 무드/상품명·태그 SEO). 개입=큐 '벤치마크 리서치 검토' 카드 | 미착수(E5/E6 후) |
| E9 | P2 | Code | ✅ | 프롬프트 성능학습(CTR/CVR per PromptVersion→auto-promote) | 미착수 |

> E8 v2 상세(2026-06-18 설계확정·한국우선): 소스 티어 T1 NaverSearch(search_shop/image)→T2 datalab→T3 Pinterest/Google(무드만). NaverSearch MCP=Tier1 어댑터. 파이프라인: (a)컨벤션 '스펙트럼' 추출(다수셀러 집계·단일셀러 아님) (b)benchmarkDna 자산화(sourcePriority+commerceConvention+trendKeywords) (c)프롬프트 자산 라이브러리(태그·재사용) (d)'상품 정체성 적합/오버라이드' 단계(#105 충돌 시 정체성 우선) (e)'벤치마크 리서치 검토' 카드(#56) (f)Design Readiness 레인(#104). 반영 3군데: 썸네일 컨벤션/상세·향배경 무드/상품명·태그 SEO. E7과 별개·6축 단일권위 정합.
> 향 서사 v6 해소(2026-06-18 Desktop 실측): v6=레몬 완숙·웜(M4) / 에이프릴 airy 하이키(M5) / 블랙체리 moody 로우키(M6) 확정. E5 variant-concept에 per-scent mood 반영(엔진이 v6-정확 backdrop 생성). v6 향 3컷 operator 생성·ingest 완료=variant_composite 3/3(card auto-dismiss). 플레이북 §4(v5 narrative)는 legacy 참조(엔진 per-scent mood가 forward 권위). "for a small bottle" 전면 제거 확인. april escape(후레쉰 U+C270 vs 후레쉬 U+C26C) ingest 가드로 차단.


### IA-5TAB 레인 — 씨앗심기 7→5탭 재배치 · 2026-06-23
> 대표님 IA안 GO 후 빌드. 제약=#132 필드재배치만(state/핸들러/검증·발행 로직 무변경)·#135 new+edit 공유(단일 파일·?edit= 리다이렉트)·이모지0·Lucide·SD-01 무접촉·Naver PUT 0. 검증=tsc(build는 dev 정지 후·#136).

| id | 작업 | 우선 | 상태 | 비고 |
|----|------|------|------|------|
| C-IA-5TAB | 씨앗심기 7탭→5탭(기본/옵션/이미지/검색최적화/배송·정책) | P1 | ✅ 코드완(본 세션·tsc0·build=dev점유 보류)·Desktop LIVE 검증 대기 | (1)검색최적화 탭 신설=골든키워드·셀러 태그(기본에서 이동)+SEO 훅문구(이미지에서 이동) 집결+상품명 읽기전용 표면화(새 pageTitle/meta state 0·#132)·SEO 점수=우측 패널 유지 (2)배송·A/S→배송·정책: 원산지·수입사(구 SEO·원산지)+혜택(리뷰·구매평·고시) 흡수 (3)비주얼 자동화 탭 제거(온실 아틀리에 대체·autorun jump 은퇴) (4)하단 액션바 sticky(저장 3종 항상노출·네이버 2종 overflow 유지). tabDone/validTabs/activeTab union 동기화·originCode 완료게이트 seo→shipping 이동. 단일 파일 products/new/page.tsx(-1958B)·edit 자동 상속(#135). 다음=dev 정지 후 build0→Desktop 실렌더 e2e(#45/#88) |

### 스튜디오 리팩토링 레인 — 온실 아틀리에 전면 리팩토링 · 2026-06-23 (설계확정·GO수신)
> 리서치 정본(한글): `docs/research/STUDIO_REFACTOR_RESEARCH_KO_2026-06-23.md` (영문 정본 동일내용 현지화 · 2024-2026 Figma/Canva/Framer/Linear 패턴 + 모바일 반응형 + 네이버 2026 SEO). 핵심 결론: **3컬럼 상시 -> 2컬럼 코어 + 맥락형 우측 인스펙터** / **에셋당 4상시아이콘 제거 -> 호버 1버튼(대표지정(별))+overflow 케밥(점3개)** / **모바일 = 1컬럼 + 하단 4탭(조회·승인 전용·편집은 데스크톱 한정)**. 제약=#132 셸·표면화 우선·검증/발행 로직 무변경 · #138 Stage 분할(구조->라이브검증->대표 리뷰->디테일) · #139 커밋우선.
> **커밋우선 경로(#139·선행 게이트)**: 대형 리팩토링 착수 전, 검증완료 미커밋 자산(C-IA-5TAB build0 후 + 기존 C-redesign/UX-v2/A·B·common·atelier 더미)을 먼저 commit/push해 위험반경 축소 -> 즉 **Stage 1 착수 전 = 현 검증완 자산 커밋·배포가 선행**.

| id | 작업 | 우선 | 상태 | 통과 기준 |
|----|------|------|------|----------|
| STUDIO-RF-S1 | Stage 1 **구조** — 패널별 고정 뷰포트 자체 스크롤(col0 2220px 결함 해소)·에셋 레일 깔끔 썸네일+호버툴바·overflow 케밥(점3개)·다중선택(상시 100-160 아이콘 제거)·스테퍼가 캔버스+우측패널+에셋필터까지 진짜 게이팅 | P1 | QUEUED(설계확정·GO·커밋우선 선행) | 어느 단계든 '다음 행동'을 스크롤 없이 5초 내 발견 |
| STUDIO-RF-S2 | Stage 2 **레이아웃** — 2컬럼 코어+접이식 맥락형 우측 인스펙터(SEO관제탑->3단계 정점·퍼널보드->2단계·시장DNA->2·3단계·AI진단->1단계 인라인+4단계 프리플라이트)·단계별 빈화면 단일 CTA | P1 | QUEUED(S1 라이브검증·대표 리뷰 후·#138) | 한 단계가 핵심요소 5-9개 초과 노출 안 함 |
| STUDIO-RF-S3 | Stage 3 **모바일+폴리시** — grid-template-areas 반응형 1컬럼+하단 4탭(조회·승인 전용·드로어 패널·하단 고정 CTA)·중립+1-2강조 시각시스템·8pt 그리드·타입스케일·Cmd+K 팔레트 | P2 | QUEUED(S2 후) | 모바일=편집 컨트롤 0 노출로 검토·승인 완결 / 데스크톱=Linear·Canva급 여백·가독 |

### 변경로그
- 2026-06-23 (세션9·Code/스튜디오 전면 리팩토링 설계확정·GO수신 + 거버넌스 박제): 리서치 정본(한글) `docs/research/STUDIO_REFACTOR_RESEARCH_KO_2026-06-23.md` 등재 — 3컬럼->2컬럼+맥락형 우측 인스펙터·에셋 4상시아이콘->호버1+overflow 케밥(점3개)·모바일 1컬럼 하단4탭(조회·승인). **Stage 분할 등재**: S1 구조(패널 자체스크롤·에셋레일 정리·스테퍼 진짜 게이팅)->S2 레이아웃(2컬럼+인스펙터·관제탑/퍼널/DNA/진단 재배치)->S3 모바일+폴리시(반응형·하단탭·Cmd+K)·각 통과기준. **커밋우선(#139)**: 대형 착수 전 검증완 미커밋 자산 먼저 commit/push로 위험반경 축소(Stage1 선행 게이트). 원칙 #137(항목별 액션밀도->overflow 케밥(점3개) 표준·crawl행<->에셋타일 통일)·#138(대형 리팩토링=검증가능 Stage 분할·구조먼저·라이브검증·대표 리뷰->디테일)·#139 박제. docs only·코드변경0·tsc 무관·Naver PUT 0·SD-01 무접촉·sentinel0.
- 2026-06-23 (세션9·Code/씨앗심기 7→5탭 IA 재배치 — C-IA-5TAB·대표님 GO): 7탭(기본·옵션·이미지·배송·A/S·SEO·원산지·혜택·비주얼)→5탭(기본 정보·옵션·이미지·검색최적화·배송·정책). **검색최적화 탭 신설**(흩어진 SEO 입력 집결: 골든키워드·셀러 태그=기본에서 이동, SEO 훅문구=이미지에서 이동, 상품명 읽기전용 표면화=새 state 0·#132 준수·대표님 결정, SEO 점수=우측 패널 유지). **배송·정책**=배송/AS+원산지·수입사+혜택(리뷰·구매평·고시) 흡수. **비주얼 자동화 탭 제거**(온실 아틀리에 대체·post-register autorun jump 은퇴). **하단 액션바 sticky**(position:sticky bottom:0). 동기화: tab 배열(seo<shipping 재정렬·benefit/visual 드롭)·tabDone(originCode 게이트 seo→shipping)·validTabs·activeTab union. 단일 파일 products/new/page.tsx(214640→212682·-1958B)·edit는 ?edit= 리다이렉트로 동일 폼 자동 상속(#135). **tsc0**·build=dev(next dev:3000) 점유로 #136 보류(dev 정지 후 실행)·Naver PUT 0·SD-01 무접촉·sentinel0. 다음=build0→Desktop 실렌더 e2e(#45/#88)→대표님 GO 후 commit/push.
- 2026-06-23 (세션9·Code/Desktop 재검증 PASS 박제 — 행단위 포함 전부 PASS): studio·B5·v2.5(하단바+행)·B6 전부 라이브 PASS 확정. 직전 pending-cart-data였던 행단위(v2.5 /crawl 행 overflow·B6 crawl행/AssetBrowser 4타일 aria) Desktop 라이브 PASS. **꽃수레 0개=콜드스타트 artifact(데이터 정상)** — 빈 카트=초기 데이터 상태(결함 아님)·행 컴포넌트=하단바와 동일(저위험). #136 확인(직전 B5/B6/v2.5 500=.next 손상·코드결함 아님). 다음=씨앗심기 7→5탭 IA 재배치(대표님 GO 대기·#132 필드재배치만·#135 new+edit 공유 폼). docs only·코드변경0·Naver PUT 0·SD-01 무접촉·sentinel0.
- 2026-06-23 (세션9·Desktop/AssetBrowser 라이브 전수검증·DONE): 프로덕션·명화 AssetBrowser 전수검증 PASS — **read-only**(ZIP·딥링크16·경로복사·타일119·뱃지·Adobe라벨) + **classify**(신뢰도·추천합성·저해상플래그·8단계 오버라이드) + **upload**(archive·네이밍·57→58) + **delete**(#73 모달·58→57) + **그라운드트루스**(storage/registry 잔여0·Naver 무접촉). P1 직접업로드·P2 ZIP·P3 딥링크 전부 LIVE. Desktop 레인 D7 DONE 등재. 원칙 #130(라이브 변이=throwaway+즉시정리·잔여검증=storage SoT·이중렌더 보이는 인스턴스+정확속성). 관찰 백로그(비차단): write-path positive 등록검증=non-delete 경로 필요(현 등록후삭제 사이클은 등록/미등록 구분 불가·reconcile 흡수). sentinel0·tsc 무관(docs).
- 2026-06-23 (세션9·Code/C16↔C26 중복 해소 + #129 보강): Desktop 트래커 실측 — C26 '정합엔진 신규구축'은 **C16(CLOSED) 확인 reconcileRegistryDrift와 중복**. C26 (a)=신규 'storage list→insert 스크립트' 아닌 **기존 reconcileRegistryDrift 호출 경로** 실행(드리프트 20/71·운영자 GO). C16 행에 C16↔C26 교차참조 메모 추가. #129 보강(C16 CLOSED 기록 참조·#45 연장). (b) write-path 등록 감사=직전 턴 구현완료 재확인(registerUploadedAsset 7콜·tsc0·build0). 중복 빌드 0. tsc0·sentinel0.
- 2026-06-23 (세션9·Code/write-path 등록 감사+추가 + C26 재범위 + #129 + 적재v2 감사): **★정정** — 직전 'C26 정합엔진 신규구축' 취소(#129 실측: reconcileRegistryDrift + registry_drift 카드 #56 기구축). C26 재범위: (a) reconcile 실행 드리프트 20/71 해소(GATED·운영자 GO) (b) write-path 등록 감사. **코드(b)✅**: `registerUploadedAsset`(automation-storage·멱등 P2002·best-effort·STAGE_NAMING 토큰·additive) 신설 + 6 write-path 7콜 — apply-composite·apply-cutout(×2)·finish-image·thumb-crop·save-assets(×2)(ingest-firefly·assets/upload 기등록). 드리프트 재발 차단 근본책(#62). **적재v2 감사**: P1/P2/P3 전구현+초과(콘텐츠인식분류·ratio정규화·classify칩·ZIP export·딥링크/경로복사·AssetBrowser WorkbenchTabs)·P4(데스크톱 헬퍼) 미구현·P5(하우스키핑)=asset-integrity. **#129 박제**(신규 트랙 전 기존 구현 실측). tsc0·build0·additive·비가역0·네이버 무접촉.
- 2026-06-23 (세션9·Code/5계층 실측 + 백필 실행완료 + #128 + C26 설계): **적재 5계층 실측** — asset_jobs 25 가동(awaiting_human=개입점)·물리 Storage 71 정상·asset_registry 20/71 등록(51 드리프트)·published_assets 0 정상·prompt_library/references 미가동. **백필 실행완료**(ADAPTIVE_IMAGE_ENGINE §7.1): 라이브 평면-루트 0·archive=retire-by-copy 무손실·명화 51/달항 18/아이스 2 전부 폴더화. **#128 박제**(Storage=SoT·registry 부분반영 20/71·발행은 Product row라 무영향·정합=C26). **C26 신규**(🔒GATED 설계완·GO 대기): storage→registry 백필+발행후 자동등록·dry-run→GO 이중게이트·멱등·전상품. ROADMAP P2-F. **C25 의존성 갱신**(C25←C26). docs only·코드변경0·비가역0·네이버 무접촉. tsc0. (커밋 대기·운영자 지시)
- 2026-06-23 (세션9·Code/상세 전체교체 안전성 + dryRun 발행검증 + #127 + C25 ROADMAP): **★상세 안전성(#46)** — detailContent는 payload에 **항상 포함**(product-builder.ts:941 무조건) → full-replace strip 안 함 · 빈값 위험 없음. buildDetailContent(:649) 전부 비면 placeholder 1줄(:697)이나 명화는 detail_image_url 존재 → non-empty(empty-wipe 없음). 잔여: dryRun preview에 detailContent 미표시(fact-check 갭·:88-110) + DB상세<라이브면 downgrade. 권고=**조건부 PUT**(PUT 전 라이브 GET 스냅샷 + DB상세 일치확인). **dryRun 발행검증(Desktop)**: canRegister:true · S/94 · errors 0 · 대표=기존 폴더적재 Storage · HB/원산지/가격/옵션/SEO 정상 → 명화 발행 임박. **#127 박제**(UI canSave≠API canRegister · 크롤 임포트 거짓음성 · 판정 SoT=dryRun · 해소 C25). **C25 → ROADMAP Sprint8 P2-E 등재**. docs 체크포인트 커밋(가역). tsc0.
- 2026-06-23 (세션9·Code/이미지 저장 게이트 판정 + dryRun 계약 + docs 체크포인트): **게이트 판정** — studio 「이미지 저장」(ActionsCard·disabled={!canSave}) 게이트 `canSave=(thumbnails!=null||detail!=null)&&!saveBusy`(useStudioActions.ts:476)·**인앱 생성 state만 인식·DB mainImage/detail_image_url 미인식**(thumbnails/detail=useState null·생성시에만 set·상품변경 리셋·주석 'NOT persisted'). 판정=**(B)설계**(버튼 목적=생성물 Storage 영속화) + 발행 워크플로 관점 **(A)갭**(크롤 임포트 기존 DB자산 재생성 강제). **★하드 발행 차단 아님**: /api/naver/products/update가 DB row로 full payload 발행(update/route.ts:107-119·158). **전상품 공통(#62)**(canSave product-agnostic). **C25 신규 트랙**(studio 발행경로 DB자산 인식). **dryRun 계약 확정**: POST /api/naver/products/update {productId,dryRun?,confirm?,fields?}·`isDryRun=dryRun===true||confirm!==true`(:45)·confirm 미포함=무조건 preview(네이버 무접촉)·payloadPreview.productInfoProvidedNotice 포함(:104-105)·실 PUT은 confirm===true&&dryRun!==true(:163)만. docs 체크포인트 커밋(가역·code change 0). tsc0.
- 2026-06-23 (세션9·Code/O2 시각검증 + P2 C24 트랙 등록 + docs 체크포인트 커밋): **O2 시각검증 완료** — 명화 단순 라인 상세=detail-source **READY**(프로 공급사 상세·인증·변형·사용법·푸터 완비·#122 시각확증), 디테일 라인 상세=detail-S6 **부분골격**(5섹션 합성 필요). 명화 발행 잔여=단순 pre-PUT dryRun + 씨앗심기(#117) + 대표 GO(임박). **신규 P2 트랙 C24** '디테일 5섹션 상세 엔진(전상품 공통·발행후)'=적응형 이미지엔진 구조화 실증·product-agnostic — Code 레인 + ROADMAP Sprint8 P2-D 등록(QUEUED·#116 디테일 레인·#125 검증후 공급). **docs 체크포인트 커밋**: O1(thumbnail-assess)+O3(info-notice verify)+O2(detail readiness)+원칙 #121~126 누적 5 MD를 docs-only 단위 커밋(code change 0·비가역 0·네이버 무접촉·git 가역). tsc0.
- 2026-06-23 (세션9·Code/O3 정보고시 검증 + 양라인 결정 박제·#124/#125): **O3 정보고시 검증 완료(코드 단정)** — PUT/POST는 `buildNaverProductPayload`가 productInfoProvidedNotice(ETC)를 **매 상품 인라인 자동조립**(product-builder.ts:933·964→detailAttribute.productInfoProvidedNotice). 조립기 `buildProductInfoProvidedNoticeEtc`(383-423) 폴백 체인: itemName=productInfoName ?? naver_title ?? name ?? '상품상세참조' / modelName=productInfoModel ?? naver_title ?? name / manufacturer=productInfoManufacturer ?? naver_manufacturer ?? 스토어명. **→ productInfoName/Manufacturer/Model 입력 필수 아님**(최상위 우선 선택적 오버라이드·null이면 폴백). HB(naver_certification)=formatSafetyDeclaration→**etc.qualityAssuranceStandard에 prepend**(404-407·전용 인증필드 부재·값 있을 때만·전상품 무회귀). **정정**: update dryRun payloadPreview는 이미 productInfoProvidedNotice 노출(update/route.ts:104-105·주석 101-103=HB를 qualityAssuranceStandard에서 검증 명시)→MYEONGHWA '미표시 추정'은 stale. **미단정(코드 불가·단정 금지)**: 폴백 placeholder + HB-in-qualityAssuranceStandard가 네이버 SUSPENSION을 실제 해제하는지(전용 생활화학 고시유형 요구 여부)=서버 수락 영역. **양라인 결정**: Desktop=명화 양라인검증(O1→O2→단순)·D3 PARKED·동시 3트랙. 원칙 #124(검증 순차성)·#125(양라인 플래그십 실테스트 후 확장) 박제. (#121~123=Desktop 전턴 콘텐츠 미수신·HOLD). 코드변경0·tsc0·docs only·비가역0·네이버 무접촉.
- 2026-06-21 (세션9·Code/C5-1 빌드 + D3 준비도 + C15 흡수): **C5-1 DONE** — E8 v2 데이터 모델: benchmark_dna 테이블(14컬럼·category_code·source_priority·commerce_convention·trend_keywords·source_refs·status draft/approved/retired·reviewed_by/at·collected_by·version·#102/#103/#105) + Product.aesthetic_dna(#106) Supabase additive 마이그(c5_1_benchmark_dna_and_product_aesthetic_dna·IF NOT EXISTS·0행·reversible DROP) + prisma schema/generate. 검증 benchmark_cols=14·aesthetic_col=1·rows=0·tsc0·build0. 설계 A1/B1(런타임 읽기전용·#104=C9). 다음=C5-2 수집어댑터. **D3 준비도**: 달항=composite-ready(cutout✓plate✓·#58 육안확증 대기)/아이스=누끼-선행(cutout 부재)→C9 카드 후보 등재. **C15 흡수(#89)**: 페어정리 재지시는 직전 턴 bbdb235에서 가역 아카이브로 이미 완료(stage=archive·detail stray=0)·하드삭제 재실행 안 함(이미 아카이브된 자산 파괴 방지·idempotent no-op).
- 2026-06-21 (세션9·Code/C15 정리 + Desktop 역량 확정): C15=DONE. **MCP는 물리 Storage 변이(업로드/삭제/이동/복사) 일체 불가(#59 일반화)**·물리 변이=Code service-role SDK 전담. stray 자산(cmqmbemz…·명화 detail/hero-1781957364462.png·640²·firefly_auto·slot=hero@stage=detail 불일치) #79 전수스캔 0참조(Product/LifestyleAsset/published_assets/asset_references/asset_jobs/art_director_prompts/prompt_library_entry/generation/slot_generation/daily_recommendations/backdrop_jobs ::text + 레포 grep + 타 registry행) → **C23 정신대로 가역 아카이브**(moveAutomationAsset→archive/ + registry stage detail→archive·하드삭제 아님). 검증 registry stage=archive·detail stray=0(복원=move back+stage→detail). 원칙 #120 박제. tsc0·비네이버 로컬(#46 불요).
- 2026-06-21 (세션9·Code/C19b prod-verified + C16 CLOSE + C23 분리): **C19b=DONE** — Desktop prod 라이브 e2e(하드리프레시) 검증: 명화 평가됨(재평가 버튼) 관측→DELETE→미평가+「대표이미지 평가·승인」(enabled) 플립·양 상태 정상 렌더. f8bfa6a(254-255) 이미 정합·코드변경0·근본원인 D 2회 반증·premise 불성립. 인터럽트된 e2e 변이(명화 잔여 POST→DELETE) 복원 추적완. **C16=CLOSED**(archive 유틸 이미 stage-범용·premise 무효·코드0·#46). 후보 enhancement은 **C23**(supersede→archive 개입카드·P2)로 분리 신설. 원칙 #119 박제(하드리프레시 검증·인터럽트 cleanup 추적·정적 probe=point-in-time·코드done↔prod-verified 컬럼분리). 다음 Code=C5(E8 v2·스코핑→설계 fork 보고→GO 후 빌드).
- 2026-06-21 (세션9·Code/C16 조사): archive 유틸 stage-범용 여부 실측 — archiveAssets(registryId·any stage)·reconcileRegistryDrift(path)·assets/action archive(path)·fixProductIntegrity **전부 이미 stage-범용**이고 archive action이 일반 integrity카드+variant_composite카드를 모두 재동기. composite 한정 코드는 ratio가드(composite/thumbnail만 비율규칙 보유·정당)와 variant-coverage(변형↔composite 도메인 바인딩·정당)뿐. **C16 premise(composite 전용) 코드상 불성립 → 코드변경 0(#46 날조 금지).** Desktop이 관측한 구체 한계 확인 대기(또는 CLOSE). 옵션 enhancement: product-level(thumbnail/hero/detail) 슈퍼시드 자동아카이브 surfacing.
- 2026-06-21 (세션9·Code/P0 D5 문서정합 + P1 워크플로 형식화·#113~#118): **P0** D5 문서회귀 종결 — PRINCIPLES #113(재개=update route statusType='SALE'·**D6 CLOSED**)·#114(statusType 가변성·OUTOFSTOCK만 read-only)·#115(문서회귀 방지+검증규율) 박제 + MYEONGHWA doc 국산→중국산(0200037) 정정. **P1** PRODUCT_REGISTRATION_WORKFLOW §1-A 신설(통합 노력 레인 단순/디테일 ⊇ 공급사 A/B + 씨앗심기 선행 게이트 + STEP10 디자인 커넥터) + §6 `sourcing_incomplete` 카드 + PRINCIPLES #116/#117/#118. 신규 앱 노출=C22. 큐=C15(MCP)→C16→C5→C9→C4.
- 2026-06-21 (세션9·Code/C19b UI): 대표이미지 평가 카드 UI(#56) — PrePublishGatePanel에 ThumbAssessControl(미평가→승인 POST·평가됨→재평가 DELETE) + useEngineStrategy refetch 추가 + studio publish탭 배선(productId/onAssessed) + i18n 5키(thumbAssessCta 등). 라우트(/thumbnail-assess)는 Desktop e2e PASS·마이그 적용됨. tsc0/build0/이모지0/신규 한글리터럴0. 브라우저 클릭 검증 권장(Desktop). 다음=C15(MCP 단발턴)→C16→C5.
- 2026-06-21 (세션9·Code/D5 정정 #44): D5 직전 보고 오류 정정 — 판매재개는 전용 엔드포인트/수동이 아니라 **기존 update route가 커버**. buildNaverProductPayload가 statusType='SALE' 항상 emit(product-builder.ts:937)→full-replace PUT가 판매중지 해제. prod dryRun 실증(payloadPreview.statusType=SALE·네이버 무접촉). 'statusType read-only'(api-client)는 OUTOFSTOCK 전용(주석 정정). **D6 불필요**. 교훈: grep 거짓음성에 속지 말 것·sed/직접읽기+dryRun 실증으로 확정(#45/#88). 명화 재개=update confirm:true(운영자 GO·비가역).
- 2026-06-20 (세션9·Code/C19 e2e+D5+C20·#109): Desktop이 c19 마이그 적용·e2e(POST플립/DELETE원복) PASS·핫픽스 회귀복구 전상품 PASS → C19=DONE. ★구조발견 박제(#109): publishReady=첫발행 게이트(DRAFT+naverProductId null)·기등록=재개/업데이트 별도 경로·thumbnailAssessed≠게이트입력. D5 보고: update route(PUT 전체교체) 존재·판매재개 전용 엔드포인트 미구현(statusType read-only). C20: 'tones tones' 중복 제거(paletteToneClause). 다음=C19b(UI)→C15→C16→C5.
- 2026-06-18 (세션9·Code/C19 핫픽스): C19 배포(9c44c2f) 후 strategy gate=null 회귀(전 상품) 발견·즉시 복구(20bca96). 원인=평가 read의 $queryRaw가 미마이그 컬럼에서 Prisma **P2010**(raw query failed·Postgres 42703 래핑)을 던졌고 가드가 P2022만 봐서 재던짐→strategy 내부 catch가 스왈로우→gate=null. 교훈: **순수 보강 read는 best-effort(전 에러 스왈로우→안전 기본값)**, raw 미마이그 컬럼=P2010(≠P2022). LIVE 복구 검증: gate present·thumbnailAssessed=false·seoComplete/goldenKeywordComplete=true·originTruth=pass.
- 2026-06-18 (세션9·Code/C19 백엔드): 조사 결과 thumbnailAssessed 플립 경로 0(buildInput이 thumbnailSignals 미주입=구조적 항상 false)→#56 평가 메커니즘 구축. 백엔드(가드 raw SQL·schema.prisma 무변경=배포순서 무제약): `thumbnail-assessment.ts`(ATTESTED_PASS_SIGNALS·readThumbnailAssessments/set/clear)·load-publish-readiness 주입(평가 시 thumbnailAssessed/Pass 플립)·POST/DELETE `/api/products/[id]/thumbnail-assess`(가드·가역·네이버 무접촉)·`MIGRATION_c19_thumbnail_assess` SQL. 운영자 결정: additive 컬럼+마이그(별도 Supabase-MCP 단발턴 #26)·UI=C19b. tsc0/build0. 다음=[MCP] c19 마이그 적용→C19b.
- 2026-06-18 (세션9·Code/큐 재배열 #89): Desktop C6 검증 PASS(전 슬롯 firefly_reference+모델추천·REALISM·보호문 강함·empty-margin 제거·gate 회귀0). 큐 재배열 C19→C15→C16→C5→C9→C4→P3. 신규: C19(명화 thumbnailAssessed 플립·P1 매출)·C15 타깃 명시(cmqmbemz…/detail/hero-1781957364462.png)·C20(C6 폴리시 tones 중복)·C21(#103 검색량 가드 백로그).
- 2026-06-18 (세션9·Code/C6 코어): REALISM-CAMERA-BLOCK 전 슬롯 + Firefly-ref-composite 표준 엔진 편입(코어). spec-data `REALISM_CAMERA_BLOCK`(전 슬롯 prompt 주입)·`REFERENCE_COMPOSITE_BLOCK`(변형 씬을 reference-composite로 전환=빈공간 reserveProductMargin/PIL은 명시적 폴백)·guards `realismBlockPresent`·engine `slots.composite{method:firefly_reference·recommendedModel·fallback:local_paste}`·strategy API 노출·MoodCameraPanel 가드행+ko 라벨. 테스트 mood 10/engine 12 PASS·tsc0·build0·신규 한글리터럴0. 운영자 결정: concept별 카메라(C17)·composite 모델 실제 재라우팅(C18)=후속 C-아이템. 다음 Code=C5.
- 2026-06-18 (세션9·Code/변경흡수 #89): Desktop self-handoff 흡수 — C3/C14 라이브 PASS·썸네일 variant=null 확정(C14(c) 종결). 신규 Code 위임 2건 추가: C15(테스트 자산 물리삭제+detail/ 재확인·storage=Supabase-MCP 단독턴)·C16(archive 유틸 stage 범용 확장). 신규 유의사항: 라이브 test-ingest=정리부담→비영속 검증 선호(자산 생성 최소화). 다음 Code=C6.
- 2026-06-18 (세션9·Code/C3 LIVE 검증): prod fdcad92 strategy gate 실측 — 명화 goldenKeywords=[차량용방향제·디퓨저·에어컨냄새제거]·goldenKeywordsMissing=[]·seoComplete=true. 핸드오프 '차량용 누락' 전제=**stale**(차량용방향제 compound가 이미 상품명 포함, 단독 '차량용' 토큰도 substring상 포함). 운영자 결정: C3=커버리지 가드로 확정·검색량 검증 가드(#103)=별도 C-아이템 백로그. D4/O3 발행 잔여=대표이미지평가+상태정합 2건으로 정정.
- 2026-06-18 (세션9·Code/C3+C14 묶음·#108): C3 골든키워드 상품명 포함 가드(publish-readiness `goldenKeywordsMissingFromTitle`→`fields.golden_keyword_in_title`→seoComplete/fieldsAllSet·strategy gate `goldenKeywords`/`goldenKeywordsMissing`/`goldenKeywordComplete` 노출·targetKeywords 비었으면 fail-open #55) + C14 ingest 파서 가드(명시 stage 우선→거짓 conflict 억제·`explicitStage`/`contentMismatch`·제품레벨 stage variant=null·`variantIgnoredForStage`). D1=DONE·D4=GATED(대표이미지평가+상태정합+차량용) 보드 동기화. 원칙 #108 박제. tsc0/build0/이모지0/신규한글리터럴0/비가역0/네이버 무접촉.
- 2026-06-18 (세션9·Code/보드정렬+#106/#107): LIVE WORK BOARD(§4) 정렬 — Code C0~C13/D/O 레인+의존성맵+순서(C3→C6→C5→C9→C4→P3·C12 GO게이트). C1(향§4 v6)·C2(archive)·C10(원칙)=DONE 반영. 합성표준 전환(#107 누끼→Firefly 레퍼런스 합성·PIL 폐기→폴백)·REALISM-CAMERA-BLOCK 전 슬롯(C6·E8v2 선행)·어우러짐(#106 배경=productAestheticDna 에코) 박제. 원칙 #106·#107 추가.
- 2026-06-18 (세션9·Code/§4 v6+archive+E8v2설계+#105): 플레이북 §4 v6 prose 교체(재고3향 레몬 웜·에이프릴 하이키·체리 로우키·코튼 stock0 현행)·권위 v6. archive 유틸 + 확정3건 정리(april '후레쉰' typo·구 레몬·guard-test)→커버리지 4/3→3/3·카드 해소(push 5fe06fa). E8 v2 설계확정(컨벤션 스펙트럼·benchmarkDna 자산화·프롬프트 라이브러리·정체성 오버라이드 단계·검토카드·Design Readiness). 원칙 #105(컨벤션은 정체성에 복무). 백로그 INGEST-GUARD-REVIEW(선택·저우선).
- 2026-06-18 (세션9·Code/E5 v6 mood+원칙+백로그): E5 per-scent mood(v6 레몬 M4·에이프릴 M5·체리 M6·push 0f9d665·prod variants 3향 v6 grade). 향 서사 v6 해소(Desktop 실측). variant_composite 3/3 LIVE(operator v6 3컷·april escape 가드 차단). 원칙 #102(한국우선 리서치)·#103(SEO 골든키워드)·#104(info-dependency 게이트) 박제. 백로그 INFO-DEP-DESIGN-GATE 등재.
- 2026-06-17 (세션9·Code/E5 본체+variant 가드·#62): E5 향별 concept 주입(variant-concept.ts optionValue→영어 scene·assembler backdrop 분기 concept+PRODUCT_MARGIN_BLOCK+BACKDROP_EXCLUSION·strategy scent_note 슬롯 variants[]·SlotFunnelBoard 향별 복사). ingest variant 가드(stage=composite+variant 시 in-stock optionValues 대조→불일치 바인딩거부+variantUnmatched·근거 april '후레쉰' 오타 침묵정체). push 1a79bfe·prod 검증 명화 scent_note variants 3향·backdrop concept+margin+제품미피사체·ASCII100%. 원칙 #101(변형 바인딩 검증). v6=3/3 active(concept 피사체 v5/v6 안정·grade 서사 충돌만 미해결). E6→P2.
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
