// src/lib/recommendation-modes.ts
// Kkotti 4-mode recommendation engine — Sprint 6-D foundation (data model + types)
//
// 4 modes per ROADMAP.md Sprint 6-D:
//   1. CURRENT_HOT    — categories/keywords with sales explosion right now
//   2. SEASONAL_AHEAD — seasonal events D-30 (Lunar New Year, Valentine, Mother's Day, Halloween, etc.)
//   3. NICHE_BLUE     — low competition + decent search volume = blue ocean
//   4. STORE_FIT      — items aligned with seller's past sales/registered categories
//
// Each mode produces a list of SourcingOpportunity (existing type from sourcing-recommender.ts).
// This file defines the mode contract + factory + utilities. Actual data fetching for each mode
// is implemented in step 4 (this file's mode runners).

import type { SourcingOpportunity } from '@/lib/sourcing-recommender';

// ── Mode identifiers ─────────────────────────────────────────────────────────

export const RECOMMENDATION_MODES = [
  'CURRENT_HOT',
  'SEASONAL_AHEAD',
  'NICHE_BLUE',
  'STORE_FIT',
] as const;

export type RecommendationMode = (typeof RECOMMENDATION_MODES)[number];

// ── Mode metadata (for UI labels, Discord embed sections, internal use) ─────

export interface ModeMeta {
  /** English code, used in DB / API / logs */
  code: RecommendationMode;
  /** Korean dictionary key — looked up from discord-strings.ko.json */
  dictKey: 'currentHot' | 'seasonalAhead' | 'nicheBlue' | 'storeFit';
  /** Lucide icon name (for future React UI; not used in Discord embeds) */
  iconName: string;
  /** Discord emoji prefix shown on the section title */
  emoji: string;
  /** Default top-N items to display per mode in Discord embed */
  topN: number;
  /** Whether the mode requires seller history (skip silently if no history) */
  requiresStoreData: boolean;
}

export const MODE_META: Record<RecommendationMode, ModeMeta> = {
  CURRENT_HOT: {
    code: 'CURRENT_HOT',
    dictKey: 'currentHot',
    iconName: 'Flame',
    emoji: '🔥',
    topN: 3,
    requiresStoreData: false,
  },
  SEASONAL_AHEAD: {
    code: 'SEASONAL_AHEAD',
    dictKey: 'seasonalAhead',
    iconName: 'Calendar',
    emoji: '📅',
    topN: 2,
    requiresStoreData: false,
  },
  NICHE_BLUE: {
    code: 'NICHE_BLUE',
    dictKey: 'nicheBlue',
    iconName: 'Compass',
    emoji: '🌊',
    topN: 2,
    requiresStoreData: false,
  },
  STORE_FIT: {
    code: 'STORE_FIT',
    dictKey: 'storeFit',
    iconName: 'Sparkles',
    emoji: '✨',
    topN: 2,
    requiresStoreData: true,
  },
};

// ── Mode result envelope ─────────────────────────────────────────────────────

export interface ModeResult {
  mode: RecommendationMode;
  /** Items sorted by mode-specific score (desc) */
  items: SourcingOpportunity[];
  /** Mode-specific contextual note (e.g. "Lunar New Year D-23") for Discord embed */
  contextNote?: string;
  /** Set when mode skipped or returned empty (used to keep Discord embed clean) */
  skipReason?: 'no_store_data' | 'no_match' | 'api_error';
}

export interface FourModeResult {
  generatedAt: string;
  modes: ModeResult[];
  /** Aggregated unique items across all modes (for legacy single-list consumers) */
  flat: SourcingOpportunity[];
}

// ── Seasonal calendar (Korean retail) ────────────────────────────────────────
// Each season has D-30 lead time — recommend items ahead of the date.
// Dates are MM-DD to handle annual rotation. Lunar dates updated yearly via constant rotation.

export interface SeasonalEvent {
  /** Internal id */
  id: string;
  /** Korean label */
  label: string;
  /** MM-DD format */
  date: string;
  /** Search keywords associated with this event */
  keywords: string[];
  /** Days before event when recommendation should activate (default 30) */
  leadTimeDays?: number;
}

export const SEASONAL_EVENTS_2026: SeasonalEvent[] = [
  // Korean cultural events
  { id: 'lunar_new_year', label: '설날', date: '02-17', keywords: ['설선물', '한복', '설날선물세트'], leadTimeDays: 30 },
  { id: 'valentine', label: '발렌타인데이', date: '02-14', keywords: ['발렌타인', '초콜릿선물', '커플선물'], leadTimeDays: 30 },
  { id: 'white_day', label: '화이트데이', date: '03-14', keywords: ['화이트데이', '사탕선물'], leadTimeDays: 30 },
  { id: 'parents_day', label: '어버이날', date: '05-08', keywords: ['어버이날선물', '카네이션', '효도선물'], leadTimeDays: 30 },
  { id: 'children_day', label: '어린이날', date: '05-05', keywords: ['어린이날선물', '아이장난감'], leadTimeDays: 30 },
  { id: 'teacher_day', label: '스승의날', date: '05-15', keywords: ['스승의날선물', '꽃다발'], leadTimeDays: 21 },
  { id: 'summer_vacation', label: '여름휴가', date: '07-15', keywords: ['휴가용품', '바캉스', '비치웨어'], leadTimeDays: 30 },
  { id: 'chuseok', label: '추석', date: '09-25', keywords: ['추석선물', '한과선물세트', '명절선물'], leadTimeDays: 30 },
  { id: 'halloween', label: '할로윈', date: '10-31', keywords: ['할로윈코스튬', '할로윈장식'], leadTimeDays: 30 },
  { id: 'christmas', label: '크리스마스', date: '12-25', keywords: ['크리스마스선물', '트리장식', '연말선물'], leadTimeDays: 35 },
  { id: 'year_end', label: '연말연시', date: '12-30', keywords: ['새해선물', '다이어리'], leadTimeDays: 21 },
];

// ── Date utility for seasonal mode ───────────────────────────────────────────

/**
 * Returns events whose D-day falls within the upcoming `leadTimeDays` window.
 * Handles year rollover (e.g., today=Dec 20, next event=Lunar New Year next year).
 */
export function getActiveSeasonalEvents(today: Date = new Date()): { event: SeasonalEvent; daysLeft: number }[] {
  const result: { event: SeasonalEvent; daysLeft: number }[] = [];
  const todayMs = today.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const event of SEASONAL_EVENTS_2026) {
    const [mm, dd] = event.date.split('-').map(Number);
    // Try this year first
    let target = new Date(today.getFullYear(), mm - 1, dd);
    // If already passed, roll to next year
    if (target.getTime() < todayMs) {
      target = new Date(today.getFullYear() + 1, mm - 1, dd);
    }
    const daysLeft = Math.ceil((target.getTime() - todayMs) / dayMs);
    const lead = event.leadTimeDays ?? 30;
    if (daysLeft >= 0 && daysLeft <= lead) {
      result.push({ event, daysLeft });
    }
  }

  // Sort: closest first
  return result.sort((a, b) => a.daysLeft - b.daysLeft);
}

// ── Mode runner contract (implemented in step 4) ─────────────────────────────

export interface ModeRunnerInput {
  /** Limit per mode */
  limit?: number;
  /** Optional seller userId for STORE_FIT mode */
  userId?: string;
}

export type ModeRunner = (input: ModeRunnerInput) => Promise<ModeResult>;

// ── Aggregation helper ───────────────────────────────────────────────────────

/**
 * Deduplicate items across modes by keyword. Earlier modes take priority when same keyword appears.
 * (CURRENT_HOT > SEASONAL_AHEAD > NICHE_BLUE > STORE_FIT)
 */
export function dedupeFlatten(modes: ModeResult[]): SourcingOpportunity[] {
  const seen = new Set<string>();
  const flat: SourcingOpportunity[] = [];
  for (const m of modes) {
    for (const item of m.items) {
      if (seen.has(item.keyword)) continue;
      seen.add(item.keyword);
      flat.push(item);
    }
  }
  return flat;
}
