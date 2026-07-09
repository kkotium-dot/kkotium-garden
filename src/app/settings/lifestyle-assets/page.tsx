'use client';

// src/app/settings/lifestyle-assets/page.tsx
//
// Sprint 7-M2 Phase 2-c-2 — Lifestyle backdrop asset library admin UI.
//
// Two columns:
//   Left  — upload form (file + category + tags + moodTags + source +
//           licenseUrl)
//   Right — registered assets table (thumbnail / metadata / cooldown
//           status / delete)
//
// All API calls hit /api/lifestyle-assets.
// All user-facing copy lives in @/lib/i18n/lifestyle-assets-strings.ko.json
// per workflow principle #29 (no inline Korean in code).

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Upload, Trash2, Loader2, Check, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import strings from '@/lib/i18n/lifestyle-assets-strings.ko.json';

interface LifestyleAsset {
  id: string;
  category: string;
  tags: string[];
  moodTags: string[];
  source: string;
  licenseUrl: string | null;
  storageUrl: string;
  width: number;
  height: number;
  lastUsedAt: string | null;
  usedBySkus: string[];
  createdAt: string;
}

const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

function isInCooldown(lastUsedAt: string | null): boolean {
  if (!lastUsedAt) return false;
  return Date.now() - new Date(lastUsedAt).getTime() < COOLDOWN_MS;
}

function fmt(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export default function LifestyleAssetsPage() {
  const [assets, setAssets] = useState<LifestyleAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [tagsCsv, setTagsCsv] = useState('');
  const [moodTagsCsv, setMoodTagsCsv] = useState('');
  const [source, setSource] = useState('');
  const [licenseUrl, setLicenseUrl] = useState('');

  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/lifestyle-assets', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAssets((json.assets ?? []) as LifestyleAsset[]);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchList(); }, [fetchList]);

  const stats = {
    total: assets.length,
    cooldown: assets.filter((a) => isInCooldown(a.lastUsedAt)).length,
    ready: assets.filter((a) => !isInCooldown(a.lastUsedAt)).length,
  };

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(false);
    if (!file) { setUploadError(strings.errors.fileRequired); return; }
    if (!category.trim()) { setUploadError(strings.errors.categoryRequired); return; }
    if (!source.trim()) { setUploadError(strings.errors.sourceRequired); return; }

    setUploadBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category.trim());
      formData.append('tags', tagsCsv);
      formData.append('moodTags', moodTagsCsv);
      formData.append('source', source.trim());
      if (licenseUrl.trim()) formData.append('licenseUrl', licenseUrl.trim());

      const res = await fetch('/api/lifestyle-assets', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);

      // Success — reset form + refetch
      setFile(null);
      setCategory(''); setTagsCsv(''); setMoodTagsCsv('');
      setSource(''); setLicenseUrl('');
      setUploadSuccess(true);
      // Reset file input by id
      const fileInput = document.getElementById('lifestyle-file-input') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      void fetchList();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(strings.list.deleteConfirm)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/lifestyle-assets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      void fetchList();
    } catch (err) {
      // Surface as load error since we don't have a per-row error slot
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 1280 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>
          {strings.page.title}
        </h1>
        <p style={{ fontSize: 12, color: '#7A6873', margin: '4px 0 0' }}>
          {strings.page.subtitle}
        </p>
      </header>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatChip label={fmt(strings.stats.total, { n: stats.total })} accent="#1F2937" />
        <StatChip label={fmt(strings.stats.ready, { n: stats.ready })} accent="#16A34A" />
        <StatChip label={fmt(strings.stats.cooldown, { n: stats.cooldown })} accent="#EA580C" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: 20, alignItems: 'start' }}>
        {/* Upload form */}
        <section className="kk-card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: '0 0 14px' }}>
            {strings.upload.title}
          </h2>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <FormField label={strings.upload.fileLabel} hint={strings.upload.fileHint}>
              <input
                id="lifestyle-file-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={{ fontSize: 12, width: '100%' }}
              />
            </FormField>
            <FormField label={strings.upload.categoryLabel} hint={strings.upload.categoryHint}>
              <input className="kk-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="리빙" />
            </FormField>
            <FormField label={strings.upload.tagsLabel} hint={strings.upload.tagsHint}>
              <input className="kk-input" value={tagsCsv} onChange={(e) => setTagsCsv(e.target.value)} placeholder="30-40s, gift, premium, single" />
            </FormField>
            <FormField label={strings.upload.moodTagsLabel} hint={strings.upload.moodTagsHint}>
              <input className="kk-input" value={moodTagsCsv} onChange={(e) => setMoodTagsCsv(e.target.value)} placeholder="warm, minimal, sensory" />
            </FormField>
            <FormField label={strings.upload.sourceLabel} hint={strings.upload.sourceHint}>
              <input className="kk-input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Adobe Firefly" />
            </FormField>
            <FormField label={strings.upload.licenseUrlLabel}>
              <input className="kk-input" value={licenseUrl} onChange={(e) => setLicenseUrl(e.target.value)} placeholder="https://..." />
            </FormField>

            <button
              type="submit"
              disabled={uploadBusy}
              style={{
                marginTop: 4, padding: '10px 16px',
                background: uploadBusy ? '#aaa' : '#F63B28',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 800,
                cursor: uploadBusy ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {uploadBusy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploadBusy ? strings.upload.uploading : strings.upload.uploadButton}
            </button>
            {uploadSuccess && (
              <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={13} /> {strings.upload.uploadSuccess}
              </div>
            )}
            {uploadError && (
              <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={13} /> {strings.upload.uploadError} {uploadError}
              </div>
            )}
          </form>
        </section>

        {/* List */}
        <section>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
              {strings.list.title}
            </h2>
          </header>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', fontSize: 12, color: '#7A6873' }}>
              <Loader2 size={16} className="animate-spin" style={{ display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} />
              {strings.list.loading}
            </div>
          ) : loadError ? (
            <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, fontSize: 12, color: '#b91c1c' }}>
              {strings.list.error}: {loadError}
              <button onClick={fetchList} style={{ marginLeft: 12, padding: '4px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>
                {strings.list.retry}
              </button>
            </div>
          ) : assets.length === 0 ? (
            <div style={{ padding: 30, background: '#FFF5F7', border: '1.5px solid #FFB3CE', borderRadius: 12, fontSize: 13, color: '#7A6873', textAlign: 'center' }}>
              <ImageIcon size={26} style={{ color: '#B0A0A8', display: 'block', margin: '0 auto 8px' }} />
              {strings.list.empty}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {assets.map((a) => (
                <AssetCard key={a.id} asset={a} onDelete={() => handleDelete(a.id)} deleting={deletingId === a.id} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatChip({ label, accent }: { label: string; accent: string }) {
  return (
    <span style={{
      padding: '6px 12px', borderRadius: 999,
      background: '#fff', border: `1px solid ${accent}`,
      color: accent, fontSize: 12, fontWeight: 800,
    }}>
      {label}
    </span>
  );
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A' }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 10, color: '#7A6873' }}>{hint}</span>}
    </label>
  );
}

function AssetCard({ asset, onDelete, deleting }: { asset: LifestyleAsset; onDelete: () => void; deleting: boolean }) {
  const cooldown = isInCooldown(asset.lastUsedAt);
  return (
    <div className="kk-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#F5F0F2', borderRadius: 8, overflow: 'hidden' }}>
        <Image
          src={asset.storageUrl}
          alt=""
          fill
          sizes="280px"
          style={{ objectFit: 'cover' }}
          unoptimized
        />
      </div>
      <div style={{ fontSize: 11, color: '#525252', lineHeight: 1.5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, color: '#1A1A1A' }}>{asset.category}</span>
          <span style={{
            fontSize: 10, fontWeight: 700,
            padding: '2px 6px', borderRadius: 999,
            background: cooldown ? '#FFF7ED' : '#F0FDF4',
            color: cooldown ? '#9A3412' : '#15803D',
            border: `1px solid ${cooldown ? '#FED7AA' : '#BBF7D0'}`,
          }}>
            {cooldown ? strings.list.cooldownActive : strings.list.cooldownReady}
          </span>
        </div>
        {asset.tags.length > 0 && (
          <div><b>{strings.list.tags}:</b> {asset.tags.join(', ')}</div>
        )}
        {asset.moodTags.length > 0 && (
          <div><b>{strings.list.moodTags}:</b> {asset.moodTags.join(', ')}</div>
        )}
        <div><b>{strings.list.source}:</b> {asset.source}</div>
        <div><b>{strings.list.dimensions}:</b> {asset.width}×{asset.height}</div>
        <div>
          <b>{strings.list.lastUsed}:</b>{' '}
          {asset.lastUsedAt
            ? new Date(asset.lastUsedAt).toLocaleDateString('ko-KR')
            : strings.list.lastUsedNever}
        </div>
        <div>
          <b>{strings.list.usedBySkus}:</b>{' '}
          {asset.usedBySkus.length > 0 ? asset.usedBySkus.length : strings.list.usedBySkusNone}
        </div>
      </div>
      <button
        onClick={onDelete}
        disabled={deleting}
        style={{
          padding: '6px 10px', background: deleting ? '#aaa' : '#fef2f2',
          color: deleting ? '#fff' : '#b91c1c',
          border: `1px solid ${deleting ? '#aaa' : '#fecaca'}`,
          borderRadius: 8, fontSize: 11, fontWeight: 700,
          cursor: deleting ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
        {deleting ? strings.list.deleting : strings.list.deleteButton}
      </button>
    </div>
  );
}
