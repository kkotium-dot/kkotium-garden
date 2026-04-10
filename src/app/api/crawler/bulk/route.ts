import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getSessionCookies } from '@/lib/supplier-session';


export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface CrawlItem {
  url: string;
  status: 'pending' | 'success' | 'error';
  name?: string;
  supplierPrice?: number;
  images?: string[];
  options?: string[];
  description?: string;
  error?: string;
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function parsePrice(text: string): number {
  if (!text) return 0;
  const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
  return isNaN(n) || n < 10 || n > 100_000_000 ? 0 : n;
}

function isValidProductImg(src: string): boolean {
  const s = src.toLowerCase();
  if (!s.includes('/upload/') && !s.includes('cdn')) return false;
  const excludes = ['ico_', 'icon_', 'btn_', '/image/item/view/', '/image/member/',
    'img_lens', 'img_ranking', 'partnerprogram', 'questionmark',
    'addwish', 'ico_share', 'ico_close', 'img_230', 'img_100', 'img_50'];
  return !excludes.some(e => s.includes(e));
}

async function crawlSingle(url: string): Promise<Omit<CrawlItem, 'url' | 'status'>> {
  const isDMM = url.includes('domeme.domeggook.com') || url.includes('domemedb.domeggook.com');
  const isDMK = url.includes('domeggook.com') && !isDMM;

  if (!isDMM && !isDMK) throw new Error('도매매(domeme.domeggook.com) URL만 지원합니다');

  const platformCode = isDMM ? 'DMM' : 'DMK';
  const sessionCookies = await getSessionCookies(platformCode)
    ?? await getSessionCookies(isDMM ? 'DMK' : 'DMM');

  const headers: Record<string, string> = {
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'Cache-Control': 'no-cache',
  };
  if (sessionCookies) headers['Cookie'] = sessionCookies;

  const response = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const baseOrigin = new URL(response.url).origin;

  // Name
  let name = $('meta[property="og:title"]').attr('content')
    ?.replace(/^\[도매꾹\]\s*/, '')
    .replace(/^\[도매매\]\s*/, '')
    .trim() ?? '';
  if (!name || name.length < 3) {
    for (const sel of ['.lGoodsName', '.lItemName', '.lGoodsTit', 'h1']) {
      const t = $(sel).first().text().trim();
      if (t && t.length > 3) { name = t; break; }
    }
  }
  name = name.replace(/\s+/g, ' ').trim() || '상품명 추출 불가';

  // Price — domemae-specific selectors
  let price = 0;
  for (const sel of [
    '.lItemPrice', '.lInfoAmtWrap', 'tr.lInfoAmt td', '.lSupplyPrice',
    '#lSupplyPrice', '.lGoodsPrice', '.goods_price',
    '#supply_price', '#sale_price', '.supply_price', '.sale_price', '.price',
  ]) {
    const p = parsePrice($(sel).first().text());
    if (p > 0) { price = p; break; }
  }
  if (price === 0) {
    const m = html.match(/supplyAmt[":\s]+(\d+)/)
      ?? html.match(/saleAmt[":\s]+(\d+)/)
      ?? $('body').text().match(/공급가[^\d]*(\d{1,3}(?:,\d{3})+)/);
    if (m) { const p = parseInt(m[1].replace(/,/g, ''), 10); if (p >= 100) price = p; }
  }

  // Images
  const images: string[] = [];
  const ogImg = $('meta[property="og:image"]').attr('content') ?? '';
  if (ogImg.startsWith('http') && isValidProductImg(ogImg)) images.push(ogImg);
  $('img').each((_, el) => {
    if (images.length >= 8) return;
    let src = $(el).attr('src') ?? $(el).attr('data-src') ?? '';
    if (src.startsWith('//')) src = 'https:' + src;
    else if (src.startsWith('/')) src = baseOrigin + src;
    if (src.startsWith('http') && isValidProductImg(src) && !images.includes(src)) images.push(src);
  });

  // Options — Method 1: brace-matching JSON extraction
  const options: string[] = [];
  const optTypeIdx = html.indexOf('"type":"combination"');
  if (optTypeIdx >= 0) {
    try {
      const braceStart = html.lastIndexOf('{', optTypeIdx);
      let depth = 0; let braceEnd = braceStart;
      for (let i = braceStart; i < Math.min(braceStart + 30000, html.length); i++) {
        if (html[i] === '{') depth++;
        else if (html[i] === '}') { depth--; if (depth === 0) { braceEnd = i + 1; break; } }
      }
      const optData = JSON.parse(html.slice(braceStart, braceEnd)) as {
        data?: Record<string, { name?: string; hid?: number }>;
        set?: Record<string, { opts?: Record<string, string> }>;
      };
      if (optData.data) {
        for (const item of Object.values(optData.data)) {
          if (options.length >= 30) break;
          if ((item.hid ?? 0) === 1) continue;
          const n = item.name?.trim();
          if (n && n.length > 1 && !options.includes(n)) options.push(n);
        }
      }
      if (options.length === 0 && optData.set) {
        for (const setItem of Object.values(optData.set)) {
          if (setItem.opts) {
            for (const v of Object.values(setItem.opts)) {
              if (options.length >= 30) break;
              const n = v.trim();
              if (n && n.length > 1 && !options.includes(n)) options.push(n);
            }
          }
        }
      }
    } catch { /* fall through to Method 2 */ }
  }
  // Method 2: DOM fallback
  if (options.length === 0) {
    const skipOpts = ['선택', '옵션선택', '선택하세요'];
    $('select').each((_, selectEl) => {
      const nm = $(selectEl).attr('name') ?? '';
      if (['mobile','phone','fax','addr','consumer'].some(f => nm.toLowerCase().includes(f))) return;
      $(selectEl).find('option').each((_, optEl) => {
        if (options.length >= 15) return;
        const t = $(optEl).text().trim();
        const v = $(optEl).attr('value') ?? '';
        if (!t || skipOpts.some(s => t.startsWith(s)) || v === '' || v === '0') return;
        if (/^0[0-9]{1,3}$/.test(t)) return;
        if (t.length <= 80 && !options.includes(t)) options.push(t);
      });
    });
  }

  const ogDesc = $('meta[property="og:description"]').attr('content') ?? '';
  return {
    name,
    supplierPrice: price,
    images: images.slice(0, 8),
    options: options.slice(0, 15),
    description: ogDesc.slice(0, 800),
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { urls } = await request.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ success: false, error: 'URL 목록이 없습니다' }, { status: 400 });
    }

    const cleaned = urls
      .map((u: string) => u.trim())
      .filter((u: string) => u.startsWith('http') && u.includes('domeggook'));

    if (cleaned.length === 0) {
      return NextResponse.json({ success: false, error: '유효한 도매매 URL이 없습니다' }, { status: 400 });
    }

    const limit = Math.min(cleaned.length, 50);
    const urlsToProcess = cleaned.slice(0, limit);

    const BATCH_SIZE = 5;
    const results: CrawlItem[] = [];

    for (let i = 0; i < urlsToProcess.length; i += BATCH_SIZE) {
      const batch = urlsToProcess.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (url: string) => {
          try {
            const data = await crawlSingle(url);
            return { url, status: 'success' as const, ...data };
          } catch (e: unknown) {
            return {
              url, status: 'error' as const,
              error: e instanceof Error ? e.message : '크롤링 실패',
            };
          }
        })
      );
      for (const r of batchResults) {
        if (r.status === 'fulfilled') results.push(r.value);
        else results.push({ url: '', status: 'error', error: '처리 실패' });
      }
      if (i + BATCH_SIZE < urlsToProcess.length) {
        await new Promise(res => setTimeout(res, 300));
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount   = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      results,
      summary: { total: results.length, success: successCount, error: errorCount },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : '서버 오류' },
      { status: 500 }
    );
  }
}
