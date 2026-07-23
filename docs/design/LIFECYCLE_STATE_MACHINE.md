# LIFECYCLE_STATE_MACHINE (v2 · 2026-07-23)

> **권위 정합**: 이 문서는 구현 `src/lib/products/lifecycle.ts`에 **맞춘다**(코드가 정답).
> 갭 해소 근거: `docs/design/LIFECYCLE_BRIDGE_V2_2026-07-23.md` + Supabase information_schema 실측.
> 착수 전 필독: 위 브리지 · `docs/DOMAIN_FACTS.md` · `docs/plan/COLLABORATION_PLAYBOOK.md`.
>
> **v1 대비 변경**: 상태 7종 확정(v1의 "9종" 표현 폐기 — lifecycle.ts 실제 표는 7행) · 기간판매 상태(PERIOD_ENDED)·보관함 상태(ARCHIVED) 폐기 · 공급처 단절 2종(SOURCE_GONE_RESOURCE/DELETE_SAFE) 신설.

---

## 0. 이 문서가 지배하는 축 (단 하나)

`deriveLifecycleState()`는 **상태 축(진단: "지금 무엇인가")만** 소유한다.
**권고 축(처방: "아직 안 한 일")은 `disposition.ts`가 소유**한다 — 이 문서에 섞지 않는다(#300 축 분리).
- 상태 → 배지·필터·카운트
- 권고 → 주 액션 버튼·처분 대기함·알림 (→ `COPY_SYSTEM.md` / `SURFACE_RULES.md`)

---

## 1. 원자 필드 (실재하는 것만 · 그 외 가정 금지)

`Product`에 존재하지 않는 필드를 쓰지 않는다. `deriveLifecycleState()`의 실제 입력(`LifecycleInput`)은 다음뿐이다.

| 원자 | 출처 | 타입 | 의미 |
|---|---|---|---|
| `naverProductId` | Product | `string \| null` | **발행여부 1급 축**. non-null = 네이버 발행됨 |
| `status` | Product | `string \| null` | DRAFT / ACTIVE / OUT_OF_STOCK / INACTIVE |
| `naver_status_type` | Product | `string \| null` | SALE / SUSPENSION / OUTOFSTOCK / null (입력명 `naverStatusType`) |
| `inventory_snapshots.qty` | 별도 테이블 | `number` | 재고. **Product에 stock 컬럼 없음**(schema.prisma 실측). 음수 = 조회 실패 센티널(#260) |
| `salesCount` | Product | `number \| null` | 판매 자산 판정 입력 |
| `lastSaleDate` | Product | `Date \| null` | 판매 자산 판정 입력 |

**파생 입력**(원자에서 계산해 넘긴다 — 이 함수는 prisma를 만지지 않는다):
- `consecutiveNegatives` = `countLeadingNegatives()` (source-gone.ts) — 선두 연속 qty<0
- `hasSalesAssets` = `hasSalesAssets({salesCount, lastSaleDate})` (sales-assets.ts) — salesCount>0 **또는** lastSaleDate 존재
- `daysOutOfStock` = `countLeadingOutOfStockDays()` — **상태 파생에는 미사용**. 권고(disposition)와 원자 묶음을 공유하려고 같이 실려 온다

> ❌ 폐기된 가정 원자: `isPublished` / `isArchived` / `isSuspended` / `saleStartAt` / `saleEndAt` / `requiredFieldsComplete` / `stock` — **실재 0개**(information_schema 확인).

---

## 2. 상태 7종 (lifecycle.ts:21-28과 1:1)

### 미발행 트랙 — `naverProductId === null`
| 상태 | 조건 |
|---|---|
| `DRAFT_INCOMPLETE` | `status === 'DRAFT'` (작성 중·필수정보 미충족) |
| `READY_UNPUBLISHED` | 그 외 미발행 (필수정보 충족·발행 대기) |

### 발행 트랙 — `naverProductId !== null`
| 상태 | 조건 | 비고 |
|---|---|---|
| `SOURCE_GONE_RESOURCE` | sourceGone **+** hasSalesAssets | 신설. 삭제 금지·대체소싱 |
| `SOURCE_GONE_DELETABLE` | sourceGone **+** !hasSalesAssets | 신설. 정리 안전 |
| `SUSPENDED` | `naverStatusType === 'SUSPENSION'` | |
| `OUT_OF_STOCK` | `status === 'OUT_OF_STOCK'` | |
| `ON_SALE` | 그 외 | 정상 |

> `sourceGone` = `isSourceGoneFromCount(consecutiveNegatives)` = `consecutiveNegatives >= 3` (`SOURCE_GONE_MIN_CONSECUTIVE=3`, source-gone.ts:22).

---

## 3. 파생 우선순위 (순서 = 우선순위 · 변경 금지)

lifecycle.ts:66-80 그대로:

```
[0] 발행 게이트  : naverProductId == null
                    → status=='DRAFT' ? DRAFT_INCOMPLETE : READY_UNPUBLISHED
[1] 공급처 단절  : isSourceGoneFromCount(consecutiveNegatives)  (>=3)
                    → hasSalesAssets ? SOURCE_GONE_RESOURCE : SOURCE_GONE_DELETABLE
[2] 판매중지     : naverStatusType == 'SUSPENSION'  → SUSPENDED
[3] 품절         : status == 'OUT_OF_STOCK'         → OUT_OF_STOCK
[4] 그 외        →                                   ON_SALE
```

**우선순위 정렬 순서 = 발행게이트 → sourceGone → SUSPENDED → OUT_OF_STOCK → ON_SALE.**

**[1]이 [2]보다 앞선 이유**: 판매중지는 "노출을 멈춤"일 뿐 공급 문제를 해결하지 않는다. 명화 케이스(SUSPENSION + 단절)에서 "중지됨"만 보이면 **대체소싱이라는 남은 일이 숨는다**. 단절은 상품 자체의 처분 질문이므로 상위.

---

## 4. 파생 단일함수 시그니처 (구현과 동일)

```ts
export type LifecycleState =
  | 'DRAFT_INCOMPLETE' | 'READY_UNPUBLISHED'
  | 'SOURCE_GONE_RESOURCE' | 'SOURCE_GONE_DELETABLE'
  | 'SUSPENDED' | 'OUT_OF_STOCK' | 'ON_SALE';

export function deriveLifecycleState(p: LifecycleInput): LifecycleState;
export function isPublishedLifecycleState(state: LifecycleState): boolean;
// isPublished = state !== 'DRAFT_INCOMPLETE' && state !== 'READY_UNPUBLISHED'
```

**규칙(#295)**: 모든 상품 노출 화면은 `deriveLifecycleState()`(상태) 또는 `decideDisposition()`(권고)의 반환값만 소비한다. 화면이 `status`/`naver_status_type`을 직접 해석해 자체 분류하면 화면마다 판정이 갈라진다. 배지가 중앙신호를 써도 그 화면의 **필터/카운트/액션 노출조건이 자체판정이면 이탈**이다.

---

## 5. 상태 → 발행 트랙 매핑 (Surface 소비용)

| 상태 | 트랙 | `isPublishedLifecycleState` |
|---|---|---|
| DRAFT_INCOMPLETE | 미발행 | false |
| READY_UNPUBLISHED | 미발행 | false |
| SOURCE_GONE_RESOURCE / DELETABLE / SUSPENDED / OUT_OF_STOCK / ON_SALE | 발행 | true |

작업 큐(처분·부활소·대시보드 할일)는 **발행 트랙 전용**(`disposition.ts:129 !naverProductId → NONE`이 이미 발행 게이트 내장). → `SURFACE_RULES.md §2`.

---

## 6. 폐기 목록 (v1에서 제거)

| 개념 | 폐기 사유 |
|---|---|
| 상태 "9종" 표현 | lifecycle.ts 실제 표 = 7행. 표현 오류였음 |
| `PERIOD_ENDED` | 기간판매 미사용(드롭십, saleStartAt/saleEndAt 부재) |
| `ARCHIVED` / RESTORE 상태 | 보관함 미구현. 운영자 미결정(브리지 §10) |
| 원자 7필드(isPublished 등) | 실재 0개 |

---

## 7. 미확정 (운영자 결정 필요 · 브리지 §10)
- `ARCHIVE/RESTORE`(숨김) 도입 여부 — 현재 미구현.
- sourceGone 강건성 정책 — 연속N vs 최근M중N vs 연속+스파이크1회 허용(#297 · SOURCE_GONE_ROBUSTNESS_TICKET). 별도 티켓.
