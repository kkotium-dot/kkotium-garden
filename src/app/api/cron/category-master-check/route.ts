// /api/cron/category-master-check
// ============================================================================
// UCE-5 (Universal Category Engine, 2026-08-27): monthly freshness check for
// the Naver category master (naver-categories-full.ts, 5,021 entries).
//
// What this does NOT do: auto-download the latest XLS from Naver. There is
// no verified, stable machine-fetchable endpoint for this file in the
// codebase today (Naver Commerce API Center's category export is a manual
// download) — building an automatic fetcher against an unverified endpoint
// would be exactly the kind of unfounded assumption the project's #82
// principle ("추측 금지") forbids. Instead this cron does the part that IS
// safely automatable: compare today's date against CATEGORY_MASTER_GENERATED_AT
// and, once the master is stale (>35 days — a little slack over "monthly"),
// ping OPS_REPORT with the exact regenerate command so a human downloads the
// new XLS and runs it. Read-only — never touches Naver, never mutates data.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withCronLogging } from '@/lib/cron/with-logging';
import { sendDiscord } from '@/lib/discord';
import {
  TOTAL_CATEGORY_COUNT,
  CATEGORY_MASTER_SOURCE_FILE,
  CATEGORY_MASTER_GENERATED_AT,
} from '@/lib/naver/naver-categories-full';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';
export const maxDuration = 30;

const STALE_AFTER_DAYS = 35;

export const GET = withCronLogging('/api/cron/category-master-check', async (request: NextRequest) => {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const generatedAt = new Date(CATEGORY_MASTER_GENERATED_AT);
  const daysSinceUpdate = Math.floor((Date.now() - generatedAt.getTime()) / 86_400_000);
  const stale = daysSinceUpdate > STALE_AFTER_DAYS;

  let discordSent = false;
  if (stale) {
    const result = await sendDiscord(
      'OPS_REPORT',
      `📦 **카테고리 마스터 갱신 필요** — 마지막 갱신 ${CATEGORY_MASTER_GENERATED_AT} (${daysSinceUpdate}일 경과, 현재 ${TOTAL_CATEGORY_COUNT.toLocaleString()}건)\n` +
      `1. Naver Commerce API Center에서 최신 카테고리 XLS 다운로드\n` +
      `2. \`python3 scripts/gen-naver-categories.py <다운받은.xls>\` 실행 (ADDED/REMOVED diff 출력 확인)\n` +
      `3. tsc 0 확인 후 커밋·배포`,
    );
    discordSent = result.ok;
  }

  return NextResponse.json({
    success: true,
    totalCategoryCount: TOTAL_CATEGORY_COUNT,
    sourceFile: CATEGORY_MASTER_SOURCE_FILE,
    generatedAt: CATEGORY_MASTER_GENERATED_AT,
    daysSinceUpdate,
    stale,
    discordSent,
  });
});
