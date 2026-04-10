// src/lib/seo-calculator.ts
// Naver Smart Store SEO score — 2026 + AEO (AI-Enhanced Optimization) baseline
// A-10: Added Q&A pattern check, hookPhrase bonus, AI search response structure

export interface SeoInput {
  productName: string;
  brand?: string;
  keywords?: string;   // comma-separated
  mainImage?: string;
  description?: string;
  categoryId?: string;
  // A-10: AEO fields
  hasQaPairs?: boolean;         // description contains Q&A structured content
  hookPhrase?: string;          // opening hook phrase in description (benefit-first)
  hasBulletPoints?: boolean;    // description uses bullet/list structure
}

export interface SeoResult {
  score: number;       // 0~100
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  checks: { label: string; ok: boolean; point: number }[];
  suggestions: string[];
  // A-10: AEO score contribution
  aeoScore: number;
}

export function calcSeoScore(input: SeoInput): SeoResult {
  const {
    productName = '', brand = '', keywords = '',
    mainImage = '', description = '', categoryId = '',
    hasQaPairs = false, hookPhrase = '', hasBulletPoints = false,
  } = input;

  const name = productName.trim();
  const kws = keywords.split(',').map(k => k.trim()).filter(Boolean);

  const words = name.replace(/[().\-[\]/&+,~·]/g, ' ').split(/\s+/).filter(Boolean);
  const wordCount: Record<string, number> = {};
  words.forEach(w => { wordCount[w] = (wordCount[w] || 0) + 1; });
  const hasDuplicateKeyword = Object.values(wordCount).some(c => c >= 3);

  // Naver 2026 abuse/spam patterns
  const abusingPattern = /무료배송|최저가|특가|할인|쿠폰|적립|이벤트|오늘만|한정|당일발송/;
  const hasAbusingTerm = abusingPattern.test(name);

  // A-10: Q&A pattern detection in description
  // Checks for "Q:" / "A:" markers or "?..." answer paragraph patterns
  const descHasQa = hasQaPairs ||
    /Q[.：:]\s*.+\s*A[.：:]\s*.+/i.test(description) ||
    /\?[\s\S]{5,50}\n/.test(description);

  // A-10: Hook phrase — first 30 chars of description show a benefit or use case
  const hookPhraseOk = hookPhrase.length >= 5 ||
    (description.length >= 30 && /[이가는은를의도와과]/.test(description.slice(0, 40)));

  // A-10: Bullet/list structure in description
  const bulletOk = hasBulletPoints ||
    /^[-•·■▶]\s/m.test(description) ||
    /^\d+\.\s/m.test(description);

  const checks: { label: string; ok: boolean; point: number }[] = [
    { label: '상품명 10자 이상',                  ok: name.length >= 10,                              point: 10 },
    { label: '상품명 20~50자 (네이버 권장)',       ok: name.length >= 20 && name.length <= 50,         point: 18 },
    { label: '브랜드명 포함',                     ok: brand ? name.includes(brand.replace('(협력사)', '').trim()) : false, point: 8 },
    { label: 'SEO 키워드 입력',                  ok: kws.length >= 2,                                point: 18 },
    { label: '키워드가 상품명에 포함',            ok: kws.some(k => name.includes(k)),               point: 12 },
    { label: '대표이미지 등록',                   ok: mainImage.length > 0,                           point: 10 },
    { label: '상세설명 50자 이상',                ok: description.length > 50,                        point: 5  },
    { label: '카테고리 선택',                     ok: categoryId.length > 0,                          point: 0  },
    { label: '중복 키워드 없음',                  ok: !hasDuplicateKeyword,                           point: 0  },
    { label: '판매조건 문구 없음 (어뷰징 방지)',  ok: !hasAbusingTerm,                                point: 4  },
    // A-10: AEO baseline checks
    { label: '상세설명 Q&A 구조 포함',            ok: descHasQa,                                      point: 8  },
    { label: '혜택 중심 첫 문장 (Hook)',          ok: hookPhraseOk,                                   point: 5  },
    { label: '목록형 설명 구조',                  ok: bulletOk,                                       point: 2  },
  ];

  const score = Math.min(100, checks.filter(c => c.ok).reduce((s, c) => s + c.point, 0));

  // A-10: AEO sub-score (0~15)
  const aeoScore = (descHasQa ? 8 : 0) + (hookPhraseOk ? 5 : 0) + (bulletOk ? 2 : 0);

  const grade: SeoResult['grade'] =
    score >= 85 ? 'S' :
    score >= 70 ? 'A' :
    score >= 50 ? 'B' :
    score >= 30 ? 'C' : 'D';

  const suggestions: string[] = [];
  if (name.length < 20)         suggestions.push('상품명을 20자 이상으로 작성하세요');
  if (name.length > 50)         suggestions.push('상품명이 네이버 권장 50자를 초과합니다 (50자 내외 권장)');
  if (hasDuplicateKeyword)      suggestions.push('상품명에 동일 단어가 3회 이상 반복됩니다 — 어뷰징 처리될 수 있습니다');
  if (hasAbusingTerm)           suggestions.push('상품명에 "무료배송/특가/할인" 등 판매조건 문구는 어뷰징입니다 — 제거해주세요');
  if (brand && !name.includes(brand.replace('(협력사)', '').trim()))
                                suggestions.push(`브랜드명 "${brand}"을 상품명에 포함하거나 브랜드 필드에 등록하세요`);
  if (kws.length < 2)           suggestions.push('SEO 키워드를 2개 이상 입력하세요');
  if (!kws.some(k => name.includes(k)))
                                suggestions.push('키워드 중 하나를 상품명에 넣어주세요');
  if (!mainImage)               suggestions.push('대표이미지를 등록하세요');
  if (description.length <= 50) suggestions.push('상세설명을 50자 이상 작성하세요');
  // A-10: AEO suggestions
  if (!descHasQa)               suggestions.push('[2026 AI검색] 상세설명에 Q&A 형식을 추가하면 AI 검색 응답에 노출될 확률이 높아집니다');
  if (!hookPhraseOk)            suggestions.push('[2026 AI검색] 상세설명 첫 문장을 "이 상품은 ~에 최적화된..." 형태의 혜택 중심 문장으로 시작하세요');
  if (!bulletOk && description.length > 50)
                                suggestions.push('[2026 AI검색] 상세설명에 글머리 기호(-/•) 목록을 사용하면 구조화 점수가 올라가요');

  return { score, grade, checks, suggestions, aeoScore };
}
