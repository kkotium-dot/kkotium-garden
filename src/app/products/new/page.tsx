'use client';
import { Suspense, useState, useEffect, useMemo, useRef, useDeferredValue, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import {
  NAVER_CATEGORIES_FULL,
  type NaverCategoryEntry,
} from '@/lib/naver/naver-categories-full';

// -- helpers derived from full 4,993-entry dataset --
function getDepth1List(): string[] {
  return Array.from(new Set(NAVER_CATEGORIES_FULL.map(c => c.d1).filter(Boolean))).sort();
}
function getDepth2List(d1: string): string[] {
  return Array.from(new Set(NAVER_CATEGORIES_FULL.filter(c => c.d1 === d1).map(c => c.d2).filter(Boolean))).sort();
}
function getDepth3List(d1: string, d2: string): string[] {
  return Array.from(new Set(NAVER_CATEGORIES_FULL.filter(c => c.d1 === d1 && c.d2 === d2).map(c => c.d3).filter(Boolean))).sort();
}
function getDepth4List(d1: string, d2: string, d3: string): string[] {
  return Array.from(new Set(NAVER_CATEGORIES_FULL.filter(c => c.d1 === d1 && c.d2 === d2 && c.d3 === d3).map(c => c.d4).filter(Boolean))).sort();
}
function getCategoryId(d1: string, d2: string, d3: string, d4: string): string {
  const match = NAVER_CATEGORIES_FULL.find(c =>
    c.d1 === d1 && c.d2 === d2 && c.d3 === d3 && (d4 ? c.d4 === d4 : !c.d4)
  );
  return match?.code ?? '';
}
interface CategorySearchResult {
  categoryId: string; depth1: string; depth2: string; depth3: string; depth4: string;
}
function searchCategories(query: string, limit = 20): CategorySearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return NAVER_CATEGORIES_FULL
    .filter(c => c.fullPath.toLowerCase().includes(q))
    .slice(0, limit)
    .map(c => ({ categoryId: c.code, depth1: c.d1, depth2: c.d2, depth3: c.d3, depth4: c.d4 }));
}
import {
  KKOTIUM_DEFAULTS, COURIER_CODES, SHIPPING_FEE_TYPES, TAX_TYPES, ORIGIN_CODES,
} from '@/lib/naver/codes';
import { NAVER_EXCEL_COLUMNS } from '@/lib/naver/columns';
import { calcSeoScore } from '@/lib/seo-calculator';
import type { SeoResult } from '@/lib/seo-calculator';
import { MarginCalculator } from '@/components/products/MarginCalculator';
import { BulkEditModal } from '@/components/products/BulkEditModal';
import { ShippingTemplateModal, type ShippingTemplateItem } from '@/components/products/ShippingTemplateModal';
import NaverSEOWorkflow from '@/components/ai/NaverSEOWorkflow';
import HoneyScorePanel from '@/components/products/HoneyScorePanel';
import AlternativeProductPanel from '@/components/products/AlternativeProductPanel';
import ImageUploadDropzone from '@/components/products/ImageUploadDropzone';
import { PlatformPicker, SupplierPicker } from '@/components/ui/PlatformSupplierPicker';
import MarginAdvisorPanel from '@/components/products/MarginAdvisorPanel';
import { calcUploadReadiness, getReadinessColor, READINESS_GRADE_STYLE } from '@/lib/upload-readiness';

interface Platform { id: string; name: string; code: string; }
interface Supplier {
  id: string; name: string; code: string; abbr?: string | null;
  platformCode?: string; platformId?: string; defaultMargin?: number;
}
interface ShippingTemplate {
  id: string; name: string; naverTemplateNo: string | null;
  shippingFee: number; freeThreshold: number | null;
  returnFee: number; exchangeFee: number; courierCode: string;
}
interface OptionRow { id: string; value: string; price: string; stock: string; status?: 'ON' | 'OUT' | 'OFF'; }

const inp = 'w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent bg-white transition';
const sel = inp + ' appearance-none cursor-pointer';

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5">
        <label className="text-sm font-semibold" style={{ color: '#2A2A2A' }}>{label}</label>
        {required && <span className="text-xs" style={{ color: '#e62310' }}>*</span>}
      </div>
      {children}
      {hint && <p className="mt-1 text-xs" style={{ color: '#666' }}>{hint}</p>}
    </div>
  );
}

function RSection({ number, title, badge, children }: {
  number: number; title: string; badge?: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: '#fff', border: '1.5px solid #F8DCE5', borderRadius: 18 }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 transition-colors"
        style={{ borderRadius: '18px 18px 0 0' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FFF8FA'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
            style={{ background: '#e62310' }}
          >{number}</span>
          <span className="font-semibold" style={{ color: '#1A1A1A' }}>{title}</span>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#e62310' }} />
          {badge && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FFF0F5', color: '#e62310' }}>{badge}</span>}
        </div>
        <span style={{ color: '#888', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-6 pb-6 pt-1 space-y-4" style={{ borderTop: '1px solid #F8DCE5' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function DSection({ icon, title, summary, children }: {
  icon: string; title: string; summary: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        border: open ? '1.5px solid #FFB3CE' : '1.5px solid #F8DCE5',
        borderRadius: 16,
        background: '#fff',
        transition: 'border-color 0.15s',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 transition-colors"
        style={{ background: open ? '#FFF0F5' : 'transparent', borderRadius: 16 }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.background = '#FFF8FA'; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{icon}</span>
          <span className="font-medium text-sm shrink-0" style={{ color: '#2A2A2A' }}>{title}</span>
          {!open && (
            <span
              className="text-xs px-2.5 py-1 rounded-full truncate max-w-xs"
              style={{ background: '#FFF0F5', color: '#888' }}
            >
              {summary}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {!open && <span className="text-xs font-medium" style={{ color: '#e62310' }}>수정 가능 ›</span>}
          <span style={{ color: '#888', fontSize: 12 }}>{open ? '▲ 접기' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-4 space-y-4" style={{ borderTop: '1px solid #FFB3CE' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function NewProductPageInner() {
  const searchParams = useSearchParams();
  const [catTab, setCatTab]             = useState<'search'|'drill'>('drill');
  const [catQuery, setCatQuery]         = useState('');
  const [catResults, setCatResults]     = useState<CategorySearchResult[]>([]);
  const [catOpen, setCatOpen]           = useState(false);
  const [catActiveIdx, setCatActiveIdx] = useState(0);
  const catInputRef = useRef<HTMLInputElement>(null);
  const deferredCatQuery = useDeferredValue(catQuery);

  const [d1, setD1] = useState('');
  const [d2, setD2] = useState('');
  const [d3, setD3] = useState('');
  const [d4, setD4] = useState('');
  const [productName, setProductName] = useState('');
  const [sellerCode, setSellerCode]         = useState('');
  const [supplierProductCode, setSupplierProductCode] = useState('');
  const [price, setPrice]                   = useState('');
  const [supplierPrice, setSupplierPrice]   = useState('');
  const [stock, setStock]                   = useState('100');
  const [taxType, setTaxType]               = useState(KKOTIUM_DEFAULTS.taxType);
  const [originCode, setOriginCode]         = useState(KKOTIUM_DEFAULTS.originCode);
  const [originQuery, setOriginQuery]       = useState('');
  const [originOpen, setOriginOpen]         = useState(false);
  const [originActiveIdx, setOriginActiveIdx] = useState(0);
  const [importerName, setImporterName]     = useState('');
  const originInputRef = useRef<HTMLInputElement>(null);
  const originListRef  = useRef<HTMLDivElement>(null);
  const [brand, setBrand]                   = useState(KKOTIUM_DEFAULTS.brand);
  const [platforms, setPlatforms]           = useState<Platform[]>([]);
  const [suppliers, setSuppliers]           = useState<Supplier[]>([]);
  const [selectedPlatformId, setSelectedPlatformId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierQuery, setSupplierQuery]   = useState('');
  const [supplierOpen, setSupplierOpen]     = useState(false);
  const [supplierActiveIdx, setSupplierActiveIdx] = useState(0);
  const supplierInputRef = useRef<HTMLInputElement>(null);
  const deferredSupplierQuery = useDeferredValue(supplierQuery);
  const [optionType, setOptionType]   = useState<'NONE'|'COMBINATION'|'SINGLE'|'DIRECT'>('NONE');
  const [optionNames, setOptionNames] = useState<string[]>(['']);
  const [optionValueInputs, setOptionValueInputs] = useState<string[]>(['']);
  const [directOptionNames, setDirectOptionNames] = useState<string[]>(['']);
  const [optionRows, setOptionRows]   = useState<OptionRow[]>([{ id: uuidv4(), value: '', price: '0', stock: '100' }]);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false);
  const [mainImage, setMainImage]     = useState('');
  const [additionalImages, setAdditionalImages] = useState('');
  const [detailImageUrl, setDetailImageUrl] = useState('');
  const [seoHook, setSeoHook]         = useState('');
  const [description, setDescription] = useState('');
  // D1: golden keywords from AI SEO workflow — stored in DB via keywords JSON column
  const [aiKeywords, setAiKeywords]   = useState<string[]>([]);
  // D1: SEO tags — Naver actual limit 10 tags
  const [seoTags, setSeoTags] = useState<string[]>([]);
  // Tag inline input state
  const [tagInputVal, setTagInputVal] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [shippingTemplates, setShippingTemplates]   = useState<ShippingTemplate[]>([]);
  const selectedTemplate = shippingTemplates.find(t => t.id === selectedTemplateId) || null;
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [selectedShippingTemplate, setSelectedShippingTemplate] = useState<ShippingTemplateItem | null>(null);
  const [deliveryFeeType, setDeliveryFeeType]       = useState(KKOTIUM_DEFAULTS.shippingFeeType);
  const [basicDeliveryFee, setBasicDeliveryFee]     = useState(String(KKOTIUM_DEFAULTS.shippingFee));
  const [conditionalFreeAmount, setConditionalFreeAmount] = useState(String(KKOTIUM_DEFAULTS.freeShippingMin));
  const [returnFee, setReturnFee]     = useState(String(KKOTIUM_DEFAULTS.returnShippingFee));
  const [exchangeFee, setExchangeFee] = useState(String(KKOTIUM_DEFAULTS.exchangeShippingFee));
  const [courierCode, setCourierCode] = useState(KKOTIUM_DEFAULTS.courierCode);
  const [asPhone, setAsPhone]         = useState(KKOTIUM_DEFAULTS.asPhone);
  const [asGuide, setAsGuide]         = useState(KKOTIUM_DEFAULTS.asGuide);
  const [noticeTemplateCode, setNoticeTemplateCode] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountUnit, setDiscountUnit]   = useState('%');
  const [textReviewPoint, setTextReviewPoint]   = useState('100');
  const [photoReviewPoint, setPhotoReviewPoint] = useState('500');
  const [installmentMonths, setInstallmentMonths] = useState('0');
  const [reviewVisible, setReviewVisible] = useState('Y');
  // Alternative products (collected pre-save for registration page)
  const [pendingAlternatives, setPendingAlternatives] = useState<any[]>([]);
  // Store settings — free shipping threshold from /settings/store
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(30000);
  // C3: SKU duplicate check state
  const [skuStatus, setSkuStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const skuCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError]     = useState('');
  const [success, setSuccess]   = useState(false);
  const [naverLoading, setNaverLoading] = useState(false);
  const [naverResult, setNaverResult]   = useState<{ ok: boolean; message: string } | null>(null);

  // Quick-add / edit modals for platform and supplier
  const PLATFORM_CODES_VALID = ['DMM', 'DMK', 'OWN', 'ETC'] as const;
  // platQuickMode: 'add' | 'edit'
  const [platQuickOpen, setPlatQuickOpen] = useState(false);
  const [platQuickMode, setPlatQuickMode] = useState<'add'|'edit'>('add');
  const [platQuickEditId, setPlatQuickEditId] = useState('');
  const [platQuickSaving, setPlatQuickSaving] = useState(false);
  const [platQuickName, setPlatQuickName] = useState('');
  const [platQuickCode, setPlatQuickCode] = useState('');
  const [platQuickUrl, setPlatQuickUrl] = useState('');
  const [platQuickError, setPlatQuickError] = useState('');

  // supQuickMode: 'add' | 'edit'
  const [supQuickOpen, setSupQuickOpen] = useState(false);
  const [supQuickMode, setSupQuickMode] = useState<'add'|'edit'>('add');
  const [supQuickEditId, setSupQuickEditId] = useState('');
  const [supQuickSaving, setSupQuickSaving] = useState(false);
  const [supQuickName, setSupQuickName] = useState('');
  const [supQuickAbbr, setSupQuickAbbr] = useState('');
  const [supQuickPlatformCode, setSupQuickPlatformCode] = useState('');
  const [supQuickMargin, setSupQuickMargin] = useState('30');
  const [supQuickContact, setSupQuickContact] = useState('');
  const [supQuickError, setSupQuickError] = useState('');

  // Supplier auto-mapping state (from crawler prefill)
  const [crawlMapBanner, setCrawlMapBanner] = useState<{
    type: 'matched' | 'notfound';
    sellerId: string;
    sellerNick?: string;
    supplierName?: string;
    supplierId?: string;
    shipFee?: number;
    canMerge?: boolean;
  } | null>(null);
  const [showTemplateCreateModal, setShowTemplateCreateModal] = useState(false);
  const [pendingTemplateData, setPendingTemplateData] = useState<{
    name: string; code: string; shippingType: number;
    shippingFee: number; freeThreshold?: number;
    supplierId?: string;
  } | null>(null);

  // Korean initial consonant -> uppercase letter mapping (index 11 = 'ㅇ' maps to 'NG' not empty)
  // Moved to component body but defined as stable ref-independent function
  // CHO_MAP covers all 19 Korean initial consonants
  const quickAutoCode = (name: string): string => {
    const CHO_MAP = ['G','GG','N','D','DD','R','M','B','BB','S','SS','NG','J','JJ','CH','K','T','P','H'];
    // Prefer English chars if present
    const eng = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (eng.length >= 2) return eng.slice(0, 5);
    // Extract Korean initial consonants
    let r = '';
    for (const ch of name) {
      const cp = ch.charCodeAt(0);
      if (cp >= 0xAC00 && cp <= 0xD7A3) {
        const cho = CHO_MAP[Math.floor((cp - 0xAC00) / 588)];
        if (cho) r += cho;
      }
    }
    const result = r.slice(0, 5);
    return result.length >= 2 ? result : (eng.slice(0, 5) || 'NEW');
  };

  const reloadPlatformsAndSuppliers = async () => {
    const [pr, sr] = await Promise.all([
      fetch('/api/platforms?includeInactive=false', { cache: 'no-store' }).then(r => r.ok ? r.json() : { platforms: [] }),
      fetch('/api/suppliers', { cache: 'no-store' }).then(r => r.ok ? r.json() : { suppliers: [] }),
    ]);
    if (pr.platforms) setPlatforms(pr.platforms);
    if (sr.suppliers) setSuppliers(sr.suppliers);
  };

  const openPlatformAdd = () => {
    setPlatQuickMode('add');
    setPlatQuickEditId('');
    setPlatQuickName('');
    setPlatQuickCode('');
    setPlatQuickUrl('');
    setPlatQuickError('');
    setPlatQuickOpen(true);
  };

  const openPlatformEdit = (plat: Platform) => {
    setPlatQuickMode('edit');
    setPlatQuickEditId(plat.id);
    setPlatQuickName(plat.name);
    setPlatQuickCode(plat.code);
    setPlatQuickUrl((plat as any).url ?? '');
    setPlatQuickError('');
    setPlatQuickOpen(true);
  };

  const saveQuickPlatform = async () => {
    if (!platQuickName.trim()) { setPlatQuickError('플랫폼 이름을 입력해주세요'); return; }
    if (platQuickMode === 'add' && !platQuickCode.trim()) { setPlatQuickError('코드를 입력해주세요'); return; }
    setPlatQuickSaving(true);
    setPlatQuickError('');
    try {
      const isEdit = platQuickMode === 'edit';
      const res = await fetch(
        isEdit ? `/api/platforms/${platQuickEditId}` : '/api/platforms',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: platQuickName.trim(),
            ...(isEdit ? {} : { code: platQuickCode.trim().toUpperCase() }),
            url: platQuickUrl.trim() || null,
          }),
        }
      );
      const d = await res.json();
      if (d.success) {
        await reloadPlatformsAndSuppliers();
        if (!isEdit) setSelectedPlatformId(d.platform.id);
        setPlatQuickOpen(false);
      } else {
        setPlatQuickError(d.error ?? '저장 실패');
      }
    } finally { setPlatQuickSaving(false); }
  };

  const deleteQuickPlatform = async (id: string, name: string) => {
    if (!confirm(`'${name}' 플랫폼을 삭제할까요? 연결된 공급사가 있으면 비활성화됩니다.`)) return;
    const res = await fetch(`/api/platforms/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (d.success) {
      if (selectedPlatformId === id) { setSelectedPlatformId(''); commitSupplier(''); }
      await reloadPlatformsAndSuppliers();
    }
  };

  const openSupplierAdd = () => {
    const plat = platforms.find(p => p.id === selectedPlatformId);
    setSupQuickMode('add');
    setSupQuickEditId('');
    setSupQuickName('');
    setSupQuickAbbr('');
    setSupQuickPlatformCode(plat?.code?.toUpperCase() ?? (platforms[0]?.code ?? ''));
    setSupQuickMargin('30');
    setSupQuickContact('');
    setSupQuickError('');
    setSupQuickOpen(true);
  };

  const openSupplierEdit = (sup: Supplier) => {
    setSupQuickMode('edit');
    setSupQuickEditId(sup.id);
    setSupQuickName(sup.name);
    setSupQuickAbbr(sup.abbr ?? '');
    setSupQuickPlatformCode(sup.platformCode ?? '');
    setSupQuickMargin(String(sup.defaultMargin ?? 30));
    setSupQuickContact((sup as any).contact ?? '');
    setSupQuickError('');
    setSupQuickOpen(true);
  };

  const saveQuickSupplier = async () => {
    const name = supQuickName.trim();
    if (!name) { setSupQuickError('공급사 이름을 입력해주세요'); return; }
    const abbr = supQuickAbbr.trim().toUpperCase();
    if (!abbr || abbr.length < 2 || abbr.length > 4) { setSupQuickError('abbr은 2~4자리 대문자'); return; }
    const isEdit = supQuickMode === 'edit';
    const platCode = supQuickPlatformCode;
    const plat = platforms.find(p => p.code.toUpperCase() === platCode.toUpperCase());
    setSupQuickSaving(true);
    setSupQuickError('');
    try {
      const body = isEdit
        ? { name, abbr, defaultMargin: Number(supQuickMargin) || 30, contact: supQuickContact.trim() || null }
        : {
            name,
            code: `${platCode}-${quickAutoCode(name)}`,
            abbr,
            platformCode: platCode,
            platformId: plat?.id || undefined,
            defaultMargin: Number(supQuickMargin) || 30,
            contact: supQuickContact.trim() || null,
          };
      const res = await fetch(
        isEdit ? `/api/suppliers/${supQuickEditId}` : '/api/suppliers',
        { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
      const d = await res.json();
      if (d.success) {
        await reloadPlatformsAndSuppliers();
        if (!isEdit) await commitSupplier(d.supplier.id);
        setSupQuickOpen(false);
      } else {
        setSupQuickError(d.error ?? '저장 실패');
      }
    } finally { setSupQuickSaving(false); }
  };

  const deleteQuickSupplier = async (id: string, name: string) => {
    if (!confirm(`'${name}' 공급사를 삭제할까요? 상품이 연결된 경우 비활성화됩니다.`)) return;
    const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (d.success) {
      if (selectedSupplierId === id) await commitSupplier('');
      await reloadPlatformsAndSuppliers();
    }
  };

  const seoResult: SeoResult = useMemo(() => calcSeoScore({
    productName, brand,
    keywords: aiKeywords.join(','),
    mainImage, description,
    categoryId: getCategoryId(d1, d2, d3, d4),
  }), [productName, brand, aiKeywords, mainImage, description, d1, d2, d3, d4]);

  // Prefill from crawler pipeline (?prefill=base64)
  useEffect(() => {
    const raw = searchParams?.get('prefill');
    if (!raw) return;
    try {
      // Decode UTF-8-safe Base64 using TextDecoder (handles Korean + any Unicode)
      // Encoder uses: btoa(unescape(encodeURIComponent(JSON.stringify(data))))
      const bin = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 0xff;
      // Strip control characters that break JSON.parse
      const jsonStr = new TextDecoder('utf-8').decode(bytes)
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
      const data = JSON.parse(jsonStr);
      if (data.productName)    setProductName(data.productName);
      if (data.supplierPrice)  setSupplierPrice(String(data.supplierPrice));
      if (data.salePrice)      setPrice(String(data.salePrice));
      if (data.mainImage)      setMainImage(data.mainImage);
      if (data.additionalImgs) setAdditionalImages(data.additionalImgs);
      if (data.description)    setDescription(data.description);
      // Inject crawlSourceUrl into URL so handleGenerate can mark sourcing log REGISTERED
      if (data.crawlSourceUrl && typeof window !== 'undefined') {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('crawlUrl', encodeURIComponent(data.crawlSourceUrl));
        window.history.replaceState(null, '', currentUrl.toString());
      }
      // Auto-fill category from crawler suggestion
      if (data.catD1 && data.catD2 && data.catD3) {
        setD1(data.catD1); setD2(data.catD2); setD3(data.catD3);
        if (data.catD4) setD4(data.catD4);
        setCatTab('drill');
      }
      // Auto-fill options from crawler — convert to SINGLE type with visible rows
      if (Array.isArray(data.options) && data.options.length > 0) {
        const cleanOpts = (data.options as string[]).filter((o: string) => typeof o === 'string' && o.trim().length > 0);
        if (cleanOpts.length > 0) {
          setOptionType('SINGLE');
          setOptionNames(['옵션']);
          // Set the comma-separated input (used by the text input field)
          setOptionValueInputs([cleanOpts.join(',')]);
          // Also directly populate optionRows so the table shows immediately
          // This bypasses the need to click "옵션목록으로 적용"
          setOptionRows(cleanOpts.map((opt: string) => ({
            id: uuidv4(),
            value: opt.trim(),
            price: '0',
            stock: '100',
            status: 'ON' as const,
          })));
        }
      }
      setError('');
    } catch {
      // ignore malformed prefill
    }
  }, [searchParams]);

  // Supplier auto-mapping from crawler prefill (crawlSellerId)
  useEffect(() => {
    const raw = searchParams?.get('prefill');
    if (!raw) return;
    try {
      const bin = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) & 0xff;
      const jsonStr = new TextDecoder('utf-8').decode(bytes).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
      const data = JSON.parse(jsonStr);
      const sellerId = data.crawlSellerId;
      if (!sellerId) return;

      // Look up supplier by domeggookSellerId
      fetch(`/api/suppliers?domeggookSellerId=${encodeURIComponent(sellerId)}`)
        .then(r => r.json())
        .then(async (res) => {
          if (res.success && res.suppliers?.length > 0) {
            const sup = res.suppliers[0];
            // Auto-select platform + supplier + primary shipping template
            if (sup.platformId) setSelectedPlatformId(sup.platformId);
            await commitSupplier(sup.id);

            // After commitSupplier sets the primary template, check if it fits
            // crawl data (shipFee/canMerge). If no template exists, offer auto-create.
            const shipFee   = data.crawlShipFee  ?? 3000;
            const canMerge  = data.crawlCanMerge ?? true;
            const saleNum   = Number(data.salePrice) || 0;

            // Kkotti recommended type based on crawl data
            const recType: 'free' | 'paid' | 'conditional' =
              shipFee === 0        ? 'free' :
              saleNum >= 25000     ? 'free' :
              saleNum >= 10000     ? 'conditional' : 'paid';

            // Check if a matching template already exists for this supplier
            const templatesRes = await fetch(`/api/shipping-templates?supplierId=${sup.id}`);
            const templatesData = await templatesRes.json();
            const templates: any[] = templatesData.templates ?? [];

            const typeMap: Record<string, number> = { free: 4, conditional: 3, paid: 1 };
            const targetType = typeMap[recType];
            const matchedTemplate = templates.find((t: any) => Number(t.shippingType) === targetType);

            if (matchedTemplate) {
              // Apply the matched template directly
              setSelectedShippingTemplate({
                id: matchedTemplate.id,
                name: matchedTemplate.name,
                naverTemplateNo: matchedTemplate.naverTemplateNo,
                memo: matchedTemplate.memo ?? null,
                platformCode: matchedTemplate.platformCode ?? null,
                supplierCode: matchedTemplate.supplierCode ?? null,
                active: matchedTemplate.active ?? true,
                shippingFee: matchedTemplate.shippingFee,
                shippingFeeType: String(matchedTemplate.shippingType),
                freeThreshold: matchedTemplate.freeThreshold,
                returnFee: matchedTemplate.returnFee,
                exchangeFee: matchedTemplate.exchangeFee,
                courierCode: matchedTemplate.courierCode,
              });
              setSelectedTemplateId(matchedTemplate.id);
              setBasicDeliveryFee(String(matchedTemplate.shippingFee));
              setReturnFee(String(matchedTemplate.returnFee));
              setExchangeFee(String(matchedTemplate.exchangeFee));
              setCourierCode(matchedTemplate.courierCode);
              const feeType =
                Number(matchedTemplate.shippingType) === 4 ? '무료' :
                Number(matchedTemplate.shippingType) === 3 ? '조건부무료' : '유료';
              setDeliveryFeeType(feeType);
              if (Number(matchedTemplate.shippingType) === 3 && matchedTemplate.freeThreshold) {
                setConditionalFreeAmount(String(matchedTemplate.freeThreshold));
              }
            } else {
              // No matching template — prepare auto-create modal data
              const plat = sup.platformCode ?? 'KKT';
              const abbr = sup.abbr ?? sup.code?.toUpperCase() ?? 'SUP';
              const typeLabels: Record<string, string> = {
                free: '무료', conditional: '조건부', paid: '유료',
              };
              const typeCodes: Record<string, string> = {
                free: 'FREE', conditional: 'COND', paid: 'PAID',
              };
              const suggestedName = recType === 'conditional'
                ? `${plat}_${abbr}_조건부_30000`
                : recType === 'free'
                ? `${plat}_${abbr}_무료`
                : `${plat}_${abbr}_유료_${shipFee}`;
              const suggestedCode = `${plat}-${abbr}-${typeCodes[recType]}-${Date.now()}`.toLowerCase();

              setPendingTemplateData({
                name: suggestedName,
                code: suggestedCode,
                shippingType: targetType,
                shippingFee: recType === 'free' ? 0 : shipFee,
                freeThreshold: recType === 'conditional' ? 30000 : undefined,
                supplierId: sup.id,
              });
              setShowTemplateCreateModal(true);
            }

            setCrawlMapBanner({
              type: 'matched',
              sellerId,
              sellerNick: data.crawlSellerNick ?? undefined,
              supplierName: sup.name,
              supplierId: sup.id,
              shipFee,
              canMerge,
            });
          } else {
            // Supplier not found — show register prompt
            setCrawlMapBanner({
              type: 'notfound',
              sellerId,
              sellerNick: data.crawlSellerNick ?? undefined,
              shipFee: data.crawlShipFee ?? undefined,
              canMerge: data.crawlCanMerge ?? undefined,
            });
          }
        })
        .catch(() => { /* non-critical — ignore */ });
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Load existing product for editing (?edit=productId)
  useEffect(() => {
    const editId = searchParams?.get('edit');
    if (!editId) return;
    fetch(`/api/products/${editId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success || !d.product) return;
        const p = d.product;
        if (p.name)          setProductName(p.name);
        if (p.salePrice)     setPrice(String(p.salePrice));
        if (p.supplierPrice) setSupplierPrice(String(p.supplierPrice ?? 0));
        if (p.mainImage)     setMainImage(p.mainImage);
        if (p.description)   setDescription(p.description ?? '');
        if (p.brand)         setBrand(p.brand);
        if (p.originCode)    setOriginCode(p.originCode);
        if (p.sku)           setSellerCode(p.sku);
        // Restore image fields
        if (p.detail_image_url)   setDetailImageUrl(p.detail_image_url);
        if (p.images && Array.isArray(p.images) && p.images.length > 0)
          setAdditionalImages(p.images.join(','));
        // Restore SEO fields
        if (p.seoHook)           setSeoHook(p.seoHook);
        if (p.naver_keywords)    setAiKeywords(
          typeof p.naver_keywords === 'string'
            ? p.naver_keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
            : (p.naver_keywords as string[])
        );
        // Restore shipping template
        if (p.shippingTemplateId) setSelectedTemplateId(p.shippingTemplateId);
        // Restore category drill-down from stored code
        if (p.naverCategoryCode) {
          const found = NAVER_CATEGORIES_FULL.find(c => c.code === p.naverCategoryCode);
          if (found) {
            setD1(found.d1); setD2(found.d2); setD3(found.d3); setD4(found.d4?? '');
          }
        }
        if (Array.isArray(p.keywords) && p.keywords.length > 0) setAiKeywords(p.keywords as string[]);
        if (Array.isArray(p.tags) && p.tags.length > 0)         setSeoTags(p.tags as string[]);
      })
      .catch(() => null);
  }, [searchParams]);

  // Prefill product name from Kkotti recommendation (?prefillName=...)
  useEffect(() => {
    const name = searchParams?.get('prefillName');
    if (name) setProductName(decodeURIComponent(name));
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/platforms?includeInactive=false', { cache: 'no-store' }).then(r => r.ok ? r.json() : { platforms: [] })
      .then(d => setPlatforms(d.platforms || [])).catch(() => {});
    fetch('/api/suppliers').then(r => r.ok ? r.json() : { data: [] })
      .then(d => setSuppliers(d.data || d.suppliers || [])).catch(() => {});
    fetch('/api/shipping-templates').then(r => r.ok ? r.json() : { templates: [] })
      .then(d => setShippingTemplates(d.templates || d.data || [])).catch(() => {});
    // Load store settings for free shipping threshold
    fetch('/api/store-settings').then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.success && d.settings?.freeShippingThreshold) setFreeShippingThreshold(d.settings.freeShippingThreshold); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = deferredCatQuery.trim();
    if (!q) {
      setCatResults([]);
      return;
    }
    setCatResults(searchCategories(q, 20));
    setCatActiveIdx(0);
  }, [deferredCatQuery]);

  const commitCategory = (r: CategorySearchResult) => {
    setD1(r.depth1);
    setD2(r.depth2);
    setD3(r.depth3);
    setD4(r.depth4);
    setCatQuery('');
    setCatResults([]);
    setCatOpen(false);
    setCatTab('drill');
  };

  const handleDiscountApplied = (result: { discountRate: number; originalPrice: number }) => {
    setDiscountValue(String(result.discountRate));
    setDiscountUnit('%');
    setPrice(String(result.originalPrice));
  };

  // Build SKU prefix from current platform + supplier selection
  // Priority: platform.code + supplier.abbr > supplier.code > fallback KKT
  const buildSkuPrefix = (platId: string, suppId: string): string => {
    const plat = platforms.find(p => p.id === platId);
    const sup  = suppliers.find(s => s.id === suppId);
    if (plat && sup?.abbr)  return `${plat.code}-${sup.abbr}`;
    if (plat && sup)        return `${plat.code}-${sup.code.split('-').pop() ?? sup.code}`;
    if (sup?.abbr)          return sup.abbr;
    if (sup)                return sup.code.toUpperCase();
    if (plat)               return plat.code;
    return 'KKT';
  };

  // C3: Debounced SKU duplicate check
  const checkSkuAvailability = useCallback((sku: string) => {
    if (skuCheckTimerRef.current) clearTimeout(skuCheckTimerRef.current);
    if (!sku.trim()) { setSkuStatus('idle'); return; }
    setSkuStatus('checking');
    skuCheckTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/generate-sku?sku=${encodeURIComponent(sku.trim())}`);
        const data = await res.json();
        setSkuStatus(data.available ? 'available' : 'taken');
      } catch {
        setSkuStatus('idle');
      }
    }, 300);
  }, []);

  // Auto-generate seller code from supplier product code
  const handleSupplierProductCode = (val: string) => {
    setSupplierProductCode(val);
    if (val.trim()) {
      const prefix = buildSkuPrefix(selectedPlatformId, selectedSupplierId);
      const newSku = `${prefix}-${val.trim().toUpperCase()}`;
      setSellerCode(newSku);
      checkSkuAvailability(newSku);
    } else {
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const rand = Math.random().toString(36).substring(2,6).toUpperCase();
      const fallback = `KKT-${ymd}-${rand}`;
      setSellerCode(fallback);
      setSkuStatus('idle');
    }
  };

  const selectedOrigin = useMemo(() => ORIGIN_CODES.find(o => o.code === originCode), [originCode]);
  const isImporter = selectedOrigin?.importer === true;

  // Deferred query prevents input lag on large lists
  const deferredOriginQuery = useDeferredValue(originQuery);
  const originCandidates = useMemo(() => {
    const q = deferredOriginQuery.trim().toLowerCase();
    if (!q) {
      const pinned = selectedOrigin ? [selectedOrigin] : [];
      const rest = ORIGIN_CODES.filter(o => o.code !== selectedOrigin?.code).slice(0, 19);
      return [...pinned, ...rest];
    }
    return ORIGIN_CODES.filter(o => o.label.toLowerCase().includes(q) || o.code.includes(q)).slice(0, 30);
  }, [deferredOriginQuery, selectedOrigin]);

  const commitOrigin = (code: string) => {
    const target = ORIGIN_CODES.find(o => o.code === code);
    setOriginCode(code);
    setOriginQuery('');
    setOriginOpen(false);
    setOriginActiveIdx(0);
    if (!target?.importer) setImporterName('');
  };

  // Supplier combobox: search by name + code, pin selected
  const supplierCandidates = useMemo(() => {
    const q = deferredSupplierQuery.trim().toLowerCase();
    const selected = suppliers.find(s => s.id === selectedSupplierId);
    if (!q) {
      const pinned = selected ? [selected] : [];
      const rest = suppliers.filter(s => s.id !== selected?.id).slice(0, 19);
      return [...pinned, ...rest];
    }
    return suppliers
      .map(s => {
        let score = 0;
        const name = s.name.toLowerCase();
        const code = s.code.toLowerCase();
        if (name === q || code === q) score += 100;
        else if (name.startsWith(q) || code.startsWith(q)) score += 60;
        else if (name.includes(q) || code.includes(q)) score += 20;
        return { ...s, score };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [deferredSupplierQuery, suppliers, selectedSupplierId]);

  const commitSupplier = async (id: string) => {
    setSelectedSupplierId(id);
    const s = suppliers.find(sup => sup.id === id);
    setSupplierQuery(s ? `${s.name} (${s.code})` : '');
    setSupplierOpen(false);
    setSupplierActiveIdx(0);
    // Re-generate seller code when supplier changes
    if (supplierProductCode.trim()) {
      const plat = platforms.find(p => p.id === selectedPlatformId);
      let prefix: string;
      if (plat && s?.abbr)  prefix = `${plat.code}-${s.abbr}`;
      else if (plat && s)   prefix = `${plat.code}-${s.code.split('-').pop() ?? s.code}`;
      else if (s?.abbr)     prefix = s.abbr;
      else if (s)           prefix = s.code.toUpperCase();
      else if (plat)        prefix = plat.code;
      else                  prefix = 'KKT';
      setSellerCode(`${prefix}-${supplierProductCode.trim().toUpperCase()}`);
    }
    // Auto-apply default margin from supplier
    if (s?.defaultMargin && !supplierPrice) {
      // supplier default margin is informational; no auto-fill for price
    }
    // Auto-apply primary shipping template for this supplier
    if (id) {
      try {
        const res = await fetch(`/api/shipping-templates?supplierId=${id}`);
        const data = await res.json();
        if (data.success && data.templates?.length > 0) {
          // Find isPrimary template first, otherwise use the first one
          const primary = data.templates.find((t: any) => t.isPrimary) || data.templates[0];
          setSelectedShippingTemplate({
            id: primary.id,
            name: primary.name,
            naverTemplateNo: primary.naverTemplateNo,
            memo: primary.memo ?? null,
            platformCode: primary.platformCode ?? null,
            supplierCode: primary.supplierCode ?? null,
            active: primary.active ?? true,
            shippingFee: primary.shippingFee,
            shippingFeeType: String(primary.shippingType),
            freeThreshold: primary.freeThreshold,
            returnFee: primary.returnFee,
            exchangeFee: primary.exchangeFee,
            courierCode: primary.courierCode,
          });
          setSelectedTemplateId(primary.id);
          setBasicDeliveryFee(String(primary.shippingFee));
          setReturnFee(String(primary.returnFee));
          setExchangeFee(String(primary.exchangeFee));
          setCourierCode(primary.courierCode);
          const feeType =
            Number(primary.shippingType) === 4 ? '무료' :
            Number(primary.shippingType) === 3 ? '조건부무료' :
            '유료';
          setDeliveryFeeType(feeType);
          if (Number(primary.shippingType) === 3 && primary.freeThreshold) {
            setConditionalFreeAmount(String(primary.freeThreshold));
          }
        }
      } catch {
        // Silently fail - user can still select template manually
      }
    } else {
      // Clear shipping template when supplier is deselected
      setSelectedShippingTemplate(null);
      setSelectedTemplateId('');
    }
  };

  const addOptionRow = () => setOptionRows(p => [...p, { id: uuidv4(), value: '', price: '0', stock: '100' }]);
  const removeOptionRow = (i: number) => setOptionRows(p => p.filter((_, idx) => idx !== i));
  const updateOptionRow = (i: number, field: keyof OptionRow, val: string) =>
    setOptionRows(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const handleBulkEdit = (updates: Partial<OptionRow>[]) => {
    setOptionRows(prev => prev.map(row => {
      const update = updates.find(u => u.id === row.id);
      return update ? { ...row, ...update } : row;
    }));
    setSelectedOptionIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedOptionIds.length === optionRows.length) {
      setSelectedOptionIds([]);
    } else {
      setSelectedOptionIds(optionRows.map(r => r.id));
    }
  };

  const toggleSelectOption = (id: string) => {
    setSelectedOptionIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleD1 = (v: string) => { setD1(v); setD2(''); setD3(''); setD4(''); };
  const handleD2 = (v: string) => { setD2(v); setD3(''); setD4(''); };
  const handleD3 = (v: string) => { setD3(v); setD4(''); };
  const categoryId = getCategoryId(d1, d2, d3, d4);
  const d4List = d1 && d2 && d3 ? getDepth4List(d1, d2, d3) : [];
  const progressItems = [
    { label: '카테고리', done: !!categoryId },
    { label: '상품명', done: productName.trim().length >= 10 },
    { label: '판매가', done: !!price && Number(price) > 0 },
    { label: '대표이미지', done: !!mainImage.trim() },
    { label: '옵션', done: optionType === 'NONE' || optionRows.length > 0 || directOptionNames[0]?.trim().length > 0 },
    { label: '수입사', done: !isImporter || importerName.trim().length > 0 },
  ];
  const progressDone = progressItems.filter(p => p.done).length;
  const requiredDone = progressDone >= 4;

  const seoColor = seoResult.score >= 80 ? 'text-green-600' : seoResult.score >= 60 ? 'text-yellow-600' : 'text-red-500';
  const seoBg = seoResult.score >= 80 ? 'from-green-50 to-emerald-50 border-green-200'
    : seoResult.score >= 60 ? 'from-yellow-50 to-amber-50 border-yellow-200'
    : 'from-red-50 to-pink-50 border-red-200';

  // Naver direct registration via API (Phase D-1)
  const handleNaverDirect = async () => {
    setNaverResult(null);
    setError('');
    const catId = getCategoryId(d1, d2, d3, d4);
    if (!productName.trim()) { setError('상품명을 입력해주세요'); return; }
    if (!catId)               { setError('카테고리를 선택해주세요'); return; }
    if (!price)               { setError('판매가를 입력해주세요'); return; }
    if (!mainImage.trim())    { setError('대표 이미지를 등록해주세요'); return; }

    setNaverLoading(true);
    try {
      // 1. Save to DB first to get productId
      const sku = sellerCode || `KKT-${Date.now()}`;
      const saveRes = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku, name: productName.trim(),
          salePrice: Number(price),
          supplierPrice: Number(supplierPrice) || 0,
          supplierId: selectedSupplierId || undefined,
          userId: 'default',
          naverCategoryCode: catId,
          brand, originCode, taxType,
          status: 'DRAFT',
          mainImage,
          description: detailImageUrl ? `<img src="${detailImageUrl}">` : (description || undefined),
          detail_image_url: detailImageUrl || undefined,
          keywords: aiKeywords.length > 0 ? aiKeywords : undefined,
          tags: seoTags.length > 0 ? seoTags : undefined,
          asPhone, asGuide,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error ?? '저장 실패');

      const productId = saveData.product?.id;
      if (!productId) throw new Error('상품 ID를 받지 못했습니다');

      // 2. Register on Naver via API
      const naverRes = await fetch('/api/naver/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const naverData = await naverRes.json();

      if (naverData.success) {
        setNaverResult({ ok: true, message: naverData.message });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setNaverResult({ ok: false, message: naverData.error ?? '네이버 등록 실패' });
      }
    } catch (e: any) {
      setNaverResult({ ok: false, message: e.message });
    } finally {
      setNaverLoading(false);
    }
  };

const handleGenerate = async () => {
    setError('');
    const categoryId = getCategoryId(d1, d2, d3, d4);

    if (!productName.trim()) { setError('상품명을 입력해주세요'); return; }
    if (!categoryId)          { setError('카테고리를 선택해주세요'); return; }
    if (!price)               { setError('판매가를 입력해주세요'); return; }

    const sku = sellerCode || `KKT-${Date.now()}`;

    // Build option fields based on current optionType
    let optionFields: {
      optionType?: string;
      optionNames?: string;
      optionValues?: string;
      optionPrices?: string;
      optionStocks?: string;
      directInputOption?: string;
    } = {};

    if (optionType === 'NONE') {
      // No options — all fields empty
      optionFields = {};
    } else if (optionType === 'DIRECT') {
      // Direct input — semicolon-separated option names (Naver spec)
      optionFields = {
        optionType: '직접입력형',
        directInputOption: directOptionNames.filter(n => n.trim()).join(';'),
      };
    } else if (optionType === 'SINGLE') {
      // SINGLE (단독형) -- Naver Excel spec (2026-03-19):
      //   optionNames : '색상\n사이즈'     newline between group names
      //   optionValues: '빨강,노랑\nS,M' comma within group, newline between groups
      //   optionPrices/Stocks: not used by Naver for 단독형 (passed as empty per spec)
      //
      // optionRows are stored as '그룹이름: 값' (display format, e.g. '색상: 빨강').
      // Prices and stocks are NOT applicable for 단독형 per Naver spec.
      // optionValues come directly from optionValueInputs (the user's comma-separated input).
      const validNames = optionNames.filter(n => n.trim());
      const valuesByName = optionValueInputs
        .slice(0, validNames.length)
        .map(v => v.trim().replace(/\s*,\s*/g, ','));
      optionFields = {
        optionType: '단독형',
        optionNames: validNames.join('\n'),
        optionValues: valuesByName.join('\n'),
        optionPrices: '',
        optionStocks: '',
      };
    } else if (optionType === 'COMBINATION') {
      // COMBINATION (조합형) -- Naver Excel spec (2026-03-19):
      //   optionNames : '색상\n사이즈'       newline between group names
      //   optionValues: '빨강,노랑\nS,M,L' comma within group, newline between groups
      //   optionPrices: '0,100'           first group only -- one price per first-group value
      //   optionStocks: '10,20'           first group only -- one stock per first-group value
      //
      // optionRows are stored as 'value1/value2/value3' (display format).
      // To get prices/stocks per first-group value, match rows whose value STARTS with that value.
      const validNames = optionNames.filter(n => n.trim());
      const valuesByName = optionValueInputs
        .slice(0, validNames.length)
        .map(v => v.trim().replace(/\s*,\s*/g, ','));
      // First group values (e.g. ['빨강','노랑'])
      const firstGroupVals = (optionValueInputs[0] || '').split(',').map(v => v.trim()).filter(Boolean);
      // Match rows: for a first-group value like '빨강', find the FIRST row that starts with '빨강/'
      // or equals '빨강' (single-group case). Use that row's price/stock.
      const pricesFirstGroup = firstGroupVals.map(val => {
        const match = optionRows.find(r =>
          !r.value.startsWith('__price_') &&
          (r.value === val || r.value.startsWith(val + '/'))
        );
        return match?.price || '0';
      }).join(',');
      const stocksFirstGroup = firstGroupVals.map(val => {
        const match = optionRows.find(r =>
          !r.value.startsWith('__price_') &&
          (r.value === val || r.value.startsWith(val + '/'))
        );
        return match?.stock || '100';
      }).join(',');
      optionFields = {
        optionType: '조합형',
        optionNames: validNames.join('\n'),
        optionValues: valuesByName.join('\n'),
        optionPrices: pricesFirstGroup,
        optionStocks: stocksFirstGroup,
      };
    }

    // Build NaverProductData for Excel generation
    const productData = {
      sellerProductCode: sku,
      categoryId,
      productName: productName.trim(),
      price: Number(price),
      stock: Number(stock) || 100,
      taxType,
      // Options
      ...optionFields,
      // Images
      mainImage: mainImage || '',
      additionalImages: additionalImages || '',
      // Content
      description: detailImageUrl ? `<img src="${detailImageUrl}">` : (description || undefined),
      detail_image_url: detailImageUrl || undefined,
      // ① 기본 — product info
      productStatus: '신상품',
      brand,
      manufacturer: brand,
      // ⑤ SEO — origin
      originCode,
      importer: importerName || undefined,
      multipleOrigin: 'N',
      minorPurchase: 'Y',
      // ④ 배송
      deliveryTemplateCode: selectedShippingTemplate?.naverTemplateNo || undefined,
      deliveryMethod: '택배, 소포, 등기',
      courierCode,
      deliveryFeeType,
      basicDeliveryFee: Number(basicDeliveryFee),
      deliveryPayType: '선결제',
      returnFee: Number(returnFee),
      exchangeFee: Number(exchangeFee),
      conditionalFreeAmount: conditionalFreeAmount ? Number(conditionalFreeAmount) : undefined,
      // ⑤ SEO — notice + AS
      noticeTemplateCode: noticeTemplateCode || undefined,
      asPhone,
      asGuide,
      // SEO tags → sellerRemark (max 10 tags, comma-separated)
      sellerRemark: seoTags.length > 0 ? seoTags.slice(0, 10).join(',') : undefined,
      // ⑥ 혜택 — discount PC
      discountValue: discountValue ? Number(discountValue) : undefined,
      discountUnit: discountValue ? discountUnit : undefined,
      // ⑥ 혜택 — mobile discount (uses same value as PC by default)
      mobileDiscountValue: discountValue ? String(discountValue) : undefined,
      mobileDiscountUnit: discountValue ? discountUnit : undefined,
      // ⑥ 혜택 — review points (all 4 types + alarm)
      textReviewPoint: Number(textReviewPoint),
      photoReviewPoint: Number(photoReviewPoint),
      monthTextReviewPoint: Number(textReviewPoint),   // same as text review
      monthPhotoReviewPoint: Number(photoReviewPoint), // same as photo review
      alarmReviewPoint: 100,
      // ⑥ 혜택 — other
      installmentMonths: Number(installmentMonths),
      reviewVisible,
    };

    try {
      // Run Excel generation and DB save in parallel
      const [excelRes, saveRes] = await Promise.all([
        fetch('/api/naver/excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: [], products: [productData] }),
        }),
        // Save product to DB — always save (supplierId optional)
        fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku,
            name: productName.trim(),
            salePrice: Number(price),
            supplierPrice: Number(supplierPrice) || 0,
            margin: (Number(supplierPrice) > 0 && Number(price) > 0)
              ? Math.round(((Number(price) - Number(supplierPrice)) / Number(price)) * 100)
              : 0,
            supplierId: selectedSupplierId || undefined,
            userId: 'default',
            naverCategoryCode: categoryId || undefined,
            category: [d1, d2, d3, d4].filter(Boolean).join(' > ') || 'uncategorized',
            brand,
            originCode,
            taxType,
            // Set ACTIVE on save — Excel download = intent to upload to Naver
            status: 'ACTIVE',
            keywords: aiKeywords.length > 0 ? aiKeywords : undefined,
            tags: seoTags.length > 0 ? seoTags : undefined,
            mainImage: mainImage || undefined,
            description: description || undefined,
            shipping_template_id: selectedTemplateId || undefined,
          }),
        }).catch(() => null),
      ]);

      if (!excelRes.ok) {
        const err = await excelRes.json();
        setError(err.error || '엑셀 생성에 실패했습니다');
        return;
      }

      // If editing an existing product, also update status to ACTIVE
      const editId = searchParams?.get('edit');
      if (editId) {
        fetch(`/api/products/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE' }),
        }).catch(() => null);
      }

      const blob = await excelRes.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `naver_${sku}_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // D-4: Mark sourcing log as REGISTERED if product came from crawler
      const crawlUrl = searchParams?.get('crawlUrl');
      if (crawlUrl) {
        fetch('/api/crawler/logs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: decodeURIComponent(crawlUrl), sourcingStatus: 'REGISTERED' }),
        }).catch(() => null);
      }

      // Save pending alternatives if product was saved to DB
      if (selectedSupplierId && pendingAlternatives.length > 0) {
        // savedProductId is from the DB save response (fire-and-forget above)
        // We use sku to find the product and save alts async
        Promise.all(
          pendingAlternatives
            .filter(a => a.alt_product_name?.trim())
            .map(a =>
              fetch('/api/products/alternatives', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...a, productId: sku }),
              }).catch(() => null)
            )
        ).catch(() => null);
      }
    } catch (e) {
      setError('네트워크 오류가 발생했습니다');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* Sticky header — kkotium design system */}
      <div style={{ background: '#fff', borderBottom: '2.5px solid #FFB3CE', position: 'sticky', top: 0, zIndex: 30 }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Flower icon — matches all other pages */}
            <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                {([0,60,120,180,240,300] as number[]).map((deg, i) => { const r=deg*Math.PI/180; const cx=22+Math.cos(r)*9.7; const cy=22+Math.sin(r)*9.7; return <ellipse key={i} cx={cx} cy={cy} rx={11.9} ry={8.8} transform={`rotate(${deg} ${cx} ${cy})`} fill="#e62310" />; })}
                <circle cx="22" cy="22" r="12.3" fill="#e62310" />
              </svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative', zIndex: 1 }}>
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 16, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>씨앗 심기</h1>
            <span style={{ color: '#F8DCE5', fontSize: 16, margin: '0 2px' }}>|</span>
            <a href="/products" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>← 목록으로</a>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {progressItems.map((item, i) => (
                  <div
                    key={i}
                    title={item.label}
                    className={`h-1.5 w-6 rounded-full transition-colors ${
                      item.done ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                progressDone >= 5 ? 'bg-green-100 text-green-700' :
                progressDone >= 3 ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {progressDone}/{progressItems.length} 완료
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleNaverDirect} disabled={naverLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, background: naverLoading ? '#aaa' : '#e62310', color: '#fff', padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 900, border: 'none', cursor: naverLoading ? 'not-allowed' : 'pointer' }}>
                {naverLoading ? (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                )}
                {naverLoading ? '등록 중...' : '네이버 직접 등록'}
              </button>
              <button onClick={handleGenerate} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#03C75A', color: '#fff', padding: '8px 18px', borderRadius: 12, fontSize: 13, fontWeight: 900, border: 'none', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                네이버 엑셀 다운로드
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Edit mode banner */}
        {searchParams?.get('edit') && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#FFF0EF', border: '1.5px solid #e62310', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: '#e62310', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#e62310', margin: 0 }}>상품 수정 모드</p>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>기존 데이터가 입력됐습니다 — 수정 후 엑셀을 다운로드하세요</p>
            </div>
          </div>
        )}
        {/* Prefill banner from crawler */}
        {/* Kkotti supplier auto-mapping banner */}
        {crawlMapBanner && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
            borderRadius: 12, marginBottom: 12,
            background: crawlMapBanner.type === 'matched'
              ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)'
              : 'linear-gradient(135deg,#ffe4ed,#ffd0e0)',
            border: `1.5px solid ${crawlMapBanner.type === 'matched' ? '#86efac' : '#FFB3CE'}`,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: '#fff',
              border: `1.5px solid ${crawlMapBanner.type === 'matched' ? '#86efac' : '#FFB3CE'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800,
              color: crawlMapBanner.type === 'matched' ? '#16a34a' : '#e62310',
              letterSpacing: '-1px',
            }}>
              {crawlMapBanner.type === 'matched' ? '^w^' : ';ㅅ;'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {crawlMapBanner.type === 'matched' ? (
                <>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#15803d', margin: '0 0 2px' }}>
                    공급사 자동 매핑 완료!
                  </p>
                  <p style={{ fontSize: 11, color: '#166534', margin: 0, lineHeight: 1.5 }}>
                    판매자 ID <strong>{crawlMapBanner.sellerId}</strong> →{' '}
                    <strong>{crawlMapBanner.supplierName}</strong> 자동 선택됨.
                    {crawlMapBanner.shipFee !== undefined && ` 배송비 ${crawlMapBanner.shipFee.toLocaleString()}원`}
                    {crawlMapBanner.canMerge === false && ' · 묶음배송 불가'}
                    {crawlMapBanner.canMerge === true && ' · 묶음배송 가능'}
                  </p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#e62310', margin: '0 0 2px' }}>
                    공급사를 찾을 수 없어요
                  </p>
                  <p style={{ fontSize: 11, color: '#7f1d1d', margin: '0 0 6px', lineHeight: 1.5 }}>
                    판매자 ID <strong>{crawlMapBanner.sellerId}</strong>
                    {crawlMapBanner.sellerNick && ` (${crawlMapBanner.sellerNick})`}가 등록된 공급사에 없어요.
                    거래처 명단에서 도매꾹 판매자 ID를 입력하거나 새 공급사로 등록해주세요.
                  </p>
                  <a
                    href="/settings/suppliers"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8,
                      background: '#e62310', color: '#fff', textDecoration: 'none',
                    }}
                  >
                    거래처 명단에서 등록
                  </a>
                </>
              )}
            </div>
            <button
              onClick={() => setCrawlMapBanner(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B0A0A8', flexShrink: 0, padding: 4 }}
            >
              ×
            </button>
          </div>
        )}

        {searchParams?.get('prefill') && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#FFF0F5', border: '1.5px solid #FFB3CE', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>&#x2728;</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#e62310', margin: 0 }}>크롤러에서 데이터가 자동 입력됐습니다</p>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>카테고리 선택 후 나머지 항목을 확인하고 엑셀을 다운로드하세요</p>
            </div>
          </div>
        )}
        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}
        {success && !naverResult && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">✅ 엑셀 파일 생성 완료! 다운로드 폴더를 확인하세요.</div>}
        {naverResult && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm border flex items-start gap-2 ${
            naverResult.ok
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <span className="text-base shrink-0">{naverResult.ok ? '✅' : '❌'}</span>
            <div>
              <p className="font-bold">{naverResult.ok ? '네이버 직접 등록 성공!' : '네이버 등록 실패'}</p>
              <p className="mt-0.5 text-xs opacity-80">{naverResult.message}</p>
            </div>
            <button onClick={() => setNaverResult(null)} className="ml-auto shrink-0 opacity-50 hover:opacity-100 text-lg leading-none">×</button>
          </div>
        )}

        <div className="flex gap-6 items-start">

          {/* ══ 좌측 입력 (flex-1) ══ */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* ① Category — search tab + drill-down tab */}
            <RSection number={1} title="카테고리" badge={catTab === 'search' ? '검색' : '4단계선택'}>
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                {(['drill','search'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCatTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      catTab === tab ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {tab === 'search' ? '검색으로 선택' : '4단계 선택'}
                  </button>
                ))}
              </div>

              {catTab === 'search' && (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      ref={catInputRef}
                      className={inp}
                      value={catQuery}
                      onChange={e => { setCatQuery(e.target.value); setCatOpen(true); }}
                      onFocus={() => { if (catResults.length) setCatOpen(true); }}
                      onKeyDown={e => {
                        if (!catOpen || !catResults.length) return;
                        if (e.key === 'ArrowDown') { e.preventDefault(); setCatActiveIdx(i => Math.min(i + 1, catResults.length - 1)); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); setCatActiveIdx(i => Math.max(i - 1, 0)); }
                        else if (e.key === 'Enter') { e.preventDefault(); commitCategory(catResults[catActiveIdx]); }
                        else if (e.key === 'Escape') { setCatOpen(false); }
                      }}
                      onBlur={() => setTimeout(() => setCatOpen(false), 150)}
                      placeholder="카테고리 이름 입력 — 예) 이불, 소파, 양말"
                      autoComplete="off"
                    />
                    {catQuery && (
                      <button
                        type="button"
                        onClick={() => { setCatQuery(''); setCatResults([]); catInputRef.current?.focus(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                      >
                        x
                      </button>
                    )}

                    {catOpen && catResults.length > 0 && (
                      <div
                        className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto"
                        onMouseDown={e => e.preventDefault()}
                      >
                        {catResults.map((r, idx) => {
                          const q = deferredCatQuery.trim().toLowerCase();
                          const leaf = (r.depth4 || r.depth3);
                          const leafLower = leaf.toLowerCase();
                          const hi = q ? leafLower.indexOf(q) : -1;
                          return (
                            <button
                              key={r.categoryId}
                              type="button"
                              onClick={() => commitCategory(r)}
                              onMouseEnter={() => setCatActiveIdx(idx)}
                              className={`w-full text-left px-4 py-2.5 transition-colors border-b border-gray-50 last:border-0 ${
                                idx === catActiveIdx ? 'bg-rose-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="text-sm font-medium text-gray-800">
                                {hi >= 0 ? (
                                  <>
                                    {leaf.slice(0, hi)}
                                    <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{leaf.slice(hi, hi + q.length)}</mark>
                                    {leaf.slice(hi + q.length)}
                                  </>
                                ) : leaf}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">{r.depth1} &gt; {r.depth2}{r.depth3 ? ` > ${r.depth3}` : ''}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {catQuery && catResults.length === 0 && deferredCatQuery === catQuery && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow px-4 py-3 text-sm text-gray-400">
                        일치하는 카테고리가 없습니다. 4단계 선택으로 직접 찾아보세요.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {catTab === 'drill' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="대분류" required>
                    <select className={sel} value={d1} onChange={e => handleD1(e.target.value)}>
                      <option value="">선택</option>
                      {getDepth1List().map(v => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="중분류" required>
                    <select className={sel} value={d2} onChange={e => handleD2(e.target.value)} disabled={!d1}>
                      <option value="">선택</option>
                      {d1 && getDepth2List(d1).map(v => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="소분류" required>
                    <select className={sel} value={d3} onChange={e => handleD3(e.target.value)} disabled={!d2}>
                      <option value="">선택</option>
                      {d2 && getDepth3List(d1, d2).map(v => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  {d4List.length > 0 && (
                    <Field label="세분류" required>
                      <select className={sel} value={d4} onChange={e => setD4(e.target.value)}>
                        <option value="">선택</option>
                        {d4List.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </Field>
                  )}
                </div>
              )}

              {categoryId && (
                <p className="text-xs text-green-600 font-medium bg-green-50 px-3 py-2 rounded-lg">
                  ✓ 카테고리코드: <strong>{categoryId}</strong>
                </p>
              )}
            </RSection>

            {/* ② 기본 정보 + AI 키워드 */}
            <RSection number={2} title="기본 정보">
              <Field label="상품명" required hint="최대 100자 · 키워드 포함 권장 (25~50자 최적)">
                <div className="flex gap-2">
                  <input className={`${inp} flex-1`} value={productName} onChange={e => setProductName(e.target.value)}
                    placeholder="예) 꽃틔움 프리미엄 코튼 이불 세트" maxLength={100} />
                  {/* Category auto-suggest button */}
                  {productName.trim().length >= 4 && !categoryId && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/category/suggest', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ productName: productName.trim() }),
                          });
                          const data = await res.json();
                          if (data.success && data.suggestions?.length > 0) {
                            const top = data.suggestions[0];
                            setD1(top.d1); setD2(top.d2); setD3(top.d3);
                            if (top.d4) setD4(top.d4);
                            setCatTab('drill');
                          } else {
                            setError('카테고리 자동 매핑 실패 — 상품명에 카테고리 키워드가 없습니다. 직접 선택해주세요.');
                          }
                        } catch {
                          setError('카테고리 추천 오류');
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '0 12px', background: '#FFF0F5', color: '#e62310',
                        border: '1.5px solid #FFB3CE', borderRadius: 12,
                        fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e62310" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                      </svg>
                      카테고리 자동 추천
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-medium ${productName.length >= 25 && productName.length <= 50 ? 'text-green-600' : 'text-gray-400'}`}>
                    {productName.length}/100자 {productName.length >= 25 && productName.length <= 50 ? '최적' : '(25~50자 권장)'}
                  </span>
                  {categoryId && (
                    <span className="text-xs text-green-600">
                      카테고리 선택됨
                    </span>
                  )}
                </div>
              </Field>

              {/* Golden keywords display — populated by NaverSEOWorkflow in right panel */}
              {aiKeywords.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">황금키워드 (AI SEO 워크플로우에서 생성)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiKeywords.map((kw, i) => (
                      <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium">{kw}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* SEO tags — direct inline input, max 10, synced to seoTags state */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <p className="text-xs text-gray-400">셀러 태그 (SEO) — 네이버 태그 최대 10개</p>
                  <span style={{ fontSize: 11, fontWeight: 700, color: seoTags.length >= 10 ? '#16a34a' : seoTags.length >= 5 ? '#d97706' : '#888' }}>
                    {seoTags.length}/10
                  </span>
                </div>
                {/* Tag chips */}
                {seoTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                    {seoTags.map(tag => (
                      <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#FFF0F5', color: '#e62310', border: '1px solid #FFB3CE' }}>
                        #{tag}
                        <button
                          type="button"
                          onClick={() => setSeoTags(prev => prev.filter(t => t !== tag))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FFB3CE', padding: 0, lineHeight: 1, fontSize: 14, marginLeft: 1 }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Tag input */}
                {seoTags.length < 10 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      className={inp}
                      value={tagInputVal}
                      onChange={e => setTagInputVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const t = tagInputVal.trim().replace(/^#/, '');
                          if (t && !seoTags.includes(t) && seoTags.length < 10) {
                            setSeoTags(prev => [...prev, t]);
                            setTagInputVal('');
                          }
                        }
                      }}
                      placeholder="태그 입력 후 Enter — 예) 홈웨어, 선물용, 봉로운"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const t = tagInputVal.trim().replace(/^#/, '');
                        if (t && !seoTags.includes(t) && seoTags.length < 10) {
                          setSeoTags(prev => [...prev, t]);
                          setTagInputVal('');
                        }
                      }}
                      style={{ padding: '0 14px', background: '#FFF0F5', color: '#e62310', border: '1.5px solid #FFB3CE', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                    >
                      + 추가
                    </button>
                  </div>
                )}
                {seoTags.length === 0 && (
                  <p style={{ fontSize: 11, color: '#B0A0A8', marginTop: 4 }}>태그 10개 입력 시 쳄마마코드가 점수 +8점 반영됩니다</p>
                )}
              </div>

              {/* Price block — sale price + instant discount inline (Naver order) */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="판매가" required>
                  <input className={inp} type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" min={0} />
                </Field>
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Field label="즉시할인" hint="네이버 기본할인">
                        <input className={inp} type="number" value={discountValue}
                          onChange={e => setDiscountValue(e.target.value)} placeholder="0" min={0} />
                      </Field>
                    </div>
                    <div className="w-24">
                      <Field label="단위">
                        <select className={sel} value={discountUnit} onChange={e => setDiscountUnit(e.target.value)}>
                          <option value="%">%</option>
                          <option value="원">원</option>
                        </select>
                      </Field>
                    </div>
                  </div>
                  {discountValue && Number(discountValue) > 0 && Number(price) > 0 && (
                    <div className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs flex items-center gap-1.5">
                      <span className="text-rose-400">할인후</span>
                      <span className="text-rose-700 font-bold">
                        {discountUnit === '%'
                          ? `${Math.round(Number(price) * (1 - Number(discountValue) / 100)).toLocaleString()}원`
                          : `${Math.max(Number(price) - Number(discountValue), 0).toLocaleString()}원`}
                      </span>
                      <span className="text-gray-400 ml-auto">{discountValue}{discountUnit} DC</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="공급가 (도매가)" hint="마진 계산에 사용">
                  <input className={inp} type="number" value={supplierPrice} onChange={e => setSupplierPrice(e.target.value)} placeholder="0" min={0} />
                </Field>
                <Field label="재고수량">
                  <input className={inp} type="number" value={stock} onChange={e => setStock(e.target.value)} min={0} />
                </Field>
                <Field label="부가세">
                  <select className={sel} value={taxType} onChange={e => setTaxType(e.target.value)}>
                    {TAX_TYPES.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                  </select>
                </Field>
              </div>
              {/* Platform + Supplier — side by side grid */}
              <div className="grid grid-cols-2 gap-3">

                {/* Platform */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-700">플랫폼</label>
                    <button type="button" onClick={openPlatformAdd}
                      className="flex items-center gap-0.5 text-xs text-pink-500 hover:text-pink-700 font-medium transition">
                      <span className="text-base leading-none">+</span> 추가
                    </button>
                  </div>
                  <PlatformPicker
                    platforms={platforms}
                    selectedId={selectedPlatformId}
                    onChange={id => {
                      setSelectedPlatformId(id);
                      // Re-gen SKU when platform changes and supplier product code is filled
                      if (supplierProductCode.trim()) {
                        const plat = platforms.find(p => p.id === id);
                        const sup  = suppliers.find(s => s.id === selectedSupplierId);
                        let prefix: string;
                        if (plat && sup?.abbr)  prefix = `${plat.code}-${sup.abbr}`;
                        else if (plat && sup)   prefix = `${plat.code}-${sup.code.split('-').pop() ?? sup.code}`;
                        else if (plat)          prefix = plat.code;
                        else if (sup?.abbr)     prefix = sup.abbr;
                        else if (sup)           prefix = sup.code.toUpperCase();
                        else                   prefix = 'KKT';
                        setSellerCode(`${prefix}-${supplierProductCode.trim().toUpperCase()}`);
                      }
                      commitSupplier('');
                    }}
                    placeholder="플랫폼 선택"
                  />
                  {selectedPlatformId && (() => {
                    const plat = platforms.find(p => p.id === selectedPlatformId);
                    if (!plat) return null;
                    return (
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-xs text-gray-400 flex-1 truncate">{plat.name}</span>
                        <button type="button" onClick={() => openPlatformEdit(plat)}
                          className="text-xs text-blue-500 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50 transition">수정</button>
                        <button type="button" onClick={() => deleteQuickPlatform(plat.id, plat.name)}
                          className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 transition">삭제</button>
                      </div>
                    );
                  })()}
                </div>

                {/* Supplier */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-700">공급사</label>
                    <button type="button" onClick={openSupplierAdd}
                      className="flex items-center gap-0.5 text-xs text-pink-500 hover:text-pink-700 font-medium transition">
                      <span className="text-base leading-none">+</span> 추가
                    </button>
                  </div>
                  <SupplierPicker
                    suppliers={suppliers}
                    selectedId={selectedSupplierId}
                    onChange={commitSupplier}
                    selectedPlatform={platforms.find(p => p.id === selectedPlatformId) ?? null}
                    placeholder="공급사 선택"
                  />
                  {selectedSupplierId && (() => {
                    const sup = suppliers.find(s => s.id === selectedSupplierId);
                    if (!sup) return null;
                    return (
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-xs text-gray-400 flex-1 truncate">{sup.name}{sup.abbr ? ` (${sup.abbr})` : ''}</span>
                        <button type="button" onClick={() => openSupplierEdit(sup)}
                          className="text-xs text-blue-500 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50 transition">수정</button>
                        <button type="button" onClick={() => deleteQuickSupplier(sup.id, sup.name)}
                          className="text-xs text-red-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 transition">삭제</button>
                      </div>
                    );
                  })()}
                  {!selectedSupplierId && <p className="mt-1 text-xs text-gray-400">선택 시 배송 자동 적용</p>}
                </div>

              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="공급사 상품코드" hint="입력 시 SKU 자동 생성">
                  <input className={inp} value={supplierProductCode}
                    onChange={e => handleSupplierProductCode(e.target.value)}
                    placeholder="예) 12345" />
                </Field>
                <Field label="판매자 상품코드 (SKU)" hint="자동생성 · 직접 수정 가능">
                  <div className="relative">
                    <input
                      className={inp + ' bg-gray-50 pr-24'}
                      value={sellerCode}
                      onChange={e => { setSellerCode(e.target.value); checkSkuAvailability(e.target.value); }}
                      placeholder="KKT-20260304-A3F7"
                    />
                    {skuStatus !== 'idle' && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-0.5 rounded-full pointer-events-none ${
                        skuStatus === 'checking' ? 'bg-gray-100 text-gray-400' :
                        skuStatus === 'available' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {skuStatus === 'checking' ? '확인 중' :
                         skuStatus === 'available' ? '사용 가능' :
                         '중복'}
                      </span>
                    )}
                  </div>
                  {skuStatus === 'taken' && (
                    <p className="mt-1 text-xs text-red-500 font-medium">이미 등록된 상품코드 (SKU)입니다. 다른 코드를 사용해주세요.</p>
                  )}
                </Field>
              </div>
            </RSection>

            {/* ③ Option system — Combination / Single / Direct */}
            <RSection number={3} title="옵션" badge={optionType === 'NONE' ? '옵션없음' : optionType === 'COMBINATION' ? '조합형' : optionType === 'SINGLE' ? '단독형' : '직접입력형'}>
              {/* Type radio */}
              <div className="flex gap-2 flex-wrap">
                {(['NONE','COMBINATION','SINGLE','DIRECT'] as const).map(t => {
                  const labels: Record<string, string> = { NONE: '옵션없음', COMBINATION: '조합형', SINGLE: '단독형', DIRECT: '직접입력형' };
                  const descs: Record<string, string> = { NONE: '', COMBINATION: 'N×M 교차조합', SINGLE: '평면 나열', DIRECT: '구매자 직접입력' };
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setOptionType(t)}
                      className={`flex-1 min-w-[100px] px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        optionType === t
                          ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <div>{labels[t]}</div>
                      {descs[t] && <div className="text-xs font-normal opacity-60 mt-0.5">{descs[t]}</div>}
                    </button>
                  );
                })}
              </div>

              {optionType === 'NONE' && (
                <p className="text-xs text-gray-400 py-2">옵션 없이 단일 상품으로 등록됩니다.</p>
              )}

              {(optionType === 'COMBINATION' || optionType === 'SINGLE') && (
                <>
                  {/* Option name + values + per-value price (Naver spec) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">옵션명 + 값 + 옵션가 입력</label>
                      {optionType === 'COMBINATION' && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          조합형: 옵션가는 각 옵션명별 값에 추가금 입력
                        </span>
                      )}
                    </div>
                    {optionNames.map((name, ni) => {
                      const vals = (optionValueInputs[ni] || '').split(',').map(v => v.trim()).filter(Boolean);
                      return (
                        <div key={ni} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
                          {/* Row: option name label + add/remove */}
                          <div className="flex gap-2 items-center">
                            <span className="text-xs font-semibold text-gray-500 w-16 shrink-0">옵션명 {ni + 1}</span>
                            <input
                              className={`${inp} flex-1`}
                              value={name}
                              onChange={e => setOptionNames(prev => prev.map((n, i) => i === ni ? e.target.value : n))}
                              placeholder={['상선 (예: 색상)', '차등 (예: 사이즈)', '차등 (예: 기종)'][ni]}
                            />
                            {optionNames.length > 1 && (
                              <button type="button" onClick={() => { setOptionNames(p => p.filter((_,i)=>i!==ni)); setOptionValueInputs(p => p.filter((_,i)=>i!==ni)); }}
                                className="shrink-0 px-2 py-1 text-red-400 hover:text-red-600 text-sm">
                                x
                              </button>
                            )}
                          </div>
                          {/* Values input: comma-separated */}
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-gray-400 w-16 shrink-0">값 (콤마)</span>
                            <input
                              className={`${inp} flex-1 text-sm`}
                              value={optionValueInputs[ni]}
                              onChange={e => setOptionValueInputs(prev => prev.map((v, i) => i === ni ? e.target.value : v))}
                              placeholder="빨강,노랑,파랑 (콤마 구분)"
                            />
                          </div>
                          {/* COMBINATION only: price/stock entered in the table rows below */}
                          {vals.length > 0 && optionType === 'COMBINATION' && ni === 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              입력 후 ‘옵션목록으로 적용’ 실행 후 아래 목록에서 조합별 추가금 · 재고를 입력하세요.
                            </p>
                          )}
                          {vals.length > 0 && optionType === 'SINGLE' && (
                            <p className="text-xs text-gray-400 mt-0.5">단독형: 옵션가/재고 없음 (네이버 스펙)</p>
                          )}
                        </div>
                      );
                    })}
                    {optionNames.length < 3 && (
                      <button type="button"
                        onClick={() => { setOptionNames(p => [...p, '']); setOptionValueInputs(p => [...p, '']); }}
                        className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-green-300 hover:text-green-500 transition">
                        + 옵션명 추가 (옵션군 {optionNames.length + 1})
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const groups = optionNames.map((name, ni) => ({
                        name,
                        values: optionValueInputs[ni].split(',').map(v => v.trim()).filter(Boolean),
                      })).filter(g => g.name && g.values.length);
                      if (!groups.length) return;
                      if (optionType === 'COMBINATION') {
                        // Cross-product NxMxL (display: 'val1/val2/val3')
                        let combos: string[][] = [[]];
                        groups.forEach(g => {
                          combos = combos.flatMap(c => g.values.map(v => [...c, v]));
                        });
                        // Preserve existing price/stock when re-applying
                        setOptionRows(prev => combos.map(combo => {
                          const key = combo.join('/');
                          const existing = prev.find(r => r.value === key && !r.value.startsWith('__price_'));
                          return existing ? { ...existing } : { id: uuidv4(), value: key, price: '0', stock: '100' };
                        }));
                      } else {
                        // SINGLE — flat list N+M+L, plain value (no group prefix)
                        const flat = groups.flatMap(g => g.values.map(v => v.trim()));
                        setOptionRows(prev => flat.map(val => {
                          const existing = prev.find(r => r.value === val);
                          return existing ? { ...existing } : { id: uuidv4(), value: val, price: '0', stock: '100' };
                        }));
                      }
                      setSelectedOptionIds([]);
                    }}
                    className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition shadow-sm"
                  >
                    옵션목록으로 적용
                  </button>

                  {/* Option table */}
                  {optionRows.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">총 {optionRows.length}개 옵션 {selectedOptionIds.length > 0 && `(${selectedOptionIds.length}개 선택됨)`}</p>
                        {selectedOptionIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setBulkEditModalOpen(true)}
                            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            선택목록 일괄수정
                          </button>
                        )}
                      </div>
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        {optionType === 'COMBINATION' ? (() => {
                          // COMBINATION table: each optionName gets its own column
                          // row.value format: 'val1/val2/val3' -> split by '/'
                          const validNames = optionNames.filter(n => n.trim());
                          const nameCols = validNames.length;
                          // gridTemplateColumns: checkbox + N name cols + price + stock + status + delete
                          const gridCols = `28px ${Array(nameCols).fill('1fr').join(' ')} 80px 72px 80px 32px`;
                          return (
                            <>
                              {/* COMBINATION header */}
                              <div className="grid bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 gap-2 border-b border-gray-200"
                                   style={{ gridTemplateColumns: gridCols }}>
                                <div className="flex items-center justify-center">
                                  <input type="checkbox"
                                    checked={selectedOptionIds.length === optionRows.length && optionRows.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
                                </div>
                                {validNames.map((n, ni) => (
                                  <span key={ni} className="flex items-center font-semibold" style={{ color: '#555' }}>{n}</span>
                                ))}
                                <span className="flex items-center justify-center">옵션가(+원)</span>
                                <span className="flex items-center justify-center">재고</span>
                                <span className="flex items-center justify-center">판매상태</span>
                                <span />
                              </div>
                              {/* COMBINATION rows */}
                              {optionRows.map((row, i) => {
                                const parts = row.value.split('/');
                                return (
                                  <div key={row.id}
                                       className="grid gap-2 px-3 py-2 border-t border-gray-100 items-center"
                                       style={{ gridTemplateColumns: gridCols }}>
                                    <div className="flex items-center justify-center">
                                      <input type="checkbox"
                                        checked={selectedOptionIds.includes(row.id)}
                                        onChange={() => toggleSelectOption(row.id)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
                                    </div>
                                    {/* Each option group value in its own cell */}
                                    {validNames.map((_, ni) => (
                                      <div key={ni} className="text-sm text-gray-800 truncate px-1">
                                        {parts[ni] ?? ''}
                                      </div>
                                    ))}
                                    <input className={`${inp} py-1.5 text-center text-sm`}
                                      type="number" value={row.price}
                                      onChange={e => updateOptionRow(i, 'price', e.target.value)} />
                                    <input className={`${inp} py-1.5 text-center text-sm`}
                                      type="number" value={row.stock}
                                      onChange={e => updateOptionRow(i, 'stock', e.target.value)} />
                                    <select className={`${sel} py-1.5 text-xs`}
                                      value={row.status ?? 'ON'}
                                      onChange={e => updateOptionRow(i, 'status', e.target.value as 'ON' | 'OUT' | 'OFF')}>
                                      <option value="ON">판매중</option>
                                      <option value="OUT">품절</option>
                                      <option value="OFF">숨김</option>
                                    </select>
                                    <button onClick={() => removeOptionRow(i)} className="flex items-center justify-center text-red-400 hover:text-red-600 text-sm font-bold">x</button>
                                  </div>
                                );
                              })}
                            </>
                          );
                        })() : (() => {
                          // SINGLE table: optionName | optionValue | status | delete
                          // Each row shows its own optionName + optionValue independently
                          // e.g. row {value:'빨강'} -> find group -> display '컬러 | 빨강'
                          // row {value:'소'} -> find group -> display '사이즈 | 소'
                          const allGroups = optionNames
                            .map((n, ni) => ({
                              name: n.trim(),
                              values: (optionValueInputs[ni] || '').split(',').map(v => v.trim()).filter(Boolean),
                            }))
                            .filter(g => g.name);
                          const getGroupName = (val: string) => {
                            const group = allGroups.find(g => g.values.includes(val));
                            return group?.name ?? '';
                          };
                          return (
                            <>
                              {/* SINGLE header: 체크 | 옵션명 | 옵션값 | 사용여부 | 삭제 */}
                              <div className="grid bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 gap-2 border-b border-gray-200"
                                   style={{ gridTemplateColumns: '28px 1fr 1fr 96px 32px' }}>
                                <div className="flex items-center justify-center">
                                  <input type="checkbox"
                                    checked={selectedOptionIds.length === optionRows.length && optionRows.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
                                </div>
                                <span className="flex items-center">옵션명</span>
                                <span className="flex items-center">옵션값</span>
                                <span className="flex items-center justify-center">사용여부</span>
                                <span />
                              </div>
                              {/* SINGLE rows: each row shows optionName (from group) + optionValue */}
                              {optionRows.map((row, i) => (
                                <div key={row.id}
                                     className="grid gap-2 px-3 py-2 border-t border-gray-100 items-center"
                                     style={{ gridTemplateColumns: '28px 1fr 1fr 96px 32px' }}>
                                  <div className="flex items-center justify-center">
                                    <input type="checkbox"
                                      checked={selectedOptionIds.includes(row.id)}
                                      onChange={() => toggleSelectOption(row.id)}
                                      className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
                                  </div>
                                  {/* optionName: read-only, derived from group membership */}
                                  <div className="text-sm text-gray-700 font-medium px-1 truncate">{getGroupName(row.value)}</div>
                                  {/* optionValue: editable */}
                                  <input className={`${inp} py-1.5 text-sm`} value={row.value}
                                    onChange={e => updateOptionRow(i, 'value', e.target.value)} />
                                  <select className={`${sel} py-1.5 text-xs`}
                                    value={row.status ?? 'ON'}
                                    onChange={e => updateOptionRow(i, 'status', e.target.value as 'ON' | 'OUT' | 'OFF')}>
                                    <option value="ON">Y (판매중)</option>
                                    <option value="OUT">N (품절)</option>
                                    <option value="OFF">N (숨김)</option>
                                  </select>
                                  <button onClick={() => removeOptionRow(i)} className="flex items-center justify-center text-red-400 hover:text-red-600 text-sm font-bold">x</button>
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <BulkEditModal
                    isOpen={bulkEditModalOpen}
                    selectedOptions={optionRows.filter(r => selectedOptionIds.includes(r.id))}
                    onClose={() => setBulkEditModalOpen(false)}
                    onApply={handleBulkEdit}
                  />
                  <div className="flex gap-2">
                    <button onClick={addOptionRow} className="flex-1 py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-green-300 hover:text-green-600 transition">
                      + 행 추가
                    </button>
                    {optionRows.length > 0 && (
                      <button onClick={() => setOptionRows([])} className="px-4 py-2 border border-red-200 rounded-xl text-xs text-red-400 hover:bg-red-50 transition">
                        전체삭제
                      </button>
                    )}
                  </div>
                </>
              )}

              {optionType === 'DIRECT' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">구매자가 텍스트를 직접 입력하는 방식입니다. (각인, 커스터마이징 등)</p>
                  {directOptionNames.map((name, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input className={`${inp} flex-1`} value={name}
                        onChange={e => setDirectOptionNames(p => p.map((n, idx) => idx === i ? e.target.value : n))}
                        placeholder={`직접입력 옵션명 ${i + 1}`} />
                      {directOptionNames.length > 1 && (
                        <button type="button" onClick={() => setDirectOptionNames(p => p.filter((_,idx) => idx !== i))}
                          className="text-red-400 hover:text-red-600 text-sm px-2">x</button>
                      )}
                    </div>
                  ))}
                  {directOptionNames.length < 5 && (
                    <button type="button" onClick={() => setDirectOptionNames(p => [...p, ''])}
                      className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-green-300 hover:text-green-600 transition">
                      + 직접입력 옵션명 추가 (최대 5개)
                    </button>
                  )}
                </div>
              )}
            </RSection>

            {/* ④ Images + SEO hook */}
            <RSection number={4} title="이미지 / SEO 훅문구">
              {/* Drag-and-drop image upload to Supabase — auto URL — Excel cols 18/19/20 */}
              <ImageUploadDropzone
                type="main"
                label="대표 이미지"
                hint="최소 500x500px · 1장 · 엑셀 컨럼 18"
                required
                value={mainImage}
                onChange={setMainImage}
              />
              <ImageUploadDropzone
                type="additional"
                label="추가 이미지"
                hint="최대 9장 · 엑셀 컨럼 19"
                value={additionalImages}
                onChange={setAdditionalImages}
                maxFiles={9}
              />
              <ImageUploadDropzone
                type="detail"
                label="상세페이지 이미지"
                hint="엑셀 컨럼 20 삽입 (상세설명 필드)"
                value={detailImageUrl}
                onChange={setDetailImageUrl}
              />
              <Field label="SEO 훅문구" hint="네이버 쇼핑 검색 결과 홍보문구 · 최대 100자">
                <div className="relative">
                  <textarea
                    className={`${inp} h-20 resize-none pr-16`}
                    value={seoHook}
                    onChange={e => setSeoHook(e.target.value)}
                    placeholder="예) 당일배송 | 프리미엄 품질 | 꽃틔움 공식 · 특별한 날을 더욱 특별하게"
                    maxLength={100}
                  />
                  <span className={`absolute bottom-2 right-3 text-xs ${
                    seoHook.length >= 80 ? 'text-green-600 font-medium' : 'text-gray-400'
                  }`}>{seoHook.length}/100</span>
                </div>
              </Field>
              <Field label="상세 설명 (텍스트)" hint="200자 이상 권장 · HTML 가능">
                <textarea className={`${inp} h-32 resize-none`} value={description}
                  onChange={e => setDescription(e.target.value)} placeholder="상품 특징, 소재, 사이즈, A/S 안내 등..." />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${description.length >= 200 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                    {description.length}자 {description.length >= 200 ? '' : '(200자 이상 권장)'}
                  </span>
                </div>
              </Field>
            </RSection>

            {/* ══ D1~D7 기본값 아코디언 ══ */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 px-1 uppercase tracking-wide">⚙️ 기본값 — 펼쳐서 수정 가능</p>

              {/* D1 Brand / Origin / Importer */}
              <DSection icon="" title="브랜드 / 원산지 / 수입사" summary={`${brand} · ${selectedOrigin?.label ?? originCode}`}>
                <Field label="브랜드">
                  <input className={inp} value={brand} onChange={e => setBrand(e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  {/* Origin combobox: display/query separated, keyboard nav, no blur-race */}
                  <Field label="원산지 검색" hint="국가명·지역명 입력 또는 방향키 선택">
                    <div className="relative">
                      <input
                        ref={originInputRef}
                        className={inp}
                        value={originOpen ? originQuery : (selectedOrigin?.label ?? '')}
                        onChange={e => { setOriginQuery(e.target.value); setOriginOpen(true); setOriginActiveIdx(0); }}
                        onFocus={() => setOriginOpen(true)}
                        onKeyDown={e => {
                          if (!originOpen) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOriginOpen(true); return; }
                          if (e.key === 'ArrowDown') { e.preventDefault(); setOriginActiveIdx(i => Math.min(i + 1, originCandidates.length - 1)); }
                          else if (e.key === 'ArrowUp') { e.preventDefault(); setOriginActiveIdx(i => Math.max(i - 1, 0)); }
                          else if (e.key === 'Enter') { e.preventDefault(); const t = originCandidates[originActiveIdx]; if (t) commitOrigin(t.code); }
                          else if (e.key === 'Escape') { setOriginOpen(false); setOriginQuery(''); }
                        }}
                        onBlur={() => { setTimeout(() => setOriginOpen(false), 150); }}
                        placeholder="예: 중국, 국내산, 경기"
                        autoComplete="off"
                      />
                      {originOpen && originCandidates.length > 0 && (
                        <div
                          ref={originListRef}
                          className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto"
                          onMouseDown={e => e.preventDefault()}
                        >
                          {originCandidates.map((o, idx) => {
                            const isActive = idx === originActiveIdx;
                            const isSelected = o.code === originCode;
                            const q = deferredOriginQuery.trim().toLowerCase();
                            const label = o.label;
                            const hi = q ? label.toLowerCase().indexOf(q) : -1;
                            return (
                              <button
                                key={o.code}
                                type="button"
                                onClick={() => commitOrigin(o.code)}
                                onMouseEnter={() => setOriginActiveIdx(idx)}
                                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                                  isActive ? 'bg-rose-50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <span className={isSelected ? 'text-rose-700 font-semibold' : 'text-gray-700'}>
                                  {hi >= 0 ? (
                                    <>
                                      {label.slice(0, hi)}
                                      <mark className="bg-yellow-200 text-yellow-900 rounded">{label.slice(hi, hi + q.length)}</mark>
                                      {label.slice(hi + q.length)}
                                    </>
                                  ) : label}
                                </span>
                                <span className="text-xs text-gray-400 ml-2 shrink-0">{o.code}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {selectedOrigin && (
                      <p className="mt-1 text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{selectedOrigin.label}</span>
                        <span className="text-gray-400 ml-1">({selectedOrigin.code})</span>
                        {isImporter && <span className="ml-1.5 text-amber-600 font-medium">수입산</span>}
                      </p>
                    )}
                  </Field>
                  <Field
                    label="수입사"
                    hint={isImporter ? '수입산 선택 시 필수 입력' : '국내산은 입력 불필요'}
                  >
                    <input
                      className={`${inp} ${isImporter ? 'border-rose-400 ring-1 ring-rose-300' : 'opacity-40 cursor-not-allowed'}`}
                      value={importerName}
                      onChange={e => setImporterName(e.target.value)}
                      placeholder={isImporter ? '수입사명 입력 (필수)' : '해당없음'}
                      disabled={!isImporter}
                    />
                    {isImporter && !importerName.trim() && (
                      <p className="mt-1 text-xs text-red-500 font-medium">수입산 상품은 수입사 입력 필수</p>
                    )}
                    {isImporter && importerName.trim() && (
                      <p className="mt-1 text-xs text-green-600">입력 완료</p>
                    )}
                  </Field>
                </div>
              </DSection>

              {/* C5: Kkotti shipping recommendation bubble */}
              {(() => {
                const saleNum = Number(price) || 0;
                if (!saleNum) return null;
                const kkottiPick: 'A' | 'B' | 'C' =
                  saleNum >= 25000 ? 'B' :
                  saleNum >= 10000 ? 'C' : 'A';
                const alreadyApplied =
                  (kkottiPick === 'A' && deliveryFeeType === '유료') ||
                  (kkottiPick === 'B' && deliveryFeeType === '무료') ||
                  (kkottiPick === 'C' && deliveryFeeType === '조건부무료');
                if (alreadyApplied) return null;
                const MSG: Record<'A'|'B'|'C', string> = {
                  A: `판매가 ${saleNum.toLocaleString()}원 — 가격비교 상단 노출에 유리해요. 유료배송 A안을 추천합니다!`,
                  B: `판매가 ${saleNum.toLocaleString()}원 — 배송비 포함가 + 무료배송 B안으로 전환율을 높이세요!`,
                  C: `판매가 ${saleNum.toLocaleString()}원 — 3만원 조건부 무료 C안으로 객단가를 높일 수 있어요!`,
                };
                const FACE: Record<'A'|'B'|'C', string> = { A: '^_^', B: '^w^', C: '^v^' };
                const doApply = () => {
                  if (kkottiPick === 'A') { setDeliveryFeeType('유료'); setBasicDeliveryFee('3000'); }
                  if (kkottiPick === 'B') { setDeliveryFeeType('무료'); setBasicDeliveryFee('0'); }
                  if (kkottiPick === 'C') { setDeliveryFeeType('조건부무료'); setBasicDeliveryFee('3000'); setConditionalFreeAmount('30000'); }
                };
                return (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
                    borderRadius: 12, background: 'linear-gradient(135deg,#ffe4ed,#ffd0e0)',
                    border: '1.5px solid #FFB3CE',
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: '#fff', border: '1.5px solid #FFB3CE',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: '#e62310', letterSpacing: '-1px',
                    }}>
                      {FACE[kkottiPick]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: '#e62310', margin: '0 0 3px' }}>
                        꼬띠 배송 추천 — {kkottiPick}안
                      </p>
                      <p style={{ fontSize: 11, color: '#7f1d1d', margin: '0 0 6px', lineHeight: 1.5 }}>
                        {MSG[kkottiPick]}
                      </p>
                      <button
                        type="button" onClick={doApply}
                        style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: '#e62310', color: '#fff', border: 'none', cursor: 'pointer' }}
                      >
                        바로 적용
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* D3 배송 */}
              <DSection icon="🚚" title="배송 설정" summary={selectedShippingTemplate ? selectedShippingTemplate.name : `${deliveryFeeType} · ${basicDeliveryFee}원 · ${courierCode}`}>

                {/* Shipping strategy toggle: A / B / C */}
                {(() => {
                  const saleNum = Number(price) || 0;
                  const feeNum  = Number(basicDeliveryFee) || 3000;
                  const strategies = [
                    {
                      key: 'A',
                      label: 'A안',
                      sub: '최저가 노출',
                      desc: '판매가 낮게 + 유료배송',
                      hint: '가격비교 상단 노출에 유리',
                      color: '#1d4ed8',
                      bg: '#eff6ff',
                      border: '#93c5fd',
                      apply: () => {
                        setDeliveryFeeType('유료');
                        setBasicDeliveryFee('3000');
                      },
                      active: deliveryFeeType === '유료',
                      kkottiPick: (Number(price)||0) < 10000,
                    },
                    {
                      key: 'B',
                      label: 'B안',
                      sub: '무료배송',
                      desc: saleNum > 0 ? `판매가 ${(saleNum + feeNum).toLocaleString()}원 + 무료` : '배송비 포함가 + 무료',
                      hint: '무료배송 필터·모바일 전환율 유리',
                      color: '#15803d',
                      bg: '#f0fdf4',
                      border: '#86efac',
                      apply: () => {
                        setDeliveryFeeType('무료');
                        setBasicDeliveryFee('0');
                      },
                      active: deliveryFeeType === '무료',
                      kkottiPick: (Number(price)||0) >= 25000,
                    },
                    {
                      key: 'C',
                      label: 'C안',
                      sub: '조건부 무료',
                      desc: '3만원 이상 무료배송',
                      hint: '객단가 상승·추가구매 유도',
                      color: '#c2410c',
                      bg: '#fff7ed',
                      border: '#fed7aa',
                      apply: () => {
                        setDeliveryFeeType('조건부무료');
                        setBasicDeliveryFee('3000');
                        setConditionalFreeAmount('30000');
                      },
                      active: deliveryFeeType === '조건부무료',
                      kkottiPick: (Number(price)||0) >= 10000 && (Number(price)||0) < 25000,
                    },
                  ];
                  return (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                      {strategies.map(s => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={s.apply}
                          style={{
                            flex: 1,
                            padding: '10px 8px',
                            borderRadius: 12,
                            border: s.active ? `2px solid ${s.color}` : '1.5px solid #F8DCE5',
                            background: s.active ? s.bg : '#fff',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                            <span style={{ fontSize: 11, fontWeight: 900, color: s.active ? s.color : '#888', fontFamily: "'Arial Black',Impact,sans-serif" }}>{s.label}</span>
                            {s.kkottiPick && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 99, background: '#e62310', color: '#fff', marginLeft: 2 }}>꼬띠</span>}
                            <span style={{ fontSize: 10, fontWeight: 700, color: s.active ? s.color : '#aaa', background: s.active ? s.border : '#F8DCE5', padding: '1px 6px', borderRadius: 99 }}>{s.sub}</span>
                          </div>
                          <p style={{ fontSize: 11, color: s.active ? s.color : '#555', fontWeight: s.active ? 700 : 400, margin: '0 0 2px' }}>{s.desc}</p>
                          <p style={{ fontSize: 10, color: '#aaa', margin: 0, lineHeight: 1.3 }}>{s.hint}</p>
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {/* Kkotti template picker — styled */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 12,
                  background: selectedShippingTemplate ? '#f0fdf4' : '#FFF8FB',
                  border: selectedShippingTemplate ? '1.5px solid #86efac' : '1.5px solid #F8DCE5',
                  transition: 'all 0.2s',
                }}>
                  {/* Kkotti face */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: '#fff',
                    border: selectedShippingTemplate ? '1.5px solid #86efac' : '1.5px solid #FFB3CE',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, letterSpacing: '-1px',
                    color: selectedShippingTemplate ? '#16a34a' : '#e62310',
                  }}>
                    {selectedShippingTemplate ? '^w^' : '^_^'}
                  </div>

                  {/* Template info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {selectedShippingTemplate ? (
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 800, color: '#15803d', margin: '0 0 1px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedShippingTemplate.name}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {selectedShippingTemplate.naverTemplateNo ? (
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                              background: '#dbeafe', color: '#1d4ed8', fontFamily: 'monospace',
                            }}>
                              #{selectedShippingTemplate.naverTemplateNo}
                            </span>
                          ) : (
                            <span style={{
                              fontSize: 10, fontWeight: 600, color: '#d97706',
                              padding: '1px 7px', borderRadius: 99, background: '#fef9c3',
                            }}>
                              네이버 번호 미입력
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: '#6b7280' }}>
                            {selectedShippingTemplate.shippingFeeType === '4' || selectedShippingTemplate.shippingFeeType === '무료' ? '무료' :
                             selectedShippingTemplate.shippingFeeType === '3' || selectedShippingTemplate.shippingFeeType === '조건부무료' ? '조건부 무료' : '유료'}
                            {selectedShippingTemplate.shippingFee ? ` · ${Number(selectedShippingTemplate.shippingFee).toLocaleString()}원` : ''}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#e62310', margin: '0 0 1px' }}>
                          배송 레시피 선택
                        </p>
                        <p style={{ fontSize: 10, color: '#B0A0A8', margin: 0 }}>
                          꼬띠가 추천한 안에 맞는 템플릿을 고르거나 새로 만들어요
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setShippingModalOpen(true)}
                      style={{
                        padding: '6px 12px', borderRadius: 9, fontSize: 11, fontWeight: 700,
                        background: '#e62310', color: '#fff', border: 'none', cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {selectedShippingTemplate ? '변경' : '선택'}
                    </button>
                    {selectedShippingTemplate && (
                      <button
                        type="button"
                        onClick={() => { setSelectedShippingTemplate(null); setSelectedTemplateId(''); }}
                        style={{
                          padding: '6px 10px', borderRadius: 9, fontSize: 11, fontWeight: 700,
                          background: '#fff', color: '#B0A0A8', border: '1px solid #F8DCE5',
                          cursor: 'pointer',
                        }}
                        title="선택 해제"
                      >
                        해제
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="배송비유형">
                    <select className={sel} value={deliveryFeeType} onChange={e => setDeliveryFeeType(e.target.value)}>
                      {SHIPPING_FEE_TYPES.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                    </select>
                  </Field>
                  <Field label="기본배송비 (원)">
                    <input className={inp} type="number" value={basicDeliveryFee} onChange={e => setBasicDeliveryFee(e.target.value)} />
                  </Field>
                  <Field label="택배사코드">
                    <select className={sel} value={courierCode} onChange={e => setCourierCode(e.target.value)}>
                      {COURIER_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </Field>
                  <Field label="반품배송비 (원)">
                    <input className={inp} type="number" value={returnFee} onChange={e => setReturnFee(e.target.value)} />
                  </Field>
                  <Field label="교환배송비 (원)">
                    <input className={inp} type="number" value={exchangeFee} onChange={e => setExchangeFee(e.target.value)} />
                  </Field>
                  {deliveryFeeType === '조건부무료' && (
                    <Field label="무료 기준 금액 (원)">
                      <input className={inp} type="number" value={conditionalFreeAmount} onChange={e => setConditionalFreeAmount(e.target.value)} />
                    </Field>
                  )}
                </div>
              </DSection>

              {/* D4 A/S */}
              <DSection icon="🔧" title="A/S 설정" summary={asPhone}>
                <Field label="A/S 전화번호">
                  <input className={inp} value={asPhone} onChange={e => setAsPhone(e.target.value)} />
                </Field>
                <Field label="A/S 안내">
                  <textarea className={`${inp} h-20 resize-none`} value={asGuide} onChange={e => setAsGuide(e.target.value)} />
                </Field>
              </DSection>

              {/* D5 리뷰 포인트 */}
              <DSection icon="⭐" title="리뷰 포인트" summary={`텍스트 ${textReviewPoint}P · 포토 ${photoReviewPoint}P`}>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="텍스트리뷰 (P)">
                    <input className={inp} type="number" value={textReviewPoint} onChange={e => setTextReviewPoint(e.target.value)} />
                  </Field>
                  <Field label="포토/동영상 (P)">
                    <input className={inp} type="number" value={photoReviewPoint} onChange={e => setPhotoReviewPoint(e.target.value)} />
                  </Field>
                  <Field label="무이자 할부 (개월)">
                    <input className={inp} type="number" value={installmentMonths} onChange={e => setInstallmentMonths(e.target.value)} min={0} max={24} />
                  </Field>
                </div>
              </DSection>

              {/* D6 구매평/알림 */}
              <DSection icon="⚙️" title="구매평·알림" summary={`구매평 ${reviewVisible}`}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="구매평 노출">
                    <select className={sel} value={reviewVisible} onChange={e => setReviewVisible(e.target.value)}>
                      <option value="Y">Y (노출)</option>
                      <option value="N">N (비노출)</option>
                    </select>
                  </Field>
                </div>
              </DSection>

              {/* D7 상품정보고시 */}
              <DSection icon="📋" title="상품정보제공고시" summary={`코드: ${noticeTemplateCode || '미입력'}`}>
                <Field label="상품정보제공고시 템플릿코드">
                  <input className={inp} value={noticeTemplateCode} onChange={e => setNoticeTemplateCode(e.target.value)} placeholder="템플릿 코드" />
                </Field>
              </DSection>
            </div>

            {/* 대체상품 관리 패널 — 등록 전 미리 입력 가능 */}
            <AlternativeProductPanel
              productName={productName || undefined}
              suppliers={suppliers}
              onChange={setPendingAlternatives}
            />

            {/* 하단 버튼 */}
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <button
                onClick={handleNaverDirect}
                disabled={naverLoading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 20px', background: naverLoading ? '#aaa' : '#e62310', color: '#fff', borderRadius: 14, fontSize: 14, fontWeight: 900, border: 'none', cursor: naverLoading ? 'not-allowed' : 'pointer' }}
              >
                {naverLoading ? (
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                )}
                {naverLoading ? '등록 중...' : '네이버 직접 등록 (API)'}
              </button>
              <button onClick={handleGenerate} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 20px', background: '#03C75A', color: '#fff', borderRadius: 14, fontSize: 14, fontWeight: 900, border: 'none', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                네이버 엑셀 다운로드
              </button>
            </div>

          </div>{/* 좌측 끝 */}

          <ShippingTemplateModal
            open={shippingModalOpen}
            onClose={() => setShippingModalOpen(false)}
            supplierId={selectedSupplierId || undefined}
            onSelect={(t) => {
              setSelectedShippingTemplate(t);
              setSelectedTemplateId(t.id);

              setBasicDeliveryFee(String(t.shippingFee));
              setReturnFee(String(t.returnFee));
              setExchangeFee(String(t.exchangeFee));
              setCourierCode(t.courierCode);

  const feeType =
    Number(t.shippingFeeType) === 3 ? '무료' :
    Number(t.shippingFeeType) === 2 ? '조건부무료' :
    '유료';
  setDeliveryFeeType(feeType);

  if (Number(t.shippingFeeType) === 2) {
    setConditionalFreeAmount(String(t.freeThreshold ?? 0));
  }
}}

          />

        {/* ── Kkotti template auto-create modal ── */}
        {showTemplateCreateModal && pendingTemplateData && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}>
            <div style={{
              background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420,
              boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
              border: '2px solid #FFB3CE', overflow: 'hidden',
            }}>
              {/* Modal header */}
              <div style={{
                padding: '16px 20px 14px',
                background: 'linear-gradient(135deg,#ffe4ed,#ffd0e0)',
                borderBottom: '1px solid #FFB3CE',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: '#fff', border: '2px solid #FFB3CE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: '#e62310', letterSpacing: '-1px', flexShrink: 0,
                }}>^ㅅ^</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#e62310', margin: 0 }}>
                    배송 레시피가 없어요!
                  </p>
                  <p style={{ fontSize: 11, color: '#7f1d1d', margin: 0 }}>
                    꼬띠가 자동으로 만들어드릴게요
                  </p>
                </div>
              </div>

              {/* Template preview */}
              <div style={{ padding: '18px 20px' }}>
                <div style={{
                  background: '#FFF8FB', border: '1.5px solid #F8DCE5',
                  borderRadius: 12, padding: '14px 16px', marginBottom: 14,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A', margin: '0 0 8px' }}>
                    {pendingTemplateData.name}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {[
                      ['배송 유형', pendingTemplateData.shippingType === 4 ? '무료' : pendingTemplateData.shippingType === 3 ? '조건부 무료' : '유료'],
                      ['배송비', pendingTemplateData.shippingFee === 0 ? '무료' : `${pendingTemplateData.shippingFee.toLocaleString()}원`],
                      ...(pendingTemplateData.freeThreshold ? [['무료 조건', `${pendingTemplateData.freeThreshold.toLocaleString()}원 이상 구매 시`]] : []),
                      ['반품비', '6,000원'],
                      ['택배사', 'CJ대한통운'],
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: '#B0A0A8', fontWeight: 600 }}>{label}</span>
                        <span style={{ color: '#1A1A1A', fontWeight: 700 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: 11, color: '#B0A0A8', margin: '0 0 14px', lineHeight: 1.5 }}>
                  저장 후 네이버 스마트스토어센터에서 배송 템플릿 등록 후
                  번호를 배송 레시피 페이지에서 입력하시면 엑셀에 자동 반영됩니다.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!pendingTemplateData) return;
                      try {
                        const res = await fetch('/api/shipping-templates', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: pendingTemplateData.name,
                            code: pendingTemplateData.code,
                            shippingType: pendingTemplateData.shippingType,
                            shippingFee: pendingTemplateData.shippingFee,
                            freeThreshold: pendingTemplateData.freeThreshold ?? null,
                            returnFee: 6000,
                            exchangeFee: 6000,
                            courierCode: 'CJGLS',
                            supplierId: pendingTemplateData.supplierId ?? null,
                            isPrimary: false,
                          }),
                        });
                        const created = await res.json();
                        if (created.success && created.template) {
                          const t = created.template;
                          setSelectedShippingTemplate({
                            id: t.id, name: t.name,
                            naverTemplateNo: t.naverTemplateNo ?? null,
                            memo: t.memo ?? null,
                            platformCode: t.platformCode ?? null,
                            supplierCode: t.supplierCode ?? null,
                            active: t.active ?? true,
                            shippingFee: t.shippingFee,
                            shippingFeeType: String(t.shippingType),
                            freeThreshold: t.freeThreshold ?? null,
                            returnFee: t.returnFee,
                            exchangeFee: t.exchangeFee,
                            courierCode: t.courierCode,
                          });
                          setSelectedTemplateId(t.id);
                          setBasicDeliveryFee(String(t.shippingFee));
                          setReturnFee(String(t.returnFee));
                          setExchangeFee(String(t.exchangeFee));
                          setCourierCode(t.courierCode);
                          const feeType =
                            t.shippingType === 4 ? '무료' :
                            t.shippingType === 3 ? '조건부무료' : '유료';
                          setDeliveryFeeType(feeType);
                          if (t.shippingType === 3 && t.freeThreshold) {
                            setConditionalFreeAmount(String(t.freeThreshold));
                          }
                        }
                      } catch { /* ignore */ } finally {
                        setShowTemplateCreateModal(false);
                        setPendingTemplateData(null);
                      }
                    }}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13,
                      fontWeight: 800, background: '#e62310', color: '#fff',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    저장하고 적용
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowTemplateCreateModal(false); setPendingTemplateData(null); }}
                    style={{
                      padding: '10px 16px', borderRadius: 12, fontSize: 13,
                      fontWeight: 700, background: '#fff', color: '#B0A0A8',
                      border: '1.5px solid #F8DCE5', cursor: 'pointer',
                    }}
                  >
                    나중에
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* ══ 우측 고정 패널 (w-96) ══ */}
          <div className="w-96 shrink-0 space-y-4 sticky top-20">

            {/* Upload Readiness panel -- shown in edit mode or when key fields are filled */}
            {(() => {
              const isEditMode = !!searchParams?.get('edit');
              const hasContent = !!productName.trim() || !!price;
              if (!isEditMode && !hasContent) return null;
              const rd = calcUploadReadiness({
                naverCategoryCode: categoryId || undefined,
                keywords: aiKeywords,
                tags: seoTags,
                name: productName,
                mainImage: mainImage || undefined,
                images: additionalImages ? additionalImages.split(',').map(s => s.trim()).filter(Boolean) : [],
                shippingTemplateId: selectedTemplateId || undefined,
                salePrice: Number(price) || 0,
                supplierPrice: Number(supplierPrice) || 0,
                shippingFee: Number(basicDeliveryFee) || 3000,
              });
              const gs = READINESS_GRADE_STYLE[rd.grade];
              const col = getReadinessColor(rd.score);
              return (
                <div style={{ background: '#fff', border: `1.5px solid ${gs.border}`, borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px 10px', borderBottom: `1px solid ${gs.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: col, flexShrink: 0 }} />
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
                        {isEditMode ? '수정 준비도' : '업로드 준비도'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: col }}>{rd.score}%</span>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: gs.bg, color: gs.color, border: `1px solid ${gs.border}` }}>
                        {rd.grade}
                      </span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 16px' }}>
                    {/* Score bar */}
                    <div style={{ height: 6, background: '#F8DCE5', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
                      <div style={{ width: `${rd.score}%`, height: '100%', background: col, borderRadius: 99, transition: 'width 0.5s ease' }} />
                    </div>
                    {/* Failed items list */}
                    {rd.failed.length === 0 ? (
                      <p style={{ fontSize: 12, color: '#15803d', fontWeight: 700, textAlign: 'center', padding: '4px 0' }}>
                        모든 항목 통과 — 업로드 준비 완료!
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {rd.failed.map(item => (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: col, flexShrink: 0, marginTop: 5 }} />
                            <p style={{ fontSize: 11, color: '#555', margin: 0, lineHeight: 1.4 }}>{item.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 🍯 꽃통지수 (D2) */}
            <HoneyScorePanel
              salePrice={Number(price) || 0}
              supplierPrice={Number(supplierPrice) || 0}
              categoryId={categoryId || undefined}
              productName={productName || undefined}
              keywords={aiKeywords}
              tags={seoTags}
              hasMainImage={!!mainImage.trim()}
              hasDescription={description.length > 50}
              hasDiscountSet={!!discountValue && Number(discountValue) > 0}
            />

            {/* Margin Advisor Panel — shows when category D3 is selected, works with or without crawling */}
            {d1 && d3 && (
              <MarginAdvisorPanel
                d1={d1}
                d2={d2}
                d3={d3}
                supplierPrice={Number(supplierPrice) || 0}
                salePrice={Number(price) || 0}
                shippingFee={Number(basicDeliveryFee) || 3000}
                onApplySalePrice={v => setPrice(String(v))}
              />
            )}

            {/* 💰 마진 계산기 */}
            <MarginCalculator
              supplierPrice={Number(supplierPrice) || 0}
              salePrice={Number(price) || 0}
              instantDiscount={
                discountValue && Number(discountValue) > 0 && Number(price) > 0
                  ? discountUnit === '%'
                    ? Math.round(Number(price) * Number(discountValue) / 100)
                    : Number(discountValue)
                  : 0
              }
              discountUnit={discountUnit === '%' ? '%' : 'won'}
              shippingFee={Number(basicDeliveryFee) || 3000}
              categoryPath={
                [d1, d2, d3, d4].filter(Boolean).join(' > ') || undefined
              }
              categoryCode={categoryId || undefined}
              onSupplierPriceChange={v => setSupplierPrice(String(v))}
              onSalePriceChange={v => setPrice(String(v))}
              onInstantDiscountChange={v => {
                setDiscountValue(String(v));
              }}
              onCategoryChange={cat => {
                const found = NAVER_CATEGORIES_FULL.find(c => c.code === cat.code);
                if (found) {
                  setD1(found.d1); setD2(found.d2); setD3(found.d3); setD4(found.d4);
                }
              }}
            />

            {/* AI SEO workflow — D1 redesigned */}
            <NaverSEOWorkflow
              productName={productName}
              categoryPath={[d1, d2, d3, d4].filter(Boolean).join(' > ') || undefined}
              categoryCode={categoryId || undefined}
              description={description || undefined}
              price={Number(price) || undefined}
              supplierPrice={Number(supplierPrice) || undefined}
              currentKeywords={aiKeywords.length > 0 ? aiKeywords : undefined}
              autoRun={searchParams?.get('autoSeo') === '1'}
              onApplyCategory={(code, nd1, nd2, nd3, nd4) => {
                setD1(nd1); setD2(nd2); setD3(nd3); setD4(nd4);
                setCatTab('drill');
              }}
              onApplyKeywords={kws => setAiKeywords(kws)}
              onApplyProductName={name => setProductName(name)}
              onApplyTags={tags => setSeoTags(tags)}
              onApplyHook={hook => setSeoHook(hook)}
            />

            {/* 📊 SEO 점수 */}
            <div className={`bg-gradient-to-r ${seoBg} rounded-2xl border p-4 space-y-3`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">📊 SEO 점수</h3>
                <span className={`text-3xl font-extrabold ${seoColor}`}>{seoResult.score}점</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold px-3 py-1 rounded-full ${
                  seoResult.grade === 'S' ? 'bg-green-100 text-green-700' :
                  seoResult.grade === 'A' ? 'bg-blue-100 text-blue-700' :
                  seoResult.grade === 'B' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                }`}>등급 {seoResult.grade}</span>
                <div className="flex-1 bg-white/60 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full transition-all duration-500 ${
                    seoResult.score >= 80 ? 'bg-green-500' : seoResult.score >= 60 ? 'bg-yellow-500' : 'bg-red-400'
                  }`} style={{ width: `${seoResult.score}%` }} />
                </div>
              </div>
              {/* 체크 항목 */}
              <div className="space-y-1">
                {seoResult.checks.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/70 rounded-lg px-2.5 py-1.5 text-xs">
                    <span className="text-gray-600">{c.label}</span>
                    <span className={c.ok ? 'text-green-600 font-bold' : 'text-red-400'}>{c.ok ? `+${c.point}` : '0'}</span>
                  </div>
                ))}
              </div>
              {/* 개선 제안 */}
              {seoResult.suggestions.length > 0 && (
                <div className="space-y-1">
                  {seoResult.suggestions.slice(0, 2).map((s, i) => (
                    <p key={i} className="text-xs text-gray-600 bg-white/60 rounded-lg px-2.5 py-1.5">💡 {s}</p>
                  ))}
                </div>
              )}
            </div>

            {/* 📋 엑셀 매핑 미리보기 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm mb-3">📋 엑셀 매핑 미리보기</h3>
              <div className="space-y-1.5 text-xs">
                {[
                  { label: '카테고리코드', value: categoryId || '-' },
                  { label: '판매가', value: price ? `${Number(price).toLocaleString()}원` : '-' },
                  { label: '할인율', value: discountValue ? `${discountValue}${discountUnit}` : '-' },
                  { label: '배송비', value: `${Number(basicDeliveryFee).toLocaleString()}원 (${deliveryFeeType})` },
                  { label: '택배사', value: courierCode },
                  { label: '반품배송비', value: `${Number(returnFee).toLocaleString()}원` },
                  { label: '원산지코드', value: originCode },
                  { label: '브랜드', value: brand },
                  { label: '리뷰포인트', value: `텍스트 ${textReviewPoint}P · 포토 ${photoReviewPoint}P` },
                  { label: '상품정보고시', value: noticeTemplateCode || '미입력' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-1 border-b border-gray-50">
                    <span className="text-gray-500">{row.label}</span>
                    <span className={`font-medium ${row.value === '-' || row.value === '미입력' ? 'text-red-400' : 'text-gray-800'}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>{/* 우측 끝 */}
        </div>{/* flex 끝 */}
      </div>

      {/* ── Platform Modal (add / edit) ── */}
      {platQuickOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-base">
                {platQuickMode === 'edit' ? '플랫폼 수정' : '플랫폼 빠른 추가'}
              </h2>
              <button onClick={() => setPlatQuickOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">플랫폼 이름 *</label>
                <input
                  className={inp}
                  value={platQuickName}
                  onChange={e => {
                    const val = e.target.value;
                    setPlatQuickName(val);
                    if (platQuickMode === 'add') setPlatQuickCode(quickAutoCode(val));
                  }}
                  placeholder="예) 도매매, 도매꾹, 자체제작"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  플랫폼 코드 {platQuickMode === 'add' && <span className="font-normal text-gray-400">* (영문 대문자 2~5자, 추후 변경 불가)</span>}
                  {platQuickMode === 'edit' && <span className="font-normal text-gray-400">(변경 불가)</span>}
                </label>
                <input
                  className={inp + (platQuickMode === 'edit' ? ' bg-gray-50 opacity-60 cursor-not-allowed' : '')}
                  value={platQuickCode}
                  onChange={e => platQuickMode === 'add' && setPlatQuickCode(e.target.value.replace(/[^a-zA-Z0-9]/g,'').toUpperCase().slice(0,5))}
                  placeholder="예) DMM, DMK, OWN"
                  readOnly={platQuickMode === 'edit'}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">URL (선택)</label>
                <input
                  className={inp}
                  value={platQuickUrl}
                  onChange={e => setPlatQuickUrl(e.target.value)}
                  placeholder="https://domeme.com"
                />
              </div>
            </div>
            {platQuickError && <p className="text-xs text-red-500 font-medium">{platQuickError}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setPlatQuickOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition">취소</button>
              <button
                onClick={saveQuickPlatform}
                disabled={platQuickSaving}
                className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition"
              >
                {platQuickSaving ? '저장 중...' : platQuickMode === 'edit' ? '수정 완료' : '추가하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Supplier Modal (add / edit) ── */}
      {supQuickOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-base">
                {supQuickMode === 'edit' ? '공급사 수정' : '공급사 빠른 추가'}
              </h2>
              <button onClick={() => setSupQuickOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              {/* Platform — DB-driven, disabled on edit */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">플랫폼</label>
                <select
                  className={sel + (supQuickMode === 'edit' ? ' bg-gray-50 opacity-60 cursor-not-allowed' : '')}
                  value={supQuickPlatformCode}
                  onChange={e => supQuickMode === 'add' && setSupQuickPlatformCode(e.target.value)}
                  disabled={supQuickMode === 'edit'}
                >
                  <option value="">플랫폼 선택</option>
                  {platforms.map(p => <option key={p.id} value={p.code}>{p.name} ({p.code})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">공급사 이름 *</label>
                <input
                  className={inp}
                  value={supQuickName}
                  onChange={e => {
                    const val = e.target.value;
                    setSupQuickName(val);
                    if (supQuickMode === 'add') setSupQuickAbbr(quickAutoCode(val).slice(0, 3));
                  }}
                  placeholder="예) 홈리빙 공급사"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">약어 (abbr) * <span className="text-gray-400 font-normal">2~4자 대문자</span></label>
                <input
                  className={inp}
                  value={supQuickAbbr}
                  onChange={e => setSupQuickAbbr(e.target.value.replace(/[^a-zA-Z0-9]/g,'').toUpperCase().slice(0,4))}
                  placeholder="예) HLV, GDN"
                />
                <p className="mt-1 text-xs text-gray-400">SKU — <span className="font-mono text-pink-600">{supQuickPlatformCode || '??'}-{supQuickAbbr || '???'}-상품번호</span></p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">기본 마진율 (%)</label>
                  <input
                    className={inp}
                    type="number"
                    value={supQuickMargin}
                    onChange={e => setSupQuickMargin(e.target.value)}
                    min={0} max={100} placeholder="30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">연락처 (선택)</label>
                  <input
                    className={inp}
                    value={supQuickContact}
                    onChange={e => setSupQuickContact(e.target.value)}
                    placeholder="010-0000-0000"
                  />
                </div>
              </div>
            </div>
            {supQuickError && <p className="text-xs text-red-500 font-medium">{supQuickError}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setSupQuickOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition">취소</button>
              <button
                onClick={saveQuickSupplier}
                disabled={supQuickSaving}
                className="flex-1 py-2.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition"
              >
                {supQuickSaving ? '저장 중...' : supQuickMode === 'edit' ? '수정 완료' : '추가하기'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function NewProductPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #FFB3CE', borderTop: '3px solid #e62310', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <NewProductPageInner />
    </Suspense>
  );
}
