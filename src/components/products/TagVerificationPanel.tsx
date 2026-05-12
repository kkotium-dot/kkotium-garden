// src/components/products/TagVerificationPanel.tsx
// ============================================================================
// Sprint 7 P1-C (Session E-2 Sprint 7 P1): inline tag-dictionary panel
// for 씨앗 심기 tags field.
//
// Behavior:
//   - Manual trigger: button "태그 사전 등재 확인" calls /api/tags/verify
//   - Shows per-tag verification (verified green / weak yellow / missing red /
//     error gray) inline list
//   - Cold start (no tags) renders nothing
// ============================================================================

'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Search } from 'lucide-react';

interface TagVerification {
  tag: string;
  status: 'verified' | 'weak' | 'missing' | 'error';
  monthlyVolume: number;
  hint: string;
}

interface Props {
  tags: string[];
  /** Style override for outer container. */
  style?: React.CSSProperties;
}

const TONE = {
  verified: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', icon: CheckCircle2, iconColor: '#16A34A' },
  weak:     { bg: '#FEFCE8', border: '#FEF08A', text: '#854D0E', icon: AlertTriangle, iconColor: '#CA8A04' },
  missing:  { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B', icon: XCircle, iconColor: '#DC2626' },
  error:    { bg: '#F5F5F5', border: '#E5E5E5', text: '#737373', icon: AlertTriangle, iconColor: '#A3A3A3' },
} as const;

export default function TagVerificationPanel({ tags, style }: Props) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TagVerification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validTags = tags.filter((t) => t && t.trim().length > 0);
  if (validTags.length === 0) return null;

  const handleVerify = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/tags/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: validTags }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? '조회 실패');
        setResult(null);
      } else {
        setResult(data.tags ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '네트워크 오류');
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        marginTop: 8,
        padding: '10px 12px',
        borderRadius: 10,
        background: '#FAFAFA',
        border: '1px solid #E5E5E5',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#525252' }}>
          태그 사전 등재 확인 ({validTags.length}개)
        </p>
        <button
          type="button"
          onClick={handleVerify}
          disabled={busy}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 999,
            background: busy ? '#E5E5E5' : '#FFFFFF',
            border: '1px solid #D4D4D4',
            fontSize: 11, fontWeight: 700,
            color: busy ? '#737373' : '#1A1A1A',
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
          {busy ? '조회 중…' : '검증 시작'}
        </button>
      </div>

      {error && (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#991B1B' }}>
          {error}
        </p>
      )}

      {result && result.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Summary result={result} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {result.map((v) => (
              <TagRow key={v.tag} verification={v} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ result }: { result: TagVerification[] }) {
  const verified = result.filter((v) => v.status === 'verified').length;
  const weak     = result.filter((v) => v.status === 'weak').length;
  const missing  = result.filter((v) => v.status === 'missing').length;
  const err      = result.filter((v) => v.status === 'error').length;
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
      <span style={{ color: '#15803D', fontWeight: 700 }}>SEO 유효 {verified}</span>
      <span style={{ color: '#854D0E', fontWeight: 700 }}>약함 {weak}</span>
      <span style={{ color: '#991B1B', fontWeight: 700 }}>미등재 {missing}</span>
      {err > 0 && <span style={{ color: '#737373' }}>오류 {err}</span>}
    </div>
  );
}

function TagRow({ verification }: { verification: TagVerification }) {
  const tone = TONE[verification.status];
  const Icon = tone.icon;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', borderRadius: 8,
        background: tone.bg, border: `1px solid ${tone.border}`,
      }}
    >
      <Icon size={12} color={tone.iconColor} />
      <span style={{ fontSize: 11, fontWeight: 700, color: tone.text, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        #{verification.tag}
      </span>
      <span style={{ fontSize: 10, color: tone.text, whiteSpace: 'nowrap' }}>
        {verification.hint}
      </span>
    </div>
  );
}
