// POST /api/ai/keywords — Naver SEO keyword generator (Sprint 7-PC-C, 2026-05-19)
// AI provider: Groq llama-3.1-8b-instant (3 keys round-robin, free 43,200/day)

import { NextRequest, NextResponse } from 'next/server';
import { callGroq } from '@/lib/ai/groq';


export const dynamic = 'force-dynamic';
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

    const hasGroqKey = !!(
      process.env.GROQ_API_KEY ||
      process.env.GROQ_API_KEY_2 ||
      process.env.GROQ_API_KEY_3
    );

    if (!hasGroqKey) {
      return NextResponse.json({
        success: false,
        error: 'AI API 키 미설정. GROQ_API_KEY를 .env.local에 추가해주세요 (무료, 14,400회/일).',
      }, { status: 500 });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 Groq AI 키워드 생성 시작 (llama-3.1-8b-instant)');
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

    const content = await callGroq(
      prompt,
      '당신은 네이버 쇼핑 SEO 전문가입니다. JSON만 응답하세요.',
    );

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
