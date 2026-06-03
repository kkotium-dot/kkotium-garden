// src/lib/naver/searchad-volume.ts
//
// Lane 1 (2026-06-01) — Naver SearchAd /keywordstool wrapper for measured
// monthly search volumes. Used by /api/naver-seo/ai-generate to:
//   1. Inject real volume signal into the SEO prompt as ground truth.
//   2. Reorder the final naver_keywords by descending measured volume.
//
// Honest by construction (workrule #46):
//   - Returns null when env keys are missing or the SearchAd API hard-fails.
//   - Caller (ai-generate route) treats null as "no volume signal" and falls
//     back to its existing DataLab + competition path. No fabricated counts.
//   - "< 10" sentinel from SearchAd is preserved as a small positive number
//     (midpoint 5) so it sorts below measured counts but above zero.
//
// Required env:
//   NAVER_SEARCHAD_API_KEY      (license key)
//   NAVER_SEARCHAD_SECRET_KEY   (HMAC-SHA256 secret)
//   NAVER_SEARCHAD_CUSTOMER_ID  (customer id, e.g. "3755315")
//
// Signature scheme (Naver SearchAd standard):
//   message   = `${timestamp}.${METHOD}.${uri}`   (uri = path, no query)
//   signature = base64( HMAC-SHA256(secret, message) )
//   headers   = { X-Timestamp, X-API-KEY, X-Customer, X-Signature }

import crypto from 'node:crypto';

const SEARCHAD_BASE = 'https://api.searchad.naver.com';
const KEYWORDSTOOL_URI = '/keywordstool';

export type CompIdx = 'LOW' | 'MEDIUM' | 'HIGH';

export interface VolumeRow {
  /** Echoed back from SearchAd's relKeyword (after exact-match filter). */
  keyword: string;
  monthlyPcQc: number;
  monthlyMobileQc: number;
  totalMonthlyQc: number;
  compIdx: CompIdx | null;
}

function signRequest(
  timestamp: string,
  method: string,
  uri: string,
  secret: string,
): string {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto.createHmac('sha256', secret).update(message).digest('base64');
}

/** SearchAd returns counts either as a number, a digit string, or "< 10"
 *  for very-low-volume keywords. Normalize to a non-negative integer. */
function parseCount(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw !== 'string') return 0;
  const s = raw.trim();
  if (s.startsWith('<')) return 5; // honest midpoint of the [0, 10) range
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** SearchAd returns compIdx in Korean: 낮음 / 중간 / 높음. Map to enum
 *  or null when the API omits the field. */
function mapComp(raw: unknown): CompIdx | null {
  if (typeof raw !== 'string') return null;
  if (raw.includes('낮')) return 'LOW';
  if (raw.includes('중')) return 'MEDIUM';
  if (raw.includes('높')) return 'HIGH';
  return null;
}

/** Whitespace-collapsed, lowercased — used for exact-match keyword equality
 *  against SearchAd's relKeyword (which strips spaces). */
export function normalizeKeyword(k: string): string {
  return k.replace(/\s+/g, '').toLowerCase();
}

/** Single batch call. SearchAd /keywordstool accepts up to 5 hintKeywords
 *  per request and returns both the hint matches and related suggestions.
 *  We filter the response down to exact matches against our input so the
 *  caller never sees an API guess attributed to one of our keywords. */
async function fetchBatch(hintKeywords: string[]): Promise<VolumeRow[] | null> {
  const apiKey = process.env.NAVER_SEARCHAD_API_KEY;
  const secret = process.env.NAVER_SEARCHAD_SECRET_KEY;
  const customer = process.env.NAVER_SEARCHAD_CUSTOMER_ID;
  if (!apiKey || !secret || !customer) return null;

  // SearchAd /keywordstool empirically rejects long multi-word hints with
  // HTTP 400. Strip commas, collapse internal whitespace, and drop hints
  // outside [2, 15] chars. Cap to 5 (SearchAd batch limit).
  const cleaned = hintKeywords
    .map((k) => k.replace(/,/g, ' ').replace(/\s+/g, '').trim())
    .filter((k) => k.length >= 2 && k.length <= 15)
    .slice(0, 5);
  if (cleaned.length === 0) return [];

  const params = new URLSearchParams({
    hintKeywords: cleaned.join(','),
    showDetail: '1',
  });

  const timestamp = String(Date.now());
  const signature = signRequest(timestamp, 'GET', KEYWORDSTOOL_URI, secret);

  const res = await fetch(`${SEARCHAD_BASE}${KEYWORDSTOOL_URI}?${params}`, {
    method: 'GET',
    headers: {
      'X-Timestamp': timestamp,
      'X-API-KEY': apiKey,
      'X-Customer': customer,
      'X-Signature': signature,
    },
  });

  if (!res.ok) {
    let body = '';
    try {
      body = (await res.text()).slice(0, 200);
    } catch {
      body = '(no body)';
    }
    console.warn(
      `[searchad-volume] HTTP ${res.status} for batch [${cleaned.join(',')}] body=${body}`,
    );
    return null;
  }

  const data = (await res.json()) as { keywordList?: unknown };
  const list = Array.isArray(data?.keywordList) ? data.keywordList : [];

  // Exact-match filter against the requested hints (normalized).
  const wanted = new Set(cleaned.map(normalizeKeyword));
  const rows: VolumeRow[] = [];
  for (const row of list as Record<string, unknown>[]) {
    const rel = typeof row?.relKeyword === 'string' ? row.relKeyword : '';
    if (!rel || !wanted.has(normalizeKeyword(rel))) continue;
    const pc = parseCount(row.monthlyPcQcCnt);
    const mb = parseCount(row.monthlyMobileQcCnt);
    rows.push({
      keyword: rel,
      monthlyPcQc: pc,
      monthlyMobileQc: mb,
      totalMonthlyQc: pc + mb,
      compIdx: mapComp(row.compIdx),
    });
  }
  return rows;
}

/**
 * Public entry: batches input keywords into groups of 5, calls SearchAd
 * for each, and returns the combined exact-match rows.
 *
 * Returns:
 *   - null  when env is missing OR the first batch hard-fails (caller
 *           falls back to existing DataLab + competition signal).
 *   - []    when input is empty or no keyword had an exact match.
 *   - rows  on partial or full success; later-batch failures degrade
 *           gracefully (already-collected rows are returned).
 */
export async function fetchKeywordVolumes(
  keywords: string[],
): Promise<VolumeRow[] | null> {
  const apiKey = process.env.NAVER_SEARCHAD_API_KEY;
  const secret = process.env.NAVER_SEARCHAD_SECRET_KEY;
  const customer = process.env.NAVER_SEARCHAD_CUSTOMER_ID;
  if (!apiKey || !secret || !customer) return null;

  // Dedupe (case-insensitive, whitespace-collapsed) and drop sub-2-char.
  const seenIn = new Set<string>();
  const cleaned: string[] = [];
  for (const k of keywords) {
    const t = (k ?? '').trim();
    if (t.length < 2) continue;
    const n = normalizeKeyword(t);
    if (seenIn.has(n)) continue;
    seenIn.add(n);
    cleaned.push(t);
  }
  if (cleaned.length === 0) return [];

  const batches: string[][] = [];
  for (let i = 0; i < cleaned.length; i += 5) {
    batches.push(cleaned.slice(i, i + 5));
  }

  const collected: VolumeRow[] = [];
  for (let i = 0; i < batches.length; i++) {
    try {
      const rows = await fetchBatch(batches[i]);
      if (rows === null) {
        // Hard failure on the very first batch -> null (no signal).
        if (collected.length === 0 && i === 0) return null;
        continue;
      }
      collected.push(...rows);
    } catch (e) {
      console.warn(
        '[searchad-volume] batch error:',
        e instanceof Error ? e.message : String(e),
      );
      if (collected.length === 0 && i === 0) return null;
    }
    // Throttle between batches (SearchAd allows generous throughput but
    // pacing avoids 429 on bulk callers like the PUT route).
    if (i + 1 < batches.length) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  // Cross-batch dedupe — relKeyword may surface in multiple batches.
  const seenOut = new Set<string>();
  const out: VolumeRow[] = [];
  for (const r of collected) {
    const n = normalizeKeyword(r.keyword);
    if (seenOut.has(n)) continue;
    seenOut.add(n);
    out.push(r);
  }
  return out;
}

// ─── Scope A (2026-06-03): seed-based related-keyword harvest ──────────────────

/** Same shape as VolumeRow — a related keyword harvested from the
 *  /keywordstool response WITHOUT the exact-match filter that
 *  fetchKeywordVolumes applies. Kept as a distinct name so call sites read
 *  intentionally ("these are expansion candidates, not echoes of my input"). */
export type RelatedKeywordRow = VolumeRow;

/** Default cap applied after descending-volume sort. SearchAd can return up
 *  to ~1,200 rows for one seed; 120 keeps the highest-volume head without
 *  flooding the downstream scorer/prompt. */
const RELATED_DEFAULT_CAP = 120;

/**
 * Seed-based related-keyword expansion — the keyword-expansion engine's
 * primary source (Scope A).
 *
 * Unlike fetchKeywordVolumes (which keeps ONLY exact matches against its
 * input), this calls /keywordstool with up to 5 seed hints and returns the
 * FULL keywordList: every related keyword SearchAd suggests, each priced with
 * its measured monthly volume + competition. One seed surfaces market
 * keywords that never appear in the product name (e.g. "차량용방향제" →
 * "차량용디퓨저", "송풍구디퓨저"). Same auth/signature/request as fetchBatch;
 * the only difference is the dropped exact-match filter.
 *
 * Honest by construction (#46): only rows SearchAd actually returned; "< 10"
 * preserved as 5; null on env-missing or hard failure so the caller falls
 * back to its existing path. No fabricated keywords or counts.
 *
 * @param seeds   up to 5 seed keywords (SearchAd hintKeywords limit)
 * @param opts.maxRows  cap after descending-volume sort (default 120)
 * @returns null on env-missing/hard-fail, [] on empty/no-seed, rows on success
 */
export async function fetchRelatedKeywords(
  seeds: string[],
  opts?: { maxRows?: number },
): Promise<RelatedKeywordRow[] | null> {
  const apiKey = process.env.NAVER_SEARCHAD_API_KEY;
  const secret = process.env.NAVER_SEARCHAD_SECRET_KEY;
  const customer = process.env.NAVER_SEARCHAD_CUSTOMER_ID;
  if (!apiKey || !secret || !customer) return null;

  // Reuse fetchBatch's hint-cleaning contract: strip commas, collapse
  // whitespace, keep [2, 15] chars, cap to 5 (SearchAd hintKeywords limit).
  const cleaned = seeds
    .map((k) => k.replace(/,/g, ' ').replace(/\s+/g, '').trim())
    .filter((k) => k.length >= 2 && k.length <= 15)
    .slice(0, 5);
  if (cleaned.length === 0) return [];

  const params = new URLSearchParams({
    hintKeywords: cleaned.join(','),
    showDetail: '1',
  });

  const timestamp = String(Date.now());
  const signature = signRequest(timestamp, 'GET', KEYWORDSTOOL_URI, secret);

  let res: Response;
  try {
    res = await fetch(`${SEARCHAD_BASE}${KEYWORDSTOOL_URI}?${params}`, {
      method: 'GET',
      headers: {
        'X-Timestamp': timestamp,
        'X-API-KEY': apiKey,
        'X-Customer': customer,
        'X-Signature': signature,
      },
    });
  } catch (e) {
    console.warn(
      '[searchad-volume] related fetch error:',
      e instanceof Error ? e.message : String(e),
    );
    return null;
  }

  if (!res.ok) {
    let body = '';
    try {
      body = (await res.text()).slice(0, 200);
    } catch {
      body = '(no body)';
    }
    console.warn(
      `[searchad-volume] related HTTP ${res.status} for seeds [${cleaned.join(',')}] body=${body}`,
    );
    return null;
  }

  const data = (await res.json()) as { keywordList?: unknown };
  const list = Array.isArray(data?.keywordList) ? data.keywordList : [];

  // NO exact-match filter — harvest every related keyword. Dedupe by
  // normalized keyword (relKeyword may repeat across the response).
  const seen = new Set<string>();
  const rows: RelatedKeywordRow[] = [];
  for (const row of list as Record<string, unknown>[]) {
    const rel = typeof row?.relKeyword === 'string' ? row.relKeyword : '';
    if (!rel) continue;
    const n = normalizeKeyword(rel);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    const pc = parseCount(row.monthlyPcQcCnt);
    const mb = parseCount(row.monthlyMobileQcCnt);
    rows.push({
      keyword: rel,
      monthlyPcQc: pc,
      monthlyMobileQc: mb,
      totalMonthlyQc: pc + mb,
      compIdx: mapComp(row.compIdx),
    });
  }

  rows.sort((a, b) => b.totalMonthlyQc - a.totalMonthlyQc);
  const cap = opts?.maxRows ?? RELATED_DEFAULT_CAP;
  return cap > 0 ? rows.slice(0, cap) : rows;
}
