// src/components/products/MarketAnalysisCard.tsx
// C-12: Real-time market competition analysis card for product side panel
// Fetches data from GET /api/naver/market-analysis?q=productName
// Shows: competition level, avg price, total competitors, AI insight

'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Loader, AlertCircle } from 'lucide-react';

interface MarketData {
  competition: {
    totalResults: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
    topSellers: string[];
    priceRange: string;
  };
  insight: {
    summary: string;
    priceSuggestion: string;
    keywordSuggestions: string[];
    competitorTip: string;
    source: string;
  };
}

const LEVEL_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  LOW:       { bg: '#dcfce7', color: '#15803d', label: 'LOW' },
  MEDIUM:    { bg: '#dbeafe', color: '#1d4ed8', label: 'MEDIUM' },
  HIGH:      { bg: '#fef9c3', color: '#a16207', label: 'HIGH' },
  VERY_HIGH: { bg: '#fee2e2', color: '#b91c1c', label: 'VERY HIGH' },
};

export default function MarketAnalysisCard({ productName }: { productName: string }) {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productName) return;
    let cancelled = false;

    async function fetchMarket() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/naver/market-analysis?q=${encodeURIComponent(productName)}`);
        const json = await res.json();
        if (!cancelled) {
          if (json.success) {
            setData(json);
          } else {
            setError(json.error ?? json.help ?? 'Failed to fetch');
          }
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMarket();
    return () => { cancelled = true; };
  }, [productName]);

  if (loading) {
    return (
      <div className="rounded-2xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <div className="flex items-center gap-2">
          <Loader size={14} className="animate-spin" style={{ color: '#0284c7' }} />
          <span className="text-xs font-semibold" style={{ color: '#0284c7' }}>
            Market Analysis (Naver Shopping)
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    // Show setup guide if API key not configured
    if (error.includes('not configured')) {
      return (
        <div className="rounded-2xl p-4" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-2">
            <BarChart3 size={14} style={{ color: '#9ca3af' }} />
            <span className="text-xs font-semibold" style={{ color: '#9ca3af' }}>
              Market Analysis (Naver Open API)
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
            .env.local NAVER_OPENAPI_CLIENT_ID/SECRET
          </p>
        </div>
      );
    }
    return null; // Hide on other errors
  }

  if (!data) return null;

  const { competition: comp, insight } = data;
  const levelStyle = LEVEL_STYLE[comp.competitionLevel] ?? LEVEL_STYLE.MEDIUM;
  const myPriceIsBelow = true; // TODO: compare with product salePrice

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color: '#0369a1' }}>
          Market Analysis (Naver Shopping)
        </span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: levelStyle.bg, color: levelStyle.color }}>
          {levelStyle.label}
        </span>
      </div>

      {/* Competition stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-white rounded-xl p-2 text-center">
          <p style={{ color: '#94a3b8' }}>competitors</p>
          <p className="font-bold text-gray-800">{comp.totalResults.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-2 text-center">
          <p style={{ color: '#94a3b8' }}>avg price</p>
          <p className="font-bold text-gray-800">{comp.avgPrice.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-2 text-center">
          <p style={{ color: '#94a3b8' }}>range</p>
          <p className="font-bold text-gray-800 text-[10px]">{comp.priceRange}</p>
        </div>
      </div>

      {/* Top sellers */}
      {comp.topSellers.length > 0 && (
        <div className="text-xs">
          <span style={{ color: '#64748b' }}>Top: </span>
          <span className="font-semibold" style={{ color: '#334155' }}>
            {comp.topSellers.slice(0, 3).join(' / ')}
          </span>
        </div>
      )}

      {/* AI Insight */}
      {insight.summary && (
        <div className="rounded-xl p-3" style={{ background: '#e0f2fe', border: '1px solid #bae6fd' }}>
          <p className="text-xs leading-relaxed" style={{ color: '#0c4a6e' }}>
            {insight.summary}
          </p>
        </div>
      )}

      {/* Keyword suggestions from AI */}
      {insight.keywordSuggestions && insight.keywordSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {insight.keywordSuggestions.slice(0, 5).map((kw, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: '#dbeafe', color: '#1e40af' }}>
              {kw}
            </span>
          ))}
        </div>
      )}

      {insight.source && (
        <p className="text-[9px] text-right" style={{ color: '#94a3b8' }}>
          via {insight.source === 'groq' ? 'Groq AI' : insight.source}
        </p>
      )}
    </div>
  );
}
