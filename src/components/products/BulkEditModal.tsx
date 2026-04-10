// BulkEditModal.tsx - Naver Store style bulk option editor
'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';

interface OptionRow {
  id: string;
  value: string;
  price: string;
  stock: string;
  status?: 'ON' | 'OUT' | 'OFF';
}

interface BulkEditModalProps {
  isOpen: boolean;
  selectedOptions: OptionRow[];
  onClose: () => void;
  onApply: (updates: Partial<OptionRow>[]) => void;
}

export function BulkEditModal({
  isOpen,
  selectedOptions,
  onClose,
  onApply,
}: BulkEditModalProps) {
  const [changePrice, setChangePrice] = useState(false);
  const [priceMode, setPriceMode] = useState<'relative' | 'absolute'>('relative');
  const [priceValue, setPriceValue] = useState('');

  const [changeStock, setChangeStock] = useState(false);
  const [stockValue, setStockValue] = useState('');

  const [changeStatus, setChangeStatus] = useState(false);
  const [statusValue, setStatusValue] = useState<'ON' | 'OUT' | 'OFF'>('ON');

  // Preview changes
  const preview = useMemo(() => {
    return selectedOptions.map(opt => {
      const changes: string[] = [];

      if (changePrice && priceValue) {
        const current = Number(opt.price) || 0;
        const newPrice = priceMode === 'relative'
          ? current + Number(priceValue)
          : Number(priceValue);
        changes.push(`옵션가: ${current.toLocaleString()}원 → ${newPrice.toLocaleString()}원`);
      }

      if (changeStock && stockValue) {
        changes.push(`재고: ${opt.stock}개 → ${stockValue}개`);
      }

      if (changeStatus) {
        const labels = { ON: '판매중', OUT: '품절', OFF: '숨김' };
        const currentStatus = opt.status || 'ON';
        changes.push(`상태: ${labels[currentStatus]} → ${labels[statusValue]}`);
      }

      return {
        optionValue: opt.value,
        changes,
      };
    });
  }, [selectedOptions, changePrice, priceValue, priceMode, changeStock, stockValue, changeStatus, statusValue]);

  const handleApply = () => {
    const updates = selectedOptions.map(opt => {
      const update: Partial<OptionRow> = { id: opt.id };

      if (changePrice && priceValue) {
        const current = Number(opt.price) || 0;
        update.price = String(
          priceMode === 'relative'
            ? current + Number(priceValue)
            : Number(priceValue)
        );
      }

      if (changeStock && stockValue) {
        update.stock = stockValue;
      }

      if (changeStatus) {
        update.status = statusValue;
      }

      return update;
    });

    onApply(updates);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setChangePrice(false);
    setPriceMode('relative');
    setPriceValue('');
    setChangeStock(false);
    setStockValue('');
    setChangeStatus(false);
    setStatusValue('ON');
  };

  if (!isOpen) return null;

  const hasChanges = (changePrice && priceValue) || (changeStock && stockValue) || changeStatus;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">선택한 옵션 일괄 수정</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Selection count */}
          <div className="flex items-center gap-2 text-sm">
            <div className="w-5 h-5 rounded bg-green-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
              </svg>
            </div>
            <span className="font-medium text-gray-900">{selectedOptions.length}개 항목 선택됨</span>
          </div>

          <p className="text-sm text-gray-600">변경할 항목을 선택하세요</p>

          {/* Option Price */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={changePrice}
                onChange={(e) => setChangePrice(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
              />
              <span className="font-medium text-gray-700">옵션가</span>
            </label>

            {changePrice && (
              <div className="ml-6 space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priceMode"
                      checked={priceMode === 'relative'}
                      onChange={() => setPriceMode('relative')}
                      className="w-4 h-4 text-green-500 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">기존값 기준</span>
                  </label>
                  <input
                    type="number"
                    value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                    placeholder="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-500">원</span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priceMode"
                      checked={priceMode === 'absolute'}
                      onChange={() => setPriceMode('absolute')}
                      className="w-4 h-4 text-green-500 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">절대값 설정</span>
                  </label>
                  <input
                    type="number"
                    value={priceMode === 'absolute' ? priceValue : ''}
                    onChange={(e) => {
                      setPriceMode('absolute');
                      setPriceValue(e.target.value);
                    }}
                    placeholder="0"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-500">원</span>
                </div>
              </div>
            )}
          </div>

          {/* Stock */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={changeStock}
                onChange={(e) => setChangeStock(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
              />
              <span className="font-medium text-gray-700">재고수량</span>
            </label>

            {changeStock && (
              <div className="ml-6 flex items-center gap-3">
                <input
                  type="number"
                  value={stockValue}
                  onChange={(e) => setStockValue(e.target.value)}
                  placeholder="0"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500">개 (절대값으로 일괄 변경)</span>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={changeStatus}
                onChange={(e) => setChangeStatus(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
              />
              <span className="font-medium text-gray-700">판매상태</span>
            </label>

            {changeStatus && (
              <div className="ml-6 flex items-center gap-3">
                {(['ON', 'OUT', 'OFF'] as const).map((status) => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={statusValue === status}
                      onChange={() => setStatusValue(status)}
                      className="w-4 h-4 text-green-500 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">
                      {status === 'ON' ? '판매중' : status === 'OUT' ? '품절' : '숨김'}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {hasChanges && (
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">📋 변경 미리보기:</p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {preview.map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <p className="text-sm font-medium text-gray-800">{item.optionValue}</p>
                    {item.changes.map((change, j) => (
                      <p key={j} className="text-xs text-gray-600 ml-2">• {change}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleApply}
            disabled={!hasChanges}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
              hasChanges
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {selectedOptions.length}개 항목 일괄 적용
          </button>
        </div>
      </div>
    </div>
  );
}
