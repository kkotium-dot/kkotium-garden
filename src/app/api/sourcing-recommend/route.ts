// src/app/api/sourcing-recommend/route.ts
// E-7: Kkotti Sourcing Recommendation API
// GET: Fetch latest recommendations (cached) or trigger new scan
// POST: Force fresh scan (used by cron/daily and dashboard button)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  generateSourcingRecommendations,
  buildSourcingRecommendEmbed,
  type SourcingRecommendResult,
} from '@/lib/sourcing-recommender';
import { sendDiscord } from '@/lib/discord';

export const dynamic = 'force-dynamic';

// In-memory cache (5 min TTL)
let cachedResult: SourcingRecommendResult | null = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

// GET: Return cached result or generate new one
export async function GET() {
  try {
    // Check cache
    if (cachedResult && Date.now() - cachedAt < CACHE_TTL) {
      return NextResponse.json({
        ok: true,
        cached: true,
        ...cachedResult,
      });
    }

    // Check DB for today's recommendation
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const dbResult = await prisma.daily_recommendations.findMany({
      where: {
        date: { gte: todayStart },
        season_tag: 'sourcing',
      },
      orderBy: { honey_score: 'desc' },
      take: 5,
    });

    if (dbResult.length > 0) {
      // Reconstruct from DB
      const result: SourcingRecommendResult = {
        date: todayStart.toLocaleDateString('ko-KR'),
        trendSource: 'db-cache',
        trendCategories: [],
        opportunities: dbResult.map(r => ({
          keyword: r.product_name,
          category: '',
          monthlySearchVolume: 0,
          competition: 'unknown' as const,
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          totalResults: 0,
          competitionLevel: '',
          suggestedSupplyPrice: 0,
          estimatedMargin: 0,
          blueOceanScore: r.honey_score,
          reason: 'db-cached',
          topSellers: [],
        })),
      };
      cachedResult = result;
      cachedAt = Date.now();
      return NextResponse.json({ ok: true, cached: true, ...result });
    }

    // Generate fresh
    const result = await generateSourcingRecommendations();
    cachedResult = result;
    cachedAt = Date.now();

    return NextResponse.json({ ok: true, cached: false, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// POST: Force fresh scan + Discord notification + DB save
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sendToDiscord = (body as Record<string, unknown>).discord !== false;

    // Generate fresh recommendations
    const result = await generateSourcingRecommendations();
    cachedResult = result;
    cachedAt = Date.now();

    // Save to DB
    if (result.opportunities.length > 0) {
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      // Delete old sourcing recommendations for today
      await prisma.daily_recommendations.deleteMany({
        where: {
          date: todayDate,
          season_tag: 'sourcing',
        },
      });

      await prisma.daily_recommendations.createMany({
        data: result.opportunities.map(opp => ({
          date: todayDate,
          product_name: opp.keyword,
          honey_score: opp.blueOceanScore,
          season_tag: 'sourcing',
          status: 'sent',
        })),
      });
    }

    // Send Discord notification
    let discordSent = false;
    if (sendToDiscord && result.opportunities.length > 0) {
      const embed = buildSourcingRecommendEmbed(result);
      const discordResult = await sendDiscord('KKOTTI_RECOMMEND', '', [embed]);
      discordSent = discordResult.ok;
    }

    return NextResponse.json({
      ok: true,
      discordSent,
      opportunityCount: result.opportunities.length,
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
