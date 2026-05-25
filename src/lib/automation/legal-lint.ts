// src/lib/automation/legal-lint.ts
//
// Sprint 7-M2 5-B — 표시광고법 §3 + AI-image gate-5 legal lint.
//
// Spec: docs/plan/HANDOFF_PROMPT_ASSET_ENGINE.md §3.
//
// Scope distinction (do not overlap with existing modules):
//   - dark-pattern-lint.ts (compliance/)  -> KFTC dark patterns at the UI
//                                            layer (drip pricing, hidden
//                                            renewal, cancel obstruction).
//   - copy-writer.ts filterDarkPatterns   -> short ad-copy regex strip
//                                            (scarcity, anchor-discount).
//   - legal-lint.ts (this file)           -> Display & Advertising Act §3
//                                            seller-text claims AND the
//                                            gate-5 image legal_flags check
//                                            persisted on art_director_prompts.
//
// Korean seller-facing messages live in legal-lint-messages.ko.json
// (workflow principle #29: no Korean user-facing strings in TS literals).
// Korean regex tokens for matching are inline — they are pattern data, not
// UI copy, mirroring the existing copy-writer.ts precedent.

import messages from './legal-lint-messages.ko.json';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type Severity = 'low' | 'medium' | 'high';

export type LegalRuleCode =
  | 'superlative'
  | 'medical_efficacy'
  | 'absoluteness'
  | 'comparative_assertion';

export interface LegalLintOptions {
  /** Caller-asserted: an evidence document substantiates superlative or
   *  medical-efficacy claims. When true, those two rule categories are
   *  downgraded from blocking to advisory. */
  hasEvidence?: boolean;
}

export interface LegalLintViolation {
  code: LegalRuleCode;
  matchedPhrase: string;
  severity: Severity;
  sellerMessage: string;
  /** True when a conditional-phrase carve-out neutralized this violation
   *  (e.g. "덮는 순간" pattern). Callers may show these as soft warnings
   *  rather than blocking. */
  conditionalAllowed: boolean;
}

export interface LegalLintResult {
  violations: LegalLintViolation[];
  /** True when no blocking (non-conditional, non-evidenced) violations remain. */
  ok: boolean;
}

// ---------------------------------------------------------------------------
// Rule dictionary (표시광고법 제3조)
// ---------------------------------------------------------------------------

interface RuleSpec {
  code: LegalRuleCode;
  // Match data — Korean regex tokens are pattern, not UI copy.
  pattern: RegExp;
  // When true, rule still blocks even with hasEvidence (always-banned).
  alwaysBlock: boolean;
}

const RULES: ReadonlyArray<RuleSpec> = [
  // Superlatives — blocked unless substantiated.
  {
    code: 'superlative',
    pattern: /최고|최상|최저가|단\s*하나|유일|1\s*위|넘버\s*원/g,
    alwaysBlock: false,
  },
  // Medical / efficacy — blocked unless clinical evidence supplied.
  {
    code: 'medical_efficacy',
    pattern: /체온\s*조절|치료|항균|살균|면역|혈압|혈당|다이어트\s*효과/g,
    alwaysBlock: false,
  },
  // Absoluteness — categorically over-asserted, no evidence path.
  {
    code: 'absoluteness',
    pattern: /100\s*%(?!\s*(국산|면|순면|친환경))|완벽|영구|평생\s*보장/g,
    alwaysBlock: true,
  },
  // Comparative assertion — replacement claims vs. other product categories.
  {
    code: 'comparative_assertion',
    pattern: /에어컨\s*대체|냉방기\s*대체|난방기\s*대체|병원\s*대체/g,
    alwaysBlock: true,
  },
];

// Conditional-phrase carve-out (HANDOFF §3 "덮는 순간" 예시).
// When a matched sentence contains any of these tokens, the violation is
// flagged but marked conditionalAllowed = true (caller decides treatment).
const CONDITIONAL_TOKENS: ReadonlyArray<string> = [
  '순간',
  '경우',
  '한해',
  '한정',
  '조건',
  '시점',
];

function splitSentences(text: string): string[] {
  // Coarse Korean sentence split — periods, question/exclamation marks,
  // and Korean line breaks. Good enough for short ad copy.
  return text
    .split(/(?<=[.!?。!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function findHostSentence(text: string, matchIndex: number): string {
  const sentences = splitSentences(text);
  let cursor = 0;
  for (const s of sentences) {
    const start = text.indexOf(s, cursor);
    if (start === -1) continue;
    const end = start + s.length;
    if (matchIndex >= start && matchIndex < end) return s;
    cursor = end;
  }
  return text;
}

function isConditionallyAllowed(sentence: string): boolean {
  return CONDITIONAL_TOKENS.some((tok) => sentence.includes(tok));
}

// ---------------------------------------------------------------------------
// Text lint entry
// ---------------------------------------------------------------------------

export function lintText(
  text: string,
  opts: LegalLintOptions = {},
): LegalLintResult {
  const violations: LegalLintViolation[] = [];
  const textRules = messages.textRules as Record<
    LegalRuleCode,
    { severity: Severity; message: string }
  >;

  for (const rule of RULES) {
    // Reset stateful regex.
    rule.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.pattern.exec(text)) !== null) {
      const host = findHostSentence(text, m.index);
      const conditional = isConditionallyAllowed(host);
      const msg = textRules[rule.code];
      violations.push({
        code: rule.code,
        matchedPhrase: m[0],
        severity: msg.severity,
        sellerMessage: msg.message,
        conditionalAllowed: conditional,
      });
    }
  }

  // Block decision: any violation that is NOT conditionally allowed AND is
  // not downgraded by evidence (for evidence-eligible rules).
  const ok = !violations.some((v) => {
    if (v.conditionalAllowed) return false;
    if (opts.hasEvidence) {
      const ruleSpec = RULES.find((r) => r.code === v.code);
      if (ruleSpec && !ruleSpec.alwaysBlock) return false;
    }
    return true;
  });

  return { violations, ok };
}

// ---------------------------------------------------------------------------
// Image gate-5 (HANDOFF §3 — 검수 4체크)
// ---------------------------------------------------------------------------

export interface ImageLegalFlags {
  textInImage: boolean;
  synthidPresent: boolean;
  realProductPhotoUsed: boolean;
  containsVirtualPerson: boolean;
  contentCredentialsPresent: boolean;
}

export type ImageGateCode =
  | 'real_product_mismatch'
  | 'virtual_person_label_required'
  | 'abusive_text_in_image'
  | 'ai_metadata_missing';

export interface ImageGateFinding {
  code: ImageGateCode;
  severity: Severity;
  sellerMessage: string;
}

const imageGateMsg = (code: ImageGateCode): ImageGateFinding => {
  const m = (messages.imageGates as Record<
    ImageGateCode,
    { severity: Severity; message: string }
  >)[code];
  return { code, severity: m.severity, sellerMessage: m.message };
};

/** Gate 1 — Real product photo must be the source of truth. */
export function checkRealProductMatch(
  flags: ImageLegalFlags,
): ImageGateFinding | null {
  return flags.realProductPhotoUsed
    ? null
    : imageGateMsg('real_product_mismatch');
}

/** Gate 2 — Virtual person presence requires explicit disclosure label.
 *  We cannot observe the label from flags alone, so the gate fires whenever
 *  a virtual person is present; caller must confirm label was rendered. */
export function checkVirtualPerson(
  flags: ImageLegalFlags,
): ImageGateFinding | null {
  return flags.containsVirtualPerson
    ? imageGateMsg('virtual_person_label_required')
    : null;
}

/** Gate 3 — Text composited into the image (keyword-stuffing abuse risk). */
export function checkAbusiveTextInImage(
  flags: ImageLegalFlags,
): ImageGateFinding | null {
  return flags.textInImage ? imageGateMsg('abusive_text_in_image') : null;
}

/** Gate 4 — At least one AI provenance signal must be present for AI imagery.
 *  Heuristic: realProductPhotoUsed = false implies generated content; in that
 *  case require SynthID or Content Credentials. */
export function checkAiMetadata(
  flags: ImageLegalFlags,
): ImageGateFinding | null {
  const isGenerated = !flags.realProductPhotoUsed;
  if (!isGenerated) return null;
  const hasProvenance =
    flags.synthidPresent || flags.contentCredentialsPresent;
  return hasProvenance ? null : imageGateMsg('ai_metadata_missing');
}

/** Run all four image gates. Returns the list of triggered findings. */
export function gateImage(flags: ImageLegalFlags): ImageGateFinding[] {
  return [
    checkRealProductMatch(flags),
    checkVirtualPerson(flags),
    checkAbusiveTextInImage(flags),
    checkAiMetadata(flags),
  ].filter((f): f is ImageGateFinding => f !== null);
}
