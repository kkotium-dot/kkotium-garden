// src/lib/images/subject-containment.ts
// ============================================================================
// Crop full-subject containment geometry (T6).
// Authority: docs/decisions/2026-06-07-crop-full-subject-containment.md +
//            docs/design/THUMBNAIL_CROP_EDIT_STANDARD.md §1.
//
// Principle: a thumbnail/representative crop must contain the WHOLE product
// bounding box + a minimum pad; if any part of the product is clipped it is a
// reject. Never clip the subject to make it square — expand (outpaint) instead.
//
// Pure geometry. No IO, no sharp. The subject bbox comes from
// quality-classifier.detectSubjectBBox (source px); these helpers turn it into a
// containment square, detect operator-box clipping, and produce a snap target.
// ============================================================================

import type { SubjectBBox } from './quality-classifier';

export interface ContainBox { x: number; y: number; width: number; height: number; }

export const SUBJECT_PAD_FRACTION = 0.08; // >= 8% padding each side (decision §1)

/**
 * Minimal 1:1 square that fully contains the padded subject, centered on the
 * subject and clamped to the image. `contained` is false when the required side
 * exceeds the source's shorter span — then a canvas expand is needed (never clip
 * the product to fit). `expandPx` is the extra side the source lacks.
 */
export function containmentSquare(
  b: SubjectBBox,
  imgW: number,
  imgH: number,
  pad: number = SUBJECT_PAD_FRACTION,
): { box: ContainBox; contained: boolean; expandPx: number } {
  const padPx = Math.round(Math.max(b.width, b.height) * pad);
  const needLeft = b.x - padPx;
  const needTop = b.y - padPx;
  const needRight = b.x + b.width + padPx;
  const needBottom = b.y + b.height + padPx;
  const side = Math.max(needRight - needLeft, needBottom - needTop);
  const cx = (needLeft + needRight) / 2;
  const cy = (needTop + needBottom) / 2;
  const maxSide = Math.min(imgW, imgH);

  if (side > maxSide) {
    // Best-fit square within the source (will clip) — caller warns + expand.
    const fit = maxSide;
    const x = Math.max(0, Math.min(Math.round(cx - fit / 2), imgW - fit));
    const y = Math.max(0, Math.min(Math.round(cy - fit / 2), imgH - fit));
    return { box: { x, y, width: fit, height: fit }, contained: false, expandPx: Math.ceil(side - maxSide) };
  }

  const sideR = Math.round(side);
  const x = Math.max(0, Math.min(Math.round(cx - side / 2), imgW - sideR));
  const y = Math.max(0, Math.min(Math.round(cy - side / 2), imgH - sideR));
  const box: ContainBox = { x, y, width: sideR, height: sideR };
  // Verify the clamped square still fully covers the (unpadded) subject.
  const contained =
    box.x <= b.x && box.y <= b.y &&
    box.x + box.width >= b.x + b.width && box.y + box.height >= b.y + b.height;
  return { box, contained, expandPx: 0 };
}

/** True when `box` clips the subject bbox (any subject pixel falls outside). */
export function boxClipsSubject(box: ContainBox, b: SubjectBBox): { clips: boolean; sides: string[] } {
  const sides: string[] = [];
  if (box.x > b.x) sides.push('left');
  if (box.y > b.y) sides.push('top');
  if (box.x + box.width < b.x + b.width) sides.push('right');
  if (box.y + box.height < b.y + b.height) sides.push('bottom');
  return { clips: sides.length > 0, sides };
}

/** Snap target = the full-containment square (operator 1-click "fit subject"). */
export function snapBoxToSubject(
  b: SubjectBBox,
  imgW: number,
  imgH: number,
  pad: number = SUBJECT_PAD_FRACTION,
): ContainBox {
  return containmentSquare(b, imgW, imgH, pad).box;
}
