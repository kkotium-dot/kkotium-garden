// src/app/api/notifications/[id]/read/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 실제로는 DB 업데이트
    console.log(`알림 ${id} 읽음 처리`);

    return NextResponse.json({
      success: true,
      message: '알림을 읽음 처리했습니다',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '읽음 처리 실패' },
      { status: 500 }
    );
  }
}
