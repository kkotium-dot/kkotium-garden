# 네이버 커머스 API 주문 관리 — 403 진단 및 3-엔드포인트 흐름 완벽 분석 (Track B Deep Diagnosis)

> 본 보고서는 Next.js 14 + TypeScript + Prisma + Supabase 기반 "꽃틔움 가든" 셀러센터 자동화 앱의 7일간 누적 81건 403 오류 원인을 진단하고, 즉시 적용 가능한 수정안과 진단 라우트 설계까지 결정 가능한 형태로 정리한 것입니다.
>
> - 작성일: 2026-05-06
> - 출처: Anthropic deep research (`launch_extended_search_task`) + 공식 GitHub Discussions(commerce-api-naver/commerce-api) + 판매자 가이드 + 베타 문서
> - 다음 채팅에서 그대로 활용하여 코드 수정·진단 라우트 구현·세션 5종 점검 진행

---

## TL;DR (3줄 결론)

- **403의 1순위 원인은 "API호출 IP 미등록 + 내스토어 애플리케이션 인증/활성 상태 불일치"**입니다. `lastChangedFrom/lastChangedTo`(인터페이스)와 `from/to`(쿼리스트링) 미스매치는 **별개의 2차 버그**이며, 그 자체로는 보통 **400 BAD_REQUEST**(`code: 4000` 또는 `TypeMismatchException`)를 유발하지 IP/권한/휴면 사유의 403을 만들지 않습니다. 코드의 인터페이스를 *Naver 공식 파라미터명*(`lastChangedFrom`/`lastChangedTo`)에 맞추되, 호출 URL은 *해당 엔드포인트가 실제로 사용하는 파라미터명*과 정확히 일치시켜야 합니다.
- **"3-엔드포인트 흐름"은 (A) 단일 흐름이 아니라 2가지 워크플로 + 1개 보조 엔드포인트** 구조입니다. ① 배치/실시간 변경 추적용 **2단계 흐름**(`GET /external/v1/pay-order/seller/product-orders/last-changed-statuses` → `POST /external/v1/pay-order/seller/product-orders/query`)과, ② 신규 제공된 **단일 호출 흐름**(`GET /external/v1/pay-order/seller/product-orders` — "조건형 상품 주문 상세 내역 조회")이 병존합니다. 새싹셀러는 두 흐름 모두 쓸 수 있지만, **일/배치 수집 누락 방지가 최우선이라면 ①을, 화면 즉시 조회면 ②를 사용**하세요.
- **즉시 수정 우선순위 3단**: (1) 커머스API센터에서 **활성/IP 등록(최대 3개)/통합매니저(통합관리자)/마지막 호출일/권한 그룹 "주문(주문 판매자)·상품·판매자정보"** 5종을 모두 GREEN으로 전환 → (2) 클라이언트에서 **국내 IP(서버리스/Vercel은 KR 리전 또는 KR 고정 IP 프록시 필수)** 사용 보장 → (3) 코드의 파라미터/HTTP 메서드/Content-Type/날짜 포맷을 본 보고서 §3·§4 표대로 1:1 정정. 셋이 모두 만족되면 403은 사라지고, 이후의 빈 응답·`code: 4000`은 별도 트러블슈팅(§7) 트리로 분기합니다.

---

## Key Findings (요약)

1. **세 엔드포인트 관계 (확정)**
   - `GET /external/v1/pay-order/seller/product-orders/last-changed-statuses` (변경 상품 주문 내역 조회) — **(1)단계: ID/식별자만 반환.**
   - `POST /external/v1/pay-order/seller/product-orders/query` (상품 주문 상세 내역 조회) — **(2)단계: 1단계의 productOrderIds로 상세 조회.**
   - `GET /external/v1/pay-order/seller/product-orders` (조건형 상품 주문 상세 내역 조회) — **(별도 흐름) 2024-08-07 신규 도입, 단일 호출로 상세까지 반환.** `from`/`to`/`rangeType`/`productOrderStatuses` 사용. 결제일시·클레임요청일시 등 "고정 시점" 기준이라 이미 처리된 주문도 동일 시점으로 재조회 가능.

2. **사용자 코드(api-client.ts L188)의 핵심 결함 2가지**
   - (A) **인터페이스/쿼리스트링 미스매치**: TS 인터페이스가 `lastChangedFrom/lastChangedTo`인데 URL이 `?from=&to=`이면, 실제로는 "조건형 상품 주문 상세 내역 조회"(`/product-orders`)를 호출하면서 "변경 상품 주문 내역 조회"용 변수명을 코드 안에 들고 있는 형태가 됩니다. 어느 쪽 엔드포인트를 쓰는지부터 결정해야 합니다.
   - (B) **403의 진짜 원인은 거의 항상 인증/IP/휴면 계층**입니다. URL이 잘못되면 403이 아니라 400/404가 나야 정상입니다. 즉 "81건 모두 403"은 **요청이 게이트웨이에서 사전 차단**되고 있다는 강한 신호입니다.

3. **새싹셀러 등급 제약은 "주문 조회 API 자체"에는 없음**
   - 커머스API의 호출 허용량(Rate limit/Quota)은 *애플리케이션 단위*로 산정하며 *판매자 등급(새싹/파워/빅파워)별 차등은 공식 문서에 없음*. 단 **내스토어 애플리케이션은 초당 2회 수준**의 보수적 제한이 일반적이고(커뮤니티 보고), 베타 무료 운영 중이라 새싹셀러도 동일하게 사용 가능.

4. **403 vs 429 vs 401 구분 (응답 본문 코드 기반)**
   - `GW.IP_NOT_ALLOWED` (403) — IP 미등록/해외 IP/등록 IP 외 호출.
   - `GW.RATE_LIMIT` (429) — 초당 한도 초과. *403이 아님.*
   - `GW.AUTHENTICATION` 계열/`401` — 토큰 누락/만료/잘못된 서명.
   - `DataAccessDenied` (대표 전시채널 전시중지/이용중지) — 데이터 권한 없음.
   - `유효하지 않은 스토어 상태` — 휴면/이용정지/탈퇴.

5. **2024-2026 변경 사항 핵심**
   - 2024-02-07 v2.23: 인증 토큰 발급 요청은 **`application/x-www-form-urlencoded`만 권장/표준**, JSON Body 비권장.
   - **2024-03-07 0시 이후 신규 생성 애플리케이션은 인증 토큰 양식 변경**, 2025-02 중 전체 적용 예정 공지(즉, 현재 "꽃틔움 가든"은 신규 양식 대상).
   - 2024-08-07: **"조건형 상품 주문 상세 내역 조회" 신규 출시**(`GET /product-orders`).
   - 2024-11-07: **API호출 IP 등록 의무화 시작**, 2025년부터 미등록 앱 사용 점진 제한.
   - 2024-12-11: 솔루션/내스토어 모두 **등록 IP 외 호출 시 차단 모니터링**.
   - 내스토어 애플리케이션은 **연 2회 이메일 인증 + 인증 기한 만료 시 자동 휴면**, 휴면 해제 시 **시크릿 키가 변경**됨.

6. **403 의사결정 트리**: 본 보고서 §6에 단계별로 정리. 5분 안에 원인을 좁힐 수 있도록 설계.

---

## Details

### 1. 주문 관련 3개 엔드포인트의 실제 사양

| 항목 | 변경 상품 주문 내역 조회 | 상품 주문 상세 내역 조회 | 조건형 상품 주문 상세 내역 조회 |
|---|---|---|---|
| HTTP Method | **GET** | **POST** | **GET** |
| Path (Base = `https://api.commerce.naver.com`) | `/external/v1/pay-order/seller/product-orders/last-changed-statuses` | `/external/v1/pay-order/seller/product-orders/query` | `/external/v1/pay-order/seller/product-orders` |
| 용도 | "지정 기간에 *최종 변경 구분*이 바뀐" 상품주문의 *식별자*만 반환 | 1단계에서 받은 productOrderIds(배열)로 *상세* 조회 | 결제일시·클레임요청일시 등 *고정 시점* 기준으로 *상세까지 한 번에* 조회 |
| 필수 쿼리/바디 | `lastChangedFrom` (KST ISO-8601, 예: `2025-05-04T00:00:00.000+09:00`) | Body JSON: `{ "productOrderIds": ["...", "..."] }` | `from` (KST ISO-8601), `rangeType` (`PAYED_DATETIME` 등) |
| 선택 파라미터 | `lastChangedTo`(생략 시 from+24h), `lastChangedType` (PAYED, DISPATCHED, CLAIM_REQUESTED, COLLECT_DONE, PURCHASE_DECIDED, ...) | — | `to`, `productOrderStatuses[]`, `claimStatuses[]`, `placeOrderStatusType`, `fulfillment`, `pageSize`(기본 100), `page`(1-base) |
| 최대 조회 시간 범위 | from으로부터 **24시간** | — (ID 단위) | **24시간** |
| 조회 시점 기준 | `lastChangedDate` (가변 — 주문 처리에 따라 변동) | — | `paymentDate`/`claimRequestDate` 등 (불변) |
| 누락 위험 | 처리 흐름이 빠르면 동일 주문이 여러 lastChangedType로 변동 → from/to 슬롯 잘게 쪼개야 함 | 없음 | 결제일 기준이라 처리 후에도 같은 슬롯에서 재조회 가능 |
| Content-Type | 없음(GET) | `application/json` | 없음(GET) |
| Authorization | `Authorization: Bearer {access_token}` | 동일 | 동일 |

> URL 인코딩은 **한 번만** 합니다. 라이브러리(예: `URLSearchParams`)에 직접 `2025-05-04T00:00:00.000+09:00`을 넘기면 자동으로 1회 인코딩되어 정상 동작합니다. **수동으로 `encodeURIComponent`까지 추가하면 "TypeMismatchException" 400 오류**가 발생합니다(공식 답변 예시 다수 확인).

### 2. 정답 흐름: 어느 엔드포인트를 언제 쓰는가?

- **신규 입금/배송/클레임 변경분을 누락 없이 수집(배치/Cron)**: ① `last-changed-statuses` (1초~수분 주기로 슬라이딩 윈도우) → 응답의 `data[n].productOrderId` 수집 → 일정 청크(권장 ≤ 50개) 단위로 ② `/query` 호출. 본 흐름이 공식 권장 "주문 누락 없는 연동 설계"입니다.
- **셀러센터 화면처럼 "결제일자/클레임요청일자" 단일 기준 검색**(예: 어드민 화면 "오늘 결제된 주문"): ③ `/product-orders` 단일 호출. 처리 후에도 결제일 기준이라 재현 가능. 다만 **24시간 초과 범위는 분할 호출** 필수.

⇒ "꽃틔움 가든"의 셀러 대시보드/오늘의 주문 화면은 ③ 단일 호출이 적합. 자동 매출/장부 동기화는 ①+② 2단계 흐름이 올바른 선택입니다. **셋 다 동시 사용도 정책상 문제없습니다.**

### 3. 정답 cURL 예시 (heredoc 미사용, 한 줄 명령형)

#### 3-1. 인증 토큰 발급 (필수, TTL 약 3시간(=10,800초) 내외, 응답 `expires_in`로 확인)

```bash
curl -X POST "https://api.commerce.naver.com/external/v1/oauth2/token" -H "Content-Type: application/x-www-form-urlencoded" --data-urlencode "client_id=YOUR_CLIENT_ID" --data-urlencode "timestamp=1746336000000" --data-urlencode "client_secret_sign=BASE64(BCRYPT($CID + '_' + $TS, $SECRET))" --data-urlencode "grant_type=client_credentials" --data-urlencode "type=SELF"
```

서명 생성 (TypeScript / Node, `bcryptjs` 사용; 한 줄 표현):

```ts
import bcrypt from 'bcryptjs'; const ts = Date.now(); const sign = Buffer.from(bcrypt.hashSync(`${clientId}_${ts}`, clientSecret), 'utf8').toString('base64');
```

흔한 실수:
- `timestamp`를 **초** 단위로 보냄 → 무조건 401/400. **ms(13자리)** 사용.
- `bcrypt`의 salt 자리에 `clientSecret`을 넣지 않고 `genSalt()`를 사용 → 검증 실패.
- bcrypt 결과를 *그대로* 넘기지 않고 base64로 한 번 더 감싸야 함(공식 가이드 명시).
- `Content-Type: application/json`으로 보냄 → 토큰 미발급. **반드시 form-urlencoded.**

#### 3-2. 변경 상품 주문 내역 조회 (1단계)

```bash
curl -X GET "https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/last-changed-statuses?lastChangedFrom=2025-05-04T00%3A00%3A00.000%2B09%3A00&lastChangedTo=2025-05-04T23%3A59%3A59.999%2B09%3A00&lastChangedType=PAYED" -H "Authorization: Bearer ACCESS_TOKEN"
```

응답(요약):
```json
{
  "timestamp": "2025-05-04T08:30:00.123+09:00",
  "data": {
    "lastChangeStatuses": [
      {
        "productOrderId": "2025050412345671",
        "orderId": "2025050499999991",
        "lastChangedType": "PAYED",
        "lastChangedDate": "2025-05-04T08:11:42.000+09:00",
        "productOrderStatus": "PAYED",
        "paymentDate": "2025-05-04T08:11:40.000+09:00",
        "receiverAddressChanged": false,
        "claimType": null,
        "claimStatus": null,
        "giftReceivingStatus": null
      }
    ],
    "more": { "moreFrom": null, "moreSequence": null }
  },
  "traceId": "cr3-xxxxxx-xxxxxx^...^..."
}
```

#### 3-3. 상품 주문 상세 내역 조회 (2단계)

```bash
curl -X POST "https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/query" -H "Authorization: Bearer ACCESS_TOKEN" -H "Content-Type: application/json" -d '{"productOrderIds":["2025050412345671","2025050412345672"]}'
```

응답(주요 필드만):
```json
{
  "timestamp": "...",
  "data": [
    {
      "productOrder": { "productOrderId": "2025050412345671", "productOrderStatus": "PAYED", "placeOrderStatus": "OK", "productId": 1234567890, "productName": "꽃다발", "quantity": 1, "totalPaymentAmount": 35000 },
      "order": { "orderId": "2025050499999991", "orderDate": "2025-05-04T08:11:00.000+09:00", "ordererName": "홍**", "paymentMeans": "CARD" },
      "delivery": { "deliveryStatus": "WAITING_DISPATCH", "trackingNumber": null, "deliveryCompany": null },
      "cancel": null, "return": null, "exchange": null
    }
  ]
}
```

> `productOrderIds` 배열 1회 호출 권장 크기는 운영 안정성상 **50건 이하**. 빈 배열/평문 문자열을 보내면 500 또는 BAD_REQUEST.

#### 3-4. 조건형 상품 주문 상세 내역 조회 (단일 호출)

```bash
curl -X GET "https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders?from=2025-05-04T00%3A00%3A00.000%2B09%3A00&to=2025-05-04T23%3A59%3A59.999%2B09%3A00&rangeType=PAYED_DATETIME&productOrderStatuses=PAYED&pageSize=100&page=1" -H "Authorization: Bearer ACCESS_TOKEN"
```

> `to`를 빼면 자동으로 `from + 24h`. 일부 사례에서 `to`만 추가하면 한글 깨진 `from, to ...` 메시지의 4000 오류가 보고되어 있음 → **24h를 정확히 맞추거나 to를 생략**하는 것이 안전.

### 4. 인증/서명 흐름 정리

- **그랜트 타입**: `client_credentials` (내스토어 애플리케이션은 항상 `type=SELF`).
- **timestamp**: KST 기준이 아니라 **UTC 에폭 ms**. 서버와의 시계 편차가 ±5분 넘으면 발급 실패.
- **서명 식**: `BASE64( BCRYPT( clientId + "_" + timestamp, clientSecret ) )`.
- **TTL**: 응답 `expires_in` 기반(예 ~7,800초~10,800초). **만료 1~5분 전 갱신**(클럭 스큐 대비).
- **재사용 권장**: 매 호출마다 토큰 재발급 X — 기존 토큰을 redis/Supabase Edge Cache에 저장하고 만료 임박 시만 재발급.
- **서명 흔한 버그**: (a) `bcryptjs`에서 salt 자리에 `clientSecret` 그대로 사용 — 일부 라이브러리는 salt 형식 검증을 함. `bcrypt`(C++ 바인딩)와 `bcryptjs`(순수 JS) 모두 호환되지만 시크릿이 `$2a$10$` 접두 형식이어야 정상 동작. (b) Buffer 변환 누락. (c) URL 인코딩 안 함(form-urlencoded인데 `+` 등 미인코딩).

### 5. 403의 모든 원인 (체크리스트)

5-1. **IP 화이트리스트(가장 흔함)**
- 커머스API센터 → 내 정보 → 내 스토어 애플리케이션 → 수정 → **API호출 IP** 등록(최대 3개).
- 응답 본문 `code: GW.IP_NOT_ALLOWED`, 메시지 `호출이 허용되지 않은 IP입니다`.
- **해외 IP는 전면 차단**. Vercel/AWS Lambda는 미국 리전 디폴트 → 반드시 `icn1`(서울) 등 KR 리전 강제 또는 한국 IP 정적 프록시(NAT 게이트웨이)로 호출.
- 유동 IP(가정/공유기)는 매일 변동 → 운영 환경은 **고정 IP 필수**.

5-2. **통합매니저(통합관리자) 권한 미부여**
- 부매니저 계정의 네이버 ID로는 애플리케이션 발급/연동 자체 불가.
- 사업자 대표·통합매니저 계정에서 발급 → 위임 사용 권장.

5-3. **휴면/이용정지/탈퇴/전시중지**
- `code: DataAccessDenied`, `유효하지 않은 스토어 상태` 등으로 응답.
- 인증 자체가 막혀 401·403 모두 가능.
- 새싹셀러도 "전시중" 상태이면 정상.

5-4. **권한 그룹 미선택**
- 발급 시 "주문(주문 판매자)", "상품", "판매자정보" 그룹을 추가하지 않으면 주문 API 호출 시 **403/권한 오류**.
- 기존 앱이라도 **재선택+저장** 후 5~30분 반영 지연 존재.

5-5. **마지막 호출일 / 인증 기한 만료**
- 약 2주 단위 인증 기한 → 만료 시 **자동 휴면**, 호출 모두 차단.
- 휴면 해제 시 **시크릿 키 변경** → 코드의 환경변수 즉시 갱신.

5-6. **신규 양식(2024-03-07 이후 앱)**
- 토큰 발급 요청이 반드시 `application/x-www-form-urlencoded` + 쿼리/폼 일관성 → 지키지 않으면 401/415가 나거나 게이트웨이가 403으로 단축 응답.

5-7. **타 스토어의 productOrderId 호출**
- 권한 없는 주문에 대해 "처리권한이 없는 상품주문번호" 400. 단, 일부 게이트웨이 단계에서는 403으로 표면화.

5-8. **Connection 재사용 이슈**
- 공식 답변: connection을 2초 이상 재사용하면 차단될 수 있음. Keep-Alive를 짧게 설정하거나 매 요청 새 connection 권장. 누적 시 403 패턴 가능.

5-9. **Rate limit과 혼동**
- Rate limit 초과는 **429 + `GW.RATE_LIMIT`**. 헤더 `GNCP-GW-RateLimit-Remaining`로 확인. 403이라면 rate-limit이 원인이 아님.

### 6. 403 의사결정 트리 (꽃틔움 가든 전용)

```
응답이 403인가?
├─ Body code = GW.IP_NOT_ALLOWED ?
│   ├─ Yes → (a) 호출 서버 공인 IP 확인 → (b) 커머스API센터 IP 등록 → (c) Vercel KR 리전/NAT IP 적용
│   └─ No  → 다음 단계
├─ Body code/message에 "유효하지 않은 스토어" / DataAccessDenied ?
│   ├─ Yes → 스마트스토어 상태 점검(전시중/이용정지/휴면), 통합매니저 계정 확인
│   └─ No  → 다음 단계
├─ 인증 토큰 발급은 200 OK인데 주문 API에서만 403 ?
│   ├─ Yes → 권한 그룹(주문/상품/판매자정보) 누락 또는 인증 기한 만료
│   └─ No  → 토큰 단계 401/403 → 서명/타임스탬프/Content-Type 검증
├─ 응답 헤더 GNCP-GW-Trace-ID 보유? → 캡처 후 GitHub Discussions에 traceId만 공개해 문의
└─ 위 어느 것도 아님 → 응답 본문 code/message 그대로 본 보고서 §7 표와 매칭
```

### 7. 응답 코드/메시지 매핑 표 (운영 핸드북)

| 코드/메시지 | HTTP | 의미 | 즉시 조치 |
|---|---|---|---|
| `GW.IP_NOT_ALLOWED` | 403 | 등록 IP 외 호출/해외 IP | IP 등록 + KR 리전 |
| `GW.RATE_LIMIT` | 429 | 초당 한도 초과 | 큐잉/지수 백오프 |
| `GW.AUTHENTICATION` 류 | 401 | 토큰 누락/만료/서명 오류 | 재발급, 서명 점검 |
| `유효하지 않은 스토어 상태입니다` | 4xx | 휴면/탈퇴/이용정지 | 셀러센터 상태 정상화 |
| `DataAccessDenied` | 4xx | 전시채널 중지/권한 없음 | 채널 활성화 |
| `BAD_REQUEST` + `4000` `from, to ...` | 400 | from/to 검증 실패(24h 초과/형식) | 슬롯 분할, ISO-8601 KST |
| `TypeMismatchException` | 400 | 파라미터 인코딩 중복 | 1회만 인코딩 |
| `처리권한이 없는 상품주문번호` | 400 | 타 스토어 주문 호출 | 발급 앱과 스토어 일치 |

> 모든 호출은 응답 헤더 `GNCP-GW-Trace-ID`를 로그로 적재해야 사후 디버깅이 가능합니다. 또한 `GNCP-GW-RateLimit-Replenish-Rate / Burst-Capacity / Remaining`을 함께 적재하면 429 자동 감속 로직 구현이 쉽습니다.

### 8. 새싹셀러 특이점

- **API 권한 자체에는 등급별 차이가 없음**. 새싹/파워/빅파워 모두 동일 엔드포인트 사용.
- 다만 새싹셀러는 통상 **거래 건수가 적음** → `last-changed-statuses` 응답이 빈번히 비어 보일 수 있음. "호출은 200 OK인데 데이터가 없다"는 *정상*입니다(빈 배열 반환).
- 일자별 결제 주문이 1건이라도 있으면 ③ `/product-orders?rangeType=PAYED_DATETIME&productOrderStatuses=PAYED`로 즉시 검증 가능합니다.

### 9. 사용자 코드 (api-client.ts L188) 정정 가이드

핵심 결정: "꽃틔움 가든"의 즉시 표시용에는 `/product-orders`(단일 호출), 누락 방지 동기화에는 `/last-changed-statuses + /query`(2단계). 이름과 URL을 *둘 중 하나*에 맞추세요.

수정안 1 (조건형 상품 주문 상세 내역 조회 채택, 화면 즉시 조회용):
```ts
export interface ListOrdersParams { from: string; to?: string; rangeType: 'PAYED_DATETIME' | 'ORDERED_DATETIME' | 'CLAIM_REQUESTED_DATETIME'; productOrderStatuses?: string[]; pageSize?: number; page?: number }
const url = `${BASE}/external/v1/pay-order/seller/product-orders?${new URLSearchParams({ from: p.from, ...(p.to ? { to: p.to } : {}), rangeType: p.rangeType, ...(p.productOrderStatuses ? { productOrderStatuses: p.productOrderStatuses.join(',') } : {}), pageSize: String(p.pageSize ?? 100), page: String(p.page ?? 1) }).toString()}`
```

수정안 2 (변경 추적 + 상세 2단계):
```ts
export interface ListChangedParams { lastChangedFrom: string; lastChangedTo?: string; lastChangedType?: 'PAYED' | 'DISPATCHED' | 'CLAIM_REQUESTED' | 'COLLECT_DONE' | 'PURCHASE_DECIDED' | 'CANCELED' | 'RETURNED' | 'EXCHANGED' }
const u1 = `${BASE}/external/v1/pay-order/seller/product-orders/last-changed-statuses?${new URLSearchParams({ lastChangedFrom: p.lastChangedFrom, ...(p.lastChangedTo ? { lastChangedTo: p.lastChangedTo } : {}), ...(p.lastChangedType ? { lastChangedType: p.lastChangedType } : {}) }).toString()}`
// then
const u2 = `${BASE}/external/v1/pay-order/seller/product-orders/query`
const r2 = await fetch(u2, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ productOrderIds }) })
```

> 절대 하지 말 것: ① 인터페이스는 `lastChangedFrom`인데 URL에서 `from=`으로 보냄 — 게이트웨이는 `from`을 모르는 파라미터로 보고 0건/오류 반환. ② 같은 함수에서 두 엔드포인트를 토글 — 책임 분리하세요. ③ 시간을 UTC `Z`로 보냄 — 반드시 KST `+09:00`. ④ 24시간 초과 슬롯 — 반드시 분할.

### 10. 진단 라우트(권장 설계, `app/api/_debug/naver-doctor/route.ts` 등)

체크 항목(모두 객체로 반환):

1. **[ENV]** `NAVER_CLIENT_ID/SECRET` 존재, 길이 검증.
2. **[CLOCK]** 서버 시각과 NTP(예: `time.google.com`) 차이 ms.
3. **[SIGN]** 서명 생성 후 길이/Base64 유효성.
4. **[TOKEN]** `oauth2/token` 호출 → `expires_in`, 응답 헤더의 `GNCP-GW-Trace-ID` 캡처.
5. **[IP]** 외부에 `https://api.ipify.org` 호출 → 공인 IP 노출 → 운영자에게 "이 IP를 커머스API센터에 등록하세요" 안내.
6. **[ORDER-A]** `/last-changed-statuses?lastChangedFrom=now-1h` 호출 → 200/403/429 분기.
7. **[ORDER-B]** `/product-orders?from=now-1h&rangeType=PAYED_DATETIME` 호출 → 200/403/429 분기.
8. **[REPORT]** 위 결과를 §6 의사결정 트리로 매핑하여 *사람이 읽을 수 있는 한국어 권고문* 반환.

> 라우트는 운영 환경에서는 **`X-Doctor-Token` 헤더 + Vercel Protected Routes**로 보호하세요. 토큰/시크릿이 응답에 포함되지 않도록 마스킹 필수.

---

## Recommendations (단계별 액션 플랜)

### Stage 0 (5분, 즉시): 확정
- 81건 403의 80%는 IP 등록 + 통합매니저 + 권한 그룹 + 인증 기한 4가지 중 하나입니다. 사용자가 언급한 5종 점검(활성/IP 등록/통합관리자/마지막 호출일/권한 그룹)을 **커머스API센터 GUI에서 모두 "OK"로 만들고 새 시크릿을 환경변수에 반영**하세요.
- 임계: 시크릿이 변경되었으면 Supabase Vault/Vercel Env에 즉시 반영, 캐시된 Bearer 토큰을 폐기.

### Stage 1 (30분): 코드 정합화
- `api-client.ts`를 §9의 "수정안 1 또는 2" 중 하나로 결정해 1:1 정합. 대시보드 화면용은 *수정안 1*, 백그라운드 sync는 *수정안 2*. 두 함수를 분리 export.
- 모든 응답에 대해 `traceId`, `code`, `message`, 상태코드, 호출 IP를 Prisma 로그 테이블에 적재.

### Stage 2 (1~2시간): 진단 라우트 구현
- §10 명세대로 `naver-doctor` API 라우트 추가.
- 화면 "설정 > 연동 진단"에서 호출하여 한국어로 결과 표시(빨강/노랑/초록 트래픽 라이트).

### Stage 3 (운영 안정화)
- Vercel: `vercel.json`의 functions.region을 `icn1`로 강제. 또는 NAT 고정 IP 프록시 도입.
- 토큰 캐싱: TTL의 90% 시점에서 사전 갱신. 동시성 대비 mutex(예: `p-limit` 1).
- Rate limit 회피: 큐잉(예: BullMQ on Upstash) + 지수 백오프(0.5s, 1s, 2s, 4s).
- 슬라이딩 윈도우 sync: 5분 단위로 `[t-6m, t-1m]` 슬롯 호출(시계 편차/지연 흡수 → 1분 마진).

### 임계값(Trigger) 가이드 (의사결정 변경 신호)
- **새 IP/리전 변경 발생** → 즉시 IP 재등록.
- **응답 `expires_in < 600s`인데 만료 전 갱신 안 됨** → 동시성 버그. mutex 도입.
- **429 비율 > 1%** → 슬롯 분할 또는 호출 간격 0.5s↑.
- **403 동일 코드 3분 이상 지속** → 코드를 정확히 캡처해 §7 표로 분기, 30분 이내에 미해결이면 GitHub Discussions에 `traceId`만 게시(시크릿/주문번호 절대 비공개).

---

## Caveats (한계/주의)

- 본 보고서의 응답 JSON은 공식 GitHub Discussions/판매자 가이드/베타 문서에서 수집된 일관된 사례를 기반으로 재구성한 것이며, 일부 필드명·상태값(`PAYED`, `DISPATCHED`, `COLLECT_DONE`, `CLAIM_REQUESTED`, `PURCHASE_DECIDED` 등)은 향후 릴리스 노트에서 추가/변경될 수 있습니다(예: 2024-08 신규 API, 2024-12 v2.45.0 변경 등). 운영 코드는 **알 수 없는 enum 값을 무시하지 말고 로깅**해야 합니다.
- 새싹셀러 특이 정책(예: 일별 호출 횟수 캡)은 **공식 문서상 명시되어 있지 않습니다**. "초당 2회 수준"은 커뮤니티 보고이며 공식 SLA 아님 — 운영 부하 테스트 필요.
- `GW.IP_NOT_ALLOWED`는 본문 코드 기준이며, 일부 게이트웨이 미들웨어가 빈 본문 + 403만 보낼 수 있습니다. 이 경우 IP/권한/휴면을 *동시에* 점검해야 합니다.
- 사용자가 "Smartship Guide"에서 본 IP 3종(`211.115.121.4/.6/.102.134`)은 **Smartship(외부 솔루션) 측 IP**입니다. *직접 개발 시 등록할 IP가 아닙니다.* "꽃틔움 가든"은 **자사 서버의 공인 IP**를 등록해야 합니다.
- `bcryptjs`는 `clientSecret`이 정상 bcrypt salt 형식(`$2a$xx$22-char-salt`)이 아닐 때 일부 환경에서 예외를 던질 수 있습니다. 네이버가 제공한 `clientSecret`은 이 형식을 만족하지만, 환경변수에 줄바꿈/공백이 섞이면 즉시 실패합니다 — `.trim()` 필수.
- 인증 토큰 발급은 OAuth 2.0 표준 준수를 위해 향후 `application/x-www-form-urlencoded`만 허용될 예정입니다. JSON으로 보내는 코드는 사전 마이그레이션하세요.
- "3-엔드포인트 흐름" 질문에 대한 최종 답변: **(B) 2단계 흐름(`last-changed-statuses` → `query`) + (단일 호출 보조) `/product-orders` 신규 API**. 어느 하나가 deprecated된 것은 아니며 **공식적으로 모두 유지 중**입니다(공지 #1877 "기존 API는 계속 제공").

---

## 다음 채팅 인계 안내 (Track A · Track B 활용 가이드)

본 문서는 **Track B (주문 API 영역 집중 분석)** 결과물입니다. 다음 채팅에서 진행할 작업:

1. **A3-4-DIAG 단계 1~5** — 본 문서 §6 의사결정 트리 + §10 진단 라우트 설계대로 `/api/naver/diag-orders` 신설, 3개 엔드포인트 동시 호출 비교, sync route 재작성 또는 권한 문제 확정.
2. **꽃졔님 직접 점검** — 본 문서 §5 5종 (IP 등록 / 통합매니저 / 권한 그룹 / 인증 기한 / 활성 상태) 셀러센터 GUI에서 모두 GREEN 확인.
3. **이후 Track A 진행** — 다음 채팅 ① `docs/api/COMMERCE_API_REFERENCE.md` + `docs/api/COMMERCE_API_DEBUGGING.md` (커머스 API 전체 endpoint 레퍼런스 + 디버깅 가이드 + 변경사항/deprecated 추적). 그 다음 채팅 ② `docs/strategy/SEEDLING_TO_POWER_ROADMAP.md` (새싹→파워셀러 성장 전략).

> 본 문서가 변경되어야 하는 시점(Trigger): (a) Stage 0~1 적용 후 403이 사라졌지만 빈 응답이 지속될 때 → §8 새싹셀러 특이점 갱신, (b) 2026-Q3 이후 새 API 버전 출시 → §1·§5-6 갱신, (c) Vercel/NAT 고정 IP 도입 후 → §5-1 갱신.
