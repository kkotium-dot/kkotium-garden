// src/lib/diagnosis/concept-tone-inference.ts
//
// Sprint 7-Diag MVP (v3.1 FINAL Smart Asset Workflow) — CTI 8-axis inference +
// skeleton-matcher. Pure library: no DB, no env-dependent IO.
//
// Source-of-truth spec:
//   - docs/research/SMART_ASSET_WORKFLOW_V3_1_FINAL_2026_05.md Section 2/4
//   - Verification seeds (PDF Part 1 #3) -> Section 4-C of the same doc.
//
// Design notes
//   - Rule-based 1st pass for every axis. Groq LLM augmentation is NOT wired
//     in this MVP — keeping the surface area small and deterministic. The
//     `augmentWithGroq` hook is intentionally left as a TODO so a future
//     Phase can plug in callGroq() without changing the signature.
//   - colorMood (#5) and photoStyle (#7) inputs come from
//     image-quality.ts assessImageQuality(). The category default is used
//     when image inference is missing/ambiguous.
//   - Confidence per axis is multiplicative: clear rule match -> 95, partial
//     match -> 70, fallback default -> 50. inferenceConfidence is the
//     unweighted mean (0-100).
//   - skeleton-matcher follows the exact decision tree from the spec doc.

import type { ColorMood, PhotoStyle } from './image-quality';

// ---------------------------------------------------------------------------
// Type contracts (mirror Diagnosis.conceptTone JSON shape)
// ---------------------------------------------------------------------------

export type Persona = '20s' | '30-40s' | 'senior' | 'kidsmom';
export type Context = 'daily' | 'gift' | 'pro' | 'event';
export type PricePosition = 'budget' | 'standard' | 'premium';
export type ProductType = 'single' | 'options' | 'set';
export type EmotionalTone = 'friendly' | 'professional' | 'sensory' | 'trust';
export type Genre = 'korean' | 'minimal' | 'vintage' | 'natural';

export type SkeletonId =
  | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6'
  | 'S7' | 'S8' | 'S9' | 'S10' | 'S11' | 'S12';

export interface ConceptTone {
  persona: Persona;
  context: Context;
  pricePosition: PricePosition;
  productType: ProductType;
  colorMood: ColorMood;
  emotionalTone: EmotionalTone;
  photoStyle: PhotoStyle;
  genre: Genre;
}

export interface ConceptToneInferenceInput {
  /** Product name as crawled / entered. Required. */
  productName: string;
  /** Free-text or canonical category. Optional but strongly recommended. */
  category?: string | null;
  /** Sale price (KRW). Required if pricePosition should reflect market context. */
  salePrice?: number | null;
  /** Category average sale price (KRW). Optional; falls back to standard. */
  categoryAveragePrice?: number | null;
  /** Number of selectOpt options as captured from the supplier API. */
  optionCount?: number | null;
  /** Free-text option label (e.g. "4종 세트"). */
  optionName?: string | null;
  /** 1st-pass tone-axis suggestion from image-quality.ts. Optional. */
  colorMood?: ColorMood | null;
  /** 1st-pass tone-axis suggestion from image-quality.ts. Optional. */
  photoStyle?: PhotoStyle | null;
}

export interface ConceptToneInferenceResult {
  conceptTone: ConceptTone;
  skeletonId: SkeletonId;
  /** 0-100 unweighted mean of per-axis confidence. */
  inferenceConfidence: number;
  /** Per-axis confidence and a short reason for downstream debugging. */
  signals: {
    persona:        { value: Persona;       confidence: number; reason: string };
    context:        { value: Context;       confidence: number; reason: string };
    pricePosition:  { value: PricePosition; confidence: number; reason: string };
    productType:    { value: ProductType;   confidence: number; reason: string };
    colorMood:      { value: ColorMood;     confidence: number; reason: string };
    emotionalTone:  { value: EmotionalTone; confidence: number; reason: string };
    photoStyle:     { value: PhotoStyle;    confidence: number; reason: string };
    genre:          { value: Genre;         confidence: number; reason: string };
  };
}

// ---------------------------------------------------------------------------
// Keyword dictionaries (Korean) — single source of categorical signals.
// Kept here intentionally rather than i18n because they are matching tokens,
// not user-facing strings (workrule #35 carve-out).
// ---------------------------------------------------------------------------

const KIDS_TOKENS = ['유아', '아기', '아동', '키즈', '어린이', '신생아', '베이비'];
const SENIOR_TOKENS = ['시니어', '실버', '어르신', '노인', '효도'];
const YOUNG_ADULT_TOKENS = ['트렌드', '인싸', '감성', 'mz', 'MZ', '20대', '청춘'];

const GIFT_TOKENS = ['선물', '기프트', '답례품', '명절', '추석', '설날', '발렌타인', '화이트데이', '크리스마스'];
const PRO_TOKENS = ['프로', '전문가', '전문가용', '공구', '산업용', '의료', '의료기기', '업소용'];
const EVENT_TOKENS = ['한정', '시즌', '이벤트', '신상', '특가', '깜짝', '오늘만', '플래시'];

const SET_TOKENS = ['세트', '세트구성', '종 세트', '구성품', '4종', '5종', '6종', '7종'];

const KIDS_CATEGORY_HINT = ['키즈', '유아', '아동', '베이비', '출산'];
const SENIOR_CATEGORY_HINT = ['건강', '의료', '실버', '효도', '안마'];
const FASHION_CATEGORY_HINT = ['패션', '의류', '신발', '가방', '주얼리', '주얼', '액세서리'];
const LIVING_CATEGORY_HINT = ['리빙', '생활', '주방', '인테리어', '가구', '홈'];
const FOOD_CATEGORY_HINT = ['식품', '음식', '간식', '먹', '음료'];
const NATURE_CATEGORY_HINT = ['친환경', '식물', '반려', '펫', '플랜트', '원예'];
const PRO_CATEGORY_HINT = ['공구', '산업', '의료', '가전', '전자', '컴퓨터'];

// ---------------------------------------------------------------------------
// Per-axis inference helpers
// ---------------------------------------------------------------------------

interface AxisSignal<T> {
  value: T;
  confidence: number;
  reason: string;
}

function lower(s: string | null | undefined): string {
  return (s ?? '').toLowerCase();
}

function tokenHit(haystack: string, tokens: string[]): string | null {
  const lc = haystack.toLowerCase();
  for (const t of tokens) {
    if (lc.includes(t.toLowerCase())) return t;
  }
  return null;
}

function inferPersona(input: ConceptToneInferenceInput): AxisSignal<Persona> {
  const name = lower(input.productName);
  const cat = lower(input.category);
  // Highest priority: explicit kids tokens in product name or category
  const kidsHit = tokenHit(name, KIDS_TOKENS) || tokenHit(cat, KIDS_CATEGORY_HINT);
  if (kidsHit) return { value: 'kidsmom', confidence: 95, reason: `kids-token "${kidsHit}"` };
  const seniorHit = tokenHit(name, SENIOR_TOKENS) || tokenHit(cat, SENIOR_CATEGORY_HINT);
  if (seniorHit) return { value: 'senior', confidence: 90, reason: `senior-token "${seniorHit}"` };
  const youngHit = tokenHit(name, YOUNG_ADULT_TOKENS);
  if (youngHit) return { value: '20s', confidence: 80, reason: `young-token "${youngHit}"` };
  // Price-driven fallback: premium electronics / fashion often skew 30-40s
  if (input.salePrice != null && input.salePrice >= 100000) {
    return { value: '30-40s', confidence: 65, reason: 'premium-price proxy' };
  }
  return { value: '30-40s', confidence: 50, reason: 'default fallback' };
}

function inferContext(input: ConceptToneInferenceInput): AxisSignal<Context> {
  const haystack = `${input.productName} ${input.category ?? ''} ${input.optionName ?? ''}`;
  const giftHit = tokenHit(haystack, GIFT_TOKENS);
  if (giftHit) return { value: 'gift', confidence: 95, reason: `gift-token "${giftHit}"` };
  const proHit = tokenHit(haystack, PRO_TOKENS) || tokenHit(lower(input.category), PRO_CATEGORY_HINT);
  if (proHit) return { value: 'pro', confidence: 90, reason: `pro-token "${proHit}"` };
  const eventHit = tokenHit(haystack, EVENT_TOKENS);
  if (eventHit) return { value: 'event', confidence: 85, reason: `event-token "${eventHit}"` };
  return { value: 'daily', confidence: 70, reason: 'default daily' };
}

function inferPricePosition(input: ConceptToneInferenceInput): AxisSignal<PricePosition> {
  if (input.salePrice == null) {
    return { value: 'standard', confidence: 50, reason: 'no salePrice given' };
  }
  if (input.categoryAveragePrice && input.categoryAveragePrice > 0) {
    const ratio = input.salePrice / input.categoryAveragePrice;
    if (ratio < 0.7) return { value: 'budget',    confidence: 90, reason: `ratio ${ratio.toFixed(2)} < 0.7` };
    if (ratio > 1.3) return { value: 'premium',   confidence: 90, reason: `ratio ${ratio.toFixed(2)} > 1.3` };
    return            { value: 'standard',  confidence: 85, reason: `ratio ${ratio.toFixed(2)} in [0.7, 1.3]` };
  }
  // No category average: rough KRW-band proxy (sapling-seller domain)
  if (input.salePrice < 15000)  return { value: 'budget',   confidence: 60, reason: 'absolute price < ₩15k' };
  if (input.salePrice > 80000)  return { value: 'premium',  confidence: 60, reason: 'absolute price > ₩80k' };
  return                       { value: 'standard', confidence: 55, reason: 'absolute mid-band' };
}

function inferProductType(input: ConceptToneInferenceInput): AxisSignal<ProductType> {
  const setHit = tokenHit(`${input.productName} ${input.optionName ?? ''}`, SET_TOKENS);
  if (setHit) return { value: 'set', confidence: 90, reason: `set-token "${setHit}"` };
  if (input.optionCount != null) {
    if (input.optionCount <= 0) return { value: 'single',  confidence: 95, reason: 'optionCount=0' };
    if (input.optionCount <= 10) return { value: 'options', confidence: 95, reason: `optionCount=${input.optionCount}` };
    return                        { value: 'options', confidence: 80, reason: `optionCount=${input.optionCount} (>10 unusual)` };
  }
  return { value: 'single', confidence: 55, reason: 'optionCount unknown -> default single' };
}

function categoryDefaultColorMood(category: string | null | undefined): ColorMood {
  const cat = lower(category);
  if (tokenHit(cat, KIDS_CATEGORY_HINT)) return 'warm';
  if (tokenHit(cat, FOOD_CATEGORY_HINT)) return 'warm';
  if (tokenHit(cat, FASHION_CATEGORY_HINT)) return 'calm';
  if (tokenHit(cat, NATURE_CATEGORY_HINT)) return 'warm';
  if (tokenHit(cat, PRO_CATEGORY_HINT)) return 'mono';
  return 'calm';
}

function inferColorMood(input: ConceptToneInferenceInput): AxisSignal<ColorMood> {
  if (input.colorMood) {
    return { value: input.colorMood, confidence: 85, reason: 'image-quality 1st pass' };
  }
  const def = categoryDefaultColorMood(input.category);
  return { value: def, confidence: 55, reason: 'category default (no image stats)' };
}

function inferEmotionalTone(
  persona: Persona,
  pricePosition: PricePosition,
  context: Context,
): AxisSignal<EmotionalTone> {
  if (context === 'pro') {
    return { value: 'professional', confidence: 90, reason: 'context=pro' };
  }
  if (persona === 'senior' && pricePosition === 'premium') {
    return { value: 'trust', confidence: 85, reason: 'senior + premium' };
  }
  if (persona === 'kidsmom') {
    return { value: 'friendly', confidence: 85, reason: 'persona=kidsmom' };
  }
  if (pricePosition === 'premium') {
    return { value: 'sensory', confidence: 80, reason: 'premium fallback' };
  }
  if (persona === '20s') {
    return { value: 'friendly', confidence: 75, reason: 'persona=20s' };
  }
  return { value: 'friendly', confidence: 60, reason: 'default friendly' };
}

function categoryDefaultPhotoStyle(category: string | null | undefined): PhotoStyle {
  const cat = lower(category);
  if (tokenHit(cat, PRO_CATEGORY_HINT)) return 'white';
  if (tokenHit(cat, FASHION_CATEGORY_HINT)) return 'lifestyle';
  if (tokenHit(cat, FOOD_CATEGORY_HINT)) return 'detail';
  if (tokenHit(cat, LIVING_CATEGORY_HINT)) return 'lifestyle';
  return 'white';
}

function inferPhotoStyle(input: ConceptToneInferenceInput): AxisSignal<PhotoStyle> {
  if (input.photoStyle) {
    return { value: input.photoStyle, confidence: 85, reason: 'image-quality 1st pass' };
  }
  return { value: categoryDefaultPhotoStyle(input.category), confidence: 55, reason: 'category default' };
}

function inferGenre(
  input: ConceptToneInferenceInput,
  persona: Persona,
  context: Context,
): AxisSignal<Genre> {
  const cat = lower(input.category);
  if (tokenHit(cat, NATURE_CATEGORY_HINT)) {
    return { value: 'natural', confidence: 90, reason: 'category=nature' };
  }
  if (context === 'event' && tokenHit(input.productName, ['빈티지', '레트로', '한정판'])) {
    return { value: 'vintage', confidence: 80, reason: 'event + vintage-token' };
  }
  if (persona === 'kidsmom' && (tokenHit(cat, FOOD_CATEGORY_HINT) || tokenHit(cat, KIDS_CATEGORY_HINT))) {
    return { value: 'korean', confidence: 85, reason: 'kidsmom + food/kids' };
  }
  if (tokenHit(cat, FASHION_CATEGORY_HINT) || tokenHit(cat, LIVING_CATEGORY_HINT)) {
    return { value: 'minimal', confidence: 75, reason: 'fashion/living' };
  }
  return { value: 'minimal', confidence: 55, reason: 'default minimal' };
}

// ---------------------------------------------------------------------------
// Skeleton matcher — verbatim decision tree from SMART_ASSET_WORKFLOW Section 4
// ---------------------------------------------------------------------------

export function matchSkeleton(concept: ConceptTone): SkeletonId {
  if (concept.pricePosition === 'premium' && concept.context === 'gift') return 'S3';
  if (concept.pricePosition === 'premium' && concept.context === 'pro') return 'S7';
  if (concept.pricePosition === 'premium' && concept.context === 'daily') return 'S10';
  if (concept.context === 'pro' && concept.emotionalTone === 'professional') {
    return concept.pricePosition === 'budget' ? 'S12' : 'S4';
  }
  if (concept.context === 'event') {
    return concept.genre === 'vintage' ? 'S11' : 'S8';
  }
  if (concept.persona === 'kidsmom' || (concept.pricePosition === 'budget' && concept.productType === 'set')) {
    return 'S5';
  }
  if (concept.genre === 'natural') return 'S9';
  if (concept.context === 'gift') return 'S6';
  if (concept.pricePosition === 'budget' && concept.productType === 'single') return 'S1';
  return 'S2'; // default workhorse
}

// ---------------------------------------------------------------------------
// Public entry — full 8-axis inference + skeleton matching
// ---------------------------------------------------------------------------

export function inferConceptTone(input: ConceptToneInferenceInput): ConceptToneInferenceResult {
  if (!input.productName || input.productName.trim().length === 0) {
    throw new Error('concept-tone-inference: productName is required');
  }

  const persona       = inferPersona(input);
  const context       = inferContext(input);
  const pricePosition = inferPricePosition(input);
  const productType   = inferProductType(input);
  const colorMood     = inferColorMood(input);
  const emotionalTone = inferEmotionalTone(persona.value, pricePosition.value, context.value);
  const photoStyle    = inferPhotoStyle(input);
  const genre         = inferGenre(input, persona.value, context.value);

  const concept: ConceptTone = {
    persona:        persona.value,
    context:        context.value,
    pricePosition:  pricePosition.value,
    productType:    productType.value,
    colorMood:      colorMood.value,
    emotionalTone:  emotionalTone.value,
    photoStyle:     photoStyle.value,
    genre:          genre.value,
  };

  const skeletonId = matchSkeleton(concept);

  const confidences = [
    persona.confidence,
    context.confidence,
    pricePosition.confidence,
    productType.confidence,
    colorMood.confidence,
    emotionalTone.confidence,
    photoStyle.confidence,
    genre.confidence,
  ];
  const inferenceConfidence = Math.round(
    confidences.reduce((acc, v) => acc + v, 0) / confidences.length,
  );

  return {
    conceptTone: concept,
    skeletonId,
    inferenceConfidence,
    signals: {
      persona, context, pricePosition, productType,
      colorMood, emotionalTone, photoStyle, genre,
    },
  };
}

// ---------------------------------------------------------------------------
// Future hook (Phase 2-B): Groq augmentation for low-confidence axes only.
// Intentionally left as a no-op to keep this MVP deterministic + offline.
// ---------------------------------------------------------------------------

export async function augmentWithGroq(
  base: ConceptToneInferenceResult,
  _input: ConceptToneInferenceInput,
): Promise<ConceptToneInferenceResult> {
  // TODO(sprint-7-diag-phase3): for axes with confidence < 70, call Groq
  // Llama 3.1 8B with a structured-output prompt and merge. Keep model bounded
  // to GROQ_API_KEY / GROQ_API_KEY_3 round-robin (workrule #37).
  return base;
}
