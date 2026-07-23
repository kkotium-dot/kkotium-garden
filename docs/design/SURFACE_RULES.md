# SURFACE_RULES (v2 · 2026-07-23)

> **권위 정합**: 실제 메뉴는 `src/lib/i18n/garden-nav.ko.json`(Sidebar 단일 출처)·실제 라우트에 **맞춘다**(코드가 정답).
> 상태/권고는 `LIFECYCLE_STATE_MACHINE.md`(7종)·`COPY_SYSTEM.md`(5액션)를 소비.
> 착수 전 필독: `LIFECYCLE_BRIDGE_V2_2026-07-23.md` · `docs/DOMAIN_FACTS.md` · `COLLABORATION_PLAYBOOK.md`.
>
> **v1 대비 변경**: 추상 Surface → 실제 메뉴 매핑 · T-04/06/07/10 폐기 · T-05 수정(자산 축) · T-16~T-20 신규.

---

## 1. Surface 성격 2종 (#301)

| 성격 | 축 | 규칙 |
|---|---|---|
| **보관함(위치)** | 발행여부 | 미발행=꿀통창고 / 발행=꽃밭돌보기. 모든 상품이 정확히 한 곳에 존재(#296) |
| **작업 큐(조건)** | 조건 충족 | 조건 상품만 수집. 위치와 무관하게 중복 등장 가능. **단 발행 전용** |

**작업 큐가 발행 전용인 근거**: `disposition.ts:129 if (!p.naverProductId) return NONE` — 앱의 확립된 규약(발행 게이트 내장). 미발행 상품이 작업 큐에 나타나면 **경계 위반**.

---

## 2. 실제 메뉴 ↔ 상태/권고 매핑 (garden-nav.ko.json 실측)

| 메뉴(라벨) | 라우트 | 성격 | 노출 조건 | 소비 판정 |
|---|---|---|---|---|
| **꿀통 창고** (정원 창고 탭) | `/products?tab=draft` | 보관함(위치) | `!isPublishedLifecycleState` (미발행) | `deriveLifecycleState` → DRAFT_INCOMPLETE / READY_UNPUBLISHED |
| **꽃밭 돌보기** | `/products` | 보관함(위치) | `isPublishedLifecycleState` (발행) | `deriveLifecycleState` 5발행상태 배지 |
| **처분 결정 대기함** | `/products/out-of-stock` | 작업 큐(조건) | 발행 + `hasDisposition(verdict)` | `decideDisposition` (5액션) |
| **좀비 부활소** | `/products/reactivation` | 작업 큐(조건) | 발행 + 부활 조건 | `decideDisposition` + 부활 판정 |
| **대시보드 할일** (정원 일지) | `/dashboard` | 작업 큐(조건) | 발행 + 할일 조건 | `loadDispositionVerdicts` 카운트 |
| **알림** (앱 종 · 디스코드 · 주간) | `/api/notifications` 등 | 작업 큐(조건) | 발행 + 처분 필요 | `decideDisposition` (status 직접비교 금지 #294) |
| **발행 게이트** | 등록·수정 경로 | 조건 | `naverProductId` null 여부 | 발행여부 1급 축 |

> 부활소/처분대기함/대시보드 할일은 사이드바 최상위가 아니라 **대시보드 위젯 + 전용 라우트**로 존재. 사이드바 상품 그룹 = 꿀통창고 / 온실아틀리에 / 꽃밭돌보기.

---

## 3. ★ 부활소 경계 위반 수정 (확정 조치)

`daily-slots.ts:162` `draft_incomplete`("등록 미완료 — 네이버 업로드 대기 중")는 **미발행 상품**을 부활소(작업 큐)에 끌어들인다 = §1 발행 전용 규약 위반. 부활소=좀비 부활은 "발행됐는데 안 팔리는 것"을 되살리는 곳이며, 미발행 상품은 살아난 적이 없다.

- **조치**: `draft_incomplete` 분기 제거 + 호출부(`reactivation/page.tsx:152`)에 `!!p.naverProductId` 필터.
- **누락 방지(#56)**: 제거로 사라지는 "등록 미완료 N건"은 **꿀통창고(정원 창고)에 '이어서 작성' 큐**로 이전. 큐에서 뺀 항목은 갈 곳을 반드시 만든다(#301).

---

## 4. 액션 목록 (실제 앱 · v1 11종에서 정정)

| 액션 | 실재 | 비고 |
|---|---|---|
| `EDIT` | O | 씨앗심기 이동 |
| `PUBLISH` | O | 발행(#46 GO) |
| `SUSPEND` | O | 판매중지 PUT(#46 GO) |
| **`MARK_OUT_OF_STOCK`** | O | 품절 처리 (신규 반영) |
| **`RESOURCE`** | O | 대체소싱 지정 SubstituteEditor (신규 반영) |
| `DELETE` (DELETE_SAFE) | O | deleteProduct 단일함수(3경로 공통) |
| `DUPLICATE` | O | 부활소 "새 생명 부여" |
| `RESUME` / `UNPUBLISH` | 부분 | |
| ~~`RESTOCK`~~ | **X 제거** | 드롭십 — 셀러 재고 못 채움 → RESOURCE로 대체 |
| ~~`EXTEND_PERIOD`~~ | **X 제거** | 기간판매 미사용 |
| ~~`ARCHIVE` / `RESTORE`~~ | **X 제거** | 미구현 개념 |

---

## 5. 금지조합 테스트 (v2)

### 유지
| ID | 검사 |
|---|---|
| T-08 | 표 ↔ 상수 동기화 (상태·액션 목록이 코드 enum과 일치) |
| T-11 | 주 액션 유일성 (한 상품에 주 버튼 1개) |
| T-12 | total function (7상태 전부 커버, 미분류 없음) |
| T-13 | 카피 키 정합 (disposition.strings.ko.json 키 ↔ DispositionAction) |

### 폐기 (해당 개념 미구현)
| ID | 폐기 사유 |
|---|---|
| T-04 | EXTEND_PERIOD — 기간판매 미사용 |
| T-06 | ARCHIVED 계열 — 미구현 |
| T-07 | ARCHIVED 계열 — 미구현 |
| T-10 | ARCHIVED 계열 — 미구현 |

### 수정
| ID | v1 | v2 |
|---|---|---|
| T-05 | "발행 트랙 DELETE 전면 금지" | **"`hasSalesAssets=true`면 DELETE 금지"** (자산 축 반영. `SOURCE_GONE_DELETABLE`은 DELETE 허용) |

### 신규
| ID | 금지조합 | 기대 | 근거 |
|---|---|---|---|
| T-16 | sourceGone인데 `OUT_OF_STOCK` 파생 | 실패 | 단절 > 품절 우선순위 §3(SM) |
| T-17 | sourceGone + SUSPENSION인데 `SUSPENDED` 파생 | 실패 → SOURCE_GONE_* | 단절 > 중지 |
| T-18 | `SOURCE_GONE_RESOURCE` + `DELETE` | HIDDEN | 자산 보호(rev66) |
| T-19 | 미발행 상품이 작업 큐(처분·부활소·대시보드 할일)에 노출 | 실패 | §1 발행 전용 |
| T-20 | 배지=공급처 단절인데 주액션이 "등록 완료"/"되살리기" | 실패 | 부활소 모순 재발 방지(#295) |

---

## 6. 화면 판정 규칙 (#295 재확인)
- 모든 화면은 `deriveLifecycleState()`(배지·필터·카운트) 또는 `decideDisposition()`(주 액션·큐·알림) 반환값만 소비.
- 화면이 `status`/`naver_status_type`을 직접 해석하면 이탈(2026-07-23 부활소·알림 실측 결함 #294/#295).
- 배지가 중앙신호를 써도 **필터/카운트/액션 노출조건이 자체판정이면 이탈**.

---

## 7. 구현 순서 (브리지 §9 정합)
1. **[완료]** `lifecycle.ts` 신설 — 이미 구현됨(이 문서가 그에 맞춤).
2. **[다음]** 부활소 경계 수정(§3) + 꿀통창고 '이어서 작성' 큐 이식.
3. `products/page.tsx:878` SubstituteEditor 넛지 → `dispositionVerdict.action !== 'NONE'` 교체.
4. `surfaceRules.ts` 매트릭스 + T-08/11/12/13 + T-16~T-20 테스트.
5. 전 화면 배지/버튼을 판정함수 반환값 소비로 전환(#295).
