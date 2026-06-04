// src/lib/automation/load-publish-readiness.ts
//
// 2026-06-04 — Shared loader + evaluator for publish-readiness.
//
// Single source of truth for "load Product(+Diagnosis) → map tone → evaluate".
// Both the single-product route (/api/products/[id]/publish-readiness) and the
// batch route (/api/products/publish-readiness) call this, so the verdict logic
// can never drift between them (HANDOFF_publish_control_tower §2 STEP A).
//
// N+1 guard: Diagnosis rows are fetched once via `productId in (...)` and mapped,
// never per-product in a loop.
//
// Pure-ish module: the only IO is two Prisma reads. No mutation, no external API.

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  evaluatePublishReadiness,
  type PublishReadinessInput,
  type PublishReadinessResult,
} from './publish-readiness';
import { mapCategoryToTone } from './category-tone-mapper';
import type { ConceptTone } from '@/lib/diagnosis/concept-tone-inference';

// The Product columns publish-readiness needs. Kept in one place so the single
// and batch routes select identically (no drift).
const PRODUCT_SELECT = {
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
  courierCode: true,
  shippingFee: true,
  sku: true,
  brand: true,
  naverCategoryCode: true,
  originCode: true,
  margin: true,
  legalApproval: true,
  name: true,
  category: true,
  // extra display fields used by the control tower UI (not by the engine)
  salePrice: true,
  supplierPrice: true,
  naver_origin: true,
  naver_manufacturer: true,
  naver_as_info: true,
  naver_tax_type: true,
  naver_delivery_info: true,
  naver_exchange_info: true,
  naver_refund_info: true,
} satisfies Prisma.ProductSelect;

// Display extras the control tower needs alongside the engine verdict.
export interface PublishReadinessDisplayExtras {
  name: string;
  mainImage: string | null;
  margin: number | null;
  salePrice: number | null;
  supplierPrice: number | null;
}

export interface PublishReadinessLoaded {
  result: PublishReadinessResult;
  display: PublishReadinessDisplayExtras;
}

type ProductRow = Prisma.ProductGetPayload<{ select: typeof PRODUCT_SELECT }>;

function buildInput(
  product: ProductRow,
  conceptTone: ConceptTone | undefined,
): PublishReadinessInput {
  const toneDirective = mapCategoryToTone(conceptTone, {
    category: product.category ?? undefined,
    naverCategoryCode: product.naverCategoryCode,
    productName: product.name,
  });

  return {
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
    courierCode: product.courierCode,
    shippingFee: product.shippingFee,
    sku: product.sku,
    brand: product.brand,
    naverCategoryCode: product.naverCategoryCode,
    originCode: product.originCode,
    margin: product.margin,
    legalApproval: product.legalApproval,
    toneDirective,
    naver_origin: product.naver_origin,
    naver_manufacturer: product.naver_manufacturer,
    naver_as_info: product.naver_as_info,
    naver_tax_type: product.naver_tax_type,
    naver_delivery_info: product.naver_delivery_info,
    naver_exchange_info: product.naver_exchange_info,
    naver_refund_info: product.naver_refund_info,
  };
}

/**
 * Load N products (+ their Diagnosis), map tone, and evaluate publish-readiness.
 * Order of the returned array follows the order of `productIds` (missing ids are
 * skipped). Single-product callers pass a 1-element array.
 */
export async function loadAndEvaluateProducts(
  productIds: string[],
): Promise<PublishReadinessLoaded[]> {
  if (productIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: PRODUCT_SELECT,
  });

  // N+1 guard: one query for all diagnoses, then map by productId.
  const diagnoses = await prisma.diagnosis.findMany({
    where: { productId: { in: productIds } },
    select: { productId: true, conceptTone: true },
  });
  const toneByProduct = new Map<string, ConceptTone>();
  for (const d of diagnoses) {
    if (d.conceptTone != null) {
      toneByProduct.set(d.productId, d.conceptTone as unknown as ConceptTone);
    }
  }

  const byId = new Map<string, ProductRow>();
  for (const p of products) byId.set(p.id, p);

  const out: PublishReadinessLoaded[] = [];
  for (const id of productIds) {
    const product = byId.get(id);
    if (!product) continue; // missing id — skip (caller decides 404 vs partial)
    const input = buildInput(product, toneByProduct.get(id));
    const result = evaluatePublishReadiness(input);
    out.push({
      result,
      display: {
        name: product.name,
        mainImage: product.main_image_url,
        margin: product.margin,
        salePrice: product.salePrice,
        supplierPrice: product.supplierPrice,
      },
    });
  }
  return out;
}

/**
 * Resolve a set of DRAFT product ids for the batch endpoint.
 * Returns ids only (cheap) so the heavy select happens once in
 * loadAndEvaluateProducts. Newest-first for stable UI ordering.
 */
export async function listDraftProductIds(limit: number): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { status: 'DRAFT', naverProductId: null },
    select: { id: true },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
  return rows.map((r) => r.id);
}
