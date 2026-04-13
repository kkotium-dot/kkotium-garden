// src/components/dashboard/MarketTrendWidget.tsx
// C-12: Dashboard market trend widget — shows category trends + AI insight
// Fetches top product keywords from DB, then market analysis for each

'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Loader } from 'lucide-react';

interface TrendItem {
  keyword: string;
  level: string;
  avgPrice: number;
  totalResults: number;
}

const LEVEL_BADGE: Record<string, { bg: string; color: string; text: string }> = {
  LOW:       { bg: '#dcfce7', color: '#15803d', text: '\uB0AE\uC74C' },
  MEDIUM:    { bg: '#dbeafe', color: '#1d4ed8', text: '\uBCF4\uD1B5' },
  HIGH:      { bg: '#fef9c3', color: '#a16207', text: '\uB192\uC74C' },
  VERY_HIGH: { bg: '#fee2e2', color: '#b91c1c', text: '\uCE58\uC5F4' },
};

interface Props {
  products: Array<{ name: string; keywords?: string[] }>;
  productsLoading: boolean;
}

export default function MarketTrendWidget({ products, productsLoading }: Props) {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState('');

  useEffect(() => {
    if (productsLoading || products.length === 0) return;

    // Pick top 3 product names for trend analysis
    const names = products.slice(0, 3).map(p => p.name);
    if (names.length === 0) return;

    let cancelled = false;
    setLoading(true);

    Promise.allSettled(
      names.map(name =>
        fetch(`/api/naver/market-analysis?q=${encodeURIComponent(name)}`)
          .then(r => r.json())
          .then(j => {
            if (j.success && j.competition) {
              return {
                keyword: name.length > 15 ? name.slice(0, 15) + '...' : name,
                level: j.competition.competitionLevel,
                avgPrice: j.competition.avgPrice,
                totalResults: j.competition.totalResults,
              } as TrendItem;
            }
            return null;
          })
      )
    ).then(results => {
      if (cancelled) return;
      const items = results
        .filter((r): r is PromiseFulfilledResult<TrendItem | null> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter((v): v is TrendItem => v !== null);

      setTrends(items);

      // Generate simple insight from data
      if (items.length > 0) {
        const lowComp = items.filter(i => i.level === 'LOW' || i.level === 'MEDIUM');
        const highComp = items.filter(i => i.level === 'HIGH' || i.level === 'VERY_HIGH');
        if (lowComp.length > highComp.length) {
          setInsight('\uB0B4 \uC0C1\uD488\uB4E4\uC758 \uACBD\uC7C1\uB3C4\uAC00 \uB0AE\uC740 \uD3B8\uC774\uC5D0\uC694. \uAC00\uACA9 \uACBD\uC7C1\uB825\uC744 \uC720\uC9C0\uD558\uBA74 \uC0C1\uC704 \uB178\uCD9C\uC774 \uC720\uB9AC\uD574\uC694!');
        } else if (highComp.length > 0) {
          setInsight('\uACBD\uC7C1\uC774 \uCE58\uC5F4\uD55C \uC0C1\uD488\uC774 \uC788\uC5B4\uC694. \uD2C8\uC0C8 \uD0A4\uC6CC\uB4DC\uC640 \uCC28\uBCC4\uD654 \uC804\uB7B5\uC73C\uB85C \uACBD\uC7C1\uC744 \uD53C\uD574\uBCF4\uC138\uC694!');
        } else {
          setInsight('\uC0C1\uD488\uBCC4 \uC2DC\uC7A5 \uBD84\uC11D\uC744 \uD655\uC778\uD558\uACE0 \uAC00\uACA9 \uC804\uB7B5\uC744 \uC218\uB9BD\uD574\uBCF4\uC138\uC694.');
        }
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [products, productsLoading]);

  if (productsLoading || loading) {
    return (
      <div className="rounded-2xl p-5" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <div className="flex items-center gap-2">
          <Loader size={14} className="animate-spin" style={{ color: '#0284c7' }} />
          <span className="text-xs font-semibold" style={{ color: '#0284c7' }}>
            {'\uC2DC\uC7A5 \uD2B8\uB80C\uB4DC \uBD84\uC11D \uC911...'}
          </span>
        </div>
      </div>
    );
  }

  if (trends.length === 0) return null;

  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 size={15} style={{ color: '#0369a1' }} />
        <span className="text-sm font-bold" style={{ color: '#0369a1' }}>
          {'\uB0B4 \uC0C1\uD488 \uC2DC\uC7A5 \uD2B8\uB80C\uB4DC'}
        </span>
      </div>

      {/* Trend items */}
      <div className="space-y-2">
        {trends.map((item, i) => {
          const badge = LEVEL_BADGE[item.level] ?? LEVEL_BADGE.MEDIUM;
          return (
            <div key={i} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-800 truncate">{item.keyword}</p>
                <p className="text-[10px]" style={{ color: '#94a3b8' }}>
                  {`\uACBD\uC7C1 ${item.totalResults.toLocaleString()}\uAC1C \u00B7 \uD3C9\uADE0 ${item.avgPrice.toLocaleString()}\uC6D0`}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2"
                style={{ background: badge.bg, color: badge.color }}>
                {badge.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Kkotti insight */}
      {insight && (
        <div className="rounded-xl p-3" style={{ background: '#e0f2fe', border: '1px solid #bae6fd' }}>
          <p className="text-xs leading-relaxed" style={{ color: '#0c4a6e' }}>
            {insight}
          </p>
        </div>
      )}
    </div>
  );
}
