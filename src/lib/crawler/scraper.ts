// src/lib/crawler/scraper.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 도매 사이트 크롤러 (도매매, 사방넷 등)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import * as cheerio from 'cheerio';
import type { CrawledData } from '@/types/crawler';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메인 크롤러 함수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function scrapeProduct(url: string): Promise<CrawledData> {
  try {
    // URL에서 사이트 타입 감지
    const source = detectSource(url);

    // HTML 가져오기
    const html = await fetchHTML(url);

    // 사이트별 파싱
    let result: CrawledData;

    switch (source) {
      case 'domeme':
        result = parseDomeme(html, url);
        break;
      case 'sabangnet':
        result = parseSabangnet(html, url);
        break;
      default:
        result = parseGeneric(html, url);
    }

    return {
      ...result,
      meta: {
        crawledAt: new Date().toISOString(),
        source,
        success: true,
      },
    };
  } catch (error) {
    console.error('❌ 크롤링 오류:', error);
    throw new Error(`크롤링 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 사이트 감지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectSource(url: string): 'domeme' | 'sabangnet' | 'other' {
  if (url.includes('domeme.co.kr') || url.includes('도매매')) {
    return 'domeme';
  }
  if (url.includes('sabangnet.co.kr') || url.includes('사방넷')) {
    return 'sabangnet';
  }
  return 'other';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HTML 가져오기
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchHTML(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.text();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 도매매 파싱
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function parseDomeme(html: string, url: string): Omit<CrawledData, 'meta'> {
  const $ = cheerio.load(html);

  // 상품명
  const title = $('.product-title, .prod_name, h1.title').first().text().trim() || 
                $('meta[property="og:title"]').attr('content') || 
                '상품명 없음';

  // 가격
  const priceText = $('.price, .prod_price, .sale_price').first().text().trim();
  const price = extractPrice(priceText);

  // 원가
  const originalPriceText = $('.original_price, .market_price').first().text().trim();
  const originalPrice = originalPriceText ? extractPrice(originalPriceText) : undefined;

  // 설명
  const description = $('.product-description, .prod_desc, .detail_content').text().trim() ||
                     $('.prod_info_text').text().trim() ||
                     $('meta[property="og:description"]').attr('content') ||
                     '';

  // 이미지
  const images: string[] = [];
  $('.product-image img, .prod_img img, .detail_img img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && !src.includes('placeholder')) {
      images.push(src.startsWith('http') ? src : `https:${src}`);
    }
  });

  // 브랜드
  const brand = $('.brand, .maker, .manufacturer').first().text().trim() || undefined;

  // 스펙
  const specs: Record<string, string> = {};
  $('.spec-table tr, .prod_spec_table tr').each((_, row) => {
    const key = $(row).find('th, .spec_name').text().trim();
    const value = $(row).find('td, .spec_value').text().trim();
    if (key && value) {
      specs[key] = value;
    }
  });

  return {
    url,
    title,
    price,
    originalPrice,
    description: cleanDescription(description),
    images: [...new Set(images)],
    brand,
    specs: Object.keys(specs).length > 0 ? specs : undefined,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 사방넷 파싱
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function parseSabangnet(html: string, url: string): Omit<CrawledData, 'meta'> {
  const $ = cheerio.load(html);

  const title = $('.item_detail_tit, .goods_name').first().text().trim() ||
                $('meta[property="og:title"]').attr('content') ||
                '상품명 없음';

  const priceText = $('.item_price, .price_value').first().text().trim();
  const price = extractPrice(priceText);

  const description = $('.item_detail_cont, .goods_desc').text().trim() ||
                     $('meta[property="og:description"]').attr('content') ||
                     '';

  const images: string[] = [];
  $('.item_img img, .goods_img img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && !src.includes('placeholder')) {
      images.push(src.startsWith('http') ? src : `https://www.sabangnet.co.kr${src}`);
    }
  });

  const brand = $('.brand_name, .maker').first().text().trim() || undefined;

  return {
    url,
    title,
    price,
    description: cleanDescription(description),
    images: [...new Set(images)],
    brand,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 일반 사이트 파싱 (OpenGraph 메타태그 활용)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function parseGeneric(html: string, url: string): Omit<CrawledData, 'meta'> {
  const $ = cheerio.load(html);

  const title = $('meta[property="og:title"]').attr('content') ||
                $('h1').first().text().trim() ||
                $('title').text().trim() ||
                '상품명 없음';

  const priceText = $('[class*="price"], [class*="Price"]').first().text().trim();
  const price = extractPrice(priceText) || 0;

  const description = $('meta[property="og:description"]').attr('content') ||
                     $('meta[name="description"]').attr('content') ||
                     '';

  const ogImage = $('meta[property="og:image"]').attr('content');
  const images: string[] = ogImage ? [ogImage] : [];

  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src && !src.includes('logo') && !src.includes('icon')) {
      images.push(src.startsWith('http') ? src : `${new URL(url).origin}${src}`);
    }
  });

  return {
    url,
    title,
    price,
    description: cleanDescription(description),
    images: [...new Set(images)].slice(0, 10),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 유틸리티 함수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractPrice(text: string): number {
  const numbers = text.replace(/[^0-9]/g, '');
  return numbers ? parseInt(numbers, 10) : 0;
}

function cleanDescription(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')              // HTML 태그 제거
    .replace(/\s+/g, ' ')                // 연속 공백 제거
    .replace(/\n+/g, '\n')              // 연속 개행 제거
    .trim()
    .substring(0, 2000);                  // 최대 2000자
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 이미지 다운로드 (선택사항)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function downloadImages(urls: string[]): Promise<string[]> {
  // 실제로는 S3, Cloudinary 등에 업로드
  // 여기서는 URL을 그대로 반환 (추후 구현)
  return urls.slice(0, 5); // 최대 5장
}
