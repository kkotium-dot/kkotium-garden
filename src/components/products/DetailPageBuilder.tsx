// src/components/products/DetailPageBuilder.tsx
// E-1: Visual detail page builder for Naver Smart Store
// Drag-to-reorder blocks: hook, images, text, Q&A, specs, divider
// Real-time preview panel showing final HTML output
// Integrates with product-builder.ts for API registration

'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Plus, Trash2, GripVertical, Image, Type, MessageSquare,
  List, Minus, Eye, EyeOff, ChevronUp, ChevronDown,
  Sparkles, Copy, Check,
} from 'lucide-react';

// ── Block types ──────────────────────────────────────────────────────────────

export type BlockType = 'hook' | 'image' | 'text' | 'qna' | 'specs' | 'divider';

export interface DetailBlock {
  id: string;
  type: BlockType;
  data: Record<string, unknown>;
}

interface BlockMeta {
  type: BlockType;
  label: string;
  icon: React.ElementType;
  defaultData: Record<string, unknown>;
}

const BLOCK_TYPES: BlockMeta[] = [
  { type: 'hook',    label: '홍보문구',    icon: Sparkles,       defaultData: { text: '' } },
  { type: 'image',   label: '이미지',      icon: Image,          defaultData: { url: '', alt: '' } },
  { type: 'text',    label: '텍스트',      icon: Type,           defaultData: { content: '' } },
  { type: 'qna',     label: 'Q&A',            icon: MessageSquare,  defaultData: { q: '', a: '' } },
  { type: 'specs',   label: '사양 테이블',  icon: List,           defaultData: { rows: [{ label: '', value: '' }] } },
  { type: 'divider', label: '구분선',      icon: Minus,          defaultData: {} },
];

// ── Unique ID generator ──────────────────────────────────────────────────────
let blockIdCounter = 0;
function genId(): string {
  return `blk_${Date.now()}_${++blockIdCounter}`;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface DetailPageBuilderProps {
  blocks: DetailBlock[];
  onChange: (blocks: DetailBlock[]) => void;
  productName?: string;
  aeoContent?: { qna?: Array<{q: string; a: string}>; faq?: Array<{q: string; a: string}> } | null;
}

// ── Block Editor Components ──────────────────────────────────────────────────

const inp = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300';

function HookEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <textarea
      className={`${inp} h-16 resize-none`}
      placeholder="홍보문구 — 가장 위에 표시됨 (예: 당일배송 | 프리미엄 품질)"
      value={String(data.text ?? '')}
      onChange={e => onChange({ ...data, text: e.target.value })}
    />
  );
}

function ImageBlockEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-2">
      <input
        className={inp}
        placeholder="이미지 URL (Supabase/외부 링크)"
        value={String(data.url ?? '')}
        onChange={e => onChange({ ...data, url: e.target.value })}
      />
      <input
        className={inp}
        placeholder="대체 텍스트 (SEO) — 상품명 권장"
        value={String(data.alt ?? '')}
        onChange={e => onChange({ ...data, alt: e.target.value })}
      />
      {data.url && (
        <div style={{ textAlign: 'center', padding: 8, background: '#f9fafb', borderRadius: 8 }}>
          <img
            src={String(data.url)}
            alt={String(data.alt ?? '')}
            style={{ maxWidth: 200, maxHeight: 150, objectFit: 'contain', borderRadius: 4 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
}

function TextBlockEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <textarea
      className={`${inp} h-24 resize-none`}
      placeholder="상품 설명 — 특징, 소재, 사이즈, 관리방법 등..."
      value={String(data.content ?? '')}
      onChange={e => onChange({ ...data, content: e.target.value })}
    />
  );
}

function QnAEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-2">
      <input
        className={inp}
        placeholder="Q. 질문"
        value={String(data.q ?? '')}
        onChange={e => onChange({ ...data, q: e.target.value })}
      />
      <textarea
        className={`${inp} h-16 resize-none`}
        placeholder="A. 답변"
        value={String(data.a ?? '')}
        onChange={e => onChange({ ...data, a: e.target.value })}
      />
    </div>
  );
}

function SpecsEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const rows = Array.isArray(data.rows) ? data.rows as Array<{label: string; value: string}> : [{ label: '', value: '' }];

  const updateRow = (idx: number, field: 'label' | 'value', val: string) => {
    const newRows = [...rows];
    newRows[idx] = { ...newRows[idx], [field]: val };
    onChange({ ...data, rows: newRows });
  };

  const addRow = () => onChange({ ...data, rows: [...rows, { label: '', value: '' }] });
  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    onChange({ ...data, rows: rows.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input className={`${inp} flex-1`} placeholder="항목명" value={row.label} onChange={e => updateRow(i, 'label', e.target.value)} />
          <input className={`${inp} flex-1`} placeholder="값" value={row.value} onChange={e => updateRow(i, 'value', e.target.value)} />
          <button onClick={() => removeRow(i)} className="text-gray-400 hover:text-red-500" title="Delete row">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button onClick={addRow} className="text-xs text-pink-600 hover:text-pink-800 flex items-center gap-1">
        <Plus size={12} /> 행 추가
      </button>
    </div>
  );
}

// ── Block renderer for editor ────────────────────────────────────────────────

function BlockEditor({ block, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  block: DetailBlock;
  onChange: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const meta = BLOCK_TYPES.find(b => b.type === block.type);
  const Icon = meta?.icon ?? Type;

  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 8,
      background: '#fff',
    }}>
      {/* Block header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid #f3f4f6',
        background: '#fafbfc', borderRadius: '10px 10px 0 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <GripVertical size={14} style={{ color: '#d1d5db' }} />
          <Icon size={14} style={{ color: '#FF6B8A' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{meta?.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onMoveUp} disabled={isFirst} style={{ padding: 2, opacity: isFirst ? 0.3 : 1 }} title="Move up">
            <ChevronUp size={14} style={{ color: '#6b7280' }} />
          </button>
          <button onClick={onMoveDown} disabled={isLast} style={{ padding: 2, opacity: isLast ? 0.3 : 1 }} title="Move down">
            <ChevronDown size={14} style={{ color: '#6b7280' }} />
          </button>
          <button onClick={onDelete} style={{ padding: 2 }} title="Delete block">
            <Trash2 size={14} style={{ color: '#ef4444' }} />
          </button>
        </div>
      </div>

      {/* Block content editor */}
      <div style={{ padding: '10px 12px' }}>
        {block.type === 'hook'    && <HookEditor data={block.data} onChange={onChange} />}
        {block.type === 'image'   && <ImageBlockEditor data={block.data} onChange={onChange} />}
        {block.type === 'text'    && <TextBlockEditor data={block.data} onChange={onChange} />}
        {block.type === 'qna'     && <QnAEditor data={block.data} onChange={onChange} />}
        {block.type === 'specs'   && <SpecsEditor data={block.data} onChange={onChange} />}
        {block.type === 'divider' && <div style={{ textAlign: 'center', color: '#d1d5db', fontSize: 11 }}>--- divider ---</div>}
      </div>
    </div>
  );
}

// ── HTML Builder (blocks → final HTML) ───────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function blocksToHtml(blocks: DetailBlock[], productName?: string): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'hook': {
        const text = String(block.data.text ?? '');
        if (text) {
          parts.push(`<div style="text-align:center;padding:24px 20px;font-size:17px;font-weight:600;color:#1a1a1a;line-height:1.6;background:#fef0f3;border-radius:12px;margin-bottom:16px;">${escapeHtml(text)}</div>`);
        }
        break;
      }
      case 'image': {
        const url = String(block.data.url ?? '');
        const alt = String(block.data.alt ?? productName ?? '');
        if (url) {
          parts.push(`<div style="text-align:center;margin:16px 0;"><img src="${escapeHtml(url)}" style="max-width:860px;width:100%;border-radius:8px;" alt="${escapeHtml(alt)}" /></div>`);
        }
        break;
      }
      case 'text': {
        const content = String(block.data.content ?? '');
        if (content) {
          parts.push(`<div style="padding:20px;font-size:14px;line-height:1.9;color:#374151;">${escapeHtml(content).replace(/\n/g, '<br/>')}</div>`);
        }
        break;
      }
      case 'qna': {
        const q = String(block.data.q ?? '');
        const a = String(block.data.a ?? '');
        if (q && a) {
          parts.push(`<div style="margin:12px 0;padding:16px 20px;background:#f9fafb;border-radius:8px;border-left:3px solid #FF6B8A;">`);
          parts.push(`<h3 style="font-size:14px;font-weight:600;color:#1a1a1a;margin-bottom:8px;">Q. ${escapeHtml(q)}</h3>`);
          parts.push(`<p style="font-size:13px;color:#6b7280;line-height:1.7;padding-left:4px;">A. ${escapeHtml(a)}</p>`);
          parts.push(`</div>`);
        }
        break;
      }
      case 'specs': {
        const rows = Array.isArray(block.data.rows) ? block.data.rows as Array<{label: string; value: string}> : [];
        const validRows = rows.filter(r => r.label && r.value);
        if (validRows.length > 0) {
          parts.push(`<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">`);
          for (const row of validRows) {
            parts.push(`<tr>`);
            parts.push(`<td style="padding:10px 14px;background:#f9fafb;font-weight:600;color:#374151;border:1px solid #e5e7eb;width:30%;">${escapeHtml(row.label)}</td>`);
            parts.push(`<td style="padding:10px 14px;color:#6b7280;border:1px solid #e5e7eb;">${escapeHtml(row.value)}</td>`);
            parts.push(`</tr>`);
          }
          parts.push(`</table>`);
        }
        break;
      }
      case 'divider':
        parts.push(`<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />`);
        break;
    }
  }

  return parts.join('\n');
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function DetailPageBuilder({ blocks, onChange, productName, aeoContent }: DetailPageBuilderProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const addBlock = useCallback((type: BlockType) => {
    const meta = BLOCK_TYPES.find(b => b.type === type);
    if (!meta) return;
    const newBlock: DetailBlock = { id: genId(), type, data: { ...meta.defaultData } };
    onChange([...blocks, newBlock]);
  }, [blocks, onChange]);

  const updateBlock = useCallback((id: string, data: Record<string, unknown>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, data } : b));
  }, [blocks, onChange]);

  const deleteBlock = useCallback((id: string) => {
    onChange(blocks.filter(b => b.id !== id));
  }, [blocks, onChange]);

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[idx], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[idx]];
    onChange(newBlocks);
  }, [blocks, onChange]);

  // Auto-import AEO Q&A as blocks
  const importAeo = useCallback(() => {
    if (!aeoContent) return;
    const newBlocks: DetailBlock[] = [];
    if (Array.isArray(aeoContent.qna)) {
      for (const item of aeoContent.qna) {
        newBlocks.push({ id: genId(), type: 'qna', data: { q: item.q, a: item.a } });
      }
    }
    if (Array.isArray(aeoContent.faq)) {
      for (const item of aeoContent.faq) {
        newBlocks.push({ id: genId(), type: 'qna', data: { q: item.q, a: item.a } });
      }
    }
    if (newBlocks.length > 0) {
      onChange([...blocks, ...newBlocks]);
    }
  }, [aeoContent, blocks, onChange]);

  const htmlOutput = useMemo(() => blocksToHtml(blocks, productName), [blocks, productName]);

  const copyHtml = useCallback(() => {
    navigator.clipboard.writeText(htmlOutput).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [htmlOutput]);

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {BLOCK_TYPES.map(meta => (
            <button
              key={meta.type}
              onClick={() => addBlock(meta.type)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 6,
                border: '1px solid #e5e7eb', background: '#fff',
                fontSize: 11, fontWeight: 500, cursor: 'pointer',
                color: '#374151',
              }}
            >
              <meta.icon size={12} />
              {meta.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {aeoContent && (
            <button
              onClick={importAeo}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 6,
                border: '1px solid #FF6B8A', background: '#FEF0F3',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                color: '#FF6B8A',
              }}
            >
              <MessageSquare size={12} />
              AEO Q&A 가져오기
            </button>
          )}
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 6,
              border: '1px solid #e5e7eb', background: showPreview ? '#228f18' : '#fff',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              color: showPreview ? '#fff' : '#374151',
            }}
          >
            {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
            {showPreview ? '닫기' : '미리보기'}
          </button>
        </div>
      </div>

      {/* Block count */}
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
        {blocks.length} 개 블록 {blocks.length === 0 && '— 위 버튼으로 블록을 추가하세요'}
      </div>

      {/* Block list */}
      {blocks.map((block, i) => (
        <BlockEditor
          key={block.id}
          block={block}
          onChange={(data) => updateBlock(block.id, data)}
          onDelete={() => deleteBlock(block.id)}
          onMoveUp={() => moveBlock(block.id, -1)}
          onMoveDown={() => moveBlock(block.id, 1)}
          isFirst={i === 0}
          isLast={i === blocks.length - 1}
        />
      ))}

      {/* Preview panel */}
      {showPreview && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 8,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
              <Eye size={13} style={{ display: 'inline', marginRight: 4, color: '#228f18' }} />
              미리보기 (네이버 상세페이지)
            </span>
            <button
              onClick={copyHtml}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 5,
                border: '1px solid #e5e7eb', background: copied ? '#dcfce7' : '#fff',
                fontSize: 11, cursor: 'pointer',
                color: copied ? '#15803d' : '#6b7280',
              }}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? '복사 완료' : 'HTML 복사'}
            </button>
          </div>
          <div style={{
            border: '1px solid #e5e7eb', borderRadius: 10, padding: 20,
            background: '#fff', maxWidth: 860, margin: '0 auto',
            maxHeight: 500, overflowY: 'auto',
          }}>
            {htmlOutput ? (
              <div dangerouslySetInnerHTML={{ __html: htmlOutput }} />
            ) : (
              <div style={{ textAlign: 'center', color: '#d1d5db', fontSize: 13, padding: 40 }}>
                아직 콘텐츠가 없습니다
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
