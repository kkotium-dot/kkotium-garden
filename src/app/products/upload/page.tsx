'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

type ExcelProduct = {
  productName: string
  productCode: string
  category: string
  brand: string
  salePrice: number
  supplyPrice: number
  stockQty: number
  description: string
}

export default function UploadProducts() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<ExcelProduct[]>([])
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

        // 엑셀 데이터를 Product 형식으로 변환
        const products: ExcelProduct[] = jsonData.map((row) => ({
          productName: row['상품명'] || row['productName'] || '',
          productCode: row['상품코드'] || row['productCode'] || '',
          category: row['카테고리'] || row['category'] || '',
          brand: row['브랜드'] || row['brand'] || '',
          salePrice: parseInt(row['판매가'] || row['salePrice'] || '0'),
          supplyPrice: parseInt(row['공급가'] || row['supplyPrice'] || '0'),
          stockQty: parseInt(row['재고수량'] || row['stockQty'] || '0'),
          description: row['상품설명'] || row['description'] || ''
        }))

        setPreview(products)
      } catch (error) {
        alert('엑셀 파일 읽기에 실패했습니다')
        console.error(error)
      }
    }

    reader.readAsArrayBuffer(selectedFile)
  }

  const handleUpload = async () => {
    if (preview.length === 0) {
      alert('업로드할 상품이 없습니다')
      return
    }

    setLoading(true)

    try {
      let successCount = 0
      let failCount = 0

      for (const product of preview) {
        const marginRate = ((product.salePrice - product.supplyPrice) / product.salePrice) * 100

        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...product,
            marginRate
          })
        })

        if (response.ok) {
          successCount++
        } else {
          failCount++
        }
      }

      alert(`업로드 완료\n성공: ${successCount}개\n실패: ${failCount}개`)
      router.push('/')
    } catch (error) {
      alert('업로드 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">엑셀 대량 업로드</h1>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            엑셀 파일 선택
          </label>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-2 text-sm text-gray-500">
            * 엑셀 파일의 컬럼명: 상품명, 상품코드, 카테고리, 브랜드, 판매가, 공급가, 재고수량, 상품설명
          </p>
        </div>

        {preview.length > 0 && (
          <>
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">미리보기 ({preview.length}개)</h3>
              <button
                onClick={handleUpload}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? '업로드중...' : '전체 업로드'}
              </button>
            </div>

            <div className="overflow-x-auto border rounded">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">상품명</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">상품코드</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">카테고리</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">판매가</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">공급가</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">재고</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.map((product, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{product.productName}</td>
                      <td className="px-4 py-2 text-sm">{product.productCode}</td>
                      <td className="px-4 py-2 text-sm">{product.category}</td>
                      <td className="px-4 py-2 text-sm">{product.salePrice.toLocaleString()}원</td>
                      <td className="px-4 py-2 text-sm">{product.supplyPrice.toLocaleString()}원</td>
                      <td className="px-4 py-2 text-sm">{product.stockQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-6">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
