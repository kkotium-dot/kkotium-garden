// src/lib/sources/capture-supplier-detail.ts
// ============================================================================
// Full-res supplier detail capture (two-branch system, 2026-06-08).
// Resolves the P16 crawl gap: getItemView's desc.contents is an OBJECT
// (item / deli / event / otherItem) whose HTML points to the supplier's own
// hosting (e.g. godohosting.com) for the full-res detail — the old crawler only
// kept the 330px thumbnail. These images are hotlink-protected, so they must be
// fetched with a Referer header.
//
// Pure-ish: getItemView + image fetches (network) + sharp metadata. The caller
// uploads the chosen buffer to app storage and records source_detail_url.
// Node runtime (sharp).
// ============================================================================

import sharp from 'sharp';

const DOMEGGOOK_API = 'https://domeggook.com/ssl/api/';
const HOTLINK_REFERER = 'https://domeggook.com/';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const FETCH_TIMEOUT_MS = 20000;

// Any absolute http(s) image URL. Thumbnail variants are rejected so the
// captured asset is the full-res detail, not a 330px crop.
const IMG_URL_RE = /https?:\/\/[^"'\s)<>]+\.(?:jpe?g|png|gif)(?:\?[^"'\s)<>]*)?/gi;
const THUMB_RE = /_stt_\d{1,3}\b|_thumb\b|\.gif(\?|$)/i;

export interface CapturedDetail {
  sourceUrl: string;       // the supplier-hosted origin URL
  buffer: Buffer;
  width: number;
  height: number;
  contentType: string;
}

/** Fetch a hotlink-protected supplier image with a Referer header. */
export async function fetchSupplierImage(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url, {
      headers: { Referer: HOTLINK_REFERER, 'User-Agent': UA },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch {
    return null;
  }
}

/** Extract candidate full-res image URLs from getItemView's desc.contents. */
export function extractDetailImageUrls(descContents: unknown): string[] {
  const s = typeof descContents === 'string' ? descContents : JSON.stringify(descContents ?? {});
  const found = s.match(IMG_URL_RE) ?? [];
  return [...new Set(found)].filter((u) => !THUMB_RE.test(u));
}

/**
 * Capture the largest-area full-res detail image for a Domeggook item.
 * Returns null when the item has no usable full-res detail.
 */
export async function captureSupplierDetail(
  productNo: string,
  apiKey: string,
): Promise<CapturedDetail | null> {
  if (!productNo || !apiKey) return null;
  const apiUrl =
    `${DOMEGGOOK_API}?ver=4.5&mode=getItemView` +
    `&aid=${encodeURIComponent(apiKey)}&no=${encodeURIComponent(productNo)}&om=json`;

  let item: { desc?: { contents?: unknown } } | null = null;
  try {
    const r = await fetch(apiUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!r.ok) return null;
    const j = (await r.json()) as { domeggook?: { desc?: { contents?: unknown } } };
    item = j.domeggook ?? null;
  } catch {
    return null;
  }
  if (!item) return null;

  const urls = extractDetailImageUrls(item.desc?.contents);
  if (urls.length === 0) return null;

  // Fetch each candidate and keep the largest by pixel area (the detail page is
  // far taller than intro/info segments).
  let best: (CapturedDetail & { area: number }) | null = null;
  for (const url of urls) {
    const buffer = await fetchSupplierImage(url);
    if (!buffer) continue;
    try {
      const meta = await sharp(buffer).metadata();
      const width = meta.width ?? 0;
      const height = meta.height ?? 0;
      const area = width * height;
      if (area < 1) continue;
      if (!best || area > best.area) {
        best = {
          sourceUrl: url,
          buffer,
          width,
          height,
          contentType: /\.png(\?|$)/i.test(url) ? 'image/png' : 'image/jpeg',
          area,
        };
      }
    } catch {
      /* skip unreadable image */
    }
  }
  if (!best) return null;
  const { area: _area, ...captured } = best;
  void _area;
  return captured;
}
