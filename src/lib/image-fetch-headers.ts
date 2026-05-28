// src/lib/image-fetch-headers.ts
//
// Hotlink-protected supplier CDNs reject bare server-side image fetches.
// domeggook's CDN (cdn*.domeggook.com) in particular returns a non-200 unless
// the request carries a browser User-Agent and a Referer pointing back at the
// supplier's own domain. This was the root cause of the diagnose-route 500 on
// products whose mainImage is a raw domeggook CDN url (validated 2026-05-28 via
// scripts/g8-upload-poc.js).
//
// We build these headers conditionally by host so we never leak a spurious
// domeggook Referer to unrelated hosts (Supabase Storage, Cloudinary, etc.),
// which would itself break their hotlink/CORS checks.

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const DOMEGGOOK_REFERER = 'https://domeme.domeggook.com/';

/**
 * Build request headers needed to fetch an image from a hotlink-protected
 * supplier CDN. Returns an empty object for hosts that need no special
 * treatment, so callers can always spread the result unconditionally.
 */
export function buildImageFetchHeaders(imageUrl: string): Record<string, string> {
  try {
    const host = new URL(imageUrl).hostname;
    if (host === 'domeggook.com' || host.endsWith('.domeggook.com')) {
      return { 'User-Agent': BROWSER_UA, Referer: DOMEGGOOK_REFERER };
    }
  } catch {
    // Not a parseable absolute URL (e.g. a relative path); no headers to add.
  }
  return {};
}
