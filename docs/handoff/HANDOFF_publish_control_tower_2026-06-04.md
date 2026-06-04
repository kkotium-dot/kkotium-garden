# HANDOFF — 발행 관제탑 (Publish Control Tower) 신설 설계도

> 작성: 2026-06-04 (Desktop) | Target Session: ★새 채팅(Desktop 시작 권장) → code-cli 핑퐁
> baseline: production HEAD 64fe565 (UI 한글화 머지 후)
> 성격: 신규 화면(UI) + 일괄 판정 API + 브라우저 테스트. 중간 규모. 독립 작업.
> 권위: 본 문서 + src/lib/automation/publish-readiness.ts(엔진, 수정 금지) + 용어 사전(아래 §4)
> ★ 대원칙: 엔진(두뇌)은 이미 완성 — 새 로직 짜지 말 것. "신호등 화면"만 씌운다. 비가역 0(발행 미접촉).

---

## ✅ 구현 진행 상태 (2026-06-04 Code, feature/publish-control-tower)

- **STEP A ✅ (515e82f)** — 일괄 판정 API + 공통함수(load-publish-readiness.ts). 단건 route 공유·회귀 0. N+1 가드.
- **STEP B ✅ (aa31ad4)** — PublishControlTowerWidget.tsx + control-tower-strings.ko.json(필드23+위반6). 이모지 0/한글하드 0.
- **STEP C ✅ (50ee308)** — dashboard/page.tsx SECTION 2 최상단 마운트(가산식) + computeMarginPct(가격기반 마진율, margin 컬럼 단위 혼재 회피). DB mutate 0.
- **STEP D ✅** — Desktop preview(34edf7) /dashboard 6/6 실측 통과(관제탑·신호등 2/0/1·마진칩·체크리스트 14 한글·색대비·모바일 390px·SD-01).
- **STEP E ✅ (e915b0a)** — main --no-ff 머지 + push + Vercel verify exit 0. production fact-check: /dashboard 200 + API 정답지 일치. 발행 관제탑 A~E 완료.
- **다음** — P0 첫 상품 발행 트랙 분리(명화 이미지 변환 선결 → GREEN 재확인 → 대표 승인 → 신중 발행).
- 엔진(publish-readiness.ts) 미접촉(git diff 0). 비가역 0. TSC 0/build OK.

---

## 0. 왜 이 작업인가 (대표 요청)

대표가 "발행 준비 게이트를 직접 볼 수 있게" 요청. 현재 발행 준비 판정은 API로만 존재
(`/api/products/[id]/publish-readiness`) → 대표가 못 봄. 관제탑 = 이 엔진의 결과를 대표가
신호등으로 보는 화면. 매번 Claude에게 묻지 않고 화면만 보고 "이 상품 발행 가능?"을 즉시 판단.

대시보드("정원 일지") 안에 카드로 배치 확정(대표 승인). 매일 여는 첫 화면에서 "오늘 발행 가능한
상품"이 신호등으로 바로 보이게 — 파워셀러 워크플로우 최적.

---

## 1. ★ 기존 자산 (정독 완료 — 재사용, 수정 금지)

### 엔진: src/lib/automation/publish-readiness.ts (PURE, IO 없음)
`evaluatePublishReadiness(input): PublishReadinessResult` — 이미 완성. 절대 수정 금지.
반환 구조(신호등 매핑 근거):
- `fieldsAllSet` (boolean) — HARD+SEO 전 필드 채움
- `hardComplete` / `hardFieldsMissing[]` — 발행 필수 최소 조건(없으면 네이버 발행 실패)
- `seoComplete` / `seoFieldsMissing[]` — SEO 권장(검색 노출용)
- `authentic` / `authenticityViolations[]` — #46 진정성(과장·가짜 인증·향기 불일치 등)
- `naverPayloadComplete` / `naverPayloadMissing[]` — 상품정보제공고시(법적 고지)
- `publishReady` (boolean) — 위 4축 전부 + status='DRAFT' + naverProductId=null

### API: src/app/api/products/[id]/publish-readiness/route.ts
- GET, 상품 1개. Product + Diagnosis(conceptTone) 조회 → mapCategoryToTone → evaluate. JSON 반환.
- ★ 한계: 상품 1개씩만. 관제탑(목록)에는 일괄 판정 필요(아래 §2 STEP A).

---

## 2. 작업 분할 (각 STEP 독립 커밋, 새 채팅에서 순차)

### STEP A — 일괄 판정 API 신설 (백엔드, 저위험)
신규: `src/app/api/products/publish-readiness/route.ts` (목록용, id 없는 경로)
- GET `?status=DRAFT&limit=50` 등. DRAFT 상품 N개를 한 번에 판정.
- ★ 중복 금지: 단건 route의 조회+evaluate 로직을 공통 함수로 추출(예: lib에
  `loadAndEvaluate(productId)` 또는 products[] 배치 헬퍼)하여 단건/목록이 같은 코드 공유.
  단건 route도 이 공통 함수를 쓰도록 리팩터(동작 불변, 회귀 0 — 응답 JSON 형태 유지).
- 응답: `{ ok, items: [{ productId, name, mainImage, publishReady, hardComplete, seoComplete,
  authentic, naverPayloadComplete, hardFieldsMissing, seoFieldsMissing, authenticityViolations,
  naverPayloadMissing, margin, salePrice, supplierPrice }] }`
- N+1 주의: Diagnosis를 productId IN (...) 으로 한 번에 fetch 후 map. (단건 루프 호출 금지)
- 검증: 두 상품(명화 cmpnooli40001f0gveaxr8iim / 달항아리 cmp3afb450001gng5468w0qpc)로 실측.

### STEP B — 신호등 카드 컴포넌트 (UI, 핵심)
신규: `src/components/dashboard/PublishControlTowerWidget.tsx`
- 대시보드 SECTION 4(잠재력) 또는 SECTION 2(받은편지함)에 마운트. 위치는 구현 시 대표 확인.
- 신호등 3색 매핑(★ 확정 규칙):
  - 🟢 초록 "발행 준비 완료": `publishReady === true`
  - 🟡 노랑 "보완 필요": `hardComplete === true && publishReady === false`
    (발행은 가능하나 SEO/진정성/고지 중 미흡 — 채우면 초록)
  - 🔴 빨강 "발행 불가": `hardComplete === false` (필수 조건 누락 — 네이버 발행 실패)
- 카드 1개 = 상품 1개: 썸네일 + 상품명 + 신호등 배지 + "무엇이 부족한지" 체크리스트.
  체크리스트는 missing 배열을 §4 용어 사전으로 한글 변환해 표시(코드값 노출 금지).
- 마진 경고: margin < 일정%(예: 25) 이면 별도 노랑 경고칩("마진 N% — 가격 재검토 권장").
  ★ 단 마진은 publishReady 차단 요소 아님(엔진은 margin>0만 요구) — UI 경고로만.
- 빈 상태/로딩/에러 처리. 모든 문구 i18n(신규 `control-tower-strings.ko.json`, #35).
- 이모지 금지 → Lucide 아이콘(CheckCircle2 / AlertTriangle / XCircle 등). 신호등 "색"은 칩 배경색으로.

### STEP C — 대시보드 통합 + 클릭 동선 (UX)
- dashboard/page.tsx 해당 섹션에 `<PublishControlTowerWidget />` 마운트(기존 위젯 보존, 가산식).
- 카드 클릭 → 해당 상품의 온실 아틀리에(/studio?product={id}) 또는 발행 흐름으로 이동.
- 노랑/빨강 항목 클릭 → 어디서 고치는지 안내(예: SEO 미흡 → 검색 조련사 /naver-seo).

### STEP D — ★ 브라우저 실측 테스트 (대표 필수 요청 — 거를 수 없음)
- Desktop가 Chrome MCP로 production(또는 preview) /dashboard 접속 → 관제탑 카드 육안/DOM 확인.
  ※ Chrome MCP 4분 행 주의(#26 메모리) — tabs_context_mcp 경량 probe로 생존 확인 후 진행.
- 실측 항목: (1) 명화=초록/노랑 정확? (2) 달항아리=마진경고 노출? (3) 체크리스트 한글 정상?
  (4) 신호등 색 대비 접근성 (5) 모바일 폭(이전 2-MOBILE 작업과 정합).
- ★ 인증 필요 페이지라 Chrome MCP 로그인 상태 의존 → 안 되면 대표에게 스크린샷 요청(거짓 보고 금지 #46).
- 문제 0 확인 후에만 다음(P0 발행)으로. 문제 있으면 수정 후 재테스트.

---

## 3. 검증 (각 STEP)
- npx tsc --noEmit 0 / npm run build OK
- 한글 하드코딩 0(i18n, #35) / 이모지 0(Lucide) / sentinel 0
- 엔진(publish-readiness.ts) 미수정 확인 — git diff에 해당 파일 0
- 단건 API 응답 형태 불변(리팩터 회귀 0) — 명화/달항아리로 before/after 응답 비교
- 비가역 0: 판정·표시만. register/POST/DB mutate 0. 발행 미접촉.
- STEP별 독립 커밋(.commit-msg.tmp + git commit -F #17, heredoc 금지 #26), 5 MD 핑퐁.

## 4. ★ 용어 사전 (관제탑 체크리스트 한글 변환 — 코드값 노출 금지)
엔진 missing 배열의 코드키 → 대표/고객이 보는 한글:
| 코드키 | 한글 |
|---|---|
| main_image_url | 대표 이미지 |
| detail_image_url | 상세 페이지 이미지 |
| naverCategoryCode | 네이버 카테고리 |
| originCode | 원산지 |
| carrier_code / shipping | 배송 설정 |
| optionName / options / hasOptions | 옵션 |
| seoTitle / naver_title | 상품명(SEO) |
| naver_keywords / keywords / targetKeywords | 검색 키워드 |
| golden_keyword_score | 골든키워드 점수 |
| sku | 상품코드(SKU) |
| brand | 브랜드 |
| margin | 마진 |
| naver_origin/manufacturer/as_info/tax_type | 원산지/제조사/AS/과세 고지 |
| naver_delivery/exchange/refund_info | 배송/교환/반품 안내 |
진정성 위반(authenticityViolations type)도 한글로:
superlative-claim→"과장 표현", scent-mismatch→"향기 표현 불일치", fabricated-brand→"근거 없는 브랜드 주장",
unverified-cert→"미검증 인증 주장", unverified-material→"미검증 소재 주장", placeholder-missing→"상세 이미지 누락".

## 5. 다음 (관제탑 완료 후)
- P0 첫 상품 발행: 관제탑 초록 확인 → 대표 명시적 승인 → 신중 발행(비가역, register/POST).
  첫 상품은 명화(마진 50.7%) 권장. 달항아리(마진 23%)는 가격 재검토 후.
- 발행 후: DEBT-11(영구자산 cache-control) / 골든윈도우 가드(P1) / Tailscale→고정IP 이관.
