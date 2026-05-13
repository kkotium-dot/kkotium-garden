'use client';

// src/app/studio/page.tsx
//
// Sprint 7-M2 Phase 3-B / 3-D / 3-E / 3-C-1 — 온실 아틀리에 (Studio).
//
// Thin shell over src/components/studio/*. Page concerns only:
//   - Product list fetch + selected-id state (page-specific)
//   - Layout (2-pane: left list + right detail)
//   - Page header + selected product header
//
// The 4 step cards (Diagnosis / Thumbnail / Detail / Actions), the
// product list pane, the shared shell primitives, and the action state
// hook all live in @/components/studio so PLANT (Phase 3-C-2) can mount
// the same workflow inside its 7th tab.

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Palette, Loader2, Image as ImageIcon } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';
import {
  ProductListPane,
  DiagnosisCard,
  ThumbnailCard,
  DetailPageCard,
  ActionsCard,
  useStudioActions,
  fmtPrice,
  type ProductRow,
} from '@/components/studio';

// ── Main inner ────────────────────────────────────────────────────────────

function StudioInner() {
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get('product');

  // Product list state (page-specific — the hook only knows about a single
  // selected productId, not the list)
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialProductId);

  // Fetch product list on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products?sortBy=createdAt&sortOrder=desc', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list: ProductRow[] = (json.products ?? json ?? []).map((p: ProductRow) => ({
          id: p.id, name: p.name,
          mainImage: p.mainImage ?? null,
          category: p.category ?? null,
          brand: p.brand ?? null,
          supplierPrice: p.supplierPrice ?? null,
          aiScore: p.aiScore ?? null,
          status: p.status,
          naverProductId: p.naverProductId ?? null,
        }));
        setProducts(list);
        // Auto-select first product if URL didn't specify and list non-empty
        if (!selectedId && list.length > 0) setSelectedId(list[0].id);
      } catch (err) {
        setProductsError(err instanceof Error ? err.message : String(err));
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [products, selectedId],
  );

  // All Studio action state + handlers live in the shared hook so PLANT
  // (Phase 3-C-2) can call it with savedProductId and get the same flow.
  const actions = useStudioActions(selectedId);

  // canPublish depends on the caller's view of hasNaverId, so the hook
  // leaves it to the page to compute.
  const hasNaverId = !!selectedProduct?.naverProductId;
  const canPublish = actions.hasSavedAsset && hasNaverId && !actions.publishBusy;

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 0px)' }}>
      {/* ── Left product list ───────────────────────────────────────────── */}
      <aside
        style={{
          width: 320, flexShrink: 0,
          background: '#fff', borderRight: '1px solid #FFE0EC',
          overflowY: 'auto', padding: '20px 12px',
        }}
      >
        <header style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>
            {strings.productList.title}
          </h2>
        </header>
        {productsError ? (
          <div style={{ padding: 14, fontSize: 12, color: '#b91c1c' }}>
            {strings.productList.error}: {productsError}
            <button
              onClick={() => { setProductsLoading(true); setProductsError(null); window.location.reload(); }}
              style={{
                marginTop: 8, padding: '6px 12px',
                background: '#e62310', color: '#fff', border: 'none', borderRadius: 6,
                cursor: 'pointer', fontSize: 11, fontWeight: 700,
              }}
            >
              {strings.productList.retry}
            </button>
          </div>
        ) : (
          <ProductListPane
            products={products}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={productsLoading}
          />
        )}
      </aside>

      {/* ── Right detail pane ─────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 60px', maxWidth: 1100 }}>
        {/* Page header */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#fff0f5', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Palette size={22} style={{ color: '#e62310' }} strokeWidth={2.4} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>
              {strings.page.title}
            </h1>
            <p style={{ fontSize: 12, color: '#B0A0A8', margin: '3px 0 0' }}>
              {strings.page.subtitle}
            </p>
          </div>
        </header>

        {!selectedProduct ? (
          <div style={{
            padding: 40, fontSize: 14, color: '#7A6873',
            background: '#fff', borderRadius: 16, textAlign: 'center',
          }}>
            {strings.productList.selectPrompt}
          </div>
        ) : (
          <>
            {/* Selected product header */}
            <section
              className="kk-card"
              style={{ padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}
            >
              {selectedProduct.mainImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedProduct.mainImage}
                  alt=""
                  width={64}
                  height={64}
                  style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: 10,
                  background: '#F5F0F2', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <ImageIcon size={26} style={{ color: '#B0A0A8' }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: 16, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>
                  {selectedProduct.name}
                </h2>
                <p style={{ fontSize: 12, color: '#7A6873', margin: '4px 0 0' }}>
                  {strings.header.category}: {selectedProduct.category ?? strings.header.noCategory} ·
                  {' '}{strings.header.brand}: {selectedProduct.brand ?? '-'} ·
                  {' '}{strings.header.price}: {fmtPrice(selectedProduct.supplierPrice)}
                </p>
              </div>
            </section>

            {/* Action cards */}
            <DiagnosisCard
              diagnosis={actions.diagnosis}
              busy={actions.diagBusy}
              error={actions.diagError}
              onRun={actions.runDiagnose}
            />
            <ThumbnailCard
              thumbnails={actions.thumbnails}
              busy={actions.thumbBusy}
              error={actions.thumbError}
              onRun={actions.runThumbnail}
              mainVariant={actions.mainVariant}
              onSelectMain={actions.setMainVariant}
            />
            <DetailPageCard
              detail={actions.detail}
              busy={actions.detailBusy}
              error={actions.detailError}
              onRun={actions.runDetail}
              overrideSkeletonId={actions.overrideSkeletonId}
              onOverrideChange={actions.setOverrideSkeletonId}
            />
            <ActionsCard
              canSave={actions.canSave}
              saveBusy={actions.saveBusy}
              save={actions.save}
              saveError={actions.saveError}
              onSave={actions.runSave}
              canPublish={canPublish}
              publishBusy={actions.publishBusy}
              publish={actions.publish}
              publishError={actions.publishError}
              onPublish={actions.runPublish}
              hasSavedAsset={actions.hasSavedAsset}
              hasNaverId={hasNaverId}
            />
          </>
        )}
      </main>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────

export default function StudioPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Loader2 size={20} className="animate-spin" style={{ color: '#e62310' }} />
        <span style={{ fontSize: 14, color: '#666' }}>{strings.productList.loading}</span>
      </div>
    }>
      <StudioInner />
    </Suspense>
  );
}
