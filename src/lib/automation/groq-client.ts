// src/lib/automation/groq-client.ts
//
// Sprint 7-M2 Step 5-A — Shared Groq round-robin client.
// Extracted from copy-writer.ts so section-composer.ts can reuse the same
// key-rotation + call surface without duplicating the implementation
// (workflow principle: no duplicated infra; one source of truth).
//
// Runtime
//   - Node runtime only (fetch is fine on Edge too, but section-composer is
//     called from /api/automation/l2 which is Node-only via sharp).
//   - Groq llama-3.1-8b-instant per workflow principle #38 (only LLM allowed
//     at runtime).

export function pickGroqKey(): string | null {
  const keys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter((k): k is string => typeof k === 'string' && k.length > 0);
  if (keys.length === 0) return null;
  return keys[Math.floor(Math.random() * keys.length)];
}

export interface GroqCallOptions {
  /** Default 60. Match the slot's character budget. */
  maxTokens?: number;
  /** Default 0.3. Use 0.7+ for variant diversity. */
  temperature?: number;
}

export async function callGroq(
  prompt: string,
  key: string,
  options: GroqCallOptions = {},
): Promise<string | null> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens ?? 60,
      temperature: options.temperature ?? 0.3,
    }),
  });
  if (!res.ok) return null;
  const data: { choices?: { message?: { content?: string } }[] } = await res.json();
  const text = data.choices?.[0]?.message?.content;
  return typeof text === 'string' ? text.trim() : null;
}
