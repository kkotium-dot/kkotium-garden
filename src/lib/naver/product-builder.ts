// src/lib/naver/product-builder.ts
// C-1: Transform local Product DB record → Naver Commerce API v2 product payload
// Core builder for POST /external/v2/products
// Integrates C-8 attribute completeness checker as pre-registration gate

import { calcAttributeCompleteness, type ProductAttributeData } from '../category-attributes';
import { calcUploadReadiness, type ReadinessInput } from '../upload-readiness';
import { NAVER_CATEGORIES_FULL } from './naver-categories-full';
import { NAVER_ORIGIN_CODES } from './naver-origin-codes';

// ─── Origin area code guard (2026-06-05) ─────────────────────────────────────
// Naver register rejects any originAreaCode not present in the official table
// with 400 "원산지 상세코드 항목이 유효하지 않습니다". The official codes carry a
// meaningful leading zero (00 국산 / 0001 강원도 / 0200037 중국). A prior dataset
// regen stripped those zeros (number-cast), polluting product.originCode and
// blocking every overseas-sourced publish. dryRun could not catch it because it
// never POSTs to Naver (DEBT-13 false-green). This guard validates against the
// authoritative table at build time — so BOTH dryRun and real register fail
// loudly on a bad code — and restores a stripped leading zero when possible.
const OFFICIAL_ORIGIN_CODES: ReadonlySet<string> = new Set(
  NAVER_ORIGIN_CODES.map((o) => o.code),
);

export function resolveOriginAreaCode(raw: string | null | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) {
    throw new Error(
      'originAreaCode 가 비어 있습니다 — 원산지 코드를 지정한 뒤 발행하세요 (원산지코드.xls 518건 기준).',
    );
  }
  if (OFFICIAL_ORIGIN_CODES.has(v)) return v;
  // Attempt to restore a stripped leading zero (e.g. 200037 -> 0200037,
  // 1 -> 0001, 0 -> 00). Only accept a candidate that exists in the table.
  for (const cand of [`0${v}`, v.padStart(7, '0'), v.padStart(4, '0'), v.padStart(2, '0')]) {
    if (OFFICIAL_ORIGIN_CODES.has(cand)) return cand;
  }
  throw new Error(
    `originAreaCode '${v}' 가 네이버 공식 원산지 코드표(원산지코드.xls 518건)에 없습니다. ` +
      '선행 0 절삭(숫자 변환) 오염일 가능성이 높습니다 — 공식 코드(예: 중국 0200037)로 교정하세요.',
  );
}

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
  // 2026-06-02 fix — 'CHARGE'는 v2 enum 아님 (NotValidEnum 400 발생).
  // GitHub Discussion #241 코드 샘플 정합: PRIMARY (대표/1순위) 사용.
  returnDeliveryCompanyPriorityType?: 'PRIMARY' | 'SECONDARY';
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

// Naver Commerce API v2 optionCombinations item. CRITICAL: optionName1..4 are
// the option VALUES per axis (e.g. '레몬유칼립'), NOT the axis name. The axis
// names live ONLY in optionCombinationGroupNames.optionGroupName1..4. A prior
// shape put the axis name ('향') in optionName1 for every row and the value in a
// non-existent 'optionValue1' field → Naver saw 3 identical optionName1='향' and
// rejected with 400 Duplicated "중복된 조합형 옵션이 있습니다 (향)".
// Source: github.com/commerce-api-naver/commerce-api discussion #241.
export interface NaverOptionItem {
  optionName1: string;
  optionName2?: string;
  optionName3?: string;
  optionName4?: string;
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

// 2026-06-02 P0 — productInfoProvidedNotice (상품정보제공고시)
// RESEARCH §1/§2: ETC 유형 8필드 + customerServicePhoneNumber 권장.
// 자식 객체명은 productInfoProvidedNoticeType과 정확히 일치 필수
// (type=ETC → 자식 etc만 / type=WEAR → 자식 wear만).
export interface NaverProductInfoEtc {
  returnCostReason: string;
  noRefundReason: string;
  qualityAssuranceStandard: string;
  compensationProcedure: string;
  troubleShootingContents: string;
  itemName: string;
  modelName: string;
  manufacturer: string;
  afterServiceDirector?: string;
  customerServicePhoneNumber?: string;
}

export interface NaverProductInfoProvidedNotice {
  productInfoProvidedNoticeType: 'ETC' | 'WEAR' | 'SHOES' | 'FURNITURE' | string;
  etc?: NaverProductInfoEtc;
  // 다른 유형(wear/furniture/...) 추가 시 동일 패턴으로 확장.
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
      productInfoProvidedNotice?: NaverProductInfoProvidedNotice;
      // 2026-06-02 fix — NotNull 400 (네이버 invalidInputs 단정).
      // 미성년자 구매 가능 여부. 성인용품 외 전 상품 기본 true.
      minorPurchasable?: boolean;
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

// 2026-06-02 — common notice slots (store-wide top/bottom image + text)
// injected into detailContent. Sourced from StoreSettings; nullable.
export interface NoticeAssets {
  topImageUrl?: string | null;
  topText?: string | null;
  bottomImageUrl?: string | null;
  bottomText?: string | null;
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
  aeo_content?: any; // JSONB: { qna: [{q,a}], faq: [{q,a}] }
  keywords?: unknown; // JSON array
  tags?: unknown; // JSON array
  category?: string | null; // legacy free-text label (often "uncategorized") — DO NOT send to Naver
  naverCategoryCode?: string | null; // canonical Naver leaf category (8-digit numeric) — SoT for leafCategoryId
  // 2026-06-02 P0 — SEO-first product name: naver_title > seoTitle > name
  naver_title?: string | null;
  seoTitle?: string | null;
  // 2026-06-02 — productInfoProvidedNotice candidates (ETC fallback to placeholders)
  naver_manufacturer?: string | null;
  productInfoName?: string | null;
  productInfoManufacturer?: string | null;
  productInfoModel?: string | null;
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
  // 2026-06-07 — Household-chemical-product safety-confirmation declaration
  // number (HB...) SoT. A mandatory 정보고시 display item for safety-target
  // household chemical products such as car air fresheners (omitting it is the
  // likely SUSPENSION cause). The operator sets this (per-scent numbers may share
  // one string); the ETC notice builder surfaces it only when present (no regression).
  naver_certification?: string | null;
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

// 2026-06-02 — 공급사별 합배송 속성. buildDeliveryInfo가 이 값으로 분기:
//   bundleCapable=true + naverBundleGroupId → deliveryBundleGroupId 전송 +
//     deliveryFeeByArea 제거 (네이버 양립불가 — RESEARCH §1).
//   bundleCapable=false → deliveryFeeByArea 전송 + deliveryBundleGroupId 제거.
export interface SupplierBundleInfo {
  bundleCapable: boolean;
  naverBundleGroupId?: string | null;
  jejuExtraFee?: number | null;
  islandExtraFee?: number | null;
}

// ─── 2026-06-02 P0 — phone normalizer + productInfoProvidedNotice ETC builder ─

/**
 * Naver Commerce v2 requires phone numbers in dashed numeric form
 * (e.g. "010-3227-4805", "02-1234-5678", "1588-1234"). When the source
 * field carries a free-text placeholder ("고객센터 문의" etc.), fall back to
 * the registered representative phone — the same number used on the
 * RELEASE/REFUND addressbook entries.
 */
const NAVER_FALLBACK_PHONE = '010-3227-4805';
const PHONE_PATTERN = /^\d{2,4}-\d{3,4}-\d{4}$/;

export function normalizeNaverPhone(raw: string | null | undefined): string {
  if (!raw) return NAVER_FALLBACK_PHONE;
  const trimmed = String(raw).trim();
  if (PHONE_PATTERN.test(trimmed)) return trimmed;
  // Also accept space-or-no-separator forms by reducing to digits and re-formatting
  // common Korean shapes (10/11-digit mobile, 9/10-digit landline).
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('010')) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10 && digits.startsWith('02')) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 8 && /^(1577|1588|1600|1644|1666|1670|1688)/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return NAVER_FALLBACK_PHONE;
}

/**
 * Build productInfoProvidedNotice (상품정보제공고시) for ETC category.
 * RESEARCH §1·§2: 자식 객체명은 productInfoProvidedNoticeType과 정확 일치 필수.
 * 위탁배송 표준문구 "상품상세참조" 허용. 단 itemName/modelName/manufacturer/
 * customerServicePhoneNumber는 실제값 권장.
 */
const PRODUCT_INFO_STANDARD_REFERENCE = '상품상세참조';

// 2026-06-07 — Household-chemical-product safety-confirmation number display.
// The ETC notice has no dedicated field, so the regulatory statement is appended
// to qualityAssuranceStandard (품질보증기준); switching to the dedicated household-
// chemical notice type is a separate task. Applied only when a value is present
// → zero regression for ordinary products. Returns null when no number is set.
// The literal below is Naver-payload DATA (same inline-string pattern as
// PRODUCT_INFO_STANDARD_REFERENCE / DEFAULT_STORE_NAME above).
const SAFETY_DECLARATION_PREFIX = '안전기준 적합확인 신고번호';

export function formatSafetyDeclaration(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim();
  if (!v) return null;
  // Already prefixed by the operator → pass through; else add the standard label.
  if (v.includes(SAFETY_DECLARATION_PREFIX)) return v;
  return `${SAFETY_DECLARATION_PREFIX} ${v}`;
}

// 2026-06-02 — 스토어명 정정. '꽃틔움 가든' = 앱 이름(내부용), '꽃틔움' =
// 스토어명(고객/네이버 노출용). 고객 노출 fallback은 반드시 스토어명 사용.
// SoT = store_settings.store_name (register route가 storeName 인자로 주입).
// DB 값 없을 때만 이 코드 기본값.
const DEFAULT_STORE_NAME = '꽃틔움';

export function buildProductInfoProvidedNoticeEtc(
  product: LocalProduct,
  storeName: string = DEFAULT_STORE_NAME,
): NaverProductInfoProvidedNotice {
  const store = (storeName || '').trim() || DEFAULT_STORE_NAME;
  // SoT 우선순위: productInfo* (대표 명시 입력) > naver_title/manufacturer > name > placeholder
  const fallbackName = product.productInfoName
    ?? product.naver_title
    ?? product.name
    ?? PRODUCT_INFO_STANDARD_REFERENCE;
  const fallbackModel = product.productInfoModel
    ?? product.naver_title
    ?? product.name
    ?? PRODUCT_INFO_STANDARD_REFERENCE;
  const fallbackManufacturer = product.productInfoManufacturer
    ?? product.naver_manufacturer
    ?? store;

  // When a household-chemical safety number is present, append the regulatory
  // statement to qualityAssuranceStandard (otherwise keep the standard reference
  // text — zero regression for ordinary products).
  const safety = formatSafetyDeclaration(product.naver_certification);
  const qualityAssuranceStandard = safety
    ? `${safety} (${PRODUCT_INFO_STANDARD_REFERENCE})`
    : PRODUCT_INFO_STANDARD_REFERENCE;

  return {
    productInfoProvidedNoticeType: 'ETC',
    etc: {
      returnCostReason:          PRODUCT_INFO_STANDARD_REFERENCE,
      noRefundReason:            PRODUCT_INFO_STANDARD_REFERENCE,
      qualityAssuranceStandard,
      compensationProcedure:     PRODUCT_INFO_STANDARD_REFERENCE,
      troubleShootingContents:   PRODUCT_INFO_STANDARD_REFERENCE,
      itemName:                  String(fallbackName).slice(0, 100),
      modelName:                 String(fallbackModel).slice(0, 100),
      manufacturer:              String(fallbackManufacturer).slice(0, 100),
      customerServicePhoneNumber: normalizeNaverPhone(product.asPhone),
    },
  };
}

/** Pick the SEO-first product name: naver_title > seoTitle > name. */
export function pickProductName(product: LocalProduct): string {
  const candidates = [product.naver_title, product.seoTitle, product.name];
  const picked = candidates.find(v => typeof v === 'string' && v.trim().length > 0);
  return String(picked ?? '').slice(0, 100);
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

/**
 * Build deliveryInfo JSON from ShippingTemplate + address IDs.
 * 2026-06-02 — supplier bundle 분기 (RESEARCH §B). deliveryBundleGroupId 와
 * deliveryFeeByArea 는 네이버에서 양립 불가:
 *   bundleCapable=true + naverBundleGroupId → deliveryBundleGroupId 전송,
 *     deliveryFeeByArea 미전송 (권역비는 판매자센터 묶음그룹에 위임).
 *   그 외 → deliveryFeeByArea 전송, deliveryBundleGroupId 미전송.
 */
export function buildDeliveryInfo(
  template: ShippingTemplateData,
  addresses: AddressIds,
  bundle?: SupplierBundleInfo,
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

  // Bundle branch: a valid numeric group id makes this a bundle-capable product.
  const groupId = bundle?.bundleCapable && bundle.naverBundleGroupId
    ? Number(bundle.naverBundleGroupId)
    : NaN;
  const useBundle = Number.isFinite(groupId) && groupId > 0;

  const info: NaverDeliveryInfo = {
    deliveryType: 'DELIVERY',
    deliveryAttributeType: 'NORMAL',
    deliveryCompany: COURIER_MAP[template.courierCode] ?? 'CJGLS',
    deliveryBundleGroupUsable: useBundle,
    deliveryFee,
    claimDeliveryInfo: {
      returnDeliveryCompanyPriorityType: 'PRIMARY',
      returnDeliveryFee: template.returnFee,
      exchangeDeliveryFee: template.exchangeFee,
      shippingAddressId: addresses.releaseAddressId,
      returnAddressId: addresses.returnAddressId,
    },
  };

  if (useBundle) {
    // Bundle group carries the area surcharge — never send deliveryFeeByArea here.
    info.deliveryBundleGroupId = groupId;
  } else {
    // Non-bundle: send per-product area surcharge. Supplier override > template
    // value > legacy default. Only emit when a positive surcharge exists.
    const jeju   = bundle?.jejuExtraFee   ?? template.jejuFee;
    const island = bundle?.islandExtraFee ?? template.islandFee;
    if ((jeju ?? 0) > 0 || (island ?? 0) > 0) {
      deliveryFee.deliveryFeeByArea = {
        deliveryAreaType: 'AREA_3',
        area2extraFee: jeju ?? 0,
        area3extraFee: island ?? 0,
      };
    }
  }

  return info;
}

/** Build deliveryInfo from Product fields (when no shipping template) */
export function buildDeliveryInfoFromProduct(
  product: LocalProduct,
  addresses: AddressIds,
  bundle?: SupplierBundleInfo,
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
  }, addresses, bundle);
}

// Naver sellerTags restricted words. Naver rejects a register with 400
// Restricted.sellerTags "태그 항목에 등록불가 단어(...) 포함" when a sellerTag
// matches a blocked term (category generic names, "~용" generics, etc.). The
// FULL list is private (Naver does not publish it), so this set accumulates the
// EXACT terms surfaced by real register invalidInputs — append new ones here as
// they appear (#46: observed facts only, no speculative hardcoding). Matching is
// EXACT (trimmed equality), not substring: '디퓨저' is blocked but '차량용디퓨저'
// is allowed, so a substring filter would wrongly drop a valid tag.
// First observed 2026-06-05 (명화 차량용 방향제 register 400).
export const RESTRICTED_SELLER_TAGS: ReadonlySet<string> = new Set([
  '차량용방향제',
  '디퓨저',
  '차량방향제',
  '자동차방향제',
]);

/** Build SEO info from product tags/keywords. Restricted words are stripped from
 *  sellerTags ONLY — the same word stays allowed in name/keywords (which Naver
 *  does not restrict the same way), so those are never touched here. */
export function buildSeoInfo(product: LocalProduct): NaverSeoInfo | undefined {
  const tags: string[] = Array.isArray(product.tags) ? product.tags as string[] : [];
  const keywords: string[] = Array.isArray(product.keywords) ? product.keywords as string[] : [];

  // Naver sellerTags: max 10 tags, each max 20 chars. Drop restricted words.
  const allTags = [...new Set([...tags, ...keywords])]
    .filter(t => !RESTRICTED_SELLER_TAGS.has(String(t).trim()))
    .slice(0, 10);

  const seo: NaverSeoInfo = {
    pageTitle: product.name.slice(0, 60),
    metaDescription: (product.hookPhrase || product.description || '').slice(0, 160),
  };
  // Omit sellerTags entirely when nothing survives — an empty/invalid tag array
  // would itself trip Naver validation. seoInfo without sellerTags is valid.
  if (allTags.length > 0) {
    seo.sellerTags = allTags.map(t => ({ text: String(t).slice(0, 20) }));
  }
  return seo;
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
    const rawCombinations: NaverOptionItem[] = rows.map((row: any) => {
      // optionName1/2 carry the VALUES per axis (axis names go in
      // optionCombinationGroupNames). value1 = the value for axis 1 ('향').
      const value1 = String(row.values?.[0] ?? row.value1 ?? '').trim();
      const item: NaverOptionItem = {
        optionName1: value1,
        stockQuantity: Number(row.stock ?? row.stockQuantity ?? 999),
        price: Number(row.price ?? row.optionPrice ?? 0),
        usable: row.status !== 'SOLD_OUT',
      };
      const value2 = row.values?.[1] ?? row.value2;
      if (names[1] && value2) {
        item.optionName2 = String(value2).trim();
      }
      if (row.managementCode || row.sellerManagerCode) {
        item.sellerManagerCode = row.managementCode ?? row.sellerManagerCode;
      }
      return item;
    });

    // Defensive dedup — Naver rejects duplicate combinations (same value tuple)
    // with 400 Duplicated. Drop any item whose (optionName1, optionName2) tuple
    // was already seen, and drop empty-value rows that would collapse together.
    const seen = new Set<string>();
    const combinations = rawCombinations.filter((c) => {
      if (!c.optionName1) return false;
      const key = `${c.optionName1} ${c.optionName2 ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (combinations.length === 0) return undefined;

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

/**
 * Build detail content HTML from product description + hook phrase, with
 * optional store-wide common notice slots prepended/appended.
 * Order: [topImage][topText] → hookPhrase → detail_image_url → description → AEO → [bottomText][bottomImage]
 * Slots are rendered ONLY when the URL/text is non-empty — empty slots emit nothing.
 */
export function buildDetailContent(
  product: LocalProduct,
  notice: NoticeAssets = {},
): string {
  const parts: string[] = [];

  // 2026-06-02 — common top slot (image then text, so the image visually leads)
  if (notice.topImageUrl) {
    parts.push(
      `<div style="text-align:center;"><img src="${escapeHtml(notice.topImageUrl)}" style="max-width:860px;width:100%;" alt="공지" /></div>`,
    );
  }
  if (notice.topText) {
    parts.push(
      `<div style="padding:16px 20px;font-size:13px;line-height:1.7;color:#555;background:#fafbfc;">${escapeHtml(notice.topText).replace(/\n/g, '<br/>')}</div>`,
    );
  }

  if (product.hookPhrase) {
    parts.push(`<div style="text-align:center;padding:20px 0;font-size:16px;color:#333;">${escapeHtml(product.hookPhrase)}</div>`);
  }

  if (product.detail_image_url) {
    parts.push(`<div style="text-align:center;"><img src="${escapeHtml(product.detail_image_url)}" style="max-width:860px;width:100%;" alt="${escapeHtml(product.name)}" /></div>`);
  }

  if (product.description) {
    parts.push(`<div style="padding:20px;font-size:14px;line-height:1.8;color:#555;">${escapeHtml(product.description).replace(/\n/g, '<br/>')}</div>`);
  }

  // C-2: AEO Q&A structured section for Naver AI Briefing optimization
  const aeoHtml = buildAEOSection(product.aeo_content);
  if (aeoHtml) {
    parts.push(aeoHtml);
  }

  // 2026-06-02 — common bottom slot (text then image, so the footer image closes)
  if (notice.bottomText) {
    parts.push(
      `<div style="padding:16px 20px;font-size:13px;line-height:1.7;color:#555;background:#fafbfc;">${escapeHtml(notice.bottomText).replace(/\n/g, '<br/>')}</div>`,
    );
  }
  if (notice.bottomImageUrl) {
    parts.push(
      `<div style="text-align:center;"><img src="${escapeHtml(notice.bottomImageUrl)}" style="max-width:860px;width:100%;" alt="안내" /></div>`,
    );
  }

  if (parts.length === 0) {
    // Minimum required detail content
    parts.push(`<div style="text-align:center;padding:40px;font-size:14px;color:#888;">${escapeHtml(product.name)}</div>`);
  }

  return parts.join('\n');
}

/** C-2: Build AEO-optimized Q&A HTML section for Naver AI Briefing */
function buildAEOSection(aeoContent: any): string | null {
  if (!aeoContent || typeof aeoContent !== 'object') return null;
  const qna: Array<{q: string; a: string}> = Array.isArray(aeoContent.qna) ? aeoContent.qna : [];
  const faq: Array<{q: string; a: string}> = Array.isArray(aeoContent.faq) ? aeoContent.faq : [];
  if (qna.length === 0 && faq.length === 0) return null;

  const parts: string[] = [];

  // Q&A section — H2/H3 structured for AI parsing
  if (qna.length > 0) {
    parts.push('<div style="padding:30px 20px;background:#fafbfc;border-top:1px solid #e5e7eb;">');
    parts.push('<h2 style="font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:20px;">\uC0C1\uD488 Q&amp;A</h2>');
    for (const item of qna) {
      parts.push('<div style="margin-bottom:16px;">');
      parts.push(`<h3 style="font-size:14px;font-weight:600;color:#374151;margin-bottom:6px;">Q. ${escapeHtml(item.q)}</h3>`);
      parts.push(`<p style="font-size:13px;color:#6b7280;line-height:1.7;padding-left:20px;">A. ${escapeHtml(item.a)}</p>`);
      parts.push('</div>');
    }
    parts.push('</div>');
  }

  // FAQ section — structured list for AI shopping guide
  if (faq.length > 0) {
    parts.push('<div style="padding:30px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;">');
    parts.push('<h2 style="font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:20px;">\uC790\uC8FC \uBB3B\uB294 \uC9C8\uBB38 (FAQ)</h2>');
    for (const item of faq) {
      parts.push('<div style="margin-bottom:14px;">');
      parts.push(`<p style="font-size:14px;font-weight:600;color:#374151;margin-bottom:4px;">Q. ${escapeHtml(item.q)}</p>`);
      parts.push(`<p style="font-size:13px;color:#6b7280;line-height:1.6;padding-left:20px;">A. ${escapeHtml(item.a)}</p>`);
      parts.push('</div>');
    }
    parts.push('</div>');
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

export function getD1CategoryName(categoryCode: string): string {
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
  // 2026-06-02: gate the canonical 8-digit numeric naverCategoryCode, NOT the
  // legacy `category` label (which is often "uncategorized" — sending that to
  // Naver as leafCategoryId triggers HTTP 400, see direct register attempt at
  // 06:10:22 KST on 2026-06-02).
  const naverCat = (product.naverCategoryCode ?? '').trim();
  if (!naverCat || !/^\d{6,10}$/.test(naverCat)) {
    errors.push(`Valid Naver leaf category code required (got "${naverCat || ''}" — needs 8-digit numeric, e.g. 50000963)`);
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

  // C-8 attribute completeness check — resolve d1 from the canonical Naver leaf code
  const d1Name = naverCat ? getD1CategoryName(naverCat) : '';
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
    naverCategoryCode: naverCat || product.category || undefined,
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

  // ── Origin truth gate (#95, product-agnostic #62) ────────────────────────
  // Origin MUST be explicitly set and resolvable to an official code. We never
  // silently guess (the builder used to fall back to China '0200037' — a guessed
  // origin = false country-of-origin labelling = legal risk under 대외무역법/
  // 관세법). resolveOriginAreaCode restores a stripped leading zero and throws on
  // empty/unknown; surface that as a HARD BLOCK, and WARN when the stored value
  // had to be healed (a dirty DB value to persist canonically).
  const rawOrigin = (product.originCode ?? '').trim();
  if (!rawOrigin) {
    errors.push('Origin code (originCode) is required — refusing to guess origin (false origin = legal risk)');
  } else {
    try {
      const resolvedOrigin = resolveOriginAreaCode(rawOrigin);
      if (resolvedOrigin !== rawOrigin) {
        warnings.push(`Origin code "${rawOrigin}" auto-healed to "${resolvedOrigin}" — persist the canonical value (stripped leading zero)`);
      }
    } catch (e) {
      errors.push(`Origin code invalid: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── Option integrity guard (#95) ─────────────────────────────────────────
  // A payload built from product_options must keep every distinct non-empty row.
  // Dedup / empty-value drops (which Naver needs but which silently shrink the
  // lineup) are WARNED so the operator can reconcile against the intended lineup.
  const optRows =
    product.product_options && Array.isArray(product.product_options.option_rows)
      ? (product.product_options.option_rows as unknown[])
      : [];
  if (optRows.length > 0) {
    const builtCount = buildOptionInfo(product.product_options)?.optionCombinations?.length ?? 0;
    if (builtCount !== optRows.length) {
      warnings.push(
        `Option count drift: ${optRows.length} DB rows → ${builtCount} payload combinations (dedup/empty drop) — verify the intended lineup`,
      );
    }
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
  noticeAssets: NoticeAssets = {},
  storeName: string = DEFAULT_STORE_NAME,
): NaverProductPayloadV2 {
  const store = (storeName || '').trim() || DEFAULT_STORE_NAME;
  // Use naver CDN URLs if available, fallback to Supabase URLs
  const representativeUrl = imageUrls?.representative ?? product.mainImage ?? '';
  const additionalImgs: string[] = imageUrls?.optional
    ?? (Array.isArray(product.additionalImages) ? product.additionalImages as string[] : []);
  const optionalImages = additionalImgs
    .filter(Boolean)
    .map(url => ({ url }));

  const seoInfo = buildSeoInfo(product);
  const optionInfo = buildOptionInfo(product.product_options);

  // Origin area info — validate/normalize against the official table (throws on
  // empty OR an unknown code so dryRun AND real register both fail loudly, never
  // silently shipping an invalid code that Naver rejects with 400). NO default
  // (#95): a guessed origin = false labelling = legal risk. validateForRegistration
  // gates this upstream; the throw here is the last-line defense for raw callers.
  const originCode = resolveOriginAreaCode(product.originCode);
  const isImport = Number(originCode) >= 200000;

  // 2026-06-02 fix — 수입품 importer 항상 충진 (originAreaInfo.importer NotEmpty
  // 400 "수입사 항목을 입력해 주세요" 영구 차단). importer_name 누락 시 폴백:
  // naver_manufacturer > 스토어명. 국산(isImport=false)은 importer 미포함
  // (네이버는 국산에 수입사 입력 금지). 허위 0 #46 — 위탁 셀러 본인이 수입 책임
  // 주체이므로 자사(스토어)명 충진이 정당. 스토어명 = '꽃틔움'(앱 이름 '꽃틔움 가든' 아님).
  const importerName = isImport
    ? String(product.importer_name ?? product.naver_manufacturer ?? store).slice(0, 100)
    : '';

  // 2026-06-02 P0 fix — leafCategoryId resolution.
  // The legacy `product.category` column carries the human-readable label
  // (often "uncategorized") and MUST NOT be sent to Naver — Commerce API v2
  // requires the 8-digit numeric leaf code from `naverCategoryCode`.
  const rawCategory = (product.naverCategoryCode ?? '').trim();
  // Reject obviously-wrong shapes (dome-ggook underscore form like "11_08_22_00_00",
  // the literal "uncategorized", empty string) — fall through to a safe placeholder
  // that the upstream guard already blocks.
  const looksLikeNaverLeaf = /^\d{6,10}$/.test(rawCategory);
  const leafCategoryId = looksLikeNaverLeaf ? rawCategory : '';

  // 2026-06-02 P0 — productInfoProvidedNotice (정보고시) ETC 인라인.
  // RESEARCH §1: 템플릿 코드 참조 방식 미지원(공식). 매 상품 인라인이 유일.
  const productInfoProvidedNotice = buildProductInfoProvidedNoticeEtc(product, store);

  const payload: NaverProductPayloadV2 = {
    originProduct: {
      statusType: 'SALE',
      saleType: 'NEW',
      leafCategoryId,
      name: pickProductName(product), // SEO-first: naver_title > seoTitle > name
      detailContent: buildDetailContent(product, noticeAssets),
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
          ...(isImport ? { importer: importerName } : {}),
          ...(product.naver_origin ? { content: product.naver_origin } : {}),
        },
        afterServiceInfo: {
          // RESEARCH §4: dashed numeric ("010-XXXX-XXXX"). Text placeholders such
          // as "고객센터 문의" are rejected by Naver v2 — normalize with fallback
          // to the registered representative phone (= addressbook number).
          afterServiceTelephoneNumber: normalizeNaverPhone(product.asPhone),
          afterServiceGuideContent: product.asInfo ?? '평일 10:00~18:00 응대, 주말·공휴일 휴무',
        },
        productInfoProvidedNotice,
        // 2026-06-02 — 미성년자 구매 가능(default true). 성인전용 상품 전용 흐름이
        // 별도 도입될 때까지 전 상품 기본 허용. NotNull 400 사고 재방지(#46).
        minorPurchasable: true,
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
