'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import NaverSeoProductTable from '@/components/naver-seo/NaverSeoProductTable';
import BulkEditModal, { BulkEditData } from '@/components/naver-seo/BulkEditModal';
import AiBulkGenerateModal from '@/components/naver-seo/AiBulkGenerateModal';
import AiProgressModal from '@/components/naver-seo/AiProgressModal';

interface Product {
  id: string;
  name: string;
  mainImage: string | null;
  salePrice: number;
  naver_title: string | null;
  naver_keywords: string | null;
  naver_description: string | null;
  naver_brand: string | null;
  naver_origin: string | null;
  naver_material: string | null;
  naver_care_instructions: string | null;
  seoScore: number;
  suggestions: string[];
  needsImprovement: boolean;
  keywordCount: number;
  imageCount: number;
}

export default function NaverSeoPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'perfect' | 'good' | 'fair' | 'poor'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showAiBulkModal, setShowAiBulkModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentProduct: '' });

  useEffect(() => {
    fetchProducts();
  }, [filter, searchQuery]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('filter', filter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch('/api/naver-seo/products?' + params.toString());
      const data = await response.json();

      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('상품 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (productId: string) => {
    router.push('/products/' + productId + '/edit');
  };

  const handleBulkEdit = async (data: BulkEditData) => {
    try {
      const response = await fetch('/api/naver-seo/bulk-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: selectedIds,
          updates: data,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('🎉 ' + result.updatedCount + '개 상품이 수정되었습니다!');
        setSelectedIds([]);
        fetchProducts();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('일괄 수정 실패:', error);
      toast.error('일괄 수정에 실패했습니다');
      throw error;
    }
  };

  const handleAiGenerate = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error('상품을 찾을 수 없습니다');

      const loadingToast = toast.loading('🤖 AI가 최적화 중입니다...');

      const response = await fetch('/api/naver-seo/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
        }),
      });

      const result = await response.json();

      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success('✨ AI 최적화가 완료되었습니다!');
        fetchProducts();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('AI 생성 실패:', error);
      toast.error('AI 생성에 실패했습니다');
      throw error;
    }
  };

  const handleAiBulkGenerate = async () => {
    try {
      setShowProgressModal(true);
      setProgress({ current: 0, total: selectedIds.length, currentProduct: '' });

      const response = await fetch('/api/naver-seo/ai-generate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: selectedIds,
        }),
      });

      const result = await response.json();

      setShowProgressModal(false);

      if (result.success) {
        const successMsg = '🎉 ' + result.successCount + '개 상품 AI 최적화 완료!';
        const failMsg = result.failCount > 0 ? '\n⚠️ ' + result.failCount + '개 실패' : '';
        toast.success(successMsg + failMsg, { duration: 5000 });
        setSelectedIds([]);
        fetchProducts();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('AI 일괄 생성 실패:', error);
      setShowProgressModal(false);
      toast.error('AI 일괄 생성에 실패했습니다');
      throw error;
    }
  };

  const stats = {
    total: products.length,
    perfect: products.filter((p) => p.seoScore === 100).length,
    good: products.filter((p) => p.seoScore >= 80 && p.seoScore < 100).length,
    fair: products.filter((p) => p.seoScore >= 70 && p.seoScore < 80).length,
    poor: products.filter((p) => p.seoScore < 70).length,
    avgScore: products.length > 0
      ? Math.round(products.reduce((sum, p) => sum + p.seoScore, 0) / products.length)
      : 0,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">상품 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold text-gray-900">네이버 SEO 최적화</h1>
          </div>
          <p className="text-gray-600">상품별 SEO 점수를 확인하고 최적화하세요</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:col-span-2">
            <p className="text-sm text-gray-600 mb-1">평균 SEO 점수</p>
            <h3 className="text-3xl font-bold text-purple-600">{stats.avgScore}점</h3>
          </div>
          <div className={'bg-white rounded-lg shadow-sm border-2 p-6 cursor-pointer transition ' + (filter === 'perfect' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300')} onClick={() => setFilter(filter === 'perfect' ? 'all' : 'perfect')}>
            <p className="text-xs text-gray-600 mb-1">100점</p>
            <h3 className="text-2xl font-bold text-purple-600">{stats.perfect}</h3>
            <p className="text-xs text-gray-500 mt-1">완벽</p>
          </div>
          <div className={'bg-white rounded-lg shadow-sm border-2 p-6 cursor-pointer transition ' + (filter === 'good' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300')} onClick={() => setFilter(filter === 'good' ? 'all' : 'good')}>
            <p className="text-xs text-gray-600 mb-1">80-99점</p>
            <h3 className="text-2xl font-bold text-green-600">{stats.good}</h3>
            <p className="text-xs text-gray-500 mt-1">양호</p>
          </div>
          <div className={'bg-white rounded-lg shadow-sm border-2 p-6 cursor-pointer transition ' + (filter === 'fair' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300')} onClick={() => setFilter(filter === 'fair' ? 'all' : 'fair')}>
            <p className="text-xs text-gray-600 mb-1">70-79점</p>
            <h3 className="text-2xl font-bold text-blue-600">{stats.fair}</h3>
            <p className="text-xs text-gray-500 mt-1">보통</p>
          </div>
          <div className={'bg-white rounded-lg shadow-sm border-2 p-6 cursor-pointer transition ' + (filter === 'poor' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300')} onClick={() => setFilter(filter === 'poor' ? 'all' : 'poor')}>
            <p className="text-xs text-gray-600 mb-1">0-69점</p>
            <h3 className="text-2xl font-bold text-orange-600">{stats.poor}</h3>
            <p className="text-xs text-gray-500 mt-1">개선필요</p>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="상품명으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div className="mb-6 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            총 {products.length}개 상품 {selectedIds.length > 0 && '(' + selectedIds.length + '개 선택)'}
          </p>
          <div className="flex gap-3">
            {selectedIds.length > 0 && (
              <>
                <button onClick={handleAiBulkGenerate} className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition flex items-center gap-2 shadow-md">
                  <span>🤖</span>
                  <span>{selectedIds.length}개 AI 최적화</span>
                </button>
                <button onClick={() => setShowBulkEditModal(true)} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2">
                  <span>⚡</span>
                  <span>{selectedIds.length}개 일괄 수정</span>
                </button>
              </>
            )}
            {(filter !== 'all' || searchQuery) && (
              <button onClick={() => { setFilter('all'); setSearchQuery(''); }} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                필터 초기화
              </button>
            )}
          </div>
        </div>

        <NaverSeoProductTable
          products={products}
          onProductClick={handleProductClick}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onAiGenerate={handleAiGenerate}
          onRefresh={fetchProducts}
        />

        {showBulkEditModal && (
          <BulkEditModal
            isOpen={showBulkEditModal}
            onClose={() => setShowBulkEditModal(false)}
            onSubmit={handleBulkEdit}
            selectedCount={selectedIds.length}
          />
        )}

        {showAiBulkModal && (
          <AiBulkGenerateModal
            isOpen={showAiBulkModal}
            onClose={() => setShowAiBulkModal(false)}
            onConfirm={handleAiBulkGenerate}
            selectedCount={selectedIds.length}
          />
        )}

        {showProgressModal && (
          <AiProgressModal
            isOpen={showProgressModal}
            current={progress.current}
            total={progress.total}
            currentProduct={progress.currentProduct}
          />
        )}
      </div>
    </div>
  );
}
