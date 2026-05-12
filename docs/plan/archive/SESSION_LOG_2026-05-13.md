# KKOTIUM GARDEN — SESSION_LOG 2026-05-13 분할 archive

> **분할 일시**: 2026-05-13 (Sprint 7-M2 Phase 2-b-1 완료 직후)
> **분할 트리거**: 작업원칙 #31 T1 1000줄 초과 권고 + 사용자 명시 지시
> **본 파일 상태**: **동결**. 새 세션 정독 대상 아닙니다. 검색 필요 시 `grep` 사용.
>
> **포함 범위**: 2026-05-12 5 entries — v3.1 FINAL 기획 채택, v2.0 아키텍처 채택, Sprint 7 P1 (브라우저 E2E), Sprint 7 P0-B enhancement, Sprint 7 P0 (옵션 정확도 + 골든윈도우 + 효자상품).
>
> **분할 후 SESSION_LOG.md (라이브)**: 2026-05-13 6 entries 만 유지 (Sprint 7-Diag MVP → 7-Skel → 7-M1 → 7-M2 Phase 1 → Phase 2-a → Phase 2-b-1, 모두 production 도달 완료).
>
> **상호 참조**:
> - 옛 archive: `SESSION_LOG_2026Q2_MAY.md` (2026-05-01 ~ 06), `SESSION_LOG_2026-05.md` (2026-05-06 ~ 08), `SESSION_LOG_2026-05-12.md` + `SESSION_LOG_2026-05-12-PM.md` (2026-05-11~12 직전).
> - 본 archive는 위 4개에 이은 *5번째 분할*.

---

## 2026-05-12 세션 (기획 점검 v3.1 FINAL — CTI + 12 골격 + Claude 디자인 통합) ✅

### 본 세션 성격
- 클로드 웹에서 진행한 *기획 점검 전용* 세션. 코드 변경 0건.
- 직전 세션(2026-05-11 'Sprint X = Gemini 제거 + 5섹션 일괄 템플릿') 결정사항을 *광범위 일괄 컨셉 가정*이 본질과 어긋난다는 진단으로 폐기.
- 직전 'Sprint 6 재검토' 채팅의 5섹션 자체 제작 + HTML 카피 원칙은 유지하면서, 상품 단위 적응형 자동화 v3.1 FINAL로 통합.

### v3.1 FINAL 채택 — Smart Asset Workflow 구조

3단계 파이프라인:
- **Diagnosis(진단)**: 손길 필요도 자동 판정 (이미지 품질 + 경쟁 수준 + AI ROI + **CTI 8축 추론**)
- **Automation(자동화)**: L1~L4 등급별 분기 처리
- **Refinement(디자인)**: 디자이너 손길 워크플로우 (등급별 깊이 차이)

핵심 신규 모듈 2가지:
1. **CTI(Concept-Tone Inference)** — 8축 자동 추론으로 상품의 컨셉·톤 자동 결정
2. **12개 사전 정의 골격(S1~S12)** — CTI 결과를 받아 자동 매칭, 디자이너는 1클릭으로 교체 가능

### 결정된 5가지

(a) **CTI 8축 채택**:
   - 컨셉 4축: 페르소나(20s/30-40s/senior/kidsmom) / 맥락(daily/gift/pro/event) / 가격(budget/standard/premium) / 유형(single/options/set)
   - 톤 4축: 컬러무드(warm/calm/vivid/mono) / 감성톤(friendly/professional/sensory/trust) / 사진스타일(white/lifestyle/detail) / 장르(korean/minimal/vintage/natural)

(b) **12개 골격 채택**: S1~S12 그대로, 새싹→파워 성장하며 S13~ 디자이너 직접 추가 가능

(c) **Claude Vision 정책**: 옵션 1 + 옵션 2 둘 다 진행
   - 옵션 1 = Claude.ai 세션에서 수동 (A급 단건, 비용 0)
   - 옵션 2 = 본 앱 Anthropic API 호출 (D 등급/CTI 신뢰도 70% 미만 자동 보강, 월 ₩2,000-5,000 예상)
   - ANTHROPIC_API_KEY는 Vercel Sensitive 토글 + gitleaks pre-commit + ANTHROPIC_MONTHLY_CAP 환경변수

(d) **Sprint 7 순서**: 7-Diag(CTI 포함) → 7-Skel(12개 골격) → 7-M1(썸네일) → 7-M2(5섹션 빌더) → 7-Lib(라이프스타일 라이브러리)

(e) **5섹션 자체 제작 + HTML 카피 원칙 유지** (직전 'Sprint 6 재검토' 채팅 결정)

### 클로드 디자인 기능 명시 통합

| 자원 | L3/L4 디자이너 트랙 활용 |
|---|---|
| Adobe for Creativity MCP | create_firefly_board(무드보드) + search_design+fill_text(Express 5섹션) + asset_search(Stock 라이프스타일) + image_apply_preset(80+ Lightroom 프리셋) |
| Canva MCP | generate-design + export-design (SNS·블로그·이벤트 배너 보조) |
| Claude Artifacts | 5섹션 미리보기 / CTI 시각화 / A/B/C/D 시뮬레이터 / SEO 점수 / 다크패턴 필터 검증 |
| Claude Skills | theme-factory(12 골격 일괄 생성) + canvas-design(SVG 오버레이) + frontend-design(검수 UI) + pdf/docx/xlsx(부속 문서) + brand-guidelines(추후) |
| PlayMCP NaverSearch | datalab_shopping_category(트렌드 보조) + search_shop(경쟁 분석) |

### 신규 작업원칙 3건

- **#38** — Production Runtime = Static Assets Only (Vercel은 정적 자산 + 안전 연산만)
- **#39** — CTI Inference is the Entry Point (모든 상세페이지 자동화의 출발점)
- **#40** — Designer Sense is the Sacred Resource (자동화는 감각을 대신하지 않고 발휘 시간을 벌어줌)

### Sprint 7 v3.1 FINAL 매트릭스

| Sprint | 작업 | 우선순위 |
|---|---|---|
| 7-Diag | 진단 모듈 MVP + CTI 8축 추론 | ⭐⭐⭐ |
| 7-Skel | 12개 골격 정의 + skeleton-matcher | ⭐⭐⭐ |
| 7-M1 | 썸네일 자동화 4변형 (골격 톤 토큰 적용) | ⭐⭐⭐ |
| 7-M2 | 5섹션 빌더 (골격 기반 가변 구조) | ⭐⭐⭐ |
| 7-Lib | 라이프스타일 라이브러리 (골격 태그 인덱싱) | ⭐⭐⭐ |
| 7-M4 | 썸네일 A/B 테스트 | ⭐⭐ |
| 7-M3 | 어도비 워크플로우 (CSV 머지) | ⭐⭐ |
| 7-X | 반품안심케어 매출 검증 | ⭐⭐ |

### 본 세션 산출물
- 신규 research 문서: `docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md` (Section 6 내용)
- 변경 영향 파일: docs/plan/{PROGRESS,ROADMAP,SPRINT_PLAN,SESSION_LOG,PRINCIPLES_LEARNED}.md 5종
- 코드 변경: 0건

### 다음 세션 (Sprint 7-Diag 진입)
- ROADMAP.md 인계 메시지 영역(L17)에 명시
- STEP A(docs 갱신) 완료 후 사용자 승인 → STEP B(7-Diag MVP 코드) 진입

---

---

## 2026-05-12 v2.0 아키텍처 채택 (사용자 제공 리서치 PDF + SVG → Sprint X/Y/Z 신설 + 작업원칙 #37 + SESSION_LOG T2 분할) ✅

### 본 세션 성격
- Sprint 7 P1 + 브라우저 E2E 직후 사용자 명시:
  - "Adobe Firefly Services API 라이선스 차단 확인" (직전 세션 결론)
  - 새 리서치 파일 2개 제공: PDF "꽃틔움 가든 아키텍처 v2.0" + SVG 다이어그램
  - "모두 체크한 뒤 현재 앱에 적용하여 개선" + "다음 세션에서부터 본격적으로 작업"
- 본 세션 = **리서치 정독 + MD 5개 갱신 (코드 변경 0건)** 의 *기획 세션*. 다음 세션부터 본격 Sprint X 진입.
- T2 1500줄 임박 (SESSION_LOG 1440 + 본 entry ~250) → 본 세션에서 분할 의무 적용.

### 시작 직전 상태
- HEAD `f958bb0` = origin/main 일치 ✅
- working tree clean ✅
- MD 줄 수: PROGRESS 203 / ROADMAP 486 / SESSION_LOG 1440 (T2 1500 임박)
- Vercel deploy OK ✅

### 본 세션 작업

#### A. 리서치 정독 (사용자 제공)
- **PDF**: "꽃틔움 가든 아키텍처 v2.0 — Gemini 제거 + Claude Pro Max + MCP 통합 전략" (9 페이지, 10 section + Appendix)
- **SVG**: 2-Phase 아키텍처 다이어그램 (Phase 1 Creative / 정적 자산 저장소 / Phase 2 Production)

#### B. 영구 참조 문서 생성 (신규)
- `docs/research/KKOTIUM_V2_ARCHITECTURE_2026_05.md` — 본 PDF 전체 내용을 markdown으로 재구성 + 본 앱 현 상태 매핑 추가
  - Section 0~10 + Appendix 모두 보존
  - "본 앱 현 상태와의 매핑" section 신설: v2.0과 정합한 부분 / 제거할 부분 / 신규 구축할 부분 명시
- 향후 모든 이미지·디자인 자동화 의사결정의 *단일 근거*가 됨

#### C. 작업원칙 #37 신설
- `docs/plan/PRINCIPLES_LEARNED.md` 끝부분에 추가
- 본문: "Production runtime never calls image generation APIs. Static assets created in Claude Web sessions are the only image source."
- 4가지 작업 종류별 허용 규칙 (생성/변환/합성/LLM)
- 2-Phase 아키텍처 본 앱 적용 가이드 + 위반 시 대응 + 본 앱 위반 코드 식별 목록

#### D. Sprint X / Y / Z 신설
- `docs/plan/SPRINT_PLAN.md` 끝부분에 추가
- **Sprint X**: Gemini 제거 + 정적 자산 라이브러리 구축 (7일 액션 플랜)
  - Day 1~3: 사용자 Claude Web 세션 디자이너 작업 (Adobe MCP + Photoshop Variables + Lightroom)
  - Day 4: 본 앱 코드 작업 — cloudinary.ts + sharp-composite.ts + lifestyle-picker.ts + Gemini 의존성 전체 제거
  - Day 5: Groq 카피라이팅 + 다크패턴 필터 강화
  - Day 6: Claude Artifacts 검수 위젯 + A/B/C 분류 알고리즘
  - Day 7: 네이버 커머스 API 연동 + 첫 C급 일괄 등록
- **Sprint Y**: 5섹션 상세페이지 자동 생성 (Sharp + Groq + DetailPagePreview + ABCSimulator + BatchProgressMonitor)
- **Sprint Z**: 라이프스타일 큐레이션 + DesignTokenPanel + 보안 체크리스트 자동 검증 스크립트

#### E. SESSION_LOG.md T2 분할
- 분할 전: 1440줄 (T2 1500 임박, 본 entry 추가 시 ~1700 초과 예상)
- 분할 후: live 424줄 + archive 1024줄 = 1448 (±5 오차 0)
- live 유지 entries: Sprint 7 P1 + Sprint 7 P0-B enhancement + Sprint 7 P0 (3 entries, 최신)
- archive 이동 entries (`SESSION_LOG_2026-05-12-PM.md`): Session E-2 Phase 5 / Phase 4 / Phase 3 / Phase 2 / Phase 1 + E-1 + D + C-1 (8 entries)
- `docs/plan/archive/README.md` 인덱스 표에 신규 archive 행 추가

#### F. ROADMAP.md 인계 메시지 재작성
- 새 메시지: "**Sprint X (v2.0 아키텍처 채택 + Gemini 제거 + 정적 자산 라이브러리)**"
- 직전 Sprint 7 Track B AI Studio 인계는 "취소됨 — v2.0 아키텍처 채택으로 Sprint X로 대체" 헤더로 보존 (참고용)
- Day 1~7 분할 권장안 명시
- 본 Sprint 작업 시 사용자 명시 강화 사항 반영:
  - 신규 lib 파일별 사용자 명시 승인 단계
  - 7일 액션 플랜 = "한 세션에 모두" 가 아닌 *Day 단위 분할*
  - functional test + 브라우저 E2E 의무 (Sprint 7 학습 일반화)
  - 정직 보고 의무 (Adobe Firefly Services API 라이선스 차단 명시 + Claude Web 세션 의존 path 인지)

#### G. PROGRESS.md 헤더 갱신
- "최종 업데이트" 라인 = v2.0 채택 명시
- "다음 작업" 라인 = Sprint X (Day 4 본 앱 작업 우선 진입) → Sprint Y → Sprint Z → Sprint 8/9
- `docs/research/KKOTIUM_V2_ARCHITECTURE_2026_05.md` 영구 참조 추가 (다음 세션부터 반드시 정독)

### 본 세션 학습 (영구 기록)

1. **사용자 리서치 받는 즉시 영구 참조 doc 생성 패턴** — PDF/SVG 같은 외부 파일은 향후 검색·재참조 어려움. Markdown으로 재구성해서 `docs/research/` 폴더에 영구 보존. 본 앱의 모든 후속 의사결정이 이 문서를 단일 근거로 인용 가능.

2. **Sprint 재구성 패턴** — 직전 Sprint 7 Track B (M1~M4 AI Studio)는 Adobe Firefly Services API 라이선스 차단 + v2.0 보안 표면 0 원칙 두 가지 이유로 *동일 목표를 다른 path로* 재구성. Sprint X/Y/Z가 그 결과. 인계 메시지는 "취소됨" 명시 + 새 메시지 prepend로 git history 보존.

3. **v2.0 채택의 즉각적 가치** — 본 세션은 코드 변경 0건이지만 *향후 모든 Sprint의 방향을 재정렬*. 작업원칙 #37 + Sprint X/Y/Z 정의 + 영구 참조 문서가 모두 *next session에서 즉시 활용 가능한 자료*. 사용자 의도 "다음 세션에서 본격 작업" 정확 충족.

4. **T2 분할 + 본 세션 entry 동시 처리** — SESSION_LOG 1440 + 본 entry 250 = 1690 (T2 초과). 본 세션에서 분할 *전*에 entry 추가하면 archive 분리 어려움. 순서: (a) 분할 먼저 → (b) 새 entry 추가 → (c) live 424 + 본 entry → live ~700 (T1 권고 진입). 분할 절차의 정합성 유지.

### Commit + Push

본 세션은 MD 5개 + 신규 doc 1개:
1. 신규 `docs/research/KKOTIUM_V2_ARCHITECTURE_2026_05.md` (영구 참조)
2. `docs/plan/PRINCIPLES_LEARNED.md` (작업원칙 #37 추가)
3. `docs/plan/SPRINT_PLAN.md` (Sprint X/Y/Z 추가)
4. `docs/plan/ROADMAP.md` (인계 메시지 재작성 + 헤더 갱신)
5. `docs/plan/PROGRESS.md` (헤더 + 다음 작업 갱신)
6. `docs/plan/SESSION_LOG.md` (T2 분할 + 본 entry)
7. `docs/plan/archive/SESSION_LOG_2026-05-12-PM.md` (신규 archive)
8. `docs/plan/archive/README.md` (인덱스 표 갱신)

코드 변경 0건 — commit 1회 (docs only).

### 적용된 작업원칙

- **#17** commit msg `.commit-msg.tmp` + `git commit -F` ✅
- **#21** 사전 점검 통과 ✅
- **#24** 한 turn 안에 정독 + MD 5개 + 분할 + commit
- **#26** IA 점검 — Sidebar 변경 0, dashboard 변경 0. 본 세션은 MD 기획만.
- **#27** 외부 컨트랙트 보존 — 코드 변경 0건이므로 자동 적용
- **#28** Vercel = source of truth ✅
- **#29 (a~e++)** 한글 처리 — 5개 MD 모두 Write/Edit 안전 패턴 적용
- **#31 (a~h)** 본 세션 핵심 — T2 분할 + idempotent + 인덱스 무결성 (wc -l 합계 ±5 통과)
- **#34** 잔재 파일 0 (본 세션 신규 발견 없음)
- **#37 (신규)** 본 세션이 직접 채택 — 다음 Sprint X에서 강제 적용

### 본 세션 commit
1. `docs(plan): adopt v2.0 architecture — Sprint X/Y/Z + Principle #37 + SESSION_LOG T2 split`
2. (선택) deploy verify

### 다음 세션 (Sprint X Day 4) 작업 = 본 앱 코드 작업 첫 진입

ROADMAP.md "Sprint X" 새 인계 메시지 그대로 적용. 사용자가 Day 1~3 디자이너 작업 (Adobe MCP + Photoshop + Lightroom)을 *별도 Claude Web 세션*에서 병렬 진행한 후, 본 앱 코드 작업은 다음 세션부터:

1. 신규 `src/lib/image/cloudinary.ts` (누끼 + 패딩 + 업스케일 URL 빌더)
2. 신규 `src/lib/image/sharp-composite.ts` (5섹션 합성 함수)
3. 신규 `src/lib/image/lifestyle-picker.ts` (Supabase Storage 인덱스 활용)
4. **Gemini 의존성 전체 제거**:
   - `src/app/api/category/suggest/route.ts` 의 `suggestWithGemini()` 함수 제거
   - 검색 조련사 / AI Studio grep 후 잔존 Gemini direct call 모두 제거
   - `.env.local` 의 `GEMINI_API_KEY` / `_2` / `_3` 3개 변수 삭제
   - Vercel 환경변수의 동일 3개 변수 삭제
5. TSC + npm run build + production deploy + functional test (Gemini 제거 후 모든 path 작동 확인)

---

## 2026-05-12 Sprint 7 P1 (P1-A 1페이지 + P1-B 금기어 + P1-C 태그사전) + 브라우저 E2E 시각 검증 ✅

### 본 세션 성격
- Sprint 7 P0-B enhancement 직후 같은 worktree에서 P1 진입. 사용자 명시 강화:
  - "작업 완료 후 브라우저 테스트 + 실무 워크플로우 검증"
  - "실질적으로 할 수 없는 작업은 거짓말 없이 요청"
  - "문제 없을 때만 다음 작업으로 넘어갈 것"
- 본 세션 = P1 구현 3개 + functional test 2 사이클 + 브라우저 E2E 시각 검증 + 학습 정직 보고.
- 4 commits (feat + 2 fix + docs) + worktree 혼동 0회 누적 유지.

### 시작 직전 상태
- HEAD `bdfa7d7` = origin/main 일치 ✅
- working tree clean ✅
- MD 줄 수: PROGRESS 203 / ROADMAP 429 / SESSION_LOG 1298 (T1 권고)
- Vercel deploy OK ✅

### 본 세션 작업

#### A. P1-A 카테고리 1페이지 일치율 검증 (research 6)
- 신규 `src/lib/naver/category-page-validator.ts`:
  - Naver Shopping Search API `/v1/search/shop.json` 통합 (display=30, sort=sim)
  - d1+d2 distribution aggregation + dominant detection threshold 60%
  - 응답 shape: `{ totalItems, distribution[], dominant{d1,d2,share,count}, error }`
- `/api/category/suggest` 통합:
  - **3 modes**: agreed (AI top 일치) / override (dominant 우선 prepend) / synthesized (suggestions 비었을 때 page-1으로 합성)
  - Response field: `pageValidation: { applied, dominantD1, dominantD2, dominantShare, totalItems, error }`
  - `synthesized` mode 사용처: AI가 "북유럽 거실 인테리어 소품 데코" 같은 ambiguous name에 실패 시 page-1 다수파 자동 매핑 (사용자 검증으로 80% share → 가구/인테리어>인테리어소품>기타장식용품 자동 채택 확인)
- **silent bug fix #1** (functional test 발견): `NAVER_CLIENT_ID/_SECRET`이 Open API에 invalid (errorCode 024). DATALAB credentials가 실제 작동. trend-analyzer와 동일 fallback chain 적용.

#### B. P1-B 상품명 금기어 페널티 강화 (research 4)
- 신규 `src/lib/honey-name-rules.ts`:
  - `BANNED_WORDS` 15개: 이벤트/할인/특가/최저가/무료배송/쿠폰/적립/오늘만/한정/당일/깜짝/폭탄/대박/핫딜/땡처리
  - 4 rule codes: banned_word / duplicate_word (3+ times) / special_chars (allowlist 기반) / too_short / too_long (25-50자)
  - `RuleSeverity`: critical / warning / info
  - `detectNameRules(name)` returns findings + topSeverity + nameLength
- `src/lib/honey-score.ts` 통합: `buildHoneyScoreWarnings(name)` 호출 결과를 기존 `warnings[]`에 push (additive, 외부 컨트랙트 보존)
- 신규 `src/components/products/NameRulesPanel.tsx`:
  - Inline panel, `role="alert"` for critical / `role="status"` for warning
  - Tone: critical 빨강 (#FEF2F2) / warning 노랑 (#FEFCE8) / info 파랑 (#EFF6FF)
  - 5자 미만 시 미노출 (typing 중 noise 방지)
- `/products/new`에 마운트 (상품명 input 직후, char count 위)
- /naver-seo는 인라인 편집 구조라 별도 follow-up (사용자 위임)

#### C. P1-C 태그 사전 등재 검증 (research 7)
- 신규 `src/lib/naver/tag-dictionary.ts`:
  - Search Ad `keywordstool` API를 dictionary proxy로 활용
  - 5/request batch, 결과 status: verified / weak / missing / error
  - **silent bug fix #2** (functional test 발견): Naver는 `<10` 케이스를 volume=10으로 반환 → naive `volume > 0` 체크가 garbage 키워드도 verified 분류. **임계값 조정 30/10**:
    - verified: volume >= 30 (실 SEO 가치)
    - weak: 10..29 (낮지만 존재)
    - missing: < 10 또는 not found
- 신규 `POST /api/tags/verify` (body `{tags: string[]}`, cap 20)
- 신규 `src/components/products/TagVerificationPanel.tsx`:
  - 수동 trigger 버튼 "검증 시작" (Search Ad rate limit 보호)
  - 색상별 결과 표시 + summary line

#### D. Registry + i18n
- `category-1page` + `tag-dictionary` pending → active (frequency on-event, no cron)
- `registry/route.ts`: 두 entry 모두 `lastRun: null` (live state)

### 검증

#### Functional API tests (curl)
- P1-A 레깅스 (확실 카테고리): `applied: "agreed"` + dominantShare 1.0 (30/30 items) ✅
- P1-A 인테리어 소품 (AI 실패): `applied: "synthesized"` + dominantShare 0.8 (4/5 items) → 가구/인테리어>인테리어소품>기타장식용품 ✅
- P1-C 5 태그: verified 3 (실 SEO 키워드) / weak 2 (garbage 임계값 fix 후 색상 강등) ✅

#### 브라우저 E2E (Claude Preview MCP — local dev :3000)
- **P1-B 시나리오 1** (금기어 + 중복): "이벤트 할인 무료배송 적립 쿠폰 가을 가을 가을 잠옷" → role=alert + bgColor `rgb(254, 242, 242)` critical red + "금기어 5개 발견 — 이벤트, 할인, 무료배송, 쿠폰, 적립 (Naver de-rank 위험)" + "중복 단어 1개 — 가을×3" ✅
- **P1-B 시나리오 2** (특수문자): "★☆♥🎉 특수문자 잠옷 세트 가을 신상품 추천" → role=status + bgColor `rgb(254, 252, 232)` warning yellow + "허용 외 문자 4종 — ★ ☆ ♥ 🎉" ✅
- **P1-B 시나리오 3** (정상): "꽃틔움 프리미엄 코튼 잠옷 세트 여성용 가을 신상품" → panel 미노출 (panelFound=false, alertsTotal=0) ✅
- **P1-A E2E**: 정상 상품명 + "카테고리 자동 추천" 버튼 click → API 호출 → 페이지에 "패션의류 > 여성언더웨어/잠옷 > 잠옷/홈웨어" 자동 입력 + 카테고리 코드 50000826 확인 ✅
- **P1-C UI E2E**: 태그 3개 입력 (레깅스/요가복/asdfqwerty123) → "검증 시작" click → API 응답 후 panel 렌더링 "SEO 유효 2 / 약함 1 / 미등재 0" + 개별 row "#레깅스 월 19,830회 검색 — SEO 유효" / "#요가복 월 37,830회" / "#asdfqwerty123 월 10회 — 검색량 낮음" ✅

### 본 세션 학습 (영구 기록)

1. **functional test에서 silent bug 2건 더 발견** — 본 세션은 사용자 명시 "실무적으로 사용 시 문제 없는지 검증"의 가치 또 한 번 입증.
   - Bug #1: NAVER_CLIENT_ID/_SECRET가 Open API에 invalid (Commerce API only 추정). DATALAB credentials로 fallback 필요.
   - Bug #2: Naver Search Ad의 `<10` 응답이 volume=10으로 들어와 naive threshold가 garbage를 verified 분류.
   둘 다 *구현 직후 자동 functional test*에서 즉시 발견 → 같은 turn 안에서 fix + 재검증. **일반화 규칙: API 통합 후 즉시 production functional test 의무화** (Phase 5 학습 5와 같은 패턴, 이번에 추가 적용).

2. **브라우저 E2E + functional test 조합 = 실무 워크플로우 검증의 표준** — 사용자 명시 강화 지시 후 본 세션부터 적용:
   - functional test (curl) = API 정확성 (응답 shape + 임계값 + 비즈니스 로직)
   - 브라우저 E2E (Claude Preview MCP) = UI 통합 정확성 (panel 렌더링 + tone + interaction)
   - 두 layer 모두 통과해야 "다음 작업으로 넘어감"의 기준 충족.
   본 세션부터 향후 모든 Sprint 진행 시 *둘 다 의무 적용*.

3. **/products/new 상품명 input은 모든 P1-B 시나리오에서 인스턴트 반응** — useMemo 기반 detector라 typing 직후 panel update. 사용자 친화성 검증.

4. **TagVerificationPanel은 수동 trigger 패턴이 옳음** — 입력 직후 자동 verify면 Search Ad rate limit 위험 (5/request, 5천/일). 사용자가 "검증 시작" 버튼 누를 때만 호출 = 5번 무한 입력해도 1번만 API hit. 패턴 일반화 권장: rate-limited API 호출은 *명시 trigger* 패턴.

### 검증 한계 (사용자 보고 의무 — 정직)

본 세션에서 검증 못 한 항목 (의도적 정직 보고):

- **/naver-seo NameRulesPanel 마운트 보류** — 인라인 편집 구조라 P1-B panel 마운트 위치가 복잡. `/products/new` 주력 등록 flow에만 통합. 사용자가 필요 시 별도 follow-up.
- **honey-score 단위 테스트 미실행** — `tsx` ESM resolver가 TS 모듈 직접 import 실패. Build verification (TSC type check) + 브라우저 E2E로 *통합 검증*만 진행. 순수 단위 테스트는 추후 vitest/jest 도입 시.
- **P1-A 80%+ override 시나리오 실증 못 함** — agreed (100%) + synthesized (80%) 모두 검증했지만, *override* (AI top vs dominant 불일치) 케이스는 AI가 정상 상품명에 대해 정확히 답하는 경우라 trigger 어려움. 코드 path는 build로 검증, 실 trigger는 사용자 실 데이터로 자동.
- **`/api/category/suggest`의 응답에 추가된 `pageValidation` 필드를 UI에서 surface 안 함** — Phase 5의 cache hit `cacheHit` field도 마찬가지로 raw response만 노출. 사용자가 어떤 mode (agreed/override/synthesized)로 매핑됐는지 UI에 명시되지 않음. 향후 enhancement.
- **사용자 시각 검증 권장** — Production https://kkotium-garden.vercel.app/products/new 진입해:
  - 상품명에 "이벤트 할인 무료배송" 입력 시 빨간 panel 발화 확인
  - 정상 상품명 + 카테고리 자동 추천 버튼 클릭 시 정확한 카테고리 자동 입력 확인
  - 태그 3개 이상 입력 후 "검증 시작" 버튼 클릭 시 색상별 결과 표시 확인

### Commit + Push (4 commits)
1. `03cfbdd` feat(7-P1): Sprint 7 P1 — category 1page + name rules + tag dictionary (11 파일, +871 / -9)
2. `8b710d4` fix(p1-a): category-page-validator credential fallback (HTTP 401)
3. `9df3d66` feat(p1-a): synthesize suggestion from page validation when AI fails
4. `a495572` fix(p1-c): tighten tag verification thresholds (30/10 vs naive >0)
- worktree → main: `git merge claude/youthful-gauss-5654af --ff-only` 매 commit 후 ff
- 모든 verify-vercel-deploy.sh --wait exit 0 ✅

### 적용된 작업원칙

- **#17** commit msg `.commit-msg.tmp` + `git commit -F` (4회 모두) ✅
- **#21** 사전 점검 통과 ✅
- **#22** 브라우저 시각 검증 의무 — **사용자 명시 강화 적용** + Claude Preview MCP로 3 시나리오 + E2E flow 모두 실증 ✅
- **#24** 한 turn 안에 11 파일 + 4 commit + functional test + 브라우저 E2E + MD 갱신
- **#26** IA 점검 — registry-driven 패턴 유지. 사이드바 변경 0.
- **#27** 외부 컨트랙트 보존 — `/api/category/suggest` 응답에 *추가만* (pageValidation). HoneyScoreResult 변경 0. Tag input flow 변경 0.
- **#28** Vercel = source of truth ✅
- **#29 (a~e++)** 한글 처리 6+1 규칙 모두 통과 (Write로 한글 직접 입력 + Python audit 0/clean)
- **#31 (a)** SESSION_LOG 1298 + 본 entry → ~1500 (T2 1500 도달 임박, 다음 세션 STEP 0 자동 분할 트리거)
- **#32** TSC + npm run build 모두 통과 (4 commit 동안 4회 검증) ✅
- **#33** useSearchParams 추가 0건
- **#34** worktree 혼동 0회 (Phase 4 + Phase 5 + Sprint 7 P0 + 7-P0-B + 7-P1 누적 0회)
- **#35** 한글 사전 분리 패턴 — NameRulesPanel + TagVerificationPanel 두 컴포넌트의 한글은 직접 코드 inline (10줄 미만 짧은 단어), 별도 .strings.ko.json 불요. honey-name-rules.ts의 BANNED_WORDS 배열은 *상수 정의* (literal 한글 15개)
- **#36** push 후 `verify-vercel-deploy.sh --wait` exit 0 (4회 모두) ✅

### 본 세션 commit
1. `03cfbdd` feat(7-P1): Sprint 7 P1 — category 1page + name rules + tag dictionary
2. `8b710d4` fix(p1-a): category-page-validator credential fallback (HTTP 401)
3. `9df3d66` feat(p1-a): synthesize suggestion from page validation when AI fails
4. `a495572` fix(p1-c): tighten tag verification thresholds (30/10 vs naive >0)
5. (본 entry) docs(plan): record Sprint 7 P1 + browser E2E + Sprint 7 Track B handoff

### 다음 세션 (Sprint 7 Track B = AI Studio M1~M4)

ROADMAP.md "Sprint 7 Track B" 새 인계 메시지 (M1 썸네일 / M2 상세페이지 5섹션 / M3 어도비 통합 / M4 A/B 테스트). **Cloudinary 환경변수 보유** ✅. Adobe Firefly API 키 보유 여부는 사용자 사전 확인 필요.

---

## 2026-05-12 Sprint 7 P0-B enhancement (DataLab market context + 10→3 chunked silent bug fix) ✅

### 본 세션 성격
- Sprint 7 P0 완료 직후 사용자 질문 "모든 관련 API키를 등록했는데 활용할수없는건가요?" + "정확히 클릭데이터가 뭔가요?" 답변 + 즉시 개선 작업.
- "클릭 데이터" 정의 명확화 (impression → click → dwell → purchase 깔때기 중 2단계) + Naver Commerce API + 검색광고 + DataLab + 도매꾹 *4개 API 키* 재점검 → **DataLab Shopping Insights aggregate category click 비중 데이터는 *사용 가능*** 발견.
- 본 개선: 카테고리 트렌드 캐시 추가 + 골든윈도우 평가에 *시장 맥락(market context)* 통합 + **기존 trend-analyzer.ts의 silent 실패 버그도 같이 해소**.
- 한 turn 안에 8 파일 + DB 마이그레이션 + 2 commit (feat + bug-fix) + 검증 + 실증 (수동 cron trigger) + MD 갱신 완료. worktree 혼동 0회.

### 시작 직전 상태
- HEAD `54635f4` = origin/main 일치 ✅
- working tree clean ✅
- stash@{0} 보존 ✅
- MD 줄 수: PROGRESS 203 / ROADMAP 427 / SESSION_LOG 1156 (T1 권고)
- Latest prod deploy SHA == HEAD ✅
- verify-vercel-deploy.sh OK ✅

### 본 세션 작업

#### A. DB 마이그레이션 (Supabase `sprint_7_p0b_category_trend_cache` 적용)
- 신규 테이블 `category_trend_cache`:
  - UNIQUE `cache_key` (`d1:<depth1Name>` 패턴, future-proof `code:<code>` 키도 지원)
  - `trend_score` 0..100 (DataLab ratio 정규화)
  - `volume_score` 0..100 (예약, Search Ad keyword 통합용)
  - `market_level` 'hot' / 'normal' / 'cold'
  - `data_source` + `refreshed_at`
- 인덱스 2개 (unique cache_key, refreshed_at DESC)

#### B. 신규 라이브러리 (`src/lib/naver/category-trend-cache.ts`)
- `refreshCategoryTrendCache()` — DataLab 호출 + upsert. Cron-daily에서 호출.
- `getCachedTrend(cacheKey)` — read-only cache lookup
- `resolveProductMarketContext(category)` — 상품 category 문자열 → depth1 추출 → cache lookup
- `buildD1Key(depth1)` — 표준 key 생성
- 실패 경로는 partial cache 보존 (delete 안 함, lastError만 surface)

#### C. golden-window-tracker.ts 확장
- `GoldenWindowRow`에 3 필드 추가 (additive — 외부 컨트랙트 보존 #27):
  - `marketLevel: 'hot' | 'normal' | 'cold' | 'unknown'`
  - `marketTrendScore: 0..100`
  - `severity: 'critical' | 'warning' | 'note' | 'ok'`
- `computeSeverity(stage, status, marketLevel)` — needs_action + hot = critical / needs_action + normal/unknown = warning / needs_action + cold = note / status='ok' = ok
- `buildMessage` 시장 맥락 별 권장 메시지 분기:
  - hot + miss: "시장 hot인데 미달, 상품명 토큰 교체 권장"
  - cold + miss: "시장 cold라 인내 권장 (광고 ROI 낮음)"
  - normal/unknown + miss: 기존 메시지
- Sort severity rank 기반 (critical → warning → note → ok), tiebreak hours-since-registration DESC

#### D. GoldenWindowWidget UI 갱신
- tone driven by `severity` 대신 단순 `status` (4단계 색상: 빨강/주황/회색/녹색)
- 신규 *market badge*: 상품명 옆에 "시장 hot / 시장 보통 / 시장 cold / 시장 미확정" 표시 (hover-title에 정확 trend_score)
- i18n: `marketLabel` 4 key 추가

#### E. cron-daily piggy-back
- `refreshCategoryTrendCache()` 호출을 daily cron 끝부분 (sourcing recommendation 직후) 추가
- 실패 = 비치명적 (`results.categoryTrendRefreshError`에 기록, ok=true 유지)
- **별도 vercel cron 0건** — daily 3개 (`daily / weekly / inventory-sync`) 그대로 유지, 4번째 cron 추가하지 않음

#### F. **silent DataLab 버그 fix (bonus discovery)**
- 1차 수동 trigger 후 결과: `categoryTrendRefresh: { error: 'datalab_http_400' }` + `trends.source: 'fallback'`
- 직접 DataLab API 테스트로 원인 확인: `errMsg "TypeError: .category -> should NOT have more than 3 items"`
- **DataLab Shopping Insights는 category 배열 최대 3개 제한**. 기존 `trend-analyzer.ts`도 10개 전송 중이라 *Daily cron의 Discord 추천이 모두 Perplexity fallback으로 동작 중*이었음 (사용자는 모르고 있었음).
- Fix: 두 모듈 모두 3개씩 chunk 후 sequential POST (4 batches × 3 cats = 5번째 batch는 1개 cat).
- 2차 trigger 후 결과: **`{fetched: 10, upserted: 10}`**, **`trends.source: 'datalab'`**, trend keywords `['청소기', '공기청정기', '이어폰']` (실 도매꾹 트렌드 노출).

### 검증
- TSC `npx tsc --noEmit` 0 errors (2회) ✅
- Production build `npm run build` 28/28 prerender (/dashboard 51.6 → 51.7 kB +0.1 kB market badge)
- NFC + FFFD audit 6개 파일 모두 0/clean ✅
- 한글 sentinel grep 0 신규 매칭 ✅
- Production smoke (push 후):
  - `GET /dashboard` 200 ✅
  - `GET /crawl` 200 ✅
  - `GET /automation` 200 ✅
- **실증** (Phase 5와 같은 패턴 — 코드 path가 production에서 실제 작동 확인):
  - 수동 trigger `GET /api/cron/daily` → `ok: true` + `categoryTrendRefresh: {fetched: 10, upserted: 10}` + `trends.source: 'datalab'`
  - `category_trend_cache` 테이블 10 rows 정상 (생활/건강 100, 디지털/가전 99, ..., 화장품/미용 34 — 모두 정렬됨)
  - hot 5개 + normal 5개 — 본 골든 윈도우 평가에서 사용자 상품 등록 시 즉시 활용 가능
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production 772b111 ✅

### 본 세션 학습 (영구 기록)

1. **사용자 질문이 *silent bug 발견*으로 이어진 사례** — 사용자가 "API 키 다 등록했는데 활용 안 됩니까?" 질문이 없었으면 trend-analyzer.ts의 10→fallback silent failure는 계속 숨어있었을 것. *재점검 트리거*로서 사용자 의문의 가치 증명. 일반화 규칙: *"이게 정말 작동하나요?"* 식 질문은 항상 검증을 다시 수행할 것.

2. **DataLab Shopping Insights API 제약** — 공식 문서에 명시되어 있지만 우리 코드에서 누락:
   - **category 배열 max 3 items** — 본 세션에서 발견
   - timeUnit `'date' | 'week' | 'month'`
   - startDate / endDate (yyyy-MM-dd)
   - device / gender / ages 선택 필터
   - 응답 ratio는 *batch 내 최대값을 100으로 정규화*
   - Cross-batch 정규화 필요 시 *anchor category*를 매 batch에 포함하는 패턴 사용 가능 (본 세션은 global max 후-정규화 simpler 방식 채택)

3. **클릭 데이터 — 진단적 가치 + 비공개 한계 + 대안** —
   - "클릭"의 정확한 정의: 검색 결과 페이지에서 *상품 상세 페이지로 유입한* 사용자 (impression 다음 단계).
   - per-product 클릭 데이터는 Naver Commerce API + 검색광고 API + DataLab 어디서도 노출 안 됨 (스마트스토어 관리자 패널 UI에서만, public API 없음).
   - 대신 사용 가능한 *aggregate level click* 데이터: DataLab Shopping Insights → 카테고리별/연령별/성별 click 비중. *상품 수준은 아니지만 시장 맥락으로 활용 가능*.
   - 본 세션 enhancement는 *카테고리 트렌드*를 골든윈도우 평가에 통합 — 같은 D+3 0건이라도 hot 시장 = critical (상품명 토큰 교체), cold 시장 = note (인내 권장). 진단 정밀도 향상.

4. **silent failure 패턴의 조기 발견 → 별도 commit 분리** — 본 세션의 두 commit:
   - `c08b761` feat(7-P0-B): enhance golden window with DataLab market context
   - `772b111` fix(datalab): chunk DataLab category requests to 3-per-batch (silent failure)
   분리 commit으로 git history에서 *feature vs bug fix*가 명확. 향후 rollback 시 bug fix만 보존 가능.

### 검증 한계 (사용자 보고 의무 — 정직)

- **사용자 상품 0개 → market context 활용 검증 불가** — 카테고리 trend cache는 채워졌지만 (10 rows DB 검증 완료) 골든윈도우 평가 시 product.category 매핑이 *실 상품에서* 어떻게 결정되는지는 사용자 첫 도매꾹 상품 등록 후만 검증 가능.
- **product.category 필드 source 한계** — 본 세션 enrich 로직은 `product.category` (자유 텍스트 필드) → depth1 추출. 사용자가 씨앗 심기에서 *어떻게 category 입력하는지*에 따라 매칭률이 달라짐. naverCategoryCode 기반 lookup도 추가하면 더 정확 (별도 Sprint).
- **DataLab batch normalization** — 본 fix는 global max 후-정규화 방식. *anchor 패턴*보다 cross-batch 비교 정확도 약간 떨어질 수 있음 (~10% noise). hot/normal/cold buckets 분류에는 충분, 정밀 비교 필요 시 향후 anchor 패턴 도입.
- **사용자 시각 검증 권장** — https://kkotium-garden.vercel.app/dashboard 진입해 Section 2 Inbox 골든윈도우 widget의 empty state는 시장 badge 미표시 정상 (활성 상품 0건). 사용자 첫 상품 등록 + D+1 시점 도래 시 *market badge* + *severity tone* 자동 surface 확인 권장.

### Commit + Push (2 commit)
- `c08b761` feat(7-P0-B): enhance golden window with DataLab market context (+377 / -19, 6 파일 — 신규 1 + 수정 5)
- `772b111` fix(datalab): chunk DataLab category requests to 3-per-batch (silent failure) (+86 / -69, 2 파일)
- worktree → main: `git merge claude/youthful-gauss-5654af --ff-only` (ff)
- push `54635f4..772b111 main -> main`
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production 772b111 ✅

### 적용된 작업원칙

- **#17** commit msg `.commit-msg.tmp` + `git commit -F` (2회) ✅
- **#21** 사전 점검 통과 ✅
- **#22** production smoke + **수동 cron trigger로 실증** (categoryTrendRefresh + trends.source 둘 다 검증) ✅
- **#24** 한 turn 안에 8 파일 + DB 마이그레이션 + 2 commit + 검증 + 실증 + MD 갱신
- **#26** IA 점검 — GoldenWindowWidget *내부 UI* 만 갱신 (market badge 추가). 다른 widget / 카드 변경 0.
- **#27** 외부 컨트랙트 보존 — `GoldenWindowRow`에 *추가만* (marketLevel + marketTrendScore + severity). 기존 consumer 영향 0.
- **#28** Vercel = source of truth ✅
- **#29 (a~e++)** 한글 처리 6+1 규칙: (a~e++) 모두 통과 — strings.ko.json에 marketLabel 4 key 추가 (NFC clean, sentinel grep 0)
- **#31 (a)** SESSION_LOG 1156 + 본 entry → ~1400 (T1 1000 초과, T2 1500 미달, 권고만)
- **#32** TSC + npm run build 모두 통과 ✅
- **#33** useSearchParams 추가 0건
- **#34** worktree 혼동 0회 (Phase 4 + Phase 5 + Sprint 7 P0 + 7-P0-B enhancement 누적 0회)
- **#35** 한글 사전 분리 패턴 — `GoldenWindowWidget.strings.ko.json` 확장 (marketLabel 4 key)
- **#36** push 후 `verify-vercel-deploy.sh --wait` exit 0 (2회 모두) ✅

### 본 세션 commit
1. `c08b761` feat(7-P0-B): enhance golden window with DataLab market context
2. `772b111` fix(datalab): chunk DataLab category requests to 3-per-batch (silent failure)
3. (본 entry) docs(plan): record Sprint 7 P0-B enhancement + DataLab fix

### 다음 세션 (Sprint 7 P1) 작업 변경 없음
ROADMAP.md "Sprint 7 P1" 인계 메시지 그대로 유효 (P1-A 카테고리 1페이지 + P1-B 금기어 + P1-C 태그 사전). 본 P0-B enhancement는 *P0 후속 작업*으로 P1 진입을 막지 않음.

---

## 2026-05-12 Sprint 7 P0 (P0-A 옵션 정확도 + P0-B 골든윈도우 + P0-C 효자상품 — Inbox 4 placeholders 모두 live) ✅

### 본 세션 성격
- Phase 5 (Sprint 6-E 카테고리 캐시) 직후 같은 worktree에서 Sprint 7 P0 진입. 사용자 명시 "이어서 진행" + "no clarifying questions" 정책 → 시니어 판단으로 진행.
- 본 Sprint 7 P0의 **궁극 성과**: 2026-05-12 한 채팅 안에서 시작했던 dashboard 5-section 재편 (Phase 2)부터 시작한 *Inbox 4 placeholders 모두 live widget으로 교체* — Phase 3 (가격 변동) → Phase 4 (다른 셀러) → Sprint 7 P0-B (골든 윈도우) → Sprint 7 P0-C (효자 상품). Inbox Section 2는 이제 0 placeholders.
- 한 turn 안에 15 파일 (+1171 / -51) + 검증 + commit + push + verify + MD 갱신 완료. **Phase 3 학습 적용 — worktree vs main 절대 경로 혼동 0회 (Phase 4 + Phase 5 + Sprint 7 P0 누적 0회)**.

### 시작 직전 상태
- HEAD `b91872a` = origin/main 일치 ✅
- working tree clean ✅
- stash@{0} 보존 ✅
- MD 줄 수: PROGRESS 203 / ROADMAP 378 / SESSION_LOG 1016 (T1 1000 도달, 권고만)
- Latest prod deploy SHA == HEAD ✅
- verify-vercel-deploy.sh OK ✅

### 본 세션 작업

#### A. P0-A 도매꾹 OpenAPI v4.5 옵션 정확도 (리서치 11번)
- 신규 `src/lib/option-integrity.ts`:
  - `hashOptions(options)` — selectOpt 정규화 → sha1 첫 32자 (no_options:0 sentinel for empty)
  - `validateStatus(status)` — 비-'판매중' 시 vacation flag (level: block)
  - `validateChannel(isOnSupply)` — !isOnSupply 시 channel_mismatch flag (level: warning)
  - `detectOptionDrift(prev, curr)` — hash 미스매치 시 options_drift flag (level: warning)
  - `evaluateIntegrity()` + `aggregateLevel()` — single-call wrapper
- `/api/crawler/domemae/route.ts`: response에 `optionsHash` + `integrityFlags` + `integrityLevel` 추가 (additive, 기존 consumer 영향 0)
- `/crawl/page.tsx`: `SingleResult` interface에 integrityFlags 필드 추가 + `IntegrityBanner` 컴포넌트 (단건 결과 카드 위에 마운트, tone: block 빨강 / warning 노랑 / ok 녹색)

#### B. P0-B 등록 7일 골든 윈도우 (리서치 10번)
- 신규 `src/lib/golden-window-tracker.ts`:
  - 5 stages: day_0 (<24h) / d_plus_1 (24-72h) / d_plus_3 (72-168h) / d_plus_7 (168-336h) / expired (336h+)
  - 목표: D+3 = 1 sale, D+7 = 3 sales (sales = Product.salesCount)
  - Status: ok / needs_action. Sorted needs_action first, oldest first within needs_action (가장 시급한 것 위로).
  - `isInsideGoldenWindow(createdAt, asOf)` helper export
- 신규 `GET /api/golden-window/active`
- 신규 `GoldenWindowWidget.tsx` + `.strings.ko.json` — Inbox 3rd placeholder 교체
  - Empty state: green "추적 대기 중" (활성 상품 0건 시)
  - Alert row: needs_action orange tone, expired gray tone, ok green tone

#### C. P0-C 효자 상품 자동 식별 (리서치 10번 — 멱법칙)
- 신규 `src/lib/pareto-analyzer.ts`:
  - `computePareto()` — 30-day OrderItem aggregation (status NOT IN CANCELLED/RETURNED/...)
  - paretoSlice = top 20% by count (min 1)
  - topFive (대시보드용) + paretoShare (총 매출 대비 %) + totalRevenue
- 신규 `GET /api/products/pareto`
- `TopProductsCard.tsx` (Section 3) 활성화:
  - 기존 "P0-C 준비 중" placeholder → 매출 있을 때 ranked list (rank + 상품명 + share %), 매출 0건 시 친화 empty body 유지
  - Badge: "30일 기준" (active) vs "P0-C 대기" / "계산 중" / "조회 실패"
- 신규 `ParetoInboxRow.tsx` + `.strings.ko.json` — Inbox 4th placeholder 교체
  - Compact 1-row summary: "TOP N/M · X% 차지" + #1 상품명 short

#### D. Dashboard 통합 (Inbox 4 placeholders → 4 live widgets)
- `dashboard/page.tsx`:
  - import 2개 신규 (GoldenWindowWidget, ParetoInboxRow), Trophy/InboxPlaceholderRow import 제거
  - Inbox Section 2: PriceMovementWidget + CompetitorRadarWidget + **GoldenWindowWidget** + **ParetoInboxRow** (placeholder 0건)

#### E. Registry 갱신
- `golden-window` pending → active, frequency on-event (no cron — widget fetch 시 pure compute)
- `pareto-recalc` pending → active, frequency on-event (no cron — pure compute)
- `api/automation/registry/route.ts`: case 'golden-window' / 'pareto-recalc' → lastRun null (on-demand, always live)

### 검증
- TSC `npx tsc --noEmit` 0 errors ✅
- Production build `npm run build` 28/28 prerender ✅ (/dashboard 50.4 → 51.6 kB +1.2 kB, /crawl 19.7 → 20.1 kB +0.4 kB IntegrityBanner)
- NFC + FFFD audit 15개 파일 모두 0/clean (crawl/page.tsx의 FFFD 2건은 기존 sanitize 정규식, 본 세션 무관) ✅
- 한글 sentinel grep 0 신규 매칭 ✅
- Production smoke (push 후):
  - `GET /dashboard` HTTP 200 ✅
  - `GET /crawl` HTTP 200 ✅
  - `GET /automation` HTTP 200 ✅
  - `GET /api/golden-window/active` HTTP 200 `{"data":[]}` (cold start, 활성 상품 0건 → []) ✅
  - `GET /api/products/pareto` HTTP 200 `{"totalRevenue":0,"totalOrders":0,...}` (cold start) ✅
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production 8c477ee (state=REGISTERED) ✅

### 본 세션 학습 (영구 기록)

1. **Inbox placeholder 4건 모두 live 전환 완료 — 본 채팅 1일의 누적 성과** — 2026-05-12 한 채팅에서:
   - Phase 2 (4-Section dashboard 재편)에서 4 placeholders 도입
   - Phase 3 → 가격 변동 (1번째 placeholder live)
   - Phase 4 → 다른 셀러 (2번째 placeholder live)
   - Sprint 7 P0-B → 골든 윈도우 (3번째 placeholder live)
   - Sprint 7 P0-C → 효자 상품 (4번째 placeholder live)
   Inbox Section 2가 이제 4개의 production-active widget으로 가득 참. Sidebar 변경 0건, dashboard layout 변경 0건 — *registry-driven IA 패턴이 4 Sprint 누적에서 자연 일관성 유지*. Phase 1 (/automation 골격)의 가치 증명.

2. **on-event frequency 패턴 — cron-less automation** — P0-B (골든윈도우) + P0-C (효자상품) 모두 cron 없음. Widget이 fetch 시 server-side에서 pure compute (Product / OrderItem 테이블 직접 쿼리). Vercel cron quota 0건 추가, 데이터는 항상 최신 (lastRun null로 명시). 향후 비슷한 *"DB에서 직접 계산 가능한 분석"*은 같은 패턴 적용 가능 — 즉시 *live* 상태로 신규 자동화 등록 가능.

3. **TopProductsCard graceful activation** — Phase 2에서 마운트한 placeholder card를 P0-C에서 *덮어쓰기 0*으로 activation. Hook 추가 (useSWR) + 조건부 body 분기 (`hasData ? RankedList : EmptyBody`). 기존 empty 텍스트는 그대로 보존 → cold start에서 사용자 경험 미변경, 데이터 누적 후 자동 시각 전환. *Phase 2에서 정한 카드 골격이 Sprint 7까지 안정 유지*.

4. **integrity flags 점진 적용 패턴** — `/api/crawler/domemae` 응답에 *additive* 필드만 추가 (`optionsHash`, `integrityFlags`, `integrityLevel`). 기존 consumer (씨앗 심기 prefill, AlternativeProductPanel, DomemaeCrawler 등)은 변경 0건. 새 consumer (`/crawl` IntegrityBanner) 만 read. 외부 컨트랙트 보존 (#27) 원칙 적용.

### 검증 한계 (사용자 보고 의무 — 정직)

- **P0-A 실 데이터 검증 불가** — 현재 도매꾹 상품 0건이라 첫 crawl 동선에서 integrityFlags 발화 불가. 사용자 첫 도매꾹 URL crawl 시 *vacation* (status != 판매중) / *channel_mismatch* (!isOnSupply) flag 자동 trigger. *options_drift*는 prevHash 필요 — 첫 crawl 후 *재크롤*에서만 발화 (현재 재크롤 UI는 없음 — 별도 Sprint).
- **P0-B 골든 윈도우 cold start** — 활성 상품 0건 → empty state. 사용자 첫 도매꾹 상품 등록 + naverProductId 발급 후 day_0 stage 즉시 trigger.
- **P0-C Pareto cold start** — 주문 0건 → totalRevenue 0. 사용자 첫 판매 후 30-day window에 누적 시 자동 산정.
- **사용자 시각 검증 권장** — https://kkotium-garden.vercel.app/dashboard 직접 진입해 Section 2 Inbox 4 widgets 모두 empty state green row + Section 3 TopProductsCard "P0-C 대기" badge → "30일 기준" 자동 전환 (주문 발생 시) 확인 권장.
- **클릭 데이터 미수집** — 골든 윈도우 D+1 target은 *클릭* 1+ 기준이지만 본 프로젝트는 Naver Commerce API click 데이터 미수집 (별도 integration 필요). 현재 D+1 target=0 (사실상 항상 통과). 향후 클릭 데이터 수집 시 target 상향 조정 권장.

### Commit + Push
- `8c477ee` feat(7-P0): Sprint 7 P0 — option integrity + golden window + pareto (+1171 / -51, 15 파일 — 신규 9 + 수정 6)
- worktree → main: `git merge claude/youthful-gauss-5654af --ff-only` (ff)
- push `b91872a..8c477ee main -> main`
- `verify-vercel-deploy.sh --wait` 결과: OK (github-deployments) — production 8c477ee (state=REGISTERED) ✅

### 적용된 작업원칙

- **#17** commit msg `.commit-msg.tmp` + `git commit -F` ✅
- **#21** 사전 점검 통과 ✅
- **#22** production smoke (5개 endpoint 200 + 신규 2개 API cold start `{"data":[]}` / `{"totalRevenue":0,...}` 검증) — 시각 검증은 사용자 환경에서 (보고 의무 충족)
- **#24** 한 turn 안에 15 파일 + 검증 + commit + push + verify + MD 갱신
- **#26** IA 점검 — Inbox 두 placeholder 교체 + Section 3 기존 카드 activation (Sidebar 변경 0, registry-driven IA 패턴 보존)
- **#27** 외부 컨트랙트 보존 — `/api/crawler/domemae` 응답 *추가만* (optionsHash + integrityFlags + integrityLevel). `SearchFilter` / `ItemDetail` interface 변경 0.
- **#28** Vercel = source of truth ✅
- **#29 (a~e++)** 한글 처리 6+1 규칙:
  - (a) Edit 한글 다량 newText 1건 (option-integrity의 IntegrityFlag message — 짧은 단어, NFC clean) — 모두 Write로 처리하고 grep 검증 통과
  - (b) MD 갱신 = Python 안전 삽입 패턴 (본 entry)
  - (c) 위젯 한글 const → strings.ko.json 분리 (#35 패턴, 2개 신규 사전)
  - (d) 셸 명령 한글 0건
  - (e) sentinel grep 0 신규 매칭
  - (e+, e++) 닉네임 호명 0건
- **#31 (a)** SESSION_LOG 1016 + 본 entry → ~1300 (T1 1000 초과 + T2 1500 미달, 권고만. 다음 세션 진입 시 자동 분할 진행 권장)
- **#32** TSC + npm run build 모두 통과 ✅
- **#33** useSearchParams 추가 0건
- **#34** worktree vs main 절대 경로 혼동 0회 발생 — Phase 4 + Phase 5 + Sprint 7 P0 누적 0회 (Phase 3 학습 패턴 안정 적용)
- **#35** 한글 사전 분리 패턴 — `GoldenWindowWidget.strings.ko.json` (10 keys) + `ParetoInboxRow.strings.ko.json` (10 keys), 모두 NFC clean / FFFD 0 ✅
- **#36** push 후 `verify-vercel-deploy.sh --wait` exit 0 (github-deployments path) ✅

### 본 세션 commit
1. `8c477ee` feat(7-P0): Sprint 7 P0 — option integrity + golden window + pareto
2. (본 entry) docs(plan): record Sprint 7 P0 + Sprint 7 P1 handoff

### 다음 세션 (Sprint 7 P1) 작업 = 카테고리 1페이지 + 금기어 + 태그 사전

1. **P1-A 카테고리 1페이지 일치율 검증** — `src/lib/category-page-validator.ts` (신규) + `/api/category/suggest` 강화 (Phase 5 cache layer 위에 1페이지 분포 분석 추가)
2. **P1-B 상품명 금기어 페널티 강화** — `src/lib/honey-score.ts` 강화 (이벤트/할인/배송/적립/쿠폰 키워드 + 중복 단어 3회+ + 허용 외 특수문자) + 씨앗 심기 / 검색 조련사 UI 빨간 알림
3. **P1-C 태그 사전 등재 검증** — `src/lib/naver/tag-dictionary.ts` (신규, 네이버 검색광고 API 키워드 도구 활용) + 태그 입력 UI 경고
4. automation-registry: category-1page + tag-dictionary pending → active
5. 검증 + commit + push + verify + MD 갱신 + Sprint 7 Track B AI Studio (M1~M4) 인계

---

