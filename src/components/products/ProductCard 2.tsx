'use client';

import Link from 'next/link';
import Image from 'next/image';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    sku: string;
    category?: string;
    supplierPrice: number;
    salePrice: number;
    margin: number;
    mainImage?: string;
    status?: string;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  // 가격 포맷팅
  const formatKRW = (amount: number) => {
    return `${amount.toLocaleString()}원`;
  };

  // 퍼센트 포맷팅
  const formatPercent = (percent: number) => {
    return `${percent.toFixed(1)}%`;
  };

  // 마진율에 따른 색상
  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Link href={`/products/${product.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer">
        {/* 이미지 */}
        <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
          {product.mainImage ? (
            <Image
              src={product.mainImage}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl">📦</span>
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="space-y-2">
          {/* SKU */}
          <p className="text-xs text-gray-500">{product.sku}</p>

          {/* 상품명 */}
          <h3 className="font-semibold text-gray-900 line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>

          {/* 카테고리 */}
          {product.category && (
            <p className="text-xs text-gray-500">{product.category}</p>
          )}

          {/* 가격 정보 */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex justify-between items-center text-sm mb-1">
              <span className="text-gray-600">도매가</span>
              <span className="font-medium">{formatKRW(product.supplierPrice)}</span>
            </div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-gray-600">판매가</span>
              <span className="font-bold text-pink-600">{formatKRW(product.salePrice)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">마진율</span>
              <span className={`text-lg font-bold ${getMarginColor(product.margin)}`}>
                {formatPercent(product.margin)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
