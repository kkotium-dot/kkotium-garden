// src/lib/seo/product-name-diagnosis.ts
// ============================================================================
// NAME-DIAG-1 (#151 / #55 / #62) — PURE, product-agnostic Naver 상품명 진단 엔진.
// No API, no React, no DB. Encodes Naver's 표준상품명 9원칙 + ROI rules
// (research §1.5) as a deterministic rule engine that returns a traffic-light
// diagnosis WITH inline "이렇게 고치기" fixes (a deterministic fixedName where a
// fix is unambiguous). UI components only call diagnoseProductName(); the rules
// and the banned-word list live as data so they can be tuned without code
// changes (#62). LANG: surface Korean strings are kept here intentionally — this
// is a domain copy module, not a type-literal (3-1 allows isolated copy).

import bannedData from './banned-words.ko.json';
import { includesNormalized } from '@/lib/seo/match';
import { computeCategoryScore, type CategoryScore } from '@/lib/naver/category-score';
import type { CategoryTrendEntry } from '@/lib/naver/category-trend-cache';

export type CheckStatus = 'pass' | 'warn' | 'fail';
export type NameGrade = 'S' | 'A' | 'B' | 'C';

export interface NameCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  suggestion?: string;
  /** A deterministic corrected name the UI can apply in one click. */
  fixedName?: string;
}

export interface NameDiagnosis {
  score: number; // 0-100
  grade: NameGrade;
  checks: NameCheck[];
}

export interface NameDiagnosisContext {
  categoryPath?: string;
  keywords?: string[];
  brand?: string;
}

// Naver-allowed special characters: ( ) - · [ ] / & + , ~ .
const ALLOWED_SPECIALS = new Set(['(', ')', '-', '·', '[', ']', '/', '&', '+', ',', '~', '.']);

const BANNED_WORDS: string[] = Array.isArray((bannedData as any).banned) ? (bannedData as any).banned : [];
const BORDERLINE_WORDS: string[] = Array.isArray((bannedData as any).borderline) ? (bannedData as any).borderline : [];

// Per-check penalty weights (fail = heavy, warn = light). score = 100 - Σ.
const PENALTY: Record<string, { fail: number; warn: number }> = {
  length:           { fail: 18, warn: 8 },
  keywordInclusion: { fail: 20, warn: 8 },
  spacing:          { fail: 12, warn: 5 },
  duplicateWord:    { fail: 18, warn: 7 },
  specialChar:      { fail: 16, warn: 6 },
  bannedWord:       { fail: 25, warn: 10 },
  brandInName:      { fail: 12, warn: 0 },
  categoryFit:      { fail: 0,  warn: 6 },
};

const collapseSpaces = (s: string) => s.replace(/\s+/g, ' ').trim();
const tokenize = (s: string) => s.trim().split(/\s+/).filter(Boolean);

/** Is this single character a "special" (not letter / number / whitespace)? */
function isSpecialChar(ch: string): boolean {
  return !/[\p{L}\p{N}\s]/u.test(ch);
}

// ── individual checks ───────────────────────────────────────────────────────

function checkLength(name: string): NameCheck {
  const n = name.replace(/\s/g, '').length; // 공백 제외
  const detail = `공백 제외 ${n}자`;
  if (n > 50 || n < 15) {
    return {
      id: 'length', label: '글자 수', status: 'fail', detail,
      suggestion: n > 50 ? '50자를 넘으면 어뷰징 감점 위험 — 핵심 키워드만 남겨 20~45자로 줄이세요.'
                         : '너무 짧아요 — 핵심 키워드를 더해 20~45자로 채우세요.',
    };
  }
  if ((n >= 46 && n <= 50) || (n >= 15 && n <= 19)) {
    return {
      id: 'length', label: '글자 수', status: 'warn', detail,
      suggestion: '권장 길이는 공백 제외 20~45자예요.',
    };
  }
  return { id: 'length', label: '글자 수', status: 'pass', detail: `${detail} · 권장 범위` };
}

function checkKeywordInclusion(name: string, keywords: string[]): NameCheck {
  const kws = keywords.map(k => k.trim()).filter(Boolean);
  if (kws.length === 0) {
    return {
      id: 'keywordInclusion', label: '핵심 키워드 포함', status: 'warn',
      detail: '비교할 황금키워드·태그가 아직 없어요.',
      suggestion: '황금키워드 사냥으로 키워드를 먼저 확보하면 포함 여부를 진단해 드려요.',
    };
  }
  // SEO-MATCH-1 (#154): whitespace-insensitive — name "차량용 방향제" matches
  // golden keyword "차량용방향제" and vice-versa.
  const included = kws.filter(k => includesNormalized(name, k));
  const missing = kws.filter(k => !includesNormalized(name, k));
  if (included.length >= 1) {
    return {
      id: 'keywordInclusion', label: '핵심 키워드 포함', status: 'pass',
      detail: `포함된 키워드 ${included.length}개 (${included.slice(0, 3).join(', ')}${included.length > 3 ? '…' : ''})`,
    };
  }
  return {
    id: 'keywordInclusion', label: '핵심 키워드 포함', status: 'fail',
    detail: '상품명에 핵심 키워드가 하나도 없어요.',
    suggestion: `핵심 키워드를 앞쪽에 배치하세요: ${missing.slice(0, 3).join(', ')}`,
    fixedName: collapseSpaces(`${missing[0]} ${name}`),
  };
}

function checkSpacing(name: string): NameCheck {
  const trimmed = name.trim();
  const tokens = tokenize(name);
  // 전체 무공백 (단일 토큰) + 충분히 길면 = 붙여쓰기 런온
  if (tokens.length === 1 && trimmed.length >= 10) {
    return {
      id: 'spacing', label: '띄어쓰기', status: 'fail',
      detail: '띄어쓰기 없이 한 덩어리로 붙어 있어요.',
      suggestion: '단어 사이를 띄어 검색 매칭을 높이세요 (예: 차량용 디퓨저).',
    };
  }
  if (/\s{2,}/.test(name) || name !== trimmed) {
    return {
      id: 'spacing', label: '띄어쓰기', status: 'warn',
      detail: '이중 공백 또는 앞뒤 공백이 있어요.',
      suggestion: '공백을 한 칸으로 정리하세요.',
      fixedName: collapseSpaces(name),
    };
  }
  return { id: 'spacing', label: '띄어쓰기', status: 'pass', detail: '자연스러운 띄어쓰기' };
}

function checkDuplicateWord(name: string): NameCheck {
  const tokens = tokenize(name);
  const norm = tokens.map(t => t.toLowerCase());
  // exact duplicate token
  const counts = new Map<string, number>();
  norm.forEach(t => counts.set(t, (counts.get(t) ?? 0) + 1));
  const dups = [...counts.entries()].filter(([, c]) => c >= 2).map(([t]) => t);
  if (dups.length > 0) {
    const seen = new Set<string>();
    const deduped: string[] = [];
    tokens.forEach(t => {
      const k = t.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      deduped.push(t);
    });
    const dispomatch = tokens.find(t => dups.includes(t.toLowerCase())) ?? dups[0];
    return {
      id: 'duplicateWord', label: '중복 단어', status: 'fail',
      detail: `"${dispomatch}"가 2번 이상 반복돼요.`,
      suggestion: '같은 단어 반복은 어뷰징 감점이에요 — 한 번만 쓰세요.',
      fixedName: deduped.join(' '),
    };
  }
  // partial overlap (one token contains another, len>=2) = 부분중복 warn
  for (let i = 0; i < norm.length; i++) {
    for (let j = 0; j < norm.length; j++) {
      if (i === j) continue;
      if (norm[i].length >= 2 && norm[j].length > norm[i].length && norm[j].includes(norm[i])) {
        return {
          id: 'duplicateWord', label: '중복 단어', status: 'warn',
          detail: `"${tokens[i]}"가 "${tokens[j]}"에 겹쳐요.`,
          suggestion: '의미가 겹치는 단어는 하나로 합치는 게 좋아요.',
        };
      }
    }
  }
  return { id: 'duplicateWord', label: '중복 단어', status: 'pass', detail: '반복 단어 없음' };
}

function checkSpecialChar(name: string): NameCheck {
  const specials = [...name].filter(isSpecialChar);
  const banned = specials.filter(ch => !ALLOWED_SPECIALS.has(ch));
  const allowed = specials.filter(ch => ALLOWED_SPECIALS.has(ch));
  if (banned.length > 0) {
    const uniqueBanned = [...new Set(banned)];
    // Strip banned specials char-by-char (a RegExp char-class with arbitrary
    // chars + the /u flag throws on identity escapes like \! or \★).
    const stripped = [...name]
      .filter(ch => !(isSpecialChar(ch) && !ALLOWED_SPECIALS.has(ch)))
      .join('');
    return {
      id: 'specialChar', label: '특수문자', status: 'fail',
      detail: `금지 특수문자 ${uniqueBanned.join(' ')} 포함`,
      suggestion: '네이버가 막는 특수문자·이모지는 빼야 검색에 노출돼요.',
      fixedName: collapseSpaces(stripped),
    };
  }
  if (allowed.length >= 3) {
    return {
      id: 'specialChar', label: '특수문자', status: 'warn',
      detail: `허용 기호가 ${allowed.length}개로 많아요.`,
      suggestion: '특수문자는 꼭 필요한 곳에만 소량 쓰세요.',
    };
  }
  return { id: 'specialChar', label: '특수문자', status: 'pass', detail: allowed.length ? '허용 기호 소량' : '특수문자 없음' };
}

function checkBannedWord(name: string): NameCheck {
  const lower = name.toLowerCase();
  const hitBanned = BANNED_WORDS.filter(w => lower.includes(w.toLowerCase()));
  if (hitBanned.length > 0) {
    let fixed = name;
    hitBanned.forEach(w => {
      const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      fixed = fixed.replace(re, ' ');
    });
    return {
      id: 'bannedWord', label: '금지·홍보어', status: 'fail',
      detail: `홍보성 금지어 포함: ${hitBanned.slice(0, 4).join(', ')}`,
      suggestion: '주문폭주·최저가·1위 같은 홍보·과장어는 상품명에서 빼세요 (저품질 감점).',
      fixedName: collapseSpaces(fixed),
    };
  }
  const hitBorder = BORDERLINE_WORDS.filter(w => lower.includes(w.toLowerCase()));
  if (hitBorder.length > 0) {
    return {
      id: 'bannedWord', label: '금지·홍보어', status: 'warn',
      detail: `경계 단어: ${hitBorder.join(', ')}`,
      suggestion: '명품·고급 등은 실제 모델명/고유명일 때만 써도 안전해요.',
    };
  }
  return { id: 'bannedWord', label: '금지·홍보어', status: 'pass', detail: '금지어 없음' };
}

function checkBrandInName(name: string, brand?: string): NameCheck {
  const b = (brand ?? '').trim();
  if (b && name.toLowerCase().includes(b.toLowerCase())) {
    const re = new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return {
      id: 'brandInName', label: '브랜드 분리', status: 'fail',
      detail: `브랜드 "${b}"가 상품명에 들어 있어요.`,
      suggestion: '브랜드는 상품명에서 빼고 브랜드 필드에 입력해야 매칭 노출이 더 좋아져요.',
      fixedName: collapseSpaces(name.replace(re, '')),
    };
  }
  return { id: 'brandInName', label: '브랜드 분리', status: 'pass', detail: '브랜드는 별도 필드로 관리' };
}

function checkCategoryFit(categoryPath?: string): NameCheck {
  if (categoryPath && categoryPath.trim()) {
    return { id: 'categoryFit', label: '카테고리 적합', status: 'pass', detail: '카테고리 선택됨' };
  }
  return {
    id: 'categoryFit', label: '카테고리 적합', status: 'warn',
    detail: '카테고리가 아직 선택되지 않았어요.',
    suggestion: '카테고리를 먼저 선택하면 적합도(노출) 진단 정확도가 올라가요.',
  };
}

function toGrade(score: number): NameGrade {
  if (score >= 90) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  return 'C';
}

/**
 * PURE entry point. Returns a traffic-light diagnosis + per-check inline fixes
 * for a product name. No side effects; safe to call on every keystroke.
 */
export function diagnoseProductName(name: string, ctx: NameDiagnosisContext = {}): NameDiagnosis {
  if (!name || !name.trim()) {
    return { score: 0, grade: 'C', checks: [] };
  }
  const checks: NameCheck[] = [
    checkLength(name),
    checkKeywordInclusion(name, ctx.keywords ?? []),
    checkSpacing(name),
    checkDuplicateWord(name),
    checkSpecialChar(name),
    checkBannedWord(name),
    checkBrandInName(name, ctx.brand),
    checkCategoryFit(ctx.categoryPath),
  ];

  let penalty = 0;
  for (const c of checks) {
    const w = PENALTY[c.id];
    if (!w) continue;
    if (c.status === 'fail') penalty += w.fail;
    else if (c.status === 'warn') penalty += w.warn;
  }
  const score = Math.max(0, Math.min(100, 100 - penalty));
  return { score, grade: toGrade(score), checks };
}

// ── NAME-DIAG-2: keyword competition (경쟁강도 = 상품수 ÷ 검색량) ──────────────
// PURE helpers only — the actual volume/count fetch happens in the
// /api/naver/keyword-competition route (Naver SearchAd + Shopping). research §1.4:
// 경쟁강도 1 초과 = 공급과다; 10~30 = 경쟁력 有(롱테일 sweet spot); >=30 = 주의.

export type CompetitionBand = 'low' | 'mid' | 'high';

export interface KeywordCompetition {
  keyword: string;
  searchVolume: number | null;   // monthly searches; null = unavailable (never faked)
  productCount: number | null;   // shopping result count; null = unavailable
  ratio: number | null;          // productCount / searchVolume; null = unavailable
  band: CompetitionBand | null;
  recommended?: boolean;         // a viable longtail (band !== high, has real volume)
}

/** research §1.4 banding. null in -> null out (no fabrication). */
export function competitionBand(ratio: number | null): CompetitionBand | null {
  if (ratio == null || !isFinite(ratio)) return null;
  if (ratio < 10) return 'low';
  if (ratio < 30) return 'mid';
  return 'high';
}

// Weak/structural tokens that aren't useful as a search head term.
const WEAK_TOKENS = new Set(['본품', '세트', '용', '형', '개', '구', '입', '특가', '정품']);

/** Split a product name into candidate head keywords, strongest (longest) first. */
export function extractMainKeywordTokens(name: string): string[] {
  const seen = new Set<string>();
  return name.trim().split(/\s+/)
    .map(t => t.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(t => t.length >= 2 && !WEAK_TOKENS.has(t))
    .filter(t => { const k = t.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => b.length - a.length);
}

// Generic longtail modifiers (용도·규격·타깃·시즌). Whether each is actually a
// good swap is decided by its MEASURED competition, not by this list.
const LONGTAIL_MODIFIERS = ['실내', '차량용', '대용량', '선물용', '휴대용', '미니'];

/** Build longtail candidates by prefixing modifiers onto a head keyword. */
export function buildLongtailCandidates(token: string, max = 4): string[] {
  return LONGTAIL_MODIFIERS
    .filter(m => !token.startsWith(m))
    .slice(0, max)
    .map(m => `${m}${token}`);
}

// ── NAME-DIAG-3: 부활 상품명 종합 진단 (composition, #249 흐름) ────────────────
// Authority: docs/design/SEO_NAME_DIAGNOSIS_ENGINE_SPEC_2026-07-12.md
// PURE composition — reuses diagnoseProductName (name rules) + computeCategoryScore
// (SEO×ROI trend, #249) so the revival hub can rank a product name's weaknesses
// and surface the highest-impact fixes WITHOUT a second rule engine (#34 no dupe).
// No I/O, no clock: the caller resolves the (async) trend entry and injects it,
// exactly like category-score. Seller language (#233), honest limits (#231).

export type TrendReflection = 'strong' | 'ok' | 'weak' | 'unknown';

export interface NameWeakness {
  id: string;
  label: string;
  severity: 'fail' | 'warn';
  detail: string;
}

export interface NameDiagnosisInput {
  name: string;
  /** Category triple for the SEO×ROI/trend axis. If absent, parsed from categoryPath. */
  d1?: string;
  d2?: string;
  d3?: string;
  categoryPath?: string;
  keywords?: string[];
  brand?: string;
  supplierPrice?: number | null;
  shippingFee?: number | null;
  /** Resolved D1 trend entry (from category-trend-cache); caller does the async lookup. */
  trend?: CategoryTrendEntry | null;
}

export interface NameDiagnosisPlus {
  nameScore: number; // 0-100 (diagnoseProductName)
  nameGrade: NameGrade;
  categoryScore: CategoryScore | null; // #249 SEO×ROI (null when category unknown)
  trendReflected: TrendReflection;
  weaknesses: NameWeakness[]; // fail→warn, ranked by penalty weight
  suggestions: string[]; // top 1..3 improvements, seller language (#233)
  caveats: string[]; // honest data limits (#231)
  grade: NameGrade; // overall: name-centric with a small trend nudge
}

const MAX_SUGGESTIONS = 3;

function parseCategoryTriple(
  input: NameDiagnosisInput,
): { d1: string; d2: string; d3: string } | null {
  if (input.d1 && input.d1.trim()) {
    return { d1: input.d1.trim(), d2: (input.d2 ?? '').trim(), d3: (input.d3 ?? '').trim() };
  }
  const parts = (input.categoryPath ?? '')
    .split(/\s*[>/]\s*/)
    .map(p => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return { d1: parts[0], d2: parts[1] ?? '', d3: parts[2] ?? '' };
}

function trendBand(score: CategoryScore | null): TrendReflection {
  // trendScore === null means the cache is cold -> we did not actually observe
  // a trend, so it is 'unknown' (no reward, no penalty), not 'weak'.
  if (!score || score.detail.trendScore == null) return 'unknown';
  const s = score.seoScore;
  if (s >= 60) return 'strong';
  if (s >= 30) return 'ok';
  return 'weak';
}

/**
 * PURE. Revival-oriented composite name diagnosis. Ranks the name's weaknesses
 * and returns the highest-impact fixes plus the SEO×ROI trend context.
 */
export function computeNameDiagnosis(input: NameDiagnosisInput): NameDiagnosisPlus {
  const base = diagnoseProductName(input.name, {
    categoryPath: input.categoryPath,
    keywords: input.keywords,
    brand: input.brand,
  });

  // #249 SEO×ROI trend axis (only when we know the category).
  const triple = parseCategoryTriple(input);
  const categoryScore = triple
    ? computeCategoryScore({
        d1: triple.d1,
        d2: triple.d2,
        d3: triple.d3,
        supplierPrice: input.supplierPrice,
        shippingFee: input.shippingFee,
        trend: input.trend,
      })
    : null;
  const trendReflected = trendBand(categoryScore);

  // Rank the failing/weak checks by their penalty weight (heaviest first).
  const ranked = base.checks
    .filter(c => c.status === 'fail' || c.status === 'warn')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'fail' ? -1 : 1;
      const wa = PENALTY[a.id]?.[a.status as 'fail' | 'warn'] ?? 0;
      const wb = PENALTY[b.id]?.[b.status as 'fail' | 'warn'] ?? 0;
      return wb - wa;
    });

  const weaknesses: NameWeakness[] = ranked.map(c => ({
    id: c.id,
    label: c.label,
    severity: c.status as 'fail' | 'warn',
    detail: c.detail,
  }));

  // Top improvement suggestions (#233): the strongest checks' own suggestions,
  // plus a trend-derived one when the category search demand is weak.
  const suggestions: string[] = [];
  for (const c of ranked) {
    if (c.suggestion && !suggestions.includes(c.suggestion)) {
      suggestions.push(c.suggestion);
      if (suggestions.length >= MAX_SUGGESTIONS) break;
    }
  }
  if (suggestions.length < MAX_SUGGESTIONS && trendReflected === 'weak') {
    suggestions.push('이 카테고리는 검색 수요가 낮은 편이에요 — 검색 상승세 세부 키워드를 상품명 앞에 넣어보세요.');
  }

  // Honest limits (#231): inherit category-score caveats, add a keyword caveat.
  const caveats: string[] = [];
  if (categoryScore) caveats.push(...categoryScore.caveats);
  const hasKeywords = (input.keywords ?? []).some(k => k.trim());
  if (!hasKeywords) {
    caveats.push('황금키워드가 아직 없어 키워드 포함 진단은 참고용이에요 — 키워드 확보 후 정밀해져요.');
  }
  const dedupCaveats = [...new Set(caveats)];

  // Overall grade: name-centric, nudged a little by the trend reflection.
  const nudge = trendReflected === 'strong' ? 5 : trendReflected === 'weak' ? -5 : 0;
  const overallScore = Math.max(0, Math.min(100, base.score + nudge));

  return {
    nameScore: base.score,
    nameGrade: base.grade,
    categoryScore,
    trendReflected,
    weaknesses,
    suggestions,
    caveats: dedupCaveats,
    grade: toGrade(overallScore),
  };
}
