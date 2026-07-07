// src/lib/product-link.ts
// ============================================================================
// PRODUCT-LINK (PL-1) — link-metadata access layer, reverse-deploy-safe.
//
// The 7 new link columns (channel_product_no, source, link_status,
// naver_modified_at, last_synced_at, sync_hash, sync_state) are applied to the
// Supabase "Product" table by an out-of-band ALTER (Desktop, MCP). Until that
// ALTER lands, these columns do not exist — and because the app talks to
// Supabase directly, adding them to schema.prisma would make EVERY Product query
// select non-existent columns (Postgres 42703 / Prisma P2022), breaking the app.
//
// So PL-1 keeps schema.prisma untouched and reads/writes the link columns ONLY
// through this module, via guarded raw SQL:
//   - linkColumnsExist(): one cached information_schema probe.
//   - readLinkFields():   guarded SELECT (returns empty map if columns absent).
//   - writeLinkFields():  guarded UPDATE (no-op if columns absent).
//   - resolveLinkDisplay(): safe display defaults so the UI degrades gracefully
//     before the ALTER (source→NATIVE, linkStatus derived from naverProductId).
//
// After Desktop applies the ALTER this module activates automatically (no code
// change); a later turn can sync schema.prisma to typed fields (spec §1.44 step 3).
// ORDER of ops (#181): guard code (this) → Desktop ALTER → schema sync + build.
// ============================================================================

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type LinkSource = 'NATIVE' | 'IMPORTED';
export type LinkStatus = 'LINKED' | 'UNLINKED';
export type SyncState = 'SYNCED' | 'PENDING' | 'CONFLICT' | 'FAILED';

export interface LinkFields {
  source: LinkSource;
  channelProductNo: string | null;
  linkStatus: LinkStatus;
  naverModifiedAt: string | null; // ISO
  lastSyncedAt: string | null;    // ISO
  syncState: SyncState;
}

/** True when the error is "column does not exist" (pre-ALTER window). */
export function isUndefinedColumnError(e: unknown): boolean {
  const code = (e as { code?: unknown })?.code;
  if (typeof code === 'string' && ['42703', 'P2022', 'P2021'].includes(code)) return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /42703|does not exist|Unknown column|column .* does not exist/i.test(msg);
}

// Cached probe — resets per server process (safe: ALTER is one-way additive).
let columnsExistCache: boolean | null = null;

/** Does the "Product" table have the PL-1 link columns yet? */
export async function linkColumnsExist(): Promise<boolean> {
  if (columnsExistCache !== null) return columnsExistCache;
  try {
    const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::int AS n
      FROM information_schema.columns
      WHERE table_name = 'Product' AND column_name = 'link_status'
    `;
    columnsExistCache = Number(rows?.[0]?.n ?? 0) > 0;
  } catch {
    columnsExistCache = false;
  }
  return columnsExistCache;
}

/** Read link fields for the given product ids. Empty map if columns absent. */
export async function readLinkFields(productIds: string[]): Promise<Map<string, Partial<LinkFields>>> {
  const map = new Map<string, Partial<LinkFields>>();
  if (productIds.length === 0) return map;
  if (!(await linkColumnsExist())) return map;
  try {
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      source: string | null;
      channel_product_no: string | null;
      link_status: string | null;
      naver_modified_at: Date | null;
      last_synced_at: Date | null;
      sync_state: string | null;
    }>>`
      SELECT id, source, channel_product_no, link_status,
             naver_modified_at, last_synced_at, sync_state
      FROM "Product"
      WHERE id IN (${Prisma.join(productIds)})
    `;
    for (const r of rows) {
      map.set(r.id, {
        source: (r.source as LinkSource) ?? undefined,
        channelProductNo: r.channel_product_no,
        linkStatus: (r.link_status as LinkStatus) ?? undefined,
        naverModifiedAt: r.naver_modified_at ? r.naver_modified_at.toISOString() : null,
        lastSyncedAt: r.last_synced_at ? r.last_synced_at.toISOString() : null,
        syncState: (r.sync_state as SyncState) ?? undefined,
      });
    }
  } catch (e) {
    if (!isUndefinedColumnError(e)) throw e;
  }
  return map;
}

/** Write link fields for one product. Returns false (no-op) if columns absent. */
export async function writeLinkFields(productId: string, f: Partial<LinkFields>): Promise<boolean> {
  if (!(await linkColumnsExist())) return false;
  const naverModified = f.naverModifiedAt ? new Date(f.naverModifiedAt) : null;
  const lastSynced = f.lastSyncedAt ? new Date(f.lastSyncedAt) : null;
  try {
    // COALESCE(new, existing): only overwrite a column when a value is provided.
    await prisma.$executeRaw`
      UPDATE "Product" SET
        source             = COALESCE(${f.source ?? null}, source),
        channel_product_no = COALESCE(${f.channelProductNo ?? null}, channel_product_no),
        link_status        = COALESCE(${f.linkStatus ?? null}, link_status),
        naver_modified_at  = COALESCE(${naverModified}, naver_modified_at),
        last_synced_at     = COALESCE(${lastSynced}, last_synced_at),
        sync_state         = COALESCE(${f.syncState ?? null}, sync_state)
      WHERE id = ${productId}
    `;
    return true;
  } catch (e) {
    if (!isUndefinedColumnError(e)) throw e;
    return false;
  }
}

/**
 * Safe display values. Before the ALTER (no persisted link fields) this derives
 * sensible defaults so the UI never shows blanks: linkStatus follows whether the
 * product is registered on Naver; source defaults to NATIVE; syncState to SYNCED.
 */
export function resolveLinkDisplay(
  p: { naverProductId: string | null },
  lf?: Partial<LinkFields>,
): LinkFields {
  return {
    source: lf?.source ?? 'NATIVE',
    channelProductNo: lf?.channelProductNo ?? null,
    linkStatus: lf?.linkStatus ?? (p.naverProductId ? 'LINKED' : 'UNLINKED'),
    naverModifiedAt: lf?.naverModifiedAt ?? null,
    lastSyncedAt: lf?.lastSyncedAt ?? null,
    syncState: lf?.syncState ?? 'SYNCED',
  };
}
