'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import ProductSeoForm from './seo/ProductSeoForm';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 네이버 스토어 최적화 상품 등록 폼 (프로덕션 완성본)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ProductFormProps {
  productId?: string;
  initialData?: any;
}

export default function ProductForm({ productId = 'temp', initialData }: ProductFormProps = {}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE: 기본 정보 (⭐ initialData 적용!)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    sku: initialData?.sku || '',
    category: initialData?.category || '',
    salePrice: initialData?.salePrice?.toString() || '',
    supplierPrice: initialData?.supplierPrice?.toString() || '',
    stock: initialData?.stock?.toString() || '0',
    brand: initialData?.brand || '',
    manufacturer: initialData?.manufacturer || '',
    origin: initialData?.origin || '0200037',
    shippingFee: initialData?.shippingFee?.toString() || '3500',
    detailDescription: initialData?.detailDescription || '',
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE: 이미지 (⭐ initialData 적용!)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [newImageUrl, setNewImageUrl] = useState('');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE: SEO (⭐ initialData 적용!)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [seoData, setSeoData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    keywords: initialData?.keywords || '',
    naver_title: initialData?.naver_title || '',
    naver_description: initialData?.naver_description || '',
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⭐ initialData 변경 시 상태 업데이트
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        sku: initialData.sku || '',
        category: initialData.category || '',
        salePrice: initialData.salePrice?.toString() || '',
        supplierPrice: initialData.supplierPrice?.toString() || '',
        stock: initialData.stock?.toString() || '0',
        brand: initialData.brand || '',
        manufacturer: initialData.manufacturer || '',
        origin: initialData.origin || '0200037',
        shippingFee: initialData.shippingFee?.toString() || '3500',
        detailDescription: initialData.detailDescription || '',
      });

      if (initialData.images && Array.isArray(initialData.images)) {
        setImages(initialData.images);
      }

      setSeoData({
        title: initialData.title || '',
        description: initialData.description || '',
        keywords: initialData.keywords || '',
        naver_title: initialData.naver_title || '',
        naver_description: initialData.naver_description || '',
      });
    }
  }, [initialData]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SEO 점수 자동 계산 (실시간)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const calculateSeoScore = () => {
    let score = 0;

    // SEO 제목 (0~20점)
    if (seoData.title.length >= 10 && seoData.title.length <= 60) {
      score += 20;
    } else if (seoData.title.length > 0) {
      score += 10;
    }

    // SEO 설명 (0~25점)
    if (seoData.description.length >= 50 && seoData.description.length <= 160) {
      score += 25;
    } else if (seoData.description.length > 0) {
      score += 12;
    }

    // 키워드 (0~15점)
    const keywordCount = seoData.keywords.split(',').filter(k => k.trim()).length;
    if (keywordCount >= 3 && keywordCount <= 10) {
      score += 15;
    } else if (keywordCount > 0) {
      score += 7;
    }

    // 네이버 상품명 (0~20점)
    if (seoData.naver_title.length >= 20 && seoData.naver_title.length <= 26) {
      score += 20;
    } else if (seoData.naver_title.length >= 10 && seoData.naver_title.length <= 100) {
      score += 15;
    } else if (seoData.naver_title.length > 0) {
      score += 8;
    }

    // 네이버 설명 (0~20점)
    if (seoData.naver_description.length >= 200 && seoData.naver_description.length <= 300) {
      score += 20;
    } else if (seoData.naver_description.length >= 50 && seoData.naver_description.length <= 500) {
      score += 15;
    } else if (seoData.naver_description.length > 0) {
      score += 8;
    }

    return score;
  };

  const seoScore = calculateSeoScore();
  const seoGrade = seoScore >= 80 ? 'A' : seoScore >= 50 ? 'B' : 'C';
  const seoGradeColor = seoGrade === 'A' ? 'green' : seoGrade === 'B' ? 'yellow' : 'red';

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SEO 데이터 변경 핸들러
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleSeoChange = (updates: any) => {
    setSeoData(prev => ({ ...prev, ...updates }));
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 필수 항목 검증 (3가지만!)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const isValid = () => {
    if (!formData.name?.trim()) return false;
    if (!formData.salePrice || parseFloat(formData.salePrice) <= 0) return false;
    if (images.length === 0) return false;
    return true;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 자동 생성 기능 (신규 등록 시에만)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    // 신규 등록 시에만 SKU 자동 생성
    if (productId === 'temp' && formData.name && !formData.sku) {
      const autoSku = 'PROD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      setFormData(prev => ({ ...prev, sku: autoSku }));
    }

    // 신규 등록 시에만 네이버 상품명 자동 복사
    if (productId === 'temp' && formData.name && !seoData.naver_title) {
      setSeoData(prev => ({ ...prev, naver_title: formData.name }));
    }
  }, [formData.name, productId]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 이미지 추가/삭제
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleAddImage = () => {
    if (!newImageUrl.trim()) {
      toast.error('이미지 URL을 입력하세요');
      return;
    }

    if (images.length >= 5) {
      toast.error('이미지는 최대 5개까지 등록 가능합니다');
      return;
    }

    setImages(prev => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
    toast.success('이미지가 추가되었습니다');
  };

  const handleDeleteImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    toast.success('이미지가 삭제되었습니다');
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 상품 등록/수정 제출
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleSubmit = async () => {
    if (!isValid()) {
      toast.error('필수 항목: 상품명, 판매가, 이미지 (최소 1개)');
      return;
    }

    setIsSubmitting(true);

    try {
      const margin = formData.supplierPrice && parseFloat(formData.supplierPrice) > 0
        ? ((parseFloat(formData.salePrice) - parseFloat(formData.supplierPrice)) / parseFloat(formData.salePrice) * 100).toFixed(1)
        : 0;

      const productData = {
        name: formData.name,
        sku: formData.sku || 'PROD-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        category: formData.category || '미분류',
        salePrice: parseFloat(formData.salePrice),
        supplierPrice: parseFloat(formData.supplierPrice || '0'),
        stock: parseInt(formData.stock || '0'),
        brand: formData.brand || '',
        manufacturer: formData.manufacturer || '',
        origin: formData.origin,
        shippingFee: parseFloat(formData.shippingFee || '0'),
        margin: parseFloat(margin.toString()),
        supplierId: null,
        images,
        imageAltTexts: images.map((_, idx) => `${formData.name} ${idx + 1}`),
        mainImage: images[0] || '',
        detailDescription: formData.detailDescription || '',
        title: seoData.title || formData.name,
        description: seoData.description || '',
        keywords: seoData.keywords || '',
        naver_title: seoData.naver_title || formData.name,
        naver_description: seoData.naver_description || '',
        naver_brand: formData.brand || '',
        naver_manufacturer: formData.manufacturer || '',
        naver_origin: formData.origin,
        naver_keywords: seoData.keywords || '',
        og_image: images[0] || '',
        seo_score: seoScore,
        seo_valid: seoScore >= 50,
        status: 'draft',
      };

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(productId === 'temp' ? '📦 상품 등록 데이터:' : '✏️ 상품 수정 데이터:', productData);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // 신규 등록 vs 수정
      const url = productId === 'temp' ? '/api/products' : `/api/products/${productId}`;
      const method = productId === 'temp' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '저장에 실패했습니다.');
      }

      console.log('✅ 저장 성공:', data);
      toast.success(productId === 'temp' ? '상품이 등록되었습니다!' : '상품이 수정되었습니다!');

      // 1초 후 목록으로 이동
      setTimeout(() => {
        router.push('/products');
        router.refresh();
      }, 1000);

    } catch (error: any) {
      console.error('❌ 저장 오류:', error);
      toast.error(error.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 렌더링
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 헤더 */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">
              {productId === 'temp' ? '📦 상품 등록' : '✏️ 상품 수정'}
            </h1>
            <p className="text-gray-600 mt-2">
              공급사: <span className="text-pink-600 font-bold">꽃틔움(협력사)</span>
            </p>
          </div>

          {/* SEO 점수 */}
          <div className={`px-6 py-4 rounded-2xl border-2 ${
            seoGradeColor === 'green'
              ? 'bg-green-50 text-green-700 border-green-300'
              : seoGradeColor === 'yellow'
              ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
              : 'bg-red-50 text-red-700 border-red-300'
          }`}>
            <div className="text-center">
              <div className="text-3xl font-black">{seoGrade}등급</div>
              <div className="text-sm font-bold mt-1">SEO {seoScore}/100</div>
              <div className="text-xs mt-1">
                {seoGrade === 'A' && '우선 노출'}
                {seoGrade === 'B' && '일반 노출'}
                {seoGrade === 'C' && '개선 필요'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="bg-white rounded-2xl shadow-lg mb-6 p-2 flex gap-2">
        {[
          { id: 'basic', label: '기본 정보', icon: '📦' },
          { id: 'images', label: `이미지 (${images.length})`, icon: '🖼️' },
          { id: 'detail', label: '상세설명', icon: '📝' },
          { id: 'seo', label: 'SEO', icon: '📈' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 컨텐츠 */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
        {/* 기본 정보 */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                상품명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none"
                placeholder="예: 주방정리함 스테인리스 싱크대 서랍형 수저통"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.name.length}자 (권장: 20~26자)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  SKU {productId === 'temp' && <span className="text-green-500">✓ 자동생성</span>}
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50"
                  placeholder={productId === 'temp' ? '자동 생성됨' : 'SKU'}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">카테고리</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none"
                  placeholder="예: 주방/생활"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  판매가 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">공급가</label>
                <input
                  type="number"
                  value={formData.supplierPrice}
                  onChange={(e) => setFormData({ ...formData, supplierPrice: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none"
                  placeholder="0"
                />
                {formData.salePrice && formData.supplierPrice && (
                  <p className="text-xs text-green-600 mt-1">
                    마진율: {((parseFloat(formData.salePrice) - parseFloat(formData.supplierPrice)) / parseFloat(formData.salePrice) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">재고수량</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">브랜드</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none"
                  placeholder="예: 라이프스타일"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">제조사</label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none"
                  placeholder="예: 국내제조"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">원산지</label>
                <select
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none"
                >
                  <option value="0200037">대한민국</option>
                  <option value="0200038">중국</option>
                  <option value="0200039">일본</option>
                  <option value="0200040">미국</option>
                  <option value="0200041">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">배송비</label>
                <input
                  type="number"
                  value={formData.shippingFee}
                  onChange={(e) => setFormData({ ...formData, shippingFee: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}

        {/* 이미지 */}
        {activeTab === 'images' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                이미지 URL 추가 <span className="text-red-500">*</span> (최대 5개)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none"
                  placeholder="https://example.com/image.jpg"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddImage()}
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="px-6 py-3 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 transition-all"
                >
                  추가
                </button>
              </div>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {images.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`상품 이미지 ${index + 1}`}
                      className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                    />
                    <button
                      onClick={() => handleDeleteImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    {index === 0 && (
                      <div className="absolute top-2 left-2 bg-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        대표
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {images.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                이미지를 추가해주세요 (최소 1개 필수)
              </div>
            )}
          </div>
        )}

        {/* 상세설명 */}
        {activeTab === 'detail' && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">상세설명</label>
            <textarea
              value={formData.detailDescription}
              onChange={(e) => setFormData({ ...formData, detailDescription: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none"
              rows={15}
              placeholder="상품의 상세 설명을 입력하세요..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.detailDescription.length}자
            </p>
          </div>
        )}

        {/* SEO */}
        {activeTab === 'seo' && (
          <ProductSeoForm
            productId={productId}
            seoData={{
              title: seoData.title,
              description: seoData.description,
              keywords: seoData.keywords,
              naver_title: seoData.naver_title,
              naver_description: seoData.naver_description,
              og_image: images[0] || '',
              seo_score: seoScore,
              seo_valid: seoScore >= 50,
            }}
            productName={formData.name}
            category={formData.category}
            onSeoChange={handleSeoChange}
          />
        )}
      </div>

      {/* 제출 버튼 */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => router.push('/products')}
          className="flex-1 py-4 px-6 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid() || isSubmitting}
          className={`flex-1 py-4 px-6 rounded-xl font-bold transition-all ${
            !isValid() || isSubmitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:shadow-xl'
          }`}
        >
          {isSubmitting 
            ? '저장 중...' 
            : productId === 'temp' 
            ? '상품 등록' 
            : '상품 수정'}
        </button>
      </div>
    </div>
  );
}
