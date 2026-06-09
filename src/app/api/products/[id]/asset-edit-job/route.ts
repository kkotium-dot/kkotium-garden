// /api/products/[id]/asset-edit-job
// ============================================================================
// Crop studio (T1) — seed an asset_jobs row for an operator-chosen crop/edit
// action. The operator's box coordinates and edit params are stored in
// input_refs (jsonb); the tool is resolved from job-type-routing.
//
//   region_crop   -> sharp  (in-app; status 'ready' — the thumb-crop route runs it)
//   text_remove   -> firefly|adobe_express (operator-triggered creative MCP)
//   canvas_expand -> firefly|adobe_express (operator-triggered creative MCP)
//   bg_clean      -> firefly|adobe_express (operator-triggered creative MCP)
//
// Creative-MCP edits are seeded 'awaiting_human' (intervention point, standard
// §6) — the row records the request + params; the operator runs the connector
// in a tool-active session. Idempotent: an existing ACTIVE job of the same type
// for the product is returned instead of creating a duplicate. Pure DB — never
// touches Naver, no image processing here.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { routeForJobType, isFinishingJobType } from '@/lib/jobs/job-type-routing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Box { x: number; y: number; width: number; height: number; }
interface Body {
  jobType?: string;
  sourceUrl?: string;
  box?: Box;
  // Tool override — must be the route's primary or a documented fallback.
  tool?: string;
  // Free-form edit params (e.g. expand target side, text region hint).
  params?: Record<string, unknown>;
}

// Statuses that mean the job is still in flight (idempotency guard).
const ACTIVE_STATUSES = ['pending', 'ready', 'in_progress', 'blocked', 'awaiting_human', 'human_done', 'review'];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: Body = {};
  try { body = await req.json(); } catch { /* empty body → 400 below */ }

  const jobType = body.jobType ?? '';
  if (!isFinishingJobType(jobType)) {
    return NextResponse.json(
      { success: false, error: 'jobType must be one of region_crop, text_remove, canvas_expand, bg_clean, product_composite, harmonize' },
      { status: 400 },
    );
  }
  if (!body.sourceUrl || !/^https?:\/\//i.test(body.sourceUrl)) {
    return NextResponse.json({ success: false, error: 'sourceUrl (http/https) is required' }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  const route = routeForJobType(jobType)!; // non-null: isFinishingJobType passed.
  const allowedTools = [route.primaryTool, ...route.fallbackTools];
  const tool = body.tool && allowedTools.includes(body.tool) ? body.tool : route.primaryTool;

  // In-app Sharp runs immediately; creative-MCP edits wait for the operator.
  const status = route.requiresOperator ? 'awaiting_human' : 'ready';

  // Idempotency: reuse an existing active job of the same type.
  const existing = await prisma.assetJob.findFirst({
    where: { productId, jobType, status: { in: ACTIVE_STATUSES } },
    select: { id: true, status: true, tool: true },
  });
  if (existing) {
    return NextResponse.json({
      success: true, reused: true, jobId: existing.id, jobType, tool: existing.tool, status: existing.status,
    });
  }

  const inputRefs: Prisma.InputJsonValue = {
    sourceUrl: body.sourceUrl,
    box: body.box ? { x: body.box.x, y: body.box.y, width: body.box.width, height: body.box.height } : null,
    params: (body.params ?? {}) as Prisma.InputJsonValue,
    requiresOperator: route.requiresOperator,
  };

  let job;
  try {
    job = await prisma.assetJob.create({
      data: {
        productId,
        lane: route.lane,
        jobType,
        tool,
        ipSafe: route.ipSafe,
        status,
        inputRefs,
        blockedReason: null,
      },
      select: { id: true, status: true },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: `Seed failed: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    reused: false,
    jobId: job.id,
    jobType,
    tool,
    status: job.status,
    fallbackTools: route.fallbackTools,
    requiresOperator: route.requiresOperator,
  });
}
