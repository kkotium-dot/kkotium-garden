// src/components/products/MarginCalculator.tsx
"use client";

import { useEffect, useState } from 'react';

interface MarginCalculatorProps {
  supplierPrice: number;
  salePrice: number;
  onSupplierPriceChange: (price: number) => void;
  onSalePriceChange: (price: number) => void;
}

export function MarginCalculator({
  supplierPrice,
  salePrice,
  onSupplierPriceChange,
  onSalePriceChange
}: MarginCalculatorProps) {
  const [margin, setMargin] = useState(0);
  const [profit, setProfit] = useState(0);

  useEffect(() => {
    if (supplierPrice && salePrice && salePrice > 0) {
      const calculatedMargin = ((salePrice - supplierPrice) / salePrice) * 100;
      const calculatedProfit = salePrice - supplierPrice;
      setMargin(Math.round(calculatedMargin * 10) / 10);
      setProfit(calculatedProfit);
    } else {
      setMargin(0);
      setProfit(0);
    }
  }, [supplierPrice, salePrice]);

  const getMarginColor = (margin: number) => {
    if (margin >= 50) return 'text-green-600 bg-green-50';
    if (margin >= 30) return 'text-blue-600 bg-blue-50';
    if (margin >= 15) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getMarginLabel = (margin: number) => {
    if (margin >= 50) return '우수';
    if (margin >= 30) return '양호';
    if (margin >= 15) return '보통';
    return '낮음';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            도매가 (공급가) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={supplierPrice || ''}
            onChange={(e) => onSupplierPriceChange(parseFloat(e.target.value) || 0)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="10000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            판매가 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={salePrice || ''}
            onChange={(e) => onSalePriceChange(parseFloat(e.target.value) || 0)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="20000"
          />
        </div>
      </div>

      {/* 마진 정보 표시 */}
      {supplierPrice > 0 && salePrice > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600 mb-1">마진율</p>
              <p className={`text-2xl font-bold px-3 py-1 rounded-lg inline-block ${getMarginColor(margin)}`}>
                {margin.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">{getMarginLabel(margin)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">이익금</p>
              <p className="text-2xl font-bold text-gray-900">
                {profit.toLocaleString()}원
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">원가율</p>
              <p className="text-2xl font-bold text-gray-900">
                {salePrice > 0 ? ((supplierPrice / salePrice) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>

          {/* 마진 기준 안내 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">💡 마진율 기준</p>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 bg-green-50 text-green-700 rounded">50% 이상: 우수</span>
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">30~50%: 양호</span>
              <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded">15~30%: 보통</span>
              <span className="px-2 py-1 bg-red-50 text-red-700 rounded">15% 미만: 낮음</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
