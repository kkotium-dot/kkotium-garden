// src/lib/discord.ts
// Centralised Discord webhook sender for all Kkotium alert channels.
// Embed builders moved to src/lib/notifications/discord-builder.ts (work principle 6.5/6-Pre 3 split).
// This file now contains only:
//   - Channel registry (DISCORD_WEBHOOKS)
//   - sendDiscord() core sender
//   - Shared helpers used by builders (getSeasonContext, GRADE_EMOJI)

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

// Kkotti avatar (used by all 5 channels for consistency)
const KKOTTI_AVATAR =
  `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://kkotium-garden.vercel.app'}/kkotti-avatar.png`;

// ── Season detector ────────────────────────────────────────────────────────────
// Returns the next upcoming Korean shopping holiday within 30 days, with suggested keywords.
export function getSeasonContext(): { label: string; daysLeft: number; words: string[] } | null {
  const now = new Date();
  const EVENTS = [
    { month: 2,  day: 14, label: '\uBC1C\uB80C\uD0C0\uC778\uB370\uC774',  words: ['\uCD08\uCF5C\uB9BF', '\uBC1C\uB80C\uD0C0\uC778', '\uC120\uBB3C', '\uD3EC\uC7A5'] },
    { month: 3,  day: 14, label: '\uD654\uC774\uD2B8\uB370\uC774',        words: ['\uC0AC\uD0D5', '\uD654\uC774\uD2B8', '\uC120\uBB3C', '\uD3EC\uC7A5'] },
    { month: 5,  day: 5,  label: '\uC5B4\uB9B0\uC774\uB0A0',               words: ['\uC7A5\uB09C\uAC10', '\uC5B4\uB9B0\uC774', '\uC120\uBB3C', '\uB180\uC774'] },
    { month: 5,  day: 8,  label: '\uC5B4\uBC84\uC774\uB0A0',               words: ['\uCE74\uB124\uC774\uC158', '\uC120\uBB3C', '\uBD80\uBAA8\uB2D8'] },
    { month: 11, day: 11, label: '\uBE7C\uBE7C\uB85C\uB370\uC774',        words: ['\uBE7C\uBE7C\uB85C', '\uACFC\uC790', '\uC120\uBB3C', '\uD3EC\uC7A5'] },
    { month: 12, day: 25, label: '\uD06C\uB9AC\uC2A4\uB9C8\uC2A4',        words: ['\uD06C\uB9AC\uC2A4\uB9C8\uC2A4', '\uC0B0\uD0C0', '\uC120\uBB3C', '\uD2B8\uB9AC'] },
  ];
  for (const ev of EVENTS) {
    const target = new Date(now.getFullYear(), ev.month - 1, ev.day);
    const diff = Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
    if (diff >= 0 && diff <= 30) return { label: ev.label, daysLeft: diff, words: ev.words };
  }
  return null;
}

// Honey-score grade -> Discord emoji shortcode
export const GRADE_EMOJI: Record<string, string> = {
  S: ':purple_heart:',
  A: ':green_heart:',
  B: ':blue_heart:',
  C: ':yellow_heart:',
  D: ':broken_heart:',
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
      username:   '\uAF2C\uB760',
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

// ── Backward-compatibility re-exports ────────────────────────────────────────
// Existing callers import builders from '@/lib/discord'.
// To minimize churn, re-export builders from the new module.
// New code should import directly from '@/lib/notifications/discord-builder'.
export {
  buildRecommendEmbed,
  buildStockAlertEmbed,
  buildPriceChangeEmbed,
  buildScoreDropEmbed,
  buildWeeklyReportEmbed,
} from '@/lib/notifications/discord-builder';
