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
} from 'lucide-react';
import strings from './AssetBrowser.strings.ko.json';
import { broadcastProductMutated } from '@/lib/events/product-mutated';

// Pipeline-ordered stages an operator may upload into (mirrors STAGE_DIRS;
// kept local so this client component never imports the server storage module).
const UPLOAD_STAGES = ['source', 'cutout', 'composite', 'thumb', 'detail', 'archive'] as const;

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

export interface AssetBrowserProps {
  productId: string | null;
}

export default function AssetBrowser({ productId }: AssetBrowserProps) {
  const [data, setData] = useState<AssetsResponse | null>(null);
  const [img, setImg] = useState<ProductImageState>({ mainImage: null, extraUrls: new Set() });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  // Upload state
  const [uploadStage, setUploadStage] = useState<string>(''); // '' = auto-recommend
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const flash = useCallback((kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2600);
  }, []);

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
  const doUpload = useCallback(
    async (file: File) => {
      if (!productId) return;
      if (!file.type.startsWith('image/')) {
        flash('err', strings.upload.notImage);
        return;
      }
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        if (uploadStage) form.append('stage', uploadStage);
        const res = await fetch(`/api/products/${productId}/assets/upload`, {
          method: 'POST',
          body: form,
        }).then((r) => r.json());
        if (res.success) {
          flash('ok', `${strings.upload.done} (${stageLabel(res.stage)})`);
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
    [productId, uploadStage, flash, load],
  );

  // ── Actions (set_main / add_extra / archive) ───────────────────────────────
  const doAction = useCallback(
    async (action: 'set_main' | 'add_extra' | 'archive', file: StageFile) => {
      if (!productId) return;
      if (action === 'archive') {
        if (img.mainImage === file.publicUrl) {
          flash('err', strings.action.archiveMainBlocked);
          return;
        }
        if (!window.confirm(strings.action.confirmArchive)) return;
      }
      setBusyPath(file.path);
      try {
        const res = await fetch(`/api/products/${productId}/assets/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, path: file.path, publicUrl: file.publicUrl }),
        }).then((r) => r.json());
        if (res.success) {
          const doneMsg =
            action === 'set_main'
              ? strings.action.setMainDone
              : action === 'add_extra'
                ? strings.action.addExtraDone
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
    [productId, img.mainImage, flash, load],
  );

  const total = data?.total ?? 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
          <FolderOpen className="w-5 h-5 text-pink-500" />
          {strings.title}
        </h2>
        <div className="flex items-center gap-3">
          {!loading && !error && productId && (
            <span className="text-xs text-gray-500">
              {strings.totalPrefix} {total}
              {strings.countUnit}
            </span>
          )}
          {productId && (
            <button
              type="button"
              onClick={() => void load()}
              title={strings.refresh}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-3">{strings.subtitle}</p>

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
          {/* Direct upload (lane 1 SEMI-AUTO) */}
          <div className="mb-4 border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <Upload className="w-4 h-4 text-pink-500" />
                {strings.upload.heading}
              </span>
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                {strings.upload.stageLabel}
                <select
                  value={uploadStage}
                  onChange={(e) => setUploadStage(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white"
                >
                  <option value="">{strings.upload.autoStage}</option>
                  {UPLOAD_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {stageLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-pink-600 hover:border-pink-300 border border-gray-200 rounded-md py-3 bg-white transition disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {strings.upload.uploading}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {strings.upload.drop}
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void doUpload(f);
              }}
            />
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
              <div className="space-y-2">
                {data.stages?.map((g) => (
                  <StageRow
                    key={g.stage}
                    group={g}
                    productId={productId}
                    img={img}
                    busyPath={busyPath}
                    onAction={doAction}
                  />
                ))}
              </div>
            </>
          )}
        </>
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
  onAction,
}: {
  group: StageGroup;
  productId: string;
  img: ProductImageState;
  busyPath: string | null;
  onAction: (action: 'set_main' | 'add_extra' | 'archive', file: StageFile) => void;
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
              isMain={img.mainImage === f.publicUrl}
              inExtra={img.extraUrls.has(f.publicUrl)}
              busy={busyPath === f.path}
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
  isMain,
  inExtra,
  busy,
  onAction,
}: {
  file: StageFile;
  isMain: boolean;
  inExtra: boolean;
  busy: boolean;
  onAction: (action: 'set_main' | 'add_extra' | 'archive', file: StageFile) => void;
}) {
  const isImage = IMAGE_EXT.test(file.name);
  return (
    <div className="w-28 shrink-0">
      <a
        href={file.publicUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={`${file.name} · ${strings.openFile}`}
        className="group block"
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
      <p className="mt-1 text-[10px] leading-tight text-gray-600 truncate">{file.name}</p>
      <p className="text-[10px] text-gray-400">{formatSize(file.size)}</p>

      {/* Actions — reversible only (no Naver PUT) */}
      <div className="mt-1 flex items-center gap-1">
        <button
          type="button"
          disabled={busy || isMain}
          onClick={() => onAction('set_main', file)}
          title={strings.action.setMain}
          className="flex-1 inline-flex items-center justify-center rounded border border-gray-200 py-1 text-gray-500 hover:text-pink-600 hover:border-pink-300 transition disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
        </button>
        <button
          type="button"
          disabled={busy || inExtra}
          onClick={() => onAction('add_extra', file)}
          title={strings.action.addExtra}
          className="flex-1 inline-flex items-center justify-center rounded border border-gray-200 py-1 text-gray-500 hover:text-pink-600 hover:border-pink-300 transition disabled:opacity-40"
        >
          <Plus className="w-3 h-3" />
        </button>
        <button
          type="button"
          disabled={busy || isMain}
          onClick={() => onAction('archive', file)}
          title={strings.action.archive}
          className="flex-1 inline-flex items-center justify-center rounded border border-gray-200 py-1 text-gray-500 hover:text-amber-600 hover:border-amber-300 transition disabled:opacity-40"
        >
          <Archive className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
