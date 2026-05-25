# 핸드오프 STEP 1-B: db pull 우회 — 수동 schema.prisma 패치

> 작성: 2026-05-22 / 시니어(Claude Web) → Claude Code
> Target Session: claude-code / Branch: feature/prompt-asset-engine
> 배경: DB 직통 인증(.env DATABASE_URL 비번) stale → db pull 실패(P1000).
>        BUT Supabase MCP는 정상. 시니어가 MCP로 실제 스키마 26컬럼 정밀 조회함.
>        → db pull 대신 이 명세대로 schema.prisma를 손으로 패치 (우회 경로).
> 검증: 아래는 information_schema.columns 실조회 결과 (DB의 진실, 2026-05-22).

---

## 0. 왜 우회하나 (정직한 상황)

- Code의 db pull P1000 = .env DATABASE_URL 비밀번호가 회전됨(stale).
- 비밀번호 리셋은 앱 운영(Vercel)에도 영향 → 별건으로 분리(섹션 3).
- 지금은 시니어 MCP 조회 결과로 schema.prisma 수동 동기화가 가장 빠르고 안전.

---

## 1. art_director_prompts — 실제 DB 26컬럼 (MCP 검증)

기존 schema.prisma의 ArtDirectorPrompt 모델에 아래 신규 필드 14개를 추가.
(기존 14컬럼은 이미 모델에 있을 것 — model 이하만 추가하면 됨)

전체 모델 정의 (이대로 schema.prisma에 반영):

```prisma
model ArtDirectorPrompt {
  // ── 기존 14컬럼 (이미 존재할 가능성 높음, 매핑 확인만) ──
  id                  String   @id @default(dbgenerated("(gen_random_uuid())::text"))
  productId           String?  @map("product_id")
  categoryHint        String   @map("category_hint")
  conceptAxes         Json     @map("concept_axes")
  prompt              String
  negativePrompt      String?  @map("negative_prompt")
  aspectRatio         String?  @default("1:1") @map("aspect_ratio") @db.VarChar
  imageInformed       Boolean  @default(false) @map("image_informed")
  status              String   @db.VarChar
  strategicRole       String?  @map("strategic_role") @db.VarChar
  sellerUsed          Boolean  @default(false) @map("seller_used")
  sellerRating        Int?     @map("seller_rating")
  resultImageUrl      String?  @map("result_image_url")
  createdAt           DateTime @default(now()) @map("created_at") @db.Timestamptz

  // ── 신규 14컬럼 (시니어 추가, MCP 검증완료) ──
  model               String?  @default("firefly-image-5") @db.VarChar
  modelVersion        String?  @map("model_version") @db.VarChar
  intentTag           String?  @map("intent_tag") @db.VarChar
  modelSpecificPrompt String?  @map("model_specific_prompt")
  seed                BigInt?
  resolution          String?  @default("2K") @db.VarChar
  referenceImageIds   Json?    @default("[]") @map("reference_image_ids")
  legalFlags          Json?    @default("{\"textInImage\": false, \"synthidPresent\": false, \"realProductPhotoUsed\": true, \"containsVirtualPerson\": false, \"contentCredentialsPresent\": false}") @map("legal_flags")
  businessMetrics     Json?    @default("{}") @map("business_metrics")
  metricsRefreshedAt  DateTime? @map("metrics_refreshed_at") @db.Timestamptz
  parentPromptId      String?  @map("parent_prompt_id")
  deprecated          Boolean? @default(false)
  deprecationReason   String?  @map("deprecation_reason")
  updatedAt           DateTime? @default(now()) @map("updated_at") @db.Timestamptz

  // ── self-relation (lineage) ──
  parent              ArtDirectorPrompt?  @relation("PromptLineage", fields: [parentPromptId], references: [id], onDelete: SetNull)
  children            ArtDirectorPrompt[] @relation("PromptLineage")

  @@index([intentTag, categoryHint], map: "idx_adp_intent_category")
  @@index([model], map: "idx_adp_model")
  @@index([deprecated], map: "idx_adp_deprecated")
  @@map("art_director_prompts")
}
```

> 주의:
> - 기존 모델에 이미 14컬럼이 매핑돼 있으면, `// 신규 14컬럼` 블록 + relation + index만 추가.
> - 기존 필드명이 다르게 매핑돼 있으면(예: camelCase 차이) 기존 것 유지하고 신규만 병합.
> - BigInt 타입: seed는 BigInt? — 앱 코드에서 Number 변환 시 주의(직렬화).

---

## 2. 적용 절차 (db pull 없이)

```bash
# 1. schema.prisma에 위 모델 반영 (수동 편집)
# 2. Prisma Client 생성 (DB 접속 불필요 — 스키마만 읽음)
npx prisma generate
# 3. 타입 확인
npx tsc --noEmit   # 0 에러 목표
```

> npx prisma generate는 DB 접속이 필요 없음 (schema.prisma만 읽어 Client 생성).
> 따라서 비밀번호 stale 상태에서도 STEP 1 완료 가능.
> 단, 실제 INSERT/마이그레이션(STEP 3 seed)은 DB 접속 필요 → 섹션 3 먼저 해결.

---

## 3. 별건 — DB 비밀번호 동기화 (STEP 3 전까지 해결 필요)

STEP 1(타입)·STEP 2(어댑터 코드)는 DB 접속 없이 가능.
STEP 3(seed INSERT)부터 DB 접속 필요 → 그 전에 비밀번호 갱신.

방법 A (권장, 안전):
  - 시니어(Web)가 Supabase MCP로 seed-prompt-templates.sql 직접 실행 가능.
    → Code가 .env 손댈 필요 없음. STEP 3을 시니어가 대행.
방법 B:
  - 대표님이 Supabase Dashboard → Settings → Database → Reset password
  - .env / .env.local 의 DATABASE_URL, DIRECT_URL 비번 갱신
  - 단 Vercel 환경변수도 같이 갱신해야 운영 안 깨짐 (Vercel MCP로 시니어 확인 가능)

> 권장: 방법 A. STEP 3 seed는 시니어가 MCP로 실행하고,
>   비밀번호 리셋은 운영 점검 때 별도로. (지금 리셋하면 Vercel 운영 영향 점검 필요)

---

## 4. Code 핸드백 양식 (STEP 1-B 완료 후)
```
[CODE 핸드백 / STEP 1-B]
- schema.prisma 패치: (성공/실패)
- npx prisma generate: (성공/실패)
- npx tsc --noEmit: (에러 0 / N개)
- git status --short: (출력)
```

---

(끝 — 인증 우회. 타입은 DB 없이 통과 가능. seed는 시니어 MCP 대행 권장.)
