# HANDOFF — 크롤 옵션 변환 누락 수정 (crawl_logs → Product/product_options)

> 작성: 2026-06-03 Desktop | 우선순위: HIGH (모든 옵션 상품 재발 방지)
> 근본 원인: Desktop DB 실측으로 확정. 추측 아님.
> 비가역 0 (Code register 금지 #41) / 허위 0 #46 / Prisma 싱글톤 / 한글 MD = write_file.

---

## 0. 근본 원인 (DB 실측 확정 — 추측 아님)

명화 디퓨저(65322245 / Product id cmpnooli40001f0gveaxr8iim) 실측:

**crawl_logs (창고) — 옵션 정상 저장됨:**
```json
options: [
  {"name":"레몬유칼립","qty":9999,"addPrice":0},
  {"name":"에이프릴 후레쉬","qty":9999,"addPrice":0},
  {"name":"블랙체리","qty":9999,"addPrice":0}
]
```
- crawl_logs.source = 'single', options_count = 3, jsonb array 정상.
- 도매매 OpenAPI v4.5는 옵션을 정확히 반환했고 크롤러가 crawl_logs.options에 저장 완료.

**Product (매대) — 옵션 누락:**
- hasOptions=false, optionName=null, options=null, product_options 테이블 레코드 없음(수동 보정 전 기준).

**결론**: 동적 로딩/크롤 실패 아님. **crawl_logs → Product 변환(승격/ingest) 단계에서 options 매핑이 누락**됨. 따라서 헤드리스 브라우저 불필요. 변환 로직에 옵션 이관만 추가하면 됨. 이미 크롤된 모든 상품의 옵션이 crawl_logs에 살아있어, 재크롤 없이 복구 가능.

---

## 1. 수정 대상 (Code가 직접 grep 확인 필요)

crawl_logs를 Product로 승격(promote/ingest/approve)하는 변환 코드. 추정 위치:
- `src/app/api/**/sourcing/**` 또는 `src/app/api/**/crawl/**` 또는 `src/app/api/**/products/**` 중 crawl_logs를 읽어 prisma.product.create/update 하는 라우트.
- grep 키워드: `crawl_logs`, `crawlLog`, `prisma.product.create`, `sourcing_status`, `promote`, `ingest`.

Code는 먼저 이 변환 함수를 grep으로 특정하고, 현재 options를 어떻게(누락하고) 처리하는지 직독할 것.

---

## 2. 변환 매핑 명세 (crawl_logs.options → Product + product_options)

crawl_logs.options 각 행 형식: `{ name: string, qty: number, addPrice: number }`

### 2-A. 단일 옵션축(향 등) 변환 규칙
crawl_logs.source='single' + options 배열 존재 시:

**Product 테이블 (발행 게이트용):**
```
hasOptions   = true
optionName   = (옵션축 이름. 도매매가 축 이름을 안 주면 'single' 기준 기본값 '옵션' 또는 '향')
optionType   = 'COMBINATION'
optionValues = options.map(o => o.name)              // jsonb 배열
options      = options.map(o => ({                    // jsonb 배열 (게이트 isNonEmptyArray)
  optionName1: <축이름>,
  optionValue1: o.name,
  stockQuantity: o.qty ?? 999,
  price: o.addPrice ?? 0
}))
```

**product_options 테이블 (실제 네이버 발행용 — buildOptionInfo가 읽음):**
```
option_type  = 'COMBINATION'
option_names = [<축이름>]                              // jsonb
option_rows  = options.map(o => ({                     // jsonb
  values: [o.name],
  stock: o.qty ?? 999,
  price: o.addPrice ?? 0,
  status: 'ON_SALE'
}))
product_id   = <Product.id>
```

### 2-B. 핵심 주의 (Desktop 검증으로 확인된 함정)
- **두 곳 모두 채워야 함.** 발행 게이트(publish-readiness.ts)는 Product.options/optionName/hasOptions를 읽고, 실제 네이버 발행(product-builder.ts buildOptionInfo)은 product_options 테이블을 읽음. 한쪽만 채우면 "게이트 GREEN인데 발행 시 옵션 누락" 사고 발생.
- **옵션축 이름**: 도매매 OpenAPI가 옵션 그룹명(예 '향')을 별도 필드로 주는지 Code가 확인. crawl_logs.options 행에 그룹명이 없으면(현재 name=옵션값만 있음), OpenAPI 원본 응답에서 옵션 그룹명을 추가 파싱하거나, 없으면 기본값 '옵션' 사용. (명화 디퓨저는 실제 '향'이었음 — Desktop이 도매매 페이지에서 육안 확인.)
- **addPrice 반영**: 옵션별 추가금액(addPrice)이 0이 아니면 price에 반영. 명화 디퓨저는 전 옵션 0원.
- **재고**: qty 그대로. 위탁이라 보통 9999/999.

### 2-C. 단일 상품(옵션 없음) 분기
crawl_logs.options가 빈 배열/null이면 hasOptions=false 유지(현행). 옵션 있는 상품만 위 변환 적용.

---

## 3. 기존 상품 일괄 복구 (재크롤 불필요)

변환 로직 수정 후, 이미 등록된 상품들의 옵션 복구가 필요할 수 있음. crawl_logs에 옵션이 살아있으므로:
- 옵션 backfill 스크립트(scripts/backfill-options-from-crawl.js 등) 작성 고려: crawl_logs.options가 있는데 Product.hasOptions=false인 상품을 찾아 §2 매핑으로 일괄 보정.
- 단, **명화 디퓨저(cmpnooli40001f0gveaxr8iim)는 Desktop이 이미 수동 보정 완료** — backfill 시 중복 INSERT 방지(product_options에 기존 레코드 있으면 skip/upsert).

---

## 4. 검증 (작업 후)
- TSC 0 + build 0 + verify-vercel.
- 신규 옵션 상품 크롤 → 승격 → Product.hasOptions=true + product_options 레코드 생성 확인 (3-tier: API + DB row + 발행 게이트 publishReady).
- dryRun으로 optionCombinationCount > 0 확인 (payloadPreview.optionCombinationCount).
- 기존 상품 backfill 시 명화 디퓨저 중복 INSERT 없는지 확인.

---

## 5. 절대준수
비가역 0 (register 금지 #41) / 허위 0 #46 (옵션 날조 금지 — crawl_logs 실데이터만) /
Prisma 싱글톤 / 한글 commit = .commit-msg.tmp #17 / push 후 verify-vercel #36 /
Production = Vercel only #28 / 두 저장소(Product + product_options) 정합 필수.

## 6. 마무리
변환 수정 출하 → Desktop이 신규 옵션 상품 크롤·승격으로 재검증 → backfill 필요시 별도 turn.
명화 디퓨저는 이미 정상화 완료(발행 게이트 GREEN) — 이 수정은 "다음 상품부터 재발 방지" + "기존 상품 복구"용.