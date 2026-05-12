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
