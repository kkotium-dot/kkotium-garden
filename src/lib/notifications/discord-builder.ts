// src/lib/notifications/discord-builder.ts
// Kkotium Discord embed builders — 5 channels with 4-section structure:
//   1) Situation (What happened)
//   2) Impact   (So what — sales/SEO/margin effect)
//   3) Action   (Now what — concrete next steps for the seller)
//   4) Kkotti   (mascot voice — encouragement / warning / praise in cowgirl-garden tone)
//
// Sprint 6-D extension (2026-05-08): KKOTTI_RECOMMEND now supports 4-mode structure:
//   1. CURRENT_HOT    — sales-explosion categories
//   2. SEASONAL_AHEAD — seasonal D-30 lead time
//   3. NICHE_BLUE     — low competition + decent margin
//   4. STORE_FIT      — seller's category strengths
// Legacy buildRecommendEmbed retained for backward compatibility (cron/test scripts).
//
// Korean text safety pattern (work principle #29 + #35):
// - All user-facing Korean strings live in `discord-strings.ko.json`.
// - This file contains NO Korean literals or escape sequences — only English identifiers.

import { GRADE_EMOJI } from '@/lib/discord';
import type { DiscordChannel } from '@/lib/discord';
import STRINGS from './discord-strings.ko.json';
import type { FourModeResult, ModeResult } from '@/lib/recommendation-modes';
import { recoTypeSummary, type RecoTypeTag } from '@/lib/naver/recommendation-type';
import { pickVariant, seasonalGreeting, isUrgentAlert } from './kkotti-variation';

/** 꼬띠 한마디 조립: 상황별 후보(층1+3, seedKey로 순환) + 가끔 붙는 날짜/계절
 *  인사(층2). 모든 kkotti_* 라인이 이 함수를 거쳐 매일 다른 문구가 나가게 한다. */
function kkottiLine(candidates: readonly string[], seedKey: string): string {
  return pickVariant(candidates, seedKey) + seasonalGreeting(seedKey, new Date(), isUrgentAlert(seedKey));
}

// ── Visual identity ──────────────────────────────────────────────────────────

const CHANNEL_COLOR: Record<DiscordChannel, number> = {
  KKOTTI_RECOMMEND: 0x9333ea, // purple — recommendation
  STOCK_ALERT:      0xf97316, // orange — out-of-stock warning
  PRICE_CHANGE:     0xeab308, // yellow — price change caution
  KKOTTI_SCORE:     0xef4444, // red    — score drop alert
  OPS_REPORT:       0x3b82f6, // blue   — weekly operations summary
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kkotium-garden.vercel.app';

type DiscordEmbed = Record<string, unknown>;
type EmbedField = { name: string; value: string; inline?: boolean };

function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

function won(n: number): string {
  return n.toLocaleString();
}

function link(label: string, path: string): string {
  return `[${label}](${APP_URL}${path})`;
}

/**
 * Seller-language label for the keyword-volume ranking boost (#258 — the raw
 * "+{n}" internal score delta read as alien jargon; sellers care about the
 * competition tier, not the point value). Tiers mirror the boost values
 * assigned in daily-signals.ts computeRecommendation (5 / 3 / 1).
 */
function volumeBoostLabel(n: number): string {
  const S = STRINGS.recommend;
  if (n >= 5) return S.tag_volumeBoost_sweet;
  if (n >= 3) return S.tag_volumeBoost_niche;
  return S.tag_volumeBoost_crowded;
}

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

// ── 0. ADHD compact alert (operational events, #250 §3) ─────────────────────
// A scannable one-glance format for real-time operational alerts (distinct from
// the 4-section digest embeds below): tier-tagged title / →action / 🌷kkotti /
// [앱에서 열기] deep link. Priority tier: 🔴 realtime vs 🟢 morning digest.

export type AlertTier = 'realtime' | 'digest';

export interface AdhdAlertParams {
  tier: AlertTier;
  channel: DiscordChannel;
  /** Situation emoji (e.g. 🔴🟠🟡🏆💎🗓️) prefixed to the title. */
  emoji?: string;
  title: string;
  /** One-line concrete next step. */
  action: string;
  /** One-line mascot voice. */
  kkotti: string;
  /** In-app deep link target. */
  deepLink?: { label?: string; path: string };
  /** Optional extra situation lines shown above the action. */
  extraLines?: string[];
}

export function buildAdhdAlert(params: AdhdAlertParams): DiscordEmbed {
  const A = STRINGS.adhd;
  const tierTag = params.tier === 'realtime' ? A.tierRealtime : A.tierDigest;
  const emoji = params.emoji ? `${params.emoji} ` : '';
  const lines: string[] = [
    ...(params.extraLines ?? []),
    `${A.actionArrow} ${params.action}`,
    `${A.kkottiPrefix} ${params.kkotti}`,
  ];
  if (params.deepLink) {
    lines.push(link(params.deepLink.label ?? A.openApp, params.deepLink.path));
  }
  return {
    title: `${tierTag} ${emoji}${params.title}`,
    description: lines.join('\n'),
    color: CHANNEL_COLOR[params.channel],
    footer: { text: A.footer },
    timestamp: new Date().toISOString(),
  };
}

// ── 0b. Operational-event digests (#250 §2) — built on buildAdhdAlert ────────
// Each maps a computed signal set to its channel with the repurposed routing:
//   publish-ready → KKOTTI_RECOMMEND · revival/zombie → KKOTTI_SCORE · margin → PRICE_CHANGE

function digestExtraLines(names: string[]): string[] {
  const shown = names.slice(0, 5).map((n) => `• ${n}`);
  if (names.length > 5) shown.push(`_${fmt(STRINGS.common.more, { n: names.length - 5 })}_`);
  return shown;
}

/** 발행 준비 완료 → KKOTTI_RECOMMEND (green digest). */
export function buildPublishReadyAlert(names: string[]): DiscordEmbed {
  const O = STRINGS.ops;
  return buildAdhdAlert({
    tier: 'digest', channel: 'KKOTTI_RECOMMEND', emoji: '✅',
    title: fmt(O.publishReady_title, { name: names.length === 1 ? names[0] : `${names.length}건` }),
    action: O.publishReady_action,
    kkotti: kkottiLine(O.publishReady_kkotti, 'ops:publishReady'),
    deepLink: { path: '/products' },
    extraLines: names.length > 1 ? digestExtraLines(names) : undefined,
  });
}

/** 부활 후보(S/A) → KKOTTI_SCORE (green digest). */
export function buildRevivalAlert(names: string[]): DiscordEmbed {
  const O = STRINGS.ops;
  return buildAdhdAlert({
    tier: 'digest', channel: 'KKOTTI_SCORE', emoji: '🌱',
    title: fmt(O.revival_title, { n: names.length }),
    action: O.revival_action,
    kkotti: kkottiLine(O.revival_kkotti, 'ops:revival'),
    deepLink: { path: '/products/reactivation' },
    extraLines: digestExtraLines(names),
  });
}

/** 좀비(30일+ 무판매) → KKOTTI_SCORE (green digest). */
export function buildZombieAlert(names: string[]): DiscordEmbed {
  const O = STRINGS.ops;
  return buildAdhdAlert({
    tier: 'digest', channel: 'KKOTTI_SCORE', emoji: '🥀',
    title: fmt(O.zombie_title, { n: names.length }),
    action: O.zombie_action,
    kkotti: kkottiLine(O.zombie_kkotti, 'ops:zombie'),
    deepLink: { path: '/products/reactivation' },
    extraLines: digestExtraLines(names),
  });
}

/**
 * 좀비 감지(#256 P4-4, 튜닝 필요도 지수) → KKOTTI_SCORE (red realtime), 상품별
 * 개별 임베드. buildZombieAlert(디지스트 이름 목록)와 달리 근거+마진+수정
 * 바로가기 딥링크까지 담아 "좀비 출현! 지금 부활 시 마진 00%·[수정 바로가기]"
 * 포맷을 낸다. buildAdhdAlert 재사용(#252), 신규 인프라 0.
 */
export function buildZombieDetectedAlert(item: { name: string; productId: string; marginPct: number; reason: string }): DiscordEmbed {
  const O = STRINGS.ops;
  return buildAdhdAlert({
    tier: 'realtime', channel: 'KKOTTI_SCORE', emoji: '🧟',
    title: fmt(O.zombieDetected_title, { name: item.name }),
    action: fmt(O.zombieDetected_action, { reason: item.reason, margin: item.marginPct.toFixed(1) }),
    kkotti: kkottiLine(O.zombieDetected_kkotti, `ops:zombieDetected:${item.productId}`),
    deepLink: { label: O.zombieDetected_editLabel, path: `/products/new?edit=${item.productId}` },
  });
}

/** 마진 경고(임계 이하) → PRICE_CHANGE (red realtime). */
export function buildMarginWarnAlert(items: { name: string; margin: number }[]): DiscordEmbed {
  const O = STRINGS.ops;
  const lines = items.slice(0, 5).map((i) => `• ${i.name} (${STRINGS.common.netMargin} ${i.margin.toFixed(1)}%)`);
  if (items.length > 5) lines.push(`_${fmt(STRINGS.common.more, { n: items.length - 5 })}_`);
  return buildAdhdAlert({
    tier: 'realtime', channel: 'PRICE_CHANGE', emoji: '⚠️',
    title: fmt(O.margin_title, { n: items.length }),
    action: O.margin_action,
    kkotti: kkottiLine(O.margin_kkotti, 'ops:margin'),
    deepLink: { path: '/products' },
    extraLines: lines,
  });
}

// ── 1. Daily recommendation (KKOTTI_RECOMMEND) — Legacy single-mode ─────────

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
  // #250 §3: 꼬띠 추천 유형 태그 (황금🏆/니치💎/시즌🗓️) — resolved by the caller.
  recoType?: RecoTypeTag | null;
}

export interface RecommendEmbedParams {
  today: string;
  top3: RecommendProduct[];
  season?: { label: string; daysLeft: number } | null;
  seasonTop2?: { name: string; score: number }[];
  trendNote?: string;
  appUrl?: string;
}

/**
 * Legacy single-mode embed (kept for backward compatibility with cron + test scripts).
 * For the new 4-mode flow, prefer `buildFourModeRecommendEmbed`.
 */
export function buildRecommendEmbed(params: RecommendEmbedParams): DiscordEmbed {
  const S = STRINGS.recommend;
  const C = STRINGS.common;
  const RANK_EMOJI = ['1️⃣', '2️⃣', '3️⃣'];
  const top = params.top3.slice(0, 3);

  const situationLines = top.map((p, i) => {
    const tagPieces: string[] = [];
    tagPieces.push(`${GRADE_EMOJI[p.grade] ?? ''}${C.honeyScore} ${p.score}${C.ptSuffix}`);
    tagPieces.push(`${C.netMargin} ${p.netMarginRate.toFixed(1)}%`);
    if (p.volumeBoost && p.volumeBoost > 0) {
      tagPieces.push(volumeBoostLabel(p.volumeBoost));
    }
    if (p.isSourcing) tagPieces.push(S.tag_sourcing);
    const tags = tagPieces.join(' | ');
    const kw = (p.keywords && p.keywords.length > 0)
      ? `\n   → ${S.kw_label}: ${p.keywords.slice(0, 3).join(' · ')}`
      : '';
    const sup = p.supplierName ? `\n   → ${S.supplier_label}: ${p.supplierName}` : '';
    const typeTag = p.recoType ? `${p.recoType.emoji} ${p.recoType.label} ` : '';
    return `${RANK_EMOJI[i] ?? `${i + 1}.`} ${typeTag}**${p.name}**\n   ${tags}${kw}${sup}`;
  });
  const typeSummary = recoTypeSummary(top.map((p) => p.recoType));
  const situation = (typeSummary ? `${typeSummary}\n\n` : '') + (situationLines.length > 0
    ? situationLines.join('\n\n')
    : S.noProducts);

  const seasonNote = params.season && params.season.daysLeft <= 7
    ? fmt(S.impact_seasonNear, { label: params.season.label, days: params.season.daysLeft })
    : params.season
      ? fmt(S.impact_seasonFar, { label: params.season.label, days: params.season.daysLeft })
      : '';
  const impact = `${S.impact_base}${seasonNote}`;

  // #258 — build the item list first, then number it, so a missing trendNote
  // never leaves a dangling empty numbered line.
  const actionItemsRec: string[] = [
    link(S.action_register, '/products/new'),
    link(S.action_seoCheck, '/naver-seo'),
  ];
  if (params.trendNote) actionItemsRec.push(params.trendNote);
  const action = actionItemsRec.map((it, i) => `${i + 1}. ${it}`).join('\n');

  const kkottiTail = top.length > 0
    ? fmt(pickVariant(S.kkotti_top, 'recommend:top'), { name: top[0].name })
    : pickVariant(S.kkotti_empty, 'recommend:empty');
  const kkotti = `${pickVariant(S.kkotti_intro, 'recommend:intro')} ${kkottiTail}${seasonalGreeting('recommend', new Date(), isUrgentAlert('recommend'))}`;

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

// ── 1b. Daily recommendation 4-MODE (Sprint 6-D foundation) ─────────────────

export interface FourModeEmbedParams {
  today: string;
  result: FourModeResult;
}

/**
 * Build a Discord embed showing all 4 recommendation modes side-by-side.
 * Each mode becomes one field in the Situation section, keeping the 4-section
 * outer structure (Situation / Impact / Action / Kkotti) consistent with other channels.
 */
export function buildFourModeRecommendEmbed(params: FourModeEmbedParams): DiscordEmbed {
  const S = STRINGS.recommend;
  const M = STRINGS.modes;
  const C = STRINGS.common;
  const result = params.result;

  // Situation: per-mode summary lines (concat into single string for uniformity)
  const situationLines: string[] = [];
  for (const m of result.modes) {
    const dictKey = modeDictKey(m.mode);
    const meta = M[dictKey];
    const title = m.contextNote
      ? fmt(meta.sectionTitle, { context: m.contextNote })
      : meta.sectionTitle;
    situationLines.push(`**${title}**`);

    if (m.items.length === 0) {
      situationLines.push(`_${meta.emptyNote}_`);
    } else {
      m.items.forEach((opp, i) => {
        const margin = opp.estimatedMargin.toFixed(0);
        const rt = (opp as { recoType?: RecoTypeTag | null }).recoType;
        const typeTag = rt ? `${rt.emoji} ${rt.label} ` : '';
        situationLines.push(
          `${i + 1}. ${typeTag}**${opp.keyword}** — ${C.netMargin} ${margin}% / 경쟁 ${opp.competition} / ${opp.monthlySearchVolume.toLocaleString()}회/월`
        );
      });
    }
    situationLines.push('');
  }
  // #250 §3: type summary across all modes' items.
  const allTags = result.modes.flatMap((m) =>
    m.items.map((opp) => (opp as { recoType?: RecoTypeTag | null }).recoType),
  );
  const typeSummary = recoTypeSummary(allTags);
  const situation = (typeSummary ? `${typeSummary}\n\n` : '') + (situationLines.join('\n').trim() || S.noProducts);

  // Impact: collapse seasonal context if present
  let impact = S.impact_base;
  const seasonalMode = result.modes.find(m => m.mode === 'SEASONAL_AHEAD');
  if (seasonalMode && seasonalMode.contextNote && seasonalMode.items.length > 0) {
    const match = /D-(\d+)/.exec(seasonalMode.contextNote);
    const days = match ? parseInt(match[1], 10) : 30;
    const label = seasonalMode.contextNote.split(' ')[0];
    impact += days <= 7
      ? fmt(S.impact_seasonNear, { label, days })
      : fmt(S.impact_seasonFar, { label, days });
  }

  // Action
  const action = [
    `1. ${link(S.action_register, '/products/new')}`,
    `2. ${link(S.action_seoCheck, '/naver-seo')}`,
  ].join('\n');

  // Kkotti voice — speak to the strongest mode's first item
  const strongMode = result.modes.find(m => m.items.length > 0);
  const kkottiTail = strongMode
    ? fmt(pickVariant(S.kkotti_top, 'recommend4:top'), { name: strongMode.items[0].keyword })
    : pickVariant(S.kkotti_empty, 'recommend4:empty');
  const kkotti = `${pickVariant(S.kkotti_intro, 'recommend4:intro')} ${kkottiTail}${seasonalGreeting('recommend4', new Date(), isUrgentAlert('recommend4'))}`;

  return {
    title: fmt(S.title, { today: params.today }),
    description: S.description,
    color: CHANNEL_COLOR.KKOTTI_RECOMMEND,
    fields: buildFourSectionFields({ situation, impact, action, kkotti }),
    footer: { text: S.footer },
    timestamp: new Date().toISOString(),
  };
}

// Internal: map RecommendationMode to the dict key in discord-strings.ko.json
function modeDictKey(mode: ModeResult['mode']): 'currentHot' | 'seasonalAhead' | 'nicheBlue' | 'storeFit' {
  switch (mode) {
    case 'CURRENT_HOT':    return 'currentHot';
    case 'SEASONAL_AHEAD': return 'seasonalAhead';
    case 'NICHE_BLUE':     return 'nicheBlue';
    case 'STORE_FIT':      return 'storeFit';
  }
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

  const lossNote = params.estimatedDailyLossWon
    ? fmt(S.loss_estimate, { won: won(params.estimatedDailyLossWon) })
    : S.loss_default;
  const impact = fmt(S.impact_base, { loss: lossNote });

  const actionLines = [
    `1. ${link(S.action_check, '/products?status=OUT_OF_STOCK')}`,
    `2. ${S.action_supplier}`,
    `3. ${link(S.action_alt, '/products')}`,
  ];

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

  const kkotti = totalCount === 1
    ? kkottiLine(S.kkotti_one, 'stockAlert:one')
    : fmt(pickVariant(S.kkotti_many, 'stockAlert:many'), { n: totalCount }) + seasonalGreeting('stockAlert:many', new Date(), isUrgentAlert('stockAlert:many'));

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

  const dangerCount = list.filter(c => c.newMargin < 20).length;
  const negativeCount = list.filter(c => c.newMargin < 0).length;
  let impactHead = S.impact_safe;
  if (negativeCount > 0) {
    impactHead = fmt(S.impact_negative, { n: negativeCount });
  } else if (dangerCount > 0) {
    impactHead = fmt(S.impact_danger, { n: dangerCount });
  }
  const impact = `${impactHead}${S.impact_tail}`;

  const actionLines = [
    `1. ${link(S.action_adjust, '/products')}`,
    `2. ${S.action_simulate}`,
    `3. ${S.action_alternative}`,
  ];
  const action = actionLines.join('\n');

  const kkotti = negativeCount > 0
    ? kkottiLine(S.kkotti_negative, 'priceChange:negative')
    : dangerCount > 0
      ? kkottiLine(S.kkotti_danger, 'priceChange:danger')
      : kkottiLine(S.kkotti_safe, 'priceChange:safe');

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

  const situationLines = list.map(d =>
    `📉 **${d.productName}** (\`${d.sku}\`)\n   ${d.oldScore}${C.ptSuffix} → **${d.newScore}${C.ptSuffix}** (↓${d.dropAmt}${C.ptSuffix})\n   ${S.reason_label}: ${d.reason}`
  );
  let situation = situationLines.length > 0
    ? situationLines.join('\n\n')
    : S.noItems;
  if (totalCount > list.length) {
    situation += `\n\n_${fmt(C.more, { n: totalCount - list.length })}_`;
  }

  const impact = S.impact;

  const actionLines = [
    `1. ${link(S.action_seo, '/naver-seo')}`,
    `2. ${S.action_token}`,
    `3. ${link(S.action_revive, '/products/reactivation')}`,
  ];
  const action = actionLines.join('\n');

  const kkotti = kkottiLine(S.kkotti, 'scoreDrop');

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
  /** Whether avgHoneyScore was actually computed from eligible products (false = no eligible product had both salePrice + supplierPrice set). Defaults true for older callers. */
  avgHoneyScoreComputed?: boolean;
  /** Count of active products actually scoring below 50 — drives the dynamic tuning task count (#258, replaces a hardcoded "5개"). */
  lowScoreCount?: number;
}

export function buildWeeklyReportEmbed(params: WeeklyReportEmbedParams): DiscordEmbed {
  const S = STRINGS.weeklyReport;
  const p = params;
  const hasRevenue = (p.weekRevenue ?? 0) > 0;
  const scoreComputed = p.avgHoneyScoreComputed ?? true;
  const lowAvg = scoreComputed && p.avgHoneyScore < 50;

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
  // #258 — "판매중 0개" alone reads as broken when most products are simply
  // not published yet. Derived from the same counts already reported, so
  // every existing caller gets this for free (no new required param).
  const pendingProducts = Math.max(0, p.totalProducts - p.activeProducts - p.oosProducts);
  situationLines.push(fmt(S.products, {
    total: p.totalProducts, active: p.activeProducts, pending: pendingProducts, oos: p.oosProducts,
  }));
  situationLines.push(scoreComputed
    ? fmt(S.stats, { newReg: p.newRegistered, avg: p.avgHoneyScore, price: p.priceChanges })
    : fmt(S.stats_pending, { newReg: p.newRegistered, price: p.priceChanges }));
  if (p.topProduct) {
    situationLines.push(fmt(S.topProduct, {
      name: p.topProduct.name, score: p.topProduct.score,
    }));
  }
  const situation = situationLines.join('\n');

  const impactPieces: string[] = [];
  if (p.noAltOosCount > 0) {
    impactPieces.push(fmt(S.warn_noAlt, { n: p.noAltOosCount }));
  }
  if (p.priceChanges >= 5) {
    impactPieces.push(S.warn_pricing);
  }
  if (lowAvg) {
    impactPieces.push(S.warn_lowAvg);
  }
  if (impactPieces.length === 0) {
    impactPieces.push(S.all_good);
  }
  const impact = impactPieces.join('\n');

  const actionItems: string[] = [];
  if (p.noAltOosCount > 0) {
    actionItems.push(fmt(S.task_alt, { n: p.noAltOosCount }));
  }
  if (p.newRegistered < 3) {
    actionItems.push(S.task_register);
  }
  if (lowAvg) {
    actionItems.push(fmt(S.task_tuning, { n: p.lowScoreCount ?? 0 }));
  }
  if (actionItems.length === 0) {
    actionItems.push(S.task_default);
  }
  const actionLines = actionItems.map((it, i) => `${i + 1}. ${it}`);
  actionLines.push(`${S.action_first.split(':')[0]}: ${link(S.action_first.split(':').slice(1).join(':').trim(), '/dashboard')}`);
  const action = actionLines.join('\n');

  const kkotti = hasRevenue
    ? kkottiLine(S.kkotti_revenue, 'weeklyReport:revenue')
    : kkottiLine(S.kkotti_zero, 'weeklyReport:zero');

  return {
    title: fmt(S.title, { weekLabel: p.weekLabel }),
    description: S.description,
    color: CHANNEL_COLOR.OPS_REPORT,
    fields: buildFourSectionFields({ situation, impact, action, kkotti }),
    footer: { text: S.footer },
    timestamp: new Date().toISOString(),
  };
}
