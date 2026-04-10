import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  try {
    const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true';
    const platforms = await prisma.platform.findMany({
      where: includeInactive ? undefined : { active: true },
      include: {
        suppliers: {
          where: includeInactive ? undefined : { active: true },
          select: {
            id: true, name: true, code: true, abbr: true,
            contact: true, address: true, description: true,
            defaultMargin: true, active: true, platformId: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ success: true, platforms });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, code, url, description } = await req.json();
    if (!name?.trim() || !code?.trim()) {
      return NextResponse.json({ success: false, error: 'name and code are required' }, { status: 400 });
    }
    const platform = await prisma.platform.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        url: url?.trim() || null,
        description: description?.trim() || null,
      },
    });
    return NextResponse.json({ success: true, platform });
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ success: false, error: '이미 사용 중인 코드입니다' }, { status: 409 });
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
