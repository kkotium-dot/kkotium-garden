// src/lib/automation/section-builder.ts
//
// Sprint 7-M2 Phase 1 (v3.1 FINAL Smart Asset Workflow) — top-level
// 5-section detail page builder.
//
// Reads a SkeletonSpec, iterates its sections[] array, dispatches each
// to its registered renderer (or the placeholder for ids not yet
// implemented), then stacks the resulting Buffers vertically into a
// single tall PNG that matches skeleton.totalHeight.
//
// Design notes
//   - Section renderers are independent: a single failing renderer should
//     not break the whole page. On render error we substitute a
//     placeholder block of the same height so the vertical stack stays
//     dimensionally correct.
//   - Sharp runs in Node runtime only. Any API route consuming this MUST
//     export `runtime = 'nodejs'`.
//   - Returns Buffer + per-section metadata. The caller decides where
//     to persist (Supabase Storage upload happens in /api/products/
//     [id]/generate-detail in Phase 3).

import sharp from 'sharp';
import { fetchImageBuffer } from './sharp-composite';
import { matchSkeleton } from './skeleton-matcher';
import { getSkeleton, type SkeletonSpec } from './layout-skeletons';
import { getSectionRenderer, hasDedicatedRenderer } from './section-renderers';
import { placeholderRenderer } from './section-renderers/_placeholder';
import type {
  SectionRenderContext,
  SectionRenderResult,
} from './section-renderers/types';
import type { ConceptTone, SkeletonId } from '../diagnosis/concept-tone-inference';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DetailPageRequest {
  productName: string;
  salePrice?: number;
  supplierPrice?: number;
  category?: string;
  sourceImageUrl: string;
  lifestyleAssetUrl?: string;
  highlight?: string;
  brandName?: string;

  /** ConceptTone (output of CTI). Required for auto-matching. Skip if
   *  overrideSkeletonId is supplied. */
  conceptTone?: ConceptTone;
  /** Designer 1-click swap to a specific skeleton. */
  overrideSkeletonId?: SkeletonId;
  /** Verified facts (Product + crawl_logs + tone). Threaded into every
   *  section renderer to ground spec/story copy and prevent hallucination.
   *  Optional for backward compat — when omitted, fallback templates remain. */
  groundedFacts?: import('./section-renderers/types').GroundedFacts;
}

export interface DetailPageResult {
  skeletonId: SkeletonId;
  skeleton: SkeletonSpec;
  matchScore: number;
  matchAmbiguous: boolean;

  /** Composed PNG Buffer at 860 × skeleton.totalHeight. */
  buffer: Buffer;
  /** Per-section metadata, in render order. */
  sections: Array<{
    sectionId: string;
    dedicated: boolean;
    height: number;
    copy: Record<string, string>;
    copyFiltered: boolean;
    /** Y offset from the top of the composed image. */
    offsetY: number;
  }>;
  /** Total wall-clock milliseconds. */
  elapsedMs: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function renderSectionSafely(
  spec: SkeletonSpec,
  section: SkeletonSpec['sections'][number],
  ctx: SectionRenderContext,
): Promise<SectionRenderResult> {
  const renderer = getSectionRenderer(section.id);
  try {
    return await renderer(spec, section, ctx);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `[section-builder] ${spec.id}::${section.id} renderer failed, falling back to placeholder:`,
      err,
    );
    return placeholderRenderer(spec, section, ctx);
  }
}

async function stackVertically(
  layers: SectionRenderResult[],
  width: number,
  totalHeight: number,
): Promise<{
  buffer: Buffer;
  offsets: number[];
}> {
  // Empty stack edge case
  if (layers.length === 0) {
    const empty = await sharp({
      create: { width, height: Math.max(totalHeight, 1), channels: 4, background: '#FFFFFF' },
    })
      .png()
      .toBuffer();
    return { buffer: empty, offsets: [] };
  }

  const offsets: number[] = [];
  let cursor = 0;
  const composites = layers.map((l) => {
    const off = cursor;
    offsets.push(off);
    cursor += l.height;
    return { input: l.buffer, top: off, left: 0 };
  });

  const buffer = await sharp({
    create: { width, height: totalHeight, channels: 4, background: '#FFFFFF' },
  })
    .composite(composites)
    .png()
    .toBuffer();

  return { buffer, offsets };
}

// Continuous-canvas assembler (STEP 2 / task 1): lay a single global background
// across the full 860 × totalHeight canvas FIRST, then composite each section
// on top — the foundation for a "flowing page" once section renderers go
// transparent (the 30-renderer spread, deferred to a later step after visual
// verification). `backgroundBuffer`, when supplied, must already be sized to
// width × totalHeight (cover-fit mood photo). When omitted, the base is the same
// white fill stackVertically uses.
//
// ★ Regression note: section renderers today paint their own opaque full-height
// backgrounds and tile the canvas contiguously (no gaps), so with opaque
// sections the composited pixels equal stackVertically regardless of the global
// background. composeContinuous is therefore safe to wire now; the global mood
// photo only becomes visible as renderers are converted to transparent later.
async function composeContinuous(
  layers: SectionRenderResult[],
  width: number,
  totalHeight: number,
  backgroundBuffer?: Buffer,
): Promise<{ buffer: Buffer; offsets: number[] }> {
  if (layers.length === 0) {
    const empty = await sharp({
      create: { width, height: Math.max(totalHeight, 1), channels: 4, background: '#FFFFFF' },
    })
      .png()
      .toBuffer();
    return { buffer: empty, offsets: [] };
  }

  const offsets: number[] = [];
  let cursor = 0;
  const composites = layers.map((l) => {
    const off = cursor;
    offsets.push(off);
    cursor += l.height;
    return { input: l.buffer, top: off, left: 0 };
  });

  // Base = the global mood photo if provided, else the same white fill as
  // stackVertically. A provided buffer is assumed already width × totalHeight.
  const base = backgroundBuffer
    ? sharp(backgroundBuffer)
    : sharp({
        create: { width, height: totalHeight, channels: 4, background: '#FFFFFF' },
      });

  const buffer = await base.composite(composites).png().toBuffer();
  return { buffer, offsets };
}

/** Cover-fit a mood photo to the full continuous canvas (fills, crops overflow). */
async function coverFitCanvas(
  imageBuffer: Buffer,
  width: number,
  totalHeight: number,
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(width, totalHeight, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export async function buildDetailPage(
  req: DetailPageRequest,
): Promise<DetailPageResult> {
  const start = Date.now();

  // Skeleton selection: explicit override OR matcher.
  let skeletonId: SkeletonId;
  let matchScore: number;
  let matchAmbiguous: boolean;
  if (req.overrideSkeletonId) {
    skeletonId = req.overrideSkeletonId;
    matchScore = 100;
    matchAmbiguous = false;
  } else {
    if (!req.conceptTone) {
      throw new Error(
        'buildDetailPage: conceptTone or overrideSkeletonId is required',
      );
    }
    const match = matchSkeleton(req.conceptTone);
    skeletonId = match.skeletonId;
    matchScore = match.score;
    matchAmbiguous = match.ambiguous;
  }

  const spec = getSkeleton(skeletonId);

  const ctx: SectionRenderContext = {
    productName: req.productName,
    salePrice: req.salePrice,
    supplierPrice: req.supplierPrice,
    category: req.category,
    sourceImageUrl: req.sourceImageUrl,
    lifestyleAssetUrl: req.lifestyleAssetUrl,
    highlight: req.highlight,
    brandName: req.brandName,
    groundedFacts: req.groundedFacts,
  };

  // Render sequentially so failures are isolated and we get deterministic
  // ordering on Vercel cold starts.
  const renderResults: SectionRenderResult[] = [];
  for (const section of spec.sections) {
    const r = await renderSectionSafely(spec, section, ctx);
    renderResults.push(r);
  }

  // Assembly: when a mood asset is supplied, use the continuous-canvas path
  // (global background pre-composite). Otherwise keep the exact stackVertically
  // path — byte-identical to the prior behavior (regression guard for P0).
  let buffer: Buffer;
  let offsets: number[];
  if (req.lifestyleAssetUrl) {
    let bgBuf: Buffer | undefined;
    try {
      const fetched = await fetchImageBuffer(req.lifestyleAssetUrl);
      bgBuf = await coverFitCanvas(fetched, spec.width, spec.totalHeight);
    } catch {
      // Fetch failed — fall back to no global background (white base), which
      // makes composeContinuous equivalent to stackVertically.
      bgBuf = undefined;
    }
    ({ buffer, offsets } = await composeContinuous(
      renderResults,
      spec.width,
      spec.totalHeight,
      bgBuf,
    ));
  } else {
    ({ buffer, offsets } = await stackVertically(
      renderResults,
      spec.width,
      spec.totalHeight,
    ));
  }

  const sectionsMeta = renderResults.map((r, i) => ({
    sectionId: r.sectionId,
    dedicated: hasDedicatedRenderer(r.sectionId),
    height: r.height,
    copy: r.copy,
    copyFiltered: r.copyFiltered,
    offsetY: offsets[i] ?? 0,
  }));

  return {
    skeletonId,
    skeleton: spec,
    matchScore,
    matchAmbiguous,
    buffer,
    sections: sectionsMeta,
    elapsedMs: Date.now() - start,
  };
}
