# KKOTIUM GARDEN — ROADMAP

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
## 다음 새 채팅 시작 메시지 — 2026-05-30 Track B G8-ENGINE 명화송풍구 배경 적재 + auto-cache 검증 (Code) ⭐ ACTIVE

본 메시지를 다음 새 채팅의 첫 입력으로 사용하세요. 이중 트랙 핑퐁 (작업원칙 #41) 정합.
전제: 대표님이 Firefly로 ~/Downloads/myeonghwa_backdrop_S6.jpg 생성 완료 후 진입.

```
꽃틔움 가든 Code. Track B G8-ENGINE 명화송풍구 배경 적재 + auto-cache 전환 검증.
[STEP 0] CLAUDE.md 자동 + PROGRESS.md 헤더 + TASK_BRIDGE §3 ACTIVE +
  docs/handoff/HANDOFF_g8_myeonghwa_backdrop_load_2026-05-30.md 정독.
[베이스라인] f6ce373 (origin/main, Vercel READY). git status 확인.
  코드 변경 없음 — 이번 turn은 Storage 적재 + production 검증 운영 turn (커밋은 docs만).
[실측 단정 — Desktop production 호출로 확정] 명화송풍구 cmpnooli40001f0gveaxr8iim:
  skeletonId=S6(matchScore 62.5 비모호) / baseTone=foreign-cinematic-sunlit /
  assetSource.backdrop=fallback(미적재) / cutoutStrategy.source=product-additional /
  legalGate clean(master_pd 우회). art_director_prompts adp_myeonghwa_lifestyle_s6_001
  (seed 760042026) 시드 완료.
[SCOPE — 운영 적재 + 검증]:
  1. node scripts/upload-backdrop.js cmpnooli40001f0gveaxr8iim S6 ~/Downloads/myeonghwa_backdrop_S6.jpg
     -> UPLOAD_STATUS=200 + PUBLIC_URL=.../product-assets/cmpnooli40001f0gveaxr8iim/backdrop-S6.png 확인
  2. curl -s -X POST https://kkotium-garden.vercel.app/api/thumbnail/cmpnooli40001f0gveaxr8iim
     -H 'Content-Type: application/json' -d '{}'
     -> assetSource.backdrop이 fallback에서 auto-cache로 전환 + skeletonId 여전히 S6 단정
  3. (선택) 누끼도: node scripts/upload-cutout.js cmpnooli40001f0gveaxr8iim ~/Downloads/myeonghwa_cutout.png
     -> assetSource.cutout=auto-cache
  4. lifestyle 변형 outputs[3] 배경 육안 변화 보고(브랜드색 -> Firefly 씬). Desktop Chrome 재검증으로 인계.
[절대준수] heredoc 금지(#26) / 거짓 라벨 금지(#46 — 위 검증 게이트 전부 충족해야 [CLOSED]) /
  외부 이미지 API 런타임 호출 0(#38) / Production=Vercel only / SD-01 아랍어 footer 보존 /
  비가역 0(네이버 실발행 금지, DRAFT 유지). upload 스크립트는 Code 전용(.env.local service role).
[검증 통과 후] Desktop 새 채팅에서 4변형 육안 차별화 재확인 ->
  통과 시 Track A(명화송풍구 B-12 발행) 대표 승인 후 별도 채팅.
```

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
