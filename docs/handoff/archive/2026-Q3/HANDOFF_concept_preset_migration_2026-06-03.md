# 핸드오프 — 컨셉 프리셋 Supabase 마이그레이션 (2026-06-03)

> Target: 🖥 Desktop (apply) | From: 💻 Code | baseline 4c52141
> 사유: `prisma/migrations`는 .gitignore(line 21) 대상 → 마이그레이션 SQL이 git으로 전달되지 않음.
> 기존 패턴(다른 마이그레이션도 동일)대로 **Supabase MCP `apply_migration`** 으로 적용. 이 문서가 그 단일 소스.

---

## ★ 적용 순서 (중요 — 역순 시 production 장애)

schema.prisma에 신규 3컬럼(`concept_preset`/`preset_intensity`/`preset_overrides`)이 이미 반영됨.
이 schema가 **Vercel에 배포되기 전에** 아래 ALTER가 Supabase에 적용돼 있어야 함.
역순(배포 먼저)이면 production DB에 컬럼이 없어 Prisma의 모든 Product 쿼리(`findMany` 등)가
`column "concept_preset" does not exist`로 깨짐 (전 상품 페이지 500).

올바른 순서:
1. **Desktop**: 아래 SQL을 Supabase `apply_migration`으로 적용.
2. **Desktop**: `information_schema.columns`로 3컬럼 존재 + drift 0 확인.
3. 그 후 Code 변경 commit/push → Vercel 배포 안전.

---

## 적용할 SQL (멱등 — 재실행 안전, 기존 행 미변경)

migration name: `20260603_add_concept_preset`

```sql
ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS concept_preset   VARCHAR(20) NOT NULL DEFAULT 'kitchen',
  ADD COLUMN IF NOT EXISTS preset_intensity VARCHAR(10) NOT NULL DEFAULT 'l1',
  ADD COLUMN IF NOT EXISTS preset_overrides JSONB;
```

(로컬 사본: `prisma/migrations/20260603_add_concept_preset/migration.sql` — gitignore라 git 미전달, 내용 동일.)

---

## 컬럼 의미 (권위: docs/design/CONCEPT_PRESET_SYSTEM.md §6-A, src/lib/design/concept-presets.ts)

| 컬럼 | 타입 | 기본값 | 허용값 |
|---|---|---|---|
| `concept_preset` | VARCHAR(20) | `'kitchen'` | `'aroma'` / `'gift'` / `'tradition'` / `'kitchen'` / `'pet'` |
| `preset_intensity` | VARCHAR(10) | `'l1'` | `'l1'` / `'l2'` / `'l3'` |
| `preset_overrides` | JSONB | NULL | `{ "accent": "#...", "hero_copy": "..." }` 커스터마이징 슬롯 |

- 값 검증은 앱 레이어(`src/lib/design/concept-presets.ts`의 타입가드/normalize)에서 수행 — DB CHECK 제약은 두지 않음(프리셋 추가 시 마이그레이션 불필요하도록).
- SEO 컬럼과 **직교**(CONCEPT_PRESET_SYSTEM.md §7): 프리셋은 상세페이지 body 비주얼만 제어, 상품명/대표이미지/카테고리 검증과 무관.

---

## 검증 후 (Desktop)

ALTER 적용 + drift 0 확인 → Code 변경 push 안전 신호 → 채팅 A(명화 디퓨저 aroma L3 상세페이지 첫 레퍼런스) 진입.
