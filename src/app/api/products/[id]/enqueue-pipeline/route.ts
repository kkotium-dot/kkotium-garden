// /api/products/[id]/enqueue-pipeline
// ============================================================================
// Enqueue the product's recommended-mode job chain. Phase 3, handoff task 6.
//   POST — seeds asset_jobs for the mode chain (body.mode or the product's
//          recommended_mode). NEW seeds the B-plan swap jobs that the existing
//          /products/[id]/swap UI drives (bg_swap reuse). DB-only, no Naver.
//
// Body: { mode?: 'SIMPLE'|'ENHANCE'|'NEW', conceptComboId?: string }
// Migration-safe: asset_jobs absent (P2021) → { migrationPending: true }.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enqueueModeChain } from '@/lib/jobs/enqueue-mode-chain';
import type { RecommendedMode } from '@/lib/images/quality-classifier';

export const dynamic = 'force-dynamic';

const VALID = new Set<RecommendedMode>(['SIMPLE', 'ENHANCE', 'NEW']);

function isMissingTable(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  const msg = e instanceof Error ? e.message : String(e);
  return code === 'P2021' || code === 'P2022' || /does not exist|relation .* does not exist/i.test(msg);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: { mode?: string; conceptComboId?: string | null } = {};
  try { body = await req.json(); } catch { /* empty → use recommended_mode */ }

  // Resolve the mode: body override, else the product's recommended_mode.
  let mode: RecommendedMode | null =
    body.mode && VALID.has(body.mode as RecommendedMode) ? (body.mode as RecommendedMode) : null;

  if (!mode) {
    let rec: string | null = null;
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { recommended_mode: true },
      });
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }
      rec = product.recommended_mode ?? null;
    } catch (e) {
      if (isMissingTable(e)) {
        return NextResponse.json({ success: false, migrationPending: true }, { status: 503 });
      }
      throw e;
    }
    if (rec && VALID.has(rec as RecommendedMode)) mode = rec as RecommendedMode;
  }

  if (!mode) {
    return NextResponse.json(
      { success: false, error: 'No mode — run assess-quality first or pass { mode }' },
      { status: 422 },
    );
  }

  try {
    const result = await enqueueModeChain(productId, mode, { conceptComboId: body.conceptComboId ?? null });
    return NextResponse.json({ success: true, productId, ...result });
  } catch (e) {
    if (isMissingTable(e)) {
      return NextResponse.json({ success: false, migrationPending: true }, { status: 503 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
