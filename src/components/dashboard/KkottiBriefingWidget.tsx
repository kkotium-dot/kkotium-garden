// src/components/dashboard/KkottiBriefingWidget.tsx
// Workflow Redesign Sprint Part A1a (2026-05-03)
// Kkotti daily briefing widget — one-line situation summary using rule-based
// inference over four live SWR data sources.
//
// Concept (PDF "꼬띠가 말해요!" box):
//   - Persona variant icon + face (9 stages)
//   - One-line status body (12~30 chars, data-driven)
//   - Variant-specific catchphrase ("빵야~" / "까꿍")
//   - Optional one-tap action cheer ("자, 가요" / "갑시다")
//
// Data sources (all already in useDashboardData.ts):
//   1. useProfitability  — average margin, danger ratio
//   2. useGoodService    — overall grade S/A/B/C/D
//   3. useUploadReadiness — DRAFT count + ready-to-upload count
//   4. useReviewGrowth   — review delta vs target
//
// Inference rules (priority order):
//   1. Critical : danger margin ratio > 30%       → concerned tone
//   2. Warn     : GoodService grade dropped       → surprised tone
//   3. Win-A    : >= 3 DRAFTs at 90+              → cheer tone (action mode)
//   4. Win-B    : Review growth on track          → happy tone (celebrate)
//   5. Default  : All normal                      → happy tone (idle)
//
// Zero AI calls — fully deterministic. Stays under 16 KB.

'use client';

import { useMemo } from 'react';
import {
  useProfitability,
  useGoodService,
  useUploadReadiness,
  useReviewGrowth,
} from '@/lib/hooks/useDashboardData';
import {
  KKOTTI_FACE,
  KKOTTI_VARIANTS,
  composeBriefing,
  type KkottiVariant,
  type KkottiFaceState,
} from '@/lib/kkotti-vocab';

// ============================================================================
// Inference output type
// ============================================================================
interface BriefingResult {
  body: string;                     // 12~30 char data-driven message
  tone: 'happy' | 'surprised' | 'concerned' | 'cheer';
  face: KkottiFaceState;
  variant: KkottiVariant;
  actionLabel?: string;             // optional CTA label
  actionHref?: string;              // optional CTA destination
  rationale: string;                // why this brief was chosen (debug aid)
}

// ============================================================================
// Helper — DRAFT-shaped data extractor (matches existing widget patterns)
// ============================================================================
type DraftItem = {
  status?: string;
  honeyScore?: number | null;
  uploadReadinessScore?: number | null;
};

function countReadyDrafts(rawDrafts: unknown): { ready90: number; total: number } {
  if (!rawDrafts) return { ready90: 0, total: 0 };
  // The API returns either { products: [...] } or { data: [...] }; both shapes
  // are handled by useUploadReadiness consumers.
  const arr = (Array.isArray(rawDrafts)
    ? rawDrafts
    : Array.isArray((rawDrafts as { products?: unknown[] }).products)
      ? (rawDrafts as { products: unknown[] }).products
      : Array.isArray((rawDrafts as { data?: unknown[] }).data)
        ? (rawDrafts as { data: unknown[] }).data
        : []) as DraftItem[];

  const drafts = arr.filter((p) => (p?.status ?? 'DRAFT') === 'DRAFT');
  const ready90 = drafts.filter((p) => {
    const score = p.uploadReadinessScore ?? p.honeyScore ?? 0;
    return score >= 90;
  }).length;
  return { ready90, total: drafts.length };
}

// ============================================================================
// Rule-based inference
// ============================================================================
function inferBriefing(opts: {
  margin: { dangerRatio: number; avgMargin: number; totalCount: number } | null;
  good: { grade: string; overall: number } | null;
  drafts: { ready90: number; total: number };
  reviews: { delta: number; target: number } | null;
}): BriefingResult {
  const { margin, good, drafts, reviews } = opts;

  // Rule 1 — Critical margin danger
  if (margin && margin.totalCount > 0 && margin.dangerRatio > 0.3) {
    return {
      body: `튤립이 시들 시점이에요. 마진 위험 ${Math.round(margin.dangerRatio * 100)}%`,
      tone: 'concerned',
      face: 'concerned',
      variant: 'planter',
      actionLabel: '마진 보강하러 가기',
      actionHref: '/products?filter=danger',
      rationale: 'margin_danger',
    };
  }

  // Rule 2 — Good Service grade warning
  if (good && (good.grade === 'C' || good.grade === 'D')) {
    return {
      body: `굿서비스 ${good.grade}등급. 답글 작성 출동!`,
      tone: 'surprised',
      face: 'warn',
      variant: 'cowgirl',
      actionLabel: '리뷰 답글 작성',
      actionHref: '/orders',
      rationale: 'good_service_low',
    };
  }

  // Rule 3 — Action win: >=3 DRAFTs ready at 90+ → push to register
  if (drafts.ready90 >= 3) {
    return {
      body: `정원에 꽃이 피었어요. ${drafts.ready90}개가 90점 넘었어요`,
      tone: 'cheer',
      face: 'proud',
      variant: 'hunter',
      actionLabel: '등록 출동',
      actionHref: '/products?status=DRAFT',
      rationale: 'drafts_ready',
    };
  }

  // Rule 4 — Review growth on/over target
  if (reviews && reviews.target > 0 && reviews.delta >= reviews.target) {
    return {
      body: `꺄~ 리뷰 ${reviews.delta}건 달성. 단골 작전 성공!`,
      tone: 'happy',
      face: 'celebrate',
      variant: 'celebrator',
      actionLabel: '단골 알림톡 보내기',
      actionHref: '/settings/kakao',
      rationale: 'review_target_hit',
    };
  }

  // Rule 5 — Mid-progress draft action (>=1 ready)
  if (drafts.ready90 >= 1) {
    return {
      body: `봉오리가 맺혔어요. ${drafts.ready90}개 등록 준비됐어요`,
      tone: 'happy',
      face: 'idle',
      variant: 'hunter',
      actionLabel: '검색 조련사로',
      actionHref: '/seo-tamer',
      rationale: 'drafts_partial',
    };
  }

  // Rule 6 — Default healthy state
  if (good && good.grade === 'S') {
    return {
      body: `오늘 정원 상태 최고예요. 굿서비스 S등급!`,
      tone: 'happy',
      face: 'done',
      variant: 'gardener',
      rationale: 'all_healthy_S',
    };
  }

  if (good && good.grade === 'A') {
    return {
      body: `정원이 잘 자라고 있어요. 굿서비스 A등급`,
      tone: 'happy',
      face: 'proud',
      variant: 'gardener',
      rationale: 'all_healthy_A',
    };
  }

  // Rule 7 — Fallback (no data yet or all neutral)
  return {
    body: drafts.total > 0
      ? `등록 대기 ${drafts.total}개. 씨앗 심기부터 시작해요`
      : '오늘 정원이 조용해요. 꿀통 사냥터부터 둘러봐요',
    tone: 'cheer',
    face: 'scanning',
    variant: 'gardener',
    actionLabel: drafts.total > 0 ? '검색 조련사로' : '꿀통 사냥터로',
    actionHref: drafts.total > 0 ? '/seo-tamer' : '/sourcing',
    rationale: 'fallback',
  };
}

// ============================================================================
// Daily seed — keeps the same brief stable within a single day
// ============================================================================
function dayOfYearSeed(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ============================================================================
// Component
// ============================================================================
interface KkottiBriefingWidgetProps {
  /** Optional override for testing or for forcing a specific section variant. */
  variantOverride?: KkottiVariant;
}

export default function KkottiBriefingWidget({ variantOverride }: KkottiBriefingWidgetProps = {}) {
  const profitability = useProfitability();
  const goodService   = useGoodService();
  const uploadReady   = useUploadReadiness();
  const reviewGrowth  = useReviewGrowth<{
    success?: boolean;
    data?: {
      summary?: { thisMonth?: { delta?: number; target?: number } };
    };
  }>();

  const isLoading =
    profitability.isLoading || goodService.isLoading ||
    uploadReady.isLoading   || reviewGrowth.isLoading;

  const brief: BriefingResult = useMemo(() => {
    // Margin signals from Profitability
    const profSummary = profitability.data?.summary;
    const profDist    = profitability.data?.distribution;
    const totalCount  = profSummary?.totalProducts ?? 0;
    const dangerCount = (profDist?.danger ?? 0) + (profDist?.low ?? 0);
    const dangerRatio = totalCount > 0 ? dangerCount / totalCount : 0;
    const margin = profSummary
      ? {
          dangerRatio,
          avgMargin: profSummary.avgMarginNormal ?? 0,
          totalCount,
        }
      : null;

    // Good Service grade
    const good = goodService.data
      ? { grade: goodService.data.score.grade, overall: goodService.data.score.overall }
      : null;

    // Upload readiness — count DRAFTs at >=90
    const drafts = countReadyDrafts(uploadReady.data);

    // Review growth — current month delta vs target
    const rgSummary = reviewGrowth.data?.data?.summary?.thisMonth;
    const reviews = rgSummary
      ? { delta: rgSummary.delta ?? 0, target: rgSummary.target ?? 0 }
      : null;

    return inferBriefing({ margin, good, drafts, reviews });
  }, [profitability.data, goodService.data, uploadReady.data, reviewGrowth.data]);

  // Use override if provided, otherwise use inferred variant
  const variant: KkottiVariant = variantOverride ?? brief.variant;
  const variantMeta = KKOTTI_VARIANTS[variant];
  const face = KKOTTI_FACE[brief.face];

  // Daily-stable opener (uses seed so the same brief shows the same opener all day)
  const seed = dayOfYearSeed();
  const fullLine = composeBriefing({
    body: brief.body,
    variant,
    tone: brief.tone,
    seed,
  });

  // ── Render ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="kk-card" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#A3A3A3' }}>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'monospace' }}>
            {KKOTTI_FACE.scanning}
          </div>
          <div style={{ fontSize: 14 }}>꼬띠가 정원을 둘러보고 있어요...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="kk-card"
      style={{
        padding: '18px 22px',
        background: 'linear-gradient(135deg, #FFF8FA 0%, #FEF0F3 100%)',
        border: '1px solid #FBD3DE',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 16,
          alignItems: 'center',
        }}
      >
        {/* Mascot face — 9-stage emotional state */}
        <div
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 14,
            background: '#FFFFFF',
            border: '2px solid #FBD3DE',
            fontSize: 22,
            fontWeight: 700,
            fontFamily: 'monospace',
            color: '#E8001F',
            letterSpacing: '-0.05em',
            flexShrink: 0,
          }}
          title={`${variantMeta.label} · ${brief.face}`}
        >
          {face}
        </div>

        {/* Body — variant label + briefing line */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#E8001F',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            {variantMeta.label}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#171717',
              lineHeight: 1.45,
              letterSpacing: '-0.005em',
            }}
          >
            {fullLine}
          </div>
        </div>

        {/* CTA — only when brief.actionHref exists */}
        {brief.actionLabel && brief.actionHref && (
          <a
            href={brief.actionHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '10px 14px',
              borderRadius: 10,
              background: '#E8001F',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(232, 0, 31, 0.20)',
              transition: 'transform 0.12s ease, box-shadow 0.12s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(232, 0, 31, 0.30)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(232, 0, 31, 0.20)';
            }}
          >
            {brief.actionLabel}
          </a>
        )}
      </div>
    </div>
  );
}
