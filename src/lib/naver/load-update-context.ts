// src/lib/naver/load-update-context.ts
// ============================================================================
// Shared loader that assembles everything buildNaverProductPayload needs for an
// existing product: the LocalProduct, the validation verdict, deliveryInfo,
// notice assets, store name and addresses. Single source of truth so the
// publish-preview screen (read-only) and the update route (PUT) build the SAME
// payload — the preview can never lie about what the irreversible PUT will send.
//
// Pure data assembly: Prisma reads only. No Naver call, no mutation. Guards
// (not-registered / addresses-not-synced) stay in the caller so this loader can
// also serve a pre-publish preview of a not-yet-registered product.
// ============================================================================

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  buildDeliveryInfo,
  buildDeliveryInfoFromProduct,
  validateForRegistration,
  type LocalProduct,
  type NaverDeliveryInfo,
  type NoticeAssets,
  type AddressIds,
  type ShippingTemplateData,
  type SupplierBundleInfo,
  type ValidationResult,
} from './product-builder';

// Store-name fallback (escaped so no Hangul literal sits in code). Mirrors the
// register/update store default (the KKOTIUM store brand).
const DEFAULT_STORE_NAME = '\uAF43\uD2D4\uC6C0';
const DEFAULT_NOTICE_TOP_IMAGE_URL: string | null = null;
const DEFAULT_NOTICE_BOTTOM_IMAGE_URL: string | null = null;

type DbProductWithOptions = Prisma.ProductGetPayload<{ include: { product_options: true } }>;

export interface NaverUpdateContext {
  dbProduct: DbProductWithOptions;
  product: LocalProduct;
  validation: ValidationResult;
  deliveryInfo: NaverDeliveryInfo;
  noticeAssets: NoticeAssets;
  storeName: string;
  addresses: AddressIds | null;
  hasShippingTemplate: boolean;
}

export async function getNaverAddressIds(): Promise<AddressIds | null> {
  try {
    const settings = await prisma.storeSettings.findFirst({
      select: { releaseAddressId: true, returnAddressId: true },
    });
    if (!settings?.releaseAddressId || !settings?.returnAddressId) return null;
    const release = Number(settings.releaseAddressId);
    const ret = Number(settings.returnAddressId);
    if (!Number.isFinite(release) || !Number.isFinite(ret) || release <= 0 || ret <= 0) return null;
    return { releaseAddressId: release, returnAddressId: ret };
  } catch {
    return null;
  }
}

/**
 * Load + assemble the full update/preview context for a product. Returns null
 * only when the product does not exist. addresses may be null (caller decides
 * whether that blocks a real PUT); deliveryInfo is still built with a 0/0
 * placeholder in that case so a preview can render (delivery fields are not
 * surfaced in the preview summary, and the update route's own guard prevents a
 * PUT when addresses are missing).
 */
export async function loadNaverUpdateContext(productId: string): Promise<NaverUpdateContext | null> {
  const dbProduct = await prisma.product.findUnique({
    where: { id: productId },
    include: { product_options: true },
  });
  if (!dbProduct) return null;

  // Shipping template (same mapping as register/update).
  let shippingTemplate: ShippingTemplateData | null = null;
  if (dbProduct.shipping_template_id) {
    const tmpl = await prisma.shippingTemplate.findUnique({ where: { id: dbProduct.shipping_template_id } });
    if (tmpl) {
      shippingTemplate = {
        courierCode: tmpl.courierCode,
        shippingType: tmpl.shippingType,
        shippingFee: tmpl.shippingFee,
        freeThreshold: tmpl.freeThreshold,
        returnFee: tmpl.returnFee,
        exchangeFee: tmpl.exchangeFee,
        jejuFee: tmpl.jejuFee,
        islandFee: tmpl.islandFee,
      };
    }
  }

  // Supplier bundle attributes.
  let bundleInfo: SupplierBundleInfo | undefined;
  if (dbProduct.supplierId) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: dbProduct.supplierId },
      select: { bundleCapable: true, naverBundleGroupId: true, jejuExtraFee: true, islandExtraFee: true },
    });
    if (supplier) {
      bundleInfo = {
        bundleCapable: supplier.bundleCapable,
        naverBundleGroupId: supplier.naverBundleGroupId,
        jejuExtraFee: supplier.jejuExtraFee,
        islandExtraFee: supplier.islandExtraFee,
      };
    }
  }

  const addresses = await getNaverAddressIds();

  const product: LocalProduct = {
    ...dbProduct,
    additionalImages: dbProduct.additionalImages as unknown,
    keywords: dbProduct.keywords as unknown,
    tags: dbProduct.tags as unknown,
    product_options: dbProduct.product_options ?? null,
  };

  const validation = validateForRegistration(product, !!shippingTemplate, !!addresses);

  // Placeholder address ids when not synced — preview-only; the update route's
  // own guard blocks a PUT when addresses are missing, so this never reaches Naver.
  const addr: AddressIds = addresses ?? { releaseAddressId: 0, returnAddressId: 0 };
  const deliveryInfo = shippingTemplate
    ? buildDeliveryInfo(shippingTemplate, addr, bundleInfo)
    : buildDeliveryInfoFromProduct(product, addr, bundleInfo);

  const noticeSettings = await prisma.storeSettings.findFirst({
    select: {
      storeName: true,
      noticeTopImageUrl: true,
      noticeTopText: true,
      noticeBottomImageUrl: true,
      noticeBottomText: true,
    },
  });
  const noticeAssets: NoticeAssets = {
    topImageUrl: noticeSettings?.noticeTopImageUrl ?? DEFAULT_NOTICE_TOP_IMAGE_URL,
    topText: noticeSettings?.noticeTopText ?? null,
    bottomImageUrl: noticeSettings?.noticeBottomImageUrl ?? DEFAULT_NOTICE_BOTTOM_IMAGE_URL,
    bottomText: noticeSettings?.noticeBottomText ?? null,
  };
  const storeName = (noticeSettings?.storeName ?? '').trim() || DEFAULT_STORE_NAME;

  return {
    dbProduct,
    product,
    validation,
    deliveryInfo,
    noticeAssets,
    storeName,
    addresses,
    hasShippingTemplate: !!shippingTemplate,
  };
}
