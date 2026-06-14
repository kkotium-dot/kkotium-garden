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
import sharp from 'sharp';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  uploadAutomationAsset,
  type AssetKind,
} from '@/lib/storage/automation-storage';
import {
  STAGE_DIRS,
  safeVariant,
} from '@/lib/storage/asset-taxonomy';
import { classifyAsset } from '@/lib/storage/asset-classify';
import { parseAssetTokens, buildAssetVariant, type AssetTokens } from '@/lib/storage/asset-naming';
import { ratioSlotForStage } from '@/lib/config/image-slot-matrix';
import { conformToSlotRatio } from '@/lib/images/slot-ratio';

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

  // Read the upload bytes + intrinsic metadata up-front so the stage can be
  // classified CONTENT-AWARE (authority §8), not filename-only.
  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ success: false, error: '파일을 읽지 못했습니다' }, { status: 400 });
  }
  let width: number | null = null;
  let height: number | null = null;
  let hasAlpha: boolean | null = null;
  let channels: number | null = null;
  try {
    const meta = await sharp(buffer).metadata();
    width = meta.width ?? null;
    height = meta.height ?? null;
    hasAlpha = meta.hasAlpha ?? null;
    channels = meta.channels ?? null;
  } catch { /* non-image metadata read — leave signals null */ }

  // Content-aware recommendation: filename hint + pixel signals (alpha / aspect
  // ratio / resolution). recommendedStage + confidence + qualityFlags are always
  // returned so the UI chip can show the inference and any quality warning.
  const classification = classifyAsset({ fileName: file.name, width, height, hasAlpha, channels });
  const recommendedStage = classification.stage;
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

  // Token inference (angle/mood/slot/context) from the filename + caller-provided
  // overrides. The normalized variant is the controlled-token slug; if nothing
  // resolves, fall back to a sanitized filename slug.
  const inferredTokens = parseAssetTokens(file.name);
  const tokens: AssetTokens = {
    angle: (form.get('angle')?.toString().trim() as AssetTokens['angle']) || inferredTokens.angle,
    mood: (form.get('mood')?.toString().trim() as AssetTokens['mood']) || inferredTokens.mood,
    slot: (form.get('slot')?.toString().trim() as AssetTokens['slot']) || inferredTokens.slot,
    context: (form.get('context')?.toString().trim() as AssetTokens['context']) || inferredTokens.context,
  };
  const variant = buildAssetVariant(tokens, safeVariant(baseName, 'upload'));
  const sourceTag = (form.get('sourceTag') ?? 'manual_upload').toString().trim() || 'manual_upload';

  // Slot-ratio normalization opt-out (default ON for the ratio-controlled
  // stages: composite -> 4:5, thumbnail -> 1:1). `normalize=false` stores the
  // raw upload untouched.
  const normalizeOff = ((form.get('normalize') ?? '').toString().trim().toLowerCase() === 'false');

  try {
    let outBuffer: Buffer = buffer;
    let uploadContentType = contentType;

    // Pipeline-time slot-ratio defense (authority §1/§2): conform off-ratio
    // assets to the slot ratio before storage. Conformant inputs pass through
    // unchanged. Skipped for stages without a deterministic slot ratio.
    const ratioSlot = ratioSlotForStage(stage);
    let normalized: { applied: boolean; fromRatio: number | null; toRatio: number } | null = null;
    if (ratioSlot && ratioSlot.targetRatio && !normalizeOff) {
      try {
        const r = await conformToSlotRatio(outBuffer, ratioSlot.targetRatio, {
          policy: ratioSlot.normalize,
          contentType,
        });
        outBuffer = r.buffer;
        uploadContentType = r.contentType;
        if (r.width) width = r.width;
        if (r.height) height = r.height;
        normalized = { applied: r.changed, fromRatio: r.fromRatio, toRatio: r.toRatio };
      } catch { /* normalization is best-effort — store the original on failure */ }
    }

    const uploaded = await uploadAutomationAsset({
      productId,
      kind: stage,
      variant,
      buffer: outBuffer,
      contentType: uploadContentType,
    });

    // Registry insert (item C4) — idempotent on path, guarded for the
    // pre-migration window so the upload still succeeds if the table is absent.
    let registered = false;
    try {
      await prisma.assetRegistry.create({
        data: {
          productId,
          stage,
          angle: tokens.angle ?? null,
          mood: tokens.mood ?? null,
          slot: tokens.slot ?? null,
          context: tokens.context ?? null,
          fileName: uploaded.path.slice(uploaded.path.lastIndexOf('/') + 1),
          path: uploaded.path,
          width,
          height,
          sourceTag,
        },
      });
      registered = true;
    } catch (e) {
      // P2021/P2022 = table/column not migrated; P2002 = unique path already
      // registered. None are fatal to the upload itself.
      if (
        !(e instanceof Prisma.PrismaClientKnownRequestError &&
          (e.code === 'P2021' || e.code === 'P2022' || e.code === 'P2002'))
      ) {
        throw e;
      }
    }

    return NextResponse.json({
      success: true,
      productId,
      stage,
      recommendedStage,
      confidence: classification.confidence,
      qualityFlags: classification.qualityFlags,
      conflict: classification.conflict,
      nameStage: classification.nameStage,
      contentStage: classification.contentStage,
      tokens,
      variant,
      width,
      height,
      normalized,
      registered,
      path: uploaded.path,
      publicUrl: uploaded.publicUrl,
      uploadedAt: uploaded.uploadedAt,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
