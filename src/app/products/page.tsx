'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Product {
  id: string
  productCode: string
  productName: string
  brand: string
  category: string
  stockQuantity: number
  wholesalePrice: number
  sellingPrice: number
  margin: number
  marginRate: number
  keywords?: string
  status: string
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setProducts(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(p => {
    const searchLower = search.toLowerCase()
    return (
      p.productName?.toLowerCase().includes(searchLower) ||
      p.productCode?.toLowerCase().includes(searchLower) ||
      p.brand?.toLowerCase().includes(searchLower)
    )
  })

  const formatPrice = (value: any): string => {
    const num = Number(value)
    return isNaN(num) ? '0' : num.toLocaleString()
  }

  const formatRate = (value: any): string => {
    const num = Number(value)
    return isNaN(num) ? '0.00' : num.toFixed(2)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">로딩중...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">상품 관리</h1>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          홈으로
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="상품명, 상품코드, 브랜드로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상품코드</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상품명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">브랜드</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">카테고리</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">재고</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">판매가</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">마진율</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">키워드</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                  {search ? '검색 결과가 없습니다' : '상품이 없습니다'}
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr 
                  key={product.id} 
                  onClick={() => router.push(`/products/${product.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.productCode || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{product.productName || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.brand || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.category || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatPrice(product.stockQuantity)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatPrice(product.sellingPrice)}원</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatRate(product.marginRate)}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {product.keywords ? (
                      <span className="text-green-600 font-semibold">✓</span>
                    ) : (
                      <span className="text-gray-300 font-semibold">✗</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.status === 'SALE' ? 'bg-green-100 text-green-800' :
                      product.status === 'SOLD_OUT' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {product.status === 'SALE' ? '판매중' :
                       product.status === 'SOLD_OUT' ? '품절' : '단종'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        총 {filteredProducts.length}개 상품
        {search && ` (전체: ${products.length}개)`}
      </div>
    </div>
  )
}
