// src/lib/helpers/data-transform.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 데이터 변환 헬퍼 (편집 페이지 오류 해결)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 값을 안전하게 배열로 변환
 */
export function ensureArray(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      // JSON 파싱 시도
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      // 쉼표로 분리
      return value.split(',').map(v => v.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * 값을 안전하게 문자열로 변환
 */
export function ensureString(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

/**
 * 키워드를 배열로 변환 (편집 페이지용)
 */
export function parseKeywords(keywords: any): string[] {
  const arr = ensureArray(keywords);
  // 빈 문자열 제거
  return arr.filter(k => k && k.trim());
}

/**
 * 키워드를 문자열로 변환 (저장용)
 */
export function stringifyKeywords(keywords: string[]): string {
  return keywords.filter(k => k && k.trim()).join(', ');
}

/**
 * SEO 데이터 안전 변환
 */
export function safeSeoData(seoData: any) {
  if (!seoData) return null;

  return {
    ...seoData,
    keywords: parseKeywords(seoData.keywords),
    tags: ensureArray(seoData.tags),
  };
}

/**
 * 상품 데이터 안전 변환 (편집 페이지용)
 */
export function safeProductData(product: any) {
  if (!product) return null;

  return {
    ...product,
    keywords: parseKeywords(product.keywords),
    images: ensureArray(product.images),
    tags: ensureArray(product.tags),
  };
}
