// ⚠️ @unmounted — 현재 어떤 화면에도 마운트되지 않은 컴포넌트입니다 (2026-07-22 전수 확인).
// 되살리기 전에 반드시 확인할 것(#292):
//   1. 카운트를 `status`로 세고 있지 않은가 → 처분 판정(disposition)이 정본(#278/#290)
//   2. 링크 목적지가 행동과 맞는가 → 품절·단절은 부활소가 아니라 처분 결정 대기함(#285)
//   3. 문구에 개발 은어가 없는가(#262) / 페르소나 대상이 맞는가(#283)
// 죽은 코드를 그대로 되살리면 이미 고친 결함이 함께 부활합니다.

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
