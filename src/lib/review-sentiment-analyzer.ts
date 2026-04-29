// src/lib/review-sentiment-analyzer.ts
// E-11: AI Review Sentiment Analyzer + SEO Tag Recycler
// Analyzes pasted reviews (competitor / wholesale text / customer reviews)
// → returns sentiment distribution, top keywords, suggested SEO tags, strengths, pain points
// Uses Groq round-robin (3 keys) → Gemini fallback → Anthropic last resort
// Cost: 0 KRW (Groq free tier 14,400/day per key)

// ── Types ─────────────────────────────────────────────────────────────────────

export type Sentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export interface KeywordWithSentiment {
  keyword: string;
  frequency: number;          // 1~N — how often it appeared in reviews
  sentiment: Sentiment;       // overall sentiment of contexts where this keyword appeared
}

export interface SentimentResult {
  // Aggregate sentiment distribution
  overallSentiment: Sentiment;
  positiveRatio: number;       // 0~100
  negativeRatio: number;       // 0~100
  neutralRatio: number;        // 0~100

  // Keyword extraction
  topKeywords: KeywordWithSentiment[];   // up to 12, sorted by frequency

  // SEO tag suggestions (ready to apply directly)
  suggestedTags: string[];      // up to 10, Korean, 2~6 chars each, no duplicates

  // Insights
  strengths: string[];          // up to 4 — what customers love (Korean phrases)
  painPoints: string[];         // up to 4 — what customers complain about (Korean phrases)
  aiSummary: string;            // 1~2 sentence Korean summary

  // Metadata
  reviewCount: number;          // how many reviews were analyzed
  provider: string;             // which AI provider responded
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildAnalysisPrompt(reviews: string[], productName?: string): string {
  const numbered = reviews
    .map((r, i) => `${i + 1}. ${r.trim()}`)
    .join('\n');
  const productContext = productName
    ? `\nTarget product: ${productName}\n`
    : '';

  return `You are a Korean e-commerce review analysis expert specializing in Naver Smart Store SEO.
${productContext}
Analyze the following ${reviews.length} customer reviews (or product description text) and extract actionable SEO insights.

Reviews:
${numbered}

Analysis rules:
- Extract Korean keywords that real shoppers actually use (no English brand names unless universal)
- Suggested SEO tags must be 2~6 Korean characters each, no duplicates, search-friendly
- Strengths and pain points should be specific (e.g. "포장이 꼼꼼하다" not "좋다")
- Sentiment classification: POSITIVE = clear satisfaction, NEGATIVE = clear complaint, NEUTRAL = factual/mixed
- aiSummary: 1~2 Korean sentences, concrete and actionable for the seller

Respond ONLY with raw JSON (no markdown, no code fences). First char must be {.
{
  "overallSentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  "positiveRatio": <integer 0-100>,
  "negativeRatio": <integer 0-100>,
  "neutralRatio": <integer 0-100>,
  "topKeywords": [
    { "keyword": "...", "frequency": <integer>, "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL" }
  ],
  "suggestedTags": ["...", "..."],
  "strengths": ["...", "..."],
  "painPoints": ["...", "..."],
  "aiSummary": "..."
}

The three ratios MUST sum to 100. topKeywords max 12. suggestedTags max 10. strengths/painPoints max 4 each.`;
}

// ── JSON parser (shared pattern with ai-generate) ────────────────────────────

function parseJsonSafe(text: string): unknown {
  let t = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1) t = t.slice(start, end + 1);

  // Try parsing directly first
  try {
    return JSON.parse(t);
  } catch {
    // Cleanup common LLM JSON mistakes (especially from llama-3.1-8b-instant):
    // - trailing commas before } or ]
    // - smart/curly quotes
    // - control characters that break JSON
    const cleaned = t
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\x00-\x1F\x7F]/g, '');
    return JSON.parse(cleaned);
  }
}

// ── Result validation + normalization ────────────────────────────────────────

function normalizeResult(raw: unknown, reviewCount: number, provider: string): SentimentResult {
  const r = (raw ?? {}) as Record<string, unknown>;

  const validSentiment = (s: unknown): Sentiment => {
    const v = String(s ?? 'NEUTRAL').toUpperCase();
    if (v === 'POSITIVE' || v === 'NEGATIVE' || v === 'NEUTRAL') return v;
    return 'NEUTRAL';
  };

  const clampPercent = (n: unknown): number => {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(100, Math.round(v)));
  };

  let positiveRatio = clampPercent(r.positiveRatio);
  let negativeRatio = clampPercent(r.negativeRatio);
  let neutralRatio = clampPercent(r.neutralRatio);

  // Force ratios to sum to 100 (rounding correction)
  const total = positiveRatio + negativeRatio + neutralRatio;
  if (total === 0) {
    neutralRatio = 100;
  } else if (total !== 100) {
    // Distribute the diff to the largest bucket
    const diff = 100 - total;
    if (positiveRatio >= negativeRatio && positiveRatio >= neutralRatio) {
      positiveRatio = Math.max(0, positiveRatio + diff);
    } else if (negativeRatio >= neutralRatio) {
      negativeRatio = Math.max(0, negativeRatio + diff);
    } else {
      neutralRatio = Math.max(0, neutralRatio + diff);
    }
  }

  const rawKw = Array.isArray(r.topKeywords) ? r.topKeywords : [];
  const topKeywords: KeywordWithSentiment[] = rawKw
    .filter((k): k is Record<string, unknown> => k !== null && typeof k === 'object')
    .map(k => ({
      keyword: String(k.keyword ?? '').trim(),
      frequency: Math.max(1, Math.round(Number(k.frequency) || 1)),
      sentiment: validSentiment(k.sentiment),
    }))
    .filter(k => k.keyword.length > 0 && k.keyword.length <= 20)
    .slice(0, 12);

  const rawTags = Array.isArray(r.suggestedTags) ? r.suggestedTags : [];
  const seenTags = new Set<string>();
  const suggestedTags: string[] = [];
  for (const t of rawTags) {
    const tag = String(t ?? '').trim().replace(/^#/, '');
    if (tag.length >= 2 && tag.length <= 8 && !seenTags.has(tag)) {
      seenTags.add(tag);
      suggestedTags.push(tag);
      if (suggestedTags.length >= 10) break;
    }
  }

  const sanitizeStringArray = (arr: unknown, max: number): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map(s => String(s ?? '').trim())
      .filter(s => s.length > 0 && s.length <= 80)
      .slice(0, max);
  };

  return {
    overallSentiment: validSentiment(r.overallSentiment),
    positiveRatio,
    negativeRatio,
    neutralRatio,
    topKeywords,
    suggestedTags,
    strengths: sanitizeStringArray(r.strengths, 4),
    painPoints: sanitizeStringArray(r.painPoints, 4),
    aiSummary: String(r.aiSummary ?? '').trim().slice(0, 300),
    reviewCount,
    provider,
  };
}

// ── AI provider calls ────────────────────────────────────────────────────────

async function callGroqWithKey(prompt: string, apiKey: string): Promise<unknown> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'Output ONLY raw JSON. First char must be {, last must be }. No markdown, no code fences.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      // Korean tokens are ~60% as dense as English. JSON output with up to 12 keywords + 10 tags + 4 strengths/painPoints + summary easily exceeds 1500 — use 2500 to prevent mid-response truncation
      max_tokens: 2500,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  return parseJsonSafe(data.choices?.[0]?.message?.content ?? '');
}

async function callGroq(prompt: string): Promise<unknown> {
  const keys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean) as string[];
  if (keys.length === 0) throw new Error('GROQ_API_KEY not set');

  let lastErr = '';
  for (const key of keys) {
    try {
      return await callGroqWithKey(prompt, key);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      // Retry on rate/quota, auth errors, AND JSON parse failures — a single bad response shouldn't kill the chain
      if (
        lastErr.includes('429') || lastErr.includes('rate') || lastErr.includes('quota') ||
        lastErr.includes('401') || lastErr.includes('403') ||
        lastErr.includes('JSON') || lastErr.includes('Expected') || lastErr.includes('Unexpected')
      ) {
        console.warn(`[review-analyzer] Groq key ...${key.slice(-6)} failed (${lastErr.slice(0, 40)}), trying next`);
        continue;
      }
      throw e;
    }
  }
  throw new Error(`Groq: all keys failed (${lastErr.slice(0, 60)})`);
}

async function callGeminiWithKey(prompt: string, apiKey: string): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'Output ONLY raw JSON. First char must be {, last must be }.' }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2500,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const parts: { text?: string; thought?: boolean }[] = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter(p => !p.thought).map(p => p.text ?? '').join('').trim();
  return parseJsonSafe(text);
}

async function callGemini(prompt: string): Promise<unknown> {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];
  if (keys.length === 0) throw new Error('GEMINI_API_KEY not set');

  let lastErr = '';
  for (const key of keys) {
    try {
      return await callGeminiWithKey(prompt, key);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (lastErr.includes('429') || lastErr.includes('quota') || lastErr.includes('403')) {
        console.warn(`[review-analyzer] Gemini key ...${key.slice(-6)} quota, trying next`);
        continue;
      }
      throw e;
    }
  }
  throw new Error(`Gemini: all keys failed (${lastErr.slice(0, 60)})`);
}

async function callAnthropic(prompt: string): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      system: 'Output ONLY raw JSON. First char must be {, last must be }.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return parseJsonSafe(data.content?.[0]?.text ?? '');
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function analyzeReviewSentiment(
  reviews: string[],
  productName?: string,
): Promise<SentimentResult> {
  // Filter and limit input
  const cleanReviews = reviews
    .map(r => String(r ?? '').trim())
    .filter(r => r.length >= 5 && r.length <= 800)   // skip very short or absurdly long
    .slice(0, 50);                                    // hard cap at 50 reviews

  if (cleanReviews.length === 0) {
    throw new Error('분석할 리뷰 텍스트가 없습니다 (5자 이상 필요)');
  }

  const prompt = buildAnalysisPrompt(cleanReviews, productName);

  // Provider priority: Groq (free, fast) → Gemini → Anthropic
  const hasGroq = !!(process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_2 || process.env.GROQ_API_KEY_3);
  if (hasGroq) {
    try {
      const raw = await callGroq(prompt);
      return normalizeResult(raw, cleanReviews.length, 'groq-llama3');
    } catch (e) {
      console.warn('[review-analyzer] All Groq keys failed, trying Gemini:', e instanceof Error ? e.message.slice(0, 80) : e);
    }
  }

  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3);
  if (hasGemini) {
    try {
      const raw = await callGemini(prompt);
      return normalizeResult(raw, cleanReviews.length, 'gemini-2.0-flash');
    } catch (e) {
      console.warn('[review-analyzer] All Gemini keys failed, trying Anthropic:', e instanceof Error ? e.message.slice(0, 80) : e);
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const raw = await callAnthropic(prompt);
    return normalizeResult(raw, cleanReviews.length, 'claude-sonnet');
  }

  throw new Error('AI API 키가 모두 실패했습니다. GROQ_API_KEY를 확인해주세요.');
}

// ── Color/style helpers for UI ───────────────────────────────────────────────

export function getSentimentColor(sentiment: Sentiment): { bg: string; text: string; border: string } {
  switch (sentiment) {
    case 'POSITIVE': return { bg: '#F0FDF4', text: '#15803d', border: '#86efac' };
    case 'NEGATIVE': return { bg: '#FEF2F2', text: '#b91c1c', border: '#fca5a5' };
    case 'NEUTRAL':  return { bg: '#F3F4F6', text: '#4b5563', border: '#d1d5db' };
  }
}

export function getSentimentLabel(sentiment: Sentiment): string {
  switch (sentiment) {
    case 'POSITIVE': return '긍정';
    case 'NEGATIVE': return '부정';
    case 'NEUTRAL':  return '중립';
  }
}
