import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Domeggook OpenAPI-based crawler
// Replaces HTML scraping with official API: https://domeggook.com/ssl/api/
// API docs: https://docs.channel.io/domeggook_api/ko
// Rate limit: 180/min, 15,000/day


export const dynamic = 'force-dynamic';
const DOMEGGOOK_API = 'https://domeggook.com/ssl/api/';

// Extract product number from various URL formats
function extractProductNo(url: string): string | null {
  // domeme.domeggook.com/s/12345678
  const shortMatch = url.match(/\/s\/(\d{6,10})/);
  if (shortMatch) return shortMatch[1];
  // domeggook.com/...?uid=12345678 or no=12345678
  const uidMatch = url.match(/[?&](?:uid|no)=(\d{6,10})/);
  if (uidMatch) return uidMatch[1];
  // bare number
  if (/^\d{6,10}$/.test(url.trim())) return url.trim();
  return null;
}

// Parse price.supply which can be int or "1+3800|20+3500" string
function parseSupplyPrice(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // "1+3800|20+3500|50+3300" — take first tier (minimum order price)
    const first = val.split('|')[0];
    const price = parseInt(first.split('+')[1] ?? first, 10);
    return isNaN(price) ? 0 : price;
  }
  return 0;
}

// Parse shipping fee from deli object
function parseShipFee(deli: Record<string, unknown>): number {
  const supply = deli?.supply as Record<string, unknown> | undefined;
  const dome   = deli?.dome   as Record<string, unknown> | undefined;
  const src = supply ?? dome;
  if (!src) return 3000;
  if (src.type === '무료배송') return 0;
  const fee = src.fee;
  if (typeof fee === 'number') return fee;
  if (typeof fee === 'string') {
    const n = parseInt(fee, 10);
    return isNaN(n) ? 3000 : n;
  }
  return 3000;
}

// Structured option from Domeggook API selectOpt
interface CrawledOption {
  name: string;
  qty: number;       // stock per option (0 = out of stock)
  addPrice: number;  // additional price on top of base supply price
}

// Parse options from selectOpt JSON string — returns structured data
function parseOptions(selectOpt: string | undefined): CrawledOption[] {
  if (!selectOpt) return [];
  try {
    const parsed = JSON.parse(selectOpt) as {
      data?: Record<string, { name?: string; hid?: string | number; qty?: string | number; addprice?: string | number }>;
      type?: string;
    };
    if (parsed.data) {
      return Object.values(parsed.data)
        .filter(o => String(o.hid ?? '0') !== '1')  // exclude hidden
        .map(o => ({
          name: o.name?.trim() ?? '',
          qty: parseInt(String(o.qty ?? '0'), 10) || 0,
          addPrice: parseInt(String(o.addprice ?? '0'), 10) || 0,
        }))
        .filter(o => o.name)
        .slice(0, 30);
    }
  } catch { /* fall through */ }
  return [];
}

// Get API key from DB
async function getApiKey(): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ domeggook_api_key: string }[]>`
      SELECT domeggook_api_key FROM store_settings WHERE id = 'default' LIMIT 1
    `;
    const key = rows[0]?.domeggook_api_key?.trim();
    return key || null;
  } catch { return null; }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { url } = await request.json();
    if (!url?.trim()) {
      return NextResponse.json({ success: false, error: 'URL 또는 상품번호를 입력해주세요' }, { status: 400 });
    }

    // Validate it's a domeggook URL or product number
    const isValidDomemae = url.includes('domeggook.com') || /^\d{6,10}$/.test(url.trim());
    if (!isValidDomemae) {
      return NextResponse.json(
        { success: false, error: '도매매(domeggook.com) URL 또는 상품번호만 지원합니다' },
        { status: 400 }
      );
    }

    const productNo = extractProductNo(url);
    if (!productNo) {
      return NextResponse.json({ success: false, error: '상품번호를 찾을 수 없습니다' }, { status: 400 });
    }

    // Get API key
    const apiKey = await getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: '도매꾹 API Key가 설정되지 않았습니다. 네이버 기본값 설정에서 API Key를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Call Domeggook OpenAPI
    const apiUrl = `${DOMEGGOOK_API}?ver=4.5&mode=getItemView&aid=${apiKey}&no=${productNo}&om=json`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`API 오류 (HTTP ${res.status})`);

    const raw = await res.json() as { domeggook?: Record<string, unknown>; errors?: unknown };

    // Handle API errors
    if (raw.errors || !raw.domeggook) {
      const errMsg = JSON.stringify(raw.errors ?? raw).slice(0, 200);
      console.error('[crawler-api] API error:', errMsg);
      return NextResponse.json({ success: false, error: `도매꾹 API 오류: ${errMsg}` }, { status: 400 });
    }

    const item = raw.domeggook as {
      basis?: { title?: string; status?: string };
      price?: { supply?: unknown; dome?: unknown; resale?: { minimum?: number; Recommand?: number } };
      qty?: { inventory?: number; supplyUnit?: number };
      deli?: Record<string, unknown>;
      seller?: { id?: string; nick?: string; rank?: number; power?: string; score?: { avg?: number }; company?: { name?: string; boss?: string; cno?: string; addr?: string; phone?: string } };
      thumb?: { large?: string; largePng?: string; original?: string };
      selectOpt?: string;
      detail?: { country?: string; manufacturer?: string };
      category?: { current?: { name?: string; code?: string } };
      channel?: { supply?: boolean };
    };

    // Extract core fields
    const name         = item.basis?.title?.replace(/\s+/g, ' ').trim() ?? '';
    const status       = item.basis?.status ?? '';
    const supplyPrice  = parseSupplyPrice(item.price?.supply);
    const inventory    = item.qty?.inventory ?? 0;
    const shipFee      = parseShipFee(item.deli as Record<string, unknown>);
    const mergeShip    = (item.deli as Record<string, unknown> | undefined)?.merge as { enable?: string } | undefined;
    const canMerge     = mergeShip?.enable === 'y';
    // company.name is the real business name; nick is often empty string
    const sellerNick   = String((item.seller as any)?.company?.name || item.seller?.nick || '');
    const sellerId     = String(item.seller?.id ?? '');
    const sellerRank   = item.seller?.rank ?? 0;
    const options      = parseOptions(item.selectOpt);
    const thumbUrl     = item.thumb?.largePng ?? item.thumb?.large ?? item.thumb?.original ?? '';
    const images       = thumbUrl ? [thumbUrl] : [];
    const country      = item.detail?.country ?? '';
    const categoryName = item.category?.current?.name ?? '';
    const categoryCode = item.category?.current?.code ?? '';
    const isOnSupply   = item.channel?.supply === true;

    console.log(`[crawler-api] no=${productNo} | "${name}" | supply=${supplyPrice} | opts=${options.length} | seller=${sellerId}(${sellerNick}) | stock=${inventory}`);

    // Save to crawl_logs with full sourcing data
    prisma.$executeRaw`
      INSERT INTO crawl_logs (
        id, url, name, supplier_price, images, options, status, source,
        seller_nick, seller_id, seller_rank, category_name, category_code,
        inventory, ship_fee, can_merge, sourcing_status
      ) VALUES (
        gen_random_uuid(),
        ${'https://domeme.domeggook.com/s/' + productNo},
        ${name}, ${supplyPrice},
        ${JSON.stringify(images)}::jsonb,
        ${JSON.stringify(options)}::jsonb,
        'success', 'single',
        ${sellerNick}, ${sellerId}, ${Number(sellerRank)},
        ${categoryName}, ${categoryCode},
        ${Number(inventory)}, ${Number(shipFee)}, ${Boolean(canMerge)},
        'SOURCED'
      )
    `.catch((e) => console.error('[crawl-log-insert]', e));

    return NextResponse.json({
      success: true,
      data: {
        name:          name || '상품명을 찾을 수 없습니다',
        supplierPrice: supplyPrice,
        images,
        options,
        description:   '',
        sourceUrl:     `https://domeme.domeggook.com/s/${productNo}`,
        // Extended fields from API
        productNo,
        inventory,
        shipFee,
        canMerge,
        sellerNick,
        sellerId,
        sellerRank,
        categoryName,
        categoryCode,
        country,
        status,
        isOnSupply,
      },
      sessionAgeDays:  0,
      sessionWarning:  null,
    });

  } catch (error: unknown) {
    console.error('[crawler-api] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '크롤링 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
