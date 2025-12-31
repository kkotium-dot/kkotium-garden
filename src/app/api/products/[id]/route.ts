import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 상품 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id }
    })

    if (!product) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// 상품 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        productName: body.productName,
        productCode: body.productCode,
        category: body.category,
        brand: body.brand,
        salePrice: body.salePrice,
        supplyPrice: body.supplyPrice,
        marginRate: body.marginRate,
        stockQty: body.stockQty,
        status: body.status,
        description: body.description
      }
    })

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

// 상품 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.product.delete({
      where: { id: params.id }
    })
    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
