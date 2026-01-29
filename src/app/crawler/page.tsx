'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CrawlerPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // 마진 계산 상태
  const [supplierPrice, setSupplierPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [shippingFee, setShippingFee] = useState(3000);

  const handleCrawl = async () => {
    if (!url) {
      setError('URL을 입력해주세요');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('\n' + '='.repeat(80));
      console.log('🔍 크롤링 요청 시작');
      console.log('='.repeat(80));
      console.log('📌 URL:', url);

      const response = await fetch('/api/crawler/domemae', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      console.log('📡 응답 상태:', response.status);
      const data = await response.json();
      console.log('📦 응답 데이터:', data);

      if (data.success && data.data) {
        console.log('\n✅ 크롤링 성공!');
        console.log('  - 상품명:', data.data.name);
        console.log('  - 도매가:', data.data.supplierPrice);
        console.log('  - 이미지:', data.data.images?.length || 0, '개');
        console.log('  - 옵션:', data.data.options?.length || 0, '개');

        setResult(data.data);

        // 가격 자동 설정
        const crawledPrice = data.data.supplierPrice || 0;
        setSupplierPrice(crawledPrice);

        // 판매가 자동 계산 (30% 마진)
        if (crawledPrice > 0) {
          setSellingPrice(Math.ceil(crawledPrice * 1.3));
          console.log('  - 자동 계산된 판매가:', Math.ceil(crawledPrice * 1.3));
        } else {
          setSellingPrice(0);
          console.log('  ⚠️  도매가가 0원입니다. 수동으로 입력해주세요!');
        }

        console.log('='.repeat(80) + '\n');
      } else {
        console.error('❌ 크롤링 실패:', data.error);
        setError(data.error || '크롤링 실패');
      }
    } catch (err: any) {
      console.error('❌ 크롤링 중 오류:', err);
      setError(err.message || '크롤링 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) {
      setError('저장할 상품 데이터가 없습니다');
      return;
    }

    // Validation 강화
    if (!result.name || result.name === '상품명을 찾을 수 없습니다') {
      setError('상품명을 확인해주세요');
      return;
    }

    if (!supplierPrice || supplierPrice === 0) {
      setError('도매가를 입력해주세요 (0원은 저장할 수 없습니다)');
      return;
    }

    if (!sellingPrice || sellingPrice === 0) {
      setError('판매가를 입력해주세요 (0원은 저장할 수 없습니다)');
      return;
    }

    if (sellingPrice <= supplierPrice) {
      const confirm = window.confirm(
        `판매가(${sellingPrice.toLocaleString()}원)가 도매가(${supplierPrice.toLocaleString()}원)보다 낮거나 같습니다.\n\n그래도 저장하시겠습니까?`
      );
      if (!confirm) return;
    }

    setSaving(true);
    setError('');

    try {
      console.log('\n' + '='.repeat(80));
      console.log('💾 상품 저장 시작');
      console.log('='.repeat(80));

      const margin = supplierPrice > 0 
        ? ((sellingPrice - supplierPrice - shippingFee) / sellingPrice * 100)
        : 0;

      // ⚠️ sourceUrl 제거! (Supabase 테이블에 컬럼이 없음)
      const productData = {
        name: result.name,
        supplierPrice: parseInt(String(supplierPrice)),
        salePrice: parseInt(String(sellingPrice)),
        margin: parseFloat(margin.toFixed(2)),
        shippingFee: parseInt(String(shippingFee)),
        mainImage: result.images?.[0] || null,
        additionalImages: result.images || [],
        description: result.description || null,
        hasOptions: result.options && result.options.length > 0,
        optionValues: result.options || [],
        // sourceUrl: result.sourceUrl, // ❌ 제거됨!
        status: 'DRAFT',
        category: '원피스',
        shippingStrategy: 'free',
        supplierShippingFee: 0,
        supplierReturnFee: 0,
      };

      console.log('📦 저장할 데이터:');
      console.log('  - 상품명:', productData.name);
      console.log('  - 도매가:', productData.supplierPrice.toLocaleString() + '원');
      console.log('  - 판매가:', productData.salePrice.toLocaleString() + '원');
      console.log('  - 마진율:', productData.margin + '%');
      console.log('  - 이미지:', productData.additionalImages.length + '개');
      console.log('  - 옵션:', productData.optionValues.length + '개');

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      console.log('📡 저장 응답 상태:', response.status);
      const data = await response.json();
      console.log('📦 저장 응답 데이터:', data);

      if (data.success) {
        console.log('\n✅ 상품 저장 성공!');
        console.log('  - 상품 ID:', data.product?.id);
        console.log('  - SKU:', data.product?.sku);
        console.log('='.repeat(80) + '\n');

        alert(
          `상품이 성공적으로 저장되었습니다!\n\n` +
          `SKU: ${data.product.sku}\n` +
          `상품명: ${productData.name}\n` +
          `판매가: ${productData.salePrice.toLocaleString()}원\n` +
          `마진율: ${productData.margin}%`
        );

        // 상품 목록 페이지로 이동할지 묻기
        const goToList = confirm('상품 목록 페이지로 이동하시겠습니까?');
        if (goToList) {
          router.push('/products');
        } else {
          // 폼 초기화
          setResult(null);
          setUrl('');
          setSupplierPrice(0);
          setSellingPrice(0);
          setShippingFee(3000);
        }
      } else {
        console.error('\n❌ 저장 실패:', data.error);
        console.log('='.repeat(80) + '\n');

        let errorMessage = data.error || '저장 실패';
        if (data.details) {
          errorMessage += '\n\n상세 정보: ' + data.details;
        }
        if (data.hint) {
          errorMessage += '\n\n힌트: ' + data.hint;
        }

        setError(errorMessage);
      }
    } catch (err: any) {
      console.error('\n❌ 저장 중 오류:', err);
      console.log('='.repeat(80) + '\n');
      setError(err.message || '저장 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  const profit = sellingPrice - supplierPrice - shippingFee;
  const marginRate = sellingPrice > 0 ? (profit / sellingPrice * 100) : 0;
  const commissionFee = Math.ceil(sellingPrice * 0.058);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🛍️</span>
            <h1 className="text-3xl font-bold text-gray-900">도매매 상품 관리</h1>
          </div>
          <button
            onClick={() => router.push('/products')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            📋 상품 목록
          </button>
        </div>

        {/* 크롤러 섹션 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🔗</span>
            <h2 className="text-xl font-semibold">도매매 크롤러</h2>
          </div>

          <p className="text-gray-600 mb-4">도매매 사이트에서 상품을 불러오고 마진을 계산해보세요</p>

          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://domeme.domeggook.com/s/62007435"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleCrawl()}
            />
            <button
              onClick={handleCrawl}
              disabled={loading}
              className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {loading ? '불러오는 중...' : '불러오기'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">❌</span>
                <div className="font-semibold text-red-700">오류</div>
              </div>
              <div className="text-red-600 whitespace-pre-wrap">{error}</div>
            </div>
          )}
        </div>

        {/* 결과 섹션 */}
        {result && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📦</span>
                <h2 className="text-xl font-semibold">불러온 상품 정보</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상품명</label>
                  <p className="text-lg font-semibold text-gray-900">{result.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">도매가</label>
                  {result.supplierPrice > 0 ? (
                    <p className="text-2xl font-bold text-pink-600">
                      {result.supplierPrice.toLocaleString()}원
                    </p>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-yellow-800 font-semibold">
                        ⚠️ 도매가를 찾지 못했습니다 (0원)
                      </p>
                      <p className="text-yellow-700 text-sm mt-1">
                        아래 마진 계산기에서 직접 입력해주세요
                      </p>
                    </div>
                  )}
                </div>

                {result.images && result.images.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      상품 이미지 ({result.images.length}개)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {result.images.map((img: string, idx: number) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`상품 이미지 ${idx + 1}`}
                          className="w-full aspect-square object-cover rounded border"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {result.options && result.options.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      옵션 ({result.options.length}개)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {result.options.map((opt: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">상품 설명</label>
                    <p className="text-gray-600 text-sm">{result.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 마진 계산기 */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">💰</span>
                <h2 className="text-xl font-semibold">마진 계산기</h2>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    도매가 * {supplierPrice === 0 && <span className="text-red-600">(필수)</span>}
                  </label>
                  <input
                    type="number"
                    value={supplierPrice}
                    onChange={(e) => setSupplierPrice(Number(e.target.value))}
                    className={`w-full px-4 py-2 border rounded-lg ${
                      supplierPrice === 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="도매가 입력"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    판매가 * {sellingPrice === 0 && <span className="text-red-600">(필수)</span>}
                  </label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className={`w-full px-4 py-2 border rounded-lg ${
                      sellingPrice === 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="판매가 입력"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    배송비
                  </label>
                  <input
                    type="number"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="bg-pink-50 rounded-lg p-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">총 원가</div>
                    <div className="text-lg font-bold text-gray-900">
                      {(supplierPrice + shippingFee).toLocaleString()}원
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">수수료 (5.8%)</div>
                    <div className="text-lg font-bold text-orange-600">
                      {commissionFee.toLocaleString()}원
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">순이익</div>
                    <div className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profit.toLocaleString()}원
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">마진율</div>
                    <div className={`text-2xl font-bold ${marginRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {marginRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || supplierPrice === 0 || sellingPrice === 0}
                  className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-semibold"
                >
                  {saving ? '💾 저장 중...' : '💾 데이터베이스에 저장'}
                </button>
                <button
                  onClick={() => router.push('/products')}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  📋 목록 보기
                </button>
              </div>

              {(supplierPrice === 0 || sellingPrice === 0) && (
                <div className="mt-3 text-center text-sm text-red-600">
                  ⚠️ 도매가와 판매가를 모두 입력해야 저장할 수 있습니다
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
