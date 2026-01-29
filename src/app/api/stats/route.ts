// src/app/api/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/stats - 상세 통계 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'monthly'; // daily, weekly, monthly
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    let startDate: Date;
    let endDate: Date;
    let labels: string[] = [];
    let data: number[] = [];

    if (type === 'monthly') {
      // 월별 통계 (해당 년도 1~12월)
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);

      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(year, m, 1);
        const monthEnd = new Date(year, m + 1, 0, 23, 59, 59);

        const orders = await prisma.order.findMany({
          where: {
            orderDate: {
              gte: monthStart,
              lte: monthEnd,
            },
            status: {
              notIn: ['cancelled', 'refunded'],
            },
          },
        });

        const monthSales = orders.reduce((sum, order) => sum + order.totalPrice, 0);
        data.push(monthSales);
        labels.push(`${m + 1}월`);
      }
    } else if (type === 'weekly') {
      // 주별 통계 (해당 월의 주차별)
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);

      const daysInMonth = new Date(year, month, 0).getDate();
      let weekNum = 1;

      for (let day = 1; day <= daysInMonth; day += 7) {
        const weekStart = new Date(year, month - 1, day);
        const weekEnd = new Date(year, month - 1, Math.min(day + 6, daysInMonth), 23, 59, 59);

        const orders = await prisma.order.findMany({
          where: {
            orderDate: {
              gte: weekStart,
              lte: weekEnd,
            },
            status: {
              notIn: ['cancelled', 'refunded'],
            },
          },
        });

        const weekSales = orders.reduce((sum, order) => sum + order.totalPrice, 0);
        data.push(weekSales);
        labels.push(`${weekNum}주차`);
        weekNum++;
      }
    } else {
      // 일별 통계 (해당 월의 일별)
      startDate = new Date(year, month - 1, 1);
      const daysInMonth = new Date(year, month, 0).getDate();
      endDate = new Date(year, month - 1, daysInMonth, 23, 59, 59);

      for (let day = 1; day <= daysInMonth; day++) {
        const dayStart = new Date(year, month - 1, day);
        const dayEnd = new Date(year, month - 1, day, 23, 59, 59);

        const orders = await prisma.order.findMany({
          where: {
            orderDate: {
              gte: dayStart,
              lte: dayEnd,
            },
            status: {
              notIn: ['cancelled', 'refunded'],
            },
          },
        });

        const daySales = orders.reduce((sum, order) => sum + order.totalPrice, 0);
        data.push(daySales);
        labels.push(`${day}일`);
      }
    }

    // 총 매출 및 주문 수
    const totalOrders = await prisma.order.count({
      where: {
        orderDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          notIn: ['cancelled', 'refunded'],
        },
      },
    });

    const orders = await prisma.order.findMany({
      where: {
        orderDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          notIn: ['cancelled', 'refunded'],
        },
      },
    });

    const totalSales = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    return NextResponse.json({
      success: true,
      stats: {
        type,
        year,
        month: type !== 'monthly' ? month : undefined,
        labels,
        data,
        totalSales,
        totalOrders,
        averageOrderValue,
      },
    });
  } catch (error) {
    console.error('통계 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '통계 조회 실패' },
      { status: 500 }
    );
  }
}
