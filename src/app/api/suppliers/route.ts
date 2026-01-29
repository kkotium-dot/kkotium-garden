import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      suppliers,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Fetch failed' }, { status: 500 });
  }
}
