// /api/products/[id]/seo-text
// ============================================================================
// SEO text auto-fill (name + tags + attribute summary). Phase 3, handoff task 7.
//   POST — dry-run by default. Sources roots/attrs from the PRODUCT itself
//          (keywords/tags/targetKeywords/naver_keywords + options), expands a
//          tag candidate pool, verifies it against the tag dictionary, and keeps
//          verified>weak (substituting weak/missing). { confirm: true } applies
//          naver_title + tags to the DB (REVERSIBLE — DB-only, no Naver; #46).
//
// Body overrides (all optional): brandLine, brandToken, attrs (SeoSourceAttrs),
//   functionalKeywords/emotionalKeywords (extra seeds), confirm.
// Migration-safe: brand_line column absent → falls back to body/default.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  generateSeoText, MAX_TAGS, type BrandLine, type SeoSourceAttrs,
} from '@/lib/seo/seo-text-generator';
import { verifyTags, type TagStatus } from '@/lib/naver/tag-dictionary';

export const dynamic = 'force-dynamic';

const VALID_LINES = new Set<BrandLine>(['SEED', 'GREENHOUSE']);
const STATUS_RANK: Record<TagStatus, number> = { verified: 0, weak: 1, missing: 2, error: 3 };

function isMissingColumn(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  const msg = e instanceof Error ? e.message : String(e);
  return code === 'P2021' || code === 'P2022' || /does not exist|column .* does not exist/i.test(msg);
}

function toArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

// product_options.option_rows = Array<{ values: string[]; stock; price; status }>.
// Flatten the option VALUES (e.g. scent names) — String()-ing the row object
// itself yields "[object Object]", so pull `.values`.
function optionValues(po: unknown): string[] {
  const rows = Array.isArray((po as { option_rows?: unknown })?.option_rows)
    ? ((po as { option_rows: unknown[] }).option_rows) : [];
  const out: string[] = [];
  for (const r of rows) {
    const vals = Array.isArray((r as { values?: unknown })?.values)
      ? (r as { values: unknown[] }).values : [];
    for (const v of vals) {
      const s = String(v).trim();
      if (s && !out.includes(s)) out.push(s);
    }
  }
  return out;
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
  try { body = await req.json(); } catch { /* empty → derive from product */ }

  // Load the product (full keyword/attribute surface). brand_line read
  // defensively (the Phase 3 column may be unmigrated on older DBs).
  const baseSelect = {
    id: true, name: true, naver_title: true, seoTitle: true,
    keywords: true, tags: true, targetKeywords: true, naver_keywords: true,
    naver_material: true, naver_color: true, naver_origin: true,
    naverCategoryCode: true,
    product_options: { select: { option_names: true, option_rows: true, direct_inputs: true } },
  } as const;

  let product: Record<string, unknown> | null;
  try {
    product = await prisma.product.findUnique({
      where: { id: productId },
      select: { ...baseSelect, brand_line: true },
    }) as Record<string, unknown> | null;
  } catch (e) {
    if (!isMissingColumn(e)) throw e;
    product = await prisma.product.findUnique({
      where: { id: productId }, select: baseSelect,
    }) as Record<string, unknown> | null;
  }
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  // Resolve brand_line: body > product column > default SEED.
  const bodyLine = body.brandLine && VALID_LINES.has(body.brandLine as BrandLine)
    ? (body.brandLine as BrandLine) : null;
  const col = product.brand_line;
  const colLine = col === 'GREENHOUSE' || col === 'SEED' ? (col as BrandLine) : null;
  const brandLine: BrandLine = bodyLine ?? colLine ?? 'SEED';

  // Seed roots: product keyword surfaces + caller extras.
  const seedKeywords = [
    ...toArray(product.keywords),
    ...toArray(product.targetKeywords),
    ...toArray(product.naver_keywords),
    ...toArray(product.tags),
    ...(body.functionalKeywords ?? []),
    ...(body.emotionalKeywords ?? []),
  ];

  // Attributes: body overrides win, then product-derived.
  const optScents = optionValues(product.product_options);
  const attrs: SeoSourceAttrs = {
    categoryCode: (product.naverCategoryCode as string | null) ?? null,
    scents: body.attrs?.scents ?? (optScents.length ? optScents : undefined),
    form: body.attrs?.form ?? null,
    volume: body.attrs?.volume ?? null,
    // origin is DB SoT — never a body override (the DB carries the corrected
    // country of manufacture after the Desktop originCode fix).
    origin: (product.naver_origin as string | null) ?? null,
    seller: body.attrs?.seller ?? null,
    use: body.attrs?.use ?? null,
    material: body.attrs?.material ?? (product.naver_material as string | null) ?? null,
    color: body.attrs?.color ?? (product.naver_color as string | null) ?? null,
  };

  const draft = generateSeoText({
    baseName: (product.naver_title as string) || (product.seoTitle as string) || (product.name as string) || '',
    brandLine,
    attrs,
    seedKeywords,
    brandToken: body.brandToken ?? null,
  });

  // Verify the candidate pool against the live tag dictionary, then select the
  // best MAX_TAGS: verified > weak > missing (error dropped). weak is substituted.
  const tagVerification = draft.tagCandidates.length ? await verifyTags(draft.tagCandidates) : null;
  let tags: string[];
  if (tagVerification && tagVerification.totalError < draft.tagCandidates.length) {
    tags = tagVerification.tags
      .map((t, i) => ({ ...t, ord: i }))
      .filter((t) => t.status !== 'error')
      .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.ord - b.ord)
      .slice(0, MAX_TAGS)
      .map((t) => t.tag);
  } else {
    // Tag-dictionary unavailable → best-effort: take the pool head.
    tags = draft.tagCandidates.slice(0, MAX_TAGS);
  }

  // Connect the final tags back into the draft so consumers reading draft.tags
  // get the verified selection (not null). This was the prior over-claim bug.
  draft.tags = tags;

  // Dry-run by default. confirm:true writes naver_title + tags (reversible).
  let applied = false;
  if (body.confirm === true) {
    try {
      await prisma.product.update({
        where: { id: productId },
        data: {
          naver_title: draft.productName,
          tags: tags as unknown as Prisma.InputJsonValue,
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
    tags,
    tagVerification,
    applied,           // false = dry-run preview (no DB write)
  });
}
