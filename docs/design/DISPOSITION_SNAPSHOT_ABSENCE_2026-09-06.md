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


---

## [2026-09-06 브라우저 실측 보강] 결함이 실제 운영화면에 나타남 + 화면간 판정 모순

### 처분 결정 대기함 (/products/out-of-stock) 실측
발행 상품 5개(LED차량가습기·저소음물멍·슬림불멍·듀얼무선가습기·접이식
트렁크정리)가 전부 **"품절 처리 권장"**으로 대기함에 올라옴. 상단 카드:
"대체소싱 필요 0 / 재입고 검토 0 / 품절 처리 5" — 진짜 공급단절이나
재고문제가 아니라 전부 "품절"로만 쏠린 비정상 분포. **운영자가 이 권고를
따르면 멀쩡한 상품을 품절처리해 매출손실** = 파워셀러 도구로서 치명적.

### 화면간 판정 모순 (결함1의 파생 증상)
같은 발행 상품을 두 화면이 정반대로 판정:
- **꽃밭 돌보기(/products)**: "잘 자라는 중 / 판매중 / 발행 8/8" (정상)
- **처분 대기함(/products/out-of-stock)**: "품절 처리 권장" (오판)

두 화면이 서로 다른 데이터 경로를 씀:
- 꽃밭 돌보기 배지 ← inventory-badges API (스냅샷 있는 것만, 실측시
  1개 상품만 반환 — qty 19998 status "판매종료"라는 별도 이상도 존재)
- 처분 대기함 ← disposition-load.ts (전 상품, 스냅샷 0 → 품절 오판)

→ 운영자가 어느 화면도 못 믿게 됨. #62(단일권위) 위반의 실제 발현 —
disposition-load와 inventory-badges가 "재고 없음"을 다르게 해석.

### 추가 발견 (별건, 기록만)
inventory-badges 실측에서 qty=19998인데 status="판매종료" 케이스 발견
(productNo 63860451). 재고는 많은데 공급사가 판매종료한 상태 — disposition의
isOutOfStock은 supplierStatus!=='판매중'이면 품절로 보므로 이건 로직상
맞으나, "재고 대량+판매종료"는 공급단절 전조일 수 있어 별도 관찰 가치.

### 결론 (수정 우선순위 확정)
결함1(disposition.ts 스냅샷부재 undefined 오판)이 최우선·근본. 이거만
고치면 대기함의 5개 오권고가 즉시 사라지고(스냅샷 없으면 NONE=판정보류),
화면간 모순도 해소(양쪽 다 "판정불가→조용")됨. Code 인계 대상(문서 상단
§Code 인계 참조). 결함2(supplier_product_code 백필)는 그 후 재고 폴링을
실제로 살리는 후속.


---

## [2026-09-06 전상품 확장 체크] 동일 결함이 publish-gate에도 존재 (결함1 범위 확대)

지시("전 상품 적용 시 문제없는지 확장 체크")에 따라 `qty ?? 0` 오판
패턴을 전 프로젝트 grep → **disposition.ts 외 publish-gate.ts에도 동일
버그** 발견. 실측(로컬 함수 직접 호출):

| 입력 | publish-gate | disposition | 정오 |
|---|---|---|---|
| qty=null(스냅샷부재) | 차단 SUPPLIER_OUT_OF_STOCK | MARK_OUT_OF_STOCK | ❌❌ |
| qty=undefined | 차단 | MARK_OUT_OF_STOCK | ❌❌ |
| qty=0(실품절,스냅샷有) | 차단 | MARK_OUT_OF_STOCK | ✅✅ |
| qty=100(정상) | 통과 | NONE | ✅✅ |

### publish-gate가 더 위험
publish-review-gate.ts:262가 `qty: snapshot?.qty ?? null`을 넘기는데,
스냅샷 0건이면 정상 쿼리라 catch를 안 타고 qty=null로 checkPublishGate에
도달 → `(null??0)<=0`=true → **SUPPLIER_OUT_OF_STOCK로 발행 차단**.
주석(publish-gate.ts:49 "재고 신호 없으면 통과")의 의도와 정반대로 동작.
→ 스냅샷 없는 신규 소싱 상품(supplier_product_code 연결 전)은 발행 자체가
막힘. 결함2(supplier_code 누락)와 맞물리면 **발행 워크플로 전체가 봉쇄**.

### 통합 수정 설계 (두 파일 동시, #62 단일 근본원인)
"qty가 null/undefined = 재고 신호 없음(폴링 전)" ≠ "qty=0 = 실재고 0".
- **publish-gate.checkPublishGate**: qty==null이면 SUPPLIER_OUT_OF_STOCK
  판정 건너뛰고 PASS(주석 의도대로 "모르면 안 막음"). qty===0(명시적)만
  차단.
- **disposition.isOutOfStock / isLookupFailure**: qty==null이면 조회실패로
  보고 상위에서 NONE(판정 보류). qty===0(스냅샷 존재+실품절)만 isOutOfStock
  true.
- source-gone-pure.ts는 영향 없음(s.qty<0만 세므로 null 자연 제외) — 확인함.

### Code 인계 (통합, 최우선)
```
근본: qty ?? 0이 null/undefined(스냅샷부재)를 0(품절)으로 뭉갬. 2파일 공통.

1) src/lib/products/publish-gate.ts checkPublishGate:
   L61 `if ((inv.qty ?? 0) <= 0)` 앞에 `if (inv.qty == null) { /* 신호없음 */ }`
   분기 — qty null이면 이 차단을 스킵(PASS로 흐름). qty===0만 차단 유지.
   (L58 qty<0 조회실패 PASS는 그대로)

2) src/lib/products/disposition.ts:
   isLookupFailure(L98): `p.qty == null` 도 조회실패에 포함.
   → decideDisposition L5(조회실패) 분기가 NONE 반환하므로 자동 보류.
   isOutOfStock(L103)은 그대로 두되, isLookupFailure가 먼저 걸러 도달 안 함.

3) 회귀 검증(#352): 
   - 스냅샷부재(qty=null): publish-gate PASS, disposition NONE (신규수정)
   - 실품절(qty=0): 양쪽 기존대로 차단/MARK_OUT_OF_STOCK 유지
   - 정상(qty>0): PASS/NONE 유지
   - 조회실패(qty<0): PASS/NONE 유지(기존)
   surfaceRules.test.ts + 기존 테스트 전부 회귀0. 
   프로덕션 재검증: /products/out-of-stock 대기함 5개→0개(스냅샷없는
   가습기들이 품절권고에서 빠짐) Desktop 확인.

브라우저 확증 완료: 대기함에 발행 가습기 5개가 품절권고로 떠있음(실측).
수정 후 이 5개가 대기함에서 사라져야 정상(스냅샷 없으니 판정보류).
```

### 의존성
결함1(통합 로직수정, 위) 최우선·독립 → 결함2(supplier_code 백필) 후속.
결함1만 고쳐도 오권고·오차단 즉시 중단. 결함2는 재고폴링을 실제로 살려
정상 판정이 나오게 하는 별도 단계(발행워크플로 개입점).


---

## [2026-09-06 결함2 백필 가능성 실측] 자동 백필 불가 — 방향 재정립

disposition 결함2(발행상품 supplier_product_code 누락)의 백필 가능성을
DB 실측: **자동 백필 불가**.

**실측 결과** (발행 6개 전수):
- 전부 `source=IMPORTED`, `origin_kind=APP_CREATED`, `origin_id=null`,
  `source_detail_url=null`. sku는 NAVER-xxxxx(네이버 역import) 또는
  DMM-BD-43595104(1개만 도매매 흔적).
- crawl_logs와 이름 매칭 0건, URL/sku 매칭 0건(DMM-BD-43595104도 crawl_logs
  에 없음).

**근본 진단**: 이 6개는 소싱→발행 정규 워크플로 산물이 아니라 **네이버
스토어에서 앱으로 역import(가져오기)된 상품**. 도매매 원본과의 연결
데이터가 애초에 존재하지 않음. 따라서 crawl_logs·소싱기록에서 자동
매칭할 소스가 없음.

**방향 재정립**:
- 결함2는 "발행 워크플로가 코드 연결을 누락"이 아니라 "역import 상품은
  도매매 원본을 구조적으로 모름"이 실체.
- (a) **정규 워크플로 상품**: 소싱→씨앗심기→발행 경로로 만든 상품은
  supplier_product_code가 이어지는지 별도 확인 필요(현재 발행상품엔
  정규경로 산물이 없어 검증 불가 — 다음 정규 발행 때 확인).
- (b) **역import 상품**: 도매매 원본을 자동으로 알 수 없음. 운영자가
  수동으로 원본 URL을 연결하는 UI(supplier-code 라우트가 이미 존재:
  api/products/[id]/supplier-code)가 정답. 자동 백필 금지.
- 결함1 수정으로 이 상품들은 이제 "판정 보류(NONE)"라 오권고는 없음.
  재고 추적이 필요하면 운영자가 supplier-code를 수동 연결해야 폴링 시작.

**결론**: 결함2 자동 백필 작업은 취소(불가). 대신 "역import 상품에
supplier-code 수동연결 안내" UX가 실질 해법(별도 개선, 저우선 — 결함1로
급한 오권고는 이미 해소됨). api/products/[id]/supplier-code 라우트 실동작은
추후 확인.

---

## [2026-09-06 병렬 발굴] "재고 있음 + 판매종료" 조합 — 결함 아님, 정상 확인

개선점 병렬 발굴 중 inventory-badges에서 "달항아리 도어벨 qty=19998인데
status=판매종료" 모순 의심 케이스 발견. 실측으로 규명:

- **출처 확인**: dome-inventory-poller.ts L168 `status: s.status ?? 'unknown'`
  → 스냅샷 status는 도매매 API 응답 직접값. "판매종료"는 네이버 CLOSE
  라벨과 문자열만 같을 뿐 출처는 도매매(우연 동음).
- **판정**: 결함 아님. 도매매 셀러가 "재고는 남았지만 판매종료"한 실제
  상태. 이 상품은 미발행(DRAFT)이라 disposition NONE(현재 무해). 발행
  시도하면 publish-gate가 supplierStatus!=='판매중' → SUPPLIER_OUT_OF_STOCK
  차단 = 올바른 동작(판매종료 상품 발행 방지).
- 표면(모순처럼 보임)→실측(크롤 소스)→정상 확정. 기둥1 실증(성급한
  결함 단정 회피).

**실질 개선 후보(저우선)**: "재고 있음(19998) + 판매종료 → 발행 차단"은
운영자에게 비직관적. 발행 차단 시 "재고는 있으나 공급사가 판매종료함"
같은 명확한 사유 표기 UX. 개선1(deep-link 배너)과 같은 "맥락 설명" 계열.
급하지 않음(미발행 상품이고 차단 자체는 올바름).

## [2026-09-06] products 무한업데이트 경고 — 프로덕션 재현 안 됨(환경문제)
Code가 개선1 검증 중 본 "Maximum update depth exceeded"는 프로덕션
/products에서 재현 안 됨(콘솔 클린). 워크트리 seeded DB 없어 publish-
readiness-batch 500 재시도 루프가 원인이었던 환경문제. 코드 버그 아님
확정(Code 판단 정확).

---

## [2026-09-06 근본병목 규명] 개선2(알림센터) 착수 중 의존성 체인 발견

개선2(웹앱 알림센터)를 최우선 착수하려 데이터 소스를 실측하다 **전체
의존성 체인의 근본 병목**을 규명. "개선2 독립"이라던 앞선 판단을 실측으로
정정(환각 제거).

**실측 체인**:
1. 알림센터 데이터 소스 후보 = low_stock_alerts + price_movement_alerts
   (둘 다 productId·level·triggeredAt·resolvedAt 보유 — 알림센터+개선4
   양방향에 완벽). 신규 테이블 불필요.
2. **그러나 두 테이블 전부 0건**(실측). 원인: dome-inventory-poller가
   "supplier_product_code 있는 상품만" 폴링(L10 주석) → 발행 6개는
   역import라 code 없음 → 폴링 제외 → 스냅샷 없음 → 알림 0건.
3. supplier-code 연결 백엔드(api/products/[id]/supplier-code + inventory-
   mapping.ts)는 **완비**됨(수동입력 + crawl_logs 이름정확일치 자동매칭,
   #231 정직 설계). **그러나 이 라우트를 호출하는 UI 진입점이 앱 어디에도
   없음**(grep 0건) = 근본 병목.

**의존성 체인**:
```
[근본병목] supplier-code 연결 UI 부재(백엔드는 있음)
  → 결함2: 발행상품 code 미연결
  → 재고폴링 대상 제외 → 스냅샷·알림 0건
  → 디스코드 재고/가격알림 안 감 + 개선2 알림센터 빈껍데기
  → disposition도 "판정보류"에 머물러 재고변화 감지 못함(결함1로 오권고는
    막았으나 근본 재고추적은 여전히 죽어있음)
```

## 최우선 작업 재정립 (의존성 근거)
**"supplier-code 연결 UI(운영자 개입점) 신설"이 진짜 의존성 없는 최우선.**
백엔드 완비 → 프론트 개입점만 추가하면 폴링·알림·알림센터·disposition
재고추적 전체를 되살리는 시작점(#62 전상품공통, 앱에 개입점 자연스럽게 녹임).

### Code 인계 (supplier-code 연결 UI)
```
목표: api/products/[id]/supplier-code(완비된 백엔드)를 호출하는 운영자
 개입점을 상품 화면에 노출. 재고추적 안 되는 상품(supplier_product_code
 null)에 "도매매 코드 연결" 버튼/입력.

1) 노출 위치: 상품 상세 드로어(products/page.tsx의 setSide 드로어) 또는
   꽃밭 돌보기 행. supplier_product_code null인 상품에만 "재고추적 연결
   필요" 배지+버튼(전상품공통 — 조건부 노출).
2) 동작: 버튼 클릭 → 먼저 POST /supplier-code {}(자동매칭 시도) →
   matched:false면 수동 입력 필드(도매매 상품번호) → POST {code}.
   성공 시 "재고추적 시작됨" 토스트 + 다음 폴링부터 스냅샷 쌓임 안내.
3) 개입점 자연스럽게: disposition/publish-gate가 "재고신호없음"으로
   판정보류 중인 상품에 이 배지를 노출하면 맥락 일치(결함1과 연결).
검증: supplier_product_code null 상품에 버튼 노출 + 클릭→연결→DB반영
 (Desktop 프로덕션 실측). code 연결 후 재고폴링 대상 포함 확인.

[의존성] 이게 선행 → 이후 폴링 데이터 쌓이면 → 개선2 알림센터 의미생김.
 개선3(정보심화)은 이와 독립(개선1 위 UI라 데이터 무관, 지금도 가능).
```

## 정정된 우선순위
1. **supplier-code 연결 UI**(근본병목, Code 인계) — 폴링/알림/센터 전체의 시작점
2. 개선3(정보심화) — 개선1 위 UI, 데이터 의존 없어 병렬 가능
3. 개선2(알림센터) — supplier-code UI로 데이터 쌓인 후
4. 개선4(양방향) — 개선2와 연동

---

## [2026-09-06 #363 전상품 확장체크] supplier-code 연결 후 폴링 24h 지연 발견

결함A(supplier-code UI) 완료 후 "코드 연결→폴링 시작"이 실제 작동하는지
#363(전상품 확장체크)로 검증하다 **연결 즉시 폴링 안 되는 구조적 지연** 발견.

**실측 근거(교차검증)**:
- 접이식트렁크: supplier_product_code=43595104 연결됨(updatedAt 9/7 01:05)
  인데 snaps=0, last_poll=null.
- cron_invocation_log: /api/cron/inventory-sync 매일 00:51 정상 실행
  (9/3~9/7 전부 outcome:ok, auth_ok:true). 크론은 정상.
- 타이밍: 코드연결 01:05 > 그날 크론 00:51 → 14분 차이로 그날 폴링
  놓침. 다음 자정(9/8 00:51)에야 첫 폴링.
- 코드 확인: 단일상품 즉시폴링 함수 없음(pollAppRegisteredInventory
  전체만). supplier-code 연결 라우트가 폴링 트리거 안 함(연결만).

**결함(전상품 공통 #62)**: 코드 연결하는 모든 상품이 **최대 24시간**
재고추적 시작 안 됨. 그 사이 "재고추적 필요" 배지 그대로 → 운영자
"연결 안 됐나?" 혼란. supplier-code UI의 마지막 고리가 빠짐.

**개선안(Code 인계)**:
```
supplier-code 연결(POST /api/products/[id]/supplier-code) 성공 직후
해당 상품 1건 즉시 폴링:
1) dome-inventory-poller.ts에 pollSingleProduct(productId or productNo)
   추가 — 기존 pollAppRegisteredInventory의 단일 버전(adapter.getInventory
   ([productNo]) 1회 → 스냅샷 생성 → 알림판정). 전체 폴링 로직 재사용.
2) supplier-code/route.ts: setSupplierCode 성공 후 pollSingleProduct
   호출(await, 실패해도 연결은 성공 처리 — 폴링은 best-effort). 응답에
   snapshot 여부 포함해 UI가 "재고추적 시작됨 · 현재고 N개" 즉시 표시.
3) UI(SupplierCodeConnect): 성공 응답에 스냅샷 있으면 "재고추적 시작됨 ·
   현재고 N" , 없으면 "연결됨 · 곧 재고 확인 예정"(도매매 조회 지연 대비).
검증: 코드연결→즉시 snaps 1건 생성→배지 사라짐(Desktop 프로덕션 실측,
현재는 24h 대기라 못 봄). 도매매 getInventory 실호출이라 유효 productNo
필요 — 접이식트렁크 43595104로 검증.
[중요] 이 개선으로 결함A UI가 비로소 "즉시 피드백" 완성. 지금은 연결해도
24h 무반응이라 UX 반쪽.
```

**의존성**: 결함A(supplier-code UI, 완료)의 후속 완성 조각. 개선2/3/4
(폴링 데이터 의존)의 선행이기도 함 — 즉시폴링 있으면 운영자가 코드
연결하는 즉시 데이터 쌓여 개선2/3/4 착수 앞당겨짐.
