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
      // #47/#59 근본수정 (2026-09-22, 대표님 지시) — clamp()로 뷰포트 폭에
      // 비례한 반응형 타이포. 스마트에디터가 <style> 태그를 통째로 제거하는
      // 사례가 있어(Research_Report.md 확인) 인라인 style 속성 안에 직접
      // clamp()를 써야 살아남는다. min 24px(모바일 최저 가독선), preferred
      // 5vw(뷰포트 비례), max 30px(기존 PC 고정값 유지 — 회귀 없음).
      parts.push(
        `<h2 style="margin:0 0 16px;font-size:clamp(24px,5vw,30px);line-height:1.4;font-weight:700;color:#2B2B2B;">${safe}</h2>`,
      );
    } else {
      parts.push(
        `<p style="margin:0 0 14px;font-size:clamp(16px,4vw,19px);line-height:1.75;color:#3A3A3A;">${safe}</p>`,
      );
    }
  }
  if (parts.length === 0) return '';
  return (
    `<section data-section="${htmlEscape(section.sectionId)}" data-role="${section.role}" ` +
    `style="background:${bg};padding:clamp(24px,6vw,40px) clamp(20px,5vw,48px);">${parts.join('')}</section>`
  );
}

// #59 근본수정 — 세로형 슬롯 사이의 명확한 시각적 구분선. 모바일 세로
//스크롤에서 섹션 경계가 흐릿하면(배경색만으로는 부족) "어디서 다음
// 슬롯이 시작하는지" 불분명해진다 — 리서치가 요구한 "구분선"을 정확히
// 섹션과 섹션 사이에 삽입.
function sectionDivider(): string {
  return `<div style="height:1px;background:#EDE7DD;margin:0;" role="presentation"></div>`;
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

  // #59 근본수정 — 세로형 슬롯 사이에만 구분선 삽입(첫 블록 앞엔 안 넣음,
  // 히어로 이미지 바로 아래도 자연스러운 시작이라 구분선 불필요).
  for (const section of input.sections) {
    const html = renderSection(section);
    if (html) {
      if (blocks.length > 0) blocks.push(sectionDivider());
      blocks.push(html);
    }
  }

  if (blocks.length === 0) return '';

  // Outer container — centered, fixed content width, generous base font so the
  // Naver mobile view (which scales the same markup up) stays readable.
  // #47/#59 근본수정 — 컨테이너 기본 폰트도 clamp()로 반응형화(개별 섹션의
  // clamp()가 우선 적용되지만, copy가 없는 예외 텍스트를 위한 폴백).
  return (
    `<div style="max-width:${CONTENT_WIDTH}px;width:100%;margin:0 auto;` +
    `font-family:'Pretendard',-apple-system,sans-serif;font-size:clamp(16px,4vw,19px);line-height:1.75;` +
    `color:#3A3A3A;word-break:keep-all;">${blocks.join('')}</div>`
  );
}
