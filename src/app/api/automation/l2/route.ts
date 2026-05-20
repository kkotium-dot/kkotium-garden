// src/app/api/automation/l2/route.ts
//
// Sprint 7-M2 Step 5-A — L2 automation API skeleton.
//
// Scope of 5-A (this commit):
//   - Wire P-Filter pre-flight (Sprint 8-PF)
//   - Compose the 4 text-only building blocks (B02 / B06 / B07 / B09)
//     via section-composer.ts
//   - Run dark-pattern lint (Sprint 7-M3) on every variant and persist
//     violations to dark_pattern_lint_logs
//   - Return placeholder entries for the 5 image/PSD blocks with
//     status='deferred_5b' (workflow principle #46 — no false "complete"
//     labels)
//
// Out of scope (5-B):
//   - B01 hero header, B03 USP, B04 lifestyle, B05 trust badges, B11 shipping
//   - Final stitching (Sharp composite)
//   - asset_library row writes for non-destructive editing
//
// Runtime contract
//   - Node runtime (sharp + tesseract inside P-Filter).
//   - Force-dynamic — never cache; each invocation reads live Prisma.
//
// Request
//   POST /api/automation/l2
//   { productId: string, options?: { skipPFilter?: boolean } }
//
// Response shape matches docs/research/SPRINT_7_M2_STEP_5_REDESIGN_2026_05.md §3.2,
// with these 5-A adjustments:
//   - buildingBlocks[].status is 'completed' for text blocks, 'deferred_5b'
//     for image blocks (their variants[] is empty in 5-A).
//   - finalDetail is null — stitching ships in 5-B.

import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runPFilter } from '@/lib/diagnosis/p-filter';
import {
  composeAllTextSections,
  persistLintViolations,
  type SectionResult,
  type TextBlockId,
} from '@/lib/automation/section-composer';
import type { PFilterResult } from '@/lib/diagnosis/p-filter-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Block status taxonomy
// ---------------------------------------------------------------------------

type BlockStatus = 'completed' | 'deferred_5b' | 'failed' | 'l4_aborted';

interface BuildingBlockResponse {
  blockId: string;
  title: string;
  status: BlockStatus;
  variants: SectionResult['variants'];
  highSeverityCount: number;
  /** Free-form note when status != 'completed'. */
  note?: string;
}

const TEXT_BLOCK_IDS: TextBlockId[] = ['B02', 'B06', 'B07', 'B09'];

const IMAGE_BLOCK_TITLES: Record<string, string> = {
  B01: 'hero_header',
  B03: 'usp_static',
  B04: 'lifestyle',
  B05: 'trust_badges',
  B08: 'pricing_options',
  B11: 'shipping_info',
  B12: 'cta_footer',
};

// B10 reviews is intentionally not in 5-A or 5-B — design doc §4 marks it
// "placeholder, real reviews missing → skip". We include it as deferred so
// the response shape stays stable when 5-B turns it on later.
const IMAGE_BLOCK_IDS: ReadonlyArray<keyof typeof IMAGE_BLOCK_TITLES> = [
  'B01',
  'B03',
  'B04',
  'B05',
  'B08',
  'B11',
  'B12',
];

function deferredImageBlocks(): BuildingBlockResponse[] {
  return IMAGE_BLOCK_IDS.map((id) => ({
    blockId: id,
    title: IMAGE_BLOCK_TITLES[id],
    status: 'deferred_5b' as BlockStatus,
    variants: [],
    highSeverityCount: 0,
    note: 'Image/PSD section ships in Sprint 7-M2 Step 5-B.',
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface L2RequestBody {
  productId: string;
  options?: {
    skipPFilter?: boolean;
    variantsPerBlock?: number;
    forceSkeletonId?: string;
  };
}

async function readBody(req: NextRequest): Promise<L2RequestBody | null> {
  try {
    const body = (await req.json()) as L2RequestBody;
    if (!body || typeof body.productId !== 'string' || body.productId.length === 0) {
      return null;
    }
    return body;
  } catch {
    return null;
  }
}

interface PFilterSummary {
  grade: PFilterResult['grade'];
  gradeLabel: string;
  issues: string[];
  autoFixed: string[];
  requiresSellerReview: boolean;
}

function summarisePFilter(result: PFilterResult): PFilterSummary {
  const issues: string[] = [];
  if (!result.signals.resolution.sufficient) issues.push('resolution_insufficient');
  if (result.signals.blur.level === 'severe') issues.push('blur_severe');
  if (!result.signals.exposure.ok) issues.push('exposure_out_of_range');
  if (result.signals.whiteBalance.cast) issues.push('white_balance_cast');
  if (result.signals.watermark.detected) issues.push('watermark_detected');
  if (!result.signals.background.uniform) issues.push('background_complex');

  return {
    grade: result.grade,
    gradeLabel: result.gradeLabel,
    issues,
    autoFixed: result.autoFixSuggestions,
    requiresSellerReview: result.requiresSellerReview,
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  const body = await readBody(req);
  if (!body) {
    return NextResponse.json(
      { ok: false, error: 'invalid_request', message: 'productId is required' },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: body.productId },
    select: {
      id: true,
      name: true,
      salePrice: true,
      brand: true,
      category: true,
      mainImage: true,
      shippingFee: true,
      optionValues: true,
      naver_material: true,
      naver_size: true,
      naver_color: true,
      naver_weight: true,
      naver_origin: true,
    },
  });

  if (!product) {
    return NextResponse.json(
      { ok: false, error: 'product_not_found', productId: body.productId },
      { status: 404 },
    );
  }

  // ---- B06 ground-truth assembly ------------------------------------------
  // Pull confirmed specs from two sources:
  //   1. crawl_logs.options[] (raw wholesale option strings — parsed by
  //      spec-extractor.ts for dictionary tokens like 정사각/직사각/화이트)
  //   2. Product.naver_* fields (seller-confirmed via Naver Commerce form)
  //
  // Both are passed to the composer as crawledOptions / knownSpecs; the
  // composer then merges and B06's prompt is forbidden from inventing values.
  const crawlLog = await prisma.crawlLog.findFirst({
    where: { productId: product.id },
    orderBy: { crawledAt: 'desc' },
    select: { options: true, categoryName: true },
  });

  const crawledOptions: Array<{ name: string; addPrice?: number }> = (() => {
    const raw = crawlLog?.options;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((o): o is { name: string; addPrice?: number } => {
        return typeof o === 'object' && o !== null && 'name' in o && typeof (o as { name: unknown }).name === 'string';
      })
      .map((o) => ({ name: o.name, addPrice: o.addPrice }));
  })();

  // Product.optionValues is JsonValue — be defensive (Prisma JSON contract).
  const productOptionStrings: string[] = Array.isArray(product.optionValues)
    ? product.optionValues.filter((v): v is string => typeof v === 'string')
    : [];
  const productOptionsAsCrawled = productOptionStrings.map((name) => ({ name, addPrice: 0 }));

  const combinedOptions = [...crawledOptions, ...productOptionsAsCrawled];

  const sellerConfirmedSpecs: Record<string, string> = {};
  if (product.naver_material) sellerConfirmedSpecs['소재'] = product.naver_material;
  if (product.naver_size) sellerConfirmedSpecs['크기'] = product.naver_size;
  if (product.naver_color) sellerConfirmedSpecs['색상'] = product.naver_color;
  if (product.naver_weight) sellerConfirmedSpecs['무게'] = product.naver_weight;
  if (product.naver_origin) sellerConfirmedSpecs['원산지'] = product.naver_origin;

  // ---- Stage 1: P-Filter pre-flight ---------------------------------------
  let pFilterSummary: PFilterSummary | null = null;
  if (!body.options?.skipPFilter && product.mainImage) {
    try {
      const result = await runPFilter(product.mainImage);
      pFilterSummary = summarisePFilter(result);

      if (result.grade === 'L4') {
        return NextResponse.json({
          ok: false,
          stage: 'p_filter',
          reason: 'l4_reshoot_required',
          product: { id: product.id, name: product.name },
          pFilter: pFilterSummary,
          buildingBlocks: [
            ...TEXT_BLOCK_IDS.map((id) => ({
              blockId: id,
              title: id,
              status: 'l4_aborted' as BlockStatus,
              variants: [],
              highSeverityCount: 0,
              note: 'P-Filter graded L4 — reshoot required before L2 automation.',
            })),
            ...deferredImageBlocks(),
          ],
          finalDetail: null,
          elapsedMs: Date.now() - startedAt,
        });
      }
    } catch (err) {
      console.error('[l2] P-Filter failed:', err);
      pFilterSummary = {
        grade: 'L2',
        gradeLabel: 'p_filter_skipped_on_error',
        issues: ['p_filter_runtime_error'],
        autoFixed: [],
        requiresSellerReview: true,
      };
    }
  }

  // ---- Stage 2: 9-axis diagnosis absorption (5-A: pass-through) -----------
  // Skeleton/grade selection lives in concept-tone-inference; 5-A doesn't
  // route on it yet because image blocks are deferred. Real wiring ships in 5-B.

  // ---- Stage 3: Text section composition + lint --------------------------
  let textSections: SectionResult[] = [];
  let textCompositionError: string | null = null;
  try {
    textSections = await composeAllTextSections({
      id: product.id,
      name: product.name,
      salePrice: product.salePrice,
      category: product.category ?? undefined,
      brand: product.brand,
      shippingFee: product.shippingFee,
      firstFoldText: '',
      crawledOptions: combinedOptions,
      crawledCategory: crawlLog?.categoryName ?? undefined,
      knownSpecs:
        Object.keys(sellerConfirmedSpecs).length > 0 ? sellerConfirmedSpecs : undefined,
    });
  } catch (err) {
    console.error('[l2] text section composition failed:', err);
    textCompositionError = err instanceof Error ? err.message : 'unknown';
  }

  // ---- Stage 4: Persist lint violations -----------------------------------
  let lintPersisted = 0;
  if (textSections.length > 0) {
    try {
      lintPersisted = await persistLintViolations(product.id, textSections);
    } catch (err) {
      // Lint persistence failure should not break the response.
      console.error('[l2] lint persistence failed:', err);
    }
  }

  // ---- Stage 5: Assemble response ----------------------------------------
  const textBlockResponses: BuildingBlockResponse[] = textSections.map((section) => ({
    blockId: section.blockId,
    title: section.title,
    status: textCompositionError ? 'failed' : 'completed',
    variants: section.variants,
    highSeverityCount: section.highSeverityCount,
  }));

  if (textCompositionError && textBlockResponses.length === 0) {
    for (const id of TEXT_BLOCK_IDS) {
      textBlockResponses.push({
        blockId: id,
        title: id,
        status: 'failed',
        variants: [],
        highSeverityCount: 0,
        note: textCompositionError,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    stage: '5a_text_only',
    product: {
      id: product.id,
      name: product.name,
      grade: pFilterSummary?.grade ?? null,
    },
    pFilter: pFilterSummary,
    buildingBlocks: [...textBlockResponses, ...deferredImageBlocks()],
    finalDetail: null,
    lint: {
      persistedRows: lintPersisted,
    },
    cost: {
      cloudinaryCredits: 0,
      groqRequests: textSections.reduce(
        (n, s) => n + s.variants.filter((v) => v.source === 'groq').length,
        0,
      ),
      adobeFireflyRequests: 0,
      anthropicRequests: 0,
    },
    elapsedMs: Date.now() - startedAt,
  });
}
