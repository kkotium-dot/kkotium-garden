'use client';
// /naver-seo — 검색 조련사 v2
// P2-2: category check, attribute score, inline AI accordion (3 styles), 2026 score weights
// Accepts ?ids=id1,id2 from Garden Warehouse bulk float menu

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import NaverSeoProductTable from '@/components/naver-seo/NaverSeoProductTable';
import BulkEditModal, { BulkEditData } from '@/components/naver-seo/BulkEditModal';
import AiProgressModal from '@/components/naver-seo/AiProgressModal';
import { RefreshCw, Search, Download } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku?: string;
  mainImage: string | null;
  salePrice: number;
  naverCategoryCode?: string | null;
  naver_title: string | null;
  naver_keywords: string | null;
  naver_description: string | null;
  naver_brand: string | null;
  naver_origin: string | null;
  naver_material: string | null;
  naver_color: string | null;
  naver_size: string | null;
  naver_care_instructions: string | null;
  supplierName?: string | null;
  seoScore: number;
  seoDetail?: {
    categoryScore: number;
    titleScore: number;
    attributeScore: number;
    keywordScore: number;
    imageScore: number;
  };
  suggestions: string[];
  needsImprovement: boolean;
  keywordCount: number;
  imageCount: number;
}

// Score band thresholds (2026 revised 100-point scale)
type FilterKey = 'all' | 'perfect' | 'good' | 'fair' | 'poor';

const FILTER_CONFIG: Record<FilterKey, { label: string; sub: string; color: string; bg: string; min: number; max: number }> = {
  all:     { label: '전체',      sub: '',        color: '#e62310', bg: '#FFF0F5', min: 0,  max: 100 },
  perfect: { label: '90-100점', sub: '완벽',    color: '#7C3AED', bg: '#F5F3FF', min: 90, max: 100 },
  good:    { label: '75-89점',  sub: '양호',    color: '#16a34a', bg: '#F0FDF4', min: 75, max: 89  },
  fair:    { label: '45-74점',  sub: '보통',    color: '#2563EB', bg: '#EFF6FF', min: 45, max: 74  },
  poor:    { label: '~44점',    sub: '개선필요', color: '#e62310', bg: '#FFF0EF', min: 0,  max: 44  },
};

function NaverSeoInner() {
  const searchParams = useSearchParams();
  const presetIds = searchParams.get('ids') ?? '';

  const [products, setProducts]           = useState<Product[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery]     = useState('');
  const [selectedIds, setSelectedIds]     = useState<string[]>(() =>
    presetIds ? presetIds.split(',').filter(Boolean) : []
  );
  const [showBulkEditModal, setShowBulkEditModal]   = useState(false);
  const [showProgressModal, setShowProgressModal]   = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentProduct: '' });

  useEffect(() => { fetchProducts(); }, [filter, searchQuery]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('filter', filter);
      if (searchQuery) params.append('search', searchQuery);
      if (presetIds) params.append('ids', presetIds);
      const res = await fetch('/api/naver-seo/products?' + params.toString());
      const data = await res.json();
      if (data.success) setProducts(data.products);
    } catch {
      toast.error('상품 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // Single product AI generate (called from inline accordion with style)
  const handleAiGenerate = async (productId: string, style: 'orthodox' | 'emotional' | 'niche' = 'orthodox') => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const t = toast.loading(`AI ${style === 'orthodox' ? '정석 SEO' : style === 'emotional' ? '감성 타겟' : '틈새 키워드'} 생성 중...`);
    try {
      const res = await fetch('/api/naver-seo/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, productName: product.name, style }),
      });
      const result = await res.json();
      toast.dismiss(t);
      if (result.success) {
        toast.success('AI 최적화 완료!');
        fetchProducts();
      } else throw new Error(result.error);
    } catch {
      toast.dismiss(t);
      toast.error('AI 생성 실패');
    }
  };

  // Bulk AI with style (default orthodox)
  const handleAiBulkGenerate = async (style: 'orthodox' | 'emotional' | 'niche' = 'orthodox') => {
    try {
      setProgress({ current: 0, total: selectedIds.length, currentProduct: '' });
      setShowProgressModal(true);
      const res = await fetch('/api/naver-seo/ai-generate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedIds, style }),
      });
      const result = await res.json();
      setShowProgressModal(false);
      if (result.success) {
        toast.success(`${result.successCount}개 AI 최적화 완료!${result.failCount > 0 ? ` (${result.failCount}개 실패)` : ''}`, { duration: 5000 });
        setSelectedIds([]);
        fetchProducts();
      } else throw new Error(result.error);
    } catch {
      setShowProgressModal(false);
      toast.error('AI 일괄 생성 실패');
    }
  };

  // Direct excel download from SEO page — no need to go back to 정원 창고
  const [excelDownloading, setExcelDownloading] = useState(false);
  const handleExcelDownload = async () => {
    if (selectedIds.length === 0) return;
    setExcelDownloading(true);
    const t = toast.loading(`${selectedIds.length}개 엑셀 생성 중...`);
    try {
      const res = await fetch('/api/naver/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedIds }),
      });
      if (!res.ok) throw new Error('엑셀 생성 실패');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.href = url;
      a.download = `naver_seo_${dateStr}_${selectedIds.length}개.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.dismiss(t);
      toast.success(`${selectedIds.length}개 엑셀 다운로드 완료!`);
    } catch {
      toast.dismiss(t);
      toast.error('엑셀 생성 실패');
    } finally {
      setExcelDownloading(false);
    }
  };

  const handleBulkEdit = async (data: BulkEditData) => {
    try {
      const res = await fetch('/api/naver-seo/bulk-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedIds, updates: data }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`${result.updatedCount}개 상품 수정 완료!`);
        setSelectedIds([]);
        fetchProducts();
      } else throw new Error(result.error);
    } catch {
      toast.error('일괄 수정 실패');
      throw new Error('일괄 수정 실패');
    }
  };

  // Stats from loaded products
  const stats = {
    total:   products.length,
    perfect: products.filter(p => p.seoScore >= 90).length,
    good:    products.filter(p => p.seoScore >= 75 && p.seoScore < 90).length,
    fair:    products.filter(p => p.seoScore >= 45 && p.seoScore < 75).length,
    poor:    products.filter(p => p.seoScore < 45).length,
    avg:     products.length > 0 ? Math.round(products.reduce((s, p) => s + p.seoScore, 0) / products.length) : 0,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: '24px', paddingBottom: 56 }}>

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
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
              <Search size={18} style={{ position: 'relative', zIndex: 1, color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>검색 조련사</h1>
              {presetIds && (
                <p style={{ fontSize: 11, color: '#e62310', margin: 0, marginTop: 2 }}>
                  정원 창고에서 {presetIds.split(',').length}개 상품 전달됨
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <>
                <button
                  onClick={() => handleAiBulkGenerate('orthodox')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition"
                  style={{ background: '#e62310' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                  {selectedIds.length}개 AI 최적화
                </button>
                <button
                  onClick={() => setShowBulkEditModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition"
                  style={{ background: '#fff', color: '#e62310', border: '1.5px solid #e62310' }}>
                  {selectedIds.length}개 일괄 수정
                </button>
                <button
                  onClick={handleExcelDownload}
                  disabled={excelDownloading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
                  style={{ background: '#f0fdf4', color: '#15803d', border: '1.5px solid #86efac' }}>
                  <Download size={12} />
                  {excelDownloading ? '생성 중...' : '엑셀 다운로드'}
                </button>
              </>
            )}
            <button onClick={fetchProducts} disabled={loading}
              className="p-2 rounded-xl transition disabled:opacity-40"
              style={{ border: '1.5px solid #F8DCE5', background: '#fff' }}>
              <RefreshCw size={14} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div style={{ height: 2.5, background: '#FFB3CE', borderRadius: 99, margin: '8px 0 6px' }} />
        <p style={{ fontSize: 12, color: '#888', margin: 0 }}>상품별 SEO 점수를 확인하고 최적화하세요 · 2026 기준 100점 만점</p>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Average */}
        <div style={{ background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#B0A0A8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>평균 SEO 점수</p>
            <p style={{ fontSize: 34, fontWeight: 900, color: '#e62310', lineHeight: 1, margin: 0 }}>
              {stats.avg}<span style={{ fontSize: 15, fontWeight: 700, color: '#B0A0A8' }}>점</span>
            </p>
            <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>전체 {stats.total}개 상품</p>
          </div>
          <div style={{ width: 44, height: 44, background: '#FFF0F5', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e62310" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </div>
        </div>
        {/* Filter cards */}
        {(['perfect', 'good', 'fair', 'poor'] as const).map(key => {
          const cfg = FILTER_CONFIG[key];
          const count = stats[key];
          const active = filter === key;
          return (
            <div key={key} onClick={() => setFilter(active ? 'all' : key)}
              style={{ background: active ? cfg.bg : '#fff', border: `1.5px solid ${active ? cfg.color : '#F8DCE5'}`, borderRadius: 16, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = cfg.color; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = '#F8DCE5'; }}>
              <p style={{ fontSize: 11, color: '#B0A0A8', marginBottom: 4 }}>{cfg.label}</p>
              <p style={{ fontSize: 26, fontWeight: 900, color: cfg.color, lineHeight: 1, margin: 0 }}>{count}</p>
              <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{cfg.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4B0BC" strokeWidth="2"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" placeholder="상품명, SKU로 검색..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 40, paddingRight: 16, paddingTop: 9, paddingBottom: 9, fontSize: 14, background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 12, outline: 'none', color: '#1A1A1A', boxSizing: 'border-box' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#FF6B8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,138,0.13)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#F8DCE5'; e.currentTarget.style.boxShadow = ''; }}
          />
        </div>
        {(filter !== 'all' || searchQuery) && (
          <button onClick={() => { setFilter('all'); setSearchQuery(''); }}
            style={{ padding: '9px 14px', background: '#fff', color: '#888', border: '1.5px solid #F8DCE5', borderRadius: 12, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            초기화
          </button>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
        {products.length}개 상품{selectedIds.length > 0 ? ` · ${selectedIds.length}개 선택됨` : ''} · 행을 클릭하면 AI 최적화 패널이 열립니다
      </p>

      {loading ? (
        <div className="py-16 text-center rounded-2xl" style={{ background: '#fff', border: '1.5px solid #F8DCE5' }}>
          <RefreshCw size={24} className="animate-spin mx-auto mb-3" style={{ color: '#FFB3CE' }} />
          <p className="text-sm" style={{ color: '#B0A0A8' }}>불러오는 중...</p>
        </div>
      ) : (
        <NaverSeoProductTable
          products={products}
          onProductClick={id => window.location.href = `/products/new?edit=${id}`}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onAiGenerate={handleAiGenerate}
          onRefresh={fetchProducts}
        />
      )}

      {showBulkEditModal && (
        <BulkEditModal
          isOpen={showBulkEditModal}
          onClose={() => setShowBulkEditModal(false)}
          onSubmit={handleBulkEdit}
          selectedCount={selectedIds.length}
        />
      )}
      {showProgressModal && (
        <AiProgressModal
          isOpen={showProgressModal}
          current={progress.current}
          total={progress.total}
          currentProduct={progress.currentProduct}
        />
      )}
    </div>
  );
}

export default function NaverSeoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw size={32} className="animate-spin" style={{ color: '#FFB3CE' }} />
      </div>
    }>
      <NaverSeoInner />
    </Suspense>
  );
}
