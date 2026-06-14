// /api/products/[id]/ingest-firefly
// ============================================================================
// Firefly auto-pipeline INGEST catch-basin (asset loading v2, all products).
// The browser driver (Control Chrome shadow-walk → blob → arrayBuffer → base64,
// FIREFLY_AUTOMATION_PLAYBOOK_2026-06-13 §2-3) POSTs a generated image here; we
// decode it, store it in the canonical bucket at
//   product-assets/{productId}/{stage}/{variant}-{ts}.{ext}
// via uploadAutomationAsset, intake it into the AssetRegistry, and return the
// public URL. This is the single "Firefly result -> folder" drain so the 5-cut
// loop (§4) can confirm each cut landed (200 + public URL) before the next.
//
// CORS: the browser driver fetch()es this from the firefly.adobe.com origin, so
// every response (and the OPTIONS preflight) carries Access-Control headers
// scoped to *.adobe.com (default firefly.adobe.com). Additive — same-origin
// callers are unaffected.
//
// JSON body:
//   { stage: AssetKind, filename: string, base64: string, contentType?: string }
//   stage     — 'composite' | 'source' | 'detail' | 'cutout' | ... (AssetKind).
//               Omitted → inferred from the filename (kindForSource).
//   filename  — original name; its extension is IGNORED for storage (the stored
//               extension is derived from contentType, matching the latent-fix
//               in uploadAutomationAsset). The basename seeds the variant slug.
//   base64    — raw base64 (with or without a data: URL prefix).
//   contentType — image/* (default image/png).
//
// ADDITIVE only — a fresh timestamped object is written (upsert:false). No Naver
// contact, no overwrite of existing URLs, fully reversible. Owning product is
// verified. Node runtime (Buffer + sharp metadata).
// Authority: docs/playbook/FIREFLY_AUTOMATION_PLAYBOOK_2026-06-13.md §3.
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
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB guard — Firefly cuts are well under this.

// Allow the Firefly browser-driver origin (any *.adobe.com), defaulting to
// firefly.adobe.com when the origin is absent or unrecognized. Vary: Origin so
// caches don't serve one origin's ACAO to another.
function corsHeaders(origin: string | null) {
  const allow = origin && /(^https:\/\/[a-z0-9.-]*\.adobe\.com$)|(^https:\/\/firefly\.adobe\.com$)/.test(origin)
    ? origin : 'https://firefly.adobe.com';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

interface Body {
  stage?: string;
  filename?: string;
  base64?: string;
  contentType?: string;
  /** Set false to skip slot-ratio normalization (default ON for composite /
   *  thumbnail). */
  normalize?: boolean;
}

function isAssetKind(v: string): v is AssetKind {
  return (STAGE_DIRS as readonly string[]).includes(v);
}

// Strip a leading `data:<type>;base64,` prefix (the browser driver may send the
// raw base64 OR a full data URL); return the bare base64 payload.
function stripDataUrl(raw: string): string {
  const comma = raw.indexOf(',');
  if (raw.startsWith('data:') && comma > 0) return raw.slice(comma + 1);
  return raw;
}

// Preflight — the browser driver issues an OPTIONS before the cross-origin POST.
export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id: productId } = params;
  // CORS headers merged into EVERY response below (cross-origin firefly fetch).
  const cors = corsHeaders(req.headers.get('origin'));

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'JSON body required (stage, filename, base64)' },
      { status: 400, headers: cors },
    );
  }

  // Owning product must exist (no cross-product writes).
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404, headers: cors });
  }

  const filename = (body.filename ?? '').toString().trim();
  if (!filename) {
    return NextResponse.json({ success: false, error: 'filename is required' }, { status: 400, headers: cors });
  }

  const rawBase64 = (body.base64 ?? '').toString();
  if (!rawBase64) {
    return NextResponse.json({ success: false, error: 'base64 (image data) is required' }, { status: 400, headers: cors });
  }

  const contentType = (body.contentType ?? 'image/png').toString().trim() || 'image/png';
  if (!contentType.startsWith('image/')) {
    return NextResponse.json(
      { success: false, error: `only image/* contentType is allowed (got: ${contentType})` },
      { status: 415, headers: cors },
    );
  }

  // Decode base64 → Buffer (guard malformed input + size).
  let buffer: Buffer;
  try {
    buffer = Buffer.from(stripDataUrl(rawBase64), 'base64');
  } catch {
    return NextResponse.json({ success: false, error: 'base64 decode failed' }, { status: 400, headers: cors });
  }
  if (buffer.length === 0) {
    return NextResponse.json({ success: false, error: 'base64 decoded to empty bytes' }, { status: 400, headers: cors });
  }
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: `file too large (max ${MAX_BYTES / (1024 * 1024)}MB)` },
      { status: 413, headers: cors },
    );
  }

  // Intrinsic metadata up-front so the stage is classified content-aware
  // (authority §8), not filename-only.
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
  } catch { /* non-image / unreadable metadata — leave signals null */ }

  // Content-aware recommendation (filename hint + pixel signals).
  const classification = classifyAsset({ fileName: filename, width, height, hasAlpha, channels });
  const recommendedStage = classification.stage;
  const stageRaw = (body.stage ?? '').toString().trim();
  let stage: AssetKind;
  if (stageRaw) {
    if (!isAssetKind(stageRaw)) {
      return NextResponse.json({ success: false, error: `invalid stage value: ${stageRaw}` }, { status: 400, headers: cors });
    }
    stage = stageRaw;
  } else {
    stage = recommendedStage;
  }

  // Variant: controlled tokens (angle/mood/slot/context) inferred from the
  // filename, falling back to a sanitized basename slug. The stored extension is
  // derived from contentType inside uploadAutomationAsset, so the filename's own
  // extension is ignored here.
  const dot = filename.lastIndexOf('.');
  const baseName = dot > 0 ? filename.slice(0, dot) : filename;
  const tokens: AssetTokens = parseAssetTokens(filename);
  const variant = buildAssetVariant(tokens, safeVariant(baseName, 'firefly'));

  const normalizeOff = body.normalize === false;

  try {
    let uploadContentType = contentType;

    // Pipeline-time slot-ratio defense (authority §1/§2): conform off-ratio
    // Firefly output to the slot ratio (composite -> 4:5, thumbnail -> 1:1)
    // before storage. Conformant inputs pass through unchanged.
    const ratioSlot = ratioSlotForStage(stage);
    let normalized: { applied: boolean; fromRatio: number | null; toRatio: number } | null = null;
    if (ratioSlot && ratioSlot.targetRatio && !normalizeOff) {
      try {
        const r = await conformToSlotRatio(buffer, ratioSlot.targetRatio, {
          policy: ratioSlot.normalize,
          contentType,
        });
        buffer = r.buffer;
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
      buffer,
      contentType: uploadContentType,
    });

    // Registry intake — idempotent on path (P2002 guarded), guarded for the
    // pre-migration window so the ingest still succeeds if the table is absent.
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
          sourceTag: 'firefly_auto',
        },
      });
      registered = true;
    } catch (e) {
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
    }, { headers: cors });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg, stage: 'UPLOAD' }, { status: 502, headers: cors });
  }
}
