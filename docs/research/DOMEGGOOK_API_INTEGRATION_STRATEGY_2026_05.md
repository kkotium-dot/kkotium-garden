# 도매꾹/도매매 Open API + Private API 통합 전략 (2026.05 기준)

**문서 작성일**: 2026-05-07
**기준 시점**: Private API 신청 진행 중 (전체 28개 권한 + 샘플 D 연동목적)
**대상**: 꽃틔움 가든 앱 (Next.js 14 + TypeScript + Supabase + Vercel)
**셀러 포지션**: 위탁판매자 (Buyer-side reseller) — 도매매에서 소싱 → 네이버 스마트스토어 판매
**용도**: Sprint 6/7/8 본격 작업 진입 전 *전략적 의사결정* 기준

---

## TL;DR (3줄 요약)

- **결론**: 현재 보유한 Open API 키는 5월 14일 이후에도 `getItemView`·`getItemList`·`getCat` 같은 **상품조회 계열은 그대로 유지**됩니다. 꽃틔움 가든의 단건 검색·마진 계산·등록 흐름은 끊기지 않습니다. 다만 **재고 폴링·기획전 자동 노출·자동 발주 같은 "본격 자동화" 기능은 Private API 발급이 필수**이므로, 5월 14일 데드라인과 무관하게 신청을 진행했습니다.
- **신청 결과**: 2026-05-07 본 세션 — 전체 28개 권한 선택 + 샘플 D(광범위형) 연동목적으로 신청 제출 완료. 도매꾹 사용 1년+ 사업자 인증 회원 기반이라 통과 예상.
- **Sprint 우선순위 재구성**: 새싹 단계(월 0~200만)에서 ROI가 가장 높은 5개는 **모두 Open API만으로 즉시 구현 가능** — Private 발급 대기 중에 즉시 시작 가능. 자동발주는 Private 발급 후 Sprint 8에서 활성화.

---

## 1. 5월 14일 변경의 본질

도매꾹은 2026-03-09 공지로 "미사용 API 폐지(17개)"를 발표했고, 폐지 일정이 5월 14일경에 맞물립니다. 이는 Private/Open API의 **문서 정리·구버전 정리** 성격이 강하며, 실사용 중인 mode를 막는 조치는 아닙니다.

### Open API 호출 한도 (변경 없음)

| 항목 | 제한 |
|---|---|
| 분당 호출 | 180회 |
| 일일 호출 | 15,000회 |
| 초과 시 | HTTP 429 반환 |
| 분 초과 차단 | 3분 |
| 일 초과 차단 | 자정까지 |
| 인코딩 | EUC-KR |
| 응답 HTTP | 항상 200 (에러도 200, body의 표준 오류코드 파싱 필요) |

---

## 2. Open API 전체 mode 명세 (현재 발급 키로 호출 가능)

| Mode | 용도 | 주요 입력 | 주요 출력 | 우리 앱 적용도 |
|---|---|---|---|---|
| `getItemView` ver 4.5 | 상품 1건 상세 | aid, no, om, **multiple**(콤마로 최대 100건 다중조회), allItem | basis, price.dome/supply/sample, **qty.inventory**, deli 전체, **seller.vacation**, seller.rank/good/score, category, popular, channel.dome/supply | ★★★★★ 현재 사용. **multiple=true로 100개 묶음 호출 시 폴링 비용 1/100 절감** |
| `getItemList` ver 4.1 | 조건검색 상품목록 | market(dome/supply), kw, ca(5뎁스), ev(기획전), id(판매자), so(정렬: rd/ha/aa/ad/sd/qa/qd/da/se), mnp/mxp(가격대), mnq/mxq(수량대), who(배송), org(국내외), **sgd(우수판매자)**, **fdl(빠른배송)**, **lwp(최저가)**, dfos(해외직배송) | header(페이지네이션), list.item(no/title/price/thumb/id/nick/unitQty/comOnly/deli/url/market) | ★★★★★ 꼬띠 추천·신상품·기획전 노출의 핵심. **현재 미사용 — 즉시 통합 권장** |
| `getCat` ver 2.0 / `getCategoryList` ver 1.0 | 카테고리 트리 | aid | 5뎁스 카테고리 코드 + name + itemCnt(카테고리별 상품수) | ★★★★ 카테고리 1페이지 분석·네이버 카테고리 매핑에 1회 캐시 |
| `getImageAllowItem` 류 | 이미지 사용허용 상품 식별 | aid | 이미지 사용 허용 여부 | ★★★ 등록 시 저작권 자동 회피용 |

**도매꾹 vs 도매매 채널 차이**: API Key는 도매꾹/도매매 공유(아이디 1개당 5키). `market=dome`(도매꾹) / `supply`(도매매) 파라미터로 구분. `getItemView`는 ver 4.1+부터 market 불필요(단일 응답에 channel.dome/supply 필드로 양쪽 판매여부 동시 반환).

---

## 3. Private API 28개 항목 — 꽃졔님 케이스 효용 분석

스크린샷 기반 전체 신청 항목 분석. 꽃졔님은 **위탁판매자 (Buyer-side reseller)** 포지션이므로 카테고리별 효용이 크게 다릅니다.

### ✅ 구매용 (6개) — 본인 케이스 100% 유효

| API | 꽃졔님 활용 | 우선순위 |
|---|---|---|
| **`setOrder` 주문서 생성** | ⭐⭐⭐ **자동 발주의 심장** — 네이버 주문 → 도매매 자동 발주 | P0 |
| **`getOrderList` 구매 주문서 목록** | ⭐⭐⭐ 본인이 한 발주 추적 (송장 자동 회수의 시작점) | P0 |
| **`getOrderView` 구매 주문서 상세** | ⭐⭐⭐ 발주 후 송장번호·배송상태 회수 | P0 |
| **`getAllSupplyChk` 전체품절확인목록** | ⭐⭐⭐ **소싱한 상품의 도매매 측 품절 일괄 확인** — 꽃졔님이 시급하다고 한 *재고 동기화*의 핵심 | P0 |
| `setOrdDeny` 구매취소 신청 | ⭐⭐ 고객 취소 → 도매매 발주 취소 자동 연동 | P1 |
| `getMyAsset` 회원자산내역조회 | ⭐ 도매매 e-money/포인트 잔액 (대시보드 표시용) | P3 |

### ❌ 판매용 (13개) — 현재 본인 케이스 0% (미래 확장 대비)

13개 모두 *공급사가 받은 주문* 또는 *공급사가 올린 상품*에 대한 것. 꽃졔님이 호출해도 빈 응답. 단 *미래에 도매매에 직접 상품 등록하는 공급사로 확장 시* 활용 가능. 신청 시 모두 선택 (한 번에 권한 확보, 추후 확장 대비).

- **판매관리 (5개)**: setOrdOkDeli, setOrdChk, getOrderList[판매용], getOrderView[판매용], setOrdDeny[판매용]
- **상품관련 (8개)**: setItemDisplay, getChkBatchKey, **setItemBatch**, **setItemQty**, setItemOptionUpdate, setDeliPlace, getDeliPlace, setItemNoEnqueue

> 미래 활성화 시점: 본인 명의로 도매매에 상품을 직접 등록하는 공급사 확장 시. 새싹 단계에서는 사용 안 함.

### ✅ 공통 (3개) — 모두 유효

| API | 활용 |
|---|---|
| `setLogin` / `setLoginChk` 로그인 / 로그인 체크 | 일부 Private API가 sId 세션 요구 — 발주 자동화에 *반드시* 필요 |
| `getOrderReturn` 반품/교환 신청내역 조회 | 본인이 도매매에서 *받은 상품을 반품*한 내역 — 굿서비스 점수 보호 |

### 🌟 기타 (6개) — 숨겨진 보석들

| API | 활용 | 우선순위 |
|---|---|---|
| **`getItemViewES` 상품상세정보 (Elastic Search)** | ⭐⭐⭐ 일반 `getItemView`보다 *훨씬 빠른* 검색엔진 기반. 대량 조회에 유리 | P1 |
| **`getKeyword` 인기검색어 목록** | ⭐⭐⭐ **꼬띠 AI 추천의 황금 재료** — 도매매에서 지금 핫한 키워드 → 꿀통 자동 발굴에 직접 활용 | P1 |
| **`getPackDelivery` 묶음배송 상품전목록** | ⭐⭐⭐ 같은 공급사 묶음배송 가능 상품 — 배송비 절감 + 마진 최적화 | P1 |
| `writeItemSupCom` 상품문의 답글 | ⭐ 본인이 등록자가 아니면 의미 없음 (공급사 기능) | — |
| `listItemSup` / `showItemSup` 상품문의 조회 | ⭐⭐ **소싱 전 도매매 측 문의 내역 보기** = 공급사 응답률 평가 가능 | P2 |

---

## 4. Private API 신청 — 본 세션 결정 (2026-05-07)

### 신청 양식 입력값

| 필드 | 입력값 |
|---|---|
| 신청 API KEY | 기존 Open API 키 (a6ff…c470bb / 2024.05.30 발급) |
| 서비스 URL | (꽃졔님이 별도 결정 — 추후 vercel.app 또는 자체 도메인) |
| 연동 유형 | **③ 자사몰/오픈마켓 직접 연동** |
| 연동 목적 (150자) | 샘플 D 사용 (아래 본문) |
| 권한 범위 | **전체 28개 선택** (구매용 6 + 판매용 13 + 공통 3 + 기타 6) |

### 연동 목적 — 샘플 D (광범위 권한용, 본 세션 채택)

> 본인 사업자 명의 스마트스토어의 도매매 위탁판매 운영을 위한 자체 자동화 도구입니다. 발주·재고·송장·반품 자동화가 1차 목표이며, 향후 본인 명의로 도매매에 직접 상품을 등록·운영하는 단계로 확장할 계획입니다. 본인 계정 외 타인 계정에는 사용하지 않습니다.

→ 145자 / "확장 계획"을 명시해 판매용 13개의 정당성 확보 / 다중 사용자 제공 부정으로 거절 사유 회피.

### 통과 예측 근거

- 도매꾹 사용 1년+ 사업자 인증 회원
- 기존 Open API 키 정상 운영 중
- 연동유형 ③ (자사몰 직접 연동) — 1인 셀러 자체 자동화 표준 분류
- 연동목적이 권한 범위와 일치 (전체 선택 + 광범위 목적 명시)

### 거절 시 fallback

- 좁혀서 재신청 (구매용 6개 + 공통 3개 + 기타 6개 = 15개)
- 윈들리(windly.cc) / 스피드고전송기 v2.0 / 셀플로우 어댑터 활용

---

## 5. 꽃틔움 가든 앱 적용안 매핑 — 9개 기능

| # | 기능 | 사용 API | 폴링 주기 / 트리거 | Prisma 스키마 추가안 | 메뉴 위치 |
|---|---|---|---|---|---|
| **a** | **재고 실시간 동기화** | `getItemView` ver 4.5 + `multiple=true` (100건 묶음) → Private 후 `getAllSupplyChk` 전환 | 등록상품: 6시간/회, DRAFT: 24시간/회. Vercel Cron + Supabase RPC | `InventorySnapshot { productNo, qty, status, polledAt }` + `LowStockAlert` | 정원 창고 / 정원 일지 알림 |
| **b** | **기획전/이벤트 상품 조회** | `getItemList` market=dome + `ev=기획전번호` + so=ha(인기순) | 일 1회 새벽 / 사용자가 꿀통 진입 시 캐시 | `Event { evNo, title, expiresAt }` + `EventItem` | 꿀통 꽃나들이 |
| **c** | **꼬띠 AI 추천 상품** | `getItemList` ca + so=ha + sgd=true + lwp=true + mnp/mxp(목표 도매가대) → 마진 50%+ 자체 필터. Private 후 `getKeyword` 추가 | 일 1회 갱신 | `RecommendedItem { score, marginPct, snapshot }` | 정원 일지 "꼬띠의 추천" |
| **d** | **꿀통 상품 자동 발굴** | `getItemList` so=da(최근등록순) + sgd=true + fdl=true + 마진/재고 필터 → `getItemView`로 상세 검증 | 일 1회 + on-demand | `HoneypotCandidate { sourceFilter, score, marginEst }` | 꿀통 꽃나들이 "자동 발굴" 탭 |
| **e** | **공급사 휴가/응답률 모니터링** | `getItemView` seller.vacation + seller.score | 등록상품 일 1회 | `SellerStatus { sellerId, vacationStart, vacationEnd, scoreAvg, scoreCnt }` | 알림 + 정원 창고 뱃지 |
| **f** | **가격 변동 자동 감지** | `getItemView` price.dome / price.supply (수량별 차등할인 문자열 파싱: `1+9850\|11+9800\|...`) | 등록상품 6시간/회 | `PriceHistory { productNo, channel, priceTier, capturedAt }` + 마진 자동 재계산 | 정원 창고 알림 |
| **g** | **실시간 핫딜/베스트** | `getItemList` so=ha + 상위 N개 일별 스냅샷 → 등락폭 계산. Private 후 `getKeyword` 통합 | 일 1회 | `TrendSnapshot { date, ca, rank, productNo }` | 꿀통 꽃나들이 "베스트" |
| **h** | **카테고리 트리 + 네이버 매핑** | `getCat` ver 2.0 (1회 풀 캐시) → 자체 매핑 테이블 | 월 1회 갱신 | `DomeCategory { code, name, depth, itemCnt }` + `CategoryMapping { domeCode, naverCode }` | 씨앗 심기 카테고리 자동 추천 |
| **i** | **신상품 자동 노출** | `getItemList` so=da + ca=꽃틔움 활성 카테고리 + dateReg 필터 | 일 1회 새벽 | `NewArrival { productNo, ca, surfacedAt }` | 꿀통 꽃나들이 "신상" |

---

## 6. ROI 우선순위 (1인 새싹 셀러 기준)

| 기능 | 매출 임팩트 | 개발 난이도 | 예상시간 | Private 필요? | 새싹 ROI | 파워 ROI |
|---|---|---|---|---|---|---|
| **a 재고 폴링** | 직접(품절 손실 방지) | M | 1.5일 | ❌ Open만 | ★★★★★ | ★★★★ |
| **f 가격 변동 감지** | 직접(마진 보호) | S | 0.5일 | ❌ Open | ★★★★★ | ★★★★ |
| **e 공급사 휴가 모니터** | 직접(클레임 방지) | S | 0.5일 | ❌ Open | ★★★★★ | ★★★★ |
| **c 꼬띠 AI 추천** | 운영효율(소싱시간↓) | M | 2일 | ❌ Open | ★★★★★ | ★★★★★ |
| **h 카테고리 매핑** | 운영효율(등록시간↓) | S | 1일 | ❌ Open | ★★★★ | ★★★ |
| d 자동 발굴 | 간접(상품 폭↑) | L | 3일 | ❌ Open | ★★★★ | ★★★★★ |
| b 기획전 노출 | 간접 | S | 0.5일 | ❌ Open | ★★★ | ★★★★ |
| i 신상품 노출 | 간접 | S | 0.5일 | ❌ Open | ★★★ | ★★★★ |
| g 핫딜/베스트 트렌드 | 간접 | M | 2일 | ❌ Open | ★★ | ★★★★ |
| **자동 발주(Private)** | 직접(시간 90%↓) | L | 5일 | ✅ Private | ★★ | ★★★★★ |
| **상품 자동 등록(Private)** | 직접 | L | 5일 | ✅ Private | ★★ | ★★★★★ |
| **재고 변경(Private setItemQty)** | 직접 | M | 1일 | ✅ Private | ★ | ★★★★ |

**핵심 인사이트**: 새싹 단계에서 가장 ROI 높은 5개(a, f, e, c, h)는 **모두 Open API만으로 충분**. 5월 14일 데드라인 무관하게 즉시 시작 가능. Private 발급은 Sprint 8 자동발주 활성화 시점에 의미.

---

## 7. Sprint 6/7/8 재구성안

### Sprint 6 (Open API ROI Top 5 — Private 발급 대기 중 진행)

**기간 목표**: 2-3 채팅 세션 안에 a/f/e/c/h 5개 모두 완료.

**6-A. 재고 실시간 폴링 위젯** (★★★★★)
- 위치: `src/lib/dome-inventory-poller.ts` (신규), `src/app/api/cron/inventory-sync/route.ts` (신규)
- `getItemView multiple=true` 100건 묶음, Vercel Cron 6시간 주기
- 등록상품 + DRAFT 분리 폴링
- LowStockAlert 임계: qty < 100 또는 status != "판매중"
- UI: 정원 창고에 "재고 뱃지" + 정원 일지에 "품절 위험 N건" 위젯

**6-B. 가격 변동 감지** (★★★★★)
- 위치: `src/lib/dome-price-tracker.ts` (신규)
- price.dome / price.supply 수량별 차등할인 문자열 파싱
- PriceHistory 모델로 시계열 보관
- 가격 변동 시 마진 자동 재계산 + 임계값 (목표 42% 미만) 시 Discord 알림

**6-C. 공급사 휴가/응답률 모니터** (★★★★★)
- 위치: `src/lib/dome-seller-monitor.ts` (신규)
- 등록상품의 seller.vacation 일 1회 체크
- 휴가 진입 → 등록 시작 버튼 자동 비활성화
- seller.score 추적 → 응답률 하락 시 정원 창고 뱃지

**6-D. 꼬띠 AI 추천 (Open 기반 v1)** (★★★★★)
- 위치: `src/lib/dome-curator.ts` (신규)
- `getItemList` ca/so=ha/sgd/lwp 조합 + 마진 자체 스코어링
- 꽃틔움 가든이 *과거 등록한* 카테고리 가중치
- "오늘의 꼬띠 추천 5개" 정원 일지 위젯

**6-E. 카테고리 트리 풀 캐시** (★★★★)
- 위치: `src/lib/dome-category-cache.ts` (신규)
- `getCat` ver 2.0 1회 호출 → DomeCategory 테이블 풀 캐시
- 네이버 카테고리 매핑 테이블 (CategoryMapping)
- 씨앗 심기 카테고리 자동 추천 정확도 ↑

**Sprint 6 Private 작업** (병행, 발급 시점 대기):
- Private API 신청 결과 모니터링 (1~3일)
- 발급 후 sId 세션 관리 모듈 PoC

### Sprint 7 (꿀통 자동화 + 트렌드)

- d 꿀통 상품 자동 발굴 (멱법칙 기반 우수+빠른배송+재고100+등급5+score 80% 필터)
- b 기획전 + i 신상품 자동 노출 + g 핫딜/베스트 트렌드
- (Private 발급 후) `getKeyword` 통합 → 꼬띠 v2 (도매매 실시간 트렌드 반영)

### Sprint 8 (파워셀러 대비 — Private 활성화)

- 자동 발주: `setOrder` + `getOrderList` + `getOrderView` 통합
- 송장 자동 회수: `getOrderView` delivery 필드 폴링
- `getAllSupplyChk` 전환: Open API 폴링 → Private 일괄 확인 (분당 호출 절감)
- 반품 자동화: `getOrderReturn` 통합

---

## 8. 다른 셀러 도구 — 우리 앱이 차별화 가능한 영역

| 솔루션 | 활용 방식 | 차별점 | 우리 앱 적용 아이디어 |
|---|---|---|---|
| **샵플링** | "쇼핑몰 통합관리도구"로 도매매 약 100,000건 사전 인덱싱 + 빠른등록·주문수집·품절관리 | B2B SaaS 월 유료. 다수 셀러 대상 | "1인 셀러 전용" 포지셔닝 → 우리 앱 강점 |
| **플레이오토** | 도매매 EMP 연동 재고/가격 동기화 + 멀티마켓 등록 | 월 7~30만원 유료 | 무료 자동화 |
| **스피드고전송기 v2.0** | 도매매 자체 무료 솔루션 — 자동 발주·송장 회수·AI 썸네일·쇼피 해외 | 무료, 1인 셀러 표준 | 우리 앱은 *네이버 SEO + 도매매 자동화* 통합 |
| **윈들리(windly.cc)** | "AI 위탁판매 솔루션" — 도매꾹/도매매/오너클랜 클릭 한번 발주 + AI 상품수집 | 무료 | AI 추천 + 마스코트 차별화 |
| **셀플로우** | 자체 자동화, 디지털·생활용품 강점 | 카테고리 특화 | 카테고리 무관 통합 |
| **스윕 OMS** | OMS 특화 | 운영 자동화 | 운영 + SEO 통합 |

**꽃틔움 가든의 차별화 포인트**:
1. **1인 셀러 전용 자체 솔루션** — 다른 솔루션은 모두 B2B SaaS. 깃허브·블로그 검색에서 "Next.js + Supabase + 도매매 API로 직접 만든 1인 셀러 자체 솔루션" 공개 사례 *없음*.
2. **AI 마스코트(꼬띠)** — 다른 도구는 데이터 위주. 꼬띠는 *감정적 동기 부여* + *학습 곡선 완화*.
3. **네이버 스마트스토어 SEO 통합** — 다른 도매매 자동화 도구는 *발주/재고*만. 우리는 *등록 시점 SEO 80점+ 강제* + *등록 후 7일 골든윈도우 추적*까지.
4. **가든-카우걸 컨셉** — 운영 도구가 *재미있게* 사용 가능. 매일 진입 동기 부여.

---

## 9. 필수 모니터링 항목 (Sprint 6 시작 전 점검)

- [ ] Private API 신청 결과 (1~3일 후)
- [ ] 신청 거절 시 좁혀서 재신청 (구매용 6 + 공통 3 + 기타 6 = 15개)
- [ ] Vercel Cron 일일 호출 한도 (Hobby 100건/일 vs 6시간 폴링)
- [ ] EUC-KR 인코딩 처리 (Next.js fetch + iconv-lite 패턴)
- [ ] HTTP 200 + body 오류코드 표준화 (Zod 스키마 검증)
- [ ] 분당 180회 한도 모니터링 (multiple=true 100건 묶음으로 절감)

---

## 10. Caveats

- Private API 카테고리 본문은 권한 발급 전에는 공식 문서에서 노출되지 않습니다. 본 리서치의 28개 항목 효용 분석은 신청 양식 스크린샷 + 도매매 공지(no=548, no=560) + 스피드고전송기 v2.0 매뉴얼 + 샵플링·넥스트엔진 가이드 종합. 발급 후 docs.channel.io에서 mode/엔드포인트/필드를 직접 확정해야 합니다.
- "5월 14일" 날짜는 사용자 요청 기준이며, 공식 공지는 "2026.03.09 작성 — 미사용 API 폐지(17개)"로만 표기. 정확한 폐지일자는 직접 공지 본문 확인 필요.
- 연동유형/연동목적 작성 가이드는 공식 매뉴얼이 아니라 셀러 커뮤니티 통과 사례 패턴 종합. 정책은 변경 가능.
- 호출 한도(분 180/일 15,000)는 Open API 가이드 기준이며, Private API 발급 시 한도가 별도로 산정될 수 있습니다.
- 사업자전용상품(comOnly=true)은 사업자인증된 회원만 호출 시 정상 응답. 꽃틔움 가든이 사업자 인증을 끝낸 도매꾹 계정으로 신청해야 사각지대가 줄어듭니다.

---

## 11. 다음 채팅에서 재검토 요청 안건 (꽃졔님 요청)

다음 채팅 시작 시 본 리서치 + 현재 앱 상태를 재검토해 다음 항목을 확인:

1. **앱 개발 방향 일치도** — Sprint 6 재구성안이 *현재* 앱의 8개 DRAFT + 본격 소싱 직전 상태에 최적인지
2. **셀러 도구 추가 학습** — 샵플링/플레이오토/윈들리/스피드고전송기 v2.0/셀플로우/스윕 OMS의 *세부 기능*을 더 깊이 분석해서 우리가 놓친 기능 발굴
3. **시니어 추가 기발한 개선안** — 본 리서치에 없는 새로운 아이디어 (예: 카카오 알림톡 + 도매매 발주 연동, 본인 매출 데이터 + 도매매 트렌드 결합 등)

본격 작업 진입 전 *최종 점검* 단계로 진행.
