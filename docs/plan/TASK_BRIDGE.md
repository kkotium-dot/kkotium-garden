# TASK_BRIDGE.md — Desktop ↔ Code 공동 기억 장치

> **이 파일의 역할**: 🖥 Desktop (planning + verify) 와 💻 Code (build + ship) 가 *실시간*으로 작업을 인수인계하는 ledger. SESSION_LOG가 세션 종료 후 회고라면, TASK_BRIDGE는 세션 진행 중 살아있는 hand-off 장부.
>
> **새 세션 첫 turn 의무 정독 순서**: PROGRESS.md → ROADMAP.md → SESSION_LOG.md → **TASK_BRIDGE.md** (현재 진행 상태 1분 파악).
>
> **갱신 정책**: 매 hand-off 시 §3 ACTIVE 섹션 갱신 의무. 완료 hand-off는 §7 ARCHIVED로 이동. T1 1000 / T2 1500 줄 임계 도달 시 작업원칙 #31 분할.

---

## §0 본 파일의 7-step 시스템 (작업원칙 #41)

| Step | 행동 | 책임 |
|---|---|---|
| 1 | 세션 시작 시 §3 ACTIVE 정독 | 양 환경 |
| 2 | §4 STANDING + §6 PENDING 확인 | 양 환경 |
| 3 | 작업 진행 (단일 commit 단위) | 작업 측 (Desktop or Code) |
| 4 | 완료 시 §3 ACTIVE 갱신 (FROM/TO/BASELINE/SCOPE/NEXT) | 작업 측 |
| 5 | hand-off 메시지 보고 (5-step 형식) | 작업 측 |
| 6 | 검증 측 cross-track 확인 (git + Vercel + DB + Chrome 가능 한 만큼) | 검증 측 |
| 7 | 통과 시 다음 ACTIVE로 갱신 → §3 이전 entry는 §7로 archive | 검증 측 |

---

## §1 두 환경 역할 표 (영구 참조)

| 측면 | 🖥 **Desktop** | 💻 **Code** |
|---|---|---|
| **MCP 강점** | Supabase / Vercel / Chrome / Filesystem(read) / image-search / web | Filesystem(write) / Bash / Git / TSC / Playwright |
| **주특기** | 리서치 · 아키텍처 · 오류 진단 · 외부 자료 대조 · 검증 smoke · paste-ready 본문 작성 | 코드 작성 · 테스트 · 패키지 · git · 로컬 서버 · MD 실 적용 |
| **할 수 있는 것** | Supabase `execute_sql`/`apply_migration` · Vercel deploy 조회 · Chrome E2E · 코드 read · *제안 본문* 작성 | 모든 파일 *생성/편집* · `tsc --noEmit` · `npm run build` · `git push` · MD 파일 *실제 적용* |
| **할 수 없는 것** | 코드 파일 *생성/편집* · 큰 추적 MD 부분편집 · git commit · 패키지 설치 (★ 단 핸드오프 MD는 #49로 write_file 직접 작성 허용) | Supabase/Vercel/Chrome/image-search MCP 직접 호출 |
| **핸드오프 인계 (#49)** | docs/handoff/ MD를 Filesystem:write_file로 직접 작성(다운/업로드 0) | 작성된 핸드오프 git add/commit 보존 + 큰 추적 MD Python full-overwrite 반영 |
| **세션 시작 트리거** | "꽃틔움 가든 Desktop 진입 + TASK_BRIDGE §3 정독" | CLAUDE.md 자동 + 4 MD 정독 |
| **세션 종료 의무** | §3 ACTIVE 갱신 + 사용자에게 paste-ready 메시지 전달 | 동일 + git push + `verify-vercel-deploy.sh --wait` |

---

## §2 핑퐁 프로토콜 — 5-step 표준 hand-off 형식

```
┌─── [TASK BRIDGE] hand-off ──────────────────────────
│ FROM: 🖥 Desktop  ↔  TO: 💻 Code  (또는 역방향)
│ BASELINE: <SHA> (Vercel production READY)
│ SCOPE: <Sprint 이름 + sub-phase>
│
│ ▼ STEP 0 (점검) — Code 측이 자동 실행
│   cd /Users/jyekkot/Desktop/kkotium-garden && \
│   git rev-parse HEAD origin/main && \
│   git status --short && \
│   curl -s -o /dev/null -w "production_http=%{http_code}\n" \
│     https://kkotium-garden.vercel.app/
│
│ ▼ SCOPE (작업 범위) — 단일 commit 단위
│   <상세 변경 명세>
│
│ ▼ VERIFICATION TRIGGER (검증 신호)
│   push 직후 hash 보고 → Desktop이 자동:
│   (1) git HEAD + Vercel deploy cross-check
│   (2) Supabase 사전 단정 (필요 시)
│   (3) Chrome MCP smoke
│   (4) 결과 보고 + 다음 hand-off 또는 PENDING
│
│ ▼ FALLBACK (실패 시)
│   <회귀 시 즉시 대응 path>
└─────────────────────────────────────────────────────
```

역방향 (💻 Code → 🖥 Desktop) 도 동일 5-step.

---

## §3 ACTIVE HAND-OFF ⭐ (항상 최상단 한 섹션, 매 hand-off 시 갱신)

### 2026-06-08 (60) 인제스트 재발방지 + 2갈래 실품질 + 명화 상세 Branch A (FROM Code, main f3c3784, 비가역 0). ★명화 큐레이션 完(main+detail curated)

| 항목 | 상태 |
|---|---|
| 권위 | docs/plan/PARALLEL_WORK_TRACKER.md #3·4·5 + IMAGE_DETAIL_TWO_BRANCH_SYSTEM.md. |
| (1) 재발방지 ✅ | parse-dome-no.ts(도매 url 번호 파서·sharp-free) + products create가 supplier_product_code를 explicit→productNo→url(sourceUrl/url/productUrl) 파싱 폴백 → 누락 0(전상품). |
| (2) 2갈래 실품질 ✅ | capture-source-detail가 공급사 상세 assessImageQuality→quality_reasons.sourceDetailGood(score>=50). engine deriveSourceStrategy(상세품질×썸네일 curated → A/A_EXTRACT/MIXED/B/unknown). matrix read + 관제탑 칩 4값. ★production 실측: 명화=A(상세양호+대표curated)·달항아리=B(캡처 860x2294 저점)·아이스트레이=unknown(미캡처). 가용성→실품질 전환 완료. |
| (3) 명화 상세 Branch A ✅실행 | NEW POST adopt-source-detail(detail_image_url=source_detail_url + mostly_blank 확인 후 detailCurated 스탬프·detailBranch=A, 가역·생성 안 함). DetailPageCard "공급사 상세 그대로 적용" 버튼(sourceDetailUrl 시·생성 대안). ★명화 실행: re-capture(sourceDetailGood)→adopt→detail=**curated**(production 실측). |
| ★명화 큐레이션 完 | main=curated(v2 크롭)·detail=curated(Branch A 공급사 상세)·sourceStrategy=A. 잔여=SUSPENSION 해제(대표 GO 비가역만). |
| 검증 | tsc 0·build OK(adopt-source-detail ƒ)·이모지 0·한글 코드 0·비가역 0(네이버 0; DB 가역만). |
| ★ 다음 | Desktop: (a) 명화 main+detail=curated·sourceStrategy=A 매트릭스/Chrome 실측 + 명화 상세 미리보기(공급사 1000x18291 채택본) 육안 → 대표 컨펌 (b) 아이스트레이 도매번호 operator 제공→capture (c) 명화 SUSPENSION 해제 발행 GO(비가역, 대표). 후속: Branch A SEO/ROI 보강 자동화·Branch B 27렌더러(별 turn). |

### 2026-06-08 (59) 풀해상 상세 캡처(P16 해소) + 명화 main=curated 실행 + 2갈래 sourceStrategy (FROM Code, main 555466c, 비가역 0·네이버 0). ★item1·4 EXECUTED

| 항목 | 상태 |
|---|---|
| 권위 | docs/design/IMAGE_DETAIL_TWO_BRANCH_SYSTEM.md. 지난 turn item1 BLOCKED(소스 부재) 해소. |
| (1) 풀해상 캡처 ✅실행 | 근본원인 실측: getItemView desc.contents=객체(item/deli/event), 풀해상은 공급사 godohosting hotlink 보호. capture-supplier-detail.ts(desc.contents URL 추출·_stt 썸네일 제외·Referer fetch·최대면적) + POST /api/products/[id]/capture-source-detail → product-assets 업로드 → source_detail_url 컬럼(apply_migration add_source_detail_url). ★명화 실행: this_is_air_freshener_detail.jpg=**1000x18291** 캡처→Supabase 저장. |
| (4) 명화 main=curated ✅실행 | 캡처 Supabase 소스에 thumb-crop box{147,9407,696,696}→1000²(업스케일 1.44x+언샤프)·confirm:true. dry-run: region 정확·OCR 텍스트0·LOW_RESOLUTION caution만(비차단). 적용→mainImage=product-assets/thumb-cropmain. ★production 매트릭스 실측: 명화 main=**curated**(default→전이 완료). |
| (2) sourceStrategy 부분 ✅ | applyStatus.sourceStrategy(A=source_detail_url 확보→그대로활용 후보 / unknown). matrix hasSourceDetail + 관제탑 칩. 명화=A 실측. ★good/poor 품질 분리 평가(A/B 확정)는 후속. |
| (3) Branch A SEO보강 ⏸ | 공급사 상세 양호 시 "그대로+SEO/ROI보강"(생성 안 함) 본격 구현은 후속 turn. Track2(27렌더러)는 Branch B 전용(명화 불필요). |
| 검증 | tsc 0·build OK(capture-source-detail ƒ)·이모지 0·한글 코드 0·비가역 0(네이버 0; DB 가역+additive 컬럼만). production 실측 명화 main=curated·sourceStrategy=A. |
| ★ 다음 | Desktop: (a) 명화 main=curated 매트릭스/Chrome 실측 + 새 대표컷 육안(상세 9407px 부근 제품 단품) (b) 전상품 capture-source-detail 실행(풀해상 확보) (c) 명화 detail은 Branch A=상세 그대로 활용 결정 시 source_detail_url→detail 적용 or 부분 크롭. 후속: 품질 분리 평가·Branch A SEO보강. 명화 SUSPENSION 해제는 대표 GO(비가역). |

### 2026-06-08 (58) 명화 큐레이션 마무리 — 정합 통일·상세 curated 한정·크롭 언샤프 (FROM Code, main 6bf8ddf, 비가역 0). ★item1 실행 BLOCKED(소스 부재)

| 항목 | 상태 |
|---|---|
| 권위 | Desktop TASK_BRIDGE 4항목. Track1 라이브 통과 확인(명화 inspect→SUSPENSION 캐시→publish=none+drift·queue=resolve_suspension·main=default). |
| (4) 정합 통일 ✅ | nextAction을 SoT 단일 사다리로 통일 — curated 게이트(default 대표/상세→apply_curated_main/build_detail)·SUSPENSION drift(resolve_suspension)를 computeNextAction에 흡수. computeActionQueueItem=key→category 매퍼로 축소. verify_publish 잔존 제거. production 실측: 3상품 nextAction.key==queue.stage 전부 일치. tsx 7케이스. |
| (3) 상세 curated 실콘텐츠 한정 ✅ | classifyDetail = product-assets AND quality_reasons.detailCurated. apply-detail가 mostly_blank(occupancy<0.15) 검사 후 비-blank일 때만 detailCurated 스탬프. 빈 스켈레톤=default. production 실측: 명화·달항아리 detail=default(스켈레톤, 전 curated 오표기 해소). |
| (1) 크롭 언샤프 ✅ + 실행 ❌BLOCKED | simple-crop extractSquare 업스케일(<1000) 시 언샤프(sigma 1.0) 추가·배포 완료. ★실행 불가: 핸드오프 좌표(1000x18291)의 공급사 상세 원본이 DB/crawl_logs에 부재 — product.images·crawl_logs.images 모두 domeggook _stt_330(실측 330x330 썸네일)만 보유. _stt_960/_org/base 전부 404. 330² 썸네일에 좌표 적용 시 region 1x1 garbage(dry-run 확인). #46 날조 금지 → 미실행. |
| (2) 상세 7섹션 실콘텐츠 ⏸SCOPED | generate-detail은 skeleton+27 section-renderers 시스템(layout-skeletons+section-renderers). 실콘텐츠 7섹션(디자인토큰+공급사이미지+정보고시/속성 주입+아트갤러리 무드)은 renderer 실콘텐츠 authoring=대형 기능. 본 turn 미착수, 전용 turn 권고. apply 파이프라인(Track2)+mostly_blank 게이트는 준비됨. |
| 검증 | tsc 0·build OK·이모지 0·한글 코드 0·비가역 0(네이버 0; DB 가역만). |
| ★ 다음 | (a) item1: Desktop이 **1000x18291 공급사 상세 원본 URL 제공** 또는 직접 크롭 실행 또는 696² crop 본 전달 → 그러면 thumb-crop endpoint(언샤프 적용)로 1클릭 mainImage=curated. (b) item2: detail 7섹션 실콘텐츠 엔진 전용 turn. (c) 통과 시 명화 main=curated→상세 실콘텐츠 적용→대표 컨펌→update PUT(비가역). |

### 2026-06-08 (57) applyStatus 정확성 교정 + 전상품 상세페이지 적용 게이트 (FROM Code, main 74765e7, 비가역 0·네이버 0)

| 항목 | 상태 |
|---|---|
| 권위 | Desktop TASK_BRIDGE 2건 + always-state-status 결정문 + DETAIL_PAGE_PLAYBOOK.md. 근거: 라이브 매트릭스에서 명화 applyStatus 전부 LIVE 오표기. |
| 트랙1 정확성 (1e5f3a1) | (a) publishState=캐시된 네이버 statusType 기반(앱 status 아님): SALE만 LIVE / registered 非SALE(SUSPENSION)=publishDrift+미발행 / registered 미동기=DB. naver_status_type 컬럼 추가(apply_migration add_naver_status_type)+inspect 라우트가 실측 캐시(로컬 DB write·Naver mutate 0). (b) main/detail 3상태 ImageApplyState curated(앱 product-assets 버킷)/default(공급사 원본)/none — mainImage(빌더 필드) 기준. (c) actionQueue: GO 이전 default 대표/상세→apply_curated_main/build_detail 선행, SUSPENSION→resolve_suspension. 위젯 curated 초록·default/drift 앰버·none 점선(레드 0). tsx 7케이스. ★production 실측: 명화 main=default·detail=curated(skeleton·caveat)·publish=DB(미동기)·queue=apply_curated_main(전 LIVE 오표기 해소). |
| 트랙2 상세 빌더 (74765e7) | 기존 detail 빌더(section-builder+detail-html-serializer+generate-detail+DetailPageCard 미리보기) 위 적용 단계 추가: NEW POST /api/products/[id]/apply-detail(미리보기 PNG→product-assets curated 업로드→detail_image_url set, 가역 DB·네이버 0). DetailPageCard "이 상세로 적용" 2단계 컨펌 게이트(productId/onApplied optional·PLANT 무파손). 적용 시 detail_image_url=product-assets→applyStatus.detail=curated 자동 전이. |
| 검증 | tsc 0·build OK(apply-detail ƒ)·이모지 0·한글 코드 0·비가역 0(네이버 0; DB 가역+additive 컬럼만). |
| ★ caveat(#46) | 명화 detail-S6 skeleton이 product-assets라 provenance상 'curated'로 읽힘 — 빈 스켈레톤 품질은 publish-preview mostly_blank 게이트가 별도 포착, Track2 적용이 실 curated 상세로 교체. 정확 skeleton 판별은 후속. naver_status_type는 inspect 실행 전까지 null→publish=DB(미확인). |
| ★ 다음 | Desktop: (1) inspect 명화 실행→naver_status_type=SUSPENSION 캐시→매트릭스 publish=주의(drift) 재실측 (2) 명화 상세 generate→미리보기→"이 상세로 적용"→detail curated 전이 라이브 실측 + 대표 컨펌. 후속: detail 엔진 7섹션 플레이북 정합 강화·skeleton 판별. |

### 2026-06-08 (56) 개입 대기열(Operator Action Queue) 전상품 시스템 레이어 + #56 (FROM Code, main 415358b, 비가역 0)

| 항목 | 상태 |
|---|---|
| 권위 | docs/design/OPERATOR_SYSTEM_BLUEPRINT.md §3·§4 + always-state-status 결정문. 전상품 범용(#55)·적용현황 상시(#54)와 통합. main 직접. |
| 1) 엔진 파생 | control-tower-engine computeActionQueueItem: nextAction+image 게이트 → 4분류(AUTH=awaiting_human / AUTO=in_progress·done / GO_PENDING=publish·verify_publish / INPUT_DECISION=그 외). ActionQueueItem={productId,productName,category,stage,deepLink,detail}. 신규 컬럼 0·가드 불요. ControlTowerRow.actionQueue + matrix row 노출. tsx 8케이스 실증. |
| 2) 관제탑 위젯 | OperatorActionQueue를 관제탑 상단 마운트(테이블 위). 전상품 카드(카테고리 칩+상품명+행동 1줄+1클릭 deepLink), 순서 GO>AUTH>입력결정>자동(순서 강제 아님·우선 정렬만). 적용현황(결과축)과 좌우 한 쌍(행동축). 레드=GO_PENDING 1곳만(75/15/10). |
| 3) 원칙 #56 | PRINCIPLES_LEARNED #56(개입 자연스러움) 등재 — 개입점 항상 surface·순서 강제 0·자동/반자동 경계·레드 스코프. |
| 4) P3 폴리시 | FireflyPromptBuilder "프롬프트 복사" CTA primary(레드)→secondary(뉴트럴). 레드=메인지정 1차 액션+GO만. 라이브 잔존 레드 2곳 중 보조 1곳 정리. |
| 검증 | tsc 0·build OK·렌더 이모지 0·한글 코드 0·비가역 0. production smoke: matrix actionQueue 전상품 4분류 노출. |
| ★ 다음 | Desktop Control Chrome 라이브 실측: (1) 개입 대기열 4분류 카드·카테고리 칩 색(GO 레드 1곳) (2) deepLink 1클릭 정확 화면 (3) 레드 스코프=GO+메인지정만(복사 뉴트럴 확인). 2차(딥링크 정합 세부)·3차(Firefly/네이버 Chrome MCP 반자동 #52)는 후속 로드맵. |

### 2026-06-08 (55) 아틀리에 워크벤치 UI 재설계 1단계 + 적용현황 인디케이터 + #54/#55 (FROM Code, main 직접, 비가역 0)

| 항목 | 상태 |
|---|---|
| 권위 | docs/design/STUDIO_ATELIER_UX_REDESIGN.md + KKOTIUM_DESIGN_SYSTEM.md + docs/decisions/2026-06-08-always-state-status-and-universal.md. 브랜치 main 직접(SD-04 복귀). |
| 트랙A 스튜디오 (d91ad9b) | P1: AiQueueStepper 4열 그리드(54px 짓눌림·제목잘림·.gp-sticker 배지겹침) → 세로 스텝 리스트(Lucide CheckCircle/Loader/Circle·상태칩 별도 컬럼·좌측 4px 액센트·overflow 해소). P3: 워크벤치 레드 제거(스텝·번호원·헤더·레드틴트 그림자 → 핑크/뉴트럴), 레드=메인지정 CTA(변형 select)만. P5: FireflyPromptBuilder 라벨/값 분리·프롬프트 14px 모노. P6/P2: ThumbnailCard 1차(4변형 pick-main) 상단 강조 + 2차(디자이너 소스) Disclosure 기본접힘 + 중첩박스 제거(단일 섹션+divider)+핑크 STEP 2 배지. ★P4(공유 Card 스텝배지)·2단계(전 /studio)는 후속. |
| 트랙B 인디케이터 (6516c4b) | control-tower-engine ApplyStatus 4필드(attributesApplied/mainImageApplied/detailApplied/publishState) tri-state(LIVE 등록=라이브/DB 가역반영/none 미적용)=기존 신호 파생(신규컬럼 0·전상품). matrix row applyStatus. 관제탑 ApplyStatusIndicator(LIVE 초록/DB 뉴트럴/미적용 점선·레드 0·텍스트잘림 0). PRINCIPLES_LEARNED #54(적용현황 항상 명시)·#55(전상품 범용) 등재. ★스튜디오 헤더 미러는 후속. |
| 검증 | tsc 0·build OK(/studio 125kB)·렌더 이모지 0(Lucide)·한글 코드 0(문구 JSON)·비가역 0. 워크벤치 레드 잔존(AiQueueStepper·FireflyPromptBuilder)=0. |
| ★ 다음 | push+verify-vercel-deploy → Desktop Control Chrome 실측: (1) studio 카드 scrollWidth<=clientWidth(overflow=false)·큐 제목잘림 0·배지겹침 0 (2) 레드 사용처=메인지정 CTA 1곳 (3) 1차 강조·2차 접힘 (4) 관제탑 applyStatus 인디케이터 라이브(LIVE/DB/미적용·레드 0). 후속: P4 Card 배지·2단계 전 /studio·스튜디오 헤더 적용현황. |

### 2026-06-07 (54) 크롭 스튜디오 main 병합 + production 배포 (FROM Code, main FF merge, 비가역 0)

| 항목 | 상태 |
|---|---|
| 권위 | 대표 승인: feature/crop-studio 크롭 스튜디오 완성본(T1~T6) → main 병합 GO → production 배포. |
| 병합 | feature/crop-studio → main **fast-forward** 병합(main 1d00be8 이후 무분기) + origin/main push. 본 트랙 12 commit(T1~T6 + 권위문서 + 표준 §1 outpaint 보강 + 본 ledger)이 production에 반영. |
| 표준 §1 보강 | outpaint 적용 범위 명문화: outpaint=고해상 소스 비율 전환용. 저해상 prominence는 타이트 크롭 + 통제된 업스케일(<=1.8x) 1순위, outpaint 후순위(저해상 확장 시 제품 축소·이음새 리스크). |
| 검증 | 병합 전 tsc 0/build OK 누적 확인. push 후 verify-vercel-deploy.sh --wait → production HEAD == main 병합 SHA(이제 main 배포라 production-SHA 검사 정상). |
| ★ 다음 | Desktop production 3중 검증: (1) /products/[id]/preview 라이브 크롭 스튜디오(bbox 오버레이·완전포함 자동후보·수동 침범 스냅·confirm 차단·라인 게이트) (2) 관제탑 라인 배지/override (3) thumb-crop contain dry-run 명화 subjectBBox/contained. 통과 시 명화 라인A 대표 크롭 확정 → 발행 GO(비가역, 대표 명시 승인). |

### 2026-06-07 (53) T6 크롭 주제 완전포함 가드 (FROM Code, feature/crop-studio 11f6287, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/decisions/2026-06-07-crop-full-subject-containment.md(Desktop 기록) + 표준 §1. 트리거: 명화 대표 B 유리병 하단 잘림 운영자 지적. 본 T6로 feature/crop-studio = 크롭 스튜디오 완성본 → main 병합 GO 대기. |
| bbox 검출 | quality-classifier.detectSubjectBBox: 기존 subject occupancy의 bg-ring+SUBJECT_DELTA 재사용해 제품 bbox(source px) 산출. 256px 분석·행/열 projection noise floor(3%)로 stray 제거. subject 미검출 시 null. |
| 컨테인먼트 기하 | NEW src/lib/images/subject-containment.ts(순수·sharp 0): containmentSquare(bbox+>=8% 패딩 완전포함 최소 정사각·중앙·클램프·소스 부족 시 contained=false+expandPx) / boxClipsSubject(침범 변 산출) / snapBoxToSubject. tsx 9케이스 실증. |
| simple-crop | contain(자동=완전포함 정사각)·enforceSubject(수동 박스 침범 차단)·allowSubjectClip(연출소품 예외) 옵션 추가. SUBJECT_CLIPPED 경고: 자동 소스부족=warn+canvas_expand / 수동 침범=block(allowClip 시 warn). result에 subjectBBox/contained. thumb-crop route가 옵션 전달+노출. |
| 크롭 스튜디오 UI | onLoad 시 완전포함 자동후보+제품 bbox 로드(contain·ocr off). bbox 점선 오버레이(주황). 수동 박스 침범 시 빨강 박스+경고+"주제 완전포함으로 맞춤" 1클릭 스냅(snapBoxToSubject)+연출소품 예외 체크. preview/apply에 enforceSubject(수동 박스만)·allowSubjectClip 전달. |
| 표준 명문화 | 표준 §1 "부분 잘림 반려"에 정량 규칙(>=8% 패딩·바닥/상단 잘림 0·제품 정의·연출소품 예외·확장 우선순위 canvas_expand>업스케일<=2x>색패드) 추가. |
| 검증 | tsc 0·build OK(Compiled successfully·/preview 8.85kB·sharp 클라이언트 누출 0)·이모지 0(Lucide)·한글 코드 0·비가역 0. tsx geometry 9케이스 PASS. |
| ★ 다음 | push → Desktop: (1) /preview 크롭 스튜디오 Chrome 실측 — 명화 상세에서 제품 bbox 오버레이·완전포함 자동후보(바닥 여유)·수동 박스 침범 시 빨강+스냅 1클릭·침범 confirm 차단·연출소품 예외 (2) thumb-crop contain dry-run 명화 — subjectBBox/contained/region 단정 (3) **feature/crop-studio → main 병합 GO**(production 배포). |

### 2026-06-07 (52) 크롭 스튜디오 T1~T5 시공 (FROM Code, feature/crop-studio df9b6ac, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/design/THUMBNAIL_CROP_EDIT_STANDARD.md + HANDOFF_session_2026-06-07_5_crop_edit_workflow_apply.md + MASTER §6·§9. 대표 승인: 브랜치 feature/crop-studio·T3→T2→T1→T4→T5 순. T3는 (51)에서 완료·Desktop 25값 검증 통과(무회귀). |
| T2 게이트 완화 | simple-crop CropWarning에 severity(block/warn)+remediation 추가(SoT). SOURCE_TOO_SMALL·LOW_RESOLUTION=warn(canvas_expand 안내·적용 허용), TEXT_DETECTED=block(Naver 2024-10-28·override 불가). thumb-crop confirm 가드를 severity===block 필터로 교체 → 라인A <1000px 적용 허용·cautions 노출. 커밋 90c4f4c. |
| T1a 시드 엔드포인트 | NEW POST /api/products/[id]/asset-edit-job — 박스 좌표·params를 input_refs(jsonb) 저장, 도구=job-type-routing(region_crop→sharp ready / text_remove·canvas_expand·bg_clean→firefly|adobe_express awaiting_human). 동일타입 active job 멱등. 커밋 cf175ac. |
| T1b 크롭 스튜디오 | NEW CropStudioPanel(/preview 대표섹션 직후 마운트): 소스선택(상세/대표)+영역 드래그(자연px 매핑·1:1 정사각 가이드)+자동 후보 갤러리(thumb-crop dry-run attention/entropy)+지정영역 미리보기+대표로 적용(confirm 가역)+편집3종(글씨제거/1:1확장/배경정리→asset-edit-job). i18n cropStudio. 커밋 2ee5c3e. |
| T4a 라인 엔진 | control-tower-engine: ProductLine A/B + deriveLine(NEW/score<40/no-detail→B else A) + resolveLine(★운영자 override 우선·자동판정 미덮어씀). nextAction 라인별 crop_pick(/preview)·build_image(/swap). matrix가 quality_reasons.line/lineSource 로드→engine. publish-preview 라인 인지 게이트(text_overlay/representative_missing/detail_missing 항상 차단·라인A는 해상도/배경/단품/상세품질 caution화·라인B 엄격). tsx 9케이스(명화 ENHANCE/62→A·override 양방향). 커밋 3b6e3fc. |
| T4b 라인 override UI | NEW POST /api/products/[id]/line(quality_reasons.line+lineSource=operator·recommended_mode 미접촉·503 가드). 관제탑 LineCell 배지(A크롭/B빌드)+1클릭 토글+source 표기. track.line 라벨 "회선"→"라인" 교정. 커밋 de89715. |
| T5 전상품 | 등록상품 verify_publish→/preview 라우팅(라인게이트+크롭스튜디오+update PUT 동일 화면 수렴). 파이프라인 product-agnostic(matrix product-driven·라인 분류기 per-product). tsx 7케이스 ladder 일관. 커밋 df9b6ac. |
| 검증 | 매 commit tsc 0·이모지 0(Lucide)·한글 코드 0(주석 영어·문구 JSON). 최종 build OK(Compiled successfully). 비가역 0(네이버 0; DB는 additive CHECK·INSERT·가역 UPDATE만; 크롭 apply=가역 mainImage set). tsx 16케이스 실증(라인 분류+override+ladder). |
| ★ 다음 | push(feature/crop-studio) → Desktop 검증: (1) /preview 크롭 스튜디오 Chrome 실측(드래그 박스·자동 후보·대표 적용·편집3종 asset_jobs 시드 input_refs 좌표) (2) 관제탑 라인 배지/토글 + 명화 라인A override 후 nextAction crop_pick 확인 (3) publish-preview 라인A 명화 canPublish 게이트(텍스트만 차단·해상도 caution) (4) feature 브랜치 → main 병합/PR 결정(production 배포는 main 머지 후). |

### 2026-06-07 (51) T3 크롭/편집 job_type 4종 + 도구 라우팅 (FROM Code, feature/crop-studio bc65a7a, migration LIVE·비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/design/THUMBNAIL_CROP_EDIT_STANDARD.md §3/§5 + HANDOFF_session_2026-06-07_5_crop_edit_workflow_apply.md (T3). 대표 승인: 브랜치=feature/crop-studio 신규(SD-04 일시 예외)·진행=T3 먼저(스키마)→Desktop information_schema 검증→T1/T2/T4/T5. |
| ★ 브랜치 모드 | 본 트랙은 **feature/crop-studio**에서 진행(SD-04 main-direct 일시 예외). Vercel production은 main에서만 배포 → 본 브랜치는 **preview 빌드**(production SHA 불일치=정상, webhook 끊김 아님). T3 검증 신호=**live Supabase 제약**(이미 25값)·Desktop information_schema. |
| T3 마이그레이션 | apply_migration phase4_crop_edit_job_types 적용 완료. asset_jobs job_type CHECK **21→25** 확장: region_crop·text_remove·canvas_expand·bg_clean(additive, 기존 21종 verbatim 보존). 적용 전 live 제약 baseline(드리프트 0=phase3와 동일 확인) → 적용 후 pg_get_constraintdef로 25값 재검증. 박제 docs/handoff/MIGRATION_phase4_crop_edit_2026-06-07.sql. 커밋 bc65a7a. |
| T3 도구 라우팅 | NEW src/lib/jobs/job-type-routing.ts(순수): JOB_TYPE_ROUTES 맵 — region_crop→sharp(in-app, requiresOperator=false) / text_remove·canvas_expand·bg_clean→firefly primary + adobe_express fallback(requiresOperator=true=창작 MCP 개입점). lane=process·ipSafe=true. routeForJobType()·isCropEditJobType() 헬퍼 + job_type 토큰 상수 export(매직스트링 0). prisma schema 주석 Phase 4 갱신. 아직 런타임 라우트 미배선(T1에서 소비). |
| 검증 | tsc 0·build OK(exit 0 'Compiled successfully')·이모지 0·한글 코드 0(주석 영어·리터럴 0)·비가역 0(네이버 0; DB는 additive CHECK만, 기존 행/쿼리 무영향). |
| ★ 다음 | push(feature/crop-studio) → Desktop 2중 단정: (1) information_schema/pg_constraint로 asset_jobs_job_type_check **25값** 단정(region_crop·text_remove·canvas_expand·bg_clean 존재·기존 21종 보존) (2) 기존 asset_jobs 행 CHECK 위반 0(additive 무회귀). 통과 시 Code가 T2(게이트 완화)→T1(크롭 스튜디오)→T4(라인 라우팅)→T5(전상품) 연속 시공. |

### 2026-06-07 (50) 발행 전 검수 화면 + update 로더 SoT 추출 (FROM Code, production push 대기, 비가역 0·렌더 read-only)

| 항목 | 상태 |
|---|---|
| 권위 | docs/handoff/HANDOFF_session_2026-06-07_4_image_engine_verify_source_bug.md. Desktop 검수: 명화 대표(4종합성 캡션텍스트=텍스트정책 위반 소지+하단쏠림)·상세(detail-S6 스켈레톤=미완성) → 발행 전 검수 화면 필요. |
| 로더 SoT | NEW load-update-context.ts: loadNaverUpdateContext가 payload 조립(product+options·shipping·bundle·addresses·validation·deliveryInfo·noticeAssets·storeName). update route 로딩 1~7 → 로더 호출 교체(가드·dryRun/PUT 분기 불변, 동작 보존). 프리뷰=실 PUT 페이로드 drift 0 보장. 커밋 d68c027. |
| 검수 엔드포인트 | NEW GET /api/products/[id]/publish-preview(읽기전용·Node·maxDuration 60): 대표(빌더 mainImage) assessImageQuality+ocrFullFrame → 경고(text_overlay/low_resolution/background_not_uniform/subject_not_single) + 상세 완성도(mostly_blank<15%·low_quality<40·detail_missing) + 공유 빌더 페이로드 요약(name·태그·속성·정보고시 etc.qualityAssuranceStandard HB·origin·statusType) + canPublish=준비도 S/A AND canRegister AND imageWarnings 0. 커밋 437b40b. |
| 검수 화면 | NEW /products/[id]/preview: 대표/상세 렌더 + 체크칩(1000px/단색/텍스트0/단품) + 경고 + 페이로드 요약 + 게이트 사유 3칩. "이 상태로 발행"은 canPublish AND 등록상품일 때만 활성 → 2단계 명시 확인 → update confirm:true(비가역). publish-preview-strings.ko.json i18n. 커밋 437b40b. |
| 검증 | tsc 0·build OK(publish-preview ƒ·preview 페이지 4.5kB)·이모지 0·한글 코드 0(신규 파일; update route 기존 에러문구·★ 마커 verbatim 보존, 추가 라인 0)·비가역 0(렌더 read-only, 발행은 기존 PUT 경로 명시 확인 후). |
| ★ 다음 | push → Desktop 3중 단정: (1) update dryRun 회귀 0 재확인(로더 추출 후 명화 payloadPreview == (49) 베이스라인: name·HB·origin·statusType) (2) /products/[id]/preview 명화 — 대표 text_overlay 경고·상세 mostly_blank 경고 → canPublish=false(발행 버튼 비활성) 실측 (3) 양질 상품(달항아리?)에서 canPublish=true 시 게이트 통과 확인. 명화 대표/상세 보완(풀해상 단품·상세 빌드) 후 재검수 → 대표 GO → PUT. |

### 2026-06-07 (49) assess 대표 소스 교정 + dryRun 정보고시 노출 (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/handoff/HANDOFF_session_2026-06-07_4_image_engine_verify_source_bug.md. 작업3·4·5 검증 통과(작업4 가드 860px blocked 실증·작업5 detail-strategy 200) + 소스 버그 1건. |
| 수정1 assess 소스 | assess-quality sources.representative를 main_image_url(레거시 thumb-clean) → mainImage(빌더 representativeImage·Cloudinary)로 교정. 평가 대상이 실 발행 대표와 일치 → tier 신뢰 회복. detail은 이미 detail_image_url 정합. body.imageUrl override 우선 유지. 커밋 3d3a3a6. |
| 수정2 dryRun 정보고시 | update dryRun payloadPreview에 productInfoProvidedNotice 포함 → etc.qualityAssuranceStandard HB 신고번호(HB21-12-2572·HB19-12-1462) surfacing. confirm 경로 미변경. 커밋 37cefde. |
| 검증 | tsc 0·build OK·이모지 0(★ 마커=기존 형제 라우트 선례·미접촉)·한글 코드 0(추가 라인 기준; 기존 에러문구 미접촉)·비가역 0(dryRun·DB 가역만). |
| ★ 다음 | push → Desktop 3중 단정: (1) 명화 assess-quality 재실행 → sources.representative.url == mainImage(main-hwabo-4set) 확인·tier 재산출 (2) update dryRun → payloadPreview.productInfoProvidedNotice.etc.qualityAssuranceStandard에 HB 표시 단정 (3) HB 정확 시 대표 GO → update confirm:true PUT(비가역) → 3중 검증. |

### 2026-06-07 (48) 이미지 전략 엔진 작업3·4·5 — T0 티어 + crop→대표 + 상세전략 (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/handoff/IMAGE_SEO_STRATEGY_ENGINE_2026-06-07.md §E 3·4·5 + HANDOFF_session_2026-06-07_3_matrix_verify_cleanup.md(작업1+2 검증 통과·명화 stale job 6 cancelled→ok). |
| 작업3 T0 티어 | quality-classifier deriveImageTier(rep,detail): T0 그대로(USE_AS_IS, >=1000·단색·텍스트0·단품 isUseAsIs)·T1 상세크롭(isDetailCroppable)·T2 보강·T3 신규. 소스별(대표 vs 상세) 분기. assess-quality가 대표(main)+상세(detail) 각각 평가→quality_reasons.imageTier/imageStrategy/sources 영속. engine ComputeContext.imageTier→image.tier(null 해소). matrix가 quality_reasons.imageTier read(가드). 위젯 TierBadge 노출. 커밋 4063dc0. |
| 작업4 crop→대표 | thumb-crop confirm:true → 크롭 버퍼 product-assets 업로드 → mainImage+main_image_url set(빌더 필드). 품질가드(SOURCE_TOO_SMALL/LOW_RESOLUTION/TEXT_DETECTED) 차단(applied:false·blockReasons) — 437px upscale-blur·텍스트 대표 진입 방지. dryRun 기본 preview 유지. 커밋 25e126f. |
| 작업5 상세전략 | NEW /api/products/[id]/detail-strategy(읽기전용): 상세 품질 score>=50→AS_IS else BUILD + 미충족 네이버 기준 갭(재질·색상/SEO 필드/정보고시/errors) 산출. 갭 키=nextAction 동일 키(fill_attributes/fill_seo/fill_notice/resolve_validation/build_detail) 통일→관제탑 연동. publish-readiness+validateForRegistration 재사용. 커밋 a1d8c90. |
| 검증 | tsc 0·build OK(detail-strategy·thumb-crop·assess-quality·asset-jobs-matrix ƒ)·이모지 0·한글 코드 0(주석 영어·데이터 리터럴만)·비가역 0(네이버 0; thumb-crop confirm=DB 가역 set+Storage, detail-strategy read-only). tsx 실증 tier 4케이스(rep good→T0/weak+detail→T1/subject→T2/빈약→T3). |
| ★ 다음 | push → Desktop 3중 단정: (1) assess-quality 명화/달항아리/아이스트레이 실행 → imageTier 산출·matrix TierBadge 노출(명화=T0 4종합성 그대로 기대) (2) thumb-crop confirm 실측 — 437px 상세 화보=blocked(applied:false)·>=1000 소스=mainImage set 후 matrix image done (3) detail-strategy 갭 목록 ↔ nextAction 정합. 통과 시 명화 정보고시 HB dryRun preview 노출(별건) → 대표 GO. |

### 2026-06-07 (47) 이미지·SEO 전략 엔진 통합 — 관제탑 SoT + nextAction (작업1+2) (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/handoff/IMAGE_SEO_STRATEGY_ENGINE_2026-06-07.md §E 작업1·2. 대표 승인 범위=기반 1+2 먼저(3·4·5는 Desktop 단정 후). |
| 핵심 갭 | 관제탑 matrix가 asset_jobs 단독 → 등록/준비된 상품(명화 A/84, 잡 없음)이 risk/blocked/nextAction null. |
| 작업1 SoT 엔진 | NEW src/lib/automation/control-tower-engine.ts(순수): computeControlTowerRow가 publish track=validateForRegistration 준비도(canRegister/readinessGrade·score/attributeGrade/missingRequired)=네이버 register/update dryRun과 동일 SoT, image track=asset_jobs overlay+자산 presence(누락 시 degrade). matrix route를 asset_jobs 단독→**상품 기반**(DRAFT+등록, take 100, product_options include)으로 재작성, asset_jobs는 overlay(P2021/P2022 가드, 위젯 미blank). mode 배지 기존 가드 유지. |
| 작업2 nextAction | 결정적 사다리: !mainImage→add_main_image(blocker) / !canRegister→resolve_validation(blocker) / missingRequired(재질·색상)→fill_attributes(action·detail) / image 미완→prepare_image / 준비완→publish / 등록+cert null→verify_certification / 등록+cert→verify_publish. 각 1클릭 href(/products/[id]·/edit·/swap). |
| UI | ControlTowerMatrixWidget: 상품셀에 준비도 배지(grade/score 색상)+nextAction 링크칩(severity 색·detail). strings JSON에 nextAction 7키·publishDetail 추가(이모지 0·리터럴 0). |
| 검증 | tsc 0·build OK(asset-jobs-matrix ƒ)·이모지 0·한글 코드 0(주석 영어·데이터 리터럴만)·비가역 0(GET read-only, 엔진 순수). tsx 실증 6케이스: A 등록(no cert)→done/ok/verify_certification·grade B/62 / B +cert→verify_publish / C draft missing→pending/caution/fill_attributes detail '재질, 색상' / D no main→blocked/add_main_image / E ready→publish / F no addr→blocked/resolve_validation. |
| ★ 다음 | push → Desktop 3중 단정: (1) GET /api/products/asset-jobs-matrix — 명화 row 노출·publish done·nextAction verify_certification(또는 cert 설정 시 verify_publish)·readiness grade/score 표기 (2) Chrome 관제탑 — 준비도 배지+nextAction 1클릭 링크 (3) draft 상품 missingRequired→fill_attributes 칩 확인. 통과 시 작업3(T0 분류기)·4(crop→대표 set)·5(상세 as-is) 다음 turn. |

### 2026-06-07 (46) P3 4중컬럼 동기 + 재질/색상 필수속성 enum (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/handoff/MYEONGHWA_PUBLISH_READINESS_2026-06-07.md §1·39·40. |
| 항목1 재질/색상 enum | category-attribute-enums.{ts,ko.json}: 재질(유리/플라스틱/세라믹/우드/…/기타)·색상(투명/화이트/…/기타) 큐레이트 enum + normalizeAttributeValue(exact→synonym→substring→기타, 자유입력 0). POST /api/products/[id]/attributes(dry-run 기본·완성도 before/after·confirm 시 naver_material/color 기록·가역). getD1CategoryName export. 실증: 50003356=가구/인테리어, BEFORE missingRequired[재질·색상]C/31(핸드오프 dryRun 일치)→유리/투명 AFTER[]A/78. |
| ★ 정직(#46) | 빌더는 구조화 카테고리 속성을 Naver에 미전송 → missingRequired는 내부 완성도 게이트(naver_material/color null). 본 작업은 그 게이트 해소(enum 기록). 구조화 attributeId/valueId 실제 제출은 라이브 Naver 속성 스키마 조회(Desktop API)=별건. |
| 항목2 P3 SoT | seo-text confirm 시 seoTitle←naver_title·keywords←tags·brand_line←resolved line 동기(단일 SoT). 발행 빌더 name=naver_title/sellerTags=tags 현행 유지(미접촉), 내부 비동기만 제거. |
| 항목3 naver_certification | 대표가 에이프릴/레몬 HB 2종 확정 시 4향 신고번호 → formatSafetyDeclaration ETC surfacing(기구현, 대기). |
| 검증 | tsc 0·build OK(attributes ƒ 등록)·이모지 0·한글 코드 0(FALLBACK='기타' 데이터 리터럴만)·비가역 0(DB 가역 UPDATE만). enum/완성도 tsx 실증. |
| ★ 다음 | push → Desktop: (1) attributes dry-run(material:유리병·color:투명) → normalized 유리/투명·after missingRequired 0 재단정 (2) confirm:true 반영 → update dryRun missingRequired 0 확인 (3) seo-text confirm 시 4중컬럼 동기 확인 (4) 안전번호 2종 확정 → SUSPENSION 해제 대표 GO(비가역). |

### 2026-06-07 (45) 작업7 seo-text 재수정 (2회째 결함·#45 정직) (FROM Code, production push 대기, 비가역 0)

| 항목 | 상태 |
|---|---|
| ★ over-claim 원인 | 직전 smoke가 top-level `tags`(10)를 읽어 통과 보고했으나 Desktop은 `draft.tags`(null) 확인 — SeoTextDraft에 tags 필드 자체가 없었음(tagCandidates만). #45 적용 전 dry-run 실측 교훈 재확인. |
| 결함1 draft.tags | SeoTextDraft.tags 필드 추가 + 라우트가 verifyTags 선별(verified>weak>missing, error 제외) 결과를 draft.tags에 연결. 제한어는 풀에서 이미 제외. |
| 결함2 상품명 스터핑 | composeName에서 situational append 제거(extraTokens 파라미터 삭제). 상품명=product 자기 토큰만(형태소 dedup). situational(신차선물·운전자선물·차량인테리어)은 tags 전용. 명화 name 32자(스터핑 0·차량용 1회). |
| 결함3 scents | body.attrs.scents(정보고시 4종, 코튼어라운드 포함) 우선 + DB option_rows.values 전체 읽기. DB 옵션 3종↔정보고시 4종 동기화는 별건(대표 결정). |
| 결함4 origin | attributes.origin=DB SoT(naver_origin)만 — body 오버라이드 제거. Desktop이 originCode 0200037→00·naver_origin 중국→국산 교정(가역) 완료 → 라우트가 국산 반영. |
| 검증 | tsc 0·build OK(seo-text ƒ)·이모지 0·한글 코드 0·비가역 0. 생성기 tsx 실증: name 32자·스터핑 false·차량용 1·draft.tags 라우트 연결·origin 국산·scents 4. |
| ★ 다음 | push → Desktop dry-run 재검증: **draft.tags 10(non-null)**·상품명 스터핑 0·중복 0·origin 국산·scents(body 4). 통과 시 confirm:true 반영(가역). 안전번호 에이프릴/레몬 2종 확정 + 향 코튼어라운드 옵션 추가 = 대표 결정 → SUSPENSION 해제 PUT(비가역). |

### 2026-06-07 (44) 작업5 간편 크롭 + 작업6 BG_SWAP 연결 (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 작업5 크롭 | src/lib/images/simple-crop.ts: 상세페이지 입력→1:1 크롭(사람 box OR sharp 네이티브 strategy.attention/entropy)→1000px Sharp(srgb/jpeg q85)→OCR 정책가드. ★누끼/합성 없음(간편=상세페이지 크롭). smartcrop-sharp 미설치(sharp 네이티브로 대체·런타임 의존성 0·#38). OCR=p-filter-watermark에 ocrFullFrame 추가(공유 워커 재사용·fail-open). 경고 3종: SOURCE_TOO_SMALL(long<1000)·LOW_RESOLUTION(크롭변<1000=437 화보)·TEXT_DETECTED(2024.10.28). 라우트 POST /api/products/[id]/thumb-crop(dry-run·base64 preview·maxDuration 60). 합성 실증: 2000→1000²무경고/437→LOW_RESOLUTION/box 정확. |
| 작업6 BG_SWAP | src/lib/jobs/enqueue-mode-chain.ts enqueueModeChain(productId,mode): chainForMode 체인을 asset_jobs로 시드(멱등=기존 skip·quality_assess=done·첫 작업 ready·나머지 blocked+predecessor reason). NEW=기존 B안 swap 6단계(product_cutout..naver_normalize, mode-chains를 swap-pipeline STAGE_ORDER와 정합—express_finalize 추가)→**기존 /products/[id]/swap UI가 그대로 구동**(재사용, 미재구현). 라우트 POST /api/products/[id]/enqueue-pipeline(body.mode OR recommended_mode·P2021/P2022 가드). |
| 검증 | tsc 0·build OK(thumb-crop·enqueue-pipeline ƒ 등록)·실 emoji 0(★→NOTE 교체)·한글 코드 0(주석 영어; 가-힣 정규식 범위는 OCR Hangul 검출 기능코드)·비가역 0(네이버 0; thumb-crop=read-only, enqueue=DB 가역 INSERT). |
| ★ 다음 | push → Desktop: (1) thumb-crop 명화 detail(437x8000 화보) 실측 — LOW_RESOLUTION 경고·OCR·1000² preview (2) enqueue-pipeline 실상품 시드 검증(asset_jobs 행 생성·관제탑 반영·NEW면 /swap UI 구동). ★enqueue는 DB INSERT라 Desktop이 대상 상품 선택. MD분할(#31) 별도 commit 진행. 제조국 확정→SUSPENSION 해제는 대표 결정. |

### 2026-06-07 (43) 작업7 SEO 생성기 재수정 — 실제 태그 확장 엔진 (FROM Code, production push 대기, 비가역 0·DB 가역만)

| 항목 | 상태 |
|---|---|
| 근본원인 | 직전 생성기(turn 42)가 caller 입력 재배열만 → 빈 body 호출 시 tags[]·attributes{}·형태소 중복(Desktop 교차검증 '공허'). 라우트가 product 키워드 필드를 안 읽음 + 실제 확장 로직 부재. |
| 라우트 DB-소싱 | /seo-text가 product.keywords/targetKeywords/naver_keywords/tags/product_options(option_rows=scents)/naver_material/color/origin/naverCategoryCode 실제 read → roots/attrs 구성. body 오버라이드 우선. |
| 확장 엔진 | expandTagCandidates: roots(제한어·stopword 제거)→scents→modifier×nounRoot 복합어(product 존재 modifier 우선)→brandToken×nounRoot→synonyms→situational. RESTRICTED_SELLER_TAGS exact 필터·20자·24캡. 확장사전 src/lib/seo/tag-expansion.ko.json(데이터). |
| 검증 선별 | verifyTags(풀)→STATUS_RANK verified0/weak1/missing2/error3 정렬→error 제외 상위 10(weak 대체). 태그사전 불가 시 풀 head 10 fallback. |
| 상품명 dedup | composeName 형태소 collapse: len≥4 토큰의 선행 3자 형태소 1회만(차량용방향제 유지·차량용디퓨저 제거) + substring 제거 + 50자 캡. brand_line 순서. |
| 명화 실데이터 검증 | name 50자·차량용 1회(중복0)·풀 24·제한어 0·attributes{향4·제형 액체형/보충액·용량 15/30ml·제조국·용도} 채움·findings 0. tsc 0·build OK·이모지 0·한글 코드 0(주석 영어·확장사전 JSON). |
| ★ 다음 | push → Desktop: seo-text 명화 dry-run 재검증(태그사전 verified/weak status·최종 10·attributes 비어있지 않음·상품명 중복 0). 작업5(smartcrop 간편 크롭)·6(BG_SWAP 연결)·MD분할(#31, SESSION_LOG 1528/TASK_BRIDGE 1075+/PROGRESS 1416+) 다음 turn. |

### 2026-06-07 (42) Track B 결함2 + 안전기준ETC + 작업7 SEO 텍스트 (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | HANDOFF_session_2026-06-07_phase3_verify_track_a_findings.md. 승인 범위=결함2+안전기준+작업7(작업5·6은 다음 turn). |
| 결함1 마이그레이션 | MIGRATION_phase3_adaptive_mode_2026-06-07.sql 테이블명 "products"→"Product" 교정 + 규약 주석(Product=PascalCase 무@@map / asset_jobs·published_assets=snake @@map). Desktop은 이미 "Product"로 재적용 성공 — 파일/향후 규약 정합. |
| 결함2 quality_reasons | assess-quality 영속 하드닝: JSON.parse(JSON.stringify()) 평탄화 + read-back 자기검증(after.quality_reasons.metrics 길이 → persisted/storedReasonsCount 응답). 근본은 로컬 DB 부재로 미재현(#46 정직) — Desktop 재호출로 persisted=true 단정 신호. |
| 안전기준 ETC | product-builder.ts: LocalProduct.naver_certification(SoT) + formatSafetyDeclaration + buildProductInfoProvidedNoticeEtc가 qualityAssuranceStandard에 '안전기준 적합확인 신고번호 HB... (상품상세참조)' 병기. 값 있을 때만(일반 상품 회귀 0). ETC 전용필드 부재로 품질보증기준 병기(전용 생활화학 고시 타입 전환은 별도). 방향제 SUSPENSION 해제 선결 항목. |
| 작업7 SEO | src/lib/seo/seo-text-generator.ts(순수·한글 리터럴 0): brand_line 템플릿(SEED=실용 우선 / GREENHOUSE=감성·롱테일 우선)·dedupeTokens(부분문자열 collapse)·50자 캡·detectNameRules 재사용. POST /api/products/[id]/seo-text(dry-run 기본·verifyTags 태그사전·confirm:true 시 naver_title/tags DB 반영=가역). 명화 초안 실증: name 48자·중복(차량용) 제거·findings 0·태그 10·속성 요약. |
| 검증 | tsc 0·build OK(seo-text·assess-quality ƒ 등록)·실 emoji 0·한글 코드 0(주석 영어·데이터 리터럴만)·비가역 0(네이버 0, DB 가역 UPDATE만)·생성기/안전 ETC tsx 실증(가짜 라벨 0 #46). |
| ★ 다음 | push hash → Desktop: (1) assess-quality 재호출 persisted=true + DB quality_reasons.metrics 6건 단정 (2) seo-text dry-run 명화 검수(태그사전 status) (3) ★제조국 확정→originCode 교정(가역)→naver_certification HB 입력→update dryRun(statusType SALE·회귀0)→대표 승인 SUSPENSION 해제(비가역). 작업5(간편 크롭, smartcrop-sharp)·6(BG_SWAP)·MD분할(#31) 다음 turn. |

### 2026-06-07 (41) 적응형 3모드 시스템 앱 내장 (Track B) — 작업 1~4 (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/research/KKOTIUM_ADAPTIVE_SEO_IMAGE_SYSTEM_2026-06-06.md §1/§5 + HANDOFF_session_2026-06-06_3_simple_mode_correction(간편=상세페이지 크롭). 승인 범위=작업 1~4(비용0 최速 ROI). |
| 작업1 스키마 | Product에 brand_line(SEED|GREENHOUSE)·quality_score(Int 0-100)·recommended_mode(SIMPLE|ENHANCE|NEW)·quality_reasons(Json) 추가. 인덱스 컬럼만·Prisma 관계 0(BackdropJob 선례)·DB CHECK. prisma generate 완료. 마이그레이션 박제 docs/handoff/MIGRATION_phase3_adaptive_mode_2026-06-07.sql(Phase1/2 이후 incremental ALTER + products CHECK). |
| 작업2 분류기 | src/lib/images/quality-classifier.ts 정량 1차(sharp). 6지표: 해상도20·선명도(라플라시안분산)20·피사체비중20·배경단색도15·텍스트밴드휴리스틱15·1:1적합10 → 0~100 + recommendedMode + needsVlm(40~70). 임계값 export(운영 보정). VLM 2차 assessWithVlm=시그니처만(null 반환). 합성 3샘플 판별 실증: 깨끗한고해상=75(SIMPLE)/저해상흐림=31(NEW)/작은피사체=54(ENHANCE·needsVlm). |
| 작업3 관제탑 | matrix API에 mode 필드(recommended/score/source) 별도 쿼리 + 컬럼부재 P2021/P2022 가드(#50). ControlTowerMatrixWidget 모드 컬럼+ModeCell(배지 간편/보강/신규+점수+AI추천/직접지정 + 드롭다운 1클릭 변경). POST /api/products/[id]/mode(오버라이드, quality_reasons.modeSource=operator). POST /api/products/[id]/assess-quality(저장이미지 fetch→분류기→컬럼 기록, node runtime). 한글 strings JSON(이모지 0·리터럴 0). |
| 작업4 job_type | 마이그레이션 CHECK에 quality_assess/thumb_crop/seo_text/seo_image/bg_swap 추가(기존 16종과 공존, 소문자 컨벤션). src/lib/jobs/mode-chains.ts 모드별 체인: SIMPLE=[assess,crop,seo_text] / ENHANCE=[assess,crop,seo_image,seo_text] / NEW=[assess,B안6단계,seo_image,seo_text]. 순수 데이터+chainForMode 빌더(DB 미접촉). schema 주석 갱신. |
| 검증 | tsc 0·build OK(/api/products/[id]/assess-quality·/mode·asset-jobs-matrix ƒ 등록)·실 emoji 0(→ 화살표만)·한글 코드 0(주석 영어·문구 JSON)·비가역 0(네이버 0, DB 신규 컬럼/CHECK만)·분류기 수치 실증(가짜 라벨 0 #46). |
| ★ 다음 | push hash → Desktop: (1) Supabase apply_migration 순서 Phase1→Phase2→**Phase3**(MIGRATION_phase3_adaptive_mode) drift 0 (2) Chrome 관제탑 모드 배지·1클릭 변경 실측 (3) assess-quality 실상품 이미지로 점수/추천모드 검증(모드 추천 수용률 ≥70% 목표). 작업 5~7(간편=상세페이지 크롭 도구·BG_SWAP 재사용·SEO 텍스트 일괄)은 다음 turn. SESSION_LOG.md 1528줄>1500 → #31 분할 대기(별도 commit). `* 2.*` 중복본 정리 대표 결정 대기(#34). |

### 2026-06-06 (40) Phase 2 제품교체(B안) 루프 앱 내장 — 스키마 확장 + 상태머신 + 워크플로우 UI + Sharp 규격화 (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | KKOTIUM_PRODUCT_SWAP_LOOP_DESIGN_2026-06-06.md §1/§6/§7/§8 + HANDOFF_phase2_product_swap_app. B안=실제 누끼 고정+배경만 AI. |
| 작업1 스키마 | AssetJob에 concept_combo_id + AssetReference(조인) 추가. job_type 6종(product_cutout/mood_bg_generate/product_composite/harmonize/express_finalize/naver_normalize) + status 4종(awaiting_human/human_done/review/rejected)은 DB CHECK 확장. 마이그레이션 박제 docs/handoff/MIGRATION_phase2_product_swap_2026-06-06.sql(Phase1 이후 incremental ALTER). 커밋 d059acd. |
| 작업2 상태머신 | asset-job-state.ts 전이표 확장: in_progress→awaiting_human→human_done→in_progress, in_progress→review→done|rejected, rejected→ready(사람 재시도). 낙관적잠금/전이로그 패턴 계승. d059acd. |
| 작업3 워크플로우 | /api/products/[id]/swap-pipeline(읽기 6단계+쓰기 전이, DB만·P2021 가드) + /products/[id]/swap UI(컨셉카드+단계 타임라인+awaiting_human CTA·Firefly/Express 딥링크·체크리스트+before/after 슬라이더·승인/거부). SWR 8초 폴링. 커밋 e0090b3. |
| 작업4 관제탑 | 매트릭스에 awaiting_human(attention) 추가 → 막힘 다음 핀. human_done/review→in_progress, rejected→pending. 커밋 f4ae170. |
| 작업5 Sharp | src/lib/images/naver-normalize.ts: 대표(1:1 1300px 흰배경 q80) / 상세(860px 분할). ★ 대표 흰배경 가드(assetKind + 4모서리 luma/chroma) — 라이프스타일 합성컷 대표 라우팅 차단. 커밋 870fd19. |
| 작업6 docs | 5종 MD + 작업원칙 #51(B안)/#52(브라우저 반자동)/#53(도구 적재적소) 신설. |
| 검증 | tsc 0·build OK(swap 라우트 ƒ 등록)·이모지 0·한글 리터럴 0·비가역 0(네이버 0, DB만)·대표 흰배경 가드 동작. |
| ★ 다음 | push hash → Desktop: (1) Supabase apply_migration(Phase1 먼저 + MIGRATION_phase2) drift 0 (2) Chrome swap UI 실측(타임라인·awaiting_human CTA·전후슬라이더) (3) 명화 B안 end-to-end(고해상 누끼 확보→Firefly 배경→합성→검수). 명화 SUSPENSION 대표 의도(결함 아님). |


### 2026-06-06 (39) Phase 1 누락 방지 골격 — asset_jobs 상태머신 + 관제탑 매트릭스 (FROM Code, production push 대기, 비가역 0·네이버 미접촉)

| 항목 | 상태 |
|---|---|
| 권위 | docs/research/KKOTIUM_HYBRID_PIPELINE_SYSTEM_DESIGN_2026-06-06.md §4/§7 + HANDOFF_phase1_asset_jobs_tracking_2026-06-06.md. |
| 작업1 스키마 | AssetJob/AssetJobTransition/PublishedAsset 3종(prisma/schema.prisma). BackdropJob 선례: cuid id·product_id 인덱스컬럼(Prisma 관계 0 → Product 미접촉)·String enum은 DB CHECK. version 낙관적잠금·ip_safe·heartbeat. prisma generate 완료. 커밋 a55976b. |
| 마이그레이션 | docs/handoff/MIGRATION_phase1_asset_jobs_2026-06-06.sql 박제(Prisma 패리티 DDL + CHECK). ★ Desktop이 Supabase apply_migration(name: phase1_asset_jobs_tracking) 선행 필요. prisma/migrations는 gitignore. |
| 작업2 상태머신 | src/lib/jobs/asset-job-state.ts: transitionJob(허용전이 가드+version 낙관적잠금+전이 자동로그, failed→ready retry 가드) / claimNextJob(FOR UPDATE SKIP LOCKED) / detectZombies(heartbeat 10분). 순수 DB·네이버 미접촉. |
| 작업3 관제탑 | /api/products/asset-jobs-matrix(읽기전용·집계) + ControlTowerMatrixWidget(상품x트랙: 이미지/발행/회선/운영정합, 막힘행 핀·WIP 카운터·누락감지 칩). ★ P2021 가드로 마이그레이션 전 push 안전(migrationPending degrade, #50). 한글은 strings JSON matrix 섹션(이모지 0·리터럴 0). 대시보드 마운트. 커밋 e9a6c95. |
| 작업4 docs | 5종 추적 MD + PROGRESS 세션핸드오프 섹션 표준화(§7-c 에피소드). 작업원칙 #50 등재(migrationPending 역순배포 가드). |
| 검증 | tsc 0·build OK·이모지 0·한글 리터럴 0(주석 영어/문구 JSON)·비가역 0(네이버 0, 신규 테이블만). |
| ★ 다음 | (A) push hash 보고 → Desktop Supabase apply_migration + Chrome 관제탑 실측(막힘핀·WIP·누락칩) (B) Phase 2(ip_safe 발행 게이트 + 2단계 발행) (C) 명화 SUSPENSION 의도적(결함 아님) — 시스템 오인 금지. |


### 2026-06-06 (38) GET-merge updateStock 배포 + inspect statusType 거짓초록 교정 + sync/cron 엔드포인트 오용 교정 (FROM Code, production e3ab753, 실 PUT/OOS 0)

| 항목 | 상태 |
|---|---|
| 게이트 해제 | 직전 inspect 실측(13564133057=originProductNo·shape 호환 VALID)으로 GET-merge 배포 게이트 해제됨. |
| 작업1 GET-merge 배포 | api-client.ts GET-merge(updateStock/setProductOutOfStock/bulkUpdateStock 전부 getProduct→stockQuantity override→전체 PUT) + CLAUDE.md §3-7 커밋 5f68d47. 실 PUT/OOS 0(코드만, mark-oos alsoNaver는 best-effort catch라 안전). |
| 작업2 statusType 거짓초록 | inspect 인라인 drift가 name·salePrice만 비교 → SUSPENSION을 inSync:true 오판. App status→네이버 statusType 매핑(ACTIVE→SALE 등) 추가 후 statusType drift 포함. 커밋 c6d00de. ★ diffNaverProduct는 이미 statusType 비교 보유 — 실제 누락은 inspect 인라인이었음(#46 정직). production 실증: 명화 drift inSync:false·diffs=[statusType naver:SUSPENSION app:SALE]. |
| 작업3 엔드포인트 오용 | sync/route.ts:40 + cron/daily:87이 origin 번호에 channel-products(404 위험) → 양쪽 `/v2/products/origin-products/{id}`로 교정(statusType/stock을 originProduct에서 read). cron 자동중지(LIVE PUT)는 NAVER_AUTOSUSPEND_ENABLED env 게이트(기본 off)로 감싸 read 교정이 mutate 재활성 안 하도록 — off면 wouldSuspend 후보만 노출(비가역 0), on이면 §3-7 v2 PUT. 커밋 e3ab753. |
| 검증 | tsc 0·build OK·이모지 0·실 PUT/OOS 0·가짜 라벨 0(#46). push e6ffc5f→e3ab753. verify 180s timeout이나 gh api로 production e3ab753 state=success 확인(슬로우 빌드, #36 webhook 정상). 명화 DB-mode inspect 실증 GREEN. |
| ★ 부수 확정 | 명화 statusType=SUSPENSION(판매중지)·앱 ACTIVE = 실 drift 확정 → SUSPENSION 해제 트랙 필요(대표 결정). |
| ★ 다음 | (A) Desktop GET-merge dryRun 교차검증 (B) 명화 SUSPENSION→SALE 해제(updateStock GET-merge 또는 update confirm, 비가역, 대표 승인) (C) 명화 이미지 반영 트랙 (D) NAVER_AUTOSUSPEND_ENABLED 활성 여부 대표 결정 (E) `* 2.*` 중복본 정리(#34). |


### 2026-06-06 (37) 읽기전용 inspect 라우트 신설 + 명화 번호종류 실측 확정 — 13564133057=originProductNo (FROM Code, production cb15dfb, 비가역 0·GET only)

| 항목 | 상태 |
|---|---|
| 배경 | Desktop 검증서: GET-merge updateStock 배포 전 미확정 2건 — (1)naverProductId가 origin/channel 번호 불명(채널 정황) (2)GET origin-products가 PUT body 호환 shape인지. |
| 작업1 inspect 라우트 | `GET /api/naver/products/[productId]/inspect` 신설(읽기전용·mutate 0). origin-products + channel-products 양 probe→200/404 캡처, numberKind 분류, resolvedOriginProductNo 역추적, putTargetWarning, originProductRaw 반환, drift 인라인 계산. `?probe=<no>`로 DB 없이 raw 번호 검증. naverRequest/NaverApiError(HEAD)만 import → 단독 배포 가능(GET-merge 미동반). 커밋 cb15dfb·verify exit 0. |
| ★ 실측 (production probe 13564133057) | **numberKind=ORIGIN**: origin-products GET 200·channel-products GET 404 → 13564133057=**originProductNo**. storedIsCorrectPutTarget=true. Desktop '채널번호 정황' 가설 **반증**. PUT /origin-products/13564133057 정타. |
| ★ shape 호환 | originProduct top-keys: name·salePrice·stockQuantity(2997)·statusType·leafCategoryId·images·detailContent·detailAttribute·deliveryInfo·customerBenefit·saleType = PUT body 동일 → **GET-merge 전제 VALID**. |
| 작업2 번호 정합 가드 | 실측=ORIGIN → 번호 교정 불필요(스킵). register priority(productNo??originProductNo) 결과적으로 origin 저장 정합. 미래 상품 견고성은 후속(추측 교정 금지 #46). |
| 부수 발견 | (a) 명화 statusType=SUSPENSION(판매중지)·앱 ACTIVE = drift. (b) 기존 sync/route.ts:40·cron/daily:87이 origin 번호에 channel-products 엔드포인트 사용 → 404 가능(API_ERROR 경로). 별도 점검 대상. |
| 검증 | tsc 0·build OK·이모지 0·비가역 0(GET only)·가짜 라벨 0(#46). |
| ★ 다음 | (A) 정합 확정됨 → **GET-merge api-client.ts 배포 승인 요청**(현 uncommitted, mark-oos 라이브경로 안전화) (B) 명화 SUSPENSION→SALE 여부 대표 확인 (C) sync/cron channel-products 오용 점검 (D) 명화 이미지 반영(update confirm:true, 비가역). |


### 2026-06-06 (36) updateStock 부분 PUT 위험 안전화 — GET-merge 전체 페이로드 교체 + T2.5 트랙 신설 (FROM Code, production <PENDING push>, 비가역 0·실 PUT 0)

| 항목 | 상태 |
|---|---|
| 결함 | `api-client.ts updateStock`이 `{originProduct:{stockQuantity}}` 부분 PUT 사용. 네이버 v2 PUT=FULL REPLACE(#1650)이므로 재고만 보내면 상품명/가격/이미지/옵션/원산지/상세 전소실 위험. setProductOutOfStock·bulkUpdateStock도 동일 의존. |
| 작업1 호출처 전수조사 | 라이브 호출처 1개: `src/app/api/alerts/[id]/mark-oos/route.ts:95` setProductOutOfStock (UI 품절버튼 + `alsoNaver=true`, 기본 false). → 라이브(긴급). bulkUpdateStock=미사용. 폴러(dome-inventory-poller updateStockProfile)=무관 로컬 DB함수(api-client 미import). |
| 작업2 안전화 | updateStock을 **GET-merge**로 교체: `getProduct`로 현재 전체 originProduct read→stockQuantity만 override→전체 PUT. 이미지 재업로드 0·DB의존 0·네이버 측 변경분 보존. `{dryRun:true}` 옵션(GET-merge 미리보기, PUT 미실행). productNo 없으면 throw, bulkUpdateStock은 skip 버킷. setProductOutOfStock/bulkUpdateStock 동일 경로 통일. |
| 작업3 T2.5 | `diffNaverProduct(productNo, appExpected)` 읽기전용 diff 헬퍼 추가(name/price/stock/status/repImg). 마스터 플랜에 T2.5 "네이버 양방향 동기화 정합성" 트랙 신설. CLAUDE.md §3-7 "재고 수정도 전체 페이로드 교체 필수" 등재. |
| 검증 | 오프라인 merge 증명(구PUT 8필드 소실 vs 신merge 9필드 보존+stock 50→0). TSC 0/build OK. 이모지 0(★ 주석 마커, 형제 라우트 선례). 가짜 라벨 0(#46). 실 PUT 0(대표 승인 전 비가역 금지). |
| 의심 파일(#34) | working tree에 macOS 중복본 다수 untracked(`* 2.ts`/`* 2.md`/`* 2.json`, docs/handoff·research 신규 MD). 본 turn 미접촉·미커밋. 대표 결정 위임. |
| ★ 다음 | (A) Desktop 교차검증(updateStock GET-merge 로직 + diffNaverProduct) (B) mark-oos alsoNaver 실경로는 이제 안전(실패해도 best-effort catch) — 대표 승인 시 실 OOS 1건 검증 (C) 명화 이미지 반영 트랙(update confirm:true, 비가역) 재개 (D) `* 2.*` 중복 파일 정리 결정. |


### 2026-06-05 (35) 네이버 상품 수정 라우트 신설(PUT origin-products) + update dryRun 검증 (FROM Code, production 70b4edc, 비가역 0)

| 항목 | 상태 |
|---|---|
| 작업1 수정 라우트 | src/app/api/naver/products/update/route.ts. PUT /v2/products/origin-products/{no}. 전체 페이로드 교체(공식 #1650). buildNaverProductPayload 재사용. 실 PUT은 confirm===true만(기본 dryRun-safe). 이미지 shop-phinf 선행. naverProductId 없으면 409. |
| 작업2 대표이미지 점검 | mainImage=Cloudinary 공급사 원본(빌더가 읽는 값). main_image_url=Supabase 썸네일(빌더 미독). → 교정 반영하려면 mainImage 승격 선결. 본 turn 점검만(mutate 0). |
| 작업3 dryRun | mode UPDATE·canRegister true·originAreaCode 0200037·sellerTags 제한어 0·옵션 3 distinct·PUT 0. representativeImage 아직 공급사 원본(mainImage 미승격 실증). |
| 가짜 라벨 | 0(#46). dryRun GREEN ≠ 이미지 반영 완료. 비가역 0(confirm 미전달). TSC 0/build OK. |
| ★ 다음 | (A) Desktop update dryRun 교차검증 (B) 명화 mainImage 승격(clean 썸네일 재생성→저장→셋, 가역) (C) 대표 승인→update confirm:true 실 PUT(비가역)→3중 검증 (D) updateStock 부분 PUT 위험 별도 점검. |


---

> §3의 더 오래된 hand-off(2026-06-05 (34) ~ 2026-05-26 (9))는 `docs/plan/archive/TASK_BRIDGE_2026-06-early.md`로 이관(2026-06-07 #31 분할). 검색용으로만 참조.

---

## §4 STANDING DECISIONS (사용자가 영구 위임한 결정 — 변경 금지 사항)

| ID | 결정 | 근거 / 날짜 |
|---|---|---|
| SD-01 | Studio (/studio) footer 아랍어 텍스트 **영구 보존** — paper-cut 인벤토리 영구 제외, 수정/삭제/조사/문서화/source 추적 금지 | 사용자 의도적 개인 감사 메시지, 2026-05-18 |
| SD-02 | bornscent supplier DB INSERT 완료 (id `cm62770f54a42a46a4ae4c53d`, code `DMM-BRNSC`) — P2 자동 매칭 OK | Desktop이 Supabase MCP 직접 INSERT, 2026-05-18 |
| SD-03 | AI fallback chain = Groq (primary, 2 working keys) → Anthropic Sonnet (last-resort). Gemini API는 키 커밋 노출 사고로 revoke 상태 — 키 보안 해결 시 재사용 가능(모델 금지 아님). Firefly 웹 UI의 모델 선택(Gemini/Nano Banana/FLUX 등)은 키와 무관, 전 모델 자유 사용. Perplexity + xAI DEPRECATED. (2026-06-01 정정) | PROGRESS.md 2026-05-15 v3.1 FINAL + 2026-06-01 Desktop 정정 |
| SD-04 | main 직접 push (1인 개발, 브랜치 없음) | 작업원칙 #4 |
| SD-05 | Vercel production = source of truth (dev 가정 production 아키텍처 금지) | 작업원칙 #28 |
| SD-06 | 사용자 닉네임 답변 본문 직접 입력 금지 (사용자 메시지 인용 / 코드 변수 / write_file MD만 허용) | 작업원칙 #29 e++ |
| SD-07 | 자동화 *모니터링* UI는 *대시보드 Section 5 카드*가 primary 진입점 — `/admin/automation`은 관리자 전용 fallback. registry는 *실 가동 작업만* 등재 (미구현 작업 사전 라벨 금지) | 사용자 Q1·Q2 결정 2026-05-19 |
| SD-08 | 꼬띠 = 튤립 마스코트(다람쥐 아님), 공식 안내자. 닥스훈트 배송·좀비소(좀비 보관소) = 컨셉 후보 미실현(라우트 미생성, i18n 주석만). 정원 그린 보조색 공식 추가. 2-Zone(감성=대시보드 풀 / 작업=SEO·아틀리에 절제, 무채색화 금지). | 2026-06-01 Desktop GARDEN_CONCEPT_ANALYSIS 정합 |

---

## §5 OPEN PAPER-CUTS (Sprint 7-PC 22-PC 인벤토리)

### 진행 완료 (11건)

| ID | 영역 | Commit | 상태 |
|---|---|---|---|
| P1 | 카테고리 prefill autofill | `742ce91` (PC-A hotfix) | ✅ silent fail 사라짐 — 디퓨저는 P13-D scope에서 d3 정확도 완성 |
| P2 | 공급사 매핑 (bornscent) | 비-commit (Supabase INSERT) | ✅ 70% 해소, 자동 매칭 작동 |
| P14 | 옵션 14종 silent truncation | `5a3b8c2` (PC-B-1 defensive) | ✅ 회귀 0 확정 — 14종 모두 input.value로 정상 렌더링 |
| P15 | 옵션 그룹명 매핑 | `29b7c49` (PC-B-2) | ✅ 디퓨저 → '향' 자동 적용 |
| P18 | dome_code passthrough infra | `5a3b8c2` (PC-B-1) + `5fa8560` (seed) | ✅ infra + seed 완료 — cache hit 활성화 |
| P13-A | seo-workflow Groq migration | `2276ed7` (PC-C) | ✅ 완료 (PC-C) |
| P13-B | description + perplexity Groq migration | `2276ed7` (PC-C) | ✅ 완료 (PC-C) |
| P13-C | keywords Groq migration | `2276ed7` (PC-C) | ✅ 완료 (PC-C) |
| P13-E | aeo-generate Groq migration | `2276ed7` (PC-C) | ✅ 완료 (PC-C) |
| P23 | AI chain memory 정합 위반 (시스템 정합성 CRITICAL) | `2276ed7` (PC-C) | ✅ 완료 — Groq primary chain 코드 적용 |
| P13-D | category/suggest Groq migration → **P30로 분리** | PC-D 권고 | → P30 분리 (잔존 사용처) |

### 진행 중 / 대기

| ID | 영역 | 권고 sprint |
|---|---|---|
| **G7-SKU** | 빈 SKU unique 충돌 -> SKU 미입력 상품 2번째부터 저장 500 (P0) | `1aa5969` Fix A 자동발급 엔진 + Fix C payload 확장 + Fix B backfill ✅ **[CLOSED 2026-05-28 Desktop]** (probe 자동 SKU 확인) |
| **G7-userId** | **userId="default" FK 위반 -> DRAFT 저장 500 (P0)** | **17143f0 [CLOSED 2026-05-28] — Desktop POST 200 재검증 통과** |
| P17 | supplier-notfound 시 배송 fallback | `29b7c49` (PC-B-2, infra 완료) — notfound 케이스 prefill URL로 실 검증 대기 |
| P19 | 혜택 prefill | PC-B-3 (P16 결정 후) |
| P16 | additionalImages 0건 (crawler 측) | PC-B-3 또는 PC-D 분리 (사용자 결정) |
| P20 | 기존 supplier 2건 (이현마켓, gseller2022) `domeggook_seller_id` NULL backfill | 사용자가 도매꾹 마이페이지에서 실제 seller ID 확인 후 Desktop이 Supabase MCP UPDATE |
| P21 | crawler catD2 정규화 — 도매꾹 실제 "인테리어소품" → prefill "홈인테리어소품" 오염 (MEDIUM) | PC-D |
| P22 | crawler productNo 만료 갱신 — 도매꾹이 새 ID로 재등재 시 우리 DB stale 404 (LOW-MEDIUM) | PC-D 또는 Sprint 6-A 회귀 |
| **P24** | **Groq 모델 한국어 정합 (8b→70b hotfix)** — `2276ed7` smoke 후 productNames degenerate 발견 | **본 commit (PC-C-hotfix)** |
| P25 | lib/trend-analyzer.ts Perplexity 잔존 | PC-D |
| P26 | lib/utils/env-checker.ts Perplexity 잔존 | PC-D |
| P27 | /api/naver-seo/ai-generate Perplexity 잔존 | PC-D |
| P28 | /api/kkotti-comment Perplexity 잔존 | PC-D |
| P29 | /api/aeo-generate Gemini 잔존 | PC-D |
| P30 | /api/category/suggest Gemini 잔존 (구 P13-D scope) | PC-D |
| P31 | lib/review-sentiment-analyzer Gemini 잔존 | PC-D |
| P32 | lib/upload-readiness-filler Gemini 잔존 | PC-D |
| **P33** | **lib/gemini.ts.bak 보안 위반 (백업파일 노출) — 17개 일괄 처리** | **`f9119a0` (PC-C-hotfix) ✅ 완료** |
| P34 | Gemini 재진입 시점 (예약) | Sprint 8 (월 매출 100만+) |
| **P35** | **provider 응답 문자열 stale (route.ts hardcoded 8b)** — GROQ_MODEL 상수 참조로 fix | **`0b941a6` (PC-C-archive) ✅ 완료** |
| **P36** | **.backup 패턴 60건 git 추적 + .gitignore 누락** (작업원칙 #43 메타-단정 사례) | **`0b941a6` (PC-C-archive) ✅ 완료** |
| **P25** | **lib/trend-analyzer.ts Perplexity dead code 삭제** | **본 commit (PC-D) ✅ 완료** |
| **P26** | **lib/utils/env-checker.ts PERPLEXITY 검사 → GROQ/ANTHROPIC** | **본 commit (PC-D) ✅ 완료** |
| **P27** | **/api/naver-seo/ai-generate Perplexity + xAI + Gemini 삭제** | **본 commit (PC-D) ✅ 완료** |
| **P28** | **/api/kkotti-comment Perplexity + Gemini 삭제, Groq primary** | **본 commit (PC-D) ✅ 완료** |
| **P29** | **/api/products/[id]/aeo-generate Gemini → Groq** | **본 commit (PC-D) ✅ 완료** |
| **P30** | **/api/category/suggest Gemini → Groq** | **본 commit (PC-D) ✅ 완료** |
| P31 | lib/review-sentiment-analyzer.ts — 단정 결과: 이미 Groq primary (헤더 정합 갱신만 권고) | scope 외 (이미 정합) |
| P32 | lib/upload-readiness-filler.ts — 단정 결과: 이미 Groq primary (헤더 정합 갱신만 권고) | scope 외 (이미 정합) |
| #3 | handleNaverDirect silent fail (2026-05-17 발견) | `742ce91` (PC-A) ✅ 해소 단정 — 사용자 첫 실 상품 등록 시 검증 의무 |
| **P37** | **자동화 관제 가짜 라벨 (17/26 미가동 작업)** — Sprint 8-IA Phase 1로 해소 | **Phase 1 ✅ 해소 예정** |
| **P38** | **상세페이지 빌더 ↔ 27 dedicated renderer 충돌** — Phase 2 흡수 결정 | Sprint 8-IA Phase 2 |
| **P39** | **lifestyle-picker 연결 가시화 부재** — picker 작동이 사용자 화면에서 안 보임 | Sprint 8-IA Phase 2 |
| **P40** | **시각적 통일성 부재** — 라이프 자산 페이지 ↔ 온실 아틀리에 ↔ PLANT 디자인 토큰 불일치 | Sprint 8-IA Phase 2 |
| **B-1** | **온실 아틀리에 클릭 무반응** — Phase 3-C-1 6 컴포넌트 `'use client'` 누락 | 본 commit ✅ 완료 (Desktop 재검증 대기) |
| **B-2** | **runThumbnail 빈 outputs 침묵 실패** (#46 위반 소지) | 본 commit ✅ 완료 |
| **B-3** | **달항아리 도어벨 데이터 보정** | ✅ [CLOSED 2026-06-02] 카테고리 50000963 교정 완료. 마진 27200/20900(23%). 단 마진 얕아 발행 전 가격 재검토 권고(첫 발행은 명화 50.7% 우선) |

---

## §6 PENDING USER ACTIONS (사용자 직접 작업 대기)

| 항목 | 내용 | 트리거 |
|---|---|---|
| P20 supplier seller ID 확인 | 도매꾹 마이페이지에서 이현마켓 / gseller2022 실제 seller ID 확인 | 사용자 시간 |
| P16 scope 결정 | additionalImages crawler 수정을 PC-B-3 포함 or PC-D 분리 | 사용자 판단 |
| 첫 실 상품 NAVER 등록 | dome_code seed 완료 ✅ → 디퓨저 prefill → autoRunVisual end-to-end 검증 | Desktop Chrome 검증 통과 직후 |
| P21·P22 fix scope 결정 | crawler 정규화 + productNo 만료 갱신 fix 진입 시점 결정 | 사용자 판단 |

---

## §7 ARCHIVED HAND-OFFS (완료된 hand-off 누적)

> 30개 도달 시 `docs/plan/archive/TASK_BRIDGE_YYYY-MM.md` 분할.

### 2026-05-28 (G8-ENGINE 실증)

- ✅ G8-ENGINE 디자인 라인 실증 (Desktop turn, 코드 0) ← 확정 동선 6단계 실 MCP 호출 전수 통과
  - 1.도매꾹 Referer 다운로드 760x760 200 / 2.Adobe CC 청크업로드 init+PUT+finalize 200 -> presignedAssetUrl
  - 3.image_remove_background 투명 누끼 성공(투명체 경계+손 보존, rembg 우위) / 4.asset_search GenAIAsset 경로정상(자산 0건)
  - 5/6.Pillow+Noto CJK 4변형(clean/price/badge/lifestyle) 차별화 육안증명 -> '4변형 거의 동일' 결함 해소
  - 아키텍처 확정: Adobe Express MCP 외부 누끼 합성 불가->서버 Sharp 유지 / image_remove_background는 CC presignedAssetUrl만
  - 실측 정정: /mnt/user-data/uploads 읽기전용->/home/claude 스크래치
  - 비가역 0(Supabase 미저장, 네이버 미발행). 핸드오프 HANDOFF_g8_engine_design_line_proven_2026-05-28.md
  - 다음: Code Phase G8-ENGINE(asset-source-resolver + thumbnail-generator 리팩터 + B 수동 오버라이드 UI)

### 2026-05-19

- ✅ PC-A 742ce91 (3-fix 통과) ← Desktop 검증
- ✅ PC-B-1 5a3b8c2 (P18 passthrough + P14 defensive) ← Desktop 검증
- ✅ PC-B-2 29b7c49 (P15 옵션 그룹명 + P17 배송 fallback) ← Desktop 검증
- ✅ dome_code seed 5fa8560 (디퓨저 dome_code INSERT + P21·P22 등재) ← Desktop 검증
- ✅ Sprint 7-PC-C 전면 종료 `2276ed7` ← Desktop 5-source 검증 통과
  (Groq migration 5 endpoint, +240/-305 LOC, build OK + Vercel READY)
- ✅ Sprint 7-PC-C-hotfix `f9119a0` ← Desktop 5-source 검증 통과
  (70b 교체 + 17 .bak rm + #42~#45 명문화 + paper-cut 11건, 22 files
  +154/-3625 LOC, Vercel READY)
  - Verification: HTTP 200 / 2.14s / productNames 다양성 3/3 unique
  - 한국어 정합 100% / P24 결함 완전 해소
  - 추가 단정: provider 문자열 stale → P35 후속 fix
  - 추가 단정: .backup 60건 잔존 → P36 후속 fix (메타-단정 사례)
- ✅ Sprint 7-PC-C-archive `0b941a6` ← Desktop 3-source 검증 통과
  (P35 GROQ_MODEL 상수 export + P36 60 .backup rm + .gitignore +6 patterns
  + #43 메타-단정 강화, 65 files +52/-18741 LOC, Vercel READY)
  - Production smoke: provider="groq-llama-3.3-70b-versatile" 정합 확정
  - productNames/hooks 3/3 unique, 한국어 자연어 100%
  - 누적 정리: .bak 17 + .backup 60 = 77 보안 위반 파일 해제
- ✅ Sprint 8-IA 진입 결정 (Desktop turn) ← 자동화 관제 진단 + IA 재설계 단정
  - Chrome MCP로 /automation + /studio + /settings/lifestyle-assets + /products/new 4 화면 시각 점검
  - 17/26 가짜 라벨 발견 + 빌더↔renderer 충돌 + lifestyle 연결 부재 진단
  - 사용자 Q1·Q2·Q3 권장안 모두 승인 → 새 채팅 2개 분할 결정
  - md 6건 paste-ready 분할 작성 (Turn 1 + Turn 2)

### 2026-05-27 PM (B-13a)

- 🟡 IN-VERIFY: B-13a PLANT 페이지 상단 헤더 중복 등록 버튼 제거 (Code turn, 본 commit) ← Desktop 7탭 순회 재검증 대기
  - page.tsx line 1792-1805 14줄 `<div>` 블록 삭제 (handleNaverDirect 버튼 + handleGenerate 버튼 헤더 인스턴스)
  - 핸들러 카운트: handleNaverDirect 3->2, handleGenerate 4->3 (line 817 비-functional 주석 포함)
  - functional call site: 양쪽 visual 탭 1곳만 잔존
  - Desktop Chrome MCP 실측 evidence: pre-state totalRegisterButtons=2 (HEADER zone top=115px)
  - TSC 0 + build OK (/products/new 64.2 -> 63.9 kB)
  - 핸드오프 HANDOFF_plant_header_duplicate_buttons_2026-05-27.md 본 commit으로 [CLOSED]
  - 5-19 진단의 cascade miss 사례 — 하단 블록만 식별하고 헤더 dup 누락. b6ce4bb 재검증으로 발견

### 2026-05-27 PM (B-13)

- 🟡 IN-VERIFY: B-13 PLANT 비주얼탭 액션블록 스코프 정합 (Code turn, 본 commit) ← Desktop 6탭 미노출 + visual 탭 노출 재검증 대기
  - page.tsx 2 edit: visual 탭 종료 `</>)}` 위치를 line 3401 -> 하단 버튼 `</div>` 직후로 이동
  - 결과: autoRunVisual 체크박스 + 네이버 직접 등록 + 엑셀 다운로드 버튼 블록 전체가 `activeTab === 'visual'` 조건 안
  - 작업1(/atelier 404)·작업2-a(7번째 탭): 코드 이미 반영 완료로 폐기 단정 (Desktop 실측 정정판 hand-off)
  - 작업원칙 #44 stale fact 직접 해소 사례 (PROGRESS.md 2026-05-15 Phase 3-C-3 entry의 "체크박스 위치"가 코드 실제와 불일치였음)
  - TSC 0 + npm run build OK (/products/new 64.2 kB 변경 0) + sentinel 0
  - 핸드오프 `HANDOFF_atelier_routing_plant_checkbox_2026-05-27.md` 본 commit으로 [CLOSED]

### 2026-05-27 PM

- ✅ B-12 네이버 등록 라우트 근본 재작성 + B-11 저장배관 DB UPDATE (Code turn, 본 commit) ← Desktop 등록 완주 검증 대기
  - register/route.ts: categoryMap(의류 7종) 폐기 -> `product.naverCategoryCode` 직접 사용
  - register/route.ts: `X-Naver-Client-Id` 헤더 폐기 -> `naverRequest` OAuth2(bcrypt 전자서명) 위임
  - register/route.ts: API 실패 시 `status='registered'` + 가짜 ID(`PENDING_`/`ERROR_`/`MOCK_`) 3건 모두 제거(#46)
  - register/route.ts: detailContent에 `<img src="${detail_image_url}">` 삽입 (Desktop B-11 우회로 살려둔 186KB 상세 PNG 활용)
  - save-assets/route.ts: Storage 업로드 200 후 `prisma.product.update`로 `main_image_url`/`detail_image_url` 자동 기록 (B-11 §3-1)
  - useStudioActions §3-2 단정: 코드 정독 결과 이미 detailBase64 동봉 중 — 변경 0건
  - TSC 0 + npm run build OK + sentinel grep 0
  - **실 네이버 발행은 비가역 -> 대표 승인 후 별도 Desktop turn**

### 2026-05-27

- ✅ B-4 진단 504 근본 복구 (Code turn) ← Desktop 검증 통과 (production 진단 200/정상, 504 소멸)
- ✅ 명화송풍구 이미지 보강 + margin 교정 (Desktop turn) ← 진단 L4->L2 도달, persist=true 영속화
  - 이미지: 330px -> 화보 4종컷 1000x1000 (Cloudinary, 선명도 99.6->351.8)
  - margin: 50.69(깨진값) -> 2.03 (Supabase 직접 UPDATE)
  - 진단 엔진(P-Filter) 신뢰도 검증: 3회 재진단으로 좋은/나쁜 이미지 정확 구분 입증
- ✅ 부수버그 7-commit 정리 (Code turn, production 5601e91) ← **Desktop production smoke 3-tier 검증 통과**
  - C1 `a37f588` docs: ROADMAP ACTIVE 교체 + 5 MD/handoff
  - C2 `3c6859f` **B-7**: margin DB %(퍼센트) vs grading 배수 단위 불일치 근본 복구 + POST 디폴트 정합(KKOTIUM_DEFAULTS)
  - C3 `bf66d45` **B-8**: 도매꾹 crawler thumb.original 우선 + desc.contents 화보 추출
  - C4 `d3ff2fc` **B-5**: PUT 500 — stock 등 미존재 ceec럼 REJECT_KEYS 화이트리스트
  - C5 `d9e7ed7` **B-6**: /api/naver/categories 로컬 4,993 연결 (DB 미시드 우회)
  - C6 `234a745` **B-9**: rationale 응답 shape `string[]` 통일
  - C7 `5601e91` **B-10**: grading.decideGrade에 pFilterGrade floor 추가
  - Desktop 검증 evidence (production smoke):
    - B-6: `/api/naver/categories?q=디퓨저` -> 50003356 아로마방향제/디퓨저, fullPath 4단계 완전, count 1
    - B-9: 명화송풍구 재진단 rationale = `list` 길이 1, 항목 113자 정상 문장 (지난 턴 글자단위 분해 -> 해소)
    - B-10/B-7: 재진단 grade L2 = pFilterGrade L2 (floor 반영), roiBreakdown.margin 2.028 (자동계산)
    - 매 commit tsc 0 + build OK + verify-vercel-deploy.sh --wait exit 0 (Code 보고) + Desktop 재확인

### 2026-05-20

- ✅ Sprint 8-IA Phase 1 Task 1-3 `db72408` (Code turn) ← sidebar demote + admin move + registry 31→8
  - registry 8 entry 확정 (inventory-poll / good-service-track / discord-* 4 / cron-daily / cron-weekly)
  - /automation → /admin/automation 라우트 이동 + sidebar 항목 제거
  - 작업원칙 #46 (a)~(e) 5 규칙 적용 (실 가동 단정만 등재)
- ✅ Sprint 8-IA Phase 1 Task 4 `12495cf` (Code turn) ← SystemHealthCard + /api/system-health 신설
  - 신규 API: 8 registry × 4 신호 (InventorySnapshot / CategoryTrendCache / DomeCategory / Discord env) → HealthItem[]
  - 신규 컴포넌트: SystemHealthCard.tsx (60s polling + window focus revalidate)
  - Dashboard Section 3 가든 헬스 상단에 마운트 (기존 IA 보존)
  - TSC 0 / build 0 / Vercel READY (12495cf) / production /api/system-health 200 + items=8 ✅
  - V1~V5 단정 / V6 (브라우저 console) Desktop Chrome MCP 검증 의무 — TASK_BRIDGE §3 ACTIVE 신호로 이관

### 2026-05-26

- 🟡 IN-VERIFY: Studio 클릭 버그 수정 (Code turn) ← 6 컴포넌트 `'use client'` + B-2 빈 outputs guard
  - 진단 출처: Desktop Chrome MCP + Supabase MCP + Vercel MCP 전수 검증 (실 클릭 0 API 호출 / JS .click() 200 / 백엔드 정상)
  - Code 측 build + ship: tsc 0 + build 0 / Vercel push 대기
  - 상세 근거: `docs/handoff/HANDOFF_studio_click_bug.md` (HANDOFF doc git 추적 신규 등록)
  - Desktop 실클릭 재검증 통과 시 §3 ACTIVE 이전 + HANDOFF doc CLOSED 처리

---

## §8 작업원칙 #41 본문

본 원칙은 PRINCIPLES_LEARNED.md에도 동일 등재.

### 작업원칙 #41 — 두 환경 핑퐁 프로토콜 (2026-05-19 명문화)

**배경**: Sprint 7-PC paper-cut batch에서 두 환경 (🖥 Desktop ↔ 💻 Code) 핑퐁 운영 패턴이 자연 발생. 본 패턴을 영구 작업원칙으로 등재.

**규칙 7가지**:

(a) **역할 상호 배타** — Desktop은 planning + verify, Code는 build + ship. 두 환경 overlap 0. §1 표 참조.

(b) **5-step 표준 hand-off** — 모든 hand-off는 §2 형식 (FROM / TO / BASELINE / SCOPE / VERIFICATION / FALLBACK).

(c) **TASK_BRIDGE §3 ACTIVE 갱신 의무** — 매 hand-off 직후 갱신. SESSION_LOG와 *역할 분리* (TASK_BRIDGE = 실시간, SESSION_LOG = 회고).

(d) **단일 commit 단위** — 변경 50 LOC 이하 권고. 단일 sub-phase 단일 commit.

(e) **push 직후 검증 의무** — `scripts/verify-vercel-deploy.sh --wait` exit 0 + Vercel `list_deployments` HEAD 일치 확인.

(f) **Cross-track 검증 4-source** — 가능한 한 git + Vercel + Supabase + Chrome 4 source 모두 cross-check. 단일 source 단정 금지.

(g) **한계 정직 보고** — Desktop은 MD edit 불가 / Code는 Chrome MCP 불가. 각자의 한계는 §1 표 그대로. *못 하는 작업 우회 시도 금지*, 다른 환경에게 hand-off.

---

### 작업원칙 #49 — Desktop 핸드오프 직접 write (2026-06-04 명문화)

본 원칙은 PRINCIPLES_LEARNED.md에 정식 등재. 요지: Desktop은 인계 핸드오프 MD를 docs/handoff/에 Filesystem:write_file로 직접 작성(대표 다운/업로드 0), Code는 git add/commit 보존 + 큰 추적 MD(5종/PRINCIPLES)는 Python full-overwrite로 반영(#29b 불변). 핸드오프=Desktop 직접 쓰기 / 누적 MD=Code 반영.

---

## §9 컨텍스트 끊김 방지 (Recovery Drill)

세션 끊김 / 새 세션 진입 시 다음 4-step:

```
1. PROGRESS.md 헤더 정독 (직전 commit + 다음 작업)
2. ROADMAP.md "다음 새 채팅 시작 메시지" ⭐ ACTIVE 정독
3. SESSION_LOG.md 최근 entry 정독
4. TASK_BRIDGE.md §3 ACTIVE + §4 STANDING + §6 PENDING 정독 ★
   ↑ 본 layer가 새로 추가됨 — 4-step 모두 통과해야 정확한 상태 단정 가능
```

§3 ACTIVE 섹션이 *짧게 한 줄 인계 메시지*로 작동하도록 매 hand-off 시 갱신 의무. 사용자가 매번 paste하지 않아도 두 환경이 자동 sync.
