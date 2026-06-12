// /api/products/[id]/assets/action
// ============================================================================
// Asset-browser operator actions (asset loading v2, lane 1). All reversible —
// NO Naver PUT, NO publish, NO storage delete. The Naver listing is only ever
// touched by an explicit register/update route (#46 irreversibility gate).
//
//   set_main   — promote an asset to Product.mainImage. The previous main is
//                parked into extra_images ({source:'previous_main'}) so nothing
//                is lost; reversible by promoting the parked one back.
//   add_extra  — append an asset URL to Product.extra_images (deduped). The
//                additional-image slots (Naver image 2~10) are filled here.
//   archive    — relocate a superseded asset to {productId}/archive/. Blocked
//                for the current main (reassign first). Any extra_images entry
//                pointing at it is removed in the SAME update so no stored URL
//                is left dangling (rule: preserve existing URLs). Reversible (move-back;
//                nothing deleted).
//
// extra_images writes are guarded for the pre-migration window (P2022/P2021):
// a missing column degrades to a `pending` flag instead of a 500 (#50/#46),
// matching apply-composite / finish-image.
// Authority: docs/handoff/HANDOFF_asset_system_v2_2026-06-12.md (lane 1).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { moveAutomationAsset } from '@/lib/storage/automation-storage';
import { parseFidelity } from '@/lib/fidelity/product-fidelity';
import { PRODUCT_COMPOSITE } from '@/lib/jobs/job-type-routing';
import {
  setJobIntervention,
  buildFidelityCheckPayload,
  INTERVENTION_FIDELITY_CHECK,
} from '@/lib/jobs/intervention';

/**
 * Pre-publish fidelity-check gate (#56): when the operator finalizes the
 * representative / additional images (set_main / add_extra), seed a
 * fidelity_check card IF the product carries a fidelity card. Idempotent
 * (setJobIntervention reuses the latest open image-track job) and best-effort
 * (never fails the action). Products without a fidelity card get no gate.
 */
async function seedFidelityGate(productId: string): Promise<string | null> {
  try {
    const row = await prisma.product.findUnique({ where: { id: productId }, select: { fidelity: true } });
    const f = parseFidelity(row?.fidelity);
    if (!f) return null;
    const seeded = await setJobIntervention({
      productId,
      jobType: PRODUCT_COMPOSITE,
      type: INTERVENTION_FIDELITY_CHECK,
      payload: buildFidelityCheckPayload(productId, f),
      tool: 'review',
      // Never hijack an open firefly_drop job (same jobType) — reuse only an
      // existing fidelity_check job, else create a fresh one.
      matchInterventionType: true,
    });
    return seeded?.jobId ?? null;
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AssetAction = 'set_main' | 'add_extra' | 'archive';

interface ActionBody {
  action?: AssetAction;
  /** Canonical storage path ({productId}/{stage}/{file}) — required for archive. */
  path?: string;
  /** Public URL of the target asset. */
  publicUrl?: string;
  /** Optional human label kept on the extra_images entry. */
  label?: string;
}

interface ExtraEntry {
  url: string;
  source?: string;
  label?: string | null;
  [k: string]: unknown;
}

/** Read extra_images as an array of normalized {url,...} entries (tolerates
 *  plain-string legacy entries). */
function readExtras(value: Prisma.JsonValue | null | undefined): ExtraEntry[] {
  if (!Array.isArray(value)) return [];
  const out: ExtraEntry[] = [];
  for (const e of value) {
    if (typeof e === 'string') out.push({ url: e });
    else if (e && typeof e === 'object' && typeof (e as { url?: unknown }).url === 'string') {
      out.push(e as ExtraEntry);
    }
  }
  return out;
}

function isPrismaColumnMissing(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    (e.code === 'P2022' || e.code === 'P2021')
  );
}

function basenameOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i >= 0 ? path.slice(i + 1) : path;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id: productId } = params;

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json({ success: false, error: 'JSON 본문이 필요합니다' }, { status: 400 });
  }

  const action = body.action;
  const publicUrl = (body.publicUrl ?? '').trim();
  if (action !== 'set_main' && action !== 'add_extra' && action !== 'archive') {
    return NextResponse.json(
      { success: false, error: `잘못된 action: ${String(action)}` },
      { status: 400 },
    );
  }
  if (!publicUrl) {
    return NextResponse.json({ success: false, error: 'publicUrl이 필요합니다' }, { status: 400 });
  }

  // Load the current product image state once.
  let current: { mainImage: string | null; extra_images: Prisma.JsonValue | null } | null;
  try {
    current = await prisma.product.findUnique({
      where: { id: productId },
      select: { mainImage: true, extra_images: true },
    });
  } catch (e) {
    // extra_images column missing → fall back to mainImage-only read.
    if (isPrismaColumnMissing(e)) {
      current = await prisma.product
        .findUnique({ where: { id: productId }, select: { mainImage: true } })
        .then((p) => (p ? { mainImage: p.mainImage, extra_images: null } : null));
    } else {
      throw e;
    }
  }
  if (!current) {
    return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다' }, { status: 404 });
  }

  // ── set_main ──────────────────────────────────────────────────────────────
  if (action === 'set_main') {
    if (current.mainImage === publicUrl) {
      return NextResponse.json({ success: true, productId, mainImage: publicUrl, noop: true });
    }
    const prevMain = current.mainImage;
    // Park the previous main into extra_images (deduped) so it is not lost.
    let extrasPending = false;
    let parked = false;
    if (prevMain) {
      try {
        const extras = readExtras(current.extra_images);
        if (!extras.some((e) => e.url === prevMain)) {
          extras.push({ url: prevMain, source: 'previous_main', label: null });
          await prisma.product.update({
            where: { id: productId },
            data: { extra_images: extras as unknown as Prisma.InputJsonValue },
          });
          parked = true;
        }
      } catch (e) {
        if (isPrismaColumnMissing(e)) extrasPending = true;
        else throw e;
      }
    }
    await prisma.product.update({ where: { id: productId }, data: { mainImage: publicUrl } });
    const fidelityGateJobId = await seedFidelityGate(productId);
    return NextResponse.json({
      success: true,
      productId,
      action,
      mainImage: publicUrl,
      parkedPreviousMain: parked,
      extrasPending,
      fidelityGateJobId,
    });
  }

  // ── add_extra ─────────────────────────────────────────────────────────────
  if (action === 'add_extra') {
    try {
      const extras = readExtras(current.extra_images);
      if (extras.some((e) => e.url === publicUrl)) {
        return NextResponse.json({ success: true, productId, action, count: extras.length, noop: true });
      }
      extras.push({ url: publicUrl, source: 'manual_pick', label: body.label ?? null });
      await prisma.product.update({
        where: { id: productId },
        data: { extra_images: extras as unknown as Prisma.InputJsonValue },
      });
      const fidelityGateJobId = await seedFidelityGate(productId);
      return NextResponse.json({ success: true, productId, action, count: extras.length, fidelityGateJobId });
    } catch (e) {
      if (isPrismaColumnMissing(e)) {
        return NextResponse.json({ success: false, action, extrasPending: true, error: 'extra_images 컬럼 미마이그레이션' }, { status: 409 });
      }
      throw e;
    }
  }

  // ── archive ─────────────────────────────────────────────────────────────
  // Relocate to {productId}/archive/. Blocked for the current main. De-reference
  // from extra_images first so no stored URL dangles after the move.
  const srcPath = (body.path ?? '').trim();
  if (!srcPath) {
    return NextResponse.json({ success: false, error: 'archive에는 path가 필요합니다' }, { status: 400 });
  }
  if (current.mainImage === publicUrl) {
    return NextResponse.json(
      { success: false, error: '대표컷은 아카이브할 수 없습니다. 다른 컷을 대표로 지정한 뒤 다시 시도하세요.' },
      { status: 409 },
    );
  }
  if (srcPath.includes('/archive/')) {
    return NextResponse.json({ success: true, productId, action, noop: true, message: '이미 아카이브됨' });
  }

  // De-reference from extra_images BEFORE the move (so a failed move leaves the
  // DB pointing at the still-valid original, never at a moved/dead URL).
  let dereferenced = false;
  let extrasPending = false;
  try {
    const extras = readExtras(current.extra_images);
    const kept = extras.filter((e) => e.url !== publicUrl);
    if (kept.length !== extras.length) {
      await prisma.product.update({
        where: { id: productId },
        data: { extra_images: kept as unknown as Prisma.InputJsonValue },
      });
      dereferenced = true;
    }
  } catch (e) {
    if (isPrismaColumnMissing(e)) extrasPending = true;
    else throw e;
  }

  const destPath = `${productId}/archive/${basenameOf(srcPath)}`;
  try {
    const moved = await moveAutomationAsset(srcPath, destPath);
    return NextResponse.json({
      success: true,
      productId,
      action,
      from: srcPath,
      path: moved.path,
      publicUrl: moved.publicUrl,
      dereferenced,
      extrasPending,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, action, error: `아카이브 이동 실패: ${msg}`, dereferenced },
      { status: 502 },
    );
  }
}
