// scripts/cleanup-stray-hero-detail.ts
// C15 one-off: reversibly archive a confirmed STRAY firefly_auto asset
//   cmqmbemz600002fp2tiraeu6w -> cmpnooli40001f0gveaxr8iim/detail/hero-1781957364462.png
//   (slot=hero @ stage=detail mismatch, 640x640, 2570B, source_tag=firefly_auto).
// #79 precheck (exhaustive ::text scan of Product/LifestyleAsset/published_assets/
//   asset_references/asset_jobs/art_director_prompts/prompt_library_entry/generation/
//   slot_generation/daily_recommendations/backdrop_jobs) returned 0 refs -> unreferenced.
// Reversible per C23 spirit: storage MOVE to {pid}/archive/ (nothing deleted) + registry
//   stage detail->archive. Re-runnable / idempotent. NON-naver local asset (#46 GO not
//   required); the storage physical mutation is Code service-role SDK (C15: MCP cannot
//   mutate physical storage).
//
// Run: npx tsx --env-file=.env.local scripts/cleanup-stray-hero-detail.ts [--go]
import { prisma } from '../src/lib/prisma';
import { moveAutomationAsset } from '../src/lib/storage/automation-storage';

const REGISTRY_ID = 'cmqmbemz600002fp2tiraeu6w';
const FROM_PATH = 'cmpnooli40001f0gveaxr8iim/detail/hero-1781957364462.png';
const TO_PATH = 'cmpnooli40001f0gveaxr8iim/archive/hero-1781957364462.png';
const TOKEN = '1781957364462';

const GO = process.argv.includes('--go');

// #79 exhaustive ref scan, re-run at execution time (TOCTOU guard).
const REF_TABLES = [
  '"Product"', '"LifestyleAsset"', 'published_assets', 'asset_references',
  'asset_jobs', 'art_director_prompts', 'prompt_library_entry', 'generation',
  'slot_generation', 'daily_recommendations', 'backdrop_jobs',
];

async function refScan(): Promise<number> {
  let total = 0;
  for (const t of REF_TABLES) {
    const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT count(*)::bigint AS n FROM ${t} WHERE ${t}::text LIKE '%${TOKEN}%'`,
    );
    const n = Number(rows[0]?.n ?? 0);
    if (n > 0) console.log(`  REF FOUND in ${t}: ${n}`);
    total += n;
  }
  // other registry rows (besides the target) holding the token
  const others = await prisma.assetRegistry.count({
    where: { path: { contains: TOKEN }, id: { not: REGISTRY_ID } },
  });
  if (others > 0) console.log(`  REF FOUND in asset_registry (other rows): ${others}`);
  return total + others;
}

async function main() {
  const row = await prisma.assetRegistry.findUnique({ where: { id: REGISTRY_ID } });
  if (!row) {
    console.log(`registry row ${REGISTRY_ID} not found — already cleaned? ABORT (no-op).`);
    return;
  }
  console.log(`target: ${row.id} stage=${row.stage} slot=${row.slot} path=${row.path} src=${row.sourceTag}`);

  if (row.stage === 'archive') {
    console.log('already stage=archive — idempotent no-op.');
    return;
  }
  if (row.path !== FROM_PATH) {
    console.log(`ABORT: path mismatch (expected ${FROM_PATH}, got ${row.path}). Manual review.`);
    return;
  }

  const refs = await refScan();
  if (refs > 0) {
    console.log(`ABORT: #79 found ${refs} live reference(s) — NOT safe to archive.`);
    return;
  }
  console.log('#79 re-scan: 0 references — safe.');

  if (!GO) {
    console.log(`\nDRY-RUN. Would MOVE ${FROM_PATH} -> ${TO_PATH} and set stage=archive.`);
    console.log('Re-run with --go to execute.');
    return;
  }

  const moved = await moveAutomationAsset(FROM_PATH, TO_PATH);
  console.log(`storage moved -> ${moved.path}`);
  const updated = await prisma.assetRegistry.update({
    where: { id: REGISTRY_ID },
    data: { stage: 'archive', path: TO_PATH },
  });
  console.log(`registry updated -> stage=${updated.stage} path=${updated.path}`);
  console.log('DONE (reversible: move back + stage->detail to restore).');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
