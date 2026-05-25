// src/lib/metrics/metrics-collector.ts
//
// Sprint 7-M2 5-B — CVR-only metrics collector for art_director_prompts.
//
// Spec: docs/plan/HANDOFF_CTR_CVR_PIPELINE.md §2-2 (CVR-only path).
//
// What this does
//   1. Find prompts that have been used on a real, registered product
//      (result_image_url set, seller_used=true, product_id set, deprecated=false).
//   2. Look up each product's naverProductId.
//   3. Pull the last N days of orders from Naver Commerce
//      (reuses getOrders from src/lib/naver/api-client.ts).
//   4. Bucket order count and revenue by productId.
//   5. Write the result into art_director_prompts.business_metrics JSON.
//      CTR / clicks / impressions stay null — Naver Commerce does not
//      expose per-listing impression or click counts, so we set
//      dataSource = 'naver-commerce-api' and leave the CTR fields null
//      (HANDOFF_CTR_CVR_PIPELINE.md §1 honesty rule).
//
// Order-shape discovery
//   The exact JSON path to productId inside an order changes by Naver API
//   version. We try a small set of known candidate paths per order and log
//   which one matched on the first run (logSample=true). The path priority
//   order matches the public docs (2026-05).

import { prisma } from '@/lib/prisma';
import { getOrders } from '@/lib/naver/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CollectOptions {
  /** Window length in days. Defaults to 30. */
  windowDays?: number;
  /** When true, skip the DB write phase. */
  dryRun?: boolean;
  /** When true, console.log the first order's raw JSON for field-path
   *  discovery. Use on the first real run, then leave off. */
  logSample?: boolean;
}

export interface PromptMetricsRow {
  promptId: string;
  productId: string;
  naverProductId: string;
  orders30d: number;
  revenue30d: number;
}

export interface CollectResult {
  promptsConsidered: number;
  promptsUpdated: number;
  ordersScanned: number;
  productIdFieldPath: string | null;
  byPrompt: PromptMetricsRow[];
  notes: string[];
  windowStart: string;
  windowEnd: string;
}

// ---------------------------------------------------------------------------
// Order shape helpers
// ---------------------------------------------------------------------------

// Candidate JSON paths to the per-order productId, ordered by docs likelihood.
const PRODUCT_ID_PATHS: ReadonlyArray<(o: any) => string | undefined> = [
  (o) => o?.productOrder?.productId,
  (o) => o?.productOrder?.originProductNo,
  (o) => o?.productId,
  (o) => o?.originProductNo,
  (o) => o?.product?.productNo,
];

// Revenue field candidates, in order of preference.
const REVENUE_PATHS: ReadonlyArray<(o: any) => number | undefined> = [
  (o) => num(o?.productOrder?.totalPaymentAmount),
  (o) => num(o?.totalPaymentAmount),
  (o) => num(o?.productOrder?.paymentAmount),
  (o) => num(o?.paymentAmount),
];

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function pickProductId(order: any): { id?: string; path?: string } {
  for (let i = 0; i < PRODUCT_ID_PATHS.length; i += 1) {
    const v = PRODUCT_ID_PATHS[i](order);
    if (v != null && String(v).length > 0) {
      return { id: String(v), path: pathLabel(i) };
    }
  }
  return {};
}

function pickRevenue(order: any): number {
  for (const fn of REVENUE_PATHS) {
    const v = fn(order);
    if (typeof v === 'number') return v;
  }
  return 0;
}

function pathLabel(i: number): string {
  return [
    'productOrder.productId',
    'productOrder.originProductNo',
    'productId',
    'originProductNo',
    'product.productNo',
  ][i];
}

// ---------------------------------------------------------------------------
// KST window helpers
// ---------------------------------------------------------------------------

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function kstIso(d: Date): string {
  // Match the format consumed by api-client.ts getOrders / getTodayOrderSummary.
  return new Date(d.getTime()).toISOString().replace('Z', '+09:00');
}

function buildWindow(days: number): { from: Date; to: Date } {
  const now = new Date();
  const to = now;
  const from = new Date(now.getTime() - days * 86_400_000);
  return { from, to };
}

// ---------------------------------------------------------------------------
// Naver order paging
// ---------------------------------------------------------------------------

interface ScanResult {
  orders: any[];
  productIdFieldPath: string | null;
  notes: string[];
}

async function scanOrders(
  from: Date,
  to: Date,
  logSample: boolean,
): Promise<ScanResult> {
  const notes: string[] = [];
  const orders: any[] = [];
  let productIdFieldPath: string | null = null;

  const pageSize = 300;
  let pageNum = 1;
  let safetyCap = 50; // hard ceiling: 50 pages = 15k orders/run

  try {
    while (safetyCap > 0) {
      safetyCap -= 1;
      const resp: any = await getOrders({
        lastChangedFrom: kstIso(from),
        lastChangedTo: kstIso(to),
        pageNum,
        pageSize,
      });
      // Mirror getTodayOrderSummary's tolerant parse.
      const inner = resp?.data ?? {};
      const batch: any[] =
        inner?.contents ??
        inner?.data ??
        resp?.content ??
        resp?.productOrders ??
        [];
      if (batch.length === 0) break;

      if (productIdFieldPath === null && batch[0]) {
        const { path } = pickProductId(batch[0]);
        if (path) productIdFieldPath = path;
        if (logSample) {
          // First-run discovery dump. Caller flips logSample off after this.
          // eslint-disable-next-line no-console
          console.log(
            '[metrics-collector] first order sample',
            JSON.stringify(batch[0], null, 2),
          );
        }
      }

      orders.push(...batch);
      if (batch.length < pageSize) break;
      pageNum += 1;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    notes.push(`naver order scan failed: ${msg}`);
  }

  return { orders, productIdFieldPath, notes };
}

// ---------------------------------------------------------------------------
// business_metrics shape — kept aligned with HANDOFF §2-3.
// ---------------------------------------------------------------------------

interface BusinessMetricsCvrOnly {
  listingId: string;
  impressions30d: null;
  clicks30d: null;
  ctr30d: null;
  orders30d: number;
  revenueAttribution30d: number;
  conversionRate30d: null;
  dataSource: 'naver-commerce-api';
  windowStart: string;
  windowEnd: string;
}

function buildMetricsPayload(args: {
  naverProductId: string;
  orders30d: number;
  revenue30d: number;
  windowStart: string;
  windowEnd: string;
}): BusinessMetricsCvrOnly {
  return {
    listingId: args.naverProductId,
    impressions30d: null,
    clicks30d: null,
    ctr30d: null,
    orders30d: args.orders30d,
    revenueAttribution30d: args.revenue30d,
    conversionRate30d: null,
    dataSource: 'naver-commerce-api',
    windowStart: args.windowStart,
    windowEnd: args.windowEnd,
  };
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function collectMetricsForActivePrompts(
  opts: CollectOptions = {},
): Promise<CollectResult> {
  const windowDays = opts.windowDays ?? 30;
  const dryRun = opts.dryRun ?? false;
  const logSample = opts.logSample ?? false;
  const notes: string[] = [];

  // 1. Active prompts: used on a real product, not deprecated, has image.
  const prompts = await prisma.artDirectorPrompt.findMany({
    where: {
      sellerUsed: true,
      productId: { not: null },
      resultImageUrl: { not: null },
      deprecated: false,
    },
    select: { id: true, productId: true },
  });

  if (prompts.length === 0) {
    const { from, to } = buildWindow(windowDays);
    return {
      promptsConsidered: 0,
      promptsUpdated: 0,
      ordersScanned: 0,
      productIdFieldPath: null,
      byPrompt: [],
      notes: ['no active prompts to collect for'],
      windowStart: from.toISOString(),
      windowEnd: to.toISOString(),
    };
  }

  // 2. Resolve naverProductId for each prompt.productId.
  const productIds = [
    ...new Set(prompts.map((p) => p.productId).filter((id): id is string => !!id)),
  ];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, naverProductId: true },
  });
  const naverByProductId = new Map<string, string>();
  for (const prod of products) {
    if (prod.naverProductId) naverByProductId.set(prod.id, prod.naverProductId);
  }

  // 3. Pull orders for the window.
  const { from, to } = buildWindow(windowDays);
  const windowStart = from.toISOString();
  const windowEnd = to.toISOString();
  const scan = await scanOrders(from, to, logSample);
  notes.push(...scan.notes);

  // 4. Aggregate orders by naverProductId.
  const ordersByListing = new Map<string, { count: number; revenue: number }>();
  for (const order of scan.orders) {
    const { id } = pickProductId(order);
    if (!id) continue;
    const slot = ordersByListing.get(id) ?? { count: 0, revenue: 0 };
    slot.count += 1;
    slot.revenue += pickRevenue(order);
    ordersByListing.set(id, slot);
  }

  // 5. Build per-prompt rows + persist.
  const byPrompt: PromptMetricsRow[] = [];
  let updatedCount = 0;
  const refreshedAt = new Date();

  for (const prompt of prompts) {
    if (!prompt.productId) continue;
    const naverProductId = naverByProductId.get(prompt.productId);
    if (!naverProductId) continue;
    const agg = ordersByListing.get(naverProductId) ?? { count: 0, revenue: 0 };

    const row: PromptMetricsRow = {
      promptId: prompt.id,
      productId: prompt.productId,
      naverProductId,
      orders30d: agg.count,
      revenue30d: agg.revenue,
    };
    byPrompt.push(row);

    if (!dryRun) {
      await prisma.artDirectorPrompt.update({
        where: { id: prompt.id },
        data: {
          businessMetrics: buildMetricsPayload({
            naverProductId,
            orders30d: agg.count,
            revenue30d: agg.revenue,
            windowStart,
            windowEnd,
          }) as unknown as object,
          metricsRefreshedAt: refreshedAt,
        },
      });
      updatedCount += 1;
    }
  }

  if (scan.productIdFieldPath === null && scan.orders.length > 0) {
    notes.push(
      'productId field path unresolved — all known candidates returned undefined. ' +
        'Re-run with logSample=true to dump order structure.',
    );
  }

  return {
    promptsConsidered: prompts.length,
    promptsUpdated: updatedCount,
    ordersScanned: scan.orders.length,
    productIdFieldPath: scan.productIdFieldPath,
    byPrompt,
    notes,
    windowStart,
    windowEnd,
  };
}
