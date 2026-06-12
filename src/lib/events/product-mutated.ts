// src/lib/events/product-mutated.ts
// ============================================================================
// Cross-component product-mutation broadcast (#62). When one view changes a
// product's image state (asset-browser set_main / add_extra / archive), other
// mounted views that show the same product (studio header/canvas, detail page)
// must refetch. The app uses SWR + plain fetch (no React Query global store),
// so a library-agnostic window CustomEvent is the broadcast primitive: any
// listener — a plain-fetch refetch OR an SWR `mutate(key)` — can subscribe.
//
// SSR-safe: every call no-ops when `window` is undefined.
// ============================================================================

export const PRODUCT_MUTATED_EVENT = 'kkotium:product-mutated';

export interface ProductMutatedDetail {
  productId: string;
  /** What changed (e.g. 'set_main' | 'add_extra' | 'archive'), for listeners. */
  reason?: string;
}

/** Broadcast that a product's data changed so sibling views refetch. */
export function broadcastProductMutated(productId: string, reason?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ProductMutatedDetail>(PRODUCT_MUTATED_EVENT, {
      detail: { productId, reason },
    }),
  );
}

/** Subscribe to product-mutation broadcasts. Returns an unsubscribe function. */
export function onProductMutated(
  handler: (detail: ProductMutatedDetail) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const fn = (e: Event) => handler((e as CustomEvent<ProductMutatedDetail>).detail);
  window.addEventListener(PRODUCT_MUTATED_EVENT, fn);
  return () => window.removeEventListener(PRODUCT_MUTATED_EVENT, fn);
}
