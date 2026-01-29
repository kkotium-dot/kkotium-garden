'use client';

import { useState } from 'react';
import { crawlDomemaeProducts, testDomemaeAPI } from '@/app/actions/domemae-crawler';

export default function ProductCrawler() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [method, setMethod] = useState<'url' | 'keyword' | 'category'>('url');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');

  /**
   * API 테스트
   */
  const handleTest = async () => {
    setTesting(true);
    setResult('🧪 API 연결 테스트 중...');
    
    try {
      const response = await testDomemaeAPI();
      setResult(response.message);
      
      if (response.success) {
        console.log('✅ API 테스트 성공:', response.data);
      }
    } catch (error) {
      setResult(`❌ 테스트 실패: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  /**
   * 크롤링 실행
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) {
      setResult('❌ 입력값을 확인하세요.');
      return;
    }

    setLoading(true);
    setResult('🔄 상품 수집 중...');

    try {
      let options = {};

      if (method === 'url') {
        options = { url: input.trim() };
      } else if (method === 'keyword') {
        options = { keyword: input.trim(), limit: 20 };
      } else if (method === 'category') {
        options = { category: input.trim(), limit: 20 };
      }

      console.log('🚀 크롤링 옵션:', options);

      const response = await crawlDomemaeProducts(options);
      
      setResult(response.message);

      if (response.success) {
        setInput('');
        
        // 3초 후 새로고침
        setTimeout(() => {
          console.log('🔄 페이지 새로고침');
          window.location.href = '/sourced'; // 수집된 상품 페이지로 이동
        }, 3000);
      }

    } catch (error) {
      console.error('크롤링 오류:', error);
      setResult(`❌ 오류: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      
      {/* 헤더 */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">🌸 꽃틔움 가든</h1>
        <p className="text-xl text-gray-600">도매매 상품 자동 수집기</p>
      </div>

      {/* API 테스트 */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
          🔑 1단계: API 연결 확인
        </h3>
        <button
          onClick={handleTest}
          disabled={testing}
          className="px-6 py-3 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          {testing ? '⏳ 테스트 중...' : '🧪 API 테스트 하기'}
        </button>
        <p className="text-sm text-gray-600 mt-3">
          💡 먼저 이 버튼을 눌러서 도매매 API가 정상 작동하는지 확인하세요!
        </p>
      </div>

      {/* 크롤링 폼 */}
      <div className="bg-pink-50 border-2 border-pink-300 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          🌸 2단계: 상품 수집하기
        </h2>

        {/* 수집 방법 선택 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setMethod('url')}
            className={`py-3 px-4 rounded-lg font-bold transition ${
              method === 'url'
                ? 'bg-pink-500 text-white shadow-lg'
                : 'bg-white border-2 border-pink-200 hover:border-pink-400'
            }`}
          >
            🔗 URL
          </button>
          <button
            type="button"
            onClick={() => setMethod('keyword')}
            className={`py-3 px-4 rounded-lg font-bold transition ${
              method === 'keyword'
                ? 'bg-pink-500 text-white shadow-lg'
                : 'bg-white border-2 border-pink-200 hover:border-pink-400'
            }`}
          >
            🔍 키워드
          </button>
          <button
            type="button"
            onClick={() => setMethod('category')}
            className={`py-3 px-4 rounded-lg font-bold transition ${
              method === 'category'
                ? 'bg-pink-500 text-white shadow-lg'
                : 'bg-white border-2 border-pink-200 hover:border-pink-400'
            }`}
          >
            📂 카테고리
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* URL 입력 */}
          {method === 'url' && (
            <div>
              <label className="block font-bold mb-2 text-gray-700">
                도매매 상품 URL
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://domemedb.domeggook.com/goods/view?goodsNo=12345"
                className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:outline-none text-sm"
                required
              />
              <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-bold text-sm mb-2">💡 URL 복사 방법:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                  <li>도매매 사이트에서 원하는 상품 클릭</li>
                  <li>브라우저 주소창의 URL 전체 복사</li>
                  <li>여기에 붙여넣기 (Cmd+V)</li>
                </ol>
              </div>
            </div>
          )}

          {/* 키워드 입력 */}
          {method === 'keyword' && (
            <div>
              <label className="block font-bold mb-2 text-gray-700">
                검색 키워드
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="예: 원피스, 파자마, 여성의류"
                className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:outline-none"
                required
              />
              <p className="mt-2 text-sm text-gray-600">
                💡 최대 20개 상품을 자동으로 수집합니다
              </p>
            </div>
          )}

          {/* 카테고리 입력 */}
          {method === 'category' && (
            <div>
              <label className="block font-bold mb-2 text-gray-700">
                카테고리 번호
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="예: 1001, 2003"
                className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-pink-500 focus:outline-none"
                required
              />
              <p className="mt-2 text-sm text-gray-600">
                💡 도매매 카테고리 번호를 입력하세요
              </p>
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-bold text-lg hover:from-pink-600 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition shadow-lg"
          >
            {loading ? '🔄 수집 중...' : '🚀 상품 가져오기'}
          </button>
        </form>

        {/* 결과 표시 */}
        {result && (
          <div className={`mt-5 p-4 rounded-lg font-bold border-2 ${
            result.startsWith('✅')
              ? 'bg-green-50 text-green-800 border-green-300'
              : result.startsWith('🔄') || result.startsWith('🧪')
              ? 'bg-blue-50 text-blue-800 border-blue-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}>
            {result}
          </div>
        )}
      </div>

      {/* 사용 가이드 */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4">📖 사용 가이드</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex gap-3">
            <span className="font-bold min-w-[80px]">🔗 URL:</span>
            <span>특정 상품 1개만 정확하게 가져올 때 사용</span>
          </div>
          <div className="flex gap-3">
            <span className="font-bold min-w-[80px]">🔍 키워드:</span>
            <span>비슷한 상품 여러 개를 한번에 가져올 때 사용</span>
          </div>
          <div className="flex gap-3">
            <span className="font-bold min-w-[80px]">📂 카테고리:</span>
            <span>특정 카테고리의 상품들을 대량으로 가져올 때 사용</span>
          </div>
          <div className="flex gap-3">
            <span className="font-bold min-w-[80px]">💾 저장:</span>
            <span>Supabase sourced_products 테이블에 자동 저장</span>
          </div>
          <div className="flex gap-3">
            <span className="font-bold min-w-[80px]">🔄 중복:</span>
            <span>같은 상품은 자동으로 업데이트</span>
          </div>
        </div>
      </div>

      {/* 다음 단계 안내 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
        <h3 className="font-bold text-lg mb-3 text-purple-800">🎯 다음 단계</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>위에서 상품을 수집합니다</li>
          <li>수집 완료 후 <strong>수집된 상품 관리</strong> 페이지로 자동 이동</li>
          <li>원하는 상품을 선택하여 <strong>네이버 스마트스토어에 등록</strong></li>
          <li>등록된 상품은 실시간으로 스토어에 반영됩니다</li>
        </ol>
        <div className="mt-4 pt-4 border-t border-purple-200">
          <a
            href="/sourced"
            className="inline-block px-6 py-3 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600 transition"
          >
            📦 수집된 상품 보러가기 →
          </a>
        </div>
      </div>

    </div>
  );
}
