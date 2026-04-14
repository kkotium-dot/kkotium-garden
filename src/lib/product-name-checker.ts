// src/lib/product-name-checker.ts
// D-1: Product name quality checker for Naver Smart Store
// Validates product names against Naver 2026 search quality guidelines
// Applied in: products/new (live), naver-seo inline edit panel

// --- Types ---

export type Severity = 'error' | 'warning' | 'info';

export interface NameIssue {
  severity: Severity;
  code: string;       // machine-readable code for grouping
  message: string;    // user-facing Korean message
  highlight?: { start: number; end: number }; // char range to highlight
}

export interface NameQualityResult {
  score: number;           // 0~100
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  issues: NameIssue[];
  charCount: number;
  wordCount: number;
  isOptimalLength: boolean; // 25~50 chars
}

// --- Constants ---

// Sales condition terms — Naver treats these as abuse/spam
const SALES_CONDITION_TERMS = [
  '무료배송', '당일발송', '당일배송', '오늘출발', '빠른배송',
  '특가', '초특가', '파격', '세일', '할인', '쿠폰',
  '적립', '이벤트', '오늘만', '한정', '한정판매',
  '1+1', '2+1', '사은품', '증정', '덤',
  '최저가', '최저가보장', '가격파괴',
] as const;

// Meaningless modifiers — add no search value, waste char space
const EMPTY_MODIFIERS = [
  '대박', '초대박', '인기', '인기폭발', '핫', '핫딜',
  '베스트', '추천', '강추', '최고', '굿', '뉴', '신상',
  '히트', '명품', '프리미엄급', '고급형',
] as const;

// Naver-banned reference terms in product names
const REFERENCE_TERMS = [
  '상세참조', '상세페이지참조', '상세페이지 참조',
  '상세설명참조', '상품상세참조', '별도표기',
] as const;

// Decorative special characters — Naver penalizes these
const DECORATIVE_CHARS = /[★☆♡♥※◆◇□■♨♣♠♪♬♩☎✿❀❤✔✖⊙◎△▲▽▼◁◀▷▶♤♧♢♤★☆]/;

// Excessive punctuation patterns
const EXCESSIVE_PUNCT = /[!]{2,}|[?]{2,}|[~]{2,}|[.]{3,}/;

// Korean character range for continuous-char detection
const HANGUL_RE = /[\uAC00-\uD7AF]/;

// Common Korean particles/postpositions (unnecessary in product names)
const PARTICLES = ['의', '를', '을', '는', '은', '이', '가', '에서', '으로', '에게', '와', '과', '도'];

// --- Core Logic ---

export function checkProductName(
  name: string,
  options?: {
    storeName?: string;    // seller store name to detect in product name
    brandName?: string;    // brand for position check
    keywords?: string[];   // SEO keywords for inclusion check
  }
): NameQualityResult {
  const trimmed = name.trim();
  const issues: NameIssue[] = [];

  // Word tokenization (split by space, punctuation, brackets)
  const words = trimmed
    .replace(/[()[\]{}/<>,.·\-+&~!?]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const charCount = trimmed.length;
  const wordCount = words.length;

  // ─── 1. Length checks ───

  if (charCount === 0) {
    issues.push({ severity: 'error', code: 'EMPTY', message: '상품명을 입력해주세요' });
  } else if (charCount < 10) {
    issues.push({ severity: 'error', code: 'TOO_SHORT', message: '상품명이 너무 짧습니다 (최소 10자 권장)' });
  } else if (charCount < 25) {
    issues.push({ severity: 'warning', code: 'SHORT', message: '상품명이 25자 미만입니다 — 키워드를 추가하면 노출이 늘어납니다' });
  }

  if (charCount > 100) {
    issues.push({ severity: 'error', code: 'OVER_LIMIT', message: '네이버 상품명 최대 100자 초과' });
  } else if (charCount > 50) {
    issues.push({ severity: 'warning', code: 'LONG', message: '50자 초과 — 네이버 검색 결과에서 잘릴 수 있습니다' });
  }

  // ─── 2. Forbidden sales condition terms ───

  for (const term of SALES_CONDITION_TERMS) {
    const idx = trimmed.indexOf(term);
    if (idx !== -1) {
      issues.push({
        severity: 'error',
        code: 'SALES_TERM',
        message: `"${term}" — 판매조건 문구는 네이버 어뷰징 처리됩니다`,
        highlight: { start: idx, end: idx + term.length },
      });
    }
  }

  // ─── 3. Empty modifiers ───

  for (const mod of EMPTY_MODIFIERS) {
    const idx = trimmed.indexOf(mod);
    if (idx !== -1) {
      issues.push({
        severity: 'warning',
        code: 'EMPTY_MODIFIER',
        message: `"${mod}" — 검색에 도움이 안 되는 수식어입니다. 구체적인 키워드로 교체하세요`,
        highlight: { start: idx, end: idx + mod.length },
      });
    }
  }

  // ─── 4. Reference terms ───

  for (const ref of REFERENCE_TERMS) {
    const lowerName = trimmed.toLowerCase();
    const lowerRef = ref.toLowerCase();
    const idx = lowerName.indexOf(lowerRef);
    if (idx !== -1) {
      issues.push({
        severity: 'error',
        code: 'REFERENCE_TERM',
        message: `"${ref}" — 상품명에 참조 문구를 넣으면 검색 품질 감점됩니다`,
        highlight: { start: idx, end: idx + ref.length },
      });
    }
  }

  // ─── 5. Special characters ───

  if (DECORATIVE_CHARS.test(trimmed)) {
    issues.push({
      severity: 'warning',
      code: 'SPECIAL_CHAR',
      message: '장식용 특수문자는 검색에 불이익이 됩니다 — 제거를 권장합니다',
    });
  }

  if (EXCESSIVE_PUNCT.test(trimmed)) {
    issues.push({
      severity: 'warning',
      code: 'EXCESSIVE_PUNCT',
      message: '느낌표/물음표/물결 반복은 어뷰징으로 감지될 수 있습니다',
    });
  }

  // ─── 6. Word repetition (3+ times = abuse) ───

  const wordFreq: Record<string, number> = {};
  words.forEach(w => {
    const lower = w.toLowerCase();
    if (lower.length >= 2) { // only count words with 2+ chars
      wordFreq[lower] = (wordFreq[lower] || 0) + 1;
    }
  });

  for (const [word, count] of Object.entries(wordFreq)) {
    if (count >= 3) {
      issues.push({
        severity: 'error',
        code: 'WORD_REPEAT',
        message: `"${word}" ${count}회 반복 — 네이버 어뷰징 감지 대상입니다`,
      });
    }
  }

  // ─── 7. Continuous text without spaces ───

  const noSpaceBlocks = trimmed.split(/\s+/).filter(block => {
    // Count Korean chars in this block
    const koreanChars = block.split('').filter(c => HANGUL_RE.test(c)).length;
    return koreanChars >= 15; // 15+ consecutive Korean chars = hard to read
  });

  if (noSpaceBlocks.length > 0) {
    issues.push({
      severity: 'info',
      code: 'NO_SPACE',
      message: '띄어쓰기 없이 15자 이상 연속 — 가독성이 떨어질 수 있습니다',
    });
  }

  // ─── 8. Store/seller name in product name ───

  if (options?.storeName) {
    const store = options.storeName.trim();
    if (store.length >= 2 && trimmed.includes(store)) {
      issues.push({
        severity: 'warning',
        code: 'STORE_NAME',
        message: `스토어명 "${store}"은 상품명에서 제거하세요 — 네이버 검색에서 불이익이 됩니다`,
      });
    }
  }

  // ─── 9. Brand position check ───

  if (options?.brandName) {
    const brand = options.brandName.replace('(협력사)', '').trim();
    if (brand.length >= 2 && trimmed.includes(brand)) {
      const idx = trimmed.indexOf(brand);
      if (idx > 20) {
        issues.push({
          severity: 'info',
          code: 'BRAND_POSITION',
          message: `브랜드명 "${brand}"을 앞쪽으로 이동하면 검색 노출에 유리합니다`,
        });
      }
    }
  }

  // ─── 10. Keyword inclusion check ───

  if (options?.keywords && options.keywords.length > 0) {
    const included = options.keywords.filter(k => k.trim() && trimmed.includes(k.trim()));
    if (included.length === 0 && charCount >= 10) {
      issues.push({
        severity: 'warning',
        code: 'NO_KEYWORD',
        message: 'SEO 키워드가 상품명에 하나도 포함되지 않았습니다',
      });
    }
  }

  // ─── 11. Bracket balance ───

  const openBrackets = (trimmed.match(/[([{]/g) || []).length;
  const closeBrackets = (trimmed.match(/[)\]}]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    issues.push({
      severity: 'info',
      code: 'BRACKET_MISMATCH',
      message: '괄호가 짝이 맞지 않습니다',
    });
  }

  // ─── 12. First 15 chars keyword density ───

  if (charCount >= 25 && options?.keywords && options.keywords.length > 0) {
    const first15 = trimmed.slice(0, 15);
    const hasKeywordInFront = options.keywords.some(k => k.trim() && first15.includes(k.trim()));
    if (!hasKeywordInFront) {
      issues.push({
        severity: 'info',
        code: 'KEYWORD_POSITION',
        message: '핵심 키워드를 앞 15자 안에 배치하면 검색 노출이 더 좋아집니다',
      });
    }
  }

  // ─── 13. Particle check (unnecessary Korean particles) ───

  if (charCount >= 10) {
    const particleCount = PARTICLES.filter(p => {
      // Check if particle appears as standalone (not part of a word)
      const regex = new RegExp(`[가-힣]${p}\\s`, 'g');
      return regex.test(trimmed + ' '); // add trailing space for last word
    }).length;

    if (particleCount >= 3) {
      issues.push({
        severity: 'info',
        code: 'PARTICLES',
        message: '조사(은/는/이/가/를/의)가 많습니다 — 핵심 키워드 나열이 더 효과적입니다',
      });
    }
  }

  // ─── Score calculation ───

  let score = 100;

  // Deductions by severity
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  score -= errorCount * 20;
  score -= warningCount * 8;
  score -= infoCount * 3;

  // Bonus for optimal length
  const isOptimalLength = charCount >= 25 && charCount <= 50;
  if (isOptimalLength) score += 5;

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Grade
  const grade: NameQualityResult['grade'] =
    score >= 90 ? 'S' :
    score >= 75 ? 'A' :
    score >= 55 ? 'B' :
    score >= 35 ? 'C' : 'D';

  return { score, grade, issues, charCount, wordCount, isOptimalLength };
}

// --- Helper: Get color for grade ---

export function getGradeColor(grade: NameQualityResult['grade']): string {
  switch (grade) {
    case 'S': return '#16a34a'; // green-600
    case 'A': return '#2563eb'; // blue-600
    case 'B': return '#d97706'; // amber-600
    case 'C': return '#ea580c'; // orange-600
    case 'D': return '#dc2626'; // red-600
  }
}

// --- Helper: Get severity icon name (Lucide) ---

export function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case 'error': return '#dc2626';   // red-600
    case 'warning': return '#d97706'; // amber-600
    case 'info': return '#6b7280';    // gray-500
  }
}
