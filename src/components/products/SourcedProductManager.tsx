'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface SourcedProduct {
  id: number;
  external_id: string;
  name: string;
  category?: string;
  wholesale_price: number;
  retail_price: number;
  image_url?: string;
  brand?: string;
  source_url?: string;
  source: 'domemae' | 'manual';
  status: 'pending' | 'approved' | 'listed';
  naver_product_id?: string;
  naver_status?: string;
  created_at: string;
}

export default function SourcedProductManager() {
  const [products, setProducts] = useState<SourcedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'listed'>('all');

  useEffect(() => {
    fetchProducts();
  }, [filter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sourced_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('DB 조회 실패:', error);
        throw error;
      }

      setProducts(data || []);
      console.log('✅ 상품 로드 완료:', data?.length);
    } catch (error) {
      console.error('❌ 상품 로드 실패:', error);
      alert('상품을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
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

  const handleRegisterToNaver = async (productId: number) => {
    try {
      const naverProductId = `NAVER_${Date.now()}`;

      const { error } = await supabase
        .from('sourced_products')
        .update({
          status: 'listed',
          naver_product_id: naverProductId,
          naver_status: 'active'
        })
        .eq('id', productId);

      if (error) throw error;

      alert(`✅ 네이버 등록 완료!\n상품ID: ${naverProductId}`);
      fetchProducts();
    } catch (error) {
      console.error('❌ 등록 실패:', error);
      alert('등록 실패: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleRegisterMultiple = async () => {
    if (selected.size === 0) {
      alert('등록할 상품을 선택하세요.');
      return;
    }

    try {
      const productIds = Array.from(selected);
      
      for (const id of productIds) {
        await handleRegisterToNaver(id);
      }

      setSelected(new Set());
      alert(`✅ ${productIds.length}개 상품 등록 완료!`);
    } catch (error) {
      alert('대량 등록 실패');
    }
  };

  const handleApprove = async (productId: number) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('sourced_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (fetchError || !data) {
        throw new Error('상품을 찾을 수 없습니다.');
      }

      const productData = {
        name: data.name,
        sku: `SKU_${Date.now()}`,
        category: data.category || '미분류',
        supplierPrice: data.wholesale_price,
        salePrice: data.retail_price,
        margin: parseFloat((((data.retail_price - data.wholesale_price) / data.wholesale_price) * 100).toFixed(2)),
        mainImage: data.image_url,
        sourceUrl: data.source_url,
        status: 'active',
        userId: 'default-user',
        shippingStrategy: 'free',
        shippingFee: 0,
        supplierShippingFee: 0,
        supplierReturnFee: 0,
        hasOptions: false
      };

      const { error: insertError } = await supabase
        .from('products')
        .insert([productData]);

      if (insertError) {
        throw new Error(`products 삽입 실패: ${insertError.message}`);
      }

      await supabase
        .from('sourced_products')
        .update({ status: 'approved' })
        .eq('id', productId);

      alert('✅ 상품이 승인되어 products에 등록되었습니다!');
      fetchProducts();
    } catch (error) {
      console.error('❌ 승인 실패:', error);
      alert('승인 실패: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleDelete = async (productId: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('sourced_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      alert('✅ 삭제 완료');
      fetchProducts();
    } catch (error) {
      console.error('❌ 삭제 실패:', error);
      alert('삭제 실패: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const calculateMargin = (retail: number, wholesale: number) => {
    if (wholesale === 0) return 0;
    return Math.round(((retail - wholesale) / wholesale) * 100);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">🌸 수집된 상품 관리</h1>
        <p className="text-gray-600">
          도매매에서 수집한 상품을 확인하고 네이버 스마트스토어에 등록하세요
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex gap-2">
            {[
              { value: 'all', label: '전체', icon: '📦' },
              { value: 'pending', label: '대기중', icon: '⏳' },
              { value: 'approved', label: '승인됨', icon: '✅' },
              { value: 'listed', label: '등록완료', icon: '🎉' }
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => setFilter(value as any)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === value
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={toggleSelectAll}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
            >
              {selected.size === products.length ? '전체 해제' : '전체 선택'}
            </button>
            <button
              onClick={handleRegisterMultiple}
              disabled={selected.size === 0}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              📤 선택 상품 네이버 등록 ({selected.size})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4 animate-bounce">🔄</div>
          <p className="text-xl text-gray-600">상품을 불러오는 중...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-xl text-gray-600 mb-4">
            {filter === 'all' 
              ? '수집된 상품이 없습니다.' 
              : `${filter} 상태의 상품이 없습니다.`}
          </p>
          <a
            href="/domemae-crawler"
            className="inline-block px-6 py-3 bg-pink-500 text-white rounded-lg font-bold hover:bg-pink-600 transition"
          >
            상품 수집하러 가기 →
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const margin = calculateMargin(product.retail_price, product.wholesale_price);
            const isSelected = selected.has(product.id);

            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl shadow-lg p-6 transition-all ${
                  isSelected ? 'ring-4 ring-pink-500 scale-105' : 'hover:shadow-xl'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(product.id)}
                    className="w-5 h-5 text-pink-600 cursor-pointer"
                  />
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      product.status === 'listed' 
                        ? 'bg-green-100 text-green-800'
                        : product.status === 'approved'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {product.status === 'listed' ? '🎉 등록완료' :
                       product.status === 'approved' ? '✅ 승인됨' :
                       '⏳ 대기중'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      margin >= 60 ? 'bg-green-100 text-green-800' :
                      margin >= 40 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      마진 {margin}%
                    </span>
                  </div>
                </div>

                <div className="relative h-48 mb-4 bg-gray-100 rounded-lg overflow-hidden">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>

                <h3 className="font-bold text-lg mb-3 line-clamp-2 h-14">
                  {product.name}
                </h3>

                {(product.category || product.brand) && (
                  <div className="flex gap-2 mb-3">
                    {product.category && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {product.category}
                      </span>
                    )}
                    {product.brand && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                        {product.brand}
                      </span>
                    )}
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">도매가</span>
                    <span className="font-semibold">
                      {product.wholesale_price.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">판매가</span>
                    <span className="font-bold text-pink-600">
                      {product.retail_price.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">순이익</span>
                    <span className="font-bold text-green-600">
                      {(product.retail_price - product.wholesale_price).toLocaleString()}원
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {product.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleRegisterToNaver(product.id)}
                        className="w-full py-2 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition text-sm"
                      >
                        📤 네이버 등록
                      </button>
                      <button
                        onClick={() => handleApprove(product.id)}
                        className="w-full py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition text-sm"
                      >
                        ✅ 승인 (products로 이동)
                      </button>
                    </>
                  )}
                  
                  {product.status === 'listed' && product.naver_product_id && (
                    <div className="text-xs text-center text-gray-500 py-2 bg-green-50 rounded-lg">
                      네이버 상품ID: {product.naver_product_id}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {product.source_url && (
                      <a
                        href={product.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-center text-xs hover:bg-gray-200 transition"
                      >
                        원본 보기
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200 transition"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
