// src/lib/helpers/product-loader.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 편집 페이지 오류 해결 - 안전한 상품 데이터 로더
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 안전한 배열 변환
 */
function ensureArray(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return value.split(',').map(v => v.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * 안전한 문자열 변환
 */
function ensureString(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

/**
 * 편집 페이지용 상품 데이터 로드 (타입 안전)
 */
export async function loadProductForEdit(productId: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        supplier: true,
      },
    });

    if (!product) {
      throw new Error('상품을 찾을 수 없습니다.');
    }

    // DB 스키마 기준 안전 변환
    // naver_keywords: String
    // additionalImages: Json
    // aiGeneratedTags: Json

    const keywords = product.naver_keywords 
      ? product.naver_keywords.split(',').map(k => k.trim()).filter(Boolean)
      : [];

    const additionalImages = ensureArray(product.additionalImages);
    const allImages = product.mainImage 
      ? [product.mainImage, ...additionalImages]
      : additionalImages;

    const tags = ensureArray(product.aiGeneratedTags);

    // SEO 데이터 안전 변환
    const seoData = {
      title: product.naver_title || product.name || '',
      keywords: keywords, // 이미 배열로 변환됨
      description: product.naver_description || product.description || '',
      brand: product.naver_brand || product.brand || '',
      manufacturer: product.naver_manufacturer || product.manufacturer || '',
      origin: product.naver_origin || '',
    };

    return {
      success: true,
      data: {
        ...product,
        // 안전한 배열/문자열 보장
        keywords: keywords,
        images: allImages,
        additionalImages: additionalImages,
        tags: tags,
        seoData: seoData,
      },
    };
  } catch (error) {
    console.error('❌ 상품 로드 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}

/**
 * 편집 데이터 저장 전 변환
 */
export function prepareProductForSave(formData: any) {
  return {
    ...formData,
    // 배열을 DB 타입에 맞게 변환
    naver_keywords: Array.isArray(formData.keywords) 
      ? formData.keywords.join(', ')
      : ensureString(formData.keywords),
    additionalImages: Array.isArray(formData.additionalImages)
      ? formData.additionalImages
      : ensureArray(formData.additionalImages),
    aiGeneratedTags: Array.isArray(formData.tags)
      ? formData.tags
      : ensureArray(formData.tags),
  };
}
