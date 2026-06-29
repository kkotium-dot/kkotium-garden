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
  | 'AUTH_FAIL'           // 토큰 발급 실패 (분류 불명)
  | 'AUTH_SIGN_INVALID'   // NAVER 분류 GAP (#62): client_secret_sign not-valid.args — 시크릿 서명 불일치 (운영자 NAVER_CLIENT_SECRET 교체 필요)
  | 'APP_STATUS_INVALID'  // NAVER-APP-1: 커머스 API 애플리케이션 상태 무효 (운영자 콘솔 조치 필요)
  | 'UNKNOWN';

// ── NAVER-APP-1 (#62/#160): application-status-invalid common signal ─────────
// Naver Commerce OAuth rejects the token request when the registered application
// status is invalid (expired / unapproved / contract-renewal / deactivated). It
// is NOT a credential or code fault — it needs an operator action in the Commerce
// API center, and it surfaces identically on EVERY path (token + API, proxy +
// direct). We detect it once (here) so all callers can surface one honest message
// instead of an opaque, repeating 500. Matches the gateway type token and the
// Korean message the API returns.
const APP_STATUS_INVALID_RE =
  /eapp-application\.status\.invalid|어플리케이션 상태가 유효하지 않습니다/i;

export const NAVER_APP_STATUS_USER_MESSAGE =
  '네이버 커머스 API 애플리케이션 상태가 유효하지 않습니다. 네이버 커머스 API 센터에서 애플리케이션 상태(승인·약관 동의·계약 갱신)를 확인해 주세요.';

// ── NAVER 분류 GAP (#62): client_secret_sign not-valid.args ──────────────────
// The OAuth token request signs `${clientId}_${timestamp}` with the client
// secret (bcrypt). When the configured NAVER_CLIENT_SECRET is wrong/stale, Naver
// rejects the request with an invalidInputs entry naming `client_secret_sign`
// and type `not-valid.args`. This is NOT a transient outage — it needs the
// operator to replace the secret (proxy/server env). Previously it fell through
// to a generic AUTH_FAIL/HTTP_ERROR, so the dashboard could read it as a vague
// "unavailable" (or, on a 200-wrapped proxy body, a false "ok"). Detect it
// explicitly so every caller surfaces an honest, actionable message.
const CLIENT_SECRET_SIGN_INVALID_RE = /not-valid\.args/i;

export const NAVER_CLIENT_SECRET_USER_MESSAGE =
  '네이버 커머스 API 시크릿 서명(client_secret_sign)이 유효하지 않습니다. 프록시/서버 환경변수의 NAVER_CLIENT_SECRET 값을 최신 시크릿으로 교체($ 이스케이프)하고 재시작해 주세요.';

/**
 * True when an error is the client_secret_sign not-valid.args signature failure
 * (#62). Mirrors isNaverAppStatusInvalid: checks the structured diagnostic kind
 * and the captured body, then the raw message as a fallback.
 */
export function isNaverClientSecretInvalid(error: unknown): boolean {
  if (error instanceof NaverApiError) {
    if (error.diagnostic?.kind === 'AUTH_SIGN_INVALID') return true;
    if (error.diagnostic?.bodyHead && isClientSecretSignBody(error.diagnostic.bodyHead)) return true;
  }
  return error instanceof Error ? CLIENT_SECRET_SIGN_INVALID_RE.test(error.message) : false;
}

// The not-valid.args type is generic to invalidInputs; require the offending
// field to be client_secret_sign so a different field's not-valid.args (e.g. a
// product attribute) is never misattributed to the secret.
function isClientSecretSignBody(body: string): boolean {
  return CLIENT_SECRET_SIGN_INVALID_RE.test(body) && /client_secret_sign/i.test(body);
}

interface NaverDiagnostic {
  kind: NaverFailKind;
  status?: number;
  errCode?: string;          // undici cause.code (ECONNRESET 등)
  errno?: string;            // numeric/string errno
  syscall?: string;          // 'read' / 'write' — write에서 RST면 keep-alive 재사용 사고
  address?: string;          // remote IP (proxy)
  port?: number;             // remote port
  gwTraceId?: string;        // GNCP-GW-Trace-ID
  rateLimitReplenishRate?: string;
  rateLimitBurstCapacity?: string;
  bodyHead?: string;         // first 300 chars
  durationMs?: number;
  method?: string;
  path?: string;
  attempts?: number;         // 자동 재시도 횟수 (1 = 첫 시도 실패)
}

function classifyFetchFailure(
  cause: unknown,
): { kind: NaverFailKind; errCode?: string; errno?: string; syscall?: string; address?: string; port?: number } {
  const c = cause as {
    code?: string; errno?: string | number; syscall?: string;
    address?: string; port?: number; message?: string;
  } | null | undefined;
  const code  = c?.code ?? (typeof c?.errno === 'string' ? c.errno : undefined);
  const errno = typeof c?.errno === 'number' ? String(c.errno) : (typeof c?.errno === 'string' ? c.errno : undefined);
  const syscall = c?.syscall;
  const address = c?.address;
  const port    = c?.port;
  const base = { errCode: code, errno, syscall, address, port };
  if (!code) return { kind: 'UNKNOWN', ...base };
  if (code === 'ECONNRESET' || code === 'UND_ERR_SOCKET') return { kind: 'NETWORK_RESET', ...base };
  if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') return { kind: 'NETWORK_TIMEOUT', ...base };
  if (code === 'EAI_AGAIN' || code === 'ENOTFOUND') return { kind: 'DNS_FAIL', ...base };
  return { kind: 'UNKNOWN', ...base };
}

function classifyHttpStatus(status: number, bodyHead: string): NaverFailKind {
  // NAVER-APP-1: detected on the body regardless of the (proxy-rewrapped) status —
  // checked first so it is never masked as a generic HTTP_ERROR.
  if (APP_STATUS_INVALID_RE.test(bodyHead)) return 'APP_STATUS_INVALID';
  // NAVER 분류 GAP (#62): client_secret_sign not-valid.args — body-based, status-
  // agnostic (also catches a proxy 200-wrapped error body), before HTTP_ERROR.
  if (isClientSecretSignBody(bodyHead)) return 'AUTH_SIGN_INVALID';
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
    (diag.errno ? ` errno=${diag.errno}` : '') +
    (diag.syscall ? ` syscall=${diag.syscall}` : '') +
    (diag.address ? ` addr=${diag.address}${diag.port ? ':'+diag.port : ''}` : '') +
    (diag.attempts !== undefined ? ` attempts=${diag.attempts}` : '') +
    (diag.gwTraceId ? ` traceId=${diag.gwTraceId}` : '') +
    (diag.rateLimitReplenishRate ? ` rateLimit=${diag.rateLimitReplenishRate}/${diag.rateLimitBurstCapacity ?? '?'}` : '') +
    (diag.durationMs !== undefined ? ` ms=${diag.durationMs}` : '') +
    (diag.method ? ` ${diag.method}` : '') +
    (diag.path ? ` ${diag.path}` : '') +
    (diag.bodyHead ? ` body=${JSON.stringify(diag.bodyHead.slice(0, 300))}` : '')
  );
}

// ── 2026-06-02 P0 — keep-alive 닫힌 소켓 재사용 회선 수정 ──────────────────
// Desktop register 2회 시도 모두 ECONNRESET (durationMs 66/67ms, 거의 동일 =
// 재현 패턴). 같은 Tailscale proxy에서 GET addressbooks는 정상이지만 POST
// /v2/products만 끊김 → idle keep-alive socket 재사용 후 write 즉시 RST 받는
// 전형 패턴 (RESEARCH §4).
//
// 처방:
//   (1) Connection: close 헤더 + keepalive:false — 매 요청 새 연결 (proxy idle
//       timeout 회피).
//   (2) ECONNRESET / UND_ERR_SOCKET 감지 시 백오프 자동 재시도 (200/400/600ms,
//       최대 3회). 다른 종류 에러는 즉시 throw (무한 루프 방지).
//   (3) 매 시도마다 attempt 횟수를 [NAVER_DIAG] 로그에 기록.
const FETCH_MAX_ATTEMPTS = 3;

async function fetchNoKeepAlive(
  url: string,
  init: RequestInit,
  label: string,
): Promise<{ res: Response; attempts: number }> {
  // Force Connection: close — proxy/origin이 응답 후 즉시 FIN하도록.
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Connection')) headers.set('Connection', 'close');
  const safeInit: RequestInit = { ...init, headers, keepalive: false };

  let lastErr: unknown;
  for (let attempt = 1; attempt <= FETCH_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, safeInit);
      if (attempt > 1) {
        // Surface that the retry actually rescued the request.
        console.warn(`[NAVER_DIAG] retry-success attempt=${attempt} ${label}`);
      }
      return { res, attempts: attempt };
    } catch (e: unknown) {
      lastErr = e;
      const cls = classifyFetchFailure((e as { cause?: unknown }).cause);
      // 재시도 대상: keep-alive 닫힌 소켓 재사용 (ECONNRESET / UND_ERR_SOCKET) 만.
      // 그 외(타임아웃/DNS/인증)는 즉시 throw — 재시도해도 같은 결과.
      const retriable = cls.kind === 'NETWORK_RESET';
      if (!retriable || attempt >= FETCH_MAX_ATTEMPTS) {
        // Attach attempt count onto cause for downstream logging.
        (e as { _naverAttempts?: number })._naverAttempts = attempt;
        throw e;
      }
      const backoff = 200 * attempt;   // 200ms, 400ms (3차 시도 직전)
      console.warn(
        `[NAVER_DIAG] retry-backoff attempt=${attempt}/${FETCH_MAX_ATTEMPTS} ` +
        `errCode=${cls.errCode ?? '?'} syscall=${cls.syscall ?? '?'} ${label} backoff=${backoff}ms`,
      );
      await new Promise(r => setTimeout(r, backoff));
    }
  }
  // Defensive — shouldn't reach here.
  throw lastErr ?? new Error('fetchNoKeepAlive: exhausted without throw');
}

function extractAttempts(e: unknown): number | undefined {
  const n = (e as { _naverAttempts?: number } | null | undefined)?._naverAttempts;
  return typeof n === 'number' ? n : undefined;
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

/**
 * NAVER-APP-1 (#62/#160): true when a caught error is the Naver application-status
 * -invalid failure. Common across every Naver path — any route can call this to
 * surface NAVER_APP_STATUS_USER_MESSAGE honestly instead of a raw repeating 500.
 * Checks the structured diagnostic first, then falls back to scanning the message
 * (covers errors re-thrown without a NaverApiError wrapper).
 */
export function isNaverAppStatusInvalid(error: unknown): boolean {
  if (error instanceof NaverApiError) {
    if (error.diagnostic?.kind === 'APP_STATUS_INVALID') return true;
    if (error.diagnostic?.bodyHead && APP_STATUS_INVALID_RE.test(error.diagnostic.bodyHead)) return true;
  }
  return error instanceof Error ? APP_STATUS_INVALID_RE.test(error.message) : false;
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
    let attempts = 1;
    try {
      const r = await fetchNoKeepAlive(proxy.url, {
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'x-proxy-secret': proxy.secret,
        },
        body: JSON.stringify({ action: 'token' }),
      }, 'POST [proxy]/token');
      res = r.res;
      attempts = r.attempts;
    } catch (e: unknown) {
      const cls = classifyFetchFailure((e as { cause?: unknown }).cause);
      const diag: NaverDiagnostic = {
        kind: cls.kind === 'UNKNOWN' ? 'AUTH_FAIL' : cls.kind,
        errCode: cls.errCode,
        errno: cls.errno, syscall: cls.syscall, address: cls.address, port: cls.port,
        attempts: extractAttempts(e) ?? FETCH_MAX_ATTEMPTS,
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
        attempts,
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
      // #62: a 200-wrapped proxy body with no token is the false-ok case — classify
      // the body so client_secret_sign not-valid.args surfaces as AUTH_SIGN_INVALID
      // instead of a vague AUTH_FAIL.
      const bodyKind = classifyHttpStatus(res.status, text);
      const diag: NaverDiagnostic = {
        kind: bodyKind === 'UNKNOWN' ? 'AUTH_FAIL' : bodyKind,
        bodyHead: text, status: res.status, gwTraceId,
      };
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
  let attempts = 1;
  try {
    const r = await fetchNoKeepAlive(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:          clientId,
        timestamp,
        client_secret_sign: signature,
        grant_type:         'client_credentials',
        type:               'SELF',
      }),
    }, 'POST /external/v1/oauth2/token');
    res = r.res;
    attempts = r.attempts;
  } catch (e: unknown) {
    const cls = classifyFetchFailure((e as { cause?: unknown }).cause);
    const diag: NaverDiagnostic = {
      kind: cls.kind === 'UNKNOWN' ? 'AUTH_FAIL' : cls.kind,
      errCode: cls.errCode,
      errno: cls.errno, syscall: cls.syscall, address: cls.address, port: cls.port,
      attempts: extractAttempts(e) ?? FETCH_MAX_ATTEMPTS,
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
      attempts,
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
    let attempts = 1;
    try {
      const r = await fetchNoKeepAlive(proxy.url, {
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'x-proxy-secret': proxy.secret,
        },
        body: JSON.stringify({ path, method, body }),
      }, `${method} [proxy]${path}`);
      res = r.res;
      attempts = r.attempts;
    } catch (e: unknown) {
      const cls = classifyFetchFailure((e as { cause?: unknown }).cause);
      const diag: NaverDiagnostic = {
        kind: cls.kind,
        errCode: cls.errCode,
        errno: cls.errno, syscall: cls.syscall, address: cls.address, port: cls.port,
        attempts: extractAttempts(e) ?? FETCH_MAX_ATTEMPTS,
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
        attempts,
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
  let attempts = 1;
  try {
    const r = await fetchNoKeepAlive(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json;charset=UTF-8',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }, `${method} ${path}`);
    res = r.res;
    attempts = r.attempts;
  } catch (e: unknown) {
    const cls = classifyFetchFailure((e as { cause?: unknown }).cause);
    const diag: NaverDiagnostic = {
      kind: cls.kind,
      errCode: cls.errCode,
      errno: cls.errno, syscall: cls.syscall, address: cls.address, port: cls.port,
      attempts: extractAttempts(e) ?? FETCH_MAX_ATTEMPTS,
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
      attempts,
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

// ── 2026-06-02 P0 — 네이버 이미지 업로드 (외부 URL 직접 사용 불가) ──────────
// RESEARCH §1: representativeImage.url은 반드시 "상품 이미지 다건 등록 API"
// (POST /external/v1/product-images/upload) 를 통해 반환된 shop-phinf URL만
// 허용. Supabase/S3 public URL 직접 전송 → 400 "올바른 이미지 파일이 아닙니다".
//
// proxy 모드 제약 (home-proxy.mjs 정독 결과): 기존 relay는 body를 JSON으로만
// 파싱/전송 → 멀티파트 패스스루 불가. 따라서 proxy에 전용 action 'uploadImages'
// 를 추가 (proxy가 등록 IP에서 직접 Supabase fetch + 네이버 멀티파트 업로드).
// → home-proxy.mjs 동반 수정 필수 (대표가 git pull + proxy 재시작해야 적용).

/** Sniff real image MIME from magic bytes (확장자 신뢰 금지 — RESEARCH §3). */
export function sniffImageMime(bytes: Uint8Array, fallback = 'image/jpeg'): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return 'image/bmp';
  return fallback;
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'image/png': return 'png';
    case 'image/gif': return 'gif';
    case 'image/bmp': return 'bmp';
    default:          return 'jpg';
  }
}

/**
 * Upload images to Naver and return shop-phinf URLs (same order as input).
 * - proxy mode: delegate to home-proxy `action: 'uploadImages'` (multipart can't
 *   traverse the JSON relay; the proxy fetches Supabase bytes + uploads itself).
 * - direct mode: build multipart/form-data with field name "imageFiles" and
 *   per-part real MIME, POST to /external/v1/product-images/upload.
 * Naver limit: ≤10 files, <10MB total, account-level concurrency 1 (sequential).
 */
export async function uploadImagesToNaver(imageUrls: string[]): Promise<string[]> {
  const urls = imageUrls.filter(Boolean);
  if (urls.length === 0) return [];
  if (urls.length > 10) {
    throw new NaverApiError('이미지는 1회 최대 10개까지 업로드 가능합니다.', { kind: 'HTTP_ERROR' });
  }

  const proxy = getProxyConfig();
  const t0 = Date.now();

  // [Mode 1] Proxy mode: delegate the whole upload to the home proxy.
  if (proxy.url) {
    let res: Response;
    let attempts = 1;
    try {
      const r = await fetchNoKeepAlive(proxy.url, {
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'x-proxy-secret': proxy.secret,
        },
        body: JSON.stringify({ action: 'uploadImages', imageUrls: urls }),
      }, 'POST [proxy] uploadImages');
      res = r.res;
      attempts = r.attempts;
    } catch (e: unknown) {
      const cls = classifyFetchFailure((e as { cause?: unknown }).cause);
      const diag: NaverDiagnostic = {
        kind: cls.kind, errCode: cls.errCode,
        errno: cls.errno, syscall: cls.syscall, address: cls.address, port: cls.port,
        attempts: extractAttempts(e) ?? FETCH_MAX_ATTEMPTS,
        method: 'POST', path: '[proxy] uploadImages', durationMs: Date.now() - t0,
      };
      logNaverDiagnostic(diag);
      throw new NaverApiError(`이미지 업로드 실패 (proxy): fetch failed (${cls.errCode ?? 'unknown'})`, diag);
    }

    const text = await res.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    if (!res.ok) {
      const diag: NaverDiagnostic = {
        kind: classifyHttpStatus(res.status, text), status: res.status, attempts,
        bodyHead: text, durationMs: Date.now() - t0,
        method: 'POST', path: '[proxy] uploadImages',
      };
      logNaverDiagnostic(diag);
      throw new NaverApiError(
        `이미지 업로드 실패 (proxy): HTTP ${res.status} — ${text.slice(0, 200)}`, diag,
      );
    }
    // proxy returns Naver's pass-through { images: [{ url }] } or { error }.
    const out: string[] = Array.isArray(json?.images)
      ? json.images.map((i: any) => i?.url).filter(Boolean)
      : [];
    if (out.length === 0) {
      const diag: NaverDiagnostic = { kind: 'HTTP_ERROR', bodyHead: text, method: 'POST', path: '[proxy] uploadImages' };
      logNaverDiagnostic(diag);
      throw new NaverApiError(`이미지 업로드 응답에 URL 없음 (proxy): ${text.slice(0, 200)}`, diag);
    }
    return out;
  }

  // [Mode 2] Direct mode: build multipart locally + POST from current IP.
  const token = await getAccessToken();
  const form = new FormData();
  for (const url of urls) {
    const r = await fetch(url);
    if (!r.ok) {
      throw new NaverApiError(`이미지 원본 fetch 실패: ${url} (HTTP ${r.status})`, { kind: 'HTTP_ERROR', status: r.status });
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    const mime = sniffImageMime(buf, r.headers.get('content-type') ?? 'image/jpeg');
    const blob = new Blob([buf], { type: mime });
    form.append('imageFiles', blob, `image.${mimeToExt(mime)}`);
  }

  let res: Response;
  try {
    // NOTE: do NOT set Content-Type manually — fetch derives the multipart
    // boundary from the FormData body (RESEARCH §Details).
    res = await fetch(`${BASE_URL}/v1/product-images/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Connection': 'close' },
      body: form,
      keepalive: false,
    });
  } catch (e: unknown) {
    const cls = classifyFetchFailure((e as { cause?: unknown }).cause);
    const diag: NaverDiagnostic = {
      kind: cls.kind, errCode: cls.errCode, syscall: cls.syscall, address: cls.address, port: cls.port,
      method: 'POST', path: '/v1/product-images/upload', durationMs: Date.now() - t0,
    };
    logNaverDiagnostic(diag);
    throw new NaverApiError(`이미지 업로드 실패: fetch failed (${cls.errCode ?? 'unknown'})`, diag);
  }

  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    const diag: NaverDiagnostic = {
      kind: classifyHttpStatus(res.status, text), status: res.status,
      gwTraceId: res.headers.get('GNCP-GW-Trace-ID') ?? undefined,
      bodyHead: text, durationMs: Date.now() - t0,
      method: 'POST', path: '/v1/product-images/upload',
    };
    logNaverDiagnostic(diag);
    throw new NaverApiError(`이미지 업로드 실패: HTTP ${res.status} — ${text.slice(0, 200)}`, diag);
  }
  const out: string[] = Array.isArray(json?.images)
    ? json.images.map((i: any) => i?.url).filter(Boolean)
    : [];
  if (out.length === 0) {
    throw new NaverApiError(`이미지 업로드 응답에 URL 없음: ${text.slice(0, 200)}`, { kind: 'HTTP_ERROR', bodyHead: text });
  }
  return out;
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
//
// ★ CRITICAL — Naver v2 PUT /v2/products/origin-products/{no} is a FULL REPLACE
//   (commerce-api discussion #1650): fields omitted from the request body are
//   REMOVED from the live product. A naive partial PUT of just
//   `{ originProduct: { stockQuantity } }` therefore wipes name / salePrice /
//   images / options / origin / detailContent — the entire listing degrades.
//
//   Safe pattern (this module, 2026-06-06): read the CURRENT full Naver state
//   via GET, override ONLY stockQuantity, then PUT the merged full payload. This
//   preserves every existing field (including any Naver-side manual edits) and
//   never re-uploads images. It is strictly safer than rebuilding from the DB
//   (which would clobber Naver-side state with possibly-stale local values and
//   force an image re-upload on every stock change).
//
//   Trade-off vs DB rebuild (buildNaverProductPayload, used by register/update
//   routes): GET-merge depends on Naver echoing a PUT-compatible originProduct
//   shape. If a read-only field in the GET body is rejected by PUT, the update
//   errors out (no mutation) rather than corrupting data — a safe failure mode.

export interface StockUpdateResult {
  productNo: string;
  previousStock: number | null;   // stock read back from Naver (null if absent)
  newStock: number;
  applied: boolean;               // true only when a real PUT was sent
  dryRun: boolean;
  preservedFieldCount: number;    // originProduct top-level keys carried through
}

/**
 * Update stock quantity for a product WITHOUT dropping any other field.
 *
 * Reads the current full product from Naver (GET), overrides only
 * stockQuantity, and PUTs the merged full payload back. Never sends a partial
 * payload — see the module note above for why that would corrupt the listing.
 *
 * @param opts.dryRun  When true, performs the GET + merge and returns the
 *                     would-be result WITHOUT the PUT (no mutation). Used to
 *                     verify the merge before any irreversible write.
 */
export async function updateStock(
  productNo: string,
  stockQuantity: number,
  opts: { dryRun?: boolean } = {},
): Promise<StockUpdateResult> {
  if (!productNo) {
    throw new NaverApiError(
      '재고 수정 불가 — productNo(naverProductId)가 비어 있습니다 (미등록 상품).',
      { kind: 'HTTP_ERROR' },
    );
  }
  if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
    throw new NaverApiError(
      `재고 수정 불가 — stockQuantity 값이 올바르지 않습니다 (${stockQuantity}).`,
      { kind: 'HTTP_ERROR' },
    );
  }

  // 1. Read current full Naver state — never blind partial-PUT.
  const current = await getProduct(productNo);
  const originProduct = current?.originProduct;
  if (!originProduct || typeof originProduct !== 'object') {
    throw new NaverApiError(
      `재고 수정 중단 — GET origin-products/${productNo} 응답에 originProduct가 없어 ` +
      '전체 페이로드를 보존할 수 없습니다 (부분 PUT 금지).',
      { kind: 'HTTP_ERROR' },
    );
  }

  const previousStock =
    typeof originProduct.stockQuantity === 'number' ? originProduct.stockQuantity : null;

  // 2. Merge: preserve EVERY existing field, override only stockQuantity.
  const mergedOrigin = { ...originProduct, stockQuantity };
  const payload: Record<string, unknown> = { originProduct: mergedOrigin };
  // Carry channel-product blocks back unchanged so the PUT stays a true superset.
  if (current.smartstoreChannelProduct) payload.smartstoreChannelProduct = current.smartstoreChannelProduct;

  const result: StockUpdateResult = {
    productNo,
    previousStock,
    newStock: stockQuantity,
    applied: false,
    dryRun: opts.dryRun === true,
    preservedFieldCount: Object.keys(mergedOrigin).length,
  };

  // 3. dryRun stops before the irreversible PUT.
  if (opts.dryRun) return result;

  // 4. Full-payload PUT — full replace that preserves all fields.
  await naverRequest('PUT', `/v2/products/origin-products/${productNo}`, payload);
  result.applied = true;
  return result;
}

/**
 * Force a product to OUTOFSTOCK in Naver Commerce by setting stockQuantity=0.
 * Naver flips statusType to OUTOFSTOCK automatically when stock reaches zero,
 * which is the seller-controllable path for OUTOFSTOCK (that value is
 * stock-derived and not directly settable). NOTE: SALE / SUSPENSION / CLOSE ARE
 * settable directly via the product PUT payload (originProduct.statusType) — the
 * update route's full-replace PUT emits statusType='SALE', which releases a
 * 판매중지(SUSPENSION). Only OUTOFSTOCK is read-only here.
 * Routes through the safe GET-merge updateStock so the rest of the listing is
 * preserved. Throws on any Commerce API error so the caller can decide whether
 * to surface a partial-success message.
 */
export async function setProductOutOfStock(
  productNo: string,
  opts: { dryRun?: boolean } = {},
): Promise<StockUpdateResult> {
  return updateStock(productNo, 0, opts);
}

/** Bulk inventory update for multiple products */
export async function bulkUpdateStock(
  items: Array<{ productNo: string; stockQuantity: number }>,
  opts: { dryRun?: boolean } = {},
): Promise<{
  success: string[];
  skipped: Array<{ productNo: string; reason: string }>;
  failed: Array<{ productNo: string; error: string }>;
}> {
  const results = {
    success: [] as string[],
    skipped: [] as Array<{ productNo: string; reason: string }>,
    failed: [] as Array<{ productNo: string; error: string }>,
  };
  // Naver has no bulk stock endpoint — run sequentially with error isolation.
  // Each item still goes through the safe GET-merge path (full-payload PUT).
  for (const item of items) {
    if (!item.productNo) {
      // Unregistered product — skip rather than blind-PUT.
      results.skipped.push({ productNo: item.productNo, reason: 'no naverProductId' });
      continue;
    }
    try {
      await updateStock(item.productNo, item.stockQuantity, opts);
      results.success.push(item.productNo);
    } catch (e: any) {
      results.failed.push({ productNo: item.productNo, error: e?.message ?? String(e) });
    }
  }
  return results;
}

// ── Bidirectional sync integrity (T2.5 seed) ──────────────────────────────
// There is no reverse pull (Naver -> app) today, so the app DB and the live
// Naver listing can silently drift. This helper reads the current Naver state
// and diffs the commonly-drifting fields against what the app expects, so a
// caller can detect drift BEFORE an update/stock PUT overwrites it. Read-only:
// it never mutates Naver. Full reverse-sync (persisting Naver -> DB) is a
// follow-up track; this is the minimal diff primitive that track builds on.

export interface NaverFieldDiff {
  field: string;
  naver: unknown;   // value currently on Naver
  app: unknown;     // value the app expected
}

export interface NaverProductDiffResult {
  productNo: string;
  inSync: boolean;
  diffs: NaverFieldDiff[];
  naverSnapshot: {
    name: string | null;
    salePrice: number | null;
    stockQuantity: number | null;
    statusType: string | null;
    representativeImageUrl: string | null;
  };
}

/**
 * Diff the live Naver product against app-side expected values. Only the
 * fields actually provided in `appExpected` are compared. Read-only (GET).
 */
export async function diffNaverProduct(
  productNo: string,
  appExpected: Partial<{
    name: string;
    salePrice: number;
    stockQuantity: number;
    statusType: string;
    representativeImageUrl: string;
  }>,
): Promise<NaverProductDiffResult> {
  if (!productNo) {
    throw new NaverApiError('diffNaverProduct 불가 — productNo가 비어 있습니다.', { kind: 'HTTP_ERROR' });
  }
  const current = await getProduct(productNo);
  const op = current?.originProduct ?? {};
  const repImg: string | null =
    op?.images?.representativeImage?.url ??
    op?.images?.representativeImageUrl ??
    null;

  const naverSnapshot = {
    name:            typeof op.name === 'string' ? op.name : null,
    salePrice:       typeof op.salePrice === 'number' ? op.salePrice : null,
    stockQuantity:   typeof op.stockQuantity === 'number' ? op.stockQuantity : null,
    statusType:      typeof op.statusType === 'string' ? op.statusType : null,
    representativeImageUrl: repImg,
  };

  const diffs: NaverFieldDiff[] = [];
  const cmp = (field: string, naver: unknown, app: unknown) => {
    if (app !== undefined && naver !== app) diffs.push({ field, naver, app });
  };
  cmp('name',                   naverSnapshot.name,                   appExpected.name);
  cmp('salePrice',              naverSnapshot.salePrice,              appExpected.salePrice);
  cmp('stockQuantity',          naverSnapshot.stockQuantity,          appExpected.stockQuantity);
  cmp('statusType',             naverSnapshot.statusType,             appExpected.statusType);
  cmp('representativeImageUrl', naverSnapshot.representativeImageUrl, appExpected.representativeImageUrl);

  return { productNo, inSync: diffs.length === 0, diffs, naverSnapshot };
}
