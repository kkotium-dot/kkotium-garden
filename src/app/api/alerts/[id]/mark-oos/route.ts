// /api/alerts/[id]/mark-oos
// ============================================================================
// Sprint 6-A UI Phase 3: mark the product as OUT_OF_STOCK in our DB and
// optionally flip the Naver Commerce listing to OUTOFSTOCK as well.
//
// Inputs:
//   - alsoNaver: pass via query `?alsoNaver=1` or JSON body `{ alsoNaver: true }`.
//     Default: false (DB-only — safest, seller inspects Naver side manually).
//
// Effects:
//   1. Product.status = 'OUT_OF_STOCK' (always)
//   2. LowStockAlert.resolvedAt = now, resolutionNote (always)
//   3. When alsoNaver=true AND product has naverProductId:
//      - Call Commerce API stockQuantity=0 (auto-flips statusType to OUTOFSTOCK).
//      - DB transaction is committed regardless of Naver outcome — Naver flip
//        is best-effort. Response carries `naverFlipped: boolean` so the
//        client can show a partial-success toast.
//
// Response shape:
//   {
//     data:         <updated alert row>,
//     naverFlipped: boolean,   // true only if alsoNaver=true AND API succeeded
//     naverError?:  string,    // present when alsoNaver requested but failed
//   }
//
// Idempotent: re-calling on a resolved alert returns the row unchanged. The
// naverFlipped/naverError fields are not produced on the idempotent path.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setProductOutOfStock } from '@/lib/naver/api-client';

export const dynamic = 'force-dynamic';

// Korean resolution notes — separated for work principle #29 (c).
const RESOLUTION_NOTE_APP_ONLY = '품절 처리 — 앱 상태만 변경';
const RESOLUTION_NOTE_WITH_NAVER = '품절 처리 — 앱 + 네이버 스토어';
const RESOLUTION_NOTE_NAVER_FAILED = '품절 처리 — 앱 변경, 네이버 반영 실패';

async function readAlsoNaverFlag(req: NextRequest): Promise<boolean> {
  // Query param takes precedence.
  const q = req.nextUrl.searchParams.get('alsoNaver');
  if (q === '1' || q === 'true') return true;
  if (q === '0' || q === 'false') return false;
  // Fall back to JSON body.
  try {
    const body = await req.json();
    return body?.alsoNaver === true;
  } catch {
    return false;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: 'missing id' }, { status: 400 });
  }

  const alsoNaver = await readAlsoNaverFlag(req);

  const alert = await prisma.lowStockAlert.findUnique({
    where: { id },
    select: { id: true, productId: true, resolvedAt: true },
  });
  if (!alert) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (alert.resolvedAt) {
    // Idempotent: already resolved.
    return NextResponse.json({ data: alert, naverFlipped: false });
  }

  // Look up the Naver product number only when we may need it.
  let naverProductId: string | null = null;
  if (alsoNaver) {
    const product = await prisma.product.findUnique({
      where: { id: alert.productId },
      select: { naverProductId: true },
    });
    naverProductId = product?.naverProductId ?? null;
  }

  // Best-effort Naver flip. Run BEFORE the DB transaction so a failure here
  // does not leave a confusing mid-state (DB-resolved but seller thinks
  // Naver was flipped). On failure we still resolve the alert in DB.
  let naverFlipped = false;
  let naverError: string | null = null;
  if (alsoNaver && naverProductId) {
    try {
      await setProductOutOfStock(naverProductId);
      naverFlipped = true;
    } catch (err) {
      naverError = err instanceof Error ? err.message : String(err);
    }
  } else if (alsoNaver && !naverProductId) {
    naverError = 'product has no naverProductId — listing not registered yet';
  }

  const note =
    !alsoNaver        ? RESOLUTION_NOTE_APP_ONLY :
    naverFlipped      ? RESOLUTION_NOTE_WITH_NAVER :
                        RESOLUTION_NOTE_NAVER_FAILED;

  await prisma.$transaction([
    prisma.product.update({
      where: { id: alert.productId },
      data: { status: 'OUT_OF_STOCK' },
    }),
    prisma.lowStockAlert.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        resolutionNote: note,
      },
    }),
  ]);

  const updated = await prisma.lowStockAlert.findUnique({ where: { id } });
  return NextResponse.json({
    data: updated,
    naverFlipped,
    ...(naverError ? { naverError } : {}),
  });
}
