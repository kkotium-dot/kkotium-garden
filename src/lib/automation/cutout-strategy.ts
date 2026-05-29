/**
 * cutout-strategy.ts
 *
 * Decide the cutout (background-removal) strategy from a product's asset state.
 *
 * Authority:
 *  - docs/research/KKOTIUM_ADOBE_WORKFLOW_RESEARCH_2026-05-29.md (sec 1-A, sec 6)
 *  - docs/handoff/HANDOFF_g8_engine_q4_2026-05-29.md (sec 2-B)
 *
 * Pure module: deterministic, no IO, no network.
 *
 * Quality gate rationale: Adobe Express free tier caps at 5MB, so we hold
 * inputs under 4MB. Transparent output requires png/webp. domeggook low-res
 * source patterns (e.g. stt_330) fall below 1000px and force a manual upload.
 */

export interface CutoutQualityGate {
  minWidth: 1000;
  minHeight: 1000;
  maxFileSizeMB: 4;
  formatRequired: ['png', 'webp'];
}

export interface CutoutStrategy {
  source: 'product-main-image' | 'product-additional' | 'manual-upload';
  tool: 'adobe-express' | 'photoshop' | 'firefly-edit';
  qualityGate: CutoutQualityGate;
  reasonIfBlocked?: string;
}

export interface CutoutProductInput {
  mainImage?: string | null;
  images?: unknown;
  additionalImages?: unknown;
}

// Shared frozen gate instance reused across all returned strategies.
const QUALITY_GATE: CutoutQualityGate = {
  minWidth: 1000,
  minHeight: 1000,
  maxFileSizeMB: 4,
  formatRequired: ['png', 'webp'],
};

// domeggook low-resolution source patterns (e.g. stt_330, _img_12).
const LOW_RES_RE = /stt_\d+|_img_\d{2,3}(\?|$)/i;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Plan the cutout workflow from a product's asset state.
 *
 * Decision order:
 *  1. No candidate URLs -> manual-upload (no source image).
 *  2. Primary candidate matches the domeggook low-res pattern -> manual-upload.
 *  3. An additional images string exists -> product-additional.
 *  4. Otherwise -> product-main-image.
 */
export function planCutoutWorkflow(product: CutoutProductInput): CutoutStrategy {
  // GUARD: images is a JsonValue field; verify Array.isArray before iterating.
  const imageStrings: string[] = Array.isArray(product.images)
    ? product.images.filter(isNonEmptyString)
    : [];

  const candidates: string[] = [];
  if (isNonEmptyString(product.mainImage)) {
    candidates.push(product.mainImage);
  }
  candidates.push(...imageStrings);

  if (candidates.length === 0) {
    return {
      source: 'manual-upload',
      tool: 'adobe-express',
      qualityGate: QUALITY_GATE,
      reasonIfBlocked:
        'no source image available -- manual high-res cutout upload required',
    };
  }

  const primary = isNonEmptyString(product.mainImage)
    ? product.mainImage
    : imageStrings[0];

  if (LOW_RES_RE.test(primary)) {
    return {
      source: 'manual-upload',
      tool: 'adobe-express',
      qualityGate: QUALITY_GATE,
      reasonIfBlocked:
        'low-resolution source (domeggook stt/_img pattern) below 1000px -- manual high-res or per-item cutout extraction required',
    };
  }

  if (imageStrings.length > 0) {
    return {
      source: 'product-additional',
      tool: 'adobe-express',
      qualityGate: QUALITY_GATE,
    };
  }

  return {
    source: 'product-main-image',
    tool: 'adobe-express',
    qualityGate: QUALITY_GATE,
  };
}
