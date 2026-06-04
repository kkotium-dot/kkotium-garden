// src/app/api/products/[id]/publish-readiness/route.ts
//
// 2026-05-31 — Publish-readiness gate endpoint (single product).
// 2026-06-04 — Refactored to share loadAndEvaluateProducts with the batch
//   endpoint (/api/products/publish-readiness). Response shape unchanged.

import { NextResponse } from 'next/server';
import { loadAndEvaluateProducts } from '@/lib/automation/load-publish-readiness';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number, detail?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, detail: detail ?? null },
    { status },
  );
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const productId = params.id;
  if (!productId) return jsonError('product id required', 400);

  const loaded = await loadAndEvaluateProducts([productId]);
  if (loaded.length === 0) return jsonError('product not found', 404, { productId });

  // Response shape unchanged: { ok, ...result }. (display extras omitted here to
  // preserve the exact prior contract; the batch endpoint exposes them.)
  return NextResponse.json({ ok: true, ...loaded[0].result });
}
