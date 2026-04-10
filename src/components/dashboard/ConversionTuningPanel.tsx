'use client';
// ConversionTuningPanel — 전환 튜닝 체크리스트
// P2: Manual checklist (no Naver API yet)
// Shows actionable items to improve product visibility before API integration

import { useState, useCallback } from 'react';
import { CheckCircle, Circle, ChevronDown, ChevronUp, Sparkles, ExternalLink } from 'lucide-react';

interface TuningItem {
  id: string;
  category: string;
  label: string;
  detail: string;
  impact: 'high' | 'medium' | 'low';
  done: boolean;
  actionLabel?: string;
  actionHref?: string;
}

const IMPACT_COLOR = {
  high:   'text-red-600 bg-red-50 border-red-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  low:    'text-blue-600 bg-blue-50 border-blue-200',
};

const IMPACT_LABEL = { high: '높음', medium: '보통', low: '낮음' };

// 2026 Naver SEO tuning checklist — based on official Naver shopping algorithm
const INITIAL_ITEMS: TuningItem[] = [
  // Category & Keywords
  { id: 'cat-1', category: '카테고리 / 키워드', label: '카테고리가 최하위까지 선택됐나요?', detail: '최하위 카테고리 미선택 시 노출 순위가 크게 낮아집니다.', impact: 'high', done: false, actionLabel: '상품 등록으로', actionHref: '/products/new' },
  { id: 'cat-2', category: '카테고리 / 키워드', label: '황금키워드 5개 이상 입력했나요?', detail: 'AI SEO 워크플로우로 황금키워드를 발굴하세요. 검색 유입에 직접 영향합니다.', impact: 'high', done: false },
  { id: 'cat-3', category: '카테고리 / 키워드', label: '태그가 10개 꽉 채워져 있나요?', detail: '태그 10개 미만이면 최대 20점 손실. 태그는 네이버 알고리즘이 카테고리 외 보조 분류로 활용합니다.', impact: 'high', done: false },
  { id: 'cat-4', category: '카테고리 / 키워드', label: '상품명 앞 15자에 핵심 키워드 포함?', detail: '네이버는 상품명 앞부분에 가중치를 둡니다. 핵심 키워드가 뒤에 있으면 노출 불리.', impact: 'high', done: false },
  // Product name
  { id: 'name-1', category: '상품명', label: '상품명 길이가 25~50자인가요?', detail: '25자 미만: 정보 부족. 50자 초과: 모바일에서 잘림. 35~50자가 최적.', impact: 'medium', done: false },
  { id: 'name-2', category: '상품명', label: '상품명에 어뷰징 단어가 없나요?', detail: '무료배송, 최저가, 특가, 할인 등 단어가 상품명에 포함되면 알고리즘 페널티 적용.', impact: 'high', done: false },
  { id: 'name-3', category: '상품명', label: '동일 키워드가 3회 이상 반복되지 않나요?', detail: '키워드 반복은 어뷰징으로 인식됩니다. 1회씩만 사용하세요.', impact: 'medium', done: false },
  // Images
  { id: 'img-1', category: '이미지', label: '대표 이미지 해상도 500x500px 이상?', detail: '500x500 미만이면 네이버 쇼핑 노출 시 흐릿하게 표시됩니다. 1000x1000 권장.', impact: 'high', done: false },
  { id: 'img-2', category: '이미지', label: '추가 이미지 3장 이상 등록?', detail: '추가 이미지가 많을수록 체류 시간이 늘어 전환율이 올라갑니다.', impact: 'medium', done: false },
  { id: 'img-3', category: '이미지', label: '상세 페이지 이미지가 있나요?', detail: '텍스트 없이 이미지만 있으면 노출 품질 저하. HTML 상세 페이지 권장.', impact: 'medium', done: false },
  // Pricing
  { id: 'price-1', category: '가격 / 할인', label: '즉시할인이 설정돼 있나요?', detail: '즉시할인이 있는 상품은 네이버 쇼핑 "특가" 필터에 노출됩니다. 전환율 평균 +18%.', impact: 'high', done: false },
  { id: 'price-2', category: '가격 / 할인', label: '순마진율 30% 이상인가요?', detail: '30% 미만이면 광고비, 반품비 등 추가 비용 발생 시 적자 위험.', impact: 'high', done: false },
  // Shipping
  { id: 'ship-1', category: '배송', label: '배송비 템플릿이 연결됐나요?', detail: '배송비 템플릿 없으면 묶음배송 불가. 공급사별 템플릿 설정을 권장합니다.', impact: 'medium', done: false, actionLabel: '배송 템플릿', actionHref: '/settings/shipping' },
  { id: 'ship-2', category: '배송', label: '5만원 이상 조건부 무료배송 설정?', detail: '조건부 무료배송 설정 시 네이버 무료배송 뱃지 획득. 클릭률 평균 +23%.', impact: 'medium', done: false },
  // SEO
  { id: 'seo-1', category: 'SEO', label: '브랜드명이 공식 등록 브랜드인가요?', detail: '공식 브랜드 등록 상품은 브랜드 검색 노출 추가 혜택이 있습니다.', impact: 'low', done: false },
  { id: 'seo-2', category: 'SEO', label: '리뷰 포인트가 설정돼 있나요?', detail: '리뷰 포인트 설정 시 구매 후기 작성 유도 효과. 리뷰 수는 노출 순위에 영향.', impact: 'medium', done: false },
];

export default function ConversionTuningPanel({ productId }: { productId?: string }) {
  const [items, setItems] = useState<TuningItem[]>(INITIAL_ITEMS);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['카테고리 / 키워드', '상품명']));
  const [showAll, setShowAll] = useState(false);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const categories = Array.from(new Set(items.map(i => i.category)));
  const doneCount  = items.filter(i => i.done).length;
  const highCount  = items.filter(i => i.impact === 'high' && !i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  const displayedItems = (cat: string) => {
    const catItems = items.filter(i => i.category === cat);
    return showAll ? catItems : catItems.filter(i => !i.done).slice(0, 3).concat(catItems.filter(i => i.done).slice(0, 1));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-indigo-600" />
          <span className="text-sm font-bold text-gray-800">전환 튜닝 체크리스트</span>
          {highCount > 0 && (
            <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-semibold">
              높음 {highCount}개 미완료
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{doneCount}/{items.length}</span>
          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-orange-400'}`}
              style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-bold text-gray-700">{pct}%</span>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {categories.map(cat => {
          const catItems = displayedItems(cat);
          const catDone  = items.filter(i => i.category === cat && i.done).length;
          const catTotal = items.filter(i => i.category === cat).length;
          const isOpen   = openCategories.has(cat);

          return (
            <div key={cat} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCategory(cat)}
                className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${isOpen ? 'bg-indigo-50' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-700">{cat}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    catDone === catTotal ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>{catDone}/{catTotal}</span>
                </div>
                {isOpen ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
              </button>

              {isOpen && (
                <div className="divide-y divide-gray-50">
                  {catItems.map(item => (
                    <div key={item.id}
                      className={`flex items-start gap-2.5 px-3 py-2.5 transition-colors ${item.done ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}
                    >
                      <button onClick={() => toggleItem(item.id)} className="shrink-0 mt-0.5">
                        {item.done
                          ? <CheckCircle size={14} className="text-green-500" />
                          : <Circle size={14} className={item.impact === 'high' ? 'text-red-300' : 'text-gray-300'} />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <p className={`text-xs font-semibold ${item.done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.label}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium shrink-0 ${IMPACT_COLOR[item.impact]}`}>
                            영향 {IMPACT_LABEL[item.impact]}
                          </span>
                        </div>
                        {!item.done && <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.detail}</p>}
                        {item.actionLabel && !item.done && (
                          <a href={item.actionHref} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-1 font-medium">
                            {item.actionLabel} <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <button onClick={() => setShowAll(s => !s)} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition">
          {showAll ? '간략히 보기' : '완료 항목 포함 전체 보기'}
        </button>
      </div>
    </div>
  );
}
