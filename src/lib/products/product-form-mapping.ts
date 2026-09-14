// src/lib/products/product-form-mapping.ts
// ============================================================================
// SEED-SAVE C-2 (#62) — single shared field mapping for the 씨앗심기 form save
// payload (serialize) and the ?edit= loader (hydrate). Both directions live HERE
// so adding a roundtrip field means editing ONE place and getting save+restore
// for free — the field-fidelity drift (배송템플릿/반품안심케어/asPhone… vanishing on
// re-open) can no longer happen silently.
//
// IMPORTANT — DB key fidelity: keys below are the EXACT Prisma/PostgREST columns
// returned by GET /api/products/[id] (snake_case where the schema is snake_case).
// A prior bug read `shippingTemplateId` (camel) when the column is
// `shipping_template_id`, so the template never restored. Use the real keys.
//
// Scope: the drift-prone scalar/array roundtrip fields. Fields with bespoke
// side-effects (category drill-down, the COPY-AUTO hook gate, keywords/tags,
// options) stay page-managed by design and are added to the payload / loader
// separately — see the call sites in src/app/products/new/page.tsx.
// ============================================================================

export interface ProductFormValues {
  name: string;
  salePrice: number;
  supplierPrice: number;
  supplierId: string;
  brand: string;
  originCode: string;
  taxType: string;
  mainImage: string;
  additionalImages: string[]; // 추가 썸네일 URLs
  detailImages: string[];     // 상세페이지 image URLs
  detailImageUrl: string;     // single composed/supplier detail
  description: string;
  asPhone: string;
  asGuide: string;            // aliased to Product.asInfo by the API (#150)
  shippingTemplateId: string;
  returnCareEnabled: boolean;
  sku: string;                // operator seller code (Product.sku column)
  // SUPPLIER_CODE_ROUNDTRIP_2026-09-10 — 공급처 상품번호(재고추적의 1급 키).
  // 이 필드가 이 공용 매핑에 없어서 (1)편집 재열람 시 기존 값이 폼에 안
  // 올라오고 (2)저장 payload에도 안 실려, 씨앗심기에서 저장하면 꽃밭 돌보기의
  // "상품 코드 연결"과 완전히 단절돼 있었다. supplier_product_code는 실제
  // Product 컬럼이라 백엔드(PUT sanitize)는 이미 받을 준비가 됨. crawlProductNo가
  // prefill로 들어오면(prefill-schema) 이 필드에 실려 저장까지 영속화된다.
  supplierProductCode: string; // → supplier_product_code (inventory tracking link)
}

/**
 * Serialize the form values into the DB save payload. Pure. Omits status,
 * options, naverCategoryCode, keywords/tags/hookPhrase and userId — those are
 * added by the caller (page-managed or status-dependent). `sku` is emitted only
 * when non-empty so a new-product POST can still generate its fallback.
 */
export function productFormSerialize(v: ProductFormValues): Record<string, unknown> {
  return {
    name: v.name,
    salePrice: v.salePrice,
    supplierPrice: v.supplierPrice,
    supplierId: v.supplierId || undefined,
    brand: v.brand,
    originCode: v.originCode,
    taxType: v.taxType,
    // Three image zones (IMAGE-SPLIT #163).
    mainImage: v.mainImage || undefined,
    images: v.additionalImages,
    detail_images: v.detailImages,
    detail_image_url: v.detailImageUrl || undefined,
    // The Excel 상세설명 column maps from description; embed the single detail
    // image as <img> when present (existing behavior), else the text body.
    description: v.detailImageUrl ? `<img src="${v.detailImageUrl}">` : (v.description || undefined),
    asPhone: v.asPhone,
    asGuide: v.asGuide,
    // Previously-missing roundtrip fields (the #62 drift): now always persisted.
    shipping_template_id: v.shippingTemplateId || undefined,
    return_care_enabled: v.returnCareEnabled,
    // SUPPLIER_CODE_ROUNDTRIP_2026-09-10 — emit only when non-empty so a save
    // that legitimately has no code yet never overwrites an existing one to ''
    // (PUT is PATCH-style: an omitted key is left untouched — see route.ts).
    ...(v.supplierProductCode.trim() ? { supplier_product_code: v.supplierProductCode.trim() } : {}),
    ...(v.sku.trim() ? { sku: v.sku.trim() } : {}),
  };
}

export interface ProductFormSetters {
  setProductName: (s: string) => void;
  setPrice: (s: string) => void;
  setSupplierPrice: (s: string) => void;
  setSelectedSupplierId: (s: string) => void;
  setBrand: (s: string) => void;
  setOriginCode: (s: string) => void;
  setTaxType: (s: string) => void;
  setMainImage: (s: string) => void;
  setAdditionalImages: (s: string) => void;
  setDetailImages: (s: string) => void;
  setDetailImageUrl: (s: string) => void;
  setDescription: (s: string) => void;
  setAsPhone: (s: string) => void;
  setAsGuide: (s: string) => void;
  setSelectedTemplateId: (s: string) => void;
  setReturnCareEnabled: (b: boolean) => void;
  setSellerCode: (s: string) => void;
  setSupplierProductCode: (s: string) => void;
}

/**
 * Hydrate the form setters from a GET /api/products/[id] product DTO. Restores
 * exactly the fields productFormSerialize persists, using the real DB keys.
 * Guards each field so an absent value never clobbers a default. Page-managed
 * fields (category drill, hook gate, keywords/tags) are restored by the caller.
 */
export function productFormHydrate(
  dto: Record<string, any>,
  s: ProductFormSetters,
): void {
  if (dto.name) s.setProductName(String(dto.name));
  if (dto.salePrice != null) s.setPrice(String(dto.salePrice));
  if (dto.supplierPrice != null) s.setSupplierPrice(String(dto.supplierPrice ?? 0));
  if (dto.supplierId) s.setSelectedSupplierId(String(dto.supplierId));
  if (dto.brand) s.setBrand(String(dto.brand));
  if (dto.originCode) s.setOriginCode(String(dto.originCode));
  if (dto.taxType) s.setTaxType(String(dto.taxType));
  if (dto.mainImage) s.setMainImage(String(dto.mainImage));
  if (Array.isArray(dto.images) && dto.images.length > 0) s.setAdditionalImages(dto.images.join(','));
  if (Array.isArray(dto.detail_images) && dto.detail_images.length > 0) s.setDetailImages(dto.detail_images.join(','));
  if (dto.detail_image_url) s.setDetailImageUrl(String(dto.detail_image_url));
  if (dto.description) s.setDescription(String(dto.description));
  if (dto.asPhone) s.setAsPhone(String(dto.asPhone));
  // asGuide is stored as Product.asInfo (alias, #150) — read that first.
  const asGuide = dto.asInfo ?? dto.asGuide;
  if (asGuide) s.setAsGuide(String(asGuide));
  // FIX: real column is shipping_template_id (was read as camelCase → never restored).
  if (dto.shipping_template_id) s.setSelectedTemplateId(String(dto.shipping_template_id));
  if (typeof dto.return_care_enabled === 'boolean') s.setReturnCareEnabled(dto.return_care_enabled);
  if (dto.sku) s.setSellerCode(String(dto.sku));
  // SUPPLIER_CODE_ROUNDTRIP_2026-09-10 — restore the supplier product code so
  // re-opening an already-code-linked product shows it (and re-saving keeps it).
  if (dto.supplier_product_code) s.setSupplierProductCode(String(dto.supplier_product_code));
}
