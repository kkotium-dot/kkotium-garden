// src/lib/automation/firefly-generate.ts
//
// Firefly generation adapter — the single entry point that turns a
// FireflyRequest (built by backdrop-prompt-builder) into one image, behind a
// manual/api toggle.
//
// Authority: docs/handoff/HANDOFF_firefly_generate_adapter_2026-06-04.md (task 1).
//
// Workrule #38 reconciliation: #38 bans *implicit* runtime image-generation API
// calls (content that silently disappears / rate-limits). This adapter is an
// *explicit, opt-in automation track* the operator asked for, and it is safe by
// default:
//   - manual mode (the default, and the only behavior without enterprise keys)
//     performs ZERO network generation calls. It returns the request spec so the
//     operator 1-clicks the image in Firefly web; ingest is human-triggered.
//   - api mode activates ONLY when the operator provisions Firefly Services keys
//     (the intended ops environment). Even then it fails safe: missing keys or a
//     partner (non-Firefly-native) model downgrade to manual rather than
//     fabricating an "image generated" result (#46 — no false success).
//
// This module is side-effect isolated: it never touches DB or Storage. Caching
// of the resulting asset stays in the existing ingest path.
//
// No new dependency: uses fetch + manual OAuth token management only.

import type { FireflyRequest } from './backdrop-prompt-builder';
import type { FireflyModel } from './adobe-tool-router';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FireflyGenMode = 'manual' | 'api';

export interface FireflyGenResult {
  mode: FireflyGenMode;
  /** Populated only on api-mode success. null in manual mode / on any failure. */
  imageUrl: string | null;
  /** manual mode: the generation spec to show the operator (= the input). */
  manualRequest: FireflyRequest | null;
  /** Model identifier (FireflyModel) carried for diagnostics/logging. */
  model: string;
  /** Diagnostic note describing which branch ran and why. */
  note: string;
}

// ---------------------------------------------------------------------------
// Model routing — Firefly Services natively dispatches only Adobe's own image
// models. Partner models (gemini-*/imagen/gpt-image-2, FLUX, Nano Banana, etc.)
// are routing hints for other surfaces and are NOT callable through Firefly
// Services, so in api mode a partner model downgrades to manual.
//
// ★ Operating rule (TOOL_ECOSYSTEM_MANUAL, work-principle #48): partner models
// carry NO IP indemnity, so their output must NOT ship as a final sale asset.
// Only Firefly-native models (indemnified) auto-generate here; partner requests
// stay manual so a human keeps them out of the published product.
// ---------------------------------------------------------------------------

const FIREFLY_NATIVE_MODELS: ReadonlySet<FireflyModel> = new Set<FireflyModel>([
  'firefly-image-5',
  'firefly-image-4-ultra',
  'firefly-image-4',
]);

function isFireflyNative(model: FireflyModel): boolean {
  return FIREFLY_NATIVE_MODELS.has(model);
}

// ---------------------------------------------------------------------------
// Mode resolution
// ---------------------------------------------------------------------------

/** api only when explicitly opted in; anything else (incl. unset) -> manual. */
function resolveMode(): FireflyGenMode {
  return process.env.FIREFLY_MODE === 'api' ? 'api' : 'manual';
}

interface FireflyServicesCreds {
  clientId: string;
  clientSecret: string;
  scope: string;
}

/** Read the four enterprise env vars; null if any required one is missing. */
function readCreds(): FireflyServicesCreds | null {
  const clientId = process.env.FIREFLY_SERVICES_CLIENT_ID;
  const clientSecret = process.env.FIREFLY_SERVICES_CLIENT_SECRET;
  // Scope has a sane default per Adobe Firefly Services; still overridable.
  const scope = process.env.FIREFLY_SERVICES_SCOPE || 'openid,AdobeID,firefly_api';
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, scope };
}

// ---------------------------------------------------------------------------
// OAuth Server-to-Server token (Adobe IMS, client_credentials).
// Module-scoped cache; refreshed 60s before expiry. No persistence.
// ---------------------------------------------------------------------------

const IMS_TOKEN_URL = 'https://ims-na1.adobelogin.com/ims/token/v3';
const FIREFLY_GENERATE_URL = 'https://firefly-api.adobe.io/v3/images/generate';
const TOKEN_REFRESH_SKEW_MS = 60_000;

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(creds: FireflyServicesCreds, nowMs: number): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_SKEW_MS > nowMs) {
    return cachedToken.value;
  }
  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    scope: creds.scope,
  });
  const res = await fetch(IMS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
  const token = typeof data.access_token === 'string' ? data.access_token : null;
  if (!token) return null;
  // expires_in is seconds; default to a conservative 1h if absent.
  const ttlSec = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  cachedToken = { value: token, expiresAt: nowMs + ttlSec * 1000 };
  return token;
}

// ---------------------------------------------------------------------------
// Firefly Services v3 generate call. Request/response shape follows the v3
// image-generation contract; exact field availability is confirmed at the
// enterprise-contract step. Returns the first output image URL, or null.
// ---------------------------------------------------------------------------

async function callFireflyGenerate(
  req: FireflyRequest,
  token: string,
  apiKey: string,
): Promise<string | null> {
  const body = {
    prompt: req.prompt,
    negativePrompt: req.negativePrompt,
    contentClass: req.contentClass,
    numVariations: 1,
    size: req.size,
    seeds: [req.seed],
    promptBiasingLocaleCode: req.promptBiasingLocaleCode,
  };
  const res = await fetch(FIREFLY_GENERATE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    outputs?: { image?: { url?: unknown } }[];
  };
  const url = data.outputs?.[0]?.image?.url;
  return typeof url === 'string' ? url : null;
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

function manualResult(req: FireflyRequest, note: string): FireflyGenResult {
  return {
    mode: 'manual',
    imageUrl: null,
    manualRequest: req,
    model: req.model,
    note,
  };
}

/**
 * Generate (or hand off for manual generation) one backdrop image for a request.
 * Always resolves; never throws. In manual mode (default) it performs no network
 * call and returns the spec for 1-click generation. In api mode it dispatches to
 * Firefly Services for Firefly-native models, downgrading to manual on missing
 * keys, partner models, or any error (fail-safe, no fabricated success).
 */
export async function generateBackdrop(req: FireflyRequest): Promise<FireflyGenResult> {
  const mode = resolveMode();

  if (mode === 'manual') {
    return manualResult(req, 'manual 1-click required');
  }

  // api mode requested below.
  const creds = readCreds();
  if (!creds) {
    return manualResult(
      req,
      'api mode requested but FIREFLY_* keys missing -> manual fallback',
    );
  }
  if (!isFireflyNative(req.model)) {
    return manualResult(
      req,
      `api mode does not support partner model "${req.model}" -> manual fallback`,
    );
  }

  // Date.now is allowed in app runtime (not a workflow script). Used only for
  // token-expiry math.
  const nowMs = Date.now();

  let token: string | null;
  try {
    token = await getAccessToken(creds, nowMs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return manualResult(req, `IMS token error: ${msg} -> manual fallback`);
  }
  if (!token) {
    return manualResult(req, 'IMS token request failed -> manual fallback');
  }

  let imageUrl: string | null;
  try {
    imageUrl = await callFireflyGenerate(req, token, creds.clientId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return manualResult(req, `Firefly generate error: ${msg} -> manual fallback`);
  }
  if (!imageUrl) {
    return manualResult(req, 'Firefly generate returned no image -> manual fallback');
  }

  return {
    mode: 'api',
    imageUrl,
    manualRequest: null,
    model: req.model,
    note: 'api generated via Firefly Services v3',
  };
}
