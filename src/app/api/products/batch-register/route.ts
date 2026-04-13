// src/app/api/products/batch-register/route.ts
// C-3: Batch registration API — register multiple products to Naver at once
// POST { productIds: string[], dryRun?: boolean }
// Sequential registration with 2-second delay between each (Naver rate limit)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildNaverProductPayload } from '@/lib/naver/product-builder';
import { naverRequest } from '@/lib/naver/api-client';
import { sendDiscord } from '@/lib/discord';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_DELAY = 2000; // 2 seconds between API calls (Naver limit)

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds, dryRun } = body as {
      productIds: string[];
      dryRun?: boolean;
    };

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'productIds required (array)' },
        { status: 400 },
      );
    }

    if (productIds.length > 20) {
      return NextResponse.json(
        { success: false, error: 'Maximum 20 products per batch' },
        { status: 400 },
      );
    }

    // Load all products with supplier + shipping template
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        supplier: {
          include: {
            defaultShippingTemplate: true,
          },
        },
        shipping_templates: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No products found' },
        { status: 404 },
      );
    }

    // Store settings for shipping address IDs
    const storeSettings = await prisma.$queryRaw<Array<{ key: string; value: string }>>`
      SELECT key, value FROM store_settings WHERE key IN ('shipping_address_id', 'return_address_id')
    `.catch(() => []);
    const settingsMap: Record<string, string> = {};
    for (const s of storeSettings) {
      settingsMap[s.key] = s.value;
    }
    const shippingAddressId = parseInt(settingsMap['shipping_address_id'] ?? '0');
    const returnAddressId = parseInt(settingsMap['return_address_id'] ?? '0');

    // Process each product
    const results: Array<{
      id: string;
      name: string;
      sku: string;
      status: 'success' | 'skipped' | 'error';
      naverProductId?: string;
      error?: string;
    }> = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      // Skip already registered
      if (product.naverProductId) {
        results.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          status: 'skipped',
          error: 'Already registered on Naver',
          naverProductId: product.naverProductId,
        });
        continue;
      }

      try {
        // Build Naver API payload
        const template = product.shipping_templates ?? product.supplier?.defaultShippingTemplate;
        const naverTemplateNo = template?.naverTemplateNo;

        const payload = buildNaverProductPayload(product as any, {
          deliveryFee: {
            deliveryFeeType: template?.freeThreshold ? 'CONDITIONAL_FREE' : 'PAID',
            baseFee: template?.shippingFee ?? 3000,
            freeConditionalAmount: template?.freeThreshold ?? undefined,
            deliveryFeePayType: 'PREPAID',
          },
          claimDeliveryInfo: {
            returnDeliveryFee: template?.returnFee ?? 6000,
            exchangeDeliveryFee: template?.exchangeFee ?? 6000,
            shippingAddressId,
            returnAddressId,
          },
        } as any);

        if (dryRun) {
          results.push({
            id: product.id,
            name: product.name,
            sku: product.sku,
            status: 'success',
            naverProductId: 'DRY_RUN',
          });
          continue;
        }

        // Register on Naver
        const response = await naverRequest('POST', '/v2/products', payload);
        const naverProductId = (response as any)?.smartstoreChannelProductNo
          ?? (response as any)?.id
          ?? String(response);

        // Update local DB
        await prisma.product.update({
          where: { id: product.id },
          data: {
            naverProductId: String(naverProductId),
            status: 'ACTIVE',
            updatedAt: new Date(),
          },
        });

        results.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          status: 'success',
          naverProductId: String(naverProductId),
        });

        // Rate limit delay (skip for last item)
        if (i < products.length - 1) {
          await delay(RATE_LIMIT_DELAY);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          status: 'error',
          error: msg,
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    // Discord notification
    if (successCount > 0 && !dryRun) {
      await sendDiscord('OPS_REPORT', '', [{
        title: ':package: Batch Registration Complete',
        description: `${successCount}/${products.length}개 상품 네이버 일괄 등록 완료`,
        color: errorCount > 0 ? 0xeab308 : 0x16a34a,
        fields: [
          { name: '성공', value: `${successCount}개`, inline: true },
          { name: '건너뜀', value: `${skippedCount}개`, inline: true },
          { name: '실패', value: `${errorCount}개`, inline: true },
          ...results.filter(r => r.status === 'success').slice(0, 5).map(r => ({
            name: r.sku,
            value: r.name.slice(0, 40),
            inline: false,
          })),
        ],
        footer: { text: '꽃티움 가든 · 배치 등록' },
        timestamp: new Date().toISOString(),
      }]).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      total: products.length,
      successCount,
      errorCount,
      skippedCount,
      dryRun: !!dryRun,
      results,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
