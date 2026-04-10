import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name, url, description, active } = await req.json();
    const platform = await prisma.platform.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(url !== undefined && { url: String(url).trim() || null }),
        ...(description !== undefined && { description: String(description).trim() || null }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
    });
    return NextResponse.json({ success: true, platform });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const linked = await prisma.supplier.count({ where: { platformId: params.id } });
    if (linked > 0) {
      await prisma.platform.update({ where: { id: params.id }, data: { active: false } });
      return NextResponse.json({ success: true, deactivated: true });
    }
    await prisma.platform.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, deactivated: false });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
