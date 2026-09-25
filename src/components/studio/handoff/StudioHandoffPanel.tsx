'use client';
// src/components/studio/handoff/StudioHandoffPanel.tsx
//
// STUDIO_STEP_HANDOFF_2026-09-24 -- Studio final step "씨앗심기로 전송".
// Master plan §A (role split): seed-planting owns product data; the studio
// only produces assets. Step 1 already persists thumbnails through the same
// PUT /api/products path seed-planting uses, so this panel reports the TRUE
// saved state (read from the DB) instead of pretending to "send" anything.
// The detail-page transfer is shown as pending until the Step 2 rebuild ships.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Clock, ExternalLink, Loader2 } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';
import { resolveAdditionalImages, NAVER_MAX_OPTIONAL_IMAGES } from '@/lib/products/gallery-images';
import { onProductMutated } from '@/lib/events/product-mutated';

const t = strings.atelier.handoff;

interface Props {
  productId: string;
  onGoThumbnail: () => void;
}

interface Snapshot {
  hasMain: boolean;
  extraCount: number;
}

export default function StudioHandoffPanel({ productId, onGoThumbnail }: Props) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      const p = json.product ?? json.data ?? json;
      const hasMain = typeof p.mainImage === 'string' && p.mainImage.trim().length > 0;
      setSnap({ hasMain, extraCount: resolveAdditionalImages(p).length });
    } catch {
      setError(true);
    }
  }, [productId]);

  useEffect(() => {
    setSnap(null);
    void load();
    return onProductMutated((d) => {
      if (d.productId === productId) void load();
    });
  }, [productId, load]);

  const row = (icon: React.ReactNode, title: string, body: string) => (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px',
      border: '1px solid var(--color-border)', borderRadius: 12, background: '#fff',
    }}>
      <div style={{ flexShrink: 0, marginTop: 1 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--gp-ink-900)' }}>{title}</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--gp-ink-500)', lineHeight: 1.6 }}>{body}</p>
      </div>
    </div>
  );

  return (
    <section style={{
      display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 18px',
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-card)',
    }}>
      <header>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: 'var(--gp-ink-900)' }}>{t.title}</h3>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--gp-ink-500)' }}>{t.subtitle}</p>
      </header>

      {error ? (
        <p style={{ margin: 0, fontSize: 12, color: '#b91c1c' }}>{t.loadError}</p>
      ) : !snap ? (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--gp-ink-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Loader2 size={14} className="animate-spin" /> {t.loading}
        </p>
      ) : (
        <>
          {snap.hasMain
            ? row(<CheckCircle2 size={18} color="#15803D" />, t.thumbDoneTitle,
                t.thumbDoneBody.replace('{n}', String(snap.extraCount)).replace('{max}', String(NAVER_MAX_OPTIONAL_IMAGES)))
            : row(<AlertCircle size={18} color="#b45309" />, t.thumbMissingTitle, t.thumbMissingBody)}
          {row(<Clock size={18} color="var(--gp-ink-500)" />, t.detailPendingTitle, t.detailPendingBody)}
        </>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {snap && !snap.hasMain && (
          <button
            type="button"
            onClick={onGoThumbnail}
            style={{
              padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-border)',
              background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--gp-ink-700)',
            }}
          >
            {t.goThumbnail}
          </button>
        )}
        <Link
          href={`/products/new?edit=${encodeURIComponent(productId)}&focus=image`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
            fontSize: 12, fontWeight: 700, textDecoration: 'none',
            color: 'var(--gp-red-500)', background: 'var(--gp-pink-50, #FFF5F8)', border: '1px solid var(--gp-red-500)',
          }}
        >
          <ExternalLink size={13} /> {t.openSeed}
        </Link>
      </div>
    </section>
  );
}
