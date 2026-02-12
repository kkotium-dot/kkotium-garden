import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, category, description } = body;

    if (!productName) {
      return NextResponse.json({ 
        success: false,
        error: '상품명이 필요합니다.' 
      }, { status: 400 });
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ 
        success: false,
        error: 'API 키가 설정되지 않았습니다.',
        message: '.env.local에 PERPLEXITY_API_KEY를 추가해주세요.'
      }, { status: 500 });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 Perplexity AI 키워드 생성 시작 (sonar-pro)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('상품명:', productName);
    console.log('카테고리:', category || '없음');

    const prompt = `당신은 네이버 스마트스토어 SEO 전문가입니다. 다음 상품에 대한 검색 키워드를 추천해주세요.

상품명: ${productName}
카테고리: ${category || '미분류'}
${description ? '설명: ' + description : ''}

다음 조건을 만족하는 키워드 7-10개를 JSON 형식으로 응답하세요:
- 네이버 쇼핑 검색에 최적화
- 실제 검색량이 높은 키워드 우선
- 구매 의도가 높은 키워드 포함
- 띄어쓰기 없이 작성
- 카테고리명, 브랜드명 제외

응답 형식:
{
  "keywords": ["장미꽃다발", "생일선물", "당일배송", "프리미엄꽃", "무료포장"]
}

JSON만 응답하세요:`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',  // ✅ 2026년 최신 모델
        messages: [
          { 
            role: 'system', 
            content: '당신은 네이버 쇼핑 SEO 전문가입니다. 실시간 검색 트렌드를 반영하여 키워드를 추천합니다. JSON만 응답하세요.' 
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error('Perplexity API 오류: ' + response.status + ' - ' + errorText);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // JSON 파싱 (마크다운 코드블록 제거)
    let jsonText = content.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n/, '').replace(/\n```$/, '');
    }

    const result = JSON.parse(jsonText);

    console.log('✅ 키워드', result.keywords.length, '개 생성 완료:');
    console.log('   ', result.keywords.join(', '));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({
      success: true,
      keywords: result.keywords,
      totalCount: result.keywords.length,
    });

  } catch (error: any) {
    console.error('❌ 키워드 생성 실패:', error);

    return NextResponse.json({ 
      success: false,
      error: error.message || '키워드 생성 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
}
