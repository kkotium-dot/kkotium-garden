// src/app/api/sourcing-recommend/route.ts
// E-7: Kkotti Sourcing Recommendation API
// GET: Fetch latest recommendations (cached) or trigger new scan
// POST: Force fresh scan (used by cron/daily and dashboard button)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  generateSourcingRecommendations,
  runSourcingScan,
  type SourcingRecommendResult,
} from '@/lib/sourcing-recommender';

export const dynamic = 'force-dynamic';
// 근본수정(2026-08-11, #338): 이 라우트가 실제 무거운 작업(DataLab+검색량+AI+
// 도매매칭+DB저장+Discord발송)을 전부 수행하는데 maxDuration 지정이 없어
// Vercel Hobby 기본 10초 제한에 걸렸다(실측: dryRun만으로도 8.4초) — 아침
// 소싱 알림이 sent:true를 반환하면서도 DB에 저장 안 되던 근본원인 중 하나.
// cron/daily의 8단계 순차실행과 동일 근거로 60초를 부여한다(#333 계열).
export const maxDuration = 60;

// In-memory cache (5 min TTL)
let cachedResult: SourcingRecommendResult | null = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

// 소싱 레코드 보관 기간(일). 이 기간보다 오래된 레코드는 POST 스캔 때 정리한다.
// 소싱 스캔은 하루 1회 배치이고 GET은 "가장 최신 date 하나"만 조회하므로(#331)
// 과거 레코드는 화면에 안 나오지만, POST가 오늘 것만 deleteMany 하던 기존
// 로직으로는 DB에 무한 누적됐다(실측: 8/3~8/6). 7일은 "최근 한 주 소싱 이력"을
// 남기면서(주간 요약·회귀 확인용) 무한 증가를 막는 균형점이다. 특정 상품이
// 아니라 전 소싱 레코드에 일괄 적용된다(#55 전 상품 공통).
const SOURCING_RETENTION_DAYS = 7;

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

    // ★근본수정(2026-08-06, 트랙C-2 검증 중 발견): "가장 최신 날짜의 스캔 1회분"만
    // 조회한다. 기존 `date: { gte: todayStart }` + `take: 5`는 날짜 경계·타임존
    // 차이로 어제/오늘 레코드가 DB에 함께 있으면(이전 스캔 잔존, 원복 누락 등)
    // 두 날짜에서 rank=0끼리 섞여 같은 키워드가 중복 반환되는 문제가 있었다
    // (실측: "가습기"가 8/5·8/6 두 건으로 나와 setStatus가 keyword 기준이라
    // 엉뚱한 레코드를 낙점). 정상 운영에서 소싱 스캔은 하루 1회 배치이고 POST가
    // 매번 같은 날짜를 deleteMany 후 재생성하므로, "최신 date 하나"가 곧 "오늘의
    // 스캔"이라는 정확한 의미가 된다. 날짜 자체를 조건으로 넣지 않아 타임존
    // 경계 문제를 원천 차단한다.
    const latestRecord = await prisma.sourcingOpportunityRecord.findFirst({
      orderBy: { date: 'desc' },
      select: { date: true },
    }).catch(() => null); // P2021 가드 — 마이그레이션 이전 배포에서도 안전

    const fullRecords = latestRecord
      ? await prisma.sourcingOpportunityRecord.findMany({
          where: { date: latestRecord.date },
          orderBy: { rank: 'asc' },
          take: 5,
        }).catch(() => [])
      : [];

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

    // 근본수정(2026-08-11, #338): 스캔+가드+DB저장+Discord발송 로직은
    // runSourcingScan()(sourcing-recommender.ts)으로 옮겨 cron/sourcing-daily도
    // 같은 함수를 in-process로 직접 호출한다(기존엔 cron이 이 라우트를 HTTP
    // self-fetch — 이 라우트에 maxDuration이 없어 Hobby 기본 10초에 걸려
    // DB저장 직전에 죽는 게 미발송 근본원인이었다). 응답 shape은 기존과 동일.
    const outcome = await runSourcingScan({ dryRun, sendToDiscord });

    if (outcome.skipped) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: outcome.reason,
        discordSent: false,
        opportunityCount: outcome.skippedExistingCount ?? 0,
      });
    }

    cachedResult = outcome.scan;
    cachedAt = Date.now();

    if (outcome.dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        discordSent: false,
        opportunityCount: outcome.scan.opportunities.length,
        excludedCount: outcome.scan.excludedCount ?? 0,
        excludedSamples: outcome.scan.excludedSamples ?? [],
        embedPreview: outcome.embedPreview,
        ...outcome.scan,
      });
    }

    return NextResponse.json({
      ok: true,
      discordSent: outcome.discordSent,
      opportunityCount: outcome.scan.opportunities.length,
      ...outcome.scan,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
