# TECH_DEBT.md — 기술 부채 ledger

> 이 파일은 코드/스키마 차원에서 "지금 당장 수술하면 위험하나 발행 후 정리 필요한" 항목을 추적합니다.
> 각 entry는 (a) 현재 동작에 영향 없는지 단정, (b) 수술 전 선행 조건, (c) 수술 시 위험을 명시합니다.
> 매 lane 종료 시 재검토. 신규 부채는 발견 시 즉시 등록(SOURCE 라인에 발견 turn 명시).

---

## DEBT-01 — SEO 필드 이중계열 (title 4중 / keywords 4중 / description 2중)

**Status**: OPEN (2026-06-01 등록, Lane 1-D 검증 중 발견)
**Severity**: medium (현재 라우트 mirror로 동작 리스크 0, 그러나 schema sanity 손상)
**Owner**: 발행 후 별도 turn (Lane 2 이후)

### 부채 명세

prisma schema에 SEO 관련 필드가 다중 컬럼으로 분산되어 있고 라우트가 일부만 갱신:

| 의미축 | 컬럼 후보 (snake) | 컬럼 후보 (camel) | 비고 |
|---|---|---|---|
| Title | `naver_title`, `seo_title`, `aiGeneratedTitle` | `seoTitle` | 4중. publish-readiness는 `seoTitle`(camel) 검사 |
| Keywords | `naver_keywords`(CSV), `seo_keywords`, `keywords`(JSON) | `targetKeywords`(JSON) | 4중. 꼬띠 점수는 `keywords` JSON 사용 |
| Description | `naver_description`, `seo_description` | — | 2중 |

### 현재 상태 (Lane 1-D 2026-06-01)

ai-generate POST/PUT 라우트가 4종 모두 mirror 갱신하도록 보강 (commit 0712b9a). publish-readiness 4축 true 유지, 사용자 노출/발행 페이로드 동작 리스크 0.

### 수술 전 필수 선행

수술(어느 한 컬럼 제거 + 데이터 migration) 전에 다음을 grep 전수 추적:

1. `publish-readiness.ts` — 어느 컬럼을 4축 검사에 사용?
2. `naver/product-builder.ts` — Commerce API 페이로드에 어느 컬럼 매핑?
3. `kkotti-*` 또는 `golden-keyword-*` — 정체성 점수 계산 시 어느 컬럼 read?
4. `naver/excel-generator.ts` — 엑셀 88칸 매핑에서 어느 컬럼 사용?
5. UI 컴포넌트 (`/studio`, `/products/new`) — 어느 컬럼 표시?

### 수술 시 위험

- 라우트 mirror 제거 후 1곳이라도 잘못된 컬럼을 read하면 **stale 데이터 표시** → 발행 페이로드 오염 가능.
- 컬럼 drop은 비가역 (downgrade 불가). 데이터 migration 시 row-level dedup 필요.
- publish-readiness가 보는 컬럼을 잘못 제거하면 publishReady=false 영구 차단.

### 수술 권고 시점

- **발행 전 금지** — 달항아리 등 검증된 DRAFT가 발행 단계에 있을 때 수술 시 라이브 데이터 오염 위험.
- **권고**: 첫 실 발행(1건) 통과 → 수술 turn 진입.

### SOURCE

Lane 1-D 검증 중 (2026-06-01, baseline 8e60a0a). seoTitle dual-column 발견 → 라우트 mirror로 즉시 해소(0712b9a) 후 본 부채 등록.

---

## DEBT-02 — Prisma `name` 필드 다모델 중복

**Status**: OPEN (2026-06-01 등록, Lane 1-D 스키마 정독 중 발견)
**Severity**: low (모델별 독립이라 동작 영향 0, dedup 후보)
**Owner**: 발행 후 별도 turn (DEBT-01 이후)

### 부채 명세

`prisma/schema.prisma`에서 `name` 필드가 7개 모델에 동일 명칭으로 정의:

```
line  14: model A (User?) -- name String?
line  24: model B          -- name String
line  38: model C          -- name String
line 138: model D          -- name String
line 287: model E          -- name String
line 390: model F          -- name String?
line 451: model G          -- name String @db.VarChar(200)
```

(정확한 모델명은 schema raw 정독 시점에 다시 확인 필요)

### 현재 상태

각 모델 독립이라 충돌 0. Prisma generated client는 `Model.name`으로 안전 접근. dedup은 코드 가독성 / 검색 효율 측면 부채.

### 수술 권고

- 모델별 의미가 다른 필드인 경우(예: User.name vs Category.name) → 변경 불요.
- 동일 의미의 필드가 중복인 경우(예: Product.name이 두 곳) → 통합 검토.

### SOURCE

Lane 1-D 검증 중 (2026-06-01, baseline 8e60a0a). DEBT-01 grep 작업 시 부수 발견.

---

## DEBT-03 — `prisma db pull` reformat 부재

**Status**: OPEN (2026-05-30 등록, Lane 1-A 이전)
**Severity**: lowest (의미 변경 0, working tree 잔존)
**Owner**: 별도 chore commit

### 부채 명세

`prisma db pull` 결과 schema 차분 390+/296- 라인이 working tree에 modified 상태로 누적. 순수 reformat(필드 순서 / 들여쓰기)이라 의미 변경 0. 별도 chore commit 위임.

### 수술 권고

다른 schema 변경이 없는 깨끗한 turn에서 `git add prisma/schema.prisma && git commit -m "chore(prisma): db pull reformat"`로 단독 commit.

---

## 보류 + 잔존 알림 (부채 아님, 정보)

- **firefly-generate.ts** — Adobe Enterprise API 견적 대기 (Lane 2 진입 조건)
- **아이스트레이 단품 복구** — 도매매 URL 대기 (crawl_logs 출처 부재)
- **3 untracked docs** — docs/handoff/HANDOFF_g8_*, docs/research/FIREFLY_AUTOMATION_RESEARCH_2026-05-30.md (이전 turn 잔여, git 추적 결정 별도)
- **ROADMAP 2026-05_part2.md** — Lane 1-D turn 분할 완료, archive 보관 (288줄 슬림 ROADMAP.md 라이브)
- **AI "디자인" 토큰 prompt 차단** — Lane 1-C 잔존 (deboosted generic이 AI 출력에 자발적 등장 — fill 단계만 차단 중, prompt 단계 차단은 별도 turn)
- **DataLab shopping_keywords 비율 결합** — Lane 1-B 후속 (절대 검색량 + 카테고리 정규화 비율 이중 신호)

---

## DEBT-04 — 엑셀 buildDataRow 매핑 가드 (route.ts ↔ NaverProductData 동기화)

**Status**: CLOSED (4건) + RESOLVED-NOT-A-BUG (1건). 2026-06-02 Desktop 독립검증 (HANDOFF_excel_5fix_verify_f4_correction)으로 정정 종결.
**Severity**: low (정합 가드 + 가이드)
**Owner**: 매 PR 리뷰 — 신규 NaverProductData 필드 추가 시 route.ts 동시 갱신 의무 (예방 가드)

### 부채 명세

`src/lib/excel/naverExcel.types.ts`의 `NaverProductData` 인터페이스에 90+ 키가 정의되어 있으나, `src/app/api/naver/excel/route.ts`의 `rows.map((p) => ({...}))` 블록이 그중 일부만 채움. 빌더(`naverExcelJS.ts buildDataRow`)는 타입에 있는 모든 키를 fallback chain (`p.foo ?? d.foo`)으로 읽기에, route.ts에서 키를 빠뜨리면 빌더는 default/empty로 출력 — TS 오류 없이 silently 빈 칸으로 출하.

### 2026-06-02 발견 5건 — 최종 상태 (Desktop 셀 단위 독립검증)

| Fix | 셀 | 검증 결과 | 상태 |
|---|---|---|---|
| F1 옵션 | [12~16] | 조합형 / 형태 / 정사각·직사각 / 0,0 / 9999,9999 | **[CLOSED]** 통과 |
| F2 제조사 | [26] | 유통 꽃틔움 (이전 "도매매 공급사" 정정) | **[CLOSED]** 통과 |
| F3 상품명 | [2] | 집들이선물 달항아리 도어벨... (naver_title SoT) | **[CLOSED]** 통과 |
| F4 반품/교환 | [46][47] | 공란 — **버그 아님** (네이버 정책 정합, 아래 §F4 참조) | **[RESOLVED-NOT-A-BUG]** |
| F5 정보고시 | [51][54] | 꽃틔움 / 유통 꽃틔움 | **[CLOSED]** 통과 |

### F4 정정 — 정상 동작 단정 (#44 stale fact, Code 보고 2건 틀림)

**Code 보고 (틀림)**:
- "DB shipping_template.return/exchangeFee NULL + naver_refund/exchange_info에 추출 가능 숫자 부재"
- "Desktop이 Supabase에 7500 명시 입력 시 즉시 채워짐"

**Desktop 실측 진실**:
- `shipping_templates(cmmlalkq60007121qth9i8xtz)` `return_fee=7500 / exchange_fee=7500` — 처음부터 존재
- `naver_refund_info` = "반품 왕복비 **7,500원** 부담..." — 추출 가능
- `naver_template_no` = 2976914

**진짜 원인 (코드 단정)**:
`naverExcelJS.ts buildDataRow` line 134-135 (route fee 출력) 수술 정상. 그러나 그 아래 데이터 렌더 루프의 `isDisabled` 가드:
```
isShippingField = [...,'반품배송비','교환배송비'].includes(label)
isDisabled = !!deliveryTemplateCode && isShippingField
if (isDisabled) cell.value = ''   // 템플릿 연결 시 무조건 빈칸 덮어씀
```
달항아리는 템플릿(2976914) 연결 → 항상 isDisabled → [46][47] 빈칸.

**결론 (네이버 정책 정합)**:
- 네이버 일괄등록 정책: 배송템플릿 연결 시 **반품/교환비는 템플릿이 SoT**, 엑셀 개별칸은 비움이 정석.
- 템플릿 2976914에 반품 7500 / 교환 7500 내장 → 발행 시 정상 적용.
- 엑셀 [46][47] 공란 = 결함 아님. **추가 데이터 입력 불필요** (입력해도 isDisabled가 또 지움).
- **F4 빌더 가드 수술(line 134-135 명시 fee 출력)은 보존** — "템플릿 미연결 상품"에선 유효, 회귀 0.
- isDisabled 가드도 보존 — 의도된 네이버 정책 정합 동작.

### 수술 전 선행 조건 / 회피 패턴 (예방 가드)

(a) **신규 NaverProductData 필드 추가 시**: route.ts map 블록도 동시 갱신 — PR checklist 추가 권고.
(b) **타입 → route 자동 단정**: 향후 ESLint custom rule 또는 빌드타임 assertion (`satisfies` operator)로 미매핑 키 발견 시 경고.
(c) **빈 칸 단정 의무**: production POST /api/naver/excel 후 openpyxl 또는 ExcelJS readback으로 핵심 카테고리(옵션/제조사/배송/정보고시) 충진 단정. **단, isDisabled 가드 적용 필드(반품/교환배송비)는 템플릿 연결 시 공란이 정상** — 단정 룰에서 제외.

### 수술 시 위험

낮음 — 매핑 추가는 비파괴(undefined 시 기존 fallback 동작). 단, options[] → Naver 포맷 변환은 카테고리(조합형/단독형/직접입력형)별 규약 다름 → 신규 카테고리 도입 시 buildOptionFields 분기 확장 의무.

**SOURCE**: 2026-06-02 Code turn (P0 엑셀 매핑 5건 수술), 권위 `docs/handoff/HANDOFF_naver_excel_mapping_gaps_2026-06-02.md` + 검증/정정 `docs/handoff/HANDOFF_excel_5fix_verify_f4_correction_2026-06-02.md`

## DEBT-05 — StoreSettings 주소 컬럼 부재 (asGuide JSON cache 임시방편)

**Status**: RESOLVED (2026-06-02 등록 + 동 turn 해소)
**Severity**: high (네이버 위탁배송 발행 직접 차단)
**Owner**: Code 2026-06-02 P0 발행 선결 turn (baseline ac13be7)

### 부채 명세

StoreSettings 모델에 출고지/반품지 addressBookNo 전용 컬럼 부재. addressbooks route가 `asGuide` String field에 JSON으로 임시 캐싱했고 (코드 코멘트 'until schema migration adds dedicated columns' 명시), products/register가 그것을 JSON.parse → Number 변환. 결과: asGuide의 본래 용도(AS 안내문) 침범 + 정형 read/write 불가 + 동시성 시 JSON corruption 위험.

### 해소 (동 turn)

1. prisma schema: releaseAddressId VARCHAR(40) / returnAddressId VARCHAR(40) / addressbookSyncedAt Timestamp 3컬럼 신설 (전부 nullable, backward-compatible).
2. Supabase ALTER TABLE 적용 (IF NOT EXISTS).
3. addressbooks GET: 정식 컬럼에 저장. 부분 성공도 wipe 0(한쪽만 성공 시 다른쪽 보존).
4. products/register + batch-register: 정식 컬럼 read. 미설정 시 400 + RESEARCH §3 출처 명시.
5. asGuide JSON cache 코드 경로 제거 (read/write 0).

### SOURCE

Code 2026-06-02 P0 발행 선결 turn — Desktop 달항아리 발행 시도 중 store_settings 주소 EMPTY 발견 → RESEARCH §3 정정 후 정식 컬럼화.

---

## DEBT-06 — batch-register raw SQL `SELECT key, value FROM store_settings` schema mismatch

**Status**: RESOLVED (2026-06-02 등록 + 동 turn 해소)
**Severity**: medium (배치 발행 라우트가 항상 0 IDs 사용 → 미실호출 시 잠복)
**Owner**: Code 2026-06-02 P0 발행 선결 turn

### 부채 명세

src/app/api/products/batch-register/route.ts:63 `SELECT key, value FROM store_settings WHERE key IN ('shipping_address_id', 'return_address_id')`. StoreSettings는 single-row id-fixed 모델로 key/value 컬럼이 없음 → 실 호출 시 PG error → `.catch(() => [])`로 무음 → shippingAddressId/returnAddressId 0 → 네이버 페이로드 깨짐(아직 batch 실호출 0건이라 잠복).

### 해소 (동 turn)

DEBT-05 정식 컬럼 신설과 동시에 batch-register를 `prisma.storeSettings.findFirst({ select: { releaseAddressId, returnAddressId } })`로 정정. dryRun=false 시 미설정 사전 400 가드 추가.

### SOURCE

Code 2026-06-02 P0 발행 선결 turn — DEBT-05 마이그레이션 중 batch-register 경로 정독에서 발견.

## DEBT-07 — 공통 콘텐츠 슬롯 4칸 셀프편집 UI 부재 (2단계)

**Status**: OPEN (2026-06-02 등록, 1단계 schema+코드만 출하)
**Severity**: low (현 슬롯 nullable로 미설정 시 영향 0)
**Owner**: 발행 통과 후 별도 turn

### 부채 명세

StoreSettings에 noticeTopImageUrl/noticeTopText/noticeBottomImageUrl/noticeBottomText 4컬럼 신설했고 buildDetailContent가 값 있을 때 자동 렌더하나, 앱에서 값 수정 UI 부재. 대표가 이미지 교체/텍스트 변경 시 DB 직접 UPDATE 또는 개발자 호출 필요.

### 2단계 설계 (별도 turn)

- /settings/common-notice 페이지: 4슬롯 미리보기 + 이미지 드래그업로드 + 텍스트 textarea + 저장 버튼
- 이미지 업로드 = supabase product-assets/common/notice-top.jpg / notice-bottom.jpg upsert (고정 경로)
- 저장 = StoreSettings 4컬럼 UPDATE
- 변경 즉시 전 상품 detailContent 갱신 (대표 직접 교체 가능, 개발자 호출 0)

### SOURCE

Code 2026-06-02 P0 발행 1단계 turn — HANDOFF_common_image_slot_publish_payload §3 설계.

---

## DEBT-08 — 카테고리별 정보고시 유형 자동검증 ("상품군 단건 조회" API)

**Status**: OPEN (2026-06-02 등록, 현재 ETC 하드코딩으로 동작)
**Severity**: medium (ETC가 가구/인테리어 50000963에 적합하나 다른 카테고리에선 부적합 가능)
**Owner**: 발행 통과 + 다른 카테고리 상품 등록 시도 시 turn

### 부채 명세

buildProductInfoProvidedNoticeEtc는 모든 상품에 ETC 유형을 강제. RESEARCH §3에 의하면 v2.23.0(2024-02-07) "상품정보제공고시 상품군 단건 조회" API가 categoryId 기준으로 필수 유형/필드 스키마 반환. 가구·의류·식품 등 다른 카테고리 등록 시 ETC가 적합하지 않을 수 있고, 네이버가 강제하는 유형으로 자동 매핑 필요.

### 수술 권고 시점

- **발행 1건 통과 후** — ETC 적합성이 입증된 다음에 다른 카테고리(의류/식품) 상품 등록 시도 시
- 권고: NaverProductInfoProvidedNotice 빌더를 categoryId 기반 dispatch로 확장 (ETC/WEAR/FURNITURE/FOOD 각각 헬퍼) + "상품군 단건 조회" API 호출로 필수필드 사전 검증

### SOURCE

Code 2026-06-02 P0 발행 1단계 turn — RESEARCH_naver_productinfo_notice_api §3 4단계 권고.

## DEBT-09 — Tailscale Funnel proxy 헬스체크 동선 부재

**Status**: OPEN (2026-06-02 등록, P0 발행 회선 수정 turn 중 발견)
**Severity**: high (proxy 다운 = 모든 네이버 호출 영구 실패 = 발행 0)
**Owner**: 발행 통과 후 별도 turn (또는 Sprint 6 인프라 운영)

### 부채 명세

Vercel production → Tailscale Funnel proxy(home computer) → 네이버 Commerce API 회선 구조 (api-client.ts Mode 1). proxy 자체가 다운/재시작/회선 끊김 시 모든 네이버 호출이 ECONNRESET으로 영구 실패. 본 turn 시점 검증에서 GET /api/naver/addressbooks + GET /api/dashboard/stats 모두 502 attempts=3 NETWORK_RESET 단정 → proxy 측 장애 강하게 의심. 그러나 Code 측에서 proxy 헬스체크 동선 0 — 대표가 home computer 직접 확인할 때까지 진단 멈춤.

### 수술 권고 동선

- GET /api/naver/proxy-health 라우트 신설 — proxy URL에 단순 ping 요청 (네이버 API 호출 0) → proxy 응답 시간/상태 단정
- 또는 Vercel cron(/api/cron/proxy-health, 5분 간격)으로 백그라운드 ping + 다운 감지 시 Discord webhook 알림
- 대표가 home computer 점검 안 해도 자동 감지/통보 가능

### SOURCE

Code 2026-06-02 P0 발행 회선 수정 turn — api-client.ts fetchNoKeepAlive 출하 후 사후 검증에서 GET까지 ECONNRESET 발견.

---

## DEBT-10 — batch-register `category:'uncategorized'` 하드코딩 (정리 후보)

**Status**: OPEN (2026-06-04 등록, Desktop 후속 정리 turn 중 기록)
**Severity**: lowest (현재 무해 — 게이트가 naverCategoryCode 별도 컬럼을 read하므로 'uncategorized' literal은 미사용)
**Owner**: 발행 통과 후 chore turn (즉시 수술 불요)

`src/app/api/crawl/batch-register/route.ts`의 `category:'uncategorized'` 하드코딩은 발행 게이트가 별도 `naverCategoryCode` 컬럼을 읽어 판정하므로 현재 동작 영향 0. 정리 시 실제 카테고리 코드로 치환 또는 필드 제거 검토. 코드 변경 0 — 정리 후보로만 등재.

**SOURCE**: Code 2026-06-04 Desktop 후속 정리 turn (작업3, 코드 미접촉 기록 전용).

## DEBT-11 — 영구 적재 자산 cache-control: no-cache (로딩 속도/전환율)

**Status**: OPEN (2026-06-04 등록, 빌더 STEP5 점검서 실측 확인)
**Severity**: medium (상세페이지/이미지 로딩 매 요청 재페치 → 체감 속도·전환율 손해, 기능 영향 0)
**Owner**: Desktop(프로덕션 스토리지 mutation은 #41상 Desktop) — 재업로드 또는 버킷 정책

### 부채 명세

scripts/preserve-myeonghwa-assets.mjs가 upload 시 `cacheControl: '31536000'`(1년)을 지정했으나, 실측(curl -I) 결과 product-assets 공개 URL 응답 헤더가 `cache-control: no-cache`로 나옴 → cacheControl 옵션이 실효되지 않음. 명화 디퓨저 3종(main/cutout/backdrop) 모두 해당. CDN(Cloudflare) 앞단 + Supabase Storage 객체 메타데이터 cache-control 미적용 의심.

### 점검/수술 권고 (Desktop)

1. 원인 확인: upsert 덮어쓰기 시 메타데이터(cache-control) 미갱신 가능성 — 객체 삭제 후 신규 업로드로 cacheControl 재적용 시도.
2. 또는 Supabase 버킷 레벨 기본 cache-control 정책 설정(대시보드/Storage 설정).
3. 재적용 후 `curl -sI <public-url> | grep cache-control`로 `max-age=31536000` 확인.
★ 프로덕션 스토리지 mutation → Code 미실행, Desktop 위임(#41). 기능 영향 0이라 발행 차단 아님.

**SOURCE**: Code 2026-06-04 빌더 하이브리드 STEP5 캐시 점검 turn (no-cache 실측 확인).
