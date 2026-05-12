# Sprint 계획 (Sprint 6 / 6.5 / 6-D / 7 / 8 / 9+)

> **이 파일의 역할**: 진행중·예정 Sprint 계획. PROGRESS.md에서 분리됨 (작업원칙 #31 (b)).
> **분할 시점**: 2026-05-12 Session E-2 Phase 2 (HEAD `5892c42`)
> **현재 진행 위치**: 다음은 Phase 3 = Sprint 6-B 가격 변동 백엔드 (ROADMAP.md 인계 메시지 참조)

---

## Sprint 6 재구성 (2026-05-07) — Open API ROI Top 5 우선 + Private API 신청 진행

본 세션(2026-05-07) 도매꾹 Private API 리서치 결과로 Sprint 6 우선순위 *완전 재구성*. 직전 인계의 P0-A → P0-B → P0-C → P0-D → S-2 순서를 폐기하고, **Open API ROI Top 5 묶음**으로 변경. 옛 Sprint 6 계획(아래 "Sprint 6/7/8 계획 (2026-05-08 신규)" 섹션)은 *deprecated*, 본 섹션이 우선.

### 우선순위 결정 근거
- 새싹 단계 ROI Top 5 = 모두 Open API만으로 충분 (Private 발급 대기 시간 0)
- 5월 14일 변경 영향 0 (실사용 mode 유지)
- Private API 신청 완료 (전체 28개 + 샘플 D 연동목적)

### Sprint 6 신규 작업 (Open API ROI Top 5)

| # | 작업 | 신규 파일 | 매출 임팩트 |
|---|---|---|---|
| 6-A | 재고 실시간 폴링 | `src/lib/dome-inventory-poller.ts` + `src/app/api/cron/inventory-sync/route.ts` | 직접 (품절 손실 방지) |
| 6-B | 가격 변동 감지 | `src/lib/dome-price-tracker.ts` + PriceHistory 모델 | 직접 (마진 보호) |
| 6-C | 공급사 휴가/응답률 모니터 | `src/lib/dome-seller-monitor.ts` + SellerStatus 캐시 | 직접 (클레임 방지) |
| 6-D | 꼬띠 AI 추천 v1 (Open 기반) | `src/lib/dome-curator.ts` + 정원 일지 위젯 | 운영효율 (소싱시간↓) |
| 6-E | 카테고리 트리 풀 캐시 | `src/lib/dome-category-cache.ts` + DomeCategory + CategoryMapping | 운영효율 (등록시간↓) |

### Private API 신청 (병행 진행)
- 신청 일시: 2026-05-07 본 세션
- 권한 범위: 전체 28개 (구매용 6 + 판매용 13 + 공통 3 + 기타 6)
- 연동 유형: ③ 자사몰/오픈마켓 직접 연동
- 연동 목적: 샘플 D (광범위 권한용, 145자)
- 통과 예측: 도매꾹 1년+ 사업자 회원 + 기존 키 정상 + 정합성
- 결과 대기: 1~3일 영업일

### Sprint 8 (파워셀러 대비 — Private 발급 후)
- 자동 발주 (`setOrder` + `getOrderList` + `getOrderView`)
- 송장 자동 회수
- 재고 일괄 확인 (`getAllSupplyChk` 전환 — Open 폴링 → Private 일괄)
- 반품 자동화 (`getOrderReturn`)

### 참고 문서
- 전략 보고서: `docs/research/DOMEGGOOK_API_INTEGRATION_STRATEGY_2026_05.md` (266줄)
- 본 세션 상세: `docs/plan/SESSION_LOG.md` 2026-05-07 entry

---

## Sprint 6/7/8 계획 (2026-05-08 신규)

본 계획은 `docs/research/SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md` 리서치(15개 핵심 발견사항) + 현재 앱 코드 grep 갭 분석으로 도출. 각 항목은 *리서치의 1·2·3순위* + *새싹셀러 ROI*로 우선순위 결정.

### 갭 분석 요약 (20개 항목 매핑)

| # | 리서치 항목 | 현재 앱 | 갭 |
|---|---|---|---|
| 1 | 등급 체계 매출+굿서비스 이중 | ✅ GoodServiceWidget | 800만원 상향 반영 확인 |
| 2 | 적합도/인기도/신뢰도 3축 | ✅ honey-score.ts | 인기도(찜·클릭) 추적 부재 |
| 3 | 단건 vs CSV 일괄 | ✅ 메인 흐름 단건 | /products/upload 잔재 |
| 4 | 상품명 25-50자 | ✅ 25-35자 hint + 점수화 | 금기어 검증 미강화 |
| 5 | 황금 키워드 7-10개 | ✅ 검색 조련사 5단계 | 검색량/경쟁률 자동 산정 보강 |
| 6 | 카테고리 1페이지 분석 | ⚠️ category/suggest 있음 | **1페이지 일치율 검증 룰 부재** |
| 7 | 태그 사전 등재 검증 | ❌ | **신규** |
| 8 | 다크패턴 정가 부풀리기 경고 | ❌ | **신규** |
| 9 | AI 카테고리 추천 정확도 | ✅ category/suggest | 사람 검수 단계 명시 부재 |
| 10 | 등록 7일 골든 윈도우 | ❌ | **신규 ★** |
| 11 | 도매꾹 v4.5 옵션 해시+텍스트 | ❌ | **신규 ★** |
| 12 | 도매꾹 vacation/channel 검증 | ❌ | **신규 ★** |
| 13 | Naver Commerce API 등록 | ✅ register/route | 본격 활용 미실행 |
| 14 | AiTEMS 자연어 키워드 | ⚠️ trend-analyzer 있음 | 등록 시 자연어 제안 없음 |
| 15 | D+30 한달사용 알림톡 | ✅ month-review-pending | 50건+ 후 활성화 |
| 16 | D+3~5 구매확정 알림톡 | ✅ confirmation-pending | 동일 |
| 17 | 반품안심케어 매출 +13.6% | ✅ return-care-fees + honey 가산 | 완료 |
| 18 | 효자 상품 식별 (멱법칙) | ❌ | **신규 ★** |
| 19 | 상품명 금기어 페널티 | ⚠️ 부분 | 명시적 알림 부재 |
| 20 | 광고 ROAS 추적 | ⚠️ 시뮬레이터만 | 실제 추적 부재 |

### Sprint 6 — P0 (즉시 ROI, 매출 직접 영향)

**기간 목표**: 2-3 채팅 세션 안에 P0-A·B·C 모두 완료.

**P0-A. 도매꾹 OpenAPI v4.5 옵션 정확도 강화** (리서치 11번)
- `selectOpt` 해시값 + 옵션 텍스트 동시 비교 → 변경 감지 시 알림
- `seller.vacation` 휴가 기간 검증 → 휴가 중 공급사 상품 등록 차단
- `channel` (도매꾹/도매매) 검증 → 마진 오차 차단
- 위치: `src/lib/crawler/auto-mapper.ts`, `src/app/crawl/page.tsx`, `src/lib/option-integrity.ts` (신규)
- 검증: 실제 도매꾹 상품 5건으로 옵션 변경/휴가/채널 케이스 테스트

**P0-B. 등록 7일 골든 윈도우 트래킹 위젯** (리서치 10번)
- DB: `Product.registeredAt` 활용. D+1, D+3, D+7 시점에 클릭/판매 상태 체크
- 미달 상품 → 정원 일지 위젯에 알림
- "상품명 토큰 1개 교체 권장" 자동 제안 (가장 약한 키워드)
- 위치: `src/lib/golden-window-tracker.ts` (신규), `src/components/dashboard/GoldenWindowWidget.tsx` (신규)
- 검증: 임의 등록일 5건 mock 주입 → D+1/3/7 분기별 위젯 렌더링 확인

**P0-C. 효자 상품 자동 식별 (멱법칙 시각화)** (리서치 10번)
- 매출 상위 20% 상품 자동 식별 → 정원 일지 위젯
- "이 상품에 광고 80% 집중하세요" 가이드
- 위치: `src/lib/pareto-analyzer.ts` (신규), `src/components/dashboard/ParetoTopWidget.tsx` (신규)
- 검증: orders 데이터 mock 50건 → Top 20% 분류 + 위젯 렌더링

### Sprint 7 — P1 (SEO 정확도 강화, 노출 직접 영향)

**P1-A. 카테고리 1페이지 일치율 검증** (리서치 6번)
- 메인 키워드로 네이버 쇼핑 검색 → 1페이지 상품 카테고리 분포 → 80% 일치 카테고리만 추천
- 위치: `src/lib/category-page-validator.ts` (신규), `src/app/api/category/suggest/route.ts` 강화

**P1-B. 상품명 금기어 페널티 강화** (리서치 4번)
- 이벤트/할인/배송/적립/쿠폰 키워드 + 중복 단어 3회+ + 허용 외 특수문자 → 명시적 빨간 알림
- 위치: `src/lib/honey-score.ts` 강화, 씨앗심기 UI 추가

**P1-C. 태그 사전 등재 검증** (리서치 7번)
- 입력된 태그가 네이버 태그사전에 있는지 검증 → 없으면 "SEO 효과 미미" 경고
- 활용: 네이버 검색광고 API 키워드 도구 (CUSTOMER_ID: 3755315)
- 위치: `src/lib/naver/tag-dictionary.ts` (신규)

### Sprint 8 — P2 (운영 도구 강화)

**P2-A. 다크패턴 정가 부풀리기 경고** (리서치 8번)
- 도매가 대비 판매가 3배 이상 + 즉시할인 30%+ 동시 → "공정위 다크패턴 위험" 경고
- 위치: `src/components/products/MarginCalculator.tsx` 강화

**P2-B. AiTEMS 자연어 키워드 제안기** (리서치 13번)
- 카테고리별 "상황·용도·세대" 키워드 제안 (예: 가구 → "원룸 미니멀", "신혼 첫집", "MZ 자취")
- 위치: `src/lib/aitems-natural-keywords.ts` (신규)

**P2-C. 등급 임계값 2025.12.2 개편 반영** (리서치 1번)
- 파워 등급 기준 800만원 + 굿서비스 이중 평가 → GoodServiceWidget 명시
- 위치: `src/components/dashboard/GoodServiceWidget.tsx` 강화

### P3 — 후순위 (매출 600만원+ 후)

- **P3-A**. Tailscale Funnel + home-proxy 큐 분리 (재시도 3회 + DLQ)
- **P3-B**. Naver Commerce API 본격 활용
- **P3-C**. 광고 ROAS 추적 (네이버 검색광고 API)

### 잔여 Z-시리즈 (별도 sub-graph)

- **Z-3c'**: `/products/sourced` + `/products/upload` + `/products/[id]/edit` Hard delete (Q1·Q2·Q3 진단 완료, 꽃졔님 개별 Y/N 승인 필요)
- **Z-3e**: 백업 파일 67개 일괄 정리
- **Z-Sec**: 14개 Supabase 테이블 RLS 정책 설계

---

## Sprint 7 — Smart Asset Workflow v3.1 FINAL (2026-05-12 채택)

### Sprint 7 목표
상품 1개를 소싱한 시점에 손길 필요도가 자동 진단되고, 진단 결과에 따라 썸네일부터 상세페이지까지 작업 범위가 자동 결정되는 시스템. 디자이너 감각은 L3/L4 상품에만 집중 투입.

### Sprint 7 매트릭스

| Sprint | 작업 | Claude 활용 | 분량 | API | 우선순위 |
|---|---|---|---|---|---|
| **7-Diag** | 진단 모듈 MVP + CTI 8축 추론 | Vision 프롬프트 다듬기 / Artifacts 시각화 위젯 | L | Anthropic(옵션) | ⭐⭐⭐ |
| **7-Skel** | 12개 골격 정의 + skeleton-matcher | Skills theme-factory 일괄 생성 / Artifacts 갤러리 | M | — | ⭐⭐⭐ |
| **7-M1** | 썸네일 자동화 4변형 (clean/price/badge/lifestyle) | Skills canvas-design / Artifacts 미리보기 | M+ | Cloudinary | ⭐⭐⭐ |
| **7-M2** | 5섹션 빌더 (골격 기반 가변 3-6섹션) | Adobe MCP fill_text / Skills frontend-design | L | — | ⭐⭐⭐ |
| **7-Lib** | 라이프스타일 라이브러리 (골격 태그 인덱싱) | Adobe MCP asset_search 월초 큐레이션 | M | Adobe MCP | ⭐⭐⭐ |
| **7-M4** | 썸네일 A/B 테스트 (CTR 기반 자동 승자) | Artifacts A/B 결과 시각화 | S | — | ⭐⭐ |
| **7-M3** | 어도비 워크플로우 (PSD Variables CSV 머지) | Skills xlsx 무결성 검증 | M | — | ⭐⭐ |
| **7-X** | 반품안심케어 적용 ↔ 미적용 매출 검증 | Artifacts 비교 시각화 | S | — | ⭐⭐ |

### 12주 점진적 로드맵

| 시점 | 작업 | 산출물 (그 시점에 사용 가능한 MVP) |
|---|---|---|
| Week 1-2 | 7-Diag MVP | Sharp 4축 + CTI 룰 기반 + 대시보드 L 배지 |
| Week 2-3 | 7-Skel 12개 골격 정의 | Skills theme-factory 일괄 생성 + JSON 명세 + Tailwind 토큰 |
| Week 3-5 | 7-M1 + 7-M2 | 썸네일 4변형 자동 생성 + 5섹션 가변 합성 + Groq 카피 + 다크패턴 필터 |
| Week 6-8 | 7-Lib + 사전 큐레이션 | Adobe MCP 100-200장 시드 + Supabase Storage 인덱스 + cooldown 관리 |
| Week 9-12 | 7-M3 + L4 풀 워크플로우 | Photoshop CSV 머지 + Lightroom 마스터 프리셋 + 디자이너 핸드오프 |

### Sprint 7 진입 조건
- Sprint 6 마무리(6.5/6-Pre/6-A~E)는 별도 트랙으로 병렬 진행
- 7-Diag MVP는 Sprint 6과 의존성 없음, 본 v3.1 FINAL 채택 직후 진입 가능

### Sprint 7 완료 조건
- 새 상품 1개 소싱 → 진단 → 자동 L 등급 결정 → 등급별 자동 합성 → 검수 → 등록까지 end-to-end 작동
- CTI 자동 매칭 정확도 사람 판단 대비 80% 이상
- 상품 등록 시간 평균 60분 → 등급별 평균 5-15분으로 단축

---

---

## v2.0 아키텍처 채택 — Sprint X / Sprint Y / Sprint Z (2026-05-12 신설)

본 시리즈는 **2026-05-12 사용자 제공 "꽃틔움 가든 아키텍처 v2.0" 리서치** (`docs/research/KKOTIUM_V2_ARCHITECTURE_2026_05.md`) 채택에 따른 새 Sprint 트랙입니다.

기존 Sprint 7 Track B (M1~M4 AI Studio) 계획은 *Adobe Firefly Services API 라이선스 차단* + v2.0 아키텍처 채택으로 **재구성**됨. 본 Sprint X/Y/Z가 Track B의 새 형태.

작업원칙 #37 (Production runtime never calls image generation APIs) 강제 적용. 자세한 근거는 `KKOTIUM_V2_ARCHITECTURE_2026_05.md` 0~10 section 참조.

### Sprint X — Gemini 제거 + 정적 자산 라이브러리 구축 (7일 액션 플랜)

본 Sprint는 v2.0 PDF Section 7 "수정된 7일 액션 플랜"의 직접 반영.

**Day 1 — Claude 세션에서 Adobe MCP 탐색 + 정적 자산 라이브러리 초기 구축**
- 사용자가 Claude Web Pro Max 세션에서 진행:
  - Adobe `search_design` 으로 꽃·리빙·식품 카테고리별 Express 템플릿 5종 후보 수집
  - `create_firefly_board` 로 카테고리별 무드보드 1개씩 생성 (Firefly Web credit 활용)
  - Lightroom에서 보유 사진 50장 골라 카테고리 태깅
- 본 앱 측: Supabase Storage 버킷 구조 설계 (`templates/`, `lifestyle/`, `branding/`, `psd-masters/`) + 인덱스 테이블 마이그레이션

**Day 2 — Photoshop 마스터 PSD + Variables 정의 (사용자 작업)**
- 5섹션 마스터 PSD 제작 (가로 860px 통일)
- 각 텍스트/이미지 레이어 Variables 정의 (Text/Pixel/Visibility)
- 테스트 CSV 1개로 5상품 일괄 익스포트 검증

**Day 3 — Lightroom 마스터 프리셋 + 카테고리 분기 (사용자 작업)**
- 카테고리별 5-7개 프리셋 (꽃/리빙/패션/식품/잡화)
- 익스포트 프리셋: 860px-JPG-q90, 1080×1080 IG, 1080×1920 Story, 300px 썸네일

**Day 4 — Vercel 런타임 파이프라인 핵심 코드 (본 앱 작업)**
- 신규 `src/lib/image/cloudinary.ts` — 누끼 + 패딩 + 업스케일 URL 빌더
- 신규 `src/lib/image/sharp-composite.ts` — 5섹션 합성 함수 (마스터 PNG + 동적 SVG 오버레이)
- 신규 `src/lib/image/lifestyle-picker.ts` — 카테고리/태그 기반 라이프스타일 컷 선택기 (Supabase Storage 인덱스 활용)
- **Gemini 의존성 코드 전체 제거**:
  - `src/app/api/category/suggest/route.ts` 의 `suggestWithGemini()` 제거 (캐시 layer + 1페이지 검증 + fallback rules만 남김)
  - `src/lib/trend-analyzer.ts` 의 Gemini import 잔존 시 제거
  - 검색 조련사 / AI Studio 등 grep 후 Gemini direct call 모두 제거
  - `.env.local` 의 `GEMINI_API_KEY` / `_2` / `_3` 3개 변수 삭제
  - Vercel 환경변수의 동일 3개 변수 삭제
- `npx tsc --noEmit` 으로 타입 에러 0 확인

**Day 5 — Groq 카피라이팅 + 다크패턴 필터 강화 (본 앱 작업)**
- Groq Llama-3.1-8b-instant 프롬프트 작성 (상품명 25-35자, 특장점 3개, FAQ 5개)
- 정규식 필터 모듈: 다크패턴 6유형 + 신뢰도 페널티 표현
- 단위가격 의무 입력(2026-02-24 시행) 자동 계산 로직

**Day 6 — Claude Artifacts 검수 위젯 + 분류 알고리즘**
- A/B/C 점수 산출: Groq + PlayMCP 데이터랩 트렌드 보조 점수
- 검수용 Claude Artifact (4.1 + 4.4): 디자이너가 Claude 세션 내에서 카피 검증 가능
- 본 앱의 검수 UI는 Next.js로 별도 구현 (Artifact는 임시 보조)

**Day 7 — 네이버 커머스 API 연동 + 첫 C급 일괄 등록**
- 등록 함수: tier별 분기
- C급 10개 자동 등록 → 24시간 노출 데이터 모니터링
- Vercel MCP로 배포·로그 모니터링 셋업

**일주일 후 KPI**:
- 정적 자산 라이브러리: 카테고리별 lifestyle 50장+, 템플릿 5종 확보
- 자동화 end-to-end 작동: 도매꾹 → DB → C급 자동 등록
- API 키 노출 위험 자산: Gemini 0건 (전체 제거 확인)

### Sprint Y — 5섹션 상세페이지 자동 생성 (Sprint X Day 4-5 완료 후)

본 Sprint는 v2.0 PDF Section 3 B/C급 Production Runtime 흐름의 본 앱 구현.

**Y-1 5섹션 합성 backend**
- 신규 `/api/products/[id]/generate-detail` (POST) — Sharp 합성 트리거
- Input: productId
- Steps:
  1. DB에서 상품 데이터 + supplier_product_code fetch
  2. `cloudinary.ts` 로 도매꾹 원본 이미지 → 누끼 + 패딩 URL 생성
  3. `lifestyle-picker.ts` 로 카테고리·태그 기반 라이프스타일 컷 1장 선택 (Supabase Storage 인덱스 lookup, 30일 cooldown 보장)
  4. `sharp-composite.ts` 로 5섹션 마스터 PNG 위에 상품 이미지 + 라이프스타일 컷 + 동적 SVG 오버레이 (상품명 / 가격 / 특장점) 합성
  5. Groq Llama로 SEO 카피 (상품명 25-35자 + 특장점 3개 + FAQ 5개) 생성
  6. 다크패턴 정규식 필터 적용
  7. 결과를 Supabase Storage 업로드 → DB의 product.detail_image_url 갱신
- Output: `{ detailImageUrl, copy: {title, features, faq}, processingMs }`

**Y-2 검수 UI**
- 신규 `DetailPagePreview` 컴포넌트 (Claude Artifacts 4.1 본 앱 구현체)
- 씨앗 심기 / 검색 조련사에서 "상세페이지 미리보기" 버튼 → 5섹션 결과 PC/모바일 토글 프리뷰
- 검수 통과 시 네이버 등록, 거부 시 Claude Web 세션으로 A급 재처리 자동 큐 이동

**Y-3 검수 분류 시뮬레이터**
- 신규 `ABCSimulatorCard` 컴포넌트 (Claude Artifacts 4.2 본 앱 구현체)
- 대시보드 또는 /products 에 마운트
- 마진율·경쟁도·옵션 수·트렌드 점수 슬라이더 + 실시간 점수 + 등급 표시 + 예상 처리 시간·비용

**Y-4 일괄 처리 진행 모니터**
- 신규 `BatchProgressMonitor` 컴포넌트 (Claude Artifacts 4.5 본 앱 구현체)
- 대시보드 Section 5 More에 마운트
- 폴링으로 Supabase products 테이블 상태 변화 시각화 (칸반)

### Sprint Z — 라이프스타일 컷 큐레이션 + Claude Artifacts 보조 위젯 (Sprint Y 완료 후)

**Z-1 라이프스타일 큐레이션 워크플로우**
- Phase 1 (사용자 Claude Web 세션):
  - Adobe MCP `asset_search` 로 Adobe Stock Free 카테고리 + Lightroom 라이브러리에서 카테고리별 50-100장 큐레이션
  - 결과를 Supabase Storage `lifestyle/{category}/{tag}/{filename}.jpg` 구조로 업로드
- Phase 2 (본 앱):
  - 신규 `lifestyle_assets` DB 테이블 (id, storage_path, category, tags[], last_used_at, used_count)
  - `lifestyle-picker.ts` 가 30일 cooldown + 카테고리·태그 매칭 알고리즘으로 무작위 선택

**Z-2 디자인 토큰 시안 패널**
- 신규 `DesignTokenPanel` 컴포넌트 (Claude Artifacts 4.6 본 앱 구현체)
- 색상·폰트·간격 토큰을 슬라이더로 조정 → 5섹션 미리보기 실시간 반영
- export to Tailwind config 버튼

**Z-3 보안 체크리스트 자동 검증 (Vercel 환경변수 v2.0 § 8)**
- 신규 `scripts/verify-env-security.sh` — 본 PDF Section 8 10개 항목 자동 검증
  - `.gitignore` 패턴 검사
  - `.env.backup.*` 추적 여부
  - `git-secrets` / `gitleaks` 설치 여부
  - source map production 비활성화 확인 (`next.config.js`)
  - API route 코드에서 `console.log(process.env)` 패턴 grep
- pre-commit hook 통합 검토

---
