// scripts/home-proxy.mjs
// Home computer proxy for Naver Commerce API
// Architecture: Vercel production -> Tailscale Funnel -> this proxy (home IP) -> Naver API
//
// Why this exists:
//   Naver Commerce API restricts callers to up to 3 registered IPs. Vercel's serverless
//   egress IPs are dynamic (we observed 10+ unique IPs in 11 calls). Supabase Edge
//   Functions have the same problem. The user's home IP (219.248.15.46) is registered,
//   so this small proxy runs on the home Mac and relays Naver API calls.
//
// This proxy listens on localhost:3001 only. It is reachable from the public internet
// only via Tailscale Funnel, which provides automatic HTTPS and a stable URL like
// https://<machine>.<tailnet>.ts.net.
//
// Endpoints:
//   GET  /health      -> { ok: true, ip: '219.248.15.46', cached_token: true|false }
//   POST /            -> Naver API relay
//                        Headers: x-proxy-secret: <PROXY_SECRET>
//                        Body:    { path: '/v1/...', method: 'GET'|'POST'|..., body?: {...}, action?: 'token' }
//                        Response: <pass-through Naver response>
//
// Run: node scripts/home-proxy.mjs
// Or via launchd: ~/Library/LaunchAgents/com.kkotium.home-proxy.plist

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

// Reuse bcryptjs from project node_modules
const bcrypt = require(path.join(projectRoot, 'node_modules', 'bcryptjs'));

// ─────────────────────────────────────────────────────────────────────
// Load .env.local manually (small parser, no dotenv dep)
// ─────────────────────────────────────────────────────────────────────
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Unescape backslash-dollar (Vercel uses raw $, .env.local uses \$)
    value = value.replace(/\\\$/g, '$');
    env[key] = value;
  }
  return env;
}

const envLocal = loadEnvFile(path.join(projectRoot, '.env.local'));

// Environment with .env.local fallback
function getEnv(key) {
  return process.env[key] ?? envLocal[key];
}

const NAVER_CLIENT_ID     = getEnv('NAVER_CLIENT_ID');
const NAVER_CLIENT_SECRET = getEnv('NAVER_CLIENT_SECRET');
const PROXY_SECRET        = getEnv('PROXY_SECRET') ?? getEnv('CRON_SECRET') ?? 'kkotium2026cron';
const PORT                = Number(getEnv('HOME_PROXY_PORT') ?? 3001);

if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
  console.error('[home-proxy] FATAL: NAVER_CLIENT_ID or NAVER_CLIENT_SECRET missing');
  console.error('[home-proxy] Checked .env.local at:', path.join(projectRoot, '.env.local'));
  process.exit(1);
}

const NAVER_BASE = 'https://api.commerce.naver.com/external';
const NAVER_AUTH = `${NAVER_BASE}/v1/oauth2/token`;

// ─────────────────────────────────────────────────────────────────────
// Token cache (in-memory)
// ─────────────────────────────────────────────────────────────────────
let _cachedToken = null;
let _tokenExpiry = 0;

async function getNaverToken() {
  if (_cachedToken && Date.now() < _tokenExpiry - 60_000) {
    return { token: _cachedToken, cached: true };
  }

  const timestamp = Date.now().toString();
  const hashed    = await bcrypt.hash(`${NAVER_CLIENT_ID}_${timestamp}`, NAVER_CLIENT_SECRET);
  const signature = Buffer.from(hashed).toString('base64');

  const r = await fetch(NAVER_AUTH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:          NAVER_CLIENT_ID,
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
  _cachedToken = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;

  return { token: _cachedToken, cached: false, expiresIn: data.expires_in };
}

// ─────────────────────────────────────────────────────────────────────
// HTTP server
// ─────────────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end',   () => resolve(data));
    req.on('error', reject);
  });
}

function jsonResponse(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type':   'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const startTime = Date.now();
  const reqId = Math.random().toString(36).slice(2, 8);

  try {
    // CORS for testing
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-proxy-secret',
      });
      res.end();
      return;
    }

    // Health check (no auth)
    if (req.method === 'GET' && req.url.startsWith('/health')) {
      jsonResponse(res, 200, {
        ok: true,
        service: 'kkotium-home-proxy',
        cached_token: !!_cachedToken && Date.now() < _tokenExpiry - 60_000,
        uptime_seconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Verify proxy secret
    const callerSecret = req.headers['x-proxy-secret'];
    if (callerSecret !== PROXY_SECRET) {
      console.warn(`[${reqId}] Unauthorized: secret mismatch`);
      jsonResponse(res, 401, { error: 'Unauthorized' });
      return;
    }

    // Only POST for relay
    if (req.method !== 'POST') {
      jsonResponse(res, 405, { error: 'Only POST is supported for relay' });
      return;
    }

    // Parse body
    let payload;
    try {
      const raw = await readBody(req);
      payload = raw ? JSON.parse(raw) : {};
    } catch (e) {
      jsonResponse(res, 400, { error: 'Invalid JSON body' });
      return;
    }

    // [Action] Get token directly
    if (payload.action === 'token') {
      const result = await getNaverToken();
      console.log(`[${reqId}] token request (cached=${result.cached})`);
      jsonResponse(res, 200, {
        access_token: result.token,
        cached:       result.cached,
        expires_in:   result.expiresIn,
      });
      return;
    }

    // [Action] Upload images to Naver (multipart) — 2026-06-02 P0.
    // The JSON relay below can't pass multipart through, so the proxy itself
    // fetches the Supabase bytes and uploads them from the registered home IP.
    // Body: { action: 'uploadImages', imageUrls: ['https://...supabase.../main.jpg', ...] }
    // Response: pass-through Naver { images: [{ url }] } (shop-phinf URLs).
    if (payload.action === 'uploadImages') {
      const imageUrls = Array.isArray(payload.imageUrls) ? payload.imageUrls.filter(Boolean) : [];
      if (imageUrls.length === 0) {
        jsonResponse(res, 400, { error: 'imageUrls required (non-empty array)' });
        return;
      }
      if (imageUrls.length > 10) {
        jsonResponse(res, 400, { error: 'Naver allows at most 10 images per upload' });
        return;
      }

      const { token } = await getNaverToken();
      const form = new FormData();
      for (const url of imageUrls) {
        const r = await fetch(url);
        if (!r.ok) {
          jsonResponse(res, 502, { error: `source image fetch failed: ${url} (HTTP ${r.status})` });
          return;
        }
        const bytes = new Uint8Array(await r.arrayBuffer());
        // Sniff real MIME from magic bytes — extension is not trusted (Naver
        // rejects PhotoInfraUpload.extension on mismatch).
        let mime = r.headers.get('content-type') || 'image/jpeg';
        let ext  = 'jpg';
        if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) { mime = 'image/jpeg'; ext = 'jpg'; }
        else if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) { mime = 'image/png'; ext = 'png'; }
        else if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) { mime = 'image/gif'; ext = 'gif'; }
        else if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) { mime = 'image/bmp'; ext = 'bmp'; }
        const blob = new Blob([bytes], { type: mime });
        form.append('imageFiles', blob, `image.${ext}`);
      }

      // Do NOT set Content-Type — fetch derives the multipart boundary from form.
      const upRes = await fetch(`${NAVER_BASE}/v1/product-images/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form,
      });
      const upText = await upRes.text();
      let upData;
      try { upData = JSON.parse(upText); } catch { upData = { raw: upText }; }
      console.log(`[${reqId}] uploadImages(${imageUrls.length}) -> ${upRes.status} (${Date.now() - startTime}ms)`);
      jsonResponse(res, upRes.status, upData);
      return;
    }

    // [Default] Naver API relay
    const naverPath = payload.path ?? '';
    const method    = (payload.method ?? 'GET').toUpperCase();
    const bodyStr   = payload.body ? JSON.stringify(payload.body) : undefined;

    if (!naverPath) {
      jsonResponse(res, 400, { error: 'path required in body' });
      return;
    }

    const { token } = await getNaverToken();

    console.log(`[${reqId}] ${method} ${naverPath}`);

    const naverRes = await fetch(`${NAVER_BASE}${naverPath}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json;charset=UTF-8',
      },
      ...(bodyStr ? { body: bodyStr } : {}),
    });

    const text = await naverRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    console.log(`[${reqId}] -> ${naverRes.status} (${Date.now() - startTime}ms)`);
    jsonResponse(res, naverRes.status, data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[${reqId}] error:`, msg);
    jsonResponse(res, 500, { error: msg });
  }
});

// Listen on localhost only (Tailscale Funnel forwards from public to localhost)
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[home-proxy] Listening on http://127.0.0.1:${PORT}`);
  console.log(`[home-proxy] PROXY_SECRET length: ${PROXY_SECRET.length}`);
  console.log(`[home-proxy] NAVER_CLIENT_ID prefix: ${NAVER_CLIENT_ID.slice(0, 4)}...`);
  console.log(`[home-proxy] NAVER_CLIENT_SECRET length: ${NAVER_CLIENT_SECRET.length} (expected 29 for bcrypt salt)`);
  console.log(`[home-proxy] Ready. Run: tailscale funnel ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[home-proxy] SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('[home-proxy] SIGINT received, shutting down');
  server.close(() => process.exit(0));
});
