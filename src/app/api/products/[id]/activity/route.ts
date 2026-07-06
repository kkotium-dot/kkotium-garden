// src/app/api/products/[id]/activity/route.ts
// ============================================================================
// JOURNAL-2 / J2-1 (#55 / #181 / #191) — per-product activity timeline.
//
// Aggregates EXISTING event sources into a unified, time-descending shape — NO
// new logging table (#191). Sources (each guarded so an unmigrated table degrades
// to [] instead of 500-ing #62):
//   crawl_logs      → sourcing events (crawledAt · sourcingStatus)
//   asset_jobs      → job lifecycle  (updatedAt · jobType · status)
//   asset_registry  → asset creation (createdAt · stage · fileName)
//   Product         → current status / last update (updatedAt · status)
//
// Shape: { ts, kind, label, target }[] — kind is a stable key (UI maps to Korean,
// #3-1); label/target are pass-through data (English enums / names, not literals).
// Read-only, publish-independent, product-agnostic (#55).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface ActivityEvent {
  ts: string;           // ISO timestamp
  kind: 'sourcing' | 'asset' | 'job' | 'status';
  label: string;        // source-specific enum/token (data, not a UI literal)
  target: string;       // human-recognizable object (name / file / url)
}

// A missing/unmigrated table must degrade, never 500 (#62 reverse-deploy-safe).
async function guarded<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    const msg = e instanceof Error ? e.message : String(e);
    if (code === 'P2021' || code === 'P2022' || /does not exist|relation .* does not exist|column/i.test(msg)) return [];
    throw e;
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const url = new URL(_req.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 1), 200);

    const [crawls, jobs, assets, product] = await Promise.all([
      guarded(() => prisma.crawlLog.findMany({
        where: { productId: id }, orderBy: { crawledAt: 'desc' }, take: limit,
        select: { crawledAt: true, sourcingStatus: true, name: true, url: true },
      })),
      guarded(() => prisma.assetJob.findMany({
        where: { productId: id }, orderBy: { updatedAt: 'desc' }, take: limit,
        select: { updatedAt: true, jobType: true, status: true },
      })),
      guarded(() => prisma.assetRegistry.findMany({
        where: { productId: id }, orderBy: { createdAt: 'desc' }, take: limit,
        select: { createdAt: true, stage: true, fileName: true },
      })),
      prisma.product.findUnique({ where: { id }, select: { status: true, updatedAt: true, name: true } })
        .catch(() => null),
    ]);

    const events: ActivityEvent[] = [];
    for (const c of crawls) {
      events.push({ ts: c.crawledAt.toISOString(), kind: 'sourcing', label: c.sourcingStatus, target: c.name || c.url });
    }
    for (const j of jobs) {
      events.push({ ts: j.updatedAt.toISOString(), kind: 'job', label: `${j.jobType} · ${j.status}`, target: j.jobType });
    }
    for (const asset of assets) {
      events.push({ ts: asset.createdAt.toISOString(), kind: 'asset', label: asset.stage, target: asset.fileName });
    }
    if (product) {
      events.push({ ts: product.updatedAt.toISOString(), kind: 'status', label: product.status, target: product.name });
    }

    // Time-descending (ISO strings sort lexicographically), bounded to limit.
    events.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));

    return NextResponse.json({ success: true, activity: events.slice(0, limit) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
