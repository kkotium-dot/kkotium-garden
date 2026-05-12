// src/lib/honey-name-rules.ts
// ============================================================================
// Sprint 7 P1-B (리서치 4번): product-name rule violations detector
// ============================================================================
//
// Pure-function detector for the three categories of name violations that
// Naver Shopping algorithm penalizes:
//
//   1. Banned marketing words — 이벤트/할인/배송/적립/쿠폰/특가 etc.
//      Naver de-ranks listings that try to spam-stuff sale-related terms
//      in the title (these are reserved for the "혜택" badge area).
//
//   2. Duplicate word repetition — same token appearing 3+ times. Often
//      AI-generated names do this ("여성 셔츠 여성 셔츠 여성 셔츠 가을").
//
//   3. Non-allowed special characters — Naver allows Korean, English,
//      digits, hyphens, parentheses, brackets, and a small set of marks.
//      Emojis, excessive punctuation, and ASCII art trigger penalties.
//
// Returns a structured list of findings the UI can render as red warnings.
// honey-score.ts consumes the same detector to surface in its `warnings`
// array so the score panel and the input form agree.
//
// 리서치 4번 (SPROUT_TO_POWER_SELLER_WORKFLOW_2026_05.md):
//   "상품명 25-50자 + 핵심 키워드 앞 15자 + 금기어 회피 + 중복 단어 3회+ 금지
//    + 허용 외 특수문자 금지 — Naver 적합도 점수에 직접 반영."
// ============================================================================

// ----------------------------------------------------------------------------
// Constants — extracted as a const tuple for easier audit + testing
// ----------------------------------------------------------------------------

/** Banned marketing tokens. Match is exact substring (case-insensitive). */
export const BANNED_WORDS: readonly string[] = [
  '이벤트',
  '할인',
  '특가',
  '최저가',
  '무료배송',
  '쿠폰',
  '적립',
  '오늘만',
  '한정',
  '당일',
  '깜짝',
  '폭탄',
  '대박',
  '핫딜',
  '땡처리',
] as const;

/**
 * Allowed characters in a Naver product name. We allow:
 *   - Korean hangul (가-힣)
 *   - English alpha-numeric (A-Za-z0-9)
 *   - whitespace
 *   - dash, parens, brackets, slash, comma, period (common in product names)
 *   - + (e.g. "2+1") and % (e.g. "100% 면")
 *   - korean compatibility characters in NFC are inside 가-힣 range already
 *
 * Anything outside this set triggers a "non-allowed special characters" flag.
 * Emojis, excessive `!?` runs, and ASCII art fall outside.
 */
const ALLOWED_CHARS_RE = /^[\s가-힣A-Za-z0-9()[\]{}/,.+\-%·×~&]+$/;

const MIN_NAME_LEN = 25; // Naver SEO sweet-spot lower bound
const MAX_NAME_LEN = 50; // Naver SEO sweet-spot upper bound
const DUPE_THRESHOLD = 3; // same token >=3 times = violation

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type RuleSeverity = 'critical' | 'warning' | 'info';
export type RuleCode =
  | 'banned_word'
  | 'duplicate_word'
  | 'special_chars'
  | 'too_short'
  | 'too_long';

export interface RuleFinding {
  code: RuleCode;
  severity: RuleSeverity;
  message: string;
  /** Tokens that triggered the finding (for highlight, debugging). */
  tokens?: string[];
}

export interface NameRulesResult {
  ok: boolean;
  findings: RuleFinding[];
  /** Highest-severity finding's level, for top-line UI tone. */
  topSeverity: RuleSeverity | null;
  nameLength: number;
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Detect all rule violations in a product name. Pure and fast — no DB, no fetch.
 * Returns an empty findings list when the name is acceptable.
 */
export function detectNameRules(productName: string): NameRulesResult {
  const trimmed = productName.trim();
  const findings: RuleFinding[] = [];
  const len = trimmed.length;

  // (1) Length bounds
  if (len === 0) {
    return { ok: false, findings: [{
      code: 'too_short',
      severity: 'critical',
      message: '상품명이 비어있어요',
    }], topSeverity: 'critical', nameLength: 0 };
  }
  if (len < MIN_NAME_LEN) {
    findings.push({
      code: 'too_short',
      severity: 'warning',
      message: `상품명 ${len}자 — ${MIN_NAME_LEN}자 이상 권장 (Naver 적합도)`,
    });
  } else if (len > MAX_NAME_LEN) {
    findings.push({
      code: 'too_long',
      severity: 'warning',
      message: `상품명 ${len}자 — ${MAX_NAME_LEN}자 이하 권장 (모바일 절단)`,
    });
  }

  // (2) Banned words. Case-insensitive substring match — we surface ALL hits
  // so the user can pick which to remove.
  const lower = trimmed.toLowerCase();
  const bannedHits = BANNED_WORDS.filter((w) => lower.includes(w.toLowerCase()));
  if (bannedHits.length > 0) {
    findings.push({
      code: 'banned_word',
      severity: 'critical',
      message: `금기어 ${bannedHits.length}개 발견 — ${bannedHits.join(', ')} (Naver de-rank 위험)`,
      tokens: bannedHits,
    });
  }

  // (3) Duplicate words (3+ times)
  const tokens = trimmed
    .split(/[\s,/]+/)
    .filter((t) => t.length > 0);
  const counts: Record<string, number> = {};
  for (const t of tokens) counts[t] = (counts[t] || 0) + 1;
  const dupes = Object.entries(counts).filter(([, c]) => c >= DUPE_THRESHOLD);
  if (dupes.length > 0) {
    findings.push({
      code: 'duplicate_word',
      severity: 'critical',
      message: `중복 단어 ${dupes.length}개 — ${dupes.map(([w, c]) => `${w}×${c}`).join(', ')}`,
      tokens: dupes.map(([w]) => w),
    });
  }

  // (4) Non-allowed special characters. Find the offending chars explicitly so
  // the user knows what to remove.
  if (!ALLOWED_CHARS_RE.test(trimmed)) {
    const violating = Array.from(trimmed)
      .filter((ch) => !ALLOWED_CHARS_RE.test(ch))
      .filter((ch, i, arr) => arr.indexOf(ch) === i) // unique
      .slice(0, 10);
    findings.push({
      code: 'special_chars',
      severity: 'warning',
      message: `허용 외 문자 ${violating.length}종 — ${violating.join(' ')} (이모지·특수기호)`,
      tokens: violating,
    });
  }

  const topSeverity: RuleSeverity | null = findings.some((f) => f.severity === 'critical')
    ? 'critical'
    : findings.some((f) => f.severity === 'warning')
      ? 'warning'
      : findings.length > 0
        ? 'info'
        : null;

  return {
    ok: findings.length === 0,
    findings,
    topSeverity,
    nameLength: len,
  };
}

/**
 * Build the warning strings for honey-score's warnings array. Returns only
 * critical+warning level messages (info skipped).
 */
export function buildHoneyScoreWarnings(productName: string): string[] {
  const result = detectNameRules(productName);
  return result.findings
    .filter((f) => f.severity === 'critical' || f.severity === 'warning')
    .map((f) => f.message);
}
