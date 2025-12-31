'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  description: string
  createdAt: string
  updatedAt: string
}

export default function ProductDetail({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed')
        return res.json()
      })
      .then(data => {
        setProduct(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [params.id])

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    const response = await fetch(`/api/products/${params.id}`, {
      method: 'DELETE'
    })

    if (response.ok) {
      alert('삭제되었습니다')
      router.push('/')
    }
  }

  if (loading) return <div className="text-center py-8">로딩중...</div>
  if (!product) return <div className="text-center py-8">상품을 찾을 수 없습니다</div>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{product.productName}</h1>
          <div className="flex gap-2">
            <Link
              href={`/products/${params.id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              수정
            </Link>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              삭제
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">상품코드</h3>
            <p className="text-lg">{product.productCode}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">카테고리</h3>
            <p className="text-lg">{product.category}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">브랜드</h3>
            <p className="text-lg">{product.brand}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">상태</h3>
            <span className={`px-3 py-1 text-sm rounded ${
              product.status === 'SALE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {product.status === 'SALE' ? '판매중' : '판매중지'}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">판매가</h3>
            <p className="text-lg font-semibold text-blue-600">{product.salePrice.toLocaleString()}원</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">공급가</h3>
            <p className="text-lg">{product.supplyPrice.toLocaleString()}원</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">마진율</h3>
            <p className="text-lg font-semibold text-green-600">{product.marginRate.toFixed(2)}%</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">재고수량</h3>
            <p className="text-lg">{product.stockQty}</p>
          </div>
        </div>

        {product.description && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium text-gray-500 mb-2">상품설명</h3>
            <p className="text-gray-700">{product.description}</p>
          </div>
        )}

        <div className="mt-6">
          <Link href="/" className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 inline-block">
            목록으로
          </Link>
        </div>
      </div>
    </div>
  )
}
