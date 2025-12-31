import { NextResponse } from 'next/server';
import { generateNaverKeywords } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { productName, category } = await request.json();
    
    if (!productName) {
      return NextResponse.json(
        { error: '상품명을 입력해주세요.' },
        { status: 400 }
      );
    }

    const keywords = await generateNaverKeywords(productName, category);

    return NextResponse.json({ keywords });
  } catch (error) {
    console.error('키워드 생성 실패:', error);
    return NextResponse.json(
      { 
        error: '키워드 생성 실패',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
