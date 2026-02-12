'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Eye, Loader2, AlertCircle } from 'lucide-react';
import ProductForm from '@/components/product/ProductForm';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // 안전한 데이터 로드
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/products/${productId}`);

        if (!res.ok) {
          throw new Error(`상품 조회 실패: ${res.status}`);
        }

        const data = await res.json();

        if (data.success && data.product) {
          // SEO 필드 안전 처리
          const safeData = {
            ...data.product,
            seo: {
              title: data.product.title || '',
              description: data.product.description || '',
              keywords: data.product.keywords || '',
              naver_title: data.product.naver_title || '',
              naver_description: data.product.naver_description || '',
              og_image: data.product.og_image || '',
              seo_score: data.product.seo_score || 0,
            }
          };
          setInitialData(safeData);
        } else {
          setError('상품을 찾을 수 없습니다');
        }
      } catch (err: any) {
        console.error('상품 로드 오류:', err);
        setError(err.message || '상품 정보를 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const handleSave = async (formData: any) => {
    setSaveLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        alert('✅ 상품 수정 완료!');
        router.push('/products/sourced');
        router.refresh();
      } else {
        alert(data.error || '수정 실패');
      }
    } catch (error) {
      alert('서버 오류 발생');
    } finally {
      setSaveLoading(false);
    }
  };

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <Loader2 className="w-16 h-16 animate-spin text-pink-500 mx-auto mb-6" />
          <p className="text-xl font-medium text-gray-700 mb-2">상품 정보를 불러오는 중...</p>
          <p className="text-gray-500">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  // 에러
  if (error || !initialData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto p-8 bg-white rounded-2xl shadow-xl">
          <div className="text-center mb-8">
            <AlertCircle className="w-20 h-20 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">상품을 찾을 수 없습니다</h2>
            <p className="text-gray-500 mb-6">{error || 'ID: ' + productId}</p>
          </div>
          <Link
            href="/products/sourced"
            className="w-full bg-gradient-to-r from-pink-500 to-pink-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-pink-600 hover:to-pink-700 flex items-center justify-center gap-2"
          >
            소싱 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/products/sourced" className="p-3 hover:bg-gray-100 rounded-xl transition-all">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{initialData.name || '상품 수정'}</h1>
            <p className="text-lg text-gray-600">SEO 점수: {initialData.seo_score || 0}/110</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href={`/products/${productId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 flex items-center gap-2 font-medium transition-all"
          >
            <Eye className="w-5 h-5" />
            미리보기
          </Link>
        </div>
      </div>

      <ProductForm
        productId={productId}
        initialData={initialData}
        loading={saveLoading}
        mode="edit"
      />
    </div>
  );
}
