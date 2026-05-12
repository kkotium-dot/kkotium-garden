// /api/tags/verify
// ============================================================================
// Sprint 7 P1-C (Session E-2 Sprint 7 P1): tag-dictionary verification
// endpoint. POST body: { tags: string[] }. Returns per-tag verification.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyTags } from '@/lib/naver/tag-dictionary';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawTags = body?.tags;
    if (!Array.isArray(rawTags)) {
      return NextResponse.json({ success: false, error: 'tags 배열이 필요합니다' }, { status: 400 });
    }
    const tags: string[] = rawTags
      .filter((t: unknown): t is string => typeof t === 'string')
      .slice(0, 20); // cap at 20 to keep API bounded
    const result = await verifyTags(tags);
    return NextResponse.json({ success: true, ...result });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
