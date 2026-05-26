'use client';

// src/components/studio/ProductListPane.tsx
//
// Sprint 7-M2 Phase 3-C-1 — Left product list pane extracted from
// src/app/studio/page.tsx. Markup byte-identical to the original.

import { Loader2, Image as ImageIcon } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';
import { fmtPrice } from './StudioCardShell';
import type { ProductRow } from './types';

export function ProductListPane({
  products, selectedId, onSelect, loading,
}: {
  products: ProductRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 8, color: '#7A6873', fontSize: 13 }}>
        <Loader2 size={16} className="animate-spin" />
        {strings.productList.loading}
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <div style={{ padding: 20, fontSize: 13, color: '#7A6873' }}>
        {strings.productList.noProducts}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <p style={{ fontSize: 11, color: '#B0A0A8', padding: '6px 12px', margin: 0, fontWeight: 700 }}>
        {strings.productList.count.replace('{n}', String(products.length))}
      </p>
      {products.map((p) => {
        const active = p.id === selectedId;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: 10, border: 'none',
              borderRadius: 10,
              background: active ? '#FFF0F5' : 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {p.mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.mainImage}
                alt=""
                width={44}
                height={44}
                style={{
                  width: 44, height: 44, borderRadius: 8,
                  objectFit: 'cover', flexShrink: 0,
                  border: '1px solid #FFB3CE',
                }}
              />
            ) : (
              <div style={{
                width: 44, height: 44, borderRadius: 8,
                background: '#F5F0F2', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ImageIcon size={18} style={{ color: '#B0A0A8' }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13, fontWeight: 700, color: active ? '#e62310' : '#1A1A1A',
                margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {p.name}
              </p>
              <p style={{ fontSize: 11, color: '#7A6873', margin: '2px 0 0' }}>
                {p.category ?? strings.header.noCategory} · {fmtPrice(p.supplierPrice)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
