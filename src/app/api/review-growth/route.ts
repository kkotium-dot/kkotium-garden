// src/app/api/review-growth/route.ts
// E-2A: Review growth tracker API
// GET: returns confirmed orders, manual review count, calculated rate, stage, checklist
// PATCH: update manualReviewCount or reviewChecklist
// Naver review API not supported (GitHub #1582) — manual count only

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 9-item operations checklist — labels in Korean for UI, keys in English
const CHECKLIST_KEYS = [
  'reviewReward',        // 1. Review point reward set
  'insertCard',          // 2. Insert card included in shipments
  'talktalkAutoreply',   // 3. Talktalk auto-reply within 12h
  'alimtalkConnected',   // 4. Solapi alimtalk connected (E-13B)
  'returnCare',          // 5. Return care insurance enabled
  'monthReviewGuide',    // 6. One-month review reminder set
  'aitemsRecommend',     // 7. AiTEMS recommendation ON
  'bestReviewTop3',      // 8. Best 3 reviews curated
  'kakaoQrExposure',     // 9. Kakao channel QR on insert/detail page
] as const;

interface ChecklistState {
  [key: string]: boolean;
}

// Stage detection from review count
function detectStage(reviewCount: number): { stage: number; label: string; nextGoal: number } {
  if (reviewCount >= 51) return { stage: 3, label: '성장기', nextGoal: 100 };
  if (reviewCount >= 11) return { stage: 2, label: '확장기', nextGoal: 50 };
  return { stage: 1, label: '초기기', nextGoal: 10 };
}

// Auto-detect checklist items from product/store data
async function autoDetectChecklist(): Promise<Partial<ChecklistState>> {
  const products = await prisma.product.findMany({
    where: { status: { in: ['ACTIVE', 'DRAFT'] } },
    select: { return_care_enabled: true },
  });
  const total = products.length || 1;

  // 5. returnCare — at least 30% products have return care enabled
  const returnCareCount = products.filter((p) => p.return_care_enabled).length;
  const returnCareRate = returnCareCount / total;

  // 9. kakaoQrExposure — kakaoChannelId is set in store settings
  const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
  const kakaoSet = !!(settings?.kakaoChannelId && settings.kakaoChannelId.trim().length > 0);

  return {
    returnCare: returnCareRate >= 0.3,
    kakaoQrExposure: kakaoSet,
  };
}

export async function GET() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalConfirmed, monthConfirmed, deliveredCount, settings] = await Promise.all([
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.count({
        where: { status: 'COMPLETED', updatedAt: { gte: monthStart } },
      }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.storeSettings.findUnique({ where: { id: 'default' } }),
    ]);

    const manualReviewCount = settings?.manualReviewCount ?? 0;
    const stored = (settings?.reviewChecklist as ChecklistState | null) ?? {};
    const auto = await autoDetectChecklist();

    // Merge: auto-detected fields override stored values where applicable
    const checklist: ChecklistState = {};
    for (const key of CHECKLIST_KEYS) {
      checklist[key] = auto[key] ?? stored[key] ?? false;
    }

    // Review writing rate (target 20-25%)
    const writingRate = totalConfirmed > 0
      ? Math.round((manualReviewCount / totalConfirmed) * 100 * 10) / 10
      : 0;

    const stage = detectStage(manualReviewCount);
    const checkedCount = Object.values(checklist).filter(Boolean).length;

    return NextResponse.json({
      success: true,
      data: {
        totalConfirmed,
        monthConfirmed,
        deliveredCount,
        manualReviewCount,
        writingRate,
        targetRate: 22.5, // midpoint of 20-25%
        stage,
        checklist,
        checkedCount,
        totalChecklistItems: CHECKLIST_KEYS.length,
        kakaoChannel: {
          id: settings?.kakaoChannelId ?? '',
          name: settings?.kakaoChannelName ?? '',
          email: settings?.kakaoChannelEmail ?? '',
          publicUrl: settings?.kakaoChannelId
            ? `http://pf.kakao.com/${settings.kakaoChannelId}`
            : '',
        },
        autoDetected: Object.keys(auto),
        lastUpdated: settings?.reviewLastUpdated ?? null,
      },
    });
  } catch (e) {
    console.error('[review-growth] GET error:', e);
    return NextResponse.json({ success: false, error: 'Failed to load review data' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const updates: { manualReviewCount?: number; reviewChecklist?: ChecklistState; reviewLastUpdated?: Date } = {};

    if (typeof body.manualReviewCount === 'number' && body.manualReviewCount >= 0) {
      updates.manualReviewCount = Math.floor(body.manualReviewCount);
    }
    if (body.reviewChecklist && typeof body.reviewChecklist === 'object') {
      // Whitelist keys only
      const sanitized: ChecklistState = {};
      for (const key of CHECKLIST_KEYS) {
        if (typeof body.reviewChecklist[key] === 'boolean') {
          sanitized[key] = body.reviewChecklist[key];
        }
      }
      updates.reviewChecklist = sanitized;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }
    updates.reviewLastUpdated = new Date();

    await prisma.storeSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...updates },
      update: updates,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[review-growth] PATCH error:', e);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}
