'use client';

import { useState, useEffect } from 'react';
import { formatKRW, formatPercent, calculateMargin, calculateRecommendedPrice } from '@/lib/utils/format';

interface MarginCalculatorProps {
  supplierPrice?: number;
  salePrice?: number;
  shippingCost?: number;
  onPriceChange?: (salePrice: number) => void;
}

export default function MarginCalculator({
  supplierPrice: initialSupplierPrice = 0,
  salePrice: initialSalePrice = 0,
  shippingCost: initialShippingCost = 3000,
  onPriceChange,
}: MarginCalculatorProps) {
  const [supplierPrice, setSupplierPrice] = useState(initialSupplierPrice);
  const [salePrice, setSalePrice] = useState(initialSalePrice);
  const [shippingCost, setShippingCost] = useState(initialShippingCost);
  const [targetMargin, setTargetMargin] = useState(30);

  const { cost, fee, profit, margin } = calculateMargin(supplierPrice, salePrice, shippingCost);
  const recommendedPrice = calculateRecommendedPrice(supplierPrice, targetMargin, shippingCost);

  const handleApplyRecommended = () => {
    setSalePrice(recommendedPrice);
    if (onPriceChange) {
      onPriceChange(recommendedPrice);
    }
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">💰 마진 계산기</h3>

      {/* 입력 필드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            도매가 *
          </label>
          <input
            type="number"
            value={supplierPrice || ''}
            onChange={(e) => setSupplierPrice(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="15000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            판매가 *
          </label>
          <input
            type="number"
            value={salePrice || ''}
            onChange={(e) => {
              const price = parseFloat(e.target.value) || 0;
              setSalePrice(price);
              if (onPriceChange) onPriceChange(price);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="25000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            배송비
          </label>
          <input
            type="number"
            value={shippingCost || ''}
            onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            placeholder="3000"
          />
        </div>
      </div>

      {/* 계산 결과 */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-600 mb-1">총 원가</p>
            <p className="text-lg font-bold text-gray-900">{formatKRW(cost)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">수수료 (5.8%)</p>
            <p className="text-lg font-bold text-orange-600">{formatKRW(fee)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">순이익</p>
            <p className="text-lg font-bold text-blue-600">{formatKRW(profit)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">마진율</p>
            <p className={`text-2xl font-bold ${getMarginColor(margin)}`}>
              {formatPercent(margin)}
            </p>
          </div>
        </div>
      </div>

      {/* 권장 판매가 */}
      <div className="border border-pink-200 rounded-lg p-4 bg-pink-50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              목표 마진율: {targetMargin}%
            </p>
            <input
              type="range"
              min="10"
              max="50"
              value={targetMargin}
              onChange={(e) => setTargetMargin(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">권장 판매가</p>
            <p className="text-2xl font-bold text-pink-600">{formatKRW(recommendedPrice)}</p>
          </div>
          <button
            onClick={handleApplyRecommended}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            적용
          </button>
        </div>
      </div>

      {/* 마진 가이드 */}
      <div className="mt-4 text-xs text-gray-500">
        <p>💡 마진율 가이드:</p>
        <p className="mt-1">
          <span className="text-green-600 font-medium">30% 이상</span>: 우수 | 
          <span className="text-yellow-600 font-medium ml-2">20-30%</span>: 적정 | 
          <span className="text-red-600 font-medium ml-2">20% 미만</span>: 낮음
        </p>
      </div>
    </div>
  );
}
