// /api/products/[id]/seo-text
// ============================================================================
// SEO text auto-fill (name + tags + attribute summary). Phase 3, handoff task 7.
//   POST — dry-run by default: builds an SEO draft from the product + body
//          overrides, verifies tags against the tag-dictionary, and returns it.
//          { confirm: true } applies naver_title + tags to the DB (REVERSIBLE —
//          DB-only, never touches Naver; #46 keeps publish behind operator).
//
// Body: {
//   brandLine?: 'SEED'|'GREENHOUSE', brandToken?, functionalKeywords?: string[],
//   emotionalKeywords?: string[], attrs?: SeoSourceAttrs, confirm?: boolean
// }
// Migration-safe: brand_line column absent → falls back to the body brandLine.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  generateSeoText, type BrandLine, type SeoSourceAttrs,
} from '@/lib/seo/seo-text-generator';
import { verifyTags } from '@/lib/naver/tag-dictionary';

export const dynamic = 'force-dynamic';

const VALID_LINES = new Set<BrandLine>(['SEED', 'GREENHOUSE']);

function isMissingColumn(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  const msg = e instanceof Error ? e.message : String(e);
  return code === 'P2021' || code === 'P2022' || /does not exist|column .* does not exist/i.test(msg);
}

interface Body {
  brandLine?: string;
  brandToken?: string | null;
  functionalKeywords?: string[];
  emotionalKeywords?: string[];
  attrs?: SeoSourceAttrs;
  confirm?: boolean;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const productId = params.id;

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    // empty body → derive everything from the product row.
  }

  // Load the product. brand_line is read defensively (column may be unmigrated).
  let product: {
    id: string; name: string; naver_title: string | null;
    brand_line?: string | null;
  } | null;
  try {
    product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, naver_title: true, brand_line: true },
    });
  } catch (e) {
    if (!isMissingColumn(e)) throw e;
    // brand_line column missing → re-query without it.
    product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, naver_title: true },
    });
  }
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  // Resolve brand_line: body > product column > default SEED.
  const bodyLine = body.brandLine && VALID_LINES.has(body.brandLine as BrandLine)
    ? (body.brandLine as BrandLine) : null;
  const colLine = product.brand_line === 'GREENHOUSE' || product.brand_line === 'SEED'
    ? (product.brand_line as BrandLine) : null;
  const brandLine: BrandLine = bodyLine ?? colLine ?? 'SEED';

  const draft = generateSeoText({
    baseName: product.naver_title || product.name || '',
    brandLine,
    attrs: body.attrs ?? {},
    functionalKeywords: body.functionalKeywords ?? [],
    emotionalKeywords: body.emotionalKeywords ?? [],
    brandToken: body.brandToken ?? null,
  });

  // Tag-dictionary verification (best-effort; never blocks the draft).
  const tagVerification = draft.tags.length ? await verifyTags(draft.tags) : null;

  // Dry-run by default. Only confirm:true writes to the DB (reversible).
  let applied = false;
  if (body.confirm === true) {
    try {
      await prisma.product.update({
        where: { id: productId },
        data: {
          naver_title: draft.productName,
          tags: draft.tags as unknown as Prisma.InputJsonValue,
        },
      });
      applied = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    productId,
    brandLine,
    draft,
    tagVerification,
    applied,           // false = dry-run preview (no DB write)
  });
}
