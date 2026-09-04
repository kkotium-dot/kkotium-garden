// src/app/api/category/suggest/route.ts
// Category suggestion, UCE-1 order (2026-08-27): cache -> deterministic
// matcher (full 5,021-entry master, zero cost) -> Groq AI (only if
// deterministic found nothing) -> Naver page-1 distribution cross-check.
// AI provider: Groq openai/gpt-oss-120b (model updated 2026-08-27, see groq.ts)

import { NextRequest, NextResponse } from 'next/server';
import { NAVER_CATEGORIES_FULL } from '@/lib/naver/naver-categories-full';
import { getCachedMapping, saveMapping, nameHashKey } from '@/lib/dome-category-cache';
import { validatePageCategory } from '@/lib/naver/category-page-validator';
import { computeCategoryScore, type CategoryScore } from '@/lib/naver/category-score';
import { getCachedTrend, buildD1Key, type CategoryTrendEntry } from '@/lib/naver/category-trend-cache';
import { matchDeterministicCategories } from '@/lib/naver/category-deterministic-matcher';
import { isDeterministicLowConfidence, suggestWithGroq, validateSuggestion } from '@/lib/naver/category-ai-suggest';
import { prisma } from '@/lib/prisma';

// UCE-10 (2026-09-04, 결함A): isDeterministicLowConfidence/suggestWithGroq/
// validateSuggestion은 lib/naver/category-ai-suggest.ts로 이전됐다 —
// sourcing-recommender.ts도 이제 이 함수들만 거쳐 동일한 검증경로를 쓴다
// (#295 단일권위, docs/design/UCE10_TIE_BREAK_AND_SOURCING_PARITY_2026-09-04.md §A).

const CATEGORY_CONFIRM_NEEDED_TAG = 'category_confirm_needed';

// UCE-4 (2026-08-27): mark/clear the cross-product "카테고리 확인 필요" queue
// flag (surfaced by UploadReadinessWidget via internalTags — an existing,
// otherwise-unused JSON column, no schema migration needed). Best-effort:
// never throws, never blocks the response.
async function updateCategoryConfirmFlag(productId: string, needsConfirm: boolean): Promise<void> {
  try {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { internalTags: true } });
    if (!product) return;
    const current = Array.isArray(product.internalTags) ? (product.internalTags as string[]) : [];
    const has = current.includes(CATEGORY_CONFIRM_NEEDED_TAG);
    if (needsConfirm === has) return; // already correct, skip write
    const next = needsConfirm
      ? [...current, CATEGORY_CONFIRM_NEEDED_TAG]
      : current.filter((t) => t !== CATEGORY_CONFIRM_NEEDED_TAG);
    await prisma.product.update({ where: { id: productId }, data: { internalTags: next } });
  } catch (e) {
    console.warn('[category/suggest] category-confirm-flag update failed:', String(e).slice(0, 120));
  }
}

type ScoredSuggestion = { d1: string; d2: string; d3: string; d4?: string; score: CategoryScore };

// #249: fuse SEO(trend) × ROI(margin) into each candidate and rank by the
// composite totalScore desc, so the seller sees the "검색 유리 + 마진 좋은"
// category first. Trend lookups are D1-level; we memoize per-d1 to avoid
// redundant cache hits when several candidates share a top category. Pure
// scoring lives in category-score.ts — this only resolves the (async) trend
// and orders the list.
async function rankByScore(
  suggestions: Array<{ d1: string; d2: string; d3: string; d4?: string }>,
  supplierPrice?: number | null,
): Promise<ScoredSuggestion[]> {
  const trendByD1 = new Map<string, CategoryTrendEntry | null>();
  const scored: ScoredSuggestion[] = [];
  for (const s of suggestions) {
    const key = buildD1Key(s.d1);
    if (!trendByD1.has(key)) {
      trendByD1.set(key, await getCachedTrend(key).catch(() => null));
    }
    const score = computeCategoryScore({
      d1: s.d1,
      d2: s.d2,
      d3: s.d3,
      supplierPrice,
      trend: trendByD1.get(key) ?? null,
    });
    scored.push({ ...s, score });
  }
  // UCE-7 fix (2026-08-27 프로덕션 실측): sorting ALL candidates by SEO×ROI
  // could promote a HIGHER-SCORING BUT WRONG category over the correctness
  // pipeline's actual top pick — e.g. "요가 매트" deterministically matches
  // 스포츠/레저>요가/필라테스>요가매트 first, but 생활/건강>반려동물>리빙용품>매트
  // had a hotter trend score and was jumping to position 0, silently
  // corrupting the primary answer for any never-before-cached product name.
  // The correctness-ranked top (index 0, from the deterministic/AI/
  // pageValidation pipeline) is pinned; only the alternatives (index 1+) are
  // reordered by business opportunity, preserving #249's original intent.
  if (scored.length > 1) {
    const [top, ...rest] = scored;
    rest.sort((a, b) => b.score.totalScore - a.score.totalScore);
    return [top, ...rest];
  }
  return scored;
}

// ── AI: Groq with compact prompt (no full category list) ──────────────────────
// suggestWithGroq/validateSuggestion now live in lib/naver/category-ai-suggest.ts
// (UCE-10 결함A — shared with sourcing-recommender.ts).

export const dynamic = 'force-dynamic';

// ── G2 d3-mismatch self-validation ────────────────────────────────────────────
// Strict tree resolution mirroring the client getCategoryId (NO fuzzy matching).
// Returns the category code for a real triple, or '' when the triple does not
// exist in NAVER_CATEGORIES_FULL.
function resolveCategoryId(d1: string, d2: string, d3: string, d4?: string): string {
  if (d4) {
    const exact = NAVER_CATEGORIES_FULL.find(
      (c) => c.d1 === d1 && c.d2 === d2 && c.d3 === d3 && c.d4 === d4,
    );
    if (exact) return exact.code;
  }
  const loose = NAVER_CATEGORIES_FULL.find(
    (c) => c.d1 === d1 && c.d2 === d2 && c.d3 === d3,
  );
  return loose?.code ?? '';
}

// True when d1+d2 exists in the tree (2-depth validity).
function isValidD1D2(d1: string, d2: string): boolean {
  return NAVER_CATEGORIES_FULL.some((c) => c.d1 === d1 && c.d2 === d2);
}

// Self-validate every final suggestion against the local tree. The
// page-validation override path can glue a dominant d1/d2 onto a d3 that only
// exists under a DIFFERENT d1/d2 (ghost triple — e.g.
// 생활/건강>주방용품>그릇장/컵보드, where 그릇장/컵보드 only lives under
// 가구/인테리어>주방가구). Such ghosts make the client getCategoryId return
// null, leaving the category empty. Resolution per suggestion:
//   - valid full triple        -> keep as-is
//   - invalid d3, valid d1/d2  -> blank d3/d4 (trust d1/d2 for partial autofill)
//   - invalid d1/d2            -> drop the suggestion
// Conservative 1st pass: never auto-pick a replacement d3 (mis-classification
// risk); d3 auto-completion is a separate, owner-approved decision.
function selfValidateSuggestions(
  list: Array<{ d1: string; d2: string; d3: string; d4?: string }>,
): Array<{ d1: string; d2: string; d3: string; d4?: string }> {
  const out: Array<{ d1: string; d2: string; d3: string; d4?: string }> = [];
  const seen = new Set<string>();
  for (const s of list) {
    let next: { d1: string; d2: string; d3: string; d4?: string } | null = null;
    if (resolveCategoryId(s.d1, s.d2, s.d3, s.d4)) {
      next = s;
    } else if (isValidD1D2(s.d1, s.d2)) {
      next = { d1: s.d1, d2: s.d2, d3: '', d4: undefined };
    }
    if (!next) continue;
    const key = `${next.d1}|${next.d2}|${next.d3}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(next);
  }
  return out;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const productName: string = body?.productName ?? '';
    const domeCategoryCode: string | undefined = body?.domeCategoryCode;
    // UCE-4: when the caller knows which saved product this suggest call is
    // for, we can mark/clear the "카테고리 확인 필요" queue flag on it.
    // Optional — a brand-new unsaved draft has no id yet, and that's fine.
    const productId: string | undefined = typeof body?.productId === 'string' ? body.productId : undefined;
    // #249: optional wholesale price makes the ROI score product-specific.
    const supplierPrice: number | undefined =
      typeof body?.supplierPrice === 'number' && body.supplierPrice > 0
        ? body.supplierPrice
        : undefined;
    if (!productName?.trim()) {
      return NextResponse.json({ success: false, error: '상품명을 입력해주세요' }, { status: 400 });
    }

    const name = productName.trim();

    // Sprint 6-E: cache-first lookup. Try dome code (most reliable) then name hash.
    if (domeCategoryCode) {
      const hit = await getCachedMapping('dome_code', domeCategoryCode);
      if (hit) {
        // G2 Fix B: sanitize cached triple before returning. A previously
        // poisoned ghost triple gets its bad d3 blanked (d1/d2 kept) instead of
        // re-serving the invalid combination. If even d1/d2 is invalid the
        // entry is unusable -> fall through to recompute.
        const sanitized = selfValidateSuggestions([
          { d1: hit.d1, d2: hit.d2, d3: hit.d3, d4: hit.d4 ?? undefined },
        ]);
        if (sanitized.length > 0) {
          return NextResponse.json({
            success: true,
            suggestions: await rankByScore(sanitized, supplierPrice),
            usedAI: false,
            cacheHit: 'dome_code',
          });
        }
      }
    }
    const nameKey = nameHashKey(name);
    if (nameKey) {
      const hit = await getCachedMapping('name_hash', nameKey);
      if (hit) {
        const sanitized = selfValidateSuggestions([
          { d1: hit.d1, d2: hit.d2, d3: hit.d3, d4: hit.d4 ?? undefined },
        ]);
        if (sanitized.length > 0) {
          return NextResponse.json({
            success: true,
            suggestions: await rankByScore(sanitized, supplierPrice),
            usedAI: false,
            cacheHit: 'name_hash',
          });
        }
      }
    }

    // UCE-1 (2026-08-27): deterministic matcher against the FULL master runs
    // FIRST — zero cost, zero latency vs. an AI round-trip, and covers every
    // catalog category plus any out-of-catalog item whose name shares real
    // vocabulary with a Naver leaf name (see category-deterministic-matcher.ts
    // for why this covers far more than the old 57-rule FALLBACK_RULES did).
    // AI is demoted to a second attempt, only invoked when deterministic
    // matching finds nothing at all.
    let rawSuggestions: Array<{ d1: string; d2: string; d3: string; d4?: string }> = [];
    let usedAI = false;
    let source: 'deterministic' | 'ai' | 'unresolved' = 'unresolved';

    const deterministic = matchDeterministicCategories(name);
    if (deterministic.length > 0) {
      rawSuggestions = deterministic.map((m) => ({ d1: m.d1, d2: m.d2, d3: m.d3, d4: m.d4 }));
      source = 'deterministic';

      // UCE-7: deterministic found something, but it's a weak or internally
      // conflicted guess — call Groq as a corrective check. Cost-gated: this
      // branch is skipped entirely for a confident deterministic hit.
      if (isDeterministicLowConfidence(deterministic)) {
        try {
          const aiResults = await suggestWithGroq(name);
          const aiValidated = aiResults
            .map((s) => validateSuggestion(s.d1, s.d2, s.d3))
            .filter((s): s is NonNullable<typeof s> => !!s);
          if (aiValidated.length > 0) {
            usedAI = true;
            rawSuggestions = aiValidated;
            source = 'ai';
          }
          // AI returned nothing usable -> keep the deterministic guess (still
          // better than nothing) rather than discarding it.
        } catch (aiError) {
          console.warn('[category/suggest] AI correction failed (deterministic low-confidence):', String(aiError).slice(0, 300));
        }
      }
    } else {
      // UCE-1/UCE-7 (빈손 폴백): deterministic found NOTHING lexically — AI is
      // the only remaining signal, always call it here (not cost-gated; there
      // is no deterministic guess to fall back to if AI also fails).
      try {
        const aiResults = await suggestWithGroq(name);
        usedAI = true;
        for (const s of aiResults) {
          const validated = validateSuggestion(s.d1, s.d2, s.d3);
          if (validated) rawSuggestions.push(validated);
        }
        if (rawSuggestions.length > 0) source = 'ai';
      } catch (aiError) {
        console.warn('[category/suggest] AI failed (deterministic also found nothing):', String(aiError).slice(0, 300));
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    let suggestions = rawSuggestions.filter(s => {
      const key = `${s.d1}|${s.d2}|${s.d3}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sprint 7 P1-A: validate top suggestion against Naver Shopping page-1 distribution.
    // If page-1 has a dominant d1/d2 (>=60% share) AND our top suggestion's d1/d2
    // disagrees, prepend the page-validated suggestion (override). We do NOT erase
    // the AI suggestion — append it so user sees both.
    let pageValidation: Awaited<ReturnType<typeof validatePageCategory>> | null = null;
    let pageValidationApplied: 'override' | 'agreed' | 'synthesized' | 'no_signal' | 'error' = 'no_signal';
    try {
      pageValidation = await validatePageCategory(name);
      if (pageValidation.error) {
        pageValidationApplied = 'error';
      } else if (pageValidation.dominant) {
        const dom = pageValidation.dominant;
        // Case A: AI/fallback produced suggestions — agree or override
        if (suggestions.length > 0) {
          const topMatchesDom =
            suggestions[0].d1 === dom.d1 && suggestions[0].d2 === dom.d2;
          if (topMatchesDom) {
            pageValidationApplied = 'agreed';
          } else {
            const matchingD3 = suggestions.find((s) => s.d1 === dom.d1 && s.d2 === dom.d2);
            const overrideD3 = matchingD3?.d3 ?? suggestions[0].d3;
            const overrideD4 = matchingD3?.d4 ?? suggestions[0].d4;
            const overrideSuggestion = {
              d1: dom.d1, d2: dom.d2, d3: overrideD3, d4: overrideD4,
            };
            suggestions = [overrideSuggestion, ...suggestions.filter((s) =>
              !(s.d1 === overrideSuggestion.d1 && s.d2 === overrideSuggestion.d2 && s.d3 === overrideSuggestion.d3),
            )].slice(0, 3);
            pageValidationApplied = 'override';
          }
        }
        // Case B: AI/fallback both failed — synthesize from page validation alone
        else {
          // Resolve d3 by picking the most-popular d3 in the same d1+d2 from NAVER_CATEGORIES_FULL
          const d1d2Matches = NAVER_CATEGORIES_FULL.filter(
            (c) => c.d1 === dom.d1 && c.d2 === dom.d2,
          );
          const d3Pick = d1d2Matches[0]; // first match is usually canonical
          if (d3Pick) {
            suggestions = [{
              d1: dom.d1, d2: dom.d2,
              d3: d3Pick.d3,
              d4: d3Pick.d4,
            }];
            pageValidationApplied = 'synthesized';
          }
        }
      }
    } catch (e) {
      pageValidationApplied = 'error';
      console.warn('[category/suggest] page validation failed:', String(e).slice(0, 120));
    }

    // G2 Fix A: self-validate the final suggestions against the local tree
    // (the page-validation override above may have produced a ghost triple).
    suggestions = selfValidateSuggestions(suggestions);

    // Sprint 6-E: write top suggestion to cache (best-effort, don't block response).
    // G2 Fix B: only persist a FULLY valid triple. A blanked-d3 (d1/d2-only)
    // result is intentionally NOT cached so a future improved run can still
    // resolve the correct d3 instead of locking in the partial mapping.
    const top = suggestions[0];
    const topIsFullyValid = !!(top && top.d3 && resolveCategoryId(top.d1, top.d2, top.d3, top.d4));
    if (top && topIsFullyValid && nameKey) {
      saveMapping({
        kind: 'name_hash',
        key: nameKey,
        d1: top.d1,
        d2: top.d2,
        d3: top.d3,
        d4: top.d4 ?? null,
        confidence: source === 'deterministic' ? 85 : source === 'ai' ? 75 : 55,
        source,
      }).catch((e) => console.warn('[category/suggest] cache write failed:', String(e).slice(0, 120)));
    }
    if (top && topIsFullyValid && domeCategoryCode) {
      saveMapping({
        kind: 'dome_code',
        key: domeCategoryCode,
        d1: top.d1,
        d2: top.d2,
        d3: top.d3,
        d4: top.d4 ?? null,
        confidence: source === 'deterministic' ? 90 : source === 'ai' ? 80 : 60,
        source,
      }).catch((e) => console.warn('[category/suggest] cache write failed:', String(e).slice(0, 120)));
    }

    // #249: cache write above intentionally uses the mapping-order top (the
    // page-validated canonical category). The RESPONSE is ranked by SEO×ROI so
    // the seller sees the most search-favourable + profitable candidate first —
    // these are two different concerns (correct mapping vs. best opportunity).
    const rankedSuggestions = await rankByScore(suggestions, supplierPrice);

    // UCE-4: honest, self-healing — flag when every layer failed, clear it
    // the moment a later call (e.g. after the master regenerates) succeeds.
    if (productId) {
      await updateCategoryConfirmFlag(productId, suggestions.length === 0);
    }

    return NextResponse.json({
      success: true,
      suggestions: rankedSuggestions,
      usedAI,
      pageValidation: pageValidation
        ? {
            applied: pageValidationApplied,
            dominantD1: pageValidation.dominant?.d1 ?? null,
            dominantD2: pageValidation.dominant?.d2 ?? null,
            dominantShare: pageValidation.dominant?.share ?? null,
            totalItems: pageValidation.totalItems,
            error: pageValidation.error ?? null,
          }
        : null,
    });
  } catch (e: unknown) {
    console.error('[category/suggest] error:', e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
