// src/app/api/system-health/route.ts
// ============================================================================
// Sprint 8-IA Phase 1 Task 4: GET reshaped automation health for dashboard
// SystemHealthCard. Reuses signals from /api/automation/registry
// (InventorySnapshot, CategoryTrendCache, DomeCategory, Discord env) and maps
// the slim 8-entry automation registry into a HealthItem[] shape consumed by
// the dashboard card. No new tables introduced — per 작업원칙 #46, only
// production-live automations are scored. Items without a live signal yet
// surface as status='pending' rather than fake 'success'.
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTOMATIONS } from '@/lib/automation-registry';

export const dynamic = 'force-dynamic';

type HealthStatus = 'success' | 'warning' | 'failed' | 'pending';

interface HealthItem {
  id: string;
  displayName: string;
  iconKey: string;
  status: HealthStatus;
  lastRunAt: string | null;
  lastMessage: string;
  nextRunAt: string | null;
  pending: boolean;
}

interface HealthSummary {
  healthy: number;
  total: number;
  generatedAt: string;
}

// Stable display map keyed by registry id. Korean strings live here so that
// the API response is the user-visible source of truth (Phase 1 has no
// translation pivot; matches the existing automation-strings.ko.json copy).
const DISPLAY_MAP: Record<string, { displayName: string; iconKey: string }> = {
  'inventory-poll':           { displayName: '도매꾹 재고 폴링',     iconKey: 'Package' },
  'good-service-track':       { displayName: '굿서비스 점수 추적',   iconKey: 'Activity' },
  'discord-kkotti-recommend': { displayName: 'Discord 꼬띠 추천',   iconKey: 'Sparkles' },
  'discord-stock-alert':      { displayName: 'Discord 재고 알림',   iconKey: 'Bell' },
  'discord-kkotti-score':     { displayName: 'Discord 점수 급락',   iconKey: 'Flame' },
  'discord-ops-report':       { displayName: 'Discord 운영 리포트', iconKey: 'Tag' },
  'cron-daily':               { displayName: '일일 cron',           iconKey: 'Clock' },
  'cron-weekly':              { displayName: '주간 cron',           iconKey: 'Clock' },
};

// Interval hours used to project nextRunAt. 0 = event-driven (no projection).
const INTERVAL_HOURS: Record<string, number> = {
  'inventory-poll':           24,
  'good-service-track':       168,
  'discord-kkotti-recommend': 0,
  'discord-stock-alert':      0,
  'discord-kkotti-score':     0,
  'discord-ops-report':       168,
  'cron-daily':               24,
  'cron-weekly':              168,
};

// Stale threshold (hours). If lastRunAt older than interval * STALE_FACTOR
// we downgrade success -> warning so the card surfaces the gap.
const STALE_FACTOR = 1.5;

export async function GET() {
  const [lastInventory, lastTrendCache, lastDomeCat] = await Promise.all([
    prisma.inventorySnapshot.findFirst({
      orderBy: { polledAt: 'desc' },
      select: { polledAt: true },
    }),
    prisma.categoryTrendCache.findFirst({
      orderBy: { refreshedAt: 'desc' },
      select: { refreshedAt: true },
    }),
    prisma.domeCategory.findFirst({
      orderBy: { refreshedAt: 'desc' },
      select: { refreshedAt: true },
    }),
  ]);

  const discordEnv: Record<string, boolean> = {
    'discord-kkotti-recommend': !!process.env.DISCORD_WEBHOOK_KKOTTI_RECOMMEND,
    'discord-stock-alert':      !!process.env.DISCORD_WEBHOOK_STOCK_ALERT,
    'discord-kkotti-score':     !!process.env.DISCORD_WEBHOOK_KKOTTI_SCORE,
    'discord-ops-report':       !!process.env.DISCORD_WEBHOOK_OPS_REPORT,
  };

  const now = Date.now();

  const items: HealthItem[] = AUTOMATIONS.map((a) => {
    const meta = DISPLAY_MAP[a.id] ?? { displayName: a.id, iconKey: 'Activity' };
    let lastRunAt: Date | null = null;
    let status: HealthStatus = 'pending';
    let lastMessage = '아직 실행 기록이 없습니다';

    switch (a.id) {
      case 'inventory-poll':
        lastRunAt = lastInventory?.polledAt ?? null;
        if (lastRunAt) {
          status = 'success';
          lastMessage = '재고 스냅샷 수집 완료';
        }
        break;
      case 'cron-daily':
        lastRunAt = lastTrendCache?.refreshedAt ?? null;
        if (lastRunAt) {
          status = 'success';
          lastMessage = '데이터랩 트렌드 캐시 갱신';
        } else {
          lastMessage = '일일 cron 첫 실행 대기';
        }
        break;
      case 'cron-weekly':
        lastRunAt = lastDomeCat?.refreshedAt ?? null;
        if (lastRunAt) {
          status = 'success';
          lastMessage = '도매꾹 카테고리 트리 갱신';
        } else {
          lastMessage = '주간 cron 첫 실행 대기';
        }
        break;
      case 'good-service-track':
        // Proxy: weekly cron is the carrier. Mark active when weekly cron ran
        // recently, pending otherwise. Sprint 8-IA Phase 2 wires a dedicated
        // goodService log table.
        lastRunAt = lastDomeCat?.refreshedAt ?? null;
        if (lastRunAt) {
          status = 'success';
          lastMessage = '주간 cron 동승 가동';
        } else {
          lastMessage = '주간 cron 첫 실행 대기';
        }
        break;
      case 'discord-kkotti-recommend':
      case 'discord-stock-alert':
      case 'discord-kkotti-score':
      case 'discord-ops-report': {
        const envOk = discordEnv[a.id];
        if (envOk) {
          status = 'success';
          lastMessage = 'Webhook 설정 완료';
        } else {
          status = 'pending';
          lastMessage = 'Discord webhook 환경변수 미설정';
        }
        break;
      }
      default:
        break;
    }

    // Stale check — only meaningful for items with a periodic interval AND a
    // last run timestamp. Discord webhooks are env-only (interval=0).
    const interval = INTERVAL_HOURS[a.id] ?? 0;
    if (status === 'success' && lastRunAt && interval > 0) {
      const ageHours = (now - lastRunAt.getTime()) / 3_600_000;
      if (ageHours > interval * STALE_FACTOR) {
        status = 'warning';
        lastMessage = `마지막 실행이 ${Math.round(ageHours)}시간 전입니다`;
      }
    }

    const nextRunAt = lastRunAt && interval > 0
      ? new Date(lastRunAt.getTime() + interval * 3_600_000)
      : null;

    return {
      id: a.id,
      displayName: meta.displayName,
      iconKey: meta.iconKey,
      status,
      lastRunAt: lastRunAt ? lastRunAt.toISOString() : null,
      lastMessage,
      nextRunAt: nextRunAt ? nextRunAt.toISOString() : null,
      pending: status === 'pending',
    };
  });

  const summary: HealthSummary = {
    healthy: items.filter((i) => i.status === 'success').length,
    total: items.length,
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ ok: true, summary, items });
}
