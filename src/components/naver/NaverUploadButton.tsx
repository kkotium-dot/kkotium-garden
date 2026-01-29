'use client';

import { useState } from 'react';

interface NaverUploadButtonProps {
  product: any;
  onSuccess?: () => void;
}

export default function NaverUploadButton({ product, onSuccess }: NaverUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleUpload = async () => {
    setUploading(true);

    try {
      const res = await fetch('/api/naver/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ 네이버 쇼핑에 등록되었습니다!\n상품 ID: ${data.naverProductId}`);
        onSuccess?.();
      } else {
        alert(`❌ 등록 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('네이버 등록 실패:', error);
      alert('네이버 등록 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
        disabled={uploading}
      >
        💚 네이버 쇼핑 등록
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">💚 네이버 쇼핑 등록</h3>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                다음 정보로 네이버 쇼핑에 상품을 등록합니다:
              </p>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">상품명:</span>
                  <span className="font-medium">{product.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">판매가:</span>
                  <span className="font-medium">{product.salePrice?.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">네이버 제목:</span>
                  <span className="font-medium text-xs">{product.naver_title || '미설정'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">키워드:</span>
                  <span className="font-medium text-xs">{product.naver_keywords || '미설정'}</span>
                </div>
              </div>

              {(!product.naver_title || !product.naver_keywords) && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  ⚠️ Naver SEO 정보가 미설정되어 있습니다. 수정 페이지에서 설정을 권장합니다.
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={uploading}
              >
                취소
              </button>
              <button
                onClick={handleUpload}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                disabled={uploading}
              >
                {uploading ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
