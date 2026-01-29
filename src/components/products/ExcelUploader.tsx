'use client';

import { useState } from 'react';
import { formatNumber } from '@/lib/utils/format';

export default function ExcelUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count: number; message: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('파일을 선택해주세요');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/products/bulk', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          count: data.count,
          message: data.message,
        });
        setFile(null);
      } else {
        setResult({
          success: false,
          count: 0,
          message: data.error,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        count: 0,
        message: '업로드 중 오류가 발생했습니다',
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `상품명,도매가,판매가,배송비,카테고리,키워드,재고,상품설명
꽃무늬 원피스,15000,25000,3000,여성의류,원피스 꽃무늬 여름,100,예쁜 꽃무늬 원피스입니다
화분 세트,10000,20000,3000,홈데코,화분 플랜테리어 인테리어,50,감각적인 화분 세트`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '상품등록_템플릿.csv';
    link.click();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">📊 엑셀 일괄 등록</h3>

      {/* 템플릿 다운로드 */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium text-blue-900 mb-1">엑셀 템플릿 다운로드</p>
            <p className="text-sm text-blue-700">
              템플릿 파일을 다운로드하여 상품 정보를 입력하세요
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            다운로드
          </button>
        </div>
      </div>

      {/* 파일 선택 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          엑셀 파일 선택
        </label>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
          disabled={uploading}
        />
        {file && (
          <p className="mt-2 text-sm text-gray-600">
            선택된 파일: {file.name}
          </p>
        )}
      </div>

      {/* 업로드 버튼 */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full px-6 py-3 bg-pink-500 text-white font-semibold rounded-lg hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? '업로드 중...' : '업로드'}
      </button>

      {/* 결과 */}
      {result && (
        <div className={`mt-4 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
            {result.success ? '✅ 업로드 성공' : '⚠️ 업로드 실패'}
          </p>
          <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.message}
          </p>
          {result.success && result.count > 0 && (
            <p className="text-sm mt-2 text-green-700">
              {formatNumber(result.count)}개의 상품이 등록되었습니다
            </p>
          )}
        </div>
      )}

      {/* 안내 사항 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">📋 필수 입력 항목</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 상품명 (필수)</li>
          <li>• 도매가 (필수)</li>
          <li>• 판매가 (필수)</li>
          <li>• 배송비 (선택, 기본값: 3000원)</li>
          <li>• 카테고리 (선택)</li>
          <li>• 키워드 (선택, 쉼표로 구분)</li>
          <li>• 재고 (선택, 기본값: 100개)</li>
          <li>• 상품설명 (선택)</li>
        </ul>
      </div>
    </div>
  );
}
