'use client';
// /products — Garden Warehouse v6
// P2-1: supplier grouping, shipping badge, margin warning, bulk float menu, upload readiness filter

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Plus, RefreshCw, Search, Edit2,
  Trash2, X, Package, Palette,
  Check, AlertTriangle, Truck,
  ChevronDown, ChevronRight, ChevronLeft,
  Layers, Upload, ArrowRight,
  LayoutList, Send, Globe, Loader, Loader2,
  ShieldCheck, Eye, Link2, Store, Hash,
  CheckCircle2, PackageX, RotateCcw, ShieldAlert,
  Skull, Sprout, ArrowUpDown, MoreHorizontal,
} from 'lucide-react';
import { ExcelExportButton } from '@/components/naver/ExcelExportButton';
import { calcHoneyScore } from '@/lib/honey-score';
import { deriveOriginKind, type OriginKind } from '@/lib/products/origin-kind';
import NameDiagnosisBadge, { type NameBadgeData } from '@/components/products/NameDiagnosisBadge';
import TuningBadge, { type TuningBadgeData } from '@/components/products/TuningBadge';
import MarketAnalysisCard from '@/components/products/MarketAnalysisCard';
import InventoryBadge from '@/components/products/InventoryBadge';
import { StageBadge } from '@/components/products/StageBadge';
import { calcUploadReadiness, getReadinessColor } from '@/lib/upload-readiness';
import { useProductsList } from '@/lib/hooks/useDashboardData';
import { useInventoryBadges, type InventoryBadgeData } from '@/lib/hooks/useInventoryBadges';
import { kkottiZombieLine } from '@/lib/products/kkotti-zombie-voice';
import PanelTabs, { type PanelTabDef } from '@/components/ui/PanelTabs';
import NaverPushPanel from '@/components/products/NaverPushPanel';
import SubstituteEditor from '@/components/products/SubstituteEditor';
import { computeRevivalScore, type RevivalGrade } from '@/lib/products/revival-score';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  sku: string;
  status: string;
  salePrice: number;
  supplierPrice: number;
  shippingFee: number;
  margin?: number;
  naverCategoryCode?: string;
  naverProductId?: string;
  keywords?: string[];
  tags?: string[];
  mainImage?: string;
  images?: string[];
  aiScore?: number;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
  lastSaleDate?: string;
  supplierName?: string;
  supplierId?: string;
  platformName?: string;
  shippingTemplateId?: string;
  shippingTemplateName?: string;
  shippingType?: number | null; // 1=paid 2=free 3=conditional
  shipping_fee_type?: string;
  naverTemplateNo?: string | null;
  naver_status_type?: string | null;
  origin_kind?: string | null; // present only after Desktop applies the migration
  driftFields?: unknown;       // app↔Naver drift (drift-scan) — hub drift filter
  tuningScore?: TuningBadgeData | null; // 좀비 통합 판정 (#264, computeZombieVerdict) — server-computed, null if scoring degraded
}

type TabKey = 'all' | 'draft' | 'ready' | 'active' | 'pending' | 'oos' | 'reactivation' | 'revival' | 'lowMargin' | 'drift';
type ViewMode = 'list' | 'group';
type ScoredProduct = Product & {
  _hs: ReturnType<typeof calcHoneyScore>;
  _origin: OriginKind;   // hub source tag (#245)
};

// ─── Constants ────────────────────────────────────────────────────────────────

// 좀비 판정 (#264) — "좀비발견" 탭과 TuningBadge 배지가 서로 다른 기준으로
// 어긋나지 않도록, 둘 다 서버가 loadTuningScores()/computeZombieVerdict()로
// 계산해 넣어준 p.tuningScore.isZombie 하나만 본다(#261 폐기, 병행 기준 금지).
const isZombieProduct = (p: Product): boolean => p.tuningScore?.isZombie === true;

// Hub filter matrix (#245 §2-B). Low margin = net margin under the attention
// band (< 10%); drift = drift-scan found app↔Naver out-of-sync fields.
const netMarginOf = (p: Product): number =>
  calcHoneyScore({
    salePrice: p.salePrice, supplierPrice: p.supplierPrice,
    categoryId: p.naverCategoryCode ?? '', productName: p.name,
    keywords: p.keywords ?? [], tags: p.tags ?? [], hasMainImage: !!p.mainImage,
  }).netMarginRate;
const isLowMargin = (p: Product): boolean => netMarginOf(p) < 10;
const hasDrift = (p: Product): boolean => {
  const d = p.driftFields;
  if (!d) return false;
  if (Array.isArray(d)) return d.length > 0;
  if (typeof d === 'object') return Object.keys(d as Record<string, unknown>).length > 0;
  return false;
};

const TAB_CONFIG: Record<TabKey, {
  label: string; dot: string; dotLabel: string; filter: (p: Product) => boolean;
}> = {
  // SEED-SAVE C-4 (#62): segment order surfaces 작성중/발행대기 at the top. 'draft'
  // is now labelled 작성중 (the C-1 autosave model retired the "임시저장" wording),
  // and 'ready' (발행대기·green) is the new READY status the readiness-check promotes.
  // 작업 F-2 (#256 §1) — 꽃밭 돌보기 기본 뷰는 "발행/연동" 상품만(미발행=꿀통창고
  // 소관). 작성중(DRAFT)은 여기서 제외 — /crawl 또는 ?tab=draft로 진입(같은
  // 테이블 두 뷰). 라벨도 '전체'→'발행 전체'로 의미 명확화(#262).
  all:          { label: '발행 전체',      dot: 'bg-gray-400',   dotLabel: '',              filter: p => !!p.naverProductId },
  draft:        { label: '작성중',        dot: 'bg-gray-300',   dotLabel: '작성중',        filter: p => p.status === 'DRAFT' && !p.naverProductId },
  ready:        { label: '발행대기',      dot: 'bg-green-500',  dotLabel: '발행대기',      filter: p => p.status === 'READY' && !p.naverProductId },
  active:       { label: '판매중',        dot: 'bg-green-600',  dotLabel: '네이버 판매중', filter: p => p.status === 'ACTIVE' && !!p.naverProductId },
  pending:      { label: '네이버 등록 대기',     dot: 'bg-amber-400',  dotLabel: '네이버 등록 대기', filter: p => p.status === 'ACTIVE' && !p.naverProductId },
  // 작업 H-2 — 꽃밭 돌보기 전용 탭(oos/reactivation/lowMargin/drift)은 뷰 스코프를
  // naverProductId로 강제해 정원 창고 상품이 새어 들어오지 않게 한다.
  oos:          { label: '품절',          dot: 'bg-[#F63B28]',  dotLabel: '품절',          filter: p => p.status === 'OUT_OF_STOCK' && !!p.naverProductId },
  reactivation: { label: '판매중지',      dot: 'bg-orange-400', dotLabel: '재활성화',      filter: p => (p.status === 'INACTIVE' || p.status === 'HIDDEN') && !!p.naverProductId },
  revival:      { label: '좀비꽃 발견',   dot: 'bg-purple-500', dotLabel: '좀비꽃',        filter: p => isZombieProduct(p) && !!p.naverProductId },
  lowMargin:    { label: '마진 낮음',     dot: 'bg-rose-500',   dotLabel: '마진 낮음',     filter: p => isLowMargin(p) && !!p.naverProductId },
  drift:        { label: '동기화 필요',   dot: 'bg-yellow-500', dotLabel: '동기화 필요',   filter: p => hasDrift(p) && !!p.naverProductId },
};

// 정원창고 필터 밀도 완화(2026-07-13 P1·PRODUCT_IA_REDESIGN_V2) — 10개 버튼을
// 판매중/판매중지/좀비발견 3개 상시탭 + 나머지는 "더보기" 드롭다운으로 이동.
const PRIMARY_TAB_KEYS: TabKey[] = ['active', 'reactivation', 'revival'];
const MORE_TAB_KEYS: TabKey[] = (Object.keys(TAB_CONFIG) as TabKey[]).filter(
  k => !PRIMARY_TAB_KEYS.includes(k),
);

// SEED-SAVE C-4 — status segments for the default warehouse view. Order makes the
// authoring lifecycle legible: 작성중 → 발행대기 → 발행됨 → 품절 → 재활성화. 발행됨
// folds both ACTIVE variants (with/without naverProductId). A product lives in
// exactly one segment, so DRAFT/READY are surfaced as their own top sections
// instead of being buried as a gray dot in a flat list.
const STATUS_SEGMENTS: { key: TabKey; label: string; dot: string; match: (p: Product) => boolean }[] = [
  { key: 'draft',        label: '작성중',        dot: 'bg-gray-300',   match: p => p.status === 'DRAFT' },
  { key: 'ready',        label: '발행대기',      dot: 'bg-green-500',  match: p => p.status === 'READY' },
  { key: 'active',       label: '발행됨',        dot: 'bg-green-600',  match: p => p.status === 'ACTIVE' },
  { key: 'oos',          label: '품절',          dot: 'bg-[#F63B28]',  match: p => p.status === 'OUT_OF_STOCK' },
  { key: 'reactivation', label: '재활성화 필요', dot: 'bg-orange-400', match: p => p.status === 'INACTIVE' || p.status === 'HIDDEN' },
];

// Check readiness for Naver upload
function getReadinessIssues(p: Product): string[] {
  const issues: string[] = [];
  if (!p.naverCategoryCode || p.naverCategoryCode === '50003307') issues.push('카테고리 미설정');
  if (!p.shippingTemplateId) issues.push('배송 템플릿 없음');
  if (!p.mainImage) issues.push('대표 이미지 없음');
  return issues;
}

// Shipping display info
function getShippingInfo(p: Product): { label: string; color: string; icon: 'free' | 'paid' | 'cond' } {
  const t = p.shippingType;
  if (t === 2) return { label: '무료', color: '#16a34a', icon: 'free' };
  if (t === 3) return {
    label: p.shippingFee > 0 ? `조건부(${(p.shippingFee / 1000).toFixed(0)}K)` : '조건부무료',
    color: '#d97706', icon: 'cond',
  };
  return {
    label: p.shippingFee > 0 ? `유료 ${p.shippingFee.toLocaleString()}원` : '유료',
    color: p.shippingFee >= 5000 ? '#F63B28' : '#555',
    icon: 'paid',
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HoneyBadge({ score, grade }: { score: number; grade: string }) {
  const color: Record<string, string> = {
    S: 'bg-purple-100 text-purple-700', A: 'bg-green-100 text-green-700',
    B: 'bg-blue-100 text-blue-700',     C: 'bg-yellow-100 text-yellow-700',
    D: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-lg shrink-0 ${color[grade] ?? color.D}`}>
      {score}<span className="opacity-60">{grade}</span>
    </span>
  );
}

// SEED-SAVE C-3 Step 5: 창고 status now uses the shared StageBadge so it matches
// 꿀통/대시보드 exactly. A warehouse row is always a real Product (linked).
function StatusDot({ product }: { product: Product }) {
  return (
    <div className="flex items-center shrink-0">
      <StageBadge linked productStatus={product.status} naverProductId={product.naverProductId} size="sm" />
    </div>
  );
}

// Hub status axis (#245/#244) — source tag + Naver registration status (#240) +
// revival-candidate grade, in one compact badge row on each product.
const ORIGIN_BADGE: Record<OriginKind, { t: string; bg: string; fg: string; bd: string }> = {
  IMPORTED:    { t: '연동',   bg: '#EFF6FF', fg: '#1d4ed8', bd: '#bfdbfe' },
  APP_CREATED: { t: '앱생성', bg: '#F0FDF4', fg: '#15803d', bd: '#bbf7d0' },
  HYBRID:      { t: '혼합',   bg: '#FAF5FF', fg: '#7e22ce', bd: '#e9d5ff' },
};
const NAVER_STATUS_KO: Record<string, string> = {
  SALE: '판매중', ON_SALE: '판매중', SUSPENSION: '판매중지', OUTOFSTOCK: '품절',
  CLOSE: '판매종료', PROHIBITION: '판매금지', DELETION: '삭제',
};
function chip(text: string, fg: string, bg: string, bd: string, key: string) {
  return (
    <span key={key} style={{
      display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 700,
      color: fg, background: bg, border: `1px solid ${bd}`, borderRadius: 6, padding: '1px 6px', whiteSpace: 'nowrap',
    }}>{text}</span>
  );
}
function HubBadges({ p, rd }: { p: ScoredProduct; rd?: { ready: boolean; passed: number; total: number } }) {
  const o = ORIGIN_BADGE[p._origin];
  const registered = !!p.naverProductId;
  const st = p.naver_status_type ?? null;
  const live = st === 'SALE' || st === 'ON_SALE';
  // Registration status: 미등록 (gray) / 판매중 (green) / 판매중지·품절 등 (coral).
  const regChip = !registered
    ? { t: '미등록', fg: '#6B7280', bg: '#F9FAFB', bd: '#E5E7EB' }
    : live
      ? { t: NAVER_STATUS_KO[st!] ?? '판매중', fg: '#15803d', bg: '#F0FDF4', bd: '#bbf7d0' }
      : { t: st ? (NAVER_STATUS_KO[st] ?? st) : '등록됨', fg: '#b91c1c', bg: '#FEF2F2', bd: '#fecaca' };
  // 발행준비 X/8 — green when the gate passes (ready), amber while items remain.
  const readyChip = rd
    ? rd.ready
      ? { t: `발행 ${rd.passed}/${rd.total}`, fg: '#15803d', bg: '#F0FDF4', bd: '#bbf7d0' }
      : { t: `발행 ${rd.passed}/${rd.total}`, fg: '#b45309', bg: '#FFFBEB', bd: '#fde68a' }
    : null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 3 }}>
      {chip(o.t, o.fg, o.bg, o.bd, 'origin')}
      {chip(regChip.t, regChip.fg, regChip.bg, regChip.bd, 'reg')}
      {readyChip && chip(readyChip.t, readyChip.fg, readyChip.bg, readyChip.bd, 'ready')}
      {/* #264 — "부활 {grade}" 병렬 배지는 제거. 좀비 판정은 TuningBadge 하나로만 노출. */}
    </div>
  );
}

function ShippingBadge({ product }: { product: Product }) {
  if (!product.shippingTemplateId) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-lg"
        style={{ background: '#FFF0F5', color: '#F63B28', border: '1px solid #FFB3CE' }}>
        <Truck size={10} />
        <span className="font-semibold">미설정</span>
      </span>
    );
  }
  // Template connected but naverTemplateNo missing — Excel will have blank delivery template
  const noNaverNo = !!product.shippingTemplateId && !product.naverTemplateNo;
  const { label, color, icon } = getShippingInfo(product);
  const bg     = icon === 'free' ? '#f0fdf4' : icon === 'cond' ? '#fffbeb' : '#f9fafb';
  const border = icon === 'free' ? '#bbf7d0' : icon === 'cond' ? '#fde68a' : '#e5e7eb';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-lg font-medium"
        style={{ background: bg, color, border: `1px solid ${border}` }}>
        <Truck size={10} />
        {label}
      </span>
      {noNaverNo && (
        <span style={{ fontSize: 9, color: '#d97706', fontWeight: 700, paddingLeft: 2 }}>
          네이버 번호 미입력
        </span>
      )}
    </div>
  );
}

function MarginCell({ hs }: { hs: ReturnType<typeof calcHoneyScore> }) {
  const net = hs.netMarginRate;
  const danger = net < 5;
  return (
    <div className={`text-right text-xs font-bold ${danger ? 'text-red-600' : 'text-gray-700'}`}>
      {danger && <AlertTriangle size={10} className="inline mr-0.5 mb-0.5" />}
      {net.toFixed(1)}%
    </div>
  );
}

// ─── Side Panel ───────────────────────────────────────────────────────────────

const won = (n: number) => `${(n ?? 0).toLocaleString('ko-KR')}원`;

// 작업 F — 연동 diff / 상태 반영 미리보기 데이터 shape (구 /products/link
// DiffPanel과 동일 API 재사용, 신규 엔드포인트 0). 흡수 탭(동기화/반영)에서만 사용.
interface SyncDiffData { inSync: boolean; diffs: Array<{ field: string; naver: unknown; app: unknown }>; naverSnapshot: Record<string, unknown>; app: Record<string, unknown>; }
interface StatusPushPreview { target: 'OUTOFSTOCK' | 'SALE'; previousStatusType: string | null; isOptionProduct: boolean; changedTopLevelFields: string[]; optionStockZeroed: number; stockQuantityChanged: boolean; preservedFieldCount: number; }
const SYNC_FIELDS: Array<{ key: string; label: string; sor: 'naver' | 'app' }> = [
  { key: 'name', label: '상품명', sor: 'app' },
  { key: 'salePrice', label: '판매가', sor: 'app' },
  { key: 'stockQuantity', label: '재고', sor: 'naver' },
  { key: 'statusType', label: '상태', sor: 'naver' },
  { key: 'representativeImageUrl', label: '대표이미지', sor: 'app' },
];
const fmtSyncVal = (k: string, v: unknown) =>
  v == null ? '—' : k === 'salePrice' ? won(Number(v)) : k === 'statusType' ? (NAVER_STATUS_KO[String(v)] ?? String(v)) : k === 'representativeImageUrl' ? '이미지' : String(v);

// ── 동기화 탭 — 구 link/page.tsx DiffPanel의 sync 섹션 이식(#256 흡수) ──────────
function SyncTab({ productId }: { productId: string }) {
  const [data, setData] = useState<SyncDiffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null); setData(null);
    fetch(`/api/products/${productId}/naver-sync`)
      .then((r) => r.json())
      .then((j) => { if (!alive) return; if (!j.success) throw new Error(j.error); setData(j); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : '비교 실패'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [productId]);
  if (loading) return <div className="text-center py-6" style={{ color: '#9ca3af' }}><Loader2 size={18} className="animate-spin mx-auto mb-1.5" /><p className="text-xs">비교 중...</p></div>;
  if (error) return <p className="text-sm" style={{ color: '#b91c1c' }}>{error}</p>;
  if (!data) return null;
  return (
    <>
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg mb-3 text-xs font-bold"
        style={{ background: data.inSync ? '#f0fdf4' : '#fffbeb', border: `1px solid ${data.inSync ? '#bbf7d0' : '#fde68a'}`, color: data.inSync ? '#15803d' : '#b45309' }}>
        {data.inSync ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
        {data.inSync ? '네이버와 동기화됨' : '차이가 있습니다'}
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-neutral)' }}>
        <div className="grid text-xs font-bold" style={{ gridTemplateColumns: '1.1fr 1fr 1fr', color: '#6b7280', background: '#faf8f3', borderBottom: '1px solid var(--border-neutral)' }}>
          <div className="px-2.5 py-2">필드</div><div className="px-2.5 py-2">네이버</div><div className="px-2.5 py-2">앱</div>
        </div>
        {SYNC_FIELDS.map((f) => {
          const nv = data.naverSnapshot[f.key];
          const av = data.app[f.key];
          const differ = f.key !== 'stockQuantity' && data.diffs.some((d) => d.field === f.key);
          return (
            <div key={f.key} className="grid text-xs" style={{ gridTemplateColumns: '1.1fr 1fr 1fr', borderBottom: '1px solid #f3f0ea', background: differ ? '#fffdf6' : '#fff' }}>
              <div className="px-2.5 py-2 font-semibold" style={{ color: '#374151' }}>
                {f.label}
                <span className="ml-1 text-[9px] font-extrabold" style={{ color: f.sor === 'naver' ? '#1d4ed8' : '#F63B28' }}>{f.sor === 'naver' ? 'N' : '앱'}</span>
              </div>
              <div className="px-2.5 py-2 truncate" style={{ color: '#111827' }}>{fmtSyncVal(f.key, nv)}</div>
              <div className="px-2.5 py-2 truncate" style={{ color: differ ? '#b45309' : '#111827', fontWeight: differ ? 700 : 400 }}>{f.key === 'stockQuantity' ? '—' : fmtSyncVal(f.key, av)}</div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] mt-2.5" style={{ color: '#6b7280' }}>재고는 네이버가 기준값이라 비교하지 않습니다.</p>
      <p className="text-[11px] mt-1" style={{ color: '#9ca3af' }}>읽기 전용 비교입니다 — 실제 반영은 [반영] 탭에서.</p>
    </>
  );
}

// ── 반영 탭 — 상태(품절/재판매) 미리보기 + 가격·재고 반영(NaverPushPanel, #46 GO-gated) ──
function PushTab({ productId, appSalePrice, currentNaverStatus }: { productId: string; appSalePrice: number; currentNaverStatus: string | null }) {
  const [preview, setPreview] = useState<StatusPushPreview | null>(null);
  const [busy, setBusy] = useState<'OUTOFSTOCK' | 'SALE' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function doPreview(target: 'OUTOFSTOCK' | 'SALE') {
    setBusy(target); setErr(null); setPreview(null);
    try {
      const r = await fetch(`/api/products/${productId}/naver-status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, dryRun: true }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? 'preview failed');
      setPreview(j as StatusPushPreview);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '미리보기 실패');
    } finally { setBusy(null); }
  }
  return (
    <div>
      <p className="text-xs font-extrabold mb-2" style={{ color: '#111827' }}>상태 반영</p>
      <div className="flex gap-2">
        <button onClick={() => void doPreview('OUTOFSTOCK')} disabled={busy !== null}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold rounded-lg px-3 py-1.5"
          style={{ color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', cursor: busy ? 'not-allowed' : 'pointer' }}>
          {busy === 'OUTOFSTOCK' ? <Loader2 size={13} className="animate-spin" /> : <PackageX size={13} />}품절 처리
        </button>
        <button onClick={() => void doPreview('SALE')} disabled={busy !== null}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold rounded-lg px-3 py-1.5"
          style={{ color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', cursor: busy ? 'not-allowed' : 'pointer' }}>
          {busy === 'SALE' ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}재판매
        </button>
      </div>
      {err && <p className="text-xs mt-2" style={{ color: '#b91c1c' }}>{err}</p>}
      {preview && (
        <div className="mt-2.5 rounded-xl overflow-hidden" style={{ border: '1px solid #bfdbfe' }}>
          <div className="px-3 py-1.5 text-[11px] font-extrabold" style={{ background: '#eff6ff', color: '#1d4ed8' }}>반영 미리보기 (dry-run)</div>
          <div className="p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: '#111827' }}>
              <span className="text-[11px] font-semibold" style={{ color: '#6b7280' }}>상태 변경</span>
              {NAVER_STATUS_KO[preview.previousStatusType ?? ''] ?? preview.previousStatusType ?? '—'}
              <ChevronRight size={13} style={{ color: '#9ca3af' }} />
              <span style={{ color: preview.target === 'SALE' ? '#15803d' : '#b45309' }}>{NAVER_STATUS_KO[preview.target] ?? preview.target}</span>
            </div>
            {preview.target === 'OUTOFSTOCK' && (
              <p className="text-xs" style={{ color: '#b45309' }}>
                {preview.isOptionProduct ? `옵션 재고 ${preview.optionStockZeroed}건이 0으로 설정됩니다.` : '재고가 0으로 설정됩니다.'}
              </p>
            )}
            <p className="text-[11px]" style={{ color: '#6b7280' }}>
              변경 필드: {preview.changedTopLevelFields.join(', ') || '—'} · 나머지 {preview.preservedFieldCount}개 필드 보존
            </p>
            <div className="flex items-start gap-1.5 mt-1 px-2.5 py-1.5 rounded-lg" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
              <ShieldAlert size={13} style={{ color: '#c2410c', flexShrink: 0, marginTop: 1 }} />
              <p className="text-[11px] leading-relaxed" style={{ color: '#9a3412' }}>실제 반영은 대표님 확인(GO) 후에만 실행됩니다.</p>
            </div>
          </div>
        </div>
      )}
      <div className="mt-4">
        <NaverPushPanel productId={productId} appSalePrice={appSalePrice} />
      </div>
    </div>
  );
}

function SidePanel({ product, inventory, onClose, onDelete, onMutate, onReset, onStockSync }: {
  product: ScoredProduct;
  inventory?: InventoryBadgeData;
  onClose: () => void;
  onDelete: (id: string) => void;
  onMutate: (id: string, patch: Partial<Product>) => Promise<boolean>;
  onReset: (id: string) => Promise<boolean>;
  onStockSync: () => Promise<string>;
}) {
  const { _hs: hs } = product;
  const issues = getReadinessIssues(product);
  const [mutating, setMutating] = useState(false);
  const [stockMsg, setStockMsg] = useState<string | null>(null);
  // R-2 (rev58 운영자 스크린샷) — 하단 액션 11개 과밀(#233) 교정용 더보기 메뉴.
  const [showMoreActions, setShowMoreActions] = useState(false);
  // 리셋 only for 연동(IMPORTED/HYBRID) — an APP_CREATED product has no origin.
  const canReset = product._origin === 'IMPORTED' || product._origin === 'HYBRID';
  // 작업 F — 네이버 연동 상품만 동기화/반영/품절대체 탭을 보여준다(#256 흡수).
  const isLinked = !!product.naverProductId;
  const appDriftCount = (() => {
    const d = product.driftFields;
    const arr = Array.isArray(d) ? d : [];
    const APP_SOR = new Set(['name', 'salePrice', 'representativeImageUrl']);
    return arr.filter((f) => APP_SOR.has(String(f))).length;
  })();
  const TABS: PanelTabDef[] = [
    { key: 'info', label: '정보', badge: null },
    ...(isLinked ? [
      { key: 'sync', label: '동기화', badge: appDriftCount > 0 ? { text: `${appDriftCount}필드`, tone: 'amber' as const } : null },
      { key: 'push', label: '반영', badge: appDriftCount > 0 ? { dot: true, tone: 'blue' as const } : null },
      { key: 'substitute', label: '품절대체', badge: null },
    ] : []),
  ];
  const [tab, setTab] = useState<'info' | 'sync' | 'push' | 'substitute'>('info');
  // Confirm-gated (#46) status mutation with optimistic update + rollback (handled
  // by onMutate). 부활소 이동 = INACTIVE (재활성화 대기열로).
  const STATUS_LABEL: Record<string, string> = {
    DRAFT: '작성중', READY: '발행대기', ACTIVE: '판매중',
    OUT_OF_STOCK: '품절', INACTIVE: '부활소(비활성)', HIDDEN: '숨김',
  };
  const changeStatus = async (next: string, confirmMsg: string) => {
    if (next === product.status) return;
    if (!window.confirm(confirmMsg)) return;
    setMutating(true);
    try {
      const ok = await onMutate(product.id, { status: next });
      if (ok) onClose(); // close so the list reflects the change (panel holds a snapshot)
    } finally { setMutating(false); }
  };
  // R-2 — 품절 처리/재판매는 [반영] 탭(naver-status)에 이미 있어 여기선 제거(중복).
  // 공급사 재고 동기화 — 기존 stock-check 재사용 (confirm 게이트).
  const stockSync = async () => {
    if (!window.confirm('공급사 재고를 동기화할까요? (공급사 URL이 등록된 상품의 품절/가격을 갱신)')) return;
    setMutating(true);
    try { setStockMsg(await onStockSync()); } finally { setMutating(false); }
  };
  // 리셋 — 앱에서 손본 내용을 연동 원본으로 되돌림 (비가역 · confirm 게이트).
  const resetToOrigin = async () => {
    if (!canReset) return;
    if (!window.confirm(
      '리셋하면 상품명·이미지·가격이 공급사/네이버 원본으로 되돌아갑니다.\n' +
      '⚠ 수동으로 정정한 내용(SEO 상품명·가격 등)이 유실될 수 있습니다.\n' +
      '(원산지 등 검증 필드는 보존됩니다.)\n\n비가역입니다. 진행할까요?'
    )) return;
    setMutating(true);
    try {
      const ok = await onReset(product.id);
      if (ok) onClose();
    } finally { setMutating(false); }
  };
  return (
    <div className="fixed inset-y-0 right-0 w-[min(720px,50vw)] min-w-[420px] bg-white shadow-2xl z-50 flex flex-col"
      style={{ borderLeft: '1.5px solid #F8DCE5' }}>
      {/* 작업 F 보강1 — 헤더에 썸네일+상품명+상태를 노출(구 헤더는 상태점만 있어
          이름조차 스크롤해야 보였음). 프리미엄 SaaS 패턴(#212 zone3 미러). */}
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: '1.5px solid #F8DCE5' }}>
        {product.mainImage
          ? <img src={product.mainImage} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
          : <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: '#f3f4f6' }} />}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-extrabold truncate" style={{ color: '#111827' }}>{product.name}</p>
          <div className="mt-0.5"><StatusDot product={product} /></div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-pink-50 rounded-lg transition flex-shrink-0">
          <X size={16} style={{ color: '#9CA3AF' }} />
        </button>
      </div>

      <PanelTabs tabs={TABS} active={tab} onChange={(k) => setTab(k as typeof tab)} ariaLabel="상품 상세 탭" />

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {tab === 'info' && (
          <>
            {/* 작업 F-3 (PANEL_REDESIGN_SPEC_2026-07-17) — 섹션 순서 = 셀러 작업
                순서(급한 순). R4: 좀비사유+지금할일+핵심지표는 스크롤 없이 보여야
                함 → 최상단 3개 배치. R3: 라벨 통일(11px·600·#9CA3AF·uppercase 금지). */}

            {/* 1. 좀비 사유 (#264) — 라벨 없음, 카드 자체가 신호. 좀비 아니면 조용히. */}
            {product.tuningScore?.isZombie && (
              <div className="rounded-2xl p-3.5" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Skull size={13} style={{ color: '#b91c1c' }} />
                  <span className="text-xs font-extrabold" style={{ color: '#b91c1c' }}>좀비꽃 발견</span>
                </div>
                {product.tuningScore.reasons.length > 0 && (
                  <ul className="pl-4 mb-2 text-xs leading-relaxed" style={{ color: '#7f1d1d' }}>
                    {product.tuningScore.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                )}
                <p className="px-2 py-1.5 rounded-md text-xs leading-relaxed" style={{ background: '#fff1f2', color: '#9f1239' }}>
                  {kkottiZombieLine(product.tuningScore.zombieReason)}
                </p>
              </div>
            )}

            {/* 2. 지금 할 일 — R1: 미흡 항목 있을 때만 렌더(빈 "완료" 카드도 소음). */}
            {issues.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: '#FFF0F5', border: '1px solid #F8DCE5' }}>
                <p className="text-[11px] font-semibold mb-2" style={{ color: '#9CA3AF' }}>지금 할 일</p>
                {issues.map((issue, i) => (
                  <p key={i} className="text-xs text-red-500 flex items-center gap-1.5 mt-1 first:mt-0">
                    <AlertTriangle size={10} /> {issue}
                  </p>
                ))}
              </div>
            )}

            {/* 3. 한눈에 보기 — R2: 꿀통지수·SEO만(순마진은 4.가격 섹션에서 1회만). */}
            <div className="rounded-2xl p-4" style={{ background: '#FFF0F5', border: '1px solid #F8DCE5' }}>
              <p className="text-[11px] font-semibold mb-2" style={{ color: '#9CA3AF' }}>한눈에 보기</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: '#555' }}>꿀통지수</span>
                <HoneyBadge score={hs.total} grade={hs.grade} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#888' }}>SEO 검색최적화</span>
                <span className="text-xs font-bold text-gray-800">{hs.seoScore}점</span>
              </div>
            </div>

            {/* 4. 가격 — 마진 수치의 유일한 출처(중복 제거, R2). 순마진율 행이
                구 하단바 "마진 재계산(읽기)"을 흡수(R-2, 맥락 일치). */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold" style={{ color: '#9CA3AF' }}>가격</p>
              {([
                ['도매가 (공급가)', `${product.supplierPrice.toLocaleString()}원`, false],
                ['판매가', `${product.salePrice.toLocaleString()}원`, false],
                ['마진율', `${hs.marginRate.toFixed(1)}%`, false],
                ['순마진율', `${hs.netMarginRate.toFixed(1)}%`, hs.netMarginRate < 5],
              ] as [string, string, boolean][]).map(([k, v, danger]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span style={{ color: '#888' }}>{k}</span>
                  <span className={`font-semibold ${danger ? 'text-red-600' : 'text-gray-800'}`}>{v}</span>
                </div>
              ))}
            </div>

            {/* 5. 재고 · 배송 — 고아 텍스트였던 공급사명을 소속 섹션으로 편입(R3). */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold" style={{ color: '#9CA3AF' }}>재고 · 배송</p>
              {product.supplierName && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#888' }}>공급사</span>
                  <span className="text-xs font-semibold" style={{ color: '#555' }}>{product.supplierName}</span>
                </div>
              )}
              {inventory && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#888' }}>재고</span>
                  <InventoryBadge inv={inventory} />
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#888' }}>배송</span>
                <ShippingBadge product={product} />
              </div>
              {product.shippingTemplateName && (
                <p className="text-xs font-mono text-right" style={{ color: '#B0A0A8' }}>{product.shippingTemplateName}</p>
              )}
            </div>

            {/* 6. 네이버 정보 — 연동 상품만(#256 §5 미러). */}
            {isLinked && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold" style={{ color: '#9CA3AF' }}>네이버 정보</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#888' }}>상품번호</span>
                  <span className="text-xs font-mono" style={{ color: '#555' }}>{product.naverProductId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#888' }}>상태</span>
                  <span className="text-xs font-semibold" style={{ color: '#555' }}>
                    {NAVER_STATUS_KO[product.naver_status_type ?? ''] ?? product.naver_status_type ?? '—'}
                  </span>
                </div>
              </div>
            )}

            {/* 7. 상품 정보 — 항상 노출되는 기본 메타(라벨 5개 이상 확보용 겸용, R3). */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold" style={{ color: '#9CA3AF' }}>상품 정보</p>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#888' }}>상품코드</span>
                <span className="text-xs font-mono" style={{ color: '#555' }}>{product.sku}</span>
              </div>
              {product.createdAt && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#888' }}>등록일</span>
                  <span className="text-xs" style={{ color: '#555' }}>{product.createdAt.slice(0, 10)}</span>
                </div>
              )}
            </div>

            {/* 8. 시장 분석 — 데이터 있을 때만(컴포넌트 자체 판단, R1). */}
            <MarketAnalysisCard productName={product.name} />

            {/* 9. 꼬띠 한마디 — 라벨 없음, 좀비 아닐 때만(1.과 중복 방지). */}
            {!product.tuningScore?.isZombie && (
              <div className="rounded-2xl px-4 py-3" style={{ background: '#FFF0F5', border: '1px solid #FFB3CE' }}>
                <p className="text-xs font-bold mb-1" style={{ color: '#F63B28' }}>꼬띠 한마디</p>
                <p className="text-xs leading-relaxed" style={{ color: '#FF6B8A' }}>{hs.kkottiDialogue}</p>
              </div>
            )}
          </>
        )}

        {tab === 'sync' && <SyncTab productId={product.id} />}
        {tab === 'push' && <PushTab productId={product.id} appSalePrice={product.salePrice} currentNaverStatus={product.naver_status_type ?? null} />}
        {tab === 'substitute' && (
          <SubstituteEditor productId={product.id} isOutOfStock={product.status === 'OUT_OF_STOCK'} />
        )}
      </div>
      <div className="p-4 flex flex-col gap-2" style={{ borderTop: '1.5px solid #F8DCE5' }}>
        {/* R-2 (rev58 운영자 스크린샷) — 하단 액션 11개 과밀(#233) 교정.
            이동 경로(꽃단장/발행준비/상세)는 자주 쓰는 화면전환이라 유지·
            "액션" 카운트에서 별도(#245 §2-C). */}
        <div className="grid grid-cols-3 gap-2">
          <Link href={`/studio?product=${product.id}`}
            className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition"
            style={{ color: '#7e22ce', background: '#FAF5FF', border: '1px solid #e9d5ff' }} title="온실 아틀리에에서 꽃단장">
            <Palette size={15} /> 꽃단장
          </Link>
          <Link href={`/products/${product.id}/preview`}
            className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition"
            style={{ color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0' }} title="발행 준비 · 미리보기">
            <ShieldCheck size={15} /> 발행 준비
          </Link>
          <Link href={`/products/${product.id}`}
            className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition"
            style={{ color: '#1d4ed8', background: '#EFF6FF', border: '1px solid #bfdbfe' }} title="상품 상세">
            <Eye size={15} /> 상세
          </Link>
        </div>
        {/* 상태 변경 (핵심 상태기계, #46 confirm 게이트) — DRAFT→READY→ACTIVE 등
            [반영] 탭이 다루지 않는 앱 전체 상태 전환. */}
        <select value={product.status} disabled={mutating} aria-label="상태 변경"
          onChange={e => changeStatus(e.target.value, `상태를 '${STATUS_LABEL[e.target.value] ?? e.target.value}'(으)로 변경할까요?`)}
          className="w-full py-2 px-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white disabled:opacity-50">
          {['DRAFT', 'READY', 'ACTIVE', 'OUT_OF_STOCK', 'INACTIVE', 'HIDDEN'].map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        {stockMsg && <p className="text-[11px] text-slate-500">{stockMsg}</p>}
        {/* 주 액션(상품 수정, 빨강·풀폭) + 더보기(2차 액션 4종 수렴).
            목표: 하단 액션 버튼 11개 → 3개 이하(상태select·상품수정·더보기). */}
        <div className="flex gap-2">
          <Link href={`/products/new?edit=${product.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl text-sm font-bold transition"
            style={{ background: '#F63B28' }}>
            <Edit2 size={14} /> 상품 수정
          </Link>
          <div className="relative">
            <button type="button" onClick={() => setShowMoreActions(v => !v)} aria-label="더보기"
              className="h-full px-3 py-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
              <MoreHorizontal size={16} />
            </button>
            {showMoreActions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreActions(false)} />
                <div className="absolute z-50 bottom-full right-0 mb-1.5" style={{
                  minWidth: 176, background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
                }}>
                  <button type="button" disabled={mutating} onClick={() => { setShowMoreActions(false); stockSync(); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left transition hover:bg-pink-50 disabled:opacity-40"
                    style={{ color: '#1d4ed8' }} title="공급사 재고 동기화 (stock-check)">
                    <RefreshCw size={13} /> 재고 동기화
                  </button>
                  <button type="button" disabled={mutating || product.status === 'INACTIVE'}
                    onClick={() => { setShowMoreActions(false); changeStatus('INACTIVE', '이 상품을 부활소로 이동할까요? 판매를 중단(비활성)하고 재활성화 대기열에 넣습니다.'); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left transition hover:bg-pink-50 disabled:opacity-40"
                    style={{ color: '#7e22ce' }}>
                    <RotateCcw size={13} /> 부활소 이동
                  </button>
                  <button type="button" disabled={mutating || !canReset}
                    onClick={() => { setShowMoreActions(false); resetToOrigin(); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left transition hover:bg-pink-50 disabled:opacity-40"
                    style={{ color: '#6b7280' }}
                    title={canReset ? '연동 원본으로 되돌림 (비가역)' : '앱생성 상품은 원본이 없어 리셋 불가'}>
                    <Sprout size={13} /> 리셋
                  </button>
                  <div style={{ borderTop: '1px solid #F3F4F6' }}>
                    <ExcelExportButton mode="batch" productIds={[product.id]} buttonText="엑셀 다운로드"
                      buttonClassName="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left text-gray-600 hover:bg-pink-50 transition" />
                  </div>
                  <button type="button" onClick={() => { setShowMoreActions(false); onDelete(product.id); onClose(); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left text-red-500 hover:bg-red-50 transition">
                    <Trash2 size={13} /> 삭제
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Naver Import Modal (구 /products/link Zone1, 작업 F 흡수) ────────────────
// 네이버 스토어에서 상품을 검색·선택하거나 상품번호로 직접 가져와 연동한다.
// /api/products/import 재사용, 신규 엔드포인트 0.

interface NaverSearchRow {
  channelProductNo: string | null;
  originProductNo: string | null;
  name: string;
  salePrice: number;
  stockQuantity: number;
  statusType: string;
  representativeImageUrl: string | null;
  modifiedDate: string | null;
  alreadyLinked: boolean;
}
type ImportPickerFilter = 'all' | 'revival' | 'outofstock' | 'suspension';
type ImportPickerSort = 'revival' | 'recent';

function importRowRevival(row: NaverSearchRow): { grade: RevivalGrade; score: number; isCandidate: boolean } {
  const r = computeRevivalScore({
    naverStatusType: row.statusType,
    appStatus: null,
    registered: true,
    name: row.name,
    imageCount: row.representativeImageUrl ? 1 : 0,
  });
  return { grade: r.grade, score: r.score, isCandidate: r.isCandidate };
}

const IMPORT_REVIVAL_TONE: Record<RevivalGrade, { bg: string; border: string; color: string }> = {
  S: { bg: '#fff0ef', border: '#ffd6d3', color: '#b91c1c' },
  A: { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c' },
  B: { bg: '#fffbeb', border: '#fde68a', color: '#b45309' },
  C: { bg: '#f3f4f6', border: '#e5e7eb', color: '#6b7280' },
};

function NaverImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<NaverSearchRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [filter, setFilter] = useState<ImportPickerFilter>('all');
  const [sort, setSort] = useState<ImportPickerSort>('revival');
  const [manual, setManual] = useState('');
  const [manualBusy, setManualBusy] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/naver/products/search?page=${p}&size=50&status=SALE,OUTOFSTOCK,SUSPENSION`);
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? 'load failed');
      setRows(j.items ?? []);
      setTotalPages(j.totalPages ?? 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
      setRows([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(page); }, [page, load]);

  const toggle = (no: string) => setSelected((s) => {
    const n = new Set(s);
    n.has(no) ? n.delete(no) : n.add(no);
    return n;
  });
  const rowNo = (row: NaverSearchRow) => row.originProductNo ?? row.channelProductNo ?? '';

  const visible = rows
    .filter((row) => {
      const st = (row.statusType ?? '').toUpperCase();
      if (filter === 'revival') return importRowRevival(row).isCandidate;
      if (filter === 'outofstock') return st === 'OUTOFSTOCK' || st === 'OUT_OF_STOCK';
      if (filter === 'suspension') return st === 'SUSPENSION' || st === 'INACTIVE' || st === 'CLOSE';
      return true;
    })
    .sort((a, b) => sort === 'revival'
      ? importRowRevival(b).score - importRowRevival(a).score
      : (b.modifiedDate ?? '').localeCompare(a.modifiedDate ?? ''));

  const selectableNos = visible.filter((r) => !r.alreadyLinked && rowNo(r)).map(rowNo);
  const allSelected = selectableNos.length > 0 && selectableNos.every((no) => selected.has(no));
  const toggleAll = () => setSelected((s) => {
    const n = new Set(s);
    if (allSelected) selectableNos.forEach((no) => n.delete(no));
    else selectableNos.forEach((no) => n.add(no));
    return n;
  });

  async function doImport(nos: string[]) {
    if (nos.length === 0) return;
    setImporting(true);
    try {
      const items = nos.map((no) => ({ originProductNo: no }));
      await fetch('/api/products/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
      onImported();
    } catch {
      setError('연동 중 오류가 발생했습니다.');
    } finally { setImporting(false); }
  }

  async function importManual() {
    const nums = manual.split(/[\s,\n]+/).map((s) => s.trim()).filter(Boolean);
    if (nums.length === 0 || manualBusy) return;
    setManualBusy(true);
    try {
      await doImport(nums);
      setManual('');
    } finally { setManualBusy(false); }
  }

  const FILTERS: Array<{ key: ImportPickerFilter; label: string }> = [
    { key: 'all', label: '전체' },
    { key: 'revival', label: '부활 후보' },
    { key: 'outofstock', label: '품절' },
    { key: 'suspension', label: '판매중지' },
  ];

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 780, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid #F8DCE5' }}>
          <Store size={18} style={{ color: '#F63B28' }} />
          <p style={{ margin: 0, flex: 1, fontSize: 15, fontWeight: 800, color: '#111827' }}>네이버 상품 가져오기</p>
          <button onClick={onClose} aria-label="닫기" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
        </div>

        {/* 상품번호 직접 입력 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderBottom: '1px solid #F8DCE5' }}>
          <Hash size={14} style={{ color: '#1d4ed8', flexShrink: 0 }} />
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="상품번호(콤마·줄바꿈 구분)로 바로 가져오기"
            onKeyDown={(e) => { if (e.key === 'Enter') void importManual(); }}
            style={{ flex: 1, minWidth: 0, fontSize: 13, padding: '7px 10px', border: '1px solid var(--border-neutral)', borderRadius: 8, outline: 'none' }} />
          <button onClick={() => void importManual()} disabled={manualBusy || !manual.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 800, color: '#fff', background: !manual.trim() ? '#9dbdf0' : '#1d4ed8', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: manualBusy || !manual.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
            {manualBusy ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}가져오기
          </button>
        </div>

        {/* filter + sort + select-all bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid #F8DCE5', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ fontSize: 12, fontWeight: 700, color: filter === f.key ? '#fff' : '#6b7280', background: filter === f.key ? '#F63B28' : '#f3f4f6', border: 'none', borderRadius: 99, padding: '4px 12px', cursor: 'pointer' }}>
                {f.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => setSort((s) => (s === 'revival' ? 'recent' : 'revival'))}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#374151', background: '#f9fafb', border: '1px solid var(--border-neutral)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>
            <ArrowUpDown size={12} />{sort === 'revival' ? '부활점수순' : '최신순'}
          </button>
          <button onClick={toggleAll} disabled={selectableNos.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: allSelected ? '#F63B28' : '#374151', background: '#f9fafb', border: '1px solid var(--border-neutral)', borderRadius: 8, padding: '5px 10px', cursor: selectableNos.length === 0 ? 'not-allowed' : 'pointer' }}>
            <Check size={12} />{allSelected ? '선택 해제' : '전체 선택'}
          </button>
        </div>

        {/* body — card grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', minHeight: 0 }}>
          {loading && <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}><Loader2 size={20} className="animate-spin" style={{ margin: '0 auto' }} /></div>}
          {error && <div style={{ color: '#b91c1c', fontSize: 13, padding: 12 }}>{error}</div>}
          {!loading && !error && visible.length === 0 && (
            <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af', fontSize: 13 }}>
              {filter === 'revival' ? '부활 후보가 없습니다.' : '표시할 상품이 없습니다.'}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
            {visible.map((row) => {
              const no = rowNo(row);
              const checked = selected.has(no);
              const rev = importRowRevival(row);
              const disabled = row.alreadyLinked || !no;
              return (
                <label key={no || row.name} style={{
                  position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, padding: 10, borderRadius: 12,
                  border: `1.5px solid ${checked ? '#F63B28' : '#f1f1f1'}`,
                  background: row.alreadyLinked ? '#fafafa' : checked ? '#fff5f6' : '#fff',
                  cursor: disabled ? 'not-allowed' : 'pointer', opacity: row.alreadyLinked ? 0.6 : 1,
                }}>
                  <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}>
                    <input type="checkbox" checked={checked} disabled={disabled} onChange={() => no && toggle(no)}
                      style={{ width: 18, height: 18, accentColor: '#F63B28', cursor: disabled ? 'not-allowed' : 'pointer' }} />
                  </div>
                  {rev.isCandidate && (
                    <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: IMPORT_REVIVAL_TONE[rev.grade].color, background: IMPORT_REVIVAL_TONE[rev.grade].bg, border: `1px solid ${IMPORT_REVIVAL_TONE[rev.grade].border}`, borderRadius: 6, padding: '1px 6px', whiteSpace: 'nowrap' }}>
                        부활등급 {rev.grade}
                      </span>
                    </div>
                  )}
                  {row.representativeImageUrl
                    ? <img src={row.representativeImageUrl} alt="" style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 8, objectFit: 'cover' }} />
                    : <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 8, background: '#f3f4f6' }} />}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: '#111827', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{row.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{won(row.salePrice)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>{NAVER_STATUS_KO[row.statusType] ?? row.statusType}</span>
                      {row.alreadyLinked && <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af' }}>연동됨</span>}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* footer — pagination + import action bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: '1px solid #F8DCE5' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 700, color: page <= 1 ? '#c4c4c4' : '#374151', background: '#f9fafb', border: '1px solid var(--border-neutral)', borderRadius: 8, padding: '6px 10px', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>
            <ChevronLeft size={13} />이전
          </button>
          <span style={{ fontSize: 12, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 700, color: page >= totalPages ? '#c4c4c4' : '#374151', background: '#f9fafb', border: '1px solid var(--border-neutral)', borderRadius: 8, padding: '6px 10px', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>
            다음<ChevronRight size={13} />
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={() => void doImport([...selected]).then(() => { onClose(); })} disabled={selected.size === 0 || importing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#fff', background: selected.size === 0 ? '#f3b8c6' : '#F63B28', border: 'none', borderRadius: 10, padding: '9px 16px', cursor: selected.size === 0 || importing ? 'not-allowed' : 'pointer' }}>
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            {selected.size}개 선택 · 가져오기
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Naver Direct Register Modal ──────────────────────────────────────────────
// C-1: Pre-registration validation + sequential API registration

function NaverRegisterModal({
  products, onClose, onSuccess,
}: {
  products: ScoredProduct[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [phase, setPhase] = useState<'validate' | 'registering' | 'done'>('validate');
  const [results, setResults] = useState<Array<{ id: string; name: string; ok: boolean; error?: string; naverProductId?: string }>>([]);
  const [progress, setProgress] = useState(0);

  // Filter: only DRAFT or ACTIVE-without-naverProductId products
  const registerable = products.filter(p => !p.naverProductId && (p.status === 'DRAFT' || p.status === 'ACTIVE'));
  const alreadyRegistered = products.filter(p => !!p.naverProductId);
  const hasNoImage = registerable.filter(p => !p.mainImage);
  const hasNoCategory = registerable.filter(p => !p.category || p.category === '50003307');

  // Calculate readiness for each product inline
  const withReadiness = registerable.map(p => ({
    ...p,
    readinessScore: calcUploadReadiness({
      naverCategoryCode: p.naverCategoryCode ?? p.category,
      keywords: p.keywords,
      tags: p.tags,
      name: p.name,
      mainImage: p.mainImage,
      images: p.images,
      shippingTemplateId: p.shippingTemplateId,
      salePrice: p.salePrice,
      supplierPrice: p.supplierPrice,
      shippingFee: p.shippingFee,
    }).score,
  }));

  const startRegistration = async () => {
    setPhase('registering');
    const allResults: typeof results = [];

    for (let i = 0; i < withReadiness.length; i++) {
      const p = withReadiness[i];
      setProgress(i + 1);
      try {
        const res = await fetch('/api/naver/products/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: p.id }),
        });
        const data = await res.json();
        allResults.push({
          id: p.id,
          name: p.name,
          ok: data.success,
          error: data.error ?? data.validation?.errors?.join(', '),
          naverProductId: data.naverProductId,
        });
      } catch (e: any) {
        allResults.push({ id: p.id, name: p.name, ok: false, error: e.message });
      }
      setResults([...allResults]);

      // Rate limit: 2 sec between API calls
      if (i < withReadiness.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    setPhase('done');
  };

  const successCount = results.filter(r => r.ok).length;
  const failCount = results.filter(r => !r.ok).length;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Globe size={16} style={{ color: '#228f18' }} />
            {phase === 'validate' ? 'Naver Direct Registration' : phase === 'registering' ? 'Registering...' : 'Registration Complete'}
          </h3>
          <button onClick={phase === 'done' ? onSuccess : onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {phase === 'validate' && (
          <div className="space-y-3">
            {/* Summary */}
            <div className="p-3 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <p className="text-sm font-semibold" style={{ color: '#15803d' }}>
                {withReadiness.length}개 상품 등록 가능
              </p>
              {alreadyRegistered.length > 0 && (
                <p className="text-xs mt-1" style={{ color: '#888' }}>
                  {alreadyRegistered.length}개는 이미 네이버 등록 완료 (건너뜀)
                </p>
              )}
            </div>

            {/* Warnings */}
            {hasNoImage.length > 0 && registerable.filter(p => !p.mainImage).length > 0 && (
              <div className="p-3 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
                <p className="text-xs font-semibold flex items-center gap-1" style={{ color: '#b91c1c' }}>
                  <AlertTriangle size={12} /> 대표이미지 없음 ({hasNoImage.length}개) — 등록 실패 예상
                </p>
                <p className="text-xs mt-1" style={{ color: '#999' }}>
                  {hasNoImage.map(p => p.name).join(', ')}
                </p>
              </div>
            )}

            {hasNoCategory.length > 0 && registerable.filter(p => !p.category || p.category === '50003307').length > 0 && (
              <div className="p-3 rounded-xl" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                <p className="text-xs font-semibold flex items-center gap-1" style={{ color: '#a16207' }}>
                  <AlertTriangle size={12} /> 카테고리 미선택 ({hasNoCategory.length}개) — 등록 차단됨
                </p>
              </div>
            )}

            {/* Product list preview */}
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {withReadiness.map(p => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#f9fafb' }}>
                  <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{p.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: p.readinessScore >= 75 ? '#dcfce7' : p.readinessScore >= 45 ? '#fffbeb' : '#fee2e2',
                      color: p.readinessScore >= 75 ? '#15803d' : p.readinessScore >= 45 ? '#a16207' : '#b91c1c',
                    }}>
                    {p.readinessScore}%
                  </span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                취소
              </button>
              <button
                onClick={startRegistration}
                disabled={withReadiness.length === 0}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-40"
                style={{ background: withReadiness.length > 0 ? '#228f18' : '#ccc' }}>
                <span className="flex items-center justify-center gap-1.5">
                  <Send size={13} /> {withReadiness.length}개 네이버 등록 시작
                </span>
              </button>
            </div>
          </div>
        )}

        {phase === 'registering' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader size={16} className="text-green-600 animate-spin" />
              <p className="text-sm font-semibold text-gray-700">
                {progress} / {withReadiness.length} 등록 중...
              </p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="h-2 rounded-full transition-all" style={{
                width: `${(progress / Math.max(withReadiness.length, 1)) * 100}%`,
                background: '#228f18',
              }} />
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {results.map(r => (
                <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: r.ok ? '#f0fdf4' : '#fef2f2' }}>
                  {r.ok ? <Check size={12} className="text-green-600" /> : <X size={12} className="text-red-500" />}
                  <span className="text-xs flex-1 truncate" style={{ color: r.ok ? '#15803d' : '#b91c1c' }}>{r.name}</span>
                  {r.ok && <span className="text-xs text-gray-400">{r.naverProductId}</span>}
                  {!r.ok && <span className="text-xs text-red-400 truncate max-w-[200px]">{r.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl text-center" style={{
              background: successCount > 0 ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${successCount > 0 ? '#bbf7d0' : '#fca5a5'}`,
            }}>
              <p className="text-lg font-bold" style={{ color: successCount > 0 ? '#15803d' : '#b91c1c' }}>
                {successCount > 0 ? `${successCount}개 등록 완료` : '등록 실패'}
              </p>
              {failCount > 0 && (
                <p className="text-xs mt-1" style={{ color: '#b91c1c' }}>{failCount}개 실패</p>
              )}
            </div>
            {/* Failed items detail */}
            {results.filter(r => !r.ok).length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {results.filter(r => !r.ok).map(r => (
                  <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#fef2f2' }}>
                    <X size={12} className="text-red-500" />
                    <span className="text-xs text-red-700 flex-1 truncate">{r.name}</span>
                    <span className="text-xs text-red-400 truncate max-w-[200px]">{r.error}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={onSuccess}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-white transition"
              style={{ background: '#228f18' }}>
              확인
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Readiness Check Modal ──────────────────────────────────────────────────── 
// Shown before bulk Excel download — warns about products with low readiness

function ReadinessCheckModal({
  products, onConfirm, onCancel,
}: {
  products: ScoredProduct[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const results = products.map(p => ({
    p,
    rd: calcUploadReadiness({
      naverCategoryCode: p.naverCategoryCode,
      keywords: p.keywords,
      tags: p.tags,
      name: p.name,
      mainImage: p.mainImage,
      images: p.images,
      shippingTemplateId: p.shippingTemplateId,
      salePrice: p.salePrice,
      supplierPrice: p.supplierPrice,
      shippingFee: p.shippingFee,
    }),
  }));
  const failing  = results.filter(r => r.rd.score < 60);
  const passing  = results.filter(r => r.rd.score >= 60);
  const allPass  = failing.length === 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500,
        maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        border: '1.5px solid #F8DCE5', boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #F8DCE5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={15} style={{ color: allPass ? '#16a34a' : '#F63B28' }} />
            <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
              {allPass ? '엑셀 다운로드 준비 완료' : '업로드 준비도 확인'}
            </p>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B0A0A8', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 20px' }}>
          {allPass ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Check size={28} style={{ color: '#16a34a', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: '#15803d', margin: '0 0 4px' }}>선택한 {products.length}개 상품 모두 준비됐어요!</p>
              <p style={{ fontSize: 12, color: '#B0A0A8', margin: 0 }}>엑셀을 다운로드하고 네이버에 업로드하세요.</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: '#FFF0F5', border: '1px solid #FFB3CE', marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#F63B28', margin: '0 0 2px' }}>
                  {failing.length}개 상품의 업로드 준비도가 60% 미만이에요
                </p>
                <p style={{ fontSize: 11, color: '#888', margin: 0 }}>미비 항목을 수정 후 업로드하면 검색 노출이 높아집니다. 그대로 진행할 수도 있습니다.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {failing.map(({ p, rd }) => (
                  <div key={p.id} style={{ padding: '10px 12px', borderRadius: 12, border: '1.5px solid #fecaca', background: '#fef2f2' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{p.name}</p>
                      <span style={{ fontSize: 11, fontWeight: 800, color: getReadinessColor(rd.score), flexShrink: 0 }}>{rd.score}%</span>
                    </div>
                    <p style={{ fontSize: 10, color: '#888', margin: 0 }}>
                      {rd.failed.slice(0, 3).map(f => f.label).join(' · ')}{rd.failed.length > 3 ? ` 외 ${rd.failed.length - 3}건` : ''}
                    </p>
                  </div>
                ))}
                {passing.length > 0 && (
                  <p style={{ fontSize: 11, color: '#B0A0A8', textAlign: 'center' }}>
                    {passing.length}개는 준비 완료 (60%+)
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #F8DCE5', display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, background: '#fff', color: '#888', border: '1.5px solid #F8DCE5', cursor: 'pointer' }}>
            취소
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 800, background: '#F63B28', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Check size={13} /> {allPass ? '다운로드' : '그대로 다운로드'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Float Menu ──────────────────────────────────────────────────────────

function BulkFloatMenu({
  selectedIds, onClear, onApplyTemplate, onExcelWithCheck, onBulkStatusChange, onNaverRegister,
}: { selectedIds: string[]; onClear: () => void; onApplyTemplate: () => void; onExcelWithCheck: () => void; onBulkStatusChange: (status: string) => void; onNaverRegister: () => void }) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  if (selectedIds.length === 0) return null;

  // SEED-SAVE C-4 (#62): keep the bulk options in sync with the status taxonomy —
  // 작성중(DRAFT)/발행대기(READY)/판매중(ACTIVE)/품절/비활성화.
  const STATUS_OPTIONS = [
    { value: 'DRAFT',         label: '작성중',      color: '#9ca3af' },
    { value: 'READY',         label: '발행대기',    color: '#16a34a' },
    { value: 'ACTIVE',        label: '판매 중',     color: '#16a34a' },
    { value: 'OUT_OF_STOCK',  label: '품절',        color: '#F63B28' },
    { value: 'INACTIVE',      label: '비활성화',    color: '#888' },
  ];

  // Phase 2-MOBILE-3 M4: dock above MobileTabBar on mobile (60px tab bar +
  // safe-area) so the float menu doesn't collide; cap horizontal size to the
  // viewport so it never overflows; inner button row scrolls when 5 actions
  // exceed the cap. Desktop floats at bottom-6 with min-w 520.
  return (
    <div className="fixed bottom-[84px] lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl lg:min-w-[520px]"
      style={{ background: '#1A1A1A', border: '1.5px solid #333', maxWidth: 'calc(100vw - 24px)' }}>
      <span className="text-sm font-bold text-white mr-2">{selectedIds.length}개 선택</span>
      <div className="flex-1 flex items-center gap-2 overflow-x-auto">
        <Link href={`/naver-seo?ids=${selectedIds.join(',')}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition"
          style={{ background: '#F63B28', color: '#fff' }}>
          <Search size={12} /> 검색 조련사로 이동 <ArrowRight size={11} />
        </Link>
        <button onClick={onExcelWithCheck}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 text-white transition">
          <Upload size={12} /> 엑셀 다운로드
        </button>
        <button onClick={onNaverRegister}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition"
          style={{ background: '#228f18', color: '#fff' }}>
          <Globe size={12} /> 네이버 직접 등록
        </button>
        <button onClick={onApplyTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition"
          style={{ background: '#374151', color: '#d1d5db', border: '1px solid #4b5563' }}>
          <Truck size={12} /> 배송 템플릿
        </button>
        {/* Bulk status change */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition"
            style={{ background: '#4b5563', color: '#d1d5db', border: '1px solid #6b7280' }}>
            <RefreshCw size={12} /> 상태 변경
          </button>
          {showStatusMenu && (
            <div style={{
              position: 'absolute', bottom: '110%', left: 0,
              background: '#1f2937', border: '1px solid #374151',
              borderRadius: 12, overflow: 'hidden', minWidth: 120, zIndex: 60,
            }}>
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onBulkStatusChange(opt.value); setShowStatusMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-700 transition"
                  style={{ color: opt.color }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <button onClick={onClear} className="p-1.5 rounded-lg hover:bg-white/10 transition">
        <X size={14} className="text-gray-400" />
      </button>
    </div>
  );
}

// ─── Apply Template Modal ─────────────────────────────────────────────────────

function ApplyTemplateModal({
  selectedIds, onClose, onSuccess,
}: { selectedIds: string[]; onClose: () => void; onSuccess: () => void }) {
  const [templates, setTemplates] = useState<{ id: string; name: string; shippingFee: number; shippingType: number }[]>([]);
  const [chosen, setChosen]       = useState('');
  const [applying, setApplying]   = useState(false);

  useEffect(() => {
    fetch('/api/shipping-templates')
      .then(r => r.json())
      .then(d => setTemplates(d.templates ?? []));
  }, []);

  const apply = async () => {
    if (!chosen || applying) return;
    setApplying(true);
    try {
      await Promise.all(
        selectedIds.map(id => fetch(`/api/products/${id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shipping_template_id: chosen }),
        }))
      );
      onSuccess();
    } finally { setApplying(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden" style={{ border: '1.5px solid #F8DCE5' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1.5px solid #F8DCE5' }}>
          <p className="text-sm font-bold text-gray-900">배송 템플릿 일괄 적용</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-pink-50"><X size={16} style={{ color: '#9CA3AF' }} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs" style={{ color: '#888' }}>{selectedIds.length}개 상품에 적용할 배송 템플릿을 선택하세요.</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {templates.map(t => (
              <label key={t.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer border transition ${chosen === t.id ? 'border-[#F63B28] bg-red-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                <input type="radio" name="tmpl" value={t.id} checked={chosen === t.id} onChange={() => setChosen(t.id)} className="accent-[#F63B28]" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p>
                  <p className="text-xs" style={{ color: '#888' }}>
                    {t.shippingType === 2 ? '무료배송' : t.shippingType === 3 ? '조건부무료' : `유료 ${t.shippingFee.toLocaleString()}원`}
                  </p>
                </div>
              </label>
            ))}
            {templates.length === 0 && <p className="text-xs text-gray-400 py-4 text-center">등록된 배송 템플릿이 없습니다</p>}
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">취소</button>
          <button onClick={apply} disabled={!chosen || applying}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-40"
            style={{ background: '#F63B28' }}>
            {applying ? '적용 중...' : '적용'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ProductsPageInner() {
  const searchParams                              = useSearchParams();
  // PART A3-3b (2026-05-05) — migrated self-fetch path to useProductsList()
  // shared SWR hook. The local useState({raw, loading, error}) + useCallback
  // (fetchProducts) + useEffect bootstrap are all replaced by destructuring
  // below. `fetchProducts` is preserved as an alias for `refresh` so the 3
  // call sites (refresh button, NaverRegisterModal onSuccess, sync handler)
  // and the 2 supplier-filter helpers do not need to change.
  const {
    rawProducts,
    isLoading: loading,
    error,
    refresh: fetchProducts,
    setRawProducts,
  } = useProductsList<Product[]>({ limit: 500 });
  // Sprint 6-A UI — latest inventory snapshot + open alert per product, keyed by productId.
  // Empty object {} when no products have been polled yet (cold start safe).
  const { byProductId: inventoryByProductId } = useInventoryBadges();
  // Stable empty-array fallback so downstream useMemo dependencies do not
  // re-fire on every render while the SWR fetch is in flight.
  const raw = useMemo<Product[]>(() => rawProducts ?? [], [rawProducts]);
  // tab: pre-populated from ?tab= URL param (control-tower readiness summary deep-link)
  const [tab, setTab]                         = useState<TabKey>(() => {
    const t = searchParams?.get('tab');
    return t && Object.prototype.hasOwnProperty.call(TAB_CONFIG, t) ? (t as TabKey) : 'all';
  });
  const [search, setSearch]                   = useState('');
  // 같은 라우트가 두 화면을 서빙한다(#256 §1 — 같은 Product 테이블의 두 뷰).
  // 꿀통 창고 > 작성중(?tab=draft) = 정원 창고 — 스토어에 아직 안 올린 상품
  // 꽃밭 돌보기(/products)          = 스토어에 올라간 상품(앱 등록 + 연동)
  // 제목이 고정이면 클릭한 메뉴와 도착한 화면 이름이 어긋난다(2026-07-17 교정).
  const pageTitle = tab === 'draft' ? '정원 창고' : '꽃밭 돌보기';
  // 작업 H (SCREEN_DIFFERENTIATION_SPEC_2026-07-17) — 정원 창고는 판매 상태가
  // 아니라 "작업 단계"(준비도) 기준으로 나뉜다. 별도 축이라 TAB_CONFIG에 얹지
  // 않고 이 로컬 서브필터로 분리.
  const isGarden = tab === 'draft';
  const [gardenReadiness, setGardenReadiness] = useState<'all' | 'notReady' | 'ready'>('all');
  // supplierFilter: pre-populated from ?supplier= URL param (거래처 명단 연결)
  const [supplierFilter, setSupplierFilter]   = useState<string>(() => searchParams?.get('supplier') ?? '');
  const [selected, setSelected]               = useState<Set<string>>(new Set());
  const [sideProduct, setSide]                = useState<ScoredProduct | null>(null);
  // Per-row 발행준비 X/8 (#245) — batched from the same getPublishReadiness gate.
  const [readinessMap, setReadinessMap] = useState<Record<string, { ready: boolean; passed: number; total: number }>>({});
  // NAME-DIAG-3 (#251): per-row 상품명 진단 badges (server-computed SEO×ROI trend).
  const [nameDiagnoses, setNameDiagnoses] = useState<Record<string, NameBadgeData>>({});
  const [viewMode, setViewMode]               = useState<ViewMode>('list');
  const [showUploadReady, setShowUploadReady] = useState(false);
  const [expandedGroups, setExpandedGroups]   = useState<Set<string>>(new Set());
  const [showMoreFilters, setShowMoreFilters]       = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [excelPending, setExcelPending]             = useState(false);
  const [showNaverRegisterModal, setShowNaverRegisterModal] = useState(false);
  // 작업 H-1 — 정원 창고 "준비된 것 일괄 발행" (준비도 100% 상품만 대상).
  const [showGardenPublishModal, setShowGardenPublishModal] = useState(false);
  // 작업 F — 네이버 상품 가져오기 모달(구 /products/link Zone1 흡수)
  const [showImportModal, setShowImportModal] = useState(false);
  // B-3: Naver real-time sync
  const [naverSyncing, setNaverSyncing]   = useState(false);
  const [naverSyncMsg, setNaverSyncMsg]   = useState('');
  const [naverMismatches, setNaverMismatches] = useState<Record<string, string>>({});
  // Inline quick-edit state: { id, field, value }
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: 'salePrice' | 'supplierPrice'; value: string } | null>(null);

  // Batch 발행준비 X/8 for the hub (#245) — one fetch, mapped by product id.
  useEffect(() => {
    let alive = true;
    fetch('/api/products/publish-readiness-batch')
      .then(r => r.json())
      .then(d => {
        if (!alive || !d?.success || !Array.isArray(d.items)) return;
        const m: Record<string, { ready: boolean; passed: number; total: number }> = {};
        for (const it of d.items) m[it.id] = { ready: it.ready, passed: it.passed, total: it.total };
        setReadinessMap(m);
      })
      .catch(() => { /* non-critical — the X/8 badge just won't show */ });
    return () => { alive = false; };
  }, [rawProducts]);

  // NAME-DIAG-3 (#251): batch 상품명 진단 for the hub rows. Non-blocking; the
  // list renders immediately and badges fill in when the server responds.
  useEffect(() => {
    let alive = true;
    const ids = (rawProducts ?? []).map((p) => p.id);
    if (ids.length === 0) { setNameDiagnoses({}); return; }
    fetch('/api/seo/name-diagnosis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: ids }),
    })
      .then((r) => r.json())
      .then((d) => { if (alive && d?.success) setNameDiagnoses(d.diagnoses ?? {}); })
      .catch(() => { /* best-effort — badge just won't show */ });
    return () => { alive = false; };
  }, [rawProducts]);

  // Fire Excel download once after readiness check is confirmed
  useEffect(() => {
    if (!excelPending) return;
    const ids = [...selected];
    if (ids.length === 0) { setExcelPending(false); return; }
    fetch('/api/naver/excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: ids }),
    }).then(async res => {
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `naver_batch_${new Date().toISOString().slice(0,10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSelected(new Set());
      }
    }).catch(() => {}).finally(() => setExcelPending(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excelPending]);

  // PART A3-3b: fetchProducts is now an alias for the SWR hook's `refresh()`
  // (declared at the top of this component). The previous useCallback +
  // bootstrap useEffect are no longer needed — SWR auto-fetches on mount
  // and revalidates on focus per DASHBOARD_SWR_DEFAULTS.

  // E-14: Auto-select product from dashboard "Upload Readiness Center" deep-link (?registerId=...)
  // When the user clicks "바로 등록" on a 90+ point DRAFT card, this opens NaverRegisterModal preselected
  useEffect(() => {
    const registerId = searchParams?.get('registerId');
    if (!registerId || raw.length === 0) return;
    const exists = raw.some((p) => p.id === registerId);
    if (exists) {
      setSelected(new Set([registerId]));
      setShowNaverRegisterModal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, searchParams]);

  // B-3: Naver real-time status sync
  const handleNaverSync = async () => {
    setNaverSyncing(true); setNaverSyncMsg('');
    try {
      const r = await fetch('/api/naver/products/sync');
      const d = await r.json();
      if (d.success) {
        const mismatches: Record<string, string> = {};
        for (const p of d.products ?? []) {
          if (p.mismatch && p.mismatchDetail) mismatches[p.id] = p.mismatchDetail;
        }
        setNaverMismatches(mismatches);
        const mc = d.mismatchCount ?? 0;
        setNaverSyncMsg(mc > 0
          ? `${d.total}개 확인 — 불일치 ${mc}건 발견`
          : `${d.total}개 확인 — 모두 정상`);
        if (mc > 0) fetchProducts(); // refresh if auto-fixed
      } else {
        setNaverSyncMsg(d.error ?? '네이버 동기화 실패');
      }
    } catch { setNaverSyncMsg('네트워크 오류'); }
    finally { setNaverSyncing(false); }
  };

  const scored = useMemo<ScoredProduct[]>(() => raw.map(p => ({
    ...p,
    _hs: calcHoneyScore({
      salePrice: p.salePrice, supplierPrice: p.supplierPrice,
      categoryId: p.naverCategoryCode ?? '', productName: p.name,
      keywords: p.keywords ?? [], tags: p.tags ?? [],
      hasMainImage: !!p.mainImage,
    }),
    // Hub axis (#245): source tag, from fields already loaded (origin_kind
    // derived until the migration lands). Zombie judgment (#264) comes from
    // p.tuningScore (server-computed via computeZombieVerdict), not a
    // client-recomputed revival score.
    _origin: deriveOriginKind(p),
  })), [raw]);

  const filtered = useMemo<ScoredProduct[]>(() => {
    const tabFn = TAB_CONFIG[tab].filter;
    return scored
      .filter(p => tabFn(p))
      .filter(p => !isGarden || gardenReadiness === 'all' || !!readinessMap[p.id]?.ready === (gardenReadiness === 'ready'))
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
      .filter(p => !supplierFilter || p.supplierId === supplierFilter)
      .filter(p => !showUploadReady || getReadinessIssues(p).length > 0)
      .sort((a, b) => b._hs.total - a._hs.total);
  }, [scored, tab, isGarden, gardenReadiness, readinessMap, search, supplierFilter, showUploadReady]);

  const counts = useMemo(() =>
    Object.fromEntries((Object.keys(TAB_CONFIG) as TabKey[]).map(k => [k, scored.filter(TAB_CONFIG[k].filter).length])) as Record<TabKey, number>,
    [scored]);

  // 정원 창고 서브필터 카운트 — draft 뷰 안에서만 의미 있음(뷰 스코프 제한, H-2).
  const gardenCounts = useMemo(() => {
    const draftProducts = scored.filter(TAB_CONFIG.draft.filter);
    const ready = draftProducts.filter(p => !!readinessMap[p.id]?.ready);
    return { all: draftProducts.length, ready: ready.length, notReady: draftProducts.length - ready.length, readyProducts: ready };
  }, [scored, readinessMap]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; items: ScoredProduct[] }>();
    filtered.forEach(p => {
      const key   = p.supplierId ?? '__none__';
      const label = p.supplierName ?? '공급사 미설정';
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(p);
    });
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }));
  }, [filtered]);

  // SEED-SAVE C-4 — default view grouped by status segment (작성중/발행대기/발행됨/…).
  // Only non-empty segments render. Used when no specific status tab is selected.
  const statusSections = useMemo(() =>
    STATUS_SEGMENTS
      .map(seg => ({ ...seg, items: filtered.filter(seg.match) }))
      .filter(s => s.items.length > 0),
    [filtered]);

  // C-4 (mobile): the card stack intentionally stays flat (grouping headers are a
  // desktop affordance), but in the default view we order by status segment so
  // 작성중/발행대기 surface at the top instead of being buried by honey score.
  const mobileList = useMemo(() => {
    if (tab !== 'all') return filtered;
    const idx = (p: ScoredProduct) => { const i = STATUS_SEGMENTS.findIndex(s => s.match(p)); return i === -1 ? STATUS_SEGMENTS.length : i; };
    return [...filtered].sort((a, b) => (idx(a) - idx(b)) || (b._hs.total - a._hs.total));
  }, [filtered, tab]);

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll    = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map(p => p.id))); };
  const toggleGroup  = (key: string) => {
    const s = filtered.filter(p => (p.supplierId ?? '__none__') === key);
    const allSel = s.every(p => selected.has(p.id));
    setSelected(prev => { const n = new Set(prev); s.forEach(p => allSel ? n.delete(p.id) : n.add(p.id)); return n; });
  };
  const toggleExpand = (key: string) => setExpandedGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const deleteProduct = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    fetchProducts();
  };

  const toggleStatus = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const next: Record<string, string> = { DRAFT: 'READY', READY: 'ACTIVE', ACTIVE: 'OUT_OF_STOCK', OUT_OF_STOCK: 'INACTIVE', INACTIVE: 'ACTIVE', HIDDEN: 'ACTIVE' };
    const newStatus = next[product.status] ?? 'ACTIVE';
    await fetch(`/api/products/${product.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
    setRawProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: newStatus } : p));
  };

  // Bulk status change for selected products
  const handleBulkStatusChange = async (status: string) => {
    const ids = [...selected];
    await Promise.all(ids.map(id =>
      fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    ));
    setRawProducts(prev => prev.map(p => selected.has(p.id) ? { ...p, status } : p));
    setSelected(new Set());
  };

  // Phase 2b (#245 §2-C / #46) — single-product mutation with confirm-gated
  // callers, OPTIMISTIC update, and ROLLBACK on failure. Reuses the PATCH route.
  const handleProductMutate = async (id: string, patch: Partial<Product>): Promise<boolean> => {
    const before = raw.find(p => p.id === id);
    setRawProducts(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p)); // optimistic
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.success === false) throw new Error(j?.error || `HTTP ${res.status}`);
      return true;
    } catch (e) {
      if (before) setRawProducts(prev => prev.map(p => p.id === id ? before : p)); // rollback
      alert(`변경 실패 — 되돌렸습니다: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  };

  // 리셋 (#245) — undo app-tuning to the Naver 연동 원본 (server re-fetches;
  // NOT optimistic since restored values come from the store). IMPORTED/HYBRID
  // only (route enforces). Returns true on success.
  const handleProductReset = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.success === false) throw new Error(j?.error || `HTTP ${res.status}`);
      const r = j.restored ?? {};
      setRawProducts(prev => prev.map(p => p.id === id ? { ...p, ...r } : p));
      return true;
    } catch (e) {
      alert(`리셋 실패: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  };

  // 공급사 재고 동기화 (#245) — reuse the existing stock-check sync (bulk over
  // products with a supplier URL). Returns a short result message for a toast.
  const handleStockSync = async (): Promise<string> => {
    try {
      const res = await fetch('/api/crawler/stock-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50, dryRun: false }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.success === false) throw new Error(j?.error || `HTTP ${res.status}`);
      await fetchProducts();
      return j.message ?? `동기화 완료 — 확인 ${j.checked ?? 0} · 품절 ${j.oosDetected ?? 0}`;
    } catch (e) {
      return `동기화 실패: ${e instanceof Error ? e.message : String(e)}`;
    }
  };

  // Inline quick-edit save handler
  const saveInlineEdit = async () => {
    if (!inlineEdit) return;
    const num = parseInt(inlineEdit.value.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num) || num <= 0) { setInlineEdit(null); return; }
    try {
      await fetch(`/api/products/${inlineEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [inlineEdit.field]: num }),
      });
      setRawProducts(prev => prev.map(p => p.id === inlineEdit.id ? { ...p, [inlineEdit.field]: num } : p));
    } catch { /* non-critical */ }
    setInlineEdit(null);
  };

  // Grid: checkbox | name/sku | status | supplier | shipping | netMargin | salePrice | readiness | score | actions
  const COL = '36px 1fr 90px 110px 130px 62px 90px 72px 68px 70px';

  const renderRow = (p: ScoredProduct, idx: number, isLast: boolean) => {
    const dangerMargin = p._hs.netMarginRate < 5;
    return (
      <div key={p.id}>
        <div
          className="grid items-center gap-2 px-4 py-3 cursor-pointer group transition-colors"
          style={{
            gridTemplateColumns: COL,
            background: selected.has(p.id) ? 'rgba(230,35,16,0.04)' : dangerMargin ? 'rgba(239,68,68,0.03)' : 'transparent',
            borderLeft: dangerMargin ? '3px solid #ef4444' : '3px solid transparent',
          }}
          onClick={() => setSide(p)}
          onMouseEnter={e => { if (!selected.has(p.id)) (e.currentTarget as HTMLElement).style.background = '#FFF8FA'; }}
          onMouseLeave={e => { if (!selected.has(p.id)) (e.currentTarget as HTMLElement).style.background = dangerMargin ? 'rgba(239,68,68,0.03)' : 'transparent'; }}
        >
          <div onClick={e => e.stopPropagation()}>
            <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
              className="w-4 h-4 rounded border-gray-300 text-[#F63B28] focus:ring-[#F63B28]/30" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{p.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <p className="text-xs font-mono truncate" style={{ color: '#B0A0A8', minWidth: 0 }}>{p.sku}</p>
              {/* 작업 H-3 — 정원 창고(미발행)는 재고 폴링 대상이 아니라 실패
                  표시가 의미 없다("네이버에 없는 상품을 물어본 것", 스펙 §2). */}
              {!isGarden && inventoryByProductId[p.id] && <InventoryBadge inv={inventoryByProductId[p.id]} mode="sourcing" />}
            </div>
            <HubBadges p={p} rd={readinessMap[p.id]} />
            {nameDiagnoses[p.id] && (
              <div style={{ marginTop: 3 }}><NameDiagnosisBadge data={nameDiagnoses[p.id]} /></div>
            )}
            {p.tuningScore && (
              <div style={{ marginTop: 3 }}><TuningBadge data={p.tuningScore} /></div>
            )}
            {naverMismatches[p.id] && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#F63B28', background: '#fff1f1', border: '1px solid #fca5a5', borderRadius: 6, padding: '1px 6px', marginTop: 2 }}>
                <AlertTriangle size={9} /> {naverMismatches[p.id]}
              </span>
            )}
          </div>
          <div className="flex justify-center"><StatusDot product={p} /></div>
          <div className="min-w-0">
            {p.supplierName
              ? <p className="text-xs font-medium truncate" style={{ color: '#555' }}>{p.supplierName}</p>
              : <p className="text-xs" style={{ color: '#D4B0BC' }}>미설정</p>
            }
            {p.platformName && <p className="text-[10px] truncate" style={{ color: '#B0A0A8' }}>{p.platformName}</p>}
          </div>
          <div className="flex justify-start"><ShippingBadge product={p} /></div>
          <MarginCell hs={p._hs} />
          {/* Inline-editable sale price cell — double-click to edit */}
          <div
            onDoubleClick={e => { e.stopPropagation(); setInlineEdit({ id: p.id, field: 'salePrice', value: String(p.salePrice || '') }); }}
            title="더블클릭으로 판매가 수정"
            style={{ cursor: 'text', textAlign: 'right' }}
          >
            {inlineEdit?.id === p.id && inlineEdit.field === 'salePrice' ? (
              <input
                autoFocus
                type="number"
                value={inlineEdit.value}
                onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                onBlur={saveInlineEdit}
                onKeyDown={e => { if (e.key === 'Enter') saveInlineEdit(); if (e.key === 'Escape') setInlineEdit(null); }}
                onClick={e => e.stopPropagation()}
                style={{ width: 80, fontSize: 13, fontWeight: 700, textAlign: 'right', border: '1.5px solid #F63B28', borderRadius: 6, padding: '2px 4px', outline: 'none', background: '#fff9f9' }}
              />
            ) : (
              <p className="text-right text-sm font-semibold text-gray-900" style={{ margin: 0 }}>
                {p.salePrice > 0 ? p.salePrice.toLocaleString() : '—'}<span className="text-xs font-normal" style={{ color: '#B0A0A8' }}>원</span>
              </p>
            )}
          </div>
          {/* Readiness mini bar */}
          {(() => {
            const rd = calcUploadReadiness({
              naverCategoryCode: p.naverCategoryCode,
              keywords: p.keywords,
              tags: p.tags,
              name: p.name,
              mainImage: p.mainImage,
              images: p.images,
              shippingTemplateId: p.shippingTemplateId,
              salePrice: p.salePrice,
              supplierPrice: p.supplierPrice,
              shippingFee: p.shippingFee,
            });
            const col = getReadinessColor(rd.score);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: col }}>{rd.score}%</span>
                <div style={{ width: 52, height: 4, background: '#F8DCE5', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${rd.score}%`, height: '100%', background: col, borderRadius: 99, transition: 'width 0.4s' }} />
                </div>
              </div>
            );
          })()}
          <div className="flex justify-center"><HoneyBadge score={p._hs.total} grade={p._hs.grade} /></div>
          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button onClick={e => toggleStatus(e, p)} title="상태 변경"
              className="p-1.5 rounded-lg transition hover:bg-gray-100"
              style={{ color: p.status === 'ACTIVE' ? '#16a34a' : p.status === 'OUT_OF_STOCK' ? '#F63B28' : '#9CA3AF' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
              </svg>
            </button>
            <Link href={`/products/new?edit=${p.id}`} className="p-1.5 rounded-lg transition text-blue-400 hover:text-blue-600 hover:bg-blue-50" title="수정"><Edit2 size={13} /></Link>
            <Link href={`/studio?product=${p.id}`} className="p-1.5 rounded-lg transition text-pink-400 hover:text-pink-600 hover:bg-pink-50" title="콘텐츠 자동화 (온실 아틀리에)"><Palette size={13} /></Link>
            <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded-lg transition text-red-300 hover:text-red-500 hover:bg-red-50" title="삭제"><Trash2 size={13} /></button>
          </div>
        </div>
        {!isLast && <div style={{ height: 1, background: '#F8DCE5', margin: '0 16px' }} />}
      </div>
    );
  };

  const TableHeader = () => (
    <>
      <div className="grid items-center gap-2 px-4"
        style={{ gridTemplateColumns: COL, background: '#FFF0F5', borderBottom: '2px solid #FFB3CE', paddingTop: 10, paddingBottom: 10 }}>
        <input type="checkbox"
          checked={selected.size === filtered.length && filtered.length > 0}
          onChange={toggleAll}
          className="w-4 h-4 rounded border-gray-300 text-[#F63B28] focus:ring-[#F63B28]/30" />
        {/* 작업 H-3 — 정원 창고는 "작업 단계·예상 마진·예상 판매가"로 라벨을
            바꿔 실적이 아니라 전망치임을 명시(SCREEN_DIFFERENTIATION_SPEC_
            2026-07-17 §4-3). 꽃밭 돌보기는 실적 라벨 유지. */}
        {(isGarden
          ? ['상품명 / 상품코드(SKU)', '작업 단계', '공급사', '배송', '예상 마진', '예상 판매가', '준비도', '점수', '관리']
          : ['상품명 / 상품코드(SKU)', '상태', '공급사', '배송', '순마진', '판매가', '준비도', '점수', '관리']
        ).map(h => (
          <span key={h} className="text-[11px] font-black tracking-wide" style={{ color: '#F63B28' }}>{h}</span>
        ))}
      </div>
      <div style={{ height: 1, background: '#F8DCE5' }} />
    </>
  );

  // SEED-SAVE C-4 — status-segmented default list (작성중 → 발행대기 → 발행됨 → …).
  // Each segment is a labelled section header followed by its rows; DRAFT/READY get
  // their own top sections so in-progress items are immediately visible.
  const StatusSectionsView = () => (
    <div>
      {statusSections.map(({ key, label, dot, items }) => (
        <div key={key} style={{ borderBottom: '1.5px solid #F8DCE5' }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: '#FFF8FA' }}>
            <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
            <span className="text-sm font-bold text-gray-800">{label}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-lg font-bold" style={{ background: '#F8DCE5', color: '#F63B28' }}>{items.length}</span>
          </div>
          <div style={{ borderTop: '1px solid #F8DCE5' }}>
            {items.map((p, i) => renderRow(p, i, i === items.length - 1))}
          </div>
        </div>
      ))}
    </div>
  );

  const GroupView = () => (
    <div>
      {grouped.map(({ key, label, items }) => {
        const expanded         = expandedGroups.has(key);
        const groupSelected    = items.every(p => selected.has(p.id));
        const hasTemplateIssue = items.some(p => !p.shippingTemplateId);
        const hasDangerMargin  = items.some(p => p._hs.netMarginRate < 5);
        return (
          <div key={key} style={{ borderBottom: '1.5px solid #F8DCE5' }}>
            <div className="flex items-center gap-3 px-4 py-3 hover:bg-pink-50 transition-colors" style={{ background: '#FFF8FA' }}>
              <input type="checkbox" checked={groupSelected} onChange={() => toggleGroup(key)}
                onClick={e => e.stopPropagation()}
                className="w-4 h-4 rounded border-gray-300 text-[#F63B28] focus:ring-[#F63B28]/30" />
              <button onClick={() => toggleExpand(key)} className="flex items-center gap-2 flex-1 min-w-0">
                {expanded ? <ChevronDown size={14} style={{ color: '#F63B28' }} /> : <ChevronRight size={14} style={{ color: '#F63B28' }} />}
                <span className="text-sm font-bold text-gray-800">{label}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-lg font-bold" style={{ background: '#F8DCE5', color: '#F63B28' }}>{items.length}</span>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                {hasTemplateIssue && (
                  <span className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-lg"
                    style={{ background: '#FFF0F5', color: '#F63B28', border: '1px solid #FFB3CE' }}>
                    <Truck size={10} /> 배송 미설정 있음
                  </span>
                )}
                {hasDangerMargin && (
                  <span className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-lg"
                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                    <AlertTriangle size={10} /> 역마진 주의
                  </span>
                )}
                <ExcelExportButton mode="batch" productIds={items.map(p => p.id)} buttonText="그룹 엑셀"
                  buttonClassName="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition" />
              </div>
            </div>
            {expanded && (
              <div style={{ borderTop: '1px solid #F8DCE5' }}>
                {items.map((p, i) => renderRow(p, i, i === items.length - 1))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-full" style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* R-3 (rev58 운영자 스크린샷) — 패널이 열리면 목록을 밀어내 순마진·판매가
          등 우측 컬럼이 패널 뒤로 가려지지 않게 한다(압축모드 대신 margin-right
          — 구현 단순 + 맥락 유지, #245). 패널 폭(min(720px,50vw))과 동일 값. */}
      <div className="flex-1 min-w-0 p-6 space-y-4" style={{ marginRight: sideProduct ? 'min(720px, 50vw)' : 0, transition: 'margin-right 0.2s ease' }}>

        {/* Page header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                  {([0,60,120,180,240,300] as number[]).map((deg, i) => {
                    const r = deg * Math.PI / 180; const cx = 26 + Math.cos(r) * 11.4; const cy = 26 + Math.sin(r) * 11.4;
                    return <ellipse key={i} cx={cx} cy={cy} rx={14} ry={10.4} transform={`rotate(${deg} ${cx} ${cy})`} fill="#F63B28" />;
                  })}
                  <circle cx="26" cy="26" r="14.6" fill="#F63B28" />
                </svg>
                <svg style={{ position: 'relative', zIndex: 1 }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              </div>
              <h1 className="font-display" style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
              {/* View mode toggle */}
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid #F8DCE5', background: '#fff' }}>
                <button onClick={() => setViewMode('list')}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
                  style={{ background: viewMode === 'list' ? '#F63B28' : 'transparent', color: viewMode === 'list' ? '#fff' : '#6B6B6B' }}>
                  <LayoutList size={13} /> 목록
                </button>
                <button onClick={() => setViewMode('group')}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
                  style={{ background: viewMode === 'group' ? '#F63B28' : 'transparent', color: viewMode === 'group' ? '#fff' : '#6B6B6B' }}>
                  <Layers size={13} /> 공급사별
                </button>
              </div>
              <button onClick={fetchProducts} disabled={loading}
                className="p-2 rounded-xl transition disabled:opacity-40"
                style={{ border: '1.5px solid #F8DCE5', background: '#fff' }} title="새로고침">
                <RefreshCw size={14} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {/* 작업 H-1 (SCREEN_DIFFERENTIATION_SPEC_2026-07-17 §4-1) — 헤더
                  액션 분화. 정원 창고=아직 스토어에 없는 상품 정리소라 네이버
                  동기화·가져오기가 무의미(대상 0건)하고, 대신 씨앗 확보(상품
                  등록·크롤링)+일괄 발행이 핵심 액션. 꽃밭 돌보기=이미 발행된
                  상품 관리라 신규 등록은 온실아틀리에 소관(#266). */}
              {isGarden ? (
                <>
                  <Link href="/crawl" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition"
                    style={{ border: '1.5px solid #F8DCE5', background: '#fff', color: '#6B6B6B' }}>
                    <Search size={13} /> 크롤링에서 가져오기
                  </Link>
                  <button onClick={() => setShowGardenPublishModal(true)} disabled={gardenCounts.ready === 0}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40"
                    style={{ border: '1.5px solid #bbf7d0', background: '#F0FDF4', color: '#15803d' }}
                    title="준비도 100%인 상품을 한 번에 발행">
                    <Send size={13} /> 준비된 것 일괄 발행 {gardenCounts.ready}
                  </button>
                  <Link href="/products/new" className="flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-sm font-bold transition"
                    style={{ background: '#F63B28' }}>
                    <Plus size={14} /> 상품 등록
                  </Link>
                </>
              ) : (
                <>
                  {/* B-3: Naver real-time sync button */}
                  <button
                  onClick={handleNaverSync}
                  disabled={naverSyncing}
                    title={naverSyncMsg || '네이버 실시간 상품 상태 동기화'}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40"
                    style={{
                      border: `1.5px solid ${Object.keys(naverMismatches).length > 0 ? '#fca5a5' : '#F8DCE5'}`,
                      background: Object.keys(naverMismatches).length > 0 ? '#fff1f1' : '#fff',
                      color: Object.keys(naverMismatches).length > 0 ? '#F63B28' : '#6B6B6B',
                    }}>
                    <RefreshCw size={13} className={naverSyncing ? 'animate-spin' : ''} />
                    {naverSyncing ? '동기화 중...' : '네이버 동기화'}
                    {Object.keys(naverMismatches).length > 0 && (
                      <span style={{ background: '#F63B28', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>
                        {Object.keys(naverMismatches).length}
                      </span>
                    )}
                  </button>
                  {naverSyncMsg && (
                    <span style={{ fontSize: 11, color: Object.keys(naverMismatches).length > 0 ? '#F63B28' : '#16a34a', fontWeight: 600 }}>
                      {naverSyncMsg}
                    </span>
                  )}
                  {/* 연동 진입점 (#245 Phase 3, 작업 F 재이식) — 구 /products/link
                      라우트를 헤더 버튼→모달로 흡수(#256 단일 목록·별도 화면 폐기). */}
                  <button onClick={() => setShowImportModal(true)} title="네이버 스토어에서 상품 가져오기 (연동)"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition"
                    style={{ border: '1.5px solid #bfdbfe', background: '#EFF6FF', color: '#1d4ed8' }}>
                    <Link2 size={13} /> 네이버 상품 가져오기
                  </button>
                </>
              )}
            </div>
          </div>
          <div style={{ height: 2.5, background: '#FFB3CE', borderRadius: 99, margin: '8px 0 6px' }} />
          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>전체 {raw.length}개 · 표시 {filtered.length}개</p>
        </div>

        {/* Toolbar */}
        {/* Phase 2-MOBILE-3 M2/M3: mobile stacks toolbar vertically so the
            6-tab pill and search input get full width each; tab pill scrolls
            horizontally on overflow. Desktop (lg+) wraps as before. */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3 lg:flex-wrap">
          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
            {/* 작업 H-2 (SCREEN_DIFFERENTIATION_SPEC_2026-07-17 §4-2) — 정원
                창고는 판매 상태(판매중/판매중지/좀비꽃) 필터가 무의미(대상 0건,
                #266)하므로 작업 단계 기준(준비 미흡/발행 가능)으로 교체.
                꽃밭 돌보기 뷰의 건수가 새어 보이던 문제의 근본 원인이었음. */}
            {isGarden ? (
              <div className="flex rounded-xl overflow-x-auto lg:overflow-hidden" style={{ background: '#fff', border: '1.5px solid #F8DCE5' }}>
                {([
                  ['notReady', '준비 미흡', gardenCounts.notReady, 'bg-rose-500'],
                  ['ready', '발행 가능', gardenCounts.ready, 'bg-green-500'],
                  ['all', '전체', gardenCounts.all, 'bg-gray-400'],
                ] as const).map(([key, label, count, dot]) => (
                  <button key={key} onClick={() => setGardenReadiness(key)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap"
                    style={{ background: gardenReadiness === key ? '#F63B28' : 'transparent', color: gardenReadiness === key ? '#fff' : '#6B6B6B' }}>
                    {gardenReadiness === key
                      ? <span className="w-1.5 h-1.5 rounded-full bg-white opacity-90" />
                      : <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    }
                    {label}
                    <span className="ml-0.5 px-1 rounded-md text-[10px] font-bold"
                      style={{ background: gardenReadiness === key ? 'rgba(255,255,255,0.9)' : '#F8DCE5', color: '#F63B28' }}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="flex rounded-xl overflow-x-auto lg:overflow-hidden" style={{ background: '#fff', border: '1.5px solid #F8DCE5' }}>
                  {PRIMARY_TAB_KEYS.map(k => (
                    <button key={k} onClick={() => { setTab(k); setSelected(new Set()); }}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap"
                      style={{ background: tab === k ? '#F63B28' : 'transparent', color: tab === k ? '#fff' : '#6B6B6B' }}>
                      {tab === k
                        ? <span className="w-1.5 h-1.5 rounded-full bg-white opacity-90" />
                        : <span className={`w-1.5 h-1.5 rounded-full ${TAB_CONFIG[k].dot}`} />
                      }
                      {TAB_CONFIG[k].label}
                      <span className="ml-0.5 px-1 rounded-md text-[10px] font-bold"
                        style={{ background: tab === k ? 'rgba(255,255,255,0.9)' : '#F8DCE5', color: '#F63B28' }}>
                        {counts[k]}
                      </span>
                    </button>
                  ))}
                </div>

                {/* 더보기 드롭다운 — 나머지 필터(전체/발행대기/네이버 등록
                    대기/품절/마진 낮음/동기화 필요)를 여기 수렴 (#256 밀도 완화).
                    작성중(정원 창고)은 사이드바 "꿀통 창고" 진입점 소관이라 여기선 제외. */}
                <div className="relative">
                  <button type="button" onClick={() => setShowMoreFilters(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
                    style={{
                      background: MORE_TAB_KEYS.includes(tab) ? '#F63B28' : '#fff',
                      color: MORE_TAB_KEYS.includes(tab) ? '#fff' : '#6B6B6B',
                      border: '1.5px solid', borderColor: MORE_TAB_KEYS.includes(tab) ? '#F63B28' : '#F8DCE5',
                    }}>
                    {MORE_TAB_KEYS.includes(tab) ? TAB_CONFIG[tab].label : '더보기'}
                    {MORE_TAB_KEYS.includes(tab) && (
                      <span className="px-1 rounded-md text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.9)', color: '#F63B28' }}>
                        {counts[tab]}
                      </span>
                    )}
                    <ChevronDown size={12} />
                  </button>
                  {showMoreFilters && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMoreFilters(false)} />
                      <div className="absolute z-50" style={{
                        top: '110%', left: 0, minWidth: 180,
                        background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 12,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
                      }}>
                        {MORE_TAB_KEYS.filter(k => k !== 'draft').map(k => (
                          <button key={k} type="button"
                            onClick={() => { setTab(k); setSelected(new Set()); setShowMoreFilters(false); }}
                            className="w-full flex items-center justify-between gap-3 px-3 py-2 text-xs font-semibold transition hover:bg-pink-50"
                            style={{ color: tab === k ? '#F63B28' : '#3A3A3A', background: tab === k ? '#FFF0F5' : 'transparent' }}>
                            <span className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${TAB_CONFIG[k].dot}`} />
                              {TAB_CONFIG[k].label}
                            </span>
                            <span className="px-1 rounded-md text-[10px] font-bold" style={{ background: '#F8DCE5', color: '#F63B28' }}>
                              {counts[k]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Phase 2-MOBILE-3 M3: full-width on mobile, fixed cap on desktop. */}
          <div className="relative w-full lg:min-w-[180px] lg:max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#D4B0BC' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="상품명, 상품코드(SKU) 검색"
              className="w-full pl-8 pr-4 py-2 text-sm rounded-xl transition"
              style={{ background: '#fff', border: '1.5px solid #F8DCE5', outline: 'none' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#FF6B8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,138,0.13)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#F8DCE5'; e.currentTarget.style.boxShadow = ''; }}
            />
          </div>

          <button onClick={() => setShowUploadReady(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{
              background: showUploadReady ? '#F63B28' : '#fff',
              color: showUploadReady ? '#fff' : '#6B6B6B',
              border: '1.5px solid', borderColor: showUploadReady ? '#F63B28' : '#F8DCE5',
            }}>
            <Upload size={12} /> 업로드 준비 미흡만
          </button>

          {/* Supplier filter badge — shown when navigated from 거래처 명단 */}
          {supplierFilter && (() => {
            const supplierName = raw.find(p => p.supplierId === supplierFilter)?.supplierName;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 12, background: '#eff6ff', border: '1.5px solid #bfdbfe' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>
                  {supplierName ?? '공급사'} 상품만 보기
                </span>
                <button
                  onClick={() => setSupplierFilter('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60a5fa', padding: 0, display: 'flex', alignItems: 'center' }}
                  title="필터 해제"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })()}
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle size={14} className="text-red-500" />
            <span className="text-sm text-red-600">{error}</span>
            <button onClick={fetchProducts} className="ml-auto text-xs text-red-500 underline">다시 시도</button>
          </div>
        )}

        {/* Phase 2-MOBILE-1c: desktop table (lg+) — unchanged behaviour.
            #222: readable (Pretendard) font on the data grid (table container
            anchor, so the page title above keeps its own font role). */}
        <div className="hidden lg:block kk-readable" style={{ background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 18, overflow: 'hidden' }}>
          <TableHeader />
          {loading ? (
            <div className="py-16 text-center">
              <RefreshCw size={24} className="animate-spin mx-auto mb-3" style={{ color: '#FFB3CE' }} />
              <p className="text-sm" style={{ color: '#B0A0A8' }}>불러오는 중...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={32} className="mx-auto mb-3" style={{ color: '#F8DCE5' }} />
              <p className="text-sm" style={{ color: '#B0A0A8' }}>표시할 상품이 없습니다</p>
              {tab !== 'all' && <button onClick={() => setTab('all')} className="mt-2 text-xs underline" style={{ color: '#F63B28' }}>전체 보기</button>}
            </div>
          ) : viewMode === 'group' ? (
            <GroupView />
          ) : tab === 'all' ? (
            // C-4: default (no status tab) view groups by status segment.
            <StatusSectionsView />
          ) : (
            <div>{filtered.map((p, idx) => renderRow(p, idx, idx === filtered.length - 1))}</div>
          )}

          {filtered.length > 0 && (
            <div className="px-4 py-2.5 flex items-center justify-between text-xs"
              style={{ borderTop: '1px solid #F8DCE5', background: '#FFF8FA', color: '#B0A0A8' }}>
              <span>{filtered.length}개 표시</span>
              <ExcelExportButton mode="filter" filters={{ status: undefined }} buttonText="전체 엑셀 다운로드"
                buttonClassName="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition" />
            </div>
          )}
        </div>

        {/* Phase 2-MOBILE-1c: mobile card stack (<lg). Reuses `filtered` and
            the same action handlers (toggleStatus / deleteProduct / Link to
            edit + studio). Cards keep the four canonical actions per row with
            44x44px touch targets. Group view collapses to a flat stack on
            mobile to keep the gesture surface predictable; rare enough that
            losing the grouping UI on small screens is acceptable. */}
        <div className="lg:hidden kk-readable">
          {loading ? (
            <div className="py-12 text-center" style={{ background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 16 }}>
              <RefreshCw size={20} className="animate-spin mx-auto mb-2" style={{ color: '#FFB3CE' }} />
              <p className="text-sm" style={{ color: '#B0A0A8' }}>불러오는 중...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center" style={{ background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 16 }}>
              <Package size={28} className="mx-auto mb-2" style={{ color: '#F8DCE5' }} />
              <p className="text-sm" style={{ color: '#B0A0A8' }}>표시할 상품이 없습니다</p>
              {tab !== 'all' && <button onClick={() => setTab('all')} className="mt-2 text-xs underline" style={{ color: '#F63B28' }}>전체 보기</button>}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {mobileList.map((p) => {
                const isSel = selected.has(p.id);
                const honey = p._hs;
                const seo = Math.max(0, Math.min(100, p._hs?.seoScore ?? 0));
                const seoColor = seo >= 75 ? '#16a34a' : seo >= 45 ? '#D97706' : '#F63B28';
                return (
                  <article
                    key={p.id}
                    style={{
                      background: '#fff',
                      border: isSel ? '1.5px solid #F63B28' : '1.5px solid #F8DCE5',
                      borderRadius: 14,
                      padding: 12,
                      wordBreak: 'keep-all',
                      boxShadow: isSel ? '0 2px 8px rgba(230,35,16,0.10)' : '0 1px 2px rgba(230,35,16,0.04)',
                    }}
                  >
                    {/* Header — checkbox + thumbnail + name + sku */}
                    <header style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggleSelect(p.id)}
                        className="w-5 h-5 rounded border-gray-300 text-[#F63B28] focus:ring-[#F63B28]/30 shrink-0"
                        style={{ marginTop: 2 }}
                      />
                      {p.mainImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.mainImage}
                          alt=""
                          width={56}
                          height={56}
                          style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 56, height: 56, borderRadius: 10,
                          background: '#FFF0F5', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Package size={22} style={{ color: '#FFB3CE' }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link
                          href={`/products/new?edit=${p.id}`}
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: '#1A1A1A',
                            textDecoration: 'none',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.35,
                          }}
                        >
                          {p.name}
                        </Link>
                        {p.sku && (
                          <p style={{
                            fontSize: 11, color: '#888', margin: '4px 0 0',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {p.sku}
                          </p>
                        )}
                      </div>
                    </header>

                    {/* Body — price / margin / SEO bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A' }}>
                        {Number(p.salePrice ?? 0).toLocaleString()}원
                      </span>
                      {typeof honey?.netMarginRate === 'number' && (
                        <span
                          style={{
                            fontSize: 11, fontWeight: 700,
                            padding: '2px 8px', borderRadius: 99,
                            background: honey.netMarginRate < 5 ? '#fef2f2' : '#F0FDF4',
                            color: honey.netMarginRate < 5 ? '#dc2626' : '#15803d',
                            border: honey.netMarginRate < 5 ? '1px solid #fecaca' : '1px solid #86efac',
                          }}
                        >
                          마진 {honey.netMarginRate.toFixed(1)}%
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 10, fontWeight: 700,
                          padding: '2px 7px', borderRadius: 99,
                          background: p.status === 'ACTIVE' ? '#dcfce7' : p.status === 'OUT_OF_STOCK' ? '#fee2e2' : '#f3f4f6',
                          color: p.status === 'ACTIVE' ? '#15803d' : p.status === 'OUT_OF_STOCK' ? '#b91c1c' : '#6b7280',
                        }}
                      >
                        {p.status === 'ACTIVE' ? '판매중' : p.status === 'OUT_OF_STOCK' ? '품절' : 'DRAFT'}
                      </span>
                    </div>

                    {/* SEO bar */}
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', marginBottom: 3 }}>
                        <span>SEO 점수</span>
                        <span style={{ fontWeight: 800, color: seoColor }}>{seo}/100</span>
                      </div>
                      <div style={{ height: 5, background: '#FFF0F5', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${seo}%`,
                          background: seoColor,
                          borderRadius: 99,
                          transition: 'width 0.2s',
                        }} />
                      </div>
                    </div>

                    {/* Actions — 44px touch targets */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, borderTop: '1px solid #F8DCE5', paddingTop: 10 }}>
                      <button
                        onClick={(e) => toggleStatus(e, p)}
                        aria-label="상태 변경"
                        style={{
                          flex: 1, minHeight: 44, minWidth: 44,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                          background: '#FFF8FA', border: '1.5px solid #F8DCE5',
                          color: p.status === 'ACTIVE' ? '#16a34a' : p.status === 'OUT_OF_STOCK' ? '#F63B28' : '#888',
                          borderRadius: 10, cursor: 'pointer',
                          fontSize: 11, fontWeight: 700,
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
                        </svg>
                        <span>상태</span>
                      </button>
                      <Link
                        href={`/products/new?edit=${p.id}`}
                        aria-label="수정"
                        style={{
                          flex: 1, minHeight: 44, minWidth: 44,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                          background: '#EFF6FF', border: '1.5px solid #BFDBFE',
                          color: '#2563EB', borderRadius: 10, textDecoration: 'none',
                          fontSize: 11, fontWeight: 700,
                        }}
                      >
                        <Edit2 size={14} />
                        <span>수정</span>
                      </Link>
                      <Link
                        href={`/studio?product=${p.id}`}
                        aria-label="온실 아틀리에"
                        style={{
                          flex: 1, minHeight: 44, minWidth: 44,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                          background: '#FFF0F5', border: '1.5px solid #FFB3CE',
                          color: '#F63B28', borderRadius: 10, textDecoration: 'none',
                          fontSize: 11, fontWeight: 700,
                        }}
                      >
                        <Palette size={14} />
                        <span>온실</span>
                      </Link>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        aria-label="삭제"
                        style={{
                          minHeight: 44, minWidth: 44,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: '#fff', border: '1.5px solid #fecaca',
                          color: '#dc2626', borderRadius: 10, cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}
              <div className="text-xs text-center" style={{ color: '#B0A0A8', marginTop: 4 }}>
                {filtered.length}개 표시
              </div>
            </div>
          )}
        </div>

        {selected.size > 0 && <div style={{ height: 72 }} />}
      </div>

      {sideProduct && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSide(null)} />
          <SidePanel product={sideProduct} inventory={inventoryByProductId[sideProduct.id]} onClose={() => setSide(null)} onDelete={deleteProduct} onMutate={handleProductMutate} onReset={handleProductReset} onStockSync={handleStockSync} />
        </>
      )}

      <BulkFloatMenu
        selectedIds={[...selected]}
        onClear={() => setSelected(new Set())}
        onApplyTemplate={() => setShowTemplateModal(true)}
        onExcelWithCheck={() => setShowReadinessModal(true)}
        onBulkStatusChange={handleBulkStatusChange}
        onNaverRegister={() => setShowNaverRegisterModal(true)}
      />

      {showNaverRegisterModal && (
        <NaverRegisterModal
          products={scored.filter(p => selected.has(p.id))}
          onClose={() => setShowNaverRegisterModal(false)}
          onSuccess={() => { setShowNaverRegisterModal(false); setSelected(new Set()); fetchProducts(); }}
        />
      )}

      {showGardenPublishModal && (
        <NaverRegisterModal
          products={gardenCounts.readyProducts}
          onClose={() => setShowGardenPublishModal(false)}
          onSuccess={() => { setShowGardenPublishModal(false); fetchProducts(); }}
        />
      )}

      {showImportModal && (
        <NaverImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => { fetchProducts(); }}
        />
      )}

      {showReadinessModal && (
        <ReadinessCheckModal
          products={scored.filter(p => selected.has(p.id))}
          onConfirm={() => {
            setShowReadinessModal(false);
            setExcelPending(true);
          }}
          onCancel={() => setShowReadinessModal(false)}
        />
      )}

      {/* excelPending handled by useEffect above — no JSX needed here */}

      {showTemplateModal && (
        <ApplyTemplateModal
          selectedIds={[...selected]}
          onClose={() => setShowTemplateModal(false)}
          onSuccess={() => { setShowTemplateModal(false); setSelected(new Set()); fetchProducts(); }}
        />
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #FFB3CE', borderTop: '3px solid #F63B28', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <ProductsPageInner />
    </Suspense>
  );
}
