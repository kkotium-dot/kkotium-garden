# PRODUCT-LINK PL-5a — 연동 상품 drift 자동 감지·표면화 (2026-07-08)

Authoring: DESKTOP. 구현=Code. 권위: 본 문서 + PRODUCT_LINK_...RESEARCH(§4 SoR) + diffNaverProduct + OPERATOR_SYSTEM_BLUEPRINT(C-9). 원칙 #55/#56/#190/#197/#181.
전제: PL-1(임포트+읽기+diff) DONE. **실측 확인: linked API의 syncState가 정적 "SYNCED" 기본값**(명화는 실제 drift 있음에도) → 무의미. PL-5a = 실제 비교로 전환. **읽기전용·비게이트**(반영 push는 PL-2/3 GO).

================================================================
## 0. 목적
================================================================
연동 상품이 네이버와 어긋났는지(drift)를 **자동 감지해 "동기화 필요" 배지·카운트로 표면화** → 운영자가 매 상품 diff를 수동으로 열 필요 없이 한눈에 파악. PL-1(감지)→PL-2/3(반영)의 다리, PL-5 충돌큐의 읽기전용 토대. "앱에 개입점 자연스럽게 녹임"(#56).

================================================================
## 1. drift 판정 로직 (필드별 SoR·#197)
================================================================
diffNaverProduct 재사용. 앱값 vs 네이버값 비교 후:
- **drift로 카운트**: name · salePrice · detailContent · 옵션구조 · representativeImageUrl (앱 소유 SoR — 앱값이 네이버 미반영 = push 후보).
- **statusType**: SHARED → 다르면 "확인 필요"로 별도 표기.
- **제외(절대 drift 아님)**: stock/optionStock = 네이버 SoR(실주문 차감·#197). 재고 차이는 정상.
- 결과: 상품별 `{ inSync:boolean, driftFields:string[], statusMismatch:boolean }`.

================================================================
## 2. 구현
================================================================
1. **GET `/api/products/linked/drift-scan`** (on-demand·네이버 GET/상품): LINKED 전 상품 diffNaverProduct → 상품별 drift 결과 + 요약 카운트. Rate limit 고려 Queue·순차. 결과를 `syncState`(SYNCED|DRIFT) + `driftFields`(신규 jsonb, additive) + `lastSyncedAt`=now 로 **persist**(다음 로드 시 재조회 불필요). 60초 쿨다운.
   - ★스키마: `driftFields jsonb` 추가 = Desktop이 Supabase ALTER 선행(additive·가드) → Code 동기화(PL-1 패턴 #181).
2. **linked API**: 저장된 syncState/driftFields/lastSyncedAt 반환(정적 기본값 → 실제 상태).
3. **C-9 개입점(#190)**: `sync_drift` intervention type 추가 → 관제탑 Operator Action Queue에 "동기화 필요 N건"(idle-gated·product-agnostic·detail_assembly 패턴 미러). 신규 큐 UI 없음.

================================================================
## 3. UI (/products/link·SaaS급)
================================================================
- 존2 리스트 각 행: **sync 배지** — 동기화됨(중립/초록) / **동기화 필요(주황·N필드)** / 확인필요(상태불일치). lastSyncedAt 상대시각.
- 존2 상단: "동기화 필요 N건" 요약 + **[동기화 상태 새로고침]** 버튼(drift-scan 실행·로딩).
- 행 클릭 → 기존 diff 패널(PL-1 존3)에 drift 필드 표시. 반영 버튼(PL-2 상태/PL-3 가격)은 GO 게이트.
- 이모지0·Lucide·한글 i18n(#3-1).

================================================================
## 4. 안전·검증
================================================================
- 읽기전용(네이버 GET만)·비게이트. 반영(push)은 PL-2/3 GO.
- 재고는 drift 제외(#197) — 실판매 차감을 "어긋남"으로 오인 금지.
- 검증(Desktop prod): 명화 drift-scan → **name·representativeImageUrl drift 감지**(가격은 방금 정합돼 in-sync) → "동기화 필요 2필드" 배지 + C-9 카운트. price 정합 후라 salePrice 미포함 확인. 새로고침 동작·persist 확인.

================================================================
## 작업 유의사항/원칙 (신규)
================================================================
- **#209** 연동 상태 표시는 **정적 기본값 금지·실제 비교 반영** — syncState 같은 필드가 항상 "SYNCED"면 의미 없음. drift는 실측(diff)으로 판정하고 재고(네이버 SoR)는 제외.
- drift 감지는 개입점(C-9)에 자연 편입(#56/#190) — 신규 큐 없이 기존 관제탑에.
