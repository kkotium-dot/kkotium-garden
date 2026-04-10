import { NextResponse } from 'next/server';
import { sendDiscord } from '@/lib/discord';


export const dynamic = 'force-dynamic';
export async function GET() {
  const result = await sendDiscord(
    'OPS_REPORT',
    '[Test] 꽃티움 가든 Discord 연결 확인. 5개 채널 모두 활성 상태입니다.'
  );
  return NextResponse.json({ success: result.ok, status: result.status, message: 'Discord test sent' });
}
