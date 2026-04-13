// src/app/api/naver/orders/claim/route.ts
// C-10: Claim handling API (return/exchange approve/reject)
// POST { action, productOrderId, reason?, rejectReason? }
// Actions: approve-return, reject-return, approve-exchange, reject-exchange,
//          approve-cancel, reject-cancel, withhold-cancel

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { naverRequest } from '@/lib/naver/api-client';
import { sendDiscord } from '@/lib/discord';

export const dynamic = 'force-dynamic';

type ClaimAction =
  | 'approve-return'
  | 'reject-return'
  | 'approve-exchange'
  | 'reject-exchange'
  | 'approve-cancel'
  | 'reject-cancel'
  | 'withhold-cancel';

const ACTION_CONFIG: Record<ClaimAction, {
  apiPath: string;
  bodyKey: string;
  localStatus: string;
  label: string;
}> = {
  'approve-return': {
    apiPath: '/v1/pay-order/seller/product-orders/return/approve',
    bodyKey: 'productOrderId',
    localStatus: 'RETURNED',
    label: '반품 승인',
  },
  'reject-return': {
    apiPath: '/v1/pay-order/seller/product-orders/return/reject',
    bodyKey: 'productOrderId',
    localStatus: 'SHIPPING',
    label: '반품 거부',
  },
  'approve-exchange': {
    apiPath: '/v1/pay-order/seller/product-orders/exchange/approve',
    bodyKey: 'productOrderId',
    localStatus: 'EXCHANGED',
    label: '교환 승인',
  },
  'reject-exchange': {
    apiPath: '/v1/pay-order/seller/product-orders/exchange/reject',
    bodyKey: 'productOrderId',
    localStatus: 'SHIPPING',
    label: '교환 거부',
  },
  'approve-cancel': {
    apiPath: '/v1/pay-order/seller/product-orders/cancel/approve',
    bodyKey: 'productOrderId',
    localStatus: 'CANCELLED',
    label: '취소 승인',
  },
  'reject-cancel': {
    apiPath: '/v1/pay-order/seller/product-orders/cancel/reject',
    bodyKey: 'productOrderId',
    localStatus: 'PAID',
    label: '취소 거부',
  },
  'withhold-cancel': {
    apiPath: '/v1/pay-order/seller/product-orders/cancel/withhold',
    bodyKey: 'productOrderId',
    localStatus: 'CANCEL_REQUESTED',
    label: '취소 보류',
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, productOrderId, reason, rejectReason } = body as {
      action: ClaimAction;
      productOrderId: string;
      reason?: string;
      rejectReason?: string;
    };

    if (!action || !productOrderId) {
      return NextResponse.json(
        { success: false, error: 'action, productOrderId 필수' },
        { status: 400 },
      );
    }

    const config = ACTION_CONFIG[action];
    if (!config) {
      return NextResponse.json(
        { success: false, error: `지원하지 않는 action: ${action}` },
        { status: 400 },
      );
    }

    // Build API request body
    const apiBody: Record<string, unknown> = {
      [config.bodyKey]: productOrderId,
    };
    if (reason) apiBody.reason = reason;
    if (rejectReason) apiBody.rejectReason = rejectReason;

    // Call Naver Commerce API
    const result = await naverRequest('POST', config.apiPath, apiBody);

    // Update local DB
    await prisma.order.update({
      where: { id: productOrderId },
      data: {
        status: config.localStatus,
        claimReason: reason ?? rejectReason ?? undefined,
        updatedAt: new Date(),
      },
    }).catch(() => null);

    // Discord notification for claims
    const isReject = action.includes('reject');
    await sendDiscord('STOCK_ALERT', '', [{
      title: `${isReject ? ':x:' : ':white_check_mark:'} ${config.label}`,
      description: `주문 ${productOrderId.slice(-12)} ${config.label} 처리됨`,
      color: isReject ? 0xf97316 : 0x16a34a,
      fields: [
        reason ? { name: '사유', value: reason, inline: false } : null,
        rejectReason ? { name: '거부 사유', value: rejectReason, inline: false } : null,
      ].filter(Boolean) as Record<string, unknown>[],
      footer: { text: '꽃티움 가든 · 클레임 처리' },
      timestamp: new Date().toISOString(),
    }]).catch(() => null);

    return NextResponse.json({
      success: true,
      action: config.label,
      productOrderId,
      result,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// GET: list pending claims
export async function GET() {
  try {
    const claims = await prisma.order.findMany({
      where: {
        status: {
          in: [
            'CANCEL_REQUESTED', 'CANCEL_REQUEST',
            'RETURN_REQUESTED', 'RETURN_REQUEST',
          ],
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        customerName: true,
        productName: true,
        totalAmount: true,
        claimReason: true,
        claimDetail: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      claims,
      count: claims.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
