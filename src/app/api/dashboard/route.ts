// ~/Downloads/dashboard-api-enhanced.ts
// 업그레이드된 대시보드 API - 기존 기능 유지 + 신규 기능 추가
// Phase 13 대시보드 통계 API

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DashboardStats {
  todaySales: number;
  todaySalesChange: number;
  todayOrders: number;
  todayOrdersChange: number;
  monthSales: number;
  monthOrders: number;
  weekSales: number[];
  weekLabels: string[];
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  ordersByStatus: Record<string, number>;
  topProducts: Array<{
    id: string;
    name: string;
    salesCount: number;
    revenue: number;
    mainImage?: string | null;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    totalPrice: number;
    status: string;
    orderDate: Date;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    
    // 오늘 (00:00:00)
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 어제 (비교용)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTomorrow = new Date(yesterday);
    yesterdayTomorrow.setDate(yesterdayTomorrow.getDate() + 1);

    // 이번 달 1일
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. 오늘 매출/주문
    const [todayOrders, yesterdayOrders] = await Promise.all([
      prisma.order.findMany({
        where: {
          orderDate: { gte: today, lt: tomorrow },
          status: { notIn: ['cancelled', 'refunded'] },
        },
      }),
      prisma.order.findMany({
        where: {
          orderDate: { gte: yesterday, lt: yesterdayTomorrow },
          status: { notIn: ['cancelled', 'refunded'] },
        },
      }),
    ]);

    const todaySales = todayOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const todayOrdersCount = todayOrders.length;
    const yesterdaySales = yesterdayOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const yesterdayOrdersCount = yesterdayOrders.length;

    // 증감률 계산
    const todaySalesChange = yesterdaySales === 0 ? 0 : ((todaySales - yesterdaySales) / yesterdaySales * 100);
    const todayOrdersChange = yesterdayOrdersCount === 0 ? 0 : ((todayOrdersCount - yesterdayOrdersCount) / yesterdayOrdersCount * 100);

    // 2. 월 매출/주문
    const monthOrders = await prisma.order.findMany({
      where: {
        orderDate: { gte: monthStart, lte: monthEnd },
        status: { notIn: ['cancelled', 'refunded'] },
      },
    });
    const monthSales = monthOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const monthOrdersCount = monthOrders.length;

    // 3. 주간 추이 (최근 7일)
    const weekSales: number[] = [];
    const weekLabels: string[] = [];
    const weekPromises = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      weekPromises.push(
        prisma.order.findMany({
          where: {
            orderDate: { gte: date, lt: nextDate },
            status: { notIn: ['cancelled', 'refunded'] },
          },
        }).then(dayOrders => {
          const daySales = dayOrders.reduce((sum, order) => sum + order.totalPrice, 0);
          weekSales.push(daySales);
          weekLabels.push(date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }));
        })
      );
    }

    await Promise.all(weekPromises);

    // 4. 상품 통계
    const [allProducts, activeProducts, outOfStockProducts] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: 'active' } }),
      prisma.product.count({ where: { status: 'out_of_stock' } }),
    ]);

    // 5. 주문 상태별 통계
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { orderDate: { gte: monthStart, lte: monthEnd } },
    });

    const statusCount: Record<string, number> = {};
    ordersByStatus.forEach((item: any) => {
      statusCount[item.status] = item._count.id;
    });

    // 기본 상태들 초기화
    const statusMap: Record<string, string> = {
      'pending': '결제대기',
      'paid': '결제완료',
      'preparing': '배송준비',
      'shipping': '배송중',
      'delivered': '배송완료',
      'cancelled': '취소',
      'refunded': '환불'
    };
    const ordersByStatusFormatted: Record<string, number> = {};
    Object.keys(statusMap).forEach(status => {
      ordersByStatusFormatted[status] = statusCount[status] || 0;
    });

    // 6. 인기 상품 Top 5 (판매량 기준)
    const topProductsRaw = await prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      _sum: { quantity: true, price: true },
      _count: { productId: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topProducts: Array<{
      id: string;
      name: string;
      salesCount: number;
      revenue: number;
      mainImage?: string | null;
    }> = [];

    for (const item of topProductsRaw) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { mainImage: true },
      });
      
      topProducts.push({
        id: item.productId,
        name: item.productName || '알 수 없는 상품',
        salesCount: (item._sum?.quantity || 0) as number,
        revenue: ((item._sum?.quantity || 0) * (item._sum?.price || 0)) as number,
        mainImage: product?.mainImage || null,
      });
    }

    // 7. 최근 주문 (상태, 고객명 포함)
    const recentOrders = await prisma.order.findMany({
      where: { status: { notIn: ['cancelled', 'refunded'] } },
      orderBy: { orderDate: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        totalPrice: true,
        status: true,
        orderDate: true,
      },
    });

    const stats: DashboardStats = {
      todaySales,
      todaySalesChange: Number(todaySalesChange.toFixed(1)),
      todayOrders: todayOrdersCount,
      todayOrdersChange: Number(todayOrdersChange.toFixed(1)),
      monthSales,
      monthOrders: monthOrdersCount,
      weekSales,
      weekLabels,
      totalProducts: allProducts,
      activeProducts,
      outOfStockProducts,
      ordersByStatus: ordersByStatusFormatted,
      topProducts,
      recentOrders,
    };

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('대시보드 통계 API 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '통계 조회 실패',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
