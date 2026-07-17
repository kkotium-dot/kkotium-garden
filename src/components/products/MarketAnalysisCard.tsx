// src/components/products/MarketAnalysisCard.tsx
// C-12: Real-time market competition analysis card for product side panel
// Fetches data from GET /api/naver/market-analysis?q=productName
// Shows: competition level, avg price, total competitors, AI insight

'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Loader } from 'lucide-react';

interface MarketData {
  competition: {
    totalResults: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
    topSellers: string[];
    priceRange: string;
    // R-1 (2026-07-17) — 자사 제외 후 실제 통계를 낸 경쟁상품 표본 크기.
    sampleSize?: number;
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
  LOW:       { bg: '#dcfce7', color: '#15803d', label: '\uACBD\uC7C1 \uB0AE\uC74C' },
  MEDIUM:    { bg: '#dbeafe', color: '#1d4ed8', label: '\uACBD\uC7C1 \uBCF4\uD1B5' },
  HIGH:      { bg: '#fef9c3', color: '#a16207', label: '\uACBD\uC7C1 \uB192\uC74C' },
  VERY_HIGH: { bg: '#fee2e2', color: '#b91c1c', label: '\uACBD\uC7C1 \uCE58\uC5F4' },
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
            {'\uB124\uC774\uBC84 \uC1FC\uD551 \uC2DC\uC7A5 \uBD84\uC11D \uC911...'}
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  const { competition: comp, insight } = data;
  // 패널 재설계 R1 (PANEL_REDESIGN_SPEC_2026-07-17) — 경쟁상품수·평균가격이 모두
  // 0이면 정보가 아니라 소음이므로 섹션 자체를 렌더하지 않는다(전상품 범용·#55).
  if (comp.totalResults === 0 && comp.avgPrice === 0) return null;
  const sampleSize = comp.sampleSize ?? comp.topSellers.length;
  // R-1 확장 (rev58 운영자 스크린샷) — 자사 제외 후 표본이 0이면 위 조건과
  // 동치라 이미 숨겨지지만, 1~2개뿐이면 "경쟁자는 자사 1개만 존재" 같은
  // 오분석을 큰 블록으로 보여주던 문제라 한 줄 축약으로 대체한다(전상품 범용).
  if (sampleSize > 0 && sampleSize < 3) {
    return (
      <div className="rounded-xl px-3 py-2 flex items-center gap-1.5" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
        <TrendingUp size={12} style={{ color: '#0369a1', flexShrink: 0 }} />
        <span className="text-[11px]" style={{ color: '#0369a1' }}>
          {'네이버 쇼핑 시장 분석 · '}
          {'경쟁 상품 '}{sampleSize}{'개뿐(참고용)'}
        </span>
      </div>
    );
  }
  const levelStyle = LEVEL_STYLE[comp.competitionLevel] ?? LEVEL_STYLE.MEDIUM;

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={13} style={{ color: '#0369a1' }} />
          <span className="text-xs font-bold" style={{ color: '#0369a1' }}>
            {'\uB124\uC774\uBC84 \uC1FC\uD551 \uC2DC\uC7A5 \uBD84\uC11D'}
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: levelStyle.bg, color: levelStyle.color }}>
          {levelStyle.label}
        </span>
      </div>

      {/* Competition stats — Korean labels */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-white rounded-xl p-2 text-center">
          <p style={{ color: '#94a3b8' }}>{'\uACBD\uC7C1 \uC0C1\uD488\uC218'}</p>
          <p className="font-bold text-gray-800">{comp.totalResults.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-2 text-center">
          <p style={{ color: '#94a3b8' }}>{'\uD3C9\uADE0 \uAC00\uACA9'}</p>
          <p className="font-bold text-gray-800">{comp.avgPrice.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-2 text-center">
          <p style={{ color: '#94a3b8' }}>{'\uAC00\uACA9\uB300'}</p>
          <p className="font-bold text-gray-800 text-[10px]">{comp.priceRange}</p>
        </div>
      </div>

      {/* Top sellers */}
      {comp.topSellers.length > 0 && (
        <div className="text-xs">
          <span style={{ color: '#64748b' }}>{'\uC0C1\uC704 \uD310\uB9E4\uC790: '}</span>
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
