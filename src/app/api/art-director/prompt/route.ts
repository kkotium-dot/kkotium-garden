// src/app/api/art-director/prompt/route.ts
//
// Sprint 7-M2 5-B — AI art director prompt API.
//
// Pipeline (design doc §1, length-B route):
//   1. Load product → infer ConceptTone (8-axis CTI)
//   2. Collect strategy signals → classifyRole → designer effort multiplier
//   3. Optional image analyzer (sharp fallback only — Adobe MCP runs out-of-band)
//   4. translatePrompt → ArtDirectorPrompt (rule-composed + Groq-polished)
//   5. classifyAssetStatus → auto_bloomed / lets_refine / needs_your_magic
//   6. Best-effort persist to art_director_prompts (graceful if table missing)
//   7. Return seller-friendly Korean status labels from i18n
//
// Persistence is best-effort: the StrategySignal + ArtDirectorPrompt tables
// live on Supabase and the Senior creates them via MCP migration. Until the
// table exists, writes fail with P2021 and we swallow the error so the route
// still returns a usable prompt to the seller.

import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { inferConceptTone } from '@/lib/diagnosis/concept-tone-inference';
import {
  collectStrategySignals,
} from '@/lib/strategy/signal-collector';
import { classifyRole } from '@/lib/strategy/role-engine';
import { translatePrompt } from '@/lib/art-director/prompt-translator';
import { classifyAssetStatus, type AssetStatus } from '@/lib/art-director/asset-status';
import {
  extractFallbackPalette,
  EMPTY_IMAGE_ANALYSIS,
  type ImageAnalysisResult,
} from '@/lib/art-director/image-analyzer';
import messages from '@/lib/i18n/art-director-messages.ko.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// i18n shape
// ---------------------------------------------------------------------------

interface MessagesShape {
  statuses: Record<AssetStatus, { label: string; tooltip: string }>;
  roles: Record<string, { label: string; tooltip: string }>;
}
const MESSAGES = messages as unknown as MessagesShape;

const FIREFLY_WEB_URL = 'https://firefly.adobe.com';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RequestBody {
  productId: string;
  options?: {
    skipImageAnalysis?: boolean;
    forceRefresh?: boolean;
  };
}

async function readBody(req: NextRequest): Promise<RequestBody | null> {
  try {
    const body = (await req.json()) as RequestBody;
    if (!body || typeof body.productId !== 'string' || body.productId.length === 0) {
      return null;
    }
    return body;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  const body = await readBody(req);
  if (!body) {
    return NextResponse.json(
      { ok: false, error: 'invalid_request', message: 'productId is required' },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: body.productId },
    select: {
      id: true,
      name: true,
      salePrice: true,
      category: true,
      mainImage: true,
      optionValues: true,
      optionName: true,
    },
  });
  if (!product) {
    return NextResponse.json(
      { ok: false, error: 'product_not_found', productId: body.productId },
      { status: 404 },
    );
  }

  // ---- Stage 1: ConceptTone inference ------------------------------------
  const optionCount = Array.isArray(product.optionValues)
    ? product.optionValues.length
    : 0;
  const cti = inferConceptTone({
    productName: product.name,
    category: product.category,
    salePrice: product.salePrice,
    optionCount,
    optionName: product.optionName,
  });

  // ---- Stage 2: Strategy signals + role classification -------------------
  const signalResult = await collectStrategySignals({ query: product.name });
  const roleClassification = classifyRole(signalResult.signals);

  // ---- Stage 3: Image analysis (sharp fallback only at runtime) ----------
  let imageAnalysis: ImageAnalysisResult = EMPTY_IMAGE_ANALYSIS;
  if (!body.options?.skipImageAnalysis && product.mainImage) {
    imageAnalysis = await extractFallbackPalette({ imageUrl: product.mainImage });
  }

  // ---- Stage 4: Translate prompt -----------------------------------------
  const prompt = await translatePrompt({
    productName: product.name,
    category: product.category,
    conceptTone: cti.conceptTone,
    inferenceConfidence: cti.inferenceConfidence,
    imageAnalysis,
  });

  // ---- Stage 5: Asset status (role-aware thresholds) ---------------------
  const statusResult = classifyAssetStatus({
    inferenceConfidence: cti.inferenceConfidence,
    imageAnalysisConfidence: imageAnalysis.confidence,
    role: roleClassification.role,
    designerEffortMultiplier: roleClassification.designerEffortMultiplier,
  });

  // ---- Stage 6: Best-effort persistence ----------------------------------
  let reusedFromId: string | null = null;
  let persistedId: string | null = null;
  try {
    const inserted = await prisma.artDirectorPrompt.create({
      data: {
        productId: product.id,
        categoryHint: product.category ?? 'uncategorized',
        conceptAxes: JSON.parse(JSON.stringify(cti.conceptTone)),
        prompt: prompt.prompt,
        negativePrompt: prompt.negativePrompt,
        aspectRatio: prompt.aspectRatio,
        imageInformed: prompt.derivedFrom.imageInformed,
        status: statusResult.status,
        role: roleClassification.role,
      },
      select: { id: true },
    });
    persistedId = inserted.id;
  } catch (err) {
    // Table may not exist yet (Senior creates via Supabase MCP). Do not break
    // the response — log and continue.
    console.warn('[art-director] prompt persistence skipped:', err instanceof Error ? err.message : err);
  }

  try {
    await prisma.strategySignal.create({
      data: {
        productId: product.id,
        query: product.name,
        searchVolume: signalResult.signals.searchVolume,
        productCount: signalResult.signals.productCount,
        trendSlope: signalResult.signals.trendSlope,
        honeyScore: signalResult.signals.honeyScore,
        competitionIdx: signalResult.signals.competitionIdx,
        role: roleClassification.role,
        opportunityIndex: roleClassification.opportunityIndex,
        reasons: roleClassification.reasons,
      },
    });
  } catch (err) {
    console.warn('[art-director] strategy signal persistence skipped:', err instanceof Error ? err.message : err);
  }

  // ---- Stage 7: i18n-labelled response -----------------------------------
  const statusMsg = MESSAGES.statuses[statusResult.status];
  const roleMsg = MESSAGES.roles[roleClassification.role] ?? MESSAGES.roles.standard;

  return NextResponse.json({
    ok: true,
    product: { id: product.id, name: product.name },
    role: {
      id: roleClassification.role,
      label: roleMsg.label,
      tooltip: roleMsg.tooltip,
      opportunityIndex: roleClassification.opportunityIndex,
      reasons: roleClassification.reasons,
      designerEffortMultiplier: roleClassification.designerEffortMultiplier,
    },
    status: {
      id: statusResult.status,
      label: statusMsg.label,
      tooltip: statusMsg.tooltip,
      compositeScore: statusResult.compositeScore,
      autoBloomFloor: statusResult.autoBloomFloor,
      needsMagicCeiling: statusResult.needsMagicCeiling,
      reasons: statusResult.reasons,
    },
    prompt: {
      main: prompt.prompt,
      rule: prompt.rulePrompt,
      negative: prompt.negativePrompt,
      aspectRatio: prompt.aspectRatio,
      derivedFrom: prompt.derivedFrom,
    },
    signals: {
      values: signalResult.signals,
      sourceStatus: signalResult.status,
      errors: signalResult.errors,
    },
    imageAnalysis: {
      source: imageAnalysis.source,
      confidence: imageAnalysis.confidence,
      dominantColors: imageAnalysis.dominantColors,
      detectedObjects: imageAnalysis.detectedObjects,
    },
    persistence: {
      promptId: persistedId,
      reusedFromId,
    },
    fireflyUrl: FIREFLY_WEB_URL,
    reusedFromId,
    elapsedMs: Date.now() - startedAt,
  });
}
