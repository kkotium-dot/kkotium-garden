// /api/products/[id]/assets/export
// ============================================================================
// Per-product asset ZIP export (authority §4.2: "1 product = 1 zip"). Streams
// every stored asset for the product into a single ZIP, organized as
// `{stage}/{convention-filename}` so the operator unpacks one product's assets
// into a clean stage tree that mirrors Supabase ({pid}/{stage}/) and Adobe CC
// (KKOTIUM_GARDEN/{NN_stage}/). Entry names follow the download convention
// (§4.1): {YYYYMMDD-HHmm}__{slug}__{stage}__{variant}.{ext}.
//
// GET only — read-only, no DB mutation, no Naver, fully reversible. Node runtime
// (Buffer + the dependency-free STORE-method zip writer).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listProductAssets, type ProductAssetEntry } from '@/lib/storage/automation-storage';
import { ZipStore } from '@/lib/storage/zip-store';
import { buildDownloadName, parseStoredFileName, slugify, stampToken } from '@/lib/storage/download-naming';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Fetch a public asset URL into a Buffer, or null on any failure (a single
// unreachable object must not abort the whole export).
async function fetchAsset(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id: productId } = params;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true },
  });
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  const slug = slugify(product.name, productId.slice(0, 8));

  let assets: ProductAssetEntry[];
  try {
    assets = await listProductAssets(productId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'list failed';
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
  if (assets.length === 0) {
    return NextResponse.json({ success: false, error: 'no assets to export' }, { status: 404 });
  }

  const zip = new ZipStore();
  let added = 0;
  // Bounded concurrency so a large product (hundreds of assets) does not open
  // hundreds of sockets at once.
  const BATCH = 8;
  for (let i = 0; i < assets.length; i += BATCH) {
    const batch = assets.slice(i, i + BATCH);
    const buffers = await Promise.all(batch.map((a) => fetchAsset(a.publicUrl)));
    batch.forEach((a, j) => {
      const buf = buffers[j];
      if (!buf) return;
      // ProductAssetEntry carries the full `path` ({pid}/{stage}/{file}); derive
      // the bare filename for the variant/ext parse.
      const baseName = a.path.slice(a.path.lastIndexOf('/') + 1);
      const { variant, ext } = parseStoredFileName(baseName);
      const createdMs = Date.parse(a.createdAt);
      const date = Number.isFinite(createdMs) && createdMs > 0 ? new Date(createdMs) : new Date();
      const entryName = `${a.stage}/${buildDownloadName({ date, slug, stage: a.stage, variant, ext })}`;
      zip.add(entryName, buf, date);
      added += 1;
    });
  }

  if (added === 0) {
    return NextResponse.json({ success: false, error: 'all assets were unreachable' }, { status: 502 });
  }

  const body = zip.build();
  const zipName = `${slug}__assets__${stampToken(new Date())}.zip`;
  // Copy into a plain Uint8Array<ArrayBuffer> (NextResponse BodyInit does not
  // accept a Node Buffer<ArrayBufferLike> directly).
  const out = new Uint8Array(body);

  return new NextResponse(out, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
      'Content-Length': String(body.length),
      'Cache-Control': 'no-store',
      'X-Asset-Count': String(added),
    },
  });
}
