// src/lib/ai/groq.ts — Groq AI SDK (primary AI provider, 2026-05-19)
//
// UCE-2 (2026-08-27, 실측): llama-3.3-70b-versatile was REMOVED from Groq's
// catalog entirely — every call was silently 404ing in production
// ("The model does not exist or you do not have access to it"), which is the
// true root cause behind most `usedAI:false` results across the app (not a
// parsing bug — every category/suggest AI call was failing before it even
// got a response body). Confirmed via `GET /openai/v1/models`: Groq's current
// catalog has moved to reasoning models (openai/gpt-oss-*, qwen/qwen3.6-27b),
// no more direct-answer Llama chat models.
//
// Model: openai/gpt-oss-120b — live-tested (Korean product copy + category
// JSON) 2026-08-27, fluent Korean output, correct JSON format.
//   - This is a REASONING model — without `reasoning_effort: 'low'` it burns
//     the token budget on an internal chain-of-thought and returns EMPTY
//     content once max_tokens is hit before the visible answer starts. Every
//     call below sets reasoning_effort:'low' for this reason — do not remove it.
// Endpoint: https://api.groq.com/openai/v1/chat/completions (OpenAI-compatible)
//
// Round-robin: tries GROQ_API_KEY → _2 → _3 on 429/quota error.

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MODEL = 'openai/gpt-oss-120b';

function getGroqKeys(): string[] {
  return [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter((k): k is string => !!k && k.length > 0);
}

async function callGroqWithKey(
  prompt: string,
  systemPrompt: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      // gpt-oss-120b is a reasoning model — 'low' skips the deliberation
      // budget that otherwise eats max_tokens before any visible content.
      reasoning_effort: 'low',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 429) throw new Error(`Groq 429 quota: ${errText.slice(0, 80)}`);
    if (res.status === 401) throw new Error(`Groq 401 unauthorized: ${errText.slice(0, 80)}`);
    throw new Error(`Groq API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Groq 응답에 content가 없습니다');
  }
  return content;
}

export async function callGroq(
  prompt: string,
  systemPrompt: string = '네이버 스마트스토어 SEO 전문가. 결과만 간결히 출력.',
): Promise<string> {
  const keys = getGroqKeys();
  if (keys.length === 0) {
    throw new Error('GROQ_API_KEY가 .env.local에 없습니다 (무료 14,400회/일)');
  }

  let lastErr = '';
  for (const key of keys) {
    try {
      return await callGroqWithKey(prompt, systemPrompt, key);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (lastErr.includes('429') || lastErr.includes('quota')) {
        console.warn(`[groq] key ${key.slice(-6)} quota exceeded, trying next key`);
        continue;
      }
      throw e;
    }
  }
  throw new Error(`Groq: 모든 키 quota 초과. (${lastErr.slice(0, 80)})`);
}

export async function generateNaverKeywordsGroq(
  productName: string,
  category?: string,
): Promise<string[]> {
  const prompt = `네이버 스마트스토어 "${productName}"${category ? `(${category})` : ''} 키워드 15개. 쉼표로만 구분, 번호/설명 제외.`;
  const text = await callGroq(prompt);
  return text
    .split(',')
    .map((k) => k.trim().replace(/^\d+\.\s*/, ''))
    .filter((k) => k.length > 0 && k.length < 50)
    .slice(0, 15);
}

export async function generateProductTitleGroq(
  productName: string,
  keywords: string[],
): Promise<string[]> {
  const prompt = `네이버 스마트스토어 "${productName}" 제목 5개. 키워드: ${keywords.slice(0, 5).join(', ')}. 50자 이내, 줄바꿈 구분, 번호 제외.`;
  const text = await callGroq(prompt);
  return text
    .split('\n')
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter((line) => line.length > 0 && line.length <= 50)
    .slice(0, 5);
}

export async function generateProductDescriptionGroq(
  productName: string,
  keywords: string[],
  features?: string[],
): Promise<string> {
  const prompt = `네이버 스마트스토어 "${productName}" 상세 설명 3문단. 키워드: ${keywords.join(', ')}${features ? `. 특징: ${features.join(', ')}` : ''}. HTML 태그 없이.`;
  return await callGroq(
    prompt,
    '네이버 스마트스토어 상세페이지 카피라이터. 한국어로 자연스럽고 설득력 있게 작성.',
  );
}
