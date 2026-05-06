// /api/_debug/naver-doctor — Comprehensive Naver Commerce API diagnostic endpoint
// Eight-step health check designed to pinpoint the cause of persistent 403 errors.
// Reference: docs/api/COMMERCE_API_ORDER_DIAGNOSIS.md sections 1, 6, 9, 10
//
// Usage:
//   curl http://localhost:3000/api/_debug/naver-doctor
//   curl https://kkotium-garden.vercel.app/api/_debug/naver-doctor?secret=<CRON_SECRET>
//
// Response: JSON with checks{} and report[] (Korean traffic-light summary)

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Officially registered IPs in apicenter.commerce.naver.com (as of 2026-05-06)
const REGISTERED_IPS = ['219.248.15.46', '64.29.17.131', '216.198.79.131'];

const NAVER_BASE = 'https://api.commerce.naver.com/external';
const NAVER_AUTH = `${NAVER_BASE}/v1/oauth2/token`;

const sha8 = (s: string) =>
  crypto.createHash('sha256').update(s).digest('hex').slice(0, 8);

const toKST = (d: Date) => d.toISOString().replace('Z', '+09:00');

interface CheckResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  // Optional auth for production
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const isLocal =
    request.headers.get('host')?.startsWith('localhost') ||
    request.headers.get('host')?.startsWith('127.0.0.1');
  if (!isLocal && process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checks: CheckResult = {};
  const report: string[] = [];

  // ──────────────────────────────────────────────────────────────────────
  // [1] ENV CHECK — Environment variable existence + safe fingerprint
  // ──────────────────────────────────────────────────────────────────────
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const proxyUrl = process.env.NAVER_PROXY_URL;
  const proxySecret = process.env.PROXY_SECRET ?? process.env.CRON_SECRET ?? '';

  const isBcryptSalt =
    !!clientSecret && /^\$2[ayb]\$\d{2}\$.{22}$/.test(clientSecret);

  checks.env = {
    NAVER_CLIENT_ID: clientId
      ? {
          length: clientId.length,
          prefix4: clientId.slice(0, 4),
          sha256_prefix8: sha8(clientId),
        }
      : 'MISSING',
    NAVER_CLIENT_SECRET: clientSecret
      ? {
          length: clientSecret.length,
          prefix7: clientSecret.slice(0, 7),
          sha256_prefix8: sha8(clientSecret),
          isBcryptSalt,
        }
      : 'MISSING',
    NAVER_PROXY_URL: proxyUrl ?? 'NOT_SET',
    PROXY_SECRET_SET: !!proxySecret,
  };

  if (!clientId || !clientSecret) {
    report.push('🔴 [ENV] NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 누락');
  } else if (!isBcryptSalt) {
    report.push(
      `🔴 [ENV] CLIENT_SECRET 형식 비정상 — bcrypt salt ($2a$04$XXXXXXXXXXXXXXXXXXXXXXX) 형식이어야 함. 현재 길이=${clientSecret.length}`,
    );
  } else {
    report.push('🟢 [ENV] 환경변수 존재 + 시크릿 bcrypt salt 형식 정상');
  }

  // ──────────────────────────────────────────────────────────────────────
  // [2] CLOCK CHECK — Server time vs Naver server time
  // ──────────────────────────────────────────────────────────────────────
  const localNow = Date.now();
  let serverNow: number | null = null;
  let clockSkewMs: number | null = null;
  try {
    const r = await fetch(NAVER_AUTH, { method: 'OPTIONS' });
    const dateHeader = r.headers.get('date');
    if (dateHeader) {
      serverNow = new Date(dateHeader).getTime();
      clockSkewMs = serverNow - localNow;
    }
  } catch {
    // ignore — non-critical
  }
  checks.clock = { localNow, serverNow, clockSkewMs };

  if (clockSkewMs === null) {
    report.push('🟡 [CLOCK] 서버 시간 동기화 확인 불가 (네이버 OPTIONS 실패)');
  } else if (Math.abs(clockSkewMs) > 5000) {
    report.push(
      `🔴 [CLOCK] 시계 동기화 오차 ${clockSkewMs}ms — bcrypt timestamp 검증 실패 가능`,
    );
  } else {
    report.push(`🟢 [CLOCK] 시계 동기화 정상 (오차 ${clockSkewMs}ms)`);
  }

  // ──────────────────────────────────────────────────────────────────────
  // [3] SIGN CHECK — bcrypt signature generation
  // ──────────────────────────────────────────────────────────────────────
  let signSample: CheckResult | null = null;
  let signOk = false;
  try {
    if (clientId && clientSecret) {
      const ts = Date.now().toString();
      const hashed = await bcrypt.hash(`${clientId}_${ts}`, clientSecret);
      const sig = Buffer.from(hashed).toString('base64');
      signOk = sig.length > 0;
      signSample = {
        timestamp: ts,
        hashedLength: hashed.length,
        sigLength: sig.length,
        sigPrefix8: sig.slice(0, 8),
      };
    }
  } catch (e) {
    signSample = { error: e instanceof Error ? e.message : String(e) };
  }
  checks.sign = { ok: signOk, sample: signSample };

  if (signOk) {
    report.push('🟢 [SIGN] bcrypt 서명 생성 정상');
  } else {
    report.push(
      `🔴 [SIGN] bcrypt 서명 생성 실패 — 시크릿 salt 형식 문제 가능성: ${JSON.stringify(signSample)}`,
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // [4] TOKEN CHECK — Direct OAuth token request (no proxy)
  // ──────────────────────────────────────────────────────────────────────
  let tokenResult: CheckResult = { skipped: 'env or sign failed' };
  let accessToken: string | null = null;

  if (clientId && clientSecret && signOk) {
    try {
      const ts = Date.now().toString();
      const hashed = await bcrypt.hash(`${clientId}_${ts}`, clientSecret);
      const sig = Buffer.from(hashed).toString('base64');

      const r = await fetch(NAVER_AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          timestamp: ts,
          client_secret_sign: sig,
          grant_type: 'client_credentials',
          type: 'SELF',
        }),
      });

      const text = await r.text();
      let body: CheckResult;
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text.slice(0, 500) };
      }

      tokenResult = {
        status: r.status,
        ok: r.ok,
        bodyCode: body?.code ?? null,
        bodyMessage: body?.message ?? null,
        bodyKeys: Object.keys(body ?? {}),
        tokenPrefix12:
          r.ok && body.access_token
            ? String(body.access_token).slice(0, 12) + '...'
            : null,
        expiresIn: body?.expires_in ?? null,
      };

      if (r.ok && body.access_token) {
        accessToken = body.access_token;
      }
    } catch (e) {
      tokenResult = { error: e instanceof Error ? e.message : String(e) };
    }
  }
  checks.token = tokenResult;

  if (tokenResult.ok) {
    report.push('🟢 [TOKEN] OAuth 토큰 직접 발급 성공');
  } else if (tokenResult.status === 401 || tokenResult.status === 403) {
    report.push(
      `🔴 [TOKEN] OAuth 토큰 발급 ${tokenResult.status} — 시크릿 키 불일치 거의 확정. code=${tokenResult.bodyCode}, msg=${tokenResult.bodyMessage}`,
    );
  } else if (tokenResult.skipped) {
    report.push(`⏭️ [TOKEN] 건너뜀 (${tokenResult.skipped})`);
  } else {
    report.push(`🟡 [TOKEN] 알 수 없는 실패: ${JSON.stringify(tokenResult).slice(0, 200)}`);
  }

  // ──────────────────────────────────────────────────────────────────────
  // [5] IP ECHO — Outbound IP from this server
  // ──────────────────────────────────────────────────────────────────────
  let outboundIp: string | null = null;
  let ipError: string | null = null;
  try {
    const r = await fetch('https://api.ipify.org?format=json', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cache: 'no-store' as any,
    });
    const data = await r.json();
    outboundIp = data?.ip ?? null;
  } catch (e) {
    ipError = e instanceof Error ? e.message : String(e);
  }

  const isRegisteredIp =
    !!outboundIp && REGISTERED_IPS.includes(outboundIp);

  checks.ip = {
    outboundIp,
    ipError,
    registeredIps: REGISTERED_IPS,
    isRegistered: isRegisteredIp,
  };

  if (outboundIp) {
    if (isRegisteredIp) {
      report.push(`🟢 [IP] outbound IP ${outboundIp}가 apicenter 등록 IP에 포함됨`);
    } else {
      report.push(
        `🟡 [IP] outbound IP ${outboundIp}가 등록 IP 3개에 없음 — PROXY 사용 시 무관, 직접 호출 시 IP_NOT_ALLOWED 가능`,
      );
    }
  } else {
    report.push(`🟡 [IP] outbound IP 확인 실패: ${ipError}`);
  }

  // ──────────────────────────────────────────────────────────────────────
  // [6] PROXY CHECK — Reachability of NAVER_PROXY_URL
  // ──────────────────────────────────────────────────────────────────────
  let proxyCheck: CheckResult = { configured: false };
  if (proxyUrl) {
    try {
      const r = await fetch(proxyUrl, {
        method: 'OPTIONS',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cache: 'no-store' as any,
      });
      proxyCheck = {
        configured: true,
        url: proxyUrl,
        reachable: true,
        optionsStatus: r.status,
      };
    } catch (e) {
      proxyCheck = {
        configured: true,
        url: proxyUrl,
        reachable: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
  checks.proxy = proxyCheck;

  if (proxyCheck.configured) {
    if (proxyCheck.reachable) {
      report.push(`🟢 [PROXY] Supabase Edge Function 도달 가능 (status=${proxyCheck.optionsStatus})`);
    } else {
      report.push(`🔴 [PROXY] PROXY 도달 불가: ${proxyCheck.error}`);
    }
  } else {
    report.push('🟡 [PROXY] NAVER_PROXY_URL 미설정 — 직접 호출 모드');
  }

  // ──────────────────────────────────────────────────────────────────────
  // [7] ORDER 4-WAY — Test 4 endpoint variants to pinpoint mapping issue
  //   A: current code (from=, to=) — reproduces 403 expected
  //   B1: lastChangedFrom + lastChangedType (PAY_WAITING)
  //   B2: last-changed-statuses endpoint
  //   B3: POST /query endpoint
  // ──────────────────────────────────────────────────────────────────────
  const orderTests: CheckResult = {};
  if (accessToken) {
    const now = new Date();
    const fromKST = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    interface TestSpec {
      name: string;
      method: 'GET' | 'POST';
      path: string;
      body?: string;
    }

    const tests: TestSpec[] = [
      {
        name: 'A_current_code_from_to',
        method: 'GET',
        path: `/v1/pay-order/seller/product-orders?from=${encodeURIComponent(toKST(fromKST))}&to=${encodeURIComponent(toKST(now))}&pageSize=10`,
      },
      {
        name: 'B1_lastChanged_with_type',
        method: 'GET',
        path: `/v1/pay-order/seller/product-orders?lastChangedFrom=${encodeURIComponent(toKST(fromKST))}&lastChangedTo=${encodeURIComponent(toKST(now))}&lastChangedType=PAY_WAITING&pageSize=10`,
      },
      {
        name: 'B2_last_changed_statuses',
        method: 'GET',
        path: `/v1/pay-order/seller/product-orders/last-changed-statuses?lastChangedFrom=${encodeURIComponent(toKST(fromKST))}&lastChangedType=PAY_WAITING`,
      },
      {
        name: 'B3_post_query',
        method: 'POST',
        path: `/v1/pay-order/seller/product-orders/query`,
        body: JSON.stringify({
          fromTime: toKST(fromKST),
          toTime: toKST(now),
        }),
      },
    ];

    for (const t of tests) {
      try {
        const r = await fetch(`${NAVER_BASE}${t.path}`, {
          method: t.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json;charset=UTF-8',
          },
          ...(t.body ? { body: t.body } : {}),
        });
        const text = await r.text();
        let body: CheckResult;
        try {
          body = JSON.parse(text);
        } catch {
          body = { raw: text.slice(0, 300) };
        }

        const dataLength = Array.isArray(body?.data?.contents)
          ? body.data.contents.length
          : Array.isArray(body?.contents)
            ? body.contents.length
            : null;

        orderTests[t.name] = {
          method: t.method,
          path: t.path.split('?')[0],
          status: r.status,
          ok: r.ok,
          code: body?.code ?? null,
          message: body?.message
            ? String(body.message).slice(0, 200)
            : null,
          dataLength,
          bodyKeys: Object.keys(body ?? {}),
        };
      } catch (e) {
        orderTests[t.name] = {
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }
  } else {
    orderTests.skipped = 'no access token';
  }
  checks.orders = orderTests;

  if (orderTests.skipped) {
    report.push('⏭️ [ORDERS] 4-way 테스트 건너뜀 (토큰 없음)');
  } else {
    Object.entries(orderTests).forEach(([name, result]) => {
      const r = result as CheckResult;
      if (r.ok) {
        report.push(
          `🟢 [ORDERS:${name}] ${r.status} OK (data length: ${r.dataLength})`,
        );
      } else {
        report.push(
          `🔴 [ORDERS:${name}] ${r.status} — code=${r.code}, msg=${(r.message ?? '').slice(0, 100)}`,
        );
      }
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // [8] FINAL DIAGNOSIS — Auto-determine most likely root cause
  // ──────────────────────────────────────────────────────────────────────
  let likelyRootCause = 'UNKNOWN';
  let recommendedAction = '진단 결과를 검토하세요.';

  if (!clientId || !clientSecret) {
    likelyRootCause = 'ENV_MISSING';
    recommendedAction =
      '.env.local 또는 Vercel ENV에서 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET를 확인하세요.';
  } else if (!isBcryptSalt) {
    likelyRootCause = 'SECRET_FORMAT_INVALID';
    recommendedAction =
      'NAVER_CLIENT_SECRET이 bcrypt salt 형식이 아닙니다. apicenter에서 시크릿을 다시 확인하세요.';
  } else if (
    tokenResult.status === 401 ||
    tokenResult.status === 403 ||
    tokenResult.bodyCode === 'GW.AUTHENTICATION'
  ) {
    likelyRootCause = 'SECRET_MISMATCH';
    recommendedAction =
      'OAuth 토큰 발급 단계에서 거부됨. apicenter에서 시크릿 재발급 후 Vercel ENV + .env.local 둘 다 갱신 필요. 가이드: 채팅 히스토리 참조.';
  } else if (
    accessToken &&
    orderTests.A_current_code_from_to?.status &&
    !orderTests.A_current_code_from_to.ok &&
    (orderTests.B1_lastChanged_with_type?.ok ||
      orderTests.B2_last_changed_statuses?.ok ||
      orderTests.B3_post_query?.ok)
  ) {
    likelyRootCause = 'PARAMETER_NAME_MISMATCH';
    recommendedAction =
      'src/lib/naver/api-client.ts L189-191의 파라미터 이름을 from/to → lastChangedFrom/lastChangedTo로 변경하고 lastChangedType 필수 파라미터 추가 필요.';
  } else if (
    accessToken &&
    Object.values(orderTests).every(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => r && !r.ok && (r.status === 403 || r.code === 'GW.IP_NOT_ALLOWED'),
    )
  ) {
    likelyRootCause = 'IP_NOT_ALLOWED';
    recommendedAction = `outbound IP ${outboundIp}을(를) apicenter > 애플리케이션 > API호출 IP에 등록하거나, NAVER_PROXY_URL을 사용하세요.`;
  } else if (accessToken) {
    likelyRootCause = 'OTHER_API_ERROR';
    recommendedAction =
      '토큰은 정상이지만 주문 API 호출 실패. orderTests 응답 본문(code/message)으로 §6 의사결정 트리 직접 매핑.';
  }

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      summary: {
        likelyRootCause,
        recommendedAction,
      },
      report,
      checks,
    },
    { status: 200 },
  );
}
