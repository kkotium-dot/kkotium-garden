// src/app/api/naver/delivery-templates/route.ts
// GET  — Guide: Naver delivery policy API not available via Commerce API
//         Returns instructions for manual naverTemplateNo entry
// POST — Naver channel info check + delivery template entry guidance

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { naverRequest } from '@/lib/naver/api-client';

// GET — show current status + manual entry guide

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    // Check Naver connection
    let channelInfo: { name?: string; url?: string } = {};
    try {
      const channels = await naverRequest<any>('GET', '/v1/seller/channels');
      if (Array.isArray(channels) && channels[0]) {
        channelInfo = { name: channels[0].name, url: channels[0].url };
      }
    } catch { /* not critical */ }

    // Get app shipping templates
    const appTemplates = await prisma.shippingTemplate.findMany({
      select: { id: true, name: true, naverTemplateNo: true, shippingFee: true, shippingType: true },
    });

    const missingCount = appTemplates.filter(t => !t.naverTemplateNo).length;
    const linkedCount  = appTemplates.filter(t => !!t.naverTemplateNo).length;

    return NextResponse.json({
      success: true,
      channelInfo,
      appCount:     appTemplates.length,
      linkedCount,
      missingCount,
      templates: appTemplates,
      // Naver delivery policy API is not available via Commerce API
      // Users must enter naverTemplateNo manually from SmartStore Center
      manualEntryRequired: true,
      guideUrl: 'https://sell.smartstore.naver.com/#/store-delivery/delivery-policy',
      guide: '네이버 스마트스토어 센터 > 배송 > 배송 템플릿에서 배송 정책 번호(deliveryPolicyNo)를 확인 후 아래 [코드 입력] 버튼으로 입력해주세요.',
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST — bulk update naverTemplateNo from manual mappings
// Body: { mappings: [{ appTemplateId, naverTemplateNo }] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const mappings: Array<{ appTemplateId: string; naverTemplateNo: string }> = body.mappings ?? [];

    if (mappings.length === 0) {
      // No mappings provided — return current status
      const templates = await prisma.shippingTemplate.findMany({
        select: { id: true, name: true, naverTemplateNo: true },
      });
      return NextResponse.json({
        success: true,
        synced: 0,
        message: '매핑 정보를 전달해주세요. { mappings: [{ appTemplateId, naverTemplateNo }] }',
        templates,
      });
    }

    let synced  = 0;
    const results: Array<{ name: string; naverTemplateNo: string }> = [];

    for (const m of mappings) {
      if (!m.appTemplateId || !m.naverTemplateNo) continue;
      const updated = await prisma.shippingTemplate.update({
        where: { id: m.appTemplateId },
        data:  { naverTemplateNo: m.naverTemplateNo },
        select: { name: true, naverTemplateNo: true },
      }).catch(() => null);
      if (updated) { results.push({ name: updated.name, naverTemplateNo: updated.naverTemplateNo! }); synced++; }
    }

    return NextResponse.json({
      success: true,
      synced,
      results,
      message: `${synced}개 배송 템플릿에 naverTemplateNo가 저장됐습니다.`,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
