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
