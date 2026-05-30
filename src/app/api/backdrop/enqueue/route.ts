// src/app/api/backdrop/enqueue/route.ts
//
// Track B Phase 1 — POST /api/backdrop/enqueue (2026-05-30).
//
// Authority: docs/research/FIREFLY_AUTOMATION_RESEARCH_2026-05-30.md §6 (step a).
//
// Creates a backdrop_jobs row in status='pending' whose firefly_request jsonb
// fully describes the Firefly generation that needs to happen next. The actual
// generation is OUT of scope here (Phase 1 = sample adoption spine; Phase 3 =
// generate-async wiring once an API account exists). The response surfaces the
// jobId + fireflyRequest + plan so a human (or a future worker) can run the
// generation and call POST /api/backdrop/ingest with the result.
//
// No image API call at runtime (workrule #38).

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapCategoryToTone } from '@/lib/automation/category-tone-mapper';
import { planAdobeWorkflow } from '@/lib/automation/adobe-tool-router';
import { matchSkeleton } from '@/lib/automation/skeleton-matcher';
import { buildBackdropPrompt } from '@/lib/automation/backdrop-prompt-builder';
import type { ConceptTone, SkeletonId } from '@/lib/diagnosis/concept-tone-inference';

export const runtime = 'nodejs';

function isConceptTone(v: unknown): v is ConceptTone {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.persona === 'string' && typeof o.context === 'string' && typeof o.pricePosition === 'string';
}

function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}

interface EnqueueBody {
  productId?: string;
  overrideSkeletonId?: SkeletonId;
  /** Optional manual ConceptTone override (matches /api/thumbnail body shape). */
  conceptTone?: ConceptTone;
}

export async function POST(req: Request) {
  let body: EnqueueBody = {};
  try {
    body = (await req.json()) as EnqueueBody;
  } catch {
    // empty body allowed below if productId comes as query param — keep simple
  }

  const productId = body.productId?.trim();
  if (!productId) {
    return jsonError('productId is required');
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      category: true,
      naverCategoryCode: true,
    },
  });
  if (!product) {
    return jsonError('product not found', 404, { productId });
  }

  // ConceptTone source: explicit body override beats stored Diagnosis.
  let conceptTone: ConceptTone | null = null;
  if (body.conceptTone && isConceptTone(body.conceptTone)) {
    conceptTone = body.conceptTone;
  } else {
    const diagnosis = await prisma.diagnosis.findUnique({
      where: { productId: product.id },
      select: { conceptTone: true },
    });
    if (diagnosis && isConceptTone(diagnosis.conceptTone)) {
      conceptTone = diagnosis.conceptTone;
    }
  }
  if (!conceptTone) {
    return jsonError('conceptTone required — run /api/diagnose first or include in body', 400, {
      productId: product.id,
    });
  }

  // Same 2-step derivation the /api/thumbnail route runs, so the cached
  // backdrop matches the skeleton the live renderer will look up later.
  const skeletonId: SkeletonId = body.overrideSkeletonId ?? matchSkeleton(conceptTone).skeletonId;
  const toneDirective = mapCategoryToTone(conceptTone, {
    category: product.category ?? undefined,
    naverCategoryCode: product.naverCategoryCode,
    productName: product.name,
  });
  const plan = planAdobeWorkflow('lifestyle', toneDirective);
  const fireflyRequest = buildBackdropPrompt({
    productId: product.id,
    skeletonId,
    baseTone: toneDirective.baseTone,
    model: plan.model ?? 'firefly-image-5',
  });

  const job = await prisma.backdropJob.create({
    data: {
      productId: product.id,
      skeletonId,
      baseTone: toneDirective.baseTone,
      fireflyRequest: fireflyRequest as unknown as object,
      status: 'pending',
    },
    select: { id: true, status: true, createdAt: true },
  });

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    productId: product.id,
    skeletonId,
    baseTone: toneDirective.baseTone,
    toneDirective,
    plan,
    fireflyRequest,
  });
}
