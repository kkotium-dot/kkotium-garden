// GET /api/engine/strategy?productId=...
// ============================================================================
// Adaptive Image + SEO/ROI Strategy Engine — Stage 1 read endpoint. One call
// feeds all three studio panels:
//   - dna   -> analyze tab CategoryDnaCard (시장 DNA)
//   - slots -> image tab SlotFunnelBoard (9슬롯 퍼널)
//   - gate  -> publish tab PrePublishGatePanel (정책/충실도/슬롯충족/준비도)
//
// Pure read: loads the active DNA card (or canonical seed), assembles the
// per-slot strategy (6-axis reuse), and evaluates publish-readiness for the
// product. No external image API, no Naver write (#37/#38, 무접촉). Additive:
// degrades to a seed/empty card if engine tables haven't migrated here yet.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loadActiveDnaCard } from '@/lib/engine/category-dna';
import { assembleStrategy } from '@/lib/engine/strategy-assembler';
import { deriveProductSignals } from '@/lib/engine/slot-decision-table';
import { loadAndEvaluateProducts } from '@/lib/automation/load-publish-readiness';
import { evaluateOriginTruth } from '@/lib/naver/product-builder';
import { englishSubjectFor } from '@/lib/engine/category-subject';
import { getActiveVariants } from '@/lib/storage/variant-coverage';
import { variantConceptFor } from '@/lib/engine/variant-concept';
import { assemblePrompt } from '@/lib/mood/prompt-assembler';
import type { MoodCode } from '@/lib/mood/types';

export const dynamic = 'force-dynamic';

function isMissingTable(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  const msg = e instanceof Error ? e.message : String(e);
  return code === 'P2021' || code === 'P2022' || /does not exist|relation .* does not exist|column/i.test(msg);
}

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('productId')?.trim() || null;
  if (!productId) {
    return NextResponse.json({ error: 'productId_required' }, { status: 400 });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, category: true, naverCategoryCode: true, originCode: true },
    });
    if (!product) {
      return NextResponse.json({ error: 'product_not_found' }, { status: 404 });
    }

    const categoryCode = product.naverCategoryCode?.trim() || '';
    const { card, source } = await loadActiveDnaCard(categoryCode);

    const signals = deriveProductSignals(product.category, product.name);
    const { strategy, plan } = assembleStrategy({
      productId,
      // E2 (#62): English subject noun by category — never the Korean SEO title
      // (which used to leak into the English image prompt).
      productSubject: englishSubjectFor(categoryCode),
      card,
      signals,
    });

    // Per-slot view: merge plan (job + lane + sections) with the assembled
    // strategy (model + grounding + prompt). Truncate the prompt for the board.
    // E5 (#62): per-variant scene concepts for the variant-bearing slot
    // (scent_note). Each in-stock option value gets its own product-free backdrop
    // prompt (concept + mood grade + reserved compositing margin).
    const activeVariants = await getActiveVariants(productId).catch(() => [] as string[]);
    const subject = englishSubjectFor(categoryCode);
    const buildVariants = (slotType: string, mood: MoodCode) => {
      if (slotType !== 'scent_note' || activeVariants.length === 0) return undefined;
      return activeVariants.map((ov) => {
        const vc = variantConceptFor(ov);
        // v6: a variant may carry its own grade (mood); else use the slot mood.
        const assembled = assemblePrompt({
          moodCode: vc?.mood ?? mood,
          product: subject,
          concept: vc?.concept,
          reserveProductMargin: true,
        });
        return { optionValue: ov, concept: vc?.concept ?? null, resolvedPrompt: assembled.prompt };
      });
    };

    const planByType = new Map(plan.map((p) => [p.slotType, p]));
    const slots = strategy.slots.map((s) => {
      const p = planByType.get(s.slotType);
      const variants = buildVariants(s.slotType, s.mood);
      return {
        slotType: s.slotType,
        required: s.required,
        modelRoute: s.modelRoute,
        aspect: s.aspect,
        grounding: s.grounding,
        mood: s.mood,
        realismLane: s.realismLane,
        conversionJob: p?.conversionJob ?? '',
        contentType: p?.contentType ?? '',
        textPolicy: p?.textPolicy ?? 'text_allowed',
        sectionIds: p?.sectionIds ?? [],
        promptPreview: s.resolvedPrompt.slice(0, 280),
        // E3 (#62): the FULL resolved prompt + spec settings so the board can
        // surface a copy-prompt + recommended-Firefly-settings card (the operator
        // copies the engine prompt instead of hand-writing one).
        resolvedPrompt: s.resolvedPrompt,
        resolution: s.resolution,
        cameraKey: s.cameraKey,
        // E5 (#62): per-variant backdrop prompts (scent_note only). undefined for
        // non-variant slots / single-product (no behavior change for those).
        ...(variants ? { variants } : {}),
      };
    });

    // Publish-readiness (reuse existing loader; result now carries the
    // representative-thumbnail gate fields).
    let gate: unknown = null;
    try {
      const loaded = await loadAndEvaluateProducts([productId]);
      const r = loaded[0]?.result;
      if (r) {
        gate = {
          publishReady: r.publishReady,
          hardComplete: r.hardComplete,
          seoComplete: r.seoComplete,
          hardFieldsMissing: r.hardFieldsMissing,
          seoFieldsMissing: r.seoFieldsMissing,
          // C3 (#62): golden-keyword-in-title gap surfaced to the publish panel
          // and Desktop bash verify (e.g. goldenKeywordsMissing: ["차량용"]).
          goldenKeywords: r.goldenKeywords,
          goldenKeywordsMissing: r.goldenKeywordsMissing,
          goldenKeywordComplete: r.goldenKeywordComplete,
          authentic: r.authentic,
          authenticityViolations: r.authenticityViolations,
          naverPayloadComplete: r.naverPayloadComplete,
          naverPayloadMissing: r.naverPayloadMissing,
          thumbnailAssessed: r.thumbnailAssessed,
          thumbnailPass: r.thumbnailPass,
          thumbnailViolations: r.thumbnailViolations,
          status: r.status,
          naverProductId: r.naverProductId,
          // Origin-truth row (#95/#56) — surfaces the publish HARD GATE in the
          // panel: pass / heal(warn) / block, with the validateForRegistration
          // message inline. Product-agnostic (#55).
          originTruth: (() => {
            const v = evaluateOriginTruth(product.originCode);
            return { state: v.state, code: v.code, message: v.message };
          })(),
        };
      }
    } catch (e) {
      if (!isMissingTable(e)) throw e;
    }

    return NextResponse.json({
      productId,
      categoryCode,
      dnaSource: source,
      dna: {
        categoryCode: card.categoryCode,
        categoryName: card.categoryName,
        version: card.version,
        status: card.status ?? 'draft',
        confidence: card.confidence,
        demographics: card.demographics,
        seasonality: card.seasonality,
        priceTiers: card.priceTiers,
        titleConventions: card.titleConventions,
        trustSignals: card.trustSignals,
        toneManner: card.toneManner,
        mandatorySlots: card.mandatorySlots,
        thumbnailConventions: card.thumbnailConventions,
        limitations: card.limitations ?? [],
      },
      slots,
      gate,
    });
  } catch (e) {
    if (isMissingTable(e)) {
      return NextResponse.json({ error: 'engine_tables_unmigrated', degraded: true }, { status: 503 });
    }
    const msg = e instanceof Error ? e.message.slice(0, 200) : 'engine_strategy_error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
