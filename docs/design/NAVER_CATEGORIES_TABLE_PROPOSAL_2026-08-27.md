# naver_categories 잔재 테이블 처리 — 안전성 실측 및 상신 (운영자 판단 필요)

> 레인: Desktop(실측·상신) · 작성 2026-08-27 · 상태: **운영자 판단 필요(DDL 비가역)**
> 결론 선요약: **"단순 삭제 금지."** FK 참조가 살아있어 위험. 아래 실측 근거.

---

## 1. 실측 결과 (Supabase, 2026-08-27)

| 항목 | 값 | 의미 |
|---|---|---|
| naver_categories 행수 | **0행** | 비어있음 |
| 이 테이블 참조 FK | **1건** | 살아있는 참조 존재 |
| 참조 출처 | **Product.category_id** (`fk_products_category`) | 상품↔카테고리 연결의 FK |

## 2. 핵심 판단 — "미사용 잔재"가 아니다 (정정)

앞서 UCE-6에서 이 테이블을 "미사용 잔재"로 봤으나, **실측하니 Product.category_id가 FK로 참조** 중이다. 즉:
- 이 테이블은 **상품↔카테고리 연결의 정규 FK 대상**으로 스키마에 설계돼 있다.
- 그런데 **0행** → 어떤 상품도 category_id로 이 테이블과 연결 못 하는 상태.
- F 발행넛지 실측(미발행 8건 전부 category_id=X)의 근본 원인이 이것일 수 있다:
  **연결할 마스터가 비어서 category_id를 못 채우는 구조.**

⚠️ 그냥 DROP TABLE 하면:
- FK 위반으로 실패하거나, CASCADE로 Product.category_id 컬럼/제약이 깨진다.
- UCE 매처는 코드 상수(naver-categories-full.ts 5,021개)를 쓰지만, **DB 레벨 카테고리 연결(category_id FK)은 이 테이블 기반** → 삭제 시 상품 카테고리 DB 연결 구조 붕괴.

## 3. 두 갈래 — 운영자 결정 필요

### 갈래 A: 테이블을 살린다 (권고 검토 1순위)
- naver_categories에 마스터(코드 상수 5,021개)를 **적재**하고, Product.category_id를 FK로 정상 연결.
- 장점: UCE 매처 결과(코드) ↔ DB category_id ↔ 상품이 정합. 발행넛지의 category_id 공백도 해소.
- 이게 원래 스키마 설계 의도로 보임(FK가 그 증거).

### 갈래 B: 테이블을 버린다 (신중)
- Product.category_id FK를 먼저 제거하고, 카테고리 연결을 다른 방식(문자열 category or 코드상수 직접)으로 전환한 뒤 DROP.
- 대공사(스키마 마이그레이션). UCE가 코드상수 기반이라 가능은 하나, 리스크·범위 큼.

## 4. 상신 — 권고
**갈래 A 우선 검토 권고.** 근거:
- FK가 살아있다는 건 "쓰려고 만든 구조"라는 신호. 0행은 "미사용"이 아니라 "미적재".
- 코드상수(5,021개)를 이 테이블에 적재하면, UCE(코드매칭)와 DB(category_id 연결)가 한 소스로 정합.
- 발행넛지·상품관리의 category_id 공백 문제까지 한 번에 해소 가능.
- 단 적재 스크립트·FK 검증·중복키 처리 필요 → Code 작업(dryRun→GO→apply).

**갈래 B(삭제)는 비권고**: 이득(잔재 정리) 대비 리스크(FK·스키마 붕괴)가 큼.

## 5. 다음 단계 (운영자 GO 후)
- A 선택 시: Code가 naver-categories-full.ts → naver_categories 적재 스크립트(dryRun 건수확인→GO→apply) + Product.category_id 연결 검증.
- B 선택 시: 별도 스키마 마이그레이션 설계문서 선행.
- **어느 쪽이든 지금 DROP TABLE 금지.**

## 6. 의존성·범위
- UCE 엔진과 직결. F 발행넛지의 category_id 공백과도 연결.
- DB DDL·마이그레이션이라 운영자 명시 GO 필수(#46 비가역).
- 긴급도: 중(현재 UCE는 코드상수로 작동하므로 라이브 장애는 아님. 단 DB 정합성 부채).
