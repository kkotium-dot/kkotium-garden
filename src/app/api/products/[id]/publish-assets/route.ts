// src/app/api/products/[id]/publish-assets/route.ts
//
// Sprint 7-M2 Phase 3-E — POST /api/products/[id]/publish-assets
//
// Patches a Naver Commerce listing with the saved automation assets:
//   - thumbUrl → originProduct.images.representativeImageUrl
//   - detailUrl → originProduct.detailContent (wrapped as <img>)
//
// Body shape
//   - thumbUrl?:  string  Supabase public URL from save-assets
//   - detailUrl?: string  Supabase public URL from save-assets
//
// At least one of (thumbUrl, detailUrl) is required.
//
// Behaviour
//   - 422 when the Product has no naverProductId (= not yet registered on
//     Naver). Caller should register first or call register API.
//   - 200 with the Naver response on success, 500 on Naver-side error.
//   - The PUT body is intentionally minimal (only the fields we want to
//     patch). Naver Commerce API accepts partial updates on
//     /v2/products/origin-products/{productNo}.
//
// Notes
//   - runtime = 'nodejs' (network + Naver auth requires it).
//   - dynamic = 'force-dynamic'.
//   - No Korean strings in this route (workrule #29).
//   - This route is the production-impacting end of the studio pipeline;
//     full integration verification happens in Phase 3-C when the PLANT
//     7th tab calls it end-to-end with a real product.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateProduct } from '@/lib/naver/api-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PublishAssetsBody {
  thumbUrl?: string;
  detailUrl?: string;
}

function jsonError(message: string, status: number, detail?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, detail: detail ?? null },
    { status },
  );
}

function isHttpsUrl(s: unknown): s is string {
  return typeof s === 'string' && /^https:\/\/[\w.-]+\//.test(s);
}

/** Minimal detail-content wrapper. Naver renders the HTML inside the
 *  "상세설명" tab on the product page. A single full-width image is enough
 *  for the v3.1 5-section composite — Naver's renderer handles scrolling. */
function wrapDetailHtml(url: string): string {
  return `<div style="text-align:center;"><img src="${url}" alt="detail" style="max-width:100%;display:block;margin:0 auto;"/></div>`;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const productId = params.id;
  if (!productId) {
    return jsonError('product id required', 400);
  }

  let body: PublishAssetsBody = {};
  try {
    const raw = await req.text();
    body = raw.length > 0 ? (JSON.parse(raw) as PublishAssetsBody) : {};
  } catch (err) {
    return jsonError('invalid JSON body', 400, String(err));
  }

  if (!body.thumbUrl && !body.detailUrl) {
    return jsonError('at least one of thumbUrl / detailUrl is required', 400);
  }
  if (body.thumbUrl && !isHttpsUrl(body.thumbUrl)) {
    return jsonError('thumbUrl must be https URL', 400);
  }
  if (body.detailUrl && !isHttpsUrl(body.detailUrl)) {
    return jsonError('detailUrl must be https URL', 400);
  }

  // Resolve Product → naverProductId
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, naverProductId: true },
  });
  if (!product) {
    return jsonError('product not found', 404, { productId });
  }
  if (!product.naverProductId) {
    return jsonError(
      'product not yet registered on Naver — register before calling publish-assets',
      422,
      { productId },
    );
  }

  // Build minimal patch payload — only fields we want to update.
  // Naver Commerce API accepts partial updates on this endpoint.
  const patch: Record<string, unknown> = {};
  const originProduct: Record<string, unknown> = {};
  if (body.thumbUrl) {
    originProduct.images = { representativeImageUrl: body.thumbUrl };
  }
  if (body.detailUrl) {
    originProduct.detailContent = wrapDetailHtml(body.detailUrl);
  }
  patch.originProduct = originProduct;

  try {
    // updateProduct uses `Partial<NaverProductPayload>` typing but the actual
    // shape we send here is even narrower than the type. Cast through unknown
    // to bypass the strict type until the Naver client gains a dedicated
    // "patch" overload (Sprint 7-M3 cleanup).
    await updateProduct(
      product.naverProductId,
      patch as unknown as Parameters<typeof updateProduct>[1],
    );
    return NextResponse.json({
      ok: true,
      productId: product.id,
      naverProductId: product.naverProductId,
      patched: {
        thumbnail: !!body.thumbUrl,
        detail: !!body.detailUrl,
      },
      publishedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError('naver update failed', 500, msg);
  }
}
