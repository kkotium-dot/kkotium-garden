// app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET: 주문 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    console.log('✅ 주문 조회 성공:', order.orderNumber);

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error('Order GET error:', error);
    return NextResponse.json(
      { success: false, error: '주문 조회 실패: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT: 주문 수정 (상태 변경, 배송 정보 입력 등)
 * Body:
 * - status: 주문 상태
 * - trackingNumber: 송장번호
 * - courierCompany: 택배사
 * - shippingAddress: 배송지 주소
 * - shippingRequest: 배송 요청사항
 * - adminMemo: 관리자 메모
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      status,
      trackingNumber,
      courierCompany,
      shippingAddress,
      shippingRequest,
      adminMemo,
    } = body;

    // 주문 존재 확인
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 업데이트 데이터 준비
    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = status;

      // 상태별 날짜 자동 설정
      if (status === 'paid' && !existingOrder.paidAt) {
        updateData.paidAt = new Date();
      }
      if (status === 'shipping' && !existingOrder.shippedAt) {
        updateData.shippedAt = new Date();
      }
      if (status === 'delivered' && !existingOrder.deliveredAt) {
        updateData.deliveredAt = new Date();
      }
      if (status === 'cancelled' && !existingOrder.cancelledAt) {
        updateData.cancelledAt = new Date();
      }
    }

    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (courierCompany !== undefined) updateData.courierCompany = courierCompany;
    if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress;
    if (shippingRequest !== undefined) updateData.shippingRequest = shippingRequest;
    if (adminMemo !== undefined) updateData.adminMemo = adminMemo;

    // 주문 수정
    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log('✅ 주문 수정 완료:', order.orderNumber);

    return NextResponse.json({
      success: true,
      order,
      message: '주문이 수정되었습니다',
    });
  } catch (error: any) {
    console.error('Order PUT error:', error);
    return NextResponse.json(
      { success: false, error: '주문 수정 실패: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 주문 삭제 (관리자용 - 실제로는 잘 사용 안 함)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 주문 존재 확인
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 주문 삭제 (cascade로 items도 자동 삭제됨)
    await prisma.order.delete({
      where: { id },
    });

    console.log('✅ 주문 삭제 완료:', order.orderNumber);

    return NextResponse.json({
      success: true,
      message: '주문이 삭제되었습니다',
    });
  } catch (error: any) {
    console.error('Order DELETE error:', error);
    return NextResponse.json(
      { success: false, error: '주문 삭제 실패: ' + error.message },
      { status: 500 }
    );
  }
}
