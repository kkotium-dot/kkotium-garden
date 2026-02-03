// src/app/api/naver-seo/ai-generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Perplexity API 호출 함수
async function callPerplexityAPI(productName: string) {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY가 설정되지 않았습니다.');
  }

  const prompt = `당신은 네이버 쇼핑 SEO 전문가입니다. 다음 상품의 네이버 쇼핑 최적화 정보를 생성해주세요.

상품명: ${productName}

다음 형식의 JSON으로 응답해주세요:
{
  "naver_title": "상품명을 포함한 매력적인 제목 (15-30자)",
  "naver_keywords": "관련 키워드를 쉼표로 구분 (5-8개)",
  "naver_description": "상품 설명 (80-150자, 키워드 자연스럽게 포함)"
}

규칙:
- 제목: 실제 네이버 쇼핑에서 인기 있는 키워드 포함, 검색 최적화
- 키워드: 현재 트렌드를 반영한 구매 의도 높은 키워드 우선
- 설명: 상품 특징, 용도, 감성 포인트 포함, 실제 구매 후기 스타일
- 모두 한국어로 작성
- 반드시 JSON 형식으로만 응답

JSON만 응답하세요:`;

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',  // 2026년 현재 사용 가능한 모델
      messages: [
        {
          role: 'system',
          content: '당신은 네이버 쇼핑 SEO 전문가입니다. 실시간 검색 트렌드와 네이버 쇼핑 데이터를 반영하여 최적화된 상품 정보를 생성합니다.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API 오류: ${response.status} - ${error}`);
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

  return JSON.parse(jsonText);
}

// 단일 상품 AI 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, productName } = body;

    if (!productId || !productName) {
      return NextResponse.json(
        { success: false, error: '상품 ID와 이름이 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 Perplexity AI SEO 생성 시작 (sonar-pro)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('상품 ID:', productId);
    console.log('상품명:', productName);

    // Perplexity API 호출
    const aiResponse = await callPerplexityAPI(productName);

    console.log('✅ AI 생성 완료:');
    console.log('   제목:', aiResponse.naver_title);
    console.log('   키워드:', aiResponse.naver_keywords);
    console.log('   설명:', aiResponse.naver_description?.substring(0, 50) + '...');

    // DB 업데이트
    await prisma.product.update({
      where: { id: productId },
      data: {
        naver_title: aiResponse.naver_title,
        naver_keywords: aiResponse.naver_keywords,
        naver_description: aiResponse.naver_description,
      },
    });

    console.log('✅ DB 업데이트 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({
      success: true,
      data: {
        naver_title: aiResponse.naver_title,
        naver_keywords: aiResponse.naver_keywords,
        naver_description: aiResponse.naver_description,
      },
    });
  } catch (error) {
    console.error('❌ AI 생성 에러:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 에러가 발생했습니다.',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 일괄 AI 생성
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '상품 ID 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 Perplexity AI 일괄 SEO 생성 시작 (sonar-pro)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('상품 개수:', productIds.length);

    // 상품 정보 조회
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // 각 상품에 대해 AI 생성
    for (const product of products) {
      try {
        console.log(`\n🔄 처리 중: ${product.name}`);

        const aiResponse = await callPerplexityAPI(product.name);

        // DB 업데이트
        await prisma.product.update({
          where: { id: product.id },
          data: {
            naver_title: aiResponse.naver_title,
            naver_keywords: aiResponse.naver_keywords,
            naver_description: aiResponse.naver_description,
          },
        });

        results.push({
          productId: product.id,
          productName: product.name,
          success: true,
          data: aiResponse,
        });

        successCount++;
        console.log(`   ✅ 완료`);

        // API Rate Limit 방지 (1초 대기)
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`   ❌ 실패:`, error);
        results.push({
          productId: product.id,
          productName: product.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failCount++;
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ 일괄 처리 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({
      success: true,
      successCount,
      failCount,
      results,
    });
  } catch (error) {
    console.error('❌ 일괄 AI 생성 에러:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 에러가 발생했습니다.',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
