'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { safeApiCall, safeNumber, safeString } from '@/lib/api-utils'

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
  productDescription?: string
  status: string
}

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<Product>>({})
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) {
      fetchProduct()
    }
  }, [id])

  const fetchProduct = async () => {
    setLoading(true)
    setError('')
    
    const { data, error } = await safeApiCall<Product>(`/api/products/${id}`)
    
    if (error || !data) {
      setError(error || '상품을 불러올 수 없습니다')
      setLoading(false)
      return
    }
    
    setProduct(data)
    setFormData(data)
    setLoading(false)
  }

  const handleSave = async () => {
    const { data, error } = await safeApiCall<Product>(
      `/api/products/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(formData)
      }
    )
    
    if (error) {
      setMessage('❌ 저장 실패: ' + error)
      setTimeout(() => setMessage(''), 3000)
      return
    }
    
    setMessage('✅ 저장되었습니다')
    setTimeout(() => setMessage(''), 3000)
    setIsEditing(false)
    fetchProduct()
  }

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    
    const { error } = await safeApiCall(`/api/products/${id}`, {
      method: 'DELETE'
    })
    
    if (error) {
      setMessage('❌ 삭제 실패: ' + error)
      setTimeout(() => setMessage(''), 3000)
      return
    }
    
    router.push('/products')
  }

  const generateKeywords = async () => {
    setGenerating(true)
    setMessage('🤖 키워드 생성 중...')
    
    const { data, error } = await safeApiCall<{ keywords: string[] }>(
      `/api/products/${id}/keywords`,
      { method: 'POST' }
    )
    
    if (error || !data) {
      setMessage('❌ 키워드 생성 실패: ' + (error || '알 수 없는 오류'))
      setTimeout(() => setMessage(''), 3000)
      setGenerating(false)
      return
    }
    
    const newKeywords = data.keywords.join(', ')
    setFormData(prev => ({ ...prev, keywords: newKeywords }))
    setProduct(prev => prev ? { ...prev, keywords: newKeywords } : null)
    
    setMessage('✅ 키워드 생성 완료!')
    setTimeout(() => setMessage(''), 3000)
    setGenerating(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">로딩중...</div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error || '상품을 찾을 수 없습니다'}</div>
          <button
            onClick={() => router.push('/products')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {message && (
        <div className={`mb-4 p-3 rounded text-center ${
          message.includes('❌') 
            ? 'bg-red-100 border border-red-300 text-red-800' 
            : 'bg-blue-100 border border-blue-300 text-blue-800'
        }`}>
          {message}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {isEditing ? '상품 수정' : '상품 상세'}
          </h1>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  수정
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  삭제
                </button>
                <button
                  onClick={() => router.push('/products')}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  목록으로
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setFormData(product)
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  취소
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">상품코드</label>
              <input
                type="text"
                value={safeString(formData.productCode)}
                disabled={!isEditing}
                onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">브랜드</label>
              <input
                type="text"
                value={safeString(formData.brand)}
                disabled={!isEditing}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">상품명</label>
            <input
              type="text"
              value={safeString(formData.productName)}
              disabled={!isEditing}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">카테고리</label>
            <input
              type="text"
              value={safeString(formData.category)}
              disabled={!isEditing}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">재고수량</label>
              <input
                type="number"
                value={safeNumber(formData.stockQuantity)}
                disabled={!isEditing}
                onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">도매가</label>
              <input
                type="number"
                value={safeNumber(formData.wholesalePrice)}
                disabled={!isEditing}
                onChange={(e) => setFormData({ ...formData, wholesalePrice: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">판매가</label>
              <input
                type="number"
                value={safeNumber(formData.sellingPrice)}
                disabled={!isEditing}
                onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">마진</label>
              <input
                type="number"
                value={safeNumber(formData.margin)}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">마진율</label>
              <input
                type="text"
                value={`${safeNumber(formData.marginRate).toFixed(2)}%`}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 flex justify-between items-center">
              <span>SEO 키워드</span>
              {!isEditing && (
                <button
                  onClick={generateKeywords}
                  disabled={generating}
                  className={`text-sm px-3 py-1 rounded text-white ${
                    generating 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-purple-500 hover:bg-purple-600'
                  }`}
                >
                  {generating ? '⏳ 생성중...' : '🤖 AI 키워드 생성'}
                </button>
              )}
            </label>
            <input
              type="text"
              value={safeString(formData.keywords)}
              disabled={!isEditing}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              placeholder="키워드가 없습니다. AI 키워드 생성 버튼을 클릭하세요."
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">상품 설명</label>
            <textarea
              value={safeString(formData.productDescription)}
              disabled={!isEditing}
              onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">판매상태</label>
            <select
              value={safeString(formData.status, 'SALE')}
              disabled={!isEditing}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="SALE">판매중</option>
              <option value="SOLD_OUT">품절</option>
              <option value="DISCONTINUED">단종</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
