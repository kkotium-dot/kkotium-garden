'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Product = {
  id: string
  productName: string
  productCode: string
  category: string
  brand: string
  salePrice: number
  supplyPrice: number
  marginRate: number
  stockQty: number
  status: string
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  
  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('LATEST')
  
  // 카테고리 목록 (자동 수집)
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data)
        setFilteredProducts(data)
        setLoading(false)
        
        // 카테고리 목록 추출
        const uniqueCategories = Array.from(new Set(data.map((p: Product) => p.category)))
        setCategories(uniqueCategories as string[])
      })
  }, [])

  // 검색 및 필터링 로직
  useEffect(() => {
    let result = [...products]

    // 검색어 필터
    if (searchTerm) {
      result = result.filter(p => 
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 상태 필터
    if (statusFilter !== 'ALL') {
      result = result.filter(p => p.status === statusFilter)
    }

    // 카테고리 필터
    if (categoryFilter !== 'ALL') {
      result = result.filter(p => p.category === categoryFilter)
    }

    // 정렬
    switch(sortBy) {
      case 'LATEST':
        // 기본 순서 유지
        break
      case 'MARGIN_HIGH':
        result.sort((a, b) => b.marginRate - a.marginRate)
        break
      case 'MARGIN_LOW':
        result.sort((a, b) => a.marginRate - b.marginRate)
        break
      case 'PRICE_LOW':
        result.sort((a, b) => a.salePrice - b.salePrice)
        break
      case 'PRICE_HIGH':
        result.sort((a, b) => b.salePrice - a.salePrice)
        break
    }

    setFilteredProducts(result)
  }, [searchTerm, statusFilter, categoryFilter, sortBy, products])

  const stats = {
    total: products.length,
    onSale: products.filter(p => p.status === 'SALE').length,
    soldOut: products.filter(p => p.status === 'SOLD_OUT').length
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">로딩중...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 대시보드 통계 */}
      <div className="bg-white shadow mb-6">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">상품 관리</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">전체 상품</p>
              <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <p className="text-sm text-green-600 font-medium">판매중</p>
              <p className="text-3xl font-bold text-green-900">{stats.onSale}</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-sm text-gray-600 font-medium">품절</p>
              <p className="text-3xl font-bold text-gray-900">{stats.soldOut}</p>
            </div>
          </div>

          {/* 검색 및 필터 영역 */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            {/* 검색바 */}
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="🔍 상품명 또는 상품코드 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Link
                href="/products/new"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
              >
                상품 등록
              </Link>
              <Link
                href="/products/upload"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap"
              >
                엑셀 업로드
              </Link>
            </div>

            {/* 필터 및 정렬 */}
            <div className="flex gap-3 flex-wrap">
              {/* 상태 필터 */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">전체 상태</option>
                <option value="SALE">판매중</option>
                <option value="SOLD_OUT">품절</option>
                <option value="STOP">판매중지</option>
              </select>

              {/* 카테고리 필터 */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">전체 카테고리</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* 정렬 */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="LATEST">최신순</option>
                <option value="MARGIN_HIGH">마진율 높은순</option>
                <option value="MARGIN_LOW">마진율 낮은순</option>
                <option value="PRICE_HIGH">가격 높은순</option>
                <option value="PRICE_LOW">가격 낮은순</option>
              </select>

              {/* 결과 개수 */}
              <div className="flex items-center px-4 py-2 bg-white rounded-lg border">
                <span className="text-sm text-gray-600">
                  {filteredProducts.length}개 상품
                </span>
              </div>
            </div>
          </div>

          {/* 필터 리셋 버튼 */}
          {(searchTerm || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || sortBy !== 'LATEST') && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('ALL')
                  setCategoryFilter('ALL')
                  setSortBy('LATEST')
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                🔄 필터 초기화
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 상품 목록 테이블 */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상품코드</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">카테고리</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">판매가</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">공급가</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">마진율</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">재고</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || statusFilter !== 'ALL' || categoryFilter !== 'ALL' 
                        ? '검색 결과가 없습니다.' 
                        : '등록된 상품이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link href={`/products/${product.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                          {product.productName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{product.productCode}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{product.category}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{product.salePrice.toLocaleString()}원</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{product.supplyPrice.toLocaleString()}원</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`font-semibold ${product.marginRate >= 40 ? 'text-green-600' : product.marginRate >= 30 ? 'text-blue-600' : 'text-gray-600'}`}>
                          {product.marginRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{product.stockQty}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          product.status === 'SALE' ? 'bg-green-100 text-green-800' :
                          product.status === 'SOLD_OUT' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {product.status === 'SALE' ? '판매중' : product.status === 'SOLD_OUT' ? '품절' : '판매중지'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
