'use client';

import { useEffect, useState } from 'react';

interface Product {
  id: string;
  productName: string;
  marginRate: number;
  status: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        setError('데이터 로딩 실패');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-rose-600">꽃띠 가든 로딩 중... 🌸</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-4">
            🌸 꽃띠 가든
          </h1>
          <p className="text-xl text-gray-600">네이버 스마트스토어 자동화 관리시스템</p>
        </div>

        {/* 대시보드 요약 */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-rose-100 hover:shadow-2xl transition-all">
            <div className="text-3xl mb-2">📦</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">총 상품</h3>
            <div className="text-4xl font-black text-rose-600">{products.length}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-pink-100 hover:shadow-2xl transition-all">
            <div className="text-3xl mb-2">💰</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">평균 마진</h3>
            <div className="text-4xl font-black text-emerald-600">
              {products.length > 0 
                ? Math.round(products.reduce((a, b) => a + (b.marginRate || 0), 0) / products.length) + '%'
                : '0%'
              }
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-purple-100 hover:shadow-2xl transition-all">
            <div className="text-3xl mb-2">⚡</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">서버 상태</h3>
            <div className="text-4xl font-black text-blue-600">정상</div>
          </div>
        </div>

        {/* 본문 영역 */}
        {products.length === 0 ? (
          <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-rose-200">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-3xl font-bold text-gray-700 mb-6">첫 상품을 추가해보세요!</h2>
            <div className="flex flex-col md:flex-row justify-center gap-4">
              <button className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-10 py-4 rounded-2xl text-xl font-bold hover:shadow-lg transition-all">
                🚀 도매꾹 크롤링 시작
              </button>
              <button className="bg-white text-rose-500 border-2 border-rose-500 px-10 py-4 rounded-2xl text-xl font-bold hover:bg-rose-50 transition-all">
                📥 엑셀 일괄 등록
              </button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white p-6 rounded-3xl shadow-lg border border-rose-50 hover:border-rose-200 transition-all">
                <div className="h-40 bg-rose-50 rounded-2xl mb-4 flex items-center justify-center text-rose-200 text-4xl">🌸</div>
                <h3 className="font-bold text-xl mb-3 line-clamp-1">{product.productName}</h3>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-600 font-bold text-lg">마진 {product.marginRate}%</span>
                  <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-sm font-bold">
                    {product.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
