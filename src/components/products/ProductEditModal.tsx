'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  imageUrl?: string | null;
  category?: string | null;
  vendorName?: string | null;
  status: string;
}

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: () => void;
}

const ProductEditModal = ({ isOpen, onClose, product, onSuccess }: ProductEditModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    originalPrice: '',
    category: '',
    vendorName: '',
    status: 'todo',
  });
  const [loading, setLoading] = useState(false);

  // product가 변경되면 formData 업데이트
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        price: product.price.toString(),
        originalPrice: product.originalPrice.toString(),
        category: product.category || '',
        vendorName: product.vendorName || '',
        status: product.status,
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/products?id=${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        alert('상품이 수정되었습니다!');
        onSuccess();
        onClose();
      } else {
        alert(data.error || '수정 실패');
      }
    } catch (error) {
      console.error('수정 실패:', error);
      alert('수정 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="상품 수정" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 상품명 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-dark mb-1 font-pretendard">
              상품명 <span className="text-red">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-beige rounded-lg focus:outline-none focus:border-pink-main font-pretendard"
              required
            />
          </div>

          {/* 판매가 */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1 font-pretendard">
              판매가 (원) <span className="text-red">*</span>
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-2 border border-beige rounded-lg focus:outline-none focus:border-pink-main font-pretendard"
              required
            />
          </div>

          {/* 원가 */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1 font-pretendard">
              원가 (원) <span className="text-red">*</span>
            </label>
            <input
              type="number"
              value={formData.originalPrice}
              onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
              className="w-full px-4 py-2 border border-beige rounded-lg focus:outline-none focus:border-pink-main font-pretendard"
              required
            />
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1 font-pretendard">
              카테고리
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-beige rounded-lg focus:outline-none focus:border-pink-main font-pretendard"
            >
              <option value="">카테고리 선택</option>
              <option value="홈데코">홈데코</option>
              <option value="주방용품">주방용품</option>
              <option value="생활용품">생활용품</option>
              <option value="패브릭">패브릭</option>
            </select>
          </div>

          {/* 공급업체 */}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1 font-pretendard">
              공급업체
            </label>
            <select
              value={formData.vendorName}
              onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
              className="w-full px-4 py-2 border border-beige rounded-lg focus:outline-none focus:border-pink-main font-pretendard"
            >
              <option value="">공급업체 선택</option>
              <option value="도매꾹">도매꾹</option>
              <option value="도매매">도매매</option>
              <option value="직접입력">직접입력</option>
            </select>
          </div>

          {/* 상태 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-dark mb-1 font-pretendard">
              상태
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="todo"
                  checked={formData.status === 'todo'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-4 h-4 text-pink-main"
                />
                <span className="text-sm font-pretendard">등록대기</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={formData.status === 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-4 h-4 text-pink-main"
                />
                <span className="text-sm font-pretendard">판매중</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="done"
                  checked={formData.status === 'done'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-4 h-4 text-pink-main"
                />
                <span className="text-sm font-pretendard">완료</span>
              </label>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 justify-end pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? '수정 중...' : '수정 완료'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductEditModal;
