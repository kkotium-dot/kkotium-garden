// src/lib/naver/product-builder.ts
// C-1: Transform local Product DB record → Naver Commerce API v2 product payload
// Core builder for POST /external/v2/products
// Integrates C-8 attribute completeness checker as pre-registration gate

import { calcAttributeCompleteness, type ProductAttributeData } from '../category-attributes';
import { calcUploadReadiness, type ReadinessInput } from '../upload-readiness';
import { NAVER_CATEGORIES_FULL } from './naver-categories-full';

// ─── Naver API type definitions ──────────────────────────────────────────────

export interface NaverDeliveryFee {
  deliveryFeeType: 'FREE' | 'PAID' | 'CONDITIONAL_FREE' | 'QUANTITY_BASED';
  baseFee?: number;
  freeConditionalAmount?: number;
  deliveryFeePayType?: 'PREPAID' | 'COLLECT' | 'COLLECT_OR_PREPAID';
  deliveryFeeByArea?: {
    deliveryAreaType: 'AREA_2' | 'AREA_3';
    area2extraFee?: number;
    area3extraFee?: number;
  };
}

export interface NaverClaimDeliveryInfo {
  returnDeliveryCompanyPriorityType?: 'CHARGE';
  returnDeliveryFee: number;
  exchangeDeliveryFee: number;
  shippingAddressId: number;
  returnAddressId: number;
}

export interface NaverDeliveryInfo {
  deliveryType: 'DELIVERY';
  deliveryAttributeType: 'NORMAL';
  deliveryCompany: string;
  deliveryBundleGroupUsable: boolean;
  deliveryBundleGroupId?: number | null;
  deliveryFee: NaverDeliveryFee;
  claimDeliveryInfo: NaverClaimDeliveryInfo;
  installationFee?: boolean;
}

export interface NaverSeoInfo {
  sellerTags?: Array<{ code?: number; text: string }>;
  pageTitle?: string;
  metaDescription?: string;
}

export interface NaverOptionItem {
  optionName1: string;
  optionValue1: string;
  optionName2?: string;
  optionValue2?: string;
  stockQuantity: number;
  price: number;
  sellerManagerCode?: string;
  usable?: boolean;
}

export interface NaverOptionInfo {
  optionCombinationSortType?: 'CREATE';
  optionCombinationGroupNames?: { optionGroupName1: string; optionGroupName2?: string };
  optionCombinations?: NaverOptionItem[];
  standardOptionGroups?: Array<{ groupName: string; standardOptionAttributes: Array<{ attributeId: number; attributeValueId: number; attributeValueName: string }> }>;
  useStockManagement?: boolean;
}

export interface NaverProductPayloadV2 {
  originProduct: {
    statusType: 'SALE' | 'WAIT' | 'SUSPENSION';
    saleType: 'NEW' | 'USED';
    leafCategoryId: string;
    name: string;
    detailContent: string;
    images: {
      representativeImage: { url: string };
      optionalImages?: Array<{ url: string }>;
    };
    salePrice: number;
    stockQuantity: number;
    deliveryInfo: NaverDeliveryInfo;
    detailAttribute?: {
      seoInfo?: NaverSeoInfo;
      optionInfo?: NaverOptionInfo;
      originAreaInfo?: {
        originAreaCode: string;
        content?: string;
        plural?: boolean;
        importer?: string;
      };
      afterServiceInfo?: {
        afterServiceTelephoneNumber: string;
        afterServiceGuideContent: string;
      };
      purchaseQuantityInfo?: {
        minPurchaseQuantity?: number;
        maxPurchaseQuantityPerId?: number;
      };
      taxType?: 'TAX' | 'DUTYFREE';
      sellerCodeInfo?: {
        sellerManagementCode?: string;
        sellerBarcode?: string;
      };
    };
  };
  smartstoreChannelProduct: {
    naverShoppingRegistration: boolean;
    channelProductDisplayStatusType: 'ON' | 'OFF';
  };
}

// ─── Local DB product type (matches Prisma Product model) ────────────────────

export interface LocalProduct {
  id: string;
  name: string;
  salePrice: number;
  supplierPrice: number;
  status: string;
  mainImage?: string | null;
  additionalImages?: unknown; // JSON array
  detail_image_url?: string | null;
  description?: string | null;
  hookPhrase?: string | null;
  keywords?: unknown; // JSON array
  tags?: unknown; // JSON array
  category?: string | null; // naver category code
  originCode?: string | null;
  importer_name?: string | null;
  brand?: string | null;
  sellerProductCode?: string | null;
  barcode?: string | null;
  asPhone?: string | null;
  asInfo?: string | null;
  // Naver-specific fields
  naver_material?: string | null;
  naver_color?: string | null;
  naver_size?: string | null;
  naver_care_instructions?: string | null;
  naver_brand?: string | null;
  naver_origin?: string | null;
  naver_tax_type?: string | null;
  // Shipping
  shippingFee?: number | null;
  courierCode?: string | null;
  freeShippingThreshold?: number | null;
  freeShippingMinPrice?: number | null;
  exchangeShippingFee?: number | null;
  shippingMethod?: string | null;
  // Relationships
  shipping_template_id?: string | null;
  // Options
  product_options?: {
    option_type: string;
    option_names?: unknown;
    option_rows?: unknown;
    direct_inputs?: unknown;
  } | null;
}

export interface ShippingTemplateData {
  courierCode: string;
  shippingType: number; // 0=free, 1=paid, 2=conditional
  shippingFee: number;
  freeThreshold?: number | null;
  returnFee: number;
  exchangeFee: number;
  jejuFee: number;
  islandFee: number;
}

export interface AddressIds {
  releaseAddressId: number;
  returnAddressId: number;
}

// ─── Courier code mapping (app code → Naver API code) ────────────────────────

const COURIER_MAP: Record<string, string> = {
  CJGLS: 'CJGLS',
  HANJIN: 'HANJIN',
  LOTTE: 'LOTTE',
  LOGEN: 'LOGEN',
  EPOST: 'EPOST',
  KGB: 'KGB',
  HYUNDAI: 'HYUNDAI',
  DAESIN: 'DAESIN',
  ILYANG: 'ILYANG',
  HDEXP: 'HDEXP',
  DIRECT: 'DIRECT',
};

// ─── Builder functions ──────────────────────────────────────────────────────

/** Build deliveryInfo JSON from ShippingTemplate + address IDs */
export function buildDeliveryInfo(
  template: ShippingTemplateData,
  addresses: AddressIds
): NaverDeliveryInfo {
  const feeType: NaverDeliveryFee['deliveryFeeType'] =
    template.shippingType === 0 ? 'FREE' :
    template.shippingType === 2 ? 'CONDITIONAL_FREE' : 'PAID';

  const deliveryFee: NaverDeliveryFee = {
    deliveryFeeType: feeType,
    deliveryFeePayType: 'PREPAID',
  };

  if (feeType === 'PAID' || feeType === 'CONDITIONAL_FREE') {
    deliveryFee.baseFee = template.shippingFee;
  }

  if (feeType === 'CONDITIONAL_FREE' && template.freeThreshold) {
    deliveryFee.freeConditionalAmount = template.freeThreshold;
  }

  // Jeju / island area surcharge
  if (template.jejuFee > 0 || template.islandFee > 0) {
    deliveryFee.deliveryFeeByArea = {
      deliveryAreaType: 'AREA_3',
      area2extraFee: template.jejuFee,
      area3extraFee: template.islandFee,
    };
  }

  return {
    deliveryType: 'DELIVERY',
    deliveryAttributeType: 'NORMAL',
    deliveryCompany: COURIER_MAP[template.courierCode] ?? 'CJGLS',
    deliveryBundleGroupUsable: true,
    deliveryBundleGroupId: null,
    deliveryFee,
    claimDeliveryInfo: {
      returnDeliveryCompanyPriorityType: 'CHARGE',
      returnDeliveryFee: template.returnFee,
      exchangeDeliveryFee: template.exchangeFee,
      shippingAddressId: addresses.releaseAddressId,
      returnAddressId: addresses.returnAddressId,
    },
  };
}

/** Build deliveryInfo from Product fields (when no shipping template) */
export function buildDeliveryInfoFromProduct(
  product: LocalProduct,
  addresses: AddressIds
): NaverDeliveryInfo {
  const fee = product.shippingFee ?? 3000;
  const threshold = product.freeShippingThreshold ?? product.freeShippingMinPrice ?? 30000;
  const isFree = fee === 0;
  const isConditional = !isFree && threshold > 0;

  return buildDeliveryInfo({
    courierCode: product.courierCode ?? 'CJGLS',
    shippingType: isFree ? 0 : isConditional ? 2 : 1,
    shippingFee: fee,
    freeThreshold: isConditional ? threshold : null,
    returnFee: product.exchangeShippingFee ?? 6000,
    exchangeFee: product.exchangeShippingFee ?? 6000,
    jejuFee: 5000,
    islandFee: 5000,
  }, addresses);
}

/** Build SEO info from product tags/keywords */
export function buildSeoInfo(product: LocalProduct): NaverSeoInfo | undefined {
  const tags: string[] = Array.isArray(product.tags) ? product.tags as string[] : [];
  const keywords: string[] = Array.isArray(product.keywords) ? product.keywords as string[] : [];

  // Naver sellerTags: max 10 tags, each max 20 chars
  const allTags = [...new Set([...tags, ...keywords])].slice(0, 10);
  if (allTags.length === 0) return undefined;

  return {
    sellerTags: allTags.map(t => ({ text: String(t).slice(0, 20) })),
    pageTitle: product.name.slice(0, 60),
    metaDescription: (product.hookPhrase || product.description || '').slice(0, 160),
  };
}

/** Build option info from product_options */
export function buildOptionInfo(
  options: LocalProduct['product_options']
): NaverOptionInfo | undefined {
  if (!options) return undefined;

  const rows = Array.isArray(options.option_rows) ? options.option_rows as any[] : [];
  if (rows.length === 0) return undefined;

  const names = Array.isArray(options.option_names) ? options.option_names as string[] : [];

  if (options.option_type === 'COMBINATION' && names.length >= 1) {
    const combinations: NaverOptionItem[] = rows.map((row: any) => {
      const item: NaverOptionItem = {
        optionName1: names[0] ?? '',
        optionValue1: row.values?.[0] ?? row.value1 ?? '',
        stockQuantity: Number(row.stock ?? row.stockQuantity ?? 999),
        price: Number(row.price ?? row.optionPrice ?? 0),
        usable: row.status !== 'SOLD_OUT',
      };
      if (names[1] && (row.values?.[1] || row.value2)) {
        item.optionName2 = names[1];
        item.optionValue2 = row.values?.[1] ?? row.value2 ?? '';
      }
      if (row.managementCode || row.sellerManagerCode) {
        item.sellerManagerCode = row.managementCode ?? row.sellerManagerCode;
      }
      return item;
    });

    return {
      optionCombinationSortType: 'CREATE',
      optionCombinationGroupNames: {
        optionGroupName1: names[0],
        ...(names[1] ? { optionGroupName2: names[1] } : {}),
      },
      optionCombinations: combinations,
      useStockManagement: true,
    };
  }

  return undefined;
}

/** Build detail content HTML from product description + hook phrase */
export function buildDetailContent(product: LocalProduct): string {
  const parts: string[] = [];

  if (product.hookPhrase) {
    parts.push(`<div style="text-align:center;padding:20px 0;font-size:16px;color:#333;">${escapeHtml(product.hookPhrase)}</div>`);
  }

  if (product.detail_image_url) {
    parts.push(`<div style="text-align:center;"><img src="${escapeHtml(product.detail_image_url)}" style="max-width:860px;width:100%;" alt="${escapeHtml(product.name)}" /></div>`);
  }

  if (product.description) {
    parts.push(`<div style="padding:20px;font-size:14px;line-height:1.8;color:#555;">${escapeHtml(product.description).replace(/\n/g, '<br/>')}</div>`);
  }

  if (parts.length === 0) {
    // Minimum required detail content
    parts.push(`<div style="text-align:center;padding:40px;font-size:14px;color:#888;">${escapeHtml(product.name)}</div>`);
  }

  return parts.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ─── D1 category name resolver ──────────────────────────────────────────────

function getD1CategoryName(categoryCode: string): string {
  const cat = NAVER_CATEGORIES_FULL.find(c => c.code === categoryCode);
  if (!cat) return '';
  return cat.d1 ?? '';
}

// ─── Pre-registration validation (C-8 + readiness integrated) ────────────────

export interface ValidationResult {
  canRegister: boolean;
  attributeGrade: string;
  attributeScore: number;
  readinessGrade: string;
  readinessScore: number;
  errors: string[];
  warnings: string[];
  missingRequired: string[];
}

export function validateForRegistration(
  product: LocalProduct,
  hasShippingTemplate: boolean,
  hasAddresses: boolean,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Hard requirements
  if (!product.name || product.name.trim().length < 5) {
    errors.push('Product name is required (min 5 chars)');
  }
  if (!product.category || product.category === '50003307') {
    errors.push('Valid Naver category must be selected');
  }
  if (!product.mainImage) {
    errors.push('Representative image is required');
  }
  if (product.salePrice <= 0) {
    errors.push('Sale price must be greater than 0');
  }
  if (!hasAddresses) {
    errors.push('Naver address IDs not synced (run addressbook sync first)');
  }

  // C-8 attribute completeness check
  const d1Name = product.category ? getD1CategoryName(product.category) : '';
  const attrData: ProductAttributeData = {
    brand: product.brand || product.naver_brand,
    originCode: product.originCode,
    material: product.naver_material,
    color: product.naver_color,
    size: product.naver_size,
    careInstructions: product.naver_care_instructions,
  };
  const attrResult = calcAttributeCompleteness(d1Name, attrData);
  if (attrResult.missingRequired.length > 0) {
    warnings.push(`Missing required attributes: ${attrResult.missingRequired.join(', ')}`);
  }

  // Upload readiness check
  const readinessInput: ReadinessInput = {
    naverCategoryCode: product.category,
    keywords: Array.isArray(product.keywords) ? product.keywords as string[] : [],
    tags: Array.isArray(product.tags) ? product.tags as string[] : [],
    name: product.name,
    mainImage: product.mainImage,
    images: Array.isArray(product.additionalImages) ? product.additionalImages as string[] : [],
    shippingTemplateId: hasShippingTemplate ? 'yes' : undefined,
    salePrice: product.salePrice,
    supplierPrice: product.supplierPrice,
    shippingFee: product.shippingFee ?? 3000,
  };
  const readiness = calcUploadReadiness(readinessInput);

  // Gate: readiness D grade = block, C grade = warn
  if (readiness.grade === 'D') {
    errors.push(`Upload readiness too low: ${readiness.score}% (${readiness.grade}) — ${readiness.failed.map(f => f.label).join(', ')}`);
  } else if (readiness.grade === 'C') {
    warnings.push(`Upload readiness is C grade (${readiness.score}%) — consider improving: ${readiness.failed.slice(0, 3).map(f => f.label).join(', ')}`);
  }

  return {
    canRegister: errors.length === 0,
    attributeGrade: attrResult.grade,
    attributeScore: attrResult.score,
    readinessGrade: readiness.grade,
    readinessScore: readiness.score,
    errors,
    warnings,
    missingRequired: attrResult.missingRequired,
  };
}

// ─── Main builder function ──────────────────────────────────────────────────

export function buildNaverProductPayload(
  product: LocalProduct,
  deliveryInfo: NaverDeliveryInfo,
  imageUrls?: { representative: string; optional?: string[] },
): NaverProductPayloadV2 {
  // Use naver CDN URLs if available, fallback to Supabase URLs
  const representativeUrl = imageUrls?.representative ?? product.mainImage ?? '';
  const additionalImgs: string[] = imageUrls?.optional
    ?? (Array.isArray(product.additionalImages) ? product.additionalImages as string[] : []);
  const optionalImages = additionalImgs
    .filter(Boolean)
    .map(url => ({ url }));

  const seoInfo = buildSeoInfo(product);
  const optionInfo = buildOptionInfo(product.product_options);

  // Origin area info
  const originCode = product.originCode ?? '0200037'; // default: China
  const isImport = Number(originCode) >= 200000;

  const payload: NaverProductPayloadV2 = {
    originProduct: {
      statusType: 'SALE',
      saleType: 'NEW',
      leafCategoryId: product.category ?? '50003307',
      name: product.name.slice(0, 100), // Naver max 100 chars
      detailContent: buildDetailContent(product),
      images: {
        representativeImage: { url: representativeUrl },
        ...(optionalImages.length > 0 ? { optionalImages } : {}),
      },
      salePrice: product.salePrice,
      stockQuantity: 999, // default for drop-shipping
      deliveryInfo,
      detailAttribute: {
        ...(seoInfo ? { seoInfo } : {}),
        ...(optionInfo ? { optionInfo } : {}),
        originAreaInfo: {
          originAreaCode: originCode,
          ...(isImport && product.importer_name ? { importer: product.importer_name } : {}),
          ...(product.naver_origin ? { content: product.naver_origin } : {}),
        },
        afterServiceInfo: {
          afterServiceTelephoneNumber: product.asPhone ?? '010-0000-0000',
          afterServiceGuideContent: product.asInfo ?? '10:00~18:00',
        },
        taxType: (product.naver_tax_type === 'DUTYFREE' ? 'DUTYFREE' : 'TAX') as 'TAX' | 'DUTYFREE',
        ...(product.sellerProductCode ? {
          sellerCodeInfo: {
            sellerManagementCode: product.sellerProductCode,
            ...(product.barcode ? { sellerBarcode: product.barcode } : {}),
          },
        } : {}),
      },
    },
    smartstoreChannelProduct: {
      naverShoppingRegistration: true,
      channelProductDisplayStatusType: 'ON',
    },
  };

  return payload;
}
