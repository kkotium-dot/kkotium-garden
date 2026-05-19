// src/lib/automation-registry.ts
// ============================================================================
// Sprint 8-IA Phase 1: registry slimmed 31 -> 8 entries (2026-05-19).
// Only entries that are CURRENTLY RUNNING ON PRODUCTION are listed here.
// Per 작업원칙 #46 (false-label ban): planned-but-unbuilt automations
// (Sprint 6-B price polling, Sprint 6-C competitor/supplier, Sprint 7-P0/P1
// SEO event handlers, alimtalk D+3/D+30 hold, Sprint 8 Private auto-order,
// Sprint 9 P3 ROAS) live ONLY in SPRINT_PLAN.md / ROADMAP.md, never here.
//
// When a new automation ships, its registry entry MUST be added in the SAME
// commit as the code (#46 (e)).
//
// Status semantics:
//   active     — code wired + running on production (sole status used now)
//   pending    — RESERVED (do not use; planned work goes to SPRINT_PLAN.md)
//   hold       — RESERVED (do not use; opt-in modal handles flip)
//   preparing  — RESERVED (do not use)
//
// Live state (lastRun timestamps, env configuration) is computed in
// src/app/api/automation/registry/route.ts and merged onto each row.
// ============================================================================

export type AutomationStatus = 'active' | 'pending' | 'hold' | 'preparing';

export type AutomationGroupId =
  | 'inventory'      // 재고
  | 'trust'          // 신뢰도
  | 'notification'   // 알림 발송
  | 'cron';          // 기존 cron

export type AutomationFrequency =
  | 'daily'
  | 'weekly'
  | 'hourly'
  | 'on-event'
  | 'on-register'
  | 'on-order'
  | 'manual';

export interface AutomationMeta {
  /** Stable id for routing + log keying */
  id: string;
  group: AutomationGroupId;
  /** Korean user-facing name */
  nameKey: string;
  /** Short reference code (e.g., '6-A', 'P0-B') */
  code?: string;
  frequency: AutomationFrequency;
  /** Vercel cron expression if applicable */
  schedule?: string;
  status: AutomationStatus;
  /** Activation condition text (e.g., '월 50건+', '매출 600만원+') */
  activationCondition?: string;
  /** Sprint phase when this is targeted */
  targetPhase?: string;
  /** Whether ON/OFF toggle is meaningful in Phase 1 */
  togglable: boolean;
  /** Drill-down description key in strings JSON */
  descriptionKey?: string;
  /** Optional id of the cron route used for liveness lookup */
  cronPath?: string;
}

export const AUTOMATION_GROUP_ORDER: AutomationGroupId[] = [
  'inventory',
  'trust',
  'notification',
  'cron',
];

export const AUTOMATIONS: AutomationMeta[] = [
  // ── 재고 ────────────────────────────────────────────────────────────────────
  {
    id: 'inventory-poll',
    group: 'inventory',
    nameKey: 'inventoryPoll',
    code: '6-A',
    frequency: 'daily',
    schedule: '0 0 * * *',
    status: 'active',
    togglable: true,
    descriptionKey: 'inventoryPoll',
    cronPath: '/api/cron/inventory-sync',
  },

  // ── 신뢰도 ──────────────────────────────────────────────────────────────────
  {
    id: 'good-service-track',
    group: 'trust',
    nameKey: 'goodServiceTrack',
    frequency: 'weekly',
    schedule: '0 0 * * 1',
    status: 'active',
    togglable: true,
    descriptionKey: 'goodServiceTrack',
    cronPath: '/api/cron/weekly',
  },

  // ── 알림 발송 (per-event Discord) ───────────────────────────────────────────
  {
    id: 'discord-kkotti-recommend',
    group: 'notification',
    nameKey: 'discordKkottiRecommend',
    frequency: 'on-event',
    status: 'active',
    togglable: true,
    descriptionKey: 'discordKkottiRecommend',
  },
  {
    id: 'discord-stock-alert',
    group: 'notification',
    nameKey: 'discordStockAlert',
    frequency: 'on-event',
    status: 'active',
    togglable: true,
    descriptionKey: 'discordStockAlert',
  },
  {
    id: 'discord-kkotti-score',
    group: 'notification',
    nameKey: 'discordKkottiScore',
    frequency: 'on-event',
    status: 'active',
    togglable: true,
    descriptionKey: 'discordKkottiScore',
  },
  {
    id: 'discord-ops-report',
    group: 'notification',
    nameKey: 'discordOpsReport',
    frequency: 'weekly',
    status: 'active',
    togglable: true,
    descriptionKey: 'discordOpsReport',
  },

  // ── 기존 cron ──────────────────────────────────────────────────────────────
  {
    id: 'cron-daily',
    group: 'cron',
    nameKey: 'cronDaily',
    frequency: 'daily',
    schedule: '0 23 * * *',
    status: 'active',
    togglable: true,
    descriptionKey: 'cronDaily',
    cronPath: '/api/cron/daily',
  },
  {
    id: 'cron-weekly',
    group: 'cron',
    nameKey: 'cronWeekly',
    frequency: 'weekly',
    schedule: '0 0 * * 1',
    status: 'active',
    togglable: true,
    descriptionKey: 'cronWeekly',
    cronPath: '/api/cron/weekly',
  },
];

export function getAutomationsByGroup(group: AutomationGroupId): AutomationMeta[] {
  return AUTOMATIONS.filter((a) => a.group === group);
}

export function getAutomationById(id: string): AutomationMeta | undefined {
  return AUTOMATIONS.find((a) => a.id === id);
}
