# KKOTIUM GARDEN — ROADMAP

> **최종 업데이트**: 2026-05-13 Sprint 7-M2 Phase 2-b-2 — 이벤트/세트 트랙 5 렌더러 (5fe44d5, branch push 후 main merge 사용자 승인 대기)
> **HEAD**: 5fe44d5 (worktree) / origin/main c942b8e (Sprint 7-M2 Phase 2-b-1 + SESSION_LOG 분할 배포 완료) | **TSC**: 0 errors | **빌드**: 28/28 OK | **배포**: https://kkotium-garden.vercel.app
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
## 다음 새 채팅 시작 메시지 — 2026-05-13 (ko.json dict migration → Sprint 7-M2 Phase 2-b-3) ⭐ ACTIVE

본 메시지를 다음 새 채팅의 첫 입력으로 사용하세요. *컨텍스트 보호*를 위해 새 세션 권장.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 2-b-2 완료 (commit 5fe44d5):
- src/lib/automation/section-renderers/optionIntro.ts (S5)
- src/lib/automation/section-renderers/seasonalHook.ts (S8, KFTC date 카드 의무)
- src/lib/automation/section-renderers/options.ts (S8)
- src/lib/automation/section-renderers/eventDetails.ts (S11, KFTC 3 카드 의무)
- src/lib/automation/section-renderers/benefits.ts (S11, inline SVG glyphs + disclosure)
- section-copy.ts 5 신규 Groq 헬퍼
- S8·S11 완전 dedicated, dedicated 19/26 ids

본 세션 진입 작업 = ko.json dict migration 우선 + Sprint 7-M2 Phase 2-b-3:

STEP 0 — 환경 점검 (작업원칙 #21)
  특히 5fe44d5가 main에 머지/배포됐는지 verify-vercel-deploy.sh로 확인

STEP A — ko.json dict migration (작업원칙 #35 강제 적용)
  배경: 한글 fallback inline 누적 ~45건 (Phase 1 + 2-a + 2-b-1 + 2-b-2),
  작업원칙 #35 의 *대량 한글 작성 작업* 임계 30건을 이미 초과.
  Phase 2-b-3 + 2-b-4 진입 시 추가 ~25건 도입 예상.

  대상 파일 신규:
    - src/lib/automation/section-renderers/strings.ko.json (모든 fallback Korean strings)
    - src/lib/automation/section-renderers/strings.ts (loader + 키 typing)
    - scripts/verify-korean-dict.py (있으면 본 dict 검증에 포함)

  마이그레이션 패턴:
    1. 각 *Copy fallback 객체의 한글 strings를 strings.ko.json으로 추출
    2. 키 네이밍: "{slot}.{field}.{index?}" 예: "hero.title.default", "problem.bullets.1"
    3. section-copy.ts의 fallback 정의를 STRINGS.hero.title.default 등 키 참조로 교체
    4. 컨텍스트 보간 (${ctx.category} 같은) 은 strings.ts의 헬퍼 함수로 처리
    5. 검증: TSC 0 + verify-korean-dict.py NFC + FFFD + sentinel 모두 0건

STEP B — Sprint 7-M2 Phase 2-b-3 (감각/B2B 트랙) + 2-b-4
  대상 파일 신규 (7 렌더러):
    Phase 2-b-3 (감각 트랙):
      - material.ts (S9) — material macro + origin caption
      - styledShot.ts (S6) — 3 styled lifestyle shots
      - philosophy.ts (S10) — brand philosophy paragraph
      - detail.ts (S10) — detail macro grid 2x2
      - reviews.ts (S10) — 3 customer review cards
    Phase 2-b-3 (B2B 트랙):
      - specTable.ts (S12) — full-width spec table
      - specifications.ts (S12) — regulation + compliance grid
    Phase 2-b-4 (cleanup):
      - package.ts (S3) — package unboxing sequence

  7 렌더러 너무 많으면 sub-phase 추가 분할 권장:
    Phase 2-b-3-a: 감각 5 (material/styledShot/philosophy/detail/reviews)
    Phase 2-b-3-b: B2B 2 + S3 cleanup 1 = 3

  본 phase 완료 시 dedicated 26/26 ✅ 100% — 12 골격 모두 완전 dedicated.

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- 5fe44d5가 main에 도달했는지 verify-vercel-deploy.sh로 검증
- SESSION_LOG.md 534줄 (분할 후 슬림, T1 1000 미달) — 본 세션 직접 entry 추가 가능
- ko.json migration이 *Phase 2-b-3 진입 전 의무* — Phase 2-b-3 fallback 도입 시 dict 키 참조 패턴 사용

다음 = Sprint 7-M2 Phase 2-c (lifestyle-picker) + Sprint 7-M2 Phase 3
(/api/products/[id]/generate-detail route + Diagnosis 연동).

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward
merge 사용자 위임.
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M2 Phase 2-b-2: 이벤트/세트 트랙)~~ ✅ COMPLETED

> Sprint 7-M2 Phase 2-b-2 (이벤트/세트 트랙) completed on 2026-05-13 (commit 5fe44d5). S8 / S11 완전 dedicated. dedicated 19/26 섹션 ids.
> Phase 2-b-3 / 2-b-4 + ko.json migration = active handoff above. The message below is preserved for git history.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 2-b-1 완료 (commit fff2867):
- src/lib/automation/section-renderers/corePerformance.ts (S4)
- src/lib/automation/section-renderers/technology.ts (S7)
- src/lib/automation/section-renderers/clinical.ts (S7, KFTC strict)
- section-copy.ts 3 신규 Groq 헬퍼 (numeric value fabricate 0건)
- TSC 0, build 28/28, 한글 sentinel 0
- S4·S7 완전 dedicated 도달 (S1·S2와 함께 4 골격 완전)
- dedicated 14/26 섹션 ids

본 세션 진입 작업 = Sprint 7-M2 Phase 2-b-2 (이벤트/세트 트랙):

STEP 0 — 환경 점검 (작업원칙 #21)
  특히 fff2867이 main에 머지/배포됐는지 verify-vercel-deploy.sh로 확인

STEP 7-M2 Phase 2-b-2 — 5 렌더러 (S5/S8/S11 전용)
  대상 파일 신규:
    - optionIntro.ts (S5) — option grid with color chips (food/kids multi-pack)
    - seasonalHook.ts (S8) — seasonal banner + explicit date window (KFTC: 날짜
      범위 명시 의무, "마감 임박" 금지)
    - options.ts (S8) — option grid with thumbnail chips (single-line option spec)
    - eventDetails.ts (S11) — drop calendar + edition meta (limited collab)
    - benefits.ts (S11) — 3 perk cards with icons (시간 한정 혜택 — fair-trade
      phrasing 의무)

  필요 시 section-copy.ts에 4 신규 슬롯 추가:
    - generateOptionIntroCopy ({headline, options:[{name, sub}], helperLine})
    - generateSeasonalHook ({banner, dateWindow:{start, end}, hookLine})
    - generateOptionsTableCopy ({headline, rows:[{name, spec}]})
    - generateEventDetails ({headline, edition, dropDate, quantity, story})
    - generateBenefitsCopy ({headline, perks:[{title, body, iconHint}]})

  KFTC discipline 강화:
    - seasonalHook + eventDetails: 날짜 명시 의무, "선착순 N", "마감 임박" 금지
    - benefits: 시간 한정 혜택의 *시작-종료* 날짜 또는 *수량*을 명시
    - copy-writer dark pattern filter가 'scarcity' rule로 이미 차단 중 — 추가
      검증 의무 없음

  S5/S8/S11 골격 진입 후 dedicated 커버리지 변화:
    - S5: 1/4 → 2/4 (optionIntro)
    - S8: 3/5 → 5/5 ✅ (seasonalHook + options 추가)
    - S11: 2/4 → 4/4 ✅ (eventDetails + benefits 추가)

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- fff2867이 main에 도달했는지 verify-vercel-deploy.sh로 검증
- SESSION_LOG.md 1170+ 줄 추정 — 본 세션 STEP 0에서 분할 권고 (작업원칙
  #31 (a) T1 1000 권고 임계 초과, T2 1500 의무 임계 미달)
- 작업원칙 #35 한글 fallback 누적 ~32건 도달 시 ko.json 분리 권고 (현재 30건)

다음 = Sprint 7-M2 Phase 2-b-3 (감각/B2B 트랙, S9/S10/S12 전용 6 렌더러).

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward
merge 사용자 위임.
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M2 Phase 2-b: 15 골격 전용 렌더러)~~ ✅ PARTIAL (Phase 2-b-1 완료)

> Sprint 7-M2 Phase 2-b-1 (신뢰 트랙) completed on 2026-05-13 (commit fff2867). S4 / S7 완전 dedicated. dedicated 14/26 섹션 ids.
> Phase 2-b-2 / 2-b-3 / 2-b-4 = active handoff above. The message below is preserved for git history.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 2-a 완료 (commit 449719b):
- src/lib/automation/section-renderers/spec.ts, story.ts, product.ts,
  comparison.ts, warranty.ts, shipping.ts (6 공유 렌더러)
- section-copy.ts 5 신규 Groq 헬퍼 추가
- index.ts registry 갱신 (dedicated 11/26 섹션 ids)
- TSC 0, build 28/28, 한글 sentinel 0

골격별 dedicated 커버리지: S1 3/3 / S2 5/5 / S3 5/6 / S4 4/5 / S6 4/5 /
                          S7 4/6 / S9 3/4 / S12 3/5 / 나머지 부분 커버

본 세션 진입 작업 = Sprint 7-M2 Phase 2-b (15 골격 전용 렌더러):

STEP 0 — 환경 점검 (작업원칙 #21)
  특히 449719b가 main에 머지/배포됐는지 verify-vercel-deploy.sh로 확인

STEP 7-M2 Phase 2-b — 15 골격 전용 렌더러
  대상 파일 신규 (각 SectionRenderer 시그니처):
    - corePerformance.ts (S4) — 4 metric cards with units
    - technology.ts (S7) — mechanism diagram + caption
    - clinical.ts (S7) — bar chart + study meta (sample size / duration)
    - optionIntro.ts (S5) — option grid with color chips
    - styledShot.ts (S6) — 3 styled lifestyle shots
    - seasonalHook.ts (S8) — seasonal banner + date window
    - options.ts (S8) — option grid with thumbnail chips
    - material.ts (S9) — material macro + origin caption
    - philosophy.ts (S10) — brand philosophy paragraph
    - detail.ts (S10) — detail macro grid 2x2
    - reviews.ts (S10) — 3 customer review cards
    - eventDetails.ts (S11) — drop calendar + edition meta
    - benefits.ts (S11) — 3 perk cards with icons
    - specTable.ts (S12) — full-width spec table
    - specifications.ts (S12) — regulation + compliance grid
    - package.ts (S3) — package unboxing sequence

  필요 시 section-copy.ts에 신규 슬롯 추가 — JSON 출력 + filterDarkPatterns
  + 결정형 fallback 패턴 유지.

  15개 너무 많으면 sub-phase 추가 분할 권장:
    Phase 2-b-1: S4/S7 전용 (corePerformance/technology/clinical) — 신뢰 트랙
    Phase 2-b-2: S5/S8/S11 전용 (option/seasonalHook/options/eventDetails/benefits) — 이벤트/세트 트랙
    Phase 2-b-3: S9/S10/S12 전용 (material/philosophy/detail/reviews/specTable/specifications) — 감각/B2B 트랙
    Phase 2-b-4: S3 잔여 (package) — 1개

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- 449719b가 main에 도달했는지 verify-vercel-deploy.sh로 검증
- SESSION_LOG.md T1 1000 임박 상태 — 본 세션 STEP 0에서 분할 권고/의무
  판단 후 진행 (작업원칙 #31 (a) T1 임계 도달 또는 초과)

다음 Sprint 7-M2 Phase 2-c (lifestyle-picker) + Phase 3 (API route)는
별도 세션에서 진행 권장.

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward
merge 사용자 위임.
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M2 Phase 2: 21 잔여 렌더러 + lifestyle-picker)~~ ✅ PARTIAL (Phase 2-a 완료)

> Sprint 7-M2 Phase 2-a (6 공유 렌더러) completed on 2026-05-13 (commit 449719b). dedicated 11/26 섹션 ids.
> Phase 2-b/2-c = active handoff above. The message below is preserved for git history.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M2 Phase 1 완료 (commit 993098f):
- src/lib/automation/section-renderers/ (10 신규 파일)
- types.ts + section-copy.ts + _placeholder.ts + hero/problem/solution/usage/cta + index.ts
- src/lib/automation/section-builder.ts (top-level orchestrator)
- S2 주력 5 섹션 end-to-end + 21 나머지 ids는 _placeholder safety net
- 1,306 LOC, TSC 0, build 28/28, 한글 sentinel 0

본 세션 진입 작업 = Sprint 7-M2 Phase 2 (21 잔여 렌더러 + lifestyle-picker):

STEP 0 — 환경 점검 (작업원칙 #21)
  특히 993098f가 main에 머지/배포됐는지 verify-vercel-deploy.sh로 확인

STEP 7-M2 Phase 2 — 21 잔여 렌더러 + lifestyle-picker
  대상 파일 신규:
    section-renderers/:
      - spec.ts (S1/S3/S6 공유, 2-column 스펙 테이블)
      - story.ts (S3/S6/S10 공유, editorial paragraph + signature shot)
      - product.ts (S3/S8 공유, product detail grid 2x2)
      - package.ts (S3, package unboxing sequence)
      - corePerformance.ts (S4, 4 metric cards)
      - comparison.ts (S4/S7 공유, comparison table)
      - warranty.ts (S4/S7 공유, warranty terms + cert logos)
      - optionIntro.ts (S5, option grid with color chips)
      - styledShot.ts (S6, 3 styled lifestyle shots)
      - technology.ts (S7, mechanism diagram + caption)
      - clinical.ts (S7, bar chart + study meta)
      - seasonalHook.ts (S8, seasonal banner + date window)
      - options.ts (S8, option grid with thumbnail chips)
      - material.ts (S9, material macro + origin caption)
      - shipping.ts (S1/S9/S12 공유, shipping + return + recyclable badge)
      - philosophy.ts (S10, brand philosophy paragraph)
      - detail.ts (S10, detail macro grid 2x2)
      - reviews.ts (S10, 3 customer review cards)
      - eventDetails.ts (S11, drop calendar + edition meta)
      - benefits.ts (S11, 3 perk cards)
      - specTable.ts (S12, full-width spec table)
      - specifications.ts (S12, regulation + compliance grid)

    automation/:
      - lifestyle-picker.ts (LifestyleAsset 30일 cooldown + 태그 매칭 알고리즘)

  각 renderer = SectionRenderer 시그니처 준수.
  필요 시 section-copy.ts에 신규 슬롯 (storyParagraph / specRows / benefitItems
  등) 추가 — JSON 출력 + filterDarkPatterns + 결정형 fallback.

  21개 너무 많으면 sub-phase 추가 분할 권장:
    Phase 2-a: 공유 렌더러 6개 (spec/story/product/comparison/warranty/shipping)
    Phase 2-b: 골격 전용 렌더러 15개
    Phase 2-c: lifestyle-picker

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- 993098f가 main에 도달했는지 verify-vercel-deploy.sh로 검증
- SESSION_LOG.md 임박 분할 — T1 1000 도달 직후 (~1020 줄). 본 세션 STEP 0에서
  분할 권고/의무 판단 후 진행 (작업원칙 #31 (a)).

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward merge 사용자 위임.
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M2: 5섹션 상세페이지 빌더)~~ ✅ PARTIAL (Phase 1 완료)

> Sprint 7-M2 Phase 1 (5섹션 빌더 + S2 5 렌더러) completed on 2026-05-13 (commit 993098f). 10 신규 파일 1,306 LOC, npm run build 28/28, S2 주력 골격 end-to-end + 21 나머지 ids placeholder safety net.
> Phase 2/3 = active handoff above. The message below is preserved for git history.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-M1 썸네일 자동화 4변형 완료 (commit 9bedaaf):
- src/lib/automation/skeleton-matcher.ts (SKELETONS 8축 점수화)
- src/lib/automation/sharp-composite.ts (Buffer 빌딩블록 8개)
- src/lib/automation/cloudinary-pipeline.ts (fetch-mode URL builder)
- src/lib/automation/copy-writer.ts (Groq + 다크패턴 6 규칙)
- src/lib/automation/thumbnail-generator.ts (4변형 orchestrator)
- src/app/api/thumbnail/[sku]/route.ts (POST endpoint)
- 1,424 LOC, TSC 0, build 28/28 + ƒ /api/thumbnail/[sku], 코드 한글 0건

본 세션 진입 작업 = Sprint 7-M2 (5섹션 상세페이지 빌더):

STEP 0 — 환경 점검 (작업원칙 #21)
  특히 9bedaaf가 main에 머지/배포됐는지 verify-vercel-deploy.sh로 확인

STEP 7-M2 — 5섹션 가변 상세페이지 빌더
  대상 파일 신규:
    - src/lib/automation/section-builder.ts (entry: 골격별 sections[] consume → 합성)
    - src/lib/automation/lifestyle-picker.ts (LifestyleAsset 30일 cooldown + 태그 매칭)
    - src/lib/automation/section-renderers/ (폴더, 섹션 id별 renderer)
        ├── hero.ts
        ├── problem.ts
        ├── solution.ts
        ├── usage.ts
        ├── cta.ts
        ├── spec.ts (S1/S3/S6 공유)
        ├── story.ts (S3/S6/S10 공유)
        ├── corePerformance.ts (S4)
        ├── comparison.ts (S4/S7)
        ├── warranty.ts (S4/S7)
        ├── optionIntro.ts (S5)
        ├── styledShot.ts (S6)
        ├── technology.ts (S7)
        ├── clinical.ts (S7)
        ├── seasonalHook.ts (S8)
        ├── product.ts (S3/S8)
        ├── options.ts (S8)
        ├── material.ts (S9)
        ├── shipping.ts (S1/S9/S12 공유)
        ├── philosophy.ts (S10)
        ├── detail.ts (S10)
        ├── reviews.ts (S10)
        ├── eventDetails.ts (S11)
        ├── benefits.ts (S11)
        ├── specTable.ts (S12)
        ├── package.ts (S3)
        └── specifications.ts (S12)
    - src/app/api/products/[id]/generate-detail/route.ts (POST: 단일 상품 상세페이지 합성)

  각 섹션 renderer = (skeleton: SkeletonSpec, section: SectionSpec, ctx: ProductContext, copy: SectionCopy) => Promise<Buffer>.
  section-builder는 골격의 sections[] 순회 + 각 renderer 호출 + 수직 stacking 합성 (Sharp).
  copy-writer.ts에 section-specific slot 추가 (heroTitle / problemBullets / solutionBenefits 등).

  Skills frontend-design / canvas-design 활용 권장 (Artifacts 검수 위젯 = Sprint Y-2 DetailPagePreview).

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- Sprint 7-M1 commit 9bedaaf가 main에 도달했는지 verify-vercel-deploy.sh로 검증
- 26+ 섹션 renderer 일괄 생성 시 작업원칙 #24 (한 turn 안에) 무리하지 말고 sub-phase 분할 권장:
    Phase 1: section-builder.ts + 5 핵심 렌더러 (hero/problem/solution/usage/cta = S2 주력)
    Phase 2: 나머지 21 렌더러 + lifestyle-picker
    Phase 3: /api/products/[id]/generate-detail route + Diagnosis 연동

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 차단 시 fast-forward merge 사용자 위임.
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-M1: 썸네일 자동화 4변형)~~ ✅ COMPLETED

> Sprint 7-M1 썸네일 4변형 completed on 2026-05-13 (commit 9bedaaf). 6 신규 파일 1,424 LOC, npm run build 28/28 + ƒ /api/thumbnail/[sku], 다크패턴 6 규칙 + 작업원칙 #38 strict 준수.
> The message below is preserved for git history. Use the ACTIVE message above.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 작업 = Sprint 7-Skel 12 골격 spec 완료 (commit a29e8c5):
- src/lib/automation/layout-skeletons/ (신규 13 파일)
- index.ts module-load invariant로 grading.SKELETON_SECTIONS와 정합성 자동 검증
- 12개 SkeletonSpec 객체 (S1~S12) 각 matchSignature 8축 + sections[] + colorTokens
- npm run build 28/28 통과, 코드 내 한글 0건

본 세션 진입 작업 = Sprint 7-M1 (썸네일 자동화 4변형):

STEP 0 — 환경 점검 (작업원칙 #21)
  특히 a29e8c5가 main에 머지/배포됐는지 verify-vercel-deploy.sh로 확인

STEP 7-M1 — 썸네일 4변형 자동 생성기
  대상 파일 신규:
    - src/lib/automation/thumbnail-generator.ts (4변형 entry, clean/price/badge/lifestyle)
    - src/lib/automation/cloudinary-pipeline.ts (named transformation wrapper)
    - src/lib/automation/sharp-composite.ts (Sharp 합성 빌딩블록)
    - src/lib/automation/copy-writer.ts (Groq 카피 + 다크패턴 정규식 필터)
    - src/lib/automation/skeleton-matcher.ts (SkeletonSpec.matchSignature consume,
      ConceptTone → SkeletonId scoring; 현재 concept-tone-inference.ts 안의
      단순 if 트리를 SKELETONS 컬렉션 기반 점수화로 강화)
    - src/app/api/thumbnail/[sku]/route.ts (POST: 4변형 일괄 생성)

  각 변형 = 골격 colorTokens + 텍스트 오버레이 + 도매꾹 원본 이미지 합성:
    - clean    누끼 + 흰 배경 + 상품명만
    - price    누끼 + 가격 강조 배지
    - badge    누끼 + 카테고리/시즌 배지 (S8/S11 골격 활용)
    - lifestyle Supabase Storage 라이프스타일 컷 + 상품 오버레이 (S2/S6/S9/S10)

  4변형 미리보기 = Claude Artifacts skill canvas-design 활용 권장 (Sprint 7-M2 합성 빌더 결과를 사전 시각화).

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- Sprint 7-Skel commit a29e8c5가 main에 도달했는지 verify-vercel-deploy.sh로 검증
- skeleton-matcher 강화 시 SKELETONS[id].matchSignature를 점수화 함수에 직접 consume
  (단순 wildcard match → 가중 점수 + tie-breaking 디폴트 S2)

작업원칙 절대 준수 — 평소와 동일. main 직접 push 정책 확인 의무 (직전 세션 turn에서 차단 1회).
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-13 (Sprint 7-Skel: 12 골격 JSON 정의)~~ ✅ COMPLETED

> Sprint 7-Skel 12 골격 spec completed on 2026-05-13 (commit a29e8c5). 13 신규 파일, npm run build 통과, section id 정합성 invariant 자동 검증.
> The message below is preserved for git history. Use the ACTIVE message above.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md,
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고
docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 정독 후
현재 상태를 파악한 후 브리핑해주세요.

직전 commit은 df66111 (Sprint 7-Diag MVP Phase 2-B — diagnose pipeline end-to-end).
누적 Sprint 7-Diag 완료 = 4 commit (0dd3bbd / d98a11c / df66111 + 본 docs entry).
Production functional test 3 PDF 예시 정확 매칭 확인 (S5 / S10 / S4).

본 세션 진입 작업 = Sprint 7-Skel:

STEP 0 — 환경 점검 (작업원칙 #21)
STEP 7-Skel — 12 골격 JSON 정의 + skeleton-matcher 강화
  대상 파일 신규:
    - src/lib/automation/layout-skeletons/index.ts
      (S1~S12 export + SkeletonSpec 타입 + SkeletonId 재export)
    - src/lib/automation/layout-skeletons/s1-budget-daily-single.ts
    - src/lib/automation/layout-skeletons/s2-standard-daily-options.ts (주력)
    - src/lib/automation/layout-skeletons/s3-premium-gift-set.ts
    - src/lib/automation/layout-skeletons/s4-standard-pro-single.ts
    - src/lib/automation/layout-skeletons/s5-budget-daily-set.ts
    - src/lib/automation/layout-skeletons/s6-standard-gift-single.ts
    - src/lib/automation/layout-skeletons/s7-premium-pro-single.ts
    - src/lib/automation/layout-skeletons/s8-standard-event-set.ts
    - src/lib/automation/layout-skeletons/s9-budget-daily-natural.ts
    - src/lib/automation/layout-skeletons/s10-premium-daily-options.ts
    - src/lib/automation/layout-skeletons/s11-standard-event-vintage.ts
    - src/lib/automation/layout-skeletons/s12-budget-pro-options.ts

  각 골격 파일은 SMART_ASSET_WORKFLOW Section 4 매트릭스 + S2 yaml 예시
  (라인 101~143) 패턴 따라 SkeletonSpec 객체 export:
    - description (한 줄)
    - matchSignature (concept + tone 시그니처)
    - sections: SectionSpec[] (id, height, layout, copy_tone, bg_color_token)
    - total_height, width
    - color_tokens (primary/secondary/accent)
    - fonts (title + body)
    - copy_global_tone

  Skills theme-factory 활용 일괄 생성 시도 권장 (한 세션 안에 12개).

진입 전 확인:
- 5 plan MD 정독 + SMART_ASSET_WORKFLOW 정독
- 본 v3.1 패키지 Section 4-A 분포 (sapling 80% S1/S2/S5) + 4-B 확장성 (S13+)
  + 4-C 작동 예시 (skeleton-matcher 검증 시드) 모두 참조 의무
- SKELETON_SECTIONS (grading.ts) 와 신규 SkeletonSpec.sections 정합성 유지

작업원칙 절대 준수 — 평소와 동일.
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-12 (v3.1 FINAL 채택 후 7-Diag 진입)~~ ✅ COMPLETED

> Sprint 7-Diag MVP completed on 2026-05-13 (commit df66111). Production functional test passed: 3 PDF cases (S5 / S10 / S4) matched exactly.
> The message below is preserved for git history. Use the ACTIVE message above.


본 메시지를 다음 새 채팅의 첫 입력으로 사용하세요.

```
꽃틔움 가든 개발 이어서 진행합니다. docs/plan/PROGRESS.md, ROADMAP.md, 
SESSION_LOG.md, SPRINT_PLAN.md, PRINCIPLES_LEARNED.md를 모두 읽고 
현재 상태를 파악한 후 브리핑해주세요.

직전 docs commit은 4b58a52 (v3.1 FINAL adoption).
직전 작업은 'v3.1 FINAL docs 일괄 갱신' (docs-only).

본 세션 진입 작업:

STEP 0 — 환경 점검 (작업원칙 #21)
STEP 7-Diag — 진단 모듈 MVP 본격 코드 작업
  대상 파일 신규/수정:
    - src/lib/diagnosis/concept-tone-inference.ts (신규)
    - src/lib/diagnosis/image-quality.ts (신규, Sharp 4축)
    - src/lib/diagnosis/grading.ts (신규, L1~L4 + CTI 통합)
    - src/lib/diagnosis/prompts/vision-quality-prompt.ts (신규, Claude Vision 보강용)
    - prisma/schema.prisma (Diagnosis 모델 추가, ConceptTone JSON 필드)
    - app/api/diagnose/route.ts (신규, 동기 처리 1초 미만 목표)
  
  CTI 8축은 본 진입 작업의 핵심.
  구체 명세는 docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md 참조.

진입 전 확인:
- 5개 MD 정독 + 신규 research 문서 정독
- ANTHROPIC_API_KEY 도입 시 환경변수 보안 체크리스트 12개 항목 적용 (research 문서 Appendix E)
- 7-Skel(12 골격 정의)은 본 세션에서 Skills theme-factory 활용해 한 번에 일괄 생성 시도

작업원칙 절대 준수 — 평소와 동일.
```

---

## ~~다음 새 채팅 시작 메시지 — 2026-05-11 (Sprint X 채택 후) ✅~~ (deprecated, 2026-05-12 v3.1 FINAL 채택으로 폐기)

*아래 메시지는 v3.1 FINAL 채택 전 버전입니다. 위의 ACTIVE 메시지를 사용하세요. 본 섹션은 변경 이력 보존 목적으로만 남깁니다.*

(직전 'Sprint X' 인계 메시지 본문은 그대로 보존)

---

---

## 다음 새 채팅 시작 메시지 — 2026-05-12 Sprint X (v2.0 아키텍처 채택 + Gemini 제거 + 정적 자산 라이브러리)


> **DEPRECATED** — 2026-05-12 v3.1 FINAL adoption. Use the ACTIVE message above. This section preserved for git history only.
<!-- sprint-x-handoff-short v1 -->

```
꽃틔움 가든 — Sprint X (v2.0 아키텍처 채택) 시작.

docs/plan/PROGRESS.md (슬림 진입점) → ROADMAP.md → SESSION_LOG.md 정독. 본 Sprint는 사용자 제공 리서치 v2.0 채택이라 *반드시 docs/research/KKOTIUM_V2_ARCHITECTURE_2026_05.md 전체 정독 의무*. PRINCIPLES_LEARNED.md 작업원칙 #37 신규 정독. SPRINT_PLAN.md Sprint X / Y / Z 정의 정독. STEP 0 환경 점검 후 현재 상태 + Sprint X 디테일 계획 + Day 1~7 분할 권장안을 브리핑해주세요. 본 작업 시작은 제 Y/N 승인 후 진행.

[STEP 0 환경 점검]
git rev-parse HEAD origin/main && \
  git status --short && \
  git stash list && \
  wc -l docs/plan/*.md && \
  curl -sIo /dev/null -w "Vercel HTTP: %{http_code}\n" https://kkotium-garden.vercel.app/dashboard && \
  echo "Latest prod deploy SHA: $(gh api 'repos/kkotium-dot/kkotium-garden/deployments?environment=Production&per_page=1' --jq '.[0].sha[0:7]')" && \
  scripts/verify-vercel-deploy.sh

[v2.0 아키텍처 핵심 메시지 — 정독 후 반드시 인지]
- "Vercel 런타임 = 정적 자산 + 안전한 서버 연산만"
- "Production runtime never calls image generation APIs" (작업원칙 #37)
- 2-Phase 분리:
  • Phase 1 (Creative): Claude Web Pro Max 세션 — Adobe MCP / Canva MCP / Artifacts. 신규 카테고리·시즌·A급 단건. API 키 노출 위험 0.
  • Phase 2 (Production): Vercel 런타임. Groq만 사용. 일 10~100건 자동.
- Gemini 완전 제거 — 비용 77% 절감 + 자동 폐기 사고 0회 절감

[Sprint 7 P0/P1 + P0-B enhancement 완료 정리]
- P0-A 옵션 정확도 / P0-B 골든윈도우 + DataLab market context / P0-C 효자상품 ✅
- P1-A 카테고리 1페이지 일치율 / P1-B 금기어 페널티 / P1-C 태그 사전 등재 검증 ✅
- 브라우저 E2E 검증 완료 (Claude Preview MCP, 3 시나리오)
- production a495572 → f958bb0 (MD only)

[Sprint X 작업 범위 — 7일 액션 플랜 분할 권장]
**디자이너 작업 (사용자 Claude Web 세션에서, Day 1~3)**:
- Day 1: Adobe MCP search_design + create_firefly_board로 카테고리별 템플릿 + 무드보드 + Lightroom 50장 큐레이션 → Supabase Storage 업로드
- Day 2: 5섹션 마스터 PSD 제작 (Photoshop Variables 정의)
- Day 3: Lightroom 마스터 프리셋 (카테고리 5-7개)

**본 앱 코드 작업 (Day 4~7)**:
- **Day 4 우선** (Sprint X 첫 본 세션):
  • 신규 src/lib/image/cloudinary.ts (누끼 + 패딩 빌더)
  • 신규 src/lib/image/sharp-composite.ts (5섹션 합성)
  • 신규 src/lib/image/lifestyle-picker.ts (Supabase Storage 인덱스 기반 선택기)
  • Gemini 의존성 제거 — /api/category/suggest의 suggestWithGemini() 함수 제거 + .env.local 3개 변수 제거 + Vercel env 제거
  • TSC 0 errors 확인
- Day 5: Groq 카피라이팅 + 다크패턴 정규식 필터 강화
- Day 6: A/B/C 분류 알고리즘 + 검수 위젯 (Claude Artifacts 4.1/4.4 본 앱 구현체)
- Day 7: 네이버 커머스 API 연동 + 첫 C급 일괄 등록

[Sprint Y / Sprint Z 후속 (Sprint X 완료 후 별도 세션)]
- Sprint Y: 5섹션 상세페이지 자동 생성 (Sharp + Groq + 다크패턴 + DetailPagePreview + ABCSimulator + BatchProgressMonitor)
- Sprint Z: 라이프스타일 큐레이션 + DesignTokenPanel + 보안 체크리스트 자동 검증 스크립트

[페르소나]
B2B 이커머스 ERP + 네이버 파워셀러 + UI/UX 시니어. 단독 IA/삭제 결정 금지. Sprint X Day 4 작업 시 *각 신규 lib 파일별로 사용자 명시 승인 단계 진행* — Sharp / Cloudinary 합성 결과 시각 검증 단계가 핵심.

[중요 — 본 Sprint는 7일짜리 분할 의무]
v2.0 PDF의 7일 액션 플랜은 "한 세션에 모두" 가 아닌 *Day 단위 분할*. Sprint X 첫 세션 = Day 4 본 앱 코드 작업만 (Day 1~3은 사용자 디자이너 작업이며 본 앱 작업 의존성 없음, 병렬 진행). Day 5/6/7 각각 별도 세션 권장.

[제한사항 정직 보고]
- Adobe Firefly Services API: 라이선스 차단 확정 (Adobe Developer Console "License required" 메시지). v2.0 PDF의 Phase 1 Adobe MCP path는 사용자가 *Claude Web Pro Max + Adobe MCP* 통해 진행 (Vercel API 통합 불가).
- 본 세션은 사용자가 직접 Claude Web 세션에서 Adobe MCP 사용 가능한지 확인 후 Day 1~3 작업 병렬 시작.
- 본 앱은 Day 4부터 코드 작업 진행, 정적 자산이 Supabase Storage에 채워지면 자동으로 활성화.

[주의 — 작업원칙 위반 학습]
worktree vs main 절대 경로 혼동 사고 누적 3회 (Phase 3 이전). Phase 4 + Phase 5 + Sprint 7 P0/P1 누적 0회 — Edit/Write 호출 시 절대 경로 시작이 워크트리 prefix `/Users/jyekkot/Desktop/kkotium-garden/.claude/worktrees/<name>/`인지 *매 호출 확인 의무*.

[silent failure 학습 — 2회 발견 패턴]
"API 키 다 등록했는데 실제 작동하나?" 의문이 silent bug 발견의 핵심 트리거. Sprint X Day 4에서 Gemini 의존성 제거 후에도 *Cloudinary + Groq + Supabase Storage 모든 path functional test 의무*. 본 v2.0 채택의 핵심 가치 (보안 표면 0)가 실제 production에서 작동하는지 production curl + 브라우저 E2E로 매 commit 검증.
```

---
## 직전 인계 메시지 — Sprint 7 Track B AI Studio (취소됨 — v2.0 아키텍처 채택으로 Sprint X로 대체)

<!-- sprint-7-trackb-handoff-short v1 -->

```
꽃틔움 가든 — Sprint 7 Track B (AI Studio) 시작.

docs/plan/PROGRESS.md (슬림 진입점) → ROADMAP.md → SESSION_LOG.md 정독. 필요 시 PRINCIPLES_LEARNED.md / PRINCIPLES_CODE.md / SPRINT_PLAN.md / REFERENCES.md spot-read. STEP 0 환경 점검 후 현재 상태 + Track B 디테일 계획을 브리핑해주세요. 본 작업 시작은 제 Y/N 승인 후 진행.

[STEP 0 환경 점검]
git rev-parse HEAD origin/main && \
  git status --short && \
  git stash list && \
  wc -l docs/plan/*.md && \
  curl -sIo /dev/null -w "Vercel HTTP: %{http_code}\n" https://kkotium-garden.vercel.app/dashboard && \
  echo "Latest prod deploy SHA: $(gh api 'repos/kkotium-dot/kkotium-garden/deployments?environment=Production&per_page=1' --jq '.[0].sha[0:7]')" && \
  scripts/verify-vercel-deploy.sh

[Sprint 7 P0 + P1 완료 정리]
- P0-A 옵션 정확도 / P0-B 골든윈도우 / P0-C 효자상품 (Inbox 4 placeholders 모두 live)
- P0-B enhancement: DataLab market context cache + silent 10→3 chunked bug fix
- P1-A 카테고리 1페이지 일치율 검증 — Naver Shopping search API 통합. agreed/override/synthesized 3 모드
- P1-B 상품명 금기어 페널티 — banned_word 15개 + duplicate + special_chars + length 4 rule. NameRulesPanel 인라인 발화
- P1-C 태그 사전 등재 검증 — Search Ad keyword volume proxy + threshold 30/10. TagVerificationPanel 수동 trigger
- **브라우저 E2E 검증 완료** (Claude Preview MCP) — 3 입력 시나리오 / 카테고리 자동 추천 / 태그 검증 panel 모두 실제 작동 확인
- production a495572

[Sprint 7 Track B AI Studio 작업 범위]
**M1 썸네일 (AI 이미지 생성/편집)** — 도매꾹 원본 이미지 → AI 배경 제거 + 깨끗한 흰배경 + 텍스트 추가
- Adobe Firefly / Imagen / Cloudinary AI transforms 검토 (이미 NEXT_PUBLIC_CLOUDINARY_* 환경변수 보유)
- `src/lib/ai-image/thumbnail-generator.ts` (신규)
- `씨앗 심기` 이미지 업로드 영역에 "AI 썸네일 자동 생성" 버튼

**M2 상세페이지 5섹션** — AI가 자동 생성하는 상세페이지 구조
- 5섹션: 후킹 / 핵심특징 / 사용법 / 스펙 / 신뢰
- 기존 `aeo_content` 필드 + 기존 `seo_hook_text` 활용
- AI 호출 Gemini → Groq fallback (기존 패턴)

**M3 어도비 통합** — Adobe MCP / Adobe Firefly API 통합 가능성 검토
- 현재 NEXT_PUBLIC_CLOUDINARY로 단순 이미지 변환만
- Adobe Firefly API 키 사용자 보유 여부 사전 확인 필요

**M4 A/B 테스트** — 썸네일/상세페이지 변형 2개를 동시 등록 후 CTR/전환율 비교
- 사용자 첫 상품 등록 + 7일+ 실 데이터 누적 필요 — 본 Sprint에서는 *infrastructure*만, 검증은 보류

[페르소나]
B2B 이커머스 ERP + 네이버 파워셀러 + UI/UX 시니어. 단독 IA/삭제 결정 금지. M3 어도비 통합 깊이 (Cloudinary로 충분 vs Firefly 풀 통합) 결정은 사용자 위임 (API 키 확인 필요).

[참고 — MD 분할 권고]
SESSION_LOG.md 현재 ~1400줄 (T1 1000 초과, T2 1500 미달). Track B 진입 시 자동 분할 권장.

[주의 — 작업원칙 위반 학습]
worktree vs main 절대 경로 혼동 사고 누적 3회 (Phase 3 이전). Phase 4 + Phase 5 + Sprint 7 P0/P1 누적 0회 — Edit/Write 호출 시 절대 경로 시작이 워크트리 prefix `/Users/jyekkot/Desktop/kkotium-garden/.claude/worktrees/<name>/`인지 *매 호출 확인 의무*.

[silent failure 패턴 학습]
Sprint 7 P0-B에서 DataLab 10→3 chunk 실패, Sprint 7 P1-A에서 NAVER_CLIENT_ID Open API 401 모두 functional test에서만 발견됨. *"API 키 다 등록했는데 실제 작동하나?"* 의 의문이 silent bug 발견의 핵심 트리거. Track B AI Studio 진입 시 사용자 등록된 Cloudinary + Adobe / Firefly 키도 *동일하게 functional test로 작동 검증 의무*.
```

---
## 직전 인계 메시지 — Sprint 7 P1 (참고용, 완료됨)

<!-- sprint-7-p1-handoff-short v1 -->

```
꽃틔움 가든 — Sprint 7 P1 시작.

docs/plan/PROGRESS.md (슬림 진입점) → ROADMAP.md → SESSION_LOG.md 정독. 필요 시 PRINCIPLES_LEARNED.md / PRINCIPLES_CODE.md / SPRINT_PLAN.md / REFERENCES.md spot-read. 아래 STEP 0 환경 점검 후 현재 상태 + P1 디테일 계획을 브리핑해주세요. 본 작업 시작은 제 Y/N 승인 후 진행.

[STEP 0 환경 점검]
git rev-parse HEAD origin/main && \
  git status --short && \
  git stash list && \
  wc -l docs/plan/*.md && \
  curl -sIo /dev/null -w "Vercel HTTP: %{http_code}\n" https://kkotium-garden.vercel.app/dashboard && \
  echo "Latest prod deploy SHA: $(gh api 'repos/kkotium-dot/kkotium-garden/deployments?environment=Production&per_page=1' --jq '.[0].sha[0:7]')" && \
  scripts/verify-vercel-deploy.sh

[Sprint 7 P0 완료 정리]
- P0-A 옵션 정확도 — option-integrity.ts (hashOptions + validateStatus/Channel + evaluateIntegrity), /api/crawler/domemae returns integrityFlags, /crawl IntegrityBanner
- P0-B 골든 윈도우 — golden-window-tracker.ts (D+1/3/7 stages), /api/golden-window/active, GoldenWindowWidget (Inbox 3rd placeholder 교체)
- P0-C 효자 상품 — pareto-analyzer.ts (30-day OrderItem aggregation), /api/products/pareto, TopProductsCard 활성화 (Section 3), ParetoInboxRow (Inbox 4th placeholder 교체)
- automation-registry: golden-window + pareto-recalc pending → active (on-event)
- production 8c477ee

[Sprint 7 P1 작업 범위]
- **P1-A 카테고리 1페이지 일치율 검증** (리서치 6번)
  • `src/lib/category-page-validator.ts` (신규) — 네이버 쇼핑 1페이지 카테고리 분포 분석 → 80%+ 일치 카테고리만 추천
  • `/api/category/suggest` 강화 — Phase 5 cache layer 위에 1페이지 일치율 검증 추가
  • automation-registry: category-1page pending → active
- **P1-B 상품명 금기어 페널티 강화** (리서치 4번)
  • `src/lib/honey-score.ts` 강화 — 이벤트/할인/배송/적립/쿠폰 키워드 + 중복 단어 3회+ + 허용 외 특수문자 명시적 검출
  • 씨앗 심기 / 검색 조련사 UI에 빨간 알림 추가
- **P1-C 태그 사전 등재 검증** (리서치 7번)
  • `src/lib/naver/tag-dictionary.ts` (신규) — 네이버 검색광고 API 키워드 도구 활용 (CUSTOMER_ID: 3755315)
  • 태그 입력 UI에 "사전 미등재" 경고
  • automation-registry: tag-dictionary pending → active

[페르소나]
B2B 이커머스 ERP + 네이버 파워셀러 + UI/UX 시니어. 단독 IA/삭제 결정 금지. P1-B 금기어 정책 (blocking vs warning-only) 결정은 사용자 위임 (Session D 학습: 셀러 자율성 보호).

[참고 — MD 분할 권고]
SESSION_LOG.md 현재 1016줄 (T1 1000 도달). 다음 세션 STEP 0에서 자동 분할 권고 (의무 아님, 작업원칙 #31 (a) T1 권고 / T2 1500 의무).

[주의 — 작업원칙 위반 학습]
Session E-1 + Phase 3에서 worktree vs main 절대 경로 혼동 사고 누적 3회 (작업원칙 #34). Phase 4 + Phase 5 + Sprint 7 P0에서 각 0회 — Edit/Write 호출 시 절대 경로 시작이 워크트리 prefix `/Users/jyekkot/Desktop/kkotium-garden/.claude/worktrees/<name>/`인지 *매 호출 확인 의무* (P1 유지).
```

---
## 직전 인계 메시지 — Sprint 7 P0 (참고용, 완료됨)

<!-- sprint-7-handoff-short v1 -->

```
꽃틔움 가든 — Sprint 7 시작.

docs/plan/PROGRESS.md (슬림 진입점) → ROADMAP.md → SESSION_LOG.md 정독. 필요 시 PRINCIPLES_LEARNED.md / PRINCIPLES_CODE.md / SPRINT_PLAN.md / REFERENCES.md spot-read. 아래 STEP 0 환경 점검 후 현재 상태 + Sprint 7 디테일 계획을 브리핑해주세요. 본 작업 시작은 제 Y/N 승인 후 진행.

[STEP 0 환경 점검]
git rev-parse HEAD origin/main && \
  git status --short && \
  git stash list && \
  wc -l docs/plan/*.md && \
  curl -sIo /dev/null -w "Vercel HTTP: %{http_code}\n" https://kkotium-garden.vercel.app/dashboard && \
  echo "Latest prod deploy SHA: $(gh api 'repos/kkotium-dot/kkotium-garden/deployments?environment=Production&per_page=1' --jq '.[0].sha[0:7]')" && \
  scripts/verify-vercel-deploy.sh

[Sprint 6 완료 정리 — 디테일은 SESSION_LOG.md 직전 5 entries 참고]
- Phase 3 (6-B 가격 변동) ✅ — InventorySnapshot.supplierPrice + PriceMovementAlert + dome-price-analyzer.ts + PriceMovementWidget. production c8aba85
- Phase 4 (6-C 다른 셀러 + supplier-score) ✅ — CompetitorSnapshot + supplier-score-aggregator (pure compute) + CompetitorRadarWidget + SupplierGardenWidget. production b836687
- Phase 5 = Session F (6-E 카테고리 캐시) ✅ — dome_categories + category_mappings + dome-category-cache.ts + /api/category/suggest cache layer + cron-weekly piggy-back. production a8a58c2. Gemini hit-rate cache 작동 검증 완료 (2nd call cacheHit: "name_hash")
- 6-D 4모드 발송은 이미 daily cron + inventory poller + price analyzer에서 active — Phase 5 추가 작업 0건

[Sprint 7 작업 범위 — P0/P1]
- **P0-A 도매꾹 OpenAPI v4.5 옵션 정확도 강화** (리서치 11번)
  • `src/lib/option-integrity.ts` (신규) — selectOpt 해시 + 텍스트 동시 비교
  • `src/lib/crawler/auto-mapper.ts` 강화 — seller.vacation 검증 + channel 도매꾹/도매매 검증
  • `src/app/crawl/page.tsx` — 옵션 변경 / 휴가 / 채널 불일치 시 UI 알림
- **P0-B 등록 7일 골든 윈도우 트래킹 위젯** (리서치 10번)
  • `src/lib/golden-window-tracker.ts` (신규) — D+1/D+3/D+7 분기, 클릭/판매 상태 평가
  • `src/components/dashboard/GoldenWindowWidget.tsx` (신규) — Inbox 3번째 placeholder ("등록 7일 골든 윈도우", P0-B) 교체
  • "상품명 토큰 1개 교체 권장" 자동 제안 (가장 약한 키워드)
  • automation-registry: golden-window pending → active
- **P0-C 효자 상품 자동 식별 (멱법칙 시각화)** (리서치 10번)
  • `src/lib/pareto-analyzer.ts` (신규) — orders 테이블 기반 상위 20% 자동 식별
  • `src/components/dashboard/cards/TopProductsCard.tsx` 강화 — Section 3 정원 건강의 "효자 상품 TOP 5" 카드 활성화 (현재 PO-C 준비 중 배지)
  • automation-registry: pareto-recalc pending → active
- 본 Sprint 후 P1 (P1-A 카테고리 1페이지 + P1-B 금기어 + P1-C 태그사전) → Sprint 7 Track B AI Studio

[페르소나]
B2B 이커머스 ERP + 네이버 파워셀러 + UI/UX 시니어. 단독 IA/삭제 결정 금지. P0-A 옵션 변경 감지 시 *blocking vs warning-only* 정책 결정은 사용자 위임 (Session D 학습: 셀러 자율성 보호 패턴).

[주의 — 작업원칙 위반 학습]
Session E-1 + Phase 3에서 worktree vs main 절대 경로 혼동 사고 누적 3회 (작업원칙 #34). Phase 4 + Phase 5에서 각 0회 — Edit/Write 호출 시 절대 경로 시작이 워크트리 prefix `/Users/jyekkot/Desktop/kkotium-garden/.claude/worktrees/<name>/`인지 *매 호출 확인 의무* (Sprint 7 유지).
```

---

## Session E 작업 디테일 (인계 메시지 본문에서 분리 — 새 세션이 정독 시 흡수)

### Phase 3 (Sprint 6-B 가격 변동 백엔드) — 완료 요약

- DB 결정: **InventorySnapshot 확장 채택** (사용자 위임 사항). PriceMovementAlert 별도 테이블 (LowStockAlert 미러).
- 통합 전략: 도매꾹 getItemView가 basis + qty + price.supply를 한 호출로 반환 → 별도 cron 0, 별도 API 호출 0. dome-inventory-poller의 active loop에서 evaluatePriceMovement도 함께 호출.
- Cold start: 사전 snapshot < 1건일 때는 alert 비발생 (baseline 계산 불가).
- Discord: orange/red만 PRICE_CHANGE 채널 발송 (yellow는 dashboard widget only — spam 방지).

### Phase 4 (Sprint 6-C + 공급사 누적 평가) — 완료 요약

- Sprint 6-C 채택 아키텍처:
  - DB: 신규 `competitor_snapshots` 테이블 (per-product per-poll capture). SupplierStockProfile *확장 안 함* — 별도 테이블이 raw data + aggregated layer 분리 깔끔.
  - Adapter: `domemae-adapter.searchItems`를 실제 구현 (getItemList v4.5). Keyword = 상품명 첫 3 token, sortBy=popular, pageSize=20.
  - Tracker: 활성 상품당 1 search call/cron. 6-A getItemView와 별도 API quota 버킷이지만 같은 cron 호출 안에서 실행 (별도 cron route 0).
  - Widget: CompetitorRadarWidget — 우리 가격이 1페이지 median 대비 ±5% 안이면 green, 5-10% yellow, 10%+ red.
- 공급사 누적 평가 채택 아키텍처:
  - **신규 테이블 0개** — pure compute approach. SupplierStockProfile + PriceMovementAlert + Product (기존 데이터)에서 직접 산정.
  - composite = 0.45 × trustScore + 0.35 × depletionScore + 0.20 × priceStability (0..100)
  - Tier: 80+ green ("꽃나무처럼 든든") / 60+ yellow ("조금만 더 지켜봐요") / red ("대안 검토 권장")
  - 마운트: Section 4 잠재력 (사용자 위임 사항을 시니어 판단으로 결정 — Inbox보다 잠재력 카드 분위기에 정합)

### Phase 5 작업 범위 — Sprint 6-E 카테고리 캐시 + 6-D 4모드 발송 통합

1. **Sprint 6-E 도매꾹 카테고리 캐시** — `src/lib/dome-category-cache.ts` (신규)
   - 도매꾹 getCat ver 2.0 전체 카테고리 트리 캐시 (4-5 depth, 수천 노드)
   - 신규 테이블: `DomeCategory` (캐시) + `CategoryMapping` (도매꾹 → 네이버 매핑 기억)
   - AI 카테고리 매핑 (`api/category/suggest`) 강화: 캐시 hit 시 AI 호출 skip (현재 매번 AI 호출 → 80%+ hit-rate 목표)
   - cron-weekly에 캐시 갱신 통합 (변경 빈도 낮음, 주간 1회 충분)

2. **Sprint 6-D 4모드 발송 통합** — 꼬띠 4모드 (Recommend / Stock / Price / Score) Discord 발송 path 활성화
   - 현재 `dome-curator.ts`에 4모드 foundation 완료 (Sprint 6-D 1-5단계)
   - 정원 일지 발송 path는 dry-run only — Phase 5에서 cron-daily에 통합 + Discord KKOTTI_RECOMMEND 채널 발송 활성화
   - `automation-registry`: `kkotti-curator` (또는 동등 entry) pending → active

3. 검증 + commit + push + verify-vercel-deploy.sh --wait
4. MD 갱신 + Sprint 7 인계

### 작업원칙 강제 (요약 — 풀 디테일은 PROGRESS.md)

- #17 commit msg `.commit-msg.tmp` + `git commit -F`
- #21 사전 점검 (HEAD/status/stash/wc + Latest prod deploy SHA == HEAD)
- #22 브라우저 시각 검증 의무 (API 200 ≠ 실작동 완료) — Session D에서 오타 1건 catch한 가치 입증
- #24 commit + push 한 turn 안에
- #26 IA 점검 — 새 위젯 마운트 슬롯 결정은 사용자 위임 (단독 IA 결정 금지)
- #29 (a~e++) 한글 처리 6+1 규칙
- #31 MD 1500줄 자동 점검 — SESSION_LOG 1336줄 T2 1500 미달 권고만, 본 세션 분할 의무 아님
- #32 push 전 `npm run build` 의무
- #33 useSearchParams Suspense 자동 점검
- #34 명백한 오류 파일 발견 시 사용자 알림
- #35 한글 사전 분리 패턴
- #36 Vercel deploy 검증 의무 (push 후 `verify-vercel-deploy.sh --wait`)

### Sprint 6 이후 일정 (계획서 원본 순서, 변경 없음)

- **Session F**: 6-E + 6-D 위젯 통합 (카테고리 매핑 + 꼬띠 4모드 정원 일지 발송 통합)
- **Sprint 7**: AI Studio 4모듈 (M1 썸네일 / M2 상세페이지 5섹션 / M3 어도비 통합 / M4 A/B 테스트)
- **Sprint 8**: 매출 상승 + 운영 흐름 안정화 후 Private API 자동발주 활용 (보류 트랙)

### 보류 트랙 (사용자 결정 필요)

- **6-A 실 데이터 검증** — 사용자 첫 도매꾹 상품 등록 후: minq 배너 시각 확인 (특히 minq>=2인 묶음 상품) + 폴링 1회 자동 실행 결과 + 알림 발생 시 mark-oos 모달 trigger 시각 확인. 본 검증은 사용자 환경에서만 가능.
- **VERCEL_TOKEN 발급** (https://vercel.com/account/tokens) — 발급 시 `verify-vercel-deploy.sh`이 build state까지 확인. 현재는 GitHub Deployments path로 deployment 등록까지만 확인. 두 path 모두 자동 fallback.
- **Vercel Pro plan upgrade** ($20/월) — `vercel.json` 한 줄 수정으로 6시간 cron 복귀. 매출 600만원+ 도달 후 진입 권장.
- **잔재 파일 정리** (작업원칙 #34 보고) — `src/app/products/page.backup.*.tsx` 3건 + dashboard `*.BROKEN.backup` 2건 + `DashboardFilters.backup.tsx` 1건 + `recursing-galileo-205156` worktree (ff4ef4d 옛 commit). 사용자 별도 승인 시 별도 세션 처리.
- **기존 네이버 스토어 100개+ 상품 일괄 연동** — 본격 소싱 안정화 후 사용자 요청 시 시작.
- **Sprint 8 Private API 자동발주** — 매출 상승 + 운영 흐름에 따라 진입.
- **한글 sentinel 패턴 확장** — Session D에서 발견된 "즐시"/"개을" 같은 자모 결합 오타는 현재 sentinel(#29 e)에 없음. 패턴 추가 시 grep noise 증가 — 사용자 결정 위임.

### 환경 / 시크릿 (참고용)

- Supabase project ID: `doxfizicftgtqktmtftf`
- Naver Search Ad CUSTOMER_ID: `3755315`
- 카카오 채널 Public ID: `_xkfALG` (꽃틔움 KKOTIUM)
- AI: Groq lrltQb + 3IGN7i 정상 2키
- 도매매 Open API Key: `a6ff…c470bb`
- 도매꾹 Private API: 28개 전체 권한 발급 ✅ (Sprint 8 보류 트랙)
- Vercel project: `prj_H5HamuDSG0Na6j5dwDlYe9A6FfC4`
- Vercel team: `team_uwIkDWZsS2gogA04mZIVDuPF`
- Discord 5채널 webhook URL: orders / stock-alerts / daily / weekly / kkotti (Vercel 환경변수)

---

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
