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
// PL-5a adds DRIFT (drift-scan found app-SoR fields out of sync) and UNKNOWN
// (never scanned — the honest state before the first drift-scan, #209).
export type SyncState = 'SYNCED' | 'PENDING' | 'CONFLICT' | 'FAILED' | 'DRIFT' | 'UNKNOWN';

export interface LinkFields {
  source: LinkSource;
  channelProductNo: string | null;
  linkStatus: LinkStatus;
  naverModifiedAt: string | null; // ISO
  lastSyncedAt: string | null;    // ISO
  syncState: SyncState;
  // PL-5a — app-SoR fields (name/salePrice/representativeImageUrl) + a possible
  // 'statusType' marker that the last drift-scan found out of sync. [] when in sync.
  driftFields: string[];
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
      drift_fields: unknown;
    }>>`
      SELECT id, source, channel_product_no, link_status,
             naver_modified_at, last_synced_at, sync_state, drift_fields
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
        driftFields: Array.isArray(r.drift_fields)
          ? (r.drift_fields as string[]).filter((f): f is string => typeof f === 'string')
          : [],
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
  // drift_fields (jsonb): an empty array is a meaningful value ("no drift"), so
  // pass a JSON string when provided (incl. []) and null to keep the existing.
  const driftJson = f.driftFields !== undefined ? JSON.stringify(f.driftFields) : null;
  try {
    // COALESCE(new, existing): only overwrite a column when a value is provided.
    await prisma.$executeRaw`
      UPDATE "Product" SET
        source             = COALESCE(${f.source ?? null}, source),
        channel_product_no = COALESCE(${f.channelProductNo ?? null}, channel_product_no),
        link_status        = COALESCE(${f.linkStatus ?? null}, link_status),
        naver_modified_at  = COALESCE(${naverModified}, naver_modified_at),
        last_synced_at     = COALESCE(${lastSynced}, last_synced_at),
        sync_state         = COALESCE(${f.syncState ?? null}, sync_state),
        drift_fields       = COALESCE(${driftJson}::jsonb, drift_fields)
      WHERE id = ${productId}
    `;
    return true;
  } catch (e) {
    if (!isUndefinedColumnError(e)) throw e;
    return false;
  }
}

// ── SUBSTITUTE (#210, SUBSTITUTE_STOCKOUT_SPEC) ─────────────────────────────
// Stock-out safety net stored in Product.substitute_info (jsonb). Flexible: an
// app-internal substitute product reference OR free text OR a re-sourcing link.
// Surfaced automatically on OUTOFSTOCK (C-9 substitute_ready) — not a plain memo.
export interface SubstituteInfo {
  hasSubstitute: boolean;
  substituteProductId?: string | null;   // app-internal substitute (optional chain)
  substituteName?: string | null;
  substituteNote?: string | null;
  sourcingUrl?: string | null;           // domeggook re-sourcing link
  sourcingCode?: string | null;          // domeggook product no
  lowStockThreshold?: number | null;     // pre-OOS alert threshold (optional)
}

/** Normalize an arbitrary jsonb value into a SubstituteInfo (safe defaults). */
export function normalizeSubstituteInfo(raw: unknown): SubstituteInfo {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    hasSubstitute: o.hasSubstitute === true,
    substituteProductId: str(o.substituteProductId),
    substituteName: str(o.substituteName),
    substituteNote: str(o.substituteNote),
    sourcingUrl: str(o.sourcingUrl),
    sourcingCode: str(o.sourcingCode),
    lowStockThreshold: num(o.lowStockThreshold),
  };
}

/** True when the substitute info carries any actionable content. */
export function hasSubstitutePlan(info: SubstituteInfo | null | undefined): boolean {
  if (!info) return false;
  return (
    info.hasSubstitute ||
    !!info.substituteName || !!info.substituteNote ||
    !!info.sourcingUrl || !!info.sourcingCode || !!info.substituteProductId
  );
}

/** Read substitute_info for the given products. Empty map if column absent. */
export async function readSubstituteInfo(productIds: string[]): Promise<Map<string, SubstituteInfo>> {
  const map = new Map<string, SubstituteInfo>();
  if (productIds.length === 0) return map;
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; substitute_info: unknown }>>`
      SELECT id, substitute_info FROM "Product" WHERE id IN (${Prisma.join(productIds)})
    `;
    for (const r of rows) {
      if (r.substitute_info != null) map.set(r.id, normalizeSubstituteInfo(r.substitute_info));
    }
  } catch (e) {
    if (!isUndefinedColumnError(e)) throw e;
  }
  return map;
}

/** Write substitute_info for one product. Returns false (no-op) if column absent. */
export async function writeSubstituteInfo(productId: string, info: SubstituteInfo): Promise<boolean> {
  const json = JSON.stringify(normalizeSubstituteInfo(info));
  try {
    await prisma.$executeRaw`
      UPDATE "Product" SET substitute_info = ${json}::jsonb WHERE id = ${productId}
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
 * product is registered on Naver; source defaults to NATIVE.
 *
 * #209 — syncState is NOT statically defaulted to SYNCED (that lied when a product
 * had real drift but was never scanned). It is honest about the measured state:
 * a product with no lastSyncedAt has never been drift-scanned → UNKNOWN. Only a
 * product that has actually been scanned reports its persisted syncState.
 */
export function resolveLinkDisplay(
  p: { naverProductId: string | null },
  lf?: Partial<LinkFields>,
): LinkFields {
  const scanned = !!lf?.lastSyncedAt;
  return {
    source: lf?.source ?? 'NATIVE',
    channelProductNo: lf?.channelProductNo ?? null,
    linkStatus: lf?.linkStatus ?? (p.naverProductId ? 'LINKED' : 'UNLINKED'),
    naverModifiedAt: lf?.naverModifiedAt ?? null,
    lastSyncedAt: lf?.lastSyncedAt ?? null,
    syncState: scanned ? (lf?.syncState ?? 'SYNCED') : 'UNKNOWN',
    driftFields: lf?.driftFields ?? [],
  };
}
