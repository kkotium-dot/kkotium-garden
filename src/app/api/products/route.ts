import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(products)
  } catch (error) {
    return NextResponse.json({ error: '상품 조회 실패' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const product = await prisma.product.create({ data })
    return NextResponse.json(product)
  } catch (error) {
    return NextResponse.json({ error: '상품 등록 실패' }, { status: 500 })
  }
}
