// src/lib/automation/backdrop-vlm-gate.ts
//
// Track B Phase 2 — zero-shot empty-backdrop classifier (2026-05-30).
//
// Authority: docs/research/FIREFLY_AUTOMATION_RESEARCH_2026-05-30.md §7.
//
// Inserts between the ingest PNG-normalization step and the Storage upload to
// decide whether a candidate backdrop is suitable: a clean photographic scene
// with empty center (room for product placement), no person, no product, no
// text. Bad plates are routed to human review WITHOUT being uploaded.
//
// Model: Groq Llama 4 Scout (multimodal, indemnity-free, JSON-mode capable).
// Strict JSON output enforced via response_format. Fail-closed on any error
// (network / parse / no key) so bad plates never slip through silently.
//
// Workrule note (#38 reconciliation): #38 bans runtime IMAGE-GENERATION APIs
// (Cloudinary fetch / Firefly generate) — content that disappears or rate-
// limits silently. A one-shot vision classifier at the ingest *gate* is the
// recommended pattern in §7 and is the polar opposite of generation: it
// rejects bad content before any Storage write.

import { pickGroqKey } from './groq-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VlmGateVerdict {
  /** Allowed to upload? Requires all four conditions:
   *  is_empty_backdrop && !has_person && !has_product && !has_text */
  passed: boolean;
  is_empty_backdrop: boolean;
  has_person: boolean;
  has_product: boolean;
  has_text: boolean;
  /** Failure reasons populated when passed === false. */
  reasons: string[];
  /** Vision model identifier used for this call. */
  model: string;
  /** Raw model output (for debugging / future review UI). */
  raw: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const SYSTEM_PROMPT = [
  'You are a strict image classifier for product-photography backdrops.',
  'Output ONLY a valid JSON object with these four boolean fields:',
  '{"is_empty_backdrop": <bool>, "has_person": <bool>, "has_product": <bool>, "has_text": <bool>}.',
  '- is_empty_backdrop = true ONLY when the image is a clean photographic scene with a clear empty center area suitable for placing a product later.',
  '- has_person = true if any person, face, body part (hand/arm), or human silhouette is visible.',
  '- has_product = true if a clearly defined merchandise / product / consumer object is centered or prominent in the frame.',
  '- has_text = true if any readable text, logo, watermark, or signage appears.',
  'No prose. No markdown. JSON object only.',
].join(' ');

// Lightweight cheap pre-filter threshold. PNG smaller than this is almost
// certainly corrupt or a near-empty payload — reject without paying VLM cost.
const MIN_PAYLOAD_BYTES = 1024;

// ---------------------------------------------------------------------------
// Groq vision call (multimodal chat completions)
// ---------------------------------------------------------------------------

interface VisionContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

async function callGroqVision(base64Png: string, key: string): Promise<string | null> {
  const dataUrl = `data:image/png;base64,${base64Png}`;
  const userContent: VisionContentPart[] = [
    { type: 'text', text: 'Classify this candidate backdrop image. Reply with the JSON object only.' },
    { type: 'image_url', image_url: { url: dataUrl } },
  ];
  const body = {
    model: VISION_MODEL,
    response_format: { type: 'json_object' },
    max_tokens: 200,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
  };
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    return null;
  }
  const data: unknown = await res.json();
  const choices = (data as { choices?: { message?: { content?: unknown } }[] }).choices;
  const text = choices?.[0]?.message?.content;
  return typeof text === 'string' ? text : null;
}

// ---------------------------------------------------------------------------
// Parse strict JSON verdict
// ---------------------------------------------------------------------------

interface RawJson {
  is_empty_backdrop?: unknown;
  has_person?: unknown;
  has_product?: unknown;
  has_text?: unknown;
}

function asBool(v: unknown): boolean {
  return v === true || v === 'true';
}

function parseVerdict(raw: string | null): Pick<VlmGateVerdict, 'is_empty_backdrop' | 'has_person' | 'has_product' | 'has_text'> | null {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  const text = match ? match[0] : raw;
  let json: RawJson;
  try {
    json = JSON.parse(text) as RawJson;
  } catch {
    return null;
  }
  return {
    is_empty_backdrop: asBool(json.is_empty_backdrop),
    has_person: asBool(json.has_person),
    has_product: asBool(json.has_product),
    has_text: asBool(json.has_text),
  };
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

function reject(reason: string, model = 'pre-filter'): VlmGateVerdict {
  return {
    passed: false,
    is_empty_backdrop: false,
    has_person: false,
    has_product: false,
    has_text: false,
    reasons: [reason],
    model,
    raw: null,
  };
}

/**
 * Classify a normalized PNG buffer for backdrop suitability. Always resolves —
 * a thrown / unparseable result becomes a closed verdict so the caller can route
 * the job to human review safely.
 */
export async function classifyBackdrop(pngBuffer: Buffer): Promise<VlmGateVerdict> {
  // Cheap pre-filter — pure (no external call): clearly-invalid payload size.
  if (pngBuffer.length < MIN_PAYLOAD_BYTES) {
    return reject('tiny payload (<1KB) — unlikely to be a real backdrop');
  }
  const key = pickGroqKey();
  if (!key) {
    return reject('no Groq vision key configured', VISION_MODEL);
  }
  const base64 = pngBuffer.toString('base64');

  let raw: string | null;
  try {
    raw = await callGroqVision(base64, key);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return reject(`vision call error: ${msg}`, VISION_MODEL);
  }
  const verdict = parseVerdict(raw);
  if (!verdict) {
    return {
      passed: false,
      is_empty_backdrop: false,
      has_person: false,
      has_product: false,
      has_text: false,
      reasons: ['could not parse strict JSON verdict from model output'],
      model: VISION_MODEL,
      raw,
    };
  }

  const reasons: string[] = [];
  if (verdict.has_person) reasons.push('has_person');
  if (verdict.has_product) reasons.push('has_product');
  if (verdict.has_text) reasons.push('has_text');
  if (!verdict.is_empty_backdrop) reasons.push('not_empty_backdrop');

  return {
    passed: reasons.length === 0,
    ...verdict,
    reasons,
    model: VISION_MODEL,
    raw,
  };
}
