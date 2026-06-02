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
| **B-3** | **달항아리 도어벨 데이터 보정** (카테고리 코드 11_08_22_00_00 도매꾹 형식 → Naver `50000963` 교정 필요. 마진 정상 27200/20900) | Desktop Supabase UPDATE 위임 |

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
