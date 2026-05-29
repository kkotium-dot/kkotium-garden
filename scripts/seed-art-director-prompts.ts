// scripts/seed-art-director-prompts.ts
//
// G8-ENGINE-Q3 item 5 — seed the 12 Firefly category prompt templates from
// research §10 into the existing ArtDirectorPrompt table (art_director_prompts).
//
// Maps to the ACTUAL schema (categoryHint / conceptAxes / prompt / negativePrompt
// / status / strategicRole), NOT the handoff's draft column sketch (#46: schema
// truth wins). Idempotent: rows carry status='g8q3-seed' so a re-run replaces
// only this seed set, never other ArtDirectorPrompt rows.
//
// Run: npx tsx scripts/seed-art-director-prompts.ts

import { prisma } from '../src/lib/prisma';

const SEED_STATUS = 'g8q3-seed';

// research §10 common suffix split: positives -> prompt tail, negatives -> negativePrompt.
const POSITIVE_SUFFIX =
  ', soft natural daylight, high detail, 1:1 square, commercial product photography';
const NEGATIVE_PROMPT = 'no text, no watermark, no human face, no people, no logos';

interface SeedRow {
  toneKey: string;
  categoryHint: string;
  baseTone: string;
  trustSignal: string;
  body: string;
}

const ROWS: SeedRow[] = [
  { toneKey: 'kitchen-friendly', categoryHint: 'kitchen', baseTone: 'modern-minimal', trustSignal: 'hygiene',
    body: 'Korean home kitchen counter, warm white marble, ice tray with crystal-clear ice cubes, bright airy morning light, minimal props, cozy friendly mood' },
  { toneKey: 'kitchen-premium', categoryHint: 'kitchen', baseTone: 'modern-minimal', trustSignal: 'hygiene',
    body: 'matte grey stone surface, kitchenware hero shot, soft shadow, premium minimal studio, deep-tone accent' },
  { toneKey: 'homeliving-korean', categoryHint: 'homeliving', baseTone: 'korean-traditional', trustSignal: 'spatial',
    body: 'serene Korean minimalist interior, hanji paper texture wall, beige empty space, moon-jar aesthetic, natural side light, quiet elegance, vintage warmth' },
  { toneKey: 'automotive-fragrance', categoryHint: 'automotive-fragrance', baseTone: 'foreign-cinematic', trustSignal: 'fragrance',
    body: 'cinematic dark interior, leather car vent, perfume diffuser, moody low-key lighting, golden reflection, Jo Malone-like premium fragrance mood' },
  { toneKey: 'beauty-clean', categoryHint: 'beauty', baseTone: 'kinfolk', trustSignal: 'quality',
    body: 'clean white studio, skincare bottle, dewy texture droplet macro, soft gradient, calm premium' },
  { toneKey: 'food-natural', categoryHint: 'food', baseTone: 'kinfolk', trustSignal: 'freshness',
    body: 'warm wooden table, natural linen, appetizing food styling, high saturation, morning kinfolk mood' },
  { toneKey: 'kids-friendly', categoryHint: 'kids', baseTone: 'pastel-friendly', trustSignal: 'safety',
    body: 'soft pastel nursery, safe rounded product, gentle warm light, friendly cozy, child hand only' },
  { toneKey: 'fashion-editorial', categoryHint: 'fashion', baseTone: 'kinfolk', trustSignal: 'style',
    body: 'editorial fashion flatlay, neutral tone, magazine layout, refined minimal' },
  { toneKey: 'tradition-gift', categoryHint: 'tradition-gift', baseTone: 'korean-traditional', trustSignal: 'grace',
    body: 'Korean traditional gift setting, mother-of-pearl najeon texture, hanji wrapping, paulownia wood box, museum-quality lighting' },
  { toneKey: 'digital-tech', categoryHint: 'digital', baseTone: 'modern-minimal', trustSignal: 'spec',
    body: 'sleek black tech surface, gadget hero, cool rim light, futuristic minimal studio' },
  { toneKey: 'senior-contrast', categoryHint: 'kitchen', baseTone: 'modern-minimal', trustSignal: 'hygiene',
    body: 'bright high-contrast product shot, clean white background, large clear composition, simple warm tone' },
  { toneKey: 'kinfolk-lifestyle', categoryHint: 'homeliving', baseTone: 'kinfolk', trustSignal: 'spatial',
    body: 'kinfolk lifestyle scene, abundant negative space, muted earth tones, soft window light, calm sensory mood' },
];

async function main() {
  const existing = await prisma.artDirectorPrompt.count({ where: { status: SEED_STATUS } });
  if (existing > 0) {
    await prisma.artDirectorPrompt.deleteMany({ where: { status: SEED_STATUS } });
    console.log('REPLACED: removed ' + existing + ' prior g8q3-seed rows');
  }

  const data = ROWS.map((r) => ({
    productId: null,
    categoryHint: r.categoryHint,
    conceptAxes: { toneKey: r.toneKey, baseTone: r.baseTone, trustSignal: r.trustSignal, source: 'research-2026-05-29-section10' },
    prompt: r.body + POSITIVE_SUFFIX,
    negativePrompt: NEGATIVE_PROMPT,
    aspectRatio: '1:1',
    imageInformed: false,
    status: SEED_STATUS,
    strategicRole: r.toneKey,
    sellerUsed: false,
  }));

  const res = await prisma.artDirectorPrompt.createMany({ data });
  console.log('SEEDED: ' + res.count + ' art_director_prompts rows (status=' + SEED_STATUS + ')');

  const total = await prisma.artDirectorPrompt.count({ where: { status: SEED_STATUS } });
  console.log('VERIFY: ' + total + ' rows now carry status=' + SEED_STATUS);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.log('ERROR=' + (e && e.message ? e.message : String(e)));
  await prisma.$disconnect();
  process.exit(1);
});
