// /api/products/pareto
// ============================================================================
// Sprint 7 P0-C (Session E-2 Sprint 7): top-revenue products (Pareto slice).
// Pure compute from orderItem + product. Powers:
//   - TopProductsCard (Section 3 정원 건강)
//   - InboxParetoRow (Section 2 Inbox 4th placeholder replacement)
// ============================================================================

import { NextResponse } from 'next/server';
import { computePareto } from '@/lib/pareto-analyzer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const summary = await computePareto();
  return NextResponse.json(summary);
}
