# LIFECYCLE_BRIDGE_V2 (2026-07-23 · Desktop)

> Cowork 3종 설계(LIFECYCLE_STATE_MACHINE / COPY_SYSTEM / SURFACE_RULES)를
> **실제 스키마·코드에 접합**하는 브리지 문서. Cowork 문서는 골격(원칙·매트릭스·테스트)으로 유효하나,
> 원자 필드·상태 목록·액션 목록은 본 문서가 **덮어쓴다(override)**.
> 검증 근거: Supabase information_schema 실측 + disposition.ts/source-gone.ts/daily-slots.ts 실독(2026-07-23).

## 0. 왜 브리지가 필요한가 (검증된 갭)

Cowork는 코드 접근 없이 독립 설계했다("첨부된 지식 폴더가 비어 있어"). 결과:

| 갭 | 내용 | 실측 근거 |
|---|---|---|
| G1 원자 불일치 | Cowork 원자 7개 중 실재 0개 | information_schema: isPublished/isArchived/isSuspended/saleStartAt/saleEndAt/requiredFieldsComplete/stock 전부 부재 |
| G2 **핵심 축 소실** | `sourceGone`(공급처 단절) 상태 없음 → OUT_OF_STOCK로 뭉개짐 | source-gone.ts `SOURCE_GONE_MIN_CONSECUTIVE=3` 실재 |
| G3 처분 액션 소실 | NONE/MARK_OUT_OF_STOCK/SUSPEND/RESOURCE/DELETE_SAFE 5액션 미반영 | disposition.ts:47-57 |
| G4 자산 축 소실 | T-05 "발행 트랙 삭제 전면금지"는 과잉. 실제는 자산 유무로 RESOURCE↔DELETE_SAFE 분기 | sales-assets.ts `hasSalesAssets()` |
| G5 도메인 오인 | "화훼 이커머스로 판단" → 실제는 도매매 드롭십 셀렉트샵. 기간판매 미사용 | 상품셋: 아이스트레이·달항아리·플라티코 |
| G6 status 제거 불가 | write 경로 3곳(stock-check:203·mark-oos:112·cron:104) + 필터탭 사용 중 | rev80 #294 감사 |

## 1. 채택 / 폐기 판정

**채택(골격)**: 파생 단일함수 원칙 · 발행여부 1급 축 · 액션 권한 매트릭스 · 금지조합 테스트 · 3초룰 카피(배지=진단/버튼=처방) · T-11 주액션 유일성.
**폐기**: 원자 7필드 · 상태 7종 그대로 · 액션 11종 그대로 · EXTEND_PERIOD/PERIOD_ENDED(기간판매 미사용) · ARCHIVED/RESTORE(미구현 개념, 후속 검토) · "status 컬럼 제거".

## 2. 실제 원자 필드 (Cowork §1 대체)

| 원자 | 출처 | 의미 |
|---|---|---|
| `naverProductId: string \| null` | Product | **발행여부 1급 축**(non-null = 발행) |
| `status` | Product | DRAFT / ACTIVE / OUT_OF_STOCK / INACTIVE |
| `naverStatusType` | Product | SALE / SUSPENSION / OUTOFSTOCK / null |
| `consecutiveNegatives: number` | inventory_snapshots 파생 | 선두 연속 qty<0 (>=3 → sourceGone) |
| `hasSalesAssets: boolean` | salesCount·lastSaleDate 파생 | 지킬 리뷰·순위 존재 여부 |
| `daysOutOfStock: number` | 파생 | 장기품절 판정(LONG_OUT_OF_STOCK_DAYS=14) |

## 3. 파생 상태 — 최종 7종 (2종 폐기 + 2종 신설)

> **정정(2026-07-23 · Desktop)**: 초판 제목 "7 → 9"는 **오기**. `PERIOD_ENDED`(기간판매 미사용)·`ARCHIVED`(보관함 미구현) **2종 폐기** + `SOURCE_GONE_*` **2종 신설** = 총합 **7종 그대로**. `lifecycle.ts`의 7종 구현이 정답이며 문서가 틀렸다. (Code가 지어내지 않고 확인 요청 → #303 정상 작동 사례)

### 미발행 트랙 (`naverProductId === null`)
| 상태 | 조건 |
|---|---|
| `DRAFT_INCOMPLETE` | 필수정보 미충족(status='DRAFT' + 준비도 미달) |
| `READY_UNPUBLISHED` | 필수정보 충족·미발행 |

### 발행 트랙 (`naverProductId !== null`)
| 상태 | 조건 | 비고 |
|---|---|---|
| **`SOURCE_GONE_RESOURCE`** | sourceGone + hasSalesAssets | **신규**. 삭제 금지·대체소싱 |
| **`SOURCE_GONE_DELETABLE`** | sourceGone + !hasSalesAssets | **신규**. 정리 안전 |
| `SUSPENDED` | naverStatusType='SUSPENSION' | |
| `OUT_OF_STOCK` | 재고 0 (단절 아님) | 재입고 시 복귀 |
| `ON_SALE` | 정상 | |

### 파생 우선순위 (순서 = 우선순위, 변경 금지)
```
[0] 발행 게이트: naverProductId null → 미발행 트랙
[1] sourceGone(연속음수>=3) → hasSalesAssets ? SOURCE_GONE_RESOURCE : SOURCE_GONE_DELETABLE
[2] naverStatusType=SUSPENSION → SUSPENDED
[3] 재고 0 → OUT_OF_STOCK
[4] else → ON_SALE
```
> **[1]이 [2]보다 앞선 이유**: 판매중지는 "노출을 멈춤"일 뿐 공급 문제를 해결하지 않는다. 명화 케이스(SUSPENSION + 단절)에서 "중지됨"만 보이면 대체소싱이라는 **남은 일이 숨는다**. 단절은 상품 자체의 처분 질문이므로 상위.

## 4. ★ 상태 축 ↔ 권고 축 분리 (핵심 통찰)

`disposition.ts:139`는 이미 `naverStatusType=SUSPENSION`이면 `NONE`을 돌려준다 — **권고는 "아직 안 한 일"**이기 때문. 반면 상태 배지는 "지금 무엇인가"를 말해야 한다. 두 축을 섞으면 §3의 모순이 재발한다.

| 축 | 질문 | 산출 | 소비처 |
|---|---|---|---|
| **상태(진단)** | 지금 무엇인가 | `LifecycleState` 9종 | 배지·필터·카운트 |
| **권고(처방)** | 아직 안 한 일 | `DispositionAction` 5종 | 주 액션 버튼·처분 대기함·알림 |

> Cowork 3초룰("배지=진단 / 버튼=처방")이 정확히 이 분리를 지원한다. 이미 판매중지한 단절 상품 → 배지는 `공급처 단절`, 권고는 `NONE`(할 일 없음). 모순 아님.

## 5. 액션 목록 (Cowork 11 → 실제 앱 액션)

| 액션 | 실재 | 비고 |
|---|---|---|
| `EDIT` | O | 씨앗심기 이동 |
| `PUBLISH` | O | 발행(#46 GO) |
| `SUSPEND` | O | 판매중지 PUT(#46 GO) |
| `MARK_OUT_OF_STOCK` | O | mark-oos |
| `RESOURCE` | O | 대체소싱 지정(SubstituteEditor) |
| `DELETE` | O | deleteProduct 단일함수(3경로 공통) |
| `DUPLICATE` | O | 부활소 "새 생명 부여" |
| `RESUME` | 부분 | 재개 |
| `UNPUBLISH` | 부분 | |
| ~~`RESTOCK`~~ | X | 드롭십이라 셀러가 재고를 못 채움 → `RESOURCE`로 대체 |
| ~~`EXTEND_PERIOD`~~ | X | 기간판매 미사용 |
| ~~`ARCHIVE`/`RESTORE`~~ | X | 미구현 개념(후속 검토) |

## 6. ★ 화면 성격 2종 분리 — 발행여부 경계 확정

| 성격 | 화면 | 축 | 규칙 |
|---|---|---|---|
| **보관함(위치)** | 꿀통창고(정원창고) / 꽃밭돌보기 | 발행여부 | 미발행=꿀통창고 / 발행=꽃밭돌보기 (#296) |
| **작업 큐(조건)** | 처분 대기함 · 부활소 · 대시보드 할일 | 조건 충족 | 조건 상품만 수집. **단 발행 전용** |

**근거**: `disposition.ts:129 if (!p.naverProductId) return NONE;` — 처분 큐는 **이미 발행 게이트를 내장**. 즉 앱의 확립된 규약은 "작업 큐도 발행 전용".

### 판정 — 부활소 `draft_incomplete` 분기 = 경계 위반 (제거 대상)
`daily-slots.ts:162`의 `draft_incomplete`("등록 미완료 — 네이버 업로드 대기 중")는 **미발행 상품**을 부활소에 끌어들인다. 부활소=좀비 부활은 "발행됐는데 안 팔리는 것"을 되살리는 곳이며, 미발행 상품은 애초에 살아난 적이 없다.

- **조치**: `draft_incomplete` 분기 제거 + 호출부(`reactivation/page.tsx:152`)에 `!!p.naverProductId` 필터 추가.
- **누락 방지(개입점 이식)**: 제거로 사라지는 "등록 미완료 N건"은 **꿀통창고(정원창고)에 '이어서 작성' 큐**로 이전. 상품이 조용히 사라지지 않게 한다(#56 개입점 자연 노출).

## 7. 카피 보정 (COPY_SYSTEM 신규 2상태 · 3초룰 준수)

| 상태 | 배지 | 톤 | 툴팁 | 주 액션 |
|---|---|---|---|---|
| `SOURCE_GONE_RESOURCE` | 공급처 단절 | critical(자주) | 공급처가 끊겼어요. 리뷰·순위를 지키려면 같은 상품에 다른 공급처를 연결하세요 | 대체소싱 하기 |
| `SOURCE_GONE_DELETABLE` | 공급처 단절 | warn(주황) | 공급처가 끊겼고 판매 이력도 없어요. 목록에서 정리해도 괜찮아요 | 정리하기 |

> 배지 라벨은 두 상태 공통("공급처 단절") — 셀러가 구분할 것은 **처방(버튼)**이지 진단명이 아니다. 색 강도로 심각도만 구분.

## 8. 금지조합 테스트 보정 (SURFACE_RULES §5)

**유지**: T-08(표↔상수 동기화) · T-11(주액션 유일성) · T-12(total function) · T-13(카피 키 정합)
**폐기**: T-04(EXTEND_PERIOD) · T-06/T-07/T-10(ARCHIVED 계열) — 해당 개념 미구현
**수정**: T-05 "발행 트랙 DELETE 전면 금지" → **"`hasSalesAssets=true`면 DELETE 금지"**(자산 축 반영. `SOURCE_GONE_DELETABLE`은 DELETE 허용)

**신규**:
| ID | 금지조합 | 기대 | 근거 |
|---|---|---|---|
| T-16 | sourceGone인데 `OUT_OF_STOCK` 파생 | 실패 | 단절>품절 우선순위 §3 |
| T-17 | sourceGone + SUSPENSION인데 `SUSPENDED` 파생 | 실패 → SOURCE_GONE_* | 단절>중지 §3 |
| T-18 | `SOURCE_GONE_RESOURCE` + `DELETE` | HIDDEN | 자산 보호(rev66) |
| T-19 | 미발행 상품이 작업 큐(처분·부활소)에 노출 | 실패 | §6 발행 전용 |
| T-20 | 배지=단절인데 주액션이 "등록 완료"/"되살리기" | 실패 | 부활소 모순 재발 방지 |

## 9. 구현 순서 (의존성)

1. **[선행]** `lifecycle.ts` 신설 — 실제 원자 → 9상태 파생 단일함수. 기존 `source-gone.ts`/`sales-assets.ts` 재사용(중복 판정 금지).
2. **[병렬]** 부활소 경계 수정(`draft_incomplete` 제거 + 발행 필터) + 꿀통창고 '이어서 작성' 큐 이식.
3. **[병렬]** `products/page.tsx:878` SubstituteEditor 넛지 → `dispositionVerdict.action !== 'NONE'` 교체.
4. **[후행]** `surfaceRules.ts` 매트릭스 + T-01~T-20 테스트.
5. **[후행]** 전 화면 배지/버튼을 `lifecycle.ts` 반환값 소비로 전환(#295).

> 1이 없으면 2~5가 또 자체판정이 된다. **1을 먼저.**

## 10. 미확정 (운영자 결정 필요)
- `ARCHIVE/RESTORE`(보관함) 도입 여부 — 현재 미구현. 삭제 대신 "숨김"이 필요한가?
- sourceGone 강건성 정책 — 연속N vs 최근M중N vs 연속+스파이크1회 허용(권장 C). 별도 티켓.
