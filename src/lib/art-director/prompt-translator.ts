// src/lib/art-director/prompt-translator.ts
//
// Sprint 7-M2 5-B — CTI → Firefly prompt translator.
//
// Two-stage pipeline (design doc §3):
//   Stage 1 — Rule-based composition: walk each CTI axis, look up the
//             Firefly keyword in prompt-dictionary.ts, concatenate.
//   Stage 2 — Groq polish: ask the LLM to smooth the keyword string into a
//             natural-reading Firefly prompt WITHOUT dropping any keyword.
//             Stage 1 output survives as the deterministic fallback if Groq
//             is unavailable or returns nothing usable.
//
// Why two stages
//   Stage 1 gives us guaranteed coverage of every signal — we never lose a
//   keyword to LLM drift. Stage 2 makes the prompt actually pleasant to copy
//   into Firefly. If Stage 2 breaks, we still ship a working (if blunter)
//   prompt.

import type { ConceptTone } from '@/lib/diagnosis/concept-tone-inference';
import {
  GENRE_KEYWORDS,
  CONTEXT_KEYWORDS,
  COLOR_MOOD_KEYWORDS,
  EMOTIONAL_TONE_KEYWORDS,
  PHOTO_STYLE_KEYWORDS,
  PERSONA_KEYWORDS,
  QUALITY_SUFFIX,
  NEGATIVE_PROMPT_DEFAULT,
  ASPECT_BY_PHOTO_STYLE,
  colorPaletteHint,
  detectedObjectsHint,
} from './prompt-dictionary';
import type { ImageAnalysisResult } from './image-analyzer';
import { pickGroqKey, callGroq } from '@/lib/automation/groq-client';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ArtDirectorInput {
  productName: string;
  category: string | null;
  conceptTone: ConceptTone;
  /** 0..100 from concept-tone-inference. Used downstream by status classifier. */
  inferenceConfidence: number;
  /** Optional — pass a normalized ImageAnalysisResult to seed visual hints. */
  imageAnalysis?: ImageAnalysisResult;
}

export interface ArtDirectorPrompt {
  /** Main Firefly prompt — Stage 2 (groq) when available, else Stage 1. */
  prompt: string;
  /** Stage 1 deterministic version — always present so callers can compare. */
  rulePrompt: string;
  negativePrompt: string;
  aspectRatio: string;
  /** Provenance: which axes contributed which keywords. */
  derivedFrom: {
    axes: string[];
    confidence: number;
    imageInformed: boolean;
    polished: boolean;
  };
}

// ---------------------------------------------------------------------------
// Stage 1 — rule-based composition
// ---------------------------------------------------------------------------

function composeRulePrompt(input: ArtDirectorInput): {
  prompt: string;
  contributingAxes: string[];
} {
  const tone = input.conceptTone;
  const parts: string[] = [];
  const contributingAxes: string[] = [];

  // Genre + color mood form the scene foundation.
  parts.push(GENRE_KEYWORDS[tone.genre]);
  contributingAxes.push('genre');
  parts.push(COLOR_MOOD_KEYWORDS[tone.colorMood]);
  contributingAxes.push('colorMood');

  // Subject mention — anchor the product literally so Firefly does not drift.
  // Product name is Korean and Firefly does fine with Korean nouns alongside
  // English directives; we keep it short.
  const subjectClause = `featuring a "${input.productName}" as the focal subject`;
  parts.push(subjectClause);

  // Context + persona shape the staging.
  parts.push(CONTEXT_KEYWORDS[tone.context]);
  contributingAxes.push('context');
  parts.push(PERSONA_KEYWORDS[tone.persona]);
  contributingAxes.push('persona');

  // Emotional tone + photoStyle shape the framing.
  parts.push(EMOTIONAL_TONE_KEYWORDS[tone.emotionalTone]);
  contributingAxes.push('emotionalTone');
  parts.push(PHOTO_STYLE_KEYWORDS[tone.photoStyle]);
  contributingAxes.push('photoStyle');

  // Image-informed extras (only added when image analysis is present).
  if (input.imageAnalysis && input.imageAnalysis.confidence > 0) {
    const palette = colorPaletteHint(input.imageAnalysis.dominantColors);
    if (palette) {
      parts.push(palette);
      contributingAxes.push('imageAnalysis.dominantColors');
    }
    const objects = detectedObjectsHint(input.imageAnalysis.detectedObjects);
    if (objects) {
      parts.push(objects);
      contributingAxes.push('imageAnalysis.detectedObjects');
    }
    if (input.imageAnalysis.lightingMood) {
      parts.push(input.imageAnalysis.lightingMood);
      contributingAxes.push('imageAnalysis.lightingMood');
    }
  }

  parts.push(QUALITY_SUFFIX);

  return {
    prompt: parts.filter((p) => p && p.length > 0).join(', '),
    contributingAxes,
  };
}

// ---------------------------------------------------------------------------
// Stage 2 — Groq polish
// ---------------------------------------------------------------------------

function buildPolishPrompt(rulePrompt: string): string {
  return [
    'You are an art director writing Adobe Firefly prompts. Polish the keyword string below into ONE natural-reading English prompt sentence.',
    '',
    'HARD RULES — violation is failure:',
    '1. KEEP every concept already present. Do NOT drop keywords or invent new visual elements.',
    '2. KEEP the product subject phrase ("featuring a ...") exactly as given, including the quoted Korean name.',
    '3. Keep the result under 80 words.',
    '4. Do not add ratings, hashtags, parameters like --ar, or markdown.',
    '5. Respond with the polished prompt only — no preamble, no quotes around the whole thing.',
    '',
    'Input keyword string:',
    rulePrompt,
  ].join('\n');
}

/** Conservative validator — Stage 2 output must still contain the product
 *  subject anchor and not collapse to a stub. */
function isAcceptablePolished(rule: string, polished: string): boolean {
  if (!polished || polished.length < 30) return false;
  if (polished.length > rule.length * 2.5) return false;
  // The Korean product name (inside quotes) must survive.
  const m = rule.match(/"([^"]+)"/);
  if (m && !polished.includes(m[1])) return false;
  return true;
}

async function polishWithGroq(rulePrompt: string): Promise<string | null> {
  const key = pickGroqKey();
  if (!key) return null;
  const polishPrompt = buildPolishPrompt(rulePrompt);
  const raw = await callGroq(polishPrompt, key, {
    maxTokens: 220,
    temperature: 0.5,
  });
  if (!raw) return null;
  const trimmed = raw.replace(/^["'`]+|["'`]+$/g, '').trim();
  if (!isAcceptablePolished(rulePrompt, trimmed)) return null;
  return trimmed;
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export async function translatePrompt(
  input: ArtDirectorInput,
): Promise<ArtDirectorPrompt> {
  const { prompt: rulePrompt, contributingAxes } = composeRulePrompt(input);
  const aspectRatio = ASPECT_BY_PHOTO_STYLE[input.conceptTone.photoStyle] ?? '1:1';

  const polished = await polishWithGroq(rulePrompt);
  const imageInformed = !!(
    input.imageAnalysis && input.imageAnalysis.confidence > 0
  );

  return {
    prompt: polished ?? rulePrompt,
    rulePrompt,
    negativePrompt: NEGATIVE_PROMPT_DEFAULT,
    aspectRatio,
    derivedFrom: {
      axes: contributingAxes,
      confidence: input.inferenceConfidence,
      imageInformed,
      polished: polished !== null,
    },
  };
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

export const _internals = {
  composeRulePrompt,
  buildPolishPrompt,
  isAcceptablePolished,
};
