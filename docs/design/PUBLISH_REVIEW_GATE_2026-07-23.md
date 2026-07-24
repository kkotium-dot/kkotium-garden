# PUBLISH_REVIEW_GATE — 발행 검수 게이트 설계 (v2 · 경로 게이트)

> 상태: 시점(2026-07-23) · **v2 (v1 "화면 연결" → v2 "경로 게이트"로 전면 재작성 · 2026-07-24 P0 경로 추가)**
> 한 줄 요약 — 최초 발행 4경로(P0~P3)를 서버 진입점에서 강제 검수하는 설계. 착수 전 필독.
> **권위 정합**: 아래 경로·라인은 실제 코드 실측(추측 아님). 판정 근거: 원칙 #311(게이트는 화면 아닌 경로에).
> 필독: `docs/PRODUCT_LIFECYCLE_FLOW.md` · `docs/DOMAIN_FACTS.md` · `docs/plan/COLLABORATION_PLAYBOOK.md`.

---

## 0. v1이 틀린 이유 (전제 붕괴)

v1은 "일괄 발행 UI에 검수 통과 조건을 추가"로 설계했다. 그러나 Desktop 실측 확증:

> **검수 화면은 최초 발행 경로에 아예 없다.** 검수화면 `/products/[id]/preview`의 발행 버튼은 **재발행(`/update`) 전용**이고 미등록 상품엔 409를 던진다(#311). "경고 0건 계산"과 "실제 발행 실행"은 **분리된 두 경로**였다.

따라서 게이트를 UI에 붙이면 우회 경로로 다 새어나간다. **게이트는 서버 진입점(API route)에 건다.**

---

## ① 발행에 도달하는 모든 경로 (실측 전수 열거)

**"발행" = 네이버에 최초 등록(POST `/v2/products`)** = `naverProductId`를 최초 부여하는 행위.

| # | 경로 | 진입점 | 최초발행 실행 | 현재 게이트 | 파일·라인 |
|---|---|---|---|---|---|
| **P0** | **신규 등록 폼** (v1 누락 · Code 조사 발견) | `POST /api/naver/products` → `toNaverPayload` → `registerProduct` | ✅ POST /v2/products | **없음**. DB필드 존재 검사만(카테고리·대표이미지). readiness·검수 0 | naver/products/route.ts:59-80 |
| P1 | **단건 UI** (NaverRegisterModal) | products/page.tsx:1223 → `POST /api/naver/products/register` | ✅ POST /v2/products | readiness만(:158). 검수 없음. `checkPublishGate`는 재고만(:1247) | page.tsx:1276 · register:426 |
| P2 | **일괄 UI** (batch) | `POST /api/products/batch-register` | ✅ POST /v2/products (:140) | **없음**(productIds만) | batch-register:20-140 |
| P3 | **API 직접/레거시** | `POST /api/naver/register` | ✅ POST /v2/products (:175) | **없음**(payload 직행) | naver/register:76-175 |
| P4 | 재발행 | `POST /api/naver/products/update` → PUT origin-products | ❌ 최초 아님(재발행) | canPublish는 preview UI에만 | update:231 |
| P5 | 크론 | `cron/daily` → PUT origin-products (statusType만) | ❌ 최초 아님(상태/재고) | — | cron/daily:95 |

**비경로(오인 주의)**: `crawl/batch-register` = DRAFT **저장만**(naverRequest 0). 발행 아님.

### 결론
- **최초 발행 경로는 P0·P1·P2·P3 네 개.** 이 중 P0·P2·P3는 readiness조차 없다(P0은 v1에서 누락됐던 4번째 경로 — Code 조사 발견).
- **검수(canPublish) 게이트는 네 경로 어디에도 없다.** preview 화면(안내용 UI)에만 계산이 존재.
- ⇒ 화면에 무엇을 붙이든 P0·P2·P3로 우회 발행 가능. **P0·P1·P2·P3 네 진입점에 공통 서버 게이트가 필요.**

---

## ② 서버 진입점 공통 게이트 함수 설계 (#311-3 · #295 연장)

네 경로가 **같은 함수 하나**를 호출한다. UI 게이트는 안내용, 이 서버 함수가 강제용.

### 시그니처 (PURE 판정 + 로더 분리)
```ts
// src/lib/products/publish-gate.ts  (신설 — 판정은 PURE)
export type PublishBlockReason =
  | 'READINESS_INCOMPLETE'   // 필수 항목 미충족 (calcUploadReadiness < 100)
  | 'IMAGE_WARNING'          // 대표/상세 하드블록 경고 잔존
  | 'NOT_REVIEWED'           // 운영자 검수 미승인 (reviewChecklist.approved != true)
  | 'REVIEW_STALE';          // 승인 후 상품 수정됨 (reviewLastUpdated < updatedAt)

export interface PublishGateVerdict {
  canPublish: boolean;
  reasons: PublishBlockReason[];   // 비어있으면 통과
}

// 원자만 받는 PURE 함수 (테스트·클라이언트 재사용)
export function decidePublishGate(input: PublishGateInput): PublishGateVerdict;

// 서버 진입점이 호출하는 강제 게이트 (throw 아님, 구조적 반환)
export async function assertPublishable(productId: string): Promise<PublishGateVerdict>;
```

### 판정 규칙 (기존 함수 재사용 · 재발명 금지 #62)
```
canPublish =
      calcUploadReadiness == 100        (기존 upload-readiness.ts 재사용)
  AND blockingImageWarnings == 0        (기존 publish-preview 로직 재사용)
  AND reviewChecklist.approved == true  (대안 D · ④ 참조)
  AND reviewLastUpdated >= updatedAt     (승인 신선도 · 수정 시 만료)
```

### 네 경로에 배선 (강제 지점)
| 경로 | 삽입 위치 | 실패 시 |
|---|---|---|
| P0 naver/products | POST 핸들러 진입 직후, `toNaverPayload`/`registerProduct` **전**(route.ts:78 앞) | 409 + `reasons[]` 반환. 발행 중단 |
| P1 register | POST 핸들러 진입 직후, `buildNaverProductPayload` **전** | 409 + `reasons[]` 반환. 발행 중단 |
| P2 batch-register | 각 productId 루프 안, `naverRequest` **전** | 해당 건 `status:'skipped'` + reason. 나머지 진행 |
| P3 naver/register | POST 핸들러 진입 직후 | 409 + `reasons[]` |

> **P0 주의**: 현재 P0은 카테고리·대표이미지 존재만 검사(route.ts:71-76)하고 발행한다. 이 검사는 게이트 이전 단계일 뿐 검수가 아니다 — `assertPublishable`을 그 뒤·`registerProduct` 앞에 추가한다.

> **원칙(#311-2)**: UI는 안내(발행 버튼 비활성·사유표시), 서버는 강제(게이트 통과 못 하면 `naverRequest` 도달 불가). 둘 다 같은 `decidePublishGate` 결과를 소비 → 화면·서버 판정 불일치 0(#295).

### best-effort 예외 (#82)
`assertPublishable`이 DB 문제로 검수 상태를 못 읽으면 → **fail-closed**(발행 차단). 게이트는 조회 실패 시 "통과"가 아니라 "차단"으로 degrade해야 우회가 안 생긴다(권고 판정의 fail-open과 반대).

---

## ③ 검수 미통과 시 안내 UX (3초룰 · 발행 재촉 금지 #307)

### 경로별 안내
| 경로 | 미통과 시 표시 |
|---|---|
| P1 단건 모달 | 발행 버튼 비활성 + 사유칩(아래) + "검수하러 가기"(→ preview) |
| P2 일괄 모달 | 3영역 분리: **검수 끝난 N건**(발행 가능) / **검수 대기 M건**(→검수) / **준비 미완 K건**(→씨앗심기). 미통과분 숨김 금지(#56) |
| P3 API 직접 | 409 JSON `{ canPublish:false, reasons:[...] }` — 호출자가 사유 파싱 |

### 사유칩 문구 (reason → 한글 · #262)
| reason | 칩 | 안내 |
|---|---|---|
| READINESS_INCOMPLETE | 준비 미완 | 아직 빠진 항목이 있어요 — 씨앗심기에서 채워요 |
| IMAGE_WARNING | 대표컷 확인 | 대표/상세 이미지에 손볼 곳이 있어요 |
| NOT_REVIEWED | 검수 대기 | 준비는 끝났어요. 눈으로 한 번 확인하고 올려요 |
| REVIEW_STALE | 재검수 필요 | 검수 후 상품이 바뀌었어요 — 다시 한 번 확인해요 |

- **금지**: "발행 가능 N건 — 발행하러 가기" / 발행 카운트다운 / 발행 강조.
- 주 액션은 항상 미완 단계로 유도(검수 or 씨앗심기), 발행이 아니다.

---

## ④ reviewChecklist JSON 스키마 확정안 (대안 D)

> **기존 필드 재사용(COLLABORATION_PLAYBOOK #1 · DB 신설 0)**: `Product.reviewChecklist Json` + `reviewLastUpdated DateTime`가 **이미 존재**(schema.prisma:442-444, E-2A). 신설 없이 검수 상태를 담는다.

### 대안 비교 요약 (v1 유지 + 경로 관점 보강)
| 대안 | 방법 | 판정 | 결론 |
|---|---|---|---|
| A 방문기록 | preview 열면 자동 | 열기만 해도 통과 → 우회 | ✗ |
| B 명시 버튼 | 운영자 "검수 완료" 클릭 | 사람 판단=검수 본질 | 채택 |
| C 경고0 자동 | canPublish로 자동 | 체크섬을 검수로 오독(#307 위반) | 전제조건으로만 |
| **D = B + 기존필드** | 명시 버튼 + reviewChecklist 기록 | B견고 + 신설0 | **★권장** |

### JSON 스키마
```jsonc
// Product.reviewChecklist (기존 Json 컬럼)
{
  "approved": true,                    // 운영자 명시 승인 (B)
  "approvedAt": "2026-07-23T12:00:00Z",// 승인 시각 (신선도 판정용)
  "gateSnapshot": {                    // 승인 순간의 자동 게이트 스냅샷 (C = 전제조건)
    "readiness": 100,
    "imageWarnings": 0
  },
  "note": ""                           // 선택 — 운영자 메모
}
```
- `reviewLastUpdated`(기존 컬럼)에 `approvedAt`과 동일 시각 기록 → **신선도 판정**은 `reviewLastUpdated >= Product.updatedAt`으로.
- 승인은 **`canPublish(readiness100 && imageWarning0)===true`일 때만 버튼 활성** → C를 필요조건, B를 충분조건으로 이층화.
- 상품 수정 시 `updatedAt`이 갱신되면 `reviewLastUpdated < updatedAt` → `REVIEW_STALE` → 재검수 유도. "승인 후 몰래 수정 발행" 차단.

### 미확정 (운영자 결정)
- `updatedAt` 갱신이 **검수 무관 필드 수정**(예: 재고 스냅샷 연관)에도 튀면 과민 만료. → 신선도 기준을 `updatedAt` 전체로 볼지, 검수 관련 필드 화이트리스트로 볼지 결정 필요.
- `approvedBy`는 1인 운영이라 생략(다중 셀러 미사용, DOMAIN_FACTS §2).

---

## 요약 — 권장 결정
| 항목 | 권장 |
|---|---|
| ① 경로 | 최초발행 P0·P1·P2·P3 네 개. P0·P2·P3는 readiness조차 없음(P0=v1 누락분). crawl/batch는 발행 아님 |
| ② 공통 게이트 | `decidePublishGate`(PURE) + `assertPublishable`(서버). P0·P1·P2·P3가 `naverRequest`/`registerProduct` 전 호출. fail-closed |
| ③ 안내 | reason별 사유칩 + "검수/씨앗심기로". 발행 재촉 금지 |
| ④ 스키마 | 대안 D. 기존 `reviewChecklist`/`reviewLastUpdated` 재사용, DB 신설 0. 수정 시 승인 만료 |

## 완료 정의 (#311-4)
"화면 만들었다"가 아니라 **우회 경로 0건 확인**이 완료. P0·P1·P2·P3 네 진입점이 모두 `assertPublishable`를 통과해야 `naverRequest`/`registerProduct`에 도달함을 테스트로 증명(게이트 우회 시 발행 실패).
