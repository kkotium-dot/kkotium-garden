// src/lib/naver/category-ai-suggest.ts
//
// UCE-10 (2026-09-04, 결함A): Groq AI 교차확인 + 결정론 결과 신뢰 게이트를
// /api/category/suggest/route.ts에서 뽑아낸 단일 진실 공급원. 이전엔 이 로직이
// route.ts 안에만 있어서 sourcing-recommender.ts가 matchDeterministicCategories()를
// 검증 없이 단독 호출했다(#295 단일권위 위반 — 소싱 라벨이 씨앗심기 UI와 다른
// 판정을 받음, 실측: "거실등"류가 AI 폴백 없이 trendD1 문자열매칭으로 새어
// "식품(카테고리 미확정)"으로 저장됨). 이제 route.ts와 sourcing-recommender.ts
// 둘 다 이 모듈 하나만 거친다.

import { NAVER_CATEGORIES_FULL, NAVER_DEPTH1_LIST } from './naver-categories-full';
import { callGroq } from '../ai/groq';
import type { DeterministicMatch } from './category-deterministic-matcher';

// UCE-7 (2026-08-27): deterministic-match confidence gate. The matcher itself
// (category-deterministic-matcher.ts) weights head vs. modifier nouns and
// still occasionally lands on a genuinely weak guess (e.g. a reverse-
// containment fallback match, or two top candidates from different d1
// branches scored close together). Rather than trust a shaky deterministic
// guess outright, ask Groq for a corrective second opinion — but ONLY for
// this low-confidence slice, so the AI call stays cost-gated to cases that
// actually need it (a confident deterministic hit never calls Groq).
const DETERMINISTIC_MIN_CONFIDENT_SCORE = 20; // below this, the top guess alone is too weak to trust
const DETERMINISTIC_D1_CONFLICT_GAP = 10; // top vs runner-up this close counts as a real disagreement
const DETERMINISTIC_D1_CONFLICT_CEILING = 40; // only a disagreement when the top score itself isn't already decisive

// d1 정합성 게이트: true when the deterministic top candidate is either too
// weak on its own, or is contradicted by an almost-as-strong candidate from a
// DIFFERENT d1. See route.ts's original UCE-7b comment for the full rationale
// (Tier 2/3 top matches are always low-confidence regardless of score).
export function isDeterministicLowConfidence(matches: DeterministicMatch[]): boolean {
  const top = matches[0];
  if (!top) return true;
  if (top.tier !== 1) return true;
  // UCE-11 (결함C, 2026-09-05): a `<` boundary let a top score that landed
  // EXACTLY on the threshold (e.g. 20.00, the single-fragment partial-match
  // score for "얼음트레이" -> 전기밥솥>내솥/패킹/트레이) pass as "confident"
  // when it was really the weakest possible pass. `<=` closes that gap.
  if (top.score <= DETERMINISTIC_MIN_CONFIDENT_SCORE) return true;
  const second = matches[1];
  if (second && second.d1 !== top.d1 && top.score < DETERMINISTIC_D1_CONFLICT_CEILING) {
    if (top.score - second.score <= DETERMINISTIC_D1_CONFLICT_GAP) return true;
  }
  return false;
}

// UCE-2 (2026-08-27): a handful of REAL rows sampled from NAVER_CATEGORIES_FULL
// (not hand-invented) so the model sees the real naming convention (e.g.
// "여성의류", "요가/필라테스") instead of inventing plausible-sounding but
// nonexistent categories.
const FEW_SHOT_D1S = ['패션의류', '생활/건강', '가구/인테리어', '디지털/가전', '스포츠/레저'];
function buildFewShotExamples(): string {
  return FEW_SHOT_D1S.map((d1) => {
    const row = NAVER_CATEGORIES_FULL.find((c) => c.d1 === d1 && c.d3);
    return row ? `{"d1":"${row.d1}","d2":"${row.d2}","d3":"${row.d3}"}` : null;
  })
    .filter((x): x is string => !!x)
    .join(', ');
}

export async function suggestWithGroq(
  productName: string
): Promise<Array<{ d1: string; d2: string; d3: string }>> {
  const fewShot = buildFewShotExamples();
  const prompt = `You are a Naver SmartStore SEO expert. Given a Korean product name, output the top 3 Naver shopping category paths (d1 > d2 > d3).

Product: "${productName}"

CRITICAL RULES (verified against actual Naver DB):
- 잠옷/홈웨어/파자마 → 패션의류 > 여성언더웨어/잠옷 > 잠옷/홈웨어 (NOT 여성의류)
- 레깅스 → 패션의류 > 여성의류 > 레깅스
- 요가복/필라테스 → 스포츠/레저 > 요가/필라테스 > 요가복
- 이불/차렵이불 → 가구/인테리어 > 침구단품 > 차렵이불
- 소파 → 가구/인테리어 > 거실가구 > 소파
- 두꺼비집가리개/분전함커버 → 가구/인테리어 > 인테리어소품 > 인터폰박스
- 인테리어소품/장식 → 가구/인테리어 > 인테리어소품 > 기타장식용품
- 반려동물/펫 관련 용품(급식기·급수기·사료·장난감 등) → d1은 "반려동물"이나 "펫용품"이 아니라 "생활/건강" > "반려동물" > (구체적 하위카테고리)

REAL examples of the exact d1/d2/d3 naming convention used (do not invent names outside this style — these are real rows, not a template):
${fewShot}

- Every d1/d2/d3 you output MUST be a real Naver category name in this exact style — never invent a plausible-sounding one.
- If you are not confident the product matches a real category you know, respond with an empty array [] instead of guessing.

Respond ONLY with raw JSON array (no markdown):
[{"d1":"...","d2":"...","d3":"..."},{"d1":"...","d2":"...","d3":"..."},{"d1":"...","d2":"...","d3":"..."}]`;

  const text = await callGroq(
    prompt,
    'Output ONLY a raw JSON array. First character must be [. Last must be ]. No markdown, no explanation.',
  );

  // UCE-2: always log the raw response (truncated) — this is the single
  // biggest gap that made usedAI:false unfixable before: we only ever saw a
  // 120-char slice of the *thrown error*, never the model's actual text.
  console.log(`[category-ai-suggest][groq-raw] "${productName}" (${text.length} chars): ${text.slice(0, 300)}`);

  if (!text.trim()) throw new Error('Groq empty response (reason=empty_response)');

  // Strip markdown fences if present
  const clean = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```\s*$/, '').trim();
  const startIdx = clean.indexOf('[');
  const endIdx = clean.lastIndexOf(']');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`No JSON array (reason=no_json_brackets) in: ${clean.slice(0, 200)}`);
  }

  let parsed: Array<{ d1: string; d2: string; d3: string }>;
  try {
    parsed = JSON.parse(clean.slice(startIdx, endIdx + 1));
  } catch (e) {
    throw new Error(`JSON.parse failed (reason=json_parse_error): ${String(e).slice(0, 120)} | raw: ${clean.slice(0, 200)}`);
  }

  // UCE-2 hallucination guard: log (don't silently drop here — validateSuggestion
  // downstream still fuzzy-matches) any d1 that isn't even in the real depth-1
  // list, so a hallucination pattern is visible in logs instead of invisible.
  const hallucinated = parsed.filter((p) => p?.d1 && !NAVER_DEPTH1_LIST.includes(p.d1));
  if (hallucinated.length > 0) {
    console.warn(`[category-ai-suggest][groq-hallucination] "${productName}" produced non-existent d1: ${hallucinated.map((h) => h.d1).join(', ')}`);
  }

  return parsed.slice(0, 3);
}

// ── DB validation ─────────────────────────────────────────────────────────────
export function validateSuggestion(
  d1: string, d2: string, d3: string
): { d1: string; d2: string; d3: string; d4?: string } | null {
  // 1. Exact match
  const exact = NAVER_CATEGORIES_FULL.find(c => c.d1 === d1 && c.d2 === d2 && c.d3 === d3);
  if (exact) return { d1: exact.d1, d2: exact.d2, d3: exact.d3, d4: exact.d4 };

  // 2. d1+d2 exact, d3 fuzzy
  const d1d2 = NAVER_CATEGORIES_FULL.filter(c => c.d1 === d1 && c.d2 === d2);
  if (d1d2.length > 0) {
    const fuzzy = d1d2.find(c => c.d3 && d3 && (c.d3.includes(d3) || d3.includes(c.d3)));
    if (fuzzy) return { d1: fuzzy.d1, d2: fuzzy.d2, d3: fuzzy.d3, d4: fuzzy.d4 };
    return { d1: d1d2[0].d1, d2: d1d2[0].d2, d3: d1d2[0].d3, d4: d1d2[0].d4 };
  }

  // 3. d1 exact, d2 char-overlap fuzzy (min 50%)
  const d1only = NAVER_CATEGORIES_FULL.filter(c => c.d1 === d1);
  if (d1only.length > 0 && d2) {
    let best: typeof d1only[0] | null = null;
    let bestScore = 0;
    for (const c of d1only) {
      if (!c.d2) continue;
      const overlap = [...c.d2].filter(ch => d2.includes(ch)).length;
      const score = overlap / Math.max(c.d2.length, d2.length);
      if (score > bestScore && score >= 0.5) { bestScore = score; best = c; }
    }
    if (best) return { d1: best.d1, d2: best.d2, d3: best.d3, d4: best.d4 };
  }

  return null;
}
