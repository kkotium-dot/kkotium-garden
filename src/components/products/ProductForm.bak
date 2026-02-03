'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProductForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [supplierPrice, setSupplierPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [shippingCost, setShippingCost] = useState('3000');
  const [category, setCategory] = useState('');
  const [keywords, setKeywords] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState('100');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          supplierPrice: parseFloat(supplierPrice),
          salePrice: parseFloat(salePrice),
          shippingCost: parseFloat(shippingCost),
          category: category || undefined,
          keywords: keywords ? keywords.split(',').map(k => k.trim()) : [],
          description: description || undefined,
          stock: parseInt(stock),
        }),
      });

      if (response.ok) {
        alert('상품이 등록되었습니다!');
        router.push('/products');
      } else {
        const error = await response.json();
        alert(`오류: ${error.error || '상품 등록 실패'}`);
      }
    } catch (err) {
      console.error(err);
      alert('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const calculateMargin = () => {
    const supplier = parseFloat(supplierPrice) || 0;
    const sale = parseFloat(salePrice) || 0;
    const shipping = parseFloat(shippingCost) || 0;
    
    if (supplier === 0 || sale === 0) return 0;
    
    const cost = supplier + shipping;
    const profit = sale - cost - (sale * 0.058); // 네이버 수수료 5.8%
    return ((profit / sale) * 100).toFixed(1);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">📝 상품 등록</h2>
        <p className="text-sm text-gray-600">새로운 상품을 등록하세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 상품명 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            상품명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 꽃무늬 원피스"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            required
          />
        </div>

        {/* 가격 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              도매가 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={supplierPrice}
              onChange={(e) => setSupplierPrice(e.target.value)}
              placeholder="15000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              판매가 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="25000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              배송비
            </label>
            <input
              type="number"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              placeholder="3000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 마진 표시 */}
        {supplierPrice && salePrice && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">예상 마진율</span>
              <span className="text-2xl font-bold text-blue-600">
                {calculateMargin()}%
              </span>
            </div>
          </div>
        )}

        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            카테고리
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="예: 의류 > 원피스"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>

        {/* 키워드 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            검색 키워드
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="예: 원피스, 꽃무늬, 여름원피스 (쉼표로 구분)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">쉼표(,)로 구분하여 입력하세요</p>
        </div>

        {/* 재고 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            재고 수량
          </label>
          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="100"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>

        {/* 상품 설명 */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            상품 설명
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="상품에 대한 자세한 설명을 입력하세요"
            rows={5}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 px-6 py-3 font-semibold rounded-lg transition-colors ${
              loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-pink-500 text-white hover:bg-pink-600'
            }`}
          >
            {loading ? '등록 중...' : '상품 등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
