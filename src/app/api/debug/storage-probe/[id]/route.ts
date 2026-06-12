// /api/debug/storage-probe/[id]?token=<CRON_SECRET>
// NOTE: lives under /api/debug (NOT /api/_debug) — the App Router treats an
// underscore-prefixed folder as a PRIVATE folder excluded from routing, so the
// handoff-spec path /api/_debug/... would 404 unconditionally.
// ============================================================================
// TEMPORARY diagnostic. Reveals exactly what the PRODUCTION runtime sees when
// listing a product's storage stages, to root-cause the /assets composite=0
// discrepancy. Token-gated by CRON_SECRET so it is not publicly reachable.
// DELETE this file once the root cause is confirmed.
// ============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET = 'product-assets';

interface ListProbe {
  label: string;
  rows: number;
  idsSet: number;
  names: string[];
  error: string | null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const pid = params.id;

  const env = {
    url: supaUrl,
    keyPrefix: key.slice(0, 9),
    keyLen: key.length,
    keyPresent: key.length > 0,
  };

  const supabase = createClient(supaUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const probeList = async (label: string, prefix: string): Promise<ListProbe> => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(prefix, { limit: 100, sortBy: { column: 'name', order: 'asc' } });
      if (error) return { label, rows: -1, idsSet: -1, names: [], error: error.message };
      const rows = data ?? [];
      return {
        label,
        rows: rows.length,
        idsSet: rows.filter((f) => f.id).length,
        names: rows.map((f) => f.name),
        error: null,
      };
    } catch (e: unknown) {
      return { label, rows: -2, idsSet: -2, names: [], error: e instanceof Error ? e.message : 'throw' };
    }
  };

  // Direct REST call (bypasses storage-js) with the same env key, to isolate
  // whether any discrepancy is in storage-js or in the storage-api/key path.
  const probeRest = async (label: string, prefix: string) => {
    try {
      const res = await fetch(`${supaUrl}/storage/v1/object/list/${BUCKET}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prefix,
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
          search: '',
        }),
        cache: 'no-store',
      });
      const json: unknown = await res.json().catch(() => null);
      const count = Array.isArray(json) ? json.length : -1;
      return { label, httpStatus: res.status, count, isArray: Array.isArray(json) };
    } catch (e: unknown) {
      return { label, httpStatus: -1, count: -2, error: e instanceof Error ? e.message : 'throw' };
    }
  };

  const [cNo, cSlash, cutNo, rest] = await Promise.all([
    probeList('composite_noSlash', `${pid}/composite`),
    probeList('composite_slash', `${pid}/composite/`),
    probeList('cutout_noSlash', `${pid}/cutout`),
    probeRest('rest_composite_noSlash', `${pid}/composite`),
  ]);

  return NextResponse.json({
    ok: true,
    pid,
    env,
    storageJsProbes: [cNo, cSlash, cutNo],
    restProbe: rest,
  });
}
