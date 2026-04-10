// app/api/products/[id]/route.ts
// A-7: Enhanced margin danger Discord alert — shows target 42% vs actual
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDiscord, buildPriceChangeEmbed } from '@/lib/discord';


export const dynamic = 'force-dynamic';
const NAVER_FEE_RATE = 0.05733;
const TARGET_MARGIN_RATE = 0.42; // 42% target margin threshold

function calcNetMargin(salePrice: number, supplierPrice: number, shippingFee = 3000): number {
  if (salePrice <= 0) return 0;
  const fee    = salePrice * NAVER_FEE_RATE;
  const profit = salePrice - supplierPrice - shippingFee - fee;
  return (profit / salePrice) * 100;
}

/**
 * PATCH: Partial update — status, shipping_template_id, supplierId, price, etc.
 * A-7: Triggers enhanced Discord margin alert when net margin drops below target
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const allowed = [
      'status', 'shipping_template_id', 'supplierId',
      'salePrice', 'supplierPrice', 'aiScore',
      'naverProductId', 'naverCategoryCode',
      'name', 'keywords', 'tags', 'aiGeneratedTitle', 'updatedAt',
      'naver_title', 'naver_keywords', 'naver_description',
    ] as const;

    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        data[key] = body[key];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    // Capture existing values before update
    const priceChanged =
      ('supplierPrice' in data && typeof data.supplierPrice === 'number') ||
      ('salePrice'     in data && typeof data.salePrice     === 'number');

    let existing: {
      name: string; sku: string;
      supplierPrice: number; salePrice: number; shippingFee: number | null;
    } | null = null;

    if (priceChanged) {
      existing = await prisma.product.findUnique({
        where: { id },
        select: { name: true, sku: true, supplierPrice: true, salePrice: true, shippingFee: true },
      });
    }

    const product = await prisma.product.update({ where: { id }, data });

    // A-7: Margin-aware Discord notification
    if (priceChanged && existing) {
      const oldSupplierPrice = existing.supplierPrice;
      const newSupplierPrice = typeof data.supplierPrice === 'number' ? data.supplierPrice : oldSupplierPrice;
      const oldSalePrice     = existing.salePrice;
      const newSalePrice     = typeof data.salePrice     === 'number' ? data.salePrice     : oldSalePrice;
      const sf               = existing.shippingFee ?? 3000;

      const changePct = oldSupplierPrice > 0
        ? ((newSupplierPrice - oldSupplierPrice) / oldSupplierPrice) * 100
        : 0;

      if (Math.abs(changePct) >= 1 || typeof data.salePrice === 'number') {
        const oldMargin = calcNetMargin(oldSalePrice, oldSupplierPrice, sf);
        const newMargin = calcNetMargin(newSalePrice, newSupplierPrice, sf);

        // Build embed with margin danger context (A-7)
        const embed = buildPriceChangeEmbed({
          changes: [{
            productName: existing.name,
            sku:         existing.sku,
            oldPrice:    oldSupplierPrice,
            newPrice:    newSupplierPrice,
            changePct,
            oldMargin,
            newMargin,
          }],
        });

        // A-7: Append margin danger warning when net margin falls below 42% target
        const targetPct = TARGET_MARGIN_RATE * 100;
        if (newMargin < targetPct) {
          // Cast to typed array — buildPriceChangeEmbed returns Record<string,unknown>
          const embedFields = embed.fields as Array<{ name: string; value: string; inline: boolean }> | undefined;
          if (embedFields) {
            embedFields.push({
              name: '마진 경고',
              value: `현재 순마진 **${newMargin.toFixed(1)}%** (목표 ${targetPct}% 미달 ${(targetPct - newMargin).toFixed(1)}%p 부족)\n판매가 조정 또는 공급가 재협상이 필요합니다.`,
              inline: false,
            });
          }
          // Override embed color to danger red
          embed.color = 0xDC2626;
        }

        sendDiscord('PRICE_CHANGE', '', [embed]).catch(() => {});

        prisma.productEvent.create({
          data: {
            productId: id,
            type:      'PRICE_CHANGE',
            oldValue:  String(oldSupplierPrice),
            newValue:  String(newSupplierPrice),
            note:      `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}% / margin: ${oldMargin.toFixed(1)}% -> ${newMargin.toFixed(1)}%${newMargin < targetPct ? ' [DANGER]' : ''}`,
          },
        }).catch(() => {});
      }
    }

    if ('status' in data && typeof data.status === 'string') {
      prisma.productEvent.create({
        data: {
          productId: id,
          type:      'STATUS_CHANGE',
          newValue:  data.status as string,
          note:      'Status updated via PATCH',
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, product });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Product PATCH error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * GET: Product detail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        supplier: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!product) {
      return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다' }, { status: 404 });
    }
    return NextResponse.json({ success: true, product });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * DELETE: Product delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다' }, { status: 404 });
    }
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true, message: '상품이 삭제되었습니다' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/**
 * PUT: Full product update — all 27 Naver SEO fields
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      name, category, supplierPrice, salePrice, shippingFee,
      keywords, description, images, mainImage, options, hasOptions, status,
      naver_title, naver_keywords, naver_description, naver_brand,
      naver_manufacturer, naver_origin, naver_material, naver_color,
      naver_size, naver_weight, naver_care_instructions, naver_warranty,
      naver_certification, naver_tax_type, naver_gift_wrapping, naver_as_info,
      naver_delivery_info, naver_exchange_info, naver_refund_info,
      naver_min_order, naver_max_order, naver_adult_only, naver_parallel_import,
      naver_custom_option_1, naver_custom_option_2, naver_custom_option_3, naver_meta_tags,
    } = body;

    let margin = 0;
    if (supplierPrice && salePrice) {
      const platformFee = Math.round(parseInt(salePrice) * 0.058);
      const totalCost   = parseInt(supplierPrice) + parseInt(shippingFee || 0);
      const profit      = parseInt(salePrice) - totalCost - platformFee;
      margin = Math.round((profit / parseInt(salePrice)) * 100);
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name, category: category || undefined,
        supplierPrice: supplierPrice ? parseInt(supplierPrice) : undefined,
        salePrice:     salePrice     ? parseInt(salePrice)     : undefined,
        shippingFee:   shippingFee   ? parseInt(shippingFee)   : undefined,
        margin, keywords: keywords || undefined, description: description || undefined,
        mainImage: mainImage || undefined, images: images || [],
        hasOptions: hasOptions || false, options: options || undefined, status: status || undefined,
        naver_title: naver_title ?? undefined, naver_keywords: naver_keywords ?? undefined,
        naver_description: naver_description ?? undefined, naver_brand: naver_brand ?? undefined,
        naver_manufacturer: naver_manufacturer ?? undefined, naver_origin: naver_origin ?? undefined,
        naver_material: naver_material ?? undefined, naver_color: naver_color ?? undefined,
        naver_size: naver_size ?? undefined, naver_weight: naver_weight ?? undefined,
        naver_care_instructions: naver_care_instructions ?? undefined,
        naver_warranty: naver_warranty ?? undefined, naver_certification: naver_certification ?? undefined,
        naver_tax_type: naver_tax_type ?? undefined, naver_gift_wrapping: naver_gift_wrapping ?? undefined,
        naver_as_info: naver_as_info ?? undefined, naver_delivery_info: naver_delivery_info ?? undefined,
        naver_exchange_info: naver_exchange_info ?? undefined, naver_refund_info: naver_refund_info ?? undefined,
        naver_min_order: naver_min_order ?? undefined, naver_max_order: naver_max_order ?? undefined,
        naver_adult_only: naver_adult_only ?? undefined, naver_parallel_import: naver_parallel_import ?? undefined,
        naver_custom_option_1: naver_custom_option_1 ?? undefined,
        naver_custom_option_2: naver_custom_option_2 ?? undefined,
        naver_custom_option_3: naver_custom_option_3 ?? undefined,
        naver_meta_tags: naver_meta_tags ?? undefined,
      },
      include: { supplier: true, user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ success: true, product, message: '상품이 수정되었습니다' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
