// src/app/api/automation/registry/route.ts
// ============================================================================
// Sprint 8-IA Phase 1: GET enriched automation registry (slim 8 entries).
// Returns static metadata from src/lib/automation-registry.ts merged with
// best-effort live signals (last run timestamps, Discord webhook env presence).
// Per 작업원칙 #46: only entries running on production live in registry.
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

export async function GET() {
  // ── Last run lookups (best-effort, single round-trip each) ─────────────────
  const lastInventorySnap = await prisma.inventorySnapshot.findFirst({
    orderBy: { polledAt: 'desc' },
    select: { polledAt: true },
  });

  // ── Env-based liveness checks (Discord webhooks for 4 active channels) ────
  const discordEnv = {
    'discord-kkotti-recommend': !!process.env.DISCORD_WEBHOOK_KKOTTI_RECOMMEND,
    'discord-stock-alert':      !!process.env.DISCORD_WEBHOOK_STOCK_ALERT,
    'discord-kkotti-score':     !!process.env.DISCORD_WEBHOOK_KKOTTI_SCORE,
    'discord-ops-report':       !!process.env.DISCORD_WEBHOOK_OPS_REPORT,
  };

  // ── 30-day order count (kept for SystemHealthCard discord count metric) ───
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const last30DaysOrders = await prisma.order.count({
    where: { createdAt: { gte: since } },
  });

  // ── Enrich each automation ─────────────────────────────────────────────────
  const enriched: EnrichedAutomation[] = AUTOMATIONS.map((a) => {
    let lastRun: string | null = null;
    let status: AutomationStatus = a.status;
    let envOk = true;

    switch (a.id) {
      case 'inventory-poll':
        lastRun = lastInventorySnap?.polledAt?.toISOString() ?? null;
        break;
      case 'discord-kkotti-recommend':
      case 'discord-stock-alert':
      case 'discord-kkotti-score':
      case 'discord-ops-report': {
        const ok = discordEnv[a.id as keyof typeof discordEnv];
        envOk = ok;
        if (!ok) status = 'pending';
        break;
      }
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
      discordConfiguredCount,
      discordTotalCount,
      generatedAt: new Date().toISOString(),
    },
  });
}
