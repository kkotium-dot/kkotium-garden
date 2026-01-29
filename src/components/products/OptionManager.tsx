'use client';

import { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';

export interface ProductOption {
  name: string; // 옵션명 (예: "색상", "크기")
  values: OptionValue[]; // 옵션값들
}

export interface OptionValue {
  value: string; // 값 (예: "빨강", "소형")
  priceModifier: number; // 가격 차이 (예: +5000, -2000)
  stock: number; // 재고
}

interface OptionManagerProps {
  options: ProductOption[];
  onChange: (options: ProductOption[]) => void;
}

export default function OptionManager({ options, onChange }: OptionManagerProps) {
  const [showAddOption, setShowAddOption] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');

  // 옵션 추가
  const addOption = () => {
    if (!newOptionName.trim()) return;

    const newOption: ProductOption = {
      name: newOptionName.trim(),
      values: [],
    };

    onChange([...options, newOption]);
    setNewOptionName('');
    setShowAddOption(false);
  };

  // 옵션 삭제
  const removeOption = (optionIndex: number) => {
    const newOptions = options.filter((_, i) => i !== optionIndex);
    onChange(newOptions);
  };

  // 옵션값 추가
  const addOptionValue = (optionIndex: number) => {
    const newOptions = [...options];
    newOptions[optionIndex].values.push({
      value: '',
      priceModifier: 0,
      stock: 0,
    });
    onChange(newOptions);
  };

  // 옵션값 삭제
  const removeOptionValue = (optionIndex: number, valueIndex: number) => {
    const newOptions = [...options];
    newOptions[optionIndex].values = newOptions[optionIndex].values.filter(
      (_, i) => i !== valueIndex
    );
    onChange(newOptions);
  };

  // 옵션값 변경
  const updateOptionValue = (
    optionIndex: number,
    valueIndex: number,
    field: keyof OptionValue,
    value: any
  ) => {
    const newOptions = [...options];
    newOptions[optionIndex].values[valueIndex][field] = value;
    onChange(newOptions);
  };

  // 총 조합 수 계산
  const getTotalCombinations = () => {
    if (options.length === 0) return 0;
    return options.reduce((acc, option) => acc * (option.values.length || 1), 1);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">상품 옵션</h3>
          <p className="text-sm text-gray-500 mt-1">
            색상, 크기 등의 옵션을 추가하세요
            {getTotalCombinations() > 0 && (
              <span className="ml-2 text-pink-600 font-semibold">
                (총 {getTotalCombinations()}개 조합)
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() => setShowAddOption(true)}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          옵션 추가
        </button>
      </div>

      {/* 옵션 추가 모달 */}
      {showAddOption && (
        <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newOptionName}
              onChange={(e) => setNewOptionName(e.target.value)}
              placeholder="옵션명 입력 (예: 색상, 크기)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              onKeyPress={(e) => e.key === 'Enter' && addOption()}
              autoFocus
            />
            <button
              onClick={addOption}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
            >
              추가
            </button>
            <button
              onClick={() => {
                setShowAddOption(false);
                setNewOptionName('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 옵션 목록 */}
      {options.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">옵션이 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">
            색상, 크기 등의 옵션을 추가하세요
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {options.map((option, optionIndex) => (
            <div key={optionIndex} className="p-6 bg-white border-2 border-gray-200 rounded-lg">
              {/* 옵션 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-gray-900">{option.name}</h4>
                <button
                  onClick={() => removeOption(optionIndex)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="옵션 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* 옵션값 목록 */}
              <div className="space-y-3">
                {option.values.map((value, valueIndex) => (
                  <div key={valueIndex} className="flex items-center gap-3">
                    {/* 옵션값 */}
                    <input
                      type="text"
                      value={value.value}
                      onChange={(e) =>
                        updateOptionValue(optionIndex, valueIndex, 'value', e.target.value)
                      }
                      placeholder="옵션값 (예: 빨강, 소형)"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                    />

                    {/* 가격 차이 */}
                    <div className="w-40">
                      <input
                        type="number"
                        value={value.priceModifier}
                        onChange={(e) =>
                          updateOptionValue(
                            optionIndex,
                            valueIndex,
                            'priceModifier',
                            parseInt(e.target.value) || 0
                          )
                        }
                        placeholder="가격 차이"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">원 (±)</p>
                    </div>

                    {/* 재고 */}
                    <div className="w-32">
                      <input
                        type="number"
                        value={value.stock}
                        onChange={(e) =>
                          updateOptionValue(
                            optionIndex,
                            valueIndex,
                            'stock',
                            parseInt(e.target.value) || 0
                          )
                        }
                        placeholder="재고"
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">개</p>
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => removeOptionValue(optionIndex, valueIndex)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="옵션값 삭제"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* 옵션값 추가 버튼 */}
                <button
                  onClick={() => addOptionValue(optionIndex)}
                  className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-pink-400 hover:text-pink-600 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {option.name} 추가
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 안내 */}
      {options.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <p className="font-semibold">💡 옵션 설정 팁</p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• 가격 차이: 기본 가격에서 더하거나 뺄 금액 (예: +5000, -2000)</li>
            <li>• 재고: 각 옵션별 재고를 관리할 수 있습니다</li>
            <li>• 여러 옵션을 조합하면 모든 경우의 수가 자동 생성됩니다</li>
          </ul>
        </div>
      )}
    </div>
  );
}
