// src/app/api/version/route.ts
// ============================================================================
// 작업1 (#308) — 새 버전 감지 배너의 서버측 신호. Vercel이 배포마다 자동으로
// 주입하는 VERCEL_GIT_COMMIT_SHA를 그대로 반환한다(별도 빌드 스크립트 불요).
// 로컬 dev에는 이 env가 없으므로 sha=null이 나오는 게 정상 — 클라이언트는
// null끼리는 비교하지 않는다(항상 배너 미노출).
//
// force-dynamic: 이 값은 배포마다 바뀌어야 하므로 정적 캐싱되면 안 된다.
// ============================================================================

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  });
}
