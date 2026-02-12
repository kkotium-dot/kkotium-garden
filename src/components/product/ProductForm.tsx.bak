'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductSeoForm from './seo/ProductSeoForm';
import { useProductSeo } from '@/hooks/useProductSeo';

export default function ProductForm() {
  const router = useRouter();
  const { seoFields, updateSeoFields, validateSeo, toFormData } = useProductSeo();

  const [activeTab, setActiveTab] = useState<'basic' | 'images' | 'seo'>('basic');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    supplierId: '',
    brand: '',
    origin: '',
    price: 0,
    salePrice: 0,
    stock: 3000,
    description: '',
    naverTitle: '',
    naverKeywords: '',
    naverDescription: '',
    manufacturer: '',
    model: '',
    size: '',
    color: '',
    careInstructions: '',
    mainImage: '',
    images: [] as string[],
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // SEO 유효성 검증
    const seoValidation = validateSeo();
    if (!seoValidation.isValid) {
      alert('SEO 필드 오류:\n' + seoValidation.errors.join('\n'));
      return;
    }

    setLoading(true);

    try {
      const productData = {
        ...formData,
        ...toFormData(), // SEO 필드 포함
      };

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        alert('✅ 상품 등록 완료! (Naver SEO 포함)');
        router.push('/products');
      } else {
        const error = await response.json();
        alert('❌ 등록 실패: ' + error.message);
      }
    } catch (error) {
      console.error(error);
      alert('서버 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">상품 등록</h1>
        <button
          onClick={() => router.push('/products')}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          ← 목록으로
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6">
        {/* 탭 네비게이션 */}
        <div className="flex space-x-4 border-b mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors $\{
              activeTab === 'basic'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📝 기본 정보
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors $\{
              activeTab === 'images'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🖼️ 이미지
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('seo')}
            className={`px-6 py-3 font-medium border-b-2 transition-colors $\{
              activeTab === 'seo'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🔍 네이버 SEO
          </button>
        </div>

        {/* 기본 정보 탭 */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* 상품명 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                상품명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="예: 프리미엄 장미 꽃다발"
                required
              />
            </div>

            {/* 카테고리 & 공급사 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">카테고리</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">선택하세요</option>
                  <option value="식물">식물</option>
                  <option value="화훼">화훼</option>
                  <option value="원예용품">원예용품</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">공급사 ID</label>
                <input
                  type="text"
                  value={formData.supplierId}
                  onChange={(e) => handleChange('supplierId', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="SUP001"
                />
              </div>
            </div>

            {/* 도매가 & 판매가 & 재고 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">도매가</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleChange('price', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">판매가</label>
                <input
                  type="number"
                  value={formData.salePrice}
                  onChange={(e) => handleChange('salePrice', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">재고</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => handleChange('stock', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>

            {/* 상품 설명 */}
            <div>
              <label className="block text-sm font-medium mb-2">상품 설명</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                rows={4}
                placeholder="상품에 대한 자세한 설명을 입력하세요"
              />
            </div>

            {/* 브랜드 & 원산지 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">브랜드</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => handleChange('brand', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="꽃티움"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">원산지</label>
                <select
                  value={formData.origin}
                  onChange={(e) => handleChange('origin', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">선택하세요</option>
                  <option value="국내">국내</option>
                  <option value="네덜란드">네덜란드</option>
                  <option value="콜롬비아">콜롬비아</option>
                  <option value="에콰도르">에콰도르</option>
                </select>
              </div>
            </div>

            {/* 제조사 & 모델 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">제조사</label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => handleChange('manufacturer', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">모델명</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* 재질/소재 & 색상 & 크기 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">재질/소재</label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) => handleChange('size', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="생화"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">색상</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="레드, 핑크"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">크기</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="중형(50cm)"
                />
              </div>
            </div>

            {/* 관리 방법 */}
            <div>
              <label className="block text-sm font-medium mb-2">관리 방법</label>
              <textarea
                value={formData.careInstructions}
                onChange={(e) => handleChange('careInstructions', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                rows={3}
                placeholder="물 갈이 주기, 보관 방법 등"
              />
            </div>
          </div>
        )}

        {/* 이미지 탭 */}
        {activeTab === 'images' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="space-y-4">
                <div className="text-gray-500">
                  <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <label className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-purple-600">
                      이미지 업로드
                    </span>
                    <input type="file" className="hidden" accept="image/*" multiple />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF (최대 10MB)</p>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p>• 메인 이미지 1장 필수</p>
              <p>• 추가 이미지 최대 10장</p>
              <p>• 권장 크기: 1000x1000px</p>
            </div>
          </div>
        )}

        {/* SEO 탭 - ProductSeoForm 통합 */}
        {activeTab === 'seo' && (
          <ProductSeoForm
            value={seoFields}
            onChange={updateSeoFields}
          />
        )}

        {/* 제출 버튼 */}
        <div className="flex justify-end space-x-4 pt-6 border-t mt-6">
          <button
            type="button"
            onClick={() => router.push('/products')}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            취소
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '등록 중...' : '✅ 상품 등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
