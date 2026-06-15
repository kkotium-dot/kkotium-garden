// /api/products/[id]/assets/classify
// ============================================================================
// Preflight stage classification (authority §8). The asset browser POSTs the
// picked file here BEFORE upload to get a CONTENT-AWARE stage recommendation
// (filename hint + Sharp metadata: alpha / aspect ratio / resolution) so the
// confirm chip can show the inferred stage, a confidence level, any quality
// warning, and a name-vs-content conflict — letting the operator confirm or
// override into the exact subfolder.
//
// READ-ONLY: reads the bytes, stores NOTHING, mutates no DB, no Naver. Fully
// reversible (it is a no-op). Node runtime (Sharp metadata).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { classifyAsset } from '@/lib/storage/asset-classify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: 'multipart/form-data 본문이 필요합니다' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'file 필드(이미지)가 필요합니다' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, error: '파일이 너무 큽니다' }, { status: 413 });
  }

  let width: number | null = null;
  let height: number | null = null;
  let hasAlpha: boolean | null = null;
  let channels: number | null = null;
  let isOpaque: boolean | null = null;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const meta = await sharp(buffer).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
    hasAlpha = meta.hasAlpha ?? null;
    channels = meta.channels ?? null;
    // Real-transparency probe: an alpha CHANNEL existing is not transparency
    // (opaque RGBA from canvas / Firefly). stats().isOpaque distinguishes a true
    // cutout from an opaque PNG. Skip the cost when there is no alpha channel.
    if (meta.hasAlpha) {
      try {
        isOpaque = (await sharp(buffer).stats()).isOpaque;
      } catch {
        isOpaque = null; // stats unavailable — classifier falls back to ratio
      }
    } else {
      isOpaque = true; // no alpha channel => opaque by definition
    }
  } catch {
    // Unreadable image — classify on the filename alone.
  }

  const c = classifyAsset({ fileName: file.name, width, height, hasAlpha, channels, isOpaque });
  return NextResponse.json({
    success: true,
    recommendedStage: c.stage,
    confidence: c.confidence,
    qualityFlags: c.qualityFlags,
    conflict: c.conflict,
    nameStage: c.nameStage,
    contentStage: c.contentStage,
    hasTransparency: c.hasTransparency,
    width,
    height,
    hasAlpha,
    isOpaque,
  });
}
