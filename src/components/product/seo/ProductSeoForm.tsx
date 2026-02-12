'use client';

import { useEffect, useState } from 'react';
import { Info, TrendingUp, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProductSeoFormProps {
  seoData: {
    title: string;
    description: string;
    keywords: string;
    naver_title: string;
    naver_description: string;
    og_image: string;
    seo_score: number;
    seo_valid: boolean;
  };
  productName?: string;
  category?: string;
  onSeoChange: (updates: any) => void;
}

export default function ProductSeoForm({ seoData, productName, category, onSeoChange }: ProductSeoFormProps) {
  const [formData, setFormData] = useState({
    title: seoData.title || '',
    description: seoData.description || '',
    keywords: seoData.keywords || '',
    naver_title: seoData.naver_title || '',
    naver_description: seoData.naver_description || '',
    og_image: seoData.og_image || '',
  });

  const [aiLoading, setAiLoading] = useState(false);

  const calculateScore = () => {
    let score = 0;
    const titleLen = formData.title.trim().length;
    const descLen = formData.description.trim().length;
    const kwList = formData.keywords.split(',').map(k => k.trim()).filter(Boolean);
    const naverTitleLen = formData.naver_title.trim().length;
    const naverDescLen = formData.naver_description.trim().length;

    // SEO 제목 (20점): 10~60자
    if (titleLen >= 10 && titleLen <= 60) score += 20;

    // SEO 설명 (25점): 50~160자
    if (descLen >= 50 && descLen <= 160) score += 25;

    // 키워드 (15점): 3~10개
    if (kwList.length >= 3 && kwList.length <= 10) score += 15;

    // ✨ 네이버 상품명 (20점): 25~35자 (2026년 표준)
    if (naverTitleLen >= 25 && naverTitleLen <= 35) {
      score += 20;
    } else if (naverTitleLen >= 20 && naverTitleLen <= 45) {
      score += 15; // 안전 범위
    } else if (naverTitleLen >= 10 && naverTitleLen <= 100) {
      score += 10; // 최소
    }

    // ✨ 네이버 설명 (20점): 100~300자 (2026년 표준)
    if (naverDescLen >= 100 && naverDescLen <= 300) {
      score += 20;
    } else if (naverDescLen >= 80 && naverDescLen <= 350) {
      score += 15; // 안전 범위
    } else if (naverDescLen >= 50 && naverDescLen <= 500) {
      score += 10; // 최소
    }

    return score;
  };

  const currentScore = calculateScore();

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newValue = e.target.value;
    setFormData(prev => ({ ...prev, [field]: newValue }));
    onSeoChange({ [field]: newValue });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const score = calculateScore();
      const valid = score >= 50;
      onSeoChange({ seo_score: score, seo_valid: valid });
    }, 300);

    return () => clearTimeout(timer);
  }, [formData]);

  const getSeoGrade = (score: number) => {
    if (score >= 80) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-500', text: '우수 (우선 노출)' };
    if (score >= 50) return { grade: 'B', color: 'text-yellow-600', bg: 'bg-yellow-500', text: '보통 (일반 노출)' };
    return { grade: 'C', color: 'text-red-600', bg: 'bg-red-500', text: '낮음 (개선 필요)' };
  };

  const seoGrade = getSeoGrade(currentScore);

  const getFieldScore = (field: string) => {
    const titleLen = formData.title.trim().length;
    const descLen = formData.description.trim().length;
    const kwList = formData.keywords.split(',').map(k => k.trim()).filter(Boolean);
    const naverTitleLen = formData.naver_title.trim().length;
    const naverDescLen = formData.naver_description.trim().length;

    switch (field) {
      case 'title':
        return titleLen >= 10 && titleLen <= 60 ? 20 : 0;
      case 'description':
        return descLen >= 50 && descLen <= 160 ? 25 : 0;
      case 'keywords':
        return kwList.length >= 3 && kwList.length <= 10 ? 15 : 0;
      case 'naver_title':
        if (naverTitleLen >= 25 && naverTitleLen <= 35) return 20;
        if (naverTitleLen >= 20 && naverTitleLen <= 45) return 15;
        if (naverTitleLen >= 10 && naverTitleLen <= 100) return 10;
        return 0;
      case 'naver_description':
        if (naverDescLen >= 100 && naverDescLen <= 300) return 20;
        if (naverDescLen >= 80 && naverDescLen <= 350) return 15;
        if (naverDescLen >= 50 && naverDescLen <= 500) return 10;
        return 0;
      default:
        return 0;
    }
  };

  // ✨ AI 키워드 생성 (키워드만)
  const handleAiKeywordGenerate = async () => {
    if (!productName || productName.trim() === '') {
      toast.error('상품명을 먼저 입력해주세요');
      return;
    }

    setAiLoading(true);
    const loadingToast = toast.loading('🤖 AI가 키워드를 생성 중입니다...');

    try {
      const response = await fetch('/api/ai/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: productName,
          category: category || '',
        }),
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success && data.keywords) {
        const keywordString = data.keywords.join(',');
        setFormData(prev => ({ ...prev, keywords: keywordString }));
        onSeoChange({ keywords: keywordString });
        toast.success('✨ ' + data.keywords.length + '개 키워드가 생성되었습니다!');
      } else {
        toast.error('키워드 생성 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('키워드 생성 오류:', error);
      toast.error('키워드 생성 중 오류가 발생했습니다');
    } finally {
      setAiLoading(false);
    }
  };

  // ✨ AI 완전 최적화 (키워드 + 제목 + 설명 동시 생성)
  const handleAiFullOptimize = async () => {
    if (!productName || productName.trim() === '') {
      toast.error('상품명을 먼저 입력해주세요');
      return;
    }

    setAiLoading(true);
    const loadingToast = toast.loading('🤖 AI가 완전 최적화 중입니다... (2026년 네이버 표준 적용)');

    try {
      const response = await fetch('/api/naver-seo/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: 'temp',
          productName: productName,
        }),
      });

      const data = await response.json();

      toast.dismiss(loadingToast);

      if (data.success && data.data) {
        // ✨ 모든 필드 업데이트 (SEO + 네이버)
        const updates = {
          title: data.data.seo_title || data.data.naver_title || '',
          description: data.data.seo_description || '',
          naver_title: data.data.naver_title || '',
          keywords: data.data.naver_keywords || '',
          naver_description: data.data.naver_description || '',
        };

        setFormData(prev => ({ ...prev, ...updates }));
        onSeoChange(updates);

        const naverTitleLen = updates.naver_title.length;
        const naverDescLen = updates.naver_description.length;

        toast.success(
          `✨ AI 완전 최적화 완료!\n` +
          `네이버 상품명 ${naverTitleLen}자 (최적: 25~35자)\n` +
          `네이버 설명 ${naverDescLen}자 (최적: 100~300자)\n` +
          `키워드 ${updates.keywords.split(',').length}개`,
          { 
            duration: 6000,
            style: {
              minWidth: '350px',
            },
          }
        );
      } else {
        toast.error('최적화 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('AI 최적화 오류:', error);
      toast.error('AI 최적화 중 오류가 발생했습니다');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={'p-6 rounded-2xl border-2 ' + (
        currentScore >= 80
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
          : currentScore >= 50
          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
          : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200'
      )}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              SEO 점수
            </h3>
            <p className="text-sm text-gray-600 mt-1">{seoGrade.text}</p>
          </div>
          <div className="text-right">
            <div className={'text-4xl font-black ' + seoGrade.color}>
              {currentScore}/100
            </div>
            <div className={'text-lg font-bold ' + seoGrade.color}>
              {seoGrade.grade}등급
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={'h-3 rounded-full transition-all duration-300 ' + seoGrade.bg}
            style={{ width: currentScore + '%' }}
          />
        </div>

        <div className="mt-4 p-4 bg-white rounded-xl">
          {currentScore >= 80 ? (
            <p className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              ✅ 검색 최적화 완료! 우선 노출됩니다.
            </p>
          ) : currentScore >= 50 ? (
            <p className="text-sm text-yellow-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              ⚠️ 등록 가능하지만, 80점 이상 권장 ({80 - currentScore}점 필요)
            </p>
          ) : (
            <p className="text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              ⚠️ 등록은 가능하지만 검색 노출이 낮습니다 ({50 - currentScore}점 더 필요)
            </p>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">
          📄 일반 SEO (선택 사항)
        </h3>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            SEO 제목
            <span className={'ml-2 text-xs ' + (getFieldScore('title') > 0 ? 'text-green-600' : 'text-gray-400')}>
              {getFieldScore('title')}/20점
            </span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={handleChange('title')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500"
            placeholder="프리미엄 장미 꽃다발 20송이 - 꽃틔움 (10~60자)"
            maxLength={60}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.title.length}/60자 | 구글, 네이버 검색 결과 표시
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            SEO 설명
            <span className={'ml-2 text-xs ' + (getFieldScore('description') > 0 ? 'text-green-600' : 'text-gray-400')}>
              {getFieldScore('description')}/25점
            </span>
          </label>
          <textarea
            value={formData.description}
            onChange={handleChange('description')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500 h-24"
            placeholder="신선한 장미 20송이로 제작한 프리미엄 꽃다발... (50~160자)"
            maxLength={160}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.description.length}/160자 | 검색 결과 미리보기 텍스트
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            🛒 네이버 쇼핑 (필수)
          </h3>
          <span className="text-xs bg-green-600 text-white px-3 py-1 rounded-full font-bold">
            2026년 표준
          </span>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            네이버 상품명 <span className="text-red-500">*</span>
            <span className={'ml-2 text-xs ' + (getFieldScore('naver_title') > 0 ? 'text-green-600' : 'text-gray-400')}>
              {getFieldScore('naver_title')}/20점
            </span>
          </label>
          <input
            type="text"
            value={formData.naver_title}
            onChange={handleChange('naver_title')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500"
            placeholder="프리미엄 빨강 장미 꽃다발 20송이 생일 선물 (25~35자, 최적 27자)"
            maxLength={100}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500">
              {formData.naver_title.length}/100자 | 최적: 25~35자 (27자 권장)
            </p>
            {formData.naver_title.length >= 25 && formData.naver_title.length <= 35 && (
              <span className="text-xs text-green-600 font-bold">✅ 최적 길이!</span>
            )}
            {formData.naver_title.length > 35 && formData.naver_title.length <= 45 && (
              <span className="text-xs text-yellow-600 font-bold">⚠️ 35자 이하 권장</span>
            )}
            {formData.naver_title.length > 45 && (
              <span className="text-xs text-red-600 font-bold">❌ 감점 위험</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            네이버 상품 설명 <span className="text-red-500">*</span>
            <span className={'ml-2 text-xs ' + (getFieldScore('naver_description') > 0 ? 'text-green-600' : 'text-gray-400')}>
              {getFieldScore('naver_description')}/20점
            </span>
          </label>
          <textarea
            value={formData.naver_description}
            onChange={handleChange('naver_description')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 h-32"
            placeholder="신선한 장미 20송이로 제작한 프리미엄 꽃다발입니다. 특징+용도+배송 포함 (100~300자)"
            maxLength={500}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500">
              {formData.naver_description.length}/500자 | 최적: 100~300자
            </p>
            {formData.naver_description.length >= 100 && formData.naver_description.length <= 300 && (
              <span className="text-xs text-green-600 font-bold">✅ 최적 길이!</span>
            )}
            {formData.naver_description.length < 100 && formData.naver_description.length >= 50 && (
              <span className="text-xs text-yellow-600 font-bold">⚠️ 100자 이상 권장</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            🔍 키워드 (검색 노출 중요!)
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleAiKeywordGenerate}
              disabled={aiLoading || !productName}
              className="px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-sm font-medium shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              {aiLoading ? '생성 중...' : 'AI 키워드'}
            </button>
            <button
              onClick={handleAiFullOptimize}
              disabled={aiLoading || !productName}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-sm font-medium shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              {aiLoading ? '최적화 중...' : '🚀 AI 완전 최적화'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            키워드
            <span className={'ml-2 text-xs ' + (getFieldScore('keywords') > 0 ? 'text-green-600' : 'text-gray-400')}>
              {getFieldScore('keywords')}/15점
            </span>
          </label>
          <input
            type="text"
            value={formData.keywords}
            onChange={handleChange('keywords')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500"
            placeholder="장미꽃다발,생일선물,프리미엄꽃,당일배송,무료포장 (쉼표로 구분, 5~7개 권장)"
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500">
              {formData.keywords.split(',').filter(k => k.trim()).length}개 입력됨 | 최적: 5~7개
            </p>
            {formData.keywords.split(',').filter(k => k.trim()).length >= 5 &&
             formData.keywords.split(',').filter(k => k.trim()).length <= 7 && (
              <span className="text-xs text-green-600 font-bold">✅ 최적 개수</span>
            )}
          </div>
        </div>

        {formData.keywords && (
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
            <p className="text-xs text-purple-700 mb-2 font-bold">생성된 키워드:</p>
            <div className="flex flex-wrap gap-2">
              {formData.keywords.split(',').filter(k => k.trim()).map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-white text-purple-700 border border-purple-300 rounded-full text-sm font-medium"
                >
                  {keyword.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
          <p className="text-xs text-blue-700 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>2026년 네이버 쇼핑 표준:</strong><br />
              • 상품명: 25~35자 (최적 27자)<br />
              • 설명: 100~300자 (특징+용도+배송)<br />
              • 키워드: 5~7개 (중복 최소화)<br />
              • AI 완전 최적화로 80점 즉시 달성!
            </span>
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">
          📱 SNS 공유 이미지
        </h3>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            오픈그래프 이미지 URL
          </label>
          <input
            type="text"
            value={formData.og_image}
            onChange={handleChange('og_image')}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50"
            placeholder="https://... (자동 입력됨)"
            readOnly
          />
          <p className="text-xs text-purple-700 mt-1 flex items-center gap-1">
            <Info className="w-3 h-3" />
            카카오톡, 페이스북 공유 시 표시될 이미지
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          ✅ 네이버 스토어 필수 체크리스트 (2026년 표준)
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className={'p-3 rounded-xl ' + (getFieldScore('naver_title') >= 20 ? 'bg-green-100 text-green-700' : getFieldScore('naver_title') >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500')}>
            {getFieldScore('naver_title') >= 20 ? '✅' : getFieldScore('naver_title') >= 15 ? '⚠️' : '⬜'} 네이버 상품명 (25~35자)
          </div>
          <div className={'p-3 rounded-xl ' + (getFieldScore('naver_description') >= 20 ? 'bg-green-100 text-green-700' : getFieldScore('naver_description') >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500')}>
            {getFieldScore('naver_description') >= 20 ? '✅' : getFieldScore('naver_description') >= 15 ? '⚠️' : '⬜'} 네이버 설명 (100~300자)
          </div>
          <div className={'p-3 rounded-xl ' + (getFieldScore('keywords') > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
            {getFieldScore('keywords') > 0 ? '✅' : '⬜'} 키워드 (5~7개)
          </div>
          <div className={'p-3 rounded-xl ' + (currentScore >= 80 ? 'bg-green-100 text-green-700' : currentScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500')}>
            {currentScore >= 80 ? '✅' : currentScore >= 50 ? '⚠️' : '⬜'} SEO 점수 80점 이상
          </div>
        </div>
      </div>
    </div>
  );
}
