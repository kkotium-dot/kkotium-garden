// src/components/product/KkottiNaverWidget.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 꼬띠 + 네이버 통합 평가 위젯
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

'use client';

import { useState, useEffect } from 'react';
import type { KkottiNaverScore } from '@/types/naver';

interface Props {
  productId?: string;
  autoEvaluate?: boolean;
  onScoreChange?: (score: KkottiNaverScore) => void;
}

export function KkottiNaverWidget({ productId, autoEvaluate = true, onScoreChange }: Props) {
  const [score, setScore] = useState<KkottiNaverScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 자동 평가
  useEffect(() => {
    if (productId && autoEvaluate) {
      evaluateProduct();
    }
  }, [productId, autoEvaluate]);

  const evaluateProduct = async () => {
    if (!productId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/kkotti-naver/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        setScore(data.data);
        onScoreChange?.(data.data);
      } else {
        setError(data.error || '평가 실패');
      }
    } catch (err) {
      setError('평가 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 꼬띠 표정
  const getMoodEmoji = (mood: string) => {
    const emojis: Record<string, string> = {
      celebrate: '🎉',
      happy: '😊',
      excited: '😃',
      thinking: '🤔',
      worried: '😟',
    };
    return emojis[mood] || '😐';
  };

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 w-80 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg shadow-lg p-4 border-2 border-pink-200">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
          <span className="ml-3 text-sm text-gray-600">평가 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 w-80 bg-red-50 rounded-lg shadow-lg p-4 border-2 border-red-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-red-600">❌ 오류</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <button
          onClick={evaluateProduct}
          className="mt-3 w-full px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg p-4 border-2 border-gray-200">
        <button
          onClick={evaluateProduct}
          className="w-full px-4 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
        >
          🌸 평가하기
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg shadow-xl p-5 border-2 border-pink-200 animate-fade-in">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-pink-600">
          🌸 꼬띠 AI 평가
        </span>
        <button
          onClick={evaluateProduct}
          className="text-gray-400 hover:text-gray-600 text-xs"
        >
          🔄 새로고침
        </button>
      </div>

      {/* 꼬띠 표정 */}
      <div className="flex flex-col items-center mb-4">
        <div className="text-6xl mb-2">{getMoodEmoji(score.kkotti.mood)}</div>
        <div className="text-xs text-gray-500">
          마지막 평가: {new Date(score.lastEvaluated).toLocaleString('ko-KR')}
        </div>
      </div>

      {/* 통합 점수 */}
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">통합 점수</span>
          <span className="text-xs text-gray-500">
            {score.excelReady ? '✅ 엑셀 생성 가능' : '⚠️ 개선 필요'}
          </span>
        </div>
        <div className="flex items-baseline gap-4">
          <div className="text-4xl font-bold text-purple-600">{score.combinedScore}</div>
          <div className="flex flex-col text-xs text-gray-500">
            <span>꼬띠: {score.kkotti.totalScore}점</span>
            <span>네이버: {score.naver.seoScore}점</span>
          </div>
        </div>
        {/* 프로그레스 바 */}
        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
            style={{ width: `${score.combinedScore}%` }}
          ></div>
        </div>
      </div>

      {/* 꼬띠 메시지 */}
      <div className="bg-white rounded-lg p-3 mb-3 shadow-sm">
        <p className="text-sm text-gray-700">{score.kkotti.message}</p>
      </div>

      {/* 제안 사항 */}
      {score.kkotti.suggestions.length > 0 && (
        <div className="bg-yellow-50 rounded-lg p-3 mb-3 border border-yellow-200">
          <div className="text-xs font-semibold text-yellow-700 mb-2">
            💡 개선 제안
          </div>
          <ul className="space-y-1">
            {score.kkotti.suggestions.slice(0, 3).map((suggestion, idx) => (
              <li key={idx} className="text-xs text-yellow-800">
                • {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 네이버 필수 항목 */}
      {!score.naver.requiredComplete && (
        <div className="bg-red-50 rounded-lg p-3 mb-3 border border-red-200">
          <div className="text-xs font-semibold text-red-700 mb-2">
            ❌ 네이버 필수 항목 누락
          </div>
          <ul className="space-y-1">
            {score.naver.requiredMissing.map((field, idx) => (
              <li key={idx} className="text-xs text-red-800">
                • {field}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 네이버 최적화 */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <div className="text-xs font-semibold text-blue-700 mb-2">
          🎯 네이버 최적화
        </div>
        <div className="space-y-2">
          <div>
            <div className="text-xs text-blue-600 mb-1">추천 상품명 (27자):</div>
            <div className="text-xs text-gray-700 bg-white px-2 py-1 rounded">
              {score.naver.optimized.title27}
            </div>
          </div>
          <div>
            <div className="text-xs text-blue-600 mb-1">추천 키워드:</div>
            <div className="flex flex-wrap gap-1">
              {score.naver.optimized.keywords.slice(0, 5).map((keyword, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-white px-2 py-1 rounded border border-blue-200"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={evaluateProduct}
          className="flex-1 px-3 py-2 bg-pink-500 text-white text-sm rounded-lg hover:bg-pink-600 transition"
        >
          재평가
        </button>
        {score.excelReady && (
          <button
            className="flex-1 px-3 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition"
          >
            엑셀 생성
          </button>
        )}
      </div>
    </div>
  );
}
