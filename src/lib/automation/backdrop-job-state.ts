// src/lib/automation/backdrop-job-state.ts
//
// Track B Phase 3 — single source of truth for backdrop_jobs review transitions
// + ops alert (2026-05-30).
//
// Without this, every route that can park a job in 'review' had to duplicate
// the DB write AND remember to call Discord — easy to drift, easy to forget,
// and fail-closed jobs pile up silently. Centralizing here guarantees:
//   1. status=review + error is always written atomically with the alert.
//   2. The alert is fire-and-forget (never blocks the request).
//   3. Both DB write and alert have their own try/catch so one failure does
//      not cascade into the other.
//
// Alert channel: OPS_REPORT (운영 리포트). Plain-text content message keeps
// the payload below the Discord embed-richness threshold and works without
// embed builders.

import { prisma } from '@/lib/prisma';
import { sendDiscord } from '@/lib/discord';

/** Pipeline stage that triggered the review transition. Surfaced in the alert
 *  so operators can triage faster (vlm-reject vs upload-failed vs vlm-error). */
export type ReviewStage =
  | 'fetch'
  | 'decode'
  | 'upload'
  | 'vlm-reject'
  | 'vlm-error'
  | 'classify-missing-stage'
  | 'auto-cache-miss'
  | 'unknown';

export interface MarkReviewInput {
  jobId: string;
  productId: string;
  skeletonId: string;
  reason: string;
  stage: ReviewStage;
  /** Optional context that should appear in the Discord message but not in DB. */
  extra?: Record<string, string | number | boolean | null>;
}

/**
 * Transition a backdrop_jobs row to status='review' and fire a non-blocking
 * Discord alert. Idempotent at the row level (multiple calls just keep
 * updating `error` + `updated_at`). The Discord send is best-effort: a
 * webhook outage NEVER throws into the caller.
 */
export async function markReview(input: MarkReviewInput): Promise<void> {
  try {
    await prisma.backdropJob.update({
      where: { id: input.jobId },
      data: { status: 'review', error: input.reason, updatedAt: new Date() },
    });
  } catch (err) {
    // Log but proceed to alert — an alert without a DB write is still
    // strictly more useful than silent failure.
    // eslint-disable-next-line no-console
    console.error('[backdrop-job-state] DB update failed:', err);
  }

  const extra = input.extra
    ? ' · ' +
      Object.entries(input.extra)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')
    : '';
  const content =
    `🟡 backdrop_jobs review queued · ` +
    `job=${input.jobId} product=${input.productId} skeleton=${input.skeletonId} ` +
    `stage=${input.stage} reason=${input.reason}${extra}`;

  // Fire-and-forget. sendDiscord already swallows internal errors and returns
  // a result object instead of throwing — wrap in catch defensively anyway.
  void (async () => {
    try {
      await sendDiscord('OPS_REPORT', content);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[backdrop-job-state] Discord alert failed (non-fatal):', err);
    }
  })();
}
