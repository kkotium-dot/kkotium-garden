// src/app/api/automation/registry/route.ts
// ============================================================================
// Phase 1: GET enriched automation registry.
// Returns static metadata from src/lib/automation-registry.ts merged with
// best-effort live signals (last run timestamps from existing DB tables,
// Discord webhook env presence, Solapi env presence, 30-day order count).
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTOMATIONS, type AutomationStatus } from '@/lib/automation-registry';

export const dynamic = 'force-dynamic';

interface EnrichedAutomation {
  id: string;
  group: string;
  nameKey: string;
  code?: string;
  frequency: string;
  schedule?: string;
  status: AutomationStatus;
  activationCondition?: string;
  targetPhase?: string;
  togglable: boolean;
  descriptionKey?: string;
  cronPath?: string;
  lastRun: string | null;
  envOk: boolean;
}

const ALIMTALK_THRESHOLD = 50;

export async function GET() {
  // ── Last run lookups (best-effort, single round-trip each) ─────────────────
  const lastInventorySnap = await prisma.inventorySnapshot.findFirst({
    orderBy: { polledAt: 'desc' },
    select: { polledAt: true },
  });
  const lastCompetitorSnap = await prisma.competitorSnapshot.findFirst({
    orderBy: { polledAt: 'desc' },
    select: { polledAt: true },
  });
  const lastDomeCategory = await prisma.domeCategory.findFirst({
    orderBy: { refreshedAt: 'desc' },
    select: { refreshedAt: true },
  });

  // ── Env-based liveness checks ──────────────────────────────────────────────
  const discordEnv = {
    'discord-kkotti-recommend': !!process.env.DISCORD_WEBHOOK_KKOTTI_RECOMMEND,
    'discord-stock-alert':      !!process.env.DISCORD_WEBHOOK_STOCK_ALERT,
    'discord-price-change':     !!process.env.DISCORD_WEBHOOK_PRICE_CHANGE,
    'discord-kkotti-score':     !!process.env.DISCORD_WEBHOOK_KKOTTI_SCORE,
    'discord-ops-report':       !!process.env.DISCORD_WEBHOOK_OPS_REPORT,
  };

  const solapiConfigured =
    !!process.env.SOLAPI_API_KEY && !!process.env.SOLAPI_API_SECRET;

  // ── 30-day order count (for alimtalk threshold) ────────────────────────────
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const last30DaysOrders = await prisma.order.count({
    where: { createdAt: { gte: since } },
  });
  const alimtalkAutoOk =
    solapiConfigured && last30DaysOrders >= ALIMTALK_THRESHOLD;

  // ── Enrich each automation ─────────────────────────────────────────────────
  const enriched: EnrichedAutomation[] = AUTOMATIONS.map((a) => {
    let lastRun: string | null = null;
    let status: AutomationStatus = a.status;
    let envOk = true;

    switch (a.id) {
      case 'inventory-poll':
      case 'price-poll':
        // 6-B piggy-backs on the same getItemView call as 6-A, so they share
        // the latest inventory snapshot timestamp as their lastRun signal.
        lastRun = lastInventorySnap?.polledAt?.toISOString() ?? null;
        break;
      case 'competitor-poll':
        // 6-C piggy-backs in the same cron loop but uses search API; track
        // the latest CompetitorSnapshot.polledAt independently.
        lastRun = lastCompetitorSnap?.polledAt?.toISOString() ?? null;
        break;
      case 'supplier-score':
        // 6-C.2 is computed on-demand by /api/suppliers/scores. Surface the
        // latest competitor poll (its primary data source) as a proxy.
        lastRun = lastCompetitorSnap?.polledAt?.toISOString() ?? null;
        break;
      case 'category-cache':
        // 6-E refreshes on the weekly cron; surface the latest DomeCategory.refreshedAt.
        lastRun = lastDomeCategory?.refreshedAt?.toISOString() ?? null;
        break;
      case 'golden-window':
      case 'pareto-recalc':
      case 'category-1page':
      case 'tag-dictionary':
        // P0-B + P0-C + P1-A + P1-C are computed on-demand. No lastRun signal —
        // they reflect live state. Set null to indicate "live" rather than scheduled.
        lastRun = null;
        break;
      case 'discord-kkotti-recommend':
      case 'discord-stock-alert':
      case 'discord-price-change':
      case 'discord-kkotti-score':
      case 'discord-ops-report': {
        const ok = discordEnv[a.id as keyof typeof discordEnv];
        envOk = ok;
        if (!ok) status = 'pending';
        break;
      }
      case 'alimtalk-d3':
      case 'alimtalk-d30':
        envOk = solapiConfigured;
        if (alimtalkAutoOk) status = 'active';
        break;
      default:
        break;
    }

    return {
      id: a.id,
      group: a.group,
      nameKey: a.nameKey,
      code: a.code,
      frequency: a.frequency,
      schedule: a.schedule,
      status,
      activationCondition: a.activationCondition,
      targetPhase: a.targetPhase,
      togglable: a.togglable,
      descriptionKey: a.descriptionKey,
      cronPath: a.cronPath,
      lastRun,
      envOk,
    };
  });

  const summary = {
    active:    enriched.filter((a) => a.status === 'active').length,
    pending:   enriched.filter((a) => a.status === 'pending').length,
    hold:      enriched.filter((a) => a.status === 'hold').length,
    preparing: enriched.filter((a) => a.status === 'preparing').length,
  };

  const discordConfiguredCount = Object.values(discordEnv).filter(Boolean).length;
  const discordTotalCount = Object.keys(discordEnv).length;

  return NextResponse.json({
    ok: true,
    automations: enriched,
    summary,
    context: {
      last30DaysOrders,
      alimtalkThreshold: ALIMTALK_THRESHOLD,
      solapiConfigured,
      discordConfiguredCount,
      discordTotalCount,
      generatedAt: new Date().toISOString(),
    },
  });
}
