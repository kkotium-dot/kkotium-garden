'use client';
import { useState, useEffect, useMemo } from 'react';
import { X, Check, Truck, Trash2, Plus, Pencil } from 'lucide-react';
import { PlatformPicker, SupplierPicker } from '@/components/ui/PlatformSupplierPicker';

export interface ShippingTemplateItem {
  id: string;
  name: string;
  naverTemplateNo: string | null;
  memo: string | null;
  platformCode: string | null;
  supplierCode: string | null;
  active: boolean;
  shippingFee: number;
  shippingFeeType: string;
  freeThreshold: number | null;
  returnFee: number;
  exchangeFee: number;
  courierCode: string;
}

interface Platform { id: string; name: string; code: string; }
interface Supplier { id: string; name: string; code: string; abbr?: string | null; platformId?: string; platformCode?: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (template: ShippingTemplateItem) => void;
  supplierId?: string;
}

// Shipping type numeric codes from DB
const SHIPPING_TYPE_LABELS: Record<number, string> = { 1: '유료', 2: '조건부무료', 3: '무료' };

// Build template name prefix per confirmed convention:
// Case A (platform + supplier): {PLAT}_{ABBR}_{TYPE}_{CONDITION}  -> DMM_HV_유료_3000
// Case B (platform only):       {PLAT}_{TYPE}_{CONDITION}          -> DMM_유료_3000
// Case C (all):                 ALL_{TYPE}_{CONDITION}             -> ALL_무료조건_3만이상
function buildTemplateName(
  platCode: string,
  supplierAbbr: string,
  shippingType: string,
  shippingFee: string,
  freeThreshold: string,
): string {
  const typeNum = Number(shippingType);
  const typeLabel = SHIPPING_TYPE_LABELS[typeNum] ?? '유료';
  // Condition segment
  let condition = '';
  if (typeNum === 1) condition = shippingFee ? shippingFee : '';
  else if (typeNum === 2) condition = freeThreshold ? `${Number(freeThreshold) >= 10000 ? Math.floor(Number(freeThreshold)/10000)+'만이상' : freeThreshold}` : '';

  const parts: string[] = [];
  if (platCode && platCode !== 'ALL') parts.push(platCode.toUpperCase());
  else parts.push('ALL');
  if (supplierAbbr) parts.push(supplierAbbr.toUpperCase());
  parts.push(typeLabel);
  if (condition) parts.push(condition);

  return parts.join('_');
}

// Build internal identifier code (lowercase, hyphen-separated, NOT the display name)
// Format: {platcode}-{abbr}-{couriercode}-{shippingtype}
// Example: dmm-hv-cjgls-1
function buildIdentifierCode(platCode: string, supplierAbbr: string, courierCode: string, shippingType: string): string {
  const parts = [platCode || 'all'];
  if (supplierAbbr) parts.push(supplierAbbr);
  if (courierCode) parts.push(courierCode);
  parts.push(shippingType || '1');
  return parts.join('-').toLowerCase();
}

export function ShippingTemplateModal({ open, onClose, onSelect, supplierId }: Props) {
  const [templates, setTemplates] = useState<ShippingTemplateItem[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [selPlatCode, setSelPlatCode] = useState('');
  const [selSupplierId, setSelSupplierId] = useState('');
  const [newName, setNewName] = useState('');
  const [nameOverridden, setNameOverridden] = useState(false); // true if user manually edited name
  const [newCode, setNewCode] = useState(''); // naver template no
  const [newMemo, setNewMemo] = useState('');
  const [newShippingFee, setNewShippingFee] = useState('3000');
  const [newReturnFee, setNewReturnFee] = useState('6000');
  const [newExchangeFee, setNewExchangeFee] = useState('6000');
  const [newFreeThreshold, setNewFreeThreshold] = useState('');
  const [newCourierCode, setNewCourierCode] = useState('CJGLS');
  const [newShippingType, setNewShippingType] = useState('1');
  const [saving, setSaving] = useState(false);

  // Filter group by platform in list
  const [filterPlatCode, setFilterPlatCode] = useState('');

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/shipping-templates?includeInactive=false').then(r => r.json()),
      fetch('/api/platforms?includeInactive=false').then(r => r.json()),
      fetch('/api/suppliers').then(r => r.json()),
    ]).then(([td, pd, sd]) => {
      setTemplates(td.templates ?? []);
      setPlatforms(pd.platforms ?? []);
      setSuppliers(sd.suppliers ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      fetchAll();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setAddMode(false);
    setEditId(null);
    setSelPlatCode('');
    setSelSupplierId('');
    setNewName('');
    setNameOverridden(false);
    setNewCode('');
    setNewMemo('');
    setNewShippingFee('3000');
    setNewReturnFee('6000');
    setNewExchangeFee('6000');
    setNewFreeThreshold('');
    setNewCourierCode('CJGLS');
    setNewShippingType('1');
  };

  // Auto-compute display name from selections unless user has overridden it
  useEffect(() => {
    if (nameOverridden || !addMode) return;
    const sup = suppliers.find(s => s.id === selSupplierId);
    const abbr = sup?.abbr ?? '';
    const generated = buildTemplateName(selPlatCode || 'ALL', abbr, newShippingType, newShippingFee, newFreeThreshold);
    setNewName(generated);
  }, [selPlatCode, selSupplierId, newShippingType, newShippingFee, newFreeThreshold, suppliers, addMode, nameOverridden]);

  // Suppliers filtered by selected platform
  const filteredSuppliers = useMemo(() => {
    if (!selPlatCode) return suppliers;
    const plat = platforms.find(p => p.code === selPlatCode);
    if (!plat) return suppliers;
    return suppliers.filter(s => s.platformId === plat.id || s.platformCode === selPlatCode);
  }, [selPlatCode, suppliers, platforms]);

  // Template list filtered by platform filter
  const visibleTemplates = useMemo(() => {
    if (!filterPlatCode) return templates;
    return templates.filter(t => t.platformCode === filterPlatCode || (!t.platformCode && filterPlatCode === 'ALL'));
  }, [templates, filterPlatCode]);

  // Group templates by platformCode for visual grouping
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, ShippingTemplateItem[]> = {};
    visibleTemplates.forEach(t => {
      const key = t.platformCode ?? 'ALL';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [visibleTemplates]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('이 배송 템플릿을 삭제할까요?')) return;
    await fetch(`/api/shipping-templates/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const handleSave = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const sup = suppliers.find(s => s.id === selSupplierId);
      const identifierCode = buildIdentifierCode(
        selPlatCode || 'all',
        sup?.abbr ?? '',
        newCourierCode,
        newShippingType,
      );

      const body = {
        name: newName.trim(),
        code: identifierCode + '_' + Date.now().toString(36),
        naverTemplateNo: newCode.trim() || null,
        memo: newMemo.trim() || null,
        platformCode: selPlatCode || null,
        supplierCode: sup?.code || null,
        supplierId: selSupplierId || null,
        shippingFee: Number(newShippingFee) || 3000,
        shippingType: Number(newShippingType) || 1,
        freeThreshold: newFreeThreshold ? Number(newFreeThreshold) : null,
        returnFee: Number(newReturnFee) || 6000,
        exchangeFee: Number(newExchangeFee) || 6000,
        courierCode: newCourierCode || 'CJGLS',
      };

      const url = editId ? `/api/shipping-templates/${editId}` : '/api/shipping-templates';
      const method = editId ? 'PATCH' : 'POST';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      resetForm();
      fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const openEditMode = (t: ShippingTemplateItem & { supplierId?: string; platformCode?: string | null }) => {
    setEditId(t.id);
    setAddMode(true);
    setNameOverridden(true);
    setNewName(t.name);
    setSelPlatCode(t.platformCode ?? '');
    setNewCode(t.naverTemplateNo ?? '');
    setNewMemo(t.memo ?? '');
    setNewShippingFee(String(t.shippingFee));
    setNewReturnFee(String(t.returnFee));
    setNewExchangeFee(String(t.exchangeFee));
    setNewFreeThreshold(t.freeThreshold ? String(t.freeThreshold) : '');
    setNewCourierCode(t.courierCode);
    setNewShippingType(t.shippingFeeType ? t.shippingFeeType : '1');
  };

  if (!open) return null;

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white';
  const sel = inp + ' appearance-none cursor-pointer';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg mx-0 sm:mx-4 overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-rose-400" />
            <span className="font-semibold text-gray-800 text-sm">배송비 템플릿</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Platform filter tabs (only when not in add mode) */}
        {!addMode && platforms.length > 0 && (
          <div className="flex gap-1 px-4 py-2.5 border-b border-gray-100 shrink-0 overflow-x-auto">
            <button
              onClick={() => setFilterPlatCode('')}
              className={`shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-all ${filterPlatCode === '' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              전체
            </button>
            {platforms.map(p => (
              <button
                key={p.id}
                onClick={() => setFilterPlatCode(p.code)}
                className={`shrink-0 text-xs px-3 py-1 rounded-full font-medium transition-all ${filterPlatCode === p.code ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {p.code}
              </button>
            ))}
          </div>
        )}

        {/* Template list */}
        {!addMode && (
          <div className="overflow-y-auto flex-1">
            {loading && <div className="py-10 text-center text-sm text-gray-400">불러오는 중...</div>}
            {!loading && visibleTemplates.length === 0 && (
              <div className="py-10 text-center">
                <Truck size={28} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">등록된 배송 템플릿이 없습니다.</p>
              </div>
            )}
            {!loading && Object.entries(groupedTemplates).map(([platCode, group]) => (
              <div key={platCode}>
                {/* Group header */}
                <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{platCode}</span>
                </div>
                {group.map(t => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-rose-50 transition-colors group border-b border-gray-50"
                  >
                    <button
                      type="button"
                      onClick={() => { onSelect(t); onClose(); }}
                      className="flex-1 text-left min-w-0"
                    >
                      <div className="text-sm font-semibold text-gray-800">{t.name}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {t.naverTemplateNo && (
                          <span className="text-xs text-blue-500 font-mono bg-blue-50 px-1.5 py-0.5 rounded">No.{t.naverTemplateNo}</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {SHIPPING_TYPE_LABELS[Number(t.shippingFeeType)] ?? '유료'} {Number(t.shippingFee).toLocaleString()}원
                        </span>
                        {t.memo && <span className="text-xs text-gray-400 truncate max-w-[120px]">{t.memo}</span>}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openEditMode(t as any)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        title="수정"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={e => handleDelete(t.id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => { onSelect(t); onClose(); }}
                      className="text-xs text-rose-500 font-medium shrink-0 hover:text-rose-600"
                    >
                      선택
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit form */}
        {addMode && (
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
            <p className="text-xs font-bold text-gray-500">{editId ? '템플릿 수정' : '신규 템플릿 등록'}</p>

            {/* Platform + Supplier selectors */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">플랫폼</label>
                  <PlatformPicker
                    platforms={platforms}
                    selectedId={platforms.find(p => p.code === selPlatCode)?.id ?? ''}
                    onChange={id => {
                      const plat = platforms.find(p => p.id === id);
                      setSelPlatCode(plat?.code ?? '');
                      setSelSupplierId('');
                    }}
                    placeholder="전체 공통"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">공급사 (선택)</label>
                  <SupplierPicker
                    suppliers={suppliers}
                    selectedId={selSupplierId}
                    onChange={setSelSupplierId}
                    selectedPlatform={platforms.find(p => p.code === selPlatCode) ?? null}
                    placeholder="공급사 없음"
                  />
                </div>
              </div>
            </div>

            {/* Shipping type + fee */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">배송유형 *</label>
                <select className={sel} value={newShippingType} onChange={e => setNewShippingType(e.target.value)}>
                  <option value="1">유료</option>
                  <option value="2">조건부무료</option>
                  <option value="3">무료</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">배송비 (원)</label>
                <input className={inp} type="number" value={newShippingFee}
                  onChange={e => setNewShippingFee(e.target.value)} />
              </div>
              {newShippingType === '2' && (
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-1">무료조건 금액 (원)</label>
                  <input className={inp} type="number" placeholder="예) 30000 (3만원 이상 무료)"
                    value={newFreeThreshold} onChange={e => setNewFreeThreshold(e.target.value)} />
                </div>
              )}
            </div>

            {/* Auto-generated name — editable */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">템플릿명 *</label>
                {nameOverridden && (
                  <button type="button" onClick={() => setNameOverridden(false)}
                    className="text-xs text-rose-400 hover:text-rose-600">자동생성 복원</button>
                )}
              </div>
              <input className={inp} placeholder="선택 시 자동 생성됨"
                value={newName}
                onChange={e => { setNewName(e.target.value); setNameOverridden(true); }}
              />
              <p className="text-xs text-gray-400 mt-1">
                자동 규칙: <code className="text-rose-500">{selPlatCode || 'ALL'}_{selSupplierId ? (suppliers.find(s=>s.id===selSupplierId)?.abbr ?? '??') + '_' : ''}{SHIPPING_TYPE_LABELS[Number(newShippingType)]}</code>
              </p>
            </div>

            {/* Courier + fees */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">택배사</label>
                <select className={sel} value={newCourierCode} onChange={e => setNewCourierCode(e.target.value)}>
                  <option value="CJGLS">CJ대한통운</option>
                  <option value="HANJIN">한진택배</option>
                  <option value="LOTTE">롯데택배</option>
                  <option value="POST">우체국택배</option>
                  <option value="LOGEN">로젠택배</option>
                  <option value="KDEXP">경동택배</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">반품배송비 (원)</label>
                <input className={inp} type="number" value={newReturnFee} onChange={e => setNewReturnFee(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">교환배송비 (원)</label>
                <input className={inp} type="number" value={newExchangeFee} onChange={e => setNewExchangeFee(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">네이버 템플릿 번호</label>
                <input className={`${inp} font-mono`} placeholder="스토어센터 번호"
                  value={newCode} onChange={e => setNewCode(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">메모 (선택)</label>
              <input className={inp} placeholder="예) 유료 3,000원 / 반품 6,000원"
                value={newMemo} onChange={e => setNewMemo(e.target.value)} />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={handleSave} disabled={!newName.trim() || saving}
                className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5">
                <Check size={14} />
                {saving ? '저장 중...' : editId ? '수정 완료' : '저장'}
              </button>
              <button type="button" onClick={resetForm}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
                취소
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!addMode && (
          <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 shrink-0">
            <button type="button" onClick={() => { setAddMode(true); setEditId(null); setNameOverridden(false); }}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-rose-500 hover:text-rose-600 font-semibold py-1 transition-colors">
              <Plus size={15} /> 새 템플릿 등록
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
