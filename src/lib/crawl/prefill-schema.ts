// src/lib/crawl/prefill-schema.ts
// ============================================================================
// CRAWL_PREFILL_GAP_HANDOFF_2026-09-10 — single-authority prefill schema.
//
// crawl/page.tsx has 4 places that build a `?prefill=<base64>` payload for
// products/new (단건/bulk/이력 두 진입점). They used to build the object by
// hand, each with a slightly different field set and its own sanitize/base64
// logic — which is exactly how bulk lost qty/addPrice and how crawlProductNo/
// crawlInventory/crawlNaverFeeRate silently never reached 씨앗심기 (#295 단일권위,
// #370 전소비처). Every entry point AND the products/new receiver must import
// CrawlPrefill + encodePrefill/decodePrefill from HERE — no ad-hoc btoa/atob.
// ============================================================================

export interface CrawlPrefillOption {
  name: string;
  qty: number;
  addPrice: number;
}

export type RawPrefillOption = string | { name?: string; qty?: number; addPrice?: number } | null | undefined;

export interface CrawlPrefillInput {
  productName: string;
  supplierPrice?: number;
  salePrice?: number;
  mainImage?: string;
  additionalImgs?: string;
  description?: string;
  options?: RawPrefillOption[];
  catD1?: string;
  catD2?: string;
  catD3?: string;
  catD4?: string;
  // Supplier auto-mapping fields
  crawlSellerId?: string | number | null;
  crawlSellerNick?: string | null;
  crawlShipFee?: number | null;
  crawlCanMerge?: boolean | null;
  // Extended fields for product registration
  crawlProductNo?: string | number | null;
  crawlInventory?: number | null;
  crawlCategoryCode?: string | null;
  crawlNaverFeeRate?: number | null;
  crawlMinQuantity?: number | null;
  // Source tracking
  crawlSourceUrl?: string | null;
  crawlLogId?: string | null;
}

export interface CrawlPrefill extends Omit<CrawlPrefillInput, 'options'> {
  options: CrawlPrefillOption[];
}

/**
 * Keep only printable ASCII + safe Unicode, strip everything else. Guards
 * against control chars / replacement chars / the Arabic-extended-Latin range
 * that has corrupted JSON string literals in past crawls, and escapes quotes/
 * backslashes so the sanitized text never breaks the JSON it gets embedded in.
 */
export function sanitizePrefillText(s: string | undefined | null): string {
  return (s || '')
    .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')       // control chars
    .replace(/[�￾￿]/g, '')        // replacement/invalid chars
    .replace(/[؀-ۿĀ-ɏ]/g, '') // Arabic / extended Latin corruption
    .replace(/"/g, "'")                           // prevent JSON string breakage
    .replace(/\\(?!['"\\/bfnrtu])/g, '\\\\')      // escape lone backslashes
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize crawl option payloads (name-only strings or {name,qty,addPrice}) into one shape. */
export function normalizePrefillOptions(raw: RawPrefillOption[] | undefined | null): CrawlPrefillOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => {
      if (typeof o === 'string') {
        return { name: sanitizePrefillText(o), qty: 999, addPrice: 0 };
      }
      return {
        name: sanitizePrefillText(o?.name ?? ''),
        qty: Number.isFinite(o?.qty as number) ? Number(o!.qty) : 999,
        addPrice: Number.isFinite(o?.addPrice as number) ? Number(o!.addPrice) : 0,
      };
    })
    .filter((o) => o.name.length > 0);
}

/** Encode a prefill payload as URL-safe base64 (UTF-8 safe). */
export function encodePrefill(input: CrawlPrefillInput): string {
  const data: CrawlPrefill = {
    ...input,
    productName: sanitizePrefillText(input.productName),
    description: input.description !== undefined ? sanitizePrefillText(input.description) : input.description,
    options: normalizePrefillOptions(input.options),
  };
  const jsonStr = JSON.stringify(data);
  const utf8Bytes = new TextEncoder().encode(jsonStr);
  let binary = '';
  utf8Bytes.forEach((b) => { binary += String.fromCharCode(b); });
  // URL-safe base64: standard "+" gets eaten by URLSearchParams (form-encoded space).
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_');
}

/** Decode a `?prefill=` value back into a CrawlPrefill. Returns null on any failure. */
export function decodePrefill(raw: string | null | undefined): CrawlPrefill | null {
  if (!raw) return null;
  try {
    // URLSearchParams.get decodes "+" as space (form-encoded rule); restore it
    // before atob. Also accept URL-safe base64 (-/_) from any encoder.
    const bin = atob(raw.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 0xff;
    // Strip every C0 control + DEL — JSON spec forbids raw control chars inside string literals.
    const jsonStr = new TextDecoder('utf-8').decode(bytes).replace(/[\x00-\x1F\x7F]/g, ' ');
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    return {
      ...(parsed as Omit<CrawlPrefillInput, 'options'>),
      productName: typeof parsed.productName === 'string' ? parsed.productName : '',
      options: normalizePrefillOptions(parsed.options as RawPrefillOption[] | undefined),
    };
  } catch {
    return null;
  }
}
