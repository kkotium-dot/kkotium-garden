'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Sparkles, Package } from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setProduct(data.product);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Package className="w-16 h-16 animate-pulse text-gray-400" /></div>;
  if (!product) return <div className="text-center py-12">상품을 찾을 수 없습니다.</div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/products" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-5 h-5" />
          <span>돌아가기</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-4">{product.name}</h1>
        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
            {product.mainImage ? (
              <img src={product.mainImage} alt={product.name} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <Package className="w-16 h-16 text-gray-400" />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">💰 가격 정보</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">도매가</span>
                <span className="font-semibold">{(product.supplierPrice || 0).toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">판매가</span>
                <span className="font-semibold">{(product.salePrice || 0).toLocaleString()}원</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-700 font-medium">마진율</span>
                <span className="text-2xl font-bold text-green-600">{(product.margin || 0).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">🤖 AI 키워드</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white text-sm rounded-lg hover:bg-pink-700">
                <Sparkles className="w-4 h-4" />
                키워드 생성
              </button>
            </div>
            <p className="text-sm text-gray-500">AI 키워드를 생성해보세요</p>
          </div>
        </div>
      </div>
    </div>
  );
}
