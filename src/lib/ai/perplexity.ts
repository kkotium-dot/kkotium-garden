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

export async function generateProductDescription(
  productName: string,
  keywords: string[] = []
): Promise<string> {
  const keywordText = keywords.length > 0 ? keywords.join(', ') : '';

  const prompt = `다음 상품의 네이버 스마트스토어용 상세 설명을 작성해주세요.\n\n상품명: ${productName}\n키워드: ${keywordText}\n\n조건:\n- 한국어\n- 과장 광고/허위 표현 금지\n- 고객이 바로 이해할 수 있게 핵심 장점 3~5개\n- 마지막에 구매 유도 1문장(부드럽게)\n- 너무 길지 않게 (약 600~1200자)`;

  const messages: PerplexityMessage[] = [
    {
      role: 'system',
      content:
        '당신은 네이버 스마트스토어 상세페이지 카피라이터입니다. 한국어로 자연스럽고 설득력 있게 작성하세요.',
    },
    { role: 'user', content: prompt },
  ];

  try {
    const response = await callPerplexity(messages, 0.6);
    return response.trim();
  } catch (error: any) {
    console.error('Description generation failed:', error);
    throw new Error(`설명 생성 실패: ${error.message}`);
  }
}

export async function generateKeywords(productName: string): Promise<string[]> {
  const prompt = `다음 상품에 대해 네이버 쇼핑 검색 최적화를 위한 키워드 10개를 추천해주세요.\n\n상품명: ${productName}\n\n조건:\n- 검색량이 많은 실용적인 키워드\n- 한국어로만 작성\n- 쉼표로 구분\n\n응답 형식:\n키워드1, 키워드2, 키워드3, 키워드4, 키워드5, 키워드6, 키워드7, 키워드8, 키워드9, 키워드10`;

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

    if (keywords.length >= 5) return keywords;

    const lineKeywords = response
      .split('\n')
      .map(k => k.replace(/^[0-9]+\.\s*/, '').trim())
      .filter(k => k.length > 0 && k.length < 30)
      .slice(0, 10);

    if (lineKeywords.length >= 5) return lineKeywords;

    return [
      productName, productName + ' 추천', productName + ' 인기',
      productName + ' 베스트', productName + ' 구매', productName + ' 판매',
      productName + ' 가격', productName + ' 후기', productName + ' 리뷰',
      productName + ' 최저가',
    ].slice(0, 10);

  } catch (error: any) {
    console.error('Keywords generation failed:', error);
    throw new Error(`키워드 생성 실패: ${error.message}`);
  }
}
