// src/app/api/products/[id]/save-assets/route.ts
//
// Sprint 7-M2 Phase 3-A — POST /api/products/[id]/save-assets
//
// Persists base64-encoded thumbnail and/or detail page buffers to
// Supabase Storage under the `product-assets` bucket. Returns public
// URLs the caller can use immediately (CDN-backed, immutable paths).
//
// Body shape
//   - thumbBase64?:    string   base64 PNG buffer
//   - thumbVariant?:   string   variant id (clean / price / badge / lifestyle)
//   - detailBase64?:   string   base64 PNG buffer
//   - skeletonId?:     string   skeleton id (S1..S12) for the detail page
//
// At least one of (thumbBase64, detailBase64) is required. Each upload is
// independent — partial success returns 200 with the successful URLs.
//
// Notes
//   - runtime = 'nodejs' (Buffer.from is Node-only).
//   - dynamic = 'force-dynamic' per workrule #11.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadAutomationAsset } from '@/lib/storage/automation-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SaveAssetsBody {
  thumbBase64?: string;
  thumbVariant?: string;
  detailBase64?: string;
  skeletonId?: string;
}

function jsonError(message: string, status: number, detail?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, detail: detail ?? null },
    { status },
  );
}

function decodeBase64(s: string): Buffer | null {
  try {
    return Buffer.from(s, 'base64');
  } catch {
    return null;
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const productId = params.id;
  if (!productId) {
    return jsonError('product id required', 400);
  }

  let body: SaveAssetsBody = {};
  try {
    const raw = await req.text();
    body = raw.length > 0 ? (JSON.parse(raw) as SaveAssetsBody) : {};
  } catch (err) {
    return jsonError('invalid JSON body', 400, String(err));
  }

  if (!body.thumbBase64 && !body.detailBase64) {
    return jsonError('at least one of thumbBase64 / detailBase64 is required', 400);
  }

  // Verify product exists (foreign key sanity)
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return jsonError('product not found', 404, { productId });
  }

  const thumbVariant = (body.thumbVariant ?? 'main').replace(/[^a-zA-Z0-9-]/g, '');
  const skeletonId = (body.skeletonId ?? 'S0').replace(/[^a-zA-Z0-9-]/g, '');

  let thumbResult: { publicUrl: string; path: string } | null = null;
  let detailResult: { publicUrl: string; path: string } | null = null;
  const errors: Array<{ kind: string; message: string }> = [];

  if (body.thumbBase64) {
    const buf = decodeBase64(body.thumbBase64);
    if (!buf) {
      errors.push({ kind: 'thumbnail', message: 'base64 decode failed' });
    } else {
      try {
        const r = await uploadAutomationAsset({
          productId,
          kind: 'thumbnail',
          variant: thumbVariant || 'main',
          buffer: buf,
        });
        thumbResult = { publicUrl: r.publicUrl, path: r.path };
      } catch (err) {
        errors.push({ kind: 'thumbnail', message: String(err) });
      }
    }
  }

  if (body.detailBase64) {
    const buf = decodeBase64(body.detailBase64);
    if (!buf) {
      errors.push({ kind: 'detail', message: 'base64 decode failed' });
    } else {
      try {
        const r = await uploadAutomationAsset({
          productId,
          kind: 'detail',
          variant: skeletonId || 'S0',
          buffer: buf,
        });
        detailResult = { publicUrl: r.publicUrl, path: r.path };
      } catch (err) {
        errors.push({ kind: 'detail', message: String(err) });
      }
    }
  }

  // B-11 (2026-05-27): persist resulting public URLs on the Product row so
  // downstream consumers (especially POST /api/naver/register, which embeds
  // detail_image_url into the Commerce API detailContent) can read them from
  // the canonical DB column instead of relying on in-memory client state.
  // Update only the columns that actually got a fresh URL this call.
  if (thumbResult || detailResult) {
    try {
      await prisma.product.update({
        where: { id: productId },
        data: {
          ...(thumbResult ? { main_image_url: thumbResult.publicUrl } : {}),
          ...(detailResult ? { detail_image_url: detailResult.publicUrl } : {}),
        },
      });
    } catch (err) {
      errors.push({ kind: 'db', message: `product update failed: ${String(err)}` });
    }
  }

  const status = errors.length > 0 && !thumbResult && !detailResult ? 500 : 200;
  return NextResponse.json(
    {
      ok: status === 200,
      thumbUrl: thumbResult?.publicUrl ?? null,
      thumbPath: thumbResult?.path ?? null,
      detailUrl: detailResult?.publicUrl ?? null,
      detailPath: detailResult?.path ?? null,
      errors,
      savedAt: new Date().toISOString(),
    },
    { status },
  );
}
