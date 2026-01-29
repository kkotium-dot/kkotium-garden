'use client';

import SalesChart from '@/components/dashboard/SalesChart';
import RecentOrders from '@/components/dashboard/RecentOrders';

export default function ChartTestPage() {
  // 테스트 데이터
  const testSalesData = [10000, 25000, 18000, 40000, 35000, 50000, 60000];
  const testLabels = ['월', '화', '수', '목', '금', '토', '일'];
  
  const testOrders = [
    {
      id: '1',
      orderNumber: 'ORD20260121001',
      customerName: '홍길동',
      totalPrice: 50000,
      status: 'paid',
      orderDate: new Date().toISOString(),
    },
    {
      id: '2',
      orderNumber: 'ORD20260121002',
      customerName: '김철수',
      totalPrice: 35000,
      status: 'shipping',
      orderDate: new Date().toISOString(),
    },
    {
      id: '3',
      orderNumber: 'ORD20260121003',
      customerName: '이영희',
      totalPrice: 80000,
      status: 'preparing',
      orderDate: new Date().toISOString(),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">🧪 차트 & 컴포넌트 테스트</h1>
      
      {/* 매출 차트 테스트 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">📈 매출 차트 (Canvas)</h2>
        <SalesChart data={testSalesData} labels={testLabels} />
      </div>

      {/* 최근 주문 테이블 테스트 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">📦 최근 주문 테이블</h2>
        <RecentOrders orders={testOrders} />
      </div>

      {/* 빈 데이터 테스트 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
        <h2 className="text-xl font-bold mb-4">⚠️ 빈 데이터 테스트</h2>
        <RecentOrders orders={[]} />
      </div>
    </div>
  );
}
