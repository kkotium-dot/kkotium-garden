// src/lib/naver/keyword-api.ts
// Naver Search Ad API — keyword statistics (monthly search volume + competition)
// Auth: HMAC-SHA256 signature with timestamp
// Endpoint: https://api.searchad.naver.com/keywordstool

import crypto from 'crypto';

const BASE_URL = 'https://api.searchad.naver.com';

interface KeywordStatRaw {
  relKeyword: string;
  monthlyPcQcCnt: string | number;
  monthlyMobileQcCnt: string | number;
  monthlyAvePcClkCnt: number;
  monthlyAveMobileClkCnt: number;
  monthlyAvePcCtr: number;
  monthlyAveMobileCtr: number;
  plAvgDepth: number;        // average ad placement depth = competition proxy
  compIdx: string;           // 'low' | 'mid' | 'high'
}

export interface KeywordStat {
  keyword: string;
  pcMonthly: number;
  mobileMonthly: number;
  totalMonthly: number;
  competition: 'low' | 'mid' | 'high' | 'unknown';
  compIdx: string;
}

// ── HMAC-SHA256 signature ───────────────────────────────────────────────────
function buildSignature(timestamp: number, method: string, path: string, secretKey: string): string {
  const message = `${timestamp}.${method}.${path}`;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

// ── Parse volume — Naver returns '<10' for low counts ──────────────────────
function parseVolume(v: string | number): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    if (v === '< 10') return 5; // mid-point estimate
    const n = parseInt(v.replace(/,/g, ''), 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

// ── Main keyword stats fetch ────────────────────────────────────────────────
export async function fetchKeywordStats(keywords: string[]): Promise<KeywordStat[]> {
  const accessKey  = process.env.NAVER_SEARCHAD_API_KEY;
  const secretKey  = process.env.NAVER_SEARCHAD_SECRET_KEY;
  const customerId = process.env.NAVER_SEARCHAD_CUSTOMER_ID;

  if (!accessKey || !secretKey || !customerId) {
    throw new Error('Naver Search Ad API credentials not configured');
  }

  // API accepts max 5 keywords per request
  const batch = keywords.slice(0, 5);
  const timestamp = Date.now();
  const method = 'GET';
  const path = '/keywordstool';
  const signature = buildSignature(timestamp, method, path, secretKey);

  const params = new URLSearchParams({
    hintKeywords: batch.join(','),
    showDetail:   '1',
  });

  const url = `${BASE_URL}${path}?${params.toString()}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type':   'application/json; charset=UTF-8',
      'X-Timestamp':    String(timestamp),
      'X-API-KEY':      accessKey,
      'X-Customer':     customerId,
      'X-Signature':    signature,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Keyword API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const rows: KeywordStatRaw[] = data.keywordList ?? [];

  // Map to clean output — include only rows matching input keywords
  const inputSet = new Set(batch.map(k => k.toLowerCase()));
  return rows
    .filter(r => inputSet.has(r.relKeyword.toLowerCase()))
    .map(r => {
      const pc     = parseVolume(r.monthlyPcQcCnt);
      const mobile = parseVolume(r.monthlyMobileQcCnt);
      // Naver API returns competition in Korean: '높음'|'중간'|'낮음'
      // Normalize to English: high|mid|low
      const rawComp = String(r.compIdx ?? '');
      let competition: KeywordStat['competition'] = 'unknown';
      if (rawComp === '높음' || rawComp === 'high')   competition = 'high';
      else if (rawComp === '중간' || rawComp === 'mid') competition = 'mid';
      else if (rawComp === '낙음' || rawComp === '저' || rawComp === 'low') competition = 'low';
      return {
        keyword:       r.relKeyword,
        pcMonthly:     pc,
        mobileMonthly: mobile,
        totalMonthly:  pc + mobile,
        competition,
        compIdx:       rawComp,
      };
    });
}

// ── Volume label helper ─────────────────────────────────────────────────────
export function formatSearchVolume(n: number): string {
  if (n >= 100_000) return `${(n / 10000).toFixed(0)}만`;
  if (n >= 10_000)  return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1_000)   return `${(n / 1000).toFixed(1)}천`;
  if (n < 10)       return '<10';
  return String(n);
}

export function getCompetitionColor(comp: KeywordStat['competition']): { text: string; bg: string } {
  switch (comp) {
    case 'low':  return { text: '#15803d', bg: '#dcfce7' };
    case 'mid':  return { text: '#b45309', bg: '#fef3c7' };
    case 'high': return { text: '#b91c1c', bg: '#fee2e2' };
    default:     return { text: '#6b7280', bg: '#f3f4f6' };
  }
}
