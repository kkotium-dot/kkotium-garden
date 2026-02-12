'use client';

interface AiProgressModalProps {
  isOpen: boolean;
  current: number;
  total: number;
  currentProduct: string;
}

export default function AiProgressModal({
  isOpen,
  current,
  total,
  currentProduct,
}: AiProgressModalProps) {
  if (!isOpen) return null;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4 animate-bounce">🤖</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            AI 최적화 진행 중
          </h3>
          <p className="text-gray-600">
            잠시만 기다려주세요
          </p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{current} / {total}</span>
            <span className="font-bold text-purple-600">{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: percentage + '%' }}
            />
          </div>
        </div>

        {currentProduct && (
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <p className="text-xs text-purple-600 mb-1">현재 처리 중</p>
            <p className="text-sm font-medium text-purple-900 truncate">
              {currentProduct}
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            ⚡ Perplexity AI가 각 상품을 최적화하고 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}
