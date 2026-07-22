// ⚠️ @unmounted — 현재 어떤 화면에도 마운트되지 않은 컴포넌트입니다 (2026-07-22 전수 확인).
// 되살리기 전에 반드시 확인할 것(#292):
//   1. 카운트를 `status`로 세고 있지 않은가 → 처분 판정(disposition)이 정본(#278/#290)
//   2. 링크 목적지가 행동과 맞는가 → 품절·단절은 부활소가 아니라 처분 결정 대기함(#285)
//   3. 문구에 개발 은어가 없는가(#262) / 페르소나 대상이 맞는가(#283)
// 죽은 코드를 그대로 되살리면 이미 고친 결함이 함께 부활합니다.

// src/components/dashboard/KpiCards.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 대시보드 KPI 카드
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use client';

interface Stats {
  totalProducts: number;
  readyProducts: number;
  avgAiScore: number;
  totalRevenue: number;
  period: string;
}

interface Props {
  stats: Stats;
  loading?: boolean;
}

export function KpiCards({ stats, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: '전체 상품',
      value: stats.totalProducts.toLocaleString(),
      icon: '📦',
      color: 'blue',
      subtitle: '등록된 상품 수',
    },
    {
      title: '등록 대기',
      value: stats.readyProducts.toLocaleString(),
      icon: '✅',
      color: 'green',
      subtitle: 'AI 점수 60점 이상',
    },
    {
      title: '평균 AI 점수',
      value: `${stats.avgAiScore}점`,
      icon: '🌸',
      color: 'pink',
      subtitle: getScoreGrade(stats.avgAiScore),
    },
    {
      title: '예상 마진',
      value: `${(stats.totalRevenue / 10000).toFixed(0)}만원`,
      icon: '💰',
      color: 'purple',
      subtitle: '총 예상 수익',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`bg-gradient-to-br ${getGradient(card.color)} rounded-lg shadow-lg p-6 text-white transform hover:scale-105 transition`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">{card.title}</h3>
            <span className="text-2xl">{card.icon}</span>
          </div>
          <div className="text-3xl font-bold mb-1">{card.value}</div>
          <p className="text-xs opacity-80">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}

function getGradient(color: string): string {
  const gradients: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    pink: 'from-pink-500 to-purple-500',
    purple: 'from-purple-500 to-indigo-600',
  };
  return gradients[color] || gradients.blue;
}

function getScoreGrade(score: number): string {
  if (score >= 90) return 'S급 (우수)';
  if (score >= 80) return 'A급 (양호)';
  if (score >= 70) return 'B급 (보통)';
  if (score >= 60) return 'C급 (개선 필요)';
  return 'D급 (재작성 필요)';
}
