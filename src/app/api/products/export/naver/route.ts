import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        productCode: true,
        productName: true,
        brand: true,
        category: true,
        supplierId: true,
        supplierProductCode: true,
        stockQuantity: true,
        wholesalePrice: true,
        sellingPrice: true,
        marginRate: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    const headers = [
      '상품명',
      '판매가',
      '상품코드',
      '재고수량',
      '카테고리',
      '브랜드',
      '상품상태',
      '원가',
      '마진율',
      '상품설명'
    ].join(',')

    const rows = products.map(p => {
      return [
        `"${p.productName}"`,
        p.sellingPrice,
        p.productCode,
        p.stockQuantity,
        `"${p.category}"`,
        `"${p.brand}"`,
        p.status === 'SALE' ? '판매중' : p.status === 'SOLD_OUT' ? '품절' : '판매중지',
        p.wholesalePrice,
        `${p.marginRate.toFixed(2)}%`,
        `"${''}"` 
      ].join(',')
    })

    const csv = [headers, ...rows].join('\n')
    const bom = '\uFEFF'
    const csvWithBom = bom + csv

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="naver_products_${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
