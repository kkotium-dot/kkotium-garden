'use client';

import { useState } from 'react';

interface BulkActionsBarProps {
  selectedIds: string[];
  totalCount: number;
  onBulkDelete: () => void;
  onBulkStatusChange: (status: string) => void;
  onClearSelection: () => void;
}

export default function BulkActionsBar({
  selectedIds,
  totalCount,
  onBulkDelete,
  onBulkStatusChange,
  onClearSelection,
}: BulkActionsBarProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-2xl px-6 py-4 flex items-center gap-4">
        {/* 선택 정보 */}
        <div className="flex items-center gap-2">
          <div className="bg-white/20 rounded-full px-3 py-1 font-bold">
            {selectedIds.length}
          </div>
          <span className="font-medium">개 선택됨</span>
        </div>

        <div className="w-px h-6 bg-white/30"></div>

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-2">
          {/* 상태 변경 */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all font-medium"
            >
              📊 상태 변경
            </button>

            {showStatusMenu && (
              <div className="absolute bottom-full mb-2 bg-white rounded-lg shadow-xl overflow-hidden min-w-[150px]">
                <button
                  onClick={() => {
                    onBulkStatusChange('todo');
                    setShowStatusMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  준비중
                </button>
                <button
                  onClick={() => {
                    onBulkStatusChange('draft');
                    setShowStatusMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  초안
                </button>
                <button
                  onClick={() => {
                    onBulkStatusChange('published');
                    setShowStatusMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  판매중
                </button>
              </div>
            )}
          </div>

          {/* 일괄 삭제 */}
          <button
            onClick={() => {
              if (confirm(`선택한 ${selectedIds.length}개 상품을 삭제하시겠습니까?`)) {
                onBulkDelete();
              }
            }}
            className="px-4 py-2 bg-red-500/80 hover:bg-red-600 rounded-lg transition-all font-medium"
          >
            🗑️ 삭제
          </button>

          {/* 선택 해제 */}
          <button
            onClick={onClearSelection}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
