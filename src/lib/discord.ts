// src/lib/discord.ts
// Centralised Discord webhook client for all Kkotium alert channels
// All channels, message builders, and helpers in one place

export const DISCORD_WEBHOOKS = {
  /** #🌸꼬띠-오늘추천 — daily recommendation 08:00 KST */
  KKOTTI_RECOMMEND: process.env.DISCORD_WEBHOOK_KKOTTI_RECOMMEND ?? '',
  /** #📦재고-알림 — out-of-stock / restock alerts */
  STOCK_ALERT:      process.env.DISCORD_WEBHOOK_STOCK_ALERT ?? '',
  /** #💰가격-변동 — supplier price change */
  PRICE_CHANGE:     process.env.DISCORD_WEBHOOK_PRICE_CHANGE ?? '',
  /** #📉꼬띠-점수급락 — honey score drop ≥20 pts */
  KKOTTI_SCORE:     process.env.DISCORD_WEBHOOK_KKOTTI_SCORE ?? '',
  /** #📊운영-리포트 — weekly ops summary Monday 08:00 KST */
  OPS_REPORT:       process.env.DISCORD_WEBHOOK_OPS_REPORT ?? '',
};

export type DiscordChannel = keyof typeof DISCORD_WEBHOOKS;

// Kkotti avatar
const KKOTTI_AVATAR =
  `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://kkotium.vercel.app'}/kkotti-avatar.png`;

// ── Season detector ────────────────────────────────────────────────────────────
export function getSeasonContext(): { label: string; daysLeft: number; words: string[] } | null {
  const now = new Date();
  const EVENTS = [
    { month: 2,  day: 14, label: '발렌타인데이',  words: ['주를릿', '발렌타인', '선물', '포장'] },
    { month: 3,  day: 14, label: '화이트데이',    words: ['사탕', '화이트', '선물', '포장'] },
    { month: 5,  day: 5,  label: '어린이날',      words: ['장난감', '어린이', '선물', '놀이'] },
    { month: 5,  day: 8,  label: '어버이날',      words: ['카네이션', '선물', '부모님'] },
    { month: 11, day: 11, label: '빼빼로데이',    words: ['빼빼로', '과자', '선물', '포장'] },
    { month: 12, day: 25, label: '크리스마스',    words: ['크리스마스', '산타', '선물', '트리'] },
  ];
  for (const ev of EVENTS) {
    const target = new Date(now.getFullYear(), ev.month - 1, ev.day);
    const diff = Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
    if (diff >= 0 && diff <= 30) return { label: ev.label, daysLeft: diff, words: ev.words };
  }
  return null;
}

export const GRADE_EMOJI: Record<string, string> = {
  S: ':purple_heart:',
  A: ':green_heart:',
  B: ':blue_heart:',
  C: ':yellow_heart:',
  D: ':broken_heart:',
};

// Discord embed color by channel type
const CHANNEL_COLOR: Record<DiscordChannel, number> = {
  KKOTTI_RECOMMEND: 0x9333ea, // purple
  STOCK_ALERT:      0xf97316, // orange
  PRICE_CHANGE:     0xeab308, // yellow
  KKOTTI_SCORE:     0xef4444, // red
  OPS_REPORT:       0x3b82f6, // blue
};

// ── Core sender ──────────────────────────────────────────────────────────────
export async function sendDiscord(
  channel: DiscordChannel,
  content: string,
  embeds?: Record<string, unknown>[]
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const url = DISCORD_WEBHOOKS[channel];
  if (!url) return { ok: false, error: `No webhook URL for channel ${channel}` };

  try {
    const body: Record<string, unknown> = {
      username:   '꼬띠',
      avatar_url: KKOTTI_AVATAR,
    };
    if (embeds && embeds.length > 0) body.embeds = embeds;
    else body.content = content;

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

// ── Embed builders ────────────────────────────────────────────────────────────

/** #🌸꼬띠-오늘추천 embed */
export function buildRecommendEmbed(params: {
  today: string;
  top3: { name: string; score: number; grade: string; netMarginRate: number; supplierName?: string }[];
  season?: { label: string; daysLeft: number } | null;
  seasonTop2?: { name: string; score: number }[];
  appUrl?: string;
  trendNote?: string;
}): Record<string, unknown> {
  const fields: Record<string, unknown>[] = params.top3.map((p, i) => ({
    name: `${['1️⃣', '2️⃣', '3️⃣'][i]} ${p.name}`,
    value: [
      `${GRADE_EMOJI[p.grade] ?? ''} 꿀통지수 **${p.score}점** | 순마진 ${p.netMarginRate.toFixed(1)}%`,
      p.supplierName ? `공급사: ${p.supplierName}` : null,
    ].filter(Boolean).join('\n'),
    inline: false,
  }));

  if (params.season && (params.seasonTop2?.length ?? 0) > 0) {
    fields.push({
      name: `📅 시즌 추천 — ${params.season.label} D-${params.season.daysLeft}`,
      value: params.seasonTop2!.map((p, i) =>
        `${i + 4}. **${p.name}** (꿀통 ${p.score}점)`).join('\n'),
      inline: false,
    });
  }

  return {
    title: `🌸 꼬띠 오늘의 추천 — ${params.today}`,
    description: `오늘 등록하기 좋은 꿀통 상품 TOP 3입니다!\n[앱에서 바로 등록](${params.appUrl ?? 'http://localhost:3000'}/products/new)${params.trendNote ?? ''}`,
    color: CHANNEL_COLOR.KKOTTI_RECOMMEND,
    fields,
    footer: { text: '꽃티움 가든 · 꼬띠' },
    timestamp: new Date().toISOString(),
  };
}

/** #📦재고-알림 embed */
export function buildStockAlertEmbed(params: {
  products: {
    name: string;
    sku: string;
    salePrice: number;
    honeyScore: number;
    honeyGrade: string;
    netMarginRate: number;
    daysOos?: number;
    alternatives?: { alt_product_name: string; platform_code: string; platform_url?: string }[];
  }[];
}): Record<string, unknown> {
  const fields = params.products.slice(0, 15).map(p => {
    const altLines = p.alternatives?.length
      ? p.alternatives.map((a, i) => `${i + 1}. ${a.alt_product_name} (${a.platform_code})${a.platform_url ? ` — [보기](${a.platform_url})` : ''}`).join('\n')
      : '⚠️ 대체상품 미등록';

    return {
      name: `📦 ${p.name}${p.daysOos ? ` — ${p.daysOos}일째 품절` : ''}`,
      value: [
        `SKU: \`${p.sku}\` | 판매가: **${p.salePrice.toLocaleString()}원**`,
        `${GRADE_EMOJI[p.honeyGrade] ?? ''} 꿀통 **${p.honeyScore}점** | 순마진 ${p.netMarginRate.toFixed(1)}%`,
        `**대체상품:**\n${altLines}`,
      ].join('\n'),
      inline: false,
    };
  });

  return {
    title: `:warning: 품절 감지 — ${params.products.length}개 상품`,
    description: '다음 상품이 품절되었어요. 빠른 조치가 필요합니다!',
    color: CHANNEL_COLOR.STOCK_ALERT,
    fields,
    footer: { text: '꽃티움 가든 · 재고모니터' },
    timestamp: new Date().toISOString(),
  };
}

/** #💰가격-변동 embed */
export function buildPriceChangeEmbed(params: {
  changes: {
    productName: string;
    sku: string;
    oldPrice: number;
    newPrice: number;
    changePct: number;
    oldMargin: number;
    newMargin: number;
  }[];
}): Record<string, unknown> {
  const fields = params.changes.slice(0, 10).map(c => {
    const isUp = c.newPrice > c.oldPrice;
    const arrow = isUp ? '🔺' : '🔻';
    return {
      name: `${arrow} ${c.productName}`,
      value: [
        `SKU: \`${c.sku}\``,
        `공급가: ${c.oldPrice.toLocaleString()}원 → **${c.newPrice.toLocaleString()}원** (${isUp ? '+' : ''}${c.changePct.toFixed(1)}%)`,
        `순마진: ${c.oldMargin.toFixed(1)}% → **${c.newMargin.toFixed(1)}%**${c.newMargin < 20 ? ' :rotating_light: 위험' : ''}`,
      ].join('\n'),
      inline: false,
    };
  });

  return {
    title: `:money_with_wings: 공급가 변동 감지 — ${params.changes.length}개 상품`,
    description: '공급사 가격이 변동되었어요. 마진율을 확인해주세요!',
    color: CHANNEL_COLOR.PRICE_CHANGE,
    fields,
    footer: { text: '꽃티움 가든 · 가격모니터' },
    timestamp: new Date().toISOString(),
  };
}

/** #📉꼬띠-점수급락 embed */
export function buildScoreDropEmbed(params: {
  drops: {
    productName: string;
    sku: string;
    oldScore: number;
    newScore: number;
    dropAmt: number;
    reason: string;
  }[];
}): Record<string, unknown> {
  const fields = params.drops.slice(0, 10).map(d => ({
    name: `:chart_with_downwards_trend: ${d.productName}`,
    value: [
      `SKU: \`${d.sku}\``,
      `점수: **${d.oldScore}점** → **${d.newScore}점** (↓${d.dropAmt}점)`,
      `원인: ${d.reason}`,
    ].join('\n'),
    inline: false,
  }));

  return {
    title: `:warning: 꼬띠 점수 급락 알림`,
    description: `아래 상품들의 꿀통지수가 **20점 이상** 하락했어요!`,
    color: CHANNEL_COLOR.KKOTTI_SCORE,
    fields,
    footer: { text: '꽃티움 가든 · 꼬띠' },
    timestamp: new Date().toISOString(),
  };
}

/** #📊운영-리포트 embed (weekly) */
export function buildWeeklyReportEmbed(params: {
  weekLabel: string;
  totalProducts: number;
  activeProducts: number;
  oosProducts: number;
  newRegistered: number;
  avgHoneyScore: number;
  topProduct?: { name: string; score: number };
  noAltOosCount: number;
  priceChanges: number;
}): Record<string, unknown> {
  const p = params;
  return {
    title: `:bar_chart: 주간 운영 리포트 — ${p.weekLabel}`,
    description: '지난 7일간 스마트스토어 운영 요약입니다.',
    color: CHANNEL_COLOR.OPS_REPORT,
    fields: [
      { name: '현황', value: `전체 ${p.totalProducts}개 | 판매중 ${p.activeProducts}개 | 품절 ${p.oosProducts}개`, inline: false },
      { name: '신규 등록', value: `${p.newRegistered}개`, inline: true },
      { name: '평균 꿀통지수', value: `${p.avgHoneyScore}점`, inline: true },
      { name: '공급가 변동', value: `${p.priceChanges}건`, inline: true },
      p.topProduct
        ? { name: ':trophy: 이주의 꿀통 1위', value: `**${p.topProduct.name}** (${p.topProduct.score}점)`, inline: false }
        : null,
      p.noAltOosCount > 0
        ? { name: ':rotating_light: 대체상품 미등록 품절', value: `${p.noAltOosCount}개 상품 — 대체상품을 등록해주세요!`, inline: false }
        : null,
    ].filter(Boolean) as Record<string, unknown>[],
    footer: { text: '꽃티움 가든 · 주간리포트' },
    timestamp: new Date().toISOString(),
  };
}
