// /api/competitors/latest
// ============================================================================
// Sprint 6-C (Session E-2 Phase 4): latest CompetitorSnapshot per product
// for the dashboard CompetitorRadarWidget.
//
// Returns up to 50 rows, one per ACTIVE product (naverProductId IS NOT NULL),
// sorted by polledAt DESC then product name.
// ============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export interface CompetitorRow {
  productId: string;
  productNo: string;
  productName: string;
  searchKeyword: string;
  competitorCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  medianPrice: number | null;
  ourRank: number | null;
  ourPrice: number | null;
  errorNote: string | null;
  polledAt: string;
}

export async function GET() {
  // Latest snapshot per product. We hit it with a window function via raw SQL
  // for correctness across many polls.
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    product_id: string;
    product_no: string;
    product_name: string;
    search_keyword: string;
    competitor_count: number;
    min_price: number | null;
    max_price: number | null;
    median_price: number | null;
    our_rank: number | null;
    our_price: number | null;
    error_note: string | null;
    polled_at: Date;
  }>>`
    SELECT s.id, s.product_id, s.product_no, p.name AS product_name,
           s.search_keyword, s.competitor_count, s.min_price, s.max_price,
           s.median_price, s.our_rank, s.our_price, s.error_note, s.polled_at
    FROM (
      SELECT DISTINCT ON (product_id) *
      FROM competitor_snapshots
      ORDER BY product_id, polled_at DESC
    ) s
    JOIN "Product" p ON p.id = s.product_id
    WHERE p."naverProductId" IS NOT NULL
    ORDER BY s.polled_at DESC, p.name ASC
    LIMIT 50
  `;

  const data: CompetitorRow[] = rows.map((r) => ({
    productId: r.product_id,
    productNo: r.product_no,
    productName: r.product_name,
    searchKeyword: r.search_keyword,
    competitorCount: r.competitor_count,
    minPrice: r.min_price,
    maxPrice: r.max_price,
    medianPrice: r.median_price,
    ourRank: r.our_rank,
    ourPrice: r.our_price,
    errorNote: r.error_note,
    polledAt: r.polled_at.toISOString(),
  }));

  return NextResponse.json({ data });
}
