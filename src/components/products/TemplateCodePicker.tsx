// src/components/products/TemplateCodePicker.tsx
// ============================================================================
// NAVER 템플릿코드 선택 + 목록 관리 (공통 컴포넌트, #250 §2 / #62 / #233).
// 제공고시·A/S 두 종류에 그대로 재사용. 저장 목록은 StoreSettings JSON
// (notice_templates / as_templates)에 영속 — localStorage 미사용(앱 규칙).
// 운영자가 코드 숫자를 직접 입력하고 목록에 추가/수정/삭제, 드롭다운에서 선택.
// Korean labels are inline (matches the surrounding 씨앗심기 form); comments EN.
// ============================================================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Settings2, List } from 'lucide-react';

export interface TemplateItem {
  code: string;
  name: string;
}

type Kind = 'notice' | 'as';

// StoreSettings JSON field (GET response, snake_case) + PATCH key (camelCase).
const GET_FIELD: Record<Kind, string> = { notice: 'notice_templates', as: 'as_templates' };
const PATCH_KEY: Record<Kind, string> = { notice: 'noticeTemplates', as: 'asTemplates' };
const KIND_LABEL: Record<Kind, string> = { notice: '제공고시', as: 'A/S' };

const inp =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#F63B28]';

export default function TemplateCodePicker({
  kind,
  value,
  onChange,
}: {
  kind: Kind;
  value: string;
  onChange: (code: string) => void;
}) {
  const [list, setList] = useState<TemplateItem[]>([]);
  const [managing, setManaging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftCode, setDraftCode] = useState('');
  const [draftName, setDraftName] = useState('');
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/store-settings');
      const j = await r.json();
      const raw = j?.settings?.[GET_FIELD[kind]];
      setList(Array.isArray(raw) ? (raw as TemplateItem[]) : []);
    } catch {
      /* keep current list on transient error */
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(
    async (next: TemplateItem[]) => {
      setBusy(true);
      // Optimistic — reflect immediately, then reconcile with the server's
      // sanitized copy (dedup / cap).
      setList(next);
      try {
        await fetch('/api/store-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [PATCH_KEY[kind]]: next }),
        });
        await load();
      } finally {
        setBusy(false);
      }
    },
    [kind, load],
  );

  const resetDraft = () => {
    setDraftCode('');
    setDraftName('');
    setEditingCode(null);
  };

  const submitDraft = async () => {
    const code = draftCode.trim();
    const name = draftName.trim();
    if (!code || busy) return;
    let next: TemplateItem[];
    if (editingCode) {
      next = list.map((t) => (t.code === editingCode ? { code, name } : t));
    } else if (list.some((t) => t.code === code)) {
      next = list.map((t) => (t.code === code ? { code, name } : t));
    } else {
      next = [...list, { code, name }];
    }
    await persist(next);
    // Auto-select the just-added/edited code for convenience.
    onChange(code);
    resetDraft();
  };

  const remove = async (code: string) => {
    if (busy) return;
    await persist(list.filter((t) => t.code !== code));
    if (value === code) onChange('');
  };

  const startEdit = (t: TemplateItem) => {
    setEditingCode(t.code);
    setDraftCode(t.code);
    setDraftName(t.name);
  };

  const selected = list.find((t) => t.code === value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* dropdown + manage toggle */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          className={inp}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1 }}
        >
          <option value="">템플릿 선택 안 함</option>
          {list.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name ? `${t.name} (${t.code})` : t.code}
            </option>
          ))}
          {/* keep an unknown saved value visible even if not in the list */}
          {value && !selected && <option value={value}>{value} (목록 외)</option>}
        </select>
        <button
          type="button"
          onClick={() => setManaging((v) => !v)}
          title={`${KIND_LABEL[kind]} 템플릿 목록 관리`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
            fontSize: 12, fontWeight: 700, color: managing ? '#fff' : '#6b7280',
            background: managing ? '#F63B28' : '#f3f4f6', border: 'none',
            borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
          }}
        >
          {managing ? <List size={13} /> : <Settings2 size={13} />}
          목록 관리
        </button>
      </div>

      {/* manage panel */}
      {managing && (
        <div style={{ border: '1px solid #F8DCE5', borderRadius: 12, padding: 12, background: '#fff8fa' }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, color: '#888' }}>
            네이버에서 만든 {KIND_LABEL[kind]} 템플릿의 코드(숫자)와 이름을 등록해 두면, 상품마다 골라 쓸 수 있어요.
          </p>

          {/* existing rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {list.length === 0 && (
              <p style={{ margin: 0, fontSize: 12, color: '#b0a0a8' }}>아직 등록된 템플릿이 없어요.</p>
            )}
            {list.map((t) => (
              <div key={t.code} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: '#fff', border: '1px solid #f1f1f1' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.name || '이름 없음'} <span style={{ color: '#9ca3af', fontWeight: 500, fontFamily: 'monospace' }}>({t.code})</span>
                </span>
                <button type="button" onClick={() => startEdit(t)} title="수정" style={iconBtn}>
                  <Pencil size={13} style={{ color: '#6b7280' }} />
                </button>
                <button type="button" onClick={() => void remove(t.code)} title="삭제" style={iconBtn}>
                  <Trash2 size={13} style={{ color: '#dc2626' }} />
                </button>
              </div>
            ))}
          </div>

          {/* add / edit row */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              className={inp}
              value={draftCode}
              onChange={(e) => setDraftCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="코드(숫자)"
              inputMode="numeric"
              style={{ width: 120, flexShrink: 0 }}
            />
            <input
              className={inp}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="템플릿 이름"
              style={{ flex: 1 }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submitDraft(); } }}
            />
            <button
              type="button"
              onClick={() => void submitDraft()}
              disabled={!draftCode.trim() || busy}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                fontSize: 12, fontWeight: 800, color: '#fff',
                background: !draftCode.trim() ? '#f3b8c6' : '#F63B28',
                border: 'none', borderRadius: 8, padding: '8px 12px',
                cursor: !draftCode.trim() || busy ? 'not-allowed' : 'pointer',
              }}
            >
              {editingCode ? <Check size={13} /> : <Plus size={13} />}
              {editingCode ? '수정' : '추가'}
            </button>
            {editingCode && (
              <button type="button" onClick={resetDraft} title="취소" style={iconBtn}>
                <X size={14} style={{ color: '#6b7280' }} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 7, background: '#f9fafb',
  border: '1px solid #f1f1f1', cursor: 'pointer', flexShrink: 0,
};
