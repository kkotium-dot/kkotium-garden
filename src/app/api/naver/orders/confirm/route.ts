// src/app/api/naver/orders/confirm/route.ts
// B-2: Bulk order confirm (발주확인) via Naver Commerce API
// POST { productOrderIds: string[] }

import { NextRequest, NextResponse } from 'next/server';
import { naverRequest } from '@/lib/naver/api-client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { productOrderIds } = await request.json();
    if (!Array.isArray(productOrderIds) || productOrderIds.length === 0) {
      return NextResponse.json({ success: false, error: 'productOrderIds required' }, { status: 400 });
    }

    // Naver API: confirm product orders
    const result = await naverRequest('POST', '/v1/pay-order/seller/product-orders/confirm', {
      productOrderIds,
    });

    return NextResponse.json({
      success: true,
      confirmed: productOrderIds.length,
      result,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const isIp = msg.includes('IP_NOT_ALLOWED') || msg.includes('IP');
    return NextResponse.json({
      success: false,
      error: msg,
      ipError: isIp,
    }, { status: 500 });
  }
}
