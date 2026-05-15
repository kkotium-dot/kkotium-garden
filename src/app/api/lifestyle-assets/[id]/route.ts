// src/app/api/lifestyle-assets/[id]/route.ts
//
// Sprint 7-M2 Phase 2-c-2 — DELETE single LifestyleAsset.
//
//   DELETE /api/lifestyle-assets/{id}
//     Removes the storage object first, then the DB row. If the storage
//     delete fails (e.g., already missing), we still try the DB delete so
//     the admin UI can clean up dangling rows.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteLifestyleAsset } from '@/lib/storage/automation-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonError(message: string, status: number, detail?: unknown) {
  return NextResponse.json(
    detail !== undefined ? { error: message, detail } : { error: message },
    { status },
  );
}

/** Extract the storage path from a public Supabase Storage URL. */
function pathFromPublicUrl(publicUrl: string): string | null {
  // Format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
  const marker = '/object/public/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const after = publicUrl.slice(idx + marker.length);
  // Strip the bucket name (first segment)
  const slashIdx = after.indexOf('/');
  if (slashIdx === -1) return null;
  return after.slice(slashIdx + 1);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const id = params.id;
  if (!id) return jsonError('id required', 400);

  const asset = await prisma.lifestyleAsset.findUnique({ where: { id } });
  if (!asset) return jsonError('asset not found', 404, { id });

  // Try storage delete first (best-effort)
  const path = pathFromPublicUrl(asset.storageUrl);
  if (path) {
    try {
      await deleteLifestyleAsset(path);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[lifestyle-assets/DELETE] storage delete failed (non-fatal):', err);
    }
  }

  try {
    await prisma.lifestyleAsset.delete({ where: { id } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return jsonError('database delete failed', 500, { msg });
  }

  return NextResponse.json({ ok: true, id });
}
