// /api/products/[id]/detail-strategy
// ============================================================================
// Detail-page strategy + SEO gap surfacing. Phase 3, handoff IMAGE_SEO item 5.
//   GET/POST — read-only. Decides whether the supplier DETAIL page is good
//   enough to use AS-IS (+ only fill the missing SEO copy/images) or should be
//   BUILT, and lists the unmet Naver-standard requirements (category / required
//   attributes like material/color / product name / tags / legal notice) as gaps
//   keyed the same way as the control-tower nextAction, so the operator sees
//   exactly what is missing.
//
// Read-only: no DB mutation, never touches Naver. Node runtime (Sharp reads the
// detail image to score it). Single-product drill (heavier than the matrix).
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assessImageQuality } from '@/lib/images/quality-classifier';
import { loadAndEvaluateProducts } from '@/lib/automation/load-publish-readiness';
import { validateForRegistration, type LocalProduct } from '@/lib/naver/product-builder';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Detail page is "good enough to keep" at/above this quality score.
const DETAIL_AS_IS_SCORE = 50;

type DetailStrategy = 'AS_IS' | 'BUILD';

interface Gap {
  key: 'fill_attributes' | 'fill_seo' | 'fill_notice' | 'resolve_validation' | 'build_detail';
  severity: 'blocker' | 'action';
  detail?: string;
}

async function handle(productId: string) {
  const dbProduct = await prisma.product.findUnique({
    where: { id: productId },
    include: { product_options: true },
  });
  if (!dbProduct) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  // ── Detail page quality (AS_IS vs BUILD) ────────────────────────────────────
  const detailUrl = dbProduct.detail_image_url;
  let detailQuality: { present: boolean; score: number; reasons: unknown[] } | null = null;
  let detailStrategy: DetailStrategy = 'BUILD';
  if (detailUrl && /^https?:\/\//i.test(detailUrl)) {
    try {
      const res = await fetch(detailUrl);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const a = await assessImageQuality(buf);
        detailQuality = { present: true, score: a.score, reasons: a.reasons };
        detailStrategy = a.score >= DETAIL_AS_IS_SCORE ? 'AS_IS' : 'BUILD';
      }
    } catch {
      // fetch/score failure → treat as no usable detail → BUILD
    }
  }

  // ── SEO readiness gaps (Naver standard) ─────────────────────────────────────
  // Rich SEO/notice field gaps from the publish-readiness engine.
  const [loaded] = await loadAndEvaluateProducts([productId]);
  const r = loaded?.result;

  // Required category attributes (e.g. material/color) from the register SoT.
  const product: LocalProduct = {
    ...dbProduct,
    additionalImages: dbProduct.additionalImages as unknown,
    keywords: dbProduct.keywords as unknown,
    tags: dbProduct.tags as unknown,
    product_options: dbProduct.product_options ?? null,
  };
  const validation = validateForRegistration(product, !!dbProduct.shipping_template_id, true);

  const gaps: Gap[] = [];
  if (validation.missingRequired.length > 0) {
    gaps.push({ key: 'fill_attributes', severity: 'action', detail: validation.missingRequired.join(', ') });
  }
  if (r && r.seoFieldsMissing.length > 0) {
    gaps.push({ key: 'fill_seo', severity: 'action', detail: r.seoFieldsMissing.join(', ') });
  }
  if (r && r.naverPayloadMissing.length > 0) {
    gaps.push({ key: 'fill_notice', severity: 'action', detail: r.naverPayloadMissing.join(', ') });
  }
  if (validation.errors.length > 0) {
    gaps.push({ key: 'resolve_validation', severity: 'blocker', detail: validation.errors.join('; ') });
  }
  if (detailStrategy === 'BUILD') {
    gaps.push({ key: 'build_detail', severity: 'action' });
  }

  return NextResponse.json({
    success: true,
    productId,
    detailStrategy,
    detailQuality,
    seo: {
      readinessGrade: validation.readinessGrade,
      readinessScore: validation.readinessScore,
      attributeGrade: validation.attributeGrade,
      canRegister: validation.canRegister,
      missingRequiredAttributes: validation.missingRequired,
      seoFieldsMissing: r?.seoFieldsMissing ?? [],
      naverPayloadMissing: r?.naverPayloadMissing ?? [],
      errors: validation.errors,
    },
    gaps,
    // AS_IS + only fill the gaps; BUILD = regenerate the detail page first.
    recommendation: detailStrategy === 'AS_IS' ? 'reuse_detail_fill_gaps' : 'build_detail_then_fill',
  });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(params.id);
}
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return handle(params.id);
}
