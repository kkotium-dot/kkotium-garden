// src/lib/strategy/signal-collector.ts
//
// Sprint 7-M2 5-B — Strategy signal collector.
//
// Single entry point that gathers the four numeric signals the role engine
// needs. Each source is wrapped in a try/catch so a single API blip degrades
// gracefully (the caller still gets a partial StrategySignals and the role
// engine falls back to 'standard' on insufficient data).
//
// Sources
//   - searchVolume + competitionIdx : naver/keyword-api.ts fetchKeywordStats
//                                     (Naver Search Ad API, HMAC-SHA256)
//   - productCount                  : naver/shopping-search.ts searchShopping
//                                     (Naver Open API)
//   - trendSlope                    : naver/shopping-search.ts
//                                     getShoppingKeywordTrend (DataLab)
//   - honeyScore                    : daily_recommendations.honey_score
//
// All Naver API calls are server-side (HMAC + fixed-IP creds in env). If
// PlayMCP becomes the preferred path later, this module is the single place
// to swap the implementations behind the same StrategySignals contract.

import { prisma } from '@/lib/prisma';
import { fetchKeywordStats } from '@/lib/naver/keyword-api';
import {
  searchShopping,
  getShoppingKeywordTrend,
} from '@/lib/naver/shopping-search';
import type {
  CompetitionIdx,
  StrategySignals,
} from './role-engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CollectStrategySignalsInput {
  /** Primary keyword to query (typically the product name or its stem). */
  query: string;
  /** Optional Naver category code (e.g. "50000000"). Required for DataLab
   *  trend slope — without it, trendSlope falls back to 0 and the role
   *  engine downgrades to opportunity-index-only classification. */
  naverCategoryCode?: string | null;
}

export interface SignalSourceStatus {
  searchVolume: 'ok' | 'error' | 'no_credentials';
  productCount: 'ok' | 'error' | 'no_credentials';
  trendSlope: 'ok' | 'error' | 'no_credentials';
  honeyScore: 'ok' | 'error' | 'not_found';
}

export interface CollectStrategySignalsResult {
  signals: StrategySignals;
  status: SignalSourceStatus;
  /** Wall-clock duration in milliseconds. */
  elapsedMs: number;
  /** First error per source, useful for ops dashboards. */
  errors: Partial<Record<keyof SignalSourceStatus, string>>;
}

// ---------------------------------------------------------------------------
// Trend slope derivation
// ---------------------------------------------------------------------------

interface TrendDataPoint {
  period: string;
  ratio: number;
}

/** Simple least-squares slope on the (last-half mean vs first-half mean) of
 *  the DataLab ratio series, normalised by the first-half mean and clamped
 *  to [-1, +1]. Returns 0 when fewer than 4 points are available. */
function deriveTrendSlope(points: TrendDataPoint[]): number {
  if (!Array.isArray(points) || points.length < 4) return 0;
  const mid = Math.floor(points.length / 2);
  const first = points.slice(0, mid);
  const second = points.slice(mid);
  const mean = (arr: TrendDataPoint[]): number =>
    arr.reduce((acc, p) => acc + (Number(p.ratio) || 0), 0) / Math.max(arr.length, 1);
  const m1 = mean(first);
  const m2 = mean(second);
  if (m1 <= 0) return m2 > 0 ? 1 : 0;
  const raw = (m2 - m1) / m1;
  if (raw > 1) return 1;
  if (raw < -1) return -1;
  return Math.round(raw * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// Individual collectors — each isolated in try/catch
// ---------------------------------------------------------------------------

interface KeywordStatsOutcome {
  searchVolume: number;
  competitionIdx: CompetitionIdx;
  status: SignalSourceStatus['searchVolume'];
  error?: string;
}

async function collectKeywordStats(query: string): Promise<KeywordStatsOutcome> {
  try {
    const stats = await fetchKeywordStats([query]);
    const top = stats[0];
    if (!top) {
      return { searchVolume: 0, competitionIdx: 'unknown', status: 'error', error: 'no_match' };
    }
    return {
      searchVolume: top.totalMonthly,
      competitionIdx: top.competition,
      status: 'ok',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    const noCreds = /credentials not configured/i.test(msg);
    return {
      searchVolume: 0,
      competitionIdx: 'unknown',
      status: noCreds ? 'no_credentials' : 'error',
      error: msg,
    };
  }
}

interface ProductCountOutcome {
  productCount: number;
  status: SignalSourceStatus['productCount'];
  error?: string;
}

async function collectProductCount(query: string): Promise<ProductCountOutcome> {
  try {
    const result = await searchShopping(query, { display: 1, sort: 'sim' });
    return { productCount: result.total ?? 0, status: 'ok' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    const noCreds = /NAVER_OPENAPI_NOT_CONFIGURED/i.test(msg);
    return {
      productCount: 0,
      status: noCreds ? 'no_credentials' : 'error',
      error: msg,
    };
  }
}

interface TrendOutcome {
  trendSlope: number;
  status: SignalSourceStatus['trendSlope'];
  error?: string;
}

async function collectTrendSlope(
  query: string,
  categoryCode: string | null | undefined,
): Promise<TrendOutcome> {
  if (!categoryCode) {
    return {
      trendSlope: 0,
      status: 'error',
      error: 'category_code_missing',
    };
  }
  try {
    // 90-day window covers seasonal effects without DataLab quota burn.
    const end = new Date();
    const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date): string => d.toISOString().slice(0, 10);
    const results = await getShoppingKeywordTrend(
      categoryCode,
      [{ name: query, param: [query] }],
      { startDate: fmt(start), endDate: fmt(end), timeUnit: 'week' },
    );
    const series = (results[0]?.data ?? []) as TrendDataPoint[];
    return { trendSlope: deriveTrendSlope(series), status: 'ok' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    const noCreds = /NAVER_OPENAPI_NOT_CONFIGURED/i.test(msg);
    return {
      trendSlope: 0,
      status: noCreds ? 'no_credentials' : 'error',
      error: msg,
    };
  }
}

interface HoneyScoreOutcome {
  honeyScore: number;
  status: SignalSourceStatus['honeyScore'];
  error?: string;
}

async function collectHoneyScore(query: string): Promise<HoneyScoreOutcome> {
  try {
    // Most-recent daily_recommendation row that mentions the query token.
    const row = await prisma.daily_recommendations.findFirst({
      where: { product_name: { contains: query, mode: 'insensitive' } },
      orderBy: { date: 'desc' },
      select: { honey_score: true },
    });
    if (!row) {
      return { honeyScore: 0, status: 'not_found' };
    }
    return { honeyScore: row.honey_score ?? 0, status: 'ok' };
  } catch (err) {
    return {
      honeyScore: 0,
      status: 'error',
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export async function collectStrategySignals(
  input: CollectStrategySignalsInput,
): Promise<CollectStrategySignalsResult> {
  const startedAt = Date.now();

  const [kw, pc, tr, hs] = await Promise.all([
    collectKeywordStats(input.query),
    collectProductCount(input.query),
    collectTrendSlope(input.query, input.naverCategoryCode ?? null),
    collectHoneyScore(input.query),
  ]);

  const signals: StrategySignals = {
    searchVolume: kw.searchVolume,
    productCount: pc.productCount,
    trendSlope: tr.trendSlope,
    honeyScore: hs.honeyScore,
    competitionIdx: kw.competitionIdx,
  };

  const status: SignalSourceStatus = {
    searchVolume: kw.status,
    productCount: pc.status,
    trendSlope: tr.status,
    honeyScore: hs.status,
  };

  const errors: Partial<Record<keyof SignalSourceStatus, string>> = {};
  if (kw.error) errors.searchVolume = kw.error;
  if (pc.error) errors.productCount = pc.error;
  if (tr.error) errors.trendSlope = tr.error;
  if (hs.error) errors.honeyScore = hs.error;

  return {
    signals,
    status,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

export const _internals = {
  deriveTrendSlope,
};
