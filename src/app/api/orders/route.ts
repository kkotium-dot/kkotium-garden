// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET: 주문 목록 조회
 * 쿼리 파라미터:
 * - status: 주문 상태 필터링
 * - search: 주문번호/고객명 검색
 * - page: 페이지 번호
 * - limit: 페이지당 개수
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // 필터 조건 생성
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ];
    }

    // 주문 목록 조회
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
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
        orderBy: {
          orderDate: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // 상태별 카운트
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });

    console.log(`✅ 주문 목록 조회: ${orders.length}건 / 전체 ${total}건`);

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error: any) {
    console.error('Orders GET error:', error);
    return NextResponse.json(
      { success: false, error: '주문 목록 조회 실패: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: 주문 생성
 * Body:
 * - customerName: 고객명
 * - customerPhone: 연락처
 * - customerEmail: 이메일
 * - shippingAddress: 배송지 주소
 * - shippingZipcode: 우편번호
 * - shippingRequest: 배송 요청사항
 * - paymentMethod: 결제 방법
 * - items: 주문 상품 [{productId, quantity, price, options}]
 * - shippingFee: 배송비
 * - discount: 할인금액
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      shippingZipcode,
      shippingRequest,
      paymentMethod,
      items,
      shippingFee = 0,
      discount = 0,
      userId,
    } = body;

    // 필수 필드 검증
    if (!customerName || !customerPhone || !shippingAddress || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: '필수 정보를 입력해주세요' },
        { status: 400 }
      );
    }

    // 총 금액 계산
    let totalPrice = 0;
    for (const item of items) {
      totalPrice += item.price * item.quantity;
    }
    totalPrice += shippingFee - discount;

    // 주문번호 생성 (ORD-YYYYMMDD-랜덤6자리)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderNumber = `ORD-${dateStr}-${random}`;

    // 주문 생성 (트랜잭션)
    const order = await prisma.$transaction(async (tx) => {
      // 주문 생성
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerName,
          customerPhone,
          customerEmail: customerEmail || '',
          shippingAddress,
          shippingZipcode: shippingZipcode || '',
          shippingRequest: shippingRequest || '',
          paymentMethod,
          totalPrice,
          shippingFee,
          discount,
          status: 'pending',
          userId: userId || null,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              productSku: item.productSku,
              quantity: item.quantity,
              price: item.price,
              options: item.options || '',
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // 재고 차감 (나중에 구현)
      // for (const item of items) {
      //   await tx.product.update({
      //     where: { id: item.productId },
      //     data: {
      //       salesCount: { increment: item.quantity },
      //     },
      //   });
      // }

      return newOrder;
    });

    console.log('✅ 주문 생성 완료:', orderNumber);

    return NextResponse.json({
      success: true,
      order,
      message: '주문이 생성되었습니다',
    });
  } catch (error: any) {
    console.error('Order POST error:', error);
    return NextResponse.json(
      { success: false, error: '주문 생성 실패: ' + error.message },
      { status: 500 }
    );
  }
}
