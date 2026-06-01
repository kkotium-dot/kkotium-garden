'use client';

// src/app/studio/page.tsx
//
// Phase 2-B-1 (2026-06-01): 3-column "Workbench" layout.
//   Left  — product list (ProductListPane)
//   Center — large canvas preview (WorkbenchCanvas, Phase 2-B-2 expands)
//   Right  — 4-tab controls (Diagnosis / Thumbnail / Detail / Actions)
//
// Sprint 7-M2 Phase 3-B/C/D/E concerns retained:
//   - Product list fetch + selected-id state (page-specific)
//   - useStudioActions hook drives every action card (same hook PLANT uses)
//   - All Korean strings live in src/lib/i18n/studio-strings.ko.json
//
// Card logic is unchanged — only the container shape moved from vertical
// stack to 3-column workbench. PLANT 7th-tab path (uses the same hook +
// individual cards) is unaffected.

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
import {
  WorkbenchShell,
  WorkbenchCanvas,
  WorkbenchTabs,
} from '@/components/studio/workbench';

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
        // Auto-select the most recent product only when nothing is already
        // selected. Functional update reads the live state (prev) instead of
        // the stale `selectedId` closure captured at mount — otherwise a
        // ?product= prefill (initialProductId) gets clobbered by list[0].
        if (list.length > 0) setSelectedId((prev) => prev ?? list[0].id);
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

  // ── Render slots for the workbench ──────────────────────────────────────

  const listSlot = productsError ? (
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
    <>
      <header style={{ marginBottom: 10 }}>
        <h2 style={{ fontSize: 13, fontWeight: 900, color: 'var(--gp-ink-900)', margin: 0 }}>
          {strings.productList.title}
        </h2>
      </header>
      <ProductListPane
        products={products}
        selectedId={selectedId}
        onSelect={setSelectedId}
        loading={productsLoading}
      />
    </>
  );

  const headerSlot = selectedProduct ? (
    <section
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 16px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        wordBreak: 'keep-all',
      }}
    >
      {selectedProduct.mainImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={selectedProduct.mainImage}
          alt=""
          width={56}
          height={56}
          style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 56, height: 56, borderRadius: 10,
          background: 'var(--gp-pink-50)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ImageIcon size={22} style={{ color: 'var(--gp-pink-300)' }} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{
          fontSize: 15, fontWeight: 800, color: 'var(--gp-ink-900)',
          margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {selectedProduct.name}
        </h2>
        <p style={{ fontSize: 11, color: 'var(--gp-ink-500)', margin: '3px 0 0' }}>
          {strings.header.category}: {selectedProduct.category ?? strings.header.noCategory} ·
          {' '}{strings.header.brand}: {selectedProduct.brand ?? '-'} ·
          {' '}{strings.header.price}: {fmtPrice(selectedProduct.supplierPrice)}
        </p>
      </div>
    </section>
  ) : null;

  const canvasSlot = (
    <WorkbenchCanvas
      mainImage={selectedProduct?.mainImage ?? null}
      productName={selectedProduct?.name}
    />
  );

  const controlsSlot = (
    <WorkbenchTabs
      diagnosis={
        <DiagnosisCard
          diagnosis={actions.diagnosis}
          busy={actions.diagBusy}
          error={actions.diagError}
          onRun={actions.runDiagnose}
        />
      }
      thumbnail={
        <ThumbnailCard
          thumbnails={actions.thumbnails}
          busy={actions.thumbBusy}
          error={actions.thumbError}
          onRun={actions.runThumbnail}
          mainVariant={actions.mainVariant}
          onSelectMain={actions.setMainVariant}
          manualCutoutUrl={actions.manualCutoutUrl}
          onManualCutoutChange={actions.setManualCutoutUrl}
          manualBackdropUrl={actions.manualBackdropUrl}
          onManualBackdropChange={actions.setManualBackdropUrl}
        />
      }
      detail={
        <DetailPageCard
          detail={actions.detail}
          busy={actions.detailBusy}
          error={actions.detailError}
          onRun={actions.runDetail}
          overrideSkeletonId={actions.overrideSkeletonId}
          onOverrideChange={actions.setOverrideSkeletonId}
        />
      }
      actions={
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
      }
    />
  );

  return (
    <>
      {/* Page header — kept outside the workbench grid so it spans full width */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '20px 20px 0',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--gp-pink-50)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Palette size={22} style={{ color: 'var(--gp-red-500)' }} strokeWidth={2.4} />
        </div>
        <div>
          <h1 className="gp-h1" style={{ margin: 0 }}>
            {strings.page.title}
          </h1>
          <p className="gp-caption" style={{ margin: '3px 0 0' }}>
            {strings.page.subtitle}
          </p>
        </div>
      </header>

      <WorkbenchShell
        list={listSlot}
        canvas={canvasSlot}
        controls={controlsSlot}
        header={headerSlot}
      />
    </>
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
