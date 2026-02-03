// src/app/api/debug/product/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // 상품 데이터 조회
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('공급사상품코드', params.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Product not found', details: error.message },
        { status: 404 }
      );
    }

    // 이미지 개수 계산
    const imageFields = [
      product.이미지1,
      product.이미지2,
      product.이미지3,
      product.이미지4,
      product.이미지5,
      product.이미지6,
      product.이미지7,
      product.이미지8,
      product.이미지9,
      product.이미지10,
    ];

    const imageCount = imageFields.filter(Boolean).length;
    const imageUrls = imageFields.filter(Boolean);

    // Storage 파일 존재 확인
    const storageChecks = await Promise.all(
      imageUrls.map(async (url) => {
        if (!url) return null;

        try {
          // URL에서 버킷 경로 추출
          const urlObj = new URL(url);
          const path = urlObj.pathname;

          return {
            url,
            path,
            accessible: true,
          };
        } catch (err) {
          return {
            url,
            path: null,
            accessible: false,
            error: 'Invalid URL',
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      product: {
        id: product.공급사상품코드,
        name: product.상품명,
        imageCount,
        images: {
          이미지1: product.이미지1,
          이미지2: product.이미지2,
          이미지3: product.이미지3,
          이미지4: product.이미지4,
          이미지5: product.이미지5,
          이미지6: product.이미지6,
        },
        storageChecks: storageChecks.filter(Boolean),
        seoFields: {
          title: product.네이버제목,
          keywords: product.네이버키워드,
          description: product.네이버설명,
          brand: product.네이버브랜드,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
