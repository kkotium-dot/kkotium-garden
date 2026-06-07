// /api/products/[id]/attributes
// ============================================================================
// Required category-attribute fill (material/color). Phase 3, handoff task 1.
//   POST — normalize material/color to allowed enums (no free text) and report
//          the completeness BEFORE/AFTER. Dry-run by default; { confirm: true }
//          writes naver_material + naver_color (REVERSIBLE DB, no Naver).
//
// Body: { material?: string, color?: string, confirm?: boolean }
// Resolves the internal validation warning (missing material/color) for the
// leaf category (e.g. 50003356, the Furniture/Interior D1, requires brand/material/color).
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  normalizeAttributeValue, getAllowedValues,
} from '@/lib/naver/category-attribute-enums';
import { getD1CategoryName } from '@/lib/naver/product-builder';
import { calcAttributeCompleteness } from '@/lib/category-attributes';

export const dynamic = 'force-dynamic';

interface Body { material?: string; color?: string; confirm?: boolean }

function completeness(p: {
  brand: string | null; naver_brand: string | null; originCode: string | null;
  naver_material: string | null; naver_color: string | null;
  naver_size: string | null; naver_care_instructions: string | null;
  naverCategoryCode: string | null;
}) {
  const d1 = getD1CategoryName(p.naverCategoryCode ?? '');
  return calcAttributeCompleteness(d1, {
    brand: p.brand || p.naver_brand,
    originCode: p.originCode,
    material: p.naver_material,
    color: p.naver_color,
    size: p.naver_size,
    careInstructions: p.naver_care_instructions,
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: Body = {};
  try { body = await req.json(); } catch { /* empty → just report current completeness */ }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      brand: true, naver_brand: true, originCode: true,
      naver_material: true, naver_color: true, naver_size: true,
      naver_care_instructions: true, naverCategoryCode: true,
    },
  });
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  const before = completeness(product);

  // Normalize requested values to allowed enums (never free text).
  const normMaterial = body.material !== undefined ? normalizeAttributeValue('material', body.material) : null;
  const normColor = body.color !== undefined ? normalizeAttributeValue('color', body.color) : null;

  const nextMaterial = normMaterial?.value ?? product.naver_material;
  const nextColor = normColor?.value ?? product.naver_color;

  // Completeness AFTER the proposed values (computed in-memory, no write yet).
  const after = completeness({ ...product, naver_material: nextMaterial, naver_color: nextColor });

  let applied = false;
  if (body.confirm === true && (normMaterial || normColor)) {
    await prisma.product.update({
      where: { id: productId },
      data: {
        ...(normMaterial ? { naver_material: nextMaterial } : {}),
        ...(normColor ? { naver_color: nextColor } : {}),
      },
    });
    applied = true;
  }

  return NextResponse.json({
    success: true,
    productId,
    normalized: {
      material: normMaterial,
      color: normColor,
    },
    allowed: {
      material: getAllowedValues('material'),
      color: getAllowedValues('color'),
    },
    completeness: {
      before: { grade: before.grade, score: before.score, missingRequired: before.missingRequired },
      after: { grade: after.grade, score: after.score, missingRequired: after.missingRequired },
    },
    applied,   // false = dry-run preview (no DB write)
  });
}
