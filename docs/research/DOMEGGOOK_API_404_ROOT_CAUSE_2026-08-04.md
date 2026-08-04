# 도매꾹 OpenAPI 404 (UNKNOWN_SERVICE) 근본 원인 규명

> 작성일: 2026-08-04 | 작성 컨텍스트: Desktop 세션 (rev96 후속) · 원칙 #324 적용
> 대상 파일: `src/lib/wholesale-matcher.ts` | 관련 인계: `docs/handoff/CURRENT.md` §2

## 1. 결론 (TL;DR)

- **도매꾹 API는 폐기되지 않았다.** 엔드포인트·TLS 모두 정상 작동 중.
- 근본 원인은 **버전·파라미터·응답스키마 3중 불일치**다. 앱 코드가 존재하지 않는 `ver=4.5`로 `getItemList`를 호출 → 서버가 `404 UNKNOWN_SERVICE`("해당 오픈 API 서비스가 없습니다") 반환.
- 도매꾹 공식 버전기록: **v4.0에서 getItemList의 Request/Response 구조가 전면 개편**됨("기존 연동 수정 필요"). 현재 권장 버전은 **4.1**. `4.5`는 `getItemView`(단건 상세) 전용 버전이라 `getItemList`에는 존재하지 않음 → 그래서 이 모드만 죽어 보였다.

## 2. 진단 과정 (실측 증거)

### 2-1. 공식 문서 (openapi.domeggook.com)
- 상품리스트 아티클: 권장 `ver=4.1`, `market`(dome/supply) 필수, 검색어 파라미터는 `kw`, 개수 `sz`(1~200, 기본 20), 페이지 `pg`, 정렬 `so`(se/rd/ha/aa/ad/sd/qa/qd/da).
- 버전기록: `v4.0 (권장/베이스): Request/Response 구조 전면 개편 — 기존 연동 수정 필요` · `v4.1: nick 검색 + lwp/dfos 필터 추가`.

### 2-2. 라이브 차등 검증 (실제 DB 키 사용, 읽기전용 GET)
| 테스트 | 요청 | 결과 |
|---|---|---|
| A. 현재 앱 코드 방식 | `ver=4.5&mode=getItemList&keyword=무선충전기&sort=pop` (market 없음) | **404 UNKNOWN_SERVICE** (프로덕션 버그 정확히 재현) |
| B. 수정안 (도매꾹) | `ver=4.1&market=dome&kw=무선충전기&sz=5&so=rd` | **HTTP 200 · 전체 2,172건 · 실상품 5건 반환** |
| B2. 수정안 (도매매) | `ver=4.1&market=supply&kw=무선충전기&...` | **HTTP 200 · 전체 1,657건 · 실상품 5건 반환** |

→ 파라미터를 4.1 규격으로 바꾸자 즉시 실상품이 반환됨. 근본 원인 확정.

## 3. 코드가 틀린 지점 (wholesale-matcher.ts)

### 3-1. 요청 파라미터
| 목적 | 현재(틀림) | 공식(맞음) |
|---|---|---|
| 버전 | `ver=4.5` | `ver=4.1` |
| 마켓 | (없음) | `market=dome` \| `supply` (필수) |
| 검색어 | `keyword=` | `kw=` |
| 개수 | `display=20` | `sz=50` |
| 페이지 | (없음) | `pg=1` |
| 정렬 | `sort=pop` (무효값) | `so=ha`(인기순) 또는 `se`(정확도순) |

### 3-2. 응답 스키마 (더 중요 — 파라미터만 고쳐도 파싱이 깨진다)
getItemList 응답은 **평면 구조**인데, 현재 `DomeggookListItem`은 `getItemView`(단건 상세)의 **중첩 구조**를 가정하고 있다.

| 필드 | 현재 코드 가정(중첩) | 실제 getItemList(평면) |
|---|---|---|
| 단가 | `item.price.supply` | `item.price` (int) |
| 최소구매수량 | `item.qty.supplyUnit` | `item.unitQty` (int) |
| 썸네일 | `item.thumb.large/largePng` | `item.thumb` (URL 문자열) |
| 판매자 | `item.seller.company.name` | `item.id` / `item.nick` |
| 배송 | `item.deli.supply.fee/type` | `item.deli.who`(S/P/B/C) / `item.deli.fee` |
| 재고 | `item.qty.inventory` | **없음** (목록 API는 판매중 상품만 반환) |
| 마켓여부 | — | `item.market.domeggook` / `item.market.supply` (문자열 "true"/"false") |

- **치명 버그**: `inventory = item.qty?.inventory ?? 0; if (inventory<=0) continue;` → 목록 응답엔 `qty`가 없어 항상 0 → **모든 상품 스킵**. 파라미터를 고쳐도 이 필터 때문에 결과가 0건이 된다. 목록 API는 "판매중지·품절·단종 제외"를 보장하므로 재고 필터 자체가 불필요.

## 4. 해결책 (영구 조치)

1. `searchDomeggook`을 `market` 파라미터화한 단일 함수로 재작성 — `ver=4.1`, `market`, `kw/sz/pg/so`, 평면 스키마 파싱, 재고 필터 제거(`unitQty===1` MoQ 필터는 유지, 서버측 `mnq=1&mxq=1`로도 가능).
2. **선제 개선**: 기존 `searchDomemae`(HTML 스크래핑, 정규식 파싱 — 취약)를 폐기하고 **동일 OpenAPI `market=supply` 호출**로 대체. 도매꾹·도매매는 같은 API·같은 키를 쓰며 `market` 값만 다르다.
3. **도메인 정합**: DOMAIN_FACTS §1 "도매매(DMM) 우선, 도매꾹(DMK) 폴백"에 맞춰 `market=supply`를 1차, `market=dome`를 2차로 호출.

## 5. 남은 검증 (다음 단계)

- Code: 위 수정 적용 → `npx tsc --noEmit` 0 → `npm run build` 0.
- Desktop: 로컬 `POST /api/sourcing-recommend?dryRun=true` 재실행 → 후보에 도매매칭이 실제로 채워지는지(0건→N건) 확인.
- 참고: 같은 상품번호가 dome/supply 양쪽에 다른 가격으로 존재할 수 있음(실측: no.46072413 → dome 9,900 / supply 11,900). productNo 기준 dedup 시 유의.
