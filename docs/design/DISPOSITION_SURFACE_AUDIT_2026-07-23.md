# 처분(Disposition) 판정 일원화 전면 감사 — 2026-07-23

> 감사·보고만. 코드 미변경. grep 전수조사 + 각 파일 직접 대조.
> 기준: `decideDisposition()`(src/lib/products/disposition.ts) 또는
> `sourceGone`/`loadDispositionVerdicts()`(disposition-load.ts)를 **소비**하는가.
> "소비"란 화면의 액션·필터·강조가 그 판정 결과로 구동됨을 뜻한다. 단순
> 등록상태(연동중/판매중) 표시는 disposition과 다른 개념이므로 별도 표기.

## 1. 판정 소비 채널 (기존 7채널 + 확장 대상)

| # | Surface | 파일:라인 | 판정 소스 | 상태 |
|---|---|---|---|---|
| 1 | 처분대기함 `/products/out-of-stock` | [out-of-stock/page.tsx:174](../../src/app/products/out-of-stock/page.tsx) | `decideDisposition()` | ✅ 정상 |
| 2 | 상품목록 배지 `/products` | [products/page.tsx:643](../../src/app/products/page.tsx) | `decideDisposition()` | ✅ 정상 |
| 2b | ↳ 같은 페이지, SubstituteEditor 빨간 강조 넛지 | [products/page.tsx:878](../../src/app/products/page.tsx) | `product.status==='OUT_OF_STOCK'` (자체) | ⚠️ **부분 이탈 (신규 발견)** |
| 3/4 | 대시보드 KPI·할일 (KkottiWidget) | [KkottiWidget.tsx:132](../../src/components/dashboard/KkottiWidget.tsx) | `decideDisposition()` | ✅ 정상 |
| 5 | 헤더 알림 `/api/notifications` | [notifications/route.ts:42](../../src/app/api/notifications/route.ts) | `loadDispositionVerdicts()` | ✅ 정상 |
| 6 | 좀비 부활소 `/products/reactivation` | [reactivation/page.tsx:158](../../src/app/products/reactivation/page.tsx) → [daily-slots.ts:143](../../src/lib/daily-slots.ts) | `getReactivationReason()` 자체 판정 | ❌ **이탈 확정 (전회 실측)** |
| 7 | 발행게이트 모달 | [publish-gate.ts:53](../../src/lib/products/publish-gate.ts) | `inv.sourceGone` 직접 | ✅ 정상 |
| 8 | 디스코드 일일 재고 알림 `cron/daily` | [cron/daily/route.ts:147](../../src/app/api/cron/daily/route.ts) | `loadDispositionVerdicts()` | ✅ 정상 (#293 기수정) |
| 9 | 주간 리포트 `/api/weekly-report` | [weekly-report/route.ts:38](../../src/app/api/weekly-report/route.ts) | `loadDispositionVerdicts()` | ✅ 정상 (#294 기수정) |

## 2. 신규 발견 — 숨은 이탈 surface

### 2b. `SubstituteEditor` 재고0 빨간 강조 (products/page.tsx:878)

```ts
<SubstituteEditor productId={product.id} isOutOfStock={product.status === 'OUT_OF_STOCK'} />
```

같은 파일 상단(643행)에서는 `decideDisposition()`을 정확히 쓰면서, 878행의
"기회손실 최소화 넛지"(대체상품 입력을 재촉하는 빨간 강조, #256 P4-5)는
`product.status` 원본 필드를 직접 비교한다. `sourceGone=true`인데 앱
`status`가 아직 `ACTIVE`로 남아있는 상품(= 정확히 disposition.ts가
"가장 급한 처분 대상"이라 부르는 케이스, #290 주석)은 이 넛지가 뜨지 않는다
— 대체상품을 가장 먼저 입력해야 할 상품에서 오히려 강조가 빠지는 역설.

영향은 배지(2번, 정상 표시됨) 대비 상대적으로 작다 — 판정 자체가 안 보이는 게
아니라 "빨간 테두리 강조" 하나가 빠지는 수준. 그래도 같은 화면 안에서 두
신호원이 공존하는 것 자체가 #62(단일 권위) 취지에 어긋난다.

**권장**: `isOutOfStock` prop을 `dispositionVerdict.action !== 'NONE'`
(이미 643행에서 계산된 값)로 교체. 별도 설계 불필요, 1줄 수정.

### 부수 확인 — 이탈 아님으로 판정한 후보들

| Surface | 파일 | 판정 |
|---|---|---|
| SEO 상품선택 테이블 상태뱃지 | [ProductTable.tsx:142](../../src/components/ProductTable.tsx) | `status` 원본을 그대로 라벨링(판매중/준비중/품절)하는 **범용 상태 태그**일 뿐, "이 상품을 어떻게 할까" 권고를 표방하지 않음 — disposition과 다른 레이어. 다만 sourceGone 상품이 여기선 그냥 "판매중"(status=ACTIVE)으로 보일 수 있어 완전 무해하다고 보긴 어려움 — **저우선 후속 후보로만 기록**(이번 티켓 범위 밖) |
| 관제탑 `/control` (ControlTowerMatrixWidget) | [ControlTowerMatrixWidget.tsx:234](../../src/components/dashboard/ControlTowerMatrixWidget.tsx) | 네이버 등록/판매 라이브 상태(`naverStatusType`)만 표시 — 처분 권고 자체를 아예 렌더하지 않는 화면(자산·발행 준비도 "Operator action queue #56"는 별개 도메인). 잘못된 자체판정이 아니라 "그 판정을 안 보여줌"이라 이탈로 분류하지 않음 |
| `PublishReadinessCard`/허브 배지 등록상태 칩 | [PublishReadinessCard.tsx:141](../../src/components/products/PublishReadinessCard.tsx), [products/page.tsx:251](../../src/app/products/page.tsx) | "미등록/판매중/판매중지" = 네이버 라이브 상태 그대로 노출하는 정보성 배지. 처분 권고("대체소싱/판매중지 처리하세요")를 표방하지 않으므로 개념이 다름 |
| `SubstituteEditor` 후보 상품 리스트의 `naver_status_type` | [SubstituteEditor.tsx:34](../../src/components/products/SubstituteEditor.tsx) | 대체상품 후보 피커에서 후보의 등록상태 보여주는 용도, 판정 아님 |
| `mark-oos` 액션 라우트 | [alerts/[id]/mark-oos/route.ts](../../src/app/api/alerts/%5Bid%5D/mark-oos/route.ts) | 판정을 "읽는" 화면이 아니라 운영자가 이미 내린 결정을 앱/네이버에 "쓰는" 액션 엔드포인트 — 판정 채널 범주 자체가 아님 |
| `cron/weekly` (공급가 드리프트) | [cron/weekly/route.ts](../../src/app/api/cron/weekly/route.ts) | 도매꾹 공급가 재확인 리포트 — 처분/재고 판정과 무관한 별개 기능 |

## 3. 결론

- **확정 이탈**: `/products/reactivation` (getReactivationReason, daily-slots.ts) — 전회 세션 실측 확증 완료, 별도 Cowork 설계 확정 후 코드 수정 착수 예정(이번 티켓 범위 아님).
- **신규 부분 이탈**: `/products` 페이지 내 `SubstituteEditor` 빨간 강조 넛지(878행) — 판정 자체는 같은 파일에 이미 계산돼 있으므로 수정 범위 극소(1줄 교체). 별도 설계 불필요, 구현 승인만 있으면 즉시 처리 가능.
- **저우선 관찰**: `ProductTable.tsx` SEO 도구 상태뱃지 — disposition과 다른 레이어(범용 status 라벨)라 이탈로 단정하지 않되, sourceGone 상품이 "판매중"으로 보일 여지가 있어 후속 검토 후보로만 남김.
- 나머지 모든 확인 대상은 중앙 판정(`decideDisposition`/`loadDispositionVerdicts`/`sourceGone`)을 정상 소비하거나, 애초에 처분 권고를 표방하지 않는 별개 개념(등록상태 표시)이었다.
