# PRODUCT-LINK PL-1 — 선택적 임포트 + 읽기전용 pull MVP 상세 스펙 (2026-07-06)

Authoring: DESKTOP. 구현=Code. 권위: 본 문서 + PRODUCT_LINK_BIDIRECTIONAL_SYNC_RESEARCH_2026-07-06.md(§1~8) + prisma/schema.prisma(실측) + api-client.ts(getProduct/diffNaverProduct/updateStock). 원칙 #55/#181/#46/#196~#199.
전제: 워크스트림 등재·recon 완료(036ac24). naverProductId=String?(@unique 아님), 링크필드 전무=greenfield. **PL-1 = 네이버 쓰기 0(GET/search만)·안전 시작**.

================================================================
## 0. PL-1 범위 (MVP·쓰기 위험 0)
================================================================
- **선택연동**: (a) 내 스토어 판매중 상품 목록 브라우즈+체크박스 + (b) 상품번호 직접입력 → 앱에 임포트(로컬 DB upsert).
- **읽기전용 pull/표시**: 연동 상품의 재고·가격·상태를 네이버에서 조회해 표시(diff 포함). push 0.
- **신규 발행 자동편입 훅**: 앱 발행 시 originProductNo→naverProductId 저장 + source=NATIVE·LINKED (배선만·PL-5 완성).
- 제외(후속): 상태/가격/상세 push(PL-2~4), cron 자동 pull(PL-5).

================================================================
## 1. Prisma 스키마 확장 (greenfield·additive·reverse-deploy-safe)
================================================================
Product에 8필드 추가. **Desktop이 Supabase ALTER 선행(MCP) → Code가 schema.prisma 동기화**. 소비 코드는 P2022/P2021 가드(마이그레이션 前 안전).

```prisma
naverProductId    String?   @unique                          // = originProductNo (기존 String? → @unique)
channelProductNo  String?   @map("channel_product_no")        // URL 노출값·직접입력 매칭
source            String    @default("NATIVE") @map("source")        // NATIVE | IMPORTED
linkStatus        String    @default("UNLINKED") @map("link_status") // LINKED | UNLINKED
naverModifiedAt   DateTime? @map("naver_modified_at")         // 네이버 modifiedDate 캐시(drift 기준)
lastSyncedAt      DateTime? @map("last_synced_at")
syncHash          String?   @map("sync_hash")                 // 마지막 관측 payload 해시(에코 방지·PL-2+)
syncState         String    @default("SYNCED") @map("sync_state")    // SYNCED | PENDING | CONFLICT | FAILED
```

**Supabase ALTER DDL (Desktop 적용)**:
```sql
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS channel_product_no text;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'NATIVE';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS link_status text NOT NULL DEFAULT 'UNLINKED';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS naver_modified_at timestamp;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS last_synced_at timestamp;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS sync_hash text;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS sync_state text NOT NULL DEFAULT 'SYNCED';
-- 백필: 기존 상품 = 앱 네이티브. 네이버 등록분은 LINKED.
UPDATE "Product" SET link_status='LINKED' WHERE "naverProductId" IS NOT NULL;
-- @unique: 현재 non-null naverProductId 중복 없음(명화 1건만) → 안전.
CREATE UNIQUE INDEX IF NOT EXISTS "Product_naverProductId_key" ON "Product"("naverProductId");
```
★적용 순서(#181·드리프트 방지): Code가 가드 코드 준비 → Desktop이 ALTER 적용 → Code가 schema 동기화+build. Desktop이 적용 시점을 인계로 알림.

================================================================
## 2. API (읽기전용·네이버 GET/search만)
================================================================
1. **GET `/api/naver/products/search?page=&size=&status=SALE`** — 내 스토어 상품 목록.
   - verify-first(#181): `POST /v1/products/search`(body·페이지) 프록시 경유. 응답 shape(Spring Page: contents/page/size/totalElements)·size 상한(리서치 §8·out-of-range 400 테스트로 확인) 실측 후 배선.
   - 반환(정규화): `{ channelProductNo, originProductNo?, name, salePrice, stockQuantity, statusType, representativeImageUrl, modifiedDate, alreadyLinked:boolean }`.
2. **POST `/api/products/import`** — body `{ items: [{ channelProductNo? , originProductNo? }] }`.
   - 각 항목: (직접입력이 channel이면) `GET /channel-products/{no}`로 originProductNo 정규화 → `getProduct(originProductNo)` 상세 → 앱 Product 스키마 매핑 → upsert(naverProductId=originProductNo, channelProductNo, source=IMPORTED, linkStatus=LINKED, naverModifiedAt=modifiedDate, lastSyncedAt=now, syncState=SYNCED).
   - 중복: naverProductId @unique 존재 시 → skip + "이미 연동됨" 리포트(재임포트 갱신은 옵션).
   - 부분 실패 정직 표기(#82): `{ imported:[], skipped:[{no,reason}], failed:[{no,error}] }`.
3. **GET `/api/products/[id]/naver-sync`** — 연동 상품의 네이버 현재값 vs 앱값 diff.
   - `diffNaverProduct(naverProductId, {name,salePrice,stockQuantity,statusType,representativeImageUrl})` 재사용 → `{ inSync, diffs[], naverSnapshot }` 표시용.
   - PL-1 = 표시만(해소 버튼 없음). 재고 diff는 "네이버 기준"으로 안내(#197).

**네이버 상세→앱 매핑(임포트 변환)**: name, salePrice, stockQuantity, statusType→naver_status_type, representativeImage→mainImage, optionalImages→images, detailContent→description(또는 표시전용), optionInfo→hasOptions/options/optionName, originAreaInfo→naver_origin, leafCategoryId→naverCategoryCode. 매핑 불가 필드는 빈값+"네이버 원본 참조" 표기(무날조 #82).

================================================================
## 3. UI/UX — 유료 SaaS급 깔끔 구조 (운영자 강조)
================================================================
신규 화면 **"상품 연동"**(products 영역 내 탭 또는 전용 페이지). 시선 흐름: 좌→우, 상→하 3존.

- **존 1 — 연동 진입(상단)**: 2개 카드 나란히.
  - [내 스토어에서 불러오기] → 목록 모달(체크박스·페이지네이션·검색). "이미 연동됨" 항목은 비활성+배지.
  - [상품번호로 연동] → 인풋(쉼표/줄바꿈 다건) + [연동] 버튼. 진행상태 인라인.
- **존 2 — 연동 상품 리스트(본문·핵심)**: 유료 SaaS급 테이블/카드.
  - 컬럼: 썸네일 · 상품명 · 가격 · 재고 · 상태(SALE/SUSPENSION/OUTOFSTOCK 색배지) · **연동유형(IMPORTED/NATIVE 배지)** · **동기화상태(SYNCED/CONFLICT/PENDING 칩)** · 최근동기화.
  - 필터: 전체 / 연동됨(LINKED) / 앱 네이티브(NATIVE) / 충돌(CONFLICT).
  - 행 클릭 → 우측 패널에 네이버 vs 앱 diff(존 3).
- **존 3 — diff 상세(우측 슬라이드 패널)**: 필드별 네이버값·앱값 나란히 + SoR 표시(재고=네이버·가격=앱). PL-1은 읽기만(push 버튼은 PL-2+에서 활성).
- 시각 규칙: IMPORTED=파란 계열 배지·NATIVE=브랜드레드 계열. SYNCED=중립·CONFLICT=경고색·PENDING=진행색. 이모지0·Lucide·한글 i18n 격리(#3-1). Retro Pop Garden 톤 유지하되 정보 밀도 높은 대시보드 레이아웃.

================================================================
## 4. 안전장치 (PL-1)
================================================================
- 네이버 쓰기 0(GET/search만) → 비가역 위험 없음(#46 무관).
- 재임포트 중복 = naverProductId @unique 차단.
- 부분 실패 상품별 정직 표기(#82).
- 국내 IP = 기존 프록시(리서치 §1.6). Rate limit = 목록/상세 조회도 Queue·429 백오프(#199).
- 매핑 불가 필드 날조 금지 — 빈값+원본참조 표기.

================================================================
## 5. 검증 (Code 로컬 → Desktop prod)
================================================================
- Code: search API 응답 정규화·import upsert(source/linkStatus 세팅)·diff 표시. tsc0/build0. 로컬에서 mock/실계정 1건 임포트 라운드트립.
- Desktop(prod·#45): (a) 목록 불러오기 렌더·체크박스 임포트 (b) 상품번호 직접입력 임포트(channel→origin 정규화) (c) 임포트 상품 IMPORTED 배지·재고·가격·상태 표시 (d) 재임포트 중복 차단 (e) diff 패널 네이버vs앱 (f) 콘솔0. ★실계정 조회라 읽기 전용이라도 실데이터 — 임포트 결과는 로컬 DB만 변경(원복 가능).

================================================================
## 작업 유의사항/원칙
================================================================
- PL-1은 **읽기 전용 시작**(SF-1·JOURNAL-1 패턴) — 쓰기(push)는 PL-2+에서 SoR·GET-merge로.
- #196~#199 준수: full-replace 대비 GET-merge는 push 단계(PL-2+)에서, PL-1은 import 매핑·중복차단·식별자 유형 저장에 집중.
- 스키마 확장은 additive+가드(P2022) — 마이그레이션 순서 지켜 드리프트 방지(#181).
- 신규 발행 자동편입은 PL-1에서 훅만(발행 route가 originProductNo를 naverProductId+source=NATIVE로 저장), 완성은 PL-5.
