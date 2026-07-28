# 네이버 스마트스토어 위탁배송(드롭십핑) 셀러: 출고지/반품지 설정 및 Commerce API 상품등록 운영 가이드 (2025-2026)

> 저장일: 2026-06-02 | 출처: Desktop 심층 리서치 | 권위 문서 (위탁배송 발행 정책 baseline)
> 트리거: 달항아리 발행 시도 중 addressbooks 동기화 fetch failed + store_settings 주소 EMPTY 발견.
> 대표 운영구조 확정: 순수 위탁배송 — 출고/반품 전부 각 공급사 자체처리, 셀러는 상태 중계만.

---

## TL;DR
- **위탁배송 셀러도 네이버는 "상품별로 다른 출고지/반품지"를 직접 지원하지 않는다.** 셀러 본인 사업장(또는 비상주 사무실) 주소를 단일 대표 출고지/반품지로 1개 등록하고, 공급사별 차이는 묶음배송 그룹과 "자동수거지시 예외처리"로 흡수하는 것이 표준 설계.
- **releaseAddressId/returnAddressId가 비어있는 것은 정상.** 판매자센터에 주소록을 먼저 등록한 뒤 주소록 조회 API로 addressBookNo를 받아 상품등록 시 claimDeliveryInfo에 넣어야 하며, 배송형(DELIVERY) 상품에서 사실상 필수.
- **"TypeError: fetch failed"의 1차 용의자는 IP 화이트리스트(GW.IP_NOT_ALLOWED).** 네이버 커머스 API는 애플리케이션당 호출 IP를 최대 3개만 허용. Vercel 서버리스는 유동 IP라 근본 충돌. Vercel Static IP 애드온 또는 고정 IP 프록시 필요.

---

## 1. 위탁배송 출고지/반품지 = "단일 대표 주소 + 예외처리"가 정답
네이버 주소록은 판매자 단위로 관리되며, 상품마다 공급사 주소를 출고지로 다르게 지정하는 위탁 모델을 시스템이 직접 지원하지 않음.
- **출고지**: 셀러 본인 사업자 주소(자택/비상주 사무실)를 대표 출고지로 등록. 공급사 주소를 셀러 주소록에 넣는 것은 비권장. 허위 주소 등록은 네이버 제재 대상.
- **반품지**: 셀러 사업장 주소를 대표 반품/교환지로 등록.
- **공급사별 차이 흡수**: 공급사별 묶음배송 그룹(deliveryBundleGroupId)을 따로 만들고, 반품은 "자동수거지시 예외처리"로 네이버 자동회수를 차단한 뒤 셀러가 공급사로 중계.

## 2. 자동수거지시 예외처리 — 위탁 셀러 필수 절차
네이버 기본값은 반품/교환 접수 시 계약 택배사(CJ대한통운)로 자동회수하여 셀러 사업장으로 반송. 위탁 셀러가 이대로 두면: 상품이 공급사가 아닌 본인에게 옴 → 다시 공급사로 보내는 택배비(약 3000원)+1~3일 손해 → 이 비용을 구매자에게 청구 불가. 반드시 자동회수를 꺼야 함:
1. **공지사항 등록**: 스마트스토어센터 → 상품관리 → 공지사항 관리 → 새 상품 공지사항. "모든 상품은 출고지/반품지 주소가 상이하여 자동수거 불가, 반품/교환 전 문의 요망" 문구를 전 상품 노출.
2. **1:1 문의 접수**: 고객센터 → 1:1 문의 → 판매관리 > 반품관리 → "위탁판매로 상품별 출고지/반품지 상이, 자동수거지시 예외처리 요청". 영업일 1~3일 처리.
- 예외처리 후 셀러가 직접 회수(공급사 반품접수 → 송장 수신 → 스마트스토어 입력). 기준 강화 추세, 위탁업체 정보 사전 입력 권장.

## 3. Commerce API 주소록 조회 → 상품등록 흐름 (핵심 기술 정정)
- **주소록 사전등록(빈 ID 직접 원인)**: 판매자센터 → 판매자정보 → 배송정보 → 주소록 → 신규등록. 공식 답변(GitHub #246)도 "사전에 스마트스토어센터로 판매자 주소록 정보를 입력해두셔야" 명시. 미등록 시 API로 조회할 ID 자체가 없음 = 현재 store_settings 빈 직접 원인.
- **주소록 조회 API**: GET /external/v1/seller/addressbooks-for-page (또는 단건 조회). 애플리케이션에 [판매자정보] 그룹 권한 필요. 응답 addressBooks[] 배열, 각 항목에 addressBookNo + addressType(RELEASE=출고지 / REFUND_OR_EXCHANGE=반품·교환지).
- **상품등록 매핑 — 경로 정정 (중요)**: 출고지/반품지 필드는 deliveryInfo 직속이 아니라 originProduct.deliveryInfo.claimDeliveryInfo 하위:
  - originProduct.deliveryInfo.claimDeliveryInfo.shippingAddressId  ← 출고지(RELEASE) addressBookNo
  - originProduct.deliveryInfo.claimDeliveryInfo.returnAddressId    ← 반품/교환지(REFUND_OR_EXCHANGE) addressBookNo
  - returnDeliveryFee(반품배송비), exchangeDeliveryFee(교환배송비)도 필수. 배송형(deliveryType: DELIVERY) 상품에서 주소록 ID 없이는 정상 등록 불가.
  - 주의: originProduct.deliveryInfo.releaseAddressId 같은 경로/필드명은 부정확. 실제는 claimDeliveryInfo.shippingAddressId.

## 4. "TypeError: fetch failed" 원인 분석
Node fetch(undici)의 저수준 네트워크 실패 공통 래퍼. 반드시 error.cause(code/errno) + HTTP 응답 본문을 봐야 진짜 원인 확정. 가능성 순:
1. **IP 화이트리스트 차단(가장 유력)**: GW.IP_NOT_ALLOWED = 요청 IP가 API G/W 허용 IP 아님(HTTP 403). 호출 IP는 최대 3개(집/회사/기타)만 등록 가능, 유동 IP는 매일 변경되어 수정 필요 — Vercel 서버리스 유동 IP와 정면 충돌. G/W가 TCP 단계에서 끊으면 403 대신 undici fetch failed로 표면화 가능.
2. **네이버 모니터링 클라우드 IP 차단**: GitHub #2128 — 약관 위배 시 모니터링 시스템이 클라우드 IP(AWS EC2 등) 차단 사례. 약관 사유는 기술지원 아닌 스마트스토어 고객센터 문의 대상.
3. **일반 네트워크**: ECONNRESET, UND_ERR_SOCKET(other side closed, 닫힌 keep-alive 재사용), ETIMEDOUT, IPv6 우선해석. Next.js/undici keep-alive 재사용 버그도 동일 증상.
4. **Rate limit 혼동 주의**: 호출량 초과는 fetch failed 아닌 HTTP 429. 헤더 GNCP-GW-RateLimit-Replenish-Rate / Burst-Capacity로 잔량 확인, 429 시 1~2초 딜레이 후 재호출.

## 5. 발송지연/품절 페널티 기준 (위탁 셀러 핵심 리스크)
- **발송처리 지연**: 발송처리기한까지 미발송 다음영업일 1점 / 발송예정일+1영업일 미발송 2점 / 발송처리기한+4영업일 미발송 3점.
- **품절 취소**: 품절취소 다음영업일 2점 / 선물하기 주문 품절 3점 / 정기구독 3점. 위탁 셀러는 공급사 품절 실시간 미포착 시 대량 페널티 위험 최대.
- **반품/교환 처리지연**: 수거완료일+3영업일 경과 1점(교환·재교환 각 1점).
- **제재**: 최근 30일 페널티 10점 이상 + 비율(점수합/결제건수합) 40% 이상 → 단계적(주의→경고→이용제한) 판매제한.

---

## 권장 시스템 설계 (Next.js + Vercel + Commerce API)
1. **인증**: api.commerce.naver.com/external/v1/oauth2/token (clientCredentials, client_secret_sign 전자서명+timestamp, 만료 3시간). 토큰 캐싱+만료전 갱신.
2. **주소록 ID 캐싱**: 부팅/cron에서 주소록 조회 1회 → RELEASE/REFUND_OR_EXCHANGE addressBookNo를 store_settings 저장. 매 등록마다 조회 금지.
3. **상품등록**: 전 상품 동일 단일 출고지/반품지 ID 사용, 공급사 구분은 deliveryBundleGroupId. claimDeliveryInfo에 shippingAddressId/returnAddressId/returnDeliveryFee/exchangeDeliveryFee.
4. **주문 자동화**: 발주확인 → 공급사 발주 → 공급사 송장수신 → 발송처리(송장입력) API. 위탁은 공급사 송장 입력 시 발송완료+정산흐름 시작.

## 정산/반품 꼬임 방지 핵심
- 정산은 주문종료(구매확정/반품완료/교환완료) 후 1영업일. 공급사가 물리 반품을 처리해도 네이버 시스템상 클레임 상태(반품완료 등)는 셀러가 중계 입력해야 정산/페널티 정상.
- **반품배송비 부담**: 구매자 귀책(단순변심)이면 자동 청구.
  - 공제예정/선결제 → 환불보류 해제 없이 반품완료처리만.
  - 구매자 별도송금/상품동봉 → 환불보류 해제 후 반품완료처리.
  - 추가/재반품비용은 환불보류(추가청구) 기능, 구매자 결제 후 환불.
- 위탁 모델: 반품/교환비는 귀책자(단순변심=구매자, 하자/오배송=셀러) 부담. 셀러 부담분은 공급사와 별도 정산 합의. 네이버는 셀러↔구매자만 정산, 셀러↔공급사는 미처리.

## IP 고정 해결책 (Vercel 환경)
- **Vercel Static IPs 애드온**: Pro 플랜, 아웃바운드를 지역별 고정 IP로 라우팅. 이 IP를 커머스API센터 호출IP(최대3개) 등록. 미들웨어/엣지 런타임 미적용 → 네이버 호출은 반드시 서버리스 함수(/api, Server Action)에서.
- **서드파티 고정 IP 프록시**: QuotaGuard($19/월~), Fixie, Noble IP. 환경변수만으로 아웃바운드 고정IP 터널링. 네이티브보다 저렴.
- **고정 IP VM / Cloudflare Tunnel**: 네이버 호출 전용 경량서버(고정IP) → Vercel이 프록시. 운영부담 크나 완전통제.

---

## 권장 실행 (3단계)
**1단계 즉시(주소록·예외처리)**: 판매자센터 대표 출고지/반품지 본인 사업장 주소 등록(비상주 사무실 권장—주소공개 의무상 자택노출 회피). 자동수거지시 예외처리(공지+1:1문의). 위탁업체정보 사전입력. 주소록 조회 API로 addressBookNo 2개 받아 store_settings 저장 → 빈 ID 해결.
**2단계 IP 문제(fetch failed 근본)**: error.cause + 응답본문 + GNCP-GW-Trace-ID 로깅으로 GW.IP_NOT_ALLOWED / ECONNRESET / 429 확정. IP 문제면 Vercel Static IPs(서버리스만) 또는 QuotaGuard/Fixie. 토큰만료(3시간)/Content-Type(상품등록 JSON, 이미지다건 multipart) 점검.
**3단계 자동화·페널티 방어**: 공급사 재고/품절 동기화 cron(최대 리스크). 인기·소량 상품 1인당 수량제한. 공급사 송장 → 발송처리 API 자동화(물류 스케줄 배치). 발송지연 예상 시 발송지연 처리로 선제 대응.

**판단 임계값**: 최근 30일 페널티 10점+비율 40% 도달위험 시 즉시 품절위험 상품 판매중지·수량제한. fetch 에러가 IP 아닌 ECONNRESET/ETIMEDOUT 위주면 지수 백오프 재시도+keep-alive 비활성화(또는 Connection: close). 429면 1~2초 딜레이 후 재호출.

## Caveats
- /external/v1/seller/addressbooks-for-page 정확한 경로 문자열, shippingAddressId/returnAddressId 공식 required 플래그는 로그인 기반 공식문서(apicenter.commerce.naver.com/ko/basic/commerce-api) 최종확인 권장. 단 응답필드(addressBooks[], addressBookNo, addressType=RELEASE/REFUND_OR_EXCHANGE), claimDeliveryInfo 하위 위치, [판매자정보] 권한 요건은 공식답변+동작코드로 확인됨.
- 페널티 점수/정산주기/수수료는 시점별 변경 가능(2025년 중 주문상세조회 API 클레임 구조 변경 예고). 판매자센터 최신 공지 재확인.
- 자동수거지시 예외처리 승인 기준은 개인정보 강화로 엄격해지는 추세, 반려 가능성.
- fetch failed는 단일 원인 아닌 네트워크 실패 래퍼 → 반드시 cause 분기 진단. IP 차단은 기술지원(GitHub) 아닌 모니터링/약관 영역일 수 있어 그 경우 스마트스토어 고객센터가 정식 채널.

## 출처
- 네이버 커머스 API GitHub Discussions: #246(주소록 사전등록), #2305(단독형 옵션/주소 동작), #1896(GW.IP_NOT_ALLOWED), #2128(IP 차단), #2130(IP 허용), #6(Rate limit), #2216(상품등록 에러)
- esellers.co.kr(커머스 API IP 최대3개 안내), sellingkok.com(위탁판매 출고지/반품지 가이드)
- sellerking.io(2024 페널티 점수 가이드), QuotaGuard(서버리스 고정IP), nodejs/undici #3492(fetch failed cause)
