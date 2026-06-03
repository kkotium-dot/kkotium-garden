// src/app/api/naver-seo/ai-generate/route.ts
// AI SEO generator — 3 style modes: orthodox / emotional / niche
// Provider priority (Sprint 7-PC-D 2026-05-19):
//   1. Groq llama-3.3-70b-versatile (3 keys round-robin, free 43,200/day)
//   2. Anthropic Claude Sonnet (last-resort, cost-capped)
//
// DEPRECATED chains (removed in this commit):
//   - Perplexity sonar-pro (Pro plan expired 2026-05)
//   - Google Gemini 2.0 Flash (revoked due to backup file exposure)
//   - xAI Grok (cost-capped, not in primary stack)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { analyzeCompetition, type CompetitionAnalysis } from '@/lib/naver/shopping-search';
import {
  fetchKeywordVolumes,
  fetchRelatedKeywords,
  normalizeKeyword,
  type VolumeRow,
} from '@/lib/naver/searchad-volume';
import { callGroq, GROQ_MODEL } from '@/lib/ai/groq';

// ─── Style mode type ──────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';
type SeoStyle = 'orthodox' | 'emotional' | 'niche';

// ─── Search volume helpers (Lane 1-B, 2026-06-01) ─────────────────────────────
//
// Intent weighting (purchase intent > raw absolute volume):
//   - Contains any INTENT_TOKEN  → ×2.0  (gift/occasion = high conversion)
//   - Exactly a GENERIC_TOKEN    → ×0.3  (broad-match deboost)
//   - Otherwise                  → ×1.0
//
// Single whitelist source — kept intentionally short (workrule "단순화 우선",
// 2026-06-01 user spec). Tuning is an explicit follow-up turn, not silent
// expansion here.

const INTENT_TOKENS = new Set<string>([
  '선물', '집들이', '개업', '이사', '결혼', '신혼', '돌잔치', '환갑', '백일',
]);
const GENERIC_TOKENS = new Set<string>([
  '인테리어', '디자인', '장식', '소품', '제품', '상품', '아이템',
]);

/** Occasions that take "+ 선물" intent-suffix expansion in n-gram generation.
 *  Subset of INTENT_TOKENS — purchase-intent suffixes only. */
const INTENT_OCCASIONS = ['집들이', '개업', '이사', '결혼', '신혼'] as const;
const INTENT_SUFFIX = '선물';

const POOL_CAP = 15;

// Lane 1-C (2026-06-01) — naver_title length-fill targets.
//   Naver hard cap: 50 chars. We fill UP TO TARGET_MAX (45 — 5-char safety
//   margin) WHEN current length is below TARGET_MIN (35). The fill draws
//   from finalScored (measured pool) in intent-weighted order, skipping
//   any keyword whose tokens already appear in the title (anti-stuffing).
const TITLE_TARGET_MIN_LENGTH = 35;
const TITLE_TARGET_MAX_LENGTH = 45;
const TITLE_HARD_CAP = 50;

function intentMultiplier(kw: string): number {
  const k = kw.replace(/\s+/g, '');
  for (const t of INTENT_TOKENS) {
    if (k.includes(t)) return 2.0;
  }
  if (GENERIC_TOKENS.has(k)) return 0.3;
  return 1.0;
}

function scoreKeyword(volume: number, kw: string): number {
  return volume * intentMultiplier(kw);
}

/** Token-aware "is this keyword already in the title" check, used by the
 *  Lane 1-C length-fill loop. Returns true when:
 *    - the candidate is a substring of the title (already present), OR
 *    - any whitespace-separated title token (>= 2 chars) is a substring of
 *      the candidate (the candidate would re-introduce an existing word as
 *      part of a longer phrase — keyword-stuffing pattern).
 *  Comparison is whitespace-stripped + lowercased per normalizeKeyword. */
function titleAlreadyHas(title: string, kw: string): boolean {
  const titleNorm = normalizeKeyword(title);
  const kwNorm = normalizeKeyword(kw);
  if (!kwNorm) return true;
  if (titleNorm.includes(kwNorm)) return true;
  const tokens = title
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  for (const t of tokens) {
    const tn = normalizeKeyword(t);
    if (tn && kwNorm.includes(tn)) return true;
  }
  return false;
}

interface CandidateBundle {
  pool: string[];
  tokenCount: number;
  intentComboCount: number;
  ngramCount: number;
}

/** Build the candidate keyword pool that gets SearchAd-priced BEFORE the AI
 *  call. Three priority tiers (added in order, deduped, capped at POOL_CAP):
 *
 *   1. SPACE-SPLIT TOKENS of the productName (length [2, 15])
 *   2. INTENT-SUFFIX COMBOS — occasion + "선물" (e.g. "집들이선물") when the
 *      occasion appears anywhere in the productName.
 *   3. ADJACENT 2-GRAMS — concatenated without space (e.g. "달항아리도어벨").
 *
 *  SearchAd's /keywordstool rejects multi-word hints, so all candidates are
 *  whitespace-free and <= 15 chars. Adjacent 2-grams that are nonsense get
 *  filtered server-side by exact-match (workrule #46 — no fabricated rows).
 */
function extractCandidates(productName: string): CandidateBundle {
  const cleaned = (productName ?? '')
    .replace(/[,\.\(\)\[\]\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) {
    return { pool: [], tokenCount: 0, intentComboCount: 0, ngramCount: 0 };
  }

  const tokens = cleaned
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 15);

  // Tier 2: intent-suffix combinations (occasion + 선물).
  const text = cleaned.replace(/\s+/g, '');
  const intentCombos: string[] = [];
  for (const occ of INTENT_OCCASIONS) {
    if (text.includes(occ)) {
      const combo = occ + INTENT_SUFFIX;
      if (combo.length >= 2 && combo.length <= 15) {
        intentCombos.push(combo);
      }
    }
  }

  // Tier 3: adjacent 2-grams (concatenated, no space).
  const ngrams: string[] = [];
  for (let i = 0; i + 1 < tokens.length; i++) {
    const cat = (tokens[i] + tokens[i + 1]).replace(/\s+/g, '');
    if (cat.length >= 2 && cat.length <= 15) ngrams.push(cat);
  }

  const pool: string[] = [];
  const seen = new Set<string>();
  let tokenCount = 0;
  let intentComboCount = 0;
  let ngramCount = 0;
  const push = (k: string, kind: 'token' | 'combo' | 'ngram'): boolean => {
    const n = normalizeKeyword(k);
    if (seen.has(n)) return false;
    if (pool.length >= POOL_CAP) return false;
    seen.add(n);
    pool.push(k);
    if (kind === 'token') tokenCount++;
    else if (kind === 'combo') intentComboCount++;
    else ngramCount++;
    return true;
  };

  for (const k of tokens) push(k, 'token');
  for (const k of intentCombos) push(k, 'combo');
  for (const k of ngrams) push(k, 'ngram');

  return { pool, tokenCount, intentComboCount, ngramCount };
}

/** Scope A (2026-06-03): pick up to 3 seed keywords for related-keyword
 *  harvesting. Seeds are the distinctive nouns of the product name — drawn
 *  from the bundle's productName tokens (the first `tokenCount` pool entries,
 *  which are pushed before combos/n-grams), skipping GENERIC_TOKENS so we
 *  seed on "달항아리" rather than "인테리어". SearchAd expands each seed into
 *  hundreds of market keywords, so 1–3 well-chosen seeds is plenty.
 *
 *  Fallback: if every token is generic, seed on the first token anyway —
 *  harvesting on a broad term still beats harvesting nothing. */
function extractSeeds(bundle: CandidateBundle): string[] {
  const tokens = bundle.pool.slice(0, bundle.tokenCount);
  const seeds: string[] = [];
  const seen = new Set<string>();
  for (const t of tokens) {
    const n = normalizeKeyword(t);
    if (!n || seen.has(n)) continue;
    if (GENERIC_TOKENS.has(t.replace(/\s+/g, ''))) continue;
    seen.add(n);
    seeds.push(t);
    if (seeds.length >= 3) break;
  }
  if (seeds.length === 0 && tokens.length > 0) seeds.push(tokens[0]);
  return seeds;
}

/** Render the measured search-volume rows as an additional prompt section.
 *  Sorted by descending intent-weighted score so the AI sees the highest-
 *  conversion keywords first. Workrule #46: never fabricate counts — only
 *  print what SearchAd returned. Returns the top intent keyword separately
 *  so the caller can use it for title-prefix validation. */
function renderVolumeContext(
  rows: VolumeRow[],
): { ctx: string; topIntentKw: string | null } {
  if (rows.length === 0) return { ctx: '', topIntentKw: null };

  const scored = [...rows]
    .map((r) => ({
      row: r,
      score: scoreKeyword(r.totalMonthlyQc, r.keyword),
    }))
    .sort((a, b) => b.score - a.score);

  const topIntentKw = scored[0]?.row.keyword ?? null;
  const top3Lines = scored
    .slice(0, 3)
    .map(
      ({ row, score }, i) =>
        `${i + 1}. "${row.keyword}" — score ${Math.round(score).toLocaleString('en-US')} (vol ${row.totalMonthlyQc.toLocaleString('en-US')}/mo × intent ${intentMultiplier(row.keyword).toFixed(1)}, comp ${row.compIdx ?? 'unknown'})`,
    )
    .join('\n');
  const allLines = scored
    .slice(0, 12)
    .map(
      ({ row }) =>
        `- "${row.keyword}": ${row.totalMonthlyQc.toLocaleString('en-US')}/mo (PC ${row.monthlyPcQc} + Mobile ${row.monthlyMobileQc}), comp ${row.compIdx ?? 'unknown'}, intent×${intentMultiplier(row.keyword).toFixed(1)}`,
    )
    .join('\n');

  const ctx = `\n[INTENT-WEIGHTED TOP-3 (volume × purchase-intent; 선물/집들이/이사/개업/결혼/신혼 boost ×2, 인테리어/디자인/장식 deboost ×0.3)]
${top3Lines}

CRITICAL naver_title CONSTRAINT:
- naver_title MUST BEGIN with "${topIntentKw}" — the #1 intent-weighted keyword.
- The first 15 characters of naver_title MUST contain "${topIntentKw}".
- Do NOT lead naver_title with generic words (인테리어 / 디자인 / 장식 / 소품).

[ALL MEASURED VOLUMES — Naver SearchAd /keywordstool]
${allLines}

naver_keywords ordering — descending intent-weighted score (same order as TOP-3 above).
Workrule #46: never fabricate volume figures for unmeasured keywords.\n`;

  return { ctx, topIntentKw };
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildPrompt(
  productName: string,
  style: SeoStyle,
  market?: CompetitionAnalysis | null,
  volumes?: VolumeRow[] | null,
): string {
  const marketContext = market
    ? `\n[MARKET DATA — use this to optimize keywords and pricing strategy]
Competitors: ${market.totalResults.toLocaleString()} results (${market.competitionLevel})
Price range: ${market.minPrice.toLocaleString()}~${market.maxPrice.toLocaleString()} KRW (avg ${market.avgPrice.toLocaleString()})
Top sellers: ${market.topSellers.slice(0, 3).join(', ')}
- If HIGH/VERY_HIGH competition: use long-tail keywords, niche attributes
- If LOW/MEDIUM: use broad high-volume keywords\n`
    : '';
  const volumeContext = volumes && volumes.length > 0
    ? renderVolumeContext(volumes).ctx
    : '';
  const base = `Product name: ${productName}${marketContext}${volumeContext}
Respond ONLY with a raw JSON object. No markdown, no explanation, no preamble. First char must be {.

{
  "naver_title": "...",
  "naver_keywords": "kw1,kw2,kw3,kw4,kw5,kw6,kw7",
  "naver_description": "...",
  "seo_title": "...",
  "seo_description": "..."
}`;

  const styleGuide: Record<SeoStyle, string> = {
    orthodox: `You are a Naver Smart Store SEO expert (2026 standards).
Style: Orthodox SEO — maximize search visibility with high-volume exact-match keywords.
Rules:
- naver_title: 25-35 Korean chars, primary keyword in first 15 chars, no filler words, no duplicate words 3+ times
- naver_keywords: 5-7 high search volume Korean keywords, comma-separated
- naver_description: 80-200 Korean chars, keywords naturally placed, factual and clear
- seo_title: 15-40 Korean chars, keyword-rich
- seo_description: 50-150 Korean chars, includes main keywords`,

    emotional: `You are a Korean e-commerce copywriter specializing in emotional targeting.
Style: Emotional / lifestyle — appeal to feelings, seasons, occasions, gifting moments.
Rules:
- naver_title: 25-35 Korean chars, evoke a feeling or occasion (e.g. 선물, 특별한, 일상), includes product keyword
- naver_keywords: 5-7 keywords mixing product terms with lifestyle/occasion terms
- naver_description: 80-200 Korean chars, warm tone, paint a scene of use
- seo_title: 15-40 Korean chars, emotionally resonant
- seo_description: 50-150 Korean chars, conversational and inviting`,

    niche: `You are a Naver Smart Store long-tail keyword specialist.
Style: Niche / long-tail — target less competitive specific search queries for higher conversion.
Rules:
- naver_title: 25-35 Korean chars, include specific attributes (material, use case, target user, size)
- naver_keywords: 5-7 long-tail Korean keywords (3+ word phrases preferred), very specific
- naver_description: 80-200 Korean chars, highly specific benefits and use cases
- seo_title: 15-40 Korean chars, specific niche angle
- seo_description: 50-150 Korean chars, speaks to a specific buyer persona`,
  };

  return `${styleGuide[style]}\n\n${base}`;
}

// ─── AI provider calls ────────────────────────────────────────────────────────

// Anthropic Claude Sonnet — last-resort fallback
async function callAnthropic(
  productName: string,
  style: SeoStyle,
  market?: CompetitionAnalysis | null,
  volumes?: VolumeRow[] | null,
): Promise<Record<string, string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514', max_tokens: 1000,
      system: 'Naver SEO expert. Return raw JSON only, no markdown.',
      messages: [{ role: 'user', content: buildPrompt(productName, style, market, volumes) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  return parseJsonSafe(data.content?.[0]?.text ?? '');
}

function parseJsonSafe(text: string): Record<string, string> {
  let t = text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

/** Volume-signal telemetry — Lane 1-B distinguishes:
 *   - sortApplied      : did the post-AI sort routine actually run?
 *   - keywordsChanged  : does the final naver_keywords CSV differ from
 *                        the raw AI output (whitespace-normalized)?
 *   - titlePrefixInjected : did we have to prepend a top-intent keyword
 *                        because the AI ignored the prompt constraint?
 *  The previous single `reorderedKeywords` flag conflated these — it
 *  returned false whenever the AI's order coincidentally matched ours,
 *  which user verification on 2026-06-01 surfaced as a misleading signal. */
export interface VolumeSignal {
  available: boolean;
  candidateCount: number;
  candidateTokens: number;
  candidateIntentCombos: number;
  candidateNgrams: number;
  preFetchRows: number;
  /** Scope A (2026-06-03): number of related keywords harvested from the
   *  seed-based /keywordstool expansion (0 when env-missing or no seed). */
  relatedFetched: number;
  totalKnownRows: number;
  sortApplied: boolean;
  keywordsChanged: boolean;
  titlePrefixInjected: boolean;
  /** Lane 1-C (2026-06-01): did the length-fill loop append measured
   *  keywords to naver_title because the AI emitted a sub-TARGET_MIN title? */
  titleLengthFilled: boolean;
  /** Final length of naver_title after every Lane 1-B/C transformation —
   *  intent-prefix, sort, and length-fill. Null when AI omitted the field. */
  finalTitleLength: number | null;
  topIntentKeyword: string | null;
}

/** Normalize a CSV-of-keywords for *equality comparison only* — collapses
 *  whitespace and surrounding-comma spacing so "a,b,c" and "a, b, c" are
 *  considered equal. Used to decide whether keywordsChanged is true. */
function normalizeCsvForCompare(csv: string): string {
  return csv
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    .join('|');
}

async function generateSEO(
  productName: string,
  style: SeoStyle = 'orthodox',
  market?: CompetitionAnalysis | null,
): Promise<{
  data: Record<string, string>;
  provider: string;
  market?: CompetitionAnalysis | null;
  volumeSignal: VolumeSignal;
}> {
  // ── Pre-AI: build candidate pool (tokens + intent combos + n-grams) ────
  const bundle = extractCandidates(productName);

  const volumeMap = new Map<string, VolumeRow>();
  let volumesAvailable = false;
  let preFetchRows = 0;
  let relatedFetched = 0;
  if (bundle.pool.length > 0) {
    try {
      const pre = await fetchKeywordVolumes(bundle.pool);
      if (pre !== null) {
        volumesAvailable = true;
        preFetchRows = pre.length;
        for (const r of pre) volumeMap.set(normalizeKeyword(r.keyword), r);
      }
    } catch (e) {
      console.warn(
        '[ai-generate] SearchAd pre-fetch failed:',
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  // ── Scope A (2026-06-03): seed-based related-keyword expansion ─────────
  // Harvest the related keywords SearchAd returns for the product's
  // distinctive seed nouns — real market keywords absent from the product
  // name — and merge them into the volume map. This is the keyword-expansion
  // engine: one seed turns ~15 product-name candidates into 100+ priced
  // market keywords. Graceful: null/empty leaves the existing path intact
  // (no extra API call cost beyond this single seed request).
  const seeds = extractSeeds(bundle);
  if (seeds.length > 0) {
    try {
      const related = await fetchRelatedKeywords(seeds);
      if (related && related.length > 0) {
        volumesAvailable = true;
        relatedFetched = related.length;
        for (const r of related) {
          const n = normalizeKeyword(r.keyword);
          if (!volumeMap.has(n)) volumeMap.set(n, r);
        }
      }
    } catch (e) {
      console.warn(
        '[ai-generate] SearchAd related-keyword fetch failed:',
        e instanceof Error ? e.message : String(e),
      );
    }
  }
  const preVolumeRows = [...volumeMap.values()];

  // ── AI call (Groq primary → Anthropic last-resort) ─────────────────────
  let aiData: Record<string, string> | null = null;
  let provider = '';

  const hasGroqKey = !!(
    process.env.GROQ_API_KEY ||
    process.env.GROQ_API_KEY_2 ||
    process.env.GROQ_API_KEY_3
  );
  if (hasGroqKey) {
    try {
      const text = await callGroq(
        buildPrompt(productName, style, market, preVolumeRows),
        'Output ONLY raw JSON. First char must be {, last must be }. No markdown.',
      );
      aiData = parseJsonSafe(text);
      provider = `groq-${GROQ_MODEL}`;
    } catch (e) {
      console.warn(
        '[ai-generate] All Groq keys failed, trying Anthropic:',
        e instanceof Error ? e.message.slice(0, 60) : e,
      );
    }
  }

  if (!aiData && process.env.ANTHROPIC_API_KEY) {
    aiData = await callAnthropic(productName, style, market, preVolumeRows);
    provider = 'claude-sonnet';
  }

  if (!aiData) {
    throw new Error(
      'AI 서비스 일시 응답 없음 (Groq + Anthropic 모두 실패). 잠시 후 다시 시도해주세요.',
    );
  }

  // ── Post-AI: intent-weighted sort + title-prefix validation ────────────
  let sortApplied = false;
  let keywordsChanged = false;
  let titlePrefixInjected = false;
  let titleLengthFilled = false;
  let topIntentKeyword: string | null = null;

  if (volumesAvailable) {
    sortApplied = true;
    const rawCsv = (aiData.naver_keywords ?? '').trim();
    const aiKw = rawCsv
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    // Top up volumeMap with any AI keywords we have not yet measured. We
    // never invent volumes for the missing ones — they get score 0 and sink.
    const unknown = aiKw.filter((k) => !volumeMap.has(normalizeKeyword(k)));
    if (unknown.length > 0) {
      try {
        const more = await fetchKeywordVolumes(unknown);
        if (more) {
          for (const r of more) {
            volumeMap.set(normalizeKeyword(r.keyword), r);
          }
        }
      } catch (e) {
        console.warn(
          '[ai-generate] SearchAd post-fetch failed:',
          e instanceof Error ? e.message : String(e),
        );
      }
    }

    // Combine AI keywords with measured pool keywords, score each, sort by
    // intent-weighted score descending, dedupe, cap at 8.
    type Annotated = {
      kw: string;
      score: number;
      volume: number;
      measured: boolean;
      fromAi: boolean;
    };
    const annotated: Annotated[] = [];
    const annoSeen = new Set<string>();

    for (const k of aiKw) {
      const n = normalizeKeyword(k);
      if (annoSeen.has(n)) continue;
      annoSeen.add(n);
      const row = volumeMap.get(n);
      annotated.push({
        kw: k,
        score: row ? scoreKeyword(row.totalMonthlyQc, k) : 0,
        volume: row?.totalMonthlyQc ?? 0,
        measured: !!row,
        fromAi: true,
      });
    }
    // Augment with any measured pool keywords (n-grams / intent combos) the
    // AI omitted but that scored above zero. These are real signal the AI
    // missed; surfacing them is the whole point of the Lane 1-B refresh.
    for (const r of volumeMap.values()) {
      const n = normalizeKeyword(r.keyword);
      if (annoSeen.has(n)) continue;
      if (r.totalMonthlyQc <= 0) continue;
      annoSeen.add(n);
      annotated.push({
        kw: r.keyword,
        score: scoreKeyword(r.totalMonthlyQc, r.keyword),
        volume: r.totalMonthlyQc,
        measured: true,
        fromAi: false,
      });
    }

    annotated.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Stable tie-break: AI keywords ahead of augmented ones at equal score.
      if (a.fromAi !== b.fromAi) return a.fromAi ? -1 : 1;
      return 0;
    });

    // ── A-3 search-volume validation gate (LLM hallucination guard) ──
    // Discard keywords with no measured monthly volume — these are either AI
    // inventions SearchAd never priced, or measured-but-dead terms. If the
    // gate would empty the list (every candidate unmeasured — e.g. SearchAd
    // returned only echoes and the AI produced no measurable keyword), fall
    // back to the ungated list so naver_keywords is never empty (#46: prefer
    // the AI's honest guess over a blank field). When ANY measured keyword
    // survives, the measured pool's top entries naturally replace dead AI
    // output ("LLM 원본 전멸 시 측정 풀 상위로 대체").
    const measuredCandidates = annotated.filter((a) => a.volume > 0);
    const gated = measuredCandidates.length > 0 ? measuredCandidates : annotated;

    const top = gated.slice(0, 8);
    const sortedCsv = top.map((x) => x.kw).join(', ');
    if (sortedCsv.length > 0) {
      aiData.naver_keywords = sortedCsv;
      keywordsChanged =
        normalizeCsvForCompare(sortedCsv) !== normalizeCsvForCompare(rawCsv);
    }

    // ── Title-prefix validation ──
    // Recompute the top intent keyword from the FINAL volumeMap (post top-up).
    // If the AI's naver_title does not contain it in the first 20 chars,
    // prepend deterministically — the prompt constraint is non-negotiable.
    const finalScored = [...volumeMap.values()]
      .filter((r) => r.totalMonthlyQc > 0)
      .map((r) => ({
        kw: r.keyword,
        score: scoreKeyword(r.totalMonthlyQc, r.keyword),
      }))
      .sort((a, b) => b.score - a.score);
    topIntentKeyword = finalScored[0]?.kw ?? null;

    if (topIntentKeyword && aiData.naver_title) {
      const titleHead = normalizeKeyword(aiData.naver_title.slice(0, 20));
      const intentNorm = normalizeKeyword(topIntentKeyword);
      if (intentNorm && !titleHead.includes(intentNorm)) {
        const prepended = `${topIntentKeyword} ${aiData.naver_title}`.slice(
          0,
          50,
        );
        aiData.naver_title = prepended;
        // Mirror the change into seo_title when it shared the AI's lead.
        if (
          aiData.seo_title &&
          !normalizeKeyword(aiData.seo_title.slice(0, 20)).includes(intentNorm)
        ) {
          aiData.seo_title = prepended;
        }
        titlePrefixInjected = true;
      }
    }

    // ── Length-fill (Lane 1-C, 2026-06-01) ──
    // The AI emits sub-spec titles (18–23 chars observed) even under the
    // 25–35 prompt directive, leaving SEO slots empty. Append measured
    // pool keywords in intent-weighted order until we reach TARGET_MAX.
    //
    // Honesty constraints (workrule #46):
    //   - Only finalScored entries are eligible (totalMonthlyQc > 0).
    //   - Deboosted generic keywords (intent multiplier < 1.0) are not
    //     fill-eligible — we deboosted them for a reason; placing them in
    //     the title would undo the entire intent-weighting effort.
    //   - Anti-stuffing dedupe via titleAlreadyHas (token-aware).
    //   - Soft target TITLE_TARGET_MAX_LENGTH; HARD cap TITLE_HARD_CAP.
    if (
      aiData.naver_title &&
      finalScored.length > 0 &&
      aiData.naver_title.length < TITLE_TARGET_MIN_LENGTH
    ) {
      let working = aiData.naver_title;
      for (const { kw } of finalScored) {
        if (working.length >= TITLE_TARGET_MAX_LENGTH) break;
        if (intentMultiplier(kw) < 1.0) continue; // deboosted: skip
        if (titleAlreadyHas(working, kw)) continue;
        const candidate = `${working} ${kw}`;
        if (candidate.length > TITLE_TARGET_MAX_LENGTH) continue; // try shorter
        working = candidate;
        titleLengthFilled = true;
      }
      if (titleLengthFilled) {
        // Defensive hard-cap (TITLE_HARD_CAP is the upper bound — we will
        // never exceed it because TARGET_MAX < HARD_CAP, but cap anyway).
        if (working.length > TITLE_HARD_CAP) {
          working = working.slice(0, TITLE_HARD_CAP).replace(/\s+\S*$/, '').trim();
        }
        aiData.naver_title = working;
        // Mirror into seo_title — matches the existing prefix-injection
        // mirror pattern. The seo_title slot accepts up to 70 chars but
        // the same intent-weighted lead is the highest-conversion text.
        if (aiData.seo_title) {
          aiData.seo_title = working;
        }
      }
    }
  }

  // ── seo_title final-consistency sync (Lane 1-D, 2026-06-01) ────────────
  // Previous behavior synced seo_title only on transform events (prefix
  // inject / length fill). When neither fired (e.g. niche style emitting
  // a ≥ TARGET_MIN title), seo_title stayed at the AI's much-shorter raw
  // value, leaving a 12-char seo_title beside a 37-char naver_title. The
  // intent-weighted lead in naver_title is the highest-conversion text we
  // have; seo_title should reflect it whenever it adds slot value.
  //
  // Honesty (#46): no fabrication. We only adopt the value already chosen
  // for naver_title (which itself is honest by Lane 1-B/C construction).
  // Runs regardless of volumesAvailable so the AI fallback path also wins
  // the consistency guarantee.
  if (aiData.naver_title) {
    const curSeo = (aiData.seo_title ?? '').trim();
    if (curSeo.length < aiData.naver_title.length) {
      aiData.seo_title = aiData.naver_title;
    }
  }
  const finalTitleLength = aiData.naver_title ? aiData.naver_title.length : null;

  return {
    data: aiData,
    provider,
    market,
    volumeSignal: {
      available: volumesAvailable,
      candidateCount: bundle.pool.length,
      candidateTokens: bundle.tokenCount,
      candidateIntentCombos: bundle.intentComboCount,
      candidateNgrams: bundle.ngramCount,
      preFetchRows,
      relatedFetched,
      totalKnownRows: volumeMap.size,
      sortApplied,
      keywordsChanged,
      titlePrefixInjected,
      titleLengthFilled,
      finalTitleLength,
      topIntentKeyword,
    },
  };
}

// ─── POST: single product ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, productName, style = 'orthodox' } = body as {
      productId: string;
      productName: string;
      style?: SeoStyle;
    };

    // If productName not provided, fetch from DB using productId
    let resolvedName = productName;
    if (!resolvedName && productId && productId !== 'temp') {
      const found = await prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
      resolvedName = found?.name ?? '';
    }

    if (!resolvedName) {
      return NextResponse.json({ success: false, error: '상품명이 필요합니다.' }, { status: 400 });
    }

    // C-12: Fetch competition data for smarter SEO (non-blocking — fallback to null)
    let market: CompetitionAnalysis | null = null;
    try {
      const hasOpenApiKey = !!(process.env.NAVER_OPENAPI_CLIENT_ID ?? process.env.NAVER_DATALAB_CLIENT_ID);
      if (hasOpenApiKey) {
        market = await analyzeCompetition(resolvedName);
      }
    } catch { /* non-critical — proceed without market data */ }

    const { data: aiResponse, provider, volumeSignal } = await generateSEO(resolvedName, style as SeoStyle, market);

    if (productId && productId !== 'temp') {
      // Parse keywords from comma-separated string to JSON array
      const keywordsArray = (aiResponse.naver_keywords ?? '')
        .split(',')
        .map((k: string) => k.trim())
        .filter(Boolean);

      await prisma.product.update({
        where: { id: productId },
        data: {
          // Lane 1-D (2026-06-01): Product.name is the immutable source-of-truth
          // identity captured at crawl time. SEO-optimized text lands in
          // naver_title / seo_title / aiGeneratedTitle ONLY. Overwriting
          // Product.name caused cumulative pollution across re-runs (each
          // re-run's keyword stuffing fed the next call's input) and
          // corrupted downstream identity-keyword extraction (Kkotti score).
          keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
          // Lane 1-D dual-column mirror (2026-06-01): the schema currently has
          // BOTH seo_title (snake, line 93) and seoTitle (camel, line 149),
          // and publish-readiness reads seoTitle. Until the schema dedupe
          // turn lands we mirror both — otherwise running ai-generate updates
          // the snake column while readiness keeps showing stale camel data.
          seo_title: aiResponse.seo_title || aiResponse.naver_title,
          seoTitle: aiResponse.seo_title || aiResponse.naver_title,
          seo_description: aiResponse.seo_description || (aiResponse.naver_description ?? '').substring(0, 160),
          naver_title: aiResponse.naver_title,
          naver_keywords: aiResponse.naver_keywords,
          naver_description: aiResponse.naver_description,
          // Record AI optimization timestamp on the dedicated history field.
          aiGeneratedTitle: aiResponse.naver_title,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true, provider, style, data: aiResponse,
      ...(market ? { market: { competition: market.competitionLevel, avgPrice: market.avgPrice, totalResults: market.totalResults } } : {}),
      volumeSignal,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[api/naver-seo/ai-generate POST]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ─── PUT: bulk ────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds, style = 'orthodox' } = body as { productIds: string[]; style?: SeoStyle };

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ success: false, error: '상품 ID 배열이 필요합니다.' }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (const product of products) {
      try {
        const { data: aiResponse } = await generateSEO(product.name, style as SeoStyle);
        const keywordsArray = (aiResponse.naver_keywords ?? '')
          .split(',')
          .map((k: string) => k.trim())
          .filter(Boolean);
        await prisma.product.update({
          where: { id: product.id },
          data: {
            // Lane 1-D (2026-06-01): Product.name preserved + dual-column
            // seo_title/seoTitle mirror (see POST handler comments).
            keywords: keywordsArray.length > 0 ? keywordsArray : undefined,
            seo_title: aiResponse.seo_title || aiResponse.naver_title,
            seoTitle: aiResponse.seo_title || aiResponse.naver_title,
            seo_description: aiResponse.seo_description || (aiResponse.naver_description ?? '').substring(0, 160),
            naver_title: aiResponse.naver_title,
            naver_keywords: aiResponse.naver_keywords,
            naver_description: aiResponse.naver_description,
            aiGeneratedTitle: aiResponse.naver_title,
            updatedAt: new Date(),
          },
        });
        results.push({ productId: product.id, productName: product.name, success: true });
        successCount++;
        await new Promise(r => setTimeout(r, 500)); // rate-limit buffer
      } catch (err) {
        results.push({ productId: product.id, productName: product.name, success: false, error: String(err) });
        failCount++;
      }
    }

    return NextResponse.json({ success: true, successCount, failCount, results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[api/naver-seo/ai-generate PUT]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
