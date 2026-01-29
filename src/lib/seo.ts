// src/lib/seo.ts
// 네이버 쇼핑 SEO 점수 계산 함수

/**
 * 네이버 쇼핑 SEO 점수 계산
 * @param product - 상품 정보 객체
 * @returns SEO 점수 (0-100)
 */
export function calculateNaverSeoScore(product: any): number {
  let score = 0;

  // 1. 네이버 제목 최적화 (20점)
  // - 10자 이상 50자 이하 권장
  if (product.naver_title && product.naver_title.length >= 10) {
    score += 20;
  }

  // 2. 네이버 키워드 (20점)
  // - 3개 이상 10개 이하 권장
  if (product.naver_keywords) {
    const keywords = product.naver_keywords.split(',').filter((k: string) => k.trim());
    if (keywords.length >= 3) {
      score += 20;
    }
  }

  // 3. 네이버 설명 (20점)
  // - 50자 이상 200자 이하 권장
  if (product.naver_description && product.naver_description.length >= 50) {
    score += 20;
  }

  // 4. 브랜드 정보 (10점)
  // - 네이버 쇼핑 필수 항목
  if (product.naver_brand) {
    score += 10;
  }

  // 5. 원산지 정보 (10점)
  // - 네이버 쇼핑 필수 항목
  if (product.naver_origin) {
    score += 10;
  }

  // 6. 재질/소재 정보 (10점)
  // - 상세 정보 충실도
  if (product.naver_material) {
    score += 10;
  }

  // 7. 관리 방법 (10점)
  // - 고객 만족도 향상
  if (product.naver_care_instructions) {
    score += 10;
  }

  return score;
}

/**
 * SEO 점수 등급 반환
 * @param score - SEO 점수
 * @returns 등급 문자열
 */
export function getSeoGrade(score: number): string {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

/**
 * SEO 점수 색상 반환
 * @param score - SEO 점수
 * @returns Tailwind CSS 색상 클래스
 */
export function getSeoColor(score: number): string {
  if (score >= 90) return 'text-purple-600';
  if (score >= 80) return 'text-green-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 50) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * SEO 개선 제안 반환
 * @param product - 상품 정보 객체
 * @returns 개선 제안 배열
 */
export function getSeoSuggestions(product: any): string[] {
  const suggestions: string[] = [];

  if (!product.naver_title || product.naver_title.length < 10) {
    suggestions.push('네이버 제목을 10자 이상 입력하세요');
  }

  if (!product.naver_keywords || product.naver_keywords.split(',').filter((k: string) => k.trim()).length < 3) {
    suggestions.push('네이버 키워드를 3개 이상 입력하세요');
  }

  if (!product.naver_description || product.naver_description.length < 50) {
    suggestions.push('네이버 설명을 50자 이상 입력하세요');
  }

  if (!product.naver_brand) {
    suggestions.push('브랜드 정보를 입력하세요');
  }

  if (!product.naver_origin) {
    suggestions.push('원산지 정보를 입력하세요');
  }

  if (!product.naver_material) {
    suggestions.push('재질/소재 정보를 입력하세요');
  }

  if (!product.naver_care_instructions) {
    suggestions.push('관리 방법을 입력하세요');
  }

  return suggestions;
}
