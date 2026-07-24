# HANDOFF — 달항아리 발행 준비도 실측 (2026-06-02 Desktop)

> 본 문서는 P0 달항아리 발행 실측 turn의 권위 기록입니다.
> 결론 한 줄: **달항아리는 production 게이트 기준 이미 `publishReady: true`. 발행 차단 해소됨.**
> 비가역 0 / 허위 0 (#46) 준수. 코드 변경 0.

---

## 1. 베이스라인 (실측 확정)

| 항목 | 값 | 검증 방법 |
|---|---|---|
| production HEAD | `bd286ac` (2-MOBILE-3) | Vercel list_deployments — state READY, target production |
| 직전 commit | `0ebcd56` (2-MOBILE-2) | 동일 |
| MD 헤더 "본 commit" placeholder | = `bd286ac` 확정 | Vercel githubCommitSha 대조 |

직전 세션 기록의 베이스라인 `0ebcd56`은 그 시점 값. Code가 2-MOBILE-3(`bd286ac`)까지 정상 출하 완료.

---

## 2. 달항아리 실측 (`cmp3afb450001gng5468w0qpc`, DRAFT)

### 2-1. publish-readiness 엔드포인트 실호출 결과 (production)

`GET /api/products/cmp3afb450001gng5468w0qpc/publish-readiness` → HTTP 200

| 축 | 결과 |
|---|---|
| `fieldsAllSet` | **true** (상품필드 19개 전부 충진) |
| `authentic` | **true** (`authenticityViolations: []`) |
| `naverPayloadComplete` | **true** (`naverPayloadMissing: []`) |
| `status` | DRAFT (비가역 0 유지) |
| **`publishReady`** | **true** |

게이트가 검사하는 naverPayload 7필드: naver_origin / naver_manufacturer / naver_as_info /
naver_tax_type / naver_delivery_info / naver_exchange_info / naver_refund_info — 전부 true.

### 2-2. Supabase Product row 실측 (충진 현황)

| 구분 | 필드 | 값 | 판정 |
|---|---|---|---|
| 정체성 | name (원본 SoT) | 디자인 복 달항아리 도어벨 개업선물 액막이 집들이 이사 결혼 신혼 인테리어 | OK |
| | naver_title | 집들이선물 달항아리 도어벨 디자인 이사 결혼 개업선물 액막이 신혼 (33자) | OK |
| | naver_brand / manufacturer | 꽃틔움 / 유통 꽃틔움 | OK |
| 원산지 | naver_origin / originCode | 중국 / 0200037 | OK |
| 물성 | naver_material | 원목 + 황동 (상세 이미지 참조) | OK |
| | naver_color / size / weight | "상세페이지 참조" (placeholder) | ADVISORY |
| 거래조건 | 배송/교환/반품/AS/보증 | 구체 충진 (CJ대한통운, 7,500원 등) | OK |
| 키워드 | naver_keywords | 집들이선물, 이사, 결혼, 개업선물, 달항아리, 집들이, 결혼선물, 이사선물 | OK |
| 세무 | naver_tax_type / min_order | 과세 / 1 | OK |
| 카테고리 | naverCategoryCode | `11_08_22_00_00` | **검증 필요** |
| 정보고시 | productInfoName / Manufacturer / Model | 3개 NULL | ADVISORY (게이트 비대상) |
| 법적승인 | legalApproval | NULL | ADVISORY (게이트 비대상) |
| 가격 | salePrice / supplierPrice | 27,200 / 20,900 (마진 정상) | OK |

---

## 3. 직전 기록과의 정정 (#44 stale fact 해소)

| stale 기록 | 위치 | 실측 정정 |
|---|---|---|
| "naver_* 17필드 전부 NULL" | 이번 turn 지시문 / ROADMAP 헤더 | **무효** — 90% 충진 완료, 게이트 통과 |
| "publishReady 거짓신호" | 동일 | **무효** — 4축 정합 통과, 거짓신호 아님 |
| "달항아리 category=uncategorized, 순마진 6.4%" | TASK_BRIDGE §5 B-3 | **무효** — 카테고리 코드 충진됨, 마진 정상 (27,200/20,900) |

직전 핸드오프 메모는 그 시점 기준. 그 사이 Code 세션이 충진을 완료했으나 ROADMAP 헤더 + B-3가 stale로 잔존.

---

## 4. 발행 전 잔여 검증 2건 (다음 세션 선결)

게이트는 GREEN이나, 비가역 발행 직전 시니어 육안 리스크 2건. **게이트 로직 밖의 실무 리스크.**

### 4-1. [필수] 카테고리 코드 정합성 — `11_08_22_00_00`
- 게이트는 "코드 채워짐"만 검사, "코드 옳음"은 미검사.
- 검증: 로컬 카테고리 트리에서 코드 조회 → 달항아리(인테리어소품/장식용품) 자리 일치 확인.
- 파일 위치: 다음 세션에서 `find` 로 실제 경로 확정 후 grep (이번 turn 중 bash 디스크 마운트 끊김으로 보류).
  CLAUDE.md 기재 경로 `src/lib/naver/naver-categories-full.ts`는 bash 접근 시 미확인 — Filesystem MCP read 또는 Code 측 Grep 권장.
- 틀리면: 오분류 발행 = 노출 0 리스크.

### 4-2. [권고] 정보제공고시 placeholder
- naver_color / size / weight = "상세페이지 참조", productInfo* 3필드 NULL.
- 게이트 통과하나 네이버 실제 발행 폼의 "상품정보제공고시" 항목에서 반려/감점 가능.
- groundedFacts(도매꾹 getItemView 실데이터) 한도 내 충진 권고. 없는 정보 생성 금지(#46).

---

## 5. 발행 동선 (대표 최종 승인 후에만)

1. 카테고리 코드 검증 (4-1) → 일치 확인
2. (선택) 정보고시 placeholder 충진 (4-2, groundedFacts 한도)
3. 대표 명시 승인 — "발행해" 류 명시 트리거
4. 비가역 register 호출 (그 전 0건, DRAFT 유지)

**비가역 0 절대준수: 대표 명시 승인 전 네이버 실발행 금지.**
