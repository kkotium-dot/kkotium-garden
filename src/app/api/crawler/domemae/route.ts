import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import * as iconv from 'iconv-lite';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL을 입력해주세요' },
        { status: 400 }
      );
    }

    if (!url.includes('domemedb.com') && !url.includes('domeggook.com')) {
      return NextResponse.json(
        { success: false, error: '도매매 URL만 지원합니다' },
        { status: 400 }
      );
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔍 도매매 크롤링 시작');
    console.log('='.repeat(80));
    console.log('📌 URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    if (!response.ok) {
      throw new Error(`페이지를 불러올 수 없습니다 (HTTP ${response.status})`);
    }

    // EUC-KR 디코딩
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let html = '';
    try {
      html = iconv.decode(buffer, 'euc-kr');
      console.log('✅ EUC-KR 디코딩 성공');
    } catch (error) {
      console.log('⚠️  EUC-KR 디코딩 실패, UTF-8 시도');
      html = iconv.decode(buffer, 'utf-8');
    }

    const $ = cheerio.load(html, { 
      decodeEntities: false,
      xmlMode: false,
    });

    console.log('\n' + '─'.repeat(80));
    console.log('📦 데이터 추출 시작');
    console.log('─'.repeat(80));

    // ========================================================================
    // 1. 상품명 추출
    // ========================================================================
    let name = '';

    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle && ogTitle.trim().length > 3) {
      name = ogTitle.trim();
      console.log('\n✓ 상품명 [og:title]:', name);
    }

    if (!name) {
      const titleText = $('title').text().trim();
      const cleaned = titleText.split('|')[0].split('-')[0].split('::')[0].trim();
      if (cleaned.length > 3) {
        name = cleaned;
        console.log('\n✓ 상품명 [title]:', name);
      }
    }

    if (!name) {
      const h1Text = $('h1').first().text().trim();
      if (h1Text.length > 3) {
        name = h1Text;
        console.log('\n✓ 상품명 [h1]:', name);
      }
    }

    const nameSelectors = [
      '.prod_tit', '.product_name', '.goods_name', '.prod_name',
      '.product-title', '.item_name', '.prd_name', '.goods-name',
      '#prod_name', '#product_name', '[itemprop="name"]',
      '.product-info h1', '.goods-info h1',
    ];

    if (!name) {
      for (const selector of nameSelectors) {
        const text = $(selector).first().text().trim();
        if (text && text.length > 3 && text.length < 300) {
          name = text;
          console.log(`\n✓ 상품명 [${selector}]:`, name);
          break;
        }
      }
    }

    if (name) {
      name = name
        .replace(/\s+/g, ' ')
        .replace(/[\r\n\t]/g, '')
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .trim();
    }

    // ========================================================================
    // 2. 가격 추출 (강화된 버전!)
    // ========================================================================
    let price = 0;

    console.log('\n💰 가격 추출 시작...');

    // 방법 1: 특정 선택자
    const priceSelectorsSpecific = [
      '#supply_price', '#sale_price', '#sell_price',
      '.supply_price', '.sale_price', '.sell_price',
      '[name="supply_price"]', '[id*="price"]', '[class*="supply"]',
    ];

    for (const selector of priceSelectorsSpecific) {
      const priceText = $(selector).first().text().trim();
      if (priceText) {
        const cleaned = priceText.replace(/[^0-9]/g, '');
        const parsed = parseInt(cleaned);
        if (!isNaN(parsed) && parsed >= 100 && parsed < 100000000) {
          price = parsed;
          console.log(`✓ 가격 [${selector} TEXT]:`, price.toLocaleString() + '원');
          break;
        }
      }

      const priceValue = $(selector).first().attr('value') || 
                        $(selector).first().attr('data-price') ||
                        $(selector).first().attr('data-value');
      if (priceValue) {
        const cleaned = priceValue.replace(/[^0-9]/g, '');
        const parsed = parseInt(cleaned);
        if (!isNaN(parsed) && parsed >= 100 && parsed < 100000000) {
          price = parsed;
          console.log(`✓ 가격 [${selector} VALUE]:`, price.toLocaleString() + '원');
          break;
        }
      }
    }

    // 방법 2: 일반 선택자
    if (price === 0) {
      const priceSelectorsGeneral = [
        '.price', '.product-price', '.price_num', '.goods_price',
        '.prod_price', '.item_price', '.price-value', '[itemprop="price"]',
        '[class*="price"]', 'strong.price', 'span.price', 'em.price',
      ];

      for (const selector of priceSelectorsGeneral) {
        const priceText = $(selector).first().text().trim();
        if (priceText) {
          const cleaned = priceText.replace(/[^0-9]/g, '');
          const parsed = parseInt(cleaned);
          if (!isNaN(parsed) && parsed >= 100 && parsed < 100000000) {
            price = parsed;
            console.log(`✓ 가격 [${selector}]:`, price.toLocaleString() + '원');
            break;
          }
        }
      }
    }

    // 방법 3: HTML 패턴 매칭
    if (price === 0) {
      console.log('⚠️  일반 선택자로 가격 못 찾음, HTML 패턴 검색 시도...');

      const bodyText = $('body').text();
      const pricePatterns = [
        /공급가[:\s]*([0-9,]+)원/,
        /판매가[:\s]*([0-9,]+)원/,
        /도매가[:\s]*([0-9,]+)원/,
        /가격[:\s]*([0-9,]+)원/,
        /([0-9]{1,3}(,[0-9]{3})+)원/,
      ];

      for (const pattern of pricePatterns) {
        const match = bodyText.match(pattern);
        if (match && match[1]) {
          const cleaned = match[1].replace(/[^0-9]/g, '');
          const parsed = parseInt(cleaned);
          if (!isNaN(parsed) && parsed >= 100 && parsed < 100000000) {
            price = parsed;
            console.log('✓ 가격 [패턴 매칭]:', price.toLocaleString() + '원');
            break;
          }
        }
      }
    }

    if (price === 0) {
      console.log('⚠️  가격을 찾지 못했습니다 (0원으로 설정됨)');
      console.log('💡 수동으로 입력해주세요!');
    }

    // ========================================================================
    // 3. 이미지 추출
    // ========================================================================
    const images: string[] = [];

    function isValidProductImage(src: string): boolean {
      const srcLower = src.toLowerCase();

      const excludePatterns = [
        'ico_', 'icon_', 'icon-',
        'btn_', 'button_', 'btn-',
        'img_lens', 'img_ranking',
        'img_banner', 'img_logo',
        'logo', 'banner', 'ad_',
        'blank', 'spacer', 'pixel',
        'arrow', 'close', 'plus',
        'minus', 'check', 'star',
        'share', 'wish', 'cart',
        'question', 'info', 'help',
        'partner', 'sns_', 'social',
        '/common/', '/icon/', '/btn/',
      ];

      for (const pattern of excludePatterns) {
        if (srcLower.includes(pattern)) {
          return false;
        }
      }

      const productPathPatterns = [
        '/upload/item/',
        '/upload/product/',
        '/upload/goods/',
        '/item/',
        '/product/',
        '/goods/',
      ];

      let hasProductPath = false;
      for (const pattern of productPathPatterns) {
        if (srcLower.includes(pattern)) {
          hasProductPath = true;
          break;
        }
      }

      if (!hasProductPath) {
        return false;
      }

      if (src.length < 40) {
        return false;
      }

      const hasImageExt = /\.(jpg|jpeg|png|gif|webp)/i.test(src);
      const hasProductPathStrict = srcLower.includes('/upload/item/') || 
                                   srcLower.includes('/upload/product/') ||
                                   srcLower.includes('/upload/goods/');

      if (hasProductPathStrict) {
        return true;
      } else {
        return hasImageExt;
      }
    }

    console.log('\n🖼️  이미지 추출 시작');

    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage && ogImage.startsWith('http')) {
      if (isValidProductImage(ogImage)) {
        images.push(ogImage);
        console.log('  ✓ [og:image]:', ogImage.substring(0, 80) + '...');
      }
    }

    const imgSelectors = [
      '.product-image img',
      '.prod_img img',
      '.detail_img img',
      '.goods_img img',
      '.item_img img',
      '#product_image img',
      '#prod_image img',
      'img[src*="/upload/item/"]',
      'img[src*="/product/"]',
      'img[src*="/goods/"]',
      '[class*="product"] img',
      '[class*="goods"] img',
      '[id*="image"] img',
    ];

    let foundCount = 0;
    let filteredCount = 0;

    for (const selector of imgSelectors) {
      if (images.length >= 10) break;

      $(selector).each((i, elem) => {
        if (images.length >= 10) return;

        let src = $(elem).attr('src') || 
                 $(elem).attr('data-src') || 
                 $(elem).attr('data-original') ||
                 $(elem).attr('data-lazy');

        if (!src) return;

        if (src.startsWith('//')) {
          src = 'https:' + src;
        } else if (src.startsWith('/')) {
          const baseUrl = new URL(url);
          src = baseUrl.origin + src;
        } else if (!src.startsWith('http')) {
          return;
        }

        foundCount++;

        if (isValidProductImage(src) && !images.includes(src)) {
          images.push(src);
          console.log(`  ✓ 이미지 ${images.length}:`, src.substring(0, 80) + '...');
        } else {
          filteredCount++;
        }
      });

      if (images.length >= 5) break;
    }

    console.log(`\n✓ 총 이미지: ${images.length}개`);

    // ========================================================================
    // 4. 옵션 추출
    // ========================================================================
    const options: string[] = [];

    $('select option').each((i, elem) => {
      if (options.length >= 20) return;

      const optText = $(elem).text().trim();
      const optValue = $(elem).attr('value') || '';

      if (!optText || optText.length === 0) return;

      const isExcluded = optText === '선택' || 
                        optText === '옵션선택' || 
                        optText === '선택하세요' ||
                        optText.includes('품절') ||
                        optText.includes('sold') ||
                        optValue === '' ||
                        optValue === '0';

      if (!isExcluded && optText.length <= 100 && !options.includes(optText)) {
        options.push(optText);
      }
    });

    if (options.length > 0) {
      console.log('\n✓ 옵션:', options.length + '개');
    }

    // ========================================================================
    // 5. 설명 추출
    // ========================================================================
    let description = '';

    const ogDesc = $('meta[property="og:description"]').attr('content');
    if (ogDesc && ogDesc.length > 10) {
      description = ogDesc.substring(0, 1000);
      console.log('\n✓ 설명:', description.substring(0, 50) + '...');
    }

    // ========================================================================
    // 6. 최종 결과
    // ========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 크롤링 결과 요약');
    console.log('='.repeat(80));
    console.log('✓ 상품명:', name || '찾을 수 없음');
    console.log('✓ 가격:', price > 0 ? price.toLocaleString() + '원' : '0원 (수동 입력 필요!)');
    console.log('✓ 이미지:', images.length + '개');
    console.log('✓ 옵션:', options.length + '개');
    console.log('='.repeat(80) + '\n');

    return NextResponse.json({
      success: true,
      data: {
        name: name || '상품명을 찾을 수 없습니다',
        supplierPrice: price,
        images: images.slice(0, 10),
        options: options.slice(0, 20),
        description: description || '',
        sourceUrl: url,
      },
    });

  } catch (error: any) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ 크롤링 에러');
    console.error('='.repeat(80));
    console.error(error);
    console.error('='.repeat(80) + '\n');

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '크롤링 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}
