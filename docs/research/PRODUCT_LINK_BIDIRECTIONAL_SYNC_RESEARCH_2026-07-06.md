# 네이버 스마트스토어 선택적 임포트 + 양방향 동기화 허브 — 심층 설계 리서치 (2026-07-06)

Authoring: DESKTOP (심층 리서치). 권위: 본 문서 = PRODUCT-LINK(선택연동+양방향동기화) 워크스트림 설계 근거. 구현=Code. 원칙 #55/#56/#181/#46/#62.
출처: 네이버 커머스 API 공식 GitHub Discussions(#11/#1194/#1546/#1650/#1669/#1883/#1903/#2128/#6/#1648) + 양방향 동기화 업계 패턴(Salesforce/Stacksync).

================================================================
## 0. 운영자 확정 방향 (하이브리드 최선안)
================================================================
- 입력 = **(c) 목록 브라우즈+체크박스 + 상품번호 직접입력 병행**
- 범위 = **(b) 재고·가격 + 상세·옵션·상태 전체 관리**
- 방향 = **(b) 양방향 pull + 충돌 규칙**
- 신규 발행분 자동 편입 (naverProductId 매핑 일원화)
- 최대 자동화·오류 최소화

================================================================
## 1. ★핵심 제약 (설계를 가르는 사실 — LIVE-SOURCED)
================================================================
1. **경량 재고/가격 수정 API 없음**. 상품 수정 = 전량 full-replace PUT. 네이버 공식: "요청 메시지에 포함하지 않은 정보는 제거". 재고만 보내면 salePrice NotNull → 400. → **유일 정답 = GET→병합→검증→전체 PUT**(이 앱 `updateStock`이 이미 이 패턴).
2. **벌크 업데이트는 절대값 불가**(상대변경 n원/n%만). 개별 목표가 세팅 불가 → 개별 full PUT 사용.
3. **상품 변경 webhook 없음**. pull = 상품목록 조회 `modifiedDate` 델타 폴링 + 변경분만 상세 GET(2단계).
4. **detailContent 예외**: 수정 시 생략하면 기존 상세 유지(안전). 단 seoInfo는 빈값=삭제 → 항상 명시.
5. **옵션형 재고**: 조합형/useStockManagement 상품은 총재고 자동계산 → `originProduct.stockQuantity` 필드 제외, `optionCombinations[n].stockQuantity`로만.
6. **국내 IP 필수**. → **현 Tailscale Funnel 등록 IP 프록시 구조가 필수 요건**. IP 변경 시 재등록 런북.
7. **Rate limit 429**(초당). Queue 구조 + 429 시 3~5초 백오프. full-replace는 상품당 ~2초 → 대량 부적합 = **"선택 소수 상품" 방향이 정답**.

================================================================
## 2. 식별자 체계 (필수 저장)
================================================================
- 1상품 = **1 originProductNo(원상품) + 1+ channelProductNo(채널상품)**.
- 스마트스토어 UI·상품 URL 노출값 = **채널상품번호**(운영자가 붙여넣는 번호). 원상품번호는 미노출.
- ★함정: A의 originProductNo와 B의 channelProductNo가 같은 숫자일 수 있음 → **번호 "유형" 반드시 함께 저장**.
- 매핑 키 = **originProductNo = naverProductId**(수정·조회 기준). 직접입력은 대개 channel → `GET /channel-products/{no}`로 origin 정규화.

================================================================
## 3. 조회/수정 엔드포인트
================================================================
| 목적 | 엔드포인트 | 방식 | 주의 |
|---|---|---|---|
| 상품 목록 | `POST /v1/products/search` | body·페이지 | `modifiedDate` 반환(drift 핵심)·size 상한 미확인(§8) |
| 원상품 상세 | `GET /v2/products/origin-products/{no}` | GET | 전체 필드 |
| 채널상품 상세 | `GET /v2/products/channel-products/{no}` | GET | origin 정규화용 |
| 원상품 수정 | `PUT /v2/products/origin-products/{no}` | full-replace | 누락=삭제 |
| 벌크 | `PUT /v1/products/origin-products/bulk-update` | 상대변경만 | 절대값 불가 |

================================================================
## 4. ★양방향 동기화 — 필드별 소유권(SoR) + 충돌 규칙
================================================================
업계 정설: 필드별 진실원천을 못박으면 "진짜 충돌"이 same-field 동시수정으로만 한정됨.

| 필드 | SoR | push(앱→네이버) | pull(네이버→앱) | 충돌 규칙 |
|---|---|---|---|---|
| stockQuantity/옵션재고 | **네이버** | ❌ 금지(기본) | ✅ 항상 | 앱 미덮어쓰기(실주문 차감 보호) |
| salePrice | **앱** | ✅ | 표시용 | 앱 우선 |
| detailContent | **앱** | ✅(미변경 시 생략) | 표시용 | 앱 우선 |
| 옵션구조/옵션명 | **앱** | ✅ | drift 경고 | 앱 우선 |
| name | **앱** | ✅ | drift 경고 | 앱 우선 |
| statusType/전시상태 | **공유** | ✅(운영자 조작) | ✅ | drift→운영자 확인 큐 |
| OUTOFSTOCK 자동전환 | **네이버** | — | ✅ | 네이버 존중 |

**4대 원칙**
1. 두 단방향 파이프 ≠ 양방향. 필드별 SoR로 충돌 최소화.
2. **push 전 반드시 pull(read-before-write)** → GET-merge → 앱 변경분만. naverModifiedAt이 마지막 pull보다 최신이면 재고류 채택 + 앱 소유 필드 동시변경 시 CONFLICT.
3. **에코 방지**: push payload 해시(syncHash) 저장, pull 해시 동일 시 no-op. 출처 태깅(APP_PUSH/NAVER_PULL).
4. 소수 상품 → modifiedDate 델타 폴링 + 수동 "지금 동기화" 병행. Queue 순차.

================================================================
## 5. 선택적 임포트 UX / 데이터 흐름 (하이브리드)
================================================================
- (a) 목록+체크박스: `POST /products/search`(SALE·페이지) → 체크 → 일괄 임포트.
- (b) 번호 직접입력: channel일 가능성 → channel GET으로 origin 확인 → 원상품 정규화.
- 파이프: 선택/입력 → GET 상세 → 앱 스키마 변환 → naverProductId upsert(중복 차단) → source=IMPORTED·linkStatus=LINKED·naverModifiedAt·syncHash·lastSyncedAt.

================================================================
## 6. 기존 유틸 재사용 + 스키마 확장
================================================================
| 기존 유틸(api-client.ts) | 재사용 |
|---|---|
| `getProduct`(GET 상세) | 임포트 정규화·push 전 GET-merge·pull 상세 |
| `diffNaverProduct`(read-only diff) | dry-run 미리보기·drift/conflict 감지·운영자 확인 큐 근거 |
| `updateStock`(GET-merge→full PUT) | 모든 push의 기반(재고→가격→상세로 일반화) |
| `bulkUpdateStock` | 다건 재고(옵션형은 optionCombinations 분기) |

**Prisma 확장(제안)**: naverProductId @unique(=originProductNo·재임포트 차단) · channelProductNo · source(IMPORTED|NATIVE) · linkStatus(LINKED|UNLINKED) · naverModifiedAt · lastSyncedAt · syncHash · syncState(SYNCED|PENDING|CONFLICT|FAILED).
**신규 발행 자동편입**: POST /v2/products 성공 → 응답 originProductNo를 naverProductId 저장 + source=NATIVE·LINKED → 임포트 상품과 동일 동기화 체계.

================================================================
## 7. 단계적 로드맵 (안전 증분) — PRODUCT-LINK
================================================================
- **PL-1 MVP**: 선택연동(목록+직접입력) + 재고·가격·상태 **read-only pull·표시**. 쓰기 0. → 검증: 임포트 10건 스토어값 100% 일치·modifiedDate pull 반영.
- **PL-2**: 상태 push(품절/재판매·옵션품절) GET-merge full PUT. 수량 절대값 push 금지(네이버 SoR). → dry-run diff "재고/상태 외 무변경" 확인 후 실행.
- **PL-3**: 가격 push(개별 full PUT). → 가격 외 필드 보존 검증.
- **PL-4**: 상세·옵션 full 관리(seoInfo 항상 명시).
- **PL-5**: 신규 발행 자동편입 + cron 주기 pull(플랜 허용 범위) + 수동 병행 + CONFLICT 운영자 큐.
- 전환 기준: 각 단계 dry-run vs 실제 PUT diff 불일치 0%·부분실패 임계 미만.

================================================================
## 8. ★확인 필요/불확실 (정직 표기)
================================================================
- `products/search` size 상한 공식 미확인 → apicenter 필드스펙 확인 or out-of-range 테스트(400)로 검증. (size 1,000/총 5만은 카카오 톡스토어 수치·네이버 적용 금지.)
- webhook 미제공 → 폴링 유일. 재고 실시간성 중요 시 주문 last-changed와 결합해 "판매발생 상품만 재고 즉시 재조회" 보조 트리거.
- Vercel cron: 현 플랜 daily 상한(#194). 분단위 폴링은 Pro/외부 스케줄러(QStash/GitHub Actions) 필요.

================================================================
## 작업 유의사항/원칙 (신규)
================================================================
- **#196** 네이버 상품 수정은 **전량 full-replace** — 모든 push는 GET-merge 필수·부분 PUT 금지(데이터 손실). detailContent만 "생략=유지" 예외, seoInfo는 "빈값=삭제"라 항상 명시.
- **#197** 양방향 동기화는 **필드별 SoR 고정** — 재고=네이버(실주문 보호), 상세/가격/옵션=앱. push 전 pull·syncHash 에코방지·CONFLICT는 운영자 큐.
- **#198** 식별자는 origin/channel **유형 함께 저장** — 숫자 충돌 위험. 매핑 키=originProductNo.
- **#199** 임포트/동기화는 "선택 소수 상품" 전제로 설계(full-replace ~2초/건·429) — 대량 일괄 금지.
