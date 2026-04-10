// GET /api/naver/orders — sync Naver orders into DB
// Naver API response structure: { data: { contents: [...], pagination: {...} } }
// Max 24h per request — splits longer ranges automatically

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { naverRequest } from '@/lib/naver/api-client';

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

const toKST = (d: Date) => d.toISOString().replace('Z', '+09:00');

// Split range into max 23h windows (Naver API limit: 24h)
function splitWindows(from: Date, to: Date): { from: Date; to: Date }[] {
  const MAX_MS = 23 * 60 * 60 * 1000;
  const windows: { from: Date; to: Date }[] = [];
  let cursor = new Date(from);
  while (cursor < to) {
    const end = new Date(Math.min(cursor.getTime() + MAX_MS, to.getTime()));
    windows.push({ from: new Date(cursor), to: end });
    cursor = end;
  }
  return windows;
}

// Extract order list from Naver API response
// Actual structure: { data: { contents: [...] } }
function extractOrders(raw: unknown): unknown[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;

  // Primary: { data: { contents: [...] } }
  if (r.data && typeof r.data === 'object') {
    const d = r.data as Record<string, unknown>;
    if (Array.isArray(d.contents)) return d.contents;
    if (Array.isArray(d.data))     return d.data;
  }
  // Fallback shapes
  if (Array.isArray(r.contents))      return r.contents;
  if (Array.isArray(r.data))          return r.data;
  if (Array.isArray(r.productOrders)) return r.productOrders;
  if (Array.isArray(r.content))       return r.content;
  return [];
}

export async function GET(request: NextRequest) {
  try {
    const url    = new URL(request.url);
    const hours  = Number(url.searchParams.get('hours') ?? '24');
    const manual = url.searchParams.get('manual') === '1';

    const authHeader = request.headers.get('authorization');
    if (!manual && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fromDate = new Date(Date.now() - hours * 3_600_000);
    const toDate   = new Date();
    const windows  = splitWindows(fromDate, toDate);

    let allOrders: unknown[] = [];

    for (const w of windows) {
      try {
        const q = new URLSearchParams({
          from:     toKST(w.from),
          to:       toKST(w.to),
          pageSize: '300',
        });
        const raw = await naverRequest('GET', `/v1/pay-order/seller/product-orders?${q}`);
        const chunk = extractOrders(raw);
        allOrders = allOrders.concat(chunk);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[naver/orders] window error:`, msg);
      }
    }

    let synced = 0;
    let skipped = 0;

    for (const order of allOrders) {
      const o = order as Record<string, unknown>;
      try {
        const naverOrderId = String(
          o.productOrderId ?? o.orderNo ?? o.orderId ?? ''
        );
        if (!naverOrderId) { skipped++; continue; }

        const totalAmount = Number(
          o.totalPaymentAmount ?? o.generalPaymentAmount ?? o.paymentAmount ?? 0
        );
        const status = STATUS_MAP[String(o.productOrderStatus ?? o.orderStatusType ?? '')] ?? 'PENDING';

        const receiver = (o.shippingAddress as Record<string, unknown>) ?? {};
        const orderPerson = (o.orderPerson as Record<string, unknown>) ?? {};

        await (prisma as any).order.upsert({
          where:  { id: naverOrderId },
          update: { status, updatedAt: new Date() },
          create: {
            id:              naverOrderId,
            orderDate:       new Date(String(o.paymentDate ?? o.orderDate ?? Date.now())),
            status,
            totalAmount,
            platformOrderId: naverOrderId,
            customerName:    String(orderPerson.name    ?? receiver.name    ?? o.receiverName    ?? ''),
            customerPhone:   String(orderPerson.tel     ?? receiver.tel     ?? o.receiverTel     ?? ''),
            shippingAddress: String(
              (receiver.roadAddress) ??
              (receiver.jibunAddress) ??
              o.receiverAddress ?? ''
            ),
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[naver/orders GET]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
