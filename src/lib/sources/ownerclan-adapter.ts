// src/lib/sources/ownerclan-adapter.ts
// ============================================================================
// OwnerClanAdapter — real implementation (OWNERCLAN_INTEGRATION_2026-09-09)
// ============================================================================
//
// Source: OwnerClan (https://ownerclan.com), GraphQL-only API.
// Auth: username/password -> JWT (short-lived), re-issued automatically when
//       expired/about to expire. NOT the browser-cookie pattern used for
//       Domeggook/Domemae (supplier_sessions table) — OwnerClan requires a
//       password-backed token refresh, so credentials are read from
//       platforms.encrypted_password (AES-256-GCM, never plaintext) via
//       src/lib/security/credential-crypto.ts.
//
// Endpoints (operator-supplied official manual, 2026-09-09 — this project has
// NO other independent source for these URLs; treat the manual as sole
// source of truth and verify shape against real API responses rather than
// assuming fields beyond what's documented):
//   Auth (prod):  https://auth.ownerclan.com/auth       (POST, JSON body)
//   Auth (sbx):   https://auth-sandbox.ownerclan.com/auth
//   API  (prod):  https://api.ownerclan.com/v1/graphql  (GraphQL, Bearer JWT)
//   API  (sbx):   https://api-sandbox.ownerclan.com/v1/graphql
//
// Auth request body: { service: "ownerclan", userType: "seller", username, password }
// GraphQL reads use GET with `query` as a URL query param (per manual);
// writes (createOrder etc.) use POST. This adapter only implements reads
// (getItemDetail/getInventory/getMinQuantity) for Sprint 6 scope — order
// placement (placeOrder) remains NotImplemented until Sprint 8.
// ============================================================================

import { prisma } from '@/lib/prisma';
import { decryptCredential } from '@/lib/security/credential-crypto';
import {
  SourceAdapter,
  ItemDetail,
  SearchFilter,
  ItemListResult,
  InventorySnapshot,
  Category,
  OrderRequest,
  OrderResult,
  SourceAdapterError,
  notImplemented,
} from './source-adapter';

const PLATFORM_CODE = 'OWC';
const PLATFORM_NAME = 'OwnerClan';

const AUTH_URL = 'https://auth.ownerclan.com/auth';
const GRAPHQL_URL = 'https://api.ownerclan.com/v1/graphql';
const FETCH_TIMEOUT_MS = 15_000;

// In-memory JWT cache (per server instance). OwnerClan JWT TTL is not
// documented in the manual, so we conservatively re-auth every 50 minutes
// rather than trusting an unverified long cache (#231 — don't assume
// undocumented behavior).
const TOKEN_TTL_MS = 50 * 60 * 1000;
let cachedToken: { token: string; issuedAt: number } | null = null;

/**
 * Fetch OwnerClan credentials from platforms table (encrypted at rest).
 * Returns null if not configured yet (operator hasn't entered ID/PW).
 */
async function getCredentials(): Promise<{ username: string; password: string } | null> {
  const platform = await prisma.platform.findUnique({
    where: { code: PLATFORM_CODE },
    select: { loginUsername: true, encryptedPassword: true },
  });
  if (!platform?.loginUsername || !platform.encryptedPassword) return null;
  try {
    const password = decryptCredential(platform.encryptedPassword);
    return { username: platform.loginUsername, password };
  } catch (e) {
    throw new SourceAdapterError(
      PLATFORM_CODE,
      'AuthFailed',
      'Failed to decrypt stored OwnerClan credentials (encryption key mismatch or corrupted data).',
      e,
    );
  }
}

/**
 * Issue a fresh JWT from OwnerClan's auth endpoint. Never logs the password.
 */
async function issueToken(username: string, password: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: 'ownerclan', userType: 'seller', username, password }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    throw new SourceAdapterError(PLATFORM_CODE, 'Network', 'Network error contacting OwnerClan auth endpoint.', e);
  }

  if (!res.ok) {
    // 401/403 = wrong credentials; anything else = platform-side issue.
    const kind = res.status === 401 || res.status === 403 ? 'AuthFailed' : 'BadResponse';
    throw new SourceAdapterError(PLATFORM_CODE, kind, `OwnerClan auth returned HTTP ${res.status}.`);
  }

  // Manual does not specify the exact response shape; the token is returned
  // as raw text per the documented flow (JWT strings are not valid JSON).
  // We accept either a bare JWT string or a { token } JSON wrapper, and fail
  // loudly (not silently) if neither shape matches — no guessing (#231).
  const raw = await res.text();
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { token?: string; accessToken?: string };
      const token = parsed.token ?? parsed.accessToken;
      if (token) return token;
    } catch {
      // fall through to error below
    }
  } else if (trimmed.length > 20 && trimmed.split('.').length === 3) {
    // looks like a raw JWT (header.payload.signature)
    return trimmed;
  }
  throw new SourceAdapterError(
    PLATFORM_CODE,
    'BadResponse',
    `OwnerClan auth response did not match expected shape (JWT string or {token}). Raw length: ${trimmed.length}.`,
  );
}

/** Get a valid JWT, reusing the cache when still fresh. */
async function getToken(): Promise<string> {
  if (cachedToken && Date.now() - cachedToken.issuedAt < TOKEN_TTL_MS) {
    return cachedToken.token;
  }
  const creds = await getCredentials();
  if (!creds) {
    throw new SourceAdapterError(
      PLATFORM_CODE,
      'AuthFailed',
      'OwnerClan credentials are not configured (platforms.login_username / encrypted_password).',
    );
  }
  const token = await issueToken(creds.username, creds.password);
  cachedToken = { token, issuedAt: Date.now() };
  return token;
}

/**
 * Execute a GraphQL query against OwnerClan's single endpoint using GET
 * (per manual: reads use GET with `query` as a URL param). Auto-retries once
 * with a forced re-auth if the first attempt gets a 401 (token expired
 * earlier than our TTL estimate).
 */
async function fetchGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const run = async (token: string): Promise<Response> => {
    const url = new URL(GRAPHQL_URL);
    url.searchParams.set('query', query);
    if (variables) url.searchParams.set('variables', JSON.stringify(variables));
    return fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  };

  let token = await getToken();
  let res: Response;
  try {
    res = await run(token);
  } catch (e) {
    throw new SourceAdapterError(PLATFORM_CODE, 'Network', 'Network error contacting OwnerClan GraphQL endpoint.', e);
  }

  if (res.status === 401) {
    // Token expired sooner than expected — force re-auth once.
    cachedToken = null;
    token = await getToken();
    try {
      res = await run(token);
    } catch (e) {
      throw new SourceAdapterError(PLATFORM_CODE, 'Network', 'Network error on OwnerClan GraphQL retry.', e);
    }
  }

  if (!res.ok) {
    throw new SourceAdapterError(PLATFORM_CODE, 'BadResponse', `OwnerClan GraphQL returned HTTP ${res.status}.`);
  }

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors && json.errors.length > 0) {
    throw new SourceAdapterError(
      PLATFORM_CODE,
      'BadResponse',
      `OwnerClan GraphQL errors: ${json.errors.map((e) => e.message).join('; ')}`,
    );
  }
  if (json.data === undefined) {
    throw new SourceAdapterError(PLATFORM_CODE, 'BadResponse', 'OwnerClan GraphQL response missing data field.');
  }
  return json.data;
}

// ----------------------------------------------------------------------------
// GraphQL query field names below come directly from the operator-supplied
// manual (item / itemsByKeys / allItems / itemHistories / createOrder /
// simulateCreateOrder / order / allOrders). We deliberately request the
// narrowest field set needed for each adapter method rather than guessing at
// a wide shape — GraphQL lets us discover exact field names via the
// OwnerClan Playground (browser at GRAPHQL_URL) if a query below turns out
// to reference a wrong field; that will surface as a clear GraphQL error
// from fetchGraphQL rather than a silent wrong value.
// ----------------------------------------------------------------------------

interface OwnerClanItem {
  key: string;
  name?: string;
  price?: number;
  shippingFee?: number;
  origin?: string;
  status?: string;
  stock?: number;
}

export class OwnerClanAdapter implements SourceAdapter {
  readonly platformCode = PLATFORM_CODE;
  readonly platformName = PLATFORM_NAME;

  async getItemDetail(productNo: string): Promise<ItemDetail | null> {
    const query = `query($key: ID!) { item(key: $key) { key name price shippingFee origin status stock } }`;
    let data: { item: OwnerClanItem | null };
    try {
      data = await fetchGraphQL<{ item: OwnerClanItem | null }>(query, { key: productNo });
    } catch (e) {
      if (e instanceof SourceAdapterError && e.kind === 'NotFound') return null;
      throw e;
    }
    if (!data.item) return null;
    const it = data.item;
    return {
      productNo: it.key,
      name: it.name ?? '',
      supplierPrice: it.price ?? 0,
      images: [],
      options: [],
      description: '',
      sourceUrl: `https://www.ownerclan.com/V2/product/view.php?selfcode=${encodeURIComponent(it.key)}`,
      inventory: it.stock ?? -1,
      shipFee: it.shippingFee ?? 0,
      canMerge: false,
      sellerNick: '',
      sellerId: '',
      sellerRank: 0,
      categoryName: '',
      categoryCode: '',
      country: it.origin ?? '',
      status: it.status ?? 'unknown',
      isOnSupply: false,
      minQuantity: 1,
    };
  }

  async searchItems(filter: SearchFilter): Promise<ItemListResult> {
    console.log(`[${PLATFORM_CODE}] searchItems stub called:`, filter);
    notImplemented(PLATFORM_CODE, 'searchItems');
  }

  /**
   * Bulk inventory via itemsByKeys (documented: up to 5000 keys/call).
   * Returns qty=-1/status='unknown' for any key OwnerClan doesn't return
   * (never silently drops — caller expects same-length coverage, #260).
   */
  async getInventory(productNos: string[]): Promise<InventorySnapshot[]> {
    if (productNos.length === 0) return [];
    const query = `query($keys: [ID!]!) { itemsByKeys(keys: $keys) { key price status stock } }`;
    const polledAt = new Date();
    const data = await fetchGraphQL<{ itemsByKeys: OwnerClanItem[] }>(query, { keys: productNos });
    const byKey = new Map(data.itemsByKeys.map((it) => [it.key, it]));
    return productNos.map((no) => {
      const it = byKey.get(no);
      return {
        productNo: no,
        qty: it?.stock ?? -1,
        status: it?.status ?? 'unknown',
        supplierPrice: it?.price ?? null,
        polledAt,
      };
    });
  }

  async getCategories(): Promise<Category[]> {
    console.log(`[${PLATFORM_CODE}] getCategories stub called`);
    notImplemented(PLATFORM_CODE, 'getCategories');
  }

  async placeOrder(order: OrderRequest): Promise<OrderResult> {
    console.log(`[${PLATFORM_CODE}] placeOrder stub called:`, order);
    notImplemented(PLATFORM_CODE, 'placeOrder');
  }

  async getMinQuantity(productNo: string): Promise<number> {
    const detail = await this.getItemDetail(productNo);
    return detail?.minQuantity ?? 1;
  }
}

// Singleton instance for convenience.
export const ownerClanAdapter = new OwnerClanAdapter();
