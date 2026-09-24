// src/lib/products/gallery-images.ts
//
// GALLERY_SINGLE_AUTHORITY_2026-09-24 — single authority for a product's
// additional (optional) gallery images, i.e. Naver "추가이미지" slots.
//
// Root cause this fixes (verified 2026-09-24 against code + production data):
//   - Writers store additional images in the `images` column (String[]):
//       * seed-planting via productFormSerialize (images: v.additionalImages)
//       * product import route (images: additionalImages)
//   - Most readers (Naver register/update image upload, payload builder,
//     publish readiness, dashboard, loader, legacy excel/API routes) read the
//     legacy `additionalImages` Json column instead — which is null on every
//     product in production (19/19 products with a main image).
//   => additional images entered by the seller were silently dropped from the
//      Naver API register/update upload. to-naver-product.ts (Excel path) had
//      already been fixed to read `images` on 2026-09-15; the other paths had not.
//
// Resolution order: `images` (canonical) first, legacy `additionalImages`
// Json as a read-only fallback so any old row that only has the Json column
// keeps working. Output is de-duplicated, excludes the main image, keeps only
// http(s) URLs and is capped at Naver's limit of 9 optional images.

export const NAVER_MAX_OPTIONAL_IMAGES = 9;

function toStringList(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        return toStringList(parsed);
      } catch {
        return [];
      }
    }
    return trimmed.split(/[\n,]/);
  }
  return [];
}

export interface GallerySource {
  images?: unknown;
  additionalImages?: unknown;
  mainImage?: unknown;
}

/** Additional (optional) gallery image URLs for a product, max 9, main excluded. */
export function resolveAdditionalImages(product: GallerySource | null | undefined): string[] {
  if (!product) return [];
  const main = typeof product.mainImage === 'string' ? product.mainImage.trim() : '';
  const canonical = toStringList(product.images);
  const source = canonical.length > 0 ? canonical : toStringList(product.additionalImages);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of source) {
    const url = raw.trim();
    if (!/^https?:\/\//i.test(url)) continue;
    if (url === main || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= NAVER_MAX_OPTIONAL_IMAGES) break;
  }
  return out;
}
