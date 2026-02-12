'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import ProductForm from '@/components/product/ProductForm';
import ImageUploader from '@/components/products/ImageUploader';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);

  const handleSave = async (formData: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setProductId(data.product.id);
        alert('✅ 상품이 등록되었습니다!');
        router.push('/products/sourced');
        router.refresh();
      } else {
        alert(data.error || '상품 등록 실패');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/products/sourced" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">상품 등록</h1>
            <p className="text-sm text-gray-500">새 상품을 등록하고 SEO를 최적화하세요</p>
          </div>
        </div>
      </div>

      <ProductForm 
        initialData={{}}
        onSave={handleSave}
        loading={loading}
        mode="create"
      />
    </div>
  );
}
