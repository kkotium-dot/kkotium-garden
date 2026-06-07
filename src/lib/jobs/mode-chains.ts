// src/lib/jobs/mode-chains.ts
// ============================================================================
// Adaptive 3-mode -> asset_jobs chain mapping. Phase 3, handoff task 4.
// Authority: docs/research/KKOTIUM_ADAPTIVE_SEO_IMAGE_SYSTEM_2026-06-06.md §1/§5.
//
// Each recommended mode enqueues a DIFFERENT job_type chain — the whole point of
// the 3-mode system is to avoid running every product through the full pipeline:
//   SIMPLE  : detail-page crop + minimal SEO (no cutout/compose)
//   ENHANCE : crop + image/copy enrichment
//   NEW     : B-plan cutout + AI background + composite (full) + SEO
//
// Pure data + a builder. No DB writes here — an enqueue route consumes
// chainForMode() and creates asset_jobs rows (transitionJob owns state). The
// job_type tokens are the lowercase values widened into the asset_jobs CHECK by
// MIGRATION_phase3_adaptive_mode (they map to the handoff's QUALITY_ASSESS etc).
// ============================================================================

import type { JobLane } from './asset-job-state';
import type { RecommendedMode } from '../images/quality-classifier';

export interface JobStep {
  jobType: string;
  lane: JobLane;
  tool: string;
  ipSafe: boolean;
}

// Reusable steps (single source so chains stay consistent).
const QUALITY_ASSESS: JobStep = { jobType: 'quality_assess', lane: 'process', tool: 'sharp', ipSafe: true };
const THUMB_CROP: JobStep     = { jobType: 'thumb_crop',     lane: 'process', tool: 'sharp', ipSafe: true };
const SEO_TEXT: JobStep       = { jobType: 'seo_text',       lane: 'review',  tool: 'claude_design', ipSafe: true };
const SEO_IMAGE: JobStep      = { jobType: 'seo_image',      lane: 'compose', tool: 'sharp', ipSafe: true };

// NEW mode reuses the Phase 2 B-plan swap pipeline (cutout-fixed, AI bg only).
const BG_SWAP_CHAIN: JobStep[] = [
  { jobType: 'product_cutout',    lane: 'process',  tool: 'adobe_express', ipSafe: true },
  { jobType: 'mood_bg_generate',  lane: 'generate', tool: 'firefly',       ipSafe: true },
  { jobType: 'product_composite', lane: 'compose',  tool: 'figma',         ipSafe: true },
  { jobType: 'harmonize',         lane: 'compose',  tool: 'adobe_express', ipSafe: true },
  { jobType: 'naver_normalize',   lane: 'process',  tool: 'sharp',         ipSafe: true },
];

/**
 * Ordered job chain for a recommended mode. Always starts with quality_assess
 * (the gate that produced the mode) so the audit trail is complete.
 */
export const MODE_CHAINS: Record<RecommendedMode, JobStep[]> = {
  SIMPLE:  [QUALITY_ASSESS, THUMB_CROP, SEO_TEXT],
  ENHANCE: [QUALITY_ASSESS, THUMB_CROP, SEO_IMAGE, SEO_TEXT],
  NEW:     [QUALITY_ASSESS, ...BG_SWAP_CHAIN, SEO_IMAGE, SEO_TEXT],
};

/** Return the ordered job chain for a mode (defensive copy). */
export function chainForMode(mode: RecommendedMode): JobStep[] {
  return MODE_CHAINS[mode].map((s) => ({ ...s }));
}
