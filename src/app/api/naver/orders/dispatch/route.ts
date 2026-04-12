// src/app/api/naver/orders/dispatch/route.ts
// B-2: Ship order (배송 처리 + 송장 등록) via Naver Commerce API
// POST { productOrderId, deliveryCompany, trackingNumber }

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { naverRequest } from '@/lib/naver/api-client';

export const dynamic = 'force-dynamic';

// Naver courier code map — display name -> API code
export const COURIER_MAP: Record<string, string> = {
  'CJ대한통운': 'CJGLS',
  '한진택배':   'HANJIN',
  '롯데택배':   'LOTTE',
  '우체국':     'EPOST',
  '로젠택배':   'LOGEN',
  'GS편의점택배': 'GS25',
  'CU편의점택배': 'CVSNET',
  '쿠팡':       'COUPANG',
  'DHL':        'DHL',
  'FedEx':      'FEDEX',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productOrderId, deliveryCompany, trackingNumber } = body as {
      productOrderId: string;
      deliveryCompany: string;
      trackingNumber: string;
    };

    if (!productOrderId || !deliveryCompany || !trackingNumber) {
      return NextResponse.json(
        { success: false, error: 'productOrderId, deliveryCompany, trackingNumber 모두 필요합니다.' },
        { status: 400 }
      );
    }

    const deliveryCompanyCode = COURIER_MAP[deliveryCompany] ?? deliveryCompany;

    // Naver Commerce API: dispatch (배송 처리)
    const result = await naverRequest(
      'POST',
      '/v1/pay-order/seller/product-orders/dispatch',
      {
        dispatchProductOrders: [{
          productOrderId,
          deliveryMethod:      'PARCEL',
          deliveryCompanyCode,
          trackingNumber,
        }],
      }
    );

    // Update local DB — status SHIPPING + tracking info
    await (prisma as any).order.update({
      where:  { id: productOrderId },
      data:   {
        status:         'SHIPPING',
        trackingNumber,
        courierCompany: deliveryCompany,
        updatedAt:      new Date(),
      },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      productOrderId,
      deliveryCompany,
      trackingNumber,
      result,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
