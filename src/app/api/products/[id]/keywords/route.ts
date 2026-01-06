import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(params.id) },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: '상품을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // ✅ Prisma 모델 필드명 그대로 사용
    const prompt = `다음 상품의 네이버 스마트스토어 키워드를 10개 추천해주세요:
상품명: ${product.name}
가격: ${product.price}원
카테고리: ${product.category}
공급사: ${product.supplier}

키워드는 쉼표로 구분하여 JSON 배열로 반환해주세요.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: '당신은 네이버 스마트스토어 SEO 전문가입니다.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('Perplexity API 호출 실패');
    }

    const data = await response.json();
    const keywords = JSON.parse(data.choices[0].message.content);

    return NextResponse.json({
      success: true,
      keywords,
    });
  } catch (error) {
    console.error('Keyword Generation Error:', error);
    return NextResponse.json(
      { success: false, error: 'AI 키워드 생성 실패', details: String(error) },
      { status: 500 }
    );
  }
}
