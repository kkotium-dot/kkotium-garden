# ORDER-SYNC FIX — 네이버 주문 동기화 근본원인·수정 스펙 (2026-07-06)

Authoring: DESKTOP. 권위: 본 문서 + Naver_Commerce_API_Order_Management(3-endpoint flow 리서치) + naver-doctor(B1/B2 라이브 테스트) + api-client.ts. 구현=Code(라이브 테스트 필요). 원칙 #62/#82/#181/#46.

================================================================
## 0. 증상 / 근본원인
================================================================
- **증상**: 운영자 "주문 목록이 제대로 동기화 안 됨". prod 실측 = 13건 표시·수동 "네이버 동기화" 시 "완료 1개 업데이트"(13→14). 에러/403 없음 → **완전 고장 아님, 부분·stale 동기화**.
- **근본원인 (확정)**:
  1. `api-client.getOrders`가 네이버 `/v1/pay-order/seller/product-orders`에 **`from`/`to` 파라미터로 전송** (`lastChangedFrom`→`from` 매핑) + **`lastChangedType` 누락**. 네이버 정답 파라미터는 **`lastChangedFrom`/`lastChangedTo` + `lastChangedType`(필수)** — naver-doctor L427-433이 B1/B2 라이브 테스트로 이미 진단.
  2. 잘못된 파라미터 → **상태변경분(last-changed)을 못 잡음**. 생성일 윈도우 밖 주문의 상태전이(구매확정/취소/반품)가 **영구 미반영**. 기본 부분셋만 반환.
  3. `naver/orders/route.ts`가 `lastChangedType`를 순회하지 않아 **전 상태전이 커버 실패**.
  4. **주문 동기화 cron 미편입**(cron/daily는 상품 재고/suspension만) → **수동 전용·stale 방치**.
- **process gap (#62)**: naver-doctor가 수정법까지 문서화했으나 **실 라우트에 미적용** — 진단이 적용으로 이어지지 않음.

================================================================
## 1. 수정 (systemic·#62 — 전체 주문 동기화 정확성)
================================================================
★verify-first(#181): naver-doctor(`/api/debug/naver-doctor`)의 B1/B2 결과로 **정답 파라미터·응답 shape를 라이브 확인 후** 적용.

1. **api-client.getOrders 파라미터 정정**:
   - `from` → **`lastChangedFrom`**, `to` → **`lastChangedTo`** (실 쿼리 키).
   - **`lastChangedType` 파라미터 추가**(필수). 잘못된 주석("Required params: from, to") 정정.
2. **naver/orders/route.ts — last-changed 플로우**:
   - 각 ≤23h 윈도우에서 `lastChangedType` 전 상태값을 순회(PAY_WAITING/PAYED/DELIVERING/DELIVERED/PURCHASE_DECIDED/CANCELED/RETURNED/EXCHANGED 등) OR type 생략 전체조회(닥터로 확인) → **모든 상태전이 캡처**.
   - 기존 유지: ≤23h 윈도우 분할·productOrderId dedup·honest total-failure gate(#82)·STATUS_MAP·claim 매핑.
   - (권장) 3-endpoint flow 필요 시: last-changed-statuses(변경 ID) → product-orders 상세조회. 닥터 결과로 단일 endpoint로 충분한지 판정.
3. **자동 동기화(cron 편입)**:
   - `cron/daily`(또는 신규 짧은 주기)에 주문 동기화 호출 추가 → 수동 의존 제거. `manual` 미설정 시 CRON_SECRET 가드 이미 존재.
   - 권장 주기: 주문은 daily보다 잦아야 실효 → 별도 `cron/order-sync` 시간별 검토(Vercel cron 최소 주기·플랜 확인).

================================================================
## 2. 검증
================================================================
- **Code(라이브)**: naver-doctor B1/B2 통과 파라미터 확정 → getOrders 정정 후 `/api/naver/orders?manual=1&hours=720`(30일) 호출 시 **상태변경분 포함 전체 동기화** 확인. tsc0/build0.
- **Desktop(prod·#45)**: 수정 배포 후 (a) 넓은 윈도우 동기화 시 상태전이 반영(구매확정/취소 카운트가 네이버와 일치) (b) 콘솔 NAVER_DIAG 에러 0 (c) cron 편입 시 자동 갱신 확인.
- ★상태변경 실증: 구매확정/취소된 오래된 주문이 로컬 status와 일치하는지 대조.

================================================================
## 3. 원칙·규격
================================================================
- #46: 주문 동기화는 **읽기(조회)** — 발행 PUT 아님. 안전. (dispatch/confirm/claim은 별도 쓰기·기존.)
- #62: 단건 주문 아닌 **전체 동기화 정확성** 수정. api-client·route·cron 3면 동시.
- #82: total-failure honest gate 유지(전 윈도우 실패=false success 금지).

================================================================
## 작업 유의사항/원칙
================================================================
- **#192** 네이버 주문 동기화는 **생성일(from/to)이 아니라 변경분(lastChangedFrom/To + lastChangedType)** 기준 — 상태전이 캡처의 정석. 진단 도구(naver-doctor)가 찾은 수정은 **실 라우트에 반드시 적용**(진단≠적용 갭 차단·#62).
- **#193** 동기화류 기능은 **수동+자동(cron) 병행** — 수동 전용은 stale 방치. 주문은 주기 짧게.
- 라이브 API 파라미터는 추측 금지 — naver-doctor 하네스로 실증 후 적용(#181).
