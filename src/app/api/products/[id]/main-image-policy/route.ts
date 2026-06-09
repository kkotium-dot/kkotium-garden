// /api/products/[id]/main-image-policy
// ============================================================================
// C-4 representative-image policy override.
//   POST — set or clear Product.main_image_policy. 'lifestyle_intended' means the
//          operator keeps a non-white-bg representative on purpose; seo-guard then
//          downgrades main_image_white_bg fail -> info and the control-tower action
//          queue stops surfacing the finish-representative step. Passing null/empty
//          clears the override (default white-bg rule resumes).
//          REVERSIBLE (DB column only), never touches Naver.
//
// Body: { policy?: 'lifestyle_intended' | null }
// Guarded: a not-yet-migrated column returns 503 (apply MIGRATION_c4_main_image_policy).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { MAIN_IMAGE_POLICY_LIFESTYLE } from '@/lib/seo/seo-guard-linter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Body {
  policy?: string | null;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: Body = {};
  try { body = await req.json(); } catch { /* empty → clear */ }

  // Only the lifestyle override (or a clear) is accepted — no free-form policies.
  const raw = (body.policy ?? '').trim();
  let policy: string | null;
  if (raw === '' ) {
    policy = null;
  } else if (raw === MAIN_IMAGE_POLICY_LIFESTYLE) {
    policy = MAIN_IMAGE_POLICY_LIFESTYLE;
  } else {
    return NextResponse.json(
      { success: false, error: `policy must be '${MAIN_IMAGE_POLICY_LIFESTYLE}' or null` },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  try {
    await prisma.product.update({
      where: { id: productId },
      data: { main_image_policy: policy },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === 'P2022' || e.code === 'P2021')) {
      return NextResponse.json(
        { success: false, error: 'main_image_policy column not migrated yet (apply MIGRATION_c4_main_image_policy)', stage: 'MIGRATION_PENDING' },
        { status: 503 },
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `Update failed: ${msg}` }, { status: 502 });
  }

  return NextResponse.json({ success: true, productId, mainImagePolicy: policy });
}
