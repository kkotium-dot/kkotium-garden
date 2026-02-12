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
  "naver_title": "네이버 쇼핑 상품명 (공백 포함 25~35자, 최적 27자, 반드시 상품명 포함)",
  "naver_keywords": "쉼표로 구분 (5~7개, 중복/동의어 최소화)",
  "naver_description": "네이버 쇼핑 설명 (공백 포함 100~300자, 키워드 자연 삽입)",
  "seo_title": "일반 SEO 제목 (10~60자)",
  "seo_description": "일반 SEO 설명 (50~160자)"
}

규칙:
- 글자 수는 공백 포함 글자 수 기준
- naver_title: 25~35자 (최적 27자), 키워드 중복 금지, 35자 초과 금지
- naver_keywords: 5~7개 권장, 구매 의도 높은 키워드 우선
- naver_description: 100~300자, 상품 특징+용도+배송+선물 상황 포함
- seo_title: 상품명 포함, 검색 최적화
- seo_description: 간결하게 50~160자, 핵심만 포함
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
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: '당신은 네이버 쇼핑 SEO 전문가입니다. 2026년 네이버 쇼핑 검색 알고리즘을 기반으로 최적화된 상품 정보를 생성합니다. 상품명 27자 전후, 설명 100~300자가 최적입니다.',
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
    console.log('   네이버 상품명:', aiResponse.naver_title, `(${aiResponse.naver_title?.length || 0}자)`);
    console.log('   키워드:', aiResponse.naver_keywords);
    console.log('   네이버 설명:', aiResponse.naver_description?.substring(0, 50) + '...', `(${aiResponse.naver_description?.length || 0}자)`);
    console.log('   SEO 제목:', aiResponse.seo_title);
    console.log('   SEO 설명:', aiResponse.seo_description?.substring(0, 50) + '...');

    // ✨ productId가 'temp'가 아닐 때만 DB 업데이트
    if (productId !== 'temp') {
      await prisma.product.update({
        where: { id: productId },
        data: {
          title: aiResponse.seo_title || aiResponse.naver_title,
          description: aiResponse.seo_description || aiResponse.naver_description?.substring(0, 160),
          naver_title: aiResponse.naver_title,
          naver_keywords: aiResponse.naver_keywords,
          naver_description: aiResponse.naver_description,
        },
      });
      console.log('✅ DB 업데이트 완료!');
    } else {
      console.log('⚠️ 신규 등록 모드: DB 업데이트 건너뜀');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({
      success: true,
      data: {
        seo_title: aiResponse.seo_title || aiResponse.naver_title,
        seo_description: aiResponse.seo_description || aiResponse.naver_description?.substring(0, 160),
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
            title: aiResponse.seo_title || aiResponse.naver_title,
            description: aiResponse.seo_description || aiResponse.naver_description?.substring(0, 160),
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
