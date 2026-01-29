'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SalesChartProps {
  data: number[];      // ✅ 필드명 추가
  labels: string[];
}

export default function SalesChart({ data, labels }: SalesChartProps) {
  // 데이터 변환: recharts 형식
  const chartData = labels.map((label, index) => ({
    name: label,
    매출액: data[index] || 0,
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold mb-4">📈 매출 추이</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip 
            formatter={(value: number) => 
              new Intl.NumberFormat('ko-KR', {
                style: 'currency',
                currency: 'KRW'
              }).format(value)
            }
          />
          <Line 
            type="monotone" 
            dataKey="매출액" 
            stroke="#ec4899" 
            strokeWidth={2}
            dot={{ fill: '#ec4899', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
