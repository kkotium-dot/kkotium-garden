'use client';

import { useState } from 'react';

interface ProductSeoFormProps {
  seoData: any;
  onSeoChange: (data: any) => void;
}

export default function ProductSeoForm({ seoData, onSeoChange }: ProductSeoFormProps) {
  const [activeTab, setActiveTab] = useState('basic');

  const handleAutoKeywords = () => {
    const productName = seoData.naver_title || '상품명';
    const keywords = `${productName},꽃 선물,꽃배달,당일배송,프리미엄 플라워`;
    onSeoChange({ ...seoData, naver_keywords: keywords });
  };

  const handleChange = (field: string, value: string) => {
    onSeoChange({ ...seoData, [field]: value });
  };

  return (
    <div className="border rounded-lg p-6 bg-white">
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('basic')}
          className={`px-4 py-2 font-medium ${activeTab === 'basic' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
        >
          기본 SEO
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`px-4 py-2 font-medium ${activeTab === 'advanced' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
        >
          고급 SEO
        </button>
      </div>

      {activeTab === 'basic' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">네이버 쇼핑 제목</label>
            <input
              type="text"
              value={seoData.naver_title || ''}
              onChange={(e) => handleChange('naver_title', e.target.value)}
              placeholder="네이버 쇼핑에 노출될 제목 (최대 60자)"
              maxLength={60}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">{seoData.naver_title?.length || 0}/60</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">네이버 키워드</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={seoData.naver_keywords || ''}
                onChange={(e) => handleChange('naver_keywords', e.target.value)}
                placeholder="키워드1,키워드2,키워드3"
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAutoKeywords}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                자동생성
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">네이버 쇼핑 설명</label>
            <textarea
              value={seoData.naver_description || ''}
              onChange={(e) => handleChange('naver_description', e.target.value)}
              placeholder="네이버 쇼핑 상세 설명 (최대 300자)"
              rows={4}
              maxLength={300}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">{seoData.naver_description?.length || 0}/300</p>
          </div>
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">네이버 카테고리</label>
              <input
                type="text"
                value={seoData.naver_category || ''}
                onChange={(e) => handleChange('naver_category', e.target.value)}
                placeholder="예: 꽃/화환/관상식물 > 꽃다발"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">배송비 설정</label>
              <input
                type="text"
                value={seoData.naver_shipping_fee || ''}
                onChange={(e) => handleChange('naver_shipping_fee', e.target.value)}
                placeholder="무료/3,000원"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">판매자 ID</label>
              <input
                type="text"
                value={seoData.naver_seller_id || ''}
                onChange={(e) => handleChange('naver_seller_id', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">브랜드명</label>
              <input
                type="text"
                value={seoData.naver_brand || '꽃틔움 가든'}
                onChange={(e) => handleChange('naver_brand', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
