// src/lib/notifications/discord-builder.ts
// Kkotium Discord embed builders — 5 channels with 4-section structure:
//   1) Situation (What happened)
//   2) Impact   (So what — sales/SEO/margin effect)
//   3) Action   (Now what — concrete next steps for the seller)
//   4) Kkotti   (mascot voice — encouragement / warning / praise in cowgirl-garden tone)
//
// Design principles:
// - Every embed must answer: "What just happened? Why does it matter? What do I do next?"
// - Action items are clickable links to the exact app screen (deep links).
// - Kkotti voice: warm cowgirl-garden tone — short, supportive, occasionally playful.
// - All builders share CHANNEL_COLOR and timestamp footer for visual consistency.
//
// Korean text safety pattern (work principle #29):
// - All user-facing Korean strings live in `discord-strings.ko.json`.
// - This file contains NO Korean literals or escape sequences — only English identifiers.
// - The dictionary file is loaded once at module load and never mutated.
// - This 100% prevents jamo-corruption typos that occur when the model generates Korean escapes.

import { GRADE_EMOJI } from '@/lib/discord';
import type { DiscordChannel } from '@/lib/discord';
import STRINGS from './discord-strings.ko.json';

// ── Visual identity ──────────────────────────────────────────────────────────

const CHANNEL_COLOR: Record<DiscordChannel, number> = {
  KKOTTI_RECOMMEND: 0x9333ea, // purple — recommendation
  STOCK_ALERT:      0xf97316, // orange — out-of-stock warning
  PRICE_CHANGE:     0xeab308, // yellow — price change caution
  KKOTTI_SCORE:     0xef4444, // red    — score drop alert
  OPS_REPORT:       0x3b82f6, // blue   — weekly operations summary
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kkotium-garden.vercel.app';

// Shape of Discord embed object (fields list + meta)
type DiscordEmbed = Record<string, unknown>;
type EmbedField = { name: string; value: string; inline?: boolean };

// Helper: substitute {key} placeholders with values from a record
function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

// Helper: format a number with thousand separators
function won(n: number): string {
  return n.toLocaleString();
}

// Helper: wrap a URL in markdown link syntax for Discord
function link(label: string, path: string): string {
  return `[${label}](${APP_URL}${path})`;
}

// Helper: build a 4-section field list given each section's content
function buildFourSectionFields(sections: {
  situation: string;
  impact:    string;
  action:    string;
  kkotti:    string;
}): EmbedField[] {
  const S = STRINGS.section;
  return [
    { name: S.situation, value: sections.situation, inline: false },
    { name: S.impact,    value: sections.impact,    inline: false },
    { name: S.action,    value: sections.action,    inline: false },
    { name: S.kkotti,    value: sections.kkotti,    inline: false },
  ];
}

// ── 1. Daily recommendation (KKOTTI_RECOMMEND) ───────────────────────────────

export interface RecommendProduct {
  id?: string;
  name: string;
  score: number;
  grade: string;
  netMarginRate: number;
  supplierName?: string;
  keywords?: string[];
  volumeBoost?: number;
  isSourcing?: boolean;
}

export interface RecommendEmbedParams {
  today: string; // YYYY-MM-DD or 'M월 D일'
  top3: RecommendProduct[];
  season?: { label: string; daysLeft: number } | null;
  seasonTop2?: { name: string; score: number }[];
  trendNote?: string;
  /** Optional override for app URL — kept for backward compatibility with existing callers. */
  appUrl?: string;
}

export function buildRecommendEmbed(params: RecommendEmbedParams): DiscordEmbed {
  const S = STRINGS.recommend;
  const C = STRINGS.common;
  const RANK_EMOJI = ['1️⃣', '2️⃣', '3️⃣'];
  const top = params.top3.slice(0, 3);

  // Situation: top-3 list
  const situationLines = top.map((p, i) => {
    const tagPieces: string[] = [];
    tagPieces.push(`${GRADE_EMOJI[p.grade] ?? ''}${C.honeyScore} ${p.score}${C.ptSuffix}`);
    tagPieces.push(`${C.netMargin} ${p.netMarginRate.toFixed(1)}%`);
    if (p.volumeBoost && p.volumeBoost > 0) {
      tagPieces.push(fmt(S.tag_volumeBoost, { n: p.volumeBoost }));
    }
    if (p.isSourcing) tagPieces.push(S.tag_sourcing);
    const tags = tagPieces.join(' | ');
    const kw = (p.keywords && p.keywords.length > 0)
      ? `\n   → ${S.kw_label}: ${p.keywords.slice(0, 3).join(' · ')}`
      : '';
    const sup = p.supplierName ? `\n   → ${S.supplier_label}: ${p.supplierName}` : '';
    return `${RANK_EMOJI[i] ?? `${i + 1}.`} **${p.name}**\n   ${tags}${kw}${sup}`;
  });
  const situation = situationLines.length > 0
    ? situationLines.join('\n\n')
    : S.noProducts;

  // Impact: explain why these matter today
  const seasonNote = params.season && params.season.daysLeft <= 7
    ? fmt(S.impact_seasonNear, { label: params.season.label, days: params.season.daysLeft })
    : params.season
      ? fmt(S.impact_seasonFar, { label: params.season.label, days: params.season.daysLeft })
      : '';
  const impact = `${S.impact_base}${seasonNote}`;

  // Action: deep link to register flow
  const actionLines: string[] = [
    `1. ${link(S.action_register, '/products/new')}`,
    `2. ${link(S.action_seoCheck, '/naver-seo')}`,
  ];
  if (params.trendNote) actionLines.push(`3. ${params.trendNote}`);
  const action = actionLines.join('\n');

  // Kkotti voice
  const kkottiTail = top.length > 0
    ? fmt(S.kkotti_top, { name: top[0].name })
    : S.kkotti_empty;
  const kkotti = `${S.kkotti_intro} ${kkottiTail}`;

  // Season top-2 as auxiliary block
  const fields = buildFourSectionFields({ situation, impact, action, kkotti });
  if (params.season && params.seasonTop2 && params.seasonTop2.length > 0) {
    fields.push({
      name: fmt(S.season_extraTitle, { label: params.season.label, days: params.season.daysLeft }),
      value: params.seasonTop2.slice(0, 2).map((p, i) =>
        `${i + 1}. **${p.name}** (${C.honeyScore} ${p.score}${C.ptSuffix})`
      ).join('\n'),
      inline: false,
    });
  }

  return {
    title: fmt(S.title, { today: params.today }),
    description: fmt(S.description, { count: top.length }),
    color: CHANNEL_COLOR.KKOTTI_RECOMMEND,
    fields,
    footer: { text: S.footer },
    timestamp: new Date().toISOString(),
  };
}

// ── 2. Stock alert (STOCK_ALERT) ─────────────────────────────────────────────

export interface StockAlertProduct {
  id?: string;
  name: string;
  sku: string;
  salePrice: number;
  honeyScore: number;
  honeyGrade: string;
  netMarginRate: number;
  daysOos?: number;
  alternatives?: { alt_product_name: string; platform_code: string; platform_url?: string }[];
}

export interface StockAlertEmbedParams {
  products: StockAlertProduct[];
  estimatedDailyLossWon?: number;
}

export function buildStockAlertEmbed(params: StockAlertEmbedParams): DiscordEmbed {
  const S = STRINGS.stockAlert;
  const C = STRINGS.common;
  const list = params.products.slice(0, 5);
  const totalCount = params.products.length;

  // Situation: list of OOS products
  const situationLines = list.map((p, i) => {
    const oosLabel = p.daysOos ? ` (${fmt(S.oosLabel, { days: p.daysOos })})` : '';
    return `${i + 1}. **${p.name}**${oosLabel}\n   ${GRADE_EMOJI[p.honeyGrade] ?? ''}${C.honeyScore} ${p.honeyScore}${C.ptSuffix} | ${C.salePrice} ${won(p.salePrice)}${C.wonSuffix} | ${C.netMargin} ${p.netMarginRate.toFixed(1)}%`;
  });
  let situation = situationLines.length > 0
    ? situationLines.join('\n\n')
    : S.noItems;
  if (totalCount > list.length) {
    situation += `\n\n_${fmt(C.more, { n: totalCount - list.length })}_`;
  }

  // Impact: revenue loss
  const lossNote = params.estimatedDailyLossWon
    ? fmt(S.loss_estimate, { won: won(params.estimatedDailyLossWon) })
    : S.loss_default;
  const impact = fmt(S.impact_base, { loss: lossNote });

  // Action: 3 concrete next steps
  const actionLines = [
    `1. ${link(S.action_check, '/products?status=OUT_OF_STOCK')}`,
    `2. ${S.action_supplier}`,
    `3. ${link(S.action_alt, '/products')}`,
  ];

  // Show alternative info inline if available
  const altLines = list
    .map(p => {
      if (!p.alternatives || p.alternatives.length === 0) return null;
      const alts = p.alternatives.slice(0, 2).map(a =>
        a.platform_url
          ? `   → [${a.alt_product_name} (${a.platform_code})](${a.platform_url})`
          : `   → ${a.alt_product_name} (${a.platform_code})`
      ).join('\n');
      return `**${p.name}** →\n${alts}`;
    })
    .filter((s): s is string => s !== null);

  const action = altLines.length > 0
    ? `${actionLines.join('\n')}\n\n${S.alt_section}\n${altLines.join('\n\n')}`
    : actionLines.join('\n');

  // Kkotti voice
  const kkotti = totalCount === 1
    ? S.kkotti_one
    : fmt(S.kkotti_many, { n: totalCount });

  return {
    title: fmt(S.title, { n: totalCount }),
    description: S.description,
    color: CHANNEL_COLOR.STOCK_ALERT,
    fields: buildFourSectionFields({ situation, impact, action, kkotti }),
    footer: { text: S.footer },
    timestamp: new Date().toISOString(),
  };
}

// ── 3. Price change (PRICE_CHANGE) ───────────────────────────────────────────

export interface PriceChange {
  productId?: string;
  productName: string;
  sku: string;
  oldPrice: number;
  newPrice: number;
  changePct: number;
  oldMargin: number;
  newMargin: number;
}

export interface PriceChangeEmbedParams {
  changes: PriceChange[];
}

export function buildPriceChangeEmbed(params: PriceChangeEmbedParams): DiscordEmbed {
  const S = STRINGS.priceChange;
  const C = STRINGS.common;
  const list = params.changes.slice(0, 5);
  const totalCount = params.changes.length;

  // Situation
  const situationLines = list.map(c => {
    const isUp = c.newPrice > c.oldPrice;
    const arrow = isUp ? '🔺' : '🔻';
    const sign = isUp ? '+' : '';
    return `${arrow} **${c.productName}** (\`${c.sku}\`)\n   ${C.supplierPrice} ${won(c.oldPrice)}${C.wonSuffix} → **${won(c.newPrice)}${C.wonSuffix}** (${sign}${c.changePct.toFixed(1)}%)\n   ${C.netMargin} ${c.oldMargin.toFixed(1)}% → **${c.newMargin.toFixed(1)}%**`;
  });
  let situation = situationLines.length > 0
    ? situationLines.join('\n\n')
    : S.noItems;
  if (totalCount > list.length) {
    situation += `\n\n_${fmt(C.more, { n: totalCount - list.length })}_`;
  }

  // Impact: detect dangerous margin
  const dangerCount = list.filter(c => c.newMargin < 20).length;
  const negativeCount = list.filter(c => c.newMargin < 0).length;
  let impactHead = S.impact_safe;
  if (negativeCount > 0) {
    impactHead = fmt(S.impact_negative, { n: negativeCount });
  } else if (dangerCount > 0) {
    impactHead = fmt(S.impact_danger, { n: dangerCount });
  }
  const impact = `${impactHead}${S.impact_tail}`;

  // Action
  const actionLines = [
    `1. ${link(S.action_adjust, '/products')}`,
    `2. ${S.action_simulate}`,
    `3. ${S.action_alternative}`,
  ];
  const action = actionLines.join('\n');

  // Kkotti voice
  const kkotti = negativeCount > 0
    ? S.kkotti_negative
    : dangerCount > 0
      ? S.kkotti_danger
      : S.kkotti_safe;

  return {
    title: fmt(S.title, { n: totalCount }),
    description: S.description,
    color: CHANNEL_COLOR.PRICE_CHANGE,
    fields: buildFourSectionFields({ situation, impact, action, kkotti }),
    footer: { text: S.footer },
    timestamp: new Date().toISOString(),
  };
}

// ── 4. Score drop (KKOTTI_SCORE) ─────────────────────────────────────────────

export interface ScoreDrop {
  productId?: string;
  productName: string;
  sku: string;
  oldScore: number;
  newScore: number;
  dropAmt: number;
  reason: string;
}

export interface ScoreDropEmbedParams {
  drops: ScoreDrop[];
}

export function buildScoreDropEmbed(params: ScoreDropEmbedParams): DiscordEmbed {
  const S = STRINGS.scoreDrop;
  const C = STRINGS.common;
  const list = params.drops.slice(0, 5);
  const totalCount = params.drops.length;

  // Situation
  const situationLines = list.map(d =>
    `📉 **${d.productName}** (\`${d.sku}\`)\n   ${d.oldScore}${C.ptSuffix} → **${d.newScore}${C.ptSuffix}** (↓${d.dropAmt}${C.ptSuffix})\n   ${S.reason_label}: ${d.reason}`
  );
  let situation = situationLines.length > 0
    ? situationLines.join('\n\n')
    : S.noItems;
  if (totalCount > list.length) {
    situation += `\n\n_${fmt(C.more, { n: totalCount - list.length })}_`;
  }

  // Impact
  const impact = S.impact;

  // Action
  const actionLines = [
    `1. ${link(S.action_seo, '/naver-seo')}`,
    `2. ${S.action_token}`,
    `3. ${link(S.action_revive, '/products/reactivation')}`,
  ];
  const action = actionLines.join('\n');

  // Kkotti voice
  const kkotti = S.kkotti;

  return {
    title: fmt(S.title, { n: totalCount }),
    description: S.description,
    color: CHANNEL_COLOR.KKOTTI_SCORE,
    fields: buildFourSectionFields({ situation, impact, action, kkotti }),
    footer: { text: S.footer },
    timestamp: new Date().toISOString(),
  };
}

// ── 5. Weekly report (OPS_REPORT) ────────────────────────────────────────────

export interface WeeklyReportEmbedParams {
  weekLabel: string;
  totalProducts: number;
  activeProducts: number;
  oosProducts: number;
  newRegistered: number;
  avgHoneyScore: number;
  topProduct?: { name: string; score: number };
  noAltOosCount: number;
  priceChanges: number;
  weekRevenue?: number;
  weekOrderCount?: number;
  weekCancelCount?: number;
  weekNetProfit?: number;
}

export function buildWeeklyReportEmbed(params: WeeklyReportEmbedParams): DiscordEmbed {
  const S = STRINGS.weeklyReport;
  const p = params;
  const hasRevenue = (p.weekRevenue ?? 0) > 0;

  // Situation: factual snapshot
  const situationLines: string[] = [];
  if (hasRevenue) {
    situationLines.push(fmt(S.revenue_with, {
      won: won(p.weekRevenue ?? 0),
      orders: p.weekOrderCount ?? 0,
      cancels: p.weekCancelCount ?? 0,
    }));
    if ((p.weekNetProfit ?? 0) !== 0) {
      situationLines.push(fmt(S.profit, { won: won(p.weekNetProfit ?? 0) }));
    }
  } else {
    situationLines.push(S.revenue_zero);
  }
  situationLines.push(fmt(S.products, {
    total: p.totalProducts, active: p.activeProducts, oos: p.oosProducts,
  }));
  situationLines.push(fmt(S.stats, {
    newReg: p.newRegistered, avg: p.avgHoneyScore, price: p.priceChanges,
  }));
  if (p.topProduct) {
    situationLines.push(fmt(S.topProduct, {
      name: p.topProduct.name, score: p.topProduct.score,
    }));
  }
  const situation = situationLines.join('\n');

  // Impact: prioritized signals
  const impactPieces: string[] = [];
  if (p.noAltOosCount > 0) {
    impactPieces.push(fmt(S.warn_noAlt, { n: p.noAltOosCount }));
  }
  if (p.priceChanges >= 5) {
    impactPieces.push(S.warn_pricing);
  }
  if (p.avgHoneyScore < 50) {
    impactPieces.push(S.warn_lowAvg);
  }
  if (impactPieces.length === 0) {
    impactPieces.push(S.all_good);
  }
  const impact = impactPieces.join('\n');

  // Action: top 3 priorities for the upcoming week
  const actionItems: string[] = [];
  if (p.noAltOosCount > 0) {
    actionItems.push(fmt(S.task_alt, { n: p.noAltOosCount }));
  }
  if (p.newRegistered < 3) {
    actionItems.push(S.task_register);
  }
  if (p.avgHoneyScore < 50) {
    actionItems.push(S.task_tuning);
  }
  if (actionItems.length === 0) {
    actionItems.push(S.task_default);
  }
  const actionLines = actionItems.map((it, i) => `${i + 1}. ${it}`);
  actionLines.push(`${S.action_first.split(':')[0]}: ${link(S.action_first.split(':').slice(1).join(':').trim(), '/dashboard')}`);
  const action = actionLines.join('\n');

  // Kkotti voice
  const kkotti = hasRevenue ? S.kkotti_revenue : S.kkotti_zero;

  return {
    title: fmt(S.title, { weekLabel: p.weekLabel }),
    description: S.description,
    color: CHANNEL_COLOR.OPS_REPORT,
    fields: buildFourSectionFields({ situation, impact, action, kkotti }),
    footer: { text: S.footer },
    timestamp: new Date().toISOString(),
  };
}
