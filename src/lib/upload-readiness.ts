// src/lib/upload-readiness.ts
// Upload readiness — 11-point automatic checklist for Naver Smart Store upload
// Used by: products/new (side panel), reactivation cards, products table, excel modal

// ── Abuse word blacklist (Naver algorithm penalty triggers) ──────────────────
const ABUSE_WORDS = [
  '무료배송', '최저가', '특가', '할인', '세일', '긴급', '한정',
  '품절임박', '마감임박', '무조건', '보장', '100%', '완전무료',
  '대박', '초특가', '역대급', '레전드',
];

// ── Readiness item definition ────────────────────────────────────────────────
export type ReadinessItemId =
  | 'category'
  | 'keywords_count'
  | 'tags_count'
  | 'keyword_in_front'
  | 'name_length'
  | 'no_abuse'
  | 'no_repeat'
  | 'main_image'
  | 'extra_images'
  | 'shipping_template'
  | 'net_margin';

export interface ReadinessItem {
  id: ReadinessItemId;
  passed: boolean;
  label: string;        // short label shown in pill/badge
  message: string;      // failure message shown when not passing
  weight: number;       // weight out of 100 total
}

// ── Input type ───────────────────────────────────────────────────────────────
export interface ReadinessInput {
  naverCategoryCode?: string | null;
  keywords?: string[] | null;
  tags?: string[] | null;
  name?: string | null;
  mainImage?: string | null;
  images?: string[] | null;
  shippingTemplateId?: string | null;
  salePrice?: number | null;
  supplierPrice?: number | null;
  shippingFee?: number | null;
}

// ── Output type ──────────────────────────────────────────────────────────────
export interface ReadinessResult {
  score: number;           // 0–100
  items: ReadinessItem[];
  failed: ReadinessItem[]; // convenience: items where !passed
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  label: string;           // e.g. "72% — 카테고리 미선택, 키워드 부족"
}

// ── Weights (must sum to 100) ─────────────────────────────────────────────────
const WEIGHTS: Record<ReadinessItemId, number> = {
  category:          14,
  keywords_count:    12,
  tags_count:        10,
  keyword_in_front:  10,
  name_length:        8,
  no_abuse:          10,
  no_repeat:          8,
  main_image:        12,
  extra_images:       8,
  shipping_template: 10,
  net_margin:         8,
};

// ── Core calculation ─────────────────────────────────────────────────────────
export function calcUploadReadiness(input: ReadinessInput): ReadinessResult {
  const {
    naverCategoryCode,
    keywords = [],
    tags = [],
    name = '',
    mainImage,
    images = [],
    shippingTemplateId,
    salePrice = 0,
    supplierPrice = 0,
    shippingFee = 3000,
  } = input;

  const safeKeywords = Array.isArray(keywords) ? keywords.filter(Boolean) : [];
  const safeTags     = Array.isArray(tags)     ? tags.filter(Boolean)     : [];
  const safeName     = name ?? '';
  const safeImages   = Array.isArray(images)   ? images.filter(Boolean)   : [];

  // 1. Category check — default code "50003307" means not selected
  const categoryPassed = !!(
    naverCategoryCode &&
    naverCategoryCode !== '50003307' &&
    naverCategoryCode.length > 0
  );

  // 2. Keywords count >= 5
  const kwCountPassed = safeKeywords.length >= 5;

  // 3. Tags count >= 10
  const tagCountPassed = safeTags.length >= 10;

  // 4. First 15 chars contain at least one keyword
  const front15 = safeName.slice(0, 15).toLowerCase();
  const kwInFrontPassed =
    safeKeywords.length > 0 &&
    safeKeywords.some(kw => front15.includes((kw || '').toLowerCase().trim()));

  // 5. Name length 25–50 chars
  const nameLen = safeName.length;
  const nameLenPassed = nameLen >= 25 && nameLen <= 50;

  // 6. No abuse words in name
  const nameLower = safeName.toLowerCase();
  const noAbusePassed = !ABUSE_WORDS.some(w => nameLower.includes(w.toLowerCase()));

  // 7. No keyword repeated 3+ times in name
  const wordFreq: Record<string, number> = {};
  safeName.replace(/[^\w\s가-힣]/g, ' ').split(/\s+/).forEach(w => {
    if (w.length > 1) wordFreq[w] = (wordFreq[w] ?? 0) + 1;
  });
  const noRepeatPassed = !Object.values(wordFreq).some(c => c >= 3);

  // 8. Main image exists
  const mainImagePassed = !!(mainImage && mainImage.length > 0);

  // 9. Extra images >= 3
  const extraImages = safeImages.filter(img => img !== mainImage);
  const extraImagesPassed = extraImages.length >= 3;

  // 10. Shipping template connected
  const shippingPassed = !!(shippingTemplateId && shippingTemplateId.length > 0);

  // 11. Net margin >= 30%
  const sp  = salePrice     ?? 0;
  const sup = supplierPrice ?? 0;
  const sf  = shippingFee   ?? 3000;
  const NAVER_FEE_RATE = 0.05733;
  let netMarginPassed = false;
  if (sp > 0 && sup > 0) {
    const naverFee   = sp * NAVER_FEE_RATE;
    const netProfit  = sp - sup - sf - naverFee;
    const netMargin  = netProfit / sp;
    netMarginPassed  = netMargin >= 0.30;
  }

  // ── Build items ────────────────────────────────────────────────────────────
  const items: ReadinessItem[] = [
    {
      id: 'category',
      passed: categoryPassed,
      label: '카테고리',
      message: '카테고리 미선택 — 노출 순위 대폭 하락',
      weight: WEIGHTS.category,
    },
    {
      id: 'keywords_count',
      passed: kwCountPassed,
      label: '키워드 5개+',
      message: `키워드 부족 (${safeKeywords.length}/5) — 검색 유입 감소`,
      weight: WEIGHTS.keywords_count,
    },
    {
      id: 'tags_count',
      passed: tagCountPassed,
      label: '태그 10개+',
      message: `태그 미완성 (${safeTags.length}/10) — 최대 8점 손실`,
      weight: WEIGHTS.tags_count,
    },
    {
      id: 'keyword_in_front',
      passed: kwInFrontPassed,
      label: '앞15자 키워드',
      message: '상품명 앞 15자에 핵심 키워드 없음 — 검색 가중치 손실',
      weight: WEIGHTS.keyword_in_front,
    },
    {
      id: 'name_length',
      passed: nameLenPassed,
      label: `상품명 길이 (${nameLen}자)`,
      message: nameLen < 25
        ? `상품명 너무 짧음 (${nameLen}자 / 최소 25자) — 정보 부족`
        : `상품명 너무 김 (${nameLen}자 / 최대 50자) — 모바일 잘림`,
      weight: WEIGHTS.name_length,
    },
    {
      id: 'no_abuse',
      passed: noAbusePassed,
      label: '어뷰징 없음',
      message: '어뷰징 단어 감지 — 네이버 알고리즘 페널티 위험',
      weight: WEIGHTS.no_abuse,
    },
    {
      id: 'no_repeat',
      passed: noRepeatPassed,
      label: '키워드 반복 없음',
      message: '동일 키워드 3회 이상 반복 — 어뷰징 인식 위험',
      weight: WEIGHTS.no_repeat,
    },
    {
      id: 'main_image',
      passed: mainImagePassed,
      label: '대표이미지',
      message: '대표이미지 없음 — 네이버 쇼핑 노출 불가',
      weight: WEIGHTS.main_image,
    },
    {
      id: 'extra_images',
      passed: extraImagesPassed,
      label: `추가이미지 (${extraImages.length}장)`,
      message: `추가이미지 부족 (${extraImages.length}/3장) — 체류시간 감소`,
      weight: WEIGHTS.extra_images,
    },
    {
      id: 'shipping_template',
      passed: shippingPassed,
      label: '배송 템플릿',
      message: '배송 템플릿 미연결 — 묶음배송 불가',
      weight: WEIGHTS.shipping_template,
    },
    {
      id: 'net_margin',
      passed: netMarginPassed,
      label: '순마진 30%+',
      message: '순마진 30% 미만 — 광고비·반품비 발생 시 적자 위험',
      weight: WEIGHTS.net_margin,
    },
  ];

  // ── Calculate score (sum of weights for passed items) ─────────────────────
  const score = items.reduce((acc, item) => (item.passed ? acc + item.weight : acc), 0);

  // ── Grade ─────────────────────────────────────────────────────────────────
  const grade: ReadinessResult['grade'] =
    score >= 90 ? 'S' :
    score >= 75 ? 'A' :
    score >= 60 ? 'B' :
    score >= 45 ? 'C' : 'D';

  // ── Label (short summary of failures) ────────────────────────────────────
  const failed = items.filter(i => !i.passed);
  const failureSnippets = failed.slice(0, 2).map(i => i.label);
  const label =
    failed.length === 0
      ? `${score}% — 업로드 준비 완료`
      : `${score}% — ${failureSnippets.join(', ')}${failed.length > 2 ? ` 외 ${failed.length - 2}건` : ''}`;

  return { score, items, failed, grade, label };
}

// ── Grade style helper ────────────────────────────────────────────────────────
export const READINESS_GRADE_STYLE: Record<ReadinessResult['grade'], { bg: string; color: string; border: string }> = {
  S: { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  A: { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  B: { bg: '#fef9c3', color: '#a16207', border: '#fde68a' },
  C: { bg: '#ffedd5', color: '#c2410c', border: '#fdba74' },
  D: { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
};

// ── Compact readiness bar component data (for table column) ──────────────────
export function getReadinessColor(score: number): string {
  if (score >= 90) return '#15803d';
  if (score >= 75) return '#1d4ed8';
  if (score >= 60) return '#a16207';
  if (score >= 45) return '#c2410c';
  return '#b91c1c';
}
