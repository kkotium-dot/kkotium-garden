// /api/products/[id]/mode
// ============================================================================
// Operator override of the adaptive recommended mode. Phase 3, handoff task 3.
//   POST — { mode: 'SIMPLE' | 'ENHANCE' | 'NEW' } → writes recommended_mode and
//          stamps quality_reasons.modeSource='operator' (so the badge shows it
//          was human-confirmed, not auto). DB-only — never touches Naver.
//
// Migration-safe: if the Phase 3 columns aren't applied yet (P2021/P2022),
// returns { migrationPending: true } with 503 instead of a raw 500.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const VALID_MODES = new Set(['SIMPLE', 'ENHANCE', 'NEW']);

function isMissingColumn(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  const msg = e instanceof Error ? e.message : String(e);
  return code === 'P2021' || code === 'P2022' || /does not exist|column .* does not exist/i.test(msg);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: { mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const mode = body.mode;
  if (!mode || !VALID_MODES.has(mode)) {
    return NextResponse.json(
      { success: false, error: 'mode must be one of SIMPLE | ENHANCE | NEW' },
      { status: 400 },
    );
  }

  try {
    const current = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, recommended_mode: true, quality_reasons: true },
    });
    if (!current) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Preserve the existing quality_reasons object; stamp operator override meta.
    const prev = (current.quality_reasons ?? {}) as Record<string, unknown>;
    const quality_reasons = {
      ...prev,
      modeSource: 'operator',
      overriddenFrom: current.recommended_mode ?? null,
    };

    await prisma.product.update({
      where: { id: productId },
      data: { recommended_mode: mode, quality_reasons: quality_reasons as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({ success: true, productId, mode, source: 'operator' });
  } catch (e: unknown) {
    if (isMissingColumn(e)) {
      return NextResponse.json(
        { success: false, migrationPending: true, error: 'Adaptive-mode columns not migrated yet' },
        { status: 503 },
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
