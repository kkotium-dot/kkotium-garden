// /api/alerts/[id]/resolve
// ============================================================================
// Sprint 6-A UI Phase 2: mark a low-stock alert as resolved.
//
// PATCH body: { resolutionNote?: string }
// Sets resolvedAt = now() and stores the user-provided note (truncated to 200
// chars per schema). Idempotent: re-resolving an already-resolved alert is
// a no-op (returns the existing row).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface PatchBody {
  resolutionNote?: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 });
  }

  let body: PatchBody = {};
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    body = {};
  }

  const note = (body.resolutionNote ?? '').slice(0, 200) || null;

  const existing = await prisma.lowStockAlert.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // Idempotent: already resolved
  if (existing.resolvedAt) {
    return NextResponse.json({ data: existing });
  }

  const updated = await prisma.lowStockAlert.update({
    where: { id },
    data: {
      resolvedAt: new Date(),
      resolutionNote: note,
    },
  });

  return NextResponse.json({ data: updated });
}
