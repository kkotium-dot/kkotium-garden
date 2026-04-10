# Sprint A → Sprint B: SKU / Supplier / Shipping Template

_Date: 2026-03-05_  
_Status: Sprint B Complete_

---

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

## Files Confirmed Changed (Sprint A)
| File | Change |
|---|---|
| `prisma/schema.prisma` | Supplier abbr/platformCode/platformUrl |
| `src/app/api/products/generate-sku/route.ts` | New SKU format |
| `src/app/api/suppliers/route.ts` | abbr + platformCode validation + platformUrl |
| `src/app/api/suppliers/[id]/route.ts` | PATCH/DELETE with abbr/platformCode/platformUrl |
| `src/app/api/shipping-templates/route.ts` | name+naverTemplateNo+memo focused |
| `src/app/api/shipping-templates/[id]/route.ts` | PATCH/soft-delete (real DB count, not hardcoded 0) |
| `src/components/products/ShippingTemplateModal.tsx` | New modal component |
| `src/app/products/new/page.tsx` | D3 shipping section: select replaced with modal button |

## Files Confirmed Changed (Sprint B — 2026-03-11)
| File | Change |
|---|---|
| `.env` | DATABASE_URL → Transaction pooler port 6543 + pgbouncer=true (fixes MaxClientsInSessionMode) |
| `src/lib/prisma.ts` | Removed verbose query logging; error/warn only in dev |
| `src/app/settings/suppliers/page.tsx` | NEW: standalone supplier management page at /settings/suppliers |
| `src/components/layout/Sidebar.tsx` | Added /settings/suppliers nav item |
| `src/components/products/ShippingTemplateModal.tsx` | Added template code field with regex validation (dmm-hv-cj-1 format) |
| `scripts/fix-supplier-abbr.sql` | SQL script to backfill existing supplier abbr values |

## Sprint B Completion Status
- [x] 3-1: Supplier abbr backfill — SQL script at `scripts/fix-supplier-abbr.sql` (run manually in Supabase SQL editor)
- [x] 3-2: Supplier management UI page — `/settings/suppliers` (standalone, with search/filter/CRUD)
- [x] 3-3: ShippingTemplate naming convention + regex validation in modal
- [x] 3-4: Product page auto-apply shipping from supplier — ALREADY IMPLEMENTED in page.tsx (line ~317-358)
- [x] 3-5: shipping-templates DELETE bug — ALREADY FIXED (real DB count in [id]/route.ts)

## Remaining / Sprint C
- DB: Run `scripts/fix-supplier-abbr.sql` in Supabase SQL Editor to populate existing supplier abbr values
- Excel export: verify `naverTemplateNo` maps to correct Naver bulk upload column
- Supplier search UX: fuzzy + initial consonant search, recently used dropdown
- SKU real-time duplicate check UI
- Shipping fee auto-recommendation by category/price/supplier
