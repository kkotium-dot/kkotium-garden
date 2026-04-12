'use client';
// /crawl — Kkotium Unified Crawler v2
// Tabs: [단건] single URL | [대량] bulk SSE | [이력] crawl logs
// Design: Kkotium system (red #e62310, pink lines, white cards)

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import {
  Layers, Search, RefreshCw, ExternalLink, ArrowRight,
  Package, Download, X, CheckCircle, AlertCircle, Clock, History, TrendingUp, Tag,
} from 'lucide-react';
import { calcHoneyScore, calcSourcingScore } from '@/lib/honey-score';
import { NAVER_CATEGORIES_FULL } from '@/lib/naver/naver-categories-full';
import { getNaverFeeRateByD1, NAVER_DEFAULT_FEE_RATE } from '@/lib/naver-fee-rates-2026';

// ── Types ─────────────────────────────────────────────────────────────────────
interface CrawledOption {
  name: string;
  qty: number;       // stock per option
  addPrice: number;  // additional price on top of base
}
interface SingleResult {
  name: string; supplierPrice: number;
  images: string[]; options: CrawledOption[]; description: string; sourceUrl?: string;
  // Extended fields from OpenAPI
  productNo?: string;
  inventory?: number;
  shipFee?: number;
  canMerge?: boolean;
  sellerNick?: string;
  sellerId?: string;
  sellerRank?: number;
  categoryName?: string;
  categoryCode?: string;
  country?: string;
  status?: string;
}
interface BulkRow {
  id: string; url: string;
  status: 'pending' | 'success' | 'error';
  name?: string; supplierPrice?: number;
  images?: string[]; options?: CrawledOption[]; description?: string; error?: string;
  editedPrice?: number; editedName?: string; excluded?: boolean;
  // Extended fields from OpenAPI
  productNo?: string;
  inventory?: number;
  shipFee?: number;
  canMerge?: boolean;
  sellerNick?: string;
  sellerId?: string;
  sellerRank?: number;
  categoryName?: string;
  categoryCode?: string;
}
interface SourcingItem {
  id: string; url: string; name: string | null; supplier_price: number;
  images: string[] | null; options: CrawledOption[] | string[] | null;
  status: string; error_msg: string | null; source: string; crawled_at: string;
  seller_nick: string | null; seller_id: string | null; seller_rank: number | null;
  category_name: string | null; category_code: string | null; inventory: number | null;
  ship_fee: number | null; can_merge: boolean | null;
  sourcing_status: string; product_id: string | null;
}

type Tab = 'single' | 'bulk' | 'history';

// ── Honey score mini badge ──────────────────────────────────────────────────
// Sourcing score mini badge — uses calcSourcingScore (no SEO weight, sourcing-focused)
function HoneyBadge({
  supplierPrice, salePrice, naverFeeRate,
  inventory, canMerge, sellerRank, shipFee, optionCount,
}: {
  supplierPrice: number; salePrice: number; naverFeeRate?: number;
  inventory?: number; canMerge?: boolean; sellerRank?: number; shipFee?: number; optionCount?: number;
}) {
  if (!supplierPrice || !salePrice) return <span style={{ fontSize:11, color:'#ccc' }}>—</span>;
  const r = calcSourcingScore({
    supplierPrice, salePrice, shippingFee: shipFee ?? 3000,
    naverFeeRate: naverFeeRate ?? 0.05733,
    inventory, canMerge, sellerRank, shipFee, optionCount,
  });
  const gradeColors: Record<string, { bg: string; text: string; border: string }> = {
    S: { bg:'#F3F0FE', text:'#6D28D9', border:'#C4B5FD' },
    A: { bg:'#F0FDF4', text:'#15803d', border:'#86efac' },
    B: { bg:'#EFF6FF', text:'#1d4ed8', border:'#93c5fd' },
    C: { bg:'#FEFCE8', text:'#a16207', border:'#fde047' },
    D: { bg:'#FFF0EF', text:'#b91c1c', border:'#fca5a5' },
  };
  const gc = gradeColors[r.grade];
  // Badge type colors
  const badgeStyle = (type: 'good'|'warn'|'danger') => ({
    good:   { bg:'#f0fdf4', color:'#15803d', border:'#86efac' },
    warn:   { bg:'#fffbeb', color:'#92400e', border:'#fde68a' },
    danger: { bg:'#fef2f2', color:'#b91c1c', border:'#fecaca' },
  }[type]);
  // Show top warning (first from warnings array)
  const topWarning = r.warnings?.[0];
  // Show top sourcing badge
  const topBadge = r.badges?.[0];
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
      <span style={{ fontSize:13, fontWeight:900, padding:'2px 8px', background:gc.bg, color:gc.text, border:`1px solid ${gc.border}`, borderRadius:99 }}>
        {r.grade}
      </span>
      <span style={{ fontSize:10, color:'#888' }}>{r.total}점</span>
      {topBadge && (() => { const bs = badgeStyle(topBadge.type); return (
        <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:99, background:bs.bg, color:bs.color, border:`1px solid ${bs.border}`, whiteSpace:'nowrap', maxWidth:80, overflow:'hidden', textOverflow:'ellipsis' }}>
          {topBadge.label}
        </span>
      );})()}
      {!topBadge && topWarning && (
        <span style={{ fontSize:9, fontWeight:600, padding:'1px 5px', borderRadius:99, background:'#fffbeb', color:'#92400e', border:'1px solid #fde68a', whiteSpace:'nowrap', maxWidth:80, overflow:'hidden', textOverflow:'ellipsis' }}>
          {topWarning.slice(0, 12)}
        </span>
      )}
    </div>
  );
}


// Smart rounding: always round UP to the nearest psychological price ending
// Candidates: X,900 or X0,000 — pick the nearest one above current price
// e.g. 9,959 -> 10,000 / 9,200 -> 9,900 / 22,342 -> 22,900 / 29,950 -> 30,000
function smartRound(price: number): number {
  if (price <= 0) return price;
  const thou = Math.floor(price / 1000) * 1000; // e.g. 9000 for 9959
  const nine = thou + 900;                       // e.g. 9900
  const ten  = thou + 1000;                      // e.g. 10000
  // Already on a clean ending — no change needed
  if (price === nine || price % 1000 === 0) return price;
  // Pick the nearest ceiling among [nine, ten]
  if (price < nine) return nine;   // e.g. 9200 -> 9900
  return ten;                       // e.g. 9959 -> 10000
}
// ── Breakeven calculator ──────────────────────────────────────────────────────
// Returns minimum sale price to break even (cost + naver fee + shipping)
// feeRate defaults to 5.733% (2026 중소3+일반노출) — overridden by category D1 selection
function calcBreakeven(supplierPrice: number, shipFee: number, feeRate = 0.05733): number {
  return Math.ceil((supplierPrice + shipFee) / (1 - feeRate));
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function PinkLine() {
  return <div style={{ height: 2.5, background: '#FFB3CE', borderRadius: 99 }} />;
}
function Divider() {
  return <div style={{ height: 1, background: '#F8DCE5', margin: '14px 0', borderRadius: 99 }} />;
}
function StatusBadge({ status }: { status: string }) {
  if (status === 'success') return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:11, fontWeight:700, color:'#15803d', background:'#F0FDF4', border:'1px solid #86efac', borderRadius:99, padding:'2px 8px' }}>
      <CheckCircle size={10} /> 성공
    </span>
  );
  if (status === 'error') return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:11, fontWeight:700, color:'#b91c1c', background:'#FFF0EF', border:'1px solid #fca5a5', borderRadius:99, padding:'2px 8px' }}>
      <AlertCircle size={10} /> 실패
    </span>
  );
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:11, fontWeight:700, color:'#888', background:'#F5F5F5', border:'1px solid #e5e5e5', borderRadius:99, padding:'2px 8px' }}>
      <Clock size={10} /> 대기
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CrawlPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('single');

  // ── 단건 탭 state ─────────────────────────────────────────────────────────
  const [sUrl, setSUrl]           = useState('');
  const [sLoading, setSLoading]   = useState(false);
  const [sSaving, setSSaving]     = useState(false);
  const [sResult, setSResult]     = useState<SingleResult | null>(null);
  const [sError, setSError]       = useState('');
  const [sSuccess, setSSuccess]   = useState('');
  const [sessionWarning, setSessionWarning] = useState<string | null>(null);
  const [supPrice, setSupPrice]   = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [shipFee, setShipFee]     = useState(3000);
  // Naver fee rate — dynamic by category D1 (default: 중소3 5.733%)
  const [naverFeeRate, setNaverFeeRate] = useState(NAVER_DEFAULT_FEE_RATE);
  // Target profit input (replaces margin rate slider)
  const [targetProfit, setTargetProfit] = useState(3000);

  const sProfit     = sellPrice - supPrice - shipFee;
  const sMargin     = sellPrice > 0 ? (sProfit / sellPrice * 100) : 0;
  // naverFeeRate is updated dynamically when user selects a category D1
  const sCommission = Math.ceil(sellPrice * naverFeeRate);
  const sBreakeven  = supPrice > 0 ? calcBreakeven(supPrice, shipFee, naverFeeRate) : 0;
  const sNetMargin  = sellPrice > 0 ? ((sellPrice - supPrice - shipFee - sCommission) / sellPrice * 100) : 0;
  // Category suggestion state
  const [sCatLoading, setSCatLoading]   = useState(false);
  const [sCatSuggestions, setSCatSuggestions] = useState<Array<{d1:string;d2:string;d3:string}>>([]);
  const [sCatSelected, setSCatSelected] = useState<{d1:string;d2:string;d3:string}|null>(null);
  const [sCatQuery, setSCatQuery]         = useState('');
  const [sCatDropdown, setSCatDropdown]   = useState<Array<{code:string;d1:string;d2:string;d3:string;d4:string}>>([]);
  const [sCatActiveIdx, setSCatActiveIdx] = useState(0);
  const [autoRound, setAutoRound]         = useState(true);

  // Fetch category suggestions after crawl result is set
  const fetchCatSuggestions = async (productName: string) => {
    setSCatLoading(true); setSCatSuggestions([]); setSCatSelected(null);
    try {
      const res = await fetch('/api/category/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName }),
      });
      const data = await res.json();
      if (data.success && data.suggestions?.length > 0) {
        setSCatSuggestions(data.suggestions.slice(0, 3));
        const topCat = data.suggestions[0];
        setSCatSelected(topCat);
        // Auto-apply fee rate for top category
        const fee = getNaverFeeRateByD1(topCat.d1);
        setNaverFeeRate(fee);
      }
    } catch { /* non-blocking */ }
    finally { setSCatLoading(false); }
  };

  // When category suggestion fails and categoryName exists, pre-fill search query
  useEffect(() => {
    if (!sCatLoading && sCatSuggestions.length === 0 && sResult?.categoryName && !sCatQuery) {
      setSCatQuery(sResult.categoryName);
    }
  }, [sCatLoading, sCatSuggestions.length, sResult?.categoryName]);
  // When targetProfit changes, update suggested sell price
  const suggestedSellPrice = sBreakeven > 0 ? sBreakeven + targetProfit : 0;

  const handleSingleCrawl = async () => {
    // Support bare product numbers (7-10 digits) as well as full URLs
    const resolvedUrl = /^\d{7,10}$/.test(sUrl.trim())
      ? `https://domeme.domeggook.com/s/${sUrl.trim()}`
      : sUrl.trim();
    if (!resolvedUrl) { setSError('URL 또는 상품번호를 입력해주세요'); return; }
    setSLoading(true); setSError(''); setSResult(null); setSSuccess('');
    try {
      const res  = await fetch('/api/crawler/domemae', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: resolvedUrl }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSResult(data.data);
        setSessionWarning(data.sessionWarning || null);
        const p = data.data.supplierPrice || 0;
        setSupPrice(p);
        // Auto-apply ship fee from API
        if (data.data.shipFee !== undefined) setShipFee(data.data.shipFee);
        // Smart default target profit based on supplier price tier
        const smartProfit = p <= 0 ? 3000
          : p <= 10000  ? 3000
          : p <= 30000  ? 5000
          : p <= 50000  ? 8000
          : 10000;
        setTargetProfit(smartProfit);
        // Auto-set sell price to breakeven + smart target profit
        if (p > 0) {
          const fee = data.data.shipFee ?? 3000;
          const be = calcBreakeven(p, fee);
          const raw = be + smartProfit;
          setSellPrice(autoRound ? smartRound(raw) : raw);
        }
        // Trigger category suggestion in background
        fetchCatSuggestions(data.data.name);
      } else { setSError(data.error || '크롤링 실패'); }
    } catch (e: unknown) { setSError(e instanceof Error ? e.message : '오류 발생'); }
    finally { setSLoading(false); }
  };

  const handleGoToRegister = async () => {
    if (!sResult || !supPrice || !sellPrice) { setSError('도매가와 판매가를 입력해주세요'); return; }
    setSSaving(true); setSError('');
    try {
      // Use already-fetched category (user may have selected one), fallback to API
      let suggestedCat: { d1: string; d2: string; d3: string } | null = sCatSelected;

      // Sanitize: keep only printable ASCII + safe Unicode, strip everything else
      const sanitize = (s: string) => (s || '')
        .replace(/[\x00-\x1F\x7F-]/g, ' ') // control chars
        .replace(/[�￾￿]/g, '')           // replacement chars
        .replace(/[؀-ۿȀ-ɏ]/g, '')   // Arabic/extended Latin that caused corruption
        .replace(/"/g, "'")                              // prevent JSON string breakage
        .replace(/\\(?!['"\\/bfnrtu])/g, '\\\\')       // escape lone backslashes
        .replace(/\s+/g, ' ')
        .trim();
      const prefill = {
        productName: sanitize(sResult.name),
        supplierPrice: supPrice,
        salePrice: sellPrice,
        mainImage: sResult.images?.[0] || '',
        additionalImgs: (sResult.images?.slice(1) || []).join('|'),
        description: sanitize(sResult.description || ''),
        options: (sResult.options || []).map(o => sanitize(typeof o === 'string' ? o : o.name)).filter(Boolean),
        ...(suggestedCat ? { catD1: suggestedCat.d1, catD2: suggestedCat.d2, catD3: suggestedCat.d3 } : {}),
        // Supplier auto-mapping fields
        crawlSellerId:   sResult.sellerId   ?? null,
        crawlSellerNick: sResult.sellerNick ?? null,
        crawlShipFee:    shipFee,
        crawlCanMerge:   sResult.canMerge   ?? null,
        // Extended fields for product registration
        crawlProductNo:  sResult.productNo  ?? null,
        crawlInventory:  sResult.inventory  ?? null,
        crawlCategoryCode: sResult.categoryCode ?? null,
        crawlNaverFeeRate: naverFeeRate,
        // Source URL — used by seed-new to mark sourcing log as REGISTERED after Excel download
        crawlSourceUrl: sResult.sourceUrl ?? sUrl.trim() ?? null,
      };
      // Encode: use TextEncoder for proper UTF-8 binary, then base64
      const jsonStr = JSON.stringify(prefill);
      const utf8Bytes = new TextEncoder().encode(jsonStr);
      let binary = '';
      utf8Bytes.forEach(b => { binary += String.fromCharCode(b); });
      const encoded = btoa(binary);
      router.push(`/products/new?prefill=${encoded}&autoSeo=1`);
    } catch (e: unknown) { setSError(e instanceof Error ? e.message : '오류'); }
    finally { setSSaving(false); }
  };

  const handleSaveOnly = async () => {
    if (!sResult || !supPrice || !sellPrice) { setSError('도매가와 판매가를 입력해주세요'); return; }
    setSSaving(true); setSError('');
    try {
      // Save to crawl_logs (sourcing shelf) — fire and forget
      fetch('/api/crawler/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: sUrl,
          name: sResult.name,
          supplierPrice: supPrice,
          source: 'single',
          sellerNick: sResult.sellerNick,
          sellerId: sResult.sellerId,
          categoryName: sResult.categoryName,
          inventory: sResult.inventory,
          shipFee: shipFee,
          canMerge: sResult.canMerge,
          sourcingStatus: 'SOURCED',
        }),
      }).catch(() => null);
      setSSuccess('소싱 보관함에 담겼습니다!');
      setTimeout(() => setSSuccess(''), 2500);
    } finally { setSSaving(false); }
  };

  // ── 대량 탭 state ─────────────────────────────────────────────────────────
  const [bulkInputMode, setBulkInputMode] = useState<'url'|'no'|'excel'>('no'); // default: product number mode
  const [excelParseMsg, setExcelParseMsg] = useState('');
  const [bUrlText, setBUrlText]     = useState('');
  const [bRows, setBRows]           = useState<BulkRow[]>([]);
  const [bRunning, setBRunning]     = useState(false);
  const [bProgress, setBProgress]   = useState({ done: 0, total: 0 });
  const [bStep, setBStep]           = useState<'input'|'running'|'results'>('input');
  const [bError, setBError]         = useState('');
  const [bMarginRate, setBMarginRate] = useState(30); // % — user-editable
  const [bAutoRound, setBAutoRound]   = useState(true); // auto smart-round prices
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bActionResult, setBActionResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // Helper: calculate bulk sale price with optional smart rounding
  const bulkSalePrice = (sup: number) => {
    const raw = Math.ceil(sup * (1 + bMarginRate / 100));
    return bAutoRound ? smartRound(raw) : raw;
  };

  // Parse bulk input — supports both full URLs and bare product numbers (7-10 digits)
  const parseBulkUrls = () => bUrlText.split(/[\n,\s]+/).map(u => u.trim()).filter(Boolean).map(u => {
    if (u.startsWith('http') && u.includes('domeggook')) return u;
    if (/^\d{7,10}$/.test(u)) return `https://domeme.domeggook.com/s/${u}`;
    return null;
  }).filter(Boolean) as string[];
  const validBulkUrls = parseBulkUrls();

  const handleBulkCrawl = useCallback(() => {
    const urls = parseBulkUrls();
    if (urls.length === 0) { setBError('유효한 도매매 URL이 없습니다'); return; }
    if (urls.length > 50)  { setBError('최대 50개까지 처리 가능합니다'); return; }

    setBError(''); setBRunning(true); setBStep('running');
    setBProgress({ done: 0, total: urls.length });
    setBRows(urls.map(url => ({ id: uuidv4(), url, status: 'pending' })));
    setSelectedIds(new Set());

    const qs = urls.map(u => encodeURIComponent(u)).join('|');
    const es = new EventSource(`/api/crawler/stream?urls=${encodeURIComponent(urls.join('|'))}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'result') {
          setBRows(prev => prev.map(r => r.url === msg.url ? {
            ...r,
            status: msg.status,
            name: msg.name, supplierPrice: msg.supplierPrice,
            images: msg.images, options: msg.options, description: msg.description,
            error: msg.error,
            editedPrice: msg.supplierPrice ?? 0,
            editedName: msg.name ?? '',
            excluded: false,
            // Extended fields from OpenAPI
            productNo: msg.productNo,
            inventory: msg.inventory,
            shipFee: msg.shipFee,
            canMerge: msg.canMerge,
            sellerNick: msg.sellerNick,
            sellerId: msg.sellerId,
            categoryName: msg.categoryName,
            categoryCode: msg.categoryCode,
          } : r));
        } else if (msg.type === 'progress') {
          setBProgress({ done: msg.done, total: msg.total });
        } else if (msg.type === 'done') {
          setBRunning(false); setBStep('results');
          // Auto-select successes
          setBRows(prev => {
            const ids = new Set<string>();
            prev.forEach(r => { if (r.status === 'success') ids.add(r.id); });
            setSelectedIds(ids);
            return prev;
          });
          es.close();
        } else if (msg.type === 'error') {
          setBError(msg.message);
          setBRunning(false); setBStep('input');
          es.close();
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      setBRunning(false);
      if (bStep === 'running') setBStep('results');
      es.close();
    };
  }, [bUrlText]);

  const toggleBSelect = (id: string) => setSelectedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleBAll = () => {
    const eligible = bRows.filter(r => r.status === 'success' && !r.excluded).map(r => r.id);
    setSelectedIds(selectedIds.size === eligible.length ? new Set() : new Set(eligible));
  };
  const excludeRow = (id: string) => {
    setBRows(prev => prev.map(r => r.id === id ? { ...r, excluded: true } : r));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };
  const updateBRow = (id: string, field: 'editedName'|'editedPrice', val: string|number) =>
    setBRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));

  const selectedItems = bRows.filter(r => selectedIds.has(r.id));

  const handleBulkExcel = async () => {
    if (selectedItems.length === 0) { setBError('선택된 상품이 없습니다'); return; }
    setExcelLoading(true); setBActionResult(null);
    try {
      // Update crawl_logs SOURCED -> PENDING for selected items (by URL)
      const urls = selectedItems.map(r => r.url).filter(Boolean);
      const res = await fetch('/api/crawler/logs', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, sourcingStatus: 'PENDING' }),
      });
      const data = await res.json();
      const updated = data.updated ?? urls.length;
      setBActionResult({
        ok: true,
        message: `${updated}개 소싱 보관함에 담겼습니다! "소싱 보관함" 탭에서 확인하세요.`,
      });
    } catch (e: unknown) {
      setBActionResult({ ok: false, message: e instanceof Error ? e.message : '저장 실패' });
    } finally { setExcelLoading(false); }
  };

  const handleBulkToRegister = (r: BulkRow) => {
    const san = (s: string) => (s || '')
      .replace(/[\x00-\x1F\x7F-]/g, ' ')
      .replace(/[�￾￿]/g, '')
      .replace(/[؀-ۿȀ-ɏ]/g, '')
      .replace(/"/g, "'")
      .replace(/\s+/g, ' ').trim();
    const prefill = {
      productName: san(r.editedName || r.name || ''),
      supplierPrice: r.editedPrice ?? r.supplierPrice ?? 0,
      salePrice: bulkSalePrice(r.editedPrice ?? r.supplierPrice ?? 0),
      mainImage: r.images?.[0] || '',
      additionalImgs: (r.images?.slice(1) || []).join('|'),
      description: san(r.description || ''),
      options: (r.options || []).map(o => san(typeof o === 'string' ? o : o.name)).filter(Boolean),
      // Supplier auto-mapping fields
      crawlSellerId:   r.sellerId   ?? null,
      crawlSellerNick: r.sellerNick ?? null,
      crawlShipFee:    r.shipFee    ?? 3000,
      crawlCanMerge:   r.canMerge   ?? null,
      // Extended fields
      crawlProductNo:  r.productNo  ?? null,
      crawlInventory:  r.inventory  ?? null,
      crawlCategoryCode: r.categoryCode ?? null,
    };
    // TextEncoder-based base64 (same as single crawl)
    const jStr = JSON.stringify(prefill);
    const uBytes = new TextEncoder().encode(jStr);
    let bin = ''; uBytes.forEach(b => { bin += String.fromCharCode(b); });
    router.push(`/products/new?prefill=${btoa(bin)}&autoSeo=1`);
  };

  // ── 소싱 보관함 탭 state ─────────────────────────────────────────────────
  const [logs, setLogs]               = useState<SourcingItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [histFilter, setHistFilter]   = useState<'all'|'SOURCED'|'PENDING'|'REGISTERED'|'single'|'bulk'>('all');
  const [histSearch, setHistSearch]   = useState('');
  const [histSelected, setHistSelected] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult]   = useState<{ created: number; skipped: number; errors: number } | null>(null);
  const [histSellerFilter, setHistSellerFilter] = useState<string>('all');
  const [sellerGroups, setSellerGroups] = useState<Record<string, string>>({});
  const [shelfUpdating, setShelfUpdating] = useState<Set<string>>(new Set());

  const loadShelf = (filter = histFilter, seller = histSellerFilter) => {
    setLogsLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (filter !== 'all' && ['SOURCED','PENDING','REGISTERED'].includes(filter)) params.set('status', filter);
    if (filter === 'single' || filter === 'bulk') params.set('source', filter);
    if (seller !== 'all') params.set('seller', seller);
    fetch(`/api/crawler/logs?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setLogs(d.logs);
          if (d.sellerGroups) setSellerGroups(d.sellerGroups);
        }
      })
      .catch(() => null)
      .finally(() => setLogsLoading(false));
  };

  useEffect(() => {
    if (tab !== 'history') return;
    loadShelf();
  }, [tab]);

  const updateSourcingStatus = async (id: string, status: string, productId?: string) => {
    setShelfUpdating(prev => new Set(prev).add(id));
    try {
      await fetch('/api/crawler/logs', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, sourcingStatus: status, ...(productId ? { productId } : {}) }),
      });
      setLogs(prev => prev.map(l => l.id === id ? { ...l, sourcing_status: status } : l));
    } catch { /* ignore */ }
    finally { setShelfUpdating(prev => { const n = new Set(prev); n.delete(id); return n; }); }
  };

  const deleteFromShelf = async (id: string) => {
    await fetch(`/api/crawler/logs?id=${id}`, { method: 'DELETE' });
    setLogs(prev => prev.filter(l => l.id !== id));
    setHistSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: 24, paddingBottom: 56 }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ position:'relative', width:52, height:52, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ position:'absolute', top:0, left:0 }}>
                {([0,60,120,180,240,300] as number[]).map((deg,i)=>{ const r=deg*Math.PI/180; const cx=26+Math.cos(r)*11.4; const cy=26+Math.sin(r)*11.4; return <ellipse key={i} cx={cx} cy={cy} rx={14} ry={10.4} transform={`rotate(${deg} ${cx} ${cy})`} fill="#e62310" />; })}
                <circle cx="26" cy="26" r="14.6" fill="#e62310" />
              </svg>
              <Layers size={18} color="#fff" strokeWidth={2.5} style={{ position:'relative', zIndex:1 }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>꿀통 사냥터</h1>
          </div>
          <PinkLine />
          <p style={{ fontSize: 13, color: '#888', marginTop: 6 }}>
            도매매 상품을 크롤링해서 네이버 상품 등록으로 바로 연결합니다
          </p>
        </div>

        {/* ── Tab switcher ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F5F5F5', borderRadius: 14, padding: 4 }}>
          {([
            { key: 'single',  label: '단건 크롤링',  icon: <Search size={14} /> },
            { key: 'bulk',    label: '대량 크롤링',  icon: <Layers size={14} /> },
            { key: 'history', label: '소싱 보관함',  icon: <Package size={14} /> },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 10, border: 'none',
                background: tab === key ? '#fff' : 'transparent',
                color: tab === key ? '#e62310' : '#888',
                fontSize: 13, fontWeight: tab === key ? 700 : 500,
                cursor: 'pointer',
                boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ════ 단건 탭 ════ */}
        {tab === 'single' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* URL 입력 */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1.5px solid #F8DCE5', padding: '20px 22px' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={15} color="#D4B0BC" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type="text" value={sUrl} onChange={e => setSUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSingleCrawl()}
                    placeholder="https://domeme.domeggook.com/s/55884601"
                    style={{ width: '100%', paddingLeft: 42, paddingRight: 14, paddingTop: 13, paddingBottom: 13, fontSize: 14, background: '#FFF5F8', border: '1.5px solid #F8DCE5', borderRadius: 12, color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='#FF6B8A'; }}
                    onBlur={e => { e.currentTarget.style.background='#FFF5F8'; e.currentTarget.style.borderColor='#F8DCE5'; }}
                  />
                </div>
                <button onClick={handleSingleCrawl} disabled={sLoading} style={{ display:'flex', alignItems:'center', gap:6, padding:'13px 22px', background: sLoading ? '#F8DCE5' : '#e62310', color: sLoading ? '#B0A0A8' : '#fff', fontSize:14, fontWeight:900, borderRadius:12, border:'none', cursor: sLoading ? 'not-allowed':'pointer', whiteSpace:'nowrap' }}>
                  {sLoading ? <><RefreshCw size={14} className="animate-spin" /> 불러오는 중...</> : <><Search size={14} /> 불러오기</>}
                </button>
              </div>
              {sessionWarning && (
            <div style={{ marginTop: 10, padding:'9px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, fontSize:13, color:'#a16207', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ display:"inline-flex", alignItems:"center", color:"#e62310" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
              <span>{sessionWarning}</span>
              <a href="/settings/supplier-login" style={{ marginLeft:'auto', fontSize:12, fontWeight:700, color:'#e62310', textDecoration:'none', whiteSpace:'nowrap' }}>재로기인 →</a>
            </div>
          )}
          {sError && <div style={{ marginTop: 10, padding:'9px 12px', background:'#fff0ef', border:'1px solid #ffd6d3', borderRadius:10, fontSize:13, color:'#b91c1c' }}>{sError}</div>}
              {sSuccess && <div style={{ marginTop: 10, padding:'9px 12px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, fontSize:13, color:'#15803d', display:'flex', alignItems:'center', gap:6 }}><CheckCircle size={13}/>{sSuccess}</div>}
            </div>

            {/* 결과 카드 — 라벨+값 구조로 모든 정보 명확히 표시 */}
            {sResult && (
              <div style={{ background:'#fff', borderRadius:18, border:'1.5px solid #F8DCE5', overflow:'hidden' }}>
                {/* 상단: 이미지 + 상품명 + 도매가 */}
                <div style={{ padding:'18px 20px', display:'flex', gap:14, alignItems:'flex-start' }}>
                  {/* Thumbnail */}
                  <div style={{ width:72, height:72, borderRadius:12, overflow:'hidden', border:'1.5px solid #F8DCE5', background:'#F5F5F5', flexShrink:0 }}>
                    {sResult.images?.[0]
                      ? <img src={sResult.images[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><Package size={24} color="#ddd"/></div>}
                  </div>
                  {/* Name + price */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:6 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'#1A1A1A', margin:0, lineHeight:1.4 }}>{sResult.name}</p>
                      <a href={sUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'#aaa', textDecoration:'none', flexShrink:0, whiteSpace:'nowrap' }}>
                        <ExternalLink size={11}/> 원본
                      </a>
                    </div>
                    {sResult.supplierPrice > 0 ? (
                      <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                        <span style={{ fontSize:24, fontWeight:900, color:'#e62310' }}>{sResult.supplierPrice.toLocaleString()}원</span>
                        <span style={{ fontSize:11, color:'#aaa', fontWeight:400 }}>도매 공급가</span>
                      </div>
                    ) : (
                      <div style={{ padding:'6px 10px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, fontSize:12, color:'#a16207' }}>
                        도매가 미확인 — 아래에서 직접 입력
                      </div>
                    )}
                    {sResult.images && sResult.images.length > 1 && (
                      <span style={{ fontSize:11, color:'#aaa', marginTop:3, display:'block' }}>이미지 총 {sResult.images.length}장</span>
                    )}
                  </div>
                </div>

                {/* 구분선 */}
                <div style={{ height:1, background:'#F8DCE5', margin:'0 20px' }}/>

                {/* 소싱 정보 그리드 — 라벨+값 */}
                <div style={{ padding:'14px 20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 24px' }}>
                  {/* 공급사 */}
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'#aaa', letterSpacing:'0.06em', textTransform:'uppercase' }}>공급사</span>
                    {sResult.sellerNick ? (
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'#0369A1' }}>{sResult.sellerNick}</span>
                        {sResult.sellerId && <span style={{ fontSize:10, color:'#aaa' }}>({sResult.sellerId})</span>}
                      </div>
                    ) : <span style={{ fontSize:12, color:'#ccc', fontStyle:'italic' }}>정보 없음</span>}
                  </div>

                  {/* 재고 */}
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'#aaa', letterSpacing:'0.06em', textTransform:'uppercase' }}>현재 재고</span>
                    {sResult.inventory !== undefined ? (
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:13, fontWeight:700, color: Number(sResult.inventory) < 10 ? '#b91c1c' : Number(sResult.inventory) < 30 ? '#a16207' : '#15803d' }}>
                          {Number(sResult.inventory).toLocaleString()}개
                        </span>
                        {Number(sResult.inventory) < 10 && <span style={{ fontSize:10, color:'#b91c1c', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:99, padding:'1px 6px' }}>재고 위험</span>}
                        {Number(sResult.inventory) >= 10 && Number(sResult.inventory) < 30 && <span style={{ fontSize:10, color:'#a16207', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:99, padding:'1px 6px' }}>재고 주의</span>}
                      </div>
                    ) : <span style={{ fontSize:12, color:'#ccc', fontStyle:'italic' }}>정보 없음</span>}
                  </div>

                  {/* 묶음배송 */}
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'#aaa', letterSpacing:'0.06em', textTransform:'uppercase' }}>묶음배송</span>
                    {sResult.canMerge !== undefined ? (
                      <span style={{ fontSize:13, fontWeight:700, color: sResult.canMerge ? '#15803d' : '#e62310' }}>
                        {sResult.canMerge ? '가능' : '불가'}
                        <span style={{ fontSize:11, color:'#aaa', fontWeight:400, marginLeft:4 }}>{sResult.canMerge ? '(배송비 절약 기회)' : '(단독 배송)'}</span>
                      </span>
                    ) : <span style={{ fontSize:12, color:'#ccc', fontStyle:'italic' }}>정보 없음</span>}
                  </div>

                  {/* 공급 배송비 */}
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'#aaa', letterSpacing:'0.06em', textTransform:'uppercase' }}>공급 배송비</span>
                    <span style={{ fontSize:13, fontWeight:700, color: sResult.shipFee === 0 ? '#15803d' : '#555' }}>
                      {sResult.shipFee === 0 ? '무료' : sResult.shipFee !== undefined ? `${sResult.shipFee.toLocaleString()}원` : '3,000원 (기본)'}
                      {sResult.shipFee === 0 && <span style={{ fontSize:11, color:'#15803d', fontWeight:400, marginLeft:4 }}>(무료 공급)</span>}
                    </span>
                  </div>

                  {/* 도매꾹 카테고리 */}
                  {sResult.categoryName && (
                    <div style={{ display:'flex', flexDirection:'column', gap:3, gridColumn:'1 / -1' }}>
                      <span style={{ fontSize:10, fontWeight:700, color:'#aaa', letterSpacing:'0.06em', textTransform:'uppercase' }}>도매꾹 분류 카테고리</span>
                      <span style={{ fontSize:12, color:'#7C3AED', background:'#F8F5FF', border:'1px solid #DDD6FE', borderRadius:6, padding:'3px 8px', display:'inline-block' }}>
                        {sResult.categoryName}
                        <span style={{ fontSize:10, color:'#aaa', marginLeft:6 }}>(네이버 카테고리와 다를 수 있음 — 아래에서 직접 선택)</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* 옵션 섹션 */}
                {sResult.options?.length > 0 && (
                  <>
                    <div style={{ height:1, background:'#F8DCE5', margin:'0 20px' }}/>
                    <div style={{ padding:'12px 20px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:'#aaa', letterSpacing:'0.06em', textTransform:'uppercase' }}>옵션</span>
                        <span style={{ fontSize:11, color:'#e62310', background:'#FFF0EF', border:'1px solid #fca5a5', borderRadius:99, padding:'1px 7px', fontWeight:700 }}>
                          {(() => { const oos = sResult.options.filter(o => typeof o !== 'string' && o.qty === 0).length; return oos > 0 ? `${sResult.options.length}개 (품절 ${oos}개)` : `${sResult.options.length}개`; })()} → 상품등록에 자동 입력됩니다
                        </span>
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {sResult.options.slice(0,6).map((opt,i) => {
                          const o = typeof opt === 'string' ? { name: opt, qty: -1, addPrice: 0 } : opt;
                          return (
                            <span key={i} style={{ padding:'4px 10px', background: o.qty === 0 ? '#FEF2F2' : '#FFF5F8', border: o.qty === 0 ? '1px solid #fca5a5' : '1px solid #F8DCE5', borderRadius:8, fontSize:12, color: o.qty === 0 ? '#b91c1c' : '#333', fontWeight:500 }}>
                              {o.name}
                              {o.qty >= 0 && <span style={{ fontSize:10, color: o.qty === 0 ? '#b91c1c' : '#aaa', marginLeft:4 }}>({o.qty})</span>}
                              {o.addPrice > 0 && <span style={{ fontSize:10, color:'#0369a1', marginLeft:3 }}>+{o.addPrice.toLocaleString()}</span>}
                            </span>
                          );
                        })}
                        {sResult.options.length > 6 && (
                          <span style={{ padding:'4px 10px', background:'#F5F5F5', borderRadius:8, fontSize:12, color:'#888' }}>+{sResult.options.length-6}개 더</span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 카테고리 추천 */}
            {sResult && (
              <div style={{ background:'#fff', borderRadius:18, border:'1.5px solid #F8DCE5', padding:'18px 22px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <div style={{ width:3, height:16, background:'#e62310', borderRadius:99 }} />
                  <p style={{ fontSize:11, fontWeight:900, color:'#e62310', letterSpacing:'0.14em', textTransform:'uppercase', margin:0, fontFamily:"'Arial Black',Impact,sans-serif" }}>카테고리 자동 추천</p>
                  {sCatLoading && (
                    <RefreshCw size={12} className="animate-spin" style={{ color:'#e62310', marginLeft:4 }} />
                  )}
                  {!sCatLoading && sCatSuggestions.length > 0 && (
                    <span style={{ fontSize:10, color:'#15803d', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:99, padding:'1px 8px', marginLeft:4 }}>자동 선택됨</span>
                  )}
                  {!sCatLoading && sCatSelected && (
                    <span style={{ fontSize:10, fontWeight:700, color:'#c2410c', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:99, padding:'1px 8px', marginLeft:4 }}>
                      수수료 {(naverFeeRate * 100).toFixed(2)}% 적용 중
                    </span>
                  )}
                </div>
                {sCatLoading && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'#FFF5F8', borderRadius:10, fontSize:13, color:'#aaa' }}>
                    <RefreshCw size={13} className="animate-spin" style={{ color:'#FFB3CE' }} />
                    상품명으로 최적 카테고리를 찾는 중...
                  </div>
                )}
                {!sCatLoading && sCatSuggestions.length === 0 && (
                  <div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                      <p style={{ fontSize:12, color:'#b91c1c', margin:0, fontWeight:600 }}>
                        카테고리 자동 추천 실패 — 직접 검색해주세요
                      </p>
                      {sResult?.categoryName && (
                        <span style={{ fontSize:11, color:'#888' }}>
                          도매꾹: <strong style={{ color:'#7C3AED' }}>{sResult.categoryName}</strong>
                        </span>
                      )}
                    </div>
                    {/* Local search — filters NAVER_CATEGORIES_FULL client-side, no API call */}
                    <div style={{ position:'relative' }}>
                      <input
                        type="text"
                        value={sCatQuery || ''}
                        placeholder="카테고리 이름 입력 — 예) 이불, 소파, 양말, 컵"
                        onChange={e => {
                          const q = e.target.value;
                          setSCatQuery(q);
                          const trimmed = q.trim().toLowerCase();
                          if (trimmed.length < 2) { setSCatDropdown([]); return; }
                          // Same logic as products/new — fullPath.includes() for broader matching
                          const results = NAVER_CATEGORIES_FULL
                            .filter(c => c.fullPath.toLowerCase().includes(trimmed))
                            .slice(0, 12)
                            .map(c => ({ code: c.code, d1: c.d1, d2: c.d2, d3: c.d3, d4: c.d4 }));
                          setSCatDropdown(results);
                          setSCatActiveIdx(0);
                        }}
                        onKeyDown={e => {
                          if (!sCatDropdown.length) return;
                          if (e.key === 'ArrowDown') { e.preventDefault(); setSCatActiveIdx(i => Math.min(i + 1, sCatDropdown.length - 1)); }
                          else if (e.key === 'ArrowUp') { e.preventDefault(); setSCatActiveIdx(i => Math.max(i - 1, 0)); }
                          else if (e.key === 'Enter' && sCatDropdown[sCatActiveIdx]) {
                            e.preventDefault();
                            const cat = sCatDropdown[sCatActiveIdx];
                            setSCatSelected(cat);
                            setSCatSuggestions([cat]);
                            setSCatDropdown([]);
                            setSCatQuery([cat.d1, cat.d2, cat.d3, cat.d4].filter(Boolean).join(' > '));
                            const fee = getNaverFeeRateByD1(cat.d1);
                            setNaverFeeRate(fee);
                            if (supPrice > 0) {
                              const be = calcBreakeven(supPrice, shipFee, fee);
                              setSellPrice(autoRound ? smartRound(be + targetProfit) : be + targetProfit);
                            }
                          }
                          else if (e.key === 'Escape') { setSCatDropdown([]); }
                        }}
                        style={{
                          width: '100%', padding: '8px 12px', fontSize: 13,
                          background: '#FFF5F8', border: '1.5px solid #F8DCE5',
                          borderRadius: 10, color: '#1A1A1A', outline: 'none',
                          boxSizing: 'border-box' as const,
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#FF6B8A'; }}
                        onBlur={e => { setTimeout(() => setSCatDropdown([]), 150); e.currentTarget.style.borderColor = '#F8DCE5'; }}
                      />
                      {/* Dropdown results — fullPath search, d4 + code display, keyboard nav */}
                      {sCatDropdown.length > 0 && (
                        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#fff', border:'1.5px solid #F8DCE5', borderRadius:10, zIndex:50, boxShadow:'0 4px 12px rgba(0,0,0,0.08)', overflow:'hidden', maxHeight:320, overflowY:'auto' }}
                          onMouseDown={e => e.preventDefault()}>
                          {sCatDropdown.map((cat, i) => {
                            const leaf = cat.d4 || cat.d3;
                            const q = (sCatQuery || '').trim().toLowerCase();
                            const leafLower = leaf.toLowerCase();
                            const hi = q ? leafLower.indexOf(q) : -1;
                            return (
                            <button key={cat.code} type="button"
                              onMouseDown={() => {
                                setSCatSelected(cat);
                                setSCatSuggestions([cat]);
                                setSCatDropdown([]);
                                setSCatQuery([cat.d1, cat.d2, cat.d3, cat.d4].filter(Boolean).join(' > '));
                                const fee = getNaverFeeRateByD1(cat.d1);
                                setNaverFeeRate(fee);
                                if (supPrice > 0) {
                                  const be = calcBreakeven(supPrice, shipFee, fee);
                                  setSellPrice(autoRound ? smartRound(be + targetProfit) : be + targetProfit);
                                }
                              }}
                              onMouseEnter={() => setSCatActiveIdx(i)}
                              style={{ display:'block', width:'100%', textAlign:'left', padding:'9px 12px', fontSize:12, color:'#333', background: i === sCatActiveIdx ? '#FFF5F8' : 'transparent', border:'none', borderBottom:'1px solid #F8DCE5', cursor:'pointer', transition:'background 0.1s' }}>
                              <div style={{ fontWeight:500 }}>
                                {hi >= 0 ? (<>{leaf.slice(0, hi)}<mark style={{ background:'#FFE0B2', color:'#E65100', borderRadius:2, padding:'0 2px' }}>{leaf.slice(hi, hi + q.length)}</mark>{leaf.slice(hi + q.length)}</>) : leaf}
                              </div>
                              <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>
                                {cat.d1} &gt; {cat.d2}{cat.d3 ? ` > ${cat.d3}` : ''}{cat.d4 ? ` > ${cat.d4}` : ''}
                                <span style={{ marginLeft:8, color:'#ccc' }}>{cat.code}</span>
                              </div>
                            </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!sCatLoading && sCatSuggestions.length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {sCatSuggestions.map((cat, i) => {
                      const isSelected = sCatSelected?.d1 === cat.d1 && sCatSelected?.d2 === cat.d2 && sCatSelected?.d3 === cat.d3;
                      return (
                        <button key={i} type="button" onClick={() => {
                            setSCatSelected(cat);
                            const fee = getNaverFeeRateByD1(cat.d1);
                            setNaverFeeRate(fee);
                            if (supPrice > 0) {
                              const be = calcBreakeven(supPrice, shipFee, fee);
                              const raw = be + targetProfit;
                              setSellPrice(autoRound ? smartRound(raw) : raw);
                            }
                          }}
                          style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:10, border: isSelected ? '2px solid #e62310' : '1.5px solid #F8DCE5', background: isSelected ? '#FFF0F5' : '#fff', cursor:'pointer', textAlign:'left', transition:'all 0.12s' }}>
                          <div style={{ width:16, height:16, borderRadius:'50%', border: isSelected ? '5px solid #e62310' : '2px solid #ddd', flexShrink:0, transition:'all 0.12s' }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:12, fontWeight: isSelected ? 700 : 400, color: isSelected ? '#e62310' : '#333', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {[cat.d1, cat.d2, cat.d3, (cat as {d1:string;d2:string;d3:string;d4?:string}).d4].filter(Boolean).join(' > ')}
                            </p>
                          </div>
                          {i === 0 && <span style={{ fontSize:10, color:'#888', background:'#F8DCE5', borderRadius:99, padding:'1px 7px', flexShrink:0 }}>추천 1위</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 마진 계산기 — 손익분기 방식 */}
            {sResult && (
              <div style={{ background:'#fff', borderRadius:18, border:'1.5px solid #F8DCE5', padding:'20px 22px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <p style={{ fontSize:11, fontWeight:900, color:'#e62310', letterSpacing:'0.14em', textTransform:'uppercase', margin:0, fontFamily:"'Arial Black',Impact,sans-serif" }}>판매가 계산기</p>
                  {/* Honey score for current prices with correct fee rate */}
                  <HoneyBadge
                    supplierPrice={supPrice} salePrice={sellPrice} naverFeeRate={naverFeeRate}
                    inventory={sResult?.inventory} canMerge={sResult?.canMerge ?? undefined}
                    sellerRank={sResult?.sellerRank} shipFee={shipFee}
                    optionCount={sResult?.options?.length}
                  />
                </div>

                {/* Step 1 — Cost inputs */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                  <div>
                    <p style={{ fontSize:12, fontWeight:600, color:'#555', margin:'0 0 5px' }}>도매가 (원가)</p>
                    <input type="number" value={supPrice} onChange={e => {
                      const p = Number(e.target.value);
                      setSupPrice(p);
                      if (p > 0) setSellPrice(calcBreakeven(p, shipFee) + targetProfit);
                    }} style={{ width:'100%', padding:'9px 10px', fontSize:14, background:'#FFF5F8', border:'1.5px solid #F8DCE5', borderRadius:10, color:'#1A1A1A', outline:'none' }} />
                  </div>
                  <div>
                    <p style={{ fontSize:12, fontWeight:600, color:'#555', margin:'0 0 5px' }}>배송비</p>
                    <input type="number" value={shipFee} onChange={e => setShipFee(Number(e.target.value))}
                      style={{ width:'100%', padding:'9px 10px', fontSize:14, background:'#FFF5F8', border:'1.5px solid #F8DCE5', borderRadius:10, color:'#1A1A1A', outline:'none' }} />
                  </div>
                </div>

                {/* Step 2 — Breakeven + target profit: show when supPrice is entered (even if crawl returned 0) */}
                {supPrice > 0 && (
                  <div style={{ background:'#F8F8F8', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                      <p style={{ fontSize:11, color:'#888', margin:0 }}>손익분기 판매가 (네이버 수수료+배송비 포함)</p>
                      <p style={{ fontSize:15, fontWeight:900, color:'#555' }}>{sBreakeven.toLocaleString()}원</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <p style={{ fontSize:12, fontWeight:600, color:'#555', margin:0, whiteSpace:'nowrap' }}>얼마 남기고 싶어요?</p>
                      <input type="number" value={targetProfit}
                        onChange={e => { const tp = Number(e.target.value); setTargetProfit(tp); setSellPrice(sBreakeven + tp); }}
                        placeholder="순이익 목표"
                        style={{ flex:1, padding:'7px 10px', fontSize:13, fontWeight:700, color:'#15803d', background:'#F0FDF4', border:'1px solid #86efac', borderRadius:8, outline:'none' }} />
                      <span style={{ fontSize:12, color:'#888', whiteSpace:'nowrap' }}>원 남기기</span>
                      <button
                        onClick={() => { const r = smartRound(sellPrice); setSellPrice(r); }}
                        disabled={sellPrice <= 0}
                        style={{ padding:'7px 12px', borderRadius:8, fontSize:11, fontWeight:700, background: sellPrice > 0 ? '#fff' : '#F8DCE5', color: sellPrice > 0 ? '#555' : '#B0A0A8', border:'1.5px solid #F8DCE5', cursor: sellPrice > 0 ? 'pointer' : 'not-allowed', whiteSpace:'nowrap' }}>
                        단수조정
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3 — Final sell price (editable) */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                    <p style={{ fontSize:12, fontWeight:600, color:'#555', margin:0 }}>최종 판매가</p>
                    <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:11, color:'#888' }}>
                      <input type="checkbox" checked={autoRound} onChange={e => {
                        setAutoRound(e.target.checked);
                        if (e.target.checked && sellPrice > 0) setSellPrice(smartRound(sellPrice));
                      }} style={{ accentColor:'#e62310', cursor:'pointer' }} />
                      자동 단수조정
                    </label>
                  </div>
                  <input type="number" value={sellPrice} onChange={e => setSellPrice(Number(e.target.value))}
                    style={{ width:'100%', padding:'9px 10px', fontSize:16, fontWeight:700, background:'#FFF5F8', border:'1.5px solid #FF6B8A', borderRadius:10, color:'#e62310', outline:'none' }} />
                  {supPrice > 0 && sBreakeven > 0 && sellPrice < sBreakeven && (
                    <p style={{ fontSize:12, color:'#b91c1c', marginTop:4 }}>
                      손익분기({sBreakeven.toLocaleString()}원) 미만입니다. 손해 확정!
                    </p>
                  )}
                </div>

                {/* Result */}
                {/* D-grade reason row for single crawl */}
                {(() => {
                  if (!supPrice || !sellPrice) return null;
                  const rs = (() => { try { return calcSourcingScore({ supplierPrice: supPrice, salePrice: sellPrice, shippingFee: shipFee, naverFeeRate, inventory: sResult?.inventory, canMerge: sResult?.canMerge ?? undefined, sellerRank: sResult?.sellerRank, shipFee, optionCount: sResult?.options?.length }); } catch { return null; } })();
                  if (!rs || rs.grade !== 'D' || !rs.warnings?.length) return null;
                  return (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10, padding:'8px 10px', background:'#FFF0EF', border:'1px solid #fca5a5', borderRadius:10 }}>
                      <span style={{ fontSize:11, color:'#888', alignSelf:'center', marginRight:2 }}>D등급 이유:</span>
                      {rs.warnings.slice(0,2).map((w: string, i: number) => (
                        <span key={i} style={{ fontSize:11, fontWeight:600, padding:'2px 8px', background:'#fff', border:'1px solid #fca5a5', borderRadius:99, color:'#b91c1c' }}>
                          {w.length > 28 ? w.slice(0,28)+'…' : w}
                        </span>
                      ))}
                    </div>
                  );
                })()}
                {/* Sourcing score detail panel */}
                {(() => {
                  if (!supPrice || !sellPrice) return null;
                  try {
                    const sc = calcSourcingScore({ supplierPrice: supPrice, salePrice: sellPrice, shippingFee: shipFee, naverFeeRate, inventory: sResult?.inventory, canMerge: sResult?.canMerge ?? undefined, sellerRank: sResult?.sellerRank, shipFee, optionCount: sResult?.options?.length });
                    const gc: Record<string, { bg:string; text:string; border:string }> = { S:{bg:'#F3F0FE',text:'#6D28D9',border:'#C4B5FD'}, A:{bg:'#F0FDF4',text:'#15803d',border:'#86efac'}, B:{bg:'#EFF6FF',text:'#1d4ed8',border:'#93c5fd'}, C:{bg:'#FEFCE8',text:'#a16207',border:'#fde047'}, D:{bg:'#FFF0EF',text:'#b91c1c',border:'#fca5a5'} };
                    const g = gc[sc.grade];
                    const bar = (val: number, label: string) => (
                      <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
                        <span style={{ width:50, color:'#888', textAlign:'right', flexShrink:0 }}>{label}</span>
                        <div style={{ flex:1, height:6, background:'#F5F5F5', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ width:`${val}%`, height:'100%', background: val>=70?'#22c55e':val>=40?'#3b82f6':'#ef4444', borderRadius:99, transition:'width 0.3s' }} />
                        </div>
                        <span style={{ width:24, color:'#888', textAlign:'right', flexShrink:0 }}>{val}</span>
                      </div>
                    );
                    const bs = (type: 'good'|'warn'|'danger') => ({ good:{bg:'#f0fdf4',color:'#15803d',border:'#86efac'}, warn:{bg:'#fffbeb',color:'#92400e',border:'#fde68a'}, danger:{bg:'#fef2f2',color:'#b91c1c',border:'#fecaca'} }[type]);
                    return (
                      <div style={{ background:g.bg, border:`1px solid ${g.border}`, borderRadius:12, padding:'12px 14px', marginBottom:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                          <div style={{ width:38, height:38, borderRadius:'50%', background:'#fff', border:`2px solid ${g.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:16, color:g.text }}>{sc.grade}</div>
                          <div style={{ flex:1 }}>
                            <p style={{ fontSize:14, fontWeight:900, color:g.text, margin:'0 0 2px' }}>{sc.total}점 <span style={{ fontSize:11, fontWeight:500 }}>{sc.recommendation}</span></p>
                            <p style={{ fontSize:11, color:'#888', margin:0, fontStyle:'italic' }}>{sc.kkottiDialogue}</p>
                          </div>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:8 }}>
                          {bar(sc.marginScore, '마진')}
                          {bar(sc.sourcingScore, '소싱')}
                          {bar(sc.competitivenessScore, '경쟁력')}
                        </div>
                        {sc.badges.length > 0 && (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:6 }}>
                            {sc.badges.map((b, i) => { const s = bs(b.type); return (
                              <span key={i} style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:99, background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>{b.label}</span>
                            ); })}
                          </div>
                        )}
                        {sc.kkottiTip && <p style={{ fontSize:11, color:'#888', margin:0, paddingTop:4, borderTop:'1px solid rgba(0,0,0,0.06)' }}>{sc.kkottiTip}</p>}
                      </div>
                    );
                  } catch { return null; }
                })()}
                <div style={{ background:'#FFF0F5', borderRadius:12, padding:'12px 14px', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, textAlign:'center', marginBottom:14 }}>
                  {[
                    { label:'손익분기', value: sBreakeven > 0 ? `${sBreakeven.toLocaleString()}원` : '—', color:'#555' },
                    { label:`수수료${(naverFeeRate*100).toFixed(2)}%`, value:`${sCommission.toLocaleString()}원`, color:'#c2410c' },
                    { label:'순이익', value:`${(sellPrice - supPrice - shipFee - sCommission).toLocaleString()}원`, color: (sellPrice-supPrice-shipFee-sCommission)>=0?'#15803d':'#b91c1c' },
                    { label:'순마진율', value:`${sNetMargin.toFixed(1)}%`, color: sNetMargin>=20?'#15803d':sNetMargin>=10?'#c2410c':'#b91c1c' },
                  ].map(({ label, value, color }) => (
                    <div key={label}><p style={{ fontSize:10, color:'#888', margin:'0 0 3px' }}>{label}</p><p style={{ fontSize:14, fontWeight:900, color, margin:0 }}>{value}</p></div>
                  ))}
                </div>
                <Divider />
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={handleGoToRegister} disabled={sSaving||supPrice===0||sellPrice===0}
                    style={{ flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px 18px', background: sSaving||supPrice===0||sellPrice===0?'#F8DCE5':'#e62310', color: sSaving||supPrice===0||sellPrice===0?'#B0A0A8':'#fff', fontSize:14, fontWeight:900, borderRadius:12, border:'none', cursor: sSaving||supPrice===0||sellPrice===0?'not-allowed':'pointer' }}>
                    {sSaving?<><RefreshCw size={14} className="animate-spin"/>처리 중...</>:<><ArrowRight size={14}/>상품 등록으로 이동</>}
                  </button>
                  <button onClick={handleSaveOnly} disabled={sSaving||supPrice===0||sellPrice===0}
                    style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px 14px', background:'#fff', color:'#555', fontSize:13, fontWeight:600, borderRadius:12, border:'1.5px solid #F8DCE5', cursor: sSaving||supPrice===0||sellPrice===0?'not-allowed':'pointer' }}>
                    <Package size={13}/>보관함 담기
                  </button>
                </div>
              </div>
            )}

            {/* 빈 상태 */}
            {!sResult && !sLoading && (
              <div style={{ textAlign:'center', padding:'48px 20px', background:'#fff', borderRadius:18, border:'1.5px solid #F8DCE5' }}>
                <div style={{ width:56, height:56, background:'#FFF0F5', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                  <Search size={24} color="#FFB3CE" strokeWidth={2} />
                </div>
                <p style={{ fontSize:15, fontWeight:900, color:'#1A1A1A', marginBottom:4 }}>도매매 상품 URL을 입력하세요</p>
                <p style={{ fontSize:13, color:'#AAA', margin:0 }}>URL 붙여넣기 → 크롤링 → 상품 등록 자동 연결</p>
              </div>
            )}
          </div>
        )}

        {/* ════ 대량 탭 ════ */}
        {tab === 'bulk' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Margin preset buttons — replaces slider */}
            <div style={{ background:'#fff', border:'1.5px solid #F8DCE5', borderRadius:16, padding:'14px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <p style={{ fontSize:12, fontWeight:700, color:'#555', margin:0 }}>예상 마진율</p>
                <div style={{ display:'flex', gap:6, flex:1 }}>
                  {[10, 20, 30, 40].map(pct => (
                    <button key={pct} onClick={() => setBMarginRate(pct)}
                      style={{ flex:1, padding:'7px 0', borderRadius:8, fontSize:12, fontWeight:700, border: bMarginRate === pct ? '2px solid #e62310' : '1.5px solid #F8DCE5', background: bMarginRate === pct ? '#FFF0EF' : '#fff', color: bMarginRate === pct ? '#e62310' : '#888', cursor:'pointer' }}>
                      +{pct}%
                    </button>
                  ))}
                  <div style={{ display:'flex', alignItems:'center', gap:4, flex:1.2 }}>
                    <input type="number" min={1} max={200} value={bMarginRate}
                      onChange={e => setBMarginRate(Math.max(1, Number(e.target.value)))}
                      style={{ width:'100%', padding:'7px 8px', borderRadius:8, fontSize:12, fontWeight:700, color:'#e62310', background:'#FFF5F8', border:'1.5px solid #F8DCE5', outline:'none', textAlign:'center' }}
                    />
                    <span style={{ fontSize:11, color:'#888', whiteSpace:'nowrap' }}>%</span>
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <p style={{ fontSize:11, color:'#aaa', margin:0 }}>
                  도매가 10,000원 → 판매가 <strong style={{ color:'#e62310' }}>{bulkSalePrice(10000).toLocaleString()}원</strong>
                </p>
                <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#888', cursor:'pointer', whiteSpace:'nowrap' }}>
                  <input type="checkbox" checked={bAutoRound} onChange={e => setBAutoRound(e.target.checked)}
                    style={{ width:13, height:13, accentColor:'#e62310' }} />
                  자동 단수조정
                </label>
              </div>
            </div>

            {/* 에러 배너 */}
            {bError && (
              <div style={{ padding:'10px 14px', background:'#FFF0EF', border:'1.5px solid #fca5a5', borderRadius:12, fontSize:13, color:'#b91c1c', display:'flex', alignItems:'center', gap:8 }}>
                <AlertCircle size={14}/>{bError}
                <button onClick={() => setBError('')} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#b91c1c' }}><X size={13}/></button>
              </div>
            )}

            {/* 액션 결과 배너 */}
            {bActionResult && (
              <div style={{ padding:'10px 14px', background: bActionResult.ok?'#F0FDF4':'#FFF0EF', border:`1.5px solid ${bActionResult.ok?'#86efac':'#fca5a5'}`, borderRadius:12, fontSize:13, color: bActionResult.ok?'#15803d':'#b91c1c', display:'flex', alignItems:'center', gap:8 }}>
                {bActionResult.ok?<CheckCircle size={14}/>:<AlertCircle size={14}/>}
                {bActionResult.message}
                <button onClick={() => setBActionResult(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer' }}><X size={13}/></button>
              </div>
            )}

            {/* Step 1: URL 입력 */}
            {bStep === 'input' && (
              <div style={{ background:'#fff', border:'1.5px solid #F8DCE5', borderRadius:18, padding:'22px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <span style={{ width:22, height:22, background:'#e62310', borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#fff', flexShrink:0 }}>1</span>
                  <span style={{ fontSize:14, fontWeight:700, color:'#1A1A1A' }}>URL 입력</span>
                  <span style={{ fontSize:12, color:'#888' }}>— 줄바꿈 구분, 최대 50개</span>
                </div>
                <textarea value={bUrlText} onChange={e => setBUrlText(e.target.value)}
                  placeholder={'https://domeme.domeggook.com/s/12345678\nhttps://domeme.domeggook.com/s/87654321'}
                  style={{ width:'100%', height:180, padding:'12px 14px', fontSize:13, lineHeight:1.7, background:'#FFF5F8', border:'1.5px solid #F8DCE5', borderRadius:12, color:'#1A1A1A', resize:'vertical', outline:'none', fontFamily:'monospace', boxSizing:'border-box' }}
                  onFocus={e => { e.currentTarget.style.borderColor='#FF6B8A'; }}
                  onBlur={e => { e.currentTarget.style.borderColor='#F8DCE5'; }}
                />
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8 }}>
                  <span style={{ fontSize:12, color: validBulkUrls.length>0?'#15803d':'#888' }}>
                    {validBulkUrls.length > 0 ? `${validBulkUrls.length}개 URL 감지됨` : '도매매 URL을 붙여넣으세요'}
                  </span>
                  {validBulkUrls.length > 50 && <span style={{ fontSize:12, color:'#c2410c', fontWeight:600 }}>초과분 무시됨</span>}
                </div>
                <button onClick={handleBulkCrawl} disabled={validBulkUrls.length===0}
                  style={{ marginTop:14, width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px 20px', background: validBulkUrls.length===0?'#F8DCE5':'#e62310', color: validBulkUrls.length===0?'#B0A0A8':'#fff', fontSize:14, fontWeight:900, borderRadius:14, border:'none', cursor: validBulkUrls.length===0?'not-allowed':'pointer' }}>
                  <Layers size={16}/>
                  {validBulkUrls.length > 0 ? `${Math.min(validBulkUrls.length,50)}개 크롤링 시작` : 'URL을 입력해주세요'}
                </button>
              </div>
            )}

            {/* Step 2: 실시간 진행 */}
            {bStep === 'running' && (
              <div style={{ background:'#fff', border:'1.5px solid #F8DCE5', borderRadius:18, padding:'32px 22px', textAlign:'center' }}>
                <div style={{ width:56, height:56, background:'#FFF0EF', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                  <RefreshCw size={28} color="#e62310" className="animate-spin" />
                </div>
                <p style={{ fontSize:17, fontWeight:900, color:'#1A1A1A', margin:'0 0 4px' }}>크롤링 중...</p>
                <p style={{ fontSize:12, color:'#888', margin:'0 0 20px' }}>5개씩 처리 중입니다</p>
                <div style={{ maxWidth:440, margin:'0 auto' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#888', marginBottom:5 }}>
                    <span>{bProgress.done} / {bProgress.total}</span>
                    <span>{bProgress.total > 0 ? Math.round((bProgress.done/bProgress.total)*100) : 0}%</span>
                  </div>
                  <div style={{ height:10, background:'#F8DCE5', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${bProgress.total>0?(bProgress.done/bProgress.total)*100:0}%`, background:'#e62310', borderRadius:99, transition:'width 0.4s ease' }} />
                  </div>
                  {/* 실시간 결과 피드 */}
                  <div style={{ marginTop:14, textAlign:'left', maxHeight:200, overflowY:'auto' }}>
                    {bRows.map((r,i) => (
                      <div key={r.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', borderBottom:'1px solid #F8DCE5', fontSize:12 }}>
                        <StatusBadge status={r.status} />
                        <span style={{ color:'#555', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {r.name || r.url}
                        </span>
                        {r.status === 'success' && r.supplierPrice ? (
                          <span style={{ color:'#e62310', fontWeight:700, flexShrink:0 }}>{r.supplierPrice.toLocaleString()}원</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: 결과 — 카드형 레이아웃 */}
            {bStep === 'results' && (
              <>
                {/* 요약 + 단일 액션 바 */}
                <div style={{ background:'#fff', border:'1.5px solid #F8DCE5', borderRadius:16, padding:'14px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    {/* 통계 */}
                    {[
                      { label:'전체', value:bRows.length, color:'#555' },
                      { label:'성공', value:bRows.filter(r=>r.status==='success').length, color:'#15803d' },
                      { label:'실패', value:bRows.filter(r=>r.status==='error').length, color:'#b91c1c' },
                    ].map(({label,value,color}) => (
                      <div key={label} style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                        <span style={{ fontSize:11, color:'#aaa' }}>{label}</span>
                        <span style={{ fontSize:20, fontWeight:900, color }}>{value}</span>
                      </div>
                    ))}
                    <div style={{ width:1, height:28, background:'#F8DCE5', margin:'0 4px' }}/>
                    {/* 전체선택 */}
                    <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, color:'#555' }}>
                      <input type="checkbox"
                        checked={selectedIds.size===bRows.filter(r=>r.status==='success'&&!r.excluded).length&&selectedIds.size>0}
                        onChange={toggleBAll}
                        style={{ width:14, height:14, accentColor:'#e62310', cursor:'pointer' }} />
                      <span>전체 선택</span>
                      {selectedIds.size > 0 && <span style={{ color:'#e62310', fontWeight:700 }}>({selectedIds.size}개)</span>}
                    </label>
                    <div style={{ flex:1 }}/>
                    {/* 꿀통순 정렬 */}
                    <button onClick={() => {
                      const calcM = (sup:number) => { const s=bulkSalePrice(sup); return s>0?((s-sup-3000-s*0.05733)/s):-1; };
                      setBRows(prev => [...prev].sort((a,b) => calcM(b.editedPrice??b.supplierPrice??0) - calcM(a.editedPrice??a.supplierPrice??0)));
                    }} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', background:'#FFF5F8', border:'1.5px solid #FFB3CE', borderRadius:10, fontSize:12, fontWeight:700, color:'#e62310', cursor:'pointer', whiteSpace:'nowrap' }}>
                      <TrendingUp size={12}/> 꿀통순 정렬
                    </button>
                    {/* 새 크롤링 */}
                    <button onClick={() => { setBStep('input'); setBRows([]); setBActionResult(null); setSelectedIds(new Set()); }}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', background:'#fff', color:'#888', border:'1.5px solid #F8DCE5', borderRadius:10, fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
                      <RefreshCw size={12}/> 새 크롤링
                    </button>
                  </div>
                </div>

                {/* 카드형 상품 목록 */}
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {bRows.map(r => {
                    const isSelected = selectedIds.has(r.id);
                    const saleP = bulkSalePrice(r.editedPrice??r.supplierPrice??0);
                    const inv = Number(r.inventory ?? 0);
                    // Net profit estimate (before Naver fee, rough: saleP - cost - shipFee)
                    const supCost = r.editedPrice ?? r.supplierPrice ?? 0;
                    const netProfit = saleP - supCost - (r.shipFee ?? 3000);
                    const isLoss = netProfit < 0 && supCost > 0;
                    // Honey score warnings for D-grade reason display
                    const hScore = supCost > 0 && saleP > 0
                      ? (() => { try { return (window as any).__calcHoneyForBulk?.(supCost, saleP, r.inventory, r.canMerge, r.sellerRank as number|undefined, r.shipFee); } catch { return null; } })()
                      : null;

                    if (r.status === 'error') return (
                      <div key={r.id} style={{ background:'#FFF8F8', border:'1.5px solid #fecaca', borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:10, opacity:0.7 }}>
                        <AlertCircle size={14} color="#b91c1c" style={{ flexShrink:0 }}/>
                        <span style={{ fontSize:12, color:'#b91c1c', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.error || r.url}</span>
                        <span style={{ fontSize:10, color:'#ccc', flexShrink:0 }}>{r.url.slice(-20)}</span>
                      </div>
                    );

                    return (
                      <div key={r.id} style={{
                        background: r.excluded ? '#F9F9F9' : isLoss ? '#FFF8F8' : isSelected ? '#FFFBFC' : '#fff',
                        border: isLoss ? '1.5px solid #fca5a5' : isSelected ? '1.5px solid #FFB3CE' : '1.5px solid #F8DCE5',
                        borderRadius:14, padding:'14px 16px',
                        opacity: r.excluded ? 0.5 : 1,
                        transition:'border-color 0.12s',
                      }}>
                        {/* Row 1: 체크 + 이미지 + 상품명 + 등록/제외 액션 */}
                        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                          {/* Checkbox */}
                          <input type="checkbox" checked={isSelected} disabled={r.excluded}
                            onChange={() => toggleBSelect(r.id)}
                            style={{ width:15, height:15, accentColor:'#e62310', cursor:'pointer', marginTop:2, flexShrink:0 }} />
                          {/* Thumbnail */}
                          <div style={{ width:56, height:56, borderRadius:10, overflow:'hidden', border:'1px solid #F8DCE5', background:'#F5F5F5', flexShrink:0 }}>
                            {r.images?.[0]
                              ? <img src={r.images[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><Layers size={18} color="#ddd"/></div>}
                          </div>
                          {/* Name + meta */}
                          <div style={{ flex:1, minWidth:0 }}>
                            {/* Editable name */}
                            <input type="text" value={r.editedName??r.name??''}
                              onChange={e => updateBRow(r.id,'editedName',e.target.value)}
                              style={{ width:'100%', fontSize:13, fontWeight:700, color:'#1A1A1A', border:'1px solid transparent', borderRadius:6, padding:'2px 4px', background:'transparent', outline:'none', marginBottom:4 }}
                              onFocus={e => { e.currentTarget.style.border='1px solid #FFB3CE'; e.currentTarget.style.background='#fff'; }}
                              onBlur={e => { e.currentTarget.style.border='1px solid transparent'; e.currentTarget.style.background='transparent'; }}
                            />
                            {/* Tags row: category + country */}
                            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                              {r.categoryName && (
                                <span style={{ fontSize:10, padding:'1px 7px', background:'#F8F5FF', border:'1px solid #DDD6FE', borderRadius:99, color:'#7C3AED' }}>{r.categoryName}</span>
                              )}
                              {r.canMerge !== undefined && (
                                <span style={{ fontSize:10, padding:'1px 7px', background: r.canMerge?'#F0FDF4':'#FFF5F8', border:`1px solid ${r.canMerge?'#86efac':'#F8DCE5'}`, borderRadius:99, color: r.canMerge?'#15803d':'#888' }}>
                                  {r.canMerge ? '묶음배송 O' : '묶음배송 X'}
                                </span>
                              )}
                              <span style={{ fontSize:10, color:'#ccc', padding:'1px 0' }}>{r.url.slice(r.url.lastIndexOf('/')+1)}</span>
                            </div>
                            {/* Loss warning tag */}
                            {isLoss && (
                              <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:5, padding:'3px 8px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:7, fontSize:11, fontWeight:700, color:'#b91c1c' }}>
                                <AlertCircle size={11}/> 손해 상품 — 판매가를 올리거나 제외하세요
                              </div>
                            )}
                          </div>
                          {/* Action buttons */}
                          {!r.excluded && (
                            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                              <button onClick={() => handleBulkToRegister(r)} title="상품등록으로 이동"
                                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'#FFF0EF', border:'1px solid #fca5a5', borderRadius:8, fontSize:11, fontWeight:700, color:'#e62310', cursor:'pointer', whiteSpace:'nowrap' }}>
                                <ArrowRight size={11}/> 등록
                              </button>
                              <button onClick={() => excludeRow(r.id)} title="목록에서 제외"
                                style={{ width:30, height:30, background:'#F5F5F5', border:'1px solid #e5e5e5', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                                <X size={12} color="#aaa"/>
                              </button>
                            </div>
                          )}
                          {r.excluded && (
                            <button onClick={() => setBRows(prev => prev.map(row => row.id===r.id?{...row,excluded:false}:row))}
                              style={{ padding:'5px 10px', background:'#fff', border:'1px solid #F8DCE5', borderRadius:8, fontSize:11, cursor:'pointer', color:'#888', whiteSpace:'nowrap', flexShrink:0 }}>
                              복원
                            </button>
                          )}
                        </div>

                        {/* Row 2: 가격 / 공급사 / 꿀통지수 */}
                        <div style={{ display:'flex', alignItems:'center', gap:0, marginTop:12, paddingTop:10, borderTop:'1px solid #F8DCE5' }}>
                          {/* 가격 패널 */}
                          <div style={{ flex:1, display:'flex', gap:16, alignItems:'center' }}>
                            <div>
                              <p style={{ fontSize:10, color:'#aaa', margin:'0 0 2px' }}>도매가</p>
                              <input type="number" value={r.editedPrice??r.supplierPrice??0}
                                onChange={e => updateBRow(r.id,'editedPrice',Number(e.target.value))}
                                style={{ width:90, fontSize:14, fontWeight:900, color:'#e62310', border:'none', borderBottom:'1.5px solid #FFB3CE', padding:'0 2px', background:'transparent', outline:'none' }}
                              />
                            </div>
                            <div style={{ color:'#ddd', fontSize:16, fontWeight:300 }}>/</div>
                            <div>
                              <p style={{ fontSize:10, color:'#aaa', margin:'0 0 2px' }}>예상 판매가 (+{bMarginRate}%)</p>
                              <p style={{ fontSize:14, fontWeight:900, color:'#15803d', margin:0 }}>{saleP.toLocaleString()}원</p>
                            </div>
                            <div style={{ color:'#ddd', fontSize:16, fontWeight:300 }}>/</div>
                            <div>
                              <p style={{ fontSize:10, color:'#aaa', margin:'0 0 2px' }}>예상 수익</p>
                              <p style={{ fontSize:13, fontWeight:700, color: (saleP-(r.editedPrice??r.supplierPrice??0)-3000)>0?'#15803d':'#b91c1c', margin:0 }}>
                                {(saleP - (r.editedPrice??r.supplierPrice??0) - 3000).toLocaleString()}원
                              </p>
                            </div>
                          </div>

                          {/* 공급사 패널 */}
                          <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, paddingRight:16, marginRight:16, borderRight:'1px solid #F8DCE5' }}>
                            {r.sellerNick
                              ? <span style={{ fontSize:11, fontWeight:700, color:'#0369A1', background:'#EFF8FF', border:'1px solid #BAE6FD', borderRadius:8, padding:'3px 10px', maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.sellerNick}</span>
                              : <span style={{ fontSize:11, color:'#ccc', fontStyle:'italic' }}>공급사 정보 없음</span>
                            }
                            <div style={{ display:'flex', gap:4 }}>
                              {r.inventory !== undefined && (
                                <span style={{ fontSize:10, padding:'2px 7px', background: inv<10?'#fef2f2':inv<30?'#fffbeb':'#f0fdf4', border:`1px solid ${inv<10?'#fecaca':inv<30?'#fde68a':'#86efac'}`, borderRadius:99, color: inv<10?'#b91c1c':inv<30?'#92400e':'#15803d', fontWeight:600 }}>
                                  재고 {inv.toLocaleString()}개
                                </span>
                              )}
                              {r.shipFee === 0 && (
                                <span style={{ fontSize:10, padding:'2px 7px', background:'#f0fdf4', border:'1px solid #86efac', borderRadius:99, color:'#15803d', fontWeight:600 }}>무료공급</span>
                              )}
                            </div>
                          </div>

                          {/* 꿀통지수 패널 */}
                          <div style={{ flexShrink:0, width:72, display:'flex', flexDirection:'column', alignItems:'center' }}>
                            <HoneyBadge
                              supplierPrice={r.editedPrice??r.supplierPrice??0}
                              salePrice={saleP}
                              inventory={r.inventory}
                              canMerge={r.canMerge}
                              sellerRank={r.sellerRank as number | undefined}
                              shipFee={r.shipFee}
                              optionCount={r.options?.length}
                            />
                          </div>
                        </div>
                        {/* D-grade reason row — show top 2 warnings */}
                        {(() => {
                          if (!supCost || !saleP) return null;
                          const rs = (() => { try { return calcSourcingScore({ supplierPrice: supCost, salePrice: saleP, shippingFee: r.shipFee ?? 3000, inventory: r.inventory, canMerge: r.canMerge, sellerRank: r.sellerRank as number|undefined, shipFee: r.shipFee, optionCount: r.options?.length }); } catch { return null; } })();
                          if (!rs || rs.grade !== 'D' || !rs.warnings?.length) return null;
                          return (
                            <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:8, paddingTop:8, borderTop:'1px solid #F8DCE5' }}>
                              <span style={{ fontSize:10, color:'#888', marginRight:2, alignSelf:'center' }}>D등급 이유:</span>
                              {rs.warnings.slice(0,2).map((w: string, i: number) => (
                                <span key={i} style={{ fontSize:10, fontWeight:600, padding:'2px 8px', background:'#FFF0EF', border:'1px solid #fca5a5', borderRadius:99, color:'#b91c1c' }}>
                                  {w.length > 30 ? w.slice(0,30) + '…' : w}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>

                {/* 하단 단일 CTA — 보관함 담기 1개만 */}
                {/* Loss items warning summary */}
                {(() => {
                  const lossItems = bRows.filter(r => selectedIds.has(r.id) && r.status === 'success' && !r.excluded).filter(r => {
                    const sp = bulkSalePrice(r.editedPrice??r.supplierPrice??0);
                    return (sp - (r.editedPrice??r.supplierPrice??0) - (r.shipFee??3000)) < 0;
                  });
                  if (lossItems.length === 0) return null;
                  return (
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:12, fontSize:12, color:'#b91c1c', fontWeight:600 }}>
                      <AlertCircle size={14}/>
                      선택된 {selectedIds.size}개 중 <strong>{lossItems.length}개</strong>가 손해 상품입니다. 제외하거나 판매가를 올리세요.
                    </div>
                  );
                })()}
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => {
                    const lossCount = bRows.filter(r => selectedIds.has(r.id) && r.status === 'success' && !r.excluded).filter(r => {
                      const sp = bulkSalePrice(r.editedPrice??r.supplierPrice??0);
                      return (sp - (r.editedPrice??r.supplierPrice??0) - (r.shipFee??3000)) < 0;
                    }).length;
                    if (lossCount > 0 && !window.confirm(`${lossCount}개 손해 상품이 포함되어 있습니다.\n보관함에 담으시겠습니까?`)) return;
                    handleBulkExcel();
                  }} disabled={selectedIds.size===0||excelLoading}
                    style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'14px 20px', background: selectedIds.size===0?'#F8DCE5':'#e62310', color: selectedIds.size===0?'#B0A0A8':'#fff', fontSize:15, fontWeight:900, borderRadius:14, border:'none', cursor: selectedIds.size===0?'not-allowed':'pointer', boxShadow: selectedIds.size>0?'0 2px 8px rgba(230,35,16,0.25)':'none' }}>
                    {excelLoading
                      ? <><RefreshCw size={15} className="animate-spin"/> 보관함 저장 중...</>
                      : <><Package size={15}/> 선택한 {selectedIds.size}개 보관함에 담기</>}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ╔════ 이력 탭 ════╗ */}
        {/* ════ 소싱 보관함 탭 ════ */}
        {tab === 'history' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Header + controls */}
            <div style={{ background:'#fff', border:'1.5px solid #F8DCE5', borderRadius:16, padding:'14px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:3, height:16, background:'#e62310', borderRadius:99 }} />
                  <span style={{ fontSize:13, fontWeight:900, color:'#e62310' }}>소싱 보관함</span>
                  <span style={{ fontSize:11, color:'#aaa' }}>(크롤링 저장 무한)</span>
                </div>
                {/* Status filter */}
                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  {([
                    ['all','전체'],
                    ['SOURCED','소싱완료'],
                    ['PENDING','등록대기'],
                    ['REGISTERED','등록완료'],
                    ['single','단건'],
                    ['bulk','대량'],
                  ] as [string,string][]).map(([k,l]) => (
                    <button key={k}
                      onClick={() => { setHistFilter(k as typeof histFilter); loadShelf(k as typeof histFilter, histSellerFilter); }}
                      style={{ padding:'4px 10px', borderRadius:99, fontSize:11, fontWeight:600,
                        border: histFilter===k ? '1.5px solid #e62310' : '1.5px solid #F8DCE5',
                        background: histFilter===k ? '#FFF0EF' : '#fff',
                        color: histFilter===k ? '#e62310' : '#888', cursor:'pointer' }}>
                      {l}
                    </button>
                  ))}
                </div>
                <div style={{ flex:1 }} />
                {/* Seller filter */}
                {Object.keys(sellerGroups).length > 0 && (
                  <select value={histSellerFilter}
                    onChange={e => { setHistSellerFilter(e.target.value); loadShelf(histFilter, e.target.value); }}
                    style={{ padding:'5px 10px', fontSize:12, borderRadius:8, border:'1.5px solid #F8DCE5', background:'#FFF5F8', color:'#555', outline:'none', cursor:'pointer' }}>
                    <option value="all">공급사 전체</option>
                    {Object.entries(sellerGroups).map(([id, nick]) => (
                      <option key={id} value={id}>{nick}</option>
                    ))}
                  </select>
                )}
                {/* Search */}
                <input value={histSearch} onChange={e => setHistSearch(e.target.value)}
                  placeholder="상품명 검색"
                  style={{ padding:'5px 10px', fontSize:12, background:'#FFF5F8', border:'1.5px solid #F8DCE5', borderRadius:8, outline:'none', color:'#555', minWidth:120 }} />
                {/* Refresh */}
                <button onClick={() => loadShelf()}
                  style={{ width:32, height:32, background:'transparent', border:'none', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <RefreshCw size={14} color="#e62310" />
                </button>
              </div>
            </div>

            {/* Stats row */}
            {!logsLoading && logs.length > 0 && (() => {
              const sourced     = logs.filter(l=>l.sourcing_status==='SOURCED').length;
              const pending     = logs.filter(l=>l.sourcing_status==='PENDING').length;
              const registered  = logs.filter(l=>l.sourcing_status==='REGISTERED').length;
              return (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                  {[
                    { label:'소싱완료', value:sourced,  color:'#0369A1', bg:'#EFF8FF', border:'#BAE6FD' },
                    { label:'등록대기', value:pending,  color:'#a16207', bg:'#fffbeb', border:'#fde68a' },
                    { label:'등록완료', value:registered, color:'#15803d', bg:'#F0FDF4', border:'#86efac' },
                  ].map(({ label, value, color, bg, border }) => (
                    <div key={label} style={{ background:bg, border:`1.5px solid ${border}`, borderRadius:14, padding:'12px 16px', textAlign:'center' }}>
                      <p style={{ fontSize:11, color:'#888', margin:'0 0 4px' }}>{label}</p>
                      <p style={{ fontSize:26, fontWeight:900, color, margin:0 }}>{value}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Bulk action bar */}
            {histSelected.size > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#FFF0EF', border:'1.5px solid #FFB3CE', borderRadius:12 }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#e62310' }}>{histSelected.size}개 선택됨</span>
                {batchResult && (
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
                    background: batchResult.errors > 0 ? '#fee2e2' : '#dcfce7',
                    color: batchResult.errors > 0 ? '#b91c1c' : '#15803d' }}>
                    {batchResult.created}개 등록완료 {batchResult.skipped > 0 ? `· ${batchResult.skipped}개 건너뜀` : ''} {batchResult.errors > 0 ? `· 오류 ${batchResult.errors}` : ''}
                  </span>
                )}
                <div style={{ flex:1 }} />
                <button onClick={() => {
                  Array.from(histSelected).forEach(id => updateSourcingStatus(id, 'PENDING'));
                }} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, fontSize:12, fontWeight:700, color:'#92400e', cursor:'pointer' }}>
                  <Clock size={12}/> 등록 대기로
                </button>
                {/* Batch DRAFT register — directly creates DRAFT products without going to seed page */}
                <button
                  disabled={batchLoading}
                  onClick={async () => {
                    if (histSelected.size > 20) { alert('최대 20개까지 일괄 등록 가능합니다.'); return; }
                    setBatchLoading(true); setBatchResult(null);
                    try {
                      const res = await fetch('/api/crawl/batch-register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: Array.from(histSelected), markupRate: 1.3 }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setBatchResult({ created: data.created, skipped: data.skipped, errors: data.errors });
                        // Refresh logs to show REGISTERED status
                        setHistSelected(new Set());
                        // Re-fetch logs
                        const r2 = await fetch('/api/crawl/logs');
                        if (r2.ok) { const d2 = await r2.json(); setLogs(d2.logs ?? d2.data ?? []); }
                      } else {
                        alert('등록 실패: ' + (data.error || '알 수 없는 오류'));
                      }
                    } catch { alert('네트워크 오류'); }
                    finally { setBatchLoading(false); }
                  }}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px',
                    background: batchLoading ? '#9ca3af' : '#7c3aed',
                    border:'none', borderRadius:8, fontSize:12, fontWeight:700, color:'#fff',
                    cursor: batchLoading ? 'not-allowed' : 'pointer' }}>
                  {batchLoading
                    ? <><RefreshCw size={11} className="animate-spin"/>등록 중...</>
                    : <><Package size={11}/>한 번에 임시등록</>}
                </button>
                <button onClick={() => {
                  const san = (s: string) => (s||'').replace(/[\x00-\x1F\x7F]/g,' ').replace(/"/g,"'").trim();
                  const first = logs.find(l => histSelected.has(l.id) && l.sourcing_status !== 'error');
                  if (!first) return;
                  const imgs = Array.isArray(first.images) ? first.images : [];
                  const opts = Array.isArray(first.options) ? first.options : [];
                  const prefill = {
                    productName: san(first.name||''),
                    supplierPrice: first.supplier_price,
                    salePrice: Math.ceil(first.supplier_price * 1.3),
                    mainImage: (imgs[0] as string) || '',
                    additionalImgs: imgs.slice(1).join('|'),
                    options: opts.map((o: unknown) => san(typeof o === 'string' ? o : (o as {name:string}).name || '')).filter(Boolean),
                    crawlSellerId: first.seller_id,
                    crawlSellerNick: first.seller_nick,
                    crawlShipFee: first.ship_fee ?? 3000,
                    crawlCanMerge: first.can_merge,
                    crawlInventory: first.inventory,
                    crawlCategoryCode: first.category_code,
                    ...(first.category_name ? { catD1: first.category_name.split('>')[0]?.trim() } : {}),
                  };
                  const j = JSON.stringify(prefill);
                  const b2 = new TextEncoder().encode(j);
                  let bin = ''; b2.forEach((x:number) => { bin += String.fromCharCode(x); });
                  router.push(`/products/new?prefill=${btoa(bin)}&autoSeo=1`);
                }} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', background:'#e62310', border:'none', borderRadius:8, fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer' }}>
                  <ArrowRight size={12}/> 등록 시작
                </button>
              </div>
            )}

            {/* List */}
            {logsLoading ? (
              <div style={{ padding:'48px', textAlign:'center', background:'#fff', borderRadius:16, border:'1.5px solid #F8DCE5' }}>
                <RefreshCw size={24} className="animate-spin" color="#e62310" style={{ margin:'0 auto 10px', display:'block' }} />
                <p style={{ fontSize:13, color:'#888', margin:0 }}>소싱 보관함 불러오는 중...</p>
              </div>
            ) : (() => {
              const filtered = logs.filter(log => {
                if (histSearch && !((log.name||'') + log.url).toLowerCase().includes(histSearch.toLowerCase())) return false;
                return true;
              });

              if (filtered.length === 0) return (
                <div style={{ padding:'56px 20px', textAlign:'center', background:'#fff', borderRadius:16, border:'1.5px solid #F8DCE5' }}>
                  <Package size={32} color="#FFB3CE" style={{ margin:'0 auto 12px', display:'block' }} />
                  <p style={{ fontSize:15, fontWeight:700, color:'#1A1A1A', marginBottom:4 }}>
                    {logs.length === 0 ? '소싱 보관함이 비어 있습니다' : '검색 결과가 없습니다'}
                  </p>
                  <p style={{ fontSize:13, color:'#AAA', margin:0 }}>
                    {logs.length === 0 ? '단건/대량 크롤링 후 "보관함에 담기"를 누르면 이곳에 모입니다' : ''}
                  </p>
                </div>
              );

              const toggleSel = (id: string) => setHistSelected(prev => {
                const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
              });
              const allIds = filtered.filter(l=>l.sourcing_status!=='REGISTERED').map(l=>l.id);
              const allChecked = allIds.length > 0 && allIds.every(id => histSelected.has(id));

              // Status style helpers
              const statusStyle = (s: string) => ({
                SOURCED:    { bg:'#EFF8FF', color:'#0369A1', border:'#BAE6FD', label:'소싱완료' },
                PENDING:    { bg:'#fffbeb', color:'#92400e', border:'#fde68a', label:'등록대기' },
                REGISTERED: { bg:'#F0FDF4', color:'#15803d', border:'#86efac', label:'등록완료' },
              }[s] ?? { bg:'#F5F5F5', color:'#888', border:'#e5e5e5', label: s });

              return (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {/* Select all bar */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', background:'#FFF5F8', border:'1.5px solid #F8DCE5', borderRadius:10, fontSize:12, color:'#888' }}>
                    <input type="checkbox" checked={allChecked}
                      onChange={() => setHistSelected(allChecked ? new Set() : new Set(allIds))}
                      style={{ width:14, height:14, accentColor:'#e62310', cursor:'pointer' }} />
                    <span>전체 {filtered.length}개</span>
                    <span style={{ marginLeft:4, color:'#e62310', fontWeight:600 }}>({logs.filter(l=>l.sourcing_status==='SOURCED').length}개 소싱완료 / {logs.filter(l=>l.sourcing_status==='PENDING').length}개 등록대기)</span>
                  </div>

                  {filtered.map(log => {
                    const isSel = histSelected.has(log.id);
                    const isUpdating = shelfUpdating.has(log.id);
                    const ss = statusStyle(log.sourcing_status);
                    const inv = Number(log.inventory ?? 0);

                    return (
                      <div key={log.id} style={{
                        background: log.sourcing_status === 'REGISTERED' ? '#FAFFFE' : isSel ? '#FFFBFC' : '#fff',
                        border: isSel ? '1.5px solid #FFB3CE' : '1.5px solid #F8DCE5',
                        borderRadius:14, padding:'14px 16px',
                        opacity: log.sourcing_status === 'REGISTERED' ? 0.75 : 1,
                      }}>
                        {/* Row 1: checkbox + info + status + actions */}
                        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                          <input type="checkbox" checked={isSel}
                            disabled={log.sourcing_status === 'REGISTERED'}
                            onChange={() => toggleSel(log.id)}
                            style={{ width:14, height:14, accentColor:'#e62310', cursor:'pointer', marginTop:3, flexShrink:0 }} />

                          {/* Thumbnail */}
                          {(() => {
                            const imgs = Array.isArray(log.images) ? log.images : [];
                            const thumb = imgs[0] as string | undefined;
                            return thumb ? (
                              <div style={{ width:44, height:44, borderRadius:8, overflow:'hidden', flexShrink:0, border:'1px solid #F8DCE5' }}>
                                <img src={thumb} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                              </div>
                            ) : null;
                          })()}

                          {/* Product info */}
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:13, fontWeight:700, color:'#1A1A1A', margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {log.name || '상품명 없음'}
                            </p>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                              {log.category_name && (
                                <span style={{ fontSize:10, padding:'1px 7px', background:'#F8F5FF', border:'1px solid #DDD6FE', borderRadius:99, color:'#7C3AED' }}>{log.category_name}</span>
                              )}
                              {log.seller_nick && (
                                <span style={{ fontSize:10, padding:'1px 7px', background:'#EFF8FF', border:'1px solid #BAE6FD', borderRadius:99, color:'#0369A1' }}>{log.seller_nick}</span>
                              )}
                              {log.inventory !== null && (
                                <span style={{ fontSize:10, padding:'1px 7px', background: inv<10?'#fef2f2':inv<30?'#fffbeb':'#f0fdf4', border:`1px solid ${inv<10?'#fecaca':inv<30?'#fde68a':'#86efac'}`, borderRadius:99, color: inv<10?'#b91c1c':inv<30?'#92400e':'#15803d' }}>
                                  재고 {inv.toLocaleString()}개
                                </span>
                              )}
                              {(() => {
                                const opts = Array.isArray(log.options) ? log.options : [];
                                if (!opts.length) return null;
                                const oos = opts.filter((o: unknown) => typeof o === 'object' && o !== null && (o as {qty:number}).qty === 0).length;
                                return (
                                  <span style={{ fontSize:10, padding:'1px 7px', background: oos>0?'#fef2f2':'#FFF5F8', border:`1px solid ${oos>0?'#fecaca':'#F8DCE5'}`, borderRadius:99, color: oos>0?'#b91c1c':'#888' }}>
                                    옵션 {opts.length}개{oos > 0 ? ` (품절 ${oos})` : ''}
                                  </span>
                                );
                              })()}
                              {log.ship_fee !== null && log.ship_fee !== undefined && (
                                <span style={{ fontSize:10, padding:'1px 7px', background: log.ship_fee===0?'#f0fdf4':'#F5F5F5', border:`1px solid ${log.ship_fee===0?'#86efac':'#e5e5e5'}`, borderRadius:99, color: log.ship_fee===0?'#15803d':'#888' }}>
                                  {log.ship_fee === 0 ? '무료공급' : `배송 ${log.ship_fee.toLocaleString()}원`}
                                </span>
                              )}
                              {log.can_merge !== null && (
                                <span style={{ fontSize:10, padding:'1px 7px', background: log.can_merge?'#f0fdf4':'#FFF5F8', border:`1px solid ${log.can_merge?'#86efac':'#F8DCE5'}`, borderRadius:99, color: log.can_merge?'#15803d':'#888' }}>
                                  {log.can_merge ? '묶음배송 O' : '묶음배송 X'}
                                </span>
                              )}
                              <span style={{ fontSize:10, color:'#ccc', padding:'1px 0' }}>{log.source === 'bulk' ? '대량' : '단건'} | {new Date(log.crawled_at).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                            </div>
                          </div>

                          {/* Price */}
                          {log.supplier_price > 0 && (
                            <div style={{ textAlign:'right', flexShrink:0 }}>
                              <p style={{ fontSize:11, color:'#aaa', margin:'0 0 2px' }}>도매가</p>
                              <p style={{ fontSize:14, fontWeight:900, color:'#e62310', margin:0 }}>{log.supplier_price.toLocaleString()}원</p>
                            </div>
                          )}

                          {/* Sourcing status badge */}
                          <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, background:ss.bg, color:ss.color, border:`1px solid ${ss.border}`, flexShrink:0, whiteSpace:'nowrap' }}>
                            {ss.label}
                          </span>
                        </div>

                        {/* Row 2: action buttons */}
                        {log.sourcing_status !== 'REGISTERED' && (
                          <div style={{ display:'flex', gap:8, marginTop:10, paddingTop:10, borderTop:'1px solid #F8DCE5' }}>
                            {/* Go to register */}
                            <button disabled={isUpdating} onClick={() => {
                              updateSourcingStatus(log.id, 'PENDING');
                              const san = (s: string) => (s||'').replace(/[\x00-\x1F\x7F]/g,' ').replace(/"/g,"'").trim();
                              const logImgs = Array.isArray(log.images) ? log.images : [];
                              const logOpts = Array.isArray(log.options) ? log.options : [];
                              const prefill = {
                                productName: san(log.name||''),
                                supplierPrice: log.supplier_price,
                                salePrice: Math.ceil(log.supplier_price * 1.3),
                                mainImage: (logImgs[0] as string) || '',
                                additionalImgs: logImgs.slice(1).join('|'),
                                options: logOpts.map((o: unknown) => san(typeof o === 'string' ? o : (o as {name:string}).name || '')).filter(Boolean),
                                crawlSellerId: log.seller_id,
                                crawlSellerNick: log.seller_nick,
                                crawlShipFee: log.ship_fee ?? 3000,
                                crawlCanMerge: log.can_merge,
                                crawlInventory: log.inventory,
                                crawlCategoryCode: log.category_code,
                                ...(log.category_name ? { catD1: log.category_name.split('>')[0]?.trim() } : {}),
                              };
                              const j = JSON.stringify(prefill);
                              const b2 = new TextEncoder().encode(j);
                              let bin = ''; b2.forEach((x:number)=>{ bin += String.fromCharCode(x); });
                              router.push(`/products/new?prefill=${btoa(bin)}`);
                            }} style={{ flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px 14px', background:'#e62310', color:'#fff', border:'none', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                              {isUpdating ? <RefreshCw size={11} className="animate-spin"/> : <ArrowRight size={11}/>}
                              등록 시작
                            </button>

                            {/* Mark as registered manually */}
                            <button disabled={isUpdating} onClick={() => updateSourcingStatus(log.id, 'REGISTERED')}
                              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'8px 10px', background:'#F0FDF4', border:'1px solid #86efac', borderRadius:9, fontSize:11, fontWeight:600, color:'#15803d', cursor:'pointer' }}>
                              <CheckCircle size={11}/> 완료 표시
                            </button>

                            {/* View source */}
                            <a href={log.url} target="_blank" rel="noopener noreferrer"
                              style={{ width:34, height:34, background:'#F5F5F5', border:'1px solid #e5e5e5', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              <ExternalLink size={12} color="#888" />
                            </a>

                            {/* Delete */}
                            <button onClick={() => deleteFromShelf(log.id)}
                              style={{ width:34, height:34, background:'#FFF5F8', border:'1px solid #F8DCE5', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                              <X size={12} color="#e62310" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}
