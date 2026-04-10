// src/app/api/naver/sync-delivery/route.ts
// A-4: Extract deliveryInfo from existing Naver products → auto-create ShippingTemplate
// Queries products that have naverProductId set, fetches their deliveryInfo,
// and registers a ShippingTemplate if one doesn't already exist for that config.

import { NextResponse } from 'next/server';
import { naverRequest } from '@/lib/naver/api-client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface NaverDeliveryFee {
  deliveryFeeType: string;           // FREE | PAID | CONDITIONAL_FREE
  baseFee?: number;
  freeConditionalAmount?: number;
  returnDeliveryFee?: number;
  exchangeDeliveryFee?: number;
  extraDeliveryFeeByArea?: {
    area2extraFee?: number;          // Jeju
    area3extraFee?: number;          // remote islands
  };
}

interface NaverDeliveryInfo {
  deliveryType: string;
  deliveryAttributeType: string;
  deliveryCompany?: string;
  deliveryFee?: NaverDeliveryFee;
  claimDeliveryInfo?: {
    returnDeliveryFee?: number;
    exchangeDeliveryFee?: number;
  };
}

interface NaverProductDetail {
  originProduct?: {
    deliveryInfo?: NaverDeliveryInfo;
    name?: string;
    sellerProductCode?: string;
  };
}

// Map Naver fee type → our shippingType (1=bundle, 2=individual, 3=conditional, 4=free)
function mapFeeTypeToShippingType(feeType: string): number {
  if (feeType === 'FREE')             return 4;
  if (feeType === 'CONDITIONAL_FREE') return 3;
  return 1;
}

// Map Naver courier code → our courierCode
function mapCourierCode(naverCode?: string): string {
  const MAP: Record<string, string> = {
    CJ_GLS: 'CJGLS', CJ: 'CJGLS', LOTTE: 'LOTTE',
    HANJIN: 'HANJIN', LOGEN: 'LOGEN', EPOST: 'EPOST',
    KDEXP: 'KDEXP', HDEXP: 'HDEXP',
  };
  return naverCode ? (MAP[naverCode] ?? naverCode) : 'CJGLS';
}

/** POST /api/naver/sync-delivery — extract deliveryInfo from live Naver products */
export async function POST() {
  try {
    // Find products that are registered on Naver (use Prisma column name: naverProductId)
    const naverProducts = await prisma.product.findMany({
      where: { naverProductId: { not: null } },
      select: {
        id: true,
        name: true,
        sku: true,
        naverProductId: true,
        shipping_template_id: true,  // correct Prisma column name
      },
      take: 20,
    });

    if (naverProducts.length === 0) {
      return NextResponse.json({
        success: true,
        message: '네이버 naverProductId가 있는 상품이 없습니다.',
        extracted: 0,
        created: 0,
      });
    }

    let extracted = 0;
    let created   = 0;
    const results: Array<{ sku: string; status: string; templateName?: string; error?: string }> = [];

    for (const product of naverProducts) {
      if (!product.naverProductId) continue;
      try {
        const detail = await naverRequest<NaverProductDetail>(
          'GET',
          `/v2/products/origin-products/${product.naverProductId}`
        );

        const delivery = detail?.originProduct?.deliveryInfo;
        if (!delivery) {
          results.push({ sku: product.sku, status: 'skipped', error: 'no deliveryInfo in response' });
          continue;
        }

        extracted++;

        const fee           = delivery.deliveryFee;
        const shippingType  = mapFeeTypeToShippingType(fee?.deliveryFeeType ?? 'PAID');
        const shippingFee   = fee?.baseFee ?? 3000;
        const freeThreshold = fee?.freeConditionalAmount ?? null;
        const returnFee     = fee?.returnDeliveryFee ?? delivery.claimDeliveryInfo?.returnDeliveryFee ?? 6000;
        const exchangeFee   = fee?.exchangeDeliveryFee ?? delivery.claimDeliveryInfo?.exchangeDeliveryFee ?? 6000;
        const jejuFee       = fee?.extraDeliveryFeeByArea?.area2extraFee ?? 5000;
        const islandFee     = fee?.extraDeliveryFeeByArea?.area3extraFee ?? 5000;
        const courierCode   = mapCourierCode(delivery.deliveryCompany);

        const templateName = `NAVER_SYNC_${product.sku}_${fee?.deliveryFeeType ?? 'PAID'}`.slice(0, 60);
        const templateCode = `NS_${Date.now().toString(36).toUpperCase()}_${product.id.slice(0, 6).toUpperCase()}`;

        // Match against existing template with same shipping config
        const existing = await prisma.shippingTemplate.findFirst({
          where: {
            shippingType,
            shippingFee,
            courierCode,
            ...(freeThreshold !== null ? { freeThreshold } : {}),
          },
        });

        let templateId: string;

        if (existing) {
          templateId = existing.id;
          results.push({ sku: product.sku, status: 'matched', templateName: existing.name });
        } else {
          const newTemplate = await prisma.shippingTemplate.create({
            data: {
              name:         templateName,
              code:         templateCode,
              courierCode,
              shippingType,
              shippingFee,
              freeThreshold,
              returnFee,
              exchangeFee,
              jejuFee,
              islandFee,
              active:       true,
            },
          });
          templateId = newTemplate.id;
          created++;
          results.push({ sku: product.sku, status: 'created', templateName });
        }

        // Link template to product if not already set (use correct column name)
        if (!product.shipping_template_id) {
          await prisma.product.update({
            where: { id: product.id },
            data:  { shipping_template_id: templateId },
          });
        }

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({ sku: product.sku, status: 'error', error: msg });
      }
    }

    return NextResponse.json({
      success: true,
      total:     naverProducts.length,
      extracted,
      created,
      results,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delivery sync error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
