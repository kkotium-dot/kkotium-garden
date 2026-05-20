// src/lib/strategy/role-engine.ts
//
// Sprint 7-M2 5-B — Strategic role classifier.
//
// Maps raw market signals (search volume, competitor count, trend slope,
// honey_score) to one of five strategic roles. The role then controls
// downstream automation intensity: ace/battleground products get more
// designer hand-holding ("Needs Your Magic"), trend/standard get full auto.
//
// Why role-based (not category-based)
//   Hardcoded "잠옷 = niche" / "도자기 = ace" rules drift as the market
//   changes. Numeric signals stay accurate as long as the data refreshes —
//   the role is a derived label, not a stored attribute.
//
// Signal sources (collected by signal-collector.ts)
//   - searchVolume   : Naver Search Ad keywordstool monthly volume
//   - productCount   : Naver Shopping search total (competitor count)
//   - trendSlope     : DataLab 30-day slope (-1..+1)
//   - honeyScore     : daily_recommendations.honey_score (0-100, internal)
//   - competitionIdx : keyword-api.ts competition ('low'|'mid'|'high'|'unknown')

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type StrategicRole =
  | 'ace'           // high opportunity, low competition — invest design effort
  | 'trend'         // riding a fresh upward slope — speed > polish
  | 'niche'         // small but loyal audience — differentiation matters
  | 'battleground'  // high volume, high competition — designer must elevate
  | 'standard';     // baseline / insufficient data — full automation default

export type CompetitionIdx = 'low' | 'mid' | 'high' | 'unknown';

export interface StrategySignals {
  /** Monthly search volume (sum of PC + mobile). */
  searchVolume: number;
  /** Naver Shopping competitor count for the same query. */
  productCount: number;
  /** DataLab trend slope normalised to -1..+1. 0 if unknown. */
  trendSlope: number;
  /** Internal honey_score 0-100 (high = curated as worth promoting). 0 if unknown. */
  honeyScore: number;
  /** Per-keyword competition label from Naver Search Ad. */
  competitionIdx: CompetitionIdx;
}

export interface RoleClassification {
  role: StrategicRole;
  /** Numeric opportunity index (searchVolume / productCount, see below). */
  opportunityIndex: number;
  /** Short rationale tokens for downstream debugging / UI tooltips. */
  reasons: string[];
  /** Multiplier (1.0 = standard) that downstream automation reads to bias
   *  needs_your_magic vs auto_bloomed thresholds. */
  designerEffortMultiplier: number;
}

// ---------------------------------------------------------------------------
// Thresholds — single source of truth (tune here, never inline)
// ---------------------------------------------------------------------------

/** Below this monthly search volume, the role engine cannot trust signals
 *  and falls back to 'standard' (insufficient demand to classify). */
const MIN_VOLUME_FOR_CLASSIFICATION = 100;

/** Opportunity index buckets. */
const OPPORTUNITY_ACE_FLOOR = 0.10;        // ≥ 10% volume-to-product ratio
const OPPORTUNITY_NICHE_FLOOR = 0.02;      // ≥ 2% but < 10% = niche

/** Trend slope thresholds. */
const TREND_RISING = 0.25;                 // slope > +0.25 = upward fresh trend
const TREND_FALLING = -0.25;

/** Honey score / competition combinations that promote a product to ace. */
const HONEY_PROMOTION_FLOOR = 70;

/** Designer effort multipliers (higher = more "needs_your_magic" bias). */
const EFFORT: Record<StrategicRole, number> = {
  ace:          1.5,   // invest design — best ROI
  battleground: 1.6,   // must visually differentiate or lose
  niche:        1.2,   // differentiation matters but ROI smaller
  trend:        0.8,   // ship fast, don't over-polish a fleeting wave
  standard:     1.0,
};

// ---------------------------------------------------------------------------
// Opportunity index — volume / competitor count
// ---------------------------------------------------------------------------

/**
 * Compute the opportunity index. Higher = more demand per competitor.
 * Guarded against zero divisors (returns 0 when product count is 0 OR when
 * search volume is too low to trust).
 */
export function computeOpportunityIndex(
  searchVolume: number,
  productCount: number,
): number {
  if (!Number.isFinite(searchVolume) || !Number.isFinite(productCount)) return 0;
  if (searchVolume <= 0) return 0;
  if (productCount <= 0) return 0;
  // Round to 4 decimals — index is small for high-competition markets.
  return Math.round((searchVolume / productCount) * 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Role classification — decision tree
// ---------------------------------------------------------------------------

export function classifyRole(signals: StrategySignals): RoleClassification {
  const reasons: string[] = [];
  const opportunityIndex = computeOpportunityIndex(
    signals.searchVolume,
    signals.productCount,
  );

  // Insufficient data — bail to standard.
  if (signals.searchVolume < MIN_VOLUME_FOR_CLASSIFICATION) {
    reasons.push('volume_below_floor');
    return {
      role: 'standard',
      opportunityIndex,
      reasons,
      designerEffortMultiplier: EFFORT.standard,
    };
  }
  if (signals.productCount <= 0) {
    reasons.push('product_count_unknown');
    return {
      role: 'standard',
      opportunityIndex,
      reasons,
      designerEffortMultiplier: EFFORT.standard,
    };
  }

  // 1. Trend — fresh upward slope wins regardless of opportunity index,
  //    because trend windows close fast and speed beats polish.
  if (signals.trendSlope >= TREND_RISING) {
    reasons.push('trend_slope_rising');
    if (signals.competitionIdx === 'high') {
      // Even on rising trend, if everyone is already there, treat as
      // battleground (we won't win on speed alone).
      reasons.push('competition_high_overrides_trend');
      return {
        role: 'battleground',
        opportunityIndex,
        reasons,
        designerEffortMultiplier: EFFORT.battleground,
      };
    }
    return {
      role: 'trend',
      opportunityIndex,
      reasons,
      designerEffortMultiplier: EFFORT.trend,
    };
  }

  // 2. Honey-score promotion — internal curation biases UP, but raw
  //    competition signals can still override. Order matters here:
  //    high competition wins first (designer must elevate above the noise),
  //    then opportunity-index decides ace vs niche.
  if (signals.honeyScore >= HONEY_PROMOTION_FLOOR) {
    // 2a. Red-ocean override — high competition OR oversaturated supply
    //     (opportunity index below niche floor) → battleground regardless.
    //     Real-world precedent: 잠옷세트 honey=72, productCount=44k, comp=high
    //     → seller must visually differentiate or get drowned.
    if (signals.competitionIdx === 'high' || opportunityIndex < OPPORTUNITY_NICHE_FLOOR) {
      reasons.push('honey_score_high', 'red_ocean_override');
      return {
        role: 'battleground',
        opportunityIndex,
        reasons,
        designerEffortMultiplier: EFFORT.battleground,
      };
    }
    // 2b. Promote to ace when opportunity index clears the ace floor AND
    //     competition is not already 'high'.
    if (opportunityIndex >= OPPORTUNITY_ACE_FLOOR) {
      reasons.push('honey_score_high', 'opportunity_index_ace');
      return {
        role: 'ace',
        opportunityIndex,
        reasons,
        designerEffortMultiplier: EFFORT.ace,
      };
    }
    reasons.push('honey_score_high', 'fallback_niche');
    return {
      role: 'niche',
      opportunityIndex,
      reasons,
      designerEffortMultiplier: EFFORT.niche,
    };
  }

  // 3. Opportunity-index buckets — primary classification path.
  if (opportunityIndex >= OPPORTUNITY_ACE_FLOOR) {
    // Lots of demand vs supply — but still check competition label, because
    // a low product count with high paid-ad competition still bleeds margin.
    if (signals.competitionIdx === 'high') {
      reasons.push('opportunity_high_but_ad_competition_high');
      return {
        role: 'battleground',
        opportunityIndex,
        reasons,
        designerEffortMultiplier: EFFORT.battleground,
      };
    }
    reasons.push('opportunity_index_ace');
    return {
      role: 'ace',
      opportunityIndex,
      reasons,
      designerEffortMultiplier: EFFORT.ace,
    };
  }

  if (opportunityIndex >= OPPORTUNITY_NICHE_FLOOR) {
    reasons.push('opportunity_index_niche_band');
    return {
      role: 'niche',
      opportunityIndex,
      reasons,
      designerEffortMultiplier: EFFORT.niche,
    };
  }

  // 4. Falling trend with very low opportunity — battleground (oversaturated).
  if (signals.trendSlope <= TREND_FALLING || signals.competitionIdx === 'high') {
    reasons.push('opportunity_low_competition_high_or_falling');
    return {
      role: 'battleground',
      opportunityIndex,
      reasons,
      designerEffortMultiplier: EFFORT.battleground,
    };
  }

  reasons.push('opportunity_index_low_no_overrides');
  return {
    role: 'standard',
    opportunityIndex,
    reasons,
    designerEffortMultiplier: EFFORT.standard,
  };
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

export const _internals = {
  thresholds: {
    MIN_VOLUME_FOR_CLASSIFICATION,
    OPPORTUNITY_ACE_FLOOR,
    OPPORTUNITY_NICHE_FLOOR,
    TREND_RISING,
    TREND_FALLING,
    HONEY_PROMOTION_FLOOR,
  },
  effortMultipliers: EFFORT,
};
