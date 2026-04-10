import { NextRequest, NextResponse } from 'next/server';
import { wholesaleCrawler } from '@/lib/crawlers/wholesale';


export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keyword = body.keyword || '';
    const source = body.source || 'domemae';

    if (!keyword.trim()) {
      return NextResponse.json({
        success: false,
        message: '키워드를 입력하세요',
        products: [],
        source: '',
        timestamp: new Date().toISOString()
      });
    }

    console.log('\n🎯 검색:', keyword, source);

    let result;

    if (source === 'domemae') {
      result = await wholesaleCrawler.searchDomemae(keyword);
    } else if (source === 'domegook') {
      result = await wholesaleCrawler.searchDomegook(keyword);
    } else if (source === 'all') {
      result = await wholesaleCrawler.searchAll(keyword);
    } else {
      return NextResponse.json({
        success: false,
        message: '잘못된 소스',
        products: [],
        source: '',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('\n❌ API 오류:', error);

    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '오류',
      products: [],
      source: '',
      timestamp: new Date().toISOString()
    });
  }
}
