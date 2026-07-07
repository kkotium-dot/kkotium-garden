# ORDER-SYNC FIX — 네이버 주문 동기화 근본원인·수정 스펙 v2 (2026-07-06, LIVE-CORRECTED)

Authoring: DESKTOP. 구현·라이브검증=Code. 권위: 본 문서 + api-client.ts + Code 프록시 라이브 테스트. 원칙 #62/#82/#181/#46.
**★v2 정정(#44/#181)**: v1의 근본원인 진단 2건이 Code의 verify-first 라이브 테스트로 반증됨. 아래는 라이브 확정 사실.

================================================================
## 0. 증상 / 근본원인 (LIVE-VERIFIED)
================================================================
- **증상**: "주문 목록이 제대로 동기화 안 됨". 수동 동기화 시 "완료 1개"(24h 내 생성분만). 오래된 주문의 상태전이(구매확정/취소/반품) 미반영·stale.
- **근본원인 (라이브 확정)**:
  1. 기존 동기화는 `/v1/pay-order/seller/product-orders?from=&to=` **단일 엔드포인트**만 사용. 이 엔드포인트는 **`from` 필수·주문 생성일 기준**(라이브: `lastChangedFrom` 전송 시 400 `"from 필드는 필수값 입니다"`). → **구조적으로 상태전이를 못 잡음**(생성일 윈도우 밖 주문의 변경 무시).
  2. ★v1 오류정정: "from→lastChangedFrom 리네임"은 **틀림**. `/product-orders`는 `from`이 정답. 상태전이는 **다른 엔드포인트(last-changed-statuses)**로 잡아야 함.
  3. ★v1 오류정정: "cron 미편입"은 **틀림**. `cron/daily`가 이미 주문 sync(hours=24) 호출 중이었으나 **위 param 구조 한계로 상태전이를 못 잡던 상태**(본 수정으로 정상화).

================================================================
## 1. 수정 (LIVE-VERIFIED 3-ENDPOINT FLOW)
================================================================
정답 = 네이버 정석 **3-endpoint flow** (프록시 경유 라이브 검증 완료):
1. **GET** `/v1/pay-order/seller/product-orders/last-changed-statuses?lastChangedFrom=&lastChangedTo=` (≤24h 윈도우) → 변경된 `{productOrderId, lastChangedType, productOrderStatus, ...}`. type 생략=전체 변경분.
2. **POST** `/v1/pay-order/seller/product-orders/query` `{productOrderIds}` → 상세 `{order, productOrder, delivery, currentClaim?}` (평면 shape·`content` 래퍼 없음).
3. dedup(productOrderId) + upsert(STATUS_MAP·claim 매핑).
- ★≤24h 윈도우 분할 필수(라이브: 30일 범위 직접 조회 시 400 `104140 "조회 날짜가 유효하지 않습니다"`).
- honest total-failure gate(#82) 유지·확장: 전 윈도우 실패 OR 전 detail 배치 실패 → false success 금지.

**api-client 함수**:
- `getOrders`(product-orders·`from/to`·생성일) = **복원·유지**(getTodayOrderSummary 대시보드가 사용). 리네임 금지.
- 신규 `getChangedOrderIds`(last-changed-statuses) + `getOrderDetails`(query POST).

================================================================
## 2. 자동 동기화 (cron)
================================================================
- `cron/daily`(23:00 UTC)가 이미 주문 sync 호출(정상화됨).
- 신규 `cron/order-sync` **일 1회 `0 11 * * *`(20:00 KST)** — cron/daily와 ~12h 스태거 → **일 2회 커버**. hours=48 lookback(실행 간격 브릿지).
- ★**Vercel 플랜 제약(라이브 확정)**: 현 플랜은 cron 빈도 **daily 상한**. 6h/hourly(`0 */6 * * *`)는 **배포 거부**(라이브: 배포 실패→cron pricing 페이지 리다이렉트). **더 잦은 주문 동기화 = Pro 이상 플랜 필요**.

================================================================
## 3. 검증 (LIVE-DONE)
================================================================
- **Code(프록시 라이브)**: manual=1&hours=720(30일·32윈도우) → success·changed:3·synced:3·NAVER_DIAG 0. 특정 주문 DISPATCHED→DELIVERING 전이 캡처. cron 200/401.
- **Desktop(prod·#45)**: prod manual=1&hours=720 → **success·changed:13·synced:13·skip 0·에러 0**(30일 상태전이 전부 캡처). 수정 전 "24h 1건" 대비 정상화 확정.

================================================================
## 원칙 (LIVE-REFINED)
================================================================
- **#192**: 네이버 주문 상태전이 캡처 = 생성일(from/to)이 아니라 **last-changed 3-endpoint flow**. ★진단도구(naver-doctor) 권고조차 **라이브 검증 필수** — 본 건은 진단 권고(param 리네임)가 라이브로 반증됨(#181). 스펙 전제도 라이브로 검증.
- **#193**: 동기화류 수동+자동(cron) 병행. 주문 주기는 짧을수록 좋으나 **Vercel 플랜 cron 상한(현 daily)** 내에서 스태거로 최대화. 더 잦으면 플랜 업그레이드.
- **#194**: `vercel.json` cron 빈도는 **플랜 상한 준수** — sub-daily는 배포 자체를 실패시킴(로컬 build 통과와 무관). cron 스케줄 변경은 배포 verify(#36) 필수.
