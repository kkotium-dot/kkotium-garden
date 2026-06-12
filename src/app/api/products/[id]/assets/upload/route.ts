// /api/products/[id]/assets/upload
// ============================================================================
// Lane 1 SEMI-AUTO direct upload (asset loading v2). An operator drops/picks a
// file in the studio asset browser and chooses a stage; the file is stored in
// the canonical bucket at `product-assets/{productId}/{stage}/{variant}-{ts}.ext`
// via uploadAutomationAsset. When no stage is given, kindForSource infers one
// from the filename (operator can still override).
//
// Multipart form-data:  file (required, image/*) · stage (optional AssetKind)
//
// ADDITIVE only — a fresh timestamped object is written (upsert:false). No DB
// mutation, no Naver, no overwrite of existing URLs. Fully reversible.
// Authority: docs/handoff/HANDOFF_asset_system_v2_2026-06-12.md (lane 1).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  uploadAutomationAsset,
  type AssetKind,
} from '@/lib/storage/automation-storage';
import {
  STAGE_DIRS,
  kindForSource,
  safeVariant,
} from '@/lib/storage/asset-taxonomy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB guard — generated assets are well under this.

function isAssetKind(v: string): v is AssetKind {
  return (STAGE_DIRS as readonly string[]).includes(v);
}

function extFor(contentType: string, fileName: string): { contentType: string; baseName: string } {
  // Strip extension from the filename for the variant slug; the storage helper
  // derives the stored extension from the content type.
  const dot = fileName.lastIndexOf('.');
  const baseName = dot > 0 ? fileName.slice(0, dot) : fileName;
  return { contentType, baseName };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id: productId } = params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: 'multipart/form-data 본문이 필요합니다' },
      { status: 400 },
    );
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: 'file 필드(이미지)가 필요합니다' },
      { status: 400 },
    );
  }

  const contentType = file.type || 'application/octet-stream';
  if (!contentType.startsWith('image/')) {
    return NextResponse.json(
      { success: false, error: `이미지 파일만 업로드할 수 있습니다 (받은 타입: ${contentType})` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: `파일이 너무 큽니다 (최대 ${MAX_BYTES / (1024 * 1024)}MB)` },
      { status: 413 },
    );
  }

  // Stage: explicit (validated) or inferred from the filename. recommendedStage
  // is always returned so the UI can show what the auto-classifier picked.
  const recommendedStage = kindForSource(file.name);
  const stageRaw = (form.get('stage') ?? '').toString().trim();
  let stage: AssetKind;
  if (stageRaw) {
    if (!isAssetKind(stageRaw)) {
      return NextResponse.json(
        { success: false, error: `잘못된 stage 값입니다: ${stageRaw}` },
        { status: 400 },
      );
    }
    stage = stageRaw;
  } else {
    stage = recommendedStage;
  }

  const { baseName } = extFor(contentType, file.name);
  const variant = safeVariant(baseName, 'upload');

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadAutomationAsset({
      productId,
      kind: stage,
      variant,
      buffer,
      contentType,
    });
    return NextResponse.json({
      success: true,
      productId,
      stage,
      recommendedStage,
      path: uploaded.path,
      publicUrl: uploaded.publicUrl,
      uploadedAt: uploaded.uploadedAt,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
