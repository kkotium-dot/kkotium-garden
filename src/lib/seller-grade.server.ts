// src/lib/seller-grade.server.ts
// Server-only helper — reads the seller's Naver grade from StoreSettings.
// P0-1 (2026-08-20): single place API routes fetch the grade from, so fee
// math never falls back to a wrong hardcoded default (was 중소3, should be
// '영세'). Import only from server code (route handlers, server-side libs) —
// this pulls in prisma and must never be imported by client components.
import { prisma } from '@/lib/prisma';
import { isSellerGrade, type SellerGrade } from '@/lib/naver-fee-rates-2026';

export async function getSellerGrade(): Promise<SellerGrade> {
  try {
    const settings = await (prisma as any).storeSettings.findUnique({
      where: { id: 'default' },
      select: { sellerGrade: true },
    });
    return isSellerGrade(settings?.sellerGrade) ? settings.sellerGrade : '영세';
  } catch {
    return '영세';
  }
}
