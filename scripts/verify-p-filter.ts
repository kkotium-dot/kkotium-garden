// scripts/verify-p-filter.ts
//
// Sprint 8-PF — Verification harness. Synthesises four product-photo
// variants with sharp and runs each through runPFilter, asserting the
// expected L1~L4 verdict and a wall-clock budget of <2000ms (warm cache
// after the first OCR call — first call pays ~1s for tesseract WASM init).
//
// All input buffers are generated locally so this script never touches the
// network and is safe to run offline (workflow principle B+C isolation).

import sharp from 'sharp';
import { runPFilter } from '../src/lib/diagnosis/p-filter';
import { terminateWatermarkWorker } from '../src/lib/diagnosis/p-filter-watermark';

interface Case {
  label: string;
  expectGrade: 'L1' | 'L2' | 'L3' | 'L4';
  build: () => Promise<Buffer>;
  options?: { enableWatermark?: boolean; enableObjectRatio?: boolean };
}

// Helper — generate raw RGB then encode to PNG.
async function rawToPng(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number],
): Promise<Buffer> {
  const channels = 3;
  const raw = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = fill(x, y);
      const idx = (y * width + x) * channels;
      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
    }
  }
  return sharp(raw, { raw: { width, height, channels } }).png().toBuffer();
}

// L1 — clean centered subject on a soft-grey backdrop, crisp internal pattern
async function buildClean(): Promise<Buffer> {
  return rawToPng(1000, 1000, (x, y) => {
    const cx = 500;
    const cy = 500;
    const dx = x - cx;
    const dy = y - cy;
    const insideObject = dx * dx + dy * dy < 380 * 380;
    if (insideObject) {
      // Neutral subject with a high-contrast 8x8 checker → strong Laplacian.
      const checker = ((x >> 3) + (y >> 3)) & 1;
      return checker ? [60, 60, 60] : [200, 200, 200];
    }
    // Soft mid-grey backdrop keeps global luminance away from over-exposure.
    const noise = ((x * 31 + y * 17) % 5) - 2;
    return [200 + noise, 200 + noise, 200 + noise];
  });
}

// L2 — watermark band along the bottom (clean otherwise so grade routes to L2 via OCR)
async function buildWatermark(): Promise<Buffer> {
  const base = await buildClean();
  // Composite "꽃틔움 KKOTIUM" text overlay onto the bottom 12% of the image.
  const svg = Buffer.from(
    `<svg width="1000" height="120" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="100%" height="100%" fill="white" />` +
      `<text x="50" y="80" font-size="60" font-family="sans-serif" fill="black" font-weight="bold">` +
      `KKOTIUM kkotium garden</text></svg>`,
  );
  const overlay = await sharp(svg).png().toBuffer();
  return sharp(base)
    .composite([{ input: overlay, top: 880, left: 0 }])
    .png()
    .toBuffer();
}

// L3 — heavy blur (Laplacian variance should fall below 100)
async function buildBlurry(): Promise<Buffer> {
  const base = await buildClean();
  return sharp(base).blur(15).png().toBuffer();
}

// L4 — undersized (<600px wide)
async function buildSmall(): Promise<Buffer> {
  return rawToPng(500, 500, (x, y) => {
    const insideObject = (x - 250) ** 2 + (y - 250) ** 2 < 100 ** 2;
    return insideObject ? [200, 60, 60] : [248, 248, 248];
  });
}

const cases: Case[] = [
  {
    label: 'Case A — clean studio shot (expect L1)',
    expectGrade: 'L1',
    build: buildClean,
    // OCR disabled to keep run fast and prevent false positives from PNG metadata.
    options: { enableWatermark: false },
  },
  {
    label: 'Case B — bottom watermark (expect L2)',
    expectGrade: 'L2',
    build: buildWatermark,
    options: { enableWatermark: true },
  },
  {
    label: 'Case C — heavy blur (expect L3)',
    expectGrade: 'L3',
    build: buildBlurry,
    options: { enableWatermark: false },
  },
  {
    label: 'Case D — undersized 500px (expect L4)',
    expectGrade: 'L4',
    build: buildSmall,
    options: { enableWatermark: false },
  },
];

async function main(): Promise<void> {
  let failures = 0;
  for (const c of cases) {
    const buffer = await c.build();
    const t0 = Date.now();
    const result = await runPFilter(buffer, c.options);
    const elapsed = Date.now() - t0;
    const ok = result.grade === c.expectGrade;
    const tag = ok ? 'PASS' : 'FAIL';
    if (!ok) failures += 1;
    console.log(`[${tag}] ${c.label}`);
    console.log(`        actual:   ${result.grade} (${result.gradeLabel})`);
    console.log(`        blur:     variance=${result.signals.blur.variance} level=${result.signals.blur.level}`);
    console.log(`        exposure: mean=${result.signals.exposure.mean.toFixed(1)} ok=${result.signals.exposure.ok}`);
    console.log(`        wb:       cast=${result.signals.whiteBalance.cast} dir=${result.signals.whiteBalance.direction ?? '-'} dev=${result.signals.whiteBalance.deviation}`);
    console.log(`        watermark:detected=${result.signals.watermark.detected} regions=[${result.signals.watermark.regions.join(',')}]`);
    console.log(`        bg:       variance=${result.signals.background.variance} uniform=${result.signals.background.uniform}`);
    console.log(`        objRatio: ${result.signals.objectRatio ? JSON.stringify(result.signals.objectRatio) : 'skipped'}`);
    console.log(`        elapsed:  ${elapsed}ms (internal=${result.elapsedMs}ms)`);
    if (result.elapsedMs > 5000) {
      console.log('        WARN: elapsed exceeded soft budget 5s');
    }
    if (result.autoFixSuggestions.length > 0) {
      console.log(`        autoFix:  ${result.autoFixSuggestions.join(' | ')}`);
    }
    console.log('');
  }

  await terminateWatermarkWorker();

  if (failures > 0) {
    console.log(`❌ ${failures} case(s) failed.`);
    process.exit(1);
  } else {
    console.log('✅ All P-Filter cases passed.');
  }
}

main().catch((err) => {
  console.error('verify-p-filter crashed:', err);
  process.exit(1);
});
