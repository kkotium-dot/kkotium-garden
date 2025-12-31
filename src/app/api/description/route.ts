import { NextResponse } from 'next/server';
import { generateProductDescription, generateProductTitle } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { productName, keywords, features, type } = await request.json();
    
    if (!productName) {
      return NextResponse.json(
        { error: '상품명을 입력해주세요.' },
        { status: 400 }
      );
    }

    let result;
    
    if (type === 'title') {
      result = await generateProductTitle(productName, keywords || []);
    } else {
      result = await generateProductDescription(
        productName,
        keywords || [],
        features
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('상품 설명 생성 실패:', error);
    return NextResponse.json(
      { 
        error: '생성 실패',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
