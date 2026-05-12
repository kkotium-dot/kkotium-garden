// src/lib/automation-registry.ts
// ============================================================================
// Phase 1: static metadata for all known automations.
// All current + planned automations (Sprint 6 ~ 9) are declared here as a single
// source of truth. New automations register themselves by adding a row to
// AUTOMATIONS; the /automation page and registry API auto-discover them.
//
// Status semantics:
//   active     — code wired + running on production
//   pending    — code planned, not yet built (placeholder visible to user)
//   hold       — code may exist, awaiting explicit user activation (e.g. 50건+)
//   preparing  — Sprint 9+ infra, only metadata visible
//
// The registry contains NO live state. Live state (lastRun timestamps, env
// configuration) is computed in src/app/api/automation/registry/route.ts
// and merged onto each row server-side.
// ============================================================================

export type AutomationStatus = 'active' | 'pending' | 'hold' | 'preparing';

export type AutomationGroupId =
  | 'inventory'      // 재고
  | 'price'          // 가격
  | 'competition'    // 경쟁 + 공급사
  | 'seo'            // SEO + 노출
  | 'trust'          // 신뢰도
  | 'notification'   // 알림 발송
  | 'cron'           // 기존 cron
  | 'private'        // Sprint 8 Private 자동발주 (보류)
  | 'p3';            // Sprint 9 P3 (준비)

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
  'price',
  'competition',
  'seo',
  'trust',
  'notification',
  'cron',
  'private',
  'p3',
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
  {
    id: 'naver-oos-flip',
    group: 'inventory',
    nameKey: 'naverOosFlip',
    code: '6-A.3',
    frequency: 'on-event',
    status: 'hold',
    activationCondition: 'manualOptIn',
    togglable: true,
    descriptionKey: 'naverOosFlip',
  },

  // ── 가격 ────────────────────────────────────────────────────────────────────
  {
    id: 'price-poll',
    group: 'price',
    nameKey: 'pricePoll',
    code: '6-B',
    frequency: 'daily',
    schedule: '0 0 * * *',
    status: 'pending',
    targetPhase: 'Session E-2',
    togglable: false,
    descriptionKey: 'pricePoll',
  },
  {
    id: 'margin-recalc',
    group: 'price',
    nameKey: 'marginRecalc',
    code: '6-B.2',
    frequency: 'on-event',
    status: 'pending',
    targetPhase: 'Session E-2',
    togglable: false,
    descriptionKey: 'marginRecalc',
  },

  // ── 경쟁 + 공급사 ───────────────────────────────────────────────────────────
  {
    id: 'competitor-poll',
    group: 'competition',
    nameKey: 'competitorPoll',
    code: '6-C',
    frequency: 'daily',
    status: 'pending',
    targetPhase: 'Session F',
    togglable: false,
    descriptionKey: 'competitorPoll',
  },
  {
    id: 'supplier-score',
    group: 'competition',
    nameKey: 'supplierScore',
    code: '6-C.2',
    frequency: 'daily',
    status: 'pending',
    targetPhase: 'Session F',
    togglable: false,
    descriptionKey: 'supplierScore',
  },

  // ── SEO + 노출 ──────────────────────────────────────────────────────────────
  {
    id: 'golden-window',
    group: 'seo',
    nameKey: 'goldenWindow',
    code: 'P0-B',
    frequency: 'daily',
    status: 'pending',
    targetPhase: 'Sprint 7 P0',
    togglable: false,
    descriptionKey: 'goldenWindow',
  },
  {
    id: 'pareto-recalc',
    group: 'seo',
    nameKey: 'paretoRecalc',
    code: 'P0-C',
    frequency: 'daily',
    status: 'pending',
    targetPhase: 'Sprint 7 P0',
    togglable: false,
    descriptionKey: 'paretoRecalc',
  },
  {
    id: 'category-1page',
    group: 'seo',
    nameKey: 'category1page',
    code: 'P1-A',
    frequency: 'on-register',
    status: 'pending',
    targetPhase: 'Sprint 7 P1',
    togglable: false,
    descriptionKey: 'category1page',
  },
  {
    id: 'tag-dictionary',
    group: 'seo',
    nameKey: 'tagDictionary',
    code: 'P1-C',
    frequency: 'on-register',
    status: 'pending',
    targetPhase: 'Sprint 7 P1',
    togglable: false,
    descriptionKey: 'tagDictionary',
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
  {
    id: 'talktalk-monitor',
    group: 'trust',
    nameKey: 'talktalkMonitor',
    frequency: 'hourly',
    status: 'pending',
    targetPhase: 'Sprint 8',
    togglable: false,
    descriptionKey: 'talktalkMonitor',
  },

  // ── 알림 발송 ──────────────────────────────────────────────────────────────
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
    id: 'discord-price-change',
    group: 'notification',
    nameKey: 'discordPriceChange',
    frequency: 'on-event',
    status: 'active',
    togglable: true,
    descriptionKey: 'discordPriceChange',
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
  {
    id: 'alimtalk-d3',
    group: 'notification',
    nameKey: 'alimtalkD3',
    frequency: 'on-order',
    status: 'hold',
    activationCondition: 'orders50',
    togglable: false,
    descriptionKey: 'alimtalkD3',
  },
  {
    id: 'alimtalk-d30',
    group: 'notification',
    nameKey: 'alimtalkD30',
    frequency: 'on-order',
    status: 'hold',
    activationCondition: 'orders50',
    togglable: false,
    descriptionKey: 'alimtalkD30',
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

  // ── Sprint 8 Private 자동발주 (보류 트랙) ──────────────────────────────────
  {
    id: 'private-auto-order',
    group: 'private',
    nameKey: 'privateAutoOrder',
    code: 'Sprint 8',
    frequency: 'on-order',
    status: 'hold',
    activationCondition: 'manualOptIn',
    targetPhase: 'Sprint 8 (보류)',
    togglable: false,
    descriptionKey: 'privateAutoOrder',
  },
  {
    id: 'private-invoice',
    group: 'private',
    nameKey: 'privateInvoice',
    code: 'Sprint 8',
    frequency: 'hourly',
    status: 'hold',
    activationCondition: 'manualOptIn',
    targetPhase: 'Sprint 8 (보류)',
    togglable: false,
    descriptionKey: 'privateInvoice',
  },
  {
    id: 'private-returns',
    group: 'private',
    nameKey: 'privateReturns',
    code: 'Sprint 8',
    frequency: 'on-event',
    status: 'hold',
    activationCondition: 'manualOptIn',
    targetPhase: 'Sprint 8 (보류)',
    togglable: false,
    descriptionKey: 'privateReturns',
  },

  // ── Sprint 9 P3 (매출 600만원+ 후) ──────────────────────────────────────────
  {
    id: 'roas-tracking',
    group: 'p3',
    nameKey: 'roasTracking',
    code: 'P3-C',
    frequency: 'daily',
    status: 'preparing',
    activationCondition: 'revenue600',
    targetPhase: 'Sprint 9 P3',
    togglable: false,
    descriptionKey: 'roasTracking',
  },
  {
    id: 'home-proxy',
    group: 'p3',
    nameKey: 'homeProxy',
    code: 'P3-A',
    frequency: 'manual',
    status: 'preparing',
    activationCondition: 'revenue600',
    targetPhase: 'Sprint 9 P3',
    togglable: false,
    descriptionKey: 'homeProxy',
  },
];

export function getAutomationsByGroup(group: AutomationGroupId): AutomationMeta[] {
  return AUTOMATIONS.filter((a) => a.group === group);
}

export function getAutomationById(id: string): AutomationMeta | undefined {
  return AUTOMATIONS.find((a) => a.id === id);
}
