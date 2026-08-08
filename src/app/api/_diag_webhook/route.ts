// 임시 진단 엔드포인트(2026-08-08) — 프로덕션이 실제로 참조하는
// DISCORD_WEBHOOK_KKOTTI_RECOMMEND 값의 앞부분만(민감정보 제외) 노출해
// 대표님이 확인한 값과 실제 배포 환경변수가 일치하는지 검증한다.
// 검증 후 즉시 삭제할 것 — 프로덕션에 남기면 안 됨.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.DISCORD_WEBHOOK_KKOTTI_RECOMMEND ?? '';
  const idMatch = url.match(/webhooks\/(\d+)\//);
  return NextResponse.json({
    hasValue: !!url,
    length: url.length,
    webhookId: idMatch ? idMatch[1] : null,
    prefix: url.slice(0, 40),
  });
}
