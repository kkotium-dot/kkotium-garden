// src/lib/product-write-fields.ts
// ============================================================================
// #150 systemic save guard (#62 generalized). A single stray key in a save
// payload (e.g. the legacy `asGuide`, which is a StoreSettings column — NOT a
// Product column) made prisma.product.update throw "Unknown arg" and 500 the
// ENTIRE save for that product. The old PUT handler used a hand-maintained
// denylist (REJECT_KEYS), which only blocked keys someone remembered to add.
//
// Root fix: derive the writable-column ALLOWLIST straight from the Prisma
// schema (DMMF) so it can never drift, and strip anything not on it before
// update/create. Now no unknown key — present or future — can break a save;
// it is silently dropped instead of poisoning the whole payload.
//
// Plus a small alias map for legacy keys the client still sends that map onto a
// real column under a different name (asGuide -> Product.asInfo).

import { Prisma } from '@prisma/client';

// Writable scalar/enum columns of Product, sourced from the live schema. We
// exclude the id and the auto-managed timestamps (createdAt / @updatedAt), and
// relation fields are naturally excluded (kind === 'object').
const productModel = Prisma.dmmf.datamodel.models.find((m) => m.name === 'Product');

export const PRODUCT_WRITABLE_FIELDS: ReadonlySet<string> = new Set(
  (productModel?.fields ?? [])
    .filter(
      (f) =>
        (f.kind === 'scalar' || f.kind === 'enum') &&
        !f.isId &&
        !f.isUpdatedAt &&
        f.name !== 'createdAt',
    )
    .map((f) => f.name),
);

// Legacy / aliased payload keys -> the real Product column they belong to.
// asGuide (A/S 안내) is a StoreSettings field; on a Product the A/S guidance is
// stored in asInfo. asPhone is a real Product column and passes through as-is.
const ALIAS_TO_COLUMN: Record<string, string> = {
  asGuide: 'asInfo',
};

/**
 * Restrict an arbitrary save payload to real, writable Product columns and
 * remap known legacy aliases. Unknown keys are dropped (not forwarded to
 * Prisma), so a stray field can never 500 the whole save. Pure — does not
 * mutate the input.
 */
export function sanitizeProductWrite(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (PRODUCT_WRITABLE_FIELDS.has(key)) {
      out[key] = value;
      continue;
    }
    // Aliased key -> real column, only when the canonical column was not also
    // sent explicitly (explicit value wins).
    const aliased = ALIAS_TO_COLUMN[key];
    if (aliased && PRODUCT_WRITABLE_FIELDS.has(aliased) && !(aliased in input) && value != null) {
      out[aliased] = value;
    }
    // otherwise: unknown / read-only / relation key -> dropped
  }

  return out;
}
