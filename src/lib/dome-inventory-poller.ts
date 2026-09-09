// src/lib/dome-inventory-poller.ts
// ============================================================================
// Sprint 6-A: Inventory Polling (Option C - Hybrid Dynamic Threshold)
// ============================================================================
//
// Public API:
//   - pollAppRegisteredInventory(): one-shot poll for cron entrypoint
//   - pollSingleProduct(productNo): one-shot poll for a single just-connected
//     product (see supplier-code route) — same snapshot/alert/profile logic,
//     skips competitor tracking (separate concern, extra API quota)
//
// Logic flow per cron invocation (every 6 hours):
//   1. Fetch all products with supplier_product_code (= dome productNo mapped)
//      Split into ACTIVE (naverProductId IS NOT NULL) and DRAFT
//   2. Chunk productNos into 100-batch groups; call adapter.getInventory() per chunk
//   3. Persist InventorySnapshot rows for every product (incl. DRAFT)
//   4. For ACTIVE only: re-evaluate dynamic thresholds and emit LowStockAlerts
//   5. Update SupplierStockProfile (7-day rolling avg depletion)
//   6. For new RED-level alerts, fire Discord stock-alerts channel
//
// Dynamic threshold (Option C):
//   D = avgDailyDepletion (7-day rolling)
//     yellow  = qty < D * 7  (1 week safety stock)
//     orange  = qty < D * 3
//     red     = qty < D * 1   OR  status != 판매중
//
// Cold start (sample_count < 7):
//   Use fallback fixed thresholds:
//     yellow = 100, orange = 30, red = 10 (or status != 판매중)
//
// Untrustworthy supplier detection:
//   - 7+ consecutive snapshots with zero qty change AND qty > 0
//   - Marked is_trustworthy = false
//   - Forced reminder alert every 30 days
// ============================================================================

import { prisma } from '@/lib/prisma';
import { getAdapter } from '@/lib/sources';
import { sendDiscord } from '@/lib/discord';
import { evaluatePriceMovement } from '@/lib/dome-price-analyzer';
import { evaluateCompetitor } from '@/lib/dome-competitor-tracker';
import type { SourceAdapter, InventorySnapshot as AdapterSnapshot } from '@/lib/sources';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const CHUNK_SIZE = 100; // domeggook getItemView multiple=true cap
const STATUS_ACTIVE = '\uD310\uB9E4\uC911'; // 판매중
const FALLBACK_YELLOW = 100;
const FALLBACK_ORANGE = 30;
const FALLBACK_RED = 10;
const MIN_SAMPLE_COUNT = 7; // need 7 days of data for dynamic threshold
const ROLLING_DAYS = 7;
const UNTRUSTWORTHY_NO_CHANGE_DAYS = 7;
const UNTRUSTWORTHY_REMINDER_INTERVAL_DAYS = 30;

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

type AlertLevel = 'yellow' | 'orange' | 'red';

interface PollResult {
  totalProducts: number;
  activeCount: number;
  draftCount: number;
  snapshotsSaved: number;
  newAlerts: { yellow: number; orange: number; red: number };
  resolvedAlerts: number;
  untrustworthyReminders: number;
  // Sprint 6-B: price movement alerts produced this run
  newPriceAlerts: { yellow: number; orange: number; red: number };
  resolvedPriceAlerts: number;
  // Sprint 6-C: competitor snapshots captured this run
  competitorSnapshotsSaved: number;
  competitorErrors: number;
  errors: string[];
  durationMs: number;
}

interface ProductMeta {
  id: string;
  productNo: string;
  name: string;
  supplierId: string;
  isDraft: boolean; // true = DRAFT (alert disabled), false = ACTIVE
  // MULTI_PLATFORM_SUPPLIER_CODE_2026-09-09 — which sourcing platform
  // productNo belongs to (platforms.code). NULL/legacy rows default to DMM
  // for backward compat (pre-migration rows never had a second platform).
  platformCode: string;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Run one full polling cycle for all app-registered products with dome productNo.
 * Idempotent: safe to call multiple times. Each call adds new snapshot rows.
 * Returns aggregated metrics for cron logging.
 */
export async function pollAppRegisteredInventory(): Promise<PollResult> {
  const startedAt = Date.now();
  const result: PollResult = {
    totalProducts: 0,
    activeCount: 0,
    draftCount: 0,
    snapshotsSaved: 0,
    newAlerts: { yellow: 0, orange: 0, red: 0 },
    resolvedAlerts: 0,
    untrustworthyReminders: 0,
    newPriceAlerts: { yellow: 0, orange: 0, red: 0 },
    resolvedPriceAlerts: 0,
    competitorSnapshotsSaved: 0,
    competitorErrors: 0,
    errors: [],
    durationMs: 0,
  };

  // Step 1: Load products to poll
  const products = await loadProductsToPoll();
  result.totalProducts = products.length;
  result.activeCount = products.filter((p) => !p.isDraft).length;
  result.draftCount = products.filter((p) => p.isDraft).length;

  if (products.length === 0) {
    result.durationMs = Date.now() - startedAt;
    return result;
  }

  // Step 2-3: MULTI_PLATFORM_SUPPLIER_CODE_2026-09-09 — group products by
  // their sourcing platform (DMM/OWC/...) and poll each group through its
  // own adapter. Previously hard-coded to getAdapter('DMM'), which silently
  // skipped every non-Domeggook product (e.g. OwnerClan-sourced items never
  // got polled at all, with no error surfaced). Any platform whose adapter
  // is a stub (throws NotImplemented) degrades to per-product error
  // snapshots for that group only — other platforms keep polling normally.
  const byPlatform = new Map<string, ProductMeta[]>();
  for (const p of products) {
    const arr = byPlatform.get(p.platformCode) ?? [];
    arr.push(p);
    byPlatform.set(p.platformCode, arr);
  }

  const allSnapshots: AdapterSnapshot[] = [];

  for (const [platformCode, group] of byPlatform) {
    const adapter = getAdapter(platformCode);
    if (!adapter) {
      result.errors.push(`${platformCode} adapter not registered`);
      for (const p of group) {
        allSnapshots.push({ productNo: p.productNo, qty: -1, status: 'error', supplierPrice: null, polledAt: new Date() });
      }
      continue;
    }

    const productNos = group.map((p) => p.productNo);
    const chunks = chunkArray(productNos, CHUNK_SIZE);

    for (const chunk of chunks) {
      try {
        const snapshots = await adapter.getInventory(chunk);
        allSnapshots.push(...snapshots);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`[${platformCode}] Chunk poll failed: ${msg}`);
        // Push placeholder snapshots so we don't lose track
        for (const no of chunk) {
          allSnapshots.push({
            productNo: no,
            qty: -1,
            status: 'error',
            supplierPrice: null,
            polledAt: new Date(),
          });
        }
      }
    }
  }

  // Step 4: Persist snapshots
  const productByNo = new Map(products.map((p) => [p.productNo, p]));
  const snapshotRows = allSnapshots
    .filter((s) => productByNo.has(s.productNo))
    .map((s) => {
      const meta = productByNo.get(s.productNo)!;
      return {
        productId: meta.id,
        productNo: s.productNo,
        qty: s.qty,
        status: s.status ?? 'unknown',
        minq: 1, // multiple=true does not always include minq; refined by separate detail call
        supplierPrice: s.supplierPrice ?? null, // Sprint 6-B: captured on same poll
        isDraft: meta.isDraft,
        polledAt: s.polledAt,
      };
    });

  if (snapshotRows.length > 0) {
    await prisma.inventorySnapshot.createMany({ data: snapshotRows });
    result.snapshotsSaved = snapshotRows.length;
  }

  // Step 5: Process alerts (ACTIVE only)
  const activeSnapshots = allSnapshots.filter((s) => {
    const meta = productByNo.get(s.productNo);
    return meta && !meta.isDraft;
  });

  for (const snap of activeSnapshots) {
    const meta = productByNo.get(snap.productNo)!;
    try {
      const evaluation = await evaluateAlert(meta, snap);
      if (evaluation.newAlert) {
        result.newAlerts[evaluation.newAlert.level] += 1;
        if (evaluation.newAlert.level === 'red' || evaluation.newAlert.level === 'orange') {
          await fireDiscordAlert(meta, snap, evaluation.newAlert.level, evaluation.newAlert.threshold);
        }
      }
      if (evaluation.resolvedCount > 0) {
        result.resolvedAlerts += evaluation.resolvedCount;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Alert eval failed for ${snap.productNo}: ${msg}`);
    }

    // Sprint 6-B: price movement analysis on the same snapshot
    try {
      const priceEval = await evaluatePriceMovement(meta, snap);
      if (priceEval.newAlert) {
        result.newPriceAlerts[priceEval.newAlert.level] += 1;
      }
      result.resolvedPriceAlerts += priceEval.resolvedCount;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Price eval failed for ${snap.productNo}: ${msg}`);
    }

    // Sprint 6-C: competitor tracking on the same product (single search call).
    // Uses adapter.searchItems internally — separate API quota from getItemView.
    // MULTI_PLATFORM_SUPPLIER_CODE_2026-09-09 — adapter must match this
    // product's own platform (meta.platformCode), not a single outer-scope
    // adapter left over from the old DMM-only loop.
    try {
      const competitorAdapter = getAdapter(meta.platformCode);
      if (competitorAdapter) {
        const compEval = await evaluateCompetitor(competitorAdapter, meta, snap.supplierPrice ?? null);
        if (compEval.snapshotSaved) {
          result.competitorSnapshotsSaved += 1;
          if (compEval.error) result.competitorErrors += 1;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Competitor eval failed for ${snap.productNo}: ${msg}`);
      result.competitorErrors += 1;
    }
  }

  // Step 6: Update SupplierStockProfile (rolling 7-day) for ALL products (incl DRAFT)
  for (const meta of products) {
    try {
      const reminderFired = await updateStockProfile(meta);
      if (reminderFired) result.untrustworthyReminders += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Profile update failed for ${meta.productNo}: ${msg}`);
    }
  }

  result.durationMs = Date.now() - startedAt;
  return result;
}

/**
 * Poll one product immediately (single getInventory call), bypassing the
 * cron's 6-hour cadence. Used right after a supplier code is connected
 * (manual or auto-match) so the operator sees a real snapshot instead of
 * waiting up to 24h for the next cron run (#62, #363).
 * Returns the fetched snapshot, or null if the product/adapter/snapshot
 * couldn't be resolved (caller treats this as best-effort).
 */
export async function pollSingleProduct(
  productNo: string,
): Promise<{ qty: number; status: string } | null> {
  const product = await prisma.product.findFirst({
    where: { supplier_product_code: productNo },
    select: { id: true, name: true, supplierId: true, naverProductId: true, supplier_platform_code: true },
  });
  if (!product) return null;

  const platformCode = product.supplier_platform_code ?? 'DMM';
  const meta: ProductMeta = {
    id: product.id,
    productNo,
    name: product.name,
    supplierId: product.supplierId,
    isDraft: !product.naverProductId,
    platformCode,
  };

  // MULTI_PLATFORM_SUPPLIER_CODE_2026-09-09 — resolve the adapter that
  // actually matches this product's platform, not a hard-coded DMM. A
  // registered-but-stub adapter (e.g. OwnerClan pre-API-key) throws
  // NotImplemented, which we surface honestly rather than silently
  // returning null as if nothing happened.
  const adapter = getAdapter(platformCode);
  if (!adapter) return null;

  const snapshots = await adapter.getInventory([productNo]);
  const snap = snapshots.find((s) => s.productNo === productNo);
  if (!snap) return null;

  await prisma.inventorySnapshot.create({
    data: {
      productId: meta.id,
      productNo: snap.productNo,
      qty: snap.qty,
      status: snap.status ?? 'unknown',
      minq: 1,
      supplierPrice: snap.supplierPrice ?? null,
      isDraft: meta.isDraft,
      polledAt: snap.polledAt,
    },
  });

  if (!meta.isDraft) {
    await evaluateAlert(meta, snap);
    await evaluatePriceMovement(meta, snap);
  }
  await updateStockProfile(meta);

  return { qty: snap.qty, status: snap.status ?? 'unknown' };
}

// ----------------------------------------------------------------------------
// Internal helpers
// ----------------------------------------------------------------------------

/**
 * Load products that have supplier_product_code set (= dome productNo mapped).
 * Returns both DRAFT and ACTIVE; caller distinguishes via isDraft flag.
 */
async function loadProductsToPoll(): Promise<ProductMeta[]> {
  const rows = await prisma.product.findMany({
    where: {
      supplier_product_code: { not: null },
    },
    select: {
      id: true,
      name: true,
      supplierId: true,
      naverProductId: true,
      supplier_product_code: true,
      supplier_platform_code: true,
    },
  });

  return rows
    .filter((r) => r.supplier_product_code && r.supplier_product_code.length > 0)
    .map((r) => ({
      id: r.id,
      productNo: r.supplier_product_code as string,
      name: r.name,
      supplierId: r.supplierId,
      isDraft: !r.naverProductId,
      // Legacy rows (pre supplier_platform_code migration) default to DMM —
      // every code stored before 2026-09-09 came from the Domeggook crawl flow.
      platformCode: r.supplier_platform_code ?? 'DMM',
    }));
}

/**
 * Split an array into chunks of size N.
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * Determine threshold for a product. Returns null when stock is safe.
 * Uses dynamic threshold when sample_count >= MIN_SAMPLE_COUNT, else fallback.
 */
async function determineLevel(
  productNo: string,
  qty: number,
  status: string,
): Promise<{ level: AlertLevel; threshold: number; reason: string } | null> {
  // status-based critical: any non-active status = red
  if (status && status !== STATUS_ACTIVE && status !== 'unknown') {
    return { level: 'red', threshold: 0, reason: `status=${status}` };
  }

  // qty -1 = unknown / fetch failed; do not raise alert
  if (qty < 0) return null;

  // Look up profile
  const profile = await prisma.supplierStockProfile.findUnique({
    where: { productNo },
  });

  let yellowT: number;
  let orangeT: number;
  let redT: number;

  if (profile && profile.sampleCount >= MIN_SAMPLE_COUNT && profile.avgDailyDepletion > 0) {
    // Dynamic threshold from learned profile
    const d = profile.avgDailyDepletion;
    yellowT = Math.ceil(d * 7);
    orangeT = Math.ceil(d * 3);
    redT = Math.ceil(d * 1);
  } else {
    // Cold start fallback
    yellowT = FALLBACK_YELLOW;
    orangeT = FALLBACK_ORANGE;
    redT = FALLBACK_RED;
  }

  if (qty < redT) return { level: 'red', threshold: redT, reason: `qty<${redT}` };
  if (qty < orangeT) return { level: 'orange', threshold: orangeT, reason: `qty<${orangeT}` };
  if (qty < yellowT) return { level: 'yellow', threshold: yellowT, reason: `qty<${yellowT}` };
  return null;
}

/**
 * Evaluate alert state for one product. Creates new alert if level escalated,
 * resolves existing alerts if stock recovered.
 */
async function evaluateAlert(
  meta: ProductMeta,
  snap: AdapterSnapshot,
): Promise<{
  newAlert: { level: AlertLevel; threshold: number } | null;
  resolvedCount: number;
}> {
  const evaluated = await determineLevel(snap.productNo, snap.qty, snap.status ?? 'unknown');

  // Find latest unresolved alert
  const openAlert = await prisma.lowStockAlert.findFirst({
    where: { productId: meta.id, resolvedAt: null },
    orderBy: { triggeredAt: 'desc' },
  });

  if (!evaluated) {
    // Stock is safe. Resolve any open alerts.
    if (openAlert) {
      await prisma.lowStockAlert.updateMany({
        where: { productId: meta.id, resolvedAt: null },
        data: {
          resolvedAt: new Date(),
          resolutionNote: `auto-resolved (qty=${snap.qty}, status=${snap.status})`,
        },
      });
      return { newAlert: null, resolvedCount: 1 };
    }
    return { newAlert: null, resolvedCount: 0 };
  }

  // There IS a level concern.
  if (openAlert && openAlert.level === evaluated.level) {
    // Same level already open — no new alert (avoid spam).
    return { newAlert: null, resolvedCount: 0 };
  }

  // New level OR escalation. Resolve old, create new.
  if (openAlert) {
    await prisma.lowStockAlert.update({
      where: { id: openAlert.id },
      data: {
        resolvedAt: new Date(),
        resolutionNote: `superseded by ${evaluated.level}`,
      },
    });
  }

  await prisma.lowStockAlert.create({
    data: {
      productId: meta.id,
      level: evaluated.level,
      threshold: evaluated.threshold,
      currentQty: snap.qty,
      statusReason: evaluated.reason.slice(0, 100),
    },
  });

  return {
    newAlert: { level: evaluated.level, threshold: evaluated.threshold },
    resolvedCount: openAlert ? 1 : 0,
  };
}

/**
 * Recompute SupplierStockProfile from last ROLLING_DAYS of snapshots.
 * Returns true when an untrustworthy reminder was fired this call.
 */
async function updateStockProfile(meta: ProductMeta): Promise<boolean> {
  const cutoff = new Date(Date.now() - ROLLING_DAYS * 24 * 60 * 60 * 1000);

  const snapshots = await prisma.inventorySnapshot.findMany({
    where: {
      productId: meta.id,
      polledAt: { gte: cutoff },
    },
    orderBy: { polledAt: 'asc' },
    select: { qty: true, polledAt: true },
  });

  // Need at least 2 points to compute change
  if (snapshots.length < 2) {
    await prisma.supplierStockProfile.upsert({
      where: { productNo: meta.productNo },
      create: {
        productNo: meta.productNo,
        supplierId: meta.supplierId,
        avgDailyDepletion: 0,
        sampleCount: snapshots.length,
        isTrustworthy: true,
      },
      update: {
        sampleCount: snapshots.length,
        computedAt: new Date(),
      },
    });
    return false;
  }

  // Compute total qty drop over the window (only count decreases)
  let totalDepletion = 0;
  let noChangeCount = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1].qty;
    const curr = snapshots[i].qty;
    if (prev < 0 || curr < 0) continue; // skip unknown
    const diff = prev - curr;
    if (diff > 0) totalDepletion += diff;
    if (diff === 0 && prev > 0) noChangeCount += 1;
  }

  const firstAt = snapshots[0].polledAt.getTime();
  const lastAt = snapshots[snapshots.length - 1].polledAt.getTime();
  const elapsedDays = Math.max(1, (lastAt - firstAt) / (24 * 60 * 60 * 1000));
  const avgDailyDepletion = totalDepletion / elapsedDays;

  // Untrustworthy detection: all snapshots had zero change AND qty > 0
  const isStale = noChangeCount === snapshots.length - 1 && snapshots[0].qty > 0;
  const isTrustworthy = !isStale;

  const existing = await prisma.supplierStockProfile.findUnique({
    where: { productNo: meta.productNo },
  });

  let lastNoChangeDays = isStale ? (existing?.lastNoChangeDays ?? 0) + 1 : 0;
  let firedReminder = false;

  // Untrustworthy reminder every UNTRUSTWORTHY_REMINDER_INTERVAL_DAYS
  if (isStale && lastNoChangeDays >= UNTRUSTWORTHY_REMINDER_INTERVAL_DAYS) {
    await sendDiscord('STOCK_ALERT', '', [
      {
        title: '\uC7AC\uACE0 \uBBF8\uC2E0\uB8B0 \uACF5\uAE09\uC0AC \uC54C\uB9BC', // 재고 미신뢰 공급사 알림
        description:
          `\`${meta.productNo}\` (${meta.name.slice(0, 40)})\n` +
          `30\uC77C\uAC04 \uC7AC\uACE0 \uBCC0\uB3D9 \uC5C6\uC74C \u2014 \uACF5\uAE09\uC0AC \uC9C1\uC811 \uD655\uC778 \uAD8C\uC7A5`,
        color: 0xFFA500,
      },
    ]);
    lastNoChangeDays = 0; // reset counter after firing
    firedReminder = true;
  }

  await prisma.supplierStockProfile.upsert({
    where: { productNo: meta.productNo },
    create: {
      productNo: meta.productNo,
      supplierId: meta.supplierId,
      avgDailyDepletion,
      sampleCount: snapshots.length,
      isTrustworthy,
      lastNoChangeDays,
    },
    update: {
      supplierId: meta.supplierId,
      avgDailyDepletion,
      sampleCount: snapshots.length,
      isTrustworthy,
      lastNoChangeDays,
      computedAt: new Date(),
    },
  });

  return firedReminder;
}

/**
 * Fire Discord stock-alerts channel for orange/red level alert.
 * Yellow level stays in dashboard widget only (no Discord spam).
 */
async function fireDiscordAlert(
  meta: ProductMeta,
  snap: AdapterSnapshot,
  level: AlertLevel,
  threshold: number,
): Promise<void> {
  const colorByLevel: Record<AlertLevel, number> = {
    yellow: 0xFFD700,
    orange: 0xFFA500,
    red: 0xFF0000,
  };

  // Reuse Korean string dictionary pattern: build embed inline (Sprint 6-Pre 3 builder pattern)
  // sendDiscord signature: (channel, content, embeds?)
  await sendDiscord('STOCK_ALERT', '', [
    {
      title:
        level === 'red'
          ? '\uAE34\uAE09 \uC7AC\uACE0 \uACBD\uACE0' // 긴급 재고 경고
          : '\uC7AC\uACE0 \uACBD\uACE0', // 재고 경고
      description:
        `\`${meta.productNo}\` (${meta.name.slice(0, 40)})\n` +
        `\uD604\uC7AC \uC7AC\uACE0: ${snap.qty} | \uC784\uACC4\uAC12: ${threshold} | \uC0C1\uD0DC: ${snap.status}`, // 현재 재고 / 임계값 / 상태
      color: colorByLevel[level],
      timestamp: new Date().toISOString(),
    },
  ]);
}
