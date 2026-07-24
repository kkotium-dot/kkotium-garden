# Track B G7 turn 인계 패키지 (2026-05-28 Desktop)

> 본 파일은 Desktop turn 산출물 모음. Code 작업 지시문 + 다음 Desktop 채팅 진입 메시지 + plan MD 갱신 명세.
> Desktop은 신규 핸드오프(HANDOFF_g7_sku_empty_unique_2026-05-28.md)만 직접 저장. 대형 plan 파일은 한글 sentinel grep 검증 필요로 Code 위임.

---

## A. 이번 turn 결산 (Desktop, baseline e1c6fd6, 코드 변경 0)

| 게이트 | 결과 | 근거 (production 실측) |
|---|---|---|
| G2 d3 재검증 | **PASS [CLOSED]** | suggest d3="" 정규화(usedAI:true 재계산) + 화면 d1/d2 자동입력(생활/건강>주방용품) + partial 배너 + invalid_triple 소멸 + 소분류 수동선택->카테고리코드 50005257 chip + 준비도 38->52% |
| G7 88필드->DRAFT | **FAIL 신규 회귀 (P0)** | POST /api/products 500 = Unique constraint failed on (sku). 빈 문자열 sku 충돌(명화송풍구 sku="" 1건 점유) -> SKU 미입력 상품 2번째부터 저장 100% 실패. POST /api/naver/excel는 200(엑셀 엔진 정상) |

비가역 0: 네이버 실발행 0 / DB 변경 0(probe 저장도 500 실패) / 카테고리 수동선택은 검증용. SD-01 아랍어 footer 무접촉.

stale 정정: PROGRESS "8개 DRAFT" -> 실제 production 2건(명화송풍구 + 달항아리). 달항아리 naverCategoryCode=11_08_22_00_00(도매꾹 형식) + category=uncategorized = G2 fix 이전 오염(B-3 보정 대기).

---

## B. Claude Code 작업 지시문 (Code 새 세션에 붙여넣기)

```
꽃틔움 가든 Code. Track B G7 SKU unique fix turn.
[STEP 0] CLAUDE.md 4-step + docs/handoff/HANDOFF_g7_sku_empty_unique_2026-05-28.md 정독.
[베이스라인] HEAD e1c6fd6 (origin/main, Vercel READY).
[배경] Desktop이 e1c6fd6 production 실측으로 G2 d3 재검증 통과([CLOSED]) 후
  G7 정주행 중 POST /api/products 500 = Unique constraint failed on (sku) 격리.
  빈 문자열 sku 충돌(기존 명화송풍구 sku="" 1건 점유) -> SKU 미입력 상품 2번째부터 저장 100% 실패 (P0).
[대표 결정] Fix A = SKU 자동생성 방식 확정 (null 허용 아님).

[작업]
1. Fix A: src/app/api/products/route.ts POST 핸들러 line 248
   sku: String(data.sku || '') -> 빈 SKU는 generate-sku 엔진으로 자동발급.
   generate-sku 규칙({PLATFORM}-{ABBR}-{번호}) 재사용 + 생성 후 DB 중복체크 + 충돌 시 suffix 증분.
   supplierId/productNo 미존재 시 fallback(예: KKT-{timestamp}).
2. Fix B: 명화송풍구(cmpnooli40001f0gveaxr8iim) sku="" -> 자동생성값 backfill
   (Code가 SQL 준비 -> Desktop이 Supabase MCP UPDATE, 또는 Code 마이그레이션).
3. Fix C(점검): POST create payload가 sellerCode/options/optionValues/hasOptions/
   tags/keywords/targetKeywords/배송 필드(shippingType/returnShippingFee/shipping_template_id) 누락
   -> G7 "88필드 완전 영속화" 위해 PUT 수준으로 확장 점검 (별도 sub-commit 가능).
4. plan MD 갱신 (Python literal 한글, \uXXXX 금지):
   - docs/handoff/HANDOFF_g2_suggest_d3_mismatch_2026-05-28.md 헤더 상태 ->
     [CLOSED 2026-05-28 Desktop] e1c6fd6 재검증 통과(유령 triple 소멸 + d1/d2 자동입력 + 카테고리코드 50005257)
   - docs/handoff/HANDOFF_g2_category_prefill_skip_2026-05-28.md 헤더 상태 ->
     [CLOSED 2026-05-28 Desktop] silent skip 9415169 해소 + d3 정합 e1c6fd6 해소, G2 전체 통과
   - docs/plan/PROGRESS.md 헤더 prepend (아래 C-1 본문)
   - docs/plan/TASK_BRIDGE.md §3 ACTIVE 교체 (아래 C-2 본문) + §5에 G7-SKU 1줄 추가
   - docs/plan/SESSION_LOG.md Track B G2 d3 [CLOSED] + G7 회귀 entry 추가
   - PROGRESS "8개 DRAFT" stale -> 실제 2건 정정
   삽입 후 sentinel grep 0 (혁섭|쿠드|식타|릴고|헌서|위젝|스칵|쿠두).

[검증] npx tsc --noEmit 0 -> npm run build exit 0 ->
   재현 테스트(SKU 미입력 2건 연속 저장 -> 둘 다 성공, sku non-empty + unique) ->
   sentinel grep 0 -> git commit(.commit-msg.tmp 경유) -> main push ->
   verify-vercel-deploy.sh --wait exit 0.

[절대준수] 한글 주석/리터럴 금지(영어), 이모지 금지(Lucide만), Prisma singleton,
heredoc 금지(#26), 거짓 진행 보고 금지(#46), SD-01 아랍어 footer 영구 보존.

[Code 완료 후] push hash 보고 -> Desktop 새 채팅에서 36904429로 G7 재검증
  -> DRAFT 저장 200 + Supabase 88필드 매핑 확인 -> G8 -> E1~E3 정주행.
```

---

## C. plan MD 갱신 본문 (Code가 그대로 사용)

### C-1. PROGRESS.md 헤더 prepend (최상단 한 줄)

```
> 2026-05-28 **Track B G2 d3 재검증 통과 + G7 SKU unique 회귀 발견** (Desktop turn, 코드 변경 0). G2: e1c6fd6 production 실측 — suggest API 유령 triple(그릇장/컵보드) 소멸(d3="" 정규화, usedAI:true 재계산), 화면 d1/d2 자동입력(생활/건강>주방용품) + partial 배너 + 소분류 수동선택->카테고리코드 50005257 chip + 준비도 38->52%. G2 핸드오프 2건 [CLOSED]. G7: POST /api/products 500 = Unique constraint failed on (sku) — 빈 문자열 sku 충돌(기존 명화송풍구 sku="" 1건 점유) -> SKU 미입력 상품 2번째부터 저장 100% 실패 (P0). 신규 핸드오프 HANDOFF_g7_sku_empty_unique_2026-05-28.md. POST /api/naver/excel는 200(엑셀 생성 엔진 정상). 비가역 0. stale 정정: PROGRESS "8개 DRAFT" -> 실제 production 2건(명화송풍구 + 달항아리). 달항아리 naverCategoryCode=11_08_22_00_00(도매꾹 형식) + category=uncategorized = G2 fix 이전 오염(B-3 보정 대기).
```

### C-2. TASK_BRIDGE.md §3 ACTIVE 교체

```
**Last update**: 2026-05-28 (Desktop turn, 코드 0) — Track B G2 d3 재검증 [CLOSED] 통과(e1c6fd6 실측) + G7 SKU unique 회귀(P0) 신규 격리. 다음: Code가 SKU 빈 값 fix(자동생성 확정) -> Desktop 새 채팅 G7 재검증 -> G8 -> E1~E3.

## ⭐ ACTIVE — 다음 세션 진입점: Code G7 SKU fix -> Desktop G7 재검증 + G8/E1~E3 정주행

| 항목 | 값 |
|---|---|
| **FROM** | 🖥 Desktop (G2 d3 [CLOSED] + G7 SKU 회귀 격리) |
| **TO** | 💻 Code (SKU 빈 값 unique fix, 자동생성 확정) |
| **BASELINE** | e1c6fd6 (origin/main, Vercel READY) |
| **NEXT SCOPE** | (1) HANDOFF_g7_sku_empty_unique Fix A(generate-sku 자동발급) + Fix B(명화송풍구 sku backfill) + Fix C(create payload 88필드 누락 점검). (2) push 후 Desktop 새 채팅이 36904429로 G7 재검증(DRAFT 저장 200 + Supabase 88필드 매핑) -> G8 -> E1~E3 |
| **PENDING** | B-3 달항아리 카테고리 오염 보정 / P20 supplier seller ID / G6 winner3333 배송템플릿 미등록 |
```

### C-3. TASK_BRIDGE.md §5 OPEN PAPER-CUTS 추가 행

```
| **G7-SKU** | **빈 SKU unique 충돌 -> SKU 미입력 상품 2번째부터 저장 500 (P0)** | HANDOFF_g7_sku_empty_unique (Code 처리 대기, 자동생성 fix 확정) |
```

---

## D. 다음 Desktop 채팅 진입 메시지 (Code fix 완료 후 새 채팅에 붙여넣기)

```
꽃틔움 가든 Desktop. Track B G7 재검증 + G8~E3 정주행 turn.
[STEP 0] HANDOFF_g7_sku_empty_unique_2026-05-28.md 정독 ->
PROGRESS.md 헤더 -> TASK_BRIDGE §3 ACTIVE. 브라우저 Browser 1, production.
[베이스라인] Code SKU fix hash (Vercel READY). 검증 대상 = 도매매 36904429.
[선행 단정 — Desktop 직전 turn 완료] G2 d3 재검증 [CLOSED]: 유령 triple 소멸 +
  d1/d2 자동입력 + 카테고리코드 50005257. (G2 핸드오프 2건 CLOSED)
[목표] /crawl 36904429 "등록 시작" -> "네이버 엑셀 다운로드" -> (1) POST /api/products 200
  (DRAFT 저장 성공, SKU 자동생성) (2) Supabase DRAFT row 88필드 매핑 검증
  (naverCategoryCode=50005257 / salePrice=13900 / originCode / options / sku / 배송)
  -> 통과 시 G7 핸드오프 [CLOSED] -> G8(이미지 파이프라인, Sharp 무거운 합성 #26 주의)
  -> E1~E3(엑셀 88칸 시각검증).
[유의] #45 production 실측 / #46 거짓 라벨 금지 / 비가역 0(DRAFT까지만, 네이버 실발행 금지) /
SD-01 아랍어 footer 보존. 단일 저장경로(네이버 직접 등록)는 실발행 트리거 — 누르지 말 것.
[Track A] G2~E3 전수 통과 + 대표 승인 후 명화송풍구 B-12 발행 별도 채팅.
```

---

## E. 작업유의사항 (대표가 늘 강조하시는 사항 — 본 turn 준수 확인)

- **#45 production 실측**: API 200만 믿지 않고 네트워크(POST 500 포착) + DB(Supabase sku 분포) + 코드(route.ts line 248) 3중 교차검증으로 SKU 근본원인 단정.
- **#46 거짓 라벨 금지**: G7을 "통과"로 포장 안 함. 500을 정직히 보고하고 근본원인까지 추적.
- **비가역 0**: 네이버 실발행 0, DB 변경 0(probe 저장도 500 실패로 무변경), 카테고리 수동선택은 검증용(저장 안 함).
- **#29b 한글 MD 안전**: 신규 핸드오프만 write_file(corruption 위험 0). 대형 plan 파일은 sentinel grep 검증 불가로 Code 위임(Desktop은 bash grep 불가 — 정직 보고).
- **SD-01 아랍어 footer**: 조사/수정/언급 0 (화면 존재만 확인, 영구 보존).
- **단일 저장경로 위험 인지**: 현재 앱은 "네이버 직접 등록(실발행)" 외 순수 DRAFT 저장 경로 부재 -> 검증·운영 모두 제약. Code가 추후 순수 임시저장 버튼 신설 검토 권고 (별도 paper-cut 후보).
