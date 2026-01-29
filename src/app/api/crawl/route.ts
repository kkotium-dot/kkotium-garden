import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { keyword } = await request.json();

    if (!keyword) {
      return NextResponse.json({
        success: false,
        message: '키워드를 입력하세요'
      }, { status: 400 });
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔍 크롤링 시작:', keyword);
    console.log('='.repeat(80));

    // 도매매 검색 URL
    const searchUrl = `https://www.domeme.com/search?keyword=${encodeURIComponent(keyword)}`;
    console.log('URL:', searchUrl);

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!response.ok) {
      throw new Error(`도매매 접속 실패: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const products: any[] = [];

    // 도매매 상품 리스트 파싱 (실제 선택자는 도매매 사이트 구조에 맞게 수정 필요)
    $('.product-item, .item, [class*="product"]').each((index, element) => {
      if (index >= 20) return false; // 최대 20개

      try {
        const $el = $(element);
        
        // 상품명
        const name = $el.find('.product-name, .name, h3, h4, [class*="title"]').first().text().trim();
        
        // 가격
        const priceText = $el.find('.price, .product-price, [class*="price"]').first().text().trim();
        const price = parseInt(priceText.replace(/[^\d]/g, ''));
        
        // 이미지
        const image = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
        
        // URL
        const url = $el.find('a').first().attr('href') || '';
        const fullUrl = url.startsWith('http') ? url : `https://www.domeme.com${url}`;
        
        // 공급업체
        const supplier = $el.find('.supplier, .shop, [class*="seller"]').first().text().trim();

        if (name && price > 0) {
          products.push({
            id: `CRAWL_${Date.now()}_${index}`,
            name,
            price,
            image: image.startsWith('//') ? `https:${image}` : image,
            url: fullUrl,
            supplier: supplier || '도매매'
          });

          console.log(`✅ ${index + 1}. ${name} - ${price.toLocaleString()}원`);
        }
      } catch (err) {
        console.error('상품 파싱 오류:', err);
      }
    });

    console.log('\n📊 크롤링 완료:', products.length, '개');
    console.log('='.repeat(80) + '\n');

    // 실제 크롤링이 안 되면 샘플 데이터 반환 (개발용)
    if (products.length === 0) {
      console.log('⚠️  실제 크롤링 실패 - 샘플 데이터 반환');
      
      const sampleProducts = Array.from({ length: 10 }, (_, i) => ({
        id: `SAMPLE_${Date.now()}_${i}`,
        name: `${keyword} 샘플 상품 ${i + 1}`,
        price: 15000 + (i * 1000),
        image: `https://via.placeholder.com/400x300?text=Sample+${i + 1}`,
        url: `https://www.domeme.com/product/sample_${i}`,
        supplier: '도매매 샘플'
      }));

      return NextResponse.json({
        success: true,
        products: sampleProducts,
        message: '샘플 데이터 (실제 크롤링 실패)'
      });
    }

    return NextResponse.json({
      success: true,
      products,
      message: `${products.length}개 상품을 찾았습니다`
    });

  } catch (error) {
    console.error('\n❌ 크롤링 오류:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '크롤링 실패',
      products: []
    }, { status: 500 });
  }
}
