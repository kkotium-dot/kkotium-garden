// src/lib/sources/parse-supplier-code.ts
// ============================================================================
// MULTI_PLATFORM_SUPPLIER_CODE_2026-09-09 — parse a supplier product code OR
// a full product-page URL from ANY registered sourcing platform (not just
// Domeggook/Domemae). The operator no longer sources from a single wholesale
// site, so "도매매 상품번호" input alone is no longer accurate — this parser
// recognizes the URL shape of each platform in `platforms` and extracts a
// clean numeric/alnum code + which platform it belongs to.
//
// Design (#231 honest, #62 product-agnostic):
//   - Bare numeric string (6+ digits) -> assumed DMM (backward compat with
//     existing operator habit: "input the number").
//   - Domeggook/Domemae URL patterns -> DMM + numeric code (reuses the
//     proven parse-dome-no.ts patterns).
//   - OwnerClan URL pattern (selfcode=XXXXX) -> OWC + alnum selfcode.
//   - Unrecognized URL/string -> platformCode:null, code:trimmed input,
//     originalUrl: the input if it looked like a URL. Caller decides how
//     to handle (currently: reject with a clear message rather than guess).
//
// This does NOT change adapter behavior — OWC still throws NotImplemented
// on getInventory() (adapter is a stub, see ownerclan-adapter.ts) until the
// operator supplies real OwnerClan API credentials. The code is still
// captured and stored correctly so re-activation later requires no data
// re-entry.
// ============================================================================

import { parseDomeProductNo } from './parse-dome-no';

export interface ParsedSupplierCode {
  /** platforms.code this belongs to, or null if unrecognized. */
  platformCode: 'DMM' | 'OWC' | null;
  /** Extracted code (numeric for DMM, alnum selfcode for OWC). */
  code: string | null;
  /** The original input, kept when it looked like a URL (for source_detail_url). */
  originalUrl: string | null;
}

const OWNERCLAN_SELFCODE_RE = /ownerclan\.com\/.*[?&]selfcode=([A-Za-z0-9]+)/i;

/**
 * Parse a supplier code input that may be a bare code or a full product URL
 * from any registered platform. Never throws — returns platformCode:null on
 * a miss so the caller can surface an honest "couldn't recognize this" state
 * instead of guessing.
 */
export function parseSupplierCodeInput(raw: string): ParsedSupplierCode {
  const input = raw.trim();
  const looksLikeUrl = /^https?:\/\//i.test(input);

  // OwnerClan: https://www.ownerclan.com/V2/product/view.php?selfcode=WFIK2EE
  const ownerClanMatch = input.match(OWNERCLAN_SELFCODE_RE);
  if (ownerClanMatch) {
    return { platformCode: 'OWC', code: ownerClanMatch[1], originalUrl: input };
  }

  // Domeggook/Domemae: delegates to the existing proven parser
  // (domeme.domeggook.com/s/NNNN, ?uid=/no=NNNN, bare 7-10 digit run in a URL).
  if (looksLikeUrl) {
    const domeCode = parseDomeProductNo(input);
    if (domeCode) {
      return { platformCode: 'DMM', code: domeCode, originalUrl: input };
    }
    // Recognized as a URL but no known platform pattern matched.
    return { platformCode: null, code: null, originalUrl: input };
  }

  // Bare code, no URL: numeric-only -> assume DMM (matches long-standing
  // "도매매 상품번호" operator habit, e.g. "43595104").
  if (/^\d{6,}$/.test(input)) {
    return { platformCode: 'DMM', code: input, originalUrl: null };
  }

  // Bare alnum code that isn't purely numeric: could be an OwnerClan selfcode
  // typed directly (e.g. "WFIK2EE") without pasting the URL.
  if (/^[A-Za-z0-9]{4,20}$/.test(input) && /[A-Za-z]/.test(input)) {
    return { platformCode: 'OWC', code: input, originalUrl: null };
  }

  return { platformCode: null, code: null, originalUrl: looksLikeUrl ? input : null };
}
