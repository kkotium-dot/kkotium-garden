'use client';

import { useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  url: string;
  supplier?: string;
}

export default function CrawlPage() {
  const [keyword, setKeyword] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const handleSearch = async () => {
    if (!keyword.trim()) {
      alert('키워드를 입력하세요');
      return;
    }

    setLoading(true);
    setProducts([]);
    setSelected(new Set());

    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword })
      });

      if (!response.ok) {
        throw new Error('크롤링 실패');
      }

      const data = await response.json();
      
      if (data.success && data.products) {
        setProducts(data.products);
        console.log('✅ 크롤링 성공:', data.products.length, '개');
      } else {
        throw new Error(data.message || '상품을 찾을 수 없습니다');
      }

    } catch (error) {
      console.error('❌ 크롤링 오류:', error);
      alert('크롤링 실패: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleSelectAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map(p => p.id)));
    }
  };

  const handleSave = async () => {
    if (selected.size === 0) {
      alert('저장할 상품을 선택하세요');
      return;
    }

    setSaving(true);

    try {
      const selectedProducts = products.filter(p => selected.has(p.id));
      
      for (const product of selectedProducts) {
        const retailPrice = Math.round(product.price * 2.5); // 기본 마진 150%
        
        const { error } = await supabase
          .from('sourced_products')
          .insert([{
            external_id: product.id,
            name: product.name,
            wholesale_price: product.price,
            retail_price: retailPrice,
            image_url: product.image,
            source: 'domemae',
            source_url: product.url,
            status: 'pending',
            brand: product.supplier || '도매매'
          }]);

        if (error) {
          console.error('❌ 저장 실패:', product.name, error);
        }
      }

      alert(`✅ ${selected.size}개 상품이 저장되었습니다!`);
      
      // 초기화
      setProducts([]);
      setSelected(new Set());
      setKeyword('');

    } catch (error) {
      console.error('❌ 저장 오류:', error);
      alert('저장 실패: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
    }
  };

  const calculateMargin = (price: number) => {
    const retail = Math.round(price * 2.5);
    return Math.round(((retail - price) / price) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            키워드 검색 크롤러
          </h1>
          <p className="text-gray-600">
            도매매에서 키워드로 빠르게 상품을 수집하세요 (최대 20개)
          </p>
        </div>

        {/* 검색창 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="검색 키워드 입력 (예: 여성 원피스)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
            >
              {loading ? '🔄 검색중...' : '🔍 검색'}
            </button>
          </div>

          {products.length > 0 && (
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                총 <span className="font-bold text-blue-600">{products.length}</span>개 상품 발견
              </p>
              <div className="flex gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-semibold transition"
                >
                  {selected.size === products.length ? '전체 해제' : '전체 선택'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={selected.size === 0 || saving}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition"
                >
                  {saving ? '저장중...' : `💾 선택 저장 (${selected.size})`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">🔄</div>
            <p className="text-xl text-gray-600">도매매에서 상품을 검색하는 중...</p>
            <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</p>
          </div>
        )}

        {/* 상품 목록 */}
        {!loading && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const isSelected = selected.has(product.id);
              const margin = calculateMargin(product.price);
              const retailPrice = Math.round(product.price * 2.5);

              return (
                <div
                  key={product.id}
                  onClick={() => toggleSelect(product.id)}
                  className={`bg-white rounded-xl shadow-lg p-4 cursor-pointer transition-all ${
                    isSelected ? 'ring-4 ring-blue-500 scale-105' : 'hover:shadow-xl'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-5 h-5 text-blue-600 cursor-pointer"
                    />
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      margin >= 100 ? 'bg-green-100 text-green-800' :
                      margin >= 60 ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      마진 {margin}%
                    </span>
                  </div>

                  <div className="relative h-48 mb-3 bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
                      }}
                    />
                  </div>

                  <h3 className="font-bold text-sm mb-2 line-clamp-2 h-10">
                    {product.name}
                  </h3>

                  {product.supplier && (
                    <p className="text-xs text-gray-500 mb-2">{product.supplier}</p>
                  )}

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">도매가</span>
                      <span className="font-semibold">{product.price.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">판매가</span>
                      <span className="font-bold text-blue-600">{retailPrice.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">순이익</span>
                      <span className="font-bold text-green-600">
                        {(retailPrice - product.price).toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 block text-center text-xs text-blue-600 hover:underline"
                  >
                    원본 보기 →
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && products.length === 0 && keyword && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-xl text-gray-600">상품을 찾을 수 없습니다</p>
            <p className="text-sm text-gray-500 mt-2">다른 키워드로 검색해보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
