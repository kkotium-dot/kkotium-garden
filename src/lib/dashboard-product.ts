// src/lib/dashboard-product.ts
// Shared product shape + raw normalizer used by dashboard, /market, /growth.
// Extracted from src/app/dashboard/page.tsx (2026-07-09) because Next.js App
// Router forbids non-page value exports from a page.tsx file.

export interface DashboardProduct {
  id: string;
  name: string;
  sku: string;
  status: string;
  salePrice: number;
  supplierPrice: number;
  naverCategoryCode?: string;
  // Product.category_id — the naver_categories FK used for dropship-fitness/
  // sourcing scoring, kept distinct from naverCategoryCode (2026-09-02).
  category_id?: string | null;
  keywords?: string[];
  tags?: string[];
  mainImage?: string;
  aiScore?: number;
  createdAt?: Date;
  updatedAt?: Date;
  lastSaleDate?: Date;
  supplierName?: string;
  shippingTemplateId?: string | null;
  images?: string[];
  shippingFee?: number;
  internalTags?: string[];
  // F-1 완주 임박 넛지(docs/design/F_PUBLISH_COMPLETION_NUDGE_2026-08-27.md)
  // — "미발행" 판정(naverProductId IS NULL)과 테스트잔재 배제(source=NATIVE
  // AND salePrice=0 AND mainImage없음)에 쓰인다. 둘 다 API가 이미 select하고
  // 있었고(Product.naverProductId/source) DashboardProduct에만 없었다.
  naverProductId?: string | null;
  source?: string;
}

export function normalizeProducts(raw: unknown[]): DashboardProduct[] {
  return raw.map((rawItem) => {
    const p = rawItem as Record<string, unknown>;
    const supplier = p.supplier as Record<string, unknown> | undefined;
    return {
      id: String(p.id ?? ''),
      name: String(p.name ?? ''),
      sku: String(p.sku ?? ''),
      status: String(p.status ?? 'DRAFT'),
      salePrice: typeof p.salePrice === 'number' ? p.salePrice : 0,
      supplierPrice: typeof p.supplierPrice === 'number' ? p.supplierPrice : 0,
      // category_id (Product.category_id, a naver_categories cuid FK) is NOT
      // a naverCategoryCode — do not fall back to it here, or a raw DB id
      // renders/counts as if it were a real Naver category code (2026-09-02
      // 실측, category_id backfill 작업 중 발견).
      naverCategoryCode: (p.naverCategoryCode as string | undefined) ?? '',
      category_id: (p.category_id as string | null | undefined) ?? null,
      keywords: Array.isArray(p.keywords) ? (p.keywords as string[]) : [],
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
      mainImage:
        (p.mainImage as string | undefined) ??
        (p.main_image_url as string | undefined),
      aiScore: typeof p.aiScore === 'number' ? p.aiScore : undefined,
      createdAt: p.createdAt ? new Date(p.createdAt as string) : undefined,
      updatedAt: p.updatedAt ? new Date(p.updatedAt as string) : new Date(),
      lastSaleDate: p.lastSaleDate ? new Date(p.lastSaleDate as string) : undefined,
      supplierName:
        (supplier?.name as string | undefined) ??
        (p.supplierName as string | undefined),
      shippingTemplateId:
        (p.shippingTemplateId as string | null | undefined) ??
        (p.shipping_template_id as string | null | undefined) ??
        null,
      images: Array.isArray(p.images) ? (p.images as string[]) : [],
      shippingFee:
        typeof p.shippingFee === 'number'
          ? p.shippingFee
          : typeof p.shipping_fee === 'number'
            ? p.shipping_fee
            : 3000,
      internalTags: Array.isArray(p.internalTags) ? (p.internalTags as string[]) : [],
      naverProductId: (p.naverProductId as string | null | undefined) ?? null,
      source: (p.source as string | undefined) ?? 'NATIVE',
    };
  });
}
