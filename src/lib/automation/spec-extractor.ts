// src/lib/automation/spec-extractor.ts
//
// Sprint 7-M2 Step 5-B — Lightweight spec extractor for Korean wholesale
// option strings.
//
// Why this exists
//   B06 (spec table) hallucinated material / size / color when given only the
//   product name + price. Real crawl_logs rarely include structured specs —
//   the only reliable signal is the options[] array. This module parses
//   option names for a small dictionary of Korean wholesale-market tokens
//   and returns ONLY confirmed values. Anything not in the dictionary stays
//   absent so the downstream composer cannot fabricate it.
//
// Design rules
//   - No guessing. Token must literally appear in the option string.
//   - Korean string literals live in `KO_TOKEN_DICTIONARY` (one place, easy
//     to grep). No Korean elsewhere.
//   - Output values stay verbatim Korean (they will be shown to the seller).
//   - Aggregation across options: if multiple options match the same axis,
//     join their values with "/". Example: 정사각 + 직사각 → "정사각/직사각".

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CrawledOption {
  name: string;
  addPrice?: number;
}

/** Confirmed-spec map. Only keys with literal evidence appear. */
export type ExtractedSpecs = Partial<{
  shape: string;
  color: string;
  size: string;
  setQuantity: string;
  material: string;
}>;

// ---------------------------------------------------------------------------
// Token dictionary — single source of truth for Korean spec vocabulary
// ---------------------------------------------------------------------------
//
// Each entry is an axis -> {canonicalKey: alternate spellings}. Matching is
// substring on the option name (already-stripped of common prefix).
// Order in alternates does not matter; the canonical key is what surfaces
// in the output spec table.

interface AxisDictionary {
  axis: keyof ExtractedSpecs;
  /** Canonical Korean label as it will appear in the seller-facing table. */
  label: string;
  values: Record<string, ReadonlyArray<string>>;
}

const KO_TOKEN_DICTIONARY: ReadonlyArray<AxisDictionary> = [
  {
    axis: 'shape',
    label: '형태',
    values: {
      '정사각': ['정사각', '정사각형'],
      '직사각': ['직사각', '직사각형'],
      '원형': ['원형', '둥근'],
      '타원형': ['타원형', '타원'],
      '하트': ['하트', '하트형'],
      '별': ['별모양', '별형'],
    },
  },
  {
    axis: 'color',
    label: '색상',
    values: {
      '화이트': ['화이트', '흰색', '백색'],
      '블랙': ['블랙', '검정', '검은색'],
      '그레이': ['그레이', '회색'],
      '베이지': ['베이지'],
      '네이비': ['네이비', '남색'],
      '아이보리': ['아이보리'],
      '브라운': ['브라운', '갈색'],
      '핑크': ['핑크', '분홍'],
      '레드': ['레드', '빨강', '빨간색'],
      '블루': ['블루', '파랑', '파란색'],
      '그린': ['그린', '초록'],
      '옐로우': ['옐로우', '노랑', '노란색'],
      '실버': ['실버', '은색'],
      '골드': ['골드', '금색'],
    },
  },
  {
    axis: 'size',
    label: '크기',
    values: {
      '소': ['소형', '소(', '(소)', ' 소 '],
      '중': ['중형', '중(', '(중)', ' 중 '],
      '대': ['대형', '대(', '(대)', ' 대 '],
      'S': [' S ', '(S)', 'S사이즈'],
      'M': [' M ', '(M)', 'M사이즈'],
      'L': [' L ', '(L)', 'L사이즈'],
      'XL': ['XL', '엑스라지'],
    },
  },
  {
    axis: 'setQuantity',
    label: '구성',
    values: {
      '2종 세트': ['2종세트', '2종 세트', '2P세트', '2개입'],
      '3종 세트': ['3종세트', '3종 세트', '3P세트', '3개입'],
      '4종 세트': ['4종세트', '4종 세트', '4P세트', '4개입'],
      '5종 세트': ['5종세트', '5종 세트', '5P세트', '5개입'],
      '단품': ['단품', '1개입'],
    },
  },
  {
    axis: 'material',
    label: '소재',
    values: {
      '스테인리스': ['스테인리스', '스텐'],
      '플라스틱': ['플라스틱', 'PP', 'ABS'],
      '실리콘': ['실리콘'],
      '유리': ['유리', '글라스'],
      '도자기': ['도자기', '세라믹'],
      '면': ['면100', '코튼', '면 100'],
      '폴리에스터': ['폴리에스터', '폴리'],
      '나무': ['원목', '나무'],
      '메탈': ['메탈', '금속'],
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Longest common prefix across a list of strings (whole-string compare). */
function commonPrefix(strings: ReadonlyArray<string>): string {
  if (strings.length === 0) return '';
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i += 1) {
    const s = strings[i];
    let j = 0;
    while (j < prefix.length && j < s.length && prefix[j] === s[j]) j += 1;
    prefix = prefix.slice(0, j);
    if (prefix.length === 0) return '';
  }
  return prefix;
}

/** Strip a shared product-name prefix from each option string so token
 *  matching does not collide with the noun in the title. */
function stripSharedPrefix(options: ReadonlyArray<string>): string[] {
  const prefix = commonPrefix(options);
  if (prefix.length < 4) return options.slice();
  return options.map((s) => s.slice(prefix.length));
}

/** Test whether `haystack` contains any of the spelling alternates. */
function matchAny(haystack: string, alternates: ReadonlyArray<string>): boolean {
  return alternates.some((alt) => haystack.includes(alt));
}

/** Numeric size extractor — picks up patterns like "15cm", "30x20cm", "M5".
 *  Returns the literal matched substring or null. */
function extractNumericSize(haystack: string): string | null {
  // <num>cm or <num>x<num>cm or <num> x <num> cm
  const cm = haystack.match(/(\d{1,3})\s*[x×]\s*(\d{1,3})\s*(?:cm|센티)/i);
  if (cm) return `${cm[1]}x${cm[2]}cm`;
  const single = haystack.match(/(\d{2,3})\s*(?:cm|센티)/i);
  if (single) return `${single[1]}cm`;
  return null;
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export interface ParseSpecsResult {
  /** Confirmed-value map keyed by ExtractedSpecs axis. */
  specs: ExtractedSpecs;
  /** Korean-labeled rows ready for direct injection into the B06 prompt. */
  labeledRows: Array<{ label: string; value: string }>;
  /** Number of distinct values matched (for telemetry). */
  matchCount: number;
}

export function parseSpecsFromOptions(
  options: ReadonlyArray<CrawledOption>,
): ParseSpecsResult {
  if (options.length === 0) {
    return { specs: {}, labeledRows: [], matchCount: 0 };
  }

  // Strip shared prefix (product-name noise) so "( 정사각 )" survives but
  // the repeated "디자인 복 달항아리 도어벨" does not pollute matching.
  const cleaned = stripSharedPrefix(options.map((o) => o.name ?? ''));

  // Per-axis accumulators — Set keeps unique canonical values, in match order
  // approximated by iteration through cleaned options.
  const perAxis: Record<string, Set<string>> = {};
  const labelByAxis: Record<string, string> = {};

  for (const dict of KO_TOKEN_DICTIONARY) {
    labelByAxis[dict.axis] = dict.label;
    perAxis[dict.axis] = new Set<string>();
  }

  for (const haystack of cleaned) {
    for (const dict of KO_TOKEN_DICTIONARY) {
      for (const [canonical, alternates] of Object.entries(dict.values)) {
        if (matchAny(haystack, alternates)) {
          perAxis[dict.axis].add(canonical);
        }
      }
    }
    // Numeric size lives outside the dictionary because it is parametric.
    const numericSize = extractNumericSize(haystack);
    if (numericSize) perAxis['size'].add(numericSize);
  }

  // Build outputs.
  const specs: ExtractedSpecs = {};
  const labeledRows: Array<{ label: string; value: string }> = [];

  for (const dict of KO_TOKEN_DICTIONARY) {
    const set = perAxis[dict.axis];
    if (set.size === 0) continue;
    const value = Array.from(set).join('/');
    specs[dict.axis] = value;
    labeledRows.push({ label: dict.label, value });
  }

  return {
    specs,
    labeledRows,
    matchCount: labeledRows.length,
  };
}

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

export const _internals = {
  commonPrefix,
  stripSharedPrefix,
  extractNumericSize,
  KO_TOKEN_DICTIONARY,
};
