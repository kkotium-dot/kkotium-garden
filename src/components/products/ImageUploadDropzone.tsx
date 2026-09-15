'use client';
// ImageUploadDropzone — drag-and-drop image uploader for product registration
// Uploads directly to Supabase Storage → returns public URL immediately
// No preview rendering (by design) — URL is set in field for Excel export
// Supports: main image (1), additional images (up to 9), detail-page images (many)
//
// IMAGE-DROPZONE-MAIN (2026-06-29, operator request): the single-slot (대표/main)
// now keeps its dropzone visible even when filled, so the representative image can
// be drag/drop- or click-REPLACED at any time — consistent with 추가/상세. A new
// file on a filled single slot overwrites the existing URL.

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
  detail:     { accept: 'image/jpeg,image/jpg,image/png,image/webp,image/gif', desc: '상세페이지 이미지', color: 'border-purple-300 hover:border-purple-400 hover:bg-purple-50' },
};

// IMAGE-UPLOAD-TYPE-FIX (원본메모: "상세페이지 이미지 업로드가 드래그·
// 선택 둘 다 안 됨" + "에러메시지가 외계어") — 근본원인 확정: 서버
// (/api/upload/image)가 대표/추가이미지 전용 최소규격(500x500px 이상)을
// 상세페이지 이미지에도 무차별 적용해 거부하고 있었다. 상세페이지 이미지는
// 세로로 긴 컷·아이콘 등 작은 이미지가 정상적으로 많다 — 네이버도 상세
// 이미지엔 이 규격을 요구하지 않는다. 근본원인은 이 컴포넌트가 서버에
// isMain(boolean)만 보내 main과 detail/additional을 구분 못 시켰던 것 —
// 이제 정확한 type 문자열을 그대로 전달해 서버가 슬롯별로 다른 규격을
// 적용할 수 있게 한다.
async function uploadToSupabase(file: File, type: ImageSlotType): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('isMain', type === 'main' ? 'true' : 'false');
  formData.append('slotType', type);

  try {
    const res  = await fetch('/api/upload/image', { method: 'POST', body: formData });
    const data = await res.json().catch(() => null);
    if (data?.success && data.url) {
      return { url: data.url, filename: file.name, size: file.size, ok: true };
    }
    // ERROR-MESSAGE-CLARITY — 서버가 이미 사람이 읽을 수 있는 한국어
    // error 문자열을 내려주면 그대로 쓰고, 그마저 없을 때만(응답 파싱
    // 실패 등 진짜 예외 상황) 정확한 상황을 설명하는 문구로 대체한다.
    // 이전엔 catch에서 String(e)를 그대로 노출해 "TypeError: Failed to
    // fetch" 같은 개발자용 기술 메시지가 사용자에게 그대로 보였다.
    const fallback = !res.ok
      ? `업로드 서버 응답 오류 (${res.status}) — 잠시 후 다시 시도해주세요.`
      : '업로드에 실패했어요. 파일 형식이나 크기를 확인해주세요.';
    return { url: '', filename: file.name, size: file.size, ok: false, error: data?.error ?? fallback };
  } catch {
    return {
      url: '', filename: file.name, size: file.size, ok: false,
      error: '네트워크 연결을 확인해주세요 — 업로드 서버에 연결하지 못했어요.',
    };
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
  // Multi-file mode is driven by capacity, not slot type: 추가(9) and now
  // 상세페이지(다수) both accept many files when maxFiles > 1. 대표 stays single.
  const multi      = max > 1;
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
    // IMAGE-DROPZONE-MAIN: single slots (대표) REPLACE — a new file overwrites the
    // existing one even when full. Multi slots fill the remaining capacity only.
    const remaining = multi ? max - currentUrls.length : 1;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    setUploading(true);
    const newResults: UploadResult[] = [];

    for (const file of toUpload) {
      const result = await uploadToSupabase(file, type);
      newResults.push(result);
    }

    // Single slot replaces its result history; multi appends.
    setResults(prev => (multi ? [...prev, ...newResults] : newResults));

    const newUrls = newResults.filter(r => r.ok).map(r => r.url);
    if (newUrls.length > 0) {
      const merged = multi
        ? [...currentUrls, ...newUrls].join(', ')
        : newUrls[0];   // single: overwrite existing URL
      onChange(merged);
    }
    setUploading(false);
  }, [currentUrls, max, onChange, type, multi]);

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
    if (multi) {
      const merged = [...currentUrls, urlInput.trim()].join(', ');
      onChange(merged);
    } else {
      onChange(urlInput.trim());
    }
    setUrlInput('');
  };

  // IMAGE-DROPZONE-MAIN: single slot (대표) always exposes the dropzone so the
  // image can be drag/drop- or click-REPLACED at any time. Multi slots hide the
  // zone once full.
  const canAddMore = multi ? currentUrls.length < max : true;
  const isFilledSingle = !multi && currentUrls.length > 0;

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

      {/* Drop zone — single (대표) always shown for replace; multi shown until full */}
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
            multiple={multi}
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
                  {isFilledSingle ? '파일을 드래그하거나 클릭해서 교체' : '파일을 드래그하거나 클릭해서 선택'}
                </p>
                <p className="text-xs text-gray-400">
                  {isFilledSingle ? '기존 이미지 교체 · ' : ''}{meta.desc} · JPG, PNG, WebP · 최대 10MB
                </p>
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
