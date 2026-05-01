// src/lib/upload-readiness-filler.ts
// E-15 Block A: AI auto-fill engine for upload readiness items.
// Covers ONLY items where AI can produce safe, meaningful suggestions.
// Items NOT auto-filled (main_image, extra_images, shipping_template, net_margin)
// are deliberately excluded — those require seller manual input.
//
// Provider chain mirrors review-sentiment-analyzer.ts:
//   Groq round-robin (3 keys, 401/403/JSON fallback) → Gemini → Anthropic
//
// Safety guards (all enforced):
//   1. Korean-only output validation
//   2. Length clamps (product name 25~50, keywords 2~10, tags 2~6)
//   3. ABUSE_WORDS rejection (17-word blacklist)
//   4. 3+ repeat detection
//   5. Category answers MUST map to NAVER_CATEGORIES_FULL — never AI-invented codes
//   6. parseJsonSafe handles trailing comma + smart quotes + control chars
//   7. Returns null on validation fail (caller treats as "not improved")

import { ABUSE_WORDS, type ReadinessItemId } from './upload-readiness';
import { NAVER_CATEGORIES_FULL, type NaverCategoryEntry } from './naver/naver-categories-full';

// ── Auto-fillable subset of readiness items (7 of 11) ────────────────────────
export const AUTOFILLABLE_ITEMS = [
  'name_length',
  'no_abuse',
  'no_repeat',
  'keyword_in_front',
  'keywords_count',
  'tags_count',
  'category',
] as const;
export type AutoFillableItemId = typeof AUTOFILLABLE_ITEMS[number];

export const NON_AUTOFILLABLE_ITEMS = [
  'main_image',
  'extra_images',
  'shipping_template',
  'net_margin',
] as const;
export type NonAutoFillableItemId = typeof NON_AUTOFILLABLE_ITEMS[number];

// ── Input + output types ─────────────────────────────────────────────────────
export interface AutoFillInput {
  productId: string;
  productName?: string | null;
  productDescription?: string | null;
  naverCategoryCode?: string | null;
  naverCategoryName?: string | null; // optional d1>d2>d3 path
  currentKeywords?: string[];
  currentTags?: string[];
  // Optional context (not used in prompts, but kept for future)
  salePrice?: number;
  supplierPrice?: number;
}

export interface AutoFillSuggestion {
  itemId: AutoFillableItemId;
  before: string | string[] | null;
  after: string | string[];
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  provider: string;
}

// ── Validation helpers ───────────────────────────────────────────────────────
function isKoreanText(s: string): boolean {
  // Allow Korean + spaces + numbers + basic punctuation. Reject if too many ASCII letters.
  // Up to 30% ASCII letters tolerated (for product codes, sizes like "XL", etc.)
  const asciiLetters = (s.match(/[a-zA-Z]/g) ?? []).length;
  const total = s.length;
  return asciiLetters / Math.max(total, 1) <= 0.30;
}

function containsAbuse(s: string): boolean {
  const lower = s.toLowerCase();
  return ABUSE_WORDS.some(w => lower.includes(w.toLowerCase()));
}

function hasRepeat3Plus(s: string): boolean {
  const wordFreq: Record<string, number> = {};
  s.replace(/[^\w\s가-힣]/g, ' ').split(/\s+/).forEach(w => {
    if (w.length > 1) wordFreq[w] = (wordFreq[w] ?? 0) + 1;
  });
  return Object.values(wordFreq).some(c => c >= 3);
}

function clampLen(s: string, min: number, max: number): boolean {
  return s.length >= min && s.length <= max;
}

// ── Safe JSON parsing (mirrors review-sentiment-analyzer pattern) ────────────
function parseJsonSafe(text: string): unknown {
  let t = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1) t = t.slice(start, end + 1);
  try {
    return JSON.parse(t);
  } catch {
    // Cleanup common LLM JSON mistakes (especially from llama-3.1-8b-instant):
    // trailing commas before } or ], smart/curly quotes, control characters
    const cleaned = t
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\x00-\x1F\x7F]/g, '');
    return JSON.parse(cleaned);
  }
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
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  return parseJsonSafe(data.choices?.[0]?.message?.content ?? '');
}

async function callGroq(prompt: string): Promise<{ raw: unknown; provider: string }> {
  const keys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean) as string[];
  if (keys.length === 0) throw new Error('GROQ_API_KEY not set');

  let lastErr = '';
  for (const key of keys) {
    try {
      const raw = await callGroqWithKey(prompt, key);
      return { raw, provider: 'groq-llama3' };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      // Retry on rate/quota, auth errors, AND JSON parse failures
      if (
        lastErr.includes('429') || lastErr.includes('rate') || lastErr.includes('quota') ||
        lastErr.includes('401') || lastErr.includes('403') ||
        lastErr.includes('JSON') || lastErr.includes('Expected') || lastErr.includes('Unexpected')
      ) {
        console.warn(`[readiness-filler] Groq key ...${key.slice(-6)} failed (${lastErr.slice(0, 40)}), trying next`);
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
      generationConfig: { temperature: 0.3, maxOutputTokens: 1500, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const parts: { text?: string; thought?: boolean }[] = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter(p => !p.thought).map(p => p.text ?? '').join('').trim();
  return parseJsonSafe(text);
}

async function callGemini(prompt: string): Promise<{ raw: unknown; provider: string }> {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];
  if (keys.length === 0) throw new Error('GEMINI_API_KEY not set');

  let lastErr = '';
  for (const key of keys) {
    try {
      const raw = await callGeminiWithKey(prompt, key);
      return { raw, provider: 'gemini-2.0-flash' };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (lastErr.includes('429') || lastErr.includes('quota') || lastErr.includes('403')) {
        console.warn(`[readiness-filler] Gemini key ...${key.slice(-6)} quota, trying next`);
        continue;
      }
      throw e;
    }
  }
  throw new Error(`Gemini: all keys failed (${lastErr.slice(0, 60)})`);
}

async function callAnthropic(prompt: string): Promise<{ raw: unknown; provider: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: 'Output ONLY raw JSON. First char must be {, last must be }.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return { raw: parseJsonSafe(data.content?.[0]?.text ?? ''), provider: 'claude-sonnet' };
}

async function callAi(prompt: string): Promise<{ raw: unknown; provider: string }> {
  // Provider priority: Groq (free, fast) → Gemini → Anthropic
  const hasGroq = !!(process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_2 || process.env.GROQ_API_KEY_3);
  if (hasGroq) {
    try {
      return await callGroq(prompt);
    } catch (e) {
      console.warn('[readiness-filler] All Groq keys failed, trying Gemini:', e instanceof Error ? e.message.slice(0, 80) : e);
    }
  }
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_3);
  if (hasGemini) {
    try {
      return await callGemini(prompt);
    } catch (e) {
      console.warn('[readiness-filler] All Gemini keys failed, trying Anthropic:', e instanceof Error ? e.message.slice(0, 80) : e);
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return await callAnthropic(prompt);
  }
  throw new Error('AI 키가 모두 실패했습니다. GROQ_API_KEY를 확인해주세요.');
}

// ── 1. autoFillProductName (4 modes) ─────────────────────────────────────────
type ProductNameMode = 'length' | 'abuse' | 'repeat' | 'frontKeyword';

const PRODUCT_NAME_MODE_GUIDE: Record<ProductNameMode, string> = {
  length: '현재 상품명이 길이 25~50자 범위 밖입니다. 25~50자로 다시 작성하되 검색 의도를 그대로 보존하세요.',
  abuse: '현재 상품명에 어뷰징 의심 단어(특가/최저가/할인 등)가 들어 있습니다. 자연스럽게 제거한 새 상품명을 작성하세요.',
  repeat: '현재 상품명에 동일 단어가 3회 이상 반복됩니다. 의미를 유지하면서 반복 단어를 다양화하세요.',
  frontKeyword: '핵심 키워드를 상품명 앞 15자 안에 포함시키도록 다시 작성하세요. 검색 가중치가 가장 큰 위치입니다.',
};

export async function autoFillProductName(
  input: AutoFillInput,
  mode: ProductNameMode,
): Promise<AutoFillSuggestion | null> {
  const currentName = (input.productName ?? '').trim();
  if (!currentName) return null;

  const keywordsText = (input.currentKeywords ?? []).filter(Boolean).slice(0, 8).join(', ');
  const categoryText = input.naverCategoryName ?? '(카테고리 없음)';
  const guide = PRODUCT_NAME_MODE_GUIDE[mode];
  const itemId: AutoFillableItemId =
    mode === 'length' ? 'name_length' :
    mode === 'abuse' ? 'no_abuse' :
    mode === 'repeat' ? 'no_repeat' : 'keyword_in_front';

  const prompt = `당신은 네이버 스마트스토어 SEO 전문가입니다.
다음 상품의 상품명을 ${mode} 모드로 보강해주세요.

현재 상품명: "${currentName}"
카테고리: ${categoryText}
키워드 후보: ${keywordsText || '(없음)'}

요구사항: ${guide}

엄격한 규칙:
- 한국어로만 작성 (영문 브랜드명 등 보편적 표기는 일부 허용)
- 길이 25~50자 사이 (공백 포함)
- 절대 금지 단어: 무료배송, 최저가, 특가, 할인, 세일, 긴급, 한정, 품절임박, 마감임박, 무조건, 보장, 100%, 완전무료, 대박, 초특가, 역대급, 레전드
- 동일 단어 3회 이상 반복 금지
- 마케팅 미사여구 금지 (예: "정말", "진짜")
- 따옴표 없이 상품명 본문만 응답 안에 넣으세요

응답은 JSON 한 개만 반환하세요. 첫 글자는 {, 마지막은 }.
{
  "newName": "...",
  "reason": "이렇게 변경한 이유 한 문장 한국어"
}`;

  const { raw, provider } = await callAi(prompt);
  const r = (raw ?? {}) as Record<string, unknown>;
  const newName = String(r.newName ?? '').trim().replace(/^["']|["']$/g, '');
  const reason = String(r.reason ?? '').trim();

  // Validation gauntlet — fail fast on any rule violation
  if (!newName) return null;
  if (!isKoreanText(newName)) return null;
  if (!clampLen(newName, 25, 50)) return null;
  if (containsAbuse(newName)) return null;
  if (hasRepeat3Plus(newName)) return null;
  if (newName === currentName) return null; // no change → skip

  // For frontKeyword mode, verify keyword is in first 15 chars
  if (mode === 'frontKeyword') {
    const front15 = newName.slice(0, 15).toLowerCase();
    const kws = (input.currentKeywords ?? []).filter(Boolean);
    if (kws.length > 0 && !kws.some(kw => front15.includes(kw.toLowerCase().trim()))) {
      return null;
    }
  }

  return {
    itemId,
    before: currentName,
    after: newName,
    reason: reason || PRODUCT_NAME_MODE_GUIDE[mode],
    confidence: 'high',
    provider,
  };
}

// ── 2. autoFillKeywords ──────────────────────────────────────────────────────
export async function autoFillKeywords(
  input: AutoFillInput,
): Promise<AutoFillSuggestion | null> {
  const currentName = (input.productName ?? '').trim();
  if (!currentName) return null;

  const currentKws = (input.currentKeywords ?? []).filter(Boolean);
  const categoryText = input.naverCategoryName ?? '(카테고리 없음)';

  const prompt = `당신은 네이버 스마트스토어 SEO 키워드 전문가입니다.
다음 상품의 검색 키워드 8개를 추천해주세요. 실제 구매자가 네이버에 검색할 만한 단어여야 합니다.

상품명: "${currentName}"
카테고리: ${categoryText}
현재 키워드: ${currentKws.length > 0 ? currentKws.join(', ') : '(없음)'}

엄격한 규칙:
- 한국어 키워드만 (영문 브랜드명 일부 허용)
- 길이 2~10자 (예: "꽃 인테리어", "선물용품")
- 어뷰징 단어 금지 (특가/최저가/할인/세일 등)
- 중복 금지
- 너무 일반적인 단어 금지 (예: "상품", "물건")
- 검색량 있을 만한 실제 구매자 언어

응답은 JSON 한 개만 반환하세요. 첫 글자는 {, 마지막은 }.
{
  "keywords": ["키워드1", "키워드2", "...", "키워드8"],
  "reason": "이 키워드들을 선택한 이유 한 문장 한국어"
}`;

  const { raw, provider } = await callAi(prompt);
  const r = (raw ?? {}) as Record<string, unknown>;
  const rawKws = Array.isArray(r.keywords) ? r.keywords : [];

  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const k of rawKws) {
    const kw = String(k ?? '').trim().replace(/^#/, '');
    if (!kw) continue;
    if (kw.length < 2 || kw.length > 10) continue;
    if (containsAbuse(kw)) continue;
    if (!isKoreanText(kw)) continue;
    if (seen.has(kw)) continue;
    seen.add(kw);
    keywords.push(kw);
    if (keywords.length >= 10) break;
  }

  // Need at least 5 valid keywords to pass keywords_count
  if (keywords.length < 5) return null;

  const reason = String(r.reason ?? '').trim();

  return {
    itemId: 'keywords_count',
    before: currentKws,
    after: keywords,
    reason: reason || '검색량 높은 한국어 키워드 8개를 추천했습니다.',
    confidence: 'high',
    provider,
  };
}

// ── 3. autoFillSeoTags ───────────────────────────────────────────────────────
export async function autoFillSeoTags(
  input: AutoFillInput,
): Promise<AutoFillSuggestion | null> {
  const currentName = (input.productName ?? '').trim();
  if (!currentName) return null;

  const currentTags = (input.currentTags ?? []).filter(Boolean);
  const categoryText = input.naverCategoryName ?? '(카테고리 없음)';
  const kwsText = (input.currentKeywords ?? []).filter(Boolean).slice(0, 8).join(', ');

  const prompt = `당신은 네이버 스마트스토어 SEO 태그 전문가입니다.
다음 상품의 검색 태그 12개를 추천해주세요. 태그는 키워드보다 더 짧고, 실제 구매자가 쓰는 자연스러운 표현입니다.

상품명: "${currentName}"
카테고리: ${categoryText}
키워드: ${kwsText || '(없음)'}
현재 태그: ${currentTags.length > 0 ? currentTags.join(', ') : '(없음)'}

엄격한 규칙:
- 한국어 태그만
- 길이 2~6자 (예: "선물용", "고급", "모던")
- 중복 금지
- 어뷰징 단어 금지
- 구매자 언어 (예: "선물용", "감각적", "고급스러움" 처럼 실제 사용 어휘)
- # 기호 빼고 텍스트만

응답은 JSON 한 개만 반환하세요. 첫 글자는 {, 마지막은 }.
{
  "tags": ["태그1", "태그2", "...", "태그12"],
  "reason": "이 태그들을 선택한 이유 한 문장 한국어"
}`;

  const { raw, provider } = await callAi(prompt);
  const r = (raw ?? {}) as Record<string, unknown>;
  const rawTags = Array.isArray(r.tags) ? r.tags : [];

  const seen = new Set<string>();
  const tags: string[] = [];
  for (const t of rawTags) {
    const tag = String(t ?? '').trim().replace(/^#/, '');
    if (!tag) continue;
    if (tag.length < 2 || tag.length > 6) continue;
    if (containsAbuse(tag)) continue;
    if (!isKoreanText(tag)) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= 12) break;
  }

  // Need at least 10 valid tags to pass tags_count
  if (tags.length < 10) return null;

  const reason = String(r.reason ?? '').trim();

  return {
    itemId: 'tags_count',
    before: currentTags,
    after: tags,
    reason: reason || '구매자 언어 기반 12개 태그를 추천했습니다.',
    confidence: 'high',
    provider,
  };
}

// ── 4. autoFillCategory ──────────────────────────────────────────────────────
// AI suggests d1>d2>d3 path, then we map to NAVER_CATEGORIES_FULL.
// If no match found in 4,993 entries, fallback to d1-level low-confidence guess.
// NEVER returns AI-invented codes.
export async function autoFillCategory(
  input: AutoFillInput,
): Promise<AutoFillSuggestion | null> {
  const currentName = (input.productName ?? '').trim();
  if (!currentName) return null;

  const d1List = Array.from(new Set(NAVER_CATEGORIES_FULL.map(c => c.d1)));

  const prompt = `당신은 네이버 스마트스토어 카테고리 분류 전문가입니다.
다음 상품에 가장 적합한 네이버 카테고리를 d1>d2>d3 경로로 추천해주세요.

상품명: "${currentName}"
${input.productDescription ? `상품 설명: "${input.productDescription.slice(0, 200)}"` : ''}

가능한 d1 카테고리 목록 (정확히 이 중에서만 선택):
${d1List.join(' / ')}

엄격한 규칙:
- 반드시 위 d1 목록에서만 d1을 고르세요
- d2, d3는 자연스러운 한국어 카테고리명을 추천하세요 (네이버 실제 분류와 유사하게)
- 새 카테고리를 만들지 마세요
- 추측이 어려우면 가장 큰 범주만 정확히 답하세요

응답은 JSON 한 개만 반환하세요. 첫 글자는 {, 마지막은 }.
{
  "d1": "...",
  "d2": "...",
  "d3": "...",
  "reason": "이 카테고리를 선택한 이유 한 문장 한국어"
}`;

  const { raw, provider } = await callAi(prompt);
  const r = (raw ?? {}) as Record<string, unknown>;
  const d1 = String(r.d1 ?? '').trim();
  const d2 = String(r.d2 ?? '').trim();
  const d3 = String(r.d3 ?? '').trim();
  const reason = String(r.reason ?? '').trim();

  if (!d1) return null;
  if (!d1List.includes(d1)) return null; // AI invented d1 → reject

  // Filter to d1, then score by d2/d3 substring match against name
  const candidates = NAVER_CATEGORIES_FULL.filter(c => c.d1 === d1);
  if (candidates.length === 0) return null;

  function score(entry: NaverCategoryEntry): number {
    let s = 0;
    const lname = currentName.toLowerCase();
    if (d2 && entry.d2.includes(d2)) s += 50;
    if (d2 && d2.includes(entry.d2)) s += 30;
    if (d3 && entry.d3.includes(d3)) s += 70;
    if (d3 && d3.includes(entry.d3) && entry.d3.length >= 2) s += 40;
    if (entry.d3 && lname.includes(entry.d3.toLowerCase())) s += 20;
    if (entry.d4 && lname.includes(entry.d4.toLowerCase())) s += 25;
    if (entry.d3) s += 5;
    if (entry.d4) s += 5;
    return s;
  }

  const sorted = candidates
    .map(c => ({ entry: c, s: score(c) }))
    .sort((a, b) => b.s - a.s);

  const best = sorted[0];

  // Issue #5 fix (2026-05-01): Reject d1-level fallback when no confident d2/d3 match.
  // Previous behavior picked the first d3 of d1 candidates, which produced nonsensical
  // mappings (toilet pump -> DVD/documentary, women pajamas -> men underwear/running).
  // Better to leave category empty and let seller pick manually than suggest a wrong one.
  if (!best || best.s < 50) {
    return null;
  }

  // Issue #2 fix (2026-05-01): Reject when AI recommends the same code as current.
  // A non-default code that happens to equal the current one provides no value to the
  // seller and inflates the applied count without changing the score.
  if (input.naverCategoryCode && best.entry.code === input.naverCategoryCode) {
    return null;
  }

  // Issue #5 extra defense (2026-05-01): Reject when the matched category name has no
  // token overlap with the product name. AI may have hallucinated a d2/d3 path that
  // happens to score >= 50 by coincidence (e.g. shared common syllables), but the actual
  // category content is unrelated to the product.
  const lowerName = currentName.toLowerCase();
  const matchedCategoryText = `${best.entry.d2} ${best.entry.d3 ?? ''} ${best.entry.d4 ?? ''}`.toLowerCase();
  const productTokens = lowerName.split(/[\s/,()-]+/).filter(t => t.length >= 2);
  const hasAnyOverlap = productTokens.some(token =>
    matchedCategoryText.includes(token) || token.includes(best.entry.d2.toLowerCase())
  );
  // Also accept if AI's reasoning explicitly mentions a key category word
  const reasonHasCategoryHint = reason && (
    reason.includes(best.entry.d2) ||
    (best.entry.d3 && reason.includes(best.entry.d3))
  );
  if (!hasAnyOverlap && !reasonHasCategoryHint && best.s < 90) {
    return null;
  }

  const confidence: AutoFillSuggestion['confidence'] =
    best.s >= 100 ? 'high' :
    best.s >= 70 ? 'medium' : 'low';

  return {
    itemId: 'category',
    before: input.naverCategoryCode ?? null,
    after: best.entry.code,
    reason: `${reason || 'AI 추천'} → ${best.entry.fullPath} (코드 ${best.entry.code})`,
    confidence,
    provider,
  };
}

// ── 5. autoFillAll (bulk caller) ─────────────────────────────────────────────
// Calls the appropriate autoFill* function for each requested item.
// Returns suggestions only for items where AI produced valid output.
// Sequential for product-name modes (share input), parallel for others.
export async function autoFillAll(
  input: AutoFillInput,
  items: AutoFillableItemId[],
): Promise<AutoFillSuggestion[]> {
  const suggestions: AutoFillSuggestion[] = [];

  // Group: name_length / no_abuse / no_repeat / keyword_in_front share product name input
  const nameItems = items.filter(i =>
    i === 'name_length' || i === 'no_abuse' || i === 'no_repeat' || i === 'keyword_in_front'
  );

  for (const item of nameItems) {
    const mode: ProductNameMode =
      item === 'name_length' ? 'length' :
      item === 'no_abuse' ? 'abuse' :
      item === 'no_repeat' ? 'repeat' : 'frontKeyword';
    try {
      const s = await autoFillProductName(input, mode);
      if (s) suggestions.push(s);
    } catch (e) {
      console.warn(`[readiness-filler] autoFillProductName(${mode}) failed:`, e instanceof Error ? e.message.slice(0, 80) : e);
    }
  }

  // Run keywords / tags / category in parallel — independent inputs
  const others: Promise<AutoFillSuggestion | null>[] = [];
  if (items.includes('keywords_count')) {
    others.push(autoFillKeywords(input).catch(e => {
      console.warn('[readiness-filler] keywords failed:', e instanceof Error ? e.message.slice(0, 80) : e);
      return null;
    }));
  }
  if (items.includes('tags_count')) {
    others.push(autoFillSeoTags(input).catch(e => {
      console.warn('[readiness-filler] tags failed:', e instanceof Error ? e.message.slice(0, 80) : e);
      return null;
    }));
  }
  if (items.includes('category')) {
    others.push(autoFillCategory(input).catch(e => {
      console.warn('[readiness-filler] category failed:', e instanceof Error ? e.message.slice(0, 80) : e);
      return null;
    }));
  }

  const results = await Promise.all(others);
  for (const r of results) {
    if (r) suggestions.push(r);
  }

  return suggestions;
}

// ── Helper: partition failed readiness items into auto vs manual ─────────────
export function partitionReadinessItems(
  failedItemIds: ReadinessItemId[],
): { autofillable: AutoFillableItemId[]; nonAutofillable: NonAutoFillableItemId[] } {
  const autofillable: AutoFillableItemId[] = [];
  const nonAutofillable: NonAutoFillableItemId[] = [];
  for (const id of failedItemIds) {
    if ((AUTOFILLABLE_ITEMS as readonly string[]).includes(id)) {
      autofillable.push(id as AutoFillableItemId);
    } else if ((NON_AUTOFILLABLE_ITEMS as readonly string[]).includes(id)) {
      nonAutofillable.push(id as NonAutoFillableItemId);
    }
  }
  return { autofillable, nonAutofillable };
}
