'use client';
// /products — Garden Warehouse v6
// P2-1: supplier grouping, shipping badge, margin warning, bulk float menu, upload readiness filter

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Plus, RefreshCw, Search, Edit2,
  Trash2, X, Package,
  Check, AlertTriangle, Truck,
  ChevronDown, ChevronRight,
  Layers, Upload, ArrowRight,
  LayoutList,
} from 'lucide-react';
import { ExcelExportButton } from '@/components/naver/ExcelExportButton';
import { calcHoneyScore } from '@/lib/honey-score';
import { calcUploadReadiness, getReadinessColor } from '@/lib/upload-readiness';

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
}

type TabKey = 'all' | 'active' | 'pending' | 'oos' | 'reactivation' | 'draft';
type ViewMode = 'list' | 'group';
type ScoredProduct = Product & { _hs: ReturnType<typeof calcHoneyScore> };

// ─── Constants ────────────────────────────────────────────────────────────────

const TAB_CONFIG: Record<TabKey, {
  label: string; dot: string; dotLabel: string; filter: (p: Product) => boolean;
}> = {
  all:          { label: '전체',          dot: 'bg-gray-400',   dotLabel: '',              filter: () => true },
  active:       { label: '네이버 판매중', dot: 'bg-green-500',  dotLabel: '네이버 판매중', filter: p => p.status === 'ACTIVE' && !!p.naverProductId },
  pending:      { label: '등록 대기',     dot: 'bg-amber-400',  dotLabel: '앱 등록(대기)', filter: p => p.status === 'ACTIVE' && !p.naverProductId },
  oos:          { label: '품절',          dot: 'bg-[#E8001F]',  dotLabel: '품절',          filter: p => p.status === 'OUT_OF_STOCK' },
  reactivation: { label: '재활성화 필요', dot: 'bg-orange-400', dotLabel: '재활성화',      filter: p => p.status === 'INACTIVE' || p.status === 'HIDDEN' },
  draft:        { label: '초안',          dot: 'bg-gray-300',   dotLabel: '초안',          filter: p => p.status === 'DRAFT' },
};

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
    color: p.shippingFee >= 5000 ? '#e62310' : '#555',
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

function StatusDot({ product }: { product: Product }) {
  let key: TabKey = 'draft';
  if (product.status === 'ACTIVE' && product.naverProductId) key = 'active';
  else if (product.status === 'ACTIVE') key = 'pending';
  else if (product.status === 'OUT_OF_STOCK') key = 'oos';
  else if (product.status === 'INACTIVE' || product.status === 'HIDDEN') key = 'reactivation';
  const { dot, dotLabel } = TAB_CONFIG[key];
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
      <span className="text-xs whitespace-nowrap" style={{ color: '#666' }}>{dotLabel || '초안'}</span>
    </div>
  );
}

function ShippingBadge({ product }: { product: Product }) {
  if (!product.shippingTemplateId) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-lg"
        style={{ background: '#FFF0F5', color: '#e62310', border: '1px solid #FFB3CE' }}>
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

function SidePanel({ product, onClose, onDelete }: {
  product: ScoredProduct;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const { _hs: hs } = product;
  const issues = getReadinessIssues(product);
  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-50 flex flex-col"
      style={{ borderLeft: '1.5px solid #F8DCE5' }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1.5px solid #F8DCE5' }}>
        <StatusDot product={product} />
        <button onClick={onClose} className="p-1.5 hover:bg-pink-50 rounded-lg transition">
          <X size={16} style={{ color: '#9CA3AF' }} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <p className="text-lg font-bold text-gray-900 leading-snug">{product.name}</p>
          <p className="text-xs font-mono mt-1" style={{ color: '#B0A0A8' }}>{product.sku}</p>
          {product.supplierName && (
            <p className="text-xs mt-1" style={{ color: '#D4B0BC' }}>{product.supplierName}</p>
          )}
        </div>

        {/* Upload readiness */}
        <div className="rounded-2xl p-4"
          style={{ background: issues.length === 0 ? '#f0fdf4' : '#FFF0F5', border: `1px solid ${issues.length === 0 ? '#bbf7d0' : '#F8DCE5'}` }}>
          <p className="text-xs font-bold mb-2" style={{ color: issues.length === 0 ? '#16a34a' : '#e62310' }}>
            네이버 업로드 준비 {issues.length === 0 ? '— 완료' : `— ${issues.length}개 항목 미흡`}
          </p>
          {issues.length > 0 ? issues.map((issue, i) => (
            <p key={i} className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
              <AlertTriangle size={10} /> {issue}
            </p>
          )) : (
            <p className="text-xs text-green-600 flex items-center gap-1.5">
              <Check size={10} /> 카테고리 / 배송 / 이미지 모두 설정됨
            </p>
          )}
        </div>

        {/* Honey score */}
        <div className="rounded-2xl p-4" style={{ background: '#FFF0F5', border: '1px solid #F8DCE5' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold" style={{ color: '#555' }}>꿀통지수</span>
            <HoneyBadge score={hs.total} grade={hs.grade} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {([
              ['순마진', `${hs.netMarginRate.toFixed(1)}%`, hs.netMarginRate < 5],
              ['마진율', `${hs.marginRate.toFixed(1)}%`, false],
              ['SEO', `${hs.seoScore}점`, false],
            ] as [string, string, boolean][]).map(([k, v, warn]) => (
              <div key={k} className="bg-white rounded-xl p-2 text-center">
                <p style={{ color: '#B0A0A8' }}>{k}</p>
                <p className={`font-bold ${warn ? 'text-red-600' : 'text-gray-800'}`}>{v}</p>
              </div>
            ))}
          </div>
          {hs.warnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {hs.warnings.slice(0, 3).map((w, i) => (
                <p key={i} className="text-xs text-amber-600 flex items-start gap-1">
                  <AlertTriangle size={10} className="shrink-0 mt-0.5" /> {w}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Shipping */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#888' }}>배송 정보</p>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#888' }}>템플릿</span>
            <ShippingBadge product={product} />
          </div>
          {product.shippingTemplateName && (
            <p className="text-xs font-mono" style={{ color: '#B0A0A8' }}>{product.shippingTemplateName}</p>
          )}
        </div>

        {/* Prices */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#888' }}>가격 정보</p>
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

        <div className="rounded-2xl px-4 py-3" style={{ background: '#FFF0F5', border: '1px solid #FFB3CE' }}>
          <p className="text-xs font-bold mb-1" style={{ color: '#e62310' }}>꼬띠 한마디</p>
          <p className="text-xs leading-relaxed" style={{ color: '#FF6B8A' }}>{hs.kkottiDialogue}</p>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2" style={{ borderTop: '1.5px solid #F8DCE5' }}>
        <Link href={`/products/new?edit=${product.id}`}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-white rounded-xl text-sm font-bold transition"
          style={{ background: '#e62310' }}>
          <Edit2 size={14} /> 상품 수정
        </Link>
        <div className="flex gap-2">
          <ExcelExportButton mode="batch" productIds={[product.id]} buttonText="엑셀 다운로드"
            buttonClassName="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition" />
          <button onClick={() => { onDelete(product.id); onClose(); }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 transition">
            <Trash2 size={12} /> 삭제
          </button>
        </div>
      </div>
    </div>
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
            <Upload size={15} style={{ color: allPass ? '#16a34a' : '#e62310' }} />
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
                <p style={{ fontSize: 12, fontWeight: 700, color: '#e62310', margin: '0 0 2px' }}>
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
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 800, background: '#e62310', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Check size={13} /> {allPass ? '다운로드' : '그대로 다운로드'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Float Menu ──────────────────────────────────────────────────────────

function BulkFloatMenu({
  selectedIds, onClear, onApplyTemplate, onExcelWithCheck, onBulkStatusChange,
}: { selectedIds: string[]; onClear: () => void; onApplyTemplate: () => void; onExcelWithCheck: () => void; onBulkStatusChange: (status: string) => void }) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  if (selectedIds.length === 0) return null;

  const STATUS_OPTIONS = [
    { value: 'ACTIVE',        label: '등록 대기',    color: '#16a34a' },
    { value: 'OUT_OF_STOCK',  label: '품절',        color: '#e62310' },
    { value: 'INACTIVE',      label: '비활성화',    color: '#888' },
    { value: 'DRAFT',         label: '초안',        color: '#aaa' },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl"
      style={{ background: '#1A1A1A', border: '1.5px solid #333', minWidth: 520 }}>
      <span className="text-sm font-bold text-white mr-2">{selectedIds.length}개 선택</span>
      <div className="flex-1 flex items-center gap-2">
        <Link href={`/naver-seo?ids=${selectedIds.join(',')}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition"
          style={{ background: '#e62310', color: '#fff' }}>
          <Search size={12} /> 검색 조련사로 이동 <ArrowRight size={11} />
        </Link>
        <button onClick={onExcelWithCheck}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 text-white transition">
          <Upload size={12} /> 엑셀 다운로드
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer border transition ${chosen === t.id ? 'border-[#e62310] bg-red-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                <input type="radio" name="tmpl" value={t.id} checked={chosen === t.id} onChange={() => setChosen(t.id)} className="accent-[#e62310]" />
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
            style={{ background: '#e62310' }}>
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
  const [raw, setRaw]                         = useState<Product[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [tab, setTab]                         = useState<TabKey>('all');
  const [search, setSearch]                   = useState('');
  // supplierFilter: pre-populated from ?supplier= URL param (거래처 명단 연결)
  const [supplierFilter, setSupplierFilter]   = useState<string>(() => searchParams?.get('supplier') ?? '');
  const [selected, setSelected]               = useState<Set<string>>(new Set());
  const [sideProduct, setSide]                = useState<ScoredProduct | null>(null);
  const [viewMode, setViewMode]               = useState<ViewMode>('list');
  const [showUploadReady, setShowUploadReady] = useState(false);
  const [expandedGroups, setExpandedGroups]   = useState<Set<string>>(new Set());
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [excelPending, setExcelPending]             = useState(false);
  // B-3: Naver real-time sync
  const [naverSyncing, setNaverSyncing]   = useState(false);
  const [naverSyncMsg, setNaverSyncMsg]   = useState('');
  const [naverMismatches, setNaverMismatches] = useState<Record<string, string>>({});

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

  const fetchProducts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/products?limit=500');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRaw(data.products ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

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
  })), [raw]);

  const filtered = useMemo<ScoredProduct[]>(() => {
    const tabFn = TAB_CONFIG[tab].filter;
    return scored
      .filter(p => tabFn(p))
      .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
      .filter(p => !supplierFilter || p.supplierId === supplierFilter)
      .filter(p => !showUploadReady || getReadinessIssues(p).length > 0)
      .sort((a, b) => b._hs.total - a._hs.total);
  }, [scored, tab, search, supplierFilter, showUploadReady]);

  const counts = useMemo(() =>
    Object.fromEntries((Object.keys(TAB_CONFIG) as TabKey[]).map(k => [k, scored.filter(TAB_CONFIG[k].filter).length])) as Record<TabKey, number>,
    [scored]);

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
    const next: Record<string, string> = { ACTIVE: 'OUT_OF_STOCK', OUT_OF_STOCK: 'INACTIVE', INACTIVE: 'ACTIVE', DRAFT: 'ACTIVE', HIDDEN: 'ACTIVE' };
    const newStatus = next[product.status] ?? 'ACTIVE';
    await fetch(`/api/products/${product.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
    setRaw(prev => prev.map(p => p.id === product.id ? { ...p, status: newStatus } : p));
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
    setRaw(prev => prev.map(p => selected.has(p.id) ? { ...p, status } : p));
    setSelected(new Set());
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
              className="w-4 h-4 rounded border-gray-300 text-[#E8001F] focus:ring-[#E8001F]/30" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{p.name}</p>
            <p className="text-xs font-mono truncate mt-0.5" style={{ color: '#B0A0A8' }}>{p.sku}</p>
            {naverMismatches[p.id] && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#e62310', background: '#fff1f1', border: '1px solid #fca5a5', borderRadius: 6, padding: '1px 6px', marginTop: 2 }}>
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
          <p className="text-right text-sm font-semibold text-gray-900">
            {p.salePrice > 0 ? p.salePrice.toLocaleString() : '—'}<span className="text-xs font-normal" style={{ color: '#B0A0A8' }}>원</span>
          </p>
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
              style={{ color: p.status === 'ACTIVE' ? '#16a34a' : p.status === 'OUT_OF_STOCK' ? '#e62310' : '#9CA3AF' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
              </svg>
            </button>
            <Link href={`/products/new?edit=${p.id}`} className="p-1.5 rounded-lg transition text-blue-400 hover:text-blue-600 hover:bg-blue-50" title="수정"><Edit2 size={13} /></Link>
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
          className="w-4 h-4 rounded border-gray-300 text-[#E8001F] focus:ring-[#E8001F]/30" />
        {['상품명 / SKU', '상태', '공급사', '배송', '순마진', '판매가', '준비도', '점수', '관리'].map(h => (
          <span key={h} className="text-[11px] font-black tracking-wide" style={{ color: '#e62310' }}>{h}</span>
        ))}
      </div>
      <div style={{ height: 1, background: '#F8DCE5' }} />
    </>
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
                className="w-4 h-4 rounded border-gray-300 text-[#E8001F] focus:ring-[#E8001F]/30" />
              <button onClick={() => toggleExpand(key)} className="flex items-center gap-2 flex-1 min-w-0">
                {expanded ? <ChevronDown size={14} style={{ color: '#e62310' }} /> : <ChevronRight size={14} style={{ color: '#e62310' }} />}
                <span className="text-sm font-bold text-gray-800">{label}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-lg font-bold" style={{ background: '#F8DCE5', color: '#e62310' }}>{items.length}</span>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                {hasTemplateIssue && (
                  <span className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-lg"
                    style={{ background: '#FFF0F5', color: '#e62310', border: '1px solid #FFB3CE' }}>
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
      <div className="flex-1 min-w-0 p-6 space-y-4">

        {/* Page header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                  {([0,60,120,180,240,300] as number[]).map((deg, i) => {
                    const r = deg * Math.PI / 180; const cx = 26 + Math.cos(r) * 11.4; const cy = 26 + Math.sin(r) * 11.4;
                    return <ellipse key={i} cx={cx} cy={cy} rx={14} ry={10.4} transform={`rotate(${deg} ${cx} ${cy})`} fill="#e62310" />;
                  })}
                  <circle cx="26" cy="26" r="14.6" fill="#e62310" />
                </svg>
                <svg style={{ position: 'relative', zIndex: 1 }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>정원 창고</h1>
            </div>
            <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
              {/* View mode toggle */}
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid #F8DCE5', background: '#fff' }}>
                <button onClick={() => setViewMode('list')}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
                  style={{ background: viewMode === 'list' ? '#e62310' : 'transparent', color: viewMode === 'list' ? '#fff' : '#6B6B6B' }}>
                  <LayoutList size={13} /> 목록
                </button>
                <button onClick={() => setViewMode('group')}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
                  style={{ background: viewMode === 'group' ? '#e62310' : 'transparent', color: viewMode === 'group' ? '#fff' : '#6B6B6B' }}>
                  <Layers size={13} /> 공급사별
                </button>
              </div>
              {/* B-3: Naver real-time sync button */}
              <button
              onClick={handleNaverSync}
              disabled={naverSyncing}
                title={naverSyncMsg || '네이버 실시간 상품 상태 동기화'}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40"
                style={{
                  border: `1.5px solid ${Object.keys(naverMismatches).length > 0 ? '#fca5a5' : '#F8DCE5'}`,
                  background: Object.keys(naverMismatches).length > 0 ? '#fff1f1' : '#fff',
                  color: Object.keys(naverMismatches).length > 0 ? '#e62310' : '#6B6B6B',
                }}>
                <RefreshCw size={13} className={naverSyncing ? 'animate-spin' : ''} />
                {naverSyncing ? '동기화 중...' : '네이버 동기화'}
                {Object.keys(naverMismatches).length > 0 && (
                  <span style={{ background: '#e62310', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>
                    {Object.keys(naverMismatches).length}
                  </span>
                )}
              </button>
              {naverSyncMsg && (
                <span style={{ fontSize: 11, color: Object.keys(naverMismatches).length > 0 ? '#e62310' : '#16a34a', fontWeight: 600 }}>
                  {naverSyncMsg}
                </span>
              )}
              <button onClick={fetchProducts} disabled={loading}
                className="p-2 rounded-xl transition disabled:opacity-40"
                style={{ border: '1.5px solid #F8DCE5', background: '#fff' }}>
                <RefreshCw size={14} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link href="/products/new" className="flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-sm font-bold transition"
                style={{ background: '#e62310' }}>
                <Plus size={14} /> 상품 등록
              </Link>
            </div>
          </div>
          <div style={{ height: 2.5, background: '#FFB3CE', borderRadius: 99, margin: '8px 0 6px' }} />
          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>전체 {raw.length}개 · 표시 {filtered.length}개</p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-xl overflow-hidden shrink-0" style={{ background: '#fff', border: '1.5px solid #F8DCE5' }}>
            {(Object.keys(TAB_CONFIG) as TabKey[]).map(k => (
              <button key={k} onClick={() => { setTab(k); setSelected(new Set()); }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap"
                style={{ background: tab === k ? '#e62310' : 'transparent', color: tab === k ? '#fff' : '#6B6B6B' }}>
                {tab === k
                  ? <span className="w-1.5 h-1.5 rounded-full bg-white opacity-90" />
                  : <span className={`w-1.5 h-1.5 rounded-full ${TAB_CONFIG[k].dot}`} />
                }
                {TAB_CONFIG[k].label}
                <span className="ml-0.5 px-1 rounded-md text-[10px] font-bold"
                  style={{ background: tab === k ? 'rgba(255,255,255,0.9)' : '#F8DCE5', color: '#e62310' }}>
                  {counts[k]}
                </span>
              </button>
            ))}
          </div>

          <div className="relative min-w-[180px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#D4B0BC' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="상품명, SKU 검색"
              className="w-full pl-8 pr-4 py-2 text-sm rounded-xl transition"
              style={{ background: '#fff', border: '1.5px solid #F8DCE5', outline: 'none' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#FF6B8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,138,0.13)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#F8DCE5'; e.currentTarget.style.boxShadow = ''; }}
            />
          </div>

          <button onClick={() => setShowUploadReady(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{
              background: showUploadReady ? '#e62310' : '#fff',
              color: showUploadReady ? '#fff' : '#6B6B6B',
              border: '1.5px solid', borderColor: showUploadReady ? '#e62310' : '#F8DCE5',
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

        {/* Table */}
        <div style={{ background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 18, overflow: 'hidden' }}>
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
              {tab !== 'all' && <button onClick={() => setTab('all')} className="mt-2 text-xs underline" style={{ color: '#e62310' }}>전체 보기</button>}
            </div>
          ) : viewMode === 'group' ? (
            <GroupView />
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

        {selected.size > 0 && <div style={{ height: 72 }} />}
      </div>

      {sideProduct && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSide(null)} />
          <SidePanel product={sideProduct} onClose={() => setSide(null)} onDelete={deleteProduct} />
        </>
      )}

      <BulkFloatMenu
        selectedIds={[...selected]}
        onClear={() => setSelected(new Set())}
        onApplyTemplate={() => setShowTemplateModal(true)}
        onExcelWithCheck={() => setShowReadinessModal(true)}
        onBulkStatusChange={handleBulkStatusChange}
      />

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
        <div style={{ width: 32, height: 32, border: '3px solid #FFB3CE', borderTop: '3px solid #e62310', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <ProductsPageInner />
    </Suspense>
  );
}
