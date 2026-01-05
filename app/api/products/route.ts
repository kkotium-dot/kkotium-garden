'use client'; 

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma

// 1. 상품 목록 가져오기 (GET)
export async function GET() {
  try {
    // DB에서 상품 리스트 가져오기
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: '상품 로드 실패' }, { status: 500 });
  }
}

// 2. 테스트 데이터 만들기 (POST)
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    if (url.pathname.includes('/test-data')) {
      // 샘플 상품 3개 생성
      await prisma.product.createMany({
        data: [
          { name: '샘플 꽃병 A', price: 15000, margin: 30, status: '판매중' },
          { name: '로맨틱 화분 B', price: 22000, margin: 25, status: '판매중' },
          { name: '빈티지 바구니 C', price: 12000, margin: 35, status: '품절' },
        ],
      });
      return NextResponse.json({ message: '테스트 데이터 생성 완료! 🌸' });
    }
    return NextResponse.json({ error: '잘못된 경로' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: '데이터 생성 실패' }, { status: 500 });
  }
}
