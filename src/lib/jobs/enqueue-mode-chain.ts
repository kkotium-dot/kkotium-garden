// src/lib/jobs/enqueue-mode-chain.ts
// ============================================================================
// Enqueue a recommended mode's job chain into asset_jobs. Phase 3, handoff task 6.
// Connects the adaptive 3-mode decision to a real pipeline:
//   - NEW   → seeds the Phase 2 B-plan swap jobs (product_cutout..naver_normalize),
//             which the EXISTING /products/[id]/swap UI drives unchanged (bg_swap
//             = reuse, not reimplement).
//   - SIMPLE/ENHANCE → seed crop / SEO jobs.
//
// Idempotent: existing chain jobs for the product are skipped (resume-safe).
// quality_assess is seeded 'done' (the assessment already produced the mode); the
// first remaining step is 'ready', the rest 'blocked' (the state machine /
// pipeline unblocks them in order). Pure DB — never touches Naver.
// ============================================================================

import { prisma } from '@/lib/prisma';
import { chainForMode } from './mode-chains';
import type { RecommendedMode } from '../images/quality-classifier';

export interface EnqueueResult {
  mode: RecommendedMode;
  created: string[];   // jobTypes newly created
  skipped: string[];   // jobTypes that already existed
  jobIds: string[];    // all chain job ids (existing + created), in chain order
}

export async function enqueueModeChain(
  productId: string,
  mode: RecommendedMode,
  opts: { conceptComboId?: string | null } = {},
): Promise<EnqueueResult> {
  const chain = chainForMode(mode);

  const existing = await prisma.assetJob.findMany({
    where: { productId, jobType: { in: chain.map((s) => s.jobType) } },
    select: { id: true, jobType: true },
  });
  const existingByType = new Map(existing.map((e) => [e.jobType, e.id]));

  const created: string[] = [];
  const skipped: string[] = [];
  const jobIds: string[] = [];
  let firstWorkAssigned = false; // has the first 'ready' work step been placed?

  for (let i = 0; i < chain.length; i++) {
    const step = chain[i];
    const existingId = existingByType.get(step.jobType);
    if (existingId) {
      skipped.push(step.jobType);
      jobIds.push(existingId);
      if (step.jobType !== 'quality_assess') firstWorkAssigned = true;
      continue;
    }

    let status: string;
    if (step.jobType === 'quality_assess') {
      status = 'done';                 // assessment already ran (mode is set)
    } else if (!firstWorkAssigned) {
      status = 'ready';                // first actionable step
      firstWorkAssigned = true;
    } else {
      status = 'blocked';              // waits for its predecessor
    }

    const job = await prisma.assetJob.create({
      data: {
        productId,
        conceptComboId: opts.conceptComboId ?? null,
        lane: step.lane,
        jobType: step.jobType,
        tool: step.tool,
        ipSafe: step.ipSafe,
        status,
        priority: chain.length - i,
        blockedReason: status === 'blocked'
          ? `awaiting predecessor (${chain[i - 1]?.jobType ?? 'prior step'})`
          : null,
      },
    });
    created.push(step.jobType);
    jobIds.push(job.id);
  }

  return { mode, created, skipped, jobIds };
}
