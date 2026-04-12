'use client';

import Link from 'next/link';

interface QuickActionsProps {
  selectedCount?: number;
  onBulkDelete?: () => void;
  onBulkExport?: () => void;
}

export default function QuickActions({
  selectedCount = 0,
  onBulkDelete,
  onBulkExport
}: QuickActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* 선택된 항목 표시 */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 mr-4">
          <span className="text-sm text-gray-600">
            {selectedCount}개 선택됨
          </span>
          {onBulkDelete && (
            <button
              onClick={onBulkDelete}
              className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              일괄 삭제
            </button>
          )}
          {onBulkExport && (
            <button
              onClick={onBulkExport}
              className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              엑셀 다운로드
            </button>
          )}
        </div>
      )}

      {/* 빠른 액션 버튼 */}
      <Link
        href="/products/new"
        className="inline-flex items-center px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
      >
        
        상품 추가
      </Link>

      <Link
        href="/products/bulk-upload"
        className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        
        엑셀 업로드
      </Link>

      <Link
        href="/"
        className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
      >
        
        크롤링
      </Link>
    </div>
  );
}
