'use client';
import { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2, ToggleLeft, ToggleRight, X, Check, Building2, Store } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  code: string;
  // optional abbreviation, may be null/undefined
  abbr?: string | null;
  contact: string | null;
  address: string | null;
  description: string | null;
  domeggookSellerId: string | null;
  defaultMargin: number;
  active: boolean;
  platformId: string;
}
interface Platform {
  id: string; name: string; code: string; url: string | null;
  description: string | null; active: boolean;
  suppliers: Supplier[];
}

const EMPTY_PLATFORM = { name: '', code: '', url: '', description: '' };
const EMPTY_SUPPLIER = { name: '', code: '', abbr: '', contact: '', address: '', description: '', domeggookSellerId: '', defaultMargin: 30, platformId: '' };

export default function PlatformsSettingPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // 플랫폼 모달
  const [platModal, setPlatModal] = useState<{ open: boolean; mode: 'add' | 'edit'; data: any; id?: string }>({ open: false, mode: 'add', data: EMPTY_PLATFORM });
  // 공급사 모달
  const [supModal, setSupModal] = useState<{ open: boolean; mode: 'add' | 'edit'; data: any; id?: string }>({ open: false, mode: 'add', data: EMPTY_SUPPLIER });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadPlatforms = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/platforms?includeInactive=true', { cache: 'no-store' });
      const d = await r.json();
      if (d.success) setPlatforms(d.platforms);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadPlatforms(); }, []);

  // ── 플랫폼 저장 ──
  const savePlatform = async () => {
    setSaving(true);
    try {
      const { mode, data, id } = platModal;
      const res = await fetch(mode === 'add' ? '/api/platforms' : `/api/platforms/${id}`, {
        method: mode === 'add' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const d = await res.json();
      if (d.success) { showToast(mode === 'add' ? '플랫폼 추가됨' : '플랫폼 수정됨'); setPlatModal(p => ({ ...p, open: false })); loadPlatforms(); }
      else showToast(d.error ?? '저장 실패', 'error');
    } finally { setSaving(false); }
  };

  // ── 플랫폼 삭제/비활성화 ──
  const deletePlatform = async (id: string, name: string) => {
    if (!confirm(`'${name}' 플랫폼을 삭제(또는 비활성화)할까요?`)) return;
    const res = await fetch(`/api/platforms/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (d.success) { showToast(d.deactivated ? `'${name}' 비활성화됨 (연결 데이터 보호)` : `'${name}' 삭제됨`); loadPlatforms(); }
    else showToast(d.error ?? '삭제 실패', 'error');
  };

  // ── 공급사 저장 ──
  const saveSupplier = async () => {
    setSaving(true);
    try {
      const { mode, data, id } = supModal;
      const res = await fetch(mode === 'add' ? '/api/suppliers' : `/api/suppliers/${id}`, {
        method: mode === 'add' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const d = await res.json();
      if (d.success) { showToast(mode === 'add' ? '공급사 추가됨' : '공급사 수정됨'); setSupModal(p => ({ ...p, open: false })); loadPlatforms(); }
      else showToast(d.error ?? '저장 실패', 'error');
    } finally { setSaving(false); }
  };

  // ── 공급사 삭제/비활성화 ──
  const deleteSupplier = async (id: string, name: string) => {
    if (!confirm(`'${name}' 공급사를 삭제(또는 비활성화)할까요?`)) return;
    const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (d.success) { showToast(d.deactivated ? `'${name}' 비활성화됨 (연결 데이터 보호)` : `'${name}' 삭제됨`); loadPlatforms(); }
    else showToast(d.error ?? '삭제 실패', 'error');
  };

  // ── 코드 자동 생성: Korean initial consonant extraction + English fallback ──
  const autoCode = (name: string): string => {
    // CHO_MAP: 19 Korean initial consonants (index 11 = 'NG', not empty)
    const CHO_MAP = ['G','GG','N','D','DD','R','M','B','BB','S','SS','NG','J','JJ','CH','K','T','P','H'];
    const eng = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (eng.length >= 2) return eng.slice(0, 6);
    let result = '';
    for (const ch of name) {
      const cp = ch.charCodeAt(0);
      if (cp >= 0xAC00 && cp <= 0xD7A3) {
        const cho = CHO_MAP[Math.floor((cp - 0xAC00) / 588)];
        if (cho) result += cho;
      }
    }
    const r = result.slice(0, 6);
    return r.length >= 2 ? r : (eng.slice(0, 6) || 'CODE');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6">
        {/* 헤더 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                {([0,60,120,180,240,300] as number[]).map((deg, i) => { const r = deg * Math.PI / 180; const cx = 26 + Math.cos(r) * 11.4; const cy = 26 + Math.sin(r) * 11.4; return <ellipse key={i} cx={cx} cy={cy} rx={14} ry={10.4} transform={`rotate(${deg} ${cx} ${cy})`} fill="#e62310" />; })}
                <circle cx="26" cy="26" r="14.6" fill="#e62310" />
              </svg>
                <Building2 size={20} color="#fff" style={{ position: 'relative', zIndex: 1 }} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>거래처 명단</h1>
            </div>
            <button
              onClick={() => setPlatModal({ open: true, mode: 'add', data: { ...EMPTY_PLATFORM } })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#e62310', color: '#fff', padding: '8px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', flexShrink: 0 }}
            >
              <Plus size={15} /> 플랫폼 추가
            </button>
          </div>
          <div style={{ height: 2.5, background: '#FFB3CE', borderRadius: 99, margin: '8px 0 6px' }} />
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>도매매, 도매꽉 등 플랫폼과 소속 공급사를 관리합니다.</p>
        </div>
        {/* SKU 안내 배너 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
          <strong>상품코드(SKU) 자동생성 규칙:</strong> 플랫폼 코드(대문자) + 상품번호 → 예: 도매매(dmm) + 38488 = <strong>DMM-38488</strong> (네이버 엑셀 "판매자 상품코드"로 자동 입력됩니다)
        </div>

        {/* 플랫폼 목록 */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">불러오는 중...</div>
        ) : platforms.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>등록된 플랫폼이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {platforms.map(plat => (
              <div key={plat.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${!plat.active ? 'opacity-50' : ''}`}>
                {/* 플랫폼 행 */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <button onClick={() => setExpanded(expanded === plat.id ? null : plat.id)} className="flex items-center gap-3 flex-1 text-left">
                    {expanded === plat.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl flex items-center justify-center">
                      <span className="text-lg">🏪</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{plat.name}</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono">{plat.code.toUpperCase()}</span>
                        {!plat.active && <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">비활성</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        공급사 {plat.suppliers.length}개
                        {plat.url && <> · <a href={plat.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{plat.url}</a></>}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSupModal({ open: true, mode: 'add', data: { ...EMPTY_SUPPLIER, platformId: plat.id } })}
                      className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition"
                    >
                      <Plus className="w-3 h-3" /> 공급사
                    </button>
                    <button onClick={() => setPlatModal({ open: true, mode: 'edit', data: { name: plat.name, url: plat.url ?? '', description: plat.description ?? '', active: plat.active }, id: plat.id })}
                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deletePlatform(plat.id, plat.name)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 공급사 목록 (인라인 확장) */}
                {expanded === plat.id && (
                  <div className="border-t bg-gray-50 divide-y divide-gray-100">
                    {plat.suppliers.length === 0 ? (
                      <div className="px-8 py-5 text-sm text-gray-400 flex items-center gap-2">
                        <Store className="w-4 h-4" /> 등록된 공급사가 없습니다.
                      </div>
                    ) : plat.suppliers.map(sup => (
                      <div key={sup.id} className={`flex items-center gap-3 px-8 py-3.5 hover:bg-white transition ${!sup.active ? 'opacity-50' : ''}`}>
                        <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-sm">🏭</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 text-sm">{sup.name}</span>
                            <span className="text-xs bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full font-mono">{sup.code}</span>
                            {sup.abbr && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-mono font-bold">{sup.abbr}</span>}
                            {!sup.active && <span className="text-xs bg-red-100 text-red-400 px-1.5 py-0.5 rounded-full">비활성</span>}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            SKU 예시: <strong className="text-pink-500">{plat.code.toUpperCase()}-[상품번호]</strong>
                            {sup.contact && <> · {sup.contact}</>}
                            {sup.domeggookSellerId && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#FFF0F5', color: '#e62310', border: '1px solid #FFB3CE', marginLeft: 4 }}>
                                도매꾹 {sup.domeggookSellerId}
                              </span>
                            )}
                            {' '}· 기본마진 <strong>{sup.defaultMargin}%</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSupModal({ open: true, mode: 'edit', data: { name: sup.name, abbr: sup.abbr ?? '', contact: sup.contact ?? '', address: sup.address ?? '', description: sup.description ?? '', domeggookSellerId: sup.domeggookSellerId ?? '', defaultMargin: sup.defaultMargin, active: sup.active, platformId: plat.id }, id: sup.id })}
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteSupplier(sup.id, sup.name)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 플랫폼 모달 ── */}
      {platModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">{platModal.mode === 'add' ? '플랫폼 추가' : '플랫폼 수정'}</h2>
              <button onClick={() => setPlatModal(p => ({ ...p, open: false }))}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">플랫폼 이름 <span className="text-red-500">*</span></label>
                <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                    placeholder="예: DMM" value={platModal.data.name}
                    onChange={e => {
                      const name = e.target.value;
                      setPlatModal(p => ({
                        ...p,
                        data: { ...p.data, name, code: p.mode === 'add' ? autoCode(name) : p.data.code },
                      }));
                    }}
                />
              </div>
              {platModal.mode === 'add' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">코드 (영문 대문자) <span className="text-red-500">*</span></label>
                  <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-300"
                    placeholder="예: DMM" value={platModal.data.code}
                    onChange={e => setPlatModal(p => ({ ...p, data: { ...p.data, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') } }))} />
                  <p className="text-xs text-gray-400 mt-1">상품코드(SKU) 앞 코드로 사용됩니다 — <code className="text-pink-500">DMM</code>-38488</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">URL</label>
                <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="https://www.domemae.com" value={platModal.data.url}
                  onChange={e => setPlatModal(p => ({ ...p, data: { ...p.data, url: e.target.value } }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">설명</label>
                <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="국내 최대 도매 플랫폼" value={platModal.data.description}
                  onChange={e => setPlatModal(p => ({ ...p, data: { ...p.data, description: e.target.value } }))} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setPlatModal(p => ({ ...p, open: false }))} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">취소</button>
              <button onClick={savePlatform} disabled={saving || !platModal.data.name}
                className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <span className="animate-spin">⏳</span> : <Check className="w-4 h-4" />}
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 공급사 모달 ── */}
      {supModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold">{supModal.mode === 'add' ? '공급사 추가' : '공급사 수정'}</h2>
              <button onClick={() => setSupModal(p => ({ ...p, open: false }))}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">공급사 이름 <span className="text-red-500">*</span></label>
                <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="예: 하이뷰" value={supModal.data.name}
                  onChange={e => {
                    const name = e.target.value;
                    const plat = platforms.find(p => p.id === supModal.data.platformId);
                    const platCode = plat?.code.toUpperCase() ?? 'ETC';
                    if (supModal.mode === 'add') {
                      const generated = autoCode(name);
                      const autoSupCode = `${platCode}-${generated || 'NEW'}`;
                      const autoAbbr = generated.slice(0, 4);
                      setSupModal(p => ({ ...p, data: { ...p.data, name, code: autoSupCode, abbr: autoAbbr } }));
                    } else {
                      setSupModal(p => ({ ...p, data: { ...p.data, name } }));
                    }
                  }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">코드 <span className="text-red-500">*</span></label>
                  <input
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-300 bg-gray-50"
                    placeholder="자동 생성됨"
                    value={supModal.data.code}
                    onChange={e => setSupModal(p => ({ ...p, data: { ...p.data, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') } }))}
                  />
                  <p className="text-xs text-gray-400 mt-1">이름 입력 시 자동 생성 (수정 가능)</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">약자 (2-4자리) <span className="text-red-500">*</span></label>
                  <input
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-300"
                    placeholder="예: HV"
                    maxLength={4}
                    value={supModal.data.abbr ?? ''}
                    onChange={e => setSupModal(p => ({ ...p, data: { ...p.data, abbr: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') } }))}
                  />
                  <p className="text-xs text-gray-400 mt-1">상품코드(SKU)/템플릿에 사용</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">연락처</label>
                <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="010-1234-5678" value={supModal.data.contact}
                  onChange={e => setSupModal(p => ({ ...p, data: { ...p.data, contact: e.target.value } }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">주소</label>
                <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="서울시 강남구..." value={supModal.data.address}
                  onChange={e => setSupModal(p => ({ ...p, data: { ...p.data, address: e.target.value } }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">기본 마진율 (%)</label>
                <input type="number" min={0} max={100} step={0.5}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  value={supModal.data.defaultMargin}
                  onChange={e => setSupModal(p => ({ ...p, data: { ...p.data, defaultMargin: Number(e.target.value) } }))} />
                <p className="text-xs text-gray-400 mt-1">상품 등록 시 마진율 기본값으로 사용됩니다</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">메모</label>
                <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                  placeholder="꽃 전문 공급사" value={supModal.data.description}
                  onChange={e => setSupModal(p => ({ ...p, data: { ...p.data, description: e.target.value } }))} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6 sticky bottom-0 bg-white pt-2 border-t">
              <button onClick={() => setSupModal(p => ({ ...p, open: false }))} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">취소</button>
              <button onClick={saveSupplier} disabled={saving || !supModal.data.name}
                className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <span className="animate-spin">⏳</span> : <Check className="w-4 h-4" />}
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
