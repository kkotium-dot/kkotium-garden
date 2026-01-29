'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleUpload = async () => {
    if (!file) {
      alert('파일을 선택하세요');
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
        alert(`${data.count}개 상품 업로드 완료!`);
        router.push('/products');
      } else {
        alert(data.error || '업로드 실패');
      }
    } catch (error) {
      alert('업로드 중 오류 발생');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Excel 대량 업로드</h1>

      <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
        {/* Excel 템플릿 안내 */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-lg mb-3">📋 Excel 양식</h3>
          <p className="text-sm text-gray-700 mb-4">
            다음 컬럼명을 사용하세요:
          </p>
          <div className="bg-white p-4 rounded border font-mono text-sm">
            상품명 | 카테고리 | 도매가 | 판매가 | 마진율 | 이미지
          </div>
        </div>

        {/* 파일 업로드 */}
        <div className="border-2 border-dashed border-pink-300 rounded-lg p-12 text-center">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-xl font-bold mb-2">
              {file ? file.name : 'Excel 파일 선택'}
            </p>
            <p className="text-gray-600">
              .xlsx 또는 .xls 파일을 드래그하거나 클릭하세요
            </p>
          </label>
        </div>

        {/* 업로드 버튼 */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full px-6 py-4 bg-pink-500 text-white text-lg font-bold rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? '⏳ 업로드 중...' : '🚀 업로드 시작'}
        </button>
      </div>
    </div>
  );
}
