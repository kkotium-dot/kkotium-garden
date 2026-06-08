// src/lib/sources/parse-dome-no.ts
// Pure (no sharp/network) Domeggook product-number parser. Kept separate so the
// products ingest route can import it without pulling in sharp.

/**
 * Parse a Domeggook/Domemae product number from a source URL. Handles:
 *   domeme.domeggook.com/s/12345678  ·  domeggook.com/...?uid=12345678
 *   ...?no=12345678  ·  bare 7-10 digit run as a last resort.
 * Returns null when no number is found. Used so ingest never loses
 * supplier_product_code (the capture/backfill key).
 */
export function parseDomeProductNo(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  let m = url.match(/\/s\/(\d{6,})/);
  if (m) return m[1];
  m = url.match(/[?&](?:uid|no)=(\d{6,})/i);
  if (m) return m[1];
  m = url.match(/(\d{7,10})/);
  return m ? m[1] : null;
}
