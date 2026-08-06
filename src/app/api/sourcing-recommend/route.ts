// src/app/api/sourcing-recommend/route.ts
// E-7: Kkotti Sourcing Recommendation API
// GET: Fetch latest recommendations (cached) or trigger new scan
// POST: Force fresh scan (used by cron/daily and dashboard button)

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  generateSourcingRecommendations,
  buildSourcingRecommendEmbed,
  type SourcingRecommendResult,
} from '@/lib/sourcing-recommender';
import { sendDiscord } from '@/lib/discord';
import { resolveRecoTypeTags } from '@/lib/naver/reco-type-resolver';

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

    // 트랙A(2026-08-04, docs/design/SOURCING_DEEP_DIVE_WEBAPP_2026-08-04.md §3):
    // 완전한 형태로 영속화된 새 테이블을 먼저 조회한다. daily_recommendations
    // (상품명·점수만 저장하는 얕은 구조)로의 폴백은 이 테이블이 비어있을 때만
    // 남긴다(과거 데이터·마이그레이션 이전 호환).
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const fullRecords = await prisma.sourcingOpportunityRecord.findMany({
      where: { date: { gte: todayStart } },
      orderBy: { rank: 'asc' },
      take: 5,
    }).catch(() => []); // P2021 가드 — 마이그레이션 이전 배포에서도 안전하게 동작

    if (fullRecords.length > 0) {
      const result: SourcingRecommendResult = {
        date: todayStart.toLocaleDateString('ko-KR'),
        trendSource: 'db-full',
        trendCategories: [...new Set(fullRecords.map(r => r.category).filter((c): c is string => !!c))],
        opportunities: fullRecords.map(r => ({
          keyword: r.keyword,
          category: r.category ?? '',
          monthlySearchVolume: r.monthlySearchVolume,
          competition: (r.competition ?? 'unknown') as 'low' | 'mid' | 'high' | 'unknown',
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          totalResults: 0,
          competitionLevel: '',
          suggestedSupplyPrice: 0,
          estimatedMargin: 0,
          blueOceanScore: r.blueOceanScore,
          reason: 'db-full',
          topSellers: [],
          aiInsight: r.aiInsight ?? undefined,
          recoType: (r.recoType as any) ?? null,
          supplyPriceRange: (r.supplyPriceRange as { min: number; max: number } | null) ?? undefined,
          wholesaleMatches: (r.wholesaleMatches as any) ?? undefined,
          // 트랙C-1(2026-08-05): 낙점 상태 관리 — 위젯이 상태 칩 표시·PATCH
          // 대상 식별에 쓴다. db-full 경로에서만 채워진다(레거시 폴백엔 없음).
          recordId: r.id,
          operatorStatus: (r.operatorStatus as 'interested' | 'sourcing_started' | 'skipped' | null) ?? null,
        })),
      };
      cachedResult = result;
      cachedAt = Date.now();
      return NextResponse.json({ ok: true, cached: true, ...result });
    }

    // Check DB for today's recommendation (레거시 폴백 — 신규 테이블 마이그레이션
    // 이전 데이터 또는 아직 오늘자 sourcing 레코드가 없는 경우)
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
// P1-C: dryRun=true(쿼리 또는 body) → 디스코드 미발송, DB 미저장, embed JSON +
// 취급 제외 통계만 반환. 운영자 승인 전까지 실발송 금지(#절대원칙).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const bodyRecord = body as Record<string, unknown>;
    const sendToDiscord = bodyRecord.discord !== false;
    const dryRun =
      req.nextUrl.searchParams.get('dryRun') === 'true' || bodyRecord.dryRun === true;

    // Generate fresh recommendations
    const result = await generateSourcingRecommendations();
    cachedResult = result;
    cachedAt = Date.now();

    if (dryRun) {
      // #250 §3 recoType 태그는 dry-run 미리보기에도 붙여준다(운영자 확인용).
      if (result.opportunities.length > 0) {
        const nowMonth = new Date().getMonth() + 1;
        const tags = await resolveRecoTypeTags(
          result.opportunities.map((o) => ({
            d1: o.category === 'general' ? '' : o.category,
            supplierPrice: o.suggestedSupplyPrice,
          })),
          nowMonth,
        ).catch(() => result.opportunities.map(() => null));
        result.opportunities.forEach((o, i) => { o.recoType = tags[i] ?? null; });
      }

      const embed = buildSourcingRecommendEmbed(result);
      return NextResponse.json({
        ok: true,
        dryRun: true,
        discordSent: false,
        opportunityCount: result.opportunities.length,
        excludedCount: result.excludedCount ?? 0,
        excludedSamples: result.excludedSamples ?? [],
        embedPreview: embed,
        ...result,
      });
    }

    // #250 §3: tag each opportunity 황금/니치/시즌 (category-score, D1-level).
    // opp.category is a DataLab D1 name; 'general'/unknown → no tag (honest #231).
    // 트랙A(2026-08-04): DB 저장 블록보다 먼저 실행해야 한다 — recoType이
    // 붙기 전에 저장하면 sourcing_opportunity_records.reco_type이 항상
    // null로 저장되는 순서 버그가 될 뻔했다(실측으로 발견·즉시 재배치).
    if (result.opportunities.length > 0) {
      const nowMonth = new Date().getMonth() + 1;
      const tags = await resolveRecoTypeTags(
        result.opportunities.map((o) => ({
          d1: o.category === 'general' ? '' : o.category,
          supplierPrice: o.suggestedSupplyPrice,
        })),
        nowMonth,
      ).catch(() => result.opportunities.map(() => null));
      result.opportunities.forEach((o, i) => { o.recoType = tags[i] ?? null; });
    }

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

      // 트랙A(2026-08-04): 완전한 형태로 새 테이블에도 저장. daily_recommendations
      // (위)는 다른 화면이 이미 참조할 수 있어 그대로 보존하고, 이 테이블이
      // 심화화면(드로어·아카이브)의 실제 데이터 소스가 된다. P2021 가드로
      // 마이그레이션 이전 배포에서도 전체 요청이 실패하지 않게 한다(#82 best-effort).
      await prisma.sourcingOpportunityRecord.deleteMany({
        where: { date: todayDate },
      }).catch(() => null);

      await prisma.sourcingOpportunityRecord.createMany({
        data: result.opportunities.map((opp, i) => ({
          date: todayDate,
          keyword: opp.keyword,
          category: opp.category || null,
          monthlySearchVolume: opp.monthlySearchVolume,
          competition: opp.competition,
          blueOceanScore: opp.blueOceanScore,
          rank: i,
          // Prisma의 Json 필드는 배열/객체를 InputJsonValue로 명시 캐스팅해야
          // 받는다(TS2322 — WholesaleProduct[]가 InputJsonObject와 구조적으로
          // 안 맞는다는 tsc 실측 오류를 그대로 따라 수정, unknown 경유 필요).
          supplyPriceRange: (opp.supplyPriceRange ?? null) as unknown as Prisma.InputJsonValue,
          wholesaleMatches: (opp.wholesaleMatches ?? null) as unknown as Prisma.InputJsonValue,
          aiInsight: opp.aiInsight ?? null,
          recoType: opp.recoType?.type ?? null,
        })),
      }).catch(() => null);
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
