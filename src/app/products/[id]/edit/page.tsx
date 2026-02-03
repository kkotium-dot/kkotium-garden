'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, Loader2, CheckCircle, AlertCircle, Upload, X } from 'lucide-react';
import { calculateNaverSeoScore } from '@/lib/seo';

export default function ProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const prevScoreRef = useRef(0); // 🔥 100점 감지 수정

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    // 기본 정보
    name: '',
    category: '',
    supplierId: '',
    supplierPrice: '',
    salePrice: '',
    shippingFee: '3000',
    description: '',
    keywords: [] as string[],

    // 이미지 필드
    mainImage: '',
    images: [] as string[],

    // 네이버 SEO 필드 (27개)
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
  const [showSuccess, setShowSuccess] = useState(false);

  // 기존 상품 데이터 불러오기
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${productId}`);
        const data = await res.json();

        if (data.success && data.product) {
          const product = data.product;

          setFormData({
            name: product.name || '',
            category: product.category || '',
            supplierId: product.supplier?.code || product.supplier?.id || '',
            supplierPrice: product.supplierPrice?.toString() || '',
            salePrice: product.salePrice?.toString() || '',
            shippingFee: product.shippingFee?.toString() || '3000',
            description: product.description || '',
            keywords: product.keywords || [],

            mainImage: product.mainImage || '',
            images: product.images || [],

            // 네이버 SEO 필드
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

          console.log('✅ 상품 조회 성공:', product.name);
        } else {
          alert('상품을 찾을 수 없습니다');
          router.push('/products/sourced');
        }
      } catch (error) {
        console.error('상품 조회 실패:', error);
        alert('상품 정보를 불러올 수 없습니다');
        router.push('/products/sourced');
      } finally {
        setFetching(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, router]);

  // SEO 점수 계산 및 100점 달성 감지
  useEffect(() => {
    const score = calculateNaverSeoScore(formData);
    const prevScore = prevScoreRef.current;
    setSeoScore(score);

    // 100점 달성 시 축하 메시지
    if (score === 100 && prevScore < 100) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }

    prevScoreRef.current = score;

    console.log('📊 네이버 SEO 점수:', {
      title: formData.naver_title?.length || 0,
      keywords: formData.naver_keywords?.split(',').filter(k => k.trim()).length || 0,
      description: formData.naver_description?.length || 0,
      score: score
    });
  }, [formData]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploadData = new FormData();
    Array.from(files).forEach(file => {
      uploadData.append('images', file);
    });

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      });

      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...data.urls],
          mainImage: prev.mainImage || data.urls[0],
        }));
        console.log('✅ 이미지 업로드 성공:', data.urls);
      }
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다');
    }
  };

  // 이미지 삭제
  const handleRemoveImage = (url: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img !== url),
      mainImage: prev.mainImage === url ? (prev.images[0] || '') : prev.mainImage,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          keywords: Array.isArray(formData.keywords) 
            ? formData.keywords 
            : formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        }),
      });

      const data = await res.json();

      if (data.success) {
        console.log('✅ 상품 수정 완료:', data.product.name);
        alert('✅ 상품이 수정되었습니다!');

        // 🔥 수정: 소싱 목록으로 리다이렉트
        router.push('/products/sourced');
        router.refresh();
      } else {
        alert(data.error || '상품 수정 실패');
      }
    } catch (error) {
      console.error('수정 실패:', error);
      alert('서버 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 로딩 중
  if (fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-gray-600">상품 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 100점 달성 축하 메시지 */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-bounce z-50">
          <CheckCircle className="w-6 h-6" />
          <span className="font-bold">🎉 SEO 100점 달성! 완벽합니다!</span>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/products/sourced" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">상품 수정</h1>
            <p className="text-sm text-gray-500 mt-1">상품 정보를 수정하고 네이버 SEO를 최적화하세요</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* 🔥 수정: Link 컴포넌트 사용 */}
          <Link 
            href={`/products/${productId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            미리보기
          </Link>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? '수정 중...' : '수정 저장'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 메인 폼 (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 이미지 업로드 섹션 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📷 상품 이미지</h2>

            {/* 메인 이미지 */}
            {formData.mainImage && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">메인 이미지</p>
                <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={formData.mainImage} 
                    alt="메인 이미지" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* 이미지 갤러리 */}
            {formData.images.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">추가 이미지 ({formData.images.length})</p>
                <div className="grid grid-cols-4 gap-2">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                      <img src={img} alt={`이미지 ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleRemoveImage(img)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {img === formData.mainImage && (
                        <div className="absolute bottom-0 left-0 right-0 bg-pink-500 text-white text-xs py-1 text-center">
                          메인
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 이미지 업로드 버튼 */}
            <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-500 cursor-pointer transition">
              <Upload className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-600">이미지 추가</span>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="예: 프리미엄 장미 꽃다발"
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
                    공급처 ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="supplierId"
                    value={formData.supplierId}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                    placeholder="SUP001"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    도매가 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="supplierPrice"
                    value={formData.supplierPrice}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                    placeholder="30000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    판매가 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                    placeholder="50000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    배송비
                  </label>
                  <input
                    type="number"
                    name="shippingFee"
                    value={formData.shippingFee}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                    placeholder="3000"
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
                  placeholder="상품에 대한 자세한 설명을 입력하세요"
                />
              </div>
            </div>
          </div>

          {/* 네이버 쇼핑 SEO */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">🔍 네이버 쇼핑 SEO</h2>
              <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                seoScore >= 90 ? 'bg-purple-100 text-purple-700' :
                seoScore >= 80 ? 'bg-green-100 text-green-700' :
                seoScore >= 70 ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                현재 {seoScore}점
              </span>
            </div>

            <div className="space-y-4">
              {/* 네이버 제목 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  네이버 제목 (10-50자 권장) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="naver_title"
                  value={formData.naver_title}
                  onChange={handleChange}
                  maxLength={50}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  placeholder="꽃틔움 프리미엄 장미 꽃다발 - 생일선물 기념일선물"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    {formData.naver_title.length}/50자
                  </p>
                  {formData.naver_title.length >= 10 ? (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> +20점
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">
                      10자 이상 입력 시 +20점
                    </span>
                  )}
                </div>
              </div>

              {/* 네이버 키워드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  네이버 키워드 (쉼표로 구분, 3-10개 권장) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="naver_keywords"
                  value={formData.naver_keywords}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  placeholder="장미꽃다발, 생일선물, 프리미엄꽃, 고급, 특별한날, 기념일선물"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    {formData.naver_keywords.split(',').filter(k => k.trim()).length}개 키워드
                  </p>
                  {formData.naver_keywords.split(',').filter(k => k.trim()).length >= 3 ? (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> +20점
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">
                      3개 이상 입력 시 +20점
                    </span>
                  )}
                </div>
              </div>

              {/* 네이버 설명 */}
              <div className={`border-2 rounded-lg p-4 ${
                formData.naver_description.length >= 50 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-yellow-300 bg-yellow-50'
              }`}>
                <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  {formData.naver_description.length >= 50 ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  )}
                  네이버 설명 (50-200자 권장) 
                  <span className="text-red-500">*</span>
                  {formData.naver_description.length < 50 && (
                    <span className="text-xs font-normal text-yellow-700 ml-2">
                      ⚠️ 50자 이상 입력하면 +20점!
                    </span>
                  )}
                </label>
                <textarea
                  name="naver_description"
                  value={formData.naver_description}
                  onChange={handleChange}
                  rows={4}
                  maxLength={200}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  placeholder="신선한 장미로 제작된 프리미엄 꽃다발입니다. 생일, 기념일, 감사 선물로 완벽합니다. 당일 배송 가능하며, 고급 포장으로 제공됩니다."
                />
                <div className="flex items-center justify-between mt-2">
                  <p className={`text-sm font-medium ${
                    formData.naver_description.length >= 50 
                      ? 'text-green-600' 
                      : formData.naver_description.length >= 30
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {formData.naver_description.length}/200자
                    {formData.naver_description.length < 50 && (
                      <span className="ml-2 text-xs">
                        (앞으로 {50 - formData.naver_description.length}자 더 입력)
                      </span>
                    )}
                  </p>
                  {formData.naver_description.length >= 50 ? (
                    <span className="text-sm text-green-600 flex items-center gap-1 font-bold">
                      <CheckCircle className="w-4 h-4" /> +20점 획득!
                    </span>
                  ) : (
                    <span className="text-sm text-yellow-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> 50자 이상 필요
                    </span>
                  )}
                </div>
              </div>

              {/* 나머지 필드들 */}
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
                    placeholder="꽃틔움"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    원산지
                  </label>
                  <input
                    type="text"
                    name="naver_origin"
                    value={formData.naver_origin}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                    placeholder="국내"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    재질/소재
                  </label>
                  <input
                    type="text"
                    name="naver_material"
                    value={formData.naver_material}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                    placeholder="프리미엄 생화"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    관리 방법
                  </label>
                  <input
                    type="text"
                    name="naver_care_instructions"
                    value={formData.naver_care_instructions}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                    placeholder="물을 매일 갈아주세요"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 사이드바 SEO 점수 (1/3) */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg shadow-sm border border-pink-200 p-6 sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              🎯 SEO 최적화 점수
            </h3>

            {/* 점수 원형 차트 */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-40 h-40">
                <svg className="transform -rotate-90 w-40 h-40">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke={seoScore >= 90 ? '#9333ea' : seoScore >= 80 ? '#22c55e' : seoScore >= 70 ? '#3b82f6' : '#eab308'}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${(seoScore / 100) * 439.6} 439.6`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-4xl font-bold ${
                    seoScore >= 90 ? 'text-purple-600' :
                    seoScore >= 80 ? 'text-green-600' :
                    seoScore >= 70 ? 'text-blue-600' :
                    'text-yellow-600'
                  }`}>
                    {seoScore}
                  </span>
                </div>
              </div>
            </div>

            {/* 점수 항목 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">제목 최적화</span>
                <span className={`text-sm font-bold ${formData.naver_title.length >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                  {formData.naver_title.length >= 10 ? '✓ 20점' : '○ 20점'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">키워드 설정</span>
                <span className={`text-sm font-bold ${formData.naver_keywords.split(',').filter(k => k.trim()).length >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
                  {formData.naver_keywords.split(',').filter(k => k.trim()).length >= 3 ? '✓ 20점' : '○ 20점'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">설명 작성</span>
                <span className={`text-sm font-bold ${formData.naver_description.length >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
                  {formData.naver_description.length >= 50 ? '✓ 20점' : '○ 20점'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">브랜드 입력</span>
                <span className={`text-sm font-bold ${formData.naver_brand ? 'text-green-600' : 'text-gray-400'}`}>
                  {formData.naver_brand ? '✓ 10점' : '○ 10점'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">상세 정보</span>
                <span className={`text-sm font-bold ${
                  (formData.naver_origin ? 10 : 0) + 
                  (formData.naver_material ? 10 : 0) + 
                  (formData.naver_care_instructions ? 10 : 0) > 0 
                  ? 'text-green-600' 
                  : 'text-gray-400'
                }`}>
                  ✓ {(formData.naver_origin ? 10 : 0) + (formData.naver_material ? 10 : 0) + (formData.naver_care_instructions ? 10 : 0)}점
                </span>
              </div>
            </div>

            {/* SEO 가이드 */}
            <div className="mt-6 pt-6 border-t border-pink-200">
              <h4 className="text-sm font-bold text-gray-900 mb-3">📝 SEO 개선 팁</h4>
              <ul className="space-y-2 text-xs text-gray-600">
                <li>• 제목에 주요 키워드를 포함하세요 (10-50자)</li>
                <li>• 키워드는 3-10개를 쉼표로 구분하세요</li>
                <li>• 설명은 50자 이상 작성하세요 ⭐</li>
                <li>• 브랜드/원산지 정보를 입력하세요</li>
                <li>• 상세 정보를 충실히 작성하세요</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
