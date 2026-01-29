'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';

interface Product {
  id: string;  // number → string (cuid)
  name: string;
  salePrice: number;  // price → salePrice
  supplierPrice: number;  // originalPrice → supplierPrice
  category: string | null;
  vendorName: string | null;
  status: string;
  naver_title?: string | null;
  naver_keywords?: string | null;
  seo_description?: string | null;
}

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: () => void;
}

export default function ProductEditModal({
  isOpen,
  onClose,
  product,
  onSuccess,
}: ProductEditModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    salePrice: '',
    supplierPrice: '',
    category: '',
    vendorName: '',
    status: 'todo',
    naver_title: '',
    naver_keywords: '',
    seo_description: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        salePrice: product.salePrice.toString(),
        supplierPrice: product.supplierPrice.toString(),
        category: product.category || '',
        vendorName: product.vendorName || '',
        status: product.status,
        naver_title: product.naver_title || '',
        naver_keywords: product.naver_keywords || '',
        seo_description: product.seo_description || '',
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/products?id=${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ 상품 & Naver SEO 수정 완료!');
        onSuccess();
        onClose();
      } else {
        alert(`❌ 수정 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('수정 오류:', error);
      alert('❌ 수정 중 오류 발생');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="상품 수정">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">상품명 *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">판매가 *</label>
          <input
            type="number"
            value={formData.salePrice}
            onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">공급가 *</label>
          <input
            type="number"
            value={formData.supplierPrice}
            onChange={(e) => setFormData({ ...formData, supplierPrice: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
          >
            <option value="">선택 안 함</option>
            <option value="화훼">화훼</option>
            <option value="원예">원예</option>
            <option value="주방용품">주방용품</option>
            <option value="생활용품">생활용품</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">공급업체</label>
          <select
            value={formData.vendorName}
            onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
          >
            <option value="">선택 안 함</option>
            <option value="도매꾹">도매꾹</option>
            <option value="해피바스">해피바스</option>
            <option value="기타">기타</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">상태 *</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input type="radio" value="todo" checked={formData.status === 'todo'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="mr-2" />
              <span>준비중</span>
            </label>
            <label className="flex items-center">
              <input type="radio" value="active" checked={formData.status === 'active'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="mr-2" />
              <span>판매중</span>
            </label>
            <label className="flex items-center">
              <input type="radio" value="done" checked={formData.status === 'done'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="mr-2" />
              <span>완료</span>
            </label>
          </div>
        </div>

        {/* Naver SEO 섹션 */}
        <div className="mt-6 p-4 border-2 border-blue-200 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="font-bold text-lg mb-4 text-blue-800">
            🌟 Naver SEO 최적화
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Naver 제목</label>
              <input
                type="text"
                value={formData.naver_title}
                onChange={(e) => setFormData({ ...formData, naver_title: e.target.value })}
                placeholder="Naver 검색 1위 제목 (60자)"
                maxLength={60}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-blue-600 mt-1">{formData.naver_title.length}/60</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Naver 키워드</label>
              <input
                type="text"
                value={formData.naver_keywords}
                onChange={(e) => setFormData({ ...formData, naver_keywords: e.target.value })}
                placeholder="화분,실내식물,공기정화"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">SEO 설명</label>
              <textarea
                rows={3}
                value={formData.seo_description}
                onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                placeholder="검색 시 노출될 설명 (150자)"
                maxLength={150}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-blue-600 mt-1">{formData.seo_description.length}/150</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            disabled={isLoading}
          >
            취소
          </button>
          <button
            type="submit"
            className="px-6 py-2 text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg hover:from-pink-600 hover:to-pink-700 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? '저장 중...' : '💾 저장하기'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
