// POST /api/naver/products        — register product on Naver
// PUT  /api/naver/products?id=X  — update existing product
// GET  /api/naver/products/check — connectivity check

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  registerProduct,
  updateProduct,
  checkNaverConnection,
  type NaverProductPayload,
} from '@/lib/naver/api-client';

// Map internal DB product to Naver API payload
function toNaverPayload(p: any): NaverProductPayload {
  return {
    originProduct: {
      statusType:     'SALE',
      saleType:       'NEW',
      leafCategoryId: p.naverCategoryCode ?? '',
      name:           p.name,
      detailContent:  p.description ?? p.name,
      images: {
        representativeImageUrl: p.mainImage ?? '',
        optionalImageUrls: (() => {
          try {
            const imgs = typeof p.additionalImages === 'string'
              ? JSON.parse(p.additionalImages)
              : (p.additionalImages ?? []);
            return Array.isArray(imgs) ? imgs.slice(0, 9) : [];
          } catch { return []; }
        })(),
      },
      salePrice:     Number(p.salePrice) || 0,
      stockQuantity: Number(p.stock) || 100,
      sellerProductCode: p.sku ?? undefined,
      afterServiceInfo: p.asPhone ? {
        afterServiceTelephoneNumber: p.asPhone,
        afterServiceGuideContent:    p.asGuide ?? '고객센터로 문의해 주세요.',
      } : undefined,
    },
    smartstoreChannelProduct: {
      naverShoppingRegistration:      true,
      channelProductDisplayStatusType: 'ON',
    },
  };
}

// GET /api/naver/products/check — test API connectivity
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.get('check') === '1') {
    const result = await checkNaverConnection();
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: 'Use ?check=1 for connectivity test' }, { status: 400 });
}

// POST /api/naver/products — register one product
export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId required' }, { status: 400 });
    }

    // Load product from DB
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다' }, { status: 404 });
    }
    if (!product.naverCategoryCode) {
      return NextResponse.json({ success: false, error: '네이버 카테고리코드가 없습니다. 상품 등록 페이지에서 카테고리를 선택해주세요.' }, { status: 400 });
    }
    if (!product.mainImage) {
      return NextResponse.json({ success: false, error: '대표 이미지가 없습니다. 이미지를 추가해주세요.' }, { status: 400 });
    }

    // Call Naver API
    const payload = toNaverPayload(product);
    const naverProductId = await registerProduct(payload);

    // Save naverProductId back to DB + update status to ACTIVE
    await prisma.product.update({
      where: { id: productId },
      data: {
        naverProductId,
        status: 'ACTIVE',
      } as any,
    });

    return NextResponse.json({
      success: true,
      naverProductId,
      message: `네이버에 성공적으로 등록됐습니다 (상품번호: ${naverProductId})`,
    });
  } catch (e: any) {
    console.error('[naver/products POST]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// PUT /api/naver/products?id={productId} — update existing product
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('id');
    if (!productId) {
      return NextResponse.json({ success: false, error: 'id query param required' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다' }, { status: 404 });
    }
    if (!(product as any).naverProductId) {
      return NextResponse.json({ success: false, error: '네이버 상품번호가 없습니다. 먼저 등록해주세요.' }, { status: 400 });
    }

    const payload = toNaverPayload(product);
    await updateProduct((product as any).naverProductId, payload);

    return NextResponse.json({
      success: true,
      message: `네이버 상품이 업데이트됐습니다 (상품번호: ${(product as any).naverProductId})`,
    });
  } catch (e: any) {
    console.error('[naver/products PUT]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
