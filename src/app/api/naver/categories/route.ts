// src/app/api/naver/categories/route.ts
// P0-1: Naver category search API (4,993 categories)
//
// B-6: read from local NAVER_CATEGORIES_FULL (canonical 4,993 entries per
// CLAUDE.md §3-3). The previous DB-backed path returned count:0 because the
// `NaverCategory` table was never seeded — yet local data has been the source
// of truth all along (the auto-generated module from category XLS).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  NAVER_CATEGORIES_FULL,
  type NaverCategoryEntry,
} from '@/lib/naver/naver-categories-full';

export const dynamic = 'force-dynamic';

function compareByPath(a: NaverCategoryEntry, b: NaverCategoryEntry): number {
  return a.fullPath.localeCompare(b.fullPath, 'ko');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const depth1 = searchParams.get('depth1');
    const depth2 = searchParams.get('depth2');
    const depth3 = searchParams.get('depth3');

    let categories: NaverCategoryEntry[];

    if (query) {
      const needle = query.toLowerCase();
      categories = NAVER_CATEGORIES_FULL
        .filter((c) => c.fullPath.toLowerCase().includes(needle))
        .sort(compareByPath)
        .slice(0, 50);
    } else if (depth1 || depth2 || depth3) {
      categories = NAVER_CATEGORIES_FULL.filter((c) => {
        if (depth1 && c.d1 !== depth1) return false;
        if (depth2 && c.d2 !== depth2) return false;
        if (depth3 && c.d3 !== depth3) return false;
        return true;
      }).sort(compareByPath);
    } else {
      categories = [...NAVER_CATEGORIES_FULL].sort(compareByPath);
    }

    return NextResponse.json({
      success: true,
      categories,
      count: categories.length
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST: Create category (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryCode, depth1, depth2, depth3, depth4, fullPath } = body;

    const category = await prisma.naverCategory.create({
      data: {
        categoryCode,
        depth1,
        depth2,
        depth3,
        depth4,
        fullPath
      }
    });

    return NextResponse.json({
      success: true,
      category
    });

  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
