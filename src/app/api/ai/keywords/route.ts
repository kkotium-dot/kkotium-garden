import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { productName } = await request.json();

    if (!productName || productName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '상품명을 입력해주세요' },
        { status: 400 }
      );
    }

    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';

    if (!PERPLEXITY_API_KEY) {
      console.error('PERPLEXITY_API_KEY is not set');
      return NextResponse.json(
        { success: false, error: 'API 키가 설정되지 않았습니다' },
        { status: 500 }
      );
    }

    // 간단하고 명확한 프롬프트
    const prompt = `네이버 쇼핑 검색 최적화를 위한 키워드 10개를 생성해주세요.

상품: ${productName}

요구사항:
- 검색량이 많은 실용적인 키워드
- 한국어만 사용
- 쉼표로 구분
- 설명 없이 키워드만

형식: 키워드1, 키워드2, 키워드3...`;

    console.log('Calling Perplexity API...');
    console.log('API Key:', PERPLEXITY_API_KEY.substring(0, 10) + '...');

    // 최신 Perplexity API 형식 (2025-2026)
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { 
            role: 'system', 
            content: '당신은 한국 이커머스 SEO 전문가입니다. 키워드만 쉼표로 구분하여 응답하세요.' 
          },
          { 
            role: 'user', 
            content: prompt 
          },
        ],
        temperature: 0.3,
        top_p: 0.9,
        return_related_questions: false,
        search_recency_filter: 'month',
        top_k: 0,
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 1,
      }),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API Error:', response.status, errorText);

      if (response.status === 401) {
        return NextResponse.json(
          { success: false, error: 'API 키가 유효하지 않습니다. 키를 확인해주세요.' },
          { status: 500 }
        );
      }

      if (response.status === 400) {
        console.log('Trying alternative model...');
        return tryAlternativeModel(productName, PERPLEXITY_API_KEY);
      }

      if (response.status === 429) {
        return NextResponse.json(
          { success: false, error: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: false, error: `Perplexity API 오류 (${response.status}): ${errorText.substring(0, 100)}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('Perplexity response:', JSON.stringify(data, null, 2));

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid Perplexity response:', data);
      return NextResponse.json(
        { success: false, error: 'API 응답 형식이 올바르지 않습니다' },
        { status: 500 }
      );
    }

    const content = data.choices[0].message.content;
    console.log('Generated content:', content);

    let keywords = extractKeywords(content);

    if (keywords.length < 5) {
      console.warn('Not enough keywords generated, using fallback');
      keywords = generateFallbackKeywords(productName);
    }

    console.log('Final keywords:', keywords);

    return NextResponse.json({
      success: true,
      keywords,
    });
  } catch (error: any) {
    console.error('Keywords generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '키워드 생성 실패' },
      { status: 500 }
    );
  }
}

async function tryAlternativeModel(productName: string, apiKey: string) {
  const models = [
    'llama-3.1-sonar-small-128k-online',
    'llama-3.1-sonar-large-128k-online',
    'llama-3.1-sonar-huge-128k-online',
  ];

  for (const model of models) {
    try {
      console.log(`Trying model: ${model}`);

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { 
              role: 'system', 
              content: 'SEO 키워드 전문가. 키워드만 쉼표로 구분하여 응답.' 
            },
            { 
              role: 'user', 
              content: `${productName}에 대한 네이버 쇼핑 키워드 10개를 쉼표로 구분하여 생성` 
            },
          ],
          temperature: 0.2,
          max_tokens: 200,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.choices && data.choices[0]) {
          const content = data.choices[0].message.content;
          const keywords = extractKeywords(content);
          if (keywords.length >= 5) {
            console.log(`Success with model: ${model}`);
            return NextResponse.json({ success: true, keywords });
          }
        }
      }
    } catch (error) {
      console.error(`Failed with model ${model}:`, error);
      continue;
    }
  }

  const fallbackKeywords = generateFallbackKeywords(productName);
  return NextResponse.json({
    success: true,
    keywords: fallbackKeywords,
  });
}

function extractKeywords(content: string): string[] {
  let keywords = content
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0 && k.length < 50);

  if (keywords.length >= 5) {
    return keywords.slice(0, 10);
  }

  keywords = content
    .split('\n')
    .map(k => k.replace(/^[0-9]+\.\s*/, '').replace(/^[-*]\s*/, '').trim())
    .filter(k => k.length > 0 && k.length < 50);

  if (keywords.length >= 5) {
    return keywords.slice(0, 10);
  }

  keywords = content
    .split(/\s+/)
    .filter(k => k.length > 2 && k.length < 30);

  return keywords.slice(0, 10);
}

function generateFallbackKeywords(productName: string): string[] {
  const suffixes = [
    '추천', '인기', '베스트', '후기', '리뷰',
    '구매', '판매', '가격', '최저가', '할인',
  ];

  return [
    productName,
    ...suffixes.map(s => `${productName} ${s}`),
  ].slice(0, 10);
}
