// src/lib/seo.ts
// Naver SEO score calculation — 2026 revised (100-point scale)
// Weights: category(25) + title(25) + attributes(15) + keywords(15) + image(20)

// Default category code assigned at product creation — means "not set"
const DEFAULT_CATEGORY_CODE = '50003307';

interface SeoProduct {
  id?: string;
  name: string;
  mainImage?: string | null;
  images?: string[];
  imageCount?: number;
  imageAltTexts?: string[];
  naverCategoryCode?: string | null;
  naver_title?: string | null;
  naver_keywords?: string | null;
  naver_description?: string | null;
  naver_brand?: string | null;
  naver_origin?: string | null;
  naver_material?: string | null;
  naver_color?: string | null;
  naver_size?: string | null;
  naver_care_instructions?: string | null;
}

export interface SeoScoreDetail {
  total: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  categoryScore: number;   // /25
  titleScore: number;      // /25
  attributeScore: number;  // /15
  keywordScore: number;    // /15
  imageScore: number;      // /20
  suggestions: string[];
}

// ─── Category (25pts) ─────────────────────────────────────────────────────────
function calcCategoryScore(p: SeoProduct): number {
  const code = p.naverCategoryCode;
  if (!code || code === DEFAULT_CATEGORY_CODE || code.trim() === '') return 0;
  return 25;
}

// ─── Title / Product name (25pts) ─────────────────────────────────────────────
// Points: naver_title exists+length (15) + first-15-char keyword check (5) + no spam (5)
function calcTitleScore(p: SeoProduct): number {
  const title = p.naver_title ?? '';
  if (!title) return 0;

  let score = 0;

  // Length: 25+ chars = 15pts, 15+ = 10pts, 5+ = 5pts
  if (title.length >= 25) score += 15;
  else if (title.length >= 15) score += 10;
  else if (title.length >= 5)  score += 5;

  // Front-loading: main product name keyword in first 15 chars
  const nameWord = p.name.split(' ')[0] ?? '';
  if (nameWord.length >= 2 && title.substring(0, 15).includes(nameWord)) score += 5;
  else if (title.length >= 5) score += 2; // partial credit

  // No spam: same word repeated 3+ times is penalised
  const words = title.split(/\s+/);
  const freq: Record<string, number> = {};
  words.forEach(w => { freq[w] = (freq[w] ?? 0) + 1; });
  const spammed = Object.values(freq).some(c => c >= 3);
  if (!spammed) score += 5;

  return Math.min(score, 25);
}

// ─── Attributes (15pts) ───────────────────────────────────────────────────────
// brand(3) + origin(3) + material(3) + color(3) + size(3)
function calcAttributeScore(p: SeoProduct): number {
  let score = 0;
  if (p.naver_brand)             score += 3;
  if (p.naver_origin)            score += 3;
  if (p.naver_material)          score += 3;
  if (p.naver_color)             score += 3;
  if (p.naver_size)              score += 3;
  return score;
}

// ─── Keywords / Tags (15pts) ──────────────────────────────────────────────────
// 1-2 kw=5pts, 3-4 kw=10pts, 5+ kw=15pts; description bonus already merged in title
function calcKeywordScore(p: SeoProduct): number {
  const kwRaw = p.naver_keywords ?? '';
  const keywords = kwRaw.split(',').map(k => k.trim()).filter(Boolean);
  if (keywords.length >= 5) return 15;
  if (keywords.length >= 3) return 10;
  if (keywords.length >= 1) return 5;
  return 0;
}

// ─── Image (20pts) ────────────────────────────────────────────────────────────
// Main image required (10pts) + additional 4+ images (10pts)
function calcImageScore(p: SeoProduct): number {
  let score = 0;
  if (p.mainImage) score += 10;

  const total = p.imageCount
    ?? ((p.mainImage ? 1 : 0) + (p.images?.length ?? 0));

  // Additional images (excluding main): scale to 10pts
  const additional = total - (p.mainImage ? 1 : 0);
  if (additional >= 4)      score += 10;
  else if (additional >= 3) score += 7;
  else if (additional >= 2) score += 5;
  else if (additional >= 1) score += 3;

  return score;
}

// ─── Grade ────────────────────────────────────────────────────────────────────
function toGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 45) return 'C';
  return 'D';
}

// ─── Suggestions ─────────────────────────────────────────────────────────────
function buildSuggestions(p: SeoProduct, detail: Omit<SeoScoreDetail, 'suggestions' | 'grade' | 'total'>): string[] {
  const s: string[] = [];

  if (detail.categoryScore === 0)
    s.push('카테고리를 정확히 설정하세요. 검색 노출에 가장 중요합니다. (+25점)');

  if (!p.naver_title)
    s.push('네이버 전용 상품명을 입력하세요. (+최대 25점)');
  else if (p.naver_title.length < 15)
    s.push('네이버 상품명을 15자 이상으로 늘리세요. 현재: ' + p.naver_title.length + '자');

  const keywords = (p.naver_keywords ?? '').split(',').filter(k => k.trim());
  if (keywords.length === 0)
    s.push('검색 키워드를 5개 이상 입력하세요. (+15점)');
  else if (keywords.length < 5)
    s.push(`키워드를 ${5 - keywords.length}개 더 추가하세요. (현재 ${keywords.length}개)`);

  if (!p.naver_brand)    s.push('브랜드를 입력하세요. (+3점)');
  if (!p.naver_origin)   s.push('원산지를 설정하세요. (+3점)');
  if (!p.naver_material) s.push('소재/재질을 입력하세요. (+3점)');
  if (!p.naver_color)    s.push('색상을 입력하세요. (+3점)');
  if (!p.naver_size)     s.push('사이즈를 입력하세요. (+3점)');

  if (!p.mainImage) {
    s.push('대표 이미지를 업로드하세요. (+10점)');
  } else {
    const total = p.imageCount ?? ((p.mainImage ? 1 : 0) + (p.images?.length ?? 0));
    const additional = Math.max(0, total - 1);
    if (additional < 4)
      s.push(`추가 이미지를 ${4 - additional}장 더 업로드하세요. (현재 추가 ${additional}장)`);
  }

  return s;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function calculateSeoScore(p: SeoProduct): number {
  return (
    calcCategoryScore(p) +
    calcTitleScore(p) +
    calcAttributeScore(p) +
    calcKeywordScore(p) +
    calcImageScore(p)
  );
}

export function calculateSeoScoreDetail(p: SeoProduct): SeoScoreDetail {
  const categoryScore  = calcCategoryScore(p);
  const titleScore     = calcTitleScore(p);
  const attributeScore = calcAttributeScore(p);
  const keywordScore   = calcKeywordScore(p);
  const imageScore     = calcImageScore(p);
  const total          = categoryScore + titleScore + attributeScore + keywordScore + imageScore;
  const grade          = toGrade(total);
  const suggestions    = buildSuggestions(p, { categoryScore, titleScore, attributeScore, keywordScore, imageScore });
  return { total, grade, categoryScore, titleScore, attributeScore, keywordScore, imageScore, suggestions };
}

// Aliases for backwards compatibility
export const calculateNaverSeoScore = calculateSeoScore;

export function getSeoSuggestions(p: SeoProduct): string[] {
  return calculateSeoScoreDetail(p).suggestions;
}

export function getSeoGrade(score: number): { grade: string; color: string; label: string } {
  if (score >= 90) return { grade: 'S', color: 'purple', label: '완벽' };
  if (score >= 75) return { grade: 'A', color: 'green',  label: '우수' };
  if (score >= 60) return { grade: 'B', color: 'blue',   label: '양호' };
  if (score >= 45) return { grade: 'C', color: 'yellow', label: '보통' };
  return                { grade: 'D', color: 'red',    label: '개선필요' };
}

// Legacy image score (still used by honey-score.ts)
export function calculateImageScore(p: SeoProduct): number {
  return calcImageScore(p);
}

export interface SeoStats {
  avgScore: number;
  perfectCount: number;
  goodCount: number;
  needsImprovementCount: number;
  withImagesCount: number;
  withoutImagesCount: number;
}

export function calculateSeoStats(products: SeoProduct[]): SeoStats {
  if (products.length === 0) return { avgScore: 0, perfectCount: 0, goodCount: 0, needsImprovementCount: 0, withImagesCount: 0, withoutImagesCount: 0 };
  const scores = products.map(p => calculateSeoScore(p));
  return {
    avgScore: Math.round(scores.reduce((s, n) => s + n, 0) / products.length),
    perfectCount: scores.filter(s => s >= 90).length,
    goodCount: scores.filter(s => s >= 75 && s < 90).length,
    needsImprovementCount: scores.filter(s => s < 45).length,
    withImagesCount: products.filter(p => p.mainImage).length,
    withoutImagesCount: products.filter(p => !p.mainImage).length,
  };
}
