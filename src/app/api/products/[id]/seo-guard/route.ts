// src/app/api/products/[id]/seo-guard/route.ts
//
// GET /api/products/[id]/seo-guard — Phase B-2.
//
// Runs the preset-INDEPENDENT SEO guard linter (lintSeoGuards) for a product.
// Always available, never reads the concept preset (CONCEPT §7 orthogonality).
// The representative white-bg PIXEL check is performed here (Node + Sharp) and
// its boolean is fed into the pure linter; everything else is static.
//
// Read-only (no mutation, irreversible-op-free). runtime=nodejs (Sharp).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { lintSeoGuards } from '@/lib/seo/seo-guard-linter';
import { assertWhiteBackground, RepresentativePolicyError } from '@/lib/images/naver-normalize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Fetch the representative image and run the 4-corner white-bg pixel guard. */
async function checkWhiteBg(url: string | null | undefined): Promise<boolean | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    await assertWhiteBackground(buf);
    return true;
  } catch (err) {
    // Only BACKGROUND_NOT_WHITE proves a colored/dark bg; TOO_SMALL or a
    // network/decode error means "could not verify" -> null (manual), not false.
    if (err instanceof RepresentativePolicyError && err.reason === 'BACKGROUND_NOT_WHITE') {
      return false;
    }
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const productId = params.id;
  if (!productId) {
    return NextResponse.json({ ok: false, error: 'product id required' }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, naverCategoryCode: true, mainImage: true },
  });
  if (!product) {
    return NextResponse.json({ ok: false, error: 'product not found', productId }, { status: 404 });
  }

  const mainImageWhiteBgVerified = await checkWhiteBg(product.mainImage);

  // C-4: read the representative-policy override behind a guard (the column may
  // not be migrated yet — degrade to no override, #50).
  let mainImagePolicy: string | null = null;
  try {
    const pol = await prisma.product.findUnique({
      where: { id: productId },
      select: { main_image_policy: true },
    });
    mainImagePolicy = pol?.main_image_policy ?? null;
  } catch { /* main_image_policy column not migrated yet */ }

  const seoGuard = lintSeoGuards({
    productName: product.name,
    naverCategoryCode: product.naverCategoryCode,
    mainImage: product.mainImage,
    mainImageWhiteBgVerified,
    mainImagePolicy,
  });

  return NextResponse.json({ ok: true, productId, seoGuard });
}
