'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, FolderOpen, UploadCloud, Loader2 } from 'lucide-react';
import strings from '@/lib/i18n/upload-strings.ko.json';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleUpload = async () => {
    if (!file) {
      alert(strings.alertNoFile);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/excel', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        alert(strings.alertSuccess.replace('{n}', String(data.count)));
        router.push('/products');
      } else {
        alert(data.error || strings.alertFail);
      }
    } catch (error) {
      alert(strings.alertError);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">{strings.title}</h1>

      <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
        {/* Excel template guide */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <ClipboardList size={20} /> {strings.templateHeading}
          </h3>
          <p className="text-sm text-gray-700 mb-4">
            {strings.templateGuide}
          </p>
          <div className="bg-white p-4 rounded border font-mono text-sm">
            {strings.templateColumns}
          </div>
        </div>

        {/* File picker */}
        <div className="border-2 border-dashed border-pink-300 rounded-lg p-12 text-center">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex justify-center mb-4">
              <FolderOpen size={56} className="text-pink-400" />
            </div>
            <p className="text-xl font-bold mb-2">
              {file ? file.name : strings.selectPrompt}
            </p>
            <p className="text-gray-600">
              {strings.selectHint}
            </p>
          </label>
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full px-6 py-4 bg-pink-500 text-white text-lg font-bold rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 size={20} className="animate-spin" /> {strings.uploading}
            </>
          ) : (
            <>
              <UploadCloud size={20} /> {strings.uploadStart}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
