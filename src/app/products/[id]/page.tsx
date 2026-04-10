'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Package, Loader2, CheckCircle } from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDone, setAiDone] = useState(false);

  const handleAiKeywords = async () => {
    if (!product) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/products/temp/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all', name: product.name, category: product.category }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const saveRes = await fetch(`/api/products?id=${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naver_title: data.titles?.[0] ?? '',
          naver_keywords: Array.isArray(data.keywords) ? data.keywords.join(', ') : '',
          naver_description: typeof data.description === 'string' ? data.description.slice(0, 300) : '',
        }),
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error);

      // 화면 반영
      setProduct((prev: any) => ({
        ...prev,
        naver_title: data.titles?.[0] ?? prev.naver_title,
        naver_keywords: Array.isArray(data.keywords) ? data.keywords.join(', ') : prev.naver_keywords,
        naver_description: typeof data.description === 'string' ? data.description.slice(0, 300) : prev.naver_description,
      }));
      setAiDone(true);
      setTimeout(() => setAiDone(false), 3000);
    } catch (err: any) {
      alert(err?.message || 'AI 생성 실패');
    } finally {
      setAiLoading(false);
    }
  };

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
              <h2 className="text-lg font-semibold text-gray-800">🤖 AI SEO 자동완성</h2>
              <button
                onClick={handleAiKeywords}
                disabled={aiLoading}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-bold text-white transition ${
                  aiLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-lg'
                }`}
              >
                {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" />생성중...</> : <><Sparkles className="w-4 h-4" />AI 자동완성</>}
              </button>
            </div>

            {aiDone && (
              <div className="flex items-center gap-2 mb-3 text-green-600 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                AI SEO 저장 완료!
              </div>
            )}

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">네이버 제목</p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2">
                  {product.naver_title || <span className="text-gray-400">아직 생성 전</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">키워드</p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2">
                  {product.naver_keywords || <span className="text-gray-400">아직 생성 전</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">네이버 설명</p>
                <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                  {product.naver_description || <span className="text-gray-400">아직 생성 전</span>}
                </p>
              </div>
            </div>

            <Link
              href={`/products/${product.id}/edit`}
              className="mt-4 block text-center text-xs text-pink-600 hover:text-pink-700 font-medium"
            >
              상세 편집하기 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
