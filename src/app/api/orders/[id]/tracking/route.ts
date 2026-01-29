// src/app/api/orders/[id]/tracking/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/orders/[id]/tracking - 송장번호 입력
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        trackingNumber: body.trackingNumber,
        courierCompany: body.courierCompany,
        status: 'shipping',
        shippedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('송장 입력 실패:', error);
    return NextResponse.json(
      { success: false, error: '송장 입력 실패' },
      { status: 500 }
    );
  }
}
