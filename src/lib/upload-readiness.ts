// src/lib/upload-readiness.ts
// Upload readiness — 11-point automatic checklist for Naver Smart Store upload
// Used by: products/new (side panel), reactivation cards, products table, excel modal

// ── Abuse word blacklist (Naver algorithm penalty triggers) ──────────────────
export const ABUSE_WORDS = [
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
  | 'net_margin'
  // CATEGORY_UX_CLARITY_2026-09-10 — split out from 'category'. This tracks
  // ONLY the internal reference classification (category_id, AI-free/very
  // conservative — resolveConfidentCategory) that upload-readiness had
  // wrongly ANDed into the same pass/fail as the Naver-listing category
  // (naverCategoryCode). A product with a perfectly valid Naver category
  // was showing as "카테고리 실패" (red, blocking the listing feel) purely
  // because this unrelated internal signal was unconfident — misleading the
  // operator into thinking the AI category matcher itself was broken.
  | 'category_db_ref';

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
  // UCE-4 (2026-08-27): true when /api/category/suggest ran all 3 layers
  // (deterministic + AI + Naver page-1 validation) and still found nothing —
  // a genuinely hard-to-classify item, distinct from "nobody's picked one yet".
  categoryConfirmNeeded?: boolean;
  // 2026-09-02 (category_id 백필 방향전환, Desktop 지시): true when
  // Product.category_id (the naver_categories FK used for dropship-fitness/
  // sourcing scoring — separate from naverCategoryCode, which drives the
  // Naver listing itself) couldn't be confidently derived from the product
  // name (src/lib/naver/category-id-resolver.ts#resolveConfidentCategory
  // returned null). A product can have a perfectly valid naverCategoryCode
  // and still need this — the two are different signals, not aliases (a
  // pre-existing bug conflated them, see dashboard-product.ts 2026-09-02
  // fix). Auto-correcting category_id proved unsafe (범용접미어 blocklist
  // bypass — "샤워필터"→정수기, "실외기"→TV커버) so this surfaces it for a
  // human to confirm instead of guessing.
  categoryDbConfirmNeeded?: boolean;
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
// CATEGORY_UX_CLARITY_2026-09-10 — rebalanced while splitting out
// category_db_ref (see ReadinessItemId above). Also corrects a pre-existing
// drift: this table summed to 110, not 100 as the comment claimed (never
// caught because ReadinessResult.score is used relatively, not asserted
// against 100 anywhere) — now sums to exactly 100.
const WEIGHTS: Record<ReadinessItemId, number> = {
  category:          13,
  keywords_count:    11,
  tags_count:         9,
  keyword_in_front:   9,
  name_length:        7,
  no_abuse:           9,
  no_repeat:          7,
  main_image:        11,
  extra_images:       7,
  shipping_template:  9,
  net_margin:         7,
  category_db_ref:    1, // reference-only signal — near-zero weight, never blocks
};

// ── Core calculation ─────────────────────────────────────────────────────────
export function calcUploadReadiness(input: ReadinessInput): ReadinessResult {
  const {
    naverCategoryCode,
    categoryConfirmNeeded = false,
    categoryDbConfirmNeeded = false,
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

  // 1. Category check — default code "" means not selected. This is ONLY
  // the Naver-listing category (what actually goes into the product upload)
  // — category_id confidence is tracked separately below (category_db_ref),
  // per CATEGORY_UX_CLARITY_2026-09-10: the two are independent signals and
  // must not gate each other (a valid Naver category should never show as
  // "실패" just because the internal reference classifier wasn't confident).
  const categoryPassed = !!(
    naverCategoryCode &&
    naverCategoryCode.length > 0
  );
  // 1b. Internal reference classification — informational only, near-zero
  // weight (see WEIGHTS.category_db_ref). "Passed" here just means either
  // it resolved confidently OR there's nothing to classify yet (no name).
  const categoryDbRefPassed = !categoryDbConfirmNeeded;

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
      // CATEGORY_UX_CLARITY_2026-09-10 (원본메모 지시: 두 카테고리 시스템이
      // 혼란스럽게 다른 이름을 동시에 보여줌 — 실측 확인: 위쪽 배너는 네이버
      // 노출용 카테고리(/api/category/suggest, Groq+Gemini 교차검증 거침)를
      // 판정하고, 이 항목은 순수하게 그 네이버 카테고리 선택 여부만 본다.
      // 내부 참고용 분류는 아래 category_db_ref 항목으로 완전히 분리했다
      // (이전엔 여기서 AND로 합쳐져 네이버 카테고리가 있어도 "실패"로 떴다).
      message: categoryConfirmNeeded
        ? '카테고리 확인 필요 — 자동매칭 3단계(결정론적·AI·검색신호) 전부 실패, 직접 확인해주세요'
        : '카테고리 미선택 — 노출 순위 대폭 하락',
      weight: WEIGHTS.category,
    },
    {
      id: 'category_db_ref',
      passed: categoryDbRefPassed,
      label: '내부 분류(참고용)',
      message: '내부 참고용 분류 미확정 — 네이버 노출 카테고리(위)와는 별개예요. 검색 진단 정확도를 위한 것이니 후보 중 선택하거나 건너뛰어도 무방해요',
      weight: WEIGHTS.category_db_ref,
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
