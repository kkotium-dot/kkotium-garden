'use client';
/**
 * PlatformSupplierPicker — cascading combobox
 *
 * Step 1: Select platform  (rose accent)
 * Step 2: Select supplier  (purple accent, filtered to selected platform)
 *
 * - Both steps use the same searchable combobox pattern as the category picker
 * - Hierarchy is visually communicated:  [도매매 DMM]  >  [이현마켓 HV]
 * - When platform changes, supplier resets automatically
 * - Supplier list shows platform code badge to reinforce ownership
 * - Works for 1 item or 100 items (search activates on focus)
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, X, Check, Building2, Store } from 'lucide-react';

export interface PlatformItem {
  id: string;
  name: string;
  code: string;
}

export interface SupplierItem {
  id: string;
  name: string;
  code: string;
  abbr?: string | null;
  platformId?: string;
  platformCode?: string;
}

// ─── shared styles ────────────────────────────────────────────────────────────
const baseInput =
  'w-full flex items-center justify-between gap-2 px-3 py-2.5 border rounded-xl text-sm bg-white transition-all focus:outline-none cursor-pointer select-none';

const dropdownCls =
  'absolute z-[9999] left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden';

// ─── PlatformPicker ───────────────────────────────────────────────────────────
interface PlatformPickerProps {
  platforms: PlatformItem[];
  selectedId: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** shown inside the trigger when nothing is selected */
  placeholder?: string;
}

export function PlatformPicker({
  platforms,
  selectedId,
  onChange,
  disabled = false,
  placeholder = '플랫폼 선택',
}: PlatformPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const selected = platforms.find(p => p.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    if (!query.trim()) return platforms;
    const q = query.trim().toLowerCase();
    return platforms.filter(
      p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }, [query, platforms]);

  // close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const commit = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
    setActiveIdx(0);
  };

  const handleOpen = () => {
    if (disabled) return;
    setOpen(o => !o);
    if (!open) setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={`${baseInput} ${
          open
            ? 'border-rose-400 ring-2 ring-rose-200'
            : selected
            ? 'border-rose-300 bg-rose-50'
            : 'border-stone-200 hover:border-rose-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          <Building2
            size={14}
            className={selected ? 'text-rose-500 shrink-0' : 'text-gray-300 shrink-0'}
          />
          {selected ? (
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="text-gray-800 font-medium truncate">{selected.name}</span>
              <span className="text-[11px] font-mono font-bold text-rose-500 bg-rose-100 px-1.5 py-0.5 rounded shrink-0">
                {selected.code}
              </span>
            </span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={e => { e.stopPropagation(); commit(''); }}
              onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), commit(''))}
              className="text-gray-300 hover:text-red-400 transition-colors p-0.5 rounded"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className={dropdownCls}>
          {/* Search */}
          <div className="px-3 py-2 border-b border-gray-100">
            <input
              ref={inputRef}
              className="w-full text-sm bg-transparent focus:outline-none placeholder-gray-400"
              placeholder="플랫폼 검색..."
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
                else if (e.key === 'Enter') { e.preventDefault(); if (filtered[activeIdx]) commit(filtered[activeIdx].id); }
                else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
              }}
            />
          </div>

          {/* Clear option */}
          {selectedId && (
            <button
              type="button"
              onClick={() => commit('')}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 border-b border-gray-50 transition-colors"
            >
              <X size={12} /> 선택 해제
            </button>
          )}

          {/* List */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">일치하는 플랫폼이 없습니다</div>
            ) : (
              filtered.map((p, idx) => {
                const isActive = p.id === selectedId;
                const isHovered = idx === activeIdx;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => commit(p.id)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors ${
                      isHovered ? 'bg-rose-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Building2 size={13} className={isActive ? 'text-rose-500' : 'text-gray-300'} />
                      <span className={`truncate ${isActive ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {p.name}
                      </span>
                      <span className="text-[11px] font-mono text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded shrink-0">
                        {p.code}
                      </span>
                    </span>
                    {isActive && <Check size={13} className="text-rose-500 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SupplierPicker ───────────────────────────────────────────────────────────
interface SupplierPickerProps {
  suppliers: SupplierItem[];
  selectedId: string;
  onChange: (id: string) => void;
  /** When provided, filters and shows which platform this supplier belongs to */
  selectedPlatform?: PlatformItem | null;
  disabled?: boolean;
  placeholder?: string;
}

export function SupplierPicker({
  suppliers,
  selectedId,
  onChange,
  selectedPlatform,
  disabled = false,
  placeholder = '공급사 선택',
}: SupplierPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Filter by platform if one is selected
  const platformFiltered = useMemo(() => {
    if (!selectedPlatform) return suppliers;
    return suppliers.filter(
      s => s.platformId === selectedPlatform.id || s.platformCode === selectedPlatform.code
    );
  }, [suppliers, selectedPlatform]);

  const filtered = useMemo(() => {
    if (!query.trim()) return platformFiltered;
    const q = query.trim().toLowerCase();
    return platformFiltered.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.abbr ?? '').toLowerCase().includes(q)
    );
  }, [query, platformFiltered]);

  const selected = suppliers.find(s => s.id === selectedId) ?? null;

  // Auto-clear if platform changed and supplier no longer belongs to it
  useEffect(() => {
    if (!selectedId) return;
    const stillValid = platformFiltered.some(s => s.id === selectedId);
    if (!stillValid) onChange('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatform?.id]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const commit = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
    setActiveIdx(0);
  };

  const handleOpen = () => {
    if (disabled) return;
    setOpen(o => !o);
    if (!open) setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger — platform breadcrumb shown inside trigger hint text, not above it */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={`${baseInput} ${
          open
            ? 'border-purple-400 ring-2 ring-purple-200'
            : selected
            ? 'border-purple-300 bg-purple-50'
            : 'border-stone-200 hover:border-purple-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          <Store
            size={14}
            className={selected ? 'text-purple-500 shrink-0' : 'text-gray-300 shrink-0'}
          />
          {selected ? (
            <span className="flex items-center gap-1.5 min-w-0">
              {selectedPlatform && (
                <span className="text-[10px] font-mono text-rose-400 bg-rose-50 border border-rose-100 px-1 py-0.5 rounded shrink-0">
                  {selectedPlatform.code}
                </span>
              )}
              <span className="text-gray-800 font-medium truncate">{selected.name}</span>
              {selected.abbr && (
                <span className="text-[11px] font-mono font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded shrink-0">
                  {selected.abbr}
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400 text-xs">
              {selectedPlatform
                ? `${selectedPlatform.code} 공급사 선택`
                : placeholder}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={e => { e.stopPropagation(); commit(''); }}
              onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), commit(''))}
              className="text-gray-300 hover:text-red-400 transition-colors p-0.5 rounded"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className={dropdownCls}>
          {/* Search */}
          <div className="px-3 py-2 border-b border-gray-100">
            <input
              ref={inputRef}
              className="w-full text-sm bg-transparent focus:outline-none placeholder-gray-400"
              placeholder="공급사 검색..."
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
                else if (e.key === 'Enter') { e.preventDefault(); if (filtered[activeIdx]) commit(filtered[activeIdx].id); }
                else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
              }}
            />
          </div>

          {/* Clear option */}
          {selectedId && (
            <button
              type="button"
              onClick={() => commit('')}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 border-b border-gray-50 transition-colors"
            >
              <X size={12} /> 선택 해제
            </button>
          )}

          {/* Platform header if filtered */}
          {selectedPlatform && (
            <div className="px-4 py-1.5 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
              <Building2 size={11} className="text-rose-400" />
              <span className="text-[11px] text-rose-600 font-medium">
                {selectedPlatform.name} ({selectedPlatform.code}) 소속
              </span>
            </div>
          )}

          {/* List */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">
                {selectedPlatform
                  ? `${selectedPlatform.name}에 등록된 공급사가 없습니다`
                  : '일치하는 공급사가 없습니다'}
              </div>
            ) : (
              filtered.map((s, idx) => {
                const isActive = s.id === selectedId;
                const isHovered = idx === activeIdx;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => commit(s.id)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors ${
                      isHovered ? 'bg-purple-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Store size={13} className={isActive ? 'text-purple-500' : 'text-gray-300'} />
                      <span className={`truncate ${isActive ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {s.name}
                      </span>
                      {s.abbr && (
                        <span className="text-[11px] font-mono text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded shrink-0">
                          {s.abbr}
                        </span>
                      )}
                      {/* Show platform code only when not filtered by platform */}
                      {!selectedPlatform && s.platformCode && (
                        <span className="text-[10px] font-mono text-rose-400 bg-rose-50 px-1 py-0.5 rounded shrink-0">
                          {s.platformCode}
                        </span>
                      )}
                    </span>
                    {isActive && <Check size={13} className="text-purple-500 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
