import { NextRequest, NextResponse } from 'next/server';
import { generateProductDescription } from '@/lib/ai/perplexity';

export async function POST(request: NextRequest) {
  try {
    const { productName, keywords } = await request.json();

    if (!productName) {
      return NextResponse.json(
        { success: false, error: '상품명을 입력해주세요' },
        { status: 400 }
      );
    }

    const description = await generateProductDescription(
      productName,
      keywords || []
    );

    return NextResponse.json({
      success: true,
      description,
    });
  } catch (error: any) {
    console.error('Description API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
