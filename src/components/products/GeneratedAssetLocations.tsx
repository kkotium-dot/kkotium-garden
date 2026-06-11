'use client';

// GeneratedAssetLocations
// ============================================================================
// Read-only "생성 에셋 위치" panel for the product detail page. Fetches
// /api/products/{id}/assets and renders, per pipeline stage, the canonical
// Supabase Storage path (`product-assets/{id}/{stage}/`), the file count (or a
// "미적용" badge when empty), and a compact list/thumbnails of the assets.
//
// Storage convention authority: docs/playbook/IMAGE_SEO_PIPELINE_PLAYBOOK.md §2.
// Korean strings isolated to GeneratedAssetLocations.strings.ko.json (#35).
// Lucide icons only — no emoji in JSX (rule 3-1).
// ============================================================================

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import strings from './GeneratedAssetLocations.strings.ko.json';

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
  productId?: string;
  bucket?: string;
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

function CopyPathButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — silently ignore.
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      title={copied ? strings.copied : strings.copyPath}
      className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 transition"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

function FileThumb({ file }: { file: StageFile }) {
  const isImage = IMAGE_EXT.test(file.name);
  return (
    <a
      href={file.publicUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`${file.name} · ${strings.openFile}`}
      className="group block w-20 shrink-0"
    >
      <div className="aspect-square bg-gray-100 rounded-md border border-gray-200 overflow-hidden flex items-center justify-center group-hover:border-pink-300 transition">
        {isImage ? (
          // Storage public URL; matches the page's existing <img> usage.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.publicUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <FileQuestion className="w-6 h-6 text-gray-400" />
        )}
      </div>
      <p className="mt-1 text-[10px] leading-tight text-gray-600 truncate">{file.name}</p>
      <p className="text-[10px] text-gray-400">{formatSize(file.size)}</p>
    </a>
  );
}

function StageRow({ group }: { group: StageGroup }) {
  const applied = group.count > 0;
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
          <div className="mt-1 flex items-center gap-1.5">
            <code className="text-[11px] text-gray-500 bg-gray-50 rounded px-1.5 py-0.5 truncate">
              {group.storagePath}
            </code>
            <CopyPathButton path={group.storagePath} />
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
            <FileThumb key={f.path} file={f} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GeneratedAssetLocations({ productId }: { productId: string }) {
  const [data, setData] = useState<AssetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`/api/products/${productId}/assets`)
      .then((res) => res.json())
      .then((json: AssetsResponse) => {
        if (!alive) return;
        if (json.success) {
          setData(json);
        } else {
          setError(json.error || strings.error);
        }
      })
      .catch(() => {
        if (alive) setError(strings.error);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [productId]);

  const total = data?.total ?? 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <FolderOpen className="w-5 h-5 text-pink-500" />
          {strings.title}
        </h2>
        {!loading && !error && (
          <span className="text-xs text-gray-500">
            {strings.totalPrefix} {total}
            {strings.countUnit}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-4">{strings.subtitle}</p>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          {strings.loading}
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="break-all">{error}</span>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {total === 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
              <Inbox className="w-4 h-4" />
              {strings.emptyAll}
            </div>
          )}
          <div className="space-y-2">
            {data.stages?.map((g) => (
              <StageRow key={g.stage} group={g} />
            ))}
          </div>
          {data.bucket && (
            <p className="mt-3 flex items-center gap-1 text-[10px] text-gray-300">
              <ExternalLink className="w-3 h-3" />
              {data.bucket} · {productId}
            </p>
          )}
        </>
      )}
    </div>
  );
}
