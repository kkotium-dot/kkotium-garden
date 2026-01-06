import { NextResponse } from 'next/server';

export async function GET() {
  const suppliers = [
    '도매꾹',
    '오늘의도매',
    '삼익상사',
    '직접구매',
    '기타',
  ];

  return NextResponse.json({
    success: true,
    suppliers,
  });
}
