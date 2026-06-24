// src/lib/seo/copy-template.ts
// ============================================================================
// COPY-AUTO-1 (#155 / #82) — PURE, zero-cost template copy. On 씨앗 심기 entry
// we want the copy field already drafted WITHOUT any AI call. This builds an
// instant draft purely from product data + the deterministic tone rule
// (classifyCopyTone). It NEVER fabricates a benefit it has no data for (#82):
// slots with no data are omitted (no empty `{token}` ever surfaces). The "AI로
// 더 다듬기" hunt (Groq/Gemini, free) upgrades this draft.

import { classifyCopyTone, type CopyTone } from '@/lib/seo/copy-tone';

export interface TemplateCopyInput {
  name: string;
  keyword?: string;               // main golden keyword (falls back to name)
  categoryWord?: string;          // leaf category label (e.g. 방향제)
  categoryPath?: string;
  price?: number;
  spec?: string;                  // 용량/수량/핵심 스펙 (e.g. 500ml, 2개입)
  origin?: string;                // 원산지 (e.g. 국내산)
  freeShippingThreshold?: number; // 무료배송 기준액 (원)
  giftText?: string;              // 사은품 문구
}

export interface TemplateDetail {
  tone: CopyTone;
  headline: string | null;
  sub: string | null;
}

export interface TemplateCopy {
  isDraft: true;
  recommendedTone: CopyTone;
  eventField: string | null;      // null = no concrete benefit data (#82, omit)
  detail: TemplateDetail[];
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const joinDot = (parts: (string | null | undefined)[]) =>
  parts.map((p) => (p ?? '').trim()).filter(Boolean).join(' · ');

// event_field: only a CONCRETE numeric/benefit fact — never invented.
function buildEventField(i: TemplateCopyInput): string | null {
  if (typeof i.freeShippingThreshold === 'number' && i.freeShippingThreshold > 0) {
    return `${i.freeShippingThreshold.toLocaleString()}원 이상 무료배송`;
  }
  if (i.giftText && i.giftText.trim()) return clean(i.giftText);
  return null; // no benefit data -> omit (do not fabricate)
}

function buildDetail(tone: CopyTone, i: TemplateCopyInput): TemplateDetail {
  const kw = (i.keyword && i.keyword.trim()) || i.name.trim();
  const spec = i.spec?.trim();
  const origin = i.origin?.trim();
  const cat = i.categoryWord?.trim();
  const freeShip = typeof i.freeShippingThreshold === 'number' && i.freeShippingThreshold > 0;

  if (tone === 'benefit') {
    const headline = clean([kw, spec].filter(Boolean).join(' '));
    const subParts = joinDot([spec, freeShip ? '무료배송' : null]);
    return { tone, headline: headline || null, sub: subParts ? clean(`${kw}, ${subParts}`) : null };
  }
  if (tone === 'emotion') {
    const headline = clean(`${kw}로 채우는 하루`);
    const sub = clean(cat ? `${cat} 공간에 어울리는 ${kw}` : `일상에 어울리는 ${kw}`);
    return { tone, headline, sub };
  }
  // trust
  const headline = clean(origin ? `${origin} ${kw}` : kw);
  const subParts = joinDot([origin ? `${origin} 원산지` : null, freeShip ? '무료배송' : null]);
  return { tone, headline: headline || null, sub: subParts || null };
}

/** PURE — instant template draft from product data (no AI, #82-safe). */
export function buildTemplateCopy(input: TemplateCopyInput): TemplateCopy {
  const recommendedTone = classifyCopyTone(input.price, input.categoryPath).tone;
  const tones: CopyTone[] = ['benefit', 'emotion', 'trust'];
  return {
    isDraft: true,
    recommendedTone,
    eventField: buildEventField(input),
    detail: tones.map((t) => buildDetail(t, input)),
  };
}

/**
 * The single-line draft used to prefill the SEO 훅문구 field: the concrete
 * event-field benefit when available, else the recommended tone's headline+sub.
 * Returns '' when there isn't enough data to draft anything.
 */
export function templateHookLine(tc: TemplateCopy): string {
  if (tc.eventField) return tc.eventField;
  const rec = tc.detail.find((d) => d.tone === tc.recommendedTone) ?? tc.detail[0];
  if (!rec) return '';
  return clean([rec.headline, rec.sub].filter(Boolean).join(' — ')).slice(0, 100);
}
