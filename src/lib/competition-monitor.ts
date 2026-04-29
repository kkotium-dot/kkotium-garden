// src/lib/competition-monitor.ts
// D-3: Competition monitoring library
// Tracks competitor price/review changes for products in our catalog
// Triggers Discord alerts when significant changes detected

import { searchShopping, type ShoppingItem } from '@/lib/naver/shopping-search';

// -- Types ------------------------------------------------------------------

export interface CompetitorSnapshot {
  query: string;
  timestamp: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalResults: number;
  topItems: CompetitorItem[];
  competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
}

// E-10: Entry barrier analysis (Option A approach)
// Naver Shopping Search API does not provide review count or product rating.
// Instead, we estimate market entry difficulty using indirect signals:
//   1. Seller diversity (unique mallName count) — concentrated vs fragmented
//   2. Price spread ((max-min)/avg) — commodity vs differentiation room
//   3. Total search results — niche vs saturated
//   4. Competition level from total results bucketing
export interface EntryBarrierAnalysis {
  score: number;             // 0~5 (5 = highest barrier)
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: {
    sellerDiversity: number; // unique mallName count in top items
    priceSpread: number;     // (max-min)/avg, rounded to 2 decimals
    totalResults: number;
    competitionLevel: string;
  };
  recommendation: string;
}

export interface CompetitorItem {
  title: string;
  price: number;
  mallName: string;
  productId: string;
  brand: string;
  category: string;
  link: string;
}

export interface PriceChangeAlert {
  productName: string;
  keyword: string;
  previousAvg: number;
  currentAvg: number;
  changePct: number;
  direction: 'UP' | 'DOWN';
  myPrice: number;
  myPricePosition: 'BELOW_AVG' | 'AT_AVG' | 'ABOVE_AVG';
  topCompetitors: CompetitorItem[];
  recommendation: string;
}

export interface CompetitionReport {
  timestamp: string;
  totalTracked: number;
  alerts: PriceChangeAlert[];
  snapshots: CompetitorSnapshot[];
}

// -- Constants ---------------------------------------------------------------

const PRICE_CHANGE_THRESHOLD = 0.05; // 5% price change triggers alert
const SIGNIFICANT_RESULTS_CHANGE = 0.20; // 20% change in results count

// E-10: Entry barrier scoring weights (Option A — indirect estimation)
const ENTRY_BARRIER_BASE = 2.5;             // mid-point on 0~5 scale
const SELLER_DIVERSITY_HIGH = 5;            // 5+ unique sellers = fragmented market (raises barrier slightly)
const SELLER_DIVERSITY_LOW = 2;             // <=2 = oligopoly (lowers barrier — fewer entrenched players)
const PRICE_SPREAD_WIDE = 0.5;              // wide spread = differentiation room (lowers barrier)
const PRICE_SPREAD_TIGHT = 0.2;             // tight spread = commodity (raises barrier)
const RESULTS_SATURATED = 100000;
const RESULTS_CROWDED = 30000;
const RESULTS_MODERATE = 5000;
const RESULTS_NICHE = 1000;

// -- Core functions ----------------------------------------------------------

/** Take a snapshot of competition for a given keyword */
export async function takeCompetitorSnapshot(keyword: string): Promise<CompetitorSnapshot> {
  const result = await searchShopping(keyword, { display: 10, sort: 'sim' });

  const prices = result.items
    .map(i => Number(i.lprice))
    .filter(p => p > 0);

  const avgPrice = prices.length > 0
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : 0;

  const level: CompetitorSnapshot['competitionLevel'] =
    result.total > 100000 ? 'VERY_HIGH' :
    result.total > 30000 ? 'HIGH' :
    result.total > 5000 ? 'MEDIUM' : 'LOW';

  return {
    query: keyword,
    timestamp: new Date().toISOString(),
    avgPrice,
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    totalResults: result.total,
    topItems: result.items.slice(0, 5).map(i => ({
      title: i.title,
      price: Number(i.lprice),
      mallName: i.mallName,
      productId: i.productId,
      brand: i.brand,
      category: [i.category1, i.category2, i.category3].filter(Boolean).join(' > '),
      link: i.link,
    })),
    competitionLevel: level,
  };
}

/**
 * E-10: Estimate market entry barrier from a competitor snapshot.
 * Returns a 0~5 score, a level label, and the underlying factors for UI display.
 * This is an indirect estimation since Naver Shopping API does not expose review data.
 */
export function calcEntryBarrier(snapshot: CompetitorSnapshot): EntryBarrierAnalysis {
  let score = ENTRY_BARRIER_BASE;

  // Seller diversity — count of unique mallNames in topItems
  const uniqueSellers = new Set(
    snapshot.topItems.map(i => i.mallName).filter(Boolean)
  ).size;

  if (uniqueSellers >= SELLER_DIVERSITY_HIGH) {
    score += 0.5; // fragmented market — many competitors slightly raise barrier
  } else if (uniqueSellers > 0 && uniqueSellers <= SELLER_DIVERSITY_LOW) {
    score -= 0.5; // oligopoly — fewer entrenched sellers, easier to enter
  }

  // Price spread — (max - min) / avg
  const spread = snapshot.avgPrice > 0
    ? (snapshot.maxPrice - snapshot.minPrice) / snapshot.avgPrice
    : 0;

  if (spread >= PRICE_SPREAD_WIDE) {
    score -= 0.5; // wide spread = positioning room
  } else if (spread > 0 && spread < PRICE_SPREAD_TIGHT) {
    score += 0.5; // tight spread = commodity, hard to differentiate
  }

  // Total results — saturated vs niche
  if (snapshot.totalResults >= RESULTS_SATURATED) {
    score += 1.5;
  } else if (snapshot.totalResults >= RESULTS_CROWDED) {
    score += 1.0;
  } else if (snapshot.totalResults >= RESULTS_MODERATE) {
    score += 0.5;
  } else if (snapshot.totalResults < RESULTS_NICHE) {
    score -= 0.5; // niche market
  }

  // Competition level — pre-bucketed signal
  if (snapshot.competitionLevel === 'VERY_HIGH') {
    score += 0.5;
  } else if (snapshot.competitionLevel === 'LOW') {
    score -= 0.5;
  }

  // Clamp to 0~5 range
  score = Math.max(0, Math.min(5, score));

  const level: EntryBarrierAnalysis['level'] =
    score >= 3.5 ? 'HIGH' :
    score >= 2.0 ? 'MEDIUM' : 'LOW';

  // Korean recommendation text — keep wording short for chip/tooltip use
  let recommendation: string;
  if (level === 'LOW') {
    // 진입장벽 낮음 — 차별화 기회, 브랜드/품질 강화로 진입 권장
    recommendation = '\uC9C4\uC785\uC7A5\uBCBD \uB0AE\uC74C \u2014 \uCC28\uBCC4\uD654 \uAE30\uD68C, \uBE0C\uB79C\uB4DC\uC640 \uD488\uC9C8\uB85C \uC2B9\uBD80\uD558\uBA74 \uC9C4\uC785 \uC720\uB9AC';
  } else if (level === 'MEDIUM') {
    // 보통 — 가격/품질 균형 + SEO 최적화로 승부
    recommendation = '\uBCF4\uD1B5 \u2014 \uAC00\uACA9\u00B7\uD488\uC9C8 \uADE0\uD615 + SEO \uCD5C\uC801\uD654\uB85C \uC2B9\uBD80';
  } else {
    // 높음 — 포화 시장, 틈새/독특한 앵글 필요
    recommendation = '\uB192\uC74C \u2014 \uD3EC\uD654 \uC2DC\uC7A5, \uD2C8\uC0C8\u00B7\uB3C5\uD2B9\uD55C \uC559\uAE00\uC774 \uD544\uC694';
  }

  return {
    score: Math.round(score * 10) / 10,
    level,
    factors: {
      sellerDiversity: uniqueSellers,
      priceSpread: Math.round(spread * 100) / 100,
      totalResults: snapshot.totalResults,
      competitionLevel: snapshot.competitionLevel,
    },
    recommendation,
  };
}

/**
 * E-10: Convert entry barrier score to a BlueOcean bonus.
 * Used by sourcing-recommender to nudge opportunity ranking.
 *   LOW barrier   → +15 (good entry chance)
 *   MEDIUM        →   0
 *   HIGH barrier  → -10 (saturated, harder)
 */
export function entryBarrierToBlueOceanBonus(level: EntryBarrierAnalysis['level']): number {
  if (level === 'LOW') return 15;
  if (level === 'HIGH') return -10;
  return 0;
}

/** Get entry barrier level color for UI badges */
export function getEntryBarrierColor(level: EntryBarrierAnalysis['level']): { bg: string; text: string; label: string } {
  if (level === 'LOW') {
    return { bg: '#dcfce7', text: '#166534', label: '\uB0AE\uC74C' };
  }
  if (level === 'HIGH') {
    return { bg: '#fecaca', text: '#991b1b', label: '\uB192\uC74C' };
  }
  return { bg: '#fef9c3', text: '#854d0e', label: '\uBCF4\uD1B5' };
}

/** Compare two snapshots and detect significant changes */
export function detectChanges(
  current: CompetitorSnapshot,
  previous: CompetitorSnapshot,
  myPrice: number,
  myProductName: string,
): PriceChangeAlert | null {
  if (!previous.avgPrice || !current.avgPrice) return null;

  const priceDiff = current.avgPrice - previous.avgPrice;
  const changePct = priceDiff / previous.avgPrice;

  if (Math.abs(changePct) < PRICE_CHANGE_THRESHOLD) return null;

  const direction: 'UP' | 'DOWN' = priceDiff > 0 ? 'UP' : 'DOWN';

  const myPricePosition: PriceChangeAlert['myPricePosition'] =
    myPrice < current.avgPrice * 0.9 ? 'BELOW_AVG' :
    myPrice > current.avgPrice * 1.1 ? 'ABOVE_AVG' : 'AT_AVG';

  let recommendation = '';
  if (direction === 'DOWN' && myPricePosition === 'ABOVE_AVG') {
    recommendation = 'Competitors lowered prices. Consider price adjustment to stay competitive.';
  } else if (direction === 'UP' && myPricePosition === 'BELOW_AVG') {
    recommendation = 'Market prices rising. Opportunity to increase margin.';
  } else if (direction === 'DOWN') {
    recommendation = 'Market price declining. Monitor and maintain quality differentiation.';
  } else {
    recommendation = 'Market price increasing. Your pricing position is stable.';
  }

  return {
    productName: myProductName,
    keyword: current.query,
    previousAvg: previous.avgPrice,
    currentAvg: current.avgPrice,
    changePct: Math.round(changePct * 1000) / 10,
    direction,
    myPrice,
    myPricePosition,
    topCompetitors: current.topItems.slice(0, 3),
    recommendation,
  };
}

/** Generate competition-level label in Korean */
export function getCompetitionLabel(level: CompetitorSnapshot['competitionLevel']): string {
  const labels: Record<string, string> = {
    LOW: '\uB0AE\uC74C',       // 낮음
    MEDIUM: '\uBCF4\uD1B5',    // 보통
    HIGH: '\uB192\uC74C',      // 높음
    VERY_HIGH: '\uCE58\uC5F4', // 치열
  };
  return labels[level] ?? level;
}

/** Get competition level color */
export function getCompetitionColor(level: CompetitorSnapshot['competitionLevel']): string {
  const colors: Record<string, string> = {
    LOW: '#16a34a',
    MEDIUM: '#ca8a04',
    HIGH: '#ea580c',
    VERY_HIGH: '#dc2626',
  };
  return colors[level] ?? '#888';
}

/** Get price position label in Korean */
export function getPricePositionLabel(position: PriceChangeAlert['myPricePosition']): string {
  const labels: Record<string, string> = {
    BELOW_AVG: '\uD3C9\uADE0 \uC774\uD558',  // 평균 이하
    AT_AVG: '\uD3C9\uADE0 \uBC94\uC704',      // 평균 범위
    ABOVE_AVG: '\uD3C9\uADE0 \uC774\uC0C1',   // 평균 이상
  };
  return labels[position] ?? position;
}

/** Build Discord embed for competition alerts */
export function buildCompetitionAlertEmbed(alerts: PriceChangeAlert[]): Record<string, unknown> {
  const fields = alerts.slice(0, 8).map(a => {
    const arrow = a.direction === 'UP' ? ':small_red_triangle:' : ':small_red_triangle_down:';
    const posLabel = getPricePositionLabel(a.myPricePosition);
    const topComp = a.topCompetitors
      .map(c => `${c.mallName}: ${c.price.toLocaleString()}\uC6D0`)
      .join(' | ');

    return {
      name: `${arrow} ${a.productName}`,
      value: [
        `\uD0A4\uC6CC\uB4DC: ${a.keyword}`,
        `\uC2DC\uC7A5 \uD3C9\uADE0\uAC00: ${a.previousAvg.toLocaleString()}\uC6D0 \u2192 **${a.currentAvg.toLocaleString()}\uC6D0** (${a.changePct > 0 ? '+' : ''}${a.changePct}%)`,
        `\uB0B4 \uD310\uB9E4\uAC00: **${a.myPrice.toLocaleString()}\uC6D0** (${posLabel})`,
        `\uC0C1\uC704 \uACBD\uC7C1: ${topComp}`,
      ].join('\n'),
      inline: false,
    };
  });

  return {
    title: `:mag: \uACBD\uC7C1 \uC0C1\uD488 \uBCC0\uB3D9 \uAC10\uC9C0 \u2014 ${alerts.length}\uAC1C`,
    description: '\uACBD\uC7C1 \uC0C1\uD488\uC758 \uAC00\uACA9\uC774 \uD06C\uAC8C \uBCC0\uB3D9\uB418\uC5C8\uC5B4\uC694!',
    color: 0xf59e0b,
    fields,
    footer: { text: '\uAF43\uD2F0\uC6C0 \uAC00\uB4E0 \u00B7 \uACBD\uC7C1\uBAA8\uB2C8\uD130' },
    timestamp: new Date().toISOString(),
  };
}
