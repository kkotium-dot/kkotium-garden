// GET /api/naver/products/[productId]/inspect
// ============================================================================
// READ-ONLY Naver number/shape diagnostic (T2.5b). NEVER mutates — GET only.
//
// Problem it resolves:
//   We store ONE `naverProductId`, but a Naver listing has TWO numbers:
//     - originProductNo                → target of PUT /v2/products/origin-products/{no}
//     - channelProductNo (smartstoreChannelProductNo) → storefront URL id
//   The register route saved `result.productNo ?? result.originProductNo`, and
//   the storefront URL works with the stored id (13564133057), so the stored id
//   may actually be the CHANNEL number. If so, stock/update PUTs to
//   /origin-products/{channelNo} would mis-target. This route probes BOTH
//   endpoints to settle which kind the stored number is, and to resolve the
//   true originProductNo (the safe PUT target) — all without a single write.
//
// Usage:
//   GET /api/naver/products/{internalProductId}/inspect      (loads naverProductId from DB)
//   GET /api/naver/products/_/inspect?probe={rawNaverNumber}  (DB-less raw probe, e.g. 13564133057)
//
// Output (read-only): which endpoint returned 200/404, numberKind, resolved
// originProductNo / channelProductNo, the live originProduct shape (summary +
// full raw object for PUT-body eyeballing), and an optional app<->Naver drift
// diff via diffNaverProduct. No 4xx body can ever trigger a write.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { naverRequest, NaverApiError } from '@/lib/naver/api-client';

export const dynamic = 'force-dynamic';

// App Product.status -> expected Naver statusType, for drift comparison.
// DRAFT has no live counterpart (unregistered) and is intentionally absent.
const APP_TO_NAVER_STATUS: Record<string, string> = {
  ACTIVE:       'SALE',
  OUT_OF_STOCK: 'OUTOFSTOCK',
  INACTIVE:     'SUSPENSION',
};

interface ProbeResult {
  endpoint: string;
  ok: boolean;
  status: number | null;
  error?: string;
  body?: any;
}

// Read-only GET probe — never throws; captures HTTP status (404 vs other) so
// the caller can distinguish "wrong number kind" (404) from a transport error.
async function probe(path: string): Promise<ProbeResult> {
  try {
    const body = await naverRequest<any>('GET', path);
    return { endpoint: path, ok: true, status: 200, body };
  } catch (e: unknown) {
    if (e instanceof NaverApiError) {
      return { endpoint: path, ok: false, status: e.diagnostic.status ?? null, error: e.message };
    }
    return { endpoint: path, ok: false, status: null, error: e instanceof Error ? e.message : String(e) };
  }
}

// Extract the originProduct block from either GET shape (origin-products returns
// { originProduct }, some shapes inline the fields at the top level).
function pickOriginProduct(body: any): any | null {
  if (!body || typeof body !== 'object') return null;
  if (body.originProduct && typeof body.originProduct === 'object') return body.originProduct;
  if (typeof body.name === 'string' && typeof body.salePrice === 'number') return body;
  return null;
}

function summariseOrigin(op: any): Record<string, unknown> | null {
  if (!op || typeof op !== 'object') return null;
  return {
    name:           op.name ?? null,
    salePrice:      op.salePrice ?? null,
    stockQuantity:  op.stockQuantity ?? null,
    statusType:     op.statusType ?? null,
    leafCategoryId: op.leafCategoryId ?? null,
    representativeImageUrl:
      op?.images?.representativeImage?.url ?? op?.images?.representativeImageUrl ?? null,
    topLevelKeys:   Object.keys(op).sort(),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { productId: string } },
) {
  const probeRaw = req.nextUrl.searchParams.get('probe');

  // 1. Resolve the Naver number to inspect. A raw ?probe= takes precedence so
  //    Desktop can test a bare number (e.g. 13564133057) without a DB row.
  let naverNo = '';
  let dbProduct:
    | { id: string; name: string; naver_title: string | null; salePrice: number; naverProductId: string | null; status: string }
    | null = null;

  if (probeRaw && probeRaw.trim()) {
    naverNo = probeRaw.trim();
  } else {
    dbProduct = await prisma.product.findUnique({
      where: { id: params.productId },
      select: { id: true, name: true, naver_title: true, salePrice: true, naverProductId: true, status: true },
    });
    if (!dbProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found (internal id). Pass ?probe=<naverNumber> to probe a raw id.' },
        { status: 404 },
      );
    }
    if (!dbProduct.naverProductId) {
      return NextResponse.json(
        { success: false, error: '이 상품은 아직 네이버에 등록되지 않았습니다 (naverProductId 없음).', stage: 'NOT_REGISTERED' },
        { status: 409 },
      );
    }
    naverNo = dbProduct.naverProductId;
  }

  // 2. Read-only probes of BOTH endpoints (GET only — zero mutation).
  const originProbe  = await probe(`/v2/products/origin-products/${naverNo}`);
  const channelProbe = await probe(`/v1/products/channel-products/${naverNo}`);

  const originBody  = originProbe.ok  ? originProbe.body  : null;
  const channelBody = channelProbe.ok ? channelProbe.body : null;

  const originOP  = pickOriginProduct(originBody);
  const channelOP = pickOriginProduct(channelBody);
  const channelInner = (channelBody?.channelProduct ?? channelBody) as any;

  // 3. Resolve the canonical numbers from whichever probe(s) succeeded.
  // originProductNo: prefer an explicit field on the channel body, else (when
  // the origin probe itself succeeded) the probed number is already an origin no.
  const resolvedOriginProductNo: string | null =
    (channelBody?.originProductNo != null ? String(channelBody.originProductNo) : null) ??
    (channelBody?.originProduct?.originProductNo != null ? String(channelBody.originProduct.originProductNo) : null) ??
    (originProbe.ok ? naverNo : null);

  const resolvedChannelProductNo: string | null =
    (channelInner?.channelProductNo != null ? String(channelInner.channelProductNo) : null) ??
    (channelInner?.smartstoreChannelProductNo != null ? String(channelInner.smartstoreChannelProductNo) : null) ??
    (channelProbe.ok ? naverNo : null);

  // 4. Classify the stored number by which endpoint accepted it.
  let numberKind: 'ORIGIN' | 'CHANNEL' | 'BOTH' | 'UNKNOWN';
  if (originProbe.ok && channelProbe.ok)      numberKind = 'BOTH';
  else if (originProbe.ok)                    numberKind = 'ORIGIN';
  else if (channelProbe.ok)                   numberKind = 'CHANNEL';
  else                                        numberKind = 'UNKNOWN';

  // 5. PUT-target safety: the correct origin-products PUT target + whether the
  //    stored id equals it. A mismatch means stock/update PUTs would mis-target.
  const putTarget = resolvedOriginProductNo
    ? `/v2/products/origin-products/${resolvedOriginProductNo}`
    : null;
  const storedIsCorrectPutTarget =
    resolvedOriginProductNo != null && resolvedOriginProductNo === naverNo;

  const putTargetWarning =
    storedIsCorrectPutTarget
      ? null
      : numberKind === 'CHANNEL'
        ? '저장된 naverProductId가 채널상품번호로 판명 → PUT은 originProductNo로 보내야 함 (번호 교정 선행 필요).'
        : numberKind === 'UNKNOWN'
          ? '두 엔드포인트 모두 비200 — 번호 종류 확정 불가 (404=삭제/오번호 가능). 추측 교정 금지.'
          : '저장 번호와 originProductNo 불일치 가능 — 육안 확인 요망.';

  const op = originOP ?? channelOP;

  // 6. Optional app<->Naver drift, computed INLINE from the already-fetched
  //    originProduct — read-only, no extra request. Mirrors diffNaverProduct's
  //    field-compare semantics (that helper already covers statusType; this
  //    inline path must include it too so a SUSPENSION listing isn't reported
  //    as inSync:true — the false-green this route previously had).
  let drift: unknown = null;
  if (dbProduct && op) {
    const expectedName = dbProduct.naver_title ?? dbProduct.name;
    const expectedStatus = APP_TO_NAVER_STATUS[dbProduct.status] ?? null;
    const naverName   = typeof op.name === 'string' ? op.name : null;
    const naverPrice  = typeof op.salePrice === 'number' ? op.salePrice : null;
    const naverStatus = typeof op.statusType === 'string' ? op.statusType : null;
    const diffs: Array<{ field: string; naver: unknown; app: unknown }> = [];
    if (naverName !== expectedName)         diffs.push({ field: 'name', naver: naverName, app: expectedName });
    if (naverPrice !== dbProduct.salePrice) diffs.push({ field: 'salePrice', naver: naverPrice, app: dbProduct.salePrice });
    // Skip status drift only when the app status has no Naver mapping (DRAFT/unknown).
    if (expectedStatus !== null && naverStatus !== expectedStatus)
      diffs.push({ field: 'statusType', naver: naverStatus, app: expectedStatus });
    drift = { inSync: diffs.length === 0, diffs };
  }

  // Cache the live Naver statusType so applyStatus.publishState (control tower)
  // is honest about the listing state (SALE/SUSPENSION). Local DB write only —
  // Naver mutate stays 0. Best-effort: a cache failure must not fail inspect.
  const liveStatusType = op && typeof op.statusType === 'string' ? op.statusType : null;
  if (dbProduct?.id && liveStatusType) {
    try {
      await prisma.product.update({
        where: { id: dbProduct.id },
        data: { naver_status_type: liveStatusType },
      });
    } catch { /* cache write is best-effort */ }
  }

  return NextResponse.json({
    success: true,
    readOnly: true,
    inputNaverProductId: naverNo,
    probeMode: probeRaw ? 'RAW' : 'DB',
    internalProductId: dbProduct?.id ?? null,
    localStatus: dbProduct?.status ?? null,
    numberKind,
    probes: {
      origin:  { endpoint: originProbe.endpoint,  ok: originProbe.ok,  status: originProbe.status,  error: originProbe.error ?? null },
      channel: { endpoint: channelProbe.endpoint, ok: channelProbe.ok, status: channelProbe.status, error: channelProbe.error ?? null },
    },
    resolvedOriginProductNo,
    resolvedChannelProductNo,
    putTarget,
    storedIsCorrectPutTarget,
    putTargetWarning,
    // Live originProduct shape — summary + full raw object so Desktop can
    // eyeball whether the GET body is PUT-body compatible (GET-merge premise).
    originProductSummary: summariseOrigin(op),
    originProductRaw: op ?? null,
    smartstoreChannelProductRaw: channelBody?.channelProduct ?? null,
    drift,
  });
}
