# 핸드오프: 프롬프트 자산화 엔진 (DB 적용 완료 → 코드 동기화)

> 작성: 2026-05-21 / 시니어(Claude Web) → Claude Code
> Target Session: claude-code (CLI)
> Branch: feature/prompt-asset-engine
> 상태: **Supabase DB 마이그레이션은 시니어가 이미 적용 완료.**
>        Claude Code는 schema.prisma 동기화 + 어댑터 코드만 작성.
> 근거: docs/research/AI_IMAGE_PROMPT_STRATEGY_2026_05.md 섹션 4

---

## 0. CRITICAL — DB가 먼저 변경됨 (코드가 따라가야 함)

시니어가 Supabase MCP로 `art_director_prompts` 테이블을 **이미 확장**했다.
신규 테이블 생성 X — 기존 테이블에 컬럼 추가 (중복 회피, 두 번 측정 결과).
**Claude Code는 절대 새 migration으로 이 컬럼들을 다시 만들지 말 것.**
대신 `prisma db pull`로 실제 DB를 schema.prisma에 역동기화.

### 작업 전 점검
```bash
git rev-parse HEAD origin/main && git status --short && git stash list
npx prisma db pull --print   # 실제 DB와 schema.prisma 차이 미리보기 (적용 X)
```

### 동기화 절차
```bash
# 1. DB → schema.prisma 역동기화 (시니어가 추가한 컬럼 반영)
npx prisma db pull

# 2. schema.prisma diff 확인 — art_director_prompts 모델에
#    아래 신규 필드들이 들어왔는지 확인:
#    model, modelVersion, intentTag, modelSpecificPrompt, seed,
#    resolution, referenceImageIds(Json), legalFlags(Json),
#    businessMetrics(Json), metricsRefreshedAt, parentPromptId,
#    deprecated, deprecationReason, updatedAt
#    + self-relation (parentPromptId → art_director_prompts.id)

# 3. Prisma Client 재생성
npx prisma generate

# 4. 타입 확인
npx tsc --noEmit   # 0 에러 필수
```

> 주의: db pull은 기존 @map, @@map, 관계명을 덮어쓸 수 있음.
> diff를 꼼꼼히 보고, 기존 camelCase 매핑이 깨지면 수동 복원.
> 특히 self-relation은 db pull이 이름을 자동생성하므로 의미있는 이름으로 교정:
>   parent  ArtDirectorPrompt?  @relation("PromptLineage", fields:[parentPromptId], references:[id])
>   children ArtDirectorPrompt[] @relation("PromptLineage")

---

## 1. 실제 적용된 DB 스키마 (검증 완료 — 이게 진실)

`art_director_prompts` 28개 컬럼 (기존 14 + 신규 14):

기존 (재사용):
  id, product_id, category_hint, concept_axes(jsonb), prompt,
  negative_prompt, aspect_ratio, image_informed, status,
  strategic_role, seller_used, seller_rating, result_image_url, created_at

신규 (시니어 추가):
  model (varchar, default 'firefly-image-5')
  model_version (varchar)
  intent_tag (varchar)
  model_specific_prompt (text)
  seed (bigint)
  resolution (varchar, default '2K')
  reference_image_ids (jsonb, default '[]')
  legal_flags (jsonb, default {containsVirtualPerson,textInImage,
    realProductPhotoUsed:true,synthidPresent,contentCredentialsPresent})
  business_metrics (jsonb, default '{}')
  metrics_refreshed_at (timestamptz)
  parent_prompt_id (text, self-FK → id, ON DELETE SET NULL)
  deprecated (boolean, default false)
  deprecation_reason (text)
  updated_at (timestamptz, default now())

인덱스: idx_adp_intent_category(intent_tag,category_hint),
        idx_adp_model(model), idx_adp_deprecated(deprecated)

---

## 2. 모델 어댑터 레이어 (src/lib/art-director/model-adapters/)

기존 prompt-translator.ts 확장 또는 신규.
5 intent × 3 model = 15 템플릿. 핵심 3모델 우선.

### 2-1. 타입 (model-adapter.types.ts) — English comments only
```typescript
export type ImageIntent =
  | 'lifestyle_room_set'
  | 'kitchen_top_down'
  | 'studio_packshot_white'
  | 'detail_macro'
  | 'season_holiday_variant';

export type ImageModel =
  | 'firefly-image-5'
  | 'nano-banana-pro'
  | 'gpt-image-2'
  | 'flux-2-pro';

export interface AdapterInput {
  productName: string;
  productCategory: string;
  colorMood: string;
  brandKeyword?: string;
  referenceImageUrls?: string[];
}

export interface AdapterOutput {
  model: ImageModel;
  prompt: string;
  negativePrompt?: string;
  uiParams?: Record<string, string>;
  referenceImages?: string[];
  notes?: string;
}
```

### 2-2. 모델별 작성 규칙 (리서치 3-4)
- Firefly: 짧고 명시적 + UI 파라미터 분리 (Aesthetic, Style intensity)
- Nano Banana Pro: 대화형 멀티턴 + 참조이미지 + "유지요소 명시"
  ("Keep the product shape, branding, and details exact")
- GPT Image 2: 의도·맥락·제약 서술, 텍스트는 따옴표
- FLUX: 구조화 다단 + negative prompt

전환율 공식: [제품+재질+색] + [환경] + [조명] + [카메라/렌즈/앵글] + [스타일]
키워드: soft window light/golden hour/softbox · 35mm/50mm/macro/flat lay/shallow DOF
        · hygge/Scandinavian/Japandi/editorial/warm pastel
        · rule of thirds/negative space for copy

### 2-3. 예시는 AI_IMAGE_PROMPT_STRATEGY_2026_05.md 섹션 4-3 그대로 이식

---

## 3. legal-lint 모듈 (src/lib/automation/legal-lint.ts)

기존 dark_pattern_lint_logs 테이블 + copy-writer.ts와 연동.
표시광고법 제3조 금지표현 사전:
- 최상급: 최고/단 하나/1위/유일 (근거 없을 시)
- 의학·기능성: 체온/치료/항균 (실증 없을 시)
- 절대성: 100%/완벽/영구
- 비교단정: 에어컨 대체
- 조건부 허용: "덮는 순간" 등 조건부는 통과

검수 4체크 (게이트5): 실물일치 / 가상인물 / 어뷰징텍스트 / AI메타데이터

---

## 4. 커밋 (작업원칙 #17, 한글 .commit-msg.tmp 경유)
```
feat(art-director): art_director_prompts 프롬프트 자산화 확장 동기화

- DB는 Supabase MCP로 선적용됨 (시니어). 코드는 db pull로 동기화
- 모델 라우팅(model/intent/seed/resolution/refs) + legal_flags
  + business_metrics(CTR/CVR) + lineage(parent_prompt_id)
- 모델 어댑터 5 intent x 3 model 레이어
- legal-lint 표시광고법 검수 모듈
- 근거: AI_IMAGE_PROMPT_STRATEGY_2026_05.md
```

---

## 5. 완료 후 핸드백 (Target Session: claude-web)
- prisma db pull diff 결과 + tsc 0에러 확인
- 다음: 시드 프롬프트 입력 (리빙/홈데코/잡화 각 30~40개)

---

## 6. 별건 — RLS 보안 (오늘 작업과 분리, 나중에)
Supabase가 27개 테이블 RLS 비활성화 critical 경고.
anon 키로 전체 데이터 접근 가능. 단 RLS 켜면 정책 없이는 앱 중단.
→ 별도 작업으로 분리. 1인 셀러 단일 사용자라 우선순위는 중간.
   추후 service_role 기반 정책 설계 후 일괄 적용.

---

(끝 — DB는 적용됨. 코드 동기화는 안전하게 CLI에서.)
