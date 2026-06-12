// src/lib/fidelity/product-fidelity.ts
// ============================================================================
// Product Fidelity Card — the per-product reality anchor (docs/design/
// ADAPTIVE_COMPOSITE_ENGINE.md §11). Stored in Product.fidelity (jsonb).
//
// Two consumers:
//   1. image-prompt builder — buildFidelityInjection() prepends `promptInject`
//      to the generation prompt and turns `decorForbidden` into negatives, so
//      a generated/composited scene never invents banned decor (e.g. myeonghwa:
//      metallic leaves) and never enlarges/redraws the real subject.
//   2. pre-publish fidelity-check gate (#56) — buildFidelityChecklist() builds
//      a product-agnostic checklist payload the operator compares against the
//      confirmed representative / additional images.
//
// Pure parsing + string helpers, no IO. Tolerant parser: an unmigrated or
// malformed value yields null so callers degrade gracefully (no fabrication).
// ============================================================================

// Physics-correctness clause injected whenever a mount mechanic is declared —
// stops a generator from inventing impossible clip/vent geometry (item 7).
export const MOUNT_PHYSICS_CLAUSE =
  'vent structure physically correct, no impossible geometry, all background objects realistic-consistent';

export interface ProductFidelity {
  /** Form-factor / mount, e.g. 'hanging_car_vent'. */
  mountType: string | null;
  /** How the product physically attaches/sits, e.g. 'spring clip on neck
   *  clamps one vent slat, bottle hangs in front straight down, cap+sticks up'.
   *  Injected into the prompt with the physics-correctness clause. */
  mountMechanic: string | null;
  /** Parts that must be present and recognizable in any render. */
  components: string[];
  /** Decor/context that is allowed in a scene. */
  decorAllowed: string[];
  /** Decor that must NEVER appear — injected as negative-prompt tokens. */
  decorForbidden: string[];
  /** Scent line-up (may be empty until confirmed). */
  scents: string[];
  /** Free-text fidelity clause prepended to the generation prompt. */
  promptInject: string;
  /** Provenance pointer (doc anchor / handoff). */
  sourceRef: string | null;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
}

/**
 * Parse a raw Product.fidelity jsonb value into a ProductFidelity, or null when
 * absent/empty/malformed. Never throws.
 */
export function parseFidelity(raw: unknown): ProductFidelity | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const promptInject = typeof o.promptInject === 'string' ? o.promptInject.trim() : '';
  const mountType = typeof o.mountType === 'string' ? o.mountType : null;
  const mountMechanic = typeof o.mountMechanic === 'string' ? o.mountMechanic.trim() || null : null;
  const components = asStringArray(o.components);
  const decorForbidden = asStringArray(o.decorForbidden);
  // Require at least one meaningful field, else treat as no card.
  if (!promptInject && !mountType && !mountMechanic && components.length === 0 && decorForbidden.length === 0) {
    return null;
  }
  return {
    mountType,
    mountMechanic,
    components,
    decorAllowed: asStringArray(o.decorAllowed),
    decorForbidden,
    scents: asStringArray(o.scents),
    promptInject,
    sourceRef: typeof o.sourceRef === 'string' ? o.sourceRef : null,
  };
}

export interface FidelityInjection {
  /** Clause to prepend to a positive generation prompt (empty when none). */
  prepend: string;
  /** Negative-prompt clause derived from decorForbidden (empty when none). */
  negativeClause: string;
  /** Raw forbidden tokens (humanized) for negative-prompt merging. */
  negativeTokens: string[];
}

/** Turn an internal token like 'metallic_leaves' into prompt words 'metallic leaves'. */
function humanizeToken(t: string): string {
  return t.replace(/[_-]+/g, ' ').trim();
}

/**
 * Build the prompt injection for a fidelity card: the promptInject prepend plus
 * an "Avoid: ..." negative clause from decorForbidden. Returns empty strings
 * when the card is null, so the caller can splice unconditionally.
 */
export function buildFidelityInjection(f: ProductFidelity | null): FidelityInjection {
  if (!f) return { prepend: '', negativeClause: '', negativeTokens: [] };
  const negativeTokens = f.decorForbidden.map(humanizeToken).filter(Boolean);
  const negativeClause = negativeTokens.length > 0 ? `Avoid: ${negativeTokens.join(', ')}.` : '';
  // Prepend = promptInject + (mount mechanic + physics-correctness clause when a
  // mount mechanic is declared), so the render gets the attach geometry right.
  const mountClause = f.mountMechanic ? `${f.mountMechanic}. ${MOUNT_PHYSICS_CLAUSE}.` : '';
  const prepend = [f.promptInject, mountClause].map((s) => s.trim()).filter(Boolean).join(' ');
  return { prepend, negativeClause, negativeTokens };
}

/**
 * Compose a base prompt with the fidelity injection: `{promptInject} {base} {Avoid: ...}`.
 * Whitespace-collapsed; safe when any part is empty.
 */
export function applyFidelityToPrompt(base: string, f: ProductFidelity | null): string {
  const inj = buildFidelityInjection(f);
  return [inj.prepend, base, inj.negativeClause]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface FidelityChecklistPayload {
  productId: string;
  mountType: string | null;
  /** How the product attaches — shown in the mount-physics check. */
  mountMechanic: string | null;
  /** Components the operator must confirm are present & recognizable. */
  components: string[];
  /** Decor the operator must confirm is ABSENT. */
  forbidden: string[];
  /** Always-on checks (true-scale, label sharpness) — i18n keys on the UI. */
  staticChecks: string[];
  sourceRef: string | null;
}

export interface MountCheckPayload {
  productId: string;
  mountType: string | null;
  mountMechanic: string | null;
  /** Mount-physics checks the operator confirms before locking the slot. */
  mountChecks: string[];
}

/**
 * Build the pre-publish fidelity-check payload (#56) — product-agnostic: the
 * operator visually compares the confirmed representative / additional images
 * against this card before publish. No myeonghwa hardcoding (#55).
 */
export function buildFidelityChecklistPayload(
  productId: string,
  f: ProductFidelity,
): FidelityChecklistPayload {
  return {
    productId,
    mountType: f.mountType,
    mountMechanic: f.mountMechanic,
    components: f.components,
    forbidden: f.decorForbidden,
    staticChecks: ['true_scale', 'label_sharp', 'no_added_text'],
    sourceRef: f.sourceRef,
  };
}

/**
 * Build the mount-check payload (#56, item 8) — the operator confirms the
 * clip/slat physics is correct before locking the image slot. Returns null
 * when the product declares no mount mechanic (no card to show).
 */
export function buildMountCheckPayload(
  productId: string,
  f: ProductFidelity,
): MountCheckPayload | null {
  if (!f.mountMechanic) return null;
  return {
    productId,
    mountType: f.mountType,
    mountMechanic: f.mountMechanic,
    mountChecks: ['clip_slat_physics', 'vent_geometry', 'hang_direction', 'background_consistent'],
  };
}
