// GET /api/naver/orders — sync Naver orders into DB
// Naver API response: { data: { contents: [ { productOrderId, content: { order, productOrder, currentClaim, ... } } ] } }

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
  CANCEL_DONE:      'CANCELLED',
  CANCEL_REQUEST:   'CANCEL_REQUESTED',
  RETURNED:         'RETURNED',
  RETURN_DONE:      'RETURNED',
  RETURN_REQUEST:   'RETURN_REQUESTED',
};

// Korean labels for cancel/return reasons
const CLAIM_REASON_MAP: Record<string, string> = {
  INTENT_CHANGED:        '단순 변심',
  WRONG_ITEM_DELIVERED:  '상품 오배송',
  DEFECTIVE_PRODUCT:     '상품 불량',
  DIFFERENT_PRODUCT:     '상품 정보 상이',
  OUT_OF_STOCK:          '재고 부족',
  DELAYED_DELIVERY:      '배송 지연',
  WRONG_ORDER:           '주문 실수',
  PRICE_CHANGE:          '가격 변동',
  UNAUTHORIZED_ORDER:    '미성년자 결제',
  OTHER:                 '기타',
};

const toKST = (d: Date) => d.toISOString().replace('Z', '+09:00');

function splitWindows(from: Date, to: Date) {
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

function extractItems(raw: unknown): unknown[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  if (r.data && typeof r.data === 'object') {
    const d = r.data as Record<string, unknown>;
    if (Array.isArray(d.contents)) return d.contents;
  }
  if (Array.isArray(r.contents)) return r.contents;
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

    let allItems: unknown[] = [];

    for (const w of windows) {
      try {
        const qUrl = `/v1/pay-order/seller/product-orders?from=${encodeURIComponent(toKST(w.from))}&to=${encodeURIComponent(toKST(w.to))}&pageSize=300`;
        const raw  = await naverRequest('GET', qUrl);
        allItems   = allItems.concat(extractItems(raw));
      } catch (err: unknown) {
        console.error('[naver/orders] window error:', err instanceof Error ? err.message : err);
      }
    }

    // Deduplicate by productOrderId
    const seen = new Set<string>();
    const unique = allItems.filter(item => {
      const id = String((item as Record<string, unknown>).productOrderId ?? '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    let synced = 0, skipped = 0;

    for (const item of unique) {
      const i       = item as Record<string, unknown>;
      const naverOrderId = String(i.productOrderId ?? '');
      if (!naverOrderId) { skipped++; continue; }

      try {
        // All data is nested under 'content'
        const content      = (i.content as Record<string, unknown>) ?? {};
        const productOrder = (content.productOrder  as Record<string, unknown>) ?? {};
        const order        = (content.order         as Record<string, unknown>) ?? {};
        const shipping     = (content.shippingAddress as Record<string, unknown>) ?? {};
        const claim        = (content.currentClaim  as Record<string, unknown>) ?? {};

        // Status: from productOrder
        const rawStatus = String(productOrder.productOrderStatus ?? '');
        const status    = STATUS_MAP[rawStatus] ?? 'PENDING';

        // Claim info (cancel / return)
        const claimData    = (claim.cancel ?? claim.return ?? claim.exchange ?? {}) as Record<string, unknown>;
        const claimReason  = CLAIM_REASON_MAP[String(claimData.cancelReason ?? claimData.returnReason ?? '')] ?? '';
        const claimDetail  = String(claimData.cancelDetailedReason ?? claimData.returnDetailedReason ?? '').slice(0, 500);
        const refundStatus = String(claimData.refundStandbyStatus ?? '');

        // Customer info
        const customerName  = String(order.ordererName  ?? shipping.name ?? '');
        const customerPhone = String(order.ordererTel   ?? shipping.tel1 ?? '');

        // Shipping address (not available for cancelled orders)
        const shippingAddress = String(
          (shipping.roadAddress   as string | undefined) ??
          (shipping.baseAddress   as string | undefined) ??
          ''
        );

        const totalAmount = Number(productOrder.totalPaymentAmount ?? order.generalPaymentAmount ?? 0);
        const productName = String(productOrder.productName ?? '');
        const quantity    = Number(productOrder.quantity    ?? 1);
        const paymentDate = order.paymentDate ? new Date(String(order.paymentDate)) : null;

        await (prisma as any).order.upsert({
          where:  { id: naverOrderId },
          update: {
            status,
            totalAmount,
            customerName,
            customerPhone,
            shippingAddress,
            productName,
            quantity,
            claimReason:  claimReason  || null,
            claimDetail:  claimDetail  || null,
            refundStatus: refundStatus || null,
            paymentDate,
            updatedAt: new Date(),
          },
          create: {
            id:             naverOrderId,
            orderNumber:    naverOrderId,
            status,
            totalAmount,
            totalPrice:     totalAmount,
            customerName,
            customerEmail:  '',
            customerPhone,
            shippingAddress,
            productName,
            quantity,
            claimReason:    claimReason  || null,
            claimDetail:    claimDetail  || null,
            refundStatus:   refundStatus || null,
            paymentDate,
          },
        }).catch((e: unknown) => {
          console.error('[naver/orders] upsert error:', naverOrderId, e instanceof Error ? e.message : e);
        });

        synced++;
      } catch (err: unknown) {
        console.error('[naver/orders] item error:', err instanceof Error ? err.message : err);
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
    console.error('[naver/orders] fatal:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
