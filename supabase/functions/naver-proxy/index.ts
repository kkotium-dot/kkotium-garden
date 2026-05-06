// supabase/functions/naver-proxy/index.ts
// Naver Commerce API proxy v2 — runs in Supabase Seoul region (fixed IP)
// Solves Vercel dynamic IP being blocked by GW.IP_NOT_ALLOWED
//
// v2 changes (2026-05-06, A3-4-DIAG follow-up):
//   1. GET  ?action=ip-echo       — returns outbound IP (no auth, for diagnostic)
//   2. POST { action: 'token' }   — Edge Function obtains token using its own env vars
//   3. POST { path, method, body } with NO x-naver-token — Edge Function obtains and uses token internally
//   4. POST { path, method, body } WITH x-naver-token — existing relay behavior (backward compat)
//
// All Naver outbound traffic now originates from Supabase Seoul region IP.
// Vercel only needs to call this proxy with PROXY_SECRET; no Naver IP registration needed for Vercel.
//
// Required Supabase Edge Function secrets:
//   PROXY_SECRET        — caller authentication (matches Vercel CRON_SECRET or PROXY_SECRET)
//   NAVER_CLIENT_ID     — Naver Commerce API client ID
//   NAVER_CLIENT_SECRET — Naver Commerce API client secret (bcrypt salt format $2a$04$...)
//                         IMPORTANT: in Supabase Edge Function secrets, the literal $ is stored as-is
//                         (no dotenv-expand). Just paste the bcrypt salt directly.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const NAVER_BASE = 'https://api.commerce.naver.com/external';
const NAVER_AUTH = `${NAVER_BASE}/v1/oauth2/token`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-proxy-secret, x-naver-token',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ── Token cache (in-memory, expires with 60s buffer) ───────────────────
let _cachedToken: string | null = null;
let _tokenExpiry = 0;

async function getNaverTokenInternal(): Promise<{ token: string; cached: boolean; expiresIn?: number }> {
  if (_cachedToken && Date.now() < _tokenExpiry - 60_000) {
    return { token: _cachedToken, cached: true };
  }

  const clientId     = Deno.env.get('NAVER_CLIENT_ID');
  const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('NAVER_CLIENT_ID / NAVER_CLIENT_SECRET must be set as Supabase Edge Function secrets');
  }

  const timestamp = Date.now().toString();
  const hashed    = await bcrypt.hash(`${clientId}_${timestamp}`, clientSecret);
  const signature = btoa(hashed);

  const r = await fetch(NAVER_AUTH, {
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

  const text = await r.text();
  if (!r.ok) {
    throw new Error(`Naver OAuth failed: ${r.status} - ${text.slice(0, 300)}`);
  }

  const data = JSON.parse(text);
  _cachedToken = data.access_token as string;
  _tokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;

  return { token: _cachedToken, cached: false, expiresIn: data.expires_in };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // ── [Endpoint 1] GET ?action=ip-echo - diagnostic, no auth ───────────
  if (req.method === 'GET') {
    const url = new URL(req.url);
    if (url.searchParams.get('action') === 'ip-echo') {
      try {
        const r = await fetch('https://api.ipify.org?format=json');
        const data = await r.json();
        return json({
          outboundIp: data?.ip ?? null,
          region: 'supabase-seoul-edge',
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : String(e) }, 500);
      }
    }
    return json({ error: 'GET only supported with ?action=ip-echo' }, 400);
  }

  // ── Auth check for all POST requests ─────────────────────────────────
  const proxySecret  = Deno.env.get('PROXY_SECRET') ?? '';
  const callerSecret = req.headers.get('x-proxy-secret') ?? '';
  if (proxySecret && callerSecret !== proxySecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  if (req.method !== 'POST') {
    return json({ error: 'Only POST is supported' }, 405);
  }

  let payload: { path?: string; method?: string; body?: unknown; action?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  // ── [Endpoint 2] POST { action: 'token' } - get token directly ──────
  if (payload.action === 'token') {
    try {
      const result = await getNaverTokenInternal();
      return json({
        access_token: result.token,
        cached: result.cached,
        expires_in: result.expiresIn,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[naver-proxy] token error:', msg);
      return json({ error: msg }, 500);
    }
  }

  // ── [Endpoint 3+4] POST { path, method, body } - Naver API relay ────
  const naverPath = payload.path ?? '';
  const method    = (payload.method ?? 'GET').toUpperCase();
  const bodyStr   = payload.body ? JSON.stringify(payload.body) : undefined;

  if (!naverPath) {
    return json({ error: 'path required' }, 400);
  }

  // Use caller-provided token if present, else obtain internally
  let naverToken = req.headers.get('x-naver-token') ?? '';
  let tokenSource: 'caller' | 'internal' = 'caller';
  if (!naverToken) {
    try {
      const result = await getNaverTokenInternal();
      naverToken = result.token;
      tokenSource = 'internal';
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[naver-proxy] internal token error:', msg);
      return json({ error: `Token obtain failed: ${msg}` }, 500);
    }
  }

  try {
    console.log(`[naver-proxy] ${method} ${naverPath} (token=${tokenSource})`);

    const naverRes = await fetch(`${NAVER_BASE}${naverPath}`, {
      method,
      headers: {
        'Authorization': `Bearer ${naverToken}`,
        'Content-Type':  'application/json;charset=UTF-8',
      },
      ...(bodyStr ? { body: bodyStr } : {}),
    });

    const text = await naverRes.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    console.log(`[naver-proxy] response status: ${naverRes.status}`);
    return json(data, naverRes.status);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[naver-proxy] error:', msg);
    return json({ error: msg }, 500);
  }
});
