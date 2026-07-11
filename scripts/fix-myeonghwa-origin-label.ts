// scripts/fix-myeonghwa-origin-label.ts
// ============================================================================
// One-off origin-LABEL correction (authority: docs/research/
// PUBLISH_READINESS_VERIFY_ORIGIN_DRIFT_2026-07-10.md, 정정본 · #242).
//
// 명화 (car-air-freshener) is DOMESTIC: originCode="00" (국산, importer:false) is
// CORRECT and stays untouched. Only naver_origin — the content LABEL attached to
// originAreaInfo.content — is wrong ("중국"), which would ship a payload whose
// code (국산) contradicts its content (중국). Fix = set naver_origin -> "국산".
//
// SCOPE: ONLY the named product id. The other two products (ice-tray, 달항아리)
// are import-origin (0200037/중국, consistent) and the operator did NOT ask to
// change them — this script never touches them. It also SCANS all products and
// REPORTS (never auto-fixes) any other domestic-code + import-label contradiction
// so a surprise is surfaced, not silently rewritten.
//
// GUARD: the update only runs when the live row still shows the exact
// contradiction (domestic code + import naver_origin). If the data already
// differs, it refuses (idempotent / no blind overwrite).
//
// MODES:
//   (default)        dry-run — print current state + plan, mutate NOTHING.
//   --go --confirm   execute the single UPDATE (double-gated).
//
// Run:
//   npx tsx scripts/fix-myeonghwa-origin-label.ts
//   npx tsx scripts/fix-myeonghwa-origin-label.ts --go --confirm
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { ORIGIN_CODES_FULL } from '../src/lib/naver/origin-codes-full';

const TARGET_ID = 'cmpnooli40001f0gveaxr8iim'; // myeonghwa car-air-freshener
const NEW_ORIGIN_LABEL = '\uAD6D\uC0B0'; // domestic label written to naver_origin (escaped, rule 3-1)

function loadEnv(): void {
  const raw = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').replace(/\\\$/g, '$');
  }
}

// importer flag for an origin CODE (false = domestic).
function codeIsImport(code: string | null | undefined): boolean | null {
  const e = ORIGIN_CODES_FULL.find((x) => x.code === (code ?? '').trim());
  return e ? e.importer : null;
}
// importer flag implied by a content LABEL (true = import country name).
function labelIsImport(label: string | null | undefined): boolean | null {
  const norm = (label ?? '').trim();
  if (!norm) return null;
  // Table-driven: ORIGIN_CODES_FULL carries the domestic special (국산, code '00',
  // importer:false) plus every import country — no Hangul literal needed here.
  const matches = ORIGIN_CODES_FULL.filter((x) => x.label === norm);
  if (matches.length === 0) return null;
  const flags = new Set(matches.map((x) => x.importer));
  return flags.size === 1 ? matches[0].importer : null;
}
// A row is contradictory when its code is domestic but its label implies import.
function isDomesticCodeImportLabel(code: string | null, label: string | null): boolean {
  return codeIsImport(code) === false && labelIsImport(label) === true;
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const go = args.has('--go');
  const confirm = args.has('--confirm');
  loadEnv();

  const { prisma } = await import('../src/lib/prisma');

  // Cross-product scan (report-only) — surface any OTHER contradiction.
  const all = await prisma.product.findMany({ select: { id: true, name: true, originCode: true, naver_origin: true } });
  const others = all.filter(
    (p: { id: string; originCode: string | null; naver_origin: string | null }) =>
      p.id !== TARGET_ID && isDomesticCodeImportLabel(p.originCode, p.naver_origin),
  );
  if (others.length > 0) {
    console.log('⚠ OTHER products with a domestic-code + import-label contradiction (NOT auto-fixed — operator review):');
    for (const p of others) console.log(`   ${p.id}  code=${p.originCode} label=${p.naver_origin}  ${(p.name ?? '').slice(0, 24)}`);
    console.log('');
  }

  const target = await prisma.product.findUnique({
    where: { id: TARGET_ID },
    select: { id: true, name: true, originCode: true, naver_origin: true },
  });
  if (!target) {
    console.error(`ABORT: target product ${TARGET_ID} not found.`);
    process.exit(1);
  }

  console.log('============ MYEONGHWA ORIGIN-LABEL FIX ============');
  console.log(`product : ${target.id}  (${(target.name ?? '').slice(0, 30)})`);
  console.log(`current : originCode=${target.originCode}  naver_origin=${target.naver_origin}`);
  console.log(`plan    : originCode UNCHANGED (${target.originCode}, domestic) · naver_origin -> ${NEW_ORIGIN_LABEL}`);

  if (target.naver_origin === NEW_ORIGIN_LABEL) {
    console.log('\nAlready corrected (naver_origin is domestic) — nothing to do. Idempotent no-op.');
    console.log('======================================================');
    return;
  }
  if (!isDomesticCodeImportLabel(target.originCode, target.naver_origin)) {
    console.error(
      `\nREFUSING: live row is not the expected "domestic code + import label" contradiction ` +
        `(code=${target.originCode}, label=${target.naver_origin}). No blind overwrite.`,
    );
    process.exit(1);
  }

  if (!go) {
    console.log('\nDRY-RUN ONLY. Nothing was changed. Re-run with `--go --confirm` to apply.');
    console.log('======================================================');
    return;
  }
  if (!confirm) {
    console.error('\nREFUSING: --go requires --confirm (double gate). Nothing changed.');
    process.exit(1);
  }

  await prisma.product.update({ where: { id: TARGET_ID }, data: { naver_origin: NEW_ORIGIN_LABEL } });
  const after = await prisma.product.findUnique({ where: { id: TARGET_ID }, select: { originCode: true, naver_origin: true } });
  console.log(`\n✅ UPDATED. now: originCode=${after?.originCode} naver_origin=${after?.naver_origin}`);
  console.log('======================================================');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('ERROR:', e instanceof Error ? e.message : e);
    process.exit(1);
  });
