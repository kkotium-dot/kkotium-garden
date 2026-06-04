// src/app/api/products/publish-readiness/route.ts
//
// 2026-06-04 — Batch publish-readiness endpoint for the Publish Control Tower.
// Evaluates N DRAFT products in one round (shared loadAndEvaluateProducts, N+1
// guarded). Read-only — never registers or mutates. (HANDOFF §2 STEP A.)

import { NextResponse } from 'next/server';
import {
  loadAndEvaluateProducts,
  listDraftProductIds,
} from '@/lib/automation/load-publish-readiness';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'DRAFT';
  const limitRaw = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.trunc(limitRaw)), MAX_LIMIT)
    : DEFAULT_LIMIT;

  // Currently only DRAFT is meaningful for "publishable" (the engine requires
  // status === 'DRAFT' && naverProductId === null for publishReady). Other
  // statuses return empty rather than guessing.
  if (status !== 'DRAFT') {
    return NextResponse.json({ ok: true, items: [], note: 'only DRAFT supported' });
  }

  const ids = await listDraftProductIds(limit);
  const loaded = await loadAndEvaluateProducts(ids);

  const items = loaded.map(({ result, display }) => ({
    productId: result.productId,
    name: display.name,
    mainImage: display.mainImage,
    publishReady: result.publishReady,
    hardComplete: result.hardComplete,
    seoComplete: result.seoComplete,
    authentic: result.authentic,
    naverPayloadComplete: result.naverPayloadComplete,
    hardFieldsMissing: result.hardFieldsMissing,
    seoFieldsMissing: result.seoFieldsMissing,
    authenticityViolations: result.authenticityViolations,
    naverPayloadMissing: result.naverPayloadMissing,
    margin: display.margin,
    salePrice: display.salePrice,
    supplierPrice: display.supplierPrice,
  }));

  return NextResponse.json({ ok: true, items });
}
