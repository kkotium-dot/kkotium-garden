// src/lib/art-director/prompt-dictionary.ts
//
// Sprint 7-M2 5-B — CTI axis → Firefly visual-keyword dictionary.
//
// One-way translation table. Each entry maps a single ConceptTone axis value
// to the English visual keywords Firefly responds to. The translator
// (prompt-translator.ts) composes these into a full prompt; this file is the
// pure data layer so vocabulary can evolve without touching logic.
//
// Source: docs/research/SPRINT_7_M2_5B_ART_DIRECTOR_2026_05.md §3.2
//
// English-only — Firefly is English-optimised. Korean labels are NOT used
// in Firefly prompts (separately surfaced in art-director-messages.ko.json
// for the seller-facing UI).

import type {
  Persona,
  Context,
  EmotionalTone,
  Genre,
} from '@/lib/diagnosis/concept-tone-inference';
import type { ColorMood, PhotoStyle } from '@/lib/diagnosis/image-quality';

// ---------------------------------------------------------------------------
// Per-axis maps
// ---------------------------------------------------------------------------

export const GENRE_KEYWORDS: Record<Genre, string> = {
  korean:  'Korean hanok interior, traditional warm aesthetic, hanji paper texture',
  minimal: 'Scandinavian minimalist scene, clean negative space, soft white tones',
  vintage: 'retro vintage atmosphere, warm aged textures, nostalgic palette',
  natural: 'organic natural materials, plant-filled cozy space, earthy tones',
};

export const CONTEXT_KEYWORDS: Record<Context, string> = {
  daily: 'everyday lifestyle scene, lived-in authentic moment',
  gift:  'elegant gift presentation, premium unboxing mood, ribbon detail',
  pro:   'professional studio environment, clean workspace, focused use',
  event: 'seasonal event atmosphere, festive but tasteful staging',
};

export const COLOR_MOOD_KEYWORDS: Record<ColorMood, string> = {
  warm:  'warm golden hour lighting, cozy amber tones',
  calm:  'soft diffused daylight, muted calm palette',
  vivid: 'rich saturated colors, dynamic vibrant lighting',
  mono:  'monochrome refined palette, balanced grayscale composition',
};

export const EMOTIONAL_TONE_KEYWORDS: Record<EmotionalTone, string> = {
  friendly:     'inviting warm composition, approachable mood',
  professional: 'refined editorial composition, polished detail',
  sensory:      'tactile sensory close-up, texture-forward styling',
  trust:        'reassuring grounded composition, balanced symmetry',
};

export const PHOTO_STYLE_KEYWORDS: Record<PhotoStyle, string> = {
  white:     'studio product photography, seamless white backdrop, even soft light',
  lifestyle: 'lifestyle product photography, in-context staging',
  detail:    'macro close-up detail shot, shallow depth of field',
};

export const PERSONA_KEYWORDS: Record<Persona, string> = {
  '20s':      'young adult cozy apartment setting, casual contemporary decor',
  '30-40s':   'refined adult home setting, tasteful well-curated decor',
  'senior':   'comfortable mature home setting, warm familiar atmosphere',
  'kidsmom':  'family-friendly bright home setting, playful but tidy decor',
};

// ---------------------------------------------------------------------------
// Quality + technical suffixes (constant — never inferred)
// ---------------------------------------------------------------------------

export const QUALITY_SUFFIX =
  'lifestyle product photography, shallow depth of field, 8k, photorealistic';

export const NEGATIVE_PROMPT_DEFAULT =
  'text, watermark, logo, low quality, distorted, extra objects, blurry, ugly';

// ---------------------------------------------------------------------------
// Aspect-ratio recommender — by photoStyle
// ---------------------------------------------------------------------------

export const ASPECT_BY_PHOTO_STYLE: Record<PhotoStyle, string> = {
  white:     '1:1',
  lifestyle: '4:5',
  detail:    '1:1',
};

// ---------------------------------------------------------------------------
// Image-analysis hint suffixes — only applied when imageAnalysis provided
// ---------------------------------------------------------------------------

/** Build "matching the existing palette" hint from up to 3 dominant colors. */
export function colorPaletteHint(colors: ReadonlyArray<string>): string {
  if (!Array.isArray(colors) || colors.length === 0) return '';
  const top = colors.slice(0, 3).join(', ');
  return `palette referencing ${top}`;
}

/** Build object continuity hint — keeps Firefly from inventing extra props. */
export function detectedObjectsHint(objects: ReadonlyArray<string>): string {
  if (!Array.isArray(objects) || objects.length === 0) return '';
  const top = objects.slice(0, 3).join(', ');
  return `featuring ${top}`;
}
