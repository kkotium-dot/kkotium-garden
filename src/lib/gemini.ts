import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 네이버 쇼핑 키워드 생성
export async function generateNaverKeywords(
  productName: string,
  category?: string
): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
네이버 스마트스토어 SEO 전문가로서 키워드를 추천해주세요.

상품명: ${productName}
${category ? `카테고리: ${category}` : ''}

요구사항:
1. 네이버 쇼핑 검색량이 높은 키워드 10개
2. 구매 의도가 높은 키워드
3. 롱테일 키워드 5개
4. 2026년 1월 기준 트렌드 반영

형식: 키워드만 쉼표로 구분 (번호나 설명 제외)
예시: 키워드1, 키워드2, 키워드3
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const keywords = text
      .split(',')
      .map(k => k.trim().replace(/^\d+\.\s*/, ''))
      .filter(k => k.length > 0 && k.length < 50)
      .slice(0, 15);

    return keywords;
  } catch (error) {
    console.error('키워드 생성 실패:', error);
    throw error;
  }
}

// 상품 설명 생성
export async function generateProductDescription(
  productName: string,
  keywords: string[],
  features?: string[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
네이버 스마트스토어 상품 상세 설명을 작성해주세요.

상품명: ${productName}
키워드: ${keywords.join(', ')}
${features ? `특징: ${features.join(', ')}` : ''}

요구사항:
1. 구매 욕구를 자극하는 매력적인 문구
2. SEO 키워드 자연스럽게 3회 이상 포함
3. 3-4개 문단, 각 문단 2-3줄
4. 이모지 적절히 활용
5. 네이버 검색 노출에 유리한 구조

형식: HTML 태그 없이 순수 텍스트
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// 상품 제목 추천
export async function generateProductTitle(
  productName: string,
  keywords: string[]
): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
네이버 스마트스토어 상품 제목 5개를 추천해주세요.

상품명: ${productName}
주요 키워드: ${keywords.slice(0, 5).join(', ')}

요구사항:
1. 50자 이내
2. 클릭률이 높은 제목
3. 주요 키워드 1-2개 포함
4. [무료배송], [특가] 등 어필 포인트

형식: 제목만 줄바꿈으로 구분 (번호 제외)
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  return text
    .split('\n')
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(line => line.length > 0 && line.length <= 50)
    .slice(0, 5);
}
