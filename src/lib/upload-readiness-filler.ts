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

중요 카테고리 분류 가이드 (반드시 따를 것):
- 잠옷/홈웨어/파자마/내복/내의/속옷/언더웨어 단어가 들어간 상품 → 절대 "여성의류 > 니트" 또는 "여성의류 > 스웨터" 같은 일반 의류 카테고리로 분류하지 마세요. 반드시 "여성언더웨어/잠옷" 또는 "남성언더웨어/잠옷" d2를 선택하고, d3는 "잠옷/홈웨어" 또는 "시즌성내의"를 선택하세요.
- 니트/스웨터 텍스처여도 잠옷·홈웨어 용도면 "여성언더웨어/잠옷 > 잠옷/홈웨어"가 정답입니다.
- 변기펌프/뚫어뻥/배수구 도구 → "생활/건강 > 생활용품 > 욕실용품" 계열을 우선 검토하세요. "DVD" 같은 무관 카테고리에 절대 매핑하지 마세요.
- 차량용 햇빛가리개/카커튼/선바이저 → "생활/건강 > 자동차용품 > 인테리어용품" 또는 "익스테리어용품" d3를 우선 검토하세요. "편의용품" d3가 아닙니다 (편의용품은 가습기·청소기·면도기 등).
- 가습기 → "디지털/가전 > 계절가전 > 가습기" d3 안에서 가열식/초음파식/가습기필터 중 가장 가까운 d4 선택.

Few-shot 예시 (이 형식과 정확도를 따르세요):
예시 1) 상품명: "리본 포인트 홈웨어 잠옷세트"
  → d1: "패션의류", d2: "여성언더웨어/잠옷", d3: "잠옷/홈웨어"
  reason: "홈웨어 잠옷세트는 여성언더웨어/잠옷 카테고리의 잠옷/홈웨어 d3가 정확합니다."

예시 2) 상품명: "하트 리본 누빔 여성 파자마 세트"
  → d1: "패션의류", d2: "여성언더웨어/잠옷", d3: "잠옷/홈웨어"
  reason: "파자마 세트는 잠옷/홈웨어 d3에 해당합니다. 니트/스웨터 카테고리가 아닙니다."

예시 3) 상품명: "인테리어 미니 가습기 사무실 탁상"
  → d1: "디지털/가전", d2: "계절가전", d3: "가습기"
  reason: "가습기는 계절가전 d2의 가습기 d3로 정확히 매핑됩니다."

예시 4) 상품명: "무타공 두꺼비집가리개 분전함커버"
  → d1: "가구/인테리어", d2: "인테리어소품", d3: "커버/가리개"
  reason: "분전함커버는 인테리어소품의 가리개 계열입니다."

예시 5) 상품명: "차량용 햇빛가리개 자동차 카커튼"
  → d1: "생활/건강", d2: "자동차용품", d3: "인테리어용품"
  reason: "차량용 햇빛가리개는 자동차용품의 인테리어용품 d3에 해당합니다. 편의용품이 아닙니다."

엄격한 규칙:
- 반드시 위 d1 목록에서만 d1을 고르세요
- d2, d3는 자연스러운 한국어 카테고리명을 추천하세요 (네이버 실제 분류와 유사하게)
- 새 카테고리를 만들지 마세요
- 잠옷/홈웨어/파자마 상품을 일반 의류 카테고리로 분류하지 마세요
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

  // Issue #6 fix (2026-05-01): Form-specific keyword bonus.
  // When the product name contains domain-specific words like sleepwear/homewear/pajamas,
  // the matched category MUST contain those words in d2 or d3 — otherwise it's a misclassification.
  // Without this bonus, AI sometimes routes pajamas to "women's clothing > knit > vest" which is wrong.
  const SLEEPWEAR_WORDS = ['잠옷', '파자마', '홈웨어', '속옷', '언더웨어', '내복', '내의'];
  const BATHROOM_WORDS = ['변기', '뚫어뻥', '뚫어뻑', '펌프', '배수구', '배수호스', '하수구', '파이프', '세면대'];
  const CAR_WORDS = ['차량용', '카커튼', '자동차'];

  function score(entry: NaverCategoryEntry): number {
    let s = 0;
    const lname = currentName.toLowerCase();
    const lnameNoSpace = lname.replace(/\s+/g, '');
    const entryD2Lower = entry.d2.toLowerCase();
    const entryD3Lower = (entry.d3 ?? '').toLowerCase();
    const entryD4Lower = (entry.d4 ?? '').toLowerCase();

    if (d2 && entry.d2.includes(d2)) s += 50;
    if (d2 && d2.includes(entry.d2)) s += 30;
    if (d3 && entry.d3.includes(d3)) s += 70;
    if (d3 && d3.includes(entry.d3) && entry.d3.length >= 2) s += 40;
    if (entry.d3 && (lname.includes(entryD3Lower) || lnameNoSpace.includes(entryD3Lower))) s += 20;
    // Issue #6 sub-fix: d4 exact substring match in product name is a VERY strong signal
    // (e.g. "차량용햇빛가리개" d4 matches product "차량용 햇빛가리개 자동차"). Bumped from +25 to +60.
    if (entry.d4 && (lname.includes(entryD4Lower) || lnameNoSpace.includes(entryD4Lower))) s += 60;
    if (entry.d3) s += 5;
    if (entry.d4) s += 5;

    // Form-specific bonus: if product name has domain word, category must have it too.
    // This single check punishes wrong d2 (e.g. "여성의류" instead of "여성언더웨어/잠옷")
    // and rewards correct d2/d3 with strong weight (+35 per matched domain word).
    const productHasSleepwear = SLEEPWEAR_WORDS.some(w => currentName.includes(w));
    if (productHasSleepwear) {
      const categoryHasSleepwear = SLEEPWEAR_WORDS.some(w =>
        entry.d2.includes(w) || (entry.d3 ?? '').includes(w) || (entry.d4 ?? '').includes(w)
      );
      if (categoryHasSleepwear) {
        s += 35;
      } else {
        // Penalty: product is sleepwear but category is not — strong negative signal
        s -= 30;
      }
    }
    const productHasBathroom = BATHROOM_WORDS.some(w => currentName.includes(w));
    if (productHasBathroom) {
      // Issue #7 fix (2026-05-02): drop loose '생활용품' match. d2='생활용품' alone
      // lets unrelated subcategories (보안용품/CCTV, 세제/세정제, etc.) pass even when
      // the actual subcategory is not bathroom-related. Require a tighter keyword
      // (욕실/변기/뚫어/배수/세면) somewhere in d2/d3/d4.
      const categoryHasBathroom =
        entryD2Lower.includes('욕실') || entryD3Lower.includes('욕실') || entryD4Lower.includes('욕실') ||
        entry.d3.includes('변기') || (entry.d4 ?? '').includes('변기') ||
        entry.d3.includes('뚫어') || (entry.d4 ?? '').includes('뚫어') ||
        entry.d3.includes('배수') || (entry.d4 ?? '').includes('배수') ||
        entry.d3.includes('세면') || (entry.d4 ?? '').includes('세면');
      if (categoryHasBathroom) s += 35;
      else s -= 50; // Escalated from -20 to match sleepwear/car penalty severity.
    }
    const productHasCar = CAR_WORDS.some(w => currentName.includes(w));
    if (productHasCar) {
      const categoryHasCar = entry.d2.includes('자동차') || entry.d3.includes('자동차') ||
        entry.d2.includes('차량') || entry.d3.includes('차량');
      if (categoryHasCar) s += 35;
      else s -= 20;
    }

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

  // Issue #7 fix (2026-05-02): AI self-contradiction detection (DOMAIN-AGNOSTIC).
  // When AI's reason text and the actual mapped d2/d3/d4 share zero meaningful
  // category-word overlap, the AI hallucinated — reason says one thing, code points
  // elsewhere. Example: reason='변기펌프는 욕실용품에 해당' but mapped entry is
  // d2='생활용품' d3='보안용품' d4='CCTV'. The token '욕실용품' is in reason but
  // appears nowhere in the mapped entry — hard reject regardless of score.
  //
  // Token extraction: split reason on non-Korean delimiters and keep tokens of
  // length >= 2 that contain Korean characters. We then check whether any token
  // appears as a substring of the entry's d2/d3/d4 (lowercased).
  const reasonTokensRaw = (reason || '')
    .split(/[\s,./()\[\]'">\-—:;!?·•\u3000]+/)
    .filter(t => t.length >= 2 && /[\uAC00-\uD7A3]/.test(t));
  // Drop ultra-generic words that are too common to be category-meaningful.
  const REASON_STOPWORDS = new Set([
    '해당', '관련', '카테고리', '상품', '계열', '경우', '제품', '사용',
    '입니다', '있습니다', '됩니다', '맞습니다', '대표', '추천', '선택',
    '정확', '가장', '중에서', '입력', '필요', '확인', '바랍니다',
  ]);
  const reasonTokens = reasonTokensRaw.filter(t => !REASON_STOPWORDS.has(t));
  const matchedCategoryTextForReason = `${best.entry.d2} ${best.entry.d3 ?? ''} ${best.entry.d4 ?? ''}`;
  if (reasonTokens.length > 0) {
    const reasonOverlapsCategory = reasonTokens.some(token =>
      matchedCategoryTextForReason.includes(token)
    );
    if (!reasonOverlapsCategory) {
      // AI self-contradiction signature: hard reject regardless of score.
      return null;
    }
  }

  // Issue #5 extra defense (2026-05-01): Reject when the matched category name has no
  // token overlap with the product name. AI may have hallucinated a d2/d3 path that
  // happens to score >= 50 by coincidence (e.g. shared common syllables), but the actual
  // category content is unrelated to the product.
  const lowerName = currentName.toLowerCase();
  const lowerNameNoSpace = lowerName.replace(/\s+/g, '');
  const matchedCategoryText = `${best.entry.d2} ${best.entry.d3 ?? ''} ${best.entry.d4 ?? ''}`.toLowerCase();
  const matchedCategoryTextNoSpace = matchedCategoryText.replace(/\s+/g, '');
  const productTokens = lowerName.split(/[\s/,()-]+/).filter(t => t.length >= 2);
  const hasAnyOverlap = productTokens.some(token =>
    matchedCategoryText.includes(token) ||
    matchedCategoryTextNoSpace.includes(token) ||
    token.includes(best.entry.d2.toLowerCase()) ||
    (best.entry.d4 && lowerNameNoSpace.includes(best.entry.d4.toLowerCase()))
  );
  // Issue #7 fix (2026-05-02): Tighten reasonHasCategoryHint. Previously, a reason like
  // '...생활용품의 욕실용품...' triggered hint=true for entry d2='생활용품' alone,
  // letting CCTV/보안용품 sneak through. Now require the matched word to be at least
  // 3 characters AND not be a generic top-level d2 ('생활용품', '디지털/가전', etc.)
  // unless d3 also matches — otherwise hint is too permissive.
  const GENERIC_D2 = new Set(['생활용품', '주방용품', '식품', '디지털/가전', '가구']);
  const reasonHasCategoryHint = !!(reason && (
    (best.entry.d2.length >= 3 && reason.includes(best.entry.d2) && !GENERIC_D2.has(best.entry.d2)) ||
    (best.entry.d3 && best.entry.d3.length >= 3 && reason.includes(best.entry.d3))
  ));
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
