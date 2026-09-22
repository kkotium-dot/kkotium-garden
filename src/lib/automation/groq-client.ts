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
//
// GROQ_MODEL_FIX_2026-09-22 (#48 조사 중 발견) — 'llama-3.1-8b-instant' was
// REMOVED from Groq's catalog (404 model_not_found on every call, confirmed
// via GET /openai/v1/models). This was already fixed once for the category/
// suggest path (UCE-2, 2026-08-27, src/lib/ai/groq.ts) but this module still
// had its own duplicated copy of the dead model name — exactly the "no
// duplicated infra" risk the header above warned about. Now delegates to the
// canonical src/lib/ai/groq.ts implementation (openai/gpt-oss-120b +
// reasoning_effort:'low' — required, see that file's header for why).

import { callGroq as callGroqCanonical } from '@/lib/ai/groq';

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

// `key`/`options` are kept in the signature so call sites (which already
// call pickGroqKey() themselves) don't need to change — the canonical
// implementation does its own round-robin+key selection internally, so this
// key param is now unused here but harmless to keep for compatibility.
export async function callGroq(
  prompt: string,
  _key: string,
  _options: GroqCallOptions = {},
): Promise<string | null> {
  try {
    return await callGroqCanonical(prompt);
  } catch {
    return null;
  }
}
