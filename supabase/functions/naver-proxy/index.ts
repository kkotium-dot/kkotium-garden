// supabase/functions/naver-proxy/index.ts
// Naver Commerce API proxy — runs in Supabase Seoul region (fixed IP)
// Solves Vercel dynamic IP being blocked by GW.IP_NOT_ALLOWED
//
// Architecture:
//   Vercel (dynamic IP, gets Naver token) → Supabase proxy (fixed Korean IP) → Naver API
//
// Request format:
//   POST /naver-proxy
//   Headers: x-proxy-secret, x-naver-token (Bearer token from Vercel)
//   Body: { path: string, method?: string, body?: object }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const NAVER_BASE = 'https://api.commerce.naver.com/external';

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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Verify proxy secret
  const proxySecret   = Deno.env.get('PROXY_SECRET') ?? '';
  const callerSecret  = req.headers.get('x-proxy-secret') ?? '';
  if (proxySecret && callerSecret !== proxySecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // Get Naver token from caller
  const naverToken = req.headers.get('x-naver-token') ?? '';
  if (!naverToken) {
    return json({ error: 'x-naver-token header required' }, 400);
  }

  try {
    let naverPath = '';
    let method    = 'GET';
    let bodyStr: string | undefined;

    if (req.method === 'POST') {
      const payload = await req.json();
      naverPath = payload.path  ?? '';
      method    = payload.method ?? 'GET';
      if (payload.body) bodyStr = JSON.stringify(payload.body);
    } else {
      const url = new URL(req.url);
      naverPath = url.searchParams.get('path') ?? '';
      method    = url.searchParams.get('method') ?? 'GET';
    }

    if (!naverPath) return json({ error: 'path required' }, 400);

    console.log(`[naver-proxy] ${method} ${naverPath}`);

    const naverRes = await fetch(`${NAVER_BASE}${naverPath}`, {
      method,
      headers: {
        'Authorization': `Bearer ${naverToken}`,
        'Content-Type':  'application/json;charset=UTF-8',
      },
      ...(bodyStr ? { body: bodyStr } : {}),
    });

    const data = await naverRes.json();
    console.log(`[naver-proxy] response status: ${naverRes.status}`);

    return json(data, naverRes.status);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[naver-proxy] error:', msg);
    return json({ error: msg }, 500);
  }
});
