// src/app/api/lifestyle-assets/route.ts
//
// Sprint 7-M2 Phase 2-c-2 — Lifestyle backdrop asset library CRUD.
//
//   GET  /api/lifestyle-assets
//        List all lifestyle assets (most-recent first). No filters yet —
//        the library is small enough that the admin UI can client-filter.
//
//   POST /api/lifestyle-assets
//        Upload a lifestyle asset. Accepts multipart/form-data with:
//          file:        the image (PNG/JPEG/WebP)
//          category:    string (e.g., "리빙", "패션", "*" for any)
//          tags:        comma-separated string (e.g., "30s,gift,premium")
//          moodTags:    comma-separated string (e.g., "warm,minimal")
//          source:      string (e.g., "Adobe Firefly", "Unsplash")
//          licenseUrl:  optional string
//        Server steps: parse → cuid → Sharp metadata (w/h) → Supabase
//        Storage upload → Prisma INSERT → return created row.
//
//   DELETE handled in [id]/route.ts.

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import {
  uploadLifestyleAsset,
  deleteLifestyleAsset,
} from '@/lib/storage/automation-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MiB
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

function jsonError(message: string, status: number, detail?: unknown) {
  return NextResponse.json(
    detail !== undefined ? { error: message, detail } : { error: message },
    { status },
  );
}

function splitCsv(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export async function GET() {
  try {
    const assets = await prisma.lifestyleAsset.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return NextResponse.json({ assets });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return jsonError('failed to list lifestyle assets', 500, { msg });
  }
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    return jsonError('multipart/form-data required', 400, String(err));
  }

  const file = formData.get('file');
  if (!(file instanceof Blob)) {
    return jsonError('file field required', 400);
  }
  if (file.size === 0) {
    return jsonError('file is empty', 400);
  }
  if (file.size > MAX_BYTES) {
    return jsonError(`file too large (max ${MAX_BYTES} bytes)`, 413, { size: file.size });
  }
  const contentType = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME.has(contentType)) {
    return jsonError(`unsupported file type: ${contentType}`, 415, {
      allowed: Array.from(ALLOWED_MIME),
    });
  }

  const category = String(formData.get('category') ?? '').trim();
  if (!category) {
    return jsonError('category field required', 400);
  }
  const source = String(formData.get('source') ?? '').trim();
  if (!source) {
    return jsonError('source field required (e.g., "Adobe Firefly")', 400);
  }
  const tags = splitCsv(String(formData.get('tags') ?? ''));
  const moodTags = splitCsv(String(formData.get('moodTags') ?? ''));
  const licenseUrl = String(formData.get('licenseUrl') ?? '').trim() || null;

  // Read the buffer + Sharp metadata once
  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  let width = 0;
  let height = 0;
  try {
    const meta = await sharp(buffer).metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;
  } catch (err) {
    return jsonError('image metadata read failed', 400, String(err));
  }
  if (!width || !height) {
    return jsonError('image dimensions could not be determined', 400);
  }

  // Pre-allocate the asset id so the storage path matches the DB primary key
  const assetId = `la-${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const ext = contentType === 'image/png'
    ? 'png'
    : contentType === 'image/jpeg'
      ? 'jpg'
      : 'webp';

  let storageUrl = '';
  try {
    const uploaded = await uploadLifestyleAsset({ assetId, buffer, ext, contentType });
    storageUrl = uploaded.publicUrl;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return jsonError('storage upload failed', 500, { msg });
  }

  // Insert DB row. If insert fails, delete the orphaned storage object so
  // we don't accumulate dangling files.
  try {
    const created = await prisma.lifestyleAsset.create({
      data: {
        id: assetId,
        category,
        tags,
        moodTags,
        source,
        licenseUrl,
        storageUrl,
        width,
        height,
      },
    });
    return NextResponse.json({ asset: created }, { status: 201 });
  } catch (err) {
    // Best-effort rollback of the storage object
    try {
      await deleteLifestyleAsset(`lifestyle/${assetId}.${ext}`);
    } catch {
      // Swallow — primary error is the DB failure
    }
    const msg = err instanceof Error ? err.message : 'unknown error';
    return jsonError('database insert failed', 500, { msg });
  }
}
