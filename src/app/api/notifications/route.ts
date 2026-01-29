// src/app/api/notifications/route.ts

import { NextResponse } from 'next/server';

// 임시 알림 데이터 (실제로는 DB에서 가져옴)
const mockNotifications = [
  {
    id: '1',
    type: 'order',
    title: '새 주문 접수',
    message: '홍길동님의 주문이 접수되었습니다. (50,000원)',
    time: '방금 전',
    read: false,
  },
  {
    id: '2',
    type: 'stock',
    title: '재고 부족 경고',
    message: '장미 부케의 재고가 5개 이하입니다.',
    time: '10분 전',
    read: false,
  },
  {
    id: '3',
    type: 'sales',
    title: '매출 목표 달성',
    message: '오늘 매출이 100만원을 돌파했습니다! 🎉',
    time: '1시간 전',
    read: true,
  },
  {
    id: '4',
    type: 'system',
    title: '시스템 업데이트',
    message: '새로운 기능이 추가되었습니다.',
    time: '2시간 전',
    read: true,
  },
];

export async function GET() {
  try {
    const unreadCount = mockNotifications.filter(n => !n.read).length;

    return NextResponse.json({
      success: true,
      notifications: mockNotifications,
      unreadCount,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '알림 조회 실패' },
      { status: 500 }
    );
  }
}
