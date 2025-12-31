'use client';

import { useState, useEffect } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  status: string;
  registeredAt: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const response = await fetch('/api/products');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const json = await response.json();
      
      if (json.success && Array.isArray(json.data)) {
        setProducts(json.data);
      } else {
        throw new Error('응답 형식이 올바르지 않습니다');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-700 mb-2">로딩 중...</div>
          <div className="text-sm text-gray-500">데이터를 불러오고 있습니다</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">에러 발생</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchProducts();
              }}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                🌸 꽃티움 가든
              </h1>
              <p className="text-gray-600">네이버 스마트스토어 상품 관리 시스템</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{products.length}</div>
              <div className="text-sm text-gray-500">등록 상품</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
            <h2 className="text-2xl font-bold text-white">상품 목록</h2>
          </div>
          
          <div className="p-6">
            {products.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-xl text-gray-500">등록된 상품이 없습니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-gray-200">
                      <th className="text-left p-4 font-semibold text-gray-700">ID</th>
                      <th className="text-left p-4 font-semibold text-gray-700">상품명</th>
                      <th className="text-right p-4 font-semibold text-gray-700">가격</th>
                      <th className="text-center p-4 font-semibold text-gray-700">재고</th>
                      <th className="text-center p-4 font-semibold text-gray-700">상태</th>
                      <th className="text-center p-4 font-semibold text-gray-700">등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr 
                        key={product.id} 
                        className="border-b border-gray-100 hover:bg-blue-50 transition-colors duration-150"
                      >
                        <td className="p-4 text-gray-600">{product.id}</td>
                        <td className="p-4">
                          <span className="font-medium text-gray-900">{product.name}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-semibold text-gray-900">
                            {product.price.toLocaleString()}원
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-gray-700">{product.stock}개</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            {product.status}
                          </span>
                        </td>
                        <td className="p-4 text-center text-gray-600 text-sm">
                          {product.registeredAt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}