import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// Bulk batch crawler using Domeggook OpenAPI (getItemView ver=4.5)
// Replaces the old HTML/cheerio scraper entirely
// SSE stream: one event per product, then a 'done' event
// Rate limit: 180/min — we batch 5 at a time with 300ms gap


export const dynamic = 'force-dynamic';
const DOMEGGOOK_API = 'https://domeggook.com/ssl/api/';

function extractProductNo(url: string): string | null {
  const short = url.match(/\/s\/(\d{6,10})/);
  if (short) return short[1];
  const uid = url.match(/[?&](?:uid|no)=(\d{6,10})/);
  if (uid) return uid[1];
  if (/^\d{6,10}$/.test(url.trim())) return url.trim();
  return null;
}

function parseSupplyPrice(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const first = val.split('|')[0];
    const price = parseInt(first.split('+')[1] ?? first, 10);
    return isNaN(price) ? 0 : price;
  }
  return 0;
}

function parseShipFee(deli: Record<string, unknown>): number {
  const supply = deli?.supply as Record<string, unknown> | undefined;
  const dome = deli?.dome as Record<string, unknown> | undefined;
  const src = supply ?? dome;
  if (!src) return 3000;
  if (src.type === '무료배송') return 0;
  const fee = src.fee;
  if (typeof fee === 'number') return fee;
  if (typeof fee === 'string') { const n = parseInt(fee, 10); return isNaN(n) ? 3000 : n; }
  return 3000;
}

interface CrawledOption {
  name: string;
  qty: number;
  addPrice: number;
}

function parseOptions(selectOpt: string | undefined): CrawledOption[] {
  if (!selectOpt) return [];
  try {
    const p = JSON.parse(selectOpt) as { data?: Record<string, { name?: string; hid?: string | number; qty?: string | number; addprice?: string | number }> };
    if (p.data) return Object.values(p.data)
      .filter(o => String(o.hid ?? '0') !== '1')
      .map(o => ({ name: o.name?.trim() ?? '', qty: parseInt(String(o.qty ?? '0'), 10) || 0, addPrice: parseInt(String(o.addprice ?? '0'), 10) || 0 }))
      .filter(o => o.name)
      .slice(0, 30);
  } catch { /* ignore */ }
  return [];
}

async function getApiKey(): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ domeggook_api_key: string }[]>`SELECT domeggook_api_key FROM store_settings WHERE id = 'default' LIMIT 1`;
    return rows[0]?.domeggook_api_key?.trim() || null;
  } catch { return null; }
}

async function crawlOne(productNo: string, apiKey: string, url: string): Promise<Record<string, unknown>> {
  const apiUrl = `${DOMEGGOOK_API}?ver=4.5&mode=getItemView&aid=${apiKey}&no=${productNo}&om=json`;
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const raw = await res.json() as { domeggook?: Record<string, unknown>; errors?: unknown };
  if (raw.errors || !raw.domeggook) throw new Error(`API error: ${JSON.stringify(raw.errors ?? raw).slice(0, 100)}`);

  const item = raw.domeggook as {
    basis?: { title?: string; status?: string };
    price?: { supply?: unknown };
    qty?: { inventory?: number };
    deli?: Record<string, unknown>;
    seller?: { id?: string; nick?: unknown; rank?: number; company?: { name?: string } };
    thumb?: { large?: string; largePng?: string; original?: string };
    selectOpt?: string;
    detail?: { country?: string };
    category?: { current?: { name?: string; code?: string } };
    channel?: { supply?: boolean };
  };

  const supplierPrice = parseSupplyPrice(item.price?.supply);
  const shipFee = parseShipFee(item.deli as Record<string, unknown>);
  const mergeEnable = (item.deli as Record<string, unknown> | undefined)?.merge as { enable?: string } | undefined;

  return {
    url,
    status: 'success',
    name: item.basis?.title?.replace(/\s+/g, ' ').trim() ?? '',
    supplierPrice,
    images: (() => { const t = item.thumb?.largePng ?? item.thumb?.large ?? item.thumb?.original ?? ''; return t ? [t] : []; })(),
    options: parseOptions(item.selectOpt),
    description: '',
    // Extended fields
    productNo,
    inventory: item.qty?.inventory ?? 0,
    shipFee,
    canMerge: mergeEnable?.enable === 'y',
    sellerNick: String((item.seller as any)?.company?.name || item.seller?.nick || ''),
    sellerId: String(item.seller?.id ?? ''),
    sellerRank: item.seller?.rank ?? 0,
    categoryName: item.category?.current?.name ?? '',
    categoryCode: item.category?.current?.code ?? '',
    country: item.detail?.country ?? '',
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const urlsRaw = searchParams.get('urls') ?? '';
  const urls = urlsRaw.split('|').map(u => decodeURIComponent(u).trim()).filter(Boolean).slice(0, 50);

  if (urls.length === 0) {
    return new Response('No URLs provided', { status: 400 });
  }

  const apiKey = await getApiKey();
  if (!apiKey) {
    return new Response(JSON.stringify({ type: 'error', message: 'API Key가 설정되지 않았습니다. 네이버 기본값 설정에서 API Key를 입력해주세요.' }), { status: 400 });
  }

  const encoder = new TextEncoder();
  let done = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      // Process in batches of 5
      const BATCH = 5;
      for (let i = 0; i < urls.length; i += BATCH) {
        const batch = urls.slice(i, i + BATCH);
        await Promise.allSettled(batch.map(async url => {
          const productNo = extractProductNo(url);
          if (!productNo) {
            send({ type: 'result', url, status: 'error', error: '상품번호를 찾을 수 없습니다' });
            done++;
          } else {
            try {
              const result = await crawlOne(productNo, apiKey, url);
              send({ type: 'result', ...result });
              // Save to crawl_logs
              prisma.$executeRaw`
                INSERT INTO crawl_logs (
                  id, url, name, supplier_price, images, options, status, source,
                  seller_nick, seller_id, seller_rank, category_name, category_code,
                  inventory, ship_fee, can_merge, sourcing_status
                ) VALUES (
                  gen_random_uuid(),
                  ${url}, ${String(result.name)}, ${Number(result.supplierPrice)},
                  ${JSON.stringify(result.images)}::jsonb,
                  ${JSON.stringify(result.options)}::jsonb,
                  'success', 'bulk',
                  ${String(result.sellerNick ?? '')}, ${String(result.sellerId ?? '')},
                  ${Number(result.sellerRank ?? 0)},
                  ${String(result.categoryName ?? '')}, ${String(result.categoryCode ?? '')},
                  ${Number(result.inventory ?? 0)}, ${Number(result.shipFee ?? 3000)},
                  ${Boolean(result.canMerge ?? false)}, 'SOURCED'
                )
              `.catch((e) => console.error('[crawl-log-insert]', e));
            } catch (e: unknown) {
              send({ type: 'result', url, status: 'error', error: e instanceof Error ? e.message : '오류' });
              prisma.$executeRaw`INSERT INTO crawl_logs (id, url, name, supplier_price, images, options, status, source, error_msg) VALUES (gen_random_uuid(), ${url}, '', 0, '[]'::jsonb, '[]'::jsonb, 'error', 'bulk', ${String(e)})`.catch((er) => console.error('[crawl-log-insert-err]', er));
            }
            done++;
          }
          send({ type: 'progress', done, total: urls.length });
        }));
        // Throttle between batches to stay under 180/min
        if (i + BATCH < urls.length) await new Promise(r => setTimeout(r, 350));
      }

      send({ type: 'done', total: urls.length });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Keep POST for legacy compatibility (returns 410 gone)
export async function POST() {
  return new Response(JSON.stringify({ error: 'Use GET /api/crawler/stream instead' }), { status: 410 });
}
