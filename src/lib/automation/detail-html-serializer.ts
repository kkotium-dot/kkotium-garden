// src/lib/automation/detail-html-serializer.ts
//
// STEP 3 (hybrid output, additive) — serialize a built detail page into
// Naver-SmartEditor-compatible HTML, in PARALLEL with the PNG path (not a
// replacement). The PNG (detailBase64) remains the default "image" output; this
// emits an "html" output for the image-address-upload / bulk-register flow.
//
// Hybrid split:
//   - image (PNG) mode: best when the rendered visual itself is the product
//     (emotional mood composites, designer art). Upload the PNG / its URL.
//   - html mode: best when SmartEditor compatibility / editable text is needed.
//
// #46 grounding: this serializer NEVER alters copy. It only wraps the existing
// copy strings in semantic markup and HTML-escapes them. Section role drives
// only background tone, never content.

import type { SectionRole } from './section-builder';

export interface SerializeSection {
  sectionId: string;
  copy: Record<string, string>;
  role: SectionRole;
}

export interface SerializeDetailInput {
  productName: string;
  sections: SerializeSection[];
  /** Product cutout / main image — rendered once at the top if present. */
  heroImageUrl?: string | null;
  /** Mood backdrop — rendered as a leading visual when present. */
  lifestyleAssetUrl?: string | null;
}

// Naver detail recommended content width.
const CONTENT_WIDTH = 860;

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Heading-like copy keys → rendered as <h2>; everything else → <p>. 'subtitle'
// is explicitly excluded so it reads as a lead paragraph, not a heading.
const HEADING_HINTS = ['headline', 'title', 'question', 'hook'];

function isHeadingKey(key: string): boolean {
  const k = key.toLowerCase();
  if (k.includes('subtitle')) return false;
  return HEADING_HINTS.some((h) => k.includes(h));
}

function sectionBackground(role: SectionRole): string {
  // Light, legible tones. emotional gets a warm tint; informational stays white.
  return role === 'emotional' ? '#FAF7F2' : '#FFFFFF';
}

function imageBlock(url: string, alt: string): string {
  const safeUrl = htmlEscape(url);
  const safeAlt = htmlEscape(alt);
  return (
    `<p style="margin:0 0 16px;text-align:center;">` +
    `<img src="${safeUrl}" alt="${safeAlt}" ` +
    `style="display:block;max-width:100%;width:100%;height:auto;border:0;margin:0 auto;" /></p>`
  );
}

function renderSection(section: SerializeSection): string {
  const bg = sectionBackground(section.role);
  const parts: string[] = [];
  for (const [key, value] of Object.entries(section.copy)) {
    if (!value || typeof value !== 'string') continue;
    const safe = htmlEscape(value);
    if (isHeadingKey(key)) {
      parts.push(
        `<h2 style="margin:0 0 16px;font-size:30px;line-height:1.4;font-weight:700;color:#2B2B2B;">${safe}</h2>`,
      );
    } else {
      parts.push(
        `<p style="margin:0 0 14px;font-size:19px;line-height:1.75;color:#3A3A3A;">${safe}</p>`,
      );
    }
  }
  if (parts.length === 0) return '';
  return (
    `<section data-section="${htmlEscape(section.sectionId)}" data-role="${section.role}" ` +
    `style="background:${bg};padding:40px 48px;">${parts.join('')}</section>`
  );
}

/**
 * Serialize the built detail page to a single HTML string (860px container,
 * inline styles for SmartEditor). Returns '' only if there is nothing to render.
 */
export function serializeDetailHtml(input: SerializeDetailInput): string {
  const blocks: string[] = [];

  // Leading visual: the mood backdrop (if any) then the product image.
  if (input.lifestyleAssetUrl) {
    blocks.push(imageBlock(input.lifestyleAssetUrl, `${input.productName} mood`));
  }
  if (input.heroImageUrl) {
    blocks.push(imageBlock(input.heroImageUrl, input.productName));
  }

  for (const section of input.sections) {
    const html = renderSection(section);
    if (html) blocks.push(html);
  }

  if (blocks.length === 0) return '';

  // Outer container — centered, fixed content width, generous base font so the
  // Naver mobile view (which scales the same markup up) stays readable.
  return (
    `<div style="max-width:${CONTENT_WIDTH}px;width:100%;margin:0 auto;` +
    `font-family:'Pretendard',-apple-system,sans-serif;font-size:19px;line-height:1.75;` +
    `color:#3A3A3A;word-break:keep-all;">${blocks.join('')}</div>`
  );
}
