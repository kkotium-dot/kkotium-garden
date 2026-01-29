'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplierPrice: number;
  salePrice: number;
  margin: number;
  mainImage?: string;
  status: string;
  description?: string;
  hasOptions: boolean;
  optionName?: string;
  optionValues?: string;
  // Naver SEO 필드 27개
  naver_title?: string;
  naver_keywords?: string;
  seo_description?: string;
  naverCategoryCode?: string;
  originCode?: string;
  taxType?: string;
  minorPurchaseAge?: number;
  certifications?: string;
  imageUrls?: string;
  detailAttributes?: string;
  naverOptions?: string;
  shippingTemplate?: string;
  bundleAvailable?: boolean;
  installMonths?: string;
  plusProductType?: string;
  purchaseReview?: string;
  naverSearchKeywords?: string;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`);
      const data = await response.json();
      if (data.success) {
        setProduct(data.product);
        setImagePreview(data.product.mainImage || null);
      }
    } catch (error) {
      console.error('상품 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof Product, value: any) => {
    if (!product) return;
    const updated = { ...product, [field]: value };

    // 마진 자동 계산
    if (field === 'supplierPrice' || field === 'salePrice') {
      const supplier = field === 'supplierPrice' ? value : product.supplierPrice;
      const sale = field === 'salePrice' ? value : product.salePrice;
      updated.margin = sale > 0 ? Math.round(((sale - supplier) / sale * 100) * 10) / 10 : 0;
    }

    setProduct(updated);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB를 초과할 수 없습니다.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        updateField('mainImage', data.url);
        setImagePreview(URL.createObjectURL(file));
        alert('이미지 업로드 완료!');
      } else {
        alert('업로드 실패: ' + data.error);
      }
    } catch (error) {
      alert('업로드 중 오류 발생');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!product) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ 모든 변경사항 저장 완료! (이미지+옵션+Naver SEO)');
        router.push('/products/sourced');
      } else {
        alert('❌ 저장 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (error) {
      alert('❌ 네트워크 오류');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        alert('🗑️ 삭제 완료');
        router.push('/products/sourced');
      }
    } catch (error) {
      alert('❌ 삭제 실패');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!product) {
    return <div className="p-8 text-center">상품을 찾을 수 없습니다</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
              상품 완전 편집
            </h1>
            <p className="text-xl text-gray-600 font-mono">{product.sku}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all disabled:opacity-50"
            >
              {saving ? '저장 중...' : '💾 저장'}
            </button>
            <button
              onClick={handleDelete}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all"
            >
              🗑️ 삭제
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-12">
          {/* 좌측: 이미지 업로드 */}
          <div>
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                🖼️ 이미지 업로드
              </h3>

              {/* 이미지 미리보기 */}
              <div className="relative h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden mb-6 border-4 border-dashed border-dashed-gray-300 hover:border-pink-300 transition-all cursor-pointer group">
                {imagePreview ? (
                  <>
                    <Image
                      src={imagePreview}
                      alt="상품 이미지"
                      fill
                      className="object-contain p-8 group-hover:scale-105 transition-transform duration-300"
                    />
                    <button
                      onClick={() => {setImagePreview(null); updateField('mainImage', '');}}
                      className="absolute top-3 right-3 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-500 group-hover:text-gray-700 transition-all">
                    <div className="w-24 h-24 bg-gray-200 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-pink-100 transition-all">
                      📷
                    </div>
                    <p className="font-semibold mb-2">이미지 업로드</p>
                    <p className="text-sm opacity-75">PNG, JPG (최대 5MB)</p>
                  </div>
                )}
              </div>

              {/* 파일 업로드 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-4 px-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    업로드 중...
                  </>
                ) : (
                  '📁 파일 선택'
                )}
              </button>

              {/* 이미지 URL 직접 입력 */}
              <div className="mt-6 pt-6 border-t">
                <label className="block text-sm font-bold mb-3 text-gray-700">또는 URL 직접 입력</label>
                <input
                  type="url"
                  value={product.mainImage || ''}
                  onChange={(e) => {
                    updateField('mainImage', e.target.value);
                    setImagePreview(e.target.value);
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-3 focus:ring-pink-200 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* 우측: 기본정보 */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <h3 className="text-2xl font-bold mb-8">기본 정보</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-3 text-gray-700">상품명 *</label>
                  <input
                    type="text"
                    value={product.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full px-4 py-4 border border-gray-300 rounded-2xl focus:ring-3 focus:ring-pink-200 shadow-sm text-lg"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold mb-3 text-gray-700">도매가</label>
                    <input
                      type="number"
                      value={product.supplierPrice}
                      onChange={(e) => updateField('supplierPrice', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-3 focus:ring-yellow-200 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-3 text-gray-700">판매가</label>
                    <input
                      type="number"
                      value={product.salePrice}
                      onChange={(e) => updateField('salePrice', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-3 focus:ring-green-200 shadow-sm"
                    />
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-3xl border-2 border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-emerald-800">실시간 마진율</span>
                    <span className="text-3xl font-black bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl">
                      {product.margin}%
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-3 text-gray-700">카테고리</label>
                  <input
                    type="text"
                    value={product.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    className="w-full px-4 py-4 border border-gray-300 rounded-2xl focus:ring-3 focus:ring-purple-200 shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* 옵션 설정 */}
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <label className="text-xl font-bold text-gray-900 flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={product.hasOptions || false}
                    onChange={(e) => updateField('hasOptions', e.target.checked)}
                    className="w-6 h-6 text-pink-500 rounded-lg focus:ring-pink-500"
                  />
                  옵션 상품 설정
                </label>
              </div>

              {product.hasOptions && (
                <div className="space-y-4 p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-blue-800">옵션명</label>
                    <input
                      type="text"
                      value={product.optionName || ''}
                      onChange={(e) => updateField('optionName', e.target.value)}
                      placeholder="사이즈"
                      className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-200 bg-blue-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-blue-800">옵션값</label>
                    <textarea
                      value={product.optionValues || ''}
                      onChange={(e) => updateField('optionValues', e.target.value)}
                      placeholder="S,M,L,XL (콤마로 구분)"
                      rows={3}
                      className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-200 bg-blue-50 resize-vertical"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Naver SEO 섹션 */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-3xl shadow-2xl p-12 border-4 border-purple-200 mb-12">
          <h2 className="text-3xl font-black mb-12 text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🎯 Naver SEO 완전 최적화 (검색 1위 노출)
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 검색 제목 */}
            <div>
              <label className="block text-lg font-bold mb-4 text-purple-800">🔍 검색 제목 (60자)</label>
              <input
                type="text"
                value={product.naver_title || ''}
                onChange={(e) => updateField('naver_title', e.target.value)}
                maxLength={60}
                className="w-full px-6 py-5 text-lg border-2 border-purple-300 rounded-2xl focus:ring-4 focus:ring-purple-200 focus:border-purple-400 bg-white/50 shadow-xl transition-all"
                placeholder="NASA 인증 몬스테라! 공기정화 화분 1위"
              />
              <p className="text-sm text-purple-600 mt-2 font-mono">{(product.naver_title || '').length}/60</p>
            </div>

            {/* 키워드 */}
            <div>
              <label className="block text-lg font-bold mb-4 text-purple-800">🏷️ 키워드</label>
              <input
                type="text"
                value={product.naver_keywords || ''}
                onChange={(e) => updateField('naver_keywords', e.target.value)}
                className="w-full px-6 py-5 text-lg border-2 border-purple-300 rounded-2xl focus:ring-4 focus:ring-purple-200 focus:border-purple-400 bg-white/50 shadow-xl"
                placeholder="몬스테라,공기정화,실내식물,인테리어,화분"
              />
            </div>

            {/* 카테고리 코드 */}
            <div>
              <label className="block text-lg font-bold mb-4 text-purple-800">📂 Naver 카테고리</label>
              <input
                type="text"
                value={product.naverCategoryCode || ''}
                onChange={(e) => updateField('naverCategoryCode', e.target.value)}
                className="w-full px-6 py-5 text-lg border-2 border-purple-300 rounded-2xl focus:ring-4 focus:ring-purple-200 focus:border-purple-400 bg-white/50 shadow-xl font-mono"
                placeholder="5000135000 (화훼)"
              />
            </div>
          </div>

          <div className="mt-12 pt-12 border-t-4 border-purple-200">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-lg font-bold mb-4 text-purple-800">📝 SEO 설명</label>
                <textarea
                  value={product.seo_description || ''}
                  onChange={(e) => updateField('seo_description', e.target.value)}
                  rows={4}
                  className="w-full px-6 py-5 text-lg border-2 border-purple-300 rounded-2xl focus:ring-4 focus:ring-purple-200 focus:border-purple-400 bg-white/50 shadow-xl resize-vertical"
                  placeholder="NASA 인증 공기정화 효과 1위! 실내 인테리어에 최적화된 몬스테라 화분입니다."
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-lg font-bold mb-2 text-purple-800">🌍 원산지</label>
                  <input
                    type="text"
                    value={product.originCode || ''}
                    onChange={(e) => updateField('originCode', e.target.value)}
                    className="w-full px-4 py-3 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-200 bg-purple-50"
                    placeholder="KR"
                  />
                </div>
                <div>
                  <label className="block text-lg font-bold mb-2 text-purple-800">💰 과세 유형</label>
                  <select
                    value={product.taxType || ''}
                    onChange={(e) => updateField('taxType', e.target.value)}
                    className="w-full px-4 py-3 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-200 bg-purple-50"
                  >
                    <option value="">선택</option>
                    <option value="과세">과세</option>
                    <option value="면세">면세</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-lg font-bold mb-2 text-purple-800">🔞 미성년자 구매</label>
                  <input
                    type="number"
                    value={product.minorPurchaseAge || ''}
                    onChange={(e) => updateField('minorPurchaseAge', parseInt(e.target.value) || undefined)}
                    className="w-full px-4 py-3 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-200 bg-purple-50"
                    placeholder="19"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-lg font-bold text-purple-800">
                    <input
                      type="checkbox"
                      checked={product.bundleAvailable || false}
                      onChange={(e) => updateField('bundleAvailable', e.target.checked)}
                      className="w-5 h-5 text-pink-500 rounded"
                    />
                    상품묶음 판매
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 상태 선택 */}
        <div className="max-w-md mx-auto mb-12">
          <label className="block text-xl font-bold text-center mb-6 text-gray-800">
            상품 상태
          </label>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'DRAFT', label: '📝 등록대기', color: 'from-yellow-400 to-yellow-500' },
              { value: 'NAVER_REGISTERED', label: '✅ 네이버완료', color: 'from-emerald-400 to-emerald-500' },
              { value: 'SOLD_OUT', label: '🔴 품절', color: 'from-red-400 to-red-500' }
            ].map(({ value, label, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => updateField('status', value)}
                className={`p-6 rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all ${value === product.status ? `bg-gradient-to-r ${color} text-white shadow-${color.split('-')[1]}-500/50` : 'bg-white border-2 border-gray-200 hover:border-gray-400'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-4 text-center">
            현재: <span className="font-bold text-lg">{product.status}</span>
          </p>
        </div>

        {/* 최종 액션 버튼 */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex-1 max-w-md px-12 py-6 bg-gradient-to-r from-pink-500 via-purple-500 to-emerald-500 hover:from-pink-600 hover:via-purple-600 hover:to-emerald-600 text-white font-black text-xl rounded-3xl shadow-2xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-4 mx-auto"
          >
            {saving || uploading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                저장 중...
              </>
            ) : (
              '🚀 모든 설정 저장 (이미지+옵션+Naver SEO)'
            )}
          </button>
          <Link
            href="/products/sourced"
            className="flex-1 max-w-md px-12 py-6 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white font-black text-xl rounded-3xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center mx-auto text-center"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}