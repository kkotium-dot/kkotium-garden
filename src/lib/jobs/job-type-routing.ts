// src/lib/jobs/job-type-routing.ts
// ============================================================================
// Phase 4 crop/edit workflow — tool routing for the 4 operator-driven job types.
// Authority: docs/design/THUMBNAIL_CROP_EDIT_STANDARD.md §3/§5
//            + docs/handoff/HANDOFF_session_2026-06-07_5_crop_edit_workflow_apply.md (T3).
//
// These job_type tokens were widened into the asset_jobs CHECK by
// MIGRATION_phase4_crop_edit. The crop studio (T1) seeds asset_jobs rows for an
// operator action; this module decides which tool each action routes to and
// records the routing on the row (tool column) plus a default the operator may
// override in the UI.
//
// Tool tokens match the documented AssetJob.tool enum:
//   firefly | adobe_express | figma | canva | claude_design | sharp | naver_api
//
// Creative-MCP edits (text_remove/canvas_expand/bg_clean) are OPERATOR-TRIGGERED
// intervention points (standard §6) — the app seeds the job + params, the
// operator runs the connector. region_crop is in-app Sharp (no connector).
// ============================================================================

import type { JobLane } from './asset-job-state';

// Phase 4 job_type tokens (single source — callers import instead of literals).
export const REGION_CROP = 'region_crop';
export const TEXT_REMOVE = 'text_remove';
export const CANVAS_EXPAND = 'canvas_expand';
export const BG_CLEAN = 'bg_clean';

// C-7 finishing job types (composite pipeline). Both tokens already exist in the
// asset_jobs job_type CHECK (Phase 2 swap-loop), so NO migration is needed —
// this only adds their tool routing. product_composite = place a cutout on a
// mood background; harmonize = match color-temp / shadow / contact-shadow.
export const PRODUCT_COMPOSITE = 'product_composite';
export const HARMONIZE = 'harmonize';

export type CropEditJobType =
  | typeof REGION_CROP
  | typeof TEXT_REMOVE
  | typeof CANVAS_EXPAND
  | typeof BG_CLEAN;

/** Crop/edit types + the C-7 composite/harmonize finishing types. */
export type FinishingJobType =
  | CropEditJobType
  | typeof PRODUCT_COMPOSITE
  | typeof HARMONIZE;

const CROP_EDIT_TYPES: readonly CropEditJobType[] = [
  REGION_CROP, TEXT_REMOVE, CANVAS_EXPAND, BG_CLEAN,
];

export interface JobTypeRoute {
  jobType: FinishingJobType;
  lane: JobLane;
  // Default tool the app recommends; the operator may switch to a fallback.
  primaryTool: string;
  // Alternative tools the operator may pick in the UI (standard §5).
  fallbackTools: string[];
  ipSafe: boolean;
  // True when the edit runs through a creative connector the operator triggers
  // (login/CAPTCHA/irreversible click). False = fully in-app (Sharp).
  requiresOperator: boolean;
}

// region_crop -> sharp ; text_remove/canvas_expand/bg_clean -> firefly|adobe_express ;
// product_composite/harmonize -> firefly|adobe_express (operator mood composite).
export const JOB_TYPE_ROUTES: Record<FinishingJobType, JobTypeRoute> = {
  [REGION_CROP]: {
    jobType: REGION_CROP,
    lane: 'process',
    primaryTool: 'sharp',
    fallbackTools: [],
    ipSafe: true,
    requiresOperator: false,
  },
  [TEXT_REMOVE]: {
    jobType: TEXT_REMOVE,
    lane: 'process',
    primaryTool: 'firefly',
    fallbackTools: ['adobe_express'],
    ipSafe: true,
    requiresOperator: true,
  },
  [CANVAS_EXPAND]: {
    jobType: CANVAS_EXPAND,
    lane: 'process',
    primaryTool: 'firefly',
    fallbackTools: ['adobe_express'],
    ipSafe: true,
    requiresOperator: true,
  },
  [BG_CLEAN]: {
    jobType: BG_CLEAN,
    lane: 'process',
    primaryTool: 'firefly',
    fallbackTools: ['adobe_express'],
    ipSafe: true,
    requiresOperator: true,
  },
  [PRODUCT_COMPOSITE]: {
    jobType: PRODUCT_COMPOSITE,
    lane: 'process',
    // In-app Sharp can do a simple composite; a high-fidelity mood composite is
    // an operator-triggered Firefly/Express job (the apply-composite route runs
    // the in-app path directly and recovers the Firefly result).
    primaryTool: 'firefly',
    fallbackTools: ['adobe_express', 'sharp'],
    ipSafe: true,
    requiresOperator: true,
  },
  [HARMONIZE]: {
    jobType: HARMONIZE,
    lane: 'process',
    primaryTool: 'firefly',
    fallbackTools: ['adobe_express', 'sharp'],
    ipSafe: true,
    requiresOperator: true,
  },
};

/** Routing for a finishing job_type, or null if it has no route. */
export function routeForJobType(jobType: string): JobTypeRoute | null {
  return JOB_TYPE_ROUTES[jobType as FinishingJobType] ?? null;
}

/** True when the job_type is one of the 4 Phase 4 crop/edit operations. */
export function isCropEditJobType(jobType: string): jobType is CropEditJobType {
  return (CROP_EDIT_TYPES as readonly string[]).includes(jobType);
}

/** True when the job_type has a routing entry (crop/edit OR composite/harmonize). */
export function isFinishingJobType(jobType: string): jobType is FinishingJobType {
  return jobType in JOB_TYPE_ROUTES;
}
