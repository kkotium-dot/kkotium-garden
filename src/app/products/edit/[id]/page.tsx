'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  sku: string;
  vendorCode: string | null;
  supplierPrice: number;
  salePrice: number;
  status: string;
  supplier: {
    id: string;
    name: string;
    platform: string;
  };
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    vendorCode: '',
    supplierPrice: '',
    salePrice: '',
    status: 'todo'
  });

  const [supplierInfo, setSupplierInfo] = useState({ name: '', platform: '' });

  useEffect(() => {
    fetchProduct();
  }, []);

  async function fetchProduct() {
    try {
      const response = await fetch(`/api/products/${productId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '상품을 불러올 수 없습니다');
      }

      const product = data.product;
      setFormData({
        name: product.name,
        sku: product.sku,
        vendorCode: product.vendorCode || '',
        supplierPrice: product.supplierPrice.toString(),
        salePrice: product.salePrice.toString(),
        status: product.status
      });

      setSupplierInfo({
        name: product.supplier.name,
        platform: product.supplier.platform
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function calculateMargin() {
    const supplier = parseFloat(formData.supplierPrice) || 0;
    const sale = parseFloat(formData.salePrice) || 0;
    if (sale === 0) return '0.0';
    return (((sale - supplier) / sale) * 100).toFixed(1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku,
          vendorCode: formData.vendorCode,
          supplierPrice: parseInt(formData.supplierPrice),
          salePrice: parseInt(formData.salePrice),
          status: formData.status
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '상품 수정 실패');
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('정말 이 상품을 삭제하시겠습니까?')) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '상품 삭제 실패');
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-700 mb-2">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">✏️ 상품 수정</h1>
            <button
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-800 transition"
            >
              ← 목록으로
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">⚠️ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 공급업체 정보 (읽기 전용) */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">공급업체</h3>
              <p className="text-gray-900">{supplierInfo.name} ({supplierInfo.platform})</p>
              <p className="text-xs text-gray-500 mt-1">* 공급업체는 변경할 수 없습니다</p>
            </div>

            {/* 상품 정보 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">상품 정보</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상품명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    업체 상품 코드
                  </label>
                  <input
                    type="text"
                    name="vendorCode"
                    value={formData.vendorCode}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* 가격 정보 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">가격 정보</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    공급가 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="supplierPrice"
                    value={formData.supplierPrice}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    판매가 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {formData.supplierPrice && formData.salePrice && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    예상 마진율: <span className="text-2xl font-bold text-green-600">{calculateMargin()}%</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    마진액: {(parseFloat(formData.salePrice) - parseFloat(formData.supplierPrice)).toLocaleString()}원
                  </p>
                </div>
              )}
            </div>

            {/* 상태 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                등록 상태
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todo">미등록</option>
                <option value="done">등록완료</option>
              </select>
            </div>

            {/* 버튼 */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
