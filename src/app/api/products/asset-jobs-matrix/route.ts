// GET /api/products/asset-jobs-matrix
// ============================================================================
// READ-ONLY product x track matrix for the control tower.
//
// 2026-06-07 (IMAGE_SEO_STRATEGY_ENGINE, items 1+2) — SoT integration.
//   Previously this read ONLY asset_jobs, so products that were actually
//   registered/ready on Naver but had no asset_jobs rows (readinessGrade A/84)
//   showed risk/blocked/nextAction = null. Now the matrix is PRODUCT-driven:
//     - publish track = the readiness verdict (validateForRegistration), the
//       same one the Naver register/update dryRun uses (grade/score/missingRequired).
//     - image track  = asset_jobs overlay + asset presence.
//     - nextAction   = the operator's single most-important step (1-click href).
//   asset_jobs is now an OVERLAY: if its table/columns aren't migrated yet, the
//   image track degrades to asset-presence (the board still renders) instead of
//   blanking the whole widget.
// Never mutates.
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  computeControlTowerRow,
  OVERALL_RANK,
  type ControlTowerRow,
  type Overall,
  type ProductLine,
} from '@/lib/automation/control-tower-engine';
import type { ImageTier, RecommendedMode } from '@/lib/images/quality-classifier';
import type { LocalProduct } from '@/lib/naver/product-builder';
import { SEED_DNA_CARDS } from '@/lib/engine/category-dna';

export const dynamic = 'force-dynamic';

const WIP_LIMIT = 3;
const PRODUCT_LIMIT = 100; // newest DRAFT + all registered, bounded

// lane -> track for the asset_jobs overlay.
const LANE_TO_TRACK: Record<string, 'image' | 'publish'> = {
  generate: 'image',
  process:  'image',
  compose:  'image',
  review:   'publish',
  publish:  'publish',
};

interface ModeInfo { recommended: string | null; score: number | null; source: 'auto' | 'operator' | null }

async function hasAddressBook(): Promise<boolean> {
  try {
    const s = await prisma.storeSettings.findFirst({
      select: { releaseAddressId: true, returnAddressId: true },
    });
    const release = Number(s?.releaseAddressId);
    const ret = Number(s?.returnAddressId);
    return Number.isFinite(release) && Number.isFinite(ret) && release > 0 && ret > 0;
  } catch {
    return false;
  }
}

export async function GET() {
  // 1. Product set (SoT): newest DRAFT + every registered product, bounded.
  const products = await prisma.product.findMany({
    where: { OR: [{ status: 'DRAFT' }, { naverProductId: { not: null } }] },
    include: { product_options: true },
    orderBy: { updatedAt: 'desc' },
    take: PRODUCT_LIMIT,
  });

  if (products.length === 0) {
    return NextResponse.json({
      success: true,
      migrationPending: false,
      rows: [],
      wip: { count: 0, limit: WIP_LIMIT, over: false },
      counts: { risk: 0, attention: 0, caution: 0, ok: 0, none: 0 },
    });
  }

  const ids = products.map(p => p.id);
  const hasAddresses = await hasAddressBook();

  // 2. asset_jobs overlay (guarded — table may not be migrated; degrade, never blank).
  const imageJobsByProduct = new Map<string, string[]>();
  const publishJobsByProduct = new Map<string, string[]>();
  let wipCount = 0;
  try {
    const jobs = await prisma.assetJob.findMany({
      where: { productId: { in: ids } },
      select: { productId: true, lane: true, status: true },
    });
    for (const j of jobs) {
      if (j.status === 'in_progress') wipCount++;
      const track = LANE_TO_TRACK[j.lane];
      if (track === 'image') {
        const arr = imageJobsByProduct.get(j.productId) ?? [];
        arr.push(j.status); imageJobsByProduct.set(j.productId, arr);
      } else if (track === 'publish') {
        const arr = publishJobsByProduct.get(j.productId) ?? [];
        arr.push(j.status); publishJobsByProduct.set(j.productId, arr);
      }
    }
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    const msg = e instanceof Error ? e.message : String(e);
    if (!(code === 'P2021' || code === 'P2022' || /does not exist|relation .* does not exist/i.test(msg))) {
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
    // else: asset_jobs not migrated — overlay stays empty, presence drives image track.
  }

  // 3. Adaptive 3-mode badge + image strategy tier (guarded — columns may not
  //    be migrated). Both live on the Product row (tier inside quality_reasons).
  const modeById = new Map<string, ModeInfo>();
  const tierById = new Map<string, ImageTier>();
  const lineOverrideById = new Map<string, ProductLine>();
  const recommendedModeById = new Map<string, RecommendedMode | null>();
  const qualityScoreById = new Map<string, number | null>();
  const detailCuratedById = new Map<string, boolean>();
  const sourceDetailGoodById = new Map<string, boolean>();
  const mainImagePolicyById = new Map<string, string>();
  try {
    const modes = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, recommended_mode: true, quality_score: true, quality_reasons: true },
    });
    for (const p of modes) {
      const qr = (p.quality_reasons ?? null) as
        { modeSource?: string; imageTier?: ImageTier; line?: string; lineSource?: string; detailCurated?: boolean; sourceDetailGood?: boolean } | null;
      if (qr?.detailCurated === true) detailCuratedById.set(p.id, true);
      if (qr?.sourceDetailGood === true) sourceDetailGoodById.set(p.id, true);
      const recommended = p.recommended_mode ?? null;
      const source: ModeInfo['source'] =
        qr?.modeSource === 'operator' ? 'operator' : recommended ? 'auto' : null;
      modeById.set(p.id, { recommended, score: p.quality_score ?? null, source });
      if (qr?.imageTier) tierById.set(p.id, qr.imageTier);
      recommendedModeById.set(p.id, (recommended as RecommendedMode | null) ?? null);
      qualityScoreById.set(p.id, p.quality_score ?? null);
      // Operator line override wins over auto classification (handoff §4).
      if (qr?.lineSource === 'operator' && (qr.line === 'A' || qr.line === 'B')) {
        lineOverrideById.set(p.id, qr.line);
      }
    }
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    const msg = e instanceof Error ? e.message : String(e);
    if (!(code === 'P2021' || code === 'P2022' || /does not exist|column/i.test(msg))) throw e;
    // else: columns not migrated — leave modeById empty.
  }

  // C-4 main_image_policy — separate guarded query so its (possibly unmigrated)
  // column never breaks the working modes query above (#50 reverse-deploy safe).
  try {
    const policies = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, main_image_policy: true },
    });
    for (const p of policies) {
      if (p.main_image_policy) mainImagePolicyById.set(p.id, p.main_image_policy);
    }
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    const msg = e instanceof Error ? e.message : String(e);
    if (!(code === 'P2021' || code === 'P2022' || /does not exist|column/i.test(msg))) throw e;
    // else: main_image_policy not migrated — no overrides applied.
  }

  // C-9 intervention overlay (separate guarded query so the possibly-unmigrated
  // intervention columns never break the job-status overlay above, #50). The
  // latest awaiting_human IMAGE-track job per product names the precise card.
  // ALL active interventions per product (#62 — never mask one card with another,
  // #56). De-duplicated by type (one card per type; latest payload wins via desc).
  const interventionsById = new Map<string, Array<{ type: string; payload?: unknown }>>();
  const IMAGE_LANES = ['generate', 'process', 'compose'];
  try {
    const ijobs = await prisma.assetJob.findMany({
      where: {
        productId: { in: ids },
        status: 'awaiting_human',
        lane: { in: IMAGE_LANES },
        interventionType: { not: null },
      },
      select: { productId: true, interventionType: true, interventionPayload: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    for (const j of ijobs) {
      if (!j.interventionType) continue;
      const arr = interventionsById.get(j.productId) ?? [];
      if (arr.some((x) => x.type === j.interventionType)) continue; // one card per type
      arr.push({ type: j.interventionType, payload: j.interventionPayload ?? undefined });
      interventionsById.set(j.productId, arr);
    }
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    const msg = e instanceof Error ? e.message : String(e);
    if (!(code === 'P2021' || code === 'P2022' || /does not exist|column/i.test(msg))) throw e;
    // else: intervention columns not migrated — generic AUTH card stands (no regression).
  }

  // 3c. #62 — seeded-DNA set: a product whose Naver category has neither an
  //     active category_dna row NOR a canonical seed falls back to the neutral
  //     universal funnel. Guarded (table may be unmigrated) — degrade to seeds-only.
  const seededCodes = new Set<string>(Object.keys(SEED_DNA_CARDS));
  try {
    const dnaRows = await prisma.categoryDna.findMany({
      where: { status: 'active' },
      select: { categoryCode: true },
    });
    for (const r of dnaRows) seededCodes.add(r.categoryCode);
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    const msg = e instanceof Error ? e.message : String(e);
    if (!(code === 'P2021' || code === 'P2022' || /does not exist|relation .* does not exist|column/i.test(msg))) throw e;
    // else: category_dna not migrated — seededCodes stays seeds-only (still safe).
  }

  // 4. Compute each row via the SoT engine.
  const counts: Record<Overall, number> = { risk: 0, attention: 0, caution: 0, ok: 0, none: 0 };
  const rows = products.map((dbProduct) => {
    const product: LocalProduct = {
      ...dbProduct,
      additionalImages: dbProduct.additionalImages as unknown,
      keywords: dbProduct.keywords as unknown,
      tags: dbProduct.tags as unknown,
      product_options: dbProduct.product_options ?? null,
    };
    const row: ControlTowerRow = computeControlTowerRow(product, {
      registered: !!dbProduct.naverProductId,
      hasShippingTemplate: !!dbProduct.shipping_template_id,
      hasAddresses,
      imageJobStatuses: imageJobsByProduct.get(dbProduct.id) ?? [],
      publishJobStatuses: publishJobsByProduct.get(dbProduct.id) ?? [],
      imageTier: tierById.get(dbProduct.id),
      recommendedMode: recommendedModeById.get(dbProduct.id) ?? null,
      qualityScore: qualityScoreById.get(dbProduct.id) ?? null,
      lineOverride: lineOverrideById.get(dbProduct.id) ?? null,
      naverStatusType: (dbProduct as { naver_status_type?: string | null }).naver_status_type ?? null,
      detailCurated: detailCuratedById.get(dbProduct.id) ?? false,
      hasSourceDetail: !!(dbProduct as { source_detail_url?: string | null }).source_detail_url,
      sourceDetailGood: sourceDetailGoodById.get(dbProduct.id) ?? false,
      mainImagePolicy: mainImagePolicyById.get(dbProduct.id) ?? null,
      imageJobIntervention: interventionsById.get(dbProduct.id)?.[0] ?? null,
      imageJobInterventionsExtra: interventionsById.get(dbProduct.id)?.slice(1) ?? [],
      dnaUnseeded: (() => {
        const c = (dbProduct.naverCategoryCode ?? '').trim();
        return !c || !seededCodes.has(c);
      })(),
    });
    counts[row.overall]++;

    // Backward-compatible flat `tracks` for the 4-column board; line/ops are
    // cross-cutting signals wired in a later phase.
    return {
      productId: row.productId,
      name: row.name,
      tracks: { image: row.image.status, publish: row.publish.status, line: 'none' as const, ops: 'none' as const },
      publish: row.publish,
      image: row.image,
      line: row.line,
      applyStatus: row.applyStatus,
      actionQueue: row.actionQueue,
      mode: modeById.get(row.productId) ?? { recommended: null, score: null, source: null },
      overall: row.overall,
      nextAction: row.nextAction,
    };
  });

  // 5. Pin risk → attention → caution → ok.
  rows.sort((a, b) => OVERALL_RANK[a.overall] - OVERALL_RANK[b.overall] || a.name.localeCompare(b.name));

  return NextResponse.json({
    success: true,
    migrationPending: false,
    rows,
    wip: { count: wipCount, limit: WIP_LIMIT, over: wipCount > WIP_LIMIT },
    counts,
  });
}
