// /api/supplier-session
// Manages login sessions for domemae and domeggook
// GET  — list session status
// POST — login and save session
// DELETE — clear session
//
// Actual login structure (reverse-engineered 2026-03):
//   Both DMM and DMK use the SAME unified domeggook login system
//   Login form URL : https://domeggook.com/ssl/member/mem_loginForm.php
//   Login POST URL : https://domeggook.com/main/member/mem_ing.php
//   Fields: id=<id>, pass=<pw>, mode=mongoLogin, encording=utf8, back=, extCookie=
//   Verify URL: https://domeggook.com/main/mypage/index.php (or domemedb.domeggook.com)

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as iconv from 'iconv-lite';


export const dynamic = 'force-dynamic';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Unified login config — both DMM and DMK use the same domeggook auth system
const LOGIN_CONFIG = {
  formUrl:   'https://domeggook.com/ssl/member/mem_loginForm.php',
  actionUrl: 'https://domeggook.com/main/member/mem_ing.php',
  idField:   'id',
  pwField:   'pass',
  hiddenFields: {
    mode:      'mongoLogin',
    encording: 'utf8',
    back:      '',
    extCookie: '',
  },
};

// Verify URLs per platform — check logged-in state
const VERIFY_URLS: Record<string, string> = {
  DMK: 'https://domeggook.com/main/myPage/my_pageMain.php',
  DMM: 'https://domemedb.domeggook.com/index/',
};

// Logged-in markers — text present only when authenticated
// DMK uses ngm_* session cookies; also check page text for logout link
const LOGGED_IN_MARKERS: Record<string, string[]> = {
  DMK: ['로그아웃', 'mongoLogout', 'my_pageMain', '마이페이지'],
  DMM: ['로그아웃', 'mongoLogout', '마이페이지', 'logout'],
};

const PLATFORM_NAMES: Record<string, string> = {
  DMM: '도매매',
  DMK: '도매꾹',
};

// Parse Set-Cookie headers → cookie jar string
function parseCookies(setCookieHeaders: string[]): string {
  const cookies: Record<string, string> = {};
  for (const h of setCookieHeaders) {
    const part = h.split(';')[0].trim();
    const eq = part.indexOf('=');
    if (eq > 0) cookies[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

function mergeCookies(base: string, newer: string): string {
  const map: Record<string, string> = {};
  for (const part of [...base.split('; '), ...newer.split('; ')]) {
    const eq = part.indexOf('=');
    if (eq > 0) map[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}

// Verify session — two methods:
// 1. Cookie-based: ngm_sess cookie presence = logged in (fastest)
// 2. Page-based: fetch verify URL and check for logged-in text markers
async function verifySession(platformCode: string, cookies: string): Promise<boolean> {
  // Method 1: Check for session cookies directly
  // DMK/DMM both use ngm_sess and ngm_sId as session identifiers
  const hasNgmSess = cookies.includes('ngm_sess') && !cookies.includes('ngm_sess=;') && !cookies.includes('ngm_sess= ');
  const hasNgmSId  = cookies.includes('ngm_sId')  && !cookies.includes('ngm_sId=;')  && !cookies.includes('ngm_sId= ');
  if (hasNgmSess && hasNgmSId) return true;

  // Method 2: Fetch verify page and check markers
  const verifyUrl = VERIFY_URLS[platformCode] ?? VERIFY_URLS.DMK;
  const markers   = LOGGED_IN_MARKERS[platformCode] ?? LOGGED_IN_MARKERS.DMK;
  try {
    const res = await fetch(verifyUrl, {
      headers: {
        'User-Agent': UA,
        'Cookie': cookies,
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
    });
    // Check if we were redirected to login page (= not logged in)
    if (res.url.includes('login') || res.url.includes('Login')) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    let html = '';
    try { html = buf.toString('utf-8'); } catch { html = iconv.decode(buf, 'euc-kr'); }
    return markers.some(m => html.toLowerCase().includes(m.toLowerCase()));
  } catch {
    // If we can't reach verify URL but have cookies, trust the cookies
    return hasNgmSess || hasNgmSId;
  }
}

export async function GET() {
  try {
    const sessions = await prisma.$queryRaw<any[]>`
      SELECT platform_code, platform_name, login_id,
             is_valid, logged_in_at, expires_at, updated_at
      FROM supplier_sessions
      ORDER BY platform_code
    `;
    const result = ['DMM', 'DMK'].map(code => {
      const s = sessions.find((r: any) => r.platform_code === code);
      return {
        platformCode: code,
        platformName: PLATFORM_NAMES[code],
        isValid:    s?.is_valid ?? false,
        loginId:    s?.login_id ?? null,
        loggedInAt: s?.logged_in_at ?? null,
        expiresAt:  s?.expires_at ?? null,
      };
    });
    return NextResponse.json({ success: true, sessions: result });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { platformCode, loginId, loginPw } = await req.json();
    if (!platformCode || !loginId || !loginPw) {
      return NextResponse.json({ error: 'platformCode, loginId, loginPw required' }, { status: 400 });
    }
    if (!['DMM', 'DMK'].includes(platformCode)) {
      return NextResponse.json({ error: 'Unknown platformCode' }, { status: 400 });
    }

    // Step 1: GET login form page to pick up initial session cookies
    const formRes = await fetch(LOGIN_CONFIG.formUrl, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: AbortSignal.timeout(12_000),
    });
    const initCookies = parseCookies(formRes.headers.getSetCookie?.() ?? []);

    // Step 2: POST login
    const formData = new URLSearchParams();
    formData.append(LOGIN_CONFIG.idField, loginId);
    formData.append(LOGIN_CONFIG.pwField, loginPw);
    Object.entries(LOGIN_CONFIG.hiddenFields).forEach(([k, v]) => formData.append(k, v));

    const loginRes = await fetch(LOGIN_CONFIG.actionUrl, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': initCookies,
        'Referer': LOGIN_CONFIG.formUrl,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Origin': 'https://domeggook.com',
      },
      body: formData.toString(),
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });

    const loginCookies  = parseCookies(loginRes.headers.getSetCookie?.() ?? []);
    const mergedCookies = mergeCookies(initCookies, loginCookies);

    // Step 3: Follow redirect if any, collect more cookies
    const location = loginRes.headers.get('location');
    let finalCookies = mergedCookies;
    if (location) {
      const redirectUrl = location.startsWith('http') ? location : `https://domeggook.com${location}`;
      try {
        const redirRes = await fetch(redirectUrl, {
          headers: { 'User-Agent': UA, 'Cookie': mergedCookies, 'Accept-Language': 'ko-KR,ko;q=0.9' },
          redirect: 'manual',
          signal: AbortSignal.timeout(10_000),
        });
        const redirCookies = parseCookies(redirRes.headers.getSetCookie?.() ?? []);
        finalCookies = mergeCookies(mergedCookies, redirCookies);
      } catch { /* use merged as-is */ }
    }

    // Step 3b: Hit domemedb subdomain to collect its specific session cookies
    // domemedb.domeggook.com uses the same auth but issues its own sub-cookies on first visit
    try {
      const dbRes = await fetch('https://domemedb.domeggook.com/index/', {
        headers: { 'User-Agent': UA, 'Cookie': finalCookies, 'Accept-Language': 'ko-KR,ko;q=0.9' },
        redirect: 'follow',
        signal: AbortSignal.timeout(10_000),
      });
      const dbCookies = parseCookies(dbRes.headers.getSetCookie?.() ?? []);
      if (dbCookies) finalCookies = mergeCookies(finalCookies, dbCookies);
    } catch { /* non-blocking */ }

    // Step 4: Verify login
    const isValid = await verifySession(platformCode, finalCookies);

    // Step 5: Save to DB (upsert by platform_code)
    const expiresAt = new Date(Date.now() + 12 * 3600_000);
    await prisma.$executeRaw`
      INSERT INTO supplier_sessions
        (platform_code, platform_name, login_id, cookies, user_agent, logged_in_at, expires_at, is_valid, updated_at)
      VALUES (
        ${platformCode}, ${PLATFORM_NAMES[platformCode]}, ${loginId},
        ${finalCookies}, ${UA}, NOW(), ${expiresAt}, ${isValid}, NOW()
      )
      ON CONFLICT (platform_code) DO UPDATE SET
        login_id    = EXCLUDED.login_id,
        cookies     = EXCLUDED.cookies,
        logged_in_at = NOW(),
        expires_at  = EXCLUDED.expires_at,
        is_valid    = EXCLUDED.is_valid,
        updated_at  = NOW()
    `;

    return NextResponse.json({
      success: true,
      isValid,
      platformCode,
      message: isValid
        ? `${PLATFORM_NAMES[platformCode]} 로그인 성공!`
        : `${PLATFORM_NAMES[platformCode]} 로그인 실패 — ID/PW를 다시 확인해주세요.`,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const platformCode = searchParams.get('platformCode');
  if (!platformCode) return NextResponse.json({ error: 'platformCode required' }, { status: 400 });
  await prisma.$executeRaw`
    UPDATE supplier_sessions
    SET is_valid = false, cookies = '', updated_at = NOW()
    WHERE platform_code = ${platformCode}
  `;
  return NextResponse.json({ success: true });
}
