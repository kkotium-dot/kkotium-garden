// scripts/verify-registry-drift.ts
// One-off data-layer verification for the REGISTRY<->STORAGE drift dimension
// (#62/#93/#94). Runs checkProductIntegrity against PRODUCTION Supabase (storage
// + DB) for every product and prints the registryDrift section. Compares the
// 명화 numbers against the Desktop ground-truth handoff (composite 20 storage /
// 12 registry / 8 storage-only; botanical registry-only). Read-only.
//
// Run: npx tsx --env-file=.env.local scripts/verify-registry-drift.ts
import { prisma } from '../src/lib/prisma';
import { checkProductIntegrity } from '../src/lib/storage/asset-integrity';

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, naverCategoryCode: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`products: ${products.length}\n`);

  for (const p of products) {
    const r = await checkProductIntegrity(p.id);
    const d = r.registryDrift;
    const byStage = (rows: { stage: string }[]) => {
      const m: Record<string, number> = {};
      for (const x of rows) m[x.stage] = (m[x.stage] ?? 0) + 1;
      return JSON.stringify(m);
    };
    console.log(`── ${p.name?.slice(0, 22) ?? '(noname)'} [${p.id}] cat=${p.naverCategoryCode}`);
    console.log(`   total=${r.total} ok=${r.ok} depth2=${r.depth2Count} dead=${r.deadRefs.length}`);
    console.log(`   registryDrift.reconciled=${d.reconciled}`);
    console.log(`   storageOnly=${d.storageOnlyCount} ${byStage(d.storageOnly)}`);
    console.log(`   registryOnly=${d.registryOnlyCount} ${byStage(d.registryOnly)}`);
    console.log(`   undefinedStages=${JSON.stringify(d.undefinedStages)}`);
    if (d.registryOnly.length) {
      console.log(`   registryOnly paths: ${d.registryOnly.map((x) => x.path).join(', ')}`);
    }
    console.log('');
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
