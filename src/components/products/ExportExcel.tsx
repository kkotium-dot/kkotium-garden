'use client';

import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplierPrice: number;
  salePrice: number;
  margin: number;
  shippingFee: number;
  status: string;
  createdAt: string;
}

interface ExportExcelProps {
  products: Product[];
  selectedIds: string[];
}

export default function ExportExcel({ products, selectedIds }: ExportExcelProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (exportAll: boolean) => {
    setExporting(true);

    try {
      const exportProducts = exportAll 
        ? products 
        : products.filter(p => selectedIds.includes(p.id));

      if (exportProducts.length === 0) {
        alert('내보낼 상품이 없습니다.');
        return;
      }

      // CSV 형식으로 변환
      const headers = [
        'SKU',
        '상품명',
        '카테고리',
        '공급가',
        '판매가',
        '마진(%)',
        '배송비',
        '상태',
        '등록일',
      ];

      const rows = exportProducts.map(p => [
        p.sku || '',
        p.name || '',
        p.category || '',
        p.supplierPrice || 0,
        p.salePrice || 0,
        p.margin?.toFixed(1) || 0,
        p.shippingFee || 0,
        p.status === 'published' ? '판매중' : p.status === 'draft' ? '초안' : '준비중',
        new Date(p.createdAt).toLocaleDateString('ko-KR'),
      ]);

      // CSV 생성
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // UTF-8 BOM 추가 (한글 깨짐 방지)
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

      // 다운로드
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `꽃틔움_상품목록_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`✅ ${exportProducts.length}개 상품이 내보내기 되었습니다!`);
    } catch (error) {
      console.error('엑셀 내보내기 실패:', error);
      alert('내보내기에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
        disabled={exporting}
        onClick={() => {
          if (selectedIds.length > 0) {
            // 선택 항목이 있으면 선택 메뉴 표시
            const choice = confirm('선택한 상품만 내보내시겠습니까?\n(취소: 전체 내보내기)');
            handleExport(!choice);
          } else {
            // 선택 항목이 없으면 전체 내보내기
            handleExport(true);
          }
        }}
      >
        {exporting ? (
          <>
            <span className="animate-spin">⏳</span>
            내보내는 중...
          </>
        ) : (
          <>
            📊 엑셀 내보내기
          </>
        )}
      </button>
    </div>
  );
}
