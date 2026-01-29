import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const generateSeoKeywords = async (productName: string, category: string) => {
  const baseKeywords = [
    productName,
    '꽃 선물',
    '꽃배달',
    '당일배송',
    '프리미엄 플라워',
    category
  ];

  return baseKeywords.join(',');
};

export const saveProductSeo = async (productId: string, seoData: any) => {
  return await prisma.product.update({
    where: { id: productId },
    data: {
      naver_title: seoData.naver_title,
      naver_keywords: seoData.naver_keywords,
      naver_description: seoData.naver_description,
      naver_category: seoData.naver_category,
      naver_shipping_fee: seoData.naver_shipping_fee,
      naver_seller_id: seoData.naver_seller_id,
      naver_brand: seoData.naver_brand
    }
  });
};

export const getSeoPreview = (seoData: any) => {
  return {
    title: seoData.naver_title || '상품명',
    keywords: seoData.naver_keywords || '꽃,선물,배달',
    description: seoData.naver_description || '상품 설명'
  };
};
