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
