'use client';

import { useEffect, useState } from 'react';

interface Product {
  id: string;
  supplierPrice: number;
  salePrice: number;
  margin: number;
  status: string;
}

interface ProductStatsProps {
  products: Product[];
}

interface Stats {
  total: number;
  published: number;
  draft: number;
  todo: number;
  avgMargin: number;
  totalRevenue: number;
}

export default function ProductStats({ products }: ProductStatsProps) {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    published: 0,
    draft: 0,
    todo: 0,
    avgMargin: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    const published = products.filter(p => p.status === 'published').length;
    const draft = products.filter(p => p.status === 'draft').length;
    const todo = products.filter(p => p.status === 'todo').length;

    const margins = products.map(p => p.margin || 0).filter(m => m > 0);
    const avgMargin = margins.length > 0 
      ? margins.reduce((a, b) => a + b, 0) / margins.length 
      : 0;

    const totalRevenue = products
      .filter(p => p.status === 'published')
      .reduce((sum, p) => sum + (p.salePrice || 0), 0);

    setStats({
      total: products.length,
      published,
      draft,
      todo,
      avgMargin,
      totalRevenue,
    });
  }, [products]);

  const statCards = [
    {
      icon: '📦',
      label: '전체 상품',
      value: stats.total,
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: '✅',
      label: '판매중',
      value: stats.published,
      color: 'from-green-500 to-green-600',
    },
    {
      icon: '📝',
      label: '초안',
      value: stats.draft,
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      icon: '⏳',
      label: '준비중',
      value: stats.todo,
      color: 'from-gray-500 to-gray-600',
    },
    {
      icon: '📈',
      label: '평균 마진',
      value: `${stats.avgMargin.toFixed(1)}%`,
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: '💰',
      label: '판매 총액',
      value: `${(stats.totalRevenue / 10000).toFixed(0)}만원`,
      color: 'from-pink-500 to-pink-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {statCards.map((card, index) => (
        <div
          key={index}
          className={`bg-gradient-to-br ${card.color} rounded-lg p-4 text-white shadow-lg hover:shadow-xl transition-shadow`}
        >
          <div className="text-3xl mb-2">{card.icon}</div>
          <div className="text-sm opacity-90 mb-1">{card.label}</div>
          <div className="text-2xl font-bold">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
