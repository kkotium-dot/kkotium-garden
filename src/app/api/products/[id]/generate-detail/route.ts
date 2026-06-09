// src/app/api/products/[id]/generate-detail/route.ts
//
// Sprint 7-M2 Phase 3-A — POST /api/products/[id]/generate-detail
//
// Composes the full 5-section detail page for a Product. Resolves the
// ConceptTone from the most recent Diagnosis row, runs the skeleton
// matcher (or honors the overrideSkeletonId), then dispatches each
// section id to its dedicated renderer via section-builder.buildDetailPage.
//
// Response: JSON with base64-encoded PNG buffer + per-section metadata.
// The caller (Studio UI at /studio) uploads to Supabase Storage via the
// follow-up POST /api/products/[id]/save-assets.
//
// Notes
//   - runtime = 'nodejs' is mandatory: Sharp requires Node runtime.
//   - dynamic = 'force-dynamic' per workrule #11.
//   - No Korean strings in this route (workrule #29).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildDetailPage } from '@/lib/automation/section-builder';
import { serializeDetailHtml } from '@/lib/automation/detail-html-serializer';
import type {
  ConceptTone,
  SkeletonId,
} from '@/lib/diagnosis/concept-tone-inference';
import { mapCategoryToTone } from '@/lib/automation/category-tone-mapper';
import { NAVER_ORIGIN_CODES } from '@/lib/naver/naver-origin-codes';
import type { GroundedFacts } from '@/lib/automation/section-renderers/types';
import { resolveCategoryLeaf } from '@/lib/automation/category-leaf';
// Phase B-3 — concept-preset engine consumption (additive; PNG path preserved).
import {
  normalizePreset, normalizeIntensity, recommendPreset,
} from '@/lib/design/concept-presets';
import { categoryToFamily } from '@/lib/design/category-preset-map';
import { buildPresetDetailContent } from '@/lib/detail/build-preset-content';
import { lintSeoGuards } from '@/lib/seo/seo-guard-linter';
import type { PresetOverrides } from '@/components/detail/preset';

function resolveOriginCountry(code: string | null | undefined): string | null {
  if (!code) return null;
  // strip leading zeros (e.g. "0200037" -> "200037") before lookup.
  const normalized = code.replace(/^0+/, '') || code;
  const found = NAVER_ORIGIN_CODES.find((o) => o.code === normalized);
  return found?.name ?? null;
}

const DISTRIBUTOR_LABEL = '유통 꽃틔움';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateDetailBody {
  /** Designer 1-click skeleton swap. Bypasses skeleton-matcher when present. */
  overrideSkeletonId?: SkeletonId;
  /** Optional lifestyle backdrop URL (passed into SectionRenderContext). */
  lifestyleAssetUrl?: string;
  /** Optional brand name override (defaults to Product.brand). */
  brandName?: string;
  /** Optional highlight phrase ("4종 세트", "한정", etc). */
  highlight?: string;
  /**
   * Phase B-3: return ONLY the preset engine output (presetLayout + seoGuard)
   * without the legacy PNG/skeleton path. Works for any product (no Diagnosis
   * row required) — used by the preset preview / verification surface.
   */
  presetOnly?: boolean;
}

function jsonError(message: string, status: number, detail?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, detail: detail ?? null },
    { status },
  );
}

/** Parse Product.preset_overrides JSONB into the typed slot object (snake/camel). */
function parsePresetOverrides(raw: unknown): PresetOverrides {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: PresetOverrides = {};
  if (typeof o.accent === 'string') out.accent = o.accent;
  if (typeof o.hero_copy === 'string') out.heroCopy = o.hero_copy;
  if (typeof o.heroCopy === 'string') out.heroCopy = o.heroCopy;
  if (typeof o.mood_image === 'string') out.moodImage = o.mood_image;
  if (typeof o.moodImage === 'string') out.moodImage = o.moodImage;
  return out;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const productId = params.id;
  if (!productId) {
    return jsonError('product id required', 400);
  }

  let body: GenerateDetailBody = {};
  try {
    const raw = await req.text();
    body = raw.length > 0 ? (JSON.parse(raw) as GenerateDetailBody) : {};
  } catch (err) {
    return jsonError('invalid JSON body', 400, String(err));
  }

  // Fetch product — includes facts needed for the grounded spec/story path.
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      mainImage: true,
      category: true,
      brand: true,
      supplierPrice: true,
      // grounding fields (#46) — drive deterministic spec rows + story tone.
      originCode: true,
      naverCategoryCode: true,
      hasOptions: true,
      optionName: true,
      optionValues: true,
      options: true,
      // Phase B-3 — concept-preset columns (migration 20260603, additive).
      concept_preset: true,
      preset_intensity: true,
      preset_overrides: true,
    },
  });
  if (!product) {
    return jsonError('product not found', 404, { productId });
  }

  // Fetch latest Diagnosis (for ConceptTone). Skip when overrideSkeletonId or
  // presetOnly is set — the preset engine path is diagnosis-independent.
  let conceptTone: ConceptTone | undefined;
  if (!body.overrideSkeletonId && !body.presetOnly) {
    const diag = await prisma.diagnosis.findUnique({
      where: { productId },
      select: { conceptTone: true, skeletonId: true },
    });
    if (!diag) {
      return jsonError(
        'no diagnosis row (call POST /api/diagnose first or supply overrideSkeletonId)',
        422,
        { productId },
      );
    }
    conceptTone = diag.conceptTone as unknown as ConceptTone;
  }

  // Determine sale price from a saved field if available — Product table
  // stores supplierPrice; salePrice is derived elsewhere (margin builder).
  // For now we pass supplierPrice into both supplierPrice and salePrice
  // slots since renderers only use them for KFTC disclosure context.
  // Build grounded facts from DB + tone mapping. These are the ONLY values
  // the spec/story generators are allowed to treat as ground truth (#46).
  // SSOT (2026-06-01): the previous inline leaf + crawl_logs fallback has been
  // moved to category-leaf.resolveCategoryLeaf so the thumbnail badge and the
  // detail spec always render the same label. Never fabricates a category.
  const categoryLeaf = await resolveCategoryLeaf({
    productId,
    category: product.category,
    productName: product.name,
  });

  const toneDirective = mapCategoryToTone(conceptTone, {
    category: product.category ?? undefined,
    naverCategoryCode: product.naverCategoryCode,
    productName: product.name,
  });
  const optionValuesArr = Array.isArray(product.optionValues)
    ? (product.optionValues as unknown[]).filter((v): v is string => typeof v === 'string')
    : [];
  const optionsLen = Array.isArray(product.options) ? product.options.length : 0;
  const groundedFacts: GroundedFacts = {
    optionCount: optionsLen > 0 ? optionsLen : (optionValuesArr.length > 0 ? optionValuesArr.length : undefined),
    optionName: product.optionName ?? undefined,
    optionValues: optionValuesArr.length > 0 ? optionValuesArr : undefined,
    originCountry: resolveOriginCountry(product.originCode),
    distributorLabel: DISTRIBUTOR_LABEL,
    categoryLeaf: categoryLeaf || undefined,
    toneCategoryGroup: toneDirective.categoryGroup,
    toneBase: toneDirective.baseTone,
  };

  // --- Phase B-3: concept-preset engine (additive, diagnosis-independent) ---
  // Resolve the preset from the operator-assigned columns; surface the
  // category-based recommendation alongside so drift is visible. Assemble the
  // grounded 7-section content, expose the customization slots, and ALWAYS run
  // the preset-independent SEO guard linter (CONCEPT §7 orthogonality).
  const preset = normalizePreset(product.concept_preset);
  const intensity = normalizeIntensity(product.preset_intensity);
  const overrides = parsePresetOverrides(product.preset_overrides);
  const presetContent = buildPresetDetailContent({
    preset, intensity, productName: product.name, groundedFacts,
  });
  const recommended = recommendPreset(
    categoryToFamily({
      productName: product.name,
      categoryLeaf,
      naverCategoryCode: product.naverCategoryCode,
    }),
  );
  const seoGuard = lintSeoGuards({
    productName: product.name,
    naverCategoryCode: product.naverCategoryCode,
    mainImage: product.mainImage,
  });
  const presetLayout = {
    preset,
    intensity,
    recommendedPreset: recommended.preset,
    recommendedIntensity: recommended.intensity,
    matchesRecommendation: preset === recommended.preset,
    content: presetContent,
    overrides,
    slots: {
      accent: overrides.accent ?? null,
      heroCopy: overrides.heroCopy ?? null,
      moodImage: overrides.moodImage ?? null,
    },
    locked: ['logo', 'signature_color', 'price_cta', 'seo_fields'],
  };

  // presetOnly: engine output for ANY product (no diagnosis, no PNG).
  if (body.presetOnly) {
    return NextResponse.json({ ok: true, presetOnly: true, presetLayout, seoGuard, groundedFacts });
  }

  // The legacy PNG path requires the representative image.
  if (!product.mainImage) {
    return jsonError('product mainImage missing', 422, { productId });
  }

  try {
    const result = await buildDetailPage({
      productName: product.name,
      supplierPrice: product.supplierPrice,
      category: product.category ?? undefined,
      sourceImageUrl: product.mainImage,
      lifestyleAssetUrl: body.lifestyleAssetUrl,
      highlight: body.highlight,
      brandName: body.brandName ?? product.brand,
      conceptTone,
      overrideSkeletonId: body.overrideSkeletonId,
      groundedFacts,
    });

    // Parallel HTML output (STEP 3) — additive; the PNG (detailBase64) is
    // untouched. copy is wrapped in markup only (no mutation, #46).
    const detailHtml = serializeDetailHtml({
      productName: product.name,
      sections: result.sections.map((s) => ({
        sectionId: s.sectionId,
        copy: s.copy,
        role: s.role,
      })),
      heroImageUrl: product.mainImage,
      lifestyleAssetUrl: body.lifestyleAssetUrl,
    });

    return NextResponse.json({
      ok: true,
      skeletonId: result.skeletonId,
      matchScore: result.matchScore,
      matchAmbiguous: result.matchAmbiguous,
      sections: result.sections.map((s) => ({
        sectionId: s.sectionId,
        dedicated: s.dedicated,
        height: s.height,
        offsetY: s.offsetY,
        copyFiltered: s.copyFiltered,
        copyKeys: Object.keys(s.copy),
        role: s.role,
      })),
      detailBase64: result.buffer.toString('base64'),
      detailHtml,
      detailWidth: result.skeleton.width,
      detailHeight: result.skeleton.totalHeight,
      elapsedMs: result.elapsedMs,
      groundedFacts,
      presetLayout,
      seoGuard,
    });
  } catch (err) {
    return jsonError('detail generation failed', 500, String(err));
  }
}
