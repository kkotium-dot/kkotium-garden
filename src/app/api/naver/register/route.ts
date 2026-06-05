// src/app/api/naver/register/route.ts
//
// B-12 root rewrite (2026-05-27):
//   - Drop the hardcoded `categoryMap` (apparel-7) — use `Product.naverCategoryCode`
//     verbatim. Empty/whitespace blocks registration (no silent fallback).
//   - Drop X-Naver-Client-Id/Secret direct header auth (that is the legacy
//     "search" API surface). Commerce API requires OAuth2 client_credentials
//     with bcrypt-signed `client_secret_sign`. Delegate to `naverRequest`
//     (`src/lib/naver/api-client.ts`) which already implements both the
//     proxy and direct OAuth2 paths used by every other working route.
//   - Drop PENDING_/ERROR_/MOCK_ fake naverProductId injection. Commerce API
//     failure leaves Product.status untouched and surfaces the real reason
//     to the caller (#46 — false-label ban).
//   - Build detailContent so `product.detail_image_url` is rendered inside
//     the body (same `<img>` pattern as `src/lib/naver/product-builder.ts:
//     buildDetailContent` and `src/app/api/naver/excel/route.ts`).
//   - Prisma singleton; no `new PrismaClient()` and no Supabase client.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { naverRequest } from '@/lib/naver/api-client';
import { resolveOriginAreaCode } from '@/lib/naver/product-builder';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

interface DetailParts {
  name: string;
  description: string | null;
  hookPhrase: string | null;
  detail_image_url: string | null;
}

function buildDetailContent(p: DetailParts): string {
  const parts: string[] = [];

  if (p.hookPhrase) {
    parts.push(
      `<div style="text-align:center;padding:20px 0;font-size:16px;color:#333;">${escapeHtml(p.hookPhrase)}</div>`,
    );
  }
  if (p.detail_image_url) {
    parts.push(
      `<div style="text-align:center;"><img src="${escapeHtml(p.detail_image_url)}" style="max-width:860px;width:100%;" alt="${escapeHtml(p.name)}" /></div>`,
    );
  }
  if (p.description) {
    parts.push(
      `<div style="padding:20px;font-size:14px;line-height:1.8;color:#555;">${escapeHtml(p.description).replace(/\n/g, '<br/>')}</div>`,
    );
  }
  if (parts.length === 0) {
    parts.push(
      `<div style="text-align:center;padding:40px;font-size:14px;color:#888;">${escapeHtml(p.name)}</div>`,
    );
  }
  return parts.join('\n');
}

function fail(message: string, status: number, detail?: unknown) {
  return NextResponse.json(
    { success: false, error: message, ...(detail !== undefined ? { detail } : {}) },
    { status },
  );
}

export async function POST(request: NextRequest) {
  let productId: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    productId = typeof body?.productId === 'string' ? body.productId.trim() : undefined;
    if (!productId) {
      return fail('productId required', 400);
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return fail('product not found', 404, { productId });
    }

    // ── Gate 1: verified naver category (#46 — no silent apparel fallback) ──
    const naverCategoryCode = (product.naverCategoryCode ?? '').trim();
    if (!naverCategoryCode) {
      return fail(
        'naverCategoryCode is empty — register blocked. set a verified leaf category on Product first.',
        422,
        { productId, currentCategory: product.category ?? null },
      );
    }

    // ── Gate 2: representative image ─────────────────────────────────────────
    if (!product.mainImage) {
      return fail('mainImage required — register blocked.', 422, { productId });
    }

    // ── Gate 3: pricing sanity ───────────────────────────────────────────────
    if (!product.salePrice || product.salePrice <= 0) {
      return fail('salePrice must be > 0', 422, { productId, salePrice: product.salePrice });
    }

    // ── Build payload (Commerce API v2 shape) ────────────────────────────────
    // Validate/normalize against the official origin table (restores a stripped
    // leading zero, throws on an unknown code) — same guard as product-builder.
    const originAreaCode = resolveOriginAreaCode((product.originCode ?? '').trim() || '0200037');

    const detailContent = buildDetailContent({
      name: product.name,
      description: product.description,
      hookPhrase: product.hookPhrase,
      detail_image_url: product.detail_image_url,
    });

    const shippingFee = product.shippingFee ?? 0;

    const payload = {
      originProduct: {
        statusType: 'SALE' as const,
        saleType: 'NEW' as const,
        leafCategoryId: naverCategoryCode,
        name: product.name.slice(0, 100),
        detailContent,
        images: {
          representativeImage: { url: product.mainImage },
        },
        salePrice: product.salePrice,
        stockQuantity: 999,
        deliveryInfo: {
          deliveryType: 'DELIVERY' as const,
          deliveryAttributeType: 'NORMAL' as const,
          deliveryCompany: product.courierCode || 'CJGLS',
          deliveryBundleGroupUsable: true,
          deliveryFee: {
            deliveryFeeType: shippingFee > 0 ? ('PAID' as const) : ('FREE' as const),
            baseFee: shippingFee,
          },
          claimDeliveryInfo: {
            returnDeliveryFee: product.returnShippingFee ?? 3000,
            exchangeDeliveryFee: product.exchangeShippingFee ?? 6000,
          },
        },
        detailAttribute: {
          originAreaInfo: {
            originAreaCode,
            ...(product.naver_origin ? { content: product.naver_origin } : {}),
          },
          afterServiceInfo: {
            afterServiceTelephoneNumber: product.asPhone ?? '010-0000-0000',
            afterServiceGuideContent: product.asInfo ?? '10:00~18:00',
          },
          ...(product.sku
            ? { sellerCodeInfo: { sellerManagementCode: product.sku } }
            : {}),
        },
      },
      smartstoreChannelProduct: {
        naverShoppingRegistration: true,
        channelProductDisplayStatusType: 'ON' as const,
      },
    };

    // ── Call Commerce API via OAuth2 helper ──────────────────────────────────
    let naverResponse: any;
    try {
      naverResponse = await naverRequest<any>('POST', '/v2/products', payload);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error('[naver/register] commerce api call failed:', msg);
      // Failure is failure. No status mutation, no fake productId (#46).
      return fail('naver commerce api failed', 502, {
        productId,
        message: msg,
      });
    }

    const naverProductId = String(
      naverResponse?.productNo
        ?? naverResponse?.originProductNo
        ?? naverResponse?.id
        ?? '',
    ).trim();

    if (!naverProductId) {
      console.error(
        '[naver/register] commerce api returned 2xx but no productNo/originProductNo/id',
        naverResponse,
      );
      return fail('naver api response missing productNo/originProductNo/id', 502, {
        productId,
        naverResponse,
      });
    }

    // ── Success: only now mutate Product state ───────────────────────────────
    await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'registered',
        naverProductId,
      },
    });

    return NextResponse.json({
      success: true,
      naverProductId,
      message: 'naver smartstore registered',
    });
  } catch (error: any) {
    const msg = error?.message ?? 'unknown error';
    console.error('[naver/register] exception:', msg, error?.stack);
    return NextResponse.json(
      { success: false, error: msg, ...(productId ? { productId } : {}) },
      { status: 500 },
    );
  }
}
