'use client'

import { useEffect, useState, FormEvent } from 'react'
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
  stockQty: number
  status: string
  description: string
}

export default function EditProduct({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<Product>({
    id: '',
    productName: '',
    productCode: '',
    category: '',
    brand: '',
    salePrice: 0,
    supplyPrice: 0,
    stockQty: 0,
    status: 'SALE',
    description: ''
  })

  // 마진율 계산
  const marginRate = formData.salePrice > 0 
    ? ((formData.salePrice - formData.supplyPrice) / formData.salePrice) * 100 
    : 0

  const profit = formData.salePrice - formData.supplyPrice

  useEffect(() => {
    fetch(`/api/products/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setFormData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        alert('상품을 불러올 수 없습니다')
        router.push('/')
      })
  }, [params.id, router])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch(`/api/products/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          marginRate
        })
      })

      if (response.ok) {
        alert('수정되었습니다')
        router.push(`/products/${params.id}`)
      } else {
        alert('수정 실패')
        setSubmitting(false)
      }
    } catch (error) {
      alert('오류가 발생했습니다')
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">로딩중...</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">상품 수정</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상품명 *
              </label>
              <input
                type="text"
                required
                value={formData.productName}
                onChange={e => setFormData({...formData, productName: e.target.value})}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상품코드 *
              </label>
              <input
                type="text"
                required
                value={formData.productCode}
                onChange={e => setFormData({...formData, productCode: e.target.value})}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리 *
              </label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                브랜드
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={e => setFormData({...formData, brand: e.target.value})}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                판매가 *
              </label>
              <input
                type="number"
                required
                value={formData.salePrice}
                onChange={e => setFormData({...formData, salePrice: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                공급가 *
              </label>
              <input
                type="number"
                required
                value={formData.supplyPrice}
                onChange={e => setFormData({...formData, supplyPrice: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                재고수량 *
              </label>
              <input
                type="number"
                required
                value={formData.stockQty}
                onChange={e => setFormData({...formData, stockQty: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상태 *
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="SALE">판매중</option>
                <option value="SOLD_OUT">품절</option>
                <option value="STOP">판매중지</option>
              </select>
            </div>
          </div>

          {/* 마진율 미리보기 */}
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">💰 마진 정보</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">순이익</p>
                <p className="text-lg font-semibold text-blue-600">
                  {profit.toLocaleString()}원
                </p>
              </div>
              <div>
                <p className="text-gray-600">마진율</p>
                <p className="text-lg font-semibold text-green-600">
                  {marginRate.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-gray-600">예상 수익 (재고 전체)</p>
                <p className="text-lg font-semibold text-purple-600">
                  {(profit * formData.stockQty).toLocaleString()}원
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상품설명
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              rows={4}
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {submitting ? '저장중...' : '수정 완료'}
            </button>
            <Link
              href={`/products/${params.id}`}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 inline-block"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
