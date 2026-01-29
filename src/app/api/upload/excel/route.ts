import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '파일을 선택하세요' }, { status: 400 });
    }

    // Excel 파일 읽기
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    // 상품 데이터 변환
    const products = data.map((row: any) => ({
      name: row['상품명'] || row['name'],
      sku: row['SKU'] || `SKU${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
      category: row['카테고리'] || row['category'] || '미분류',
      supplierPrice: parseInt(row['도매가'] || row['supplierPrice']) || 0,
      salePrice: parseInt(row['판매가'] || row['salePrice']) || 0,
      margin: parseFloat(row['마진율'] || row['margin']) || 0,
      mainImage: row['이미지'] || row['image'],
      status: 'ACTIVE',
    })).filter(p => p.name && p.supplierPrice > 0);

    // DB 저장
    const created = await prisma.product.createMany({
      data: products,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      count: created.count,
      total: products.length,
    });

  } catch (error: any) {
    console.error('Excel 업로드 에러:', error);
    return NextResponse.json({ 
      error: 'Excel 업로드 실패', 
      details: error.message 
    }, { status: 500 });
  }
}
