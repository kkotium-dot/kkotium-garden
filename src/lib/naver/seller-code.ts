// src/lib/naver/seller-code.ts
// P0: Seller product code auto-generation
// Format: {supplierPrefix}-{productCode}
// productCode auto-generated as 5-digit sequential if omitted
// e.g., DMM-12345, KKT-00042
// This code maps to Naver Excel column 1 (seller product code)

const DEFAULT_PREFIX = 'KKT';

// Generate auto product code: 5-digit with timestamp seed for uniqueness
function generateAutoProductCode(): string {
  const now = Date.now();
  // Use last 5 digits of timestamp + random for collision resistance
  const base = (now % 100000);
  const jitter = Math.floor(Math.random() * 10);
  return String(base + jitter).padStart(5, '0');
}

export interface SellerCodeInput {
  supplierPrefix?: string;
  supplierProductCode?: string;
}

// Main generator
// - If both prefix + code given: "DMM-12345"
// - If only prefix given: "DMM-{auto5digit}"
// - If nothing given: "KKT-{auto5digit}"
export function generateSellerCode(input?: SellerCodeInput): string {
  const prefix = input?.supplierPrefix || DEFAULT_PREFIX;
  const code = input?.supplierProductCode || generateAutoProductCode();
  return `${prefix}-${code}`;
}

// Validate seller code format: PREFIX-CODE
export function isValidSellerCode(code: string): boolean {
  if (!code || code.length < 3 || code.length > 30) return false;
  // Must match ALPHA+-ALPHANUM+ pattern
  return /^[A-Za-z][A-Za-z0-9]*-[A-Za-z0-9_]+$/.test(code);
}

// Parse seller code into prefix and product code parts
export function parseSellerCode(code: string): {
  prefix: string;
  productCode: string;
} | null {
  const dashIdx = code.indexOf('-');
  if (dashIdx < 1) return null;
  return {
    prefix: code.substring(0, dashIdx),
    productCode: code.substring(dashIdx + 1),
  };
}

// Generate batch codes for multiple products under same supplier
export function generateBatchCodes(
  count: number,
  supplierPrefix?: string
): string[] {
  const codes: Set<string> = new Set();
  const maxAttempts = count * 5;
  let attempts = 0;

  while (codes.size < count && attempts < maxAttempts) {
    codes.add(generateSellerCode({ supplierPrefix }));
    attempts++;
  }

  return Array.from(codes);
}
