// src/lib/naver/api-client.ts
// Naver SmartStore Channel API client
// Docs: https://api.commerce.naver.com/docs
// Auth: OAuth 2.0 Client Credentials (client_id + client_secret -> access_token)
//
// Architecture (2026-05-06, A3-4-DIAG follow-up):
//   When NAVER_PROXY_URL is set: ALL traffic (including token) goes through proxy.
//     The proxy runs on a registered IP (home computer via Tailscale Funnel, or
//     Naver Cloud VM in the future) and handles token + API calls.
//   When NAVER_PROXY_URL is empty: direct OAuth + API call from current process.
//     Used in local dev where the registered home IP is the originating IP.
//
// Required env vars (PROXY mode):
//   NAVER_PROXY_URL  -- e.g. https://your-mac.tailnet.ts.net (Tailscale Funnel)
//   PROXY_SECRET     -- shared secret matching home-proxy
// Required env vars (direct mode, local dev):
//   NAVER_CLIENT_ID
//   NAVER_CLIENT_SECRET (bcrypt salt format $2a$04$...; in .env.local must escape $ as \$)

import bcrypt from 'bcryptjs';

const BASE_URL = 'https://api.commerce.naver.com/external';
const AUTH_URL = 'https://api.commerce.naver.com/external/v1/oauth2/token';

// Read env at runtime (not module load) so dev/prod behavior matches
function getProxyConfig() {
  return {
    url:    process.env.NAVER_PROXY_URL ?? '',
    secret: process.env.PROXY_SECRET ?? process.env.CRON_SECRET ?? '',
  };
}

// ── Diagnostic classifier (P0 fetch-failed root-cause) ────────────────────
// RESEARCH §4 분기: GW.IP_NOT_ALLOWED / ECONNRESET / ETIMEDOUT / 429 / 약관차단
export type NaverFailKind =
  | 'IP_NOT_ALLOWED'      // HTTP 403 + GW.IP_NOT_ALLOWED — Vercel 유동 IP 차단 (Static IP 또는 프록시 필요)
  | 'RATE_LIMIT'          // HTTP 429 — 1~2초 backoff 후 재호출
  | 'NETWORK_RESET'       // ECONNRESET / UND_ERR_SOCKET — keep-alive 닫힌 소켓 재사용
  | 'NETWORK_TIMEOUT'     // ETIMEDOUT
  | 'DNS_FAIL'            // EAI_AGAIN / ENOTFOUND
  | 'HTTP_ERROR'          // 4xx/5xx (분류 불명)
  | 'AUTH_FAIL'           // 토큰 발급 실패
  | 'UNKNOWN';

interface NaverDiagnostic {
  kind: NaverFailKind;
  status?: number;
  errCode?: string;          // undici cause.code (ECONNRESET 등)
  gwTraceId?: string;        // GNCP-GW-Trace-ID
  rateLimitReplenishRate?: string;
  rateLimitBurstCapacity?: string;
  bodyHead?: string;         // first 300 chars
  durationMs?: number;
  method?: string;
  path?: string;
}

function classifyFetchFailure(
  cause: unknown,
): { kind: NaverFailKind; errCode?: string } {
  const c = cause as { code?: string; errno?: string; message?: string } | null | undefined;
  const code = c?.code ?? c?.errno;
  if (!code) return { kind: 'UNKNOWN' };
  if (code === 'ECONNRESET' || code === 'UND_ERR_SOCKET') return { kind: 'NETWORK_RESET', errCode: code };
  if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') return { kind: 'NETWORK_TIMEOUT', errCode: code };
  if (code === 'EAI_AGAIN' || code === 'ENOTFOUND') return { kind: 'DNS_FAIL', errCode: code };
  return { kind: 'UNKNOWN', errCode: code };
}

function classifyHttpStatus(status: number, bodyHead: string): NaverFailKind {
  if (status === 429) return 'RATE_LIMIT';
  if (status === 403 && /GW\.IP_NOT_ALLOWED/i.test(bodyHead)) return 'IP_NOT_ALLOWED';
  if (status >= 400) return 'HTTP_ERROR';
  return 'UNKNOWN';
}

function logNaverDiagnostic(diag: NaverDiagnostic): void {
  // Single-line structured log — easy to grep in Vercel runtime logs.
  console.error(
    `[NAVER_DIAG] kind=${diag.kind}` +
    (diag.status !== undefined ? ` status=${diag.status}` : '') +
    (diag.errCode ? ` errCode=${diag.errCode}` : '') +
    (diag.gwTraceId ? ` traceId=${diag.gwTraceId}` : '') +
    (diag.rateLimitReplenishRate ? ` rateLimit=${diag.rateLimitReplenishRate}/${diag.rateLimitBurstCapacity ?? '?'}` : '') +
    (diag.durationMs !== undefined ? ` ms=${diag.durationMs}` : '') +
    (diag.method ? ` ${diag.method}` : '') +
    (diag.path ? ` ${diag.path}` : '') +
    (diag.bodyHead ? ` body=${JSON.stringify(diag.bodyHead.slice(0, 300))}` : '')
  );
}

/**
 * Structured Naver API error. Throwers attach `.diagnostic` so route handlers
 * can return a precise 4xx without re-parsing the message.
 */
export class NaverApiError extends Error {
  diagnostic: NaverDiagnostic;
  constructor(message: string, diagnostic: NaverDiagnostic) {
    super(message);
    this.name = 'NaverApiError';
    this.diagnostic = diagnostic;
  }
}

// ── Token cache (in-memory, refreshed when expired) ──────────────────────
let _cachedToken: string | null = null;
let _tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (_cachedToken && Date.now() < _tokenExpiry - 60_000) {
    return _cachedToken;
  }

  const proxy = getProxyConfig();

  // [Mode 1] Proxy mode: route token request through proxy (which has registered IP)
  if (proxy.url) {
    const t0 = Date.now();
    let res: Response;
    try {
      res = await fetch(proxy.url, {
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'x-proxy-secret': proxy.secret,
        },
        body: JSON.stringify({ action: 'token' }),
      });
    } catch (e: unknown) {
      const cls = classifyFetchFailure((e as { cause?: unknown }).cause);
      const diag: NaverDiagnostic = {
        kind: cls.kind === 'UNKNOWN' ? 'AUTH_FAIL' : cls.kind,
        errCode: cls.errCode,
        method: 'POST',
        path: '[proxy]/token',
        durationMs: Date.now() - t0,
      };
      logNaverDiagnostic(diag);
      throw new NaverApiError(`Naver OAuth via proxy 실패: fetch failed (${cls.errCode ?? 'unknown'})`, diag);
    }

    const text = await res.text();
    const gwTraceId = res.headers.get('GNCP-GW-Trace-ID') ?? res.headers.get('x-gncp-gw-trace-id') ?? undefined;
    if (!res.ok) {
      const diag: NaverDiagnostic = {
        kind: classifyHttpStatus(res.status, text),
        status: res.status,
        gwTraceId,
        bodyHead: text,
        durationMs: Date.now() - t0,
        method: 'POST',
        path: '[proxy]/token',
      };
      logNaverDiagnostic(diag);
      throw new NaverApiError(`Naver OAuth via proxy 실패: HTTP ${res.status}`, diag);
    }

    let data: { access_token?: string; expires_in?: number };
    try { data = JSON.parse(text); } catch {
      const diag: NaverDiagnostic = { kind: 'AUTH_FAIL', bodyHead: text, status: res.status, gwTraceId };
      logNaverDiagnostic(diag);
      throw new NaverApiError('Proxy OAuth response not JSON', diag);
    }

    if (!data.access_token) {
      const diag: NaverDiagnostic = { kind: 'AUTH_FAIL', bodyHead: text, status: res.status, gwTraceId };
      logNaverDiagnostic(diag);
      throw new NaverApiError('Proxy OAuth response missing access_token', diag);
    }

    _cachedToken = data.access_token;
    _tokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
    return _cachedToken;
  }

  // [Mode 2] Direct mode: bcrypt-sign + fetch from current process IP
  const clientId     = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const diag: NaverDiagnostic = { kind: 'AUTH_FAIL' };
    throw new NaverApiError(
      'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 설정되지 않았습니다. ' +
      '.env.local 파일에 추가하거나 NAVER_PROXY_URL 사용을 검토하세요.',
      diag,
    );
  }

  // Naver Commerce OAuth: bcrypt signature
  const timestamp = Date.now().toString();
  const hashed    = await bcrypt.hash(`${clientId}_${timestamp}`, clientSecret);
  const signature = Buffer.from(hashed).toString('base64');

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:          clientId,
        timestamp,
        client_secret_sign: signature,
        grant_type:         'client_credentials',
        type:               'SELF',
      }),
    });
  } catch (e: unknown) {
    const cls = classifyFetchFailure((e as { cause?: unknown }).cause);
    const diag: NaverDiagnostic = {
      kind: cls.kind === 'UNKNOWN' ? 'AUTH_FAIL' : cls.kind,
      errCode: cls.errCode,
      method: 'POST',
      path: '/external/v1/oauth2/token',
      durationMs: Date.now() - t0,
    };
    logNaverDiagnostic(diag);
    throw new NaverApiError(`Naver OAuth 실패: fetch failed (${cls.errCode ?? 'unknown'})`, diag);
  }

  const text = await res.text();
  const gwTraceId = res.headers.get('GNCP-GW-Trace-ID') ?? res.headers.get('x-gncp-gw-trace-id') ?? undefined;
  if (!res.ok) {
    const diag: NaverDiagnostic = {
      kind: classifyHttpStatus(res.status, text),
      status: res.status,
      gwTraceId,
      bodyHead: text,
      durationMs: Date.now() - t0,
      method: 'POST',
      path: '/external/v1/oauth2/token',
    };
    logNaverDiagnostic(diag);
    throw new NaverApiError(`Naver OAuth 실패: HTTP ${res.status}`, diag);
  }

  const data = JSON.parse(text);
  _cachedToken = data.access_token as string;
  _tokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;

  return _cachedToken;
}

// ── Generic request helper ────────────────────────────────────────────────
export async function naverRequest<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: string,
  body?: unknown,
): Promise<T> {
  const proxy = getProxyConfig();
  const t0 = Date.now();

  // [Mode 1] Proxy mode: just POST {path, method, body} - proxy handles token
  if (proxy.url) {
    let res: Response;
    try {
      res = await fetch(proxy.url, {
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'x-proxy-secret': proxy.secret,
        },
        body: JSON.stringify({ path, method, body }),
      });
    } catch (e: unknown) {
      const cls = classifyFetchFailure((e as { cause?: unknown }).cause);
      const diag: NaverDiagnostic = {
        kind: cls.kind,
        errCode: cls.errCode,
        method, path: `[proxy]${path}`,
        durationMs: Date.now() - t0,
      };
      logNaverDiagnostic(diag);
      throw new NaverApiError(
        `Naver API ${method} ${path} 실패 (proxy): fetch failed (${cls.errCode ?? 'unknown'})`,
        diag,
      );
    }

    const text = await res.text();
    const gwTraceId = res.headers.get('GNCP-GW-Trace-ID') ?? res.headers.get('x-gncp-gw-trace-id') ?? undefined;
    let json: any;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!res.ok) {
      const diag: NaverDiagnostic = {
        kind: classifyHttpStatus(res.status, text),
        status: res.status,
        gwTraceId,
        rateLimitReplenishRate: res.headers.get('GNCP-GW-RateLimit-Replenish-Rate') ?? undefined,
        rateLimitBurstCapacity: res.headers.get('GNCP-GW-RateLimit-Burst-Capacity') ?? undefined,
        bodyHead: text,
        durationMs: Date.now() - t0,
        method, path: `[proxy]${path}`,
      };
      logNaverDiagnostic(diag);
      throw new NaverApiError(
        `Naver API ${method} ${path} 실패 (proxy): HTTP ${res.status}`,
        diag,
      );
    }
    return json as T;
  }

  // [Mode 2] Direct mode: get token + fetch directly
  const token = await getAccessToken();

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json;charset=UTF-8',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (e: unknown) {
    const cls = classifyFetchFailure((e as { cause?: unknown }).cause);
    const diag: NaverDiagnostic = {
      kind: cls.kind,
      errCode: cls.errCode,
      method, path,
      durationMs: Date.now() - t0,
    };
    logNaverDiagnostic(diag);
    throw new NaverApiError(
      `Naver API ${method} ${path} 실패: fetch failed (${cls.errCode ?? 'unknown'})`,
      diag,
    );
  }

  const text = await res.text();
  const gwTraceId = res.headers.get('GNCP-GW-Trace-ID') ?? res.headers.get('x-gncp-gw-trace-id') ?? undefined;
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    const diag: NaverDiagnostic = {
      kind: classifyHttpStatus(res.status, text),
      status: res.status,
      gwTraceId,
      rateLimitReplenishRate: res.headers.get('GNCP-GW-RateLimit-Replenish-Rate') ?? undefined,
      rateLimitBurstCapacity: res.headers.get('GNCP-GW-RateLimit-Burst-Capacity') ?? undefined,
      bodyHead: text,
      durationMs: Date.now() - t0,
      method, path,
    };
    logNaverDiagnostic(diag);
    throw new NaverApiError(
      `Naver API ${method} ${path} 실패: HTTP ${res.status}`,
      diag,
    );
  }

  return json as T;
}

// ── Connectivity check (call before any real request) ────────────────────
export async function checkNaverConnection(): Promise<{
  ok: boolean;
  sellerId?: string;
  error?: string;
}> {
  try {
    const data = await naverRequest<any>('GET', '/v1/seller/channels');
    return { ok: true, sellerId: data?.sellerId ?? data?.content?.[0]?.channelNo };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Product APIs ──────────────────────────────────────────────────────────

export interface NaverProductOrigin {
  originAreaCode: string;
  content?: string;
  plural?: boolean;
  importer?: string;
}

export interface NaverProductPayload {
  // Required
  originProduct: {
    statusType:       'SALE' | 'SUSPENSION' | 'CLOSE';
    saleType:         'NEW' | 'USED';
    leafCategoryId:   string;
    name:             string;
    detailContent:    string;
    images:           { representativeImageUrl: string; optionalImageUrls?: string[] };
    salePrice:        number;
    stockQuantity:    number;
    // Optional
    deliveryInfo?:    { deliveryType: string; deliveryAttributeType: string; deliveryFee?: any };
    afterServiceInfo?:{ afterServiceTelephoneNumber: string; afterServiceGuideContent: string };
    productLogistics?: NaverProductOrigin[];
    sellerProductCode?: string;
    brandCertificationNo?: string;
  };
  smartstoreChannelProduct: {
    naverShoppingRegistration: boolean;
    channelProductDisplayStatusType: 'ON' | 'OFF';
  };
}

/** Register a new product -> returns naverProductId */
export async function registerProduct(payload: NaverProductPayload): Promise<string> {
  const data = await naverRequest<any>('POST', '/v2/products', payload);
  return data.productNo ?? data.originProductNo ?? data.id;
}

/** Update existing product */
export async function updateProduct(
  productNo: string,
  payload: Partial<NaverProductPayload>
): Promise<void> {
  await naverRequest('PUT', `/v2/products/origin-products/${productNo}`, payload);
}

/** Get product detail */
export async function getProduct(productNo: string): Promise<any> {
  return naverRequest('GET', `/v2/products/origin-products/${productNo}`);
}

// ── Order APIs ────────────────────────────────────────────────────────────

export interface NaverOrderSearchParams {
  lastChangedFrom: string;   // ISO datetime e.g. 2026-03-01T00:00:00.000+09:00
  lastChangedTo?:  string;
  pageNum?:        number;
  pageSize?:       number;   // max 300
}

/** Fetch changed orders within a time window */
// Correct endpoint: /v1/pay-order/seller/product-orders
// Required params: from, to (KST ISO datetime), productOrderStatuses (optional)
export async function getOrders(params: NaverOrderSearchParams): Promise<any> {
  const q = new URLSearchParams({
    from: params.lastChangedFrom,
    ...(params.lastChangedTo ? { to: params.lastChangedTo } : {}),
    ...(params.pageNum       ? { pageNum:  String(params.pageNum)  } : {}),
    ...(params.pageSize      ? { pageSize: String(params.pageSize) } : {}),
  });
  return naverRequest('GET', `/v1/pay-order/seller/product-orders?${q}`);
}

/** Get today's order summary (count + revenue) for dashboard */
export async function getTodayOrderSummary(): Promise<{
  count: number; revenue: number; paidAmount: number;
}> {
  // KST today 00:00 ~ now
  const now   = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const todayKST  = new Date(Math.floor((now.getTime() + kstOffset) / 86400000) * 86400000 - kstOffset);
  const fmt = (d: Date) => d.toISOString().replace('Z', '+09:00');

  try {
    const data = await getOrders({
      lastChangedFrom: fmt(todayKST),
      lastChangedTo:   fmt(now),
      pageSize: 300,
    });
    // Naver API response: { data: { contents: [...] } }
    const inner = data?.data ?? {};
    const orders: any[] = inner?.contents ?? inner?.data ?? data?.content ?? data?.productOrders ?? [];
    const revenue    = orders.reduce((s: number, o: any) => s + Number(o.totalPaymentAmount ?? o.paymentAmount ?? 0), 0);
    const paidAmount = orders.reduce((s: number, o: any) => s + Number(o.paymentAmount ?? 0), 0);
    return { count: orders.length, revenue, paidAmount };
  } catch {
    return { count: 0, revenue: 0, paidAmount: 0 };
  }
}

// ── Inventory APIs ────────────────────────────────────────────────────────

/** Update stock quantity for a product */
export async function updateStock(
  productNo: string,
  stockQuantity: number
): Promise<void> {
  await naverRequest('PUT', `/v2/products/origin-products/${productNo}`, {
    originProduct: { stockQuantity },
  });
}

/**
 * Force a product to OUTOFSTOCK in Naver Commerce by setting stockQuantity=0.
 * Naver flips statusType to OUTOFSTOCK automatically when stock reaches zero,
 * which is the seller-controllable path (statusType itself is read-only).
 * Throws on any Commerce API error so the caller can decide whether to
 * surface a partial-success message.
 */
export async function setProductOutOfStock(productNo: string): Promise<void> {
  await updateStock(productNo, 0);
}

/** Bulk inventory update for multiple products */
export async function bulkUpdateStock(
  items: Array<{ productNo: string; stockQuantity: number }>
): Promise<{ success: string[]; failed: Array<{ productNo: string; error: string }> }> {
  const results = { success: [] as string[], failed: [] as any[] };
  // Naver doesn't have bulk stock update — run sequentially with error isolation
  for (const item of items) {
    try {
      await updateStock(item.productNo, item.stockQuantity);
      results.success.push(item.productNo);
    } catch (e: any) {
      results.failed.push({ productNo: item.productNo, error: e.message });
    }
  }
  return results;
}
