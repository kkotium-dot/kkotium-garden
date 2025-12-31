import { NextResponse } from 'next/server';

export async function GET() {
  const mockProducts = [
    {
      id: 1,
      name: '테스트 상품 1',
      price: 15000,
      stock: 10,
      status: '판매중',
      registeredAt: '2026-01-01'
    },
    {
      id: 2,
      name: '테스트 상품 2',
      price: 25000,
      stock: 5,
      status: '판매중',
      registeredAt: '2026-01-01'
    }
  ];
  
  return NextResponse.json({
    success: true,
     mockProducts
  });
}