# HANDOFF — 네이버 엑셀 88칸 매핑 누락 (2026-06-02 Desktop 실측)

> 권위 문서. P0 달항아리 발행 전 **엑셀 대량 업로드 경로** 전수 검사 결과.
> 결론: API 직접등록 경로는 GREEN이나, **엑셀 경로는 매핑 누락 5건**. 엑셀로 올리면 옵션 깨짐 + 정보고시 반려 위험.
> 코드 변경 0 (Desktop 진단 turn). 비가역 0 / 허위 0 (#46).

---

## 1. 검증 방법 (실측)

- `POST /api/naver/excel` body `{"productIds":["cmp3afb450001gng5468w0qpc"]}` → HTTP 200, 9,681B xlsx 수신.
- openpyxl 파싱: 93칸(시트 '일괄등록'), 헤더 1행 + 달항아리 데이터 1행.
- 값충진 32칸 / 빈칸 61칸. 빈칸 중 도서[80~88]·사이즈[89~92]는 카테고리 무관 정상 공란.

## 2. 최신값 반영 — 통과 (긍정 확인)

엑셀이 DB 최신값을 직접 읽음을 확인 (stale 아님):

| 칸 | 출력값 | 판정 |
|---|---|---|
| [1] 카테고리코드 | `50000963` (방금 교정한 네이버 코드) | OK 실시간 반영 |
| [29] 원산지코드 | `0200037` (=중국, 공식표 대조) | OK |
| [4] 판매가 | 27200 | OK |
| [50] 정보고시 템플릿코드 | 2976841 | OK 연결됨 |

## 3. 매핑 누락 5건 (route.ts 근본 원인)

파일: `src/app/api/naver/excel/route.ts` — `rows.map((p) => ({ ... }))` 블록.
빌더 타입: `src/lib/excel/naverExcel.types.ts` `NaverProductData` — 아래 키 전부 *정의됨*.
정황: 그릇(타입 키)은 있는데 route.ts가 담지 않음.

### 누락 1 [치명] — 옵션 미매핑
- 엑셀 [12~16] 옵션형태/옵션명/옵션값/옵션가/옵션재고 전부 공란.
- DB: `optionName`='형태', `options`=[{name:'...정사각',qty:9999,addPrice:0},{name:'...직사각',...}].
- 빌더 키: `optionType / optionNames / optionValues / optionPrices / optionStocks` (정의됨, 미사용).
- 영향: 옵션 상품이 단일상품으로 등록됨 → 고객 선택 불가. 발행 후 수정 = 상품 내렸다 재등록.
- 수정: route.ts map에 options 배열 → 빌더 키 변환 추가.
  네이버 조합형 옵션 포맷 확인 필요(optionNames='형태', optionValues='정사각,직사각' 구분자 빌더 규약 대조).

### 누락 2 [반려위험] — 정보제공고시 개별 텍스트칸 미매핑
- 엑셀 [51]품명 [52]모델명 [53]인증 [54]제조자 공란 (템플릿코드 [50]만 채워짐).
- DB: productInfoName/Model/Manufacturer NULL (Desktop이 groundedFacts로 선충진 필요).
- 빌더 키: `noticeBrandName / noticeModelName / noticeCertification / noticeManufacturer` (정의됨, 미사용).
- 수정: (a) Desktop — DB productInfo* 충진 (도매꾹 getItemView 실데이터, 허위 0).
        (b) Code — route.ts map에 notice* 키 매핑 추가.
- 단, 템플릿코드(2976841)로 네이버가 자동 채우면 개별칸 공란 허용일 수 있음 → 네이버 일괄등록 규약 확인 후 결정.

### 누락 3 [정책] — 반품/교환 배송비 출력 안 됨
- 엑셀 [46]반품배송비 [47]교환배송비 공란.
- route.ts는 returnFee/exchangeFee를 shipping_templates에서 매핑 *시도함*.
- 의심: 연결된 shipping_template의 returnFee/exchangeFee가 NULL이거나, 빌더 출력단에서 누락.
- 수정: 연결 템플릿 실측 → NULL이면 DB값(naver_refund/exchange 7500) fallback 추가.

### 누락 4 [오값] — 제조사 잘못된 컬럼
- 엑셀 [26] 제조사 = "도매매 공급사" 출력. DB naver_manufacturer = "유통 꽃틔움".
- route.ts: `manufacturer: p.manufacturer` — naver_manufacturer 아닌 다른 컬럼 읽음.
- 수정: `manufacturer: p.naver_manufacturer ?? p.manufacturer ?? undefined`.

### 누락 5 [구조위험] — 상품명 우선순위 역전
- route.ts: `productName: p.seoTitle ?? p.aiGeneratedTitle ?? p.naver_title ?? p.name`.
- seoTitle 1순위인데, Lane 1 의도가중·length-fill로 정교화한 건 naver_title.
- 현 엑셀은 naver_title 출력됨 = seoTitle 비어 fallback (운 좋게 맞음, 구조는 위험).
- 수정: naver_title 우선 권고 — `productName: p.naver_title ?? p.seoTitle ?? p.aiGeneratedTitle ?? p.name`.
  (단 DEBT-01 4중컬럼 수술과 연동되므로 P3에서 일괄 정리도 가능 — 우선순위만 단기 교정 권고.)

## 4. 우선순위

1. 누락1 옵션 (치명, 최우선)
2. 누락2 정보고시 (반려위험) — Desktop DB충진 + Code 매핑
3. 누락4 제조사 오값 (간단)
4. 누락3 배송비 (템플릿 실측 후)
5. 누락5 상품명 우선순위 (단기 교정 or P3 연동)

## 5. 절대준수
비가역 0 (네이버 발행 금지, DRAFT 유지) / 허위 0 #46 / Prisma 싱글톤 / heredoc 금지 #26
한글 i18n 분리 #35 / commit 한글 = .commit-msg.tmp #17 / push 후 verify-vercel #36
