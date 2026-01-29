import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { DomemaeParser } from '@/lib/crawler/domemae-parser';
import type { CrawlResult } from '@/types/crawler';

export async function POST(request: NextRequest): Promise<NextResponse<CrawlResult>> {
  const startTime = Date.now();

  try {
    const { url } = await request.json();

    // URL 검증
    if (!url || !url.includes('domeggook.com')) {
      return NextResponse.json({
        success: false,
        error: '도매매(domeggook.com) URL을 입력해주세요.',
      }, { status: 400 });
    }

    console.log('🔍 크롤링 시작:', url);

    // HTML 가져오기
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      timeout: 15000,
    });

    // 파서로 데이터 추출
    const parser = new DomemaeParser(response.data);

    const productData = {
      name: parser.extractProductName(),
      supplierPrice: parser.extractSupplierPrice(),
      salePrice: parser.extractSalePrice(),
      images: parser.extractImages(),
      options: parser.extractOptions(),
      description: parser.extractDescription(),
      category: parser.extractCategory(),
      supplier: parser.extractSupplier(),
      sourceUrl: url,
    };

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log('✅ 크롤링 완료:', productData.name, `(${duration}초)`);

    return NextResponse.json({
      success: true,
      data: productData,
      duration,
    });

  } catch (error: any) {
    const duration = Math.round((Date.now() - startTime) / 1000);

    console.error('❌ 크롤링 실패:', error.message);

    return NextResponse.json({
      success: false,
      error: error.message || '크롤링 중 오류가 발생했습니다',
      duration,
    }, { status: 500 });
  }
}
