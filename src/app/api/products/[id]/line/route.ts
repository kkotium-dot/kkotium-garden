// /api/products/[id]/line
// ============================================================================
// Operator override of the workflow line (handoff §4). The operator's decision
// is authoritative and MUST NOT be overwritten by the auto classifier.
//   POST — { line: 'A' | 'B' } → stamps quality_reasons.line + lineSource =
//          'operator' (the control tower then resolves line from this override
//          before deriveLine). recommended_mode is untouched (line != mode).
//          DB-only — never touches Naver.
//
// Migration-safe: if the adaptive-mode columns aren't applied yet (P2021/P2022),
// returns { migrationPending: true } with 503 instead of a raw 500.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const VALID_LINES = new Set(['A', 'B']);

function isMissingColumn(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  const msg = e instanceof Error ? e.message : String(e);
  return code === 'P2021' || code === 'P2022' || /does not exist|column .* does not exist/i.test(msg);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: { line?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const line = body.line;
  if (!line || !VALID_LINES.has(line)) {
    return NextResponse.json({ success: false, error: 'line must be A or B' }, { status: 400 });
  }

  try {
    const current = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, quality_reasons: true },
    });
    if (!current) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const prev = (current.quality_reasons ?? {}) as Record<string, unknown>;
    const quality_reasons = {
      ...prev,
      line,
      lineSource: 'operator',
      lineOverriddenFrom: (prev.line as string | undefined) ?? null,
    };

    await prisma.product.update({
      where: { id: productId },
      data: { quality_reasons: quality_reasons as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({ success: true, productId, line, source: 'operator' });
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
