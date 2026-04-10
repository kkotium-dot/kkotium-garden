// GET /api/naver/orders — sync Naver orders into DB
// Naver API response: { data: { contents: [...], pagination: {...} } }
// Each item has productOrderStatus (active) or claimStatus (cancelled/returned)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { naverRequest } from '@/lib/naver/api-client';

export const dynamic = 'force-dynamic';

// Map Naver statuses to internal statuses
const STATUS_MAP: Record<string, string> = {
  // productOrderStatus values
  PAYMENT_WAITING:  'PENDING',
  PAYED:            'PAID',
  DELIVERING:       'SHIPPING',
  DELIVERED:        'DELIVERED',
  PURCHASE_DECIDED: 'COMPLETED',
  EXCHANGED:        'EXCHANGED',
  // claimStatus values (cancelled/returned orders)
  CANCEL_DONE:      'CANCELLED',
  CANCEL_REQUEST:   'CANCEL_REQUESTED',
  RETURN_DONE:      'RETURNED',
  RETURN_REQUEST:   'RETURN_REQUESTED',
  EXCHANGE_DONE:    'EXCHANGED',
  // Legacy
  CANCELED:         'CANCELLED',
  RETURNED:         'RETURNED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
};

const toKST = (d: Date) => d.toISOString().replace('Z', '+09:00');

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

function extractOrders(raw: unknown): unknown[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  // Primary: { data: { contents: [...] } }
  if (r.data && typeof r.data === 'object') {
    const d = r.data as Record<string, unknown>;
    if (Array.isArray(d.contents)) return d.contents;
    if (Array.isArray(d.data))     return d.data;
  }
  if (Array.isArray(r.contents))      return r.contents;
  if (Array.isArray(r.data))          return r.data;
  if (Array.isArray(r.productOrders)) return r.productOrders;
  return [];
}

// Determine status from order object — handles both active and claim statuses
function resolveStatus(o: Record<string, unknown>): string {
  // Cancelled/returned orders have claimStatus
  const claimStatus = String(o.claimStatus ?? '');
  if (claimStatus && STATUS_MAP[claimStatus]) return STATUS_MAP[claimStatus];
  // Active orders have productOrderStatus
  const orderStatus = String(o.productOrderStatus ?? '');
  if (orderStatus && STATUS_MAP[orderStatus]) return STATUS_MAP[orderStatus];
  return claimStatus || orderStatus || 'PENDING';
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
        // No status filter = returns ALL statuses including cancelled
        const q = new URLSearchParams({
          from:     toKST(w.from),
          to:       toKST(w.to),
          pageSize: '300',
        });
        const raw = await naverRequest('GET', `/v1/pay-order/seller/product-orders?${q}`);
        allOrders = allOrders.concat(extractOrders(raw));
      } catch (err: unknown) {
        console.error('[naver/orders] window error:', err instanceof Error ? err.message : String(err));
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    const unique = allOrders.filter(o => {
      const id = String((o as Record<string, unknown>).productOrderId ?? '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    let synced = 0, skipped = 0;

    for (const order of unique) {
      const o = order as Record<string, unknown>;
      try {
        const naverOrderId = String(o.productOrderId ?? '');
        if (!naverOrderId) { skipped++; continue; }

        const status = resolveStatus(o);

        // Payment amount
        const totalAmount = Number(
          o.totalPaymentAmount ?? o.generalPaymentAmount ?? o.paymentAmount ?? 0
        );

        // Shipping address
        const shipping = (o.shippingAddress as Record<string, unknown>) ?? {};

        // Product info
        const productName = String(o.productName ?? '');
        const quantity    = Number(o.quantity ?? 1);

        await (prisma as any).order.upsert({
          where:  { id: naverOrderId },
          update: { status, updatedAt: new Date() },
          create: {
            id:              naverOrderId,
            orderNumber:     naverOrderId,
            status,
            totalAmount,
            totalPrice:      totalAmount,
            customerName:    String(shipping.name    ?? o.receiverName    ?? ''),
            customerEmail:   '',
            customerPhone:   String(shipping.tel1    ?? shipping.tel      ?? o.receiverTel ?? ''),
            shippingAddress: String(
              (shipping as Record<string, unknown>).roadAddress ??
              ((shipping as Record<string, unknown>).baseAddress
                ? `${(shipping as Record<string, unknown>).baseAddress} ${(shipping as Record<string, unknown>).detailedAddress ?? ''}`.trim()
                : '') ??
              o.receiverAddress ?? ''
            ),
          },
        }).catch((e: unknown) => console.error('[naver/orders] upsert error:', e instanceof Error ? e.message : e));

        synced++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      total:   unique.length,
      windows: windows.length,
      period:  `${toKST(fromDate)} ~ ${toKST(toDate)}`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
