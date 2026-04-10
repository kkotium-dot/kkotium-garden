// Type definitions for Naver Smart Store ExcelJS operations
// Based on ExcelSaveTemplate_250311.xlsx — 88 columns

export interface NaverProductData {
  sellerProductCode: string;
  categoryId: string;
  productName: string;
  productStatus?: string;
  price: number;
  // New fields in 2026-03-19 template
  unitPriceUse?: string;    // col 6: 단위가격 사용여부 (Y/N)
  displayVolume?: string;   // col 7: 표시용량
  displayUnit?: string;     // col 8: 표시단위
  totalVolume?: string;     // col 9: 총용량
  importTax?: string;       // col 11: 관부가세
  taxType?: string;
  stock: number;
  optionType?: string;
  optionNames?: string;
  optionValues?: string;
  optionPrices?: string;
  optionStocks?: string;
  directInputOption?: string;
  additionalProductName?: string;
  additionalProductValue?: string;
  additionalProductPrice?: string;
  additionalProductStock?: string;
  mainImage: string;
  additionalImages?: string;
  description: string;
  brand?: string;
  manufacturer?: string;
  manufactureDate?: string;
  expiryDate?: string;
  originCode?: string;
  importer?: string;
  multipleOrigin?: string;
  originDirect?: string;
  minorPurchase?: string;
  deliveryTemplateCode?: string;
  deliveryMethod?: string;
  courierCode?: string;
  deliveryFeeType?: string;
  basicDeliveryFee?: number;
  deliveryPayType?: string;
  conditionalFreeAmount?: number;
  quantityBasedQty?: string;
  intervalBased2Qty?: string;
  intervalBased3Qty?: string;
  intervalBased3Fee?: string;
  intervalBasedAddFee?: string;
  returnFee?: number;
  exchangeFee?: number;
  regionalDeliveryFee?: string;
  installationFee?: string;
  noticeTemplateCode?: string;
  noticeBrandName?: string;
  noticeModelName?: string;
  noticeCertification?: string;
  noticeManufacturer?: string;
  asTemplateCode?: string;
  asPhone?: string;
  asGuide?: string;
  sellerRemark?: string;
  discountValue?: number;
  discountUnit?: string;
  mobileDiscountValue?: string;
  mobileDiscountUnit?: string;
  multipleDiscountCondition?: string;
  multipleDiscountConditionUnit?: string;
  multipleDiscountValue?: string;
  multipleDiscountUnit?: string;
  pointValue?: string;
  pointUnit?: string;
  textReviewPoint?: number;
  photoReviewPoint?: number;
  monthTextReviewPoint?: number;
  monthPhotoReviewPoint?: number;
  alarmReviewPoint?: number;
  installmentMonths?: number;
  gift?: string;
  sellerBarcode?: string;
  reviewVisible?: string;
  reviewHiddenReason?: string;
  alarmOnlyCustomer?: string;
  // Book-specific (col 76~84) — empty for non-book categories
  isbn?: string;
  issn?: string;
  independentPublish?: string;
  publishDate?: string;
  publisher?: string;
  authorText?: string;
  authorIllust?: string;
  authorTranslator?: string;
  culturalExpense?: string;
  // Size info (col 85~88)
  sizeProductGroup?: string;
  sizeName?: string;
  sizeDetail?: string;
  sizeModelName?: string;
}

export interface SupplierDefaults {
  brand: string;
  manufacturer: string;
  originCode: string;
  importer: string;
  multipleOrigin: string;
  minorPurchase: string;
  deliveryMethod: string;
  courierCode: string;
  deliveryFeeType: string;
  basicDeliveryFee: number;
  deliveryPayType: string;
  returnFee: number;
  exchangeFee: number;
  noticeTemplateCode: string;
  asPhone: string;
  asGuide: string;
  discountValue: number;
  discountUnit: string;
  textReviewPoint: number;
  photoReviewPoint: number;
  monthTextReviewPoint: number;
  monthPhotoReviewPoint: number;
  alarmReviewPoint: number;
  installmentMonths: number;
  reviewVisible: string;
  alarmOnlyCustomer: string;
}

export interface ShippingTemplate {
  templateCode: string;
  templateName?: string;
}

export interface ExcelGenerateOptions {
  products: NaverProductData[];
  shippingTemplate?: ShippingTemplate;
  supplierOverride?: Partial<SupplierDefaults>;
  colorTheme?: 'default';
  includeGuideRow?: boolean;
  filename?: string;
}

export interface SectionDef {
  label: string;
  colSpan: number;
  argb: string;
}
