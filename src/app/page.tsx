'use client';

import { useState, useEffect } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  category: string;
  supplier: string;
  stockStatus: string;
  createdAt: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    originalPrice: '',
    category: '생활용품',
    supplier: '도매꾹',
    stockStatus: '재고있음',
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // 상품 목록 불러오기
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('상품 조회 실패:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 상품 등록/수정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        alert(editingId ? '상품이 수정되었습니다!' : '상품이 등록되었습니다!');
        setFormData({
          name: '',
          price: '',
          originalPrice: '',
          category: '생활용품',
          supplier: '도매꾹',
          stockStatus: '재고있음',
        });
        setEditingId(null);
        fetchProducts();
      } else {
        alert('실패: ' + data.error);
      }
    } catch (error) {
      console.error('오류:', error);
      alert('오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 수정 버튼 클릭
  const handleEdit = (product: Product) => {
    setFormData({
      name: product.name,
      price: product.price.toString(),
      originalPrice: product.originalPrice.toString(),
      category: product.category,
      supplier: product.supplier,
      stockStatus: product.stockStatus,
    });
    setEditingId(product.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 삭제 버튼 클릭
  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        alert('상품이 삭제되었습니다');
        fetchProducts();
      } else {
        alert('삭제 실패: ' + data.error);
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다');
    }
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setFormData({
      name: '',
      price: '',
      originalPrice: '',
      category: '생활용품',
      supplier: '도매꾹',
      stockStatus: '재고있음',
    });
    setEditingId(null);
  };

  const marginPercent = formData.price && formData.originalPrice
    ? (((parseFloat(formData.price) - parseFloat(formData.originalPrice)) / parseFloat(formData.originalPrice)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-pink-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-pink-600 mb-8">
          꽃티움가든 상품 관리
        </h1>

        {/* 상품 등록/수정 폼 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            {editingId ? '✏️ 상품 수정' : '+ 새 상품 등록'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상품명
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="손수건 3종 휴지"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  카테고리
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option>생활용품</option>
                  <option>주방용품</option>
                  <option>욕실용품</option>
                  <option>인테리어</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  판매가 (원)
                </label>
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="21000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  원가 (원)
                </label>
                <input
                  type="number"
                  required
                  value={formData.originalPrice}
                  onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="12000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  마진율
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-md text-lg font-semibold text-blue-600">
                  {marginPercent}%
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  공급업체
                </label>
                <select
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option>도매꾹</option>
                  <option>오늘의도매</option>
                  <option>삼익상사</option>
                  <option>직접구매</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md disabled:bg-gray-400"
              >
                {loading ? '처리중...' : editingId ? '수정 완료' : '상품 등록'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-md"
                >
                  취소
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 상품 목록 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            📦 등록된 상품 목록 ({products.length}개)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2">상품명</th>
                  <th className="text-left py-3 px-2">판매가</th>
                  <th className="text-left py-3 px-2">원가</th>
                  <th className="text-left py-3 px-2">마진율</th>
                  <th className="text-left py-3 px-2">카테고리</th>
                  <th className="text-left py-3 px-2">공급업체</th>
                  <th className="text-center py-3 px-2">관리</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const margin = (((product.price - product.originalPrice) / product.originalPrice) * 100).toFixed(1);
                  return (
                    <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-2">{product.name}</td>
                      <td className="py-3 px-2">{product.price.toLocaleString()}원</td>
                      <td className="py-3 px-2">{product.originalPrice.toLocaleString()}원</td>
                      <td className="py-3 px-2 font-semibold text-blue-600">{margin}%</td>
                      <td className="py-3 px-2">{product.category}</td>
                      <td className="py-3 px-2">{product.supplier}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(product)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {products.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                등록된 상품이 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
