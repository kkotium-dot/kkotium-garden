// src/components/naver/ExcelExportButton.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 네이버 엑셀 내보내기 버튼
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use client';

import { useState } from 'react';

interface Props {
  mode: 'single' | 'batch' | 'filter' | 'template';
  productId?: string;
  productIds?: string[];
  filters?: {
    status?: string;
    minScore?: number;
    supplierId?: string;
    categoryCode?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  buttonText?: string;
  buttonClassName?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function ExcelExportButton({
  mode,
  productId,
  productIds,
  filters,
  buttonText,
  buttonClassName,
  onSuccess,
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    try {
      // API 호출
      const response = await fetch('/api/naver/excel-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          productId,
          productIds,
          filters,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '엑셀 생성 실패');
      }

      // 파일 다운로드
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Content-Disposition 헤더에서 파일명 추출
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] 
        ? decodeURIComponent(filenameMatch[1])
        : `naver_export_${Date.now()}.xlsx`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // 정리
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onSuccess?.();
    } catch (error) {
      console.error('❌ 엑셀 다운로드 오류:', error);
      const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
      onError?.(errorMsg);
      alert(`엑셀 다운로드 실패: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (buttonText) return buttonText;

    switch (mode) {
      case 'single':
        return '📥 엑셀 다운로드';
      case 'batch':
        return `📥 ${productIds?.length || 0}개 상품 엑셀 다운로드`;
      case 'filter':
        return '📥 조건별 엑셀 다운로드';
      case 'template':
        return '📄 빈 템플릿 다운로드';
      default:
        return '📥 엑셀 다운로드';
    }
  };

  const defaultClassName = 
    'px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold';

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className={buttonClassName || defaultClassName}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin">⏳</span>
          생성 중...
        </span>
      ) : (
        getButtonText()
      )}
    </button>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 일괄 내보내기 패널 (여러 상품 선택)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface BatchExportPanelProps {
  selectedProductIds: string[];
  onExportComplete?: () => void;
}

export function BatchExportPanel({ selectedProductIds, onExportComplete }: BatchExportPanelProps) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-green-200">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-800">
            네이버 엑셀 일괄 내보내기
          </h3>
          <p className="text-sm text-gray-600">
            선택된 {selectedProductIds.length}개 상품
          </p>
        </div>
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {showOptions ? '옵션 닫기 ▲' : '옵션 열기 ▼'}
        </button>
      </div>

      {showOptions && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-2">
            ℹ️ 88개 필드가 자동으로 채워집니다:
          </p>
          <ul className="text-xs text-gray-700 space-y-1">
            <li>• 필수 20개: 상품명, 가격, 이미지, 브랜드, 카테고리 등</li>
            <li>• 배송 15개: 배송비, 택배사, 반품/교환 정보</li>
            <li>• 상품 정보 20개: 인증, 색상, 크기, 소재 등</li>
            <li>• 옵션 10개: 옵션명, 옵션값 등</li>
            <li>• 기타 23개: 할인, AS, 프로모션 등</li>
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <ExcelExportButton
          mode="batch"
          productIds={selectedProductIds}
          buttonClassName="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
          onSuccess={onExportComplete}
        />
        <ExcelExportButton
          mode="template"
          buttonText="📄 템플릿"
          buttonClassName="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold"
        />
      </div>

      <p className="mt-3 text-xs text-gray-500">
        💡 Tip: 엑셀 파일을 네이버 스마트스토어 관리자 &gt; 상품관리 &gt; 대량등록에서 업로드하세요.
      </p>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 조건별 내보내기 폼
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function FilteredExportForm() {
  const [filters, setFilters] = useState({
    status: '',
    minScore: '',
    supplierId: '',
    categoryCode: '',
    dateFrom: '',
    dateTo: '',
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        조건별 상품 엑셀 내보내기
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            상품 상태
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">전체</option>
            <option value="DRAFT">임시저장</option>
            <option value="READY">등록대기</option>
            <option value="PUBLISHED">판매중</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            최소 점수
          </label>
          <input
            type="number"
            value={filters.minScore}
            onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
            placeholder="예: 60"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            등록일 (시작)
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            등록일 (종료)
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <ExcelExportButton
        mode="filter"
        filters={{
          status: filters.status || undefined,
          minScore: filters.minScore ? parseInt(filters.minScore) : undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        }}
        buttonClassName="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 font-semibold"
        buttonText="📥 조건에 맞는 상품 엑셀 다운로드"
      />
    </div>
  );
}
