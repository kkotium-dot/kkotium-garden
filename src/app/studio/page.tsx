'use client';

// src/app/studio/page.tsx
//
// C-STUDIO-UX (2026-06-23): premium 3-column "온실 아틀리에" atelier.
//   Top    — StudioStepper (썸네일 랩 -> 상세 캔버스 -> SEO 부스터 -> 발행 검토)
//   Left   — 도구함  : compact product picker + AssetBrowser (정원 창고/템플릿/폰트)
//   Center — 개화 작업대 : device toggle + live preview + step cards
//   Right  — 검색 생장 관제탑 : ControlTower (surfaces dryRun gate / DNA / diagnosis)
//
// PRESERVE-ONLY restructure (#132): every existing card + hook is reused as-is
// (useStudioActions / useEngineStrategy / engine panels). The cards were merely
// relocated from the old WorkbenchShell+WorkbenchTabs right rail into stepper
// groups. No validation/publish/dryRun logic changed — the control tower only
// VISUALIZES already-fetched state. Detail-page assembly (DetailPageCard +
// SlotFunnelBoard) is the single home here (#131).
//
// Cards stay mounted across steps (display toggle) so per-card state survives
// step switches, matching the previous tab behaviour.

import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { onProductMutated } from '@/lib/events/product-mutated';
import { Palette, Loader2, Image as ImageIcon, Check, Monitor, Smartphone, Warehouse, FlaskConical, NotebookText, Clock } from 'lucide-react';
import strings from '@/lib/i18n/studio-strings.ko.json';
import {
  DiagnosisCard,
  ThumbnailCard,
  DetailPageCard,
  ActionsCard,
  AssetBrowser,
  useStudioActions,
  fmtPrice,
  type ProductRow,
} from '@/components/studio';
import {
  WorkbenchCanvas,
  JobLifecyclePanel,
  MoodCameraPanel,
} from '@/components/studio/workbench';
// SLOT FUNNEL BOARD SF-1 — read-only 7-section detail assembly board.
import DetailAssemblyBoard from '@/components/studio/assembly/DetailAssemblyBoard';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import {
  CategoryDnaCard,
  SlotFunnelBoard,
  PrePublishGatePanel,
  useEngineStrategy,
} from '@/components/studio/engine';
import {
  AtelierShell,
  StudioStepper,
  ControlTower,
  KkottiGuide,
  type AtelierStepKey,
  type AtelierSidebarTab,
} from '@/components/studio/atelier';
import { Collapsible, StatusBadge, type StatusTone } from '@/components/common';

// UX-v2.1 — step -> asset stages the 도구함 (AssetBrowser) defaults to showing.
// Stages mirror the canonical taxonomy (source/cutout/plate/reference/composite/
// thumbnail/detail/archive). Product-agnostic; "전체 보기" always restores all.
const STEP_STAGES: Record<AtelierStepKey, string[]> = {
  thumbnail: ['source', 'cutout', 'plate', 'reference', 'composite', 'thumbnail'],
  detail: ['composite', 'detail'],
  seo: ['thumbnail', 'detail'],
  publish: ['thumbnail', 'detail', 'archive'],
};

// ── Main inner ────────────────────────────────────────────────────────────

function StudioInner() {
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get('product');
  // Deep-link step (engine intervention deepLinks: ?tab=analyze|image|publish).
  const tabParam = searchParams.get('tab');
  const initialStep: AtelierStepKey =
    tabParam === 'publish' ? 'publish'
      : tabParam === 'image' ? 'detail'
        : 'thumbnail';

  // Stepper + device-preview state (page-owned).
  const [step, setStep] = useState<AtelierStepKey>(initialStep);
  const [device, setDevice] = useState<'pc' | 'mobile'>('pc');

  // Product list state (page-specific — the hook only knows about a single
  // selected productId, not the list)
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialProductId);

  // Fetch the product list. Reused on mount and on a product-mutation broadcast
  // (#62) so the header/canvas mainImage refreshes after an asset-browser action.
  const loadProducts = useCallback(async () => {
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
  }, []);

  // Fetch on mount.
  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  // #62 — refetch when a sibling view (asset browser) mutates a product.
  useEffect(() => onProductMutated(() => void loadProducts()), [loadProducts]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [products, selectedId],
  );

  // All Studio action state + handlers live in the shared hook so PLANT
  // (Phase 3-C-2) can call it with savedProductId and get the same flow.
  const actions = useStudioActions(selectedId);

  // Engine Stage 1 — one fetch feeds the DNA card / slot funnel / publish gate
  // AND the control tower visualization. Single source of truth (#132).
  const engine = useEngineStrategy(selectedId);

  // canPublish depends on the caller's view of hasNaverId, so the hook
  // leaves it to the page to compute.
  const hasNaverId = !!selectedProduct?.naverProductId;
  const canPublish = actions.hasSavedAsset && hasNaverId && !actions.publishBusy;

  // ── Toolbox (left rail) ─────────────────────────────────────────────────
  const a = strings.atelier;
  const toolboxSlot: ReactNode = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <header>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--gp-ink-900)' }}>
          {a.toolbox.title}
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--gp-ink-500)' }}>
          {a.toolbox.subtitle}
        </p>
      </header>

      {/* Compact product picker — Studio is entered with a product preselected
          (#131), but the seller can still switch products without leaving. */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gp-ink-700)' }}>
          {a.toolbox.productPicker}
        </span>
        {productsLoading ? (
          <span style={{ fontSize: 11, color: 'var(--gp-ink-500)' }}>{strings.productList.loading}</span>
        ) : products.length === 0 ? (
          <span style={{ fontSize: 11, color: 'var(--gp-ink-500)', lineHeight: 1.5 }}>{a.toolbox.noProduct}</span>
        ) : (
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value || null)}
            style={{
              padding: '8px 10px', fontSize: 12, fontWeight: 600,
              color: 'var(--gp-ink-900)', background: '#fff',
              border: '1px solid var(--color-border)', borderRadius: 10,
              outline: 'none', cursor: 'pointer',
            }}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        {productsError && (
          <span style={{ fontSize: 11, color: '#b91c1c' }}>
            {strings.productList.error}: {productsError}
          </span>
        )}
      </label>

      {/* The 도구함 itself — live-verified AssetBrowser (정원 창고 / 템플릿 / 폰트,
          stage groups + 미적용 badges intact). UX-v2.1: defaults to the active
          step's stages; 전체 보기 토글 restores full access. */}
      <AssetBrowser
        productId={selectedProduct?.id ?? null}
        focusStages={STEP_STAGES[step]}
        focusLabel={a.steps[step]}
      />
    </div>
  );

  // ── Step cards (heavy forms) — relocated to 배양실 (S2-B.1) ────────────────
  // #132/#147 relocate-only: the step input/generation cards (Firefly prompt /
  // mood→camera / AI diagnosis / detail-template / background select, carried by
  // the thumbnail·detail·seo·publish cards) were reparented from the center
  // canvas into the 배양실 (cultivation) sidebar panel. Every handler/state
  // binding is unchanged — they read the page-level `actions` / `engine` / `step`;
  // only the JSX parent moved. Step-sync (each step shows its own cards) is
  // inherent in StepGroup's `step` gating; the S2-B.2 reveal polish builds on it.
  // The 꼬띠 guide bubble + live preview stay in the center workspace.
  const StepGroup = ({ when, children }: { when: AtelierStepKey; children: ReactNode }) => (
    <div
      hidden={step !== when}
      className={step === when ? 'kk-step-reveal' : undefined}
      style={{ display: step === when ? 'flex' : 'none', flexDirection: 'column', gap: 'var(--space-4)' }}
    >
      {children}
    </div>
  );

  // S2-B.2 — per-step completion status derived from EXISTING actions/engine
  // state only (no new scoring logic, #132). neutral=미작업 · warning=진행 ·
  // success=완료, surfaced via the shared StatusBadge tones (#55 product-agnostic).
  const stepStatusMap: Record<AtelierStepKey, 'todo' | 'progress' | 'done'> = {
    thumbnail: actions.thumbBusy ? 'progress' : (actions.thumbnails ? 'done' : 'todo'),
    detail: actions.detailBusy ? 'progress' : (actions.detail ? 'done' : 'todo'),
    seo: engine.loading ? 'progress' : (engine.data?.dna ? 'done' : 'todo'),
    publish: (actions.publishBusy || actions.saveBusy) ? 'progress' : (actions.hasSavedAsset ? 'done' : 'todo'),
  };
  const STEP_STATUS_TONE: Record<'todo' | 'progress' | 'done', StatusTone> = {
    todo: 'neutral', progress: 'warning', done: 'success',
  };
  const STEP_KEYS: AtelierStepKey[] = ['thumbnail', 'detail', 'seo', 'publish'];

  const cultivationSlot: ReactNode = selectedProduct ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: 0 }}>
      {/* S2-B.2 — traffic-light step StatusCards + REVEAL nav. Each row shows a
          step + its 미작업/진행/완료 status (from existing state); clicking reveals
          that step's form below (active highlighted, only the active form shows). */}
      <div role="tablist" aria-label={a.stepStatus.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {STEP_KEYS.map((k) => {
          const st = stepStatusMap[k];
          const active = step === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStep(k)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                padding: '8px 11px', borderRadius: 10, cursor: 'pointer', minWidth: 0, textAlign: 'left',
                border: active ? '1.5px solid var(--brand-red)' : '1px solid var(--color-border)',
                background: active ? 'var(--pink-soft)' : 'var(--color-surface)',
                transition: 'background 0.12s, border-color 0.12s',
              }}
            >
              <span style={{
                fontSize: 12.5, fontWeight: active ? 800 : 600,
                color: active ? 'var(--brand-red)' : 'var(--gp-ink-700)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
              }}>
                {a.steps[k]}
              </span>
              <StatusBadge tone={STEP_STATUS_TONE[st]}>{a.stepStatus[st]}</StatusBadge>
            </button>
          );
        })}
      </div>
      {/* ── Step 1: 썸네일 랩 ─────────────────────────────────────────────── */}
      {/* UX-v2.3 — primary card (썸네일) leads expanded; supporting cards
          (진단·무드) fold by default so attention lands on one task. */}
      <StepGroup when="thumbnail">
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
          productName={selectedProduct.name}
          category={selectedProduct.category}
        />
        <Collapsible tone="secondary" defaultOpen={false} title={strings.diagnosis.title}>
          <DiagnosisCard
            diagnosis={actions.diagnosis}
            busy={actions.diagBusy}
            error={actions.diagError}
            onRun={actions.runDiagnose}
          />
        </Collapsible>
        <Collapsible tone="secondary" defaultOpen={false} title={strings.workbench.moodCamera.title}>
          <MoodCameraPanel
            productName={selectedProduct.name}
            category={selectedProduct.category}
          />
        </Collapsible>
      </StepGroup>

      {/* ── Step 2: 상세 캔버스 (single home for detail assembly, #131) ────── */}
      <StepGroup when="detail">
        <DetailPageCard
          detail={actions.detail}
          busy={actions.detailBusy}
          error={actions.detailError}
          onRun={actions.runDetail}
          overrideSkeletonId={actions.overrideSkeletonId}
          onOverrideChange={actions.setOverrideSkeletonId}
          lifestyleAssetUrl={actions.manualBackdropUrl}
          onLifestyleChange={actions.setManualBackdropUrl}
          productId={selectedProduct.id}
          sourceDetailUrl={(selectedProduct as { source_detail_url?: string | null }).source_detail_url ?? null}
        />
        <Collapsible tone="secondary" defaultOpen={false} title={strings.engine.funnel.title}>
          <SlotFunnelBoard
            slots={engine.data?.slots ?? []}
            loading={engine.loading}
            degraded={engine.degraded}
          />
        </Collapsible>
        {/* SLOT FUNNEL BOARD SF-1 — read-only detail assembly (7 sections + asset
            tray). Empty stages deep-link back to the image-generation step.
            #62: isolated by ErrorBoundary so a render fault here can never blank
            the whole step canvas — the rest of 배양실 keeps rendering. */}
        <ErrorBoundary label="상세 조립 보드">
          <DetailAssemblyBoard
            productId={selectedProduct.id}
            onNavigateToGenerate={() => setStep('thumbnail')}
          />
        </ErrorBoundary>
      </StepGroup>

      {/* ── Step 3: SEO 부스터 ────────────────────────────────────────────── */}
      <StepGroup when="seo">
        <CategoryDnaCard
          dna={engine.data?.dna ?? null}
          source={engine.data?.dnaSource}
          loading={engine.loading}
          degraded={engine.degraded}
        />
      </StepGroup>

      {/* ── Step 4: 발행 검토 ─────────────────────────────────────────────── */}
      <StepGroup when="publish">
        <PrePublishGatePanel
          gate={engine.data?.gate ?? null}
          slots={engine.data?.slots ?? []}
          loading={engine.loading}
          degraded={engine.degraded}
          productId={selectedId}
          onAssessed={engine.refetch}
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
      </StepGroup>
    </div>
  ) : (
    <div style={{ padding: 16, textAlign: 'center', color: 'var(--gp-ink-500)', fontSize: 12, lineHeight: 1.6 }}>
      {a.workspace.selectPrompt}
    </div>
  );

  // ── Dual sidebar (S2-A 골격 · S2-B.1 배양실 populated) ──────────────────────
  // 창고 hosts the 도구함 (relocate-only #132); 배양실 now hosts the relocated
  // step work-forms (S2-B.1); 일지 stays a scaffold (content in S2-B.2~D).
  const s = a.sidebar;
  const ComingSoon = ({ hint }: { hint: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: 'var(--pink-soft)',
      }}>
        <Clock size={20} style={{ color: 'var(--brand-red)' }} />
      </div>
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--gp-ink-900)' }}>
        {s.comingSoon}
      </h3>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--gp-ink-500)', wordBreak: 'keep-all' }}>
        {hint}
      </p>
    </div>
  );
  const sidebarTabs: AtelierSidebarTab[] = [
    { key: 'warehouse', label: s.warehouse, icon: <Warehouse size={18} />, content: toolboxSlot },
    { key: 'cultivation', label: s.cultivation, icon: <FlaskConical size={18} />, content: cultivationSlot },
    { key: 'journal', label: s.journal, icon: <NotebookText size={18} />, content: <ComingSoon hint={s.comingSoonHint} /> },
  ];

  // ── Assembly slot placeholders — static stubs (S2-B.1) ─────────────────────
  // Communicate the future center layout where each step's output assembles into
  // the detail page. No slot-filling logic yet (S2-D/Phase 3) — purely visual,
  // no backend wiring (#132).
  const assemblySlotStub: ReactNode = (
    <section style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-card)', padding: '14px 16px', flexShrink: 0, minWidth: 0,
    }}>
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--gp-ink-900)' }}>{a.assembly.title}</h3>
      <p style={{ margin: '3px 0 12px', fontSize: 11, color: 'var(--gp-ink-500)', lineHeight: 1.5 }}>{a.assembly.hint}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {[a.assembly.slotMain, a.assembly.slotAdditional, a.assembly.slotDetail].map((label) => (
          <div key={label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 6, aspectRatio: '1 / 1', borderRadius: 12, minWidth: 0, padding: 8, textAlign: 'center',
            border: '1.5px dashed var(--color-border)', background: 'var(--cream)',
          }}>
            <ImageIcon size={20} style={{ color: 'var(--gp-pink-300)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gp-ink-700)' }}>{label}</span>
            <span style={{ fontSize: 10, color: 'var(--gp-ink-500)' }}>{a.assembly.slotPending}</span>
          </div>
        ))}
      </div>
    </section>
  );

  // ── Workspace (center) — live preview + assembly slot stubs + 꼬띠 bubble ───
  // S2-B.1: the heavy step forms moved to 배양실; the center is now the calm
  // preview/assembly surface. The 꼬띠 bubble reflects the active step.
  const workspaceSlot: ReactNode = selectedProduct ? (
    <>
      {/* Selected-product summary header */}
      <section
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)', wordBreak: 'keep-all', flexShrink: 0,
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
          {actions.draftSavedAt && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
              fontSize: 10, fontWeight: 600, color: '#15803D',
            }}>
              <Check size={11} />
              {strings.header.draftSaved.replace(
                '{time}',
                new Date(actions.draftSavedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
              )}
            </span>
          )}
        </div>

        {/* Device toggle — PC / 모바일 live preview */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0, background: 'var(--gp-pink-50)', padding: 3, borderRadius: 10 }}>
          {([['pc', a.workspace.devicePc, Monitor], ['mobile', a.workspace.deviceMobile, Smartphone]] as const).map(
            ([key, label, Icon]) => {
              const active = device === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDevice(key)}
                  aria-pressed={active}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                    borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 700,
                    background: active ? '#fff' : 'transparent',
                    color: active ? 'var(--gp-red-600, #c81e0f)' : 'var(--gp-ink-500)',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <Icon size={13} /> {label}
                </button>
              );
            },
          )}
        </div>
      </section>

      {/* 꼬띠 guide bubble — reflects the active step (microcopy) */}
      <KkottiGuide text={a.kkotti[step]} />

      {/* Job progress (lifecycle) */}
      {selectedProduct.id && (
        <div style={{ flexShrink: 0 }}>
          <JobLifecyclePanel productId={selectedProduct.id} />
        </div>
      )}

      {/* Live preview — device-constrained */}
      <div
        style={{
          flexShrink: 0,
          maxWidth: device === 'mobile' ? 390 : '100%',
          width: '100%',
          marginInline: device === 'mobile' ? 'auto' : undefined,
          transition: 'max-width 0.2s ease',
        }}
      >
        <WorkbenchCanvas
          mainImage={selectedProduct.mainImage ?? null}
          productName={selectedProduct.name}
          thumbnails={actions.thumbnails}
          mainVariant={actions.mainVariant}
          onSelectMain={actions.setMainVariant}
          cutoutUrl={actions.manualCutoutUrl || undefined}
          backdropUrl={actions.manualBackdropUrl || undefined}
        />
      </div>

      {/* Assembly slot placeholders (static stub) */}
      {assemblySlotStub}
    </>
  ) : (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--gp-ink-500)', fontSize: 13 }}>
      {a.workspace.selectPrompt}
    </div>
  );

  // ── Tower (right rail) ──────────────────────────────────────────────────
  // #3 (Stage 1) — the right panel is stepper-gated: ControlTower emphasizes
  // the section that matches the active step (others collapse), the same way
  // the canvas (StepGroup) and the 도구함 asset filter (focusStages) already do.
  const towerSlot: ReactNode = (
    <ControlTower
      step={step}
      gate={engine.data?.gate ?? null}
      dna={engine.data?.dna ?? null}
      diagnosis={actions.diagnosis}
      loading={engine.loading}
      degraded={engine.degraded}
      hasProduct={!!selectedProduct}
    />
  );

  // Page header — rendered INSIDE the atelier shell (fixed-viewport budget) so
  // the three columns precisely fill the remaining height and scroll
  // independently, instead of overflowing the fold (#1, Stage 1).
  const headerSlot: ReactNode = (
    <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
  );

  return (
    <AtelierShell
      header={headerSlot}
      stepper={<StudioStepper active={step} onChange={setStep} />}
      sidebarTabs={sidebarTabs}
      workspace={workspaceSlot}
      tower={towerSlot}
    />
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
