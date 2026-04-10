// src/app/api/products/generate-code/route.ts
// P0-3: Auto seller product code generation
// Format: DMM-12345 (with supplier) or KKT-20260227-A3F7 (without)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
interface GenerateCodeRequest {
  supplierProductCode?: string;
  supplierId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateCodeRequest = await request.json();
    const { supplierProductCode, supplierId } = body;

    let sellerCode: string;

    if (supplierProductCode && supplierId) {
      // Get supplier prefix
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { code: true }
      });

      if (!supplier) {
        return NextResponse.json(
          { error: 'Supplier not found' },
          { status: 404 }
        );
      }

      // Format: DMM-12345
      sellerCode = `${supplier.code}-${supplierProductCode}`;
    } else {
      // Generate unique code: KKT-20260227-A3F7
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const randomAlpha = generateRandomAlpha(4);
      
      sellerCode = `KKT-${dateStr}-${randomAlpha}`;
    }

    // Check uniqueness
    const existing = await prisma.product.findUnique({
      where: { sellerProductCode: sellerCode }
    });

    if (existing) {
      // If duplicate, add random suffix
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      sellerCode = `${sellerCode}-${randomSuffix}`;
    }

    return NextResponse.json({
      success: true,
      sellerProductCode: sellerCode
    });

  } catch (error) {
    console.error('Error generating seller code:', error);
    return NextResponse.json(
      { error: 'Failed to generate seller code' },
      { status: 500 }
    );
  }
}

function generateRandomAlpha(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// GET: Validate uniqueness
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Code parameter required' },
        { status: 400 }
      );
    }

    const existing = await prisma.product.findUnique({
      where: { sellerProductCode: code }
    });

    return NextResponse.json({
      available: !existing,
      exists: !!existing
    });

  } catch (error) {
    console.error('Error validating code:', error);
    return NextResponse.json(
      { error: 'Failed to validate code' },
      { status: 500 }
    );
  }
}
