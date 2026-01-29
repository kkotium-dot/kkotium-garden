'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface CrawledProduct {
  name: string;
  supplierPrice: number;
  salePrice: number;
  margin: number;
  mainImage: string;
  sourceUrl: string;
  category: string;
}

export default function CrawlPage() {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<CrawledProduct[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const router = useRouter();

  const handleCrawl = async () => {
    if (!keyword.trim()) {
      alert('검색어를 입력하세요');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, maxItems: 20 }),
      });

      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
        setSelected(new Set());
      } else {
        alert(data.error || '크롤링 실패');
      }
    } catch (error) {
      alert('크롤링 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (index: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelected(newSelected);
  };

  const handleSave = async () => {
    if (selected.size === 0) {
      alert('저장할 상품을 선택하세요');
      return;
    }

    const selectedProducts = Array.from(selected).map(i => products[i]);

    try {
      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: selectedProducts }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`${data.count}개 상품 저장 완료!`);
        router.push('/products');
      } else {
        alert(data.error || '저장 실패');
      }
    } catch (error) {
      alert('저장 중 오류 발생');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🌸</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
            꽃틔움 도매매 크롤러
          </h1>
          <p className="text-xl text-gray-600">
            도매매에서 상품을 자동으로 가져와 마진을 계산합니다
          </p>
        </div>

        {/* 검색 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCrawl()}
              placeholder="검색어 입력 (예: 원피스, 파자마, 여성의류)"
              className="flex-1 px-6 py-4 border-2 border-pink-200 rounded-xl focus:border-pink-500 focus:outline-none text-lg"
            />
            <button
              onClick={handleCrawl}
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-lg font-bold rounded-xl hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '🔄 크롤링 중...' : '🚀 검색'}
            </button>
          </div>
        </div>

        {/* 결과 */}
        {products.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                검색 결과 ({products.length}개)
                {selected.size > 0 && (
                  <span className="text-pink-600 ml-3">
                    {selected.size}개 선택됨
                  </span>
                )}
              </h2>
              <button
                onClick={handleSave}
                disabled={selected.size === 0}
                className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💾 선택 상품 저장
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product, index) => (
                <div
                  key={index}
                  onClick={() => toggleSelect(index)}
                  className={`bg-white rounded-xl shadow-lg p-6 cursor-pointer transition-all ${
                    selected.has(index)
                      ? 'ring-4 ring-pink-500 scale-105'
                      : 'hover:shadow-xl'
                  }`}
                >
                  {/* 체크박스 */}
                  <div className="flex justify-between items-start mb-4">
                    <input
                      type="checkbox"
                      checked={selected.has(index)}
                      onChange={() => toggleSelect(index)}
                      className="w-5 h-5 text-pink-600"
                    />
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      product.margin >= 60 ? 'bg-green-100 text-green-800' :
                      product.margin >= 40 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      마진 {product.margin}%
                    </span>
                  </div>

                  {/* 이미지 */}
                  <div className="relative h-48 mb-4 bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={product.mainImage}
                      alt={product.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  {/* 상품명 */}
                  <h3 className="font-bold text-lg mb-3 line-clamp-2 h-14">
                    {product.name}
                  </h3>

                  {/* 가격 정보 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">도매가</span>
                      <span className="font-semibold">
                        {product.supplierPrice.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">판매가</span>
                      <span className="font-bold text-pink-600">
                        {product.salePrice.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">순이익</span>
                      <span className="font-bold text-green-600">
                        {(product.salePrice - product.supplierPrice).toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 빈 상태 */}
        {products.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl text-gray-600">
              검색어를 입력하고 크롤링을 시작하세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
