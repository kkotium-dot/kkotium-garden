// 임시 진단 엔드포인트(2026-08-08) — 프로덕션이 실제로 참조하는
// DISCORD_WEBHOOK_KKOTTI_RECOMMEND 값의 앞부분만(민감정보 제외) 노출해
// 대표님이 확인한 값과 실제 배포 환경변수가 일치하는지 검증한다.
// 검증 후 즉시 삭제할 것 — 프로덕션에 남기면 안 됨.
// (이전 시도: _diag_webhook 폴더는 Next.js App Router가 언더스코어 시작
//  폴더를 private로 취급해 라우팅에서 제외해 404였음 — 언더스코어 없는
//  이름으로 재생성)
import { NextResponse } from 'next/server';
import { sendDiscord } from '@/lib/discord';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.DISCORD_WEBHOOK_KKOTTI_RECOMMEND ?? '';
  const idMatch = url.match(/webhooks\/(\d+)\//);

  // 실제 sendDiscord 함수를 코드 그대로 호출해 res.status/에러를 캡처.
  // 이건 진짜 애플리케이션 코드 경로 — 재현이 아니라 실물 테스트다.
  const result = await sendDiscord('KKOTTI_RECOMMEND', '', [
    { title: '[진단] sendDiscord() 실제 호출 테스트', description: 'diagwebhook0808에서 직접 호출', color: 16739210 },
  ]);

  return NextResponse.json({
    hasValue: !!url,
    length: url.length,
    webhookId: idMatch ? idMatch[1] : null,
    prefix: url.slice(0, 40),
    sendDiscordResult: result,
  });
}
