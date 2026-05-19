// src/lib/automation/groq-copywriter.ts
//
// Sprint 7-M2 Step 4 — Groq SEO copy bundler for the L1 automation pipeline.
//
// Scope (different from src/lib/automation/copy-writer.ts):
//   - copy-writer.ts generates short THUMBNAIL slot strings (hook /
//     priceBadge / categoryBadge / lifestyleCaption) consumed by Sharp.
//   - THIS module generates the bulk SEO copy that Product columns expect:
//       • goldenKeywords      7 entries (네이버 검색 노출용 황금키워드)
//       • productNames        3 candidates (네이버 상품명 후보)
//       • tags               10 entries (네이버 태그 풀)
//       • hookPhrases         3 candidates (썸네일/상세 진입 훅 문구)
//   - Used by POST /api/automation/l1 to fill Product.name / tags /
//     keywords / hookPhrase columns for the L1 grade.
//
// Engine: callGroq() from src/lib/ai/groq.ts (llama-3.3-70b-versatile,
// 3-key round-robin, OpenAI-compatible /chat/completions endpoint).
// Per workflow principle #38, Groq is the only runtime LLM allowed; the
// Anthropic last-resort path is left to copy-writer.ts which handles
// thumbnail slots where dark-pattern compliance is critical.
//
// Output format: strict JSON. The prompt commands the model to reply with a
// single JSON object matching the GroqCopyBundle shape below. The parser
// extracts the first {...} block and validates each field; if validation
// fails, a deterministic fallback bundle is returned with `source: 'fallback'`.

import { callGroq } from '@/lib/ai/groq';

export interface GroqCopyRequest {
  productName: string;
  /** Free-text category label (e.g. '인테리어소품'). */
  category?: string | null;
  /** Naver category code; used as a hint to bias the prompt. */
  naverCategoryCode?: string | null;
  /** Skeleton ID picked by /api/diagnose. Drives copy global tone. */
  skeletonId?: string | null;
  /** Sale price in KRW, used by the model as a positioning anchor only. */
  salePrice?: number | null;
  /** Optional product description used as extra context. */
  description?: string | null;
}

export interface GroqCopyBundle {
  goldenKeywords: string[];
  productNames: string[];
  tags: string[];
  hookPhrases: string[];
}

export interface GroqCopyResult {
  bundle: GroqCopyBundle;
  source: 'groq' | 'fallback';
  filtered: boolean;
  /** Rough token estimate of the prompt only. */
  promptCharsApprox: number;
  /** Error message when falling back. */
  fallbackReason?: string;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
  '네이버 스마트스토어 SEO 전문가. 결과는 한국어 JSON만 출력하고 ' +
  '코드블록이나 설명을 붙이지 않는다. 광고 금기어(최저가, 1위, 정품, ' +
  '공식, 마감 임박, 한정 수량, 무조건, 100%)는 절대 사용하지 않는다.';

function buildSkeletonHint(skeletonId: string | null | undefined): string {
  switch (skeletonId) {
    case 'S1': return '꽃/식물 등 일상용 단품. 차분하고 친절한 어조.';
    case 'S2': return '식품/디저트 옵션형. 청결과 신선함을 강조하는 어조.';
    case 'S3': return '감성 인테리어/리빙. 따뜻하고 부드러운 어조.';
    case 'S4': return '프로 단품 (도구/문구류). 실용성 중심 어조.';
    case 'S5': return '프리미엄 선물 세트. 격식 있고 정중한 어조.';
    case 'S6': return '의류/패션 단품. 깔끔하고 자신감 있는 어조.';
    case 'S7': return '뷰티/헬스. 안전과 효능을 차분히 설명하는 어조.';
    case 'S8': return '시즌/이벤트 세트. 활기차지만 과장 없는 어조.';
    case 'S9': return '가전/전자. 스펙 중심, 군더더기 없는 어조.';
    case 'S10': return '반려동물/펫. 다정하고 안심되는 어조.';
    case 'S11': return '시즌/이벤트/빈티지. 분위기 환기 중심 어조.';
    case 'S12': return '커스텀/주문제작. 정성과 정확성 강조.';
    case 'S13': return '편안 홈웨어. 부드럽고 일상적인 어조.';
    case 'S14': return '돌봄/안심 (영유아/케어). 안전과 신뢰 강조.';
    default: return '친절하고 차분한 어조. 과장 없이 사실 중심.';
  }
}

function buildUserPrompt(req: GroqCopyRequest): string {
  const tone = buildSkeletonHint(req.skeletonId ?? null);
  const lines: string[] = [
    '아래 상품에 대한 네이버 SEO 카피를 만들어 주세요.',
    '',
    `상품명: ${req.productName}`,
  ];
  if (req.category) lines.push(`카테고리: ${req.category}`);
  if (req.naverCategoryCode) lines.push(`네이버 카테고리 코드: ${req.naverCategoryCode}`);
  if (typeof req.salePrice === 'number' && req.salePrice > 0) {
    lines.push(`판매가: ${req.salePrice.toLocaleString('ko-KR')}원`);
  }
  if (req.description) {
    const trimmed = req.description.length > 400
      ? `${req.description.slice(0, 400)}…`
      : req.description;
    lines.push(`설명: ${trimmed}`);
  }
  lines.push('', `톤 가이드: ${tone}`, '');
  lines.push('출력 JSON 스키마 (반드시 이 키 4개만, 다른 키 금지):');
  lines.push('{');
  lines.push('  "goldenKeywords": [정확히 7개의 한국어 검색 키워드, 각 2~8자],');
  lines.push('  "productNames":   [정확히 3개의 상품명 후보, 각 8~30자, 금기어 금지],');
  lines.push('  "tags":           [정확히 10개의 한국어 태그, 각 2~12자],');
  lines.push('  "hookPhrases":    [정확히 3개의 한 줄 훅 문구, 각 8~28자]');
  lines.push('}');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Parser + validator
// ---------------------------------------------------------------------------

const BANNED_PATTERNS = [
  /최저가/, /1위/, /정품/, /공식/, /마감\s*임박/, /한정\s*수량/,
  /무조건/, /100\s*%/, /독점/, /깜짝/,
];

function stripBanned(items: string[]): { items: string[]; filtered: boolean } {
  let filtered = false;
  const cleaned = items.map((s) => {
    let next = s;
    for (const pat of BANNED_PATTERNS) {
      if (pat.test(next)) {
        next = next.replace(pat, '').trim();
        filtered = true;
      }
    }
    return next;
  });
  return { items: cleaned, filtered };
}

function ensureLength(items: string[], target: number, fallback: string): string[] {
  const trimmed = items.map((s) => s.trim()).filter((s) => s.length > 0);
  while (trimmed.length < target) trimmed.push(fallback);
  return trimmed.slice(0, target);
}

function parseBundle(raw: string): GroqCopyBundle | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) return null;
  const json = raw.slice(start, end + 1);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  const toStrings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => String(x)) : [];
  return {
    goldenKeywords: toStrings(obj.goldenKeywords),
    productNames:   toStrings(obj.productNames),
    tags:           toStrings(obj.tags),
    hookPhrases:    toStrings(obj.hookPhrases),
  };
}

function buildFallback(req: GroqCopyRequest): GroqCopyBundle {
  const name = req.productName.trim();
  const base = name.length > 0 ? name : '상품';
  const cat = req.category?.trim() || '일상';
  return {
    goldenKeywords: [base, `${base} ${cat}`, `${cat} 추천`, '꽃틔움', '디자인', '선물', '신상'],
    productNames:   [base, `${base} ${cat}`, `${cat} ${base}`],
    tags:           [base, cat, '꽃틔움', '디자인', '추천', '신상', '선물', '인기', '리빙', '데일리'],
    hookPhrases:    [`${cat} 일상에 자연스럽게`, `${base}, 가까운 곳부터`, `오늘의 작은 선택`],
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateSeoCopyBundle(
  req: GroqCopyRequest,
): Promise<GroqCopyResult> {
  const userPrompt = buildUserPrompt(req);
  const promptCharsApprox = SYSTEM_PROMPT.length + userPrompt.length;

  let raw: string;
  try {
    raw = await callGroq(userPrompt, SYSTEM_PROMPT);
  } catch (err) {
    return {
      bundle: buildFallback(req),
      source: 'fallback',
      filtered: false,
      promptCharsApprox,
      fallbackReason: err instanceof Error ? err.message : String(err),
    };
  }

  const parsed = parseBundle(raw);
  if (!parsed) {
    return {
      bundle: buildFallback(req),
      source: 'fallback',
      filtered: false,
      promptCharsApprox,
      fallbackReason: 'invalid JSON',
    };
  }

  const fb = buildFallback(req);
  const gk = stripBanned(parsed.goldenKeywords);
  const pn = stripBanned(parsed.productNames);
  const tg = stripBanned(parsed.tags);
  const hp = stripBanned(parsed.hookPhrases);

  const bundle: GroqCopyBundle = {
    goldenKeywords: ensureLength(gk.items, 7,  fb.goldenKeywords[0]),
    productNames:   ensureLength(pn.items, 3,  fb.productNames[0]),
    tags:           ensureLength(tg.items, 10, fb.tags[0]),
    hookPhrases:    ensureLength(hp.items, 3,  fb.hookPhrases[0]),
  };

  return {
    bundle,
    source: 'groq',
    filtered: gk.filtered || pn.filtered || tg.filtered || hp.filtered,
    promptCharsApprox,
  };
}
