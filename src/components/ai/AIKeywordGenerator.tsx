'use client';

import { useState } from 'react';

interface AIKeywordGeneratorProps {
  productName: string;
  onKeywordsGenerated: (keywords: string[]) => void;
}

export default function AIKeywordGenerator({
  productName,
  onKeywordsGenerated,
}: AIKeywordGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!productName) {
      alert('상품명을 먼저 입력해주세요');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/ai/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName }),
      });

      const data = await response.json();

      if (data.success) {
        setKeywords(data.keywords);
        onKeywordsGenerated(data.keywords);
      } else {
        alert('키워드 생성 실패: ' + data.error);
      }
    } catch (error) {
      alert('키워드 생성 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h4 className="font-bold text-purple-900">🤖 AI 키워드 추천</h4>
          <p className="text-xs text-purple-600 mt-1">
            Perplexity AI가 최적의 키워드를 추천합니다
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !productName}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {loading ? '생성 중...' : 'AI 추천'}
        </button>
      </div>

      {keywords.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-purple-700 mb-2">추천 키워드:</p>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-white text-purple-700 border border-purple-200 rounded-full text-sm"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
