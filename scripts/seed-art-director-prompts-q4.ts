// scripts/seed-art-director-prompts-q4.ts
//
// G8-ENGINE-Q4 item 9 — fragrance tone retune in art_director_prompts.
//
// Authority: docs/research/KKOTIUM_ADOBE_WORKFLOW_RESEARCH_2026-05-29.md §3-D
// (5 sunlit fragrance prompts) + §3-A (why dark cinematic was wrong).
//
// 1. Deprecates the Q3 dark-cinematic automotive-fragrance prompt
//    (status 'g8q3-seed' -> 'deprecated') — kept, not deleted, for traceability.
// 2. Inserts the 5 sunlit fragrance prompts (status 'g8q4-seed', idempotent).
//
// Run: npx tsx scripts/seed-art-director-prompts-q4.ts

import { prisma } from '../src/lib/prisma';

const Q4_STATUS = 'g8q4-seed';

const POSITIVE_SUFFIX =
  ', soft natural daylight, high detail, no human face, commercial product photography';
const NEGATIVE_PROMPT = 'no text, no watermark, no human face, no people, no logos';

interface SeedRow {
  toneKey: string;
  body: string;
  aspectRatio: string;
  rank: number; // 1 = primary, 2 = secondary
}

// research §3-D verbatim (5 sunlit fragrance prompts)
const ROWS: SeedRow[] = [
  { toneKey: 'fragrance-sunlit-wood-desk', rank: 1, aspectRatio: '4:5',
    body: 'A luxury car diffuser bottle on a warm oak wood desk by a large window, soft morning sunlight casting gentle shadows, impressionist painting label visible, minimal Scandinavian interior, dried pampas grass in ceramic vase, shallow depth of field, warm color grade, photorealistic' },
  { toneKey: 'fragrance-cafe-window', rank: 2, aspectRatio: '1:1',
    body: 'Premium perfume diffuser on a marble cafe table beside a sunlit window, golden hour natural light, linen napkin, a cup of latte softly blurred, airy bright atmosphere, impressionist pastel mood' },
  { toneKey: 'fragrance-sunlit-car-interior', rank: 2, aspectRatio: '1:1',
    body: 'Elegant car air diffuser clipped to a luxury vehicle vent, warm afternoon sunlight streaming through windshield, beige leather interior softly lit, clean and bright, sense of calm sanctuary, lifestyle product shot' },
  { toneKey: 'fragrance-wood-shelf', rank: 2, aspectRatio: '1:1',
    body: 'Car diffuser displayed on a warm walnut wood shelf, soft diffused daylight from side window, small green plant, beige wall, cozy warm minimalist Korean interior, impressionist art label, natural soft shadows' },
  { toneKey: 'fragrance-balcony-sunlight', rank: 2, aspectRatio: '4:5',
    body: 'Luxury diffuser on a balcony ledge with morning sunlight, soft bokeh of green plants and warm city light, fresh airy mood, gentle warm tones evoking Monet impressionism, lifestyle photography' },
];

async function main() {
  // 1. Deprecate the Q3 dark-cinematic automotive-fragrance prompt (traceable).
  const dep = await prisma.artDirectorPrompt.updateMany({
    where: { status: 'g8q3-seed', strategicRole: 'automotive-fragrance' },
    data: { status: 'deprecated' },
  });
  console.log('DEPRECATED: ' + dep.count + ' Q3 dark-cinematic automotive-fragrance prompt(s)');

  // 2. Idempotent re-seed of the 5 sunlit prompts.
  const existing = await prisma.artDirectorPrompt.count({ where: { status: Q4_STATUS } });
  if (existing > 0) {
    await prisma.artDirectorPrompt.deleteMany({ where: { status: Q4_STATUS } });
    console.log('REPLACED: removed ' + existing + ' prior g8q4-seed rows');
  }

  const data = ROWS.map((r) => ({
    productId: null,
    categoryHint: 'automotive-fragrance',
    conceptAxes: {
      toneKey: r.toneKey,
      baseTone: 'foreign-cinematic-sunlit',
      trustSignal: 'fragrance',
      naturalLight: true,
      rank: r.rank,
      source: 'adobe-workflow-research-2026-05-29-section3D',
    },
    prompt: r.body + POSITIVE_SUFFIX,
    negativePrompt: NEGATIVE_PROMPT,
    aspectRatio: r.aspectRatio,
    imageInformed: false,
    status: Q4_STATUS,
    strategicRole: r.toneKey,
    sellerUsed: false,
  }));

  const res = await prisma.artDirectorPrompt.createMany({ data });
  console.log('SEEDED: ' + res.count + ' sunlit fragrance prompts (status=' + Q4_STATUS + ')');

  const total = await prisma.artDirectorPrompt.count({ where: { status: Q4_STATUS } });
  const deprecated = await prisma.artDirectorPrompt.count({ where: { status: 'deprecated' } });
  console.log('VERIFY: g8q4-seed=' + total + ' deprecated=' + deprecated);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.log('ERROR=' + (e && e.message ? e.message : String(e)));
  await prisma.$disconnect();
  process.exit(1);
});
