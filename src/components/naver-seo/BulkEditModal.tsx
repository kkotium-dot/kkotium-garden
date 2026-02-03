// src/components/naver-seo/BulkEditModal.tsx
'use client';

import { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onSubmit: (data: BulkEditData) => Promise<void>;
}

export interface BulkEditData {
  naver_brand?: string;
  naver_origin?: string;
  naver_material?: string;
  naver_care_instructions?: string;
}

export default function BulkEditModal({ isOpen, onClose, selectedCount, onSubmit }: Props) {
  const [formData, setFormData] = useState<BulkEditData>({});
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 최소 하나의 필드는 입력되어야 함
    if (Object.values(formData).every(v => !v)) {
      alert('최소 하나의 항목을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      setFormData({});
      onClose();
    } catch (error) {
      console.error('일괄 수정 실패:', error);
      alert('일괄 수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* 헤더 */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  일괄 수정
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  선택된 {selectedCount}개 상품의 정보를 한번에 수정합니다
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-6 space-y-6">
              {/* 안내 메시지 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <span className="text-blue-600 flex-shrink-0">ℹ️</span>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">입력한 항목만 수정됩니다</p>
                    <p className="text-blue-700">
                      빈 칸으로 남겨둔 항목은 기존 값을 유지합니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* 브랜드 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  브랜드 <span className="text-purple-600">(+10점)</span>
                </label>
                <input
                  type="text"
                  value={formData.naver_brand || ''}
                  onChange={(e) => setFormData({ ...formData, naver_brand: e.target.value })}
                  placeholder="예: 꽃틔움"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* 원산지 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  원산지 <span className="text-purple-600">(+10점)</span>
                </label>
                <select
                  value={formData.naver_origin || ''}
                  onChange={(e) => setFormData({ ...formData, naver_origin: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">선택하지 않음</option>
                  <option value="국내">국내</option>
                  <option value="중국">중국</option>
                  <option value="일본">일본</option>
                  <option value="네덜란드">네덜란드</option>
                  <option value="콜롬비아">콜롬비아</option>
                  <option value="에콰도르">에콰도르</option>
                  <option value="케냐">케냐</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              {/* 재질/소재 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  재질/소재 <span className="text-purple-600">(+10점)</span>
                </label>
                <input
                  type="text"
                  value={formData.naver_material || ''}
                  onChange={(e) => setFormData({ ...formData, naver_material: e.target.value })}
                  placeholder="예: 프리미엄 생화"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* 관리 방법 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  관리 방법 <span className="text-purple-600">(+10점)</span>
                </label>
                <textarea
                  value={formData.naver_care_instructions || ''}
                  onChange={(e) => setFormData({ ...formData, naver_care_instructions: e.target.value })}
                  placeholder="예: 직사광선을 피하고 서늘한 곳에 보관하세요."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* 예상 점수 상승 */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-900">
                    예상 점수 상승
                  </span>
                  <span className="text-2xl font-bold text-purple-600">
                    +{
                      (formData.naver_brand ? 10 : 0) +
                      (formData.naver_origin ? 10 : 0) +
                      (formData.naver_material ? 10 : 0) +
                      (formData.naver_care_instructions ? 10 : 0)
                    }점
                  </span>
                </div>
              </div>
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '수정 중...' : `${selectedCount}개 상품 일괄 수정`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
