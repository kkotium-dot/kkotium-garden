// src/components/product/NaverAutoFillForm.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 네이버 자동 채움 폼 (URL 입력 → 상품 생성)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use client';

import { useState } from 'react';
import type { NaverAutoFillResponse } from '@/types/crawler';

interface Props {
  onSuccess?: (data: NaverAutoFillResponse['data']) => void;
  onError?: (error: string) => void;
}

export function NaverAutoFillForm({ onSuccess, onError }: Props) {
  const [url, setUrl] = useState('');
  const [supplierPrice, setSupplierPrice] = useState<number | ''>('');
  const [targetMargin, setTargetMargin] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NaverAutoFillResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url) {
      setError('URL을 입력하세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/crawler/naver-auto-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          supplierPrice: supplierPrice || undefined,
          targetMargin,
          options: {
            crawlImages: true,
            generateDescription: true,
            autoEvaluate: true,
          },
        }),
      });

      const data: NaverAutoFillResponse = await response.json();

      if (data.success && data.data) {
        setResult(data.data);
        onSuccess?.(data.data);
      } else {
        const errMsg = data.error || '자동 채움 실패';
        setError(errMsg);
        onError?.(errMsg);
      }
    } catch (err) {
      const errMsg = '네트워크 오류가 발생했습니다.';
      setError(errMsg);
      onError?.(errMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setSupplierPrice('');
    setTargetMargin(30);
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 입력 폼 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          🌸 네이버 자동 채움
          <span className="text-sm font-normal text-gray-500">
            (도매 URL → 상품 자동 생성)
          </span>
        </h2>

        {/* URL 입력 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            도매 사이트 URL *
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.domeme.co.kr/product/..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            disabled={loading}
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            지원: 도매매, 사방넷 등 (OpenGraph 메타태그가 있는 모든 사이트)
          </p>
        </div>

        {/* 가격 설정 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              공급가 (선택)
            </label>
            <input
              type="number"
              value={supplierPrice}
              onChange={(e) => setSupplierPrice(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="크롤링 가격 사용"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              비어있으면 크롤링 가격 사용
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              목표 마진율 (%)
            </label>
            <input
              type="number"
              value={targetMargin}
              onChange={(e) => setTargetMargin(parseInt(e.target.value) || 30)}
              min="10"
              max="70"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              추천: 30% (20-40%)
            </p>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !url}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                크롤링 중... (10-20초 소요)
              </span>
            ) : (
              '🚀 자동 채움 시작'
            )}
          </button>

          {(result || error) && (
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
            >
              초기화
            </button>
          )}
        </div>
      </form>

      {/* 오류 메시지 */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
            ❌ 오류
          </div>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 결과 표시 */}
      {result && (
        <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              ✅ 자동 채움 완료!
              {result.evaluation && (
                <span className="text-sm font-normal text-gray-600">
                  (통합 점수: {result.evaluation.combinedScore}점)
                </span>
              )}
            </h3>
            {result.readyToCreate && (
              <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                등록 가능
              </span>
            )}
          </div>

          {/* 상품 정보 미리보기 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">📦 상품 정보</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">상품명:</span>
                  <p className="font-medium">{result.product.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-600">공급가:</span>
                    <p className="font-medium">{result.product.supplierPrice.toLocaleString()}원</p>
                  </div>
                  <div>
                    <span className="text-gray-600">판매가:</span>
                    <p className="font-medium text-pink-600">{result.product.salePrice.toLocaleString()}원</p>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">마진:</span>
                  <p className="font-medium text-green-600">{result.product.margin.toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-gray-600">이미지:</span>
                  <p className="font-medium">{result.product.images.length}장</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">🎯 자동 매핑</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">카테고리:</span>
                  <p className="font-medium text-xs">{result.mapped.category.fullPath}</p>
                  <p className="text-xs text-gray-500">
                    신뢰도: {(result.mapped.category.confidence * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">원산지:</span>
                  <p className="font-medium">{result.mapped.origin.region}</p>
                </div>
                <div>
                  <span className="text-gray-600">키워드:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {result.mapped.keywords.primary.slice(0, 5).map((kw, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 이미지 미리보기 */}
          {result.product.images.length > 0 && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">🖼️ 이미지 미리보기</h4>
              <div className="grid grid-cols-5 gap-2">
                {result.product.images.slice(0, 5).map((img, idx) => (
                  <div key={idx} className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img
                      src={img}
                      alt={`상품 이미지 ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                // TODO: 상품 생성 로직
                console.log('상품 생성:', result.product);
              }}
              className="flex-1 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600"
            >
              💾 상품 등록하기
            </button>
            <button
              onClick={() => {
                // TODO: 엑셀 다운로드
                console.log('엑셀 다운로드:', result.product.naverExcelData);
              }}
              className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600"
            >
              📥 엑셀 다운로드
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
