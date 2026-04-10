'use client';
// ImageUploadDropzone — drag-and-drop image uploader for product registration
// Uploads directly to Supabase Storage → returns public URL immediately
// No preview rendering (by design) — URL is set in field for Excel export
// Supports: main image (1), additional images (up to 9), detail image (1)

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader, Link } from 'lucide-react';

export type ImageSlotType = 'main' | 'additional' | 'detail';

interface UploadResult {
  url: string;
  filename: string;
  size: number;
  ok: boolean;
  error?: string;
}

interface Props {
  type: ImageSlotType;
  label: string;
  hint?: string;
  value: string;             // current URL value (comma-separated for additional)
  onChange: (url: string) => void;
  maxFiles?: number;         // default: 1 for main/detail, 9 for additional
  required?: boolean;
}

const TYPE_META: Record<ImageSlotType, { accept: string; desc: string; color: string }> = {
  main:       { accept: 'image/jpeg,image/jpg,image/png,image/webp', desc: '대표이미지 1장', color: 'border-rose-300 hover:border-rose-400 hover:bg-rose-50' },
  additional: { accept: 'image/jpeg,image/jpg,image/png,image/webp', desc: '추가이미지 최대 9장', color: 'border-blue-300 hover:border-blue-400 hover:bg-blue-50' },
  detail:     { accept: 'image/jpeg,image/jpg,image/png,image/webp,image/gif', desc: '상세이미지 1장', color: 'border-purple-300 hover:border-purple-400 hover:bg-purple-50' },
};

async function uploadToSupabase(file: File, type: ImageSlotType): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('isMain', type === 'main' ? 'true' : 'false');

  try {
    const res  = await fetch('/api/upload/image', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success && data.url) {
      return { url: data.url, filename: file.name, size: file.size, ok: true };
    }
    return { url: '', filename: file.name, size: file.size, ok: false, error: data.error ?? '업로드 실패' };
  } catch (e) {
    return { url: '', filename: file.name, size: file.size, ok: false, error: String(e) };
  }
}

function formatBytes(b: number) {
  if (b < 1024)        return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / 1024 / 1024).toFixed(1)}MB`;
}

export default function ImageUploadDropzone({
  type, label, hint, value, onChange, maxFiles, required,
}: Props) {
  const max        = maxFiles ?? (type === 'additional' ? 9 : 1);
  const meta       = TYPE_META[type];
  const fileRef    = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults]   = useState<UploadResult[]>([]);
  const [urlInput, setUrlInput] = useState('');  // manual URL paste fallback

  // current URLs as array
  const currentUrls = value
    ? value.split(',').map(u => u.trim()).filter(Boolean)
    : [];

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const toUpload = Array.from(files).slice(0, max - currentUrls.length);
    if (toUpload.length === 0) return;

    setUploading(true);
    const newResults: UploadResult[] = [];

    for (const file of toUpload) {
      const result = await uploadToSupabase(file, type);
      newResults.push(result);
    }

    setResults(prev => [...prev, ...newResults]);

    const newUrls = newResults.filter(r => r.ok).map(r => r.url);
    if (newUrls.length > 0) {
      const merged = type === 'additional'
        ? [...currentUrls, ...newUrls].join(', ')
        : newUrls[0];
      onChange(merged);
    }
    setUploading(false);
  }, [currentUrls, max, onChange, type]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files);

  const removeUrl = (idx: number) => {
    const next = currentUrls.filter((_, i) => i !== idx);
    onChange(next.join(', '));
    setResults(prev => prev.filter((_, i) => i !== idx));
  };

  const applyManualUrl = () => {
    if (!urlInput.trim()) return;
    if (type === 'additional') {
      const merged = [...currentUrls, urlInput.trim()].join(', ');
      onChange(merged);
    } else {
      onChange(urlInput.trim());
    }
    setUrlInput('');
  };

  const canAddMore = currentUrls.length < max;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        {required && <span className="text-red-500 text-xs">*</span>}
        {hint && <span className="text-xs text-gray-400">— {hint}</span>}
        {currentUrls.length > 0 && (
          <span className="ml-auto text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
            {currentUrls.length}/{max}개 등록
          </span>
        )}
      </div>

      {/* Drop zone — only show when can add more */}
      {canAddMore && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${
            dragging ? 'border-green-400 bg-green-50 scale-[1.01]' :
            uploading ? 'border-blue-300 bg-blue-50' :
            meta.color
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept={meta.accept}
            multiple={type === 'additional'}
            className="hidden"
            onChange={onFileInput}
          />
          <div className="flex flex-col items-center gap-1.5 py-2">
            {uploading ? (
              <>
                <Loader size={20} className="text-blue-500 animate-spin" />
                <p className="text-xs text-blue-600 font-semibold">Supabase 업로드 중...</p>
              </>
            ) : (
              <>
                <Upload size={18} className="text-gray-400" />
                <p className="text-xs text-gray-600 font-semibold">
                  파일을 드래그하거나 클릭해서 선택
                </p>
                <p className="text-xs text-gray-400">{meta.desc} · JPG, PNG, WebP · 최대 10MB</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Registered URL list */}
      {currentUrls.length > 0 && (
        <div className="space-y-1">
          {currentUrls.map((url, idx) => {
            const res = results[idx];
            return (
              <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
                <CheckCircle size={13} className="text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 font-semibold truncate">
                    {res?.filename ?? `이미지 ${idx + 1}`}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{url}</p>
                </div>
                {res?.size && <span className="text-xs text-gray-400 shrink-0">{formatBytes(res.size)}</span>}
                <button onClick={() => removeUrl(idx)} className="shrink-0 text-gray-300 hover:text-red-500 transition">
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload errors */}
      {results.some(r => !r.ok) && (
        <div className="space-y-1">
          {results.filter(r => !r.ok).map((r, idx) => (
            <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle size={12} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-600">{r.filename}: {r.error}</p>
            </div>
          ))}
        </div>
      )}

      {/* Manual URL input fallback */}
      <div className="flex items-center gap-1.5">
        <Link size={11} className="text-gray-300 shrink-0" />
        <input
          className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyManualUrl()}
          placeholder="URL 직접 입력 후 Enter"
        />
        {urlInput && (
          <button
            onClick={applyManualUrl}
            className="text-xs px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-semibold transition"
          >
            적용
          </button>
        )}
      </div>
    </div>
  );
}
