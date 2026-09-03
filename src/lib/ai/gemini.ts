// src/lib/ai/gemini.ts
// ============================================================================
// GEMINI-RESTORE (#155 / #156) — env-based Google Gemini Flash (free tier),
// the FREE fallback between Groq (free) and Anthropic (paid, last resort). Keys
// come ONLY from the environment (GEMINI_API_KEY / _2 / _3, round-robin on
// quota) — NEVER hardcoded, and never logged (not even a fragment), per #156.
// Returns the raw model text (JSON string), matching the callGroq / callAnthropic
// contract so callers keep a single normalize() path.
//
// NOTE: lives at src/lib/ai/gemini.ts (provider convention, next to groq.ts).
// The legacy src/lib/gemini.ts is an unrelated Groq-compat shim and is left
// untouched.

// gemini-2.0-flash shut down 2026-06-01; gemini-3.6-flash is Google's
// designated replacement (ai.google.dev/gemini-api/docs/deprecations).
export const GEMINI_MODEL = 'gemini-3.6-flash';

function geminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];
}

/** True when at least one Gemini key is configured. */
export function hasGeminiKey(): boolean {
  return geminiKeys().length > 0;
}

/** Inline image payload for multimodal (vision/OCR) calls — never a URL, always
 * pre-fetched + resized by the caller (GEMINI_OCR_INTERVENTION_2026-09-03.md
 * §2: base64 inline_data, not file_uri — avoids wholesale-URL expiry/CORS). */
export interface GeminiImageInput {
  mimeType: string; // e.g. 'image/jpeg'
  base64Data: string; // raw base64, no 'data:' prefix
}

async function callGeminiWithKey(
  prompt: string,
  systemPrompt: string,
  apiKey: string,
  image?: GeminiImageInput,
): Promise<string> {
  // The key travels only in the request URL to Google — never logged/returned.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (image) {
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64Data } });
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2500,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!res.ok) {
    // Status only — never echo the response body (#156).
    throw new Error(`Gemini ${res.status}`);
  }
  const data = await res.json();
  const responseParts: { text?: string; thought?: boolean }[] = data.candidates?.[0]?.content?.parts ?? [];
  return responseParts.filter((p) => !p.thought).map((p) => p.text ?? '').join('').trim();
}

async function callGeminiRoundRobin(
  prompt: string,
  systemPrompt: string,
  image: GeminiImageInput | undefined,
  logTag: string,
): Promise<string> {
  const keys = geminiKeys();
  if (keys.length === 0) throw new Error('GEMINI_API_KEY not set');

  let lastErr = '';
  for (let i = 0; i < keys.length; i++) {
    try {
      return await callGeminiWithKey(prompt, systemPrompt, keys[i], image);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (lastErr.includes('429') || lastErr.includes('quota') || lastErr.includes('403')) {
        console.warn(`[${logTag}] key #${i + 1} quota/limit, trying next`); // index only — no key value
        continue;
      }
      throw e;
    }
  }
  throw new Error(`Gemini all keys failed: ${lastErr}`);
}

/**
 * Call Gemini Flash (text-only) with key round-robin. Throws if no key is set
 * or all keys fail (caller falls through to the next provider). No key value
 * ever appears in errors or logs (#156).
 */
export async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  return callGeminiRoundRobin(prompt, systemPrompt, undefined, 'gemini');
}

/**
 * Call Gemini Flash with an inline image (multimodal OCR/vision) — same key
 * round-robin and error contract as callGemini. Per design (GEMINI_OCR_
 * INTERVENTION_2026-09-03.md), this is Gemini-only: no Groq text fallback,
 * since Groq cannot read images. Caller must pre-fetch and resize the image
 * (recommended: ≤1456px, web-JPEG) before base64-encoding it.
 */
export async function callGeminiVision(
  prompt: string,
  systemPrompt: string,
  image: GeminiImageInput,
): Promise<string> {
  return callGeminiRoundRobin(prompt, systemPrompt, image, 'gemini-vision');
}
