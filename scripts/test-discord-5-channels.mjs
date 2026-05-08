// scripts/test-discord-5-channels.mjs
// One-shot test: send realistic mock embeds to all 5 Discord channels.
// Run: node scripts/test-discord-5-channels.mjs
//
// Verifies each channel produces the new 4-section structure:
// (Situation / Impact / Action / Kkotti voice)
//
// Korean text safety: all strings come from src/lib/notifications/discord-strings.ko.json
// via dynamic import. This script contains zero Korean literals.

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

config({ path: '.env.local' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const STRINGS_PATH = resolve(ROOT, 'src/lib/notifications/discord-strings.ko.json');
const STRINGS = JSON.parse(readFileSync(STRINGS_PATH, 'utf-8'));

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kkotium-garden.vercel.app';

const WEBHOOKS = {
  KKOTTI_RECOMMEND: process.env.DISCORD_WEBHOOK_KKOTTI_RECOMMEND,
  STOCK_ALERT:      process.env.DISCORD_WEBHOOK_STOCK_ALERT,
  PRICE_CHANGE:     process.env.DISCORD_WEBHOOK_PRICE_CHANGE,
  KKOTTI_SCORE:     process.env.DISCORD_WEBHOOK_KKOTTI_SCORE,
  OPS_REPORT:       process.env.DISCORD_WEBHOOK_OPS_REPORT,
};

// Sender identity must match production (src/lib/discord.ts sendDiscord)
const KKOTTI_USERNAME = '\uAF2C\uB6F2'; // 꼬띠 — Korean glyphs via escape (verified safe)
const KKOTTI_AVATAR_URL = `${APP_URL}/kkotti-avatar.png`;

async function send(channel, embed) {
  const url = WEBHOOKS[channel];
  if (!url) {
    console.log(`[SKIP] ${channel} - webhook URL not set`);
    return { ok: false, error: 'no webhook url' };
  }
  const body = {
    username: KKOTTI_USERNAME,
    avatar_url: KKOTTI_AVATAR_URL,
    embeds: [embed],
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// ── Helper: format template ──────────────────────────────────────────────────

function fmt(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

function won(n) { return n.toLocaleString(); }
function link(label, path) { return `[${label}](${APP_URL}${path})`; }

const SECTION = STRINGS.section;
const COMMON = STRINGS.common;

function buildFourSectionFields(s) {
  return [
    { name: SECTION.situation, value: s.situation, inline: false },
    { name: SECTION.impact,    value: s.impact,    inline: false },
    { name: SECTION.action,    value: s.action,    inline: false },
    { name: SECTION.kkotti,    value: s.kkotti,    inline: false },
  ];
}

const GRADE_EMOJI = { S: '\uD83D\uDC9C', A: '\uD83D\uDC9A', B: '\uD83D\uDC99', C: '\uD83D\uDC9B', D: '\uD83D\uDC94' };

// ── 1. Recommendation ────────────────────────────────────────────────────────

function buildRecommendEmbed() {
  const S = STRINGS.recommend;
  const C = COMMON;
  const today = '2026-05-08 (\uD14C\uC2A4\uD2B8 \uBC1C\uC1A1)';
  const top = [
    { name: '\uBD04 \uD30C\uC2A4\uD154 \uAF43\uB2E4\uBC1C \uBBF8\uB2C8 \uBD80\uCF00', score: 87, grade: 'S', netMarginRate: 42.3, supplierName: '\uAC00\uB4E0\uD558\uC6B0\uC2A4\uCF54\uB9AC\uC544', keywords: ['\uBD04 \uBD80\uCF00', '\uBBF8\uB2C8 \uAF43\uB2E4\uBC1C', '\uD30C\uC2A4\uD154 \uAF43\uC120\uBB3C'], volumeBoost: 15 },
    { name: '\uBE48\uD2F0\uC9C0 \uB3C4\uC790\uAE30 \uAF43\uBCD1 \uB77C\uC6B4\uB4DC\uD615', score: 81, grade: 'A', netMarginRate: 38.7, supplierName: '\uB3C4\uC790\uAE30\uBA85\uAC00', keywords: ['\uBE48\uD2F0\uC9C0 \uAF43\uBCD1', '\uB3C4\uC790\uAE30 \uD654\uBCD1'] },
    { name: '\uC5D0\uC5B4\uD50C\uB79C\uD2B8 \uD589\uC789 \uAE00\uB77C\uC2A4\uBCFC \uC138\uD2B8', score: 78, grade: 'A', netMarginRate: 35.1, keywords: ['\uC5D0\uC5B4\uD50C\uB79C\uD2B8', '\uD589\uC789 \uD654\uBD84'] },
  ];
  const RANK_EMOJI = ['1\uFE0F\u20E3', '2\uFE0F\u20E3', '3\uFE0F\u20E3'];

  const situation = top.map((p, i) => {
    const tags = [
      `${GRADE_EMOJI[p.grade]}${C.honeyScore} ${p.score}${C.ptSuffix}`,
      `${C.netMargin} ${p.netMarginRate.toFixed(1)}%`,
      p.volumeBoost ? fmt(S.tag_volumeBoost, { n: p.volumeBoost }) : null,
    ].filter(Boolean).join(' | ');
    const kw = p.keywords ? `\n   \u2192 ${S.kw_label}: ${p.keywords.join(' \u00B7 ')}` : '';
    const sup = p.supplierName ? `\n   \u2192 ${S.supplier_label}: ${p.supplierName}` : '';
    return `${RANK_EMOJI[i]} **${p.name}**\n   ${tags}${kw}${sup}`;
  }).join('\n\n');

  const seasonNote = fmt(S.impact_seasonNear, { label: '\uC5B4\uBC84\uC774\uB0A0', days: 0 });
  const impact = `${S.impact_base}${seasonNote}`;

  const action = [
    `1. ${link(S.action_register, '/products/new')}`,
    `2. ${link(S.action_seoCheck, '/naver-seo')}`,
    `3. \uC2DC\uC998 \uD0A4\uC6CC\uB4DC\uB3C4 \uCD94\uAC00\uD574\uBCF4\uC138\uC694`,
  ].join('\n');

  const kkotti = `${S.kkotti_intro} ${fmt(S.kkotti_top, { name: top[0].name })}`;

  const fields = buildFourSectionFields({ situation, impact, action, kkotti });
  fields.push({
    name: fmt(S.season_extraTitle, { label: '\uC5B4\uBC84\uC774\uB0A0', days: 0 }),
    value: [
      `1. **\uCE74\uB124\uC774\uC158 \uD654\uBD84 \uC2DC\uC998 \uD55C\uC815** (${C.honeyScore} 84${C.ptSuffix})`,
      `2. **\uBD80\uBAA8\uB2D8 \uAC10\uC0AC \uAF43\uB2E4\uBC1C \uC138\uD2B8** (${C.honeyScore} 79${C.ptSuffix})`,
    ].join('\n'),
    inline: false,
  });

  return {
    title: fmt(S.title, { today }),
    description: fmt(S.description, { count: top.length }),
    color: 0x9333ea,
    fields,
    footer: { text: `${S.footer} (\uD14C\uC2A4\uD2B8)` },
    timestamp: new Date().toISOString(),
  };
}

// ── 2. Stock alert ───────────────────────────────────────────────────────────

function buildStockAlertEmbed() {
  const S = STRINGS.stockAlert;
  const C = COMMON;
  const products = [
    { name: '\uBD04 \uD30C\uC2A4\uD154 \uAF43\uB2E4\uBC1C \uBBF8\uB2C8 \uBD80\uCF00', sku: 'SKU-001', salePrice: 25000, honeyScore: 87, honeyGrade: 'A', netMarginRate: 42.3, daysOos: 3 },
    { name: '\uBE48\uD2F0\uC9C0 \uB3C4\uC790\uAE30 \uAF43\uBCD1 \uB77C\uC6B4\uB4DC\uD615', sku: 'SKU-002', salePrice: 38000, honeyScore: 81, honeyGrade: 'B', netMarginRate: 38.7, daysOos: 1 },
  ];
  const totalCount = products.length;

  const situation = products.map((p, i) => {
    const oosLabel = ` (${fmt(S.oosLabel, { days: p.daysOos })})`;
    return `${i + 1}. **${p.name}**${oosLabel}\n   ${GRADE_EMOJI[p.honeyGrade]}${C.honeyScore} ${p.honeyScore}${C.ptSuffix} | ${C.salePrice} ${won(p.salePrice)}${C.wonSuffix} | ${C.netMargin} ${p.netMarginRate.toFixed(1)}%`;
  }).join('\n\n');

  const lossNote = fmt(S.loss_estimate, { won: won(18000) });
  const impact = fmt(S.impact_base, { loss: lossNote });

  const action = [
    `1. ${link(S.action_check, '/products?status=OUT_OF_STOCK')}`,
    `2. ${S.action_supplier}`,
    `3. ${link(S.action_alt, '/products')}`,
  ].join('\n');

  const kkotti = fmt(S.kkotti_many, { n: totalCount });

  return {
    title: fmt(S.title, { n: totalCount }) + ' (\uD14C\uC2A4\uD2B8 \uBC1C\uC1A1)',
    description: S.description,
    color: 0xf97316,
    fields: buildFourSectionFields({ situation, impact, action, kkotti }),
    footer: { text: `${S.footer} (\uD14C\uC2A4\uD2B8)` },
    timestamp: new Date().toISOString(),
  };
}

// ── 3. Price change ──────────────────────────────────────────────────────────

function buildPriceChangeEmbed() {
  const S = STRINGS.priceChange;
  const C = COMMON;
  const changes = [
    { productName: '\uBD04 \uD30C\uC2A4\uD154 \uAF43\uB2E4\uBC1C \uBBF8\uB2C8 \uBD80\uCF00', sku: 'SKU-001', oldPrice: 12000, newPrice: 14500, changePct: 20.8, oldMargin: 42.3, newMargin: 28.1 },
    { productName: '\uC5D0\uC5B4\uD50C\uB79C\uD2B8 \uD589\uC789 \uAE00\uB77C\uC2A4\uBCFC \uC138\uD2B8', sku: 'SKU-003', oldPrice: 8000, newPrice: 7500, changePct: -6.3, oldMargin: 35.1, newMargin: 38.5 },
  ];
  const totalCount = changes.length;

  const situation = changes.map(c => {
    const isUp = c.newPrice > c.oldPrice;
    const arrow = isUp ? '\uD83D\uDD3A' : '\uD83D\uDD3B';
    const sign = isUp ? '+' : '';
    return `${arrow} **${c.productName}** (\`${c.sku}\`)\n   ${C.supplierPrice} ${won(c.oldPrice)}${C.wonSuffix} \u2192 **${won(c.newPrice)}${C.wonSuffix}** (${sign}${c.changePct.toFixed(1)}%)\n   ${C.netMargin} ${c.oldMargin.toFixed(1)}% \u2192 **${c.newMargin.toFixed(1)}%**`;
  }).join('\n\n');

  const dangerCount = changes.filter(c => c.newMargin < 20).length;
  const impact = `${fmt(S.impact_danger, { n: dangerCount })}${S.impact_tail}`;

  const action = [
    `1. ${link(S.action_adjust, '/products')}`,
    `2. ${S.action_simulate}`,
    `3. ${S.action_alternative}`,
  ].join('\n');

  const kkotti = S.kkotti_danger;

  return {
    title: fmt(S.title, { n: totalCount }) + ' (\uD14C\uC2A4\uD2B8 \uBC1C\uC1A1)',
    description: S.description,
    color: 0xeab308,
    fields: buildFourSectionFields({ situation, impact, action, kkotti }),
    footer: { text: `${S.footer} (\uD14C\uC2A4\uD2B8)` },
    timestamp: new Date().toISOString(),
  };
}

// ── 4. Score drop ────────────────────────────────────────────────────────────

function buildScoreDropEmbed() {
  const S = STRINGS.scoreDrop;
  const C = COMMON;
  const drops = [
    { productName: '\uBD04 \uD30C\uC2A4\uD154 \uAF43\uB2E4\uBC1C \uBBF8\uB2C8 \uBD80\uCF00', sku: 'SKU-001', oldScore: 87, newScore: 62, dropAmt: 25, reason: '\uC2E0\uC0C1\uD488 \uAC00\uC0B0\uC810 \uB9CC\uB8CC + \uD074\uB9AD\uB960 \uC800\uC870' },
    { productName: '\uBE48\uD2F0\uC9C0 \uB3C4\uC790\uAE30 \uAF43\uBCD1 \uB77C\uC6B4\uB4DC\uD615', sku: 'SKU-002', oldScore: 81, newScore: 58, dropAmt: 23, reason: '\uCE74\uD14C\uACE0\uB9AC 1\uD398\uC774\uC9C0 \uC77C\uCE58\uC728 \uD558\uB77D' },
  ];
  const totalCount = drops.length;

  const situation = drops.map(d =>
    `\uD83D\uDCC9 **${d.productName}** (\`${d.sku}\`)\n   ${d.oldScore}${C.ptSuffix} \u2192 **${d.newScore}${C.ptSuffix}** (\u2193${d.dropAmt}${C.ptSuffix})\n   ${S.reason_label}: ${d.reason}`
  ).join('\n\n');

  const impact = S.impact;

  const action = [
    `1. ${link(S.action_seo, '/naver-seo')}`,
    `2. ${S.action_token}`,
    `3. ${link(S.action_revive, '/products/reactivation')}`,
  ].join('\n');

  const kkotti = S.kkotti;

  return {
    title: fmt(S.title, { n: totalCount }) + ' (\uD14C\uC2A4\uD2B8 \uBC1C\uC1A1)',
    description: S.description,
    color: 0xef4444,
    fields: buildFourSectionFields({ situation, impact, action, kkotti }),
    footer: { text: `${S.footer} (\uD14C\uC2A4\uD2B8)` },
    timestamp: new Date().toISOString(),
  };
}

// ── 5. Weekly report ─────────────────────────────────────────────────────────

function buildWeeklyReportEmbed() {
  const S = STRINGS.weeklyReport;
  const p = {
    weekLabel: '2026-05-01 ~ 05-07 (\uD14C\uC2A4\uD2B8 \uBC1C\uC1A1)',
    totalProducts: 12, activeProducts: 9, oosProducts: 2,
    newRegistered: 3, avgHoneyScore: 71, priceChanges: 2,
    weekRevenue: 287500, weekOrderCount: 8, weekCancelCount: 1,
    weekNetProfit: 94200, noAltOosCount: 2,
    topProduct: { name: '\uBD04 \uD30C\uC2A4\uD154 \uAF43\uB2E4\uBC1C \uBBF8\uB2C8 \uBD80\uCF00', score: 87 },
  };

  const situation = [
    fmt(S.revenue_with, { won: won(p.weekRevenue), orders: p.weekOrderCount, cancels: p.weekCancelCount }),
    fmt(S.profit, { won: won(p.weekNetProfit) }),
    fmt(S.products, { total: p.totalProducts, active: p.activeProducts, oos: p.oosProducts }),
    fmt(S.stats, { newReg: p.newRegistered, avg: p.avgHoneyScore, price: p.priceChanges }),
    fmt(S.topProduct, { name: p.topProduct.name, score: p.topProduct.score }),
  ].join('\n');

  const impact = [
    fmt(S.warn_noAlt, { n: p.noAltOosCount }),
    S.warn_pricing,
  ].join('\n');

  const action = [
    `1. ${fmt(S.task_alt, { n: p.noAltOosCount })}`,
    `2. ${S.task_register}`,
    `${S.action_first.split(':')[0]}: ${link(S.action_first.split(':').slice(1).join(':').trim(), '/dashboard')}`,
  ].join('\n');

  const kkotti = S.kkotti_revenue;

  return {
    title: fmt(S.title, { weekLabel: p.weekLabel }),
    description: S.description,
    color: 0x3b82f6,
    fields: buildFourSectionFields({ situation, impact, action, kkotti }),
    footer: { text: `${S.footer} (\uD14C\uC2A4\uD2B8)` },
    timestamp: new Date().toISOString(),
  };
}

// ── Run ──────────────────────────────────────────────────────────────────────

console.log('=== Discord 5 channels test send ===\n');

const tasks = [
  ['KKOTTI_RECOMMEND', buildRecommendEmbed()],
  ['STOCK_ALERT',      buildStockAlertEmbed()],
  ['PRICE_CHANGE',     buildPriceChangeEmbed()],
  ['KKOTTI_SCORE',     buildScoreDropEmbed()],
  ['OPS_REPORT',       buildWeeklyReportEmbed()],
];

for (const [channel, embed] of tasks) {
  process.stdout.write(`[${channel.padEnd(18)}] sending... `);
  const r = await send(channel, embed);
  if (r.ok) console.log(`OK HTTP ${r.status}`);
  else console.log(`FAIL ${r.error || r.status}`);
}

console.log('\n=== Done ===');
console.log('Check Discord app for 5 messages with new 4-section structure.');
