'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProductDetailView from '@/components/products/ProductDetailView';
import DeleteConfirmDialog from '@/components/products/DeleteConfirmDialog';
import NaverUploadButton from '@/components/naver/NaverUploadButton';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setProduct(data.product);
      } else {
        alert('상품을 찾을 수 없습니다.');
        router.push('/products/sourced');
      }
    } catch (error) {
      console.error('상품 불러오기 실패:', error);
      alert('상품 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/products/${params.id}/edit`);
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/products/${params.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ 상품이 삭제되었습니다.');
        router.push('/products/sourced');
      } else {
        alert('삭제 실패: ' + data.error);
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">로딩 중...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">상품을 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">📦 상품 상세</h1>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/products/sourced')}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            목록으로
          </button>
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            ✏️ 수정
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            🗑️ 삭제
          </button>
          <NaverUploadButton product={product} onSuccess={fetchProduct} />
        </div>
      </div>

      <ProductDetailView product={product} />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        productName={product.name}
      />
    </div>
  );
}
