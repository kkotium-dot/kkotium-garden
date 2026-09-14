# 크롤→씨앗심기 prefill 데이터 손실 — 진단·수정 인계서 (2026-09-10)

## 대표님 보고
"꿀통창고에서 크롤링한 상품정보가 씨앗심기(상품수정)로 넘어갈 때 모든
정보가 제대로 입력되지 않는다."

## Desktop 실측 진단 (grep 전수 대조 — 추측 아님)

crawl 페이지가 `/products/new?prefill=<base64>`로 넘기는 필드 vs 씨앗심기
(products/new/page.tsx)가 실제로 읽는 필드를 1:1 대조한 결과:

### 결함 A — 씨앗심기가 아예 안 읽는 필드 (crawl은 보내는데 버려짐)
grep으로 products/new/page.tsx 전체에서 미발견 확정:
- `crawlProductNo` (공급처 상품번호) — **가장 치명적**: 이게 supplier_
  product_code로 연결되면 재고추적이 즉시 켜지는데, 버려져서 대표님이
  나중에 "상품 코드 연결"을 수동으로 다시 해야 함.
- `crawlInventory` (크롤 시점 재고)
- `crawlNaverFeeRate` (수수료율)
- `crawlSellerNick` (공급사 닉네임 — sellerId만 읽고 nick은 안 읽음)

### 결함 B — 진입점마다 prefill 스키마가 다름 (#370 위반)
crawl/page.tsx에 router.push('/products/new?prefill=') 가 4곳
(L411 단건, L626 bulk, L1833, L1976). 이들이 서로 다른 필드셋을 만듦:
- 단건(L376~): options를 `{name, qty, addPrice}` 객체로 보냄 + catD1/2/3
  + crawlSourceUrl + crawlNaverFeeRate 포함.
- bulk(L603~): options를 **이름 문자열 배열**로만 보냄(qty/addPrice
  누락!) + catD1/2/3, crawlSourceUrl, crawlNaverFeeRate **빠짐**.
- 씨앗심기 수신부(L1038)는 options를 `{name,qty,addPrice}` 객체로 기대
  → bulk로 넘긴 상품은 옵션 재고·추가금이 전부 999/0 기본값으로 뭉개짐.

### 결함 C — 수신 로직이 여러 useEffect로 쪼개져 파악·유지보수 어려움
prefill 파싱이 최소 3개 useEffect로 분산(L947 기본, L1076 공급사매핑,
L1221 카테고리 재확인). 같은 base64를 3번 재파싱. 필드 추가 시 어느
effect에 넣을지 불명확해 이번처럼 누락 발생.

## 수정 방향 (Code 인계)

1. **prefill 스키마를 단일 타입으로 정의**(예: src/lib/crawl/prefill-
   schema.ts에 `CrawlPrefill` interface + `encodePrefill`/`decodePrefill`
   헬퍼). crawl 4개 진입점과 씨앗심기가 모두 이 하나만 쓰게 해 필드
   불일치 원천 차단(#295 단일권위, #370 전소비처).
2. **bulk 경로 options를 단건과 동일하게 {name,qty,addPrice} 객체로** 통일.
   catD1/2/3·crawlSourceUrl·crawlNaverFeeRate도 bulk에 추가.
3. **누락 필드 수신 추가**: crawlProductNo → supplier_product_code
   자동연결(가장 중요, 재고추적 즉시 켜짐), crawlInventory → 초기
   재고스냅샷 참고, crawlNaverFeeRate → 마진계산기 수수료 프리필,
   crawlSellerNick → 공급사 표시.
4. **검증**: 실제 도매매/오너클랜 URL로 크롤 → 씨앗심기 이동 → 모든
   필드(특히 공급처 상품번호·옵션 재고·카테고리)가 폼에 정확히 채워지는지
   브라우저 실측. bulk 경로도 별도 검증(#370).

## 의존성
- 없음(독립 작업). 단, prefill 스키마 파일 신설이 선행돼야 나머지가 그 위에 얹힘.
