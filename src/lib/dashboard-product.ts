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
      naverCategoryCode:
        (p.naverCategoryCode as string | undefined) ??
        (p.category_id as string | undefined) ??
        '',
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
    };
  });
}
