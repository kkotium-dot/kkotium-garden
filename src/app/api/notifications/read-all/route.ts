// src/app/api/notifications/read-all/route.ts

import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // 실제로는 모든 알림을 읽음 처리
    console.log('모든 알림 읽음 처리');

    return NextResponse.json({
      success: true,
      message: '모든 알림을 읽음 처리했습니다',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '읽음 처리 실패' },
      { status: 500 }
    );
  }
}
