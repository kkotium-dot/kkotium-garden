'use client';

// AssetBrowser — editable studio asset browser (asset loading v2, lanes 1·3).
// ============================================================================
// Per-product, per-stage grid over the canonical store
// (`product-assets/{id}/{stage}/`) with operator actions, direct upload, and
// folder shortcuts. Read-only sibling GeneratedAssetLocations (product detail
// page) is left untouched — this is the editable surface mounted in the studio
// workbench.
//
//   Lane 1 (app <-> Supabase):
//     - direct upload: POST /api/products/{id}/assets/upload { stage, file }
//       (stage auto-recommended via kindForSource; operator can override)
//     - actions per file: set-main / add-extra / archive
//       POST /api/products/{id}/assets/action — all reversible, NO Naver PUT.
//   Lane 3 (folder shortcuts):
//     - Supabase dashboard deeplink (path={pid}/{stage}) + storage-path copy.
//
// Korean strings isolated to AssetBrowser.strings.ko.json (#35). Lucide icons
// only — no emoji in JSX (rule 3-1). No hardcoded product logic (#55).
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FolderOpen,
  ImageIcon,
  FileQuestion,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Inbox,
  ExternalLink,
  Upload,
  Star,
  Plus,
  Archive,
  RefreshCw,
  Download,
  Trash2,
} from 'lucide-react';
import strings from './AssetBrowser.strings.ko.json';
import { Collapsible, OverflowMenu, type OverflowMenuItem } from '@/components/common';
import { broadcastProductMutated } from '@/lib/events/product-mutated';
// kindForSource is a pure classifier (asset-taxonomy only `import type`s the
// server storage module, which the bundler erases) — safe in a client bundle.
import { kindForSource } from '@/lib/storage/asset-taxonomy';

// Pipeline-ordered stages an operator may upload into (mirrors STAGE_DIRS;
// kept local so this client component never imports the server storage module).
const UPLOAD_STAGES = ['source', 'cutout', 'plate', 'reference', 'composite', 'thumbnail', 'detail', 'archive'] as const;

// Supabase project ref derived from the public URL (no hardcoded ref / secret).
const SUPABASE_REF: string | null = (() => {
  try {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!u) return null;
    return new URL(u).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
})();

function supabaseFolderUrl(productId: string, stage: string): string | null {
  if (!SUPABASE_REF) return null;
  const path = stage === 'root' ? productId : `${productId}/${stage}`;
  return `https://supabase.com/dashboard/project/${SUPABASE_REF}/storage/buckets/product-assets?path=${encodeURIComponent(
    path,
  )}`;
}

interface StageFile {
  name: string;
  path: string;
  publicUrl: string;
  size: number;
  createdAt: string;
}

interface StageGroup {
  stage: string;
  adobeFolder: string | null;
  storagePath: string;
  count: number;
  files: StageFile[];
}

interface AssetsResponse {
  success: boolean;
  total?: number;
  stages?: StageGroup[];
  error?: string;
}

type StageKey = keyof typeof strings.stage;

function stageLabel(stage: string): string {
  const meta = strings.stage[stage as StageKey];
  return meta ? meta.label : stage;
}
function stageDesc(stage: string): string {
  const meta = strings.stage[stage as StageKey];
  return meta ? meta.desc : '';
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)$/i;

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CopyButton({ value, title }: { value: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (insecure context) — silently ignore.
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      title={copied ? strings.shortcut.copied : title}
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
      {title}
    </button>
  );
}

interface ProductImageState {
  mainImage: string | null;
  extraUrls: Set<string>;
}

function extraUrlSet(extra: unknown): Set<string> {
  const s = new Set<string>();
  if (Array.isArray(extra)) {
    for (const e of extra) {
      if (typeof e === 'string') s.add(e);
      else if (e && typeof e === 'object' && typeof (e as { url?: unknown }).url === 'string') {
        s.add((e as { url: string }).url);
      }
    }
  }
  return s;
}

type Confidence = 'high' | 'medium' | 'low';

interface PendingUpload {
  file: File;
  recommended: string;
  chosen: string;
  classifying?: boolean;
  confidence?: Confidence;
  qualityFlags?: string[];
  conflict?: boolean;
  nameStage?: string | null;
  contentStage?: string | null;
  hasTransparency?: boolean;
}

export interface AssetBrowserProps {
  productId: string | null;
  /** UX-v2.1 — context sync. When set, the browser defaults to showing only
   *  these stage groups (the current workflow step's assets); a "전체 보기"
   *  toggle restores full access. Omit/null = show everything (legacy). */
  focusStages?: string[] | null;
  /** Label of the current step (for the focus toggle context). */
  focusLabel?: string;
}

export default function AssetBrowser({ productId, focusStages, focusLabel }: AssetBrowserProps) {
  const [data, setData] = useState<AssetsResponse | null>(null);
  const [img, setImg] = useState<ProductImageState>({ mainImage: null, extraUrls: new Set() });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  // Upload state. A picked file enters a `pending` confirm step that shows the
  // kindForSource-inferred stage as a chip; the operator confirms or overrides
  // the target subfolder before the file is stored (semi-auto, authority §3).
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Delete confirm (irreversible) — a custom modal showing the exact target
  // (thumbnail + name + stage + warnings) replaces the anonymous native confirm,
  // so an operator can never delete the wrong asset by reflex (#73 직관우선).
  const [deleteTarget, setDeleteTarget] = useState<{ file: StageFile; stage: string } | null>(null);

  // Multi-select (#2, Stage 1) — selection is lifted here so one bulk action bar
  // can span every stage group. Keyed by file.path; stores {file,stage} so bulk
  // ops need no reconstruction from the loaded data. Cleared on product switch
  // (paths are product-scoped) and after each bulk run.
  const [selected, setSelected] = useState<Map<string, { file: StageFile; stage: string }>>(new Map());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const toggleSelect = useCallback((file: StageFile, stage: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(file.path)) next.delete(file.path);
      else next.set(file.path, { file, stage });
      return next;
    });
  }, []);

  // UX-v2.1 — context-sync filter. Default to the active step's stages; the
  // operator can flip "전체 보기" to see every stage. Reset to focused whenever
  // the focus set changes (step switch) so the toolbox follows the workflow.
  const hasFocus = Array.isArray(focusStages) && focusStages.length > 0;
  const [showAll, setShowAll] = useState(false);
  const focusKey = hasFocus ? (focusStages as string[]).join(',') : '';
  useEffect(() => {
    setShowAll(false);
  }, [focusKey]);

  // Drop any selection when the product changes — stored paths are product-scoped.
  useEffect(() => {
    setSelected(new Map());
  }, [productId]);

  const flash = useCallback((kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2600);
  }, []);

  // Pick -> optimistic filename inference -> content-aware preflight classify
  // (alpha / ratio / resolution) -> chip shows confidence + quality + conflict.
  const onPickFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        flash('err', strings.upload.notImage);
        return;
      }
      const recommended = kindForSource(file.name);
      setPending({ file, recommended, chosen: recommended, classifying: !!productId });
      if (!productId) return;
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`/api/products/${productId}/assets/classify`, {
          method: 'POST',
          body: form,
        }).then((r) => r.json());
        setPending((p) => {
          if (!p || p.file !== file) return p; // a newer pick superseded this one
          if (!res.success) return { ...p, classifying: false };
          return {
            ...p,
            recommended: res.recommendedStage,
            // only adopt the server pick if the operator has not overridden yet
            chosen: p.chosen === p.recommended ? res.recommendedStage : p.chosen,
            confidence: res.confidence,
            qualityFlags: Array.isArray(res.qualityFlags) ? res.qualityFlags : [],
            conflict: !!res.conflict,
            nameStage: res.nameStage ?? null,
            contentStage: res.contentStage ?? null,
            hasTransparency: !!res.hasTransparency,
            classifying: false,
          };
        });
      } catch {
        setPending((p) => (p && p.file === file ? { ...p, classifying: false } : p));
      }
    },
    [flash, productId],
  );

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const [assetsRes, prodRes] = await Promise.all([
        fetch(`/api/products/${productId}/assets`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/products/${productId}`, { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => null),
      ]);
      if ((assetsRes as AssetsResponse).success) {
        setData(assetsRes as AssetsResponse);
      } else {
        setError((assetsRes as AssetsResponse).error || strings.error);
      }
      const p = prodRes?.product;
      setImg({
        mainImage: p?.mainImage ?? null,
        extraUrls: extraUrlSet(p?.extra_images),
      });
    } catch {
      setError(strings.error);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    setData(null);
    setError(null);
    if (productId) void load();
  }, [productId, load]);

  // ── Upload ────────────────────────────────────────────────────────────────
  // Stores the pending file into the operator-confirmed stage subfolder. The
  // explicit stage is always sent (the chip already showed the inference), so
  // there is no server-side re-guessing once the operator has confirmed.
  const doUpload = useCallback(
    async (file: File, stage: string) => {
      if (!productId) return;
      if (!file.type.startsWith('image/')) {
        flash('err', strings.upload.notImage);
        return;
      }
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        if (stage) form.append('stage', stage);
        const res = await fetch(`/api/products/${productId}/assets/upload`, {
          method: 'POST',
          body: form,
        }).then((r) => r.json());
        if (res.success) {
          const ratioNote = res.normalized?.applied ? ` · ${strings.upload.ratioFixed}` : '';
          flash('ok', `${strings.upload.done} (${stageLabel(res.stage)})${ratioNote}`);
          setPending(null);
          await load();
        } else {
          flash('err', res.error || strings.upload.failed);
        }
      } catch {
        flash('err', strings.upload.failed);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [productId, flash, load],
  );

  // Network-only action runner — the confirm gates live in doAction (archive)
  // and the delete modal, so this performs the mutation with no extra prompts.
  const performAction = useCallback(
    async (action: 'set_main' | 'add_extra' | 'archive' | 'delete', file: StageFile) => {
      if (!productId) return;
      setBusyPath(file.path);
      try {
        const res = await fetch(`/api/products/${productId}/assets/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            path: file.path,
            publicUrl: file.publicUrl,
            ...(action === 'delete' ? { confirm: true } : {}),
          }),
        }).then((r) => r.json());
        if (res.success) {
          const doneMsg =
            action === 'set_main'
              ? strings.action.setMainDone
              : action === 'add_extra'
                ? strings.action.addExtraDone
                : action === 'delete'
                  ? strings.action.deleteDone
                  : strings.action.archiveDone;
          flash('ok', doneMsg);
          // #62 — set_main / add_extra / archive change the product's image
          // state; broadcast so sibling views (studio header/canvas) refetch.
          broadcastProductMutated(productId, action);
          await load();
        } else {
          flash('err', res.error || strings.error);
        }
      } catch {
        flash('err', strings.error);
      } finally {
        setBusyPath(null);
      }
    },
    [productId, flash, load],
  );

  // ── Action gate (set_main / add_extra / archive / delete) ───────────────────
  // Archive uses a single native confirm; delete opens the custom modal below.
  const doAction = useCallback(
    (action: 'set_main' | 'add_extra' | 'archive' | 'delete', file: StageFile, stage: string) => {
      if (!productId) return;
      if (action === 'archive') {
        if (img.mainImage === file.publicUrl) {
          flash('err', strings.action.archiveMainBlocked);
          return;
        }
        if (!window.confirm(strings.action.confirmArchive)) return;
        void performAction('archive', file);
        return;
      }
      if (action === 'delete') {
        if (img.mainImage === file.publicUrl) {
          flash('err', strings.action.deleteMainBlocked);
          return;
        }
        setDeleteTarget({ file, stage });
        return;
      }
      void performAction(action, file);
    },
    [productId, img.mainImage, flash, performAction],
  );

  // Confirmed from the delete modal — irreversible storage removal.
  const confirmDelete = useCallback(async () => {
    const target = deleteTarget;
    if (!target) return;
    setDeleteTarget(null);
    await performAction('delete', target.file);
  }, [deleteTarget, performAction]);

  // Bulk runner (#2) — reuses the verified per-file network runner so every
  // existing gate is preserved (archive is reversible; delete sends confirm and
  // is itself gated behind the bulk-delete modal). The current main image is
  // skipped (archiving/deleting the main is blocked per doAction). No Naver PUT.
  const runBulk = useCallback(
    async (action: 'archive' | 'delete') => {
      const targets = Array.from(selected.values()).filter(
        ({ file }) => img.mainImage !== file.publicUrl,
      );
      if (targets.length === 0) {
        setSelected(new Map());
        setBulkDeleteOpen(false);
        return;
      }
      setBulkBusy(true);
      for (const { file } of targets) {
        // eslint-disable-next-line no-await-in-loop -- sequential keeps the
        // per-file busy/refresh contract intact and avoids hammering the API.
        await performAction(action, file);
      }
      setBulkBusy(false);
      setBulkDeleteOpen(false);
      setSelected(new Map());
    },
    [selected, img, performAction],
  );

  const total = data?.total ?? 0;
  // Selected items that bulk-delete will actually remove (the main image is
  // always skipped). Surfaced in the confirm modal so the count is honest.
  const bulkDeletableCount = Array.from(selected.values()).filter(
    ({ file }) => img.mainImage !== file.publicUrl,
  ).length;

  // UX-v2.1 — visible stage groups follow the active step unless 전체 보기 is on.
  const allStages = data?.stages ?? [];
  const focusActive = hasFocus && !showAll;
  const visibleStages = focusActive
    ? allStages.filter((g) => (focusStages as string[]).includes(g.stage))
    : allStages;

  // UX-v2.4 — secondary header actions (export / refresh) demoted to overflow.
  const headerMenu: OverflowMenuItem[] = [];
  if (productId && total > 0) {
    headerMenu.push({
      key: 'export',
      label: strings.exportZip,
      icon: <Download className="w-3.5 h-3.5" />,
      onClick: () => {
        if (typeof window !== 'undefined') window.location.href = `/api/products/${productId}/assets/export`;
      },
    });
  }
  if (productId) {
    headerMenu.push({
      key: 'refresh',
      label: strings.refresh,
      icon: <RefreshCw className="w-3.5 h-3.5" />,
      onClick: () => void load(),
    });
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      {/* UX-v2.2 — compact 1-line header (title + count + focus toggle + overflow). */}
      <div className="flex items-center gap-2 mb-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 min-w-0">
          <FolderOpen className="w-4 h-4 text-pink-500 shrink-0" />
          <span className="truncate">{strings.title}</span>
        </h2>
        {!loading && !error && productId && (
          <span className="text-[11px] text-gray-500 shrink-0">
            {total}
            {strings.countUnit}
          </span>
        )}
        <div className="flex-1" />
        {hasFocus && productId && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border transition shrink-0 ${
              focusActive
                ? 'text-pink-700 bg-pink-50 border-pink-200 hover:bg-pink-100'
                : 'text-gray-500 bg-white border-gray-200 hover:border-pink-300'
            }`}
            title={focusActive ? strings.focus.showAll : strings.focus.stepOnly}
          >
            {focusActive
              ? (focusLabel ? `${focusLabel} · ${strings.focus.stepOnly}` : strings.focus.stepOnly)
              : strings.focus.showAll}
          </button>
        )}
        {productId && <OverflowMenu items={headerMenu} ariaLabel={strings.title} size={28} />}
      </div>

      {toast && (
        <div
          className={`mb-3 flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
            toast.kind === 'ok' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
          }`}
        >
          {toast.kind === 'ok' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="break-all">{toast.msg}</span>
        </div>
      )}

      {!productId && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
          <Inbox className="w-4 h-4" />
          {strings.selectProduct}
        </div>
      )}

      {productId && (
        <>
          {/* Direct upload (lane 1 SEMI-AUTO) — pick file -> inferred stage chip
              -> operator confirm/override -> store into the exact subfolder.
              UX-v2.2: folded by default so the toolbox stays compact; auto-opens
              implicitly via the pending pick (the Collapsible re-renders open
              when a file is chosen through the visible "+" inside). */}
          <div className="mb-3">
          <Collapsible
            tone="secondary"
            defaultOpen={false}
            icon={<Upload className="w-4 h-4 text-pink-500" />}
            title={strings.focus.uploadSection}
          >
            {!pending ? (
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-pink-600 hover:border-pink-300 border border-gray-200 rounded-md py-3 bg-white transition disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                {strings.upload.drop}
              </button>
            ) : (
              <div className="rounded-md border border-pink-200 bg-white p-3">
                <p className="text-xs text-gray-500 truncate" title={pending.file.name}>
                  {pending.file.name}
                </p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-600">{strings.upload.inferred}</span>
                  <span className="inline-flex items-center rounded-full bg-pink-50 text-pink-700 text-xs font-semibold px-2 py-0.5">
                    {stageLabel(pending.recommended)}
                  </span>
                  {pending.classifying ? (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {strings.upload.classifying}
                    </span>
                  ) : (
                    pending.confidence && (
                      <span
                        className={`inline-flex items-center rounded-full text-xs font-medium px-2 py-0.5 ${
                          pending.confidence === 'high'
                            ? 'bg-green-50 text-green-700'
                            : pending.confidence === 'medium'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {strings.upload.confidence[pending.confidence]}
                      </span>
                    )
                  )}
                  {/* Content-signal reason chip — transparency is the cutout
                      signal; channel presence alone is not (opaque RGBA). */}
                  {!pending.classifying && pending.hasTransparency && (
                    <span className="inline-flex items-center rounded-full bg-sky-50 text-sky-700 text-xs font-medium px-2 py-0.5">
                      {strings.upload.transparent}
                    </span>
                  )}
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 ml-auto">
                    {strings.upload.stageLabel}
                    <select
                      value={pending.chosen}
                      onChange={(e) =>
                        setPending((p) => (p ? { ...p, chosen: e.target.value } : p))
                      }
                      className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                    >
                      {UPLOAD_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {stageLabel(s)}
                          {s === pending.recommended ? ` (${strings.upload.recommended})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Conflict: filename hint disagrees with the pixel signal */}
                {pending.conflict && pending.nameStage && pending.contentStage && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      {strings.upload.conflictPrefix} {strings.upload.byName}={stageLabel(pending.nameStage)} ·{' '}
                      {strings.upload.byContent}={stageLabel(pending.contentStage)} — {strings.upload.conflictUrge}
                    </span>
                  </div>
                )}

                {/* Quality warnings */}
                {pending.qualityFlags?.includes('low_resolution') && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-red-700 bg-red-50 rounded px-2 py-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{strings.upload.qualityLowRes}</span>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => void doUpload(pending.file, pending.chosen)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-md py-2 transition disabled:opacity-60"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {strings.upload.uploading}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        {strings.upload.confirm}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => {
                      setPending(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="inline-flex items-center justify-center text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md px-3 py-2 transition disabled:opacity-60"
                  >
                    {strings.upload.cancel}
                  </button>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickFile(f);
              }}
            />
          </Collapsible>
          </div>

          {loading && !data && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              {strings.loading}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="break-all">{error}</span>
            </div>
          )}

          {!error && data && (
            <>
              {total === 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
                  <Inbox className="w-4 h-4" />
                  {strings.emptyAll}
                </div>
              )}
              {total > 0 && focusActive && visibleStages.length === 0 && (
                <div className="flex items-start gap-2 text-xs text-gray-400 py-3 px-1">
                  <Inbox className="w-4 h-4 shrink-0" />
                  <span>{strings.focus.filteredEmpty}</span>
                </div>
              )}
              {/* Stage list — the toolbox COLUMN now scrolls as a fixed-viewport
                  panel (#1, AtelierShell), so the old inner maxHeight/overflow cap
                  (UX-v2.2) is dropped: a single column scroll avoids nested scroll
                  and stops the per-tile kebab dropdown from being clipped by an
                  inner overflow container. Tiles lazy-load their images. */}
              <div className="space-y-2 pr-0.5">
                {visibleStages.map((g) => (
                  <StageRow
                    key={g.stage}
                    group={g}
                    productId={productId}
                    img={img}
                    busyPath={busyPath}
                    selected={selected}
                    onToggleSelect={toggleSelect}
                    onAction={doAction}
                  />
                ))}
              </div>

              {/* Bulk action bar (#2) — appears only with a selection; sticks to
                  the bottom of the scrolling column. Archive is reversible;
                  delete routes through a confirm modal. Reuses no Naver path. */}
              {selected.size > 0 && (
                <div
                  className="sticky bottom-0 z-20 mt-2 flex items-center gap-2 rounded-lg border border-pink-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur"
                >
                  <span className="text-xs font-bold text-pink-700">
                    {strings.bulk.selected.replace('{n}', String(selected.size))}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={bulkBusy}
                      onClick={() => void runBulk('archive')}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition disabled:opacity-50"
                    >
                      {bulkBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-3 h-3" />}
                      {strings.bulk.archive}
                    </button>
                    <button
                      type="button"
                      disabled={bulkBusy}
                      onClick={() => setBulkDeleteOpen(true)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                      {strings.bulk.delete}
                    </button>
                    <button
                      type="button"
                      disabled={bulkBusy}
                      onClick={() => setSelected(new Map())}
                      className="inline-flex items-center rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                      {strings.bulk.clear}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Delete confirm modal — shows the exact target so an operator can never
          delete the wrong asset by reflex. Irreversible (storage removal). */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => busyPath !== deleteTarget.file.path && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white shadow-xl border border-gray-200 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-semibold">{strings.action.deleteModalTitle}</h3>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <div className="w-20 h-20 shrink-0 rounded-md border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center">
                {IMAGE_EXT.test(deleteTarget.file.name) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={deleteTarget.file.publicUrl}
                    alt={deleteTarget.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileQuestion className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 break-all">{deleteTarget.file.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {strings.action.deleteModalStage}: {stageLabel(deleteTarget.stage)}
                </p>
                <p className="text-xs text-gray-400">{formatSize(deleteTarget.file.size)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-1.5 text-xs text-red-700 bg-red-50 rounded px-2 py-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{strings.action.deleteModalIrreversible}</span>
            </div>
            {img.extraUrls.has(deleteTarget.file.publicUrl) && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{strings.action.deleteModalExtraUnlink}</span>
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={busyPath === deleteTarget.file.path}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 inline-flex items-center justify-center text-sm font-medium text-gray-600 border border-gray-300 rounded-md py-2 hover:bg-gray-50 transition disabled:opacity-60"
              >
                {strings.action.deleteModalCancel}
              </button>
              <button
                type="button"
                disabled={busyPath === deleteTarget.file.path}
                onClick={() => void confirmDelete()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md py-2 transition disabled:opacity-60"
              >
                {busyPath === deleteTarget.file.path ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {strings.action.deleteModalConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirm (#2) — multi-target sibling of the single-delete
          modal. Same #73 confirm gate, now for the whole selection. */}
      {bulkDeleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">{strings.bulk.deleteModalTitle}</h3>
            <p className="mt-2 text-sm text-gray-600">
              {strings.bulk.deleteModalBody.replace('{n}', String(bulkDeletableCount))}
            </p>
            <div className="mt-3 flex items-start gap-1.5 text-xs text-red-700 bg-red-50 rounded px-2 py-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{strings.action.deleteModalIrreversible}</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => setBulkDeleteOpen(false)}
                className="flex-1 inline-flex items-center justify-center text-sm font-medium text-gray-600 border border-gray-300 rounded-md py-2 hover:bg-gray-50 transition disabled:opacity-60"
              >
                {strings.bulk.deleteModalCancel}
              </button>
              <button
                type="button"
                disabled={bulkBusy || bulkDeletableCount === 0}
                onClick={() => void runBulk('delete')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md py-2 transition disabled:opacity-60"
              >
                {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {strings.bulk.deleteModalConfirm.replace('{n}', String(bulkDeletableCount))}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stage row ────────────────────────────────────────────────────────────────
function StageRow({
  group,
  productId,
  img,
  busyPath,
  selected,
  onToggleSelect,
  onAction,
}: {
  group: StageGroup;
  productId: string;
  img: ProductImageState;
  busyPath: string | null;
  selected: Map<string, { file: StageFile; stage: string }>;
  onToggleSelect: (file: StageFile, stage: string) => void;
  onAction: (action: 'set_main' | 'add_extra' | 'archive' | 'delete', file: StageFile, stage: string) => void;
}) {
  const applied = group.count > 0;
  const folderUrl = supabaseFolderUrl(productId, group.stage);
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {applied ? (
              <ImageIcon className="w-4 h-4 text-pink-500 shrink-0" />
            ) : (
              <Inbox className="w-4 h-4 text-gray-300 shrink-0" />
            )}
            <span className="text-sm font-semibold text-gray-800">{stageLabel(group.stage)}</span>
            {applied ? (
              <span className="inline-flex items-center rounded-full bg-pink-50 text-pink-700 text-xs font-medium px-2 py-0.5">
                {group.count}
                {strings.countUnit}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-400 text-xs font-medium px-2 py-0.5">
                {strings.notApplied}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-400 truncate">{stageDesc(group.stage)}</p>
          {/* Lane 3 — folder shortcuts */}
          <div className="mt-1.5 flex items-center gap-3 flex-wrap">
            {folderUrl && (
              <a
                href={folderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {strings.shortcut.supabase}
              </a>
            )}
            <CopyButton value={group.storagePath} title={strings.shortcut.copyPath} />
          </div>
        </div>
        {group.adobeFolder && (
          <span className="shrink-0 text-[10px] text-gray-400 whitespace-nowrap">
            {strings.adobePrefix}: {group.adobeFolder}
          </span>
        )}
      </div>

      {applied && (
        <div className="mt-3 flex flex-wrap gap-3">
          {group.files.map((f) => (
            <AssetTile
              key={f.path}
              file={f}
              stage={group.stage}
              isMain={img.mainImage === f.publicUrl}
              inExtra={img.extraUrls.has(f.publicUrl)}
              busy={busyPath === f.path}
              selected={selected.has(f.path)}
              onToggleSelect={onToggleSelect}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single asset tile + actions ───────────────────────────────────────────────
function AssetTile({
  file,
  stage,
  isMain,
  inExtra,
  busy,
  selected,
  onToggleSelect,
  onAction,
}: {
  file: StageFile;
  stage: string;
  isMain: boolean;
  inExtra: boolean;
  busy: boolean;
  selected: boolean;
  onToggleSelect: (file: StageFile, stage: string) => void;
  onAction: (action: 'set_main' | 'add_extra' | 'archive' | 'delete', file: StageFile, stage: string) => void;
}) {
  const isImage = IMAGE_EXT.test(file.name);
  // #2 (Stage 1) — action density: secondary actions (추가·아카이브·삭제) demoted
  // into the shared OverflowMenu kebab, identical to the /crawl row pattern, so
  // a tile shows 0 buttons at rest and only the primary ★대표지정 on hover.
  // All actions reversible / confirm-gated — no Naver PUT.
  const menuItems: OverflowMenuItem[] = [
    {
      key: 'add_extra',
      label: strings.action.addExtra,
      icon: <Plus className="w-3.5 h-3.5" />,
      onClick: () => onAction('add_extra', file, stage),
      disabled: busy || inExtra,
    },
    {
      key: 'archive',
      label: strings.action.archive,
      icon: <Archive className="w-3.5 h-3.5" />,
      onClick: () => onAction('archive', file, stage),
      disabled: busy || isMain,
    },
    {
      key: 'delete',
      label: strings.action.delete,
      icon: <Trash2 className="w-3.5 h-3.5" />,
      onClick: () => onAction('delete', file, stage),
      disabled: busy || isMain,
      danger: true,
    },
  ];
  return (
    <div className={`w-28 shrink-0 group rounded-md ${selected ? 'ring-2 ring-pink-400' : ''}`}>
      <div className="relative">
        <a
          href={file.publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`${file.name} · ${strings.openFile}`}
          className="block"
        >
          <div
            className={`relative aspect-square bg-gray-100 rounded-md border overflow-hidden flex items-center justify-center transition ${
              isMain ? 'border-pink-500 ring-1 ring-pink-300' : 'border-gray-200 group-hover:border-pink-300'
            }`}
          >
            {isImage ? (
              // Storage public URL; matches the app's existing <img> usage.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={file.publicUrl} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <FileQuestion className="w-6 h-6 text-gray-400" />
            )}
            {isMain && (
              <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 rounded bg-pink-600 text-white text-[9px] font-bold px-1 py-0.5">
                <Star className="w-2.5 h-2.5" />
                {strings.action.currentMain}
              </span>
            )}
            {inExtra && !isMain && (
              <span className="absolute top-1 left-1 inline-flex items-center rounded bg-gray-700 text-white text-[9px] font-bold px-1 py-0.5">
                {strings.action.inExtra}
              </span>
            )}
          </div>
        </a>

        {/* Selection checkbox — top-right. Visible when selected; otherwise
            revealed on hover. Sibling of the <a> so it never opens the file. */}
        <button
          type="button"
          onClick={() => onToggleSelect(file, stage)}
          aria-pressed={selected}
          aria-label={selected ? strings.action.deselect : strings.action.select}
          title={selected ? strings.action.deselect : strings.action.select}
          className={`absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center border transition ${
            selected
              ? 'bg-pink-600 border-pink-600 text-white opacity-100'
              : 'bg-white/90 border-gray-300 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-pink-500 hover:border-pink-400'
          }`}
        >
          <Check className="w-3 h-3" />
        </button>

        {/* Hover action overlay — primary ★대표지정 + kebab. 0 buttons at rest;
            focus-within keeps it open while the kebab menu is in use. */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 p-1 bg-gradient-to-t from-black/55 to-transparent opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            disabled={busy || isMain}
            onClick={() => onAction('set_main', file, stage)}
            title={strings.action.setMain}
            aria-label={strings.action.setMain}
            className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-white/95 py-1 text-[11px] font-bold text-pink-700 hover:bg-white transition disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
            {strings.action.setMain}
          </button>
          <OverflowMenu items={menuItems} ariaLabel={strings.action.more} align="right" size={24} />
        </div>
      </div>
      <p className="mt-1 text-[10px] leading-tight text-gray-600 truncate">{file.name}</p>
      <p className="text-[10px] text-gray-400">{formatSize(file.size)}</p>
    </div>
  );
}
