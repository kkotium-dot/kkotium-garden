'use client';

import { useEffect, useState } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  status: string;
  registeredAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch('/api/products');

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log('API Response:', data);

        if (!isMounted) return;

        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          throw new Error('응답 형식이 올바르지 않습니다');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">에러: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        상품 목록 ({products.length}개)
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products
          .filter((p) => p.status === '판매중')
          .map((product) => (
            <div key={product.id} className="border p-4 rounded">
              <h3 className="font-bold">{product.name}</h3>
              <p>가격: {product.price.toLocaleString()}원</p>
              <p>재고: {product.stock}개</p>
              <p className="text-sm text-gray-500">{product.registeredAt}</p>
            </div>
          ))}
      </div>
    </div>
  );
}