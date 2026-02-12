// src/app/api/naver/excel-export/route.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 네이버 엑셀 내보내기 API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextRequest, NextResponse } from 'next/server';
import {
  generateNaverExcel,
  generateBatchNaverExcel,
  generateFilteredNaverExcel,
  generateEmptyTemplate,
} from '@/lib/naver/excel-generator';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POST /api/naver/excel-export
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ExportRequest {
  mode: 'single' | 'batch' | 'filter' | 'template';
  productId?: string;
  productIds?: string[];
  filters?: {
    status?: string;
    minScore?: number;
    supplierId?: string;
    categoryCode?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();

    let excelBuffer: Buffer;
    let filename: string;

    // 모드별 처리
    switch (body.mode) {
      case 'single':
        // 단일 상품 엑셀
        if (!body.productId) {
          return NextResponse.json(
            { success: false, error: 'productId가 필요합니다.' },
            { status: 400 }
          );
        }

        excelBuffer = await generateNaverExcel(body.productId);
        filename = `naver_product_${body.productId}_${Date.now()}.xlsx`;
        break;

      case 'batch':
        // 여러 상품 일괄 엑셀
        if (!body.productIds || body.productIds.length === 0) {
          return NextResponse.json(
            { success: false, error: 'productIds가 필요합니다.' },
            { status: 400 }
          );
        }

        excelBuffer = await generateBatchNaverExcel(body.productIds);
        filename = `naver_products_batch_${Date.now()}.xlsx`;
        break;

      case 'filter':
        // 조건별 상품 엑셀
        if (!body.filters) {
          return NextResponse.json(
            { success: false, error: 'filters가 필요합니다.' },
            { status: 400 }
          );
        }

        const filters = {
          ...body.filters,
          dateFrom: body.filters.dateFrom ? new Date(body.filters.dateFrom) : undefined,
          dateTo: body.filters.dateTo ? new Date(body.filters.dateTo) : undefined,
        };

        excelBuffer = await generateFilteredNaverExcel(filters);
        filename = `naver_products_filtered_${Date.now()}.xlsx`;
        break;

      case 'template':
        // 빈 템플릿
        excelBuffer = generateEmptyTemplate();
        filename = `naver_template_${Date.now()}.xlsx`;
        break;

      default:
        return NextResponse.json(
          { success: false, error: '올바른 mode를 입력하세요.' },
          { status: 400 }
        );
    }

    // 엑셀 파일 응답
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('❌ 엑셀 생성 오류:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET /api/naver/excel-export?mode=template
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    // 템플릿 다운로드만 GET 지원
    if (mode === 'template') {
      const excelBuffer = generateEmptyTemplate();
      const filename = `naver_template_${Date.now()}.xlsx`;

      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          'Content-Length': excelBuffer.length.toString(),
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'GET 메서드는 mode=template만 지원합니다.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ 템플릿 생성 오류:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}
