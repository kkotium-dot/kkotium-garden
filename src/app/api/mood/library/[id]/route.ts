// PATCH /api/mood/library/[id]
// ============================================================================
// Update the learning metadata (rating / favorite) of a library entry. The
// assembled prompt + camera spec are immutable (authority §5 — an actual edit
// is a version++ new row); only the rating / favorite capture is mutable here.
// Reverse-deploy-safe (503 if the table isn't migrated).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function isMissingTable(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  const msg = e instanceof Error ? e.message : String(e);
  return code === 'P2021' || code === 'P2022' || /does not exist|relation .* does not exist|column/i.test(msg);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  let body: Record<string, unknown> | null = null;
  try { body = await req.json(); } catch { body = null; }

  const data: { rating?: number | null; isFavorite?: boolean } = {};
  if ('rating' in (body ?? {})) {
    const r = body?.rating;
    if (r === null) data.rating = null;
    else if (typeof r === 'number' && r >= 1 && r <= 5) data.rating = Math.round(r);
    else return NextResponse.json({ success: false, error: 'rating must be 1..5 or null' }, { status: 400 });
  }
  if (typeof body?.isFavorite === 'boolean') data.isFavorite = body.isFavorite;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ success: false, error: 'nothing to update' }, { status: 400 });
  }

  try {
    const updated = await prisma.promptLibraryEntry.update({
      where: { id },
      data,
      select: { id: true, rating: true, isFavorite: true },
    });
    return NextResponse.json({ success: true, entry: updated });
  } catch (e) {
    if (isMissingTable(e)) {
      return NextResponse.json({ success: false, error: 'library not migrated' }, { status: 503 });
    }
    const code = (e as { code?: string })?.code;
    if (code === 'P2025') {
      return NextResponse.json({ success: false, error: 'entry not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
