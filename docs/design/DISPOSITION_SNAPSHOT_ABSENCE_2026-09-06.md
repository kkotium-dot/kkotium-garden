# DISPOSITION 검증 — 스냅샷 부재 오판 + supplier_product_code 누락 (2026-09-06, Desktop)

> 착수 배경: 명화(공급단절 상품) disposition 검증 요청. 명화가 DB에
> 없으므로(도매매 삭제·상품 미존재), 개별이 아니라 "공급단절 판정
> 시스템이 전 상품에 올바르게 작동하는가"를 전 상품 공통(#62)으로 실측.

## 권위 함수 3종 로직 (읽고 확인)
- source-gone.ts: inventory_snapshots 선두 연속 qty<0 >= 3회 → sourceGone
- sales-assets.ts: salesCount>0 OR lastSaleDate 존재 → hasAssets
- disposition.ts: sourceGone(최우선, 자산O→RESOURCE/자산X→DELETE_SAFE)
  → 미발행 NONE → isLookupFailure NONE → 재고정상 NONE → 이미조치 NONE
  → 장기품절(≥14d) SUSPEND → 단기품절 MARK_OUT_OF_STOCK

## disposition 로직 자체는 정확 (가상 검증)
명화가 DB에 있었다면(발행+스냅샷 -1 연속3):
- 자산X → DELETE_SAFE ✅  /  자산O → RESOURCE ✅
공급단절 판정·자산보호 분기는 설계대로 정확 작동.

## 🔴 전 상품 공통 결함 2건 (실측 확정)

### 결함1 (로직·근본) — 스냅샷 부재를 "재고 0(품절)"로 오판
발행 상품인데 inventory_snapshots가 0개면 disposition-load.ts에서
`snap=undefined` → `qty:undefined` 전달 → disposition.ts:
- isLookupFailure: `(undefined ?? 0) < 0` = false (안 걸림)
- isOutOfStock: `(undefined ?? 0) <= 0` = **true** (품절로 오판!)
→ 재고 멀쩡한 발행 상품에 MARK_OUT_OF_STOCK 오권고.

**실측(2026-09-06 전 상품 16개 대입)**:
```
접이식트렁크정리(발행,스냅샷0)  -> MARK_OUT_OF_STOCK ❌ (재고 미확인인데 품절권고)
듀얼무선가습기(발행,스냅샷0)     -> MARK_OUT_OF_STOCK ❌
저소음물멍/LED차량/슬림불멍가습기 -> 동일 오판 ❌ (발행 가습기 4개 전부)
플라티코화분(발행,SUSPENSION)  -> NONE ✅ (이미조치라 우연히 안전)
달항아리(미발행,재고정상19998)  -> NONE ✅
```
발행 6개 중 5개가 오판(SUSPENSION 1개만 우연히 회피).

**근본원인**: `isLookupFailure`가 qty<0(음수 센티널)만 조회실패로 보고,
qty===undefined(스냅샷 자체 부재)는 안 잡음. "데이터 없음"과 "재고 0"을
구분 못 함. 신규 발행 직후엔 아직 폴링 전이라 스냅샷이 없는 게 정상인데,
이를 품절로 단정.

**수정방향**: disposition.ts isLookupFailure에 `qty == null`(undefined
포함) 케이스 추가 — 스냅샷 없으면 조회실패로 보고 NONE 반환(판정 보류).
"모르면 권고 안 함"이 #260/#271 사상과 일치. 전 상품 공통(#62).

### 결함2 (데이터) — 발행 상품에 supplier_product_code 누락
발행 6개 전부 supplier_product_code=null, last_poll=null. 재고 폴링은
도매매 상품코드로 조회하는데 코드가 없어 폴링 자체가 불가 → 스냅샷 영구 0
→ 결함1과 맞물려 disposition 상시 오판. 발행 워크플로에서 supplier_
product_code 연결이 누락되고 있음(발행된 상품이 소싱 원본과 안 이어짐).

**수정방향**: (a) 발행 시 supplier_product_code 필수 연결(발행게이트에
검증 추가 검토), (b) 기존 발행 6개 소급 백필(crawl_logs/소싱기록에서
매칭). 단 결함1 수정이 선행돼야 백필 전에도 오권고가 안 뜸.

## 우선순위·의존성
- 결함1(로직) 최우선·독립 — Code 인계, disposition.ts 1줄+테스트.
  이거만 고쳐도 오권고 즉시 중단(스냅샷 없는 발행상품 → NONE).
- 결함2(데이터) 후속 — 결함1 후에. 발행워크플로+백필, Desktop/Code 협업.
- 명화: DB 부재로 disposition 대상 아님. 별도 조치 불필요(공급단절
  시스템은 로직상 정상). 운영자 확인사항: 명화를 향후 재취급 시 대체소싱
  후 씨앗심기부터.

## Code 인계 (결함1)
```
disposition.ts isLookupFailure(p):
  현재: return (p.qty ?? 0) < 0 || p.supplierStatus === 'unknown';
  수정: p.qty == null(스냅샷 부재) 도 조회실패로 → 판정 보류(NONE)
  단, 진짜 재고0(qty===0, 스냅샷은 있음)과 구분해야 함 — snap 유무를
  별도 플래그로 넘길지, qty null 여부로 판단할지 disposition-load.ts와
  함께 설계. surfaceRules.test.ts·기존 테스트 회귀0 필수.
  전 상품 dryRun: 발행+스냅샷0 → NONE, 발행+실제품절(qty=0,스냅샷有) →
  MARK_OUT_OF_STOCK 유지 확인.
```
