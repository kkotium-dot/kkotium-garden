-- ============================================================
-- Seed: art_director_prompts base templates (prompt asset engine)
-- ============================================================
-- Author: senior (Claude Web) 2026-05-22
-- Source: docs/plan/SEED_PROMPTS_DESIGN.md
-- Target: art_director_prompts (28-column schema, verified 2026-05-21)
-- Purpose: 15 base adapters (5 intent x 3 model) as reusable templates.
--          category_hint = 'template' marks them as base templates.
--          Real product use clones a template (parent_prompt_id) and
--          substitutes [PRODUCT]/[COLOR_MOOD]/[SEASON].
--
-- SAFETY:
--   - Idempotent: deletes existing template rows before insert.
--   - product_id = NULL (templates are not tied to a product).
--   - status = 'template', seller_used = false, deprecated = false.
--   - legal_flags default: realProductPhotoUsed = true (background-only AI).
--   - Run AFTER `prisma db pull` sync (HANDOFF_PROMPT_ASSET_ENGINE.md).
-- ============================================================

BEGIN;

-- Idempotency: clear prior base templates only (never touches real prompts)
DELETE FROM public.art_director_prompts
WHERE category_hint = 'template' AND status = 'template';

-- Shared negative prompt (conversion + product fidelity)
-- "blurred product, distorted text, low resolution, watermark, extra fingers,
--  unrealistic shadows, color shift on product, AI artifacts"

-- ----------------------------------------------------------------
-- INTENT 1: studio_packshot_white (thumbnail solo shot, no text)
-- ----------------------------------------------------------------
INSERT INTO public.art_director_prompts
  (id, product_id, category_hint, intent_tag, model, model_version,
   prompt, model_specific_prompt, negative_prompt, aspect_ratio, resolution,
   status, seller_used, deprecated, legal_flags, business_metrics,
   concept_axes, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, NULL, 'template', 'studio_packshot_white',
   'firefly-image-5', NULL,
   '[PRODUCT] on a clean seamless white background, soft even studio lighting, subtle natural shadow beneath, centered composition, commercial product photography, photoreal, sharp focus, 1:1, no text in image',
   '[PRODUCT] on a clean seamless white background, soft even studio lighting, subtle natural shadow beneath, centered composition, commercial product photography, photoreal, sharp focus, 1:1, no text in image',
   'blurred product, distorted text, low resolution, watermark, extra fingers, unrealistic shadows, color shift on product, AI artifacts',
   '1:1', '2K', 'template', false, false,
   '{"containsVirtualPerson":false,"textInImage":false,"realProductPhotoUsed":true,"synthidPresent":false,"contentCredentialsPresent":false}'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now(), now()),

  (gen_random_uuid()::text, NULL, 'template', 'studio_packshot_white',
   'nano-banana-pro', NULL,
   'Place the [PRODUCT] on a clean white seamless studio background. Keep the product shape, color, material, and branding exactly as in the reference image. Soft even lighting, subtle realistic contact shadow, centered, 1:1 ratio, photographic realism, no added text.',
   'Place the [PRODUCT] on a clean white seamless studio background. Keep the product shape, color, material, and branding exactly as in the reference image. Soft even lighting, subtle realistic contact shadow, centered, 1:1 ratio, photographic realism, no added text.',
   'blurred product, distorted text, low resolution, watermark, extra fingers, unrealistic shadows, color shift on product, AI artifacts',
   '1:1', '2K', 'template', false, false,
   '{"containsVirtualPerson":false,"textInImage":false,"realProductPhotoUsed":true,"synthidPresent":false,"contentCredentialsPresent":false}'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now(), now()),

  (gen_random_uuid()::text, NULL, 'template', 'studio_packshot_white',
   'gpt-image-2', NULL,
   'Generate a studio product photograph of [PRODUCT] on a seamless white background. Constraints: do not alter the product geometry, color, or material; soft even studio light; subtle contact shadow; centered; 1:1; no text in image; photographic realism.',
   'Generate a studio product photograph of [PRODUCT] on a seamless white background. Constraints: do not alter the product geometry, color, or material; soft even studio light; subtle contact shadow; centered; 1:1; no text in image; photographic realism.',
   'blurred product, distorted text, low resolution, watermark, extra fingers, unrealistic shadows, color shift on product, AI artifacts',
   '1:1', '2K', 'template', false, false,
   '{"containsVirtualPerson":false,"textInImage":false,"realProductPhotoUsed":true,"synthidPresent":false,"contentCredentialsPresent":false}'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now(), now());

-- ----------------------------------------------------------------
-- INTENT 2: lifestyle_room_set (room scene, homedeco/living)
-- ----------------------------------------------------------------
INSERT INTO public.art_director_prompts
  (id, product_id, category_hint, intent_tag, model, model_version,
   prompt, model_specific_prompt, negative_prompt, aspect_ratio, resolution,
   status, seller_used, deprecated, legal_flags, business_metrics,
   concept_axes, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, NULL, 'template', 'lifestyle_room_set',
   'firefly-image-5', NULL,
   '[PRODUCT] placed in a [COLOR_MOOD] Scandinavian living room, soft morning window light, linen textures, editorial lifestyle photography, shallow depth of field, eye-level, photoreal, 4:5, negative space on right for copy, no text in image',
   '[PRODUCT] placed in a [COLOR_MOOD] Scandinavian living room, soft morning window light, linen textures, editorial lifestyle photography, shallow depth of field, eye-level, photoreal, 4:5, negative space on right for copy, no text in image',
   'blurred product, distorted text, low resolution, watermark, extra fingers, unrealistic shadows, color shift on product, AI artifacts',
   '4:5', '2K', 'template', false, false,
   '{"containsVirtualPerson":false,"textInImage":false,"realProductPhotoUsed":true,"synthidPresent":false,"contentCredentialsPresent":false}'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now(), now()),

  (gen_random_uuid()::text, NULL, 'template', 'lifestyle_room_set',
   'nano-banana-pro', NULL,
   'Place the [PRODUCT] in a sun-drenched [COLOR_MOOD] Scandinavian living room scene. Keep the product shape, branding, and details exact. Soft morning light from a window, linen and wood textures, cozy hygge atmosphere, shallow depth of field, 4:5 ratio, leave negative space on the right for a headline, photoreal lifestyle.',
   'Place the [PRODUCT] in a sun-drenched [COLOR_MOOD] Scandinavian living room scene. Keep the product shape, branding, and details exact. Soft morning light from a window, linen and wood textures, cozy hygge atmosphere, shallow depth of field, 4:5 ratio, leave negative space on the right for a headline, photoreal lifestyle.',
   'blurred product, distorted text, low resolution, watermark, extra fingers, unrealistic shadows, color shift on product, AI artifacts',
   '4:5', '2K', 'template', false, false,
   '{"containsVirtualPerson":false,"textInImage":false,"realProductPhotoUsed":true,"synthidPresent":false,"contentCredentialsPresent":false}'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now(), now()),

  (gen_random_uuid()::text, NULL, 'template', 'lifestyle_room_set',
   'gpt-image-2', NULL,
   'Generate a lifestyle photograph placing [PRODUCT] in a [COLOR_MOOD] Scandinavian living room. Constraints: do not change product color or shape; natural morning window light; realistic shadow and reflection; cozy editorial mood; 4:5; negative space on the right for copy; no text in image.',
   'Generate a lifestyle photograph placing [PRODUCT] in a [COLOR_MOOD] Scandinavian living room. Constraints: do not change product color or shape; natural morning window light; realistic shadow and reflection; cozy editorial mood; 4:5; negative space on the right for copy; no text in image.',
   'blurred product, distorted text, low resolution, watermark, extra fingers, unrealistic shadows, color shift on product, AI artifacts',
   '4:5', '2K', 'template', false, false,
   '{"containsVirtualPerson":false,"textInImage":false,"realProductPhotoUsed":true,"synthidPresent":false,"contentCredentialsPresent":false}'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now(), now());

-- ----------------------------------------------------------------
-- INTENT 3: kitchen_top_down (flat lay, kitchen/goods)
-- ----------------------------------------------------------------
INSERT INTO public.art_director_prompts
  (id, product_id, category_hint, intent_tag, model, model_version,
   prompt, model_specific_prompt, negative_prompt, aspect_ratio, resolution,
   status, seller_used, deprecated, legal_flags, business_metrics,
   concept_axes, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, NULL, 'template', 'kitchen_top_down',
   'firefly-image-5', NULL,
   'Top-down flat lay of [PRODUCT] on a [COLOR_MOOD] kitchen counter, fresh ingredients scattered around, soft overhead softbox light, subtle shadow, commercial food-adjacent styling, photoreal, 1:1, no text in image',
   'Top-down flat lay of [PRODUCT] on a [COLOR_MOOD] kitchen counter, fresh ingredients scattered around, soft overhead softbox light, subtle shadow, commercial food-adjacent styling, photoreal, 1:1, no text in image',
   'blurred product, distorted text, low resolution, watermark, extra fingers, unrealistic shadows, color shift on product, AI artifacts',
   '1:1', '2K', 'template', false, false,
   '{"containsVirtualPerson":false,"textInImage":false,"realProductPhotoUsed":true,"synthidPresent":false,"contentCredentialsPresent":false}'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now(), now()),

  (gen_random_uuid()::text, NULL, 'template', 'kitchen_top_down',
   'nano-banana-pro', NULL,
   'Create a top-down flat lay of the [PRODUCT] on a [COLOR_MOOD] kitchen counter with a few fresh ingredients around it. Keep the product shape, color, and details exact. Soft overhead light, subtle natural shadow, clean modern composition, 1:1 ratio, photoreal.',
   'Create a top-down flat lay of the [PRODUCT] on a [COLOR_MOOD] kitchen counter with a few fresh ingredients around it. Keep the product shape, color, and details exact. Soft overhead light, subtle natural shadow, clean modern composition, 1:1 ratio, photoreal.',
   'blurred product, distorted text, low resolution, watermark, extra fingers, unrealistic shadows, color shift on product, AI artifacts',
   '1:1', '2K', 'template', false, false,
   '{"containsVirtualPerson":false,"textInImage":false,"realProductPhotoUsed":true,"synthidPresent":false,"contentCredentialsPresent":false}'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now(), now()),

  (gen_random_uuid()::text, NULL, 'template', 'kitchen_top_down',
   'gpt-image-2', NULL,
   'Generate a top-down flat lay photograph of [PRODUCT] on a [COLOR_MOOD] kitchen counter with scattered fresh ingredients. Constraints: do not alter product geometry or color; soft overhead light from above; realistic shadow; clean grid composition; 1:1; no text in image; photographic realism.',
   'Generate a top-down flat lay photograph of [PRODUCT] on a [COLOR_MOOD] kitchen counter with scattered fresh ingredients. Constraints: do not alter product geometry or color; soft overhead light from above; realistic shadow; clean grid composition; 1:1; no text in image; photographic realism.',
   'blurred product, distorted text, low resolution, watermark, extra fingers, unrealistic shadows, color shift on product, AI artifacts',
   '1:1', '2K', 'template', false, false,
   '{"containsVirtualPerson":false,"textInImage":false,"realProductPhotoUsed":true,"synthidPresent":false,"contentCredentialsPresent":false}'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now(), now());

-- ----------------------------------------------------------------
-- INTENT 4: detail_macro (material/detail close-up)
-- ----------------------------------------------------------------
INSERT INTO public.art_director_prompts
  (id, product_id, category_hint, intent_tag, model, model_version,
   prompt, model_specific_prompt, negative_prompt, aspect_ratio, resolution,
   status, seller_used, deprecated, legal_flags, business_metrics,
   concept_axes, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, NULL, 'template', 'detail_macro',
   'firefly-image-5', NULL,
   'Macro close-up of [PRODUCT] surface texture and material detail, soft natural side light, visible fabric/material weave, shallow depth of field, editorial product photography, photoreal, 4:5, no text in image',
   'Macro close-up of [PRODUCT] surface texture and material detail, soft natural side light, visible fabric/material weave, shallow depth of field, editorial product photography, photoreal, 4:5, no text in image',
   'blurred product, distorted text, low resolution, watermark, extra fingers, unrealistic shadows, color shift on product, AI artifacts',
   '4:5', '2K', 'template', false, false,
   '{"containsVirtualPerson":false,"textInImage":false,"realProductPhotoUsed":true,"synthidPresent":false,"contentCredentialsPresent":false}'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now(), now()),

  (gen_random_uuid()::text, NULL, 'template', 'detail_macro',
   'nano-banana-pro', NULL,
   'Macro close-up showing the texture and material detail of the [PRODUCT]. Keep the exact material, color, and surface as the reference. Soft natural side lighting, visible texture, shallow depth of field, 4:5, photoreal.',
   'Macro close-up showing the texture and material detail of the [PRODUCT]. Keep the exact material, color, and surface as the reference. Soft natural side lighting, visible texture, shallow depth of field, 4:5, photoreal.',
   'blurred product, distorted text, low resolution, watermark, extra fingers, unrealistic shadows, color shift on product, AI artifacts',
   '4:5', '2K', 'template', false, false,
   '{"containsVirtualPerson":false,"textInImage":false,"realProductPhotoUsed":true,"synthidPresent":false,"contentCredentialsPresent":false}'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now(), now()),

  (gen_random_uuid()::text, NULL, 'template', 'detail_macro',
   'gpt-image-2', NULL,
   'Generate a macro close-up photograph of [PRODUCT] emphasizing material texture and craftsmanship detail. Constraints: preserve exact material and color; soft natural side light; shallow depth of field; 4:5; no text; photographic realism.',
   'Generate a macro close-up photograph of [PRODUCT] emphasizing material texture and craftsmanship detail. Constraints: preserve exact material and color; soft natural side light; shallow depth of field; 4:5; no text; photographic realism.',
   'blurred product, distorted text, low resolution, watermark, extra fingers, unrealistic shadows, color shift on product, AI artifacts',
   '4:5', '2K', 'template', false, false,
   '{"containsVirtualPerson":false,"textInImage":false,"realProductPhotoUsed":true,"synthidPresent":false,"contentCredentialsPresent":false}'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now(), now());

-- ----------------------------------------------------------------
-- INTENT 5: season_holiday_variant (seasonal/event variant)
-- ----------------------------------------------------------------
INSERT INTO public.art_director_prompts
  (id, product_id, category_hint, intent_tag, model, model_version,
   prompt, model_specific_prompt, negative_prompt, aspect_ratio, resolution,
   status, seller_used, deprecated, legal_flags, business_metrics,
   concept_axes, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, NULL, 'template', 'season_holiday_variant',
   'firefly-image-5', NULL,
   '[PRODUCT] in a [SEASON] themed setting with seasonal props, [COLOR_MOOD] palette, warm festive lighting, editorial lifestyle, photoreal, 4:5, negative space for copy, no text in image',
   '[PRODUCT] in a [SEASON] themed setting with seasonal props, [COLOR_MOOD] palette, warm festive lighting, editorial lifestyle, photoreal, 4:5, negative space for copy, no text in image',
   'blurred product, distorted text, low resolution, watermark, extra fingers, unrealistic shadows, color shift on product, AI artifacts',
   '4:5', '2K', 'template', false, false,
   '{"containsVirtualPerson":false,"textInImage":false,"realProductPhotoUsed":true,"synthidPresent":false,"contentCredentialsPresent":false}'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now(), now()),

  (gen_random_uuid()::text, NULL, 'template', 'season_holiday_variant',
   'nano-banana-pro', NULL,
   'Place the [PRODUCT] in a [SEASON] themed scene with subtle seasonal props and a [COLOR_MOOD] palette. Keep the product shape, branding, and details exact. Warm festive light, gift-giving mood, 4:5, negative space for a headline, photoreal lifestyle.',
   'Place the [PRODUCT] in a [SEASON] themed scene with subtle seasonal props and a [COLOR_MOOD] palette. Keep the product shape, branding, and details exact. Warm festive light, gift-giving mood, 4:5, negative space for a headline, photoreal lifestyle.',
   'blurred product, distorted text, low resolution, watermark, extra fingers, unrealistic shadows, color shift on product, AI artifacts',
   '4:5', '2K', 'template', false, false,
   '{"containsVirtualPerson":false,"textInImage":false,"realProductPhotoUsed":true,"synthidPresent":false,"contentCredentialsPresent":false}'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now(), now()),

  (gen_random_uuid()::text, NULL, 'template', 'season_holiday_variant',
   'gpt-image-2', NULL,
   'Generate a [SEASON] themed lifestyle photograph of [PRODUCT] with seasonal props and a [COLOR_MOOD] palette. Constraints: do not change product color or shape; warm festive light; gift context; 4:5; negative space for copy; no text in image.',
   'Generate a [SEASON] themed lifestyle photograph of [PRODUCT] with seasonal props and a [COLOR_MOOD] palette. Constraints: do not change product color or shape; warm festive light; gift context; 4:5; negative space for copy; no text in image.',
   'blurred product, distorted text, low resolution, watermark, extra fingers, unrealistic shadows, color shift on product, AI artifacts',
   '4:5', '2K', 'template', false, false,
   '{"containsVirtualPerson":false,"textInImage":false,"realProductPhotoUsed":true,"synthidPresent":false,"contentCredentialsPresent":false}'::jsonb,
   '{}'::jsonb, '{}'::jsonb, now(), now());

-- Verify: should return 15
-- SELECT count(*) FROM public.art_director_prompts WHERE status = 'template';

COMMIT;
