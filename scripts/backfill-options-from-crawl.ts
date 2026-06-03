// scripts/backfill-options-from-crawl.ts
//
// One-shot recovery for products promoted BEFORE the crawl→Product option
// mapping fix (HANDOFF_crawl_option_mapping_fix_2026-06-03.md). The options are
// still alive in crawl_logs.options, so no re-crawl is needed.
//
// For every crawl_log that (a) has a non-empty options array and (b) is linked
// to a Product (productId) whose hasOptions=false AND has no product_options
// row, it backfills BOTH stores using the SAME mapper as the live promotion
// path — Product columns (gate) + product_options row (register payload).
//
// SAFETY:
//   - DRY-RUN by default. Pass --apply to write.
//   - Skips any product that already has a product_options row OR hasOptions=true
//     → the manually-fixed 명화 디퓨저 (cmpnooli40001f0gveaxr8iim) is never
//     double-inserted (HANDOFF §3).
//   - This script MUTATES production data. Per the two-environment protocol
//     (작업원칙 #41), Code does NOT run prod mutations — Desktop runs this with
//     --apply after reviewing the dry-run output.
//
// USAGE (run with tsx so the shared TS mapper + tsconfig paths resolve):
//   npx tsx scripts/backfill-options-from-crawl.ts            # dry-run (default)
//   npx tsx scripts/backfill-options-from-crawl.ts --apply    # write changes
//   npx tsx scripts/backfill-options-from-crawl.ts --limit 50 # cap scan count

import fs from 'fs';
import path from 'path';

// ── Load DATABASE_URL / DIRECT_URL from .env.local (same pattern as other scripts) ──
function loadEnvLocal(): void {
  const raw = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) {
      const val = m[2].replace(/^["']|["']$/g, '').replace(/\\\$/g, '$');
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
}
loadEnvLocal();

import { PrismaClient } from '@prisma/client';
import { mapCrawlOptions } from '../src/lib/sources/crawl-option-mapper';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) || 0 : 0;

async function main(): Promise<void> {
  console.log(`[backfill-options] mode=${APPLY ? 'APPLY (writes)' : 'DRY-RUN'}${LIMIT ? ` limit=${LIMIT}` : ''}`);

  // crawl_logs linked to a product. options-emptiness is checked in JS because
  // jsonb array-length filtering differs across providers.
  const logs = await prisma.crawlLog.findMany({
    where: { productId: { not: null } },
    orderBy: { crawledAt: 'desc' },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  const stats = {
    scanned: 0, fixed: 0, skippedNoOptions: 0,
    skippedAlready: 0, unmatched: 0,
  };

  for (const log of logs) {
    stats.scanned++;
    const mapped = mapCrawlOptions(log.options);
    if (!mapped) { stats.skippedNoOptions++; continue; }

    const product = await prisma.product.findUnique({
      where: { id: log.productId as string },
      select: { id: true, name: true, hasOptions: true, product_options: { select: { id: true } } },
    });

    if (!product) {
      stats.unmatched++;
      console.log(`  UNMATCHED  crawlLog=${log.id} → productId=${log.productId} (product not found)`);
      continue;
    }

    // Dedup: never touch a product that already carries options (protects the
    // manually-fixed 명화 디퓨저 and any already-backfilled product).
    if (product.hasOptions === true || product.product_options) {
      stats.skippedAlready++;
      continue;
    }

    const valueCount = mapped.productFields.optionValues.length;
    if (!APPLY) {
      console.log(`  WOULD-FIX  ${product.id} "${product.name}" — ${valueCount} options (axis="${mapped.productFields.optionName}")`);
      stats.fixed++;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: mapped.productFields,
      });
      // upsert keeps the run idempotent even if a row appears mid-run.
      await tx.product_options.upsert({
        where: { product_id: product.id },
        update: {
          option_type:  mapped.productOptions.option_type,
          option_names: mapped.productOptions.option_names,
          option_rows:  mapped.productOptions.option_rows,
        },
        create: {
          product_id:   product.id,
          option_type:  mapped.productOptions.option_type,
          option_names: mapped.productOptions.option_names,
          option_rows:  mapped.productOptions.option_rows,
        },
      });
    });
    console.log(`  FIXED      ${product.id} "${product.name}" — ${valueCount} options`);
    stats.fixed++;
  }

  console.log('[backfill-options] summary:', JSON.stringify(stats));
  if (!APPLY && stats.fixed > 0) {
    console.log('[backfill-options] dry-run only — re-run with --apply to write the above.');
  }
}

main()
  .catch((e) => { console.error('[backfill-options] ERROR', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
