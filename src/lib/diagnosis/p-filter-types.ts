// src/lib/diagnosis/p-filter-types.ts
//
// Sprint 8-PF — Type contracts for the P-Filter pre-flight image quality
// diagnosis module. Wraps and extends ImageQualityResult (from image-quality.ts)
// without breaking the existing CTI inputs (colorMood, photoStyle).
//
// Korean seller-facing labels live in src/lib/i18n/p-filter-messages.ko.json;
// keep this file free of Korean string literals (workflow principle #29).

import type { ImageQualityResult } from './image-quality';

export type PFilterGrade = 'L1' | 'L2' | 'L3' | 'L4';

export type BlurLevel = 'severe' | 'warning' | 'ok';
export type WhiteBalanceDirection = 'warm' | 'cool' | 'green' | 'magenta';

export interface PFilterSignals {
  resolution: {
    width: number;
    height: number;
    sufficient: boolean;
  };
  blur: {
    /** Laplacian variance (higher = sharper). */
    variance: number;
    level: BlurLevel;
  };
  exposure: {
    /** Mean luminance 0..255. */
    mean: number;
    ok: boolean;
  };
  whiteBalance: {
    cast: boolean;
    direction?: WhiteBalanceDirection;
    /** Channel ratio deviation 0..1 (0 = perfectly neutral). */
    deviation: number;
  };
  watermark: {
    detected: boolean;
    /** Which bands fired: 'top' and/or 'bottom'. */
    regions: string[];
    /** Recognised text snippets (may be empty if detected by glyph density only). */
    texts: string[];
  };
  background: {
    /** Mean variance across edge strips (reused from ImageQualityResult.rawStats). */
    variance: number;
    uniform: boolean;
  };
  /** Optional — sharp.trim() may fail on complex backgrounds; null when skipped. */
  objectRatio?: {
    ratio: number;
    appropriate: boolean;
  } | null;
}

export interface PFilterResult {
  grade: PFilterGrade;
  /** Seller-friendly Korean label resolved from p-filter-messages.ko.json. */
  gradeLabel: string;
  /** L1/L2 = automation can proceed; L3/L4 = needs manual intervention. */
  passed: boolean;
  signals: PFilterSignals;
  /** Korean seller-facing fix suggestions (resolved from i18n json). */
  autoFixSuggestions: string[];
  /** True when grade is L2 or L3 (seller has to look at it). */
  requiresSellerReview: boolean;
  /** Wall-clock duration in milliseconds. */
  elapsedMs: number;
  /** Embedded original image-quality result so downstream CTI keeps working. */
  imageQuality: ImageQualityResult;
}
