'use client';

import { useState } from 'react';
import { formatKRW } from '@/lib/utils/format';
import MarginCalculator from '@/components/calculator/MarginCalculator';

interface CrawledData {
  name: string;
  supplierPrice: number;
  images: string[];
  options: string[];
  description: string;
  sourceUrl: string;
}

export default function DomemaeCrawler() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CrawledData | null>(null);
  const [error, setError] = useState('');

  const handleCrawl = async () => {
    if (!url) {
      setError('URL을 입력해주세요');
      return;
    }

    setLoading(true);
    setError('');
    setData(null);

    try {
      const response = await fetch('/api/crawler/domemae', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      setData(result.data);
    } catch (err: any) {
      setError(err.message || '크롤링 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!data) return;

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          supplierPrice: data.supplierPrice,
          salePrice: data.supplierPrice * 1.5,
          shippingCost: 3000,
          images: data.images,
          description: data.description,
          status: 'active',
          stock: 100,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('상품이 등록되었습니다!');
        setUrl('');
        setData(null);
      } else {
        alert('등록 실패: ' + result.error);
      }
    } catch (err) {
      alert('등록 중 오류가 발생했습니다');
    }
  };

  return (
    <div className="space-y-6">
      {/* URL 입력 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">🔗 도매매 크롤러</h3>
        <p className="text-sm text-gray-600 mb-4">
          도매매 사이트에서 상품을 불러오고 마진을 계산해보세요
        </p>

        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCrawl()}
            placeholder="https://domemedb.domeggook.com/..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={handleCrawl}
            disabled={loading}
            className="px-6 py-3 bg-pink-500 text-white font-semibold rounded-lg hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '불러오는 중...' : '불러오기'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">⚠️ {error}</p>
          </div>
        )}
      </div>

      {/* 크롤링 결과 */}
      {data && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-gray-900">📦 불러온 상품 정보</h3>
            <button
              onClick={handleSaveProduct}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              상품 등록
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상품명
              </label>
              <p className="text-lg font-semibold text-gray-900">{data.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                도매가
              </label>
              <p className="text-2xl font-bold text-pink-600">{formatKRW(data.supplierPrice)}</p>
            </div>

            {data.images.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상품 이미지 ({data.images.length}개)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {data.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`상품 이미지 ${idx + 1}`}
                      className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                    />
                  ))}
                </div>
              </div>
            )}

            {data.options.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  옵션 ({data.options.length}개)
                </label>
                <div className="flex flex-wrap gap-2">
                  {data.options.map((option, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {option}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상품 설명
                </label>
                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  {data.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Margin Calculator */}
      <MarginCalculator
        supplierPrice={data?.supplierPrice ?? 0}
        salePrice={(data?.supplierPrice ?? 0) * 1.5}
        shippingFee={3000}
        onSupplierPriceChange={() => {}}
        onSalePriceChange={() => {}}
      />

      {/* 사용 팁 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-bold text-blue-900 mb-3">💡 사용 팁</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">✓</span>
            <span>마진 계산기로 적정 판매가를 자동으로 계산하세요</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">✓</span>
            <span>권장 판매가 비율을 클릭하여 빠르게 적용할 수 있습니다</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">✓</span>
            <span>마진율 30% 이상을 추천합니다 (수수료, 배송비 고려)</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
