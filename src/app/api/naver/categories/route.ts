// src/app/api/naver/categories/route.ts
// P0-1: Naver category search API (4,993 categories)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const depth1 = searchParams.get('depth1');
    const depth2 = searchParams.get('depth2');
    const depth3 = searchParams.get('depth3');

    let categories;

    if (query) {
      // Search by full path
      categories = await prisma.naverCategory.findMany({
        where: {
          fullPath: {
            contains: query,
            mode: 'insensitive'
          }
        },
        take: 50,
        orderBy: {
          fullPath: 'asc'
        }
      });
    } else if (depth1 || depth2 || depth3) {
      // Filter by depth levels
      const where: any = {};
      if (depth1) where.depth1 = depth1;
      if (depth2) where.depth2 = depth2;
      if (depth3) where.depth3 = depth3;

      categories = await prisma.naverCategory.findMany({
        where,
        orderBy: [
          { depth1: 'asc' },
          { depth2: 'asc' },
          { depth3: 'asc' },
          { depth4: 'asc' }
        ]
      });
    } else {
      // Return all categories (for initial load)
      categories = await prisma.naverCategory.findMany({
        orderBy: {
          fullPath: 'asc'
        }
      });
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
