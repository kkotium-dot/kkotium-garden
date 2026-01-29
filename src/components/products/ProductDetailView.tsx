'use client';

import Image from 'next/image';

interface ProductDetailViewProps {
  product: any;
}

export default function ProductDetailView({ product }: ProductDetailViewProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* 기본 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          {product.mainImage && (
            <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={product.mainImage}
                alt={product.name}
                fill
                className="object-contain"
              />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
            <p className="text-gray-600">SKU: {product.sku}</p>
            <p className="text-gray-600">카테고리: {product.category || '미분류'}</p>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">공급가</p>
                <p className="text-lg font-semibold">{product.supplierPrice?.toLocaleString()}원</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">판매가</p>
                <p className="text-lg font-semibold text-blue-600">{product.salePrice?.toLocaleString()}원</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">마진</p>
                <p className="text-lg font-semibold text-green-600">{product.margin?.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">배송비</p>
                <p className="text-lg font-semibold">{product.shippingFee?.toLocaleString()}원</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-600">상태</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm ${
              product.status === 'published' ? 'bg-green-100 text-green-800' :
              product.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {product.status === 'published' ? '판매중' :
               product.status === 'draft' ? '초안' : '준비중'}
            </span>
          </div>
        </div>
      </div>

      {/* 상세 설명 */}
      {product.description && (
        <div className="mb-8 border-t pt-6">
          <h3 className="text-xl font-bold mb-3">📝 상세 설명</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
        </div>
      )}

      {/* Naver SEO 정보 */}
      <div className="mb-8 border-t pt-6">
        <h3 className="text-xl font-bold mb-4">💜 Naver SEO 최적화</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {product.naver_title && (
            <div>
              <p className="text-sm text-gray-600 mb-1">네이버 검색 제목</p>
              <p className="font-medium">{product.naver_title}</p>
            </div>
          )}
          {product.naver_keywords && (
            <div>
              <p className="text-sm text-gray-600 mb-1">네이버 키워드</p>
              <p className="font-medium">{product.naver_keywords}</p>
            </div>
          )}
          {product.naver_description && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600 mb-1">네이버 설명</p>
              <p className="font-medium">{product.naver_description}</p>
            </div>
          )}
        </div>
      </div>

      {/* 상품 상세 정보 */}
      <div className="border-t pt-6">
        <h3 className="text-xl font-bold mb-4">📋 상품 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">브랜드</p>
            <p className="font-medium">{product.brand || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">제조사</p>
            <p className="font-medium">{product.manufacturer || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">원산지</p>
            <p className="font-medium">{product.originCode || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">과세 구분</p>
            <p className="font-medium">{product.taxType || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">미성년자 구매</p>
            <p className="font-medium">{product.minorPurchase === 'Y' ? '가능' : '불가'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">상품 상태</p>
            <p className="font-medium">{product.productStatus || '-'}</p>
          </div>
        </div>
      </div>

      {/* 배송 정보 */}
      <div className="border-t pt-6 mt-6">
        <h3 className="text-xl font-bold mb-4">🚚 배송 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">배송 방법</p>
            <p className="font-medium">{product.shippingMethod || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">배송비 유형</p>
            <p className="font-medium">{product.shippingType || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">무료배송 최소금액</p>
            <p className="font-medium">{product.freeShippingMinPrice?.toLocaleString()}원</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">반품 배송비</p>
            <p className="font-medium">{product.returnShippingFee?.toLocaleString()}원</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">교환 배송비</p>
            <p className="font-medium">{product.exchangeShippingFee?.toLocaleString()}원</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">택배사</p>
            <p className="font-medium">{product.courierCode || '-'}</p>
          </div>
        </div>
      </div>

      {/* AS 정보 */}
      <div className="border-t pt-6 mt-6">
        <h3 className="text-xl font-bold mb-4">🛠️ A/S 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">A/S 안내</p>
            <p className="font-medium">{product.asInfo || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">A/S 연락처</p>
            <p className="font-medium">{product.asPhone || '-'}</p>
          </div>
        </div>
      </div>

      {/* 등록 정보 */}
      <div className="border-t pt-6 mt-6 text-sm text-gray-600">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p>등록일: {new Date(product.createdAt).toLocaleString('ko-KR')}</p>
          </div>
          <div>
            <p>수정일: {new Date(product.updatedAt).toLocaleString('ko-KR')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
