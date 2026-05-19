// src/app/api/automation/l1/route.ts
//
// Sprint 7-M2 Step 4 — POST /api/automation/l1
//
// L1 product automation pipeline. For products diagnosed as L1 (Light grade —
// fast catalog throughput), this endpoint runs:
//   1. Pre-check: DiagnosisResult.recommendedGrade must be 'L1'.
//   2. Background removal of the main image via the Cloudinary adapter.
//   3. Groq SEO copy bundle (7 keywords + 3 names + 10 tags + 3 hooks).
//   4. Product update: name, tags, keywords, hookPhrase, mainImage, aiScore.
//   5. SEO penetration log entries for each generated golden keyword
//      (surface = 'auto_l1') so we can trace runs without an AutomationLog table.
//   6. Response with duration + cost estimate for caller-side telemetry.
//
// Safety:
//   - persist: false is NOT supported here; the call mutates the Product row.
//   - Re-running on the same product is idempotent at the URL/keyword level
//     (cached BG removal hits AssetLibrary; Groq is re-called and overwrites
//     the SEO bundle).
//   - All Korean text in this route is restricted to user-visible JSON error
//     messages; comments are English per workflow principle #3-1.

import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { removeBackground } from '@/lib/automation/adobe-bg-removal';
import { generateSeoCopyBundle } from '@/lib/automation/groq-copywriter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface L1Body {
  productId?: string;
}

function jsonError(message: string, status: number, detail?: unknown) {
  return NextResponse.json(
    detail !== undefined ? { error: message, detail } : { error: message },
    { status },
  );
}

function computeAiScore(args: { source: 'groq' | 'fallback'; filtered: boolean }): number {
  let score = 100;
  if (args.source === 'fallback') score -= 30;
  if (args.filtered) score -= 20;
  return Math.max(0, Math.min(100, score));
}

export async function POST(req: Request) {
  const startedAt = Date.now();

  let body: L1Body;
  try {
    body = (await req.json()) as L1Body;
  } catch {
    return jsonError('invalid JSON body', 400);
  }

  if (!body.productId) {
    return jsonError('productId required', 400);
  }

  const product = await prisma.product.findUnique({
    where: { id: body.productId },
    select: {
      id: true,
      name: true,
      category: true,
      naverCategoryCode: true,
      salePrice: true,
      description: true,
      mainImage: true,
      images: true,
      diagnosisResult: {
        select: {
          recommendedGrade: true,
          recommendedSkeleton: true,
          totalScore: true,
        },
      },
    },
  });

  if (!product) {
    return jsonError('product not found', 404, { productId: body.productId });
  }

  if (!product.diagnosisResult) {
    return jsonError('diagnosis missing — call POST /api/diagnose first', 409);
  }

  if (product.diagnosisResult.recommendedGrade !== 'L1') {
    return jsonError('product is not L1 — L1 automation only runs for L1 grade', 400, {
      grade: product.diagnosisResult.recommendedGrade,
    });
  }

  // ── BG removal ─────────────────────────────────────────────────────────
  const sourceImage = product.mainImage ?? product.images?.[0] ?? null;
  const bg = sourceImage
    ? await removeBackground({
        sourceUrl: sourceImage,
        category: product.category,
      })
    : {
        cdnUrl: '',
        source: 'fallback' as const,
        degraded: true,
        assetLibraryId: null,
        costEstimate: 0,
      };

  // ── Groq SEO copy ──────────────────────────────────────────────────────
  const copy = await generateSeoCopyBundle({
    productName: product.name,
    category: product.category,
    naverCategoryCode: product.naverCategoryCode,
    skeletonId: product.diagnosisResult.recommendedSkeleton,
    salePrice: product.salePrice,
    description: product.description,
  });

  const aiScore = computeAiScore({ source: copy.source, filtered: copy.filtered });

  // ── Product mutation ───────────────────────────────────────────────────
  const nextMainImage = bg.cdnUrl || sourceImage || product.mainImage || null;
  const updated = await prisma.product.update({
    where: { id: product.id },
    data: {
      name: copy.bundle.productNames[0] ?? product.name,
      tags: copy.bundle.tags as unknown as Prisma.InputJsonValue,
      keywords: copy.bundle.goldenKeywords as unknown as Prisma.InputJsonValue,
      hookPhrase: copy.bundle.hookPhrases[0] ?? null,
      mainImage: nextMainImage,
      main_image_url: nextMainImage,
      aiScore,
      aiGeneratedTitle: copy.bundle.productNames[0] ?? null,
      aiGeneratedTags: copy.bundle.tags as unknown as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      name: true,
      tags: true,
      keywords: true,
      hookPhrase: true,
      mainImage: true,
      aiScore: true,
    },
  });

  // ── SEO penetration log (surface = 'auto_l1') ─────────────────────────
  try {
    await prisma.sEOPenetrationLog.createMany({
      data: copy.bundle.goldenKeywords.map((keyword, idx) => ({
        productId: product.id,
        surface: 'auto_l1',
        keyword: keyword.slice(0, 120),
        keywordRank: idx + 1,
      })),
    });
  } catch {
    // Logging failure must not fail the automation run.
  }

  const elapsedMs = Date.now() - startedAt;

  return NextResponse.json({
    ok: true,
    product: updated,
    bgRemoval: {
      source: bg.source,
      degraded: bg.degraded,
      assetLibraryId: bg.assetLibraryId,
      costEstimate: bg.costEstimate,
    },
    copy: {
      source: copy.source,
      filtered: copy.filtered,
      promptCharsApprox: copy.promptCharsApprox,
      fallbackReason: copy.fallbackReason ?? null,
    },
    cost: {
      cloudinaryCredits: bg.costEstimate,
      groqRequests: 1,
      anthropicRequests: 0,
    },
    elapsedMs,
  });
}
