import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const id = params.id
    
    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const keywords = generateKeywords(product.productName, product.category || '')

    await prisma.product.update({
      where: { id },
      data: { keywords: keywords.join(', ') }
    })

    return NextResponse.json({ keywords })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

function generateKeywords(productName: string, category: string): string[] {
  const keywords: string[] = []
  
  const words = productName.split(' ').filter((w: string) => w.length > 1)
  keywords.push(...words)
  
  if (category) {
    keywords.push(...category.split('/'))
  }
  
  if (productName.includes('조화')) {
    keywords.push('인테리어', '홈데코', '화분', '꽃', '집꾸미기')
  }
  if (productName.includes('목화')) {
    keywords.push('내추럴', '가을인테리어', '카페인테리어')
  }
  
  return Array.from(new Set(keywords)).slice(0, 15)
}
