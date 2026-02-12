// src/lib/crawler/auto-mapper.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI 자동 매핑 (카테고리, 원산지, 키워드)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { PrismaClient } from '@prisma/client';
import type { CrawledData, AutoMappingResult } from '@/types/crawler';

const prisma = new PrismaClient();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 자동 매핑 함수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function autoMapProduct(crawled: CrawledData): Promise<AutoMappingResult> {
  // 1. 카테고리 매핑
  const category = await matchCategory(crawled.title, crawled.description);

  // 2. 원산지 매핑
  const origin = await matchOrigin(crawled.title, crawled.description, crawled.specs);

  // 3. 키워드 추출
  const keywords = extractKeywords(crawled.title, crawled.description);

  // 4. 네이버 엑셀 88개 필드 자동 채움
  const naverExcelData = generateNaverExcelData(crawled, category, origin);

  return {
    category,
    origin,
    keywords,
    naverExcelData,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. 카테고리 자동 매칭 (AI 기반)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function matchCategory(title: string, description: string) {
  // 텍스트에서 카테고리 키워드 추출
  const text = `${title} ${description}`.toLowerCase();

  // DB에서 모든 카테고리 가져오기
  const categories = await prisma.naverCategory.findMany({
    where: { active: true },
  });

  // 키워드 매칭 점수 계산
  const scores = categories.map(cat => {
    let score = 0;
    const fullPath = (cat.fullPath || '').toLowerCase();
    const levels = [cat.level1, cat.level2, cat.level3, cat.level4]
      .filter(Boolean)
      .map(l => l!.toLowerCase());

    // 레벨별 키워드가 포함되어 있으면 점수 증가
    levels.forEach((level, idx) => {
      if (text.includes(level)) {
        score += (4 - idx) * 10; // 세분류일수록 높은 점수
      }
    });

    // 정확히 일치하는 경우 보너스
    if (title.toLowerCase().includes(cat.level4?.toLowerCase() || '')) {
      score += 50;
    }

    return { category: cat, score };
  });

  // 가장 높은 점수의 카테고리 선택
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  // 매칭 근거 생성
  const reasoning = generateCategoryReasoning(best.category, title, best.score);

  return {
    code: best.category.code,
    fullPath: best.category.fullPath || '',
    level1: best.category.level1 || '',
    level2: best.category.level2 || undefined,
    level3: best.category.level3 || undefined,
    level4: best.category.level4 || undefined,
    confidence: Math.min(best.score / 100, 1),
    reasoning,
  };
}

function generateCategoryReasoning(category: any, title: string, score: number): string {
  const levels = [category.level1, category.level2, category.level3, category.level4]
    .filter(Boolean);

  if (score > 50) {
    return `상품명에 "${category.level4 || category.level3}"가 포함되어 ${levels.join(' > ')} 카테고리로 매칭했습니다.`;
  } else if (score > 20) {
    return `상품명과 설명에서 ${levels.join(', ')} 키워드를 발견하여 매칭했습니다.`;
  } else {
    return `유사한 키워드를 기반으로 ${category.level1} 카테고리로 분류했습니다.`;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. 원산지 자동 매칭
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function matchOrigin(
  title: string,
  description: string,
  specs?: Record<string, string>
) {
  const text = `${title} ${description} ${JSON.stringify(specs || {})}`.toLowerCase();

  // DB에서 원산지 목록 가져오기
  const origins = await prisma.originCode.findMany({
    where: { active: true },
  });

  // 원산지 키워드 매칭
  for (const origin of origins) {
    const region = origin.region.toLowerCase();

    // 정확히 일치하는 경우
    if (text.includes(region)) {
      return {
        code: origin.code,
        region: origin.region,
        confidence: 1.0,
        source: (specs && Object.keys(specs).some(k => k.includes('원산지'))) 
          ? 'specs' as const 
          : (description.includes(origin.region) 
            ? 'description' as const 
            : 'product_name' as const),
      };
    }
  }

  // 기본값: 국산
  return {
    code: '0',
    region: '국산',
    confidence: 0.5,
    source: 'default' as const,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. 키워드 자동 추출
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractKeywords(title: string, description: string) {
  // 한글, 영어, 숫자만 추출
  const text = `${title} ${description}`.toLowerCase();
  const words = text.split(/[\s,./()\[\]]+/).filter(w => w.length >= 2);

  // 불용어 제거
  const stopWords = ['입니다', '있습니다', '합니다', '제품', '상품', '이', '가', '을', '를', '은', '는'];
  const filtered = words.filter(w => !stopWords.includes(w));

  // 빈도수 계산
  const frequency: Record<string, number> = {};
  filtered.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // 빈도순 정렬
  const sorted = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);

  // Primary: 상품명에서 추출 (5-7개)
  const titleWords = title.split(/[\s,./()]+/).filter(w => w.length >= 2).slice(0, 7);

  // Secondary: 설명에서 추출
  const secondaryWords = sorted.slice(7, 20);

  // SEO 최적화: Primary + 조합
  const seoOptimized = [
    ...titleWords,
    `${titleWords[0]} ${titleWords[1]}`.trim(),
    `${titleWords[0]} 추천`,
  ].filter(Boolean).slice(0, 10);

  return {
    primary: [...new Set(titleWords)],
    secondary: [...new Set(secondaryWords)],
    seoOptimized: [...new Set(seoOptimized)],
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. 네이버 엑셀 88개 필드 자동 채움
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateNaverExcelData(
  crawled: CrawledData,
  category: AutoMappingResult['category'],
  origin: AutoMappingResult['origin']
): Record<string, any> {
  return {
    // 필수 20개
    상품명: crawled.title.substring(0, 100),
    판매가: crawled.price,
    대표이미지: crawled.images[0] || '',
    추가이미지: crawled.images.slice(1, 10).join(','),
    브랜드: crawled.brand || '꽃틔움',
    제조사: crawled.manufacturer || crawled.brand || '도매매 공급사',
    원산지코드: origin.code,
    카테고리코드: category.code,
    상세설명: crawled.description,
    재고수량: 10,

    // 추가 68개 (주요 항목만)
    배송방법: '택배배송',
    배송비: 3000,
    무료배송최소금액: 30000,
    택배사코드: 'CJGLS',
    반품배송비: 6000,
    교환배송비: 6000,
    AS연락처: '고객센터 문의',
    AS안내: '평일 10:00~18:00',
    과세여부: '과세',
    상품상태: '신상품',
    성인인증: 'N',
    미성년자구매: 'Y',
    병행수입: 'N',

    // SEO 관련
    검색키워드: crawled.title.split(' ').slice(0, 5).join(','),
    메타태그: category.fullPath,

    // 옵션 (있는 경우)
    옵션사용여부: crawled.options ? 'Y' : 'N',

    // 크롤링 메타정보
    _크롤링URL: crawled.url,
    _크롤링일시: crawled.meta.crawledAt,
    _자동매핑신뢰도: category.confidence,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 네이버 상품명 최적화 (27자)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function optimizeProductName(title: string): string {
  // 불필요한 문자 제거
  let cleaned = title
    .replace(/\[[^\]]*\]/g, '')        // [브랜드명] 제거
    .replace(/\([^)]*\)/g, '')          // (옵션) 제거
    .replace(/\s+/g, ' ')                // 연속 공백 제거
    .trim();

  // 27자로 자르기
  if (cleaned.length <= 27) {
    return cleaned;
  }

  // 의미 단위로 자르기 (띄어쓰기 기준)
  const words = cleaned.split(' ');
  let result = '';

  for (const word of words) {
    if ((result + ' ' + word).length > 27) {
      break;
    }
    result += (result ? ' ' : '') + word;
  }

  return result || cleaned.substring(0, 27);
}
