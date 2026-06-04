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
| **할 수 없는 것** | MD/코드 파일 *생성/편집* · git commit · 패키지 설치 | Supabase/Vercel/Chrome/image-search MCP 직접 호출 |
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

### 2026-06-04 (23) P0 첫 발행 회선 + L2 검증 (FROM Code, production 17e0ee2, 검증 전용·비가역 0)

| 항목 | 상태 |
|---|---|
| 기구현 확정 | P-1 uploadImagesToNaver(api-client.ts:498) / P-2 register L2 배선(:302·305·346 shop-phinf 치환) / L3 502+DRAFT(:312~363) / dryRun(:213~279). 신규 구현 0(중복 무효화). |
| STEP 1 회선 | production GET /api/naver/addressbooks HTTP 200(release/return 노출, diagnostics 에러 0). GET 회선+토큰 생존. |
| STEP 2 L2 실증 | ★ Code 실행 불가 — NAVER_PROXY_URL/PROXY_SECRET 로컬 부재(Vercel env+대표 proxy 전용). uploadImages end-to-end 미검증 → **Desktop 위임**. |
| STEP 3 dryRun | canRegister=true, 17필드+옵션3+ETC9키, 경고 2(재질/색상 누락, 비차단). 이미지: main=Cloudinary·detail+detailContent=Supabase·shop-phinf 0(L2 미적용=dryRun 정상). |
| 정정(#45) | 핸드오프 §1 'main=Supabase' → 실측은 main=Cloudinary. 둘 다 비-shop-phinf=L2 필요(DEBT-12 재확인). |
| 발행 판정 | ★ GO 아님 — STEP 2(Desktop) 미검증. register/POST 호출 0. |
| ★ 다음 (Desktop) | STEP 2 proxy action:uploadImages 실증(명화 main→shop-phinf) → 통과 시 대표 명시 승인 → 실 register(비가역, 명화 우선). |

### 2026-06-04 (22) 발행 관제탑 STEP D·E 검증 완결 + DEBT-12 등재 (FROM Code, production HEAD cb5151d, docs only)

| 항목 | 상태 |
|---|---|
| STEP D (Desktop 실측) | preview(34edf7) /dashboard 6/6 통과: 관제탑 노출·신호등 2/0/1·마진칩·체크리스트 14 한글·색대비·모바일 390px·SD-01 보존. |
| STEP E 교차검증 | Vercel e915b0a/cb5151d READY(verify exit 0) + production API #45 실측: 명화 GREEN/달항아리 GREEN+칩/아이스트레이 RED. 엔진 미접촉. |
| 발행 관제탑 | ★ STEP A~E 완전 종료. |
| DEBT-12 등재 | 발행 게이트 이미지 형식 사각지대 — publish-readiness가 Supabase URL을 https 문자열로 GREEN 통과(네이버는 shop-phinf만 수용)=거짓 초록. 해결=HANDOFF_publish_track §1 하이브리드(L1/L2/L3). |
| 산출물 | TECH_DEBT.md DEBT-12 + HANDOFF_publish_track_2026-06-04.md(verbatim). docs only, 코드/DB mutate 0. |
| ★ 다음 (분리 트랙) | P0 첫 발행: STEP P-1(네이버 이미지 업로드 어댑터)·P-2(발행 route L2 전처리)·P-3(L1 위젯 배지)·P-4(발행 직전 실측+대표 명시 승인). 명화 우선(50.7%), 비가역 하드룰. |

### 2026-06-04 (21) 발행 관제탑 STEP E — main 머지 + production 반영 완료 (FROM Code, production HEAD e915b0a)

| 항목 | 상태 |
|---|---|
| 머지 (e915b0a) | feature/publish-control-tower(STEP A·B·C) → main --no-ff 머지 + push origin main. 11 files. |
| Desktop STEP D | preview(34edf7) /dashboard 6/6 실측 통과(관제탑·신호등 2/0/1·마진칩·체크리스트 14 한글·색대비·모바일 390px·SD-01). |
| Vercel 검증 | verify-vercel-deploy.sh --wait exit 0 — production e915b0a 갱신 확인. |
| production fact-check (#45) | /dashboard 200 + 일괄 API 3건: 명화 50.7% GREEN무경고/달항아리 23.2% GREEN+칩/아이스트레이 42.6% RED. computeMarginPct 정합 실증. |
| 엔진/비가역 | publish-readiness.ts 미접촉. 발행 API 호출 0(이미지 변환 별건), DB mutate 0. |
| ★ 다음 (Desktop→분리 트랙) | P0 첫 상품 발행: 명화 이미지 변환 선결 → 관제탑 GREEN 재확인 → 대표 명시 승인 → 신중 발행(비가역). 명화 우선(마진 50.7%). 발행 관제탑 A~E 완료. |

### 2026-06-04 (20) 발행 관제탑 STEP C 완료 (FROM Code, feature/publish-control-tower, baseline af38158)

| 항목 | 상태 |
|---|---|
| STEP C (50ee308) | dashboard/page.tsx SECTION 2 최상단 마운트(가산식, 기존 위젯 보존) + computeMarginPct(salePrice/supplierPrice 직접 계산, margin 컬럼 단위 혼재 회피). |
| margin DB | ★ 미교정. 명화 2.03=진단등급용 배수(의도값, grading.ts margin>=5→L4). Supabase mutate 0. |
| 마진칩 정합 | 명화 51%(무경고)/달항아리 23%(경고칩)/아이스트레이 43%(무경고). publishReady 불변. |
| 검증 | git diff 2개 파일만 / 엔진 diff 0 / TSC 0 / build OK / 이모지 0 / 비가역 0(DB mutate 0). |
| push | origin/feature/publish-control-tower. main 미접촉(머지 금지). production 64fe565 미갱신=의도. |
| ★ 다음 (Desktop) | preview에서 STEP D 브라우저 실측(명화 GREEN·달항아리 GREEN+마진칩·아이스트레이 RED·한글 체크리스트·접근성·모바일 폭) → 통과 시 main 머지 → P0 발행(명화 우선, 대표 승인). |

### 2026-06-04 (19) 발행 관제탑 STEP A·B 구현 완료 (FROM Code, feature/publish-control-tower, baseline 64fe565)

| 항목 | 상태 |
|---|---|
| STEP A (515e82f) | 일괄 판정 API + 공통함수. load-publish-readiness.ts(loadAndEvaluateProducts+listDraftProductIds, N+1 가드) + 단건 route 리팩터(응답 불변·회귀 0) + 신규 /api/products/publish-readiness. |
| STEP B (aa31ad4) | control-tower-strings.ko.json(필드23+위반6) + PublishControlTowerWidget.tsx(useSWR, green/yellow/red 3색, 마진경고칩, 이모지 0/한글하드 0). |
| 엔진 미접촉 | publish-readiness.ts git diff 0. 비가역 0(조회만, mutate 0, 발행 미접촉). |
| 검증 | TSC 0 / npm run build OK(exit 0) / 이모지·코드 Korean 0. mapCategoryToTone null/undefined 동일처리 확인(tone 회귀 0). |
| push | origin/feature/publish-control-tower (main 미접촉). production 64fe565 미갱신=의도된(feature 브랜치). |
| ★ 다음 (Desktop) | 머지 검증 → STEP C(대시보드 page.tsx <PublishControlTowerWidget /> 마운트, 가산식) + STEP D(Chrome MCP production/dashboard 실측: 명화 신호·달항아리 마진경고·한글 체크리스트·접근성·모바일). 이후 P0 발행(명화 우선, 대표 승인). |

### 2026-06-04 (18) ★ 발행 관제탑 설계 확정 + 두 대수술 production 머지 검증 (FROM Desktop, 코드 0, production HEAD 64fe565)

| 항목 | 상태 |
|---|---|
| 빌더 머지 검증 | a6ea482 — emotional-bg 적응형 스크림(bash+PIL: 명화 luma 0.779→0.40 / 가상야간 0.30→0.60) + HTML 직렬화기(#46+htmlEscape) + 단색 경로 회귀 0(buildDetailPage else=stackVertically) 정독 증명. |
| 한글화 머지 검증 | 64fe565 — **/portfolio production 직접 호출 404 실측**(가짜 John 제거 확인) + redirect /dashboard(push→replace) + 용어사전 23값 의미훼손 0 + #47 문구 교체 정독. |
| ★ 발행 관제탑 설계도 | docs/handoff/HANDOFF_publish_control_tower_2026-06-04.md 신설. 기존 publish-readiness.ts 엔진(수정금지) 정독 완료. 관제탑=신호등 UI(GREEN publishReady/YELLOW hardComplete만/RED hard 미충족). 대시보드 카드(대표 승인). |
| 발행준비 실측 | 명화(cmpnooli4) publishReady 양호 마진 50.7% / 달항아리(cmp3afb45) 마진 23% 가격재검토 권고. 둘 다 DRAFT 미발행. |
| ★ 컨텍스트 한계 | 이번 세션 빌더+한글화 2대 작업으로 포화 → 관제탑 구현은 **새 채팅 위임**(중복작업 방지). |
| 비가역 0 | 코드/DB mutate 0, 발행 미접촉. SD-01 미접촉. |
| ★ 다음 (새 채팅 Desktop→Code) | HANDOFF_publish_control_tower 정독 → STEP A(일괄 판정 API, 단건 route와 공통함수 공유=중복금지) → B(PublishControlTowerWidget, missing 배열 용어사전 한글변환) → C(대시보드 통합) → D(Chrome MCP 브라우저 실측, 안되면 대표 스크린샷). 구현 후 P0 발행(명화 우선, 대표 명시 승인). |


### 2026-06-04 (17) UI 한글화 STEP5 점검 + ★ STEP1~5 전 완료 (FROM Code, feature/ui-ko-cleanup, baseline 69ccbf7)

| 항목 | 상태 |
|---|---|
| STEP5 crawl/orders | 실측 점검 — 영어 라벨 0/이모지 0(유일 매치=도매꾹 URL placeholder=정상). actionable 0, 코드 변경 없음(#46). |
| ★ STEP1~5 완료 | 용어사전+#47 / redirect+portfolio 삭제 / upload 한글화·이모지 / crawl·orders 점검. 한글 하드코딩 0·이모지 0·sentinel 0·tsc 0·build ✓·비가역 0. |
| 브랜치 | feature/ui-ko-cleanup (커밋 c724693→69ccbf7→본). main a6ea482 불변. push 완료. |
| ★ 다음 (Desktop) | (1) production 문구 육안 점검(아틀리에/첫 화면/upload) (2) 브랜치 머지 결정 (3) 발행 관제탑 신설. |


### 2026-06-04 (16) UI 한글화 STEP4 — /upload 한글화 + 이모지 제거 (FROM Code, feature/ui-ko-cleanup, baseline 3ceef0b)

| 항목 | 상태 |
|---|---|
| 중복 판정 | /upload=엑셀 대량등록(/api/upload/excel), 워크벤치 dropzone=이미지 자산 업로드 → 별개, 중복 아님. 살림+한글화. |
| 이모지 제거 | 📋📁⏳🚀 → Lucide(ClipboardList/FolderOpen/Loader2/UploadCloud). JSX 이모지 0. |
| i18n | upload-strings.ko.json 신설, page.tsx 한글 하드코딩 0(#35). 엑셀 라우트 무변경. |
| 검증 | emoji 0/tsc 0/build ✓/sentinel 0. 비가역 0. main 불변. |
| 다음 | STEP5 crawl/orders 잔여 영어 라벨(점진, 별도 커밋). |


### 2026-06-04 (15) UI 한글화 STEP2+3 — root redirect + portfolio 삭제 (FROM Code, feature/ui-ko-cleanup, baseline c724693)

| 항목 | 상태 |
|---|---|
| STEP2 redirect | page.tsx /portfolio→/dashboard(router.replace) + 로딩문구 home-strings.ko.json i18n(#35). |
| STEP3 삭제 | src/app/portfolio/page.tsx 가짜 템플릿 삭제. 외부 참조 grep 0 확인 후. |
| 원자 커밋 | redirect+삭제 통합(중간 / 라우트 깨짐 방지). |
| 검증 | tsc 0(.next/types 잔재 build 재생성으로 해소)/build ✓/sentinel 0/한글 하드코딩 0/이모지 0. 비가역 0. main 불변. |
| 다음 | STEP4 /upload 중복 확인 → STEP5 crawl/orders. |


### 2026-06-04 (14) UI 한글화 STEP1 — 용어 사전 + #47 문구 (FROM Code, feature/ui-ko-cleanup, baseline a6ea482)

| 항목 | 상태 |
|---|---|
| 브랜치 | feature/ui-ko-cleanup 신규(빌더 머지 후 a6ea482 기반). main 미접촉. |
| 용어 사전(§1) | studio-strings.ko.json 23값 치환(키 무변경=회귀 0): 골격→페이지구성/에셋·Supabase→이미지 저장/public URL→공유 링크/Clean·Price·Badge·Lifestyle→깔끔·가격강조·뱃지·감성형/누끼→배경 제거 이미지/폴백→기본/matchScore→적합도 점수. |
| #47 문구(§2) | faceFreeNote 구 "얼굴 없는 인체 일부"→"익명 모델 허용/특정 실존인물 금지". 코드는 이미 정합, 문자열만 교체. |
| 검증 | TSC 0/build ✓/sentinel 0/한글 하드코딩 0(i18n)/이모지 0. 비가역 0. main 불변. |
| 다음 | STEP2 redirect→STEP3 portfolio 삭제→STEP4 upload→STEP5 crawl/orders. Desktop은 한글화 후 production 문구 육안 점검. |


### 2026-06-04 (13) 빌더 STEP5 + ★ 하이브리드 대수술 STEP1~5 완료 (FROM Code, feature/detail-builder-hybrid, baseline 0e619f8)

| 항목 | 상태 |
|---|---|
| 작업원칙 #48 | 도구 라우팅(생성 Firefly 수동/가공 Adobe MCP/합성 빌더+Figma) + AEM·Marketing MCP 미사용 + 파트너 모델 면책 없음→최종판매 금지. firefly-generate 주석 보강. |
| 캐시 DEBT-11 | 영구 자산 cache-control: no-cache 실측(cacheControl 미실효). 재업로드/버킷 정책=Desktop 위임(#41). 기능 영향 0. |
| ★ STEP1~5 완료 | hero무드/composeContinuous/앵커링/emotional6+접지그림자/스크림0.40+다크적응형/HTML직렬화기/StudioUI토글/커넥터·캐시. 전 STEP 회귀 0(단색 경로 createCanvas 동일). |
| 검증 | TSC 0/build ✓/sentinel 0/Korean 0. 비가역 0(발행 미접촉 DRAFT). main a585635 내내 불변. |
| ★ 다음 (Desktop) | (1) 명화 재합성 최종 확인 (2) main 머지 전 최종 회귀(달항아리 단색 불변) (3) 머지 → P0 발행 재개. |


### 2026-06-04 (12) 빌더 STEP4 — 가독성 정교화 + Studio UI (FROM Code, feature/detail-builder-hybrid, baseline a539fea)

| 항목 | 상태 |
|---|---|
| 가독성 정교화 | 적응형 스크림 STEP2 마감서 완료, informational 불투명 유지 → 추가 작업 불요. |
| DetailPageCard UI | 이미지/HTML 출력 토글(HTML은 detailHtml 있을 때만) + 무드배경 URL 입력(manualBackdropUrl 재사용) + 미리보기 640. |
| 배선 | runDetail이 manualBackdropUrl→lifestyleAssetUrl 전달. 라벨 i18n 분리(#35). |
| 회귀 0 | 신규 props optional → products/new 두 번째 소비자 무파손. |
| 검증 | TSC 0/build ✓/sentinel 0/Korean 0. 비가역 0. main 불변. |
| 다음 | STEP5 커넥터 규칙+캐시 → Desktop 최종 회귀 → 머지. |


### 2026-06-04 (11) 빌더 STEP3 — HTML 출력 경로 신설 (FROM Code, feature/detail-builder-hybrid, baseline 09e5ff1)

| 항목 | 상태 |
|---|---|
| detail-html-serializer.ts | 섹션 copy+role → 860px 인라인 HTML(h2/p). emotional 웜틴트/informational 흰배경. 이미지=Supabase URL img src. |
| generate-detail | 응답 detailHtml 필드 추가(detailBase64 PNG 병렬 보존). sections에 role 노출. |
| #46 | 직렬화기 copy 무변형, escape+마크업만. |
| 회귀 0 | 기존 PNG 소비자 무영향(신규 필드 가산). |
| 검증 | TSC 0/build ✓/sentinel 0/Korean 0. 비가역 0. main 불변. |
| 다음 | STEP4 Studio UI(이미지/HTML 토글) → STEP5 커넥터/캐시. |


### 2026-06-04 (10) 빌더 STEP2 마감 — 스크림 0.40 + 다크 적응형 (FROM Code, feature/detail-builder-hybrid, baseline 60c5408)

| 항목 | 상태 |
|---|---|
| 스크림 하향 | MOOD_SCRIM_ALPHA 0.62→0.40(대표 확정, Desktop 실물 검증). |
| 다크 적응형 | sharp.stats 평균 휘도 → luma<0.5면 0.60 자동 상향, 아니면 0.40. 무드 모드만. STEP4 미룬 항목 본 turn 완료. |
| 회귀 0 | no-lifestyle createCanvas 분기 불변. |
| 검증 | TSC 0/build ✓/sentinel 0/Korean 0. 비가역 0. main 불변. |
| 다음 | Code STEP3~5 연속. Desktop은 전 STEP 후 명화 0.40 재확인 + 머지 전 최종 회귀. |


### 2026-06-04 (9) 빌더 STEP2-확산(2) — emotional 6개 무드 전환 + 접지그림자 (FROM Code, feature/detail-builder-hybrid, baseline 9c31052)

| 항목 | 상태 |
|---|---|
| emotional-bg.ts 헬퍼 | resolveEmotionalBackdrop(무드=cover-fit+흰 스크림 0.62, 단색=createCanvas 그대로) + groundShadowLayer(블러 타원 0.18). |
| emotional 6개 전환 | seasonalHook/story/styledShot/problem/solution/philosophy createCanvas→헬퍼 1줄 스왑. 전경 무변경(대비 보존). hero 접지그림자 추가. usage 미접촉(이미 무드). |
| informational 19개 | 무변경(verify-only) — 불투명 유지=가독성 사수, 무드 비침 0. |
| 회귀 0 | 단색 경로=createCanvas(size,bg) 동일(헬퍼 else). hero 단색 접지그림자 미적용. |
| 검증 | TSC 0/build ✓/sentinel 0/Korean 0. 비가역 0(PNG만, 발행 미접촉 DRAFT). main 불변. |
| 튜닝 노브 | 무드 강도 = MOOD_SCRIM_ALPHA(현 0.62). 낮추면 사진 더 노출. |
| 다음 (Desktop) | 명화 재합성 검증(감성 무드+접지그림자+정보 가독성+달항아리 단색 회귀 0) → STEP3~5 승인. |


### 2026-06-04 (8) 빌더 STEP2-확산 (1)표본 — sectionRole + hero 앵커링 근본해결 (FROM Code, feature/detail-builder-hybrid, baseline 4ef6102)

| 항목 | 상태 |
|---|---|
| sectionRole 도입 | section-builder SectionRole(emotional/informational) + getSectionRole. emotional=hero/seasonalHook/story/philosophy/styledShot/problem/solution, 그 외 informational(안전측). sections meta에 role 추가(가산식). |
| 차등 투명화 정책 | emotional=무드bg 노출 / informational=불투명 유지(가독성 사수, 무드 비침 금지). ★ 단순 전체 투명화 금지. |
| 표본 spec | informational → 기존 불투명 그대로(렌더링 무변경=가독성 보존). |
| hero 앵커링 근본해결 | 세로 누끼 fit박스 꽉 참 → bottom-gravity 무효. 본품 base를 테이블면(~0.52h) 안착, 패널 50px 간격 clamp(min(0.52h,panelTop-50)). 단색 무변경. |
| 검증 | TSC 0/build ✓/sentinel 0/Korean 0. 비가역 0(PNG만, 발행 미접촉 DRAFT). main 불변. |
| 다음 (Desktop) | 명화 재합성 검증(테이블 앵커링+정보 가독성+달항아리 단색 회귀 0) → 28 렌더러 그룹 확산+STEP3~5 승인. |


### 2026-06-04 (7) 빌더 하이브리드 STEP2 — 연속 캔버스 foundation + hero 1-D (FROM Code, feature/detail-builder-hybrid, baseline bf09837)

| 항목 | 상태 |
|---|---|
| composeContinuous | section-builder 신설 — 전역 배경 선합성 후 섹션 적층. stackVertically 보존. lifestyleAssetUrl 있으면 무드bg, 없으면 stackVertically(회귀 0). |
| hero 1-D 개선1 | 무드 모드 본품 바닥 앵커링(position:'bottom', 테이블면 안착). 단색 경로 중앙 유지. |
| hero 1-D 개선2 | 가독성 패널 상단 페이드 그라데이션(본품 연결). 50px 안전간격·패널 top 불변. |
| ★ 확산 보류 | 30개 렌더러 투명 전환은 최고 위험 → hero 시각 검증 후. 현재 불투명 섹션이라 전역 무드bg는 hero 외 가려짐. |
| 검증 | TSC 0/build ✓/sentinel 0/Korean 0. 비가역 0(PNG만, 발행 미접촉 DRAFT). main 불변. |
| 다음 (Desktop) | 명화 재합성 시각 검증(바닥 앵커링+패널 페이드) + 달항아리 단색 회귀 0 → 확산+STEP3~5 승인. |


### 2026-06-04 (6) 상세 빌더 하이브리드 STEP1 — hero 무드배경 합성 (FROM Code, feature/detail-builder-hybrid, baseline a585635)

| 항목 | 상태 |
|---|---|
| 브랜치 | feature/detail-builder-hybrid (대수술 → main 직접 수정 회피). main HEAD a585635 불변. |
| hero.ts 무드배경 | lifestyleAssetUrl cover-fit 전체 배경(A) + 누끼(C) 투명 letterbox 중앙 + 텍스트 뒤 반투명 흰 패널 가독성 가드. |
| ★ 회귀 가드(P0) | lifestyleAssetUrl 미전달 시 단색 경로 연산·인자·순서 기존과 동일(구조적 바이트 동등). |
| 검증 | TSC 0 / build ✓ / sentinel 0 / Korean 0. 비가역 0(PNG 생성만, 발행 미접촉 DRAFT). |
| 범위 | STEP1=작업2만. STEP2~5는 Desktop 시각 검증 후. |
| 다음 (Desktop) | generate-detail 실행(lifestyleAssetUrl=myeonghwa-backdrop-860.jpg, sourceImageUrl=myeonghwa-cutout.png) → 무드배경 합성 시각 검증 → 승인 시 Code STEP2. |


### 2026-06-04 (5) 명화 디퓨저 가공자산 3종 Supabase 영구화 완료 (FROM Code, baseline 16578d0)

| 항목 | 상태 |
|---|---|
| 적재 | product-assets/cmpnooli40001f0gveaxr8iim/ upsert 3종 + public 200 검증. 바이트 Desktop 검증치 정합(65787/195918/73822B). |
| 대표이미지(1000) | https://doxfizicftgtqktmtftf.supabase.co/storage/v1/object/public/product-assets/cmpnooli40001f0gveaxr8iim/myeonghwa-main-1000.jpg |
| 본품 누끼(png) | https://doxfizicftgtqktmtftf.supabase.co/storage/v1/object/public/product-assets/cmpnooli40001f0gveaxr8iim/myeonghwa-cutout.png |
| 배경무대(860) | https://doxfizicftgtqktmtftf.supabase.co/storage/v1/object/public/product-assets/cmpnooli40001f0gveaxr8iim/myeonghwa-backdrop-860.jpg |
| 실행 보정 | resolveProductId(PostgREST) "permission denied for schema public" → PRODUCT_ID override 우회. Storage API 정상. 스크립트 주석 보강. |
| 보안/비가역 | 서비스롤 키 로컬 --env-file만(대화 미노출). Storage upsert만, DB/발행 미접촉, DRAFT 유지. 가역. |
| 다음 (Desktop) | 영구 URL 3종 → 상세페이지 합성/발행 자산 연결(Figma STEP2). |


### 2026-06-04 (4) firefly-generate 어댑터 + 인물 정책 코드 정합 (FROM Code, baseline 77812ea)

| 항목 | 상태 |
|---|---|
| firefly-generate.ts | 신규 어댑터 — FireflyRequest → {imageUrl}. FIREFLY_MODE=api 토글, manual 기본(생성 호출 0). api=IMS OAuth 토큰(캐시)→Firefly Services v3. 키 부재·파트너 모델·에러 시 manual fail-safe(#46). DB/Storage 미접촉. |
| ModelPolicy 정합 | category-tone-mapper에 'model-allowed' 추가 + 구 하드룰 주석 supersede(#44/#47). 기존 GROUP_ROWS 값 불변(배경=무인). |
| classifyPersonShot | backdrop-vlm-gate 신설 게이트(Groq 재사용). 통과=!식별인물 && !text && 적절. fail-closed. classifyBackdrop 미접촉. |
| 범위 | 인물컷 인입 라우트 연결(2-C)은 다음 스프린트 분리 — 게이트 함수 준비까지. |
| 검증 | TSC 0 / build ✓ / sentinel 0 / 코드 Korean 0. 비가역 0(생성 호출 0). 새 의존성 0. |
| 다음 (Desktop) | (1) Adobe 가공자산 Supabase 영구화 (2) Firefly 인물컷 1-click→classifyPersonShot 실측 (3) Figma STEP2. |


### 2026-06-04 (3) Adobe 가공 라인 첫 완주 + AI 인물 정책 갱신 (FROM Desktop, 코드 0, production HEAD 5dad281)

| 항목 | 상태 |
|---|---|
| Adobe 가공 SOP | 명화 디퓨저 5단계 입증: 누끼 → focus 추출(팜파스 제거) → 1000x1000 대표(흰배경) → 860x860 배경무대. 합성은 Adobe 미지원 → Figma/Photoshop. |
| ★ AI 인물 정책 | 익명 일반 모델 등장 허용 / 특정 실존인물·유명인 식별 금지 / 미성년자 부적절 묘사 금지. 구 "얼굴 없는 인체 일부" 하드룰 대체. 작업원칙 #47 신설 + DETAIL_PAGE_PLAYBOOK §5 갱신(#44). |
| Firefly v2 | docs/handoff/FIREFLY_CONCEPT_PROMPTS_v2_human_allowed_2026-06-04.md 신규 — 인물 프롬프트 3종 + 네거티브 + 가공 SOP. |
| 자산 영구화 TODO | Adobe 가공 3종(누끼/1000/860) = 단축URL 세션 한정 → Supabase product-assets 업로드 후속. |
| 바뀐 점 | 비가역 0(코드/DB mutate 0). SD-01 미접촉. docs only. |
| 다음 (Desktop) | (1) 가공자산 Supabase 업로드(만료 전) (2) Firefly 인물 컨셉컷 1-click→가공 (3) Figma 한도 리셋 후 값 눈대조+STEP2(배경A+본품C 합성). |


### 2026-06-04 (2) S4 2단계 Figma 마스터 STEP1 완료 (FROM Desktop, 코드 0, production HEAD 7a640b6)

| 항목 | 상태 |
|---|---|
| Figma 마스터 | 파일 8yuNcO8J9Pitt7glfr49Uw(꽃틔움 KKOTIUM — Concept Preset Master). Variables 69개 = Brand Core 3 / Concept Preset 60 / Intensity 6. 전 변수 WEB 코드신택스 주입(코드 [data-preset] 1:1). |
| starter 모드 제약 보정 | starter=컬렉션당 모드 1개 → 원안 "프리셋=모드 5개" 불가. 프리셋을 변수 이름 그룹(preset/aroma/* 등)으로 표현해 단일 소스 추적 유지. |
| Desktop 직접 저장 | docs/design/FIGMA_MASTER_BLUEPRINT_2026-06-04.md(신규 15KB) + README 보관표 갱신(신규 + 누락 3건). sentinel grep 0건. |
| 바뀐 점 | 비가역 0(코드/DB mutate 0). SD-01 미접촉. docs only. |
| 다음 (Desktop, 한도 리셋 후) | 새 채팅 (1) Figma 값 최종 눈대조(aroma/surface=#F3EFE7, aroma/accent=#76864C 등) (2) STEP2 7섹션 컴포넌트 빌드(호출 묶음). |


### 2026-06-04 B+C 배포 검증 + Supabase 적용 + aroma 프리셋 + 하이브리드 원칙 (Desktop 완결, production HEAD 6f02330)

| 항목 | 상태 |
|---|---|
| 배포 검증 | 채팅 B(5ea926e) + C(0f6d3be) + 추가 누락분(6f02330, 단건 prefill 옵션 유실 수정) 3커밋 모두 Vercel READY 실측. runtime logs 전수 200 → 신규 3컬럼 회귀 0. 코드 라인 직독 버그 0. |
| Supabase 적용 | apply_migration 20260603_add_concept_preset 실행 → information_schema drift 0 확정. 역순 배포 사고 해소. |
| aroma 적용 | 명화 디퓨저(cmpnooli40001f0gveaxr8iim) concept_preset='aroma'/preset_intensity='l3' UPDATE 완료(DRAFT, 비가역 아님). |
| ★ 영구 디자인 원칙 (일반화 금지 주의) | **원칙(영구)**: 상품 디자인 = 한 방향 금지, 여러 컨셉을 하이브리드로 어우러지게 해 감도 제고. **상품별 조합은 매번 다르게 잡는다.** / **명화 디퓨저 전용(일반화 금지)**: A(모네 수련 무드 배경) + C(정물 꽃 오브제 전경) 3겹 레이어 v2 = 이 상품 한 건의 시안 기록일 뿐. 'A+C 조합'을 전체 상세페이지 고정 템플릿으로 일반화하지 말 것. |
| S4 전략(대표 승인) | Figma 마스터 + concept-presets.ts 토큰↔Figma Variables 동기화. 1단계 v2 HTML 빠른 런칭, 2단계 Figma 마스터 구축. Canva는 단발성 보조. |
| Firefly 카드 | docs/handoff/HANDOFF_S2_firefly_myeonghwa_aroma_2026-06-03.md (히어로 A+C + 향 3종 EN 프롬프트, 대표 1-click 생성용). |
| 이번 채팅 잔여(Code 위임) | backfill dry-run — Desktop 로컬 터미널 미가용. `npx tsx scripts/backfill-options-from-crawl.ts`(dry-run) 검토 후 명화 중복 0 확인 → --apply. + batch-register category:'uncategorized' 하드코딩 정리 후보. |
| 바뀐 점 | 비가역 0(register/POST mutate 0). SD-01 미접촉. |
| 다음 | 새 채팅#1(Figma 마스터+토큰 동기화) / 새 채팅#2(상품관리 자동화 화면 UI/UX 설계+브라우저 E2E). 각각 독립 완결 — 한 채팅 과부하 방지. |


### 2026-06-03 크롤 옵션 변환 누락 수정 (Code → Desktop, 미push, baseline 4c52141)

| 항목 | 상태 |
|---|---|
| 권위 | HANDOFF_crawl_option_mapping_fix_2026-06-03.md. register·POST mutate·backfill 실행 금지 준수(호출 0). |
| 근본 원인 | (Desktop DB 실측) crawl_logs.options 정상 저장, Product/product_options 누락 = 승격 변환 단계 매핑 누락. 재크롤 불필요. |
| Fix1 매퍼 | src/lib/sources/crawl-option-mapper.ts 신규. crawl_logs.options → Product 컬럼(게이트) + product_options 행(발행). 축이름 기본 '옵션'(selectOpt 그룹명 미제공). 두 소비처(publish-readiness + buildOptionInfo) 형식 대조 정합. |
| Fix2 변환 | crawl/batch-register/route.ts: 매퍼 배선 + product.create 옵션필드 + product_options.create를 $transaction 원자화. 옵션 없으면 hasOptions=false 유지. |
| Fix3 backfill | scripts/backfill-options-from-crawl.ts 신규(tsx). dry-run 기본 + --apply. product_options/hasOptions 존재 시 skip = 명화 디퓨저 중복 차단. **prod mutate → Desktop 실행**. |
| 스코프 | 단건 prefill 경로(products/new POST)는 옵션 미저장 = 범위 밖(별도 turn). 단 productId 링크 시 backfill로 복구. |
| 검증 | TSC 0 / build 0 / 비가역 0(register·mutate·backfill 실행 0) / 새 의존성 0. |
| 다음 (Desktop) | (1) 신규 옵션 상품 크롤 → batch-register 승격 → hasOptions=true + product_options 행 + dryRun optionCombinationCount>0 3-tier. (2) backfill dry-run 검토 → --apply → 명화 중복 0. |


### 2026-06-03 디자인 프리셋 코드화 + DetailPageBuilder 흡수/제거 (Code → Desktop, 미push, baseline 4c52141)

| 항목 | 상태 |
|---|---|
| 권위 | HANDOFF_MASTER_design_preset_builder_2026-06-03.md §3 + CONCEPT_PRESET_SYSTEM.md. register·POST mutate 금지 준수(호출 0). |
| (1) 빌더 제거 | DetailPageBuilder.tsx 삭제 + products/new import/state/JSX 제거 + description 페이로드 체인 2곳 단순화(detailBlocks 분기 제거). 잔존 참조 grep 0. |
| 흡수 확인 | Specs → studio section-renderers(specTable/spec/specifications) 완전 존재(이전 불필요). Q&A → aeoContent={null} dead-wire + '상세 설명(텍스트)' HTML 필드로 보존. 손실 0. image탭 → '상세페이지 자동화' 안내 카드(visual 점프). |
| (2) 프리셋 코드화 | src/lib/design/concept-presets.ts(5프리셋×6요소) + section-variants.ts(7섹션 무의존 CVA, defineVariants) + i18n/concept-presets.ko.json + globals.css [data-preset] --preset-* 토큰(전역 --color-* 격리 = §7 직교). |
| (3) Prisma | Product concept_preset(def 'kitchen')/preset_intensity(def 'l1')/preset_overrides(jsonb) + migration 20260603_add_concept_preset/migration.sql(멱등, public."Product"). prisma generate 로컬 OK. |
| 검증 | TSC 0 / build 0(/products/new 53kB) / 비가역 0 / 새 npm 의존성 0 / SD-01 미접촉 / 한글 코드 리터럴 0. |
| ★ 순서 제약 | schema 신규 3컬럼이 배포되면 production DB 컬럼 부재 시 Product 쿼리 깨짐. **Desktop이 migration 20260603 Supabase apply_migration 선행** 후 push 안전. SQL+순서는 docs/handoff/HANDOFF_concept_preset_migration_2026-06-03.md(prisma/migrations는 gitignore라 이 문서가 SQL 단일소스). 본 turn commit/push 보류. |
| 다음 (Desktop) | (1) Supabase ALTER 적용(migration 20260603) → drift 0 확인 → (2) push/배포 안전 확인 → (3) 채팅 A(명화 디퓨저 aroma L3 상세페이지 첫 레퍼런스)로 프리셋 실증. |


### 2026-06-02 발행 데이터 스토어명 정정 — 앱 이름 → 스토어명 SoT (Code → Desktop, push 803a69a)

| 항목 | 상태 |
|---|---|
| 원칙 (대표 확정) | '꽃틔움 가든'=앱 이름(내부), '꽃틔움'=스토어명(고객 노출). Desktop store_settings.store_name='꽃틔움' 교정 완료. |
| 작업1·2 fallback | importer + 정보고시 manufacturer fallback을 앱 이름 → 스토어명. |
| 작업3 SoT 연동 | DEFAULT_STORE_NAME 상수 + storeName 인자 + register route store_name 주입. DB 한 곳 SoT. |
| 작업4 잔존 점검 | 앱 이름(UI/주석/마스코트) 유지. insert-card 기본값 1건 정정. |
| dryRun 단정 | 명화 방향제 importer='꽃틔움' + manufacturer='꽃틔움' + payload 앱 이름 잔존 0건. |
| TSC/build/verify | 0 / OK / exit 0. 비가역 0. |
| 다음 (Desktop) | 명화 방향제 dryRun 재단정 → 회선 확인 → 대표 승인 → register 첫 발행. 달항아리 ORDER_MADE 파킹. |


### 2026-06-02 수입품 importer 자동 충진 — originAreaInfo NotEmpty 400 차단 (Code → Desktop, push 3137914)

| 항목 | 상태 |
|---|---|
| 단정 (#46) | 중국산(isImport) + importer_name=null → importer 누락 → 400 "수입사 항목 입력". 달항아리·명화 방향제 동일. |
| Fix | 수입품 importer 항상 충진. 폴백 importer_name > naver_manufacturer > '꽃틔움 가든'. 국산은 미포함. |
| dryRun 단정 | 명화 방향제(중국산, 두 필드 null) → importer='꽃틔움 가든' 충진. |
| TSC/build/verify | 0 / OK / exit 0. 비가역 0. |
| 다음 (Desktop) | 명화 방향제(NORMAL)로 dryRun 재단정 → 회선 확인 → 대표 승인 → register 첫 발행. 달항아리 ORDER_MADE 파킹. |


### 2026-06-02 배송 분기 — 공급사 합배송 자동 분기 + ORDER_MADE 가드 (Code → Desktop, push 799dea7)

| 항목 | 상태 |
|---|---|
| 원칙 (대표 확정) | 묶음배송 여부 = 공급사·상품별 속성. deliveryBundleGroupId 와 deliveryFeeByArea 양립 불가 (RESEARCH §1). |
| 작업1 schema 동기화 | Supplier 4컬럼(bundleCapable/naverBundleGroupId/island·jejuExtraFee) + Product shippingAttribute. Supabase ALTER 선행, drift 0 확인. |
| 작업2 분기 로직 | buildDeliveryInfo: bundleCapable=true & group ID 유효 → groupId 전송+feeByArea 제거 / 그 외 → feeByArea 전송+groupId 제거. |
| 작업3 route | Supplier 조회 → bundleInfo 전달 + dryRun deliveryBranch 노출. |
| 작업4 가드 | ORDER_MADE 상품 실 register 409 차단 (dryRun 통과). |
| dryRun 단정 | 달항아리(bundleCapable=true, group ID=null) → useBundle=false → feeByArea + mutuallyExclusiveOk=true. |
| 다음 (Desktop) | 표준 위탁 상품(NORMAL, bundleCapable=false)으로 첫 발행 검증. 달항아리 ORDER_MADE 파킹. 이현마켓 합배송은 판매자센터 묶음그룹 생성 → group ID 입력 후. |


### 2026-06-02 P0 발행 — 네이버 이미지 업로드 파이프라인 (Code → Desktop, push a062bfb)

| 항목 | 상태 |
|---|---|
| 진단 (#46) | register 400 "올바른 이미지 파일이 아닙니다". 외부 Supabase URL 직접 전송이 원인. 네이버는 업로드 API의 shop-phinf URL만 허용 (RESEARCH §1). |
| ★proxy 멀티파트 진단 (요보고) | home-proxy.mjs는 JSON만 처리 → 멀티파트 패스스루 불가. action 'uploadImages' 신설 (proxy가 등록 IP에서 직접 fetch+업로드). |
| 작업1 | api-client.ts uploadImagesToNaver + sniffImageMime (proxy 위임 / direct 멀티파트). |
| home-proxy.mjs | action 'uploadImages' 추가 — imageUrls fetch → MIME sniff → FormData → 네이버 업로드. |
| 작업2 | register route 7-img: 업로드 → 네이버 URL payload 주입 + detail_image_url 치환 + 잘못된 주석 삭제 + 실패 시 502. |
| dryRun 단정 | imagesToUpload.mainImage(JPEG)+detailImage(PNG) 노출. 실 업로드는 발행 시. |
| TSC/build/verify | 0 / OK / node --check OK / exit 0. 비가역 0. |
| ★다음 (운영 2건) | (1) 대표 home computer git pull + home-proxy **재시작** (action 'uploadImages' 적용 — 안 하면 400). (2) GET addressbooks 회선 확인 → 대표 승인 → 실 register → 발행 완주. |


### 2026-06-02 P0 발행 — register 400 invalidInputs 2건 정확 fix (Code → Desktop, push e384447)

| 항목 | 상태 |
|---|---|
| Desktop 시도 결과 (18:15) | POST register HTTP 400, invalidInputs 2건: returnDeliveryCompanyPriorityType NotValidEnum + minorPurchasable NotNull. 정보고시/카테고리/주소/이름/이미지 전부 PASS. |
| Fix 1 단정 | 'CHARGE'는 v2 enum 아님. GitHub Discussion #241 코드 샘플로 'PRIMARY' 단정. NaverClaimDeliveryInfo 타입 + buildDeliveryInfo 교정. |
| Fix 2 단정 | minorPurchasable: boolean 필수. 상수 true (미성년자 구매 가능 default). NaverProductPayloadV2 + buildNaverProductPayload 추가. |
| dryRun production 단정 | returnDeliveryCompanyPriorityType=PRIMARY + minorPurchasable=true 충진. 2건 PASS. |
| TSC/build/verify | 0 / OK / exit 0. 비가역 0 (register 호출 0건). |
| 다음 (Desktop) | (1) GET /api/naver/addressbooks로 회선 생존 단정 (★회선 불안정성 대비) → (2) 대표 명시 승인 → (3) POST register 실호출. 통과 시 발행 완주. |


### 2026-06-02 P0 회선 수정 출하 + ECONNRESET 원인 정정 (Code → Desktop, push 22c43bb)

| 항목 | 상태 |
|---|---|
| 출하 (회선 수정) | api-client.ts fetchNoKeepAlive: Connection: close + keepalive:false + ECONNRESET 자동 백오프 재시도 200/400ms 최대 3회. 4개 fetch path 전수 적용. cause 진단 보강 (syscall/address/port/errno/attempts). |
| 검증 통과 (코드) | TSC 0 / build 0 / verify-vercel exit 0. Vercel logs에서 retry-backoff [NAVER_DIAG] 발화 확인 = 자동 재시도 정상 작동. |
| 검증 실패 (회선) | 본 turn GET addressbooks 2회 호출 모두 502 attempts=3 NETWORK_RESET. dashboard/stats도 동일. **GET까지 영구 차단 중** — 이전 가정 'GET 정상' stale fact 정정 (#46). |
| 단정 (사실) | client-side fix만으로 해결 불가. server-side(proxy 또는 그 너머)에서 매번 RST 발생. attempts=3 모두 실패 = 일시 사고 아님. |
| 추정 (단정 못 함) | ① Tailscale Funnel proxy 자체 다운(home computer 측) / ② proxy → naver 회선 차단 / ③ NAVER_PROXY_URL 환경변수 변경. |
| 다음 (대표 권한) | home computer Tailscale Funnel proxy 상태 점검 + 재가동. 정상 회복 후 GET /api/naver/addressbooks 단정 → register 재시도. |
| 비가역 0 | Code register 호출 0건. DRAFT 유지. |


### 2026-06-02 P0 발행 1단계 완주 — 정보고시·AS·name·공통슬롯 통합 (Code → Desktop, push 734f25d)

| 항목 | 상태 |
|---|---|
| 권위 정정 (#46) | API v2 정보고시 템플릿 ID(2976841) 참조 **미지원** — payload 삽입 금지. ETC 인라인 유일 (RESEARCH §1). |
| 작업1 정보고시 ETC | buildProductInfoProvidedNoticeEtc 헬퍼 + payload 통합. type=ETC + 자식 etc 8필수 "상품상세참조" + 실제값 4종 (itemName/modelName/manufacturer/customerServicePhoneNumber). |
| 작업2 AS 전화 형식화 | normalizeNaverPhone (정규식 + dash 자동포맷 + fallback 010-3227-4805 주소록번호). DB UPDATE 0, 가드만. |
| 작업3 name SEO 우선 | pickProductName: naver_title > seoTitle > name 100자 slice. |
| 작업4 공통슬롯 4칸 | StoreSettings 4컬럼 신설 + Supabase ALTER + buildDetailContent 슬롯 통합 + register route inject. |
| #34 보고 | docs/research/assets/ 디렉토리 부재 → 이미지 2파일 working tree 0건. schema/코드는 완비, 실 이미지 업로드는 사용자 파일 제공 후 후속 turn. |
| dryRun production 단정 | leafCategoryId=50000963 + name=naver_title + AS=010-3227-4805 + ETC.etc 9키 + noticeSlots 전부 미설정. validation A/A 85/84. **4건 전수 PASS**. |
| TSC/build/verify | 0 / OK / exit 0. 비가역 0 (register 호출 0건, DRAFT 유지). |
| 다음 (Desktop) | 대표 명시 승인 → POST /api/naver/products/register {productId:cmp3afb450001gng5468w0qpc}. 통과 시 발행 완료 / 400 시 응답 invalidInputs[].name/message 그대로 보고 → Code 정밀 fix. |


### 2026-06-02 P0 달항아리 register 400 1순위 사유 확정 + dryRun (Code → Desktop, push 57dce53)

| 항목 | 상태 |
|---|---|
| Desktop 시도 결과 | 2026-06-02 06:10:22 KST POST /v2/products HTTP 400, [NAVER_DIAG] kind=HTTP_ERROR. Vercel MCP 로그 truncate로 본문 미확보. |
| Code 단정 | DB Product.category="uncategorized" + builder가 그 컬럼을 leafCategoryId로 전송 → 네이버 400 (1순위, 거의 확정). |
| Fix 출하 | product-builder leafCategoryId resolution을 naverCategoryCode(="50000963") 우선 + 8자리 numeric 가드. register route에 dryRun(payload echo, 네이버 호출 0) + NaverApiError catch → diagnostic 응답 노출. |
| dryRun 단정 | leafCategoryId=50000963 / shippingAddressId=106914714 / returnAddressId=106914715 / validation A/A 통과. |
| 2순위 의심 | productInfoProvidedNotice 미구현 (가구/인테리어 정보고시 필수 가능). |
| 3순위 의심 | afterServiceTelephoneNumber="고객센터 문의" 텍스트 (전화번호 형식 요구 가능). |
| 다음 (Desktop) | 대표 명시 승인 → POST /api/naver/products/register {productId:cmp3afb450001gng5468w0qpc} 재호출. 또 400 시 응답 JSON의 diagnostic.bodyHead 그대로 보고 → Code가 정확 fix. |
| 비가역 0 | 네이버 register 호출 0건, DRAFT 유지. dryRun은 네이버 호출 0. |


### 2026-06-02 P0 발행 선결 — 위탁배송 주소 기능 신설 + 진단 로깅 (Code → Desktop, baseline ac13be7)

| 항목 | 상태 |
|---|---|
| 발행 블로커 | StoreSettings.releaseAddressId/returnAddressId 정식 컬럼 부재 + 네이버 호출 fetch failed 원인 미확정 |
| Code 출하 | schema 3컬럼 신설 + Supabase ALTER 적용 + addressbooks/products·register/batch-register 정식 컬럼 read + api-client.ts NaverApiError·NaverFailKind 7분류 로깅 |
| 위험 격리 (#34) | 미커밋 schema diff의 legalApproval 삭제(#39) → stash@{0}로 격리 |
| 진단 운영 동선 | Desktop 대표 환경에서 (1) 판매자센터 → 판매자정보 → 배송정보 → 주소록 등록 (2) GET /api/naver/addressbooks (3) diagnostics 분기: IP_NOT_ALLOWED → Vercel Static IPs / RATE_LIMIT → backoff / NETWORK_RESET → keep-alive 점검 / success → 자동수거 예외처리 1:1 |
| 다음 단계 | 진단 결과 보고 → 분기별 후속 결정 → 대표 명시 승인 → 달항아리 register |
| 비가역 0 | 네이버 register 호출 0건. DRAFT 유지. |


**Last update**: 2026-06-01 (Desktop turn) — **UI/UX 통합재설계 Sprint 진행 중**. G8-ENGINE 이미지 파이프라인은 [보류 누적]으로 이관, 현재 메인 트랙 = 앱 전체 UI/UX 재설계(레트로 팝 가든 판타지 디자인 시스템).

### 진행 완료 (Desktop 전수 Chrome MCP 검증)
| Phase | 내용 | Commit |
|---|---|---|
| 1 | v6 토큰(Retro Pop Garden Fantasy) + 공통 셸 | 94de20e |
| 2-A-1 | SEO 편집 드로어 + 길이 게이지 + 중복 경고 | 03290ca |
| 2-A-1b | 드로어 wiring 복구 | 192264e |
| 2-A-2 | 키워드 검색량·경쟁강도 막대 | a973bcd |
| 2-A-3 | 발행 게이트 + 이미지 가이드 + UI 단일화 + 오타(꼬띠) | a791d0a |
| 2-A-3d | 미저장 draft 페이지레벨 전환 가드 | 76cd8b1 |
| 2-B-1 | 아틀리에 3분할 작업벤치 셸 | 0936a59 |
| 2-B-2 | 캔버스 4변형 그리드 + 드래그앤드롭 5상태 | 754d5c6 |
| 2-NAMING | DiagnosisCard S6/L2/persona/tone 한글 라벨 + 척도 + 툴팁 + 용어집 | 878d8fc |
| 2-MOBILE-2 | 아틀리에 모바일 캔버스 주화면 + 컨트롤 바텀시트(peek/expand) + SEO 드로어 모바일 전체화면 모달 | 0ebcd56 |
| 2-MOBILE-3 | 모바일 컨트롤 오버플로 4건(M1 헤더·M2 탭·M3 검색·M4 BulkFloatMenu) + P1~P3 설계 문서 | bd286ac |
| P0-excel-gaps | 네이버 엑셀 88칸 매핑: F1·F2·F3·F5 4건 [CLOSED] + F4 [정상동작 확정](템플릿 SoT 정합) | 0873b6a |

### ⭐ NEXT — 🖥 Desktop (선택) productInfoModel 충진 → 대표 승인 후 register (엑셀 경로 발행 안전)

| 항목 | 값 |
|---|---|
| **FROM** | 💻 Code (P0 엑셀 5건 검증 완료 + F4 오진단 정정 [docs only], 본 commit, 2026-06-02) |
| **TO** | 🖥 Desktop 새 채팅 — (a) [선택] productInfoModel 충진 (도어벨류 "해당없음" 관행) (b) 대표 명시 승인 후 register. 엑셀 경로 발행 안전 단정 (Desktop 독립검증 2026-06-02 통과) |
| **BASELINE** | 본 commit (origin/main, Vercel READY 예정) — 직전 0873b6a (엑셀 5건 수술) |
| **NEXT SCOPE** | (선택) productInfoModel 충진 + 대표 명시 승인 → register. publishReady=true 4축 + 카테고리 50000963 + 엑셀 F1/F2/F3/F5 통과 + F4 정상동작 확정 → 기술적 발행 차단 0. 권위: `docs/handoff/HANDOFF_excel_5fix_verify_f4_correction_2026-06-02.md` + `HANDOFF_naver_excel_mapping_gaps_2026-06-02.md` + `HANDOFF_moonjar_publish_ready_2026-06-02.md` |
| **PENDING** | (선택) productInfoModel 충진 / 달항아리 register 대표 승인 / 2-MOBILE-1·2·3·NAMING 모바일·툴팁·오버플로 실기기 육안(대표 휴대폰) / Firefly 프롬프트 복사 실동작 / G8-ENGINE 재개 / 명화송풍구 cutout 적재 / DEBT-01 SEO 4중컬럼(P3 발행 후) / DEBT-04 엑셀 buildDataRow 예방 가드(신규 NaverProductData 필드 추가 시 route.ts 동시 갱신) / 기존 PENDING 누적 |

### 권위 문서 (UI/UX Sprint, 정독 우선순위)
1. docs/research/GARDEN_DESIGN_BRIEF_2026-06.md (★레트로 팝 무드)
2. docs/research/GARDEN_CONCEPT_ANALYSIS_2026-06.md (정원 매핑·꼬띠 튤립·채팅 교훈)
3. docs/research/UIUX_INTEGRATED_DESIGN_SYSTEM_2026-06.md (디자인 시스템·로드맵)
4. docs/research/MOBILE_NAMING_FIREFLY_2026-06.md (모바일·명칭·Firefly 합성)
5. docs/handoff/UIUX_PROGRESS_HANDOFF_2026-06-01.md (진행 보드·중단 복구)

---

### [SUPERSEDED 2026-06-01 by UI/UX Sprint] 이전 ACTIVE — G8-ENGINE Q4 파이프라인 (보존, 향후 재개 진입점)

**Last update**: 2026-05-29 (Code turn, push f6ce373) — Phase G8-ENGINE-Q4 Adobe Workflow SOP 시스템화 + 누끼·합성 파이프라인 [코드 완료]. 상세 11항목 commit f6ce373 본문 참조. production 검증: 아이스트레이/명화송풍구 통과. TSC0/build0/verify-vercel exit0. 외부 이미지 API 런타임 0(#38). 비가역 0.

#### 다음 세션 진입점 (UI/UX Sprint 종료 후 재개) — 2026-05-30 Desktop 갱신

> **선행 [CLOSED]**: 명화송풍구 S6 backdrop 적재 + 라우터 모델 격상(commit 4e3c543)이 6/6 게이트 Desktop 실측 교차검증 통과. assetSource.backdrop=auto-cache 전환 + lifestyle 픽셀 Nano Banana Pro 씬 발현 육안 확인.
>
> **⭐ 아키텍처 결정 (2026-05-30, 리서치 docs/research/FIREFLY_AUTOMATION_RESEARCH_2026-05-30.md)**: Firefly 무인 자동화 반려. 채택 = 무인 적재 spine(생성=사람 1클릭, 이후 다운로드·VLM·service-role 적재·auto-cache 검증 무인화).

| 항목 | 값 |
|---|---|
| **FROM** | 🖥 Desktop (G8 backdrop 적재 + 라우터 격상 6/6 교차검증 [CLOSED], 2026-05-30) |
| **TO** | 향후 새 채팅 (UI/UX Sprint 종료 후) |
| **BASELINE** | 4e3c543 (G8-ENGINE 시점) |
| **NEXT SCOPE** | Lane 2(Adobe 이미지 생성 파이프라인) 설계 OR 달항아리 발행(대표 승인) |
| **PENDING** | 명화송풍구 cutout 소스 확보 / B-12 네이버 발행(대표 승인 후) / B-3 달항아리 카테고리·originCode 오염 / Claude MCP 워크플로 트랙 / Q5(Custom Models·Bulk Create) |

### [CLOSED 2026-05-30] 명화송풍구 S6 backdrop 적재 — 아래 SUPERSEDED 블록이 당초 계획, 6/6 검증 통과로 종결

## ~~⭐ ACTIVE~~ [SUPERSEDED 2026-05-30] 이전 ACTIVE — 대표 Firefly 배경 1장 → Code S6 적재 + auto-cache 검증

> **정정 메모 (production 실측)**: 아래 구 적재표는 명화송풍구를 S1/S4/S2로 추정했으나, POST /api/thumbnail/cmpnooli4 실호출 결과 실제 매칭은 **S6**(matchScore 62.5 비모호). 아이스트레이/달항아리도 적재 전 production 실호출로 skeletonId 실측 필수(추정 금지).

| 항목 | 값 |
|---|---|
| **FROM** | 🖥 Desktop (적재 사양 확정 + production 실측 + art_director_prompts 시드, 2026-05-30, 코드 0) |
| **TO** | (a) 🧑 대표 Firefly 배경 1장 생성 → (b) 💻 Code Storage 적재 + production 검증 |
| **BASELINE** | f6ce373 (origin/main, Vercel READY). 이번 turn 코드 변경 0 — 운영 적재 turn (커밋은 docs만) |
| **NEXT SCOPE** | 명화송풍구 cmpnooli40001f0gveaxr8iim **1건 real-win** (“10건”은 현 DB 미존재 — DRAFT 3건만 존재, 과장 금지). skeletonId=**S6** / baseTone=foreign-cinematic-sunlit / assetSource.backdrop=fallback(미적재) / legalGate clean(master_pd 우회). art_director_prompts adp_myeonghwa_lifestyle_s6_001(seed 760042026) 시드 완료. 대표님: Firefly Image 5 lifestyle 배경 1장 → ~/Downloads/myeonghwa_backdrop_S6.jpg. Code: `node scripts/upload-backdrop.js cmpnooli40001f0gveaxr8iim S6 ~/Downloads/myeonghwa_backdrop_S6.jpg` → POST /api/thumbnail/cmpnooli4 재호출로 assetSource.backdrop fallback→auto-cache 단정. 상세: docs/handoff/HANDOFF_g8_myeonghwa_backdrop_load_2026-05-30.md |
| **PENDING** | Q4 적재표 재산출(아이스트레이/달항아리 production 실호출 후 적재) / 명화송풍구 누끼 적재(선택, upload-cutout.js) / Real Win / B-3 달항아리 데이터 / 명화송풍구 B-12 발행 / Claude MCP 워크플로 트랙 / Q5(Custom Models·Bulk Create) |

### [SUPERSEDED 2026-05-30] 이전 ACTIVE — Desktop G8-ENGINE-Q4 Firefly 적재 + 누끼 합성 + 3종 검증

| 항목 | 값 |
|---|---|
| **FROM** | Code (G8-ENGINE-Q4 item 1-11 코드 완료 + production 검증, push f6ce373) |
| **TO** | Desktop 새 채팅 (Firefly 적재 10건 + Adobe Express 누끼 4종 + Composition 합성 + 3종 4변형 검증) |
| **BASELINE** | f6ce373 (origin/main, Vercel READY, production adobeWorkflow/cutoutStrategy/legalApproval 노출 확인) |
| **NEXT SCOPE** | (a) backdrop 적재 10건: 아이스트레이 S1/S4=Firefly_D, S2=Firefly_A, S5=Firefly_B, S6=Firefly_C / 명화송풍구 S1/S4/S2=Firefly_E_v2(자연광, 이전 다크 Firefly_E 폐기 — 적재 금지) / 달항아리 S1/S4=Firefly_F. `node scripts/upload-backdrop.js <id> <skeletonId> ~/Downloads/<file>`. (b) 명화송풍구 Adobe Express에서 4세트 비교컷 단품 4종 누끼 추출(cutoutStrategy=manual-upload 지시) -> Firefly Image 5 + Composition Reference로 Firefly_E_v2 배경 합성(동일 seed). (c) 3종 4변형 종합 before/after 육안 -> 통과 시 G8-ENGINE-Q4 [CLOSED]. 상세: docs/handoff/HANDOFF_g8_engine_q4_2026-05-29.md |
| **PENDING** | P0 아이스트레이 cutout(manual-upload — 760px 저해상이라 깨끗한 고해상 프레임 누끼 필요) / Real Win / B-3 달항아리 데이터 / 명화송풍구 발행 / Claude MCP 워크플로 트랙(CLAUDE_MCP_DESIGN_WORKFLOW) / Q5(Custom Models·Bulk Create) |

### 본 세션 (2026-05-27 Desktop) 명화송풍구 이미지 보강 + margin 교정 요약

| # | 작업 | 방법 | 결과 |
|---|---|---|---|
| 1 | 고해상도 원본 확보 | getItemView no=65322245 -> thumb.original(760) + desc.contents 화보 추출 | 화보 detail 1000x18291 확보 |
| 2 | 대표이미지 교체 (1차) | 760px -> Supabase 직접 UPDATE (B-5 우회) | L4 유지 (760은 업스케일본, 블러 severe) |
| 3 | 화보 4종컷 추출 | detail 화보 y=1300~1660 정사각 크롭 + 흰배경 패딩 -> Cloudinary signed upload | 1000x1000, 선명도 351.8 ok (760의 4.6배) |
| 4 | 대표이미지 교체 (2차) | Cloudinary URL -> Supabase 직접 UPDATE | P-Filter L2 도달, 그러나 최종 L4 (margin 범인) |
| 5 | margin 교정 (B-7 발현) | grading.ts `margin>=5 -> L4` 규칙 적발. 50.69 -> 2.03 (salePrice/supplierPrice) | **최종 L2 도달**, persist=true 영속화 |

시뮬레이션-실측 일치 검증: grading 로직 재현으로 margin 2.03 = L2 사전 예측 -> production 실측 L2 일치 (더블체크 통과).

### 본 세션 (2026-05-27 Code) B-4 진단 504 근본 복구 요약

| # | 가드 | 변경 파일 | 근거 |
|---|---|---|---|
| 1 | `export const maxDuration = 60` | `src/app/api/diagnose/route.ts` | 비-L4 풀 파이프라인 (P-Filter + watermark + CTI + grading + DB upsert)이 기본 10s Hobby 타임아웃 초과 가능. 다른 라우트 선례(`/api/crawler/bulk`, `/api/cron/inventory-sync`) 동일 |
| 2 | resolveBuffer fetch에 AbortController 15s timeout | `src/lib/diagnosis/image-quality.ts`, `src/lib/diagnosis/p-filter.ts` | bare `fetch()`는 기본 timeout 없음 → 도매꾹 CDN stall 시 함수 전체 hang. AbortError 명시 메시지로 변환 |
| 3 | tesseract `getWorker()` 8s init timeout + 실패 시 graceful fail | `src/lib/diagnosis/p-filter-watermark.ts` | createWorker 첫 호출 시 ~30MB 언어팩 다운로드, serverless cold start에서 stall 가능. 실패 시 캐시 promise reset + `{detected: false}` 반환으로 워터마크 무력화하되 파이프라인은 진행 |
| 4 | grading.ts `gradeProduct`에 NaN/Infinity 가드 (safeClamp) + 잘못된 skeletonId fallback | `src/lib/diagnosis/grading.ts` | 기존엔 범위 외 입력에 throw → uncaught exception 가능. 이제 clamp + S2 fallback으로 부드럽게 처리 |
| 5 | route.ts에서 CTI / gradeProduct 호출을 try/catch로 감싸 422 반환 | `src/app/api/diagnose/route.ts` | inferConceptTone (productName 빈 값) / gradeProduct가 throw해도 uncaught exception 없이 구조화된 에러 반환 |

가설 #1 정정: 핸드오프의 "inferConceptTone 외부 AI 호출" 가설은 틀림. 해당 함수는 순수 동기 규칙 기반(외부 호출 없음). 실 범인은 (a) maxDuration 미설정, (b) bare fetch / tesseract worker의 무한 대기 가능성, (c) CTI/grading 호출이 try/catch 미보호.

### 다음 세션 첫 행동 (Desktop)

1. STEP 0 점검 (HEAD = 본 commit, Vercel READY)
2. Chrome MCP로 production `/studio?product=cmpnooli40001f0gveaxr8iim` 진입
3. "AI 진단 실행" 버튼 → 504 없이 결과 카드 표시 (등급/골격/신뢰도/품질) 확인
4. 통과 시 `docs/handoff/HANDOFF_diagnose_timeout.md` 헤더 → `[CLOSED 2026-05-27]` + §7 ARCHIVED
5. L등급 분기로 등록 흐름 진행 (썸네일/상세/저장/카테고리·원산지/등록)
6. 통과 보고 후 Code 측이 부수버그 B-5~B-8 별도 커밋 진입

> 상세 근거: `docs/handoff/HANDOFF_diagnose_timeout.md`

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
