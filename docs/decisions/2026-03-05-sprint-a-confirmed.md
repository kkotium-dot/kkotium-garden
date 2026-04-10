# Sprint A Confirmed Decisions — 2026-03-05

## Status: COMPLETE (tsc 0 errors)

## DB Schema Changes
- `Supplier` model: added `abbr String @unique` (2-4 uppercase chars), `platformCode String` (DMM/DMK/OWN/ETC), `platformUrl String?`
- Migration applied via `npx prisma db push`

## SKU Format (confirmed)
- With supplier abbr: `{PLATFORM}-{ABBR}-{SUPPLIER_PRODUCT_NO}` e.g. `DMM-HV-39234`
- Without supplier abbr: `{PLATFORM}-DIRECT-{SUPPLIER_PRODUCT_NO}`
- Fallback (no product no): `KKT-{YYMMDD}-{RANDOM6}`
- Uniqueness: suffix `-1`, `-2` appended on collision
- File: `src/app/api/products/generate-sku/route.ts`

## Platform Codes (confirmed)
- `DMM` = Domeggook
- `DMK` = Domeki
- `OWN` = Own brand
- `ETC` = Other

## Files Confirmed Changed
| File | Change |
|---|---|
| `prisma/schema.prisma` | Supplier abbr/platformCode/platformUrl |
| `src/app/api/products/generate-sku/route.ts` | New SKU format |
| `src/app/api/suppliers/route.ts` | abbr + platformCode validation + platformUrl |
| `src/app/api/suppliers/[id]/route.ts` | PATCH/DELETE with abbr/platformCode/platformUrl |
| `src/app/api/shipping-templates/route.ts` | name+naverTemplateNo+memo focused |
| `src/app/api/shipping-templates/[id]/route.ts` | PATCH/soft-delete (fixed hardcoded 0 bug) |
| `src/components/products/ShippingTemplateModal.tsx` | New modal component |
| `src/app/products/new/page.tsx` | D3 shipping section: select replaced with modal button |

## Remaining (Sprint B)
- DB: existing Supplier rows need `abbr` values set (manual SQL or seed)
- Supplier management UI page
- Excel export: verify `naverTemplateNo` maps to correct column
