// /api/stock-monitor — Vercel Cron: every 6 hours (UTC 0,6,12,18)
// Delegates to /api/crawler/stock-check for real supplier URL crawling

import { NextResponse } from 'next/server';


export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Delegate to the full stock-check implementation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${appUrl}/api/crawler/stock-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CRON_SECRET ? { authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
      },
      body: JSON.stringify({ limit: 50 }),
    });

    const data = await res.json();
    return NextResponse.json({ ...data, source: 'cron' });
  } catch (err) {
    console.error('[stock-monitor cron]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export const POST = GET;
