// /api/suppliers/scores
// ============================================================================
// Sprint 6-C.2 (Session E-2 Phase 4): aggregated per-supplier scores for the
// dashboard SupplierGardenWidget (Section 4 잠재력).
//
// Pure compute — no new tables. Calls supplier-score-aggregator which reads
// Supplier + SupplierStockProfile + PriceMovementAlert in one round trip.
// ============================================================================

import { NextResponse } from 'next/server';
import { computeSupplierScores } from '@/lib/supplier-score-aggregator';

export const dynamic = 'force-dynamic';

export async function GET() {
  const scores = await computeSupplierScores();
  return NextResponse.json({ data: scores });
}
