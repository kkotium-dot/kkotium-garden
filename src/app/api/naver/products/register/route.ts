// src/app/api/naver/products/register/route.ts
// C-1: Naver Commerce API direct product registration
// POST /api/naver/products/register { productId, skipImageUpload?, forceRegister? }
// Flow: validate (C-8 + readiness) -> build payload -> register -> save naverProductId

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { naverRequest } from '@/lib/naver/api-client';
import {
  buildNaverProductPayload,
  buildDeliveryInfo,
  buildDeliveryInfoFromProduct,
  validateForRegistration,
  type LocalProduct,
  type ShippingTemplateData,
  type AddressIds,
} from '@/lib/naver/product-builder';

export const dynamic = 'force-dynamic';

// ── Get cached address IDs from StoreSettings ────────────────────────────────

async function getAddressIds(): Promise<AddressIds | null> {
  try {
    const settings = await prisma.storeSettings.findFirst();
    if (!settings?.asGuide) return null;
    const cached = JSON.parse(settings.asGuide);
    if (cached.releaseAddressId && cached.returnAddressId) {
      return {
        releaseAddressId: Number(cached.releaseAddressId),
        returnAddressId: Number(cached.returnAddressId),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, forceRegister } = body as {
      productId: string;
      forceRegister?: boolean;
    };

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId is required' },
        { status: 400 }
      );
    }

    // 1. Load product with relations
    const dbProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { product_options: true },
    });

    if (!dbProduct) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    if (dbProduct.naverProductId) {
      return NextResponse.json(
        { success: false, error: 'Already registered on Naver', naverProductId: dbProduct.naverProductId },
        { status: 409 }
      );
    }

    // 2. Load shipping template if linked
    let shippingTemplate: ShippingTemplateData | null = null;
    if (dbProduct.shipping_template_id) {
      const tmpl = await prisma.shippingTemplate.findUnique({
        where: { id: dbProduct.shipping_template_id },
      });
      if (tmpl) {
        shippingTemplate = {
          courierCode: tmpl.courierCode,
          shippingType: tmpl.shippingType,
          shippingFee: tmpl.shippingFee,
          freeThreshold: tmpl.freeThreshold,
          returnFee: tmpl.returnFee,
          exchangeFee: tmpl.exchangeFee,
          jejuFee: tmpl.jejuFee,
          islandFee: tmpl.islandFee,
        };
      }
    }

    // 3. Get address IDs
    const addresses = await getAddressIds();

    // 4. Map DB product to LocalProduct interface
    const product: LocalProduct = {
      ...dbProduct,
      additionalImages: dbProduct.additionalImages as unknown,
      keywords: dbProduct.keywords as unknown,
      tags: dbProduct.tags as unknown,
      product_options: dbProduct.product_options ?? null,
    };

    // 5. Validate (C-8 attribute completeness + upload readiness gate)
    const validation = validateForRegistration(
      product,
      !!shippingTemplate,
      !!addresses,
    );

    if (!validation.canRegister && !forceRegister) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed — fix issues before registration',
        validation,
      }, { status: 422 });
    }

    if (!addresses) {
      return NextResponse.json({
        success: false,
        error: 'Naver address IDs not available. Sync addressbook first: GET /api/naver/addressbooks',
      }, { status: 400 });
    }

    // 6. Build delivery info (from template or product fields)
    const deliveryInfo = shippingTemplate
      ? buildDeliveryInfo(shippingTemplate, addresses)
      : buildDeliveryInfoFromProduct(product, addresses);

    // 7. Build full payload
    // Image URLs: use Supabase URLs directly — Naver API accepts external URLs
    // and copies them to its own CDN (shop1.phinf.naver.net) automatically
    const payload = buildNaverProductPayload(product, deliveryInfo);

    // 8. Register on Naver Commerce API
    const result = await naverRequest<any>('POST', '/v2/products', payload);
    const naverProductId = String(
      result?.productNo ?? result?.originProductNo ?? result?.id ?? ''
    );

    if (!naverProductId) {
      return NextResponse.json({
        success: false,
        error: 'Registration API returned no product ID',
        naverResponse: result,
      }, { status: 500 });
    }

    // 9. Update local DB: save naverProductId + set ACTIVE
    await prisma.product.update({
      where: { id: productId },
      data: {
        naverProductId,
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
    });

    // 10. Log registration event
    try {
      await prisma.productEvent.create({
        data: {
          productId,
          type: 'NAVER_REGISTERED',
          oldValue: dbProduct.status,
          newValue: naverProductId,
          note: `API direct (attr:${validation.attributeGrade} readiness:${validation.readinessScore}%)`,
        },
      });
    } catch {
      // Non-critical — event logging failure should not block registration
    }

    return NextResponse.json({
      success: true,
      naverProductId,
      validation,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Naver product registration error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
