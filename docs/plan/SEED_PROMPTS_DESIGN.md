# 시드 프롬프트 자산 설계 (리빙/홈데코/잡화)

> 작성: 2026-05-21 / Co-Founder(시니어)
> Target: art_director_prompts 테이블 시드 데이터
> 근거: AI_IMAGE_PROMPT_STRATEGY_2026_05.md 섹션 3-3, 3-4, 4-3
> 목적: 5 intent x 3 model 어댑터 + 카테고리별 전환율 프롬프트
> 사용: Claude Code가 db pull 동기화 후, 이 데이터를 seed script로 INSERT

---

## 0. 설계 원칙

전환율 공식: **[제품+재질+색] + [환경] + [조명] + [카메라/렌즈/앵글] + [스타일]**

모델별 작성 규칙:
- **Firefly**: 짧고 명시적 + UI 파라미터 분리. 영문. "no text in image" 명시.
- **Nano Banana Pro**: 대화형 + 참조 + "Keep product shape/branding/details exact" 필수.
- **GPT Image 2**: 의도·맥락·제약 서술. "do not alter product geometry or color".

공통 negative: "blurred product, distorted text, low resolution, watermark,
extra fingers, unrealistic shadows, color shift on product, AI artifacts"

법적 기본값 legal_flags: realProductPhotoUsed=true (배경만 AI 원칙).
인물 등장 intent는 containsVirtualPerson 경고 플래그.

---

## 1. 5개 의도(intent) 정의

| intent_tag | 용도 | 주력 카테고리 | 인물 |
|---|---|---|---|
| studio_packshot_white | 누끼/단독컷(썸네일용) | 전체 | X |
| lifestyle_room_set | 공간 연출(거실/침실 배경) | 홈데코·리빙 | X(소품만) |
| kitchen_top_down | 탑다운 플랫레이 | 주방·잡화 | X |
| detail_macro | 재질·디테일 클로즈업 | 전체 | X |
| season_holiday_variant | 시즌·이벤트 변형 | 전체 | X |

> 인물 등장 컷은 공정위 가상인물 표시의무 리스크 → 시드에서 제외.
>   필요 시 별도 intent(lifestyle_with_model)로 분리하고 라벨 자동삽입.

---

## 2. 시드 프롬프트 (intent x model)

### 2-1. studio_packshot_white (썸네일용 단독컷)
공통 의도: 깨끗한 단색/화이트 배경 + 상품 단독 + 부드러운 그림자. 텍스트 없음.

**Firefly**:
```
[PRODUCT] on a clean seamless white background, soft even studio lighting,
subtle natural shadow beneath, centered composition, commercial product
photography, photoreal, sharp focus, 1:1, no text in image
```
UI: Aesthetic="Product", Style intensity=40%, Reference composition=center

**Nano Banana Pro**:
```
Place the [PRODUCT] on a clean white seamless studio background.
Keep the product shape, color, material, and branding exactly as in the
reference image. Soft even lighting, subtle realistic contact shadow,
centered, 1:1 ratio, photographic realism, no added text.
```
ref: [product_photo]

**GPT Image 2**:
```
Generate a studio product photograph of [PRODUCT] on a seamless white
background. Constraints: do not alter the product geometry, color, or
material; soft even studio light; subtle contact shadow; centered; 1:1;
no text in image; photographic realism.
```

### 2-2. lifestyle_room_set (공간 연출 — 홈데코/리빙)
공통 의도: 자연광 실내, 톤온톤 배경, 카피용 여백.

**Firefly**:
```
[PRODUCT] placed in a [COLOR_MOOD] Scandinavian living room, soft morning
window light, linen textures, editorial lifestyle photography, shallow
depth of field, eye-level, photoreal, 4:5, negative space on right for copy,
no text in image
```
UI: Aesthetic="Editorial", Style intensity=60%

**Nano Banana Pro**:
```
Place the [PRODUCT] in a sun-drenched [COLOR_MOOD] Scandinavian living room
scene. Keep the product shape, branding, and details exact. Soft morning
light from a window, linen and wood textures, cozy hygge atmosphere,
shallow depth of field, 4:5 ratio, leave negative space on the right for a
headline, photoreal lifestyle.
```
ref: [product_photo, moodboard]

**GPT Image 2**:
```
Generate a lifestyle photograph placing [PRODUCT] in a [COLOR_MOOD]
Scandinavian living room. Constraints: do not change product color or shape;
natural morning window light; realistic shadow and reflection; cozy editorial
mood; 4:5; negative space on the right for copy; no text in image.
```

### 2-3. kitchen_top_down (탑다운 플랫레이 — 주방/잡화)
공통 의도: 위에서 내려본 구도, 주변 소품, 정돈된 그리드감.

**Firefly**:
```
Top-down flat lay of [PRODUCT] on a [COLOR_MOOD] kitchen counter, fresh
ingredients scattered around, soft overhead softbox light, subtle shadow,
commercial food-adjacent styling, photoreal, 1:1, no text in image
```
UI: Aesthetic="Clean", Composition=overhead

**Nano Banana Pro**:
```
Create a top-down flat lay of the [PRODUCT] on a [COLOR_MOOD] kitchen
counter with a few fresh ingredients around it. Keep the product shape,
color, and details exact. Soft overhead light, subtle natural shadow,
clean modern composition, 1:1 ratio, photoreal.
```
ref: [product_photo]

**GPT Image 2**:
```
Generate a top-down flat lay photograph of [PRODUCT] on a [COLOR_MOOD]
kitchen counter with scattered fresh ingredients. Constraints: do not alter
product geometry or color; soft overhead light from above; realistic shadow;
clean grid composition; 1:1; no text in image; photographic realism.
```

### 2-4. detail_macro (재질·디테일 클로즈업)
공통 의도: 매크로 렌즈, 질감 강조, 얕은 심도.

**Firefly**:
```
Macro close-up of [PRODUCT] surface texture and material detail, soft
natural side light, visible fabric/material weave, shallow depth of field,
editorial product photography, photoreal, 4:5, no text in image
```
UI: Effect="Sharp detail", Composition=close-up

**Nano Banana Pro**:
```
Macro close-up showing the texture and material detail of the [PRODUCT].
Keep the exact material, color, and surface as the reference. Soft natural
side lighting, visible texture, shallow depth of field, 4:5, photoreal.
```
ref: [product_photo]

**GPT Image 2**:
```
Generate a macro close-up photograph of [PRODUCT] emphasizing material
texture and craftsmanship detail. Constraints: preserve exact material and
color; soft natural side light; shallow depth of field; 4:5; no text;
photographic realism.
```

### 2-5. season_holiday_variant (시즌·이벤트 변형)
공통 의도: 시즌 무드 소품, 계절 색감, 선물 맥락.

**Firefly**:
```
[PRODUCT] in a [SEASON] themed setting with seasonal props, [COLOR_MOOD]
palette, warm festive lighting, editorial lifestyle, photoreal, 4:5,
negative space for copy, no text in image
```
UI: Aesthetic="Editorial", Style intensity=65%

**Nano Banana Pro**:
```
Place the [PRODUCT] in a [SEASON] themed scene with subtle seasonal props
and a [COLOR_MOOD] palette. Keep the product shape, branding, and details
exact. Warm festive light, gift-giving mood, 4:5, negative space for a
headline, photoreal lifestyle.
```
ref: [product_photo, season_moodboard]

**GPT Image 2**:
```
Generate a [SEASON] themed lifestyle photograph of [PRODUCT] with seasonal
props and a [COLOR_MOOD] palette. Constraints: do not change product color
or shape; warm festive light; gift context; 4:5; negative space for copy;
no text in image.
```

---

## 3. 카테고리별 변수 치환 가이드 (리빙/홈데코/잡화)

| 카테고리 | COLOR_MOOD 예시 | 권장 intent 우선순위 |
|---|---|---|
| 디퓨저/캔들 | warm pastel, soft beige | lifestyle_room_set > detail_macro |
| 주방용품 | slate gray, fresh white | kitchen_top_down > studio_packshot |
| 수납/정리 | muted sage, clean white | lifestyle_room_set > studio_packshot |
| 패브릭/잡화 | warm ivory, dusty rose | detail_macro > lifestyle_room_set |
| 데코소품 | tonal neutral, soft cream | lifestyle_room_set > season_variant |

---

## 4. INSERT 설계 (Claude Code용)

15개 베이스 어댑터(intent x model)를 seed로 삽입.
- product_id = NULL (템플릿이므로)
- intent_tag, model, model_specific_prompt, negative_prompt, aspect_ratio
- category_hint = 'template' (실제 상품 적용 시 복제 후 카테고리 채움)
- legal_flags = 기본값 (realProductPhotoUsed=true)
- seller_used = false, deprecated = false
- status = 'template'

실제 사용 흐름:
1. 셀러가 상품+intent 선택
2. 해당 intent의 모델별 템플릿 복제 (parent_prompt_id = 템플릿 id)
3. [PRODUCT]/[COLOR_MOOD]/[SEASON] 치환
4. 생성 후 result_image_url + seller_rating 기록
5. 등록 후 business_metrics 자동 회수
6. 고득점 변형이 새 베이스 템플릿 후보 (lineage 추적)

---

(끝 — 15 베이스 템플릿이 셀러 사용으로 진화하는 구조)
