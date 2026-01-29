'use client';

import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  salesCount: number;
  revenue: number;
  mainImage?: string | null;
}

interface PopularProductsProps {
  products: Product[];
}

export default function PopularProducts({ products }: PopularProductsProps) {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">인기 상품 Top 5</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          판매 데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">인기 상품 Top 5</h3>
      <div className="space-y-4">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-sm font-bold text-purple-600">
                {index + 1}
              </span>
            </div>
            <div className="relative w-12 h-12 flex-shrink-0">
              {product.mainImage ? (
                <Image
                  src={product.mainImage}
                  alt={product.name}
                  fill
                  className="object-cover rounded-md"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center text-gray-400 text-xs">
                  No Image
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {product.name}
              </h4>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                <span>판매 {product.salesCount}개</span>
                <span className="text-purple-600 font-semibold">
                  {product.revenue.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
