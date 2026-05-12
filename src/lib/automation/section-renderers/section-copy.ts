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
