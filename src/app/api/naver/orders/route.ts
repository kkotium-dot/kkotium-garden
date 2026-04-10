// GET /api/naver/orders — sync Naver orders into DB
// Called by Vercel Cron (hourly) and manually from dashboard

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrders } from '@/lib/naver/api-client';

// Naver order status → internal status mapping

export const dynamic = 'force-dynamic';
const STATUS_MAP: Record<string, string> = {
  PAYMENT_WAITING:     'PENDING',
  PAYED:               'PAID',
  DELIVERING:          'SHIPPING',
  DELIVERED:           'DELIVERED',
  PURCHASE_DECIDED:    'COMPLETED',
  EXCHANGED:           'EXCHANGED',
  CANCELED:            'CANCELLED',
  RETURNED:            'RETURNED',
  RETURN_REQUESTED:    'RETURN_REQUESTED',
};

export async function GET(request: NextRequest) {
  try {
    const url    = new URL(request.url);
    const hours  = Number(url.searchParams.get('hours') ?? '2');   // default: last 2h
    const manual = url.searchParams.get('manual') === '1';

    // Auth check for cron calls
    const authHeader = request.headers.get('authorization');
    if (!manual && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fromDate = new Date(Date.now() - hours * 3600_000);
    const toDate   = new Date();

    const formatKST = (d: Date) =>
      d.toISOString().replace('Z', '+09:00');

    // Fetch orders from Naver API
    const orderData = await getOrders({
      lastChangedFrom: formatKST(fromDate),
      lastChangedTo:   formatKST(toDate),
      pageSize: 300,
    });

    const orders: any[] = orderData?.data ?? orderData?.content ?? orderData?.productOrders ?? [];
    // Handle case where Naver returns { totalCount, productOrders } or other shapes
    const orderList: any[] = Array.isArray(orders) ? orders : [];

    let synced = 0;
    let skipped = 0;

    for (const order of orderList) {
      try {
        const naverOrderId = String(order.orderNo ?? order.orderId ?? '');
        if (!naverOrderId) { skipped++; continue; }

        const totalAmount = Number(order.generalPaymentAmount ?? order.paymentAmount ?? 0);
        const status      = STATUS_MAP[order.orderStatusType ?? ''] ?? 'PENDING';

        // Upsert order into DB
        await (prisma as any).order.upsert({
          where:  { id: naverOrderId },
          update: { status, updatedAt: new Date() },
          create: {
            id:           naverOrderId,
            orderDate:    new Date(order.paymentDate ?? order.orderDate ?? Date.now()),
            status,
            totalAmount,
            platformOrderId: naverOrderId,
            customerName:    order.orderPerson?.name ?? '',
            customerPhone:   order.orderPerson?.tel   ?? '',
            shippingAddress: order.shippingAddress?.roadAddress ?? '',
          },
        }).catch(() => null); // ignore conflicts

        synced++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      total: orders.length,
      period: `${fromDate.toISOString()} ~ ${toDate.toISOString()}`,
    });
  } catch (e: any) {
    console.error('[naver/orders GET]', e);
    // Return structured error — never crash cron
    return NextResponse.json({
      success: false,
      error:   e.message,
      hint:    e.message?.includes('환경변수')
        ? 'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET을 .env.local에 추가해주세요'
        : undefined,
    }, { status: 500 });
  }
}
