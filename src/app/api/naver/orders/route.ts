// GET /api/naver/orders — sync Naver orders into DB
// Naver API response: { data: { contents: [ { productOrderId, content: { order, productOrder, currentClaim, ... } } ] } }

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getChangedOrderIds,
  getOrderDetails,
  isNaverAppStatusInvalid,
  isNaverClientSecretInvalid,
  NAVER_APP_STATUS_USER_MESSAGE,
  NAVER_CLIENT_SECRET_USER_MESSAGE,
} from '@/lib/naver/api-client';

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

    // #192 — Step 1: collect CHANGED productOrderIds per <=23h window from the
    // last-changed-statuses endpoint (queries by change time, so it captures state
    // transitions — 구매확정/취소/반품 — of orders created outside the window). The
    // old `from`/`to` product-orders query is CREATE-date only and missed these.
    // #62/#82: track per-window failures so a TOTAL outage is surfaced honestly.
    const changedIds = new Set<string>();
    let windowErrors = 0;
    let lastError: unknown = null;

    for (const w of windows) {
      try {
        const ids = await getChangedOrderIds(toKST(w.from), toKST(w.to));
        for (const id of ids) changedIds.add(id);
      } catch (err: unknown) {
        windowErrors++;
        lastError = err;
        console.error('[naver/orders] last-changed window error:', err instanceof Error ? err.message : err);
      }
    }

    // #192 — Step 2: pull full order details in batches of 300 (POST query). Each
    // element is { order, productOrder, delivery, currentClaim? } (flat, not under
    // `content` like the old product-orders GET response).
    const ids = Array.from(changedIds);
    const details: unknown[] = [];
    let detailErrors = 0;
    for (let k = 0; k < ids.length; k += 300) {
      try {
        const d = await getOrderDetails(ids.slice(k, k + 300));
        details.push(...d);
      } catch (err: unknown) {
        detailErrors++;
        lastError = err;
        console.error('[naver/orders] detail batch error:', err instanceof Error ? err.message : err);
      }
    }

    // Honest total-failure gate (#82): every last-changed window failed, OR there
    // were changed ids but every detail batch failed — a real outage, not "0 orders".
    const totalFailure =
      (windows.length > 0 && windowErrors === windows.length) ||
      (ids.length > 0 && details.length === 0 && detailErrors > 0);
    if (totalFailure) {
      const naverStatus = isNaverAppStatusInvalid(lastError)
        ? 'app_status_invalid'
        : isNaverClientSecretInvalid(lastError)
        ? 'client_secret_invalid'
        : 'unavailable';
      const message =
        naverStatus === 'app_status_invalid'
          ? NAVER_APP_STATUS_USER_MESSAGE
          : naverStatus === 'client_secret_invalid'
          ? NAVER_CLIENT_SECRET_USER_MESSAGE
          : '네이버 주문 API가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.';
      console.error(`[naver/orders] total failure — naverStatus=${naverStatus} windowErrors=${windowErrors}/${windows.length} detailErrors=${detailErrors}`);
      return NextResponse.json(
        { success: false, naverStatus, error: message, synced: 0, skipped: 0, total: 0, windows: windows.length },
        { status: 200 },
      );
    }

    let synced = 0, skipped = 0;

    for (const item of details) {
      const el      = item as Record<string, unknown>;
      const productOrder = (el.productOrder as Record<string, unknown>) ?? {};
      const order        = (el.order        as Record<string, unknown>) ?? {};
      // Address lives under `shippingAddress` when present, else the `delivery` block.
      const shipping     = (el.shippingAddress as Record<string, unknown>) ?? (el.delivery as Record<string, unknown>) ?? {};
      const claim        = (el.currentClaim  as Record<string, unknown>) ?? {};
      const naverOrderId = String(productOrder.productOrderId ?? '');
      if (!naverOrderId) { skipped++; continue; }

      try {

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
      total:   details.length,
      changed: ids.length,
      windows: windows.length,
      period:  `${toKST(fromDate)} ~ ${toKST(toDate)}`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[naver/orders] fatal:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
