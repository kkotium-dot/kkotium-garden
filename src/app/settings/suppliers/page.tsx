'use client';
// /settings/suppliers — 거래처 명단 v2
// P3-C: "도매꽉 ID" typo fix → "도매꾹 ID"
//        기본 배송 템플릿 드롭다운 추가
//        연결 상품 수 클릭 → /products?supplier={id} 이동

import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Check, X, Store, Search, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const PLATFORM_CODES = ['DMM', 'DMK', 'OWN', 'ETC'] as const;
type PlatformCode = typeof PLATFORM_CODES[number];

const PLATFORM_LABELS: Record<PlatformCode, string> = {
  DMM: 'Domeggook (DMM)',
  DMK: 'Domeki (DMK)',
  OWN: 'Own Brand (OWN)',
  ETC: 'Other (ETC)',
};

interface Platform {
  id: string;
  name: string;
  code: string;
}

interface ShippingTemplateOption {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
  abbr: string | null;
  platformCode: string;
  platformId: string | null;
  platformUrl: string | null;
  contact: string | null;
  address: string | null;
  description: string | null;
  domeggookSellerId: string | null;
  defaultMargin: number;
  defaultShippingTemplateId: string | null;
  defaultShippingTemplate?: { id: string; name: string; shippingFee: number; shippingType: number } | null;
  active: boolean;
  createdAt: string;
  products: { id: string }[];
  shippingTemplates?: { id: string; name: string }[];
  platform?: { name: string; code: string } | null;
}

const EMPTY_FORM = {
  name: '',
  code: '',
  abbr: '',
  platformCode: 'ETC' as PlatformCode,
  platformId: '',
  platformUrl: '',
  contact: '',
  address: '',
  description: '',
  defaultMargin: 30,
  domeggookSellerId: '',
  defaultShippingTemplateId: '',
};

type ModalState = {
  open: boolean;
  mode: 'add' | 'edit';
  id?: string;
  data: typeof EMPTY_FORM;
};

function deriveAbbr(code: string, name: string): string {
  const stripped = code.replace(/^[A-Z]+-/, '');
  const base = stripped || name;
  return base.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
}

const CHO = ['G','GG','N','D','DD','R','M','B','BB','S','SS','','J','JJ','CH','K','T','P','H'];
function autoCode(name: string): string {
  const eng = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (eng.length >= 2) return eng.slice(0, 6);
  let result = '';
  for (const ch of name) {
    const cp = ch.charCodeAt(0);
    if (cp >= 0xAC00 && cp <= 0xD7A3) {
      result += CHO[Math.floor((cp - 0xAC00) / 588)] ?? '';
    }
  }
  return result.slice(0, 6) || 'SUP';
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers]           = useState<Supplier[]>([]);
  const [platforms, setPlatforms]           = useState<Platform[]>([]);
  const [shippingOptions, setShippingOpts]  = useState<ShippingTemplateOption[]>([]);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [search, setSearch]                 = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterActive, setFilterActive]     = useState<'all' | 'active' | 'inactive'>('active');
  const [modal, setModal]                   = useState<ModalState>({ open: false, mode: 'add', data: { ...EMPTY_FORM } });
  const [toast, setToast]                   = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [abbrError, setAbbrError]           = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sr, pr, str] = await Promise.all([
        fetch('/api/suppliers?includeInactive=true', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/platforms?includeInactive=true', { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/shipping-templates', { cache: 'no-store' }).then(r => r.json()),
      ]);
      if (sr.success)  setSuppliers(sr.suppliers);
      if (pr.success)  setPlatforms(pr.platforms);
      if (str.success) setShippingOpts(str.templates ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const filtered = useMemo(() => {
    return suppliers.filter(s => {
      if (filterPlatform && s.platformCode !== filterPlatform) return false;
      if (filterActive === 'active'   && !s.active) return false;
      if (filterActive === 'inactive' &&  s.active) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.abbr ?? '').toLowerCase().includes(q) ||
          (s.contact ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [suppliers, filterPlatform, filterActive, search]);

  const openAdd = () => {
    setAbbrError('');
    setModal({ open: true, mode: 'add', data: { ...EMPTY_FORM } });
  };

  const openEdit = (s: Supplier) => {
    setAbbrError('');
    setModal({
      open: true,
      mode: 'edit',
      id: s.id,
      data: {
        name: s.name,
        code: s.code,
        abbr: s.abbr ?? '',
        platformCode: (PLATFORM_CODES.includes(s.platformCode as PlatformCode) ? s.platformCode : 'ETC') as PlatformCode,
        platformId: s.platformId ?? '',
        platformUrl: s.platformUrl ?? '',
        contact: s.contact ?? '',
        address: s.address ?? '',
        description: s.description ?? '',
        defaultMargin: s.defaultMargin,
        domeggookSellerId: s.domeggookSellerId ?? '',
        defaultShippingTemplateId: s.defaultShippingTemplateId ?? '',
      },
    });
  };

  const setField = <K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) => {
    setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));
  };

  const handleNameChange = (name: string) => {
    if (modal.mode === 'add') {
      const platCode = modal.data.platformCode;
      const base = autoCode(name);
      const code = `${platCode}-${base}`;
      const abbr = deriveAbbr(code, name);
      setModal(m => ({ ...m, data: { ...m.data, name, code, abbr } }));
    } else {
      setField('name', name);
    }
  };

  const handlePlatformChange = (pc: PlatformCode) => {
    if (modal.mode === 'add') {
      const base = autoCode(modal.data.name);
      const code = `${pc}-${base || 'NEW'}`;
      const plat = platforms.find(p => p.code.toUpperCase() === pc);
      setModal(m => ({ ...m, data: { ...m.data, platformCode: pc, platformId: plat?.id ?? '', code } }));
    } else {
      const plat = platforms.find(p => p.code.toUpperCase() === pc);
      setModal(m => ({ ...m, data: { ...m.data, platformCode: pc, platformId: plat?.id ?? '' } }));
    }
  };

  const save = async () => {
    const { mode, data, id } = modal;
    if (!data.name.trim()) { showToast('공급사 이름을 입력해 주세요', 'error'); return; }
    if (!data.code.trim()) { showToast('코드를 입력해 주세요', 'error'); return; }
    if (!data.abbr.trim()) { showToast('약자(abbr)를 입력해 주세요', 'error'); return; }
    if (data.abbr.length < 2 || data.abbr.length > 4) { setAbbrError('abbr은 2~4자리여야 합니다'); return; }
    setAbbrError('');
    setSaving(true);
    try {
      const payload = {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        abbr: data.abbr.trim().toUpperCase(),
        platformCode: data.platformCode,
        platformId: data.platformId || undefined,
        platformUrl: data.platformUrl.trim() || null,
        contact: data.contact.trim() || null,
        address: data.address.trim() || null,
        description: data.description.trim() || null,
        defaultMargin: data.defaultMargin,
        domeggookSellerId: data.domeggookSellerId.trim() || null,
        defaultShippingTemplateId: data.defaultShippingTemplateId || null,
      };
      const url = mode === 'add' ? '/api/suppliers' : `/api/suppliers/${id}`;
      const res = await fetch(url, {
        method: mode === 'add' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.success) {
        showToast(mode === 'add' ? '공급사가 추가됐습니다' : '공급사가 수정됐습니다');
        setModal(m => ({ ...m, open: false }));
        loadAll();
      } else {
        showToast(d.error ?? '저장 실패', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteSupplier = async (s: Supplier) => {
    const linked = s.products?.length ?? 0;
    const msg = linked > 0
      ? `'${s.name}'은 상품 ${linked}개에 연결되어 있습니다. 삭제하면 연결을 먼저 해제해야 합니다. 계속할까요?`
      : `'${s.name}' 공급사를 삭제할까요?`;
    if (!confirm(msg)) return;
    const res = await fetch(`/api/suppliers/${s.id}`, { method: 'DELETE' });
    const d   = await res.json();
    if (d.success) { showToast(`'${s.name}' 삭제됨`); loadAll(); }
    else showToast(d.error ?? '삭제 실패', 'error');
  };

  const platformBadgeColor: Record<string, string> = {
    DMM: 'bg-blue-100 text-blue-700',
    DMK: 'bg-purple-100 text-purple-700',
    OWN: 'bg-green-100 text-green-700',
    ETC: 'bg-gray-100 text-gray-600',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 56px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                  {([0,60,120,180,240,300] as number[]).map((deg, i) => { const r = deg * Math.PI / 180; const cx = 26 + Math.cos(r) * 11.4; const cy = 26 + Math.sin(r) * 11.4; return <ellipse key={i} cx={cx} cy={cy} rx={14} ry={10.4} transform={`rotate(${deg} ${cx} ${cy})`} fill="#e62310" />; })}
                  <circle cx="26" cy="26" r="14.6" fill="#e62310" />
                </svg>
                <Store size={20} color="#fff" style={{ position: 'relative', zIndex: 1 }} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>거래처 명단</h1>
            </div>
            <button
              onClick={openAdd}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#e62310', color: '#fff', padding: '8px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', flexShrink: 0 }}
            >
              <Plus size={15} /> 공급사 추가
            </button>
          </div>
          <div style={{ height: 2.5, background: '#FFB3CE', borderRadius: 99, margin: '8px 0 6px' }} />
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>플랫폼별 공급사를 등록하고 관리합니다. abbr 코드는 SKU 생성과 배송 템플릿 명명에 사용됩니다.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
              placeholder="이름, 코드, abbr 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
            value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
            <option value="">전체 플랫폼</option>
            {PLATFORM_CODES.map(pc => <option key={pc} value={pc}>{PLATFORM_LABELS[pc]}</option>)}
          </select>
          <select className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
            value={filterActive} onChange={e => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}>
            <option value="active">활성 공급사</option>
            <option value="inactive">비활성</option>
            <option value="all">전체</option>
          </select>
        </div>

        {/* Platform stats */}
        <div className="flex gap-3 mb-5">
          {PLATFORM_CODES.map(pc => {
            const count = suppliers.filter(s => s.platformCode === pc && s.active).length;
            if (!count) return null;
            return (
              <div key={pc} className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer ${filterPlatform === pc ? 'ring-2 ring-pink-400' : ''} ${platformBadgeColor[pc]}`}
                onClick={() => setFilterPlatform(filterPlatform === pc ? '' : pc)}>
                {pc} {count}
              </div>
            );
          })}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>검색 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">공급사</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500">코드 / abbr</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500">플랫폼</th>
                  {/* Fixed typo: 도매꽉 → 도매꾹 */}
                  <th className="text-left px-3 py-3 font-medium text-gray-500">도매꾹 ID</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500">기본 배송</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500">마진</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500">연결 상품</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500">상태</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => (
                  <tr key={s.id} className={`hover:bg-gray-50 transition ${!s.active ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-800">{s.name}</div>
                      {s.contact && <div className="text-xs text-gray-400 mt-0.5">{s.contact}</div>}
                      {s.description && <div className="text-xs text-gray-400 truncate max-w-[200px]">{s.description}</div>}
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded inline-block">{s.code}</div>
                      {s.abbr
                        ? <div className="font-mono text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded inline-block mt-1 ml-1">{s.abbr}</div>
                        : <div className="text-xs text-red-400 mt-1">abbr 없음</div>
                      }
                    </td>
                    <td className="px-3 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${platformBadgeColor[s.platformCode] ?? 'bg-gray-100 text-gray-600'}`}>
                        {s.platformCode}
                      </span>
                    </td>
                    {/* Fixed: 도매꾹 ID */}
                    <td className="px-3 py-4">
                      {s.domeggookSellerId
                        ? <span className="font-mono text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{s.domeggookSellerId}</span>
                        : <span className="text-xs text-gray-300">—</span>
                      }
                    </td>
                    {/* Default shipping template */}
                    <td className="px-3 py-4">
                      {s.defaultShippingTemplate
                        ? <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-medium truncate max-w-[120px] block">{s.defaultShippingTemplate.name}</span>
                        : <span className="text-xs text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-3 py-4 text-gray-700">{s.defaultMargin}%</td>
                    {/* Linked products — clickable link to /products?supplier={id} */}
                    <td className="px-3 py-4">
                      {(s.products?.length ?? 0) > 0 ? (
                        <Link
                          href={`/products?supplier=${s.id}`}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {s.products.length}개
                          <ExternalLink size={10} />
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-300">0개</span>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                        {s.active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteSupplier(s)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">{modal.mode === 'add' ? '공급사 추가' : '공급사 수정'}</h2>
              <button onClick={() => setModal(m => ({ ...m, open: false }))}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Platform */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">플랫폼 <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {PLATFORM_CODES.map(pc => (
                    <button key={pc} type="button" onClick={() => handlePlatformChange(pc)}
                      className={`py-2 rounded-xl text-sm font-medium border transition ${modal.data.platformCode === pc ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {pc}
                    </button>
                  ))}
                </div>
              </div>
              {/* Name */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">공급사 이름 <span className="text-red-500">*</span></label>
                <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="예: 하이뷰 플라워" value={modal.data.name} onChange={e => handleNameChange(e.target.value)} />
              </div>
              {/* Code + Abbr */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">코드 <span className="text-red-500">*</span></label>
                  <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-300 bg-gray-50"
                    value={modal.data.code}
                    onChange={e => {
                      const v = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                      setField('code', v);
                      if (modal.mode === 'add') setField('abbr', deriveAbbr(v, modal.data.name));
                    }} />
                  <p className="text-xs text-gray-400 mt-1">SKU 앞 접두사로 사용</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">약자 abbr <span className="text-red-500">*</span></label>
                  <input className={`w-full border rounded-xl px-4 py-2.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-300 ${abbrError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    maxLength={4} value={modal.data.abbr}
                    onChange={e => {
                      const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      setField('abbr', v);
                      setAbbrError(v.length > 0 && (v.length < 2 || v.length > 4) ? 'abbr은 2~4자리' : '');
                    }} />
                  {abbrError && <p className="text-xs text-red-500 mt-1">{abbrError}</p>}
                </div>
              </div>
              {/* Platform URL */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">플랫폼 상품 URL</label>
                <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="https://www.domemae.com/goods/..."
                  value={modal.data.platformUrl} onChange={e => setField('platformUrl', e.target.value)} />
              </div>
              {/* Contact + DefaultMargin */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">연락처</label>
                  <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                    placeholder="010-1234-5678" value={modal.data.contact} onChange={e => setField('contact', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">기본 마진율 (%)</label>
                  <input type="number" min={0} max={100} step={0.5}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                    value={modal.data.defaultMargin} onChange={e => setField('defaultMargin', Number(e.target.value))} />
                </div>
              </div>
              {/* Domeggook Seller ID — fixed label typo */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">도매꾹 판매자 ID</label>
                <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="예) bowon10121, nexstay" value={modal.data.domeggookSellerId}
                  onChange={e => setField('domeggookSellerId', e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">크롤링 시 이 ID로 공급사를 자동 매칭합니다.</p>
              </div>
              {/* Default shipping template — NEW */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">기본 배송 템플릿</label>
                <select
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
                  value={modal.data.defaultShippingTemplateId}
                  onChange={e => setField('defaultShippingTemplateId', e.target.value)}
                >
                  <option value="">— 기본 템플릿 없음</option>
                  {shippingOptions.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">상품 등록 시 공급사 자동 매핑 후 이 배송 템플릿이 기본값으로 설정됩니다.</p>
              </div>
              {/* Address */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">주소</label>
                <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  value={modal.data.address} onChange={e => setField('address', e.target.value)} />
              </div>
              {/* Description */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">메모</label>
                <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="꽃 전문 공급사, 리드타임 2일..."
                  value={modal.data.description} onChange={e => setField('description', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6 sticky bottom-0 bg-white pt-3 border-t">
              <button onClick={() => setModal(m => ({ ...m, open: false }))}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                취소
              </button>
              <button onClick={save} disabled={saving || !modal.data.name.trim()}
                className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
