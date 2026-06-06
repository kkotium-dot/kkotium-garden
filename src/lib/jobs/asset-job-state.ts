// src/lib/jobs/asset-job-state.ts
// ============================================================================
// asset_jobs state machine — the single source of truth for pipeline tasks.
// Authority: docs/research/KKOTIUM_HYBRID_PIPELINE_SYSTEM_DESIGN_2026-06-06.md §4/§7.
//
// Pure DB state functions — NEVER touch Naver (irreversible-write free). Writes
// hit only the new asset_jobs / asset_job_transitions tables.
//
// Guarantees:
//   - transitionJob: allowed-transition guard + optimistic lock (version) +
//     append-only transition log (asset_job_transitions).
//   - claimNextJob: SELECT ... FOR UPDATE SKIP LOCKED so concurrent AI sessions
//     never grab the same job.
//   - detectZombies: in_progress jobs whose heartbeat went stale are forced to
//     blocked so the control tower surfaces them.
// ============================================================================

import { prisma } from '@/lib/prisma';
import type { AssetJob } from '@prisma/client';

export type JobStatus =
  | 'pending' | 'ready' | 'in_progress' | 'blocked'
  | 'awaiting_approval' | 'done' | 'failed' | 'cancelled'
  // Phase 2 product-swap loop:
  | 'awaiting_human' | 'human_done' | 'review' | 'rejected';

export type JobLane = 'generate' | 'process' | 'compose' | 'review' | 'publish';
export type JobActor = 'system' | 'ai_agent' | 'human';

// Allowed transition map (handoff §SCOPE task 2 + Phase 2 swap loop). Terminal:
// done, cancelled. Phase 2 adds the browser-handoff + review/retry cycle:
//   in_progress -> awaiting_human (browser step) -> human_done -> in_progress
//   in_progress -> review -> done(approved) | rejected ; rejected -> ready (retry)
const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending:           ['ready', 'cancelled'],
  ready:             ['in_progress', 'cancelled'],
  in_progress:       ['done', 'failed', 'blocked', 'awaiting_approval', 'awaiting_human', 'review'],
  blocked:           ['ready', 'cancelled'],
  awaiting_approval: ['in_progress', 'cancelled'],
  awaiting_human:    ['human_done', 'cancelled'],
  human_done:        ['in_progress', 'cancelled'],
  review:            ['done', 'rejected', 'cancelled'],
  rejected:          ['ready', 'cancelled'],   // human-driven redo loop (not retry-budget gated)
  failed:            ['ready', 'cancelled'],   // ready only while retryCount < maxRetries
  done:              [],
  cancelled:         [],
};

// Default heartbeat staleness threshold for zombie detection (10 minutes).
export const ZOMBIE_THRESHOLD_MS = 10 * 60 * 1000;

export class JobTransitionError extends Error {
  from: JobStatus;
  to: JobStatus;
  code: 'NOT_ALLOWED' | 'RETRY_EXHAUSTED' | 'VERSION_CONFLICT' | 'NOT_FOUND';
  constructor(
    message: string,
    from: JobStatus,
    to: JobStatus,
    code: JobTransitionError['code'],
  ) {
    super(message);
    this.name = 'JobTransitionError';
    this.from = from;
    this.to = to;
    this.code = code;
  }
}

export interface TransitionOpts {
  actor?: JobActor;
  event?: string;
  note?: string;
}

/**
 * Move a job to `toStatus` only if the transition is allowed. Uses an optimistic
 * lock on `version` (UPDATE ... WHERE version = current) so a concurrent change
 * is rejected rather than silently overwritten, and appends a transition row.
 */
export async function transitionJob(
  jobId: string,
  toStatus: JobStatus,
  opts: TransitionOpts = {},
): Promise<AssetJob> {
  const job = await prisma.assetJob.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new JobTransitionError(`asset job not found: ${jobId}`, 'pending', toStatus, 'NOT_FOUND');
  }
  const from = job.status as JobStatus;

  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(toStatus)) {
    throw new JobTransitionError(`transition not allowed: ${from} -> ${toStatus}`, from, toStatus, 'NOT_ALLOWED');
  }

  // failed -> ready is a retry; gate it on the retry budget.
  const isRetry = from === 'failed' && toStatus === 'ready';
  if (isRetry && job.retryCount >= job.maxRetries) {
    throw new JobTransitionError(
      `retry budget exhausted (${job.retryCount}/${job.maxRetries})`, from, toStatus, 'RETRY_EXHAUSTED',
    );
  }

  const now = new Date();
  const data: Record<string, unknown> = {
    status: toStatus,
    version: { increment: 1 },
    updatedAt: now,
  };
  if (isRetry) data.retryCount = { increment: 1 };
  if (toStatus === 'in_progress') data.lastAttemptedAt = now;
  // Carry the block reason only while blocked; clear a stale reason otherwise.
  data.blockedReason = toStatus === 'blocked' ? (opts.note ?? job.blockedReason ?? null) : null;

  // Optimistic lock: only succeeds if no one else bumped the version meanwhile.
  const res = await prisma.assetJob.updateMany({
    where: { id: jobId, version: job.version },
    data,
  });
  if (res.count !== 1) {
    throw new JobTransitionError(
      'optimistic-lock conflict — another session changed the job first', from, toStatus, 'VERSION_CONFLICT',
    );
  }

  await prisma.assetJobTransition.create({
    data: {
      jobId,
      fromStatus: from,
      toStatus,
      event: opts.event ?? null,
      actor: opts.actor ?? 'system',
      note: opts.note ?? null,
    },
  });

  const updated = await prisma.assetJob.findUnique({ where: { id: jobId } });
  return updated as AssetJob;
}

/**
 * Atomically claim the next `ready` job in a lane for a worker session.
 * SELECT ... FOR UPDATE SKIP LOCKED guarantees two sessions never claim the same
 * row. Sets status=in_progress + assigned_session + heartbeat and logs a claim
 * transition. Returns null when the lane has no ready work.
 */
export async function claimNextJob(
  lane: JobLane,
  sessionId: string,
): Promise<AssetJob | null> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "asset_jobs"
      WHERE "lane" = ${lane} AND "status" = 'ready'
      ORDER BY "priority" DESC, "created_at" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED`;
    if (rows.length === 0) return null;

    const id = rows[0].id;
    const now = new Date();
    await tx.$executeRaw`
      UPDATE "asset_jobs"
      SET "status" = 'in_progress',
          "version" = "version" + 1,
          "assigned_session" = ${sessionId},
          "heartbeat_at" = ${now},
          "last_attempted_at" = ${now},
          "updated_at" = ${now}
      WHERE "id" = ${id}`;

    await tx.assetJobTransition.create({
      data: {
        jobId: id,
        fromStatus: 'ready',
        toStatus: 'in_progress',
        event: 'claim',
        actor: 'ai_agent',
        note: sessionId,
      },
    });

    return tx.assetJob.findUnique({ where: { id } });
  });
}

/** Refresh the heartbeat of an in-progress job (call periodically while working). */
export async function heartbeat(jobId: string): Promise<void> {
  await prisma.assetJob.updateMany({
    where: { id: jobId, status: 'in_progress' },
    data: { heartbeatAt: new Date() },
  });
}

/**
 * Force in_progress jobs whose heartbeat went stale (or never started) into
 * blocked, so the control tower surfaces stuck work instead of hiding it.
 */
export async function detectZombies(
  thresholdMs: number = ZOMBIE_THRESHOLD_MS,
): Promise<{ detected: number; blocked: string[] }> {
  const cutoff = new Date(Date.now() - thresholdMs);
  const zombies = await prisma.assetJob.findMany({
    where: {
      status: 'in_progress',
      OR: [
        { heartbeatAt: { lt: cutoff } },
        { heartbeatAt: null, updatedAt: { lt: cutoff } },
      ],
    },
    select: { id: true },
  });

  const blocked: string[] = [];
  for (const z of zombies) {
    try {
      await transitionJob(z.id, 'blocked', {
        actor: 'system',
        event: 'zombie_detected',
        note: `heartbeat stale > ${Math.round(thresholdMs / 60000)}m`,
      });
      blocked.push(z.id);
    } catch {
      // Concurrent change moved it already — skip.
    }
  }
  return { detected: zombies.length, blocked };
}
