'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, Loader2 } from 'lucide-react';
import ImageUploader from '@/components/products/ImageUploader';
import OptionManager, { ProductOption } from '@/components/products/OptionManager';

export default function ProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    supplierPrice: '',
    salePrice: '',
    shippingCost: '',
    description: '',
    status: 'DRAFT',

    // 이미지 (신규)
    mainImage: '',
    images: [] as string[],

    // 옵션 (신규)
    hasOptions: false,
    options: [] as ProductOption[],

    // 네이버 SEO 필드 (27개 - 기존 유지)
    naver_title: '',
    naver_keywords: '',
    naver_description: '',
    naver_brand: '',
    naver_manufacturer: '',
    naver_origin: '국내',
    naver_material: '',
    naver_color: '',
    naver_size: '',
    naver_weight: '',
    naver_care_instructions: '',
    naver_warranty: '',
    naver_certification: '',
    naver_tax_type: '과세',
    naver_gift_wrapping: false,
    naver_as_info: '',
    naver_delivery_info: '',
    naver_exchange_info: '',
    naver_refund_info: '',
    naver_min_order: '1',
    naver_max_order: '999',
    naver_adult_only: false,
    naver_parallel_import: false,
    naver_custom_option_1: '',
    naver_custom_option_2: '',
    naver_custom_option_3: '',
    naver_meta_tags: '',
  });

  const [seoScore, setSeoScore] = useState(0);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}`);
      const data = await res.json();

      if (data.success) {
        const product = data.product;
        setFormData({
          name: product.name || '',
          category: product.category || '',
          supplierPrice: product.supplierPrice?.toString() || '',
          salePrice: product.salePrice?.toString() || '',
          shippingCost: product.shippingCost?.toString() || '',
          description: product.description || '',
          status: product.status || 'DRAFT',

          // 이미지 (신규)
          mainImage: product.mainImage || '',
          images: product.images || [],

          // 옵션 (신규)
          hasOptions: product.hasOptions || false,
          options: product.options || [],

          // 네이버 SEO (기존)
          naver_title: product.naver_title || '',
          naver_keywords: product.naver_keywords || '',
          naver_description: product.naver_description || '',
          naver_brand: product.naver_brand || '',
          naver_manufacturer: product.naver_manufacturer || '',
          naver_origin: product.naver_origin || '국내',
          naver_material: product.naver_material || '',
          naver_color: product.naver_color || '',
          naver_size: product.naver_size || '',
          naver_weight: product.naver_weight || '',
          naver_care_instructions: product.naver_care_instructions || '',
          naver_warranty: product.naver_warranty || '',
          naver_certification: product.naver_certification || '',
          naver_tax_type: product.naver_tax_type || '과세',
          naver_gift_wrapping: product.naver_gift_wrapping || false,
          naver_as_info: product.naver_as_info || '',
          naver_delivery_info: product.naver_delivery_info || '',
          naver_exchange_info: product.naver_exchange_info || '',
          naver_refund_info: product.naver_refund_info || '',
          naver_min_order: product.naver_min_order || '1',
          naver_max_order: product.naver_max_order || '999',
          naver_adult_only: product.naver_adult_only || false,
          naver_parallel_import: product.naver_parallel_import || false,
          naver_custom_option_1: product.naver_custom_option_1 || '',
          naver_custom_option_2: product.naver_custom_option_2 || '',
          naver_custom_option_3: product.naver_custom_option_3 || '',
          naver_meta_tags: product.naver_meta_tags || '',
        });
        calculateSeoScore();
      } else {
        alert('상품을 찾을 수 없습니다');
        router.push('/products');
      }
    } catch (error) {
      console.error('상품 조회 실패:', error);
      alert('상품 조회 실패');
      router.push('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    calculateSeoScore();
  };

  // 이미지 변경 (신규)
  const handleImagesChange = (images: string[]) => {
    setFormData(prev => ({
      ...prev,
      images,
      mainImage: images[0] || '',
    }));
  };

  // 옵션 변경 (신규)
  const handleOptionsChange = (options: ProductOption[]) => {
    setFormData(prev => ({
      ...prev,
      options,
      hasOptions: options.length > 0,
    }));
  };

  const calculateSeoScore = () => {
    let score = 0;
    if (formData.naver_title && formData.naver_title.length >= 10) score += 20;
    if (formData.naver_keywords && formData.naver_keywords.split(',').length >= 3) score += 20;
    if (formData.naver_description && formData.naver_description.length >= 50) score += 20;
    if (formData.naver_brand) score += 10;
    if (formData.naver_origin) score += 10;
    if (formData.naver_material) score += 10;
    if (formData.naver_care_instructions) score += 10;
    setSeoScore(score);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // 유효성 검사
    if (!formData.name.trim()) {
      alert('상품명을 입력하세요');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        alert('✅ 상품이 수정되었습니다!');
        router.push('/products');
      } else {
        alert(data.error || '상품 수정 실패');
      }
    } catch (error) {
      console.error('상품 수정 오류:', error);
      alert('서버 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  // 삭제 (신규)
  const handleDelete = async () => {
    if (!confirm('정말 이 상품을 삭제하시겠습니까?\n삭제된 상품은 복구할 수 없습니다.')) {
      return;
    }

    try {
      setDeleting(true);

      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        alert('✅ 상품이 삭제되었습니다');
        router.push('/products');
      } else {
        alert(data.error || '상품 삭제 실패');
      }
    } catch (error) {
      console.error('상품 삭제 오류:', error);
      alert('상품 삭제 중 오류가 발생했습니다');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/products" className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">상품 수정</h1>
            <p className="text-sm text-gray-500 mt-1">상품 정보와 네이버 SEO를 수정하세요</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2 disabled:opacity-50"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                삭제 중...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                삭제
              </>
            )}
          </button>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? '저장 중...' : '변경사항 저장'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 메인 폼 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 기본 정보 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📦 기본 정보</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상품명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="">선택하세요</option>
                    <option value="flower">꽃다발</option>
                    <option value="bouquet">부케</option>
                    <option value="basket">바구니</option>
                    <option value="plant">화분</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상태
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="DRAFT">초안</option>
                    <option value="ACTIVE">판매중</option>
                    <option value="SOLD_OUT">품절</option>
                    <option value="HIDDEN">숨김</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    도매가
                  </label>
                  <input
                    type="number"
                    name="supplierPrice"
                    value={formData.supplierPrice}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    판매가
                  </label>
                  <input
                    type="number"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    배송비
                  </label>
                  <input
                    type="number"
                    name="shippingCost"
                    value={formData.shippingCost}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상품 설명
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>
          </div>

          {/* 이미지 업로드 (신규) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📸 상품 이미지</h2>
            <ImageUploader
              images={formData.images}
              onChange={handleImagesChange}
            />
          </div>

          {/* 옵션 관리 (신규) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <OptionManager
              options={formData.options}
              onChange={handleOptionsChange}
            />
          </div>

          {/* 네이버 SEO (기존) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🔍 네이버 쇼핑 SEO</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  네이버 제목 (10-50자 권장)
                </label>
                <input
                  type="text"
                  name="naver_title"
                  value={formData.naver_title}
                  onChange={handleChange}
                  maxLength={50}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.naver_title.length}/50자
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  네이버 키워드 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  name="naver_keywords"
                  value={formData.naver_keywords}
                  onChange={handleChange}
                  placeholder="장미,꽃다발,생일선물"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  네이버 설명 (50-200자 권장)
                </label>
                <textarea
                  name="naver_description"
                  value={formData.naver_description}
                  onChange={handleChange}
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.naver_description.length}/200자
                </p>
              </div>

              {/* 추가 네이버 필드들 (기존 유지) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    브랜드
                  </label>
                  <input
                    type="text"
                    name="naver_brand"
                    value={formData.naver_brand}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    제조사
                  </label>
                  <input
                    type="text"
                    name="naver_manufacturer"
                    value={formData.naver_manufacturer}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    원산지
                  </label>
                  <select
                    name="naver_origin"
                    value={formData.naver_origin}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="국내">국내</option>
                    <option value="수입">수입</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    색상
                  </label>
                  <input
                    type="text"
                    name="naver_color"
                    value={formData.naver_color}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    크기
                  </label>
                  <input
                    type="text"
                    name="naver_size"
                    value={formData.naver_size}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEO 점수 사이드바 (기존) */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg shadow-sm border-2 border-pink-200 p-6 sticky top-20">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🎯 SEO 점수</h3>

            <div className="relative w-32 h-32 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="url(#gradient)"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(seoScore / 100) * 351.86} 351.86`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{seoScore}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">제목 최적화</span>
                <span className={formData.naver_title.length >= 10 ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                  {formData.naver_title.length >= 10 ? '✓' : '○'} 20점
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">키워드 설정</span>
                <span className={formData.naver_keywords.split(',').filter(k => k.trim()).length >= 3 ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                  {formData.naver_keywords.split(',').filter(k => k.trim()).length >= 3 ? '✓' : '○'} 20점
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">설명 작성</span>
                <span className={formData.naver_description.length >= 50 ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                  {formData.naver_description.length >= 50 ? '✓' : '○'} 20점
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">브랜드/원산지</span>
                <span className={formData.naver_brand || formData.naver_origin ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                  {formData.naver_brand || formData.naver_origin ? '✓' : '○'} 20점
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">관리 방법</span>
                <span className={formData.naver_care_instructions ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                  {formData.naver_care_instructions ? '✓' : '○'} 10점
                </span>
              </div>
            </div>

            <div className="mt-6 p-3 bg-white rounded-lg border border-pink-200">
              <p className="text-xs text-gray-600">
                💡 <strong>SEO 개선 팁</strong>
              </p>
              <ul className="mt-2 space-y-1 text-xs text-gray-600">
                <li>• 제목: 주요 키워드 포함 (10자 이상)</li>
                <li>• 키워드: 3개 이상 설정</li>
                <li>• 설명: 50자 이상 작성</li>
                <li>• 이미지: 고해상도 사용</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
