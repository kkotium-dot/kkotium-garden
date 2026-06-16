// src/lib/engine/slot-blueprint.ts
// ============================================================================
// Universal 9-slot blueprint (engine spec §4). Category-agnostic defaults for
// each funnel slot: conversion job, content type, mood axis (6-axis lookup),
// model route, aspect, grounding, text policy, and the existing detail-section
// ids the slot maps onto (reuse pointer — the 9 slots are a VIEW over the
// skeleton/section system, not a re-implementation, #62).
//
// All-product common (#55): only the CONTENT varies per category (driven by the
// DNA card); this blueprint is fixed. English literals only.
// ============================================================================

import type { MoodCode } from '@/lib/mood/types';
import type {
  ContentType,
  ModelRoute,
  RealismLane,
  SlotAspect,
  SlotType,
} from './types';

export interface SlotBlueprint {
  slotType: SlotType;
  conversionJob: string;
  contentType: ContentType;
  // 6-axis mood the assembler looks up (M1 trust / M2 desire / M3 clarity /
  // M4 cozy / M5 cheerful / M6 premium).
  mood: MoodCode;
  realismLane: RealismLane;
  composition: string;
  legibility: string;
  textPolicy: 'text_free' | 'text_allowed';
  compositeFlag: boolean;
  groundingFlag: boolean;
  modelRoute: ModelRoute;
  aspect: SlotAspect;
  // Base requiredness before DNA / product-attribute overrides.
  requiredByDefault: boolean;
  // Existing section ids this slot is a view over (skeleton/section reuse).
  sectionIds: string[];
}

// Representative thumbnail = `hero` (1:1, text-free, single product cutout).
// Everything else is a 4:5 detail composite.
export const SLOT_BLUEPRINT: Record<SlotType, SlotBlueprint> = {
  hero: {
    slotType: 'hero',
    conversionJob: 'hook',
    contentType: 'product_context',
    mood: 'M6',
    realismLane: 'photoreal',
    composition: 'single product centered, 85-95% frame occupancy',
    legibility: 'readable at ~200px thumbnail',
    textPolicy: 'text_free',
    compositeFlag: false,
    groundingFlag: true,
    modelRoute: 'cutout',
    aspect: '1:1',
    requiredByDefault: true,
    sectionIds: ['hero'],
  },
  problem: {
    slotType: 'problem',
    conversionJob: 'empathy',
    contentType: 'mood',
    mood: 'M4',
    realismLane: 'photoreal',
    composition: 'relatable scene, pain-point framing',
    legibility: 'mobile-first vertical, body >=14pt',
    textPolicy: 'text_allowed',
    compositeFlag: true,
    groundingFlag: false,
    modelRoute: 'nano_banana_2',
    aspect: '4:5',
    requiredByDefault: false,
    sectionIds: ['problem'],
  },
  solution_usp: {
    slotType: 'solution_usp',
    conversionJob: 'benefit',
    contentType: 'product_context',
    mood: 'M3',
    realismLane: 'photoreal',
    composition: 'product close-up + benefit emphasis',
    legibility: 'one number minimum, mobile-first',
    textPolicy: 'text_allowed',
    compositeFlag: true,
    groundingFlag: true,
    modelRoute: 'firefly_native',
    aspect: '4:5',
    requiredByDefault: true,
    sectionIds: ['solution', 'corePerformance', 'technology'],
  },
  scent_note: {
    slotType: 'scent_note',
    conversionJob: 'sensory',
    contentType: 'mood',
    mood: 'M2',
    realismLane: 'photoreal',
    composition: 'sensory mood plate, scent-profile evocation',
    legibility: 'note labels legible, mobile-first',
    textPolicy: 'text_allowed',
    compositeFlag: true,
    groundingFlag: false,
    modelRoute: 'firefly_native',
    aspect: '4:5',
    requiredByDefault: false,
    sectionIds: ['story', 'philosophy'],
  },
  use_install: {
    slotType: 'use_install',
    conversionJob: 'proof_of_use',
    contentType: 'product_context',
    mood: 'M3',
    realismLane: 'photoreal',
    composition: 'in-context install / use shot, real geometry',
    legibility: 'step legibility, mobile-first',
    textPolicy: 'text_allowed',
    compositeFlag: true,
    groundingFlag: true,
    modelRoute: 'firefly_native',
    aspect: '4:5',
    requiredByDefault: false,
    sectionIds: ['usage', 'detail'],
  },
  size_duration: {
    slotType: 'size_duration',
    conversionJob: 'spec',
    contentType: 'spec',
    mood: 'M3',
    realismLane: 'photoreal',
    composition: 'dimension / duration infographic with real numbers',
    legibility: 'numeric legibility critical, mobile-first',
    textPolicy: 'text_allowed',
    compositeFlag: true,
    groundingFlag: true,
    modelRoute: 'nano_banana_pro',
    aspect: '4:5',
    requiredByDefault: false,
    sectionIds: ['spec', 'specTable', 'specifications'],
  },
  trust: {
    slotType: 'trust',
    conversionJob: 'social_proof',
    contentType: 'spec',
    mood: 'M1',
    realismLane: 'photoreal',
    composition: 'certification / review / safety numbers',
    legibility: 'fact legibility, mobile-first',
    textPolicy: 'text_allowed',
    compositeFlag: true,
    groundingFlag: true,
    modelRoute: 'nano_banana_pro',
    aspect: '4:5',
    requiredByDefault: false,
    sectionIds: ['warranty', 'clinical', 'material', 'reviews'],
  },
  gift: {
    slotType: 'gift',
    conversionJob: 'gift_framing',
    contentType: 'mood',
    mood: 'M5',
    realismLane: 'photoreal',
    composition: 'gift packaging / presentation',
    legibility: 'mobile-first',
    textPolicy: 'text_allowed',
    compositeFlag: true,
    groundingFlag: false,
    modelRoute: 'firefly_native',
    aspect: '4:5',
    requiredByDefault: false,
    sectionIds: ['package', 'styledShot'],
  },
  cta: {
    slotType: 'cta',
    conversionJob: 'cta_brand',
    contentType: 'mood',
    mood: 'M6',
    realismLane: 'photoreal',
    composition: 'brand close, reassurance + shipping',
    legibility: 'CTA legibility, mobile-first',
    textPolicy: 'text_allowed',
    compositeFlag: true,
    groundingFlag: false,
    modelRoute: 'firefly_native',
    aspect: '4:5',
    requiredByDefault: true,
    sectionIds: ['cta', 'shipping', 'benefits'],
  },
};
