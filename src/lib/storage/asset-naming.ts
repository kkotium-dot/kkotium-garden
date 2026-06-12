// src/lib/storage/asset-naming.ts
// ============================================================================
// Asset naming convention v2 (2026-06-12) — the controlled vocabulary + the
// normalized variant builder used by the semi-automatic intake (upload route)
// and the AssetRegistry. A stored object is:
//
//   {productId}/{stage}/{variant}-{ts}.{ext}
//   variant = <angle>_<mood>_<slot>_<context>  (present tokens only)
//
// Tokens come from fixed vocabularies so inference + registry queries stay
// stable. Moods mirror ADAPTIVE_COMPOSITE_ENGINE.md §12. Pure constants +
// string helpers — no IO. English code; product-agnostic (#55).
// ============================================================================

export const ANGLE_TOKENS = [
  'front', 'three_quarter', 'side', 'back', 'top', 'macro', 'detail', 'hanging',
] as const;
export type AngleToken = (typeof ANGLE_TOKENS)[number];

// Mood vocabulary mirrors the 8-mood library (ENGINE §12).
export const MOOD_TOKENS = [
  'golden', 'fresh', 'dark_luxury', 'bright_airy', 'botanical', 'vintage', 'studio', 'seasonal',
] as const;
export type MoodToken = (typeof MOOD_TOKENS)[number];

// Image slot: main (Naver image 1) + hero + additional 2..9.
export const SLOT_TOKENS = [
  'main', 'hero', 'extra2', 'extra3', 'extra4', 'extra5', 'extra6', 'extra7', 'extra8', 'extra9',
] as const;
export type SlotToken = (typeof SLOT_TOKENS)[number];

export const CONTEXT_TOKENS = [
  'car_vent', 'desk', 'home', 'studio_white', 'lifestyle', 'outdoor', 'kitchen',
] as const;
export type ContextToken = (typeof CONTEXT_TOKENS)[number];

/** The variant token order + separator (the STAGE_NAMING convention). */
export const STAGE_NAMING = {
  separator: '_',
  order: ['angle', 'mood', 'slot', 'context'] as const,
} as const;

export interface AssetTokens {
  angle?: AngleToken;
  mood?: MoodToken;
  slot?: SlotToken;
  context?: ContextToken;
}

// Alias spellings → canonical token. Lets a free-form filename
// ('3-4', 'darkluxury', 'carvent') resolve to the controlled vocabulary.
const ANGLE_ALIASES: Record<string, AngleToken> = {
  front: 'front', frontal: 'front', face: 'front',
  three_quarter: 'three_quarter', threequarter: 'three_quarter', '34': 'three_quarter', tq: 'three_quarter',
  side: 'side', profile: 'side',
  back: 'back', rear: 'back',
  top: 'top', overhead: 'top', flatlay: 'top',
  macro: 'macro', closeup: 'macro', close: 'macro',
  detail: 'detail',
  hanging: 'hanging', hang: 'hanging', clip: 'hanging',
};
const MOOD_ALIASES: Record<string, MoodToken> = {
  golden: 'golden', warm: 'golden',
  fresh: 'fresh', cool: 'fresh',
  dark_luxury: 'dark_luxury', darkluxury: 'dark_luxury', dark: 'dark_luxury', luxury: 'dark_luxury',
  bright_airy: 'bright_airy', brightairy: 'bright_airy', bright: 'bright_airy', airy: 'bright_airy',
  botanical: 'botanical', botanic: 'botanical', green: 'botanical',
  vintage: 'vintage', retro: 'vintage', film: 'vintage',
  studio: 'studio',
  seasonal: 'seasonal', season: 'seasonal',
};
const CONTEXT_ALIASES: Record<string, ContextToken> = {
  car_vent: 'car_vent', carvent: 'car_vent', vent: 'car_vent', car: 'car_vent',
  desk: 'desk', office: 'desk',
  home: 'home', room: 'home',
  studio_white: 'studio_white', studiowhite: 'studio_white', whitebg: 'studio_white', white: 'studio_white',
  lifestyle: 'lifestyle', scene: 'lifestyle', usage: 'lifestyle',
  outdoor: 'outdoor', outside: 'outdoor',
  kitchen: 'kitchen',
};

function tokenize(name: string): string[] {
  return name.toLowerCase().replace(/\.[a-z0-9]+$/i, '').split(/[^a-z0-9]+/i).filter(Boolean);
}

function matchSlot(tokens: string[]): SlotToken | undefined {
  for (const t of tokens) {
    if ((SLOT_TOKENS as readonly string[]).includes(t)) return t as SlotToken;
    const m = /^extra([2-9])$/.exec(t);
    if (m) return (`extra${m[1]}`) as SlotToken;
    if (t === 'rep' || t === 'representative') return 'main';
  }
  return undefined;
}

/** Parse the controlled tokens out of a free-form filename (first match wins
 *  per category; combined multi-word aliases like 'dark_luxury' are also tried
 *  on adjacent token pairs). Never throws. */
export function parseAssetTokens(name: string): AssetTokens {
  const tokens = tokenize(name);
  const pairs: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) pairs.push(`${tokens[i]}_${tokens[i + 1]}`);
  const all = [...tokens, ...pairs];

  const pick = <T extends string>(aliases: Record<string, T>): T | undefined => {
    for (const t of all) {
      if (aliases[t]) return aliases[t];
    }
    return undefined;
  };

  return {
    angle: pick(ANGLE_ALIASES),
    mood: pick(MOOD_ALIASES),
    slot: matchSlot(tokens),
    context: pick(CONTEXT_ALIASES),
  };
}

/**
 * Build the normalized variant slug from tokens (STAGE_NAMING order). Empty
 * tokens are skipped; falls back to `fallback` when nothing resolves.
 */
export function buildAssetVariant(tokens: AssetTokens, fallback = 'asset'): string {
  const parts = ([tokens.angle, tokens.mood, tokens.slot, tokens.context] as (string | undefined)[]).filter(
    (v): v is string => typeof v === 'string' && v.length > 0,
  );
  return parts.length > 0 ? parts.join(STAGE_NAMING.separator) : fallback;
}
