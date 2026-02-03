'use client';

import { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onSubmit: () => Promise<void>;
}

export default function AiBulkGenerateModal({ isOpen, onClose, selectedCount, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setProgress(0);

    try {
      await onSubmit();
      onClose();
    } catch (error) {
      console.error('AI 일괄 생성 실패:', error);
      alert('AI 일괄 생성에 실패했습니다.');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  🤖 AI 일괄 생성
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  선택된 {selectedCount}개 상품의 SEO 정보를 AI로 자동 생성합니다
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 transition disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="px-6 py-6 space-y-6">
              {/* AI 안내 */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <span className="text-purple-600 flex-shrink-0 text-2xl">🤖</span>
                  <div className="text-sm">
                    <p className="font-medium text-purple-900 mb-2">Perplexity AI가 생성합니다</p>
                    <ul className="space-y-1 text-purple-800">
                      <li>✓ 네이버 제목 (검색 최적화)</li>
                      <li>✓ 관련 키워드 (5-8개)</li>
                      <li>✓ 상품 설명 (감성 포함)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 주의사항 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <span className="text-yellow-600 flex-shrink-0">⚠️</span>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">주의사항</p>
                    <ul className="space-y-1">
                      <li>• AI 생성에는 시간이 소요됩니다 (상품당 약 2-3초)</li>
                      <li>• {selectedCount}개 상품 예상 시간: 약 {Math.ceil(selectedCount * 2.5 / 60)}분</li>
                      <li>• 생성 중에는 페이지를 벗어나지 마세요</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 진행 중 표시 */}
              {loading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium text-blue-900">
                      AI 생성 중... ({progress}/{selectedCount})
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `$${(progress / selectedCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* 예상 비용 */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">예상 API 비용</span>
                  <span className="font-bold text-gray-900">
                    약 ${(selectedCount * 0.005).toFixed(3)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Perplexity Sonar Large 기준
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>생성 중...</span>
                  </>
                ) : (
                  <>
                    <span>🤖</span>
                    <span>{selectedCount}개 AI 생성 시작</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
