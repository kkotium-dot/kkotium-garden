// src/types/product.ts
// 상품 타입 정의 (Prisma 스키마 기반)

export interface Product {
  id: string;

  // 기본 정보
  name: string;
  sku?: string;
  category?: string;
  status?: string;
  description?: string;

  // 가격 정보
  salePrice: number;
  supplierPrice?: number;
  shippingFee: number;
  margin: number;

  // 이미지 정보
  mainImage?: string;
  images: string[];
  imageAltTexts: string[];
  imageCount: number;

  // 네이버 SEO 필드 (27개)
  naver_title?: string;
  naver_keywords?: string;
  naver_description?: string;
  naver_brand?: string;
  naver_manufacturer?: string;
  naver_origin?: string;
  naver_material?: string;
  naver_color?: string;
  naver_size?: string;
  naver_weight?: string;
  naver_care_instructions?: string;
  naver_warranty?: string;
  naver_certification?: string;
  naver_tax_type?: string;
  naver_gift_wrapping: boolean;
  naver_as_info?: string;
  naver_delivery_info?: string;
  naver_exchange_info?: string;
  naver_refund_info?: string;
  naver_min_order?: string;
  naver_max_order?: string;
  naver_adult_only: boolean;
  naver_parallel_import: boolean;
  naver_custom_option_1?: string;
  naver_custom_option_2?: string;
  naver_custom_option_3?: string;
  naver_meta_tags?: string;

  // 타임스탬프
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductFormData {
  // 기본 정보
  name: string;
  category?: string;
  supplierId?: string;
  supplierPrice: string;
  salePrice: string;
  shippingCost: string;
  description?: string;
  keywords: string[];

  // 이미지
  mainImage: string;
  images: string[];
  imageAltTexts: string[];
  imageCount: number;

  // 네이버 SEO 필드
  naver_title: string;
  naver_keywords: string;
  naver_description: string;
  naver_brand: string;
  naver_manufacturer?: string;
  naver_origin: string;
  naver_material: string;
  naver_color?: string;
  naver_size?: string;
  naver_weight?: string;
  naver_care_instructions: string;
  naver_warranty?: string;
  naver_certification?: string;
  naver_tax_type: string;
  naver_gift_wrapping: boolean;
  naver_as_info?: string;
  naver_delivery_info?: string;
  naver_exchange_info?: string;
  naver_refund_info?: string;
  naver_min_order: string;
  naver_max_order: string;
  naver_adult_only: boolean;
  naver_parallel_import: boolean;
  naver_custom_option_1?: string;
  naver_custom_option_2?: string;
  naver_custom_option_3?: string;
  naver_meta_tags?: string;
}
