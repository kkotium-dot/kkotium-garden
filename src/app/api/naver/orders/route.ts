// GET /api/naver/orders — sync Naver orders into DB
// Called by Vercel Cron (hourly) and manually from dashboard
// NOTE: Naver API allows max 24h window per request — splits longer ranges automatically

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrders } from '@/lib/naver/api-client';

export const dynamic = 'force-dynamic';

const STATUS_MAP: Record<string, string> = {
  PAYMENT_WAITING:  'PENDING',
  PAYED:            'PAID',
  DELIVERING:       'SHIPPING',
  DELIVERED:        'DELIVERED',
  PURCHASE_DECIDED: 'COMPLETED',
  EXCHANGED:        'EXCHANGED',
  CANCELED:         'CANCELLED',
  RETURNED:         'RETURNED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
};

// Format date as KST ISO string for Naver API
const toKST = (d: Date) => d.toISOString().replace('Z', '+09:00');

// Split [from, to] into 24h windows (Naver API limit)
function splitInto24hWindows(from: Date, to: Date): { from: Date; to: Date }[] {
  const windows: { from: Date; to: Date }[] = [];
  const MAX_MS = 23 * 60 * 60 * 1000; // 23h to be safe
  let cursor = new Date(from);
  while (cursor < to) {
    const end = new Date(Math.min(cursor.getTime() + MAX_MS, to.getTime()));
    windows.push({ from: new Date(cursor), to: end });
    cursor = end;
  }
  return windows;
}

export async function GET(request: NextRequest) {
  try {
    const url    = new URL(request.url);
    const hours  = Number(url.searchParams.get('hours') ?? '2');
    const manual = url.searchParams.get('manual') === '1';

    // Auth check for cron calls
    const authHeader = request.headers.get('authorization');
    if (!manual && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fromDate = new Date(Date.now() - hours * 3_600_000);
    const toDate   = new Date();

    // Split into 24h windows if range > 24h
    const windows = splitInto24hWindows(fromDate, toDate);

    let allOrders: any[] = [];

    for (const window of windows) {
      try {
        const orderData = await getOrders({
          lastChangedFrom: toKST(window.from),
          lastChangedTo:   toKST(window.to),
          pageSize: 300,
        });
        const chunk: any[] =
          orderData?.data ??
          orderData?.content ??
          orderData?.productOrders ??
          [];
        if (Array.isArray(chunk)) allOrders = allOrders.concat(chunk);
      } catch (winErr: any) {
        // Log per-window error but continue
        console.error(`[naver/orders] window ${toKST(window.from)} ~ ${toKST(window.to)} error:`, winErr.message);
      }
    }

    let synced = 0;
    let skipped = 0;

    for (const order of allOrders) {
      try {
        const naverOrderId = String(order.orderNo ?? order.orderId ?? order.productOrderId ?? '');
        if (!naverOrderId) { skipped++; continue; }

        const totalAmount = Number(order.generalPaymentAmount ?? order.paymentAmount ?? 0);
        const status      = STATUS_MAP[order.orderStatusType ?? ''] ?? 'PENDING';

        await (prisma as any).order.upsert({
          where:  { id: naverOrderId },
          update: { status, updatedAt: new Date() },
          create: {
            id:              naverOrderId,
            orderDate:       new Date(order.paymentDate ?? order.orderDate ?? Date.now()),
            status,
            totalAmount,
            platformOrderId: naverOrderId,
            customerName:    order.orderPerson?.name    ?? order.receiverName    ?? '',
            customerPhone:   order.orderPerson?.tel     ?? order.receiverTel     ?? '',
            shippingAddress: order.shippingAddress?.roadAddress ?? order.receiverAddress ?? '',
          },
        }).catch(() => null);

        synced++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      total:   allOrders.length,
      windows: windows.length,
      period:  `${toKST(fromDate)} ~ ${toKST(toDate)}`,
    });
  } catch (e: any) {
    console.error('[naver/orders GET]', e);
    return NextResponse.json({
      success: false,
      error:   e.message,
    }, { status: 500 });
  }
}
