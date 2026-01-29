const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  temperature?: number;
  max_tokens?: number;
}

export async function callPerplexity(
  messages: PerplexityMessage[],
  temperature: number = 0.7,
  model: string = 'llama-3.1-sonar-large-128k-online'
): Promise<string> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY가 설정되지 않았습니다');
  }

  if (!PERPLEXITY_API_KEY.startsWith('pplx-')) {
    throw new Error('유효하지 않은 API 키 형식입니다. pplx-로 시작해야 합니다.');
  }

  const request: PerplexityRequest = {
    model,
    messages,
    temperature,
    max_tokens: 1000,
  };

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API Error:', errorText);

      if (response.status === 401) {
        throw new Error('API 키가 유효하지 않습니다.');
      }

      if (response.status === 429) {
        throw new Error('API 요청 한도를 초과했습니다.');
      }

      if (response.status === 400) {
        throw new Error('잘못된 요청입니다. 모델명을 확인해주세요.');
      }

      throw new Error(`Perplexity API 오류 (${response.status})`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Perplexity API 응답 형식이 올바르지 않습니다');
    }

    return data.choices[0].message.content;
  } catch (error: any) {
    console.error('Perplexity call failed:', error);
    throw error;
  }
}

export async function generateKeywords(productName: string): Promise<string[]> {
  const prompt = `다음 상품에 대해 네이버 쇼핑 검색 최적화를 위한 키워드 10개를 추천해주세요.

상품명: ${productName}

조건:
- 검색량이 많은 실용적인 키워드
- 한국어로만 작성
- 쉼표로 구분

응답 형식:
키워드1, 키워드2, 키워드3, 키워드4, 키워드5, 키워드6, 키워드7, 키워드8, 키워드9, 키워드10`;

  const messages: PerplexityMessage[] = [
    { role: 'system', content: '당신은 네이버 쇼핑 SEO 전문가입니다. 키워드만 쉼표로 구분해서 응답하세요.' },
    { role: 'user', content: prompt },
  ];

  try {
    const response = await callPerplexity(messages, 0.5);

    const keywords = response
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0 && k.length < 30)
      .slice(0, 10);

    if (keywords.length >= 5) {
      return keywords;
    }

    const lineKeywords = response
      .split('\n')
      .map(k => k.replace(/^[0-9]+\.\s*/, '').trim())
      .filter(k => k.length > 0 && k.length < 30)
      .slice(0, 10);

    if (lineKeywords.length >= 5) {
      return lineKeywords;
    }

    return [
      productName,
      productName + ' 추천',
      productName + ' 인기',
      productName + ' 베스트',
      productName + ' 구매',
      productName + ' 판매',
      productName + ' 가격',
      productName + ' 후기',
      productName + ' 리뷰',
      productName + ' 최저가',
    ].slice(0, 10);

  } catch (error: any) {
    console.error('Keywords generation failed:', error);
    throw new Error(`키워드 생성 실패: ${error.message}`);
  }
}
