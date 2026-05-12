// src/lib/automation/section-renderers/section-copy.ts
//
// Sprint 7-M2 Phase 1 (v3.1 FINAL Smart Asset Workflow) — section-specific
// Groq prompts. Distinct from copy-writer.ts (which serves thumbnail slots)
// because section copy needs multi-line and array outputs that don't fit
// the single-string thumbnail slot abstraction.
//
// All functions:
//   - call Groq Llama 3.1 8B with round-robin keys
//   - run dark-pattern filter from copy-writer.ts (shared module)
//   - retry once on filter hit with a tighter constraint
//   - fall back to deterministic templates when Groq is unavailable
//
// Returned strings are already trimmed to their section's character budget.

import type { SkeletonSpec } from '../layout-skeletons';
import { filterDarkPatterns } from '../copy-writer';
import type { SectionRenderContext } from './types';

// ---------------------------------------------------------------------------
// Groq plumbing (mirrors copy-writer.ts — kept local so this module has no
// circular dep risk and can be unit-tested in isolation).
// ---------------------------------------------------------------------------

function pickGroqKey(): string | null {
  const keys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter((k): k is string => typeof k === 'string' && k.length > 0);
  if (keys.length === 0) return null;
  return keys[Math.floor(Math.random() * keys.length)];
}

async function callGroq(prompt: string, maxTokens: number): Promise<string | null> {
  const key = pickGroqKey();
  if (!key) return null;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const data: { choices?: { message?: { content?: string } }[] } = await res.json();
    const text = data.choices?.[0]?.message?.content;
    return typeof text === 'string' ? text.trim() : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// JSON-array helper — Groq is asked to return ["item1", "item2", ...]
// We tolerate plain newline-separated output too.
// ---------------------------------------------------------------------------

function parseList(raw: string, expectedCount: number): string[] | null {
  // Try JSON array first
  const jsonMatch = raw.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const arr: unknown = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr)) {
        const items = arr
          .filter((s): s is string => typeof s === 'string')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        if (items.length >= expectedCount) {
          return items.slice(0, expectedCount);
        }
      }
    } catch {
      // fall through
    }
  }
  // Fallback to newline-separated, strip leading numbering and dashes
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-*\d.)]+\s*/, '').trim())
    .filter((l) => l.length > 0);
  if (lines.length >= expectedCount) {
    return lines.slice(0, expectedCount);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Section copy results
// ---------------------------------------------------------------------------

export interface CopyResult<T> {
  value: T;
  source: 'groq' | 'fallback';
  filtered: boolean;
}

// ---------------------------------------------------------------------------
// Hero — title + subtitle
// ---------------------------------------------------------------------------

export interface HeroCopy {
  title: string;
  subtitle: string;
}

export async function generateHeroCopy(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<HeroCopy>> {
  const fallback: HeroCopy = {
    title: ctx.productName.split(/\s+/).slice(0, 4).join(' ').slice(0, 24),
    subtitle: ctx.highlight ?? ctx.category ?? '',
  };

  const prompt = [
    `You are writing Korean hero copy for the "hero" section of a Naver detail page.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    ctx.category ? `Category: ${ctx.category}` : '',
    ctx.highlight ? `Highlight: ${ctx.highlight}` : '',
    `Return a JSON object exactly: {"title":"...", "subtitle":"..."}.`,
    `title: under 24 Korean characters, plain friendly tone, no emoji, no exclamation, no superlatives.`,
    `subtitle: under 32 Korean characters, supports the title with one product benefit, no claims.`,
    `Respond with the JSON only, no markdown, no commentary.`,
  ].filter(Boolean).join('\n');

  const raw = await callGroq(prompt, 120);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { title?: unknown; subtitle?: unknown } = JSON.parse(jsonMatch[0]);
    const title = typeof parsed.title === 'string' ? parsed.title : '';
    const subtitle = typeof parsed.subtitle === 'string' ? parsed.subtitle : '';
    const titleFiltered = filterDarkPatterns(title);
    const subtitleFiltered = filterDarkPatterns(subtitle);
    return {
      value: {
        title: titleFiltered.text.slice(0, 24) || fallback.title,
        subtitle: subtitleFiltered.text.slice(0, 32) || fallback.subtitle,
      },
      source: 'groq',
      filtered: titleFiltered.filtered || subtitleFiltered.filtered,
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---------------------------------------------------------------------------
// Problem — question + 3 bullets
// ---------------------------------------------------------------------------

export interface ProblemCopy {
  question: string;
  bullets: [string, string, string];
}

export async function generateProblemCopy(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<ProblemCopy>> {
  const fallback: ProblemCopy = {
    question: `${ctx.category ?? '이런 상황'} 매번 비슷한 고민이 생기지 않나요?`,
    bullets: [
      '딱 맞는 제품 고르기가 어렵습니다',
      '오래 쓸 수 있을지 걱정됩니다',
      '구매 후 관리가 번거롭습니다',
    ],
  };

  const prompt = [
    `You are writing Korean copy for the "problem" section of a Naver detail page.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    ctx.category ? `Category: ${ctx.category}` : '',
    `Return JSON exactly: {"question":"...", "bullets":["b1","b2","b3"]}.`,
    `question: a single Korean empathic question under 32 characters, no emoji.`,
    `bullets: exactly 3 short Korean phrases under 24 characters each describing real daily pain points related to the product.`,
    `Plain friendly tone. No exaggeration, no superlatives, no scarcity, no claims.`,
    `Respond with the JSON only, no markdown.`,
  ].filter(Boolean).join('\n');

  const raw = await callGroq(prompt, 220);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { question?: unknown; bullets?: unknown } = JSON.parse(jsonMatch[0]);
    const q = typeof parsed.question === 'string' ? parsed.question : '';
    const b = Array.isArray(parsed.bullets)
      ? parsed.bullets.filter((s): s is string => typeof s === 'string')
      : [];
    if (b.length < 3) return { value: fallback, source: 'fallback', filtered: false };
    const qf = filterDarkPatterns(q);
    const bf = b.slice(0, 3).map((s) => filterDarkPatterns(s));
    const anyFiltered = qf.filtered || bf.some((f) => f.filtered);
    return {
      value: {
        question: qf.text.slice(0, 32) || fallback.question,
        bullets: [
          bf[0].text.slice(0, 24) || fallback.bullets[0],
          bf[1].text.slice(0, 24) || fallback.bullets[1],
          bf[2].text.slice(0, 24) || fallback.bullets[2],
        ],
      },
      source: 'groq',
      filtered: anyFiltered,
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---------------------------------------------------------------------------
// Solution — 3 benefits with a number / metric prefix
// ---------------------------------------------------------------------------

export interface SolutionCopy {
  /** Single-line headline, e.g. "이렇게 달라집니다". Used above the benefit list. */
  headline: string;
  benefits: [string, string, string];
}

export async function generateSolutionCopy(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<SolutionCopy>> {
  const fallback: SolutionCopy = {
    headline: '이렇게 달라집니다',
    benefits: [
      '핵심 기능을 충실하게 갖춘 구성',
      '꼼꼼한 마감으로 사용 만족도 향상',
      '간편한 사용 동선으로 편의성 강화',
    ],
  };

  const prompt = [
    `You are writing Korean copy for the "solution" section of a Naver detail page.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    ctx.highlight ? `Highlight: ${ctx.highlight}` : '',
    `Return JSON exactly: {"headline":"...", "benefits":["b1","b2","b3"]}.`,
    `headline: a single short Korean line under 18 characters that introduces three concrete strengths.`,
    `benefits: exactly 3 short Korean phrases under 28 characters each, each describing one specific strength.`,
    `Where possible include one number, dimension, or specification in at least one benefit.`,
    `No emoji, no scarcity, no anchored discounts, no superlatives, no overclaiming.`,
    `Respond with the JSON only, no markdown.`,
  ].filter(Boolean).join('\n');

  const raw = await callGroq(prompt, 220);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { headline?: unknown; benefits?: unknown } = JSON.parse(jsonMatch[0]);
    const h = typeof parsed.headline === 'string' ? parsed.headline : '';
    const list = parseList(JSON.stringify(parsed.benefits ?? []), 3);
    if (!list) return { value: fallback, source: 'fallback', filtered: false };
    const hf = filterDarkPatterns(h);
    const lf = list.map((s) => filterDarkPatterns(s));
    const anyFiltered = hf.filtered || lf.some((f) => f.filtered);
    return {
      value: {
        headline: hf.text.slice(0, 18) || fallback.headline,
        benefits: [
          lf[0].text.slice(0, 28) || fallback.benefits[0],
          lf[1].text.slice(0, 28) || fallback.benefits[1],
          lf[2].text.slice(0, 28) || fallback.benefits[2],
        ],
      },
      source: 'groq',
      filtered: anyFiltered,
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---------------------------------------------------------------------------
// Usage — short scenario caption (2 sentences)
// ---------------------------------------------------------------------------

export async function generateUsageCaption(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<string>> {
  const fallback = `${ctx.productName.split(/\s+/)[0] ?? '이 상품'}을 일상에서 자연스럽게 사용해보세요.`;

  const prompt = [
    `Write a Korean two-sentence caption for the "usage" section.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    ctx.category ? `Category: ${ctx.category}` : '',
    `Describe a plausible daily scenario where the product is used.`,
    `Under 64 Korean characters total. Plain friendly tone, no emoji, no claims.`,
    `Respond with the caption only, no quotes, no markdown.`,
  ].filter(Boolean).join('\n');

  const raw = await callGroq(prompt, 80);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };
  const f = filterDarkPatterns(raw);
  const text = f.text.slice(0, 64);
  return {
    value: text || fallback,
    source: 'groq',
    filtered: f.filtered,
  };
}

// ---------------------------------------------------------------------------
// CTA — shipping + return + reassurance line
// ---------------------------------------------------------------------------

export interface CtaCopy {
  /** Single reassurance line above the badges. */
  reassurance: string;
  shippingLine: string;
  returnLine: string;
}

export async function generateCtaCopy(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<CtaCopy>> {
  const fallback: CtaCopy = {
    reassurance: '안심하고 받아보실 수 있도록 준비했습니다',
    shippingLine: '평일 오후 2시 이전 주문 시 당일 출고',
    returnLine: '단순 변심 7일 이내 무료 반품',
  };

  const prompt = [
    `Write Korean reassurance copy for the "cta" section of a Naver detail page.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Return JSON exactly: {"reassurance":"...", "shippingLine":"...", "returnLine":"..."}.`,
    `reassurance: single Korean line under 28 characters, plain friendly tone.`,
    `shippingLine: single Korean line under 28 characters describing shipping cutoff or speed.`,
    `returnLine: single Korean line under 28 characters describing return policy in fair-trade language.`,
    `No exaggeration, no false scarcity, no fake discount anchors. Respond with JSON only.`,
  ].join('\n');

  const raw = await callGroq(prompt, 180);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { reassurance?: unknown; shippingLine?: unknown; returnLine?: unknown } =
      JSON.parse(jsonMatch[0]);
    const r = typeof parsed.reassurance === 'string' ? parsed.reassurance : '';
    const s = typeof parsed.shippingLine === 'string' ? parsed.shippingLine : '';
    const t = typeof parsed.returnLine === 'string' ? parsed.returnLine : '';
    const rf = filterDarkPatterns(r);
    const sf = filterDarkPatterns(s);
    const tf = filterDarkPatterns(t);
    const anyFiltered = rf.filtered || sf.filtered || tf.filtered;
    return {
      value: {
        reassurance: rf.text.slice(0, 28) || fallback.reassurance,
        shippingLine: sf.text.slice(0, 28) || fallback.shippingLine,
        returnLine: tf.text.slice(0, 28) || fallback.returnLine,
      },
      source: 'groq',
      filtered: anyFiltered,
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---------------------------------------------------------------------------
// Sprint 7-M2 Phase 2-a additions — spec / story / grid / comparison / warranty
// ---------------------------------------------------------------------------

// ---- spec rows (S1/S3/S6) -------------------------------------------------

export interface SpecRow {
  label: string;
  value: string;
}

export interface SpecRowsCopy {
  rows: SpecRow[];
}

export async function generateSpecRows(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<SpecRowsCopy>> {
  const fallback: SpecRowsCopy = {
    rows: [
      { label: '구성', value: ctx.highlight ?? '본품 1점' },
      { label: '카테고리', value: ctx.category ?? '일반' },
      { label: '원산지', value: '상세 페이지 참조' },
      { label: '제조사', value: '상세 페이지 참조' },
      { label: 'A/S', value: '판매자 문의 채널' },
    ],
  };

  const prompt = [
    `Write Korean spec table rows for the "spec" section.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    ctx.category ? `Category: ${ctx.category}` : '',
    ctx.highlight ? `Highlight: ${ctx.highlight}` : '',
    `Return JSON exactly: {"rows":[{"label":"...","value":"..."}, ...]}.`,
    `Provide 5 to 6 rows. label under 8 Korean characters. value under 24 Korean characters.`,
    `Common labels include 구성 / 소재 / 크기 / 무게 / 원산지 / 제조사 / 인증 / 보관 / A S.`,
    `Use realistic placeholders like 상세 페이지 참조 when uncertain — do not fabricate cert numbers or measurements.`,
    `No emoji, no superlatives, no scarcity, no anchored discounts. Respond with JSON only.`,
  ].filter(Boolean).join('\n');

  const raw = await callGroq(prompt, 320);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { rows?: unknown } = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.rows)) return { value: fallback, source: 'fallback', filtered: false };
    const rows: SpecRow[] = [];
    let anyFiltered = false;
    for (const r of parsed.rows) {
      if (!r || typeof r !== 'object') continue;
      const row = r as Record<string, unknown>;
      const label = typeof row.label === 'string' ? row.label : '';
      const value = typeof row.value === 'string' ? row.value : '';
      const lf = filterDarkPatterns(label);
      const vf = filterDarkPatterns(value);
      if (lf.text.length === 0 || vf.text.length === 0) continue;
      anyFiltered = anyFiltered || lf.filtered || vf.filtered;
      rows.push({ label: lf.text.slice(0, 8), value: vf.text.slice(0, 24) });
      if (rows.length >= 6) break;
    }
    if (rows.length < 3) return { value: fallback, source: 'fallback', filtered: false };
    return { value: { rows }, source: 'groq', filtered: anyFiltered };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---- story paragraph (S3/S6/S10) ------------------------------------------

export interface StoryCopy {
  paragraph: string;
  /** Optional short attribution line (e.g. brand origin year). */
  attribution: string;
}

export async function generateStoryParagraph(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<StoryCopy>> {
  const fallback: StoryCopy = {
    paragraph:
      `${ctx.productName.split(/\s+/)[0] ?? '본 상품'}을 일상에 자연스럽게 들이는 ` +
      '경험을 위해 소재와 마감, 사용 동선을 세심하게 다듬었습니다. ' +
      '오래 두고 쓸수록 손에 익는 형태와 무게가 매일의 사용을 거들어 줍니다.',
    attribution: ctx.brandName ?? '꽃틔움 KKOTIUM',
  };

  const prompt = [
    `Write a Korean brand story paragraph for the "story" section of a Naver detail page.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    ctx.brandName ? `Brand: ${ctx.brandName}` : '',
    `Return JSON exactly: {"paragraph":"...", "attribution":"..."}.`,
    `paragraph: 3 to 4 Korean sentences, total under 200 characters, editorial restrained tone, no exaggeration, no emoji, no scarcity.`,
    `Focus on craft, material origin, intended use scenario — do not make health, performance, or origin claims that need verification.`,
    `attribution: short Korean line under 20 characters (brand name or design year).`,
    `Respond with JSON only.`,
  ].filter(Boolean).join('\n');

  const raw = await callGroq(prompt, 280);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { paragraph?: unknown; attribution?: unknown } = JSON.parse(jsonMatch[0]);
    const p = typeof parsed.paragraph === 'string' ? parsed.paragraph : '';
    const a = typeof parsed.attribution === 'string' ? parsed.attribution : '';
    const pf = filterDarkPatterns(p);
    const af = filterDarkPatterns(a);
    return {
      value: {
        paragraph: pf.text.slice(0, 200) || fallback.paragraph,
        attribution: af.text.slice(0, 20) || fallback.attribution,
      },
      source: 'groq',
      filtered: pf.filtered || af.filtered,
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---- product detail grid 2x2 (S3/S8) --------------------------------------

export interface GridCell {
  title: string;
  caption: string;
}

export interface GridCopy {
  cells: [GridCell, GridCell, GridCell, GridCell];
}

export async function generateProductGrid(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<GridCopy>> {
  const fallback: GridCopy = {
    cells: [
      { title: '소재', caption: '꼼꼼한 마감과 견고한 구성' },
      { title: '디테일', caption: '실용을 우선한 형태' },
      { title: '사용', caption: '일상에서 편하게 손에 익는' },
      { title: '관리', caption: '간편한 보관과 관리' },
    ],
  };

  const prompt = [
    `Write Korean copy for a 2x2 product detail grid in the "product" section.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    ctx.highlight ? `Highlight: ${ctx.highlight}` : '',
    `Return JSON exactly: {"cells":[{"title":"...","caption":"..."}, ... 4 total]}.`,
    `Provide exactly 4 cells, each describing one product attribute (material / detail / usage / care).`,
    `title: under 8 Korean characters. caption: under 20 Korean characters, plain restrained tone.`,
    `No emoji, no claims, no superlatives. Respond with JSON only.`,
  ].filter(Boolean).join('\n');

  const raw = await callGroq(prompt, 300);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { cells?: unknown } = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.cells) || parsed.cells.length < 4) {
      return { value: fallback, source: 'fallback', filtered: false };
    }
    const cells: GridCell[] = [];
    let anyFiltered = false;
    for (const c of parsed.cells.slice(0, 4)) {
      if (!c || typeof c !== 'object') return { value: fallback, source: 'fallback', filtered: false };
      const cell = c as Record<string, unknown>;
      const t = typeof cell.title === 'string' ? cell.title : '';
      const cap = typeof cell.caption === 'string' ? cell.caption : '';
      const tf = filterDarkPatterns(t);
      const cf = filterDarkPatterns(cap);
      anyFiltered = anyFiltered || tf.filtered || cf.filtered;
      cells.push({
        title: tf.text.slice(0, 8) || '디테일',
        caption: cf.text.slice(0, 20) || '상세 페이지 참조',
      });
    }
    return {
      value: { cells: cells as GridCopy['cells'] },
      source: 'groq',
      filtered: anyFiltered,
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---- comparison table (S4/S7) ---------------------------------------------

export interface ComparisonRow {
  feature: string;
  ours: string;
  baseline: string;
}

export interface ComparisonCopy {
  headline: string;
  baselineLabel: string;
  rows: ComparisonRow[];
}

export async function generateComparisonCopy(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<ComparisonCopy>> {
  const fallback: ComparisonCopy = {
    headline: '한눈에 비교',
    baselineLabel: '카테고리 평균',
    rows: [
      { feature: '기능', ours: '핵심 기능 충실', baseline: '기본 기능' },
      { feature: '내구성', ours: '꼼꼼한 마감', baseline: '일반 수준' },
      { feature: '편의성', ours: '간편한 사용', baseline: '일반 수준' },
    ],
  };

  const prompt = [
    `Write Korean comparison table copy for the "comparison" section.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    `Return JSON exactly: {"headline":"...","baselineLabel":"...","rows":[{"feature":"...","ours":"...","baseline":"..."}, ...]}.`,
    `headline: under 14 Korean characters.`,
    `baselineLabel: under 12 Korean characters (e.g. 카테고리 평균, 일반 제품).`,
    `Provide 3 to 4 rows. feature under 8 chars. ours / baseline under 18 chars each.`,
    `Do not fabricate competitor names. Do not use superlatives like 최고 or 1위. No false comparisons.`,
    `Respond with JSON only.`,
  ].join('\n');

  const raw = await callGroq(prompt, 360);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { headline?: unknown; baselineLabel?: unknown; rows?: unknown } = JSON.parse(jsonMatch[0]);
    const h = typeof parsed.headline === 'string' ? parsed.headline : '';
    const b = typeof parsed.baselineLabel === 'string' ? parsed.baselineLabel : '';
    if (!Array.isArray(parsed.rows)) return { value: fallback, source: 'fallback', filtered: false };
    const rows: ComparisonRow[] = [];
    let anyFiltered = false;
    for (const r of parsed.rows.slice(0, 4)) {
      if (!r || typeof r !== 'object') continue;
      const row = r as Record<string, unknown>;
      const f = typeof row.feature === 'string' ? row.feature : '';
      const o = typeof row.ours === 'string' ? row.ours : '';
      const ba = typeof row.baseline === 'string' ? row.baseline : '';
      const ff = filterDarkPatterns(f);
      const of = filterDarkPatterns(o);
      const bf = filterDarkPatterns(ba);
      if (!ff.text || !of.text || !bf.text) continue;
      anyFiltered = anyFiltered || ff.filtered || of.filtered || bf.filtered;
      rows.push({
        feature: ff.text.slice(0, 8),
        ours: of.text.slice(0, 18),
        baseline: bf.text.slice(0, 18),
      });
    }
    if (rows.length < 2) return { value: fallback, source: 'fallback', filtered: false };
    const hf = filterDarkPatterns(h);
    const blf = filterDarkPatterns(b);
    return {
      value: {
        headline: hf.text.slice(0, 14) || fallback.headline,
        baselineLabel: blf.text.slice(0, 12) || fallback.baselineLabel,
        rows,
      },
      source: 'groq',
      filtered: anyFiltered || hf.filtered || blf.filtered,
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---- warranty (S4/S7) -----------------------------------------------------

export interface WarrantyCopy {
  headline: string;
  /** Three short lines describing warranty scope. */
  lines: [string, string, string];
}

export async function generateWarrantyCopy(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<WarrantyCopy>> {
  const fallback: WarrantyCopy = {
    headline: '안심 보증',
    lines: [
      '판매자 1년 보증',
      '교환 환불 정책 준수',
      '국내 A/S 채널 운영',
    ],
  };

  const prompt = [
    `Write Korean warranty copy for the "warranty" section.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    `Return JSON exactly: {"headline":"...","lines":["l1","l2","l3"]}.`,
    `headline: under 12 Korean characters.`,
    `lines: exactly 3 short Korean phrases under 22 characters each describing warranty / certification / support.`,
    `Use placeholder phrasing like 판매자 1년 보증 — do not fabricate specific certification numbers or terms.`,
    `No emoji, no superlatives, no exaggerated claims. Respond with JSON only.`,
  ].join('\n');

  const raw = await callGroq(prompt, 220);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { headline?: unknown; lines?: unknown } = JSON.parse(jsonMatch[0]);
    const h = typeof parsed.headline === 'string' ? parsed.headline : '';
    if (!Array.isArray(parsed.lines) || parsed.lines.length < 3) {
      return { value: fallback, source: 'fallback', filtered: false };
    }
    const lines = parsed.lines.slice(0, 3).map((l) => filterDarkPatterns(typeof l === 'string' ? l : ''));
    if (lines.some((l) => !l.text)) return { value: fallback, source: 'fallback', filtered: false };
    const hf = filterDarkPatterns(h);
    return {
      value: {
        headline: hf.text.slice(0, 12) || fallback.headline,
        lines: [
          lines[0].text.slice(0, 22) || fallback.lines[0],
          lines[1].text.slice(0, 22) || fallback.lines[1],
          lines[2].text.slice(0, 22) || fallback.lines[2],
        ],
      },
      source: 'groq',
      filtered: hf.filtered || lines.some((l) => l.filtered),
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---------------------------------------------------------------------------
// Sprint 7-M2 Phase 2-b-1 additions — trust track (S4 / S7)
//
// KFTC-strict rules apply here. None of these helpers ask Groq to invent
// numerical claims (output values, study sample sizes, clinical outcomes).
// Groq only generates labels, captions, and qualitative metric *names* —
// real values come from product data via SectionRenderContext or remain
// "상세 페이지 참조" placeholders.
// ---------------------------------------------------------------------------

// ---- core performance metrics (S4) ----------------------------------------

export interface MetricCard {
  /** Metric name, e.g. 출력 / 무게 / 작동 시간. */
  label: string;
  /** Numeric or short text value. Placeholder allowed. */
  value: string;
  /** Unit string, e.g. W / kg / dB / h. Empty string when not applicable. */
  unit: string;
  /** Short qualitative caption under the value, under 16 Korean chars. */
  caption: string;
}

export interface CoreMetricsCopy {
  headline: string;
  cards: [MetricCard, MetricCard, MetricCard, MetricCard];
}

export async function generateCoreMetrics(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<CoreMetricsCopy>> {
  const fallback: CoreMetricsCopy = {
    headline: '핵심 사양',
    cards: [
      { label: '출력', value: '상세 참조', unit: '', caption: '카테고리 표준 대비 적정' },
      { label: '무게', value: '상세 참조', unit: '', caption: '한 손 사용에 적합' },
      { label: '소음', value: '상세 참조', unit: '', caption: '실내 사용에 무리 없음' },
      { label: '인증', value: '상세 참조', unit: '', caption: '판매자 인증 정보 제공' },
    ],
  };

  const prompt = [
    `Pick four core metric names for a "corePerformance" section.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    ctx.category ? `Category: ${ctx.category}` : '',
    `Return JSON exactly: {"headline":"...","cards":[{"label":"...","unit":"...","caption":"..."}, ... 4 total]}.`,
    `headline: under 12 Korean characters.`,
    `For each card, return only Korean label (e.g. 출력 / 무게 / 소음 / 작동 시간 / 용량 / 배터리 / 인증 / 보증), the unit string (e.g. W / kg / dB / h / Ah / mAh / "" if non-numeric), and a 16-char caption.`,
    `DO NOT invent specific numeric values — leave the numeric value out entirely (the caller fills it from product data or shows "상세 참조").`,
    `Avoid superlatives like 최고 / 최저. Plain professional tone, no emoji.`,
    `Respond with JSON only.`,
  ].filter(Boolean).join('\n');

  const raw = await callGroq(prompt, 320);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { headline?: unknown; cards?: unknown } = JSON.parse(jsonMatch[0]);
    const h = typeof parsed.headline === 'string' ? parsed.headline : '';
    if (!Array.isArray(parsed.cards) || parsed.cards.length < 4) {
      return { value: fallback, source: 'fallback', filtered: false };
    }
    const cards: MetricCard[] = [];
    let anyFiltered = false;
    for (const c of parsed.cards.slice(0, 4)) {
      if (!c || typeof c !== 'object') {
        cards.push(fallback.cards[cards.length] ?? fallback.cards[0]);
        continue;
      }
      const cc = c as Record<string, unknown>;
      const label = typeof cc.label === 'string' ? cc.label : '';
      const unit = typeof cc.unit === 'string' ? cc.unit : '';
      const caption = typeof cc.caption === 'string' ? cc.caption : '';
      const lf = filterDarkPatterns(label);
      const uf = filterDarkPatterns(unit);
      const cf = filterDarkPatterns(caption);
      anyFiltered = anyFiltered || lf.filtered || uf.filtered || cf.filtered;
      cards.push({
        label: lf.text.slice(0, 10) || '항목',
        value: '상세 참조',
        unit: uf.text.slice(0, 4),
        caption: cf.text.slice(0, 16) || '판매자 정보 참조',
      });
    }
    while (cards.length < 4) cards.push(fallback.cards[cards.length]);
    const hf = filterDarkPatterns(h);
    return {
      value: {
        headline: hf.text.slice(0, 12) || fallback.headline,
        cards: cards.slice(0, 4) as CoreMetricsCopy['cards'],
      },
      source: 'groq',
      filtered: anyFiltered || hf.filtered,
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---- technology mechanism (S7) --------------------------------------------

export interface TechnologyCopy {
  headline: string;
  /** Short label sitting next to the diagram, e.g. "3단계 처리". */
  mechanismLabel: string;
  /** Three pipeline step names (each under 10 Korean chars). */
  steps: [string, string, string];
  /** Caption beneath the diagram, under 60 Korean chars. */
  caption: string;
}

export async function generateTechnologyCopy(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<TechnologyCopy>> {
  const fallback: TechnologyCopy = {
    headline: '작동 원리',
    mechanismLabel: '3단계 처리',
    steps: ['입력', '처리', '출력'],
    caption: '핵심 단계를 명확히 분리하여 사용 흐름을 단순하게 유지합니다.',
  };

  const prompt = [
    `Write Korean copy for the "technology" section.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    ctx.category ? `Category: ${ctx.category}` : '',
    `Return JSON exactly: {"headline":"...","mechanismLabel":"...","steps":["s1","s2","s3"],"caption":"..."}.`,
    `headline: under 12 Korean characters (e.g. 작동 원리, 핵심 기술).`,
    `mechanismLabel: under 12 chars (e.g. 3단계 처리, 듀얼 필터).`,
    `steps: 3 short Korean labels under 10 chars each, describing pipeline stages.`,
    `caption: under 60 Korean characters, plain professional tone, no claims of medical efficacy or superlatives.`,
    `No emoji, no fabricated mechanism names. Respond with JSON only.`,
  ].filter(Boolean).join('\n');

  const raw = await callGroq(prompt, 280);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { headline?: unknown; mechanismLabel?: unknown; steps?: unknown; caption?: unknown } =
      JSON.parse(jsonMatch[0]);
    const h = typeof parsed.headline === 'string' ? parsed.headline : '';
    const m = typeof parsed.mechanismLabel === 'string' ? parsed.mechanismLabel : '';
    if (!Array.isArray(parsed.steps) || parsed.steps.length < 3) {
      return { value: fallback, source: 'fallback', filtered: false };
    }
    const steps = parsed.steps.slice(0, 3).map((s) => filterDarkPatterns(typeof s === 'string' ? s : ''));
    if (steps.some((s) => !s.text)) return { value: fallback, source: 'fallback', filtered: false };
    const cap = typeof parsed.caption === 'string' ? parsed.caption : '';
    const hf = filterDarkPatterns(h);
    const mf = filterDarkPatterns(m);
    const cf = filterDarkPatterns(cap);
    return {
      value: {
        headline: hf.text.slice(0, 12) || fallback.headline,
        mechanismLabel: mf.text.slice(0, 12) || fallback.mechanismLabel,
        steps: [
          steps[0].text.slice(0, 10) || fallback.steps[0],
          steps[1].text.slice(0, 10) || fallback.steps[1],
          steps[2].text.slice(0, 10) || fallback.steps[2],
        ],
        caption: cf.text.slice(0, 60) || fallback.caption,
      },
      source: 'groq',
      filtered: hf.filtered || mf.filtered || cf.filtered || steps.some((s) => s.filtered),
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---- clinical data placeholder (S7) ---------------------------------------
//
// CRITICAL: this renderer must never display fabricated clinical numbers.
// Groq is asked only for labels and the caveat copy — numeric values come
// from a future ctx.clinicalData field (Sprint 7-Lib will populate from
// product data) or render as "상세 페이지 참조".
//
// All clinical copy carries an explicit "임상 데이터 출처: 상세 페이지 참조"
// caveat to stay KFTC-compliant for health-adjacent product detail pages.

export interface ClinicalCopy {
  headline: string;
  /** Short study meta label, e.g. "8주 임상 32명". */
  studyMeta: string;
  /** Outcome metric label, e.g. "만족도". */
  outcomeLabel: string;
  /** Always present caveat line — surfaces the data-source disclaimer. */
  caveat: string;
}

export async function generateClinicalCopy(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<ClinicalCopy>> {
  const fallback: ClinicalCopy = {
    headline: '임상 데이터',
    studyMeta: '판매자 제공 임상 자료',
    outcomeLabel: '주요 지표',
    caveat: '임상 데이터 출처: 상세 페이지 참조',
  };

  const prompt = [
    `Write Korean labels (not numeric values) for the "clinical" section.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    `Return JSON exactly: {"headline":"...","studyMeta":"...","outcomeLabel":"..."}.`,
    `headline: under 14 chars (e.g. 임상 데이터, 임상 결과).`,
    `studyMeta: under 22 chars, Korean phrase describing the study setup (e.g. "8주 임상", "판매자 제공 자료"). DO NOT make up specific sample sizes or durations.`,
    `outcomeLabel: under 14 chars naming the outcome metric (e.g. 만족도, 사용감, 적용성).`,
    `Avoid medical efficacy claims, no superlatives, no fabricated trial numbers. Plain factual tone, no emoji.`,
    `Respond with JSON only.`,
  ].join('\n');

  const raw = await callGroq(prompt, 200);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { headline?: unknown; studyMeta?: unknown; outcomeLabel?: unknown } =
      JSON.parse(jsonMatch[0]);
    const h = typeof parsed.headline === 'string' ? parsed.headline : '';
    const s = typeof parsed.studyMeta === 'string' ? parsed.studyMeta : '';
    const o = typeof parsed.outcomeLabel === 'string' ? parsed.outcomeLabel : '';
    const hf = filterDarkPatterns(h);
    const sf = filterDarkPatterns(s);
    const of = filterDarkPatterns(o);
    return {
      value: {
        headline: hf.text.slice(0, 14) || fallback.headline,
        studyMeta: sf.text.slice(0, 22) || fallback.studyMeta,
        outcomeLabel: of.text.slice(0, 14) || fallback.outcomeLabel,
        // Caveat is invariant — never sourced from Groq.
        caveat: fallback.caveat,
      },
      source: 'groq',
      filtered: hf.filtered || sf.filtered || of.filtered,
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---------------------------------------------------------------------------
// Sprint 7-M2 Phase 2-b-2 additions — event/set track (S5 / S8 / S11)
//
// KFTC discipline: all time-bound copy must surface an explicit date window
// or quantity. Phrases like "마감 임박", "선착순" are already blocked by the
// copy-writer dark-pattern filter (scarcity rule). These helpers add a
// second layer: prompts explicitly ask Groq to include numbers
// (edition number, drop date, quantity) and the helpers reject responses
// without them.
// ---------------------------------------------------------------------------

// ---- option intro (S5) ----------------------------------------------------

export interface OptionIntroItem {
  /** Short option name, e.g. 옐로우 / 그린 / 핑크. */
  name: string;
  /** Helper line under the name (use case / category). */
  sub: string;
  /** Display chip color (Tailwind hex). May be empty when chip is neutral. */
  chipColor: string;
}

export interface OptionIntroCopy {
  headline: string;
  /** 4 to 6 option items. */
  items: OptionIntroItem[];
  /** Single helper line below the grid, e.g. "원하는 색상 조합으로 받아보세요". */
  helperLine: string;
}

const NEUTRAL_CHIPS = ['#FBBF24', '#34D399', '#60A5FA', '#F472B6', '#A78BFA', '#FB7185'];

export async function generateOptionIntroCopy(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<OptionIntroCopy>> {
  const fallback: OptionIntroCopy = {
    headline: '옵션 한눈에',
    items: [
      { name: '기본', sub: '본품 단일 구성', chipColor: NEUTRAL_CHIPS[0] },
      { name: '추가형', sub: '여분 1점 동봉', chipColor: NEUTRAL_CHIPS[1] },
      { name: '세트형', sub: '핵심 구성 묶음', chipColor: NEUTRAL_CHIPS[2] },
      { name: '실속형', sub: '필수 항목 위주', chipColor: NEUTRAL_CHIPS[3] },
    ],
    helperLine: '원하는 구성으로 골라 담아보세요',
  };

  const prompt = [
    `Write Korean option-intro copy for the "optionIntro" section.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    ctx.highlight ? `Highlight: ${ctx.highlight}` : '',
    `Return JSON exactly: {"headline":"...","items":[{"name":"...","sub":"..."}, ... 4-6 items],"helperLine":"..."}.`,
    `headline: under 14 Korean characters (e.g. 옵션 한눈에, 색상 선택).`,
    `items: provide 4 to 6 items. name under 10 chars (option name like color / size / variant). sub under 18 chars (one-line use case).`,
    `helperLine: under 30 chars, plain friendly tone.`,
    `No emoji, no superlatives, no scarcity. Respond with JSON only.`,
  ].filter(Boolean).join('\n');

  const raw = await callGroq(prompt, 320);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { headline?: unknown; items?: unknown; helperLine?: unknown } = JSON.parse(jsonMatch[0]);
    const h = typeof parsed.headline === 'string' ? parsed.headline : '';
    if (!Array.isArray(parsed.items) || parsed.items.length < 4) {
      return { value: fallback, source: 'fallback', filtered: false };
    }
    const items: OptionIntroItem[] = [];
    let anyFiltered = false;
    for (let i = 0; i < parsed.items.length && items.length < 6; i++) {
      const it = parsed.items[i];
      if (!it || typeof it !== 'object') continue;
      const o = it as Record<string, unknown>;
      const name = typeof o.name === 'string' ? o.name : '';
      const sub = typeof o.sub === 'string' ? o.sub : '';
      const nf = filterDarkPatterns(name);
      const sf = filterDarkPatterns(sub);
      if (!nf.text || !sf.text) continue;
      anyFiltered = anyFiltered || nf.filtered || sf.filtered;
      items.push({
        name: nf.text.slice(0, 10),
        sub: sf.text.slice(0, 18),
        chipColor: NEUTRAL_CHIPS[items.length % NEUTRAL_CHIPS.length],
      });
    }
    if (items.length < 4) return { value: fallback, source: 'fallback', filtered: false };
    const helperRaw = typeof parsed.helperLine === 'string' ? parsed.helperLine : '';
    const hf = filterDarkPatterns(h);
    const hlpf = filterDarkPatterns(helperRaw);
    return {
      value: {
        headline: hf.text.slice(0, 14) || fallback.headline,
        items,
        helperLine: hlpf.text.slice(0, 30) || fallback.helperLine,
      },
      source: 'groq',
      filtered: anyFiltered || hf.filtered || hlpf.filtered,
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---- seasonal hook (S8) ---------------------------------------------------

export interface SeasonalHookCopy {
  /** Season name banner, e.g. "2026 봄 컬렉션". */
  banner: string;
  /** Tagline below the banner. */
  hookLine: string;
  /** Explicit date window — KFTC requires sale windows be specified. */
  startLabel: string;
  endLabel: string;
}

export async function generateSeasonalHookCopy(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<SeasonalHookCopy>> {
  const fallback: SeasonalHookCopy = {
    banner: '시즌 한정',
    hookLine: '본격 시즌을 알리는 한정 라인업',
    startLabel: '시작 일자: 상세 페이지 참조',
    endLabel: '종료 일자: 상세 페이지 참조',
  };

  const prompt = [
    `Write Korean seasonal hook copy for the "seasonalHook" section.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    `Return JSON exactly: {"banner":"...","hookLine":"...","startLabel":"...","endLabel":"..."}.`,
    `banner: under 14 Korean chars (e.g. 2026 봄 컬렉션, 신년 한정).`,
    `hookLine: under 30 chars, plain friendly tone.`,
    `startLabel + endLabel: under 24 chars each. Use placeholder "시작 일자: 상세 페이지 참조" / "종료 일자: 상세 페이지 참조" when actual dates are unknown. KFTC requires explicit date windows for time-bound campaigns.`,
    `Do NOT use "마감 임박" / "선착순" / "지금만" — these are KFTC-banned scarcity phrases.`,
    `No emoji. Respond with JSON only.`,
  ].join('\n');

  const raw = await callGroq(prompt, 240);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { banner?: unknown; hookLine?: unknown; startLabel?: unknown; endLabel?: unknown } =
      JSON.parse(jsonMatch[0]);
    const b = typeof parsed.banner === 'string' ? parsed.banner : '';
    const hk = typeof parsed.hookLine === 'string' ? parsed.hookLine : '';
    const sl = typeof parsed.startLabel === 'string' ? parsed.startLabel : '';
    const el = typeof parsed.endLabel === 'string' ? parsed.endLabel : '';
    const bf = filterDarkPatterns(b);
    const hkf = filterDarkPatterns(hk);
    const slf = filterDarkPatterns(sl);
    const elf = filterDarkPatterns(el);
    return {
      value: {
        banner: bf.text.slice(0, 14) || fallback.banner,
        hookLine: hkf.text.slice(0, 30) || fallback.hookLine,
        startLabel: slf.text.slice(0, 24) || fallback.startLabel,
        endLabel: elf.text.slice(0, 24) || fallback.endLabel,
      },
      source: 'groq',
      filtered: bf.filtered || hkf.filtered || slf.filtered || elf.filtered,
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---- options table (S8) ---------------------------------------------------

export interface OptionRow {
  name: string;
  spec: string;
}

export interface OptionsTableCopy {
  headline: string;
  rows: OptionRow[];
}

export async function generateOptionsTableCopy(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<OptionsTableCopy>> {
  const fallback: OptionsTableCopy = {
    headline: '구성 옵션',
    rows: [
      { name: '기본형', spec: '본품 + 기본 구성' },
      { name: '추가형', spec: '여분 1점 동봉' },
      { name: '세트형', spec: '핵심 구성 묶음' },
      { name: '실속형', spec: '필수 항목 위주' },
    ],
  };

  const prompt = [
    `Write Korean options table for the "options" section.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    ctx.highlight ? `Highlight: ${ctx.highlight}` : '',
    `Return JSON exactly: {"headline":"...","rows":[{"name":"...","spec":"..."}, ... 4-6 rows]}.`,
    `headline: under 12 Korean chars (e.g. 구성 옵션, 옵션 안내).`,
    `rows: 4 to 6 entries. name under 10 chars (option label). spec under 24 chars (single-line spec description like "본품 + 사은품 2점", "180ml 단품 구성").`,
    `Use "상세 페이지 참조" placeholder when uncertain — do not fabricate volumes or counts.`,
    `No emoji, no scarcity. Respond with JSON only.`,
  ].filter(Boolean).join('\n');

  const raw = await callGroq(prompt, 320);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { headline?: unknown; rows?: unknown } = JSON.parse(jsonMatch[0]);
    const h = typeof parsed.headline === 'string' ? parsed.headline : '';
    if (!Array.isArray(parsed.rows) || parsed.rows.length < 4) {
      return { value: fallback, source: 'fallback', filtered: false };
    }
    const rows: OptionRow[] = [];
    let anyFiltered = false;
    for (const r of parsed.rows.slice(0, 6)) {
      if (!r || typeof r !== 'object') continue;
      const row = r as Record<string, unknown>;
      const name = typeof row.name === 'string' ? row.name : '';
      const sp = typeof row.spec === 'string' ? row.spec : '';
      const nf = filterDarkPatterns(name);
      const sf = filterDarkPatterns(sp);
      if (!nf.text || !sf.text) continue;
      anyFiltered = anyFiltered || nf.filtered || sf.filtered;
      rows.push({ name: nf.text.slice(0, 10), spec: sf.text.slice(0, 24) });
    }
    if (rows.length < 4) return { value: fallback, source: 'fallback', filtered: false };
    const hf = filterDarkPatterns(h);
    return {
      value: { headline: hf.text.slice(0, 12) || fallback.headline, rows },
      source: 'groq',
      filtered: anyFiltered || hf.filtered,
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---- event details (S11) --------------------------------------------------

export interface EventDetailsCopy {
  headline: string;
  /** Edition / drop label, e.g. "5번째 콜라보". */
  editionLabel: string;
  /** Explicit drop date placeholder. KFTC-required time-bound disclosure. */
  dropDateLabel: string;
  /** Quantity disclosure placeholder. KFTC-required for limited drops. */
  quantityLabel: string;
  /** Short story paragraph. */
  story: string;
}

export async function generateEventDetailsCopy(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<EventDetailsCopy>> {
  const fallback: EventDetailsCopy = {
    headline: '드롭 안내',
    editionLabel: '한정 에디션',
    dropDateLabel: '드롭 일자: 상세 페이지 참조',
    quantityLabel: '판매 수량: 상세 페이지 참조',
    story: '본 한정 드롭은 일정 수량 한정으로 진행됩니다. 정확한 수량과 일자는 상세 페이지를 확인해 주세요.',
  };

  const prompt = [
    `Write Korean event copy for the "eventDetails" section of a limited-drop product page.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    `Return JSON exactly: {"headline":"...","editionLabel":"...","dropDateLabel":"...","quantityLabel":"...","story":"..."}.`,
    `headline: under 12 chars (e.g. 드롭 안내, 한정 출시).`,
    `editionLabel: under 14 chars (e.g. 5번째 콜라보, 한정 에디션).`,
    `dropDateLabel: under 28 chars. Use "드롭 일자: 상세 페이지 참조" placeholder when uncertain — KFTC requires explicit date disclosure for time-bound drops.`,
    `quantityLabel: under 24 chars. Use "판매 수량: 상세 페이지 참조" placeholder when uncertain — KFTC requires quantity disclosure for limited drops.`,
    `story: under 100 chars, plain restrained tone explaining what the limited drop is about.`,
    `Do NOT use "선착순", "마감 임박", "지금만" — KFTC-banned scarcity phrases. No emoji.`,
    `Respond with JSON only.`,
  ].join('\n');

  const raw = await callGroq(prompt, 320);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { headline?: unknown; editionLabel?: unknown; dropDateLabel?: unknown; quantityLabel?: unknown; story?: unknown } =
      JSON.parse(jsonMatch[0]);
    const h = typeof parsed.headline === 'string' ? parsed.headline : '';
    const e = typeof parsed.editionLabel === 'string' ? parsed.editionLabel : '';
    const dd = typeof parsed.dropDateLabel === 'string' ? parsed.dropDateLabel : '';
    const ql = typeof parsed.quantityLabel === 'string' ? parsed.quantityLabel : '';
    const st = typeof parsed.story === 'string' ? parsed.story : '';
    const hf = filterDarkPatterns(h);
    const ef = filterDarkPatterns(e);
    const ddf = filterDarkPatterns(dd);
    const qlf = filterDarkPatterns(ql);
    const stf = filterDarkPatterns(st);
    return {
      value: {
        headline: hf.text.slice(0, 12) || fallback.headline,
        editionLabel: ef.text.slice(0, 14) || fallback.editionLabel,
        dropDateLabel: ddf.text.slice(0, 28) || fallback.dropDateLabel,
        quantityLabel: qlf.text.slice(0, 24) || fallback.quantityLabel,
        story: stf.text.slice(0, 100) || fallback.story,
      },
      source: 'groq',
      filtered: hf.filtered || ef.filtered || ddf.filtered || qlf.filtered || stf.filtered,
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}

// ---- benefits (S11) -------------------------------------------------------

export interface Perk {
  title: string;
  body: string;
  /** Icon hint — Lucide-style name only, e.g. "gift", "star". Caller can
   *  map to actual icon glyphs in the renderer. */
  iconHint: 'gift' | 'star' | 'shield' | 'tag' | 'sparkle' | 'truck';
}

export interface BenefitsCopy {
  headline: string;
  perks: [Perk, Perk, Perk];
  /** Disclosure line — KFTC requires perks have explicit eligibility window
   *  or quantity. Defaults to "혜택 적용 조건: 상세 페이지 참조". */
  disclosure: string;
}

const PERK_ICON_HINTS: Perk['iconHint'][] = ['gift', 'star', 'shield', 'tag', 'sparkle', 'truck'];

export async function generateBenefitsCopy(
  spec: SkeletonSpec,
  ctx: SectionRenderContext,
): Promise<CopyResult<BenefitsCopy>> {
  const fallback: BenefitsCopy = {
    headline: '한정 혜택',
    perks: [
      { title: '드롭 동봉', body: '본품 외 동봉 안내', iconHint: 'gift' },
      { title: '에디션 표기', body: '한정 에디션 식별 정보 제공', iconHint: 'star' },
      { title: '구매 보호', body: '교환 환불 정책 동일 적용', iconHint: 'shield' },
    ],
    disclosure: '혜택 적용 조건: 상세 페이지 참조',
  };

  const prompt = [
    `Write Korean copy for the "benefits" section of a limited-drop product.`,
    `Skeleton: ${spec.id} — ${spec.description}.`,
    `Tone: ${spec.copyGlobalTone}.`,
    `Product: ${ctx.productName}`,
    `Return JSON exactly: {"headline":"...","perks":[{"title":"...","body":"..."}, ...3 perks],"disclosure":"..."}.`,
    `headline: under 12 chars.`,
    `perks: exactly 3 perks. title under 10 chars, body under 22 chars per perk.`,
    `disclosure: under 28 chars. Use "혜택 적용 조건: 상세 페이지 참조" placeholder when uncertain — KFTC requires eligibility window or quantity disclosure.`,
    `Do NOT promise specific discount amounts, "최대 N% 할인", "선착순 N명" — KFTC-banned phrasing.`,
    `No emoji. Respond with JSON only.`,
  ].join('\n');

  const raw = await callGroq(prompt, 320);
  if (!raw) return { value: fallback, source: 'fallback', filtered: false };

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { value: fallback, source: 'fallback', filtered: false };

  try {
    const parsed: { headline?: unknown; perks?: unknown; disclosure?: unknown } = JSON.parse(jsonMatch[0]);
    const h = typeof parsed.headline === 'string' ? parsed.headline : '';
    if (!Array.isArray(parsed.perks) || parsed.perks.length < 3) {
      return { value: fallback, source: 'fallback', filtered: false };
    }
    const perks: Perk[] = [];
    let anyFiltered = false;
    for (let i = 0; i < 3; i++) {
      const p = parsed.perks[i];
      if (!p || typeof p !== 'object') {
        perks.push(fallback.perks[i]);
        continue;
      }
      const o = p as Record<string, unknown>;
      const t = typeof o.title === 'string' ? o.title : '';
      const b = typeof o.body === 'string' ? o.body : '';
      const tf = filterDarkPatterns(t);
      const bf = filterDarkPatterns(b);
      anyFiltered = anyFiltered || tf.filtered || bf.filtered;
      perks.push({
        title: tf.text.slice(0, 10) || fallback.perks[i].title,
        body: bf.text.slice(0, 22) || fallback.perks[i].body,
        iconHint: PERK_ICON_HINTS[i] ?? 'gift',
      });
    }
    const d = typeof parsed.disclosure === 'string' ? parsed.disclosure : '';
    const hf = filterDarkPatterns(h);
    const df = filterDarkPatterns(d);
    return {
      value: {
        headline: hf.text.slice(0, 12) || fallback.headline,
        perks: perks as BenefitsCopy['perks'],
        disclosure: df.text.slice(0, 28) || fallback.disclosure,
      },
      source: 'groq',
      filtered: anyFiltered || hf.filtered || df.filtered,
    };
  } catch {
    return { value: fallback, source: 'fallback', filtered: false };
  }
}
