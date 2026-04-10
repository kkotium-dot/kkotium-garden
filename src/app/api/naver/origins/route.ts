// src/app/api/naver/origins/route.ts
// P0-4: Origin code search API (518 origins)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    let origins;

    if (query) {
      // Search by name or code
      origins = await prisma.originCode.findMany({
        where: {
          OR: [
            {
              originName: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              originCode: {
                contains: query,
                mode: 'insensitive'
              }
            }
          ]
        },
        take: 30,
        orderBy: {
          originName: 'asc'
        }
      });
    } else {
      // Return all origins
      origins = await prisma.originCode.findMany({
        orderBy: {
          originName: 'asc'
        }
      });
    }

    return NextResponse.json({
      success: true,
      origins,
      count: origins.length
    });

  } catch (error) {
    console.error('Error fetching origins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch origins' },
      { status: 500 }
    );
  }
}

// POST: Create origin (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originCode, originName } = body;

    const origin = await prisma.originCode.create({
      data: {
        originCode,
        originName
      }
    });

    return NextResponse.json({
      success: true,
      origin
    });

  } catch (error) {
    console.error('Error creating origin:', error);
    return NextResponse.json(
      { error: 'Failed to create origin' },
      { status: 500 }
    );
  }
}
