// src/app/api/notifications/route.ts
// Real-time notifications from DB state — no mock data
// Generates dynamic alerts based on: OOS products, low scores, recent registrations, reactivation candidates

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
interface Notification {
  id: string;
  type: 'stock' | 'score' | 'system' | 'success' | 'warning';
  title: string;
  message: string;
  time: string;
  read: boolean;
  href?: string;
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return '방금 전';
  if (mins  < 60) return `${mins}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
}

export async function GET() {
  try {
    const notifications: Notification[] = [];

    // Single query — fetch all needed product data at once
    const [oosProducts, lowScoreProducts, recentProducts, inactiveProducts] = await Promise.all([
      // 1. Out of stock
      prisma.product.findMany({
        where: { status: 'OUT_OF_STOCK' },
        select: { id: true, name: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      // 2. Low honey score (aiScore < 60, active)
      prisma.product.findMany({
        where: { aiScore: { gt: 0, lt: 60 }, status: { not: 'INACTIVE' } },
        select: { id: true, name: true, aiScore: true },
        orderBy: { aiScore: 'asc' },
        take: 5,
      }),
      // 3. Recently registered (last 24h)
      prisma.product.findMany({
        where: { createdAt: { gte: new Date(Date.now() - 86400000) } },
        select: { id: true, name: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      // 4. Long inactive (INACTIVE/HIDDEN)
      prisma.product.findMany({
        where: { status: { in: ['INACTIVE', 'HIDDEN'] } },
        select: { id: true, name: true, updatedAt: true },
        orderBy: { updatedAt: 'asc' },
        take: 3,
      }),
    ]);

    // Build notifications from real data
    if (oosProducts.length > 0) {
      const names = oosProducts.slice(0, 2).map(p => p.name).join(', ');
      const extra = oosProducts.length > 2 ? ` 외 ${oosProducts.length - 2}개` : '';
      notifications.push({
        id: 'oos-alert',
        type: 'stock',
        title: `품절 상품 ${oosProducts.length}개`,
        message: `${names}${extra} — 대체 상품 등록이 필요합니다`,
        time: timeAgo(oosProducts[0].updatedAt),
        read: false,
        href: '/products/reactivation',
      });
    }

    if (lowScoreProducts.length > 0) {
      const minScore = lowScoreProducts[0].aiScore ?? 0;
      notifications.push({
        id: 'score-alert',
        type: 'warning',
        title: `꿀통지수 낮은 상품 ${lowScoreProducts.length}개`,
        message: `최저 ${minScore}점 — SEO 최적화로 노출 순위를 올리세요`,
        time: '오늘',
        read: false,
        href: '/naver-seo',
      });
    }

    if (recentProducts.length > 0) {
      const names = recentProducts.slice(0, 2).map(p => p.name).join(', ');
      const extra = recentProducts.length > 2 ? ` 외 ${recentProducts.length - 2}개` : '';
      notifications.push({
        id: 'recent-reg',
        type: 'success',
        title: `최근 등록 상품 ${recentProducts.length}개`,
        message: `${names}${extra}`,
        time: timeAgo(recentProducts[0].createdAt),
        read: true,
        href: '/products',
      });
    }

    if (inactiveProducts.length > 0) {
      notifications.push({
        id: 'inactive-alert',
        type: 'warning',
        title: `비활성 상품 ${inactiveProducts.length}개`,
        message: '장기 미노출 상품이 있습니다. 재활성화를 검토하세요',
        time: timeAgo(inactiveProducts[0].updatedAt),
        read: true,
        href: '/products/reactivation',
      });
    }

    // No data at all — friendly empty state
    if (notifications.length === 0) {
      notifications.push({
        id: 'all-good',
        type: 'success',
        title: '모든 상품이 양호합니다',
        message: '품절·저점수 상품이 없습니다. 계속 유지해주세요!',
        time: '방금 전',
        read: true,
      });
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (error) {
    console.error('[notifications] error:', error);
    // Graceful fallback — never crash the header
    return NextResponse.json({
      success: true,
      notifications: [{
        id: 'sys',
        type: 'system',
        title: '알림 로드 중',
        message: '잠시 후 다시 확인해주세요',
        time: '방금 전',
        read: true,
      }],
      unreadCount: 0,
    });
  }
}
