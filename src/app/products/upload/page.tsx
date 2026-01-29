'use client';

import { useState, useRef } from 'react';
import { Upload, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type ParsedProduct = {
  name: string;
  supplier_price: number;
  sale_price: number;
  category: string;
  url?: string;
  error?: string;
};

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedProduct[]>([]);
  const [uploadResult, setUploadResult] = useState<{success: number; failed: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedData([]);
      setUploadResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setParsedData([]);
      setUploadResult(null);
    } else {
      alert('CSV 파일만 업로드 가능합니다.');
    }
  };

  const parseCSV = async () => {
    if (!file) return;

    setParsing(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // 헤더 제거
      const dataLines = lines.slice(1);
      
      const products: ParsedProduct[] = dataLines.map((line, idx) => {
        try {
          // CSV 파싱 (쉼표로 구분, 따옴표 처리)
          const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
          
          const name = values[0] || '';
          const supplier_price = parseInt(values[1]) || 0;
          const sale_price = parseInt(values[2]) || 0;
          const category = values[3] || '';
          const url = values[4] || '';

          // 유효성 검사
          if (!name || supplier_price <= 0) {
            return {
              name: name || `상품 ${idx + 1}`,
              supplier_price,
              sale_price,
              category,
              url,
              error: '상품명 또는 가격이 유효하지 않습니다.'
            };
          }

          // 판매가 자동 계산 (입력 안되어 있으면)
          const finalSalePrice = sale_price > 0 ? sale_price : Math.ceil(supplier_price * 1.3);

          return {
            name,
            supplier_price,
            sale_price: finalSalePrice,
            category,
            url
          };
        } catch (error) {
          return {
            name: `상품 ${idx + 1}`,
            supplier_price: 0,
            sale_price: 0,
            category: '',
            error: '파싱 실패'
          };
        }
      });

      setParsedData(products);
    } catch (error) {
      console.error('CSV 파싱 실패:', error);
      alert('CSV 파일을 읽는데 실패했습니다.');
    } finally {
      setParsing(false);
    }
  };

  const uploadProducts = async () => {
    if (parsedData.length === 0) return;

    // 에러 있는 상품 필터링
    const validProducts = parsedData.filter(p => !p.error);
    
    if (validProducts.length === 0) {
      alert('유효한 상품이 없습니다.');
      return;
    }

    if (!confirm(`${validProducts.length}개 상품을 등록하시겠습니까?`)) {
      return;
    }

    setUploading(true);
    try {
      const response = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: validProducts })
      });

      const data = await response.json();

      if (data.success) {
        setUploadResult({
          success: data.inserted,
          failed: data.failed
        });
        alert(`업로드 완료!\n성공: ${data.inserted}개\n실패: ${data.failed}개`);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('업로드 실패:', error);
      alert(`업로드 실패: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `상품명,공급가,판매가,카테고리,URL
원피스 여성 여름 롱원피스,15000,19500,의류>여성의류>원피스,
블라우스 여성 셔츠,12000,15600,의류>여성의류>블라우스,
청바지 남성 데님,25000,32500,의류>남성의류>바지,`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '상품업로드_템플릿.csv';
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CSV 일괄 업로드</h1>
          <p className="text-gray-600">
            도매매에서 복사한 상품 정보를 CSV 파일로 업로드하여 일괄 등록하세요.
          </p>
        </div>

        {/* 템플릿 다운로드 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <FileText className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">CSV 템플릿 다운로드</h3>
              <p className="text-sm text-blue-700 mb-3">
                아래 템플릿을 다운로드하여 상품 정보를 입력하세요.
              </p>
              <button
                onClick={downloadTemplate}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                템플릿 다운로드
              </button>
            </div>
          </div>
        </div>

        {/* 파일 업로드 영역 */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="bg-white rounded-xl shadow-sm p-8 mb-6 border-2 border-dashed border-gray-300 hover:border-pink-400 transition cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <div className="text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            {file ? (
              <>
                <p className="text-lg font-medium text-gray-900 mb-2">{file.name}</p>
                <p className="text-sm text-gray-600 mb-4">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    parseCSV();
                  }}
                  disabled={parsing}
                  className="px-6 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition disabled:opacity-50"
                >
                  {parsing ? '파싱 중...' : '파일 분석하기'}
                </button>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  CSV 파일을 드래그하거나 클릭하여 선택하세요
                </p>
                <p className="text-sm text-gray-600">
                  최대 1000개 상품까지 한 번에 업로드 가능합니다
                </p>
              </>
            )}
          </div>
        </div>

        {/* 파싱 결과 */}
        {parsedData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                파싱 결과 ({parsedData.length}개)
              </h2>
              <button
                onClick={uploadProducts}
                disabled={uploading || parsedData.filter(p => !p.error).length === 0}
                className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition disabled:opacity-50"
              >
                {uploading ? '업로드 중...' : `${parsedData.filter(p => !p.error).length}개 상품 등록`}
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {parsedData.map((product, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    product.error
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {product.error ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                      </div>
                      
                      {product.error ? (
                        <p className="text-sm text-red-600">{product.error}</p>
                      ) : (
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>공급가: {product.supplier_price.toLocaleString()}원 → 판매가: {product.sale_price.toLocaleString()}원</p>
                          <p>카테고리: {product.category || '미분류'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 업로드 결과 */}
        {uploadResult && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <h3 className="font-semibold text-green-900 text-lg">업로드 완료!</h3>
            </div>
            <p className="text-green-700 mb-4">
              성공: {uploadResult.success}개 / 실패: {uploadResult.failed}개
            </p>
            <Link
              href="/products/sourced"
              className="inline-block px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition"
            >
              등록된 상품 보기
            </Link>
          </div>
        )}

        {/* 사용 가이드 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">CSV 파일 형식 안내</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex gap-2">
              <span className="font-medium text-pink-500">1.</span>
              <p>첫 번째 줄은 헤더(상품명,공급가,판매가,카테고리,URL)입니다.</p>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-pink-500">2.</span>
              <p>상품명과 공급가는 필수입니다.</p>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-pink-500">3.</span>
              <p>판매가를 입력하지 않으면 자동으로 공급가의 30% 마진이 적용됩니다.</p>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-pink-500">4.</span>
              <p>Excel에서 작성 후 "CSV UTF-8(쉼표로 분리)" 형식으로 저장하세요.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
