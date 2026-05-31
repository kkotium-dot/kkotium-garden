// src/app/api/products/[id]/publish-readiness/route.ts
//
// 2026-05-31 — Publish-readiness gate endpoint.
//
// Returns fields(non-NULL) AND authenticity(content) verdicts. Replaces the
// raw "publish_ready_19_of_19" SQL snapshot which only tested non-NULL — a
// #46 violation that let AI-fabricated values pass the gate. The structural
// authenticity check now flags superlatives, scent-vocab mismatch on non-
// fragrance products, unverified certification or material claims, and
// fabricated brand-authority language.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  evaluatePublishReadiness,
  type PublishReadinessInput,
} from '@/lib/automation/publish-readiness';
import { mapCategoryToTone } from '@/lib/automation/category-tone-mapper';
import type { ConceptTone } from '@/lib/diagnosis/concept-tone-inference';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number, detail?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, detail: detail ?? null },
    { status },
  );
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const productId = params.id;
  if (!productId) return jsonError('product id required', 400);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      status: true,
      naverProductId: true,
      seoTitle: true,
      naver_title: true,
      naver_keywords: true,
      naver_description: true,
      keywords: true,
      targetKeywords: true,
      golden_keyword_score: true,
      detail_image_url: true,
      main_image_url: true,
      optionName: true,
      hasOptions: true,
      options: true,
      shipping_template_id: true,
      carrier_code: true,
      sku: true,
      brand: true,
      naverCategoryCode: true,
      originCode: true,
      margin: true,
      legalApproval: true,
      name: true,
      category: true,
    },
  });
  if (!product) return jsonError('product not found', 404, { productId });

  // Pull conceptTone for accurate category-group classification.
  let conceptTone: ConceptTone | undefined;
  const diag = await prisma.diagnosis.findUnique({
    where: { productId },
    select: { conceptTone: true },
  });
  if (diag) conceptTone = diag.conceptTone as unknown as ConceptTone;

  const toneDirective = mapCategoryToTone(conceptTone, {
    category: product.category ?? undefined,
    naverCategoryCode: product.naverCategoryCode,
    productName: product.name,
  });

  const input: PublishReadinessInput = {
    productId: product.id,
    status: product.status,
    naverProductId: product.naverProductId,
    seoTitle: product.seoTitle,
    naver_title: product.naver_title,
    naver_keywords: product.naver_keywords,
    naver_description: product.naver_description,
    keywords: product.keywords,
    targetKeywords: product.targetKeywords,
    golden_keyword_score: product.golden_keyword_score,
    detail_image_url: product.detail_image_url,
    main_image_url: product.main_image_url,
    optionName: product.optionName,
    hasOptions: product.hasOptions,
    options: product.options,
    shipping_template_id: product.shipping_template_id,
    carrier_code: product.carrier_code,
    sku: product.sku,
    brand: product.brand,
    naverCategoryCode: product.naverCategoryCode,
    originCode: product.originCode,
    margin: product.margin,
    legalApproval: product.legalApproval,
    toneDirective,
  };

  const result = evaluatePublishReadiness(input);
  return NextResponse.json({ ok: true, ...result });
}
